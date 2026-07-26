import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let sandbox;

beforeAll(() => {
    sandbox = loadSource('js/sandbox.js');
});

describe('SANDBOX_PRESETS', () => {
    it('includes a structure-backed Fort Siege preset', () => {
        const { SANDBOX_PRESETS } = sandbox;
        const siege = SANDBOX_PRESETS.find((preset) => preset.name === 'Fort Siege');

        expect(siege).toBeTruthy();
        expect(siege.structures.length).toBeGreaterThan(0);
        expect(siege.teams).toHaveLength(2);
        expect(siege.teams.every((team) => team.spawnZone)).toBe(true);
    });

    it('keeps scripted structure placements on known structure keys', () => {
        const { SANDBOX_PRESETS, getPresetStructurePlacements } = sandbox;
        const allowed = ['house', 'fortress', 'tower'];

        for (const preset of SANDBOX_PRESETS) {
            const placements = getPresetStructurePlacements(preset, allowed);
            expect(placements.length).toBe(preset.structures?.length || 0);
        }
    });
});

describe('computePresetSpawnZone', () => {
    it('keeps preset spawning inside the visible arena edges', () => {
        const { computePresetSpawnZone } = sandbox;

        expect(computePresetSpawnZone(600, 800, 1, 80)).toEqual({
            xMin: 680,
            xMax: 1320,
            yMin: 400,
            yMax: 700,
        });
    });

    it('shrinks padding for very narrow viewports', () => {
        const { computePresetSpawnZone } = sandbox;

        expect(computePresetSpawnZone(900, 120, 1, 80)).toMatchObject({
            xMin: 940,
            xMax: 980,
        });
    });
});

describe('resolvePresetSpawnZone', () => {
    it('uses the full sandbox spawn zone by default', () => {
        const { SANDBOX_PRESET_SPAWN_ZONE, resolvePresetSpawnZone } = sandbox;

        expect(resolvePresetSpawnZone()).toEqual(SANDBOX_PRESET_SPAWN_ZONE);
    });

    it('overrides only the bounds specified by a team config', () => {
        const { SANDBOX_PRESET_SPAWN_ZONE, resolvePresetSpawnZone } = sandbox;

        expect(resolvePresetSpawnZone({ spawnZone: { xMin: 100, xMax: 200 } })).toEqual({
            ...SANDBOX_PRESET_SPAWN_ZONE,
            xMin: 100,
            xMax: 200,
        });
    });

    it('resolves horizontal ratio bounds against the provided default zone', () => {
        const { resolvePresetSpawnZone } = sandbox;
        const defaultZone = { xMin: 500, xMax: 1500, yMin: 400, yMax: 700 };

        expect(
            resolvePresetSpawnZone(
                { spawnZone: { xMinRatio: 0.25, xMaxRatio: 0.75, yMin: 350 } },
                defaultZone,
            ),
        ).toEqual({
            xMin: 750,
            xMax: 1250,
            yMin: 350,
            yMax: 700,
        });
    });
});

describe('getPresetStructurePlacements', () => {
    it('filters unknown prefabs and invalid x positions', () => {
        const { getPresetStructurePlacements, SANDBOX_FLOOR_TOP } = sandbox;
        const placements = getPresetStructurePlacements(
            {
                structures: [
                    { prefab: 'house', x: 100 },
                    { prefab: 'nope', x: 200 },
                    { prefab: 'tower', x: Number.POSITIVE_INFINITY },
                    { prefab: 'fortress', x: 300, groundY: 680 },
                ],
            },
            ['house', 'fortress'],
        );

        expect(placements).toEqual([
            { prefab: 'house', x: 100, groundY: SANDBOX_FLOOR_TOP },
            { prefab: 'fortress', x: 300, groundY: 680 },
        ]);
    });

    it('resolves ratio-based structure positions against the layout zone', () => {
        const { getPresetStructurePlacements, SANDBOX_FLOOR_TOP } = sandbox;
        const placements = getPresetStructurePlacements(
            { structures: [{ prefab: 'tower', xRatio: 0.5 }] },
            ['tower'],
            { xMin: 600, xMax: 1400, yMin: 400, yMax: 700 },
        );

        expect(placements).toEqual([{ prefab: 'tower', x: 1000, groundY: SANDBOX_FLOOR_TOP }]);
    });
});

describe('SandboxMode cleanup', () => {
    it('ends an active drag before removing bodies', () => {
        const context = {
            endDrag: vi.fn(),
            entities: [],
            projectiles: [],
            structures: [],
            game: { engine: { world: {} } },
            rebuildStaticBodies: vi.fn(),
            updateEntityCount: vi.fn(),
        };

        sandbox.SandboxMode.prototype.clearAll.call(context);

        expect(context.endDrag).toHaveBeenCalledOnce();
    });
});
