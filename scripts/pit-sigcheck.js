// SIGNATURE WAVE data validation — run before the suite gates.
// Checks: every boss carries a unique sig; sig type present in its phases;
// fairness laws (tele >= 0.5, hurt speeds <= 90, pull force <= 26, blink dist >= 40,
// charge dash >= 110); herding law (no floor-denial signature in a spawn phase);
// zone grow only where designed; counts.
const BOSSES = require('../bosses.js');

let bad = 0;
const fail = (msg) => { bad++; console.log('FAIL ' + msg); };

const sigTypes = {};
const names = new Set();
for (const b of BOSSES.LIST) {
  if (!b.sig || !b.sig.name || !b.sig.blurb || !b.sig.type) fail(`${b.id}: missing sig fields`);
  else {
    if (names.has(b.sig.name)) fail(`${b.id}: duplicate sig name ${b.sig.name}`);
    names.add(b.sig.name);
    sigTypes[b.sig.type] = (sigTypes[b.sig.type] || 0) + 1;
  }
  if (b.sig && b.sig.type !== 'arsenal' && !b.phases.some(ph => ph.patterns.some(p => p.type === b.sig.type))) {
    fail(`${b.id}: sig type ${b.sig.type} not found in any phase`);
  }
  const types = new Set();
  b.phases.forEach((ph, pi) => {
    const hasSpawn = ph.patterns.some(p => p.type === 'spawn');
    for (const p of ph.patterns) {
      types.add(p.type);
      if (p.tele < 0.5) fail(`${b.id} p${pi + 1}: tele ${p.tele} < 0.5 (${p.type})`);
      const hurtSpeed = p.type === 'seek' ? p.speed
        : p.type === 'wall' ? p.speed
        : (p.type === 'mines' || p.type === 'mark' || p.type === 'mortar') ? p.popSpeed
        : p.type === 'orbit' ? p.speed
        : p.type === 'blink' ? p.clapSpeed
        : p.type === 'ric' ? p.speed : null;
      if (hurtSpeed != null && hurtSpeed > 90) fail(`${b.id} p${pi + 1}: ${p.type} hurt speed ${hurtSpeed} > 90`);
      if (p.type === 'pull' && p.force > 26) fail(`${b.id}: pull force ${p.force} > 26`);
      if (p.type === 'blink' && p.dist < 40) fail(`${b.id}: blink dist ${p.dist} < 40`);
      if (p.type === 'charge' && p.speed * p.dur < 110) fail(`${b.id}: charge dash ${p.speed * p.dur} < 110`);
      if (p.type === 'charge' && p.speed > 190) fail(`${b.id}: charge speed ${p.speed} > 190`);
      // herding law: floor-denial signatures never share a phase with spawn
      if (hasSpawn && ['mines', 'mark', 'mortar', 'zone'].includes(p.type)) {
        fail(`${b.id} p${pi + 1}: floor-denial ${p.type} in a spawn phase (herding law)`);
      }
    }
  });
  if (b.sig && b.sig.type === 'arsenal' && types.size < 5) fail(`${b.id}: arsenal sig needs >= 5 distinct types, has ${types.size}`);
}

console.log('sig type census:', JSON.stringify(sigTypes));
console.log('distinct types:', Object.keys(sigTypes).length);
const growUsers = BOSSES.LIST.filter(b => b.phases.some(ph => ph.patterns.some(p => p.type === 'zone' && p.grow > 0))).map(b => b.id);
console.log('grow-zone users:', growUsers.join(','));
const charges = [];
BOSSES.LIST.forEach(b => b.phases.forEach(ph => ph.patterns.forEach(p => { if (p.type === 'charge') charges.push(b.id); })));
console.log('charge count:', charges.length, charges.join(','));
console.log('roster:', BOSSES.LIST.length, 'unique sig names:', names.size);
console.log(bad ? `RESULT: ${bad} FAILURES` : 'RESULT: all data laws hold');
process.exit(bad ? 1 : 0);
