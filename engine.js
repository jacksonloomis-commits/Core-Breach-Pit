// CORE BREACH: PIT — pure rules/sim engine. NO DOM, NO window, NO localStorage.
// Runs identically in the browser (window.PIT) and in Node (module.exports) for tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PIT = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const CHARS = (typeof PIT_CHARS !== 'undefined') ? PIT_CHARS
    : (typeof require === 'function' ? require('./chars.js') : null);
  const BOSSES = (typeof PIT_BOSSES !== 'undefined') ? PIT_BOSSES
    : (typeof require === 'function' ? require('./bosses.js') : null);

  // ---------- geometry ----------
  const W = 320, H = 180, HUD = 26;
  const AR = { x0: 8, y0: HUD + 8, x1: W - 8, y1: H - 8 }; // playfield bounds

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const TAU = Math.PI * 2;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // distance from point P to segment AB (used by laser beams)
  function segDist(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const l2 = abx * abx + aby * aby;
    if (l2 === 0) return dist(px, py, ax, ay);
    let t = ((px - ax) * abx + (py - ay) * aby) / l2;
    t = clamp(t, 0, 1);
    return dist(px, py, ax + t * abx, ay + t * aby);
  }

  // ---------- run creation ----------
  // opts.boss is a bosses.js LIST index (ranked pools store indices) or a boss id.
  function createRun(opts) {
    const idx = typeof opts.boss === 'number' ? opts.boss : BOSSES.LIST.findIndex(b => b.id === opts.boss);
    const bossDef = BOSSES.LIST[idx];
    if (!bossDef) throw new Error('unknown boss ' + opts.boss);
    const char = CHARS.LIST.find(c => c.id === opts.charId);
    if (!char) throw new Error('unknown char ' + opts.charId);

    // ranked modifiers: higher ranks fight the same bosses with more HP and tighter
    // pacing. Telegraphs and projectile/charge speeds are NEVER scaled — the fairness
    // law (tele >= 0.5s, speed caps) must hold at every rank.
    const mods = opts.mods || {};
    const hpMult = clamp(typeof mods.hpMult === 'number' ? mods.hpMult : 1, 1, 3);
    const gapMult = clamp(typeof mods.gapMult === 'number' ? mods.gapMult : 1, 0.5, 1);

    const state = {
      t: 0,
      seed: (opts.seed != null ? opts.seed : (Date.now() ^ (Math.random() * 0xffffffff))) >>> 0,
      rng: null,
      bossIndex: idx,
      char: char,
      bossDef: bossDef,
      player: {
        x: (AR.x0 + AR.x1) / 2, y: AR.y1 - 26,
        r: 3, hearts: char.hearts, maxHearts: char.hearts,
        mvx: 1, mvy: 0,           // last move dir (shield facing)
        dashT: 0, dashI: 0, dashCd: 0,
        invuln: 0, hitCd: 0,      // post-hit grace
        rage: 0, phase: 0,        // ability timers
        abCd: 0,
        fireT: 0
      },
      boss: {
        x: (AR.x0 + AR.x1) / 2, y: AR.y0 + 30, r: bossDef.r || 10,
        hp: Math.round(bossDef.hp * hpMult), maxHp: Math.round(bossDef.hp * hpMult),
        phase: 0, rt: { mode: 'gap', timer: 1.2 * gapMult, pat: null, patIdx: -1 },
        hitFlash: 0
      },
      mods: { hpMult, gapMult },
      proj: [], zones: [], beams: [], minions: [], tracers: [],
      shield: 0,
      hitsTaken: 0,
      events: [],
      over: null // null | 'win' | 'lose'
    };
    state.rng = mulberry32(state.seed);
    state.events.push({ type: 'start' });
    return state;
  }

  // ---------- player damage ----------
  function hurt(st, cause) {
    const p = st.player;
    if (st.over) return false;
    if (p.phase > 0) return false; // PHASE ability: intangible — shots pass through, pools/beams/minions/boss cannot touch you
    if (p.invuln > 0 || p.dashI > 0) return false; // dash i-frames count
    p.hearts -= 1;
    st.hitsTaken += 1;
    p.invuln = 1.0;
    p.hitCd = 0.8;
    st.events.push({ type: 'hurt', cause, x: p.x, y: p.y });
    if (p.hearts <= 0) {
      st.over = 'lose';
      st.events.push({ type: 'dead' });
    }
    return true;
  }

  // ---------- pattern interpreter ----------
  function pickPattern(st) {
    const b = st.boss, def = st.bossDef, rt = b.rt, p = st.player;
    const phase = def.phases[b.phase];
    b.rt.patIdx = (b.rt.patIdx + 1) % phase.patterns.length;
    const pat = phase.patterns[b.rt.patIdx];
    b.rt.pat = pat;
    b.rt.mode = 'tele';
    // PHASE FURY: telegraphs snap a beat tighter every phase, but never below the
    // 0.5s fairness floor — the law is data-side, this is the engine's escalation.
    b.rt.timer = Math.max(0.5, pat.tele * aggroAt(b.phase).tele);
    b.rt.sub = 0;      // generic sub-timer (volley gaps, spiral spawn acc)
    b.rt.spawned = 0;  // volleys / minions spawned
    b.rt.data = {};
    if (pat.type === 'aimed' || pat.type === 'shotgun' || pat.type === 'charge') {
      // lock onto player at telegraph START (dodge by moving after tele)
      rt.data.aim = Math.atan2(st.player.y - b.y, st.player.x - b.x);
    }
    if (pat.type === 'zone') {
      // pre-generate pool spots so the telegraph can outline them BEFORE they go live
      rt.data.spots = [];
      for (let i = 0; i < pat.count; i++) {
        let x = clamp(p.x + (st.rng() - 0.5) * 150, AR.x0 + pat.r, AR.x1 - pat.r);
        let y = clamp(p.y + (st.rng() - 0.5) * 110, AR.y0 + pat.r, AR.y1 - pat.r);
        if (dist(x, y, p.x, p.y) < 26) {
          const ang = Math.atan2(y - p.y, x - p.x) || 0;
          x = clamp(p.x + Math.cos(ang) * 34, AR.x0 + pat.r, AR.x1 - pat.r);
          y = clamp(p.y + Math.sin(ang) * 34, AR.y0 + pat.r, AR.y1 - pat.r);
        }
        rt.data.spots.push({ x, y });
      }
    }
    st.events.push({ type: 'tele', pat: pat.type, x: b.x, y: b.y });
  }

  // ---------- PHASE FURY (owner spec: "make boss phases actually do something") ----------
  // One escalation curve, every boss: each phase the WHOLE fight gets angrier —
  //   gap   — the pause between patterns compresses (compounds with the phase's own data gap)
  //   speed — projectiles leave faster (pattern data caps are untouched; the telegraph
  //           still tells the truth, the bullet just arrives with more intent)
  //   tele  — telegraphs shorten a beat, never below the 0.5s fairness floor
  // Enrage (the last-stand flag in bosses.js) now stacks ON TOP of this curve as the
  // final-phase multiplier: shots/charge/spiral x1.15, gap x0.78.
  const AGGRO = {
    gap:   [1, 0.92, 0.85, 0.78],
    speed: [1, 1.06, 1.12, 1.16],
    tele:  [1, 0.96, 0.92, 0.88]
  };
  function aggroAt(i) {
    const k = clamp(Math.round(i), 0, AGGRO.gap.length - 1);
    return { gap: AGGRO.gap[k], speed: AGGRO.speed[k], tele: AGGRO.tele[k] };
  }

  function spawnProj(st, x, y, ang, speed, kind) {
    const def = st.bossDef;
    const phase = def.phases[st.boss.phase];
    const mult = aggroAt(st.boss.phase).speed * (phase.enrage ? 1.15 : 1);
    st.proj.push({ x, y, vx: Math.cos(ang) * speed * mult, vy: Math.sin(ang) * speed * mult, r: 3, kind: kind || 'shot' });
  }

  function execPattern(st, dt) {
    const b = st.boss, rt = st.boss.rt, pat = rt.pat, p = st.player;
    switch (pat.type) {
      case 'aimed': {
        const mid = rt.data.aim, spread = (pat.spread * Math.PI) / 180;
        for (let i = 0; i < pat.shots; i++) {
          const a = mid - spread / 2 + (pat.shots === 1 ? spread / 2 : (spread * i) / (pat.shots - 1));
          spawnProj(st, b.x, b.y, a, pat.speed);
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'shotgun': {
        rt.spawned++;
        const mid = rt.data.aim, spread = (pat.spread * Math.PI) / 180;
        for (let i = 0; i < pat.shots; i++) {
          const a = mid - spread / 2 + (spread * i) / (pat.shots - 1) + (st.rng() - 0.5) * 0.08;
          spawnProj(st, b.x, b.y, a, pat.speed);
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'ring': {
        const off = st.rng() * TAU;
        for (let i = 0; i < pat.count; i++) {
          spawnProj(st, b.x, b.y, off + (TAU * i) / pat.count, pat.speed);
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'sweep': {
        // beams live for the whole active window, rotating
        const base = Math.atan2(p.y - b.y, p.x - b.x) - (pat.degPerSec * pat.dur * Math.PI) / 360;
        rt.data.ang = base;
        addBeams(st, pat, base);
        break;
      }
      case 'charge': {
        const sp = pat.speed * (st.bossDef.phases[st.boss.phase].enrage ? 1.15 : 1);
        const vx = Math.cos(rt.data.aim) * sp, vy = Math.sin(rt.data.aim) * sp;
        const nx = clamp(b.x + vx * dt, AR.x0 + b.r, AR.x1 - b.r);
        const ny = clamp(b.y + vy * dt, AR.y0 + b.r, AR.y1 - b.r);
        if (nx === b.x && ny === b.y) rt.timer = Math.min(rt.timer, 0.01); // hit a wall, stop early
        b.x = nx; b.y = ny;
        break;
      }
      case 'zone': {
        for (const s of rt.data.spots) st.zones.push({ x: s.x, y: s.y, r: pat.r, until: st.t + pat.pool, hitCd: 0 });
        st.events.push({ type: 'pool' });
        break;
      }
      case 'spiral': {
        rt.sub += dt;
        const rate = pat.rate / (st.bossDef.phases[st.boss.phase].enrage ? 1.15 : 1);
        while (rt.sub >= rate) {
          rt.sub -= rate;
          rt.spawned++;
          const base = rt.spawned * 0.35;
          for (let k = 0; k < pat.arms; k++) {
            spawnProj(st, b.x, b.y, base + (TAU * k) / pat.arms, pat.speed);
          }
        }
        break;
      }
      case 'spawn': {
        const alive = st.minions.length;
        for (let i = 0; i < pat.count && alive + i < (pat.max || 4); i++) {
          const a = st.rng() * TAU;
          st.minions.push({
            x: clamp(b.x + Math.cos(a) * 26, AR.x0 + 4, AR.x1 - 4),
            y: clamp(b.y + Math.sin(a) * 26, AR.y0 + 4, AR.y1 - 4),
            r: 3, hp: 14, hitFlash: 0
          });
        }
        st.events.push({ type: 'spawn' });
        break;
      }
      default: break;
    }
  }

  function addBeams(st, pat, base) {
    st.beams.length = 0;
    st.beams.push({ x: st.boss.x, y: st.boss.y, ang: base, w: pat.width });
    if (pat.arcs === 2) st.beams.push({ x: st.boss.x, y: st.boss.y, ang: base + Math.PI, w: pat.width });
  }

  // ---------- main step ----------
  function step(st, dt, input) {
    if (st.over) return;
    dt = Math.min(dt, 1 / 30);
    st.t += dt;
    const p = st.player, b = st.boss, ch = st.char;

    // --- player move
    let mx = 0, my = 0;
    if (input) {
      mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (input.mx || input.my) { mx = input.mx; my = input.my; } // analog/bot override
    }
    const mlen = Math.hypot(mx, my);
    if (mlen > 0) { mx /= mlen; my /= mlen; p.mvx = mx; p.mvy = my; }

    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashI = Math.max(0, p.dashI - dt); // REGRESSION FIX: dashI was never decayed -> one dash made you invincible for the whole run
    p.invuln = Math.max(0, p.invuln - dt);
    p.hitCd = Math.max(0, p.hitCd - dt);
    p.rage = Math.max(0, p.rage - dt);
    p.phase = Math.max(0, p.phase - dt);
    st.shield = Math.max(0, st.shield - dt);
    b.hitFlash = Math.max(0, b.hitFlash - dt);

    if (input && input.dash && p.dashCd <= 0) {
      const dx = mlen > 0 ? mx : p.mvx, dy = mlen > 0 ? my : p.mvy;
      p.dashT = 0.18; p.dashI = (typeof ch.dashI === 'number' ? ch.dashI : 0.25); p.dashCd = ch.dashCd;
      p.dvx = dx * ch.speed * 2.4; p.dvy = dy * ch.speed * 2.4;
      st.events.push({ type: 'dash', x: p.x, y: p.y });
    }
    if (input && input.ability && p.abCd <= 0) useAbility(st);
    p.abCd = Math.max(0, (p.abCd || 0) - dt);

    const speed = p.dashT > 0 ? 1 : ch.speed;
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x = clamp(p.x + p.dvx * dt, AR.x0 + p.r, AR.x1 - p.r);
      p.y = clamp(p.y + p.dvy * dt, AR.y0 + p.r, AR.y1 - p.r);
    } else if (mlen > 0) {
      p.x = clamp(p.x + mx * speed * dt, AR.x0 + p.r, AR.x1 - p.r);
      p.y = clamp(p.y + my * speed * dt, AR.y0 + p.r, AR.y1 - p.r);
    }

    // --- auto-fire hitscan at nearest enemy
    p.fireT -= dt;
    if (p.fireT <= 0) {
      p.fireT = 0.26 / (p.rage > 0 ? 2 : 1);
      let target = null, best = Infinity;
      for (const m of st.minions) {
        const d = dist(p.x, p.y, m.x, m.y);
        if (d < best) { best = d; target = m; }
      }
      const db = dist(p.x, p.y, b.x, b.y);
      if (db < best) { target = b; best = db; }
      if (target) {
        const dmg = 2 * ch.dmg;
        target.hp -= dmg;
        target.hitFlash = 0.12;
        st.tracers.push({ x1: p.x, y1: p.y, x2: target.x, y2: target.y, t: 0.06 });
        st.events.push({ type: 'shoot' });
        if (target !== b && target.hp <= 0) {
          st.minions.splice(st.minions.indexOf(target), 1);
          st.events.push({ type: 'minkill', x: target.x, y: target.y });
        }
      }
    }
    if (b.hp <= 0 && !st.over) {
      st.over = 'win';
      st.proj.length = 0; st.zones.length = 0; st.beams.length = 0; st.minions.length = 0;
      st.events.push({ type: 'win' });
      return;
    }

    // --- boss phase transitions
    const def = st.bossDef;
    let ph = def.phases[b.phase];
    while (b.phase < def.phases.length - 1 && b.hp / b.maxHp <= def.phases[b.phase + 1].until) {
      b.phase++;
      st.proj.length = 0; st.zones.length = 0; st.beams.length = 0; // fairness wipe
      b.rt = { mode: 'gap', timer: 1.1 * st.mods.gapMult, pat: null, patIdx: -1 };
      // PHASE FURY: the transition answers you — a gold retaliation ring rides out of
      // the fairness wipe. Screen is clean, ring is visible from birth, and its speed
      // (46 + 4/phase, deliberately NO multipliers) stays under the player's run speed
      // (68): always dodgeable by walking, no telegraph needed. kind:'phase' tints it.
      const n = 12 + 2 * b.phase, spd = 46 + 4 * b.phase, off = st.rng() * TAU;
      for (let i = 0; i < n; i++) {
        const a = off + (TAU * i) / n;
        st.proj.push({ x: b.x, y: b.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 3, kind: 'phase' });
      }
      st.events.push({ type: 'phase', n: b.phase, burst: n });
    }
    ph = def.phases[b.phase];

    // --- boss pattern runtime
    const rt = b.rt;
    const pat = rt.pat;
    rt.timer -= dt;
    if (rt.mode === 'gap' && rt.timer <= 0) pickPattern(st);
    else if (rt.mode === 'tele' && rt.timer <= 0) {
      rt.mode = 'active';
      rt.timer = pat.dur || 0.01;
      if (pat.type === 'shotgun') { rt.timer = pat.volleys * pat.gap; execPattern(st, 0); rt.sub = pat.gap; }
      else execPattern(st, 0);
    } else if (rt.mode === 'active') {
      if (pat.type === 'shotgun') {
        rt.sub -= dt;
        if (rt.sub <= 0 && rt.spawned < pat.volleys) { rt.sub += pat.gap; execPattern(st, 0); }
      } else if (pat.type === 'sweep') {
        rt.data.ang += (pat.degPerSec * Math.PI / 180) * dt;
        addBeams(st, pat, rt.data.ang);
      }
      if (pat.type === 'charge') execPattern(st, dt); // charge moves boss during active
      if (rt.timer <= 0) {
        rt.mode = 'recover';
        rt.timer = (typeof ph.recover === 'number' ? ph.recover : 0.25) * aggroAt(b.phase).gap;
        st.beams.length = 0;
      }
    } else if (rt.mode === 'recover' && rt.timer <= 0) {
      rt.mode = 'gap';
      rt.timer = ph.gap * st.mods.gapMult * (ph.enrage ? 0.78 : 1) * aggroAt(b.phase).gap;
    }

    // --- projectiles
    for (let i = st.proj.length - 1; i >= 0; i--) {
      const q = st.proj[i];
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.x < AR.x0 - 6 || q.x > AR.x1 + 6 || q.y < AR.y0 - 6 || q.y > AR.y1 + 6) {
        st.proj.splice(i, 1); continue;
      }
      // bastion shield blocks projectiles in front of the player
      if (st.shield > 0) {
        const d = dist(p.x, p.y, q.x, q.y);
        const dot = ((q.x - p.x) * p.mvx + (q.y - p.y) * p.mvy) / (d || 1);
        if (d < 40 && dot > 0.45) {
          st.proj.splice(i, 1);
          st.events.push({ type: 'block', x: q.x, y: q.y });
          continue;
        }
      }
      if (dist(q.x, q.y, p.x, p.y) < q.r + p.r) {
        if (hurt(st, 'shot')) st.proj.splice(i, 1);
      }
    }

    // --- zones (bile pools)
    for (const z of st.zones) {
      z.hitCd = Math.max(0, z.hitCd - dt);
      if (st.t > z.until) continue;
      if (z.hitCd <= 0 && dist(z.x, z.y, p.x, p.y) < z.r + p.r) {
        if (hurt(st, 'pool')) z.hitCd = 0.6;
      }
    }
    st.zones = st.zones.filter(z => st.t < z.until + 0.4);

    // --- beams (laser sweeps)
    for (const beam of st.beams) {
      const ex = beam.x + Math.cos(beam.ang) * 400, ey = beam.y + Math.sin(beam.ang) * 400;
      if (segDist(p.x, p.y, beam.x, beam.y, ex, ey) < beam.w / 2 + p.r) hurt(st, 'beam');
    }

    // --- minions
    for (const m of st.minions) {
      m.hitFlash = Math.max(0, m.hitFlash - dt);
      const d = dist(m.x, m.y, p.x, p.y) || 1;
      m.x += ((p.x - m.x) / d) * 38 * dt;
      m.y += ((p.y - m.y) / d) * 38 * dt;
      if (d < m.r + p.r + 1) hurt(st, 'minion');
    }
    // --- boss body contact (grace via hitCd)
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r) hurt(st, 'boss');

    // tracers decay
    for (let i = st.tracers.length - 1; i >= 0; i--) {
      st.tracers[i].t -= dt;
      if (st.tracers[i].t <= 0) st.tracers.splice(i, 1);
    }
  }

  // ---------- abilities ----------
  function useAbility(st) {
    const p = st.player, ch = st.char;
    p.abCd = ch.abCd;
    if (ch.ability === 'overcharge') { p.rage = 3; st.events.push({ type: 'ability', id: 'overcharge' }); }
    else if (ch.ability === 'phase') { p.phase = 2; st.events.push({ type: 'ability', id: 'phase' }); }
    else if (ch.ability === 'bastion') { st.shield = 4; st.events.push({ type: 'ability', id: 'bastion' }); }
  }

  // ---------- ranked ladder (RANKED BETA) ----------
  // SR economy (owner spec): wins bank SR by hearts kept; a flatline costs SR.
  // SR never resets — seasons only award cosmetics on top.
  const SR = { WIN_FULL: 30, WIN_ONE: 15, WIN_TWO: -5, WIN_THREE_PLUS: -20, LOSS: -10 };
  function srDelta(win, heartsLost) {
    if (!win) return SR.LOSS;
    if (heartsLost <= 0) return SR.WIN_FULL;
    if (heartsLost === 1) return SR.WIN_ONE;
    if (heartsLost === 2) return SR.WIN_TWO;
    return SR.WIN_THREE_PLUS;
  }

  // Difficulty knobs per rank: the same bosses with more HP and tighter pacing.
  // Telegraphs and speeds are NEVER scaled (fairness law holds at every rank).
  // SILVER is pinned near identity (1.05/0.95) by owner spec: a silver roll must feel
  // like the DEATHWARRANT fight itself, not 30% past it. Escalation continues from Gold up.
  const RANK_MODS = {
    BRONZE: { hpMult: 1.0, gapMult: 1.0 },
    SILVER: { hpMult: 1.05, gapMult: 1.0 },
    GOLD: { hpMult: 1.2, gapMult: 0.9 },
    PLATINUM: { hpMult: 1.5, gapMult: 0.85 },
    DIAMOND: { hpMult: 1.7, gapMult: 0.8 },
    CRIMSON: { hpMult: 1.85, gapMult: 0.75 },
    IRIDESCENT: { hpMult: 2.0, gapMult: 0.7 }
  };

  // Boss pools (owner spec, ARENA POOLS + PHASE FURY): indices into bosses.js LIST.
  // "Each arena should have its own boss pool" — every rank owns an EXCLUSIVE pool;
  // no boss rolls in two arenas. PHASE FURY deepened the five two-boss pools to three:
  //   BRONZE     [0-4]     the bronze band, unchanged ("super ez" by design)
  //   SILVER     [5-10]    THE DEATHWARRANT AREA, champion weight
  //   GOLD       [11-13]   the tax collectors — BRASS HERALD, THE AUDITOR, TOLLMASTER
  //   PLATINUM   [14-16]   gravewake + cindermaw + ironchoir (first gate past the champion)
  //   DIAMOND    [17-19]   theloom + dredgewarden + fathom
  //   CRIMSON    [20-22]   maelstrom + goreprelate + nullsovereign
  //   IRIDESCENT [23-25]   theglutton + oldwater + tideunbound (the Tide itself)
  // A suite test pins OWNERSHIP: the seven pools are pairwise disjoint and their
  // union is the entire 26-boss roster, pool max base HP escalating arena by arena.
  // Bot gates: every boss is proven at its rank preset where VOLT can live there
  // (bronze/silver/gold 3/3) and at base for the beyond band (BULWARK 3/3).
  // PLATINUM+ presets remain the designed beyond-bot wall — humans outplay the bot
  // there (see AGENTS.md; the suite survival-gates them instead of demanding clears).
  const RANKS = [
    { name: 'BRONZE', tier: 1, min: 0, max: 200, pool: [0, 1, 2, 3, 4] },
    { name: 'BRONZE', tier: 2, min: 200, max: 300, pool: [0, 1, 2, 3, 4] },
    { name: 'BRONZE', tier: 3, min: 300, max: 500, pool: [0, 1, 2, 3, 4] },
    { name: 'SILVER', tier: 1, min: 500, max: 600, pool: [5, 6, 7, 8, 9, 10] },
    { name: 'SILVER', tier: 2, min: 600, max: 700, pool: [5, 6, 7, 8, 9, 10] },
    { name: 'SILVER', tier: 3, min: 700, max: 800, pool: [5, 6, 7, 8, 9, 10] },
    { name: 'GOLD', tier: 1, min: 800, max: 900, pool: [11, 12, 13] },
    { name: 'GOLD', tier: 2, min: 900, max: 1100, pool: [11, 12, 13] },
    { name: 'PLATINUM', tier: 1, min: 1100, max: 1400, pool: [14, 15, 16] },
    { name: 'PLATINUM', tier: 2, min: 1400, max: 1700, pool: [14, 15, 16] },
    { name: 'PLATINUM', tier: 3, min: 1700, max: 2000, pool: [14, 15, 16] },
    { name: 'DIAMOND', tier: 1, min: 2000, max: 2200, pool: [17, 18, 19] },
    { name: 'DIAMOND', tier: 2, min: 2200, max: 2400, pool: [17, 18, 19] },
    { name: 'DIAMOND', tier: 3, min: 2400, max: 2500, pool: [17, 18, 19] },
    { name: 'CRIMSON', tier: 1, min: 2500, max: 2800, pool: [20, 21, 22] },
    { name: 'CRIMSON', tier: 2, min: 2800, max: 3100, pool: [20, 21, 22] },
    { name: 'CRIMSON', tier: 3, min: 3100, max: 3500, pool: [20, 21, 22] },
    { name: 'IRIDESCENT', tier: 1, min: 3500, max: Infinity, pool: [23, 24, 25] }
  ];

  function rankFor(sr) {
    for (const r of RANKS) if (sr < r.max) return r;
    return RANKS[RANKS.length - 1];
  }
  function rankLabel(r) { return r.name === 'IRIDESCENT' ? r.name : `${r.name} ${r.tier}`; }
  function rankMods(r) { return RANK_MODS[r.name]; }
  function tierProgress(sr) {
    const r = rankFor(sr);
    if (r.max === Infinity) return { rank: r, pct: 100, toNext: null };
    return { rank: r, pct: clamp(Math.round((100 * (sr - r.min)) / (r.max - r.min)), 0, 100), toNext: r.max - sr };
  }

  // operatives unlock by SR now (were arena clears)
  const CHAR_UNLOCK_SR = { ghost: 500, bulwark: 1100 };

  function applyRankedResult(save, win, heartsLost) {
    const res = { delta: srDelta(win, heartsLost), newChars: [], promoted: null, demoted: null };
    const before = rankFor(save.sr);
    save.sr = Math.max(0, save.sr + res.delta);
    save.peakSr = Math.max(save.peakSr || 0, save.sr);
    save.seasonPeak = Math.max(save.seasonPeak || 0, save.sr);
    if (win) save.wins = (save.wins || 0) + 1; else save.losses = (save.losses || 0) + 1;
    const after = rankFor(save.sr);
    if (rankLabel(after) !== rankLabel(before)) {
      if (RANKS.indexOf(after) > RANKS.indexOf(before)) res.promoted = after;
      else res.demoted = after;
    }
    for (const [id, need] of Object.entries(CHAR_UNLOCK_SR)) {
      if (save.sr >= need && !save.chars.includes(id)) { save.chars.push(id); res.newChars.push(id); }
    }
    return res;
  }

  // ---------- Top 5 (season leaderboard) ----------
  const TOP5_QUALIFY = 4000; // Iridescent Top-5 qualifying number (owner spec)
  const TOP5_MOCK = [ // beta stand-ins until a real backend exists; YOU slots in by SR
    { name: 'Numbugger', sr: 8900 },
    { name: 'Jeff', sr: 6600 },
    { name: 'Biffle', sr: 5090 },
    { name: 'Loomis', sr: 5080 },
    { name: 'Peterbot', sr: 4900 }
  ];
  function leaderboardWith(sr) {
    const all = TOP5_MOCK.map(e => ({ ...e })).concat([{ name: 'YOU', sr, you: true }]);
    all.sort((a, b) => b.sr - a.sr);
    const youIdx = all.findIndex(e => e.you);
    return { board: all.slice(0, 5), you: { pos: youIdx + 1, sr, inBoard: youIdx >= 0 && youIdx < 5 }, qualify: sr >= TOP5_QUALIFY };
  }

  // ---------- seasons ----------
  // Bump SEASON in code to end the current season (owner call): the next load awards
  // a cosmetic badge for that season's peak rank and opens the next one. SR carries.
  const SEASON = 1;
  function defaultRankedSave() {
    return { v: 2, sr: 0, peakSr: 0, season: SEASON, seasonPeak: 0, cosmetics: [], chars: ['volt'], char: 'volt', crt: true, sfx: true, runs: 0, wins: 0, losses: 0 };
  }
  function seasonEnd(save) {
    const res = { badge: null, from: save.season };
    const r = rankFor(save.seasonPeak || 0);
    res.badge = `S${save.season}-${r.name}${r.name === 'IRIDESCENT' ? '' : r.tier}`;
    if (!save.cosmetics.includes(res.badge)) save.cosmetics.push(res.badge);
    save.season = SEASON;
    save.seasonPeak = save.sr;
    return res;
  }

  // ---------- migration (cbp-save-v1 stars/arenas -> v2 ranked) ----------
  // Not a silent break: old progress converts to starting SR — 100 per cleared arena
  // plus 20 per star. A full 5-arena / 15-star save lands at 800 SR (Gold 1).
  function migrateSave(old) {
    const s = defaultRankedSave();
    let sr = 0;
    const cleared = Array.isArray(old.cleared) ? old.cleared : [];
    const stars = Array.isArray(old.stars) ? old.stars : [];
    for (let i = 0; i < cleared.length; i++) if (cleared[i]) sr += 100;
    for (let i = 0; i < stars.length; i++) sr += (stars[i] || 0) * 20;
    s.sr = sr; s.peakSr = sr; s.seasonPeak = sr;
    if (Array.isArray(old.chars) && old.chars.length) s.chars = old.chars.slice();
    if (typeof old.char === 'string') s.char = old.char;
    if (old.crt === false) s.crt = false;
    if (old.sfx === false) s.sfx = false;
    s.runs = old.runs || 0;
    s.wins = old.wins || 0;
    return s;
  }

  return {
    W, H, HUD, AR, CHARS, BOSSES, createRun, step, hurt, mulberry32, segDist, clamp, dist,
    AGGRO, aggroAt,
    SR, srDelta, RANKS, RANK_MODS, rankFor, rankLabel, rankMods, tierProgress,
    CHAR_UNLOCK_SR, applyRankedResult, TOP5_QUALIFY, TOP5_MOCK, leaderboardWith,
    SEASON, defaultRankedSave, seasonEnd, migrateSave
  };
});
