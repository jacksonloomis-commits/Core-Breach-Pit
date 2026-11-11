// FULL BENCH probe — gate the 2026.11.17 additions exactly like the suite gates
// them (VOLT at bronze/silver/gold presets, BULWARK at base for beyond), with
// per-hit diagnostics on failure: which phase, which damage source, where.
// Usage: node scripts/pit-roster44.js [bossId ...]   (default: all eleven)
const PIT = require('../engine.js');
const BOSSES = require('../bosses.js');

const AR = PIT.AR, clamp = PIT.clamp;
const idxOf = (id) => BOSSES.LIST.findIndex(b => b.id === id);

function pointLineDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const l2 = abx * abx + aby * aby;
  let t = l2 ? ((px - ax) * abx + (py - ay) * aby) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

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
    if (dd < 9) danger += (9 - dd) * 10;
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
        if (rt.pat.type === 'aimed' || rt.pat.type === 'shotgun') {
          const aim = rt.data.aim, half = ((rt.pat.spread * Math.PI) / 180) / 2;
          const ang = Math.atan2(py - st.boss.y, px - st.boss.x);
          const ad = Math.abs(Math.atan2(Math.sin(ang - aim), Math.cos(ang - aim)));
          const bd = Math.hypot(px - st.boss.x, py - st.boss.y);
          if (bd > 30 && ad < half + 0.14) danger += (half + 0.14 - ad) * 38 * (horizon < 0.3 ? 1 : 0.5);
        }
        if (rt.pat.type === 'charge') {
          const aim = rt.data.aim;
          const enr = st.bossDef.phases[st.boss.phase].enrage ? 1.15 : 1;
          const travel = rt.pat.speed * rt.pat.dur * enr;
          const ex = clamp(st.boss.x + Math.cos(aim) * travel, AR.x0 + st.boss.r, AR.x1 - st.boss.r);
          const ey = clamp(st.boss.y + Math.sin(aim) * travel, AR.y0 + st.boss.r, AR.y1 - st.boss.r);
          const dd = pointLineDist(px, py, st.boss.x, st.boss.y, ex, ey);
          if (dd < 14) danger += (14 - dd) * 6;
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
      if (rt.mode === 'active' && rt.pat && rt.pat.type === 'charge') {
        const enr = st.bossDef.phases[st.boss.phase].enrage ? 1.15 : 1;
        const bx2 = clamp(st.boss.x + Math.cos(rt.data.aim) * rt.pat.speed * enr * horizon, AR.x0 + st.boss.r, AR.x1 - st.boss.r);
        const by2 = clamp(st.boss.y + Math.sin(rt.data.aim) * rt.pat.speed * enr * horizon, AR.y0 + st.boss.r, AR.y1 - st.boss.r);
        const pd = Math.hypot(bx2 - px, by2 - py);
        if (pd < st.boss.r + 10) danger += (st.boss.r + 10 - pd) * 5;
      }
      const bd = Math.hypot(st.boss.x - px, st.boss.y - py);
      if (bd < st.boss.r + 12) danger += (st.boss.r + 12 - bd) * 3;
      danger += Math.max(0, 26 - (px - AR.x0)) * 1.1 + Math.max(0, 26 - (AR.x1 - px)) * 1.1;
      danger += Math.max(0, 20 - (py - AR.y0)) * 1.1 + Math.max(0, 20 - (AR.y1 - py)) * 1.1;
      score -= danger;
    }
    const pb = Math.hypot(st.boss.x - (p.x + dx * 30), st.boss.y - (p.y + dy * 30));
    if (pb < 70) score -= (70 - pb) * 0.4;
    if (pb > 150) score -= (pb - 150) * 0.2;
    if (score > bestScore) { bestScore = score; best = [dx, dy]; }
  }
  const dash = immediateDanger(st) > 24 && p.dashCd <= 0;
  return { mx: best[0], my: best[1], dash, ability: true };
}

function runFight(boss, charId, seed, capSec, opts = {}) {
  const st = PIT.createRun({ boss, charId, seed, mods: opts.mods, mutators: opts.mutators, rankName: opts.rankName });
  const dt = 1 / 60;
  let steps = Math.round(capSec / dt);
  let lastPhase = 0;
  while (steps-- > 0 && !st.over) {
    const inp = botInput(st);
    const heartsBefore = st.player.hearts;
    PIT.step(st, dt, inp);
    if (st.player.hearts < heartsBefore) {
      // hit diagnosis: what was on/near the player?
      const p = st.player;
      let cause = 'unknown';
      let bestD = 1e9;
      for (const q of st.proj) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bestD) { bestD = d; cause = 'proj(' + q.kind + ')'; } }
      for (const z of st.zones) { const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < z.r && d < bestD) { bestD = d; cause = 'pool'; } }
      for (const m of st.minions) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < 14 && d < bestD) { bestD = d; cause = 'minion'; } }
      const bd = Math.hypot(st.boss.x - p.x, st.boss.y - p.y);
      if (bd < st.boss.r + 4 && bd < bestD) { bestD = bd; cause = 'boss body'; }
      for (const beam of st.beams) {
        const ex = beam.x + Math.cos(beam.ang) * 400, ey = beam.y + Math.sin(beam.ang) * 400;
        const dd = pointLineDist(p.x, p.y, beam.x, beam.y, ex, ey);
        if (dd < 8 && dd < bestD) { bestD = dd; cause = 'beam'; }
      }
      console.log(`    hit @${st.t.toFixed(1)}s phase ${st.boss.phase + 1} hearts ${heartsBefore}->${st.player.hearts} cause=${cause} pos=(${Math.round(p.x)},${Math.round(p.y)}) boss rt=${st.boss.rt.mode}:${st.boss.rt.pat ? st.boss.rt.pat.type : '-'}`);
    }
    if (st.boss.phase > lastPhase) { lastPhase = st.boss.phase; console.log(`    phase ${lastPhase + 1} @${st.t.toFixed(1)}s`); }
    if (st.over === 'win') break;
  }
  return { st, time: st.t };
}

const GATES = [
  { id: 'mossback', charId: 'volt', mods: PIT.RANK_MODS.BRONZE, label: 'BRONZE preset' },
  { id: 'ballast', charId: 'volt', mods: PIT.RANK_MODS.SILVER, label: 'SILVER preset' },
  { id: 'minter', charId: 'volt', mods: PIT.RANK_MODS.GOLD, label: 'GOLD preset' },
  { id: 'exchequer', charId: 'volt', mods: PIT.RANK_MODS.GOLD, label: 'GOLD preset' },
  { id: 'puppeteer', charId: 'bulwark', mods: null, label: 'base (BULWARK)' },
  { id: 'lanternmaw', charId: 'bulwark', mods: null, label: 'base (BULWARK)' },
  { id: 'undertow', charId: 'bulwark', mods: null, label: 'base (BULWARK)' },
  { id: 'gorget', charId: 'bulwark', mods: null, label: 'base (BULWARK)' },
  { id: 'vesper', charId: 'bulwark', mods: null, label: 'base (BULWARK)' },
  { id: 'archive', charId: 'bulwark', mods: null, label: 'base (BULWARK)' },
  { id: 'lastshore', charId: 'bulwark', mods: null, label: 'base (BULWARK)' }
];

const filter = process.argv.slice(2);
let bad = 0;
for (const g of (filter.length ? GATES.filter(x => filter.includes(x.id)) : GATES)) {
  const details = [];
  let wins = 0;
  for (const seed of [1, 2, 3]) {
    const { st, time } = runFight(idxOf(g.id), g.charId, seed, 300, { mods: g.mods || undefined });
    details.push(`${seed}:${st.over === 'win' ? 'WIN' : (st.over || 'timeout')}@${Math.round(time)}s,h${st.player.hearts}`);
    if (st.over === 'win') wins++;
  }
  const ok = wins === 3;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${g.id} @ ${g.label} — ${details.join(' ')}`);
}
process.exit(bad ? 1 : 0);
