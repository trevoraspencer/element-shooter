// Main game entry point
const PROJECTILE_SURFACE_LABELS = new Set(['ground', 'wall', 'platform']);

class Game {
    constructor() {
        // Canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.dpr = 1;
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Matter.js engine
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 1 },
        });

        // Camera
        this.camera = new Camera(window.innerWidth, window.innerHeight);

        // Effects
        this.effects = new EffectsSystem();

        // Player
        this.player = new Player();

        // Modes
        this.sandbox = new SandboxMode(this);
        this.adventure = new AdventureMode(this);

        // Time
        this.timeScale = 1;
        this.lastTime = null; // anchored on the first loop tick
        this.mode = 'menu'; // 'menu', 'sandbox', 'adventure'

        // Re-anchor dt when tab regains visibility — otherwise rAF would
        // produce a many-second gap on the first re-shown frame.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.lastTime = null;
        });

        // Collision handling
        this.setupCollisions();

        // UI (last, after everything)
        this.ui = new UI(this);

        // Start loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        this.dpr = Math.max(1, window.devicePixelRatio || 1);
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.canvas.width = Math.floor(width * this.dpr);
        this.canvas.height = Math.floor(height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        if (this.camera) {
            this.camera.resize(width, height);
        }
        // Sandbox pins its boundary walls to the window edges — re-pin on resize.
        if (this.mode === 'sandbox' && this.sandbox && this.sandbox.active) {
            this.sandbox.onResize();
        }
    }

    setupCollisions() {
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                this.handleCollisionPair(pair.bodyA, pair.bodyB);
            }
        });
    }

    handleCollisionPair(a, b) {
        this.handleProjectilePair(a, b, 'element', (projectile, body) => {
            this.handleProjectileHit(projectile, body.entity);
        });
        this.handleProjectilePair(a, b, PROJECTILE_SURFACE_LABELS, (projectile) => {
            projectile?.onHit(null, this.getAllEntities(), this.effects);
        });
        this.handleProjectilePair(a, b, 'structure', (projectile, body) => {
            this.handleStructureHit(projectile, body);
        });

        if (a.label === 'element' && b.label === 'element') {
            this.handleBodySlam(a.entity, b.entity);
        }
    }

    handleProjectilePair(a, b, targetLabels, onHit) {
        const matches = (label) =>
            targetLabels instanceof Set ? targetLabels.has(label) : label === targetLabels;
        if (a.label === 'projectile' && matches(b.label)) {
            onHit(a.projectile, b);
        } else if (b.label === 'projectile' && matches(a.label)) {
            onHit(b.projectile, a);
        }
    }

    handleProjectileHit(projectile, entity) {
        if (!projectile || !entity) return;
        projectile.onHit(entity, this.getAllEntities(), this.effects);
    }

    handleStructureHit(projectile, body) {
        if (!projectile?.alive || !body || !body.structure) return;
        body.structure.damagePart(
            body.structurePart,
            projectile.wpn.damage,
            this.engine.world,
            this.effects,
        );
        projectile.onHit(null, this.getAllEntities(), this.effects);
    }

    handleBodySlam(entA, entB) {
        if (!entA || !entB || !entA.alive || !entB.alive) return;
        if (!areTeamsHostile(entA.team, entB.team)) return;

        // Calculate collision speed
        const relVel = {
            x: entA.body.velocity.x - entB.body.velocity.x,
            y: entA.body.velocity.y - entB.body.velocity.y,
        };
        const speed = Math.sqrt(relVel.x ** 2 + relVel.y ** 2);

        if (speed > BODY_SLAM_CONFIG.minSpeed) {
            // Contact damage now uses each element's data.damage stat,
            // scaled by relative collision speed. Boss damageMult therefore
            // affects body slams. Mass ratio still amplifies heavy-vs-light.
            const speedScale = clamp(
                speed * BODY_SLAM_CONFIG.speedFactor,
                0,
                BODY_SLAM_CONFIG.speedCap,
            );
            const dmgA = entB.data.damage * speedScale * (entB.data.mass / entA.data.mass);
            const dmgB = entA.data.damage * speedScale * (entA.data.mass / entB.data.mass);

            const entities = this.getAllEntities();
            if (dmgA > BODY_SLAM_CONFIG.minDamage) {
                entA.takeDamage(dmgA, this.effects, null, entities);
            }
            if (dmgB > BODY_SLAM_CONFIG.minDamage) {
                entB.takeDamage(dmgB, this.effects, null, entities);
            }
        }
    }

    getAllEntities() {
        if (this.mode === 'sandbox') return this.sandbox.entities;
        if (this.mode === 'adventure') return this.adventure.entities;
        return [];
    }

    getAllProjectiles() {
        if (this.mode === 'sandbox') return this.sandbox.projectiles;
        if (this.mode === 'adventure') return this.adventure.projectiles;
        return [];
    }

    // The active mode's static geometry (ground/walls/platforms) — the only
    // bodies that can ground an entity. Used by isBodyGrounded to avoid walking
    // every dynamic body each frame.
    getStaticBodies() {
        if (this.mode === 'sandbox') return this.sandbox.staticBodies || [];
        if (this.mode === 'adventure') return this.adventure.staticBodies || [];
        return [];
    }

    startSandbox() {
        this.stopMode();
        this.mode = 'sandbox';
        this.sandbox.start();
    }

    startAdventure(levelIndex) {
        this.stopMode();
        this.mode = 'adventure';
        this.adventure.startLevel(levelIndex);
    }

    stopMode() {
        if (this.mode === 'sandbox') this.sandbox.stop();
        if (this.mode === 'adventure') this.adventure.stop();
        this.mode = 'menu';
        this.effects.clear();
        this.timeScale = 1;
        this.engine.gravity.y = 1;
    }

    loop(time) {
        requestAnimationFrame((t) => this.loop(t));

        // First tick (or tab just became visible) — anchor and skip update.
        if (this.lastTime === null) {
            this.lastTime = time;
            this.render();
            return;
        }

        // Preserve elapsed time while bounding individual physics steps. This
        // keeps gameplay speed stable below 60 fps without feeding Matter.js an
        // oversized delta after a stall.
        const frameDt = clamp((time - this.lastTime) / 1000, 0, SIMULATION_TIMING.maxFrameDelta);
        this.lastTime = time;

        const advanced = runSimulationSteps(frameDt * this.timeScale, (dt) => {
            const simulationPaused =
                this.mode === 'adventure' && this.adventure.isSimulationPaused();
            if (simulationPaused) return false;

            for (const projectile of this.getAllProjectiles()) {
                projectile.capturePreviousPosition();
            }
            Matter.Engine.update(this.engine, dt * 1000);

            if (this.mode === 'sandbox') {
                this.sandbox.update(dt);
            } else if (this.mode === 'adventure') {
                this.adventure.update(dt);
            }
        });

        if (advanced > 0) {
            this.effects.update(advanced);
            updateScreenShake(advanced);
        }

        // Render
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const cam = this.camera;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Apply screen shake
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);

        // Clear
        let bgColor = '#0a0a1a';
        if (this.mode === 'adventure' && this.adventure.level) {
            bgColor = this.adventure.level.bgColor;
        }
        ctx.fillStyle = bgColor;
        ctx.fillRect(-10, -10, cam.width + 20, cam.height + 20);

        // Mode rendering
        if (this.mode === 'sandbox') {
            this.sandbox.render(ctx, cam);
        } else if (this.mode === 'adventure') {
            this.adventure.render(ctx, cam);
        }

        // Effects (always on top)
        this.effects.render(ctx, cam);

        ctx.restore();
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    window.game = new Game();
});
