// CORE BREACH: PIT — palette (16-color retro set) + CRT constants. Pure data.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PIT_PAL = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const C = {
    bg: '#05070d', deep: '#0a0e1a', wall: '#2a3550', walllit: '#3d4f78',
    crimson: '#e23b4e', crimdark: '#8f1f2e', crimlite: '#ff7a8a',
    teal: '#35d0c0', tealdark: '#1a7a72', tealite: '#a8fff5',
    amber: '#ffb84d', gold: '#ffd98a', white: '#f4f6ff',
    gray: '#97a3bf', purple: '#7a4dd8', void: '#131a2e'
  };

  return { C };
});
