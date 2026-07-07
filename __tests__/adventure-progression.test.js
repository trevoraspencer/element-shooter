import { describe, it, expect, vi, beforeAll } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let adventure;

beforeAll(() => {
    loadSource('js/utils.js');
    globalThis.playSound = vi.fn();
    loadSource('js/elements-data.js');
    loadSource('js/weapons.js');
    adventure = loadSource('js/adventure.js');
});

describe('adventure progress records', () => {
    it('creates one empty level record per adventure level', () => {
        const records = adventure.createDefaultLevelRecords();
        expect(records).toHaveLength(adventure.LEVELS.length);
        expect(records[0]).toEqual({
            completions: 0,
            bestScore: 0,
            bestTime: null,
            bestHealthPct: 0,
            bestMastery: 0,
        });

        records[0].completions = 1;
        expect(records[1].completions).toBe(0);
    });

    it('migrates old saves without records to empty records', () => {
        const progress = adventure.AdventureMode.prototype.normalizeProgress({
            version: 1,
            levels: [true, true],
            elements: ['H', 'Fe'],
            weapons: ['photon'],
        });

        expect(progress.records).toHaveLength(adventure.LEVELS.length);
        expect(progress.records.every((record) => record.completions === 0)).toBe(true);
    });

    it('rejects progress from newer unsupported schemas', () => {
        expect(
            adventure.AdventureMode.prototype.normalizeProgress({
                version: 999,
                levels: [true],
                elements: ['H'],
                weapons: ['photon'],
            }),
        ).toBe(false);
    });

    it('normalizes saved record values and clamps mastery fields', () => {
        const progress = adventure.AdventureMode.prototype.normalizeProgress({
            version: 1,
            levels: [true],
            elements: ['H'],
            weapons: ['photon'],
            records: [
                {
                    completions: 2.9,
                    bestScore: 4500.9,
                    bestTime: 123.4,
                    bestHealthPct: 1.4,
                    bestMastery: 9,
                },
            ],
        });

        expect(progress.records[0]).toEqual({
            completions: 2,
            bestScore: 4500,
            bestTime: 123.4,
            bestHealthPct: 1,
            bestMastery: 3,
        });
        expect(progress.records[1]).toEqual({
            completions: 0,
            bestScore: 0,
            bestTime: null,
            bestHealthPct: 0,
            bestMastery: 0,
        });
    });

    it('builds completion stats from score, elapsed time, and final health', () => {
        const stats = adventure.buildLevelCompletionStats(0, 1234.9, 120.04, {
            health: 75,
            maxHealth: 100,
        });

        expect(stats).toEqual({
            levelIndex: 0,
            score: 1234,
            clearTime: 120,
            healthPct: 0.75,
            mastery: 3,
        });

        const slowLowHealth = adventure.buildLevelCompletionStats(0, 500, 220, {
            health: 10,
            maxHealth: 100,
        });
        expect(slowLowHealth.mastery).toBe(1);
    });

    it('merges a completion into a personal-best record', () => {
        const current = {
            completions: 2,
            bestScore: 5000,
            bestTime: 100,
            bestHealthPct: 0.8,
            bestMastery: 3,
        };
        const merged = adventure.mergeLevelRecord(current, {
            score: 4500,
            clearTime: 90,
            healthPct: 0.4,
            mastery: 2,
        });

        expect(merged.record).toEqual({
            completions: 3,
            bestScore: 5000,
            bestTime: 90,
            bestHealthPct: 0.8,
            bestMastery: 3,
        });
        expect(merged.improvements).toMatchObject({
            firstClear: false,
            score: false,
            time: true,
            health: false,
            mastery: false,
        });
    });

    it('formats level records for the level select menu', () => {
        expect(adventure.formatLevelRecord({ completions: 0 })).toBe('No clears yet');
        expect(
            adventure.formatLevelRecord({
                completions: 1,
                bestScore: 1230,
                bestTime: 95,
                bestHealthPct: 0.6,
                bestMastery: 2,
            }),
        ).toBe('Silver (2/3) | 1:35 | 1230 pts');
    });
});
