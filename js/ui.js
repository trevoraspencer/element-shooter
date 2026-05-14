// UI: menus, pickers, toolbar wiring
class UI {
    constructor(game) {
        this.game = game;
        this.setupMainMenu();
        this.setupElementPicker();
        this.setupWeaponPicker();
        this.setupLevelSelect();
        this.setupSandboxToolbar();
        this.setupGameOver();
        this.setupSettings();
    }

    setupMainMenu() {
        document.getElementById('btn-sandbox').addEventListener('click', () => {
            this.hideAll();
            this.game.startSandbox();
        });

        document.getElementById('btn-adventure').addEventListener('click', () => {
            this.hideAll();
            this.showElementPicker('adventure');
        });
    }

    setupElementPicker() {
        this.refreshElementGrid();

        document.getElementById('btn-picker-back').addEventListener('click', () => {
            this.hideAll();
            this.showMainMenu();
        });
    }

    refreshElementGrid() {
        const grid = document.getElementById('element-grid');
        grid.replaceChildren();

        const sorted = getElementsSorted();
        sorted.forEach((key, index) => {
            const el = ELEMENTS[key];
            const unlocked = this.game.adventure.isElementUnlocked(key);
            const card = document.createElement('div');
            card.className = 'element-card' + (unlocked ? '' : ' locked');
            card.style.setProperty('--el-color', el.color);
            const rgb = hexToRgb(el.color);
            card.style.setProperty('--el-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
            card.style.setProperty('--i', index);
            card.append(
                this.makeSpan('atomic-num', el.atomicNum),
                this.makeSpan('symbol', el.symbol, { color: el.color }),
                this.makeSpan('name', el.name),
                this.makeSpan('stats', `HP:${el.health} SPD:${el.speed} DMG:${el.damage}`),
                this.makeSpan('stats', el.special),
            );
            this.makeActivatable(card, unlocked, `${el.name}, ${el.special}`, () => {
                this.game.player.elementKey = key;
                this.hideAll();
                this.showWeaponPicker();
            });
            grid.appendChild(card);
        });
    }

    setupWeaponPicker() {
        this.refreshWeaponGrid();

        document.getElementById('btn-weapon-back').addEventListener('click', () => {
            this.hideAll();
            this.showElementPicker('adventure');
        });
    }

    refreshWeaponGrid() {
        const grid = document.getElementById('weapon-grid');
        grid.replaceChildren();

        WEAPON_KEYS.forEach((key, index) => {
            const wpn = WEAPONS[key];
            const card = document.createElement('div');
            card.className = 'weapon-card' + (wpn.unlocked ? '' : ' locked');
            card.style.setProperty('--i', index);
            card.append(
                this.makeSpan('weapon-icon', wpn.icon),
                this.makeSpan('weapon-name', wpn.name),
                this.makeSpan('weapon-desc', wpn.desc),
                this.makeSpan('weapon-desc', `DMG:${wpn.damage} CD:${wpn.cooldown}s`),
            );
            this.makeActivatable(card, wpn.unlocked, `${wpn.name}, ${wpn.desc}`, () => {
                this.game.player.weaponKey = key;
                this.hideAll();
                this.showLevelSelect();
            });
            grid.appendChild(card);
        });
    }

    setupLevelSelect() {
        this.refreshLevelGrid();

        document.getElementById('btn-level-back').addEventListener('click', () => {
            this.hideAll();
            this.showWeaponPicker();
        });
    }

    refreshLevelGrid() {
        const grid = document.getElementById('level-grid');
        grid.replaceChildren();

        const adventure = this.game.adventure;

        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const unlocked = adventure.unlockedLevels[i];

            const card = document.createElement('div');
            card.className = 'level-card' + (unlocked ? '' : ' locked');
            card.style.setProperty('--i', i);
            const info = document.createElement('div');
            info.className = 'level-info';
            info.append(
                this.makeDiv('level-title', level.name),
                this.makeDiv('level-desc', level.desc),
            );
            if (level.reward) {
                info.append(
                    this.makeDiv('level-desc', `Reward: ${WEAPONS[level.reward]?.name || ''}`, {
                        color: '#ffd700',
                    }),
                );
            }
            card.append(this.makeSpan('level-num', i + 1), info);
            this.makeActivatable(card, unlocked, `Level ${i + 1}: ${level.name}`, () => {
                this.hideAll();
                this.game.startAdventure(i);
            });
            grid.appendChild(card);
        }
    }

    makeActivatable(el, enabled, label, onActivate) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', label);
        if (enabled) {
            el.tabIndex = 0;
            el.addEventListener('click', onActivate);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onActivate();
                }
            });
        } else {
            el.setAttribute('aria-disabled', 'true');
        }
    }

    setupSandboxToolbar() {
        // Tool buttons
        document.querySelectorAll('[data-tool]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                const sandbox = this.game.sandbox;

                switch (tool) {
                    case 'spawn':
                    case 'drag':
                    case 'delete':
                    case 'explode':
                    case 'freeze':
                        // Deactivate others
                        document.querySelectorAll('[data-tool]').forEach((b) => {
                            if (
                                ['spawn', 'drag', 'delete', 'explode', 'freeze'].includes(
                                    b.dataset.tool,
                                )
                            ) {
                                b.classList.remove('active');
                            }
                        });
                        btn.classList.add('active');
                        sandbox.currentTool = tool;
                        break;
                    case 'slowmo':
                        sandbox.toggleSlowMo();
                        btn.classList.toggle('active');
                        break;
                    case 'gravity':
                        sandbox.toggleGravity();
                        btn.classList.toggle('active');
                        break;
                    case 'clear':
                        sandbox.clearAll();
                        break;
                }
            });
        });

        // Team buttons
        document.querySelectorAll('[data-team]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document
                    .querySelectorAll('[data-team]')
                    .forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.game.sandbox.currentTeam = btn.dataset.team;
            });
        });

        // Element select dropdown
        const elemSelect = document.getElementById('sandbox-element-select');
        for (const key of getElementsSorted()) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${ELEMENTS[key].symbol} - ${ELEMENTS[key].name}`;
            elemSelect.appendChild(opt);
        }
        elemSelect.addEventListener('change', () => {
            this.game.sandbox.selectedElement = elemSelect.value;
        });

        // Weapon select dropdown
        const wpnSelect = document.getElementById('sandbox-weapon-select');
        for (const key of WEAPON_KEYS) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = WEAPONS[key].name;
            wpnSelect.appendChild(opt);
        }
        wpnSelect.addEventListener('change', () => {
            this.game.sandbox.selectedWeapon = wpnSelect.value;
        });

        // Menu return
        document.getElementById('btn-sandbox-menu').addEventListener('click', () => {
            this.game.stopMode();
            this.showMainMenu();
        });

        // Preset buttons
        document.querySelectorAll('[data-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.preset, 10);
                this.game.sandbox.executePreset(index);
            });
        });

        document.getElementById('btn-adventure-menu').addEventListener('click', () => {
            this.game.stopMode();
            this.showMainMenu();
        });
    }

    setupGameOver() {
        document.getElementById('btn-retry').addEventListener('click', () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            const level = this.game.adventure.currentLevel;
            this.game.stopMode();
            this.game.startAdventure(level);
        });

        document.getElementById('btn-to-menu').addEventListener('click', () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            this.game.stopMode();
            this.showMainMenu();
        });
    }

    setupSettings() {
        const muted = document.getElementById('setting-muted');
        const reducedMotion = document.getElementById('setting-reduced-motion');
        const volume = document.getElementById('setting-volume');
        if (!muted || !reducedMotion || !volume) return;

        muted.checked = gameSettings.muted;
        reducedMotion.checked = gameSettings.reducedMotion;
        volume.value = gameSettings.masterVolume;
        document.body.classList.toggle('reduced-motion', gameSettings.reducedMotion);

        muted.addEventListener('change', () => setAudioMuted(muted.checked));
        reducedMotion.addEventListener('change', () => setReducedMotion(reducedMotion.checked));
        volume.addEventListener('input', () => setMasterVolume(volume.value));
    }

    makeSpan(className, text, style = null) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        if (style?.color) span.style.color = style.color;
        return span;
    }

    makeDiv(className, text, style = null) {
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        if (style?.color) div.style.color = style.color;
        return div;
    }

    showMainMenu() {
        this.hideAll();
        document.getElementById('main-menu').classList.remove('hidden');
    }

    showElementPicker() {
        this.refreshElementGrid();
        document.getElementById('element-picker').classList.remove('hidden');
    }

    showWeaponPicker() {
        this.refreshWeaponGrid();
        document.getElementById('weapon-picker').classList.remove('hidden');
    }

    showLevelSelect() {
        this.refreshLevelGrid();
        document.getElementById('level-select').classList.remove('hidden');
    }

    hideAll() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('element-picker').classList.add('hidden');
        document.getElementById('weapon-picker').classList.add('hidden');
        document.getElementById('level-select').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
    }
}
