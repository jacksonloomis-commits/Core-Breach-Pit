# CORE BREACH: PIT

A retro-pixel **ranked boss-rush arena** — spinoff of [Core-Breach: Zero](https://gamble-limited-ltd.github.io/Core-Breach-Zero/). You are a Core-Breach operative dropped into the Pit; the Crimson Tide sends its lieutenants in a random rotation, and you climb the SR ladder one telegraphed bullet-hell at a time. Read the telegraph, dash through the beam, send them back.

**Play: https://jacksonloomis-commits.github.io/Core-Breach-Pit/**

Static browser game: HTML/CSS/JS, no build step, no backend, no accounts, no network. (This repo previously hosted the **AetherClash** card game under the name `AetherClash`; the card game was retired from the tree when the Pit became the main game — recoverable from git history at commit `e0653bb`.)

## The ranked ladder

Stars and arenas are gone. Every queue rolls a random boss from your rank's pool; wins bank SR by the hearts you keep (full HP +30 · one heart +15 · two −5 · three or more −20 · flatline −10). SR never resets — seasons only award cosmetic badges on top.

| Rank | SR | Mods (HP × / GAP ×) | Boss pool |
| --- | --- | --- | --- |
| BRONZE 1–3 | 0–500 | 1.0 / 1.0 | the bronze band — the warm-up |
| SILVER 1–3 | 500–800 | 1.05 / 1.0 | **the DEATHWARRANT area** |
| GOLD 1–2 | 800–1100 | 1.2 / 0.9 | silver tail + beyond head |
| PLATINUM 1–3 | 1100–2000 | 1.5 / 0.85 | the beyond band |
| DIAMOND 1–3 | 2000–2500 | 1.7 / 0.8 | the beyond band |
| CRIMSON 1–3 | 2500–3500 | 1.85 / 0.75 | the beyond band |
| IRIDESCENT | 3500+ | 2.0 / 0.7 | GRAVEWAKE, NULL SOVEREIGN |

Top 5 board: crack the board by SR (qualifying 4000). Season 1 is live.

## The roster — 15 bosses, 3 weight classes

| Band | Bosses |
| --- | --- |
| **BRONZE — the warm-up** (kept easy on purpose) | GATEKEEPER · BILESPITTER · GNASHER · CINDERMITE · THRESHER |
| **SILVER — the DEATHWARRANT area** (champion weight, pinned 480–560 base HP by tests) | THE SURGEON · HIVE MOTHER · DEATHWARRANT (the anchor) · PALE HERALD · GLOAMWARDEN · CARRION LAW |
| **BEYOND the champion** | IRON CHOIR · THE FATHOM · GRAVEWAKE · NULL SOVEREIGN |

THE SURGEON (280 → 500) and HIVE MOTHER (440 → 480) were rebuilt into the champion weight class; DEATHWARRANT itself is untouched — the whole silver band is calibrated to it. Higher ranks send the same lieutenants with more HP and tighter pacing; telegraphs and speeds are never scaled.

**Operatives** (unlock by SR now): VOLT (starter, overcharge), GHOST (Silver, 500 SR — phase: walk through anything), BULWARK (Platinum, 1100 SR — frontal barrier).

**Controls:** WASD/arrows move · SPACE/SHIFT dash (i-frames) · E ability · P/ESC pause. Your gun auto-fires at the nearest hostile; the game is positioning, dash timing, and pattern reading.

**Fairness law:** every attack is telegraphed for at least 0.5 s (gold flash, dashed charge lines, outlined pools), projectile and charge speeds are capped, floor pools can never appear on top of you, and phase transitions wipe live bullets for a breather. All of this is asserted by tests.

## Run and test

```bash
npm start     # local play at http://localhost:8080
npm test      # PIT sim suite (must pass before every push)
```

The sim suite runs the engine headlessly in Node and gates every release three ways:

1. **The dodge-bot clears the bronze band at the BRONZE preset and the whole silver band at the SILVER preset, 3/3 fixed seeds each** (plus a flawless GATEKEEPER proof) — if a ladder boss cannot be beaten, it does not ship.
2. **BULWARK (the siege frame) proves the beyond band at base, 3/3 seeds.** Platinum+ presets are the documented beyond-bot zone — the suite survival-gates them instead of demanding full clears.
3. **The dashless casual reference** (same bot brain, dash disabled) must clear the bronze tutorial on at least half its seeds and never clear the DEATHWARRANT area — HIVE MOTHER is knowingly kite-able without dash (spiral gaps; logged as INFO, not a leak).

Plus fairness probes from live sims, ranked-economy unit tests (SR deltas, promotions, unlocks, save migration, seasons, Top 5), and a random-input fuzz across all 15 bosses.

Saves: `cbp-save-v2` in localStorage. Old `cbp-save-v1` progress is **migrated, not broken** — cleared arenas + stars convert to starting SR (100 per arena + 20 per star; a full 5-arena/15-star save lands at 800 SR, Gold 1).

## Architecture

- `engine.js` — pure rules/sim engine (no DOM): player, dash i-frames, hitscan, projectiles, beams, zones, minions, boss pattern interpreter, ranked ladder (SR economy, rank pools + modifiers, seasons, Top 5, save migration). Runs in the browser and in Node.
- `chars.js`, `bosses.js` — pure data: operatives; the 15-boss roster with `band` weight classes, built from pattern primitives (aimed / ring / shotgun / sweep / charge / zone / spiral / spawn).
- `palette.js` — 16-color retro palette. `audio.js` — WebAudio bleep synth, no assets.
- `app.js` — fixed-timestep loop, pixel renderer, ranked hub (rank card, ladder, Top 5, roster dossier), results, localStorage save.
- `tests/sim-test.js` — everything above. `scripts/run-tests.js` — the runner.

## Versioning

Every shipped change stamps `BUILD` + an `UPDATE_LOG` entry in `app.js`, a `BUILD <ver> // <TAG>` footer in `index.html`, and bumps the `?v=` cache-bust on all asset tags — in the same commit. Current build: **2026.11.11 // BOSS EXPANSION** (bust `20261110f`).

See `AGENTS.md` for the development rules. Licensed under the PolyForm Noncommercial License (see `LICENSE` / `NOTICE`).
