import { beforeEach, describe, expect, it } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let ui;

beforeEach(() => {
    ui = loadSource('js/ui.js');
});

describe('getGridNavigationIndex', () => {
    it('moves horizontally and clamps at the grid edges', () => {
        expect(ui.getGridNavigationIndex(0, 6, 3, 'ArrowLeft')).toBe(0);
        expect(ui.getGridNavigationIndex(0, 6, 3, 'ArrowRight')).toBe(1);
        expect(ui.getGridNavigationIndex(5, 6, 3, 'ArrowRight')).toBe(5);
    });

    it('moves vertically by the visible column count', () => {
        expect(ui.getGridNavigationIndex(1, 8, 3, 'ArrowDown')).toBe(4);
        expect(ui.getGridNavigationIndex(4, 8, 3, 'ArrowUp')).toBe(1);
        expect(ui.getGridNavigationIndex(6, 8, 3, 'ArrowDown')).toBe(7);
    });

    it('supports Home and End shortcuts', () => {
        expect(ui.getGridNavigationIndex(3, 8, 3, 'Home')).toBe(0);
        expect(ui.getGridNavigationIndex(3, 8, 3, 'End')).toBe(7);
    });

    it('falls back to single-column movement when columns are invalid', () => {
        expect(ui.getGridNavigationIndex(2, 5, 0, 'ArrowDown')).toBe(3);
        expect(ui.getGridNavigationIndex(2, 5, null, 'ArrowUp')).toBe(1);
    });

    it('returns -1 when there are no navigable items', () => {
        expect(ui.getGridNavigationIndex(0, 0, 3, 'ArrowRight')).toBe(-1);
    });
});
