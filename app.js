// CORE BREACH: PIT — browser UI, game loop, renderer, hub, saves.
(function () {
  'use strict';
  const BUILD = '2026.11.20';
  const UPDATE_LOG = [
    { version: '2026.11.20', tag: 'PLAYER ACCOUNTS', items: [
      'REAL ACCOUNTS (owner ask: "lets add actual accounts ... make a account verification system/login" + "make sure I keep my progress cuz I\'m at plat 2"): REGISTER in the hub header with a callsign and passcode — the passcode is stored ONLY as a salted SHA-256 digest (salted per account, fixed-time compare), never as text. The Pit is a static site on GitHub Pages, so accounts live per-browser; the hub shows who is banked (PILOT: NAME / LOG OUT) and guests keep playing as GUEST',
      'MIGRATION LAW — NOTHING STRANDS YOUR PROGRESS: registering claims this browser\'s existing guest save VERBATIM (SR, rank, cosmetics, W/L — the whole slot), shows what it claimed ("CLAIMED — PLATINUM 2 · 1450 SR"), and marks the guest slot claimed so a second account starts fresh instead of inheriting a copy. Logging out drops you to the untouched guest slot; logging back in rehydrates the account slot. Slots are isolated — no bleed either way',
      'THE TOP 5 BOARD IS HONEST (owner: "it should say ??? for all the top 5"): the old beta stand-in pilot names are GONE from the game — all five slots read ??? until a real registered pilot on this browser cracks the 4000 SR qualifying line, then the board fills by SR, five max, your row highlighted. A fresh browser shows a clean empty board: THE BOARD AWAITS'
    ] },
    { version: '2026.11.19', tag: 'PLAIN TEMPO', items: [
      'THE PACING TAG IS RENAMED (owner report: "it keeps saying GAP in the mutations but idk what GAP is"): every pacing multiplier now reads TEMPO — how much sooner the boss cycles its patterns. Higher is always more dangerous: TEMPO ×1.25 = attacks come a quarter sooner, ×0.9 = it pauses a little longer. No more guessing which way the number cuts',
      'SAME NUMBERS, HONEST DIRECTION: SWIFT HORROR is now TEMPO ×1.176 (the old tag said 0.85 — lower meant faster, which is exactly why it read backwards), SIEGE is TEMPO ×0.893, HEATED AIR is TEMPO ×0.926. The fight title and the ladder show the composed TEMPO, rounded clean through fmtMul like every other multiplier',
      'THE HOW-TO-PLAY SECTION TEACHES THE STAT in one line, and the mutator blurbs say it in words first — the stat is for reading the draw fast, not for decoding jargon'
    ] },
    { version: '2026.11.18', tag: 'SIGNATURE WAVE', items: [
      'EVERY BOSS HAS A SIGNATURE NOW (owner spec: "a lot of these bosses have the same gimmick ... every boss should feel a little unique"): all 42 lieutenants carry a named, test-pinned signature gimmick — the round announcer shows it before the gates open and the hub roster lists it on every card. Sharing attacks is fine; nobody shares an identity',
      'NINE NEW MECHANICS WERE BUILT FOR IT: homing seek drift (MOSSBACK, VESPER, PALE LEVIATHAN), proximity mines (CINDERMITE, THE LEDGER, LANTERN MAW), orbiting halos that burst outward (PALE HERALD, THE MINTER, MAELSTROM), flood walls with one gap (GLOAMWARDEN, THE LOOM, THE LAST SHORE), mortar shells (CARRION LAW, DREDGEWARDEN), a vortex pull (THE BALLAST, THE UNDERTOW), pinned marks that bill your square (THE AUDITOR, PRESSURE SAINT, THE ABYSSAL ARCHIVE), a teleport step with an arrival clap (THE PUPPETEER, NULL SOVEREIGN), wall-ricochet slugs (THE GORGET), and bile pools that bloom wider while they live (BILESPITTER, CINDERMAW)',
      'THE AUDIT ALSO CAUGHT TWO OLD LAWS BEING BROKEN: THE UNDERTOW\'S pull was capped to the escapable force, and THE GLUTTON\'s finale was quietly pairing its brood spawn with floor pools — the exact herding pair the VESPER lesson forbids. Both patterns fixed, every boss re-proven at its gate'
    ] },
    { version: '2026.11.17', tag: 'FULL BENCH', items: [
      'THE ROSTER GOES 31 -> 42 (owner spec: "add a boss or two more to each Arena for even more variety"): every arena bench is stocked — MOSSBACK joins the bronze warm-up, THE BALLAST the DEATHWARRANT area, THE MINTER + THE EXCHEQUER the tax office, THE PUPPETEER + LANTERN MAW the platinum gate, THE UNDERTOW the diamond deep, THE GORGET + VESPER the crimson court, and THE ABYSSAL ARCHIVE + THE LAST SHORE (both four phases) the iridescent endgame. Bronze rolls six, silver seven, the rest five or six — no more four-boss arenas',
      'EVERY NEW BODY IS BOT-PROVEN 3/3 AT ITS GATE: MOSSBACK at the BRONZE preset (VOLT), THE BALLAST at SILVER, THE MINTER + THE EXCHEQUER at GOLD, the seven beyond lieutenants at base (BULWARK) — and every existing gate re-proven with the deeper pools',
      'THE NEW BOSSES RECOMBINE PROVEN PATTERNS at their tier\'s pacing (one pressure theme per phase), and every spawner phase obeys the summon-cadence law: spawn 1-of-3 patterns with the swarm capped at 4-5, never in a two-pattern phase'
    ] },
    { version: '2026.11.16', tag: 'HONEST DASH', items: [
      'FIXED (owner report: the dotted red line is supposed to be a dash but the boss only moves like an inch): a first-frame timing bug clamped EVERY charge in the game to 0.01s before it even started — the dash you were promised never happened. Charges now run their full dash (~120-150px, angry phases faster), and a body hit from a charging lieutenant still hurts',
      'THE DASHED LINE TELLS THE TRUTH NOW: it shows the EXACT path the boss will charge — same length as the real dash, cut off honestly at a wall, with a stop marker where the boss will land. Read the line, step aside, punish the recovery'
    ] },
    { version: '2026.11.15', tag: 'ROUND ANNOUNCER', items: [
      'THE TWISTS MAKE THEIR ENTRANCE (owner spec): every queue now opens with a five-second countdown that names the boss and every mutator it rolled, with exactly what each one does — read the draw, plan the fight, then FIGHT',
      'NO MORE 1.0999000000099999 (owner report): composed multipliers printed raw floating-point garbage. Every multiplier the game shows — fight title, ladder, announcer — is rounded clean now'
    ] },
    { version: '2026.11.14', tag: 'ROUND VARIETY', items: [
      'MUTATORS (owner spec: make each round sorta unique and a little less tedious): every queue can now draw house twists alongside the boss — FRAIL, SWIFT HORROR, SIEGE, HEATED AIR, BROOD BLIGHT, VOLATILE CORE, ADRENALINE and BOUNTY. The fight title and the results screen tell you exactly what the Pit rolled',
      'THE DEEPER YOU CLIMB, THE WEIRDER IT GETS: bronze mostly rolls clean (55% for one twist), silver always rolls one, gold and platinum usually roll two, diamond and above always roll two. Every draw is seeded per attempt, so no two queues play the same fight',
      'BROOD BLIGHT only rolls in arenas whose pool owns a summoner, and mutators never touch spawn counts or swarm caps — the summon-cadence law stands and a spawn stall stays impossible',
      'BOUNTY multiplies the SR payout ×1.3 — banked on wins and losses alike, so it is risk and reward in one tag',
      'THE ROSTER GOES 26 -> 31 (owner spec: add a few more bosses anyways): one new body per pool where repetition bites — THE LEDGER (gold), HOLLOW REGENT (platinum), PRESSURE SAINT (diamond), THE MARSHAL (crimson) and PALE LEVIATHAN (iridescent, 4 phases). Every arena now rolls FOUR lieutenants, all bot-proven 3/3 at their gates'
    ] },
    { version: '2026.11.13', tag: 'BROOD TAX', items: [
      'FIXED (owner report): GRAVEWAKE was just about unbeatable — its brood phase summoned every 2nd pattern, which is exactly the rate a player can kill minions, so the swarm never emptied, your gun was stuck on blob cleanup and the boss barely took damage. Measured by probe: a 244-second brood phase, 70 spawn events, 140 minion kills, fight unwinnable',
      'THE BROOD IS TAXED: the REGURGITANT now summons 1-of-3 patterns with the swarm capped at 4 (was every-2nd, cap 5). The brood still hunts you and stragglers chase into later phases — it can just be outkilled now. Measured: brood phase 244s -> 59s, PLATINUM-preset fight BULWARK 5/6 clears at ~129s',
      'NEW HOUSE LAW: a boss fight must be ENDABLE at its rank preset — a boss you survive but can never finish is a bug, not a wall. The suite now pins GRAVEWAKE clearable at the PLATINUM preset 3/3 as the summon-stall regression, and AGENTS.md carries the cadence law for every future spawner phase'
    ] },
    { version: '2026.11.12', tag: 'PHASE FURY', items: [
      'BOSS PHASES NOW ACTUALLY DO SOMETHING (owner spec): every phase the whole fight escalates — patterns cycle sooner, telegraphs snap a beat tighter (never under the 0.5s fairness floor) and every projectile leaves faster. Enrage final phases stack on top of the curve and hit harder than ever',
      'PHASE TRANSITIONS FIGHT BACK: the fairness wipe now ends with a gold retaliation ring bursting out of the boss — slower than your run speed, so walk through it, but it will catch you standing still',
      'THE POOLS DEEPEN (owner spec: "an extra boss or two"): five arenas get a third boss — THE AUDITOR joins the gold tax office, CINDERMAW the platinum gate, DREDGEWARDEN the diamond deep, GORE PRELATE the crimson court, OLD WATER (four phases) the iridescent endgame. Roster 21 -> 26, no arena rolls fewer than three bodies',
      'Every new boss is bot-proven: THE AUDITOR at the GOLD preset (VOLT 3/3 seeds), the four new beyond bosses at base (BULWARK 3/3 seeds each); every existing gate re-proven under the fury curve'
    ] },
    { version: '2026.11.11', tag: 'ARENA POOLS', items: [
      'EVERY ARENA ROLLS ITS OWN BOSS POOL (owner spec) — no more shared rotation: GOLD fights the Tide\'s tax collectors, PLATINUM owns GRAVEWAKE + IRON CHOIR, DIAMOND owns THE LOOM + THE FATHOM, CRIMSON owns MAELSTROM + NULL SOVEREIGN, IRIDESCENT owns THE GLUTTON + TIDE UNBOUND. No boss appears in two arenas — a test pins the ownership',
      'THE ROSTER GROWS 15 -> 21: TOLLMASTER (545) and BRASS HERALD (570) fill the new gold band, strictly past the DEATHWARRANT anchor; THE LOOM (620), MAELSTROM (650), THE GLUTTON (680) and TIDE UNBOUND (720, 4 enrage phases) deepen the beyond band',
      'The hub roster is now the ARENA roster: seven sections, one per rank, each listing exactly the bosses that can spawn there',
      'Every new boss is bot-proven: the gold band at the GOLD preset (VOLT 3/3 seeds each), the four new beyond bosses at base (BULWARK 3/3 seeds each)'
    ] },
    { version: '2026.11.11', tag: 'BOSS EXPANSION', items: [
      'THE ROSTER GOES 5 -> 15: ten new Crimson Tide lieutenants across three difficulty bands — GNASHER, CINDERMITE, THRESHER (bronze), PALE HERALD, GLOAMWARDEN, CARRION LAW (silver), IRON CHOIR, THE FATHOM, GRAVEWAKE, NULL SOVEREIGN (beyond)',
      'Silver recalibrated (owner spec): silver-rank rolls are now ALL champion-weight — THE SURGEON (280 -> 500) and HIVE MOTHER (440 -> 480) were rebuilt into the DEATHWARRANT area, and every silver pool member is pinned to 480-560 base HP by tests',
      'Bronze stays easy on purpose: GATEKEEPER, BILESPITTER and three new lightweights keep the warm-up "super ez" — two phases, big gaps, slow slugs',
      'Beyond the champion: IRON CHOIR, THE FATHOM, GRAVEWAKE and NULL SOVEREIGN (600-720 HP, up to 4 phases) rotate in from Platinum upward — the real wall past the ladder\'s mid ranks',
      'Every new boss is proven beatable by the dodge-bot (3/3 seeds) at base, and the whole bronze + silver ladder is bot-proven at its rank preset; Platinum+ presets are the documented beyond-bot zone'
    ] },
    { version: '2026.11.10', tag: 'RANKED BETA', items: [
      'STARS AND ARENAS ARE GONE. Ranked SR ladder instead: Bronze 1-3, Silver 1-3, Gold 1-2, Platinum 1-3, Diamond 1-3, Crimson 1-3, Iridescent — climb by banking SR, never resets',
      'SR economy: win at full HP +30 · one heart lost +15 · two lost -5 · three or more lost -20 · flatline -10',
      'Random boss rotation inside your rank; higher ranks fight the same bosses with more HP and tighter pacing (telegraphs and speeds stay fairness-legal) — Silver walls you with the DEATHWARRANT weight class',
      'TOP 5 board: hit Iridescent (3500 SR, qualifying 4000) and crack the board by SR; every rank drops cosmetics when the season ends — Season 1 is live',
      'Operatives now unlock by SR: GHOST at Silver (500), BULWARK at Platinum (1100). Old saves migrate: cleared arenas + stars convert to starting SR',
      'Also in this ship: GHOST PHASE actually grants intangibility now (it was cosmetic), plus regression tests for all three abilities'
    ] },
    { version: '2026.11.10', tag: 'ABILITY HOTFIX', items: [
      'FIXED: GHOST PHASE was a coat of paint — the 2s intangibility timer existed but the damage code never read it, so shots, pools, beams, minions and the boss itself all still hit while phased. PHASE now truly walks through everything.',
      'Full ability audit: OVERCHARGE (double fire rate) and BASTION (frontal shot barrier) verified live in the sim; new regression tests pin all three abilities',
      'Balance gate made real: the dashless casual reference from AGENTS.md is now an enforced test — clears Arena I, walled off from Arenas II/III/V (HIVE MOTHER on IV is knowingly kite-able)'
    ] },
    { version: '2026.11.10', tag: 'BALANCE + UI PASS', items: [
      'FIXED: dash invincibility never expired — one dash made you untouchable for the whole run. You can be hit now. Sorry.',
      'Boss pass: HP up across the ladder (160/230/280/440/520), fire rate down, pattern gaps halved, projectile speeds pushed toward the cap, denser volleys, tougher minions',
      'Champion wall: DEATHWARRANT enrage phase rebuilt — beatable, but it will cost you hits',
      'HUD rebuilt: two clean rows (hearts · boss bar + timer · dash + ability bars · phase + hits), brighter text everywhere, softer scanlines, bigger hub fonts'
    ] },
    { version: '2026.11.10', tag: 'PIT OPEN BETA', items: [
      'Compact beta: 5 arenas (Bronze to Champion), 5 Crimson Tide bosses with telegraphed attack patterns',
      '3 playable operatives: VOLT (starter), GHOST (clear Arena II), BULWARK (clear Arena IV)',
      'Real-time dodge combat: WASD move, Space dash with i-frames, E ability, auto-fire hitscan',
      'Star ratings per arena (3 = flawless), pure progression unlocks, CRT filter + synth SFX',
      'HOTFIX: PAUSED/RESULTS overlays no longer stick over the fight (CSS was ignoring the hidden attribute), and P/Esc now unpauses too'
    ] }
  ];

  const PIT = window.PIT, PAL = window.PIT_PAL, CHARS = window.PIT_CHARS, BOSSES = window.PIT_BOSSES;
  const C = PAL.C;
  const $ = (s) => document.querySelector(s);
  const el = (t, cls, html) => { const e = document.createElement(t); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

  // ================= save (v2, ranked) =================
  const SKEY = 'cbp-save-v2';
  PIT.ACCOUNTS.init(); // per-browser account store (register / login / logout below)
  let SAVE = load();
  const bootPilot = PIT.ACCOUNTS.current(); // logged-in pilots rehydrate their own slot
  if (bootPilot && bootPilot.save && bootPilot.save.v === 2) SAVE = { ...PIT.defaultRankedSave(), ...bootPilot.save };
  function load() {
    try {
      const v2 = JSON.parse(localStorage.getItem(SKEY));
      if (v2 && v2.v === 2) return { ...PIT.defaultRankedSave(), ...v2 };
      const v1 = JSON.parse(localStorage.getItem('cbp-save-v1'));
      if (v1) return PIT.migrateSave(v1); // stars/arenas -> starting SR, not a silent break
    } catch {}
    return PIT.defaultRankedSave();
  }
  function persist() {
    // guests bank on the legacy slot; logged-in pilots bank on their account slot
    // (isolated — logging in or out never bleeds progress between slots) and the
    // honest Top 5 board updates from the same write
    try {
      if (PIT.ACCOUNTS.current()) { PIT.ACCOUNTS.setSave(SAVE); PIT.ACCOUNTS.maybeRecord(SAVE); }
      else localStorage.setItem(SKEY, JSON.stringify(SAVE));
    } catch {}
  }

  // season rollover: the owner ends a season by bumping PIT.SEASON in engine.js;
  // the next load here awards that season's peak-rank cosmetic and opens the new one
  let seasonBanner = null;
  if (SAVE.season !== PIT.SEASON) {
    seasonBanner = PIT.seasonEnd(SAVE);
    persist();
  }

  if (window.PIT_SFX) window.PIT_SFX.setEnabled(SAVE.sfx);

  // ================= screens =================
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== 'screen-' + id);
    if (id === 'hub') renderHub();
  }

  function renderHub() {
    renderPilotBar();
    // rank card — who you are on the ladder right now
    const prog = PIT.tierProgress(SAVE.sr);
    const rk = prog.rank;
    const card = $('#rank-card');
    const badge = SAVE.cosmetics.length ? `<span class="badge" title="season reward">${SAVE.cosmetics[SAVE.cosmetics.length - 1]}</span>` : '';
    card.innerHTML = `
      <div class="rc-left">
        <div class="rc-rank rk-${rk.name.toLowerCase()}">${PIT.rankLabel(rk)}</div>
        <div class="rc-sr">${SAVE.sr} SR</div>
        <div class="rc-bar"><div class="rc-fill rk-${rk.name.toLowerCase()}" style="width:${prog.pct}%"></div></div>
        <div class="rc-next">${prog.toNext == null ? 'TOP OF THE LADDER' : prog.toNext + ' SR to ' + PIT.rankLabel(PIT.RANKS[PIT.RANKS.indexOf(rk) + 1] || rk)}</div>
      </div>
      <div class="rc-right">
        <div class="rc-season">SEASON ${PIT.SEASON}</div>
        <div class="rc-peak">PEAK ${SAVE.peakSr} SR</div>
        <div class="rc-record">${SAVE.wins}W · ${SAVE.losses}L</div>
        ${badge}
      </div>`;

    // the ladder — every tier, where you sit
    const ladder = $('#rank-ladder'); ladder.innerHTML = '';
    PIT.RANKS.forEach((r, i) => {
      const cur = r === rk;
      const mods = PIT.rankMods(r);
      const row = el('div', 'rl-row' + (cur ? ' current' : '') + (r.name === 'IRIDESCENT' ? ' iri' : ''));
      row.innerHTML = `
        <div class="rl-rank rk-${r.name.toLowerCase()}">${PIT.rankLabel(r)}</div>
        <div class="rl-sr">${r.min}${r.max === Infinity ? '+' : '-' + r.max}</div>
        <div class="rl-mods">HP ×${PIT.fmtMul(mods.hpMult)} · TEMPO ×${PIT.fmtMul(1 / mods.gapMult)}</div>`;
      ladder.appendChild(row);
    });

    // Top 5 board — REAL accounts only; empty slots read ??? (owner Task 47: the old
    // beta mock names are gone — the board fills as local pilots crack 4000 SR)
    const lb = PIT.leaderboardWith(SAVE.sr);
    const t5 = $('#top5'); t5.innerHTML = '';
    lb.board.forEach((e, i) => {
      const row = el('div', 't5-row' + (e.you ? ' you' : '') + (e.empty ? ' empty' : ''));
      row.innerHTML = `<div class="t5-pos">${i + 1}</div><div class="t5-name">${e.name}</div><div class="t5-sr">${e.empty ? '—' : e.sr + ' SR'}</div>`;
      t5.appendChild(row);
    });
    const foot = el('div', 't5-foot');
    foot.textContent = lb.you.inBoard ? 'YOU ARE ON THE BOARD'
      : lb.filled === 0 ? 'THE BOARD AWAITS — a registered pilot at 4000 SR takes slot #1'
      : `YOU — #${lb.you.pos} at ${SAVE.sr} SR` + (lb.qualify ? ' · TOP 5 QUALIFYING' : ` · qualify at ${PIT.TOP5_QUALIFY} SR`);
    t5.appendChild(foot);

    // operatives — locked by SR now
    const row = $('#char-row'); row.innerHTML = '';
    CHARS.LIST.forEach(c => {
      const owned = SAVE.chars.includes(c.id);
      const need = PIT.CHAR_UNLOCK_SR[c.id];
      const d = el('button', 'char-card' + (owned ? '' : ' locked') + (SAVE.char === c.id ? ' picked' : ''));
      d.innerHTML = owned ? `
        <div class="cc-name" style="color:${c.tint}">${c.name}</div>
        <div class="cc-role">${c.role}</div>
        <div class="cc-ab">${c.abName} — ${c.abBlurb}</div>
        <div class="cc-stats">${'♥'.repeat(c.hearts)} · SPD ${c.speed} · DASH ${c.dashCd}s</div>`
        : `<div class="cc-name">???</div><div class="cc-role">LOCKED — ${need} SR</div><div class="cc-ab">${c.blurb}</div>`;
      if (owned) d.onclick = () => { SAVE.char = c.id; persist(); PIT_SFX.sfx('click'); renderHub(); };
      row.appendChild(d);
    });

    $('#hub-stats').textContent = `RUNS ${SAVE.runs} · ${SAVE.wins}W ${SAVE.losses}L · PEAK ${SAVE.peakSr} SR · SEASON ${PIT.SEASON}`;

    // the roster — the ARENA roster: every rank owns its pool, and the pool IS the
    // section (owner spec: "each arena should have its own boss pool"). Pools are
    // exclusive, so every boss appears exactly once, under the only rank that rolls it.
    const roster = $('#roster'); roster.innerHTML = '';
    const ARENAS = [
      { name: 'BRONZE', label: 'BRONZE ARENA — THE WARM-UP' },
      { name: 'SILVER', label: 'SILVER ARENA — THE DEATHWARRANT AREA' },
      { name: 'GOLD', label: 'GOLD ARENA — THE TIDE\'S TAX COLLECTORS' },
      { name: 'PLATINUM', label: 'PLATINUM ARENA — FIRST GATE PAST THE CHAMPION' },
      { name: 'DIAMOND', label: 'DIAMOND ARENA — THE DEEP PRESSURE' },
      { name: 'CRIMSON', label: 'CRIMSON ARENA — THE KING\'S COURT' },
      { name: 'IRIDESCENT', label: 'IRIDESCENT ARENA — THE TIDE ITSELF' }
    ];
    for (const arena of ARENAS) {
      const rk = PIT.RANKS.find(r => r.name === arena.name);
      const head = el('div', 'roster-band', arena.label + ' — POOL: ' + rk.pool.map(i => BOSSES.LIST[i].name).join(' · '));
      roster.appendChild(head);
      rk.pool.forEach((bi) => {
        const b = BOSSES.LIST[bi];
        const card = el('div', 'roster-boss');
        card.innerHTML = `<span class="rb-name" style="color:${b.tint}">${b.name}</span><span class="rb-title">${b.title}</span><span class="rb-hp">${b.hp} HP</span>${b.sig ? `<span class="rb-sig">SIG · ${b.sig.name}</span>` : ''}<div class="rb-brief">${b.brief}</div>`;
        roster.appendChild(card);
      });
    }

    $('#opt-crt').checked = SAVE.crt;
    $('#opt-sfx').checked = SAVE.sfx;
    const ul = $('#update-log-list'); ul.innerHTML = '';
    UPDATE_LOG.forEach(u => {
      ul.appendChild(el('li', '', `<b>${u.version} — ${u.tag}</b><ul>${u.items.map(i => `<li>${i}</li>`).join('')}</ul>`));
    });
  }

  // options
  $('#opt-crt').onchange = (e) => { SAVE.crt = e.target.checked; persist(); document.body.classList.toggle('no-crt', !SAVE.crt); };
  $('#opt-sfx').onchange = (e) => { SAVE.sfx = e.target.checked; persist(); if (window.PIT_SFX) window.PIT_SFX.setEnabled(SAVE.sfx); };

  // ================= fight =================
  const cv = $('#fight-canvas'), cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  const STEP = 1 / 60;
  let st = null, acc = 0, last = 0, running = false, paused = false, overT = 0, flashT = 0;
  // ROUND ANNOUNCER: every queue opens with a countdown that names the boss and its
  // mutators (owner spec: "modifiers pop up right before the round starts ... count
  // down from 5, say the boss name and the modifier(s) and what they do"). The sim is
  // FROZEN while it is up — nothing steps, nothing hurts, input is gated — and P still
  // pauses it. READY_GO is the short FIGHT beat after the last number.
  const READY_SECS = 5, READY_GO = 0.45;
  let readyT = 0, readyShown = -1;
  const keys = {};
  let particles = [];

  function startRanked() {
    // random rotation: the rank's pool decides which boss you face (bosses.js LIST index)
    const rk = PIT.rankFor(SAVE.sr);
    const pool = rk.pool;
    const bossIndex = pool[Math.floor(Math.random() * pool.length)];
    startFight(bossIndex, rk);
  }

  function startFight(bossIndex, rk) {
    rk = rk || PIT.rankFor(SAVE.sr);
    // ROUND VARIETY: the rank name tells the engine to roll the mutator deck with the
    // fight seed — every attempt fights its own boss AND its own house twists
    st = PIT.createRun({ boss: bossIndex, charId: SAVE.char, seed: (Date.now() & 0xffffff) >>> 0, mods: PIT.rankMods(rk), rankName: rk.name });
    particles = []; acc = 0; overT = 0; paused = false; flashT = 0;
    // overlay hygiene: a fresh fight must never open under a stale PAUSED/RESULTS/ANNOUNCER overlay
    $('#result').hidden = true;
    $('#pause-ov').hidden = true;
    $('#ready-ov').hidden = true;
    SAVE.runs++; persist();
    show('fight');
    const mutTag = st.mutators.length ? ' — ' + st.mutators.map(m => m.name).join(' · ') : '';
    $('#fight-title').textContent = `${PIT.rankLabel(rk)} // ${st.bossDef.name} — HP ×${PIT.fmtMul(st.mods.hpMult)} TEMPO ×${PIT.fmtMul(1 / st.mods.gapMult)}${mutTag}`;
    showReady(rk);
    running = true; last = performance.now();
    requestAnimationFrame(loop);
  }

  // ROUND ANNOUNCER: populate the pre-round overlay with the boss and its mutators
  // (names + blurbs, so the player reads what each twist does before the gates open).
  // ================= PLAYER ACCOUNTS (register / login / logout) =================
  // Per-browser accounts: the passcode never leaves this browser and is stored only
  // as a salted SHA-256 digest. Registering claims the browser's unclaimed guest
  // save verbatim (owner: "make sure I keep my progress cuz I'm at plat 2").
  let pilotNote = '';
  function renderPilotBar(note) {
    const bar = $('#pilot-bar'); if (!bar) return;
    if (note !== undefined) pilotNote = note;
    const cur = PIT.ACCOUNTS.current();
    bar.innerHTML = (cur
      ? `<span class="pb-name">PILOT: ${cur.name}</span><button id="btn-logout" class="btn ghost">LOG OUT</button>`
      : `<span class="pb-name">GUEST — progress banks on this browser only</span><button id="btn-auth" class="btn gold">REGISTER / LOG IN</button>`)
      + (pilotNote ? `<div class="pb-note">${pilotNote}</div>` : '');
    const lo = $('#btn-logout');
    if (lo) lo.onclick = () => {
      PIT.ACCOUNTS.logout();
      SAVE = load(); // back to the guest slot — the pilot's runs stay in their account
      pilotNote = '';
      persist();
      renderHub();
    };
    const au = $('#btn-auth');
    if (au) au.onclick = () => openAuth('register');
  }
  let authMode = 'register';
  function setAuthMode(m) {
    authMode = m;
    $('#auth-title').textContent = m === 'register' ? 'REGISTER' : 'LOG IN';
    $('#auth-go').textContent = m === 'register' ? 'REGISTER' : 'LOG IN';
    $('#auth-switch').textContent = m === 'register' ? 'LOG IN INSTEAD' : 'REGISTER A NEW CALLSIGN';
    $('#auth-msg').textContent = '';
  }
  function openAuth(m) {
    setAuthMode(m);
    $('#auth-name').value = '';
    $('#auth-pass').value = '';
    $('#auth-ov').hidden = false;
    $('#auth-name').focus();
  }
  function closeAuth() { $('#auth-ov').hidden = true; }
  function authSubmit() {
    const msg = $('#auth-msg');
    const res = authMode === 'register'
      ? PIT.ACCOUNTS.register($('#auth-name').value, $('#auth-pass').value)
      : PIT.ACCOUNTS.login($('#auth-name').value, $('#auth-pass').value);
    if (!res.ok) { msg.textContent = res.error; return; }
    const cur = PIT.ACCOUNTS.current();
    SAVE = { ...PIT.defaultRankedSave(), ...(cur.save || {}) };
    // a claimed save may predate the season — rerun the rollover flow so the reward
    // banner fires exactly like it does on a fresh boot
    if (SAVE.season !== PIT.SEASON) seasonBanner = PIT.seasonEnd(SAVE);
    persist();
    pilotNote = res.claimed
      ? `CLAIMED — this browser's old save (${PIT.rankLabel(PIT.rankFor(res.claimed.sr))} · ${res.claimed.sr} SR) is now your account's save`
      : (authMode === 'login' ? '' : 'registered — your runs now bank under ' + cur.name);
    renderHub();
    closeAuth();
  }
  $('#auth-go').addEventListener('click', authSubmit);
  $('#auth-switch').addEventListener('click', () => setAuthMode(authMode === 'register' ? 'login' : 'register'));
  $('#auth-close').addEventListener('click', closeAuth);
  document.addEventListener('keydown', (e) => {
    if (!$('#auth-ov') || $('#auth-ov').hidden) return;
    if (e.key === 'Escape') closeAuth();
    else if (e.key === 'Enter' && document.activeElement && document.activeElement.tagName === 'INPUT') authSubmit();
  });

  function showReady(rk) {
    const ov = $('#ready-ov');
    $('#ready-rank').textContent = PIT.rankLabel(rk) + ' — ROUND INCOMING';
    const bossEl = $('#ready-boss');
    bossEl.textContent = st.bossDef.name;
    bossEl.style.color = st.bossDef.tint;
    $('#ready-brief').textContent = `${st.bossDef.title} · ${st.boss.maxHp} HP at this pacing`;
    // SIGNATURE WAVE: the announcer names the boss's signature gimmick before the
    // gates open — read what makes THIS lieutenant different, then plan the fight
    const sigEl = $('#ready-sig');
    if (st.bossDef.sig) {
      sigEl.hidden = false;
      sigEl.innerHTML = `<span class="rsig-name" style="color:${st.bossDef.tint}">SIGNATURE — ${st.bossDef.sig.name}</span><span class="rsig-blurb">${st.bossDef.sig.blurb}</span>`;
    } else sigEl.hidden = true;
    const mrow = $('#ready-muts');
    mrow.innerHTML = '';
    if (st.mutators.length) {
      for (const m of st.mutators) {
        const d = el('div', 'rmut');
        d.innerHTML = `<span class="rmut-name">${m.name}</span><span class="rmut-blurb">${m.blurb}</span>`;
        mrow.appendChild(d);
      }
    } else {
      mrow.appendChild(el('div', 'rmut rmut-none', '<span class="rmut-name">CLEAN QUEUE</span><span class="rmut-blurb">No mutators rolled — the lieutenant fights at face value.</span>'));
    }
    readyShown = -1; readyT = READY_SECS;
    $('#ready-num').textContent = READY_SECS;
    ov.hidden = false;
  }

  function endFight() {
    running = false;
    const win = st.over === 'win';
    const heartsLost = st.player.maxHearts - Math.max(0, st.player.hearts);
    const res = PIT.applyRankedResult(SAVE, win, heartsLost, st.mods.srMult || 1);
    persist();
    showResult(win, res, heartsLost);
  }

  function showResult(win, res, heartsLost) {
    const box = $('#result');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h2', win ? 'gold' : 'crimson', win ? 'BOSS DOWN' : 'FLATLINED'));
    const after = PIT.rankFor(SAVE.sr);
    const deltaCls = res.delta >= 0 ? 'gold' : 'crimson';
    box.appendChild(el('div', 'sr-delta ' + deltaCls, (res.delta >= 0 ? '+' : '') + res.delta + ' SR'));
    if (win) {
      const label = heartsLost === 0 ? 'CLEAN WIN — full HP' : `${heartsLost} heart${heartsLost === 1 ? '' : 's'} lost`;
      box.appendChild(el('p', 'result-sub', `${label} · boss HP was ${Math.round(100 * st.boss.hp / st.boss.maxHp)}% of a ${st.bossDef.name} at ${PIT.rankLabel(PIT.rankFor(SAVE.sr))} pacing`));
    } else {
      box.appendChild(el('p', 'result-sub', `The Tide keeps the SR. Boss HP was ${Math.max(0, Math.round(100 * st.boss.hp / st.boss.maxHp))}% left.`));
    }
    if (st.mutators.length) {
      box.appendChild(el('p', 'result-sub', 'MUTATORS: ' + st.mutators.map(m => m.name).join(' · ')));
    }
    if (res.promoted) { const b = el('div', 'banner gold', `PROMOTED — ${PIT.rankLabel(res.promoted)}`); box.appendChild(b); }
    if (res.demoted) { const b = el('div', 'banner crimson', `DEMOTED — ${PIT.rankLabel(res.demoted)}`); box.appendChild(b); }
    res.newChars.forEach(id => {
      const c = CHARS.LIST.find(x => x.id === id);
      box.appendChild(el('div', 'banner', `OPERATIVE UNLOCKED: ${c.name} — ${c.abName}`));
    });
    if (seasonBanner) { box.appendChild(el('div', 'banner gold', `SEASON ${seasonBanner.from} ENDED — REWARD: ${seasonBanner.badge}`)); seasonBanner = null; }
    box.appendChild(el('p', 'result-sub', `Now ${PIT.rankLabel(after)} · ${SAVE.sr} SR`));
    const row = el('div', 'result-btns');
    const again = el('button', 'btn', 'QUEUE AGAIN'); again.onclick = () => { PIT_SFX.sfx('click'); box.hidden = true; startRanked(); };
    row.appendChild(again);
    const hub = el('button', 'btn ghost', 'HUB'); hub.onclick = () => { PIT_SFX.sfx('click'); box.hidden = true; show('hub'); };
    row.appendChild(hub);
    box.appendChild(row);
  }

  // ---- input
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    // pause toggle must be reachable while paused too — never gate it behind the early return
    if (e.key === 'p' || e.key === 'Escape') { if (running && st && !st.over) togglePause(); return; }
    if (!running || paused || readyT > -READY_GO || !st || st.over) return;
    if (e.key === ' ' || e.key === 'Shift') queueDash = true;
    if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'q') queueAb = true;
  });
  document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  let queueDash = false, queueAb = false;

  function togglePause() {
    if (!running) return;
    paused = !paused;
    $('#pause-ov').hidden = !paused;
    if (!paused) { last = performance.now(); requestAnimationFrame(loop); }
  }
  $('#btn-resume').onclick = () => togglePause();
  $('#btn-quit').onclick = () => { paused = false; $('#pause-ov').hidden = true; $('#ready-ov').hidden = true; readyT = 0; running = false; show('hub'); };

  function readInput() {
    const inp = {
      left: keys['a'] || keys['arrowleft'], right: keys['d'] || keys['arrowright'],
      up: keys['w'] || keys['arrowup'], down: keys['s'] || keys['arrowdown'],
      dash: queueDash, ability: queueAb
    };
    queueDash = false; queueAb = false;
    return inp;
  }

  function loop(now) {
    if (!running || paused) return;
    let dt = (now - last) / 1000; last = now;
    dt = Math.min(dt, 0.1);
    // ROUND ANNOUNCER holds the sim frozen: count READY_SECS -> 1, show a short FIGHT
    // beat, then open the gates this same frame. Pause freezes the countdown too.
    if (readyT > -READY_GO) {
      readyT -= dt;
      const n = Math.ceil(readyT);
      if (n !== readyShown) {
        readyShown = n;
        const numEl = $('#ready-num');
        if (n > 0) { numEl.textContent = n; PIT_SFX.sfx('count'); }
        else { numEl.textContent = 'FIGHT'; PIT_SFX.sfx('go'); }
        numEl.classList.remove('pop'); void numEl.offsetWidth; numEl.classList.add('pop');
      }
      acc = 0;
      render();
      if (readyT > -READY_GO) { requestAnimationFrame(loop); return; }
      $('#ready-ov').hidden = true;
    }
    acc += dt;
    while (acc >= STEP) {
      if (!st.over) PIT.step(st, STEP, readInput());
      else readInput();
      acc -= STEP;
    }
    consumeEvents();
    render();
    if (st.over) {
      overT += dt;
      if (overT > 0.9) { endFight(); return; }
    }
    requestAnimationFrame(loop);
  }

  function consumeEvents() {
    for (const ev of st.events) {
      PIT_SFX.sfx(ev.type === 'tele' ? 'tele' : ev.type);
      if (ev.type === 'hurt') burst(ev.x, ev.y, C.crimson, 14);
      if (ev.type === 'minkill') burst(ev.x, ev.y, C.amber, 8);
      if (ev.type === 'dash') burst(ev.x, ev.y, C.teal, 6);
      if (ev.type === 'block') burst(ev.x, ev.y, C.gold, 5);
      if (ev.type === 'win') burst(st.boss.x, st.boss.y, C.amber, 40);
      if (ev.type === 'phase') { burst(st.boss.x, st.boss.y, C.gold, 34); flashT = 0.35; }
    }
    st.events.length = 0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.x += q.vx * 0.016; q.y += q.vy * 0.016; q.life -= 0.016;
      if (q.life <= 0) particles.splice(i, 1);
    }
  }

  function burst(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 70;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, col });
    }
  }

  // ================= renderer =================
  function px(x, y, w, h, col) { cx.fillStyle = col; cx.fillRect(Math.round(x), Math.round(y), w, h); }

  function render() {
    cx.fillStyle = C.bg; cx.fillRect(0, 0, PIT.W, PIT.H);
    // PHASE FURY: the whole frame flashes gold for a beat when a boss phase lands
    if (flashT > 0) {
      flashT -= 1 / 60;
      cx.globalAlpha = Math.max(0, flashT) * 0.55;
      cx.fillStyle = C.gold;
      cx.fillRect(0, 0, PIT.W, PIT.H);
      cx.globalAlpha = 1;
    }

    // arena floor + grid
    cx.fillStyle = C.void; cx.fillRect(PIT.AR.x0, PIT.AR.y0, PIT.AR.x1 - PIT.AR.x0, PIT.AR.y1 - PIT.AR.y0);
    cx.fillStyle = '#0d1322';
    for (let gx = PIT.AR.x0; gx < PIT.AR.x1; gx += 24) cx.fillRect(gx, PIT.AR.y0, 1, PIT.AR.y1 - PIT.AR.y0);
    for (let gy = PIT.AR.y0; gy < PIT.AR.y1; gy += 24) cx.fillRect(PIT.AR.x0, gy, PIT.AR.x1 - PIT.AR.x0, 1);
    // walls
    px(PIT.AR.x0 - 2, PIT.AR.y0 - 2, PIT.AR.x1 - PIT.AR.x0 + 4, 2, C.walllit);
    px(PIT.AR.x0 - 2, PIT.AR.y1, PIT.AR.x1 - PIT.AR.x0 + 4, 2, C.walllit);
    px(PIT.AR.x0 - 2, PIT.AR.y0 - 2, 2, PIT.AR.y1 - PIT.AR.y0 + 4, C.walllit);
    px(PIT.AR.x1, PIT.AR.y0 - 2, 2, PIT.AR.y1 - PIT.AR.y0 + 4, C.walllit);

    if (!st) return;
    const p = st.player, b = st.boss;

    // telegraphs: zone spot outlines — and the SIGNATURE WAVE floor telegraphs
    // (mark reticles, mine spots, mortar targets), each drawn from the SAME
    // rt.data the engine planned at telegraph start
    if (b.rt.mode === 'tele' && b.rt.pat && (b.rt.pat.type === 'zone' || b.rt.pat.type === 'mines' || b.rt.pat.type === 'mortar')) {
      const col = b.rt.pat.type === 'zone' ? '#9ae66e' : C.amber;
      cx.strokeStyle = col; cx.lineWidth = 1;
      const pulse = 0.5 + 0.5 * Math.sin(st.t * 12);
      for (const s of b.rt.data.spots) {
        cx.globalAlpha = 0.3 + 0.5 * pulse;
        cx.strokeRect(s.x - b.rt.pat.r, s.y - b.rt.pat.r, b.rt.pat.r * 2, b.rt.pat.r * 2);
      }
      cx.globalAlpha = 1;
    }
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'mark') {
      // THE AUDIT / PILGRIM MARK / DOCUMENTED: a reticle on the square you stand on
      const pulse = 0.5 + 0.5 * Math.sin(st.t * 14);
      cx.strokeStyle = C.crimlite; cx.globalAlpha = 0.4 + 0.5 * pulse;
      for (const s of b.rt.data.spots) {
        cx.strokeRect(s.x - b.rt.pat.r, s.y - b.rt.pat.r, b.rt.pat.r * 2, b.rt.pat.r * 2);
        cx.beginPath();
        cx.moveTo(s.x - b.rt.pat.r - 3, s.y); cx.lineTo(s.x + b.rt.pat.r + 3, s.y);
        cx.moveTo(s.x, s.y - b.rt.pat.r - 3); cx.lineTo(s.x, s.y + b.rt.pat.r + 3);
        cx.stroke();
      }
      cx.globalAlpha = 1;
    }
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'blink') {
      // MARIONETTE / KING'S STEP: a ghost where the body will land — it lands where shown
      const d = b.rt.data.dest;
      cx.strokeStyle = C.crimlite; cx.setLineDash([3, 3]); cx.globalAlpha = 0.5 + 0.4 * Math.sin(st.t * 10);
      cx.strokeRect(d.x - b.r - 2, d.y - b.r - 2, (b.r + 2) * 2, (b.r + 2) * 2);
      cx.setLineDash([]); cx.globalAlpha = 1;
    }
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'wall') {
      // the honest curtain: the row it will spawn along, with the gap drawn wide open
      const edge = b.rt.data.edge, gap = b.rt.data.gap, gw = b.rt.pat.gapW / 2;
      cx.strokeStyle = C.tealite; cx.setLineDash([4, 3]); cx.globalAlpha = 0.75;
      cx.beginPath();
      const seg = (a1, a2) => {
        if (a2 <= a1) return;
        if (edge === 0) { cx.moveTo(a1, PIT.AR.y0 + 3); cx.lineTo(a2, PIT.AR.y0 + 3); }
        else if (edge === 1) { cx.moveTo(a1, PIT.AR.y1 - 3); cx.lineTo(a2, PIT.AR.y1 - 3); }
        else if (edge === 2) { cx.moveTo(PIT.AR.x0 + 3, a1); cx.lineTo(PIT.AR.x0 + 3, a2); }
        else { cx.moveTo(PIT.AR.x1 - 3, a1); cx.lineTo(PIT.AR.x1 - 3, a2); }
      };
      if (edge < 2) { seg(PIT.AR.x0, gap - gw); seg(gap + gw, PIT.AR.x1); }
      else { seg(PIT.AR.y0, gap - gw); seg(gap + gw, PIT.AR.y1); }
      cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
    }
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'orbit') {
      // the halo's track: a faint circle at the radius the bullets will ride
      cx.strokeStyle = C.gold; cx.globalAlpha = 0.3 + 0.2 * Math.sin(st.t * 10);
      cx.beginPath(); cx.arc(b.x, b.y, b.rt.pat.radius, 0, Math.PI * 2); cx.stroke();
      cx.globalAlpha = 1;
    }
    // telegraph: charge line — HONEST (owner report: the dashed line promised a huge
    // dash while the boss barely moved). It now draws the EXACT planned path: speed x
    // dur x enrage from the boss's position along the locked aim, clamped to the walls
    // by the same clamp the engine's charge uses, plus a stop marker at the endpoint.
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'charge') {
      const pat = b.rt.pat;
      const enr = st.bossDef.phases[st.boss.phase].enrage ? 1.15 : 1;
      const travel = pat.speed * pat.dur * enr;
      const ex = Math.round(PIT.clamp(b.x + Math.cos(b.rt.data.aim) * travel, PIT.AR.x0 + b.r, PIT.AR.x1 - b.r));
      const ey = Math.round(PIT.clamp(b.y + Math.sin(b.rt.data.aim) * travel, PIT.AR.y0 + b.r, PIT.AR.y1 - b.r));
      cx.strokeStyle = C.crimlite; cx.setLineDash([3, 3]); cx.globalAlpha = 0.7;
      cx.beginPath(); cx.moveTo(b.x, b.y);
      cx.lineTo(ex, ey);
      cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
      // the charge ends here — the boss will be sitting on this square
      px(ex - 2, ey - 2, 4, 4, C.crimdark);
      px(ex - 1, ey - 1, 2, 2, C.crimlite);
    }

    // zones (bile pools)
    for (const z of st.zones) {
      const live = st.t < z.until;
      cx.fillStyle = live ? '#3f7a26' : '#2a3550';
      cx.fillRect(z.x - z.r, z.y - z.r, z.r * 2, z.r * 2);
      cx.fillStyle = live ? '#9ae66e' : C.gray;
      cx.fillRect(z.x - z.r, z.y - z.r, z.r * 2, 1);
    }

    // beams
    for (const beam of st.beams) {
      cx.save();
      cx.translate(beam.x, beam.y); cx.rotate(beam.ang);
      px(0, -beam.w / 2, 400, beam.w, C.crimlite);
      px(0, -beam.w / 2 + 1, 400, beam.w - 2, C.white);
      cx.restore();
    }

    // projectiles — kind-tagged so every signature reads at a glance: phase rings gold,
    // seekers purple, shells + bursts amber, curtains teal, halos gold, ricochets steel
    const KIND_COL = { phase: C.gold, seek: C.purple, shell: C.amber, pop: C.amber, wall: C.tealite, orb: C.gold, clap: C.white, ric: C.gray };
    for (const q of st.proj) px(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2, KIND_COL[q.kind] || C.crimlite);

    // armed signature marks: mines blink amber, pinned reticles hold crimson
    for (const mk of st.marks) {
      const blinkOn = Math.floor(st.t * 8) % 2 === 0;
      if (mk.mine) {
        if (blinkOn) px(mk.x - 2, mk.y - 2, 4, 4, C.amber);
        px(mk.x - mk.r, mk.y - mk.r, mk.r * 2, 1, '#5a4a20');
        px(mk.x - mk.r, mk.y + mk.r, mk.r * 2, 1, '#5a4a20');
      } else {
        cx.strokeStyle = C.crimlite; cx.globalAlpha = blinkOn ? 0.9 : 0.5;
        cx.strokeRect(mk.x - mk.r, mk.y - mk.r, mk.r * 2, mk.r * 2);
        cx.globalAlpha = 1;
      }
    }

    // the vortex: while a pull reads, a ring closes on the runner being dragged
    if ((b.rt.mode === 'tele' || b.rt.mode === 'active') && b.rt.pat && b.rt.pat.type === 'pull') {
      const pr = 14 + 6 * Math.sin(st.t * 6);
      cx.strokeStyle = C.tealite; cx.globalAlpha = 0.55;
      cx.beginPath(); cx.arc(p.x, p.y, pr, 0, Math.PI * 2); cx.stroke();
      cx.globalAlpha = 0.3;
      cx.beginPath(); cx.arc(p.x, p.y, pr + 8, 0, Math.PI * 2); cx.stroke();
      cx.globalAlpha = 1;
    }

    // minions
    for (const m of st.minions) {
      px(m.x - 3, m.y - 3, 6, 6, m.hitFlash > 0 ? C.white : C.crimson);
      px(m.x - 1, m.y - 1, 2, 2, C.crimdark);
    }

    // boss sprite
    drawBoss(b);
    // boss telegraph flash
    if (b.rt.mode === 'tele') {
      cx.globalAlpha = 0.4 + 0.4 * Math.sin(st.t * 20);
      cx.strokeStyle = C.gold; cx.strokeRect(b.x - b.r - 3, b.y - b.r - 3, (b.r + 3) * 2, (b.r + 3) * 2);
      cx.globalAlpha = 1;
    }

    // shield arc
    if (st.shield > 0) {
      cx.strokeStyle = C.gold; cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(p.x + p.mvx * 10 - p.mvy * 9, p.y + p.mvy * 10 + p.mvx * 9);
      cx.lineTo(p.x + p.mvx * 12, p.y + p.mvy * 12);
      cx.lineTo(p.x + p.mvx * 10 + p.mvy * 9, p.y + p.mvy * 10 - p.mvx * 9);
      cx.stroke(); cx.lineWidth = 1;
    }

    // player
    drawPlayer(p);
    // tracers
    for (const tr of st.tracers) {
      cx.strokeStyle = C.tealite; cx.globalAlpha = tr.t / 0.06;
      cx.beginPath(); cx.moveTo(tr.x1, tr.y1); cx.lineTo(tr.x2, tr.y2); cx.stroke();
      cx.globalAlpha = 1;
    }
    // particles
    for (const q of particles) px(q.x - 1, q.y - 1, 2, 2, q.col);

    drawHUD();
  }

  function drawPlayer(p) {
    const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
    const col = p.phase > 0 ? '#7fd7ff' : (blink ? C.white : C.teal);
    px(p.x - 3, p.y - 4, 6, 8, col);
    px(p.x - 3, p.y - 4, 6, 2, C.tealdark);
    px(p.x - 1, p.y - 2, 2, 2, C.void); // visor
    if (p.dashT > 0) { px(p.x - p.dvx * 0.03 - 2, p.y - p.dvy * 0.03 - 2, 4, 4, C.tealite); }
  }

  function drawBoss(b) {
    const flash = b.hitFlash > 0;
    const tint = flash ? C.white : st.bossDef.tint;
    const dark = flash ? C.white : C.crimdark;
    const x = b.x, y = b.y, r = b.r;
    // body per boss id (procedural pixel composites)
    switch (st.bossDef.id) {
      case 'gatekeeper':
        px(x - r, y - r, r * 2, r * 2, tint);
        px(x - r + 2, y - 2, r * 2 - 4, 4, dark);
        px(x - 2, y - 2, 4, 4, flash ? C.crimson : C.gold); break; // eye
      case 'bilespitter':
        px(x - r, y - r + 3, r * 2, r * 2 - 3, tint);
        px(x - r + 2, y - r - 2, r * 2 - 4, 5, dark);
        px(x + r - 3, y - 1, 6, 3, flash ? C.white : '#9ae66e'); break; // nozzle
      case 'surgeon':
        px(x - 3, y - r - 2, 6, r * 2 + 4, tint);
        px(x - r, y - 2, r * 2, 4, dark);
        px(x - r - 3, y - 4, 4, 8, flash ? C.white : C.crimlite);
        px(x + r - 1, y - 4, 4, 8, flash ? C.white : C.crimlite); break; // blade arms
      case 'hive':
        px(x - r, y - 2, r * 2, r, tint);
        px(x - r + 3, y - r, r * 2 - 6, r + 2, flash ? C.white : '#a86f38');
        px(x - 4, y - r + 1, 3, 3, C.gold); px(x + 2, y - r + 3, 3, 3, C.gold); break; // sacs
      case 'gnasher':
        px(x - r + 1, y - r + 2, r * 2 - 2, r * 2 - 2, tint);
        px(x - r - 2, y - 2, 4, 3, dark); px(x + r - 2, y - 2, 4, 3, dark); // jaws
        px(x - 3, y - 3, 2, 2, flash ? C.white : C.void); px(x + 1, y - 3, 2, 2, flash ? C.white : C.void); break; // eyes
      case 'cindermite':
        px(x - r, y - r + 4, r * 2, r * 2 - 4, tint);
        px(x - r + 2, y - r, r * 2 - 4, 4, dark);
        px(x - 5, y + 2, 4, 4, flash ? C.white : '#e07a2c'); px(x + 2, y - 1, 3, 3, flash ? C.white : '#e07a2c'); break; // ash vents
      case 'thresher':
        px(x - r + 2, y - r, r * 2 - 4, r * 2, tint);
        px(x - r - 3, y - 1, 5, 2, flash ? C.white : C.tealite); px(x + r - 2, y - 1, 5, 2, flash ? C.white : C.tealite); // chain tips
        px(x - 2, y - r + 2, 4, 4, flash ? C.white : C.void); break;
      case 'paleherald':
        px(x - 2, y - r - 2, 4, r * 2 + 4, tint); // herald standard
        px(x - r + 1, y - 3, r * 2 - 2, 6, tint);
        px(x - r, y - 1, r, 2, flash ? C.white : C.gold); px(x, y - 1, r, 2, flash ? C.white : C.gold); break;
      case 'gloamwarden':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - 2, r * 2 - 4, 3, dark);
        px(x - r + 1, y - r + 1, 3, 3, flash ? C.white : C.tealite); px(x + r - 4, y - r + 1, 3, 3, flash ? C.white : C.tealite); break; // vault lamps
      case 'carrionlaw':
        px(x - r, y - r, r * 2, r * 2, tint);
        px(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, dark);
        px(x - 1, y - r - 3, 2, 4, C.gold); // gavel spike
        px(x - 3, y + 1, 6, 2, flash ? C.white : C.void); break;
      case 'ironchoir':
        px(x - r + 1, y - r, r * 2 - 2, r * 2, tint);
        px(x - r - 1, y - r + 3, 2, r * 2 - 6, flash ? C.white : C.gray);
        px(x + r - 1, y - r + 3, 2, r * 2 - 6, flash ? C.white : C.gray); // organ pipes
        px(x - 2, y - 2, 4, 4, flash ? C.white : C.gold); break;
      case 'dredgewarden':
        px(x - r + 1, y - r, r * 2 - 2, r * 2, tint);
        px(x - r - 2, y - 3, 4, 2, flash ? C.white : C.tealite); px(x + r - 2, y - 3, 4, 2, flash ? C.white : C.tealite); // claw arms
        px(x - r + 2, y + 2, r * 2 - 4, 2, dark); // dredge bar
        px(x - 4, y - r + 1, 3, 3, flash ? C.white : C.void); px(x + 1, y - r + 1, 3, 3, flash ? C.white : C.void); break; // eyes
      case 'fathom':
        px(x - r + 3, y - r, r * 2 - 6, r * 2, tint);
        px(x - r, y - 2, r * 2, 4, dark);
        px(x - 4, y - r + 2, 3, 3, C.tealite); px(x + 2, y - r + 4, 3, 3, C.tealite); px(x - 1, y + 2, 3, 3, C.tealite); break; // deep eyes
      case 'gravewake':
        px(x - r, y - r + 1, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - r - 2, 4, 4, dark); px(x + r - 6, y - r - 2, 4, 4, dark); // split crown
        px(x - 4, y, 8, 3, flash ? C.white : C.void); px(x - 2, y - 4, 4, 2, flash ? C.white : C.crimlite); break;
      case 'theauditor':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - 2, r * 2 - 4, 3, dark); // ledger lines
        px(x - 1, y - r - 4, 2, 5, flash ? C.white : C.gold); // quill spike
        px(x - 3, y - r + 1, 6, 2, flash ? C.white : C.gold); // stamp bar
        px(x - 2, y - 1, 4, 3, flash ? C.white : C.void); break; // seal eye
      case 'tollmaster':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - 1, r * 2 - 4, 4, dark); // coin slot belt
        px(x - 4, y - r + 1, 8, 3, flash ? C.white : C.gold); px(x - 2, y - r - 3, 4, 3, flash ? C.white : C.gold); // toll standard
        px(x - 2, y - 1, 4, 3, flash ? C.white : C.void); break; // slot eye
      case 'brassherald':
        px(x - r + 1, y - r + 2, r * 2 - 2, r * 2 - 2, tint);
        px(x + r - 2, y - 4, 6, 8, flash ? C.white : C.gold); // flared horn bell
        px(x + r - 6, y - 2, 4, 4, dark);
        px(x - 4, y - r + 1, 3, 3, flash ? C.white : C.void); px(x + 1, y - r + 1, 3, 3, flash ? C.white : C.void); break; // eyes
      case 'cindermaw':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 3, y - r - 3, 3, 5, dark); px(x + r - 6, y - r - 3, 3, 5, dark); // chimney stacks
        px(x - r + 2, y - 1, r * 2 - 4, 5, flash ? C.white : C.void); // the maw
        px(x - r + 3, y, 2, 3, flash ? C.white : '#ffcc66'); px(x + r - 5, y, 2, 3, flash ? C.white : '#ffcc66'); px(x - 1, y, 2, 3, flash ? C.white : '#ffcc66'); break; // furnace teeth
      case 'theloom':
        px(x - r + 2, y - r, r * 2 - 4, r * 2, tint); // loom frame
        px(x - 1, y - r - 3, 2, r * 2 + 6, flash ? C.white : C.gold); // the thread
        px(x - r, y - 3, r * 2, 2, dark); px(x - r, y + 3, r * 2, 2, dark); // weave bars
        px(x - 3, y - 1, 6, 3, flash ? C.white : C.void); break;
      case 'maelstrom':
        px(x - r, y - r, r * 2, r * 2, tint);
        px(x - r + 2, y - 1, r * 2 - 4, 2, dark); px(x - 1, y - r + 2, 2, r * 2 - 4, dark); // vortex cross
        px(x - 2, y - 2, 4, 4, flash ? C.white : C.tealite); px(x + r - 3, y - r + 1, 3, 3, flash ? C.white : C.tealite); px(x - r, y + r - 4, 3, 3, flash ? C.white : C.tealite); break; // the eye + swirl arms
      case 'goreprelate':
        px(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 2, tint); // the robe
        px(x - 2, y - r - 4, 4, 6, flash ? C.white : C.gold); // mitre
        px(x - r, y - 2, r * 2, 3, dark); // stole
        px(x - 3, y - 1, 6, 3, flash ? C.white : C.void); px(x - 1, y, 2, 2, C.crimson); break; // hood shadow
      case 'theglutton':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - 2, r * 2 - 4, 6, flash ? C.white : C.void); // the maw
        px(x - r + 3, y - 1, 2, 3, C.gold); px(x - 1, y - 1, 2, 3, C.gold); px(x + r - 5, y - 1, 2, 3, C.gold); break; // teeth
      case 'ledger':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - 3, r * 2 - 4, 2, dark); px(x - r + 2, y + 1, r * 2 - 4, 2, dark); // ledger lines
        px(x - 1, y - r - 4, 2, 5, flash ? C.white : C.gold); // quill spike
        px(x - 2, y - 1, 4, 3, flash ? C.white : C.void); break; // seal eye
      case 'hollowregent':
        px(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 2, tint); // the hollow frame
        px(x - r + 2, y - r - 3, 3, 4, C.gold); px(x + r - 5, y - r - 3, 3, 4, C.gold); px(x - 2, y - r - 4, 4, 5, C.gold); // broken crown
        px(x - 4, y - 2, 8, 5, flash ? C.white : C.void); // the hollow
        px(x - 2, y - 1, 2, 2, C.crimson); px(x + 1, y - 1, 2, 2, C.crimson); break; // pinprick eyes
      case 'pressuresaint':
        px(x - r + 3, y - r + 2, r * 2 - 6, r * 2 - 2, tint);
        px(x - 3, y - r - 3, 6, 2, flash ? C.white : C.gold); // the halo
        px(x - r + 3, y - 2, r * 2 - 6, 3, dark);
        px(x - 2, y - 3, 4, 3, flash ? C.white : C.void); px(x - 1, y + 1, 2, 2, C.tealite); break; // praying eye + spark
      case 'marshal':
        px(x - r + 1, y - r + 2, r * 2 - 2, r * 2 - 2, tint);
        px(x - r - 2, y - r + 1, 4, 5, dark); px(x + r - 2, y - r + 1, 4, 5, dark); // pauldrons
        px(x + r - 1, y - 1, 6, 2, flash ? C.white : C.gray); // the axe shaft
        px(x - 3, y - 2, 6, 3, flash ? C.white : C.void); px(x - 2, y - 1, 2, 2, C.crimson); break; // visor
      case 'paleleviathan':
        px(x - r, y - r + 3, r * 2, r * 2 - 4, tint);
        px(x - r - 2, y - 3, 4, 5, flash ? C.white : C.tealite); px(x + r - 2, y - 3, 4, 5, flash ? C.white : C.tealite); // fins
        px(x - r + 2, y - r, r * 2 - 4, 3, flash ? C.white : C.white); // the pale spine
        px(x - 4, y, 8, 3, flash ? C.white : C.void); px(x - 2, y - 4, 2, 2, C.crimson); px(x + 1, y - 4, 2, 2, C.crimson); break; // the drowned maw
      case 'oldwater':
        px(x - r, y - r + 1, r * 2, r * 2 - 2, tint);
        px(x - r, y - r - 2, r * 2, 3, flash ? C.white : C.white); // the pale crest
        px(x - r + 2, y - 2, r * 2 - 4, 4, flash ? C.white : C.void); // the hollow
        px(x - 4, y - 1, 2, 2, C.tealite); px(x + 2, y - 1, 2, 2, C.tealite); px(x - r + 3, y + 2, 3, 2, C.tealite); px(x + r - 6, y + 2, 3, 2, C.tealite); break; // drowned eyes
      case 'tideunbound':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r, y - r - 1, r * 2, 3, flash ? C.white : C.white); // the crest
        px(x - r + 3, y - r + 3, 4, 3, C.gold); px(x + r - 7, y - r + 3, 4, 3, C.gold); px(x - 2, y - r + 4, 4, 3, C.gold); // tide crown
        px(x - 5, y - 2, 10, 5, flash ? C.white : C.crimdark);
        px(x - 3, y - 1, 2, 2, C.crimson); px(x + 1, y - 1, 2, 2, C.crimson); break;
      case 'nullsovereign':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 1, y - r - 3, 3, 5, C.gold); px(x + r - 4, y - r - 3, 3, 5, C.gold); px(x - 2, y - r - 4, 4, 6, C.gold); // triple crown
        px(x - 6, y - 3, 12, 5, flash ? C.white : C.void);
        px(x - 4, y - 2, 2, 2, C.crimson); px(x + 2, y - 2, 2, 2, C.crimson); break;
      case 'mossback':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - r - 2, 4, 4, dark); px(x + r - 6, y - r - 1, 5, 3, dark); px(x - 1, y - r - 3, 3, 3, dark); // moss growths
        px(x - r + 2, y + 1, r * 2 - 4, 3, dark); // algae skirt
        px(x - 4, y - 2, 3, 3, flash ? C.white : C.void); px(x + 2, y - 2, 3, 3, flash ? C.white : C.void); break; // sleepy eyes
      case 'ballast':
        px(x - r + 1, y - r + 3, r * 2 - 2, r * 2 - 3, tint);
        px(x - 3, y - r - 4, 6, 7, dark); // shackle ring
        px(x - r - 2, y - 2, 3, 8, dark); px(x + r - 1, y - 2, 3, 8, dark); // flukes
        px(x - 4, y - 1, 8, 3, flash ? C.white : C.void); px(x - 2, y, 2, 2, C.tealite); break; // drowned port
      case 'minter':
        px(x - r + 1, y - r + 2, r * 2 - 2, r * 2 - 2, tint);
        px(x - r + 3, y + 1, 6, 3, flash ? C.white : C.gold); px(x + r - 9, y + 1, 6, 3, flash ? C.white : C.gold); // coin stacks
        px(x - 2, y - r - 4, 4, 6, flash ? C.white : C.gold); // mint press
        px(x - 3, y - 2, 6, 3, flash ? C.white : C.void); break; // die slot
      case 'exchequer':
        px(x - r, y - r + 1, r * 2, r * 2 - 1, tint);
        px(x - r + 2, y - r - 3, 4, 4, dark); px(x + r - 6, y - r - 3, 4, 4, dark); // hinges
        px(x - 5, y - 3, 10, 8, dark); // vault door
        px(x - 2, y - 1, 4, 4, flash ? C.white : C.gold); break; // the dial
      case 'puppeteer':
        px(x - r - 1, y - r - 2, r * 2 + 2, 3, dark); // control bar
        px(x - 4, y - r + 1, 2, 6, flash ? C.white : C.gold); px(x + 2, y - r + 1, 2, 6, flash ? C.white : C.gold); // strings
        px(x - r + 2, y - 3, r * 2 - 4, 8, tint); // hanging body
        px(x - 3, y - 1, 3, 3, flash ? C.white : C.void); px(x + 1, y - 1, 3, 3, flash ? C.white : C.void); break; // joint eyes
      case 'lanternmaw':
        px(x - r, y - r + 3, r * 2, r * 2 - 3, tint);
        px(x - 1, y - r - 4, 2, 7, dark); px(x - 3, y - r - 6, 5, 3, flash ? C.white : C.gold); // lure stalk + bulb
        px(x - r + 2, y + 1, r * 2 - 4, 4, flash ? C.white : C.void); // the maw
        px(x - r + 3, y + 2, 2, 2, C.gold); px(x - 1, y + 2, 2, 2, C.gold); px(x + r - 5, y + 2, 2, 2, C.gold); break; // teeth
      case 'undertow':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r, y - r - 2, r * 2, 3, flash ? C.white : C.tealite); // the crest
        px(x - r + 2, y - 1, r * 2 - 4, 2, dark); px(x - r + 4, y + 3, r * 2 - 8, 2, dark); // pull currents
        px(x - 2, y - 2, 4, 4, flash ? C.white : C.void); break;
      case 'gorget':
        px(x - r + 1, y - r + 2, r * 2 - 2, r * 2 - 2, tint);
        px(x - r, y - 4, r * 2, 3, dark); px(x - r, y + 2, r * 2, 3, dark); // collar plates
        px(x - r - 2, y - r + 1, 3, 5, flash ? C.white : C.gold); px(x + r - 1, y - r + 1, 3, 5, flash ? C.white : C.gold); // gorget wings
        px(x - 3, y - 2, 6, 3, flash ? C.white : C.void); break; // visor slit
      case 'vesper':
        px(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 2, tint); // the bell robe
        px(x - 4, y - r - 4, 8, 2, flash ? C.white : C.gold); px(x - 2, y - r - 2, 4, 2, flash ? C.white : C.gold); // halo
        px(x - r + 2, y - 2, r * 2 - 4, 2, dark);
        px(x - 3, y - 1, 3, 3, flash ? C.white : C.void); px(x + 1, y - 1, 3, 3, flash ? C.white : C.void); break; // choir eyes
      case 'archive':
        px(x - r, y - r + 1, r * 2, r * 2 - 1, tint);
        px(x - r + 2, y - r + 3, r * 2 - 4, 2, dark); px(x - r + 2, y - 1, r * 2 - 4, 2, dark); px(x - r + 2, y + 3, r * 2 - 4, 2, dark); // shelves
        px(x - 4, y - r - 3, 3, 4, flash ? C.white : C.gold); px(x + 2, y - r - 3, 3, 4, flash ? C.white : C.gold); // candle tablets
        px(x - 2, y - 4, 4, 3, flash ? C.white : C.void); break; // record eye
      case 'lastshore':
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r, y - r - 2, r * 2, 3, flash ? C.white : C.white); // the last wave
        px(x - r + 2, y + 1, r * 2 - 4, 3, flash ? C.white : C.void); // the sand hollow
        px(x - 5, y - 3, 3, 3, C.tealite); px(x + 3, y - 2, 3, 3, C.tealite); px(x - 1, y - 5, 2, 2, C.tealite); break; // drift bones
      default: // deathwarrant
        px(x - r, y - r + 2, r * 2, r * 2 - 2, tint);
        px(x - r + 2, y - r - 3, 3, 5, C.gold); px(x + r - 5, y - r - 3, 3, 5, C.gold); // crown
        px(x - 5, y - 3, 10, 5, flash ? C.white : C.crimlite);
        px(x - 2, y - 2, 4, 3, C.void); break;
    }
  }

  function drawHUD() {
    const p = st.player, b = st.boss;
    px(0, 0, PIT.W, PIT.HUD, C.deep);
    px(0, PIT.HUD - 1, PIT.W, 1, C.wall);
    cx.font = '7px monospace';
    cx.textBaseline = 'top';
    // row 1: hearts | boss name over its bar | run timer
    for (let i = 0; i < p.maxHearts; i++) {
      const on = i < p.hearts;
      px(6 + i * 10, 3, 7, 7, on ? C.crimson : '#20283e');
      px(7 + i * 10, 2, 5, 2, on ? C.crimson : '#20283e');
      px(8 + i * 10, 5, 1, 1, on ? C.crimlite : '#20283e');
    }
    cx.textAlign = 'center';
    cx.fillStyle = C.white;
    cx.fillText(st.bossDef.name, PIT.W / 2, 2);
    const bw = 110, bx = Math.round((PIT.W - bw) / 2);
    px(bx, 10, bw, 6, '#20283e');
    px(bx, 10, Math.round(bw * Math.max(0, b.hp / b.maxHp)), 6, C.crimson);
    for (let i = 1; i < st.bossDef.phases.length; i++) {
      const fx = bx + Math.round(bw * st.bossDef.phases[i].until);
      px(fx, 9, 1, 8, C.gold);
    }
    const mn = Math.floor(st.t / 60), sc = Math.floor(st.t % 60);
    cx.textAlign = 'right';
    cx.fillStyle = C.gray;
    cx.fillText(mn + ':' + String(sc).padStart(2, '0'), PIT.W - 6, 2);
    // row 2: dash + ability bars left, phase/hits right
    const dashReady = p.dashCd <= 0;
    cx.textAlign = 'left';
    cx.fillStyle = C.gray;
    cx.fillText('DASH', 6, 17);
    px(28, 18, 22, 3, '#20283e');
    px(28, 18, Math.round(22 * (1 - p.dashCd / st.char.dashCd)), 3, dashReady ? C.tealite : C.teal);
    const abReady = p.abCd <= 0;
    cx.fillStyle = abReady ? C.gold : C.gray;
    cx.fillText(st.char.abName, 56, 17);
    const abx = 56 + st.char.abName.length * 4.6 + 4; // clear the longest label (OVERCHARGE)
    px(abx, 18, 26, 3, '#20283e');
    px(abx, 18, Math.round(26 * (1 - p.abCd / st.char.abCd)), 3, abReady ? C.gold : C.amber);
    cx.textAlign = 'right';
    cx.fillStyle = st.bossDef.phases[st.boss.phase].enrage ? C.crimlite : C.gray;
    cx.fillText(`PHASE ${st.boss.phase + 1}/${st.bossDef.phases.length}${st.bossDef.phases[st.boss.phase].enrage ? ' — ANGRY' : ''} · HITS ${st.hitsTaken}`, PIT.W - 6, 17);
    cx.textAlign = 'left';
  }

  // ================= boot =================
  document.body.classList.toggle('no-crt', !SAVE.crt);
  $('#btn-play').onclick = () => { PIT_SFX.sfx('click'); startRanked(); };
  renderHub();
  window.__PIT = { get state() { return st; }, PIT, get save() { return SAVE; } };
})();
