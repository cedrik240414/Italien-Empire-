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
const TW = 9.5; // halbe Streckenbreite
const loops = []; IE.loops = loops;
function buildTrack(scene) {
  const pts = catmull(LOCAL.map(p => [TR.x + p[0], TR.z + p[1]]), 3);
  // Start = Punkt auf der Zielgeraden nahe lokal x=0
  let si = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - TR.x, p.z - (TR.z - 165)); if (d < bd) { bd = d; si = i; } });
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
    let li = 0, ld = 1e9; rot.forEach((p, i) => { const d = Math.hypot(p.x - (TR.x + lx), p.z - (TR.z + 170)); if (d < ld) { ld = d; li = i; } });
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
    const y = IE.villaRoadH + 1.5, s = v.big ? 1.3 : 1, g = new T.Group(); g.position.set(v.x, y, v.z); scene.add(g);
    // Hauptgebäude (zur Straße/zum Meer = +z)
    box(18 * s, 6, 10 * s, IE.mat.white, 0, 3, -3 * s, g); box(12 * s, 5, 8 * s, IE.mat.white, -2 * s, 8.5, -4 * s, g);
    box(19 * s, 0.5, 11 * s, roofMat, 0, 6.2, -3 * s, g); box(13 * s, 0.5, 9 * s, roofMat, -2 * s, 11.2, -4 * s, g);
    for (let k = -3; k <= 3; k++) box(1.6, 2.6, 0.1, IE.mat.glass, k * 2.4 * s, 2.6, 2.05 * s, g);
    for (let k = -2; k <= 1; k++) box(1.5, 2.2, 0.1, IE.mat.glass, k * 2.6 * s - 1 * s, 8.4, 0.05 * s, g);
    // Terrasse + Pool
    box(18 * s, 0.3, 8 * s, IE.mat.travertine, 0, 0.15, 6 * s, g);
    box(9 * s, 0.25, 4.5 * s, poolMat, 3 * s, 0.25, 6.5 * s, g);
    for (const sx of [-1, 1]) box(0.4, 1.1, 8 * s, IE.mat.travertine, sx * 9 * s, 0.6, 6 * s, g);
    box(18 * s, 1.1, 0.4, IE.mat.travertine, -4 * s, 0.6, 10 * s, g);
    // Tor mit Namensschild
    const st = textTex([{ t: v.name, f: 'bold 46px Georgia' }, { t: G() ? '' : '', f: 'bold 34px Arial' }], 512, 160, '#1b1b1b', '#d9b45a');
    const sm = new T.Mesh(new T.PlaneGeometry(4.2, 1.3), new T.MeshBasicMaterial({ map: st.t })); sm.position.set(6 * s, 1.8, 10.25 * s); g.add(sm);
    box(0.5, 2.6, 0.5, IE.mat.travertine, 3.6 * s, 1.3, 10 * s, g); box(0.5, 2.6, 0.5, IE.mat.travertine, 8.6 * s, 1.3, 10 * s, g);
    villaSigns[v.id] = { st, v };
    pal(v.x - 10 * s, v.z + 9 * s, 1); pal(v.x + 10 * s, v.z + 9 * s, 1.1);
    IE.addBox(v.x - 9 * s, v.z - 8 * s, v.x + 9 * s, v.z + 2 * s, y + 12);
    v.gate = { x: v.x + 6 * s, z: v.z + 12 * s }; v.y = y;
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

IE.buildExtras = function (scene) {
  try { buildTrack(scene); } catch (e) { console.error('Strecke', e); }
  try { buildVillas(scene); } catch (e) { console.error('Villen', e); }
  try { buildGas(scene); } catch (e) { console.error('Tankstellen', e); }
};

// ================= SPIELLOGIK =================
let R = null; // aktuelles Rennen
let rob = null; // laufender Überfall
const ONL = () => window.IEonline && IEonline.active;
const myName = () => (window.IEaccount && IEaccount.nick) || 'Du';
const fmtT = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const PRIZE = [60000, 30000, 15000, 7500];

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
  const place = R.finRank, prize = PRIZE[Math.min(place - 1, 3)] * (R.solo ? 0.5 : 1);
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
  rows.push({ name: 'Solo-Rennen', stat: 'Gegen 3 KI-Fahrer · Preisgeld bis ' + g.fmt(PRIZE[0] / 2), btns: [{ label: 'Starten', buy: true, fn: () => { g.closeModals(); if (R) endRace(); startSolo(menuLaps); } }] });
  if (ONL()) {
    const peers = [...IEonline.peers.values()].filter(r => r.pr && typeof r.pr.x === 'number');
    if (R && R.host && R.state === 'lobby') {
      rows.push({ name: 'Mitspieler-Rennen', stat: (R.joined && R.joined.length ? 'Dabei: ' + R.joined.join(', ') : 'Noch niemand hat angenommen') + ' · Preisgeld bis ' + g.fmt(PRIZE[0]),
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
function nearVilla(pos) { for (const v of IE.villas) if (v.gate && Math.hypot(pos.x - v.gate.x, pos.z - v.gate.z) < 6) return v; return null; }
function buyVilla(v) {
  const g = G(), S = g.S;
  xModal('villa', v.name, [
    { name: v.name, stat: 'Panorama-Villa über dem Golf von Neapel · Pool & Terrasse · gehört dir für immer', btns: [{ label: 'Kaufen · ' + g.fmt(v.price), buy: true, off: S.money < v.price, fn: () => {
      if (S.money < v.price) return; S.money -= v.price; S.villas = (S.villas || []).concat(v.id); g.sfx('cash'); g.saveGame(); drawVillaSigns(); g.closeModals();
      g.banner('Villa gekauft', v.name, 'Hier wachst du ab jetzt nach einem Krankenhaus-Besuch auf', 5); } }] },
  ], S.money < v.price ? 'Dir fehlen noch ' + g.fmt(v.price - S.money) + '.' : 'Nach dem Kauf: E am Tor = ausruhen (Gesundheit voll + speichern).');
}
IE.villaHome = function (pos) {
  const S = G().S, own = IE.villas.filter(v => (S.villas || []).includes(v.id) && v.gate); if (!own.length) return null;
  own.sort((a, b) => Math.hypot(a.x - pos.x, a.z - pos.z) - Math.hypot(b.x - pos.x, b.z - pos.z)); return own[0];
};

// ----- Hooks für main.js -----
IE.extraPrompt = function () {
  const g = G(), P = g.P; if (!g || P.interior) return '';
  if (P.veh && P.veh.type === 'car' && IE.raceStart && Math.hypot(P.veh.pos.x - IE.raceStart.x, P.veh.pos.z - IE.raceStart.z) < 16 && (!R || R.state === 'lobby')) return '<b>E</b> · Rennen fahren / Spieler einladen';
  if (R && R.state === 'lobby' && R.host) return '';
  if (!P.veh) {
    if (rob) return '';
    const s = nearGas(P.pos); if (s) { if (g.game.time < s.cool) return 'Die Kasse ist noch leer – komm später wieder'; return g.S.cur && g.S.cur !== 'faust' ? '<b>E</b> · Tankstelle überfallen' : 'Mit einer Waffe kannst du die Tankstelle überfallen'; }
    const v = nearVilla(P.pos); if (v) return (g.S.villas || []).includes(v.id) ? `<b>E</b> · In der ${v.name} ausruhen` : `<b>E</b> · ${v.name} kaufen · ${g.fmt(v.price)}`;
  }
  return '';
};
IE.extraAct = function () {
  const g = G(), P = g.P; if (P.interior) return false;
  if (P.veh && P.veh.type === 'car' && IE.raceStart && Math.hypot(P.veh.pos.x - IE.raceStart.x, P.veh.pos.z - IE.raceStart.z) < 16 && (!R || R.state === 'lobby')) {
    if (g.mission.active) { g.toast('Erst die Mission beenden', 2); return true; }
    if (P.veh.speed > 6) { g.toast('Halte an, um das Rennmenü zu öffnen', 2); return true; }
    openRaceMenu(); return true;
  }
  if (!P.veh) {
    const s = nearGas(P.pos);
    if (s) { if (g.game.time >= s.cool && g.S.cur && g.S.cur !== 'faust' && !rob) { rob = { s, t: 0 }; g.setWanted(Math.max(g.game.wanted, 2)); g.toast('Hände hoch! Das ist ein Überfall!', 2.5); g.sfx('shot', 0.6); } return true; }
    const v = nearVilla(P.pos);
    if (v) { if ((g.S.villas || []).includes(v.id)) { P.health = Math.max(P.health, g.maxHP()); g.saveGame(); g.toast('Ausgeruht · Spiel gespeichert', 2.5); g.sfx('pass'); } else buyVilla(v); return true; }
  }
  return false;
};
IE.extraUpdate = function (dt) {
  if (IE.raceBeam) IE.raceBeam.visible = !R;
  updateRace(dt); updateRob(dt);
};
IE.mapBase = function (g, s, x0, z0) {
  if (IE.trackPts) { g.strokeStyle = '#2b2d31'; g.lineWidth = 3; g.beginPath(); IE.trackPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
  if (IE.villaRoadPts) { g.strokeStyle = '#f2d36b'; g.lineWidth = 2; g.beginPath(); IE.villaRoadPts.forEach((p, i) => { const x = (p.x - x0) * s, y = (p.z - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
};
IE.mapPOIs = function () {
  const S = G() && G().S, out = [];
  if (IE.raceStart) out.push({ x: IE.raceStart.x, z: IE.raceStart.z, kind: 'race', label: 'Rennstrecke' });
  for (const v of IE.villas) out.push({ x: v.x, z: v.z, kind: S && (S.villas || []).includes(v.id) ? 'villaOwn' : 'villa' });
  for (const s of gas) out.push({ x: s.x, z: s.z, kind: 'gas' });
  return out;
};
})();
