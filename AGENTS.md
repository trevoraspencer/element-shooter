# AGENTS.md — Element Shooter

> **Authoritative guide for autonomous agents working on this codebase.**

---

## Project Overview

**Element Shooter** is a vanilla JavaScript 2D physics-based arena shooter that runs entirely in the browser as static files. The game features 46 chemical elements as playable characters, each with unique stats and special abilities derived from real chemistry. It uses **Matter.js** (v0.20.0, CDN-loaded, SRI-pinned) for 2D physics, **Canvas 2D API** for rendering, **Web Audio API** for synthesized sound effects, and **localStorage** for persisting settings and adventure mode progress.

The game has two modes:

- **Sandbox Mode** — Free-form arena with spawn, drag, delete, explode, freeze, gravity, slow-motion tools, team battles, and preset configurations.
- **Adventure Mode** — 7 levels with waves of enemies, boss fights with phase transitions, and an upgrade choice system between levels.

---

## Architecture

### No Build Step

The game runs by opening `index.html` in a browser. There is no npm, no bundler, no transpiler, and no build step at runtime. All source files are plain JavaScript loaded via `<script>` tags in a specific order.

### Script Loading Order

Scripts are loaded in `index.html` in dependency order. **This order matters** — later scripts depend on globals defined by earlier ones:

```
Matter.js (CDN)  →  utils.js  →  elements-data.js  →  effects.js  →  element-entity.js
→  weapons.js  →  player.js  →  ai.js  →  camera.js  →  sandbox.js  →  adventure.js
→  ui.js  →  main.js
```

### Browser-Only Execution

All code runs in the browser's global scope (`window`). There are no ES module imports in the game source files — cross-file dependencies are resolved at runtime through globally scoped declarations (`const`, `class`, `function` at the top level of each file).

### Dev Tooling Layer

A Node.js-based dev tooling layer sits on top of the game for linting, formatting, testing, and analysis. This layer is **dev-only** — it does not affect the game's runtime behavior. All dev dependencies are in `package.json` with exact version pins.

---

## File Structure

```
element-shooter/
├── index.html              — DOM scaffolding, CSS link, all <script> tags
├── css/
│   └── style.css           — All styles (~1,322 lines)
├── js/
│   ├── utils.js            — Constants, math/color helpers, audio system, settings
│   ├── elements-data.js    — 46 element definitions, damage resolution, specials
│   ├── effects.js          — Particle system, damage numbers, trails
│   ├── element-entity.js   — Game entity wrapping Matter.js body + game state
│   ├── weapons.js          — 6 weapon definitions, Projectile class
│   ├── player.js           — Input handling, movement, weapon firing
│   ├── ai.js               — AI controller with 4 behavior presets
│   ├── camera.js           — Smooth-follow camera with zoom
│   ├── sandbox.js          — Sandbox mode tools and preset battles
│   ├── adventure.js        — Adventure mode: 7 levels, boss phases, upgrades
│   ├── ui.js               — DOM UI wiring for menus, pickers, settings
│   └── main.js             — Game class, entry point, game loop
├── __tests__/
│   ├── setup.js            — Vitest setup: browser global mocks
│   ├── helpers/
│   │   └── load-source.js  — Helper to eval source files in test scope
│   ├── utils.test.js       — Tests for utils.js (math, color, audio, settings)
│   └── elements-data.test.js — Tests for elements-data.js (elements, damage, specials)
├── package.json            — Dev dependencies + npm scripts
├── eslint.config.js        — ESLint flat config for vanilla browser JS
├── vitest.config.js        — Vitest configuration
├── knip.json               — Dead code detection entry points
├── .prettierrc             — Prettier configuration
├── .env.example            — External dependency documentation
├── .husky/
│   └── pre-commit          — Pre-commit hook (lint-staged)
├── .gitignore
├── LICENSE
└── README.md
```

### Per-File Descriptions

| File                   | Description                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/utils.js`          | Global constants (`CAT` collision categories, `TEAM_COLORS`, `BODY_SLAM_CONFIG`, `SCREEN_SHAKE_CONFIG`, `DEFAULT_SETTINGS`, `SOUND_LIMITS`), math helpers (`lerp`, `clamp`, `dist`, `angle`), color helpers (`hexToRgb`, `rgbToHex`, `colorWithAlpha`), audio system (`playSound`, `setAudioMuted`, `setMasterVolume`), and settings management (`loadSettings`, `setReducedMotion`). |
| `js/elements-data.js`  | `ELEMENTS` object with 46 element definitions (symbol, name, atomicNum, color, mass, speed, health, damage, radius, special, desc). `STARTER_ELEMENTS`, `ALL_ELEMENT_KEYS`, `getElementsSorted()`, `SPECIALS` config, `STATUS_EFFECTS`, `getEffectivenessMultiplier()`, `resolveElementDamage()`, `WEAPONS` config, `LEVEL_UNLOCKS`.                                                  |
| `js/effects.js`        | `EffectsSystem` class managing particles, damage numbers, and trails. Handles spawn, update, render, and cleanup of visual effects. Supports reduced-motion mode with scaled-down particle counts.                                                                                                                                                                                    |
| `js/element-entity.js` | `ElementEntity` class wrapping a Matter.js physics body with game state (health, alive, team, invulnerability, status effects, flash timer). Handles damage application, death, status effect management, and rendering.                                                                                                                                                              |
| `js/weapons.js`        | `WEAPONS` object defining 6 weapons (photon, shotgun, cannon, beam, fusion, gravity) with stats (damage, speed, cooldown, knockback, radius, color). `Projectile` class for weapon projectiles with physics body and rendering.                                                                                                                                                       |
| `js/player.js`         | `Player` class handling keyboard/mouse input mapping, player entity creation, movement (WASD + jump), aiming, weapon firing with cooldown management, and score tracking.                                                                                                                                                                                                             |
| `js/ai.js`             | `AIController` class with 4 behavior presets (aggressive, defensive, wanderer, berserker). Controls enemy movement, jumping, weapon firing, target acquisition, and retreat behavior.                                                                                                                                                                                                 |
| `js/camera.js`         | `Camera` class with smooth-follow interpolation, zoom control, world bounds clamping, and coordinate transformation between world and screen space.                                                                                                                                                                                                                                   |
| `js/sandbox.js`        | `SandboxMode` class implementing sandbox tools (spawn, drag, delete, explode, freeze, gravity flip, slow-motion, clear). Includes preset battle configurations and entity count management.                                                                                                                                                                                           |
| `js/adventure.js`      | `AdventureMode` class with 7 levels, enemy waves, boss fights with phase transitions, upgrade choice system between levels, and progress persistence via localStorage.                                                                                                                                                                                                                |
| `js/ui.js`             | `UI` class wiring DOM elements to game logic: main menu, element picker, weapon picker, level select, sandbox toolbar, adventure HUD, settings, game over screen, and pause overlay.                                                                                                                                                                                                  |
| `js/main.js`           | `Game` class as the entry point. Initializes canvas, Matter.js engine, camera, effects, player, game modes, and UI. Runs the game loop via `requestAnimationFrame` with delta-time for frame-rate independence. Handles collisions and game state transitions.                                                                                                                        |

---

## Coding Conventions

### Class-Based OOP

All major components are ES6 classes: `Game`, `EffectsSystem`, `ElementEntity`, `Projectile`, `Player`, `AIController`, `Camera`, `SandboxMode`, `AdventureMode`, `UI`. Constructor initialization, instance methods, and `this`-based state management are the standard patterns.

### Global Scope

All source files run in browser global scope. Top-level `const`, `let`, `class`, and `function` declarations in one file are accessible to subsequently loaded files. There are no `import`/`export` statements in game source files (only test files use ES module imports).

### Script Loading Order

The order of `<script>` tags in `index.html` determines dependency resolution. Earlier files define globals that later files consume. Never reorder script tags without understanding the dependency chain.

### Collision Categories

Matter.js collision filtering uses hex bitmasks defined as `CAT` in `utils.js`:

| Category         | Hex Value | Purpose            |
| ---------------- | --------- | ------------------ |
| `CAT.GROUND`     | `0x0001`  | Ground platforms   |
| `CAT.ELEMENT`    | `0x0002`  | Element entities   |
| `CAT.PROJECTILE` | `0x0004`  | Weapon projectiles |
| `CAT.PLAYER`     | `0x0008`  | Player entity      |
| `CAT.SENSOR`     | `0x0010`  | Sensor colliders   |
| `CAT.WALL`       | `0x0020`  | Arena walls        |
| `CAT.PLATFORM`   | `0x0040`  | Floating platforms |

### Frame-Rate Independence

The game loop uses `requestAnimationFrame` with delta-time (`dt`) passed to all update methods. Never assume a fixed frame rate — all movement, physics, cooldowns, and timers must be scaled by `dt`.

### Constants and Configuration

Game configuration is centralized in constant objects at the top of files:

- `CAT`, `TEAM_COLORS`, `BODY_SLAM_CONFIG`, `SCREEN_SHAKE_CONFIG`, `DEFAULT_SETTINGS`, `SOUND_LIMITS` in `utils.js`
- `ELEMENTS`, `SPECIALS`, `STATUS_EFFECTS`, `WEAPONS`, `LEVEL_UNLOCKS` in `elements-data.js`
- `AI_BEHAVIORS` in `ai.js`
- `SANDBOX_PRESETS` in `sandbox.js`
- `BOSS_PHASE_CONFIG` in `adventure.js`

---

## Dev Tooling Commands

All commands are run via npm. Dev dependencies must be installed first with `npm install`.

| Command                    | Description                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`             | Run ESLint on all files in `js/`. Reports errors and warnings. Exits 0 on clean codebase.                               |
| `npm run lint:fix`         | Run ESLint with auto-fix on all files in `js/`. Applies safe fixes automatically.                                       |
| `npm run format`           | Run Prettier to format JS, CSS, and HTML files in place.                                                                |
| `npm run format:check`     | Run Prettier in check mode (no changes). Verifies all files are already formatted.                                      |
| `npm test`                 | Run Vitest unit tests. Executes all `*.test.js` files in `__tests__/`. Must complete in under 10 seconds.               |
| `npm run check:dead-code`  | Run knip dead code detection. Reports unused exports and dependencies. Uses `--no-exit-code` to report without failing. |
| `npm run check:complexity` | Run ESLint with complexity rule set to warn at threshold 20. Reports cyclomatic complexity metrics.                     |

### Pre-Commit Hooks

Husky runs `lint-staged` on every commit. Lint-staged configuration in `package.json`:

- **`*.js` files**: ESLint fix + Prettier write
- **`*.{css,html,md}` files**: Prettier write

---

## Testing

### Test Runner

**Vitest** is the test runner. Configuration is in `vitest.config.js` with `globals: true` and setup file `__tests__/setup.js`.

### Test File Location and Naming

- Test files live in `__tests__/` at the repository root
- Naming convention: `*.test.js` (no `.spec.js` files)
- Test helpers are in `__tests__/helpers/`

### Test Setup

- `__tests__/setup.js` mocks browser globals (`localStorage`, `document`, `window`) needed by source files
- `__tests__/helpers/load-source.js` provides a `loadSource()` function that evaluates source files (written for browser global scope) in a test function scope, extracts top-level declarations, and places them on `globalThis` for cross-file dependency resolution

### What's Tested

- **`utils.test.js`** — Math helpers (`lerp`, `clamp`, `dist`, `angle`), color helpers (`hexToRgb`, `rgbToHex`, `colorWithAlpha`), collision categories (`CAT`), configuration constants (`BODY_SLAM_CONFIG`, `DEFAULT_SETTINGS`, `SOUND_LIMITS`, `SCREEN_SHAKE_CONFIG`), settings functions (`loadSettings`, `setAudioMuted`, `setMasterVolume`, `setReducedMotion`)
- **`elements-data.test.js`** — Element definitions (`ELEMENTS` structure, starter elements, all element keys), sorting (`getElementsSorted`), special configs (`SPECIALS`, `getSpecialConfig`), effectiveness multipliers (`getEffectivenessMultiplier`), damage resolution (`resolveElementDamage` with armor, shield, heavy, status effects, stacking), level unlocks (`LEVEL_UNLOCKS`), status effects (`STATUS_EFFECTS`)

### Running Tests

```bash
npm test              # Run all tests once
npx vitest            # Run tests in watch mode
npx vitest run        # Same as npm test
```

### Writing New Tests

When adding tests for a source file that uses browser globals or cross-file dependencies:

1. Use `loadSource('js/filename.js')` from `__tests__/helpers/load-source.js` to evaluate the source file
2. Load dependency files first (e.g., load `utils.js` before `elements-data.js`)
3. Mock any browser APIs not covered by `setup.js`
4. Focus on pure functions and computed values — avoid testing browser-specific code without mocking

---

## Naming Conventions

### Functions and Variables

**camelCase** for functions, local variables, and object properties. Enforced by ESLint `camelcase` rule (warn level).

```javascript
// Correct
function applyDamage() {}
const playerSpeed = 5;
const config = { maxHealth: 100 };

// Incorrect (will produce a warning)
function apply_damage() {}
const Player_Speed = 5;
```

### Classes

**PascalCase** for class names: `Game`, `EffectsSystem`, `ElementEntity`, `Projectile`, `Player`, `AIController`, `Camera`, `SandboxMode`, `AdventureMode`, `UI`.

### Constants

**UPPER_SNAKE_CASE** for top-level constant objects: `CAT`, `TEAM_COLORS`, `BODY_SLAM_CONFIG`, `SCREEN_SHAKE_CONFIG`, `DEFAULT_SETTINGS`, `SOUND_LIMITS`, `ELEMENTS`, `SPECIALS`, `STATUS_EFFECTS`, `WEAPONS`, `LEVEL_UNLOCKS`, `INPUT`, `AI_BEHAVIORS`, `SANDBOX_PRESETS`, `BOSS_PHASE_CONFIG`, `STARTER_ELEMENTS`, `ALL_ELEMENT_KEYS`.

### Files

**kebab-case** for filenames, matching existing convention: `elements-data.js`, `element-entity.js`. Enforced by ESLint `unicorn/filename-case` rule (warn level).

### Test Files

Match the source file name with `.test.js` suffix: `utils.js` → `utils.test.js`, `elements-data.js` → `elements-data.test.js`.

---

## Dev Dependencies

All dev dependencies use **exact version pins** (no `^` or `~` ranges):

| Package                 | Version | Purpose                               |
| ----------------------- | ------- | ------------------------------------- |
| `eslint`                | 9.39.4  | JavaScript linter                     |
| `@eslint/js`            | 9.39.4  | ESLint built-in rules                 |
| `eslint-plugin-unicorn` | 64.0.0  | Naming conventions and best practices |
| `globals`               | 17.6.0  | Browser/global variable definitions   |
| `prettier`              | 3.8.3   | Code formatter                        |
| `vitest`                | 3.2.4   | Unit test runner                      |
| `husky`                 | 9.1.7   | Git hook management                   |
| `lint-staged`           | 16.1.6  | Run linters on staged files           |
| `knip`                  | 6.16.0  | Dead code detection                   |

---

## External Dependencies

| Dependency    | Version          | Source                     | Loading                       |
| ------------- | ---------------- | -------------------------- | ----------------------------- |
| Matter.js     | 0.20.0           | CDN (cdnjs)                | `<script>` tag with SRI hash  |
| Google Fonts  | N/A              | CDN (fonts.googleapis.com) | `<link>` tags with preconnect |
| Canvas 2D API | Browser built-in | Browser                    | Native                        |
| Web Audio API | Browser built-in | Browser                    | Native                        |
| localStorage  | Browser built-in | Browser                    | Native                        |

External dependency versions and SRI hashes are documented in `.env.example`.

---

## Key Rules for Making Changes

1. **Never change game logic** — Only formatting changes via Prettier are allowed on existing files
2. **Never add runtime dependencies** — All new packages must be dev-only
3. **Never introduce a build step** — The game runs as static files
4. **Respect script loading order** — Dependencies flow from top to bottom in `index.html`
5. **Use delta-time for all time-based operations** — Never assume a fixed frame rate
6. **Run the full pipeline before committing** — `npm run lint && npm run format:check && npm test`
