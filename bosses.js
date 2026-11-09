// CORE BREACH: PIT — arena + boss definitions. Pure data, no DOM.
// Every pattern type: tele (telegraph seconds, MIN 0.5), then active, then 0.4 recover.
// FAIRNESS RULES asserted by tests: tele >= 0.5, projectile speed <= 90,
// floor pools are outlined during telegraph and can never spawn on the player.
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
      id: 'gatekeeper', name: 'GATEKEEPER', hp: 100, r: 10,
      title: 'WARDEN OF THE FIRST GATE',
      brief: 'Basic tide construct. Slow aimed slugs and ring bursts. Learn the dash.',
      tint: '#e23b4e',
      phases: [
        { until: 1, gap: 1.5, patterns: [aimed(3, 16, 80, 0.7), ring(14, 52, 0.8)] },
        { until: 0.5, gap: 1.1, patterns: [ring(18, 56, 0.8), aimed(5, 24, 84, 0.6), shotgun(2, 4, 26, 76, 0.6, 0.5)] }
      ]
    },
    {
      id: 'bilespitter', name: 'BILESPITTER', hp: 150, r: 11,
      title: 'CHEM-WARDEN OF THE LOW PITS',
      brief: 'Floods the floor with bile pools, then peppers the dry ground. Watch your feet.',
      tint: '#9ae66e',
      phases: [
        { until: 1, gap: 1.6, patterns: [shotgun(2, 5, 32, 74, 0.6, 0.5), zone(3, 22, 4, 0.8)] },
        { until: 0.55, gap: 1.2, patterns: [zone(4, 22, 4, 0.7), shotgun(3, 5, 32, 78, 0.6, 0.45), aimed(3, 16, 82, 0.6)] }
      ]
    },
    {
      id: 'surgeon', name: 'THE SURGEON', hp: 200, r: 10,
      title: 'CUTTER OF THE CRIMSON COURT',
      brief: 'Rotating cutting beams and body charges. Dash THROUGH the beam, never away from it.',
      tint: '#ff7a8a',
      phases: [
        { until: 1, gap: 1.7, patterns: [sweep(60, 2.2, 3, 0.6), charge(165, 0.55, 0.6)] },
        { until: 0.66, gap: 1.3, patterns: [sweep(75, 2.2, 3, 0.6), charge(175, 0.55, 0.6), aimed(3, 16, 84, 0.6)] },
        { until: 0.33, gap: 1.1, patterns: [sweep(70, 2.4, 3, 0.6, 2), charge(185, 0.55, 0.55)] }
      ]
    },
    {
      id: 'hive', name: 'HIVE MOTHER', hp: 260, r: 12,
      title: 'BROODWARD OF THE TIDE',
      brief: 'Spiral brood-fire and live spawn. Kill the blobs or they will herd you.',
      tint: '#c98f4d',
      phases: [
        { until: 1, gap: 1.7, patterns: [spiral(4, 0.17, 7, 45, 0.6), spawn(2, 4, 0.6)] },
        { until: 0.66, gap: 1.3, patterns: [spiral(5, 0.15, 7, 47, 0.6), spawn(2, 4, 0.6), ring(12, 54, 0.8)] },
        { until: 0.33, gap: 1.1, patterns: [ring(16, 56, 0.8), spawn(2, 4, 0.6), spiral(4, 0.13, 8, 49, 0.6)] }
      ]
    },
    {
      id: 'deathwarrant', name: 'DEATHWARRANT', hp: 380, r: 12,
      title: 'THE PIT CHAMPION',
      brief: 'Every trick in the Tide, one body. Three phases. The last one is angry.',
      tint: '#8f1f2e',
      phases: [
        { until: 1, gap: 1.4, patterns: [aimed(5, 26, 84, 0.6), ring(14, 56, 0.7), charge(170, 0.55, 0.6)] },
        { until: 0.66, gap: 1.2, patterns: [sweep(72, 2.2, 3, 0.6), zone(3, 22, 4, 0.7), spiral(4, 0.15, 6, 47, 0.6)] },
        { until: 0.33, gap: 1.0, patterns: [ring(18, 58, 0.7), sweep(75, 2.4, 3, 0.6, 2), charge(185, 0.55, 0.55), spawn(2, 3, 0.6), shotgun(2, 5, 32, 80, 0.6, 0.45)], enrage: true }
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
