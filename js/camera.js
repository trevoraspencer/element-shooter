// Smooth-follow camera with zoom and world bounds
class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.zoom = 1;
        this.targetZoom = 1;

        // World bounds
        this.worldMinX = -500;
        this.worldMinY = -500;
        this.worldMaxX = 2500;
        this.worldMaxY = 1500;

        // Smoothing — rates are "per second" exponential decays, picked so
        // the effective per-frame factor at 60fps matches the previous
        // constants (0.08 and 0.05).
        this.smoothing = 5;
        this.zoomSmoothing = 3;
    }

    setWorldBounds(minX, minY, maxX, maxY) {
        this.worldMinX = minX;
        this.worldMinY = minY;
        this.worldMaxX = maxX;
        this.worldMaxY = maxY;
    }

    follow(target, dt) {
        if (!target) return;

        this.targetX = target.x - this.width / this.zoom / 2;
        this.targetY = target.y - this.height / this.zoom / 2;

        // Frame-rate independent exponential smoothing.
        const k = 1 - Math.exp(-this.smoothing * (dt || 1 / 60));
        const kz = 1 - Math.exp(-this.zoomSmoothing * (dt || 1 / 60));
        this.x = lerp(this.x, this.targetX, k);
        this.y = lerp(this.y, this.targetY, k);

        // Clamp to world bounds
        this.x = clamp(this.x, this.worldMinX, this.worldMaxX - this.width / this.zoom);
        this.y = clamp(this.y, this.worldMinY, this.worldMaxY - this.height / this.zoom);

        // Zoom
        this.zoom = lerp(this.zoom, this.targetZoom, kz);
    }

    setPosition(x, y) {
        this.x = x - this.width / this.zoom / 2;
        this.y = y - this.height / this.zoom / 2;
        this.targetX = this.x;
        this.targetY = this.y;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    // Get screen position from world position
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom,
            y: (wy - this.y) * this.zoom,
        };
    }

    // Get world position from screen position
    screenToWorld(sx, sy) {
        return {
            x: sx / this.zoom + this.x,
            y: sy / this.zoom + this.y,
        };
    }
}
