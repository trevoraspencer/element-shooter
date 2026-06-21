// Creator-mode structures: placeable, destructible buildings for sandbox mode.
//
// A structure is a side-view cutaway built from axis-aligned static rectangles
// ("parts"): walls/roofs/platforms with a ground-level doorway gap (the absence
// of a wall part near the ground). Parts have health and break off individually
// when destroyed, leaving a real gap. The geometry/damage logic here is pure
// (no Matter.js) so it can be unit-tested; Matter bodies are created lazily in
// addToWorld().

// Per-prefab part specs are relative: dx = horizontal center offset from the
// structure anchor, top = how far the part's TOP edge sits above the ground
// line, w/h = size, hp = part health. A wall with h < top leaves a gap beneath
// it (the doorway/gateway).
const STRUCTURES = {
    house: {
        name: 'House',
        icon: '🏠',
        parts: [
            { role: 'wall', dx: -73, top: 120, w: 14, h: 120, hp: 50 },
            { role: 'wall', dx: 73, top: 120, w: 14, h: 55, hp: 50 }, // doorway gap below
            { role: 'roof', dx: 0, top: 136, w: 170, h: 16, hp: 70 },
        ],
    },
    fortress: {
        name: 'Fortress',
        icon: '🏰',
        parts: [
            { role: 'wall', dx: -110, top: 160, w: 22, h: 80, hp: 120 }, // gateway gap below
            { role: 'wall', dx: 110, top: 160, w: 22, h: 160, hp: 120 },
            { role: 'parapet', dx: 0, top: 178, w: 250, h: 18, hp: 100 },
            { role: 'platform', dx: 0, top: 95, w: 120, h: 14, hp: 60 }, // interior rampart
        ],
    },
    tower: {
        name: 'Tower',
        icon: '🗼',
        parts: [
            { role: 'wall', dx: -27, top: 230, w: 16, h: 170, hp: 80 }, // doorway gap at base
            { role: 'wall', dx: 27, top: 230, w: 16, h: 230, hp: 80 },
            { role: 'platform', dx: 0, top: 244, w: 80, h: 14, hp: 80 }, // top perch
        ],
    },
};

const STRUCTURE_KEYS = Object.keys(STRUCTURES);

const STRUCTURE_COLORS = {
    wall: '#3a4566',
    roof: '#7a4a3a',
    parapet: '#454f73',
    platform: '#ffc400',
};

// Distance from a point to the nearest point of an axis-aligned rectangle
// (0 when the point is inside). Used for explosion falloff against big parts.
function rectDistance(px, py, cx, cy, w, h) {
    const dx = Math.max(Math.abs(px - cx) - w / 2, 0);
    const dy = Math.max(Math.abs(py - cy) - h / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
}

// Resolve a prefab's relative part specs into world-space parts anchored at
// (originX, groundY). Returns [] for an unknown key.
function computeStructureParts(prefabKey, originX, groundY) {
    const prefab = STRUCTURES[prefabKey];
    if (!prefab) return [];
    return prefab.parts.map((spec) => ({
        role: spec.role,
        cx: originX + spec.dx,
        cy: groundY - spec.top + spec.h / 2,
        w: spec.w,
        h: spec.h,
        hp: spec.hp,
        maxHp: spec.hp,
    }));
}

class StructurePart {
    constructor(spec) {
        this.role = spec.role;
        this.cx = spec.cx;
        this.cy = spec.cy;
        this.w = spec.w;
        this.h = spec.h;
        this.hp = spec.hp;
        this.maxHp = spec.maxHp ?? spec.hp;
        this.alive = true;
        this.body = null;
    }

    // Lower hp; returns true on the transition to destroyed.
    damage(amount) {
        if (!this.alive) return false;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true;
        }
        return false;
    }

    containsPoint(x, y) {
        return (
            x >= this.cx - this.w / 2 &&
            x <= this.cx + this.w / 2 &&
            y >= this.cy - this.h / 2 &&
            y <= this.cy + this.h / 2
        );
    }
}

class Structure {
    constructor(prefabKey, originX, groundY) {
        this.key = prefabKey;
        this.originX = originX;
        this.groundY = groundY;
        this.parts = computeStructureParts(prefabKey, originX, groundY).map(
            (spec) => new StructurePart(spec),
        );
    }

    addToWorld(world) {
        for (const part of this.parts) {
            if (!part.alive) continue;
            const category = part.role === 'wall' ? CAT.WALL : CAT.PLATFORM;
            const body = Matter.Bodies.rectangle(part.cx, part.cy, part.w, part.h, {
                isStatic: true,
                collisionFilter: {
                    category,
                    mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
                },
                label: 'structure',
            });
            body.structurePart = part;
            body.structure = this;
            part.body = body;
            Matter.Composite.add(world, body);
        }
    }

    removeFromWorld(world) {
        for (const part of this.parts) {
            if (part.body) {
                Matter.Composite.remove(world, part.body);
                part.body = null;
            }
        }
    }

    partBodies() {
        return this.parts.filter((p) => p.body).map((p) => p.body);
    }

    containsPoint(x, y) {
        return this.parts.some((p) => p.alive && p.containsPoint(x, y));
    }

    // Apply damage to a single part; remove its body + spawn debris if it dies.
    damagePart(part, amount, world, effects) {
        if (!part || !part.alive) return;
        if (part.damage(amount)) this.onPartDestroyed(part, world, effects);
    }

    onPartDestroyed(part, world, effects) {
        if (part.body && world) {
            Matter.Composite.remove(world, part.body);
            part.body = null;
        }
        if (effects) effects.sparks(part.cx, part.cy, '#9a8a6a', 16);
        playSound('hit');
    }

    isEmpty() {
        return this.parts.every((p) => !p.alive);
    }

    render(ctx, camera) {
        for (const part of this.parts) {
            if (!part.alive) continue;
            drawStructurePart(ctx, camera, part, 1);
        }
    }
}

// The structures the active sandbox owns — empty unless creator-mode sandbox is
// running. Lets explosion sites breach structures without branching inline.
function activeSandboxStructures() {
    return window.game?.sandbox?.active ? window.game.sandbox.structures : [];
}

// Apply explosion falloff damage to every live part of every structure within
// `radius` of (cx, cy). `world`/`effects` are optional so callers without a
// physics world (e.g. tests) still mutate health correctly.
function damageStructuresInRadius(structures, cx, cy, radius, damage, effects, world) {
    if (!structures || !structures.length) return;
    for (const structure of structures) {
        if (!structure) continue;
        for (const part of structure.parts) {
            if (!part.alive) continue;
            const d = rectDistance(cx, cy, part.cx, part.cy, part.w, part.h);
            if (d >= radius) continue;
            const falloff = 1 - d / radius;
            structure.damagePart(part, damage * falloff, world, effects);
        }
    }
}

// ─── Rendering (runtime only; not exercised by unit tests) ───

function drawStructurePart(ctx, camera, part, alpha) {
    const s = camera.worldToScreen(part.cx - part.w / 2, part.cy - part.h / 2);
    const w = part.w * camera.zoom;
    const h = part.h * camera.zoom;
    const base = STRUCTURE_COLORS[part.role] || '#3a4566';
    const standable = part.role !== 'wall';

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = base;
    ctx.fillRect(s.x, s.y, w, h);

    // Platform-style top highlight / bottom shadow for standable surfaces.
    if (standable) {
        const edge = Math.max(2, h * 0.25);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(s.x, s.y, w, edge);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(s.x, s.y + h - edge, w, edge);
    }

    // Decoration: a peaked cap over roofs, battlement merlons over parapets.
    if (part.role === 'roof') {
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.moveTo(s.x - w * 0.04, s.y);
        ctx.lineTo(s.x + w / 2, s.y - h * 1.6);
        ctx.lineTo(s.x + w + w * 0.04, s.y);
        ctx.closePath();
        ctx.fill();
    } else if (part.role === 'parapet') {
        ctx.fillStyle = base;
        const merlon = w / 9;
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(s.x + i * 2 * merlon, s.y - merlon, merlon, merlon);
        }
    }

    // Damage state: darken + crack as health drops.
    const frac = part.maxHp > 0 ? clamp(part.hp / part.maxHp, 0, 1) : 1;
    if (frac < 1) {
        ctx.fillStyle = `rgba(0,0,0,${(1 - frac) * 0.5})`;
        ctx.fillRect(s.x, s.y, w, h);
        drawCracks(ctx, s.x, s.y, w, h, frac);
    }

    ctx.strokeStyle = 'rgba(10,10,22,0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, w, h);

    ctx.restore();
}

function drawCracks(ctx, x, y, w, h, frac) {
    ctx.strokeStyle = 'rgba(8,8,16,0.8)';
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.38, y + h * 0.5);
    ctx.lineTo(x + w * 0.62, y + h);
    if (frac < 0.34) {
        ctx.moveTo(x + w * 0.2, y + h * 0.2);
        ctx.lineTo(x + w * 0.55, y + h * 0.65);
    }
    ctx.stroke();
}

// Translucent preview of a prefab placed at the cursor (place tool).
function renderStructureGhost(ctx, camera, prefabKey, originX, groundY) {
    const parts = computeStructureParts(prefabKey, originX, groundY);
    for (const part of parts) {
        drawStructurePart(ctx, camera, part, 0.4);
    }
}
