// Weapon definitions and projectile system
const WEAPONS = {
    photon: {
        name: 'Photon Blaster',
        desc: 'Standard energy weapon',
        icon: '🔫',
        damage: 15,
        speed: 800,
        cooldown: 0.3,
        knockback: 3,
        projectileRadius: 4,
        projectileColor: '#00d4ff',
        count: 1,
        spread: 0,
        explosive: false,
        lifetime: 2,
        sound: 'shoot',
        unlocked: true,
    },
    shotgun: {
        name: 'Electron Shotgun',
        desc: 'Wide spread burst',
        icon: '💨',
        damage: 8,
        speed: 600,
        cooldown: 0.6,
        knockback: 5,
        projectileRadius: 3,
        projectileColor: '#ffdd44',
        count: 5,
        spread: 0.35,
        explosive: false,
        lifetime: 0.8,
        sound: 'shotgun',
        unlocked: true,
    },
    cannon: {
        name: 'Neutron Cannon',
        desc: 'Heavy single shot',
        icon: '💣',
        damage: 45,
        speed: 500,
        cooldown: 1.2,
        knockback: 12,
        projectileRadius: 8,
        projectileColor: '#ff6644',
        count: 1,
        spread: 0,
        explosive: true,
        explosionRadius: 80,
        lifetime: 3,
        sound: 'cannon',
        unlocked: true,
    },
    beam: {
        name: 'Ion Beam',
        desc: 'Rapid fire stream',
        icon: '⚡',
        damage: 6,
        speed: 1000,
        cooldown: 0.08,
        knockback: 1,
        projectileRadius: 2,
        projectileColor: '#aa44ff',
        count: 1,
        spread: 0.08,
        explosive: false,
        lifetime: 1,
        sound: 'beam',
        unlocked: false,
    },
    fusion: {
        name: 'Fusion Launcher',
        desc: 'Explosive area damage',
        icon: '☢',
        damage: 35,
        speed: 400,
        cooldown: 1.5,
        knockback: 15,
        projectileRadius: 10,
        projectileColor: '#44ff88',
        count: 1,
        spread: 0,
        explosive: true,
        explosionRadius: 120,
        lifetime: 4,
        sound: 'cannon',
        unlocked: false,
    },
    gravity: {
        name: 'Gravity Gun',
        desc: 'High knockback gravity pulse',
        icon: '🌀',
        damage: 5,
        speed: 600,
        cooldown: 0.5,
        knockback: 20,
        projectileRadius: 12,
        projectileColor: '#8844dd',
        count: 1,
        spread: 0,
        explosive: false,
        lifetime: 1.5,
        sound: 'shoot',
        isGravity: true,
        unlocked: false,
    },
};

const WEAPON_KEYS = Object.keys(WEAPONS);
const STARTER_WEAPONS = ['photon', 'shotgun', 'cannon'];

// Projectile class
class Projectile {
    constructor(engine, x, y, angle, weaponKey, shooterTeam, shooterEntity = null) {
        const wpn = WEAPONS[weaponKey];
        this.weaponKey = weaponKey;
        this.wpn = wpn;
        this.team = shooterTeam;
        this.shooter = shooterEntity;
        this.alive = true;
        this.lifetime = wpn.lifetime;
        this.prevPosition = { x, y };

        const vx = Math.cos(angle) * wpn.speed;
        const vy = Math.sin(angle) * wpn.speed;

        this.body = Matter.Bodies.circle(x, y, wpn.projectileRadius, {
            restitution: 0.2,
            friction: 0,
            frictionAir: 0,
            density: 0.001,
            isSensor: false,
            collisionFilter: {
                category: CAT.PROJECTILE,
                mask: CAT.GROUND | CAT.ELEMENT | CAT.PLAYER | CAT.WALL | CAT.PLATFORM,
            },
            label: 'projectile',
        });

        this.body.projectile = this;

        Matter.Body.setVelocity(this.body, { x: vx / 60, y: vy / 60 });
        Matter.Composite.add(engine.world, this.body);
        this.engine = engine;
    }

    capturePreviousPosition() {
        if (!this.alive || !this.body) return;
        this.prevPosition = { x: this.body.position.x, y: this.body.position.y };
    }

    update(dt, effects) {
        if (!this.alive) return;

        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }

        // Zero out gravity for projectiles — read live so sandbox
        // gravity flip mid-flight is honored.
        const gy = this.engine.gravity.y || 0;
        Matter.Body.applyForce(this.body, this.body.position, {
            x: 0,
            y: -this.body.mass * 0.001 * gy,
        });

        // Trail effect
        if (effects) {
            effects.addTrail(
                this.body.position.x,
                this.body.position.y,
                this.wpn.projectileColor,
                this.wpn.projectileRadius,
            );
        }
    }

    onHit(entity, entities, effects) {
        if (!this.alive) return;
        if (entity === this.shooter) return;
        if (entity && entity.team === this.team && this.team !== 'neutral') return;

        if (entity && entity.alive) {
            resolveElementDamage(entity, this.wpn.damage, effects, this.shooter, entities, {
                attackerSpecial: this.shooter?.data?.special || 'none',
            });

            // Knockback
            const ang = angle(0, 0, this.body.velocity.x, this.body.velocity.y);
            const force = this.wpn.knockback * 0.005 * entity.body.mass;
            Matter.Body.applyForce(entity.body, entity.body.position, {
                x: Math.cos(ang) * force,
                y: Math.sin(ang) * force,
            });

            // Reflect special
            const reflectChance = entity.special.reflectChance || 0;
            if (reflectChance && Math.random() < reflectChance) {
                // Reflect projectile back
                Matter.Body.setVelocity(this.body, {
                    x: -this.body.velocity.x,
                    y: -this.body.velocity.y,
                });
                this.team = entity.team;
                this.shooter = entity;
                // Re-anchor sweep origin so next frame's swept-collision
                // doesn't re-hit the reflector or chain through it.
                this.prevPosition = { x: this.body.position.x, y: this.body.position.y };
                if (effects)
                    effects.sparks(this.body.position.x, this.body.position.y, '#ffffff', 12);
                return; // Don't destroy
            }
        }

        // Explosive projectiles
        if (this.wpn.explosive && effects) {
            const pos = this.body.position;
            effects.explosion(pos.x, pos.y, this.wpn.projectileColor, 25, 350);
            playSound('explode');
            triggerScreenShake(10);

            // AoE damage
            if (entities) {
                const r2 = this.wpn.explosionRadius * this.wpn.explosionRadius;
                for (const ent of entities) {
                    if (!ent.alive || ent === this.shooter) continue;
                    if (ent.team === this.team && this.team !== 'neutral') continue;
                    const d2 = dist2(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
                    if (d2 < r2) {
                        const falloff = 1 - Math.sqrt(d2) / this.wpn.explosionRadius;
                        resolveElementDamage(
                            ent,
                            this.wpn.damage * falloff * 0.6,
                            effects,
                            this.shooter,
                            entities,
                            {
                                attackerSpecial: this.shooter?.data?.special || 'none',
                            },
                        );
                        const a = angle(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
                        const f = this.wpn.knockback * 0.01 * falloff * ent.body.mass;
                        Matter.Body.applyForce(ent.body, ent.body.position, {
                            x: Math.cos(a) * f,
                            y: Math.sin(a) * f,
                        });
                    }
                }
            }

            // Structures take splash damage too (sandbox creator mode).
            damageStructuresInRadius(
                activeSandboxStructures(),
                pos.x,
                pos.y,
                this.wpn.explosionRadius,
                this.wpn.damage * 0.6,
                effects,
                this.engine.world,
            );
        } else if (effects) {
            effects.sparks(this.body.position.x, this.body.position.y, this.wpn.projectileColor);
        }

        this.destroy();
    }

    render(ctx, camera) {
        if (!this.alive) return;

        const pos = this.body.position;
        if (!isCircleOnScreen(pos.x, pos.y, this.wpn.projectileRadius, camera)) return;
        const screen = camera.worldToScreen(pos.x, pos.y);
        const sx = screen.x;
        const sy = screen.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, this.wpn.projectileRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.wpn.projectileColor;
        ctx.shadowColor = this.wpn.projectileColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
    }

    destroy() {
        this.alive = false;
        if (this.body) {
            Matter.Composite.remove(this.engine.world, this.body);
            this.body = null;
        }
    }
}

function checkProjectileSweep(projectile, entities, effects) {
    if (!projectile.alive || !projectile.body) return;
    const from = projectile.prevPosition;
    const to = projectile.body.position;
    for (const ent of entities) {
        if (!ent.alive || ent === projectile.shooter) continue;
        if (ent.team === projectile.team && projectile.team !== 'neutral') continue;
        const radius = ent.data.radius + projectile.wpn.projectileRadius;
        if (distanceToSegment(ent.body.position, from, to) <= radius) {
            projectile.onHit(ent, entities, effects);
            return;
        }
    }
}

function distanceToSegment(point, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist(point.x, point.y, from.x, from.y);
    const t = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / lenSq, 0, 1);
    return dist(point.x, point.y, from.x + dx * t, from.y + dy * t);
}

// Fire weapon from entity
function fireWeapon(engine, entity, weaponKey, effects, projectiles) {
    if (!entity.alive || entity.fireCooldown > 0) return;

    const wpn = WEAPONS[weaponKey];
    entity.fireCooldown = wpn.cooldown;

    const pos = entity.body.position;
    const spawnDist = entity.data.radius + wpn.projectileRadius + 5;

    playSound(wpn.sound);

    for (let i = 0; i < wpn.count; i++) {
        const spreadAngle =
            entity.aimAngle +
            (wpn.count > 1
                ? -wpn.spread + (wpn.spread * 2 * i) / (wpn.count - 1)
                : randRange(-wpn.spread, wpn.spread));

        const sx = pos.x + Math.cos(spreadAngle) * spawnDist;
        const sy = pos.y + Math.sin(spreadAngle) * spawnDist;

        const proj = new Projectile(engine, sx, sy, spreadAngle, weaponKey, entity.team, entity);
        projectiles.push(proj);
    }

    // Recoil
    const recoil = wpn.knockback * 0.001 * entity.body.mass;
    Matter.Body.applyForce(entity.body, entity.body.position, {
        x: -Math.cos(entity.aimAngle) * recoil,
        y: -Math.sin(entity.aimAngle) * recoil,
    });
}
