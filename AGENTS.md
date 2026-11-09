# AGENTS.md

Rules for every agent and human working on CORE BREACH: PIT. Read this first, every session.

## The project
- Retro-pixel boss-rush arena, spinoff of Core-Breach: Zero. Static browser game: no build step, no backend, no accounts, no network calls.
- `engine.js` is a pure engine (no `document`, `window` or `localStorage` in `engine.js`, `chars.js`, `bosses.js`, `palette.js`). Bosses are data interpreted by the engine — never hardcode a boss's logic inside the engine.

## House rules
- **`npm test` must pass before every push to `main`.** It runs the PIT sim suite. Do not push broken code.
- **Fairness law:** every hostile action telegraphs >= 0.5s; projectile speed <= 90, charge speed <= 190; floor pools are outlined during telegraph and never spawn on the player; phase transitions wipe live hazards. The tests enforce this — do not weaken them to make a pattern pass.
- **The dodge-bot must clear every arena on 3/3 fixed seeds** before a new arena or boss change merges. If it can't, fix the pattern, not the test.
- Bump `?v=` cache-bust strings in `index.html` whenever any root asset changes.
- Overlays shown/hidden via the `hidden` attribute must never have an author CSS `display:` rule win over it — `styles.css` carries a global `[hidden] { display: none !important; }` for this (a missing copy once left the PAUSED screen stuck over every fight). Do not remove it.
- Version stamp in the same commit: `BUILD` const + `UPDATE_LOG` entry in `app.js`, `BUILD <ver> // <TAG>` footer in `index.html`. Current: BUILD 2026.11.10 // BALANCE + UI PASS, bust `20261110d`.
- Balance changes are gated twice: the dodge-bot must still clear every arena 3/3 (Arena I flawless), and the dashless "casual" reference in the balance probe must survive Arena I but not the later ones — if the bot goes flawless everywhere, the game is too easy; if it dies anywhere, the game is broken.
- Keep `README.md` and `AGENTS.md` current in the same commit as the change.
- Save format is `cbp-save-v1` in localStorage; changing its shape needs a migration, not a silent break.
- Deploy is GitHub Pages from `main` root. After every push: poll the Pages URL and grep the BUILD footer before declaring the deploy live.

## History
- Repo was `AetherClash` (strategic card game). Renamed to `Core-Breach-Pit` when the Pit became the main game; the card game was removed from the tree on 2026-11-10 (recoverable from git history at commit `e0653bb` or the out-of-repo archive).
