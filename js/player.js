// Player controller: WASD movement, mouse aiming, weapon firing
const INPUT = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['KeyW', 'Space', 'ArrowUp'],
    fireButton: 0,
    weaponSlots: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'],
};

class Player {
    constructor() {
        this.entity = null;
        this.elementKey = 'H';
        this.weaponKey = 'photon';
        this.score = 0;

        // Input state
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;

        // Movement
        this.jumpCooldown = 0;
        this.grounded = false;

        this._setupInput();
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Number keys for weapon switching
            if (INPUT.weaponSlots.includes(e.code)) {
                const idx = INPUT.weaponSlots.indexOf(e.code);
                const available = this.getAvailableWeapons();
                if (idx < available.length) {
                    this.weaponKey = available[idx];
                    if (this.entity) this.entity.weapon = this.weaponKey;
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('mousedown', (e) => {
            if (e.button === INPUT.fireButton) this.mouseDown = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === INPUT.fireButton) this.mouseDown = false;
        });
        window.addEventListener('blur', () => this.clearInput());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.clearInput();
        });
        // Prevent context menu
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    clearInput() {
        this.keys = {};
        this.mouseDown = false;
    }

    getAvailableWeapons() {
        return WEAPON_KEYS.filter((k) => WEAPONS[k].unlocked);
    }

    spawn(engine, x, y) {
        this.entity = new ElementEntity(engine, x, y, this.elementKey, 'a', true);
        this.entity.weapon = this.weaponKey;
        return this.entity;
    }

    update(dt, camera, engine, effects, projectiles, entities) {
        if (!this.entity || !this.entity.alive) return;

        const ent = this.entity;
        const body = ent.body;
        const data = ent.data;

        this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);

        // Calculate mouse world position
        const mouseWorld = camera.screenToWorld(this.mouseX, this.mouseY);
        this.mouseWorldX = mouseWorld.x;
        this.mouseWorldY = mouseWorld.y;

        // Aim angle
        ent.aimAngle = angle(body.position.x, body.position.y, this.mouseWorldX, this.mouseWorldY);

        // Movement force
        const speedMul = ent.speedMultiplier || 1;
        const moveForce = 0.003 * body.mass * (data.speed / 5) * speedMul;

        if (INPUT.left.some((code) => this.keys[code])) {
            Matter.Body.applyForce(body, body.position, { x: -moveForce, y: 0 });
        }
        if (INPUT.right.some((code) => this.keys[code])) {
            Matter.Body.applyForce(body, body.position, { x: moveForce, y: 0 });
        }

        // Jump
        if (INPUT.jump.some((code) => this.keys[code]) && this.jumpCooldown <= 0) {
            // Check if grounded
            if (this.isGrounded(engine)) {
                const jumpMul = ent.jumpMultiplier || 1;
                const jumpForce = 0.04 * body.mass * Math.min(data.speed / 3, 2.5) * jumpMul;
                Matter.Body.applyForce(body, body.position, { x: 0, y: -jumpForce });
                this.jumpCooldown = 0.3;
            }
        }

        // Speed cap
        const maxVel = data.speed * 0.8 * speedMul;
        if (Math.abs(body.velocity.x) > maxVel) {
            Matter.Body.setVelocity(body, {
                x: Math.sign(body.velocity.x) * maxVel,
                y: body.velocity.y,
            });
        }

        // Shooting
        if (this.mouseDown && ent.weapon) {
            fireWeapon(engine, ent, ent.weapon, effects, projectiles);
        }

        // Magnetic special
        ent.applyMagnetic(entities);

        // Electric chain special
        const chain = getSpecialConfig(ent.data.special).chain;
        if (chain && ent.specialTimer <= 0 && this.mouseDown) {
            ent.specialTimer = chain.cooldown;
            this.chainLightning(ent, entities, effects);
        }
    }

    isGrounded(engine) {
        if (!this.entity) return false;
        const body = this.entity.body;
        const pos = body.position;
        const r = this.entity.data.radius;

        // Ray cast downward
        const bodies = Matter.Composite.allBodies(engine.world);
        for (const b of bodies) {
            if (b === body || b.isSensor) continue;
            if (b.collisionFilter.category === CAT.PROJECTILE) continue;
            // Check if any body is directly below within a small margin
            if (Matter.Bounds.contains(b.bounds, { x: pos.x, y: pos.y + r + 3 })) {
                return true;
            }
        }
        return false;
    }

    chainLightning(entity, entities, effects) {
        const pos = entity.body.position;
        const chain = getSpecialConfig(entity.data.special).chain;
        const range = chain.range;
        let targets = entities
            .filter(
                (e) =>
                    e !== entity &&
                    e.alive &&
                    e.team !== entity.team &&
                    dist(pos.x, pos.y, e.body.position.x, e.body.position.y) < range,
            )
            .slice(0, chain.maxTargets);

        let prev = pos;
        for (const t of targets) {
            resolveElementDamage(t, chain.damage, effects, entity, entities, {
                attackerSpecial: entity.data.special,
                status: 'shocked',
            });
            if (effects) {
                effects.electricArc(prev.x, prev.y, t.body.position.x, t.body.position.y);
            }
            prev = t.body.position;
        }
    }

    addScore(amount) {
        this.score += amount;
    }

    reset() {
        this.entity = null;
        this.score = 0;
        this.clearInput();
    }
}
