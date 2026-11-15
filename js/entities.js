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
IE.setGunLen = function (h, len) { h.gun.visible = len > 0; if (len > 0) { h.gunMesh.scale.z = len / 0.3; h.gunMesh.position.z = len / 2 - 0.05; } };

// ---------- Autos ----------
const profiles = {
  klein: { L: 3.6, W: 1.66, r: 0.31, body: [[-1.8,0.32],[1.8,0.32],[1.82,0.78],[1.5,0.95],[0.8,1.0],[0.38,1.5],[-1.2,1.5],[-1.72,1.05],[-1.82,0.88]], glass: [[0.74,1.02],[0.4,1.45],[-1.16,1.45],[-1.62,1.04]] },
  limo:  { L: 4.6, W: 1.8, r: 0.34, body: [[-2.3,0.32],[2.3,0.32],[2.32,0.8],[1.2,0.95],[0.5,1.42],[-1.2,1.42],[-1.9,1.0],[-2.32,0.95]], glass: [[1.15,0.98],[0.52,1.37],[-1.16,1.37],[-1.85,1.02]] },
  suv:   { L: 4.5, W: 1.92, r: 0.44, body: [[-2.25,0.5],[2.25,0.5],[2.27,1.15],[1.4,1.3],[0.9,1.92],[-2.1,1.92],[-2.27,1.3]], glass: [[1.36,1.34],[0.9,1.86],[-2.05,1.86],[-2.12,1.36]] },
  sport: { L: 4.4, W: 1.92, r: 0.34, body: [[-2.2,0.3],[2.2,0.3],[2.26,0.58],[0.9,0.86],[0.1,1.24],[-1.1,1.24],[-2.1,0.86],[-2.22,0.74]], glass: [[0.86,0.89],[0.12,1.2],[-1.05,1.2],[-1.9,0.89]] },
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

// ---------- Helikopter ----------
IE.makeHeli = function (color) {
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
  const m = IE.makeHeli(def.color);
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
  v.wheelRot += v.speed * dt / v.m.wheels[0].children[0].geometry.parameters.radiusTop;
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
  else if (kind === 'enemy') look = { pants: 0x161616, jacket: opts.boss ? 0x5a0d0d : 0x1d1d22, shirt: opts.boss ? 0xf0f0f0 : 0x2a2a2a, skin: skins[(r() * 5) | 0], hair: 0x1a1a1a };
  else look = { pants: pedColors[(r() * 10) | 0], jacket: pedColors[(r() * 10) | 0], shirt: 0xeeeeee, skin: skins[(r() * 5) | 0], hair: [0x2a1a10, 0x111111, 0x7a5a30, 0xaaaaaa][(r() * 4) | 0], female: r() < 0.45 };
  const h = IE.makeHuman(look);
  if (opts.boss) h.group.scale.setScalar(1.12);
  const y = IE.supportH(x, z, 999);
  const n = { kind, h, group: h.group, pos: new T.Vector3(x, y, z), yaw: r() * 6.28, health: kind === 'ped' ? 40 : (opts.boss ? 600 : kind === 'police' ? 80 : 90),
    state: 'walk', timer: r() * 3, phase: r() * 6, dead: false, deadT: 0, shootT: 1 + r() * 2, boss: !!opts.boss, name: opts.name, city: opts.city, mission: !!opts.mission, speed: 0 };
  if (kind !== 'ped') IE.setGunLen(h, opts.boss ? 0.5 : 0.28);
  h.group.position.copy(n.pos); scene.add(h.group); IE.npcs.push(n); return n;
};
IE.killNPC = function (n) {
  if (n.dead) return; n.dead = true; n.deadT = 0; n.health = 0;
  n.group.rotation.x = -Math.PI / 2; n.group.position.y += 0.15;
};
})();
