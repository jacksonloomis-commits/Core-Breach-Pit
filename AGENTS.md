# AGENTS.md

Rules for every agent and human working on CORE BREACH: PIT. Read this first, every session.

## The project
- Retro-pixel **ranked** boss-rush arena, spinoff of Core-Breach: Zero. Static browser game: no build step, no backend, no accounts, no network calls.
- `engine.js` is a pure engine (no `document`, `window` or `localStorage` in `engine.js`, `chars.js`, `bosses.js`, `palette.js`). Bosses are data interpreted by the engine — never hardcode a boss's logic inside the engine.

## House rules
- **`npm test` must pass before every push to `main`.** It runs the PIT sim suite. Do not push broken code.
- **Fairness law:** every hostile action telegraphs >= 0.5s; projectile speed <= 90, charge speed <= 190; floor pools are outlined during telegraph and never spawn on the player; phase transitions wipe live hazards. The tests enforce this — do not weaken them to make a pattern pass.
- **Roster calibration (owner spec, enforced by tests):** bronze band stays easy (max 300 base HP, 2 phases); the silver band IS the DEATHWARRANT area (480–560 base HP, 3 phases, SILVER preset pinned near ×1.05 HP with no pacing squeeze); the gold band sits strictly past the anchor and under 600 (3 phases); the beyond band sits strictly above the silver band, ordered by base HP. DEATHWARRANT (520) is the untouched anchor — do not nerf it to make a gate pass.
- **Arena pool ownership (owner spec, enforced by tests):** each arena (rank) owns its boss pool EXCLUSIVELY — the seven pools are pairwise disjoint and their union is the whole roster; pool max base HP escalates arena by arena. Never let two ranks roll the same boss.
- **Balance is gated three ways, by measured reality:**
  1. The dodge-bot (VOLT) must clear the bronze band at the BRONZE preset, the whole silver band at the SILVER preset, and the gold band at the GOLD preset, 3/3 fixed seeds, plus a flawless GATEKEEPER.
  2. The dodge-bot (BULWARK) must clear the beyond band at base (all eight bosses), 3/3 seeds. PLATINUM+ presets are the **documented beyond-bot wall** — humans outplay the bot there; the suite survival-gates them (bot must survive 40s+) instead of demanding full clears.
  3. The dashless casual reference (same bot brain, dash disabled) must clear the bronze tutorial on at least half its seeds and never clear the DEATHWARRANT area. HIVE MOTHER is knowingly kite-able without dash (spiral gaps) — logged as INFO, a design fact, not a balance leak.
  - If a boss fails its gate, fix the pattern, not the test. Harness-side exceptions so far: beam danger weight 10 (beams outrun the player; the counter is dashing THROUGH, the tutorial's own advice) and telegraph-cone reading + edge weight 1.1 (the bot once camped walls and ate volleys there — no human does). Pattern-side lessons learned the same way: dense shotgun volleys (5-shot 30° cones) hit the cone-reading bot once per phase — keep volleys at 4 shots / ≤26° like CARRION LAW; spawn + floor zones together herd the bot into minion contact (THE GLUTTON shipped that way and went 0/3) — separate the two pressures across phases or cap the brood.
- Bump `?v=` cache-bust strings in `index.html` whenever any root asset changes.
- Overlays shown/hidden via the `hidden` attribute must never have an author CSS `display:` rule win over it — `styles.css` carries a global `[hidden] { display: none !important; }` for this (a missing copy once left the PAUSED screen stuck over every fight). Do not remove it.
- Version stamp in the same commit: `BUILD` const + `UPDATE_LOG` entry in `app.js`, `BUILD <ver> // <TAG>` footer in `index.html`. Current: BUILD 2026.11.11 // ARENA POOLS, bust `20261110g`.
- Keep `README.md` and `AGENTS.md` current in the same commit as the change.
- Save format is `cbp-save-v2` (ranked: SR, peak, season, cosmetics, operatives). Changing its shape needs a migration, not a silent break — `migrateSave()` converts `cbp-save-v1` stars/arenas to starting SR (100 per arena + 20 per star). Operatives unlock by SR inside `applyRankedResult` (GHOST 500, BULWARK 1100); seasons end when the owner bumps `SEASON` in `engine.js`, awarding the peak-rank badge, never resetting SR.
- Deploy is GitHub Pages from `main` root. After every push: poll the Pages URL and grep the BUILD footer before declaring the deploy live.

## History
- Repo was `AetherClash` (strategic card game). Renamed to `Core-Breach-Pit` when the Pit became the main game; the card game was removed from the tree on 2026-11-10 (recoverable from git history at commit `e0653bb` or the out-of-repo archive).
- 2026-11-11: stars/arenas progression replaced by the ranked SR ladder (owner spec); roster expanded 5 → 15 with bronze/silver/beyond weight classes.
- 2026-11-11: ARENA POOLS (owner spec: "each arena should have its own boss pool") — every rank owns an exclusive pool; roster 15 → 21 (gold band TOLLMASTER/BRASS HERALD; beyond gains THE LOOM, MAELSTROM, THE GLUTTON, TIDE UNBOUND); hub roster reorganized as seven arena sections; gold band + ownership pinned by tests; suite 109 → 124 checks.
