import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTopLevelNames, loadSource } from './helpers/load-source.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const indexPath = join(root, 'index.html');

const EXPECTED_LOCAL_SCRIPT_ORDER = [
    'js/utils.js',
    'js/elements-data.js',
    'js/effects.js',
    'js/element-entity.js',
    'js/weapons.js',
    'js/structures.js',
    'js/player.js',
    'js/ai.js',
    'js/camera.js',
    'js/sandbox.js',
    'js/adventure.js',
    'js/ui.js',
    'js/main.js',
];

function parseScriptTags() {
    const html = readFileSync(indexPath, 'utf8');
    return [...html.matchAll(/<script\b([^>]*)><\/script>/gi)].map((match) => {
        const attrs = match[1];
        const src = attrs.match(/\bsrc="([^"]+)"/)?.[1] ?? '';
        return { attrs, src };
    });
}

function localScriptSources() {
    return parseScriptTags()
        .map((tag) => tag.src)
        .filter((src) => src.startsWith('js/'));
}

describe('index.html script contract', () => {
    it('loads Matter.js first from the pinned CDN URL with SRI enabled', () => {
        const [matterTag] = parseScriptTags();

        expect(matterTag.src).toBe(
            'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js',
        );
        expect(matterTag.attrs).toContain('integrity="sha384-');
        expect(matterTag.attrs).toContain('crossorigin="anonymous"');
    });

    it('keeps every local runtime script present exactly once in dependency order', () => {
        const scripts = localScriptSources();
        const jsFiles = readdirSync(join(root, 'js'))
            .filter((name) => name.endsWith('.js'))
            .map((name) => `js/${name}`)
            .sort();

        expect(scripts).toEqual(EXPECTED_LOCAL_SCRIPT_ORDER);
        expect([...scripts].sort()).toEqual(jsFiles);

        for (const script of scripts) {
            expect(existsSync(join(root, script))).toBe(true);
        }
    });

    it('does not duplicate top-level declarations across classic scripts', () => {
        const declarations = new Map();

        for (const script of localScriptSources()) {
            const code = readFileSync(join(root, script), 'utf8');
            for (const name of extractTopLevelNames(code)) {
                declarations.set(name, [...(declarations.get(name) ?? []), script]);
            }
        }

        const duplicates = [...declarations.entries()]
            .filter(([, scripts]) => scripts.length > 1)
            .map(([name, scripts]) => ({ name, scripts }));

        expect(duplicates).toEqual([]);
    });

    it('evaluates all local scripts through the test browser-global shim in index order', () => {
        globalThis.window.addEventListener = () => {};

        for (const script of localScriptSources()) {
            expect(() => loadSource(script)).not.toThrow();
        }

        expect(globalThis.Game).toBeTypeOf('function');
        expect(globalThis.STRUCTURES).toBeTypeOf('object');
        expect(globalThis.WEAPONS).toBeTypeOf('object');
    });
});
