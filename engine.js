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
  // opts.mutators: explicit mutator ids (tests / fixed setups). opts.rankName: roll the
  // ROUND VARIETY deck deterministically from the seed. Neither: no mutators (base).
  function createRun(opts) {
    const idx = typeof opts.boss === 'number' ? opts.boss : BOSSES.LIST.findIndex(b => b.id === opts.boss);
    const bossDef = BOSSES.LIST[idx];
    if (!bossDef) throw new Error('unknown boss ' + opts.boss);
    const char = CHARS.LIST.find(c => c.id === opts.charId);
    if (!char) throw new Error('unknown char ' + opts.charId);

    // ranked modifiers: higher ranks fight the same bosses with more HP and tighter
    // pacing. Telegraphs and projectile/charge speeds are NEVER scaled — the fairness
    // law (tele >= 0.5s, speed caps) must hold at every rank. ROUND VARIETY mutators
    // compose multiplicatively on top of the rank presets.
    const mods = opts.mods || {};
    const seed = (opts.seed != null ? opts.seed : (Date.now() ^ (Math.random() * 0xffffffff))) >>> 0;
    let muts = [];
    if (Array.isArray(opts.mutators)) {
      const seen = new Set();
      for (const id of opts.mutators) {
        const m = MUTATORS.find(x => x.id === id);
        if (m && !seen.has(m.id)) { muts.push(m); seen.add(m.id); }
      }
    } else if (opts.rankName) {
      muts = rollMutators(opts.rankName, seed);
    }
    const mHp = muts.reduce((a, m) => a * (m.hp || 1), 1);
    const mGap = muts.reduce((a, m) => a * (m.gap || 1), 1);
    const hpMult = clamp((typeof mods.hpMult === 'number' ? mods.hpMult : 1) * mHp, 0.4, 3.5);
    const gapMult = clamp((typeof mods.gapMult === 'number' ? mods.gapMult : 1) * mGap, 0.4, 1.5);

    const state = {
      t: 0,
      seed: seed,
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
      mods: {
        hpMult, gapMult,
        projMult: muts.reduce((a, m) => a * (m.proj || 1), 1),
        speedMult: muts.reduce((a, m) => a * (m.speed || 1), 1),
        minionHp: muts.reduce((a, m) => a * (m.minionHp || 1), 1),
        aggroShift: muts.reduce((a, m) => Math.max(a, m.aggroShift || 0), 0),
        srMult: muts.reduce((a, m) => a * (m.srMult || 1), 1)
      },
      mutators: muts.map(m => ({ id: m.id, name: m.name, blurb: m.blurb })),
      proj: [], zones: [], beams: [], minions: [], tracers: [], marks: [],
      wallSig: null, // live wall-curtain geometry (edge/gap) while its bullets march
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
    // VOLATILE CORE mutator sits the curve one phase deeper (st.mods.aggroShift).
    b.rt.timer = Math.max(0.5, pat.tele * aggroAt(b.phase + (st.mods.aggroShift || 0)).tele);
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
    // SIGNATURE WAVE data prep — every floor-denial and teleport signature pre-plans
    // its geometry at telegraph START so the renderer can outline the truth before it
    // goes live (same contract the zone pools already honor).
    if (pat.type === 'mark') {
      // the mark pins the square you STAND on (the gimmick: the audit follows you) —
      // fairness lives in the warning length: tele + fuse before the burst
      rt.data.spots = [{ x: p.x, y: p.y }];
      for (let i = 1; i < pat.count; i++) {
        const a = st.rng() * TAU;
        rt.data.spots.push({
          x: clamp(p.x + Math.cos(a) * 46, AR.x0 + pat.r, AR.x1 - pat.r),
          y: clamp(p.y + Math.sin(a) * 46, AR.y0 + pat.r, AR.y1 - pat.r)
        });
      }
    }
    if (pat.type === 'mines' || pat.type === 'mortar') {
      // mines and mortar targets shunt away from the runner exactly like zone pools —
      // and the guarantee must SURVIVE the wall clamp: a spot clamped back inside its
      // own burst radius would arm and pop in the same frame (gate-found wart)
      rt.data.spots = [];
      for (let i = 0; i < pat.count; i++) {
        let x = clamp(p.x + (st.rng() - 0.5) * 150, AR.x0 + pat.r, AR.x1 - pat.r);
        let y = clamp(p.y + (st.rng() - 0.5) * 110, AR.y0 + pat.r, AR.y1 - pat.r);
        if (dist(x, y, p.x, p.y) < 26) {
          const ang = Math.atan2(y - p.y, x - p.x) || 0;
          x = clamp(p.x + Math.cos(ang) * 34, AR.x0 + pat.r, AR.x1 - pat.r);
          y = clamp(p.y + Math.sin(ang) * 34, AR.y0 + pat.r, AR.y1 - pat.r);
          if (dist(x, y, p.x, p.y) < pat.r + 10) {
            // clamped back into burst range: mirror the push through the runner, then
            // fall back to the arena center (the one square always far from the walls)
            x = clamp(p.x - Math.cos(ang) * 34, AR.x0 + pat.r, AR.x1 - pat.r);
            y = clamp(p.y - Math.sin(ang) * 34, AR.y0 + pat.r, AR.y1 - pat.r);
            if (dist(x, y, p.x, p.y) < pat.r + 10) {
              x = (AR.x0 + AR.x1) / 2; y = (AR.y0 + AR.y1) / 2;
            }
          }
        }
        rt.data.spots.push({ x, y });
      }
    }
    if (pat.type === 'wall') {
      // a curtain crosses from one edge with ONE gap — the edge and the gap are chosen
      // at telegraph start so the renderer can draw the honest row
      const edge = Math.floor(st.rng() * 4); // 0 top 1 bottom 2 left 3 right
      const along = edge < 2 ? AR.x1 - AR.x0 : AR.y1 - AR.y0;
      rt.data.edge = edge;
      rt.data.gap = pat.gapW + st.rng() * Math.max(1, along - pat.gapW * 2);
    }
    if (pat.type === 'blink') {
      // destination locks at telegraph start and is drawn as a ghost — the dodge is
      // leaving the landing square. If the clamp would land it on the runner, reflect.
      const a = st.rng() * TAU;
      let dx = p.x + Math.cos(a) * pat.dist, dy = p.y + Math.sin(a) * pat.dist;
      dx = clamp(dx, AR.x0 + b.r, AR.x1 - b.r); dy = clamp(dy, AR.y0 + b.r, AR.y1 - b.r);
      if (dist(dx, dy, p.x, p.y) < 30) {
        dx = clamp(p.x - Math.cos(a) * pat.dist, AR.x0 + b.r, AR.x1 - b.r);
        dy = clamp(p.y - Math.sin(a) * pat.dist, AR.y0 + b.r, AR.y1 - b.r);
      }
      rt.data.dest = { x: dx, y: dy };
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
    // speed stack: AGGRO curve (+ VOLATILE shift) x enrage x HEATED AIR (projMult)
    const mult = aggroAt(st.boss.phase + (st.mods.aggroShift || 0)).speed *
      (phase.enrage ? 1.15 : 1) * (st.mods.projMult || 1);
    st.proj.push({ x, y, vx: Math.cos(ang) * speed * mult, vy: Math.sin(ang) * speed * mult, r: 3, kind: kind || 'shot' });
  }

  // mortar shells never hurt — the burst where they LAND is the hazard. 132 px/s
  // flight keeps the arc readable without making the pop a surprise.
  const SHELL_SPEED = 132;

  function popRing(st, x, y, count, speed, kind) {
    const off = st.rng() * TAU;
    for (let i = 0; i < count; i++) {
      spawnProj(st, x, y, off + (TAU * i) / count, speed, kind || 'pop');
    }
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
        // The transition into 'active' fires execPattern(st, 0) to spawn first-frame
        // bullets for shot patterns. For movement patterns that call MUST be a no-op:
        // with dt=0 nothing moves, and running the wall-stop check on it would clamp
        // the charge timer to 0.01 — every charge in the game died after one frame
        // (owner report 2026.11.16: "the dotted red line ... they only move like an
        // inch"). Guard the movement on dt > 0.
        if (dt > 0) {
          const sp = pat.speed * (st.bossDef.phases[st.boss.phase].enrage ? 1.15 : 1);
          const vx = Math.cos(rt.data.aim) * sp, vy = Math.sin(rt.data.aim) * sp;
          const nx = clamp(b.x + vx * dt, AR.x0 + b.r, AR.x1 - b.r);
          const ny = clamp(b.y + vy * dt, AR.y0 + b.r, AR.y1 - b.r);
          if (nx === b.x && ny === b.y) rt.timer = Math.min(rt.timer, 0.01); // pinned at a wall, stop early
          b.x = nx; b.y = ny;
        }
        break;
      }
      case 'zone': {
        for (const s of rt.data.spots) {
          st.zones.push({ x: s.x, y: s.y, r: pat.r, r0: pat.r, grow: pat.grow || 0, born: st.t, until: st.t + pat.pool, hitCd: 0 });
        }
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
            // BROOD BLIGHT mutator hatches the brood sickly (x0.6 HP); spawn COUNTS and
            // CAPS are never touched by mutators (the summon-cadence law)
            r: 3, hp: Math.round(14 * (st.mods.minionHp || 1)), hitFlash: 0
          });
        }
        st.events.push({ type: 'spawn' });
        break;
      }
      // ---------- SIGNATURE WAVE mechanics ----------
      // Fairness contract shared by all of them: the telegraph tells the truth (spots,
      // edges, ghost squares drawn from rt.data), every hurting speed <= 90, pull force
      // under the slowest operative's run speed, and MOVEMENT patterns (blink) honor
      // the dt=0 no-op law the HONEST DASH regression pinned for charge.
      case 'seek': {
        // slow homing slugs: fan out from the locked aim, then steer after the runner
        const mid = rt.data.aim, spread = ((pat.spread || 24) * Math.PI) / 180;
        for (let i = 0; i < pat.count; i++) {
          const a = mid - spread / 2 + (pat.count === 1 ? spread / 2 : (spread * i) / (pat.count - 1));
          spawnProj(st, b.x, b.y, a, pat.speed, 'seek');
          st.proj[st.proj.length - 1].seek = pat.turn;
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'mines': {
        for (const s of rt.data.spots) {
          st.marks.push({ x: s.x, y: s.y, r: pat.r, fuse: pat.fuse, pop: pat.pop, popSpeed: pat.popSpeed, mine: true });
        }
        st.events.push({ type: 'pool' });
        break;
      }
      case 'mark': {
        for (const s of rt.data.spots) {
          st.marks.push({ x: s.x, y: s.y, r: pat.r, fuse: pat.fuse, pop: pat.pop, popSpeed: pat.popSpeed, mine: false });
        }
        st.events.push({ type: 'pool' });
        break;
      }
      case 'mortar': {
        for (const s of rt.data.spots) {
          const fly = Math.max(0.25, dist(b.x, b.y, s.x, s.y) / SHELL_SPEED);
          st.proj.push({
            x: b.x, y: b.y, r: 2, kind: 'shell',
            vx: (s.x - b.x) / fly, vy: (s.y - b.y) / fly,
            tx: s.x, ty: s.y, shellT: fly, pop: pat.pop, popSpeed: pat.popSpeed
          });
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'wall': {
        // a curtain of slugs marches in from one edge with ONE gap (rt.data.gap)
        const gw = pat.gapW / 2;
        if (rt.data.edge === 0) { for (let x = AR.x0 + 4; x <= AR.x1 - 4; x += 8) if (Math.abs(x - rt.data.gap) >= gw) spawnProj(st, x, AR.y0 + 3, Math.PI / 2, pat.speed, 'wall'); }
        else if (rt.data.edge === 1) { for (let x = AR.x0 + 4; x <= AR.x1 - 4; x += 8) if (Math.abs(x - rt.data.gap) >= gw) spawnProj(st, x, AR.y1 - 3, -Math.PI / 2, pat.speed, 'wall'); }
        else if (rt.data.edge === 2) { for (let y = AR.y0 + 4; y <= AR.y1 - 4; y += 8) if (Math.abs(y - rt.data.gap) >= gw) spawnProj(st, AR.x0 + 3, y, 0, pat.speed, 'wall'); }
        else { for (let y = AR.y0 + 4; y <= AR.y1 - 4; y += 8) if (Math.abs(y - rt.data.gap) >= gw) spawnProj(st, AR.x1 - 3, y, Math.PI, pat.speed, 'wall'); }
        // the curtain marches for seconds after the pattern ends — publish its geometry
        // so the renderer and dodge-brains can still find the gap while it crosses
        st.wallSig = { edge: rt.data.edge, gap: rt.data.gap, gw: pat.gapW, until: st.t + 3.5 };
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'orbit': {
        // halo bullets circle the boss for pat.hold seconds, then release radially
        // (release speed carries NO multipliers — same walkable-pinned contract as the
        // phase burst ring)
        const off = st.rng() * TAU;
        for (let i = 0; i < pat.count; i++) {
          const a = off + (TAU * i) / pat.count;
          spawnProj(st, b.x + Math.cos(a) * pat.radius, b.y + Math.sin(a) * pat.radius, a, 0.001, 'orb');
          const q = st.proj[st.proj.length - 1];
          q.orbAng = a; q.orbR = pat.radius; q.hold = pat.hold; q.relSpeed = pat.speed;
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
        break;
      }
      case 'ric': {
        // court slugs bound off the arena walls pat.bounces times before dying
        const mid = rt.data.aim, spread = (pat.spread * Math.PI) / 180;
        for (let i = 0; i < pat.shots; i++) {
          const a = mid - spread / 2 + (pat.shots === 1 ? spread / 2 : (spread * i) / (pat.shots - 1));
          spawnProj(st, b.x, b.y, a, pat.speed, 'ric');
          st.proj[st.proj.length - 1].bounces = pat.bounces;
        }
        st.events.push({ type: 'fire', x: b.x, y: b.y });
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

    const speed = p.dashT > 0 ? 1 : ch.speed * (st.mods.speedMult || 1); // ADRENALINE multiplies run speed (dash untouched)
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
      st.proj.length = 0; st.zones.length = 0; st.beams.length = 0; st.minions.length = 0; st.marks.length = 0;
      st.wallSig = null;
      st.events.push({ type: 'win' });
      return;
    }

    // --- boss phase transitions
    const def = st.bossDef;
    let ph = def.phases[b.phase];
    while (b.phase < def.phases.length - 1 && b.hp / b.maxHp <= def.phases[b.phase + 1].until) {
      b.phase++;
      st.proj.length = 0; st.zones.length = 0; st.beams.length = 0; st.marks.length = 0; st.wallSig = null; // fairness wipe
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
      if (pat.type === 'blink' && dt > 0 && !rt.data.done) {
        // MARIONETTE/KING'S STEP: the boss is simply elsewhere. The dt=0 transition
        // call must NOT move it (same movement law the HONEST DASH regression pinned
        // for charge) — the jump happens on the first real frame of the active window.
        rt.data.done = true;
        b.x = rt.data.dest.x; b.y = rt.data.dest.y;
        const off = st.rng() * TAU;
        for (let i = 0; i < pat.clap; i++) {
          spawnProj(st, b.x, b.y, off + (TAU * i) / pat.clap, pat.clapSpeed, 'clap');
        }
        st.events.push({ type: 'blink', x: b.x, y: b.y });
      }
      if (rt.timer <= 0) {
        rt.mode = 'recover';
        rt.timer = (typeof ph.recover === 'number' ? ph.recover : 0.25) * aggroAt(b.phase + (st.mods.aggroShift || 0)).gap;
        st.beams.length = 0;
      }
    } else if (rt.mode === 'recover' && rt.timer <= 0) {
      rt.mode = 'gap';
      rt.timer = ph.gap * st.mods.gapMult * (ph.enrage ? 0.78 : 1) * aggroAt(b.phase + (st.mods.aggroShift || 0)).gap;
    }

    // --- signature vortex (THE PULL / THE UNDERTOW): while the pattern reads (tele +
    // active) the runner is dragged toward the boss. The force is capped under the
    // SLOWEST operative's run speed (BULWARK 56), so the drag is always escapable by
    // simply walking away — it pulls your line, it never pins you.
    if (rt.pat && (rt.mode === 'tele' || rt.mode === 'active') && rt.pat.type === 'pull') {
      const d = dist(b.x, b.y, p.x, p.y) || 1;
      const f = Math.min(rt.pat.force, 26);
      p.x = clamp(p.x + ((b.x - p.x) / d) * f * dt, AR.x0 + p.r, AR.x1 - p.r);
      p.y = clamp(p.y + ((b.y - p.y) / d) * f * dt, AR.y0 + p.r, AR.y1 - p.r);
    }

    // --- projectiles
    for (let i = st.proj.length - 1; i >= 0; i--) {
      const q = st.proj[i];
      if (q.shellT != null) {
        // mortar shell: flies to its marked target, then bursts. The shell itself
        // never hurts — the pop ring is the hazard (and BASTION can delete it).
        q.shellT -= dt;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.shellT <= 0 || dist(q.x, q.y, q.tx, q.ty) < 5) {
          popRing(st, q.tx, q.ty, q.pop, q.popSpeed);
          st.proj.splice(i, 1);
          st.events.push({ type: 'pop' });
        } else if (q.x < AR.x0 - 6 || q.x > AR.x1 + 6 || q.y < AR.y0 - 6 || q.y > AR.y1 + 6) {
          st.proj.splice(i, 1);
        }
        continue;
      }
      if (q.orbR) {
        // orbiting halo: position rides the boss (it may move), release is radial and
        // multiplier-free (walkable-pinned like the phase burst ring)
        q.hold -= dt;
        q.orbAng += 2.4 * dt;
        q.x = b.x + Math.cos(q.orbAng) * q.orbR;
        q.y = b.y + Math.sin(q.orbAng) * q.orbR;
        if (q.hold <= 0) {
          q.vx = Math.cos(q.orbAng) * q.relSpeed;
          q.vy = Math.sin(q.orbAng) * q.relSpeed;
          q.orbR = 0;
        }
      } else {
        if (q.seek) {
          // homing slugs steer toward the runner at a capped turn rate
          const want = Math.atan2(p.y - q.y, p.x - q.x);
          const cur = Math.atan2(q.vy, q.vx);
          const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
          const maxT = q.seek * dt;
          const na = cur + clamp(da, -maxT, maxT);
          const sp = Math.hypot(q.vx, q.vy);
          q.vx = Math.cos(na) * sp; q.vy = Math.sin(na) * sp;
        }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.kind === 'ric' && q.bounces > 0) {
          // ricochet plates: reflect off the arena walls while bounces remain
          let bounced = false;
          if (q.x < AR.x0 + q.r) { q.x = AR.x0 + q.r; q.vx = Math.abs(q.vx); bounced = true; }
          else if (q.x > AR.x1 - q.r) { q.x = AR.x1 - q.r; q.vx = -Math.abs(q.vx); bounced = true; }
          if (q.y < AR.y0 + q.r) { q.y = AR.y0 + q.r; q.vy = Math.abs(q.vy); bounced = true; }
          else if (q.y > AR.y1 - q.r) { q.y = AR.y1 - q.r; q.vy = -Math.abs(q.vy); bounced = true; }
          if (bounced) q.bounces--;
        }
      }
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

    // --- zones (bile pools; BILE BLOOM signatures grow wider while they live)
    for (const z of st.zones) {
      z.hitCd = Math.max(0, z.hitCd - dt);
      if (z.grow) z.r = Math.min(z.r0 + z.grow * (st.t - z.born), z.r0 + 12);
      if (st.t > z.until) continue;
      if (z.hitCd <= 0 && dist(z.x, z.y, p.x, p.y) < z.r + p.r) {
        if (hurt(st, 'pool')) z.hitCd = 0.6;
      }
    }
    st.zones = st.zones.filter(z => st.t < z.until + 0.4);
    if (st.wallSig && st.t > st.wallSig.until) st.wallSig = null;

    // --- signature floor marks (armed mines + pinned reticles). The mark itself is
    // safe to touch — the BURST is the hazard: mines pop early when crowded, marks
    // pop when their fuse ends. Pop rings leave at <= 56 px/s: under a run.
    for (let i = st.marks.length - 1; i >= 0; i--) {
      const mk = st.marks[i];
      mk.fuse -= dt;
      if (mk.fuse <= 0 || (mk.mine && dist(mk.x, mk.y, p.x, p.y) < mk.r + 8)) {
        popRing(st, mk.x, mk.y, mk.pop, mk.popSpeed);
        st.marks.splice(i, 1);
        st.events.push({ type: 'pop' });
      }
    }

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

  // ---------- ROUND VARIETY (owner spec: "make each round sorta unique ... less tedious") ----------
  // Every queue can draw mutators — house twists the Pit rolls with the boss. The deck
  // is engine-side data; effects compose multiplicatively with the rank presets (see
  // createRun). The draw is deterministic per fight seed, so one attempt always fights
  // the same twist. Draw counts: bronze mostly stays clean (55% for one), silver always
  // one, gold/platinum usually two, diamond and above always two. Spawner-flavored
  // mutators (needsSpawn) only join the deck if the rank's pool owns a boss with spawn
  // patterns. MUTATORS NEVER TOUCH SPAWN COUNTS OR CAPS (summon-cadence law).
  const MUTATORS = [
    { id: 'frail', name: 'FRAIL', blurb: 'Brittle lieutenant — boss HP ×0.72.', hp: 0.72 },
    // TEMPO is the player-facing pacing stat: 1/gap — how much sooner the boss cycles
    // its patterns. Higher is always more dangerous (TEMPO ×1.176 = attacks come ~18%
    // sooner; ×0.893 = it pauses a little longer). Never show bare "GAP" — owner report:
    // "it keeps saying GAP in the mutations but idk what GAP is".
    { id: 'swift', name: 'SWIFT HORROR', blurb: 'It cycles patterns faster, but its shell thins — TEMPO ×1.176, HP ×0.92.', gap: 0.85, hp: 0.92 },
    { id: 'siege', name: 'SIEGE', blurb: 'A wall of HP, but it takes its time — HP ×1.25, TEMPO ×0.893.', hp: 1.25, gap: 1.12 },
    { id: 'heated', name: 'HEATED AIR', blurb: 'Every projectile flies hotter — SPEED ×1.10, TEMPO ×0.926.', proj: 1.10, gap: 1.08 },
    { id: 'blight', name: 'BROOD BLIGHT', blurb: 'The brood hatches sickly — minion HP ×0.6. Spawner arenas only.', minionHp: 0.6, needsSpawn: true },
    { id: 'volatile', name: 'VOLATILE CORE', blurb: 'It runs hot from the first phase — the fury curve sits one phase deeper.', aggroShift: 1 },
    { id: 'adrenaline', name: 'ADRENALINE', blurb: 'Adrenal spike — you run ×1.12 faster.', speed: 1.12 },
    { id: 'bounty', name: 'BOUNTY', blurb: 'The Tide pays extra — SR payout ×1.3, win or lose.', srMult: 1.3 }
  ];

  // ---------- display formatting (ROUND ANNOUNCER support) ----------
  // Composed multipliers are float products (rank preset x mutator effects), so raw
  // string interpolation prints garbage like 1.0999000000099999. fmtMul rounds to
  // 3 decimals and returns the shortest clean string — THE ONLY sanctioned path for
  // rendering a multiplier in the UI (fight title, ladder rows, announcer).
  function fmtMul(x) {
    return String(Math.round(x * 1000) / 1000);
  }

  function rollMutators(rankName, seed) {
    const rank = RANKS.find(r => r.name === rankName) || RANKS[0];
    const hasSpawner = rank.pool.some(i => BOSSES.LIST[i].phases.some(ph => ph.patterns.some(p => p.type === 'spawn')));
    const deck = MUTATORS.filter(m => !m.needsSpawn || hasSpawner);
    const rng = mulberry32((seed ^ 0x51ab3f7) >>> 0);
    const want = rank.name === 'BRONZE' ? (rng() < 0.55 ? 1 : 0)
      : rank.name === 'SILVER' ? 1
      : (rank.name === 'GOLD' || rank.name === 'PLATINUM') ? (rng() < 0.65 ? 2 : 1)
      : 2;
    const picked = [];
    for (let tries = 0; picked.length < want && tries < 64; tries++) {
      const m = deck[Math.floor(rng() * deck.length)];
      if (!picked.includes(m)) picked.push(m);
    }
    return picked;
  }

  // ---------- ranked ladder (RANKED BETA) ----------
  // SR economy (owner spec): wins bank SR by hearts kept; a flatline costs SR.
  // SR never resets — seasons only award cosmetics on top. The BOUNTY mutator
  // multiplies the payout (srMult, default 1) on wins AND losses — risk and reward.
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

  // Boss pools (owner spec, ARENA POOLS + PHASE FURY + ROUND VARIETY + FULL BENCH):
  // indices into bosses.js LIST. "Each arena should have its own boss pool" — every
  // rank owns an EXCLUSIVE pool; no boss rolls in two arenas. FULL BENCH 2026.11.17
  // (owner spec: "add a boss or two more to each Arena for even more variety") fills
  // every bench — the seven pools now roll FIVE to SEVEN bodies each:
  //   BRONZE     [0-5]     the bronze band + MOSSBACK ("super ez" by design)
  //   SILVER     [6-12]    THE DEATHWARRANT AREA + THE BALLAST (champion weight)
  //   GOLD       [13-18]   the tax collectors + THE MINTER + THE EXCHEQUER
  //   PLATINUM   [19-24]   first gate past the champion + THE PUPPETEER + LANTERN MAW
  //   DIAMOND    [25-29]   the deep pressure + THE UNDERTOW
  //   CRIMSON    [30-35]   the king's court + THE GORGET + VESPER
  //   IRIDESCENT [36-41]   the Tide itself + THE ABYSSAL ARCHIVE + THE LAST SHORE
  // A suite test pins OWNERSHIP: the seven pools are pairwise disjoint and their
  // union is the entire 42-boss roster, pool max base HP escalating arena by arena.
  // Bot gates: every boss is proven at its rank preset where VOLT can live there
  // (bronze/silver/gold 3/3) and at base for the beyond band (BULWARK 3/3).
  // PLATINUM+ presets remain the designed beyond-bot wall — humans outplay the bot
  // there (see AGENTS.md; the suite survival-gates them instead of demanding clears).
  // ONE endability exception (BROOD TAX 2026.11.13): GRAVEWAKE is win-gated at the
  // PLATINUM preset — its brood phase shipped summoning every 2nd pattern (the player's
  // exact minion kill rate), so the swarm never emptied and the fight could not END.
  // Summon cadence law: spawner phases keep spawn at most 1-of-3 patterns, cap <= 4-6.
  const RANKS = [
    { name: 'BRONZE', tier: 1, min: 0, max: 200, pool: [0, 1, 2, 3, 4, 5] },
    { name: 'BRONZE', tier: 2, min: 200, max: 300, pool: [0, 1, 2, 3, 4, 5] },
    { name: 'BRONZE', tier: 3, min: 300, max: 500, pool: [0, 1, 2, 3, 4, 5] },
    { name: 'SILVER', tier: 1, min: 500, max: 600, pool: [6, 7, 8, 9, 10, 11, 12] },
    { name: 'SILVER', tier: 2, min: 600, max: 700, pool: [6, 7, 8, 9, 10, 11, 12] },
    { name: 'SILVER', tier: 3, min: 700, max: 800, pool: [6, 7, 8, 9, 10, 11, 12] },
    { name: 'GOLD', tier: 1, min: 800, max: 900, pool: [13, 14, 15, 16, 17, 18] },
    { name: 'GOLD', tier: 2, min: 900, max: 1100, pool: [13, 14, 15, 16, 17, 18] },
    { name: 'PLATINUM', tier: 1, min: 1100, max: 1400, pool: [19, 20, 21, 22, 23, 24] },
    { name: 'PLATINUM', tier: 2, min: 1400, max: 1700, pool: [19, 20, 21, 22, 23, 24] },
    { name: 'PLATINUM', tier: 3, min: 1700, max: 2000, pool: [19, 20, 21, 22, 23, 24] },
    { name: 'DIAMOND', tier: 1, min: 2000, max: 2200, pool: [25, 26, 27, 28, 29] },
    { name: 'DIAMOND', tier: 2, min: 2200, max: 2400, pool: [25, 26, 27, 28, 29] },
    { name: 'DIAMOND', tier: 3, min: 2400, max: 2500, pool: [25, 26, 27, 28, 29] },
    { name: 'CRIMSON', tier: 1, min: 2500, max: 2800, pool: [30, 31, 32, 33, 34, 35] },
    { name: 'CRIMSON', tier: 2, min: 2800, max: 3100, pool: [30, 31, 32, 33, 34, 35] },
    { name: 'CRIMSON', tier: 3, min: 3100, max: 3500, pool: [30, 31, 32, 33, 34, 35] },
    { name: 'IRIDESCENT', tier: 1, min: 3500, max: Infinity, pool: [36, 37, 38, 39, 40, 41] }
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

  function applyRankedResult(save, win, heartsLost, srMult) {
    const delta = Math.round(srDelta(win, heartsLost) * (typeof srMult === 'number' ? srMult : 1));
    const res = { delta, newChars: [], promoted: null, demoted: null };
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

  // ---------- SHA-256 (sync, FIPS 180-4) ----------
  // crypto.subtle is async and would thread promises through the save path; the
  // headless suite needs deterministic sync calls. Standard compact form — the suite
  // cross-checks it against Node's crypto module before anything trusts it.
  // Length encoding assumes messages < 512 MiB (passcodes and salts qualify).
  const K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  function sha256(str) {
    const utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.codePointAt(i);
      if (c > 0xffff) i++;
      if (c < 0x80) utf8.push(c);
      else if (c < 0x800) utf8.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else utf8.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    const len = utf8.length;
    const total = Math.ceil((len + 9) / 64) * 64;
    const buf = new Array(total).fill(0);
    for (let i = 0; i < len; i++) buf[i] = utf8[i];
    buf[len] = 0x80;
    const bits = len * 8;
    buf[total - 4] = (bits >>> 24) & 0xff; // low 32 bits of the 64-bit length (high word is 0)
    buf[total - 3] = (bits >>> 16) & 0xff;
    buf[total - 2] = (bits >>> 8) & 0xff;
    buf[total - 1] = bits & 0xff;
    const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
        h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = new Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = ((buf[off + t * 4] << 24) | (buf[off + t * 4 + 1] << 16) | (buf[off + t * 4 + 2] << 8) | buf[off + t * 4 + 3]) >>> 0;
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K256[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => x.toString(16).padStart(8, '0')).join('');
  }

  // ---------- PLAYER ACCOUNTS (per-browser) ----------
  // GitHub Pages serves files, not users — there is no server to hold accounts. So
  // accounts live in this browser's localStorage: callsign + passcode (salted
  // SHA-256, never the passcode itself), one save slot per account. OWNER ASK
  // (Task 47): real login, an HONEST Top 5 board (??? until a real local account
  // cracks 4000 SR — the old fabricated stand-in row is gone), and the legacy guest
  // save survives migration (owner is PLATINUM 2 — nothing may strand it).
  const ACC_KEY = 'cbp-accounts-v1';
  const SES_KEY = 'cbp-session-v1';
  const BOARD_KEY = 'cbp-board-v1';
  const GUEST_SAVE_KEY = 'cbp-save-v2';      // the guest slot app.js has always used
  const GUEST_CLAIM_KEY = 'cbp-guest-claimed-v1'; // one claim per browser
  let ACC_STORE = null;
  function memStore() { // storage shim shape (the suite injects exactly this)
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(k, String(v)); },
      removeItem: (k) => { m.delete(k); }
    };
  }
  function accInit(storage) { ACC_STORE = storage || (typeof localStorage !== 'undefined' ? localStorage : memStore()); }
  function accRead(key, fallback) {
    if (!ACC_STORE) accInit();
    try { const raw = ACC_STORE.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }
  function accWrite(key, val) {
    if (!ACC_STORE) accInit();
    ACC_STORE.setItem(key, JSON.stringify(val));
  }
  function randSalt() { // 16 bytes -> 32 hex chars
    let s = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const b = new Uint8Array(16); crypto.getRandomValues(b);
      for (const x of b) s += x.toString(16).padStart(2, '0');
    } else for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return s;
  }
  const hashPass = (salt, pass) => sha256(salt + ':' + pass);
  // fixed-time compare (same length by construction — both hex digests)
  function passEq(a, b) {
    let d = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }
  function accReadAll() { return accRead(ACC_KEY, {}); }
  function validCallsign(n) { return /^[A-Za-z0-9][A-Za-z0-9 _-]{2,15}$/.test(n); }
  function register(name, pass) {
    const nm = String(name || '').trim();
    if (!validCallsign(nm)) return { ok: false, error: 'CALLSIGN RULES: 3-16 chars — letters, numbers, space, _ or -' };
    if (typeof pass !== 'string' || pass.length < 6) return { ok: false, error: 'PASSCODE RULES: at least 6 characters' };
    const all = accReadAll();
    const key = nm.toLowerCase();
    if (all[key]) return { ok: false, error: 'that callsign is already registered on this browser' };
    const salt = randSalt();
    const acc = { name: nm, salt, hash: hashPass(salt, pass), save: null, created: Date.now() };
    // MIGRATION LAW (owner: "make sure I keep my progress cuz I'm at plat 2"): a
    // register claims this browser's unclaimed guest save VERBATIM — SR, rank,
    // cosmetics, everything. The guest slot is kept as a backup, never deleted, and
    // marked claimed so a SECOND account starts fresh instead of inheriting a copy.
    const guest = accRead(GUEST_SAVE_KEY, null);
    let claimed = null;
    if (guest && guest.v === 2 && !ACC_STORE.getItem(GUEST_CLAIM_KEY)) {
      acc.save = guest; claimed = guest;
      ACC_STORE.setItem(GUEST_CLAIM_KEY, String(Date.now()));
    }
    all[key] = acc;
    accWrite(ACC_KEY, all);
    accWrite(SES_KEY, key);
    return { ok: true, name: nm, claimed };
  }
  function login(name, pass) {
    const key = String(name || '').trim().toLowerCase();
    const acc = accReadAll()[key];
    if (!acc) return { ok: false, error: 'no pilot registered under that callsign' };
    if (!passEq(hashPass(acc.salt, String(pass || '')), acc.hash)) return { ok: false, error: 'wrong passcode' };
    accWrite(SES_KEY, key);
    return { ok: true, name: acc.name, save: acc.save };
  }
  function logout() {
    if (!ACC_STORE) accInit();
    ACC_STORE.removeItem(SES_KEY);
  }
  function current() {
    const key = accRead(SES_KEY, null);
    if (!key) return null;
    const acc = accReadAll()[key];
    return acc ? { name: acc.name, save: acc.save, key } : null;
  }
  function setSave(save) { // persist() routes here when a pilot is logged in
    const cur = current(); if (!cur) return;
    const all = accReadAll();
    if (all[cur.key]) { all[cur.key].save = save; accWrite(ACC_KEY, all); }
  }
  // Top 5 board: REAL local accounts only — no fabricated names, ever again.
  function boardEntries() { return accRead(BOARD_KEY, []); }
  function maybeRecord(save) { // called from persist(); idempotent upsert per pilot
    const cur = current(); if (!cur || !save || typeof save.sr !== 'number') return false;
    if (save.sr < TOP5_QUALIFY) return false;
    const list = boardEntries().filter(e => e.key !== cur.key);
    list.push({ key: cur.key, name: cur.name, sr: save.sr, rank: rankFor(save.sr).name, at: Date.now() });
    list.sort((a, b) => b.sr - a.sr);
    accWrite(BOARD_KEY, list.slice(0, 5));
    return true;
  }
  function leaderboardWith(sr) {
    const entries = boardEntries();
    const cur = current();
    let self = null;
    if (cur) { self = entries.find(e => e.key === cur.key) || null; if (self) self.you = true; }
    const others = entries.filter(e => e !== self);
    const board = [];
    for (let i = 0; i < 5; i++) board.push(i < entries.length ? { ...entries[i] } : { name: '???', sr: null, empty: true });
    const pos = self ? entries.indexOf(self) + 1 : 1 + others.filter(e => e.sr > sr).length;
    return { board, you: { pos, sr, inBoard: !!self || (sr >= TOP5_QUALIFY && pos <= 5) }, qualify: sr >= TOP5_QUALIFY, filled: entries.length };
  }

  // ---------- seasons ----------
  // Bump SEASON in code to end the current season (owner call): the next load awards
  // a cosmetic badge for that season's peak rank and opens the next one. SR carries.
  const SEASON = 1;
  function defaultRankedSave() {
    return { v: 2, sr: 0, peakSr: 0, season: SEASON, seasonPeak: 0, cosmetics: [], chars: ['volt'], char: 'volt', crt: true, sfx: true, runs: 0, wins: 0, losses: 0, fought: {} };
  }

  // ---------- GAME MODES (owner Task 47 follow-up) ----------
  // CASUAL: logged-in pilots refight any boss they've met in ranked, at the pacing
  // of the rank whose pool owns that boss (pools are exclusive, so that IS the
  // difficulty they fought it at). Casual fights are SR-NEUTRAL — no delta, no W/L,
  // no runs counter; pure practice. `fought` is recorded ONLY from ranked queues,
  // so the casual roster stays an honest ranked history.
  function markFought(save, bossIndex) {
    if (!save) return;
    save.fought = save.fought || {};
    save.fought[bossIndex] = (save.fought[bossIndex] || 0) + 1;
  }
  function poolRankOf(bossIndex) {
    const i = typeof bossIndex === 'number' ? bossIndex : BOSSES.LIST.findIndex(b => b.id === bossIndex);
    return RANKS.find(r => r.pool.includes(i)) || RANKS[RANKS.length - 1];
  }
  function casualRoster(save) {
    const f = (save && save.fought) || {};
    return BOSSES.LIST.map((b, i) => ({ index: i, id: b.id, name: f[i] ? b.name : '???', fought: !!f[i], rankName: poolRankOf(i).name }));
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
    AGGRO, aggroAt, MUTATORS, rollMutators, fmtMul,
    SR, srDelta, RANKS, RANK_MODS, rankFor, rankLabel, rankMods, tierProgress,
    CHAR_UNLOCK_SR, applyRankedResult, TOP5_QUALIFY, leaderboardWith, sha256,
    markFought, poolRankOf, casualRoster,
    ACCOUNTS: { init: accInit, register, login, logout, current, setSave, maybeRecord, boardEntries },
    SEASON, defaultRankedSave, seasonEnd, migrateSave
  };
});
