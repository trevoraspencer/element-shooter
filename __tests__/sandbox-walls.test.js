import { describe, it, expect, beforeAll } from 'vitest';
import { loadSource } from './helpers/load-source.js';

let sandbox;

beforeAll(() => {
    sandbox = loadSource('js/sandbox.js');
});

// computeBoundaryWallX positions the two sandbox boundary walls so their inner
// faces line up exactly with the visible browser-window edges. The camera in
// sandbox is static, so the visible world span is [cameraX, cameraX + width/zoom].
describe('computeBoundaryWallX', () => {
    it('places wall inner faces exactly at the visible window edges (zoom 1)', () => {
        const { computeBoundaryWallX } = sandbox;
        const cameraX = 575.5;
        const width = 849;
        const t = 40;

        const { left, right } = computeBoundaryWallX(cameraX, width, 1, t);

        // Left wall's right (inner) face sits on the left window edge.
        expect(left + t / 2).toBeCloseTo(cameraX);
        // Right wall's left (inner) face sits on the right window edge.
        expect(right - t / 2).toBeCloseTo(cameraX + width);
        // Bodies live fully outside the viewport (off-screen).
        expect(left).toBeLessThan(cameraX);
        expect(right).toBeGreaterThan(cameraX + width);
    });

    it('accounts for zoom when computing the visible world width', () => {
        const { computeBoundaryWallX } = sandbox;
        const cameraX = 100;
        const width = 800;
        const t = 40;

        const { left, right } = computeBoundaryWallX(cameraX, width, 2, t);

        // Left edge is the camera origin regardless of zoom.
        expect(left + t / 2).toBeCloseTo(100);
        // Visible world width shrinks with zoom: width / zoom.
        expect(right - t / 2).toBeCloseTo(100 + 800 / 2);
    });

    it('widens the gap between walls as the window widens', () => {
        const { computeBoundaryWallX } = sandbox;
        const narrow = computeBoundaryWallX(0, 600, 1, 40);
        const wide = computeBoundaryWallX(0, 1600, 1, 40);

        const narrowSpan = narrow.right - narrow.left;
        const wideSpan = wide.right - wide.left;
        expect(wideSpan).toBeGreaterThan(narrowSpan);
        expect(wideSpan - narrowSpan).toBeCloseTo(1600 - 600);
    });
});
