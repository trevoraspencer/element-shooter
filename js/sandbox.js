// Sandbox mode: spawn, drag, team battles, tools

// Preset battle configurations
const SANDBOX_PRESETS = [
    {
        name: 'Tiny H vs Giant Pu',
        teams: [
            { elements: ['H'], count: 20, team: 'a' },
            { elements: ['Pu'], count: 5, team: 'b' },
        ],
    },
    {
        name: 'Magnet War',
        teams: [
            { elements: ['Fe', 'Co', 'Ni'], count: 10, team: 'a' },
            { elements: ['Fe', 'Co', 'Ni'], count: 10, team: 'b' },
        ],
    },
    {
        name: 'Noble Gas Escape',
        teams: [
            { elements: ['Ne', 'Ar', 'Xe'], count: 15, team: 'a' },
            { elements: ['O', 'F', 'Cl'], count: 10, team: 'b' },
        ],
    },
    {
        name: 'Boss Rush',
        teams: [
            { elements: ['H', 'He', 'Li', 'Be', 'B'], count: 5, team: 'a' },
            { elements: ['U', 'Pu', 'Au', 'Pb', 'Fe'], count: 5, team: 'b' },
        ],
    },
    {
        name: 'Random Army',
        random: true,
    },
];

// Arena extents — wide enough that the floor fills any reasonable viewport
// (camera centers on world X=1000, so ±3000 from center covers 6000 px).
const SANDBOX_FLOOR_LEFT = -2000;
const SANDBOX_FLOOR_RIGHT = 4000;
const SANDBOX_FLOOR_WIDTH = SANDBOX_FLOOR_RIGHT - SANDBOX_FLOOR_LEFT;
const SANDBOX_FLOOR_CENTER_X = (SANDBOX_FLOOR_LEFT + SANDBOX_FLOOR_RIGHT) / 2;
const SANDBOX_FLOOR_TOP = 720;
const SANDBOX_PLATFORM_HEIGHT = 20;
// Boundary walls are pinned to the visible browser-window edges (not the arena
// extents) so elements can't roam off-screen. The camera is static in sandbox,
// so the view stays centered on this world point.
const SANDBOX_CAMERA_CENTER_X = 1000;
const SANDBOX_CAMERA_CENTER_Y = 300;
const SANDBOX_WALL_THICKNESS = 40;
const SANDBOX_WALL_CENTER_Y = 350;
const SANDBOX_WALL_HEIGHT = 920;
const SANDBOX_WALL_RENDER_WIDTH = 14;

// Pure: given the static camera's world origin (cameraX), viewport width, and
// zoom, return the center x of each boundary wall body so that the wall's inner
// face lines up exactly with the corresponding visible window edge. The visible
// world span is [cameraX, cameraX + width / zoom] (see Camera.screenToWorld).
function computeBoundaryWallX(cameraX, cameraWidth, cameraZoom, wallThickness) {
    const leftEdge = cameraX;
    const rightEdge = cameraX + cameraWidth / cameraZoom;
    return {
        left: leftEdge - wallThickness / 2,
        right: rightEdge + wallThickness / 2,
    };
}
// Platform definitions (center x/y, width) shared by the physics bodies and rendering.
const SANDBOX_PLATFORMS = [
    { x: 500, y: 550, w: 300 },
    { x: 1500, y: 550, w: 300 },
    { x: 1000, y: 400, w: 200 },
];

class SandboxMode {
    constructor(game) {
        this.game = game;
        this.active = false;

        // Tools
        this.currentTool = 'spawn';
        this.currentTeam = 'neutral';
        this.selectedElement = 'H';
        this.selectedWeapon = 'none';

        // Entities
        this.entities = [];
        this.projectiles = [];
        this.maxEntities = 50;

        // Structures (creator mode)
        this.structures = [];
        this.selectedStructure = 'house';
        this.placeGhost = null;
        // Tracks live structure part bodies so update() can detect when combat
        // destroys one and refresh the grounding cache / drop empty structures.
        this._lastStructureBodyCount = 0;

        // Drag state
        this.dragBody = null;
        this.dragConstraint = null;

        // Slow motion
        this.slowMo = false;
        this.gravityFlipped = false;

        // Mouse tracking for sandbox tools
        this.mouseHandler = null;

        // Preset execution guard (prevents rapid-click duplication)
        this._presetExecuting = false;
    }

    start() {
        this.active = true;
        this.entities = [];
        this.projectiles = [];
        this.slowMo = false;
        this.gravityFlipped = false;

        // Reset gravity
        this.game.engine.gravity.y = 1;

        // Set world bounds for sandbox
        this.game.camera.setWorldBounds(SANDBOX_FLOOR_LEFT, -500, SANDBOX_FLOOR_RIGHT, 1200);
        this.game.camera.setPosition(SANDBOX_CAMERA_CENTER_X, SANDBOX_CAMERA_CENTER_Y);

        // Create ground and walls
        this.createArena();

        // Setup mouse handlers
        this.setupMouseHandlers();

        // Show toolbar
        document.getElementById('sandbox-toolbar').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('adventure-hud').classList.add('hidden');
    }

    createArena() {
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;

        // Ground
        this.ground = Bodies.rectangle(SANDBOX_FLOOR_CENTER_X, 750, SANDBOX_FLOOR_WIDTH, 60, {
            isStatic: true,
            collisionFilter: {
                category: CAT.GROUND,
                mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
            },
            label: 'ground',
            render: { fillStyle: '#2a2a3e' },
        });

        // Ceiling
        this.ceiling = Bodies.rectangle(SANDBOX_FLOOR_CENTER_X, -80, SANDBOX_FLOOR_WIDTH, 60, {
            isStatic: true,
            collisionFilter: {
                category: CAT.WALL,
                mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
            },
            label: 'wall',
        });

        // Boundary walls — created here, then pinned to the visible window edges
        // by updateWalls() so elements can't roam off-screen. Tall enough to span
        // from ceiling to ground. Initial x is a placeholder.
        this.wallL = Bodies.rectangle(
            0,
            SANDBOX_WALL_CENTER_Y,
            SANDBOX_WALL_THICKNESS,
            SANDBOX_WALL_HEIGHT,
            {
                isStatic: true,
                collisionFilter: {
                    category: CAT.WALL,
                    mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
                },
                label: 'wall',
            },
        );

        this.wallR = Bodies.rectangle(
            0,
            SANDBOX_WALL_CENTER_Y,
            SANDBOX_WALL_THICKNESS,
            SANDBOX_WALL_HEIGHT,
            {
                isStatic: true,
                collisionFilter: {
                    category: CAT.WALL,
                    mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
                },
                label: 'wall',
            },
        );

        // Platforms — built from the shared SANDBOX_PLATFORMS table
        const platforms = SANDBOX_PLATFORMS.map((p) =>
            Bodies.rectangle(p.x, p.y, p.w, SANDBOX_PLATFORM_HEIGHT, {
                isStatic: true,
                collisionFilter: {
                    category: CAT.PLATFORM,
                    mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
                },
                label: 'platform',
            }),
        );

        this.arenaBodies = [this.ground, this.ceiling, this.wallL, this.wallR, ...platforms];
        this.staticBodies = [...this.arenaBodies];
        Composite.add(this.game.engine.world, this.arenaBodies);

        // Pin the boundary walls to the current window edges.
        this.updateWalls();
    }

    // Pin the boundary walls to the current visible window edges and remember
    // their inner-face world x for rendering. Called on arena creation and when
    // the window resizes. The camera is static in sandbox, so the visible world
    // span is fixed by the camera origin + viewport size.
    updateWalls() {
        if (!this.wallL || !this.wallR) return;
        const cam = this.game.camera;
        const { left, right } = computeBoundaryWallX(
            cam.x,
            cam.width,
            cam.zoom,
            SANDBOX_WALL_THICKNESS,
        );
        Matter.Body.setPosition(this.wallL, { x: left, y: SANDBOX_WALL_CENTER_Y });
        Matter.Body.setPosition(this.wallR, { x: right, y: SANDBOX_WALL_CENTER_Y });
        // Inner faces = the visible window edges (world coords), used by render.
        this._wallLeftX = left + SANDBOX_WALL_THICKNESS / 2;
        this._wallRightX = right - SANDBOX_WALL_THICKNESS / 2;
    }

    // The browser window resized: re-center the static camera on the arena and
    // re-pin the boundary walls to the new window edges.
    onResize() {
        if (!this.active) return;
        this.game.camera.setPosition(SANDBOX_CAMERA_CENTER_X, SANDBOX_CAMERA_CENTER_Y);
        this.updateWalls();
    }

    // The grounding cache (this.staticBodies) = arena geometry + every live
    // structure part body. Rebuilt whenever structures are placed/removed so
    // isBodyGrounded (which reads this.staticBodies) sees roofs/ramparts.
    rebuildStaticBodies() {
        const structureBodies = [];
        for (const s of this.structures) {
            structureBodies.push(...s.partBodies());
        }
        this.staticBodies = [...(this.arenaBodies || []), ...structureBodies];
        this._lastStructureBodyCount = structureBodies.length;
    }

    // Drops fully-destroyed structures and refreshes the grounding cache when
    // combat has broken off any part (its body was removed by onPartDestroyed,
    // so the cached body list and live body count drift). Cheap: a handful of
    // structures, only rebuilds when the live body count actually changed.
    pruneStructures() {
        if (!this.structures.length) return;

        let changed = false;
        for (let i = this.structures.length - 1; i >= 0; i--) {
            if (this.structures[i].isEmpty()) {
                this.structures.splice(i, 1);
                changed = true;
            }
        }

        let liveBodies = 0;
        for (const s of this.structures) liveBodies += s.partBodies().length;

        if (changed || liveBodies !== this._lastStructureBodyCount) {
            this.rebuildStaticBodies();
        }
    }

    setupMouseHandlers() {
        const canvas = this.game.canvas;

        this.mouseHandler = (e) => {
            if (!this.active) return;
            if (e.target !== canvas) return;

            const world = this.game.camera.screenToWorld(e.clientX, e.clientY);

            switch (this.currentTool) {
                case 'spawn':
                    this.spawnElement(world.x, world.y);
                    break;
                case 'delete':
                    this.deleteAt(world.x, world.y);
                    break;
                case 'explode':
                    this.explodeAt(world.x, world.y);
                    break;
                case 'freeze':
                    this.freezeAt(world.x, world.y);
                    break;
                case 'place':
                    this.placeStructure(world.x);
                    break;
            }
        };

        this.mouseDownHandler = (e) => {
            if (!this.active || e.target !== canvas) return;

            if (this.currentTool === 'drag') {
                const world = this.game.camera.screenToWorld(e.clientX, e.clientY);
                this.startDrag(world.x, world.y);
            }
        };

        this.mouseMoveHandler = (e) => {
            if (!this.active) return;

            if (this.dragConstraint) {
                const world = this.game.camera.screenToWorld(e.clientX, e.clientY);
                this.dragConstraint.pointA = {
                    x: world.x,
                    y: world.y,
                };
            }

            if (this.currentTool === 'place') {
                // Only preview over the play area — hovering the toolbar/menu
                // clears the ghost so it never looks "stuck" to the UI.
                if (e.target === canvas) {
                    const world = this.game.camera.screenToWorld(e.clientX, e.clientY);
                    this.placeGhost = { x: world.x, groundY: SANDBOX_FLOOR_TOP };
                } else {
                    this.placeGhost = null;
                }
            }
        };

        this.mouseUpHandler = (e) => {
            if (!this.active) return;
            this.endDrag();
        };

        // Leaving the canvas hides the placement ghost.
        this.mouseLeaveHandler = () => {
            this.placeGhost = null;
        };

        // Right-click cancels placement (revert to the spawn tool).
        this.contextMenuHandler = (e) => {
            if (!this.active || this.currentTool !== 'place') return;
            e.preventDefault();
            this.cancelPlacement();
        };

        // Escape also cancels placement.
        this.keyDownHandler = (e) => {
            if (!this.active || this.currentTool !== 'place') return;
            if (e.key === 'Escape') this.cancelPlacement();
        };

        canvas.addEventListener('click', this.mouseHandler);
        canvas.addEventListener('mousedown', this.mouseDownHandler);
        canvas.addEventListener('mouseleave', this.mouseLeaveHandler);
        canvas.addEventListener('contextmenu', this.contextMenuHandler);
        window.addEventListener('mousemove', this.mouseMoveHandler);
        window.addEventListener('mouseup', this.mouseUpHandler);
        window.addEventListener('keydown', this.keyDownHandler);
    }

    // Exit the place tool: clear the ghost and switch back to the spawn tool
    // (clicking the button reuses the toolbar's selection logic so the UI stays
    // in sync). Falls back to setting the tool directly if the button is absent.
    cancelPlacement() {
        this.placeGhost = null;
        const spawnBtn = document.querySelector('[data-tool="spawn"]');
        if (spawnBtn) spawnBtn.click();
        else this.currentTool = 'spawn';
    }

    spawnElement(x, y) {
        if (this.entities.length >= this.maxEntities) return;

        const ent = new ElementEntity(
            this.game.engine,
            x,
            y,
            this.selectedElement,
            this.currentTeam,
        );

        // Assign weapon if selected
        if (this.selectedWeapon !== 'none') {
            ent.weapon = this.selectedWeapon;
            ent.ai = new AIController(ent, this.getAIForTeam(this.currentTeam));
        } else if (this.currentTeam !== 'neutral') {
            // Give team entities a weapon and AI by default
            const wpn = randChoice(STARTER_WEAPONS);
            ent.weapon = wpn;
            ent.ai = new AIController(ent, this.getAIForTeam(this.currentTeam));
        }

        this.entities.push(ent);
        this.updateEntityCount();
    }

    spawnPresetEntity(x, y, elementKey, team) {
        if (this.entities.length >= this.maxEntities) return null;

        const ent = new ElementEntity(this.game.engine, x, y, elementKey, team);
        const wpn = randChoice(STARTER_WEAPONS);
        ent.weapon = wpn;
        ent.ai = new AIController(ent, 'aggressive');
        this.entities.push(ent);
        return ent;
    }

    executePreset(presetIndex) {
        if (this._presetExecuting) return;
        this._presetExecuting = true;

        const preset = SANDBOX_PRESETS[presetIndex];
        if (!preset) {
            this._presetExecuting = false;
            return;
        }

        // Clear arena first
        this.clearAll();

        const xMin = SANDBOX_FLOOR_LEFT + 100;
        const xMax = SANDBOX_FLOOR_RIGHT - 100;
        const yMin = 400;
        const yMax = SANDBOX_FLOOR_TOP - 20;

        if (preset.random) {
            // Random Army: 10–30 random entities on random teams
            const count = randInt(10, 30);
            const teams = ['a', 'b'];
            for (let i = 0; i < count; i++) {
                if (this.entities.length >= this.maxEntities) break;
                const x = randRange(xMin, xMax);
                const y = randRange(yMin, yMax);
                const elementKey = randChoice(ALL_ELEMENT_KEYS);
                const team = randChoice(teams);
                this.spawnPresetEntity(x, y, elementKey, team);
            }
        } else {
            for (const teamConfig of preset.teams) {
                for (let i = 0; i < teamConfig.count; i++) {
                    if (this.entities.length >= this.maxEntities) break;
                    const x = randRange(xMin, xMax);
                    const y = randRange(yMin, yMax);
                    const elementKey = randChoice(teamConfig.elements);
                    this.spawnPresetEntity(x, y, elementKey, teamConfig.team);
                }
            }
        }

        this.updateEntityCount();
        this._presetExecuting = false;
    }

    getAIForTeam(team) {
        if (team === 'a') return randChoice(['aggressive', 'berserker']);
        if (team === 'b') return randChoice(['defensive', 'aggressive']);
        return 'wanderer';
    }

    placeStructure(x) {
        const structure = new Structure(this.selectedStructure, x, SANDBOX_FLOOR_TOP);
        structure.addToWorld(this.game.engine.world);
        this.structures.push(structure);
        this.rebuildStaticBodies();
        playSound('pickup');
    }

    deleteAt(x, y) {
        // Elements first, so clicking an element inside a structure removes it.
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const ent = this.entities[i];
            if (!ent.alive) continue;
            const d = dist(x, y, ent.body.position.x, ent.body.position.y);
            if (d < ent.data.radius + 10) {
                ent.destroy();
                this.entities.splice(i, 1);
                this.updateEntityCount();
                return;
            }
        }

        // Then structures — remove the whole structure under the cursor.
        for (let i = this.structures.length - 1; i >= 0; i--) {
            const s = this.structures[i];
            if (s.containsPoint(x, y)) {
                s.removeFromWorld(this.game.engine.world);
                this.structures.splice(i, 1);
                this.rebuildStaticBodies();
                return;
            }
        }
    }

    explodeAt(x, y) {
        this.game.effects.explosion(x, y, '#ff6644', 30, 400);
        playSound('explode');
        triggerScreenShake(SCREEN_SHAKE_CONFIG.sandboxExplosion);

        for (const ent of this.entities) {
            if (!ent.alive) continue;
            const d = dist(x, y, ent.body.position.x, ent.body.position.y);
            if (d < 150) {
                const falloff = 1 - d / 150;
                ent.takeDamage(40 * falloff, this.game.effects);
                const a = angle(x, y, ent.body.position.x, ent.body.position.y);
                const force = 0.08 * falloff * ent.body.mass;
                Matter.Body.applyForce(ent.body, ent.body.position, {
                    x: Math.cos(a) * force,
                    y: Math.sin(a) * force,
                });
            }
        }

        // Structures take splash damage from the explode tool too.
        damageStructuresInRadius(
            this.structures,
            x,
            y,
            150,
            40,
            this.game.effects,
            this.game.engine.world,
        );
    }

    freezeAt(x, y) {
        for (const ent of this.entities) {
            if (!ent.alive) continue;
            const d = dist(x, y, ent.body.position.x, ent.body.position.y);
            if (d < 100) {
                Matter.Body.setVelocity(ent.body, { x: 0, y: 0 });
                Matter.Body.setAngularVelocity(ent.body, 0);
                this.game.effects.sparks(ent.body.position.x, ent.body.position.y, '#88ccff', 10);
            }
        }
    }

    startDrag(x, y) {
        // Find body at position — only element bodies are draggable.
        const bodies = Matter.Composite.allBodies(this.game.engine.world);
        for (const body of bodies) {
            if (body.isStatic) continue;
            if (body.label !== 'element') continue;
            if (Matter.Bounds.contains(body.bounds, { x, y })) {
                this.dragBody = body;
                this.dragConstraint = Matter.Constraint.create({
                    pointA: { x, y },
                    bodyB: body,
                    stiffness: 0.1,
                    damping: 0.1,
                    length: 0,
                });
                Matter.Composite.add(this.game.engine.world, this.dragConstraint);
                return;
            }
        }
    }

    endDrag() {
        if (this.dragConstraint) {
            Matter.Composite.remove(this.game.engine.world, this.dragConstraint);
            this.dragConstraint = null;
            this.dragBody = null;
        }
    }

    toggleSlowMo() {
        this.slowMo = !this.slowMo;
        this.game.timeScale = this.slowMo ? 0.3 : 1;
    }

    toggleGravity() {
        this.gravityFlipped = !this.gravityFlipped;
        this.game.engine.gravity.y = this.gravityFlipped ? -1 : 1;
    }

    clearAll() {
        for (const ent of this.entities) {
            ent.destroy();
        }
        this.entities = [];

        for (const proj of this.projectiles) {
            proj.destroy();
        }
        this.projectiles = [];

        for (const s of this.structures) {
            s.removeFromWorld(this.game.engine.world);
        }
        this.structures = [];
        this.rebuildStaticBodies();

        this.updateEntityCount();
    }

    updateEntityCount() {
        const counter = document.getElementById('entity-count');
        if (counter) {
            counter.textContent = `${this.entities.length}/${this.maxEntities}`;
        }
    }

    update(dt) {
        if (!this.active) return;

        // Update entities
        for (const ent of this.entities) {
            ent.update(dt, this.entities, this.game.effects);

            // AI update
            if (ent.ai && ent.alive) {
                ent.ai.update(
                    dt,
                    this.entities,
                    this.game.engine,
                    this.game.effects,
                    this.projectiles,
                );
            }

            // Kill elements stuck at ceiling for too long
            if (ent.alive && ent.body.position.y < -20) {
                ent.stuckTimer = (ent.stuckTimer || 0) + dt;
                if (ent.stuckTimer > 5) {
                    ent.die(this.entities, this.game.effects);
                }
            } else {
                ent.stuckTimer = 0;
            }
        }

        // Update projectiles
        for (const proj of this.projectiles) {
            proj.update(dt, this.game.effects);
            checkProjectileSweep(proj, this.entities, this.game.effects);
        }

        // Clean up dead
        this.entities = this.entities.filter((e) => {
            if (!e.alive) {
                // Check for score-giving specials
                const scoreBonus = e.special.scoreBonus || 0;
                if (scoreBonus) {
                    this.game.effects.scorePopup(
                        e.body?.position.x || 0,
                        e.body?.position.y || 0,
                        scoreBonus,
                    );
                }
                return false;
            }
            return true;
        });

        this.projectiles = this.projectiles.filter((p) => p.alive);

        // Refresh structure state after any combat damage this frame.
        this.pruneStructures();

        this.updateEntityCount();
    }

    render(ctx, camera) {
        if (!this.active) return;

        // Draw arena
        this.renderArena(ctx, camera);

        // Draw placed structures (behind entities so occupants render on top)
        for (const s of this.structures) {
            s.render(ctx, camera);
        }

        // Draw entities
        for (const ent of this.entities) {
            if (
                !isCircleOnScreen(ent.body.position.x, ent.body.position.y, ent.data.radius, camera)
            )
                continue;
            ent.render(ctx, camera);
        }

        // Draw projectiles
        for (const proj of this.projectiles) {
            proj.render(ctx, camera);
        }

        // Draw drag line
        if (this.dragConstraint && this.dragBody) {
            ctx.save();
            const a = camera.worldToScreen(
                this.dragConstraint.pointA.x,
                this.dragConstraint.pointA.y,
            );
            const b = camera.worldToScreen(this.dragBody.position.x, this.dragBody.position.y);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(0,212,255,0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }

        // Draw placement ghost for the place tool
        if (this.currentTool === 'place' && this.placeGhost) {
            renderStructureGhost(
                ctx,
                camera,
                this.selectedStructure,
                this.placeGhost.x,
                this.placeGhost.groundY,
            );
        }
    }

    renderArena(ctx, camera) {
        // Ground
        ctx.fillStyle = '#1a1a2e';
        const ground = camera.worldToScreen(SANDBOX_FLOOR_LEFT, SANDBOX_FLOOR_TOP);
        ctx.fillRect(ground.x, ground.y, SANDBOX_FLOOR_WIDTH * camera.zoom, 60 * camera.zoom);

        // Ground top line
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const groundEnd = camera.worldToScreen(SANDBOX_FLOOR_RIGHT, SANDBOX_FLOOR_TOP);
        ctx.moveTo(ground.x, ground.y);
        ctx.lineTo(groundEnd.x, groundEnd.y);
        ctx.stroke();

        // Platforms — Mario-style gold blocks, derived from the physics body centers
        for (const p of SANDBOX_PLATFORMS) {
            const s = camera.worldToScreen(p.x - p.w / 2, p.y - SANDBOX_PLATFORM_HEIGHT / 2);
            const w = p.w * camera.zoom;
            const h = SANDBOX_PLATFORM_HEIGHT * camera.zoom;
            const edge = Math.max(2, h * 0.22);

            ctx.fillStyle = '#ffc400';
            ctx.fillRect(s.x, s.y, w, h);
            ctx.fillStyle = '#ffe680';
            ctx.fillRect(s.x, s.y, w, edge);
            ctx.fillStyle = '#a87800';
            ctx.fillRect(s.x, s.y + h - edge, w, edge);
            ctx.strokeStyle = '#3a2a14';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(s.x, s.y, w, h);
        }

        // Ceiling — spans the visible arena width
        ctx.fillStyle = '#151530';
        const ceil = camera.worldToScreen(SANDBOX_FLOOR_LEFT - 20, -110);
        ctx.fillRect(ceil.x, ceil.y, (SANDBOX_FLOOR_WIDTH + 40) * camera.zoom, 60 * camera.zoom);

        // Boundary walls — bars flush with the visible window edges, drawn at the
        // wall bodies' inner faces (set by updateWalls). Slate fill with a lit
        // inner edge so the hard boundary reads clearly against the dark arena.
        const wallTop = camera.worldToScreen(0, SANDBOX_WALL_CENTER_Y - SANDBOX_WALL_HEIGHT / 2).y;
        const wallH = SANDBOX_WALL_HEIGHT * camera.zoom;
        const barW = SANDBOX_WALL_RENDER_WIDTH * camera.zoom;
        const edge = Math.max(2, barW * 0.28);
        const leftEdgeX = camera.worldToScreen(this._wallLeftX ?? SANDBOX_FLOOR_LEFT, 0).x;
        const rightEdgeX = camera.worldToScreen(this._wallRightX ?? SANDBOX_FLOOR_RIGHT, 0).x;
        // Left wall extends inward (right) from the left window edge.
        ctx.fillStyle = '#2a3350';
        ctx.fillRect(leftEdgeX, wallTop, barW, wallH);
        ctx.fillStyle = '#3f4a78';
        ctx.fillRect(leftEdgeX + barW - edge, wallTop, edge, wallH);
        // Right wall extends inward (left) from the right window edge.
        ctx.fillStyle = '#2a3350';
        ctx.fillRect(rightEdgeX - barW, wallTop, barW, wallH);
        ctx.fillStyle = '#3f4a78';
        ctx.fillRect(rightEdgeX - barW, wallTop, edge, wallH);

        // Grid overlay
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for (let x = SANDBOX_FLOOR_LEFT; x < SANDBOX_FLOOR_RIGHT; x += 50) {
            ctx.beginPath();
            const a = camera.worldToScreen(x, -500);
            const b = camera.worldToScreen(x, 800);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        for (let y = -500; y < 800; y += 50) {
            ctx.beginPath();
            const a = camera.worldToScreen(SANDBOX_FLOOR_LEFT, y);
            const b = camera.worldToScreen(SANDBOX_FLOOR_RIGHT, y);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }

    stop() {
        this.active = false;
        this.clearAll();

        // Remove arena geometry (clearAll already dropped any structures)
        if (this.arenaBodies) {
            for (const b of this.arenaBodies) {
                Matter.Composite.remove(this.game.engine.world, b);
            }
            this.arenaBodies = [];
        }
        this.staticBodies = [];
        this.placeGhost = null;

        // Remove event listeners
        if (this.mouseHandler) {
            this.game.canvas.removeEventListener('click', this.mouseHandler);
            this.game.canvas.removeEventListener('mousedown', this.mouseDownHandler);
            this.game.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
            this.game.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
            window.removeEventListener('mousemove', this.mouseMoveHandler);
            window.removeEventListener('mouseup', this.mouseUpHandler);
            window.removeEventListener('keydown', this.keyDownHandler);
        }

        this.endDrag();

        document.getElementById('sandbox-toolbar').classList.add('hidden');
    }
}
