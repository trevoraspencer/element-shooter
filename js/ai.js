// AI behaviors for enemy elements
const AI_BEHAVIORS = {
    aggressive: {
        name: 'Aggressive',
        attackRange: 300,
        chaseRange: 500,
        retreatHealth: 0.1,
        shootChance: 0.12,
        jumpChance: 0.02,
        preferredRange: 150,
        cooldownMult: 2.5,
    },
    defensive: {
        name: 'Defensive',
        attackRange: 250,
        chaseRange: 350,
        retreatHealth: 0.4,
        shootChance: 0.08,
        jumpChance: 0.01,
        preferredRange: 250,
        cooldownMult: 3,
    },
    wanderer: {
        name: 'Wanderer',
        attackRange: 200,
        chaseRange: 300,
        retreatHealth: 0.3,
        shootChance: 0.05,
        jumpChance: 0.03,
        preferredRange: 200,
        cooldownMult: 3.5,
    },
    berserker: {
        name: 'Berserker',
        attackRange: 400,
        chaseRange: 600,
        retreatHealth: 0,
        shootChance: 0.18,
        jumpChance: 0.04,
        preferredRange: 80,
        cooldownMult: 2,
    },
};

class AIController {
    constructor(entity, behaviorType = 'aggressive') {
        this.entity = entity;
        this.behavior = AI_BEHAVIORS[behaviorType] || AI_BEHAVIORS.aggressive;
        this.behaviorType = behaviorType;

        // State
        this.target = null;
        this.targetDist = Infinity;
        this.state = 'idle'; // idle, chase, attack, retreat, wander
        this.stateTimer = 0;
        this.wanderDir = Math.random() > 0.5 ? 1 : -1;
        this.wanderTimer = randRange(1, 3);
        this.jumpTimer = 0;
        this.thinkTimer = 0;
        this.retreatTimer = 0;
    }

    update(dt, entities, engine, effects, projectiles) {
        const ent = this.entity;
        if (!ent.alive) return;

        this.stateTimer -= dt;
        this.jumpTimer = Math.max(0, this.jumpTimer - dt);
        this.thinkTimer -= dt;

        // Re-evaluate target periodically
        if (this.thinkTimer <= 0) {
            this.thinkTimer = 0.5;
            this.findTarget(entities);
            this.evaluateState();
        }

        // Execute behavior
        switch (this.state) {
            case 'idle':
                this.doIdle(dt, engine);
                break;
            case 'wander':
                this.doWander(dt, engine);
                break;
            case 'chase':
                this.doChase(dt, engine);
                break;
            case 'attack':
                this.doAttack(dt, engine, effects, projectiles);
                break;
            case 'retreat':
                this.doRetreat(dt, engine, effects, projectiles);
                break;
        }

        // Random jumps — chance is per-60fps-frame, scaled by dt
        if (Math.random() < this.behavior.jumpChance * dt * 60 && this.jumpTimer <= 0) {
            this.tryJump(engine);
        }

        // Track retreat duration — cap at 3s, then slowly recharge
        if (this.state === 'retreat') {
            this.retreatTimer += dt;
        } else {
            this.retreatTimer = Math.max(0, this.retreatTimer - dt * 0.5);
        }

        // Magnetic special
        ent.applyMagnetic(entities);
    }

    findTarget(entities) {
        const pos = this.entity.body.position;
        let closest = null;
        let closestD2 = Infinity;

        for (const ent of entities) {
            if (ent === this.entity || !ent.alive) continue;
            if (ent.team === this.entity.team && this.entity.team !== 'neutral') continue;

            const d2 = dist2(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
            if (d2 < closestD2) {
                closestD2 = d2;
                closest = ent;
            }
        }

        this.target = closest;
        // One sqrt for the winner; evaluateState compares this against linear ranges.
        this.targetDist = closest ? Math.sqrt(closestD2) : Infinity;
    }

    evaluateState() {
        const healthPct = this.entity.health / this.entity.maxHealth;

        // Retreat if low health
        if (healthPct < this.behavior.retreatHealth && this.target && this.retreatTimer < 3) {
            this.state = 'retreat';
            return;
        }

        if (!this.target) {
            this.state = 'wander';
            return;
        }

        if (this.targetDist < this.behavior.attackRange) {
            this.state = 'attack';
        } else if (this.targetDist < this.behavior.chaseRange) {
            this.state = 'chase';
        } else {
            this.state = 'wander';
        }
    }

    doIdle(dt, engine) {
        // Just stand around
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.state = 'wander';
            this.wanderDir = Math.random() > 0.5 ? 1 : -1;
            this.wanderTimer = randRange(1, 3);
        }
    }

    doWander(dt, engine) {
        const body = this.entity.body;
        const moveForce = 0.001 * body.mass * (this.entity.data.speed / 5);

        // Bias toward known target so teams actually engage
        if (this.target && this.target.alive) {
            this.wanderDir = this.target.body.position.x > body.position.x ? 1 : -1;
        }

        Matter.Body.applyForce(body, body.position, { x: moveForce * this.wanderDir, y: 0 });

        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderDir *= -1;
            this.wanderTimer = randRange(1, 3);
        }

        // Speed cap
        capHorizontalSpeed(body, this.entity.data.speed * 0.4);
    }

    doChase(dt, engine) {
        if (!this.target || !this.target.alive) {
            this.state = 'wander';
            return;
        }

        const body = this.entity.body;
        const tPos = this.target.body.position;
        const dir = tPos.x > body.position.x ? 1 : -1;
        const moveForce = 0.002 * body.mass * (this.entity.data.speed / 5);

        Matter.Body.applyForce(body, body.position, { x: moveForce * dir, y: 0 });

        // Aim at target
        this.entity.aimAngle = angle(body.position.x, body.position.y, tPos.x, tPos.y);

        // Speed cap
        capHorizontalSpeed(body, this.entity.data.speed * 0.6);

        // Jump if target is above
        if (tPos.y < body.position.y - 50 && this.jumpTimer <= 0) {
            this.tryJump(engine);
        }
    }

    doAttack(dt, engine, effects, projectiles) {
        if (!this.target || !this.target.alive) {
            this.state = 'wander';
            return;
        }

        const body = this.entity.body;
        const tPos = this.target.body.position;

        // Aim at target
        this.entity.aimAngle = angle(body.position.x, body.position.y, tPos.x, tPos.y);

        // Maintain preferred range
        const currentDist = dist(body.position.x, body.position.y, tPos.x, tPos.y);
        const moveForce = 0.001 * body.mass * (this.entity.data.speed / 5);

        if (currentDist < this.behavior.preferredRange * 0.6) {
            // Too close, back up (unless berserker)
            if (this.behaviorType !== 'berserker') {
                const dir = tPos.x > body.position.x ? -1 : 1;
                Matter.Body.applyForce(body, body.position, { x: moveForce * dir, y: 0 });
            }
        } else if (currentDist > this.behavior.preferredRange * 1.2) {
            // Too far, move closer
            const dir = tPos.x > body.position.x ? 1 : -1;
            Matter.Body.applyForce(body, body.position, { x: moveForce * dir, y: 0 });
        }

        // Shoot (AI fires slower than player via cooldown multiplier)
        if (
            this.entity.weapon &&
            this.entity.fireCooldown <= 0 &&
            Math.random() < this.behavior.shootChance * dt * 60
        ) {
            fireWeapon(engine, this.entity, this.entity.weapon, effects, projectiles);
            this.entity.fireCooldown *= this.behavior.cooldownMult || 2;
        }

        // Speed cap
        capHorizontalSpeed(body, this.entity.data.speed * 0.5);
    }

    doRetreat(dt, engine, effects, projectiles) {
        if (!this.target) {
            this.state = 'wander';
            return;
        }

        const body = this.entity.body;
        const tPos = this.target.body.position;
        const dir = tPos.x > body.position.x ? -1 : 1;
        const moveForce = 0.0015 * body.mass * (this.entity.data.speed / 5);

        Matter.Body.applyForce(body, body.position, { x: moveForce * dir, y: 0 });

        // Still aim and shoot while retreating
        this.entity.aimAngle = angle(body.position.x, body.position.y, tPos.x, tPos.y);

        // Return fire while retreating
        if (
            this.entity.weapon &&
            this.entity.fireCooldown <= 0 &&
            Math.random() < this.behavior.shootChance * 0.5 * dt * 60
        ) {
            fireWeapon(engine, this.entity, this.entity.weapon, effects, projectiles);
            this.entity.fireCooldown *= this.behavior.cooldownMult || 2;
        }

        // Re-evaluate if health recovered
        const healthPct = this.entity.health / this.entity.maxHealth;
        if (healthPct > this.behavior.retreatHealth + 0.2) {
            this.state = 'chase';
        }
    }

    tryJump(engine) {
        const body = this.entity.body;
        if (isBodyGrounded(engine, body, this.entity.data.radius)) {
            const jumpForce = 0.03 * body.mass * Math.min(this.entity.data.speed / 3, 2);
            Matter.Body.applyForce(body, body.position, { x: 0, y: -jumpForce });
            this.jumpTimer = 0.5;
        }
    }
}
