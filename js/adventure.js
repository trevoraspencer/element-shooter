// Adventure mode: 7 levels with waves, bosses, rewards

// Phase status effect for Gold Dynamo shield (10s damage reduction)
STATUS_EFFECTS.phase_shielded = { takenMul: 0.3, color: '#ffdd44' };

// Cap on simultaneous live entities during boss phases (keeps physics stable)
const MAX_ADVENTURE_ENTITIES = 50;

// Upgrade pool: 7 types, 3 random choices shown after each non-boss wave
const UPGRADE_POOL = [
    {
        id: 'max_health',
        name: 'Max Health',
        description: '+25% max HP',
        icon: '\u2764\uFE0F',
        apply(playerEntity) {
            const bonus = Math.round(playerEntity.maxHealth * 0.25);
            playerEntity.maxHealth += bonus;
            playerEntity.health = Math.min(playerEntity.maxHealth, playerEntity.health + bonus);
        },
    },
    {
        id: 'move_speed',
        name: 'Movement Speed',
        description: '+15% speed',
        icon: '\u26A1',
        apply(playerEntity) {
            playerEntity.speedMultiplier = (playerEntity.speedMultiplier || 1) * 1.15;
        },
    },
    {
        id: 'jump_strength',
        name: 'Jump Strength',
        description: '+20% jump force',
        icon: '\u2B06\uFE0F',
        apply(playerEntity) {
            playerEntity.jumpMultiplier = (playerEntity.jumpMultiplier || 1) * 1.2;
        },
    },
    {
        id: 'fire_rate',
        name: 'Fire Rate',
        description: '-15% weapon cooldown',
        icon: '\uD83D\uDD2B',
        apply(playerEntity) {
            playerEntity.fireRateMultiplier = (playerEntity.fireRateMultiplier || 1) * 1.15;
        },
    },
    {
        id: 'projectile_damage',
        name: 'Projectile Damage',
        description: '+15% damage',
        icon: '\uD83D\uDCA5',
        apply(playerEntity) {
            playerEntity.damageMultiplier = (playerEntity.damageMultiplier || 1) * 1.15;
        },
    },
    {
        id: 'shield_regen',
        name: 'Shield Regen',
        description: '+3 HP/sec regen',
        icon: '\uD83D\uDEE1\uFE0F',
        apply(playerEntity) {
            playerEntity.regenRate = (playerEntity.regenRate || 0) + 3;
        },
    },
    {
        id: 'special_cooldown',
        name: 'Special Cooldown',
        description: '-20% cooldown',
        icon: '\u231B',
        apply(playerEntity) {
            playerEntity.specialCooldownRateMultiplier =
                (playerEntity.specialCooldownRateMultiplier || 1) * 1.25;
        },
    },
];

const LEVELS = [
    {
        name: 'Hydrogen Fields',
        desc: 'Light and fast enemies in an open field',
        bgColor: '#0a0a1a',
        groundColor: '#1a2a1a',
        width: 3000,
        platforms: [
            { x: 400, y: 500, w: 250 },
            { x: 800, y: 400, w: 200 },
            { x: 1300, y: 500, w: 250 },
            { x: 1800, y: 450, w: 200 },
            { x: 2300, y: 500, w: 250 },
        ],
        waves: [
            { enemies: [{ el: 'H', count: 3, ai: 'wanderer' }] },
            {
                enemies: [
                    { el: 'H', count: 4, ai: 'aggressive' },
                    { el: 'He', count: 2, ai: 'wanderer' },
                ],
            },
            {
                enemies: [
                    { el: 'H', count: 3, ai: 'aggressive' },
                    { el: 'Li', count: 2, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'C', count: 3, ai: 'defensive' },
                    { el: 'H', count: 3, ai: 'berserker' },
                ],
            },
        ],
        boss: {
            el: 'C',
            healthMult: 5,
            damageMult: 2,
            ai: 'berserker',
            weapon: 'shotgun',
            name: 'Carbon Colossus',
            phase: [
                {
                    op: 'spawnMinions',
                    el: 'C',
                    count: [2, 3],
                    healthMult: 0.5,
                    spread: { x: 80, y: 40 },
                },
                { op: 'effect', kind: 'explosion', color: '#444444', count: 15, speed: 200 },
            ],
        },
        reward: 'beam',
    },
    {
        name: 'Iron Fortress',
        desc: 'Heavy, armored enemies with strong defenses',
        bgColor: '#1a1008',
        groundColor: '#2a1a0a',
        width: 3500,
        platforms: [
            { x: 300, y: 500, w: 300 },
            { x: 700, y: 380, w: 150 },
            { x: 1100, y: 500, w: 300 },
            { x: 1500, y: 420, w: 200 },
            { x: 1900, y: 500, w: 300 },
            { x: 2400, y: 380, w: 200 },
            { x: 2800, y: 500, w: 300 },
        ],
        waves: [
            {
                enemies: [
                    { el: 'Fe', count: 2, ai: 'defensive' },
                    { el: 'Ca', count: 2, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'Al', count: 3, ai: 'aggressive' },
                    { el: 'Si', count: 2, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'Fe', count: 3, ai: 'aggressive' },
                    { el: 'Cu', count: 2, ai: 'berserker' },
                ],
            },
            {
                enemies: [
                    { el: 'Ca', count: 2, ai: 'defensive' },
                    { el: 'Fe', count: 3, ai: 'berserker' },
                ],
            },
        ],
        boss: {
            el: 'Fe',
            healthMult: 6,
            damageMult: 2,
            ai: 'aggressive',
            weapon: 'cannon',
            name: 'Iron Titan',
            phase: [
                { op: 'magneticPull', team: 'a', radius: 350, force: 0.004 },
                { op: 'effect', kind: 'explosion', color: '#8888ff', count: 25, speed: 300 },
                { op: 'effect', kind: 'sparks', color: '#8888ff', count: 20 },
            ],
        },
        reward: null,
    },
    {
        name: 'Noble Gas Nebula',
        desc: 'Floating, glowing enemies in zero-gravity zones',
        bgColor: '#0a0820',
        groundColor: '#1a1838',
        width: 3000,
        platforms: [
            { x: 300, y: 520, w: 200 },
            { x: 600, y: 380, w: 150 },
            { x: 1000, y: 480, w: 250 },
            { x: 1400, y: 350, w: 200 },
            { x: 1800, y: 500, w: 250 },
            { x: 2300, y: 400, w: 200 },
        ],
        waves: [
            {
                enemies: [
                    { el: 'He', count: 4, ai: 'wanderer' },
                    { el: 'Ne', count: 2, ai: 'wanderer' },
                ],
            },
            {
                enemies: [
                    { el: 'Ne', count: 3, ai: 'aggressive' },
                    { el: 'N', count: 3, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'He', count: 3, ai: 'berserker' },
                    { el: 'Ne', count: 3, ai: 'aggressive' },
                    { el: 'Cl', count: 1, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'F', count: 3, ai: 'berserker' },
                    { el: 'Cl', count: 2, ai: 'aggressive' },
                ],
            },
        ],
        boss: {
            el: 'Ne',
            healthMult: 5,
            damageMult: 2.5,
            ai: 'berserker',
            weapon: 'beam',
            name: 'Neon Wraith',
            phase: [
                {
                    op: 'spawnMinions',
                    el: 'Ne',
                    count: 3,
                    healthSet: 10,
                    spread: { x: 120, y: 60 },
                },
                { op: 'effect', kind: 'glowPulse', color: 'boss', radius: 80 },
                { op: 'effect', kind: 'explosion', color: '#ff88ff', count: 20, speed: 250 },
            ],
        },
        reward: 'fusion',
    },
    {
        name: 'Radioactive Wasteland',
        desc: 'Toxic and radioactive enemies that damage nearby',
        bgColor: '#0a1a08',
        groundColor: '#1a2a10',
        width: 3500,
        platforms: [
            { x: 400, y: 500, w: 200 },
            { x: 900, y: 420, w: 250 },
            { x: 1400, y: 500, w: 200 },
            { x: 1800, y: 380, w: 200 },
            { x: 2200, y: 500, w: 250 },
            { x: 2700, y: 450, w: 200 },
        ],
        waves: [
            {
                enemies: [
                    { el: 'Hg', count: 2, ai: 'aggressive' },
                    { el: 'Pb', count: 2, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'U', count: 1, ai: 'berserker' },
                    { el: 'Hg', count: 3, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'Pb', count: 3, ai: 'defensive' },
                    { el: 'U', count: 2, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'U', count: 2, ai: 'berserker' },
                    { el: 'Pu', count: 1, ai: 'berserker' },
                    { el: 'Hg', count: 2, ai: 'aggressive' },
                ],
            },
        ],
        boss: {
            el: 'U',
            healthMult: 7,
            damageMult: 2.5,
            ai: 'berserker',
            weapon: 'fusion',
            name: 'Uranium Emperor',
            phase: [
                { op: 'effect', kind: 'nuclear' },
                {
                    op: 'dangerZones',
                    count: 3,
                    radius: 80,
                    damage: 5,
                    duration: 8,
                    y: 720,
                    color: '#44ff88',
                },
            ],
        },
        reward: null,
    },
    {
        name: 'Halogen Gauntlet',
        desc: 'The most reactive and dangerous elements await',
        bgColor: '#1a0818',
        groundColor: '#2a1028',
        width: 4000,
        platforms: [
            { x: 300, y: 500, w: 200 },
            { x: 700, y: 400, w: 200 },
            { x: 1100, y: 500, w: 250 },
            { x: 1500, y: 350, w: 200 },
            { x: 1900, y: 480, w: 250 },
            { x: 2300, y: 400, w: 200 },
            { x: 2700, y: 500, w: 250 },
            { x: 3200, y: 420, w: 200 },
        ],
        waves: [
            {
                enemies: [
                    { el: 'F', count: 2, ai: 'aggressive' },
                    { el: 'Cl', count: 3, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'Br', count: 3, ai: 'aggressive' },
                    { el: 'P', count: 2, ai: 'berserker' },
                ],
            },
            {
                enemies: [
                    { el: 'K', count: 2, ai: 'berserker' },
                    { el: 'Na', count: 2, ai: 'aggressive' },
                    { el: 'Li', count: 2, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'Pu', count: 1, ai: 'berserker' },
                    { el: 'U', count: 2, ai: 'aggressive' },
                    { el: 'Au', count: 1, ai: 'defensive' },
                ],
            },
        ],
        boss: {
            el: 'Pu',
            healthMult: 7,
            damageMult: 2.5,
            ai: 'berserker',
            weapon: 'fusion',
            name: 'Plutonium Overlord',
            phase: [
                { op: 'effect', kind: 'nuclear' },
                { op: 'aoeDamage', radius: 200, damage: 20, excludeTeam: 'b' },
                {
                    op: 'spawnMinions',
                    el: 'Pu',
                    count: 2,
                    healthMult: 0.5,
                    spread: { x: 100, y: 50 },
                },
            ],
        },
        reward: 'gravity',
    },
    {
        name: 'Electromagnetic Core',
        desc: 'Metallic enemies with magnetic and electric powers',
        bgColor: '#0c0a1e',
        groundColor: '#1e1838',
        width: 4000,
        platforms: [
            { x: 300, y: 520, w: 250 },
            { x: 750, y: 400, w: 200 },
            { x: 1200, y: 500, w: 250 },
            { x: 1600, y: 370, w: 200 },
            { x: 2000, y: 500, w: 250 },
            { x: 2400, y: 420, w: 200 },
            { x: 2800, y: 500, w: 250 },
            { x: 3300, y: 380, w: 200 },
        ],
        waves: [
            {
                enemies: [
                    { el: 'Fe', count: 3, ai: 'defensive' },
                    { el: 'Sn', count: 3, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'Cu', count: 3, ai: 'aggressive' },
                    { el: 'Ag', count: 2, ai: 'defensive' },
                    { el: 'Si', count: 2, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'Fe', count: 3, ai: 'berserker' },
                    { el: 'Cu', count: 3, ai: 'berserker' },
                    { el: 'Au', count: 1, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'Ag', count: 3, ai: 'aggressive' },
                    { el: 'Fe', count: 3, ai: 'berserker' },
                    { el: 'Cu', count: 2, ai: 'berserker' },
                ],
            },
        ],
        boss: {
            el: 'Au',
            healthMult: 9,
            damageMult: 3,
            ai: 'aggressive',
            weapon: 'gravity',
            name: 'Gold Dynamo',
            phase: [
                { op: 'statusBuff', status: 'phase_shielded', duration: 10 },
                { op: 'effect', kind: 'glowPulse', color: '#ffdd44', radius: 80 },
                { op: 'effect', kind: 'explosion', color: '#ffdd44', count: 20, speed: 250 },
            ],
        },
        reward: null,
    },
    {
        name: 'Supernova',
        desc: 'Every deadly element converges for the final battle',
        bgColor: '#1a0a0a',
        groundColor: '#2a1010',
        width: 4500,
        platforms: [
            { x: 300, y: 500, w: 250 },
            { x: 700, y: 380, w: 200 },
            { x: 1100, y: 500, w: 250 },
            { x: 1500, y: 360, w: 200 },
            { x: 1900, y: 480, w: 250 },
            { x: 2300, y: 380, w: 200 },
            { x: 2700, y: 500, w: 250 },
            { x: 3100, y: 400, w: 200 },
            { x: 3600, y: 480, w: 250 },
        ],
        waves: [
            {
                enemies: [
                    { el: 'F', count: 3, ai: 'berserker' },
                    { el: 'U', count: 2, ai: 'aggressive' },
                    { el: 'Fe', count: 2, ai: 'defensive' },
                ],
            },
            {
                enemies: [
                    { el: 'Pu', count: 2, ai: 'berserker' },
                    { el: 'Ag', count: 2, ai: 'defensive' },
                    { el: 'Cl', count: 3, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'K', count: 3, ai: 'berserker' },
                    { el: 'Na', count: 3, ai: 'berserker' },
                    { el: 'Cu', count: 2, ai: 'aggressive' },
                    { el: 'Hg', count: 2, ai: 'aggressive' },
                ],
            },
            {
                enemies: [
                    { el: 'Pu', count: 3, ai: 'berserker' },
                    { el: 'U', count: 3, ai: 'berserker' },
                    { el: 'Au', count: 2, ai: 'defensive' },
                ],
            },
        ],
        boss: {
            el: 'Pu',
            healthMult: 10,
            damageMult: 3.5,
            ai: 'berserker',
            weapon: 'fusion',
            name: 'Supernova Incarnate',
            phase: [
                { op: 'statBuff', speedMult: 2, fireRateMult: 2, duration: 10 },
                { op: 'effect', kind: 'explosion', color: 'boss', count: 30, speed: 400 },
            ],
        },
        reward: null,
    },
];

const PROGRESS_SCHEMA_VERSION = 1;
const DEFAULT_UNLOCKED_LEVELS = [true, false, false, false, false, false, false];
const PICKUP_CONFIG = {
    lifetime: 20,
    dropChance: 0.25,
    bossHeal: 50,
    baseHeal: 15,
    maxHeal: 40,
};

// Boss "phase 2" abilities, expressed as data. Each level.boss.phase is a list of
// ops run in order by triggerBossPhase. Handlers are invoked with `this` bound to
// the AdventureMode instance (see runPhaseOp), so they read this.bossEntity,
// this.entities, this.game.effects, this.level, etc.
const PHASE_OPS = {
    // Spawn count enemy minions of an element near the boss. `count` is a number
    // or [min,max]; health is scaled (healthMult) or set absolutely (healthSet).
    spawnMinions(op) {
        const count = Array.isArray(op.count) ? randInt(op.count[0], op.count[1]) : op.count;
        const bossPos = this.bossEntity.body.position;
        for (let i = 0; i < count; i++) {
            if (this.getEntityCount() >= MAX_ADVENTURE_ENTITIES) break;
            const x = bossPos.x + randRange(-op.spread.x, op.spread.x);
            const y = bossPos.y + randRange(-op.spread.y, op.spread.y);
            const ent = new ElementEntity(this.game.engine, x, y, op.el, 'b');
            if (typeof op.healthSet === 'number') {
                ent.maxHealth = op.healthSet;
            } else if (typeof op.healthMult === 'number') {
                ent.maxHealth = Math.round(ent.maxHealth * op.healthMult);
            }
            ent.health = ent.maxHealth;
            ent.weapon = randChoice(STARTER_WEAPONS);
            ent.ai = new AIController(ent, op.ai || 'aggressive');
            this.entities.push(ent);
        }
    },

    // Pull all live entities of op.team toward the boss within op.radius.
    magneticPull(op) {
        const bossPos = this.bossEntity.body.position;
        const r2 = op.radius * op.radius;
        for (const ent of this.entities) {
            if (!ent.alive || ent.team !== op.team) continue;
            const d2 = dist2(bossPos.x, bossPos.y, ent.body.position.x, ent.body.position.y);
            if (d2 < r2 && d2 > 100) {
                const d = Math.sqrt(d2);
                const ang = angle(ent.body.position.x, ent.body.position.y, bossPos.x, bossPos.y);
                const force = op.force * ent.body.mass * (1 - d / op.radius);
                Matter.Body.applyForce(ent.body, ent.body.position, {
                    x: Math.cos(ang) * force,
                    y: Math.sin(ang) * force,
                });
            }
        }
    },

    // Radial damage around the boss to live entities, excluding the boss + a team.
    aoeDamage(op) {
        const bossPos = this.bossEntity.body.position;
        const r2 = op.radius * op.radius;
        for (const ent of this.entities) {
            if (!ent.alive || ent === this.bossEntity || ent.team === op.excludeTeam) continue;
            const d2 = dist2(bossPos.x, bossPos.y, ent.body.position.x, ent.body.position.y);
            if (d2 < r2) {
                const falloff = 1 - Math.sqrt(d2) / op.radius;
                resolveElementDamage(
                    ent,
                    op.damage * falloff,
                    this.game.effects,
                    this.bossEntity,
                    this.entities,
                );
            }
        }
    },

    // Create count radioactive floor zones at random x across the level.
    dangerZones(op) {
        for (let i = 0; i < op.count; i++) {
            const x = randRange(300, this.level.width - 300);
            this.dangerZones.push({
                x,
                y: op.y,
                radius: op.radius,
                damage: op.damage,
                duration: op.duration,
                age: 0,
                color: op.color,
            });
            this.game.effects.toxicCloud(x, op.y, op.color);
        }
    },

    // Apply a timed status effect to the boss.
    statusBuff(op) {
        this.bossEntity.addStatus(op.status, op.duration);
    },

    // Temporarily multiply boss speed + fire rate, restoring after op.duration.
    statBuff(op) {
        const boss = this.bossEntity;
        const origSpeed = boss.data.speed;
        const origFireRate = boss.fireRateMultiplier || 1;
        boss.data = { ...boss.data, speed: boss.data.speed * op.speedMult };
        boss.fireRateMultiplier = origFireRate * op.fireRateMult;
        const timer = this.setManagedTimeout(() => {
            if (boss.alive && boss.data) {
                boss.data = { ...boss.data, speed: origSpeed };
                boss.fireRateMultiplier = origFireRate;
            }
        }, op.duration * 1000);
        this.phaseTimers.push(timer);
    },

    // Visual/audio flourish at the boss position. color: 'boss' = boss's own color.
    effect(op) {
        const fx = this.game.effects;
        const pos = this.bossEntity.body.position;
        const color = op.color === 'boss' ? this.bossEntity.data.color : op.color;
        switch (op.kind) {
            case 'explosion':
                fx.explosion(pos.x, pos.y, color, op.count, op.speed);
                break;
            case 'sparks':
                fx.sparks(pos.x, pos.y, color, op.count);
                break;
            case 'glowPulse':
                fx.glowPulse(pos.x, pos.y, color, op.radius);
                break;
            case 'nuclear':
                fx.nuclearExplosion(pos.x, pos.y);
                break;
            case 'toxicCloud':
                fx.toxicCloud(pos.x, pos.y, color);
                break;
        }
    },
};

class AdventureMode {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.currentLevel = 0;
        this.currentWave = 0;
        this.level = null;

        this.entities = [];
        this.projectiles = [];
        this.pickups = [];
        this.staticBodies = [];

        this.waveTimer = 0;
        this.waveActive = false;
        this.bossSpawned = false;
        this.levelComplete = false;
        this.resultShown = false;
        this.state = 'idle';
        this.starFields = LEVELS.map((level, levelIndex) =>
            this.createStarField(level, levelIndex),
        );

        this.timers = [];
        this.unlockedLevels = [...DEFAULT_UNLOCKED_LEVELS];
        this.unlockedElements = new Set(STARTER_ELEMENTS);
        this.paused = false;

        // Upgrade state
        this.currentUpgradeChoices = [];
        this.appliedUpgrades = [];

        // Boss phase state
        this.bossEntity = null;
        this.bossPhaseTriggered = false;
        this.dangerZones = [];
        this.phaseTimers = [];

        // Pause toggle — Escape / P during active play.
        window.addEventListener('keydown', (e) => {
            if (!this.active) return;
            if (this.state !== 'playing') return;
            if (e.code === 'Escape' || e.code === 'KeyP') {
                e.preventDefault();
                this.togglePause();
            }
        });

        // Upgrade selection keyboard handler (capture phase to intercept before player weapon switching)
        window.addEventListener(
            'keydown',
            (e) => {
                if (!this.active || this.state !== 'upgrade_select') return;

                const upgradeKeys = ['Digit1', 'Digit2', 'Digit3'];
                const idx = upgradeKeys.indexOf(e.code);
                if (idx >= 0 && idx < this.currentUpgradeChoices.length) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.selectUpgrade(idx);
                    return;
                }

                // Block ESC/P during upgrade select
                if (e.code === 'Escape' || e.code === 'KeyP') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            },
            true,
        );

        // Load progress
        this.loadProgress();
    }

    togglePause() {
        this.paused = !this.paused;
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.classList.toggle('hidden', !this.paused);
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('elements_progress');
            if (saved) {
                const data = JSON.parse(saved);
                const progress = this.normalizeProgress(data);
                if (!progress) return;
                this.unlockedLevels = progress.levels;
                this.unlockedElements = new Set(progress.elements);

                // Unlock weapons
                if (progress.weapons) {
                    for (const key of progress.weapons) {
                        if (WEAPONS[key]) WEAPONS[key].unlocked = true;
                    }
                }

                // Unlock elements
                if (progress.elements) {
                    this.unlockedElements = new Set(progress.elements);
                }
                this.applyLevelElementUnlocks();
            }
        } catch (error) {
            warnDebug('Failed to load progress', error);
        }
    }

    saveProgress() {
        try {
            const unlockedWeapons = WEAPON_KEYS.filter((k) => WEAPONS[k].unlocked);
            localStorage.setItem(
                'elements_progress',
                JSON.stringify({
                    version: PROGRESS_SCHEMA_VERSION,
                    levels: this.unlockedLevels,
                    weapons: unlockedWeapons,
                    elements: Array.from(this.unlockedElements),
                }),
            );
        } catch (error) {
            warnDebug('Failed to save progress', error);
        }
    }

    normalizeProgress(data) {
        if (!data || typeof data !== 'object') return false;
        if (data.version !== undefined && data.version !== PROGRESS_SCHEMA_VERSION) return false;

        const levels =
            Array.isArray(data.levels) && data.levels.every((v) => typeof v === 'boolean')
                ? [...DEFAULT_UNLOCKED_LEVELS].map(
                      (fallback, index) => data.levels[index] ?? fallback,
                  )
                : [...DEFAULT_UNLOCKED_LEVELS];
        const elements =
            Array.isArray(data.elements) && data.elements.every((key) => ELEMENTS[key])
                ? data.elements
                : STARTER_ELEMENTS;
        const weapons =
            Array.isArray(data.weapons) && data.weapons.every((key) => WEAPONS[key])
                ? data.weapons
                : STARTER_WEAPONS;

        return { levels, elements, weapons };
    }

    createStarField(level, levelIndex) {
        const stars = [];
        for (let i = 0; i < 50; i++) {
            const seed = i * 127.1 + levelIndex * 311.7;
            stars.push({
                x: ((((Math.sin(seed) * 43758.5453) % 1) + 1) % 1) * level.width,
                y: ((((Math.sin(seed * 1.3) * 43758.5453) % 1) + 1) % 1) * 600,
                size: ((((Math.sin(seed * 0.7) * 43758.5453) % 1) + 1) % 1) * 2 + 0.5,
            });
        }
        return stars;
    }

    applyLevelElementUnlocks() {
        for (let i = 0; i < this.unlockedLevels.length; i++) {
            if (!this.unlockedLevels[i]) continue;
            const unlocks = LEVEL_UNLOCKS[i];
            if (unlocks) {
                for (const key of unlocks) this.unlockedElements.add(key);
            }
        }
    }

    isElementUnlocked(key) {
        return this.unlockedElements.has(key);
    }

    setManagedTimeout(fn, delay) {
        const id = setTimeout(() => {
            this.timers = this.timers.filter((timer) => timer !== id);
            fn();
        }, delay);
        this.timers.push(id);
        return id;
    }

    clearTimers() {
        for (const id of this.timers) {
            clearTimeout(id);
        }
        this.timers = [];
    }

    startLevel(levelIndex) {
        this.clearTimers();
        this.active = true;
        this.currentLevel = levelIndex;
        this.level = LEVELS[levelIndex];
        this.currentWave = 0;
        this.bossSpawned = false;
        this.levelComplete = false;
        this.gameOverTriggered = false;
        this.resultShown = false;
        this.state = 'playing';
        this.paused = false;
        this.appliedUpgrades = [];
        this.currentUpgradeChoices = [];
        this.bossEntity = null;
        this.bossPhaseTriggered = false;
        this.dangerZones = [];
        this.phaseTimers = [];
        this.hideUpgradePanel();
        this.entities = [];
        this.projectiles = [];
        this.pickups = [];

        // Setup world
        this.game.engine.gravity.y = 1;
        this.game.camera.setWorldBounds(-100, -300, this.level.width + 100, 900);

        // Create level geometry
        this.createLevelGeometry();

        // Spawn player with adventure health boost (3x)
        const playerEnt = this.game.player.spawn(this.game.engine, 200, 500);
        playerEnt.maxHealth = Math.round(playerEnt.maxHealth * 3);
        playerEnt.health = playerEnt.maxHealth;
        this.entities.push(playerEnt);

        // Show HUD
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('adventure-hud').classList.remove('hidden');
        document.getElementById('sandbox-toolbar').classList.add('hidden');

        this.updateHUD();

        // Start first wave after delay
        this.waveTimer = 2;
        this.waveActive = false;
        this.announceWave('GET READY');

        // Set level name
        document.getElementById('level-name').textContent = this.level.name;
    }

    createLevelGeometry() {
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        this.staticBodies = [];

        // Ground
        const ground = Bodies.rectangle(this.level.width / 2, 750, this.level.width + 200, 60, {
            isStatic: true,
            collisionFilter: {
                category: CAT.GROUND,
                mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
            },
            label: 'ground',
        });
        this.staticBodies.push(ground);

        // Ceiling (low enough to keep elements in the play area)
        const ceiling = Bodies.rectangle(this.level.width / 2, -30, this.level.width + 200, 60, {
            isStatic: true,
            collisionFilter: {
                category: CAT.WALL,
                mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
            },
            label: 'wall',
        });
        this.staticBodies.push(ceiling);

        // Walls (span from above ceiling to below ground)
        const wallL = Bodies.rectangle(-50, 370, 60, 900, {
            isStatic: true,
            collisionFilter: {
                category: CAT.WALL,
                mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
            },
            label: 'wall',
        });
        const wallR = Bodies.rectangle(this.level.width + 50, 370, 60, 900, {
            isStatic: true,
            collisionFilter: {
                category: CAT.WALL,
                mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
            },
            label: 'wall',
        });
        this.staticBodies.push(wallL, wallR);

        // Platforms
        for (const p of this.level.platforms) {
            const plat = Bodies.rectangle(p.x + p.w / 2, p.y, p.w, 20, {
                isStatic: true,
                collisionFilter: {
                    category: CAT.PLATFORM,
                    mask: CAT.ELEMENT | CAT.PLAYER | CAT.PROJECTILE,
                },
                label: 'platform',
            });
            this.staticBodies.push(plat);
        }

        Composite.add(this.game.engine.world, this.staticBodies);
    }

    spawnWave() {
        const waves = this.level.waves;

        if (this.currentWave < waves.length) {
            const wave = waves[this.currentWave];
            this.announceWave(`WAVE ${this.currentWave + 1}`);

            for (const group of wave.enemies) {
                for (let i = 0; i < group.count; i++) {
                    const x = randRange(this.level.width * 0.3, this.level.width * 0.9);
                    const y = randRange(200, 500);

                    const ent = new ElementEntity(this.game.engine, x, y, group.el, 'b');
                    // Scale enemy health down so they don't take forever to kill
                    ent.maxHealth = Math.round(ent.maxHealth * 0.6);
                    ent.health = ent.maxHealth;
                    ent.weapon = randChoice(STARTER_WEAPONS);
                    ent.ai = new AIController(ent, group.ai);
                    this.entities.push(ent);
                }
            }

            this.waveActive = true;
            this.currentWave++;
        } else if (!this.bossSpawned) {
            // Spawn boss
            this.spawnBoss();
        }

        this.updateWaveInfo();
    }

    spawnBoss() {
        const boss = this.level.boss;
        this.bossSpawned = true;
        this.announceWave(`BOSS: ${boss.name}`);

        const x = this.level.width * 0.7;
        const y = 400;

        const ent = new ElementEntity(this.game.engine, x, y, boss.el, 'b');
        ent.isBoss = true;
        ent.maxHealth = ELEMENTS[boss.el].health * boss.healthMult;
        ent.health = ent.maxHealth;
        ent.data = { ...ent.data, damage: ent.data.damage * boss.damageMult };
        ent.weapon = boss.weapon;
        ent.ai = new AIController(ent, boss.ai);

        // Make boss body bigger
        Matter.Body.scale(ent.body, 1.8, 1.8);
        ent.data = { ...ent.data, radius: ent.data.radius * 1.8 };

        this.entities.push(ent);
        this.waveActive = true;

        // Track boss entity for phase system
        this.bossEntity = ent;
        this.bossPhaseTriggered = false;

        this.updateWaveInfo();

        playSound('cannon');
        triggerScreenShake(10);
    }

    spawnHealthPickup(x, y, atomicNum, isBoss) {
        const healAmount = isBoss
            ? PICKUP_CONFIG.bossHeal
            : Math.min(PICKUP_CONFIG.maxHeal, PICKUP_CONFIG.baseHeal + Math.floor(atomicNum / 5));
        this.pickups.push({
            x,
            y,
            vy: 0,
            grounded: false,
            healAmount,
            lifetime: PICKUP_CONFIG.lifetime,
            age: 0,
            bobOffset: Math.random() * Math.PI * 2,
        });
    }

    announceWave(text) {
        // Remove old
        const old = document.querySelector('.wave-announce');
        if (old) old.remove();

        const el = document.createElement('div');
        el.className = 'wave-announce';
        el.textContent = text;
        document.body.appendChild(el);

        this.setManagedTimeout(() => el.remove(), 2500);
    }

    pickRandomUpgrades(count) {
        const pool = [...UPGRADE_POOL];
        const chosen = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
            const idx = randInt(0, pool.length - 1);
            chosen.push(pool[idx]);
            pool.splice(idx, 1);
        }
        return chosen;
    }

    showUpgradePanel() {
        const player = this.game.player;
        if (!player.entity || !player.entity.alive) return;

        this.state = 'upgrade_select';
        this.currentUpgradeChoices = this.pickRandomUpgrades(3);

        const panel = document.getElementById('upgrade-panel');
        panel.classList.remove('hidden');
        panel.innerHTML = '';

        const content = document.createElement('div');
        content.className = 'upgrade-panel-content';

        const title = document.createElement('h2');
        title.textContent = 'CHOOSE AN UPGRADE';
        content.appendChild(title);

        const cards = document.createElement('div');
        cards.className = 'upgrade-cards';

        this.currentUpgradeChoices.forEach((upgrade, idx) => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.style.setProperty('--i', idx);
            card.setAttribute('role', 'button');
            card.setAttribute(
                'aria-label',
                `${upgrade.name}: ${upgrade.description}. Press ${idx + 1} or click to select.`,
            );
            card.tabIndex = 0;

            const icon = document.createElement('span');
            icon.className = 'upgrade-icon';
            icon.textContent = upgrade.icon;

            const name = document.createElement('span');
            name.className = 'upgrade-name';
            name.textContent = upgrade.name;

            const desc = document.createElement('span');
            desc.className = 'upgrade-desc';
            desc.textContent = upgrade.description;

            const keyHint = document.createElement('span');
            keyHint.className = 'upgrade-key';
            keyHint.textContent = `[ ${idx + 1} ]`;

            card.appendChild(icon);
            card.appendChild(name);
            card.appendChild(desc);
            card.appendChild(keyHint);

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectUpgrade(idx);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectUpgrade(idx);
                }
            });

            cards.appendChild(card);
        });

        content.appendChild(cards);
        panel.appendChild(content);

        // Prevent clicks on panel background from doing anything
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                e.stopPropagation();
            }
        });
    }

    selectUpgrade(idx) {
        if (this.state !== 'upgrade_select') return;
        if (idx < 0 || idx >= this.currentUpgradeChoices.length) return;

        const upgrade = this.currentUpgradeChoices[idx];
        const player = this.game.player;
        if (!player.entity || !player.entity.alive) return;

        // Apply upgrade
        upgrade.apply(player.entity);
        this.appliedUpgrades.push(upgrade.id);

        // Play feedback sound
        playSound('pickup');

        // Update HUD immediately to reflect stat changes
        this.updateHUD();

        // Close panel and resume
        this.hideUpgradePanel();
        this.state = 'playing';
        this.waveTimer = 3;
    }

    hideUpgradePanel() {
        const panel = document.getElementById('upgrade-panel');
        if (panel) {
            panel.classList.add('hidden');
            panel.innerHTML = '';
        }
        this.currentUpgradeChoices = [];
    }

    // ── Boss Phase System ──

    announcePhase() {
        const old = document.querySelector('.phase-announce');
        if (old) old.remove();

        const el = document.createElement('div');
        el.className = 'phase-announce';
        el.textContent = 'PHASE 2!';
        document.body.appendChild(el);

        this.setManagedTimeout(() => {
            if (el.parentNode) el.remove();
        }, 2500);
    }

    triggerBossPhase() {
        const phase = this.level?.boss?.phase || [];
        for (const op of phase) {
            this.runPhaseOp(op);
        }

        // Universal phase effects: announcement + screen shake
        this.announcePhase();
        triggerScreenShake(15);
        playSound('cannon');
    }

    runPhaseOp(op) {
        const handler = PHASE_OPS[op.op];
        if (handler) handler.call(this, op);
    }

    getEntityCount() {
        return this.entities.filter((e) => e.alive).length;
    }

    update(dt) {
        if (!this.active) return;
        if (this.isSimulationPaused()) return;

        const player = this.game.player;

        // Update player
        const projCountBefore = this.projectiles.length;
        player.update(
            dt,
            this.game.camera,
            this.game.engine,
            this.game.effects,
            this.projectiles,
            this.entities,
        );

        // Apply projectile damage multiplier to new player projectiles
        if (player.entity && player.entity.damageMultiplier) {
            for (let i = projCountBefore; i < this.projectiles.length; i++) {
                const proj = this.projectiles[i];
                if (proj.shooter === player.entity && proj.wpn) {
                    proj.wpn = {
                        ...proj.wpn,
                        damage: proj.wpn.damage * player.entity.damageMultiplier,
                    };
                }
            }
        }

        // Health regen from shield/regen upgrade
        if (player.entity && player.entity.alive && player.entity.regenRate) {
            player.entity.health = Math.min(
                player.entity.maxHealth,
                player.entity.health + player.entity.regenRate * dt,
            );
        }

        // Camera follows player
        if (player.entity && player.entity.alive) {
            this.game.camera.follow(player.entity.body.position, dt);
        }

        // Update entities
        for (const ent of this.entities) {
            ent.update(dt, this.entities, this.game.effects);

            if (ent.ai && ent.alive) {
                ent.ai.update(
                    dt,
                    this.entities,
                    this.game.engine,
                    this.game.effects,
                    this.projectiles,
                );
            }

            // Kill enemies stuck above play area for too long
            if (ent.alive && ent.team === 'b' && ent.body.position.y < 100) {
                ent.stuckTimer = (ent.stuckTimer || 0) + dt;
                if (ent.stuckTimer > 4) {
                    ent.die(this.entities, this.game.effects);
                }
            } else if (ent.team === 'b') {
                ent.stuckTimer = 0;
            }
        }

        // Update projectiles
        for (const proj of this.projectiles) {
            proj.update(dt, this.game.effects);
            checkProjectileSweep(proj, this.entities, this.game.effects);
        }

        // Boss phase trigger check
        if (this.bossEntity && this.bossEntity.alive && !this.bossPhaseTriggered) {
            const healthPct = this.bossEntity.health / this.bossEntity.maxHealth;
            if (healthPct <= 0.5) {
                this.bossPhaseTriggered = true;
                this.triggerBossPhase();
            }
        }

        // Update danger zones (Uranium Emperor phase effect)
        for (let i = this.dangerZones.length - 1; i >= 0; i--) {
            const zone = this.dangerZones[i];
            zone.age += dt;
            if (zone.age >= zone.duration) {
                this.dangerZones.splice(i, 1);
                continue;
            }
            // Apply DOT to non-boss entities in zone
            const zoneR2 = zone.radius * zone.radius;
            for (const ent of this.entities) {
                if (!ent.alive || ent.team === 'b') continue;
                const d2 = dist2(zone.x, zone.y, ent.body.position.x, ent.body.position.y);
                if (d2 < zoneR2) {
                    ent.health -= zone.damage * dt;
                    if (Math.random() < dt * 3) {
                        this.game.effects.damageNumber(
                            ent.body.position.x,
                            ent.body.position.y,
                            zone.damage * dt * 3,
                            '#44ff88',
                        );
                    }
                    if (ent.health <= 0 && ent.alive) {
                        ent.die(this.entities, this.game.effects);
                    }
                }
            }
        }

        // Wave management
        if (!this.waveActive && !this.levelComplete) {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                this.spawnWave();
            }
        }

        // Check if wave is clear
        if (this.waveActive) {
            const enemies = this.entities.filter((e) => e.team === 'b' && e.alive);
            if (enemies.length === 0) {
                this.waveActive = false;

                if (this.bossSpawned) {
                    // Boss killed - level complete!
                    this.completeLevel();
                } else {
                    // Regular wave cleared - show upgrade panel
                    if (player.entity && player.entity.alive && !this.gameOverTriggered) {
                        this.showUpgradePanel();
                    } else {
                        this.waveTimer = 3;
                    }
                }
            }
        }

        // Clean up dead entities + score + health drops
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const ent = this.entities[i];
            if (!ent.alive && !ent.isPlayer) {
                // If dead entity is the boss, clean up phase effects
                if (ent === this.bossEntity) {
                    this.bossEntity = null;
                    this.dangerZones = [];
                }

                player.addScore(ent.data.atomicNum * 10);
                const scoreBonus = ent.special.scoreBonus || 0;
                if (scoreBonus) {
                    player.addScore(scoreBonus);
                    this.game.effects.scorePopup(
                        ent.body?.position.x || 0,
                        ent.body?.position.y || 0,
                        scoreBonus,
                    );
                }
                // Chance to spawn health pickup
                const px = ent.body?.position.x;
                const py = ent.body?.position.y;
                if (px != null && py != null) {
                    const isBoss = ent.isBoss === true;
                    if (isBoss || Math.random() < PICKUP_CONFIG.dropChance) {
                        this.spawnHealthPickup(px, py, ent.data.atomicNum, isBoss);
                    }
                }
                this.entities.splice(i, 1);
            }
        }

        this.projectiles = this.projectiles.filter((p) => p.alive);

        // Update health pickups
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            // Apply gravity until grounded
            if (!pickup.grounded) {
                pickup.vy += 800 * dt;
                pickup.y += pickup.vy * dt;
                if (pickup.y >= 710) {
                    pickup.y = 710;
                    pickup.vy = 0;
                    pickup.grounded = true;
                }
            }
            pickup.age += dt;
            if (pickup.age > pickup.lifetime) {
                this.pickups.splice(i, 1);
                continue;
            }
            // Check collection by player
            if (player.entity && player.entity.alive) {
                const pp = player.entity.body.position;
                const dx = pp.x - pickup.x;
                const dy = pp.y - pickup.y;
                if (dx * dx + dy * dy < 30 * 30) {
                    player.entity.health = Math.min(
                        player.entity.maxHealth,
                        player.entity.health + pickup.healAmount,
                    );
                    this.game.effects.healNumber(pickup.x, pickup.y, pickup.healAmount);
                    this.game.effects.pickupSparkle(pickup.x, pickup.y);
                    playSound('pickup');
                    this.pickups.splice(i, 1);
                }
            }
        }

        // Player death (only trigger once)
        if (
            player.entity &&
            !player.entity.alive &&
            !this.levelComplete &&
            !this.gameOverTriggered
        ) {
            this.gameOverTriggered = true;
            this.gameOver();
        }

        this.updateHUD();
    }

    completeLevel() {
        this.levelComplete = true;
        this.state = 'complete_pending';
        this.announceWave('LEVEL COMPLETE!');

        // Unlock next level
        if (this.currentLevel + 1 < LEVELS.length) {
            this.unlockedLevels[this.currentLevel + 1] = true;
        }

        const elementRewards = LEVEL_UNLOCKS[this.currentLevel + 1] || [];
        for (const key of elementRewards) {
            this.unlockedElements.add(key);
        }

        // Unlock weapon reward
        if (this.level.reward && WEAPONS[this.level.reward]) {
            WEAPONS[this.level.reward].unlocked = true;
            this.announceWeaponUnlock(this.level.reward);
        }

        this.saveProgress();

        this.setManagedTimeout(() => {
            if (this.active) this.showGameOver(true);
        }, 2000);
    }

    announceWeaponUnlock(weaponKey) {
        const wpn = WEAPONS[weaponKey];
        this.setManagedTimeout(() => {
            if (!this.active) return;
            this.announceWave(`NEW WEAPON: ${wpn.name}!`);
            playSound('pickup');
        }, 1500);
    }

    gameOver() {
        this.state = 'game_over_pending';
        this.setManagedTimeout(() => {
            if (this.active) this.showGameOver(false);
        }, 1500);
    }

    showGameOver(won) {
        this.resultShown = true;
        this.state = won ? 'complete' : 'game_over';
        const screen = document.getElementById('game-over-screen');
        const title = document.getElementById('game-over-title');
        const text = document.getElementById('game-over-text');

        title.textContent = won ? 'Level Complete!' : 'Game Over';
        text.textContent = `Score: ${this.game.player.score}`;

        screen.classList.remove('hidden');
    }

    isSimulationPaused() {
        return (
            this.paused ||
            this.resultShown ||
            this.state === 'complete' ||
            this.state === 'game_over' ||
            this.state === 'upgrade_select'
        );
    }

    updateHUD() {
        const player = this.game.player;
        if (!player.entity) return;

        if (!this.hudRefs) {
            this.hudRefs = {
                healthFill: document.getElementById('hud-health-fill'),
                healthText: document.getElementById('hud-health-text'),
                elementSymbol: document.getElementById('hud-element-symbol'),
                elementName: document.getElementById('hud-element-name'),
                weaponName: document.getElementById('hud-weapon-name'),
                score: document.getElementById('score-value'),
            };
        }
        const refs = this.hudRefs;
        const pct = Math.max(0, (player.entity.health / player.entity.maxHealth) * 100);
        refs.healthFill.style.width = pct + '%';
        refs.healthText.textContent = Math.max(0, Math.round(player.entity.health));
        refs.elementSymbol.textContent = player.entity.data.symbol;
        refs.elementSymbol.style.color = player.entity.data.color;
        refs.elementName.textContent = player.entity.data.name;
        refs.weaponName.textContent = WEAPONS[player.weaponKey].name;
        refs.score.textContent = player.score;
    }

    updateWaveInfo() {
        document.getElementById('wave-info').textContent = this.bossSpawned
            ? 'BOSS'
            : `Wave ${this.currentWave}/${this.level.waves.length}`;
    }

    render(ctx, camera) {
        if (!this.active) return;

        // Background
        this.renderLevel(ctx, camera);

        // Entities
        for (const ent of this.entities) {
            if (
                !isCircleOnScreen(ent.body.position.x, ent.body.position.y, ent.data.radius, camera)
            )
                continue;
            ent.render(ctx, camera);
        }

        // Health pickups
        for (const pickup of this.pickups) {
            const bob = Math.sin(pickup.age * 3 + pickup.bobOffset) * 5;
            if (!isCircleOnScreen(pickup.x, pickup.y, 24, camera)) continue;
            const screen = camera.worldToScreen(pickup.x, pickup.y + bob);
            const sx = screen.x;
            const sy = screen.y;
            const remaining = pickup.lifetime - pickup.age;
            const alpha = remaining < 2 ? remaining / 2 : 1;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Pulsing glow
            const glowSize = 14 + Math.sin(pickup.age * 5) * 4;
            ctx.fillStyle = 'rgba(68, 255, 68, 0.15)';
            ctx.beginPath();
            ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Green "+" symbol
            ctx.fillStyle = '#44ff44';
            ctx.strokeStyle = '#226622';
            ctx.lineWidth = 1.5;
            const s = 7;
            ctx.beginPath();
            ctx.rect(sx - s, sy - 2, s * 2, 4);
            ctx.rect(sx - 2, sy - s, 4, s * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        // Projectiles
        for (const proj of this.projectiles) {
            proj.render(ctx, camera);
        }

        // Danger zones (Uranium Emperor phase effect)
        for (const zone of this.dangerZones) {
            const remaining = zone.duration - zone.age;
            const alpha = remaining < 2 ? (remaining / 2) * 0.4 : 0.4;
            const pulse = 1 + Math.sin(zone.age * 4) * 0.1;
            const r = zone.radius * pulse;

            if (!isCircleOnScreen(zone.x, zone.y, r, camera)) continue;

            const screen = camera.worldToScreen(zone.x, zone.y);
            ctx.save();
            ctx.globalAlpha = alpha;

            // Outer glow
            const gradient = ctx.createRadialGradient(
                screen.x,
                screen.y,
                0,
                screen.x,
                screen.y,
                r * camera.zoom,
            );
            gradient.addColorStop(0, 'rgba(68,255,136,0.5)');
            gradient.addColorStop(0.6, 'rgba(68,255,136,0.15)');
            gradient.addColorStop(1, 'rgba(68,255,136,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r * camera.zoom, 0, Math.PI * 2);
            ctx.fill();

            // Border ring
            ctx.strokeStyle = '#44ff88';
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r * camera.zoom, 0, Math.PI * 2);
            ctx.stroke();

            // Radiation symbol hint
            ctx.globalAlpha = alpha * 0.3;
            ctx.font = `bold ${Math.round(16 * camera.zoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#44ff88';
            ctx.fillText('☢', screen.x, screen.y);

            ctx.restore();
        }

        // Boss shield aura (Gold Dynamo phase effect)
        if (
            this.bossEntity &&
            this.bossEntity.alive &&
            this.bossEntity.statuses.has('phase_shielded')
        ) {
            const pos = this.bossEntity.body.position;
            const r = this.bossEntity.data.radius;
            const screen = camera.worldToScreen(pos.x, pos.y);
            const shieldPulse = 1 + Math.sin(Date.now() * 0.005) * 0.15;

            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, (r + 12) * shieldPulse * camera.zoom, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,221,68,0.15)';
            ctx.fill();
            ctx.strokeStyle = '#ffdd44';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, (r + 12) * shieldPulse * camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    renderLevel(ctx, camera) {
        const level = this.level;

        // Ground
        ctx.fillStyle = level.groundColor;
        const ground = camera.worldToScreen(-100, 720);
        ctx.fillRect(ground.x, ground.y, (level.width + 200) * camera.zoom, 80 * camera.zoom);

        // Ground line
        ctx.strokeStyle = colorWithAlpha(level.groundColor, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        const groundEnd = camera.worldToScreen(level.width + 100, 720);
        ctx.moveTo(ground.x, ground.y);
        ctx.lineTo(groundEnd.x, groundEnd.y);
        ctx.stroke();

        // Platforms
        for (const p of level.platforms) {
            ctx.fillStyle = level.groundColor;
            const s = camera.worldToScreen(p.x, p.y);
            ctx.fillRect(s.x, s.y, p.w * camera.zoom, 20 * camera.zoom);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x, s.y, p.w * camera.zoom, 20 * camera.zoom);
        }

        // Background stars
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (const star of this.starFields[this.currentLevel]) {
            const sx = star.x - camera.x * 0.3;
            const sy = star.y - camera.y * 0.3;
            if (sx < -20 || sx > camera.width + 20 || sy < -20 || sy > camera.height + 20) continue;
            ctx.beginPath();
            ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    stop() {
        this.active = false;
        this.state = 'idle';
        this.resultShown = false;
        this.paused = false;
        this.hideUpgradePanel();
        this.appliedUpgrades = [];
        this.currentUpgradeChoices = [];
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.classList.add('hidden');
        this.clearTimers();
        document.querySelector('.wave-announce')?.remove();
        document.querySelector('.phase-announce')?.remove();

        // Clean up entities
        for (const ent of this.entities) {
            ent.destroy();
        }
        this.entities = [];

        for (const proj of this.projectiles) {
            proj.destroy();
        }
        this.projectiles = [];
        this.pickups = [];

        // Remove static bodies
        for (const b of this.staticBodies) {
            Matter.Composite.remove(this.game.engine.world, b);
        }
        this.staticBodies = [];

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('adventure-hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');

        this.game.player.reset();
    }
}
