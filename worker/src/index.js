// Italien Empire – Online-Server
// /room/<name>  WebSocket: Lobby (Positionen = presence, Ereignisse = emit)
// /board        Rangliste (GET Liste, GET/POST /board/<id>)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;

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
    if (parts[0] === 'board') return env.HUB.get(env.HUB.idFromName('board')).fetch(req);
    return new Response('Italien Empire Online-Server läuft.', { headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' } });
  }
};

export class Hub {
  constructor(state) { this.state = state; this.s = new Map(); }

  async fetch(req) {
    const parts = new URL(req.url).pathname.split('/').filter(Boolean);
    if (parts[0] === 'board') return this.board(req, parts[1]);
    if (this.s.size >= 40) return new Response('Lobby voll', { status: 503 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    server.accept();
    const peer = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const me = { ws: server, presence: {}, n: 0, t: Date.now() };
    this.s.set(peer, me);
    server.send(JSON.stringify({ t: 'welcome', peer, peers: [...this.s].filter(([p]) => p !== peer).map(([p, x]) => ({ peer: p, presence: x.presence })) }));
    server.addEventListener('message', ev => {
      if (typeof ev.data !== 'string' || ev.data.length > 6000) return;
      const now = Date.now(); if (now - me.t > 1000) { me.t = now; me.n = 0; } if (++me.n > 60) return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'presence' && m.p && typeof m.p === 'object' && !Array.isArray(m.p)) { me.presence = m.p; this.bc({ t: 'presence', peer, presence: m.p }); }
      else if (m.t === 'emit' && typeof m.topic === 'string' && /^[a-z][a-z0-9_.-]{0,47}$/.test(m.topic)) this.bc({ t: 'emit', peer, topic: m.topic, data: m.data });
    });
    const close = () => { if (this.s.delete(peer)) this.bc({ t: 'leave', peer }); };
    server.addEventListener('close', close); server.addEventListener('error', close);
    return new Response(null, { status: 101, webSocket: client });
  }

  bc(m) { const s = JSON.stringify(m); for (const [p, x] of this.s) { try { x.ws.send(s); } catch (e) { this.s.delete(p); } } }

  async board(req, id) {
    const H = { ...CORS, 'content-type': 'application/json' };
    const pub = v => ({ kills: v.kills, deaths: v.deaths, jobs: v.jobs, money: v.money, nick: v.nick, updated: v.updated });
    if (req.method === 'GET' && !id) {
      const u = new URL(req.url), q = u.searchParams.get('sort');
      const sort = ['kills', 'money', 'jobs', 'deaths'].includes(q) ? q : 'kills', lim = Math.min(100, Math.max(1, +u.searchParams.get('limit') || 30));
      const all = [...(await this.state.storage.list({ prefix: 'p:' })).values()];
      all.sort((a, b) => (b[sort] || 0) - (a[sort] || 0));
      return new Response(JSON.stringify({ docs: all.slice(0, lim).map(v => ({ id: v.id, data: pub(v) })) }), { headers: H });
    }
    if (!id || !/^[A-Za-z0-9_-]{4,64}$/.test(id)) return new Response('{"error":"bad id"}', { status: 400, headers: H });
    const key = 'p:' + id, cur = await this.state.storage.get(key);
    if (req.method === 'GET') return new Response(JSON.stringify(cur ? { exists: true, data: pub(cur) } : { exists: false }), { headers: H });
    if (req.method === 'POST') {
      let b; try { b = await req.json(); } catch (e) { return new Response('{"error":"bad json"}', { status: 400, headers: H }); }
      const sh = await sha(String(b.secret || ''));
      if (cur && cur.sh !== sh) return new Response('{"error":"forbidden"}', { status: 403, headers: H });
      const num = (v, max) => Math.max(0, Math.min(max, Math.round(+v || 0)));
      const rec = { id, sh, kills: num(b.kills, 1e6), deaths: num(b.deaths, 1e6), jobs: num(b.jobs, 1e5), money: num(b.money, 1e12),
        nick: String(b.nick || '').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 16), updated: Date.now() };
      await this.state.storage.put(key, rec);
      return new Response('{"ok":true}', { headers: H });
    }
    return new Response('{"error":"method"}', { status: 405, headers: H });
  }
}
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); }
