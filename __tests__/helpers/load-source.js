import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

/**
 * Extract top-level declaration names from source code.
 * Captures const, let, var, function, and class declarations.
 */
function extractNames(code) {
    const names = new Set();
    for (const m of code.matchAll(/^(?:export\s+)?(?:const|let|var)\s+(\w+)/gm)) {
        names.add(m[1]);
    }
    for (const m of code.matchAll(/^(?:export\s+)?function\s+(\w+)/gm)) {
        names.add(m[1]);
    }
    for (const m of code.matchAll(/^(?:export\s+)?class\s+(\w+)/gm)) {
        names.add(m[1]);
    }
    return [...names];
}

/**
 * Evaluates a source file (written for browser global scope) inside a
 * function scope, captures all top-level declarations, and returns them
 * as an object.  Also places each export on globalThis so that
 * subsequently loaded files can find cross-file dependencies.
 *
 * @param {string} filePath — path relative to repo root (e.g. "js/utils.js")
 * @returns {Record<string, any>} all top-level declarations from the file
 */
export function loadSource(filePath) {
    const fullPath = join(root, filePath);
    const code = readFileSync(fullPath, 'utf-8');
    const names = extractNames(code);

    const wrappedCode = code + `\nreturn { ${names.join(', ')} };`;
    const fn = new Function(wrappedCode);
    const exports = fn();

    // Put on globalThis for cross-file dependencies
    for (const [key, value] of Object.entries(exports)) {
        globalThis[key] = value;
    }

    return exports;
}
