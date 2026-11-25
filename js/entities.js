// ===== ITALIEN EMPIRE – Figuren & Fahrzeuge =====
'use strict';
(function () {
const T = THREE;
const lam = (c, extra) => new T.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));
const matCache = {};
const mc = c => matCache[c] || (matCache[c] = lam(c));

// ---------- Mensch ----------
const backTexCache = {};
function backTex(text, color) {
  const k = text + color; if (backTexCache[k]) return backTexCache[k];
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = color || '#f2c230'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 34);
  return backTexCache[k] = new T.CanvasTexture(c);
}
// o: pants, jacket, shirt, skin, hair, female, shoes, hands, sleeves,
//    tie, bow, mask ('ski'|'face'|'half'), maskColor, hat ('cap'|'fedora'|'helmet'|'beanie'|'chef'|'crown'|'cowboy'|'pilot'|'straw'|'hard'|'space'),
//    hatColor, glasses ('sun'|'nerd'|'visor'|'goggles'), beard, back (Text), backColor, chain, pack, packColor, hairStyle ('none'|'long'|'mohawk'), stripe
IE.makeHuman = function (o) {
  const g = new T.Group();
  const box = (w, h, d, c, parent, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mc(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const pivot = (x, y, z) => { const p = new T.Group(); p.position.set(x, y, z); g.add(p); return p; };
  const shoes = o.shoes !== undefined ? o.shoes : 0x1a1a1a, hands = o.hands !== undefined ? o.hands : o.skin;
  const legL = pivot(-0.11, 0.92, 0), legR = pivot(0.11, 0.92, 0);
  box(0.17, 0.88, 0.2, o.pants, legL, 0, -0.44, 0); box(0.17, 0.88, 0.2, o.pants, legR, 0, -0.44, 0);
  box(0.18, 0.1, 0.28, shoes, legL, 0, -0.87, 0.04); box(0.18, 0.1, 0.28, shoes, legR, 0, -0.87, 0.04);
  if (o.stripe) { box(0.02, 0.86, 0.06, o.stripe, legL, -0.09, -0.44, 0); box(0.02, 0.86, 0.06, o.stripe, legR, 0.09, -0.44, 0); }
  const torso = box(o.female ? 0.42 : 0.48, 0.64, 0.26, o.jacket, g, 0, 1.24, 0);
  box(o.female ? 0.2 : 0.22, 0.5, 0.02, o.shirt, g, 0, 1.28, 0.135);
  if (o.tie !== undefined) box(0.06, 0.38, 0.015, o.tie, g, 0, 1.3, 0.148);
  if (o.bow !== undefined) box(0.14, 0.05, 0.02, o.bow, g, 0, 1.52, 0.15);
  if (o.chain) { box(0.2, 0.025, 0.02, 0xe8c040, g, 0, 1.43, 0.15); box(0.06, 0.07, 0.02, 0xe8c040, g, 0, 1.38, 0.155); }
  if (o.back) { const pl = new T.Mesh(new T.PlaneGeometry(0.4, 0.2), new T.MeshBasicMaterial({ map: backTex(o.back, o.backColor), transparent: true })); pl.position.set(0, 1.36, -0.132); pl.rotation.y = Math.PI; g.add(pl); }
  if (o.pack) box(0.34, 0.42, 0.14, o.packColor !== undefined ? o.packColor : 0x3a4a2a, g, 0, 1.24, -0.2);
  box(0.1, 0.1, 0.1, o.skin, g, 0, 1.6, 0);
  const head = new T.Group(); head.position.set(0, 1.76, 0); g.add(head);
  box(0.24, 0.27, 0.25, o.skin, head, 0, 0, 0);
  const hs = o.hairStyle || (o.female ? 'long' : 'short');
  if (hs !== 'none' && o.hat !== 'helmet' && o.hat !== 'space') {
    if (hs === 'mohawk') box(0.06, 0.12, 0.26, o.hair, head, 0, 0.18, -0.01);
    else { box(0.26, 0.09, 0.27, o.hair, head, 0, 0.14, -0.01); box(0.26, 0.2, 0.06, o.hair, head, 0, 0.04, -0.13); }
    if (hs === 'long') box(0.26, 0.42, 0.08, o.hair, head, 0, -0.12, -0.14);
  }
  box(0.04, 0.03, 0.01, 0x111111, head, -0.06, 0.03, 0.126); box(0.04, 0.03, 0.01, 0x111111, head, 0.06, 0.03, 0.126);
  if (o.beard !== undefined) { box(0.24, 0.1, 0.04, o.beard, head, 0, -0.09, 0.125); box(0.1, 0.03, 0.02, o.beard, head, 0, -0.02, 0.135); }
  // Masken
  const mk = o.maskColor !== undefined ? o.maskColor : 0x151515;
  if (o.mask === 'ski') { box(0.265, 0.3, 0.27, mk, head, 0, 0.005, 0); box(0.17, 0.045, 0.01, o.skin, head, 0, 0.03, 0.137); box(0.06, 0.03, 0.01, 0x111111, head, -0.05, 0.03, 0.139); box(0.06, 0.03, 0.01, 0x111111, head, 0.05, 0.03, 0.139); }
  else if (o.mask === 'face') { box(0.22, 0.25, 0.02, mk, head, 0, 0, 0.13); box(0.05, 0.035, 0.01, 0x111111, head, -0.06, 0.04, 0.142); box(0.05, 0.035, 0.01, 0x111111, head, 0.06, 0.04, 0.142); box(0.1, 0.025, 0.01, 0xc8372d, head, 0, -0.07, 0.142); }
  else if (o.mask === 'half') box(0.25, 0.12, 0.02, mk, head, 0, -0.07, 0.13);
  // Brillen
  if (o.glasses === 'sun') { box(0.22, 0.05, 0.02, 0x0a0a0a, head, 0, 0.03, 0.135); }
  else if (o.glasses === 'nerd') { box(0.08, 0.06, 0.015, 0x222222, head, -0.06, 0.03, 0.133); box(0.08, 0.06, 0.015, 0x222222, head, 0.06, 0.03, 0.133); }
  else if (o.glasses === 'visor') box(0.26, 0.07, 0.03, 0x33c8ff, head, 0, 0.03, 0.135);
  else if (o.glasses === 'goggles') { box(0.25, 0.08, 0.04, 0x1b1b1b, head, 0, 0.03, 0.135); box(0.08, 0.05, 0.01, 0x7fd8ff, head, -0.06, 0.03, 0.157); box(0.08, 0.05, 0.01, 0x7fd8ff, head, 0.06, 0.03, 0.157); }
  // Hüte & Helme
  const hc = o.hatColor !== undefined ? o.hatColor : 0x222222;
  const cyl = (rt, rb, h, c, y, z) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, 14), mc(c)); m.position.set(0, y, z || 0); m.castShadow = true; head.add(m); return m; };
  if (o.hat === 'trooper') { // weißer Weltraumsoldaten-Helm mit schwarzem Visier
    const hm = new T.Mesh(new T.SphereGeometry(0.19, 16, 12), mc(0xf2f2f0)); hm.scale.set(1, 1.05, 1.05); hm.position.y = 0.03; head.add(hm);
    box(0.09, 0.045, 0.02, 0x0a0a0a, head, -0.05, 0.05, 0.175); box(0.09, 0.045, 0.02, 0x0a0a0a, head, 0.05, 0.05, 0.175);
    box(0.1, 0.06, 0.03, 0x555555, head, 0, -0.06, 0.18); box(0.02, 0.1, 0.02, 0x0a0a0a, head, 0, -0.01, 0.185);
    box(0.36, 0.03, 0.12, 0xf2f2f0, head, 0, -0.1, -0.05);
  } else if (o.hat === 'cap') { box(0.27, 0.08, 0.28, hc, head, 0, 0.17, 0); box(0.22, 0.02, 0.12, hc, head, 0, 0.14, 0.18); }
  else if (o.hat === 'pilot') { box(0.28, 0.08, 0.29, hc, head, 0, 0.17, 0); box(0.24, 0.02, 0.1, 0x111111, head, 0, 0.13, 0.17); box(0.06, 0.04, 0.01, 0xe8c040, head, 0, 0.18, 0.146); }
  else if (o.hat === 'fedora') { cyl(0.2, 0.2, 0.02, hc, 0.15); cyl(0.12, 0.14, 0.13, hc, 0.22); cyl(0.142, 0.142, 0.03, 0x111111, 0.18); }
  else if (o.hat === 'cowboy') { cyl(0.28, 0.28, 0.02, hc, 0.15); cyl(0.12, 0.14, 0.14, hc, 0.23); }
  else if (o.hat === 'straw') { cyl(0.24, 0.24, 0.02, hc, 0.15); cyl(0.13, 0.13, 0.08, hc, 0.2); cyl(0.135, 0.135, 0.025, 0x1b3d6e, 0.18); }
  else if (o.hat === 'beanie') { const m = new T.Mesh(new T.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mc(hc)); m.position.y = 0.09; m.scale.set(1, 0.9, 1); head.add(m); }
  else if (o.hat === 'helmet' || o.hat === 'hard') { const m = new T.Mesh(new T.SphereGeometry(o.hat === 'hard' ? 0.17 : 0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mc(hc)); m.position.y = 0.06; head.add(m); if (o.hat === 'hard') box(0.36, 0.02, 0.36, hc, head, 0, 0.07, 0); else box(0.3, 0.04, 0.05, hc, head, 0, 0.06, 0.15); }
  else if (o.hat === 'space') { const m = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.3, roughness: 0.3 })); m.position.y = 0.03; head.add(m); box(0.26, 0.16, 0.05, 0xd6a53a, head, 0, 0.03, 0.19); }
  else if (o.hat === 'chef') { cyl(0.13, 0.12, 0.18, 0xf6f6f6, 0.25); const m = new T.Mesh(new T.SphereGeometry(0.16, 12, 8), mc(0xf6f6f6)); m.position.y = 0.36; m.scale.y = 0.7; head.add(m); }
  else if (o.hat === 'crown') { cyl(0.14, 0.14, 0.1, 0xe8c040, 0.19); for (let i = 0; i < 5; i++) { const sp = new T.Mesh(new T.ConeGeometry(0.03, 0.08, 4), mc(0xe8c040)); const a = i / 5 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.12, 0.28, Math.sin(a) * 0.12); head.add(sp); } box(0.04, 0.04, 0.01, 0xc8372d, head, 0, 0.19, 0.142); }
  const armL = pivot(-0.31, 1.52, 0), armR = pivot(0.31, 1.52, 0);
  const sleeve = o.sleeves !== undefined ? o.sleeves : o.jacket;
  box(0.13, 0.6, 0.15, sleeve, armL, 0, -0.3, 0); box(0.13, 0.6, 0.15, sleeve, armR, 0, -0.3, 0);
  box(0.11, 0.11, 0.11, hands, armL, 0, -0.64, 0); box(0.11, 0.11, 0.11, hands, armR, 0, -0.64, 0);
  const gun = new T.Group(); gun.position.set(0, -0.66, 0.08); armR.add(gun);
  const gunMesh = box(0.055, 0.07, 0.3, 0x1c1c22, gun, 0, 0.02, 0.1);     // Lauf (wird je Waffe skaliert)
  box(0.085, 0.12, 0.18, 0x2c2c33, gun, 0, 0, 0);                         // Gehäuse
  box(0.03, 0.055, 0.06, 0x101014, gun, 0, 0.105, 0.04);                  // Visier/Kimme
  box(0.07, 0.17, 0.08, 0x18181d, gun, 0, -0.11, -0.03).rotation.x = 0.42; // Griff
  box(0.055, 0.15, 0.07, 0x23232c, gun, 0, -0.1, 0.085);                  // Magazin
  gun.visible = false;
  return { group: g, legL, legR, armL, armR, head, gun, gunMesh, torso };
};
IE.animHuman = function (h, phase, amp, aiming, dead) {
  if (dead) return;
  const s = Math.sin(phase) * amp;
  h.legL.rotation.x = s; h.legR.rotation.x = -s;
  if (aiming) {
    if (h.hold === 'rpg') {            // Raketenwerfer auf der Schulter, Rohr nach vorne (leicht angehoben)
      h.armR.rotation.set(-1.7, -0.1, 0); h.armL.rotation.set(-1.4, 0.45, 0); h.gun.rotation.x = 1.45;
    } else if (h.hold === 'minigun') { // Minigun beidhändig tief vor dem Körper
      h.armR.rotation.set(-0.95, -0.12, 0); h.armL.rotation.set(-0.95, 0.35, 0); h.gun.rotation.x = 0.95;
    } else {                            // normale Waffe: beidhändig, beide Hände an der Waffe
      h.armR.rotation.set(-Math.PI / 2, -0.08, 0); h.armL.rotation.set(-Math.PI / 2, 0.92, 0); h.gun.rotation.x = Math.PI / 2;
    }
  } else {
    h.armR.rotation.set(s * 0.8, 0, 0);
    h.armL.rotation.set(-s * 0.8, 0, 0);
    h.gun.rotation.x = 0;
  }
};
IE.setGunLen = function (h, len, thick) { h.gun.visible = len > 0; if (len > 0) { h.gunMesh.scale.set(thick || 1, thick || 1, len / 0.3); h.gunMesh.position.z = len / 2 - 0.05; } };

// ---------- Autos ----------
const profiles = {
  klein: { L: 3.6, W: 1.66, r: 0.31, body: [[-1.8,0.32],[1.8,0.32],[1.82,0.78],[1.5,0.95],[0.8,1.0],[0.38,1.5],[-1.2,1.5],[-1.72,1.05],[-1.82,0.88]], glass: [[0.74,1.02],[0.4,1.45],[-1.16,1.45],[-1.62,1.04]] },
  limo:  { L: 4.6, W: 1.8, r: 0.34, body: [[-2.3,0.32],[2.3,0.32],[2.32,0.8],[1.2,0.95],[0.5,1.42],[-1.2,1.42],[-1.9,1.0],[-2.32,0.95]], glass: [[1.15,0.98],[0.52,1.37],[-1.16,1.37],[-1.85,1.02]] },
  suv:   { L: 4.5, W: 1.92, r: 0.44, body: [[-2.25,0.5],[2.25,0.5],[2.27,1.15],[1.4,1.3],[0.9,1.92],[-2.1,1.92],[-2.27,1.3]], glass: [[1.36,1.34],[0.9,1.86],[-2.05,1.86],[-2.12,1.36]] },
  sport: { L: 4.4, W: 1.92, r: 0.34, body: [[-2.2,0.3],[2.2,0.3],[2.26,0.58],[0.9,0.86],[0.1,1.24],[-1.1,1.24],[-2.1,0.86],[-2.22,0.74]], glass: [[0.86,0.89],[0.12,1.2],[-1.05,1.2],[-1.9,0.89]] },
  van:   { L: 4.9, W: 1.96, r: 0.36, body: [[-2.45,0.4],[2.45,0.4],[2.47,1.0],[2.1,1.25],[1.7,2.2],[-2.45,2.25]], glass: [[2.02,1.3],[1.7,2.08],[1.05,2.08],[1.05,1.3]] },
  kombi: { L: 4.7, W: 1.82, r: 0.34, body: [[-2.35,0.33],[2.35,0.33],[2.37,0.82],[1.3,0.96],[0.6,1.45],[-2.25,1.45],[-2.37,0.95]], glass: [[1.25,0.99],[0.62,1.4],[-2.18,1.4],[-2.28,1.0]] },
  pickup:{ L: 5.0, W: 1.96, r: 0.42, body: [[-2.5,0.5],[2.5,0.5],[2.52,1.2],[1.6,1.35],[1.0,1.95],[-0.4,1.95],[-0.5,1.3],[-2.5,1.3]], glass: [[1.52,1.38],[1.02,1.9],[-0.35,1.9],[-0.42,1.38]] },
  retro: { L: 4.0, W: 1.7, r: 0.33, body: [[-2.0,0.35],[2.0,0.35],[2.02,0.75],[1.0,0.86],[0.3,1.32],[-0.8,1.33],[-1.6,0.96],[-2.02,0.8]], glass: [[0.95,0.89],[0.33,1.28],[-0.78,1.29],[-1.5,0.96]] },
  cabrio:{ L: 4.3, W: 1.9, r: 0.34, body: [[-2.15,0.3],[2.15,0.3],[2.2,0.62],[0.7,0.8],[-1.7,0.84],[-2.15,0.78]], glass: [[0.72,0.8],[0.28,1.16],[0.18,1.16],[0.6,0.8]] },
  super: { L: 4.5, W: 2.02, r: 0.34, body: [[-2.25,0.28],[2.25,0.28],[2.32,0.5],[0.9,0.76],[0.0,1.12],[-1.0,1.12],[-2.2,0.8],[-2.26,0.7]], glass: [[0.86,0.79],[0.02,1.07],[-0.96,1.07],[-2.0,0.83]] }
};
const glassMat = new T.MeshStandardMaterial({ color: 0x1c2630, metalness: 0.7, roughness: 0.15 });
const tireMat = lam(0x161616), rimMat = new T.MeshStandardMaterial({ color: 0xc9c9c9, metalness: 0.9, roughness: 0.3 });
const headMat = new T.MeshBasicMaterial({ color: 0xfff6dc }), tailMat = new T.MeshBasicMaterial({ color: 0xc8100e });
const geoCache = {};
function extr(pts, depth, bevel) {
  const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
  const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth / 2); return g;
}
// Polygon an waagrechter Linie abschneiden (keep: true = oberhalb behalten)
function clipY(pts, c, above) {
  const out = [], inside = q => above ? q[1] >= c : q[1] <= c;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (c - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, c]); }
  }
  return out;
}
IE.makeCar = function (kind, color, police) {
  if (kind === 'tank') return IE.makeTank(color);
  if (kind === 'moto') return IE.makeMoto(color);
  const P = profiles[kind];
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const key = kind;
  const belt = Math.min.apply(null, P.glass.map(q => q[1])), bottom = Math.min.apply(null, P.body.map(q => q[1]));
  const cabW = kind === 'cabrio' ? P.W * 0.9 : P.W * 0.84;
  if (!geoCache[key]) {
    const gc = P.glass.reduce((a, q) => [a[0] + q[0] / P.glass.length, a[1] + q[1] / P.glass.length], [0, 0]);
    const glassBig = P.glass.map(q => [gc[0] + (q[0] - gc[0]) * 1.05, gc[1] + (q[1] - gc[1]) * 1.05]);
    geoCache[key] = { lower: extr(clipY(P.body, belt + 0.02, false), P.W - 0.12, 0.06), upper: extr(clipY(P.body, belt - 0.02, true), cabW - 0.06, 0.03), glass: extr(glassBig, cabW + 0.03, 0) };
  }
  const bodyMat = new T.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.35 });
  const body = new T.Mesh(geoCache[key].lower, bodyMat); body.castShadow = true; g.add(body);
  if (kind !== 'cabrio') { const up = new T.Mesh(geoCache[key].upper, bodyMat); up.castShadow = true; g.add(up); }
  const glass = new T.Mesh(geoCache[key].glass, glassMat); g.add(glass);
  const wheels = [];
  const wg = new T.CylinderGeometry(P.r, P.r, 0.3, 18); wg.rotateX(Math.PI / 2);
  const rg = new T.CylinderGeometry(P.r * 0.62, P.r * 0.62, 0.32, 10); rg.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new T.Group(); w.position.set(sx * (P.L / 2 - 0.78), P.r, sz * (P.W / 2 - 0.03));
    const t = new T.Mesh(wg, tireMat); t.castShadow = true; w.add(t); w.add(new T.Mesh(rg, rimMat));
    g.add(w); wheels.push(w);
  }
  const trim = lam(0x1c1c1c);
  for (const sx of [-1, 1]) {
    const bp = new T.Mesh(new T.BoxGeometry(0.2, 0.24, P.W * 0.98), trim); bp.position.set(sx * (P.L / 2 + 0.03), bottom + 0.16, 0); g.add(bp);
  }
  const hl = new T.BoxGeometry(0.1, 0.16, 0.42);
  const lightY = Math.max(bottom + 0.45, Math.min(belt - 0.18, bottom + 0.75));
  for (const sz of [-1, 1]) {
    const h = new T.Mesh(hl, headMat); h.position.set(P.L / 2 + 0.06, lightY, sz * (P.W / 2 - 0.32)); g.add(h);
    const t = new T.Mesh(hl, tailMat); t.position.set(-P.L / 2 - 0.06, lightY, sz * (P.W / 2 - 0.32)); g.add(t);
    const mi = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.2), bodyMat); mi.position.set(P.glass[0][0] - 0.1, belt + 0.06, sz * (cabW / 2 + 0.12)); g.add(mi);
  }
  const plate = new T.Mesh(new T.BoxGeometry(0.03, 0.15, 0.52), lam(0xf4f4f0)); plate.position.set(-P.L / 2 - 0.14, bottom + 0.34, 0); g.add(plate);
  const plateF = plate.clone(); plateF.position.x = P.L / 2 + 0.14; g.add(plateF);
  let siren = null;
  if (police) {
    const stripe = new T.Mesh(new T.BoxGeometry(P.L * 0.98, 0.18, P.W - 0.05), lam(0xffffff)); stripe.position.set(0, 0.68, 0); g.add(stripe);
    siren = [new T.Mesh(new T.BoxGeometry(0.3, 0.14, 0.5), new T.MeshBasicMaterial({ color: 0x1040ff })), new T.Mesh(new T.BoxGeometry(0.3, 0.14, 0.5), new T.MeshBasicMaterial({ color: 0xff1020 }))];
    siren[0].position.set(-0.3, 1.5, -0.3); siren[1].position.set(-0.3, 1.5, 0.3); g.add(siren[0], siren[1]);
  }
  return { group: outer, wheels, L: P.L, W: P.W, bodyMat, siren, inner: g, topY: Math.max.apply(null, P.body.map(q => q[1])), bottom };
};

// Custom-Aufsätze für Pack-Fahrzeuge (damit die Erweiterungen cool/thematisch aussehen)
IE.decorateCar = function (m, def) {
  if (!m || !m.inner || !def) return;
  const g = m.inner, ty = (m.topY || 1.2), fx = (m.L / 2);
  const L = c => new T.MeshLambertMaterial({ color: c });
  const E = c => new T.MeshBasicMaterial({ color: c }); // „leuchtend"
  const bx = (w, h, d, c, x, y, z, rx, ry, rz) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? L(c) : c); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz; g.add(o); return o; };
  const sp = (r, c, x, y, z) => { const o = new T.Mesh(new T.SphereGeometry(r, 14, 10), typeof c === 'number' ? L(c) : c); o.position.set(x, y, z); g.add(o); return o; };
  const cy = (r0, r1, h, c, x, y, z, axis) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 18), typeof c === 'number' ? L(c) : c); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; o.position.set(x, y, z); g.add(o); return o; };
  const id = def.id, roofY = ty + 0.1;
  switch (id) {
    case 'burgerauto': { const yb = roofY; cy(1.0, 0.95, 0.3, 0xd9a441, 0, yb + 0.15, 0, 'y'); cy(1.05, 1.05, 0.22, 0x5a3418, 0, yb + 0.4, 0, 'y'); bx(1.5, 0.08, 1.5, 0xf2a93b, 0, yb + 0.56, 0, 0, Math.PI / 4, 0); cy(1.1, 1.1, 0.14, 0x5fae3a, 0, yb + 0.66, 0, 'y'); const top = sp(1.0, 0xd9a441, 0, yb + 0.72, 0); top.scale.y = 0.6; for (let i = 0; i < 8; i++) { const a = i * 0.8; sp(0.06, 0xf5ecd0, Math.cos(a) * 0.5, yb + 0.95, Math.sin(a) * 0.5); } break; }
    case 'pizzaauto': { const d = cy(1.3, 1.3, 0.12, 0xe8b45a, 0, roofY + 0.2, 0, 'y'); cy(1.15, 1.15, 0.14, 0xc83a1a, 0, roofY + 0.28, 0, 'y'); for (let i = 0; i < 6; i++) { const a = i * 1.05; sp(0.12, 0xa01010, Math.cos(a) * 0.7, roofY + 0.38, Math.sin(a) * 0.7); } break; }
    case 'hotdogauto': { cy(0.45, 0.45, 2.4, 0xd9a441, 0, roofY + 0.3, 0, 'x'); cy(0.3, 0.3, 2.2, 0xcf6a2a, 0, roofY + 0.5, 0, 'x'); for (let i = -4; i <= 4; i++) bx(0.12, 0.05, 0.6, 0xf2c230, i * 0.22, roofY + 0.78, 0, 0, 0, -0.5); break; }
    case 'avocadoauto': { const o = sp(1.1, 0x4f7a2a, 0, roofY + 0.4, 0); o.scale.set(1, 0.8, 1.3); sp(0.95, 0x8fbf5a, 0, roofY + 0.5, 0.2).scale.set(0.9, 0.7, 1.1); sp(0.4, 0x7a4a20, 0, roofY + 0.55, -0.3); break; }
    case 'pinguinauto': { bx(1.2, 0.05, 2.2, 0xffffff, fx * 0.3, roofY + 0.02, 0); const be = new T.Mesh(new T.ConeGeometry(0.18, 0.5, 8), L(0xf2a020)); be.rotation.z = -Math.PI / 2; be.position.set(fx + 0.25, roofY - 0.2, 0); g.add(be); sp(0.12, 0x111111, fx - 0.2, roofY + 0.2, 0.35); sp(0.12, 0x111111, fx - 0.2, roofY + 0.2, -0.35); break; }
    case 'reaktor': case 'atommonster': { const core = sp(0.55, E(0x7dff4a), 0, roofY + 0.5, 0); const ring = new T.Mesh(new T.TorusGeometry(0.9, 0.12, 8, 20), E(0x3fdd2a)); ring.position.set(0, roofY + 0.5, 0); ring.rotation.x = Math.PI / 2.3; g.add(ring); for (let i = 0; i < 3; i++) { const b = bx(0.5, 0.16, 0.16, 0xf2f230, 0, roofY + 0.5, 0, 0, i * 2.09, 0); } break; }
    case 'ufo': case 'hover': { const dome = sp(0.8, new T.MeshStandardMaterial({ color: 0x9fe8ff, metalness: 0.4, roughness: 0.1, transparent: true, opacity: 0.6 }), 0, roofY + 0.2, 0); dome.scale.y = 0.7; const disc = cy(1.9, 1.9, 0.22, E(0x18e0e0), 0, m.bottom + 0.1, 0, 'y'); disc.material.transparent = true; disc.material.opacity = 0.5; for (let i = 0; i < 6; i++) { const a = i * 1.05; sp(0.14, E(0xff5fd2), Math.cos(a) * 1.7, m.bottom + 0.1, Math.sin(a) * 1.7); } break; }
    case 'pumpkin': { const p = sp(1.0, 0xe8761a, 0, roofY + 0.5, 0); p.scale.y = 0.85; bx(0.2, 0.5, 0.2, 0x3a6a2a, 0, roofY + 1.25, 0); bx(0.5, 0.18, 0.08, E(0xffd060), 0, roofY + 0.6, 0.95); bx(0.5, 0.18, 0.08, E(0xffd060), 0, roofY + 0.6, -0.95); break; }
    case 'hearse': { bx(2.2, 0.5, 0.9, 0x0b0b0d, -0.3, roofY + 0.3, 0); bx(1.4, 0.3, 0.6, 0xd6b04a, -0.3, roofY + 0.56, 0); bx(0.06, 0.5, 0.06, 0xd6b04a, -0.3, roofY + 0.85, 0); bx(0.3, 0.06, 0.06, 0xd6b04a, -0.3, roofY + 0.78, 0); break; }
    case 'firework': { for (const sz of [-1, 1]) { cy(0.14, 0.14, 1.0, 0xf2c230, -fx * 0.6, roofY + 0.2, sz * 0.5, 'y'); const tip = new T.Mesh(new T.ConeGeometry(0.14, 0.3, 8), L(0xc8101a)); tip.position.set(-fx * 0.6, roofY + 0.85, sz * 0.5); g.add(tip); } break; }
    case 'engel': { for (const sz of [-1, 1]) { const w = bx(0.1, 1.4, 1.8, 0xffffff, -0.2, roofY + 0.5, sz * 1.0, 0, sz * 0.4, 0); } const halo = new T.Mesh(new T.TorusGeometry(0.5, 0.08, 8, 20), E(0xffe77a)); halo.position.set(fx * 0.3, roofY + 1.1, 0); halo.rotation.x = Math.PI / 2; g.add(halo); break; }
    case 'teufel': { for (const sz of [-1, 1]) { const h = new T.Mesh(new T.ConeGeometry(0.16, 0.6, 8), L(0xc8101a)); h.position.set(fx * 0.3, roofY + 0.4, sz * 0.4); h.rotation.z = sz * 0.3; g.add(h); } const tail = cy(0.1, 0.05, 1.4, 0x7a0c14, -fx - 0.4, roofY - 0.4, 0, 'x'); const tt = new T.Mesh(new T.ConeGeometry(0.2, 0.4, 6), L(0xc8101a)); tt.rotation.z = Math.PI / 2; tt.position.set(-fx - 1.1, roofY - 0.2, 0); g.add(tt); break; }
    case 'minecart': { for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.18, 0.7, 0.18, 0x8a8f96, sx * (fx - 0.5), roofY + 0.35, sz * 0.7); bx(fx * 1.6, 0.14, 1.5, 0x6a6f76, 0, roofY + 0.6, 0); break; }
    case 'podracer': { for (const sz of [-1, 1]) { cy(0.5, 0.35, 2.2, 0xe8761a, fx + 0.2, roofY, sz * 1.3, 'x'); const fl = new T.Mesh(new T.ConeGeometry(0.4, 1.0, 10), E(0xff8a20)); fl.rotation.z = Math.PI / 2; fl.position.set(-fx - 0.5, roofY, sz * 1.3); g.add(fl); } break; }
    case 'f1rosso': case 'f1argento': { bx(0.2, 0.5, 2.0, def.color, -fx - 0.3, roofY + 0.1, 0); bx(1.0, 0.5, 0.12, def.color, fx + 0.3, m.bottom + 0.5, 0); break; }
  }
};

// ---------- Panzer ----------
IE.makeTank = function (color) {
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const m = new T.MeshLambertMaterial({ color }), dk = lam(0x2a2a26);
  const hull = new T.Mesh(new T.BoxGeometry(7, 1.3, 3.4), m); hull.position.y = 1.15; hull.castShadow = true; g.add(hull);
  const glacis = new T.Mesh(new T.BoxGeometry(1.4, 0.9, 3.3), m); glacis.position.set(3.6, 1.2, 0); glacis.rotation.z = -0.5; g.add(glacis);
  for (const sz of [-1, 1]) { const tr = new T.Mesh(new T.BoxGeometry(7.4, 1.1, 0.8), dk); tr.position.set(0, 0.55, sz * 1.75); tr.castShadow = true; g.add(tr); }
  const turret = new T.Group(); turret.position.set(-0.4, 1.8, 0); g.add(turret);
  const tb = new T.Mesh(new T.CylinderGeometry(1.5, 1.8, 0.9, 10), m); tb.position.y = 0.45; tb.castShadow = true; turret.add(tb);
  const barrel = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 5, 10), dk); barrel.rotation.z = Math.PI / 2; barrel.position.set(3.3, 0.55, 0); turret.add(barrel);
  const hatch = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 0.2, 10), dk); hatch.position.set(-0.4, 0.95, 0.5); turret.add(hatch);
  // Pseudo-Räder (für die Fahrphysik)
  const wheels = []; const wg = new T.CylinderGeometry(0.42, 0.42, 0.3, 10); wg.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new T.Group(); w.position.set(sx * 2.6, 0.42, sz * 1.75); w.add(new T.Mesh(wg, dk)); w.add(new T.Mesh(wg, dk)); g.add(w); wheels.push(w); }
  return { group: outer, wheels, L: 7, W: 3.4, bodyMat: m, siren: null, turret, tank: true };
};

// ---------- Motorrad ----------
IE.makeMoto = function (color) {
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const bodyMat = new T.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35 });
  const dk = lam(0x18181c), chrome = new T.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 0.9, roughness: 0.25 });
  const lean = new T.Group(); g.add(lean); // Aufbau + Fahrer neigen sich, Räder bleiben aufrecht
  const R = 0.46, wb = 1.25;
  const frame = new T.Mesh(new T.BoxGeometry(1.5, 0.18, 0.22), dk); frame.position.set(0, 0.74, 0); lean.add(frame);
  const tank = new T.Mesh(new T.BoxGeometry(0.78, 0.34, 0.36), bodyMat); tank.position.set(0.08, 0.96, 0); lean.add(tank);
  const seat = new T.Mesh(new T.BoxGeometry(0.72, 0.16, 0.3), dk); seat.position.set(-0.55, 0.9, 0); lean.add(seat);
  const tailMesh = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.3), bodyMat); tailMesh.position.set(-0.85, 0.92, 0); lean.add(tailMesh);
  const fair = new T.Mesh(new T.BoxGeometry(0.42, 0.52, 0.36), bodyMat); fair.position.set(0.74, 0.84, 0); lean.add(fair);
  const hb = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.62, 6), chrome); hb.rotation.x = Math.PI / 2; hb.position.set(0.7, 1.12, 0); lean.add(hb);
  const head = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.2), headMat); head.position.set(0.95, 0.88, 0); lean.add(head);
  const ex = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.95, 8), chrome); ex.rotation.z = Math.PI / 2; ex.position.set(-0.55, 0.5, 0.2); lean.add(ex);
  for (const s of [1, -1]) { const fk = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.72, 6), chrome); fk.rotation.z = 0.32; fk.position.set(0.68, 0.58, s * 0.1); lean.add(fk); }
  // Fahrer
  const rider = new T.Group(); rider.position.set(-0.28, 0, 0); lean.add(rider);
  const rc = lam(0x2a2a30);
  const torso = new T.Mesh(new T.BoxGeometry(0.44, 0.52, 0.42), rc); torso.position.set(0, 1.32, 0); torso.rotation.z = 0.25; rider.add(torso);
  const headR = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), lam(0xd8d8dc)); headR.position.set(0.12, 1.72, 0); rider.add(headR);
  for (const s of [1, -1]) {
    const arm = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.12), rc); arm.rotation.z = -0.55; arm.position.set(0.32, 1.32, s * 0.18); rider.add(arm);
    const leg = new T.Mesh(new T.BoxGeometry(0.16, 0.46, 0.14), lam(0x16161c)); leg.position.set(-0.12, 0.98, s * 0.16); rider.add(leg);
  }
  const mkWheel = () => {
    const w = new T.Group();
    const tg = new T.CylinderGeometry(R, R, 0.18, 16); tg.rotateX(Math.PI / 2); w.add(new T.Mesh(tg, tireMat));
    const rg = new T.CylinderGeometry(R * 0.5, R * 0.5, 0.2, 10); rg.rotateX(Math.PI / 2); w.add(new T.Mesh(rg, rimMat));
    return w;
  };
  const front = mkWheel(); front.position.set(wb, R, 0); g.add(front);
  const rear = mkWheel(); rear.position.set(-wb, R, 0); g.add(rear);
  return { group: outer, wheels: [rear, rear, front, front], L: 2.9, W: 0.9, bodyMat, siren: null, inner: g, lean, topY: 1.3, bottom: 0, moto: true };
};

// Custom-Aufsätze für Pack-Flugzeuge
IE.decoratePlane = function (m, def) {
  if (!m || !m.inner || !def) return;
  const g = m.inner, L = c => new T.MeshLambertMaterial({ color: c }), E = c => new T.MeshBasicMaterial({ color: c });
  const bx = (w, h, d, c, x, y, z, ry, rz) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? L(c) : c); o.position.set(x, y, z); if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz; g.add(o); return o; };
  const sp = (r, c, x, y, z) => { const o = new T.Mesh(new T.SphereGeometry(r, 14, 10), typeof c === 'number' ? L(c) : c); o.position.set(x, y, z); g.add(o); return o; };
  const cy = (r0, r1, h, c, x, y, z, axis) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 20), typeof c === 'number' ? L(c) : c); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; o.position.set(x, y, z); g.add(o); return o; };
  const cen = (m.gearH || 1.3) + 1.2;
  switch (def.id) {
    case 'ufojet': { const disc = cy(6, 6, 0.5, E(0x18e0e0), 0, cen, 0, 'y'); disc.scale.y = 0.4; const dome = sp(2.2, new T.MeshStandardMaterial({ color: 0x9fe8ff, metalness: 0.4, roughness: 0.1, transparent: true, opacity: 0.6 }), 0, cen + 0.8, 0); dome.scale.y = 0.7; const ring = new T.Mesh(new T.TorusGeometry(6, 0.3, 8, 28), E(0x8a3cf0)); ring.position.set(0, cen, 0); ring.rotation.x = Math.PI / 2; g.add(ring); for (let i = 0; i < 8; i++) { const a = i * 0.78; sp(0.3, E(0xff5fd2), Math.cos(a) * 5.5, cen - 0.3, Math.sin(a) * 5.5); } break; }
    case 'batplane': { for (const sz of [-1, 1]) { for (let k = 0; k < 3; k++) { const t = new T.Mesh(new T.ConeGeometry(0.9 - k * 0.22, 2.2, 3), L(0x1a1a1f)); t.rotation.x = Math.PI / 2; t.rotation.z = -Math.PI / 2; t.position.set(-1, cen - 0.2, sz * (3 + k * 1.6)); g.add(t); } } sp(0.3, E(0xff2020), 5.5, cen + 0.3, 0.6); sp(0.3, E(0xff2020), 5.5, cen + 0.3, -0.6); break; }
    case 'fireworkjet': { for (const sz of [-1, 1]) for (const o of [-1, 1]) { cy(0.3, 0.3, 2.5, 0xf2c230, -2, cen - 0.8, sz * (3 + o * 0.6), 'x'); const tip = new T.Mesh(new T.ConeGeometry(0.3, 0.7, 10), L(0xc8101a)); tip.rotation.z = -Math.PI / 2; tip.position.set(-0.6, cen - 0.8, sz * (3 + o * 0.6)); g.add(tip); } break; }
    case 'engelflug': { for (const sz of [-1, 1]) bx(0.2, 3, 5, 0xffffff, -1, cen + 1, sz * 3, sz * 0.3, 0); const halo = new T.Mesh(new T.TorusGeometry(1.4, 0.2, 8, 24), E(0xffe77a)); halo.position.set(5, cen + 2.2, 0); halo.rotation.x = Math.PI / 2; g.add(halo); break; }
    case 'teufelflug': { for (const sz of [-1, 1]) { const h = new T.Mesh(new T.ConeGeometry(0.4, 1.5, 8), L(0xc8101a)); h.position.set(5.5, cen + 1, sz * 0.6); h.rotation.z = 0.3 * sz; g.add(h); } for (const sz of [-1, 1]) bx(0.2, 2.5, 4, 0x1a0a0a, -1, cen + 0.8, sz * 3, sz * 0.2, 0); break; }
    case 'pizzajet': { cy(2.6, 2.6, 0.2, 0xe8b45a, 0, cen + 1.6, 0, 'y'); cy(2.3, 2.3, 0.22, 0xc83a1a, 0, cen + 1.7, 0, 'y'); for (let i = 0; i < 8; i++) { const a = i * 0.78; sp(0.25, 0xa01010, Math.cos(a) * 1.4, cen + 1.85, Math.sin(a) * 1.4); } break; }
    case 'xwing': { for (const sz of [-1, 1]) for (const o of [-1, 1]) { bx(3.5, 0.15, 0.9, 0xcfd6dc, -2, cen + o * 0.9, sz * 3.5, sz * 0.3, 0); cy(0.12, 0.12, 3, 0x1a1a1f, -3.5, cen + o * 0.9, sz * 5.2, 'x'); } break; }
    case 'tiefighter': { for (const sz of [-1, 1]) { const panel = new T.Mesh(new T.CylinderGeometry(3, 3, 0.25, 6), L(0x2a2a2e)); panel.rotation.x = Math.PI / 2; panel.rotation.z = Math.PI / 2; panel.position.set(-1, cen, sz * 3.2); g.add(panel); } sp(1.3, new T.MeshStandardMaterial({ color: 0x111214, metalness: 0.5, roughness: 0.3 }), 2, cen, 0); break; }
    case 'atomjet': { sp(0.9, E(0x7dff4a), -1, cen + 1.3, 0); const ring = new T.Mesh(new T.TorusGeometry(1.6, 0.2, 8, 20), E(0x3fdd2a)); ring.position.set(-1, cen + 1.3, 0); ring.rotation.x = Math.PI / 2.3; g.add(ring); break; }
    case 'spionjet': { for (const sz of [-1, 1]) bx(0.15, 1.2, 2.5, 0xd6b04a, -5, cen + 1.5, sz * 0.3, 0, 0.2); break; }
  }
};
// Custom-Aufsätze für Pack-Yachten/-Boote
IE.decorateBoat = function (m, def) {
  if (!m || !m.inner || !def) return;
  const g = m.inner, dt = (m.deckTop || 1.5), L2 = m.L, W2 = m.W;
  const Lm = c => new T.MeshLambertMaterial({ color: c }), E = c => new T.MeshBasicMaterial({ color: c });
  const bx = (w, h, d, c, x, y, z, ry) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? Lm(c) : c); o.position.set(x, y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
  const sp = (r, c, x, y, z) => { const o = new T.Mesh(new T.SphereGeometry(r, 14, 10), typeof c === 'number' ? Lm(c) : c); o.position.set(x, y, z); g.add(o); return o; };
  const cy = (r0, r1, h, c, x, y, z, axis) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 16), typeof c === 'number' ? Lm(c) : c); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; o.position.set(x, y, z); g.add(o); return o; };
  switch (def.id) {
    case 'ghostyacht': { const ghost = sp(2.0, new T.MeshStandardMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.7 }), -L2 * 0.1, dt + 5, 0); ghost.scale.y = 1.3; for (const sz of [-1, 1]) sp(0.3, 0x111111, -L2 * 0.1 + 0.6, dt + 5.6, sz * 0.6); const glow = cy(W2 * 0.5, W2 * 0.5, 0.3, E(0x8a3cf0), 0, dt, 0, 'y'); glow.material.transparent = true; glow.material.opacity = 0.4; break; }
    case 'partyyacht': { sp(1.0, new T.MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.9, roughness: 0.1 }), -L2 * 0.1, dt + 5, 0); for (const sz of [-1, 1]) for (let i = 0; i < 5; i++) sp(0.2, E([0xff2020, 0xf2c230, 0x18c2d8, 0x48e07a, 0xff5fd2][i]), -L2 * 0.4 + i * L2 * 0.2, dt + 2 + Math.sin(i) * 0.5, sz * W2 * 0.45); break; }
    case 'sunyacht': { cy(0.12, 0.12, 3, 0xdddddd, L2 * 0.15, dt + 2, 0, 'y'); const umb = new T.Mesh(new T.ConeGeometry(2.5, 1.2, 16), Lm(0xf2a61a)); umb.position.set(L2 * 0.15, dt + 3.6, 0); g.add(umb); cy(0.2, 0.2, 2.5, 0x7a4a26, -L2 * 0.2, dt + 2, 1, 'y'); for (let i = 0; i < 5; i++) { const a = i * 1.25; bx(1.8, 0.1, 0.5, 0x2e8b3a, -L2 * 0.2 + Math.cos(a) * 0.9, dt + 3.3, 1 + Math.sin(a) * 0.9, a); } break; }
    case 'eisboot': { bx(1.5, 0.1, 2.5, 0xffffff, -L2 * 0.1, dt + 0.6, 0); const be = new T.Mesh(new T.ConeGeometry(0.25, 0.7, 8), Lm(0xf2a020)); be.rotation.z = -Math.PI / 2; be.position.set(L2 * 0.15, dt + 0.8, 0); g.add(be); sp(0.8, 0x1a1a1a, -L2 * 0.05, dt + 1.2, 0); for (const sz of [-1, 1]) sp(0.12, 0xffffff, L2 * 0.05, dt + 1.4, sz * 0.3); break; }
    case 'hoverboat': { const glow = cy(W2 * 0.6, W2 * 0.6, 0.3, E(0x18e0e0), 0, 0.1, 0, 'y'); glow.material.transparent = true; glow.material.opacity = 0.5; const dome = sp(1.2, new T.MeshStandardMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.6 }), 0, dt + 1, 0); dome.scale.y = 0.6; break; }
    case 'sushiyacht': { cy(1.2, 1.2, 0.8, 0xf2f0e8, -L2 * 0.1, dt + 1, 0, 'y'); cy(1.0, 1.0, 0.4, 0xf27a4a, -L2 * 0.1, dt + 1.6, 0, 'y'); bx(2.0, 0.15, 1.0, 0x1a3a2a, -L2 * 0.1, dt + 1.85, 0); break; }
    case 'spionyacht': { cy(0.06, 0.06, 2.5, 0x111111, -L2 * 0.2, dt + 2, 0, 'y'); const dish = new T.Mesh(new T.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), Lm(0xcfd6dc)); dish.position.set(-L2 * 0.2, dt + 3.2, 0); g.add(dish); break; }
  }
};

// ---------- Boote ----------
IE.makeBoat = function (def) {
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  if (def.kind === 'sub') {
    const L = 13, W = 2.8, H = 2.8;
    const hm = new T.MeshStandardMaterial({ color: def.color, metalness: 0.5, roughness: 0.4 });
    const hull = new T.Mesh(new T.CylinderGeometry(1.35, 1.35, L, 18), hm); hull.rotation.z = Math.PI / 2; hull.castShadow = true; g.add(hull);
    const nose = new T.Mesh(new T.SphereGeometry(1.35, 16, 10), hm); nose.position.x = L / 2; nose.scale.x = 0.8; g.add(nose);
    const tail = new T.Mesh(new T.ConeGeometry(1.35, 2.2, 16), hm); tail.rotation.z = -Math.PI / 2; tail.position.x = -L / 2 - 0.6; g.add(tail);
    const tower = new T.Mesh(new T.BoxGeometry(2.6, 1.6, 1.3), hm); tower.position.set(0.5, 1.4, 0); g.add(tower);
    const peri = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1.4, 6), new T.MeshStandardMaterial({ color: 0x1a1a1a })); peri.position.set(0.9, 2.6, 0); g.add(peri);
    const str = new T.Mesh(new T.CylinderGeometry(1.36, 1.36, L * 0.7, 18), new T.MeshStandardMaterial({ color: def.accent, metalness: 0.4, roughness: 0.5 })); str.rotation.z = Math.PI / 2; str.scale.y = 0.12; str.position.y = 0.1; g.add(str);
    for (const sz of [-1, 1]) { const fin = new T.Mesh(new T.BoxGeometry(1.6, 0.1, 1.4), hm); fin.position.set(-L / 2, 0, sz * 1.0); g.add(fin); }
    const fin2 = new T.Mesh(new T.BoxGeometry(1.6, 1.6, 0.1), hm); fin2.position.set(-L / 2, 0, 0); g.add(fin2);
    const prop = new T.Group(); prop.position.set(-L / 2 - 1.5, 0, 0); g.add(prop); for (let i = 0; i < 4; i++) { const bl = new T.Mesh(new T.BoxGeometry(0.1, 1.1, 0.3), new T.MeshStandardMaterial({ color: 0xb0b4b8 })); bl.rotation.x = i * Math.PI / 2; prop.add(bl); }
    // Torpedoröhren vorne (Optik)
    for (const sz of [-0.5, 0.5]) { const tube = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.6, 10), new T.MeshStandardMaterial({ color: 0x111416 })); tube.rotation.z = Math.PI / 2; tube.position.set(L / 2 + 0.4, -0.3, sz); g.add(tube); }
    return { group: outer, L, W, H, bodyMat: hm, prop, sub: true };
  }
  const dims = { jetski: [3.2, 1.2, 0.8], gommone: [5, 2.2, 0.9], riva: [7.5, 2.4, 1.2], speed: [11, 2.8, 1.4], yacht: [22, 6, 3.2] }[def.kind];
  const [L, W, H] = dims;
  const sh = new T.Shape(); sh.moveTo(-L / 2, -W / 2); sh.lineTo(L * 0.15, -W / 2); sh.quadraticCurveTo(L * 0.45, -W * 0.35, L / 2, 0); sh.quadraticCurveTo(L * 0.45, W * 0.35, L * 0.15, W / 2); sh.lineTo(-L / 2, W / 2); sh.closePath();
  const hullG = new T.ExtrudeGeometry(sh, { depth: H, bevelEnabled: true, bevelSize: Math.min(0.15, W * 0.05), bevelThickness: 0.1, bevelSegments: 2 }); hullG.rotateX(-Math.PI / 2); hullG.translate(0, -H * 0.45, 0);
  const hm = new T.MeshStandardMaterial({ color: def.color, metalness: 0.2, roughness: 0.4 });
  const hull = new T.Mesh(hullG, hm); hull.castShadow = true; g.add(hull);
  const am = new T.MeshStandardMaterial({ color: def.accent, metalness: 0.2, roughness: 0.5 });
  const stripe = new T.Mesh(hullG, am); stripe.scale.set(1.01, 0.18, 1.02); stripe.position.y = H * 0.05; g.add(stripe);
  const top = H * 0.55;
  if (def.kind === 'riva') {
    const deckG = new T.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); deckG.rotateX(-Math.PI / 2);
    const deck = new T.Mesh(deckG, lam(0xa8703a)); deck.scale.set(0.96, 1, 0.92); deck.position.y = top; g.add(deck);
    const ws = new T.Mesh(new T.BoxGeometry(0.08, 0.5, W * 0.8), glassMat); ws.position.set(0.6, top + 0.3, 0); ws.rotation.z = 0.5; g.add(ws);
    const seat = new T.Mesh(new T.BoxGeometry(1.6, 0.5, W * 0.7), lam(0xe9e1cc)); seat.position.set(-0.8, top + 0.25, 0); g.add(seat);
  } else if (def.kind === 'speed') {
    const cab = new T.Mesh(new T.BoxGeometry(3.4, 0.7, W * 0.75), glassMat); cab.position.set(0.2, top + 0.3, 0); g.add(cab);
    const deck = new T.Mesh(new T.BoxGeometry(L * 0.7, 0.1, W * 0.85), lam(0xffffff)); deck.position.set(-L * 0.1, top, 0); g.add(deck);
  } else if (def.kind === 'yacht') {
    const d1 = new T.Mesh(new T.BoxGeometry(L * 0.6, 2.2, W * 0.8), lam(0xf6f6f2)); d1.position.set(-L * 0.08, top + 1.1, 0); d1.castShadow = true; g.add(d1);
    const w1 = new T.Mesh(new T.BoxGeometry(L * 0.61, 0.8, W * 0.81), glassMat); w1.position.set(-L * 0.08, top + 1.3, 0); g.add(w1);
    const d2 = new T.Mesh(new T.BoxGeometry(L * 0.35, 1.8, W * 0.65), lam(0xf6f6f2)); d2.position.set(-L * 0.1, top + 3.1, 0); g.add(d2);
    const w2 = new T.Mesh(new T.BoxGeometry(L * 0.36, 0.7, W * 0.66), glassMat); w2.position.set(-L * 0.1, top + 3.3, 0); g.add(w2);
    const mast = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 3, 6), lam(0xdddddd)); mast.position.set(-L * 0.1, top + 5.4, 0); g.add(mast);
  } else if (def.kind === 'gommone') {
    for (const sz of [-1, 1]) { const tube = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, L * 0.8, 10), am); tube.rotation.z = Math.PI / 2; tube.position.set(-L * 0.05, top - 0.1, sz * (W / 2 - 0.3)); g.add(tube); }
    const con = new T.Mesh(new T.BoxGeometry(0.8, 0.9, 0.8), lam(0xdddddd)); con.position.set(0, top + 0.4, 0); g.add(con);
  } else {
    const seat = new T.Mesh(new T.BoxGeometry(1.4, 0.35, 0.5), lam(0x222222)); seat.position.set(-0.3, top + 0.25, 0); g.add(seat);
    const bar = new T.Mesh(new T.BoxGeometry(0.2, 0.5, 0.8), am); bar.position.set(0.6, top + 0.4, 0); g.add(bar);
  }
  return { group: outer, L, W, H, bodyMat: hm, inner: g, deckTop: top };
};
IE.spawnBoat = function (scene, defId, x, z, yaw) {
  const def = IE.boatById[defId], m = IE.makeBoat(def);
  if (def.pack) try { IE.decorateBoat(m, def); } catch (e) { }
  const v = { type: 'boat', def, m, group: m.group, pos: new T.Vector3(x, 0, z), yaw: yaw || 0, speed: 0, steer: 0, pitch: 0, roll: 0,
    health: def.kind === 'yacht' ? 3000 : def.kind === 'sub' ? 2000 : 900, maxHealth: def.kind === 'yacht' ? 3000 : def.kind === 'sub' ? 2000 : 900, driver: null, dead: false, burn: 0, t: Math.random() * 10, depth: 0, pitch: 0, roll: 0 };
  m.group.position.copy(v.pos); scene.add(m.group); IE.vehicles.push(v); return v;
};
IE.updateBoat = function (v, inp, dt) {
  const d = v.def; if (v.dead) inp = {};
  v.t += dt;
  if (d.kind === 'sub' && !v.dead) {
    const thr = inp.y || 0, st = inp.x || 0;
    if (thr > 0) v.speed += d.accel * thr * (1 - Math.max(0, v.speed) / d.speed * 0.7) * dt;
    else if (thr < 0) v.speed = Math.max(-8, v.speed + 10 * thr * dt);
    v.speed -= v.speed * 0.4 * dt;
    v.steer += (st - v.steer) * Math.min(1, dt * 5);
    const as = Math.abs(v.speed);
    v.yaw -= v.steer * Math.sign(v.speed) * Math.min(as / 3, 1) * 0.9 * dt;
    v.depth = Math.max(-26, Math.min(0, (v.depth || 0) + (inp.dive || 0) * 6 * dt));
    const f = IE.fwd(v.yaw), nx = v.pos.x + f.x * v.speed * dt, nz = v.pos.z + f.z * v.speed * dt;
    const floor = IE.terrainH(nx, nz);
    const ahead = IE.terrainH(nx + f.x * 7 * Math.sign(v.speed || 1), nz + f.z * 7 * Math.sign(v.speed || 1));
    const targetY = Math.max(floor + 1.6, v.depth);
    if (ahead > targetY + 0.3 && (v.depth > -1.2 || ahead > -0.6)) { if (as > 6) v.health -= as * 3; v.speed *= -0.3; }
    else { v.pos.x = nx; v.pos.z = nz; }
    v.pos.y = Math.max(floor + 1.6, v.depth) + (v.depth > -0.3 ? Math.sin(v.t * 1.7) * 0.06 : 0);
    v.pitch += ((inp.dive || 0) * -0.18 - v.pitch) * Math.min(1, dt * 3);
    v.roll += (v.steer * Math.min(as / 10, 1) * 0.12 - v.roll) * Math.min(1, dt * 3);
    if (v.m.prop) v.m.prop.rotation.x += (0.3 + as * 0.2) * dt * 12;
    v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.set(0, v.yaw, 0); v.group.rotation.x = v.pitch; v.group.rotation.z = v.roll;
    v.submerged = v.depth < -1;
    return;
  }
  const thr = inp.y || 0, st = inp.x || 0;
  if (thr > 0) v.speed += d.accel * thr * (1 - Math.max(0, v.speed) / d.speed * 0.7) * dt;
  else if (thr < 0) v.speed = Math.max(-6, v.speed + 10 * thr * dt);
  v.speed -= v.speed * (inp.brake ? 1.8 : 0.45) * dt;
  v.steer += (st - v.steer) * Math.min(1, dt * 5);
  const as = Math.abs(v.speed);
  v.yaw -= v.steer * Math.sign(v.speed) * Math.min(as / 3, 1) * (d.kind === 'yacht' ? 0.45 : d.kind === 'jetski' ? 1.6 : 1.0) * dt;
  const f = IE.fwd(v.yaw), nx = v.pos.x + f.x * v.speed * dt, nz = v.pos.z + f.z * v.speed * dt;
  const ahead = IE.terrainH(nx + f.x * v.m.L * 0.5 * Math.sign(v.speed || 1), nz + f.z * v.m.L * 0.5 * Math.sign(v.speed || 1));
  if (ahead > -0.6) { if (as > 6) v.health -= as * 8; v.speed *= -0.3; }
  else { v.pos.x = nx; v.pos.z = nz; }
  if (IE.pushOut(v.pos, Math.min(v.m.W * 0.6, 3), -0.5, 2)) { if (as > 6) v.health -= as * 5; v.speed *= -0.3; }
  const bob = Math.sin(v.t * 1.7) * 0.08 + Math.sin(v.t * 2.9) * 0.04;
  v.pos.y = (v.dead ? Math.max(-6, v.pos.y - dt * 0.6) : 0.05 + bob);
  v.pitch += ((-Math.min(as / d.speed, 1) * 0.12) + Math.sin(v.t * 1.3) * 0.02 - v.pitch) * Math.min(1, dt * 3);
  v.roll += (v.steer * Math.min(as / 10, 1) * 0.15 + Math.sin(v.t * 1.1) * 0.03 - v.roll) * Math.min(1, dt * 3);
  v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.y = v.yaw; v.group.rotation.x = v.pitch; v.group.rotation.z = v.roll;
};

// ---------- Flugzeuge ----------
IE.makePlane = function (def) {
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const bm = new T.MeshStandardMaterial({ color: def.color, metalness: 0.4, roughness: 0.35 }), am = new T.MeshStandardMaterial({ color: def.accent, metalness: 0.3, roughness: 0.4 }), dk = lam(0x222222);
  const mesh = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const k = def.kind; let prop = null, L, W, gearH;
  const fus = (len, r0, r1) => { const c = new T.CylinderGeometry(r1, r0, len, 14); c.rotateZ(-Math.PI / 2); return c; };
  if (k === 'sleigh') {
    // Rentierschlitten: roter Schlitten mit goldenen Kufen, Geschenkesack und 8 Rentieren
    L = 18; W = 5; gearH = 0.5;
    const red = bm, gold = am, brown = lam(0x7a4a26), dark = lam(0x3a2414), white = lam(0xf4f4f0);
    mesh(new T.BoxGeometry(3.6, 1.1, 2.0), red, 0, gearH + 0.9, 0);
    mesh(new T.BoxGeometry(1.2, 1.9, 2.0), red, -1.4, gearH + 1.3, 0);
    const curl = mesh(new T.TorusGeometry(0.5, 0.18, 8, 16, Math.PI), red, 1.9, gearH + 1.3, 0); curl.rotation.y = Math.PI / 2;
    mesh(new T.BoxGeometry(3.7, 0.12, 2.05), gold, 0, gearH + 1.48, 0);
    for (const sz of [-1, 1]) { mesh(new T.BoxGeometry(4.6, 0.12, 0.14), gold, 0.2, 0.1, sz * 0.9); const tip = mesh(new T.TorusGeometry(0.35, 0.07, 6, 12, Math.PI), gold, 2.5, 0.45, sz * 0.9); tip.rotation.z = -Math.PI / 2; for (const sx of [-1.2, 1.0]) mesh(new T.BoxGeometry(0.1, 0.5, 0.1), gold, sx, 0.4, sz * 0.9); }
    const sack = mesh(new T.SphereGeometry(0.75, 12, 10), brown, -1.3, gearH + 2.3, 0); sack.scale.set(1, 1.2, 1);
    for (const [gx, gz, c] of [[-0.6, 0.5, 0x2e8b57], [-0.5, -0.5, 0x1f4fb0], [-1.9, 0.4, 0xd6b04a]]) mesh(new T.BoxGeometry(0.5, 0.5, 0.5), lam(c), gx, gearH + 1.75, gz);
    // 4 Paare Rentiere vor dem Schlitten
    for (let r = 0; r < 4; r++) for (const sz of [-0.55, 0.55]) {
      const x = 4.5 + r * 2.6, y = gearH + 1.2;
      mesh(new T.BoxGeometry(1.5, 0.7, 0.55), brown, x, y, sz);
      mesh(new T.BoxGeometry(0.3, 0.75, 0.3), brown, x + 0.85, y + 0.45, sz);
      mesh(new T.BoxGeometry(0.55, 0.35, 0.35), brown, x + 1.15, y + 0.8, sz);
      mesh(new T.SphereGeometry(0.12, 8, 6), r === 3 ? new T.MeshBasicMaterial({ color: 0xff2020 }) : dark, x + 1.45, y + 0.78, sz);
      for (const a of [-1, 1]) { const an = mesh(new T.BoxGeometry(0.06, 0.55, 0.06), lam(0xd8c8a0), x + 1.0, y + 1.2, sz + a * 0.15); an.rotation.x = a * 0.5; }
      for (const lx of [-0.55, 0.55]) mesh(new T.BoxGeometry(0.14, 0.9, 0.14), dark, x + lx, y - 0.75, sz);
      mesh(new T.BoxGeometry(0.2, 0.2, 0.2), white, x - 0.8, y + 0.15, sz);
    }
    for (const sz of [-0.55, 0.55]) mesh(new T.BoxGeometry(9, 0.05, 0.05), gold, 5.8, gearH + 1.3, sz);
  } else if (k === 'prop' || k === 'stunt' || k === 'sea') {
    L = 8; W = 11; gearH = k === 'sea' ? 1.6 : 1.2;
    mesh(fus(7, 0.75, 0.35), bm, -0.6, gearH + 0.6, 0);
    const nose = mesh(new T.SphereGeometry(0.75, 12, 10), bm, 2.9, gearH + 0.6, 0); nose.scale.x = 0.8;
    mesh(new T.BoxGeometry(1.7, 0.6, 1.1), glassMat, 1.4, gearH + 1.25, 0);
    mesh(new T.BoxGeometry(1.6, 0.14, k === 'stunt' ? 8.5 : 11), bm, 1.0, k === 'stunt' ? gearH + 0.25 : gearH + 1.55, 0);
    mesh(new T.BoxGeometry(1.0, 0.16, 11.04), am, 0.95, k === 'stunt' ? gearH + 0.26 : gearH + 1.56, 0).scale.set(0.3, 1, 1);
    mesh(new T.BoxGeometry(0.9, 0.1, 3.4), bm, -3.8, gearH + 0.7, 0);
    mesh(new T.BoxGeometry(1.1, 1.4, 0.1), am, -3.9, gearH + 1.3, 0);
    prop = new T.Group(); prop.position.set(3.55, gearH + 0.6, 0); g.add(prop);
    for (let i = 0; i < 2; i++) { const b = new T.Mesh(new T.BoxGeometry(0.06, 2.2, 0.18), dk); b.rotation.x = i * Math.PI / 2; prop.add(b); }
    if (k === 'sea') for (const sz of [-1, 1]) { mesh(fus(5, 0.3, 0.25), am, 0.4, 0.35, sz * 1.4); mesh(new T.BoxGeometry(0.1, 1.1, 0.1), dk, 0.8, 0.95, sz * 1.2); }
    else { for (const sz of [-1, 1]) { mesh(new T.CylinderGeometry(0.32, 0.32, 0.2, 10).rotateX(Math.PI / 2), dk, 1.2, 0.32, sz * 1.1); mesh(new T.BoxGeometry(0.1, 0.9, 0.1), dk, 1.2, 0.8, sz * 0.9); } mesh(new T.CylinderGeometry(0.22, 0.22, 0.15, 8).rotateX(Math.PI / 2), dk, -3.3, 0.6, 0); }
  } else if (k === 'jet') {
    L = 17; W = 15; gearH = 1.4;
    mesh(fus(14, 1.3, 0.6), bm, -1, gearH + 1.3, 0);
    const nose = mesh(new T.SphereGeometry(1.3, 14, 10), bm, 6, gearH + 1.3, 0); nose.scale.x = 1.8;
    mesh(new T.BoxGeometry(1.2, 0.4, 2.2), glassMat, 7.2, gearH + 1.9, 0);
    for (let i = 0; i < 6; i++) mesh(new T.BoxGeometry(0.4, 0.3, 0.05), glassMat, 4 - i * 1.4, gearH + 1.7, 1.28).scale.z = 1;
    for (let i = 0; i < 6; i++) mesh(new T.BoxGeometry(0.4, 0.3, 0.05), glassMat, 4 - i * 1.4, gearH + 1.7, -1.28);
    for (const sz of [-1, 1]) { const wg = mesh(new T.BoxGeometry(2.6, 0.2, 7), bm, 0, gearH + 0.8, sz * 4.4); wg.rotation.y = sz * 0.35; mesh(fus(3, 0.5, 0.45), am, -5.5, gearH + 1.9, sz * 1.6); }
    mesh(new T.BoxGeometry(2, 3, 0.15), am, -7.4, gearH + 3, 0); mesh(new T.BoxGeometry(1.4, 0.15, 5), bm, -7.9, gearH + 4.4, 0);
    for (const [gx, gz] of [[4.5, 0], [-0.5, 1.4], [-0.5, -1.4]]) { mesh(new T.CylinderGeometry(0.4, 0.4, 0.3, 10).rotateX(Math.PI / 2), dk, gx, 0.4, gz); mesh(new T.BoxGeometry(0.15, 1.2, 0.15), dk, gx, 1, gz); }
  } else if (k === 'burger') {
    // Fliegender Burger: gestapelte Scheiben, Flügel, Heckflosse, Raketen unter den Flügeln
    L = 9; W = 13; gearH = 1.2;
    const bun = new T.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.1, roughness: 0.8 });
    const meat = lam(0x5a3418), cheese = lam(0xf2a93b), salad = lam(0x5fae3a), tomato = lam(0xcf3324), seed = lam(0xf5ecd0);
    const yb = gearH + 0.6;
    // untere Brötchenhälfte
    const bot = mesh(new T.SphereGeometry(3.0, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bun, 0, yb + 0.5, 0); bot.scale.y = 0.55;
    mesh(new T.CylinderGeometry(3.0, 2.9, 0.5, 20), bun, 0, yb + 0.55, 0);
    // Fleisch-Patty
    mesh(new T.CylinderGeometry(3.15, 3.15, 0.55, 20), meat, 0, yb + 0.95, 0);
    // Käse (Quadrat, Ecken schauen raus)
    const ch = mesh(new T.BoxGeometry(4.6, 0.16, 4.6), cheese, 0, yb + 1.28, 0); ch.rotation.y = Math.PI / 4;
    // Salat
    mesh(new T.CylinderGeometry(3.35, 3.35, 0.4, 24), salad, 0, yb + 1.5, 0);
    // Tomate
    mesh(new T.CylinderGeometry(2.9, 2.9, 0.32, 18), tomato, 0, yb + 1.78, 0);
    // obere Brötchenkuppel
    const top = mesh(new T.SphereGeometry(3.0, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), bun, 0, yb + 1.95, 0); top.scale.y = 0.75;
    // Sesamkörner
    for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = 0.6 + (i % 3) * 0.7, hy = Math.cos(rr / 3 * Math.PI / 2); mesh(new T.SphereGeometry(0.13, 6, 5), seed, Math.cos(a) * rr, yb + 1.95 + hy * 1.7, Math.sin(a) * rr).scale.y = 0.6; }
    // Flügel (seitlich), Querruder-Akzent
    mesh(new T.BoxGeometry(2.8, 0.22, 13), am, -0.3, yb + 0.7, 0);
    for (const sz of [-1, 1]) mesh(new T.BoxGeometry(2.8, 0.26, 0.5), bm, -0.3, yb + 0.7, sz * 6.2);
    // Heckausleger + Höhen-/Seitenleitwerk
    mesh(new T.BoxGeometry(3.4, 0.5, 0.6), meat, -4.0, yb + 0.8, 0);
    mesh(new T.BoxGeometry(1.4, 1.8, 0.14), am, -5.3, yb + 1.5, 0);
    mesh(new T.BoxGeometry(1.2, 0.14, 3.2), am, -5.2, yb + 0.85, 0);
    // Cockpit vorne oben
    const cp = mesh(new T.SphereGeometry(0.8, 12, 8), glassMat, 2.1, yb + 2.0, 0); cp.scale.set(1.4, 0.8, 1.0);
    // Raketen unter den Flügeln (Optik)
    for (const sz of [-1, 1]) { mesh(new T.CylinderGeometry(0.22, 0.22, 2.0, 10).rotateZ(Math.PI / 2), lam(0xe8e8e2), 0.2, yb + 0.1, sz * 3.6); const tip = new T.ConeGeometry(0.22, 0.6, 10); tip.rotateZ(-Math.PI / 2); mesh(tip, lam(0xc8372d), 1.3, yb + 0.1, sz * 3.6); }
    // Fahrwerk
    for (const [gx, gz] of [[2.6, 0], [-1.6, 2.0], [-1.6, -2.0]]) { mesh(new T.CylinderGeometry(0.4, 0.4, 0.3, 10).rotateX(Math.PI / 2), dk, gx, 0.4, gz); mesh(new T.BoxGeometry(0.16, 1.0, 0.16), dk, gx, 0.9, gz); }
    return { group: outer, L, W, H: gearH + 4, bodyMat: bm, prop: null, gearH, inner: g };
  } else if (k === 'cargo') {
    // Airbus A400M – graues Transportflugzeug: dicker Rumpf, Hochdecker, 4 Turboprops, T-Leitwerk, Heckrampe
    L = 20; W = 24; gearH = 2.2;
    const grey = bm, dark = am, metal = lam(0x9aa0a6), tire = dk;
    const yb = gearH + 1.9;
    mesh(fus(17, 1.9, 1.3), grey, -1.5, yb, 0);
    const nose = mesh(new T.SphereGeometry(1.9, 16, 12), grey, 7.0, yb, 0); nose.scale.set(1.4, 1, 1);
    const tail = mesh(fus(5.5, 1.3, 0.55), grey, -9.6, yb + 1.3, 0); tail.rotation.z = -0.32;
    // Cockpit
    mesh(new T.BoxGeometry(1.5, 0.7, 2.3), glassMat, 6.0, yb + 1.15, 0);
    for (const sz of [-1, 1]) mesh(new T.BoxGeometry(1.1, 0.55, 0.08), glassMat, 6.7, yb + 0.85, sz * 1.15);
    // Heckrampe (dunkel, angeschrägt)
    mesh(new T.BoxGeometry(3.2, 0.25, 2.6), dark, -11.4, gearH + 0.7, 0).rotation.z = 0.4;
    // Hochliegender Flügel
    mesh(new T.BoxGeometry(5.2, 0.5, 23), grey, -0.5, yb + 1.95, 0);
    mesh(new T.BoxGeometry(1.3, 0.18, 23.1), dark, -2.7, yb + 2.0, 0);
    // T-Leitwerk
    mesh(new T.BoxGeometry(2.2, 4.4, 0.5), grey, -10.9, yb + 3.4, 0);
    mesh(new T.BoxGeometry(2.4, 0.42, 9), grey, -11.3, yb + 5.4, 0);
    // 4 Turboprops auf dem Flügel
    const props = [];
    for (const zz of [-8.4, -4.3, 4.3, 8.4]) {
      mesh(fus(4.2, 0.72, 0.5), metal, 1.1, yb + 1.75, zz);
      const p = new T.Group(); p.position.set(3.5, yb + 1.75, zz); g.add(p);
      const spin = new T.Mesh(new T.ConeGeometry(0.42, 0.95, 12), dark); spin.rotation.z = -Math.PI / 2; spin.position.x = 0.15; p.add(spin);
      for (let b = 0; b < 6; b++) { const bl = new T.Mesh(new T.BoxGeometry(0.08, 3.0, 0.34), lam(0x15151a)); bl.rotation.x = b * Math.PI / 3; p.add(bl); }
      props.push(p);
    }
    // Fahrwerk (Bugrad + mehrere Hauptfahrwerke)
    for (const [gx, gz] of [[6, 0], [-3, 2.0], [-3, -2.0], [-6, 2.0], [-6, -2.0]]) { mesh(new T.CylinderGeometry(0.5, 0.5, 0.4, 10).rotateX(Math.PI / 2), tire, gx, 0.5, gz); mesh(new T.BoxGeometry(0.22, 1.7, 0.22), tire, gx, 1.35, gz); }
    return { group: outer, L, W, H: yb + 6, bodyMat: bm, prop: null, props, gearH, inner: g, hold: true };
  } else if (k === 'spyjet') {
    // Lockheed SR-71 Blackbird – schlanker schwarzer Überschalljet mit Chines, 2 Triebwerksgondeln, 2 geneigten Leitwerken
    L = 24; W = 17; gearH = 1.3;
    const blk = bm, red = lam(0xb0222a), metal = lam(0x26262c);
    const yb = gearH + 1.0;
    mesh(fus(15, 0.95, 0.55), blk, -2, yb, 0);
    const nc = new T.ConeGeometry(0.9, 8, 14); nc.rotateZ(-Math.PI / 2); mesh(nc, blk, 9.3, yb, 0);
    // Chines (flache Rumpfkanten)
    for (const sz of [-1, 1]) mesh(new T.BoxGeometry(15, 0.14, 1.1), blk, 2.5, yb, sz * 1.0);
    mesh(new T.BoxGeometry(1.0, 0.45, 1.2), glassMat, 5.0, yb + 0.7, 0);
    // Delta-Flügel
    const ws = new T.Shape(); ws.moveTo(3, 0); ws.lineTo(-7, 7.5); ws.lineTo(-8.5, 7.5); ws.lineTo(-7.5, 0); ws.lineTo(-8.5, -7.5); ws.lineTo(-7, -7.5); ws.closePath();
    const wg = new T.ExtrudeGeometry(ws, { depth: 0.22, bevelEnabled: false }); wg.rotateX(Math.PI / 2); mesh(wg, blk, -1, yb - 0.1, 0);
    // 2 große Triebwerksgondeln mit Einlass-Spitzkegeln, Nachbrenner-Glühen, geneigte Leitwerke
    for (const sz of [-1, 1]) {
      mesh(fus(8, 1.05, 0.9), metal, -1.5, yb, sz * 3.6);
      const inlet = new T.ConeGeometry(0.72, 1.8, 14); inlet.rotateZ(-Math.PI / 2); mesh(inlet, dk, 3.2, yb, sz * 3.6);
      mesh(new T.CylinderGeometry(0.95, 0.95, 0.5, 16).rotateZ(Math.PI / 2), lam(0xff5a20), -5.7, yb, sz * 3.6);
      const fin = mesh(new T.BoxGeometry(2.2, 2.7, 0.2), blk, -4.6, yb + 1.7, sz * 3.6); fin.rotation.x = sz * 0.32;
    }
    for (const sz of [-1, 1]) mesh(new T.BoxGeometry(11, 0.06, 0.06), red, 1, yb + 0.5, sz * 0.5);
    for (const [gx, gz] of [[6, 0], [-2, 3.6], [-2, -3.6]]) { mesh(new T.CylinderGeometry(0.34, 0.34, 0.3, 10).rotateX(Math.PI / 2), dk, gx, 0.4, gz); mesh(new T.BoxGeometry(0.14, 1.0, 0.14), dk, gx, 0.9, gz); }
    return { group: outer, L, W, H: yb + 3, bodyMat: bm, prop: null, gearH, inner: g };
  } else {
    L = 15; W = 10; gearH = 1.3;
    mesh(fus(11, 1.0, 0.8), bm, -1, gearH + 1.0, 0);
    const nc = new T.ConeGeometry(1.0, 4, 14); nc.rotateZ(-Math.PI / 2); mesh(nc, bm, 6.5, gearH + 1.0, 0);
    const cp = mesh(new T.SphereGeometry(0.75, 12, 8), glassMat, 3.2, gearH + 1.7, 0); cp.scale.set(2.2, 0.8, 0.9);
    const ws = new T.Shape(); ws.moveTo(2.5, 0); ws.lineTo(-4.5, 5); ws.lineTo(-5.5, 5); ws.lineTo(-5, 0); ws.lineTo(-5.5, -5); ws.lineTo(-4.5, -5); ws.closePath();
    const wg = new T.ExtrudeGeometry(ws, { depth: 0.18, bevelEnabled: false }); wg.rotateX(Math.PI / 2); mesh(wg, bm, 0, gearH + 0.9, 0);
    for (const sz of [-1, 1]) { const f = mesh(new T.BoxGeometry(2, 2.4, 0.12), am, -5.2, gearH + 2.3, sz * 0.9); f.rotation.x = sz * 0.25; mesh(new T.CylinderGeometry(0.15, 0.15, 3, 6).rotateZ(Math.PI / 2), dk, -1, gearH + 0.6, sz * 3.2); }
    mesh(new T.CylinderGeometry(0.7, 0.8, 0.8, 12).rotateZ(Math.PI / 2), dk, -6.9, gearH + 1.0, 0);
    for (const [gx, gz] of [[3.5, 0], [-1.5, 1.5], [-1.5, -1.5]]) { mesh(new T.CylinderGeometry(0.35, 0.35, 0.25, 10).rotateX(Math.PI / 2), dk, gx, 0.35, gz); mesh(new T.BoxGeometry(0.12, 1.1, 0.12), dk, gx, 0.9, gz); }
  }
  return { group: outer, L, W, H: gearH + 2, bodyMat: bm, prop, gearH, inner: g };
};
IE.spawnPlane = function (scene, defId, x, z, yaw, y) {
  const def = IE.planeById[defId], m = IE.makePlane(def);
  if (def.glider && IE.gliderPaint && IE.gliderPaint[defId] !== undefined && m.bodyMat) m.bodyMat.color.setHex(IE.gliderPaint[defId]);
  if (def.pack) try { IE.decoratePlane(m, def); } catch (e) { }
  const v = { type: 'plane', def, m, group: m.group, pos: new T.Vector3(x, y !== undefined ? y : IE.supportH(x, z, 999), z), yaw: yaw || 0, pitch: 0, roll: 0, speed: 0, throttle: 0, vy: 0,
    health: def.kind === 'jet' ? 2500 : 1500, maxHealth: def.kind === 'jet' ? 2500 : 1500, driver: null, dead: false, burn: 0, onGround: true };
  m.group.position.copy(v.pos); m.group.rotation.y = v.yaw; scene.add(m.group); IE.vehicles.push(v); return v;
};
IE.planeGround = function (v) {
  const g = IE.supportH(v.pos.x, v.pos.z, v.pos.y + 1.5);
  if (g < -0.3) return v.def.kind === 'sea' ? 0 : g;
  return g;
};
IE.updatePlane = function (v, inp, dt) {
  const d = v.def, piloted = !!v.driver && !v.dead;
  if (piloted) v.throttle = Math.max(0, Math.min(1, v.throttle + (inp.up || 0) * 0.45 * dt)); else v.throttle = Math.max(0, v.throttle - dt);
  const g = IE.planeGround(v);
  const onG = v.pos.y <= g + 0.08;
  const target = v.throttle * d.speed * (1 - 0.45 * Math.max(0, Math.sin(v.pitch)));
  v.speed += (target - v.speed) * (target > v.speed ? (d.kind === 'fighter' ? 0.45 : 0.3) : 0.12) * dt;
  if (onG) {
    if (v.throttle < 0.05 || inp.brake) v.speed = Math.max(0, v.speed - (inp.brake ? 14 : 3) * dt);
    v.yaw -= (inp.x || 0) * 0.9 * dt * Math.min(v.speed / 4, 1);
    v.roll += (0 - v.roll) * Math.min(1, dt * 6);
    if ((inp.y || 0) > 0.2 && v.speed > d.minSpeed) v.pitch = Math.min(0.35, v.pitch + 0.6 * dt); else v.pitch += (0 - v.pitch) * Math.min(1, dt * 4);
    if (v.speed < d.minSpeed && v.pitch > 0) v.pitch = Math.max(0, v.pitch - dt);
  } else {
    const turn = d.turn;
    const canRoll = d.kind === 'stunt' || d.kind === 'fighter' || d.kind === 'spyjet';
    if (canRoll) v.roll += (inp.x || 0) * 2.6 * turn * 0.6 * dt;
    else { const base = Math.abs(inp.y || 0) > 0.2 ? Math.round(v.roll / Math.PI) * Math.PI : Math.round(v.roll / (Math.PI * 2)) * Math.PI * 2; v.roll += (base + (inp.x || 0) * 0.9 - v.roll) * Math.min(1, dt * 1.8); }
    if (!(inp.x) && canRoll) { const b = Math.abs(inp.y || 0) > 0.2 ? Math.round(v.roll / Math.PI) * Math.PI : Math.round(v.roll / (Math.PI * 2)) * Math.PI * 2; v.roll += (b - v.roll) * Math.min(1, dt * 1.2); }
    const cr = Math.cos(v.roll);
    v.pitch += (inp.y || 0) * 0.8 * turn * cr * dt;
    v.yaw -= Math.sin(v.roll) * 0.75 * turn * Math.min(v.speed / d.minSpeed, 1.6) * dt * Math.sign(cr || 1) * (cr < 0 ? -1 : 1);
    v.yaw += (inp.y || 0) * 0.8 * turn * Math.sin(v.roll) * dt * 0;
    // Looping: über die Senkrechte hinaus -> gleiche Lage anders ausgedrückt (Kurs +180°, Rolle +180°)
    if (v.pitch > Math.PI / 2 || v.pitch < -Math.PI / 2) { v.pitch = (v.pitch > 0 ? Math.PI : -Math.PI) - v.pitch; v.yaw += Math.PI; v.roll += Math.PI; }
    if (v.roll > Math.PI * 2) v.roll -= Math.PI * 2; if (v.roll < -Math.PI * 2) v.roll += Math.PI * 2;
    v.speed -= Math.sin(v.pitch) * 9.8 * 0.6 * dt;
    if (v.speed < d.minSpeed) { v.pitch -= (1 - v.speed / d.minSpeed) * 0.9 * dt; }
  }
  v.speed = Math.max(0, v.speed);
  const cp = Math.cos(v.pitch), sink = (!onG && v.speed < d.minSpeed) ? -(1 - v.speed / d.minSpeed) * 18 : 0;
  const vy = Math.sin(v.pitch) * v.speed + sink;
  v.pos.x += Math.sin(v.yaw) * cp * v.speed * dt; v.pos.z += Math.cos(v.yaw) * cp * v.speed * dt; v.pos.y += vy * dt;
  if (onG && vy <= 0) v.pos.y = g;
  if (v.pos.y > 1500) { v.pos.y = 1500; v.pitch = Math.min(v.pitch, 0); }
  const g2 = IE.planeGround(v);
  if (v.pos.y < g2) {
    const soft = v.pitch > -0.35 && vy > -10 && Math.abs(Math.sin(v.roll)) < 0.5 && Math.cos(v.roll) > 0;
    if (!soft && !v.dead) v.health = 0;
    v.pos.y = g2; v.pitch = Math.max(v.pitch, 0); v.roll = 0; if (v.pitch > 0.6) v.pitch = 0.35;
  }
  if (g2 < -0.3 && d.kind !== 'sea' && v.pos.y < 0.4) { v.health -= 400 * dt; v.speed *= 0.9; }
  if (IE.pushOut(v.pos, Math.min(3, v.m.L * 0.2), v.pos.y, 2.5)) { if (v.speed > 14) v.health = 0; else v.speed *= -0.2; }
  v.onGround = v.pos.y <= g2 + 0.1;
  if (v.m.prop) v.m.prop.rotation.x += (0.2 + v.throttle) * dt * 50;
  if (v.m.props) for (const pr of v.m.props) pr.rotation.x += (0.2 + v.throttle) * dt * 50;
  v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.y = v.yaw; v.group.rotation.x = -v.pitch; v.group.rotation.z = v.roll;
};

// ---------- Flug-Yacht (Admin) ----------
// Gruppen-Koordinaten: vorne = +z, Deck auf y = 0
IE.AIRSHIP = { L: 64, W: 16, cabinZ0: -32 + 3, cabinZ1: -32 + 19, cabinX: 6.5, helmZ: -32 + 21 };
IE.makeAirship = function () {
  const A = IE.AIRSHIP, outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const L = A.L, W = A.W;
  const sh = new T.Shape(); sh.moveTo(-L / 2, -W / 2); sh.lineTo(L * 0.18, -W / 2); sh.quadraticCurveTo(L * 0.45, -W * 0.38, L / 2, 0); sh.quadraticCurveTo(L * 0.45, W * 0.38, L * 0.18, W / 2); sh.lineTo(-L / 2, W / 2); sh.closePath();
  const hullG = new T.ExtrudeGeometry(sh, { depth: 7, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 3 }); hullG.rotateX(-Math.PI / 2); hullG.translate(0, -7.3, 0);
  const white = new T.MeshStandardMaterial({ color: 0xf4f2ec, metalness: 0.3, roughness: 0.35 }), navy = new T.MeshStandardMaterial({ color: 0x14284a, metalness: 0.4, roughness: 0.3 }), gold = IE.mat.gold;
  const hull = new T.Mesh(hullG, white); hull.castShadow = true; g.add(hull);
  const band = new T.Mesh(hullG, navy); band.scale.set(1.004, 0.16, 1.01); band.position.y = -1.2; g.add(band);
  const deckG = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); deckG.rotateX(-Math.PI / 2); deckG.translate(0, -0.3, 0);
  const deckTex = IE.canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#9a6a3c'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, 0, 1, h); } for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(((Math.random() * 8) | 0) * 8, Math.random() * h, 8, 1); } }, [6, 2]);
  const deck = new T.Mesh(deckG, new T.MeshLambertMaterial({ map: deckTex })); deck.scale.set(0.985, 1, 0.94); deck.position.y = 0.32; deck.receiveShadow = true; g.add(deck);
  // Reling
  const rail = new T.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.8, roughness: 0.2 });
  const pts = sh.getPoints(40);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 0.1) continue;
    const r = new T.Mesh(new T.BoxGeometry(len, 0.08, 0.08), rail); r.position.set((a.x + b.x) / 2 * 0.985, 1.25, -(a.y + b.y) / 2 * 0.94); r.rotation.y = Math.atan2(b.y - a.y, b.x - a.x); g.add(r);
    if (i % 2 === 0) { const p = new T.Mesh(new T.BoxGeometry(0.08, 1.25, 0.08), rail); p.position.set(a.x * 0.985, 0.62, -a.y * 0.94); g.add(p); }
  }
  // Kommandobrücke (hinten)
  const cab = new T.Mesh(new T.BoxGeometry(A.cabinZ1 - A.cabinZ0, 4.2, A.cabinX * 2), white); cab.position.set((A.cabinZ0 + A.cabinZ1) / 2, 2.1, 0); cab.castShadow = true; g.add(cab);
  const win = new T.Mesh(new T.BoxGeometry(A.cabinZ1 - A.cabinZ0 + 0.1, 1.3, A.cabinX * 2 + 0.1), new T.MeshStandardMaterial({ color: 0x1c2630, metalness: 0.7, roughness: 0.15 })); win.position.set((A.cabinZ0 + A.cabinZ1) / 2, 2.6, 0); g.add(win);
  const top = new T.Mesh(new T.BoxGeometry(9, 2.6, 9), white); top.position.set(A.cabinZ0 + 6, 5.5, 0); g.add(top);
  const topW = new T.Mesh(new T.BoxGeometry(9.1, 0.9, 9.1), win.material); topW.position.set(A.cabinZ0 + 6, 5.8, 0); g.add(topW);
  const mast = new T.Mesh(new T.CylinderGeometry(0.15, 0.2, 6, 8), rail); mast.position.set(A.cabinZ0 + 6, 9.5, 0); g.add(mast);
  const flag = IE.canvasTex(96, 64, (c, w, h) => { c.fillStyle = '#009246'; c.fillRect(0, 0, w / 3, h); c.fillStyle = '#f1f2f1'; c.fillRect(w / 3, 0, w / 3, h); c.fillStyle = '#ce2b37'; c.fillRect(2 * w / 3, 0, w / 3, h); });
  const fl = new T.Mesh(new T.PlaneGeometry(2.4, 1.6), new T.MeshBasicMaterial({ map: flag, side: T.DoubleSide })); fl.position.set(A.cabinZ0 + 4.8, 11.6, 0); fl.rotation.y = Math.PI / 2; g.add(fl);
  // Steuerrad
  const helmBase = new T.Mesh(new T.CylinderGeometry(0.3, 0.45, 1.1, 10), navy); helmBase.position.set(A.helmZ, 0.85, 0); g.add(helmBase);
  const wheel = new T.Mesh(new T.TorusGeometry(0.55, 0.06, 6, 16), gold); wheel.position.set(A.helmZ + 0.2, 1.55, 0); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  // Pool & Liegen vorne
  const pool = new T.Mesh(new T.BoxGeometry(8, 0.1, 5), new T.MeshStandardMaterial({ color: 0x3fb8d8, metalness: 0.1, roughness: 0.1, emissive: 0x0a3a48 })); pool.position.set(6, 0.42, 0); g.add(pool);
  for (const z of [-4.5, 4.5]) for (const x of [0, 3, 12]) { const l = new T.Mesh(new T.BoxGeometry(2, 0.4, 0.8), new T.MeshLambertMaterial({ color: 0xf0ece0 })); l.position.set(x, 0.55, z); g.add(l); }
  // Triebwerke
  const glow = new T.MeshBasicMaterial({ color: 0x66e0ff }), fans = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pod = new T.Group(); pod.position.set(sx * 18, -3.5, sz * (W / 2 + 2.6)); g.add(pod);
    const c = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 1.6, 20, 1, true), navy); c.material = navy; pod.add(c);
    const ring = new T.Mesh(new T.TorusGeometry(2.2, 0.18, 6, 24), glow); ring.rotation.x = Math.PI / 2; pod.add(ring);
    const fan = new T.Group(); for (let i = 0; i < 4; i++) { const b = new T.Mesh(new T.BoxGeometry(3.8, 0.06, 0.5), rail); b.rotation.y = i * Math.PI / 4; fan.add(b); } pod.add(fan); fans.push(fan);
    const arm = new T.Mesh(new T.BoxGeometry(1, 0.6, 2.8), white); arm.position.set(0, 0.4, -sz * 2); pod.add(arm);
  }
  const under = new T.Mesh(new T.PlaneGeometry(L * 0.7, W * 0.7), new T.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.35, side: T.DoubleSide })); under.rotation.x = Math.PI / 2; under.position.y = -7.8; g.add(under);
  return { group: outer, L, W, H: 8, bodyMat: white, fans, airship: true };
};

// ---------- Helikopter ----------
IE.makeHeli = function (color, armed) {
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const bm = new T.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 });
  const body = new T.Mesh(new T.SphereGeometry(1, 20, 14), bm); body.scale.set(2.3, 1.25, 1.25); body.position.set(0.3, 1.55, 0); body.castShadow = true; g.add(body);
  const cock = new T.Mesh(new T.SphereGeometry(1, 16, 12, 0, Math.PI, 0, Math.PI), glassMat); cock.scale.set(1.25, 1.05, 1.15); cock.rotation.y = Math.PI / 2; cock.position.set(1.15, 1.75, 0); g.add(cock);
  const boom = new T.Mesh(new T.CylinderGeometry(0.18, 0.38, 5.4, 10), bm); boom.rotation.z = Math.PI / 2; boom.position.set(-3.6, 1.85, 0); boom.castShadow = true; g.add(boom);
  const fin = new T.Mesh(new T.BoxGeometry(0.9, 1.4, 0.1), bm); fin.position.set(-6.1, 2.4, 0); fin.rotation.z = 0.35; g.add(fin);
  const stab = new T.Mesh(new T.BoxGeometry(0.6, 0.06, 1.8), bm); stab.position.set(-5.4, 1.9, 0); g.add(stab);
  const tr = new T.Group(); tr.position.set(-6.2, 2.5, 0.16); g.add(tr);
  for (let i = 0; i < 2; i++) { const b = new T.Mesh(new T.BoxGeometry(0.12, 1.3, 0.04), lam(0x222222)); b.rotation.z = i * Math.PI / 2; tr.add(b); }
  const mast = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.6, 8), lam(0x333333)); mast.position.set(0.2, 2.95, 0); g.add(mast);
  const rotor = new T.Group(); rotor.position.set(0.2, 3.25, 0); g.add(rotor);
  for (let i = 0; i < 4; i++) { const b = new T.Mesh(new T.BoxGeometry(5.6, 0.04, 0.28), lam(0x1d1d1d)); b.position.x = 2.8; const p = new T.Group(); p.rotation.y = i * Math.PI / 2; p.add(b); rotor.add(p); }
  const disc = new T.Mesh(new T.CircleGeometry(5.8, 32), new T.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, depthWrite: false })); disc.rotation.x = -Math.PI / 2; rotor.add(disc);
  for (const sz of [-1, 1]) {
    const sk = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 3.6, 6), lam(0x2a2a2a)); sk.rotation.z = Math.PI / 2; sk.position.set(0.3, 0.1, sz * 0.95); g.add(sk);
    for (const sx of [-0.7, 1.2]) { const st = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.8, 6), lam(0x2a2a2a)); st.position.set(sx, 0.48, sz * 0.8); st.rotation.x = sz * 0.3; g.add(st); }
  }
  if (armed) for (const sz of [-1, 1]) {
    const pod = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 1.6, 8), lam(0x222222)); pod.rotation.z = Math.PI / 2; pod.position.set(0.4, 1.0, sz * 1.6); g.add(pod);
    const arm = new T.Mesh(new T.BoxGeometry(0.3, 0.1, 1.2), bm); arm.position.set(0.4, 1.15, sz * 1.1); g.add(arm);
  }
  return { group: outer, rotor, tailRotor: tr, disc, inner: g };
};

// ---------- Fahrzeug-Objekte ----------
IE.vehicles = [];
IE.spawnCar = function (scene, defId, x, z, yaw, opts) {
  opts = opts || {};
  const def = opts.def || IE.carById[defId];
  const m = IE.makeCar(def.kind, opts.color !== undefined ? opts.color : def.color, opts.police);
  if (def.pack || def.id === 'burgerauto') try { IE.decorateCar(m, def); } catch (e) { }
  const v = { type: 'car', def, m, group: m.group, pos: new T.Vector3(x, IE.groundH(x, z) + 0.05, z), yaw: yaw || 0, speed: 0, vy: 0, steer: 0,
    pitch: 0, roll: 0, health: 1000, maxHealth: 1000, driver: null, police: !!opts.police, hostile: !!opts.hostile, traffic: !!opts.traffic,
    owned: !!opts.owned, ai: opts.ai || null, wheelRot: 0, dead: false, burn: 0 };
  m.group.position.copy(v.pos); m.group.rotation.y = v.yaw; scene.add(m.group);
  IE.vehicles.push(v); return v;
};
IE.spawnHeli = function (scene, defId, x, y, z, yaw) {
  const def = IE.heliById[defId];
  const m = IE.makeHeli(def.color, def.armed);
  const v = { type: 'heli', def, m, group: m.group, pos: new T.Vector3(x, y, z), vel: new T.Vector3(), yaw: yaw || 0, rotor: 0, health: 800, maxHealth: 800,
    driver: null, pitch: 0, roll: 0, dead: false, burn: 0 };
  m.group.position.copy(v.pos); scene.add(m.group); IE.vehicles.push(v); return v;
};

const fwd = (yaw) => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
IE.fwd = fwd;

IE.updateCar = function (v, inp, dt) {
  const d = v.def;
  if (v.dead) { inp = { x: 0, y: 0, brake: true }; }
  const thr = inp.y || 0, st = inp.x || 0;
  const onRoad = IE.nearRoad(v.pos.x, v.pos.z) || v.inCity || (IE.onExtraRoad && IE.onExtraRoad(v.pos.x, v.pos.z));
  if (!isFinite(v.speed)) v.speed = 0;
  const maxS = Math.max(0.5, d.speed * (onRoad || d.kind === 'suv' ? 1 : 0.7) * (v.drown ? 0 : 1));
  if (thr > 0) v.speed += (v.speed < 0 ? 30 : d.accel * (1 - Math.max(0, v.speed) / maxS * 0.6)) * thr * dt;
  else if (thr < 0) { if (v.speed > 0.5) v.speed -= 32 * -thr * dt; else v.speed = Math.max(-12, v.speed + 12 * thr * dt); }
  else v.speed -= v.speed * 0.35 * dt;
  if (inp.brake) v.speed -= v.speed * 2.2 * dt;
  if (v.speed > maxS) v.speed -= (v.speed - maxS) * 2 * dt;
  v.steer += (st - v.steer) * Math.min(1, dt * 8);
  const as = Math.abs(v.speed);
  const yawRate = v.steer * Math.sign(v.speed) * Math.min(as / 4, 1) * 1.7 * (d.grip / 2.2) * (1 - Math.min(as / (d.speed + 1), 1) * 0.45) * (inp.brake ? 1.5 : 1);
  // Driften: Heck bricht aus, Auto rutscht seitlich weiter
  const drifting = !!inp.drift && as > 8 && !v.m.tank;
  if (v.vy === 0 || v.pos.y - v.gy < 0.3) v.yaw -= yawRate * (drifting ? 1.9 : 1) * dt;
  const f = fwd(v.yaw);
  if (v.moveYaw === undefined) v.moveYaw = v.yaw;
  let dy = v.yaw - v.moveYaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  v.moveYaw += dy * Math.min(1, dt * (drifting ? 1.7 : 10)); v.driftAng = dy; v.drifting = drifting && Math.abs(dy) > 0.12;
  if (drifting) v.speed -= v.speed * 0.22 * dt;
  const mf = fwd(v.moveYaw);
  v.pos.x += mf.x * v.speed * dt; v.pos.z += mf.z * v.speed * dt;
  // Kollision (vorne + hinten)
  const hl = v.m.L / 2 - 0.9;
  let hit = false;
  for (const s of [1, -1]) {
    const p = { x: v.pos.x + f.x * hl * s, z: v.pos.z + f.z * hl * s };
    if (IE.pushOut(p, 1.05, v.pos.y, 1.5)) { v.pos.x = p.x - f.x * hl * s; v.pos.z = p.z - f.z * hl * s; hit = true; }
  }
  if (hit) { if (as > 8) { v.health -= as * 6; if (v.onCrash) v.onCrash(as); } v.speed *= -0.25; }
  // Boden
  const g = IE.groundH(v.pos.x, v.pos.z); v.gy = g;
  if (v.pos.y > g + 0.05) { v.vy -= 28 * dt; v.pos.y += v.vy * dt; if (v.pos.y < g) { if (v.vy < -14) v.health -= -v.vy * 8; v.pos.y = g; v.vy = 0; } }
  else { const climb = g - v.pos.y; v.pos.y = g; v.vy = Math.min(climb / Math.max(dt, 0.001), 9) * 0.6; if (v.vy < 0.5) v.vy = 0; }
  // Wasser
  if (g < -1.0) { v.drown = true; v.drownT = (v.drownT || 0) + dt; v.speed *= 0.9; v.health -= 120 * dt; v.pos.y = Math.max(g, v.pos.y - 1.5 * dt); }
  else { v.drown = false; v.drownT = 0; }
  // Neigung
  const fh = IE.groundH(v.pos.x + f.x * 1.8, v.pos.z + f.z * 1.8), bh = IE.groundH(v.pos.x - f.x * 1.8, v.pos.z - f.z * 1.8);
  const lh = IE.groundH(v.pos.x + f.z * 0.9, v.pos.z - f.x * 0.9), rh = IE.groundH(v.pos.x - f.z * 0.9, v.pos.z + f.x * 0.9);
  const tp = Math.atan2(bh - fh, 3.6), tr = Math.atan2(lh - rh, 1.8);
  v.pitch += (tp - v.pitch) * Math.min(1, dt * 8); v.roll += (tr - v.roll) * Math.min(1, dt * 8);
  v.group.position.copy(v.pos); v.group.rotation.set(0, 0, 0); v.group.rotation.order = 'YXZ'; v.group.rotation.y = v.yaw; v.group.rotation.x = v.pitch; v.group.rotation.z = v.roll;
  v.wheelRot += v.speed * dt / 0.36;
  v.m.wheels.forEach((w, i) => { w.children[0].rotation.z = -v.wheelRot; w.children[1].rotation.z = -v.wheelRot; if (i % 2 === 1) w.rotation.y = 0; });
  // Vorderräder lenken (Index 2,3 = vorne, da sx=+1)
  v.m.wheels[2].rotation.y = v.steer * 0.45; v.m.wheels[3].rotation.y = v.steer * 0.45;
  if (v.m.lean) v.m.lean.rotation.x = -v.steer * Math.min(Math.abs(v.speed) / 12, 1) * 0.5;
  if (v.m.siren) { const on = (performance.now() / 200 | 0) % 2; v.m.siren[0].visible = !!on; v.m.siren[1].visible = !on; }
};

IE.updateHeli = function (v, inp, dt) {
  const d = v.def, piloted = !!v.driver && !v.dead;
  v.rotor += ((piloted ? 1 : 0) - v.rotor) * dt * (piloted ? 0.9 : 0.25);
  v.m.rotor.rotation.y += v.rotor * dt * 28; v.m.tailRotor.rotation.z += v.rotor * dt * 40;
  v.m.disc.material.opacity = v.rotor * 0.22;
  const g = IE.supportH(v.pos.x, v.pos.z, v.pos.y);
  const grounded = v.pos.y <= g + 0.05;
  if (piloted && v.rotor > 0.75) {
    v.yaw -= (inp.x || 0) * 1.5 * dt;
    const f = fwd(v.yaw), fw = inp.y || 0, sd = inp.side || 0;
    const tx = (f.x * fw - f.z * sd) * d.speed, tz = (f.z * fw + f.x * sd) * d.speed;
    const k = Math.min(1, dt * 0.9);
    v.vel.x += (tx - v.vel.x) * k; v.vel.z += (tz - v.vel.z) * k;
    const ty = (inp.up || 0) * d.climb; v.vel.y += (ty - v.vel.y) * Math.min(1, dt * 2.2);
    if (grounded && v.vel.y < 0) v.vel.y = 0;
    v.pitch += (fw * 0.28 - v.pitch) * Math.min(1, dt * 3); v.roll += ((inp.x || 0) * 0.18 + sd * 0.2 - v.roll) * Math.min(1, dt * 3);
  } else {
    v.vel.y -= 20 * dt * (1 - v.rotor * 0.9); v.vel.x *= 1 - dt * 0.3; v.vel.z *= 1 - dt * 0.3;
    v.pitch *= 1 - dt * 2; v.roll *= 1 - dt * 2;
  }
  v.pos.addScaledVector(v.vel, dt);
  if (v.pos.y > 1000) { v.pos.y = 1000; v.vel.y = Math.min(0, v.vel.y); }
  const g2 = IE.supportH(v.pos.x, v.pos.z, v.pos.y + 0.5);
  if (v.pos.y < g2) {
    if (v.vel.y < -10) v.health -= -v.vel.y * 25;
    v.pos.y = g2; v.vel.y = Math.max(0, v.vel.y); v.vel.x *= 0.85; v.vel.z *= 0.85;
  }
  if (g2 < -0.5 && v.pos.y < 0.3) { v.pos.y = 0.3; v.vel.multiplyScalar(0.9); if (!piloted) v.health -= 50 * dt; }
  const hs = Math.hypot(v.vel.x, v.vel.z);
  if (IE.pushOut(v.pos, 3.2, v.pos.y, 3)) { if (hs > 8) v.health -= hs * 8; v.vel.x *= -0.3; v.vel.z *= -0.3; }
  v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.y = v.yaw; v.group.rotation.x = v.pitch; v.group.rotation.z = v.roll;
};

// ---------- NPCs ----------
IE.npcs = [];
const pedColors = [0x3b4a6b, 0x8a3b3b, 0x2f5a3f, 0xc9b28a, 0x555555, 0x1f1f1f, 0xe0d8c8, 0x6b4f8a, 0xb5651d, 0x335577];
const skins = [0xe9c3a6, 0xd8a47f, 0xc8946c, 0x9a6a48, 0xf0d0b8];
IE.spawnNPC = function (scene, kind, x, z, opts) {
  opts = opts || {};
  const r = Math.random;
  let look;
  if (kind === 'police') look = { pants: 0x1a2340, jacket: 0x1a2340, shirt: 0xd8dce6, skin: skins[(r() * 5) | 0], hair: 0x111111 };
  else if (kind === 'soldier') look = { pants: 0x4b5233, jacket: 0x59613d, shirt: 0x3e4429, skin: skins[(r() * 5) | 0], hair: 0x3a4028 };
  else if (kind === 'guard') look = { pants: 0x111114, jacket: 0x111114, shirt: 0xf4f4f4, tie: 0x111111, skin: skins[(r() * 5) | 0], hair: 0x111111, glasses: 'sun' };
  else if (kind === 'zombie') { const zs = [0x8fa37a, 0x7d9168, 0x9aa88a, 0x6f8460][(r() * 4) | 0]; look = { pants: [0x2f3440, 0x3d3428, 0x2b2b2b][(r() * 3) | 0], jacket: [0x4a4436, 0x5a3030, 0x3a4a3a, 0x6b6250][(r() * 4) | 0], shirt: 0x8a8070, skin: zs, hair: [0x222222, 0x3a3020, 0x555555][(r() * 3) | 0], female: r() < 0.35 }; }
  else if (kind === 'enemy') look = { pants: 0x161616, jacket: opts.boss ? 0x5a0d0d : 0x1d1d22, shirt: opts.boss ? 0xf0f0f0 : 0x2a2a2a, skin: skins[(r() * 5) | 0], hair: 0x1a1a1a };
  else if (kind === 'alien') look = { pants: 0x2a3a2a, jacket: 0x314a31, shirt: 0x1a2a1a, skin: 0x8fbf6a, hair: 0x2a3a2a, glasses: 'visor', hands: 0x8fbf6a };
  else look = { pants: pedColors[(r() * 10) | 0], jacket: pedColors[(r() * 10) | 0], shirt: 0xeeeeee, skin: skins[(r() * 5) | 0], hair: [0x2a1a10, 0x111111, 0x7a5a30, 0xaaaaaa][(r() * 4) | 0], female: r() < 0.45 };
  const h = IE.makeHuman(look);
  if (opts.boss) h.group.scale.setScalar(1.12);
  const y = opts.y !== undefined ? opts.y : IE.supportH(x, z, 999);
  const n = { kind, h, group: h.group, pos: new T.Vector3(x, y, z), yaw: r() * 6.28, health: kind === 'ped' ? 40 : kind === 'guard' ? 400 : kind === 'zombie' ? 60 + r() * 40 : kind === 'alien' ? 70 + r() * 40 : (opts.boss ? 600 : kind === 'police' ? 80 : kind === 'soldier' ? 130 : 90),
    state: 'walk', timer: r() * 3, phase: r() * 6, dead: false, deadT: 0, shootT: 1 + r() * 2, boss: !!opts.boss, name: opts.name, city: opts.city, mission: !!opts.mission, speed: 0 };
  if (kind !== 'ped' && kind !== 'zombie') IE.setGunLen(h, opts.boss ? 0.5 : kind === 'soldier' ? 0.8 : 0.28);
  h.group.position.copy(n.pos); scene.add(h.group); IE.npcs.push(n); return n;
};
IE.killNPC = function (n) {
  if (n.dead) return; n.dead = true; n.deadT = 0; n.health = 0;
  n.group.rotation.x = -Math.PI / 2; n.group.position.y += 0.15;
};
})();
