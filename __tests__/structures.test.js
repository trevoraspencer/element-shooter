import { describe, it, expect, vi, beforeAll } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let structures;

beforeAll(() => {
    loadSource('js/utils.js');
    globalThis.playSound = vi.fn();
    structures = loadSource('js/structures.js');
});

const GROUND_Y = 720;
const ORIGIN_X = 1000;

describe('STRUCTURES prefab table', () => {
    it('defines house, fortress, and tower', () => {
        const { STRUCTURES, STRUCTURE_KEYS } = structures;
        expect(STRUCTURE_KEYS).toEqual(expect.arrayContaining(['house', 'fortress', 'tower']));
        expect(Object.keys(STRUCTURES)).toEqual(STRUCTURE_KEYS);
    });

    it('every prefab has a name, icon, and non-empty parts of known roles with positive size/hp', () => {
        const { STRUCTURES } = structures;
        const knownRoles = new Set(['wall', 'roof', 'platform', 'parapet']);
        for (const key of Object.keys(STRUCTURES)) {
            const prefab = STRUCTURES[key];
            expect(typeof prefab.name).toBe('string');
            expect(typeof prefab.icon).toBe('string');
            expect(Array.isArray(prefab.parts)).toBe(true);
            expect(prefab.parts.length).toBeGreaterThan(0);
            for (const part of prefab.parts) {
                expect(knownRoles.has(part.role)).toBe(true);
                expect(part.w).toBeGreaterThan(0);
                expect(part.h).toBeGreaterThan(0);
                expect(part.hp).toBeGreaterThan(0);
            }
        }
    });
});

describe('computeStructureParts', () => {
    it('returns [] for an unknown prefab key', () => {
        expect(structures.computeStructureParts('nope', ORIGIN_X, GROUND_Y)).toEqual([]);
    });

    it('resolves parts into world coordinates anchored on origin/ground', () => {
        const parts = structures.computeStructureParts('house', ORIGIN_X, GROUND_Y);
        expect(parts.length).toBeGreaterThan(0);
        for (const p of parts) {
            // All parts sit at or above the ground line (smaller y = higher up).
            expect(p.cy - p.h / 2).toBeGreaterThanOrEqual(GROUND_Y - 1000);
            expect(p.cy + p.h / 2).toBeLessThanOrEqual(GROUND_Y + 0.001);
            expect(p.maxHp).toBe(p.hp);
        }
    });

    it('places at least one wall whose base rests on the ground line', () => {
        const parts = structures.computeStructureParts('house', ORIGIN_X, GROUND_Y);
        const grounded = parts.filter((p) => Math.abs(p.cy + p.h / 2 - GROUND_Y) < 0.001);
        expect(grounded.length).toBeGreaterThan(0);
    });

    it('shifts horizontally with originX', () => {
        const a = structures.computeStructureParts('tower', 0, GROUND_Y);
        const b = structures.computeStructureParts('tower', 500, GROUND_Y);
        for (let i = 0; i < a.length; i++) {
            expect(b[i].cx - a[i].cx).toBeCloseTo(500);
            expect(b[i].cy).toBeCloseTo(a[i].cy);
        }
    });
});

describe('rectDistance', () => {
    it('is zero for a point inside the rect', () => {
        expect(structures.rectDistance(10, 10, 10, 10, 40, 40)).toBe(0);
    });

    it('measures the gap to the nearest edge for a point outside', () => {
        // point 10px to the left of a 40-wide rect centered at x=100
        expect(structures.rectDistance(70, 50, 100, 50, 40, 40)).toBeCloseTo(10);
    });
});

describe('StructurePart.damage', () => {
    it('reduces hp and stays alive while hp remains', () => {
        const part = new structures.StructurePart({
            role: 'wall',
            cx: 0,
            cy: 0,
            w: 10,
            h: 10,
            hp: 50,
            maxHp: 50,
        });
        expect(part.damage(20)).toBe(false);
        expect(part.hp).toBe(30);
        expect(part.alive).toBe(true);
    });

    it('clamps to zero, dies, and reports destruction when hp runs out', () => {
        const part = new structures.StructurePart({
            role: 'wall',
            cx: 0,
            cy: 0,
            w: 10,
            h: 10,
            hp: 15,
            maxHp: 15,
        });
        expect(part.damage(40)).toBe(true);
        expect(part.hp).toBe(0);
        expect(part.alive).toBe(false);
    });

    it('ignores further damage once destroyed', () => {
        const part = new structures.StructurePart({
            role: 'wall',
            cx: 0,
            cy: 0,
            w: 10,
            h: 10,
            hp: 5,
            maxHp: 5,
        });
        part.damage(10);
        expect(part.damage(10)).toBe(false);
        expect(part.hp).toBe(0);
    });
});

describe('Structure', () => {
    it('leaves a doorway gap at ground level on the entrance side', () => {
        const house = new structures.Structure('house', ORIGIN_X, GROUND_Y);
        // House has a solid left wall and a right-side doorway. Just above the
        // ground, the entrance side must be open while the far side is solid.
        const nearGround = GROUND_Y - 10;
        const leftSolid = house.containsPoint(ORIGIN_X - 73, nearGround);
        const rightOpen = house.containsPoint(ORIGIN_X + 73, nearGround);
        expect(leftSolid).toBe(true);
        expect(rightOpen).toBe(false);
    });

    it('containsPoint is false outside the footprint', () => {
        const house = new structures.Structure('house', ORIGIN_X, GROUND_Y);
        expect(house.containsPoint(ORIGIN_X + 5000, GROUND_Y - 10)).toBe(false);
        expect(house.containsPoint(ORIGIN_X, GROUND_Y + 500)).toBe(false);
    });

    it('isEmpty flips true only once every part is destroyed', () => {
        const house = new structures.Structure('house', ORIGIN_X, GROUND_Y);
        expect(house.isEmpty()).toBe(false);
        for (const part of house.parts) part.damage(part.maxHp);
        expect(house.isEmpty()).toBe(true);
    });

    it('containsPoint ignores destroyed parts', () => {
        const house = new structures.Structure('house', ORIGIN_X, GROUND_Y);
        // Pick the left wall (covers a point near the ground on the left).
        const nearGround = GROUND_Y - 10;
        expect(house.containsPoint(ORIGIN_X - 73, nearGround)).toBe(true);
        for (const part of house.parts) {
            if (part.containsPoint(ORIGIN_X - 73, nearGround)) part.damage(part.maxHp);
        }
        expect(house.containsPoint(ORIGIN_X - 73, nearGround)).toBe(false);
    });
});

describe('damageStructuresInRadius', () => {
    it('damages parts within the blast and spares those outside', () => {
        const house = new structures.Structure('house', ORIGIN_X, GROUND_Y);
        const target = house.parts[0];
        const before = target.hp;
        // Blast centered on the target part; small radius so only it is hit.
        structures.damageStructuresInRadius([house], target.cx, target.cy, 30, 40, null, null);
        expect(target.hp).toBeLessThan(before);

        // A second, far-away blast changes nothing.
        const snapshot = house.parts.map((p) => p.hp);
        structures.damageStructuresInRadius([house], ORIGIN_X + 9000, GROUND_Y, 30, 40, null, null);
        expect(house.parts.map((p) => p.hp)).toEqual(snapshot);
    });

    it('applies falloff — a direct hit hurts more than a glancing one', () => {
        const make = () => new structures.Structure('fortress', ORIGIN_X, GROUND_Y);
        const direct = make();
        const glancing = make();
        const t1 = direct.parts[0];
        const t2 = glancing.parts[0];
        const radius = 200;
        structures.damageStructuresInRadius([direct], t1.cx, t1.cy, radius, 60, null, null);
        // Hit from near the edge of the radius (just inside) — much weaker.
        structures.damageStructuresInRadius(
            [glancing],
            t2.cx + (radius - 5),
            t2.cy,
            radius,
            60,
            null,
            null,
        );
        const directLoss = t1.maxHp - t1.hp;
        const glancingLoss = t2.maxHp - t2.hp;
        expect(directLoss).toBeGreaterThan(glancingLoss);
        expect(glancingLoss).toBeGreaterThan(0);
    });

    it('destroys parts whose hp is exhausted by the blast', () => {
        const tower = new structures.Structure('tower', ORIGIN_X, GROUND_Y);
        const target = tower.parts[0];
        structures.damageStructuresInRadius(
            [tower],
            target.cx,
            target.cy,
            40,
            target.maxHp + 100,
            null,
            null,
        );
        expect(target.alive).toBe(false);
    });

    it('tolerates an empty list and fully destroyed structures', () => {
        expect(() =>
            structures.damageStructuresInRadius([], 0, 0, 100, 50, null, null),
        ).not.toThrow();
        const house = new structures.Structure('house', ORIGIN_X, GROUND_Y);
        for (const part of house.parts) part.damage(part.maxHp);
        expect(() =>
            structures.damageStructuresInRadius([house], ORIGIN_X, GROUND_Y, 500, 50, null, null),
        ).not.toThrow();
    });
});
