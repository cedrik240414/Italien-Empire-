// ===================== ADMIN-PACK-EXTRAS & HAUSTIER-TRAINING =====================
(function () {
  const G = () => window.IEgame;
  const has = id => { const g = G(); return !!(g && (g.S.packs || []).includes(id)); };
  IE.hasAdminPack = () => has('adminpack');
  let acc = 0, markAcc = 0;

  function setMarkerColor(m, hex) {
    if (!m) return;
    if (m.material && m.material.color) m.material.color.setHex(hex);
    if (m.children) m.children.forEach(c => { if (c.material && c.material.color) c.material.color.setHex(hex); });
  }

  IE.updateAddons = function (dt) {
    const g = G(); if (!g || g.game.state !== 'play') return;
    const S = g.S;
    // Eigene Shops (Geschäfte) besonders markieren (Admin-Pack)
    markAcc += dt;
    if (markAcc > 1.5) {
      markAcc = 0;
      if (has('adminpack')) for (const s of IE.shops) {
        if (s.type === 'biz' && s.marker) { const own = S.biz && S.biz[s.id]; setMarkerColor(s.marker, own ? 0xffd24a : 0x48e07a); try { s.marker.scale.setScalar(own ? 1.7 : 1); } catch (e) { } }
      }
    }
    // Angeheuerte Kassierer holen Geld aus den eigenen Shops
    acc += dt;
    if (acc > 20) {
      acc = 0;
      if (has('adminpack') && S.hiredCollector) {
        let sum = 0; S.biz = S.biz || {};
        for (const id in S.biz) { const b = S.biz[id]; if (b && b.cash > 0) { sum += b.cash; b.cash = 0; } }
        if (sum > 1) { const net = Math.floor(sum * 0.85); g.addMoney(net); g.toast('💼 Dein Kassierer hat ' + g.fmt(net) + ' aus deinen Shops geholt', 3); g.saveGame(); }
      }
    }
  };

  // Teleport zu einem anderen Spieler (Admin-Pack)
  IE.teleportToPeer = function (r) {
    const g = G(); if (!r || !r.pos) { g.toast('Spieler gerade nicht erreichbar', 2); return; }
    g.placePlayer(r.pos.x + 2, r.pos.z + 2); g.closeModals(); g.toast('Teleportiert zu ' + (r.name || 'Spieler'), 2); g.sfx('pass');
  };

  // Haustier-Stärke
  IE.petLevel = id => { const S = G().S; return (S.petLvl && S.petLvl[id]) || 1; };
  IE.petTrain = function () {
    const g = G(), S = g.S, P = g.P;
    const id = S.petActive;
    if (!id || !(S.pets || []).includes(id)) { g.toast('Nimm erst ein Haustier mit (Pause → 🐾 Haustiere)', 3); return false; }
    const PK = IE.funTrain || IE.funpark;
    if (!PK || Math.hypot(P.pos.x - PK.x, P.pos.z - PK.z) > (IE.funTrain ? 16 : 140)) { g.toast('Fahr erst zum Freizeitpark hinter den großen Bergen im Norden (oranger Marker)', 4); return false; }
    S.petLvl = S.petLvl || {}; const lvl = (S.petLvl[id] || 1);
    if (lvl >= 10) { g.toast('Dein ' + IE.pets[id].name + ' hat schon die höchste Stärke (Lv 10)', 3); return false; }
    const cost = lvl * 15000;
    if (S.money < cost) { g.toast('Du brauchst ' + g.fmt(cost) + ' fürs Training', 2); return false; }
    S.money -= cost; S.petLvl[id] = lvl + 1; g.sfx('cash');
    g.banner('🎡 Freizeitpark', '🐾', 'Dein ' + IE.pets[id].name + ' ist jetzt Stärke Lv ' + (lvl + 1), 4);
    g.saveGame(); return true;
  };
})();
