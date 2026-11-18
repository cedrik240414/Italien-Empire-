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
    const C = (window.claude && typeof window.claude.use === 'function') ? window.claude : window.IECF;
    O.viaServer = C === window.IECF && !!C;
    if (!C) { O.avail = false; return false; }
    try { lobbyRoom = await C.use('room'); } catch (e) { lobbyRoom = null; }
    try { db = await C.use('db'); } catch (e) { db = null; }
    try { user = await C.use('user'); } catch (e) { user = null; }
    if (user) { try { O.myId = await user.id(); } catch (e) { } }
    O.avail = !!lobbyRoom; O.hasDb = !!db;
    return O.avail;
  })();
  return O._init;
};

// ---------- Lobby ----------
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
O.newCode = () => { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]; return c; };
O.join = async function (isPublic, code, title) {
  O.isPublic = isPublic; O.code = isPublic ? '' : code;
  O.lobby = isPublic ? code : 'privat-' + code; O.title = isPublic ? (title || 'Öffentliche Lobby') : 'Private Lobby';
  lobbyRoom.presence({ lb: isPublic ? O.lobby : null, lt: isPublic ? O.title.slice(0, 40) : null, nm: (window.IEaccount && IEaccount.nick) || '' }).catch(() => { });
  room = await lobbyRoom.join(O.lobby);
  O.room = room; O.active = true;
  room.onPeers(onPeers, e => G().toast('Online-Verbindung beendet (' + e.code + ')', 4));
  room.on('hit', onHit); room.on('kill', onKill); room.on('job', onJob); room.on('jobstep', onJobStep); room.on('jobkill', onJobKill);
  room.onConnection(c => { O.connected = c; updateBadge(); });
  room.on('admin', msg => { const d = msg.data || {}; if (msg.adm && window.IEaccount && d.kick && d.kick === IEaccount.slug && IEaccount.onBanned) IEaccount.onBanned(); });
  await loadStats(); dirty = true; flushStats();
  updateBadge();
};
O.raceEmit = function (d) { if (room) room.emit('job', { race: d }).catch(() => { }); };
O.nearCarPeer = function (pos) {
  let best = null, bd = 4.8;
  for (const r of O.peers.values()) { const pr = r.pr; if (!pr || pr.dead || !pr.v || pr.v.t !== 'car' || pr.rd) continue; const d = Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z); if (d < bd) { bd = d; best = r; } }
  return best;
};
O.adminKick = function (slug) { if (room) room.emit('admin', { kick: slug }).catch(() => { }); };
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
  if (v.t === 'airship') return IE.makeAirship();
  return null;
}
function myUid() { const sl = window.IEaccount && IEaccount.slug; return sl ? 'a_' + sl : O.myId; }
function ensurePeer(p) {
  const pr = p.presence || {}; if (typeof pr.x !== 'number') return;
  const uid = p.by || (typeof pr.uid === 'string' ? pr.uid : null);
  if (uid && O.viaServer && uid === myUid()) return; // eigene alte Verbindung – nicht als zweiten Spieler zeigen
  if (uid) for (const [k, o] of O.peers) if (k !== p.peer && o.by === uid) removePeer(k); // gleiches Konto doppelt -> alte Verbindung weg
  let r = O.peers.get(p.peer);
  const scene = G().scene;
  if (!r) {
    r = { peer: p.peer, by: null, pos: new T.Vector3(pr.x, pr.y, pr.z), last: new T.Vector3(pr.x, pr.y, pr.z), yaw: pr.yaw || 0, h: null, char: null, veh: null, vehKey: '', tag: null, name: 'Spieler', phase: 0, spd: 0 };
    O.peers.set(p.peer, r);
  }
  r.pr = pr; r.guest = p.guest; r.seen = performance.now();
  const by = p.by || (typeof pr.uid === 'string' ? pr.uid : null);
  if (by !== r.by || (pr.nm && pr.nm !== r.name)) { r.by = by; resolveNames(); }
  const skin = typeof pr.sk === 'string' && IE.skinById[pr.sk] && (!IE.skinById[pr.sk].admin || pr.adm) ? IE.skinById[pr.sk] : null;
  const lookKey = skin ? 's:' + skin.id : 'c:' + pr.c;
  if (r.char !== lookKey) {
    if (r.h) scene.remove(r.h.group);
    r.h = IE.makeHuman(skin ? skin.look : (IE.chars[pr.c] || IE.chars.jack)); IE.setGunLen(r.h, 0.3); scene.add(r.h.group); r.char = lookKey;
  }
  const key = pr.v ? pr.v.t + ':' + pr.v.id : '';
  if (key !== r.vehKey) {
    if (r.veh) scene.remove(r.veh.group);
    r.veh = pr.v ? vehModel(pr.v) : null; r.vehKey = key;
    if (r.veh) scene.add(r.veh.group);
  }
  if (pr.ship && !r.shipM) { r.shipM = IE.makeAirship(); r.shipPos = new T.Vector3(pr.ship.x, pr.ship.y, pr.ship.z); scene.add(r.shipM.group); }
  if (!pr.ship && r.shipM) { scene.remove(r.shipM.group); r.shipM = null; }
  if (!r.tag) { r.tag = nameTag(r.name); scene.add(r.tag); }
}
function removePeer(peer) {
  const r = O.peers.get(peer); if (!r) return; const scene = G().scene;
  if (r.h) scene.remove(r.h.group); if (r.veh) scene.remove(r.veh.group); if (r.tag) scene.remove(r.tag); if (r.shipM) scene.remove(r.shipM.group);
  O.peers.delete(peer);
}
function onPeers(ch) {
  for (const p of ch.peers) if (p.sameTab) O.mePeer = p.peer;
  for (const p of ch.joined.concat(ch.updated)) { if (p.isMe || p.kind !== 'viewer') continue; ensurePeer(p); }
  for (const p of ch.left) removePeer(p.peer);
  updateBadge();
}
async function resolveNames() {
  const ids0 = [...O.peers.values()];
  if (!user) { for (const r of ids0) if (r.pr && r.pr.nm && r.pr.nm !== r.name) { r.name = r.pr.nm.slice(0, 16); if (r.tag) G().scene.remove(r.tag); r.tag = nameTag(r.name); G().scene.add(r.tag); } return; }
  const ids = [...O.peers.values()].map(r => r.by).filter(Boolean); if (!ids.length) return;
  const ps = await user.profiles(ids);
  for (const r of O.peers.values()) {
    const nm = (r.pr && r.pr.adm ? '★ ' : '') + ((r.pr && typeof r.pr.nm === 'string' && r.pr.nm.slice(0, 16)) || (r.by && ps[r.by] && ps[r.by].name) || 'Spieler');
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
    sw: P.under ? 2 : P.swim ? 1 : 0, sk: g.S.skin || '', uid: O.myId || '', nm: (window.IEaccount && IEaccount.nick) || '', k: O.kills, d: O.deaths, pa: O.passive ? 1 : 0, w: g.S.cur };
  const ship = IE.vehicles.find(q => q.type === 'airship' && q.mine && !q.removeMe);
  pr.ship = ship ? { x: r2(ship.pos.x), y: r2(ship.pos.y), z: r2(ship.pos.z), yaw: r2(ship.yaw) } : null;
  pr.rd = P.ride || null; pr.rc = IE.racePresence ? IE.racePresence() : null;
  pr.v = v && v.type !== 'airship' ? { t: v.type, id: v.def.id, yaw: r2(v.yaw), p: r2(v.pitch || 0), r: r2(v.roll || 0), col: v.m.bodyMat ? v.m.bodyMat.color.getHex() : undefined } : null;
  room.presence(pr).catch(() => { });
}
O.update = function (dt) {
  if (!room) return;
  sendT -= dt; if (sendT <= 0) { sendT = 0.1; sendPresence(); }
  hitT -= dt; if (hitT <= 0) { hitT = 0.15; for (const k in pending) { if (pending[k] > 0) room.emit('hit', { to: k, d: Math.min(400, Math.round(pending[k])) }).catch(() => { }); delete pending[k]; } }
  const cam = G().camera;
  const nowT = performance.now();
  for (const [k, r] of [...O.peers]) if (r.seen && nowT - r.seen > 25000) removePeer(k);
  for (const r of O.peers.values()) {
    const pr = r.pr; if (!pr) continue;
    if (r.shipM && pr.ship) { const st = new T.Vector3(pr.ship.x, pr.ship.y, pr.ship.z); if (r.shipPos.distanceTo(st) > 60) r.shipPos.copy(st); else r.shipPos.lerp(st, Math.min(1, dt * 9)); r.shipM.group.position.copy(r.shipPos); r.shipM.group.rotation.set(0, pr.ship.yaw || 0, 0); r.shipM.fans.forEach(f => f.rotation.y += dt * 10); }
    if (!pr.rd) r.toldRide = false;
    const tgt = new T.Vector3(pr.x, pr.y, pr.z);
    if (r.pos.distanceTo(tgt) > 40) r.pos.copy(tgt); else r.pos.lerp(tgt, Math.min(1, dt * 9));
    const mv = r.pos.distanceTo(r.last) / Math.max(dt, 0.001); r.last.copy(r.pos); r.spd += (mv - r.spd) * Math.min(1, dt * 6);
    let dy = (pr.yaw || 0) - r.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.yaw += dy * Math.min(1, dt * 10);
    if (pr.rd) { // fährt als Beifahrer mit
      r.h.group.visible = false; if (r.veh) r.veh.group.visible = false;
      r.tag.position.set(r.pos.x, r.pos.y + 5, r.pos.z);
      if (pr.rd === O.mePeer && !r.toldRide) { r.toldRide = true; G().toast(r.name + ' fährt bei dir mit', 2.5); }
    } else if (pr.v && r.veh && pr.v.t === 'airship') {
      r.veh.group.visible = true; r.veh.group.position.copy(r.pos); r.veh.group.rotation.set(0, pr.v.yaw || 0, 0);
      if (r.veh.fans) r.veh.fans.forEach(f => f.rotation.y += dt * 10);
      r.h.group.visible = false; r.tag.position.set(r.pos.x, r.pos.y + 14, r.pos.z);
    } else if (pr.v && r.veh) {
      r.h.group.visible = false; r.veh.group.visible = true;
      r.veh.group.position.copy(r.pos); r.veh.group.rotation.order = 'YXZ';
      r.veh.group.rotation.set(pr.v.t === 'plane' ? -(pr.v.p || 0) : (pr.v.p || 0), pr.v.yaw || 0, pr.v.r || 0);
      if (r.veh.rotor) { r.veh.rotor.rotation.y += dt * 28; r.veh.tailRotor.rotation.z += dt * 40; }
      if (r.veh.prop) r.veh.prop.rotation.x += dt * 50;
      if (r.veh.fans) r.veh.fans.forEach(f => f.rotation.y += dt * 10);
      if (r.veh.wheels) r.veh.wheels.forEach(w => { if (w.children[0]) w.children[0].rotation.z -= r.spd * dt / 0.36; });
      r.tag.position.set(r.pos.x, r.pos.y + (pr.v.t === 'plane' ? 6 : pr.v.t === 'airship' ? 14 : 4.2), r.pos.z);
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
// Schutz gegen absichtliches gegenseitiges Töten (Farming): pro Gegner Kills/Tode der letzten 10 Minuten
const farm = new Map();
function farmLog(peer, kind) {
  const r = O.peers.get(peer), key = (r && r.by) || (r && r.name) || peer, now = Date.now();
  const e = (farm.get(key) || []).filter(x => now - x.t < 600000); e.push({ t: now, k: kind }); farm.set(key, e);
  const kills = e.filter(x => x.k === 'k').length, all = e.length;
  const allMine = [...farm.values()].flat().filter(x => x.k === 'k' && now - x.t < 300000).length;
  const quick = e.filter(x => x.k === 'k').slice(-2); // zweimal in kurzer Folge (z. B. direkt nach dem Respawn)
  const fast = quick.length === 2 && quick[1].t - quick[0].t < 20000;
  return { blocked: kills > 3 || all > 5 || allMine > 15 || fast };
}
function peerName(peer) { if (peer === O.mePeer) return 'Du'; const r = O.peers.get(peer); return r ? r.name : 'Spieler'; }
function onKill(msg) {
  const data = msg.data || {}; if (data.victim !== msg.peer) return;
  if (data.killer) {
    addFeed(data.killer === O.mePeer ? `Du hast ${peerName(msg.peer)} erledigt` : msg.peer === O.mePeer ? `${peerName(data.killer)} hat dich erledigt` : `${peerName(data.killer)} hat ${peerName(msg.peer)} erledigt`);
    if (msg.sameTab && data.killer !== O.mePeer) farmLog(data.killer, 'd'); // ich wurde getötet
    if (data.killer === O.mePeer && !msg.sameTab) {
      const f = farmLog(msg.peer, 'k');
      if (f.blocked) { G().toast('Kill-Farming erkannt – für ' + peerName(msg.peer) + ' gibt es gerade keine Belohnung', 4); }
      else { O.kills++; const pay = 250000; G().addMoney(pay); G().toast('Abschuss! + ' + G().fmt(pay), 2.5); saveStats(); }
    }
  } else addFeed(msg.peer === O.mePeer ? 'Du bist gestorben' : `${peerName(msg.peer)} ist gestorben`);
}

// ---------- Crew-Aufträge ----------
O.startJob = function (id) { if (room) room.emit('job', { id }).catch(() => G().toast('Crew-Aufträge starten nur Mitwirkende des Spiels')); };
function jobDef(id) { return (IE.coopJobs || []).find(j => j.id === id); }
function onJob(msg) {
  if (msg.data && msg.data.race) { if (IE.onRaceMsg) IE.onRaceMsg(msg); return; }
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
  try { await db.collection('leaderboard').doc(O.myId).set({ kills: O.kills, deaths: O.deaths, jobs: O.jobs, money: Math.round(O.active ? G().S.money : (O.boardMoney || 0)), nick: ((window.IEaccount && IEaccount.nick) || '').slice(0, 16), updated: Date.now() }); }
  catch (e) { if (e && e.code === 'permission_denied') G().toast('Rangliste: nur Mitwirkende können Punkte speichern', 3); }
  saving = false; if (dirty) saveStats();
}
O.flushStats = flushStats;
// Nach der Anmeldung in der Rangliste eintragen (auch ohne Online-Spiel)
O.touchBoard = async function () {
  await O.init(); if (user) { try { O.myId = await user.id(); } catch (e) { } } if (!db || !O.myId) return;
  await loadStats();
  try { const s = await db.collection('leaderboard').doc(O.myId).get(); const slug = (window.IEaccount && IEaccount.slug) || '';
    let mo = 25000; try { const sv = JSON.parse(localStorage.getItem('italienEmpire_online_v1' + (slug ? '_' + slug : '')) || 'null'); if (sv && sv.money) mo = sv.money; } catch (e) { }
    O.boardMoney = s.exists ? Math.max(s.data().money || 0, mo) : mo;
    const nick = ((window.IEaccount && IEaccount.nick) || '').slice(0, 16);
    if (!s.exists || s.data().nick !== nick) { dirty = true; await flushStats(); }
  } catch (e) { }
  if (lobbyRoom) lobbyRoom.presence({ nm: (window.IEaccount && IEaccount.nick) || '' }).catch(() => { });
};
let boardSort = 'kills';
O.openBoard = async function () {
  document.body.classList.add('modalopen');
  $('boardModal').hidden = false; const list = $('boardList');
  document.querySelectorAll('[data-sort]').forEach(b => b.classList.toggle('cur', b.dataset.sort === boardSort));
  await O.init();
  if (!db) { list.innerHTML = '<div class="hint">Die Rangliste ist hier noch nicht eingerichtet (Online-Server fehlt).</div>'; return; }
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
      const nm = (typeof v.nick === 'string' && v.nick) || (ps[d.id] && ps[d.id].name) || 'Spieler';
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
  $('onBadge').textContent = `ONLINE · ${O.isPublic ? O.title : 'Privat · Code ' + O.code.toUpperCase()} · ${n} Spieler${O.connected === false ? ' · verbinde …' : ''}`;
}
O.renderPause = function () {
  const box = $('onPause'); box.hidden = !O.active; if (!O.active) return;
  $('onLobbyTxt').textContent = O.isPublic ? O.title + ' (öffentlich)' : 'Private Lobby · Code ' + O.code.toUpperCase();
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
async function goOnline(isPublic, code, title) {
  tStatus('Verbinde …');
  const ok = await O.init();
  if (!ok) { tStatus('Online ist hier noch nicht eingerichtet (Online-Server fehlt). Auf claude.ai funktioniert es immer.'); return; }
  G().startGame(false, 'online');
  try { await O.join(isPublic, code, title); G().banner('Online', isPublic ? (title || 'Öffentliche Lobby') : 'Private Lobby', isPublic ? 'Viel Glück da draußen' : 'Code: ' + code.toUpperCase() + ' – gib ihn deinen Freunden', 6); }
  catch (e) { G().toast('Lobby konnte nicht betreten werden (' + (e && e.code || 'Fehler') + ')', 5); }
}
// ---------- Lobby-Browser ----------
const FIXED_LOBBIES = [{ id: 'pub-italia-1', t: 'Italia 1' }, { id: 'pub-italia-2', t: 'Italia 2' }, { id: 'pub-italia-3', t: 'Italia 3' }];
const MAX_PLAYERS = 16;
function lobbyList() {
  const map = new Map(FIXED_LOBBIES.map(l => [l.id, { id: l.id, t: l.t, n: 0, names: [] }]));
  if (lobbyRoom) for (const p of lobbyRoom.peers()) {
    const pr = p.presence || {}; if (typeof pr.lb !== 'string' || !/^pub-[a-z0-9-]{1,40}$/.test(pr.lb)) continue;
    if (!map.has(pr.lb)) map.set(pr.lb, { id: pr.lb, t: typeof pr.lt === 'string' ? pr.lt.slice(0, 40) : pr.lb, n: 0, names: [] });
    const l = map.get(pr.lb); l.n++; if (pr.nm) l.names.push(String(pr.nm).slice(0, 16));
  }
  return [...map.values()].sort((a, b) => b.n - a.n || a.t.localeCompare(b.t));
}
function renderLobbies() {
  if ($('lobbyModal').hidden) return;
  const el = $('lobbyRows'); el.innerHTML = '';
  let total = 0;
  for (const l of lobbyList()) {
    total += l.n;
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = '<div><div class="nm"></div><div class="st"></div></div><div class="acts"><button class="buy">Beitreten</button></div>';
    row.querySelector('.nm').textContent = l.t;
    row.querySelector('.st').textContent = `${l.n} / ${MAX_PLAYERS} Spieler` + (l.names.length ? ' · ' + l.names.slice(0, 6).join(', ') + (l.names.length > 6 ? ' …' : '') : '');
    const b = row.querySelector('button'); b.disabled = l.n >= MAX_PLAYERS; if (l.n >= MAX_PLAYERS) b.textContent = 'Voll';
    b.addEventListener('click', () => { G().closeModals(); goOnline(true, l.id, l.t); });
    el.appendChild(row);
  }
  $('lobbyTotal').textContent = total ? `${total} Spieler online` : 'Gerade spielt niemand online – starte eine Lobby!';
}
O.openLobbies = async function () {
  document.body.classList.add('modalopen');
  $('lobbyModal').hidden = false; $('lobbyRows').innerHTML = '<div class="hint">Suche Lobbys …</div>';
  const ok = await O.init();
  if (!ok) { $('lobbyRows').innerHTML = '<div class="hint">Online ist hier noch nicht eingerichtet (Online-Server fehlt). Auf claude.ai funktioniert es immer.</div>'; $('lobbyTotal').textContent = ''; return; }
  if (!O._lobbyWatch) O._lobbyWatch = lobbyRoom.onPeers(() => renderLobbies());
  renderLobbies();
};
const CITY_NAMES = ['Roma', 'Napoli', 'Milano', 'Firenze', 'Venezia', 'Palermo', 'Torino', 'Genova', 'Bari', 'Bologna'];
$('lobbyNew').addEventListener('click', () => {
  const t = 'Lobby ' + CITY_NAMES[(Math.random() * CITY_NAMES.length) | 0] + ' ' + (100 + ((Math.random() * 900) | 0));
  G().closeModals(); goOnline(true, 'pub-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-'), t);
});
$('bOnPub').addEventListener('click', () => O.openLobbies());
$('bOnNew').addEventListener('click', () => goOnline(false, O.newCode()));
$('bOnJoin').addEventListener('click', () => {
  const c = ($('onCode').value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c.length < 3) { tStatus('Bitte gib den Lobby-Code ein (z. B. k7m2p).'); return; }
  goOnline(false, c);
});
$('bBoard').addEventListener('click', () => O.openBoard());
O.init().then(ok => {
  if (!ok) { tStatus('Online ist hier noch nicht eingerichtet (Online-Server fehlt). Auf claude.ai funktioniert es immer.'); return; }
  tStatus('Bereit. Wähle eine Lobby.');
  const upd = () => { const n = lobbyList().reduce((a, l) => a + l.n, 0); tStatus(n ? `Bereit · ${n} Spieler gerade online` : 'Bereit. Wähle eine Lobby.'); renderLobbies(); };
  lobbyRoom.onPeers(upd);
});
})();
