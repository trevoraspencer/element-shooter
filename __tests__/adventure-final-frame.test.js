import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let AdventureMode;

beforeAll(() => {
    loadSource('js/utils.js');
    globalThis.playSound = vi.fn();
    loadSource('js/elements-data.js');
    loadSource('js/weapons.js');
    ({ AdventureMode } = loadSource('js/adventure.js'));
});

function makeFinalFrame({ playerAlive }) {
    const playerEntity = {
        alive: playerAlive,
        body: { position: { x: 0, y: 0 } },
        health: playerAlive ? 100 : 0,
        maxHealth: 100,
    };
    const player = {
        entity: playerEntity,
        score: 100,
        update: vi.fn(),
        addScore(amount) {
            this.score += amount;
        },
    };
    const boss = {
        alive: false,
        body: { position: { x: 10, y: 20 } },
        data: { atomicNum: 6 },
        isBoss: true,
        isPlayer: false,
        special: { scoreBonus: 25 },
        team: 'b',
        update: vi.fn(),
    };

    const mode = {
        active: true,
        bossEntity: boss,
        bossPhaseTriggered: false,
        bossSpawned: true,
        completeLevel: vi.fn(function () {
            this.levelComplete = true;
            this.completionScore = player.score;
        }),
        dangerZones: [],
        entities: [boss],
        game: {
            camera: { follow: vi.fn() },
            effects: {
                damageNumber: vi.fn(),
                healNumber: vi.fn(),
                pickupSparkle: vi.fn(),
                scorePopup: vi.fn(),
            },
            engine: {},
            player,
        },
        gameOver: vi.fn(),
        gameOverTriggered: false,
        isSimulationPaused: vi.fn(() => false),
        levelComplete: false,
        levelElapsed: 0,
        pickups: [],
        projectiles: [],
        spawnHealthPickup: vi.fn(),
        spawnWave: vi.fn(),
        state: 'playing',
        updateHUD: vi.fn(),
        waveActive: true,
        waveTimer: 0,
    };

    return { boss, mode, player };
}

describe('adventure final-frame outcomes', () => {
    it('settles the final boss reward before recording level completion', () => {
        const { boss, mode, player } = makeFinalFrame({ playerAlive: true });

        AdventureMode.prototype.update.call(mode, 1 / 60);

        expect(player.score).toBe(185);
        expect(mode.completionScore).toBe(185);
        expect(mode.completeLevel).toHaveBeenCalledOnce();
        expect(mode.gameOver).not.toHaveBeenCalled();
        expect(mode.entities).not.toContain(boss);
    });

    it('resolves simultaneous boss and player death as game over', () => {
        const { mode } = makeFinalFrame({ playerAlive: false });

        AdventureMode.prototype.update.call(mode, 1 / 60);

        expect(mode.gameOverTriggered).toBe(true);
        expect(mode.gameOver).toHaveBeenCalledOnce();
        expect(mode.completeLevel).not.toHaveBeenCalled();
        expect(mode.levelComplete).toBe(false);
    });
});
