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
// A test pins the calibration: silver-band HP must stay within 480..560, bronze <= 300,
// gold strictly past the silver anchor and under 600, beyond strictly above silver.
// A second test pins OWNERSHIP: the seven arena pools are pairwise disjoint and their
// union is the whole roster. Moving a boss across bands means moving its numbers too.
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
  const zone = (count, r, pool, tele) => ({ type: 'zone', count, r, pool, tele, dur: 0.01 });
  const spiral = (arms, rate, dur, speed, tele) => ({ type: 'spiral', arms, rate, dur, speed, tele });
  const spawn = (count, max, tele) => ({ type: 'spawn', count, max, tele, dur: 0.01 });

  const LIST = [
    // ================= BRONZE BAND — the easy warm-up (owner spec: keep it "super ez") =================
    {
      id: 'gatekeeper', name: 'GATEKEEPER', hp: 160, r: 10, band: 'bronze',
      title: 'WARDEN OF THE FIRST GATE',
      brief: 'Basic tide construct. Slow aimed slugs and ring bursts. Learn the dash.',
      tint: '#e23b4e',
      phases: [
        { until: 1, gap: 1.35, patterns: [aimed(3, 16, 80, 0.7), ring(12, 54, 0.8)] },
        { until: 0.5, gap: 1.15, patterns: [ring(10, 50, 0.85), aimed(2, 12, 74, 0.8), shotgun(2, 3, 20, 72, 0.7, 0.55)] }
      ]
    },
    {
      id: 'bilespitter', name: 'BILESPITTER', hp: 230, r: 11, band: 'bronze',
      title: 'CHEM-WARDEN OF THE LOW PITS',
      brief: 'Floods the floor with bile pools, then peppers the dry ground. Watch your feet.',
      tint: '#9ae66e',
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 4, 26, 76, 0.7, 0.5), zone(3, 24, 4.5, 0.8)] },
        { until: 0.55, gap: 1.0, patterns: [zone(3, 22, 4.5, 0.75), shotgun(2, 4, 24, 76, 0.7, 0.5), aimed(3, 16, 82, 0.65)] }
      ]
    },
    {
      id: 'gnasher', name: 'GNASHER', hp: 185, r: 9, band: 'bronze',
      title: 'PIT STRAY',
      brief: 'A fast, dumb tide-hound. Straight slugs and thin rings. Warm-up meat.',
      tint: '#e08a3c',
      phases: [
        { until: 1, gap: 1.4, patterns: [aimed(2, 14, 74, 0.8), ring(10, 50, 0.85)] },
        { until: 0.5, gap: 1.2, patterns: [aimed(3, 18, 76, 0.75), ring(12, 52, 0.8), shotgun(2, 3, 20, 70, 0.7, 0.55)] }
      ]
    },
    {
      id: 'cindermite', name: 'CINDERMITE', hp: 240, r: 10, band: 'bronze',
      title: 'ASH-VEIN CRAWLER',
      brief: 'Burns ash pools into the floor while it snipes. Feet first, gun second.',
      tint: '#d9c34a',
      phases: [
        { until: 1, gap: 1.35, patterns: [zone(2, 20, 4, 0.85), aimed(2, 14, 76, 0.8)] },
        { until: 0.5, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.8), ring(12, 54, 0.8), shotgun(2, 4, 22, 72, 0.7, 0.5)] }
      ]
    },
    {
      id: 'thresher', name: 'THRESHER', hp: 290, r: 11, band: 'bronze',
      title: 'GATE-CHAIN EXECUTIONER',
      brief: 'Chain-shot volleys and the first real charges. Sidestep, then punish.',
      tint: '#4ac2b8',
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 4, 26, 74, 0.75, 0.55), charge(140, 0.85, 0.8)] },
        { until: 0.5, gap: 1.1, patterns: [charge(150, 0.85, 0.75), ring(12, 54, 0.8), aimed(3, 18, 78, 0.7)] }
      ]
    },

    // ================= SILVER BAND — THE DEATHWARRANT AREA (owner spec: silver = champion weight) =================
    {
      id: 'surgeon', name: 'THE SURGEON', hp: 500, r: 10, band: 'silver',
      title: 'CUTTER OF THE CRIMSON COURT',
      brief: 'Rebuilt for the champion weight class: rotating cutting beams, body charges and a scalpel volley. Dash THROUGH the beam, never away from it.',
      tint: '#ff7a8a',
      phases: [
        { until: 1, gap: 1.15, patterns: [sweep(58, 2.3, 3, 0.6), charge(165, 0.85, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [sweep(60, 2.3, 3, 0.6), charge(170, 0.85, 0.7), aimed(3, 18, 84, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [sweep(62, 2.4, 3, 0.55), charge(176, 0.85, 0.65), aimed(4, 20, 86, 0.6)] }
      ]
    },
    {
      id: 'hive', name: 'HIVE MOTHER', hp: 480, r: 12, band: 'silver',
      title: 'BROODWARD OF THE TIDE',
      brief: 'Promoted to the champion weight class. Spiral brood-fire and live spawn, faster on every phase. Kill the blobs or they will herd you.',
      tint: '#c98f4d',
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
      phases: [
        { until: 1, gap: 1.3, patterns: [aimed(5, 26, 86, 0.65), ring(13, 60, 0.7), charge(168, 0.85, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [sweep(62, 2.2, 3, 0.65), zone(4, 24, 4.5, 0.7), spiral(4, 0.14, 7, 54, 0.6)] },
        { until: 0.33, gap: 1.0, patterns: [ring(14, 60, 0.7), sweep(60, 2.4, 3, 0.6, 2), charge(176, 0.85, 0.7)], enrage: true }
      ]
    },
    {
      id: 'paleherald', name: 'PALE HERALD', hp: 500, r: 11, band: 'silver',
      title: 'VOICE OF THE LOW TIDE',
      brief: 'Pure bullet-hell. Rings and spirals in the shape of a sermon. There is no safe corner — keep moving.',
      tint: '#d8d3c0',
      phases: [
        { until: 1, gap: 1.15, patterns: [ring(14, 56, 0.65), spiral(3, 0.16, 6, 56, 0.6)] },
        { until: 0.66, gap: 1.0, patterns: [ring(16, 58, 0.65), spiral(4, 0.15, 7, 58, 0.6), aimed(4, 20, 82, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.14, 8, 60, 0.55), ring(16, 60, 0.6), shotgun(3, 5, 28, 80, 0.6, 0.45)] }
      ]
    },
    {
      id: 'gloamwarden', name: 'GLOAMWARDEN', hp: 520, r: 12, band: 'silver',
      title: 'KEEPER OF THE DROWNED VAULT',
      brief: 'Floods the vault floor, then sweeps it clean. Pools and cutting beams in the same breath.',
      tint: '#6a7fe0',
      phases: [
        { until: 1, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.7), sweep(58, 2.2, 3, 0.6)] },
        { until: 0.66, gap: 1.0, patterns: [zone(3, 24, 4, 0.7), aimed(3, 14, 76, 0.7)] },
        { until: 0.33, gap: 0.9, patterns: [sweep(62, 2.3, 3, 0.6, 2), charge(174, 0.85, 0.7)] }
      ]
    },
    {
      id: 'carrionlaw', name: 'CARRION LAW', hp: 520, r: 11, band: 'silver',
      title: 'MAGISTRATE OF THE ROT',
      brief: 'Sentences you in shotgun volleys while its brood closes the exits. The final verdict is angry.',
      tint: '#b8c93c',
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 4, 26, 72, 0.7, 0.55), spawn(2, 4, 0.65)] },
        { until: 0.66, gap: 1.15, patterns: [shotgun(2, 3, 28, 72, 0.65, 0.5), ring(12, 56, 0.7)] },
        { until: 0.33, gap: 1.05, patterns: [spawn(2, 5, 0.6), spiral(3, 0.15, 6, 52, 0.6)], enrage: true }
      ]
    },

    // ================= GOLD BAND — the Tide's tax collectors (owner spec, ARENA POOLS) =================
    // Strictly past the DEATHWARRANT anchor (520), under the old gods (600): the GOLD
    // arena rolls ONLY these four. 3 phases, real pacing — the first rank that fights
    // for it, not against children. Ordered by base HP.
    {
      id: 'brassherald', name: 'BRASS HERALD', hp: 525, r: 11, band: 'gold',
      title: 'TRUMPET OF THE HIGH TIDE',
      brief: 'The loud sibling of the PALE HERALD. Volley salvoes and ring choruses in brass. Keep your feet moving and your ears open.',
      tint: '#d4a24a',
      phases: [
        { until: 1, gap: 1.25, patterns: [shotgun(2, 4, 24, 74, 0.7, 0.5), ring(12, 58, 0.7)] },
        { until: 0.66, gap: 1.1, patterns: [shotgun(2, 4, 22, 76, 0.65, 0.5), spiral(3, 0.15, 6, 58, 0.6), aimed(3, 18, 82, 0.6)] },
        { until: 0.33, gap: 1.0, patterns: [ring(13, 60, 0.6), shotgun(2, 4, 26, 76, 0.6, 0.6), spiral(3, 0.14, 7, 58, 0.55)] }
      ]
    },
    {
      id: 'theauditor', name: 'THE AUDITOR', hp: 535, r: 11, band: 'gold',
      title: 'RECKONER OF THE TIDE\'S LEDGER',
      brief: "The collector the collectors answer to. Audits every square you stand on and bills you in aimed volleys — precision fire, no pooling the fee.",
      tint: '#f0d05a',
      phases: [
        { until: 1, gap: 1.2, patterns: [aimed(3, 16, 78, 0.7), ring(10, 52, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [shotgun(2, 4, 24, 74, 0.65, 0.5), aimed(3, 18, 80, 0.65), ring(11, 54, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [ring(12, 56, 0.7), aimed(3, 16, 78, 0.7)] }
      ]
    },
    {
      id: 'tollmaster', name: 'TOLLMASTER', hp: 545, r: 11, band: 'gold',
      title: 'COLLECTOR OF THE PASSAGE FEE',
      brief: "Charges a toll for every square of floor you want to keep. Bile taxes, paid in advance — move, or the fee compounds.",
      tint: '#c9a23c',
      phases: [
        { until: 1, gap: 1.2, patterns: [zone(3, 18, 4.5, 0.7), aimed(2, 10, 72, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [zone(3, 18, 4, 0.7), aimed(2, 10, 72, 0.75)] },
        { until: 0.33, gap: 0.95, patterns: [ring(8, 48, 0.8), aimed(2, 12, 74, 0.7)] }
      ]
    },
    {
      id: 'ledger', name: 'THE LEDGER', hp: 555, r: 11, band: 'gold',
      title: 'THE DEBT THAT OUTLIVES YOU',
      brief: "Every collector answers to this book. It stamps the floor with ink taxes and keeps the change in stamp volleys — and the debt compounds every phase.",
      tint: '#c8b464',
      phases: [
        // hit-diag retune (probe, seeds 1-8 @GOLD): the shipped p1 paired ink pools with
        // a stamp cone — the herding pair walked the bot into shots (and seed 2 died to
        // two phase-2 stamps). One pressure theme per phase: pools+ring, then stamps+ring.
        { until: 1, gap: 1.2, patterns: [zone(3, 20, 4.5, 0.75), ring(10, 52, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [shotgun(2, 3, 20, 72, 0.65, 0.55), ring(11, 54, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [ring(12, 56, 0.65), zone(3, 18, 4, 0.65)] }
      ]
    },

    // ================= BEYOND BAND — past the champion (one exclusive quartet per rank) =================
    // Ordered by base HP so the ladder escalates: PLATINUM -> gravewake/cindermaw/
    // hollowregent/ironchoir, DIAMOND -> theloom/dredgewarden/fathom/pressuresaint,
    // CRIMSON -> maelstrom/goreprelate/nullsovereign/marshal, IRIDESCENT -> theglutton/
    // paleleviathan/oldwater/tideunbound.
    {
      id: 'gravewake', name: 'GRAVEWAKE', hp: 560, r: 12, band: 'beyond',
      title: "THE TIDE'S REGURGITANT",
      brief: 'The Pit threw it away twice. Volley-hymns, cutting beams and a brood that will not stay dead.',
      tint: '#7a4ae0',
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
      brief: "The gate's furnace given teeth. Burns ash pits into the floor and coughs cinder volleys across the dry ground. The maw is always open.",
      tint: '#e06a3c',
      phases: [
        { until: 1, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.7), ring(13, 58, 0.65)] },
        { until: 0.66, gap: 1.0, patterns: [zone(4, 24, 5, 0.65), shotgun(2, 4, 26, 76, 0.65, 0.5), ring(14, 60, 0.6)] },
        { until: 0.33, gap: 0.95, patterns: [zone(4, 24, 5, 0.6), ring(15, 60, 0.55), shotgun(3, 4, 28, 78, 0.6, 0.5)] }
      ]
    },
    {
      id: 'hollowregent', name: 'HOLLOW REGENT', hp: 590, r: 12, band: 'beyond',
      title: 'A CROWN WITH NOTHING INSIDE',
      brief: "The first gate past the champion keeps an empty king. It charges like a verdict and rings like a bell, and there is nothing behind the eyes to reason with.",
      tint: '#9fb0c8',
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
      phases: [
        { until: 1, gap: 1.1, patterns: [sweep(60, 2.3, 3, 0.6, 2), ring(14, 62, 0.6)] },
        { until: 0.66, gap: 0.95, patterns: [sweep(62, 2.4, 3, 0.55, 2), spiral(4, 0.13, 7, 60, 0.55), aimed(4, 22, 86, 0.55)] },
        { until: 0.33, gap: 0.85, patterns: [sweep(64, 2.5, 3, 0.5, 2), ring(16, 62, 0.55), charge(176, 0.85, 0.6)] }
      ]
    },
    {
      id: 'theloom', name: 'THE LOOM', hp: 620, r: 12, band: 'beyond',
      title: 'WEAVER OF THE TIDE-THREAD',
      brief: 'Spins bullet-thread into curtains you have to thread. The weave tightens every phase — find the gaps in the pattern.',
      tint: '#a97ae6',
      phases: [
        { until: 1, gap: 1.1, patterns: [spiral(4, 0.13, 7, 58, 0.6), ring(14, 60, 0.6)] },
        { until: 0.66, gap: 0.95, patterns: [spiral(5, 0.12, 8, 60, 0.55), aimed(4, 20, 84, 0.6), zone(3, 22, 4.5, 0.65)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.55), shotgun(2, 4, 28, 78, 0.6, 0.5)] }
      ]
    },
    {
      id: 'dredgewarden', name: 'DREDGEWARDEN', hp: 630, r: 12, band: 'beyond',
      title: 'WARDEN OF THE DREDGED DEEP',
      brief: 'It dredges the deep floor and pours what it finds back over the edge. Spiral silt, drowning pools, nowhere dry to stand.',
      tint: '#45b8a8',
      phases: [
        { until: 1, gap: 1.1, patterns: [spiral(4, 0.13, 7, 58, 0.6), zone(3, 22, 4.5, 0.65)] },
        { until: 0.66, gap: 0.95, patterns: [spiral(5, 0.12, 8, 60, 0.55), ring(15, 60, 0.6), zone(4, 24, 5, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.55), zone(4, 24, 5, 0.55)] }
      ]
    },
    {
      id: 'fathom', name: 'THE FATHOM', hp: 640, r: 13, band: 'beyond',
      title: 'WHAT WAITS BENEATH',
      brief: 'Four phases of spiral pressure from below. Kill the brood or drown in it.',
      tint: '#3c6ae0',
      phases: [
        { until: 1, gap: 1.1, patterns: [spiral(4, 0.14, 7, 58, 0.55), zone(3, 22, 4.5, 0.65)] },
        { until: 0.75, gap: 0.95, patterns: [spiral(5, 0.13, 8, 60, 0.55), spawn(2, 6, 0.6)] },
        { until: 0.5, gap: 0.85, patterns: [ring(16, 62, 0.55), zone(4, 24, 5, 0.6), spiral(4, 0.12, 8, 62, 0.55)] },
        { until: 0.25, gap: 0.8, patterns: [spiral(6, 0.12, 9, 62, 0.5), spawn(3, 7, 0.55), ring(16, 64, 0.5)], enrage: true }
      ]
    },
    {
      id: 'pressuresaint', name: 'PRESSURE SAINT', hp: 648, r: 12, band: 'beyond',
      title: 'IT PRAYS IN THE DEEP',
      brief: 'The deep pressure found a congregation. Prayer-spikes thread the bubble rings while silt squares off the floor — faith at forty atmospheres.',
      tint: '#5ac0e0',
      phases: [
        { until: 1, gap: 1.1, patterns: [aimed(2, 8, 80, 0.65), zone(3, 20, 4.5, 0.7)] },
        { until: 0.66, gap: 0.95, patterns: [ring(13, 58, 0.65), zone(3, 22, 4, 0.65), spiral(3, 0.14, 6, 58, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spiral(4, 0.13, 7, 60, 0.55), ring(14, 60, 0.55), aimed(3, 14, 82, 0.55)] }
      ]
    },
    {
      id: 'maelstrom', name: 'MAELSTROM', hp: 650, r: 13, band: 'beyond',
      title: 'THE DROWNED VORTEX',
      brief: "The FATHOM's hungry cousin. Everything spirals inward — bullets, brood, the floor itself. Swim against it or sink.",
      tint: '#2fb8c9',
      phases: [
        { until: 1, gap: 1.1, patterns: [ring(15, 60, 0.6), zone(3, 22, 4.5, 0.65)] },
        { until: 0.66, gap: 0.95, patterns: [spiral(4, 0.13, 8, 60, 0.55), ring(16, 62, 0.55), spawn(2, 5, 0.6)] },
        { until: 0.33, gap: 0.85, patterns: [spiral(5, 0.12, 9, 62, 0.5), ring(16, 62, 0.5), zone(4, 24, 5, 0.6)] }
      ]
    },
    {
      id: 'goreprelate', name: 'GORE PRELATE', hp: 655, r: 13, band: 'beyond',
      title: 'MINISTER OF THE CRIMSON GATE',
      brief: "The king's own minister. Serves the sermon in cutting beams and aimed benedictions, and the final rite is angry.",
      tint: '#b01830',
      phases: [
        { until: 1, gap: 1.1, patterns: [sweep(58, 2.3, 3, 0.6), aimed(2, 10, 78, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [sweep(60, 2.4, 3, 0.55, 2), shotgun(2, 4, 26, 78, 0.65, 0.5), ring(10, 52, 0.7)] },
        { until: 0.33, gap: 0.95, patterns: [sweep(62, 2.5, 3, 0.6, 2), aimed(2, 12, 80, 0.7), shotgun(2, 4, 24, 76, 0.7, 0.5)], enrage: true }
      ]
    },
    {
      id: 'nullsovereign', name: 'NULL SOVEREIGN', hp: 660, r: 13, band: 'beyond',
      title: 'THE LAST KING OF THE PIT',
      brief: 'Every trick in the Tide, one crown, no mercy. The king holds the crimson gate.',
      tint: '#e0b23c',
      phases: [
        { until: 1, gap: 1.2, patterns: [aimed(3, 20, 80, 0.7), ring(13, 60, 0.65), charge(168, 0.85, 0.7)] },
        { until: 0.75, gap: 1.05, patterns: [sweep(60, 2.3, 3, 0.6, 2), zone(3, 22, 4.5, 0.65), spiral(4, 0.14, 7, 56, 0.6)] },
        { until: 0.5, gap: 1.05, patterns: [ring(12, 60, 0.65), shotgun(2, 4, 24, 74, 0.75, 0.5), spawn(2, 4, 0.6), charge(172, 0.85, 0.7)] },
        { until: 0.25, gap: 0.9, patterns: [sweep(58, 2.5, 3, 0.55, 2), spiral(3, 0.15, 6, 56, 0.6), spawn(2, 6, 0.55)], enrage: true }
      ]
    },
    {
      id: 'marshal', name: 'THE MARSHAL', hp: 668, r: 13, band: 'beyond',
      title: "THE KING'S EXECUTIONER",
      brief: "The crimson court keeps its own law. Verdict shotguns and sentence charges — the axe falls faster every phase, and the last one is angry.",
      tint: '#c93c50',
      phases: [
        { until: 1, gap: 1.1, patterns: [shotgun(2, 4, 24, 74, 0.7, 0.5), charge(164, 0.85, 0.7)] },
        { until: 0.66, gap: 1.0, patterns: [sweep(60, 2.3, 3, 0.6), shotgun(2, 4, 26, 76, 0.65, 0.5), ring(12, 58, 0.65)] },
        { until: 0.33, gap: 0.9, patterns: [charge(174, 0.85, 0.65), spiral(4, 0.13, 7, 58, 0.6), ring(13, 58, 0.6)], enrage: true }
      ]
    },
    {
      id: 'theglutton', name: 'THE GLUTTON', hp: 680, r: 13, band: 'beyond',
      title: 'IT DEVOURS THE PIT',
      brief: "The Tide's hunger given a body. It eats floor, brood and light — everything except you, so far. Starve it or feed it.",
      tint: '#d04a6a',
      phases: [
        { until: 1, gap: 1.15, patterns: [zone(3, 22, 4.5, 0.7), aimed(3, 16, 78, 0.65)] },
        { until: 0.66, gap: 1.0, patterns: [spawn(2, 4, 0.6), shotgun(2, 3, 24, 74, 0.65, 0.5), ring(14, 60, 0.6)] },
        { until: 0.33, gap: 0.9, patterns: [spawn(2, 3, 0.55), zone(3, 20, 4.5, 0.6), aimed(3, 20, 84, 0.55)] }
      ]
    },
    {
      id: 'paleleviathan', name: 'PALE LEVIATHAN', hp: 690, r: 13, band: 'beyond',
      title: 'THE FIRST THING THE TIDE DROWNED',
      brief: "Older than the collectors, older than the king — the first thing the Tide ever drowned, still swimming. Twin beams, tight spirals, and a brood that hatches angry.",
      tint: '#bfe8d8',
      phases: [
        { until: 1, gap: 1.1, patterns: [sweep(58, 2.3, 3, 0.6), ring(13, 58, 0.65)] },
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
      phases: [
        { until: 1, gap: 1.1, patterns: [ring(14, 60, 0.6), zone(3, 22, 4.5, 0.65)] },
        { until: 0.75, gap: 1.0, patterns: [spiral(4, 0.13, 8, 58, 0.55), ring(15, 60, 0.6), aimed(3, 18, 82, 0.6)] },
        { until: 0.5, gap: 0.95, patterns: [zone(4, 24, 5, 0.6), spiral(5, 0.12, 8, 60, 0.55), ring(16, 62, 0.55)] },
        { until: 0.25, gap: 0.9, patterns: [ring(16, 62, 0.55), spiral(4, 0.13, 8, 58, 0.5), spawn(2, 5, 0.55)], enrage: true }
      ]
    },
    {
      id: 'tideunbound', name: 'TIDE UNBOUND', hp: 720, r: 14, band: 'beyond',
      title: 'THE SOURCE OF THE CRIMSON TIDE',
      brief: 'Not a lieutenant. The Tide itself, unbound from the Pit. Everything it has ever taught you, all at once, forever.',
      tint: '#ff4d6d',
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
