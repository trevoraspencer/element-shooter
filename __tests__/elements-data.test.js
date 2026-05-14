import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let elements;

beforeAll(() => {
    // Load utils.js first so playSound is on globalThis
    loadSource('js/utils.js');
    // Mock playSound to avoid AudioContext issues in resolveElementDamage
    globalThis.playSound = vi.fn();
    elements = loadSource('js/elements-data.js');
});

beforeEach(() => {
    vi.clearAllMocks();
});

// Helper: create a minimal defender mock
function createDefender(overrides = {}) {
    return {
        alive: true,
        invulnTimer: 0,
        health: overrides.health ?? 100,
        flashTimer: 0,
        data: overrides.data ?? { special: 'none' },
        statuses: overrides.statuses ?? new Map(),
        addStatus: vi.fn(),
        die: vi.fn(),
        body: { position: { x: 0, y: 0 } },
        entitiesContext: null,
        ...overrides,
    };
}

function createEffects() {
    return {
        damageNumber: vi.fn(),
        sparks: vi.fn(),
    };
}

// ─── ELEMENTS object structure ─────────────────────────────────────────

describe('ELEMENTS', () => {
    it('has the correct number of elements', () => {
        expect(Object.keys(elements.ELEMENTS)).toHaveLength(46);
    });

    it('includes all starter elements', () => {
        for (const key of elements.STARTER_ELEMENTS) {
            expect(elements.ELEMENTS[key]).toBeDefined();
        }
    });

    it('every element has all required properties', () => {
        const required = [
            'symbol',
            'name',
            'atomicNum',
            'color',
            'mass',
            'speed',
            'health',
            'damage',
            'radius',
            'special',
            'desc',
        ];
        for (const [key, el] of Object.entries(elements.ELEMENTS)) {
            for (const prop of required) {
                expect(el[prop], `ELEMENTS.${key}.${prop} is missing`).toBeDefined();
            }
        }
    });

    it('every element symbol matches its key', () => {
        for (const [key, el] of Object.entries(elements.ELEMENTS)) {
            expect(el.symbol).toBe(key);
        }
    });

    it('Hydrogen (H) has expected stats', () => {
        const h = elements.ELEMENTS.H;
        expect(h.atomicNum).toBe(1);
        expect(h.mass).toBe(1);
        expect(h.speed).toBe(8);
        expect(h.health).toBe(40);
        expect(h.damage).toBe(5);
        expect(h.special).toBe('explosive');
    });

    it('Iron (Fe) has expected stats', () => {
        const fe = elements.ELEMENTS.Fe;
        expect(fe.atomicNum).toBe(26);
        expect(fe.mass).toBe(26);
        expect(fe.special).toBe('magnetic');
    });

    it('Plutonium (Pu) has the nuclear special', () => {
        const pu = elements.ELEMENTS.Pu;
        expect(pu.special).toBe('nuclear');
        expect(pu.damage).toBe(30);
    });

    it('Lead (Pb) has the heavy special', () => {
        const pb = elements.ELEMENTS.Pb;
        expect(pb.special).toBe('heavy');
        expect(pb.health).toBe(160);
    });

    it('Gold (Au) has the rich special', () => {
        const au = elements.ELEMENTS.Au;
        expect(au.special).toBe('rich');
        expect(au.health).toBe(140);
    });

    it('colors are valid hex strings', () => {
        for (const [key, el] of Object.entries(elements.ELEMENTS)) {
            expect(el.color, `ELEMENTS.${key}.color`).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });

    it('atomic numbers are unique', () => {
        const nums = Object.values(elements.ELEMENTS).map((e) => e.atomicNum);
        expect(new Set(nums).size).toBe(nums.length);
    });

    it('atomic numbers are unique positive integers', () => {
        const nums = Object.values(elements.ELEMENTS).map((e) => e.atomicNum);
        for (const n of nums) {
            expect(n).toBeGreaterThan(0);
            expect(Number.isInteger(n)).toBe(true);
        }
        expect(new Set(nums).size).toBe(nums.length);
    });
});

// ─── STARTER_ELEMENTS ──────────────────────────────────────────────────

describe('STARTER_ELEMENTS', () => {
    it('contains exactly 5 elements', () => {
        expect(elements.STARTER_ELEMENTS).toHaveLength(5);
    });

    it('contains H, He, C, O, Fe', () => {
        expect(elements.STARTER_ELEMENTS).toEqual(['H', 'He', 'C', 'O', 'Fe']);
    });
});

// ─── ALL_ELEMENT_KEYS ──────────────────────────────────────────────────

describe('ALL_ELEMENT_KEYS', () => {
    it('matches Object.keys(ELEMENTS)', () => {
        expect(elements.ALL_ELEMENT_KEYS).toEqual(Object.keys(elements.ELEMENTS));
    });

    it('has 46 entries', () => {
        expect(elements.ALL_ELEMENT_KEYS).toHaveLength(46);
    });
});

// ─── getElementsSorted ─────────────────────────────────────────────────

describe('getElementsSorted', () => {
    it('returns keys sorted by atomic number', () => {
        const sorted = elements.getElementsSorted();
        for (let i = 1; i < sorted.length; i++) {
            const prev = elements.ELEMENTS[sorted[i - 1]].atomicNum;
            const curr = elements.ELEMENTS[sorted[i]].atomicNum;
            expect(curr).toBeGreaterThanOrEqual(prev);
        }
    });

    it('has the same length as ALL_ELEMENT_KEYS', () => {
        expect(elements.getElementsSorted()).toHaveLength(elements.ALL_ELEMENT_KEYS.length);
    });

    it('starts with Hydrogen', () => {
        expect(elements.getElementsSorted()[0]).toBe('H');
    });
});

// ─── getSpecialConfig ──────────────────────────────────────────────────

describe('getSpecialConfig', () => {
    it('returns SPECIALS.none for unknown special', () => {
        const config = elements.getSpecialConfig('nonexistent');
        expect(config).toEqual(elements.SPECIALS.none);
    });

    it('returns SPECIALS.none for "none" special', () => {
        const config = elements.getSpecialConfig('none');
        expect(config).toEqual({});
    });

    it('returns armor config with damageTakenMultiplier 0.7', () => {
        const config = elements.getSpecialConfig('armor');
        expect(config.damageTakenMultiplier).toBe(0.7);
    });

    it('returns heavy config with damageTakenMultiplier 0.8', () => {
        const config = elements.getSpecialConfig('heavy');
        expect(config.damageTakenMultiplier).toBe(0.8);
    });

    it('returns shield config with damageTakenMultiplier 0.75', () => {
        const config = elements.getSpecialConfig('shield');
        expect(config.damageTakenMultiplier).toBe(0.75);
    });

    it('returns reflect config with reflectChance 0.3', () => {
        const config = elements.getSpecialConfig('reflect');
        expect(config.reflectChance).toBe(0.3);
    });

    it('returns rich config with scoreBonus 100', () => {
        const config = elements.getSpecialConfig('rich');
        expect(config.scoreBonus).toBe(100);
    });

    it('returns nuclear config with death radius 200', () => {
        const config = elements.getSpecialConfig('nuclear');
        expect(config.death.radius).toBe(200);
        expect(config.death.damage).toBe(50);
        expect(config.death.nuclear).toBe(true);
    });

    it('returns magnetic config with radius and force', () => {
        const config = elements.getSpecialConfig('magnetic');
        expect(config.magnetic.radius).toBe(120);
        expect(config.magnetic.force).toBe(0.0005);
    });
});

// ─── getEffectivenessMultiplier ────────────────────────────────────────

describe('getEffectivenessMultiplier', () => {
    it('returns 1 for neutral matchup (no special)', () => {
        expect(elements.getEffectivenessMultiplier('none', 'none')).toBe(1);
    });

    it('returns 1 for unknown attacker special', () => {
        expect(elements.getEffectivenessMultiplier('nonexistent', 'armor')).toBe(1);
    });

    it('returns 1 for unknown defender special', () => {
        expect(elements.getEffectivenessMultiplier('corrosive', 'nonexistent')).toBe(1);
    });

    it('corrosive vs armor is 1.2', () => {
        expect(elements.getEffectivenessMultiplier('corrosive', 'armor')).toBe(1.2);
    });

    it('corrosive vs shield is 1.15', () => {
        expect(elements.getEffectivenessMultiplier('corrosive', 'shield')).toBe(1.15);
    });

    it('burn vs freeze is 1.15', () => {
        expect(elements.getEffectivenessMultiplier('burn', 'freeze')).toBe(1.15);
    });

    it('burn vs reactive is 1.25', () => {
        expect(elements.getEffectivenessMultiplier('burn', 'reactive')).toBe(1.25);
    });

    it('burn vs float is 1.2', () => {
        expect(elements.getEffectivenessMultiplier('burn', 'float')).toBe(1.2);
    });

    it('freeze vs burn is 1.15', () => {
        expect(elements.getEffectivenessMultiplier('freeze', 'burn')).toBe(1.15);
    });

    it('electric vs magnetic is 1.2', () => {
        expect(elements.getEffectivenessMultiplier('electric', 'magnetic')).toBe(1.2);
    });

    it('electric vs shield is 1.15', () => {
        expect(elements.getEffectivenessMultiplier('electric', 'shield')).toBe(1.15);
    });

    it('oxidize vs reactive is 1.2', () => {
        expect(elements.getEffectivenessMultiplier('oxidize', 'reactive')).toBe(1.2);
    });

    it('accepts object with special property for attacker', () => {
        expect(
            elements.getEffectivenessMultiplier({ special: 'corrosive' }, { special: 'armor' }),
        ).toBe(1.2);
    });
});

// ─── resolveElementDamage ──────────────────────────────────────────────

describe('resolveElementDamage', () => {
    it('applies base damage with no modifiers', () => {
        const defender = createDefender();
        const effects = createEffects();
        const damage = elements.resolveElementDamage(defender, 10, effects);
        expect(damage).toBe(10);
        expect(defender.health).toBe(90);
    });

    it('returns 0 and does nothing if defender is null', () => {
        const damage = elements.resolveElementDamage(null, 10, createEffects());
        expect(damage).toBe(0);
    });

    it('returns 0 if defender is not alive', () => {
        const defender = createDefender({ alive: false });
        const damage = elements.resolveElementDamage(defender, 10, createEffects());
        expect(damage).toBe(0);
        expect(defender.health).toBe(100);
    });

    it('returns 0 if defender is invulnerable (invulnTimer > 0)', () => {
        const defender = createDefender({ invulnTimer: 1 });
        const damage = elements.resolveElementDamage(defender, 10, createEffects());
        expect(damage).toBe(0);
        expect(defender.health).toBe(100);
    });

    it('applies attacker effectiveness multiplier (corrosive vs armor)', () => {
        const defender = createDefender({ data: { special: 'armor' } });
        const effects = createEffects();
        const damage = elements.resolveElementDamage(defender, 10, effects, null, null, {
            attackerSpecial: 'corrosive',
        });
        // corrosive vs armor = 1.2 multiplier
        // armor damageTakenMultiplier = 0.7
        // total: 10 * 1.2 * 0.7 = 8.4
        expect(damage).toBeCloseTo(8.4);
        expect(defender.health).toBeCloseTo(91.6);
    });

    it('applies defender damageTakenMultiplier for armor (0.7)', () => {
        const defender = createDefender({ data: { special: 'armor' } });
        const effects = createEffects();
        const damage = elements.resolveElementDamage(defender, 20, effects);
        // No attacker special → multiplier = 1.0, armor reduces by 0.7
        // 20 * 1.0 * 0.7 = 14
        expect(damage).toBe(14);
        expect(defender.health).toBe(86);
    });

    it('applies defender damageTakenMultiplier for shield (0.75)', () => {
        const defender = createDefender({ data: { special: 'shield' } });
        const damage = elements.resolveElementDamage(defender, 20, createEffects());
        expect(damage).toBe(15);
    });

    it('applies defender damageTakenMultiplier for heavy (0.8)', () => {
        const defender = createDefender({ data: { special: 'heavy' } });
        const damage = elements.resolveElementDamage(defender, 20, createEffects());
        expect(damage).toBe(16);
    });

    it('applies status effect takenMul for shocked (1.2)', () => {
        const statuses = new Map([['shocked', { remaining: 1 }]]);
        const defender = createDefender({ statuses });
        const damage = elements.resolveElementDamage(defender, 10, createEffects());
        // 10 * 1.0 * 1.2 = 12
        expect(damage).toBe(12);
    });

    it('applies status effect takenMul for corroded (1.15)', () => {
        const statuses = new Map([['corroded', { remaining: 1 }]]);
        const defender = createDefender({ statuses });
        const damage = elements.resolveElementDamage(defender, 10, createEffects());
        // 10 * 1.0 * 1.15 = 11.5
        expect(damage).toBeCloseTo(11.5);
    });

    it('stacks multiple status takenMul effects', () => {
        const statuses = new Map([
            ['shocked', { remaining: 1 }],
            ['corroded', { remaining: 1 }],
        ]);
        const defender = createDefender({ statuses });
        const damage = elements.resolveElementDamage(defender, 10, createEffects());
        // 10 * 1.0 * 1.2 * 1.15 = 13.8
        expect(damage).toBeCloseTo(13.8);
    });

    it('combines effectiveness multiplier, damageTakenMultiplier, and status effects', () => {
        const statuses = new Map([['shocked', { remaining: 1 }]]);
        const defender = createDefender({
            data: { special: 'armor' },
            statuses,
        });
        const effects = createEffects();
        const damage = elements.resolveElementDamage(defender, 50, effects, null, null, {
            attackerSpecial: 'corrosive',
        });
        // 50 * 1.2 (corrosive vs armor) * 0.7 (armor) * 1.2 (shocked) = 50.4
        expect(damage).toBeCloseTo(50.4);
    });

    it('sets flashTimer to 0.15', () => {
        const defender = createDefender();
        elements.resolveElementDamage(defender, 5, createEffects());
        expect(defender.flashTimer).toBe(0.15);
    });

    it('calls effects.damageNumber with position and resolved damage', () => {
        const defender = createDefender();
        const effects = createEffects();
        elements.resolveElementDamage(defender, 10, effects);
        expect(effects.damageNumber).toHaveBeenCalledWith(0, 0, 10);
    });

    it('calls effects.sparks with position and color', () => {
        const defender = createDefender({ data: { special: 'none', color: '#ff0000' } });
        const effects = createEffects();
        elements.resolveElementDamage(defender, 5, effects);
        expect(effects.sparks).toHaveBeenCalledWith(0, 0, '#ff0000');
    });

    it('calls defender.die when health drops to 0 or below', () => {
        const defender = createDefender({ health: 5 });
        elements.resolveElementDamage(defender, 10, createEffects());
        expect(defender.die).toHaveBeenCalledTimes(1);
    });

    it('does not call die when health remains above 0', () => {
        const defender = createDefender({ health: 100 });
        elements.resolveElementDamage(defender, 10, createEffects());
        expect(defender.die).not.toHaveBeenCalled();
    });

    it('calls addStatus when options.status is provided', () => {
        const defender = createDefender();
        elements.resolveElementDamage(defender, 10, createEffects(), null, null, {
            status: 'burning',
            statusDuration: 2,
        });
        expect(defender.addStatus).toHaveBeenCalledWith('burning', 2, null);
    });

    it('works with null effects (no damage number or sparks)', () => {
        const defender = createDefender();
        const damage = elements.resolveElementDamage(defender, 10, null);
        expect(damage).toBe(10);
        expect(defender.health).toBe(90);
    });
});

// ─── LEVEL_UNLOCKS ─────────────────────────────────────────────────────

describe('LEVEL_UNLOCKS', () => {
    it('has unlocks for levels 1 through 5', () => {
        expect(Object.keys(elements.LEVEL_UNLOCKS)).toHaveLength(5);
        for (let i = 1; i <= 5; i++) {
            expect(elements.LEVEL_UNLOCKS[i]).toBeDefined();
        }
    });

    it('every unlocked element key exists in ELEMENTS', () => {
        for (const [, unlocks] of Object.entries(elements.LEVEL_UNLOCKS)) {
            for (const key of unlocks) {
                expect(
                    elements.ELEMENTS[key],
                    `Level unlock "${key}" not in ELEMENTS`,
                ).toBeDefined();
            }
        }
    });

    it('total unlocks plus starters equals 46', () => {
        const allUnlocked = new Set(elements.STARTER_ELEMENTS);
        for (const unlocks of Object.values(elements.LEVEL_UNLOCKS)) {
            for (const key of unlocks) {
                allUnlocked.add(key);
            }
        }
        expect(allUnlocked.size).toBe(46);
    });
});

// ─── SPECIALS ──────────────────────────────────────────────────────────

describe('SPECIALS', () => {
    it('has an entry for every special type used in ELEMENTS', () => {
        const usedSpecials = new Set(Object.values(elements.ELEMENTS).map((e) => e.special));
        for (const special of usedSpecials) {
            expect(elements.SPECIALS[special], `SPECIALS.${special} is missing`).toBeDefined();
        }
    });

    it('explosive special has death radius 100 and damage 30', () => {
        expect(elements.SPECIALS.explosive.death.radius).toBe(100);
        expect(elements.SPECIALS.explosive.death.damage).toBe(30);
    });

    it('float special reduces frictionAir to 0.09', () => {
        expect(elements.SPECIALS.float.frictionAir).toBe(0.09);
    });
});

// ─── STATUS_EFFECTS ────────────────────────────────────────────────────

describe('STATUS_EFFECTS', () => {
    it('burning has dot of 4', () => {
        expect(elements.STATUS_EFFECTS.burning.dot).toBe(4);
    });

    it('frozen has velocityMul of 0.4', () => {
        expect(elements.STATUS_EFFECTS.frozen.velocityMul).toBe(0.4);
    });

    it('corroded has takenMul of 1.15', () => {
        expect(elements.STATUS_EFFECTS.corroded.takenMul).toBe(1.15);
    });

    it('shocked has takenMul of 1.2', () => {
        expect(elements.STATUS_EFFECTS.shocked.takenMul).toBe(1.2);
    });

    it('every status effect has a color', () => {
        for (const [key, cfg] of Object.entries(elements.STATUS_EFFECTS)) {
            expect(cfg.color, `STATUS_EFFECTS.${key}.color`).toBeDefined();
        }
    });
});
