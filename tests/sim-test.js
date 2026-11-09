// CORE BREACH: PIT — headless sim test suite. The dodge-bot must beat every boss.
const PIT = require('../engine.js');
const BOSSES = require('../bosses.js');
const CHARS = require('../chars.js');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

const AR = PIT.AR, clamp = PIT.clamp;

function pointLineDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const l2 = abx * abx + aby * aby;
  let t = l2 ? ((px - ax) * abx + (py - ay) * aby) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

// ---------- dodge-bot (uses ONLY engine state; no lookahead inside engine) ----------
function immediateDanger(st) {
  const p = st.player;
  let danger = 0;
  for (const q of st.proj) {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < 22 && (p.x - q.x) * q.vx + (p.y - q.y) * q.vy > 0) danger += (22 - d) * 2;
  }
  for (const beam of st.beams) {
    const ex = beam.x + Math.cos(beam.ang) * 400, ey = beam.y + Math.sin(beam.ang) * 400;
    const dd = pointLineDist(p.x, p.y, beam.x, beam.y, ex, ey);
    if (dd < 9) danger += (9 - dd) * 4;
  }
  const rt = st.boss.rt;
  if (rt.mode === 'tele' && rt.pat && rt.pat.type === 'charge') {
    const aim = rt.data.aim;
    const dd = pointLineDist(p.x, p.y, st.boss.x, st.boss.y, st.boss.x + Math.cos(aim) * 400, st.boss.y + Math.sin(aim) * 400);
    if (dd < 12) danger += 30;
  }
  for (const z of st.zones) if (st.t < z.until && Math.hypot(z.x - p.x, z.y - p.y) < z.r) danger += 40;
  for (const m of st.minions) { const md = Math.hypot(m.x - p.x, m.y - p.y); if (md < 16) danger += (16 - md) * 2.5; }
  if (Math.hypot(st.boss.x - p.x, st.boss.y - p.y) < st.boss.r + 8) danger += 30;
  return danger;
}

function botInput(st) {
  const p = st.player;
  const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [0.71, -0.71], [-0.71, 0.71], [-0.71, -0.71]];
  const speed = st.char.speed;
  let best = dirs[0], bestScore = -Infinity;
  for (const [dx, dy] of dirs) {
    let score = 0;
    for (const horizon of [0.22, 0.45]) {
      const px = clamp(p.x + dx * speed * horizon, AR.x0 + 4, AR.x1 - 4);
      const py = clamp(p.y + dy * speed * horizon, AR.y0 + 4, AR.y1 - 4);
      let danger = 0;
      for (const q of st.proj) {
        const d = Math.hypot(q.x - px, q.y - py);
        if (d < 26 && (px - q.x) * q.vx + (py - q.y) * q.vy > 0) danger += (26 - d) * (horizon < 0.3 ? 3 : 1);
        else if (d < 26) danger += 1;
      }
      for (const z of st.zones) if (st.t < z.until && Math.hypot(z.x - px, z.y - py) < z.r + 5) danger += 45;
      const rt = st.boss.rt;
      if (rt.mode === 'tele' && rt.pat) {
        if (rt.pat.type === 'zone') for (const s of rt.data.spots) if (Math.hypot(s.x - px, s.y - py) < rt.pat.r + 4) danger += 45;
        if (rt.pat.type === 'charge') {
          const aim = rt.data.aim;
          const dd = pointLineDist(px, py, st.boss.x, st.boss.y, st.boss.x + Math.cos(aim) * 400, st.boss.y + Math.sin(aim) * 400);
          if (dd < 13) danger += (13 - dd) * 3;
        }
      }
      if (st.beams.length && rt.pat && rt.pat.type === 'sweep') {
        for (const beam of st.beams) {
          const ang = beam.ang + (rt.pat.degPerSec * Math.PI / 180) * horizon;
          const dd = pointLineDist(px, py, beam.x, beam.y, beam.x + Math.cos(ang) * 400, beam.y + Math.sin(ang) * 400);
          if (dd < 11) danger += (11 - dd) * (horizon < 0.3 ? 3.5 : 1.2);
        }
      }
      for (const m of st.minions) { const md = Math.hypot(m.x - px, m.y - py); if (md < 22) danger += (22 - md) * 1.6; }
      const bd = Math.hypot(st.boss.x - px, st.boss.y - py);
      if (bd < st.boss.r + 12) danger += (st.boss.r + 12 - bd) * 3;
      // soft edges
      danger += Math.max(0, 26 - (px - AR.x0)) * 0.7 + Math.max(0, 26 - (AR.x1 - px)) * 0.7;
      danger += Math.max(0, 20 - (py - AR.y0)) * 0.7 + Math.max(0, 20 - (AR.y1 - py)) * 0.7;
      score -= danger;
    }
    // kiting preference: stand ~70-150 px from the boss
    const pb = Math.hypot(st.boss.x - (p.x + dx * 30), st.boss.y - (p.y + dy * 30));
    if (pb < 70) score -= (70 - pb) * 0.4;
    if (pb > 150) score -= (pb - 150) * 0.2;
    if (score > bestScore) { bestScore = score; best = [dx, dy]; }
  }
  const dash = immediateDanger(st) > 24 && p.dashCd <= 0;
  return { mx: best[0], my: best[1], dash, ability: true };
}

// ---------- sim harness ----------
function runFight(arenaIndex, charId, seed, capSec) {
  const st = PIT.createRun({ arenaIndex, charId, seed });
  const dt = 1 / 60;
  let steps = Math.round(capSec / dt);
  while (steps-- > 0 && !st.over) {
    PIT.step(st, dt, botInput(st));
    if (st.over === 'win') break;
  }
  return { st, time: st.t };
}

// ================= data integrity =================
console.log('--- Data integrity ---');
check('5 arenas defined', BOSSES.ARENAS.length === 5);
check('5 bosses defined', BOSSES.LIST.length === 5);
check('every arena references a real boss', BOSSES.ARENAS.every(a => BOSSES.LIST.some(b => b.id === a.boss)));
check('3 operatives defined', CHARS.LIST.length === 3);
check('starter is VOLT', CHARS.LIST[0].id === 'volt');
check('GHOST unlocks at Arena II', JSON.stringify(BOSSES.ARENAS[1].unlocks) === '["ghost"]');
check('BULWARK unlocks at Arena IV', JSON.stringify(BOSSES.ARENAS[3].unlocks) === '["bulwark"]');

let teleOK = true, speedOK = true, chargeOK = true, minTele = Infinity;
for (const b of BOSSES.LIST) {
  for (const ph of b.phases) {
    for (const pat of ph.patterns) {
      minTele = Math.min(minTele, pat.tele);
      if (pat.tele < 0.5) teleOK = false;
      if ((pat.type === 'aimed' || pat.type === 'ring' || pat.type === 'shotgun' || pat.type === 'spiral') && pat.speed > 90) speedOK = false;
      if (pat.type === 'charge' && pat.speed > 190) chargeOK = false;
    }
  }
}
check(`every pattern telegraphs >= 0.5s (min ${minTele}s)`, teleOK);
check('projectile speeds capped at 90', speedOK);
check('charge speeds capped at 190', chargeOK);

// ================= rules =================
console.log('--- Rules ---');
{
  const st = PIT.createRun({ arenaIndex: 0, charId: 'volt', seed: 42 });
  check('volt starts with 3 hearts', st.player.hearts === 3 && st.player.maxHearts === 3);
  check('boss starts at full HP', st.boss.hp === 100);
  // dash i-frames: projectile overlap during dash does not hurt
  st.player.dashI = 0.2;
  st.proj.push({ x: st.player.x, y: st.player.y, vx: 0, vy: 0, r: 3 });
  PIT.step(st, 1 / 60, { mx: 0, my: 0 });
  check('dash i-frames block projectile hit', st.player.hearts === 3);
  st.proj.length = 0;
  // invulnerability grace blocks second hit
  st.player.dashI = 0; st.player.invuln = 0.5;
  st.proj.push({ x: st.player.x, y: st.player.y, vx: 0, vy: 0, r: 3 });
  PIT.step(st, 1 / 60, { mx: 0, my: 0 });
  check('post-hit invulnerability blocks follow-up', st.player.hearts === 3);
  // without protection, a hit lands and grants 1s immunity
  st.player.invuln = 0;
  st.proj.push({ x: st.player.x, y: st.player.y, vx: 0, vy: 0, r: 3 });
  PIT.step(st, 1 / 60, { mx: 0, my: 0 });
  check('hit lands when vulnerable', st.player.hearts === 2 && st.player.invuln > 0.9);
  check('hits tracked for stars', st.hitsTaken === 1);
}

// ================= star + progression logic =================
console.log('--- Stars & progression ---');
check('3 stars = flawless', PIT.computeStars(0) === 3);
check('2 stars = <= 2 hits', PIT.computeStars(2) === 2);
check('1 star = cleared with damage', PIT.computeStars(5) === 1);
{
  const mk = () => ({ cleared: [false, false, false, false, false], stars: [0, 0, 0, 0, 0], unlockedArenas: 1, chars: ['volt'] });
  let s = mk();
  let r = PIT.applyResult(s, 0, 2);
  check('clearing A1 opens A2', s.unlockedArenas === 2 && r.arenaUnlocked === 1);
  check('stars recorded as max', s.stars[0] === 2);
  PIT.applyResult(s, 0, 1);
  check('stars never regress', s.stars[0] === 2);
  r = PIT.applyResult(s, 1, 3);
  check('clearing A2 unlocks GHOST', s.chars.includes('ghost') && r.newChars.includes('ghost'));
  r = PIT.applyResult(s, 3, 1);
  check('clearing A4 unlocks BULWARK', s.chars.includes('bulwark') && r.newChars.includes('bulwark'));
  check('A5 not required for BULWARK unlock', !s.chars.includes('deathwarrant'));
}

// ================= the dodge-bot must beat every boss =================
console.log('--- Dodge-bot clears the ladder (VOLT) ---');
{
  const cap = 300;
  for (let a = 0; a < 5; a++) {
    let wins = 0;
    const details = [];
    for (const seed of [1, 2, 3]) {
      const { st, time } = runFight(a, 'volt', seed, cap);
      details.push(`${seed}:${st.over === 'win' ? 'WIN' : (st.over || 'timeout')}@${Math.round(time)}s,h${st.player.hearts},hits${st.hitsTaken}`);
      if (st.over === 'win') wins++;
    }
    check(`Arena ${a + 1} cleared on 3/3 seeds (${details.join(' ')})`, wins === 3);
  }
}
console.log('--- Dodge-bot flawless proof on Arena I ---');
{
  let flawless = 0;
  for (const seed of [1, 2, 3]) {
    const { st } = runFight(0, 'volt', seed, 300);
    if (st.over === 'win' && st.hitsTaken === 0) flawless++;
  }
  check('Arena I flawless (3 stars) on 3/3 seeds', flawless === 3);
}
console.log('--- GHOST and BULWARK can win too ---');
{
  const g = runFight(1, 'ghost', 7, 300);
  check('GHOST clears Arena II (seed 7)', g.st.over === 'win', String(g.st.over));
  const b = runFight(3, 'bulwark', 7, 300);
  check('BULWARK clears Arena IV (seed 7)', b.st.over === 'win', String(b.st.over));
}

// ================= fairness probes from live sims =================
console.log('--- Fairness probes ---');
{
  // every bile pool that went live was outlined during a telegraph >= 0.5s earlier
  const st = PIT.createRun({ arenaIndex: 1, charId: 'volt', seed: 11 });
  const dt = 1 / 60;
  let teleAt = null, ok = true, poolsSeen = 0, teleDur = 0.8, prevMode = '';
  for (let i = 0; i < 60 * 120 && !st.over; i++) {
    const before = st.zones.length;
    if (st.boss.rt.mode === 'tele' && st.boss.rt.pat && st.boss.rt.pat.type === 'zone') {
      if (prevMode !== 'tele') { teleAt = st.t; teleDur = st.boss.rt.pat.tele; } // tele START
    }
    prevMode = st.boss.rt.mode;
    PIT.step(st, dt, botInput(st));
    if (st.zones.length > before) {
      poolsSeen += st.zones.length - before;
      if (teleAt == null || st.t - teleAt < teleDur - 0.02) ok = false;
    }
  }
  check(`pools only go live after their outline (saw ${poolsSeen} pools)`, ok && poolsSeen > 0);
}
{
  // phase transitions wipe live hazards (fairness breather)
  const st = PIT.createRun({ arenaIndex: 0, charId: 'volt', seed: 5 });
  const dt = 1 / 60;
  let sawWipe = false, lastPhase = 0;
  for (let i = 0; i < 60 * 240 && !st.over; i++) {
    const nProj = st.proj.length;
    PIT.step(st, dt, botInput(st));
    if (st.boss.phase > lastPhase) {
      lastPhase = st.boss.phase;
      if (nProj > 0 && st.proj.length === 0) sawWipe = true;
      break;
    }
  }
  check('phase transition wipes live projectiles', sawWipe);
}

// ================= fuzz =================
console.log('--- Fuzz ---');
{
  let crashed = false;
  try {
    for (let a = 0; a < 5; a++) {
      const st = PIT.createRun({ arenaIndex: a, charId: 'volt', seed: 100 + a });
      const dt = 1 / 60;
      const rng = PIT.mulberry32(7);
      for (let i = 0; i < 60 * 45 && !st.over; i++) {
        const inp = { mx: rng() * 2 - 1, my: rng() * 2 - 1, dash: rng() < 0.1, ability: rng() < 0.05 };
        PIT.step(st, dt, inp);
      }
    }
  } catch (e) { crashed = true; }
  check('random-input fuzz across all arenas: no crash', !crashed);
}

// ================= house guards =================
console.log('--- House guards ---');
{
  const fs = require('fs');
  const APP = fs.readFileSync(__dirname + '/../app.js', 'utf8');
  const IDX = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  check('app.js pins BUILD 2026.11.10', APP.includes("const BUILD = '2026.11.10'"));
  check('app.js update log leads with PIT OPEN BETA', APP.includes("tag: 'PIT OPEN BETA'"));
  check('index.html footer stamps BUILD 2026.11.10 // CORE BREACH: PIT', IDX.includes('BUILD 2026.11.10 // CORE BREACH: PIT'));
  const busts = IDX.match(/\?v=[0-9a-z]+/g) || [];
  check('all 7 asset tags bust at 20261110b', busts.length === 7 && busts.every(t => t === '?v=20261110b'), busts.join(','));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
