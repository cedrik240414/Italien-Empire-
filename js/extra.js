// ===== ITALIEN EMPIRE – Rennstrecke (mit Loopings & Rennen), Tankstellen-Überfälle, Villenstraße =====
'use strict';
(function () {
const T = THREE;
const $ = id => document.getElementById(id);
const G = () => window.IEgame;
const rnd = Math.random;
const fwd = yaw => ({ x: Math.sin(yaw), z: Math.cos(yaw) });

// ---------- Hilfen ----------
function catmull(pts, step) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(segLen / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  return out;
}
function openPolyline(pts, step) { // für nicht geschlossene Straßen
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const l = pts[pts.length - 1]; out.push({ x: l[0], z: l[1] });
  return out;
}
function withDirs(pts, closed) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; pts[i].dx = dx / l; pts[i].dz = dz / l;
    if (i) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); pts[i].s = s;
  }
  return closed ? s + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z) : s;
}
// Band entlang einer Linie (y = Boden + lift)
function ribbon(pts, w0, w1, lift, closed, colorFn) {
  const n = pts.length, cnt = closed ? n + 1 : n;
  const pos = new Float32Array(cnt * 2 * 3), col = colorFn ? new Float32Array(cnt * 2 * 3) : null, idx = [];
  for (let k = 0; k < cnt; k++) {
    const p = pts[k % n], nx = -p.dz, nz = p.dx;
    const ax = p.x + nx * w0, az = p.z + nz * w0, bx = p.x + nx * w1, bz = p.z + nz * w1;
    pos.set([ax, IE.groundH(ax, az) + lift, az, bx, IE.groundH(bx, bz) + lift, bz], k * 6);
    if (col) { const c = colorFn(k % n); col.set([c.r, c.g, c.b, c.r, c.g, c.b], k * 6); }
    if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); if (col) g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function textTex(lines, w, h, bg, fg, font) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = l.f || font; g.fillText(l.t, w / 2, h * (i + 0.5) / lines.length); });
  const t = new T.CanvasTexture(c); return { t, c, g };
}
const box = (w, h, d, mat, x, y, z, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; };

// ================= RENNSTRECKE =================
const TR = IE.track;
const LOCAL = [[-240, -160], [0, -165], [240, -160], [285, -125], [292, -62], [252, -22], [165, -12], [112, 32], [132, 92], [222, 112], [272, 145], [228, 172], [0, 170], [-205, 168], [-272, 140], [-282, 82], [-232, 42], [-150, 30], [-110, -18], [-172, -62], [-262, -82], [-292, -126]];
const TW = 10; // halbe Streckenbreite
const SC = 1.15; // Streckengröße
const loops = []; IE.loops = loops;
function buildTrack(scene) {
  const pts = catmull(LOCAL.map(p => [TR.x + p[0] * SC, TR.z + p[1] * SC]), 3);
  // Start = Punkt auf der Zielgeraden nahe lokal x=0
  let si = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - TR.x, p.z - (TR.z - 165 * SC)); if (d < bd) { bd = d; si = i; } });
  const rot = pts.slice(si).concat(pts.slice(0, si));
  const len = withDirs(rot, true);
  IE.trackPts = rot; IE.trackLen = len;
  const asphalt = new T.MeshLambertMaterial({ color: 0x3a3c40 });
  scene.add(new T.Mesh(ribbon(rot, -TW, TW, 0.07, true), asphalt));
  // Mittellinie gestrichelt
  const lineMat = new T.MeshBasicMaterial({ color: 0xf2f2ee });
  const red = new T.Color(0xd8262c), white = new T.Color(0xf2f2ee);
  const curbMat = new T.MeshLambertMaterial({ vertexColors: true });
  const cf = i => ((i >> 1) % 2 ? red : white);
  scene.add(new T.Mesh(ribbon(rot, TW, TW + 1.6, 0.1, true, cf), curbMat));
  scene.add(new T.Mesh(ribbon(rot, -TW - 1.6, -TW, 0.1, true, cf), curbMat));
  scene.add(new T.Mesh(ribbon(rot.filter((p, i) => (i % 8) < 4), -0.25, 0.25, 0.09, false), lineMat));
  // Start-/Ziellinie (Schachbrett)
  const p0 = rot[0], ck = textTex([], 256, 32, '#fff', '#000');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) { ck.g.fillStyle = '#000'; ck.g.fillRect(i * 16, j * 16, 16, 16); }
  ck.t.needsUpdate = true;
  const fin = new T.Mesh(new T.PlaneGeometry(TW * 2, 3), new T.MeshBasicMaterial({ map: ck.t }));
  fin.rotation.x = -Math.PI / 2; fin.rotation.z = Math.atan2(p0.dx, p0.dz); fin.position.set(p0.x, IE.groundH(p0.x, p0.z) + 0.12, p0.z); scene.add(fin);
  // Portal über der Ziellinie
  const gy = IE.groundH(p0.x, p0.z), nx = -p0.dz, nz = p0.dx, metal = new T.MeshLambertMaterial({ color: 0x9aa0a8 });
  for (const sgn of [-1, 1]) { const px = p0.x + nx * (TW + 3) * sgn, pz = p0.z + nz * (TW + 3) * sgn; box(1, 9, 1, metal, px, gy + 4.5, pz, scene); IE.addBox(px - 0.6, pz - 0.6, px + 0.6, pz + 0.6, gy + 9); }
  const sign = textTex([{ t: 'AUTODROMO DELL\'ADRIATICO', f: 'bold 54px Arial' }], 1024, 96, '#b8141c', '#fff');
  const banner = new T.Mesh(new T.BoxGeometry((TW + 3) * 2 + 1, 2.2, 0.5), [metal, metal, metal, metal, new T.MeshBasicMaterial({ map: sign.t }), new T.MeshBasicMaterial({ map: sign.t })]);
  banner.position.set(p0.x, gy + 8.4, p0.z); banner.rotation.y = Math.atan2(nx, nz) + Math.PI / 2; scene.add(banner);
  // Tribünen an der Zielgeraden (Innenseite) und Boxengebäude außen
  const standMat = new T.MeshLambertMaterial({ color: 0xc9c4b8 }), seatCols = [0xd8262c, 0x1f4fb0, 0xf2f2ee, 0x2e8b57];
  for (let k = -3; k <= 3; k++) {
    const q = rot[Math.round((k * 22 / 3 + rot.length) % rot.length)] || p0;
    const cx = q.x - nx * (TW + 16), cz = q.z - nz * (TW + 16), y0 = IE.groundH(cx, cz), yaw = Math.atan2(q.dx, q.dz);
    const st = new T.Group(); st.position.set(cx, y0, cz); st.rotation.y = yaw; scene.add(st);
    for (let r = 0; r < 6; r++) { box(18, 1 + r * 1.1, 2.2, r % 2 ? standMat : new T.MeshLambertMaterial({ color: seatCols[(k + 3) % 4] }), 0, (1 + r * 1.1) / 2, -r * 2.1 - 1, st).rotation.y = 0; }
    box(19, 0.4, 14, new T.MeshLambertMaterial({ color: 0xf2f2ee }), 0, 9.5, -6, st);
    const w = new T.Vector3(); st.updateMatrixWorld(true);
    const c1 = st.localToWorld(new T.Vector3(-9, 0, 0)), c2 = st.localToWorld(new T.Vector3(9, 0, -13));
    IE.addBox(Math.min(c1.x, c2.x), Math.min(c1.z, c2.z), Math.max(c1.x, c2.x), Math.max(c1.z, c2.z), y0 + 7);
  }
  { const cx = p0.x + nx * (TW + 22), cz = p0.z + nz * (TW + 22), y0 = IE.groundH(cx, cz), yaw = Math.atan2(p0.dx, p0.dz);
    const pit = new T.Group(); pit.position.set(cx, y0, cz); pit.rotation.y = yaw; scene.add(pit);
    box(14, 7, 70, IE.mat.white, 0, 3.5, 0, pit); box(15, 0.6, 72, new T.MeshLambertMaterial({ color: 0xb8141c }), 0, 7.2, 0, pit);
    for (let i = -3; i <= 3; i++) box(0.2, 4.5, 8, IE.mat.dark, -7.05, 2.4, i * 10, pit);
    const a = pit.localToWorld(new T.Vector3(-7, 0, -35)), b = pit.localToWorld(new T.Vector3(7, 0, 35));
    IE.addBox(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z), y0 + 7.5); }
  // Reifenstapel / Begrenzung in Kurven (nur Optik, kein Kollider)
  const tyreMat = new T.MeshLambertMaterial({ color: 0x1a1a1a }), tyreGeo = new T.CylinderGeometry(0.7, 0.7, 1.2, 10);
  const tyres = new T.InstancedMesh(tyreGeo, tyreMat, 600); let ti = 0; const M4 = new T.Matrix4();
  for (let i = 0; i < rot.length && ti < 600; i += 2) {
    const a = rot[(i - 6 + rot.length) % rot.length], b = rot[(i + 6) % rot.length], turn = Math.abs(a.dx * b.dz - a.dz * b.dx);
    if (turn < 0.25) continue; const side = (a.dx * b.dz - a.dz * b.dx) > 0 ? -1 : 1, p = rot[i];
    const x = p.x + (-p.dz) * (TW + 7) * side, z = p.z + p.dx * (TW + 7) * side;
    M4.makeTranslation(x, IE.groundH(x, z) + 0.6, z); tyres.setMatrixAt(ti++, M4);
  }
  tyres.count = ti; scene.add(tyres);
  // Loopings auf der Gegengeraden
  for (const lx of [70, -95]) {
    let li = 0, ld = 1e9; rot.forEach((p, i) => { const d = Math.hypot(p.x - (TR.x + lx * SC), p.z - (TR.z + 170 * SC)); if (d < ld) { ld = d; li = i; } });
    buildLoop(scene, rot[li]);
  }
  // Rennstart-Punkt (vor der Startlinie)
  const sp = rot[rot.length - 12];
  IE.raceStart = { x: sp.x, z: sp.z };
  IE.raceBeam = (() => { const m = new T.Mesh(new T.CylinderGeometry(4, 4, 300, 20, 1, true), new T.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide })); m.geometry.translate(0, 150, 0); m.position.set(sp.x, IE.groundH(sp.x, sp.z), sp.z); scene.add(m); return m; })();
}
// ---------- Looping ----------
const LR = 13, LSHIFT = 9, LW = 4.6;
function loopPos(L, th, out) {
  const s = Math.sin(th), c = Math.cos(th), sh = -LSHIFT / 2 + LSHIFT * th / (Math.PI * 2);
  out.set(L.x + L.dx * LR * s + L.rx * sh, L.y + LR * (1 - c), L.z + L.dz * LR * s + L.rz * sh); return out;
}
function buildLoop(scene, p) {
  const L = { x: p.x, z: p.z, y: IE.groundH(p.x, p.z) + 0.15, dx: p.dx, dz: p.dz, rx: p.dz, rz: -p.dx, yaw: Math.atan2(p.dx, p.dz) };
  // rechte Seite: (dz, -dx)
  L.ex = L.x - L.dx * 9 + L.rx * (-LSHIFT / 2); L.ez = L.z - L.dz * 9 + L.rz * (-LSHIFT / 2);
  const N = 72, pos = [], idx = [], v = new T.Vector3();
  for (let i = 0; i <= N; i++) {
    const th = i / N * Math.PI * 2; loopPos(L, th, v);
    // Innenseite zeigt zur Kreismitte; Breite quer (rx, rz)
    pos.push(v.x - L.rx * LW, v.y - 0.25, v.z - L.rz * LW, v.x + L.rx * LW, v.y - 0.25, v.z + L.rz * LW);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = new T.MeshLambertMaterial({ color: 0xd8262c, side: T.DoubleSide });
  scene.add(new T.Mesh(g, mat));
  // Geländer + Stützen
  const rail = new T.MeshLambertMaterial({ color: 0xf2f2ee });
  for (const sd of [-1, 1]) {
    const rp = []; for (let i = 0; i <= N; i++) { loopPos(L, i / N * Math.PI * 2, v); rp.push(new T.Vector3(v.x + L.rx * LW * sd, v.y + 0.5, v.z + L.rz * LW * sd)); }
    scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rp), 120, 0.25, 6, false), rail));
  }
  const top = loopPos(L, Math.PI, new T.Vector3());
  for (const sd of [-1, 1]) box(0.9, LR * 2, 0.9, IE.mat.dark, top.x + L.rx * (LW + 1.2) * sd, L.y + LR, top.z + L.rz * (LW + 1.2) * sd, scene);
  const sg = textTex([{ t: 'LOOPING', f: 'bold 60px Arial' }, { t: 'mit Schwung (ab 80 km/h)', f: 'bold 30px Arial' }], 512, 160, '#111', '#f2c230');
  const sm = new T.Mesh(new T.PlaneGeometry(8, 2.5), new T.MeshBasicMaterial({ map: sg.t, side: T.DoubleSide }));
  sm.position.set(L.x - L.dx * 40 + L.rx * (TW + 4), L.y + 3, L.z - L.dz * 40 + L.rz * (TW + 4)); sm.rotation.y = L.yaw + Math.PI; scene.add(sm);
  box(0.3, 3, 0.3, IE.mat.dark, sm.position.x, L.y + 1.5, sm.position.z, scene);
  loops.push(L);
}
// Prüft, ob ein Auto in einen Looping einfährt
const _v = new T.Vector3();
IE.loopCheck = function (v) {
  if (v.type !== 'car' || v.m.tank) return false;
  for (const L of loops) {
    const dx = v.pos.x - L.x, dz = v.pos.z - L.z; if (dx * dx + dz * dz > 400) { if (v.lastLoop === L) v.lastLoop = null; continue; }
    if (v.lastLoop === L) continue;
    const along = dx * L.dx + dz * L.dz, lat = dx * L.rx + dz * L.rz, f = fwd(v.yaw), dot = f.x * L.dx + f.z * L.dz;
    if (along > -1.6 && along < 0.6 && Math.abs(lat) < TW && dot > 0.8) {
      if (v.speed < 22) { if (v === (G() && G().P.veh) && !v.loopWarn) { v.loopWarn = 1; G().toast('Zu langsam für den Looping – mehr Schwung!', 1.6); } return false; }
      v.loop = { L, th: 0, spd: v.speed, off: lat + LSHIFT / 2 }; v.loopWarn = 0; return true;
    }
  }
  return false;
};
IE.loopUpdate = function (v, dt) {
  const lp = v.loop, L = lp.L;
  lp.spd = Math.max(20, lp.spd - 4 * Math.sin(lp.th) * dt);
  lp.th += lp.spd / LR * dt;
  if (lp.th >= Math.PI * 2) {
    v.loop = null; v.lastLoop = L; loopPos(L, Math.PI * 2, v.pos); v.pos.y = IE.groundH(v.pos.x, v.pos.z) + 0.05; v.pitch = 0; v.yaw = L.yaw; v.speed = lp.spd;
    v.group.position.copy(v.pos); v.group.rotation.set(0, v.yaw, 0); return;
  }
  loopPos(L, lp.th, v.pos); const of = (lp.off || 0) * Math.max(0, 1 - lp.th / 1.2); v.pos.x += L.rx * of; v.pos.z += L.rz * of; v.yaw = L.yaw; v.speed = lp.spd; v.pitch = -lp.th; v.roll = 0;
  v.group.position.copy(v.pos); v.group.rotation.order = 'YXZ'; v.group.rotation.set(-lp.th, L.yaw, 0);
  if (v.m.wheels) { v.wheelRot = (v.wheelRot || 0) + lp.spd * dt / 0.34; v.m.wheels.forEach(w => { if (w.children[0]) w.children[0].rotation.z = -v.wheelRot; if (w.children[1]) w.children[1].rotation.z = -v.wheelRot; }); }
};

// ================= TANKSTELLEN =================
const gas = []; IE.gasStations = gas;
function buildGas(scene) {
  const cand = [];
  for (const r of IE.roads) for (let i = 20; i < r.pts.length - 20; i += 25) cand.push({ r, i });
  cand.sort(() => rnd() - 0.5);
  const canopyMat = new T.MeshLambertMaterial({ color: 0xf2f2ee }), stripe = new T.MeshLambertMaterial({ color: 0xe0761c }), pumpMat = new T.MeshLambertMaterial({ color: 0x2a6fb8 });
  const names = ['Benzina Italia', 'Agip Sole', 'Stazione Lupo', 'Carburanti Rossi', 'Benzina del Sud', 'Stazione Aurora', 'Carburanti Monti', 'Benzina Mare'];
  for (const { r, i } of cand) {
    if (gas.length >= 18) break;
    const a = r.pts[i - 1], b = r.pts[i + 1], p = r.pts[i]; const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const side = rnd() < 0.5 ? 1 : -1, cx = p.x + (-uz) * 24 * side, cz = p.z + ux * 24 * side;
    if (!IE.isLand(cx, cz) || IE.nearRoad(cx, cz) || IE.blockedAt(cx, cz, 14)) continue;
    let ok = true; const h0 = IE.groundH(cx, cz);
    for (const q of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) if (Math.abs(IE.groundH(cx + q[0], cz + q[1]) - h0) > 3) ok = false;
    for (const c of IE.cities) if (Math.hypot(cx - c.x, cz - c.z) < c.r * 0.55) ok = false;
    for (const gs of gas) if (Math.hypot(gs.x - cx, gs.z - cz) < 220) ok = false;
    if (!ok) continue;
    const yaw = Math.atan2(ux, uz), grp = new T.Group(); grp.position.set(cx, h0, cz); grp.rotation.y = yaw; scene.add(grp);
    box(26, 0.3, 24, IE.mat.concrete, 0, 0.1, 0, grp);
    box(16, 0.8, 10, canopyMat, -side * 2, 5.4, 0, grp); box(16.2, 0.3, 10.2, stripe, -side * 2, 4.95, 0, grp);
    for (const px of [-8, 4]) for (const pz of [-4, 4]) box(0.5, 5, 0.5, canopyMat, px - side * 2 + 2, 2.5, pz, grp);
    for (const pz of [-2.5, 2.5]) { box(0.9, 1.6, 0.6, pumpMat, -side * 2, 0.9, pz, grp); box(0.92, 0.3, 0.62, stripe, -side * 2, 1.4, pz, grp); }
    // Shop
    const sx = side * 8, shop = box(8, 4, 12, IE.mat.white, sx, 2, 0, grp); box(8.2, 0.6, 12.2, stripe, sx, 4.2, 0, grp);
    box(0.1, 2.6, 4, IE.mat.glass, sx - side * 4.05, 1.5, 0, grp);
    const nm = names[gas.length % names.length], st = textTex([{ t: nm.toUpperCase(), f: 'bold 40px Arial' }], 512, 80, '#e0761c', '#fff');
    const sg = new T.Mesh(new T.PlaneGeometry(6, 1), new T.MeshBasicMaterial({ map: st.t })); sg.position.set(sx - side * 4.12, 3.4, 0); sg.rotation.y = -side * Math.PI / 2; grp.add(sg);
    // Preis-Säule
    box(0.4, 7, 0.4, IE.mat.dark, side * 11, 3.5, -10, grp); box(2.4, 2.4, 0.4, stripe, side * 11, 7.5, -10, grp);
    grp.updateMatrixWorld(true);
    const c1 = grp.localToWorld(new T.Vector3(sx - 4, 0, -6)), c2 = grp.localToWorld(new T.Vector3(sx + 4, 0, 6));
    IE.addBox(Math.min(c1.x, c2.x), Math.min(c1.z, c2.z), Math.max(c1.x, c2.x), Math.max(c1.z, c2.z), h0 + 4.4);
    const door = grp.localToWorld(new T.Vector3(sx - side * 5.5, 0, 0));
    gas.push({ x: cx, z: cz, door: { x: door.x, z: door.z }, name: nm, cool: 0 });
  }
}

// ================= BANKEN (überfallbar) =================
const banks = []; IE.banks = banks;
function buildBanks(scene) {
  const cand = [];
  for (const r of IE.roads) for (let i = 25; i < r.pts.length - 25; i += 40) cand.push({ r, i });
  cand.sort(() => rnd() - 0.5);
  const marble = new T.MeshStandardMaterial({ color: 0xe8e4d8, metalness: 0.1, roughness: 0.6 }), gold = IE.mat.gold || new T.MeshStandardMaterial({ color: 0xd6b04a, metalness: 0.9, roughness: 0.3 }), dark = new T.MeshLambertMaterial({ color: 0x2a2a30 });
  const names = ['Banca di Roma', 'Banca Napoli', 'Banca Lombarda', 'Banca del Sud', 'Banca Veneta', 'Banca Toscana'];
  for (const { r, i } of cand) {
    if (banks.length >= 6) break;
    const a = r.pts[i - 1], b = r.pts[i + 1], p = r.pts[i]; const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const side = rnd() < 0.5 ? 1 : -1, cx = p.x + (-uz) * 26 * side, cz = p.z + ux * 26 * side;
    if (!IE.isLand(cx, cz) || IE.nearRoad(cx, cz) || IE.blockedAt(cx, cz, 16)) continue;
    let ok = true; const h0 = IE.groundH(cx, cz);
    for (const q of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) if (Math.abs(IE.groundH(cx + q[0], cz + q[1]) - h0) > 3) ok = false;
    for (const gs of gas) if (Math.hypot(gs.x - cx, gs.z - cz) < 150) ok = false;
    for (const bk of banks) if (Math.hypot(bk.x - cx, bk.z - cz) < 400) ok = false;
    if (!ok) continue;
    const yaw = Math.atan2(ux, uz), grp = new T.Group(); grp.position.set(cx, h0, cz); grp.rotation.y = yaw; scene.add(grp);
    box(22, 10, 16, marble, 0, 5, 0, grp);
    box(23, 1.2, 17, gold, 0, 10.4, 0, grp);
    // Säulen vorne
    for (const px of [-8, -4, 0, 4, 8]) box(1.2, 8, 1.2, marble, px, 4, side * 8.4, grp);
    box(20, 2.2, 1.5, gold, 0, 9, side * 8.4, grp);
    // Eingang / Tresortür
    const door3 = box(4, 5, 0.6, dark, 0, 2.5, side * 8.7, grp);
    box(2.4, 2.4, 0.3, gold, 0, 3.2, side * 8.9, grp);
    const sg = new T.Mesh(new T.PlaneGeometry(14, 2.4), new T.MeshBasicMaterial({ map: textTex([{ t: (names[banks.length % names.length]).toUpperCase(), f: 'bold 44px Arial' }], 512, 90, '#1a2a4a', '#f2c230').t }));
    sg.position.set(0, 7.2, side * 8.5); if (side < 0) sg.rotation.y = Math.PI; grp.add(sg);
    // €-Symbol
    const es = new T.Mesh(new T.PlaneGeometry(2.4, 2.4), new T.MeshBasicMaterial({ map: textTex([{ t: '€', f: 'bold 120px Arial' }], 128, 128, 'rgba(0,0,0,0)', '#f2c230').t, transparent: true }));
    es.position.set(0, 9, side * 8.6); if (side < 0) es.rotation.y = Math.PI; grp.add(es);
    grp.updateMatrixWorld(true);
    const c1 = grp.localToWorld(new T.Vector3(-11, 0, -8)), c2 = grp.localToWorld(new T.Vector3(11, 0, 8));
    IE.addBox(Math.min(c1.x, c2.x), Math.min(c1.z, c2.z), Math.max(c1.x, c2.x), Math.max(c1.z, c2.z), h0 + 10);
    const door = grp.localToWorld(new T.Vector3(0, 0, side * 10.5));
    banks.push({ x: cx, z: cz, door: { x: door.x, z: door.z }, name: names[banks.length % names.length], cool: 0 });
  }
}
function nearBank(pos) { for (const s of banks) if (Math.hypot(pos.x - s.door.x, pos.z - s.door.z) < 7) return s; return null; }
let bankRob = null;
function updateBankRob(dt) {
  if (!bankRob) return;
  const g = G(), P = g.P, s = bankRob.s;
  if (g.game.dead || P.veh || Math.hypot(P.pos.x - s.door.x, P.pos.z - s.door.z) > 14) { bankRob = null; g.toast('Banküberfall abgebrochen', 2); if (!g.mission.active) $('obj').hidden = true; return; }
  bankRob.t += dt; const pc = Math.min(1, bankRob.t / 14);
  // Fahndung steigt während des Überfalls bis 5
  g.setWanted(Math.max(g.game.wanted, Math.min(5, 3 + pc * 2)));
  if (!g.mission.active) { $('obj').hidden = false; $('obj').innerHTML = `<small>🏦 Banküberfall · ${s.name}</small>Tresor wird geknackt … ${Math.round(pc * 100)} %`; }
  if (pc >= 1) {
    const cash = 3000000 + Math.round(rnd() * 2000000);
    g.addMoney(cash); g.setWanted(5); s.cool = g.game.time + 600;
    g.banner('🏦 Banküberfall geschafft!', s.name, '+ ' + g.fmt(cash) + ' · 5 Sterne – entkomme der Armee!', 5); g.sfx('cash');
    bankRob = null; if (!g.mission.active) $('obj').hidden = true;
  }
}
IE.bankActive = () => !!bankRob;

// ================= VILLEN =================
function megaExtras(g, s, v, y, M) {
  for (const sx of [-1, 1]) { IE.addBox(v.x + sx * 13 * s - 3 * s, v.z - 8.5 * s, v.x + sx * 13 * s + 3 * s, v.z + 0.5 * s, y + 9.5); IE.addBox(v.x + sx * 15.5 * s - 3.3, v.z - 8 * s - 3.3, v.x + sx * 15.5 * s + 3.3, v.z - 8 * s + 3.3, y + 21); }
  // dritte Etage, Seitenflügel mit Türmen, Springbrunnen, Hubschrauberlandeplatz, Tennisplatz
  box(10 * s, 4.5, 6 * s, M.wall, -1.5 * s, 13.6, -4.5 * s, g); box(11 * s, 0.5, 7 * s, M.roof, -1.5 * s, 16.1, -4.5 * s, g);
  for (let k = -1; k <= 1; k++) box(2.2 * s, 2.8, 0.1, IE.mat.glass, k * 2.6 * s - 1.5 * s, 13.6, -1.45 * s, g);
  for (const sx of [-1, 1]) {
    box(6 * s, 9, 9 * s, M.wall, sx * 13 * s, 4.5, -4 * s, g); box(6.6 * s, 0.5, 9.6 * s, M.roof, sx * 13 * s, 9.2, -4 * s, g);
    const tw = new T.Mesh(new T.CylinderGeometry(2.2 * s / 2, 2.2 * s / 2, 16, 16), M.wall); tw.position.set(sx * 15.5 * s, 8, -8 * s); g.add(tw);
    const cap = new T.Mesh(new T.ConeGeometry(2.6 * s / 2, 5, 16), M.roof); cap.position.set(sx * 15.5 * s, 18.5, -8 * s); g.add(cap);
    for (let k = -1; k <= 1; k++) box(1.8 * s, 3, 0.1, IE.mat.glass, sx * 13 * s + k * 1.8 * s, 3, 0.55 * s, g);
  }
  const fb = new T.Mesh(new T.CylinderGeometry(3 * s / 2, 3.4 * s / 2, 0.8, 24), M.marble); fb.position.set(-7 * s, 0.4, 9 * s); g.add(fb);
  const fw = new T.Mesh(new T.CylinderGeometry(2.6 * s / 2, 2.6 * s / 2, 0.2, 24), new T.MeshStandardMaterial({ color: 0x3ec5e0, roughness: 0.1 })); fw.position.set(-7 * s, 0.85, 9 * s); g.add(fw);
  const fc = new T.Mesh(new T.CylinderGeometry(0.4, 0.6, 3, 10), M.marble); fc.position.set(-7 * s, 1.5, 9 * s); g.add(fc);
  const pad = new T.Mesh(new T.CylinderGeometry(7, 7, 0.3, 28), new T.MeshLambertMaterial({ color: 0x5a5c60 })); pad.position.set(16 * s, 0.2, 8 * s); g.add(pad);
  const hm = new T.Mesh(new T.PlaneGeometry(5, 6), new T.MeshBasicMaterial({ color: 0xf2f2ee })); hm.rotation.x = -Math.PI / 2; hm.position.set(16 * s, 0.37, 8 * s); g.add(hm);
  box(10, 0.1, 18, new T.MeshLambertMaterial({ color: 0x3a6fb0 }), -14 * s, 0.1, 7 * s, g); box(10, 1, 0.1, M.wall, -14 * s, 0.5, 7 * s, g);
}
const villaSigns = {};
function buildVillas(scene) {
  const road = openPolyline(IE.villaRoad, 3); withDirs(road, false);
  IE.villaRoadPts = road;
  scene.add(new T.Mesh(ribbon(road, -4.5, 4.5, 0.12, false), new T.MeshLambertMaterial({ color: 0x46484c })));
  if (IE.extraVillaRoads) for (const er of IE.extraVillaRoads) { const r2 = openPolyline(er.pts, 3); withDirs(r2, false); scene.add(new T.Mesh(ribbon(r2, -4.5, 4.5, 0.12, false), new T.MeshLambertMaterial({ color: 0x46484c }))); }
  const wallMat = new T.MeshLambertMaterial({ color: 0xd9c8a3 });
  // Mauer talseitig entlang der Panoramastraße
  for (let i = 0; i < road.length; i += 3) { const p = road[i]; if (p.s < 150) continue; const x = p.x + p.dz * 5.2, z = p.z - p.dx * 5.2; const m = box(0.5, 1, 3.2, wallMat, x, IE.groundH(x, z) + 0.5, z, scene); m.rotation.y = Math.atan2(p.dx, p.dz); }
  const pal = (x, z, s) => { const y = IE.groundH(x, z), g = new T.Group(); g.position.set(x, y, z); scene.add(g);
    box(0.35, 6 * s, 0.35, new T.MeshLambertMaterial({ color: 0x7a5a3a }), 0, 3 * s, 0, g);
    for (let k = 0; k < 6; k++) { const l = box(0.4, 0.15, 3.2 * s, new T.MeshLambertMaterial({ color: 0x3f7a35 }), 0, 6 * s, 1.4 * s, null); const pv = new T.Group(); pv.position.y = 0; pv.rotation.y = k / 6 * Math.PI * 2; l.rotation.x = 0.35; pv.add(l); g.add(pv); } };
  const roofMat = new T.MeshLambertMaterial({ color: 0xb75a32 }), poolMat = new T.MeshStandardMaterial({ color: 0x3ec5e0, roughness: 0.1, metalness: 0.2 });
  for (const v of IE.villas) {
    const y = v.h !== undefined ? v.h : IE.villaRoadH + 1.5, s = v.s, g = new T.Group(); g.position.set(v.x, y, v.z); scene.add(g);
    const M = v.mats = { wall: IE.mat.white.clone(), roof: roofMat.clone(), trim: IE.mat.travertine.clone(), marble: IE.mat.marble.clone() }; v.group = g;
    if (v.mega) megaExtras(g, s, v, y, M);
    // Hauptgebäude: 2 Etagen + Dachterrasse, Front (Glas) Richtung Meer (+z)
    box(18 * s, 6, 10 * s, M.wall, 0, 3, -3 * s, g);
    box(14 * s, 5, 8 * s, M.wall, -1.5 * s, 8.5, -4 * s, g);
    box(19 * s, 0.5, 11 * s, M.roof, 0, 6.2, -3 * s, g); box(15 * s, 0.5, 9 * s, M.trim, -1.5 * s, 11.2, -4 * s, g);
    for (const sx of [-1, 1]) box(0.3, 1, 9 * s, IE.mat.glass, -1.5 * s + sx * 7.4 * s, 12, -4 * s, g);
    box(15 * s, 1, 0.3, IE.mat.glass, -1.5 * s, 12, 0.4 * s, g);
    for (let k = -3; k <= 3; k++) box(2.1 * s, 3.6, 0.1, IE.mat.glass, k * 2.5 * s, 2.7, 2.05 * s, g);
    for (let k = -2; k <= 2; k++) box(2.2 * s, 3, 0.1, IE.mat.glass, k * 2.7 * s - 1.5 * s, 8.4, 0.05 * s, g);
    // Säulen + Balkon
    for (let k = -2; k <= 2; k++) box(0.5, 6, 0.5, M.marble, k * 4.2 * s, 3, 2.6 * s, g);
    box(18 * s, 0.4, 2 * s, M.marble, 0, 6.3, 3 * s, g);
    // Terrasse, Pool, Liegen
    box(20 * s, 0.3, 9 * s, M.trim, 0, 0.15, 6.5 * s, g);
    box(10 * s, 0.25, 5 * s, poolMat, 3.5 * s, 0.25, 7 * s, g);
    for (let k = 0; k < 3; k++) box(0.9, 0.35, 2, M.wall, -6 * s + k * 1.6, 0.45, 6.5 * s, g);
    for (const sx of [-1, 1]) box(0.4, 1.1, 9 * s, M.trim, sx * 10 * s, 0.6, 6.5 * s, g);
    box(20 * s, 1.1, 0.4, M.trim, 0, 0.6, 11 * s, g);
    // Garage
    box(7 * s, 3.5, 6 * s, M.wall, 12 * s, 1.75, -4 * s, g); box(5 * s, 2.8, 0.1, IE.mat.dark, 12 * s, 1.4, -0.95 * s, g);
    // Tor mit Namensschild (zur Straße)
    const gz = v.side === 'n' ? 11.3 * s : -9.5 * s, gx = v.side === 'n' ? -6 * s : 4 * s;
    const st = textTex([], 512, 160, '#1b1b1b', '#d9b45a');
    const sm = new T.Mesh(new T.PlaneGeometry(4.2, 1.3), new T.MeshBasicMaterial({ map: st.t, side: T.DoubleSide })); sm.position.set(gx + 3, 1.9, gz); if (v.side !== 'n') sm.rotation.y = Math.PI; g.add(sm);
    box(0.6, 3, 0.6, M.trim, gx - 2.2, 1.5, gz, g); box(0.6, 3, 0.6, M.trim, gx + 2.2, 1.5, gz, g); box(5, 0.5, 0.6, M.trim, gx, 3.2, gz, g);
    villaSigns[v.id] = { st, v };
    pal(v.x - 11 * s, v.z + 10 * s, 1.2); pal(v.x + 11 * s, v.z + 10 * s, 1.3); pal(v.x + 13 * s, v.z - 9 * s, 1.1);
    IE.addBox(v.x - 9 * s, v.z - 8 * s, v.x + 9 * s, v.z + 2 * s, y + 12.5);
    IE.addBox(v.x + 8.5 * s, v.z - 7 * s, v.x + 15.5 * s, v.z - 1 * s, y + 3.6);
    v.gate = { x: v.x + gx, z: v.z + gz + (v.side === 'n' ? 2.5 : -2.5) }; v.y = y;
    v.door = { x: v.x, z: v.z + 2.6 * s }; // Haustür (Terrassenseite)
  }
  drawVillaSigns();
}
function drawVillaSigns() {
  const S = G() && G().S;
  for (const id in villaSigns) {
    const { st, v } = villaSigns[id], g = st.g, other = typeof ownedByOther === 'function' && ownedByOther(v), own = S && (S.villas || []).includes(id) && !other;
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#d9b45a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 46px Georgia'; g.fillText(v.name, 256, 52);
    g.font = 'bold 34px Arial'; const myNick = (window.IEaccount && IEaccount.nick) || 'dir', owner = own ? myNick : other ? other.nick : null;
    g.fillStyle = own ? '#48e07a' : other ? '#ff9a7a' : '#f3ead8'; g.fillText(owner ? 'GEHÖRT ' + String(owner).toUpperCase().slice(0, 16) : 'ZU VERKAUFEN · ' + (v.price / 1e6).toLocaleString('de-DE') + ' Mio. €', 256, 116);
    ownerLabel(v, owner, own);
    st.t.needsUpdate = true;
  }
}
IE.drawVillaSigns = drawVillaSigns;
// schwebendes Namensschild über jeder Villa: wem sie gehört (für alle sichtbar)
function ownerLabel(v, owner, own) {
  if (!v.group) return;
  const key = (owner || '') + '|' + !!own; if (v.labelKey === key) return; v.labelKey = key;
  if (v.label) { v.group.remove(v.label); v.label.material.map.dispose(); v.label.material.dispose(); v.label = null; }
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(13,15,19,0.78)'; x.fillRect(0, 10, 512, 108); x.fillStyle = owner ? (own ? '#48e07a' : '#d9b45a') : '#9aa0a8'; x.fillRect(0, 10, 10, 108);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#d9b45a'; x.font = 'bold 34px Georgia'; x.fillText(v.name, 261, 42);
  x.fillStyle = owner ? '#ffffff' : '#c8c8c8'; x.font = 'bold 40px Arial'; x.fillText(owner ? '🏠 Gehört ' + String(owner).slice(0, 16) : 'Zu verkaufen · ' + (v.price / 1e6).toLocaleString('de-DE') + ' Mio. €', 261, 88);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: true, transparent: true }));
  const s = v.s; sp.scale.set(14 * Math.min(s, 2), 3.5 * Math.min(s, 2), 1); sp.position.set(0, (v.mega ? 26 : 16), -3 * s); v.group.add(sp); v.label = sp;
}

// ================= STRASSE ZUR RENNSTRECKE =================
const extraRoadCells = new Set(); const ERC = 6;
IE.onExtraRoad = (x, z) => extraRoadCells.has(Math.round(x / ERC) + ',' + Math.round(z / ERC));
function buildTrackRoad(scene) {
  const road = openPolyline(IE.trackRoad, 4); withDirs(road, false); IE.trackRoadPts = road;
  // Höhen glätten, damit die Straße nicht jede Bodenwelle mitnimmt
  for (const p of road) p.h = IE.groundH(p.x, p.z);
  scene.add(new T.Mesh(ribbon(road, -5, 5, 0.18, false), new T.MeshLambertMaterial({ color: 0x45474b })));
  scene.add(new T.Mesh(ribbon(road.filter((p, i) => (i % 6) < 3), -0.2, 0.2, 0.21, false), new T.MeshBasicMaterial({ color: 0xf2f2ee })));
  for (const p of road) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) extraRoadCells.add((Math.round(p.x / ERC) + dx) + ',' + (Math.round(p.z / ERC) + dz));
  // Wegweiser
  const sgn = textTex([{ t: '🏁 AUTODROMO', f: 'bold 54px Arial' }, { t: '→ ' + Math.round(road[road.length - 1].s / 100) / 10 + ' km', f: 'bold 40px Arial' }], 512, 200, '#1f4fb0', '#fff');
  const p0 = road[3], sm = new T.Mesh(new T.PlaneGeometry(5, 2), new T.MeshBasicMaterial({ map: sgn.t, side: T.DoubleSide }));
  sm.position.set(p0.x + p0.dz * 7, IE.groundH(p0.x, p0.z) + 3.4, p0.z - p0.dx * 7); sm.rotation.y = Math.atan2(p0.dx, p0.dz); scene.add(sm);
  box(0.25, 3, 0.25, IE.mat.dark, sm.position.x, sm.position.y - 1.5, sm.position.z, scene);
}
IE.buildExtras = function (scene) {
  try { buildTrackRoad(scene); } catch (e) { console.error('Straße', e); }
  try { buildBackrooms(scene); } catch (e) { console.error('Backrooms', e); }
  try { buildRocket(scene); } catch (e) { console.error('Rakete', e); }
  try { buildMoon(scene); } catch (e) { console.error('Mond', e); }
  try { buildDubai(scene); } catch (e) { console.error('Dubai', e); }
  try { buildTrack(scene); } catch (e) { console.error('Strecke', e); }
  try { buildVillas(scene); IE.villas.forEach((v, i) => buildRoom(v, i, scene)); } catch (e) { console.error('Villen', e); }
  try { buildIslands(scene); } catch (e) { console.error('Inseln', e); }
  try { buildGas(scene); } catch (e) { console.error('Tankstellen', e); }
  try { buildBanks(scene); } catch (e) { console.error('Banken', e); }
};


// ================= GEBÄUDESCHÄDEN: Einschusslöcher & Brandflecken =================
const holes = [], scorches = [];
let holeMat = null, scorchMat = null;
function decalMats() {
  if (holeMat) return;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(20,18,16,0.95)'); gr.addColorStop(0.6, 'rgba(60,55,50,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(30,28,25,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, 32); const a = Math.random() * 6.3, l = 14 + Math.random() * 14; g.lineTo(32 + Math.cos(a) * l, 32 + Math.sin(a) * l); g.stroke(); }
  holeMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const c2 = document.createElement('canvas'); c2.width = c2.height = 128; const g2 = c2.getContext('2d');
  const gr2 = g2.createRadialGradient(64, 64, 4, 64, 64, 62); gr2.addColorStop(0, 'rgba(5,5,5,0.95)'); gr2.addColorStop(0.5, 'rgba(15,12,10,0.8)'); gr2.addColorStop(0.8, 'rgba(30,25,20,0.35)'); gr2.addColorStop(1, 'rgba(0,0,0,0)');
  g2.fillStyle = gr2; g2.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { g2.fillStyle = 'rgba(0,0,0,' + (0.2 + Math.random() * 0.4) + ')'; const a = Math.random() * 6.3, r = 30 + Math.random() * 30; g2.beginPath(); g2.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + Math.random() * 6, 0, 7); g2.fill(); }
  scorchMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c2), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
}
const holeGeo = new T.PlaneGeometry(0.5, 0.5);
// Fläche eines Gebäude-Kolliders am Trefferpunkt bestimmen (Normale)
function boxNormal(p) {
  let best = null, bd = 0.4;
  for (const b of IE.collAt(p.x, p.z)) {
    if (b.t !== 'box' || p.y > b.top + 0.3 || p.y < b.bottom - 0.3) continue;
    if (p.x < b.minx - 0.3 || p.x > b.maxx + 0.3 || p.z < b.minz - 0.3 || p.z > b.maxz + 0.3) continue;
    for (const [d, n] of [[Math.abs(p.x - b.minx), [-1, 0, 0]], [Math.abs(p.x - b.maxx), [1, 0, 0]], [Math.abs(p.z - b.minz), [0, 0, -1]], [Math.abs(p.z - b.maxz), [0, 0, 1]], [Math.abs(p.y - b.top), [0, 1, 0]]])
      if (d < bd) { bd = d; best = n; }
  }
  return best;
}
IE.addBulletHole = function (p, dir) {
  const g = G(); if (!g) return; decalMats();
  const n = boxNormal(p); if (!n) return;
  const m = new T.Mesh(holeGeo, holeMat), nv = new T.Vector3(n[0], n[1], n[2]);
  m.position.copy(p).addScaledVector(nv, 0.03); m.lookAt(m.position.clone().add(nv)); m.rotation.z = Math.random() * 6.3; m.scale.setScalar(0.7 + Math.random() * 0.6);
  g.scene.add(m); holes.push(m); if (holes.length > 240) g.scene.remove(holes.shift());
  // kleine Staubwolke
  const d = new T.Mesh(new T.SphereGeometry(0.15, 6, 4), new T.MeshBasicMaterial({ color: 0xb8ad9a, transparent: true, opacity: 0.7 })); d.position.copy(m.position); g.scene.add(d);
  let t = 0; const iv = setInterval(() => { t += 0.05; d.scale.setScalar(1 + t * 8); d.material.opacity = 0.7 * (1 - t / 0.5); if (t >= 0.5) { clearInterval(iv); g.scene.remove(d); d.geometry.dispose(); d.material.dispose(); } }, 50);
};
IE.addScorch = function (p, radius) {
  const g = G(); if (!g) return; decalMats();
  const r = Math.max(2, radius * 0.8), gy = IE.supportH(p.x, p.z, p.y + 1);
  const add = (pos, nv, size) => { const m = new T.Mesh(new T.PlaneGeometry(size * 2, size * 2), scorchMat); m.position.copy(pos).addScaledVector(nv, 0.05); m.lookAt(m.position.clone().add(nv)); m.rotation.z = Math.random() * 6.3; g.scene.add(m); scorches.push(m); if (scorches.length > 60) g.scene.remove(scorches.shift()); };
  if (p.y - gy < radius) add(new T.Vector3(p.x, gy, p.z), new T.Vector3(0, 1, 0), r);
  // Wände in der Nähe schwärzen
  const seen = new Set();
  for (const b of IE.collAt(p.x, p.z).concat(IE.collAt(p.x + r, p.z), IE.collAt(p.x - r, p.z), IE.collAt(p.x, p.z + r), IE.collAt(p.x, p.z - r))) {
    if (b.t !== 'box' || seen.has(b) || b.top < p.y - 1 || b.bottom > p.y + 2) continue; seen.add(b);
    const cx = Math.max(b.minx, Math.min(b.maxx, p.x)), cz = Math.max(b.minz, Math.min(b.maxz, p.z)), d = Math.hypot(p.x - cx, p.z - cz);
    if (d > r || d < 0.01) continue;
    const nv = new T.Vector3(p.x - cx, 0, p.z - cz).normalize();
    add(new T.Vector3(cx, Math.max(p.y, gy + r * 0.6), cz), nv, r * 0.9);
  }
};
// ================= BACKROOMS (geheimer Sprung-Punkt) =================
const BR = { x: 4300, z: 0, y: 400, n: 16, cell: 8 };
BR.W = BR.n * BR.cell; BR.D = BR.n * BR.cell;
// Hubschrauberlandeplatz der Tenuta Toscana (die Stelle vom Foto)
IE.backroomsSpot = (() => { const v = IE.villas.find(v => v.id === 'm2'); return { x: v.x + 16 * v.s, z: v.z + 8 * v.s }; })();
function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let brChest = null;
function buildBackrooms(scene) {
  const n = BR.n, c = BR.cell, x0 = BR.x - BR.W / 2, z0 = BR.z - BR.D / 2, y = BR.y, H = 4;
  const wallMat = new T.MeshLambertMaterial({ color: 0xd6c56c }), floorMat = new T.MeshLambertMaterial({ color: 0xb3a156 }), ceilMat = new T.MeshLambertMaterial({ color: 0xd8d0a0 });
  const fl = box(BR.W, 1, BR.D, floorMat, BR.x, y - 0.5, BR.z, scene); IE.addBox(x0, z0, x0 + BR.W, z0 + BR.D, y, y - 1);
  box(BR.W, 0.3, BR.D, ceilMat, BR.x, y + H + 0.15, BR.z, scene);
  // Labyrinth (immer gleich)
  const rnd2 = seeded(424242), vis = new Uint8Array(n * n), wallE = new Uint8Array(n * n).fill(1), wallS = new Uint8Array(n * n).fill(1);
  const stack = [[0, n - 1]]; vis[(n - 1) * n] = 1;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1], nb = [];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < n && b < n && !vis[b * n + a]) nb.push([a, b, di, dj]); }
    if (!nb.length) { stack.pop(); continue; }
    const [a, b, di, dj] = nb[(rnd2() * nb.length) | 0]; vis[b * n + a] = 1;
    if (di === 1) wallE[j * n + i] = 0; if (di === -1) wallE[j * n + a] = 0; if (dj === 1) wallS[j * n + i] = 0; if (dj === -1) wallS[b * n + i] = 0;
    stack.push([a, b]);
  }
  for (let k = 0; k < n * n / 6; k++) { const i = (rnd2() * (n - 1)) | 0, j = (rnd2() * (n - 1)) | 0; if (rnd2() < 0.5) wallE[j * n + i] = 0; else wallS[j * n + i] = 0; } // ein paar Schleifen
  const walls = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (i < n - 1 && wallE[j * n + i]) walls.push([x0 + (i + 1) * c, z0 + j * c + c / 2, 0.6, c + 0.6]);
    if (j < n - 1 && wallS[j * n + i]) walls.push([x0 + i * c + c / 2, z0 + (j + 1) * c, c + 0.6, 0.6]);
  }
  walls.push([x0, BR.z, 0.6, BR.D], [x0 + BR.W, BR.z, 0.6, BR.D], [BR.x, z0, BR.W, 0.6]);
  walls.push([x0 + c + BR.W / 2, z0 + BR.D, BR.W - c, 0.6]); // Südwand mit Tür in der ersten Zelle
  const im = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), wallMat, walls.length), M4 = new T.Matrix4();
  walls.forEach((w, k) => { M4.makeScale(w[2], H, w[3]); M4.setPosition(w[0], y + H / 2, w[1]); im.setMatrixAt(k, M4); IE.addBox(w[0] - w[2] / 2, w[1] - w[3] / 2, w[0] + w[2] / 2, w[1] + w[3] / 2, y + H, y - 1); });
  scene.add(im);
  // Neonröhren
  const lm = new T.InstancedMesh(new T.BoxGeometry(2.2, 0.08, 0.5), new T.MeshBasicMaterial({ color: 0xfffbe0 }), n * n); let li = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if ((i + j) % 2 === 0) { M4.makeTranslation(x0 + i * c + c / 2, y + H - 0.05, z0 + j * c + c / 2); lm.setMatrixAt(li++, M4); }
  lm.count = li; scene.add(lm);
  // Ausgang (Tür) in der Südwand bei Zelle (0, n-1)
  const door = { x: x0 + c / 2, z: z0 + BR.D - 1.8 };
  box(3, 3.2, 0.2, new T.MeshBasicMaterial({ color: 0x1a1410 }), door.x, y + 1.6, z0 + BR.D + 0.15, scene);
  const ex = textTex([{ t: 'EXIT', f: 'bold 80px Arial' }], 256, 100, '#0b3d1a', '#5dff7a');
  const exm = new T.Mesh(new T.PlaneGeometry(1.6, 0.6), new T.MeshBasicMaterial({ map: ex.t })); exm.position.set(door.x, y + 3.6, z0 + BR.D - 0.35); exm.rotation.y = Math.PI; scene.add(exm);
  // Truhe in der entferntesten Ecke
  const cx = x0 + (n - 1) * c + c / 2, cz = z0 + c / 2, ch = new T.Group(); ch.position.set(cx, y, cz); scene.add(ch);
  box(1.6, 0.9, 1, new T.MeshLambertMaterial({ color: 0x6b4423 }), 0, 0.45, 0, ch); const lid = box(1.64, 0.35, 1.04, new T.MeshLambertMaterial({ color: 0x7a5030 }), 0, 1.05, 0, ch);
  box(1.66, 0.12, 0.2, IE.mat.gold, 0, 0.7, 0.45, ch); box(0.3, 0.3, 0.06, IE.mat.gold, 0, 0.75, 0.53, ch);
  const glow = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), new T.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.6 })); glow.position.y = 1.2; ch.add(glow);
  IE.addBox(cx - 0.8, cz - 0.5, cx + 0.8, cz + 0.5, y + 1.2, y - 1);
  brChest = { x: cx, z: cz, lid, glow };
  IE.interiors.backrooms = { type: 'backrooms', name: 'Backrooms', x: BR.x, z: BR.z, y, W: BR.W, D: BR.D, door, counter: { x: 1e9, z: 1e9 }, item: { x: cx, z: cz }, spots: [] };

}
function updateBackrooms(dt) {
  const g = G(), P = g.P, S = g.S;
  if (brChest) { const open = !!S.backroomsLoot; brChest.lid.rotation.x = open ? -1.1 : 0; brChest.lid.position.z = open ? -0.35 : 0; brChest.glow.visible = !open; }
  if (P.interior || P.veh || g.game.dead || P.fly) return;
  const sp = IE.backroomsSpot;
  if (P.vy > 4 && Math.hypot(P.pos.x - sp.x, P.pos.z - sp.z) < 3.2 && !updateBackrooms.cool) {
    updateBackrooms.cool = true; setTimeout(() => updateBackrooms.cool = false, 3000);
    g.enterInterior('backrooms', sp.x + 4, sp.z + 4, null); g.banner('???', 'Die Backrooms', 'Irgendwo hier ist eine Truhe … finde den Ausgang (EXIT)', 5); g.sfx('fail');
  }
}

// ================= MONDRAKETE + MOND =================
const RK = IE.rocket; let rocket = null, launch = null, boardTex = null;
const MOON = { x: 12000, z: 0, base: 60, R: 1700 };
IE.onMoon = false;
function rocketGroup(scale) {
  const g = new T.Group(), s = scale || 1, white = new T.MeshLambertMaterial({ color: 0xf4f4f0 }), black = new T.MeshLambertMaterial({ color: 0x1a1a1a });
  const cyl = (r1, r2, h, m, y) => { const c = new T.Mesh(new T.CylinderGeometry(r1 * s, r2 * s, h * s, 24), m); c.position.y = y * s; g.add(c); return c; };
  cyl(8, 8, 70, white, 35); cyl(8.05, 8.05, 6, black, 20); cyl(8.05, 8.05, 6, black, 60);
  cyl(6.5, 8, 6, white, 73); cyl(6.5, 6.5, 40, white, 96); cyl(6.55, 6.55, 4, black, 110);
  cyl(5, 6.5, 5, white, 118.5); cyl(5, 5, 22, white, 132); cyl(2.5, 5, 10, IE.mat.dark, 148); cyl(0.4, 2.5, 14, white, 160);
  for (let k = 0; k < 4; k++) { const f = new T.Mesh(new T.BoxGeometry(0.8 * s, 16 * s, 8 * s), black); const a = k * Math.PI / 2; f.position.set(Math.sin(a) * 9 * s, 8 * s, Math.cos(a) * 9 * s); f.rotation.y = a; g.add(f); }
  for (let k = 0; k < 5; k++) { const e = new T.Mesh(new T.CylinderGeometry(1.4 * s, 2.4 * s, 5 * s, 12), IE.mat.dark); const a = k / 5 * Math.PI * 2; e.position.set(Math.sin(a) * 4 * s * (k ? 1 : 0), -2.5 * s, Math.cos(a) * 4 * s * (k ? 1 : 0)); g.add(e); }
  const fl = textTex([{ t: 'ITALIA', f: 'bold 90px Arial' }], 512, 128, '#f4f4f0', '#1f4fb0'); const lab = new T.Mesh(new T.CylinderGeometry(6.56 * s, 6.56 * s, 10 * s, 24, 1, true, -0.5, 1), new T.MeshBasicMaterial({ map: fl.t })); lab.position.y = 92 * s; g.add(lab);
  return g;
}
function buildRocket(scene) {
  const y = RK.h, pad = box(70, 2, 70, IE.mat.concrete, RK.x, y - 0.9, RK.z, scene);
  rocket = rocketGroup(1); rocket.position.set(RK.x, y + 5, RK.z); scene.add(rocket);
  // Startturm
  const red = new T.MeshLambertMaterial({ color: 0xc8372d });
  const tx = RK.x + 20, tz = RK.z;
  for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) box(1, 175, 1, red, tx + ox, y + 87.5, tz + oz, scene);
  for (let h = 10; h < 175; h += 12) { box(9, 0.6, 0.6, red, tx, y + h, tz - 4, scene); box(9, 0.6, 0.6, red, tx, y + h, tz + 4, scene); box(0.6, 0.6, 9, red, tx - 4, y + h, tz, scene); box(0.6, 0.6, 9, red, tx + 4, y + h, tz, scene); }
  for (const h of [70, 110, 140]) box(12, 1, 2, red, tx - 9, y + h, tz, scene);
  IE.addBox(tx - 5, tz - 5, tx + 5, tz + 5, y + 175); IE.addBox(RK.x - 9, RK.z - 9, RK.x + 9, RK.z + 9, y + 170);
  // Countdown-Tafel (Richtung Süden / Mailand)
  boardTex = textTex([], 1024, 360, '#0b0d12', '#f2c230');
  const bx = RK.x, bz = RK.z + 50;
  for (const ox of [-20, 20]) box(1.2, 26, 1.2, IE.mat.dark, bx + ox, y + 13, bz, scene);
  const bm = new T.Mesh(new T.PlaneGeometry(42, 15), new T.MeshBasicMaterial({ map: boardTex.t, side: T.DoubleSide })); bm.position.set(bx, y + 24, bz); scene.add(bm);
  drawBoard();
  IE.rocketBoard = { x: bx, z: bz };
}
const fmtCD = ms => { if (ms <= 0) return 'BEREIT ZUM START'; const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (d ? d + ' T  ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); };
IE.moonOpen = () => Date.now() >= RK.launch || !!IE.moonUnlocked;
IE.drawRocketBoard = () => drawBoard();
const isAdm = () => !!(window.IEaccount && IEaccount.admin);
function drawBoard() {
  if (!boardTex) return; const g = boardTex.g, open = IE.moonOpen();
  g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 1024, 360); g.strokeStyle = '#f2c230'; g.lineWidth = 8; g.strokeRect(8, 8, 1008, 344);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3ead8'; g.font = 'bold 54px Arial'; g.fillText('MISSIONE LUNA', 512, 70);
  g.fillStyle = open ? '#48e07a' : '#f2c230'; g.font = 'bold 110px Courier New, monospace'; g.fillText(fmtCD(open ? 0 : RK.launch - Date.now()), 512, 185);
  g.fillStyle = '#9aa0a8'; g.font = 'bold 36px Arial'; g.fillText(open ? 'Der Mond ist freigeschaltet – steig ein!' : 'Start: 25. November · 16:00 Uhr', 512, 295);
  boardTex.t.needsUpdate = true;
}
// Mond-Gelände
const craters = (() => { const r = seeded(777), out = []; for (let k = 0; k < 70; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * MOON.R * 0.95; out.push({ x: MOON.x + Math.cos(a) * d, z: MOON.z + Math.sin(a) * d, r: 18 + Math.pow(r(), 2) * 160, dep: 0.25 + r() * 0.25 }); } return out; })();
function moonH(x, z) {
  const dx = x - MOON.x, dz = z - MOON.z, d = Math.hypot(dx, dz);
  let h = MOON.base + Math.sin(x * 0.004) * 6 + Math.cos(z * 0.0047) * 6 + Math.sin((x + z) * 0.011) * 2.5;
  if (d < 120) h = h + (MOON.base - h) * IE.smooth(120, 60, d); // flache Landezone
  for (const c of craters) { const cd = Math.hypot(x - c.x, z - c.z); if (cd > c.r * 1.6) continue; const t = cd / c.r; h += t < 1 ? -c.r * c.dep * (1 - t * t) + c.r * 0.08 : c.r * 0.08 * Math.exp(-((t - 1) * (t - 1)) / 0.08); }
  if (d > MOON.R) h += Math.min(140, Math.pow(d - MOON.R, 1.2) * 0.25); // niedriges Ringgebirge am Rand
  return h;
}
// ================= DUBAI – eigene Map (eigenes Areal, wie der Mond) =================
const DUBAI = { x: -12000, z: 0, base: 2.2, R: 1500 };
IE.DUBAI = DUBAI;
// Wüstenberge im Hinterland (Norden/Westen, hinter der Downtown)
const DUBAI_MTN = [
  { dx: -560, dz: -980, r: 440, h: 185 }, { dx: 220, dz: -1080, r: 400, h: 150 },
  { dx: 760, dz: -760, r: 360, h: 125 }, { dx: -1000, dz: -360, r: 340, h: 110 }, { dx: -300, dz: -600, r: 300, h: 90 }
];
function dubaiH(x, z) {
  const dx = x - DUBAI.x, dz = z - DUBAI.z, d = Math.hypot(dx, dz);
  let h = DUBAI.base + Math.sin(dx * 0.006) * 1.3 + Math.cos(dz * 0.0075) * 1.0 + Math.sin((dx - dz) * 0.013) * 0.5;
  for (const m of DUBAI_MTN) { const md = Math.hypot(dx - m.dx, dz - m.dz); if (md < m.r) { const t = 1 - md / m.r; h += m.h * t * t * (0.75 + 0.25 * Math.sin(dx * 0.03 + dz * 0.02)); } }
  if (d > DUBAI.R) h = Math.min(h, DUBAI.base - (d - DUBAI.R) * 0.09); // Strand -> Golf
  return h < -7 ? -7 : h;
}
IE.dubaiH = dubaiH;
IE.dubaiSpawn = { x: DUBAI.x + 40, z: DUBAI.z + 470 };

const _gh = IE.groundH, _isLand = IE.isLand;
IE.groundH = (x, z) => x > 9000 ? moonH(x, z) : (x < -9000 ? dubaiH(x, z) : _gh(x, z));
IE.isLand = (x, z) => x > 9000 ? true : (x < -9000 ? dubaiH(x, z) > 0.4 : _isLand(x, z));

function buildDubai(scene0) {
  const scene = new T.Group(); scene0.add(scene); IE.dubaiGroup = scene;
  const rnd = seeded(20241121);
  // --- Wüsten-/Sandgelände ---
  const size = 3800, seg = 190, geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + DUBAI.x, z = pos.getZ(i) + DUBAI.z, h = dubaiH(x, z); pos.setY(i, h);
    let s = 0.86 + rnd() * 0.05;
    if (h > 35) { const t = Math.min(1, (h - 35) / 120); col.set([s * (0.74 - t * 0.2), s * (0.6 - t * 0.14), s * (0.46 - t * 0.1)], i * 3); } // Berge: felsig/rötlich
    else col.set([s, s * 0.85, s * 0.58], i * 3); }                                                                                  // Sand
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const tm = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); tm.position.set(DUBAI.x, 0, DUBAI.z); scene.add(tm);
  // --- Golf-Wasser ---
  const water = new T.Mesh(new T.PlaneGeometry(4200, 4200), new T.MeshStandardMaterial({ color: 0x1b8fc0, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(DUBAI.x, 0.05, DUBAI.z); scene.add(water);

  const glass = new T.MeshStandardMaterial({ color: 0x9cc3e0, metalness: 0.5, roughness: 0.08, transparent: true, opacity: 0.72 });
  const glass2 = new T.MeshStandardMaterial({ color: 0x7fb4d6, metalness: 0.6, roughness: 0.1 });
  const conc = IE.mat.concrete, gold = IE.mat.gold, dark = IE.mat.dark, lit = new T.MeshBasicMaterial({ color: 0xffe6a0 });
  const bx = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };

  // Hochhaus mit Kollider
  function tower(x, z, w, dd, h, mat) {
    const y0 = dubaiH(x, z);
    bx(w, h, dd, mat || glass, x, y0 + h / 2, z);
    bx(w * 1.04, 1, dd * 1.04, glass2, x, y0 + h, z);
    bx(w * 0.2, 2.4, dd * 0.2, dark, x, y0 + h + 1.5, z); // Antenne/Technik
    if (rnd() < 0.5) bx(w * 0.5, 0.5, dd * 0.5, lit, x, y0 + h - 2, z);
    IE.addBox(x - w / 2, z - dd / 2, x + w / 2, z + dd / 2, y0 + h);
  }
  // --- Burj Khalifa (zentrales Super-Hochhaus) ---
  (function burj() {
    const x = DUBAI.x, z = DUBAI.z - 120, y0 = dubaiH(x, z); let w = 46, dd = 46, y = y0, seg = 11;
    for (let i = 0; i < seg; i++) { const hh = 24; bx(w, hh, dd, i % 2 ? glass2 : glass, x, y + hh / 2, z); y += hh; w *= 0.86; dd *= 0.86; if (i === 0) IE.addBox(x - 24, z - 24, x + 24, z + 24, y0 + hh * 3); }
    bx(2.4, 70, 2.4, conc, x, y + 35, z); // Spitze
    bx(1, 90, 1, dark, x, y + 90, z);
    bx(5, 5, 5, lit, x, y - 4, z);
  })();

  // --- Downtown: Raster aus Glas-Hochhäusern ---
  for (let gx = -6; gx <= 6; gx++) for (let gz = -5; gz <= 6; gz++) {
    const x = DUBAI.x + gx * 78 + (rnd() - 0.5) * 14, z = DUBAI.z + gz * 78 + (rnd() - 0.5) * 14;
    if (Math.hypot(x - DUBAI.x, z - (DUBAI.z - 120)) < 70) continue; // Platz um Burj
    if (Math.abs(x - DUBAI.x) < 16) continue; // Boulevard frei
    const w = 20 + rnd() * 20, dd = 20 + rnd() * 18, h = 40 + Math.pow(rnd(), 1.4) * 150;
    tower(x, z, w, dd, h, rnd() < 0.3 ? glass2 : glass);
  }
  // --- Sheikh-Zayed-Boulevard (breite Straße durch Downtown) ---
  const road = new T.Mesh(new T.PlaneGeometry(22, 1700), new T.MeshLambertMaterial({ color: 0x3c3f45 }));
  road.rotation.x = -Math.PI / 2; road.position.set(DUBAI.x, dubaiH(DUBAI.x, DUBAI.z) + 0.1, DUBAI.z + 120); scene.add(road);
  for (let z = -680; z < 820; z += 26) { const m = new T.Mesh(new T.PlaneGeometry(0.6, 10), new T.MeshBasicMaterial({ color: 0xd8c23a })); m.rotation.x = -Math.PI / 2; m.position.set(DUBAI.x, dubaiH(DUBAI.x, DUBAI.z) + 0.12, DUBAI.z + 120 + z); scene.add(m); }
  // Quer-Straßen
  for (let gz = -4; gz <= 5; gz++) { const r = new T.Mesh(new T.PlaneGeometry(900, 10), new T.MeshLambertMaterial({ color: 0x3c3f45 })); r.rotation.x = -Math.PI / 2; r.position.set(DUBAI.x, dubaiH(DUBAI.x, DUBAI.z) + 0.09, DUBAI.z + gz * 78); scene.add(r); }

  // --- Flughafen (Dubai International) ---
  (function airport() {
    const ax = DUBAI.x + 1060, az = DUBAI.z + 340, y = dubaiH(ax, az);
    const rw = new T.Mesh(new T.PlaneGeometry(46, 620), new T.MeshLambertMaterial({ color: 0x33363c })); rw.rotation.x = -Math.PI / 2; rw.position.set(ax, y + 0.12, az); scene.add(rw);
    for (let z = -290; z < 290; z += 26) { const m = new T.Mesh(new T.PlaneGeometry(1.6, 11), new T.MeshBasicMaterial({ color: 0xf2f2f2 })); m.rotation.x = -Math.PI / 2; m.position.set(ax, y + 0.14, az + z); scene.add(m); }
    IE.dubaiAirport = { x: ax, z: az };
    // Terminal + Kontrollturm
    bx(64, 13, 30, IE.mat.white, ax - 78, y + 6.5, az); IE.addBox(ax - 110, az - 15, ax - 46, az + 15, y + 13);
    for (let k = -4; k <= 4; k++) bx(4, 8, 0.4, glass, ax - 78 + k * 6.6, y + 6, az + 15.2);
    bx(7, 30, 7, conc, ax - 78, y + 15, az - 24); bx(12, 5, 12, glass2, ax - 78, y + 31, az - 24); IE.addBox(ax - 82, az - 28, ax - 74, az - 20, y + 32);
    // Hangar
    bx(42, 20, 46, new T.MeshLambertMaterial({ color: 0xc2c6cc }), ax + 70, y + 10, az); bx(42, 2, 46, IE.mat.dark, ax + 70, y + 20.5, az); IE.addBox(ax + 49, az - 23, ax + 91, az + 23, y + 20);
    // geparktes Flugzeug
    try { const v = IE.spawnPlane(scene0, 'jet', ax, az + 230, 0, y + 0.1); v.owned = false; } catch (e) { }
  })();
  // --- Militärbasis Dubai ---
  (function base() {
    const bx0 = DUBAI.x - 1060, bz0 = DUBAI.z + 640, y = dubaiH(bx0, bz0);
    IE.dubaiBase = { x: bx0, z: bz0, hw: 120, hd: 100 };
    const wall = new T.MeshLambertMaterial({ color: 0x8f917c });
    for (const [wx, wz, ww, wd] of [[0, -100, 240, 6], [0, 100, 240, 6], [-120, 0, 6, 206], [120, 0, 6, 206]]) { bx(ww, 8, wd, wall, bx0 + wx, y + 4, bz0 + wz); IE.addBox(bx0 + wx - ww / 2, bz0 + wz - wd / 2, bx0 + wx + ww / 2, bz0 + wz + wd / 2, y + 8); }
    bx(50, 11, 26, conc, bx0, y + 5.5, bz0 + 40); IE.addBox(bx0 - 25, bz0 + 27, bx0 + 25, bz0 + 53, y + 11);
    bx(9, 20, 9, conc, bx0 - 90, y + 10, bz0 - 70); bx(13, 3, 13, IE.mat.dark, bx0 - 90, y + 21, bz0 - 70); IE.addBox(bx0 - 95, bz0 - 75, bx0 - 85, bz0 - 65, y + 20);
    // Panzer-Deko
    bx(16, 3.4, 9, IE.mat.dark, bx0 + 50, y + 1.7, bz0 - 50); bx(11, 2.4, 5, IE.mat.dark, bx0 + 50, y + 4, bz0 - 50); bx(1.1, 1.1, 11, IE.mat.dark, bx0 + 57, y + 4, bz0 - 50);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#20241a'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#d6b04a'; c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.fillText('SPERRGEBIET', 128, 42);
    const sm = new T.Mesh(new T.PlaneGeometry(14, 3.5), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true })); sm.position.set(bx0, y + 6, bz0 - 103); scene.add(sm);
  })();

  // --- Palmeninsel (Palm Jumeirah, vereinfacht) im Golf ---
  (function palm() {
    const px = DUBAI.x - 150, pz = DUBAI.z + 1250, sand = new T.MeshLambertMaterial({ color: 0xe8d9a8 });
    const trunk = new T.Mesh(new T.BoxGeometry(60, 1.2, 260), sand); trunk.position.set(px, 0.6, pz); scene.add(trunk); IE.addBox(px - 30, pz - 130, px + 30, pz + 130, 1.4);
    for (let i = 0; i < 7; i++) { const fz = pz - 110 + i * 34; for (const s of [-1, 1]) { const fr = new T.Mesh(new T.BoxGeometry(90, 1.2, 12), sand); fr.position.set(px + s * 60, 0.6, fz); fr.rotation.y = s * 0.5; scene.add(fr); } }
    // Luxusvillen auf dem Stamm
    for (let i = 0; i < 6; i++) { const vz = pz - 100 + i * 36; bx(14, 7, 10, IE.mat.white, px, 4, vz); bx(15, 0.5, 11, gold, px, 7.6, vz); }
  })();

  // --- Strand-Palmen ---
  const palmMat = new T.MeshLambertMaterial({ color: 0x3f7a35 }), trunkMat = new T.MeshLambertMaterial({ color: 0x7a5a3a });
  for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, d = 900 + rnd() * 560, x = DUBAI.x + Math.cos(a) * d, z = DUBAI.z + Math.sin(a) * d, yb = dubaiH(x, z); if (yb < 0.6) continue; const g = new T.Group(); g.position.set(x, yb, z); scene.add(g); bx2(g, 0.5, 7, 0.5, trunkMat, 0, 3.5, 0); for (let l = 0; l < 6; l++) { const lf = new T.Mesh(new T.BoxGeometry(0.4, 0.15, 4), palmMat); const pv = new T.Group(); pv.rotation.y = l / 6 * 6.28; lf.position.set(0, 7, 1.8); lf.rotation.x = 0.35; pv.add(lf); g.add(pv); } }
  function bx2(parent, w, h, d, mat, x, y, z) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }

  // --- Dubai-Läden (Autohaus, Waffenladen, Bootsladen) ---
  (function shops() {
    const defs = [['car', 'Autohaus', DUBAI.x + 150, DUBAI.z + 380, 0x3aa0ff], ['weapon', 'Waffenladen', DUBAI.x - 150, DUBAI.z + 380, 0xff4a3a], ['boat', 'Bootsladen', DUBAI.x - 40, DUBAI.z + 1180, 0x1e7fc8]];
    for (const [type, label, sx, sz, mc] of defs) {
      const y = dubaiH(sx, sz), bw = type === 'car' ? 28 : 16, bh = type === 'car' ? 9 : 7, bd = type === 'car' ? 18 : 11;
      bx(bw, bh, bd, type === 'car' ? glass2 : new T.MeshLambertMaterial({ color: 0x6b5a4a }), sx, y + bh / 2, sz); IE.addBox(sx - bw / 2, sz - bd / 2, sx + bw / 2, sz + bd / 2, y + bh);
      const cv2 = document.createElement('canvas'); cv2.width = 256; cv2.height = 64; const cc = cv2.getContext('2d'); cc.fillStyle = '#10131a'; cc.fillRect(0, 0, 256, 64); cc.fillStyle = '#d6b04a'; cc.font = 'bold 26px Arial'; cc.textAlign = 'center'; cc.fillText(label, 128, 42);
      const sg = new T.Mesh(new T.PlaneGeometry(bw * 0.8, bw * 0.2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv2), transparent: true })); sg.position.set(sx, y + bh + 2, sz + bd / 2 + 0.3); scene.add(sg);
      const mx = sx, mz = sz + bd / 2 + 4;
      const shop = { type, id: 'du_' + type, x: sx, z: sz, mx, mz, fixed: true, dubai: true };
      if (type === 'boat') shop.slots = [{ x: sx + 14, z: sz + 10, rot: 0 }, { x: sx - 14, z: sz + 10, rot: 0 }];
      IE.shops.push(shop);
      const mk2 = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.2, 12), new T.MeshBasicMaterial({ color: mc })); mk2.position.set(mx, y + 0.3, mz); scene.add(mk2); IE.markers.push(mk2);
    }
  })();

  // Spawn-Schild
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#10131a'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#d6b04a'; c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.fillText('DUBAI', 128, 44);
  const sign = new T.Mesh(new T.PlaneGeometry(16, 4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true })); sign.position.set(IE.dubaiSpawn.x, dubaiH(IE.dubaiSpawn.x, IE.dubaiSpawn.z) + 9, IE.dubaiSpawn.z + 20); scene.add(sign);
}
IE.buildDubai = buildDubai;
let moonGems = [], stars = null, earth = null, moonRocket = null;
function buildMoon(scene0) {
  const scene = new T.Group(); scene0.add(scene); IE.moonGroup = scene; scene.visible = false;
  const size = 4400, seg = 220, geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), r = seeded(99);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + MOON.x, z = pos.getZ(i) + MOON.z, h = moonH(x, z); pos.setY(i, h); const v = 0.33 + (h - MOON.base) * 0.0015 + r() * 0.05; col.set([v, v, v * 1.02], i * 3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); m.position.set(MOON.x, 0, MOON.z); scene.add(m);
  // Sterne + Erde (folgen der Kamera)
  const sp = new Float32Array(2500 * 3); for (let i = 0; i < 2500; i++) { const a = r() * 6.28, b = Math.acos(r() * 2 - 1) * 0.5, R2 = 7000; sp.set([Math.sin(b) * Math.cos(a) * R2, Math.cos(b) * R2, Math.sin(b) * Math.sin(a) * R2], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 14, sizeAttenuation: true, fog: false })); stars.visible = false; scene.add(stars);
  const et = document.createElement('canvas'); et.width = 256; et.height = 128; const eg = et.getContext('2d'); eg.fillStyle = '#1d5fb0'; eg.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 40; k++) { eg.fillStyle = k % 3 ? '#3e8a3a' : '#f2f2f2'; eg.beginPath(); eg.ellipse(r() * 256, r() * 128, 6 + r() * 26, 4 + r() * 12, r() * 3, 0, 7); eg.fill(); }
  earth = new T.Mesh(new T.SphereGeometry(420, 32, 16), new T.MeshBasicMaterial({ map: new T.CanvasTexture(et), fog: false })); earth.visible = false; scene.add(earth);
  // Landeplatz mit Rakete, Mondbasis, Flagge
  const y0 = moonH(MOON.x, MOON.z);
  moonRocket = rocketGroup(0.45); moonRocket.position.set(MOON.x, y0 + 2, MOON.z); scene.add(moonRocket);
  IE.addBox(MOON.x - 5, MOON.z - 5, MOON.x + 5, MOON.z + 5, y0 + 75);
  const domeMat = new T.MeshLambertMaterial({ color: 0xe8e8ec }), glassD = new T.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.55, metalness: 0.4, roughness: 0.1 });
  for (const [ox, oz, rr] of [[60, -30, 14], [85, -10, 10], [62, 8, 9]]) {
    const yb = moonH(MOON.x + ox, MOON.z + oz), d = new T.Mesh(new T.SphereGeometry(rr, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ox === 60 ? glassD : domeMat); d.position.set(MOON.x + ox, yb, MOON.z + oz); scene.add(d);
    IE.addBox(MOON.x + ox - rr * 0.7, MOON.z + oz - rr * 0.7, MOON.x + ox + rr * 0.7, MOON.z + oz + rr * 0.7, yb + rr * 0.8);
  }
  for (let k = 0; k < 6; k++) { const px = MOON.x + 40 + k * 7, pz = MOON.z + 40, yb = moonH(px, pz); box(0.3, 2, 0.3, IE.mat.dark, px, yb + 1, pz, scene); const pn = box(5, 0.15, 3, new T.MeshStandardMaterial({ color: 0x1f3f8a, metalness: 0.6, roughness: 0.3 }), px, yb + 2.2, pz, scene); pn.rotation.x = -0.5; }
  const fy = moonH(MOON.x - 25, MOON.z + 15); box(0.15, 6, 0.15, IE.mat.white, MOON.x - 25, fy + 3, MOON.z + 15, scene);
  const flag = textTex([], 96, 64, '#fff', '#000'); flag.g.fillStyle = '#009246'; flag.g.fillRect(0, 0, 32, 64); flag.g.fillStyle = '#ce2b37'; flag.g.fillRect(64, 0, 32, 64); flag.t.needsUpdate = true;
  const fm = new T.Mesh(new T.PlaneGeometry(3, 2), new T.MeshBasicMaterial({ map: flag.t, side: T.DoubleSide })); fm.position.set(MOON.x - 23.5, fy + 5, MOON.z + 15); scene.add(fm);
  // Mondsteine (je 2 Mio. €, einmalig)
  const gm = new T.MeshBasicMaterial({ color: 0x5ff3ff }), r3 = seeded(31337);
  for (let k = 0; k < 12; k++) { const a = r3() * 6.28, d = 200 + r3() * (MOON.R - 300), x = MOON.x + Math.cos(a) * d, z = MOON.z + Math.sin(a) * d, yb = moonH(x, z);
    const gem = new T.Mesh(new T.OctahedronGeometry(1.6, 0), gm); gem.position.set(x, yb + 2, z); scene.add(gem);
    const beam = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 120, 8, 1, true), new T.MeshBasicMaterial({ color: 0x5ff3ff, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide })); beam.position.set(x, yb + 60, z); scene.add(beam);
    moonGems.push({ id: 'g' + k, x, z, y: yb, gem, beam }); }
  IE.moonGems = moonGems;
}
function setMoon(on) {
  const g = G(); IE.onMoon = on;
  IE.sky.visible = !on; g.scene.background = on ? new T.Color(0x02030a) : null; if (IE.moonGroup) IE.moonGroup.visible = on;
  stars.visible = earth.visible = on;
  if (on) { updateBackrooms.prevMoonCh = g.game.ch.moon; g.game.ch.moon = true; } else g.game.ch.moon = !!updateBackrooms.prevMoonCh;
}
function startLaunch(toMoon) {
  const g = G(), P = g.P;
  if (g.P.veh) { g.toast('Erst aussteigen', 2); return; }
  launch = { t: 0, toMoon, from: toMoon ? rocket : moonRocket, y0: (toMoon ? rocket : moonRocket).position.y };
  P.h.group.visible = false; g.closeModals(); g.sfx('beep');
  g.banner(toMoon ? 'Missione Luna' : 'Rückflug', toMoon ? 'Start in 3 … 2 … 1' : 'Kurs auf die Erde', '', 3);
}
function updateLaunch(dt) {
  if (!launch) return;
  const g = G(), P = g.P, L = launch; L.t += dt;
  const up = L.t < 1.5 ? 0 : Math.pow(L.t - 1.5, 2) * 14; L.from.position.y = L.y0 + up;
  P.pos.set(L.from.position.x + 10, L.from.position.y + 30 * (L.toMoon ? 1 : 0.45), L.from.position.z + 26); P.vy = 0;
  g.cam.pitch = 0.05 - Math.min(0.5, L.t * 0.08);
  if (L.t > 1.5 && Math.random() < 0.8) { const sm = new T.Mesh(new T.SphereGeometry(3 + Math.random() * 4, 8, 6), new T.MeshBasicMaterial({ color: Math.random() < 0.3 ? 0xffa040 : 0xcfcfcf, transparent: true, opacity: 0.7 })); sm.position.set(L.from.position.x + (Math.random() - 0.5) * 8, L.from.position.y - 3, L.from.position.z + (Math.random() - 0.5) * 8); g.scene.add(sm); let a = 0; const iv = setInterval(() => { a += 0.05; sm.scale.setScalar(1 + a * 4); sm.material.opacity = 0.7 * (1 - a); if (a >= 1) { clearInterval(iv); g.scene.remove(sm); sm.geometry.dispose(); sm.material.dispose(); } }, 50); }
  if (L.t > 6) {
    L.from.position.y = L.y0; launch = null; P.h.group.visible = true;
    if (L.toMoon) { setMoon(true); g.teleportTo(MOON.x + 20, moonH(MOON.x + 20, MOON.z + 20), MOON.z + 20); if (g.P.fly) g.setFly(false); spawnRover(); g.banner('Willkommen auf dem Mond', 'Geringe Schwerkraft · 12 Mondsteine zu finden', 'Zurück zur Erde: E an der Rakete', 6); }
    else { setMoon(false); g.teleportTo(RK.x + 30, RK.h, RK.z + 30); if (g.P.fly) g.setFly(false); g.banner('Zurück auf der Erde', 'Mondrakete · Mailand', '', 3); }
  }
}
function moonAliensClear() { updateMoon.aliensOn = false; for (const n of IE.npcs) if (n.kind === 'alien') n.remove = true; }
function moonAliens(dt) {
  const g = G(), P = g.P; updateMoon.aliensOn = true;
  if (P.interior || g.game.dead) return;
  updateMoon.alienT = (updateMoon.alienT || 0) - dt; if (updateMoon.alienT > 0) return; updateMoon.alienT = 2.5;
  let live = 0; for (const n of IE.npcs) if (n.kind === 'alien' && !n.dead) { live++; if (n.pos.distanceTo(P.pos) > 200) n.remove = true; }
  const max = G().isTouch ? 7 : 11;
  const pp = P.veh ? P.veh.pos : P.pos;
  if (live < max) for (let k = 0; k < 8; k++) { const a = rnd() * 6.28, r = 45 + rnd() * 70, x = pp.x + Math.cos(a) * r, z = pp.z + Math.sin(a) * r; if (x < 9000) continue; const n = IE.spawnNPC(g.scene, 'alien', x, z, {}); n.alert = true; n.id = (rnd() * 100) | 0; n.keep = false; break; }
}
function spawnRover() { const g = G(); for (const v of IE.vehicles) if (v.moonRover && !v.driver) v.removeMe = true; const v = IE.spawnCar(g.scene, 'rally', MOON.x - 18, MOON.z + 30, 0, { color: 0xf2f2ee }); v.moonRover = true; v.owned = true; v.def = Object.assign({}, v.def, { name: 'Mond-Rover', speed: 32, kind: 'suv' }); }
function updateMoon(dt) {
  const g = G(), P = g.P, S = g.S;
  if ((performance.now() / 1000 | 0) !== updateMoon.sec) { updateMoon.sec = performance.now() / 1000 | 0; drawBoard(); }
  // Auf dem Mond? (z. B. nach Teleport/Laden)
  const px = P.veh ? P.veh.pos.x : P.pos.x;
  if (IE.onMoon && px < 9000 && stars && !launch) setMoon(false); // z. B. nach dem Tod zurück auf der Erde
  if (!IE.onMoon && !launch && px > 7000) { // Weltrand: zum Mond kommt man nur mit der Rakete
    const o = P.veh ? P.veh.pos : P.pos; o.x = 6950;
    if (P.veh) { P.veh.yaw += Math.PI; if (P.veh.vel) P.veh.vel.x = -Math.abs(P.veh.vel.x); if (P.veh.speed) P.veh.speed *= 0.5; }
    if (!updateMoon.warn || performance.now() - updateMoon.warn > 4000) { updateMoon.warn = performance.now(); g.toast('Hier ist das Ende der Welt – zum Mond geht es nur mit der Rakete bei Mailand', 3); }
  }
  if (!IE.onMoon) { if (updateMoon.aliensOn) moonAliensClear(); return; }
  stars.position.copy(g.camera.position); earth.position.set(g.camera.position.x - 2500, g.camera.position.y + 3200, g.camera.position.z - 4200);
  moonAliens(dt);
  S.moonGems = S.moonGems || [];
  for (const m of moonGems) {
    const got = S.moonGems.includes(m.id); m.gem.visible = m.beam.visible = !got; if (got) continue;
    m.gem.rotation.y += dt * 2; m.gem.position.y = m.y + 2 + Math.sin(performance.now() / 400) * 0.4;
    const pp = P.veh ? P.veh.pos : P.pos;
    if (Math.hypot(pp.x - m.x, pp.z - m.z) < 4) { S.moonGems.push(m.id); g.addMoney(2000000, true); g.sfx('cash'); g.banner('Mondstein gefunden', S.moonGems.length + ' / 12', '+ ' + g.fmt(2000000), 3); g.saveGame(); }
  }
}

// ================= WEIHNACHTEN (Dezember) =================
const XM = { test: false, built: false, on: false, snow: false, lights: null, trees: null, flakes: null, terrCol: null, treeCols: [], canes: [], caneT: 5 };
const dayHash = d => { const x = Math.sin(d * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
// Weihnachtszeit (Deko + Bäume): ab 20. November bis Ende Dezember
IE.xmasActive = () => XM.test || (() => { const d = new Date(), m = d.getMonth(); return m === 11 || (m === 10 && d.getDate() >= 20); })();
IE.snowToday = () => {
  if (XM.test) return true;
  const d = new Date(), m = d.getMonth();
  if (m === 11 || (m === 10 && d.getDate() >= 20)) return true; // Weihnachtszeit: immer Schnee
  if (m === 0 || m === 1) return dayHash(d.getDate() + m * 50) < 0.30; // Jan/Feb: manchmal
  return false;
};
IE.adventDay = () => { if (XM.test) return 24; const d = new Date(); return d.getMonth() === 11 ? Math.min(24, d.getDate()) : 0; };
function buildXmas() {
  if (XM.built) return; XM.built = true;
  const g = G(), scene = g.scene;
  // Lichterketten an den Häusern der Städte
  const cols = [0xff3b30, 0x48e07a, 0xf2c230, 0x3a9bff, 0xffffff], seen = new Set(), pts = [];
  for (const c of IE.cities) {
    for (let x = c.x - c.r; x <= c.x + c.r; x += 16) for (let z = c.z - c.r; z <= c.z + c.r; z += 16) {
      if (Math.hypot(x - c.x, z - c.z) > c.r) continue;
      for (const b of IE.collAt(x, z)) {
        if (b.t !== 'box' || seen.has(b) || b.online) continue; seen.add(b);
        const gy = IE.groundH((b.minx + b.maxx) / 2, (b.minz + b.maxz) / 2), hh = b.top - gy;
        if (hh < 4 || hh > 70 || pts.length > 26000) continue;
        const per = 2 * ((b.maxx - b.minx) + (b.maxz - b.minz)), n = Math.min(24, Math.floor(per / 2.2));
        for (let k = 0; k < n; k++) {
          let t = k / n * per, px, pz; const w = b.maxx - b.minx, d = b.maxz - b.minz;
          if (t < w) { px = b.minx + t; pz = b.minz - 0.2; } else if ((t -= w) < d) { px = b.maxx + 0.2; pz = b.minz + t; } else if ((t -= d) < w) { px = b.maxx - t; pz = b.maxz + 0.2; } else { t -= w; px = b.minx - 0.2; pz = b.maxz - t; }
          pts.push(px, b.top - 0.25 - (k % 2) * 0.2, pz);
        }
      }
    }
  }
  const im = new T.InstancedMesh(new T.SphereGeometry(0.18, 6, 4), new T.MeshBasicMaterial({ color: 0xffffff }), pts.length / 3), M4 = new T.Matrix4(), cc = new T.Color();
  for (let i = 0; i < pts.length / 3; i++) { M4.makeTranslation(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]); im.setMatrixAt(i, M4); im.setColorAt(i, cc.setHex(cols[i % cols.length])); }
  im.visible = false; scene.add(im); XM.lights = im;
  // großer Weihnachtsbaum in jeder Stadt
  const trees = new T.Group(); trees.visible = false; scene.add(trees);
  const green = new T.MeshLambertMaterial({ color: 0x1e5c2e }), star = new T.MeshBasicMaterial({ color: 0xffd84a });
  for (const c of IE.cities) {
    let x = c.cx !== undefined ? c.cx : c.x, z = c.cz !== undefined ? c.cz : c.z;
    for (let k = 0; k < 20 && IE.blockedAt(x, z, 4); k++) { x += 7; z += 5; }
    const y = IE.groundH(x, z), t = new T.Group(); t.position.set(x, y, z); trees.add(t);
    box(1.2, 3, 1.2, new T.MeshLambertMaterial({ color: 0x5a3a20 }), 0, 1.5, 0, t);
    for (let l = 0; l < 4; l++) { const cn = new T.Mesh(new T.ConeGeometry(6 - l * 1.3, 6, 12), green); cn.position.y = 5 + l * 3.6; t.add(cn); }
    const st = new T.Mesh(new T.OctahedronGeometry(1.1, 0), star); st.position.y = 20; t.add(st);
    for (let k = 0; k < 40; k++) { const a = k * 2.4, h = 4 + (k / 40) * 14, r = (6 - (h - 4) / 3.6 * 1.3) * 0.95; const b2 = new T.Mesh(new T.SphereGeometry(0.35, 8, 6), new T.MeshBasicMaterial({ color: cols[k % cols.length] })); b2.position.set(Math.cos(a) * r, h, Math.sin(a) * r); t.add(b2); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; box(1.2, 1, 1.2, new T.MeshLambertMaterial({ color: cols[k % 4] }), Math.cos(a) * 4, 0.5, Math.sin(a) * 4, t); }
    IE.addBox(x - 2, z - 2, x + 2, z + 2, y + 20);
  }
  XM.trees = trees;
}
function buildSnow() {
  if (XM.flakes) return; const scene = G().scene;
  const N = 2500, fp = new Float32Array(N * 3); for (let i = 0; i < N; i++) fp.set([(rnd() - 0.5) * 160, rnd() * 80, (rnd() - 0.5) * 160], i * 3);
  const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(fp, 3));
  XM.flakes = new T.Points(fg, new T.PointsMaterial({ color: 0xffffff, size: 0.45, transparent: true, opacity: 0.9 })); XM.flakes.visible = false; XM.flakes.frustumCulled = false; scene.add(XM.flakes);
}
function setSnow(on) {
  const g = G(); XM.snow = on;
  const tg = IE.terrain && IE.terrain.geometry, ca = tg && tg.attributes.color;
  if (ca) {
    if (!XM.terrCol) XM.terrCol = ca.array.slice();
    const pos = tg.attributes.position;
    for (let i = 0; i < ca.count; i++) {
      const o = XM.terrCol, h = pos.getY(i);
      if (on && h > 0.9) { const f = 0.88; ca.setXYZ(i, o[i * 3] + (0.95 - o[i * 3]) * f, o[i * 3 + 1] + (0.97 - o[i * 3 + 1]) * f, o[i * 3 + 2] + (1.0 - o[i * 3 + 2]) * f); }
      else ca.setXYZ(i, o[i * 3], o[i * 3 + 1], o[i * 3 + 2]);
    }
    ca.needsUpdate = true;
  }
  // Bäume und Dächer weiß überzuckern
  if (!XM.treeCols.length) g.scene.traverse(o => { if (o.isInstancedMesh && o.instanceColor && o !== XM.lights) { const c = o.instanceColor.array; if (c[1] > c[0] && c[1] > c[2]) XM.treeCols.push({ o, c: c.slice() }); } }); // nur grüne (Bäume)
  for (const t of XM.treeCols) { const a = t.o.instanceColor.array; for (let i = 0; i < a.length; i++) a[i] = on ? t.c[i] + (0.92 - t.c[i]) * 0.6 : t.c[i]; t.o.instanceColor.needsUpdate = true; }
  if (IE.mat.terracotta) { if (!XM.roofCol) XM.roofCol = IE.mat.terracotta.color.getHex(); IE.mat.terracotta.color.setHex(on ? 0xeef2f6 : XM.roofCol); }
  if (XM.flakes) XM.flakes.visible = on;
}
function updateXmas(dt) {
  const g = G(), P = g.P, inDubai = P.pos.x < -9000, on = IE.xmasActive() && !IE.onMoon && !inDubai;   // Deko & Kalender: nur im Dezember, nicht in Dubai
  const snow = IE.snowToday() && !IE.onMoon && !inDubai;                    // Schnee: auch im Nov/Winter, aber nicht in Dubai (Wüste)
  if (on && !XM.built) buildXmas();
  if (XM.built) { XM.lights.visible = on; XM.trees.visible = on; }
  if (snow && !XM.flakes) buildSnow();
  if (snow !== XM.snow) setSnow(snow);
  if (XM.flakes && XM.flakes.visible) {
    const a = XM.flakes.geometry.attributes.position, c = g.camera.position;
    XM.flakes.position.set(Math.floor(c.x / 160) * 160, 0, Math.floor(c.z / 160) * 160);
    const ox = XM.flakes.position.x, oz = XM.flakes.position.z;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * 4, x = a.getX(i) + Math.sin(y * 0.3 + i) * dt * 0.6;
      if (y < c.y - 30) y += 80; if (y > c.y + 50) y -= 80;
      let wx = ox + x; if (wx < c.x - 80) x += 160; if (wx > c.x + 80) x -= 160;
      let wz = oz + a.getZ(i); if (wz < c.z - 80) a.setZ(i, a.getZ(i) + 160); if (wz > c.z + 80) a.setZ(i, a.getZ(i) - 160);
      a.setX(i, x); a.setY(i, y);
    }
    a.needsUpdate = true;
  }
  if (XM.lights && XM.lights.visible) { const t = performance.now() / 600 | 0; if (t !== XM.blink) { XM.blink = t; XM.lights.material.color.setScalar(t % 2 ? 1 : 0.75); } }
  updateCanes(dt, on);
  // Hinweis auf neues Türchen
  if (on && g.game.state === 'play' && !XM.told) { XM.told = true; const d = IE.adventDay(), S = g.S; if (d && !(S.advent || []).includes(d)) setTimeout(() => g.toast('🎄 Im Adventskalender wartet Türchen ' + d + ' auf dich (Menü → Adventskalender)', 5), 4000); }
  const pb = $('pAdvent'); if (pb) pb.hidden = !IE.adventDay();
}
// ----- Zuckerstangen mit Geld -----
let caneTex = null;
function caneMesh() {
  if (!caneTex) { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 256); x.fillStyle = '#e0102a'; for (let i = -64; i < 256; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i + 32); x.lineTo(64, i + 48); x.lineTo(0, i + 16); x.fill(); } caneTex = new T.CanvasTexture(c); caneTex.wrapS = caneTex.wrapT = T.RepeatWrapping; caneTex.repeat.set(1, 3); }
  const path = new T.CurvePath(); path.add(new T.LineCurve3(new T.Vector3(0, 0, 0), new T.Vector3(0, 2.2, 0)));
  const arc = new T.EllipseCurve(0.45, 2.2, 0.45, 0.45, Math.PI, 0, true); const ap = arc.getPoints(12).map(p => new T.Vector3(p.x, p.y, 0));
  const pts = [new T.Vector3(0, 0, 0), new T.Vector3(0, 1.1, 0)].concat(ap);
  const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.16, 8, false), new T.MeshLambertMaterial({ map: caneTex, emissive: 0x330000 }));
  const g = new T.Group(); g.add(m);
  const glow = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 40, 8, 1, true), new T.MeshBasicMaterial({ color: 0xff6a7a, transparent: true, opacity: 0.15, depthWrite: false, side: T.DoubleSide })); glow.position.y = 20; g.add(glow);
  return g;
}
function updateCanes(dt, on) {
  const g = G(), P = g.P;
  for (let i = XM.canes.length - 1; i >= 0; i--) {
    const c = XM.canes[i], pp = P.veh ? P.veh.pos : P.pos, d = Math.hypot(pp.x - c.x, pp.z - c.z);
    c.m.rotation.y += dt * 1.5;
    if (!on || d > 450) { g.scene.remove(c.m); XM.canes.splice(i, 1); continue; }
    if (d < 3.5 && Math.abs(pp.y - c.y) < 4) {
      const amt = 10000 + Math.round(rnd() * 9) * 10000; g.addMoney(amt); g.sfx('cash'); g.banner('Zuckerstange!', '🍬', '+ ' + g.fmt(amt), 2.5);
      g.scene.remove(c.m); XM.canes.splice(i, 1); g.saveGame();
    }
  }
  if (!on || P.interior || g.game.state !== 'play') return;
  XM.caneT -= dt;
  if (XM.caneT <= 0 && XM.canes.length < 6) {
    XM.caneT = 25 + rnd() * 35;
    const pp = P.veh ? P.veh.pos : P.pos;
    for (let k = 0; k < 10; k++) { const a = rnd() * 6.28, r = 40 + rnd() * 110, x = pp.x + Math.cos(a) * r, z = pp.z + Math.sin(a) * r; if (!IE.isLand(x, z) || IE.blockedAt(x, z, 1.5)) continue; const y = IE.groundH(x, z), m = caneMesh(); m.position.set(x, y, z); g.scene.add(m); XM.canes.push({ m, x, z, y }); break; }
  }
}
// ----- Adventskalender -----
const ADVENT = {
  1: { m: 50000 }, 2: { car: 'xflitzer' }, 3: { m: 100000 }, 4: { paint: 'weihnachten' }, 5: { m: 250000 }, 6: { car: 'xgrinch' }, 7: { m: 200000 }, 8: { car: 'xschnee' },
  9: { m: 300000 }, 10: { m: 500000 }, 11: { m: 400000 }, 12: { car: 'xlebkuchen' }, 13: { m: 600000 }, 14: { car: 'xeis' }, 15: { m: 750000 }, 16: { m: 1000000 },
  17: { m: 1200000 }, 18: { car: 'xsanta' }, 19: { m: 1500000 }, 20: { boat: 'xmasyacht' }, 21: { m: 2000000 }, 22: { car: 'xtanne' }, 23: { m: 3000000 }, 24: { plane: 'schlitten' }
};
const XTUNE = {
  xflitzer: { paint: 0xc8102e, finish: 'glanz', rims: 0xf4f4f0, neon: 0x48e07a, spoiler: true, engine: 2, turbo: 1, armor: 0 },
  xgrinch: { paint: 0x3fa535, finish: 'matt', rims: 0xd33a2c, neon: 0x48e07a, engine: 1, turbo: 1, armor: 2 },
  xschnee: { paint: 0xf2f6fb, finish: 'glanz', rims: 0x9fd8f2, neon: 0x5ff3ff, engine: 1, turbo: 0, armor: 1 },
  xlebkuchen: { paint: 0x8a5a2b, finish: 'matt', rims: 0xd6b04a, neon: 0xf2c230, spoiler: true, engine: 2, turbo: 1, armor: 0 },
  xeis: { paint: 0x9fd8f2, finish: 'chrom', rims: 0xf4f4f0, neon: 0x5ff3ff, spoiler: true, engine: 3, turbo: 2, armor: 0 },
  xsanta: { paint: 0xb3001b, finish: 'glanz', rims: 0xd6b04a, neon: 0xff3b30, spoiler: true, engine: 3, turbo: 2, armor: 1 },
  xtanne: { paint: 0x1e5c2e, finish: 'glanz', rims: 0xd6b04a, neon: 0xff3b30, engine: 2, turbo: 1, armor: 0 }
};
function rewardText(r, g) { if (r.paint) return '🎨 Weihnachts-Lackierung'; if (r.m) return g.fmt(r.m); if (r.car) return '🚗 ' + IE.carById[r.car].name; if (r.boat) return '⛵ ' + IE.boatById[r.boat].name; if (r.plane) return '🦌 ' + IE.planeById[r.plane].name; return ''; }
function openAdvent() {
  const g = G(), S = g.S, today = IE.adventDay(); S.advent = S.advent || [];
  xModal('advent', '🎄 Adventskalender', [], today ? 'Jeden Tag im Dezember ein neues Türchen – verpasste Türchen kannst du nachholen. Am 24. wartet etwas ganz Besonderes!' : 'Der Adventskalender öffnet am 1. Dezember.');
  const box2 = $('xRows'); box2.innerHTML = '';
  const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px;padding:14px 22px';
  const order = [7, 15, 3, 21, 11, 1, 18, 9, 24, 5, 13, 20, 2, 16, 8, 23, 12, 4, 19, 10, 6, 22, 14, 17];
  for (const d of order) {
    const open = S.advent.includes(d), can = d <= today && !open, r = ADVENT[d];
    const b = document.createElement('button');
    b.style.cssText = `height:92px;border-radius:10px;border:2px solid ${d === 24 ? '#d6b04a' : can ? '#48e07a' : 'rgba(243,234,216,0.25)'};background:${open ? '#1d3a2a' : d === 24 ? '#7a0c14' : (d % 3 === 0 ? '#8a1020' : d % 3 === 1 ? '#1e5c2e' : '#1f3f8a')};color:#f3ead8;font-family:var(--f-hud);font-size:${open ? 14 : 34}px;font-weight:700;opacity:${d > today ? 0.45 : 1};cursor:${can ? 'pointer' : 'default'};line-height:1.1;padding:4px`;
    b.innerHTML = open ? `<div style="font-size:13px;color:#d6b04a">${d}.</div>${rewardText(r, g)}` : String(d);
    b.disabled = !can;
    b.onclick = () => openDoor(d);
    grid.appendChild(b);
  }
  box2.appendChild(grid);
}
function openDoor(d) {
  const g = G(), S = g.S, r = ADVENT[d]; S.advent = S.advent || []; if (S.advent.includes(d) || d > IE.adventDay()) return;
  S.advent.push(d);
  if (r.m) g.addMoney(r.m, true);
  if (r.car) { if (!S.cars.includes(r.car)) S.cars.push(r.car); S.tune = S.tune || {}; S.tune[r.car] = Object.assign({}, XTUNE[r.car]); }
  if (r.boat && !S.boats.includes(r.boat)) S.boats.push(r.boat);
  if (r.plane && !S.planes.includes(r.plane)) S.planes.push(r.plane);
  if (r.paint) { S.paints = S.paints || ['standard']; if (!S.paints.includes(r.paint)) S.paints.push(r.paint); }
  g.sfx('pass'); g.saveGame(true);
  g.banner('Türchen ' + d, rewardText(r, g), r.m ? 'Frohe Weihnachten!' : r.paint ? 'Im Haus-Menü deiner Villa anwenden' : 'Hol es dir über „Meine Fahrzeuge“ (G / GARAGE)', 5);
  openAdvent();
}
IE.openAdvent = openAdvent;
// ----- Boost für Flugzeuge -----
let boostCool = 0;
IE.planeBoost = function () {
  const g = G(), v = g.P.veh; if (!v || v.type !== 'plane' || v.dead) return;
  if (v.onGround && v.speed < 10) { g.toast('Erst rollen oder abheben', 1.5); return; }
  if (boostCool > 0) { g.toast('Boost lädt … ' + Math.ceil(boostCool) + ' s', 1); return; }
  v.boostT = 3; boostCool = 8; g.sfx('boom', 0.3); g.toast('🔥 BOOST!', 1.2);
};
function updateBoost(dt) {
  boostCool = Math.max(0, boostCool - dt);
  const g = G(), v = g.P.veh; if (!v || v.type !== 'plane' || !(v.boostT > 0)) return;
  v.boostT -= dt; const top = v.def.speed * 1.8; v.speed += (top - v.speed) * Math.min(1, dt * 2.5);
  const f = fwd(v.yaw), back = new T.Vector3(v.pos.x - f.x * v.m.L * 0.55, v.pos.y + (v.m.gearH || 1) + 0.8, v.pos.z - f.z * v.m.L * 0.55);
  const fl = new T.Mesh(new T.SphereGeometry(0.6 + rnd() * 0.6, 8, 6), new T.MeshBasicMaterial({ color: rnd() < 0.5 ? 0xffa040 : 0xff5a20, transparent: true, opacity: 0.85 }));
  fl.position.copy(back); g.scene.add(fl); let a = 0; const iv = setInterval(() => { a += 0.1; fl.scale.setScalar(1 + a * 2); fl.material.opacity = 0.85 * (1 - a); if (a >= 1) { clearInterval(iv); g.scene.remove(fl); fl.geometry.dispose(); fl.material.dispose(); } }, 40);
}

// ================= HÄUSER: Lackierung, eigene Räume, Möbel, Eigentum online =================
const PAINTS_H = {
  standard:    { name: 'Standard (Weiß)', price: 0,       wall: 0xf1ede4, roof: 0xb75a32, trim: 0xd9c8a3, marble: 0xf3efe6 },
  herbst:      { name: 'Herbst',          price: 200000,  wall: 0xe8b06a, roof: 0x8a2a14, trim: 0x7a4a26, marble: 0xd9822b, deco: 'herbst' },
  sommer:      { name: 'Sommer',          price: 200000,  wall: 0xfff4c2, roof: 0x18c2d8, trim: 0xf6e7b0, marble: 0xffffff, deco: 'sommer' },
  halloween:   { name: 'Halloween',       price: 300000,  wall: 0x2a2624, roof: 0xf27a1a, trim: 0x5a1a7a, marble: 0xf27a1a, deco: 'halloween' },
  rainbow:     { name: 'Rainbow',         price: 500000,  wall: 0xffffff, roof: 0x7a5cff, trim: 0x48e07a, marble: 0xf2c230, rainbow: true },
  gold:        { name: 'Gold',            price: 2000000, wall: 0xe0b84a, roof: 0xb8902e, trim: 0xf2d36b, marble: 0xfff1b0 },
  geld:        { name: 'Geld',            price: 5000000, wall: 0xffffff, roof: 0x2e8b57, trim: 0x1f5c33, marble: 0xd6b04a, money: true },
  weihnachten: { name: 'Weihnachten',     price: -1,      wall: 0xf4f4f0, roof: 0xc8102e, trim: 0x1e5c2e, marble: 0xd6b04a, deco: 'xmas', how: 'aus dem Adventskalender' },
  silvester:   { name: 'Silvester',       price: -1,      wall: 0x101a3a, roof: 0xd6b04a, trim: 0x2a2a5a, marble: 0xf2d36b, deco: 'silvester', how: 'spiel an Silvester oder Neujahr' }
};
IE.housePaints = PAINTS_H;
let moneyTex = null;
function getMoneyTex() {
  if (moneyTex) return moneyTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#3f9a52'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#2e7a3e'; for (let i = 0; i < 128; i += 16) x.fillRect(0, i, 128, 2);
  x.fillStyle = '#d8f2c0'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('€', 32, 32); x.fillText('€', 96, 96); x.font = 'bold 22px Arial'; x.fillText('500', 96, 32); x.fillText('100', 32, 96);
  moneyTex = new T.CanvasTexture(c); moneyTex.wrapS = moneyTex.wrapT = T.RepeatWrapping; moneyTex.repeat.set(3, 2); return moneyTex;
}
function applyPaint(v, id) {
  const P = PAINTS_H[id] || PAINTS_H.standard, M = v.mats; if (!M) return; v.paint = id;
  M.wall.color.setHex(P.wall); M.roof.color.setHex(P.roof); M.trim.color.setHex(P.trim); M.marble.color.setHex(P.marble);
  M.wall.map = P.money ? getMoneyTex() : null; M.wall.needsUpdate = true;
  // Rainbow: jedes Wandteil eine eigene Farbe
  let k = 0; v.group.traverse(o => { if (!o.isMesh) return; if (o.userData.rb) { o.material = M.wall; delete o.userData.rb; } if (P.rainbow && o.material === M.wall) { o.material = new T.MeshLambertMaterial({ color: new T.Color().setHSL((k++ * 0.13) % 1, 0.75, 0.6) }); o.userData.rb = true; } });
  // Deko
  if (v.deco) { v.group.remove(v.deco); v.deco = null; }
  if (P.deco) {
    const d = new T.Group(), s = v.s; v.group.add(d); v.deco = d;
    if (P.deco === 'xmas' || P.deco === 'silvester') {
      const cols = P.deco === 'xmas' ? [0xff3b30, 0x48e07a, 0xf2c230, 0x3a9bff] : [0xf2d36b, 0xffffff, 0xd6b04a];
      for (let i = 0; i < 60; i++) { const t = i / 60, w = 19 * s, dd = 11 * s, per = 2 * (w + dd); let u = t * per, x, z; if (u < w) { x = -w / 2 + u; z = -3 * s - dd / 2; } else if ((u -= w) < dd) { x = w / 2; z = -3 * s - dd / 2 + u; } else if ((u -= dd) < w) { x = w / 2 - u; z = -3 * s + dd / 2; } else { u -= w; x = -w / 2; z = -3 * s + dd / 2 - u; }
        const b = new T.Mesh(new T.SphereGeometry(0.22, 6, 4), new T.MeshBasicMaterial({ color: cols[i % cols.length] })); b.position.set(x, 6.55, z); d.add(b); }
      if (P.deco === 'xmas') { const tr = new T.Group(); tr.position.set(-8 * s, 0, 8 * s); d.add(tr); for (let l = 0; l < 3; l++) { const cn = new T.Mesh(new T.ConeGeometry(2.2 - l * 0.6, 2.4, 10), new T.MeshLambertMaterial({ color: 0x1e5c2e })); cn.position.y = 1.4 + l * 1.4; tr.add(cn); } const st = new T.Mesh(new T.OctahedronGeometry(0.4, 0), new T.MeshBasicMaterial({ color: 0xffd84a })); st.position.y = 5.4; tr.add(st); }
      else for (let i = 0; i < 6; i++) { const st = new T.Mesh(new T.OctahedronGeometry(0.6, 0), new T.MeshBasicMaterial({ color: 0xf2d36b })); st.position.set(-10 * s + i * 4 * s, 13 + (i % 2) * 2, -3 * s); d.add(st); }
    } else if (P.deco === 'halloween') {
      for (let i = 0; i < 5; i++) { const p = new T.Mesh(new T.SphereGeometry(0.7, 12, 8), new T.MeshLambertMaterial({ color: 0xf27a1a, emissive: 0x552200 })); p.scale.y = 0.8; p.position.set(-6 * s + i * 3 * s, 0.6, 10.5 * s); d.add(p); const st = new T.Mesh(new T.BoxGeometry(0.15, 0.3, 0.15), new T.MeshLambertMaterial({ color: 0x3a6a2a })); st.position.set(p.position.x, 1.25, p.position.z); d.add(st); }
      for (let i = 0; i < 3; i++) { const gh = new T.Mesh(new T.SphereGeometry(0.8, 10, 8), new T.MeshBasicMaterial({ color: 0xf4f4f4, transparent: true, opacity: 0.7 })); gh.scale.y = 1.6; gh.position.set(-5 * s + i * 5 * s, 9 + i, 3 * s); d.add(gh); }
    } else if (P.deco === 'herbst') {
      for (let i = 0; i < 40; i++) { const l = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), new T.MeshLambertMaterial({ color: [0xd9822b, 0x8a2a14, 0xf2c230][i % 3], side: T.DoubleSide })); l.rotation.x = -Math.PI / 2; l.rotation.z = i; l.position.set((rnd() - 0.5) * 20 * s, 0.33, 6 * s + (rnd() - 0.5) * 8 * s); d.add(l); }
    } else if (P.deco === 'sommer') {
      for (let i = 0; i < 3; i++) { const um = new T.Mesh(new T.ConeGeometry(1.6, 0.7, 10), new T.MeshLambertMaterial({ color: [0xff5a7a, 0x18c2d8, 0xf2c230][i] })); um.position.set(-7 * s + i * 2.5, 2.5, 4.5 * s); d.add(um); const pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.4, 6), new T.MeshLambertMaterial({ color: 0xffffff })); pole.position.set(um.position.x, 1.2, um.position.z); d.add(pole); }
    }
  }
}
// Eigentümer online (vom Server) – Villen kann dann nur EIN Spieler besitzen
IE.houseOwners = {};
const SRVA = () => window.IECF && IECF.account;
const isOnline = () => window.IEonline && IEonline.active;
const mySlug = () => window.IEaccount && IEaccount.slug;
function ownedByOther(v) { const o = isOnline() && IE.houseOwners[v.id]; return o && o.slug !== mySlug() ? o : null; }
function paintFor(v) { const S = G().S, o = isOnline() && IE.houseOwners[v.id]; if (o && o.slug !== mySlug()) return o.paint || 'standard'; if ((S.villas || []).includes(v.id)) return (S.housePaint && S.housePaint[v.id]) || 'standard'; return 'standard'; }
function refreshHouses() { for (const v of IE.villas) { const p = paintFor(v); if (p !== v.paint) applyPaint(v, p); } drawVillaSigns(); }
IE.refreshHouses = refreshHouses;
async function syncHouses() {
  const a = SRVA(); if (!a || !a.houses) return;
  try {
    const r = await a.houses(); IE.houseOwners = r.houses || {};
    const g = G(), S = g.S;
    if (isOnline() && mySlug()) for (const v of IE.villas) {
      const o = IE.houseOwners[v.id], mine = (S.villas || []).includes(v.id);
      if (mine && !o) { try { await a.house('buy', v.id); IE.houseOwners[v.id] = { slug: mySlug(), nick: IEaccount.nick, paint: paintFor(v) }; } catch (e) { } }
      else if (mine && o && o.slug !== mySlug()) { S.villas = S.villas.filter(x => x !== v.id); S.money += v.price; g.saveGame(); g.banner('Villa gehörte schon jemand anderem', v.name + ' gehört ' + o.nick, 'Du bekommst ' + g.fmt(v.price) + ' zurück', 5); }
    }
    if (isOnline() && mySlug()) for (const is of IE.islands) { const o = IE.houseOwners[is.id], mine = (S.islands || []).includes(is.id); if (mine && !o) { try { await a.house('buy', is.id); IE.houseOwners[is.id] = { slug: mySlug(), nick: IEaccount.nick }; } catch (e) {} } else if (mine && o && o.slug !== mySlug()) { S.islands = S.islands.filter(x => x !== is.id); S.money += is.price; g.saveGame(); g.banner('Insel gehörte schon jemand anderem', is.name + ' gehört ' + o.nick, 'Du bekommst ' + g.fmt(is.price) + ' zurück', 5); } }
  } catch (e) { }
  refreshHouses(); if (IE.refreshIslands) IE.refreshIslands();
}
setTimeout(function hp() { if (G() && G().game.state === 'play') syncHouses(); setTimeout(hp, 20000); }, 4000);
// eigene Räume pro Villa (kein gemeinsamer Raum mehr)
const FURN = [
  { id: 'bett',      name: 'Kingsize-Bett',     price: 0,       x: 15, z: -11 },
  { id: 'sofa',      name: 'Ledersofa-Ecke',    price: 50000,   x: -9, z: 3 },
  { id: 'tv',        name: 'Riesen-Fernseher',  price: 80000,   x: -9, z: -15 },
  { id: 'teppich',   name: 'Perserteppich',     price: 30000,   x: -9, z: -4 },
  { id: 'bar',       name: 'Hausbar',           price: 150000,  x: 10, z: -2 },
  { id: 'fluegel',   name: 'Konzertflügel',     price: 300000,  x: 15, z: 8 },
  { id: 'billard',   name: 'Billardtisch',      price: 120000,  x: 1, z: 6 },
  { id: 'aquarium',  name: 'Aquarium',          price: 250000,  x: -20, z: -6 },
  { id: 'kamin',     name: 'Kamin',             price: 180000,  x: -1, z: -15.4 },
  { id: 'gaming',    name: 'Gaming-PC',         price: 60000,   x: 20, z: -2 },
  { id: 'jukebox',   name: 'Jukebox',           price: 90000,   x: -20, z: 8 },
  { id: 'pflanzen',  name: 'Pflanzen',          price: 20000,   x: 0, z: 0 },
  { id: 'statue',    name: 'Goldstatue',        price: 1000000, x: 1, z: -6 },
  { id: 'tresor',    name: 'Goldtresor',        price: 2500000, x: 20, z: -14 }
];
IE.furniture = FURN;
const rooms = {};
function buildRoom(v, i, scene, prefix) {
  prefix = prefix || 'villa_';
  const W = 44, D = 32, H = 6, ox = 5200 + (i % 4) * 80, oz = -200 + Math.floor(i / 4) * 80, y = 300;
  const fm = new T.MeshLambertMaterial({ color: 0xd8cfbd }), wm = new T.MeshLambertMaterial({ color: 0xf6f1e6 }), grp = new T.Group(); scene.add(grp);
  box(W, 1, D, fm, ox, y - 0.5, oz, grp); IE.addBox(ox - W / 2, oz - D / 2, ox + W / 2, oz + D / 2, y, y - 1);
  box(W, 0.4, D, wm, ox, y + H + 0.2, oz, grp);
  const wall = (w, d, px, pz) => { box(w, H, d, wm, px, y + H / 2, pz, grp); IE.addBox(px - w / 2, pz - d / 2, px + w / 2, pz + d / 2, y + H, y - 1); };
  wall(W, 0.4, ox, oz - D / 2); wall(0.4, D, ox - W / 2, oz); wall(0.4, D, ox + W / 2, oz); wall(W / 2 - 1.5, 0.4, ox - W / 4 - 0.75, oz + D / 2); wall(W / 2 - 1.5, 0.4, ox + W / 4 + 0.75, oz + D / 2);
  box(3, 3.2, 0.2, new T.MeshBasicMaterial({ color: 0x1a1410 }), ox, y + 1.6, oz + D / 2 + 0.25, grp);
  for (const sd of [-1, 1]) box(W / 2 - 6, 3.6, 0.1, new T.MeshBasicMaterial({ color: 0x9fd4ee }), ox + sd * (W / 4 + 1.5), y + 3.2, oz + D / 2 - 0.3, grp);
  for (const cx of [-10, 10]) { const ch = new T.Mesh(new T.SphereGeometry(0.9, 12, 8), new T.MeshBasicMaterial({ color: 0xfff1c8 })); ch.position.set(ox + cx, y + H - 1.3, oz); grp.add(ch); }
  const furnG = new T.Group(); grp.add(furnG);
  const it = { type: prefix + v.id, name: v.name, x: ox, z: oz, y, W, D, door: { x: ox, z: oz + D / 2 - 1.8 }, counter: { x: 1e9, z: 1e9 }, item: { x: ox + 15, z: oz - 11 }, spots: [] };
  IE.interiors[it.type] = it;
  rooms[v.id] = { it, furnG, ox, oz, y, built: {} };
}
function furnMesh(f, R) {
  const grp = new T.Group(), y = R.y, x = R.ox + f.x, z = R.oz + f.z; grp.position.set(x, y, z);
  const b = (w, h, d, c, px, py, pz) => box(w, h, d, typeof c === 'number' ? new T.MeshLambertMaterial({ color: c }) : c, px, py + h / 2, pz, grp);
  let col = null;
  switch (f.id) {
    case 'bett': b(5, 0.8, 6, 0xf6f1e6, 0, 0, 0); b(5, 0.5, 1.2, 0x7a1a24, 0, 0.8, -2.4); b(5.2, 1.8, 0.3, 0x5a3a20, 0, 0, -3.1); col = [2.5, 3, 1]; break;
    case 'sofa': b(7, 0.9, 2, 0x2a2a2e, 0, 0, 0); b(7, 1.2, 0.5, 0x2a2a2e, 0, 0.6, 1); b(2, 0.9, 4, 0x2a2a2e, -3.5, 0, -3); col = [3.5, 1, 1]; break;
    case 'tv': b(8, 4, 0.2, 0x0a0a0c, 0, 1.2, 0); b(7.6, 3.6, 0.05, new T.MeshBasicMaterial({ color: 0x1f6fd8 }), 0, 1.4, 0.13); b(6, 0.8, 1, 0x3a2a20, 0, 0, 0.3); col = [3, 0.6, 1]; break;
    case 'teppich': b(9, 0.03, 6, 0x7a1a24, 0, 0.01, 0); b(8, 0.04, 5, 0xd6b04a, 0, 0.01, 0); break;
    case 'bar': b(8, 1.1, 1.2, 0x2a1a14, 0, 0, 0); b(8, 0.08, 1.4, IE.mat.marble, 0, 1.1, 0); for (let k = 0; k < 4; k++) b(0.6, 0.8, 0.6, 0xd6b04a, -3 + k * 2, 0, 1.4); for (let k = 0; k < 6; k++) b(0.25, 0.6, 0.25, [0x2e8b57, 0x8a2a1e, 0xd6b04a][k % 3], -2.5 + k, 1.2, -0.3); col = [4, 0.7, 1.2]; break;
    case 'fluegel': b(2.6, 1, 3.4, 0x0b0b0d, 0, 0.6, 0); b(1.2, 0.8, 0.6, 0x0b0b0d, 0, 0, -2); col = [1.3, 1.7, 1.6]; break;
    case 'billard': b(5, 0.9, 2.8, 0x5a3a20, 0, 0, 0); b(4.6, 0.05, 2.4, 0x1e6a3a, 0, 0.9, 0); col = [2.5, 1.4, 1]; break;
    case 'aquarium': b(1.4, 2.4, 7, new T.MeshStandardMaterial({ color: 0x3ec5e0, transparent: true, opacity: 0.6 }), 0, 0.6, 0); b(1.5, 0.6, 7.2, 0x1a1a1a, 0, 0, 0); for (let k = 0; k < 6; k++) b(0.4, 0.2, 0.15, [0xf27a1a, 0xf2c230, 0xff5a7a][k % 3], (k % 2) * 0.3 - 0.15, 1.2 + (k % 3) * 0.5, -2.5 + k); col = [0.8, 3.6, 1]; break;
    case 'kamin': b(5, 4, 0.8, 0xbfb6a8, 0, 0, 0); b(3, 1.8, 0.2, 0x1a1410, 0, 0.3, 0.35); b(2.4, 0.8, 0.15, new T.MeshBasicMaterial({ color: 0xff8a2a }), 0, 0.4, 0.42); col = [2.5, 0.5, 1]; break;
    case 'gaming': b(2.6, 1, 1.2, 0x1a1a1a, 0, 0, 0); b(2, 1.2, 0.08, new T.MeshBasicMaterial({ color: 0x7a5cff }), 0, 1.4, -0.3); b(0.6, 1.2, 0.8, new T.MeshBasicMaterial({ color: 0xff3bd8 }), 1.1, 0, 0); col = [1.3, 0.6, 1]; break;
    case 'jukebox': b(1.6, 2.4, 1, 0xc8372d, 0, 0, 0); b(1.2, 1, 0.05, new T.MeshBasicMaterial({ color: 0xf2c230 }), 0, 1.3, 0.52); col = [0.8, 0.5, 1]; break;
    case 'pflanzen': for (const [px, pz] of [[-20, 14], [20, 14], [-20, -14], [10, 14]]) { b(1, 1, 1, 0x7a5a3a, px, 0, pz); b(1.6, 2.2, 1.6, 0x3f7a35, px, 1, pz); } break;
    case 'statue': b(1.2, 1, 1.2, IE.mat.marble, 0, 0, 0); b(0.8, 2.4, 0.8, IE.mat.gold, 0, 1, 0); col = [0.6, 0.6, 1]; break;
    case 'tresor': b(2, 2.4, 1.6, IE.mat.gold, 0, 0, 0); const dl = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.1, 16), IE.mat.dark); dl.rotation.x = Math.PI / 2; dl.position.set(0, 1.2, 0.85); grp.add(dl); col = [1, 0.8, 1]; break;
  }
  if (col && !R.built[f.id]) IE.addBox(x - col[0], z - col[1], x + col[0], z + col[1], y + 1.2, y - 1);
  R.built[f.id] = true;
  return grp;
}
function furnishRoom(v) {
  const R = rooms[v.id]; if (!R) return; const S = G().S; S.furn = S.furn || {};
  const have = ['bett'].concat(S.furn[v.id] || []);
  while (R.furnG.children.length) R.furnG.remove(R.furnG.children[0]);
  for (const f of FURN) if (have.includes(f.id)) R.furnG.add(furnMesh(f, R));
}
function enterVilla(v) {
  const g = G(), P = g.P; if (!rooms[v.id]) return;
  furnishRoom(v);
  g.enterInterior('villa_' + v.id, v.door.x, v.door.z + 4.5, null);
  if (P.interior) { P.interior.villa = v; g.toast(v.name, 2); enterVilla.cool = performance.now(); }
}
function updateHouses() {
  const g = G(), P = g.P, S = g.S;
  if (!updateHouses.init && g.game.state === 'play') { updateHouses.init = true; refreshHouses(); }
  // Silvester-Lackierung freischalten
  const d = new Date(); if ((d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() === 1)) { S.paints = S.paints || []; if (!S.paints.includes('silvester') && g.game.state === 'play') { S.paints.push('silvester'); g.saveGame(); g.banner('Frohes neues Jahr!', 'Silvester-Lackierung freigeschaltet', 'Im Haus-Menü deiner Villa', 5); } }
  if (performance.now() - (enterVilla.cool || 0) < 1500 || P.veh || g.game.dead) return;
  if (!P.interior) {
    for (const v of IE.villas) if (v.door && (S.villas || []).includes(v.id) && !ownedByOther(v) && Math.hypot(P.pos.x - v.door.x, P.pos.z - v.door.z) < 1.8 && Math.abs(P.pos.y - v.y) < 3) { enterVilla(v); return; }
  } else if (P.interior.it.type.indexOf('villa_') === 0) {
    const it = P.interior.it; if (Math.hypot(P.pos.x - it.door.x, P.pos.z - it.door.z) < 1.3) { g.exitInterior(); enterVilla.cool = performance.now(); }
  }
}
function paintMenu(v) {
  const g = G(), S = g.S; S.paints = S.paints || ['standard']; if (!S.paints.includes('standard')) S.paints.push('standard');
  const cur = paintFor(v), rows = [];
  for (const [id, P] of Object.entries(PAINTS_H)) {
    const have = S.paints.includes(id), btns = [];
    if (have) btns.push({ label: cur === id ? 'Aktiv ✓' : 'Anwenden', buy: cur !== id, off: cur === id, fn: () => setPaint(v, id) });
    else if (P.price >= 0) btns.push({ label: 'Kaufen · ' + g.fmt(P.price), buy: true, off: S.money < P.price, fn: () => { if (S.money < P.price) return; S.money -= P.price; S.paints.push(id); g.sfx('cash'); setPaint(v, id); } });
    else btns.push({ label: 'Gesperrt', off: true, fn: () => { } });
    rows.push({ name: '🎨 ' + P.name, stat: have ? 'Freigeschaltet – für alle deine Häuser' : P.price >= 0 ? 'Einmal kaufen, für alle deine Häuser' : 'Freischalten: ' + P.how, btns });
  }
  xModal('house', 'Lackierung · ' + v.name, rows, 'Online sehen auch die anderen Spieler die Lackierung deiner Villa.');
}
async function setPaint(v, id) {
  const g = G(), S = g.S; S.housePaint = S.housePaint || {}; S.housePaint[v.id] = id; applyPaint(v, id); g.saveGame(); paintMenu(v);
  const a = SRVA(); if (a && a.house && isOnline()) { try { await a.house('paint', v.id, id); if (IE.houseOwners[v.id]) IE.houseOwners[v.id].paint = id; } catch (e) { } }
}
function furnitureMenu(v) {
  const g = G(), S = g.S; S.furn = S.furn || {}; const have = S.furn[v.id] || [], rows = [];
  for (const f of FURN) { if (f.price === 0) continue; const own = have.includes(f.id);
    rows.push({ name: '🛋 ' + f.name, stat: own ? 'Steht in deiner Villa' : g.fmt(f.price), btns: [{ label: own ? 'Gekauft ✓' : 'Kaufen · ' + g.fmt(f.price), buy: !own, off: own || S.money < f.price, fn: () => { if (own || S.money < f.price) return; S.money -= f.price; S.furn[v.id] = have.concat(f.id); g.sfx('cash'); g.saveGame(); furnishRoom(v); furnitureMenu(v); } }] }); }
  xModal('house', 'Möbel · ' + v.name, rows, 'Möbel gehören zu dieser Villa. Ein Kingsize-Bett zum Ausruhen ist schon drin.');
}
IE.paintMenu = paintMenu; IE.furnitureMenu = furnitureMenu;

// ================= HAUSTIERE =================
const PETS = {
  hund:    { name: 'Hund',            price: 25000 },
  katze:   { name: 'Katze',           price: 20000 },
  vogel:   { name: 'Vogel',           price: 15000, fly: true },
  huhn:    { name: 'Huhn',            price: 10000 },
  eule:    { name: 'Eule',            price: 40000, fly: true },
  reh:     { name: 'Reh',             price: 60000 },
  fisch:   { name: 'Fisch in der Wasserblase', price: 30000, float: true },
  rentier: { name: 'Rentier',         price: 120000 },
  dino:    { name: 'Dino',            price: 500000 },
  alien:   { name: 'Grünes Baby-Alien', price: 1000000, float: true }
};
IE.pets = PETS;
IE.makePet = function (id) {
  const g = new T.Group(), legs = [], wings = [], L = c => new T.MeshLambertMaterial({ color: c });
  const bx = (w, h, d, c, x, y, z, p) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? L(c) : c); m.position.set(x, y, z); (p || g).add(m); return m; };
  const sph = (r, c, x, y, z, p) => { const m = new T.Mesh(new T.SphereGeometry(r, 12, 10), typeof c === 'number' ? L(c) : c); m.position.set(x, y, z); (p || g).add(m); return m; };
  const leg = (w, h, c, x, z, y0) => { const pv = new T.Group(); pv.position.set(x, y0, z); g.add(pv); bx(w, h, w, c, 0, -h / 2, 0, pv); legs.push(pv); };
  const eyes = (y, z, sp, r, c) => { sph(r || 0.04, c || 0x111111, -sp, y, z); sph(r || 0.04, c || 0x111111, sp, y, z); };
  switch (id) {
    case 'hund': bx(0.38, 0.36, 0.9, 0xa0703a, 0, 0.6, 0); bx(0.3, 0.3, 0.36, 0xa0703a, 0, 0.88, 0.5); bx(0.16, 0.14, 0.18, 0x8a5a2b, 0, 0.82, 0.74); sph(0.05, 0x111111, 0, 0.86, 0.84); eyes(0.95, 0.68, 0.08);
      bx(0.08, 0.18, 0.12, 0x6a4420, -0.16, 0.98, 0.45); bx(0.08, 0.18, 0.12, 0x6a4420, 0.16, 0.98, 0.45); const t = bx(0.08, 0.08, 0.35, 0xa0703a, 0, 0.75, -0.55); t.rotation.x = 0.6;
      for (const [x, z] of [[-0.13, 0.3], [0.13, 0.3], [-0.13, -0.3], [0.13, -0.3]]) leg(0.1, 0.42, 0x8a5a2b, x, z, 0.44); break;
    case 'katze': bx(0.26, 0.24, 0.6, 0x7c7c84, 0, 0.42, 0); bx(0.24, 0.22, 0.24, 0x7c7c84, 0, 0.6, 0.36); eyes(0.64, 0.48, 0.06, 0.035, 0x7fe08f);
      for (const sx of [-1, 1]) { const e = new T.Mesh(new T.ConeGeometry(0.06, 0.12, 4), L(0x7c7c84)); e.position.set(sx * 0.08, 0.76, 0.36); g.add(e); }
      const tl = bx(0.05, 0.45, 0.05, 0x7c7c84, 0, 0.62, -0.32); tl.rotation.x = -0.3; for (const [x, z] of [[-0.09, 0.2], [0.09, 0.2], [-0.09, -0.2], [0.09, -0.2]]) leg(0.07, 0.3, 0x6a6a72, x, z, 0.3); break;
    case 'vogel': sph(0.16, 0x2a7ad8, 0, 0, 0); sph(0.11, 0x2a7ad8, 0, 0.12, 0.12); const bk = new T.Mesh(new T.ConeGeometry(0.035, 0.1, 6), L(0xf2a020)); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.11, 0.25); g.add(bk); eyes(0.15, 0.2, 0.05, 0.022);
      for (const sx of [-1, 1]) { const pv = new T.Group(); pv.position.set(sx * 0.12, 0.03, 0); g.add(pv); bx(0.28, 0.03, 0.16, 0x1f5fb0, sx * 0.14, 0, 0, pv); wings.push(pv); } bx(0.1, 0.03, 0.18, 0x1f5fb0, 0, 0, -0.2); break;
    case 'eule': sph(0.26, 0x7a5a3a, 0, 0, 0).scale.y = 1.2; sph(0.09, 0xffffff, -0.1, 0.12, 0.2); sph(0.09, 0xffffff, 0.1, 0.12, 0.2); sph(0.045, 0xf2c230, -0.1, 0.12, 0.27); sph(0.045, 0xf2c230, 0.1, 0.12, 0.27); sph(0.02, 0x111111, -0.1, 0.12, 0.31); sph(0.02, 0x111111, 0.1, 0.12, 0.31);
      for (const sx of [-1, 1]) { const t = new T.Mesh(new T.ConeGeometry(0.05, 0.14, 4), L(0x5a3a20)); t.position.set(sx * 0.12, 0.33, 0.05); g.add(t); const pv = new T.Group(); pv.position.set(sx * 0.22, 0.05, 0); g.add(pv); bx(0.4, 0.04, 0.22, 0x5a3a20, sx * 0.2, 0, 0, pv); wings.push(pv); } break;
    case 'huhn': sph(0.22, 0xf4f4f0, 0, 0.42, 0).scale.z = 1.2; sph(0.13, 0xf4f4f0, 0, 0.66, 0.16); bx(0.04, 0.1, 0.12, 0xd8262c, 0, 0.8, 0.16); const hb = new T.Mesh(new T.ConeGeometry(0.035, 0.08, 6), L(0xf2a020)); hb.rotation.x = Math.PI / 2; hb.position.set(0, 0.65, 0.3); g.add(hb); bx(0.05, 0.08, 0.04, 0xd8262c, 0, 0.58, 0.26); eyes(0.69, 0.27, 0.05, 0.02);
      for (const sx of [-1, 1]) { const pv = new T.Group(); pv.position.set(sx * 0.2, 0.45, 0); g.add(pv); bx(0.04, 0.16, 0.24, 0xe8e8e2, 0, 0, 0, pv); wings.push(pv); leg(0.04, 0.22, 0xf2a020, sx * 0.08, 0, 0.22); } break;
    case 'reh': case 'rentier': { const c = id === 'reh' ? 0xb07a45 : 0x7a4a26, big = id === 'rentier' ? 1.25 : 1;
      const gg = new T.Group(); g.add(gg); gg.scale.setScalar(big);
      const B = (w, h, d, cc, x, y, z) => bx(w, h, d, cc, x, y, z, gg);
      B(0.4, 0.42, 1.0, c, 0, 0.95, 0); B(0.16, 0.5, 0.18, c, 0, 1.3, 0.5); B(0.22, 0.22, 0.34, c, 0, 1.55, 0.62); sph(0.045, id === 'rentier' ? 0xff2020 : 0x111111, 0, 1.52, 0.8, gg); B(0.14, 0.14, 0.06, 0xffffff, 0, 1.0, -0.52);
      for (const sx of [-1, 1]) { B(0.04, 0.15, 0.1, c, sx * 0.13, 1.68, 0.56); if (id === 'rentier') { B(0.04, 0.5, 0.04, 0xd8c8a0, sx * 0.1, 1.95, 0.55); B(0.25, 0.04, 0.04, 0xd8c8a0, sx * 0.2, 2.05, 0.55); B(0.04, 0.2, 0.04, 0xd8c8a0, sx * 0.3, 2.15, 0.55); } else B(0.03, 0.15, 0.03, 0xd8c8a0, sx * 0.07, 1.74, 0.56); }
      for (const [x, z] of [[-0.14, 0.38], [0.14, 0.38], [-0.14, -0.38], [0.14, -0.38]]) { const pv = new T.Group(); pv.position.set(x, 0.78, z); gg.add(pv); bx(0.08, 0.78, 0.08, c, 0, -0.39, 0, pv); legs.push(pv); }
      break; }
    case 'dino': { const gr = 0x4f9a3a;
      bx(0.7, 0.8, 1.4, gr, 0, 1.4, 0); bx(0.5, 0.5, 0.7, gr, 0, 2.0, 0.85); bx(0.48, 0.18, 0.6, 0x3f7a2e, 0, 1.78, 1.0); eyes(2.12, 1.18, 0.16, 0.05, 0xf2c230);
      for (let k = 0; k < 5; k++) bx(0.06, 0.08, 0.04, 0xffffff, -0.16 + k * 0.08, 1.86, 1.3);
      const tl = bx(0.35, 0.35, 1.4, gr, 0, 1.3, -1.2); tl.rotation.x = -0.25;
      for (const sx of [-1, 1]) { bx(0.1, 0.35, 0.1, gr, sx * 0.3, 1.5, 0.6); leg(0.24, 1.0, gr, sx * 0.25, 0, 1.05); }
      for (let k = 0; k < 6; k++) bx(0.06, 0.18, 0.18, 0x2e6a22, 0, 1.85 - k * 0.04, 0.4 - k * 0.4); break; }
    case 'fisch': { const bub = new T.Mesh(new T.SphereGeometry(0.45, 18, 14), new T.MeshStandardMaterial({ color: 0x8fdcff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 })); g.add(bub);
      const f = sph(0.14, 0xf27a1a, 0, 0, 0); f.scale.set(0.6, 0.8, 1.4); const tf = new T.Mesh(new T.ConeGeometry(0.1, 0.16, 4), L(0xf27a1a)); tf.rotation.x = -Math.PI / 2; tf.position.z = -0.25; g.add(tf); eyes(0.04, 0.14, 0.06, 0.02); wings.push(tf); break; }
    case 'alien': { const gc = 0x8fbf6a;
      bx(0.34, 0.36, 0.28, 0xa08a6a, 0, 0.35, 0); sph(0.22, gc, 0, 0.72, 0.02); eyes(0.75, 0.2, 0.08, 0.06, 0x111111);
      for (const sx of [-1, 1]) { const e = new T.Mesh(new T.ConeGeometry(0.1, 0.45, 8), L(gc)); e.rotation.z = sx * -1.35; e.position.set(sx * 0.36, 0.78, 0); g.add(e); bx(0.06, 0.2, 0.06, gc, sx * 0.2, 0.32, 0.08); }
      const pod = new T.Mesh(new T.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.7, roughness: 0.3, side: T.DoubleSide })); pod.position.y = 0.2; g.add(pod); break; }
  }
  return { g, legs, wings, fly: !!(PETS[id] || {}).fly, float: !!(PETS[id] || {}).float, phase: 0 };
};
IE.animPet = function (pt, dt, spd) {
  pt.phase += dt * (2 + Math.min(spd, 9) * 1.6);
  pt.legs.forEach((l, i) => l.rotation.x = spd > 0.3 ? Math.sin(pt.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 : 0);
  pt.wings.forEach((w, i) => { if (pt.float) w.rotation.y = Math.sin(pt.phase * 2) * 0.5; else w.rotation.z = Math.sin(pt.phase * (pt.fly ? 3 : 1.2)) * (pt.fly ? 0.8 : 0.3) * (i ? -1 : 1); });
};
let myPet = null; const homePets = [];
function petTick(dt) {
  const g = G(), P = g.P, S = g.S, id = S.petActive && (S.pets || []).includes(S.petActive) ? S.petActive : null;
  if (myPet && myPet.id !== id) { g.scene.remove(myPet.g); myPet = null; }
  if (!id) return;
  if (!myPet) { myPet = Object.assign(IE.makePet(id), { id, pos: P.pos.clone(), yaw: P.yaw }); g.scene.add(myPet.g); myPet._lvl = -1; }
  // Stärke-Level skaliert das Tier (Freizeitpark-Training)
  const lvl = IE.petLevel ? IE.petLevel(id) : 1; if (myPet._lvl !== lvl) { myPet._lvl = lvl; const s = 1 + (lvl - 1) * 0.09; myPet.g.scale.setScalar(s); }
  const hidden = !!P.veh || !!P.ride || g.game.dead || (launch && true);
  myPet.g.visible = !hidden; if (hidden) { myPet.pos.copy(P.pos); return; }
  const f = fwd(P.yaw), tx = P.pos.x - f.x * 2.2 + f.z * 1.2, tz = P.pos.z - f.z * 2.2 - f.x * 1.2;
  const dx = tx - myPet.pos.x, dz = tz - myPet.pos.z, d = Math.hypot(dx, dz);
  if (d > 30) myPet.pos.set(tx, P.pos.y, tz);
  let spd = 0; if (d > 0.6) { spd = Math.min(d * 2.2, 11); myPet.pos.x += dx / d * spd * dt; myPet.pos.z += dz / d * spd * dt; myPet.yaw = Math.atan2(dx, dz); } else myPet.yaw += (P.yaw - myPet.yaw) * Math.min(1, dt * 3);
  const gy = P.interior ? P.interior.it.y : IE.supportH(myPet.pos.x, myPet.pos.z, P.pos.y + 1.5);
  const t = performance.now() / 1000;
  myPet.pos.y = myPet.fly ? Math.max(gy, P.pos.y) + 2.2 + Math.sin(t * 2) * 0.25 : myPet.float ? Math.max(gy, P.pos.y - 0.2) + 0.9 + Math.sin(t * 2.5) * 0.12 : gy;
  myPet.g.position.copy(myPet.pos); myPet.g.rotation.y = myPet.yaw; IE.animPet(myPet, dt, spd);
}
IE.myPetId = () => { const S = G().S, P = G().P; return S.petActive && (S.pets || []).includes(S.petActive) && !P.veh && !P.ride ? S.petActive : ''; };
let zzzTex = null;
function zzz() { if (!zzzTex) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.font = 'bold 40px Arial'; x.fillText('Z', 10, 50); x.font = 'bold 30px Arial'; x.fillText('z', 50, 36); x.font = 'bold 22px Arial'; x.fillText('z', 82, 22); zzzTex = new T.CanvasTexture(c); }
  const sp = new T.Sprite(new T.SpriteMaterial({ map: zzzTex, transparent: true, depthTest: false })); sp.scale.set(0.9, 0.45, 1); return sp; }
function basketMesh() {
  const g = new T.Group(), wick = new T.MeshLambertMaterial({ color: 0xb08040 }), pillow = new T.MeshLambertMaterial({ color: [0xd8262c, 0x1f4fb0, 0x2e8b57, 0xd0569a][(rnd() * 4) | 0] });
  const ring = new T.Mesh(new T.TorusGeometry(0.75, 0.16, 8, 20), wick); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  const bot = new T.Mesh(new T.CylinderGeometry(0.8, 0.7, 0.12, 20), wick); bot.position.y = 0.06; g.add(bot);
  const pl = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.12, 20), pillow); pl.position.y = 0.16; g.add(pl);
  return g;
}
function homePetsTick(dt) {
  const g = G(), P = g.P, S = g.S, inVilla = P.interior && P.interior.it.type.indexOf('villa_') === 0;
  const want = inVilla ? (S.pets || []).filter(id => id !== S.petActive) : [];
  if (!inVilla || homePets.room !== P.interior.it.type || homePets.length !== want.length) {
    homePets.forEach(h => { g.scene.remove(h.g); g.scene.remove(h.basket); g.scene.remove(h.zz); }); homePets.length = 0; homePets.room = inVilla ? P.interior.it.type : null;
    if (inVilla) { const it = P.interior.it;
      // Alle Körbchen in einer Reihe an der großen Fensterwand (+z), die Tür in der Mitte wird frei gelassen
      const bz = it.z + it.D / 2 - 1.8, slots = [];
      for (let d = 4, step = 3.6; d <= it.W / 2 - 2.5 && slots.length < want.length + 2; d += step) { slots.push({ x: it.x - d, z: bz }); slots.push({ x: it.x + d, z: bz }); }
      want.forEach((id, k) => {
        const sl = slots[k] || { x: it.x - 4, z: bz }, bx = sl.x, bzz = sl.z;
        const big = id === 'dino' || id === 'rentier' || id === 'reh', basket = basketMesh(); basket.scale.setScalar(big ? 1.8 : 1); basket.position.set(bx, it.y, bzz); g.scene.add(basket);
        const h = Object.assign(IE.makePet(id), { id, x: bx, z: bzz, bx, bz: bzz, yaw: Math.PI, tx: bx, tz: bzz, state: 'sleep', timer: 3 + rnd() * 12, big });
        h.zz = zzz(); g.scene.add(h.zz); g.scene.add(h.g); h.basket = basket; homePets.push(h);
      }); }
  }
  if (!inVilla) return; const it = P.interior.it, t = performance.now() / 1000;
  for (const h of homePets) {
    h.timer -= dt; let spd = 0;
    if (h.timer <= 0) {
      if (h.state === 'sleep') { h.state = 'walk'; h.timer = 6 + rnd() * 8; h.tx = it.x + (rnd() - 0.5) * (it.W - 8); h.tz = it.z + (rnd() - 0.5) * (it.D - 10); }
      else if (h.state === 'walk') { if (rnd() < 0.5) { h.tx = it.x + (rnd() - 0.5) * (it.W - 8); h.tz = it.z + (rnd() - 0.5) * (it.D - 10); h.timer = 5 + rnd() * 6; } else { h.state = 'home'; h.tx = h.bx; h.tz = h.bz; h.timer = 30; } }
      else { h.state = 'sleep'; h.timer = 12 + rnd() * 20; }
    }
    const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
    if (h.state !== 'sleep' && d > 0.3) { spd = h.big ? 2.4 : 1.8; h.x += dx / d * Math.min(spd * dt, d); h.z += dz / d * Math.min(spd * dt, d); h.yaw = Math.atan2(dx, dz); }
    else if (h.state === 'home' && d <= 0.3) { h.state = 'sleep'; h.timer = 12 + rnd() * 20; }
    const sleeping = h.state === 'sleep';
    if (sleeping) { h.x += (h.bx - h.x) * Math.min(1, dt * 4); h.z += (h.bz - h.z) * Math.min(1, dt * 4); }
    const y = it.y + (sleeping ? 0.18 : h.fly ? 2 + Math.sin(t * 2) * 0.3 : h.float ? 1 + Math.sin(t * 2.5) * 0.1 : 0);
    h.g.position.set(h.x, y, h.z); h.g.rotation.y = h.yaw;
    h.g.scale.set(1, sleeping ? 0.75 : 1, 1); // im Körbchen eingerollt
    IE.animPet(h, sleeping ? 0 : dt, spd);
    h.zz.visible = sleeping; if (sleeping) h.zz.position.set(h.x + 0.4, it.y + (h.big ? 2.6 : 1.3) + Math.sin(t * 1.5 + h.bx) * 0.15, h.z);
  }
}
function openPets() {
  const g = G(), S = g.S; S.pets = S.pets || []; const rows = [], hasVilla = (S.villas || []).length > 0;
  for (const [id, p] of Object.entries(PETS)) {
    const own = S.pets.includes(id), act = S.petActive === id, lvl = IE.petLevel ? IE.petLevel(id) : 1;
    rows.push({ name: '🐾 ' + p.name + (own ? ' · 💪 Stärke Lv ' + lvl : ''), stat: own ? (act ? 'Läuft gerade mit dir mit' : hasVilla ? 'Bleibt zu Hause in deiner Villa' : 'Wartet zu Hause') : g.fmt(p.price),
      btns: own ? (act ? [{ label: 'Zu Hause lassen', fn: () => { S.petActive = ''; g.saveGame(); openPets(); if (!hasVilla) g.toast('Tipp: Mit einer Villa kannst du deine Tiere zu Hause besuchen', 3); } }, { label: lvl >= 10 ? 'Max. Stärke' : '🎡 Park-Training · ' + g.fmt(lvl * 15000), buy: lvl < 10, off: lvl >= 10, fn: () => { if (IE.petTrain && IE.petTrain()) openPets(); } }] : [{ label: 'Mitnehmen', buy: true, fn: () => { S.petActive = id; g.saveGame(); openPets(); } }])
        : [{ label: 'Kaufen · ' + g.fmt(p.price), buy: true, off: S.money < p.price, fn: () => { if (S.money < p.price) return; S.money -= p.price; S.pets.push(id); S.petActive = id; g.sfx('cash'); g.saveGame(); openPets(); g.toast(p.name + ' gehört jetzt dir und läuft mit dir mit!', 3); } }] });
  }
  xModal('pets', '🐾 Haustiere', rows, 'Immer nur ein Tier läuft mit dir mit – die anderen bleiben zu Hause in deiner Villa (dort kannst du sie besuchen). Online sehen alle Spieler dein Tier.');
}
IE.openPets = openPets;


// ================= PRIVATE INSELN (kaufen & ausbauen) =================
const ISL_UP = [
  { id: 'haus',   name: 'Villa bauen',            price: 5000000,  info: 'Eine Villa auf der Insel, die du betreten kannst' },
  { id: 'steg',   name: 'Steg bauen',             price: 1500000,  info: 'Ein Holzsteg ins Wasser für deine Boote' },
  { id: 'heli',   name: 'Helikopterplatz bauen',  price: 2500000,  info: 'Ein Landeplatz für Helikopter' },
  { id: 'hangar', name: 'Hangar bauen',           price: 6000000,  info: 'Ein Hangar für Flugzeuge' },
  { id: 'bahn',   name: 'Landebahn bauen',        price: 9000000,  info: 'Eine kleine Start- und Landebahn für Flugzeuge' }
];
IE.islandUpDefs = ISL_UP;
function islOwnedByOther(is) { const o = isOnline() && IE.houseOwners[is.id]; return o && o.slug !== mySlug() ? o : null; }
function islMine(is) { return (G().S.islands || []).includes(is.id) && !islOwnedByOther(is); }
function buildIslands(scene) {
  const sand = new T.MeshLambertMaterial({ color: 0xe8dcae });
  IE.islands.forEach((is, idx) => {
    const y = is.h; is.y = y;
    // sichtbarer Insel-Teller (auf dem Terrain), Palmen, Zentrum
    const disc = new T.Mesh(new T.CylinderGeometry(is.r - 4, is.r + 2, 1.4, 36), sand); disc.position.set(is.x, y - 0.4, is.z); scene.add(disc);
    const grp = new T.Group(); grp.position.set(is.x, y, is.z); scene.add(grp); is.group = grp;
    // Palmen am Rand
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, px = Math.cos(a) * (is.r - 12), pz = Math.sin(a) * (is.r - 12), pg = new T.Group(); pg.position.set(px, 0, pz); grp.add(pg);
      box(0.5, 7, 0.5, new T.MeshLambertMaterial({ color: 0x7a5a3a }), 0, 3.5, 0, pg);
      for (let l = 0; l < 6; l++) { const lf = box(0.4, 0.15, 4, new T.MeshLambertMaterial({ color: 0x3f7a35 }), 0, 7, 1.8, null); const pv = new T.Group(); pv.rotation.y = l / 6 * Math.PI * 2; lf.rotation.x = 0.35; pv.add(lf); pg.add(pv); } }
    // Schild in der Mitte
    const sg = textTex([{ t: is.name, f: 'bold 50px Georgia' }], 512, 128, '#1b2b3b', '#d9b45a');
    const sm = new T.Mesh(new T.PlaneGeometry(10, 2.5), new T.MeshBasicMaterial({ map: sg.t, side: T.DoubleSide })); sm.position.set(0, 3, 0); grp.add(sm); is.sign = sm;
    box(0.4, 3, 0.4, IE.mat.dark, 0, 1.5, 0, grp);
    is.upGroup = new T.Group(); grp.add(is.upGroup);
    // eigenes Haus-Interieur (immer vorhanden, betreten nur wenn Villa gebaut)
    buildRoom({ id: is.id, name: is.name }, 20 + idx, scene, 'islh_');
    is.door = { x: is.x - 26, z: is.z - 6 }; // Haustür-Platz (vor Villa-Bau)
    rebuildIsland(is);
  });
  drawIslandSigns();
}
function rebuildIsland(is) {
  const up = (G().S.islandUp && G().S.islandUp[is.id]) || {}, g = is.upGroup;
  while (g.children.length) g.remove(g.children[0]);
  const addCol = (x0, z0, x1, z1, top) => IE.addBox(is.x + x0, is.z + z0, is.x + x1, is.z + z1, is.y + top);
  // Villa in einer Ecke
  if (up.haus) {
    const s = 1.6, hx = -26, hz = -18;
    box(18 * s, 6, 10 * s, IE.mat.white, hx, 3, hz - 3 * s, g); box(14 * s, 5, 8 * s, IE.mat.white, hx - 1.5 * s, 8.5, hz - 4 * s, g);
    box(19 * s, 0.5, 11 * s, new T.MeshLambertMaterial({ color: 0xb75a32 }), hx, 6.2, hz - 3 * s, g);
    for (let k = -3; k <= 3; k++) box(2.1 * s, 3.6, 0.1, IE.mat.glass, hx + k * 2.5 * s, 2.7, hz + 2.05 * s, g);
    box(3, 3.2, 0.2, IE.mat.dark, hx, 1.6, hz + 2.6 * s, g); // Tür
    addCol(hx - 15, hz - 13, hx + 15, hz + 2, 11);
    is.door = { x: is.x + hx, z: is.z + hz + 2.6 * s + 1.2 };
  }
  // Steg am Rand (gegenüber der Villa)
  if (up.steg) { const sx = is.r - 8, sz = 18; for (let k = 0; k < 12; k++) box(4, 0.3, 2.4, new T.MeshLambertMaterial({ color: 0x8a6a42 }), sx + k * 2.6, -(is.y) + 0.2, sz, g); for (let k = 0; k < 7; k++) box(0.3, 2, 0.3, new T.MeshLambertMaterial({ color: 0x5a4330 }), sx + k * 4.5, -(is.y) - 0.8, sz - 1, g); }
  // Helikopterplatz (vorne rechts)
  if (up.heli) { const hx = 24, hz = 22; box(16, 0.3, 16, new T.MeshLambertMaterial({ color: 0x4a4e52 }), hx, 0.15, hz, g); const circ = new T.Mesh(new T.RingGeometry(5, 6.2, 24), new T.MeshBasicMaterial({ color: 0xf2f2ee, side: T.DoubleSide })); circ.rotation.x = -Math.PI / 2; circ.position.set(hx, 0.35, hz); g.add(circ); const hTex = textTex([{ t: 'H', f: 'bold 90px Arial' }], 64, 64, 'rgba(0,0,0,0)', '#f2f2ee'); const hm = new T.Mesh(new T.PlaneGeometry(6, 6), new T.MeshBasicMaterial({ map: hTex.t, transparent: true })); hm.rotation.x = -Math.PI / 2; hm.position.set(hx, 0.36, hz); g.add(hm); is.heliSpot = { x: is.x + hx, z: is.z + hz }; }
  // Hangar in der gegenüberliegenden Ecke – weit weg von der Villa
  if (up.hangar) { const hx = 28, hz = -26, hm = new T.MeshLambertMaterial({ color: 0xb7bcc2, side: T.DoubleSide }); const hg = new T.CylinderGeometry(10, 10, 22, 20, 1, true, 0, Math.PI); hg.rotateZ(Math.PI / 2); hg.rotateY(Math.PI / 2); const roof = new T.Mesh(hg, hm); roof.rotation.y = Math.PI / 2; roof.position.set(hx, 0, hz); g.add(roof); box(22, 0.2, 22, new T.MeshLambertMaterial({ color: 0x9a9c9f }), hx, 0.1, hz, g); addCol(hx - 11, hz - 11, hx - 10, hz + 11, 10); is.hangarSpot = { x: is.x + hx, z: is.z + hz }; }
  // Lange Landebahn: geht über die Insel hinaus übers Wasser, damit man leicht landen kann
  if (up.bahn) {
    const LEN = 260, W = 20, lx = 2; // Länge, Breite, seitlicher Versatz (an Villa/Heli vorbei)
    box(W, 0.3, LEN, new T.MeshLambertMaterial({ color: 0x33363a }), lx, 0.14, 0, g);          // Asphaltdeck
    box(W + 2, 0.2, LEN, new T.MeshLambertMaterial({ color: 0x1f2124 }), lx, 0.04, 0, g);        // dunkler Rand
    // Mittellinie gestrichelt
    for (let z = -LEN / 2 + 8; z < LEN / 2 - 8; z += 12) box(1.1, 0.34, 6, new T.MeshBasicMaterial({ color: 0xf1f1ea }), lx, 0.16, z, g);
    // Schwellenmarkierungen an beiden Enden
    for (const e of [-1, 1]) for (let k = -3; k <= 3; k++) box(1.6, 0.34, 7, new T.MeshBasicMaterial({ color: 0xf1f1ea }), lx + k * 2.4, 0.17, e * (LEN / 2 - 7), g);
    // Stützpfeiler für den Teil über dem Wasser
    const pm = new T.MeshLambertMaterial({ color: 0x8a8d90 });
    for (let z = -LEN / 2 + 10; z <= LEN / 2 - 10; z += 20) for (const sx of [-1, 1]) {
      const wx = is.x + lx + sx * (W / 2 - 1), wz = is.z + z, gy = IE.groundH(wx, wz);
      if (gy > is.y - 1.5) continue; // nur über Wasser/tiefem Boden
      const h = is.y - gy; const col = new T.Mesh(new T.CylinderGeometry(0.9, 1.1, h, 10), pm); col.position.set(lx + sx * (W / 2 - 1), -h / 2, z); g.add(col);
    }
    // Kollisionsfläche (dünne Platte oben) – darauf landen Flugzeuge, man kann darauf laufen, Boote fahren darunter durch
    IE.addBox(is.x + lx - W / 2, is.z - LEN / 2, is.x + lx + W / 2, is.z + LEN / 2, is.y + 0.3, is.y - 1.2);
    // Windsack
    box(0.2, 5, 0.2, new T.MeshLambertMaterial({ color: 0x333333 }), lx + W / 2 + 3, 2.5, LEN / 2 - 12, g);
    is.bahn = true;
  }
}
function drawIslandSigns() {
  const S = G().S;
  for (const is of IE.islands) { if (!is.sign) continue; const other = islOwnedByOther(is), own = (S.islands || []).includes(is.id) && !other;
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#1b2b3b'; x.fillRect(0, 0, 512, 128);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#d9b45a'; x.font = 'bold 44px Georgia'; x.fillText(is.name, 256, 46);
    x.font = 'bold 32px Arial'; x.fillStyle = own ? '#48e07a' : other ? '#ff9a7a' : '#f3ead8';
    x.fillText(own ? 'DEINE INSEL' : other ? 'GEHÖRT ' + String(other.nick).toUpperCase().slice(0, 14) : 'ZU VERKAUFEN · ' + (is.price / 1e6) + ' Mio. €', 256, 94);
    is.sign.material.map.dispose(); is.sign.material.map = new T.CanvasTexture(c); is.sign.material.needsUpdate = true;
  }
}
IE.refreshIslands = drawIslandSigns; IE.rebuildIsland = rebuildIsland;
function nearIsland(pos) { for (const is of IE.islands) if (Math.hypot(pos.x - is.x, pos.z - is.z) < is.r - 2) return is; return null; }
function enterIslandHouse(is) {
  const g = G(), P = g.P; furnishRoom({ id: is.id });
  g.enterInterior('islh_' + is.id, is.door.x, is.door.z + 4, null);
  if (P.interior) { P.interior.villa = { id: is.id, name: is.name }; enterVilla.cool = performance.now(); g.toast(is.name, 2); }
}
function buyIsland(is) {
  const g = G(), S = g.S;
  xModal('island', is.name, [{ name: '🏝 ' + is.name, stat: 'Eine eigene Insel im Meer – baue Villa, Steg, Helikopterplatz, Hangar und Landebahn', btns: [{ label: 'Kaufen · ' + g.fmt(is.price), buy: true, off: S.money < is.price, fn: () => {
    if (S.money < is.price) return;
    const done = () => { S.money -= is.price; S.islands = (S.islands || []).concat(is.id); S.islandUp = S.islandUp || {}; S.islandUp[is.id] = S.islandUp[is.id] || {}; g.sfx('cash'); g.saveGame(); drawIslandSigns(); g.closeModals(); g.banner('Insel gekauft', is.name, 'Bau sie aus: geh auf die Insel und drück E', 5); };
    const a = SRVA();
    if (isOnline() && a && a.house) a.house('buy', is.id).then(() => { IE.houseOwners[is.id] = { slug: mySlug(), nick: IEaccount.nick }; done(); }).catch(e => { if (e.code === 'taken') { g.toast('Zu spät – ' + is.name + ' gehört schon ' + (e.nick || 'jemandem'), 4); syncHouses(); } else g.toast('Server-Fehler – nochmal versuchen', 3); });
    else done();
  } }] }], S.money < is.price ? 'Dir fehlen noch ' + g.fmt(is.price - S.money) + '.' : 'Nach dem Kauf baust du die Insel Stück für Stück aus.');
}
function islandMenu(is) {
  const g = G(), S = g.S; S.islandUp = S.islandUp || {}; const up = S.islandUp[is.id] = S.islandUp[is.id] || {}, rows = [];
  for (const u of ISL_UP) { const have = !!up[u.id];
    rows.push({ name: (have ? '✅ ' : '🔨 ') + u.name, stat: have ? 'Gebaut · ' + u.info : u.info, btns: have ? [{ label: 'Gebaut', off: true, fn: () => {} }] : [{ label: 'Bauen · ' + g.fmt(u.price), buy: true, off: S.money < u.price, fn: () => { if (S.money < u.price) return; S.money -= u.price; up[u.id] = true; g.sfx('cash'); g.saveGame(); rebuildIsland(is); islandMenu(is); g.toast(u.name + ' fertig!', 2.5); } }] });
  }
  if (up.haus) { rows.push({ name: '🛋 Haus-Einrichtung', stat: 'Möbel für deine Insel-Villa', btns: [{ label: 'Einrichten', fn: () => furnitureMenu({ id: is.id, name: is.name }) }] }); rows.push({ name: '🚪 Villa betreten', stat: '', btns: [{ label: 'Betreten', buy: true, fn: () => { g.closeModals(); enterIslandHouse(is); } }] }); }
  const sell = Math.round(is.price * 0.7);
  rows.push({ name: 'Insel verkaufen', stat: 'Du bekommst ' + g.fmt(sell) + ' (die Ausbauten gehen verloren)', btns: [{ label: 'Verkaufen · ' + g.fmt(sell), fn: () => { if (!confirm(is.name + ' wirklich verkaufen?')) return; S.islands = (S.islands || []).filter(x => x !== is.id); delete S.islandUp[is.id]; S.money += sell; g.sfx('cash'); const a = SRVA(); if (isOnline() && a && a.house) a.house('sell', is.id).catch(() => {}); delete IE.houseOwners[is.id]; rebuildIsland(is); drawIslandSigns(); g.saveGame(); g.closeModals(); g.banner('Insel verkauft', is.name, '+ ' + g.fmt(sell), 4); } }] });
  xModal('island', is.name + ' ausbauen', rows, 'Online gehört die Insel nur dir. Höchstens eigene Inseln kannst du frei ausbauen.');
}
IE.islandPrompt = function () {
  const g = G(), P = g.P; if (P.veh || P.interior) {
    if (P.interior && P.interior.it && P.interior.it.type && P.interior.it.type.indexOf('islh_') === 0) { const it = P.interior.it; if (Math.hypot(P.pos.x - it.door.x, P.pos.z - it.door.z) < 2.5) return '<b>E</b> · Hinausgehen'; if (Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 4.5) return '<b>E</b> · Ausruhen (Gesundheit voll + speichern)'; return '<b>E</b> · Haus-Menü'; }
    return '';
  }
  const is = nearIsland(P.pos); if (!is) return '';
  const other = islOwnedByOther(is); if (other) return is.name + ' gehört ' + other.nick;
  if (islMine(is)) { const up = (g.S.islandUp || {})[is.id] || {}; if (up.haus && Math.hypot(P.pos.x - is.door.x, P.pos.z - is.door.z) < 2.2) return '<b>E</b> · Villa betreten'; return '<b>E</b> · ' + is.name + ' ausbauen'; }
  return '<b>E</b> · ' + is.name + ' kaufen · ' + g.fmt(is.price);
};
IE.islandAct = function () {
  const g = G(), P = g.P;
  if (P.interior && P.interior.it && P.interior.it.type && P.interior.it.type.indexOf('islh_') === 0) { const it = P.interior.it; if (Math.hypot(P.pos.x - it.door.x, P.pos.z - it.door.z) < 2.5) { g.exitInterior(); enterVilla.cool = performance.now(); return true; } if (Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 4.5) { P.health = Math.max(P.health, g.maxHP()); g.saveGame(); g.toast('Ausgeruht · Spiel gespeichert', 2.5); g.sfx('pass'); return true; } for (const is of IE.islands) if (is.id === it.type.slice(5)) { islandMenu(is); break; } return true; }
  if (P.veh || P.interior) return false;
  const is = nearIsland(P.pos); if (!is) return false;
  if (islOwnedByOther(is)) { g.toast(is.name + ' gehört ' + islOwnedByOther(is).nick, 2.5); return true; }
  if (islMine(is)) { const up = (g.S.islandUp || {})[is.id] || {}; if (up.haus && Math.hypot(P.pos.x - is.door.x, P.pos.z - is.door.z) < 2.2) enterIslandHouse(is); else islandMenu(is); } else buyIsland(is);
  return true;
};

// ================= TAG-NACHT-ZYKLUS (24 Min Tag, 5 Min Nacht) =================
const DAY_SEC = 24 * 60, NIGHT_SEC = 5 * 60, CYCLE = DAY_SEC + NIGHT_SEC;
const _cDay = new T.Color(0xfff0d6), _cNight = new T.Color(0x6f86c4), _cSunset = new T.Color(0xffa24a);
const _hSkyD = new T.Color(0xcfe3ff), _hSkyN = new T.Color(0x16233f), _hGrD = new T.Color(0x8a7b5a), _hGrN = new T.Color(0x12161f);
const _fogNight = new T.Color(0x0b1226), _tmp = new T.Color(), _tmp2 = new T.Color();
IE.nightFactor = 0;
function nightAt(sec) {
  const t = ((sec % CYCLE) + CYCLE) % CYCLE;
  if (t < DAY_SEC - 90) return 0;                 // voller Tag
  if (t < DAY_SEC) return (t - (DAY_SEC - 90)) / 90;   // Dämmerung (Abend)
  if (t < CYCLE - 60) return 1;                   // volle Nacht
  return 1 - (t - (CYCLE - 60)) / 60;             // Morgendämmerung
}
IE.dayNightApply = function () {
  const g = G(), L = IE.lights, M = IE.skyMat; if (!L || !M) return;
  if (IE.onMoon) { M.uniforms.uNight.value = 1; M.uniforms.uSunset.value = 0; return; }
  const night = nightAt(Date.now() / 1000), sunset = Math.max(0, Math.min(1, 4 * night * (1 - night)));
  IE.nightFactor = night;
  M.uniforms.uNight.value = night; M.uniforms.uSunset.value = sunset;
  // Sonne: Helligkeit und Farbe
  L.sun.intensity = 1.15 * (1 - night * 0.9) + 0.06;
  _tmp.copy(_cDay).lerp(_cNight, night); _tmp.lerp(_cSunset, sunset * 0.55); L.sun.color.copy(_tmp);
  // Himmelslicht + Boden
  L.hemi.intensity = 0.6 * (1 - night * 0.78) + 0.05;
  L.hemi.color.copy(_hSkyD).lerp(_hSkyN, night);
  L.hemi.groundColor.copy(_hGrD).lerp(_hGrN, night);
  L.ambient.intensity = 0.12 * (1 - night * 0.55);
  // Nebel einfärben (nicht unter Wasser / in der Zombie-Apokalypse)
  if (!g.game.uw && !(g.game.ch && g.game.ch.zombies)) g.scene.fog.color.lerp(_fogNight, night * 0.82);
};

// ================= SPIELLOGIK =================
let R = null; // aktuelles Rennen
let rob = null; // laufender Überfall
const ONL = () => window.IEonline && IEonline.active;
const myName = () => (window.IEaccount && IEaccount.nick) || 'Du';
const fmtT = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const PRIZE_TOP = { 1: 30000, 2: 500000, 3: 700000, 4: 1000000 }; // Siegprämie nach Anzahl echter Fahrer (1 = Solo gegen KI)
const PLACE_SHARE = [1, 0.3, 0.15, 0.05];
const prizeFor = (n, place) => Math.round(PRIZE_TOP[Math.max(1, Math.min(4, n))] * PLACE_SHARE[Math.min(place - 1, 3)]);

// Fortschritt auf der Strecke
function trackIdx(x, z, hint) {
  const pts = IE.trackPts, n = pts.length; let best = hint || 0, bd = 1e9;
  const scan = (from, to) => { for (let k = from; k <= to; k++) { const i = (k + n) % n, p = pts[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } } };
  if (hint !== undefined) scan(hint - 25, hint + 40); if (bd > 900) scan(0, n - 1);
  return { i: best, d: Math.sqrt(bd) };
}
function gridSlot(k) {
  const pts = IE.trackPts, i = (pts.length - 6 - Math.floor(k / 2) * 4) % pts.length, p = pts[i], side = k % 2 ? 1 : -1;
  return { x: p.x + (-p.dz) * 4 * side, z: p.z + p.dx * 4 * side, yaw: Math.atan2(p.dx, p.dz) };
}
function ensureRaceCar(slot) {
  const g = G(), P = g.P;
  let v = P.veh && P.veh.type === 'car' && !P.veh.dead ? P.veh : null;
  if (!v) { v = IE.spawnCar(g.scene, 'gt3', slot.x, slot.z, slot.yaw, { color: [0xf27a1a, 0x1f4fb0, 0x2e8b57, 0xd8262c][(rnd() * 4) | 0] }); v.rental = true; g.putInVehicle(v); }
  v.pos.set(slot.x, IE.groundH(slot.x, slot.z) + 0.05, slot.z); v.yaw = slot.yaw; v.speed = 0; v.pitch = v.roll = 0; v.loop = null;
  v.group.position.copy(v.pos); v.group.rotation.set(0, v.yaw, 0); g.cam.yaw = v.yaw;
  return v;
}
function raceHUD() {
  const g = G(), el = $('obj');
  if (!R) return;
  el.hidden = false;
  if (R.state === 'lobby') { el.innerHTML = `<small>Rennen · ${R.laps} ${R.laps > 1 ? 'Runden' : 'Runde'}</small>${R.host ? 'Warte auf Mitspieler … (E = Menü)' : 'Warte auf den Start …'}`; return; }
  if (R.state === 'count') { el.innerHTML = `<small>Rennen</small>Gleich geht's los!`; return; }
  const t = R.state === 'done' ? R.myTime : (performance.now() - R.t0) / 1000;
  const ps = standings(), me = ps.findIndex(x => x.me) + 1;
  el.innerHTML = `<small>Rennen · Runde ${Math.max(1, Math.min(R.lap + 1, R.laps))}/${R.laps}</small>Platz ${me}/${ps.length} · ${fmtT(t)}${R.state === 'done' ? ' · Ziel!' : ''}`;
}
function standings() {
  const list = [{ me: true, name: myName(), p: R.fin ? 1e9 - R.finRank : R.lap * IE.trackLen + R.s }];
  for (const a of R.ai || []) list.push({ name: a.name, p: a.fin ? 1e9 - a.finRank : a.lap * IE.trackLen + a.s });
  if (ONL()) for (const r of IEonline.peers.values()) { const rc = r.pr && r.pr.rc; if (rc && rc.id === R.id) list.push({ name: r.name, p: rc.f ? 1e9 - rc.f : rc.p }); }
  return list.sort((a, b) => b.p - a.p);
}
function startCountdown(laps) {
  const g = G(); if (!R) return;
  R.state = 'count'; R.laps = laps || R.laps; R.lap = -1; R.s = 0; R.idx = 0; R.gate = 0; R.fin = false; R.finRank = 0; R.finCount = 0;
  const v = ensureRaceCar(R.slot); R.car = v;
  let n = 3; g.banner('Rennen', String(n), R.laps + (R.laps > 1 ? ' Runden' : ' Runde'), 0.9); g.sfx('beep');
  const tick = () => { if (!R || R.state !== 'count') return; n--; if (n > 0) { g.banner('Rennen', String(n), '', 0.9); g.sfx('beep'); setTimeout(tick, 1000); } else { g.banner('Rennen', 'LOS!', '', 1.2); g.sfx('pass'); R.state = 'race'; R.t0 = performance.now(); if (R.ai) R.ai.forEach(a => a.go = true); } };
  setTimeout(tick, 1000);
}
function raceEmit(d) { if (ONL() && IEonline.raceEmit) IEonline.raceEmit(Object.assign({ id: R ? R.id : d.id }, d)); }
function finishMe() {
  const g = G(); R.fin = true; R.state = 'done'; R.myTime = (performance.now() - R.t0) / 1000; R.finCount++; R.finRank = R.finCount;
  const place = R.finRank, prize = prizeFor(R.solo ? 1 : R.n, place);
  g.addMoney(prize); g.banner(place === 1 ? 'Sieg!' : 'Im Ziel', 'Platz ' + place, fmtT(R.myTime) + ' · + ' + g.fmt(prize), 5); g.sfx('pass');
  raceEmit({ t: 'fin', name: myName(), time: R.myTime });
  setTimeout(() => { if (R && R.state === 'done') endRace(); }, 15000);
}
function endRace(msg) {
  const g = G(); if (!R) return;
  if (R.ai) for (const a of R.ai) a.v.removeMe = true;
  if (msg) g.toast(msg, 3);
  R = null; if (!g.mission.active) $('obj').hidden = true;
}
IE.racePresence = () => R && (R.state === 'race' || R.state === 'done' || R.state === 'count') ? { id: R.id, p: Math.round(R.lap * IE.trackLen + R.s), f: R.fin ? R.finRank : 0 } : (R && R.state === 'lobby' ? { id: R.id, p: 0, f: 0 } : null);
function updateRace(dt) {
  if (!R) return;
  const g = G(), P = g.P;
  if (R.state === 'count' && R.car) { const v = R.car; v.speed = 0; v.pos.set(R.slot.x, v.pos.y, R.slot.z); v.yaw = R.slot.yaw; }
  if (R.state === 'race') {
    if (!P.veh || P.veh !== R.car || P.veh.dead) return endRace('Rennen abgebrochen – du hast dein Auto verlassen');
    const t = trackIdx(P.veh.pos.x, P.veh.pos.z, R.idx);
    if (t.d > 160) return endRace('Rennen abgebrochen – zu weit von der Strecke');
    // auf der Strecke bleiben: neben der Strecke bremsen, nach 3 s zurücksetzen
    if (t.d > TW + 3.5 && !P.veh.loop) {
      R.offT = (R.offT || 0) + dt; const v = P.veh; if (v.speed > 11) v.speed -= (v.speed - 11) * Math.min(1, dt * 3);
      if (!R.offWarn) { R.offWarn = true; g.toast('Zurück auf die Strecke!', 2); g.sfx('fail'); }
      if (R.offT > 3) { const q = IE.trackPts[R.idx]; v.pos.set(q.x, IE.groundH(q.x, q.z) + 0.05, q.z); v.yaw = Math.atan2(q.dx, q.dz); v.speed = 0; v.pitch = v.roll = 0; v.group.position.copy(v.pos); v.group.rotation.set(0, v.yaw, 0); g.cam.yaw = v.yaw; R.offT = 0; R.offWarn = false; g.toast('Auf die Strecke zurückgesetzt', 2); }
    } else { R.offT = 0; R.offWarn = false; }
    const n = IE.trackPts.length, prev = R.idx; R.idx = t.i;
    const q = Math.floor(t.i / n * 4); if (q === R.gate + 1) R.gate = q;
    if (prev > n * 0.85 && t.i < n * 0.15) { if (R.lap < 0) { R.lap = 0; R.gate = 0; } else if (R.gate >= 3) { R.lap++; R.gate = 0; if (R.lap >= R.laps) { R.s = 0; finishMe(); } else { g.banner('Runde ' + (R.lap + 1), 'von ' + R.laps, '', 1.5); g.sfx('beep'); } } }
    else if (prev < n * 0.15 && t.i > n * 0.85 && R.gate === 0) { /* rückwärts über die Linie */ }
    R.s = IE.trackPts[t.i].s;
  }
  if (R && R.ai) for (const a of R.ai) aiStep(a, dt);
  if (R) raceHUD();
}
// KI-Gegner (fahren die Ideallinie ab)
const AI_NAMES = ['Lupo Rossi', 'Gianni Turbo', 'Marta Veloce', 'Enzo Corsa', 'Paolo Nitro'];
function aiStep(a, dt) {
  const v = a.v; if (v.dead || v.removeMe) return;
  const pts = IE.trackPts, n = pts.length;
  if (R.state === 'race' && a.go && !a.fin) {
    const p = pts[a.i % n], q = pts[(a.i + 8) % n], curv = Math.abs(p.dx * q.dz - p.dz * q.dx);
    const target = a.top * (1 - Math.min(0.55, curv * 2.2)) * (1 + Math.max(-0.12, Math.min(0.12, ((R.lap * IE.trackLen + R.s) - (a.lap * IE.trackLen + a.s)) / 900)));
    a.v.speed += (target - a.v.speed) * Math.min(1, dt * 0.9);
    a.d += a.v.speed * dt;
    while (a.d > 0) { const nx = (a.i + 1) % n, seg = nx === 0 ? IE.trackLen - pts[a.i].s : pts[nx].s - pts[a.i].s; if (a.d < seg) break; a.d -= seg; a.i = nx; if (a.i === 0) { a.lap++; if (a.lap >= R.laps) { a.fin = true; R.finCount++; a.finRank = R.finCount; } } }
  }
  const p = pts[a.i % n], nxp = pts[(a.i + 1) % n], seg = Math.max(0.01, Math.hypot(nxp.x - p.x, nxp.z - p.z)), t = Math.max(0, a.d) / seg;
  const x = p.x + (nxp.x - p.x) * t + (-p.dz) * a.lane, z = p.z + (nxp.z - p.z) * t + p.dx * a.lane;
  a.s = p.s;
  if (!a.loop && R.state === 'race') for (const L of loops) { const al = (x - L.x) * L.dx + (z - L.z) * L.dz, la = (x - L.x) * L.rx + (z - L.z) * L.rz; if (al > -1.5 && al < 1.2 && Math.abs(la) < TW && a.lastLoop !== L) { a.loop = { L, th: 0, spd: Math.max(24, v.speed), off: la + LSHIFT / 2 }; a.lastLoop = L; break; } }
  if (a.lastLoop && Math.hypot(a.lastLoop.x - x, a.lastLoop.z - z) > 30) a.lastLoop = null;
  if (a.loop) { v.loop = a.loop; IE.loopUpdate(v, dt); if (!v.loop) a.loop = null; return; }
  v.pos.set(x, IE.groundH(x, z) + 0.05, z); v.yaw = Math.atan2(p.dx, p.dz); v.pitch = 0;
  v.group.position.copy(v.pos); v.group.rotation.set(0, v.yaw, 0);
  v.wheelRot = (v.wheelRot || 0) + v.speed * dt / 0.34; if (v.m.wheels) v.m.wheels.forEach(w => { if (w.children[0]) w.children[0].rotation.z = -v.wheelRot; });
}
IE.raceAIUpdate = function () { /* wird über updateRace bewegt */ };
function startSolo(laps) {
  const g = G();
  R = { id: 'solo' + Date.now(), host: true, solo: true, state: 'count', laps, slot: gridSlot(0), n: 4, ai: [] };
  for (let k = 1; k <= 3; k++) {
    const sl = gridSlot(k), v = IE.spawnCar(g.scene, ['gt3', 'veloce', 'stallone', 'rosso', 'fulmine'][(rnd() * 5) | 0], sl.x, sl.z, sl.yaw, { color: [0x1f4fb0, 0x2e8b57, 0xd8262c, 0xf2c230][k] });
    v.raceAI = true; v.driver = 'race'; v.health = 1e6;
    const it = trackIdx(sl.x, sl.z);
    R.ai.push({ v, name: AI_NAMES[k - 1], i: it.i, d: 0, lap: (it.i > IE.trackPts.length / 2 ? -1 : 0), s: 0, lane: (k % 2 ? 4 : -4) * 0.8, top: 46 + k * 2.5 + rnd() * 4, go: false, fin: false });
  }
  startCountdown(laps);
}

// ----- Online: Einladungen -----
function inviteUI(fromName, laps, id, hostPeer) {
  const el = $('raceInv'); el.hidden = false;
  $('raceInvTxt').textContent = `${fromName} lädt dich zu einem Rennen ein (${laps} ${laps > 1 ? 'Runden' : 'Runde'}) auf dem Autodromo dell'Adriatico.`;
  $('raceInvYes').onclick = () => {
    el.hidden = true; if (R) endRace();
    const slot = gridSlot(1 + ((rnd() * 7) | 0));
    R = { id, host: false, hostPeer, state: 'lobby', laps, slot, n: 2 };
    ensureRaceCar(slot); G().toast('Du stehst in der Startaufstellung', 2.5); raceEmit({ t: 'acc', name: myName() });
  };
  $('raceInvNo').onclick = () => { el.hidden = true; };
  clearTimeout(inviteUI.t); inviteUI.t = setTimeout(() => { el.hidden = true; }, 30000);
}
IE.onRaceMsg = function (msg) {
  const d = msg.data && msg.data.race; if (!d || msg.sameTab) return;
  const g = G();
  if (d.t === 'inv') { if (d.to !== '*' && d.to !== IEonline.mePeer) return; inviteUI(d.host || 'Ein Spieler', d.laps || 1, d.id, msg.peer); }
  else if (!R || d.id !== R.id) return;
  else if (d.t === 'acc' && R.host) { R.joined = R.joined || []; if (!R.joined.includes(d.name)) R.joined.push(d.name); g.toast(d.name + ' ist dabei!', 2.5); if (!$('xModal').hidden && $('xModal').dataset.k === 'race') openRaceMenu(); }
  else if (d.t === 'go' && !R.host) { R.n = d.n || 2; startCountdown(d.laps); }
  else if (d.t === 'fin') { R.finCount = (R.finCount || 0) + 1; g.toast(`🏁 ${d.name} ist im Ziel (${fmtT(+d.time || 0)})`, 3); }
  else if (d.t === 'cancel' && !R.host) endRace('Der Gastgeber hat das Rennen abgesagt');
};

// ----- Menü (xModal) -----
function xModal(key, title, rows, hint) {
  const g = G(); g.closeModals(); document.body.classList.add('modalopen');
  const m = $('xModal'); m.dataset.k = key; m.hidden = false; $('xTitle').textContent = title; $('xHint').textContent = hint || '';
  const box = $('xRows'); box.innerHTML = '';
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<div><div class="nm"></div><div class="st"></div></div><div class="acts"></div>`;
    row.querySelector('.nm').textContent = r.name; row.querySelector('.st').textContent = r.stat || '';
    for (const b of r.btns || []) { const e = document.createElement('button'); e.textContent = b.label; if (b.buy) e.className = 'buy'; if (b.off) e.disabled = true; e.onclick = b.fn; row.querySelector('.acts').appendChild(e); }
    box.appendChild(row);
  }
}
let menuLaps = 2;
function openRaceMenu() {
  const g = G(), rows = [];
  rows.push({ name: 'Runden', stat: 'Wie viele Runden soll das Rennen gehen?', btns: [1, 2, 3, 5].map(n => ({ label: n + (n === menuLaps ? ' ✓' : ''), buy: n === menuLaps, fn: () => { menuLaps = n; openRaceMenu(); } })) });
  rows.push({ name: 'Solo-Rennen', stat: 'Gegen 3 KI-Fahrer · Siegprämie ' + g.fmt(PRIZE_TOP[1]), btns: [{ label: 'Starten', buy: true, fn: () => { g.closeModals(); if (R) endRace(); startSolo(menuLaps); } }] });
  if (ONL()) {
    const peers = [...IEonline.peers.values()].filter(r => r.pr && typeof r.pr.x === 'number');
    if (R && R.host && R.state === 'lobby') {
      rows.push({ name: 'Mitspieler-Rennen', stat: (R.joined && R.joined.length ? 'Dabei: ' + R.joined.join(', ') : 'Noch niemand hat angenommen') + ' · Siegprämie: 2 Fahrer ' + g.fmt(PRIZE_TOP[2]) + ' · 3 Fahrer ' + g.fmt(PRIZE_TOP[3]) + ' · 4+ Fahrer ' + g.fmt(PRIZE_TOP[4]),
        btns: [{ label: 'Rennen starten', buy: true, off: !(R.joined && R.joined.length), fn: () => { g.closeModals(); R.n = 1 + R.joined.length; raceEmit({ t: 'go', laps: R.laps, n: R.n }); startCountdown(R.laps); } },
               { label: 'Absagen', fn: () => { raceEmit({ t: 'cancel' }); endRace('Rennen abgesagt'); openRaceMenu(); } }] });
    }
    rows.push({ name: 'Alle in der Lobby einladen', stat: peers.length ? peers.length + ' Spieler online' : 'Gerade ist niemand sonst in deiner Lobby', btns: [{ label: 'Einladen', off: !peers.length, fn: () => invite('*') }] });
    for (const r of peers) rows.push({ name: r.name, stat: r.pr.rc ? 'fährt gerade ein Rennen' : 'in deiner Lobby', btns: [{ label: 'Einladen', fn: () => invite(r.peer) }] });
  }
  xModal('race', 'Autodromo dell\'Adriatico', rows, ONL() ? 'Eingeladene Spieler werden in einem Rennwagen an den Start gesetzt. Du startest das Rennen, sobald jemand angenommen hat.' : 'Im Online-Modus kannst du hier auch andere Spieler zu einem Rennen einladen.');
}
function invite(to) {
  const g = G();
  if (!R || !R.host || R.state !== 'lobby') { if (R) endRace(); R = { id: 'r' + Date.now().toString(36) + ((rnd() * 1e4) | 0), host: true, state: 'lobby', laps: menuLaps, slot: gridSlot(0), joined: [], n: 1 }; ensureRaceCar(R.slot); }
  raceEmit({ t: 'inv', to, laps: R.laps, host: myName() });
  g.toast(to === '*' ? 'Alle eingeladen' : 'Einladung verschickt', 2); openRaceMenu();
}

// ----- Tankstellen-Überfall -----
function nearGas(pos) { for (const s of gas) if (Math.hypot(pos.x - s.door.x, pos.z - s.door.z) < 6) return s; return null; }
function updateRob(dt) {
  if (!rob) return;
  const g = G(), P = g.P, s = rob.s;
  if (g.game.dead || P.veh || Math.hypot(P.pos.x - s.door.x, P.pos.z - s.door.z) > 12) { rob = null; g.toast('Überfall abgebrochen', 2); if (!g.mission.active) $('obj').hidden = true; return; }
  rob.t += dt; const pc = Math.min(1, rob.t / 8);
  if (!g.mission.active) { $('obj').hidden = false; $('obj').innerHTML = `<small>Überfall · ${s.name}</small>Kasse wird geleert … ${Math.round(pc * 100)} %`; }
  if (pc >= 1) {
    const cash = 2500 + Math.round(rnd() * 6000);
    g.addMoney(cash); g.setWanted(Math.max(g.game.wanted, 3)); s.cool = g.game.time + 240;
    g.banner('Überfall erfolgreich', s.name, '+ ' + g.fmt(cash) + ' · Die Polizei kommt!', 3.5); g.sfx('cash');
    rob = null; if (!g.mission.active) $('obj').hidden = true;
  }
}

// ----- Villen -----
function nearVilla(pos) { for (const v of IE.villas) if (v.gate && (Math.hypot(pos.x - v.gate.x, pos.z - v.gate.z) < 6 || Math.hypot(pos.x - v.door.x, pos.z - v.door.z) < 5)) return v; return null; }
const MAX_VILLAS = 2; // man kann höchstens 2 Villen besitzen
function buyVilla(v) {
  const g = G(), S = g.S;
  const full = (S.villas || []).length >= MAX_VILLAS;
  xModal('villa', v.name, [
    { name: v.name, stat: (v.mega ? 'Riesige Luxusvilla mit Türmen, Pool, Springbrunnen, Helipad & Tennisplatz' : 'Panorama-Villa über dem Golf von Neapel · Pool & Terrasse') + ' · gehört dir für immer', btns: [{ label: full ? 'Du hast schon 2 Villen' : 'Kaufen · ' + g.fmt(v.price), buy: !full, off: full || S.money < v.price, fn: () => {
      if (full) { g.toast('Du kannst höchstens 2 Villen besitzen – verkauf erst eine', 3); return; }
      if (S.money < v.price) return;
      const done = () => { S.money -= v.price; S.villas = (S.villas || []).concat(v.id); g.sfx('cash'); g.saveGame(); refreshHouses(); g.closeModals(); g.banner('Villa gekauft', v.name, 'Lauf einfach durch die Haustür hinein · Haus-Menü: E am Tor', 5); };
      const a = SRVA();
      if (isOnline() && a && a.house) a.house('buy', v.id).then(r => { IE.houseOwners[v.id] = { slug: mySlug(), nick: IEaccount.nick, paint: 'standard' }; done(); }).catch(e => { if (e.code === 'taken') { g.toast('Zu spät – ' + v.name + ' gehört schon ' + (e.nick || 'einem anderen Spieler'), 4); syncHouses(); } else g.toast('Server-Fehler beim Kauf – versuch es nochmal', 3); });
      else done(); } }] },
  ], full ? 'Du besitzt bereits 2 Villen. Verkauf erst eine im Haus-Menü, dann kannst du eine andere kaufen.' : S.money < v.price ? 'Dir fehlen noch ' + g.fmt(v.price - S.money) + '.' : 'Nach dem Kauf: einfach durch die Haustür hineinlaufen. Am Tor (E) gibt es das Haus-Menü mit Lackierung und Möbeln. Höchstens 2 Villen pro Spieler.');
}
const SELL_RATE = 0.7; // Verkauf: 70 % vom Kaufpreis
function villaMenu(v) {
  const g = G(), S = g.S, P = g.P, sell = Math.round(v.price * SELL_RATE);
  xModal('villa', v.name, [
    { name: 'Villa betreten', stat: 'Oder einfach durch die Haustür laufen', btns: [{ label: 'Betreten', buy: true, fn: () => { g.closeModals(); enterVilla(v); } }] },
    { name: '🎨 Lackierung', stat: 'Aktuell: ' + (PAINTS_H[paintFor(v)] || PAINTS_H.standard).name, btns: [{ label: 'Ändern', fn: () => paintMenu(v) }] },
    { name: '🛋 Möbel', stat: ((S.furn && S.furn[v.id]) || []).length + ' von ' + (FURN.length - 1) + ' gekauft', btns: [{ label: 'Einrichten', fn: () => furnitureMenu(v) }] },
    { name: 'Villa verkaufen', stat: 'Du bekommst ' + g.fmt(sell) + ' (70 % vom Kaufpreis ' + g.fmt(v.price) + ')', btns: [{ label: 'Verkaufen · ' + g.fmt(sell), fn: () => {
      xModal('villa', v.name + ' verkaufen?', [{ name: 'Wirklich verkaufen?', stat: 'Die Villa gehört dir danach nicht mehr. Du bekommst ' + g.fmt(sell) + '.', btns: [
        { label: 'Ja, verkaufen', buy: true, fn: () => { if (!(S.villas || []).includes(v.id)) return; S.villas = S.villas.filter(id => id !== v.id); S.money += sell; g.sfx('cash'); g.saveGame(); const a = SRVA(); if (isOnline() && a && a.house) a.house('sell', v.id).catch(() => { }); delete IE.houseOwners[v.id]; refreshHouses(); g.closeModals(); g.banner('Villa verkauft', v.name, '+ ' + g.fmt(sell), 4); } },
        { label: 'Abbrechen', fn: () => villaMenu(v) }] }]);
    } }] }
  ], 'Haus-Menü');
}
IE.villaHome = function (pos) {
  const S = G().S, own = IE.villas.filter(v => (S.villas || []).includes(v.id) && v.gate && !ownedByOther(v)); if (!own.length) return null;
  own.sort((a, b) => Math.hypot(a.x - pos.x, a.z - pos.z) - Math.hypot(b.x - pos.x, b.z - pos.z)); return own[0];
};



// ================= AUTO-TUNING (Custom-Autos) =================
const PAINTS = [0xd33a2c, 0xf27a1a, 0xf2c230, 0x6fbf2a, 0x2e8b57, 0x18c2d8, 0x1f4fb0, 0x5a1a7a, 0xd0569a, 0xf4f4f0, 0x7c8a8e, 0x111114];
const FINISH = { glanz: { name: 'Glanz', price: 0, m: 0.55, r: 0.35 }, matt: { name: 'Matt', price: 10000, m: 0.1, r: 0.9 }, chrom: { name: 'Chrom', price: 50000, m: 1, r: 0.05 }, gold: { name: 'Gold', price: 250000, m: 1, r: 0.15, color: 0xd6b04a } };
const NEONS = [0x5ff3ff, 0xff4fd8, 0x48e07a, 0xf2c230, 0xff3b30, 0x7a5cff];
const tuneOf = id => { const S = G().S; S.tune = S.tune || {}; return S.tune[id] || (S.tune[id] = { engine: 0, turbo: 0, armor: 0 }); };
IE.applyTune = function (v) {
  if (!v || v.type !== 'car' || !v.m || v.m.tank) return;
  const S = G().S, t = S.tune && S.tune[v.def.id]; if (!t) return;
  const base = IE.carById[v.def.id]; if (!base) return;
  const f = FINISH[t.finish || 'glanz'];
  if (v.m.bodyMat) { v.m.bodyMat.color.setHex(f.color || (t.paint !== undefined ? t.paint : base.color)); v.m.bodyMat.metalness = f.m; v.m.bodyMat.roughness = f.r; v.m.bodyMat.needsUpdate = true; }
  if (t.rims !== undefined && v.m.wheels) { const rm = new T.MeshStandardMaterial({ color: t.rims, metalness: 0.8, roughness: 0.25 }); v.m.wheels.forEach(w => { if (w.children[1]) w.children[1].material = rm; }); }
  if (v.m.spoiler) { v.m.inner.remove(v.m.spoiler); v.m.spoiler = null; }
  if (t.spoiler && v.m.inner) {
    const sp = new T.Group(), y = (v.m.topY || 1.2) * 0.75 + 0.35, x = -v.m.L / 2 + 0.35;
    const wing = new T.Mesh(new T.BoxGeometry(0.5, 0.07, v.m.W * 0.92), v.m.bodyMat); wing.position.set(x, y, 0); sp.add(wing);
    for (const sz of [-1, 1]) { const st = new T.Mesh(new T.BoxGeometry(0.08, 0.35, 0.06), new T.MeshLambertMaterial({ color: 0x1a1a1a })); st.position.set(x, y - 0.18, sz * v.m.W * 0.3); sp.add(st); }
    v.m.inner.add(sp); v.m.spoiler = sp;
  }
  if (v.m.neon) { v.group.remove(v.m.neon); v.m.neon = null; }
  if (t.neon !== undefined && t.neon !== null) {
    const n = new T.Mesh(new T.PlaneGeometry(v.m.W + 0.6, v.m.L + 0.4), new T.MeshBasicMaterial({ color: t.neon, transparent: true, opacity: 0.55, depthWrite: false })); n.rotation.x = -Math.PI / 2; n.position.y = 0.06; v.group.add(n); v.m.neon = n;
  }
  v.def = Object.assign({}, base, { speed: base.speed * (1 + 0.07 * (t.engine || 0)), accel: base.accel * (1 + 0.15 * (t.turbo || 0)) });
  const mh = 1000 * (1 + 0.4 * (t.armor || 0)); if (v.maxHealth !== mh) { v.health = v.health / (v.maxHealth || 1000) * mh; v.maxHealth = mh; }
};
const _spawnCar = IE.spawnCar;
IE.spawnCar = function (scene, id, x, z, yaw, opts) { const v = _spawnCar(scene, id, x, z, yaw, opts); if (opts && opts.owned) try { IE.applyTune(v); } catch (e) { } return v; };
function retune(id) { for (const v of IE.vehicles) if (v.type === 'car' && v.def.id === id && (v.owned || v === G().P.veh)) IE.applyTune(v); }
function openTuning(id) {
  const g = G(), S = g.S, c = IE.carById[id], t = tuneOf(id), rows = [];
  const pay = (price, fn) => { if (S.money < price) { g.toast('Nicht genug Geld', 2); return; } S.money -= price; fn(); g.sfx('cash'); retune(id); g.saveGame(); openTuning(id); };
  rows.push({ name: '🎨 Lackfarbe', stat: '€ 2.000 pro Lackierung', btns: PAINTS.map(col => ({ label: '■', fn: () => pay(2000, () => { t.paint = col; if (t.finish === 'gold') t.finish = 'glanz'; }) })) });
  rows.push({ name: '✨ Lackart', stat: 'Aktuell: ' + FINISH[t.finish || 'glanz'].name, btns: Object.entries(FINISH).map(([k, f]) => ({ label: f.name + (f.price ? ' · ' + g.fmt(f.price) : ''), buy: (t.finish || 'glanz') === k, fn: () => pay(f.price, () => { t.finish = k; }) })) });
  rows.push({ name: '⚙ Felgen', stat: '€ 5.000', btns: [0xd8d8d8, 0x111114, 0xd6b04a, 0xd33a2c, 0x1f4fb0, 0x5ff3ff].map(col => ({ label: '●', fn: () => pay(5000, () => { t.rims = col; }) })) });
  rows.push({ name: '🛫 Heckspoiler', stat: t.spoiler ? 'Eingebaut' : '€ 15.000', btns: [{ label: t.spoiler ? 'Ausbauen' : 'Einbauen · € 15.000', buy: !t.spoiler, fn: () => t.spoiler ? (t.spoiler = false, retune(id), g.saveGame(), openTuning(id)) : pay(15000, () => { t.spoiler = true; }) }] });
  rows.push({ name: '💡 Neon-Unterbodenbeleuchtung', stat: '€ 25.000', btns: NEONS.map(col => ({ label: '◆', fn: () => pay(25000, () => { t.neon = col; }) })).concat(t.neon !== undefined && t.neon !== null ? [{ label: 'Aus', fn: () => { t.neon = null; retune(id); g.saveGame(); openTuning(id); } }] : []) });
  const lvl = (key, name, max, unit, info) => { const l = t[key] || 0, price = unit * (l + 1); rows.push({ name, stat: `Stufe ${l} / ${max} · ${info(l)}`, btns: l >= max ? [{ label: 'Maximum', off: true, fn: () => { } }] : [{ label: `Stufe ${l + 1} · ${g.fmt(price)}`, buy: true, fn: () => pay(price, () => { t[key] = l + 1; }) }] }); };
  lvl('engine', '🔧 Motor-Tuning', 5, 25000 + c.price * 0.05, l => 'Höchstgeschwindigkeit ' + Math.round(c.speed * (1 + 0.07 * l) * 3.6) + ' km/h');
  lvl('turbo', '💨 Turbo', 3, 40000 + c.price * 0.05, l => 'Beschleunigung +' + (15 * l) + ' %');
  lvl('armor', '🛡 Panzerung', 5, 30000, l => 'Haltbarkeit +' + (40 * l) + ' %');
  xModal('tuning', 'Tuning · ' + c.name, rows, 'Das Tuning gilt für dein ' + c.name + ' – auch wenn du es später neu herholst. Änderungen siehst du sofort, wenn du gerade in diesem Auto sitzt.');
  // Farbknöpfe einfärben
  const btns = document.querySelectorAll('#xRows .row'); const colorize = (rowI, cols) => { const bs = btns[rowI] && btns[rowI].querySelectorAll('button'); if (bs) cols.forEach((col, i) => { if (bs[i]) { bs[i].style.color = '#' + col.toString(16).padStart(6, '0'); bs[i].style.fontSize = '22px'; bs[i].style.padding = '2px 10px'; } }); };
  colorize(0, PAINTS); colorize(2, [0xd8d8d8, 0x111114, 0xd6b04a, 0xd33a2c, 0x1f4fb0, 0x5ff3ff]); colorize(4, NEONS);
}
IE.openTuning = openTuning;

// ================= BOMBEN (Militär-Jet & Kampfhubschrauber) =================
const bombs = []; let bombCool = 0;
IE.dropBomb = function () {
  const g = G(), P = g.P, v = P.veh;
  if (!v || !(v.type === 'plane' || v.type === 'heli') || !v.def.armed || v.dead) return;
  if (v.type === 'plane' ? v.onGround : v.pos.y - IE.supportH(v.pos.x, v.pos.z, v.pos.y) < 4) { g.toast('Erst abheben', 1.5); return; }
  if (bombCool > 0) return; bombCool = 0.7;
  const f = fwd(v.yaw), cp = Math.cos(v.pitch || 0), sp = v.type === 'plane' ? v.speed : 0;
  const vel = v.type === 'plane' ? new T.Vector3(f.x * sp * cp, Math.sin(v.pitch || 0) * sp, f.z * sp * cp) : (v.vel ? v.vel.clone() : new T.Vector3());
  const m = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 1.6, 10), new T.MeshLambertMaterial({ color: 0x3a3f2a })); body.rotation.x = Math.PI / 2; m.add(body);
  const nose = new T.Mesh(new T.SphereGeometry(0.35, 10, 6), body.material); nose.position.z = 0.8; m.add(nose);
  const fin = new T.Mesh(new T.BoxGeometry(0.9, 0.05, 0.4), new T.MeshLambertMaterial({ color: 0x222222 })); fin.position.z = -0.8; m.add(fin); const fin2 = fin.clone(); fin2.rotation.z = Math.PI / 2; m.add(fin2);
  m.position.set(v.pos.x, v.pos.y - 1.5, v.pos.z); m.rotation.y = v.yaw; g.scene.add(m);
  bombs.push({ m, vel, t: 0 }); g.sfx('beep', 0.4);
};
function updateBombs(dt) {
  bombCool = Math.max(0, bombCool - dt);
  const g = G();
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i]; b.t += dt; b.vel.y -= 22 * dt; b.vel.multiplyScalar(1 - 0.08 * dt);
    b.m.position.addScaledVector(b.vel, dt);
    b.m.rotation.x = Math.max(-1.4, Math.min(1.4, -Math.atan2(b.vel.y, Math.hypot(b.vel.x, b.vel.z))));
    const p = b.m.position, gh = Math.max(IE.supportH(p.x, p.z, p.y + 0.5), IE.groundH(p.x, p.z) < -0.5 && p.x < 9000 ? 0 : -999);
    if (p.y <= gh + 0.3 || b.t > 25) {
      g.scene.remove(b.m); bombs.splice(i, 1);
      const at = new T.Vector3(p.x, Math.max(p.y, gh) + 0.5, p.z);
      g.explosion(at, 12); setTimeout(() => g.explosion(at.clone().add(new T.Vector3(4, 0, 3)), 7), 120);
      if (window.IEonline && IEonline.active) IEonline.blast(at, 16, 320);
    }
  }
}

// ================= RAKETEN (Kampfjet schießt nach vorne) =================
const missiles = []; let missileCool = 0;
const MISSILE_SPEED = 300; // schneller als der Jet (max ~190), aber nicht zu schnell
IE.fireMissile = function () {
  const g = G(), P = g.P, v = P.veh;
  if (!v || v.type !== 'plane' || !v.def.armed || v.dead) return;
  if (v.onGround && v.speed < 10) { g.toast('Erst abheben', 1.5); return; }
  if (missileCool > 0) { g.toast('Rakete lädt …', 0.8); return; }
  missileCool = 1.1;
  const f = fwd(v.yaw), cp = Math.cos(v.pitch || 0), sp = Math.sin(v.pitch || 0);
  const dir = new T.Vector3(f.x * cp, sp, f.z * cp).normalize();
  for (const side of [-1, 1]) {
    const m = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 2.2, 10), new T.MeshLambertMaterial({ color: 0xe8e8e2 })); body.rotation.x = Math.PI / 2; m.add(body);
    const nose = new T.Mesh(new T.ConeGeometry(0.22, 0.7, 10), new T.MeshLambertMaterial({ color: 0xc8372d })); nose.rotation.x = Math.PI / 2; nose.position.z = 1.4; m.add(nose);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const fin = new T.Mesh(new T.BoxGeometry(0.06, 0.5, 0.5), new T.MeshLambertMaterial({ color: 0x555555 })); fin.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, -1); fin.rotation.z = a; m.add(fin); }
    const off = { x: f.z * side * (v.m.L * 0.1), z: -f.x * side * (v.m.L * 0.1) };
    m.position.set(v.pos.x + off.x, v.pos.y, v.pos.z + off.z);
    m.rotation.order = 'YXZ'; m.rotation.set(v.pitch || 0, v.yaw, 0); g.scene.add(m);
    missiles.push({ m, dir: dir.clone(), vel: v.speed, t: 0, start: m.position.clone() });
  }
  g.sfx('shot', 0.8); g.toast('🚀 Rakete abgefeuert!', 0.9);
};
function updateMissiles(dt) {
  missileCool = Math.max(0, missileCool - dt);
  const g = G();
  for (let i = missiles.length - 1; i >= 0; i--) {
    const b = missiles[i]; b.t += dt; b.vel = Math.min(MISSILE_SPEED, b.vel + 260 * dt); // beschleunigt schnell auf Endgeschwindigkeit
    const p = b.m.position; p.addScaledVector(b.dir, b.vel * dt);
    // Rauchfahne
    if ((b.sm = (b.sm || 0) + dt) > 0.03) { b.sm = 0; const sm = new T.Mesh(new T.SphereGeometry(0.4 + Math.random() * 0.3, 6, 4), new T.MeshBasicMaterial({ color: Math.random() < 0.3 ? 0xffa040 : 0xdedede, transparent: true, opacity: 0.6, depthWrite: false })); sm.position.copy(p).addScaledVector(b.dir, -1.2); g.scene.add(sm); let a = 0; const iv = setInterval(() => { a += 0.08; sm.scale.setScalar(1 + a * 3); sm.material.opacity = 0.6 * (1 - a); if (a >= 1) { clearInterval(iv); g.scene.remove(sm); sm.geometry.dispose(); sm.material.dispose(); } }, 40); }
    // Treffer prüfen: Boden/Wasser, Fahrzeuge, entfernte Reichweite
    let hit = p.y <= Math.max(IE.supportH(p.x, p.z, p.y + 1), IE.groundH(p.x, p.z) < -0.5 && p.x < 9000 ? 0 : -999) + 0.5;
    if (!hit) for (const vv of IE.vehicles) { if (vv === g.P.veh || vv.dead) continue; if (p.distanceTo(vv.pos.clone().setY(vv.pos.y + 1)) < (vv.type === 'heli' ? 5 : 4.2)) { hit = true; break; } }
    const far = b.start.distanceTo(p) > 1300 || b.t > 6;
    if (hit || far) {
      g.scene.remove(b.m); missiles.splice(i, 1);
      if (hit || b.t <= 6) { g.explosion(p.clone(), 9); if (window.IEonline && IEonline.active) IEonline.blast(p, 12, 260); }
    }
  }
}

// ================= TUNNEL durch die Villen-Bergkette =================
function buildTunnel(scene) {
  const T2 = IE.tunnel; if (!T2) return;
  const y = T2.y, L = T2.len, cov = T2.cover;
  const g = new T.Group(); g.position.set(T2.cx, y, T2.cz); g.rotation.y = T2.ang; scene.add(g);
  const conc = new T.MeshLambertMaterial({ color: 0x9397a0 });
  const dark = new T.MeshLambertMaterial({ color: 0x1a1d21 });
  const rock = new T.MeshLambertMaterial({ color: 0x6f9b52 });
  const mk = (w, h, d, mat, px, py, pz) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(px, py, pz); g.add(m); return m; };
  // Straße durch den Tunnel (lokal entlang z) inkl. Zufahrtsrampen, Mittelstreifen
  const rd = new T.Mesh(new T.PlaneGeometry(8, L), new T.MeshLambertMaterial({ color: 0x45474b })); rd.rotation.x = -Math.PI / 2; rd.position.y = 0.2; g.add(rd);
  const cl = new T.Mesh(new T.PlaneGeometry(0.3, L), new T.MeshLambertMaterial({ color: 0xd8c23a })); cl.rotation.x = -Math.PI / 2; cl.position.y = 0.22; g.add(cl);
  // Tunnelröhre (überdachter Mittelteil): Wände + Decke
  for (const sx of [-1, 1]) mk(0.8, 11, cov, conc, sx * 4.8, 5.5, 0);
  mk(10.4, 0.8, cov, conc, 0, 11, 0);
  mk(9, 0.4, cov, dark, 0, 10.5, 0);          // dunkle Innendecke
  // BERG-DECKEL: Fels/Grün über der Röhre bis aufs Bergniveau -> der Berg bleibt oben drüber ganz
  mk(13, 24, cov, rock, 0, 11 + 12, 0);       // von y+11 bis y+35 (= Bergoberfläche ~79)
  // Lampen innen
  for (let z = -cov / 2 + 9; z < cov / 2; z += 18) mk(1.6, 0.3, 0.7, new T.MeshBasicMaterial({ color: 0xffe79a }), 0, 10.2, z);
  // Portale (Pfeiler + Sturz) an beiden Enden, Mitte offen zum Durchfahren
  for (const pz of [-cov / 2, cov / 2]) {
    for (const sx of [-1, 1]) mk(2.4, 12, 1.4, conc, sx * 5.4, 6, pz);
    mk(13.5, 2.6, 1.4, conc, 0, 11.3, pz);
    const mouth = new T.Mesh(new T.PlaneGeometry(8.6, 9.6), new T.MeshLambertMaterial({ color: 0x101216 })); mouth.position.set(0, 4.8, pz + (pz < 0 ? 0.8 : -0.8)); mouth.rotation.y = pz < 0 ? 0 : Math.PI; g.add(mouth);
  }
  // Schild über dem Portal
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1a1d22'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#e8e8e2'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center'; ctx.fillText('GALLERIA', 128, 42);
  const sign = new T.Mesh(new T.PlaneGeometry(8, 2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true })); sign.position.set(0, 13.2, -cov / 2 - 0.3); g.add(sign);
  // Begehbares Deckel-Dach (Collider, achsenparallel genähert) auf Bergniveau
  IE.addBox(T2.cx - 13, T2.cz - 13, T2.cx + 13, T2.cz + 13, y + 35);
}

// ================= GEFÄNGNIS =================
IE.jail = null;
IE.buildJail = function () {
  if (IE.jail) return IE.jail;
  const g = G(), scene = g.scene;
  // Gefängnis liegt NEBEN der Militärbasis (nördlich davor, außerhalb der Sperrzone –
  // damit man beim Rauskommen nicht sofort von Soldaten beschossen wird)
  const base = IE.base;
  const x = base ? base.x : 0, z = base ? base.z - base.hd - 95 : 300;
  let y = IE.terrainH(x, z); if (y < 1) y = 1;
  const hw = 9, hd = 7;
  const grp = new T.Group(); scene.add(grp);
  const conc = new T.MeshLambertMaterial({ color: 0x8a8f96 });
  const bar = new T.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.6, roughness: 0.5 });
  const floor = new T.Mesh(new T.BoxGeometry(hw * 2 + 2, 0.6, hd * 2 + 2), new T.MeshLambertMaterial({ color: 0x6f747a })); floor.position.set(x, y + 0.3, z); grp.add(floor);
  IE.addBox(x - hw - 1, z - hd - 1, x + hw + 1, z + hd + 1, y + 0.6);
  const roof = new T.Mesh(new T.BoxGeometry(hw * 2 + 2, 0.5, hd * 2 + 2), conc); roof.position.set(x, y + 6, z); grp.add(roof);
  const wall = (px, pz, w, d) => { const m = new T.Mesh(new T.BoxGeometry(w, 5.4, d), conc); m.position.set(px, y + 3, pz); grp.add(m); IE.addBox(px - w / 2, pz - d / 2, px + w / 2, pz + d / 2, y + 5.4); };
  wall(x, z - hd, hw * 2 + 2, 0.6); wall(x - hw, z, 0.6, hd * 2); wall(x + hw, z, 0.6, hd * 2);
  for (let i = -hw + 0.4; i <= hw; i += 1.3) { const b = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 5.2, 6), bar); b.position.set(x + i, y + 2.8, z + hd); grp.add(b); }
  const topBar = new T.Mesh(new T.BoxGeometry(hw * 2, 0.26, 0.26), bar); topBar.position.set(x, y + 5.2, z + hd); grp.add(topBar);
  const midBar = new T.Mesh(new T.BoxGeometry(hw * 2, 0.2, 0.2), bar); midBar.position.set(x, y + 2.6, z + hd); grp.add(midBar);
  // Pritsche
  const bed = new T.Mesh(new T.BoxGeometry(5, 0.8, 2.2), new T.MeshLambertMaterial({ color: 0x4a5560 })); bed.position.set(x - hw + 3.2, y + 1.0, z - hd + 2); grp.add(bed);
  // Schild
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const cx = cv.getContext('2d');
  cx.fillStyle = '#1a1d22'; cx.fillRect(0, 0, 256, 64); cx.fillStyle = '#d9b45a'; cx.font = 'bold 34px Arial'; cx.textAlign = 'center'; cx.fillText('GEFÄNGNIS', 128, 44);
  const sign = new T.Mesh(new T.PlaneGeometry(7, 1.8), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true })); sign.position.set(x, y + 6.8, z + hd + 0.1); grp.add(sign);
  IE.jail = { x, z, y: y + 0.6, hw, hd, grp };
  return IE.jail;
};

// ================= TORPEDOS (U-Boot) =================
const torpedoes = []; let torpedoCool = 0;
IE.fireTorpedo = function (v) {
  const g = G(); v = v || (g.P && g.P.veh);
  if (!v || v.dead || !v.def || !v.def.torpedo) return;
  if (torpedoCool > 0) { g.toast('Torpedo lädt …', 0.7); return; }
  torpedoCool = 1.2;
  const f = fwd(v.yaw), dir = new T.Vector3(f.x, 0, f.z).normalize();
  for (const side of [-0.6, 0.6]) {
    const m = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 2.4, 10), new T.MeshLambertMaterial({ color: 0xf0d24a })); body.rotation.x = Math.PI / 2; m.add(body);
    const nose = new T.Mesh(new T.ConeGeometry(0.26, 0.6, 10), new T.MeshLambertMaterial({ color: 0xc8372d })); nose.rotation.x = Math.PI / 2; nose.position.z = 1.5; m.add(nose);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const fin = new T.Mesh(new T.BoxGeometry(0.06, 0.45, 0.45), new T.MeshLambertMaterial({ color: 0x444444 })); fin.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, -1.1); fin.rotation.z = a; m.add(fin); }
    const off = { x: f.z * side, z: -f.x * side };
    m.position.set(v.pos.x + f.x * (v.m.L * 0.5 + 1) + off.x, v.pos.y - 0.3, v.pos.z + f.z * (v.m.L * 0.5 + 1) + off.z);
    m.rotation.order = 'YXZ'; m.rotation.set(0, v.yaw, 0); g.scene.add(m);
    torpedoes.push({ m, dir: dir.clone(), vel: Math.max(30, Math.abs(v.speed) + 20), t: 0, start: m.position.clone(), owner: v });
  }
  g.sfx('shot', 0.7); g.toast('🫧 Torpedo los!', 0.9);
};
function updateTorpedoes(dt) {
  torpedoCool = Math.max(0, torpedoCool - dt);
  const g = G();
  for (let i = torpedoes.length - 1; i >= 0; i--) {
    const b = torpedoes[i]; b.t += dt; b.vel = Math.min(80, b.vel + 60 * dt);
    const p = b.m.position; p.addScaledVector(b.dir, b.vel * dt);
    // Blasenspur
    if ((b.sm = (b.sm || 0) + dt) > 0.05) { b.sm = 0; const sm = new T.Mesh(new T.SphereGeometry(0.3 + Math.random() * 0.25, 6, 4), new T.MeshBasicMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.5, depthWrite: false })); sm.position.copy(p).addScaledVector(b.dir, -1.3); g.scene.add(sm); let a = 0; const iv = setInterval(() => { a += 0.1; sm.scale.setScalar(1 + a * 2.5); sm.material.opacity = 0.5 * (1 - a); if (a >= 1) { clearInterval(iv); g.scene.remove(sm); sm.geometry.dispose(); sm.material.dispose(); } }, 40); }
    const floor = IE.terrainH(p.x, p.z);
    let hit = p.y <= floor + 0.3 || p.y > 1.5;
    if (!hit) for (const vv of IE.vehicles) { if (vv === b.owner || vv.dead) continue; if (p.distanceTo(vv.pos) < (vv.type === 'boat' ? vv.m.L * 0.5 + 2 : 4)) { hit = true; if (vv.health != null) vv.health -= 900; break; } }
    if (!hit) for (const n of IE.npcs) { if (n.dead) continue; if (p.distanceTo(n.pos) < 3) { hit = true; if (g.damageNPC) g.damageNPC(n, 200); break; } }
    const far = b.start.distanceTo(p) > 900 || b.t > 10;
    if (hit || far) {
      g.scene.remove(b.m); torpedoes.splice(i, 1);
      if (hit) { const at = p.clone(); at.y = Math.max(at.y, floor + 0.4); g.explosion(at, 10); if (window.IEonline && IEonline.active) IEonline.blast(at, 14, 300); }
    }
  }
}

// ================= RAUSSPRINGEN (lange EIN/AUS) + FALLSCHIRM =================
IE.vehFast = v => {
  if (!v || v.type === 'airship') return false;
  const air = v.pos.y - IE.supportH(v.pos.x, v.pos.z, v.pos.y) > 3;
  if (v.type === 'plane') return !v.onGround || Math.abs(v.speed) > 6;
  if (v.type === 'heli') return air || (v.vel && Math.hypot(v.vel.x, v.vel.z) > 6);
  return Math.abs(v.speed || 0) > 6;
};
function bailOut() {
  const g = G(), P = g.P, v = P.veh; if (!v) return;
  const f = fwd(v.yaw), sp = v.type === 'heli' ? (v.vel ? Math.hypot(v.vel.x, v.vel.z) : 0) : Math.abs(v.speed || 0) * Math.cos(v.pitch || 0) * Math.sign(v.speed || 1);
  const vx = v.type === 'heli' && v.vel ? v.vel.x : f.x * sp, vz = v.type === 'heli' && v.vel ? v.vel.z : f.z * sp;
  v.driver = null; P.veh = null; P.h.group.visible = true; document.getElementById('speed').hidden = true;
  const side = v.type === 'plane' ? 4 : v.type === 'heli' ? 3 : (v.m.W || 2) / 2 + 1.2;
  P.pos.set(v.pos.x + f.z * side, v.pos.y + (v.type === 'plane' ? (v.m.gearH || 1) + 1.5 : 1.2), v.pos.z - f.x * side);
  P.bailV = { x: vx * 0.85, z: vz * 0.85 }; P.vy = v.type === 'plane' ? Math.sin(v.pitch || 0) * sp * 0.5 + 2 : 3; P.onGround = false; P.chute = false; P.swim = false;
  const high = P.pos.y - IE.supportH(P.pos.x, P.pos.z, P.pos.y) > 10;
  g.toast(high ? '🪂 Rausgesprungen! Fallschirm öffnen: ' + (g.isTouch ? 'SCHIRM / SPRUNG' : 'Leertaste') : 'Rausgesprungen!', 3); g.sfx('hit', 0.5);
}
// ----- Gleiter (kaufbar; funktioniert als Fallschirm, schneller beim Nach-unten-Schauen) -----
const GLIDERS = {
  // ---- Standard ----
  schirm:    { name: 'Gleitschirm',        price: 120000,  speed: 15, dive: 26, color: 0x3a9bff, type: 'para', cat: 'Standard' },
  delta:     { name: 'Deltaflieger',       price: 280000,  speed: 22, dive: 44, color: 0xf2c230, color2: 0xe08020, type: 'delta', cat: 'Standard' },
  wingsuit:  { name: 'Wingsuit',           price: 600000,  speed: 16, dive: 64, color: 0xc8101a, type: 'wingsuit', cat: 'Standard' },
  hoverboard:{ name: 'Hoverboard',         price: 500000,  speed: 18, dive: 40, color: 0x2a2f3a, color2: 0x18e0e0, type: 'board', cat: 'Standard' },
  // ---- Zum Draufstehen ----
  surfbrett: { name: 'Flug-Surfbrett',     price: 450000,  speed: 17, dive: 38, color: 0x18c2d8, color2: 0xffffff, type: 'surf', cat: 'Zum Draufstehen' },
  teppich:   { name: 'Fliegender Teppich', price: 800000,  speed: 18, dive: 40, color: 0x7a2a8a, color2: 0xd6b04a, type: 'carpet', cat: 'Zum Draufstehen' },
  scheibe:   { name: 'Schwebe-Scheibe',    price: 900000,  speed: 20, dive: 44, color: 0x2a2f3a, color2: 0x18e0e0, type: 'disc', cat: 'Zum Draufstehen' },
  wolke:     { name: 'Wolken-Gleiter',     price: 700000,  speed: 16, dive: 34, color: 0xffffff, type: 'cloud', cat: 'Zum Draufstehen' },
  besen:     { name: 'Hexenbesen',         price: 600000,  speed: 18, dive: 40, color: 0xd8a040, color2: 0x8a2aa8, type: 'broom', cat: 'Zum Draufstehen' },
  neonboard: { name: 'Neon-Board',         price: 800000,  speed: 20, dive: 44, color: 0x1a1a1f, color2: 0x48e07a, type: 'board', cat: 'Zum Draufstehen' },
  goldboard: { name: 'Gold-Board',         price: 2500000, speed: 22, dive: 48, color: 0xd6b04a, color2: 0xfff0a0, type: 'board', cat: 'Zum Draufstehen' },
  lavaboard: { name: 'Lava-Board',         price: 1800000, speed: 22, dive: 50, color: 0x2a1410, color2: 0xff5a20, type: 'board', cat: 'Zum Draufstehen' },
  jetpack:   { name: 'Jetpack-Gleiter',    price: 2500000, speed: 26, dive: 60, color: 0xcfd6dc, color2: 0x1b3d6e, type: 'jet', cat: 'Zum Draufstehen' },
  // ---- Farben ----
  gschwarz:  { name: 'Nachtschirm',        price: 150000,  speed: 15, dive: 28, color: 0x1a1a1f, type: 'para', cat: 'Farben' },
  ggold:     { name: 'Gold-Schirm',        price: 2000000, speed: 18, dive: 40, color: 0xd6b04a, color2: 0xfff0a0, type: 'para', cat: 'Farben' },
  gregenbogen:{ name: 'Regenbogen-Schirm', price: 1500000, speed: 18, dive: 38, color: 0xff5fd2, color2: 0x18e0e0, type: 'para', cat: 'Farben' },
  gsilber:   { name: 'Silber-Delta',       price: 900000,  speed: 22, dive: 46, color: 0xcfd6dc, color2: 0x8a9098, type: 'delta', cat: 'Farben' },
  gpink:     { name: 'Pink-Teppich',       price: 700000,  speed: 18, dive: 38, color: 0xff5fd2, color2: 0xffffff, type: 'carpet', cat: 'Farben' },
  gchrom:    { name: 'Chrom-Scheibe',      price: 1200000, speed: 20, dive: 44, color: 0xcfd6dc, color2: 0x18e0e0, type: 'disc', cat: 'Farben' },
  // ---- Jahreszeiten ----
  gsommer:   { name: 'Sommer-Surfer',      price: 400000,  speed: 17, dive: 36, color: 0x18c2d8, color2: 0xf2c230, type: 'surf', cat: 'Jahreszeiten' },
  gherbst:   { name: 'Herbst-Schirm',      price: 400000,  speed: 16, dive: 32, color: 0xc8641a, color2: 0xe8a030, type: 'para', cat: 'Jahreszeiten' },
  gwinter:   { name: 'Winter-Board',       price: 400000,  speed: 16, dive: 34, color: 0xcfe8ff, color2: 0xffffff, type: 'board', cat: 'Jahreszeiten' },
  gxmas:     { name: 'Weihnachts-Delta',   price: 500000,  speed: 18, dive: 36, color: 0xc8102e, color2: 0xd6b04a, type: 'delta', cat: 'Jahreszeiten' },
  gfruehling:{ name: 'Frühlings-Teppich',  price: 400000,  speed: 16, dive: 32, color: 0x48e07a, color2: 0xff9fd0, type: 'carpet', cat: 'Jahreszeiten' },
  // ---- Pack-Themen ----
  gscifi:    { name: 'Sci-Fi-Scheibe',     price: 1500000, speed: 24, dive: 56, color: 0x2a2f3a, color2: 0x18e0e0, type: 'disc', cat: 'Pack-Themen' },
  gmilitaer: { name: 'Militär-Delta',      price: 1200000, speed: 22, dive: 46, color: 0x59613d, color2: 0x3e4429, type: 'delta', cat: 'Pack-Themen' },
  gitalien:  { name: 'Italien-Schirm',     price: 600000,  speed: 20, dive: 40, color: 0x2e8b57, color2: 0xffffff, type: 'para', cat: 'Pack-Themen' },
  gsilvester:{ name: 'Silvester-Scheibe',  price: 900000,  speed: 20, dive: 44, color: 0x101018, color2: 0xf2c230, type: 'disc', cat: 'Pack-Themen' },
  ghalloween:{ name: 'Halloween-Besen',    price: 1000000, speed: 20, dive: 44, color: 0xe8761a, color2: 0x1a1a1f, type: 'broom', cat: 'Pack-Themen' },
  gformel1:  { name: 'Formel-1-Board',     price: 1800000, speed: 26, dive: 54, color: 0xc8101a, color2: 0xffffff, type: 'board', cat: 'Pack-Themen' },
  gluxus:    { name: 'Luxus-Teppich',      price: 3500000, speed: 24, dive: 50, color: 0xd6b04a, color2: 0x101010, type: 'carpet', cat: 'Pack-Themen' },
  gengel:    { name: 'Engel-Schirm',       price: 1200000, speed: 18, dive: 38, color: 0xfbf8ef, color2: 0xffe77a, type: 'para', cat: 'Pack-Themen' },
  gteufel:   { name: 'Teufel-Wingsuit',    price: 1200000, speed: 22, dive: 58, color: 0x7a0c14, type: 'wingsuit', cat: 'Pack-Themen' },
  gpinguin:  { name: 'Pinguin-Board',      price: 700000,  speed: 16, dive: 30, color: 0x1a1a1a, color2: 0xffffff, type: 'board', cat: 'Pack-Themen' },
  gscholl:   { name: 'Scholl-SMP-Board',   price: 1000000, speed: 20, dive: 42, color: 0x1aa0a0, color2: 0x8fd0d0, type: 'board', cat: 'Pack-Themen' },
  gavocado:  { name: 'Avocado-Surfer',     price: 700000,  speed: 18, dive: 34, color: 0x6a9a3a, color2: 0xd8c84a, type: 'surf', cat: 'Pack-Themen' },
  gstarwars: { name: 'Sternjäger-Delta',   price: 1500000, speed: 24, dive: 54, color: 0xcfd6dc, color2: 0xc8101a, type: 'delta', cat: 'Pack-Themen' },
  gsith:     { name: 'Sith-Wingsuit',      price: 1500000, speed: 24, dive: 60, color: 0x0b0b0d, type: 'wingsuit', cat: 'Pack-Themen' },
  gbond:     { name: 'Agenten-Board',      price: 1300000, speed: 22, dive: 50, color: 0xcfd6dc, color2: 0x101014, type: 'board', cat: 'Pack-Themen' },
  gjonathan: { name: 'Gauner-Board',       price: 600000,  speed: 20, dive: 40, color: 0x1a1a1f, color2: 0xc8101a, type: 'board', cat: 'Pack-Themen' },
  gatom:     { name: 'Atom-Scheibe',       price: 1600000, speed: 22, dive: 52, color: 0x1a2a10, color2: 0x6aff2a, type: 'disc', cat: 'Pack-Themen' },
  gfood:     { name: 'Burger-Teppich',     price: 500000,  speed: 16, dive: 30, color: 0xd9a441, color2: 0x5a3418, type: 'carpet', cat: 'Pack-Themen' },
  gdubai:    { name: 'Dubai-Teppich',      price: 2000000, speed: 22, dive: 46, color: 0xd6b04a, color2: 0xffffff, type: 'carpet', cat: 'Pack-Themen' },
  gmond:     { name: 'Mond-Scheibe',       price: 2000000, speed: 22, dive: 50, color: 0x9aa0a8, color2: 0xffffff, type: 'disc', cat: 'Pack-Themen' },
  // ---- Spezial ----
  gfeuer:    { name: 'Feuer-Wingsuit',     price: 2000000, speed: 24, dive: 62, color: 0xff6a20, type: 'wingsuit', cat: 'Spezial' },
  geis:      { name: 'Eis-Board',          price: 2000000, speed: 22, dive: 54, color: 0x9fd8f2, color2: 0xffffff, type: 'board', cat: 'Spezial' },
  ggalaxie:  { name: 'Galaxie-Scheibe',    price: 3000000, speed: 26, dive: 66, color: 0x1a0a2a, color2: 0x8a3cf0, type: 'disc', cat: 'Spezial' },
  gdrache:   { name: 'Drachen-Delta',      price: 2500000, speed: 24, dive: 58, color: 0x2e8b3a, color2: 0xc8101a, type: 'delta', cat: 'Spezial' },
  gphoenix:  { name: 'Phönix-Wingsuit',    price: 3000000, speed: 26, dive: 64, color: 0xf24a1a, type: 'wingsuit', cat: 'Spezial' },
  gblitz:    { name: 'Blitz-Board',        price: 2200000, speed: 28, dive: 70, color: 0x1a1a1f, color2: 0xf2f230, type: 'board', cat: 'Spezial' },
  gzauber:   { name: 'Zauber-Teppich',     price: 2800000, speed: 22, dive: 48, color: 0x6a2a8a, color2: 0xd6b04a, type: 'carpet', cat: 'Spezial' },
  ggeister:  { name: 'Geister-Wolke',      price: 1500000, speed: 18, dive: 40, color: 0xe8e8f0, type: 'cloud', cat: 'Spezial' },
  gufo:      { name: 'UFO-Scheibe',        price: 3500000, speed: 24, dive: 56, color: 0x2a2f3a, color2: 0x18e0e0, type: 'disc', cat: 'Spezial' }
};
IE.gliders = GLIDERS;
IE.gliderDef = id => GLIDERS[id];
IE.buildGliderMesh = id => buildChuteMesh('g:' + id);
function buildChuteMesh(kind) {
  const m = new T.Group();
  if (kind === 'chute') {
    const can = new T.Mesh(new T.SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), new T.MeshLambertMaterial({ color: 0xd8262c, side: T.DoubleSide })); can.scale.y = 0.55; can.position.y = 5; m.add(can);
    const can2 = new T.Mesh(new T.SphereGeometry(3.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 5), new T.MeshLambertMaterial({ color: 0xf4f4f0, side: T.DoubleSide })); can2.scale.y = 0.55; can2.position.y = 5.02; m.add(can2);
    const lm = new T.LineBasicMaterial({ color: 0x333333 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; m.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 1.6, 0), new T.Vector3(Math.cos(a) * 2.6, 5.4, Math.sin(a) * 2.6)]), lm)); }
    return m;
  }
  const gd = GLIDERS[kind.slice(2)] || GLIDERS.schirm, col = gd.color, col2 = gd.color2 !== undefined ? gd.color2 : 0xf4f4f0, type = gd.type || 'para';
  const L2 = c => new T.MeshLambertMaterial({ color: c, side: T.DoubleSide });
  const GL = c => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, side: T.DoubleSide });
  const bx = (w, h, d, c, x, y, z, rx, ry, rz) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? L2(c) : c); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz; m.add(o); return o; };
  const sph = (r, c, x, y, z) => { const o = new T.Mesh(new T.SphereGeometry(r, 12, 9), typeof c === 'number' ? L2(c) : c); o.position.set(x, y, z); m.add(o); return o; };
  const cyl = (r0, r1, h, c, x, y, z, axis) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 16), typeof c === 'number' ? L2(c) : c); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; o.position.set(x, y, z); m.add(o); return o; };
  const lm = new T.LineBasicMaterial({ color: 0x333333 });
  const lines = (yTop, rad) => { for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; m.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(Math.cos(a) * 0.5, 1.7, Math.sin(a) * 0.4), new T.Vector3(Math.cos(a) * rad, yTop, Math.sin(a) * rad * 0.6)]), lm)); } };
  if (type === 'para') {
    // Gleitschirm: gewölbte Kappe aus Segmenten
    const seg = 7, span = 6.5, h = 3.6, arc = 1.0;
    for (let i = 0; i < seg; i++) { const a = (i / (seg - 1) - 0.5) * arc; const p = bx(span / seg + 0.05, 0.14, 2.0, i % 2 ? col : col2, Math.sin(a) * 6, h + (Math.cos(a) - Math.cos(arc / 2)) * 6, 0, 0, 0, -a); }
    lines(h - 0.3, 3.0);
  } else if (type === 'delta') {
    // Deltaflieger: Dreiecksflügel tiefer über dem Spieler, Steuerbügel
    for (const sz of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(0, 0.9); sh.lineTo(sz * 3.4, -1.4); sh.lineTo(0, -1.9); sh.closePath(); const w = new T.Mesh(new T.ShapeGeometry(sh), L2(sz < 0 ? col : col2)); w.rotation.x = -Math.PI / 2; w.position.set(0, 2.5, 0); m.add(w); }
    bx(0.12, 0.12, 5.6, 0x333333, 0, 2.5, -0.5, Math.PI / 2, 0, 0);
    bx(0.1, 1.6, 0.1, 0x444444, 0, 1.7, 0.3); bx(1.8, 0.1, 0.1, 0x444444, 0, 1.0, 0.3);
  } else if (type === 'wingsuit') {
    // Wingsuit: Membranen zwischen Armen und Beinen
    for (const sz of [-1, 1]) { const w = bx(1.7, 0.05, 1.4, col, sz * 1.0, 1.35, 0, 0, 0, sz * 0.2); }
    bx(1.6, 0.05, 1.2, col, 0, 0.55, -0.3, 0.3);
  } else if (type === 'board') {
    // Hoverboard: Brett unter den Füßen, Leucht-Unterseite (zum Draufstehen)
    bx(1.0, 0.2, 3.2, col, 0, 0.08, 0); for (const sz of [-1, 1]) bx(1.0, 0.45, 0.4, col, 0, 0.22, sz * 1.5, sz * 0.5, 0, 0);
    bx(0.8, 0.12, 3.0, GL(col2 !== 0xf4f4f0 ? col2 : 0x18e0e0), 0, -0.05, 0);
    for (const sz of [-1, 1]) cyl(0.18, 0.18, 0.25, GL(col2 !== 0xf4f4f0 ? col2 : 0x18e0e0), 0, -0.12, sz * 1.0, 'y');
  } else if (type === 'surf') {
    // Flug-Surfbrett (Draufstehen)
    const sh = new T.Shape(); sh.moveTo(0, -1.9); sh.quadraticCurveTo(0.55, -0.9, 0.5, 0); sh.quadraticCurveTo(0.55, 1.3, 0, 2.0); sh.quadraticCurveTo(-0.55, 1.3, -0.5, 0); sh.quadraticCurveTo(-0.55, -0.9, 0, -1.9);
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); const b = new T.Mesh(geo, L2(col)); b.position.y = 0.1; m.add(b);
    bx(0.12, 0.17, 3.6, col2, 0, 0.2, 0); const fin = bx(0.1, 0.5, 0.5, col2, 0, -0.2, -1.6, 0.4, 0, 0);
  } else if (type === 'carpet') {
    // Fliegender Teppich (Draufstehen)
    bx(2.2, 0.12, 3.2, col, 0, 0.12, 0); bx(2.35, 0.1, 3.35, col2, 0, 0.06, 0);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) bx(0.35, 0.14, 0.35, col2, i * 0.65, 0.19, j * 1.0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.05, 0.02, 0.4, col2, sx * 1.1, 0.0, sz * 1.6, 'y');
  } else if (type === 'disc') {
    // Schwebe-Scheibe / UFO-Board (Draufstehen)
    cyl(1.7, 1.7, 0.2, col, 0, 0.12, 0, 'y'); const ring = new T.Mesh(new T.TorusGeometry(1.7, 0.14, 8, 24), GL(col2 !== 0xf4f4f0 ? col2 : 0x18e0e0)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; m.add(ring);
    cyl(1.3, 0.9, 0.4, GL(col2 !== 0xf4f4f0 ? col2 : 0xff5fd2), 0, -0.15, 0, 'y');
    for (let i = 0; i < 6; i++) { const a = i * 1.05; sph(0.1, GL(0xffffff), Math.cos(a) * 1.5, 0.12, Math.sin(a) * 1.5); }
  } else if (type === 'cloud') {
    // Wolke (Draufstehen)
    const pts = [[0, 0, 0, 1.0], [0.9, 0, 0.6, 0.8], [-0.9, 0, 0.6, 0.8], [0.7, 0, -0.8, 0.75], [-0.7, 0, -0.8, 0.75], [0, 0.1, 1.1, 0.7]];
    for (const [x, y, z, r] of pts) { const c = sph(r, col, x, 0.1 + y, z); c.scale.y = 0.55; }
  } else if (type === 'broom') {
    // Besen (Hexenbesen – draufsitzen/stehen)
    cyl(0.08, 0.08, 3.6, 0x6a4422, 0, 0.5, 0, 'z'); const br = new T.Mesh(new T.ConeGeometry(0.5, 1.3, 10), L2(col)); br.rotation.x = Math.PI / 2; br.position.set(0, 0.5, -2.1); m.add(br);
    cyl(0.02, 0.02, 1.2, col2, 0, 0.5, 1.6, 'z');
  } else if (type === 'jet') {
    // Jetpack-Gleiter: kleine Flügel + Schub
    for (const sz of [-1, 1]) { bx(0.16, 1.3, 2.4, col, sz * 0.7, 1.5, -0.3, 0, 0, sz * 0.25); const flame = new T.Mesh(new T.ConeGeometry(0.22, 0.9, 8), new T.MeshBasicMaterial({ color: 0xff8a20 })); flame.position.set(sz * 0.45, 0.55, -0.5); flame.rotation.x = Math.PI; m.add(flame); }
    bx(0.8, 1.0, 0.5, col2, 0, 1.4, -0.5);
  }
  return m;
}
let chuteMesh = null;
function updateChute() {
  const g = G(), P = g.P, S = g.S;
  if (IE.exitHold && P.veh && performance.now() - IE.exitHold > 550 && IE.vehFast(P.veh)) { IE.exitHold = null; bailOut(); }
  if (P.chute && (P.onGround || P.swim || P.veh)) P.chute = false;
  const activeGlider = S.glider && (S.gliders || []).includes(S.glider) ? S.glider : '';
  const want = activeGlider ? 'g:' + activeGlider : 'chute';
  if (chuteMesh && chuteMesh._kind !== want) { g.scene.remove(chuteMesh); chuteMesh = null; }
  if (!chuteMesh) { chuteMesh = buildChuteMesh(want); chuteMesh._kind = want; chuteMesh.visible = false; g.scene.add(chuteMesh); }
  chuteMesh.visible = !!P.chute; if (P.chute) { chuteMesh.position.copy(P.pos); chuteMesh.rotation.y = P.yaw; }
}
function openGliders() {
  const g = G(), S = g.S; S.gliders = S.gliders || []; const rows = [];
  rows.push({ name: 'Gleiter öffnen sich wie ein Fallschirm (in der Luft SPRUNG/Leertaste). Mit einem Gleiter fliegst du schneller, wenn du nach vorne-unten schaust (Kamera senken). ' + (S.gliders.length) + ' von ' + Object.keys(GLIDERS).length + ' Gleitern freigeschaltet.', stat: '' });
  if (S.glider && !S.gliders.includes(S.glider)) S.glider = '';
  rows.push({ name: '🪂 Normaler Fallschirm', stat: S.glider === '' ? '✓ Aktiv' : 'Standard · gratis', btns: S.glider === '' ? [] : [{ label: 'Benutzen', buy: true, fn: () => { S.glider = ''; g.saveGame(); openGliders(); } }] });
  const cats = {};
  for (const [id, gd] of Object.entries(GLIDERS)) { const c = gd.cat || 'Gleiter'; (cats[c] = cats[c] || []).push([id, gd]); }
  for (const cat of Object.keys(cats)) {
    rows.push({ name: '— ' + cat + ' —', stat: '' });
    for (const [id, gd] of cats[cat]) {
      const own = S.gliders.includes(id), act = S.glider === id;
      rows.push({ name: '🪂 ' + gd.name, stat: (gd.suit ? 'Wingsuit – rasanter Sturzflug' : gd.delta ? 'Deltaflieger – schnelles Gleiten' : 'Gleitschirm – sanftes Gleiten') + ' · Tempo bis ' + Math.round((gd.speed + gd.dive) * 3.6) + ' km/h',
        btns: own ? (act ? [{ label: '✓ Aktiv' }] : [{ label: 'Benutzen', buy: true, fn: () => { S.glider = id; g.saveGame(); openGliders(); } }])
          : [{ label: 'Kaufen · ' + g.fmt(gd.price), buy: true, off: S.money < gd.price, fn: () => { if (S.money < gd.price) return; S.money -= gd.price; S.gliders.push(id); S.glider = id; g.sfx('cash'); g.saveGame(); openGliders(); g.toast(gd.name + ' gekauft – öffnet sich jetzt statt des Fallschirms!', 3); } }] });
    }
  }
  xModal('gliders', '🪂 Gleiter', rows, '');
}
IE.openGliders = openGliders;

// Reifenqualm beim Driften
let smokeT = 0;
function updateDriftSmoke(dt) {
  const g = G(), v = g.P.veh; smokeT -= dt; if (!v || v.type !== 'car' || !v.drifting || smokeT > 0) return; smokeT = 0.05;
  const f = fwd(v.yaw);
  for (const sd of [-1, 1]) {
    const x = v.pos.x - f.x * v.m.L * 0.35 + f.z * sd * v.m.W * 0.45, z = v.pos.z - f.z * v.m.L * 0.35 - f.x * sd * v.m.W * 0.45;
    const sm = new T.Mesh(new T.SphereGeometry(0.4, 6, 4), new T.MeshBasicMaterial({ color: 0xdedede, transparent: true, opacity: 0.6, depthWrite: false }));
    sm.position.set(x, v.pos.y + 0.3, z); g.scene.add(sm); let a = 0;
    const iv = setInterval(() => { a += 0.06; sm.scale.setScalar(1 + a * 5); sm.position.y += 0.05; sm.material.opacity = 0.6 * (1 - a); if (a >= 1) { clearInterval(iv); g.scene.remove(sm); sm.geometry.dispose(); sm.material.dispose(); } }, 40);
  }
}
// ================= MEINE FAHRZEUGE (gekaufte Fahrzeuge herholen) =================
function freeSpot(cx, cz, r, need) {
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2 + (G().P.yaw || 0) + Math.PI / 2, rr = r + (k >> 3) * 4, x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
    if (!IE.isLand(x, z) || IE.blockedAt(x, z, need)) continue;
    return { x, z, yaw: Math.atan2(cx - x, cz - z) + Math.PI / 2 };
  }
  return null;
}
function clearDelivered(type, id) { for (const v of IE.vehicles) if (v.delivered && v.type === type && !v.driver && (!id || v.def.id === id)) v.removeMe = true; }
function deliver(kind, id, air) {
  const g = G(), P = g.P, sc = g.scene;
  IE.gliderPaint = g.S.gliderPaint = g.S.gliderPaint || {}; // gespeicherte Gleiter-Farben anwenden
  if (P.interior) { g.toast('Geh erst nach draußen', 2); return; }
  if (R && R.state !== 'lobby') { g.toast('Nicht während eines Rennens', 2); return; }
  const pp = P.veh ? P.veh.pos : P.pos; let v = null;
  if (kind === 'car') {
    const sp = freeSpot(pp.x, pp.z, 5, 2.4); if (!sp) { g.toast('Hier ist kein Platz – geh auf eine freie Fläche', 2.5); return; }
    clearDelivered('car', id); v = IE.spawnCar(sc, id, sp.x, sp.z, sp.yaw, { owned: true });
  } else if (kind === 'heli') {
    const sp = freeSpot(pp.x, pp.z, 14, 8); if (!sp) { g.toast('Hier ist kein Platz für einen Helikopter', 2.5); return; }
    clearDelivered('heli', id); v = IE.spawnHeli(sc, id, sp.x, IE.supportH(sp.x, sp.z, 999), sp.z, sp.yaw); v.owned = true;
  } else if (kind === 'plane') {
    clearDelivered('plane', id);
    if (air) {
      const f = fwd(P.yaw), y = Math.max(0, IE.groundH(pp.x, pp.z)) + 240;
      v = IE.spawnPlane(sc, id, pp.x - f.x * 20, pp.z - f.z * 20, P.yaw, y); v.speed = v.def.speed * 0.8; v.throttle = 0.75; v.onGround = false; v.owned = true; v.delivered = true;
      g.putInVehicle(v); g.closeModals(); g.toast(v.def.name + ' – guten Flug!', 2.5); return;
    }
    const sp = freeSpot(pp.x, pp.z, 22, 12); if (!sp) { g.toast('Hier ist kein Platz für ein Flugzeug – versuch es auf freiem Feld', 2.5); return; }
    v = IE.spawnPlane(sc, id, sp.x, sp.z, sp.yaw, IE.groundH(sp.x, sp.z)); v.owned = true;
  } else if (kind === 'boat') {
    let spot = null;
    for (let r = 10; r < 600 && !spot; r += 8) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, x = pp.x + Math.sin(a) * r, z = pp.z + Math.cos(a) * r; if (IE.terrainH(x, z) < -2.5 && IE.terrainH(x + 6, z) < -2 && IE.terrainH(x - 6, z) < -2) { spot = { x, z, d: r }; break; } }
    if (!spot) { g.toast('Kein Wasser in der Nähe – geh näher ans Meer', 2.5); return; }
    clearDelivered('boat', id); v = IE.spawnBoat(sc, id, spot.x, spot.z, Math.atan2(spot.x - pp.x, spot.z - pp.z)); v.owned = true;
    v.delivered = true; g.closeModals(); g.toast(v.def.name + ' liegt ' + Math.round(spot.d) + ' m entfernt im Wasser', 3); return;
  }
  if (v) { v.delivered = true; g.closeModals(); g.toast(v.def.name + ' steht bereit – steig ein (E / EIN-AUS)', 2.5); g.sfx('beep'); }
}
function openGarage() {
  const g = G(), S = g.S, rows = [];
  const cars = IE.cars.filter(c => (S.cars || []).includes(c.id)), helis = IE.helis.filter(h => (S.helis || []).includes(h.id)), boats = IE.boats.filter(b => (S.boats || []).includes(b.id)), planes = IE.planes.filter(p => (S.planes || []).includes(p.id));
  // Verkaufen-Button für jedes Fahrzeug – außer Pack-/Erweiterungs- und geschenkte Gratis-Fahrzeuge
  const sellBtn = (def, listKey, nm) => {
    if (def.pack || !(def.price > 0)) return null;
    const sell = Math.round(def.price * 0.6);
    return { label: 'Verkaufen · ' + g.fmt(sell), fn: () => {
      xModal('garage', nm + ' verkaufen?', [{ name: 'Willst du ' + nm + ' wirklich verkaufen?', stat: 'Du bekommst ' + g.fmt(sell) + ' (60 % vom Kaufpreis). Das Fahrzeug gehört dir danach nicht mehr.', btns: [
        { label: 'Ja, verkaufen', buy: true, fn: () => { S[listKey] = (S[listKey] || []).filter(id => id !== def.id); S.money += sell; g.sfx('cash'); g.saveGame(); g.closeModals(); g.banner('Verkauft', nm, '+ ' + g.fmt(sell), 4); } },
        { label: 'Nein, abbrechen', fn: () => openGarage() } ] }], 'Erweiterungs-/Pack-Fahrzeuge und geschenkte Fahrzeuge können nicht verkauft werden.');
    } };
  };
  const withSell = (btns, def, listKey, nm) => { const s = sellBtn(def, listKey, nm); if (s) btns.push(s); return btns; };
  // Gleiter anpassen (Farbe)
  const GLIDER_COLORS = [['Weiß', 0xf2f2ee], ['Rot', 0xc8101a], ['Blau', 0x3a9bff], ['Grün', 0x48e07a], ['Gelb', 0xf2c230], ['Pink', 0xff5fd2], ['Lila', 0x8a3cf0], ['Schwarz', 0x1a1a1f], ['Orange', 0xf28a1a], ['Türkis', 0x18c2d8], ['Gold', 0xd6b04a]];
  const paintGlider = (p) => {
    S.gliderPaint = S.gliderPaint || {}; IE.gliderPaint = S.gliderPaint;
    const cur = S.gliderPaint[p.id] !== undefined ? S.gliderPaint[p.id] : p.color;
    const rr = [{ name: '‹ Zurück zur Garage', btns: [{ label: 'Zurück', fn: () => openGarage() }] }];
    for (const [nm, hex] of GLIDER_COLORS) rr.push({ name: nm, stat: cur === hex ? 'Aktuell gewählt' : '', btns: [{ label: cur === hex ? '✓ Gewählt' : 'Diese Farbe', buy: cur !== hex, off: cur === hex, fn: () => { S.gliderPaint[p.id] = hex; IE.gliderPaint = S.gliderPaint; g.sfx('pass'); g.saveGame(); g.toast(p.name + ' lackiert: ' + nm, 2); paintGlider(p); } }] });
    xModal('garage', '🎨 ' + p.name + ' anpassen', rr, 'Wähle die Farbe deines Gleiters – sie gilt, sobald du ihn das nächste Mal herholst.');
  };
  for (const c of cars) rows.push({ name: '🚗 ' + c.name + (c.pack ? ' · 🎁 Pack' : ''), stat: 'Auto · ' + Math.round(c.speed * 3.6 * (1 + 0.07 * ((S.tune && S.tune[c.id] && S.tune[c.id].engine) || 0))) + ' km/h', btns: withSell([{ label: 'Tuning', fn: () => openTuning(c.id) }, { label: 'Herholen', buy: true, fn: () => deliver('car', c.id) }], c, 'cars', c.name) });
  for (const h of helis) rows.push({ name: '🚁 ' + h.name + (h.pack ? ' · 🎁 Pack' : ''), stat: 'Helikopter', btns: withSell([{ label: 'Herholen', buy: true, fn: () => deliver('heli', h.id) }], h, 'helis', h.name) });
  for (const p of planes) { const btns = [{ label: 'Am Boden', fn: () => deliver('plane', p.id, false) }, { label: 'In der Luft', buy: true, fn: () => deliver('plane', p.id, true) }]; if (p.glider) btns.push({ label: '🎨 Anpassen', fn: () => paintGlider(p) }); withSell(btns, p, 'planes', p.name); rows.push({ name: '✈ ' + p.name + (p.pack ? ' · 🎁 Pack' : '') + (p.glider ? ' · 🪁 Gleiter' : ''), stat: 'Flugzeug', btns }); }
  for (const b of boats) rows.push({ name: '⛵ ' + b.name + (b.pack ? ' · 🎁 Pack' : ''), stat: 'Boot · kommt ins nächste Wasser', btns: withSell([{ label: 'Herholen', buy: true, fn: () => deliver('boat', b.id) }], b, 'boats', b.name) });
  if (!rows.length) rows.push({ name: 'Noch keine Fahrzeuge', stat: 'Kauf dir Autos, Helikopter, Boote oder Flugzeuge in den Läden – dann kannst du sie hier überall herholen.' });
  rows.push({ name: '🏁 Schnellreise zur Rennstrecke', stat: 'Autodromo dell\'Adriatico · € 2.000', btns: [{ label: 'Hinreisen', off: S.money < 2000, fn: () => { if (R && R.state !== 'lobby') return; S.money -= 2000; g.closeModals(); const sp = IE.raceStart; g.teleportTo(sp.x + 18, IE.groundH(sp.x, sp.z), sp.z + 18); } }] });
  for (const v of IE.villas.filter(v => (S.villas || []).includes(v.id))) rows.push({ name: '⌂ Nach Hause: ' + v.name, stat: 'kostenlos', btns: [{ label: 'Hinreisen', fn: () => { g.closeModals(); g.teleportTo(v.gate.x, v.y, v.gate.z); } }] });
  xModal('garage', 'Meine Fahrzeuge', rows, 'Gekaufte Fahrzeuge werden direkt zu dir gebracht. Ein vorher hergeholtes Exemplar verschwindet dabei.');
}
IE.openGarage = openGarage;
function wireGarage() {
  const b7 = $('pPets'); if (b7) b7.addEventListener('click', () => { if (G() && G().game.state === 'play') openPets(); });
  const b4 = $('pAdvent'); if (b4) b4.addEventListener('click', () => { if (G() && G().game.state === 'play') openAdvent(); });
  const b5 = $('tBoost'); if (b5) b5.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); IE.planeBoost(); });
  const b6 = $('adXmas'); if (b6) b6.addEventListener('click', () => { XM.test = !XM.test; b6.textContent = XM.test ? 'Weihnachten testen: An' : 'Weihnachten testen: Aus'; XM.told = false; });
  addEventListener('keydown', e => { if (e.code === 'KeyX' && !e.repeat && G() && G().game.state === 'play') IE.planeBoost(); });
  const b3 = $('pSecurity'); if (b3) b3.addEventListener('click', () => { if (G() && G().game.state === 'play') openSecurity(); });
  const bg = $('pGliders'); if (bg) bg.addEventListener('click', () => { if (G() && G().game.state === 'play') openGliders(); });
  const b1 = $('pGarage'), b2 = $('tGarage');
  if (b1) b1.addEventListener('click', () => { if (G() && G().game.state === 'play') openGarage(); });
  if (b2) b2.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (G() && G().game.state === 'play') openGarage(); });
  addEventListener('keydown', e => { if (e.code === 'KeyG' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) && G() && G().game.state === 'play') { if (!$('xModal').hidden && $('xModal').dataset.k === 'garage') G().closeModals(); else if (document.querySelectorAll('.modal:not([hidden])').length === 0) openGarage(); } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireGarage); else wireGarage();
// ----- Fremde Flugzeuge/Helis im Hangar speichern -----
function hangarSaveTarget() {
  const g = G(), P = g.P, v = P.veh; if (!v || (v.type !== 'plane' && v.type !== 'heli') || v.dead) return null;
  const list = v.type === 'plane' ? g.S.planes : g.S.helis; if (list.includes(v.def.id)) return null;
  const landed = v.type === 'plane' ? v.onGround && Math.abs(v.speed) < 6 : v.pos.y - IE.supportH(v.pos.x, v.pos.z, v.pos.y) < 1.5;
  if (!landed) return null;
  const A = IE.airport; if (Math.abs(v.pos.x - A.x) < A.hw + 60 && Math.abs(v.pos.z - A.z) < A.hd + 60) return v;
  for (const s of IE.shops) if (s.type === 'heli' && Math.hypot(v.pos.x - s.x, v.pos.z - s.z) < 40) return v;
  return null;
}

// ================= SECURITY (Leibwächter) =================
const GUARD_PRICE = 75000, GUARD_MAX = 4;
let guardSpawnT = 0;
const isThreat = n => !n.dead && !n.remove && (n.kind === 'enemy' || n.kind === 'zombie' || (n.kind === 'soldier' && n.alert) || (n.kind === 'police' && G().game.wanted > 0 && n.alert));
function guards() { return IE.npcs.filter(n => n.kind === 'guard' && !n.remove); }
function guardManager(dt) {
  const g = G(), S = g.S, P = g.P;
  const want = S.guardsOn === false ? 0 : (S.guards || 0), list = guards();
  if (list.length > want) { list.slice(want).forEach(n => n.remove = true); return; }
  guardSpawnT -= dt;
  if (list.filter(n => !n.dead).length < want && guardSpawnT <= 0 && !P.interior && !g.game.dead && g.game.state === 'play') {
    guardSpawnT = list.length ? 20 : 0.3; // Ersatz für gefallene Wächter nach 20 s
    for (const n of list) if (n.dead) n.remove = true;
    const have = list.filter(n => !n.dead).length;
    for (let k = have; k < want; k++) { const a = rnd() * 6.3, x = P.pos.x + Math.sin(a) * 4, z = P.pos.z + Math.cos(a) * 4; const n = IE.spawnNPC(g.scene, 'guard', x, z); n.slot = k; n.keep = true; n.shootT = rnd(); }
  }
}
IE.guardUpdate = function (n, dt) {
  const g = G(), P = g.P;
  if (n.dead) { n.deadT += dt; return; }
  const inVeh = !!P.veh || !!P.ride, hidden = inVeh || !!P.interior;
  const slotA = [2.4, -2.4, 3.6, -3.6][n.slot % 4], f = fwd(P.yaw);
  const tx = P.pos.x - f.x * (n.slot < 2 ? 2.2 : 3.6) + f.z * slotA * 0.6, tz = P.pos.z - f.z * (n.slot < 2 ? 2.2 : 3.6) - f.x * slotA * 0.6;
  if (hidden) { n.group.visible = false; n.pos.set(tx, P.pos.y, tz); n.inCar = true; return; }
  if (n.inCar) { n.inCar = false; n.pos.set(tx, IE.supportH(tx, tz, P.pos.y + 2), tz); }
  n.group.visible = true;
  const dx = tx - n.pos.x, dz = tz - n.pos.z, d = Math.hypot(dx, dz);
  if (d > 70) { n.pos.set(tx, IE.supportH(tx, tz, P.pos.y + 2), tz); }
  // Bedrohung suchen
  let tgt = null, td = 48;
  for (const o of IE.npcs) if (isThreat(o)) { const dd = o.pos.distanceTo(n.pos); if (dd < td) { td = dd; tgt = o; } }
  let rTgt = null;
  if (!tgt && window.IEonline && IEonline.active && IEonline.lastAtt && performance.now() - IEonline.lastAtt.t < 10000) { const r = IEonline.peers.get(IEonline.lastAtt.peer); if (r && r.pr && !r.pr.dead && r.pos.distanceTo(n.pos) < 60) rTgt = r; }
  let spd = 0, aim = false;
  if (d > 1.2) { spd = d > 8 ? 7.5 : 4.6; n.yaw = Math.atan2(dx, dz); }
  else n.yaw = P.yaw;
  const tp = tgt ? tgt.pos : rTgt ? rTgt.pos : null;
  if (tp) {
    aim = true; if (d < 6) { spd = 0; } n.yaw = Math.atan2(tp.x - n.pos.x, tp.z - n.pos.z);
    n.shootT -= dt;
    if (n.shootT <= 0) {
      n.shootT = 0.55 + rnd() * 0.4;
      const from = new T.Vector3(n.pos.x, n.pos.y + 1.45, n.pos.z), to = new T.Vector3(tp.x, tp.y + 1.2, tp.z), dir = to.clone().sub(from), dist = dir.length(); dir.normalize();
      if (IE.rayBoxes(from, dir, dist) >= dist - 1.5) {
        const hit = rnd() < 0.6; g.tracer(from, hit ? to : to.clone().add(new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(3))); g.flash(from); g.sfx('shot', 0.25);
        if (hit) { if (tgt) g.damageNPC(tgt, 34, false); else if (rTgt) IEonline.sendHit(rTgt.peer, 9); }
      }
    }
  }
  if (spd > 0) { const ma = Math.atan2(dx, dz), st = Math.min(spd * dt, d); n.pos.x += Math.sin(ma) * st; n.pos.z += Math.cos(ma) * st; }
  IE.pushOut(n.pos, 0.4, n.pos.y, 1.8);
  n.pos.y = Math.max(IE.supportH(n.pos.x, n.pos.z, n.pos.y + 0.5), -1.25);
  const moving = spd > 0.1; n.phase += dt * (moving ? spd * 2 : 0);
  IE.animHuman(n.h, n.phase, moving ? 0.6 : 0, aim, false);
  n.group.position.copy(n.pos); n.group.rotation.y = n.yaw;
};
function openSecurity() {
  const g = G(), S = g.S, n = S.guards || 0, rows = [];
  rows.push({ name: 'Leibwächter anheuern', stat: `Du hast ${n} von ${GUARD_MAX} Leibwächtern · einmalig ${g.fmt(GUARD_PRICE)} pro Person`, btns: [{ label: 'Anheuern · ' + g.fmt(GUARD_PRICE), buy: true, off: n >= GUARD_MAX || S.money < GUARD_PRICE, fn: () => { S.money -= GUARD_PRICE; S.guards = n + 1; S.guardsOn = true; guardSpawnT = 0; g.sfx('cash'); g.saveGame(); openSecurity(); } }] });
  if (n > 0) {
    rows.push({ name: 'Security dabei', stat: S.guardsOn === false ? 'Deine Leibwächter warten zu Hause' : 'Deine Leibwächter folgen dir und schießen auf Angreifer', btns: [{ label: S.guardsOn === false ? 'Anfordern' : 'Nach Hause schicken', buy: S.guardsOn === false, fn: () => { S.guardsOn = S.guardsOn === false; guardSpawnT = 0; g.saveGame(); openSecurity(); } }] });
    rows.push({ name: 'Leibwächter entlassen', stat: 'Einen Leibwächter entlassen (kein Geld zurück)', btns: [{ label: 'Entlassen', fn: () => { S.guards = Math.max(0, n - 1); g.saveGame(); openSecurity(); } }] });
  }
  xModal('security', 'Security · Leibwächter', rows, 'Leibwächter folgen dir zu Fuß, steigen mit dir ins Fahrzeug, schießen auf Gegner, Zombies, Soldaten, Polizisten (wenn du gesucht wirst) und online auf Spieler, die dich angreifen. Gefallene Wächter kommen nach 20 Sekunden zurück.');
}
IE.openSecurity = openSecurity;
// ----- Hooks für main.js -----
// ===== Frachtflugzeug: Autos verladen =====
const CARGO_CAP = 4;
function nearCargoPlane(P) {
  let best = null, bd = 18;
  for (const v of IE.vehicles) {
    if (v.dead || v.type !== 'plane' || !v.def.carrier || !v.onGround) continue;
    const d = Math.hypot(v.pos.x - P.pos.x, v.pos.z - P.pos.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function nearLoadableCar(P) {
  let best = null, bd = 9;
  for (const v of IE.vehicles) {
    if (v.dead || v.type !== 'car' || v === P.veh || v.traffic || v.driver === 'npc') continue;
    const d = Math.hypot(v.pos.x - P.pos.x, v.pos.z - P.pos.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function cargoVisual(plane) {
  const scene = G().scene;
  if (plane.cargoHold) { plane.group.remove(plane.cargoHold); plane.cargoHold = null; }
  const carried = plane.carried || []; if (!carried.length) return;
  const hold = new T.Group();
  carried.forEach((c, i) => {
    let cm; try { cm = IE.makeCar((IE.carById[c.defId] || IE.cars[0]).kind, c.color); } catch (e) { return; }
    cm.group.position.set(0, (plane.m.gearH || 1.6) + 0.15, -1.5 - i * 4.7);
    cm.group.scale.setScalar(0.9);
    hold.add(cm.group);
  });
  plane.group.add(hold); plane.cargoHold = hold;
}
IE.extraPrompt = function () {
  const g = G(), P = g.P; if (!g) return '';
  if (launch) return '';
  if (!P.veh && !P.interior) {
    const plane = nearCargoPlane(P);
    if (plane) {
      plane.carried = plane.carried || [];
      if (nearLoadableCar(P) && plane.carried.length < CARGO_CAP) return '<b>E</b> · 🚗 Auto ins Frachtflugzeug laden (' + plane.carried.length + '/' + CARGO_CAP + ')';
      if (plane.carried.length > 0) return '<b>E</b> · 🚗 Auto ausladen (' + plane.carried.length + ' an Bord)';
    }
  }
  { const ip = IE.islandPrompt && IE.islandPrompt(); if (ip) return ip; }
  if (P.interior) { const it = P.interior.it; if (it.type === 'backrooms' && Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 3.2) return g.S.backroomsLoot ? 'Die Truhe ist leer …' : '<b>E</b> · Truhe öffnen'; if (it.type.indexOf('villa') === 0 && P.interior.villa && Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 4.5) return '<b>E</b> · Ausruhen (Gesundheit voll + speichern)'; if (it.type.indexOf('villa_') === 0 && Math.hypot(P.pos.x - it.door.x, P.pos.z - it.door.z) > 3) return '<b>E</b> · Haus-Menü (Möbel & Lackierung)'; return ''; }
  if (!P.veh && rocket && Math.hypot(P.pos.x - RK.x, P.pos.z - RK.z) < 30) return IE.moonOpen() ? '<b>E</b> · Mit der Rakete zum Mond fliegen' : isAdm() ? '<b>E</b> · ★ Admin: Rakete jetzt für ALLE starten (Countdown ' + fmtCD(RK.launch - Date.now()) + ')' : 'Mondrakete · Start in ' + fmtCD(RK.launch - Date.now());
  if (!P.veh && IE.onMoon && Math.hypot(P.pos.x - MOON.x, P.pos.z - MOON.z) < 16) return '<b>E</b> · Zurück zur Erde fliegen';
  if (P.veh && P.veh.type === 'car' && IE.raceStart && Math.hypot(P.veh.pos.x - IE.raceStart.x, P.veh.pos.z - IE.raceStart.z) < 16 && (!R || R.state === 'lobby')) return '<b>E</b> · Rennen fahren / Spieler einladen';
  { const hv = hangarSaveTarget(); if (hv) return `<b>E</b> · ${hv.def.name} im Hangar speichern`; }
  if (R && R.state === 'lobby' && R.host) return '';
  if (!P.veh) {
    if (rob || bankRob) return '';
    const bk = nearBank(P.pos); if (bk) { if (g.game.time < bk.cool) return 'Der Tresor ist noch leer – komm später wieder'; return g.S.cur && g.S.cur !== 'faust' ? '<b>E</b> · 🏦 Bank überfallen (5 Sterne!)' : 'Mit einer Waffe kannst du die Bank überfallen'; }
    const s = nearGas(P.pos); if (s) { if (g.game.time < s.cool) return 'Die Kasse ist noch leer – komm später wieder'; return g.S.cur && g.S.cur !== 'faust' ? '<b>E</b> · Tankstelle überfallen' : 'Mit einer Waffe kannst du die Tankstelle überfallen'; }
    const v = nearVilla(P.pos); if (v) { const o = ownedByOther(v); if (o) return v.name + ' gehört ' + o.nick; return (g.S.villas || []).includes(v.id) ? `<b>E</b> · Haus-Menü ${v.name}` : `<b>E</b> · ${v.name} kaufen · ${g.fmt(v.price)}`; }
  }
  return '';
};
IE.extraAct = function () {
  const g = G(), P = g.P;
  if (launch) return true;
  if (!P.veh && !P.interior) {
    const plane = nearCargoPlane(P);
    if (plane) {
      plane.carried = plane.carried || [];
      const car = nearLoadableCar(P);
      if (car && plane.carried.length < CARGO_CAP) {
        plane.carried.push({ defId: car.def.id, color: car.m.bodyMat ? car.m.bodyMat.color.getHex() : car.def.color, owned: !!car.owned });
        G().scene.remove(car.group);
        const idx = IE.vehicles.indexOf(car); if (idx >= 0) IE.vehicles.splice(idx, 1);
        cargoVisual(plane);
        g.toast('🚗 ' + car.def.name + ' verladen (' + plane.carried.length + '/' + CARGO_CAP + ')', 2.2); g.sfx('pass');
        return true;
      }
      if (plane.carried.length > 0) {
        const c = plane.carried.pop();
        const f = IE.fwd(plane.yaw), back = plane.m.L * 0.6 + 5;
        const bx = plane.pos.x - f.x * back, bz = plane.pos.z - f.z * back;
        try { IE.spawnCar(G().scene, c.defId, bx, bz, plane.yaw, { color: c.color, owned: c.owned }); } catch (e) { }
        cargoVisual(plane);
        g.toast('🚗 Auto ausgeladen', 2); g.sfx('pass');
        return true;
      }
    }
  }
  if (IE.islandAct && IE.islandAct()) return true;
  if (P.interior && P.interior.it.type === 'backrooms' && Math.hypot(P.pos.x - P.interior.it.item.x, P.pos.z - P.interior.it.item.z) < 3.2) { if (!g.S.backroomsLoot) { g.S.backroomsLoot = true; g.addMoney(100000000, true); g.sfx('cash'); g.banner('JACKPOT', 'Die Truhe der Backrooms', '+ ' + g.fmt(100000000), 6); g.saveGame(true); } return true; }
  if (!P.veh && !P.interior && rocket && Math.hypot(P.pos.x - RK.x, P.pos.z - RK.z) < 30) { if (!IE.moonOpen() && isAdm() && window.IEaccount && IEaccount.unlockMoon) IEaccount.unlockMoon(); if (IE.moonOpen() || isAdm()) startLaunch(true); else g.toast('Die Rakete startet am 25. November um 16:00 Uhr', 3); return true; }
  if (!P.veh && IE.onMoon && Math.hypot(P.pos.x - MOON.x, P.pos.z - MOON.z) < 16) { startLaunch(false); return true; }
  if (P.interior) { const it = P.interior.it; if (it.type.indexOf('villa') === 0 && P.interior.villa && Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 4.5) { P.health = Math.max(P.health, g.maxHP()); g.saveGame(); g.toast('Ausgeruht · Spiel gespeichert', 2.5); g.sfx('pass'); return true; } if (it.type.indexOf('villa_') === 0 && P.interior.villa && Math.hypot(P.pos.x - it.door.x, P.pos.z - it.door.z) > 3) { villaMenu(P.interior.villa); return true; } return false; }
  if (P.veh && P.veh.type === 'car' && IE.raceStart && Math.hypot(P.veh.pos.x - IE.raceStart.x, P.veh.pos.z - IE.raceStart.z) < 16 && (!R || R.state === 'lobby')) {
    if (g.mission.active) { g.toast('Erst die Mission beenden', 2); return true; }
    if (P.veh.speed > 6) { g.toast('Halte an, um das Rennmenü zu öffnen', 2); return true; }
    openRaceMenu(); return true;
  }
  { const hv = hangarSaveTarget(); if (hv) { (hv.type === 'plane' ? g.S.planes : g.S.helis).push(hv.def.id); hv.owned = true; g.saveGame(); g.sfx('pass'); g.banner('Im Hangar gespeichert', hv.def.name, 'Ab jetzt kannst du ihn jederzeit spawnen – im Hangar oder über „Meine Fahrzeuge“', 4); return true; } }
  if (!P.veh) {
    const bk = nearBank(P.pos);
    if (bk) { if (g.game.time >= bk.cool && g.S.cur && g.S.cur !== 'faust' && !bankRob && !rob) { bankRob = { s: bk, t: 0 }; g.setWanted(Math.max(g.game.wanted, 3)); g.toast('🏦 Überfall auf die Bank! Knack den Tresor!', 3); g.sfx('shot', 0.7); } return true; }
    const s = nearGas(P.pos);
    if (s) { if (g.game.time >= s.cool && g.S.cur && g.S.cur !== 'faust' && !rob) { rob = { s, t: 0 }; g.setWanted(Math.max(g.game.wanted, 2)); g.toast('Hände hoch! Das ist ein Überfall!', 2.5); g.sfx('shot', 0.6); } return true; }
    const v = nearVilla(P.pos);
    if (v) { if (ownedByOther(v)) { g.toast(v.name + ' gehört ' + ownedByOther(v).nick, 2.5); return true; } if ((g.S.villas || []).includes(v.id)) villaMenu(v); else buyVilla(v); return true; }
  }
  return false;
};
let bizOfflineDone = false;
function bizOffline() {
  const g = G(), S = g.S; if (!S.biz) return;
  const mins = Math.min(720, ((Date.now() - (S._t || Date.now())) / 60000)); // bis zu 12 Stunden offline anrechnen
  if (!(mins > 1)) return;
  let total = 0;
  for (const s of IE.shops) { if (s.type !== 'biz') continue; const b = S.biz[s.id]; if (!b) continue; const D = IE.bizDefs[s.biz], incMin = D.inc * (1 + 0.5 * (b.lv - 1)); const add = Math.min(incMin * 720, (b.cash || 0) + incMin * mins) - (b.cash || 0); b.cash = (b.cash || 0) + add; total += add; }
  if (total > 1) { g.saveGame && g.saveGame(); setTimeout(() => g.banner('Willkommen zurück!', 'Deine Geschäfte haben offline gearbeitet', '+ ' + g.fmt(Math.floor(total)) + ' in der Kasse – komm vorbei und hol es ab', 5), 3500); }
}
function bizTick(dt) {
  const g = G(), S = g.S; if (!S.biz || g.game.state !== 'play') return;
  if (!bizOfflineDone) { bizOfflineDone = true; bizOffline(); }
  // Offline-Kasse fasst bis zu 12 Std., im Spiel läuft es normal weiter
  for (const s of IE.shops) { if (s.type !== 'biz') continue; const b = S.biz[s.id]; if (!b) continue; const D = IE.bizDefs[s.biz], incMin = D.inc * (1 + 0.5 * (b.lv - 1)); b.cash = Math.min(incMin * 720, (b.cash || 0) + incMin / 60 * dt); }
}
IE.extraUpdate = function (dt) {
  bizTick(dt); guardManager(dt); updateBombs(dt); updateMissiles(dt); updateTorpedoes(dt); updateXmas(dt); updateBoost(dt); updateChute(); updateDriftSmoke(dt); updateHouses(); petTick(dt); homePetsTick(dt); updateBackrooms(dt); updateMoon(dt); updateLaunch(dt);
  if (IE.raceBeam) IE.raceBeam.visible = !R;
  updateRace(dt); updateRob(dt); updateBankRob(dt);
};
// ===== Admin-Cutscenes (Jet-Überflug & Spiel-Trailer) =====
(function () {
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const vlerp = (a, b, t, out) => out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  const cp = new T.Vector3(), cl = new T.Vector3();
  const uiOn = () => { document.body.classList.add('cutsceneOn'); const b = document.getElementById('cutscene'); if (b) b.hidden = false; const s = document.getElementById('csSkip'); if (s) s.onclick = () => IE.endCutscene(); };
  const setSub = txt => { const s = document.getElementById('csSub'); if (s && s.textContent !== txt) s.textContent = txt; };
  const setTitle = txt => { const t = document.getElementById('csTitle'); if (t) t.textContent = txt; };
  const setLogo = on => { const l = document.getElementById('csLogo'); if (l) l.classList.toggle('show', !!on); };
  const applyCam = (cam, fov) => { cam.position.copy(cp); cam.lookAt(cl); cam.fov = fov; cam.updateProjectionMatrix(); };

  IE.cutsceneTick = function (dt) { const cs = IE.cutscene; if (cs && cs.tick) { try { cs.tick(dt); } catch (e) { console.error(e); IE.endCutscene(); } } };
  IE.endCutscene = function () { const cs = IE.cutscene; if (!cs) return; IE.cutscene = null; try { cs.destroy && cs.destroy(); } catch (e) { } document.body.classList.remove('cutsceneOn'); const b = document.getElementById('cutscene'); if (b) b.hidden = true; setLogo(false); setTitle('★ ADMIN-CUTSCENE'); };
  addEventListener('keydown', e => { if (IE.cutscene && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'KeyP')) { e.preventDefault(); e.stopPropagation(); IE.endCutscene(); } }, true);

  // --- Cutscene 1: Spionagejet über die Berge nach Neapel ---
  IE.startCutscene = function () {
    if (IE.cutscene) return;
    const g = G(), scene = g.scene, NP = IE.cityById.neapel;
    const R = IE.geo(14.2, 41.75);
    const dir = new T.Vector3(NP.x - R.x, 0, NP.z - R.z); dir.normalize();
    const start = new T.Vector3(R.x - dir.x * 2200, 0, R.z - dir.z * 2200), end = new T.Vector3(NP.x + dir.x * 700, 0, NP.z + dir.z * 700);
    const jetM = IE.makePlane(IE.planeById.blackbird); jetM.group.rotation.order = 'YXZ'; scene.add(jetM.group);
    setTitle('★ ADMIN-CUTSCENE · MERLO NERO SR-71');
    const cs = { t: 0, dur: 21, jet: jetM, start, end, dir, NP, pos: new T.Vector3(), right: new T.Vector3(-dir.z, 0, dir.x), destroy() { try { scene.remove(jetM.group); } catch (e) { } } };
    cs.tick = dt => jetTick(cs, dt);
    IE.cutscene = cs; uiOn(); try { g.sfx && g.sfx('beep'); } catch (e) { }
  };
  function jetTick(cs, dt) {
    const g = G(), cam = g.camera; cs.t += dt;
    const tt = Math.min(1, cs.t / cs.dur), pe = ease(tt);
    vlerp(cs.start, cs.end, pe, cs.pos);
    cs.pos.y = Math.max(IE.groundH(cs.pos.x, cs.pos.z) + 70, 300 - pe * 120);
    const D = cs.dir, Rt = cs.right, P = cs.pos;
    cs.jet.group.position.copy(P); cs.jet.group.rotation.y = Math.atan2(D.x, D.z); cs.jet.group.rotation.x = -0.04 - pe * 0.06; cs.jet.group.rotation.z = Math.sin(cs.t * 0.6) * 0.18;
    if (IE.sky) IE.sky.position.copy(cam.position);
    if (g.scene.fog) { g.scene.fog.near = 900; g.scene.fog.far = 9000; }
    const shots = [[0, 0.20], [0.20, 0.40], [0.40, 0.58], [0.58, 0.74], [0.74, 1.01]];
    let si = shots.findIndex(s => tt >= s[0] && tt < s[1]); if (si < 0) si = 4;
    const lt = (tt - shots[si][0]) / (shots[si][1] - shots[si][0]);
    if (si === 0) { cp.set(P.x - D.x * 120 + Rt.x * (270 - lt * 70), P.y + 150 - lt * 30, P.z - D.z * 120 + Rt.z * (270 - lt * 70)); cl.set(P.x, P.y, P.z); applyCam(cam, 54); }
    else if (si === 1) { const d = 13 + Math.sin(lt * Math.PI) * 3; cp.set(P.x + Rt.x * d - D.x * 2, P.y + 2.5, P.z + Rt.z * d - D.z * 2); cl.set(P.x, P.y + 1, P.z); applyCam(cam, 40); }
    else if (si === 2) { cp.set(P.x + D.x * 26 + Rt.x * 5, P.y - 12, P.z + D.z * 26 + Rt.z * 5); cl.set(P.x, P.y + 2, P.z); applyCam(cam, 48); }
    else if (si === 3) { cp.set(P.x + D.x * 17 + Rt.x * 3.2, P.y + 2.2, P.z + D.z * 17 + Rt.z * 3.2); cl.set(P.x + D.x * 4, P.y + 1.2, P.z + D.z * 4); applyCam(cam, 36); }
    else { cp.set(P.x - D.x * 130 + Rt.x * 70, P.y + 72, P.z - D.z * 130 + Rt.z * 70); cl.set(P.x * 0.55 + cs.NP.x * 0.45, P.y * 0.62, P.z * 0.55 + cs.NP.z * 0.45); applyCam(cam, 60); }
    setSub(['Hoch über den Gipfeln der Berge …', 'Merlo Nero SR-71 · Überschall', 'Kurs Süd – die Nachbrenner glühen', 'Ziel in Sicht', 'Neapel.'][si]);
    if (cs.t >= cs.dur) IE.endCutscene();
  }

  // --- Cutscene 2: Spiel-Trailer (Edit-Stil) ---
  const skinLook = id => { const s = (IE.skins || []).find(k => k.id === id); return s && s.look; };
  const spinWheels = (cs, car, dt, rate, steer) => { cs.wheelRot = (cs.wheelRot || 0) + rate * dt; (car.wheels || []).forEach((w, wi) => { if (w.children[0]) w.children[0].rotation.z = -cs.wheelRot; if (w.children[1]) w.children[1].rotation.z = -cs.wheelRot; w.rotation.y = wi >= 2 ? (steer || 0) : 0; }); };
  IE.startTrailer = function () {
    if (IE.cutscene) return;
    const g = G(), scene = g.scene, NP = IE.cityById.neapel, B = IE.base, ROM = IE.cityById.rom;
    const gyB = IE.groundH(B.x, B.z), gyR = IE.groundH(ROM.x, ROM.z);
    const objs = [];
    // Crew (winken / Militärbasis stürmen)
    const looks = [IE.chars.jack, IE.chars.marco, IE.chars.sofia, skinLook('anzug'), skinLook('smoking'), skinLook('fib')].filter(Boolean);
    const actors = [];
    looks.forEach((lk, i) => { const h = IE.makeHuman(lk); const bx = B.x + (i - (looks.length - 1) / 2) * 1.8; h.group.position.set(bx, gyB, B.z); h.group.rotation.y = Math.PI; scene.add(h.group); objs.push(h.group); actors.push({ h, ph: i * 1.3, bx }); });
    const rowX0 = B.x - (looks.length - 1) / 2 * 1.8, rowX1 = B.x + (looks.length - 1) / 2 * 1.8;
    // Passanten in Rom (laufen & feiern)
    const pLooks = [skinLook('anzug'), skinLook('banker'), IE.chars.marco, skinLook('smoking'), IE.chars.sofia, skinLook('fib'), IE.chars.jack].filter(Boolean);
    const peds = [];
    pLooks.forEach((lk, i) => { const h = IE.makeHuman(lk); const an = i / pLooks.length * 6.283, px = ROM.x + Math.cos(an) * 9, pz = ROM.z + Math.sin(an) * 9; h.group.position.set(px, gyR, pz); scene.add(h.group); objs.push(h.group); peds.push({ h, x: px, z: pz, rot: an + 1.57, dance: i % 3 === 0, ph: i * 1.7, ph2: i }); });
    // Fahrzeuge
    const carDef = IE.carById.rosso || IE.carById.toro || IE.cars.find(c => !c.pack && (c.kind === 'sport' || c.kind === 'super')) || IE.cars[0];
    const car = IE.makeCar(carDef.kind, carDef.color); car.group.visible = false; scene.add(car.group); objs.push(car.group);
    const tank = IE.makeCar('tank', 0x55603a); tank.group.position.set(B.x + 16, gyB, B.z + 12); tank.group.rotation.y = 0.5; scene.add(tank.group); objs.push(tank.group);
    const jeep = IE.makeCar('suv', 0x4f5a34); jeep.group.position.set(B.x - 16, gyB, B.z + 11); jeep.group.rotation.y = -0.4; scene.add(jeep.group); objs.push(jeep.group);
    const jetM = IE.makePlane(IE.planeById.blackbird); jetM.group.rotation.order = 'YXZ'; jetM.group.visible = false; scene.add(jetM.group); objs.push(jetM.group);
    const villaY = IE.groundH(550, 150);
    setTitle('★ ITALIEN EMPIRE · TRAILER');
    const cs = {
      t: 0, dur: 24.0, NP, B, ROM, gyB, gyR, actors, peds, car, tank, jeep, jet: jetM, rowX0, rowX1, villaY,
      scenes: [[0, 2.4], [2.4, 4.6], [4.6, 6.2], [6.2, 9.0], [9.0, 11.2], [11.2, 13.6], [13.6, 15.6], [15.6, 18.2], [18.2, 20.4], [20.4, 24.0]],
      destroy() { for (const o of objs) try { scene.remove(o); } catch (e) { } }
    };
    cs.tick = dt => trailerTick(cs, dt);
    IE.cutscene = cs; uiOn(); try { g.sfx && g.sfx('beep'); } catch (e) { }
  };
  function trailerTick(cs, dt) {
    const g = G(), cam = g.camera; cs.t += dt; const t = cs.t, B = cs.B, ROM = cs.ROM, gyB = cs.gyB, gyR = cs.gyR, NP = cs.NP;
    if (IE.sky) IE.sky.position.copy(cam.position);
    if (g.scene.fog) { g.scene.fog.near = 600; g.scene.fog.far = 9000; }
    let i = cs.scenes.findIndex(s => t >= s[0] && t < s[1]); if (i < 0) { IE.endCutscene(); return; }
    const s = cs.scenes[i], lt = (t - s[0]) / (s[1] - s[0]), e = lt < 0.5 ? 2 * lt * lt : 1 - Math.pow(-2 * lt + 2, 2) / 2;
    // Crew-Animation: winken (Szene 0-2) oder Basis stürmen (Szene 7)
    const raid = (i === 7);
    for (const a of cs.actors) {
      if (raid) { IE.setGunLen(a.h, 0.78); IE.animHuman(a.h, t * 9 + a.ph, 0.95, true, false); a.h.group.rotation.y = 0; a.h.group.position.set(a.bx, gyB, B.z + 4 + e * 15); }
      else { IE.setGunLen(a.h, 0); a.h.legL.rotation.x = 0; a.h.legR.rotation.x = 0; a.h.group.rotation.y = Math.PI; a.h.group.position.set(a.bx, gyB, B.z); a.h.armR.rotation.set(0, 0, 2.0 + Math.sin(t * 7 + a.ph) * 0.35); a.h.armL.rotation.set(Math.sin(t * 2 + a.ph) * 0.06, 0, 0); }
    }
    // Passanten in Rom
    for (const p of cs.peds) {
      if (p.dance) { p.h.legL.rotation.x = 0; p.h.legR.rotation.x = 0; p.h.armL.rotation.set(0, 0, 0.7 + Math.sin(t * 6 + p.ph) * 0.6); p.h.armR.rotation.set(0, 0, -0.7 - Math.sin(t * 6 + p.ph) * 0.6); p.h.group.position.set(p.x, gyR + Math.abs(Math.sin(t * 6 + p.ph)) * 0.14, p.z); p.h.group.rotation.y = p.rot + Math.sin(t * 3 + p.ph) * 0.4; }
      else { p.ph2 += dt * 6.5; IE.animHuman(p.h, p.ph2, 0.6, false, false); p.x += Math.sin(p.rot) * 2.3 * dt; p.z += Math.cos(p.rot) * 2.3 * dt; if (Math.hypot(p.x - ROM.x, p.z - ROM.z) > 15) p.rot += Math.PI; p.h.group.position.set(p.x, gyR, p.z); p.h.group.rotation.y = p.rot; }
    }
    cs.car.group.visible = (i === 3 || i === 4); cs.jet.group.visible = (i === 6);
    setLogo(i === 0 || i === 9);
    if (i === 0) { const an = 0.3 + e * 0.3; cp.set(NP.x + Math.cos(an) * (440 - e * 130), 150 - e * 18, NP.z + Math.sin(an) * (440 - e * 130)); cl.set(NP.x + 30, 22, NP.z); applyCam(cam, 62 - e * 8); setSub(''); }
    else if (i === 1) { const cx = cs.rowX0 - 1.4 + (cs.rowX1 - cs.rowX0 + 2.8) * lt; cp.set(cx, gyB + 1.7, B.z - 6.5 + e * 1.8); cl.set(cx, gyB + 1.45, B.z); applyCam(cam, 44 - e * 4); setSub('Deine Crew.'); }
    else if (i === 2) { const a0 = cs.actors[0].h.group.position; cp.set(a0.x + 0.25, gyB + 1.72, B.z - 3 + e * 0.8); cl.set(a0.x, gyB + 1.6, B.z); applyCam(cam, 36 - e * 4); setSub('Jack. Marco. Sofia.'); }
    else if (i === 3) { const cx = ROM.x - 75 + 160 * e; cs.car.group.position.set(cx, gyR, ROM.z); cs.car.group.rotation.y = Math.PI / 2; spinWheels(cs, cs.car, dt, 46, 0); cp.set(cx - 11, gyR + 3, ROM.z - 9 + e * 3); cl.set(cx + 6, gyR + 1.3, ROM.z); applyCam(cam, 48 - e * 4); setSub('Fahr durch Rom.'); }
    else if (i === 4) { const cx = ROM.x - 15 + 34 * e; cs.car.group.position.set(cx, gyR, ROM.z + 7); cs.car.group.rotation.y = Math.PI / 2 + 0.7 + Math.sin(t * 3) * 0.08; spinWheels(cs, cs.car, dt, 60, 0.45); cp.set(cx - 7, gyR + 1.7, ROM.z + 7 - 7.5); cl.set(cx + 3, gyR + 1.3, ROM.z + 7); applyCam(cam, 52); setSub('Drifte durch die Gassen.'); }
    else if (i === 5) { cp.set(ROM.x - 15 + e * 6, gyR + 3.6, ROM.z - 15 + e * 4); cl.set(ROM.x, gyR + 1.4, ROM.z); applyCam(cam, 52 - e * 6); setSub('Die Stadt lebt.'); }
    else if (i === 6) { const jx = B.x + 95 - 230 * lt, jy = gyB + 32; cs.jet.group.position.set(jx, jy, B.z + 14); cs.jet.group.rotation.y = -Math.PI / 2; cs.jet.group.rotation.z = 0.25; cp.set(B.x - 4, gyB + 2.6, B.z - 8); cl.set(jx, jy, B.z + 14); applyCam(cam, 56); setSub('Heb ab.'); }
    else if (i === 7) { cp.set(B.x - 20 + e * 6, gyB + 3.8, B.z + 6 + e * 4); cl.set(B.x, gyB + 1.6, B.z + 14); applyCam(cam, 48); setSub('Stürme die Militärbasis.'); }
    else if (i === 8) { const vx = 400 + 320 * e; cp.set(vx, cs.villaY + 50, 150 - 112); cl.set(vx + 25, cs.villaY + 6, 150); applyCam(cam, 52); setSub('Luxus-Villen für die Bosse.'); }
    else { const an = 1.0 + e * 0.4; cp.set(NP.x + Math.cos(an) * (400 - e * 90), 140 - e * 20, NP.z + Math.sin(an) * (400 - e * 90)); cl.set(NP.x, 20, NP.z); applyCam(cam, 58 - e * 6); setSub('ITALIEN EMPIRE'); }
    if (cs.t >= cs.dur) IE.endCutscene();
  }
})();
IE.mapBase = function (g, s, x0, z0) {
  if (IE.trackPts) { g.strokeStyle = '#2b2d31'; g.lineWidth = 3; g.beginPath(); IE.trackPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
  if (IE.trackRoadPts) { g.strokeStyle = '#f2d36b'; g.lineWidth = 2; g.beginPath(); IE.trackRoadPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  if (IE.villaRoadPts) { g.strokeStyle = '#f2d36b'; g.lineWidth = 2; g.beginPath(); IE.villaRoadPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
};
IE.mapPOIs = function () {
  const S = G() && G().S, out = [];
  if (IE.raceStart) out.push({ x: IE.raceStart.x, z: IE.raceStart.z, kind: 'race', label: 'Rennstrecke' });
  out.push({ x: RK.x, z: RK.z, kind: 'rocket', label: 'Mondrakete' });
  for (const v of IE.villas) out.push({ x: v.x, z: v.z, kind: S && (S.villas || []).includes(v.id) && !ownedByOther(v) ? 'villaOwn' : 'villa' });
  for (const s of gas) out.push({ x: s.x, z: s.z, kind: 'gas' });
  for (const is of IE.islands) out.push({ x: is.x, z: is.z, kind: (S && (S.islands||[]).includes(is.id) && !islOwnedByOther(is)) ? 'islandOwn' : 'island', label: is.name });
  return out;
};
})();
