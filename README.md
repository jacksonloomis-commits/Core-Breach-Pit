# CORE BREACH: PIT

A retro-pixel **ranked boss-rush arena** — spinoff of [Core-Breach: Zero](https://gamble-limited-ltd.github.io/Core-Breach-Zero/). You are a Core-Breach operative dropped into the Pit; every arena (rank) owns its own boss pool, and you climb the SR ladder one telegraphed bullet-hell at a time. Read the telegraph, dash through the beam, send them back.

**Play: https://jacksonloomis-commits.github.io/Core-Breach-Pit/**

Static browser game: HTML/CSS/JS, no build step, no backend, no accounts, no network. (This repo previously hosted the **AetherClash** card game under the name `AetherClash`; the card game was retired from the tree when the Pit became the main game — recoverable from git history at commit `e0653bb`.)

## The ranked ladder

Stars are gone. Every queue rolls a random boss from your rank's pool — and **each arena owns its pool exclusively**: no boss rolls in two arenas, and every arena rolls a **FULL BENCH of five to seven** bodies (pinned by tests). Wins bank SR by the hearts you keep (full HP +30 · one heart +15 · two −5 · three or more −20 · flatline −10). SR never resets — seasons only award cosmetic badges on top.

| Rank | SR | Mods (HP × / TEMPO ×) | Boss pool (exclusive to this arena) |
| --- | --- | --- | --- |
| BRONZE 1–3 | 0–500 | 1.0 / 1.0 | GATEKEEPER · BILESPITTER · GNASHER · CINDERMITE · THRESHER · MOSSBACK |
| SILVER 1–3 | 500–800 | 1.05 / 1.0 | **the DEATHWARRANT area** — THE SURGEON · HIVE MOTHER · DEATHWARRANT · PALE HERALD · GLOAMWARDEN · CARRION LAW · THE BALLAST |
| GOLD 1–2 | 800–1100 | 1.2 / 1.11 | the tax collectors — BRASS HERALD · THE AUDITOR · TOLLMASTER · THE LEDGER · THE MINTER · THE EXCHEQUER |
| PLATINUM 1–3 | 1100–2000 | 1.5 / 1.18 | GRAVEWAKE · CINDERMAW · HOLLOW REGENT · IRON CHOIR · THE PUPPETEER · LANTERN MAW |
| DIAMOND 1–3 | 2000–2500 | 1.7 / 1.25 | THE LOOM · DREDGEWARDEN · THE FATHOM · THE UNDERTOW · PRESSURE SAINT |
| CRIMSON 1–3 | 2500–3500 | 1.85 / 1.33 | MAELSTROM · GORE PRELATE · NULL SOVEREIGN · THE MARSHAL · THE GORGET · VESPER |
| IRIDESCENT | 3500+ | 2.0 / 1.43 | THE GLUTTON · PALE LEVIATHAN · OLD WATER · THE ABYSSAL ARCHIVE · THE LAST SHORE · TIDE UNBOUND |

**Top 5 board: five ??? slots until real pilots earn them.** The board lists registered accounts on this browser only — no fabricated names, ever. A pilot's best SR takes a slot once it clears the qualifying line (4000); the board caps at five, sorted by SR, your row highlighted. Fresh browser = clean board. **Season 1 is live.**

## Accounts (register / login)

REGISTER in the hub header with a callsign (3-16 chars) and a passcode (6+). The passcode never leaves your browser and is stored only as a **salted SHA-256 digest** — salted per account, fixed-time compare, never plaintext. The Pit is a static site on GitHub Pages, so accounts are **per-browser**: register on a device and your progress banks under that callsign there; log in on the same browser to rehydrate it. Registering **claims this browser's existing guest save verbatim** — SR, rank, cosmetics, record — so nothing strands (the owner's plat 2 survived the migration untouched, by test). The guest slot stays behind as a backup; a second account starts fresh instead of inheriting a copy; logout drops you to the guest slot and login brings the account slot back. Slots are isolated by tests.

## Game modes (ranked / casual)

Logged-in pilots get a **mode bar** in the hub. **RANKED** is the ladder exactly as always — SR on the line, bosses roll from your rank's pool. **CASUAL** is practice: pick any boss you've already met in ranked and refight it at the pacing of the rank whose pool owns that boss (pools are exclusive, so that IS the difficulty you fought it at). Casual is **SR-neutral** — no delta, no W/L, no runs counter — and QUEUE AGAIN refights the same boss. The casual roster is an honest ranked history: every ranked fight records which boss it was; casual fights never unlock refights, and unfought bosses read ??? until you meet them in the ladder. Guests play ranked-only — register to unlock casual.

## The update log is capped

The hub renders the **current build's entry** and collapses older builds behind a `SHOW OLDER PATCHES` toggle — the page no longer grows forever with every build, and nothing is deleted (the full history stays one click away).

## Every round rolls a twist — ROUND VARIETY mutators

Repetition is a design bug, so every queue can draw **mutators** — house twists the Pit rolls with the boss, seeded per attempt (one attempt always fights the same twist, no two queues play the same fight). The fight title and the results screen tell you exactly what was drawn. **TEMPO** is the pacing stat: how much sooner the boss cycles its patterns — ×1.25 means attacks come a quarter sooner, ×0.9 means it pauses a little longer. Higher TEMPO is always faster; the old "GAP" tag said the same thing backwards, which is exactly why it was renamed (owner report: "idk what GAP is"):

| Mutator | Effect |
| --- | --- |
| FRAIL | boss HP ×0.72 — brittle lieutenant |
| SWIFT HORROR | boss TEMPO ×1.176, HP ×0.92 — attacks come ~18% sooner, thinner shell |
| SIEGE | boss HP ×1.25, TEMPO ×0.893 — a wall that takes its time |
| HEATED AIR | projectile SPEED ×1.10, TEMPO ×0.926 — hotter bullets, a hair more breathing room |
| BROOD BLIGHT | minion HP ×0.6 — the brood hatches sickly (spawner arenas only) |
| VOLATILE CORE | the fury curve sits one phase deeper from the first phase |
| ADRENALINE | you run ×1.12 faster (dash untouched) |
| BOUNTY | SR payout ×1.3, win **or** lose — risk and reward in one tag |

Draw counts: bronze mostly stays clean (55% for one twist — the warm-up stays warm), silver always draws one, gold and platinum usually draw two, diamond and above always draw two. Effects compose multiplicatively with the rank presets. Two hard rules, enforced by tests: **mutators never touch spawn counts or swarm caps** (the summon-cadence law — a spawn stall stays impossible), and **BROOD BLIGHT only joins the deck if the rank's pool owns a summoner**. The tutorial is pinned winnable 3/3 against every single mutator.

## The round announces itself — ROUND ANNOUNCER

Every queue opens with a **five-second countdown** before the gates open: the rank, the boss's name and its HP at this pacing, and every mutator the roll drew — each with a one-line blurb saying exactly what it does — then **FIGHT**. The sim stays frozen while the announcer is up (nothing steps, nothing hurts, input is gated), and `P` still pauses it. Read the twist, plan the fight, then move.

And no more floating-point garbage: composed multipliers (rank preset × mutator effects) used to print raw products like `1.0999000000099999`. Every multiplier the game shows — fight title, ladder rows, announcer — goes through `fmtMul` in `engine.js`, which rounds to three decimals and prints the shortest clean string (`1.1`, `0.972`, `1.25`).

## Every boss has a signature — SIGNATURE WAVE

The owner's audit was right: too many lieutenants were rotations of the same eight attacks. Now **every one of the 42 bosses carries a named, test-pinned signature** — a gimmick only it owns, announced before every round (`SIGNATURE — <name>: <what it does>`) and listed on every hub roster card. Sharing attacks is still fine (they remain as filler); sharing an identity is not.

Nine new mechanics were built for the wave: **seek** (homing drift — MOSSBACK's SPORE DRIFT, VESPER's CHOIR DRIFT, PALE LEVIATHAN's PALE CURRENT), **mines** that burst when crowded or on fuse (CINDERMITE's ASH VENTS, THE LEDGER's INK SEALS, LANTERN MAW's LURE LIGHTS), **orbit** halos that circle and burst outward (PALE HERALD's SERMON HALO, THE MINTER's COIN HALO, MAELSTROM's VORTEX RING), **walls** that cross the arena with one gap (GLOAMWARDEN's DROWN TIDE, THE LOOM's THREAD CURTAINS, THE LAST SHORE's THE LAST WAVE), **mortar** shells that burst on marked squares (CARRION LAW's SUBPOENA, DREDGEWARDEN's DREDGE SHELLS), a **pull** that drags your line (THE BALLAST's THE PULL, THE UNDERTOW's THE UNDERTOW), **marks** that bill the exact square you stood on (THE AUDITOR's THE AUDIT, PRESSURE SAINT's PILGRIM MARK, THE ABYSSAL ARCHIVE's DOCUMENTED), a **blink** teleport with an arrival clap (THE PUPPETEER's MARIONETTE, NULL SOVEREIGN's KING'S STEP), wall-**ricochet** slugs (THE GORGET's RICOCHET PLATE), and **blooming pools** that grow wider while they live (BILESPITTER's BILE BLOOM, CINDERMAW's FURNACE BLOOM).

Fairness laws carried through and pinned: every new hurt-speed ≤ 90, pop bursts leave slower than a run, pull force ≤ 26 (under BULWARK's 56 run — always escapable), blink never lands on the runner and honors the dt=0 movement contract, floor-denial signatures never share a phase with spawn, and every boss is re-proven at its gate 3/3. The audit also caught THE GLUTTON's finale quietly pairing its brood spawn with floor pools — the exact herding pair the VESPER lesson forbids; the pattern was fixed, not the test.

## The charge tells the truth — HONEST DASH

A charge telegraphs as a dashed red line, and the line is now **honest**: it shows the exact path the boss will dash — same length as the real dash, cut off cleanly at a wall — with a **stop marker** where the boss will land. The dash itself is real: ~120-150 px of ground eaten in under a second (angry phases faster), and the body hit still hurts. Read the line, step aside, punish the recovery.

Ships with a regression fix the owner caught by eye: a first-frame timing bug clamped every charge in the game to 0.01 s before it started, so the boss moved ~3 px ("like an inch") no matter what the line promised. The engine's transition call `execPattern(st, 0)` (dt = 0, first-frame bullet spawn) is now a documented **no-op contract for movement patterns** — charge movement guards on `dt > 0`, and the suite pins full-dash travel through the natural transition plus a roster-wide floor (speed × dur ≥ 110, speed ≤ 190).

## Boss phases get angry — PHASE FURY

Phases are not a pattern swap. Every phase the whole fight escalates on one engine-side curve (`AGGRO` in `engine.js`): patterns cycle sooner (gaps and recover compress), telegraphs snap a beat tighter (never below the 0.5 s fairness floor), and **every projectile leaves faster**. Enrage final phases stack a last-stand multiplier on top of the curve. And the transition itself answers you: the fairness wipe ends with a **gold retaliation ring** bursting out of the boss — slower than your run speed, so you can walk through it, but it will catch you standing still.

One more rule the tests now enforce: a fight must be **endable**. GRAVEWAKE's brood phase used to summon exactly as fast as any player could kill minions — the swarm never emptied, your gun was stuck on blob cleanup, and the boss barely took damage (measured by probe: a 244-second phase, 140 minion kills, unwinnable fight). The REGURGITANT now summons **1-of-3 patterns with the swarm capped at 4** — the brood still hunts you and stragglers chase into later phases, but it can be outkilled (brood phase 244s → 59s; the suite pins the PLATINUM-preset fight clearable 3/3 as the summon-stall regression). A boss you can survive but never finish is a bug, not a wall.

## Every arena rolls a full bench — FULL BENCH

Variety is staying power, so every arena bench got stocked (owner spec: "add a boss or two more to each Arena"): the roster went **31 → 42** and no arena rolls fewer than five lieutenants — bronze six, silver seven, gold six, platinum six, diamond five, crimson six, iridescent six. The new bodies: **MOSSBACK** (262, bronze — old growth of the low gates), **THE BALLAST** (510, silver — sunken weight of the champion docks), **THE MINTER** (566) and **THE EXCHEQUER** (576, gold — it coins the Tide's face; the vault that walks), **THE PUPPETEER** (606) and **LANTERN MAW** (614, platinum — it pulls the strings below; the light below is a mouth), **THE UNDERTOW** (644, diamond — the pull beneath every wave), **THE GORGET** (671) and **VESPER** (676, crimson — the collar of the crimson gate; evensong for the sunken throne), and **THE ABYSSAL ARCHIVE** (705) with **THE LAST SHORE** (711, iridescent — both four phases, sitting just under TIDE UNBOUND).

The additions recombine patterns already proven at their tier's pacing — one pressure theme per phase — and every new body is bot-gated 3/3 at its preset (VOLT at bronze/silver/gold, BULWARK at base for the beyond band). Spawner phases keep the summon-cadence law: spawn is 1-of-3 patterns with the swarm capped at 4-5, never in a two-pattern phase — and never alongside floor-denial pools (the VESPER probe caught the brood herding the bot into silt zones; the brood phase now carries rings only, the silt moved to the finale).

## The roster — 42 bosses, 4 weight classes

| Band | Bosses |
| --- | --- |
| **BRONZE — the warm-up** (kept easy on purpose) | GATEKEEPER · BILESPITTER · GNASHER · CINDERMITE · MOSSBACK · THRESHER |
| **SILVER — the DEATHWARRANT area** (champion weight, pinned 480–560 base HP by tests) | THE SURGEON · HIVE MOTHER · THE BALLAST (510) · PALE HERALD · DEATHWARRANT (the anchor) · GLOAMWARDEN · CARRION LAW |
| **GOLD — the tax collectors** (strictly past the anchor, under 600) | BRASS HERALD (525) · THE AUDITOR (535) · TOLLMASTER (545) · THE LEDGER (555) · THE MINTER (566) · THE EXCHEQUER (576) |
| **BEYOND the champion** (560–720, one exclusive bench per rank, ordered by weight) | GRAVEWAKE · CINDERMAW · HOLLOW REGENT (590) · IRON CHOIR · THE PUPPETEER (606) · LANTERN MAW (614) · THE LOOM · DREDGEWARDEN · THE FATHOM · THE UNDERTOW (644) · PRESSURE SAINT (648) · MAELSTROM · GORE PRELATE · NULL SOVEREIGN · THE MARSHAL (668) · THE GORGET (671) · VESPER (676) · THE GLUTTON · PALE LEVIATHAN (690, 4 phases) · OLD WATER (700) · THE ABYSSAL ARCHIVE (705, 4 phases) · THE LAST SHORE (711, 4 phases) · TIDE UNBOUND (720 — the Tide itself) |

THE SURGEON (280 → 500) and HIVE MOTHER (440 → 480) were rebuilt into the champion weight class; DEATHWARRANT itself is untouched — the whole silver band is calibrated to it. Higher ranks send heavier lieutenants with more HP and tighter pacing; telegraphs and speeds are never scaled by rank.

**Operatives** (unlock by SR now): VOLT (starter, overcharge), GHOST (Silver, 500 SR — phase: walk through anything), BULWARK (Platinum, 1100 SR — frontal barrier).

**Controls:** WASD/arrows move · SPACE/SHIFT dash (i-frames) · E ability · P/ESC pause. Your gun auto-fires at the nearest hostile; the game is positioning, dash timing, and pattern reading.

**Fairness law:** every attack is telegraphed for at least 0.5 s (gold flash, dashed charge lines, outlined pools, mine squares, mark reticles, curtain edges with the gap drawn, blink ghosts — even under the fury curve's tele compression), projectile and charge speeds are capped, floor hazards can never arm on top of you, and phase transitions wipe live bullets and marks before the burst ring spawns. All of this is asserted by tests.

## Run and test

```bash
npm start     # local play at http://localhost:8080
npm test      # PIT sim suite (must pass before every push)
```

The sim suite runs the engine headlessly in Node and gates every release three ways:

1. **The dodge-bot clears the bronze band at the BRONZE preset, the whole silver band at the SILVER preset, and the gold band at the GOLD preset, 3/3 fixed seeds each** (plus a flawless GATEKEEPER proof) — if a ladder boss cannot be beaten, it does not ship. Every mutator is additionally gated: GATEKEEPER must clear 3/3 with each of the eight house twists applied.
2. **BULWARK (the siege frame) proves the beyond band at base, 3/3 seeds — all twenty-three of them.** Platinum+ presets are the documented beyond-bot zone — the suite survival-gates them instead of demanding full clears, with one endability exception: **GRAVEWAKE must stay clearable at the PLATINUM preset (3/3)** — the summon-stall regression pin (a boss the player survives but can never finish is a bug, not a wall).
3. **The dashless casual reference** (same bot brain, dash disabled) must clear the bronze tutorial on at least half its seeds and never clear the DEATHWARRANT area — HIVE MOTHER is knowingly kite-able without dash (spiral gaps; logged as INFO, not a leak).

Plus the **arena-ownership invariants** (seven exclusive FULL BENCH pools of ≥ 5, pairwise disjoint, union = the whole roster, pool weight escalating arena by arena), the **signature pins** (42 unique names, 17 distinct types, every boss's phases actually carry its signature, new-mechanic fairness floors, engine behavior probes for seek/orbit/wall/mortar/mines/mark/blink/pull/ricochet through natural transitions), the **mutator pins** (deck integrity, deterministic draws, rank draw-shape rules, spawner-only BROOD BLIGHT, effect pins for all eight twists, BOUNTY economy, per-mutator tutorial gates), the **phase-fury behavior pins** (curve monotonicity, tele-floor survival, burst-ring speed below run speed, wipe-per-transition), the **charge-honesty pins** (roster-wide speed × dur ≥ 110, natural-transition full-dash travel, the dt=0 no-op contract), fairness probes from live sims, ranked-economy unit tests (SR deltas, promotions, unlocks, save migration, seasons, Top 5), and a random-input fuzz across all 42 bosses.

Saves: `cbp-save-v2` in localStorage. Old `cbp-save-v1` progress is **migrated, not broken** — cleared arenas + stars convert to starting SR (100 per arena + 20 per star; a full 5-arena/15-star save lands at 800 SR, Gold 1).

## Architecture

- `engine.js` — pure rules/sim engine (no DOM): player, dash i-frames, hitscan, projectiles, beams, zones, minions, floor marks, boss pattern interpreter (including the SIGNATURE WAVE mechanics: seek / mines / orbit / wall / mortar / pull / mark / blink / ricochet / growing pools), the PHASE FURY aggression curve + transition burst ring, the ROUND VARIETY mutator deck + draw rules, ranked ladder (SR economy, rank pools + modifiers, seasons, Top 5, save migration). Runs in the browser and in Node.
- `chars.js`, `bosses.js` — pure data: operatives; the 42-boss roster with `band` weight classes (bronze / silver / gold / beyond) and a named `sig` signature per boss, built from pattern primitives (aimed / ring / shotgun / sweep / charge / zone / spiral / spawn / seek / mines / orbit / wall / mortar / pull / mark / blink / ric).
- `palette.js` — 16-color retro palette. `audio.js` — WebAudio bleep synth, no assets.
- `app.js` — fixed-timestep loop, pixel renderer, ranked hub (rank card, ladder, Top 5, arena-pool roster), results, localStorage save.
- `tests/sim-test.js` — everything above. `scripts/run-tests.js` — the runner.

## Versioning

Every shipped change stamps `BUILD` + an `UPDATE_LOG` entry in `app.js`, a `BUILD <ver> // <TAG>` footer in `index.html`, and bumps the `?v=` cache-bust on all asset tags — in the same commit. Current build: **2026.11.21 // GAME MODES** (bust `20261110q`).

See `AGENTS.md` for the development rules. Licensed under the PolyForm Noncommercial License (see `LICENSE` / `NOTICE`).
