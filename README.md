# CORE BREACH: PIT

A retro-pixel **boss-rush arena** — spinoff of [Core-Breach: Zero](https://gamble-limited-ltd.github.io/Core-Breach-Zero/). You are a Core-Breach operative dropped into the Pit; the Crimson Tide sends its lieutenants one arena at a time. Read the telegraph, dash through the beam, send them back.

**Play: https://jacksonloomis-commits.github.io/Core-Breach-Pit/**

Static browser game: HTML/CSS/JS, no build step, no backend, no accounts, no network. (This repo previously hosted the **AetherClash** card game under the name `AetherClash`; the card game was retired from the tree when the Pit became the main game — recoverable from git history at commit `e0653bb`.)

## The beta ladder

| Arena | Tier | Boss | Unlocks |
| --- | --- | --- | --- |
| I | BRONZE | GATEKEEPER — aimed slugs, ring bursts | — |
| II | BRONZE | BILESPITTER — floor pools, shotgun volleys | **GHOST** |
| III | SILVER | THE SURGEON — laser sweeps, body charges | — |
| IV | GOLD | HIVE MOTHER — spirals, live spawn | **BULWARK** |
| V | CHAMPION | DEATHWARRANT — everything, angry | PIT CHAMPION |

**Operatives:** VOLT (starter, overcharge), GHOST (fast, phase — walk through anything), BULWARK (tanky, frontal barrier).

**Stars per arena:** 3 = flawless · 2 = two hits or fewer · 1 = cleared. Pure progression: no rating, no server — clear an arena to open the next.

**Controls:** WASD/arrows move · SPACE/SHIFT dash (i-frames) · E ability · P/ESC pause. Your gun auto-fires at the nearest hostile; the game is positioning, dash timing, and pattern reading.

**Fairness law:** every attack is telegraphed for at least 0.5 s (gold flash, dashed charge lines, outlined pools), projectile and charge speeds are capped, floor pools can never appear on top of you, and phase transitions wipe live bullets for a breather. All of this is asserted by tests.

## Run and test

```bash
npm start     # local play at http://localhost:8080
npm test      # PIT sim suite (must pass before every push)
```

The sim suite runs the engine headlessly in Node and includes a **dodge-bot** that must beat every boss on 3/3 fixed seeds (plus a flawless clear on Arena I), fairness probes from live sims, progression unit tests, and a random-input fuzz. If the bot cannot clear your new arena, the arena does not ship.

## Architecture

- `engine.js` — pure rules/sim engine (no DOM): player, dash i-frames, hitscan, projectiles, beams, zones, minions, boss pattern interpreter. Runs in the browser and in Node.
- `chars.js`, `bosses.js` — pure data: operatives; arenas + boss phases built from pattern primitives (aimed / ring / shotgun / sweep / charge / zone / spiral / spawn).
- `palette.js` — 16-color retro palette. `audio.js` — WebAudio bleep synth, no assets.
- `app.js` — fixed-timestep loop, pixel renderer, hub, results, localStorage save (`cbp-save-v1`).
- `tests/sim-test.js` — everything above. `scripts/run-tests.js` — the runner.

## Versioning

Every shipped change stamps `BUILD` + an `UPDATE_LOG` entry in `app.js`, a `BUILD <ver> // <TAG>` footer in `index.html`, and bumps the `?v=` cache-bust on all asset tags — in the same commit. Current build: **2026.11.10 // BALANCE + UI PASS** (bust `20261110d`).

See `AGENTS.md` for the development rules. Licensed under the PolyForm Noncommercial License (see `LICENSE` / `NOTICE`).
