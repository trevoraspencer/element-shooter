import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let main;

beforeAll(() => {
    loadSource('js/utils.js');
    globalThis.window.addEventListener = vi.fn();
    main = loadSource('js/main.js');
});

describe('Game collision dispatch', () => {
    it('does not damage another structure after a projectile is already spent', () => {
        const damagePart = vi.fn();
        const projectile = {
            alive: false,
            wpn: { damage: 10 },
            onHit: vi.fn(),
        };
        const body = {
            structure: { damagePart },
            structurePart: {},
        };

        main.Game.prototype.handleStructureHit.call(
            { engine: { world: {} }, effects: {} },
            projectile,
            body,
        );

        expect(damagePart).not.toHaveBeenCalled();
        expect(projectile.onHit).not.toHaveBeenCalled();
    });

    it('passes combat context through body-slam damage for death specials', () => {
        const entities = [];
        const entA = {
            alive: true,
            team: 'a',
            body: { velocity: { x: 10, y: 0 } },
            data: { damage: 10, mass: 1 },
            takeDamage: vi.fn(),
        };
        const entB = {
            alive: true,
            team: 'b',
            body: { velocity: { x: 0, y: 0 } },
            data: { damage: 10, mass: 1 },
            takeDamage: vi.fn(),
        };
        entities.push(entA, entB);
        const context = {
            effects: {},
            getAllEntities: () => entities,
        };

        main.Game.prototype.handleBodySlam.call(context, entA, entB);

        expect(entA.takeDamage).toHaveBeenCalledWith(
            expect.any(Number),
            context.effects,
            null,
            entities,
        );
        expect(entB.takeDamage).toHaveBeenCalledWith(
            expect.any(Number),
            context.effects,
            null,
            entities,
        );
    });
});
