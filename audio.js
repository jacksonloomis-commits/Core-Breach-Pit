// CORE BREACH: PIT — WebAudio bleep synth. No assets, no network.
(function () {
  'use strict';
  let ctx = null, enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slide) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }

  // event -> sound map (engine event types + UI sounds)
  function sfx(name) {
    if (!enabled) return;
    switch (name) {
      case 'shoot': tone(880, 0.04, 'square', 0.02, -300); break;
      case 'hurt': tone(180, 0.25, 'sawtooth', 0.12, -120); break;
      case 'dash': tone(300, 0.12, 'square', 0.05, 500); break;
      case 'tele': tone(520, 0.08, 'square', 0.03, 120); break;
      case 'fire': tone(220, 0.1, 'sawtooth', 0.05, -80); break;
      case 'pool': tone(140, 0.2, 'sawtooth', 0.06, -60); break;
      case 'spawn': tone(240, 0.15, 'square', 0.05, 180); break;
      case 'block': tone(660, 0.06, 'square', 0.05, 200); break;
      case 'minkill': tone(440, 0.08, 'square', 0.05, -220); break;
      case 'phase': tone(150, 0.4, 'sawtooth', 0.1, 90); break;
      case 'ability': tone(520, 0.18, 'square', 0.07, 300); break;
      case 'win': tone(523, 0.12, 'square', 0.08); setTimeout(() => tone(659, 0.12, 'square', 0.08), 120); setTimeout(() => tone(784, 0.25, 'square', 0.09), 240); break;
      case 'dead': tone(300, 0.6, 'sawtooth', 0.1, -240); break;
      case 'star': tone(1046, 0.15, 'square', 0.07, 0); break;
      case 'click': tone(700, 0.04, 'square', 0.04, 0); break;
      case 'count': tone(480, 0.06, 'square', 0.05, 0); break;
      case 'go': tone(392, 0.1, 'square', 0.07, 0); setTimeout(() => tone(587, 0.22, 'square', 0.08, 0), 100); break;
      default: break;
    }
  }

  window.PIT_SFX = { sfx, setEnabled(v) { enabled = v; }, isEnabled() { return enabled; } };
})();
