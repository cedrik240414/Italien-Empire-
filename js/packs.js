// ===================== ERWEITERUNGEN / PACKS – Shop & Freischaltung =====================
(function () {
  const $ = id => document.getElementById(id);
  const hex = c => '#' + (c >>> 0).toString(16).padStart(6, '0');

  function packContents(pk) {
    const parts = [];
    const names = (ids, byId, ic) => (ids || []).map(id => (byId[id] ? ic + ' ' + byId[id].name : null)).filter(Boolean);
    parts.push(...names(pk.cars, IE.carById, '🚗'));
    parts.push(...names(pk.boats, IE.boatById, '⛵'));
    parts.push(...names(pk.planes, IE.planeById, '✈️'));
    parts.push(...names(pk.helis, IE.heliById, '🚁'));
    parts.push(...names(pk.weapons, IE.weaponById, '🔫'));
    parts.push(...names(pk.skins, IE.skinById, '🧍'));
    return parts;
  }

  function grantPack(id) {
    const g = window.IEgame, S = g.S, pk = IE.packById[id];
    if (!pk) return;
    S.packs = S.packs || []; if (!S.packs.includes(id)) S.packs.push(id);
    S.cars = S.cars || []; (pk.cars || []).forEach(c => { if (!S.cars.includes(c)) S.cars.push(c); });
    S.boats = S.boats || []; (pk.boats || []).forEach(b => { if (!S.boats.includes(b)) S.boats.push(b); });
    S.planes = S.planes || []; (pk.planes || []).forEach(p => { if (!S.planes.includes(p)) S.planes.push(p); });
    S.helis = S.helis || []; (pk.helis || []).forEach(h => { if (!S.helis.includes(h)) S.helis.push(h); });
    S.skins = S.skins || []; (pk.skins || []).forEach(s => { if (!S.skins.includes(s)) S.skins.push(s); });
    (pk.weapons || []).forEach(w => { const def = IE.weaponById[w]; if (def && S.weapons[w] === undefined) S.weapons[w] = def.clip || 100; });
  }
  IE.grantPack = grantPack;

  function owned(id) { const g = window.IEgame; return !!(g && (g.S.packs || []).includes(id)); }

  function buyPack(id) {
    const g = window.IEgame, S = g.S, pk = IE.packById[id];
    if (!pk || owned(id)) return;
    if (S.money < pk.price) { g.toast('Zu wenig Geld für das ' + pk.name + '-Pack', 2); return; }
    S.money -= pk.price; grantPack(id); g.sfx('cash');
    g.banner(pk.name + '-Pack', pk.emoji, 'freigeschaltet!', 3);
    g.saveGame(); render();
  }

  function render() {
    const g = window.IEgame; if (!g) return;
    $('packsCash').textContent = g.fmt(g.S.money);
    const box = $('packsRows'); box.innerHTML = '';
    for (const pk of IE.packs) {
      const own = owned(pk.id);
      const card = document.createElement('div');
      card.className = 'packCard';
      card.style.borderColor = hex(pk.color);
      const items = packContents(pk).map(t => '<span class="pItem">' + t + '</span>').join('');
      card.innerHTML =
        '<div class="pHead" style="background:linear-gradient(135deg,' + hex(pk.color) + '33,' + hex(pk.color) + '11)">' +
          '<span class="pEmoji">' + pk.emoji + '</span>' +
          '<span class="pName">' + pk.name + '</span>' +
          (own ? '<span class="pOwned">✓ freigeschaltet</span>' : '') +
        '</div>' +
        '<div class="pDesc">' + pk.desc + '</div>' +
        '<div class="pItems">' + items + '</div>' +
        '<button class="pBuy' + (own ? ' done' : '') + '"></button>';
      const btn = card.querySelector('.pBuy');
      if (own) { btn.textContent = '✓ Im Besitz'; btn.disabled = true; }
      else { btn.textContent = 'Kaufen · ' + g.fmt(pk.price); btn.disabled = g.S.money < pk.price; btn.onclick = () => buyPack(pk.id); }
      box.appendChild(card);
    }
  }

  function openPacks() {
    const g = window.IEgame; if (!g) return;
    g.closeModals(); $('packsModal').hidden = false;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
    render();
  }
  IE.openPacks = openPacks;

  // Buttons verdrahten (Pause-Menü)
  document.addEventListener('DOMContentLoaded', wire);
  wire();
  function wire() {
    const b = $('pPacks'); if (b && !b._w) { b._w = 1; b.addEventListener('click', () => { const g = window.IEgame; if (g && g.game.state === 'play') openPacks(); }); }
  }
})();
