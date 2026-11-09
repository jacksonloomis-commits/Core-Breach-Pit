// CORE BREACH: PIT — arena + boss definitions. Pure data, no DOM.
// Every pattern type: tele (telegraph seconds, MIN 0.5), then active, then recover (default 0.25).
// FAIRNESS RULES asserted by tests: tele >= 0.5, projectile speed <= 90,
// charge speed <= 190, floor pools are outlined during telegraph and can never
// spawn on the player. Do not weaken the law to make a pattern pass.
// BALANCE PASS 2026.11.10: fights were ending before the patterns could threaten
// anyone (bot cleared Arena I in 8s, zero hits). Boss HP up, player fire rate down,
// gaps roughly halved, projectile speeds pushed toward the cap, denser volleys.
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
    {
      id: 'gatekeeper', name: 'GATEKEEPER', hp: 160, r: 10,
      title: 'WARDEN OF THE FIRST GATE',
      brief: 'Basic tide construct. Slow aimed slugs and ring bursts. Learn the dash.',
      tint: '#e23b4e',
      phases: [
        { until: 1, gap: 1.35, patterns: [aimed(3, 16, 80, 0.7), ring(12, 54, 0.8)] },
        { until: 0.5, gap: 1.15, patterns: [ring(14, 56, 0.75), aimed(3, 22, 82, 0.65), shotgun(2, 4, 24, 78, 0.65, 0.5)] }
      ]
    },
    {
      id: 'bilespitter', name: 'BILESPITTER', hp: 230, r: 11,
      title: 'CHEM-WARDEN OF THE LOW PITS',
      brief: 'Floods the floor with bile pools, then peppers the dry ground. Watch your feet.',
      tint: '#9ae66e',
      phases: [
        { until: 1, gap: 1.3, patterns: [shotgun(2, 5, 30, 78, 0.65, 0.5), zone(3, 24, 4.5, 0.8)] },
        { until: 0.55, gap: 1.0, patterns: [zone(4, 24, 5, 0.75), shotgun(3, 5, 32, 80, 0.65, 0.45), aimed(3, 16, 82, 0.65)] }
      ]
    },
    {
      id: 'surgeon', name: 'THE SURGEON', hp: 280, r: 10,
      title: 'CUTTER OF THE CRIMSON COURT',
      brief: 'Rotating cutting beams and body charges. Dash THROUGH the beam, never away from it.',
      tint: '#ff7a8a',
      phases: [
        { until: 1, gap: 1.3, patterns: [sweep(56, 2.2, 3, 0.65), charge(160, 0.6, 0.75)] },
        { until: 0.66, gap: 1.2, patterns: [sweep(58, 2.2, 3, 0.65), charge(160, 0.6, 0.75), aimed(2, 16, 82, 0.7)] },
        { until: 0.33, gap: 1.05, patterns: [sweep(60, 2.4, 3, 0.6), charge(170, 0.6, 0.7)] }
      ]
    },
    {
      id: 'hive', name: 'HIVE MOTHER', hp: 440, r: 12,
      title: 'BROODWARD OF THE TIDE',
      brief: 'Spiral brood-fire and live spawn. Kill the blobs or they will herd you.',
      tint: '#c98f4d',
      phases: [
        { until: 1, gap: 1.1, patterns: [spiral(4, 0.14, 8, 58, 0.6), spawn(2, 5, 0.6)] },
        { until: 0.66, gap: 0.9, patterns: [spiral(5, 0.13, 8, 58, 0.6), spawn(3, 6, 0.6), ring(14, 60, 0.8)] },
        { until: 0.33, gap: 0.75, patterns: [ring(16, 60, 0.75), spawn(3, 6, 0.6), spiral(4, 0.12, 9, 60, 0.6)] }
      ]
    },
    {
      id: 'deathwarrant', name: 'DEATHWARRANT', hp: 520, r: 12,
      title: 'THE PIT CHAMPION',
      brief: 'Every trick in the Tide, one body. Three phases. The last one is angry.',
      tint: '#8f1f2e',
      phases: [
        { until: 1, gap: 1.3, patterns: [aimed(5, 26, 86, 0.65), ring(13, 60, 0.7), charge(168, 0.6, 0.75)] },
        { until: 0.66, gap: 1.05, patterns: [sweep(62, 2.2, 3, 0.65), zone(4, 24, 4.5, 0.7), spiral(4, 0.14, 7, 54, 0.6)] },
        { until: 0.33, gap: 1.0, patterns: [ring(14, 60, 0.7), sweep(60, 2.4, 3, 0.6, 2), charge(176, 0.6, 0.7), spawn(2, 4, 0.6), shotgun(2, 4, 30, 78, 0.7, 0.5)], enrage: true }
      ]
    }
  ];

  const ARENAS = [
    { n: 1, name: 'ARENA I', tier: 'BRONZE', boss: 'gatekeeper', unlocks: [] },
    { n: 2, name: 'ARENA II', tier: 'BRONZE', boss: 'bilespitter', unlocks: ['ghost'] },
    { n: 3, name: 'ARENA III', tier: 'SILVER', boss: 'surgeon', unlocks: [] },
    { n: 4, name: 'ARENA IV', tier: 'GOLD', boss: 'hive', unlocks: ['bulwark'] },
    { n: 5, name: 'ARENA V', tier: 'CHAMPION', boss: 'deathwarrant', unlocks: [] }
  ];

  return { LIST, ARENAS };
});
