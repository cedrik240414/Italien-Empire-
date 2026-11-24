// ===================== HANDY, STREAMING, VIDEOS & FERNSEHER =====================
(function () {
  const $ = id => document.getElementById(id);
  const G = () => window.IEgame;
  let streaming = false, liveEl = null, viewTimer = null, catPool = [];

  // ---------- Thumbnail- & Katzen-Generator ----------
  function gradThumb(title, hue, emoji) {
    try {
      const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 320, 180);
      g.addColorStop(0, 'hsl(' + hue + ',55%,45%)'); g.addColorStop(1, 'hsl(' + ((hue + 60) % 360) + ',55%,25%)');
      x.fillStyle = g; x.fillRect(0, 0, 320, 180);
      x.globalAlpha = 0.15; x.fillStyle = '#000'; for (let i = 0; i < 6; i++) x.fillRect(0, i * 34, 320, 12); x.globalAlpha = 1;
      if (emoji) { x.font = '64px serif'; x.textAlign = 'center'; x.fillText(emoji, 160, 95); }
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 140, 320, 40);
      x.fillStyle = '#fff'; x.font = 'bold 18px sans-serif'; x.textAlign = 'left';
      x.fillText(title.slice(0, 30), 12, 166);
      return c.toDataURL('image/jpeg', 0.7);
    } catch (e) { return ''; }
  }
  function drawCat(seed) {
    try {
      const rnd = (() => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
      const furs = ['#e8a85a', '#9a9a9a', '#f2e6d2', '#3a3a3a', '#c88a4a', '#d8d2c6', '#f4b86a', '#5a4a3a'];
      const fur = furs[(rnd() * furs.length) | 0], eye = ['#5ac85a', '#5aa0e8', '#e8c030', '#8a6ad8'][(rnd() * 4) | 0];
      const c = document.createElement('canvas'); c.width = 200; c.height = 160; const x = c.getContext('2d');
      const bg = x.createLinearGradient(0, 0, 0, 160); bg.addColorStop(0, 'hsl(' + ((rnd() * 360) | 0) + ',45%,82%)'); bg.addColorStop(1, '#fff');
      x.fillStyle = bg; x.fillRect(0, 0, 200, 160);
      const cx = 100, cy = 92;
      // Ohren
      x.fillStyle = fur;
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 30, cy - 36); x.lineTo(cx + s * 56, cy - 70); x.lineTo(cx + s * 60, cy - 28); x.closePath(); x.fill(); }
      x.fillStyle = '#f2a6c8'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 36, cy - 38); x.lineTo(cx + s * 50, cy - 58); x.lineTo(cx + s * 52, cy - 32); x.closePath(); x.fill(); }
      // Kopf
      x.fillStyle = fur; x.beginPath(); x.ellipse(cx, cy, 52, 46, 0, 0, 7); x.fill();
      // Augen
      for (const s of [-1, 1]) {
        x.fillStyle = '#fff'; x.beginPath(); x.ellipse(cx + s * 20, cy - 4, 13, 16, 0, 0, 7); x.fill();
        x.fillStyle = eye; x.beginPath(); x.ellipse(cx + s * 20, cy - 2, 8, 12, 0, 0, 7); x.fill();
        x.fillStyle = '#111'; x.beginPath(); x.ellipse(cx + s * 20, cy - 1, 3.5, 9, 0, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + s * 17, cy - 7, 3, 0, 7); x.fill();
      }
      // Nase + Mund
      x.fillStyle = '#e06a8a'; x.beginPath(); x.moveTo(cx - 6, cy + 16); x.lineTo(cx + 6, cy + 16); x.lineTo(cx, cy + 23); x.closePath(); x.fill();
      x.strokeStyle = '#7a5a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy + 23); x.quadraticCurveTo(cx - 8, cy + 30, cx - 14, cy + 25); x.moveTo(cx, cy + 23); x.quadraticCurveTo(cx + 8, cy + 30, cx + 14, cy + 25); x.stroke();
      // Schnurrhaare
      x.strokeStyle = 'rgba(80,60,40,0.7)'; x.lineWidth = 1.5;
      for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(cx + s * 14, cy + 16 + i * 5); x.lineTo(cx + s * 60, cy + 10 + i * 12); x.stroke(); }
      // Blush
      x.fillStyle = 'rgba(240,120,150,0.4)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 34, cy + 12, 9, 6, 0, 0, 7); x.fill(); }
      return c.toDataURL('image/jpeg', 0.75);
    } catch (e) { return ''; }
  }
  const CAT_CAPS = ['Mimi beim Schlafen 😴', 'Luna will Futter 🐟', 'Felix im Karton 📦', 'Micio spielt 🧶', 'Bella schnurrt 💕', 'Leo gähnt 🥱', 'Nala im Sonnenschein ☀️', 'Oscar guckt böse 😾', 'Minka kuschelt 🥰', 'Tiger auf Jagd 🐾'];

  // ---------- NPC-Kanäle & -Videos ----------
  const NPC_CH = [
    { id: 'speedy', name: 'SpeedyItalia', emoji: '🏎️', sub: 1240000 },
    { id: 'chef', name: 'Chef Giovanni', emoji: '🍕', sub: 820000 },
    { id: 'prank', name: 'PrankBros Roma', emoji: '😂', sub: 2100000 },
    { id: 'game', name: 'GamerLeo', emoji: '🎮', sub: 540000 },
    { id: 'music', name: 'DJ Napoli', emoji: '🎧', sub: 1750000 },
    { id: 'vlog', name: 'Sofias Vlog', emoji: '🌸', sub: 430000 }
  ];
  const NPC_VIDS = [
    { ch: 'speedy', title: 'Mit 300 km/h durch Rom!', hue: 10, emoji: '🏎️' },
    { ch: 'prank', title: 'Polizei-Prank geht schief 😱', hue: 280, emoji: '🚓' },
    { ch: 'chef', title: 'Die perfekte Pizza in 5 Minuten', hue: 30, emoji: '🍕' },
    { ch: 'game', title: 'Italien Empire – 100M Challenge', hue: 200, emoji: '🎮' },
    { ch: 'music', title: 'Sommer Hit 2026 (Official)', hue: 320, emoji: '🎵' },
    { ch: 'vlog', title: 'Ein Tag in Venedig 🚤', hue: 190, emoji: '🌊' },
    { ch: 'speedy', title: 'Teuerstes Auto vs. Motorrad', hue: 50, emoji: '🏁' },
    { ch: 'prank', title: 'Katze erschreckt ganz Neapel', hue: 110, emoji: '🐱' }
  ].map((v, i) => ({ ...v, id: 'npc' + i, views: 50000 + ((i * 918237) % 4000000), thumb: null }));
  function npcThumb(v) { if (!v.thumb) v.thumb = gradThumb(v.title, v.hue, v.emoji); return v.thumb; }
  const chById = id => NPC_CH.find(c => c.id === id) || { name: 'Kanal', emoji: '📺' };

  // ---------- Live-Badge ----------
  function updateLive() {
    const g = G();
    if (streaming && g && g.game.state === 'play') {
      if (!liveEl) { liveEl = document.createElement('div'); liveEl.className = 'liveBadge'; document.body.appendChild(liveEl); }
      liveEl.innerHTML = '<span class="dot"></span>LIVE · ' + (g.streamViewers || 0) + ' Zuschauer';
      liveEl.style.display = '';
    } else if (liveEl) liveEl.style.display = 'none';
  }

  // ---------- Einnahmen-Tick ----------
  setInterval(() => {
    const g = G(); if (!g || g.game.state !== 'play' || !g.S.phone) return;
    const S = g.S, ch = S.channel = S.channel || { subs: 0, views: 0, cash: 0 }, pro = S.phonePro ? 2.2 : 1;
    let gained = 0;
    (S.videos || []).forEach(v => { if (v.uploaded) { const inc = Math.floor((1 + Math.random() * 5) * pro * (1 + ch.subs / 800)); v.views += inc; ch.views += inc; gained += inc; } });
    if (gained > 0 && Math.random() < 0.7) ch.subs += Math.max(1, Math.floor(gained / 50 * pro));
    ch.cash += Math.floor(gained * 2.5 * pro);
    if (streaming) {
      const vn = Math.floor((25 + Math.random() * 70) * pro * (1 + ch.subs / 2000)); g.streamViewers = vn;
      ch.subs += Math.floor(vn * 0.04 * Math.random() * pro + 0.5); ch.views += vn; ch.cash += Math.floor(vn * 14 * pro);
    }
    updateLive();
    if ((viewTimer || streaming) && !$('phoneModal').hidden) { /* live refresh handled by open views */ }
  }, 1000);

  // ---------- Phone-Navigation ----------
  let homeMode = 'phone';
  function scr() { return $('phoneScreen'); }
  function setTitle(t) { $('phoneTitle').textContent = t; }
  function refreshCash() { const g = G(); if (g) $('phoneCash').textContent = g.fmt(g.S.money); }

  function openPhone() {
    const g = G(); if (!g) return;
    if (!g.S.phone) { g.toast('Du hast noch kein Handy – kauf dir eins im Handy-Laden (📱-Marker in der Stadt)', 3); return; }
    g.closeModals(); homeMode = 'phone'; $('phoneModal').hidden = false;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
    home();
  }
  IE.openPhone = openPhone;

  function openTV() {
    const g = G(); if (!g) return;
    if (!(g.S.villas || []).length) { g.toast('Fernsehen kannst du nur, wenn du ein Haus / eine Villa besitzt', 3); return; }
    g.closeModals(); $('tvModal').hidden = false;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
    tvHome();
  }
  IE.openTV = openTV;

  function backBtn(fn) { const b = document.createElement('button'); b.className = 'pBack'; b.textContent = '‹ Zurück'; b.onclick = fn; return b; }

  // ---------- Stream-Chat ----------
  const CHAT_USERS = ['Leo', 'Giulia', 'MarcoTV', 'pixelninja', 'Sofia_99', 'Luca', 'BossGamer', 'Nina', 'il_capo', 'Enzo', 'Chiara', 'SpeedyFan', 'xXDarkXx', 'Mia', 'Dino', 'ragazzo'];
  const CHAT_MSGS = ['Hallo!', 'lass gas 🔥', 'wie teuer war das Auto?', 'cooler Stream', 'wo bist du?', 'LOL', 'gg', 'mach mal ne Bank 🏦', 'erster!!', 'nice 😎', 'zeig die Villa', '🚀🚀🚀', 'krass', 'mehr davon', 'wie viel Geld hast du?', 'fahr schneller!', 'hahaha', '👑', 'POG', 'Italien Empire ist das beste', 'wie heißt das Pack?', 'W Stream'];
  let streamChatIv = null;
  function stopStreamChat() { if (streamChatIv) { clearInterval(streamChatIv); streamChatIv = null; } }
  IE._stopStreamChat = stopStreamChat;
  function buildStreamChat(host) {
    stopStreamChat();
    const g = G(), box = document.createElement('div'); box.className = 'streamChat';
    const msgs = document.createElement('div'); msgs.className = 'scMsgs'; box.appendChild(msgs);
    const inWrap = document.createElement('div'); inWrap.className = 'scIn';
    const inp = document.createElement('input'); inp.maxLength = 120; inp.placeholder = 'Mitschreiben …';
    const snd = document.createElement('button'); snd.textContent = '➤'; inWrap.appendChild(inp); inWrap.appendChild(snd); box.appendChild(inWrap); host.appendChild(box);
    const esc = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const add = (nm, tx, self) => { const m = document.createElement('div'); m.className = 'scMsg'; m.innerHTML = '<b style="color:' + (self ? '#f2c230' : '#7fd0ff') + '">' + esc(nm) + '</b> ' + esc(tx); msgs.appendChild(m); while (msgs.children.length > 40) msgs.removeChild(msgs.firstChild); msgs.scrollTop = msgs.scrollHeight; };
    const send = () => { const t = inp.value.trim(); if (!t) return; add((window.IEaccount && IEaccount.nick) || 'Du', t, true); inp.value = ''; if (g.S.channel) g.S.channel.subs = (g.S.channel.subs || 0) + (Math.random() < 0.3 ? 1 : 0); };
    snd.onclick = send; inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.code === 'Enter') send(); });
    for (let i = 0; i < 4; i++) add(CHAT_USERS[(Math.random() * CHAT_USERS.length) | 0], CHAT_MSGS[(Math.random() * CHAT_MSGS.length) | 0]);
    streamChatIv = setInterval(() => { if ($('phoneModal').hidden && $('tvModal').hidden) { stopStreamChat(); return; } add(CHAT_USERS[(Math.random() * CHAT_USERS.length) | 0], CHAT_MSGS[(Math.random() * CHAT_MSGS.length) | 0]); }, 1300 + Math.random() * 1400);
  }
  IE._buildStreamChat = buildStreamChat;
  function streamChatView() {
    setTitle('💬 Stream-Chat'); const s = scr(); s.innerHTML = ''; s.appendChild(backBtn(() => { stopStreamChat(); home(); }));
    const note = document.createElement('p'); note.style.cssText = 'font-size:13px;opacity:0.8'; note.textContent = streaming ? 'Dein Live-Chat – deine Zuschauer schreiben mit:' : 'Chat eines Live-Streams (starte selbst mit 🔴 Streamen oder schau in TubeHub zu):'; s.appendChild(note);
    buildStreamChat(s);
  }

  function home() {
    const g = G(); stopStreamChat(); setTitle('📱 Handy'); refreshCash();
    const s = scr(); s.innerHTML = '';
    const apps = [
      { i: '🔴', n: streaming ? 'Live beenden' : 'Streamen', f: toggleStream },
      { i: '📹', n: 'Aufnehmen', f: recordVideo },
      { i: '▶️', n: 'TubeHub', f: () => tubeHub('phone') },
      { i: '🐱', n: 'CatHub', f: () => catHub('phone') },
      { i: '📁', n: 'Meine Videos', f: myVideos },
      { i: '👥', n: 'Abos', f: subsApp },
      { i: '💬', n: 'Stream-Chat', f: streamChatView },
      { i: '💰', n: 'Mein Kanal', f: channelApp },
      { i: '📺', n: 'Fernsehen', f: () => { $('phoneModal').hidden = true; openTV(); } }
    ];
    if ((g.S.packs || []).includes('adminpack')) apps.push({ i: '👑', n: 'Admin-Tools', f: adminTools });
    const grid = document.createElement('div'); grid.className = 'appGrid';
    for (const a of apps) { const b = document.createElement('button'); b.className = 'app'; b.innerHTML = '<span class="ai">' + a.i + '</span>' + a.n; b.onclick = a.f; grid.appendChild(b); }
    s.appendChild(grid);
    const ch = g.S.channel || { subs: 0 };
    const info = document.createElement('div'); info.style.cssText = 'margin-top:16px;text-align:center;opacity:0.8;font-size:13px';
    info.innerHTML = 'Dein Kanal: <b>' + fmtN(ch.subs) + '</b> Abonnenten' + (streaming ? ' · 🔴 du bist LIVE' : '');
    s.appendChild(info);
  }
  function fmtN(n) { n = n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1) + ' Mio' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (n | 0) + ''; }

  function toggleStream() {
    const g = G(); streaming = !streaming; g.streaming = streaming; g.streamViewers = streaming ? 20 : 0;
    g.sfx(streaming ? 'pass' : 'click');
    if (streaming) g.banner('🔴 LIVE', '📡', 'Du streamst jetzt – Zuschauer bringen dir Geld!', 3);
    else g.toast('Stream beendet', 2);
    updateLive(); g.saveGame(); home();
  }

  function recordVideo() {
    const g = G(), S = g.S;
    const topics = [['Verrückte Verfolgungsjagd!', 10, '🚓'], ['Mein neues Supercar 🔥', 50, '🏎️'], ['Villa-Tour durch Italien', 30, '🏖️'], ['Sprung über die ganze Stadt', 200, '🛩️'], ['Panzer vs. Polizei', 110, '💥'], ['Shopping-Tour: 10 Mio ausgegeben', 320, '💸'], ['Nachts auf dem Mond 🌙', 250, '👽'], ['Bootsrennen auf dem Meer', 190, '🚤']];
    const t = topics[(Math.random() * topics.length) | 0];
    const vid = { id: 'v' + Date.now(), title: t[0], thumb: gradThumb(t[0], t[1], t[2]), views: 0, uploaded: false, t: Date.now() };
    S.videos = S.videos || []; S.videos.unshift(vid);
    g.sfx('cash'); g.saveGame();
    g.banner('📹 Aufgenommen', '🎬', '„' + t[0] + '" ist in „Meine Videos" – lade es hoch!', 3);
    myVideos();
  }

  function myVideos() {
    const g = G(), S = g.S; setTitle('📁 Meine Videos'); const s = scr(); s.innerHTML = '';
    s.appendChild(backBtn(home));
    if (!(S.videos || []).length) { const p = document.createElement('p'); p.style.opacity = 0.7; p.textContent = 'Noch keine Videos. Tippe im Menü auf 📹 Aufnehmen.'; s.appendChild(p); return; }
    for (const v of S.videos) {
      const card = document.createElement('div'); card.className = 'vidCard';
      card.innerHTML = '<img src="' + v.thumb + '"><div style="flex:1"><div class="vt">' + v.title + '</div><div class="vm">' + (v.uploaded ? '▶️ ' + fmtN(v.views) + ' Aufrufe' : 'Nicht hochgeladen') + '</div></div>';
      const act = document.createElement('button'); act.className = 'pBack'; act.style.margin = 0;
      if (v.uploaded) { act.textContent = 'Ansehen'; act.onclick = () => playVideo(v, { name: g.S.channel && g.S.channel.name || 'Mein Kanal', emoji: '⭐', mine: true }, myVideos); }
      else { act.textContent = '⬆️ Hochladen'; act.onclick = () => { v.uploaded = true; v.views += 1 + ((Math.random() * 40) | 0); g.sfx('cash'); g.banner('⬆️ Hochgeladen', '▶️', '„' + v.title + '" ist jetzt auf TubeHub!', 3); g.saveGame(); myVideos(); }; }
      card.appendChild(act); s.appendChild(card);
    }
  }

  function tubeHub(mode) {
    const g = G(), S = g.S;
    const render = (host, back) => {
      host.innerHTML = ''; if (back) host.appendChild(backBtn(back));
      // Live-Streams zuerst
      const live = [];
      if (streaming) live.push({ title: '🔴 DU bist LIVE – ' + (g.streamViewers || 0) + ' Zuschauer', thumb: gradThumb('LIVE: Mein Stream', 0, '🔴'), mine: true, ch: { name: 'Mein Kanal', emoji: '⭐' }, views: g.streamViewers || 0, live: true });
      // Live-Streams anderer echter Spieler (Online-Lobby)
      const onl = window.IEonline && window.IEonline.active;
      if (onl && window.IEonline.livePeers) for (const c of window.IEonline.livePeers()) live.push({ title: '🔴 ' + c.name + ' ist LIVE – zuschauen!', thumb: gradThumb('LIVE: ' + c.name, 200, '🔴'), ch: { name: c.name, emoji: '🧑' }, views: c.subs, live: true, spectate: c.r });
      live.push({ title: '🔴 ' + chById('speedy').name + ' LIVE: Rennen!', thumb: npcThumb(NPC_VIDS[0]), ch: chById('speedy'), views: 12000 + ((Math.random() * 4000) | 0), live: true });
      const mine = (S.videos || []).filter(v => v.uploaded).map(v => ({ ...v, ch: { name: 'Mein Kanal', emoji: '⭐', mine: true }, thumbImg: v.thumb }));
      // Kanäle anderer echter Spieler
      const peerVids = (onl && window.IEonline.channels) ? window.IEonline.channels().filter(c => !c.live).map(c => ({ title: c.name + ' – Kanal', thumb: gradThumb(c.name + ' Kanal', 150, '🧑'), ch: { name: c.name, emoji: '🧑' }, views: c.subs })) : [];
      const all = live.concat(mine.map(v => ({ title: v.title, thumb: v.thumb, ch: v.ch, views: v.views, ref: v })), peerVids, NPC_VIDS.map(v => ({ title: v.title, thumb: npcThumb(v), ch: chById(v.ch), views: v.views, npc: v })));
      for (const v of all) {
        const card = document.createElement('div'); card.className = 'vidCard';
        card.innerHTML = '<img src="' + v.thumb + '"><div style="flex:1"><div class="vt">' + v.title + '</div><div class="vm">' + v.ch.emoji + ' ' + v.ch.name + ' · ' + fmtN(v.views) + (v.spectate ? ' Abos · 👁️ ZUSCHAUEN' : ' Aufrufe') + (v.live ? ' · 🔴' : '') + '</div></div>';
        if (v.spectate) card.onclick = () => { const gg = G(); if (gg && gg.startSpectate) { $('phoneModal').hidden = true; $('tvModal').hidden = true; gg.startSpectate(v.spectate); } };
        else card.onclick = () => playVideo(v.ref || v.npc || v, v.ch, () => render(host, back), host);
        host.appendChild(card);
      }
    };
    if (mode === 'tv') { const t = $('tvBody'); t.innerHTML = ''; t.appendChild(backBtn(tvHome)); const box = document.createElement('div'); t.appendChild(box); render(box, null); setTVTitle('▶️ TubeHub'); }
    else { setTitle('▶️ TubeHub'); render(scr(), home); }
  }

  function playVideo(v, ch, back, host) {
    const g = G(); const parent = $('tvModal').hidden ? scr() : $('tvBody');
    stopStreamChat(); parent.innerHTML = ''; parent.appendChild(backBtn(back));
    const wrap = document.createElement('div');
    const isMine = (ch && ch.mine) || (v && v.uploaded !== undefined && v.id && v.id[0] === 'v');
    let views = v.views || 0;
    wrap.innerHTML = '<div style="position:relative"><img src="' + (v.thumb || '') + '" style="width:100%;border-radius:10px"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:52px">▶️</div></div>' +
      '<div style="font-weight:700;font-size:16px;margin:8px 2px">' + (v.title || 'Video') + '</div>' +
      '<div style="font-size:13px;opacity:0.8;margin:0 2px">' + (ch ? ch.emoji + ' ' + ch.name : '') + ' · <span id="vViews">' + fmtN(views) + '</span> Aufrufe</div>';
    parent.appendChild(wrap);
    const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px;margin:10px 2px;flex-wrap:wrap';
    const like = document.createElement('button'); like.className = 'pBack'; like.style.margin = 0; like.textContent = '👍 Like'; like.onclick = () => { g.sfx('click'); g.toast('Gefällt dir!', 1); };
    btns.appendChild(like);
    if (ch && !isMine) {
      const cid = v.npc ? v.npc.ch : (ch.id || '');
      const subd = (g.S.subs || []).includes(cid);
      const sub = document.createElement('button'); sub.className = 'pBack'; sub.style.cssText = 'margin:0;background:' + (subd ? '#1d3a2a' : '#c8101a');
      sub.textContent = subd ? '✓ Abonniert' : '🔔 Abonnieren';
      sub.onclick = () => { if (!(g.S.subs || []).includes(cid)) { g.S.subs = (g.S.subs || []).concat(cid); g.sfx('cash'); g.toast('Abonniert! Dieser Kanal verdient jetzt mit.', 2.5); g.saveGame(); } playVideo(v, ch, back, host); };
      btns.appendChild(sub);
    }
    parent.appendChild(btns);
    if (v && v.live) buildStreamChat(parent); // Live-Stream: Chat anzeigen
    // Aufrufe zählen hoch während man guckt
    if (viewTimer) clearInterval(viewTimer);
    viewTimer = setInterval(() => { views += 1 + ((Math.random() * 8) | 0); const el = $('vViews'); if (el) el.textContent = fmtN(views); else { clearInterval(viewTimer); viewTimer = null; } if (v && v.uploaded) v.views = views; }, 1200);
  }

  function catHub(mode) {
    const g = G();
    if (catPool.length < 8) { catPool = []; for (let i = 0; i < 10; i++) catPool.push({ img: drawCat(i + 1 + ((Math.random() * 999) | 0)), cap: CAT_CAPS[i % CAT_CAPS.length], likes: 200 + ((Math.random() * 9000) | 0) }); }
    const render = (host, back) => {
      host.innerHTML = ''; if (back) host.appendChild(backBtn(back));
      const title = document.createElement('div'); title.style.cssText = 'font-weight:700;margin:0 0 10px'; title.textContent = '🐱 CatHub – die süßesten Katzen'; host.appendChild(title);
      const grid = document.createElement('div'); grid.className = 'catGrid';
      for (const cat of catPool) {
        const fig = document.createElement('figure');
        fig.innerHTML = '<img src="' + cat.img + '"><figcaption><span>' + cat.cap + '</span></figcaption>';
        const likeWrap = document.createElement('span'); const b = document.createElement('button'); b.textContent = '❤ ' + fmtN(cat.likes);
        b.onclick = () => { cat.likes++; b.textContent = '❤ ' + fmtN(cat.likes); g.sfx('click'); };
        likeWrap.appendChild(b); fig.querySelector('figcaption').appendChild(likeWrap);
        grid.appendChild(fig);
      }
      host.appendChild(grid);
    };
    if (mode === 'tv') { setTVTitle('🐱 CatHub'); render($('tvBody'), tvHome); }
    else { setTitle('🐱 CatHub'); render(scr(), home); }
  }

  function subsApp() {
    const g = G(), S = g.S; setTitle('👥 Abos'); const s = scr(); s.innerHTML = ''; s.appendChild(backBtn(home));
    const info = document.createElement('p'); info.style.cssText = 'font-size:13px;opacity:0.8'; info.textContent = 'Abonniere deine Lieblingskanäle – jeder abonnierte Kanal verdient Ingame-Geld durch seine Fans.'; s.appendChild(info);
    for (const c of NPC_CH) {
      const subd = (S.subs || []).includes(c.id);
      const card = document.createElement('div'); card.className = 'vidCard'; card.style.cursor = 'default';
      card.innerHTML = '<div style="font-size:30px;width:52px;text-align:center">' + c.emoji + '</div><div style="flex:1"><div class="vt">' + c.name + '</div><div class="vm">' + fmtN(c.sub) + ' Abonnenten</div></div>';
      const b = document.createElement('button'); b.className = 'pBack'; b.style.cssText = 'margin:0;background:' + (subd ? '#1d3a2a' : '#c8101a'); b.textContent = subd ? '✓ Abonniert' : '🔔 Abonnieren';
      b.onclick = () => { if (subd) { S.subs = (S.subs || []).filter(x => x !== c.id); } else { S.subs = (S.subs || []).concat(c.id); c.sub++; g.sfx('cash'); g.toast(c.name + ' abonniert!', 2); } g.saveGame(); subsApp(); };
      card.appendChild(b); s.appendChild(card);
    }
  }

  function channelApp() {
    const g = G(), S = g.S, ch = S.channel = S.channel || { subs: 0, views: 0, cash: 0 };
    setTitle('💰 Mein Kanal'); const s = scr(); s.innerHTML = ''; s.appendChild(backBtn(home));
    const vids = (S.videos || []).filter(v => v.uploaded).length;
    const box = document.createElement('div'); box.style.cssText = 'text-align:center;padding:10px';
    box.innerHTML = '<div style="font-size:46px">⭐</div><div style="font-size:20px;font-weight:700;margin:4px">Mein Kanal</div>' +
      '<div style="display:flex;justify-content:space-around;margin:14px 0">' +
      '<div><div style="font-size:20px;font-weight:700">' + fmtN(ch.subs) + '</div><div style="font-size:11px;opacity:0.7">Abonnenten</div></div>' +
      '<div><div style="font-size:20px;font-weight:700">' + fmtN(ch.views) + '</div><div style="font-size:11px;opacity:0.7">Aufrufe</div></div>' +
      '<div><div style="font-size:20px;font-weight:700">' + vids + '</div><div style="font-size:11px;opacity:0.7">Videos</div></div></div>' +
      '<div style="font-size:14px;margin:6px">Verdienst in der Kasse: <b>' + g.fmt(Math.floor(ch.cash)) + '</b></div>';
    s.appendChild(box);
    const pay = document.createElement('button'); pay.className = 'app'; pay.style.cssText = 'width:100%;flex-direction:row;justify-content:center;gap:8px;background:#1d7a3a;font-size:16px;padding:12px';
    pay.innerHTML = '💸 Verdienst auszahlen';
    pay.disabled = ch.cash < 1;
    pay.onclick = () => { const amt = Math.floor(ch.cash); if (amt < 1) return; g.addMoney(amt, true); ch.cash = 0; g.sfx('cash'); g.banner('💸 Auszahlung', '▶️', g.fmt(amt) + ' von deinem Kanal!', 3); g.saveGame(); channelApp(); refreshCash(); };
    s.appendChild(pay);
    const tip = document.createElement('p'); tip.style.cssText = 'font-size:12px;opacity:0.7;margin-top:14px;text-align:center'; tip.textContent = 'Lade Videos hoch und streame (🔴) – mehr Abonnenten = mehr Ingame-Geld. Mit dem Pro-Kamera-Upgrade verdienst du mehr.'; s.appendChild(tip);
  }

  function adminTools() {
    const g = G(), S = g.S; setTitle('👑 Admin-Tools'); const s = scr(); s.innerHTML = ''; s.appendChild(backBtn(home));
    const info = document.createElement('p'); info.style.cssText = 'font-size:13px;opacity:0.85'; info.innerHTML = 'Kein Admin-Panel, aber deine Extras:<br>• Teleport zu anderen Spielern (online)<br>• Kassierer holen Geld aus deinen Shops<br>• Deine eigenen Geschäfte sind golden markiert.'; s.appendChild(info);
    // Kassierer-Toggle
    const hired = !!S.hiredCollector;
    const hb = document.createElement('button'); hb.className = 'app'; hb.style.cssText = 'width:100%;flex-direction:row;justify-content:center;gap:8px;font-size:15px;padding:12px;margin-bottom:12px;background:' + (hired ? '#1d7a3a' : 'rgba(255,255,255,0.08)');
    hb.innerHTML = hired ? '💼 Kassierer aktiv – Geld wird automatisch abgeholt (zum Deaktivieren tippen)' : '💼 Kassierer anheuern (holen Shop-Geld ab, 15 % Gebühr)';
    hb.onclick = () => { S.hiredCollector = !S.hiredCollector; g.sfx('cash'); g.toast(S.hiredCollector ? 'Kassierer angeheuert!' : 'Kassierer entlassen', 2); g.saveGame(); adminTools(); };
    s.appendChild(hb);
    // Teleport-Liste
    const t = document.createElement('div'); t.style.cssText = 'font-weight:700;margin:6px 0'; t.textContent = '🧭 Teleport zu Spielern'; s.appendChild(t);
    const onl = window.IEonline && window.IEonline.active;
    if (!onl) { const p = document.createElement('p'); p.style.cssText = 'opacity:0.7;font-size:13px'; p.textContent = 'Nur im Online-Modus (tritt einer Lobby bei).'; s.appendChild(p); return; }
    const chans = window.IEonline.channels ? window.IEonline.channels() : [];
    if (!chans.length) { const p = document.createElement('p'); p.style.cssText = 'opacity:0.7;font-size:13px'; p.textContent = 'Gerade ist niemand sonst in deiner Lobby.'; s.appendChild(p); return; }
    for (const c of chans) {
      const card = document.createElement('div'); card.className = 'vidCard'; card.style.cursor = 'default';
      card.innerHTML = '<div style="font-size:26px;width:46px;text-align:center">🧑</div><div style="flex:1"><div class="vt">' + c.name + '</div><div class="vm">' + (c.live ? '🔴 LIVE' : 'online') + '</div></div>';
      const b = document.createElement('button'); b.className = 'pBack'; b.style.cssText = 'margin:0;background:#8a3cf0'; b.textContent = '🧭 Teleport';
      b.onclick = () => { if (IE.teleportToPeer) IE.teleportToPeer(c.r); };
      card.appendChild(b); s.appendChild(card);
    }
  }

  // ---------- Fernseher ----------
  function setTVTitle(t) { $('tvTitle').textContent = t; }
  function tvHome() {
    setTVTitle('📺 Fernseher'); const t = $('tvBody'); t.innerHTML = '';
    const chans = [
      { i: '📺', n: 'Italia TV', f: () => tvNews() },
      { i: '▶️', n: 'TubeHub', f: () => tubeHub('tv') },
      { i: '🐱', n: 'CatHub', f: () => catHub('tv') },
      { i: '🎵', n: 'MusicBox', f: () => tvStatic('🎵 MusicBox', 'Die größten Hits aus Italien – 24/7 Musik.', 320, ['🎶 DJ Napoli – Sommer Hit 2026', '🎸 Rock Italiano Live', '🎹 Klassik aus Rom', '🎤 Karaoke-Nacht']) },
      { i: '🎬', n: 'CinemaUno', f: () => tvStatic('🎬 CinemaUno', 'Filme & Serien rund um die Uhr.', 260, ['🎬 „Der Pate von Palermo"', '🚗 „Fast & Napoli"', '👽 „Mond-Mission 2026"', '🕵️ „Die Mafia-Akte"']) },
      { i: '⚽', n: 'SportTV', f: () => tvStatic('⚽ SportTV', 'Fußball, Rennen & mehr – live.', 130, ['⚽ Serie A: Napoli vs. Roma', '🏎️ Formel 1: GP von Monza', '🏊 Schwimm-WM', '🚤 Bootsrennen Venedig']) },
      { i: '📰', n: 'News24', f: () => tvNews() },
      { i: '🔴', n: 'Live', f: () => tubeHub('tv') }
    ];
    const grid = document.createElement('div'); grid.className = 'tvChans';
    for (const c of chans) { const b = document.createElement('button'); b.className = 'tvChan'; b.innerHTML = '<span class="ci">' + c.i + '</span>' + c.n; b.onclick = c.f; grid.appendChild(b); }
    t.appendChild(grid);
  }
  const NEWS = ['📢 Riesiger Auto-Diebstahl in Rom – Polizei ermittelt', '💰 Neuer Millionär in Neapel gesichtet', '🎄 Weihnachtsmarkt in Mailand eröffnet', '🏎️ Illegales Straßenrennen an der Küste', '🌙 Mondrakete startet bald hinter Mailand', '🐱 CatHub knackt 10 Millionen Nutzer', '🎮 „Italien Empire" ist das Spiel des Jahres', '🚁 Helikopter über dem Golf von Neapel'];
  function tvNews() {
    setTVTitle('📰 Italia TV'); const t = $('tvBody'); t.innerHTML = ''; t.appendChild(backBtn(tvHome));
    const sc = document.createElement('div'); sc.className = 'tvScreen'; sc.style.cssText += 'padding:0;position:relative';
    sc.innerHTML = '<div style="height:260px;background:linear-gradient(160deg,#16314f,#0a1420);display:flex;align-items:center;justify-content:center;font-size:60px">📺</div>';
    const tick = document.createElement('div'); tick.style.cssText = 'background:#c8101a;color:#fff;padding:8px 12px;font-weight:700;white-space:nowrap;overflow:hidden';
    const span = document.createElement('span'); span.style.cssText = 'display:inline-block;padding-left:100%;animation:tvticker 18s linear infinite';
    span.textContent = NEWS.join('   •   ');
    tick.appendChild(span); sc.appendChild(tick);
    const lbl = document.createElement('div'); lbl.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.5);padding:4px 10px;border-radius:6px;font-weight:700'; lbl.textContent = '📰 ITALIA TV · LIVE'; sc.appendChild(lbl);
    t.appendChild(sc);
    if (!$('tvTickerStyle')) { const st = document.createElement('style'); st.id = 'tvTickerStyle'; st.textContent = '@keyframes tvticker{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}'; document.head.appendChild(st); }
  }
  function tvStatic(title, desc, hue, items) {
    setTVTitle(title); const t = $('tvBody'); t.innerHTML = ''; t.appendChild(backBtn(tvHome));
    const sc = document.createElement('div'); sc.className = 'tvScreen';
    sc.innerHTML = '<div style="height:200px;background:linear-gradient(160deg,hsl(' + hue + ',50%,40%),hsl(' + ((hue + 50) % 360) + ',50%,20%));display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;text-align:center;padding:14px">' + title + '</div>';
    const body = document.createElement('div'); body.style.cssText = 'padding:14px';
    body.innerHTML = '<p style="opacity:0.85;margin:0 0 10px">' + desc + '</p>' + items.map(i => '<div style="padding:8px 10px;background:rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px">' + i + '</div>').join('');
    sc.appendChild(body); t.appendChild(sc);
  }

  // ---------- Verdrahtung ----------
  function wire() {
    const p = $('pPhone'); if (p && !p._w) { p._w = 1; p.addEventListener('click', () => { const g = G(); if (g && g.game.state === 'play') openPhone(); }); }
    const tv = $('pTV'); if (tv && !tv._w) { tv._w = 1; tv.addEventListener('click', () => { const g = G(); if (g && g.game.state === 'play') openTV(); }); }
  }
  document.addEventListener('DOMContentLoaded', wire); wire();
  IE.onCloseModals = function () { if (viewTimer) { clearInterval(viewTimer); viewTimer = null; } if (IE._stopStreamChat) IE._stopStreamChat(); };
})();
