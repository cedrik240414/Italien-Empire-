// ===== ITALIEN EMPIRE – Spiellogik =====
'use strict';
(function () {
const T = THREE;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const fmt = n => (window.IE_GAME === 'dubai' ? 'AED ' : '€ ') + Math.round(n).toLocaleString('de-DE');
const touchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let isTouch = touchDevice; // wird nach dem Laden der Optionen gesetzt (Steuerung: Touch oder Tastatur & Maus)

// ---------- Speicher ----------
let MODE = 'story'; // aktueller Speicher-Slot: 'story' oder 'online' (nur startGame ändert das)
const saveKeyFor = m => (m === 'online' ? 'italienEmpire_online_v1' : 'italienEmpire_v1') + ACC;
let SAVE_KEY = 'italienEmpire_v1', ACC = '';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch (e) { } },
  del() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
};
const opts = (() => { try { return JSON.parse(localStorage.getItem('italienEmpire_opts') || '{}'); } catch (e) { return {}; } })();
isTouch = opts.ctrl === 'kbm' ? false : opts.ctrl === 'touch' ? true : touchDevice; document.body.classList.toggle('touch', isTouch);
opts.gfx = opts.gfx || (touchDevice ? 'mittel' : 'hoch'); opts.fp = !!opts.fp; opts.sens = opts.sens || 1; if (opts.snd === undefined) opts.snd = true;
const saveOpts = () => { try { localStorage.setItem('italienEmpire_opts', JSON.stringify(opts)); } catch (e) { } };

const S = { cheat250: false, villas: [], biz: {}, guards: 0, guardsOn: true, money: 5000, weapons: { faust: 0, pistola: 48 }, cur: 'pistola', cars: [], helis: [], boats: [], planes: ['piccolo'], wrecks: [], up: {}, skins: [], skin: '', packs: [], phone: false, phonePro: false, videos: [], subs: [], channel: { subs: 0, views: 0, cash: 0 }, mission: 0, char: 'jack', armor: 0, done: false };
// Spielstand: lokal + (mit Konto auf dem eigenen Server) in der Cloud – so ist er auf jedem Gerät da
const CLOUD = { busy: false, lastPush: 0, timer: null, pending: null };
const cloudAcc = () => window.IECF && IECF.account && window.IEaccount && IEaccount.token ? IECF.account : null;
const saveSlot = () => MODE;
function cloudPush(now) {
  const a = cloudAcc(); if (!a || !ACC) return;
  const go = () => { CLOUD.timer = null; CLOUD.lastPush = Date.now(); a.save(saveSlot(), JSON.stringify(S), S._t || Date.now()).catch(() => { }); };
  if (now) { if (CLOUD.timer) clearTimeout(CLOUD.timer); go(); return; }
  if (CLOUD.timer) return;
  CLOUD.timer = setTimeout(go, Math.max(0, 10000 - (Date.now() - CLOUD.lastPush)));
}
function saveGame(now) { S._t = Date.now(); store.set(S); if (game.state === 'play') cloudPush(now === true); }
document.addEventListener('visibilitychange', () => {
  const a = cloudAcc(); if (document.visibilityState !== 'hidden' || !a || !ACC || game.state !== 'play') return;
  S._t = Date.now(); store.set(S); a.saveBeacon(saveSlot(), JSON.stringify(S), S._t);
});
async function cloudPull() {
  const a = cloudAcc(); if (!a) return;
  CLOUD.busy = true; $('bCont').disabled = true;
  let got = false;
  for (const [slot, key] of [['story', 'italienEmpire_v1' + ACC], ['online', 'italienEmpire_online_v1' + ACC]]) {
    try {
      const r = await a.load(slot); if (!r || !r.data) continue;
      let local = null; try { local = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
      const cloud = JSON.parse(r.data);
      if (!cloud) { if (local && (local._t || 0) < r.t) { localStorage.removeItem(key); } continue; } // Spielstand wurde gelöscht
      if (!local || (cloud._t || r.t || 0) > (local._t || 0)) { localStorage.setItem(key, r.data); got = true; }
      else if ((local._t || 0) > (cloud._t || r.t || 0)) a.save(slot, JSON.stringify(local), local._t).catch(() => { }); // dieses Gerät ist neuer -> hochladen
    } catch (e) { }
  }
  CLOUD.busy = false; $('bCont').disabled = false; $('bCont').hidden = !store.get();
  if (got) toast('Spielstand von deinem Konto geladen ☁', 2.5);
  if (CLOUD.pending) { const p = CLOUD.pending; CLOUD.pending = null; startGame(p[0], p[1]); }
}

// ---------- Renderer ----------
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: opts.gfx !== 'niedrig', powerPreference: 'high-performance' });
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
function applyGfx() {
  const pr = opts.gfx === 'hoch' ? Math.min(devicePixelRatio, 2) : opts.gfx === 'mittel' ? Math.min(devicePixelRatio, 1.3) : 0.8;
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = opts.gfx !== 'niedrig';
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  if (sun) { sun.castShadow = opts.gfx !== 'niedrig'; const s = opts.gfx === 'hoch' ? 2048 : 1024; if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(s, s); }
  $('optGfx').textContent = opts.gfx[0].toUpperCase() + opts.gfx.slice(1);
}
const scene = new T.Scene();
scene.fog = new T.Fog(0xd5d2c8, 500, 3200);
const camera = new T.PerspectiveCamera(62, 1, 0.3, 14000);
const hemi = new T.HemisphereLight(0xcfe3ff, 0x8a7b5a, 0.6); scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0d6, 1.15);
const SUN_DIR = new T.Vector3(-0.5, 0.45, 0.6).normalize();
sun.shadow.camera.left = -70; sun.shadow.camera.right = 70; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 600; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);
const ambient = new T.AmbientLight(0xffffff, 0.12); scene.add(ambient);
IE.lights = { hemi, sun, ambient, sunColorDay: 0xfff0d6, hemiSky: 0xcfe3ff, hemiGround: 0x8a7b5a };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

// ---------- Audio ----------
const AU = { ctx: null, eng: null };
function audioInit() {
  if (AU.ctx || !opts.snd) return;
  try {
    const C = AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = C.createGain(); AU.master.gain.value = 0.5; AU.master.connect(C.destination);
    const nb = C.createBuffer(1, C.sampleRate * 1.5, C.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noise = nb;
    const o = C.createOscillator(); o.type = 'sawtooth'; const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; const g = C.createGain(); g.gain.value = 0;
    const lfo = C.createOscillator(); lfo.frequency.value = 16; const lg = C.createGain(); lg.gain.value = 0; lfo.connect(lg); lg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(AU.master); o.start(); lfo.start();
    AU.eng = { o, f, g, lfo, lg };
  } catch (e) { AU.ctx = null; }
}
function sfx(type, vol) {
  if (!AU.ctx || !opts.snd) return; const C = AU.ctx, t = C.currentTime;
  const v = vol === undefined ? 1 : vol;
  if (type === 'shot' || type === 'boom' || type === 'hit') {
    const s = C.createBufferSource(); s.buffer = AU.noise; const f = C.createBiquadFilter(); f.type = 'lowpass';
    const g = C.createGain(); const len = type === 'boom' ? 1.4 : type === 'hit' ? 0.08 : 0.22;
    f.frequency.value = type === 'boom' ? 500 : type === 'hit' ? 2500 : 1800;
    g.gain.setValueAtTime((type === 'boom' ? 1.2 : 0.55) * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f); f.connect(g); g.connect(AU.master); s.start(t); s.stop(t + len);
  } else {
    const notes = type === 'cash' ? [880, 1320] : type === 'pass' ? [523, 659, 784, 1046] : type === 'fail' ? [392, 330, 262] : [660];
    notes.forEach((n, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = type === 'pass' ? 'triangle' : 'sine'; o.frequency.value = n; g.gain.setValueAtTime(0.0001, t + i * 0.11); g.gain.exponentialRampToValueAtTime(0.25 * v, t + i * 0.11 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.11 + 0.3); o.connect(g); g.connect(AU.master); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.35); });
  }
}
function engineSound(v) {
  if (v && !isFinite(v.speed)) v.speed = 0;
  if (!AU.eng) return; const t = AU.ctx.currentTime;
  if (!v) { AU.eng.g.gain.setTargetAtTime(0, t, 0.1); AU.eng.lg.gain.setTargetAtTime(0, t, 0.1); return; }
  if (v.type === 'plane') { AU.eng.o.frequency.setTargetAtTime(55 + v.throttle * 90, t, 0.1); AU.eng.f.frequency.setTargetAtTime(500 + v.throttle * 900, t, 0.1); AU.eng.g.gain.setTargetAtTime(0.03 + v.throttle * 0.06, t, 0.1); AU.eng.lg.gain.setTargetAtTime(0, t, 0.1); }
  else if (v.type === 'car' || v.type === 'boat') { AU.eng.o.frequency.setTargetAtTime(45 + Math.abs(v.speed) * 3.2, t, 0.05); AU.eng.f.frequency.setTargetAtTime(300 + Math.abs(v.speed) * 12, t, 0.1); AU.eng.g.gain.setTargetAtTime(0.09, t, 0.1); AU.eng.lg.gain.setTargetAtTime(0, t, 0.1); }
  else { AU.eng.o.frequency.setTargetAtTime(38 + v.rotor * 30, t, 0.1); AU.eng.f.frequency.setTargetAtTime(260, t, 0.1); AU.eng.g.gain.setTargetAtTime(0.05 * v.rotor, t, 0.1); AU.eng.lg.gain.setTargetAtTime(0.06 * v.rotor, t, 0.1); }
}

// ---------- Eingabe ----------
const keys = {};
const inp = { mx: 0, my: 0, lookX: 0, lookY: 0, fire: false, aim: false, jump: false, down: false, sprint: false, lastLook: 0 };
const pressed = new Set();
const press = k => pressed.add(k);
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.repeat) return; keys[e.code] = true;
  const m = { KeyF: 'enter', Enter: 'enter', KeyE: 'act', KeyQ: 'weap', KeyM: 'map', KeyC: 'char', KeyV: 'view', Tab: 'wheel', Escape: 'pause', KeyP: 'pause', Space: 'space' };
  if (m[e.code]) press(m[e.code]);
  const cs = { KeyE: 'E', Space: 'SPRUNG', ShiftLeft: 'RENNEN', ShiftRight: 'RENNEN', KeyQ: 'WAFFE' }[e.code]; if (cs) { cheatInput(cs); holdDown(cs); }
  if (e.code === 'KeyF' || e.code === 'Enter' || e.code === 'KeyE') IE.exitHold = performance.now();
  if (/^Digit[1-7]$/.test(e.code)) press('w' + e.code.slice(5));
  if (e.code === 'KeyB' && game.state === 'play' && !uiOpen() && IE.dropBomb) IE.dropBomb();
  if (e.code === 'KeyR' && game.state === 'play' && !uiOpen() && IE.fireMissile) IE.fireMissile();
  if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; const cs = { KeyE: 'E', Space: 'SPRUNG', ShiftLeft: 'RENNEN', ShiftRight: 'RENNEN', KeyQ: 'WAFFE' }[e.code]; if (cs) holdUp(cs); if (e.code === 'KeyF' || e.code === 'Enter' || e.code === 'KeyE') IE.exitHold = null; });
let locked = false;
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
canvas.addEventListener('mousedown', e => {
  if (isTouch) return;
  if (!locked && game.state === 'play' && !uiOpen()) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (er) { } }
  if (e.button === 0) inp.fire = true; if (e.button === 2) { inp.aim = true; cheatInput('ZIELEN'); holdDown('ZIELEN'); }
  if (dlg.active) press('space');
});
addEventListener('mouseup', e => { if (e.button === 0) inp.fire = false; if (e.button === 2) { inp.aim = false; holdUp('ZIELEN'); } });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (locked || (!isTouch && opts.ctrl === 'kbm' && game.state === 'play' && !uiOpen() && e.target === canvas && (e.movementX || e.movementY))) { inp.lookX += e.movementX; inp.lookY += e.movementY; inp.lastLook = performance.now(); } });
addEventListener('wheel', e => { if (game.state === 'play' && !uiOpen()) press(e.deltaY > 0 ? 'weap' : 'weapPrev'); }, { passive: true });

// Touch
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
const touchBtn = {};
// Lange gedrückte Knöpfe (für Cheats mit „lang“ und Rausspringen)
const LONG_SYM = { tAct: 'E', tJump: 'SPRUNG', tSprint: 'RENNEN', tAim: 'ZIELEN', tWeap: 'WAFFE' }, holdT = {};
function holdDown(sym) { holdT[sym] = performance.now(); if (sym === 'EINAUS') IE.exitHold = performance.now(); }
function holdUp(sym) { const t = holdT[sym]; holdT[sym] = 0; if (sym === 'EINAUS' || sym === 'E') IE.exitHold = null; if (t && performance.now() - t >= 600 && sym !== 'EINAUS') cheatInput(sym + '_LANG'); }
function bindBtn(id, down, up) {
  const el = $(id); let isDown = false;
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); isDown = true; if (LONG_SYM[id]) holdDown(LONG_SYM[id]); if (id === 'tEnter') holdDown('EINAUS'); down && down(); audioInit(); });
  const end = e => { el.classList.remove('on'); if (isDown) { isDown = false; if (LONG_SYM[id]) holdUp(LONG_SYM[id]); if (id === 'tEnter') holdUp('EINAUS'); } up && up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', end);
}
bindBtn('tDrift', () => inp.drift = true, () => inp.drift = false);
bindBtn('tBomb', () => { if (IE.dropBomb) IE.dropBomb(); });
bindBtn('tMissile', () => { if (IE.fireMissile) IE.fireMissile(); });
bindBtn('tFire', () => inp.fire = true, () => inp.fire = false);
bindBtn('tJump', () => { inp.jump = true; press('space'); cheatInput('SPRUNG'); }, () => inp.jump = false);
bindBtn('tDown', () => inp.down = true, () => inp.down = false);
bindBtn('tEnter', () => press('enter'));
bindBtn('tAct', () => { press('act'); cheatInput('E'); });
bindBtn('tWeap', () => { press('weap'); cheatInput('WAFFE'); });
bindBtn('tSprint', () => { cheatInput('RENNEN'); inp.sprintToggle = !inp.sprintToggle; $('tSprint').classList.toggle('on', inp.sprintToggle); });
bindBtn('tAim', () => { inp.aim = true; cheatInput('ZIELEN'); }, () => inp.aim = false);
$('wheelBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if ($('wheel').hidden) openWheel(); else closeModals(); });
$('wheel').addEventListener('pointerdown', e => { if (e.target.id === 'wheel' || e.target.id === 'wheelRing') closeModals(); });
bindBtn('tMap', () => press('map')); bindBtn('tView', () => press('view')); $('hudMap').addEventListener('click', () => press('map')); $('hudMenu').addEventListener('click', () => press('pause')); bindBtn('tChar', () => press('char')); bindBtn('tMenu', () => press('pause'));
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  audioInit();
  if (dlg.active) { press('space'); return; }
  if (e.clientX < innerWidth * 0.42 && joy.id === null) {
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
    const b = $('joyBase'), k = $('joyKnob'); b.style.display = k.style.display = 'block';
    b.style.left = k.style.left = e.clientX + 'px'; b.style.top = k.style.top = e.clientY + 'px';
  } else if (look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
});
addEventListener('pointermove', e => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy), R = 56;
    if (l > R) { dx *= R / l; dy *= R / l; }
    joy.x = dx / R; joy.y = -dy / R; $('joyKnob').style.left = (joy.ox + dx) + 'px'; $('joyKnob').style.top = (joy.oy + dy) + 'px';
  } else if (e.pointerId === look.id) {
    inp.lookX += (e.clientX - look.x) * 2.2; inp.lookY += (e.clientY - look.y) * 2.2; look.x = e.clientX; look.y = e.clientY; inp.lastLook = performance.now();
  }
});
const endPtr = e => {
  if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $('joyBase').style.display = $('joyKnob').style.display = 'none'; }
  if (e.pointerId === look.id) look.id = null;
};
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);

function readMove() {
  let x = 0, y = 0;
  if (keys.KeyW || keys.ArrowUp) y += 1; if (keys.KeyS || keys.ArrowDown) y -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1; if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (joy.id !== null) { x += joy.x; y += joy.y; }
  inp.mx = clamp(x, -1, 1); inp.my = clamp(y, -1, 1);
  inp.sprint = keys.ShiftLeft || keys.ShiftRight || inp.sprintToggle;
  inp.hold = { space: keys.Space || inp.jump, down: keys.ShiftLeft || keys.ShiftRight || keys.ControlLeft || inp.down };
}

// ---------- Cheat-Codes ----------
const CHEATS = [
  { seq: ['E', 'E', 'ZIELEN', 'SPRUNG', 'RENNEN'], name: 'Helikopter', f() { const f = IE.fwd(P.yaw), x = P.pos.x + f.x * 12, z = P.pos.z + f.z * 12; IE.spawnHeli(scene, 'aquila', x, Math.max(IE.supportH(x, z, P.pos.y + 3), 0.5), z, P.yaw); } },
  { seq: ['ZIELEN', 'ZIELEN', 'E', 'E', 'SPRUNG'], name: 'Alle Waffen', f() { for (const w of IE.weapons) S.weapons[w.id] = w.id === 'faust' ? 0 : Math.max(S.weapons[w.id] || 0, w.clip * 3); updateGunModel(); } },
  { seq: ['WAFFE', 'E', 'WAFFE', 'E', 'ZIELEN'], name: 'Live-Stream zuschauen', f() { if (!ONL()) { toast('Zuschauen geht nur im Online-Modus (Lobby)'); return; } const live = IEonline.livePeers ? IEonline.livePeers() : []; if (live.length) startSpectate(live[0].r); else toast('Gerade streamt niemand in deiner Lobby'); } },
  { seq: ['WAFFE', 'WAFFE', 'E', 'ZIELEN'], name: 'Minigun', f() { S.weapons.minigun = Math.max(S.weapons.minigun || 0, 1200); S.cur = 'minigun'; updateGunModel(); } },
  { seq: ['SPRUNG', 'SPRUNG', 'E', 'RENNEN'], name: 'Supersportwagen', f() { const f = IE.fwd(P.yaw); IE.spawnCar(scene, 'toro', P.pos.x + f.x * 7, P.pos.z + f.z * 7, P.yaw); } },
  { seq: ['RENNEN', 'SPRUNG', 'RENNEN', 'SPRUNG', 'E'], name: 'Panzer', f() { const f = IE.fwd(P.yaw); const v = IE.spawnCar(scene, 'panzer', P.pos.x + f.x * 9, P.pos.z + f.z * 9, P.yaw); v.health = v.maxHealth = 6000; } },
  { seq: ['E', 'ZIELEN', 'E', 'ZIELEN', 'SPRUNG'], name: 'Kampfjet in der Luft', f() {
      const f = IE.fwd(P.yaw), v = IE.spawnPlane(scene, 'caccia', P.pos.x - f.x * 20, P.pos.z - f.z * 20, P.yaw, Math.max(0, IE.groundH(P.pos.x, P.pos.z)) + 220);
      v.speed = 120; v.throttle = 0.75; v.onGround = false; leaveVehicle(); P.veh = v; v.driver = 'player'; P.swim = P.under = false; P.interior = null; $('speed').hidden = false; cam.yaw = v.yaw; } },
  { seq: ['RENNEN', 'RENNEN', 'E', 'E'], name: 'Gesundheit & Weste', f() { P.health = maxHP(); S.armor = 100; P.o2 = 1; } },
  { seq: ['E', 'SPRUNG', 'E', 'SPRUNG', 'ZIELEN'], name: 'Fahndung gelöscht', f() { game.wanted = 0; for (const v of IE.vehicles) if (v.police && v !== P.veh) v.removeMe = true; for (const n of IE.npcs) if (n.kind === 'police') n.remove = true; } },
  { seq: ['ZIELEN', 'SPRUNG', 'ZIELEN', 'SPRUNG', 'RENNEN'], name: '5 Sterne', f() { setWanted(5); } },
  { seq: ['SPRUNG', 'ZIELEN', 'RENNEN', 'E', 'SPRUNG'], name: '+ 250.000 € (nur einmal)', f() { if (S.cheat250) { toast('Diesen Code kann man nur einmal benutzen', 2.5); sfx('fail'); return false; } S.cheat250 = true; addMoney(250000); saveGame(); } },
  { seq: ['SPRUNG', 'SPRUNG', 'SPRUNG', 'SPRUNG'], name: 'Supersprung', toggle: 'jump' },
  { seq: ['RENNEN', 'RENNEN', 'RENNEN', 'E'], name: 'Superschnell laufen', toggle: 'run' },
  { seq: ['WAFFE', 'E', 'WAFFE', 'E'], name: 'Unendlich Munition', toggle: 'ammo' },
  { seq: ['ZIELEN', 'WAFFE', 'ZIELEN', 'WAFFE'], name: 'Explosive Kugeln', toggle: 'boom' },
  { seq: ['SPRUNG', 'E', 'SPRUNG', 'E', 'SPRUNG'], name: 'Mond-Schwerkraft', toggle: 'moon' },
  { seq: ['RENNEN', 'E', 'ZIELEN', 'WAFFE'], name: 'Nie gesucht', toggle: 'nowanted', on() { game.wanted = 0; } },
  { seq: ['ZIELEN', 'ZIELEN', 'ZIELEN', 'E'], name: 'Privatjet in der Luft', f() {
      const f = IE.fwd(P.yaw), v = IE.spawnPlane(scene, 'jet', P.pos.x - f.x * 25, P.pos.z - f.z * 25, P.yaw, Math.max(0, IE.groundH(P.pos.x, P.pos.z)) + 250);
      v.speed = 110; v.throttle = 0.7; v.onGround = false; leaveVehicle(); P.veh = v; v.driver = 'player'; P.swim = P.under = false; P.interior = null; P.fly = false; $('speed').hidden = false; cam.yaw = v.yaw; } },
  { seq: ['E_LANG', 'SPRUNG_LANG', 'E_LANG', 'SPRUNG_LANG'], name: 'Flug-Yacht', f() { spawnAirship(); } },
  { seq: ['ZIELEN', 'RENNEN', 'ZIELEN', 'RENNEN', 'E'], name: 'Zombie-Apokalypse', toggle: 'zombies', on() { zombieStart(); }, off() { zombieEnd(); } },
  { seq: ['E', 'E', 'E', 'RENNEN', 'RENNEN'], name: '+ 1 Stufe Geld-Multiplikator', f() { S.up = S.up || {}; S.up.geld = upLvl('geld') + 1; } }
];
let cheatBuf = [];
function cheatInput(sym) {
  if (game.state !== 'play' || uiOpen() || dlg.active) return;
  const now = performance.now(); cheatBuf = cheatBuf.filter(c => now - c.t < (sym.endsWith('_LANG') ? 12000 : 6000)); cheatBuf.push({ s: sym, t: now });
  const isLong = sym.endsWith('_LANG'), seq = cheatBuf.map(c => c.s).filter(s => s.endsWith('_LANG') === isLong);
  for (const c of CHEATS.slice().sort((a, b) => b.seq.length - a.seq.length)) {
    if (c.seq.some(x => x.endsWith('_LANG')) !== isLong) continue;
    if (seq.length < c.seq.length || c.seq.some((x, i) => seq[seq.length - c.seq.length + i] !== x)) continue;
    cheatBuf = [];
    runCheat(c); return;
  }
}
function runCheat(c) {
  if (game.state !== 'play') { toast('Starte zuerst ein Spiel', 2); return; }
  if (c.toggle) { game.ch[c.toggle] = !game.ch[c.toggle]; if (game.ch[c.toggle] && c.on) c.on(); if (!game.ch[c.toggle] && c.off) c.off(); sfx('pass'); if (c.toggle !== 'zombies') banner('Cheat ' + (game.ch[c.toggle] ? 'an' : 'aus'), c.name, '', 2.5); return; }
  if (c.f() === false) return; sfx('pass'); banner('Cheat aktiviert', c.name, '', 2.5);
}

// ---------- Spielzustand ----------
const game = { ch: {}, state: 'load', time: 0, wanted: 0, seenT: 0, dead: false, deadT: 0, cityActive: null };
const P = { pos: new T.Vector3(), vy: 0, yaw: 0, h: null, veh: null, health: 100, onGround: true, phase: 0, swim: false, fireT: 0, aimT: 0, hurtT: 0, o2: 1, under: false };
const cam = { yaw: 0, pitch: 0.28, dist: 5.5, cur: new T.Vector3(), target: new T.Vector3() };
let missionBeam, waypoint = null, wpBeam;
const effects = [];
const pickups = [];

const MODAL_IDS = ['shopModal', 'mapModal', 'charModal', 'pauseModal', 'wheel', 'boardModal', 'lobbyModal', 'adminModal', 'upModal', 'skinModal', 'xModal', 'packsModal', 'phoneModal', 'tvModal'];
function uiOpen() { return MODAL_IDS.some(id => $(id) && !$(id).hidden); }
function closeModals() { document.body.classList.remove('modalopen'); MODAL_IDS.forEach(id => { if ($(id)) $(id).hidden = true; }); if (window.IE && IE.onCloseModals) try { IE.onCloseModals(); } catch (e) { } }

// ---------- Waffenrad ----------
const GUN_SVG = {
  revolver: '<rect x="20" y="12" width="36" height="7" rx="2"/><circle cx="30" cy="18" r="6"/><rect x="18" y="20" width="10" height="16" rx="2" transform="rotate(14 23 28)"/>',
  deagle: '<rect x="14" y="10" width="46" height="11" rx="2"/><rect x="20" y="19" width="11" height="18" rx="2" transform="rotate(12 25 28)"/>',
  uzi: '<rect x="20" y="12" width="40" height="11" rx="2"/><rect x="36" y="21" width="7" height="17"/><rect x="58" y="15" width="8" height="4"/>',
  ak: '<rect x="8" y="12" width="60" height="8" rx="2"/><path d="M36 19 l6 0 l6 15 l-7 2 z"/><rect x="2" y="13" width="10" height="9" rx="2"/><rect x="66" y="14" width="10" height="3"/>',
  kampf: '<rect x="8" y="12" width="64" height="8" rx="2"/><rect x="30" y="19" width="12" height="12" rx="3"/><rect x="2" y="14" width="10" height="9" rx="2"/>',
  lmg: '<rect x="6" y="11" width="66" height="9" rx="2"/><rect x="28" y="19" width="16" height="10" rx="2"/><rect x="60" y="20" width="2" height="12"/><rect x="66" y="20" width="2" height="12"/>',
  heavysniper: '<rect x="2" y="17" width="76" height="7" rx="2"/><rect x="22" y="7" width="26" height="7" rx="3"/><rect x="70" y="14" width="8" height="12" rx="1"/>',
  granat: '<rect x="14" y="10" width="40" height="14" rx="5"/><rect x="50" y="13" width="22" height="8" rx="2"/><rect x="24" y="22" width="9" height="13" rx="2"/>',
  rpg: '<rect x="2" y="13" width="64" height="9" rx="3"/><path d="M64 10 l14 7 l-14 7 z"/><rect x="22" y="21" width="7" height="12"/><rect x="40" y="21" width="7" height="10"/>',
  laser: '<rect x="8" y="11" width="56" height="12" rx="6"/><rect x="62" y="14" width="14" height="6" rx="3"/><rect x="26" y="22" width="9" height="13" rx="2"/><circle cx="20" cy="17" r="3" fill="#5ff3ff"/>',
  faust: '<rect x="24" y="10" width="30" height="22" rx="7"/><rect x="28" y="6" width="6" height="10" rx="3"/><rect x="35" y="5" width="6" height="10" rx="3"/><rect x="42" y="6" width="6" height="10" rx="3"/>',
  pistola: '<rect x="18" y="12" width="40" height="9" rx="2"/><rect x="22" y="19" width="10" height="17" rx="2" transform="rotate(12 27 27)"/>',
  mitra: '<rect x="12" y="12" width="54" height="10" rx="2"/><rect x="40" y="20" width="8" height="15"/><rect x="24" y="20" width="8" height="13" rx="2"/><rect x="62" y="15" width="10" height="4"/>',
  pompa: '<rect x="6" y="13" width="66" height="6" rx="2"/><rect x="22" y="18" width="22" height="6" rx="2"/><rect x="2" y="15" width="12" height="12" rx="2" transform="rotate(-10 8 20)"/>',
  assalto: '<rect x="8" y="12" width="62" height="9" rx="2"/><rect x="34" y="20" width="8" height="16" rx="2" transform="rotate(10 38 28)"/><rect x="2" y="13" width="12" height="13" rx="2"/><rect x="66" y="14" width="12" height="4"/><rect x="40" y="7" width="12" height="5"/>',
  cecchino: '<rect x="4" y="16" width="74" height="6" rx="2"/><rect x="26" y="7" width="22" height="6" rx="3"/><rect x="2" y="17" width="16" height="12" rx="2"/><rect x="30" y="21" width="7" height="12" rx="2"/>',
  minigun: '<rect x="30" y="8" width="44" height="3"/><rect x="30" y="13" width="44" height="3"/><rect x="30" y="18" width="44" height="3"/><rect x="30" y="23" width="44" height="3"/><rect x="10" y="6" width="24" height="24" rx="4"/><rect x="14" y="28" width="8" height="10" rx="2"/>'
};
function gunIcon(id) { return `<svg viewBox="0 0 80 40" width="64" height="32" fill="currentColor" aria-hidden="true">${GUN_SVG[id] || ''}</svg>`; }
function openWheel() {
  if (P.veh) { toast('Im Fahrzeug nicht möglich'); return; }
  const ring = $('wheelRing'); ring.innerHTML = '';
  const list = IE.weapons.filter(w => S.weapons[w.id] !== undefined), n = list.length;
  ring.style.setProperty('--wr', n > 9 ? 'min(40vmin, 290px)' : '');
  list.forEach((w, i) => {
    const own = S.weapons[w.id] !== undefined, a = -Math.PI / 2 + i / n * Math.PI * 2;
    const b = document.createElement('button'); b.className = 'wslot' + (S.cur === w.id ? ' cur' : '') + (own ? '' : ' locked');
    b.style.left = `calc(50% + ${Math.cos(a)} * var(--wr))`; b.style.top = `calc(50% + ${Math.sin(a)} * var(--wr))`;
    b.innerHTML = `${gunIcon(w.id)}<span class="wn">${w.name}</span><span class="wa">${own ? (w.id === 'faust' ? '∞' : S.weapons[w.id]) : 'Armeria · ' + fmt(w.price)}</span>`;
    b.disabled = !own;
    b.addEventListener('pointerenter', () => { $('wheelInfo').innerHTML = `<b>${w.name}</b><br>${own ? 'Schaden ' + w.dmg + ' · Reichweite ' + w.range + ' m' : 'Nicht im Besitz'}`; });
    b.addEventListener('click', e => { e.stopPropagation(); S.cur = w.id; updateGunModel(); closeModals(); sfx('beep', 0.5); });
    ring.appendChild(b);
  });
  $('wheelInfo').innerHTML = `<b>${curWeapon().name}</b><br>${n < IE.weapons.length ? 'Weitere Waffen gibt es in der Armeria' : 'Waffe wählen'}`;
  $('wheel').hidden = false; if (locked) document.exitPointerLock();
}
function updateWheelBtn() {
  const w = curWeapon(); const k = w.id + ':' + (S.weapons[w.id] || 0);
  if (game.wbk === k) return; game.wbk = k;
  $('wheelBtn').innerHTML = `${gunIcon(w.id)}<span>${w.id === 'faust' ? 'Fäuste' : S.weapons[w.id]}</span>`;
}
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) closeModals(); }));

// ---------- Spieler ----------
function buildPlayerModel() {
  if (P.h) scene.remove(P.h.group);
  const sk = S.skin && IE.skinById[S.skin];
  P.h = IE.makeHuman(sk ? sk.look : IE.chars[S.char]); scene.add(P.h.group);
  updateGunModel();
}
const GUN_LEN = { pistola: 0.28, revolver: 0.32, deagle: 0.36, mitra: 0.45, uzi: 0.38, cecchino: 1.1, heavysniper: 1.35, minigun: 1.0, rpg: 1.2, granat: 0.7, laser: 0.9, lmg: 1.0 };
function updateGunModel() { const w = IE.weaponById[S.cur]; IE.setGunLen(P.h, !w || w.id === 'faust' ? 0 : GUN_LEN[w.id] || 0.8, w && (w.id === 'minigun' || w.id === 'rpg') ? 2.6 : w && w.id === 'granat' ? 2 : 1); }
function placePlayer(x, z) {
  const p = { x, z };
  for (let i = 0; i < 4; i++) IE.pushOut(p, 0.5, IE.groundH(p.x, p.z), 1.8);
  P.pos.set(p.x, Math.max(IE.supportH(p.x, p.z, IE.groundH(p.x, p.z) + 2.5), -1.25) + 0.05, p.z); P.vy = 0;
}
function cityOf(x, z) { let best = null, bd = 1e9; for (const c of IE.cities) { const d = Math.hypot(x - c.x, z - c.z); if (d < bd) { bd = d; best = c; } } return { c: best, d: bd }; }

// ---------- Effekte ----------
const bubbleGeo = new T.SphereGeometry(0.09, 6, 4), bubbleMat = new T.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.7 });
function bubble(x, y, z) {
  for (let i = 0; i < 3; i++) {
    const m = new T.Mesh(bubbleGeo, bubbleMat); m.position.set(x + (Math.random() - 0.5) * 0.3, y + i * 0.15, z + (Math.random() - 0.5) * 0.3); m.scale.setScalar(0.6 + Math.random()); scene.add(m);
    effects.push({ o: m, t: 0, life: 4, upd(e, d) { m.position.y += d * (1.4 + i * 0.2); m.position.x += Math.sin(e.t * 6 + i) * d * 0.2; if (m.position.y > -0.1) e.t = e.life; }, kill() { scene.remove(m); } });
  }
}
const tracerMat = new T.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
const tracerMats = {};
function tracer(a, b, color, life) {
  const mat = color ? (tracerMats[color] = tracerMats[color] || new T.LineBasicMaterial({ color })) : tracerMat;
  const g = new T.BufferGeometry().setFromPoints([a, b]); const l = new T.Line(g, mat); scene.add(l);
  effects.push({ o: l, t: 0, life: life || 0.06, kill() { scene.remove(l); g.dispose(); } });
}
const flashGeo = new T.SphereGeometry(0.12, 6, 4), flashMat = new T.MeshBasicMaterial({ color: 0xffd27a });
function flash(p) { const m = new T.Mesh(flashGeo, flashMat); m.position.copy(p); scene.add(m); effects.push({ o: m, t: 0, life: 0.05, kill() { scene.remove(m); } }); }
const boomMat = new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 }), smokeMat = new T.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.6 });
function explosion(p, radius) {
  if (IE.addScorch) IE.addScorch(p, radius);
  const m = new T.Mesh(new T.SphereGeometry(1, 16, 10), boomMat.clone()); m.position.copy(p); scene.add(m);
  effects.push({ o: m, t: 0, life: 0.9, upd(e) { const k = e.t / e.life; m.scale.setScalar(1 + k * radius); m.material.opacity = 0.9 * (1 - k); }, kill() { scene.remove(m); m.material.dispose(); } });
  for (let i = 0; i < 6; i++) { const s = new T.Mesh(new T.SphereGeometry(1.5, 8, 6), smokeMat.clone()); s.position.copy(p).add(new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 2, (Math.random() - 0.5) * 4)); scene.add(s); const vy = 2 + Math.random() * 3; effects.push({ o: s, t: 0, life: 3, upd(e, dt) { s.position.y += vy * dt; s.scale.setScalar(1 + e.t); s.material.opacity = 0.6 * (1 - e.t / e.life); }, kill() { scene.remove(s); s.material.dispose(); } }); }
  sfx('boom', clamp(1 - p.distanceTo(P.pos) / 300, 0.1, 1));
  // Schaden
  if (!game.dead && p.distanceTo(P.veh ? P.veh.pos : P.pos) < radius * 1.5) hurtPlayer(P.veh ? 30 : 70);
  for (const n of IE.npcs) if (!n.dead && n.pos.distanceTo(p) < radius * 1.5) damageNPC(n, 200, true);
  for (const v of IE.vehicles) if (!v.dead && v.pos.distanceTo(p) < radius) { v.health -= 400; v.shotT = game.time; }
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) { const e = effects[i]; e.t += dt; if (e.upd) e.upd(e, dt); if (e.t >= e.life) { e.kill(); effects.splice(i, 1); } }
}

// ---------- UI-Helfer ----------
let toastT = 0, bannerT = 0, gainT = 0;
function toast(t, sec) { $('toast').textContent = t; $('toast').hidden = false; toastT = sec || 2.5; }
function banner(k, h, m, sec) { $('banner').innerHTML = `<div class="in"><div class="k">${k}</div><div class="h">${h}</div>${m ? `<div class="m">${m}</div>` : ''}</div>`; $('banner').hidden = false; bannerT = sec || 4; }
const UPGRADES = [
  { id: 'geld', name: 'Geld-Multiplikator', base: 15000, grow: 1.55, eff: l => `× ${(1 + 0.25 * l).toFixed(2)} auf alles verdiente Geld` },
  { id: 'leben', name: 'Lebensenergie', base: 8000, grow: 1.45, eff: l => `${100 + 20 * l} Lebenspunkte` },
  { id: 'schaden', name: 'Waffenschaden', base: 12000, grow: 1.5, eff: l => `+ ${10 * l} % Schaden` },
  { id: 'tempo', name: 'Lauftempo', base: 6000, grow: 1.4, eff: l => `+ ${6 * l} % Tempo zu Fuß` },
  { id: 'panzerung', name: 'Panzerung', base: 7000, grow: 1.45, eff: l => `− ${Math.round((1 - Math.pow(0.93, l)) * 100)} % Schaden an dir` }
];
const upLvl = id => (S.up && S.up[id]) || 0;
const upCost = u => Math.round(u.base * Math.pow(u.grow, upLvl(u.id)) / 100) * 100;
const moneyMult = () => 1 + 0.25 * upLvl('geld');
const maxHP = () => 100 + 20 * upLvl('leben');
const dmgMult = () => 1 + 0.1 * upLvl('schaden');
// ---------- Kleiderschrank (Skins) ----------
const skinShots = {};
let skinR = null;
function skinShot(sk) {
  if (skinShots[sk.id]) return skinShots[sk.id];
  try {
    if (!skinR) {
      const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(120, 150); r.outputEncoding = T.sRGBEncoding;
      const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0x666666, 1.0)); const dl = new T.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 3); sc.add(dl);
      const cm = new T.PerspectiveCamera(32, 120 / 150, 0.1, 20); cm.position.set(0, 1.35, 4.2); cm.lookAt(0, 1.05, 0);
      skinR = { r, sc, cm };
    }
    const h = IE.makeHuman(sk.look); h.group.rotation.y = 0.45; IE.animHuman(h, 0.6, 0.25, false, false); skinR.sc.add(h.group);
    skinR.r.render(skinR.sc, skinR.cm); skinShots[sk.id] = skinR.r.domElement.toDataURL('image/png');
    skinR.sc.remove(h.group);
  } catch (e) { skinShots[sk.id] = ''; }
  return skinShots[sk.id];
}
const isAdm = () => !!(window.IEaccount && IEaccount.admin);
const ownsSkin = sk => sk.price === 0 && !sk.admin || (S.skins || []).includes(sk.id) || isAdm();
function openSkins() {
  closeModals(); $('skinModal').hidden = false; if (locked) document.exitPointerLock();
  $('skinCash').textContent = fmt(S.money);
  const el = $('skinGrid'); el.innerHTML = '';
  const cur = S.skin || S.char;
  for (const sk of IE.skins) {
    if (sk.admin && !isAdm()) continue;
    if (sk.fromPack && !(S.packs || []).includes(sk.fromPack) && !isAdm()) continue;
    const own = ownsSkin(sk), card = document.createElement('button'); card.className = 'skin' + (cur === sk.id ? ' cur' : '') + (own ? '' : ' locked');
    card.innerHTML = '<img alt=""><span class="sn"></span><span class="sp"></span>';
    card.querySelector('img').src = skinShot(sk);
    card.querySelector('.sn').textContent = sk.name;
    card.querySelector('.sp').textContent = cur === sk.id ? 'Angezogen' : own ? 'Anziehen' : fmt(sk.price);
    card.onclick = () => {
      if (!own) { if (S.money < sk.price) { toast('Zu wenig Geld für ' + sk.name, 2); return; } S.money -= sk.price; S.skins = (S.skins || []).concat(sk.id); sfx('cash'); }
      if (['jack', 'marco', 'sofia'].includes(sk.id)) { S.skin = ''; S.char = sk.id; } else S.skin = sk.id;
      buildPlayerModel(); saveGame(); openSkins(); toast(sk.name + ' angezogen', 1.5);
    };
    el.appendChild(card);
  }
  $('skinCount').textContent = `${IE.skins.filter(s => !s.admin || isAdm()).filter(ownsSkin).length} von ${IE.skins.filter(s => !s.admin || isAdm()).length} Skins freigeschaltet`;
}
function openUpgrades() {
  closeModals(); $('upModal').hidden = false; if (locked) document.exitPointerLock();
  const el = $('upRows'); el.innerHTML = ''; $('upCash').textContent = fmt(S.money);
  for (const u of UPGRADES) {
    const l = upLvl(u.id), c = upCost(u), row = document.createElement('div'); row.className = 'row';
    row.innerHTML = '<div><div class="nm"></div><div class="st"></div></div><div class="acts"><button class="buy"></button></div>';
    row.querySelector('.nm').textContent = `${u.name} · Stufe ${l}`;
    row.querySelector('.st').textContent = `Jetzt: ${u.eff(l)} → nächste Stufe: ${u.eff(l + 1)}`;
    const b = row.querySelector('button'); b.textContent = 'Kaufen · ' + fmt(c); b.disabled = S.money < c;
    b.onclick = () => { if (S.money < upCost(u)) return; S.money -= upCost(u); S.up = S.up || {}; S.up[u.id] = upLvl(u.id) + 1; if (u.id === 'leben') P.health = Math.min(maxHP(), P.health + 20); sfx('cash'); saveGame(); openUpgrades(); };
    el.appendChild(row);
  }
}
function addMoney(v, raw) { if (v > 0 && !raw) v = Math.round(v * moneyMult()); S.money += v; if (v > 0) { $('moneyG').textContent = '+ ' + fmt(v); $('moneyG').style.opacity = 1; gainT = 2; sfx('cash'); } }

// ---------- Dialog ----------
const dlg = { active: false, lines: [], i: 0, done: null };
function showDialog(lines, done) { dlg.active = true; dlg.lines = lines; dlg.i = 0; dlg.done = done; renderDlg(); $('dialog').hidden = false; }
function renderDlg() { const l = dlg.lines[dlg.i]; $('dWho').textContent = l[0]; $('dTxt').textContent = l[1]; }
function advanceDlg() { dlg.i++; if (dlg.i >= dlg.lines.length) { dlg.active = false; $('dialog').hidden = true; const d = dlg.done; dlg.done = null; d && d(); } else renderDlg(); }
$('dialog').addEventListener('pointerdown', e => { e.stopPropagation(); press('space'); });

// ---------- Wanted ----------
function starsN() { return game.wanted > 0 ? Math.max(1, Math.floor(game.wanted + 0.01)) : 0; }
function setWanted(n) { if (game.ch && game.ch.nowanted) { game.wanted = 0; return; } game.wanted = clamp(Math.max(game.wanted, n), 0, 5); game.seenT = 0; }
function addWanted(n) { if (game.ch && game.ch.nowanted) { game.wanted = 0; return; } game.wanted = clamp(game.wanted + n, 0, 5); game.seenT = 0; }

// ---------- Schaden ----------
function hurtPlayer(dmg) {
  if (game.dead) return;
  if (game.ch && game.ch.god) { P.health = maxHP(); P.o2 = 1; return; }
  dmg *= Math.pow(0.93, upLvl('panzerung'));
  if (P.veh && P.veh.type === 'car') { P.veh.health -= dmg * 4; P.veh.shotT = game.time; dmg *= 0.35; }
  if (S.armor > 0) { const a = Math.min(S.armor, dmg * 0.7); S.armor -= a; dmg -= a; }
  P.health -= dmg; P.hurtT = 0.4;
  // Festnahme läuft: die Polizei tötet dich nicht, sie verhaftet dich
  if (P.arrestPending && P.health < maxHP() * 0.2) P.health = maxHP() * 0.2;
  if (P.health <= 0) die();
}
function damageNPC(n, dmg, byPlayer) {
  if (n.dead) return;
  n.health -= dmg; n.alert = true;
  if (n.health <= 0) {
    IE.killNPC(n);
    if (byPlayer) {
      if (n.kind === 'ped') addWanted(game.wanted < 1 ? 1 : 0.5);
      if (n.kind === 'police') addWanted(1);
      if (n.kind === 'soldier') { setWanted(3); addWanted(0.5); for (const o of IE.npcs) if (o.kind === 'soldier') o.alert = true; }
      if (n.mission && mission.coop && ONL()) IEonline.jobKill(mission.def.id, mission.step, n.id);
      if (n.kind === 'enemy') { const amt = n.boss ? 5000 : 40 + (Math.random() * 160 | 0); spawnCash(n.pos, amt); }
      else if (n.kind === 'alien') { spawnCash(n.pos, 400 + (Math.random() * 600 | 0)); game.aliensKilled = (game.aliensKilled || 0) + 1; }
      else if (n.kind === 'zombie') { game.zKills = (game.zKills || 0) + 1; spawnCash(n.pos, 20 + (Math.random() * 60 | 0)); }
      else if (n.kind === 'ped') spawnCash(n.pos, 15 + (Math.random() * 70 | 0));
      else if (n.kind === 'police') spawnCash(n.pos, 60 + (Math.random() * 120 | 0));
      else if (n.kind === 'soldier') spawnCash(n.pos, 120 + (Math.random() * 230 | 0));
    }
  } else if (n.kind === 'ped') { n.state = 'flee'; n.timer = 8; }
}
// ---------- Zombie-Apokalypse ----------
function zombieStart() {
  game.zKills = 0; game.zSpawnT = 0;
  IE.sky.visible = false; scene.background = FOG_Z;
  for (const n of IE.npcs) if (n.kind === 'ped' && !n.dead) { n.state = 'flee'; n.timer = 10; }
  for (let i = 0; i < 12; i++) spawnZombie(25, 60);
  banner('Zombie-Apokalypse', 'Die Toten erheben sich', 'Überlebe! Code nochmal eingeben zum Beenden', 4.5); sfx('fail');
}
function zombieEnd() {
  IE.sky.visible = true; scene.background = null;
  for (const n of IE.npcs) if (n.kind === 'zombie') n.remove = true;
  if (!mission.active) $('obj').hidden = true;
  banner('Apokalypse vorbei', (game.zKills || 0) + ' Zombies erledigt', '', 3.5);
}
function spawnZombie(rMin, rMax) {
  for (let k = 0; k < 8; k++) {
    const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin), x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
    if (!IE.isLand(x, z) || IE.blockedAt(x, z, 1)) continue;
    return IE.spawnNPC(scene, 'zombie', x, z);
  }
}
function zombieSpawner(dt) {
  if (P.interior || game.dead) return;
  game.zSpawnT = (game.zSpawnT || 0) - dt; if (game.zSpawnT > 0) return; game.zSpawnT = 0.7;
  let c = 0; for (const n of IE.npcs) if (n.kind === 'zombie' && !n.dead) { c++; if (n.pos.distanceTo(P.pos) > 160) n.remove = true; }
  const max = (isTouch ? 26 : 36) + Math.min(20, (game.zKills || 0) / 10 | 0);
  if (c < max) spawnZombie(40, 95);
  if (!mission.active) { $('obj').hidden = false; $('obj').innerHTML = `<small>Zombie-Apokalypse</small>${game.zKills || 0} Zombies erledigt · ${c} in der Nähe`; }
}
function spawnCash(p, amt) {
  const m = new T.Mesh(new T.BoxGeometry(0.4, 0.2, 0.25), new T.MeshBasicMaterial({ color: 0x4fd16b }));
  m.position.set(p.x, IE.supportH(p.x, p.z, p.y + 1) + 0.4, p.z); scene.add(m); pickups.push({ m, amt, t: 0 });
}

// ---------- Schießen ----------
const ray = { o: new T.Vector3(), d: new T.Vector3() };
function curWeapon() { return IE.weaponById[S.cur] || IE.weapons[0]; }
function ownedWeapons() { return IE.weapons.filter(w => S.weapons[w.id] !== undefined); }
function cycleWeapon(dir) {
  const list = ownedWeapons(); let i = list.findIndex(w => w.id === S.cur); i = (i + (dir || 1) + list.length) % list.length;
  S.cur = list[i].id; updateGunModel();
}
const HELI_GUN = { id: 'heligun', name: 'Bordkanone', dmg: 40, rate: 0.09, range: 320, spread: 0.02, pellets: 1, auto: true };
function playerShoot(dt) {
  if (P.jailed) return;
  let w = curWeapon();
  P.fireT -= dt;
  if (w.spin && !P.veh) {
    P.spin = inp.fire && !P.under ? Math.min(1, (P.spin || 0) + dt * 2.5) : Math.max(0, (P.spin || 0) - dt * 1.5);
    P.h.gunMesh.rotation.z += P.spin * dt * 40;
    if (P.spin < 1) return;
  }
  if (!inp.fire || P.fireT > 0 || P.under) return;
  if (P.veh && P.veh.m.tank) { P.fireT = 1.5; fireShell(P.veh); return; }
  if (P.veh && P.veh.def.torpedo) { if (!inp.fire || P.fireT > 0) return; P.fireT = 1.4; IE.fireTorpedo(P.veh); return; }
  if (P.veh && (P.veh.type === 'heli' || P.veh.type === 'plane')) { if (!P.veh.def.armed) return; w = HELI_GUN; }
  else {
    if (P.veh && w.id === 'faust') return;
    if (w.id !== 'faust' && S.weapons[w.id] <= 0) { if (P.fireT < -0.4) { toast('Keine Munition – kauf welche in einer Armeria'); P.fireT = 0.6; } return; }
  }
  P.fireT = w.rate;
  if (!w.auto && !isTouch) inp.fire = false;
  if (w.id !== 'faust' && w.id !== 'heligun' && !game.ch.ammo) S.weapons[w.id]--;
  P.aimT = 1.2;
  // Strahl aus der Kamera
  camera.getWorldDirection(ray.d); ray.o.copy(camera.position);
  // Zielhilfe auf Touch-Geräten
  if (isTouch || P.veh) {
    let best = null, bs = P.veh ? 0.3 : 0.16;
    for (const n of IE.npcs) {
      if (n.dead || (n.kind === 'ped' && !n.alert)) continue;
      const to = new T.Vector3(n.pos.x, n.pos.y + 1.2, n.pos.z).sub(ray.o); const dist = to.length(); if (dist > w.range) continue;
      const ang = Math.acos(clamp(to.dot(ray.d) / dist, -1, 1)); if (ang < bs) { bs = ang; best = to.normalize(); }
    }
    for (const v of IE.vehicles) {
      if (v.dead || v === P.veh || !(v.hostile || v.police)) continue;
      const to = new T.Vector3(v.pos.x, v.pos.y + 1, v.pos.z).sub(ray.o); const dist = to.length(); if (dist > w.range) continue;
      const ang = Math.acos(clamp(to.dot(ray.d) / dist, -1, 1)); if (ang < bs) { bs = ang; best = to.normalize(); }
    }
    if (best) ray.d.copy(best);
  }
  const muzzle = new T.Vector3(); (P.veh ? P.veh.group : P.h.gun).getWorldPosition(muzzle); if (P.veh) muzzle.y += 1.3;
  const skip = camera.position.distanceTo(P.veh ? P.veh.pos : P.pos) - 0.5;
  for (let k = 0; k < w.pellets; k++) {
    const d = ray.d.clone(); const sp = w.spread * (inp.aim ? 0.5 : 1) * (P.veh ? 1.6 : 1);
    d.x += (Math.random() - 0.5) * sp * 2; d.y += (Math.random() - 0.5) * sp * 2; d.z += (Math.random() - 0.5) * sp * 2; d.normalize();
    let bestT = IE.rayBoxes(ray.o, d, w.range + skip), hitN = null, hitV = null, head = false;
    for (const n of IE.npcs) {
      if (n.dead || n.kind === 'guard') continue;
      for (const [hy, r, hd] of [[1.2, 0.42, false], [1.76, 0.2, true]]) {
        const cx = n.pos.x - ray.o.x, cy = n.pos.y + hy - ray.o.y, cz = n.pos.z - ray.o.z;
        const tc = cx * d.x + cy * d.y + cz * d.z; if (tc < skip || tc > bestT) continue;
        const d2 = cx * cx + cy * cy + cz * cz - tc * tc; if (d2 < r * r) { bestT = tc; hitN = n; hitV = null; head = hd; }
      }
    }
    for (const v of IE.vehicles) {
      if (v === P.veh || v.dead) continue;
      const r = v.type === 'heli' ? 3 : 1.9, cx = v.pos.x - ray.o.x, cy = v.pos.y + 1 - ray.o.y, cz = v.pos.z - ray.o.z;
      const tc = cx * d.x + cy * d.y + cz * d.z; if (tc < skip || tc > bestT) continue;
      const d2 = cx * cx + cy * cy + cz * cz - tc * tc; if (d2 < r * r) { bestT = tc; hitV = v; hitN = null; }
    }
    let hitR = null;
    if (ONL()) { const rh = IEonline.rayHit(ray.o, d, skip, bestT); if (rh) { bestT = rh.t; hitR = rh.peer; hitN = null; hitV = null; } }
    if (w.id === 'faust') {
      if (ONL()) IEonline.melee(P.pos, P.yaw, w.dmg);
      // Nahkampf: nächster NPC vor dem Spieler
      const f = IE.fwd(P.yaw);
      for (const n of IE.npcs) if (!n.dead && Math.hypot(n.pos.x - (P.pos.x + f.x), n.pos.z - (P.pos.z + f.z)) < 1.3) { damageNPC(n, w.dmg * dmgMult(), true); sfx('hit'); flashHit(); if (n.kind === 'ped') { n.state = 'flee'; n.timer = 8; } }
      return;
    }
    const end = ray.o.clone().addScaledVector(d, Math.min(bestT, w.range + skip));
    if (k === 0 || w.pellets > 1) tracer(muzzle, end, w.laser ? 0x5ff3ff : w.explode ? 0xffa040 : undefined, w.laser || w.explode ? 0.15 : undefined);
    if (w.explode && k === 0) { explosion(end.clone(), w.explode); if (ONL()) IEonline.blast(end, w.explode * 1.4, w.dmg); }
    if (!hitN && !hitV && !hitR && bestT < w.range + skip && IE.addBulletHole) IE.addBulletHole(end, d);
    if (hitR) { IEonline.sendHit(hitR, w.dmg); flashHit(); }
    if (hitN) { damageNPC(hitN, w.dmg * (head ? 2.5 : 1) * dmgMult(), true); flashHit(); }
    if (game.ch.boom && k === 0 && game.time - (game.boomT || 0) > 0.18) { game.boomT = game.time; explosion(end.clone(), 3.5); }
    if (hitV) { hitV.health -= w.dmg * 1.4 * dmgMult(); hitV.shotT = game.time; flashHit(); if (hitV.police) setWanted(Math.max(game.wanted, 1)); if (hitV.traffic && hitV.driver === 'npc' && hitV.ai) { hitV.ai.panic = 6; } }
  }
  flash(muzzle); sfx('shot', w.scope || w.explode ? 1.2 : w.id === 'pistola' ? 0.6 : 0.8);
  // Passanten in der Nähe geraten in Panik; Schüsse in der Stadt locken Polizei
  let witnesses = 0;
  for (const n of IE.npcs) if (n.kind === 'ped' && !n.dead && n.pos.distanceTo(P.pos) < 40) { n.state = 'flee'; n.timer = 8; n.alert = true; witnesses++; }
  if (!mission.active && !P.interior) {
    const cc = cityOf(P.pos.x, P.pos.z), inCity = cc.d < cc.c.r + 80;
    const copNear = IE.npcs.some(n => n.kind === 'police' && !n.dead && n.pos.distanceTo(P.pos) < 90) || IE.vehicles.some(v => v.police && !v.dead && v.pos.distanceTo(P.pos) < 110);
    if (inCity || witnesses > 0 || copNear) {
      if (game.wanted < 1) setWanted(1);
      else { game.wanted = Math.min(5, game.wanted + 0.035 * clamp(w.rate / 0.1, 0.3, 1)); game.seenT = copNear ? 0 : game.seenT; }
    }
  }
}
// Panzergranate
const shellGeo = new T.SphereGeometry(0.25, 8, 6), shellMat = new T.MeshBasicMaterial({ color: 0xffe08a });
function fireShell(v, aimAt) {
  const o = new T.Vector3(); v.m.turret.children[1].getWorldPosition(o);
  let dir;
  if (aimAt) dir = aimAt.clone().sub(o).normalize();
  else { const d = new T.Vector3(); camera.getWorldDirection(d); const f = IE.fwd(v.yaw + v.m.turret.rotation.y); dir = new T.Vector3(f.x, d.y + 0.03, f.z).normalize(); }
  o.addScaledVector(dir, 2.8);
  const m = new T.Mesh(shellGeo, shellMat); m.position.copy(o); scene.add(m);
  const vel = dir.multiplyScalar(140);
  flash(o); sfx('boom', clamp(1 - o.distanceTo(P.pos) / 300, 0.1, 0.5)); v.speed -= 1.5;
  effects.push({ o: m, t: 0, life: 4, upd(e, dt) {
    if (e.hit) return;
    for (let k = 0; k < 4; k++) {
      vel.y -= 9.8 * dt / 4; m.position.addScaledVector(vel, dt / 4);
      const p = m.position; let boom = p.y < IE.groundH(p.x, p.z) || (p.y < 0 && IE.groundH(p.x, p.z) < 0);
      for (const b of IE.collAt(p.x, p.z)) if (b.t === 'box' && p.x > b.minx && p.x < b.maxx && p.z > b.minz && p.z < b.maxz && p.y < b.top && p.y > b.bottom) boom = true;
      for (const n of IE.npcs) if (!n.dead && Math.hypot(n.pos.x - p.x, n.pos.y + 1 - p.y, n.pos.z - p.z) < 1.6) boom = true;
      for (const q of IE.vehicles) if (q !== v && !q.dead && q.pos.distanceTo(p) < 3) boom = true;
      if (v !== P.veh && !game.dead && p.distanceTo(P.veh ? P.veh.pos : P.pos) < 3) boom = true;
      if (boom) { e.hit = true; e.t = e.life; explosion(p.clone(), 6); if (v === P.veh && ONL()) IEonline.blast(p, 9, 160); return; }
    }
  }, kill() { scene.remove(m); } });
}
let hitT = 0; function flashHit() { $('cross').classList.add('hit'); hitT = 0.12; sfx('hit', 0.6); }

// ---------- Fahrzeuge ein/aus ----------
// ---------- Flug-Yacht ----------
function shipLocal(v, x, z) { const c = Math.cos(v.yaw), s = Math.sin(v.yaw), dx = x - v.pos.x, dz = z - v.pos.z; return { lx: dx * c - dz * s, lz: dx * s + dz * c }; }
function shipWorld(v, lx, lz) { const c = Math.cos(v.yaw), s = Math.sin(v.yaw); return new T.Vector3(v.pos.x + lx * c + lz * s, v.pos.y + 0.45, v.pos.z - lx * s + lz * c); }
function deckHalf(lz) { return (lz < 11.5 ? 8 : 8 * Math.max(0, (32 - lz) / 20.5)) * 0.94 - 0.45; }
const helmWorld = (v, back) => shipWorld(v, 0, IE.AIRSHIP.helmZ - (back || 0.8));
function airshipGround(g) {
  P.shipCand = null;
  for (const v of IE.vehicles) {
    if (v.type !== 'airship' || v.dead) continue;
    const deckY = v.pos.y + 0.45; if (P.pos.y < deckY - 2.5 || P.pos.y > deckY + 7) continue;
    let { lx, lz } = shipLocal(v, P.pos.x, P.pos.z);
    if (lz < -31.5 || lz > 31.5 || Math.abs(lx) > deckHalf(lz) + 0.6) continue;
    if (P.pos.y < deckY + 1.6) {
      lz = clamp(lz, -31, 30.5); const hw = Math.max(0.3, deckHalf(lz)); lx = clamp(lx, -hw, hw);
      const A = IE.AIRSHIP;
      if (lz > A.cabinZ0 - 0.4 && lz < A.cabinZ1 + 0.4 && Math.abs(lx) < A.cabinX + 0.4) {
        const dl = [lz - (A.cabinZ0 - 0.4), (A.cabinZ1 + 0.4) - lz, (A.cabinX + 0.4) - Math.abs(lx)], m = Math.min(...dl);
        if (m === dl[1]) lz = A.cabinZ1 + 0.4; else if (m === dl[0]) lz = A.cabinZ0 - 0.4; else lx = Math.sign(lx || 1) * (A.cabinX + 0.4);
      }
      const w = shipWorld(v, lx, lz); P.pos.x = w.x; P.pos.z = w.z;
    }
    P.shipCand = { v, deckY }; return Math.max(g, deckY);
  }
  return g;
}
function updateAirship(v, inp, dt) {
  const px = v.pos.x, py = v.pos.y, pz = v.pos.z, pyaw = v.yaw, piloted = v.driver === 'player';
  v.speed += ((piloted ? (inp.y || 0) * v.maxSpeed : 0) - v.speed) * Math.min(1, dt * 0.5);
  if (piloted) v.yaw -= (inp.x || 0) * 0.45 * dt;
  v.vy += ((piloted ? (inp.up || 0) * 16 : 0) - v.vy) * Math.min(1, dt * 1.5);
  const f = IE.fwd(v.yaw); v.pos.x += f.x * v.speed * dt; v.pos.z += f.z * v.speed * dt; v.pos.y += v.vy * dt;
  const minY = Math.max(IE.groundH(v.pos.x, v.pos.z), 0) + 9; if (v.pos.y < minY) { v.pos.y = minY; v.vy = Math.max(0, v.vy); }
  if (v.pos.y > 1500) v.pos.y = 1500;
  v.group.position.copy(v.pos); v.group.rotation.set(0, v.yaw, 0);
  v.m.fans.forEach(fn => fn.rotation.y += dt * (6 + Math.abs(v.speed)));
  // wer auf dem Deck steht, fliegt mit
  if (!P.veh && P.onShip === v && !P.fly) {
    const d = v.yaw - pyaw, c = Math.cos(d), s = Math.sin(d), rx = P.pos.x - px, rz = P.pos.z - pz;
    P.pos.x = v.pos.x + rx * c + rz * s; P.pos.z = v.pos.z - rx * s + rz * c; P.pos.y += v.pos.y - py; P.yaw += d; cam.yaw += d;
  }
}
function spawnAirship() {
  if (P.veh) { toast('Erst aussteigen'); return; }
  for (const v of IE.vehicles) if (v.type === 'airship' && v.mine) v.removeMe = true;
  P.fly = false; P.interior = null;
  const m = IE.makeAirship(), base = Math.max(IE.groundH(P.pos.x, P.pos.z), 0) + 14;
  const v = { type: 'airship', def: { id: 'imperatore', name: 'Flug-Yacht Imperatore' }, m, group: m.group, pos: new T.Vector3(P.pos.x, base, P.pos.z), yaw: P.yaw, vy: 0, speed: 0, maxSpeed: 75,
    health: 1e9, maxHealth: 1e9, driver: null, owned: true, mine: true, rotor: 0.7, pitch: 0, roll: 0, dead: false, burn: 0 };
  m.group.position.copy(v.pos); m.group.rotation.y = v.yaw; scene.add(m.group); IE.vehicles.push(v);
  const w = helmWorld(v, 1.6); P.pos.copy(w); P.vy = 0; P.onShip = v; cam.yaw = v.yaw; cam.pitch = 0.35;
  banner('Admin', 'Flug-Yacht Imperatore', 'Am Steuerrad F / EIN-AUS zum Fliegen', 4);
}
function airshipBelow() {
  for (const v of IE.vehicles) if (v.type === 'airship' && !v.dead && P.pos.y < v.pos.y - 1 && v.pos.y - P.pos.y < 60 && Math.hypot(P.pos.x - v.pos.x, P.pos.z - v.pos.z) < 40) return v;
  return null;
}
const vehDist = v => v.type === 'airship' ? helmWorld(v).distanceTo(P.pos) : v.pos.distanceTo(P.pos);
function vehReach(v) { if (v.type === 'airship') return 3.6; return v.type === 'heli' ? 6 : v.type === 'plane' ? v.m.L * 0.45 + 2 : v.type === 'boat' ? v.m.L * 0.5 + 2.5 : v.m.tank ? 5 : 3.6; }
function tryEnterExit() {
  if (P.interior) return;
  if (P.ride) { // als Beifahrer aussteigen
    const r = ONL() && IEonline.peers.get(P.ride); P.ride = null; P.h.group.visible = true;
    const yaw = r && r.pr && r.pr.v ? r.pr.v.yaw : P.yaw, f = IE.fwd(yaw), spd = r ? r.spd || 0 : 0, air = P.pos.y - IE.supportH(P.pos.x, P.pos.z, P.pos.y) > 3;
    if (spd > 6 || air) { P.pos.x -= f.z * 2.5; P.pos.z += f.x * 2.5; P.bailV = { x: f.x * spd * 0.8, z: f.z * spd * 0.8 }; P.onGround = false; P.vy = 0; if (air) toast('Fallschirm öffnen: ' + (isTouch ? 'SPRUNG' : 'Leertaste') + ' drücken!', 3); return; }
    placePlayer(P.pos.x - f.z * 1.9, P.pos.z + f.x * 1.9); toast('Ausgestiegen', 1.2); return;
  }
  if (P.veh) {
    const v = P.veh;
    if (v.type === 'airship') { v.driver = null; P.veh = null; const hp = helmWorld(v, 1.8); P.pos.copy(hp); P.vy = 0; P.onShip = v; $('speed').hidden = true; engineSound(null); return; }
    if (IE.vehFast && IE.vehFast(v)) { toast(isTouch ? 'Zum Rausspringen EIN/AUS lange gedrückt halten' : 'Zum Rausspringen F / E lange gedrückt halten', 2); return; }
    v.driver = null; P.veh = null;
    const f = IE.fwd(v.yaw); const side = v.type === 'heli' ? 3 : v.type === 'plane' ? 3.5 : v.type === 'boat' ? v.m.W / 2 + 1.2 : v.m.tank ? 2.6 : 1.8;
    placePlayer(v.pos.x + f.z * side, v.pos.z - f.x * side);
    if (v.type === 'heli') P.pos.y = Math.max(P.pos.y, IE.supportH(P.pos.x, P.pos.z, v.pos.y + 1));
    P.h.group.visible = true; $('speed').hidden = true; engineSound(null);
    return;
  }
  let best = null, bd = 1e9;
  for (const v of IE.vehicles) {
    if (v.dead) continue;
    const d = vehDist(v), lim = vehReach(v);
    if (d < lim && d < bd) { bd = d; best = v; }
  }
  if (!best) { // online: bei einem anderen Spieler als Beifahrer einsteigen
    const r = ONL() && IEonline.nearCarPeer && IEonline.nearCarPeer(P.pos);
    if (r) { P.ride = r.peer; P.fly = false; P.h.group.visible = false; P.swim = P.under = false; toast('Du fährst bei ' + r.name + ' mit · nochmal EIN/AUS zum Aussteigen', 3); }
    return;
  }
  if (best.driver === 'npc') {
    best.driver = null; best.traffic = false; best.ai = null;
    const f = IE.fwd(best.yaw); const n = IE.spawnNPC(scene, 'ped', best.pos.x + f.z * 2.5, best.pos.z - f.x * 2.5); n.state = 'flee'; n.timer = 10;
    if (best.police) addWanted(2); else if (Math.random() < 0.3) setWanted(1);
  }
  if (best.hostile && !best.dead) { toast('Dieses Fahrzeug gehört dem Feind'); return; }
  if (best.def.military && !best.stolen) { best.stolen = true; setWanted(3); toast('Militärfahrzeug gestohlen!'); for (const n of IE.npcs) if (n.kind === 'soldier') n.alert = true; }
  if (best.type === 'airship') cam.pitch = 0.35;
  P.veh = best; best.driver = 'player'; best.traffic = false; best.ai = null; P.swim = false; P.under = false;
  P.h.group.visible = false; $('speed').hidden = false;
  $('spN').textContent = best.def.name;
  cam.yaw = best.yaw;
}

function putInVehicle(v) {
  if (P.veh && P.veh !== v) leaveVehicle();
  P.fly = false; P.ride = null; P.interior = null;
  P.veh = v; v.driver = 'player'; v.traffic = false; v.ai = null; P.swim = false; P.under = false;
  P.h.group.visible = false; $('speed').hidden = false; $('spN').textContent = v.def.name; cam.yaw = v.yaw;
}
// ---------- Flugmodus ----------
function setFly(on, speed) {
  if (on && P.veh) { toast('Erst aussteigen'); return; }
  P.fly = !!on; if (speed) P.flySpeed = speed; P.vy = 0; P.swim = P.under = false;
  toast(P.fly ? `Flugmodus an · ${Math.round((P.flySpeed || 60) * 3.6)} km/h` : 'Flugmodus aus', 2);
}
function flyUpdate(dt, ctrl, mx, my) {
  const sp = P.flySpeed || 60;
  const cp = Math.cos(cam.pitch), f = IE.fwd(cam.yaw);
  const d = new T.Vector3(f.x * cp * my - f.z * mx, -Math.sin(cam.pitch) * my, f.z * cp * my + f.x * mx);
  if (ctrl && inp.hold.space) d.y += 1; if (ctrl && inp.hold.down) d.y -= 1;
  if (d.lengthSq() > 1) d.normalize();
  P.pos.addScaledVector(d, sp * dt);
  P.pos.y = Math.min(2500, Math.max(P.pos.y, IE.groundH(P.pos.x, P.pos.z) + 0.2, -60));
  const moving = d.lengthSq() > 0.01;
  if (moving) P.yaw += angDiff(P.yaw, Math.atan2(d.x, d.z) || P.yaw) * Math.min(1, dt * 8);
  P.h.group.position.copy(P.pos); P.h.group.rotation.set(moving ? 1.35 : 0.15, P.yaw, 0);
  P.h.armL.rotation.x = P.h.armR.rotation.x = moving ? -2.9 : -0.3; P.h.legL.rotation.x = P.h.legR.rotation.x = 0;
  P.onGround = false; P.vy = 0; P.o2 = 1;
  playerShoot(dt);
}

// ---------- Spieler-Update ----------
function updatePlayer(dt) {
  if (game.spectate) return; // beim Zuschauen bewegt sich der eigene Charakter nicht
  if (game.dead) { if (P.ride) { P.ride = null; P.h.group.visible = true; } return; }
  if (P.ride) { // Beifahrer: folgt dem Auto des Fahrers
    const r = ONL() && IEonline.peers.get(P.ride);
    if (!r || !r.pr || !r.pr.v || r.pr.v.t === 'airship' || r.pr.dead) { P.ride = null; P.h.group.visible = true; placePlayer(P.pos.x + 2, P.pos.z); toast('Die Fahrt ist vorbei', 1.6); }
    else { const f = IE.fwd(r.pr.v.yaw || 0); P.pos.set(r.pos.x - f.z * 0.45, r.pos.y, r.pos.z + f.x * 0.45); P.vy = 0; P.onGround = true; P.yaw = r.pr.v.yaw || 0; P.h.group.visible = false; P.aimT -= dt; return; }
  }
  const ctrl = !dlg.active && !uiOpen();
  const mx = ctrl ? inp.mx : 0, my = ctrl ? inp.my : 0;
  if (P.veh) {
    const v = P.veh;
    if (v.type === 'car' && v.drownT > 2.5 && !v.m.tank) { // Auto versinkt: Spieler schwimmt raus
      v.driver = null; P.veh = null; v.sunk = true; P.h.group.visible = true; $('speed').hidden = true; engineSound(null);
      P.pos.set(v.pos.x, Math.max(v.pos.y, -1.2), v.pos.z); P.vy = 0; toast('Dein Auto ist im Wasser versunken – schwimm an Land!', 3); return;
    }
    if (v.type === 'car') { if (v.loop || (IE.loopCheck && IE.loopCheck(v))) IE.loopUpdate(v, dt); else IE.updateCar(v, { x: mx, y: my, brake: ctrl && inp.hold.space, drift: ctrl && (inp.drift || keys.ShiftLeft || keys.ShiftRight) }, dt); if (v.m.tank) v.m.turret.rotation.y += angDiff(v.m.turret.rotation.y, angDiff(v.yaw, cam.yaw)) * Math.min(1, dt * 3); }
    else if (v.type === 'boat') IE.updateBoat(v, { x: mx, y: my, brake: ctrl && inp.hold.space, dive: v.def.kind === 'sub' && ctrl ? (inp.hold.space ? 1 : 0) - (inp.hold.down ? 1 : 0) : 0 }, dt);
    else if (v.type === 'airship') updateAirship(v, { x: mx, y: my, up: ctrl ? (inp.hold.space ? 1 : 0) - (inp.hold.down ? 1 : 0) : 0 }, dt);
    else if (v.type === 'plane') IE.updatePlane(v, { x: mx, y: my, up: ctrl ? (inp.hold.space ? 1 : 0) - (inp.hold.down ? 1 : 0) : 0, brake: ctrl && inp.hold.down && v.throttle < 0.02 }, dt);
    else IE.updateHeli(v, { x: mx, y: my, up: ctrl ? (inp.hold.space ? 1 : 0) - (inp.hold.down ? 1 : 0) : 0 }, dt);
    P.pos.copy(v.pos); P.yaw = v.yaw;
    if (v.type === 'airship') { P.pos.copy(helmWorld(v)); P.h.group.position.copy(P.pos); P.h.group.rotation.set(0, v.yaw, 0); IE.animHuman(P.h, 0, 0, false, false); P.h.armL.rotation.x = P.h.armR.rotation.x = -1.1; P.onShip = v; }
    if (v.dead && v.burn > 2.5) { /* Explosion behandelt */ }
    // Überfahren
    if (v.type === 'car' && Math.abs(v.speed) > 6) for (const n of IE.npcs) {
      if (!n.dead && n.pos.distanceTo(v.pos) < 2.4) { damageNPC(n, 999, true); sfx('hit'); }
    }
    playerShoot(dt);
    return;
  }
  // zu Fuß
  const f = IE.fwd(cam.yaw), r = { x: -f.z, z: f.x };
  let dx = f.x * my + r.x * mx, dz = f.z * my + r.z * mx; const ml = Math.hypot(dx, dz);
  const aiming = inp.aim || P.aimT > 0 || inp.fire;
  P.aimT -= dt;
  if (P.fly) { flyUpdate(dt, ctrl, mx, my); return; }
  const speed = (P.swim ? (P.under ? (inp.sprint && !inp.hold.down ? 5.4 : 4) : (inp.sprint ? 5 : 3.4)) : (inp.sprint ? 7.8 : 4.6) * (aiming && !inp.sprint ? 0.75 : 1) * (S.cur === 'minigun' ? 0.72 : 1)) * (1 + 0.06 * upLvl('tempo')) * (game.ch.run ? 2.4 : 1);
  if (ml > 0.05) { dx /= Math.max(ml, 1); dz /= Math.max(ml, 1); P.pos.x += dx * speed * dt; P.pos.z += dz * speed * dt; }
  if (aiming && !P.swim) P.yaw = cam.yaw; else if (ml > 0.1) P.yaw += angDiff(P.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10);
  IE.pushOut(P.pos, 0.4, P.pos.y, 1.8);
  const g = airshipGround(IE.supportH(P.pos.x, P.pos.z, P.pos.y));
  P.swim = g < -1.3 && P.pos.y < -0.8;
  if (P.swim) {
    const up = ctrl && inp.hold.space, dn = ctrl && inp.hold.down;
    let vy = dn ? -3.6 : up ? 3.6 : 0;
    // unter Wasser: in Blickrichtung tauchen (Kamera nach unten = abwärts)
    if (P.under && !up && !dn && my > 0.1) vy = -Math.sin(cam.pitch) * my * speed * 1.2;
    P.pos.y = clamp(P.pos.y + vy * dt, g + 0.5, -1.25); P.vy = 0; P.onGround = true;
    P.under = P.pos.y < -2.0;
    // an Steg / Mauer aus dem Wasser klettern
    if (!P.under && ml > 0.1) {
      const ax = P.pos.x + dx / Math.max(ml, 1) * 0.9, az = P.pos.z + dz / Math.max(ml, 1) * 0.9;
      for (const b of IE.collAt(ax, az)) if (b.t === 'box' && b.top > -0.8 && b.top < 2.6 && ax >= b.minx - 0.5 && ax <= b.maxx + 0.5 && az >= b.minz - 0.5 && az <= b.maxz + 0.5) {
        P.pos.set(Math.max(b.minx + 0.3, Math.min(b.maxx - 0.3, ax)), b.top, Math.max(b.minz + 0.3, Math.min(b.maxz - 0.3, az))); P.swim = false; toast('Hochgeklettert', 0.8); break;
      }
      const gh = IE.groundH(ax, az); if (P.swim && gh > -1.25 && gh < 1.8) { P.pos.set(ax, gh, az); P.swim = false; }
    }
    // Blasen
    if (P.under) { P.bubT = (P.bubT || 0) - dt; if (P.bubT <= 0) { P.bubT = 0.35; bubble(P.pos.x + Math.sin(P.yaw) * 1.2, P.pos.y + 1.3, P.pos.z + Math.cos(P.yaw) * 1.2); } }
  } else {
    P.under = false;
    P.jumpReq = Math.max(0, (P.jumpReq || 0) - dt);
    if (ctrl && P.jumpReq > 0 && P.onGround) { P.jumpReq = 0; P.vy = game.ch.jump ? 22 : 7.5; P.onGround = false; }
    // Fallschirm öffnen (in der Luft, hoch genug)
    if (ctrl && P.jumpReq > 0 && !P.onGround && !P.chute && P.pos.y - g > 8) { P.jumpReq = 0; P.chute = true; sfx('beep'); toast('🪂 Fallschirm offen', 1.5); }
    if (P.bailV) { P.pos.x += P.bailV.x * dt; P.pos.z += P.bailV.z * dt; const dr = P.onGround ? 6 : P.chute ? 1.5 : 0.25; P.bailV.x *= Math.exp(-dr * dt); P.bailV.z *= Math.exp(-dr * dt); if (Math.hypot(P.bailV.x, P.bailV.z) < 0.3) P.bailV = null; }
    P.vy -= (game.ch.moon ? 5 : 24) * dt; if (P.chute) P.vy = Math.max(P.vy, -11); P.pos.y += P.vy * dt;
    if (P.pos.y <= g && !P.onGround) { const hv = P.bailV ? Math.hypot(P.bailV.x, P.bailV.z) : 0; if (hv > 9 && !P.chute && !game.ch.moon) hurtPlayer((hv - 9) * 4); if (P.chute) { P.chute = false; P.vy = 0; } }
    if (P.pos.y <= g) { if (P.vy < -22 && !game.ch.jump && !game.ch.moon) hurtPlayer((-P.vy - 22) * 6); P.pos.y = g; P.vy = 0; P.onGround = true; }
    else if (P.pos.y - g > 0.3) P.onGround = false;
    if (!P.onGround && g < -1.3 && P.pos.y < -1.25) { P.pos.y = -1.25; P.vy = 0; }
  }
  P.onShip = P.shipCand && Math.abs(P.pos.y - P.shipCand.deckY) < 0.35 ? P.shipCand.v : null;
  P.phase += dt * (P.swim ? (ml > 0.05 ? 4 + speed : 2.5) : ml > 0.05 ? speed * 2.1 : 0);
  IE.animHuman(P.h, P.phase, ml > 0.05 ? (inp.sprint ? 0.9 : 0.6) * Math.min(1, ml) : 0, aiming && S.cur !== 'faust' && !P.swim, false);
  if (!P.onGround && !P.swim) { P.h.legL.rotation.x = 0.5; P.h.legR.rotation.x = -0.3; }
  P.h.group.position.copy(P.pos);
  const swimMove = P.swim && ml > 0.05;
  if (P.swim) {
    // Kraulen: Arme kreisen, Beine schlagen
    if (swimMove || P.under) { P.h.armL.rotation.x = -P.phase; P.h.armR.rotation.x = -P.phase + Math.PI; P.h.legL.rotation.x = Math.sin(P.phase * 2) * 0.35; P.h.legR.rotation.x = -Math.sin(P.phase * 2) * 0.35; }
    else { P.h.armL.rotation.x = -1.4 + Math.sin(P.phase) * 0.4; P.h.armR.rotation.x = -1.4 - Math.sin(P.phase) * 0.4; P.h.armL.rotation.z = -0.5; P.h.armR.rotation.z = 0.5; P.h.legL.rotation.x = Math.sin(P.phase) * 0.3; P.h.legR.rotation.x = -Math.sin(P.phase) * 0.3; }
    if (swimMove || P.under) { P.h.armL.rotation.z = 0; P.h.armR.rotation.z = 0; }
  } else { P.h.armL.rotation.z = 0; P.h.armR.rotation.z = 0; }
  P.h.group.rotation.set(P.under ? 1.35 : swimMove ? 1.2 : P.swim ? 0.25 : 0, P.yaw, 0);
  if (swimMove && !P.under) P.h.group.position.y += 0.85;
  if (P.under) { P.h.group.position.y += 0.9; P.o2 -= dt / 45; if (P.o2 <= 0) { P.o2 = 0; hurtPlayer(dt * 10); } }
  else P.o2 = Math.min(1, P.o2 + dt * 0.4);
  // von Autos überfahren
  for (const v of IE.vehicles) if (v !== P.veh && v.type === 'car' && Math.abs(v.speed) > 7 && v.pos.distanceTo(P.pos) < 2.2) { hurtPlayer(Math.abs(v.speed) * 1.5); P.vy = 5; P.pos.y += 0.3; }
  playerShoot(dt);
}

// ---------- KI ----------
function npcUpdate(n, dt) {
  const dp = n.pos.distanceTo(P.pos);
  if (n.dead) { n.deadT += dt; if (n.zombify && game.ch.zombies && n.deadT > n.zombify) { n.zombify = 0; n.remove = true; IE.spawnNPC(scene, 'zombie', n.pos.x, n.pos.z); } if (n.deadT > 25 || (dp > 200 && !n.mission)) n.remove = true; return; }
  if (n.kind === 'guard') { if (IE.guardUpdate) IE.guardUpdate(n, dt); return; }
  if (dp > (n.keep ? 900 : 330) && !n.mission) { n.remove = true; return; }
  if (dp > 260) { n.group.visible = false; return; } n.group.visible = true;
  let mvx = 0, mvz = 0, spd = 0, aim = false;
  if (n.kind === 'zombie') {
    const tgt = P.veh ? P.veh.pos : P.pos, tx = tgt.x - n.pos.x, tz = tgt.z - n.pos.z, d = Math.hypot(tx, tz);
    n.zs = n.zs || (Math.random() < 0.25 ? 4.6 : 2 + Math.random() * 1.2);
    let prey = null;
    if (d > 25) { // unterwegs Passanten anfallen
      n.preyT = (n.preyT || 0) - dt;
      if (n.preyT <= 0) { n.preyT = 1; n.prey = null; for (const o of IE.npcs) if (o.kind === 'ped' && !o.dead && o.pos.distanceTo(n.pos) < 18) { n.prey = o; break; } }
      prey = n.prey && !n.prey.dead ? n.prey : null;
    }
    const gx = prey ? prey.pos.x - n.pos.x : tx, gz = prey ? prey.pos.z - n.pos.z : tz, gd = Math.hypot(gx, gz);
    n.yaw = Math.atan2(gx, gz) + Math.sin(game.time * 1.7 + n.phase) * 0.15;
    const reach = prey ? 1.1 : (P.veh ? 2.6 : 1.3);
    spd = gd > reach ? n.zs : 0;
    n.biteT = (n.biteT || 0) - dt;
    if (gd <= reach + 0.2 && n.biteT <= 0 && !game.dead) {
      n.biteT = 0.9 + Math.random() * 0.4;
      if (prey) { IE.killNPC(prey); prey.zombify = 4; n.prey = null; }
      else if (P.veh) { if (P.veh.health !== undefined) P.veh.health -= 25; sfx('hit', 0.4); }
      else { hurtPlayer(7 + Math.random() * 5); sfx('hit', 0.5); }
    }
    for (const o of IE.npcs) if (o.kind === 'ped' && !o.dead && o.state !== 'flee' && Math.abs(o.pos.x - n.pos.x) < 14 && Math.abs(o.pos.z - n.pos.z) < 14) { o.state = 'flee'; o.timer = 8; o.fleeFrom = n; }
  } else if (n.kind === 'ped') {
    n.timer -= dt;
    if (n.state === 'flee') {
      const ff = n.fleeFrom && !n.fleeFrom.dead && !n.fleeFrom.remove ? n.fleeFrom.pos : P.pos;
      const ax = n.pos.x - ff.x, az = n.pos.z - ff.z, l = Math.hypot(ax, az) || 1;
      n.yaw = Math.atan2(ax / l, az / l); spd = 5.5; if (n.timer <= 0) n.state = 'walk';
    } else {
      if (n.timer <= 0) { n.yaw += (Math.random() - 0.5) * 2.4; n.timer = 3 + Math.random() * 5; n.idle = Math.random() < 0.2; }
      const c = n.city; if (c && Math.hypot(n.pos.x - c.x, n.pos.z - c.z) > c.r - 10) n.yaw = Math.atan2(c.x - n.pos.x, c.z - n.pos.z);
      spd = n.idle ? 0 : 1.4;
    }
  } else {
    // Gegner / Polizei
    const engage = n.alert || (n.kind === 'soldier' ? inBase(P.pos, 20) : dp < (n.kind === 'police' ? 80 : 60));
    if (engage && !game.dead) {
      n.alert = true;
      const tx = P.pos.x - n.pos.x, tz = P.pos.z - n.pos.z; n.yaw = Math.atan2(tx, tz); aim = true;
      if (dp > 16) spd = 3.6; else if (dp < 7) spd = -2;
      n.strafe = (n.strafe || 0) - dt; if (n.strafe < -2) n.strafe = 1 + Math.random() * 1.5;
      if (n.strafe > 0 && dp < 30) { const f = IE.fwd(n.yaw); mvx = f.z * 2.2 * (n.id % 2 ? 1 : -1); mvz = -f.x * 2.2 * (n.id % 2 ? 1 : -1); }
      n.shootT -= dt;
      if (n.shootT <= 0 && dp < 75) {
        n.shootT = (n.boss ? 0.5 : n.kind === 'police' ? 1.3 : 1.0) + Math.random() * 0.8;
        const from = new T.Vector3(n.pos.x, n.pos.y + 1.45, n.pos.z), to = new T.Vector3(P.pos.x, P.pos.y + (P.veh ? 1 : 1.3), P.pos.z);
        const dir = to.clone().sub(from); const dist = dir.length(); dir.normalize();
        const blocked = IE.rayBoxes(from, dir, dist) < dist - 1.5;
        if (!blocked) {
          let ch = clamp(0.62 - dist / 120, 0.12, 0.55) * (P.veh ? 0.8 : 1) * (inp.sprint && !P.veh ? 0.7 : 1);
          const hit = Math.random() < ch;
          const end = hit ? to : to.clone().add(new T.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3));
          tracer(from, end); flash(from); sfx('shot', clamp(0.5 - dist / 200, 0.08, 0.5));
          if (hit) hurtPlayer(n.boss ? 12 : n.kind === 'police' ? 6 : n.kind === 'soldier' ? 9 : 7 + Math.random() * 4);
        }
      }
    } else spd = 0;
  }
  const f = IE.fwd(n.yaw);
  n.pos.x += (f.x * spd + mvx) * dt; n.pos.z += (f.z * spd + mvz) * dt;
  if (IE.pushOut(n.pos, 0.4, n.pos.y, 1.8) && n.kind === 'ped') n.yaw += 1.5;
  const g = IE.supportH(n.pos.x, n.pos.z, n.pos.y + 0.5);
  if (g < -0.8 && n.kind === 'ped') { n.pos.x -= f.x * spd * dt * 2; n.pos.z -= f.z * spd * dt * 2; n.yaw += Math.PI; }
  n.pos.y = Math.max(g, -1.25);
  const moving = Math.abs(spd) + Math.abs(mvx) > 0.1;
  n.phase += dt * (moving ? Math.max(Math.abs(spd), 2) * 2 : 0);
  IE.animHuman(n.h, n.phase, moving ? 0.6 : 0, aim, false);
  if (n.kind === 'zombie') { n.h.armL.rotation.x = n.h.armR.rotation.x = -1.35 + Math.sin(n.phase * 0.5) * 0.15; n.h.armR.rotation.z = 0; }
  n.group.position.copy(n.pos); n.group.rotation.y = n.yaw;
}

function pursuerUpdate(v, dt) {
  const tgt = P.veh ? P.veh.pos : P.pos;
  const dx = tgt.x - v.pos.x, dz = tgt.z - v.pos.z, dist = Math.hypot(dx, dz);
  const ai = v.ai; ai.stuck = ai.stuck || 0; ai.rev = ai.rev || 0;
  let thr = 1, st = clamp(-angDiff(v.yaw, Math.atan2(dx, dz)) * 2.2, -1, 1);
  if (dist < 14) thr = Math.abs(v.speed) > 2 ? -1 : 0;
  if (Math.abs(v.speed) < 1.5 && dist > 18) ai.stuck += dt; else ai.stuck = 0;
  if (ai.stuck > 2) { ai.rev = 1.3; ai.stuck = 0; }
  if (ai.rev > 0) { ai.rev -= dt; thr = -1; st = -st; }
  IE.updateCar(v, { x: st, y: thr }, dt);
  if (v.m.tank) {
    v.m.turret.rotation.y += angDiff(v.m.turret.rotation.y, angDiff(v.yaw, Math.atan2(dx, dz))) * Math.min(1, dt * 2);
    ai.shellT = (ai.shellT || 3) - dt;
    if (ai.shellT <= 0 && dist < 140 && !game.dead) { ai.shellT = 4 + Math.random() * 2; const to = new T.Vector3(tgt.x + (Math.random() - 0.5) * 8, tgt.y + 1 + dist * 0.025, tgt.z + (Math.random() - 0.5) * 8); fireShell(v, to); }
    return;
  }
  // Insassen schießen / steigen aus
  ai.shootT = (ai.shootT || 1.5) - dt;
  if (dist < 38 && ai.shootT <= 0 && !game.dead) {
    ai.shootT = 1.4 + Math.random();
    const from = new T.Vector3(v.pos.x, v.pos.y + 1.5, v.pos.z), to = new T.Vector3(tgt.x, tgt.y + 1.2, tgt.z);
    const hit = Math.random() < (P.veh ? 0.35 : 0.25); tracer(from, hit ? to : to.clone().add(new T.Vector3(Math.random() * 3 - 1.5, 1, Math.random() * 3 - 1.5))); sfx('shot', 0.3);
    if (hit) hurtPlayer(v.police ? 5 : 7);
  }
  if (!ai.unloaded && dist < 22 && Math.abs(v.speed) < 2 && !P.veh) {
    ai.unloaded = true; const f = IE.fwd(v.yaw);
    for (const s of [-1, 1]) { const n = IE.spawnNPC(scene, v.army ? 'soldier' : v.police ? 'police' : 'enemy', v.pos.x + f.z * 2 * s, v.pos.z - f.x * 2 * s, { mission: !!ai.mission }); n.alert = true; n.id = Math.random() * 100 | 0; if (ai.mission) mission.enemies.push(n); }
  }
}
function policeHeliUpdate(v, dt) {
  if (v.dead) { v.driver = null; IE.updateHeli(v, {}, dt); return; }
  const tgt = P.veh ? P.veh.pos : P.pos, t = game.time * 0.35 + v.ai.phase;
  const gx = tgt.x + Math.cos(t) * 50, gz = tgt.z + Math.sin(t) * 50, gy = Math.max(IE.groundH(gx, gz), 0, tgt.y) + 40;
  v.rotor = 1; v.m.rotor.rotation.y += dt * 28; v.m.tailRotor.rotation.z += dt * 40; v.m.disc.material.opacity = 0.22;
  v.vel.set(gx - v.pos.x, gy - v.pos.y, gz - v.pos.z).multiplyScalar(0.7); if (v.vel.length() > 50) v.vel.setLength(50);
  v.pos.addScaledVector(v.vel, dt); v.yaw += angDiff(v.yaw, Math.atan2(tgt.x - v.pos.x, tgt.z - v.pos.z)) * Math.min(1, dt * 2);
  v.group.position.copy(v.pos); v.group.rotation.set(0.15, v.yaw, 0, 'YXZ');
  v.ai.shootT = (v.ai.shootT || 2) - dt;
  const dist = v.pos.distanceTo(tgt);
  if (v.ai.shootT <= 0 && dist < 120 && !game.dead && !P.interior) {
    v.ai.shootT = 1.4 + Math.random(); const from = v.pos.clone(); from.y -= 0.5; const to = new T.Vector3(tgt.x, tgt.y + 1.2, tgt.z);
    const hit = Math.random() < 0.3; tracer(from, hit ? to : to.clone().add(new T.Vector3(Math.random() * 4 - 2, 0, Math.random() * 4 - 2))); sfx('shot', 0.35); if (hit) hurtPlayer(7);
  }
}
// ---------- Verkehr auf festen Fahrspuren ----------
function roadCum(r) {
  if (r.cum) return r.cum; const c = [0];
  for (let i = 1; i < r.pts.length; i++) c.push(c[i - 1] + Math.hypot(r.pts[i].x - r.pts[i - 1].x, r.pts[i].z - r.pts[i - 1].z));
  return r.cum = c;
}
function roadAt(r, s) {
  const c = roadCum(r); s = clamp(s, 0, c[c.length - 1]);
  let lo = 0, hi = c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const a = r.pts[lo], b = r.pts[hi], t = (s - c[lo]) / ((c[hi] - c[lo]) || 1);
  const q = r.pts[Math.min(hi + 2, r.pts.length - 1)], o = r.pts[Math.max(lo - 2, 0)];
  const tx = q.x - o.x, tz = q.z - o.z, l = Math.hypot(tx, tz) || 1;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: a.y + (b.y - a.y) * t, tx: tx / l, tz: tz / l };
}
function placeKinematic(v, x, z, y, yaw, speed, dt) {
  v.pos.set(x, y, z); v.speed = speed; v.vy = 0; v.gy = y; v.steer = 0;
  const dy = angDiff(v.yaw, yaw); v.yaw += dy * Math.min(1, dt * 5);
  const f = IE.fwd(v.yaw), fh = IE.groundH(x + f.x * 1.8, z + f.z * 1.8), bh = IE.groundH(x - f.x * 1.8, z - f.z * 1.8);
  v.pitch += (Math.atan2(bh - fh, 3.6) - v.pitch) * Math.min(1, dt * 6); v.roll = 0;
  v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.set(v.pitch, v.yaw, 0);
  v.wheelRot += speed * dt / 0.36; v.m.wheels.forEach(w => { if (w.children[0]) { w.children[0].rotation.z = -v.wheelRot; if (w.children[1]) w.children[1].rotation.z = -v.wheelRot; } w.rotation.y = 0; });
  v.m.wheels[2].rotation.y = v.m.wheels[3].rotation.y = clamp(dy * 3, -0.45, 0.45);
}
function blockedAhead(v, dist) {
  const f = IE.fwd(v.yaw), ox = v.pos.x + f.x * dist * 0.6, oz = v.pos.z + f.z * dist * 0.6;
  if (!P.veh && !game.dead && Math.hypot(P.pos.x - ox, P.pos.z - oz) < dist * 0.55) return true;
  for (const o of IE.vehicles) {
    if (o === v || o.type !== 'car' || o.dead) continue;
    const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z, ahead = dx * f.x + dz * f.z, side = Math.abs(dx * f.z - dz * f.x);
    if (ahead > 0 && ahead < dist && side < 2.2) return true;
  }
  for (const n of IE.npcs) { if (n.dead) continue; const dx = n.pos.x - v.pos.x, dz = n.pos.z - v.pos.z, ahead = dx * f.x + dz * f.z; if (ahead > 0 && ahead < 9 && Math.abs(dx * f.z - dz * f.x) < 2) return true; }
  return false;
}
function trafficUpdate(v, dt) {
  const ai = v.ai;
  if (ai.panic > 0) ai.panic -= dt;
  const want = ai.speed * (ai.panic > 0 ? 1.5 : 1);
  ai.cur = ai.cur === undefined ? want : ai.cur;
  if (blockedAhead(v, ai.kind === 'city' ? 12 : 22)) ai.cur = Math.max(0, ai.cur - 18 * dt); else ai.cur = Math.min(want, ai.cur + 5 * dt);
  if (ai.kind === 'road') {
    const r = IE.roads[ai.road], len = roadCum(r)[r.pts.length - 1];
    ai.s += ai.dir * ai.cur * dt;
    if (ai.s < 0 || ai.s > len) { ai.dir *= -1; ai.s = clamp(ai.s, 0, len); }
    const p = roadAt(r, ai.s); const fx = p.tx * ai.dir, fz = p.tz * ai.dir;
    // Rechtsverkehr: rechte Spur
    const x = p.x + (-fz) * 2.8, z = p.z + fx * 2.8;
    placeKinematic(v, x, z, Math.max(p.y + 0.1, IE.groundH(x, z)), Math.atan2(fx, fz), ai.cur, dt);
  } else {
    const c = ai.city, N = (i, j) => ({ x: c.x + (i + 0.5) * 40, z: c.z + (j + 0.5) * 40 });
    ai.t += ai.cur * dt / 40;
    if (ai.t >= 1) {
      ai.t -= 1; ai.i = ai.ti; ai.j = ai.tj;
      const opts2 = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => !(d[0] === -ai.di && d[1] === -ai.dj) && cityEdgeOk(c, ai.i, ai.j, ai.i + d[0], ai.j + d[1]));
      const d = opts2.length ? opts2[(Math.random() * opts2.length) | 0] : [-ai.di, -ai.dj];
      ai.di = d[0]; ai.dj = d[1]; ai.ti = ai.i + d[0]; ai.tj = ai.j + d[1];
    }
    const a = N(ai.i, ai.j), b = N(ai.ti, ai.tj), fx = ai.di, fz = ai.dj;
    const x = a.x + (b.x - a.x) * ai.t + (-fz) * 3, z = a.z + (b.z - a.z) * ai.t + fx * 3;
    placeKinematic(v, x, z, IE.groundH(x, z), Math.atan2(fx, fz), ai.cur, dt);
  }
}
const edgeCache = new Map();
function cityEdgeOk(c, i0, j0, i1, j1) {
  const k = c.id + ':' + i0 + ',' + j0 + ':' + i1 + ',' + j1; if (edgeCache.has(k)) return edgeCache.get(k);
  let ok = true;
  for (let t = 0; t <= 1.001 && ok; t += 0.125) {
    const x = c.x + (i0 + (i1 - i0) * t + 0.5) * 40, z = c.z + (j0 + (j1 - j0) * t + 0.5) * 40;
    if (Math.hypot(x - c.x, z - c.z) > c.r - 15 || !IE.isLand(x, z)) ok = false;
    for (const sd of [-3, 3]) { const q = { x: x + (j1 - j0) * sd, z: z + (i1 - i0) * sd }; if (IE.pushOut(q, 1.6, IE.groundH(q.x, q.z), 1.5)) ok = false; }
  }
  edgeCache.set(k, ok); edgeCache.set(c.id + ':' + i1 + ',' + j1 + ':' + i0 + ',' + j0, ok); return ok;
}
function spawnCityTraffic(c, pp) {
  for (let t = 0; t < 25; t++) {
    const i = Math.round((pp.x - c.x) / 40 - 0.5 + (Math.random() - 0.5) * 7), j = Math.round((pp.z - c.z) / 40 - 0.5 + (Math.random() - 0.5) * 7);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => cityEdgeOk(c, i, j, i + d[0], j + d[1])); if (!dirs.length) continue;
    const d = dirs[(Math.random() * dirs.length) | 0];
    const x = c.x + (i + 0.5) * 40, z = c.z + (j + 0.5) * 40; if (Math.hypot(x - pp.x, z - pp.z) < 25) continue;
    const def = civCar(Math.random() < 0.1);
    const v = IE.spawnCar(scene, def.id, x, z, Math.atan2(d[0], d[1]), { color: Math.random() < 0.3 ? def.color : IE.carColors[(Math.random() * IE.carColors.length) | 0], traffic: true,
      ai: { kind: 'city', city: c, i, j, ti: i + d[0], tj: j + d[1], di: d[0], dj: d[1], t: Math.random() * 0.5, speed: 8 + Math.random() * 4 } });
    v.driver = 'npc'; return;
  }
}

// ---------- Spawner (Verkehr, Passanten, Polizei) ----------
function civCar(fancy) { const l = IE.cars.filter(c => !c.military && !c.luxury && !c.xmas && !c.pack && c.kind !== 'moto' && (fancy ? c.price >= 90000 : c.price < 90000)); return l[(Math.random() * l.length) | 0]; }
function inBase(p, m) { const mm = m || 0, B = IE.base; if (Math.abs(p.x - B.x) < B.hw + mm && Math.abs(p.z - B.z) < B.hd + mm) return true; const D = IE.dubaiBase; return !!D && Math.abs(p.x - D.x) < D.hw + mm && Math.abs(p.z - D.z) < D.hd + mm; }
function baseAndHarbor() {
  const pp = P.pos, B = IE.base, dB = Math.hypot(pp.x - B.x, pp.z - B.z);
  if (dB < 650) {
    if (!IE.vehicles.some(v => v.base)) {
      for (const s of B.slots.tank) { const v = IE.spawnCar(scene, 'panzer', s.x, s.z, s.rot); v.base = true; v.health = v.maxHealth = 6000; }
      for (const s of B.slots.jeep) { const v = IE.spawnCar(scene, 'jeep', s.x, s.z, s.rot); v.base = true; }
      for (const s of B.slots.heli) { const v = IE.spawnHeli(scene, 'predatore', s.x, s.y, s.z, 0); v.base = true; v.health = v.maxHealth = 1500; }
      for (const s of B.slots.jet) { const v = IE.spawnPlane(scene, 'caccia', s.x, s.z, s.rot); v.base = true; }
    }
    const alive = IE.npcs.filter(n => n.kind === 'soldier' && !n.dead).length;
    if (alive === 0 && (!game.baseSpawned || dB > 350)) {
      game.baseSpawned = true;
      for (const s of B.slots.soldiers) { const n = IE.spawnNPC(scene, 'soldier', s.x, s.z); n.keep = true; n.id = (Math.random() * 100) | 0; }
    }
  }
  if (inBase(pp, 0)) { if (!game.inBase) { game.inBase = true; toast('SPERRGEBIET – Militärbasis! Soldaten eröffnen das Feuer', 3.5); setWanted(2); } }
  else game.inBase = false;
  // Eigene Flugzeuge stehen am Flughafen
  const A = IE.airport;
  if (Math.hypot(pp.x - A.x, pp.z - A.z) < 700) for (const id of S.planes) {
    if (IE.vehicles.some(v => v.type === 'plane' && v.def.id === id)) continue;
    const slot = A.planeSlots.concat([{ x: A.x - 30, z: A.z + 69, rot: Math.PI / 2 }, { x: A.x - 30, z: A.z + 138, rot: Math.PI / 2 }, { x: A.x - 5, z: A.z + 138, rot: Math.PI / 2 }]).find(sl => !IE.vehicles.some(v => Math.hypot(v.pos.x - sl.x, v.pos.z - sl.z) < 9));
    if (!slot) break; const v = IE.spawnPlane(scene, id, slot.x, slot.z, slot.rot); v.owned = true;
  }
  // Gekaufte Boote liegen im nächsten Hafen
  for (const s of IE.shops) {
    if (s.type !== 'boat' || !s.slots || Math.hypot(pp.x - s.x, pp.z - s.z) > 380) continue;
    for (const id of S.boats) {
      if (IE.vehicles.some(v => v.type === 'boat' && v.def.id === id)) continue;
      const slot = s.slots.find(sl => !IE.vehicles.some(v => v.type === 'boat' && Math.hypot(v.pos.x - sl.x, v.pos.z - sl.z) < 6));
      if (!slot) break;
      const v = IE.spawnBoat(scene, id, slot.x, slot.z, slot.rot); v.owned = true;
    }
  }
}
let spawnT = 0;
function spawner(dt) {
  spawnT -= dt; if (spawnT > 0) return; spawnT = 0.5;
  const pp = P.pos;
  baseAndHarbor();
  // Stadt aktivieren
  const { c, d } = cityOf(pp.x, pp.z);
  if (d < c.r + 220) {
    if (game.cityActive !== c) {
      game.cityActive = c;
      for (let i = 0; i < 14; i++) {
        const sx = c.x + (Math.round((Math.random() - 0.5) * 2 * c.r / 40) + 0.5) * 40, sz = c.z + (Math.random() - 0.5) * 2 * c.r * 0.8;
        const p = { x: sx + (Math.random() < 0.5 ? 4 : -4), z: sz };
        if (!IE.isLand(p.x, p.z) || Math.hypot(p.x - c.x, p.z - c.z) > c.r - 10) continue;
        const t = { x: p.x, z: p.z }; if (IE.pushOut(t, 2.4, IE.groundH(p.x, p.z), 1.5)) continue;
        const def = civCar(Math.random() < 0.12);
        const v = IE.spawnCar(scene, def.id, p.x, p.z, Math.random() < 0.5 ? 0 : Math.PI, { color: Math.random() < 0.3 ? def.color : IE.carColors[(Math.random() * IE.carColors.length) | 0] }); v.parked = true; v.city = c;
      }
    }
    const peds = IE.npcs.filter(n => n.kind === 'ped' && !n.dead).length;
    if (peds < (opts.gfx === 'niedrig' ? 10 : 22)) for (let k = 0; k < 4; k++) {
      const a = Math.random() * 6.28, rr = 30 + Math.random() * 90, x = pp.x + Math.cos(a) * rr, z = pp.z + Math.sin(a) * rr;
      if (Math.hypot(x - c.x, z - c.z) > c.r || !IE.isLand(x, z)) continue;
      const t = { x, z }; if (IE.pushOut(t, 0.6, IE.groundH(x, z), 1.8)) continue;
      const n = IE.spawnNPC(scene, 'ped', x, z, { city: c }); n.id = k;
    }
  } else game.cityActive = null;
  // Verkehr auf Autobahnen
  const traffic = IE.vehicles.filter(v => v.traffic && !v.dead && v.ai && v.ai.kind === 'road');
  if (game.cityActive && IE.vehicles.filter(v => v.traffic && v.ai && v.ai.kind === 'city' && !v.dead).length < (opts.gfx === 'niedrig' ? 5 : 9)) spawnCityTraffic(game.cityActive, pp);
  if (traffic.length < 10) for (let t = 0; t < 20; t++) {
    const ri = (Math.random() * IE.roads.length) | 0, r = IE.roads[ri], i = (Math.random() * r.pts.length) | 0, p = r.pts[i];
    const dd = Math.hypot(p.x - pp.x, p.z - pp.z); if (dd < 140 || dd > 420) continue;
    if (Math.hypot(p.x - r.a.x, p.z - r.a.z) < r.a.r || Math.hypot(p.x - r.b.x, p.z - r.b.z) < r.b.r) continue;
    const dir = Math.random() < 0.5 ? 1 : -1, q = r.pts[clamp(i + dir * 4, 0, r.pts.length - 1)];
    const def = civCar(Math.random() < 0.08);
    const v = IE.spawnCar(scene, def.id, p.x, p.z, Math.atan2(q.x - p.x, q.z - p.z), { color: Math.random() < 0.3 ? def.color : IE.carColors[(Math.random() * IE.carColors.length) | 0], traffic: true, ai: { kind: 'road', road: ri, s: roadCum(r)[i], dir, speed: 17 + Math.random() * 8 } });
    v.driver = 'npc'; v.pos.y = IE.groundH(p.x, p.z); break;
  }
  // Polizei
  const sn = starsN();
  if (sn > 0 && !P.interior && !IE.onMoon) {
    const count = f => IE.vehicles.filter(v => !v.dead && v.ai && f(v)).length;
    const landSpot = () => { for (let t = 0; t < 15; t++) { const a = Math.random() * 6.28, rr = 150 + Math.random() * 70, x = pp.x + Math.cos(a) * rr, z = pp.z + Math.sin(a) * rr; if (!IE.isLand(x, z)) continue; const tt = { x, z }; if (IE.pushOut(tt, 2.5, IE.groundH(x, z), 1.5)) continue; return tt; } return null; };
    if (count(v => v.police && v.type === 'car') < [0, 1, 2, 3, 4, 4][sn]) { const q = landSpot(); if (q) { const v = IE.spawnCar(scene, 'berlina', q.x, q.z, Math.atan2(pp.x - q.x, pp.z - q.z), { police: true, color: 0x1b2d6b, ai: { pursue: true } }); v.driver = 'npc'; v.def = Object.assign({}, v.def, { speed: 52, accel: 22 }); } }
    if (sn >= 4 && count(v => v.ai.heliPursue) < (sn >= 5 ? 2 : 1)) {
      const a = Math.random() * 6.28, x = pp.x + Math.cos(a) * 250, z = pp.z + Math.sin(a) * 250;
      const v = IE.spawnHeli(scene, 'aquila', x, Math.max(0, IE.groundH(x, z)) + 60, z, 0); v.police = true; v.ai = { heliPursue: true, phase: Math.random() * 6 }; v.driver = 'npc'; v.m.inner.children[0].material.color.set(0x1b2d6b);
    }
    if (sn >= 5) {
      if (count(v => v.army && v.def.id === 'jeep') < 2) { const q = landSpot(); if (q) { const v = IE.spawnCar(scene, 'jeep', q.x, q.z, Math.atan2(pp.x - q.x, pp.z - q.z), { ai: { pursue: true } }); v.army = true; v.police = true; v.driver = 'npc'; v.def = Object.assign({}, v.def, { speed: 48 }); } }
      if (count(v => v.army && v.m.tank) < 1) { const q = landSpot(); if (q) { const v = IE.spawnCar(scene, 'panzer', q.x, q.z, Math.atan2(pp.x - q.x, pp.z - q.z), { ai: { pursue: true } }); v.army = true; v.police = true; v.driver = 'npc'; v.health = v.maxHealth = 5000; } }
    }
  }
}
function policeUpdate(dt) {
  if (game.wanted <= 0) return;
  let near = false;
  for (const v of IE.vehicles) if (v.police && !v.dead && v.pos.distanceTo(P.pos) < (v.ai && v.ai.heliPursue ? 140 : 75)) near = true;
  for (const n of IE.npcs) if ((n.kind === 'police' || (n.kind === 'soldier' && n.alert)) && !n.dead && n.pos.distanceTo(P.pos) < 75) near = true;
  if (P.interior) near = false;
  if (near) game.seenT = 0; else game.seenT += dt;
  $('stars').classList.toggle('flash', !near);
  if (game.seenT > 9 + game.wanted * 2.5) {
    game.wanted = 0; game.seenT = 0; toast('Du hast die Polizei abgehängt');
    for (const v of IE.vehicles) if (v.police && v.ai) v.removeMe = v.pos.distanceTo(P.pos) > 60 || !!v.ai.heliPursue;
    for (const n of IE.npcs) if (n.kind === 'police') { n.alert = false; if (n.pos.distanceTo(P.pos) > 60) n.remove = true; }
  }
}

// ---------- Gefängnis: untätig mit Fahndung -> 5 Minuten ----------
const jailIdle = { t: 0, pos: new T.Vector3(), warn: false };
function arrestPlayer() {
  game.wanted = 0; game.seenT = 0;
  for (const v of IE.vehicles) if (v.police && v.ai && v !== P.veh) v.removeMe = true;
  for (const n of IE.npcs) if (n.kind === 'police' || n.kind === 'soldier') n.remove = true;
  if (P.veh) leaveVehicle();
  if (IE.buildJail) IE.buildJail();
  const j = IE.jail; if (!j) return;
  P.veh = null; P.ride = null; P.fly = false; P.swim = false; P.under = false; P.interior = null; P.chute = false;
  P.pos.set(j.x, j.y + 0.1, j.z - 1); P.vy = 0; P.onGround = true;
  P.jailed = true; P.jailT = 90; jailIdle.t = 0;
  $('speed').hidden = true;
  banner('VERHAFTET', 'Du sitzt im Militärgefängnis', 'Ein anderer Spieler kann dich befreien', 5);
  sfx('beep', 0.5); saveGame && saveGame();
}
function releaseJail(msg) {
  P.jailed = false; P.jailT = 0; jailIdle.t = 0; jailIdle.pos.copy(P.pos);
  const h = $('jailHud'); if (h) h.hidden = true;
  const j = IE.jail; if (j) { P.pos.set(j.x, j.y + 0.1, j.z + j.hd + 5); P.vy = 0; }
  toast(msg || 'Du bist frei!', 3);
}
IE.releaseJailRemote = () => { if (P.jailed) releaseJail('Ein anderer Spieler hat dich befreit!'); };
function jailUpdate(dt) {
  // Verhaftung prüfen
  if (!P.jailed && !P.interior && !IE.onMoon && !game.dead && starsN() > 0) {
    const moving = Math.abs(inp.mx) > 0.05 || Math.abs(inp.my) > 0.05;
    const driving = P.veh && (Math.abs(P.veh.speed || 0) > 3 || (P.veh.vel && Math.hypot(P.veh.vel.x, P.veh.vel.z) > 3));
    const acting = inp.fire || inp.aim || moving || driving || P.ride;
    if (acting) { jailIdle.t = 0; jailIdle.warn = false; P.arrestPending = false; }
    else {
      jailIdle.t += dt;
      P.arrestPending = jailIdle.t > 0.4;
      if (jailIdle.t > 4 && !jailIdle.warn) { jailIdle.warn = true; toast('Beweg dich! Sonst nimmt dich die Polizei fest …', 3.5); }
      if (jailIdle.t > 12) arrestPlayer();
    }
  } else if (!P.jailed) { jailIdle.t = 0; P.arrestPending = false; }
  if (!P.jailed) return;
  // Im Käfig festhalten
  game.wanted = 0;
  const j = IE.jail; if (j) {
    P.pos.x = clamp(P.pos.x, j.x - j.hw + 1, j.x + j.hw - 1);
    P.pos.z = clamp(P.pos.z, j.z - j.hd + 1, j.z + j.hd - 1);
    if (P.pos.y < j.y) { P.pos.y = j.y + 0.05; P.vy = 0; }
  }
  P.jailT -= dt;
  let h = $('jailHud');
  if (!h) { h = document.createElement('div'); h.id = 'jailHud'; h.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:60;background:rgba(13,15,19,.82);border:2px solid #d9b45a;border-radius:10px;padding:8px 16px;color:#fff;font:600 16px Barlow Condensed,Arial;text-align:center;pointer-events:none'; document.body.appendChild(h); }
  h.hidden = false;
  const mm = Math.floor(P.jailT / 60), ss = Math.floor(P.jailT % 60);
  h.innerHTML = '🚔 <b>GEFÄNGNIS</b> · noch ' + mm + ':' + (ss < 10 ? '0' : '') + ss + '<br><span style="font-size:13px;color:#d9b45a">Ein anderer Spieler kann dich an den Gittern befreien</span>';
  if (P.jailT <= 0) releaseJail('Strafe abgesessen – du bist frei!');
}

// ---------- Fahrzeug-Verwaltung ----------
function vehiclesUpdate(dt) {
  for (let i = IE.vehicles.length - 1; i >= 0; i--) {
    const v = IE.vehicles[i];
    const dp = v.pos.distanceTo(P.pos);
    if (v !== P.veh) {
      if (v.removeMe || (dp > 520 && !v.raceAI && !v.owned && !v.base && !(v.ai && v.ai.mission)) || (v.base && dp > 900) || ((v.type === 'boat' || v.type === 'plane') && v.owned && dp > 900) || (v.parked && game.cityActive !== v.city && dp > 300) || (v.ai && v.ai.kind === 'city' && v !== P.veh && (game.cityActive !== v.ai.city || dp > 260))) { scene.remove(v.group); IE.vehicles.splice(i, 1); continue; }
      if (v.sunk) { v.pos.y -= dt * 0.8; v.group.position.y = v.pos.y; v.sinkT = (v.sinkT || 0) + dt; if (v.sinkT > 12) v.removeMe = true; }
      else if (v.dead) { /* Wrack */ }
      else if (v.raceAI) { }
      else if (v.ai && v.ai.heliPursue) policeHeliUpdate(v, dt);
      else if (v.ai && v.ai.pursue) pursuerUpdate(v, dt);
      else if (v.traffic && v.ai) trafficUpdate(v, dt);
      else if (v.type === 'car') { if (dp < 300) IE.updateCar(v, { x: 0, y: 0, brake: true }, dt); }
      else if (v.type === 'boat') { if (dp < 400) IE.updateBoat(v, { brake: true }, dt); }
      else if (v.type === 'plane') { if (dp < 800) IE.updatePlane(v, { brake: true }, dt); }
      else if (v.type === 'airship') updateAirship(v, {}, dt);
      else IE.updateHeli(v, {}, dt);
    }
    // Autos und Flugzeuge explodieren nur durch Beschuss/Explosionen, nicht durch Unfälle
    if (!v.dead && v.health <= 0 && (v.type === 'car' || v.type === 'plane') && !(v.shotT !== undefined && game.time - v.shotT < 2)) v.health = 1;
    if (!v.dead && v.health <= 0) {
      v.dead = true; v.burn = 0;
      if (v.m.bodyMat) v.m.bodyMat.color.set(0x1a1a1a);
      if (v.ai && v.ai.mission) v.ai.done = true;
    }
    if (v.dead && v.burn >= 0) {
      v.burn += dt;
      if (v.type === 'car' && v !== P.veh) v.speed *= 0.95;
      if (Math.random() < dt * 12) { const fp = v.pos.clone(); fp.y += 1.4; const m = new T.Mesh(flashGeo, boomMat); m.position.copy(fp).add(new T.Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5)); m.scale.setScalar(4); scene.add(m); effects.push({ o: m, t: 0, life: 0.25, upd(e, d) { m.position.y += d * 3; }, kill() { scene.remove(m); } }); }
      if (v.burn > 3.5) {
        v.burn = -1; explosion(v.pos.clone().add(new T.Vector3(0, 1, 0)), 7);
        if (v === P.veh) { die(); }
        if (v.police) addWanted(0.5);
      }
    }
    // Auto-Auto-Kollision
    if (v.type === 'car' && dp < 200) for (let j = i - 1; j >= 0; j--) {
      const o = IE.vehicles[j]; if (o.type !== 'car') continue;
      const dx = v.pos.x - o.pos.x, dz = v.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d < 3.4 && d > 0.01 && Math.abs(v.pos.y - o.pos.y) < 2) {
        const push = (3.4 - d) / 2; v.pos.x += dx / d * push; v.pos.z += dz / d * push; o.pos.x -= dx / d * push; o.pos.z -= dz / d * push;
        for (const q of [v, o]) if (q.traffic && q.ai && q !== P.veh && !(q === v ? o : v).traffic && Math.abs((q === v ? o : v).speed) > 4) { q.ai = null; q.traffic = false; q.driver = null; }
        const rel = Math.abs(v.speed - o.speed); if (rel > 10) { v.health -= rel * 4; o.health -= rel * 4; if (o.police && v === P.veh) setWanted(Math.max(1, game.wanted)); }
        const avg = (v.speed + o.speed) / 2; v.speed = avg * 0.6; o.speed = avg * 0.6;
      }
    }
  }
}

// ---------- Missionen ----------
const mission = { active: false, idx: 0, step: -1, enemies: [], beacon: null, pkg: null, cp: 0, timeLeft: 0, cpMesh: null, failT: 0 };
const beamMat = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide });
function makeBeam(color, r) { const m = new T.Mesh(new T.CylinderGeometry(r || 2.2, r || 2.2, 400, 20, 1, true), beamMat(color, 0.22)); m.geometry.translate(0, 200, 0); scene.add(m); return m; }
function setBeam(m, x, z) { m.visible = true; m.position.set(x, IE.groundH(x, z), z); }
const ONL = () => window.IEonline && IEonline.active;
function curMission() { return ONL() ? null : IE.missions[S.mission]; }
function missionStartMarker() {
  const m = curMission();
  if (!m || mission.active) { missionBeam.visible = false; return; }
  setBeam(missionBeam, m.x, m.z);
}
function startMission() {
  const m = curMission(); if (!m) return;
  mission.active = true; mission.idx = S.mission; mission.def = m; mission.coop = false; mission.step = -1; mission.enemies = []; mission.chasers = [];
  missionBeam.visible = false;
  banner(IE.chapters[m.ch], m.title, '', 3.2);
  setTimeout(nextStep, 800);
}
function startJob(def) {
  if (mission.active) failMission('Neuer Crew-Auftrag');
  mission.active = true; mission.def = def; mission.coop = true; mission.step = -1; mission.enemies = []; mission.chasers = [];
  missionBeam.visible = false;
  banner('Crew-Auftrag', def.title, 'Belohnung für jeden: ' + fmt(def.reward), 3.5);
  setTimeout(() => { if (mission.active && mission.def === def && mission.step < 0) nextStep(true); }, 800);
}
function clearMissionStuff() {
  if (mission.pkg) { scene.remove(mission.pkg); mission.pkg = null; }
  if (mission.cpMesh) { scene.remove(mission.cpMesh); mission.cpMesh = null; }
  mission.beacon.visible = false; $('timer').hidden = true; $('boss').hidden = true;
}
function nextStep(fromRemote) {
  if (!mission.active) return;
  if (mission.coop && fromRemote !== true && ONL()) IEonline.jobStep(mission.def.id, mission.step + 1);
  clearMissionStuff();
  const m = mission.def;
  mission.step++;
  if (mission.step >= m.steps.length) return completeMission();
  const s = m.steps[mission.step];
  if (P.interior && s.t !== 'talk' && !s.inside) exitInterior();
  if (s.inside && (s.t === 'kill' || s.t === 'collect') && (!P.interior || P.interior.it.type !== s.inside)) enterInterior(s.inside, s.x, s.z, null);
  $('obj').hidden = false;
  $('obj').innerHTML = `<small>${m.title}</small>${s.text || ''}`;
  if (s.t === 'talk') { $('obj').hidden = true; showDialog(s.lines, nextStep); }
  else if (s.t === 'goto') {
    mission.beacon.visible = true; setBeam(mission.beacon, s.x, s.z);
    if (s.chasers) for (let i = 0; i < s.chasers; i++) {
      const f = IE.fwd(P.yaw); const x = P.pos.x - f.x * (60 + i * 15), z = P.pos.z - f.z * (60 + i * 15);
      const v = IE.spawnCar(scene, 'berlina', x, z, P.yaw, { hostile: true, color: 0x111111, ai: { pursue: true, mission: true } }); v.driver = 'npc'; v.def = Object.assign({}, v.def, { speed: 40 });
      mission.chasers.push(v);
    }
  }
  else if (s.t === 'kill') {
    mission.beacon.visible = !s.inside; setBeam(mission.beacon, s.x, s.z); if (s.inside) mission.beacon.visible = false;
    for (let i = 0; i < s.n; i++) {
      let x = s.x + (Math.random() - 0.5) * 50, z = s.z + (Math.random() - 0.5) * 50;
      const boss = s.boss && i === 0;
      let n;
      if (s.inside) { const it = IE.interiors[s.inside], sp = it.spots[i % it.spots.length]; n = IE.spawnNPC(scene, 'enemy', sp.x, sp.z, { mission: true, boss, name: s.boss, y: it.y }); n.alert = true; }
      else { const p = IE.snapLand(x, z, s.x, s.z); const t = { x: p.x, z: p.z }; IE.pushOut(t, 0.6, IE.groundH(t.x, t.z), 1.8); n = IE.spawnNPC(scene, 'enemy', t.x, t.z, { mission: true, boss, name: s.boss }); }
      n.id = i; mission.enemies.push(n);
      if (boss) mission.boss = n;
    }
    // Deckung: Kisten / Autos
    if (!s.inside) for (let i = 0; i < 3; i++) { const p = IE.snapLand(s.x + (Math.random() - 0.5) * 30, s.z + (Math.random() - 0.5) * 30, s.x, s.z); const v = IE.spawnCar(scene, 'berlina', p.x, p.z, Math.random() * 6, { color: 0x111111 }); v.parked = true; v.city = IE.cityById[s.city]; }
  }
  else if (s.t === 'collect') {
    const pk = new T.Mesh(new T.BoxGeometry(0.8, 0.6, 0.6), new T.MeshStandardMaterial({ color: 0xd9b45a, emissive: 0x4a3510, metalness: 0.6, roughness: 0.4 }));
    const tp = stepPos(s); pk.position.set(tp.x, (s.inside ? IE.interiors[s.inside].y : IE.groundH(tp.x, tp.z)) + 0.8, tp.z); scene.add(pk); mission.pkg = pk;
    mission.beacon.visible = !s.inside; setBeam(mission.beacon, tp.x, tp.z); if (s.inside) mission.beacon.visible = false;
  }
  else if (s.t === 'race') {
    mission.cp = 0; mission.timeLeft = s.time; $('timer').hidden = false; showCP(s);
  }
  else if (s.t === 'escape') setWanted(s.stars);
  else if (s.t === 'enter') { }
}
function showCP(s) {
  if (mission.cpMesh) scene.remove(mission.cpMesh);
  const p = s.cpPos[mission.cp];
  const g = new T.Group(); const ring = new T.Mesh(new T.TorusGeometry(7, 0.5, 8, 32), new T.MeshBasicMaterial({ color: 0xf2c230 }));
  ring.position.y = 7; const nx = s.cpPos[Math.min(mission.cp + 1, s.cpPos.length - 1)]; ring.rotation.y = Math.atan2(nx.x - p.x, nx.z - p.z);
  g.add(ring); g.position.set(p.x, IE.groundH(p.x, p.z), p.z); scene.add(g); mission.cpMesh = g;
  mission.beacon.visible = true; setBeam(mission.beacon, p.x, p.z);
}
function stepPos(s) { if (s.inside && (s.t === 'collect' || s.t === 'kill')) { const it = IE.interiors[s.inside]; return s.t === 'collect' ? it.item : { x: it.x, z: it.z }; } return s; }
function missionUpdate(dt) {
  if (!mission.active || mission.step < 0 || dlg.active) return;
  const m = mission.def, s = m.steps[mission.step]; if (!s) return;
  const pp = P.veh ? P.veh.pos : P.pos;
  const near = (x, z, r) => Math.hypot(pp.x - x, pp.z - z) < r;
  if (s.t === 'goto') {
    if (s.vehicle && !P.veh) $('obj').innerHTML = `<small>${m.title}</small>Steig in ein Fahrzeug`;
    else $('obj').innerHTML = `<small>${m.title}</small>${s.text} <span style="color:var(--muted)">· ${Math.round(Math.hypot(pp.x - s.x, pp.z - s.z))} m</span>`;
    if (near(s.x, s.z, s.r) && (!s.vehicle || P.veh)) { if (P.veh && P.veh.type === 'car') P.veh.speed *= 0.3; for (const c of mission.chasers) c.removeMe = true; if (s.inside) { if (P.veh && Math.abs(P.veh.speed || 0) > 3) P.veh.speed = 0; enterInterior(s.inside, s.x, s.z, null); } nextStep(); }
  } else if (s.t === 'enter') { if (P.veh) nextStep(); }
  else if (s.t === 'kill') {
    const alive = mission.enemies.filter(n => !n.dead && !n.remove);
    $('obj').innerHTML = `<small>${m.title}</small>${s.text} <span style="color:var(--gold)">· ${alive.length} übrig</span>`;
    if (mission.boss) { $('boss').hidden = mission.boss.dead || mission.boss.pos.distanceTo(pp) > 120; $('bossN').textContent = mission.boss.name; $('bossB').style.width = clamp(mission.boss.health / 600 * 100, 0, 100) + '%'; }
    if (!alive.length) { mission.boss = null; mission.enemies = []; nextStep(); }
  } else if (s.t === 'collect') {
    if (mission.pkg) mission.pkg.rotation.y += dt * 2;
    const tp = stepPos(s); if (near(tp.x, tp.z, (s.r || 4) + (P.veh ? 3 : 0))) { sfx('cash'); nextStep(); }
  } else if (s.t === 'race') {
    mission.timeLeft -= dt; $('timer').textContent = `${Math.max(0, mission.timeLeft).toFixed(1)} s · ${mission.cp}/${s.cpPos.length}`;
    const p = s.cpPos[mission.cp];
    if (near(p.x, p.z, 10)) { sfx('beep'); mission.cp++; if (mission.cp >= s.cpPos.length) return nextStep(); showCP(s); }
    if (mission.timeLeft <= 0) failMission('Die Zeit ist abgelaufen');
  } else if (s.t === 'escape') {
    $('obj').innerHTML = `<small>${m.title}</small>${s.text}`;
    if (game.wanted <= 0) nextStep();
  }
}
function completeMission() {
  const m = mission.def;
  mission.active = false; $('obj').hidden = true; clearMissionStuff();
  addMoney(m.reward); sfx('pass');
  banner(m.coop ? 'Crew-Auftrag erfüllt' : 'Mission erfüllt', m.title, '+ ' + fmt(m.reward), 4.5);
  if (m.coop) { mission.coop = false; if (ONL()) IEonline.jobDone(m); saveGame(); return; }
  S.mission++; if (S.mission >= IE.missions.length) { S.done = true; setTimeout(() => banner('Geschichte abgeschlossen', 'Italien gehört dir', 'Freies Spiel', 6), 5000); }
  saveGame(); missionStartMarker();
}
function failMission(why) {
  if (!mission.active) return;
  mission.active = false; $('obj').hidden = true; clearMissionStuff();
  for (const n of mission.enemies) n.remove = true; mission.enemies = []; mission.boss = null;
  for (const c of mission.chasers || []) c.removeMe = true;
  if (dlg.active) { dlg.active = false; $('dialog').hidden = true; }
  sfx('fail'); banner('Mission gescheitert', mission.def.title, why, 4);
  missionStartMarker();
}

// ---------- Tod ----------
function die() {
  if (game.dead) return;
  if (game.ch && game.ch.god) { P.health = maxHP(); return; }
  game.dead = true; game.deadT = 0; P.health = 0;
  if (ONL()) IEonline.onDeath();
  if (P.veh) { P.veh.driver = null; P.h.group.visible = true; P.h.group.position.copy(P.veh.pos); P.veh = null; $('speed').hidden = true; engineSound(null); }
  P.h.group.rotation.x = -Math.PI / 2;
  banner('', 'Sei morto', 'Du bist gestorben', 3.5);
  if (mission.active) setTimeout(() => failMission('Du bist gestorben'), 600);
}
function respawn() {
  P.interior = null;
  game.dead = false; P.health = maxHP(); game.wanted = 0;
  const { c } = cityOf(P.pos.x, P.pos.z);
  const lost = Math.min(S.money, Math.round(S.money * 0.05)); S.money -= lost;
  const home = IE.villaHome && IE.villaHome(P.pos);
  if (home) placePlayer(home.gate.x, home.gate.z + 3); else placePlayer(c.cx + 30, c.cz + 55); P.h.group.rotation.set(0, 0, 0);
  for (const v of IE.vehicles) if (v.police) v.removeMe = true;
  for (const n of IE.npcs) if (n.kind === 'police') n.remove = true;
  toast(home ? `Zuhause in der ${home.name} · Arzt ${fmt(lost)}` : `Ospedale di ${c.name} · Behandlung ${fmt(lost)}`, 3.5); saveGame();
}

// ---------- Innenräume ----------
function leaveVehicle() { if (!P.veh) return; P.veh.driver = null; P.veh = null; $('speed').hidden = true; engineSound(null); }
function enterInterior(type, outX, outZ, shop) {
  const it = IE.interiors[type]; if (!it) return;
  leaveVehicle();
  P.interior = { it, outX, outZ, shop };
  P.pos.set(it.door.x, it.y + 0.05, it.door.z - 5); P.vy = 0; P.yaw = Math.PI; cam.yaw = Math.PI; cam.pitch = 0.3;
  fade(); toast(it.name, 1.6);
}
function exitInterior() {
  const o = P.interior; if (!o) return; P.interior = null;
  placePlayer(o.outX, o.outZ); fade();
}
function teleportTo(x, y, z) {
  if (game.state !== 'play') return;
  if (P.interior) P.interior = null;
  leaveVehicle(); if (P.h) P.h.group.visible = true;
  const ox = x + 2.5, oz = z + 2.5, g = IE.supportH(ox, oz, y + 2);
  if (y - g > 4) { P.pos.set(ox, y, oz); P.vy = 0; if (!P.fly) setFly(true, P.flySpeed || 120); }
  else placePlayer(ox, oz);
  fade();
}
function fade() { const f = $('fade'); f.hidden = false; f.style.opacity = 1; setTimeout(() => { f.style.opacity = 0; }, 60); setTimeout(() => { f.hidden = true; }, 500); }
const SHOP_ROOM = { weapon: 'armeria', car: 'autosalone', luxury: 'autosalone', boat: 'nautica' };

// ---------- Shops ----------
let shopCur = null;
function nearestShop() {
  for (const s of IE.shops) { if (Math.hypot(P.pos.x - s.mx, P.pos.z - s.mz) < 4) return s; } return null;
}
function openShop(s) {
  shopCur = s; $('shopModal').hidden = false; if (locked) document.exitPointerLock(); renderShop();
}
function renderShop() {
  const s = shopCur; const rows = $('shopRows'); rows.innerHTML = ''; $('shopCash').textContent = fmt(S.money);
  const row = (name, stat, btns, color) => {
    const d = document.createElement('div'); d.className = 'row';
    d.innerHTML = `<div><div class="nm">${color !== undefined ? `<span class="swatch" style="background:#${color.toString(16).padStart(6, '0')}"></span>` : ''}${name}</div><div class="st">${stat}</div></div><div class="acts"></div>`;
    btns.forEach(b => { const e = document.createElement('button'); e.textContent = b.t; if (b.buy) e.className = 'buy'; e.disabled = !!b.dis; e.addEventListener('click', () => { b.f(); renderShop(); saveGame(); }); d.querySelector('.acts').appendChild(e); });
    rows.appendChild(d);
  };
  const city = IE.cityById[s.city].name;
  if (s.type === 'weapon') {
    $('shopT').textContent = 'Armeria · ' + city; $('shopHint').textContent = 'Waffen bleiben dauerhaft in deinem Besitz. Munition wird zwischen den Charakteren geteilt.';
    for (const w of IE.weapons) {
      if (w.id === 'faust') continue;
      if (w.pack && S.weapons[w.id] === undefined) continue;
      const own = S.weapons[w.id] !== undefined;
      row(w.name, `Schaden ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} · Reichweite ${w.range} m · ${own ? 'Munition ' + S.weapons[w.id] : 'nicht im Besitz'}`, own ?
        [{ t: `+${w.clip} Schuss · ${fmt(w.ammoPrice)}`, buy: true, dis: S.money < w.ammoPrice, f: () => { S.money -= w.ammoPrice; S.weapons[w.id] += w.clip; sfx('cash'); } }, { t: 'Ausrüsten', dis: S.cur === w.id, f: () => { S.cur = w.id; updateGunModel(); } }] :
        [{ t: 'Kaufen · ' + fmt(w.price), buy: true, dis: S.money < w.price, f: () => { S.money -= w.price; S.weapons[w.id] = w.clip; S.cur = w.id; updateGunModel(); sfx('cash'); } }]);
    }
    row('Schutzweste', `Panzerung ${Math.round(S.armor)} / 100`, [{ t: 'Kaufen · € 2.500', buy: true, dis: S.money < 2500 || S.armor >= 100, f: () => { S.money -= 2500; S.armor = 100; sfx('cash'); } }]);
    row('Erste-Hilfe-Set', `Gesundheit ${Math.round(P.health)} / ${maxHP()}`, [{ t: 'Kaufen · € 500', buy: true, dis: S.money < 500 || P.health >= maxHP(), f: () => { S.money -= 500; P.health = maxHP(); sfx('cash'); } }]);
  } else if (s.type === 'plane') {
    $('shopT').textContent = 'Hangar Moretti · Flughafen'; $('shopHint').textContent = 'Steuerung: Leertaste / GAS + = Schub, Shift / GAS − = weniger Schub. Joystick bzw. W/S = Nase hoch/runter, A/D = Kurve. Zum Starten auf die Startbahn rollen, Vollgas geben und ab Abhebegeschwindigkeit hochziehen.';
    for (const pl of IE.planes.filter(p => (!p.military || p.price > 0 || S.planes.includes(p.id)) && (!p.xmas || S.planes.includes(p.id)) && (!p.pack || S.planes.includes(p.id)))) {
      const own = S.planes.includes(pl.id);
      row(pl.name, `Höchstgeschwindigkeit ${Math.round(pl.speed * 3.6)} km/h · Abheben ab ${Math.round(pl.minSpeed * 3.6)} km/h${pl.kind === 'sea' ? ' · landet auch auf Wasser' : ''}`, own ?
        [{ t: 'Auswählen', buy: true, f: () => { spawnOwnedPlane(pl.id, s); closeModals(); } }] :
        [{ t: 'Kaufen · ' + fmt(pl.price), buy: true, dis: S.money < pl.price, f: () => { S.money -= pl.price; S.planes.push(pl.id); sfx('cash'); spawnOwnedPlane(pl.id, s); closeModals(); toast(pl.name + ' gekauft!'); } }], pl.color);
    }
  } else if (s.type === 'boat') {
    $('shopT').textContent = 'Nautica · ' + city; $('shopHint').textContent = 'Gekaufte Boote liegen automatisch am Steg jedes Hafens, den du besuchst. Mit SHIFT / TAUCHEN kannst du im Wasser abtauchen – unter Wasser liegen Schiffswracks mit Schätzen.';
    for (const b of IE.boats.filter(b => (!b.xmas || S.boats.includes(b.id)) && (!b.pack || S.boats.includes(b.id)))) {
      const own = S.boats.includes(b.id);
      row(b.name, `Höchstgeschwindigkeit ${Math.round(b.speed * 3.6)} km/h${own ? ' · liegt im Hafen' : ''}`, own ?
        [{ t: 'Zum Steg bringen', buy: true, f: () => { for (const v of IE.vehicles) if (v.type === 'boat' && v.def.id === b.id && !v.driver) v.removeMe = true; setTimeout(() => spawnT = 0, 50); closeModals(); toast(b.name + ' wird an den Steg gebracht'); } }] :
        [{ t: 'Kaufen · ' + fmt(b.price), buy: true, dis: S.money < b.price, f: () => { S.money -= b.price; S.boats.push(b.id); sfx('cash'); spawnT = 0; closeModals(); toast(b.name + ' gekauft – liegt am Steg!'); } }], b.color);
    }
  } else if (s.type === 'car' || s.type === 'luxury') {
    const lux = s.type === 'luxury';
    $('shopT').textContent = (lux ? 'Lusso Automobili · ' : 'Autosalone · ') + city; $('shopHint').textContent = lux ? 'Die exklusivsten Autos Italiens. Gekaufte Autos kannst du jederzeit über „Meine Fahrzeuge“ herholen.' : 'Gekaufte Autos kannst du in jedem Autosalone kostenlos abholen – oder über „Meine Fahrzeuge“ herholen.';
    for (const c of IE.cars.filter(c => !c.military && !!c.luxury === lux && (!c.xmas || S.cars.includes(c.id)) && (!c.pack || S.cars.includes(c.id)))) {
      const own = S.cars.includes(c.id);
      row(c.name, `Höchstgeschwindigkeit ${Math.round(c.speed * 3.6)} km/h · Beschleunigung ${c.accel}`, own ?
        [{ t: 'Tuning', f: () => { closeModals(); IE.openTuning(c.id); } }, { t: 'Abholen', buy: true, f: () => { spawnOwnedCar(c.id, s); closeModals(); } }] :
        [{ t: 'Kaufen · ' + fmt(c.price), buy: true, dis: S.money < c.price, f: () => { S.money -= c.price; S.cars.push(c.id); sfx('cash'); spawnOwnedCar(c.id, s); closeModals(); toast(c.name + ' gekauft!'); } }], c.color);
    }
  } else if (s.type === 'phone') {
    $('shopT').textContent = 'Handy-Laden · ' + city;
    $('shopHint').textContent = 'Mit dem Handy kannst du streamen, Videos aufnehmen & hochladen, Kanäle abonnieren und fernsehen. Öffne es danach im Pause-Menü (📱 Handy).';
    if (!S.phone) {
      row('Smartphone „Napoli X"', 'Dein erstes Handy – schaltet Streamen, Videos, Abos & Kanäle frei', [{ t: 'Kaufen · ' + fmt(150000), buy: true, dis: S.money < 150000, f: () => { S.money -= 150000; S.phone = true; sfx('cash'); toast('Handy gekauft! Öffne es im Pause-Menü (📱 Handy)', 3); } }], 0x3a9bff);
    } else {
      row('Dein Smartphone', 'Handy öffnen – Streamen, Videos, Abos & TV', [{ t: 'Handy öffnen', buy: true, f: () => { closeModals(); if (IE.openPhone) IE.openPhone(); } }], 0x3a9bff);
      row('Pro-Kamera-Upgrade', S.phonePro ? 'Installiert – deutlich mehr Aufrufe & Abos' : 'Mehr Aufrufe und Abos für deine Videos & Streams', S.phonePro ? [] : [{ t: 'Kaufen · ' + fmt(500000), buy: true, dis: S.money < 500000, f: () => { S.money -= 500000; S.phonePro = true; sfx('cash'); toast('Pro-Kamera installiert!'); } }], 0xd6b04a);
    }
  } else if (s.type === 'biz') {
    const D = IE.bizDefs[s.biz]; S.biz = S.biz || {}; const b = S.biz[s.id];
    $('shopT').textContent = D.name + ' · ' + city;
    const inc = lv => Math.round(D.inc * (1 + 0.5 * (lv - 1)));
    if (!b) {
      $('shopHint').textContent = 'Eigene Geschäfte verdienen Geld – auch offline, wenn du nicht spielst. Die Einnahmen sammeln sich in der Kasse (bis zu 12 Stunden) – komm vorbei und leere sie.';
      row('Geschäft kaufen', `Einnahmen ca. ${fmt(inc(1))} pro Minute`, [{ t: 'Kaufen · ' + fmt(D.price), buy: true, dis: S.money < D.price, f: () => { S.money -= D.price; S.biz[s.id] = { lv: 1, cash: 0 }; sfx('cash'); toast('Glückwunsch – das ' + D.name + ' gehört jetzt dir!', 3); } }], D.color);
    } else {
      $('shopHint').textContent = 'Dein Geschäft verdient ' + fmt(inc(b.lv)) + ' pro Minute – auch offline. Die Kasse fasst bis zu 12 Stunden Einnahmen.';
      row('Kasse', `${fmt(Math.floor(b.cash))} warten auf dich`, [{ t: 'Kasse leeren', buy: true, dis: b.cash < 1, f: () => { addMoney(Math.floor(b.cash)); b.cash = 0; sfx('cash'); } }], D.color);
      const upc = Math.round(D.price * 0.5 * b.lv);
      { const paid = D.price + Array.from({ length: b.lv - 1 }, (_, i) => Math.round(D.price * 0.5 * (i + 1))).reduce((x, y) => x + y, 0), sell = Math.round(paid * 0.7);
        row('Geschäft verkaufen', `Du bekommst ${fmt(sell)} (70 % von Kauf + Ausbau) – die Kasse wird vorher ausgezahlt`, s.sellAsk ? [{ t: 'Ja, verkaufen', buy: true, f: () => { s.sellAsk = false; addMoney(Math.floor(b.cash)); S.money += sell; delete S.biz[s.id]; sfx('cash'); toast(D.name + ' verkauft · + ' + fmt(sell), 3); } }, { t: 'Abbrechen', f: () => { s.sellAsk = false; } }] : [{ t: 'Verkaufen · ' + fmt(sell), f: () => { s.sellAsk = true; } }]); }
      row('Ausbau · Stufe ' + b.lv + (b.lv >= 5 ? ' (Maximum)' : ''), b.lv >= 5 ? `Einnahmen ${fmt(inc(b.lv))} pro Minute` : `Nächste Stufe: ${fmt(inc(b.lv + 1))} pro Minute`, b.lv >= 5 ? [] : [{ t: 'Ausbauen · ' + fmt(upc), buy: true, dis: S.money < upc, f: () => { S.money -= upc; b.lv++; sfx('cash'); } }]);
    }
  } else {
    $('shopT').textContent = 'Eliporto · ' + city; $('shopHint').textContent = 'Gekaufte Helikopter kannst du an jedem Helikopterplatz spawnen. HOCH/RUNTER (Leertaste/Shift) zum Steigen und Sinken.';
    for (const h of IE.helis.filter(h => (!h.military || h.price > 0 || S.helis.includes(h.id)) && (!h.pack || S.helis.includes(h.id)))) {
      const own = S.helis.includes(h.id);
      row(h.name, `Höchstgeschwindigkeit ${Math.round(h.speed * 3.6)} km/h · Steigrate ${h.climb} m/s`, own ?
        [{ t: 'Spawnen', buy: true, f: () => { spawnOwnedHeli(h.id, s); closeModals(); } }] :
        [{ t: 'Kaufen · ' + fmt(h.price), buy: true, dis: S.money < h.price, f: () => { S.money -= h.price; S.helis.push(h.id); sfx('cash'); spawnOwnedHeli(h.id, s); closeModals(); toast(h.name + ' gekauft!'); } }], h.color);
    }
    // Leih-Heli für den Einstieg
    row('Rundflug-Heli (Leihe)', 'Einmalige Leihe: Libellula, bleibt bis du weit wegfliegst', [{ t: 'Leihen · € 1.500', dis: S.money < 1500, f: () => { S.money -= 1500; spawnOwnedHeli('libellula', s, true); closeModals(); } }], 0x1e7fc8);
  }
}
function spawnOwnedPlane(id, s) {
  for (const v of IE.vehicles) if (v.type === 'plane' && !v.driver && (v.def.id === id || Math.hypot(v.pos.x - s.spawn.x, v.pos.z - s.spawn.z) < 10)) v.removeMe = true;
  setTimeout(() => { const v = IE.spawnPlane(scene, id, s.spawn.x, s.spawn.z, s.spawn.rot, s.spawn.y); v.owned = true; toast(v.def.name + ' steht im Hangar bereit – F / EIN-AUS'); }, 50);
}
function spawnOwnedCar(id, s) {
  for (const v of IE.vehicles) if (v.owned && v.type === 'car' && !v.driver && v.pos.distanceTo(new T.Vector3(s.spawn.x, v.pos.y, s.spawn.z)) < 6) v.removeMe = true;
  const v = IE.spawnCar(scene, id, s.spawn.x, s.spawn.z, s.spawn.rot, { owned: true });
  toast('Dein ' + v.def.name + ' steht bereit (F / EIN-AUS)');
}
function spawnOwnedHeli(id, s, rent) {
  for (const v of IE.vehicles) if (v.type === 'heli' && !v.driver && Math.hypot(v.pos.x - s.spawn.x, v.pos.z - s.spawn.z) < 10) v.removeMe = true;
  const v = IE.spawnHeli(scene, id, s.spawn.x, s.spawn.y, s.spawn.z, 0); v.owned = !rent;
  toast(v.def.name + ' ist gelandet – steig ein mit F / EIN-AUS');
}

// ---------- Karte ----------
const MAP = { c: null, s: 0 };
function buildMapCanvas() {
  const G = IE.grid; const W = 860, H = Math.round(860 * G.d / G.w); MAP.s = W / G.w;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = G.x0 + x / MAP.s, wz = G.z0 + y / MAP.s, h = IE.terrainH(wx, wz), i = (y * W + x) * 4;
    let r, gg, b;
    if (h < 0.3) { const d = clamp(-h / 38, 0, 1); r = 40 - d * 20; gg = 110 - d * 40; b = 150 - d * 30; }
    else if (h < 1.6) { r = 214; gg = 200; b = 160; }
    else if (h > 175) { r = 240; gg = 242; b = 245; }
    else if (h > 110) { r = 150; gg = 142; b = 128; }
    else { const t = clamp(h / 110, 0, 1); r = 128 - t * 50; gg = 152 - t * 50; b = 82 - t * 30; }
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = '#f2d36b'; g.lineWidth = 2; g.lineJoin = 'round';
  for (const r of IE.roads) { g.beginPath(); r.pts.forEach((p, i) => { const x = (p.x - G.x0) * MAP.s, y = (p.z - G.z0) * MAP.s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  if (IE.mapBase) IE.mapBase(g, MAP.s, G.x0, G.z0);
  { const A = IE.airport, a = w2m(A.x - A.hw, A.z - A.hd), b = w2m(A.x + A.hw, A.z + A.hd); g.fillStyle = '#9aa08a'; g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    const r0 = w2m(A.x + 5, A.z - A.hd + 10), r1 = w2m(A.x + 35, A.z + A.hd - 10); g.fillStyle = '#3a3c40'; g.fillRect(r0.x, r0.y, Math.max(2, r1.x - r0.x), r1.y - r0.y); }
  { const B = IE.base, a = w2m(B.x - B.hw, B.z - B.hd), b = w2m(B.x + B.hw, B.z + B.hd); g.fillStyle = '#8f8b7e'; g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); }
  for (const ct of IE.cities) { g.fillStyle = 'rgba(214,200,180,0.75)'; g.beginPath(); g.arc((ct.x - G.x0) * MAP.s, (ct.z - G.z0) * MAP.s, Math.max(3, ct.r * MAP.s * 0.8), 0, 7); g.fill(); }
  MAP.c = c;
}
const w2m = (x, z) => ({ x: (x - IE.grid.x0) * MAP.s, y: (z - IE.grid.z0) * MAP.s });
function icon(g, x, y, kind, size) {
  const col = { island: '#2ec5c0', islandOwn: '#48e07a', rocket: '#ff8a3c', biz: '#48e07a', bizOwn: '#48e07a', luxury: '#d6b04a', race: '#ff4fd8', villa: '#d9b45a', villaOwn: '#48e07a', gas: '#ff9a3c', plane: '#f2c230', weapon: '#e94b3c', car: '#3aa0ff', heli: '#48e07a', boat: '#35d6e8', base: '#a9c25a', wreck: '#f2c94c', wreckGot: '#6b6b6b', mission: '#f2c230', wp: '#ff5fd2', target: '#f2c230' }[kind];
  const ch = { island: '🏝', islandOwn: '🏝', rocket: '▲', biz: '♦', bizOwn: '♦', luxury: '€', race: 'R', villa: 'V', villaOwn: '⌂', gas: 'T', plane: '✈', weapon: 'W', car: 'A', heli: 'H', boat: 'B', base: '✪', wreck: '$', wreckGot: '$', mission: 'M', wp: '•', target: '★' }[kind];
  g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, size, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = Math.max(1.5, size * 0.22); g.stroke();
  g.fillStyle = col; g.font = `bold ${size * 1.15}px Barlow Condensed, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y + 0.5);
}
function missionTarget() {
  if (mission.active && mission.step >= 0) {
    const s = mission.def.steps[mission.step];
    if (s && s.t === 'race') return s.cpPos[mission.cp];
    if (s && s.x !== undefined && s.t !== 'talk') return P.interior ? stepPos(s) : s;
    return null;
  }
  const m = curMission(); return m ? m : null;
}
function drawMini() {
  const cv = $('miniC'), g = cv.getContext('2d'), W = cv.width, R = W / 2;
  g.clearRect(0, 0, W, W);
  if (IE.onMoon && !P.interior) {
    g.fillStyle = '#0b0d14'; g.beginPath(); g.arc(R, R, R - 4, 0, 7); g.fill(); g.strokeStyle = '#9aa0a8'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#f3ead8'; g.font = 'bold 34px Barlow Condensed, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MOND', R, R - 18);
    g.font = '600 26px Barlow Condensed, Arial'; g.fillStyle = '#5ff3ff'; g.fillText('Mondsteine ' + ((S.moonGems || []).length) + ' / 12', R, R + 20); return;
  }
  if (P.interior) {
    g.fillStyle = '#171b22'; g.beginPath(); g.arc(R, R, R - 4, 0, 7); g.fill(); g.strokeStyle = '#d9b45a'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#f3ead8'; g.font = 'bold 34px Barlow Condensed, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INNEN', R, R - 18);
    g.font = '600 26px Barlow Condensed, Arial'; g.fillStyle = '#d9b45a'; g.fillText(P.interior.it.name, R, R + 20); return;
  }
  g.save(); g.beginPath(); g.arc(R, R, R - 6, 0, 7); g.clip();
  g.fillStyle = '#1d5f80'; g.fillRect(0, 0, W, W);
  const inH = P.veh && P.veh.type === 'heli';
  const zoom = (P.veh && P.veh.type === 'plane' ? 0.3 : inH ? 0.55 : P.veh ? 0.9 : 1.6); // px pro Meter auf Canvas
  const th = cam.yaw - Math.PI, cs = Math.cos(th), sn = Math.sin(th);
  const pp = P.veh ? P.veh.pos : P.pos; const pm = w2m(pp.x, pp.z);
  g.translate(R, R); g.rotate(th); g.scale(zoom / MAP.s, zoom / MAP.s); g.drawImage(MAP.c, -pm.x, -pm.y); g.setTransform(1, 0, 0, 1, 0, 0);
  const toScr = (x, z, clampEdge) => {
    let rx = (x - pp.x) * zoom, rz = (z - pp.z) * zoom; let sx = rx * cs - rz * sn, sy = rx * sn + rz * cs;
    const l = Math.hypot(sx, sy); if (clampEdge && l > R - 20) { sx *= (R - 20) / l; sy *= (R - 20) / l; } else if (!clampEdge && l > R) return null;
    return { x: R + sx, y: R + sy };
  };
  for (const s of IE.shops) { const p = toScr(s.mx, s.mz); if (p) icon(g, p.x, p.y, s.type, 13); }
  { const p = toScr(IE.base.x, IE.base.z); if (p) icon(g, p.x, p.y, 'base', 15); }
  if (IE.mapPOIs) for (const o of IE.mapPOIs()) { const p = toScr(o.x, o.z); if (p) icon(g, p.x, p.y, o.kind, 11); }
  for (const w of IE.wrecks) { const p = toScr(w.x, w.z); if (p) icon(g, p.x, p.y, w.got ? 'wreckGot' : 'wreck', 11); }
  for (const n of IE.npcs) if (!n.dead && (n.kind !== 'ped') && n.group.visible !== false) { const p = toScr(n.pos.x, n.pos.z); if (p) { g.fillStyle = n.kind === 'guard' ? '#48e07a' : n.kind === 'police' ? '#3a7bff' : '#ff3b30'; g.beginPath(); g.arc(p.x, p.y, 6, 0, 7); g.fill(); } }
  for (const v of IE.vehicles) if (!v.dead && (v.police || v.hostile)) { const p = toScr(v.pos.x, v.pos.z); if (p) { const on = (performance.now() / 250 | 0) % 2; g.fillStyle = v.police ? (on ? '#3a7bff' : '#ff3b30') : '#ff3b30'; g.fillRect(p.x - 6, p.y - 6, 12, 12); } }
  const mt = missionTarget(); if (mt) { const p = toScr(mt.x, mt.z, true); icon(g, p.x, p.y, mission.active ? 'target' : 'mission', 16); }
  if (ONL()) for (const r of IEonline.peers.values()) { const p = toScr(r.pos.x, r.pos.z, true); g.fillStyle = r.pr && r.pr.pa ? '#9aa' : '#48e07a'; g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 9, 0, 7); g.stroke(); g.fill(); }
  if (waypoint) { const p = toScr(waypoint.x, waypoint.z, true); icon(g, p.x, p.y, 'wp', 12); }
  g.restore();
  // Spielerpfeil
  const a = P.yaw + th; const dir = { x: Math.sin(P.yaw), z: Math.cos(P.yaw) }; const sx = dir.x * cs - dir.z * sn, sy = dir.x * sn + dir.z * cs; const ang = Math.atan2(sy, sx);
  g.save(); g.translate(R, R); g.rotate(ang + Math.PI / 2); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.stroke(); g.fill(); g.restore();
  // Rahmen mit Gesundheit
  g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(R, R, R - 4, 0, 7); g.stroke();
  g.strokeStyle = '#2f9a5c'; g.beginPath(); g.arc(R, R, R - 4, Math.PI * 0.5, Math.PI * 0.5 + Math.PI * clamp(P.health / maxHP(), 0, 1)); g.stroke();
  g.strokeStyle = '#4fa3e0'; g.beginPath(); g.arc(R, R, R - 4, Math.PI * 0.5, Math.PI * 0.5 - Math.PI * clamp(S.armor / 100, 0, 1), true); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 26px Barlow Condensed, Arial'; g.textAlign = 'center'; const nr = cityOf(pp.x, pp.z); g.fillText(nr.d < nr.c.r + 60 ? nr.c.name.toUpperCase() : '', R, W - 30);
}
const MV = { zoom: 1, cx: 0, cy: 0, drag: null };
function drawBig() {
  const cv = $('bigmap'), pw = cv.parentElement.clientWidth, ar = MAP.c.height / MAP.c.width;
  const maxH = innerHeight * 0.94 - 70; let w = pw, h = pw * ar; if (h > maxH) { h = maxH; w = h / ar; }
  cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.margin = '0 auto';
  const dpr = Math.min(devicePixelRatio, 2); cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); const k = cv.width / MAP.c.width * MV.zoom;
  MV.k = k;
  const tx = mx => (mx - MV.cx) * k + cv.width / 2, ty = my => (my - MV.cy) * k + cv.height / 2;
  MV.tx = tx; MV.ty = ty;
  g.fillStyle = '#1d5f80'; g.fillRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = MV.zoom < 3;
  g.drawImage(MAP.c, tx(0), ty(0), MAP.c.width * k, MAP.c.height * k);
  const sz = Math.min(1.6, 0.8 + MV.zoom * 0.2);
  g.font = `600 ${13 * dpr * sz}px Barlow Condensed, Arial`;
  for (const c of IE.cities) { const p = w2m(c.x, c.z); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000'; g.fillText(c.name, tx(p.x) + 9 * dpr + 1, ty(p.y) - 6 * dpr + 1); g.fillStyle = '#fff'; g.fillText(c.name, tx(p.x) + 9 * dpr, ty(p.y) - 6 * dpr); g.font = `600 ${13 * dpr * sz}px Barlow Condensed, Arial`; }
  const off = { biz: [-1, 1], luxury: [1, 1], weapon: [-1, 0], car: [1, 0], heli: [0, 1], boat: [0, -1], plane: [0, 0] };
  for (const s of IE.shops) { const p = w2m(s.mx, s.mz); const o = MV.zoom < 2.5 ? off[s.type] : [0, 0]; icon(g, tx(p.x) + o[0] * 10 * dpr, ty(p.y) + o[1] * 10 * dpr, s.type, 6 * dpr * sz); }
  { const p = w2m(IE.base.x, IE.base.z); icon(g, tx(p.x), ty(p.y), 'base', 9 * dpr * sz); g.fillStyle = '#d9e8a8'; g.textAlign = 'left'; g.fillText('Militärbasis', tx(p.x) + 12 * dpr, ty(p.y) + 4 * dpr); }
  for (const wr of IE.wrecks) { const p = w2m(wr.x, wr.z); icon(g, tx(p.x), ty(p.y), wr.got ? 'wreckGot' : 'wreck', 5.5 * dpr * sz); }
  if (IE.mapPOIs) for (const o of IE.mapPOIs()) { const p = w2m(o.x, o.z); icon(g, tx(p.x), ty(p.y), o.kind, (o.kind === 'gas' ? 5 : 7) * dpr * sz); if (o.label) { g.fillStyle = '#ffd6f6'; g.textAlign = 'left'; g.fillText(o.label, tx(p.x) + 10 * dpr, ty(p.y) + 4 * dpr); } }
  const mt = missionTarget(); if (mt) { const p = w2m(mt.x, mt.z); icon(g, tx(p.x), ty(p.y), mission.active ? 'target' : 'mission', 9 * dpr * sz); }
  if (waypoint) { const p = w2m(waypoint.x, waypoint.z); icon(g, tx(p.x), ty(p.y), 'wp', 7 * dpr * sz); }
  const pp = P.veh ? P.veh.pos : P.pos, p = w2m(pp.x, pp.z);
  g.save(); g.translate(tx(p.x), ty(p.y)); g.rotate(-P.yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2 * dpr;
  g.beginPath(); g.moveTo(0, -9 * dpr); g.lineTo(7 * dpr, 7 * dpr); g.lineTo(0, 3 * dpr); g.lineTo(-7 * dpr, 7 * dpr); g.closePath(); g.stroke(); g.fill(); g.restore();
  // Legende
  const items = [['island', 'Private Insel'], ['rocket', 'Mondrakete'], ['race', 'Rennstrecke'], ['villa', 'Villa (kaufbar)'], ['gas', 'Tankstelle'], ['plane', 'Flughafen & Hangar'], ['weapon', 'Waffenladen'], ['car', 'Autohaus'], ['luxury', 'Luxus-Autohaus'], ['biz', 'Geschäft (kaufbar)'], ['heli', 'Helikopterplatz'], ['boat', 'Bootsladen & Hafen'], ['base', 'Militärbasis'], ['wreck', 'Schiffswrack (tauchen)'], ['mission', 'Mission'], ['wp', 'Wegpunkt']];
  g.fillStyle = 'rgba(13,15,19,0.7)'; g.fillRect(6 * dpr, 6 * dpr, 160 * dpr, (items.length * 20 + 10) * dpr);
  items.forEach((it, i) => { icon(g, 20 * dpr, (20 + i * 20) * dpr, it[0], 7 * dpr); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `600 ${13 * dpr}px Barlow Condensed, Arial`; g.fillText(it[1], 34 * dpr, (21 + i * 20) * dpr); });
  $('mapZoom').textContent = MV.zoom.toFixed(1) + '×';
}
function openMap() {
  const pp = P.veh ? P.veh.pos : P.pos, p = w2m(pp.x, pp.z);
  if (MV.zoom <= 1) { MV.cx = MAP.c.width / 2; MV.cy = MAP.c.height / 2; } else { MV.cx = p.x; MV.cy = p.y; }
  $('mapModal').hidden = false; if (locked) document.exitPointerLock(); drawBig();
}
function zoomMap(f, sx, sy) {
  const cv = $('bigmap'); const nz = clamp(MV.zoom * f, 1, 8);
  if (sx !== undefined) { const mx = (sx - cv.width / 2) / MV.k + MV.cx, my = (sy - cv.height / 2) / MV.k + MV.cy; MV.zoom = nz; const k2 = cv.width / MAP.c.width * nz; MV.cx = mx - (sx - cv.width / 2) / k2; MV.cy = my - (sy - cv.height / 2) / k2; }
  else MV.zoom = nz;
  if (MV.zoom === 1) { MV.cx = MAP.c.width / 2; MV.cy = MAP.c.height / 2; }
  drawBig();
}
$('mapIn').addEventListener('click', () => zoomMap(1.6)); $('mapOut').addEventListener('click', () => zoomMap(1 / 1.6));
$('mapMe').addEventListener('click', () => { const pp = P.veh ? P.veh.pos : P.pos, p = w2m(pp.x, pp.z); MV.zoom = Math.max(MV.zoom, 3); MV.cx = p.x; MV.cy = p.y; drawBig(); });
$('bigmap').addEventListener('wheel', e => { e.preventDefault(); const r = $('bigmap').getBoundingClientRect(), d = $('bigmap').width / r.width; zoomMap(e.deltaY < 0 ? 1.25 : 0.8, (e.clientX - r.left) * d, (e.clientY - r.top) * d); }, { passive: false });
$('bigmap').addEventListener('pointerdown', e => { MV.drag = { x: e.clientX, y: e.clientY, cx: MV.cx, cy: MV.cy, moved: false }; $('bigmap').setPointerCapture(e.pointerId); });
$('bigmap').addEventListener('pointermove', e => {
  if (!MV.drag) return; const dx = e.clientX - MV.drag.x, dy = e.clientY - MV.drag.y;
  if (Math.hypot(dx, dy) > 6) MV.drag.moved = true;
  if (MV.drag.moved && MV.zoom > 1) { const r = $('bigmap').getBoundingClientRect(), d = $('bigmap').width / r.width; MV.cx = MV.drag.cx - dx * d / MV.k; MV.cy = MV.drag.cy - dy * d / MV.k; drawBig(); }
});
$('bigmap').addEventListener('pointerup', e => {
  const dr = MV.drag; MV.drag = null; if (!dr || dr.moved) return;
  const cv = $('bigmap'), r = cv.getBoundingClientRect(), d = cv.width / r.width;
  const mx = ((e.clientX - r.left) * d - cv.width / 2) / MV.k + MV.cx, my = ((e.clientY - r.top) * d - cv.height / 2) / MV.k + MV.cy;
  const x = IE.grid.x0 + mx / MAP.s, z = IE.grid.z0 + my / MAP.s;
  if (waypoint && Math.hypot(waypoint.x - x, waypoint.z - z) < 40 / MV.zoom) waypoint = null; else waypoint = { x, z };
  drawBig();
});

// ---------- Charaktere ----------
function openChars() {
  $('charModal').hidden = false; if (locked) document.exitPointerLock();
  const L = $('charList'); L.innerHTML = '';
  for (const id in IE.chars) {
    const c = IE.chars[id]; const b = document.createElement('button'); b.className = 'card' + (S.char === id ? ' cur' : '');
    b.innerHTML = `<div class="tag">${S.char === id ? 'Aktiv' : IE.cityById[c.home].name}</div><h3>${c.name}</h3><p>${c.age} Jahre. ${c.info}</p>`;
    b.addEventListener('click', () => switchChar(id)); L.appendChild(b);
  }
}
function switchChar(id) {
  if (mission.active) { toast('Während einer Mission nicht möglich'); return; }
  if (id === S.char) { closeModals(); return; }
  if (P.veh) { P.veh.driver = null; P.veh = null; $('speed').hidden = true; engineSound(null); }
  S.char = id; S.skin = ''; buildPlayerModel();
  const c = IE.cityById[IE.chars[id].home]; placePlayer(c.cx + 30, c.cz + 55); game.wanted = 0;
  closeModals(); banner('Charakter', IE.chars[id].name, IE.cityById[IE.chars[id].home].name, 2.5); saveGame();
}

// ---------- Pause ----------
function openPause() {
  $('cheatList').innerHTML = CHEATS.map(c => `<div class="cheat"><span class="seq">${c.seq.map(x => `<b>${x.replace('_LANG', ' (lang)')}</b>`).join('')}</span><span>${c.name}${c.toggle ? (game.ch[c.toggle] ? ' · <b style="color:var(--verde)">an</b>' : ' · aus') : ''}</span></div>`).join('');
  { const ph = $('pPhone'); if (ph) ph.hidden = !S.phone; const tb = $('pTV'); if (tb) tb.hidden = !S.phone; }
  $('pAdmin').hidden = !(window.IEaccount && IEaccount.admin && !IEaccount.hidden);
  $('cheatBox').hidden = !(window.IEaccount && IEaccount.admin && !IEaccount.hidden);
  $('pauseModal').hidden = false; if (window.IEonline) IEonline.renderPause(); if (locked) document.exitPointerLock();
  $('progTxt').textContent = `Story: ${Math.min(S.mission, IE.missions.length)} / ${IE.missions.length} Missionen`;
  $('optCtrl').textContent = isTouch ? 'Touch' : 'Tastatur & Maus';
  $('optSnd').textContent = opts.snd ? 'An' : 'Aus'; $('optSens').value = opts.sens; $('optView').textContent = opts.fp ? 'Ego-Sicht' : 'Normal';
}
$('pUp').addEventListener('click', () => openUpgrades());
$('pSkins').addEventListener('click', () => openSkins());
$('optGfx').addEventListener('click', () => { opts.gfx = { hoch: 'mittel', mittel: 'niedrig', niedrig: 'hoch' }[opts.gfx]; saveOpts(); applyGfx(); });
$('optSnd').addEventListener('click', () => { opts.snd = !opts.snd; saveOpts(); $('optSnd').textContent = opts.snd ? 'An' : 'Aus'; if (!opts.snd && AU.master) AU.master.gain.value = 0; else if (AU.master) AU.master.gain.value = 0.5; else audioInit(); });
function setCtrl(touch) {
  isTouch = touch; opts.ctrl = touch ? 'touch' : 'kbm'; saveOpts(); document.body.classList.toggle('touch', isTouch);
  $('keysDesk').hidden = isTouch; $('keysTouch').hidden = !isTouch; $('optCtrl').textContent = isTouch ? 'Touch' : 'Tastatur & Maus';
  inp.mx = inp.my = 0; inp.fire = inp.aim = false;
  if (!isTouch && document.pointerLockElement !== canvas) toast('Tastatur & Maus: WASD laufen · Maus = umsehen · Linksklick schießen · Rechtsklick zielen · Klick ins Spiel, um die Maus einzufangen', 6);
  else toast('Touch-Steuerung aktiv', 2);
}
$('optCtrl').addEventListener('click', () => setCtrl(!isTouch));
$('optView').addEventListener('click', () => { opts.fp = !opts.fp; saveOpts(); $('optView').textContent = opts.fp ? 'Ego-Sicht' : 'Normal'; });
$('optSens').addEventListener('input', e => { opts.sens = +e.target.value; saveOpts(); });
let resetArm = false;
$('optReset').addEventListener('click', () => {
  if (!resetArm) { resetArm = true; $('optReset').textContent = 'Wirklich löschen?'; setTimeout(() => { resetArm = false; $('optReset').textContent = 'Spielstand löschen'; }, 3000); return; }
  store.del(); const a = cloudAcc();
  if (a && ACC) a.save(saveSlot(), 'null', Date.now()).catch(() => { }).finally(() => location.reload()); else location.reload();
});

// ---------- Kamera ----------
const tmpV = new T.Vector3();
function updateCamera(dt) {
  const sens = 0.0026 * opts.sens * (inp.aim && (IE.weaponById[S.cur] || {}).scope ? 0.3 : 1);
  if (!uiOpen()) { cam.yaw -= inp.lookX * sens; cam.pitch = clamp(cam.pitch + inp.lookY * sens, opts.fp ? -1.3 : -0.6, opts.fp ? 1.3 : 1.25); }
  inp.lookX = inp.lookY = 0;
  if (game.spectate && game.spectate.pos) {
    const st = game.spectate.pos, ff = IE.fwd(cam.yaw), cpc = Math.cos(cam.pitch), spc = Math.sin(cam.pitch), dd = 8;
    cam.target.set(st.x, st.y + 1.6, st.z);
    tmpV.set(cam.target.x - ff.x * cpc * dd, cam.target.y + spc * dd + 1.5, cam.target.z - ff.z * cpc * dd);
    const gyy = IE.groundH(tmpV.x, tmpV.z) + 0.5; if (tmpV.y < gyy) tmpV.y = gyy;
    camera.position.copy(tmpV); camera.lookAt(cam.target); camera.fov = lerp(camera.fov, 62, dt * 5); camera.updateProjectionMatrix();
    return;
  }
  let tgt, dist, h;
  if (P.veh) {
    const v = P.veh; tgt = v.pos; dist = v.type === 'airship' ? 70 : v.type === 'plane' ? 12 + v.m.L * 0.9 : v.type === 'heli' ? 17 : v.type === 'boat' ? 7 + v.m.L * 0.7 : v.m.tank ? 15 : 8 + v.m.L * 0.4; h = v.type === 'airship' ? 10 : v.type === 'plane' ? 3.5 : v.type === 'heli' ? 2.5 : v.type === 'boat' ? 1.5 + v.m.H : v.m.tank ? 4 : 1.6;
    const mov = v.type === 'heli' ? Math.hypot(v.vel.x, v.vel.z) : Math.abs(v.speed || 0);
    if (v.type === 'plane' && performance.now() - inp.lastLook > 700 && mov > 3) { cam.yaw += angDiff(cam.yaw, v.yaw) * Math.min(1, dt * 3); cam.pitch += ((opts.fp ? -v.pitch : 0.16 - v.pitch * 0.7) - cam.pitch) * Math.min(1, dt * 3); }
    else if (performance.now() - inp.lastLook > 1400 && mov > 3 && !v.m.tank) { cam.yaw += angDiff(cam.yaw, v.yaw + (v.type === 'car' && v.speed < -1 ? Math.PI : 0)) * Math.min(1, dt * 2.2); cam.pitch += ((opts.fp ? 0.05 : v.type === 'heli' ? 0.32 : 0.2) - cam.pitch) * dt; }
    camera.fov = lerp(camera.fov, 62 + clamp(mov - 20, 0, 50) * 0.25, dt * 3);
  } else {
    tgt = P.pos; h = 1.55;
    const aiming = (inp.aim || P.aimT > 0 || inp.fire) && S.cur !== 'faust';
    dist = aiming ? 3.2 : P.under ? 4 : 5.2;
    const scope = inp.aim && (IE.weaponById[S.cur] || {}).scope;
    camera.fov = lerp(camera.fov, scope ? 16 : aiming && inp.aim ? 48 : 62, dt * 10);
    $('scope').hidden = !scope;
  }
  camera.updateProjectionMatrix();
  const f = IE.fwd(cam.yaw), right = { x: -f.z, z: f.x };
  P.h.group.visible = game.dead || ((!P.veh || P.veh.type === 'airship') && !opts.fp);
  if (opts.fp && !game.dead) {
    // Ego-Sicht: Augenposition
    const e = new T.Vector3();
    if (P.veh) {
      const v = P.veh, vf = IE.fwd(v.yaw), left = { x: vf.z, z: -vf.x };
      if (v.type === 'airship') { const hp = helmWorld(v); e.set(hp.x, hp.y + 1.65, hp.z); } else {
      const o = v.type === 'plane' ? (v.def.kind === 'jet' ? [6.8, v.m.gearH + 2.0, 0] : v.def.kind === 'fighter' ? [3.2, v.m.gearH + 1.9, 0] : [1.3, v.m.gearH + 1.3, 0]) : v.type === 'heli' ? [1.5, 1.9, 0.45] : v.type === 'boat' ? [-v.m.L * 0.08, v.m.H * 0.55 + 1.25, 0] : v.m.tank ? [-0.4, 3.4, 0] : [-0.15, v.def.kind === 'suv' || v.def.kind === 'van' || v.def.kind === 'pickup' ? 1.6 : 1.12, 0.38];
      e.set(v.pos.x + vf.x * o[0] + left.x * o[2], v.pos.y + o[1], v.pos.z + vf.z * o[0] + left.z * o[2]); }
    } else { e.set(P.pos.x + f.x * 0.2, P.pos.y + (P.under ? 1.1 : 1.65), P.pos.z + f.z * 0.2); }
    camera.position.copy(e);
    const cp = Math.cos(cam.pitch);
    cam.target.set(e.x + f.x * cp * 10, e.y - Math.sin(cam.pitch) * 10, e.z + f.z * cp * 10);
    camera.lookAt(cam.target);
    underwaterFx();
    return;
  }
  const side = !P.veh ? 0.55 : 0;
  cam.target.set(tgt.x + right.x * side, tgt.y + h, tgt.z + right.z * side);
  const cp = Math.cos(cam.pitch), spch = Math.sin(cam.pitch);
  tmpV.set(cam.target.x - f.x * cp * dist, cam.target.y + spch * dist, cam.target.z - f.z * cp * dist);
  // nicht in Gebäude / Boden
  const dir = tmpV.clone().sub(cam.target); const dl = dir.length(); dir.normalize();
  const hitD = IE.rayBoxes(cam.target, dir, dl);
  if (hitD < dl) tmpV.copy(cam.target).addScaledVector(dir, Math.max(0.6, hitD - 0.3));
  const gy = IE.groundH(tmpV.x, tmpV.z) + 0.5; if (tmpV.y < gy) tmpV.y = gy;
  { const sv = P.onShip || (P.veh && P.veh.type === 'airship' ? P.veh : null);
    if (sv) { const A = IE.AIRSHIP, q = shipLocal(sv, tmpV.x, tmpV.z), dy = sv.pos.y + 0.45;
      if (q.lz > A.cabinZ0 - 1 && q.lz < A.cabinZ1 + 1 && Math.abs(q.lx) < A.cabinX + 1 && tmpV.y < dy + 9) tmpV.y = dy + 9;
      else if (q.lz > -33 && q.lz < 33 && Math.abs(q.lx) < 9 && tmpV.y < dy + 1.2) tmpV.y = dy + 1.2; } }
  if (P.under) tmpV.y = Math.min(tmpV.y, -0.8);
  else if (tmpV.y < 0.4 && IE.groundH(tmpV.x, tmpV.z) < 0) tmpV.y = 0.4;
  camera.position.copy(tmpV);
  camera.lookAt(cam.target);
  underwaterFx();
}
const FOG_MOON = new T.Color(0x02030a), FOG_Z = new T.Color(0x5d6655), FOG_AIR = new T.Color(0xd5d2c8), FOG_SEA = new T.Color(0x0e5a70);
function underwaterFx() {
  const uw = camera.position.y < -0.05 && IE.groundH(camera.position.x, camera.position.z) < camera.position.y;
  game.uw = uw;
  $('under').hidden = !uw;
  if (uw) { scene.fog.color.copy(FOG_SEA); scene.fog.near = 1; scene.fog.far = 48; }
  else scene.fog.color.copy(IE.onMoon ? FOG_MOON : game.ch.zombies ? FOG_Z : FOG_AIR);
}

// ---------- HUD ----------
function updateHUD(dt) {
  $('moneyV').textContent = fmt(S.money);
  updateWheelBtn(); $('wheelBtn').hidden = !!P.veh || game.dead;
  if (gainT > 0) { gainT -= dt; if (gainT <= 0) $('moneyG').style.opacity = 0; }
  const w = curWeapon(); $('wName').textContent = w.name; $('wAmmo').textContent = w.id === 'faust' ? '' : S.weapons[w.id];
  const sn = starsN(); if (sn !== game.lastStars) { game.lastStars = sn; let st = ''; for (let i = 1; i <= 5; i++) st += `<span class="${sn >= i ? 'on' : ''}">★</span>`; $('stars').innerHTML = st; }
  $('hpB').style.width = clamp(P.health / maxHP() * 100, 0, 100) + '%'; $('arB').style.width = clamp(S.armor, 0, 100) + '%';
  if (P.veh) {
    const v = P.veh;
    if (v.type === 'plane') { $('spV').textContent = Math.round(v.speed * 3.6); $('spU').textContent = 'KM/H · ' + Math.round(v.pos.y - Math.max(0, IE.groundH(v.pos.x, v.pos.z))) + ' M · SCHUB ' + Math.round(v.throttle * 100) + ' %'; }
    else if (v.type === 'car' || v.type === 'boat') { $('spV').textContent = Math.round(Math.abs(v.speed) * 3.6); $('spU').textContent = 'KM/H'; }
    else if (v.type === 'airship') { $('spV').textContent = Math.round(Math.abs(v.speed) * 3.6); $('spU').textContent = 'KM/H · ' + Math.round(v.pos.y - Math.max(0, IE.groundH(v.pos.x, v.pos.z))) + ' M HÖHE'; }
    else { $('spV').textContent = Math.round(v.pos.y - Math.max(0, IE.groundH(v.pos.x, v.pos.z))); $('spU').textContent = 'M HÖHE · ' + Math.round(Math.hypot(v.vel.x, v.vel.z) * 3.6) + ' KM/H'; }
    $('spN').textContent = v.def.name + (v.health < v.maxHealth * 0.3 ? ' · BESCHÄDIGT' : '');
  }
  $('cross').hidden = !!(P.veh && (P.veh.type === 'heli' || P.veh.type === 'plane') && !P.veh.def.armed) || (!inp.aim && !inp.fire && P.aimT <= 0 && !isTouch && !P.veh && !opts.fp) || game.dead || P.under;
  $('o2W').hidden = P.o2 >= 0.999; $('o2B').style.width = (P.o2 * 100) + '%';
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) $('cross').classList.remove('hit'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').hidden = true; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').hidden = true; }
  P.hurtT -= dt; $('dmg').style.boxShadow = `inset 0 0 ${P.hurtT > 0 ? 160 : 120}px rgba(200,20,20,${P.hurtT > 0 ? 0.55 : P.health < 30 ? 0.35 : 0})`;
  $('lockhint').hidden = isTouch || locked || uiOpen() || dlg.active || game.state !== 'play';
  // Hinweise
  let pr = '';
  if (!dlg.active && !game.dead) {
    const m = curMission(), ex = IE.extraPrompt ? IE.extraPrompt() : '';
    if (ex) pr = ex;
    else if (!mission.active && m && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < 7) pr = `<b>E</b> · Mission starten: ${m.title}`;
    else if (P.interior) {
      const it = P.interior.it;
      if (Math.hypot(P.pos.x - it.door.x, P.pos.z - it.door.z) < 2.6) pr = '<b>E</b> · Hinausgehen';
      else if (P.interior.shop && Math.hypot(P.pos.x - it.counter.x, P.pos.z - it.counter.z) < 3.4) pr = '<b>E</b> · Einkaufen';
    }
    else if (!P.veh) {
      const s = nearestShop();
      if (s) pr = `<b>E</b> · ${s.type === 'weapon' ? 'Waffenladen betreten' : s.type === 'car' ? 'Autohaus betreten' : s.type === 'luxury' ? 'Luxus-Autohaus betreten' : s.type === 'biz' ? (S.biz && S.biz[s.id] ? 'Dein Geschäft: ' + IE.bizDefs[s.biz].name + ' (Kasse: ' + fmt(Math.floor(S.biz[s.id].cash)) + ')' : IE.bizDefs[s.biz].name + ' kaufen · ' + fmt(IE.bizDefs[s.biz].price)) : s.type === 'boat' ? 'Bootsladen betreten' : s.type === 'plane' ? 'Hangar: Flugzeug wählen' : s.type === 'phone' ? (S.phone ? 'Handy-Laden' : 'Handy kaufen · ' + fmt(150000)) : 'Helikopterplatz'}`;
      else { for (const v of IE.vehicles) if (!v.dead && vehDist(v) < vehReach(v)) { pr = v.type === 'airship' ? '<b>F</b> · Ans Steuer der Flug-Yacht' : `<b>F</b> · Einsteigen: ${v.def.name}`; break; }
      if (!pr && P.ride) pr = '<b>F</b> · Aussteigen (Beifahrer)';
      if (!pr && !P.ride && ONL() && IEonline.nearCarPeer && IEonline.nearCarPeer(P.pos)) pr = '<b>F</b> · Als Beifahrer einsteigen bei ' + IEonline.nearCarPeer(P.pos).name;
      if (!pr && airshipBelow()) pr = '<b>E</b> · An Bord der Flug-Yacht gehen';
      if (!pr && P.under) pr = 'Unter Wasser · Luft ' + Math.round(P.o2 * 100) + ' %'; }
    } else if (P.veh.type === 'heli' && P.veh.rotor < 0.75) pr = 'Rotor läuft an …';
    else if (P.veh.type === 'plane' && P.veh.onGround && P.veh.speed < P.veh.def.minSpeed) pr = isTouch ? 'GAS + halten · ab ' + Math.round(P.veh.def.minSpeed * 3.6) + ' km/h Joystick hoch = abheben' : 'Leertaste = Gas · ab ' + Math.round(P.veh.def.minSpeed * 3.6) + ' km/h W = abheben';
    else if (P.veh.m.tank) pr = 'Kanone: Feuer · Turm folgt der Kamera';
    else if (P.veh.def.armed) pr = isTouch ? 'Bordkanone: FEUER · RAKETE · BOMBE · BOOST' : 'Bordkanone: Linksklick · Rakete: R · Bomben: B · Boost: X';
  }
  pr = pr.replace('<b>F</b>', isTouch ? '<b>EIN/AUS</b>' : '<b>E</b>');
  $('prompt').hidden = !pr; if (pr) $('prompt').innerHTML = pr;
  // Touch-Buttons je nach Lage
  if (isTouch) {
    const inH = P.veh && P.veh.type === 'heli', inC = P.veh && P.veh.type === 'car';
    const inB = P.veh && P.veh.type === 'boat';
    const inSub = inB && P.veh.def.kind === 'sub';
    const inA = P.veh && P.veh.type === 'airship';
    $('tDown').style.display = inH || inA || P.fly || inSub || (P.swim && !P.veh) ? '' : 'none'; $('tDown').textContent = P.veh && P.veh.type === 'plane' ? 'GAS −' : inSub ? 'TAUCHEN' : inH || inA || P.fly ? 'RUNTER' : 'TAUCHEN';
    const inP = P.veh && P.veh.type === 'plane';
    if (inP) $('tDown').style.display = '';
    $('tJump').textContent = !P.veh && !P.onGround && !P.chute && !P.swim && P.pos.y - IE.supportH(P.pos.x, P.pos.z, P.pos.y) > 8 ? 'SCHIRM' : inP ? 'GAS +' : inH || inA || P.fly ? 'HOCH' : inSub ? 'AUF' : inC || inB ? 'BREMSE' : P.swim ? 'AUF' : 'SPRUNG';
    $('tSprint').style.display = P.veh ? 'none' : ''; $('tAim').style.display = P.veh ? 'none' : '';
    $('tFire').style.display = (inH || (P.veh && P.veh.type === 'plane')) && !P.veh.def.armed ? 'none' : '';
    $('tBomb').style.display = P.veh && (inH || P.veh.type === 'plane') && P.veh.def.armed ? '' : 'none';
    $('tMissile').style.display = P.veh && P.veh.type === 'plane' && P.veh.def.armed ? '' : 'none';
    $('tBoost').style.display = P.veh && P.veh.type === 'plane' ? '' : 'none';
    $('tDrift').style.display = inC && !P.veh.m.tank ? '' : 'none';
  }
}

// ---------- Hauptschleife ----------
let last = performance.now();
function frame() {
  requestAnimationFrame(frame);
  try { frameBody(); } catch (e) { console.error(e); if (!frame.errShown) { frame.errShown = true; try { toast('Kleiner Fehler abgefangen – das Spiel läuft weiter', 3); } catch (e2) { } } }
}
function frameBody() {
  const now = performance.now(); let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!$('wheel').hidden) dt *= 0.15;
  if (game.state === 'title') { titleCam(dt); renderer.render(scene, camera); return; }
  if (game.state !== 'play') return;
  game.time += dt;
  readMove();
  // Einmal-Aktionen
  if (game.spectate && (!game.spectate.pos || (ONL() && IEonline.peers && !IEonline.peers.has(game.spectate.peer)) || !(game.spectate.pr && game.spectate.pr.str))) stopSpectate();
  if (pressed.has('pause')) { if (game.spectate) stopSpectate(); else if (uiOpen()) closeModals(); else openPause(); }
  if (!uiOpen()) {
    if (dlg.active) { if (pressed.has('space') || pressed.has('act') || pressed.has('enter')) advanceDlg(); }
    else if (!game.dead) {
      if (pressed.has('enter') && !P.jailed) tryEnterExit();
      if (pressed.has('act') && P.jailed) { /* gefangen: keine Aktionen */ }
      else if (pressed.has('act')) {
        const m = curMission();
        if (ONL() && IEonline.freeNearbyJailed && IEonline.freeNearbyJailed()) { }
        else if (IE.extraAct && IE.extraAct()) { }
        else if (!mission.active && m && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < 7) startMission();
        else if (P.interior && Math.hypot(P.pos.x - P.interior.it.door.x, P.pos.z - P.interior.it.door.z) < 2.6) exitInterior();
        else if (P.interior && P.interior.shop && Math.hypot(P.pos.x - P.interior.it.counter.x, P.pos.z - P.interior.it.counter.z) < 3.4) openShop(P.interior.shop);
        else if (!P.veh && !P.interior && airshipBelow()) { const v = airshipBelow(); P.pos.copy(shipWorld(v, 0, -6)); P.vy = 0; P.onShip = v; fade(); }
        else if (!P.veh && !P.interior) {
          const s = nearestShop();
          if (s && SHOP_ROOM[s.type]) { if (starsN() > 0) toast('Mit Fahndungslevel lässt dich niemand rein'); else enterInterior(SHOP_ROOM[s.type], s.mx, s.mz, s); }
          else if (s) openShop(s);
          else if (!isTouch) tryEnterExit(); // Tastatur: E steigt auch ein
        }
        else if (P.veh && !isTouch) tryEnterExit(); // Tastatur: E steigt aus
      }
      if (pressed.has('weap')) cycleWeapon(1); if (pressed.has('weapPrev')) cycleWeapon(-1);
      for (let i = 1; i <= 7; i++) if (pressed.has('w' + i)) { const w = IE.weapons[i - 1]; if (w && S.weapons[w.id] !== undefined) { S.cur = w.id; updateGunModel(); } }
      if (pressed.has('map')) openMap();
      if (pressed.has('char')) openChars();
      if (pressed.has('wheel')) openWheel();
      if (pressed.has('view')) { opts.fp = !opts.fp; saveOpts(); toast(opts.fp ? 'Ego-Sicht' : 'Normale Sicht', 1.2); }
    }
  } else if ((pressed.has('map') && !$('mapModal').hidden) || (pressed.has('wheel') && !$('wheel').hidden)) closeModals();
  if (pressed.has('space')) P.jumpReq = 0.2; // Sprung merken (wird erst in updatePlayer ausgewertet)
  pressed.clear();

  updatePlayer(dt);
  if (IE.extraUpdate) IE.extraUpdate(dt);
  if (game.dead) { game.deadT += dt; if (game.deadT > 3.5) respawn(); }
  if (game.ch.zombies) zombieSpawner(dt);
  for (let i = IE.npcs.length - 1; i >= 0; i--) { const n = IE.npcs[i]; npcUpdate(n, dt); if (n.remove) { scene.remove(n.group); IE.npcs.splice(i, 1); } }
  vehiclesUpdate(dt);
  spawner(dt); policeUpdate(dt); jailUpdate(dt); missionUpdate(dt);
  // Geld aufsammeln
  for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; p.t += dt; p.m.rotation.y += dt * 3; if (p.m.position.distanceTo(P.pos) < 2.2 + (P.veh ? 2 : 0)) { addMoney(p.amt); scene.remove(p.m); pickups.splice(i, 1); } else if (p.t > 60) { scene.remove(p.m); pickups.splice(i, 1); } }
  // Schätze in Schiffswracks
  for (const w of IE.wrecks) {
    if (w.got) continue;
    w.chest.children[2].material.opacity = 0.12 + Math.sin(game.time * 3) * 0.08;
    if (Math.hypot(P.pos.x - w.cx, P.pos.y - w.cy, P.pos.z - w.cz) < 3.2) {
      w.got = true; w.chest.visible = false; S.wrecks.push(w.id); addMoney(w.amount); sfx('pass');
      banner('Schiffswrack', 'Schatz gefunden!', '+ ' + fmt(w.amount), 4); saveGame();
    }
  }
  // Lebensregeneration bis 50
  if (!game.dead && P.health < maxHP() * 0.5 && P.hurtT < -4) P.health = Math.min(maxHP() * 0.5, P.health + dt * 2);
  updateEffects(dt);
  if (ONL()) IEonline.update(dt);
  // Wegpunkt
  if (waypoint) { setBeam(wpBeam, waypoint.x, waypoint.z); if (Math.hypot(P.pos.x - waypoint.x, P.pos.z - waypoint.z) < 15) { waypoint = null; wpBeam.visible = false; } } else wpBeam.visible = false;
  IE.markers.forEach(m => m.rotation.y += dt);
  IE.waterN.offset.x += dt * 0.004; IE.waterN.offset.y += dt * 0.002;
  updateCamera(dt);
  // Sonne folgt dem Spieler (Schatten)
  sun.position.set(P.pos.x + SUN_DIR.x * 300, P.pos.y + SUN_DIR.y * 300, P.pos.z + SUN_DIR.z * 300); sun.target.position.copy(P.pos);
  IE.sky.position.copy(camera.position);
  const alt = camera.position.y; if (!game.uw) { if (IE.onMoon) { scene.fog.near = 900; scene.fog.far = 6000; } else if (game.ch.zombies) { scene.fog.near = 40; scene.fog.far = 420 + alt * 2; } else { scene.fog.near = 500 + alt * 2; scene.fog.far = 3200 + alt * 6; } }
  if (IE.dayNightApply) IE.dayNightApply();
  engineSound(P.veh && !P.veh.dead ? P.veh : null);
  updateHUD(dt);
  drawMini();
  renderer.render(scene, camera);
}

// ---------- Titel-Kamera ----------
let tcam = 0;
function titleCam(dt) {
  tcam += dt * 0.03; const c = IE.cityById.neapel;
  camera.position.set(c.x + Math.cos(tcam) * 420, 160, c.z + Math.sin(tcam) * 420); camera.lookAt(c.x + 60, 20, c.z);
  IE.sky.position.copy(camera.position); IE.waterN.offset.x += dt * 0.004;
  sun.position.set(c.x + SUN_DIR.x * 300, SUN_DIR.y * 300, c.z + SUN_DIR.z * 300); sun.target.position.set(c.x, 0, c.z);
}

// ---------- Start ----------
const S_DEFAULT = JSON.parse(JSON.stringify(S));
function startGame(cont, mode) {
  if (CLOUD.busy) { CLOUD.pending = [cont, mode]; toast('Spielstand wird vom Konto geladen …', 2); return; }
  audioInit();
  if (mode === 'online') {
    MODE = 'online'; SAVE_KEY = saveKeyFor('online'); Object.assign(S, JSON.parse(JSON.stringify(S_DEFAULT)), { money: 25000, mission: IE.missions.length });
    const so = store.get(); if (so) Object.assign(S, so, { mission: IE.missions.length });
    IE.setOnlineWorld(true);
    $('title').hidden = true; $('hudRoot').hidden = false; document.body.classList.add('playing', 'online');
    buildPlayerModel(); P.health = maxHP();
    const c = IE.cityById[IE.chars[S.char].home]; placePlayer(c.cx + 20 + Math.random() * 30, c.cz + 50 + Math.random() * 20);
    if (window.IE_GAME === 'dubai' && IE.dubaiSpawn) placePlayer(IE.dubaiSpawn.x + (Math.random() - 0.5) * 40, IE.dubaiSpawn.z + Math.random() * 30);
    missionStartMarker(); game.state = 'play'; last = performance.now();
    if (!isTouch) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
    setInterval(() => { if (game.state === 'play') saveGame(); }, 20000);
    return;
  }
  MODE = 'story'; SAVE_KEY = saveKeyFor('story'); // Story-Spiel: immer der Story-Slot
  const sv = cont ? store.get() : null;
  if (sv) Object.assign(S, sv); else { store.del(); }
  if (window.IE_GAME === 'dubai') S.mission = IE.missions.length; // Dubai: vorerst freies Spiel, keine Italien-Missionen
  IE.fixMissionSpots();
  $('title').hidden = true; $('hudRoot').hidden = false; document.body.classList.add('playing');
  buildPlayerModel(); P.health = maxHP();
  for (const w of IE.wrecks) if (S.wrecks.includes(w.id)) { w.got = true; w.chest.visible = false; }
  const m = curMission();
  if (window.IE_GAME === 'dubai' && IE.dubaiSpawn) {
    placePlayer(IE.dubaiSpawn.x, IE.dubaiSpawn.z); P.yaw = Math.PI; cam.yaw = P.yaw;
    if (!sv) { const v = IE.spawnCar(scene, 'cinquino', IE.dubaiSpawn.x - 8, IE.dubaiSpawn.z + 4, 0, { color: 0xe8d9a8 }); v.health = 450; }
    setTimeout(() => banner('Dubai Empire', 'Willkommen in Dubai', 'Karim landet aus Hamburg – bau dein Imperium auf', 6), 300);
  } else if (!sv) {
    // Jack kommt am Bahnhof von Neapel an – mit kaputtem Wagen
    placePlayer(m.x + 3, m.z + 4); P.yaw = Math.atan2(m.x - P.pos.x, m.z - P.pos.z); cam.yaw = P.yaw;
    const v = IE.spawnCar(scene, 'cinquino', m.x - 8, m.z + 4, 0, { color: 0x8a6f4a }); v.health = 450;
    setTimeout(() => banner(IE.chapters[0], 'Aeroporto di Napoli', 'Gelber Lichtstrahl = Mission · Dein Hangar ist nebenan', 6), 300);
  } else {
    const c = IE.cityById[IE.chars[S.char].home]; placePlayer(c.cx + 30, c.cz + 55);
  }
  missionStartMarker();
  game.state = 'play'; last = performance.now();
  if (!isTouch) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  setInterval(() => { if (game.state === 'play') saveGame(); }, 20000);
}

function boot() {
  resize();
  const steps = [
    ['Gelände wird berechnet …', () => IE.initTerrain()],
    ['Städte und Straßen werden gebaut …', () => IE.buildWorld(scene)],
    ['Karte wird gezeichnet …', () => buildMapCanvas()],
    ['Fertig', () => {
      applyGfx();
      missionBeam = makeBeam(0xf2c230, 2.4); mission.beacon = makeBeam(0xf2c230, 3); mission.beacon.visible = false; wpBeam = makeBeam(0xff5fd2, 2); wpBeam.visible = false;
      $('loading').hidden = true; $('title').hidden = false; game.state = 'title';
      $('keysDesk').hidden = isTouch; $('keysTouch').hidden = !isTouch;
      const cast = $('cast'); for (const id in IE.chars) { const c = IE.chars[id]; const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="tag">${c.age} Jahre · ${IE.cityById[c.home].name}${id === 'jack' ? ' · Hauptcharakter' : ''}</div><h3>${c.name}</h3><p>${c.info}</p>`; cast.appendChild(d); }
      if (store.get()) $('bCont').hidden = false;
    }]
  ];
  let i = 0;
  const run = () => {
    if (i >= steps.length) return;
    $('loadTxt').textContent = steps[i][0];
    setTimeout(() => { try { steps[i][1](); } catch (e) { $('loadTxt').textContent = 'Fehler: ' + e.message; console.error(e); return; } i++; run(); }, 30);
  };
  run();
  requestAnimationFrame(frame);
}
$('bNew').addEventListener('click', () => startGame(false));
$('bCont').addEventListener('click', () => startGame(true));
function setAccount(slug, nick) { ACC = '_' + slug; SAVE_KEY = saveKeyFor(MODE); $('bCont').hidden = !store.get(); cloudPull(); }
// ---------- Zuschauen (Spectate) ----------
function startSpectate(r) {
  if (!r || !r.pos) { toast('Dieser Spieler ist gerade nicht erreichbar', 2); return; }
  closeModals(); game.spectate = r;
  if (locked) { try { document.exitPointerLock(); } catch (e) { } }
  let bar = $('spectBar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'spectBar'; bar.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:70;background:rgba(10,14,20,0.9);color:#fff;font-family:var(--f-hud);padding:8px 14px;border-radius:10px;display:flex;gap:12px;align-items:center;border:1px solid rgba(255,255,255,0.2)'; document.body.appendChild(bar); }
  bar.innerHTML = '<span>🔴 Du schaust <b>' + (r.name || 'Spieler') + '</b> live zu</span>';
  const b = document.createElement('button'); b.textContent = 'Beenden'; b.style.cssText = 'background:#c8101a;border:0;color:#fff;border-radius:6px;padding:4px 10px;font-family:var(--f-hud);cursor:pointer'; b.onclick = stopSpectate; bar.appendChild(b);
  bar.style.display = '';
  toast('Zuschauen: ' + (r.name || 'Spieler') + ' · Maus = umsehen · ESC = beenden', 3);
}
function stopSpectate() { game.spectate = null; const bar = $('spectBar'); if (bar) bar.style.display = 'none'; }
IE.startSpectate = startSpectate; IE.stopSpectate = stopSpectate;

window.IEgame = { startSpectate, stopSpectate, explosion, get isTouch() { return isTouch; }, damageNPC, tracer, flash, enterInterior, exitInterior, putInVehicle, setWanted, maxHP, placePlayer, teleportTo, CHEATS, runCheat, openSkins, setFly, spawnAirship, openUpgrades, setAccount, S, P, game, mission, cam, scene, camera, startGame, startMission, startJob, nextStep, failMission, hurtPlayer, addMoney, toast, banner, fmt, saveGame, sfx, closeModals, openPause, IE };
boot();
})();
