# Elements

A 2D physics sandbox and arena shooter built around the periodic table. Vanilla HTML/CSS/JS, no build step. Open `index.html` and play.

## Features

- 46 playable elements with stats derived from real chemistry — light elements are fast and fragile, heavy ones are slow and tanky
- 6 weapons (photon blaster, shotgun, cannon, beam, fusion, gravity well)
- 14 element specials: aura damage, projectile reflect, chain lightning, explosive death, magnetic pull, status effects, and more
- Element effectiveness matrix — burn vs. freeze, corrosive vs. armor, electric vs. shield, etc.
- **Sandbox mode**: free spawning, team battles (A/B/Neutral), drag, explode, freeze, gravity flip, slow-mo. 50-entity cap. Battle presets for instant chaos (Tiny H vs Giant Pu, Magnet War, Noble Gas Escape, Boss Rush, Random Army).
- **Adventure mode**: 7 hand-built levels with 4 enemy waves + a boss each, weapon rewards on completion, progress saved to `localStorage`. Upgrade choices between waves — pick from 7 roguelike upgrades (max health, speed, jump, fire rate, damage, regen, special cooldown). Boss phase transitions at 50% health with unique effects (minion spawns, magnetic pull, decoy clones, radioactive zones, shields, speed bursts).
- AI state machine with four behavior presets (aggressive, defensive, wanderer, berserker)
- Synthesized audio via Web Audio API — no audio files in the repo
- Reduced-motion setting honored across particles, screen shake, and animations

## Running

The game is plain static files. Any of the following will work:

```bash
# Easiest — just open the file
open index.html

# Or serve over HTTP (recommended if your browser blocks file:// for any feature)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Matter.js is pulled from a CDN at runtime, so an internet connection is required for the first load.

No `npm install` is needed just to play — dev dependencies are only required for linting, formatting, and testing during development.

## Controls

| Action          | Input                         |
| --------------- | ----------------------------- |
| Move            | `A` / `D` or arrow keys       |
| Jump            | `W`, `Space`, or up arrow     |
| Aim / fire      | Mouse                         |
| Switch weapon   | `1` – `6`                     |
| Pause           | `Esc` or `P` (adventure mode) |
| Menu navigation | `Tab`, `Enter`, arrow keys    |

Sandbox tools (spawn, drag, delete, explode, freeze, gravity flip, slow-mo, clear) live on the in-game toolbar.

## Browser compatibility

Targets evergreen browsers (Chrome, Firefox, Safari, Edge — last two major versions). Uses:

- ES2017+ syntax (classes, arrow functions, template literals)
- Canvas 2D
- Web Audio API
- `requestAnimationFrame` and `localStorage`

No transpilation, no polyfills.

## Project structure

```
index.html              # script tags, DOM scaffolding
css/style.css           # all styles
js/
  utils.js              # collision categories, screen shake, audio, settings
  elements-data.js      # ELEMENTS, AURA_CONFIG, STATUS_EFFECTS, effectiveness matrix
  effects.js            # particles, trails, damage numbers
  element-entity.js     # entity wrapping a Matter.js body
  weapons.js            # WEAPONS table and Projectile class
  player.js             # input handling
  ai.js                 # AI state machine and behavior presets
  camera.js             # smooth-follow camera with world bounds
  sandbox.js            # SandboxMode
  adventure.js          # AdventureMode, levels, save/load
  ui.js                 # menus, pickers, toolbar wiring
  main.js               # Game class, core loop, collision dispatch
```

State lives on a central `Game` instance that owns the physics engine, camera, effects, player, and the current mode. Only one mode (sandbox or adventure) is active at a time.

## Development

### Setup

```bash
npm install
```

This installs dev-only dependencies (ESLint, Prettier, Vitest, Husky, lint-staged, knip). The game itself has no runtime dependencies beyond Matter.js from the CDN.

### Available commands

| Command                    | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `npm run lint`             | Check code quality with ESLint                   |
| `npm run lint:fix`         | Auto-fix lint issues                             |
| `npm run format`           | Format JS, CSS, and HTML files with Prettier     |
| `npm run format:check`     | Verify all files are formatted (no changes)      |
| `npm test`                 | Run unit tests with Vitest                       |
| `npm run check:dead-code`  | Detect unused exports and dependencies with knip |
| `npm run check:complexity` | Report cyclomatic complexity metrics             |

### Pre-commit hooks

[Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-config/lint-staged) run automatically on every commit:

- **`*.js` files** — ESLint fix + Prettier write
- **`*.{css,html,md}` files** — Prettier write

### Testing

Tests live in `__tests__/` and use [Vitest](https://vitest.dev/). Coverage includes:

- **`utils.test.js`** — math helpers, color helpers, collision categories, configuration constants, settings functions
- **`elements-data.test.js`** — element definitions, sorting, special configs, effectiveness multipliers, damage resolution, level unlocks, status effects

```bash
npm test              # run all tests once
npx vitest            # watch mode
```

## License

[MIT](LICENSE).
