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
  if (info) { A.admin = !!info.admin; A.superAdmin = !!info.superAdmin; A.hidden = !!info.hidden; A.canHide = !!info.canHide; }
  try { sessionStorage.setItem('italienEmpire_session', nick); } catch (e) { }
  if (window.IEgame && IEgame.setAccount) IEgame.setAccount(A.slug, nick);
  $('login').hidden = true;
  $('lgWho').textContent = nick + (A.admin && !A.hidden ? ' ★ Admin' : ''); $('acctBar').hidden = false;
  showAdminUI();
  if (window.IEonline && IEonline.touchBoard) IEonline.touchBoard();
  if (SRV() && A.token) startPoll();
  if (!SRV()) claudeAdminInit();
}
function showAdminUI() {
  const vis = A.admin && !A.hidden, under = A.admin && A.hidden; // undercover: Knopf da, aber unsichtbar
  $('lgWho').textContent = A.nick + (vis ? ' ★ Admin' : '');
  $('acctAdmin').hidden = !vis;
  // ADMIN-Knopf: sichtbar für normale Admins, unsichtbar (aber antippbar) für Undercover-Admins
  $('tAdmin').hidden = !A.admin; $('tAdmin').classList.toggle('invis', under);
  $('hudAdmin').hidden = !A.admin; $('hudAdmin').classList.toggle('invis', under);
}

// ---------- claude.ai-Version: Besitzer des Spiels ist Admin, Geschenke & Banns über die gemeinsame Datenbank ----------
let cUser = null, cBans = [], cGrants = [];
const CLAIM_KEY = () => 'italienEmpire_claimed_' + (myId || 'x');
async function claudeAdminInit() {
  await init();
  try { if (window.claude && claude.use) cUser = await claude.use('user'); } catch (e) { }
  if (cUser) { try { if (await cUser.isOwner() || await cUser.canEdit()) { A.admin = true; A.claudeAdmin = true; showAdminUI(); IEgame.toast('★ Du bist Admin (Besitzer des Spiels)', 3); } } catch (e) { } }
  if (!db || !myId) return;
  try {
    db.collection('admin').doc('moon').onSnapshot(sn => { A.setMoon(!!(sn.exists && sn.data().open)); }, () => { });
    db.collection('admin').doc('bans').onSnapshot(sn => {
      cBans = (sn.exists && sn.data().list) || [];
      if (cBans.includes(myId) && !A.claudeAdmin) { if (window.IEonline && IEonline.active) IEonline.leave(); A.onBanned(); }
    }, () => { });
    db.collection('admin').doc('grants').onSnapshot(sn => {
      cGrants = (sn.exists && sn.data().list) || [];
      let claimed = []; try { claimed = JSON.parse(localStorage.getItem(CLAIM_KEY()) || '[]'); } catch (e) { }
      for (const g of cGrants) if (g.to === myId && !claimed.includes(g.id)) {
        claimed.push(g.id); applyGrant(Math.max(-1e12, Math.min(1e9, Math.round(+g.amt || 0))));
      }
      try { localStorage.setItem(CLAIM_KEY(), JSON.stringify(claimed)); } catch (e) { }
    }, () => { });
  } catch (e) { }
}
function applyGrant(g) {
  const G = IEgame; if (!g) return;
  if (g > 0) { G.addMoney(g, true); G.banner('Geschenk', 'Ein Admin schenkt dir', G.fmt(g), 4); }
  else { const take = Math.min(G.S.money, -g); G.S.money = Math.max(0, G.S.money + g); G.banner('Geld weg', 'Ein Admin hat dir Geld abgenommen', '− ' + G.fmt(take), 4); G.sfx && G.sfx('fail'); }
  G.saveGame && G.saveGame();
}
async function claudeList() {
  const snap = await db.collection('leaderboard').limit(300).get();
  return snap.docs.map(d => { const v = d.data(); return { nick: v.nick || 'Spieler', slug: d.id, kills: v.kills || 0, money: v.money || 0, admin: d.id === myId, superAdmin: d.id === myId, banned: cBans.includes(d.id), grant: 0, claude: true }; });
}
async function claudeAct(target, what, amount) {
  if (what === 'money' || what === 'take') {
    const ref = db.collection('admin').doc('grants'), cur = await ref.get();
    const list = ((cur.exists && cur.data().list) || []).slice(-200);
    list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), to: target, amt: what === 'take' ? -Math.round(amount) : Math.round(amount) });
    await ref.set({ list });
  } else if (what === 'ban' || what === 'unban') {
    const ref = db.collection('admin').doc('bans'), cur = await ref.get();
    let list = (cur.exists && cur.data().list) || [];
    list = what === 'ban' ? [...new Set(list.concat(target))] : list.filter(x => x !== target);
    await ref.set({ list });
  } else throw Object.assign(new Error('claude'), { code: 'claude_admin' });
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
// Mond für alle freischalten (Admin startet die Rakete vorzeitig)
A.setMoon = function (open) {
  open = open !== false; const IE = IEgame.IE; if (!!IE.moonUnlocked === open) return; IE.moonUnlocked = open;
  if (open && IEgame.game.state === 'play') IEgame.banner('Der Mond ist offen!', 'Die Mondrakete bei Mailand ist startklar', 'Flieg mit der Rakete zum Mond', 5);
  if (IE.drawRocketBoard) IE.drawRocketBoard();
};
A.unlockMoon = async function (open) {
  open = open !== false; IEgame.IE.moonUnlocked = open; if (IEgame.IE.drawRocketBoard) IEgame.IE.drawRocketBoard();
  let ok = true;
  try { if (SRV()) await SRV().moon(open); else if (db && A.claudeAdmin) await db.collection('admin').doc('moon').set({ open, t: Date.now() }); } catch (e) { ok = false; IEgame.toast('Server-Fehler: Mond konnte nicht für alle ' + (open ? 'freigeschaltet' : 'gesperrt') + ' werden', 4); }
  try { if (window.IEonline && IEonline.adminMoon) IEonline.adminMoon(open); } catch (e) { }
  if (ok) IEgame.toast(open ? '★ Mond für ALLE Spieler freigeschaltet' : 'Mond wieder gesperrt (Countdown läuft)', 3);
  return ok;
};
// Mond-Status regelmäßig vom Server holen (auch ohne Anmeldung)
setTimeout(function moonPoll() { if (SRV() && SRV().state) SRV().state().then(r => A.setMoon(!!r.moonOpen)).catch(() => { }); setTimeout(moonPoll, 20000); }, 1500);
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
      A.setMoon(!!me.moonOpen);
      A.canHide = !!me.canHide; if (!!me.hidden !== !!A.hidden) { A.hidden = !!me.hidden; showAdminUI(); }
      if (me.admin !== A.admin) { A.admin = me.admin; showAdminUI(); IEgame.toast(A.admin ? 'Du bist jetzt Admin!' : 'Deine Admin-Rechte wurden entfernt', 4); }
      if (me.grant) { const c = await SRV().claim(); if (c.grant) applyGrant(c.grant); }
    } catch (e) { if (e && e.status === 401) { try { localStorage.removeItem(TOKEN_KEY); } catch (er) { } } }
  };
  tick(); pollT = setInterval(tick, 15000);
}
A.refresh = () => { if (SRV() && A.token) { clearInterval(pollT); pollT = null; startPoll(); } };

// ---------- Admin-Panel ----------
async function openAdmin() {
  if (!A.admin || !(SRV() || A.claudeAdmin)) return;
  IEgame.closeModals(); document.body.classList.add('modalopen');
  $('adminModal').hidden = false;
  const g = IEgame;
  $('adFly').textContent = g.P.fly ? 'Flugmodus: An' : 'Flugmodus: Aus';
  $('adMoon').textContent = IEgame.IE.moonUnlocked ? 'Mond: offen für alle' : 'Mond: gesperrt';
  $('adUndercover').hidden = !A.canHide; $('adUndercover').textContent = A.hidden ? 'Undercover-Admin entfernen' : 'Wieder Undercover-Admin werden';
  $('adGod').textContent = g.game.ch && g.game.ch.god ? 'Unsterblich: An' : 'Unsterblich: Aus';
  $('adSpeed').value = g.P.flySpeed || 120; $('adSpeedV').textContent = Math.round(($('adSpeed').value) * 3.6) + ' km/h';
  drawAdminCheats();
  drawAdminTp();
  await renderAdminList();
}
let adminCache = [];
async function renderAdminList() {
  const el = $('adList'); el.innerHTML = '<div class="hint">Lade Spieler …</div>';
  try { adminCache = SRV() ? ((await SRV().list()).players || []) : await claudeList(); } catch (e) { el.innerHTML = '<div class="hint">Konnte die Spielerliste nicht laden.</div>'; return; }
  if (!adminCache.length) { el.innerHTML = '<div class="hint">Noch keine Spieler in der Rangliste. Sobald jemand spielt, erscheint er hier.</div>'; return; }
  drawAdminList();
}
function drawAdminList() {
  const el = $('adList'), q = ($('adSearch').value || '').toLowerCase();
  el.innerHTML = '';
  const list = adminCache.filter(p => !q || p.nick.toLowerCase().includes(q)).sort((a, b) => (b.money || 0) - (a.money || 0));
  if (!list.length) { el.innerHTML = '<div class="hint">Keine Spieler gefunden.</div>'; return; }
  for (const p of list) {
    const row = document.createElement('div'); row.className = 'row adrow';
    row.innerHTML = `<div><div class="nm"></div><div class="st"></div></div><div class="acts"><input type="number" min="1" step="1000" value="100000" aria-label="Betrag"><button class="buy" data-a="money">Geld geben</button><button data-a="take" style="border-color:var(--rosso);color:var(--rosso)">Geld nehmen</button><button data-a="adm"></button><button data-a="ban"></button><button data-a="pw" style="border-color:#b07ad8;color:#c89af0" hidden>Passwort zurücksetzen</button></div>`;
    row.querySelector('.nm').textContent = p.nick + (p.slug === A.slug ? ' (du)' : '') + (p.superAdmin ? ' ★ Haupt-Admin' : p.admin ? ' ★ Admin' : '') + (p.banned ? ' · GEBANNT' : '');
    row.querySelector('.st').textContent = `Abschüsse ${p.kills} · Geld ${IEgame.fmt(p.money)}${p.grant > 0 ? ' · wartet auf ' + IEgame.fmt(p.grant) : p.grant < 0 ? ' · Abzug wartet: ' + IEgame.fmt(-p.grant) : ''}`;
    const bAdm = row.querySelector('[data-a=adm]'), bBan = row.querySelector('[data-a=ban]');
    bAdm.textContent = p.admin ? 'Admin entfernen' : 'Admin geben'; bAdm.disabled = p.superAdmin || !!p.claude;
    if (p.claude) bAdm.title = 'In der claude.ai-Version: über das Teilen-Menü als „Bearbeiten“ freigeben';
    bBan.textContent = p.banned ? 'Entbannen' : 'Bannen'; bBan.disabled = p.superAdmin || p.slug === A.slug;
    if (!p.banned && !p.superAdmin) bBan.style.cssText = 'border-color:var(--rosso);color:var(--rosso)';
    const act = async (what, amount) => {
      try { if (SRV()) await SRV().act(p.slug, what, amount); else await claudeAct(p.slug, what, amount); IEgame.toast('Erledigt: ' + p.nick, 2);
        if (what === 'ban' && window.IEonline && IEonline.adminKick) IEonline.adminKick(p.slug);
        if ((what === 'money' || what === 'take') && p.slug === A.slug) A.refresh();
        await renderAdminList(); }
      catch (e) { IEgame.toast('Fehler: ' + (e.code === 'super_admin' ? 'Der Haupt-Admin kann nicht verändert werden' : e.code === 'claude_admin' ? 'Admin-Rechte vergibst du hier über das Teilen-Menü' : e.code || 'Server'), 3); }
    };
    row.querySelector('[data-a=take]').onclick = () => { const v = Math.round(+row.querySelector('input').value || 0); if (v > 0) act('take', Math.min(v, 1e12)); };
    row.querySelector('[data-a=money]').onclick = () => { const v = Math.round(+row.querySelector('input').value || 0); if (v > 0) act('money', Math.min(v, 1e9)); };
    bAdm.onclick = () => act(p.admin ? 'unadmin' : 'admin');
    bBan.onclick = () => act(p.banned ? 'unban' : 'ban');
    const bPw = row.querySelector('[data-a=pw]');
    // Passwort zurücksetzen: nur Haupt-Admins im Server-Modus. Das alte Passwort wird NIE angezeigt.
    if (SRV() && A.superAdmin && !p.claude) {
      bPw.hidden = false;
      bPw.onclick = async () => {
        const np = prompt('Neues Passwort für „' + p.nick + '“ festlegen (mindestens 4 Zeichen):\n\nDer Spieler meldet sich danach mit diesem neuen Passwort an. Das alte Passwort kann niemand sehen.');
        if (np === null) return;
        if (np.length < 4) { IEgame.toast('Das Passwort braucht mindestens 4 Zeichen', 3); return; }
        try { const ph = await serverHash(p.nick, np); await SRV().act(p.slug, 'resetpw', 0, ph); IEgame.toast('Passwort von ' + p.nick + ' wurde neu gesetzt', 3); }
        catch (e) { IEgame.toast('Fehler: ' + (e.code === 'super_admin' ? 'Nur Haupt-Admins dürfen Passwörter zurücksetzen' : e.code === 'bad_password' ? 'Ungültiges Passwort' : e.code || 'Server'), 3); }
      };
    }
    el.appendChild(row);
  }
}
$('adSearch').addEventListener('input', drawAdminList);
$('adFly').addEventListener('click', () => { const g = IEgame; g.setFly(!g.P.fly, +$('adSpeed').value); $('adFly').textContent = g.P.fly ? 'Flugmodus: An' : 'Flugmodus: Aus'; });
$('adUndercover').addEventListener('click', async () => {
  if (!SRV() || !A.canHide) return;
  try { const r = await SRV().undercover(!A.hidden); A.hidden = !!r.hidden; showAdminUI(); $('adUndercover').textContent = A.hidden ? 'Undercover-Admin entfernen' : 'Wieder Undercover-Admin werden';
    IEgame.toast(A.hidden ? 'Du bist wieder Undercover – andere sehen nicht, dass du Admin bist' : 'Undercover aus – alle sehen jetzt, dass du Admin bist (★)', 4);
    if (window.IEonline && IEonline.active && IEonline.rejoin) IEonline.rejoin(); }
  catch (e) { IEgame.toast('Fehler: ' + (e.code || 'Server'), 3); }
});
$('adMoon').addEventListener('click', async () => { const open = !IEgame.IE.moonUnlocked; await A.unlockMoon(open); $('adMoon').textContent = IEgame.IE.moonUnlocked ? 'Mond: offen für alle' : 'Mond: gesperrt'; });
$('adGod').addEventListener('click', () => { const g = IEgame; g.game.ch = g.game.ch || {}; g.game.ch.god = !g.game.ch.god; if (g.game.ch.god) g.hurtPlayer(0); $('adGod').textContent = g.game.ch.god ? 'Unsterblich: An' : 'Unsterblich: Aus'; g.toast(g.game.ch.god ? '★ Unsterblich' : 'Unsterblich aus', 2); });
$('adSpeed').addEventListener('input', () => { const v = +$('adSpeed').value; $('adSpeedV').textContent = Math.round(v * 3.6) + ' km/h'; IEgame.P.flySpeed = v; });
$('adYacht').addEventListener('click', () => { if (IEgame.game.state !== 'play') { IEgame.toast('Starte zuerst ein Spiel', 2); return; } IEgame.spawnAirship(); IEgame.closeModals(); });
function drawAdminTp() {
  const g = IEgame, box = $('adTp'), O = window.IEonline; box.innerHTML = '';
  const peers = O && O.active ? [...O.peers.values()].filter(r => r.pr && typeof r.pr.x === 'number') : [];
  if (!peers.length) { box.innerHTML = '<span class="hint" style="padding:0">' + (O && O.active ? 'Gerade ist niemand sonst in deiner Lobby.' : 'Geh in den Online-Modus, um dich zu Spielern zu teleportieren.') + '</span>'; return; }
  for (const r of peers) {
    const b = document.createElement('button'); b.className = 'btn'; b.style.cssText = 'font-size:15px;padding:6px 12px';
    const d = Math.round(Math.hypot(r.pos.x - g.P.pos.x, r.pos.z - g.P.pos.z));
    b.textContent = '➜ ' + (r.name || 'Spieler') + ' · ' + (d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m') + (r.pr.dead ? ' (tot)' : '');
    b.addEventListener('click', () => { const x = r.pos.x, y = r.pos.y, z = r.pos.z;
      g.closeModals(); g.teleportTo(x, y, z); g.toast('Teleportiert zu ' + (r.name || 'Spieler'), 2); });
    box.appendChild(b);
  }
}
function drawAdminCheats() {
  const g = IEgame, box = $('adCheats'); box.innerHTML = '';
  for (const c of g.CHEATS) {
    const on = c.toggle && g.game.ch[c.toggle];
    const b = document.createElement('button');
    b.className = 'btn' + (c.toggle && !on ? ' ghost' : '');
    b.style.cssText = 'font-size:15px;padding:6px 12px' + (c.toggle === 'zombies' ? ';border-color:#7fae5a' : '');
    b.textContent = c.name + (c.toggle ? (on ? ': An' : ': Aus') : '');
    b.addEventListener('click', () => {
      if (g.game.state !== 'play') { g.toast('Starte zuerst ein Spiel', 2); return; }
      if (c.toggle) { g.runCheat(c); drawAdminCheats(); if (c.toggle === 'zombies' && g.game.ch.zombies) g.closeModals(); }
      else { g.closeModals(); g.runCheat(c); }
    });
    box.appendChild(b);
  }
}
A.openAdmin = openAdmin;
$('acctAdmin').addEventListener('click', openAdmin);
$('pAdmin').addEventListener('click', openAdmin);
// Taste O öffnet/schließt das Admin-Panel (für alle Admins, für geheime Admins der einzige Weg)
addEventListener('keydown', e => {
  if (e.code !== 'KeyO' || e.repeat || !A.admin || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
  if (!$('adminModal').hidden) IEgame.closeModals(); else openAdmin();
});
// ohne Tastatur (iPad): dreimal schnell auf den Geldbetrag tippen
{ let taps = []; $('money').addEventListener('pointerdown', () => { if (!A.admin) return; const t = performance.now(); taps = taps.filter(x => t - x < 700).concat(t); if (taps.length >= 3) { taps = []; openAdmin(); } }); }
$('hudAdmin').addEventListener('click', openAdmin);
$('tAdmin').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); openAdmin(); });

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
