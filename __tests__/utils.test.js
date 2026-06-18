import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let utils;

beforeAll(() => {
    utils = loadSource('js/utils.js');
});

beforeEach(() => {
    // Reset localStorage store before each test
    globalThis.localStorage.store = {};
    vi.clearAllMocks();
});

// ─── Math helpers ──────────────────────────────────────────────────────

describe('lerp', () => {
    it('returns the start value when t = 0', () => {
        expect(utils.lerp(10, 20, 0)).toBe(10);
    });

    it('returns the end value when t = 1', () => {
        expect(utils.lerp(10, 20, 1)).toBe(20);
    });

    it('returns the midpoint when t = 0.5', () => {
        expect(utils.lerp(0, 10, 0.5)).toBe(5);
    });

    it('interpolates between negative numbers', () => {
        expect(utils.lerp(-10, 10, 0.5)).toBe(0);
    });

    it('extrapolates beyond the range when t > 1', () => {
        expect(utils.lerp(0, 10, 2)).toBe(20);
    });

    it('extrapolates before the range when t < 0', () => {
        expect(utils.lerp(0, 10, -1)).toBe(-10);
    });

    it('returns the same value when start equals end', () => {
        expect(utils.lerp(5, 5, 0.7)).toBe(5);
    });
});

describe('clamp', () => {
    it('returns the value when within range', () => {
        expect(utils.clamp(5, 0, 10)).toBe(5);
    });

    it('returns min when value is below range', () => {
        expect(utils.clamp(-5, 0, 10)).toBe(0);
    });

    it('returns max when value is above range', () => {
        expect(utils.clamp(15, 0, 10)).toBe(10);
    });

    it('returns value when equal to min', () => {
        expect(utils.clamp(0, 0, 10)).toBe(0);
    });

    it('returns value when equal to max', () => {
        expect(utils.clamp(10, 0, 10)).toBe(10);
    });

    it('works with negative ranges', () => {
        expect(utils.clamp(-3, -5, -1)).toBe(-3);
    });

    it('clamps at min for negative ranges', () => {
        expect(utils.clamp(-10, -5, -1)).toBe(-5);
    });
});

describe('dist', () => {
    it('returns 0 for the same point', () => {
        expect(utils.dist(3, 4, 3, 4)).toBe(0);
    });

    it('computes horizontal distance', () => {
        expect(utils.dist(0, 0, 5, 0)).toBe(5);
    });

    it('computes vertical distance', () => {
        expect(utils.dist(0, 0, 0, 5)).toBe(5);
    });

    it('computes 3-4-5 triangle distance', () => {
        expect(utils.dist(0, 0, 3, 4)).toBe(5);
    });

    it('computes diagonal distance for unit square', () => {
        expect(utils.dist(0, 0, 1, 1)).toBeCloseTo(Math.SQRT2);
    });

    it('handles negative coordinates', () => {
        expect(utils.dist(-3, -4, 0, 0)).toBe(5);
    });
});

describe('dist2', () => {
    it('returns 0 for the same point', () => {
        expect(utils.dist2(3, 4, 3, 4)).toBe(0);
    });

    it('equals dist squared for a 3-4-5 triangle', () => {
        expect(utils.dist2(0, 0, 3, 4)).toBe(25);
    });

    it('equals dist squared for the unit diagonal', () => {
        expect(utils.dist2(0, 0, 1, 1)).toBeCloseTo(utils.dist(0, 0, 1, 1) ** 2);
    });

    it('matches dist**2 across assorted points (incl. negatives)', () => {
        for (const [x1, y1, x2, y2] of [
            [0, 0, 5, 0],
            [0, 0, 0, 7],
            [-3, -4, 0, 0],
            [2, 9, -6, 1],
        ]) {
            expect(utils.dist2(x1, y1, x2, y2)).toBeCloseTo(utils.dist(x1, y1, x2, y2) ** 2);
        }
    });
});

describe('angle', () => {
    it('returns 0 for point directly to the right', () => {
        expect(utils.angle(0, 0, 1, 0)).toBe(0);
    });

    it('returns PI/2 for point directly below', () => {
        expect(utils.angle(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
    });

    it('returns PI for point directly to the left', () => {
        expect(utils.angle(0, 0, -1, 0)).toBeCloseTo(Math.PI);
    });

    it('returns -PI/2 for point directly above', () => {
        expect(utils.angle(0, 0, 0, -1)).toBeCloseTo(-Math.PI / 2);
    });

    it('returns 0 for the same point (zero vector)', () => {
        expect(utils.angle(5, 5, 5, 5)).toBe(0);
    });

    it('returns PI/4 for diagonal (45 degrees down-right)', () => {
        expect(utils.angle(0, 0, 1, 1)).toBeCloseTo(Math.PI / 4);
    });
});

// ─── Color helpers ─────────────────────────────────────────────────────

describe('hexToRgb', () => {
    it('parses #ff0000 to red', () => {
        const { r, g, b } = utils.hexToRgb('#ff0000');
        expect(r).toBe(255);
        expect(g).toBe(0);
        expect(b).toBe(0);
    });

    it('parses #00ff00 to green', () => {
        const { r, g, b } = utils.hexToRgb('#00ff00');
        expect(r).toBe(0);
        expect(g).toBe(255);
        expect(b).toBe(0);
    });

    it('parses #0000ff to blue', () => {
        const { r, g, b } = utils.hexToRgb('#0000ff');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(255);
    });

    it('parses #ffffff to white', () => {
        const { r, g, b } = utils.hexToRgb('#ffffff');
        expect(r).toBe(255);
        expect(g).toBe(255);
        expect(b).toBe(255);
    });

    it('parses #000000 to black', () => {
        const { r, g, b } = utils.hexToRgb('#000000');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
    });

    it('parses a mid-range hex like #aa5533', () => {
        const { r, g, b } = utils.hexToRgb('#aa5533');
        expect(r).toBe(170);
        expect(g).toBe(85);
        expect(b).toBe(51);
    });
});

describe('rgbToHex', () => {
    it('converts pure red (255,0,0) to #ff0000', () => {
        expect(utils.rgbToHex(255, 0, 0)).toBe('#ff0000');
    });

    it('converts black (0,0,0) to #000000', () => {
        expect(utils.rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('converts white (255,255,255) to #ffffff', () => {
        expect(utils.rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('pads single-digit hex values', () => {
        expect(utils.rgbToHex(1, 2, 3)).toBe('#010203');
    });

    it('clamps values above 255 to 255', () => {
        expect(utils.rgbToHex(300, -10, 128)).toBe('#ff0080');
    });
});

describe('colorWithAlpha', () => {
    it('produces rgba string with correct components', () => {
        expect(utils.colorWithAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
    });

    it('handles alpha of 0', () => {
        expect(utils.colorWithAlpha('#00ff00', 0)).toBe('rgba(0,255,0,0)');
    });

    it('handles alpha of 1', () => {
        expect(utils.colorWithAlpha('#0000ff', 1)).toBe('rgba(0,0,255,1)');
    });
});

// ─── Constants ─────────────────────────────────────────────────────────

describe('CAT (collision categories)', () => {
    it('GROUND is 0x0001', () => {
        expect(utils.CAT.GROUND).toBe(0x0001);
    });

    it('ELEMENT is 0x0002', () => {
        expect(utils.CAT.ELEMENT).toBe(0x0002);
    });

    it('PROJECTILE is 0x0004', () => {
        expect(utils.CAT.PROJECTILE).toBe(0x0004);
    });

    it('PLAYER is 0x0008', () => {
        expect(utils.CAT.PLAYER).toBe(0x0008);
    });

    it('SENSOR is 0x0010', () => {
        expect(utils.CAT.SENSOR).toBe(0x0010);
    });

    it('has exactly 7 categories', () => {
        expect(Object.keys(utils.CAT)).toHaveLength(7);
    });
});

describe('BODY_SLAM_CONFIG', () => {
    it('minSpeed is 5', () => {
        expect(utils.BODY_SLAM_CONFIG.minSpeed).toBe(5);
    });

    it('speedFactor is 1/30', () => {
        expect(utils.BODY_SLAM_CONFIG.speedFactor).toBe(1 / 30);
    });

    it('speedCap is 2', () => {
        expect(utils.BODY_SLAM_CONFIG.speedCap).toBe(2);
    });

    it('minDamage is 2', () => {
        expect(utils.BODY_SLAM_CONFIG.minDamage).toBe(2);
    });
});

describe('DEFAULT_SETTINGS', () => {
    it('muted defaults to false', () => {
        expect(utils.DEFAULT_SETTINGS.muted).toBe(false);
    });

    it('masterVolume defaults to 0.8', () => {
        expect(utils.DEFAULT_SETTINGS.masterVolume).toBe(0.8);
    });
});

// ─── Settings functions ────────────────────────────────────────────────

describe('loadSettings', () => {
    it('returns defaults when localStorage is empty', () => {
        const settings = utils.loadSettings();
        expect(settings.muted).toBe(false);
        expect(settings.masterVolume).toBe(0.8);
        expect(settings.reducedMotion).toBe(false);
    });

    it('returns stored boolean values for muted and reducedMotion', () => {
        globalThis.localStorage.store['elements_settings'] = JSON.stringify({
            muted: true,
            reducedMotion: true,
            masterVolume: 0.5,
        });
        const settings = utils.loadSettings();
        expect(settings.muted).toBe(true);
        expect(settings.reducedMotion).toBe(true);
        expect(settings.masterVolume).toBe(0.5);
    });

    it('clamps masterVolume between 0 and 1', () => {
        globalThis.localStorage.store['elements_settings'] = JSON.stringify({
            masterVolume: 2.0,
        });
        const settings = utils.loadSettings();
        expect(settings.masterVolume).toBe(1);
    });

    it('clamps negative masterVolume to 0', () => {
        globalThis.localStorage.store['elements_settings'] = JSON.stringify({
            masterVolume: -0.5,
        });
        const settings = utils.loadSettings();
        expect(settings.masterVolume).toBe(0);
    });

    it('returns defaults when stored JSON is invalid', () => {
        globalThis.localStorage.store['elements_settings'] = 'not-json';
        const settings = utils.loadSettings();
        expect(settings.muted).toBe(false);
        expect(settings.masterVolume).toBe(0.8);
    });

    it('uses default masterVolume when stored value is not a number', () => {
        globalThis.localStorage.store['elements_settings'] = JSON.stringify({
            masterVolume: 'loud',
        });
        const settings = utils.loadSettings();
        expect(settings.masterVolume).toBe(0.8);
    });

    it('uses default muted when stored value is not a boolean', () => {
        globalThis.localStorage.store['elements_settings'] = JSON.stringify({
            muted: 'yes',
        });
        const settings = utils.loadSettings();
        expect(settings.muted).toBe(false);
    });
});

describe('setAudioMuted', () => {
    it('sets muted to true', () => {
        utils.setAudioMuted(true);
        expect(utils.gameSettings.muted).toBe(true);
    });

    it('sets muted to false', () => {
        utils.setAudioMuted(true);
        utils.setAudioMuted(false);
        expect(utils.gameSettings.muted).toBe(false);
    });

    it('persists to localStorage', () => {
        utils.setAudioMuted(true);
        expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
            'elements_settings',
            expect.any(String),
        );
        const stored = JSON.parse(globalThis.localStorage.store['elements_settings']);
        expect(stored.muted).toBe(true);
    });
});

describe('setMasterVolume', () => {
    it('sets volume to a valid value', () => {
        utils.setMasterVolume(0.5);
        expect(utils.gameSettings.masterVolume).toBe(0.5);
    });

    it('clamps volume above 1 to 1', () => {
        utils.setMasterVolume(2);
        expect(utils.gameSettings.masterVolume).toBe(1);
    });

    it('clamps volume below 0 to 0', () => {
        utils.setMasterVolume(-1);
        expect(utils.gameSettings.masterVolume).toBe(0);
    });

    it('treats NaN as 0', () => {
        utils.setMasterVolume(NaN);
        expect(utils.gameSettings.masterVolume).toBe(0);
    });

    it('persists to localStorage', () => {
        utils.setMasterVolume(0.3);
        const stored = JSON.parse(globalThis.localStorage.store['elements_settings']);
        expect(stored.masterVolume).toBe(0.3);
    });
});

describe('setReducedMotion', () => {
    it('sets reducedMotion to true', () => {
        utils.setReducedMotion(true);
        expect(utils.gameSettings.reducedMotion).toBe(true);
    });

    it('sets reducedMotion to false', () => {
        utils.setReducedMotion(true);
        utils.setReducedMotion(false);
        expect(utils.gameSettings.reducedMotion).toBe(false);
    });

    it('calls document.body.classList.toggle', () => {
        utils.setReducedMotion(true);
        expect(globalThis.document.body.classList.toggle).toHaveBeenCalledWith(
            'reduced-motion',
            true,
        );
    });
});

// ─── Sound limits ──────────────────────────────────────────────────────

describe('SOUND_LIMITS', () => {
    it('defines a limit for shoot', () => {
        expect(utils.SOUND_LIMITS.shoot).toBe(8);
    });

    it('defines a limit for hit', () => {
        expect(utils.SOUND_LIMITS.hit).toBe(6);
    });

    it('defines a limit for explode', () => {
        expect(utils.SOUND_LIMITS.explode).toBe(3);
    });

    it('has at least 8 sound types', () => {
        expect(Object.keys(utils.SOUND_LIMITS).length).toBeGreaterThanOrEqual(8);
    });
});

// ─── Screen shake ──────────────────────────────────────────────────────

describe('SCREEN_SHAKE_CONFIG', () => {
    it('bodySlam intensity is 8', () => {
        expect(utils.SCREEN_SHAKE_CONFIG.bodySlam).toBe(8);
    });

    it('explosion intensity is 10', () => {
        expect(utils.SCREEN_SHAKE_CONFIG.explosion).toBe(10);
    });

    it('nuclear intensity is 20', () => {
        expect(utils.SCREEN_SHAKE_CONFIG.nuclear).toBe(20);
    });
});
