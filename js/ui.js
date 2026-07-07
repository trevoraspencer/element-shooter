// UI: menus, pickers, toolbar wiring

// Sandbox tools that are mutually-exclusive selections (vs. toggles/actions)
const SELECTABLE_TOOLS = ['spawn', 'drag', 'delete', 'explode', 'freeze', 'place'];
const GRID_NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
const GRID_NAV_CARD_SELECTOR = '.element-card, .weapon-card, .level-card';

function getGridNavigationIndex(currentIndex, itemCount, columns, key) {
    if (itemCount <= 0) return -1;

    const safeColumns = Math.max(1, columns || 1);
    const lastIndex = itemCount - 1;

    if (key === 'Home') return 0;
    if (key === 'End') return lastIndex;
    if (key === 'ArrowLeft') return Math.max(0, currentIndex - 1);
    if (key === 'ArrowRight') return Math.min(lastIndex, currentIndex + 1);
    if (key === 'ArrowUp') return Math.max(0, currentIndex - safeColumns);
    if (key === 'ArrowDown') return Math.min(lastIndex, currentIndex + safeColumns);

    return currentIndex;
}

function focusElement(el) {
    if (!el) return;

    try {
        el.focus({ preventScroll: true });
    } catch {
        el.focus();
    }
}

class UI {
    constructor(game) {
        this.game = game;
        this.activePickerBack = null;
        this.setupMainMenu();
        this.setupElementPicker();
        this.setupWeaponPicker();
        this.setupLevelSelect();
        this.setupSandboxToolbar();
        this.setupGameOver();
        this.setupSettings();
        this.setupOverlayShortcuts();
        this.showMainMenu();
    }

    setupMainMenu() {
        document.getElementById('btn-sandbox').addEventListener('click', () => {
            this.hideAll();
            this.game.startSandbox();
        });

        document.getElementById('btn-adventure').addEventListener('click', () => {
            this.hideAll();
            this.showElementPicker();
        });
    }

    setupElementPicker() {
        this.setupGridNavigation('element-grid');
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
            card.style.setProperty('--el-glow', colorWithAlpha(el.color, 0.15));
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

        this.resetGridNavigation(grid);
    }

    setupWeaponPicker() {
        this.setupGridNavigation('weapon-grid');
        this.refreshWeaponGrid();

        document.getElementById('btn-weapon-back').addEventListener('click', () => {
            this.hideAll();
            this.showElementPicker();
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

        this.resetGridNavigation(grid);
    }

    setupLevelSelect() {
        this.setupGridNavigation('level-grid');
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
            const record = adventure.getLevelRecord(i);
            if (record.completions > 0) {
                info.append(
                    this.makeDiv('level-desc', `Best: ${adventure.getLevelRecordSummary(i)}`, {
                        color: '#88ffcc',
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

        this.resetGridNavigation(grid);
    }

    makeActivatable(el, enabled, label, onActivate) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', label);
        if (enabled) {
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
        el.tabIndex = -1;
    }

    setupGridNavigation(gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        grid.addEventListener('keydown', (e) => {
            if (!GRID_NAV_KEYS.includes(e.key)) return;

            const cards = this.getEnabledGridCards(grid);
            const currentCard = e.target.closest(GRID_NAV_CARD_SELECTOR);
            const currentIndex = cards.indexOf(currentCard);
            if (currentIndex < 0) return;

            e.preventDefault();
            const columns = this.getGridColumnCount(grid);
            const nextIndex = getGridNavigationIndex(currentIndex, cards.length, columns, e.key);
            const nextCard = cards[nextIndex];
            if (!nextCard || nextCard === currentCard) return;

            this.setGridActiveCard(grid, nextCard);
            focusElement(nextCard);
        });
    }

    getEnabledGridCards(grid) {
        return [...grid.querySelectorAll(GRID_NAV_CARD_SELECTOR)].filter(
            (card) => card.getAttribute('aria-disabled') !== 'true',
        );
    }

    getGridColumnCount(grid) {
        if (grid.classList.contains('level-grid')) return 1;

        const style = window.getComputedStyle?.(grid);
        const template = style?.gridTemplateColumns || '';
        const columns = template.split(' ').filter(Boolean).length;
        return Math.max(1, columns || 1);
    }

    resetGridNavigation(grid) {
        const cards = this.getEnabledGridCards(grid);
        this.setGridActiveCard(grid, cards[0]);
    }

    setGridActiveCard(grid, activeCard) {
        for (const card of this.getEnabledGridCards(grid)) {
            card.tabIndex = card === activeCard ? 0 : -1;
        }
    }

    focusGrid(gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const cards = this.getEnabledGridCards(grid);
        const activeCard = cards.find((card) => card.tabIndex === 0) || cards[0];
        this.setGridActiveCard(grid, activeCard);
        focusElement(activeCard);
    }

    setupSandboxToolbar() {
        // Tool buttons
        document.querySelectorAll('[data-tool]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                const sandbox = this.game.sandbox;

                if (SELECTABLE_TOOLS.includes(tool)) {
                    // Deactivate other selectable tools
                    document.querySelectorAll('[data-tool]').forEach((b) => {
                        if (SELECTABLE_TOOLS.includes(b.dataset.tool)) {
                            b.classList.remove('active');
                        }
                    });
                    btn.classList.add('active');
                    sandbox.currentTool = tool;
                } else if (tool === 'slowmo') {
                    sandbox.toggleSlowMo();
                    btn.classList.toggle('active');
                } else if (tool === 'gravity') {
                    sandbox.toggleGravity();
                    btn.classList.toggle('active');
                } else if (tool === 'clear') {
                    sandbox.clearAll();
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

        // Structure select dropdown (creator mode)
        const structSelect = document.getElementById('sandbox-structure-select');
        for (const key of STRUCTURE_KEYS) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${STRUCTURES[key].icon} ${STRUCTURES[key].name}`;
            structSelect.appendChild(opt);
        }
        structSelect.addEventListener('change', () => {
            this.game.sandbox.selectedStructure = structSelect.value;
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

    setupOverlayShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !this.activePickerBack) return;

            e.preventDefault();
            this.activePickerBack();
        });
    }

    makeEl(tag, className, text, style = null) {
        const el = document.createElement(tag);
        el.className = className;
        el.textContent = text;
        if (style?.color) el.style.color = style.color;
        return el;
    }

    makeSpan(className, text, style = null) {
        return this.makeEl('span', className, text, style);
    }

    makeDiv(className, text, style = null) {
        return this.makeEl('div', className, text, style);
    }

    showMainMenu() {
        this.hideAll();
        this.setOverlayVisible('main-menu', true);
        this.activePickerBack = null;
        focusElement(document.getElementById('btn-sandbox'));
    }

    showElementPicker() {
        this.hideAll();
        this.refreshElementGrid();
        this.setOverlayVisible('element-picker', true);
        this.activePickerBack = () => this.showMainMenu();
        this.focusGrid('element-grid');
    }

    showWeaponPicker() {
        this.hideAll();
        this.refreshWeaponGrid();
        this.setOverlayVisible('weapon-picker', true);
        this.activePickerBack = () => this.showElementPicker();
        this.focusGrid('weapon-grid');
    }

    showLevelSelect() {
        this.hideAll();
        this.refreshLevelGrid();
        this.setOverlayVisible('level-select', true);
        this.activePickerBack = () => this.showWeaponPicker();
        this.focusGrid('level-grid');
    }

    hideAll() {
        this.activePickerBack = null;
        this.setOverlayVisible('main-menu', false);
        this.setOverlayVisible('element-picker', false);
        this.setOverlayVisible('weapon-picker', false);
        this.setOverlayVisible('level-select', false);
        this.setOverlayVisible('game-over-screen', false);
    }

    setOverlayVisible(id, visible) {
        const overlay = document.getElementById(id);
        if (!overlay) return;

        overlay.classList.toggle('hidden', !visible);
        overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
}
