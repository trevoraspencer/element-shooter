// Particle effects system
class EffectsSystem {
    constructor() {
        this.particles = [];
        this.damageNumbers = [];
        this.trails = [];
        this.maxParticles = 700;
        this.maxDamageNumbers = 80;
        this.maxTrails = 350;
    }

    // Scale particle counts in reduced-motion mode. Returns at least 1 so
    // the player still gets visual feedback, just less of it.
    scaleCount(n) {
        if (!gameSettings.reducedMotion) return n;
        return Math.max(1, Math.round(n * 0.3));
    }

    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 200) * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            p.size *= p.shrink || 0.98;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y -= 40 * dt;
            d.life -= dt;
            d.alpha = Math.max(0, d.life / d.maxLife);
            d.scale = 1 + (1 - d.alpha) * 0.3;
            if (d.life <= 0) this.damageNumbers.splice(i, 1);
        }

        // Update trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= dt;
            t.alpha = Math.max(0, t.life / t.maxLife);
            if (t.life <= 0) this.trails.splice(i, 1);
        }
    }

    render(ctx, camera) {
        // Render particles
        ctx.save();
        for (const p of this.particles) {
            if (!isCircleOnScreen(p.x, p.y, p.size, camera)) continue;
            const screen = camera.worldToScreen(p.x, p.y);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, p.size * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Render trails
        ctx.save();
        for (const t of this.trails) {
            if (!isCircleOnScreen(t.x, t.y, t.size, camera)) continue;
            const screen = camera.worldToScreen(t.x, t.y);
            ctx.globalAlpha = t.alpha * 0.5;
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, t.size * t.alpha * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Render damage numbers
        for (const d of this.damageNumbers) {
            if (!isCircleOnScreen(d.x, d.y, 20, camera)) continue;
            const screen = camera.worldToScreen(d.x, d.y);
            ctx.save();
            ctx.globalAlpha = d.alpha;
            ctx.font = `bold ${Math.round(16 * d.scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = d.color;
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 3;
            ctx.strokeText(d.text, screen.x, screen.y);
            ctx.fillText(d.text, screen.x, screen.y);
            ctx.restore();
        }
    }

    trim(list, max) {
        if (list.length > max) list.splice(0, list.length - max);
    }

    pushParticle(particle) {
        this.particles.push(particle);
        this.trim(this.particles, this.maxParticles);
    }

    pushDamageNumber(number) {
        this.damageNumbers.push(number);
        this.trim(this.damageNumbers, this.maxDamageNumbers);
    }

    pushTrail(trail) {
        this.trails.push(trail);
        this.trim(this.trails, this.maxTrails);
    }

    // Spawn explosion particles
    explosion(x, y, color, count = 20, speed = 300) {
        count = this.scaleCount(count);
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + randRange(-0.3, 0.3);
            const spd = randRange(speed * 0.3, speed);
            this.pushParticle({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                size: randRange(2, 5),
                color,
                life: randRange(0.3, 0.8),
                maxLife: 0.8,
                alpha: 1,
                gravity: 100,
                shrink: 0.96,
            });
        }
    }

    // Sparks on hit
    sparks(x, y, color, count = 8) {
        count = this.scaleCount(count);
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(80, 200);
            this.pushParticle({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                size: randRange(1, 3),
                color,
                life: randRange(0.15, 0.4),
                maxLife: 0.4,
                alpha: 1,
                gravity: 50,
                shrink: 0.95,
            });
        }
    }

    // Damage number popup
    damageNumber(x, y, amount, color = '#ff4444') {
        this.pushDamageNumber({
            x: x + randRange(-10, 10),
            y: y - 20,
            text: `-${Math.round(amount)}`,
            color,
            life: 1.0,
            maxLife: 1.0,
            alpha: 1,
            scale: 1,
        });
    }

    // Heal number popup
    healNumber(x, y, amount) {
        this.pushDamageNumber({
            x: x + randRange(-10, 10),
            y: y - 20,
            text: `+${Math.round(amount)}`,
            color: '#44ff44',
            life: 1.0,
            maxLife: 1.0,
            alpha: 1,
            scale: 1,
        });
    }

    // Score popup
    scorePopup(x, y, amount) {
        this.pushDamageNumber({
            x,
            y: y - 30,
            text: `+${amount}`,
            color: '#ffd700',
            life: 1.5,
            maxLife: 1.5,
            alpha: 1,
            scale: 1,
        });
    }

    // Trail behind projectile
    addTrail(x, y, color, size = 3) {
        this.pushTrail({
            x,
            y,
            color,
            size,
            life: 0.2,
            maxLife: 0.2,
            alpha: 1,
        });
    }

    // Death effect - big explosion
    deathExplosion(x, y, color) {
        this.explosion(x, y, color, 30, 400);
        this.explosion(x, y, '#ffffff', 10, 200);
        triggerScreenShake(8);
    }

    // Nuclear death explosion
    nuclearExplosion(x, y) {
        this.explosion(x, y, '#88ffcc', 50, 600);
        this.explosion(x, y, '#ffffff', 30, 400);
        this.explosion(x, y, '#44ff88', 20, 300);
        triggerScreenShake(20);
        playSound('explode');
    }

    // Electric chain effect
    electricArc(x1, y1, x2, y2, color = '#44ddff') {
        const segments = this.scaleCount(8);
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const nx = lerp(x1, x2, t) + randRange(-10, 10);
            const ny = lerp(y1, y2, t) + randRange(-10, 10);
            this.pushParticle({
                x: nx,
                y: ny,
                vx: randRange(-30, 30),
                vy: randRange(-30, 30),
                size: randRange(1, 3),
                color,
                life: 0.15,
                maxLife: 0.15,
                alpha: 1,
                gravity: 0,
                shrink: 0.9,
            });
        }
    }

    // Toxic cloud
    toxicCloud(x, y, color = '#88ff00') {
        const count = this.scaleCount(8);
        for (let i = 0; i < count; i++) {
            this.pushParticle({
                x: x + randRange(-20, 20),
                y: y + randRange(-20, 20),
                vx: randRange(-20, 20),
                vy: randRange(-40, -10),
                size: randRange(4, 10),
                color,
                life: randRange(0.8, 1.5),
                maxLife: 1.5,
                alpha: 1,
                gravity: -20,
                shrink: 1.01,
            });
        }
    }

    // Glow effect (for neon, radioactive)
    glowPulse(x, y, color, radius = 30) {
        const count = this.scaleCount(3);
        for (let i = 0; i < count; i++) {
            this.pushParticle({
                x: x + randRange(-5, 5),
                y: y + randRange(-5, 5),
                vx: randRange(-10, 10),
                vy: randRange(-15, -5),
                size: randRange(2, radius * 0.3),
                color,
                life: randRange(0.3, 0.6),
                maxLife: 0.6,
                alpha: 0.4,
                gravity: -10,
                shrink: 1.02,
            });
        }
    }

    // Green sparkle burst for health pickup collection
    pickupSparkle(x, y) {
        const count = this.scaleCount(6);
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(40, 120);
            this.pushParticle({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 40,
                size: randRange(2, 4),
                color: '#44ff44',
                life: randRange(0.3, 0.6),
                maxLife: 0.6,
                alpha: 1,
                gravity: -30,
                shrink: 0.95,
            });
        }
    }

    clear() {
        this.particles = [];
        this.damageNumbers = [];
        this.trails = [];
    }
}
