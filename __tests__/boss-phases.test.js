import { describe, it, expect, vi, beforeAll } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let adventure;
let elements;

beforeAll(() => {
    loadSource('js/utils.js');
    globalThis.playSound = vi.fn();
    elements = loadSource('js/elements-data.js');
    adventure = loadSource('js/adventure.js');
});

// ─── Phase config data (value-locked to the original phaseX method bodies) ───

describe('boss phase config (LEVELS[*].boss.phase)', () => {
    it('every level has a non-empty phase array of known ops', () => {
        const { LEVELS, PHASE_OPS } = adventure;
        expect(LEVELS).toHaveLength(7);
        for (const level of LEVELS) {
            expect(Array.isArray(level.boss.phase)).toBe(true);
            expect(level.boss.phase.length).toBeGreaterThan(0);
            for (const op of level.boss.phase) {
                expect(Object.keys(PHASE_OPS)).toContain(op.op);
            }
        }
    });

    it('every spawnMinions op references a valid element', () => {
        const { LEVELS } = adventure;
        const validKeys = Object.keys(elements.ELEMENTS);
        for (const level of LEVELS) {
            for (const op of level.boss.phase) {
                if (op.op === 'spawnMinions') {
                    expect(validKeys).toContain(op.el);
                    expect(op.spread).toEqual(
                        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
                    );
                }
            }
        }
    });

    // Each assertion below is read off the original method body so the test fails
    // if any concrete value drifts during the data-driven translation.
    it('level 0 Carbon Colossus — spawn 2-3 C @0.5 health, then dark explosion', () => {
        expect(adventure.LEVELS[0].boss.phase).toEqual([
            {
                op: 'spawnMinions',
                el: 'C',
                count: [2, 3],
                healthMult: 0.5,
                spread: { x: 80, y: 40 },
            },
            { op: 'effect', kind: 'explosion', color: '#444444', count: 15, speed: 200 },
        ]);
    });

    it('level 1 Iron Titan — magnetic pull team a, then explosion + sparks', () => {
        expect(adventure.LEVELS[1].boss.phase).toEqual([
            { op: 'magneticPull', team: 'a', radius: 350, force: 0.004 },
            { op: 'effect', kind: 'explosion', color: '#8888ff', count: 25, speed: 300 },
            { op: 'effect', kind: 'sparks', color: '#8888ff', count: 20 },
        ]);
    });

    it('level 2 Neon Wraith — spawn 3 Ne @10hp, glowPulse(boss), explosion', () => {
        expect(adventure.LEVELS[2].boss.phase).toEqual([
            { op: 'spawnMinions', el: 'Ne', count: 3, healthSet: 10, spread: { x: 120, y: 60 } },
            { op: 'effect', kind: 'glowPulse', color: 'boss', radius: 80 },
            { op: 'effect', kind: 'explosion', color: '#ff88ff', count: 20, speed: 250 },
        ]);
    });

    it('level 3 Uranium Emperor — nuclear, then 3 danger zones', () => {
        expect(adventure.LEVELS[3].boss.phase).toEqual([
            { op: 'effect', kind: 'nuclear' },
            {
                op: 'dangerZones',
                count: 3,
                radius: 80,
                damage: 5,
                duration: 8,
                y: 720,
                color: '#44ff88',
            },
        ]);
    });

    it('level 4 Plutonium Overlord — nuclear, AoE 200/20 excl b, spawn 2 Pu @0.5', () => {
        expect(adventure.LEVELS[4].boss.phase).toEqual([
            { op: 'effect', kind: 'nuclear' },
            { op: 'aoeDamage', radius: 200, damage: 20, excludeTeam: 'b' },
            { op: 'spawnMinions', el: 'Pu', count: 2, healthMult: 0.5, spread: { x: 100, y: 50 } },
        ]);
    });

    it('level 5 Gold Dynamo — phase_shielded 10s, glowPulse, explosion', () => {
        expect(adventure.LEVELS[5].boss.phase).toEqual([
            { op: 'statusBuff', status: 'phase_shielded', duration: 10 },
            { op: 'effect', kind: 'glowPulse', color: '#ffdd44', radius: 80 },
            { op: 'effect', kind: 'explosion', color: '#ffdd44', count: 20, speed: 250 },
        ]);
    });

    it('level 6 Supernova Incarnate — x2 speed/fireRate 10s, explosion(boss)', () => {
        expect(adventure.LEVELS[6].boss.phase).toEqual([
            { op: 'statBuff', speedMult: 2, fireRateMult: 2, duration: 10 },
            { op: 'effect', kind: 'explosion', color: 'boss', count: 30, speed: 400 },
        ]);
    });
});

// ─── Op handler behavior (mocked deps) ───

describe('PHASE_OPS handler behavior', () => {
    function makeCtx(overrides = {}) {
        const ctx = {
            entities: [],
            phaseTimers: [],
            level: { width: 3000 },
            dangerZones: [],
            bossEntity: {
                alive: true,
                data: { speed: 5, color: '#abcdef' },
                fireRateMultiplier: 1,
                body: { position: { x: 0, y: 0 } },
                addStatus: vi.fn(),
            },
            game: { engine: {}, effects: { explosion: vi.fn(), toxicCloud: vi.fn() } },
            setManagedTimeout: vi.fn((fn) => fn),
            ...overrides,
        };
        ctx.getEntityCount = () => ctx.entities.filter((e) => e.alive).length;
        return ctx;
    }

    it('spawnMinions spawns the requested count with scaled health + AI', () => {
        globalThis.ElementEntity = class {
            constructor() {
                this.maxHealth = 100;
                this.health = 100;
                this.alive = true;
            }
        };
        globalThis.AIController = class {
            constructor(ent, ai) {
                this.aiType = ai;
            }
        };
        globalThis.STARTER_WEAPONS = ['photon'];

        const ctx = makeCtx();
        adventure.PHASE_OPS.spawnMinions.call(ctx, {
            op: 'spawnMinions',
            el: 'C',
            count: 3,
            healthMult: 0.5,
            spread: { x: 80, y: 40 },
        });

        expect(ctx.entities).toHaveLength(3);
        for (const ent of ctx.entities) {
            expect(ent.maxHealth).toBe(50); // round(100 * 0.5)
            expect(ent.health).toBe(50);
            expect(ent.weapon).toBe('photon');
            expect(ent.ai.aiType).toBe('aggressive');
        }
    });

    it('spawnMinions healthSet overrides to an absolute value', () => {
        globalThis.ElementEntity = class {
            constructor() {
                this.maxHealth = 100;
                this.alive = true;
            }
        };
        globalThis.AIController = class {};
        globalThis.STARTER_WEAPONS = ['photon'];

        const ctx = makeCtx();
        adventure.PHASE_OPS.spawnMinions.call(ctx, {
            op: 'spawnMinions',
            el: 'Ne',
            count: 2,
            healthSet: 10,
            spread: { x: 1, y: 1 },
        });
        expect(ctx.entities.every((e) => e.maxHealth === 10 && e.health === 10)).toBe(true);
    });

    it('spawnMinions respects MAX_ADVENTURE_ENTITIES cap', () => {
        globalThis.ElementEntity = class {
            constructor() {
                this.maxHealth = 100;
                this.alive = true;
            }
        };
        globalThis.AIController = class {};
        globalThis.STARTER_WEAPONS = ['photon'];

        const cap = adventure.MAX_ADVENTURE_ENTITIES;
        const ctx = makeCtx();
        // Pre-fill to the cap so no minions can spawn.
        ctx.entities = Array.from({ length: cap }, () => ({ alive: true }));
        adventure.PHASE_OPS.spawnMinions.call(ctx, {
            op: 'spawnMinions',
            el: 'C',
            count: 5,
            healthMult: 1,
            spread: { x: 1, y: 1 },
        });
        expect(ctx.entities).toHaveLength(cap); // no new spawns
    });

    it('statusBuff applies the status to the boss', () => {
        const ctx = makeCtx();
        adventure.PHASE_OPS.statusBuff.call(ctx, {
            op: 'statusBuff',
            status: 'phase_shielded',
            duration: 10,
        });
        expect(ctx.bossEntity.addStatus).toHaveBeenCalledWith('phase_shielded', 10);
    });

    it('statBuff multiplies then restores boss speed + fireRate', () => {
        const ctx = makeCtx();
        adventure.PHASE_OPS.statBuff.call(ctx, {
            op: 'statBuff',
            speedMult: 2,
            fireRateMult: 2,
            duration: 10,
        });
        // Buffed immediately.
        expect(ctx.bossEntity.data.speed).toBe(10);
        expect(ctx.bossEntity.fireRateMultiplier).toBe(2);
        expect(ctx.phaseTimers).toHaveLength(1);
        // setManagedTimeout returned the fn; invoke it to simulate the 10s restore.
        ctx.phaseTimers[0]();
        expect(ctx.bossEntity.data.speed).toBe(5);
        expect(ctx.bossEntity.fireRateMultiplier).toBe(1);
    });

    it("effect resolves the 'boss' color sentinel to the boss color", () => {
        const ctx = makeCtx();
        adventure.PHASE_OPS.effect.call(ctx, {
            op: 'effect',
            kind: 'explosion',
            color: 'boss',
            count: 30,
            speed: 400,
        });
        expect(ctx.game.effects.explosion).toHaveBeenCalledWith(0, 0, '#abcdef', 30, 400);
    });

    it('dangerZones pushes count zones and emits a toxic cloud each', () => {
        const ctx = makeCtx();
        adventure.PHASE_OPS.dangerZones.call(ctx, {
            op: 'dangerZones',
            count: 3,
            radius: 80,
            damage: 5,
            duration: 8,
            y: 720,
            color: '#44ff88',
        });
        expect(ctx.dangerZones).toHaveLength(3);
        expect(ctx.game.effects.toxicCloud).toHaveBeenCalledTimes(3);
        for (const z of ctx.dangerZones) {
            expect(z).toMatchObject({
                y: 720,
                radius: 80,
                damage: 5,
                duration: 8,
                age: 0,
                color: '#44ff88',
            });
        }
    });
});
