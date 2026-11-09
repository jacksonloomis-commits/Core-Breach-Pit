// CORE BREACH: PIT — browser UI, game loop, renderer, hub, saves.
(function () {
  'use strict';
  const BUILD = '2026.11.10';
  const UPDATE_LOG = [
    { version: '2026.11.10', tag: 'PIT OPEN BETA', items: [
      'Compact beta: 5 arenas (Bronze to Champion), 5 Crimson Tide bosses with telegraphed attack patterns',
      '3 playable operatives: VOLT (starter), GHOST (clear Arena II), BULWARK (clear Arena IV)',
      'Real-time dodge combat: WASD move, Space dash with i-frames, E ability, auto-fire hitscan',
      'Star ratings per arena (3 = flawless), pure progression unlocks, CRT filter + synth SFX'
    ] }
  ];

  const PIT = window.PIT, PAL = window.PIT_PAL, CHARS = window.PIT_CHARS, BOSSES = window.PIT_BOSSES;
  const C = PAL.C;
  const $ = (s) => document.querySelector(s);
  const el = (t, cls, html) => { const e = document.createElement(t); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

  // ================= save =================
  const SKEY = 'cbp-save-v1';
  function defaultSave() {
    return { cleared: [false, false, false, false, false], stars: [0, 0, 0, 0, 0], unlockedArenas: 1, chars: ['volt'], char: 'volt', crt: true, sfx: true, runs: 0, wins: 0 };
  }
  let SAVE = load();
  function load() { try { return { ...defaultSave(), ...JSON.parse(localStorage.getItem(SKEY)) }; } catch { return defaultSave(); } }
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(SAVE)); } catch {} }

  if (window.PIT_SFX) window.PIT_SFX.setEnabled(SAVE.sfx);

  // ================= screens =================
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== 'screen-' + id);
    if (id === 'hub') renderHub();
  }

  function renderHub() {
    // arena grid
    const grid = $('#arena-grid'); grid.innerHTML = '';
    BOSSES.ARENAS.forEach((a, i) => {
      const boss = BOSSES.LIST.find(b => b.id === a.boss);
      const open = i < SAVE.unlockedArenas;
      const d = el('button', 'arena-card' + (open ? '' : ' locked') + (SAVE.cleared[i] ? ' cleared' : ''));
      const stars = '★'.repeat(SAVE.stars[i]) + '☆'.repeat(3 - SAVE.stars[i]);
      d.innerHTML = `
        <div class="ac-tier">${a.tier}</div>
        <div class="ac-name">${open ? a.name : 'ARENA ' + (i + 1)}</div>
        <div class="ac-boss">${open ? boss.name : 'LOCKED'}</div>
        <div class="ac-stars">${open ? stars : '— — —'}</div>
        <div class="ac-sub">${open ? (SAVE.cleared[i] ? 'CLEARED' : 'OPEN') : 'clear Arena ' + i + ' to unlock'}</div>`;
      if (open) d.onclick = () => { PIT_SFX.sfx('click'); startFight(i); };
      grid.appendChild(d);
    });

    // character row
    const row = $('#char-row'); row.innerHTML = '';
    CHARS.LIST.forEach(c => {
      const owned = SAVE.chars.includes(c.id);
      const d = el('button', 'char-card' + (owned ? '' : ' locked') + (SAVE.char === c.id ? ' picked' : ''));
      d.innerHTML = owned ? `
        <div class="cc-name" style="color:${c.tint}">${c.name}</div>
        <div class="cc-role">${c.role}</div>
        <div class="cc-ab">${c.abName} — ${c.abBlurb}</div>
        <div class="cc-stats">${'♥'.repeat(c.hearts)} · SPD ${c.speed} · DASH ${c.dashCd}s</div>`
        : `<div class="cc-name">???</div><div class="cc-role">LOCKED</div><div class="cc-ab">${c.blurb}</div>`;
      if (owned) d.onclick = () => { SAVE.char = c.id; persist(); PIT_SFX.sfx('click'); renderHub(); };
      row.appendChild(d);
    });

    $('#hub-stats').textContent = `RUNS ${SAVE.runs} · KILLS ${SAVE.wins} · STARS ${SAVE.stars.reduce((a, b) => a + b, 0)}/${BOSSES.ARENAS.length * 3}`;
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
  let st = null, acc = 0, last = 0, running = false, paused = false, overT = 0;
  const keys = {};
  let particles = [];

  function startFight(arenaIndex) {
    st = PIT.createRun({ arenaIndex, charId: SAVE.char, seed: (Date.now() & 0xffffff) >>> 0 });
    particles = []; acc = 0; overT = 0; paused = false;
    SAVE.runs++; persist();
    show('fight');
    $('#fight-title').textContent = `${st.arena.name} — ${st.bossDef.name}`;
    running = true; last = performance.now();
    requestAnimationFrame(loop);
  }

  function endFight() {
    running = false;
    const win = st.over === 'win';
    const stars = win ? PIT.computeStars(st.hitsTaken) : 0;
    let banners = [];
    if (win) {
      SAVE.wins++;
      const res = PIT.applyResult(SAVE, st.arenaIndex, stars);
      persist();
      if (res.arenaUnlocked != null) banners.push(`ARENA ${res.arenaUnlocked + 1} UNLOCKED`);
      res.newChars.forEach(id => {
        const c = CHARS.LIST.find(x => x.id === id);
        banners.push(`OPERATIVE UNLOCKED: ${c.name} — ${c.abName}`);
      });
    } else persist();
    showResult(win, stars, banners);
  }

  function showResult(win, stars, banners) {
    const box = $('#result');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h2', win ? 'gold' : 'crimson', win ? 'ARENA CLEARED' : 'FLATLINED'));
    if (win) {
      const s = el('div', 'result-stars');
      for (let i = 0; i < 3; i++) {
        const star = el('span', 'rstar' + (i < stars ? ' on' : ''), '★');
        s.appendChild(star);
        setTimeout(() => { star.classList.add('pop'); PIT_SFX.sfx('star'); }, 350 + i * 380);
      }
      box.appendChild(s);
      box.appendChild(el('p', 'result-sub', st.hitsTaken === 0 ? 'FLAWLESS — no hits taken' : `hits taken: ${st.hitsTaken}`));
    } else {
      box.appendChild(el('p', 'result-sub', `The Tide keeps the Pit. Boss HP was ${Math.max(0, Math.round(100 * st.boss.hp / st.boss.maxHp))}% left.`));
    }
    banners.forEach(b => box.appendChild(el('div', 'banner', b)));
    const row = el('div', 'result-btns');
    const retry = el('button', 'btn', 'RETRY'); retry.onclick = () => { PIT_SFX.sfx('click'); box.hidden = true; startFight(st.arenaIndex); };
    row.appendChild(retry);
    if (win && st.arenaIndex + 1 < BOSSES.ARENAS.length) {
      const next = el('button', 'btn gold', 'NEXT ARENA'); next.onclick = () => { PIT_SFX.sfx('click'); box.hidden = true; startFight(st.arenaIndex + 1); };
      row.appendChild(next);
    }
    const hub = el('button', 'btn ghost', 'HUB'); hub.onclick = () => { PIT_SFX.sfx('click'); box.hidden = true; show('hub'); };
    row.appendChild(hub);
    box.appendChild(row);
  }

  // ---- input
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if (!running || paused || !st || st.over) return;
    if (e.key === ' ' || e.key === 'Shift') queueDash = true;
    if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'q') queueAb = true;
    if (e.key === 'p' || e.key === 'Escape') togglePause();
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
  $('#btn-quit').onclick = () => { paused = false; $('#pause-ov').hidden = true; running = false; show('hub'); };

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
      if (ev.type === 'phase') burst(st.boss.x, st.boss.y, C.crimson, 24);
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

    // telegraphs: zone spot outlines
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'zone') {
      cx.strokeStyle = '#9ae66e'; cx.lineWidth = 1;
      const pulse = 0.5 + 0.5 * Math.sin(st.t * 12);
      for (const s of b.rt.data.spots) {
        cx.globalAlpha = 0.3 + 0.5 * pulse;
        cx.strokeRect(s.x - b.rt.pat.r, s.y - b.rt.pat.r, b.rt.pat.r * 2, b.rt.pat.r * 2);
      }
      cx.globalAlpha = 1;
    }
    // telegraph: charge line
    if (b.rt.mode === 'tele' && b.rt.pat && b.rt.pat.type === 'charge') {
      cx.strokeStyle = C.crimlite; cx.setLineDash([3, 3]); cx.globalAlpha = 0.7;
      cx.beginPath(); cx.moveTo(b.x, b.y);
      cx.lineTo(b.x + Math.cos(b.rt.data.aim) * 400, b.y + Math.sin(b.rt.data.aim) * 400);
      cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
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

    // projectiles
    for (const q of st.proj) px(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2, C.crimlite);

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
    // hearts
    for (let i = 0; i < p.maxHearts; i++) {
      const on = i < p.hearts;
      px(8 + i * 10, 6, 7, 7, on ? C.crimson : '#20283e');
      px(9 + i * 10, 5, 5, 2, on ? C.crimson : '#20283e');
      px(10 + i * 10, 8, 1, 1, on ? C.crimlite : '#20283e');
    }
    // dash pips + ability bar
    const dashReady = p.dashCd <= 0;
    px(70, 6, 30, 3, '#20283e');
    px(70, 6, Math.round(30 * (1 - p.dashCd / st.char.dashCd)), 3, dashReady ? C.tealite : C.teal);
    cx.font = '7px monospace'; cx.textBaseline = 'top';
    cx.fillStyle = C.gray; cx.fillText('DASH', 70, 11);
    const abReady = p.abCd <= 0;
    px(106, 6, 40, 3, '#20283e');
    px(106, 6, Math.round(40 * (1 - p.abCd / st.char.abCd)), 3, abReady ? C.gold : C.amber);
    cx.fillStyle = abReady ? C.gold : C.gray;
    cx.fillText(st.char.abName, 106, 11);
    // boss bar
    const bw = 120, bx = (PIT.W - bw) / 2;
    px(bx, 5, bw, 6, '#20283e');
    px(bx, 5, Math.round(bw * Math.max(0, b.hp / b.maxHp)), 6, C.crimson);
    for (let i = 1; i < st.bossDef.phases.length; i++) {
      const fx = bx + Math.round(bw * st.bossDef.phases[i].until);
      px(fx, 4, 1, 8, C.gold);
    }
    cx.fillStyle = C.white; cx.textAlign = 'center';
    cx.fillText(`${st.bossDef.name}`, PIT.W / 2, 12);
    cx.textAlign = 'left';
    // right side info
    cx.fillStyle = C.gray; cx.textAlign = 'right';
    cx.fillText(`${st.arena.name} · ${Math.floor(st.t)}s · HITS ${st.hitsTaken}`, PIT.W - 8, 6);
    cx.fillStyle = st.bossDef.phases[st.boss.phase].enrage ? C.crimlite : C.gray;
    cx.fillText(`PHASE ${st.boss.phase + 1}/${st.bossDef.phases.length}`, PIT.W - 8, 13);
    cx.textAlign = 'left';
  }

  // ================= boot =================
  document.body.classList.toggle('no-crt', !SAVE.crt);
  $('#btn-play').onclick = () => { PIT_SFX.sfx('click'); startFight(firstOpenArena()); };
  function firstOpenArena() {
    for (let i = BOSSES.ARENAS.length - 1; i >= 0; i--) if (SAVE.cleared[i]) return Math.min(i + 1, BOSSES.ARENAS.length - 1);
    return 0;
  }
  renderHub();
  window.__PIT = { get state() { return st; }, PIT };
})();
