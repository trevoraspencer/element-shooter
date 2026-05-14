// Main game entry point
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
    }

    setupCollisions() {
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                const a = pair.bodyA;
                const b = pair.bodyB;

                // Projectile hit entity
                if (a.label === 'projectile' && b.label === 'element') {
                    this.handleProjectileHit(a.projectile, b.entity);
                } else if (b.label === 'projectile' && a.label === 'element') {
                    this.handleProjectileHit(b.projectile, a.entity);
                }

                // Projectile hit ground/wall/platform
                if (
                    a.label === 'projectile' &&
                    (b.label === 'ground' || b.label === 'wall' || b.label === 'platform')
                ) {
                    if (a.projectile) a.projectile.onHit(null, this.getAllEntities(), this.effects);
                } else if (
                    b.label === 'projectile' &&
                    (a.label === 'ground' || a.label === 'wall' || a.label === 'platform')
                ) {
                    if (b.projectile) b.projectile.onHit(null, this.getAllEntities(), this.effects);
                }

                // Body slam (element vs element)
                if (a.label === 'element' && b.label === 'element') {
                    this.handleBodySlam(a.entity, b.entity, pair);
                }
            }
        });
    }

    handleProjectileHit(projectile, entity) {
        if (!projectile || !entity) return;
        projectile.onHit(entity, this.getAllEntities(), this.effects);
    }

    handleBodySlam(entA, entB, pair) {
        if (!entA || !entB || !entA.alive || !entB.alive) return;
        if (entA.team === entB.team && entA.team !== 'neutral') return;

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

            if (dmgA > BODY_SLAM_CONFIG.minDamage) entA.takeDamage(dmgA, this.effects);
            if (dmgB > BODY_SLAM_CONFIG.minDamage) entB.takeDamage(dmgB, this.effects);
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
            this.render(0);
            return;
        }

        // Delta time
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // Clamp dt to Matter.js' recommended max step.
        if (dt > 1 / 60) dt = 1 / 60;
        dt *= this.timeScale;

        const simulationPaused = this.mode === 'adventure' && this.adventure.isSimulationPaused();
        if (!simulationPaused) {
            for (const projectile of this.getAllProjectiles()) {
                projectile.capturePreviousPosition();
            }
            Matter.Engine.update(this.engine, dt * 1000);
        }

        // Update
        if (this.mode === 'sandbox') {
            this.sandbox.update(dt);
        } else if (this.mode === 'adventure' && !simulationPaused) {
            this.adventure.update(dt);
        }

        // Effects
        this.effects.update(dt);
        updateScreenShake();

        // Render
        this.render(dt);
    }

    render(dt) {
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
