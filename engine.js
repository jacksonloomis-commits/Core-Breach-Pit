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
  function createRun(opts) {
    const arena = BOSSES.ARENAS[opts.arenaIndex];
    if (!arena) throw new Error('unknown arena ' + opts.arenaIndex);
    const char = CHARS.LIST.find(c => c.id === opts.charId);
    if (!char) throw new Error('unknown char ' + opts.charId);
    const bossDef = BOSSES.LIST.find(b => b.id === arena.boss);
    if (!bossDef) throw new Error('unknown boss ' + arena.boss);

    const state = {
      t: 0,
      seed: (opts.seed != null ? opts.seed : (Date.now() ^ (Math.random() * 0xffffffff))) >>> 0,
      rng: null,
      arenaIndex: opts.arenaIndex,
      arena: arena,
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
        hp: bossDef.hp, maxHp: bossDef.hp,
        phase: 0, rt: { mode: 'gap', timer: 1.2, pat: null, patIdx: -1 },
        hitFlash: 0
      },
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
    b.rt.timer = pat.tele;
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

  function spawnProj(st, x, y, ang, speed, kind) {
    const def = st.bossDef;
    const phase = def.phases[st.boss.phase];
    const mult = phase.enrage ? 1.2 : 1;
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
      b.rt = { mode: 'gap', timer: 1.1, pat: null, patIdx: -1 };
      st.events.push({ type: 'phase', n: b.phase });
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
        rt.timer = (typeof ph.recover === 'number') ? ph.recover : 0.25;
        st.beams.length = 0;
      }
    } else if (rt.mode === 'recover' && rt.timer <= 0) {
      rt.mode = 'gap';
      rt.timer = ph.gap * (ph.enrage ? 0.78 : 1);
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

  // ---------- scoring / progression (pure) ----------
  function computeStars(hitsTaken) {
    if (hitsTaken === 0) return 3;
    if (hitsTaken <= 2) return 2;
    return 1;
  }

  // save shape: { cleared:[bool], stars:[num], unlockedArenas:num, chars:[ids], char:id }
  function applyResult(save, arenaIndex, stars) {
    const res = { newChars: [], arenaUnlocked: null };
    save.cleared[arenaIndex] = true;
    save.stars[arenaIndex] = Math.max(save.stars[arenaIndex] || 0, stars);
    const next = arenaIndex + 1;
    if (next < BOSSES.ARENAS.length && !save.cleared[next] && res.arenaUnlocked == null) {
      if (save.unlockedArenas <= next) { save.unlockedArenas = next + 1; res.arenaUnlocked = next; }
    }
    for (const u of BOSSES.ARENAS[arenaIndex].unlocks || []) {
      if (!save.chars.includes(u)) { save.chars.push(u); res.newChars.push(u); }
    }
    return res;
  }

  return { W, H, HUD, AR, CHARS, BOSSES, createRun, step, hurt, computeStars, applyResult, mulberry32, segDist, clamp, dist };
});
