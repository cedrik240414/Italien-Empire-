// ===== ITALIEN EMPIRE – Online-Modus: Lobbys, andere Spieler, PvP, Crew-Aufträge, Rangliste =====
'use strict';
(function () {
const T = THREE;
const $ = id => document.getElementById(id);
const O = window.IEonline = { active: false, avail: null, isPublic: false, lobby: '', code: '', peers: new Map(), mePeer: null, myId: null,
  kills: 0, deaths: 0, jobs: 0, lastAtt: null, passive: false };
let lobbyRoom = null, room = null, db = null, user = null;
const G = () => window.IEgame;

// ---------- Verfügbarkeit ----------
O.init = function () {
  if (O._init) return O._init;
  O._init = (async () => {
    if (!window.claude || typeof window.claude.use !== 'function') { O.avail = false; return false; }
    try { lobbyRoom = await window.claude.use('room'); } catch (e) { lobbyRoom = null; }
    try { db = await window.claude.use('db'); } catch (e) { db = null; }
    try { user = await window.claude.use('user'); } catch (e) { user = null; }
    if (user) { try { O.myId = await user.id(); } catch (e) { } }
    O.avail = !!lobbyRoom; O.hasDb = !!db;
    return O.avail;
  })();
  return O._init;
};

// ---------- Lobby ----------
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
O.newCode = () => { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]; return c; };
O.join = async function (isPublic, code) {
  O.isPublic = isPublic; O.code = isPublic ? '' : code;
  O.lobby = isPublic ? 'oeffentlich' : 'privat-' + code;
  room = await lobbyRoom.join(O.lobby);
  O.room = room; O.active = true;
  room.onPeers(onPeers, e => G().toast('Online-Verbindung beendet (' + e.code + ')', 4));
  room.on('hit', onHit); room.on('kill', onKill); room.on('job', onJob); room.on('jobstep', onJobStep); room.on('jobkill', onJobKill);
  room.onConnection(c => { O.connected = c; updateBadge(); });
  await loadStats();
  updateBadge();
};
O.leave = async function () { try { if (room) await room.leave(); } catch (e) { } location.reload(); };

// ---------- Spieler in der Welt ----------
function nameTag(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = 'rgba(13,15,19,0.7)'; g.fillRect(0, 8, 256, 46);
  g.fillStyle = color || '#d9b45a'; g.fillRect(0, 8, 6, 46);
  g.fillStyle = '#fff'; g.font = 'bold 30px Barlow Condensed, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.slice(0, 18), 131, 32);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(2.6, 0.65, 1); sp.renderOrder = 10; return sp;
}
function vehModel(v) {
  if (v.t === 'car') { const d = IE.carById[v.id] || IE.cars[0]; return IE.makeCar(d.kind, v.col !== undefined ? v.col : d.color); }
  if (v.t === 'heli') return IE.makeHeli((IE.heliById[v.id] || IE.helis[0]).color, (IE.heliById[v.id] || {}).armed);
  if (v.t === 'boat') return IE.makeBoat(IE.boatById[v.id] || IE.boats[0]);
  if (v.t === 'plane') return IE.makePlane(IE.planeById[v.id] || IE.planes[0]);
  return null;
}
function ensurePeer(p) {
  const pr = p.presence || {}; if (typeof pr.x !== 'number') return;
  let r = O.peers.get(p.peer);
  const scene = G().scene;
  if (!r) {
    r = { peer: p.peer, by: null, pos: new T.Vector3(pr.x, pr.y, pr.z), last: new T.Vector3(pr.x, pr.y, pr.z), yaw: pr.yaw || 0, h: null, char: null, veh: null, vehKey: '', tag: null, name: 'Spieler', phase: 0, spd: 0 };
    O.peers.set(p.peer, r);
  }
  r.pr = pr; r.guest = p.guest;
  const by = p.by || (typeof pr.uid === 'string' ? pr.uid : null);
  if (by !== r.by) { r.by = by; resolveNames(); }
  if (r.char !== pr.c) {
    if (r.h) scene.remove(r.h.group);
    r.h = IE.makeHuman(IE.chars[pr.c] || IE.chars.jack); IE.setGunLen(r.h, 0.3); scene.add(r.h.group); r.char = pr.c;
  }
  const key = pr.v ? pr.v.t + ':' + pr.v.id : '';
  if (key !== r.vehKey) {
    if (r.veh) scene.remove(r.veh.group);
    r.veh = pr.v ? vehModel(pr.v) : null; r.vehKey = key;
    if (r.veh) scene.add(r.veh.group);
  }
  if (!r.tag) { r.tag = nameTag(r.name); scene.add(r.tag); }
}
function removePeer(peer) {
  const r = O.peers.get(peer); if (!r) return; const scene = G().scene;
  if (r.h) scene.remove(r.h.group); if (r.veh) scene.remove(r.veh.group); if (r.tag) scene.remove(r.tag);
  O.peers.delete(peer);
}
function onPeers(ch) {
  for (const p of ch.peers) if (p.sameTab) O.mePeer = p.peer;
  for (const p of ch.joined.concat(ch.updated)) { if (p.isMe || p.kind !== 'viewer') continue; ensurePeer(p); }
  for (const p of ch.left) removePeer(p.peer);
  updateBadge();
}
async function resolveNames() {
  if (!user) return;
  const ids = [...O.peers.values()].map(r => r.by).filter(Boolean); if (!ids.length) return;
  const ps = await user.profiles(ids);
  for (const r of O.peers.values()) {
    const nm = (r.by && ps[r.by] && ps[r.by].name) || 'Spieler';
    if (nm !== r.name || !r.tagNamed) { r.name = nm; r.tagNamed = true; if (r.tag) { G().scene.remove(r.tag); } r.tag = nameTag(nm, r.by && ps[r.by] ? ps[r.by].color : null); G().scene.add(r.tag); }
  }
  updateBadge();
}

// ---------- Senden der eigenen Position ----------
let sendT = 0, hitT = 0; const pending = {};
const r2 = v => Math.round(v * 100) / 100;
function sendPresence() {
  const g = G(), P = g.P, v = P.veh;
  const pr = { x: r2(P.pos.x), y: r2(P.pos.y), z: r2(P.pos.z), yaw: r2(P.yaw), c: g.S.char, hp: Math.round(P.health), dead: g.game.dead ? 1 : 0,
    sw: P.under ? 2 : P.swim ? 1 : 0, uid: O.myId || '', k: O.kills, d: O.deaths, pa: O.passive ? 1 : 0, w: g.S.cur };
  pr.v = v ? { t: v.type, id: v.def.id, yaw: r2(v.yaw), p: r2(v.pitch || 0), r: r2(v.roll || 0), col: v.m.bodyMat ? v.m.bodyMat.color.getHex() : undefined } : null;
  room.presence(pr).catch(() => { });
}
O.update = function (dt) {
  if (!room) return;
  sendT -= dt; if (sendT <= 0) { sendT = 0.1; sendPresence(); }
  hitT -= dt; if (hitT <= 0) { hitT = 0.15; for (const k in pending) { if (pending[k] > 0) room.emit('hit', { to: k, d: Math.min(400, Math.round(pending[k])) }).catch(() => { }); delete pending[k]; } }
  const cam = G().camera;
  for (const r of O.peers.values()) {
    const pr = r.pr; if (!pr) continue;
    const tgt = new T.Vector3(pr.x, pr.y, pr.z);
    if (r.pos.distanceTo(tgt) > 40) r.pos.copy(tgt); else r.pos.lerp(tgt, Math.min(1, dt * 9));
    const mv = r.pos.distanceTo(r.last) / Math.max(dt, 0.001); r.last.copy(r.pos); r.spd += (mv - r.spd) * Math.min(1, dt * 6);
    let dy = (pr.yaw || 0) - r.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.yaw += dy * Math.min(1, dt * 10);
    if (pr.v && r.veh) {
      r.h.group.visible = false; r.veh.group.visible = true;
      r.veh.group.position.copy(r.pos); r.veh.group.rotation.order = 'YXZ';
      r.veh.group.rotation.set(pr.v.t === 'plane' ? -(pr.v.p || 0) : (pr.v.p || 0), pr.v.yaw || 0, pr.v.r || 0);
      if (r.veh.rotor) { r.veh.rotor.rotation.y += dt * 28; r.veh.tailRotor.rotation.z += dt * 40; }
      if (r.veh.prop) r.veh.prop.rotation.x += dt * 50;
      if (r.veh.wheels) r.veh.wheels.forEach(w => { if (w.children[0]) w.children[0].rotation.z -= r.spd * dt / 0.36; });
      r.tag.position.set(r.pos.x, r.pos.y + (pr.v.t === 'plane' ? 6 : 4.2), r.pos.z);
    } else {
      if (r.veh) r.veh.group.visible = false;
      r.h.group.visible = true; r.h.group.position.copy(r.pos);
      if (pr.dead) r.h.group.rotation.set(-Math.PI / 2, r.yaw, 0);
      else {
        r.h.group.rotation.set(pr.sw === 2 ? 1.3 : pr.sw === 1 && r.spd > 0.5 ? 1.15 : 0, r.yaw, 0);
        if (pr.sw === 1 && r.spd > 0.5) r.h.group.position.y += 0.85; if (pr.sw === 2) r.h.group.position.y += 0.9;
        r.phase += dt * Math.min(r.spd, 9) * 2.1;
        IE.animHuman(r.h, r.phase, r.spd > 0.4 ? Math.min(0.9, 0.4 + r.spd * 0.06) : 0, false, false);
      }
      r.tag.position.set(r.pos.x, r.pos.y + 2.5, r.pos.z);
    }
    const d = cam.position.distanceTo(r.pos); r.tag.visible = d < 400; const s = Math.max(1, d / 25); r.tag.scale.set(2.6 * s, 0.65 * s, 1);
  }
  feedTick(dt);
};

// ---------- Treffer ----------
O.rayHit = function (o, d, skip, maxT) {
  if (O.passive) return null;
  let best = null, bt = maxT;
  for (const r of O.peers.values()) {
    const pr = r.pr; if (!pr || pr.dead || pr.pa) continue;
    const rad = pr.v ? (pr.v.t === 'heli' ? 3 : pr.v.t === 'plane' ? 4 : 2.1) : 0.5, cy = pr.v ? 1 : 1.2;
    const cx = r.pos.x - o.x, cyy = r.pos.y + cy - o.y, cz = r.pos.z - o.z;
    const tc = cx * d.x + cyy * d.y + cz * d.z; if (tc < skip || tc > bt) continue;
    const d2 = cx * cx + cyy * cyy + cz * cz - tc * tc; if (d2 < rad * rad) { bt = tc; best = r.peer; }
  }
  return best ? { t: bt, peer: best } : null;
};
O.sendHit = function (peer, dmg) { if (O.passive) return; pending[peer] = (pending[peer] || 0) + dmg; };
O.melee = function (pos, yaw, dmg) {
  const f = IE.fwd(yaw);
  for (const r of O.peers.values()) if (r.pr && !r.pr.dead && !r.pr.v && !r.pr.pa && Math.hypot(r.pos.x - (pos.x + f.x), r.pos.z - (pos.z + f.z)) < 1.4) O.sendHit(r.peer, dmg);
};
O.blast = function (p, radius, dmg) {
  for (const r of O.peers.values()) { if (!r.pr || r.pr.dead || r.pr.pa) continue; const d = r.pos.distanceTo(p); if (d < radius) O.sendHit(r.peer, dmg * (1 - d / radius)); }
};
function onHit(msg) {
  const data = msg.data || {}; if (msg.sameTab || data.to !== O.mePeer || O.passive) return;
  const g = G(); if (g.game.dead) return;
  const from = O.peers.get(msg.peer); if (from && from.pr && from.pr.pa) return;
  const d = Math.max(0, Math.min(400, +data.d || 0)); if (!d) return;
  O.lastAtt = { peer: msg.peer, t: performance.now() };
  g.hurtPlayer(d);
}
O.onDeath = function () {
  if (!room) return;
  O.deaths++;
  const att = O.lastAtt && performance.now() - O.lastAtt.t < 15000 ? O.lastAtt.peer : null;
  room.emit('kill', { victim: O.mePeer, killer: att }).catch(() => { });
  O.lastAtt = null; saveStats();
};
function peerName(peer) { if (peer === O.mePeer) return 'Du'; const r = O.peers.get(peer); return r ? r.name : 'Spieler'; }
function onKill(msg) {
  const data = msg.data || {}; if (data.victim !== msg.peer) return;
  if (data.killer) {
    addFeed(data.killer === O.mePeer ? `Du hast ${peerName(msg.peer)} erledigt` : msg.peer === O.mePeer ? `${peerName(data.killer)} hat dich erledigt` : `${peerName(data.killer)} hat ${peerName(msg.peer)} erledigt`);
    if (data.killer === O.mePeer && !msg.sameTab) { O.kills++; G().addMoney(1000); G().toast('Abschuss! + € 1.000', 2); saveStats(); }
  } else addFeed(msg.peer === O.mePeer ? 'Du bist gestorben' : `${peerName(msg.peer)} ist gestorben`);
}

// ---------- Crew-Aufträge ----------
O.startJob = function (id) { if (room) room.emit('job', { id }).catch(() => G().toast('Crew-Aufträge starten nur Mitwirkende des Spiels')); };
function jobDef(id) { return (IE.coopJobs || []).find(j => j.id === id); }
function onJob(msg) {
  const def = jobDef((msg.data || {}).id); if (!def) return;
  const g = G(); if (g.mission.active && g.mission.coop && g.mission.def === def) return;
  addFeed(msg.sameTab ? `Du startest: ${def.title}` : `${peerName(msg.peer)} startet: ${def.title}`);
  g.startJob(def); g.closeModals();
}
O.jobStep = function (id, step) { if (room) room.emit('jobstep', { id, step }).catch(() => { }); };
function onJobStep(msg) {
  if (msg.sameTab) return; const data = msg.data || {}; const g = G(), M = g.mission;
  if (!M.active || !M.coop || !M.def || M.def.id !== data.id) return;
  const target = Math.min(+data.step || 0, M.def.steps.length);
  let guard = 0; while (M.active && M.step < target && guard++ < 10) g.nextStep(true);
}
O.jobKill = function (id, step, i) { if (room) room.emit('jobkill', { id, step, i }).catch(() => { }); };
function onJobKill(msg) {
  if (msg.sameTab) return; const data = msg.data || {}; const M = G().mission;
  if (!M.active || !M.coop || !M.def || M.def.id !== data.id || M.step !== data.step) return;
  const n = M.enemies.find(e => e.id === data.i && !e.dead); if (n) IE.killNPC(n);
}
O.jobDone = function () { O.jobs++; saveStats(); };

// ---------- Rangliste ----------
let saveTimer = null, saving = false, dirty = false;
async function loadStats() {
  if (!db || !O.myId) return;
  try { const s = await db.collection('leaderboard').doc(O.myId).get(); if (s.exists) { const d = s.data(); O.kills = d.kills || 0; O.deaths = d.deaths || 0; O.jobs = d.jobs || 0; } } catch (e) { }
}
function saveStats() {
  if (!db || !O.myId) return; dirty = true;
  clearTimeout(saveTimer); saveTimer = setTimeout(flushStats, 2500);
}
async function flushStats() {
  if (saving || !dirty) return; saving = true; dirty = false;
  try { await db.collection('leaderboard').doc(O.myId).set({ kills: O.kills, deaths: O.deaths, jobs: O.jobs, money: Math.round(G().S.money), updated: Date.now() }); }
  catch (e) { if (e && e.code === 'permission_denied') G().toast('Rangliste: nur Mitwirkende können Punkte speichern', 3); }
  saving = false; if (dirty) saveStats();
}
O.flushStats = flushStats;
let boardSort = 'kills';
O.openBoard = async function () {
  $('boardModal').hidden = false; const list = $('boardList');
  document.querySelectorAll('[data-sort]').forEach(b => b.classList.toggle('cur', b.dataset.sort === boardSort));
  await O.init();
  if (!db) { list.innerHTML = '<div class="hint">Die Rangliste ist nur verfügbar, wenn das Spiel auf claude.ai geöffnet ist und du angemeldet bist.</div>'; return; }
  list.innerHTML = '<div class="hint">Lade Rangliste …</div>';
  const timer = setTimeout(() => { list.innerHTML = '<div class="hint">Die Rangliste ist gerade nicht erreichbar.</div>'; }, 10000);
  try {
    const snap = await db.collection('leaderboard').orderBy(boardSort, 'desc').limit(30).get();
    clearTimeout(timer);
    if (snap.empty) { list.innerHTML = '<div class="hint">Noch keine Einträge. Spiel online, um als Erster auf der Liste zu stehen!</div>'; return; }
    const ids = snap.docs.map(d => d.id); const ps = user ? await user.profiles(ids) : {};
    list.innerHTML = '';
    snap.docs.forEach((d, i) => {
      const v = d.data(), row = document.createElement('div'); row.className = 'brow' + (d.id === O.myId ? ' me' : '');
      const nm = (ps[d.id] && ps[d.id].name) || 'Spieler';
      row.innerHTML = '<span class="rk"></span><span class="nm"></span><span class="v"></span><span class="v"></span><span class="v"></span><span class="v"></span>';
      const c = row.children; c[0].textContent = i + 1; c[1].textContent = nm + (d.id === O.myId ? ' (du)' : '');
      c[2].textContent = v.kills || 0; c[3].textContent = v.deaths || 0; c[4].textContent = v.jobs || 0; c[5].textContent = '€ ' + Math.round(v.money || 0).toLocaleString('de-DE');
      list.appendChild(row);
    });
  } catch (e) { clearTimeout(timer); list.innerHTML = '<div class="hint">Die Rangliste konnte nicht geladen werden.</div>'; }
};
document.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { boardSort = b.dataset.sort; O.openBoard(); }));

// ---------- Anzeige ----------
const feed = [];
function addFeed(t) { feed.push({ t, life: 6 }); if (feed.length > 5) feed.shift(); renderFeed(); }
function renderFeed() { const el = $('killFeed'); el.innerHTML = ''; for (const f of feed) { const d = document.createElement('div'); d.textContent = f.t; el.appendChild(d); } }
function feedTick(dt) { let ch = false; for (let i = feed.length - 1; i >= 0; i--) { feed[i].life -= dt; if (feed[i].life <= 0) { feed.splice(i, 1); ch = true; } } if (ch) renderFeed(); }
function updateBadge() {
  const n = O.peers.size + 1;
  $('onBadge').hidden = !O.active;
  $('onBadge').textContent = `ONLINE · ${O.isPublic ? 'Öffentliche Lobby' : 'Privat · Code ' + O.code.toUpperCase()} · ${n} Spieler${O.connected === false ? ' · verbinde …' : ''}`;
}
O.renderPause = function () {
  const box = $('onPause'); box.hidden = !O.active; if (!O.active) return;
  $('onLobbyTxt').textContent = O.isPublic ? 'Öffentliche Lobby' : 'Private Lobby · Code ' + O.code.toUpperCase();
  const names = ['Du'].concat([...O.peers.values()].map(r => r.name));
  $('onPlayers').textContent = names.join(' · ');
  $('onStats').textContent = `Abschüsse ${O.kills} · Tode ${O.deaths} · Crew-Aufträge ${O.jobs}`;
  $('onPassive').textContent = O.passive ? 'Passivmodus: An' : 'Passivmodus: Aus';
  const jl = $('onJobs'); jl.innerHTML = '';
  for (const j of IE.coopJobs) {
    const b = document.createElement('button'); b.className = 'btn ghost jobbtn';
    b.innerHTML = `<span>${j.title}</span><small>${IE.cityById[j.city].name} · ${G().fmt(j.reward)} für jeden</small>`;
    b.addEventListener('click', () => { O.startJob(j.id); G().closeModals(); });
    jl.appendChild(b);
  }
};
$('onPassive').addEventListener('click', () => { O.passive = !O.passive; O.renderPause(); G().toast(O.passive ? 'Passivmodus an: Niemand kann dich treffen, du kannst niemanden treffen' : 'Passivmodus aus', 3); });
$('onLeave').addEventListener('click', () => O.leave());
$('onBoard2').addEventListener('click', () => { G().closeModals(); O.openBoard(); });

// ---------- Titelbildschirm ----------
function tStatus(t) { $('onStatus').textContent = t; }
async function goOnline(isPublic, code) {
  tStatus('Verbinde …');
  const ok = await O.init();
  if (!ok) { tStatus('Online ist hier nicht verfügbar. Öffne das Spiel auf claude.ai, während du angemeldet bist.'); return; }
  G().startGame(false, 'online');
  try { await O.join(isPublic, code); G().banner('Online', isPublic ? 'Öffentliche Lobby' : 'Private Lobby', isPublic ? 'Viel Glück da draußen' : 'Code: ' + code.toUpperCase() + ' – gib ihn deinen Freunden', 6); }
  catch (e) { G().toast('Lobby konnte nicht betreten werden (' + (e && e.code || 'Fehler') + ')', 5); }
}
$('bOnPub').addEventListener('click', () => goOnline(true));
$('bOnNew').addEventListener('click', () => goOnline(false, O.newCode()));
$('bOnJoin').addEventListener('click', () => {
  const c = ($('onCode').value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c.length < 3) { tStatus('Bitte gib den Lobby-Code ein (z. B. k7m2p).'); return; }
  goOnline(false, c);
});
$('bBoard').addEventListener('click', () => O.openBoard());
O.init().then(ok => { if (!ok) tStatus('Online-Modus und Rangliste funktionieren nur auf claude.ai mit Anmeldung.'); else tStatus('Bereit. Wähle eine Lobby.'); });
})();
