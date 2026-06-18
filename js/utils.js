// Collision categories
const CAT = {
    GROUND: 0x0001,
    ELEMENT: 0x0002,
    PROJECTILE: 0x0004,
    PLAYER: 0x0008,
    SENSOR: 0x0010,
    WALL: 0x0020,
    PLATFORM: 0x0040,
};

// Team colors
const TEAM_COLORS = {
    neutral: '#888',
    a: '#ff5050',
    b: '#5080ff',
};

const DEBUG = Boolean(window.ELEMENTS_DEBUG);

function warnDebug(message, error) {
    if (DEBUG) console.warn(message, error);
}

const BODY_SLAM_CONFIG = {
    minSpeed: 5,
    // Per-element damage stat scales speed→damage. speedFactor caps how much
    // the relative speed multiplies an element's data.damage in a collision.
    speedFactor: 1 / 30,
    speedCap: 2,
    minDamage: 2,
};

const SCREEN_SHAKE_CONFIG = {
    bodySlam: 8,
    explosion: 10,
    sandboxExplosion: 15,
    death: 8,
    nuclear: 20,
};

const DEFAULT_SETTINGS = {
    muted: false,
    masterVolume: 0.8,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
};

function loadSettings() {
    try {
        const parsed = JSON.parse(localStorage.getItem('elements_settings') || '{}');
        return {
            muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
            masterVolume:
                typeof parsed.masterVolume === 'number'
                    ? clamp(parsed.masterVolume, 0, 1)
                    : DEFAULT_SETTINGS.masterVolume,
            reducedMotion:
                typeof parsed.reducedMotion === 'boolean'
                    ? parsed.reducedMotion
                    : DEFAULT_SETTINGS.reducedMotion,
        };
    } catch (error) {
        warnDebug('Failed to load settings', error);
        return { ...DEFAULT_SETTINGS };
    }
}

const gameSettings = loadSettings();

function saveSettings() {
    try {
        localStorage.setItem('elements_settings', JSON.stringify(gameSettings));
    } catch (error) {
        warnDebug('Failed to save settings', error);
    }
}

function setAudioMuted(muted) {
    gameSettings.muted = Boolean(muted);
    saveSettings();
}

function setMasterVolume(volume) {
    gameSettings.masterVolume = clamp(Number(volume) || 0, 0, 1);
    saveSettings();
}

function setReducedMotion(enabled) {
    gameSettings.reducedMotion = Boolean(enabled);
    document.body?.classList.toggle('reduced-motion', gameSettings.reducedMotion);
    saveSettings();
}

// Math helpers
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Squared distance — for radius threshold checks, avoids the Math.sqrt in dist().
// Compare against radius*radius, never the linear radius.
function dist2(x1, y1, x2, y2) {
    return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function randRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Color helpers
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return (
        '#' +
        [r, g, b]
            .map((c) =>
                Math.round(clamp(c, 0, 255))
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')
    );
}

function colorWithAlpha(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}

// Screen shake state
const screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };

function triggerScreenShake(intensity) {
    if (gameSettings.reducedMotion) return;
    screenShake.intensity = Math.max(screenShake.intensity, intensity);
}

function updateScreenShake() {
    if (screenShake.intensity > 0.5) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= screenShake.decay;
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
        screenShake.intensity = 0;
    }
}

// Clamps a body's horizontal speed, preserving vertical velocity.
function capHorizontalSpeed(body, maxVel) {
    if (Math.abs(body.velocity.x) > maxVel) {
        Matter.Body.setVelocity(body, {
            x: Math.sign(body.velocity.x) * maxVel,
            y: body.velocity.y,
        });
    }
}

// Returns true if a solid body (ground/platform/wall) sits directly beneath the
// given body — used for jump and float-special ground checks. Tests against the
// active mode's cached static geometry when available (the only bodies that can
// ground an entity), falling back to a full world walk otherwise.
function isBodyGrounded(engine, body, radius) {
    if (!body) return false;
    const statics = window.game?.getStaticBodies?.();
    const bodies =
        statics && statics.length
            ? statics
            : engine
              ? Matter.Composite.allBodies(engine.world)
              : [];
    const probe = { x: body.position.x, y: body.position.y + radius + 3 };
    for (const b of bodies) {
        if (b === body || b.isSensor) continue;
        if (b.collisionFilter.category === CAT.PROJECTILE) continue;
        if (Matter.Bounds.contains(b.bounds, probe)) return true;
    }
    return false;
}

function isCircleOnScreen(x, y, radius, camera, margin = 80) {
    const screen = camera.worldToScreen(x, y);
    const scaledRadius = radius * camera.zoom;
    return (
        screen.x + scaledRadius >= -margin &&
        screen.x - scaledRadius <= camera.width + margin &&
        screen.y + scaledRadius >= -margin &&
        screen.y - scaledRadius <= camera.height + margin
    );
}

// Simple synthesized sound effects
let audioCtx = null;
const soundLimiter = new Map();
const SOUND_LIMITS = {
    shoot: 8,
    hit: 6,
    explode: 3,
    death: 4,
    pickup: 4,
    beam: 4,
    shotgun: 4,
    cannon: 3,
};

function getAudioContext() {
    if (audioCtx) return audioCtx;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioCtx = new AudioCtor();
    return audioCtx;
}

function trackSound(type, duration) {
    const active = soundLimiter.get(type) || 0;
    if (active >= (SOUND_LIMITS[type] || 4)) return false;
    soundLimiter.set(type, active + 1);
    setTimeout(
        () => {
            soundLimiter.set(type, Math.max(0, (soundLimiter.get(type) || 1) - 1));
        },
        Math.ceil(duration * 1000),
    );
    return true;
}

// Each profile fully describes a synthesized blip: waveform, a frequency
// envelope (ramps exponentially from→to, or holds a second value with `freqHold`),
// peak gain, and total duration (also drives the rate limiter).
const SOUND_PROFILES = {
    shoot: { wave: 'square', from: 800, to: 200, gain: 0.08, dur: 0.1 },
    hit: { wave: 'sawtooth', from: 300, to: 80, gain: 0.1, dur: 0.15 },
    explode: { wave: 'sawtooth', from: 150, to: 30, gain: 0.15, dur: 0.4 },
    death: { wave: 'sine', from: 500, to: 60, gain: 0.1, dur: 0.5 },
    pickup: { wave: 'sine', from: 400, to: 800, gain: 0.08, dur: 0.2, ramp: 0.15 },
    beam: { wave: 'sine', from: 600, freqHold: 650, gain: 0.04, dur: 0.08 },
    shotgun: { wave: 'square', from: 400, to: 80, gain: 0.12, dur: 0.15 },
    cannon: { wave: 'sawtooth', from: 200, to: 40, gain: 0.15, dur: 0.3 },
};

function playSound(type) {
    if (gameSettings.muted || gameSettings.masterVolume <= 0) return;

    const profile = SOUND_PROFILES[type];
    if (!profile) return;

    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    if (!trackSound(type, profile.dur)) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const volume = gameSettings.masterVolume;

    osc.type = profile.wave;
    osc.frequency.setValueAtTime(profile.from, now);
    if (profile.freqHold !== undefined) {
        osc.frequency.setValueAtTime(profile.freqHold, now + 0.05);
    } else {
        osc.frequency.exponentialRampToValueAtTime(profile.to, now + (profile.ramp ?? profile.dur));
    }
    gain.gain.setValueAtTime(profile.gain * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + profile.dur);
    osc.start(now);
    osc.stop(now + profile.dur);
}
