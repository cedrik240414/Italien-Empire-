// ===== ITALIEN EMPIRE – Figuren & Fahrzeuge =====
'use strict';
(function () {
const T = THREE;
const lam = (c, extra) => new T.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));
const matCache = {};
const mc = c => matCache[c] || (matCache[c] = lam(c));

// ---------- Mensch ----------
IE.makeHuman = function (o) {
  const g = new T.Group();
  const box = (w, h, d, c, parent, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mc(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const pivot = (x, y, z) => { const p = new T.Group(); p.position.set(x, y, z); g.add(p); return p; };
  const legL = pivot(-0.11, 0.92, 0), legR = pivot(0.11, 0.92, 0);
  box(0.17, 0.88, 0.2, o.pants, legL, 0, -0.44, 0); box(0.17, 0.88, 0.2, o.pants, legR, 0, -0.44, 0);
  box(0.18, 0.1, 0.28, 0x1a1a1a, legL, 0, -0.87, 0.04); box(0.18, 0.1, 0.28, 0x1a1a1a, legR, 0, -0.87, 0.04);
  const torso = box(o.female ? 0.42 : 0.48, 0.64, 0.26, o.jacket, g, 0, 1.24, 0);
  box(o.female ? 0.2 : 0.22, 0.5, 0.02, o.shirt, g, 0, 1.28, 0.135);
  box(0.1, 0.1, 0.1, o.skin, g, 0, 1.6, 0);
  const head = new T.Group(); head.position.set(0, 1.76, 0); g.add(head);
  box(0.24, 0.27, 0.25, o.skin, head, 0, 0, 0);
  box(0.26, 0.09, 0.27, o.hair, head, 0, 0.14, -0.01);
  box(0.26, 0.2, 0.06, o.hair, head, 0, 0.04, -0.13);
  if (o.female) box(0.26, 0.42, 0.08, o.hair, head, 0, -0.12, -0.14);
  box(0.04, 0.03, 0.01, 0x111111, head, -0.06, 0.03, 0.126); box(0.04, 0.03, 0.01, 0x111111, head, 0.06, 0.03, 0.126);
  const armL = pivot(-0.31, 1.52, 0), armR = pivot(0.31, 1.52, 0);
  box(0.13, 0.6, 0.15, o.jacket, armL, 0, -0.3, 0); box(0.13, 0.6, 0.15, o.jacket, armR, 0, -0.3, 0);
  box(0.11, 0.11, 0.11, o.skin, armL, 0, -0.64, 0); box(0.11, 0.11, 0.11, o.skin, armR, 0, -0.64, 0);
  const gun = new T.Group(); gun.position.set(0, -0.66, 0.08); armR.add(gun);
  const gunMesh = box(0.06, 0.1, 0.3, 0x111111, gun, 0, 0, 0.1); gun.visible = false;
  return { group: g, legL, legR, armL, armR, head, gun, gunMesh, torso };
};
IE.animHuman = function (h, phase, amp, aiming, dead) {
  if (dead) return;
  const s = Math.sin(phase) * amp;
  h.legL.rotation.x = s; h.legR.rotation.x = -s;
  h.armL.rotation.x = -s * 0.8;
  if (aiming) { h.armR.rotation.x = -Math.PI / 2; h.armR.rotation.z = 0; } else h.armR.rotation.x = s * 0.8;
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
IE.makeCar = function (kind, color, police) {
  if (kind === 'tank') return IE.makeTank(color);
  const P = profiles[kind];
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
  const key = kind;
  if (!geoCache[key]) geoCache[key] = { body: extr(P.body, P.W - 0.12, 0.06), glass: extr(P.glass, P.W - 0.02, 0) };
  const bodyMat = new T.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.35 });
  const body = new T.Mesh(geoCache[key].body, bodyMat); body.castShadow = true; g.add(body);
  const glass = new T.Mesh(geoCache[key].glass, glassMat); g.add(glass);
  const wheels = [];
  const wg = new T.CylinderGeometry(P.r, P.r, 0.26, 16); wg.rotateX(Math.PI / 2);
  const rg = new T.CylinderGeometry(P.r * 0.6, P.r * 0.6, 0.28, 10); rg.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new T.Group(); w.position.set(sx * (P.L / 2 - 0.78), P.r, sz * (P.W / 2 - 0.08));
    const t = new T.Mesh(wg, tireMat); t.castShadow = true; w.add(t); w.add(new T.Mesh(rg, rimMat));
    g.add(w); wheels.push(w);
  }
  const hl = new T.BoxGeometry(0.06, 0.12, 0.34);
  for (const sz of [-1, 1]) {
    const h = new T.Mesh(hl, headMat); h.position.set(P.L / 2 + 0.03, P.body[2][1] - 0.12, sz * (P.W / 2 - 0.3)); g.add(h);
    const t = new T.Mesh(hl, tailMat); t.position.set(-P.L / 2 - 0.03, P.body[P.body.length - 1][1] - 0.08, sz * (P.W / 2 - 0.3)); g.add(t);
  }
  let siren = null;
  if (police) {
    const stripe = new T.Mesh(new T.BoxGeometry(P.L * 0.98, 0.18, P.W - 0.05), lam(0xffffff)); stripe.position.set(0, 0.68, 0); g.add(stripe);
    siren = [new T.Mesh(new T.BoxGeometry(0.3, 0.14, 0.5), new T.MeshBasicMaterial({ color: 0x1040ff })), new T.Mesh(new T.BoxGeometry(0.3, 0.14, 0.5), new T.MeshBasicMaterial({ color: 0xff1020 }))];
    siren[0].position.set(-0.3, 1.5, -0.3); siren[1].position.set(-0.3, 1.5, 0.3); g.add(siren[0], siren[1]);
  }
  return { group: outer, wheels, L: P.L, W: P.W, bodyMat, siren };
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

// ---------- Boote ----------
IE.makeBoat = function (def) {
  const outer = new T.Group(), g = new T.Group(); outer.add(g); g.rotation.y = -Math.PI / 2;
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
  return { group: outer, L, W, H, bodyMat: hm };
};
IE.spawnBoat = function (scene, defId, x, z, yaw) {
  const def = IE.boatById[defId], m = IE.makeBoat(def);
  const v = { type: 'boat', def, m, group: m.group, pos: new T.Vector3(x, 0, z), yaw: yaw || 0, speed: 0, steer: 0, pitch: 0, roll: 0,
    health: def.kind === 'yacht' ? 3000 : 900, maxHealth: def.kind === 'yacht' ? 3000 : 900, driver: null, dead: false, burn: 0, t: Math.random() * 10 };
  m.group.position.copy(v.pos); scene.add(m.group); IE.vehicles.push(v); return v;
};
IE.updateBoat = function (v, inp, dt) {
  const d = v.def; if (v.dead) inp = {};
  v.t += dt;
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
  if (k === 'prop' || k === 'stunt' || k === 'sea') {
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
  return { group: outer, L, W, H: gearH + 2, bodyMat: bm, prop, gearH };
};
IE.spawnPlane = function (scene, defId, x, z, yaw, y) {
  const def = IE.planeById[defId], m = IE.makePlane(def);
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
    if (d.kind === 'stunt' || d.kind === 'fighter') v.roll += (inp.x || 0) * 2.6 * turn * 0.6 * dt;
    else v.roll += ((inp.x || 0) * 0.9 - v.roll) * Math.min(1, dt * 1.8);
    if (!(inp.x) && (d.kind === 'stunt' || d.kind === 'fighter')) v.roll += (Math.round(v.roll / (Math.PI * 2)) * Math.PI * 2 - v.roll) * Math.min(1, dt * 1.2);
    const cr = Math.cos(v.roll);
    v.pitch += (inp.y || 0) * 0.8 * turn * cr * dt;
    v.yaw -= Math.sin(v.roll) * 0.75 * turn * Math.min(v.speed / d.minSpeed, 1.6) * dt * Math.sign(cr || 1) * (cr < 0 ? -1 : 1);
    v.yaw += (inp.y || 0) * 0.8 * turn * Math.sin(v.roll) * dt * 0;
    v.pitch = Math.max(-1.45, Math.min(1.45, v.pitch));
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
    v.pos.y = g2; v.pitch = Math.max(v.pitch, 0); v.roll = 0;
  }
  if (g2 < -0.3 && d.kind !== 'sea' && v.pos.y < 0.4) { v.health -= 400 * dt; v.speed *= 0.9; }
  if (IE.pushOut(v.pos, Math.min(3, v.m.L * 0.2), v.pos.y, 2.5)) { if (v.speed > 14) v.health = 0; else v.speed *= -0.2; }
  v.onGround = v.pos.y <= g2 + 0.1;
  if (v.m.prop) v.m.prop.rotation.x += (0.2 + v.throttle) * dt * 50;
  v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.y = v.yaw; v.group.rotation.x = -v.pitch; v.group.rotation.z = v.roll;
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
  const onRoad = IE.nearRoad(v.pos.x, v.pos.z) || v.inCity;
  const maxS = d.speed * (onRoad || d.kind === 'suv' ? 1 : 0.7) * (v.drown ? 0 : 1);
  if (thr > 0) v.speed += (v.speed < 0 ? 30 : d.accel * (1 - Math.max(0, v.speed) / maxS * 0.6)) * thr * dt;
  else if (thr < 0) { if (v.speed > 0.5) v.speed -= 32 * -thr * dt; else v.speed = Math.max(-12, v.speed + 12 * thr * dt); }
  else v.speed -= v.speed * 0.35 * dt;
  if (inp.brake) v.speed -= v.speed * 2.2 * dt;
  if (v.speed > maxS) v.speed -= (v.speed - maxS) * 2 * dt;
  v.steer += (st - v.steer) * Math.min(1, dt * 8);
  const as = Math.abs(v.speed);
  const yawRate = v.steer * Math.sign(v.speed) * Math.min(as / 4, 1) * 1.7 * (d.grip / 2.2) * (1 - Math.min(as / (d.speed + 1), 1) * 0.45) * (inp.brake ? 1.5 : 1);
  if (v.vy === 0 || v.pos.y - v.gy < 0.3) v.yaw -= yawRate * dt;
  const f = fwd(v.yaw);
  v.pos.x += f.x * v.speed * dt; v.pos.z += f.z * v.speed * dt;
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
  if (g < -1.0) { v.drown = true; v.speed *= 0.9; v.health -= 120 * dt; v.pos.y = Math.max(g, v.pos.y - 1.5 * dt); }
  else v.drown = false;
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
  else if (kind === 'enemy') look = { pants: 0x161616, jacket: opts.boss ? 0x5a0d0d : 0x1d1d22, shirt: opts.boss ? 0xf0f0f0 : 0x2a2a2a, skin: skins[(r() * 5) | 0], hair: 0x1a1a1a };
  else look = { pants: pedColors[(r() * 10) | 0], jacket: pedColors[(r() * 10) | 0], shirt: 0xeeeeee, skin: skins[(r() * 5) | 0], hair: [0x2a1a10, 0x111111, 0x7a5a30, 0xaaaaaa][(r() * 4) | 0], female: r() < 0.45 };
  const h = IE.makeHuman(look);
  if (opts.boss) h.group.scale.setScalar(1.12);
  const y = opts.y !== undefined ? opts.y : IE.supportH(x, z, 999);
  const n = { kind, h, group: h.group, pos: new T.Vector3(x, y, z), yaw: r() * 6.28, health: kind === 'ped' ? 40 : (opts.boss ? 600 : kind === 'police' ? 80 : kind === 'soldier' ? 130 : 90),
    state: 'walk', timer: r() * 3, phase: r() * 6, dead: false, deadT: 0, shootT: 1 + r() * 2, boss: !!opts.boss, name: opts.name, city: opts.city, mission: !!opts.mission, speed: 0 };
  if (kind !== 'ped') IE.setGunLen(h, opts.boss ? 0.5 : kind === 'soldier' ? 0.8 : 0.28);
  h.group.position.copy(n.pos); scene.add(h.group); IE.npcs.push(n); return n;
};
IE.killNPC = function (n) {
  if (n.dead) return; n.dead = true; n.deadT = 0; n.health = 0;
  n.group.rotation.x = -Math.PI / 2; n.group.position.y += 0.15;
};
})();
