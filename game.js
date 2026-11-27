/* ==================================================================
   VILNIUS QUEST – JÁTÉKMOTOR
   Képernyők: start → karakterválasztó → világtérkép → pálya (napok)
   → finálé. A tartalom a trip-data.js-ben van.

   URL-paraméterek tesztelésre:
     ?all    – minden világ és állomás nyitva
     ?reset  – haladás törlése
   ================================================================== */

(() => {
  'use strict';

  // ===== Segédek ====================================================
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const days = TRIP.days;
  const params = new URLSearchParams(location.search);
  const UNLOCK_ALL = params.has('all');
  const SAVE_KEY = 'vilnius-quest-v1';
  if (params.has('reset')) localStorage.removeItem(SAVE_KEY);

  // ===== Mentés =====================================================
  const state = Object.assign(
    {
      visited: {}, items: [], achievements: [], factsSeen: 0, muted: false, character: null, mapPos: 0, accepted: false,
      fish: 0, fishGot: {}, games: {}, tutorial: false,
    },
    (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })()
  );
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* privát mód */ } };

  const visitedCount = d => state.visited[d.id] || 0;
  const dayDone = d => visitedCount(d) >= d.stops.length;
  const dayUnlocked = i => UNLOCK_ALL || i === 0 || dayDone(days[i - 1]);
  const allDone = () => days.every(dayDone);
  const totalLoot = days.reduce((n, d) => n + d.stops.filter(s => s.loot).length, 0);

  // ===== Hang (8-bites csipogás, WebAudio) ===========================
  let ac = null;
  function tone(freq, dur = 0.08, type = 'square', vol = 0.05, slideTo) {
    if (state.muted) return;
    try {
      if (!ac && navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // még nem kattintott
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* nincs hang */ }
  }
  const seq = (notes, gap, dur = 0.1) => notes.forEach((f, i) => setTimeout(() => tone(f, dur), i * gap));
  const sfx = {
    hop: () => tone(520, 0.07, 'square', 0.035, 780),
    blip: () => tone(880, 0.05),
    deny: () => tone(220, 0.16, 'square', 0.05, 110),
    collect: () => seq([660, 880, 1320], 70, 0.09),
    fanfare: () => seq([523, 659, 784, 1047], 120, 0.16),
    meow: () => { tone(650, 0.12, 'sawtooth', 0.035, 1100); setTimeout(() => tone(1100, 0.26, 'sawtooth', 0.03, 480), 110); },
    vroom: () => tone(80, 0.6, 'sawtooth', 0.05, 240),
  };

  // ===== Achievementek ==============================================
  const ACH = [
    { id: 'first', icon: '🐾', name: 'Első lépés', desc: 'Megmozdult a macska.' },
    ...days.map(d => ({ id: 'day-' + d.id, ...d.achievement })),
    { id: 'facts10', icon: '🧠', name: 'Baltikum-professzor', desc: '10 érdekességet elolvastál.' },
    { id: 'wink', icon: '😉', name: 'Kacsintás', desc: 'Az MX-5 rád kacsintott.' },
    { id: 'mute', icon: '🔇', name: 'Csendes macska', desc: 'Lenémítottad a nyávogást.' },
    { id: 'fishday', icon: '🐟', name: 'Halász macska', desc: 'Egy nap összes halát összeszedted.' },
    { id: 'hit', icon: '💥', name: 'Vadveszély', desc: 'Összefutottál egy helyi lakossal.' },
    { id: 'minimaster', icon: '🕹️', name: 'Minijáték-mester', desc: 'Minden minijátékot megnyertél.' },
    { id: 'stubborn', icon: '🙅', name: 'Hiába menekülsz', desc: 'Ötször próbáltad megnyomni a NEM-et.' },
    { id: 'accepted', icon: '❤️', name: 'Küldetés elfogadva', desc: 'Irány Vilnius!' },
  ];

  function unlock(id) {
    if (state.achievements.includes(id)) return;
    const a = ACH.find(x => x.id === id);
    if (!a) return;
    state.achievements.push(id);
    save();
    toast(`${a.icon} <b>ACHIEVEMENT:</b> ${esc(a.name)}`, 'ach');
    sfx.fanfare();
  }

  // ===== Érdekességek ===============================================
  let factBag = [];
  function nextFact() {
    if (!factBag.length) factBag = [...TRIP.facts].sort(() => Math.random() - 0.5);
    return factBag.pop();
  }
  function countFact() {
    state.factsSeen++;
    save();
    if (state.factsSeen >= 10) unlock('facts10');
  }

  // ===== UI-alapok ==================================================
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    $('#hud').classList.toggle('hidden', id === 'screen-start' || id === 'screen-select' || id === 'screen-teaser');
    if (id !== 'screen-scene') { $('#btn-map').classList.toggle('hidden', id !== 'screen-final'); stopRoam(); }
    updateHud();
  }

  function toast(html, cls = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + cls;
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2700);
    setTimeout(() => t.remove(), 3200);
  }

  function banner(small, big) {
    const el = $('#intro');
    el.innerHTML = `<small>${esc(small)}</small><b>${esc(big)}</b>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function rain(n = 40) {
    const box = $('#rain');
    const makers = [
      () => { const i = new Image(); i.src = SPRITES.url('catA', 3); return i; },
      () => { const i = new Image(); i.src = SPRITES.url('mx5', 2); return i; },
      ...['🌸', '🥟', '🍣', '⭐', '💛', '💚', '❤️'].map(e => () => { const s = document.createElement('span'); s.textContent = e; return s; }),
    ];
    for (let i = 0; i < n; i++) {
      const el = pick(makers)();
      el.className = 'drop';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDuration = 2.4 + Math.random() * 2.6 + 's';
      el.style.animationDelay = Math.random() * 1.2 + 's';
      el.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      box.appendChild(el);
      setTimeout(() => el.remove(), 6500);
    }
  }

  // ----- Modál -----
  const modal = $('#modal');
  let modalOnClose = null;
  let typer = null;
  const modalOpen = () => !modal.classList.contains('hidden');

  function openModal(html, buttons = [{ label: 'BEZÁR', primary: true }], onClose = null) {
    $('#modal-content').innerHTML = html;
    const bar = $('#modal-actions');
    bar.innerHTML = '';
    buttons.forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn px' + (b.primary ? '' : ' ghost');
      el.textContent = b.label;
      el.onclick = b.onClick || closeModal;
      bar.appendChild(el);
    });
    modalOnClose = onClose;
    modal.classList.remove('hidden');
    sfx.blip();
    setTimeout(() => bar.querySelector('.btn')?.focus({ preventScroll: true }), 60);
  }

  function closeModal() {
    if (!modalOpen()) return;
    modal.classList.add('hidden');
    clearInterval(typer);
    const cb = modalOnClose;
    modalOnClose = null;
    if (cb) cb();
  }
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function typeText(el) {
    if (!el) return;
    const full = el.textContent;
    let i = 0;
    el.textContent = '';
    clearInterval(typer);
    typer = setInterval(() => {
      i += 2;
      el.textContent = full.slice(0, i);
      if (i >= full.length) clearInterval(typer);
    }, 18);
    el.onclick = () => { clearInterval(typer); el.textContent = full; };
  }

  // ----- HUD -----
  function updateHud() {
    $('#hud-items').textContent = state.items.length;
    $('#btn-mute').textContent = state.muted ? '🔇' : '🔊';
    const cd = $('#hud-countdown');
    if (!TRIP.startDate) { cd.textContent = '⏳ Hamarosan™'; return; }
    const diff = new Date(TRIP.startDate) - Date.now();
    if (diff <= 0) { cd.textContent = '✈️ Úton!'; return; }
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    cd.textContent = `⏳ ${d} nap ${h} óra`;
  }
  setInterval(updateHud, 60000);

  // ===== Pixel-háttérgenerátor ======================================
  const PX = 8; // egy háttér-pixel mérete (CSS px)

  function rng(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paintBg(cv, theme, w, h) {
    const W = Math.ceil(w / PX) + 1;
    const H = Math.ceil(h / PX) + 1;
    cv.width = W; cv.height = H;
    cv.style.width = W * PX + 'px';
    cv.style.height = H * PX + 'px';
    const g = cv.getContext('2d');
    const r = rng(theme.charCodeAt(0) * 1000 + theme.length * 77 + 13);
    const put = (x, y, c) => {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    };
    const fill = colors => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, colors[(r() * colors.length) | 0]); };
    const blob = (cx, cy, rad, c) => {
      const R = Math.ceil(rad * 1.4);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if ((dx / 1.4) ** 2 + dy ** 2 <= rad * rad + (r() - 0.5) * rad) put(cx + dx, cy + dy, c);
      }
    };
    const grad = (bands, y0, y1) => {
      for (let y = y0; y < y1; y++) {
        const t = ((y - y0) / (y1 - y0)) * bands.length;
        const i = t | 0, f = t - i;
        for (let x = 0; x < W; x++) {
          const k = f > 0.66 && (x + y) % 2 === 0 ? i + 1 : i;
          put(x, y, bands[Math.min(k, bands.length - 1)]);
        }
      }
    };
    const tree = (x, y, c1 = '#1f5a2a', c2 = '#2a6e33') => {
      put(x, y, c1); put(x - 1, y + 1, c1); put(x, y + 1, c2); put(x + 1, y + 1, c1); put(x, y + 2, '#5a3b20');
    };
    PAINTERS[theme]({ W, H, r, put, fill, blob, grad, tree });
  }

  const PAINTERS = {
    // Világtérkép: zöld Litvánia, balra a Balti-tenger, tavak, erdők
    map({ W, H, r, put, fill, blob }) {
      fill(['#5cab4c', '#57a347', '#62b252', '#5aa84a']);
      for (let i = 0; i < Math.max(4, (W * H) / 600); i++) {
        const x = (r() * W) | 0, y = (r() * H) | 0, rad = 1.5 + r() * 2.5;
        blob(x, y, rad, '#3f86cf');
        blob(x, y - 1, rad - 1.3, '#5aa2e6');
      }
      for (let i = 0; i < (W * H) / 30; i++) {
        const x = (r() * W) | 0, y = (r() * H) | 0;
        put(x, y, '#2d6b35'); put(x, y + 1, '#24572b');
      }
      for (let i = 0; i < (W * H) / 900; i++) {
        const x = (r() * W) | 0, y = (r() * H) | 0;
        put(x, y, '#c1272d'); put(x, y + 1, '#f2e6c9');
      }
      for (let y = 0; y < H; y++) {
        const cx = Math.round(W * 0.09 + Math.sin(y * 0.21) * 1.5 + Math.sin(y * 0.05) * 2.5);
        for (let x = 0; x < cx; x++) put(x, y, r() < 0.07 ? '#6aa8ec' : '#2f6db8');
        put(cx, y, '#e9d8a6');
      }
    },

    // Csütörtök: litván földek, tanyák, fasorok
    fields({ W, H, r, put, tree }) {
      const crops = [['#8cc65a', '#80bb4f'], ['#d9c27a', '#cdb46b'], ['#6fae45', '#64a23c'], ['#a8794e', '#9c6e45'], ['#9fd06a', '#93c45e']];
      const bh = 6;
      for (let by = 0; by < H; by += bh) {
        let x = -((r() * 6) | 0);
        while (x < W) {
          const w = 6 + ((r() * 10) | 0);
          const [c1, c2] = crops[(r() * crops.length) | 0];
          for (let y = by; y < Math.min(H, by + bh); y++) {
            for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) put(xx, y, (y + (xx >> 1)) % 2 ? c1 : c2);
          }
          x += w;
        }
        for (let x2 = 0; x2 < W; x2++) if (r() < 0.5) put(x2, by, '#4f8f3a');
      }
      for (let i = 0; i < (W * H) / 70; i++) tree((r() * W) | 0, (r() * H) | 0);
      for (let i = 0; i < (W * H) / 500; i++) {
        const x = (r() * W) | 0, y = (r() * H) | 0;
        put(x, y, '#b5453a'); put(x + 1, y, '#b5453a'); put(x, y + 1, '#f2e6c9'); put(x + 1, y + 1, '#f2e6c9');
      }
    },

    // Péntek: Balti-tenger, homokos part, dűnék, fenyves
    coast({ W, H, r, put, tree }) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const shore = H * 0.26 + Math.sin(x * 0.18) * 1.2 + Math.sin(x * 0.05) * 2;
        const forest = H * 0.55 + Math.sin(x * 0.11) * 2;
        let c;
        if (y < shore - 1) c = r() < 0.06 ? '#7fb8f0' : y < shore * 0.5 ? '#2a5fa8' : '#3a78c4';
        else if (y < shore) c = '#f2f7ff';
        else if (y < forest) c = (x + y * 3) % 9 === 0 ? '#d8c08a' : r() < 0.5 ? '#ecd9a6' : '#e6d29c';
        else c = r() < 0.5 ? '#3a7a3c' : '#357237';
        put(x, y, c);
      }
      for (let i = 0; i < (W * H) / 300; i++) put(r() * W, H * 0.3 + r() * H * 0.22, '#9bb36a');
      for (let i = 0; i < (W * H) / 26; i++) tree((r() * W) | 0, (H * 0.57 + r() * H * 0.45) | 0);
    },

    // Ég, felhők, lent kifutópálya
    sky({ W, H, r, put, blob, grad }) {
      grad(['#3f9ee8', '#52aaee', '#66b7f2', '#7cc4f5', '#94d0f7', '#addcf9', '#c6e8fb'], 0, H);
      for (let i = 0; i < Math.max(5, (W * H) / 420); i++) {
        const x = r() * W, y = r() * H * 0.88;
        blob(x, y + 1, 1.4 + r(), '#dcecf8');
        blob(x, y, 1.6 + r() * 1.5, '#ffffff');
        blob(x + 2.5, y + 0.5, 1.2 + r() * 1.5, '#ffffff');
      }
      for (let y = H - 4; y < H; y++) for (let x = 0; x < W; x++) put(x, y, y === H - 4 ? '#7cc96a' : '#5aa84a');
      for (let x = 0; x < W; x++) put(x, H - 2, x % 4 < 2 ? '#e9e9ef' : '#55555f');
    },

    // Péntek: macskakő + pasztell óvárosi házsor
    city({ W, H, r, put }) {
      const stones = ['#b8a48e', '#ab967f', '#c3b09a', '#a28c75'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const mortar = y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0;
        put(x, y, mortar ? '#8f7a64' : stones[(r() * 4) | 0]);
      }
      const hb = Math.max(8, Math.round(H * 0.22));
      for (let y = 0; y < hb; y++) for (let x = 0; x < W; x++) put(x, y, '#9fd3f5');
      const facades = ['#f6d58e', '#f3b7a8', '#bfe3c8', '#f2e6c9', '#c9d7f2', '#f7c873'];
      let x = 0;
      while (x < W) {
        const w = 4 + ((r() * 4) | 0);
        const h = hb - 2 - ((r() * 4) | 0);
        const c = facades[(r() * facades.length) | 0];
        for (let yy = hb - h; yy < hb; yy++) {
          for (let xx = x; xx < Math.min(W, x + w); xx++) {
            const roof = yy < hb - h + 2;
            const win = !roof && (xx - x) % 2 === 1 && (yy - (hb - h)) % 3 === 0 && xx < x + w - 1;
            put(xx, yy, roof ? '#b5453a' : win ? '#3a3550' : c);
          }
        }
        x += w;
      }
      for (let xx = 0; xx < W; xx++) put(xx, hb, '#6b5a48');
    },

    // Szombat: erdő, tavak, virágok – ezen fut az út
    forest({ W, H, r, put, fill, blob, tree }) {
      fill(['#3f8f3f', '#3a873a', '#469847', '#3d8c3e']);
      for (let i = 0; i < Math.max(2, (W * H) / 1400); i++) {
        const x = (r() * W) | 0, y = (r() * H) | 0, rad = 2 + r() * 3;
        blob(x, y, rad, '#3f86cf');
        blob(x, y - 1, rad - 1.5, '#5aa2e6');
      }
      for (let i = 0; i < (W * H) / 55; i++) put(r() * W, r() * H, pick(['#ffe066', '#ffffff', '#ff86b0']));
      for (let i = 0; i < (W * H) / 24; i++) tree((r() * W) | 0, (r() * H) | 0);
    },

    // Vasárnap: naplemente, csillagok, sziluett
    sunset({ W, H, r, put, grad }) {
      const hz = Math.round(H * 0.62);
      grad(['#22183f', '#3b2160', '#6a2a72', '#a43d78', '#de5f6e', '#ff8f5e', '#ffc171'], 0, hz);
      for (let i = 0; i < (W * hz) / 200; i++) {
        const y = r() * hz * 0.35;
        put(r() * W, y, '#fff1dc');
      }
      const sx = W * 0.7, rad = Math.max(4, Math.min(W, H) * 0.09);
      for (let dy = -rad; dy <= 0; dy++) {
        if (dy > -rad * 0.45 && Math.round(dy) % 2 === 0) continue;
        for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad) put(sx + dx, hz + dy, '#fff6c8');
      }
      for (let y = hz; y < H; y++) for (let x = 0; x < W; x++) put(x, y, r() < 0.1 ? '#3a2c52' : '#2d2240');
      for (let x = 0; x < W; x++) {
        const t = (Math.sin(x * 0.7) + Math.sin(x * 0.23)) * 1.2 + 1.5 + r();
        for (let k = 0; k < t; k++) put(x, hz - k, '#1b1430');
      }
    },
  };

  // ===== Jelenet (térkép és pálya közös motorja) =====================
  const sceneEl = $('#screen-scene');
  const nodesEl = $('#scene-nodes');
  const player = $('#player');
  const playerSprite = $('#player .sprite');
  const playerImg = $('#player img');
  const bubble = $('#player .bubble');
  const promptEl = $('#prompt');

  let scene = null;
  let pts = [];
  let portrait = false;
  let curIdx = 0;
  let busy = false;
  let needRelayout = false;
  let pos = { x: 0, y: 0 };
  const SPEED = 0.32; // px / ms

  function buildMapScene() {
    const nodes = days.map((d, i) => ({
      icon: d.icon,
      label: `${i + 1}. VILÁG · ${d.weekday.toUpperCase()}${d.date ? ' · ' + d.date : ''}`,
      sub: d.title,
      locked: !dayUnlocked(i),
      done: dayDone(d),
      num: i + 1,
    }));
    nodes.push({ icon: '🏁', label: 'VÉGÁLLOMÁS', sub: 'Finálé', locked: !(UNLOCK_ALL || allDone()), done: state.accepted, final: true });
    return { kind: 'map', theme: 'map', nodes, vehicle: 'cat', title: 'VILÁGTÉRKÉP', subtitle: TRIP.mapSubtitle || 'Litvánia' };
  }

  function buildLevelScene(di) {
    const d = days[di];
    const v = visitedCount(d);
    let veh = d.vehicle || 'cat';
    const nodes = [{ icon: '🚩', label: '', sub: 'Start', start: true, done: true, veh }].concat(
      d.stops.map((s, i) => {
        if (s.vehicle) veh = s.vehicle;
        return {
          icon: s.icon, label: s.time || '', sub: s.title, veh,
          locked: !UNLOCK_ALL && i > v, done: i < v, num: i + 1,
        };
      })
    );
    return {
      kind: 'level', di, theme: d.theme, nodes, vehicle: d.vehicle || 'cat', road: !!d.road,
      title: `${di + 1}. VILÁG · ${d.weekday.toUpperCase()}`, subtitle: `${d.icon} ${d.title}`,
    };
  }

  function computePoints(n, w, h) {
    portrait = h > w;
    const top = 150, bottom = portrait ? 130 : 120;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      let x, y;
      if (portrait) {
        y = top + t * (h - top - bottom);
        x = w * (i % 2 ? 0.74 : 0.26);
      } else {
        const side = Math.max(80, w * 0.08);
        x = side + t * (w - 2 * side);
        y = top + (h - top - bottom) * (i % 2 ? 0.8 : 0.2);
      }
      out.push({ x: Math.round(x / 4) * 4, y: Math.round(y / 4) * 4 });
    }
    return out;
  }

  // Két állomás közti derékszögű (retro) útvonal
  function route(a, b) {
    if (portrait) {
      const my = Math.round((a.y + b.y) / 8) * 4;
      return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
    }
    const mx = Math.round((a.x + b.x) / 8) * 4;
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }

  function drawPath(w, h) {
    const svg = $('#scene-path');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      route(pts[i], pts[i + 1]).forEach((p, j) => { d += (i === 0 && j === 0 ? 'M' : 'L') + p.x + ' ' + p.y + ' '; });
    }
    svg.innerHTML = scene.road
      ? `<path d="${d}" class="p-road-edge"/><path d="${d}" class="p-road"/><path d="${d}" class="p-roadline"/>`
      : `<path d="${d}" class="p-out"/><path d="${d}" class="p-in"/>`;
  }

  function renderNodes() {
    nodesEl.innerHTML = '';
    scene.nodes.forEach((n, i) => {
      const b = document.createElement('button');
      const side = portrait ? (i % 2 ? 'lab-left' : 'lab-right') : 'lab-below';
      b.className = `node px ${side}` + (n.locked ? ' locked' : '') + (n.done && !n.start ? ' done' : '') + (n.start ? ' start' : '');
      b.style.left = pts[i].x + 'px';
      b.style.top = pts[i].y + 'px';
      b.setAttribute('aria-label', `${n.label} ${n.sub || ''}`.trim());
      b.innerHTML =
        `<span class="node-icon">${n.locked ? '🔒' : n.icon}</span>` +
        (n.num ? `<span class="node-num">${n.num}</span>` : '') +
        `<span class="node-label">${n.label ? `<small>${esc(n.label)}</small>` : ''}${esc(n.sub || '')}</span>`;
      b.addEventListener('click', e => { e.stopPropagation(); onNodeTap(i); });
      nodesEl.appendChild(b);
    });
    markNext();
  }

  function markNext() {
    const btns = $$('.node', nodesEl);
    btns.forEach(b => b.classList.remove('next'));
    const i = scene.nodes.findIndex(n => !n.done && !n.locked && !n.start);
    if (i >= 0 && i !== curIdx) btns[i].classList.add('next');
  }

  function layoutScene() {
    const w = sceneEl.clientWidth, h = sceneEl.clientHeight;
    pts = computePoints(scene.nodes.length, w, h);
    paintBg($('#scene-bg'), scene.theme, w, h);
    drawPath(w, h);
    renderNodes();
    if (scene.kind === 'level' && R.active && lastW) {
      pos = { x: (pos.x * w) / lastW, y: (pos.y * h) / lastH };
      clampPos();
      player.style.transition = 'none';
      player.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      positionThings();
    } else {
      pos = { ...pts[curIdx] };
      placePlayer(pts[curIdx], 0);
    }
    lastW = w;
    lastH = h;
  }
  let lastW = 0, lastH = 0;

  // ----- Játékos -----
  let frames = [], frameTimer = null, frameI = 0;

  function setVehicle(v) {
    frames = v === 'mx5' ? [SPRITES.url('mx5', 3)] : [SPRITES.url('catA', 4), SPRITES.url('catB', 4)];
    playerImg.src = frames[0];
    player.dataset.vehicle = v;
  }
  function startFrames() {
    clearInterval(frameTimer);
    frameTimer = setInterval(() => { frameI = (frameI + 1) % frames.length; playerImg.src = frames[frameI]; }, 140);
  }
  function stopFrames() { clearInterval(frameTimer); frameI = 0; playerImg.src = frames[0]; }

  async function wink() {
    if (player.dataset.vehicle !== 'mx5') return;
    playerImg.src = SPRITES.url('mx5open', 3);
    sfx.blip();
    await sleep(380);
    playerImg.src = frames[0];
  }

  let bubbleT = null;
  function say(text, ms = 2600) {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleT);
    bubbleT = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  function placePlayer(p, ms) {
    if (Math.abs(p.x - pos.x) > 1) player.classList.toggle('flip', p.x < pos.x);
    player.style.transition = ms ? `transform ${ms}ms linear` : 'none';
    player.style.transform = `translate(${p.x}px, ${p.y}px)`;
    pos = { x: p.x, y: p.y };
  }

  async function glide(p) {
    const ms = Math.max(60, Math.hypot(p.x - pos.x, p.y - pos.y) / SPEED);
    placePlayer(p, ms);
    await sleep(ms);
  }

  async function walkTo(target) {
    busy = true;
    player.classList.add('walking');
    startFrames();
    if (player.dataset.vehicle === 'mx5') sfx.vroom();
    const dir = Math.sign(target - curIdx);
    while (curIdx !== target) {
      const nxt = curIdx + dir;
      const wps = dir > 0 ? route(pts[curIdx], pts[nxt]) : route(pts[nxt], pts[curIdx]).reverse();
      for (const p of wps.slice(1)) await glide(p);
      curIdx = nxt;
      sfx.hop();
      const v = vehAt(curIdx);
      if (v !== player.dataset.vehicle) {
        setVehicle(v);
        startFrames();
        if (v === 'mx5') { sfx.vroom(); say('🔑 Megvan az autó!'); } else { sfx.meow(); say('👋 Viszlát, autó!'); }
      }
    }
    stopFrames();
    player.classList.remove('walking');
    busy = false;
    unlock('first');
    if (needRelayout) { needRelayout = false; layoutScene(); }
    markNext();
    if (player.dataset.vehicle === 'mx5') wink();
  }

  const vehAt = i => (scene.nodes[i] && scene.nodes[i].veh) || scene.vehicle;

  playerSprite.addEventListener('click', async e => {
    e.stopPropagation();
    if (busy) return;
    if (player.dataset.vehicle === 'mx5') { await wink(); unlock('wink'); say('😉 *kacsint*'); }
    else { sfx.meow(); say(pick(TRIP.phrases)); }
  });

  // ----- Jelenet vezérlése -----
  function enterScene(sc, idx) {
    scene = sc;
    curIdx = Math.max(0, Math.min(idx, sc.nodes.length - 1));
    busy = false;
    show('screen-scene');
    document.body.dataset.theme = sc.theme;
    $('#scene-title').innerHTML = `<small>${esc(sc.title)}</small><b>${esc(sc.subtitle)}</b>`;
    $('#btn-map').classList.toggle('hidden', sc.kind === 'map');
    setVehicle(vehAt(curIdx));
    player.classList.remove('flip');
    bubble.classList.remove('show');
    stopRoam();
    player.classList.toggle('free', sc.kind === 'level');
    layoutScene();
    if (sc.kind === 'level') startRoam();
    if (sc.kind === 'map') showMapPrompt(); else showLevelPrompt();
  }

  function hidePrompt() { promptEl.classList.add('hidden'); }

  function setPrompt(html, onGo) {
    promptEl.innerHTML = html;
    promptEl.classList.remove('hidden');
    const go = promptEl.querySelector('[data-go]');
    if (go) go.onclick = onGo;
  }

  function showMapPrompt() {
    const n = scene.nodes[curIdx];
    if (n.final) {
      setPrompt(`<div><small>VÉGÁLLOMÁS</small><b>🏁 Finálé</b></div><button class="btn px" data-go>INDÍTÁS ▶</button>`, () => activate(curIdx));
      return;
    }
    const d = days[curIdx];
    setPrompt(
      `<div><small>${curIdx + 1}. VILÁG · ${esc(d.weekday.toUpperCase())}${d.date ? ' · ' + esc(d.date) : ''}</small>` +
      `<b>${d.icon} ${esc(d.title)}</b><span class="prog">${visitedCount(d)}/${d.stops.length} állomás${dayDone(d) ? ' ✅' : ''}</span></div>` +
      `<button class="btn px" data-go>BELÉPÉS ▶</button>`,
      () => activate(curIdx)
    );
  }

  function showLevelPrompt() {
    const d = days[scene.di];
    const v = visitedCount(d);
    if (dayDone(d)) {
      const last = scene.di === days.length - 1;
      setPrompt(
        `<div><small>VILÁG TELJESÍTVE</small><b>🎉 ${esc(d.title)} kipipálva!</b></div><button class="btn px" data-go>${last ? 'FINÁLÉ ▶' : 'TÉRKÉP ▶'}</button>`,
        () => openMap(scene.di, true)
      );
      return;
    }
    const s = d.stops[v];
    const f = fishStats(d);
    setPrompt(
      `<div><small>KÖVETKEZŐ ÁLLOMÁS · ${v + 1}/${d.stops.length} · keresd a villogót</small><b>${s.icon} ${s.time ? esc(s.time) + ' · ' : ''}${esc(s.title)}</b></div>` +
      `<span class="fish-chip">🐟 ${f.got}/${f.total}</span>`
    );
  }

  function shakeNode(i) {
    const b = $$('.node', nodesEl)[i];
    if (!b) return;
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
  }

  async function onNodeTap(i) {
    if (busy || modalOpen() || !scene) return;
    const n = scene.nodes[i];
    if (!n) return;
    if (n.locked) {
      sfx.deny();
      shakeNode(i);
      toast(scene.kind === 'map' ? '🔒 Ez a világ még zárva – előbb az előzőt teljesítsd!' : '🔒 Sorban haladunk – előbb az előző állomás!');
      return;
    }
    if (scene.kind === 'level') {
      // Pályán nincs automata séta: a már látott állomás kártyája újranyitható,
      // a többi felé a macska elindul, de az állatokat neked kell kerülgetni.
      if (n.done && !n.start) { openStopCard(i - 1); return; }
      R.target = { ...pts[i] };
      return;
    }
    if (i === curIdx) { activate(i); return; }
    hidePrompt();
    await walkTo(i);
    if (scene.kind === 'map') { state.mapPos = curIdx; save(); showMapPrompt(); }
    else activate(i);
  }

  function step(dir) {
    if (!scene) return;
    const t = curIdx + dir;
    if (t < 0 || t >= scene.nodes.length) return;
    onNodeTap(t);
  }

  function activate(i) {
    const n = scene.nodes[i];
    if (!n || n.locked || busy) return;
    if (scene.kind === 'map') {
      if (n.final) openFinal(); else enterLevel(i);
      return;
    }
    if (n.start) {
      if (player.dataset.vehicle === 'mx5') { sfx.vroom(); say('Brrrrm! 🏎️'); } else { sfx.meow(); say('Indulás! 🐾'); }
      return;
    }
    openStopCard(i - 1);
  }

  async function openMap(focus, advance = false) {
    const sc = buildMapScene();
    let idx = Number.isInteger(focus) ? focus : state.mapPos || 0;
    if (!sc.nodes[idx] || sc.nodes[idx].locked) idx = 0;
    enterScene(sc, idx);
    const nx = sc.nodes[idx + 1];
    if (advance && nx && !nx.locked) {
      hidePrompt();
      busy = true;
      await sleep(700);
      busy = false;
      toast(nx.final ? '🏁 Megnyílt a FINÁLÉ!' : `🔓 Új világ: ${days[idx + 1].icon} ${esc(days[idx + 1].title)}`);
      await walkTo(idx + 1);
      state.mapPos = curIdx;
      save();
      showMapPrompt();
    }
  }

  function enterLevel(di) {
    state.mapPos = di;
    save();
    const sc = buildLevelScene(di);
    enterScene(sc, Math.min(visitedCount(days[di]), sc.nodes.length - 1));
    banner(`${di + 1}. VILÁG`, `${days[di].icon} ${days[di].title}`);
    sfx.collect();
    if (!state.tutorial) {
      state.tutorial = true;
      save();
      openModal(
        `<div class="card-head"><span class="card-icon">🕹️</span><div><small>HOGYAN JÁTSSZ</small><h2>Irányítás</h2></div></div>` +
        `<ul class="howto">` +
          `<li>⌨️ <b>Gépen:</b> nyilak vagy WASD</li>` +
          `<li>👆 <b>Telefonon:</b> húzd az ujjad bárhol (joystick), vagy koppints oda, ahová menni akarsz</li>` +
          `<li>📍 Menj el a villogó állomáshoz – a sárga nyíl mutatja az irányt</li>` +
          `<li>🐟 Szedd össze a halakat útközben</li>` +
          `<li>🐄 🦌 🐕 Kerüld az állatokat, mert elveszik a halaidat</li>` +
          `<li>🎮 Néhány állomáson minijáték vár</li>` +
        `</ul>`,
        [{ label: 'MEHET ▶', primary: true }]
      );
    }
  }

  // ===== Szabad mozgás a pályán ======================================
  const thingsEl = $('#scene-things');
  const pointerEl = $('#pointer');
  const joyEl = $('#joy');
  const R = {
    active: false, items: [], hazards: [], keys: new Set(), joy: null, target: null,
    inside: -1, hurtT: 0, walking: false, raf: 0, last: 0, t: 0,
  };
  const HAZ = {
    fields: ['🐄', '🐓'], coast: ['🦀', '🐦'], forest: ['🦌', '🐗'], city: ['🐕', '🕊️'],
    sky: ['🐦'], sunset: ['🦇'], map: ['🐕'],
  };
  const fishStats = d => {
    const total = (d.stops.length) * 2;
    return { got: (state.fishGot[d.id] || []).length, total };
  };

  function pointOnRoute(seg, t) {
    const p = route(pts[seg], pts[seg + 1]);
    const lens = [];
    let tot = 0;
    for (let i = 0; i < p.length - 1; i++) { const l = Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y); lens.push(l); tot += l; }
    let d = t * tot;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const f = lens[i] ? Math.min(1, d / lens[i]) : 0;
        return { x: p[i].x + (p[i + 1].x - p[i].x) * f, y: p[i].y + (p[i + 1].y - p[i].y) * f };
      }
      d -= lens[i];
    }
    return { ...pts[seg] };
  }

  function bounds() {
    return { x0: 24, x1: sceneEl.clientWidth - 24, y0: 76, y1: sceneEl.clientHeight - 100 };
  }
  function clampPos() {
    const b = bounds();
    pos.x = Math.max(b.x0, Math.min(b.x1, pos.x));
    pos.y = Math.max(b.y0, Math.min(b.y1, pos.y));
  }

  function buildThings() {
    const d = days[scene.di];
    const r = rng(scene.di * 131 + 7);
    const segs = scene.nodes.length - 1;
    const got = state.fishGot[d.id] || [];
    R.items = [];
    R.hazards = [];
    let id = 0;
    for (let s = 0; s < segs; s++) {
      for (let k = 0; k < 2; k++) {
        const it = { id: id++, seg: s, t: 0.25 + 0.5 * k + (r() - 0.5) * 0.2, ox: (r() - 0.5) * 90, oy: (r() - 0.5) * 90 };
        if (!got.includes(it.id)) R.items.push(it);
      }
    }
    const em = HAZ[scene.theme] || ['🐕'];
    for (let s = 1; s < segs; s++) {
      R.hazards.push({
        seg: s, t: 0.35 + r() * 0.3, axis: r() < 0.5 ? 'x' : 'y',
        amp: 60 + r() * 50, speed: 1.3 + r() * 1.4, phase: r() * 6, em: em[s % em.length],
      });
    }
    thingsEl.innerHTML = '';
    for (const it of R.items) {
      it.el = document.createElement('span');
      it.el.className = 'thing item';
      it.el.textContent = '🐟';
      thingsEl.appendChild(it.el);
    }
    for (const hz of R.hazards) {
      hz.el = document.createElement('span');
      hz.el.className = 'thing hazard';
      hz.el.textContent = hz.em;
      thingsEl.appendChild(hz.el);
    }
    positionThings();
  }

  function positionThings() {
    const b = bounds();
    for (const it of R.items) {
      const p = pointOnRoute(it.seg, it.t);
      it.x = Math.max(b.x0, Math.min(b.x1, p.x + it.ox));
      it.y = Math.max(b.y0, Math.min(b.y1, p.y + it.oy));
      it.el.style.left = it.x + 'px';
      it.el.style.top = it.y + 'px';
    }
    for (const hz of R.hazards) hz.c = pointOnRoute(hz.seg, hz.t);
    moveHazards();
  }

  function moveHazards() {
    for (const hz of R.hazards) {
      const s = Math.sin(R.t * hz.speed + hz.phase);
      const v = Math.cos(R.t * hz.speed + hz.phase);
      hz.x = hz.c.x + (hz.axis === 'x' ? hz.amp * s : 0);
      hz.y = hz.c.y + (hz.axis === 'y' ? hz.amp * s : 0);
      hz.el.style.left = hz.x + 'px';
      hz.el.style.top = hz.y + 'px';
      hz.el.classList.toggle('flip', hz.axis === 'x' && v > 0);
    }
  }

  function startRoam() {
    R.active = true;
    R.inside = curIdx;
    R.target = null;
    R.joy = null;
    R.keys.clear();
    R.hurtT = 0;
    R.walking = false;
    R.t = 0;
    buildThings();
    cancelAnimationFrame(R.raf);
    R.last = performance.now();
    R.raf = requestAnimationFrame(tick);
  }

  function stopRoam() {
    R.active = false;
    cancelAnimationFrame(R.raf);
    thingsEl.innerHTML = '';
    pointerEl.style.display = 'none';
    joyEl.style.display = 'none';
    player.classList.remove('walking', 'hurt', 'free');
    if (frames.length) stopFrames();
  }

  function setWalking(on) {
    if (R.walking === on) return;
    R.walking = on;
    player.classList.toggle('walking', on);
    if (on) startFrames(); else stopFrames();
  }

  function tick(now) {
    R.raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - R.last) / 1000);
    R.last = now;
    if (!R.active || modalOpen()) { setWalking(false); return; }
    R.t += dt;
    moveHazards();

    let ix = 0, iy = 0;
    if (R.keys.has('l')) ix -= 1;
    if (R.keys.has('r')) ix += 1;
    if (R.keys.has('u')) iy -= 1;
    if (R.keys.has('d')) iy += 1;
    if (R.joy && R.joy.moved) { ix += R.joy.x; iy += R.joy.y; }
    if (ix || iy) R.target = null;
    else if (R.target) {
      const dx = R.target.x - pos.x, dy = R.target.y - pos.y, dd = Math.hypot(dx, dy);
      if (dd < 6) R.target = null; else { ix = dx / dd; iy = dy / dd; }
    }
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    if (m > 0.05) {
      const sp = player.dataset.vehicle === 'mx5' ? 270 : 190;
      pos.x += ix * sp * dt;
      pos.y += iy * sp * dt;
      clampPos();
      if (Math.abs(ix) > 0.15) player.classList.toggle('flip', ix < 0);
      setWalking(true);
      unlock('first');
    } else setWalking(false);
    player.style.transition = 'none';
    player.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

    if (R.hurtT > 0) { R.hurtT -= dt; if (R.hurtT <= 0) player.classList.remove('hurt'); }
    checkItems();
    checkHazards();
    checkNodes();
    updatePointer();
  }

  function checkItems() {
    const d = days[scene.di];
    for (const it of R.items) {
      if (it.taken || Math.hypot(pos.x - it.x, pos.y - it.y) > 30) continue;
      it.taken = true;
      it.el.classList.add('got');
      setTimeout(() => it.el.remove(), 320);
      state.fish++;
      (state.fishGot[d.id] = state.fishGot[d.id] || []).push(it.id);
      save();
      tone(1250, 0.06);
      const f = fishStats(d);
      if (f.got >= f.total) { unlock('fishday'); say('🐟 Minden hal megvan!'); }
      if (!dayDone(d)) showLevelPrompt();
    }
  }

  function checkHazards() {
    if (R.hurtT > 0) return;
    for (const hz of R.hazards) {
      const dx = pos.x - hz.x, dy = pos.y - hz.y, dd = Math.hypot(dx, dy);
      if (dd > 32) continue;
      R.hurtT = 1.3;
      R.target = null;
      player.classList.add('hurt');
      const nx = dd ? dx / dd : 0, ny = dd ? dy / dd : 1;
      pos.x += nx * 70;
      pos.y += ny * 70;
      clampPos();
      sfx.deny();
      unlock('hit');
      say(player.dataset.vehicle === 'mx5' ? `${hz.em} Hé! Fékezz!` : `${hz.em} Mrrrau! 🙀`);
      if (state.fish > 0) { state.fish--; save(); toast(`${hz.em} -1 🐟`); }
      return;
    }
  }

  function checkNodes() {
    let hit = -1;
    for (let i = 1; i < scene.nodes.length; i++) {
      if (Math.hypot(pos.x - pts[i].x, pos.y - pts[i].y) < 36) { hit = i; break; }
    }
    if (hit === R.inside) return;
    R.inside = hit;
    if (hit < 0 || scene.nodes[hit].done) return; // a már látott állomás csak koppintásra nyílik újra
    R.target = null;
    triggerStop(hit);
  }

  function triggerStop(i) {
    const n = scene.nodes[i];
    if (!n || n.start) return;
    if (n.locked) {
      sfx.deny();
      shakeNode(i);
      toast('🔒 Sorban haladunk – előbb a villogó állomás!');
      return;
    }
    curIdx = i;
    markNext();
    setWalking(false);
    const d = days[scene.di];
    const si = i - 1;
    const s = d.stops[si];
    const key = `${d.id}-${si}`;
    if (s.game && MINI[s.game.type] && !state.games[key] && si >= visitedCount(d)) startMini(s.game, key, () => openStopCard(si));
    else openStopCard(si);
  }

  function updatePointer() {
    const d = days[scene.di];
    const v = visitedCount(d);
    if (v >= d.stops.length) { pointerEl.style.display = 'none'; return; }
    const t = pts[v + 1];
    const dx = t.x - pos.x, dy = t.y - pos.y;
    if (Math.hypot(dx, dy) < 120) { pointerEl.style.display = 'none'; return; }
    const a = Math.atan2(dy, dx);
    pointerEl.style.display = 'block';
    pointerEl.style.transform = `translate(${pos.x + Math.cos(a) * 58}px, ${pos.y + Math.sin(a) * 58}px) translate(-50%, -50%) rotate(${a}rad)`;
  }

  // ----- Érintés: lebegő joystick vagy koppintás -----
  sceneEl.addEventListener('pointerdown', e => {
    if (!R.active || modalOpen()) return;
    if (e.target.closest('.node, .sprite, #prompt, button, a')) return;
    R.joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: 0, y: 0, moved: false, t: performance.now() };
    joyEl.style.left = e.clientX + 'px';
    joyEl.style.top = e.clientY + 'px';
    joyEl.firstElementChild.style.transform = '';
    try { sceneEl.setPointerCapture(e.pointerId); } catch { /* régi böngésző */ }
  });
  sceneEl.addEventListener('pointermove', e => {
    const j = R.joy;
    if (!j || e.pointerId !== j.id) return;
    let dx = e.clientX - j.sx, dy = e.clientY - j.sy;
    const dd = Math.hypot(dx, dy);
    if (dd > 10 && !j.moved) { j.moved = true; joyEl.style.display = 'block'; }
    if (dd > 50) { dx = (dx / dd) * 50; dy = (dy / dd) * 50; }
    j.x = dx / 50;
    j.y = dy / 50;
    joyEl.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const endJoy = e => {
    const j = R.joy;
    if (!j || e.pointerId !== j.id) return;
    if (!j.moved && performance.now() - j.t < 350) {
      const rect = sceneEl.getBoundingClientRect();
      R.target = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    R.joy = null;
    joyEl.style.display = 'none';
  };
  sceneEl.addEventListener('pointerup', endJoy);
  sceneEl.addEventListener('pointercancel', endJoy);

  // ===== Minijátékok ===============================================
  const MINI = {
    catch: { icon: '🐟', title: 'Repülő halak', help: 'Kapd el a felugró halakat! Koppints vagy kattints rájuk.', run: runCatch },
    pour: { icon: '🍺', title: 'Tökéletes csapolás', help: 'Tartsd nyomva a gombot, és akkor engedd el, amikor a sör a zöld sávban van. Ne folyjon túl! 3 pohárból 2-nek sikerülnie kell.', run: runPour },
    code: { icon: '☢️', title: 'Kód', help: 'Jegyezd meg a felvillanó sorrendet, aztán nyomd be ugyanígy!', run: runCode },
  };
  let miniCleanup = null;

  function startMini(cfg, key, done) {
    const def = MINI[cfg.type];
    let finished = false;
    openModal(
      `<div class="card-head"><span class="card-icon">${cfg.emoji || def.icon}</span><div><small>MINIJÁTÉK · +3 🐟</small><h2>${esc(cfg.title || def.title)}</h2></div></div>` +
      `<p class="mini-help">${esc(cfg.help || def.help)}</p><div class="mini-area"></div><p class="mini-status"></p>`,
      [],
      () => {
        if (miniCleanup) miniCleanup();
        miniCleanup = null;
        if (!finished) { finished = true; done(); }
      }
    );
    const bar = $('#modal-actions');
    const btn = (label, primary, fn) => {
      const b = document.createElement('button');
      b.className = 'btn px' + (primary ? '' : ' ghost');
      b.textContent = label;
      b.onclick = fn;
      bar.appendChild(b);
    };
    const run = () => {
      const area = $('#modal-content .mini-area');
      const status = $('#modal-content .mini-status');
      area.className = 'mini-area';
      area.innerHTML = '';
      bar.innerHTML = '';
      btn('KIHAGYOM', false, closeModal);
      miniCleanup = def.run(area, status, cfg, won => {
        if (miniCleanup) miniCleanup();
        miniCleanup = null;
        bar.innerHTML = '';
        if (won) {
          state.games[key] = true;
          state.fish += 3;
          save();
          sfx.fanfare();
          status.innerHTML = '🏆 Megcsináltad! +3 🐟';
          const all = days.every(d => d.stops.every((s, si) => !s.game || state.games[`${d.id}-${si}`]));
          if (all) unlock('minimaster');
        } else {
          sfx.deny();
          status.innerHTML = '😿 Most nem jött össze.';
          btn('ÚJRA ↺', false, run);
        }
        btn('TOVÁBB ▶', true, closeModal);
      });
    };
    run();
    setTimeout(() => { if (document.activeElement) document.activeElement.blur(); }, 80);
  }

  // Felugró halak elkapása
  function runCatch(area, status, cfg, end) {
    const goal = cfg.goal || 6, total = cfg.time || 12;
    let caught = 0, t = 0, spawnT = 0, raf = 0, last = performance.now(), over = false;
    const fish = [];
    area.classList.add(cfg.bg === 'shop' ? 'mini-shop' : 'mini-water');
    const upd = () => { status.textContent = `${cfg.emoji || '🐟'} ${caught}/${goal} · ⏱ ${Math.max(0, Math.ceil(total - t))} mp`; };
    function spawn() {
      const W = area.clientWidth, H = area.clientHeight;
      const el = document.createElement('button');
      el.className = 'mini-fish';
      el.textContent = cfg.emoji || '🐟';
      const vy = -(H * 1.5 + Math.random() * H * 0.5);
      const f = { el, x: 30 + Math.random() * (W - 60), y: H + 20, vx: (Math.random() - 0.5) * 90, vy, alive: true };
      f.g = (vy * vy) / (2 * H * (0.55 + Math.random() * 0.35));
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (!f.alive || over) return;
        f.alive = false;
        caught++;
        el.classList.add('got');
        tone(1200, 0.06);
        upd();
        if (caught >= goal) finish(true);
      });
      area.appendChild(el);
      fish.push(f);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = 0.45 + Math.random() * 0.4; }
      for (const f of fish) {
        if (!f.el.isConnected) continue;
        f.vy += f.g * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.vy > 0 ? 200 : -20}deg)`;
        if (f.vy > 0 && f.y > area.clientHeight + 40) f.el.remove();
      }
      upd();
      if (t >= total) finish(caught >= goal);
    }
    function finish(won) {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      end(won);
    }
    upd();
    raf = requestAnimationFrame(frame);
    return () => { over = true; cancelAnimationFrame(raf); };
  }

  // Sörcsapolás: nyomva tartás, elengedés a zöld sávban
  function runPour(area, status, cfg, end) {
    const rounds = 3, need = 2, LO = 78, HI = 94;
    let round = 0, hits = 0, level = 0, pouring = false, raf = 0, last = 0, over = false;
    const results = [];
    area.innerHTML =
      `<div class="pour-wrap"><div class="glass"><div class="zone"></div><div class="beer"></div></div>` +
      `<button class="btn big px pour-btn">TARTSD NYOMVA 🍺</button></div>`;
    const beer = area.querySelector('.beer');
    const btnEl = area.querySelector('.pour-btn');
    const upd = () => { status.textContent = `Pohár ${Math.min(round + 1, rounds)}/${rounds}   ${results.join(' ')}`; };
    const draw = () => { beer.style.height = Math.min(100, level) + '%'; };
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pouring) return;
      level += (26 + level * 0.35) * dt;
      draw();
      if (level >= 100) judge();
    }
    function judge() {
      if (!pouring) return;
      pouring = false;
      cancelAnimationFrame(raf);
      const ok = level >= LO && level <= HI;
      results.push(ok ? '✅' : level >= 100 ? '💦' : '❌');
      if (ok) { hits++; tone(1000, 0.12); } else sfx.deny();
      round++;
      upd();
      if (hits >= need || round >= rounds || rounds - round + hits < need) {
        over = true;
        setTimeout(() => end(hits >= need), 600);
        return;
      }
      setTimeout(() => { if (!over) { level = 0; draw(); } }, 650);
    }
    const start = e => {
      e.preventDefault();
      if (over || pouring || level > 0) return;
      pouring = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    btnEl.addEventListener('pointerdown', start);
    btnEl.addEventListener('pointerup', judge);
    btnEl.addEventListener('pointerleave', judge);
    btnEl.addEventListener('pointercancel', judge);
    upd();
    draw();
    return () => { over = true; pouring = false; cancelAnimationFrame(raf); };
  }

  // Simon-szerű kódmemória
  function runCode(area, status, cfg, end) {
    const len = cfg.length || 5;
    const colors = ['#c1272d', '#fdb913', '#006a44', '#3f86cf'];
    const notes = [330, 415, 494, 587];
    area.innerHTML = `<div class="code-pads">${colors.map((c, i) => `<button class="code-pad px" style="--c:${c}" data-i="${i}">${i + 1}</button>`).join('')}</div>`;
    const pads = [...area.querySelectorAll('.code-pad')];
    const code = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    const timers = [];
    let input = 0, accepting = false, over = false;
    const flash = i => {
      pads[i].classList.add('lit');
      tone(notes[i], 0.25);
      timers.push(setTimeout(() => pads[i].classList.remove('lit'), 320));
    };
    status.textContent = '👀 Figyelj…';
    code.forEach((p, k) => timers.push(setTimeout(() => flash(p), 700 + k * 650)));
    timers.push(setTimeout(() => { accepting = true; status.textContent = `Most te! 0/${len}`; }, 700 + len * 650));
    pads.forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!accepting || over) return;
      const i = +b.dataset.i;
      flash(i);
      if (i === code[input]) {
        input++;
        status.textContent = `Most te! ${input}/${len}`;
        if (input === len) { over = true; timers.push(setTimeout(() => end(true), 450)); }
      } else {
        over = true;
        b.classList.add('wrong');
        timers.push(setTimeout(() => end(false), 450));
      }
    }));
    return () => { over = true; timers.forEach(clearTimeout); };
  }

  // ----- Állomás-kártya -----
  function openStopCard(si) {
    const di = scene.di;
    const d = days[di];
    const s = d.stops[si];
    const isNew = si >= visitedCount(d);
    const href = s.mapUrl || (s.maps ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.maps) : '');
    const place = (s.place
      ? `<p class="card-place">📍 ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(s.place)} ↗</a>` : esc(s.place)}</p>`
      : '') + (s.note ? `<p class="card-note">ℹ️ ${esc(s.note)}</p>` : '');
    openModal(
      `<div class="card-head"><span class="card-icon">${s.icon}</span><div>` +
        `<small>${esc(d.weekday.toUpperCase())}${s.time ? ' · ' + esc(s.time) : ''} · ${si + 1}/${d.stops.length}</small>` +
        `<h2>${esc(s.title)}</h2></div></div>` +
      place +
      `<p class="card-desc">${esc(s.desc)}</p>` +
      (s.fact ? `<div class="card-fact"><b>🧠 TUDTAD?</b><p>${esc(s.fact)}</p></div>` : '') +
      (s.loot ? `<div class="card-loot ${isNew ? 'new' : ''}">${isNew ? '+1 ' : ''}${s.loot.icon} ${esc(s.loot.name)}</div>` : ''),
      [{ label: 'TOVÁBB ▶', primary: true }],
      () => afterStop(di, si, isNew)
    );
    typeText($('#modal-content .card-desc'));
    if (isNew && s.loot) setTimeout(sfx.collect, 300);
  }

  function afterStop(di, si, isNew) {
    const d = days[di];
    const s = d.stops[si];
    if (isNew) {
      const wasDone = dayDone(d);
      state.visited[d.id] = Math.max(visitedCount(d), si + 1);
      const key = `${d.id}-${si}`;
      if (s.loot && !state.items.includes(key)) state.items.push(key);
      save();
      if (s.fact) countFact();
      scene = buildLevelScene(di);
      renderNodes();
      const nv = vehAt(visitedCount(d));
      if (nv !== player.dataset.vehicle) {
        setVehicle(nv);
        if (nv === 'mx5') { sfx.vroom(); say('🔑 Megvan az autó! Brrrm!'); } else { sfx.meow(); say('👋 Viszlát, autó!'); }
      }
      if (!wasDone && dayDone(d)) { unlock('day-' + d.id); rain(24); }
    }
    updateHud();
    showLevelPrompt();
  }

  // ----- Hátizsák + achievementek -----
  function openInventory() {
    const items = days.flatMap(d => d.stops.map((s, si) => ({ loot: s.loot, have: state.items.includes(`${d.id}-${si}`) }))).filter(x => x.loot);
    openModal(
      `<div class="card-head"><span class="card-icon">🎒</span><div><small>${state.items.length}/${totalLoot} TÁRGY · 🐟 ${state.fish} HAL</small><h2>Hátizsák</h2></div></div>` +
      `<h3>Gyűjtemény</h3><div class="inv-grid">` +
        items.map(it => `<div class="inv ${it.have ? '' : 'missing'}"><span>${it.have ? it.loot.icon : '?'}</span><small>${it.have ? esc(it.loot.name) : '???'}</small></div>`).join('') +
      `</div><h3>Achievementek (${state.achievements.length}/${ACH.length})</h3><ul class="ach-list">` +
        ACH.map(a => {
          const has = state.achievements.includes(a.id);
          return `<li class="${has ? '' : 'locked'}"><span>${has ? a.icon : '🔒'}</span><div><b>${has ? esc(a.name) : '???'}</b><small>${has ? esc(a.desc) : 'Még titok.'}</small></div></li>`;
        }).join('') +
      `</ul>`,
      [
        { label: '↺ ÚJRAKEZDÉS', onClick: () => { if (confirm('Biztosan törlöd a haladást?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } } },
        { label: 'BEZÁR', primary: true },
      ]
    );
  }

  function openFactModal() {
    const f = nextFact();
    countFact();
    openModal(
      `<div class="card-head"><span class="card-icon">🧠</span><div><small>VÉLETLEN ÉRDEKESSÉG</small><h2>Tudtad?</h2></div></div>` +
      `<p style="margin-top:16px"><span class="tag">${esc(f.tag)}</span></p><p class="card-desc big">${esc(f.text)}</p>`,
      [
        { label: 'MÉG EGYET 🎲', onClick: () => { closeModal(); openFactModal(); } },
        { label: 'BEZÁR', primary: true },
      ]
    );
  }

  // ===== Finálé =====================================================
  const noBtn = $('#btn-no');
  const NO_LABELS = ['NEM', 'Biztos? 🙀', 'Na ne már', 'Az MX-5 szomorú 🏎️', 'A macska figyel 👁️', 'Ne ne ne', 'Utolsó esély…'];
  let noDodges = 0, lastFlee = 0;

  function paintFinalBg() {
    const scr = $('#screen-final');
    paintBg($('#final-bg'), 'sunset', scr.clientWidth, scr.clientHeight);
  }

  function openFinal() {
    show('screen-final');
    document.body.dataset.theme = 'sunset';
    paintFinalBg();
    $('#final-summary').innerHTML =
      `<ul class="final-days">` +
        days.map(d => `<li><span>${d.icon}</span><div><b>${esc(d.weekday)}</b>${d.date ? ` <small>${esc(d.date)}</small>` : ''}<em>${esc(d.title)} · ${d.stops.length} állomás</em></div></li>`).join('') +
      `</ul><p class="final-stats">🎒 ${state.items.length}/${totalLoot} tárgy · 🐟 ${state.fish} hal · 🏆 ${state.achievements.length}/${ACH.length} achievement · 🧠 ${state.factsSeen} érdekesség</p>`;
    resetNo();
    $('#final-ask').classList.toggle('hidden', state.accepted);
    $('#final-done').classList.toggle('hidden', !state.accepted);
  }

  function resetNo() {
    noDodges = 0;
    noBtn.textContent = 'NEM';
    noBtn.classList.remove('flee');
    noBtn.dataset.turned = '';
    noBtn.style.left = noBtn.style.top = '';
  }

  function flee(e) {
    if (noBtn.dataset.turned) return;
    if (e) e.preventDefault();
    lastFlee = Date.now();
    noDodges++;
    sfx.deny();
    if (noDodges === 5) unlock('stubborn');
    if (noDodges >= NO_LABELS.length) {
      noBtn.dataset.turned = '1';
      noBtn.textContent = 'OKÉ, IGEN 😼';
      noBtn.classList.remove('flee');
      noBtn.style.left = noBtn.style.top = '';
      return;
    }
    noBtn.textContent = NO_LABELS[noDodges];
    noBtn.classList.add('flee');
    const r = noBtn.getBoundingClientRect();
    const yes = $('#btn-yes').getBoundingClientRect();
    const maxX = innerWidth - r.width - 16;
    const maxY = innerHeight - r.height - 16;
    let x, y, tries = 0;
    do {
      x = 16 + Math.random() * Math.max(0, maxX - 16);
      y = 70 + Math.random() * Math.max(0, maxY - 70);
      tries++;
    } while (tries < 30 && (
      (x < yes.right + 10 && x + r.width > yes.left - 10 && y < yes.bottom + 10 && y + r.height > yes.top - 10) ||
      Math.hypot(x - r.left, y - r.top) < 120
    ));
    noBtn.style.left = x + 'px';
    noBtn.style.top = y + 'px';
  }

  noBtn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') flee(e); });
  noBtn.addEventListener('pointerdown', flee);
  noBtn.addEventListener('click', e => {
    if (Date.now() - lastFlee < 450) return;
    if (noBtn.dataset.turned) accept(); else flee(e);
  });

  function accept() {
    state.accepted = true;
    save();
    sfx.meow();
    unlock('accepted');
    rain(70);
    $('#final-ask').classList.add('hidden');
    $('#final-done').classList.remove('hidden');
    resetNo();
  }

  $('#btn-yes').addEventListener('click', accept);
  $('#btn-again').addEventListener('click', () => { rain(70); sfx.fanfare(); });
  $('#btn-final-map').addEventListener('click', () => openMap(days.length));

  // ===== Start + karakterválasztó ===================================
  async function runLoading() {
    const box = $('#loading');
    const bar = $('#loading .bar i');
    const msg = $('#loading-msg');
    $('#btn-start').classList.add('hidden');
    box.classList.remove('hidden');
    $('#loading-fact').textContent = '🧠 ' + nextFact().text;
    let skip = false;
    box.onclick = () => { skip = true; };
    for (const [pct, text] of TRIP.loading) {
      msg.textContent = text;
      bar.style.width = pct + '%';
      sfx.blip();
      await sleep(skip ? 60 : /billenty/.test(text) ? 1100 : 480);
    }
    await sleep(skip ? 0 : 400);
    box.classList.add('hidden');
    $('#btn-start').classList.remove('hidden');
  }

  function initStart() {
    const scr = $('#screen-start');
    paintBg($('#start-bg'), 'map', scr.clientWidth, scr.clientHeight);
    $('#start-title').textContent = TRIP.title;
    $('#start-sub').textContent = TRIP.subtitle;
    $('#start-foot').textContent = TRIP.footer;
    $('#start-car').src = SPRITES.url('mx5', 3);
    const cat = $('#start-cat');
    let f = 0;
    cat.src = SPRITES.url('catA', 8);
    setInterval(() => { f ^= 1; cat.src = SPRITES.url(f ? 'catB' : 'catA', 8); }, 300);
    $('#btn-start').textContent = state.character ? 'FOLYTATÁS ▶' : 'START ▶';

    $('#char-cat img').src = SPRITES.url('catA', 5);
    $('#char-mx5 img').src = SPRITES.url('mx5', 3);
    $('#char-adam img').src = SPRITES.url('catA', 5);
  }

  let starting = false;
  $('#btn-start').addEventListener('click', async () => {
    if (starting) return;
    starting = true;
    sfx.meow();
    await runLoading();
    starting = false;
    if (state.character) openMap();
    else show('screen-select');
  });

  $('#char-cat').addEventListener('click', () => {
    state.character = 'cat';
    save();
    sfx.meow();
    openMap(0);
    banner('VILÁGTÉRKÉP', 'Vilnius Quest');
  });
  $('#char-mx5').addEventListener('click', async () => {
    const img = $('#char-mx5 img');
    img.src = SPRITES.url('mx5open', 3);
    sfx.blip();
    toast('🔒 Az 1. világban, az autóátvételnél oldódik fel. Jinba Ittai – türelem.');
    await sleep(380);
    img.src = SPRITES.url('mx5', 3);
  });
  $('#char-adam').addEventListener('click', () => {
    sfx.deny();
    toast('⚠️ HIBA: a karakter reggel 6-kor nem reagál.');
  });

  // ===== HUD gombok =================================================
  $('#btn-map').addEventListener('click', () => {
    if (modalOpen()) closeModal();
    if ($('#screen-final').classList.contains('active')) openMap(days.length);
    else openMap(scene && scene.kind === 'level' ? scene.di : state.mapPos);
  });
  $('#btn-bag').addEventListener('click', openInventory);
  $('#btn-fact').addEventListener('click', openFactModal);
  $('#btn-mute').addEventListener('click', () => {
    state.muted = !state.muted;
    save();
    updateHud();
    if (state.muted) unlock('mute'); else sfx.meow();
  });
  $('#hud-countdown').addEventListener('click', () => {
    toast(TRIP.startDate
      ? `✈️ Indulás: ${new Date(TRIP.startDate).toLocaleString('hu-HU', { dateStyle: 'long', timeStyle: 'short' })}`
      : '✈️ Az indulás pontos ideje még titkos.');
  });

  // ===== Billentyűzet ===============================================
  const MOVE = {
    ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r',
    ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd',
  };
  document.addEventListener('keyup', e => { if (MOVE[e.key]) R.keys.delete(MOVE[e.key]); });
  addEventListener('blur', () => R.keys.clear());
  document.addEventListener('keydown', e => {
    const k = e.key;
    if (modalOpen()) { if (k === 'Escape') closeModal(); return; }
    if ((k === 'Enter' || k === ' ') && document.activeElement && document.activeElement.tagName === 'BUTTON') return;
    const active = $('.screen.active').id;
    if (active === 'screen-start' && (k === 'Enter' || k === ' ')) { e.preventDefault(); $('#btn-start').click(); return; }
    if (active === 'screen-teaser' && (k === 'Enter' || k === ' ' || k === 'ArrowRight')) { e.preventDefault(); teaserNext(); return; }
    if (active !== 'screen-scene') return;
    if (scene && scene.kind === 'level') {
      if (MOVE[k]) { e.preventDefault(); R.keys.add(MOVE[k]); R.target = null; }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (R.inside > 0) triggerStop(R.inside); }
      else if (k === 'Escape') openMap(scene.di);
      return;
    }
    if (['ArrowRight', 'ArrowDown', 'd', 's'].includes(k)) { e.preventDefault(); step(1); }
    else if (['ArrowLeft', 'ArrowUp', 'a', 'w'].includes(k)) { e.preventDefault(); step(-1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); activate(curIdx); }
    else if (k === 'Escape' && scene && scene.kind === 'level') openMap(scene.di);
  });

  // ===== Átméretezés + üresjárati csevej ============================
  let resizeT = null;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const active = $('.screen.active').id;
      if (active === 'screen-scene' && scene) { if (busy) needRelayout = true; else layoutScene(); }
      else if (active === 'screen-start') { const s = $('#screen-start'); paintBg($('#start-bg'), 'map', s.clientWidth, s.clientHeight); }
      else if (active === 'screen-teaser') { const s = $('#screen-teaser'); paintBg($('#teaser-bg'), 'coast', s.clientWidth, s.clientHeight); }
      else if (active === 'screen-final') paintFinalBg();
    }, 150);
  }
  addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('#app'));

  setInterval(() => {
    if ($('#screen-scene').classList.contains('active') && !busy && !modalOpen() && Math.random() < 0.35) {
      say(player.dataset.vehicle === 'mx5' ? pick(['Brrrm.', '😉', 'Jinba Ittai!', 'Tető le?']) : pick(TRIP.phrases));
    }
  }, 11000);

  // ===== Teaser (legelső képernyő) ====================================
  const TZ = TRIP.teaser;
  let tIdx = 0, tTimer = null, tFull = '';

  function openTeaser() {
    show('screen-teaser');
    const s = $('#screen-teaser');
    paintBg($('#teaser-bg'), 'coast', s.clientWidth, s.clientHeight);
    $('#teaser-kicker').textContent = TZ.kicker;
    $('#teaser-title').textContent = TZ.title;
    $('#teaser-sub').textContent = TZ.sub;
    $('#teaser-speaker').textContent = TZ.speaker;
    $('#teaser-ps').textContent = TZ.ps || '';
    $('#teaser-dialog .dialog-face').src = SPRITES.url('catA', 4);
    $('#teaser-dots').innerHTML = TZ.lines.map(() => '<i></i>').join('');
    tIdx = 0;
    renderTeaser();
  }

  function renderTeaser() {
    const last = tIdx === TZ.lines.length - 1;
    $$('#teaser-dots i').forEach((d, i) => d.classList.toggle('on', i <= tIdx));
    $('#teaser-ps').classList.toggle('hidden', !(last && TZ.ps));
    $('#btn-teaser-next').textContent = last ? 'IRÁNY A JÁTÉK ▶' : 'TOVÁBB ▶';
    $('#btn-teaser-skip').classList.toggle('hidden', last);
    const el = $('#teaser-text');
    tFull = TZ.lines[tIdx];
    let i = 0;
    el.textContent = '';
    clearInterval(tTimer);
    tTimer = setInterval(() => {
      i += 1;
      el.textContent = tFull.slice(0, i);
      if (i % 3 === 0) tone(700 + Math.random() * 200, 0.02, 'square', 0.02);
      if (i >= tFull.length) clearInterval(tTimer);
    }, 28);
  }

  function teaserNext() {
    const el = $('#teaser-text');
    if (el.textContent.length < tFull.length) { clearInterval(tTimer); el.textContent = tFull; return; }
    if (tIdx >= TZ.lines.length - 1) { finishTeaser(); return; }
    tIdx++;
    sfx.blip();
    renderTeaser();
  }

  function finishTeaser() {
    clearInterval(tTimer);
    state.teaserSeen = true;
    save();
    show('screen-start');
    const s = $('#screen-start');
    paintBg($('#start-bg'), 'map', s.clientWidth, s.clientHeight);
  }

  $('#btn-teaser-next').addEventListener('click', teaserNext);
  $('#teaser-dialog').addEventListener('click', teaserNext);
  $('#btn-teaser-skip').addEventListener('click', finishTeaser);
  $('#btn-teaser-again').addEventListener('click', openTeaser);

  // ===== Indítás ====================================================
  initStart();
  updateHud();
  if (TZ && !state.teaserSeen) openTeaser();
})();
