import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let effectsModule;

beforeAll(() => {
    loadSource('js/utils.js');
    effectsModule = loadSource('js/effects.js');
});

beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('EffectsSystem combat text', () => {
    it('creates configurable floating text without jitter when requested', () => {
        const effects = new effectsModule.EffectsSystem();
        effects.floatingText(10, 20, 'EFFECTIVE', '#ffd166', {
            randomX: false,
            yOffset: -40,
            scale: 1.2,
            fontSize: 11,
            life: 0.6,
            riseSpeed: 24,
        });

        expect(effects.damageNumbers).toEqual([
            expect.objectContaining({
                x: 10,
                y: -20,
                text: 'EFFECTIVE',
                color: '#ffd166',
                life: 0.6,
                maxLife: 0.6,
                baseScale: 1.2,
                fontSize: 11,
                riseSpeed: 24,
            }),
        ]);
    });

    it('damageNumber supports suffixes and initial scale metadata', () => {
        const effects = new effectsModule.EffectsSystem();
        effects.damageNumber(0, 0, 12.5, '#ffd166', {
            suffix: '!',
            scale: 1.15,
        });

        expect(effects.damageNumbers[0]).toEqual(
            expect.objectContaining({
                text: '-13!',
                color: '#ffd166',
                baseScale: 1.15,
            }),
        );
    });

    it('updates combat text using per-number rise speed and scale growth', () => {
        const effects = new effectsModule.EffectsSystem();
        effects.floatingText(0, 0, 'RESIST', '#8ecae6', {
            randomX: false,
            riseSpeed: 20,
            scale: 0.9,
            scaleGrowth: 0.2,
        });

        effects.update(0.5);

        expect(effects.damageNumbers[0]).toEqual(
            expect.objectContaining({
                y: -30,
                alpha: 0.5,
                scale: 1,
            }),
        );
    });
});

describe('EffectsSystem particle integration', () => {
    function makeParticle(overrides = {}) {
        return {
            x: 0,
            y: 0,
            vx: 0,
            vy: 10,
            size: 10,
            color: '#fff',
            life: 2,
            maxLife: 2,
            alpha: 1,
            shrink: 0.96,
            ...overrides,
        };
    }

    it('honors an explicit zero-gravity particle', () => {
        const effects = new effectsModule.EffectsSystem();
        const particle = makeParticle({ gravity: 0 });
        effects.pushParticle(particle);

        effects.update(1 / 60);

        expect(particle.vy).toBe(10);
    });

    it('shrinks particles consistently across different frame deltas', () => {
        const oneFrame = new effectsModule.EffectsSystem();
        const twoFrames = new effectsModule.EffectsSystem();
        const coarse = makeParticle({ gravity: 0 });
        const fine = makeParticle({ gravity: 0 });
        oneFrame.pushParticle(coarse);
        twoFrames.pushParticle(fine);

        oneFrame.update(1 / 30);
        twoFrames.update(1 / 60);
        twoFrames.update(1 / 60);

        expect(coarse.size).toBeCloseTo(fine.size);
    });
});
