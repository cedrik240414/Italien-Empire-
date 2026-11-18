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

// ================= VILLEN =================
function megaExtras(g, s, v, y) {
  for (const sx of [-1, 1]) { IE.addBox(v.x + sx * 13 * s - 3 * s, v.z - 8.5 * s, v.x + sx * 13 * s + 3 * s, v.z + 0.5 * s, y + 9.5); IE.addBox(v.x + sx * 15.5 * s - 3.3, v.z - 8 * s - 3.3, v.x + sx * 15.5 * s + 3.3, v.z - 8 * s + 3.3, y + 21); }
  // dritte Etage, Seitenflügel mit Türmen, Springbrunnen, Hubschrauberlandeplatz, Tennisplatz
  box(10 * s, 4.5, 6 * s, IE.mat.white, -1.5 * s, 13.6, -4.5 * s, g); box(11 * s, 0.5, 7 * s, IE.mat.terracotta, -1.5 * s, 16.1, -4.5 * s, g);
  for (let k = -1; k <= 1; k++) box(2.2 * s, 2.8, 0.1, IE.mat.glass, k * 2.6 * s - 1.5 * s, 13.6, -1.45 * s, g);
  for (const sx of [-1, 1]) {
    box(6 * s, 9, 9 * s, IE.mat.white, sx * 13 * s, 4.5, -4 * s, g); box(6.6 * s, 0.5, 9.6 * s, IE.mat.terracotta, sx * 13 * s, 9.2, -4 * s, g);
    const tw = new T.Mesh(new T.CylinderGeometry(2.2 * s / 2, 2.2 * s / 2, 16, 16), IE.mat.white); tw.position.set(sx * 15.5 * s, 8, -8 * s); g.add(tw);
    const cap = new T.Mesh(new T.ConeGeometry(2.6 * s / 2, 5, 16), IE.mat.terracotta); cap.position.set(sx * 15.5 * s, 18.5, -8 * s); g.add(cap);
    for (let k = -1; k <= 1; k++) box(1.8 * s, 3, 0.1, IE.mat.glass, sx * 13 * s + k * 1.8 * s, 3, 0.55 * s, g);
  }
  const fb = new T.Mesh(new T.CylinderGeometry(3 * s / 2, 3.4 * s / 2, 0.8, 24), IE.mat.marble); fb.position.set(-7 * s, 0.4, 9 * s); g.add(fb);
  const fw = new T.Mesh(new T.CylinderGeometry(2.6 * s / 2, 2.6 * s / 2, 0.2, 24), new T.MeshStandardMaterial({ color: 0x3ec5e0, roughness: 0.1 })); fw.position.set(-7 * s, 0.85, 9 * s); g.add(fw);
  const fc = new T.Mesh(new T.CylinderGeometry(0.4, 0.6, 3, 10), IE.mat.marble); fc.position.set(-7 * s, 1.5, 9 * s); g.add(fc);
  const pad = new T.Mesh(new T.CylinderGeometry(7, 7, 0.3, 28), new T.MeshLambertMaterial({ color: 0x5a5c60 })); pad.position.set(16 * s, 0.2, 8 * s); g.add(pad);
  const hm = new T.Mesh(new T.PlaneGeometry(5, 6), new T.MeshBasicMaterial({ color: 0xf2f2ee })); hm.rotation.x = -Math.PI / 2; hm.position.set(16 * s, 0.37, 8 * s); g.add(hm);
  box(10, 0.1, 18, new T.MeshLambertMaterial({ color: 0x3a6fb0 }), -14 * s, 0.1, 7 * s, g); box(10, 1, 0.1, IE.mat.white, -14 * s, 0.5, 7 * s, g);
}
const villaSigns = {};
function buildVillas(scene) {
  const road = openPolyline(IE.villaRoad, 3); withDirs(road, false);
  IE.villaRoadPts = road;
  scene.add(new T.Mesh(ribbon(road, -4.5, 4.5, 0.12, false), new T.MeshLambertMaterial({ color: 0x46484c })));
  const wallMat = new T.MeshLambertMaterial({ color: 0xd9c8a3 });
  // Mauer talseitig entlang der Panoramastraße
  for (let i = 0; i < road.length; i += 3) { const p = road[i]; if (p.s < 150) continue; const x = p.x + p.dz * 5.2, z = p.z - p.dx * 5.2; const m = box(0.5, 1, 3.2, wallMat, x, IE.groundH(x, z) + 0.5, z, scene); m.rotation.y = Math.atan2(p.dx, p.dz); }
  const pal = (x, z, s) => { const y = IE.groundH(x, z), g = new T.Group(); g.position.set(x, y, z); scene.add(g);
    box(0.35, 6 * s, 0.35, new T.MeshLambertMaterial({ color: 0x7a5a3a }), 0, 3 * s, 0, g);
    for (let k = 0; k < 6; k++) { const l = box(0.4, 0.15, 3.2 * s, new T.MeshLambertMaterial({ color: 0x3f7a35 }), 0, 6 * s, 1.4 * s, null); const pv = new T.Group(); pv.position.y = 0; pv.rotation.y = k / 6 * Math.PI * 2; l.rotation.x = 0.35; pv.add(l); g.add(pv); } };
  const roofMat = new T.MeshLambertMaterial({ color: 0xb75a32 }), poolMat = new T.MeshStandardMaterial({ color: 0x3ec5e0, roughness: 0.1, metalness: 0.2 });
  for (const v of IE.villas) {
    const y = v.h !== undefined ? v.h : IE.villaRoadH + 1.5, s = v.s, g = new T.Group(); g.position.set(v.x, y, v.z); scene.add(g);
    if (v.mega) megaExtras(g, s, v, y);
    // Hauptgebäude: 2 Etagen + Dachterrasse, Front (Glas) Richtung Meer (+z)
    box(18 * s, 6, 10 * s, IE.mat.white, 0, 3, -3 * s, g);
    box(14 * s, 5, 8 * s, IE.mat.white, -1.5 * s, 8.5, -4 * s, g);
    box(19 * s, 0.5, 11 * s, roofMat, 0, 6.2, -3 * s, g); box(15 * s, 0.5, 9 * s, IE.mat.travertine, -1.5 * s, 11.2, -4 * s, g);
    for (const sx of [-1, 1]) box(0.3, 1, 9 * s, IE.mat.glass, -1.5 * s + sx * 7.4 * s, 12, -4 * s, g);
    box(15 * s, 1, 0.3, IE.mat.glass, -1.5 * s, 12, 0.4 * s, g);
    for (let k = -3; k <= 3; k++) box(2.1 * s, 3.6, 0.1, IE.mat.glass, k * 2.5 * s, 2.7, 2.05 * s, g);
    for (let k = -2; k <= 2; k++) box(2.2 * s, 3, 0.1, IE.mat.glass, k * 2.7 * s - 1.5 * s, 8.4, 0.05 * s, g);
    // Säulen + Balkon
    for (let k = -2; k <= 2; k++) box(0.5, 6, 0.5, IE.mat.marble, k * 4.2 * s, 3, 2.6 * s, g);
    box(18 * s, 0.4, 2 * s, IE.mat.marble, 0, 6.3, 3 * s, g);
    // Terrasse, Pool, Liegen
    box(20 * s, 0.3, 9 * s, IE.mat.travertine, 0, 0.15, 6.5 * s, g);
    box(10 * s, 0.25, 5 * s, poolMat, 3.5 * s, 0.25, 7 * s, g);
    for (let k = 0; k < 3; k++) box(0.9, 0.35, 2, IE.mat.white, -6 * s + k * 1.6, 0.45, 6.5 * s, g);
    for (const sx of [-1, 1]) box(0.4, 1.1, 9 * s, IE.mat.travertine, sx * 10 * s, 0.6, 6.5 * s, g);
    box(20 * s, 1.1, 0.4, IE.mat.travertine, 0, 0.6, 11 * s, g);
    // Garage
    box(7 * s, 3.5, 6 * s, IE.mat.white, 12 * s, 1.75, -4 * s, g); box(5 * s, 2.8, 0.1, IE.mat.dark, 12 * s, 1.4, -0.95 * s, g);
    // Tor mit Namensschild (zur Straße)
    const gz = v.side === 'n' ? 11.3 * s : -9.5 * s, gx = v.side === 'n' ? -6 * s : 4 * s;
    const st = textTex([], 512, 160, '#1b1b1b', '#d9b45a');
    const sm = new T.Mesh(new T.PlaneGeometry(4.2, 1.3), new T.MeshBasicMaterial({ map: st.t, side: T.DoubleSide })); sm.position.set(gx + 3, 1.9, gz); if (v.side !== 'n') sm.rotation.y = Math.PI; g.add(sm);
    box(0.6, 3, 0.6, IE.mat.travertine, gx - 2.2, 1.5, gz, g); box(0.6, 3, 0.6, IE.mat.travertine, gx + 2.2, 1.5, gz, g); box(5, 0.5, 0.6, IE.mat.travertine, gx, 3.2, gz, g);
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
    const { st, v } = villaSigns[id], g = st.g, own = S && (S.villas || []).includes(id);
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#d9b45a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 46px Georgia'; g.fillText(v.name, 256, 52);
    g.font = 'bold 34px Arial'; g.fillStyle = own ? '#48e07a' : '#f3ead8'; g.fillText(own ? 'DEINE VILLA' : 'ZU VERKAUFEN · ' + (v.price / 1e6).toLocaleString('de-DE') + ' Mio. €', 256, 116);
    st.t.needsUpdate = true;
  }
}
IE.drawVillaSigns = drawVillaSigns;

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
  try { buildTrack(scene); } catch (e) { console.error('Strecke', e); }
  try { buildVillas(scene); } catch (e) { console.error('Villen', e); }
  try { buildGas(scene); } catch (e) { console.error('Tankstellen', e); }
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
IE.backroomsSpot = { x: IE.track.x, z: IE.track.z }; // mitten im Innenfeld der Rennstrecke (die Stelle vom Foto)
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
  // geheimer gelber Fleck am Sprungpunkt
  const sp = IE.backroomsSpot, pm = new T.Mesh(new T.PlaneGeometry(2.4, 2.4), new T.MeshLambertMaterial({ color: 0xd6c56c, polygonOffset: true, polygonOffsetFactor: -3 }));
  pm.rotation.x = -Math.PI / 2; pm.position.set(sp.x, IE.groundH(sp.x, sp.z) + 0.05, sp.z); scene.add(pm);
}
function updateBackrooms(dt) {
  const g = G(), P = g.P, S = g.S;
  if (brChest) { const open = !!S.backroomsLoot; brChest.lid.rotation.x = open ? -1.1 : 0; brChest.lid.position.z = open ? -0.35 : 0; brChest.glow.visible = !open; }
  if (P.interior || P.veh || g.game.dead || P.fly) return;
  const sp = IE.backroomsSpot;
  if (P.vy > 4 && Math.hypot(P.pos.x - sp.x, P.pos.z - sp.z) < 2.2 && !updateBackrooms.cool) {
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
IE.moonOpen = () => Date.now() >= RK.launch;
function drawBoard() {
  if (!boardTex) return; const g = boardTex.g, open = IE.moonOpen();
  g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 1024, 360); g.strokeStyle = '#f2c230'; g.lineWidth = 8; g.strokeRect(8, 8, 1008, 344);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3ead8'; g.font = 'bold 54px Arial'; g.fillText('MISSIONE LUNA', 512, 70);
  g.fillStyle = open ? '#48e07a' : '#f2c230'; g.font = 'bold 110px Courier New, monospace'; g.fillText(fmtCD(RK.launch - Date.now()), 512, 185);
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
const _gh = IE.groundH, _isLand = IE.isLand;
IE.groundH = (x, z) => x > 9000 ? moonH(x, z) : _gh(x, z);
IE.isLand = (x, z) => x > 9000 ? true : _isLand(x, z);
let moonGems = [], stars = null, earth = null, moonRocket = null;
function buildMoon(scene) {
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
  IE.sky.visible = !on; g.scene.background = on ? new T.Color(0x02030a) : null;
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
function spawnRover() { const g = G(); for (const v of IE.vehicles) if (v.moonRover && !v.driver) v.removeMe = true; const v = IE.spawnCar(g.scene, 'rally', MOON.x - 18, MOON.z + 30, 0, { color: 0xf2f2ee }); v.moonRover = true; v.owned = true; v.def = Object.assign({}, v.def, { name: 'Mond-Rover', speed: 32, kind: 'suv' }); }
function updateMoon(dt) {
  const g = G(), P = g.P, S = g.S;
  if ((performance.now() / 1000 | 0) !== updateMoon.sec) { updateMoon.sec = performance.now() / 1000 | 0; drawBoard(); }
  // Auf dem Mond? (z. B. nach Teleport/Laden)
  const onM = (P.veh ? P.veh.pos.x : P.pos.x) > 9000;
  if (onM !== IE.onMoon && stars) setMoon(onM);
  if (!IE.onMoon) return;
  stars.position.copy(g.camera.position); earth.position.set(g.camera.position.x - 2500, g.camera.position.y + 3200, g.camera.position.z - 4200);
  S.moonGems = S.moonGems || [];
  for (const m of moonGems) {
    const got = S.moonGems.includes(m.id); m.gem.visible = m.beam.visible = !got; if (got) continue;
    m.gem.rotation.y += dt * 2; m.gem.position.y = m.y + 2 + Math.sin(performance.now() / 400) * 0.4;
    const pp = P.veh ? P.veh.pos : P.pos;
    if (Math.hypot(pp.x - m.x, pp.z - m.z) < 4) { S.moonGems.push(m.id); g.addMoney(2000000, true); g.sfx('cash'); g.banner('Mondstein gefunden', S.moonGems.length + ' / 12', '+ ' + g.fmt(2000000), 3); g.saveGame(); }
  }
}

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
function buyVilla(v) {
  const g = G(), S = g.S;
  xModal('villa', v.name, [
    { name: v.name, stat: (v.mega ? 'Riesige Luxusvilla mit Türmen, Pool, Springbrunnen, Helipad & Tennisplatz' : 'Panorama-Villa über dem Golf von Neapel · Pool & Terrasse') + ' · gehört dir für immer', btns: [{ label: 'Kaufen · ' + g.fmt(v.price), buy: true, off: S.money < v.price, fn: () => {
      if (S.money < v.price) return; S.money -= v.price; S.villas = (S.villas || []).concat(v.id); g.sfx('cash'); g.saveGame(); drawVillaSigns(); g.closeModals();
      g.banner('Villa gekauft', v.name, 'Hier wachst du ab jetzt nach einem Krankenhaus-Besuch auf', 5); } }] },
  ], S.money < v.price ? 'Dir fehlen noch ' + g.fmt(v.price - S.money) + '.' : 'Nach dem Kauf: E am Tor = Villa betreten. Drinnen kannst du dich ausruhen (Gesundheit voll + speichern).');
}
const SELL_RATE = 0.7; // Verkauf: 70 % vom Kaufpreis
function villaMenu(v) {
  const g = G(), S = g.S, P = g.P, sell = Math.round(v.price * SELL_RATE);
  xModal('villa', v.name, [
    { name: 'Villa betreten', stat: 'Drinnen kannst du dich ausruhen (Gesundheit voll + speichern)', btns: [{ label: 'Betreten', buy: true, fn: () => { g.closeModals(); g.enterInterior('villa', v.gate.x, v.gate.z, null); if (P.interior) { P.interior.villa = v; g.toast(v.name, 2); } } }] },
    { name: 'Villa verkaufen', stat: 'Du bekommst ' + g.fmt(sell) + ' (70 % vom Kaufpreis ' + g.fmt(v.price) + ')', btns: [{ label: 'Verkaufen · ' + g.fmt(sell), fn: () => {
      xModal('villa', v.name + ' verkaufen?', [{ name: 'Wirklich verkaufen?', stat: 'Die Villa gehört dir danach nicht mehr. Du bekommst ' + g.fmt(sell) + '.', btns: [
        { label: 'Ja, verkaufen', buy: true, fn: () => { if (!(S.villas || []).includes(v.id)) return; S.villas = S.villas.filter(id => id !== v.id); S.money += sell; g.sfx('cash'); g.saveGame(); drawVillaSigns(); g.closeModals(); g.banner('Villa verkauft', v.name, '+ ' + g.fmt(sell), 4); } },
        { label: 'Abbrechen', fn: () => villaMenu(v) }] }]);
    } }] }
  ]);
}
IE.villaHome = function (pos) {
  const S = G().S, own = IE.villas.filter(v => (S.villas || []).includes(v.id) && v.gate); if (!own.length) return null;
  own.sort((a, b) => Math.hypot(a.x - pos.x, a.z - pos.z) - Math.hypot(b.x - pos.x, b.z - pos.z)); return own[0];
};


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
  for (const c of cars) rows.push({ name: '🚗 ' + c.name, stat: 'Auto · ' + Math.round(c.speed * 3.6) + ' km/h', btns: [{ label: 'Herholen', buy: true, fn: () => deliver('car', c.id) }] });
  for (const h of helis) rows.push({ name: '🚁 ' + h.name, stat: 'Helikopter', btns: [{ label: 'Herholen', buy: true, fn: () => deliver('heli', h.id) }] });
  for (const p of planes) rows.push({ name: '✈ ' + p.name, stat: 'Flugzeug', btns: [{ label: 'Am Boden', fn: () => deliver('plane', p.id, false) }, { label: 'In der Luft', buy: true, fn: () => deliver('plane', p.id, true) }] });
  for (const b of boats) rows.push({ name: '⛵ ' + b.name, stat: 'Boot · kommt ins nächste Wasser', btns: [{ label: 'Herholen', buy: true, fn: () => deliver('boat', b.id) }] });
  if (!rows.length) rows.push({ name: 'Noch keine Fahrzeuge', stat: 'Kauf dir Autos, Helikopter, Boote oder Flugzeuge in den Läden – dann kannst du sie hier überall herholen.' });
  rows.push({ name: '🏁 Schnellreise zur Rennstrecke', stat: 'Autodromo dell\'Adriatico · € 2.000', btns: [{ label: 'Hinreisen', off: S.money < 2000, fn: () => { if (R && R.state !== 'lobby') return; S.money -= 2000; g.closeModals(); const sp = IE.raceStart; g.teleportTo(sp.x + 18, IE.groundH(sp.x, sp.z), sp.z + 18); } }] });
  for (const v of IE.villas.filter(v => (S.villas || []).includes(v.id))) rows.push({ name: '⌂ Nach Hause: ' + v.name, stat: 'kostenlos', btns: [{ label: 'Hinreisen', fn: () => { g.closeModals(); g.teleportTo(v.gate.x, v.y, v.gate.z); } }] });
  xModal('garage', 'Meine Fahrzeuge', rows, 'Gekaufte Fahrzeuge werden direkt zu dir gebracht. Ein vorher hergeholtes Exemplar verschwindet dabei.');
}
IE.openGarage = openGarage;
function wireGarage() {
  const b3 = $('pSecurity'); if (b3) b3.addEventListener('click', () => { if (G() && G().game.state === 'play') openSecurity(); });
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
IE.extraPrompt = function () {
  const g = G(), P = g.P; if (!g) return '';
  if (launch) return '';
  if (P.interior) { const it = P.interior.it; if (it.type === 'backrooms' && Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 3.2) return g.S.backroomsLoot ? 'Die Truhe ist leer …' : '<b>E</b> · Truhe öffnen'; if (it.type === 'villa' && P.interior.villa && Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 4) return '<b>E</b> · Ausruhen (Gesundheit voll + speichern)'; return ''; }
  if (!P.veh && rocket && Math.hypot(P.pos.x - RK.x, P.pos.z - RK.z) < 30) return IE.moonOpen() ? '<b>E</b> · Mit der Rakete zum Mond fliegen' : 'Mondrakete · Start in ' + fmtCD(RK.launch - Date.now());
  if (!P.veh && IE.onMoon && Math.hypot(P.pos.x - MOON.x, P.pos.z - MOON.z) < 16) return '<b>E</b> · Zurück zur Erde fliegen';
  if (P.veh && P.veh.type === 'car' && IE.raceStart && Math.hypot(P.veh.pos.x - IE.raceStart.x, P.veh.pos.z - IE.raceStart.z) < 16 && (!R || R.state === 'lobby')) return '<b>E</b> · Rennen fahren / Spieler einladen';
  { const hv = hangarSaveTarget(); if (hv) return `<b>E</b> · ${hv.def.name} im Hangar speichern`; }
  if (R && R.state === 'lobby' && R.host) return '';
  if (!P.veh) {
    if (rob) return '';
    const s = nearGas(P.pos); if (s) { if (g.game.time < s.cool) return 'Die Kasse ist noch leer – komm später wieder'; return g.S.cur && g.S.cur !== 'faust' ? '<b>E</b> · Tankstelle überfallen' : 'Mit einer Waffe kannst du die Tankstelle überfallen'; }
    const v = nearVilla(P.pos); if (v) return (g.S.villas || []).includes(v.id) ? `<b>E</b> · ${v.name} (betreten / verkaufen)` : `<b>E</b> · ${v.name} kaufen · ${g.fmt(v.price)}`;
  }
  return '';
};
IE.extraAct = function () {
  const g = G(), P = g.P;
  if (launch) return true;
  if (P.interior && P.interior.it.type === 'backrooms' && Math.hypot(P.pos.x - P.interior.it.item.x, P.pos.z - P.interior.it.item.z) < 3.2) { if (!g.S.backroomsLoot) { g.S.backroomsLoot = true; g.addMoney(100000000, true); g.sfx('cash'); g.banner('JACKPOT', 'Die Truhe der Backrooms', '+ ' + g.fmt(100000000), 6); g.saveGame(true); } return true; }
  if (!P.veh && !P.interior && rocket && Math.hypot(P.pos.x - RK.x, P.pos.z - RK.z) < 30) { if (IE.moonOpen()) startLaunch(true); else g.toast('Die Rakete startet am 25. November um 16:00 Uhr', 3); return true; }
  if (!P.veh && IE.onMoon && Math.hypot(P.pos.x - MOON.x, P.pos.z - MOON.z) < 16) { startLaunch(false); return true; }
  if (P.interior) { const it = P.interior.it; if (it.type === 'villa' && P.interior.villa && Math.hypot(P.pos.x - it.item.x, P.pos.z - it.item.z) < 4) { P.health = Math.max(P.health, g.maxHP()); g.saveGame(); g.toast('Ausgeruht · Spiel gespeichert', 2.5); g.sfx('pass'); return true; } return false; }
  if (P.veh && P.veh.type === 'car' && IE.raceStart && Math.hypot(P.veh.pos.x - IE.raceStart.x, P.veh.pos.z - IE.raceStart.z) < 16 && (!R || R.state === 'lobby')) {
    if (g.mission.active) { g.toast('Erst die Mission beenden', 2); return true; }
    if (P.veh.speed > 6) { g.toast('Halte an, um das Rennmenü zu öffnen', 2); return true; }
    openRaceMenu(); return true;
  }
  { const hv = hangarSaveTarget(); if (hv) { (hv.type === 'plane' ? g.S.planes : g.S.helis).push(hv.def.id); hv.owned = true; g.saveGame(); g.sfx('pass'); g.banner('Im Hangar gespeichert', hv.def.name, 'Ab jetzt kannst du ihn jederzeit spawnen – im Hangar oder über „Meine Fahrzeuge“', 4); return true; } }
  if (!P.veh) {
    const s = nearGas(P.pos);
    if (s) { if (g.game.time >= s.cool && g.S.cur && g.S.cur !== 'faust' && !rob) { rob = { s, t: 0 }; g.setWanted(Math.max(g.game.wanted, 2)); g.toast('Hände hoch! Das ist ein Überfall!', 2.5); g.sfx('shot', 0.6); } return true; }
    const v = nearVilla(P.pos);
    if (v) { if ((g.S.villas || []).includes(v.id)) villaMenu(v); else buyVilla(v); return true; }
  }
  return false;
};
function bizTick(dt) {
  const g = G(), S = g.S; if (!S.biz || g.game.state !== 'play') return;
  for (const s of IE.shops) { if (s.type !== 'biz') continue; const b = S.biz[s.id]; if (!b) continue; const D = IE.bizDefs[s.biz], inc = D.inc * (1 + 0.5 * (b.lv - 1)); b.cash = Math.min(inc * 120, (b.cash || 0) + inc / 60 * dt); }
}
IE.extraUpdate = function (dt) {
  bizTick(dt); guardManager(dt); updateBackrooms(dt); updateMoon(dt); updateLaunch(dt);
  if (IE.raceBeam) IE.raceBeam.visible = !R;
  updateRace(dt); updateRob(dt);
};
IE.mapBase = function (g, s, x0, z0) {
  if (IE.trackPts) { g.strokeStyle = '#2b2d31'; g.lineWidth = 3; g.beginPath(); IE.trackPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
  if (IE.trackRoadPts) { g.strokeStyle = '#f2d36b'; g.lineWidth = 2; g.beginPath(); IE.trackRoadPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  if (IE.villaRoadPts) { g.strokeStyle = '#f2d36b'; g.lineWidth = 2; g.beginPath(); IE.villaRoadPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
};
IE.mapPOIs = function () {
  const S = G() && G().S, out = [];
  if (IE.raceStart) out.push({ x: IE.raceStart.x, z: IE.raceStart.z, kind: 'race', label: 'Rennstrecke' });
  out.push({ x: RK.x, z: RK.z, kind: 'rocket', label: 'Mondrakete' });
  for (const v of IE.villas) out.push({ x: v.x, z: v.z, kind: S && (S.villas || []).includes(v.id) ? 'villaOwn' : 'villa' });
  for (const s of gas) out.push({ x: s.x, z: s.z, kind: 'gas' });
  return out;
};
})();
