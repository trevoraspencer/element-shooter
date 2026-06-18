// ElementEntity: wraps a Matter.js body with game state
class ElementEntity {
    constructor(engine, x, y, elementKey, team = 'neutral', isPlayer = false) {
        const data = ELEMENTS[elementKey];
        this.elementKey = elementKey;
        this.data = data;
        this.team = team;
        this.isPlayer = isPlayer;

        // Game stats
        this.maxHealth = data.health;
        this.health = data.health;
        this.alive = true;
        this.invulnTimer = 0;

        // Weapon
        this.weapon = null;
        this.fireCooldown = 0;
        this.aimAngle = 0;

        // AI
        this.ai = null;
        this.entitiesContext = null;

        // Special ability cooldown
        this.specialTimer = 0;
        this.statuses = new Map();

        // Special config and render colors are constant per element — cache them
        // so the per-frame update/render paths don't recompute them.
        this.special = getSpecialConfig(data.special);
        this.rimColor = colorWithAlpha(data.color, 0.5);
        this.symbolColor = this.isLightColor() ? '#000' : '#fff';

        // Visual
        this.flashTimer = 0;
        this.deathTimer = 0;

        // Physics body - circle
        const scaledMass = 0.5 + (data.mass / 94) * 4;
        this.body = Matter.Bodies.circle(x, y, data.radius, {
            restitution: 0.4,
            friction: 0.3,
            frictionAir: 0.02,
            density: scaledMass * 0.001,
            collisionFilter: {
                category: isPlayer ? CAT.PLAYER : CAT.ELEMENT,
                mask:
                    CAT.GROUND |
                    CAT.ELEMENT |
                    CAT.PLAYER |
                    CAT.PROJECTILE |
                    CAT.WALL |
                    CAT.PLATFORM,
            },
            label: 'element',
        });

        // Store reference on body
        this.body.entity = this;

        Matter.Composite.add(engine.world, this.body);
        this.engine = engine;

        if (typeof this.special.frictionAir === 'number') {
            this.body.frictionAir = this.special.frictionAir;
        }
    }

    update(dt, entities, effects) {
        if (!this.alive) return;
        this.entitiesContext = entities;

        this.fireCooldown = Math.max(0, this.fireCooldown - dt * (this.fireRateMultiplier || 1));
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
        this.flashTimer = Math.max(0, this.flashTimer - dt);
        this.specialTimer = Math.max(
            0,
            this.specialTimer - dt * (this.specialCooldownRateMultiplier || 1),
        );
        this.updateStatuses(dt);
        this.applyStatusEffects(dt, effects);

        const special = this.special;

        if (special.passiveForce) {
            const isFloat = this.data.special === 'float';
            if (!isFloat || !this.isGrounded()) {
                Matter.Body.applyForce(this.body, this.body.position, {
                    x: (special.passiveForce.x || 0) * this.body.mass,
                    y: (special.passiveForce.y || 0) * this.body.mass,
                });
            }
        }

        if (special.aura && this.specialTimer <= 0) {
            this.specialTimer = special.aura.cooldown;
            this.applyAuraDamage(entities, effects, special.aura);
        }

        if (special.visual === 'glow' && effects) {
            effects.glowPulse(
                this.body.position.x,
                this.body.position.y,
                this.data.color,
                this.data.radius,
            );
        }

        // Out of bounds safety net — tracks current camera world bounds so
        // wider levels don't quietly kill entities at their edges.
        const pos = this.body.position;
        const cam = window.game?.camera;
        const margin = 300;
        const minX = (cam?.worldMinX ?? -500) - margin;
        const maxX = (cam?.worldMaxX ?? 5000) + margin;
        const minY = (cam?.worldMinY ?? -500) - margin;
        const maxY = (cam?.worldMaxY ?? 1500) + margin;
        if (pos.x < minX || pos.x > maxX || pos.y < minY || pos.y > maxY) {
            this.die(entities, effects);
        }
    }

    takeDamage(amount, effects, attacker = null, entities = null) {
        return resolveElementDamage(this, amount, effects, attacker, entities);
    }

    die(entities, effects) {
        if (!this.alive) return;
        this.alive = false;

        playSound('death');

        if (effects) {
            effects.deathExplosion(this.body.position.x, this.body.position.y, this.data.color);

            const death = this.special.death;
            if (death?.nuclear) {
                effects.nuclearExplosion(this.body.position.x, this.body.position.y);
            }
            if (death) {
                this.deathExplosion(entities, effects, death.radius, death.damage);
            }
        }

        // Remove body after brief delay for visual
        setTimeout(() => {
            if (this.body) {
                Matter.Composite.remove(this.engine.world, this.body);
            }
        }, 100);
    }

    deathExplosion(entities, effects, radius = 100, damage = 30) {
        if (!entities) return;
        const pos = this.body.position;
        playSound('explode');
        triggerScreenShake(SCREEN_SHAKE_CONFIG.explosion + 2);

        const r2 = radius * radius;
        for (const ent of entities) {
            if (ent === this || !ent.alive) continue;
            const d2 = dist2(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
            if (d2 < r2) {
                const falloff = 1 - Math.sqrt(d2) / radius;
                resolveElementDamage(ent, damage * falloff, effects, this, entities, {
                    attackerSpecial: this.data.special,
                });
                // Knockback
                const ang = angle(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
                const force = 0.05 * falloff * ent.body.mass;
                Matter.Body.applyForce(ent.body, ent.body.position, {
                    x: Math.cos(ang) * force,
                    y: Math.sin(ang) * force,
                });
            }
        }
    }

    applyAuraDamage(entities, effects, aura) {
        const pos = this.body.position;
        const r2 = aura.radius * aura.radius;
        for (const ent of entities) {
            if (ent === this || !ent.alive || ent.team === this.team) continue;
            const d2 = dist2(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
            if (d2 < r2) {
                resolveElementDamage(ent, aura.damage, effects, this, entities, {
                    attackerSpecial: this.data.special,
                    status: aura.status,
                    statusDuration: aura.cooldown * 1.5,
                });
                if (effects) {
                    if (aura.effect === 'glow')
                        effects.glowPulse(
                            ent.body.position.x,
                            ent.body.position.y,
                            aura.color || this.data.color,
                        );
                    if (aura.effect === 'toxic')
                        effects.toxicCloud(
                            ent.body.position.x,
                            ent.body.position.y,
                            this.data.color,
                        );
                    if (aura.effect === 'freeze')
                        effects.sparks(ent.body.position.x, ent.body.position.y, '#88ccff', 6);
                    if (aura.effect === 'sparks')
                        effects.sparks(
                            ent.body.position.x,
                            ent.body.position.y,
                            this.data.color,
                            5,
                        );
                }
            }
        }
    }

    addStatus(key, duration, source = null) {
        if (!key) return;
        const current = this.statuses.get(key);
        this.statuses.set(key, {
            key,
            source,
            remaining: Math.max(duration, current?.remaining || 0),
        });
    }

    updateStatuses(dt) {
        for (const [key, status] of this.statuses) {
            status.remaining -= dt;
            if (status.remaining <= 0) this.statuses.delete(key);
        }
    }

    applyStatusEffects(dt, effects) {
        if (!this.statuses.size) return;
        for (const [key] of this.statuses) {
            const cfg = STATUS_EFFECTS[key];
            if (!cfg) continue;

            if (cfg.dot) {
                // Smooth DOT — health loss only, no invuln check, no recursive die
                const tick = cfg.dot * dt;
                this.health -= tick;
                if (effects && Math.random() < dt * 4) {
                    effects.damageNumber(
                        this.body.position.x,
                        this.body.position.y,
                        tick * 4,
                        cfg.color,
                    );
                }
            }

            if (cfg.velocityMul && cfg.velocityMul < 1) {
                // Exponential damp so the slow factor matches "factor per second"
                const factor = Math.pow(cfg.velocityMul, dt);
                Matter.Body.setVelocity(this.body, {
                    x: this.body.velocity.x * factor,
                    y: this.body.velocity.y * factor,
                });
            }
        }

        if (this.health <= 0 && this.alive) {
            this.die(this.entitiesContext, effects);
        }
    }

    // Magnetic pull (Fe special)
    applyMagnetic(entities) {
        const magnetic = this.special.magnetic;
        if (!magnetic) return;
        const pos = this.body.position;
        const r2 = magnetic.radius * magnetic.radius;
        for (const ent of entities) {
            if (ent === this || !ent.alive || ent.team === this.team) continue;
            const d2 = dist2(pos.x, pos.y, ent.body.position.x, ent.body.position.y);
            if (d2 < r2 && d2 > 100) {
                const ang = angle(ent.body.position.x, ent.body.position.y, pos.x, pos.y);
                const force = magnetic.force * ent.body.mass;
                Matter.Body.applyForce(ent.body, ent.body.position, {
                    x: Math.cos(ang) * force,
                    y: Math.sin(ang) * force,
                });
            }
        }
    }

    render(ctx, camera) {
        if (!this.alive) return;

        const pos = this.body.position;
        if (!isCircleOnScreen(pos.x, pos.y, this.data.radius, camera)) return;
        const screen = camera.worldToScreen(pos.x, pos.y);
        const sx = screen.x;
        const sy = screen.y;
        const r = this.data.radius;

        ctx.save();

        // Team glow
        if (this.team !== 'neutral') {
            ctx.shadowColor = TEAM_COLORS[this.team];
            ctx.shadowBlur = 12;
        }

        // Flash white on hit
        const color = this.flashTimer > 0 ? '#ffffff' : this.data.color;

        // Body circle
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Darker rim
        ctx.strokeStyle = this.rimColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Player indicator
        if (this.isPlayer) {
            ctx.beginPath();
            ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,212,255,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Symbol text
        ctx.fillStyle = this.symbolColor;
        ctx.font = `bold ${Math.round(r * 0.9)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.symbol, sx, sy);

        // Health bar (not for player - shown in HUD)
        if (!this.isPlayer && this.health < this.maxHealth) {
            const barW = r * 2;
            const barH = 4;
            const barX = sx - r;
            const barY = sy - r - 10;
            const pct = this.health / this.maxHealth;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);

            const hpColor = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barW * pct, barH);
        }

        // Weapon rendering
        if (this.weapon) {
            const wpnLen = 18;
            const wx = sx + Math.cos(this.aimAngle) * (r + 4);
            const wy = sy + Math.sin(this.aimAngle) * (r + 4);
            const wx2 = sx + Math.cos(this.aimAngle) * (r + 4 + wpnLen);
            const wy2 = sy + Math.sin(this.aimAngle) * (r + 4 + wpnLen);

            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx2, wy2);
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.restore();
    }

    isLightColor() {
        const { r, g, b } = hexToRgb(this.data.color);
        return r * 0.299 + g * 0.587 + b * 0.114 > 150;
    }

    // Returns true if there is a solid body (ground/platform/wall) directly beneath this element.
    // Used by the 'float' special so helium only rises when airborne (prevents immediate levitation on spawn).
    isGrounded() {
        return isBodyGrounded(this.engine, this.body, this.data.radius);
    }

    destroy() {
        if (this.body) {
            Matter.Composite.remove(this.engine.world, this.body);
            this.body = null;
        }
        this.alive = false;
    }
}
