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
