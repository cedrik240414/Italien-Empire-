// ===== ITALIEN EMPIRE – Online über den eigenen Cloudflare-Server (z. B. auf GitHub Pages) =====
// Bildet dieselben Funktionen nach, die auf claude.ai über window.claude.use(...) bereitstehen.
'use strict';
(function () {
const base = String(window.IE_SERVER || '').replace(/\/+$/, '');
if (!base || (window.claude && typeof window.claude.use === 'function')) return;
const wsBase = base.replace(/^http/, 'ws');

const rand = n => { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map(x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); };
function stored(key, make) { let v = null; try { v = localStorage.getItem(key); } catch (e) { } if (!v) { v = make(); try { localStorage.setItem(key, v); } catch (e) { } } return v; }
const deviceId = stored('italienEmpire_cfid', () => 'p_' + rand(16));
const secret = stored('italienEmpire_cfsecret', () => rand(32));
const myId = () => (window.IEaccount && IEaccount.slug) || null;
const tok = () => (window.IEaccount && IEaccount.token) || '';

function makeRoom(name) {
  let ws = null, peer = null, open = false, closed = false, pres = {}, sendT = 0, sendTimer = null, readyRes, readyRej;
  const peers = new Map(), ls = {}, pl = [], cl = [];
  const ready = new Promise((res, rej) => { readyRes = res; readyRej = rej; });
  ready.catch(() => { });
  setTimeout(() => readyRej({ code: 'upstream_error', message: 'Server antwortet nicht' }), 10000);
  const mk = p => Object.freeze({ peer: p.peer, by: (p.presence && typeof p.presence.uid === 'string' && p.presence.uid) || null, isMe: p.peer === peer, sameTab: p.peer === peer,
    kind: 'viewer', guest: false, presence: Object.freeze(p.presence || {}), updatedAt: Date.now() });
  const meP = () => mk({ peer, presence: pres });
  const snapshot = () => (peer ? [meP()] : []).concat([...peers.values()]);
  const notify = (joined, updated, left) => { const ps = snapshot(); pl.forEach(f => { try { f({ peers: ps, joined, updated, left }); } catch (e) { console.error(e); } }); };
  const setConn = c => { open = c; cl.forEach(f => f(c)); };
  function flush() { sendTimer = null; if (open && ws) { sendT = Date.now(); ws.send(JSON.stringify({ t: 'presence', p: pres })); } }
  function connect() {
    if (closed) return;
    if (!tok()) { setTimeout(connect, 1000); return; }
    try { ws = new WebSocket(wsBase + '/room/' + encodeURIComponent(name) + '?token=' + encodeURIComponent(tok())); } catch (e) { setTimeout(connect, 2000); return; }
    ws.onopen = () => { setConn(true); flush(); };
    ws.onclose = ev => { setConn(false); if (ev && ev.code === 4002) { closed = true; if (window.IEgame) IEgame.toast('Dein Konto ist woanders online gegangen – diese Verbindung wurde getrennt', 6); return; } if (!closed) setTimeout(connect, 1500); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'denied') { if (m.reason === 'banned') { closed = true; if (window.IEaccount && IEaccount.onBanned) IEaccount.onBanned(); } return; }
      if (m.t === 'welcome') {
        // Neu verbunden: alte (evtl. tote) Einträge sauber entfernen, sonst bleiben Geister-Spieler stehen
        const old = [...peers.values()]; peer = m.peer; peers.clear();
        for (const p of m.peers || []) peers.set(p.peer, mk(p));
        readyRes(); notify(snapshot(), [], old.filter(o => !peers.has(o.peer)));
      }
      else if (m.t === 'presence') { if (m.peer === peer) return; const had = peers.has(m.peer), p = mk(m); peers.set(m.peer, p); notify(had ? [] : [p], had ? [p] : [], []); }
      else if (m.t === 'leave') { const p = peers.get(m.peer); peers.delete(m.peer); if (p) notify([], [], [p]); }
      else if (m.t === 'emit') { const msg = { topic: m.topic, data: m.data, peer: m.peer, from: m.from, adm: !!m.adm, by: (peers.get(m.peer) || {}).by || null, isMe: m.peer === peer, sameTab: m.peer === peer, kind: 'viewer', guest: false }; (ls[m.topic] || []).forEach(f => { try { f(msg); } catch (e) { console.error(e); } }); }
    };
  }
  connect();
  const ka = setInterval(() => { if (closed) { clearInterval(ka); return; } if (open && ws) { try { ws.send('{"t":"ping"}'); } catch (e) { } } }, 8000); // Lebenszeichen
  return {
    name, ready,
    presence(patch) {
      const n = Object.assign({}, pres); for (const k in patch) { if (patch[k] === null) delete n[k]; else n[k] = patch[k]; } pres = n;
      if (!sendTimer) sendTimer = setTimeout(flush, Math.max(0, 90 - (Date.now() - sendT)));
      return Promise.resolve();
    },
    emit(topic, data) { if (open && ws) ws.send(JSON.stringify({ t: 'emit', topic, data })); return Promise.resolve(); },
    on(topic, fn) { (ls[topic] = ls[topic] || []).push(fn); return () => { ls[topic] = ls[topic].filter(f => f !== fn); }; },
    onPeers(fn) { pl.push(fn); if (peer) setTimeout(() => fn({ peers: snapshot(), joined: snapshot(), updated: [], left: [] }), 0); return () => { const i = pl.indexOf(fn); if (i >= 0) pl.splice(i, 1); }; },
    peers: snapshot,
    connected: () => open,
    onConnection(fn) { cl.push(fn); setTimeout(() => fn(open), 0); return () => { }; },
    reconnect() { try { if (ws) ws.close(); } catch (e) { } },
    leave() { closed = true; try { ws.close(); } catch (e) { } return Promise.resolve(); }
  };
}

const lobby = makeRoom('lobby-main');
lobby.join = async name => { const r = makeRoom(name); await r.ready; return r; };

const json = async (r) => { if (r.status === 403) throw { code: 'permission_denied', message: 'forbidden' }; if (!r.ok) throw { code: 'unavailable', message: 'HTTP ' + r.status }; return r.json(); };
const db = {
  collection(path) {
    if (path !== 'leaderboard') throw new TypeError('Nur die Rangliste ist auf dem Server');
    const q = (sort, lim) => ({
      limit: n => q(sort, n),
      get: async () => { const d = await json(await fetch(`${base}/board?sort=${encodeURIComponent(sort || 'kills')}&limit=${lim || 30}`)); const docs = (d.docs || []).map(x => ({ id: x.id, exists: true, data: () => x.data })); return { docs, size: docs.length, empty: !docs.length }; }
    });
    return {
      doc: id => ({
        get: async () => { const d = await json(await fetch(`${base}/board/${encodeURIComponent(id)}`)); return { id, exists: !!d.exists, data: () => d.data }; },
        set: async data => { await json(await fetch(`${base}/board/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, data, { token: tok() })) })); }
      }),
      orderBy: (f) => q(f, 30)
    };
  }
};
const user = { id: async () => myId(), profiles: async ids => Object.fromEntries([].concat(ids).map(i => [i, { id: i, name: '', color: '#d9b45a', avatarUrl: '', email: null, isMe: i === myId(), guest: false }])) };

// Konten auf dem Server
const post = async (path, body) => { const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); let d = {}; try { d = await r.json(); } catch (e) { } if (!r.ok) throw Object.assign(new Error(d.error || ('HTTP ' + r.status)), d, { code: d.error || 'http', status: r.status }); return d; };
const account = {
  register: (nick, ph) => post('/acc/register', { nick, ph }),
  login: (nick, ph) => post('/acc/login', { nick, ph }),
  me: () => post('/acc/me', { token: tok() }),
  claim: () => post('/acc/claim', { token: tok() }),
  logout: () => post('/acc/logout', { token: tok() }),
  list: () => post('/acc/list', { token: tok() }),
  act: (target, what, amount, ph) => post('/acc/act', { token: tok(), target, what, amount, ph }),
  save: (slot, data, t) => post('/acc/save', { token: tok(), slot, data, t }),
  load: slot => post('/acc/load', { token: tok(), slot }),
  moon: open => post('/acc/moon', { token: tok(), open: open !== false }),
  state: () => post('/acc/state', {}),
  houses: () => post('/acc/houses', {}),
  house: (op, id, paint) => post('/acc/house', { token: tok(), op, id, paint }),
  undercover: on => post('/acc/undercover', { token: tok(), on }),
  saveBeacon: (slot, data, t) => { try { fetch(base + '/acc/save', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), slot, data, t }) }).catch(() => { }); } catch (e) { } }
};
window.IECF = { use: async n => (n === 'room' ? lobby : n === 'db' ? db : n === 'user' ? user : null), server: base, account };
})();
