// CORE BREACH: PIT — operative definitions. Pure data, no DOM.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PIT_CHARS = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const LIST = [
    {
      id: 'volt', name: 'VOLT', role: 'LINE OPERATIVE',
      blurb: 'Standard-issue pit runner. Reliable fire rate, honest dash.',
      hearts: 3, speed: 68, dashCd: 1.2, dashI: 0.3, dmg: 1.0,
      ability: 'overcharge', abName: 'OVERCHARGE', abCd: 12,
      abBlurb: 'Double fire rate for 3 seconds.',
      tint: '#35d0c0'
    },
    {
      id: 'ghost', name: 'GHOST', role: 'TIDE STALKER',
      blurb: 'Unlocks at SILVER (500 SR). Slippery frame, short dash cycle, light gun.',
      hearts: 3, speed: 82, dashCd: 0.8, dashI: 0.3, dmg: 0.75,
      ability: 'phase', abName: 'PHASE', abCd: 14,
      abBlurb: '2 seconds of intangibility. Walk through anything.',
      tint: '#a8fff5'
    },
    {
      id: 'bulwark', name: 'BULWARK', role: 'SIEGE FRAME',
      blurb: 'Unlocks at PLATINUM (1100 SR). Slow, heavy, hard to kill, hits like a siege engine.',
      hearts: 4, speed: 56, dashCd: 1.5, dashI: 0.35, dmg: 1.2,
      ability: 'bastion', abName: 'BASTION', abCd: 15,
      abBlurb: '4-second frontal barrier that deletes incoming shots.',
      tint: '#ffb84d'
    }
  ];

  return { LIST };
});
