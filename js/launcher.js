// ===== SVE STUDIOS Intro + Empire-Games-Menü + Dubai Empire =====
// Läuft vor dem Spiel: Studio-Intro -> Spielauswahl -> (Italien oder Dubai Empire)
'use strict';
(function () {
  window.IE_GAME = window.IE_GAME || 'italien';
  const $ = id => document.getElementById(id);

  // ---------- Dubai-Story-Daten (aus der Story) ----------
  const DUBAI_CHARS = [
    { n: 'Karim Haddad', r: 'Der Boss', a: 24, c: '#1f6feb', i: 'Geboren in Hamburg, aufgewachsen zwischen zwei Welten. Intelligent, ehrgeizig und manchmal rücksichtslos. Er will ein Imperium aufbauen, das niemand zerstören kann.' },
    { n: 'Yassin', r: 'Der beste Freund', a: 25, c: '#2ea043', i: 'Kennt Karim seit seiner Jugend. Loyal, lustig und manchmal zu impulsiv. Karims rechte Hand und Mitgründer der Black Vipers.' },
    { n: 'Diego', r: 'Der Geschäftsmann', a: 29, c: '#d6b04a', i: 'Kontakte in der Immobilien- und Luxuswelt. Denkt immer drei Schritte voraus. Sein größter Traum ist ein eigenes Unternehmen.' },
    { n: 'Omar', r: 'Der Beschützer', a: 27, c: '#c8372d', i: 'Ehemaliger Kampfsportler. Mutig, aber temperamentvoll. Er würde für seine Freunde alles riskieren.' },
    { n: 'Malik', r: 'Der König · Desert Kings', a: 38, c: '#8a6d2f', i: 'Anführer der Desert Kings. Kontrolliert zahlreiche Geschäfte in Dubai und duldet keine Konkurrenz. Karims größter Gegenspieler.' }
  ];
  const DUBAI_ACTS = [
    ['Akt 1 – Der Anfang', 'Ein Flugzeug aus Hamburg landet in Dubai. Karim kommt mit nichts an – nur mit einem Traum: ein eigenes Imperium. Zusammen mit Yassin gründet er die „Black Vipers".'],
    ['Akt 2 – Erste Geschäfte', 'Lieferungen, Deals und ein erster Kunde: Rashid. Doch in Dubai ist nicht jeder freundlich, der einen Anzug trägt – ein Teil der Lieferung verschwindet.'],
    ['Akt 3 – Verrat & Vertrauen', 'Jemand aus Karims Crew spricht heimlich mit Malik, dem König der Desert Kings. Karim muss entscheiden, wem er vertraut.'],
    ['Akt 4 – Der König von Dubai', 'Treffen mit Malik in der Wüste. Kein Krieg mehr – getrennte Wege. Die Black Vipers feiern ihren Aufstieg. Karim wird zum König von Dubai. Hauptquartier: Villa Jumeirah.']
  ];

  // ---------- Styles ----------
  const css = document.createElement('style');
  css.textContent = `
  #sveIntro,#launcher,#dubaiScreen{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;font-family:'Barlow',system-ui,sans-serif}
  #sveIntro{background:#000;transition:opacity .6s}
  .sve-wrap{text-align:center;width:min(760px,88vw);animation:sveIn 1.4s cubic-bezier(.2,.8,.2,1)}
  .sve-logo{width:100%;height:auto;display:block;filter:drop-shadow(0 0 30px rgba(180,200,230,.12))}
  .sve-sub{font:600 13px 'Barlow Condensed',sans-serif;letter-spacing:.5em;color:#7a7a7a;text-transform:uppercase;margin-top:14px;animation:sveFade 1.2s ease .6s both}
  @keyframes sveIn{from{opacity:0;transform:scale(1.06)}}
  @keyframes sveFade{from{opacity:0}}

  #launcher,#dubaiScreen{overflow-y:auto;padding:28px 16px;background:radial-gradient(ellipse at 50% 20%,#1a2740,#05070c 75%)}
  #launcher[hidden],#dubaiScreen[hidden],#sveIntro[hidden]{display:none!important}
  .lc-in{max-width:980px;width:100%;margin:auto;text-align:center}
  .lc-top{font:600 14px 'Barlow Condensed',sans-serif;letter-spacing:.4em;color:#6f8bbf;text-transform:uppercase}
  .lc-h{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:clamp(40px,8vw,78px);color:#eaf1ff;margin:6px 0 4px;line-height:.95}
  .lc-h em{font-style:italic;color:#d6b04a}
  .lc-p{color:#aab8d4;max-width:60ch;margin:0 auto 26px;font-size:16px;line-height:1.5}
  .lc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
  .lc-card{position:relative;border-radius:16px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,.12);min-height:220px;display:flex;flex-direction:column;justify-content:flex-end;text-align:left;transition:transform .15s,border-color .15s;pointer-events:auto;color:#fff}
  .lc-card:hover,.lc-card:focus-visible{transform:translateY(-4px);border-color:#d6b04a;outline:none}
  .lc-card .bg{position:absolute;inset:0}
  .lc-card .ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,12,.05),rgba(5,7,12,.72))}
  .lc-card .cc{position:relative;padding:18px 20px}
  .lc-card h3{margin:0;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:34px}
  .lc-card .flag{display:flex;height:4px;width:96px;margin:8px 0}
  .lc-card .flag i{flex:1}
  .lc-card .st{font:600 13px 'Barlow Condensed',sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#d6b04a;margin-top:6px}
  .lc-soon{opacity:.6;cursor:default}
  .lc-soon:hover{transform:none;border-color:rgba(255,255,255,.12)}
  .it-bg{background:linear-gradient(135deg,#2f6b3e,#b8a24a 55%,#b23b33)}
  .du-bg{background:linear-gradient(135deg,#caa94e,#8a5a1e 55%,#1a2740)}
  .du-bg2{background:linear-gradient(135deg,#1b2a4a,#3a2d6b)}

  .db-chars{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:14px 0 24px;text-align:left}
  .db-c{background:rgba(23,27,34,.86);border:1px solid rgba(214,176,74,.25);border-radius:12px;padding:14px 16px}
  .db-c .av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:800 20px 'Barlow',sans-serif;color:#fff;float:left;margin:0 12px 6px 0}
  .db-c h4{margin:2px 0 0;font-size:20px;color:#eaf1ff}
  .db-c .rl{font:600 12px 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#d6b04a}
  .db-c p{clear:both;margin:8px 0 0;font-size:13.5px;color:#c3cde0;line-height:1.45}
  .db-acts{text-align:left;display:grid;gap:10px;margin:8px 0 24px}
  .db-act{background:rgba(214,176,74,.08);border-left:3px solid #d6b04a;border-radius:8px;padding:10px 14px}
  .db-act b{color:#d6b04a}
  .db-act p{margin:4px 0 0;color:#c3cde0;font-size:14px;line-height:1.45}
  .lc-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px}
  .lc-btn{pointer-events:auto;border:1px solid #d6b04a;background:#d6b04a;color:#10131a;font:700 20px 'Barlow Condensed',sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:12px 26px;border-radius:3px;cursor:pointer}
  .lc-btn.ghost{background:rgba(13,15,19,.5);color:#d6b04a}
  .lc-note{color:#8aa0c8;font-size:13px;margin-top:16px;max-width:60ch;margin-left:auto;margin-right:auto;line-height:1.5}
  /* Dubai-Reskin für den normalen Titel */
  body.dubai{--gold:#d6b04a}
  body.dubai #title{background:linear-gradient(180deg,rgba(20,16,8,.2),rgba(10,8,4,.6) 45%,rgba(8,7,10,.97));}
  `;
  document.head.appendChild(css);

  // ---------- Overlays bauen ----------
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const sve = mk('div'); sve.id = 'sveIntro';
  sve.innerHTML = `<div class="sve-wrap"><img class="sve-logo" src="js/sve-logo.png?v=74" alt="SVE Studios"><div class="sve-sub">präsentiert</div></div>`;
  document.body.appendChild(sve);

  const launcher = mk('div'); launcher.id = 'launcher'; launcher.hidden = true;
  launcher.innerHTML = `<div class="lc-in">
    <div class="lc-top">SVE Studios</div>
    <div class="lc-h">Empire <em>Games</em></div>
    <div class="lc-p">Wähle dein Spiel. Jedes Empire – eine eigene Stadt, eine eigene Geschichte.</div>
    <div class="lc-grid">
      <button class="lc-card" id="pickItalien"><div class="bg it-bg"></div><div class="ov"></div><div class="cc"><h3>Italien Empire</h3><div class="flag"><i style="background:#2f9a5c"></i><i style="background:#f3ead8"></i><i style="background:#d1453b"></i></div><div class="st">Spielbar · von Neapel bis Sizilien</div></div></button>
      <button class="lc-card" id="pickDubai"><div class="bg du-bg"></div><div class="ov"></div><div class="cc"><h3>Dubai Empire</h3><div class="flag"><i style="background:#d6b04a"></i><i style="background:#1b2a4a"></i><i style="background:#c8372d"></i></div><div class="st">Neu · Karim & die Black Vipers</div></div></button>
      <div class="lc-card lc-soon"><div class="bg du-bg2"></div><div class="ov"></div><div class="cc"><h3>Mehr Empires</h3><div class="st">Bald …</div></div></div>
    </div>
    <div class="lc-note">Weitere „Empire"-Spiele kommen später dazu.</div>
  </div>`;
  document.body.appendChild(launcher);

  const dubai = mk('div'); dubai.id = 'dubaiScreen'; dubai.hidden = true;
  const charsHtml = DUBAI_CHARS.map(c => `<div class="db-c"><div class="av" style="background:${c.c}">${c.n[0]}</div><h4>${c.n}</h4><div class="rl">${c.r} · ${c.a} Jahre</div><p>${c.i}</p></div>`).join('');
  const actsHtml = DUBAI_ACTS.map(a => `<div class="db-act"><b>${a[0]}</b><p>${a[1]}</p></div>`).join('');
  dubai.innerHTML = `<div class="lc-in">
    <div class="lc-top">Empire Games · SVE Studios</div>
    <div class="lc-h">Dubai <em>Empire</em></div>
    <div class="lc-p">Karim Haddad kommt aus Hamburg nach Dubai – mit nichts außer einem Traum. Gründe mit deiner Crew, den „Black Vipers", dein eigenes Imperium zwischen Wolkenkratzern, Luxus und der Wüste – gegen Malik und die „Desert Kings".</div>
    <div class="lc-top" style="text-align:left;margin-bottom:6px">Die Charaktere</div>
    <div class="db-chars">${charsHtml}</div>
    <div class="lc-top" style="text-align:left;margin-bottom:6px">Die Geschichte</div>
    <div class="db-acts">${actsHtml}</div>
    <div class="lc-btns"><button class="lc-btn" id="dubaiPlay">Dubai Empire spielen</button><button class="lc-btn ghost" id="dubaiBack">Zurück zum Menü</button></div>
    <div class="lc-note">Startversion: Dubai Empire nutzt vorerst dieselbe Spielwelt wie Italien Empire, aber mit Dubai-Story, Dubai-Crew (Karim, Yassin, Diego, Omar), Dirham-Währung und Gold-Look. Die eigene Dubai-Wüstenwelt mit Burj Khalifa und eigenen Missionen kommt als nächstes Update.</div>
  </div>`;
  document.body.appendChild(dubai);

  // ---------- Ablauf ----------
  function show(el) { for (const o of [sve, launcher, dubai]) o.hidden = (o !== el); }
  // Studio-Intro -> Menü
  setTimeout(() => { sve.style.opacity = '0'; setTimeout(() => show(launcher), 600); }, 2600);

  function startGameMode(mode) {
    window.IE_GAME = mode;
    document.body.classList.toggle('dubai', mode === 'dubai');
    if (mode === 'dubai') applyDubaiTheme();
    // Overlays weg -> der normale Login/Titel (darunter) erscheint
    show(null); sve.hidden = launcher.hidden = dubai.hidden = true;
  }
  $('pickItalien').addEventListener('click', () => startGameMode('italien'));
  $('pickDubai').addEventListener('click', () => show(dubai));
  $('dubaiBack').addEventListener('click', () => show(launcher));
  $('dubaiPlay').addEventListener('click', () => startGameMode('dubai'));

  // ---------- Dubai-Reskin für Titel + Spiel ----------
  function applyDubaiTheme() {
    try {
      const IE = window.IE;
      // Titel umschreiben
      const h1 = document.querySelector('#title h1'); if (h1) h1.innerHTML = 'Dubai <em>Empire</em>';
      const lgt = document.querySelector('#login .lgt'); if (lgt) lgt.innerHTML = 'Dubai <em>Empire</em>';
      const loadT = document.querySelector('#loading .t'); if (loadT) loadT.innerHTML = 'Dubai<br>Empire';
      const lead = document.querySelector('#title .lead');
      if (lead) lead.textContent = 'Du spielst Karim Haddad, der aus Hamburg nach Dubai kommt, um ein Imperium aufzubauen. Mit deiner Crew – den Black Vipers – steigst du vom kleinen Anfang zum König von Dubai auf, gegen Malik und die Desert Kings.';
      // Charaktere im Titel ersetzen (nur Anzeige)
      const cast = document.getElementById('cast');
      if (cast) { cast.innerHTML = ''; for (const c of DUBAI_CHARS) { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="tag">${c.a} Jahre · ${c.r}</div><h3>${c.n}</h3><p>${c.i}</p>`; cast.appendChild(d); } }
      // Spielbare Crew umbenennen (Modelle bleiben)
      if (IE && IE.chars) {
        const map = { jack: ['Karim Haddad', 'Der Boss der Black Vipers. Kam aus Hamburg nach Dubai, um ein Imperium aufzubauen.'], marco: ['Yassin', 'Karims bester Freund und rechte Hand. Loyal, lustig, manchmal zu impulsiv.'], sofia: ['Amira', 'Plant die Deals der Black Vipers und kennt Dubais Unterwelt.'] };
        for (const id in map) if (IE.chars[id]) { IE.chars[id].name = map[id][0]; IE.chars[id].info = map[id][1]; }
      }
    } catch (e) { console.error('Dubai-Theme', e); }
  }

  // Falls jemand schon vor dem Menü auf dem Titel landet: Titel erst nach Auswahl zeigen
})();
