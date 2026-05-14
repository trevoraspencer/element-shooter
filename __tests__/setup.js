import { vi } from 'vitest';

// Mock browser globals needed by source files loaded via <script> tags.
// These must exist before any source file is evaluated.

globalThis.localStorage = {
    store: {},
    getItem: vi.fn((key) => globalThis.localStorage.store[key] ?? null),
    setItem: vi.fn((key, value) => {
        globalThis.localStorage.store[key] = value;
    }),
    removeItem: vi.fn((key) => {
        delete globalThis.localStorage.store[key];
    }),
    clear: vi.fn(() => {
        globalThis.localStorage.store = {};
    }),
};

globalThis.window = globalThis;
globalThis.window.ELEMENTS_DEBUG = false;
globalThis.window.matchMedia = vi.fn(() => ({ matches: false }));
globalThis.window.AudioContext = vi.fn();
globalThis.window.webkitAudioContext = undefined;

globalThis.document = {
    body: {
        classList: {
            toggle: vi.fn(),
        },
    },
};
