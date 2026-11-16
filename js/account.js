// ===== ITALIEN EMPIRE – Spielerkonto: Spielername + Passwort =====
// Das Passwort wird nur als PBKDF2-Hash mit Salt gespeichert: im privaten Bereich des
// angemeldeten claude.ai-Kontos (data/users/<id>/), sonst lokal im Browser.
'use strict';
(function () {
const $ = id => document.getElementById(id);
const A = window.IEaccount = { nick: '', slug: '' };
const LOCAL_KEY = 'italienEmpire_accounts';
let db = null, myId = null, ready = null;

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
async function hashPw(pw, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256));
}
// Konten: in claude.ai privat pro Person (mehrere Spielernamen möglich), sonst lokal
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
function done(nick) {
  A.nick = nick; A.slug = slugOf(nick);
  try { sessionStorage.setItem('italienEmpire_session', nick); } catch (e) { }
  if (window.IEgame && IEgame.setAccount) IEgame.setAccount(A.slug, nick);
  $('login').hidden = true;
  $('lgWho').textContent = nick; $('acctBar').hidden = false;
}
async function login() {
  const nick = $('lgName').value.trim(), pw = $('lgPw').value;
  if (!nick || !pw) { msg('Bitte Spielername und Passwort eingeben.'); return; }
  busy(true); msg('Prüfe …', true); await init();
  const list = await loadAccounts(), acc = list.find(a => a.slug === slugOf(nick));
  if (!acc) { busy(false); msg('Diesen Spielernamen gibt es noch nicht. Tippe auf „Konto erstellen“.'); return; }
  const h = await hashPw(pw, acc.salt);
  busy(false);
  if (h !== acc.hash) { msg('Falsches Passwort.'); $('lgPw').value = ''; return; }
  done(acc.nick);
}
async function register() {
  const nick = $('lgName').value.trim().replace(/\s+/g, ' '), pw = $('lgPw').value;
  if (nick.length < 3 || nick.length > 16) { msg('Der Spielername braucht 3 bis 16 Zeichen.'); return; }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(nick)) { msg('Nur Buchstaben, Zahlen, Leerzeichen, Punkt, Minus und Unterstrich.'); return; }
  if (pw.length < 4) { msg('Das Passwort braucht mindestens 4 Zeichen.'); return; }
  busy(true); msg('Erstelle Konto …', true); await init();
  const list = await loadAccounts();
  if (list.some(a => a.slug === slugOf(nick))) { busy(false); msg('Dieses Konto gibt es schon. Melde dich mit deinem Passwort an.'); return; }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  list.push({ nick, slug: slugOf(nick), salt, hash: await hashPw(pw, salt), created: Date.now() });
  await saveAccounts(list);
  // alten Spielstand (vor den Konten) dem ersten Konto geben
  try { if (list.length === 1) { const old = localStorage.getItem('italienEmpire_v1'); if (old && !localStorage.getItem('italienEmpire_v1_' + slugOf(nick))) localStorage.setItem('italienEmpire_v1_' + slugOf(nick), old); } } catch (e) { }
  busy(false); done(nick);
}
let resetArm = false;
async function forgot() {
  const nick = $('lgName').value.trim();
  if (!nick) { msg('Gib zuerst deinen Spielernamen ein, dann „Passwort vergessen“.'); return; }
  await init(); const list = await loadAccounts(); const i = list.findIndex(a => a.slug === slugOf(nick));
  if (i < 0) { msg('Diesen Spielernamen gibt es nicht.'); return; }
  if (!resetArm) { resetArm = true; msg('Nochmal tippen: Das Passwort für „' + list[i].nick + '“ wird gelöscht. Danach legst du mit „Konto erstellen“ ein neues fest – dein Spielstand bleibt.'); setTimeout(() => resetArm = false, 6000); return; }
  resetArm = false; list.splice(i, 1); await saveAccounts(list); $('lgPw').value = '';
  msg('Passwort gelöscht. Gib ein neues Passwort ein und tippe auf „Konto erstellen“.', true);
}
$('lgLogin').addEventListener('click', login);
$('lgRegister').addEventListener('click', register);
$('lgForgot').addEventListener('click', forgot);
$('lgPw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('lgOut').addEventListener('click', () => { try { sessionStorage.removeItem('italienEmpire_session'); } catch (e) { } location.reload(); });

// Anzeigen, sobald die Welt geladen ist
const iv = setInterval(() => {
  if (!window.IEgame || IEgame.game.state !== 'title') return;
  clearInterval(iv);
  let sess = ''; try { sess = sessionStorage.getItem('italienEmpire_session') || ''; } catch (e) { }
  if (sess) { done(sess); return; }
  $('login').hidden = false; init().then(() => { $('lgWhere').textContent = db ? 'Dein Konto wird privat in deinem Claude-Konto gespeichert.' : 'Dein Konto wird auf diesem Gerät gespeichert.'; });
}, 200);
})();
