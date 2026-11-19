// Italien Empire – Online-Server (Cloudflare Worker + Durable Objects)
//   /acc/...      Konten (Registrieren, Anmelden, Admin-Aktionen)  -> Durable Object "main"
//   /board...     Rangliste                                        -> Durable Object "main"
//   /room/<name>  WebSocket-Lobby (Positionen, Ereignisse)         -> je Raum ein Durable Object
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const H = { ...CORS, 'content-type': 'application/json; charset=utf-8' };
const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const SUPER_ADMINS = ['crim', 'crimhotdog24', 'entity2806', 'avokado3seb', 'avocado3seb']; // "Crim" / "Crim Hotdog24" / "Entity_2806" – können nicht entfernt oder gebannt werden
const HIDDEN_ADMINS = ['entity2806', 'avokado3seb', 'avocado3seb']; // geheime Admins: für andere Spieler nicht als Admin sichtbar
const canHide = slug => HIDDEN_ADMINS.includes(slug);
const isHiddenAcc = a => !!a && canHide(a.slug) && !a.revealed; // Undercover kann vom Spieler selbst abgeschaltet werden
const isSuper = slug => SUPER_ADMINS.includes(slug);
const j = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: H });
const slugOf = n => String(n || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').slice(0, 16);
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const rnd = n => { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'room' && parts[1]) {
      const name = decodeURIComponent(parts[1]);
      if (!ROOM_RE.test(name)) return new Response('Ungültiger Raum', { status: 400, headers: CORS });
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426, headers: CORS });
      return env.HUB.get(env.HUB.idFromName('room:' + name)).fetch(req);
    }
    if (parts[0] === 'acc' || parts[0] === 'board') return env.HUB.get(env.HUB.idFromName('main')).fetch(req);
    return new Response('Italien Empire Online-Server läuft.', { headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' } });
  }
};

export class Hub {
  constructor(state, env) { this.state = state; this.env = env; this.s = new Map(); }

  async fetch(req) {
    const url = new URL(req.url), parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'acc') return this.acc(req, url, parts[1]);
    if (parts[0] === 'board') return this.board(req, url, parts[1]);
    return this.room(req, url);
  }

  // ---------- Konten ----------
  async session(token) {
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
    const s = await this.state.storage.get('s:' + token); if (!s || s.exp < Date.now()) return null;
    const a = await this.state.storage.get('a:' + s.slug); if (!a) return null;
    return a;
  }
  pubAcc(a) { return { nick: a.nick, slug: a.slug, admin: !!a.admin || isSuper(a.slug), superAdmin: isSuper(a.slug), banned: !!a.banned, hidden: isHiddenAcc(a), canHide: canHide(a.slug) }; }
  // so sehen ANDERE einen Spieler (geheime Admins erscheinen als normale Spieler)
  pubOther(a) { const p = this.pubAcc(a); if (p.hidden) { p.admin = false; p.superAdmin = false; } delete p.hidden; delete p.canHide; return p; }
  async newSession(a) {
    const token = rnd(32); await this.state.storage.put('s:' + token, { slug: a.slug, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 });
    return token;
  }
  async acc(req, url, action) {
    const st = this.state.storage;
    let b = {}; if (req.method === 'POST') { try { b = await req.json(); } catch (e) { return j({ error: 'bad_json' }, 400); } }
    const token = b.token || url.searchParams.get('token');
    if (action === 'state') return j({ moonOpen: !!(await st.get('moonOpen')) }); // öffentlich: Mond freigeschaltet?
    if (action === 'houses') { const hs = await st.list({ prefix: 'h:' }), out = {}; for (const [k, v] of hs) out[k.slice(2)] = { slug: v.slug, nick: v.nick, paint: v.paint || 'standard' }; return j({ houses: out }); }
    if (action === 'register') {
      const nick = String(b.nick || '').trim().replace(/\s+/g, ' ');
      const slug = slugOf(nick);
      if (nick.length < 3 || nick.length > 16 || slug.length < 3 || !/^[\p{L}\p{N} _.-]+$/u.test(nick)) return j({ error: 'bad_name' }, 400);
      if (!/^[0-9a-f]{64}$/.test(String(b.ph || ''))) return j({ error: 'bad_password' }, 400);
      if (await st.get('a:' + slug)) return j({ error: 'taken' }, 409);
      const salt = rnd(16);
      const a = { nick, slug, salt, h: await sha(b.ph + ':' + salt), admin: isSuper(slug), banned: false, grant: 0, created: Date.now() };
      await st.put('a:' + slug, a);
      return j({ token: await this.newSession(a), ...this.pubAcc(a) });
    }
    if (action === 'login') {
      const a = await st.get('a:' + slugOf(b.nick));
      if (!a) return j({ error: 'unknown' }, 404);
      if ((await sha(String(b.ph || '') + ':' + a.salt)) !== a.h) return j({ error: 'wrong_password' }, 403);
      if (a.banned && !isSuper(a.slug)) return j({ error: 'banned' }, 403);
      return j({ token: await this.newSession(a), ...this.pubAcc(a) });
    }
    if (action === 'appeal') { // Entbannungsantrag: ein gebannter Spieler bittet um Entbannung
      const reason = String(b.reason || '').trim().replace(/\s+/g, ' ').slice(0, 400);
      if (reason.length < 3) return j({ error: 'bad_reason' }, 400);
      let a = token ? await this.session(token) : null;
      if (!a && b.nick) { const cand = await st.get('a:' + slugOf(b.nick)); if (cand && /^[0-9a-f]{64}$/.test(String(b.ph || '')) && (await sha(b.ph + ':' + cand.salt)) === cand.h) a = cand; }
      if (!a) return j({ error: 'no_session' }, 401);
      if (!a.banned || isSuper(a.slug)) return j({ error: 'not_banned' }, 400);
      a.appeal = { reason, t: Date.now() };
      await st.put('a:' + a.slug, a);
      return j({ ok: true });
    }
    const me = await this.session(token);
    if (action === 'check') return me ? j(this.pubAcc(me)) : j({ error: 'no_session' }, 401);
    if (!me) return j({ error: 'no_session' }, 401);
    if (action === 'me') return j({ ...this.pubAcc(me), grant: me.grant || 0, moonOpen: !!(await st.get('moonOpen')) });
    if (action === 'house') { // Villen online: jede Villa kann nur EIN Spieler besitzen
      const id = String(b.id || ''); if (!/^[a-z0-9]{1,8}$/.test(id)) return j({ error: 'bad_id' }, 400);
      const key = 'h:' + id, cur = await st.get(key);
      if (b.op === 'buy') { if (cur && cur.slug !== me.slug) return j({ error: 'taken', nick: cur.nick }, 409); await st.put(key, { slug: me.slug, nick: me.nick, paint: (cur && cur.paint) || 'standard', t: Date.now() }); return j({ ok: true }); }
      if (b.op === 'sell') { if (cur && cur.slug === me.slug) await st.delete(key); return j({ ok: true }); }
      if (b.op === 'paint') { const p = String(b.paint || ''); if (!/^[a-z]{1,16}$/.test(p)) return j({ error: 'bad_paint' }, 400); if (!cur || cur.slug !== me.slug) return j({ error: 'not_owner' }, 403); cur.paint = p; await st.put(key, cur); return j({ ok: true }); }
      return j({ error: 'bad_op' }, 400);
    }
    if (action === 'claim') { const g = me.grant || 0; if (g) { me.grant = 0; await st.put('a:' + me.slug, me); } return j({ grant: g }); }
    // ---- Spielstand in der Cloud (pro Konto, auf jedem Gerät) ----
    if (action === 'save') {
      const slot = b.slot === 'online' ? 'online' : 'story', data = typeof b.data === 'string' ? b.data : '';
      if (!data || data.length > 120000) return j({ error: 'bad_data' }, 400);
      try { JSON.parse(data); } catch (e) { return j({ error: 'bad_data' }, 400); }
      const t = Math.max(0, Math.min(Date.now() + 60000, +b.t || Date.now()));
      await st.put('sv:' + me.slug + ':' + slot, { t, data });
      return j({ ok: true, t });
    }
    if (action === 'load') {
      const slot = b.slot === 'online' ? 'online' : 'story', v = await st.get('sv:' + me.slug + ':' + slot);
      return j(v ? { t: v.t, data: v.data } : { t: 0 });
    }
    if (action === 'logout') { await st.delete('s:' + token); return j({ ok: true }); }
    // ---- Admin ----
    const isAdmin = me.admin || isSuper(me.slug);
    if (!isAdmin || (me.banned && !isSuper(me.slug))) return j({ error: 'not_admin' }, 403);
    if (action === 'undercover') { if (!canHide(me.slug)) return j({ error: 'forbidden' }, 403); me.revealed = b.on === false; await st.put('a:' + me.slug, me); return j({ ok: true, ...this.pubAcc(me) }); }
    if (action === 'moon') { if (b.open === false) await st.delete('moonOpen'); else await st.put('moonOpen', Date.now()); return j({ ok: true, moonOpen: b.open !== false }); } // Admin schaltet den Mond für alle frei
    if (action === 'list') {
      const accs = [...(await st.list({ prefix: 'a:' })).values()];
      const board = await st.list({ prefix: 'p:' });
      return j({ players: accs.map(a => { const p = board.get('p:' + a.slug) || {}; return { ...(a.slug === me.slug ? this.pubAcc(a) : this.pubOther(a)), kills: p.kills || 0, deaths: p.deaths || 0, jobs: p.jobs || 0, money: p.money || 0, grant: a.grant || 0, appeal: a.banned && a.appeal ? a.appeal : null }; }) });
    }
    if (action === 'act') {
      const t = await st.get('a:' + slugOf(b.target)); if (!t) return j({ error: 'unknown_target' }, 404);
      const sup = isSuper(t.slug);
      if (b.what === 'money') { const amt = Math.round(+b.amount || 0); if (!(amt > 0 && amt <= 1e9)) return j({ error: 'bad_amount' }, 400); t.grant = Math.min(1e12, (t.grant || 0) + amt); }
      else if (b.what === 'take') { const amt = Math.round(+b.amount || 0); if (!(amt > 0 && amt <= 1e12)) return j({ error: 'bad_amount' }, 400); t.grant = Math.max(-1e12, (t.grant || 0) - amt); }
      else if (b.what === 'admin') t.admin = true;
      else if (b.what === 'unadmin') { if (sup) return j({ error: 'super_admin' }, 403); t.admin = false; }
      else if (b.what === 'ban') { if (sup || t.slug === me.slug) return j({ error: 'super_admin' }, 403); t.banned = true; }
      else if (b.what === 'unban') { t.banned = false; delete t.appeal; }
      else if (b.what === 'rejectappeal') { delete t.appeal; }
      else if (b.what === 'resetpw') { // Passwort neu setzen (nur Haupt-Admins) – das alte wird NICHT gelesen, nur ersetzt
        if (!isSuper(me.slug)) return j({ error: 'super_admin' }, 403);
        if (!/^[0-9a-f]{64}$/.test(String(b.ph || ''))) return j({ error: 'bad_password' }, 400);
        const salt = rnd(16); t.salt = salt; t.h = await sha(b.ph + ':' + salt);
      }
      else return j({ error: 'bad_action' }, 400);
      await st.put('a:' + t.slug, t);
      return j({ ok: true, player: t.slug === me.slug ? this.pubAcc(t) : this.pubOther(t) });
    }
    return j({ error: 'not_found' }, 404);
  }

  // ---------- Rangliste ----------
  async board(req, url, id) {
    const st = this.state.storage;
    const pub = v => ({ kills: v.kills, deaths: v.deaths, jobs: v.jobs, money: v.money, nick: v.nick, admin: v.admin, updated: v.updated });
    if (req.method === 'GET' && !id) {
      const q = url.searchParams.get('sort');
      const sort = ['kills', 'money', 'jobs', 'deaths'].includes(q) ? q : 'kills', lim = Math.min(300, Math.max(1, +url.searchParams.get('limit') || 30));
      const accs = await st.list({ prefix: 'a:' });
      const all = [...(await st.list({ prefix: 'p:' })).values()].filter(v => { const a = accs.get('a:' + v.id); return a && !a.banned; })
        .map(v => { const a = accs.get('a:' + v.id); return { ...v, nick: a.nick, admin: (!!a.admin || isSuper(a.slug)) && !isHiddenAcc(a) }; });
      all.sort((a, b) => (b[sort] || 0) - (a[sort] || 0));
      return j({ docs: all.slice(0, lim).map(v => ({ id: v.id, data: pub(v) })) });
    }
    if (!id || !/^[a-z0-9]{3,16}$/.test(id)) return j({ error: 'bad_id' }, 400);
    const cur = await st.get('p:' + id);
    if (req.method === 'GET') return j(cur ? { exists: true, data: pub(cur) } : { exists: false });
    if (req.method === 'POST') {
      let b; try { b = await req.json(); } catch (e) { return j({ error: 'bad_json' }, 400); }
      const me = await this.session(b.token);
      if (!me || me.slug !== id) return j({ error: 'forbidden' }, 403);
      const num = (v, max) => Math.max(0, Math.min(max, Math.round(+v || 0)));
      await st.put('p:' + id, { id, kills: num(b.kills, 1e6), deaths: num(b.deaths, 1e6), jobs: num(b.jobs, 1e5), money: num(b.money, 1e15), updated: Date.now() });
      return j({ ok: true });
    }
    return j({ error: 'method' }, 405);
  }

  // ---------- Lobby (WebSocket) ----------
  async room(req, url) {
    if (this.s.size >= 40) return new Response('Lobby voll', { status: 503 });
    const token = url.searchParams.get('token') || '';
    let who = null;
    try {
      const r = await this.env.HUB.get(this.env.HUB.idFromName('main')).fetch('https://intern/acc/check?token=' + encodeURIComponent(token));
      if (r.ok) who = await r.json();
    } catch (e) { }
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    server.accept();
    if (!who || (who.banned && !who.superAdmin)) {
      server.send(JSON.stringify({ t: 'denied', reason: who && who.banned ? 'banned' : 'login' }));
      server.close(4001, 'denied');
      return new Response(null, { status: 101, webSocket: client });
    }
    // gleiches Konto schon im Raum (z.B. nach Neuladen)? Alte Verbindung schließen -> keine doppelten Spieler
    for (const [p, x] of [...this.s]) if (x.slug === who.slug) { this.s.delete(p); try { x.ws.close(4002, 'replaced'); } catch (e) { } this.bc({ t: 'leave', peer: p }); }
    // tote Verbindungen (lange nichts gesendet) aufräumen
    for (const [p, x] of [...this.s]) if (Date.now() - (x.seen || x.t) > 30000) { this.s.delete(p); try { x.ws.close(4003, 'stale'); } catch (e) { } this.bc({ t: 'leave', peer: p }); }
    const peer = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const me = { ws: server, presence: {}, n: 0, t: Date.now(), slug: who.slug, nick: who.nick, adm: who.admin ? 1 : 0 };
    this.s.set(peer, me);
    server.send(JSON.stringify({ t: 'welcome', peer, me: { slug: who.slug, nick: who.nick, admin: who.admin }, peers: [...this.s].filter(([p]) => p !== peer).map(([p, x]) => ({ peer: p, presence: x.presence })) }));
    server.addEventListener('message', ev => {
      if (typeof ev.data !== 'string' || ev.data.length > 6000) return;
      const now = Date.now(); if (now - me.t > 1000) { me.t = now; me.n = 0; } if (++me.n > 60) return;
      me.seen = now;
      if (now - (this.sweepT || 0) > 10000) { this.sweepT = now; for (const [p, x] of [...this.s]) if (x !== me && now - (x.seen || x.t) > 30000) { this.s.delete(p); try { x.ws.close(4003, 'stale'); } catch (e) { } this.bc({ t: 'leave', peer: p }); } }
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'presence' && m.p && typeof m.p === 'object' && !Array.isArray(m.p)) {
        me.presence = Object.assign({}, m.p, { uid: 'a_' + me.slug, nm: me.nick, adm: who.hidden ? 0 : me.adm });
        this.bc({ t: 'presence', peer, presence: me.presence });
      } else if (m.t === 'emit' && typeof m.topic === 'string' && /^[a-z][a-z0-9_.-]{0,47}$/.test(m.topic)) {
        if (m.topic === 'admin' && !me.adm) return;
        this.bc({ t: 'emit', peer, topic: m.topic, data: m.data, from: me.slug, adm: me.adm });
      }
    });
    const close = () => { if (this.s.delete(peer)) this.bc({ t: 'leave', peer }); };
    server.addEventListener('close', close); server.addEventListener('error', close);
    return new Response(null, { status: 101, webSocket: client });
  }
  bc(m) { const s = JSON.stringify(m); for (const [p, x] of this.s) { try { x.ws.send(s); } catch (e) { this.s.delete(p); } } }
}
