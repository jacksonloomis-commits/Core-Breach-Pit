# CORE BREACH: PIT

A retro-pixel **ranked boss-rush arena** — spinoff of [Core-Breach: Zero](https://gamble-limited-ltd.github.io/Core-Breach-Zero/). You are a Core-Breach operative dropped into the Pit; every arena (rank) owns its own boss pool, and you climb the SR ladder one telegraphed bullet-hell at a time. Read the telegraph, dash through the beam, send them back.

**Play: https://jacksonloomis-commits.github.io/Core-Breach-Pit/**

Static browser game: HTML/CSS/JS, no build step, no backend, no accounts, no network. (This repo previously hosted the **AetherClash** card game under the name `AetherClash`; the card game was retired from the tree when the Pit became the main game — recoverable from git history at commit `e0653bb`.)

## The ranked ladder

Stars are gone. Every queue rolls a random boss from your rank's pool — and **each arena owns its pool exclusively**: no boss rolls in two arenas, and every arena rolls at least **three** bodies (pinned by tests). Wins bank SR by the hearts you keep (full HP +30 · one heart +15 · two −5 · three or more −20 · flatline −10). SR never resets — seasons only award cosmetic badges on top.

| Rank | SR | Mods (HP × / GAP ×) | Boss pool (exclusive to this arena) |
| --- | --- | --- | --- |
| BRONZE 1–3 | 0–500 | 1.0 / 1.0 | GATEKEEPER · BILESPITTER · GNASHER · CINDERMITE · THRESHER |
| SILVER 1–3 | 500–800 | 1.05 / 1.0 | **the DEATHWARRANT area** — THE SURGEON · HIVE MOTHER · DEATHWARRANT · PALE HERALD · GLOAMWARDEN · CARRION LAW |
| GOLD 1–2 | 800–1100 | 1.2 / 0.9 | the tax collectors — BRASS HERALD · THE AUDITOR · TOLLMASTER · THE LEDGER |
| PLATINUM 1–3 | 1100–2000 | 1.5 / 0.85 | GRAVEWAKE · CINDERMAW · HOLLOW REGENT · IRON CHOIR |
| DIAMOND 1–3 | 2000–2500 | 1.7 / 0.8 | THE LOOM · DREDGEWARDEN · THE FATHOM · PRESSURE SAINT |
| CRIMSON 1–3 | 2500–3500 | 1.85 / 0.75 | MAELSTROM · GORE PRELATE · NULL SOVEREIGN · THE MARSHAL |
| IRIDESCENT | 3500+ | 2.0 / 0.7 | THE GLUTTON · PALE LEVIATHAN · OLD WATER · TIDE UNBOUND |

Top 5 board: crack the board by SR (qualifying 4000). Season 1 is live.

## Every round rolls a twist — ROUND VARIETY mutators

Repetition is a design bug, so every queue can draw **mutators** — house twists the Pit rolls with the boss, seeded per attempt (one attempt always fights the same twist, no two queues play the same fight). The fight title and the results screen tell you exactly what was drawn:

| Mutator | Effect |
| --- | --- |
| FRAIL | boss HP ×0.72 — brittle lieutenant |
| SWIFT HORROR | boss GAP ×0.85, HP ×0.92 — faster patterns, thinner shell |
| SIEGE | boss HP ×1.25, GAP ×1.12 — a wall that takes its time |
| HEATED AIR | projectile SPEED ×1.10, GAP ×1.08 — hotter bullets, not hotter telegraphs |
| BROOD BLIGHT | minion HP ×0.6 — the brood hatches sickly (spawner arenas only) |
| VOLATILE CORE | the fury curve sits one phase deeper from the first phase |
| ADRENALINE | you run ×1.12 faster (dash untouched) |
| BOUNTY | SR payout ×1.3, win **or** lose — risk and reward in one tag |

Draw counts: bronze mostly stays clean (55% for one twist — the warm-up stays warm), silver always draws one, gold and platinum usually draw two, diamond and above always draw two. Effects compose multiplicatively with the rank presets. Two hard rules, enforced by tests: **mutators never touch spawn counts or swarm caps** (the summon-cadence law — a spawn stall stays impossible), and **BROOD BLIGHT only joins the deck if the rank's pool owns a summoner**. The tutorial is pinned winnable 3/3 against every single mutator.

## The round announces itself — ROUND ANNOUNCER

Every queue opens with a **five-second countdown** before the gates open: the rank, the boss's name and its HP at this pacing, and every mutator the roll drew — each with a one-line blurb saying exactly what it does — then **FIGHT**. The sim stays frozen while the announcer is up (nothing steps, nothing hurts, input is gated), and `P` still pauses it. Read the twist, plan the fight, then move.

And no more floating-point garbage: composed multipliers (rank preset × mutator effects) used to print raw products like `1.0999000000099999`. Every multiplier the game shows — fight title, ladder rows, announcer — goes through `fmtMul` in `engine.js`, which rounds to three decimals and prints the shortest clean string (`1.1`, `0.972`, `1.25`).

## The charge tells the truth — HONEST DASH

A charge telegraphs as a dashed red line, and the line is now **honest**: it shows the exact path the boss will dash — same length as the real dash, cut off cleanly at a wall — with a **stop marker** where the boss will land. The dash itself is real: ~120-150 px of ground eaten in under a second (angry phases faster), and the body hit still hurts. Read the line, step aside, punish the recovery.

Ships with a regression fix the owner caught by eye: a first-frame timing bug clamped every charge in the game to 0.01 s before it started, so the boss moved ~3 px ("like an inch") no matter what the line promised. The engine's transition call `execPattern(st, 0)` (dt = 0, first-frame bullet spawn) is now a documented **no-op contract for movement patterns** — charge movement guards on `dt > 0`, and the suite pins full-dash travel through the natural transition plus a roster-wide floor (speed × dur ≥ 110, speed ≤ 190).

## Boss phases get angry — PHASE FURY

Phases are not a pattern swap. Every phase the whole fight escalates on one engine-side curve (`AGGRO` in `engine.js`): patterns cycle sooner (gaps and recover compress), telegraphs snap a beat tighter (never below the 0.5 s fairness floor), and **every projectile leaves faster**. Enrage final phases stack a last-stand multiplier on top of the curve. And the transition itself answers you: the fairness wipe ends with a **gold retaliation ring** bursting out of the boss — slower than your run speed, so you can walk through it, but it will catch you standing still.

One more rule the tests now enforce: a fight must be **endable**. GRAVEWAKE's brood phase used to summon exactly as fast as any player could kill minions — the swarm never emptied, your gun was stuck on blob cleanup, and the boss barely took damage (measured by probe: a 244-second phase, 140 minion kills, unwinnable fight). The REGURGITANT now summons **1-of-3 patterns with the swarm capped at 4** — the brood still hunts you and stragglers chase into later phases, but it can be outkilled (brood phase 244s → 59s; the suite pins the PLATINUM-preset fight clearable 3/3 as the summon-stall regression). A boss you can survive but never finish is a bug, not a wall.

## The roster — 31 bosses, 4 weight classes

| Band | Bosses |
| --- | --- |
| **BRONZE — the warm-up** (kept easy on purpose) | GATEKEEPER · BILESPITTER · GNASHER · CINDERMITE · THRESHER |
| **SILVER — the DEATHWARRANT area** (champion weight, pinned 480–560 base HP by tests) | THE SURGEON · HIVE MOTHER · DEATHWARRANT (the anchor) · PALE HERALD · GLOAMWARDEN · CARRION LAW |
| **GOLD — the tax collectors** (strictly past the anchor, under 600) | BRASS HERALD (525) · THE AUDITOR (535) · TOLLMASTER (545) · THE LEDGER (555) |
| **BEYOND the champion** (560–720, one exclusive quartet per rank, ordered by weight) | GRAVEWAKE · CINDERMAW · HOLLOW REGENT (590) · IRON CHOIR · THE LOOM · DREDGEWARDEN · THE FATHOM · PRESSURE SAINT (648) · MAELSTROM · GORE PRELATE · NULL SOVEREIGN · THE MARSHAL (668) · THE GLUTTON · PALE LEVIATHAN (690, 4 phases) · OLD WATER (700) · TIDE UNBOUND (720 — the Tide itself) |

THE SURGEON (280 → 500) and HIVE MOTHER (440 → 480) were rebuilt into the champion weight class; DEATHWARRANT itself is untouched — the whole silver band is calibrated to it. Higher ranks send heavier lieutenants with more HP and tighter pacing; telegraphs and speeds are never scaled by rank.

**Operatives** (unlock by SR now): VOLT (starter, overcharge), GHOST (Silver, 500 SR — phase: walk through anything), BULWARK (Platinum, 1100 SR — frontal barrier).

**Controls:** WASD/arrows move · SPACE/SHIFT dash (i-frames) · E ability · P/ESC pause. Your gun auto-fires at the nearest hostile; the game is positioning, dash timing, and pattern reading.

**Fairness law:** every attack is telegraphed for at least 0.5 s (gold flash, dashed charge lines, outlined pools — even under the fury curve's tele compression), projectile and charge speeds are capped, floor pools can never appear on top of you, and phase transitions wipe live bullets before the burst ring spawns. All of this is asserted by tests.

## Run and test

```bash
npm start     # local play at http://localhost:8080
npm test      # PIT sim suite (must pass before every push)
```

The sim suite runs the engine headlessly in Node and gates every release three ways:

1. **The dodge-bot clears the bronze band at the BRONZE preset, the whole silver band at the SILVER preset, and the gold band at the GOLD preset, 3/3 fixed seeds each** (plus a flawless GATEKEEPER proof) — if a ladder boss cannot be beaten, it does not ship. Every mutator is additionally gated: GATEKEEPER must clear 3/3 with each of the eight house twists applied.
2. **BULWARK (the siege frame) proves the beyond band at base, 3/3 seeds — all sixteen of them.** Platinum+ presets are the documented beyond-bot zone — the suite survival-gates them instead of demanding full clears, with one endability exception: **GRAVEWAKE must stay clearable at the PLATINUM preset (3/3)** — the summon-stall regression pin (a boss the player survives but can never finish is a bug, not a wall).
3. **The dashless casual reference** (same bot brain, dash disabled) must clear the bronze tutorial on at least half its seeds and never clear the DEATHWARRANT area — HIVE MOTHER is knowingly kite-able without dash (spiral gaps; logged as INFO, not a leak).

Plus the **arena-ownership invariants** (seven exclusive pools of ≥ 3, pairwise disjoint, union = the whole roster, pool weight escalating arena by arena), the **mutator pins** (deck integrity, deterministic draws, rank draw-shape rules, spawner-only BROOD BLIGHT, effect pins for all eight twists, BOUNTY economy, per-mutator tutorial gates), the **phase-fury behavior pins** (curve monotonicity, tele-floor survival, burst-ring speed below run speed, wipe-per-transition), fairness probes from live sims, ranked-economy unit tests (SR deltas, promotions, unlocks, save migration, seasons, Top 5), and a random-input fuzz across all 31 bosses.

Saves: `cbp-save-v2` in localStorage. Old `cbp-save-v1` progress is **migrated, not broken** — cleared arenas + stars convert to starting SR (100 per arena + 20 per star; a full 5-arena/15-star save lands at 800 SR, Gold 1).

## Architecture

- `engine.js` — pure rules/sim engine (no DOM): player, dash i-frames, hitscan, projectiles, beams, zones, minions, boss pattern interpreter, the PHASE FURY aggression curve + transition burst ring, the ROUND VARIETY mutator deck + draw rules, ranked ladder (SR economy, rank pools + modifiers, seasons, Top 5, save migration). Runs in the browser and in Node.
- `chars.js`, `bosses.js` — pure data: operatives; the 31-boss roster with `band` weight classes (bronze / silver / gold / beyond), built from pattern primitives (aimed / ring / shotgun / sweep / charge / zone / spiral / spawn).
- `palette.js` — 16-color retro palette. `audio.js` — WebAudio bleep synth, no assets.
- `app.js` — fixed-timestep loop, pixel renderer, ranked hub (rank card, ladder, Top 5, arena-pool roster), results, localStorage save.
- `tests/sim-test.js` — everything above. `scripts/run-tests.js` — the runner.

## Versioning

Every shipped change stamps `BUILD` + an `UPDATE_LOG` entry in `app.js`, a `BUILD <ver> // <TAG>` footer in `index.html`, and bumps the `?v=` cache-bust on all asset tags — in the same commit. Current build: **2026.11.16 // HONEST DASH** (bust `20261110l`).

See `AGENTS.md` for the development rules. Licensed under the PolyForm Noncommercial License (see `LICENSE` / `NOTICE`).
