// CORE BREACH: PIT — boss definitions. Pure data, no DOM.
// Every pattern type: tele (telegraph seconds, MIN 0.5), then active, then recover (default 0.25).
// FAIRNESS RULES asserted by tests: tele >= 0.5, projectile speed <= 90,
// charge speed <= 190, floor pools are outlined during telegraph and can never
// spawn on the player. Do not weaken the law to make a pattern pass.
//
// BOSS EXPANSION 2026.11.11 (owner spec): the roster goes 5 -> 15, split into
// difficulty bands the ranked ladder draws from:
//   bronze band — "lowk super ez": 2 phases, generous gaps, slow slugs. The warm-up.
//   silver band — THE DEATHWARRANT AREA: every boss here is tuned to the champion's
//     weight class (base HP 480-560, 3 phases, tight gaps). THE SURGEON and HIVE
//     MOTHER were promoted into it and rebuilt; DEATHWARRANT itself is untouched —
//     it is the anchor the band is calibrated against.
// ARENA POOLS 2026.11.11 (owner spec): "each arena should have its own boss pool".
// Every rank now OWNS an exclusive pool — no boss rolls in two arenas:
//   gold band — NEW: the Tide's tax collectors, strictly past the DEATHWARRANT anchor
//     (base HP 520-600 window, 3 phases). BRASS HERALD, THE AUDITOR, TOLLMASTER.
//   beyond band — past the champion, strictly above silver: 560-720 base HP, 3-4
//     phases, one exclusive trio per rank: PLATINUM (gravewake, cindermaw, ironchoir),
//     DIAMOND (theloom, dredgewarden, fathom), CRIMSON (maelstrom, goreprelate,
//     nullsovereign), IRIDESCENT (theglutton, oldwater, tideunbound). The beyond band
//     is ordered by base HP so the ladder escalates.
// PHASE FURY 2026.11.12 (owner spec: "make boss phases actually do something" +
// "an extra boss or two to some of the pools"): the roster goes 21 -> 26 so the five
// two-boss arenas roll THREE bodies each — THE AUDITOR (535) joins the gold tax
// office, CINDERMAW (580) the platinum gate, DREDGEWARDEN (630) the diamond deep,
// GORE PRELATE (655) the crimson court, OLD WATER (700, 4 phases) the iridescent
// endgame. Engine-side, every phase now escalates the WHOLE fight (see AGGRO in
// engine.js) and every transition fires a gold retaliation ring.
// ROUND VARIETY 2026.11.14 (owner spec: "make each round sorta unique ... less tedious"
// + "add a few more bosses anyways"): the roster goes 26 -> 31 — one new body per pool
// where repetition bites, every arena now rolls FOUR lieutenants. THE LEDGER (555) joins
// the gold tax office, HOLLOW REGENT (590) the platinum gate, PRESSURE SAINT (648) the
// diamond deep, THE MARSHAL (668) the crimson court, PALE LEVIATHAN (690, 4 phases) the
// iridescent endgame. The engine now also rolls ROUND VARIETY mutators with every queue
// (see MUTATORS in engine.js) — boss data here is untouched by them except minion HP
// (BROOD BLIGHT) and they never change spawn counts or caps (summon-cadence law).
// FULL BENCH 2026.11.17 (owner spec: "add a boss or two more to each Arena for even more
// variety"): the roster goes 31 -> 42 — MOSSBACK (262) joins the bronze warm-up, THE
// BALLAST (510) the DEATHWARRANT area, THE MINTER (566) + THE EXCHEQUER (576) the tax
// office, THE PUPPETEER (606) + LANTERN MAW (614) the platinum gate, THE UNDERTOW (644)
// the diamond deep, THE GORGET (671) + VESPER (676) the crimson court, THE ABYSSAL
// ARCHIVE (705, 4 phases) + THE LAST SHORE (711, 4 phases) the iridescent endgame.
// Every arena now rolls FIVE to SEVEN lieutenants (bronze 6 / silver 7 / gold 6 /
// platinum 6 / diamond 5 / crimson 6 / iridescent 6). The new bodies recombine patterns
// already proven at their tier's pacing (one pressure theme per phase), all bot-gated
// 3/3 at their presets. Spawner phases keep the summon-cadence law: spawn is 1-of-3
// patterns with caps 4-5, never in a two-pattern phase.
// FULL BENCH 2026.11.17 (owner spec: "add a boss or two more to each Arena for even more
// variety"): the roster goes 31 -> 42 — MOSSBACK (262) joins the bronze warm-up, THE
// BALLAST (510) the DEATHWARRANT area, THE MINTER (566) + THE EXCHEQUER (576) the tax
// office, THE PUPPETEER (606) + LANTERN MAW (614) the platinum gate, THE UNDERTOW (644)
// the diamond deep, THE GORGET (671) + VESPER (676) the crimson court, THE ABYSSAL
// ARCHIVE (705, 4 phases) + THE LAST SHORE (711, 4 phases) the iridescent endgame.
// Every arena now rolls FIVE to SEVEN lieutenants (bronze 6 / silver 7 / gold 6 /
// platinum 6 / diamond 5 / crimson 6 / iridescent 6). New bodies are recombina-
// tions of patterns already proven at their tier's pacing (one pressure theme per
// phase), all bot-gated 3/3 at their presets. Spawner phases keep the summon-cadence
// law: spawn is 1-of-3 patterns with caps 4-5, never in a two-pattern phase.
// A test pins the calibration: silver-band HP must stay within 480..560, bronze <= 300,
// gold strictly past the silver anchor and under 600, beyond strictly above silver.
// A second test pins OWNERSHIP: the seven arena pools are pairwise disjoint and their
// union is the whole roster. Moving a boss across bands means moving its numbers too.
// SIGNATURE WAVE 2026.11.18 (owner spec: "a lot of these bosses have the same gimmick
// ... every boss should feel a little unique — you can still use other attacks"): every
// one of the 42 bosses now carries a SIG — a named, test-pinned signature gimmick shown
// by the round announcer and the hub roster. Nine new pattern mechanics were added for
// it (seek, mines, orbit, wall, mortar, pull, mark, blink, ricochet + growing pools),
// and even the shared attacks stay, as filler. Laws that still hold: HP/bands/pools
// untouched, tele >= 0.5s, hurting speeds <= 90, pull force <= 26 (< BULWARK's 56 run),
// charge dash >= 110, blink honors the dt=0 no-op contract, floor-denial signatures
// never share a phase with spawn (the herding law), spawn cadence untouched.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PIT_BOSSES = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const aimed = (shots, spread, speed, tele) => ({ type: 'aimed', shots, spread, speed, tele, dur: 0.01 });
  const ring = (count, speed, tele) => ({ type: 'ring', count, speed, tele, dur: 0.01 });
  const shotgun = (volleys, shots, spread, speed, tele, gap) => ({ type: 'shotgun', volleys, shots, spread, speed, tele, gap, dur: 0.01 });
  const sweep = (degPerSec, dur, width, tele, arcs) => ({ type: 'sweep', degPerSec, dur, width, tele, arcs: arcs || 1 });
  const charge = (speed, dur, tele) => ({ type: 'charge', speed, dur, tele });
  const zone = (count, r, pool, tele, grow) => ({ type: 'zone', count, r, pool, tele, grow: grow || 0, dur: 0.01 });
  const spiral = (arms, rate, dur, speed, tele) => ({ type: 'spiral', arms, rate, dur, speed, tele });
  const spawn = (count, max, tele) => ({ type: 'spawn', count, max, tele, dur: 0.01 });
  // SIGNATURE WAVE mechanics (owner spec: "every boss should feel a little unique").
  // All hurt-speeds <= 90, teles >= 0.5, pull force <= 26 (< BULWARK's 56 run speed),
  // blink is a MOVEMENT pattern and honors the dt=0 no-op law.
  const seek = (count, speed, turn, tele, spread) => ({ type: 'seek', count, speed, turn, tele, spread: spread || 24, dur: 0.01 });
  const mines = (count, r, fuse, pop, popSpeed, tele) => ({ type: 'mines', count, r, fuse, pop, popSpeed, tele, dur: 0.01 });
  const orbit = (count, radius, hold, speed, tele) => ({ type: 'orbit', count, radius, hold, speed, tele, dur: 0.01 });
  const wall = (speed, tele, gapW) => ({ type: 'wall', speed, tele, gapW, dur: 0.01 });
  const mortar = (count, r, pop, popSpeed, tele) => ({ type: 'mortar', count, r, pop, popSpeed, tele, dur: 0.01 });
  const pull = (dur, force, tele) => ({ type: 'pull', dur, force, tele });
  const mark = (count, r, fuse, pop, popSpeed, tele) => ({ type: 'mark', count, r, fuse, pop, popSpeed, tele, dur: 0.01 });
  const blink = (dist, clap, clapSpeed, tele) => ({ type: 'blink', dist, clap, clapSpeed, tele, dur: 0.15 });
  const ric = (shots, speed, bounces, spread, tele) => ({ type: 'ric', shots, speed, bounces, spread, tele, dur: 0.01 });

  const LIST = [
    // ================= BRONZE BAND — the easy warm-up (owner spec: keep it "super ez") =================
    {
      id: 'gatekeeper', name: 'GATEKEEPER', hp: 160, r: 10, band: 'bronze',
      title: 'WARDEN OF THE FIRST GATE',
      brief: 'Basic tide construct. Slow aimed slugs and ring bursts. Learn the dash — and the seam between the rings.',
      tint: '#e23b4e',
      sig: { type: 'ring', name: 'THE TOLL', blurb: 'Two gate-rings fired back to back — walk the seam between them.' },
      phases: [
        { until: 1, gap: 1.35, patterns: [aimed(3, 16, 80, 0.7), ring(12, 54, 0.8), ring(10, 44, 0.8)] },
        { until: 0.5, gap: 1.15, patterns: [ring(10, 50, 0.85), aimed(2, 12, 74, 0.8), shotgun(2, 3, 20, 72, 0.7, 0.55)] }
      ]
    },
    {
      id: 'bilespitter', name: 'BILESPITTER', hp: 230, r: 11, band: 'bronze',
      title: 'CHEM-WARDEN OF THE LOW PITS',
      brief: 'Floods the floor with bile pools that bloom wider while they live, then peppers the dry ground. Watch your feet.',
      tint: '#9ae66e',
      sig: { type: 'zone', name: 'BILE BLOOM', blurb: 'Bile pools bloom wider the longer they live — do not loiter at the edge.' },
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 4, 26, 76, 0.7, 0.5), zone(3, 24, 4.5, 0.8, 3)] },
        { until: 0.55, gap: 1.0, patterns: [zone(3, 22, 4.5, 0.75, 3), shotgun(2, 4, 24, 76, 0.7, 0.5), aimed(3, 16, 82, 0.65)] }
      ]
    },
    {
      id: 'gnasher', name: 'GNASHER', hp: 185, r: 9, band: 'bronze',
      title: 'PIT STRAY',
      brief: "A fast, dumb tide-hound. Straight slugs, thin rings, and its first real lunge. Warm-up meat.",
      tint: '#e08a3c',
      sig: { type: 'charge', name: 'STRAY LUNGE', blurb: "A hound's first real dash — short, fast, and straight at your last step." },
      phases: [
        { until: 1, gap: 1.4, patterns: [aimed(2, 14, 74, 0.8), ring(10, 50, 0.85), charge(120, 0.92, 0.8)] },
        { until: 0.5, gap: 1.2, patterns: [aimed(3, 18, 76, 0.75), ring(12, 52, 0.8), shotgun(2, 3, 20, 70, 0.7, 0.55)] }
      ]
    },
    {
      id: 'cindermite', name: 'CINDERMITE', hp: 240, r: 10, band: 'bronze',
      title: 'ASH-VEIN CRAWLER',
      brief: 'Arms ash vents that burst when you crowd them, then snipes the dry ground. Mind the glow.',
      tint: '#d9c34a',
      sig: { type: 'mines', name: 'ASH VENTS', blurb: 'Arms cinder mines that burst when you crowd them or the fuse runs out.' },
      phases: [
        { until: 1, gap: 1.35, patterns: [mines(2, 16, 3.2, 6, 44, 0.75), aimed(2, 14, 76, 0.8)] },
        { until: 0.5, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.8), ring(12, 54, 0.8), shotgun(2, 4, 22, 72, 0.7, 0.5)] }
      ]
    },
    {
      id: 'thresher', name: 'THRESHER', hp: 290, r: 11, band: 'bronze',
      title: 'GATE-CHAIN EXECUTIONER',
      brief: 'Chain-shot volleys and chain-charges strung back to back. Sidestep the first, punish the second.',
      tint: '#4ac2b8',
      sig: { type: 'charge', name: 'CHAIN LASH', blurb: 'Chain-charges strung back to back — sidestep the first, respect the second.' },
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 4, 26, 74, 0.75, 0.55), charge(140, 0.85, 0.8), charge(150, 0.85, 0.8)] },
        { until: 0.5, gap: 1.1, patterns: [charge(150, 0.85, 0.75), ring(12, 54, 0.8), aimed(3, 18, 78, 0.7)] }
      ]
    },
    {
      id: 'mossback', name: 'MOSSBACK', hp: 262, r: 11, band: 'bronze',
      title: 'OLD GROWTH OF THE LOW GATES',
      brief: 'It was gate ornament once, and the algae never stopped growing. Spore drift that curves after you, thin rings, and spore puddles by the second act.',
      tint: '#5a9e6f',
      sig: { type: 'seek', name: 'SPORE DRIFT', blurb: 'Slow spores that curve after you — strafe, never backpedal.' },
      phases: [
        { until: 1, gap: 1.35, patterns: [seek(3, 40, 0.9, 0.75), ring(11, 52, 0.8)] },
        { until: 0.5, gap: 1.15, patterns: [zone(3, 20, 4.5, 0.8), shotgun(2, 3, 20, 72, 0.75, 0.55), ring(10, 50, 0.8)] }
      ]
    },

    // ================= SILVER BAND — THE DEATHWARRANT AREA (owner spec: silver = champion weight) =================
    {
      id: 'surgeon', name: 'THE SURGEON', hp: 500, r: 10, band: 'silver',
      title: 'CUTTER OF THE CRIMSON COURT',
      brief: 'Rebuilt for the champion weight class: twin cutting beams rotate as one instrument, body charges and a scalpel volley. Dash THROUGH the incision, never away from it.',
      tint: '#ff7a8a',
      sig: { type: 'sweep', name: 'THE OPERATION', blurb: 'Twin cutting beams rotate as one instrument — dash THROUGH the incision.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [sweep(58, 2.3, 3, 0.6, 2), charge(165, 0.85, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [sweep(60, 2.3, 3, 0.6), charge(170, 0.85, 0.7), aimed(3, 18, 84, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [sweep(62, 2.4, 3, 0.55), charge(176, 0.85, 0.65), aimed(4, 20, 86, 0.6)] }
      ]
    },
    {
      id: 'hive', name: 'HIVE MOTHER', hp: 480, r: 12, band: 'silver',
      title: 'BROODWARD OF THE TIDE',
      brief: 'Promoted to the champion weight class. Spiral brood-fire and live spawn, faster on every phase. Kill the blobs or they will herd you.',
      tint: '#c98f4d',
      sig: { type: 'spawn', name: 'BROODWAKE', blurb: 'Live spawn on a taxed cadence — kill the brood or it herds you.' },
      phases: [
        { until: 1, gap: 1.05, patterns: [spiral(4, 0.14, 8, 58, 0.6), spawn(2, 5, 0.6)] },
        { until: 0.66, gap: 0.85, patterns: [spiral(5, 0.13, 8, 58, 0.6), spawn(3, 6, 0.6), ring(14, 60, 0.75)] },
        { until: 0.33, gap: 0.7, patterns: [ring(16, 60, 0.7), spawn(3, 6, 0.6), spiral(4, 0.12, 9, 60, 0.6)] }
      ]
    },
    {
      id: 'deathwarrant', name: 'DEATHWARRANT', hp: 520, r: 12, band: 'silver',
      title: 'THE PIT CHAMPION',
      brief: 'Every trick in the Tide, one body. Three phases. The last one is angry. The whole silver band is tuned to this fight — it is the anchor.',
      tint: '#8f1f2e',
      sig: { type: 'arsenal', name: 'THE FULL ARSENAL', blurb: 'Every trick in the Tide, one body — the anchor the whole silver band is tuned to.' },
      phases: [
        { until: 1, gap: 1.3, patterns: [aimed(5, 26, 86, 0.65), ring(13, 60, 0.7), charge(168, 0.85, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [sweep(62, 2.2, 3, 0.65), zone(4, 24, 4.5, 0.7), spiral(4, 0.14, 7, 54, 0.6)] },
        { until: 0.33, gap: 1.0, patterns: [ring(14, 60, 0.7), sweep(60, 2.4, 3, 0.6, 2), charge(176, 0.85, 0.7)], enrage: true }
      ]
    },
    {
      id: 'paleherald', name: 'PALE HERALD', hp: 500, r: 11, band: 'silver',
      title: 'VOICE OF THE LOW TIDE',
      brief: 'Pure bullet-hell. Rings, spirals, and a halo of slow lights that circles the sermon before it flies out. There is no safe corner — keep moving.',
      tint: '#d8d3c0',
      sig: { type: 'orbit', name: 'SERMON HALO', blurb: 'A halo of slow lights circles the sermon, then flies out at the amen.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [ring(14, 56, 0.65), orbit(8, 30, 2.4, 46, 0.65)] },
        { until: 0.66, gap: 1.0, patterns: [ring(16, 58, 0.65), spiral(4, 0.15, 7, 58, 0.6), aimed(4, 20, 82, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.14, 8, 60, 0.55), ring(16, 60, 0.6), shotgun(3, 5, 28, 80, 0.6, 0.45)] }
      ]
    },
    {
      id: 'gloamwarden', name: 'GLOAMWARDEN', hp: 520, r: 12, band: 'silver',
      title: 'KEEPER OF THE DROWNED VAULT',
      brief: 'Floods the vault floor, then sweeps it clean. A tidal wall of water crosses with one gap — pools and cutting beams in the same breath.',
      tint: '#6a7fe0',
      sig: { type: 'wall', name: 'DROWN TIDE', blurb: 'A wall of floodwater crosses the vault with one gap — find the seam.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [wall(46, 0.7, 56), zone(3, 22, 4.5, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [zone(3, 24, 4, 0.7), aimed(3, 14, 76, 0.7)] },
        { until: 0.33, gap: 0.9, patterns: [sweep(62, 2.3, 3, 0.6, 2), charge(174, 0.85, 0.7)] }
      ]
    },
    {
      id: 'carrionlaw', name: 'CARRION LAW', hp: 520, r: 11, band: 'silver',
      title: 'MAGISTRATE OF THE ROT',
      brief: 'Serves sentence in shotgun volleys, subpoenas the squares you flee to, and its brood closes the exits. The final verdict is angry.',
      tint: '#b8c93c',
      sig: { type: 'mortar', name: 'SUBPOENA', blurb: 'Serves shells to marked squares that burst into verdict shrapnel.' },
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 4, 26, 72, 0.7, 0.55), spawn(2, 4, 0.65)] },
        { until: 0.66, gap: 1.15, patterns: [mortar(2, 18, 6, 40, 0.7), ring(12, 56, 0.7)] },
        { until: 0.33, gap: 1.05, patterns: [spawn(2, 5, 0.6), spiral(3, 0.15, 6, 52, 0.6)], enrage: true }
      ]
    },
    {
      id: 'ballast', name: 'THE BALLAST', hp: 510, r: 12, band: 'silver',
      title: 'SUNKEN WEIGHT OF THE CHAMPION DOCKS',
      brief: "Every champion ship carries ballast, and every ballast dreams of the deep. Volley decks, flooded plating, and the pull of the tide dragging you off your line.",
      tint: '#5f6f85',
      sig: { type: 'pull', name: 'THE PULL', blurb: 'The tide pulls you toward the sunken weight — walk against it, always.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [shotgun(2, 4, 24, 72, 0.7, 0.55), pull(2.0, 24, 0.7)] },
        { until: 0.66, gap: 1.05, patterns: [ring(13, 56, 0.7), zone(3, 22, 4.5, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [charge(162, 0.85, 0.7), ring(13, 58, 0.65)] }
      ]
    },

    // ================= GOLD BAND — the Tide's tax collectors (owner spec, ARENA POOLS) =================
    // Strictly past the DEATHWARRANT anchor (520), under the old gods (600): the GOLD
    // arena rolls ONLY these six. 3 phases, real pacing — the first rank that fights
    // for it, not against children.
    {
      id: 'brassherald', name: 'BRASS HERALD', hp: 525, r: 11, band: 'gold',
      title: 'TRUMPET OF THE HIGH TIDE',
      brief: 'The loud sibling of the PALE HERALD. Three-volley trumpet salvoes and ring choruses in brass. Keep your feet moving and your ears open.',
      tint: '#d4a24a',
      sig: { type: 'shotgun', name: 'TRUMPET VOLLEY', blurb: 'Three-volley trumpet salvoes — the fan is wide, the re-aim slower than it sounds.' },
      phases: [
        { until: 1, gap: 1.25, patterns: [shotgun(3, 4, 22, 74, 0.7, 0.45), ring(12, 58, 0.7)] },
        { until: 0.66, gap: 1.1, patterns: [shotgun(2, 4, 22, 76, 0.65, 0.5), spiral(3, 0.15, 6, 58, 0.6), aimed(3, 18, 82, 0.6)] },
        { until: 0.33, gap: 1.0, patterns: [ring(13, 60, 0.6), shotgun(2, 4, 26, 76, 0.6, 0.6), spiral(3, 0.14, 7, 58, 0.55)] }
      ]
    },
    {
      id: 'theauditor', name: 'THE AUDITOR', hp: 535, r: 11, band: 'gold',
      title: "RECKONER OF THE TIDE'S LEDGER",
      brief: "The collector the collectors answer to. Audits the exact square you stand on and bills it in shrapnel — precision fire, no pooling the fee.",
      tint: '#f0d05a',
      sig: { type: 'mark', name: 'THE AUDIT', blurb: 'Marks the exact square you stand on, then bills it in shrapnel — move before the fuse ends.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [mark(1, 20, 0.9, 8, 44, 0.7), aimed(3, 16, 78, 0.7), ring(10, 52, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [shotgun(2, 4, 24, 74, 0.65, 0.5), aimed(3, 18, 80, 0.65), ring(11, 54, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [ring(12, 56, 0.7), aimed(3, 16, 78, 0.7)] }
      ]
    },
    {
      id: 'tollmaster', name: 'TOLLMASTER', hp: 545, r: 11, band: 'gold',
      title: 'COLLECTOR OF THE PASSAGE FEE',
      brief: "Charges a toll for every square of floor you want to keep. Bile taxes, paid in advance — move, or the fee compounds.",
      tint: '#c9a23c',
      sig: { type: 'zone', name: 'THE PASSAGE FEE', blurb: 'Taxes every square of floor you want to keep with long-lived bile pools.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [zone(3, 18, 4.5, 0.7), aimed(2, 10, 72, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [zone(3, 18, 4, 0.7), aimed(2, 10, 72, 0.75)] },
        { until: 0.33, gap: 0.95, patterns: [ring(8, 48, 0.8), aimed(2, 12, 74, 0.7)] }
      ]
    },
    {
      id: 'ledger', name: 'THE LEDGER', hp: 555, r: 11, band: 'gold',
      title: 'THE DEBT THAT OUTLIVES YOU',
      brief: "Every collector answers to this book. It stamps ink seals onto the floor that burst, and keeps the change in stamp volleys — the debt compounds every phase.",
      tint: '#c8b464',
      sig: { type: 'mines', name: 'INK SEALS', blurb: 'Stamps ink seals onto the floor that pop into penalty shrapnel.' },
      phases: [
        // hit-diag retune (probe, seeds 1-8 @GOLD): the shipped p1 paired ink pools with
        // a stamp cone — the herding pair walked the bot into shots (and seed 2 died to
        // two phase-2 stamps). One pressure theme per phase: seals+ring, then stamps+ring.
        { until: 1, gap: 1.2, patterns: [mines(3, 18, 3.5, 7, 44, 0.75), ring(10, 52, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [shotgun(2, 3, 20, 72, 0.65, 0.55), ring(11, 54, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [ring(12, 56, 0.65), zone(3, 18, 4, 0.65)] }
      ]
    },

    // ================= BEYOND BAND — past the champion (one exclusive bench per rank) =================
    // Ordered by base HP so the ladder escalates: PLATINUM -> gravewake/cindermaw/
    // hollowregent/ironchoir/puppeteer/lanternmaw, DIAMOND -> theloom/dredgewarden/
    // fathom/undertow/pressuresaint, CRIMSON -> maelstrom/goreprelate/nullsovereign/
    // marshal/gorget/vesper, IRIDESCENT -> theglutton/paleleviathan/oldwater/archive/
    // lastshore/tideunbound.
    {
      id: 'minter', name: 'THE MINTER', hp: 566, r: 11, band: 'gold',
      title: "IT COINS THE TIDE'S FACE",
      brief: 'The mint never closed. A halo of coins circles it and spends itself outward all at once — every bullet is legal tender, and every one is spent on you.',
      tint: '#f5deb3',
      sig: { type: 'orbit', name: 'COIN HALO', blurb: 'Coins circle the mint, then spend themselves outward all at once.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [ring(12, 56, 0.7), orbit(10, 24, 2.2, 50, 0.7)] },
        { until: 0.66, gap: 1.05, patterns: [spiral(3, 0.15, 6, 58, 0.6), shotgun(2, 4, 24, 76, 0.65, 0.5)] },
        { until: 0.33, gap: 0.95, patterns: [ring(13, 58, 0.6), aimed(3, 18, 82, 0.6), spiral(3, 0.14, 7, 58, 0.55)] }
      ]
    },
    {
      id: 'exchequer', name: 'THE EXCHEQUER', hp: 576, r: 12, band: 'gold',
      title: 'THE VAULT THAT WALKS',
      brief: 'The tax office built a vault and gave it legs. It charges to collect, and pools the interest exactly where you stand.',
      tint: '#b8b2a0',
      sig: { type: 'charge', name: 'REPO MAN', blurb: 'The vault walks — charges to collect, and pools the interest where you stood.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [charge(158, 0.85, 0.8), ring(11, 54, 0.7)] },
        { until: 0.66, gap: 1.05, patterns: [zone(3, 20, 4.5, 0.7), aimed(2, 12, 76, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [charge(166, 0.85, 0.65), ring(13, 56, 0.6), shotgun(2, 3, 22, 74, 0.65, 0.55)] }
      ]
    },
    {
      id: 'gravewake', name: 'GRAVEWAKE', hp: 560, r: 12, band: 'beyond',
      title: "THE TIDE'S REGURGITANT",
      brief: 'The Pit threw it away twice. Volley-hymns, cutting beams and a brood that will not stay dead.',
      tint: '#7a4ae0',
      sig: { type: 'spawn', name: 'REGURGITATE', blurb: 'The Pit threw it away twice — the brood it returns can be outkilled.' },
      phases: [
        { until: 1, gap: 1.25, patterns: [shotgun(2, 4, 26, 74, 0.65, 0.55), ring(13, 56, 0.7)] },
        // BROOD TAX (owner report: "just about unbeatable due to how often it summons"):
        // this phase shipped as [spawn, ring] — the round-robin picker fired the spawn
        // every 2nd pattern (~0.58 minions/s at the PLATINUM pacing), which is exactly
        // the player's minion kill rate, so the swarm never emptied and boss DPS
        // collapsed to ~10% for the whole phase (measured: 244s phase, 70 spawn events,
        // 140 minion kills, fight unwinnable). Spawn is now 1-of-3 with the cap at 4 —
        // the brood still hunts you, but it can be OUTKILLED. Summon cadence law in
        // AGENTS.md; the suite pins GRAVEWAKE@PLATINUM as endable.
        { until: 0.75, gap: 1.15, patterns: [spawn(2, 4, 0.6), ring(13, 58, 0.65), ring(12, 58, 0.65)] },
        { until: 0.5, gap: 1.0, patterns: [sweep(56, 2.3, 3, 0.65), shotgun(2, 4, 26, 76, 0.6, 0.5)] },
        { until: 0.25, gap: 1.0, patterns: [sweep(58, 2.4, 3, 0.6, 2), shotgun(2, 4, 28, 78, 0.6, 0.5), ring(14, 58, 0.65)], enrage: true }
      ]
    },
    {
      id: 'cindermaw', name: 'CINDERMAW', hp: 580, r: 12, band: 'beyond',
      title: 'FURNACE OF THE FIRST GATE',
      brief: "The gate's furnace given teeth. Burns ash pits that bloom wider while they live and coughs cinder volleys across the dry ground. The maw is always open.",
      tint: '#e06a3c',
      sig: { type: 'zone', name: 'FURNACE BLOOM', blurb: 'Ash pits bloom wider while the maw coughs cinders across the dry ground.' },
      phases: [
        // SIGNATURE WAVE gate tuning: the full grow (3px/s) + 4 pools cornered the slow
        // siege frame against the bloom edges — probe, seeds 1/3 died in p2/p3 pools.
        // BLOOM stays the identity at grow 2 with one less pool per later phase.
        { until: 1, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.7, 2), ring(13, 58, 0.65)] },
        { until: 0.66, gap: 1.0, patterns: [zone(3, 24, 5, 0.65, 2), shotgun(2, 4, 26, 76, 0.65, 0.5), ring(14, 60, 0.6)] },
        { until: 0.33, gap: 0.95, patterns: [zone(3, 24, 5, 0.6, 2), ring(15, 60, 0.55), shotgun(3, 4, 28, 78, 0.6, 0.5)] }
      ]
    },
    {
      id: 'hollowregent', name: 'HOLLOW REGENT', hp: 590, r: 12, band: 'beyond',
      title: 'A CROWN WITH NOTHING INSIDE',
      brief: "The first gate past the champion keeps an empty king. It charges like a verdict and rings like a bell, and there is nothing behind the eyes to reason with.",
      tint: '#9fb0c8',
      sig: { type: 'charge', name: 'HOLLOW VERDICT', blurb: 'A crown with nothing inside charges like a verdict and rings like a bell.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [charge(160, 0.85, 0.75), ring(12, 56, 0.7)] },
        { until: 0.66, gap: 1.05, patterns: [charge(168, 0.85, 0.7), aimed(3, 16, 78, 0.65), ring(13, 58, 0.65)] },
        { until: 0.33, gap: 0.95, patterns: [charge(176, 0.85, 0.65), ring(14, 58, 0.6), spiral(3, 0.15, 6, 56, 0.6)], enrage: true }
      ]
    },
    {
      id: 'ironchoir', name: 'IRON CHOIR', hp: 600, r: 12, band: 'beyond',
      title: 'HYMNS FROM THE RUST',
      brief: 'Twin cutting beams sing in circles while the ring-voxels keep time. The hymn has three verses. All of them hurt.',
      tint: '#8a92a8',
      sig: { type: 'sweep', name: 'TWIN HYMN', blurb: 'Twin beams sing in circles while the ring-voxels keep time.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [sweep(60, 2.3, 3, 0.6, 2), ring(14, 62, 0.6)] },
        { until: 0.66, gap: 0.95, patterns: [sweep(62, 2.4, 3, 0.55, 2), spiral(4, 0.13, 7, 60, 0.55), aimed(4, 22, 86, 0.55)] },
        { until: 0.33, gap: 0.85, patterns: [sweep(64, 2.5, 3, 0.5, 2), ring(16, 62, 0.55), charge(176, 0.85, 0.6)] }
      ]
    },
    {
      id: 'puppeteer', name: 'THE PUPPETEER', hp: 606, r: 12, band: 'beyond',
      title: 'IT PULLS THE STRINGS BELOW',
      brief: 'Something under the Pit holds the threads. The strings yank it somewhere new mid-fight, bullet-spirals on stage, a brood in the wings.',
      tint: '#d060a8',
      sig: { type: 'blink', name: 'MARIONETTE', blurb: 'The strings yank it somewhere new — read the ghost, it lands where shown.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [blink(46, 10, 48, 0.7), spiral(4, 0.14, 7, 56, 0.6)] },
        // summon-cadence law: spawn is 1-of-3 patterns with cap 4 (the GRAVEWAKE brood
        // fix shape) — never in a two-pattern phase, never above the kill rate.
        { until: 0.66, gap: 1.0, patterns: [spawn(2, 4, 0.6), ring(13, 58, 0.6), sweep(56, 2.2, 3, 0.65)] },
        { until: 0.33, gap: 0.95, patterns: [spawn(2, 4, 0.55), sweep(58, 2.3, 3, 0.6, 2), aimed(3, 16, 80, 0.6)] }
      ]
    },
    {
      id: 'lanternmaw', name: 'LANTERN MAW', hp: 614, r: 13, band: 'beyond',
      title: 'THE LIGHT BELOW IS A MOUTH',
      brief: 'A soft gold light in the deep, and the floor opens under it. Lure lights arm where you wander and burst when approached — bubble rings, and one very real charge.',
      tint: '#5fe0c0',
      sig: { type: 'mines', name: 'LURE LIGHTS', blurb: 'Lure lights arm on the floor and burst when approached — mind the glow.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [mines(2, 18, 3.0, 6, 46, 0.7), aimed(3, 16, 78, 0.65)] },
        { until: 0.66, gap: 1.0, patterns: [ring(14, 58, 0.6), shotgun(2, 4, 26, 76, 0.65, 0.5), zone(3, 22, 4.5, 0.6)] },
        { until: 0.33, gap: 0.95, patterns: [charge(170, 0.85, 0.65), ring(14, 58, 0.6), spiral(3, 0.15, 6, 56, 0.6)], enrage: true }
      ]
    },
    {
      id: 'theloom', name: 'THE LOOM', hp: 620, r: 12, band: 'beyond',
      title: 'WEAVER OF THE TIDE-THREAD',
      brief: 'Spins bullet-thread into curtains that cross the arena with one gap in the weave. The weave tightens every phase — find the gap.',
      tint: '#a97ae6',
      sig: { type: 'wall', name: 'THREAD CURTAINS', blurb: 'Bullet-thread curtains cross the arena with one gap in the weave.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [wall(48, 0.65, 52), spiral(4, 0.13, 7, 58, 0.6)] },
        { until: 0.66, gap: 0.95, patterns: [spiral(5, 0.12, 8, 60, 0.55), aimed(4, 20, 84, 0.6), zone(3, 22, 4.5, 0.65)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.55), shotgun(2, 4, 28, 78, 0.6, 0.5)] }
      ]
    },
    {
      id: 'dredgewarden', name: 'DREDGEWARDEN', hp: 630, r: 12, band: 'beyond',
      title: 'WARDEN OF THE DREDGED DEEP',
      brief: 'It dredges the deep floor and pours what it finds back over the edge — lobbed silt shells that burst where they land, spiral silt, drowning pools. Nowhere dry to stand.',
      tint: '#45b8a8',
      sig: { type: 'mortar', name: 'DREDGE SHELLS', blurb: 'Lobs dredged silt shells that burst where they land.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [mortar(3, 20, 8, 44, 0.7), spiral(4, 0.13, 7, 58, 0.6)] },
        { until: 0.66, gap: 0.95, patterns: [spiral(5, 0.12, 8, 60, 0.55), ring(15, 60, 0.6), zone(4, 24, 5, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.55), zone(4, 24, 5, 0.55)] }
      ]
    },
    {
      id: 'fathom', name: 'THE FATHOM', hp: 640, r: 13, band: 'beyond',
      title: 'WHAT WAITS BENEATH',
      brief: 'Four phases of spiral pressure from below, one turn tighter every act. Kill the brood or drown in it.',
      tint: '#3c6ae0',
      sig: { type: 'spiral', name: 'PRESSURE FROM BELOW', blurb: 'Spiral pressure from beneath — one turn tighter every act.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [spiral(4, 0.14, 7, 58, 0.55), zone(3, 22, 4.5, 0.65)] },
        { until: 0.75, gap: 0.95, patterns: [spiral(5, 0.13, 8, 60, 0.55), spawn(2, 6, 0.6)] },
        { until: 0.5, gap: 0.85, patterns: [ring(16, 62, 0.55), zone(4, 24, 5, 0.6), spiral(4, 0.12, 8, 62, 0.55)] },
        { until: 0.25, gap: 0.8, patterns: [spiral(6, 0.12, 9, 62, 0.5), spawn(3, 7, 0.55), ring(16, 64, 0.5)], enrage: true }
      ]
    },
    {
      id: 'undertow', name: 'THE UNDERTOW', hp: 644, r: 12, band: 'beyond',
      title: 'THE PULL BENEATH EVERY WAVE',
      brief: "You never see it — only what it drags. The strongest pull in the deep, spiral silt and ring-sets that close like water over a head.",
      tint: '#7080b8',
      sig: { type: 'pull', name: 'THE UNDERTOW', blurb: 'The pull beneath every wave drags you off your line — strongest in the deep.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [spiral(4, 0.13, 7, 58, 0.6), pull(2.4, 26, 0.7)] },
        { until: 0.66, gap: 0.95, patterns: [zone(4, 22, 4.5, 0.6), spiral(5, 0.12, 8, 60, 0.55), ring(14, 60, 0.55)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.55), shotgun(2, 4, 26, 78, 0.6, 0.5)] }
      ]
    },
    {
      id: 'pressuresaint', name: 'PRESSURE SAINT', hp: 648, r: 12, band: 'beyond',
      title: 'IT PRAYS IN THE DEEP',
      brief: 'The deep pressure found a congregation. It blesses two squares — yours first — that detonate in prayer-spikes while bubble rings thread the floor. Faith at forty atmospheres.',
      tint: '#5ac0e0',
      sig: { type: 'mark', name: 'PILGRIM MARK', blurb: 'Blesses two squares — yours first — that detonate in prayer-spikes.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [mark(2, 18, 0.85, 7, 44, 0.7), aimed(2, 8, 80, 0.65)] },
        { until: 0.66, gap: 0.95, patterns: [ring(13, 58, 0.65), zone(3, 22, 4, 0.65), spiral(3, 0.14, 6, 58, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(4, 0.13, 7, 60, 0.55), ring(14, 60, 0.55), aimed(3, 14, 82, 0.55)] }
      ]
    },
    {
      id: 'maelstrom', name: 'MAELSTROM', hp: 650, r: 13, band: 'beyond',
      title: 'THE DROWNED VORTEX',
      brief: "The FATHOM's hungry cousin. A ring of the vortex circles the drowned one and collapses outward — bullets, brood, the floor itself. Swim against it or sink.",
      tint: '#2fb8c9',
      sig: { type: 'orbit', name: 'VORTEX RING', blurb: 'A ring of the vortex circles the drowned one, then collapses outward.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [ring(15, 60, 0.6), orbit(12, 30, 2.4, 50, 0.65)] },
        { until: 0.66, gap: 0.95, patterns: [spiral(4, 0.13, 8, 60, 0.55), ring(16, 62, 0.55), spawn(2, 5, 0.6)] },
        { until: 0.33, gap: 0.85, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.5), zone(4, 24, 5, 0.6)] }
      ]
    },
    {
      id: 'goreprelate', name: 'GORE PRELATE', hp: 655, r: 13, band: 'beyond',
      title: 'MINISTER OF THE CRIMSON GATE',
      brief: "The king's own minister. Serves the sermon in cutting beams and aimed benedictions, and the final rite is angry.",
      tint: '#b01830',
      sig: { type: 'sweep', name: 'BENEDICTION', blurb: 'Cutting beams serve the sermon in rotating benedictions.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [sweep(58, 2.3, 3, 0.6), aimed(2, 10, 78, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [sweep(60, 2.4, 3, 0.55, 2), shotgun(2, 4, 26, 78, 0.65, 0.5), ring(10, 52, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [sweep(62, 2.5, 3, 0.6, 2), aimed(2, 12, 80, 0.7), shotgun(2, 4, 24, 76, 0.7, 0.5)], enrage: true }
      ]
    },
    {
      id: 'nullsovereign', name: 'NULL SOVEREIGN', hp: 660, r: 13, band: 'beyond',
      title: 'THE LAST KING OF THE PIT',
      brief: 'Every trick in the Tide, one crown, no mercy. The last king does not run — he is simply elsewhere. The king holds the crimson gate.',
      tint: '#e0b23c',
      sig: { type: 'blink', name: "KING'S STEP", blurb: 'The last king does not run — he is simply elsewhere, with an arrival clap.' },
      phases: [
        { until: 1, gap: 1.2, patterns: [aimed(3, 20, 80, 0.7), blink(50, 10, 50, 0.75), ring(13, 60, 0.65)] },
        { until: 0.75, gap: 1.05, patterns: [sweep(60, 2.3, 3, 0.6, 2), zone(3, 22, 4.5, 0.65), spiral(4, 0.14, 7, 56, 0.6)] },
        { until: 0.5, gap: 1.05, patterns: [ring(12, 60, 0.65), shotgun(2, 4, 24, 74, 0.75, 0.5), spawn(2, 4, 0.6), charge(172, 0.85, 0.7)] },
        { until: 0.25, gap: 0.9, patterns: [sweep(58, 2.5, 3, 0.55, 2), spiral(3, 0.15, 6, 56, 0.6), spawn(2, 6, 0.55)], enrage: true }
      ]
    },
    {
      id: 'marshal', name: 'THE MARSHAL', hp: 668, r: 13, band: 'beyond',
      title: "THE KING'S EXECUTIONER",
      brief: "The crimson court keeps its own law. Tight verdict shotguns and sentence charges — the axe falls in rows, not cones, and the last one is angry.",
      tint: '#c93c50',
      sig: { type: 'shotgun', name: 'EXECUTION VOLLEY', blurb: 'Tight verdict shotguns — the axe falls in rows, not cones.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [shotgun(2, 4, 24, 74, 0.7, 0.5), charge(164, 0.85, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [sweep(60, 2.3, 3, 0.6), shotgun(2, 4, 26, 76, 0.65, 0.5), ring(12, 58, 0.65)] },
        { until: 0.33, gap: 0.9, patterns: [charge(174, 0.85, 0.65), spiral(4, 0.13, 7, 58, 0.6), ring(13, 58, 0.6)], enrage: true }
      ]
    },
    {
      id: 'gorget', name: 'THE GORGET', hp: 671, r: 13, band: 'beyond',
      title: 'THE COLLAR OF THE CRIMSON GATE',
      brief: 'Court armor that outlived its king. Its slugs bound off the collar plates and the walls — cutting sweeps and sentence charges, worn like jewelry.',
      tint: '#a82c5c',
      sig: { type: 'ric', name: 'RICOCHET PLATE', blurb: 'Court slugs bound off the collar plates — twice off the walls.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [ric(5, 58, 2, 18, 0.7), sweep(58, 2.3, 3, 0.6)] },
        { until: 0.66, gap: 1.0, patterns: [charge(168, 0.85, 0.7), ring(13, 58, 0.6), aimed(2, 12, 78, 0.65)] },
        { until: 0.33, gap: 0.9, patterns: [sweep(60, 2.4, 3, 0.55, 2), charge(172, 0.85, 0.65), ring(13, 58, 0.55)], enrage: true }
      ]
    },
    {
      id: 'vesper', name: 'VESPER', hp: 676, r: 12, band: 'beyond',
      title: 'EVENSONG FOR THE SUNKEN THRONE',
      brief: 'The court sings vespers for a throne that drowned. Rings in choir rows, choir spores that drift after you between verses, and a brood that hums along.',
      tint: '#e07a9a',
      sig: { type: 'seek', name: 'CHOIR DRIFT', blurb: 'Choir spores drift after you between the ring verses.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [ring(14, 60, 0.6), seek(3, 42, 0.9, 0.7)] },
        // probe fix (roster44, seed 3 died @59s): the shipped p2 paired silt zones with the
        // brood — the minions herded the bot INTO the live pools (every hit was minion
        // contact during zone cycles). The brood phase keeps the summon-cadence shape
        // (spawn 1-of-3, cap 4) and drops floor denial; the silt moves to the finale.
        { until: 0.66, gap: 0.95, patterns: [spawn(2, 4, 0.6), ring(13, 58, 0.65), ring(12, 58, 0.65)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(4, 0.13, 8, 60, 0.55), ring(16, 62, 0.5), zone(3, 22, 4.5, 0.55)], enrage: true }
      ]
    },
    {
      id: 'theglutton', name: 'THE GLUTTON', hp: 680, r: 13, band: 'beyond',
      title: 'IT DEVOURS THE PIT',
      brief: "The Tide's hunger given a body. It eats floor, brood and light — everything except you, so far. Starve it or feed it.",
      tint: '#d04a6a',
      sig: { type: 'spawn', name: 'GLUTTONY', blurb: 'It eats floor, brood and light — starve the swarm, feed it nothing.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.7), aimed(3, 16, 78, 0.65)] },
        { until: 0.66, gap: 1.0, patterns: [spawn(2, 4, 0.6), shotgun(2, 3, 24, 74, 0.65, 0.5), ring(14, 60, 0.6)] },
        // herding-law cleanup (SIGNATURE WAVE audit): p3 shipped as [spawn, zone, aimed]
        // — a spawn phase carrying floor-denial pools, the exact VESPER herding pair the
        // 2026.11.17 law forbids. The zone moves out; the finale keeps spawn + clean fire.
        { until: 0.33, gap: 0.9, patterns: [spawn(2, 3, 0.55), aimed(3, 20, 84, 0.55), ring(14, 60, 0.6)] }
      ]
    },
    {
      id: 'paleleviathan', name: 'PALE LEVIATHAN', hp: 690, r: 13, band: 'beyond',
      title: 'THE FIRST THING THE TIDE DROWNED',
      brief: "Older than the collectors, older than the king — the first thing the Tide ever drowned, still swimming. Twin beams and a pale current of seekers that swims against your line.",
      tint: '#bfe8d8',
      sig: { type: 'seek', name: 'PALE CURRENT', blurb: 'A pale current of seekers swims against your line.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [sweep(58, 2.3, 3, 0.6), seek(4, 44, 1.0, 0.7)] },
        { until: 0.75, gap: 1.0, patterns: [spiral(4, 0.13, 7, 58, 0.6), ring(14, 58, 0.6), aimed(3, 16, 80, 0.6)] },
        { until: 0.5, gap: 0.95, patterns: [zone(3, 22, 4.5, 0.6), spiral(5, 0.12, 8, 60, 0.55), ring(15, 60, 0.55)] },
        { until: 0.25, gap: 0.9, patterns: [sweep(60, 2.4, 3, 0.55, 2), spiral(4, 0.13, 8, 58, 0.5), spawn(2, 4, 0.55)], enrage: true }
      ]
    },
    {
      id: 'oldwater', name: 'OLD WATER', hp: 700, r: 13, band: 'beyond',
      title: 'THE FIRST DROWNING',
      brief: "Older than the Pit, older than the Tide that uses it. It does not attack — it rises. Four phases, and the last one remembers every drowning.",
      tint: '#7fd7c9',
      sig: { type: 'ring', name: 'EVERY DROWNING', blurb: 'Rising ring-sets, one after another — the last one remembers every wave.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [ring(14, 60, 0.6), zone(3, 22, 4.5, 0.65)] },
        { until: 0.75, gap: 1.0, patterns: [spiral(4, 0.13, 8, 58, 0.55), ring(15, 60, 0.6), aimed(3, 18, 82, 0.6)] },
        { until: 0.5, gap: 0.95, patterns: [zone(4, 24, 5, 0.6), spiral(5, 0.12, 8, 60, 0.55), ring(16, 62, 0.55)] },
        { until: 0.25, gap: 0.9, patterns: [ring(16, 62, 0.55), spiral(4, 0.13, 8, 58, 0.5), spawn(2, 5, 0.55)], enrage: true }
      ]
    },
    {
      id: 'archive', name: 'THE ABYSSAL ARCHIVE', hp: 705, r: 13, band: 'beyond',
      title: 'EVERY DROWNING, DOCUMENTED',
      brief: 'The deep keeps records. It documents where you stood and footnotes it in shrapnel; cutting beams cite their sources, and the final chapter is angry.',
      tint: '#9fb8e8',
      sig: { type: 'mark', name: 'DOCUMENTED', blurb: 'Documents where you stood and footnotes it in shrapnel.' },
      phases: [
        { until: 1, gap: 1.1, patterns: [aimed(3, 18, 80, 0.65), mark(2, 20, 0.85, 8, 44, 0.7)] },
        { until: 0.75, gap: 1.0, patterns: [sweep(56, 2.3, 3, 0.6, 2), zone(3, 22, 4.5, 0.6)] },
        { until: 0.5, gap: 0.95, patterns: [spiral(5, 0.12, 8, 60, 0.55), shotgun(2, 4, 28, 76, 0.6, 0.5), ring(14, 60, 0.55)] },
        // summon-cadence law: spawn 1-of-3, cap 4.
        { until: 0.25, gap: 0.9, patterns: [sweep(58, 2.4, 3, 0.55, 2), spiral(4, 0.13, 8, 58, 0.5), spawn(2, 4, 0.55)], enrage: true }
      ]
    },
    {
      id: 'lastshore', name: 'THE LAST SHORE', hp: 711, r: 13, band: 'beyond',
      title: 'WHERE THE TIDE GOES TO DIE',
      brief: 'Past every gate there is a beach where the Tide finally stops. One last wave rolls across the shore with a single gap, rings break on it, and it remembers every wave.',
      tint: '#d8d0a8',
      sig: { type: 'wall', name: 'THE LAST WAVE', blurb: 'One last wave rolls across the shore with a single gap to stand in.' },
      phases: [
        // SIGNATURE WAVE gate tuning: wave + 3 pools squeezed the siege frame into
        // corners (probe seeds 1/3) — the wave is the theme, the pools move out, and
        // the gap widens so the seam is a place to stand, not a slit.
        { until: 1, gap: 1.1, patterns: [wall(46, 0.7, 72), aimed(3, 14, 74, 0.7)] },
        { until: 0.75, gap: 1.0, patterns: [spiral(4, 0.13, 8, 60, 0.55), aimed(4, 20, 84, 0.55)] },
        { until: 0.5, gap: 0.95, patterns: [sweep(58, 2.3, 3, 0.6, 2), ring(15, 62, 0.55), zone(4, 24, 5, 0.55)] },
        // summon-cadence law: spawn 1-of-3, cap 5.
        { until: 0.25, gap: 0.9, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.5), spawn(2, 5, 0.55)], enrage: true }
      ]
    },
    {
      id: 'tideunbound', name: 'TIDE UNBOUND', hp: 720, r: 14, band: 'beyond',
      title: 'THE SOURCE OF THE CRIMSON TIDE',
      brief: 'Not a lieutenant. The Tide itself, unbound from the Pit. Everything it has ever taught you, all at once, forever.',
      tint: '#ff4d6d',
      sig: { type: 'arsenal', name: 'EVERYTHING ALL AT ONCE', blurb: 'The Tide itself — every lesson the Pit taught you, all at once, forever.' },
      phases: [
        { until: 1, gap: 1.15, patterns: [aimed(4, 22, 84, 0.65), ring(12, 56, 0.65)] },
        { until: 0.75, gap: 1.0, patterns: [sweep(56, 2.3, 3, 0.6, 2), spiral(4, 0.13, 7, 58, 0.55)] },
        { until: 0.5, gap: 0.95, patterns: [shotgun(2, 4, 28, 76, 0.7, 0.5), ring(13, 56, 0.65)] },
        { until: 0.25, gap: 0.9, patterns: [ring(14, 58, 0.55), spiral(4, 0.13, 8, 58, 0.5), spawn(2, 5, 0.55)], enrage: true }
      ]
    }
  ];

  return { LIST };
});
