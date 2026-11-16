// ===== ITALIEN EMPIRE – Spielerkonto: Spielername + Passwort, Admin-Panel =====
// Mit eigenem Online-Server (GitHub-Pages-Version): Konten liegen auf dem Server, Spielernamen
// sind weltweit eindeutig, Admin/Bann/Geld werden dort geprüft. Das Passwort verlässt das Gerät
// nur als PBKDF2-Hash; der Server speichert davon nochmals einen gesalzenen Hash.
// Ohne Server (claude.ai): Konto privat im Claude-Konto bzw. lokal im Browser.
'use strict';
(function () {
const $ = id => document.getElementById(id);
const A = window.IEaccount = { nick: '', slug: '', token: '', admin: false, superAdmin: false };
const LOCAL_KEY = 'italienEmpire_accounts', TOKEN_KEY = 'italienEmpire_token';
let db = null, myId = null, ready = null;
const SRV = () => window.IECF && window.IECF.account;

async function init() {
  if (ready) return ready;
  ready = (async () => {
    if (window.IEonline) { try { await IEonline.init(); } catch (e) { } }
    try { if (window.claude && claude.use) { db = await claude.use('db'); const u = await claude.use('user'); if (u) myId = await u.id(); } } catch (e) { db = null; }
    if (!myId) db = null;
  })();
  return ready;
}
const slugOf = n => n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').slice(0, 16) || 'spieler';
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pbkdf2(pw, saltBytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 120000, hash: 'SHA-256' }, key, 256));
}
const hashPw = (pw, saltHex) => pbkdf2(pw, new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16))));
async function serverHash(nick, pw) { const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('italien-empire|' + slugOf(nick)))); return pbkdf2(pw, salt); }
async function loadAccounts() {
  if (db) { try { const s = await db.collection('data/users/' + myId).doc('konten').get(); return s.exists ? (s.data().list || []) : []; } catch (e) { } }
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; }
}
async function saveAccounts(list) {
  if (db) { try { await db.collection('data/users/' + myId).doc('konten').set({ list }); return; } catch (e) { } }
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) { }
}

function msg(t, ok) { const m = $('lgMsg'); m.textContent = t; m.classList.toggle('ok', !!ok); }
function busy(b) { $('lgLogin').disabled = $('lgRegister').disabled = b; }
function done(nick, info) {
  A.nick = nick; A.slug = slugOf(nick);
  if (info) { A.admin = !!info.admin; A.superAdmin = !!info.superAdmin; }
  try { sessionStorage.setItem('italienEmpire_session', nick); } catch (e) { }
  if (window.IEgame && IEgame.setAccount) IEgame.setAccount(A.slug, nick);
  $('login').hidden = true;
  $('lgWho').textContent = nick + (A.admin ? ' ★ Admin' : ''); $('acctBar').hidden = false;
  $('acctAdmin').hidden = !A.admin;
  if (window.IEonline && IEonline.touchBoard) IEonline.touchBoard();
  if (SRV() && A.token) startPoll();
}
const ERR = { taken: 'Diesen Spielernamen gibt es schon. Wähle einen anderen oder melde dich an.', unknown: 'Diesen Spielernamen gibt es noch nicht. Tippe auf „Konto erstellen“.',
  wrong_password: 'Falsches Passwort.', banned: 'Dieses Konto wurde von einem Admin gebannt.', bad_name: 'Ungültiger Spielername.', bad_password: 'Ungültiges Passwort.' };
async function login() {
  const nick = $('lgName').value.trim(), pw = $('lgPw').value;
  if (!nick || !pw) { msg('Bitte Spielername und Passwort eingeben.'); return; }
  busy(true); msg('Prüfe …', true); await init();
  if (SRV()) {
    try { const r = await SRV().login(nick, await serverHash(nick, pw)); A.token = r.token; try { localStorage.setItem(TOKEN_KEY, r.token); } catch (e) { } busy(false); done(r.nick, r); }
    catch (e) { busy(false); msg(ERR[e.code] || 'Der Server ist gerade nicht erreichbar.'); if (e.code === 'wrong_password') $('lgPw').value = ''; }
    return;
  }
  const list = await loadAccounts(), acc = list.find(a => a.slug === slugOf(nick));
  if (!acc) { busy(false); msg(ERR.unknown); return; }
  const h = await hashPw(pw, acc.salt);
  busy(false);
  if (h !== acc.hash) { msg(ERR.wrong_password); $('lgPw').value = ''; return; }
  done(acc.nick);
}
async function register() {
  const nick = $('lgName').value.trim().replace(/\s+/g, ' '), pw = $('lgPw').value;
  if (nick.length < 3 || nick.length > 16) { msg('Der Spielername braucht 3 bis 16 Zeichen.'); return; }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(nick)) { msg('Nur Buchstaben, Zahlen, Leerzeichen, Punkt, Minus und Unterstrich.'); return; }
  if (pw.length < 4) { msg('Das Passwort braucht mindestens 4 Zeichen.'); return; }
  busy(true); msg('Erstelle Konto …', true); await init();
  if (SRV()) {
    try { const r = await SRV().register(nick, await serverHash(nick, pw)); A.token = r.token; try { localStorage.setItem(TOKEN_KEY, r.token); } catch (e) { } busy(false); done(r.nick, r); if (r.admin) IEgame.banner('Willkommen', 'Du bist Admin', 'Admin-Panel im Menü', 5); }
    catch (e) { busy(false); msg(ERR[e.code] || 'Der Server ist gerade nicht erreichbar.'); }
    return;
  }
  const list = await loadAccounts();
  if (list.some(a => a.slug === slugOf(nick))) { busy(false); msg('Dieses Konto gibt es schon. Melde dich mit deinem Passwort an.'); return; }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  list.push({ nick, slug: slugOf(nick), salt, hash: await hashPw(pw, salt), created: Date.now() });
  await saveAccounts(list);
  try { if (list.length === 1) { const old = localStorage.getItem('italienEmpire_v1'); if (old && !localStorage.getItem('italienEmpire_v1_' + slugOf(nick))) localStorage.setItem('italienEmpire_v1_' + slugOf(nick), old); } } catch (e) { }
  busy(false); done(nick);
}
let resetArm = false;
async function forgot() {
  if (SRV()) { msg('Passwort vergessen? Bitte einen Admin, dir zu helfen – oder erstelle ein neues Konto.'); return; }
  const nick = $('lgName').value.trim();
  if (!nick) { msg('Gib zuerst deinen Spielernamen ein, dann „Passwort vergessen“.'); return; }
  await init(); const list = await loadAccounts(); const i = list.findIndex(a => a.slug === slugOf(nick));
  if (i < 0) { msg('Diesen Spielernamen gibt es nicht.'); return; }
  if (!resetArm) { resetArm = true; msg('Nochmal tippen: Das Passwort für „' + list[i].nick + '“ wird gelöscht. Danach legst du mit „Konto erstellen“ ein neues fest – dein Spielstand bleibt.'); setTimeout(() => resetArm = false, 6000); return; }
  resetArm = false; list.splice(i, 1); await saveAccounts(list); $('lgPw').value = '';
  msg('Passwort gelöscht. Gib ein neues Passwort ein und tippe auf „Konto erstellen“.', true);
}
function logout() {
  if (SRV() && A.token) SRV().logout().catch(() => { });
  try { sessionStorage.removeItem('italienEmpire_session'); localStorage.removeItem(TOKEN_KEY); } catch (e) { }
  location.reload();
}
A.onBanned = function () {
  try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem('italienEmpire_session'); } catch (e) { }
  alertBox('Du wurdest von einem Admin gebannt.');
};
function alertBox(t) { const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = '<div class="panel" style="padding:24px"><h2 style="margin:0 0 10px;font-family:var(--f-display);color:var(--rosso)">Gebannt</h2><p></p><button class="btn">OK</button></div>'; d.querySelector('p').textContent = t; d.querySelector('button').onclick = () => location.reload(); document.body.appendChild(d); }

// ---------- Server: Geschenke, Admin-Status, Bann regelmäßig prüfen ----------
let pollT = null;
function startPoll() {
  if (pollT) return;
  const tick = async () => {
    try {
      const me = await SRV().me();
      if (me.banned && !me.superAdmin) { A.onBanned(); return; }
      if (me.admin !== A.admin) { A.admin = me.admin; $('lgWho').textContent = A.nick + (A.admin ? ' ★ Admin' : ''); $('acctAdmin').hidden = !A.admin; IEgame.toast(A.admin ? 'Du bist jetzt Admin!' : 'Deine Admin-Rechte wurden entfernt', 4); }
      if (me.grant > 0) { const c = await SRV().claim(); if (c.grant > 0) { IEgame.addMoney(c.grant, true); IEgame.banner('Geschenk', 'Ein Admin schenkt dir', IEgame.fmt(c.grant), 4); IEgame.saveGame && IEgame.saveGame(); } }
    } catch (e) { if (e && e.status === 401) { try { localStorage.removeItem(TOKEN_KEY); } catch (er) { } } }
  };
  tick(); pollT = setInterval(tick, 15000);
}
A.refresh = () => { if (SRV() && A.token) { clearInterval(pollT); pollT = null; startPoll(); } };

// ---------- Admin-Panel ----------
async function openAdmin() {
  if (!A.admin || !SRV()) return;
  IEgame.closeModals(); document.body.classList.add('modalopen');
  $('adminModal').hidden = false;
  const g = IEgame;
  $('adFly').textContent = g.P.fly ? 'Flugmodus: An' : 'Flugmodus: Aus';
  $('adSpeed').value = g.P.flySpeed || 120; $('adSpeedV').textContent = Math.round(($('adSpeed').value) * 3.6) + ' km/h';
  await renderAdminList();
}
let adminCache = [];
async function renderAdminList() {
  const el = $('adList'); el.innerHTML = '<div class="hint">Lade Spieler …</div>';
  try { adminCache = (await SRV().list()).players || []; } catch (e) { el.innerHTML = '<div class="hint">Konnte die Spielerliste nicht laden.</div>'; return; }
  drawAdminList();
}
function drawAdminList() {
  const el = $('adList'), q = ($('adSearch').value || '').toLowerCase();
  el.innerHTML = '';
  const list = adminCache.filter(p => !q || p.nick.toLowerCase().includes(q)).sort((a, b) => (b.money || 0) - (a.money || 0));
  if (!list.length) { el.innerHTML = '<div class="hint">Keine Spieler gefunden.</div>'; return; }
  for (const p of list) {
    const row = document.createElement('div'); row.className = 'row adrow';
    row.innerHTML = `<div><div class="nm"></div><div class="st"></div></div><div class="acts"><input type="number" min="1" step="1000" value="100000" aria-label="Betrag"><button class="buy" data-a="money">Geld geben</button><button data-a="adm"></button><button data-a="ban"></button></div>`;
    row.querySelector('.nm').textContent = p.nick + (p.slug === A.slug ? ' (du)' : '') + (p.superAdmin ? ' ★ Haupt-Admin' : p.admin ? ' ★ Admin' : '') + (p.banned ? ' · GEBANNT' : '');
    row.querySelector('.st').textContent = `Abschüsse ${p.kills} · Geld ${IEgame.fmt(p.money)}${p.grant ? ' · wartet auf ' + IEgame.fmt(p.grant) : ''}`;
    const bAdm = row.querySelector('[data-a=adm]'), bBan = row.querySelector('[data-a=ban]');
    bAdm.textContent = p.admin ? 'Admin entfernen' : 'Admin geben'; bAdm.disabled = p.superAdmin;
    bBan.textContent = p.banned ? 'Entbannen' : 'Bannen'; bBan.disabled = p.superAdmin || p.slug === A.slug;
    if (!p.banned && !p.superAdmin) bBan.style.cssText = 'border-color:var(--rosso);color:var(--rosso)';
    const act = async (what, amount) => {
      try { await SRV().act(p.slug, what, amount); IEgame.toast('Erledigt: ' + p.nick, 2);
        if (what === 'ban' && window.IEonline && IEonline.adminKick) IEonline.adminKick(p.slug);
        if (what === 'money' && p.slug === A.slug) A.refresh();
        await renderAdminList(); }
      catch (e) { IEgame.toast('Fehler: ' + (e.code === 'super_admin' ? 'Der Haupt-Admin kann nicht verändert werden' : e.code || 'Server'), 3); }
    };
    row.querySelector('[data-a=money]').onclick = () => { const v = Math.round(+row.querySelector('input').value || 0); if (v > 0) act('money', Math.min(v, 1e9)); };
    bAdm.onclick = () => act(p.admin ? 'unadmin' : 'admin');
    bBan.onclick = () => act(p.banned ? 'unban' : 'ban');
    el.appendChild(row);
  }
}
$('adSearch').addEventListener('input', drawAdminList);
$('adFly').addEventListener('click', () => { const g = IEgame; g.setFly(!g.P.fly, +$('adSpeed').value); $('adFly').textContent = g.P.fly ? 'Flugmodus: An' : 'Flugmodus: Aus'; });
$('adSpeed').addEventListener('input', () => { const v = +$('adSpeed').value; $('adSpeedV').textContent = Math.round(v * 3.6) + ' km/h'; IEgame.P.flySpeed = v; });
$('adYacht').addEventListener('click', () => { if (IEgame.game.state !== 'play') { IEgame.toast('Starte zuerst ein Spiel', 2); return; } IEgame.spawnAirship(); IEgame.closeModals(); });
A.openAdmin = openAdmin;
$('acctAdmin').addEventListener('click', openAdmin);
$('pAdmin').addEventListener('click', openAdmin);

$('lgLogin').addEventListener('click', login);
$('lgRegister').addEventListener('click', register);
$('lgForgot').addEventListener('click', forgot);
$('lgPw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('lgOut').addEventListener('click', logout);

// Anzeigen, sobald die Welt geladen ist
const iv = setInterval(async () => {
  if (!window.IEgame || IEgame.game.state !== 'title') return;
  clearInterval(iv);
  if (SRV()) {
    let t = ''; try { t = localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { }
    if (t) { A.token = t; try { const me = await SRV().me(); if (!me.banned || me.superAdmin) { done(me.nick, me); return; } } catch (e) { } A.token = ''; try { localStorage.removeItem(TOKEN_KEY); } catch (e) { } }
    $('login').hidden = false; $('lgWhere').textContent = 'Dein Konto liegt auf dem Spiel-Server – du kannst dich auf jedem Gerät anmelden.';
    return;
  }
  let sess = ''; try { sess = sessionStorage.getItem('italienEmpire_session') || ''; } catch (e) { }
  if (sess) { done(sess); return; }
  $('login').hidden = false; init().then(() => { $('lgWhere').textContent = db ? 'Dein Konto wird privat in deinem Claude-Konto gespeichert.' : 'Dein Konto wird auf diesem Gerät gespeichert.'; });
}, 200);
})();
