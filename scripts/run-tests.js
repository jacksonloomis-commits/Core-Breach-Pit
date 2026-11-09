// CORE BREACH: PIT — test runner. Runs the PIT sim suite.
const { spawnSync } = require('child_process');
const path = require('path');
const root = __dirname + '/..';

const suites = [
  { name: 'PIT sim suite', cmd: 'node', args: [path.join(root, 'tests', 'sim-test.js')] }
];

let failed = 0;
for (const s of suites) {
  console.log(`\n===== ${s.name} =====`);
  const r = spawnSync(s.cmd, s.args, { stdio: 'inherit', cwd: root });
  if (r.status !== 0) { failed++; console.log(`SUITE FAILED: ${s.name}`); }
}

console.log(failed ? `\n${failed} SUITE(S) FAILED` : '\nALL TEST SUITES PASSED');
process.exit(failed ? 1 : 0);
