// ===== ITALIEN EMPIRE – Welt: Terrain, Meer, Himmel, Straßen, Städte, Wahrzeichen =====
'use strict';
(function () {
const T = THREE;

// ---------- Rauschen ----------
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < (o || 4); i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
function ridged(x, y) { let s = 0, a = 0.55, f = 1; for (let i = 0; i < 4; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)); f *= 2.1; a *= 0.5; } return s; }
IE.fbm = fbm; IE.hash = hash;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
IE.smooth = smooth;
let seed = 1337; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
IE.rnd = rnd;

// ---------- Geometrie-Helfer ----------
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  let t = l > 0 ? ((px - ax) * dx + (pz - az) * dz) / l : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t - px, z = az + dz * t - pz; return Math.sqrt(x * x + z * z);
}
function inPoly(x, z, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) ins = !ins;
  }
  return ins;
}
function coastSigned(x, z) {
  let best = 1e9, inside = false;
  for (const k in IE.coast) {
    const p = IE.coast[k];
    if (inPoly(x, z, p)) inside = true;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const d = segDist(x, z, p[j].x, p[j].z, p[i].x, p[i].z); if (d < best) best = d;
    }
  }
  return inside ? best : -best;
}
IE.coastSigned = coastSigned;
IE.smooth = smooth; IE.rawH = (x, z) => rawH(x, z);
IE.isLandPoly = (x, z) => { for (const k in IE.coast) if (inPoly(x, z, IE.coast[k])) return true; return false; };

// ---------- Höhenraster ----------
const G = IE.grid = { x0: -2150, z0: -2350, w: 4300, d: 4750, nx: 370, nz: 410 };
G.cx = G.w / G.nx; G.cz = G.d / G.nz;
const NV = (G.nx + 1) * (G.nz + 1);
const H = G.h = new Float32Array(NV);
const DECK = G.deck = new Float32Array(NV).fill(-999);
const RMASK = G.rmask = new Uint8Array(NV);

const ridgeW = IE.ridges.map(r => ({ h: r.h, w: r.w, pts: r.pts.map(p => IE.geo(p[0], p[1])) }));
const volc = IE.volcanoes.map(v => { const p = IE.geo(v.lon, v.lat); return { x: p.x, z: p.z, h: v.h, r: v.r }; });

function continent(x, z) {
  const lon = x / (IE.K * IE.LONS) + 12.5, lat = 42 - z / IE.K;
  return lat > 45.85 || (lon < 7.55 && lat > 43.8) || (lon > 13.65 && lat > 45.55);
}
function zoneFlat(x, z, h, seaOnly) {
  for (const b of IE.flatZones) { if (seaOnly && !b.sea) continue; const F = b.f || 140, d = Math.max(Math.abs(x - b.x) - b.hw, Math.abs(z - b.z) - b.hd, 0);
    if (d < F) h = h + (b.h - h) * smooth(F, Math.min(10, F * 0.3), d); }
  return h;
}
function baseHeight(x, z) {
  let sd = coastSigned(x, z);
  if (sd < 0 && continent(x, z)) sd = 120 - sd;
  if (sd < 0) return zoneFlat(x, z, Math.max(-38, -1.5 + sd * 0.09), true);
  const ramp = smooth(0, 70, sd);
  let h = 0.6 + Math.min(sd * 0.012, 9) + fbm(x * 0.004, z * 0.004) * 28 * smooth(20, 400, sd);
  for (const r of ridgeW) {
    let d = 1e9; for (let i = 1; i < r.pts.length; i++) d = Math.min(d, segDist(x, z, r.pts[i - 1].x, r.pts[i - 1].z, r.pts[i].x, r.pts[i].z));
    if (d < r.w * 2.6) {
      const f = Math.exp(-(d * d) / (r.w * r.w));
      h += r.h * f * (0.35 + 0.95 * ridged(x * 0.006 + 7, z * 0.006 + 3));
    }
  }
  for (const v of volc) {
    const d = Math.hypot(x - v.x, z - v.z);
    if (d < v.r) { const t = 1 - d / v.r; h += v.h * Math.pow(t, 1.4) - (d < v.r * 0.08 ? (v.r * 0.08 - d) * 0.9 : 0); }
  }
  h *= 0.25 + 0.75 * ramp;
  for (const c of IE.cities) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.r + 150) { const t = smooth(c.r + 150, c.r + 15, d); h = h + (c.base - h) * t; }
  }
  return zoneFlat(x, z, h);
}

function rawH(x, z) {
  let fx = (x - G.x0) / G.cx, fz = (z - G.z0) / G.cz;
  fx = Math.max(0, Math.min(G.nx - 0.001, fx)); fz = Math.max(0, Math.min(G.nz - 0.001, fz));
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * (G.nx + 1) + ix;
  const a = H[i], b = H[i + 1], c = H[i + G.nx + 1], d = H[i + G.nx + 2];
  // gleiche Dreiecksaufteilung wie das Mesh
  if (tx + tz < 1) return a + (b - a) * tx + (c - a) * tz;
  return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}
IE.terrainH = rawH;

IE.initTerrain = function () {
const t0 = performance.now();
for (let iz = 0; iz <= G.nz; iz++) for (let ix = 0; ix <= G.nx; ix++) {
  H[iz * (G.nx + 1) + ix] = baseHeight(G.x0 + ix * G.cx, G.z0 + iz * G.cz);
}



// ---------- Straßen ----------
IE.roads = [];
function chaikin(pts, it) {
  for (let k = 0; k < it; k++) {
    const o = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      o.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 });
    }
    o.push(pts[pts.length - 1]); pts = o;
  }
  return pts;
}
for (const rd of IE.roadDefs) {
  const A = IE.cityById[rd[0]], B = IE.cityById[rd[1]];
  let ctrl = [{ x: A.x, z: A.z }].concat((rd[2] || []).map(p => IE.geo(p[0], p[1]))).concat([{ x: B.x, z: B.z }]);
  ctrl = chaikin(ctrl, 3);
  const pts = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const a = ctrl[i], b = ctrl[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 4));
    for (let k = 0; k < n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n });
  }
  pts.push({ x: B.x, z: B.z });
  let hs = pts.map(p => Math.max(1.6, rawH(p.x, p.z)));
  for (let pass = 0; pass < 3; pass++) {
    const o = hs.slice(), W = 30;
    for (let i = 0; i < hs.length; i++) { let s = 0, n = 0; for (let k = -W; k <= W; k++) { const j = i + k; if (j >= 0 && j < hs.length) { s += hs[j]; n++; } } o[i] = s / n; }
    hs = o;
  }
  pts.forEach((p, i) => p.y = zoneFlat(p.x, p.z, hs[i]));
  IE.roads.push({ a: A, b: B, pts });
}
const RW = new Float32Array(NV), RH = new Float32Array(NV);
for (const r of IE.roads) for (const p of r.pts) {
  const ix0 = Math.floor((p.x - 26 - G.x0) / G.cx), ix1 = Math.ceil((p.x + 26 - G.x0) / G.cx);
  const iz0 = Math.floor((p.z - 26 - G.z0) / G.cz), iz1 = Math.ceil((p.z + 26 - G.z0) / G.cz);
  for (let iz = Math.max(0, iz0); iz <= Math.min(G.nz, iz1); iz++) for (let ix = Math.max(0, ix0); ix <= Math.min(G.nx, ix1); ix++) {
    const vx = G.x0 + ix * G.cx, vz = G.z0 + iz * G.cz, d = Math.hypot(vx - p.x, vz - p.z), i = iz * (G.nx + 1) + ix;
    const w = d < 9 ? 1 : smooth(28, 9, d);
    if (w > RW[i]) { RW[i] = w; RH[i] = p.y; }
    if (d < 10) { DECK[i] = Math.max(DECK[i], p.y); RMASK[i] = 1; }
  }
}
for (let i = 0; i < NV; i++) if (RW[i] > 0 && H[i] > -0.6) H[i] = H[i] + (RH[i] - 0.45 - H[i]) * RW[i];
for (let iz = 0; iz <= G.nz; iz++) for (let ix = 0; ix <= G.nx; ix++) { const i = iz * (G.nx + 1) + ix; H[i] = zoneFlat(G.x0 + ix * G.cx, G.z0 + iz * G.cz, H[i], H[i] <= -0.6); }

};

// Boden inkl. Brücken
IE.groundH = function (x, z) {
  const h = rawH(x, z);
  let fx = (x - G.x0) / G.cx, fz = (z - G.z0) / G.cz;
  const ix = Math.round(fx), iz = Math.round(fz);
  if (ix < 0 || iz < 0 || ix > G.nx || iz > G.nz) return h;
  const dk = DECK[iz * (G.nx + 1) + ix];
  if (dk > h + 0.5) return dk + 0.1;
  return h;
};
IE.nearRoad = function (x, z) {
  const ix = Math.round((x - G.x0) / G.cx), iz = Math.round((z - G.z0) / G.cz);
  if (ix < 0 || iz < 0 || ix > G.nx || iz > G.nz) return false; return RMASK[iz * (G.nx + 1) + ix] === 1;
};
IE.isLand = (x, z) => rawH(x, z) > 0.7;
IE.snapLand = function (x, z, cx, cz) {
  if (IE.isLand(x, z)) return { x, z };
  // in Richtung Stadtzentrum / spiralförmig nach Land suchen
  for (let r = 6; r < 400; r += 6) for (let a = 0; a < 16; a++) {
    const ang = a / 16 * Math.PI * 2, px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
    if (rawH(px, pz) > 1.2) return { x: px, z: pz };
  }
  return { x: cx, z: cz };
};

// ---------- Kollision ----------
const COLL = IE.coll = { cell: 32, map: new Map() };
function ckey(ix, iz) { return ix * 100003 + iz; }
IE.addBox = function (minx, minz, maxx, maxz, top, bottom) {
  const b = { t: 'box', minx, minz, maxx, maxz, top, bottom: bottom || -50 };
  for (let ix = Math.floor(minx / COLL.cell); ix <= Math.floor(maxx / COLL.cell); ix++)
    for (let iz = Math.floor(minz / COLL.cell); iz <= Math.floor(maxz / COLL.cell); iz++) {
      const k = ckey(ix, iz); if (!COLL.map.has(k)) COLL.map.set(k, []); COLL.map.get(k).push(b);
    }
  return b;
};
IE.addRing = function (x, z, r0, r1, top, gap) {
  const b = { t: 'ring', x, z, r0, r1, top, gap: gap || 0, bottom: -50 };
  for (let ix = Math.floor((x - r1) / COLL.cell); ix <= Math.floor((x + r1) / COLL.cell); ix++)
    for (let iz = Math.floor((z - r1) / COLL.cell); iz <= Math.floor((z + r1) / COLL.cell); iz++) {
      const k = ckey(ix, iz); if (!COLL.map.has(k)) COLL.map.set(k, []); COLL.map.get(k).push(b);
    }
};
IE.collAt = function (x, z) { return COLL.map.get(ckey(Math.floor(x / COLL.cell), Math.floor(z / COLL.cell))) || []; };
// Kreis gegen Kollider schieben. Gibt true zurück bei Treffer.
IE.pushOut = function (pos, rad, y, height) {
  let hit = false; const list = IE.collAt(pos.x, pos.z);
  for (const b of list) {
    if (b.online && !IE.onlineOn) continue;
    if (y > b.top - 0.3 || y + (height || 1.8) < b.bottom) continue;
    if (b.t === 'box') {
      const cx = Math.max(b.minx, Math.min(b.maxx, pos.x)), cz = Math.max(b.minz, Math.min(b.maxz, pos.z));
      let dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) {
        if (d2 < 1e-6) { // innen: zur nächsten Seite schieben
          const l = pos.x - b.minx, r = b.maxx - pos.x, f = pos.z - b.minz, k = b.maxz - pos.z, m = Math.min(l, r, f, k);
          if (m === l) pos.x = b.minx - rad; else if (m === r) pos.x = b.maxx + rad; else if (m === f) pos.z = b.minz - rad; else pos.z = b.maxz + rad;
        } else { const d = Math.sqrt(d2); pos.x = cx + dx / d * rad; pos.z = cz + dz / d * rad; }
        hit = true;
      }
    } else {
      const dx = pos.x - b.x, dz = pos.z - b.z, d = Math.hypot(dx, dz) || 0.001;
      if (b.gap && Math.abs(dz) < b.gap) continue; // Eingang
      if (d > b.r0 - rad && d < b.r1 + rad) {
        const mid = (b.r0 + b.r1) / 2, nd = d < mid ? b.r0 - rad : b.r1 + rad;
        pos.x = b.x + dx / d * nd; pos.z = b.z + dz / d * nd; hit = true;
      }
    }
  }
  return hit;
};
// Höchste begehbare Fläche unter y (Dächer, Plattformen)
IE.supportH = function (x, z, y) {
  let g = IE.groundH(x, z);
  for (const b of IE.collAt(x, z)) {
    if (b.t !== 'box' || b.top > y + 0.6 || b.top <= g || (b.online && !IE.onlineOn)) continue;
    if (x >= b.minx && x <= b.maxx && z >= b.minz && z <= b.maxz) g = b.top;
  }
  return g;
};
// Strahl gegen Boxen (für Schüsse)
IE.rayBoxes = function (o, d, maxD) {
  let best = maxD; const step = 16;
  const seen = new Set();
  for (let s = 0; s < maxD; s += step) {
    const x = o.x + d.x * s, z = o.z + d.z * s;
    for (const b of IE.collAt(x, z)) {
      if (seen.has(b) || b.t !== 'box' || (b.online && !IE.onlineOn)) continue; seen.add(b);
      let tmin = 0, tmax = best;
      const ax = [['x', b.minx, b.maxx], ['y', b.bottom, b.top], ['z', b.minz, b.maxz]];
      let ok = true;
      for (const [k, mn, mx] of ax) {
        if (Math.abs(d[k]) < 1e-8) { if (o[k] < mn || o[k] > mx) { ok = false; break; } continue; }
        let t1 = (mn - o[k]) / d[k], t2 = (mx - o[k]) / d[k]; if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) { ok = false; break; }
      }
      if (ok && tmin < best) best = tmin;
    }
    if (best < s) break;
  }
  // Terrain
  for (let s = 0; s < best; s += 2) { const y = o.y + d.y * s; if (y < IE.groundH(o.x + d.x * s, o.z + d.z * s)) { best = s; break; } }
  return best;
};

// ---------- Texturen ----------
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
IE.canvasTex = canvasTex;
function facadeTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f4ece0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,90,60,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    // ein Stockwerk, zwei Fenster mit grünen Fensterläden
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 118, w, 4);
    for (let k = 0; k < 2; k++) {
      const x = 22 + k * 64;
      g.fillStyle = '#3d5a3a'; g.fillRect(x - 12, 34, 10, 58); g.fillRect(x + 22, 34, 10, 58);
      g.fillStyle = '#2a2f36'; g.fillRect(x, 34, 20, 58);
      g.fillStyle = 'rgba(160,190,210,0.5)'; g.fillRect(x + 2, 36, 7, 54); g.fillRect(x + 11, 36, 7, 54);
      g.fillStyle = '#e8dcc6'; g.fillRect(x - 4, 92, 28, 5);
    }
  });
}
function cityGroundTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3f4043'; g.fillRect(0, 0, w, h); // Asphalt
    for (let i = 0; i < 2500; i++) { const v = 50 + Math.random() * 30; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // Block = innerer Bereich (Pflaster)
    const s = 256 / 40, m = 6 * s; // 6m Straße an jeder Seite
    g.fillStyle = '#8f8574'; g.fillRect(m - 2 * s, m - 2 * s, w - 2 * m + 4 * s, h - 2 * m + 4 * s); // Gehweg
    g.fillStyle = '#86765c'; g.fillRect(m, m, w - 2 * m, h - 2 * m);
    g.strokeStyle = 'rgba(80,70,55,0.35)'; g.lineWidth = 1;
    for (let y = m; y < h - m; y += 6) { g.beginPath(); g.moveTo(m, y); g.lineTo(w - m, y); g.stroke(); }
    for (let x = m; x < w - m; x += 6) { g.beginPath(); g.moveTo(x, m); g.lineTo(x, h - m); g.stroke(); }
    // Mittellinien
    g.fillStyle = '#e8e2c8';
    for (let x = 0; x < w; x += 20) { g.fillRect(x, 0, 10, 2); g.fillRect(x, h - 2, 10, 2); g.fillRect(0, x, 2, 10); g.fillRect(w - 2, x, 2, 10); }
  });
}
function roadTex() {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#4b4c4f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { const v = 60 + Math.random() * 30; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.fillStyle = '#ece9df'; g.fillRect(2, 0, 2, h); g.fillRect(w - 4, 0, 2, h);
    g.fillStyle = '#ece9df'; g.fillRect(w / 2 - 1, 0, 2, h * 0.55);
  });
}

// ---------- Szene-Aufbau ----------
IE.buildWorld = function (scene) {
  mats();
  // Himmel
  const skyGeo = new T.SphereGeometry(9000, 32, 16);
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new T.Vector3(-0.5, 0.45, 0.6).normalize() }, uNight: { value: 0 }, uSunset: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir; uniform float uNight; uniform float uSunset;
      void main(){ float h = vP.y;
        vec3 top = mix(vec3(0.20,0.45,0.82), vec3(0.015,0.03,0.10), uNight);
        vec3 hor = mix(vec3(0.86,0.83,0.76), vec3(0.05,0.07,0.15), uNight);
        vec3 c = mix(hor, top, pow(max(h,0.0),0.55)); if(h<0.0) c = mix(hor, mix(vec3(0.55,0.65,0.72), vec3(0.02,0.03,0.07), uNight), min(-h*4.0,1.0));
        float s = max(dot(vP, sunDir),0.0);
        c += (vec3(1.0,0.85,0.55)*pow(s,700.0)*2.0 + vec3(1.0,0.7,0.4)*pow(s,10.0)*0.25) * (1.0 - uNight);
        c += vec3(1.0,0.4,0.15) * pow(s,5.0) * uSunset * max(0.0, 1.0 - abs(h)*2.5);
        gl_FragColor = vec4(c,1.0);} `
  });
  const sky = new T.Mesh(skyGeo, skyMat); sky.renderOrder = -1; scene.add(sky); IE.sky = sky; IE.skyMat = skyMat;

  // Terrain-Mesh
  const pos = new Float32Array(NV * 3), col = new Float32Array(NV * 3);
  const cSand = new T.Color(0xd9c9a0), cGrass = new T.Color(0x7d9a48), cField = new T.Color(0xc4ac62), cOlive = new T.Color(0x6a7a42),
    cForest = new T.Color(0x3c5530), cRock = new T.Color(0x8b8478), cSnow = new T.Color(0xf3f5f7), cDry = new T.Color(0xa99a62), cSea = new T.Color(0xb7a27a), cTmp = new T.Color();
  for (let iz = 0; iz <= G.nz; iz++) for (let ix = 0; ix <= G.nx; ix++) {
    const i = iz * (G.nx + 1) + ix, x = G.x0 + ix * G.cx, z = G.z0 + iz * G.cz, h = H[i];
    pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;
    const hx = H[Math.min(i + 1, NV - 1)] - H[Math.max(i - 1, 0)], hz = H[Math.min(i + G.nx + 1, NV - 1)] - H[Math.max(i - G.nx - 1, 0)];
    const slope = Math.hypot(hx, hz) / (2 * G.cx);
    const n1 = fbm(x * 0.012, z * 0.012, 3), n2 = vnoise(x * 0.03, z * 0.03);
    const south = smooth(-600, 1800, z); // Süden trockener
    if (h < 0.2) cTmp.copy(cSea);
    else if (h < 1.6) cTmp.copy(cSand);
    else {
      cTmp.copy(cGrass).lerp(cDry, south * 0.6);
      if (n1 > 0.55) cTmp.lerp(cField, (n1 - 0.55) * 3.5);
      else if (n1 < 0.38) cTmp.lerp(cOlive, (0.38 - n1) * 3);
      if (h > 35) cTmp.lerp(cForest, smooth(35, 80, h) * (0.6 + n2 * 0.4));
      if (h > 120 || slope > 0.9) cTmp.lerp(cRock, Math.max(smooth(120, 180, h), smooth(0.9, 1.5, slope)));
      if (h > 175) cTmp.lerp(cSnow, smooth(175, 215, h + n2 * 20));
    }
    const sh = 0.92 + vnoise(x * 0.1, z * 0.1) * 0.12;
    col[i * 3] = cTmp.r * sh; col[i * 3 + 1] = cTmp.g * sh; col[i * 3 + 2] = cTmp.b * sh;
  }
  const idx = new Uint32Array(G.nx * G.nz * 6); let k = 0;
  for (let iz = 0; iz < G.nz; iz++) for (let ix = 0; ix < G.nx; ix++) {
    const a = iz * (G.nx + 1) + ix, b = a + 1, c = a + G.nx + 1, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const tg = new T.BufferGeometry();
  tg.setAttribute('position', new T.BufferAttribute(pos, 3)); tg.setAttribute('color', new T.BufferAttribute(col, 3));
  tg.setIndex(new T.BufferAttribute(idx, 1)); tg.computeVertexNormals();
  const detail = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { const v = 200 + Math.random() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  // Detail-UVs in Weltkoordinaten
  const uv = new Float32Array(NV * 2); for (let i = 0; i < NV; i++) { uv[i * 2] = pos[i * 3] / 12; uv[i * 2 + 1] = pos[i * 3 + 2] / 12; }
  tg.setAttribute('uv', new T.BufferAttribute(uv, 2));
  const terrain = new T.Mesh(tg, new T.MeshLambertMaterial({ vertexColors: true, map: detail }));
  terrain.receiveShadow = true; scene.add(terrain); IE.terrain = terrain;

  // Meer
  const waterN = canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h); const hh = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) hh[y * w + x] = fbm(x / 32 * 4 % 256, y / 32 * 4 % 256, 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = hh[y * w + (x + 1) % w] - hh[y * w + (x - 1 + w) % w], dy = hh[((y + 1) % h) * w + x] - hh[((y - 1 + h) % h) * w + x];
      const j = (y * w + x) * 4; img.data[j] = 128 + dx * 300; img.data[j + 1] = 128 + dy * 300; img.data[j + 2] = 255; img.data[j + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [300, 300]);
  const water = new T.Mesh(new T.PlaneGeometry(18000, 18000), new T.MeshPhongMaterial({
    color: 0x1b6f93, specular: 0xffffff, shininess: 120, normalMap: waterN, normalScale: new T.Vector2(0.35, 0.35), transparent: true, opacity: 0.88, side: T.DoubleSide
  }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0; scene.add(water); IE.water = water; IE.waterN = waterN;

  // Straßenbänder
  const rtex = roadTex(); const rmat = new T.MeshLambertMaterial({ map: rtex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const r of IE.roads) {
    const P = r.pts, vs = [], uvs = [], ids = []; let dist = 0, n = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const inA = Math.hypot(p.x - r.a.x, p.z - r.a.z) < r.a.r - 5, inB = Math.hypot(p.x - r.b.x, p.z - r.b.z) < r.b.r - 5;
      const q = P[Math.min(i + 1, P.length - 1)], o = P[Math.max(i - 1, 0)];
      let tx = q.x - o.x, tz = q.z - o.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      if (i > 0) dist += Math.hypot(p.x - P[i - 1].x, p.z - P[i - 1].z);
      if (inA || inB) { if (n > 1) { /* Segment beenden */ } n = 0; continue; }
      const nx = -tz * 5.5, nz = tx * 5.5, y = p.y + 0.08;
      vs.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz); uvs.push(0, dist / 12, 1, dist / 12);
      const base = vs.length / 3 - 2;
      if (n > 0) ids.push(base - 2, base, base - 1, base - 1, base, base + 1);
      n++;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vs, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(ids); g.computeVertexNormals();
    const m = new T.Mesh(g, rmat); m.receiveShadow = true; scene.add(m);
    // Brückenpfeiler über Wasser
    for (let i = 0; i < P.length; i += 12) { const p = P[i]; const th = rawH(p.x, p.z); if (th < -0.5) { const pil = new T.Mesh(new T.BoxGeometry(2, p.y - th, 2), IE.mat.concrete); pil.position.set(p.x, (p.y + th) / 2, p.z); scene.add(pil); } }
  }

  buildCities(scene);
  buildBase(scene);
  buildAirport(scene);
  buildOnlineHouses(scene);
  buildInteriors(scene);
  buildWrecks(scene);
  if (IE.buildExtras) IE.buildExtras(scene);
  buildNature(scene);
  buildClouds(scene);
};

IE.mat = {};
function mats() {
  const M = IE.mat;
  M.concrete = new T.MeshLambertMaterial({ color: 0xb8b2a6 });
  M.white = new T.MeshLambertMaterial({ color: 0xf1ede4 });
  M.marble = new T.MeshLambertMaterial({ color: 0xf3efe6 });
  M.terracotta = new T.MeshLambertMaterial({ color: 0xb75a32 });
  M.brick = new T.MeshLambertMaterial({ color: 0xa65d3c });
  M.travertine = new T.MeshLambertMaterial({ color: 0xd9c8a3 });
  M.gold = new T.MeshStandardMaterial({ color: 0xd6b04a, metalness: 0.8, roughness: 0.3 });
  M.copper = new T.MeshLambertMaterial({ color: 0x5c9c84 });
  M.dark = new T.MeshLambertMaterial({ color: 0x2b2b2b });
  M.glass = new T.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.6 });
  M.yellow = new T.MeshLambertMaterial({ color: 0xe6b84f });
}

// ---------- Städte ----------
const palettes = {
  sued: [0xe9c27a, 0xeeddb8, 0xd98a5c, 0xf0e3c8, 0xc9734b, 0xe6a96f, 0xf4f0e6],
  rom: [0xd98a4f, 0xe7a865, 0xc9693f, 0xe9c48a, 0xd7a07a, 0xb85e3a],
  nord: [0xe8dcc4, 0xd6c3a2, 0xc7b8a0, 0xe9c27a, 0xb9a487, 0xf0ebe0],
  toskana: [0xe2c08a, 0xd6a46a, 0xeedcb0, 0xc98d55, 0xe7d3a8],
  venedig: [0xd2583b, 0xe38b5d, 0xf0c47a, 0xe6d5b8, 0xc94c3a, 0xe8a06a]
};

function buildCities(scene) {
  const facade = facadeTex(); IE.facadeTex = facade;
  const gtex = cityGroundTex();
  const groundMat = new T.MeshLambertMaterial({ map: gtex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const floorsList = [2, 3, 4, 5, 6, 8];
  const byFloors = {}; floorsList.forEach(f => byFloors[f] = []);
  const roofs = [], towers = [];
  IE.cityBuildings = {};

  // Sonderpunkte (Shops, Missionen) einsammeln -> dort keine Gebäude
  const reserve = {}; IE.cities.forEach(c => reserve[c.id] = []);
  for (const cid of IE.boatShopCities) {
    const c = IE.cityById[cid], hb = findHarbor(c); if (!hb) continue;
    IE.shops.push({ type: 'boat', city: cid, harbor: hb, x: hb.land.x - hb.dx * 10, z: hb.land.z - hb.dz * 10, dx: 0, dz: 0, fixed: true });
    reserve[cid].push({ x: hb.land.x - hb.dx * 12, z: hb.land.z - hb.dz * 12, r: 30 });
    for (let t = 0; t < 30; t += 6) reserve[cid].push({ x: hb.land.x - hb.dx * t, z: hb.land.z - hb.dz * t, r: 16 });
  }
  IE.shops.forEach(s => { if (s.fixed) return; const c = IE.cityById[s.city]; const p = IE.snapLand(c.x + s.dx, c.z + s.dz, c.x, c.z); s.x = p.x; s.z = p.z; reserve[s.city].push({ x: s.x, z: s.z, r: s.type === 'heli' ? 34 : s.type === 'luxury' ? 38 : 30 }); });
  IE.shops.forEach(s => { if (s.fixed && reserve[s.city]) reserve[s.city].push({ x: s.x, z: s.z, r: 26 }); });
  const resolvePt = (o, def) => { if (o.at === 'airport') { o.x = IE.airport.spawn.x; o.z = IE.airport.spawn.z; return o; } const c = IE.cityById[o.city || def]; const p = IE.snapLand(c.x + (o.dx || 0), c.z + (o.dz || 0), c.x, c.z); o.x = p.x; o.z = p.z; return o; };
  IE.airport.spawn = { x: IE.airport.x - 40, z: IE.airport.z + 40 };
  IE.missions.concat(IE.coopJobs || []).forEach(m => {
    resolvePt(m, m.city); if (!m.at) reserve[m.city].push({ x: m.x, z: m.z, r: 16 });
    m.steps.forEach(s => {
      if (s.city) { resolvePt(s, s.city); reserve[s.city].push({ x: s.x, z: s.z, r: s.t === 'kill' ? 40 : 18 }); }
      if (s.cps) { const c = IE.cityById[s.city]; s.cpPos = s.cps.map(q => { const p = IE.snapLand(c.x + q[0], c.z + q[1], c.x, c.z); reserve[s.city].push({ x: p.x, z: p.z, r: 16 }); return p; }); }
    });
  });

  for (const c of IE.cities) {
    const cp = IE.snapLand(c.x, c.z, c.x, c.z); c.cx = cp.x; c.cz = cp.z; // Landmarke / Spawn
    reserve[c.id].push({ x: c.cx, z: c.cz, r: c.landmark ? 70 : 20 });
    const pal = palettes[c.style];
    // Boden
    const vs = [], uvs = [], ids = []; const S = 10, R = c.r + 15, N = Math.ceil(R / S);
    const vi = {};
    const vid = (ix, iz) => { const k = ix + ',' + iz; if (vi[k] !== undefined) return vi[k]; const x = c.x + ix * S, z = c.z + iz * S; vs.push(x, rawH(x, z) + 0.06, z); uvs.push((x - c.x) / 40 + 0.5, (z - c.z) / 40 + 0.5); return vi[k] = vs.length / 3 - 1; };
    for (let iz = -N; iz < N; iz++) for (let ix = -N; ix < N; ix++) {
      const x = c.x + (ix + 0.5) * S, z = c.z + (iz + 0.5) * S;
      if (Math.hypot(x - c.x, z - c.z) > R) continue;
      if (rawH(c.x + ix * S, c.z + iz * S) < 0.8 || rawH(c.x + ix * S + S, c.z + iz * S) < 0.8 || rawH(c.x + ix * S, c.z + iz * S + S) < 0.8 || rawH(c.x + ix * S + S, c.z + iz * S + S) < 0.8) continue;
      const a = vid(ix, iz), b = vid(ix + 1, iz), d = vid(ix, iz + 1), e = vid(ix + 1, iz + 1);
      ids.push(a, d, b, b, d, e);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vs, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(ids); g.computeVertexNormals();
    const gm = new T.Mesh(g, groundMat); gm.receiveShadow = true; scene.add(gm);

    // Blöcke: Raster 40m, Straße 12m
    const B = 40; const NB = Math.ceil(c.r / B);
    const list = IE.cityBuildings[c.id] = [];
    for (let bz = -NB; bz <= NB; bz++) for (let bx = -NB; bx <= NB; bx++) {
      const ox = c.x + bx * B, oz = c.z + bz * B;
      const dc = Math.hypot(ox - c.x, oz - c.z); if (dc > c.r - 10) continue;
      // Venedig: Kanäle
      if (c.style === 'venedig' && (bx % 3 === 0)) continue;
      const lots = rnd() < 0.35 ? [[0, 0, 26, 26]] : [[-7, -7, 12, 12], [7, -7, 12, 12], [-7, 7, 12, 12], [7, 7, 12, 12]];
      for (const L of lots) {
        if (rnd() < 0.08) continue;
        const x = ox + L[0], z = oz + L[1], w = L[2] * (0.88 + rnd() * 0.1), d = L[3] * (0.88 + rnd() * 0.1);
        let bad = false;
        for (const r of reserve[c.id]) if (Math.hypot(x - r.x, z - r.z) < r.r + w / 2) { bad = true; break; }
        if (bad) continue;
        const corners = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2], [x, z]];
        if (corners.some(q => rawH(q[0], q[1]) < 0.9 || IE.nearRoad(q[0], q[1]) && dc > 30)) continue;
        // Straßen durch die Stadt freihalten
        if (corners.some(q => roadThroughCity(q[0], q[1], c))) continue;
        const centerF = 1 - dc / c.r;
        let floors = floorsList[Math.min(floorsList.length - 1, Math.floor(rnd() * 3 + centerF * 3.2))];
        if (c.style === 'venedig') floors = Math.min(floors, 5);
        const base = rawH(x, z) - 0.5, hgt = floors * 3.4;
        const color = new T.Color(pal[(rnd() * pal.length) | 0]);
        byFloors[floors].push({ x, z, w, d, y: base, h: hgt + 0.5, color });
        const top = base + hgt + 0.5;
        if (rnd() < 0.75) roofs.push({ x, z, w: w + 0.8, d: d + 0.8, y: top, h: Math.min(w, d) * 0.28 });
        IE.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2, top, base);
        list.push({ x, z, w, d, top });
      }
    }
    // Mailand: moderne Hochhäuser (Porta Nuova)
    if (c.id === 'mailand') for (let i = 0; i < 9; i++) {
      const x = c.x + 140 + (i % 3) * 34, z = c.z - 150 + Math.floor(i / 3) * 34, h = 60 + rnd() * 90;
      if (reserve.mailand.some(r => Math.hypot(x - r.x, z - r.z) < r.r + 12)) continue;
      towers.push({ x, z, w: 18, d: 18, y: rawH(x, z) - 0.5, h });
      IE.addBox(x - 9, z - 9, x + 9, z + 9, rawH(x, z) + h);
    }
    buildLandmark(scene, c);
    // Venedig-Kanäle
    if (c.style === 'venedig') {
      const cm = new T.MeshPhongMaterial({ color: 0x2a7f8a, shininess: 90, specular: 0xffffff, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      for (let bx = -NB; bx <= NB; bx++) if (bx % 3 === 0) {
        const x = c.x + bx * B; const len = Math.sqrt(Math.max(0, (c.r - 10) ** 2 - (bx * B) ** 2)) * 2;
        if (len < 20) continue;
        const cg = new T.Mesh(new T.PlaneGeometry(14, len), cm); cg.rotation.x = -Math.PI / 2; cg.position.set(x, c.base + 0.12, c.z); scene.add(cg);
      }
    }
  }

  // Instanzierte Gebäude
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
  for (const f of floorsList) {
    const arr = byFloors[f]; if (!arr.length) continue;
    const geo = new T.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const uv = geo.attributes.uv; const nrm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(nrm.getY(i)) > 0.5) { uv.setXY(i, 0.02, 0.02); continue; }
      uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * f);
    }
    const mat = new T.MeshLambertMaterial({ map: facade });
    const im = new T.InstancedMesh(geo, mat, arr.length);
    arr.forEach((b, i) => { ps.set(b.x, b.y, b.z); sc.set(b.w, b.h, b.d); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, b.color); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  if (roofs.length) {
    const rg = new T.ConeGeometry(0.7072, 1, 4, 1); rg.rotateY(Math.PI / 4); rg.translate(0, 0.5, 0);
    const im = new T.InstancedMesh(rg, IE.mat.terracotta, roofs.length);
    roofs.forEach((b, i) => { ps.set(b.x, b.y, b.z); sc.set(b.w, b.h, b.d); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); });
    im.castShadow = true; scene.add(im);
  }
  if (towers.length) {
    const tg = new T.BoxGeometry(1, 1, 1); tg.translate(0, 0.5, 0);
    const im = new T.InstancedMesh(tg, new T.MeshStandardMaterial({ color: 0x9fb8cc, metalness: 0.7, roughness: 0.15 }), towers.length);
    towers.forEach((b, i) => { ps.set(b.x, b.y, b.z); sc.set(b.w, b.h, b.d); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); });
    im.castShadow = true; scene.add(im);
  }
  buildShops(scene);
}
function roadThroughCity(x, z, c) {
  for (const r of IE.roads) {
    if (r.a !== c && r.b !== c) continue;
    const P = r.pts, start = r.a === c ? 0 : P.length - 1, dir = r.a === c ? 1 : -1;
    for (let i = start; i >= 0 && i < P.length; i += dir * 2) {
      const p = P[i]; if (Math.hypot(p.x - c.x, p.z - c.z) > c.r + 20) break;
      if (Math.hypot(p.x - x, p.z - z) < 9) return true;
    }
  }
  return false;
}

// ---------- Wahrzeichen ----------
function add(scene, geo, mat, x, y, z, ry, shadow) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; } scene.add(m); return m; }
function arches(color, rows, cols) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(80,60,40,${Math.random() * 0.1})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    const rh = h / rows, cw = w / cols;
    for (let r = 0; r < rows; r++) {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, r * rh, w, 4);
      if (r === rows - 1 && rows > 3) { for (let c = 0; c < cols * 2; c++) { g.fillStyle = 'rgba(40,30,20,0.6)'; g.fillRect(c * cw / 2 + cw / 6, r * rh + rh * 0.35, cw / 6, rh * 0.3); } continue; }
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.2, y = r * rh + rh * 0.22, aw = cw * 0.6, ah = rh * 0.7;
        g.fillStyle = 'rgba(30,22,15,0.92)'; g.beginPath(); g.moveTo(x, y + ah); g.lineTo(x, y + aw / 2); g.arc(x + aw / 2, y + aw / 2, aw / 2, Math.PI, 0); g.lineTo(x + aw, y + ah); g.fill();
      }
    }
  });
}
function buildLandmark(scene, c) {
  const M = IE.mat, x = c.cx, z = c.cz, y = rawH(x, z) - 0.3;
  const box = (w, h, d, mat, px, py, pz) => { add(scene, new T.BoxGeometry(w, h, d), mat, px, py + h / 2, pz); IE.addBox(px - w / 2, pz - d / 2, px + w / 2, pz + d / 2, py + h); };
  switch (c.landmark) {
    case 'kolosseum': case 'arena': {
      const s = c.landmark === 'arena' ? 0.65 : 1, R = 46 * s, Hh = 46 * s;
      const tex = arches('#d8c6a0', 4, 20); tex.repeat.set(4, 1);
      const outer = new T.Mesh(new T.CylinderGeometry(R, R, Hh, 64, 1, true), new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide }));
      outer.scale.z = 0.8; outer.position.set(x, y + Hh / 2, z); outer.castShadow = true; scene.add(outer);
      const inner = new T.Mesh(new T.CylinderGeometry(R * 0.82, R * 0.55, Hh * 0.7, 48, 1, true), new T.MeshLambertMaterial({ color: 0xbfae8a, side: T.DoubleSide }));
      inner.scale.z = 0.8; inner.position.set(x, y + Hh * 0.35, z); scene.add(inner);
      const floor = new T.Mesh(new T.CircleGeometry(R * 0.55, 40), new T.MeshLambertMaterial({ color: 0xc9b48a })); floor.rotation.x = -Math.PI / 2; floor.scale.y = 0.8; floor.position.set(x, y + 0.45, z); scene.add(floor);
      IE.addRing(x, z, R * 0.76, R * 0.98, y + Hh, 6);
      if (c.id === 'rom') { // Petersdom
        const px = x - 230, pz = z - 70, py = rawH(px, pz) - 0.3;
        box(70, 40, 50, M.travertine, px, py, pz);
        add(scene, new T.CylinderGeometry(16, 16, 14, 24), M.travertine, px, py + 47, pz);
        add(scene, new T.SphereGeometry(16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: 0x8aa3a8 }), px, py + 54, pz);
        add(scene, new T.CylinderGeometry(2, 3, 10, 8), M.white, px, py + 74, pz);
      }
      break;
    }
    case 'duomo': {
      box(70, 30, 36, M.marble, x, y, z);
      add(scene, new T.CylinderGeometry(0.1, 7, 34, 8), M.marble, x, y + 47, z);
      add(scene, new T.SphereGeometry(1.6, 12, 8), M.gold, x, y + 66, z);
      for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) add(scene, new T.ConeGeometry(1.4, 12, 6), M.marble, x + i * 10, y + 36, z + s * 17);
      for (const s of [-1, 1]) add(scene, new T.ConeGeometry(2.2, 18, 6), M.marble, x + 35 * s, y + 39, z);
      break;
    }
    case 'kuppel': {
      box(60, 24, 28, new T.MeshLambertMaterial({ color: 0xe8e2d0 }), x - 30, y, z);
      add(scene, new T.CylinderGeometry(16, 16, 14, 8), new T.MeshLambertMaterial({ color: 0xece5d3 }), x + 8, y + 31, z);
      const dome = add(scene, new T.SphereGeometry(16, 8, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.terracotta, x + 8, y + 38, z); dome.scale.y = 1.35;
      add(scene, new T.CylinderGeometry(1.8, 2.6, 8, 8), M.white, x + 8, y + 63, z);
      add(scene, new T.SphereGeometry(1.2, 8, 6), M.gold, x + 8, y + 68, z);
      IE.addBox(x - 8, z - 16, x + 24, z + 16, y + 60);
      box(10, 84, 10, new T.MeshLambertMaterial({ color: 0xe5dccb }), x - 45, y, z + 28);
      break;
    }
    case 'campanile': {
      box(12, 70, 12, M.brick, x, y, z);
      box(13, 12, 13, M.white, x, y + 70, z);
      add(scene, new T.ConeGeometry(9, 18, 4), M.copper, x, y + 91, z, Math.PI / 4);
      add(scene, new T.SphereGeometry(1.2, 8, 6), M.gold, x, y + 101, z);
      // San Marco
      box(40, 18, 34, new T.MeshLambertMaterial({ color: 0xe9dcc4 }), x + 40, y, z + 10);
      for (const d of [[0, 0], [-12, 0], [12, 0], [0, -11], [0, 11]]) add(scene, new T.SphereGeometry(6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: 0x7a8b86 }), x + 40 + d[0], y + 18, z + 10 + d[1]);
      break;
    }
    case 'castel': {
      box(46, 18, 46, new T.MeshLambertMaterial({ color: 0x9e958a }), x, y, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(scene, new T.CylinderGeometry(7, 8, 28, 16), new T.MeshLambertMaterial({ color: 0x8f877c }), x + sx * 23, y + 14, z + sz * 23); IE.addBox(x + sx * 23 - 8, z + sz * 23 - 8, x + sx * 23 + 8, z + sz * 23 + 8, y + 28); }
      add(scene, new T.BoxGeometry(10, 16, 3), M.marble, x, y + 8, z + 23.5);
      break;
    }
    case 'teatro': case 'casino': {
      box(44, 16, 24, new T.MeshLambertMaterial({ color: c.landmark === 'casino' ? 0xf3efe6 : 0xe9bf63 }), x, y, z);
      add(scene, new T.SphereGeometry(9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: 0x6f7f87 }), x, y + 16, z);
      for (const s of [-1, 1]) { box(7, 24, 7, M.white, x + s * 22, y, z - 8); add(scene, new T.ConeGeometry(4.5, 7, 4), new T.MeshLambertMaterial({ color: 0x6f7f87 }), x + s * 22, y + 27.5, z - 8, Math.PI / 4); }
      break;
    }
    case 'kathedrale': {
      box(56, 22, 24, new T.MeshLambertMaterial({ color: 0xd9b98a }), x, y, z);
      add(scene, new T.SphereGeometry(9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.copper, x + 10, y + 22, z);
      for (const s of [-1, 1]) box(8, 34, 8, new T.MeshLambertMaterial({ color: 0xcfae80 }), x - 26, y, z + s * 12);
      break;
    }
    case 'leuchtturm': {
      box(8, 38, 8, M.white, x, y, z); box(6, 34, 6, M.white, x, y + 38, z);
      add(scene, new T.CylinderGeometry(2.2, 2.2, 4, 12), M.glass, x, y + 74, z);
      add(scene, new T.ConeGeometry(2.6, 3, 12), M.dark, x, y + 77.5, z);
      break;
    }
    case 'mole': {
      box(30, 30, 30, new T.MeshLambertMaterial({ color: 0xd6c6a8 }), x, y, z);
      add(scene, new T.ConeGeometry(21, 60, 4), new T.MeshLambertMaterial({ color: 0x8c9a9e }), x, y + 60, z, Math.PI / 4);
      add(scene, new T.CylinderGeometry(0.4, 2.6, 80, 8), new T.MeshLambertMaterial({ color: 0xb0b6b4 }), x, y + 128, z);
      break;
    }
    case 'tuerme': {
      box(7, 97, 7, M.brick, x, y, z); box(7, 48, 7, M.brick, x + 12, y, z + 4);
      break;
    }
    case 'schieferturm': {
      const g = new T.Group(); g.position.set(x, y, z); g.rotation.z = 0.07;
      for (let i = 0; i < 8; i++) { const r = new T.Mesh(new T.CylinderGeometry(i === 7 ? 5 : 7.6, 7.6, 6.6, 24), M.marble); r.position.y = 3.3 + i * 6.8; r.castShadow = true; g.add(r); const b = new T.Mesh(new T.CylinderGeometry(8.2, 8.2, 0.6, 24), new T.MeshLambertMaterial({ color: 0xd8d2c4 })); b.position.y = 6.7 + i * 6.8; g.add(b); }
      scene.add(g); IE.addBox(x - 8, z - 8, x + 12, z + 8, y + 56);
      box(60, 22, 20, M.marble, x - 70, y, z + 10);
      add(scene, new T.SphereGeometry(7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: 0x8c9496 }), x - 60, y + 22, z + 10);
      break;
    }
    case 'bastion': {
      box(70, 22, 18, new T.MeshLambertMaterial({ color: 0xe0d0aa }), x, y, z);
      break;
    }
  }
}

// ---------- Shops ----------
function signTex(text, bg, fg) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.font = 'bold 72px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
  });
}
function heliTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3d4246'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2c230'; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', w / 2, h / 2 + 8);
  });
}
IE.markers = [];
function marker(scene, x, y, z, color, r) {
  const m = new T.Mesh(new T.CylinderGeometry(r || 1.4, r || 1.4, 2.2, 28, 1, true),
    new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }));
  m.position.set(x, y + 1.1, z); scene.add(m); IE.markers.push(m); return m;
}
IE.marker = marker;
function buildShops(scene) {
  const sw = signTex('ARMERIA', '#1b1b1b', '#e94b3c'), sc = signTex('AUTOSALONE', '#0f2440', '#ffffff'), sl = signTex('LUSSO AUTOMOBILI', '#0b0b0d', '#d6b04a');
  const hmat = new T.MeshLambertMaterial({ map: heliTex() });
  for (const s of IE.shops) {
    const c = IE.cityById[s.city];
    if (!c) continue; // Dubai-Läden o. Ä. ohne Stadt werden separat (in buildDubai) gebaut
    // Gebäude hinter dem Marker, Richtung vom Zentrum weg
    let ax = s.x - c.cx, az = s.z - c.cz; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
    const y = rawH(s.x, s.z);
    if (s.type === 'weapon' || s.type === 'car' || s.type === 'luxury') {
      const lux = s.type === 'luxury', bw = lux ? 36 : s.type === 'car' ? 26 : 14, bd = lux ? 20 : s.type === 'car' ? 16 : 10, bh = lux ? 12 : s.type === 'car' ? 8 : 7;
      const bx = s.x + ax * (bd / 2 + 4), bz = s.z + az * (bd / 2 + 4), rot = Math.atan2(ax, az);
      const mat = lux ? new T.MeshStandardMaterial({ color: 0x15161a, metalness: 0.7, roughness: 0.25 }) : s.type === 'car' ? new T.MeshStandardMaterial({ color: 0xdfe6ea, metalness: 0.3, roughness: 0.4 }) : new T.MeshLambertMaterial({ color: 0x6b5a4a });
      const b = add(scene, new T.BoxGeometry(bw, bh, bd), mat, bx, y + bh / 2 - 0.3, bz, rot);
      if (lux) { add(scene, new T.BoxGeometry(bw + 0.6, 0.8, bd + 0.6), IE.mat.gold, bx, y + bh, bz, rot); for (const k of [-1, 1]) add(scene, new T.BoxGeometry(1, bh, 1), IE.mat.gold, bx - ax * (bd / 2 + 0.3) + az * k * (bw / 2), y + bh / 2, bz - az * (bd / 2 + 0.3) - ax * k * (bw / 2), rot); }
      if (s.type === 'car' || lux) { const gl = add(scene, new T.BoxGeometry(bw - 2, bh - 3, 0.3), IE.mat.glass, bx - ax * (bd / 2 + 0.1), y + bh / 2 - 0.8, bz - az * (bd / 2 + 0.1), rot); }
      const sign = new T.Mesh(new T.PlaneGeometry(bw * 0.7, bw * 0.7 / 4), new T.MeshBasicMaterial({ map: lux ? sl : s.type === 'car' ? sc : sw }));
      sign.position.set(bx - ax * (bd / 2 + 0.05), y + bh - 0.5, bz - az * (bd / 2 + 0.05)); sign.rotation.y = rot + Math.PI; scene.add(sign);
      const ext = Math.max(bw, bd) / 2;
      IE.addBox(bx - ext * (Math.abs(az) > 0.7 ? bw / (2 * ext) : bd / (2 * ext)), bz - ext * (Math.abs(az) > 0.7 ? bd / (2 * ext) : bw / (2 * ext)),
                bx + ext * (Math.abs(az) > 0.7 ? bw / (2 * ext) : bd / (2 * ext)), bz + ext * (Math.abs(az) > 0.7 ? bd / (2 * ext) : bw / (2 * ext)), y + bh);
      s.marker = marker(scene, s.x, y, s.z, lux ? 0xd6b04a : s.type === 'car' ? 0x3aa0ff : 0xff4a3a);
      s.spawn = { x: s.x - az * 9, z: s.z + ax * 9, rot: rot + Math.PI / 2 };
    } else if (s.type === 'biz') {
      const D = IE.bizDefs[s.biz], big = s.biz === 'hotel', bw = big ? 22 : 16, bd = big ? 16 : 12, bh = big ? 18 : 7;
      const bx = s.x + ax * (bd / 2 + 5), bz = s.z + az * (bd / 2 + 5), rot = Math.atan2(ax, az);
      add(scene, new T.BoxGeometry(bw, bh, bd), new T.MeshLambertMaterial({ color: 0xf1e7d4 }), bx, y + bh / 2 - 0.3, bz, rot);
      add(scene, new T.BoxGeometry(bw + 0.4, 0.5, bd + 0.4), new T.MeshLambertMaterial({ color: D.color }), bx, y + bh - 0.05, bz, rot);
      // Markise + Fenster
      add(scene, new T.BoxGeometry(bw - 1, 0.25, 2.4), new T.MeshLambertMaterial({ color: D.color }), bx - ax * (bd / 2 + 1.1), y + 3.3, bz - az * (bd / 2 + 1.1), rot);
      add(scene, new T.BoxGeometry(bw - 3, 2.2, 0.2), IE.mat.glass, bx - ax * (bd / 2 + 0.05), y + 1.6, bz - az * (bd / 2 + 0.05), rot);
      if (big) for (let f = 1; f < 5; f++) add(scene, new T.BoxGeometry(bw - 2, 1.6, 0.2), IE.mat.glass, bx - ax * (bd / 2 + 0.05), y + 3.5 + f * 3.2, bz - az * (bd / 2 + 0.05), rot);
      const sg = new T.Mesh(new T.PlaneGeometry(bw * 0.75, bw * 0.75 / 4), new T.MeshBasicMaterial({ map: signTex(D.name.toUpperCase(), D.sign, '#ffffff') }));
      sg.position.set(bx - ax * (bd / 2 + 0.12), y + (big ? bh - 2 : 5), bz - az * (bd / 2 + 0.12)); sg.rotation.y = rot + Math.PI; scene.add(sg);
      // Tische draußen (Gastro)
      if (['pizzeria', 'ristorante', 'gelateria'].includes(s.biz)) for (const k of [-1, 1]) {
        const tx = s.x + az * k * 5 + ax * 1.5, tz = s.z - ax * k * 5 + az * 1.5;
        add(scene, new T.CylinderGeometry(0.7, 0.7, 0.08, 12), IE.mat.white, tx, y + 0.8, tz, 0, false);
        add(scene, new T.CylinderGeometry(0.06, 0.06, 0.8, 6), IE.mat.dark, tx, y + 0.4, tz, 0, false);
        add(scene, new T.ConeGeometry(1.6, 0.8, 10), new T.MeshLambertMaterial({ color: D.color }), tx, y + 2.6, tz, 0, false);
        add(scene, new T.CylinderGeometry(0.05, 0.05, 2.4, 6), IE.mat.white, tx, y + 1.4, tz, 0, false);
      }
      const ext = Math.max(bw, bd) / 2;
      IE.addBox(bx - ext * (Math.abs(az) > 0.7 ? bw / (2 * ext) : bd / (2 * ext)), bz - ext * (Math.abs(az) > 0.7 ? bd / (2 * ext) : bw / (2 * ext)),
                bx + ext * (Math.abs(az) > 0.7 ? bw / (2 * ext) : bd / (2 * ext)), bz + ext * (Math.abs(az) > 0.7 ? bd / (2 * ext) : bw / (2 * ext)), y + bh);
      s.marker = marker(scene, s.x, y, s.z, 0x48e07a);
    } else if (s.type === 'boat') {
      buildHarbor(scene, s);
      continue;
    } else {
      const pad = add(scene, new T.CylinderGeometry(12, 12, 1, 32), new T.MeshLambertMaterial({ color: 0x8e9396 }), s.x, y + 0.2, s.z);
      const top = new T.Mesh(new T.CircleGeometry(11.5, 32), hmat); top.rotation.x = -Math.PI / 2; top.position.set(s.x, y + 0.72, s.z); top.receiveShadow = true; scene.add(top);
      // kleiner Hangar
      const hx = s.x + ax * 20, hz = s.z + az * 20;
      add(scene, new T.BoxGeometry(10, 6, 10), new T.MeshLambertMaterial({ color: 0xc8ccd0 }), hx, y + 2.7, hz);
      IE.addBox(hx - 5, hz - 5, hx + 5, hz + 5, y + 5.7);
      // Windsack
      add(scene, new T.CylinderGeometry(0.1, 0.1, 6, 6), IE.mat.dark, s.x + 13, y + 3, s.z);
      add(scene, new T.ConeGeometry(0.6, 2.4, 8, 1, true), new T.MeshLambertMaterial({ color: 0xff6a00 }), s.x + 14, y + 5.6, s.z, 0).rotation.z = Math.PI / 2;
      s.marker = marker(scene, s.x + ax * 13 - az * 0, y, s.z + az * 13, 0x48e07a);
      s.mx = s.x + ax * 13; s.mz = s.z + az * 13;
      s.spawn = { x: s.x, z: s.z, y: y + 0.75 };
    }
    if (!s.mx) { s.mx = s.x; s.mz = s.z; }
  }
}

// ---------- Hafen ----------
function findHarbor(c) {
  let best = null;
  for (let a = 0; a < 48; a++) {
    const ang = a / 48 * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
    let land = null;
    for (let d = 10; d < c.r + 260; d += 4) {
      const x = c.x + dx * d, z = c.z + dz * d, h = rawH(x, z);
      if (h > 0.9) land = { x, z, d };
      else if (h < -3 && land && d - land.d < 30) {
        let ok = true; for (let k = 10; k <= 80; k += 10) if (rawH(x + dx * k, z + dz * k) > -2.5) ok = false;
        if (ok && (!best || d < best.d)) best = { land: { x: land.x, z: land.z }, d, dx, dz };
        break;
      } else if (h < -3) break;
    }
  }
  return best;
}
function buildHarbor(scene, s) {
  const hb = s.harbor, dx = hb.dx, dz = hb.dz, rot = Math.atan2(dx, dz);
  const L = hb.land, y = rawH(s.x, s.z);
  // Gebäude "NAUTICA" landeinwärts
  const bx = s.x - dx * 12, bz = s.z - dz * 12;
  add(scene, new T.BoxGeometry(18, 7, 10), new T.MeshLambertMaterial({ color: 0xf0ece2 }), bx, y + 3.2, bz, rot);
  add(scene, new T.BoxGeometry(19, 0.6, 11), new T.MeshLambertMaterial({ color: 0x1b5a8a }), bx, y + 6.9, bz, rot);
  const sign = new T.Mesh(new T.PlaneGeometry(12, 3), new T.MeshBasicMaterial({ map: signTex('NAUTICA', '#0e3a5c', '#ffffff') }));
  sign.position.set(bx + dx * 5.1, y + 5.2, bz + dz * 5.1); sign.rotation.y = rot; scene.add(sign);
  IE.addBox(bx - 7, bz - 7, bx + 7, bz + 7, y + 7);
  s.marker = marker(scene, s.x, y, s.z, 0x35d6e8); s.mx = s.x; s.mz = s.z;
  // Steg
  const len = 90, deck = 1.3, start = -6;
  const wood = new T.MeshLambertMaterial({ color: 0x8a6a48 });
  const pier = add(scene, new T.BoxGeometry(6, 0.5, len), wood, L.x + dx * (start + len / 2), deck - 0.25, L.z + dz * (start + len / 2), rot);
  for (let t = start; t <= start + len; t += 6) {
    const px = L.x + dx * t, pz = L.z + dz * t;
    IE.addBox(px - 3.2, pz - 3.2, px + 3.2, pz + 3.2, deck, -6);
    for (const sd of [-1, 1]) add(scene, new T.CylinderGeometry(0.25, 0.25, 8, 6), IE.mat.dark, px + dz * 2.8 * sd, deck - 4, pz - dx * 2.8 * sd, 0, false);
  }
  // Liegeplätze
  s.slots = [];
  for (let i = 0; i < 6; i++) {
    const t = 18 + Math.floor(i / 2) * 22, sd = i % 2 ? 1 : -1;
    const px = L.x + dx * t + dz * 9 * sd, pz = L.z + dz * t - dx * 9 * sd;
    if (rawH(px, pz) < -1.8) s.slots.push({ x: px, z: pz, rot });
  }
  s.spawn = s.slots[0] || { x: L.x + dx * 40, z: L.z + dz * 40, rot };
}

// ---------- Militärbasis ----------
function buildBase(scene) {
  const B = IE.base, y = 12, M = IE.mat;
  const olive = new T.MeshLambertMaterial({ color: 0x5d6448 }), sand = new T.MeshLambertMaterial({ color: 0xb9ad8a }), fence = new T.MeshLambertMaterial({ color: 0x7c7f7a });
  // Boden: Beton
  const g = new T.Mesh(new T.PlaneGeometry(B.hw * 2, B.hd * 2), new T.MeshLambertMaterial({ color: 0x8f8b7e, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  g.rotation.x = -Math.PI / 2; g.position.set(B.x, y + 0.05, B.z); g.receiveShadow = true; scene.add(g);
  // Landebahn
  const rw = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#35373a'; c.fillRect(0, 0, w, h); c.fillStyle = '#eee'; for (let i = 0; i < h; i += 40) c.fillRect(w / 2 - 2, i, 4, 22); c.fillRect(2, 0, 3, h); c.fillRect(w - 5, 0, 3, h); });
  const run = new T.Mesh(new T.PlaneGeometry(26, B.hw * 1.8), new T.MeshLambertMaterial({ map: rw, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  run.rotation.x = -Math.PI / 2; run.rotation.z = Math.PI / 2; run.position.set(B.x, y + 0.08, B.z + B.hd * 0.55); scene.add(run);
  // Zaun mit Tor (Westseite)
  const seg = (x0, z0, x1, z1) => { const w = Math.abs(x1 - x0) || 0.4, d = Math.abs(z1 - z0) || 0.4; add(scene, new T.BoxGeometry(w, 4, d), fence, (x0 + x1) / 2, y + 2, (z0 + z1) / 2); IE.addBox(Math.min(x0, x1) - 0.2, Math.min(z0, z1) - 0.2, Math.max(x0, x1) + 0.2, Math.max(z0, z1) + 0.2, y + 4); };
  const X0 = B.x - B.hw, X1 = B.x + B.hw, Z0 = B.z - B.hd, Z1 = B.z + B.hd;
  seg(X0, Z0, X1, Z0); seg(X0, Z1, X1, Z1); seg(X1, Z0, X1, Z1); seg(X0, Z0, X0, B.z - 12); seg(X0, B.z + 12, X0, Z1);
  // Wachtürme
  for (const [tx, tz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) {
    for (const ox of [-1.5, 1.5]) for (const oz of [-1.5, 1.5]) add(scene, new T.BoxGeometry(0.3, 9, 0.3), M.dark, tx + ox, y + 4.5, tz + oz);
    add(scene, new T.BoxGeometry(4.4, 2.6, 4.4), olive, tx, y + 10, tz); add(scene, new T.ConeGeometry(3.6, 1.6, 4), olive, tx, y + 12.1, tz, Math.PI / 4);
  }
  // Hangars
  for (let i = 0; i < 3; i++) {
    const hx = B.x - 90 + i * 45, hz = B.z - 55;
    const hg = new T.CylinderGeometry(13, 13, 34, 20, 1, false, 0, Math.PI); hg.rotateZ(Math.PI / 2); hg.rotateY(Math.PI / 2);
    const m = add(scene, hg, olive, hx, y, hz); m.rotation.y = Math.PI / 2;
    IE.addBox(hx - 13, hz - 17, hx + 13, hz + 17, y + 12);
  }
  // Kontrollturm + Kasernen
  add(scene, new T.BoxGeometry(8, 22, 8), sand, B.x + 100, y + 11, B.z - 60); add(scene, new T.BoxGeometry(11, 4, 11), M.glass, B.x + 100, y + 24, B.z - 60);
  IE.addBox(B.x + 94, B.z - 66, B.x + 106, B.z - 54, y + 26);
  for (let i = 0; i < 3; i++) { const kx = B.x + 40 + i * 24, kz = B.z - 70; add(scene, new T.BoxGeometry(18, 6, 10), sand, kx, y + 3, kz); IE.addBox(kx - 9, kz - 5, kx + 9, kz + 5, y + 6); }
  // Flagge
  add(scene, new T.CylinderGeometry(0.15, 0.15, 16, 6), M.white, X0 + 20, y + 8, B.z + 18);
  const fl = canvasTex(96, 64, (c, w, h) => { c.fillStyle = '#009246'; c.fillRect(0, 0, w / 3, h); c.fillStyle = '#f1f2f1'; c.fillRect(w / 3, 0, w / 3, h); c.fillStyle = '#ce2b37'; c.fillRect(2 * w / 3, 0, w / 3, h); });
  const flag = new T.Mesh(new T.PlaneGeometry(4.5, 3), new T.MeshBasicMaterial({ map: fl, side: T.DoubleSide })); flag.position.set(X0 + 22.3, y + 14.3, B.z + 18); scene.add(flag);
  // Hubschrauberlandeplatz
  const hp = new T.Mesh(new T.CircleGeometry(11, 32), new T.MeshLambertMaterial({ map: heliTex() })); hp.rotation.x = -Math.PI / 2; hp.position.set(B.x + 110, y + 0.12, B.z + 10); scene.add(hp);
  // Sandsäcke
  for (let i = 0; i < 8; i++) { const sx = X0 + 8, sz = B.z - 30 + i * 7.5; if (Math.abs(sz - B.z) < 14) continue; add(scene, new T.BoxGeometry(2, 1.3, 6), sand, sx, y + 0.65, sz); IE.addBox(sx - 1, sz - 3, sx + 1, sz + 3, y + 1.3); }
  B.slots = {
    tank: [{ x: B.x - 90, z: B.z - 20, rot: 0 }, { x: B.x - 45, z: B.z - 20, rot: 0 }, { x: B.x, z: B.z - 20, rot: 0 }],
    jeep: [{ x: B.x + 40, z: B.z - 45, rot: Math.PI / 2 }, { x: B.x + 40, z: B.z - 38, rot: Math.PI / 2 }, { x: X0 + 25, z: B.z - 6, rot: Math.PI / 2 }],
    heli: [{ x: B.x + 110, z: B.z + 10, y: y + 0.15 }],
    jet: [{ x: B.x - B.hw * 0.85, z: B.z + B.hd * 0.55, rot: Math.PI / 2 }],
    soldiers: []
  };
  for (let i = 0; i < 14; i++) B.slots.soldiers.push({ x: B.x + (IE.hash(i, 11) - 0.5) * B.hw * 1.7, z: B.z + (IE.hash(i, 12) - 0.5) * B.hd * 1.5 });
  B.slots.soldiers.push({ x: X0 + 5, z: B.z - 8 }, { x: X0 + 5, z: B.z + 8 });
}

// ---------- Zusätzliche Häuser (Online-Modus) ----------
IE.onlineOn = false;
function buildOnlineHouses(scene) {
  const houses = [];
  const okSpot = (x, z, w, d) => {
    const h0 = rawH(x, z); if (h0 < 1.5 || h0 > 160) return false;
    for (const q of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const h = rawH(x + q[0], z + q[1]); if (h < 1.2 || Math.abs(h - h0) > 2.5 || IE.nearRoad(x + q[0], z + q[1])) return false; }
    for (const c of IE.cities) if (Math.hypot(x - c.x, z - c.z) < c.r + 12) return false;
    for (const f of IE.flatZones) if (Math.abs(x - f.x) < f.hw + 40 && Math.abs(z - f.z) < f.hd + 40) return false;
    for (const hh of houses) if (Math.abs(hh.x - x) < (hh.w + w) / 2 + 3 && Math.abs(hh.z - z) < (hh.d + d) / 2 + 3) return false;
    return true;
  };
  const tryHouse = (x, z) => { const w = 9 + rnd() * 6, d = 9 + rnd() * 6; if (!okSpot(x, z, w, d)) return; houses.push({ x, z, w, d, f: rnd() < 0.6 ? 2 : 3, y: rawH(x, z) - 0.5 }); };
  // Vororte rund um jede Stadt
  for (const c of IE.cities) {
    const n = Math.round(c.r / 4);
    for (let i = 0; i < n * 3 && houses.length < 4000; i++) { const a = rnd() * Math.PI * 2, r = c.r + 18 + rnd() * 110; tryHouse(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r); }
  }
  // Dörfer entlang der Straßen
  for (const r of IE.roads) for (let i = 60; i < r.pts.length - 60; i += 90) {
    const p = r.pts[i], q = r.pts[i + 1], tx = q.x - p.x, tz = q.z - p.z, l = Math.hypot(tx, tz) || 1, sd = rnd() < 0.5 ? 1 : -1;
    const cx = p.x + (-tz / l) * sd * 45, cz = p.z + (tx / l) * sd * 45;
    for (let k = 0; k < 14; k++) tryHouse(cx + (rnd() - 0.5) * 70, cz + (rnd() - 0.5) * 70);
  }
  const pal = [0xe9c27a, 0xeeddb8, 0xd98a5c, 0xf0e3c8, 0xc9734b, 0xe6a96f, 0xf4f0e6, 0xe2c08a];
  const grp = new T.Group(); grp.visible = false; scene.add(grp); IE.onlineGroup = grp;
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
  for (const f of [2, 3]) {
    const arr = houses.filter(h => h.f === f); if (!arr.length) continue;
    const geo = new T.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const uv = geo.attributes.uv, nrm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) { if (Math.abs(nrm.getY(i)) > 0.5) { uv.setXY(i, 0.02, 0.02); continue; } uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * f); }
    const im = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ map: IE.facadeTex }), arr.length);
    arr.forEach((h, i) => { ps.set(h.x, h.y, h.z); sc.set(h.w, f * 3.4 + 0.5, h.d); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, new T.Color(pal[(IE.hash(i, f) * pal.length) | 0])); });
    im.castShadow = true; im.receiveShadow = true; grp.add(im);
  }
  const rg = new T.ConeGeometry(0.7072, 1, 4, 1); rg.rotateY(Math.PI / 4); rg.translate(0, 0.5, 0);
  const rim = new T.InstancedMesh(rg, IE.mat.terracotta, houses.length);
  houses.forEach((h, i) => { ps.set(h.x, h.y + h.f * 3.4 + 0.5, h.z); sc.set(h.w + 0.8, Math.min(h.w, h.d) * 0.3, h.d + 0.8); m4.compose(ps, q, sc); rim.setMatrixAt(i, m4); });
  rim.castShadow = true; grp.add(rim);
  for (const h of houses) { const b = IE.addBox(h.x - h.w / 2, h.z - h.d / 2, h.x + h.w / 2, h.z + h.d / 2, h.y + h.f * 3.4 + 0.5, h.y); b.online = true; }
  IE.onlineHouses = houses;
}
// Liegt (x,z) in/auf einem Gebäude? (Box-Kollider deutlich über dem Boden, mit Rand r)
IE.blockedAt = function (x, z, r) {
  r = r || 2.5; const g = IE.groundH(x, z);
  for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]])
    for (const b of IE.collAt(x + ox, z + oz)) {
      if (b.online && !IE.onlineOn) continue;
      if (b.top < g + 1.2) continue;
      if (b.t === 'box') { if (x > b.minx - r && x < b.maxx + r && z > b.minz - r && z < b.maxz + r) return true; }
      else { const d = Math.hypot(x - b.x, z - b.z); if (d > b.r0 - r && d < b.r1 + r && !(b.gap && Math.abs(z - b.z) < b.gap)) return true; }
    }
  return false;
};
// Nächster freier, begehbarer Punkt (nicht in Gebäuden, nicht im Wasser wenn vorher Land)
IE.freeSpot = function (x, z) {
  const land = IE.isLand(x, z);
  if (!IE.blockedAt(x, z)) return { x, z };
  for (let r = 3; r < 160; r += 3) for (let a = 0, n = Math.max(8, Math.round(r * 1.2)); a < n; a++) {
    const ang = a / n * Math.PI * 2, px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
    if ((!land || IE.isLand(px, pz)) && !IE.blockedAt(px, pz)) return { x: px, z: pz };
  }
  return { x, z };
};
// Missions-Lichtstrahlen aus Gebäuden heraus auf freie Plätze verschieben
IE.fixMissionSpots = function () {
  const fix = o => { if (!o || typeof o.x !== 'number') return; if (o._ox === undefined) { o._ox = o.x; o._oz = o.z; } const p = IE.freeSpot(o._ox, o._oz); o.x = p.x; o.z = p.z; };
  for (const m of (IE.missions || []).concat(IE.coopJobs || [])) {
    fix(m);
    for (const st of m.steps || []) {
      if (st.t === 'goto' || (!st.inside && (st.t === 'collect' || st.t === 'kill'))) fix(st);
      if (st.cpPos) st.cpPos.forEach(fix);
    }
  }
};
IE.setOnlineWorld = function (on) { IE.onlineOn = !!on; IE.fixMissionSpots(); if (IE.onlineGroup) IE.onlineGroup.visible = !!on; };

// ---------- Flughafen ----------
function buildAirport(scene) {
  const A = IE.airport, y = A.h, M = IE.mat;
  const ground = new T.Mesh(new T.PlaneGeometry(A.hw * 2 + 20, A.hd * 2 + 20), new T.MeshLambertMaterial({ color: 0x8b9a6a, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(A.x, y + 0.04, A.z); ground.receiveShadow = true; scene.add(ground);
  const rwTex = canvasTex(128, 1024, (c, w, h) => {
    c.fillStyle = '#36383b'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { const v = 45 + Math.random() * 25; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.fillStyle = '#f1f1ea'; for (let i = 60; i < h - 60; i += 36) c.fillRect(w / 2 - 2, i, 4, 20);
    c.fillRect(4, 0, 4, h); c.fillRect(w - 8, 0, 4, h);
    for (let k = 0; k < 8; k++) { c.fillRect(12 + k * 13, 8, 8, 36); c.fillRect(12 + k * 13, h - 44, 8, 36); }
    c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.fillText('18', w / 2, 80); c.save(); c.translate(w / 2, h - 80); c.rotate(Math.PI); c.fillText('36', 0, 0); c.restore();
  });
  const rx = A.x + 20, rlen = A.hd * 2 - 20;
  const rw = new T.Mesh(new T.PlaneGeometry(30, rlen), new T.MeshLambertMaterial({ map: rwTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  rw.rotation.x = -Math.PI / 2; rw.position.set(rx, y + 0.08, A.z); rw.receiveShadow = true; scene.add(rw);
  const apron = new T.Mesh(new T.PlaneGeometry(60, 200), new T.MeshLambertMaterial({ color: 0x6e6f70, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  apron.rotation.x = -Math.PI / 2; apron.position.set(A.x - 40, y + 0.08, A.z + 20); scene.add(apron);
  // Randbefeuerung
  const lm = new T.MeshBasicMaterial({ color: 0xffd27a });
  for (let z = -rlen / 2; z <= rlen / 2; z += 30) for (const s of [-1, 1]) add(scene, new T.BoxGeometry(0.4, 0.3, 0.4), lm, rx + s * 16, y + 0.2, A.z + z, 0, false);
  // Terminal (Glas) + Tower
  const tx = A.x - 62, tz = A.z + 60;
  add(scene, new T.BoxGeometry(14, 10, 70), new T.MeshLambertMaterial({ color: 0xe9e6de }), tx, y + 5, tz);
  add(scene, new T.BoxGeometry(14.4, 6, 66), M.glass, tx + 0.2, y + 5, tz);
  add(scene, new T.BoxGeometry(16, 0.8, 72), new T.MeshLambertMaterial({ color: 0x2f5f8a }), tx, y + 10.4, tz);
  const sign = new T.Mesh(new T.PlaneGeometry(26, 4), new T.MeshBasicMaterial({ map: signTex('AEROPORTO', '#2f5f8a', '#ffffff') }));
  sign.position.set(tx + 7.3, y + 12.8, tz); sign.rotation.y = Math.PI / 2; scene.add(sign);
  IE.addBox(tx - 7, tz - 35, tx + 7, tz + 35, y + 10.8);
  add(scene, new T.CylinderGeometry(2.5, 3, 26, 12), new T.MeshLambertMaterial({ color: 0xe9e6de }), tx, y + 13, tz - 60);
  add(scene, new T.CylinderGeometry(5, 4, 5, 12), M.glass, tx, y + 28, tz - 60); add(scene, new T.CylinderGeometry(5.4, 5.4, 0.8, 12), M.dark, tx, y + 30.8, tz - 60);
  IE.addBox(tx - 4, tz - 64, tx + 4, tz - 56, y + 31);
  // Dein Hangar (offen zur Rollbahn)
  const hx = A.x - 45, hz = A.z - 110, hm = new T.MeshLambertMaterial({ color: 0xb7bcc2, side: T.DoubleSide });
  const hg = new T.CylinderGeometry(20, 20, 40, 24, 1, true, 0, Math.PI); hg.rotateZ(Math.PI / 2); hg.rotateY(Math.PI / 2);
  const roof = add(scene, hg, hm, hx, y, hz); roof.rotation.y = Math.PI / 2;
  const back = add(scene, new T.CircleGeometry(20, 24, 0, Math.PI), hm, hx - 20, y, hz); back.rotation.y = Math.PI / 2;
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshLambertMaterial({ color: 0x9a9c9f, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(hx, y + 0.1, hz); scene.add(floor);
  const hs = new T.Mesh(new T.PlaneGeometry(24, 4), new T.MeshBasicMaterial({ map: signTex('HANGAR MORETTI', '#1b1b1b', '#d9b45a') }));
  hs.position.set(hx + 20.2, y + 22, hz); hs.rotation.y = Math.PI / 2; scene.add(hs);
  for (const s of [-1, 1]) IE.addBox(hx - 20, hz + s * 20 - 0.5, hx + 20, hz + s * 20 + 0.5, y + 20);
  IE.addBox(hx - 21, hz - 20, hx - 20, hz + 20, y + 20);
  const shop = { type: 'plane', city: 'neapel', x: hx - 8, z: hz, mx: hx - 8, mz: hz, fixed: true };
  shop.marker = marker(scene, shop.x, y, shop.z, 0xf2c230);
  shop.spawn = { x: hx + 6, z: hz, rot: Math.PI / 2, y };
  IE.shops.push(shop);
  A.planeSlots = [{ x: A.x - 30, z: A.z + 115, rot: Math.PI / 2 }, { x: A.x - 30, z: A.z + 92, rot: Math.PI / 2 }];
  A.takeoff = { x: rx, z: A.z + rlen / 2 - 30, rot: Math.PI };
}

// ---------- Innenräume ----------
IE.interiors = {};
function buildInteriors(scene) {
  const types = ['armeria', 'autosalone', 'nautica', 'werkstatt', 'buero', 'galerie', 'bank', 'villa', 'casino'];
  const pal = {
    armeria:   { floor: 0x4a3c30, wall: 0x6e5a48, w: 22, d: 16, name: 'Armeria' },
    autosalone:{ floor: 0xe8e8e8, wall: 0xf4f4f2, w: 36, d: 26, name: 'Autosalone' },
    nautica:   { floor: 0xcfd9de, wall: 0xe8f0f4, w: 30, d: 22, name: 'Nautica' },
    werkstatt: { floor: 0x5a5a58, wall: 0x8a8578, w: 28, d: 20, name: 'Marcos Werkstatt' },
    buero:     { floor: 0x6b5644, wall: 0xd8d0c2, w: 18, d: 14, name: 'Sofias Büro' },
    galerie:   { floor: 0xd9cfbf, wall: 0xf6f3ec, w: 30, d: 22, name: 'Galleria d\'Arte' },
    bank:      { floor: 0xcfc6b4, wall: 0xe9e1cf, w: 30, d: 22, name: 'Banca Privata' },
    villa:     { floor: 0xe9e1cf, wall: 0xf6f1e6, w: 44, d: 32, name: 'Villa' },
    casino:    { floor: 0x5a0f18, wall: 0x2a1a14, w: 36, d: 26, name: 'Casino' }
  };
  types.forEach((t, i) => {
    const P = pal[t], ox = 2900 + (i % 3) * 80, oz = -200 + Math.floor(i / 3) * 80, y = 300, W = P.w, D = P.d, H = 6;
    const fm = new T.MeshLambertMaterial({ color: P.floor }), wm = new T.MeshLambertMaterial({ color: P.wall });
    add(scene, new T.BoxGeometry(W, 1, D), fm, ox, y - 0.5, oz, 0, false); IE.addBox(ox - W / 2, oz - D / 2, ox + W / 2, oz + D / 2, y, y - 1);
    add(scene, new T.BoxGeometry(W, 0.4, D), wm, ox, y + H + 0.2, oz, 0, false); IE.addBox(ox - W / 2, oz - D / 2, ox + W / 2, oz + D / 2, y + H + 0.4, y + H);
    const wall = (w, d, px, pz) => { add(scene, new T.BoxGeometry(w, H, d), wm, px, y + H / 2, pz, 0, false); IE.addBox(px - w / 2, pz - d / 2, px + w / 2, pz + d / 2, y + H, y - 1); };
    wall(W, 0.4, ox, oz - D / 2); wall(0.4, D, ox - W / 2, oz); wall(0.4, D, ox + W / 2, oz);
    wall(W / 2 - 1.5, 0.4, ox - W / 4 - 0.75, oz + D / 2); wall(W / 2 - 1.5, 0.4, ox + W / 4 + 0.75, oz + D / 2);
    // Tür (dunkel) + Lampen
    add(scene, new T.BoxGeometry(3, 3.2, 0.2), new T.MeshBasicMaterial({ color: 0x1a1410 }), ox, y + 1.6, oz + D / 2 + 0.25, 0, false);
    const lampM = new T.MeshBasicMaterial({ color: 0xfff3d6 });
    for (let lx = -W / 2 + 5; lx < W / 2; lx += 8) for (let lz = -D / 2 + 5; lz < D / 2; lz += 8) add(scene, new T.BoxGeometry(2.2, 0.1, 1), lampM, ox + lx, y + H - 0.05, oz + lz, 0, false);
    const it = { type: t, name: P.name, x: ox, z: oz, y, W, D, door: { x: ox, z: oz + D / 2 - 1.8 }, counter: { x: ox, z: oz - D / 2 + 4 }, item: { x: ox + W / 2 - 4, z: oz - D / 2 + 3 }, spots: [] };
    for (let k = 0; k < 8; k++) it.spots.push({ x: ox + (IE.hash(k, i) - 0.5) * (W - 6), z: oz + (IE.hash(k, i + 9) - 0.5) * (D - 8) - 1 });
    const box = (w, h, d, c, px, pz, py) => { const m = add(scene, new T.BoxGeometry(w, h, d), typeof c === 'number' ? new T.MeshLambertMaterial({ color: c }) : c, ox + px, y + (py || 0) + h / 2, oz + pz, 0, false); IE.addBox(ox + px - w / 2, oz + pz - d / 2, ox + px + w / 2, oz + pz + d / 2, y + (py || 0) + h, y - 1); return m; };
    const deco = (w, h, d, c, px, pz, py) => add(scene, new T.BoxGeometry(w, h, d), typeof c === 'number' ? new T.MeshLambertMaterial({ color: c }) : c, ox + px, y + (py || 0) + h / 2, oz + pz, 0, false);
    const keeper = look => { const h = IE.makeHuman(look); h.group.position.set(ox, y, oz - D / 2 + 1.6); scene.add(h.group); };
    if (t === 'armeria') {
      box(10, 1.1, 1.2, 0x3a2a1e, 0, -D / 2 + 3); keeper({ pants: 0x222222, jacket: 0x5a4a3a, shirt: 0xdddddd, skin: 0xc8946c, hair: 0x222222 });
      for (let k = 0; k < 6; k++) for (let r = 0; r < 3; r++) deco(1.6 - r * 0.3, 0.18, 0.12, 0x151515, -W / 2 + 3 + k * 3.2, -D / 2 + 0.35, 1.6 + r * 0.9);
      for (const s of [-1, 1]) for (let r = 0; r < 4; r++) deco(0.12, 0.2, 2.2, 0x151515, s * (W / 2 - 0.4), -2 + r * 1.5, 2.2);
      deco(W, 0.4, 0.05, 0xc8372d, 0, -D / 2 + 0.25, 4.5);
    } else if (t === 'autosalone' || t === 'nautica') {
      box(4, 1, 1.5, 0xffffff, 0, -D / 2 + 3); keeper({ pants: 0x1c2333, jacket: 0x1c2333, shirt: 0xffffff, skin: 0xe9c3a6, hair: 0x3a2a1a });
      const items = t === 'autosalone' ? ['veloce', 'toro', 'spider'] : ['riva', 'jetski', 'offshore'];
      items.forEach((id, k) => {
        const m = t === 'autosalone' ? IE.makeCar(IE.carById[id].kind, IE.carById[id].color) : IE.makeBoat(IE.boatById[id]);
        m.group.position.set(ox - W / 2 + 7 + k * ((W - 14) / 2), y + (t === 'nautica' ? 0.6 : 0), oz + 2); m.group.rotation.y = 0.6; scene.add(m.group);
        const ped = new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 0.15, 24), new T.MeshLambertMaterial({ color: 0x333333 })); ped.position.set(m.group.position.x, y + 0.07, m.group.position.z); scene.add(ped);
        IE.addBox(m.group.position.x - 2.4, m.group.position.z - 2.4, m.group.position.x + 2.4, m.group.position.z + 2.4, y + 1.2, y - 1);
      });
    } else if (t === 'werkstatt') {
      const car = IE.makeCar('sport', 0xf2c230); car.group.position.set(ox - 6, y + 1.8, oz - 2); scene.add(car.group);
      for (const s of [-1, 1]) deco(0.3, 1.8, 0.3, 0xc8372d, -6 + s * 1.4, -2);
      box(6, 1, 1, 0x7a2a1e, W / 2 - 4, -D / 2 + 1.5); for (let k = 0; k < 6; k++) deco(0.3, 0.6, 0.1, 0x999999, W / 2 - 6.5 + k, -D / 2 + 0.3, 2);
      deco(4, 0.02, 3, 0x2a2a28, 5, 2, 0.01);
    } else if (t === 'buero') {
      box(3.6, 0.9, 1.6, 0x3a2a20, 0, -2); deco(0.9, 0.6, 0.06, new T.MeshBasicMaterial({ color: 0x3aa0ff }), -0.7, -2.5, 1.1); deco(0.9, 0.6, 0.06, new T.MeshBasicMaterial({ color: 0x48e07a }), 0.7, -2.5, 1.1);
      const sof = IE.makeHuman(IE.chars.sofia); sof.group.position.set(ox, y, oz - 3.6); scene.add(sof.group);
      box(4, 2.2, 0.6, 0x5a4434, -W / 2 + 2.5, -D / 2 + 0.4); deco(3, 1.6, 0.05, 0xf0f0e8, W / 2 - 3, -D / 2 + 0.3, 1.2);
    } else if (t === 'galerie') {
      const cols = [0xc8372d, 0x1b3d6e, 0xe9c27a, 0x2f9a5c, 0x6b4f8a, 0xd98a4f];
      for (let k = 0; k < 6; k++) { const px = -W / 2 + 4 + k * ((W - 8) / 5); deco(2.6, 1.8, 0.1, 0x8a6a2a, px, -D / 2 + 0.3, 2); deco(2.2, 1.4, 0.12, cols[k], px, -D / 2 + 0.32, 2.2); }
      for (const s of [-1, 1]) { box(1, 1.2, 1, 0xf6f3ec, s * 5, 1); deco(0.6, 0.9, 0.6, 0xd6b04a, s * 5, 1, 1.2); }
    } else if (t === 'bank') {
      for (let k = -1; k <= 1; k++) box(5, 1.2, 1, 0x8a6a4a, k * 7, -2);
      const vault = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, 0.5, 24), IE.mat.gold); vault.rotation.x = Math.PI / 2; vault.position.set(ox + W / 2 - 4, y + 2.6, oz - D / 2 + 0.4); scene.add(vault);
      for (let k = 0; k < 4; k++) deco(0.5, 0.3, 0.4, IE.mat.gold, W / 2 - 5 + (k % 2) * 0.6, -D / 2 + 3, (k >> 1) * 0.3);
    } else if (t === 'villa') {
      // Wohnbereich: Sofas, Teppich, Couchtisch, großer Fernseher
      deco(12, 0.02, 8, 0x7a1a24, -8, 1, 0.01); box(7, 0.9, 2, 0xe9e1cc, -8, 4.5); box(2, 0.9, 5, 0xe9e1cc, -12.5, 1.5); box(2, 0.9, 5, 0xe9e1cc, -3.5, 1.5);
      deco(3.5, 0.5, 2, 0x3a2a20, -8, 1); deco(7, 3.6, 0.15, new T.MeshBasicMaterial({ color: 0x0a0a0c }), -8, -D / 2 + 0.3, 1.2); deco(6.6, 3.2, 0.05, new T.MeshBasicMaterial({ color: 0x1f4fb0 }), -8, -D / 2 + 0.4, 1.4);
      // Bar mit Hockern
      box(8, 1.1, 1.2, 0x2a1a14, 10, -6); deco(8, 0.08, 1.4, IE.mat.marble, 10, -6, 1.1); for (let k = 0; k < 4; k++) deco(0.6, 0.8, 0.6, 0xd6b04a, 7 + k * 2, -4.6);
      for (let k = 0; k < 6; k++) deco(0.25, 0.6, 0.25, [0x2e8b57, 0x8a2a1e, 0xd6b04a][k % 3], 7.5 + k, -D / 2 + 0.5, 1.6);
      deco(9, 2.2, 0.4, 0x3a2a20, 10, -D / 2 + 0.3, 0.6);
      // Flügel (Klavier)
      box(2.4, 1, 3, 0x0b0b0d, 14, 5); deco(1, 0.8, 0.6, 0x0b0b0d, 14, 3);
      // Esstisch
      box(6, 0.9, 2.4, 0x5a3a20, 2, -2); for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) deco(0.7, 1.2, 0.7, 0xe9e1cc, 0 + k * 2, -2 + sd * 1.8);
      // Schlafbereich (Ausruhen) in der Ecke = it.item
      box(4, 0.8, 5, 0xf6f1e6, W / 2 - 4, -D / 2 + 4); deco(4, 0.4, 1, 0x7a1a24, W / 2 - 4, -D / 2 + 1.8, 0.8);
      // Kronleuchter, Gemälde, Pflanzen, goldene Statue
      for (const cx of [-8, 8]) { const ch = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ color: 0xfff1c8 })); ch.position.set(ox + cx, y + H - 1.4, oz); scene.add(ch); }
      for (let k = 0; k < 3; k++) deco(3, 2, 0.1, [0x8a6a2a, 0x4a6a8a, 0x6a2a2a][k], -14 + k * 6, -D / 2 + 0.3, 2.2 + 1.6);
      for (const [px, pz] of [[-W / 2 + 1.5, D / 2 - 2], [W / 2 - 1.5, D / 2 - 2], [-W / 2 + 1.5, -D / 2 + 2]]) { deco(1, 1, 1, 0x7a5a3a, px, pz); deco(1.6, 2.2, 1.6, 0x3f7a35, px, pz, 1); }
      box(1.2, 1, 1.2, IE.mat.marble, 0, 8); deco(0.8, 2, 0.8, IE.mat.gold, 0, 8, 1);
      // Panoramafenster (Front)
      for (const sd of [-1, 1]) deco(W / 2 - 6, 3.6, 0.1, new T.MeshBasicMaterial({ color: 0x9fd4ee }), sd * (W / 4 + 1.5), D / 2 - 0.3, 1.4);
    } else if (t === 'casino') {
      for (let k = 0; k < 3; k++) { box(4, 0.9, 2.4, 0x1e6a3a, -10 + k * 10, -1); }
      for (let k = 0; k < 8; k++) { box(1.2, 2, 0.9, 0x2a2a2a, -W / 2 + 2 + k * 2, -D / 2 + 1); deco(0.9, 0.6, 0.05, new T.MeshBasicMaterial({ color: [0xff3b30, 0xf2c230, 0x3aa0ff][k % 3] }), -W / 2 + 2 + k * 2, -D / 2 + 1.47, 1.1); }
      box(8, 1.1, 1.2, 0x5a0f18, W / 2 - 6, 4);
    }
    marker(scene, it.door.x, y, it.door.z, 0x9fd3ff, 0.9);
    if (t === 'armeria' || t === 'autosalone' || t === 'nautica') marker(scene, it.counter.x, y, it.counter.z + 1.8, 0xf2c230, 0.9);
    IE.interiors[t] = it;
  });
}

// ---------- Schiffswracks ----------
function buildWrecks(scene) {
  IE.wrecks = [];
  const rust = new T.MeshLambertMaterial({ color: 0x5a3e2b }), rust2 = new T.MeshLambertMaterial({ color: 0x3f3a33 });
  const chestM = new T.MeshStandardMaterial({ color: 0x6b4222, roughness: 0.8 }), goldM = new T.MeshStandardMaterial({ color: 0xf2c94c, emissive: 0x8a6a10, metalness: 0.8, roughness: 0.3 });
  const hs = new T.Shape(); hs.moveTo(-14, -4); hs.lineTo(8, -4); hs.quadraticCurveTo(15, -2, 16, 0); hs.quadraticCurveTo(15, 2, 8, 4); hs.lineTo(-14, 4); hs.closePath();
  const hull = new T.ExtrudeGeometry(hs, { depth: 6, bevelEnabled: false }); hull.rotateX(-Math.PI / 2);
  let tries = 0, id = 0;
  while (IE.wrecks.length < 14 && tries++ < 40000) {
    const x = G.x0 + rnd() * G.w, z = G.z0 + rnd() * G.d, h = rawH(x, z);
    if (h > -12 || h < -36) continue;
    if (IE.wrecks.some(w => Math.hypot(w.x - x, w.z - z) < 380)) continue;
    const grp = new T.Group(); grp.position.set(x, h - 1.2, z); grp.rotation.set(0, rnd() * 6.28, 0.35 + rnd() * 0.3);
    const hm = new T.Mesh(hull, rust); grp.add(hm);
    const cab = new T.Mesh(new T.BoxGeometry(6, 4, 5), rust2); cab.position.set(-7, 8, 0); grp.add(cab);
    const mast = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 12, 6), rust2); mast.position.set(3, 11, 0); mast.rotation.z = 0.5; grp.add(mast);
    scene.add(grp);
    const cx = x + 6 * Math.cos(id), cz = z + 6 * Math.sin(id), cy = rawH(cx, cz);
    const chest = new T.Group(); chest.position.set(cx, cy + 0.2, cz);
    const b = new T.Mesh(new T.BoxGeometry(1.4, 0.8, 0.9), chestM); b.position.y = 0.4; chest.add(b);
    const lid = new T.Mesh(new T.BoxGeometry(1.45, 0.25, 0.95), goldM); lid.position.y = 0.92; chest.add(lid);
    const glow = new T.Mesh(new T.SphereGeometry(1.6, 12, 8), new T.MeshBasicMaterial({ color: 0xffd86b, transparent: true, opacity: 0.18, depthWrite: false })); glow.position.y = 0.6; chest.add(glow);
    scene.add(chest);
    IE.wrecks.push({ id: id++, x, z, cx, cy, cz, chest, amount: 8000 + Math.round(rnd() * 22) * 1000 });
  }
}

// ---------- Natur ----------
function buildNature(scene) {
  const cyp = [], pine = [], round = [];
  let tries = 0;
  while ((cyp.length + pine.length + round.length) < 9000 && tries++ < 60000) {
    const x = G.x0 + rnd() * G.w, z = G.z0 + rnd() * G.d, h = rawH(x, z);
    if (h < 2.5 || h > 150) continue;
    if (IE.nearRoad(x, z)) continue;
    let inCity = false; for (const c of IE.cities) if (Math.hypot(x - c.x, z - c.z) < c.r + 25) { inCity = true; break; }
    if (inCity) continue;
    if (IE.flatZones.some(f => Math.abs(x - f.x) < f.hw + 70 && Math.abs(z - f.z) < f.hd + 70)) continue;
    const n = fbm(x * 0.01 + 50, z * 0.01, 2); if (n < 0.42) continue;
    // Gruppen
    const cnt = 1 + (rnd() * 6 | 0);
    for (let i = 0; i < cnt; i++) {
      const px = x + (rnd() - 0.5) * 30, pz = z + (rnd() - 0.5) * 30, ph = rawH(px, pz); if (ph < 2 || IE.nearRoad(px, pz)) continue;
      if (IE.collAt(px, pz).some(b => b.t === 'box' && (b.online || b.top > rawH(px, pz) + 1) && px > b.minx - 3 && px < b.maxx + 3 && pz > b.minz - 3 && pz < b.maxz + 3)) continue;
      const s = 0.7 + rnd() * 0.7;
      const tusc = z > -900 && z < -100 && x > -800 && x < 300; // grob Toskana/Umbrien
      if (ph > 55) round.push({ x: px, z: pz, y: ph, s: s * 1.1, dark: true });
      else if (tusc && rnd() < 0.6) cyp.push({ x: px, z: pz, y: ph, s });
      else if (z > 0 && rnd() < 0.5) pine.push({ x: px, z: pz, y: ph, s });
      else round.push({ x: px, z: pz, y: ph, s });
    }
  }
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), col = new T.Color();
  const mk = (geo, mat, arr, f) => { const im = new T.InstancedMesh(geo, mat, arr.length); arr.forEach((t, i) => { f(t); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); if (im.instanceColor !== undefined || true) { col.setHSL(0.24 + IE.hash(i, 3) * 0.06, 0.4, (t.dark ? 0.18 : 0.26) + IE.hash(i, 7) * 0.08); im.setColorAt(i, col); } }); im.castShadow = true; scene.add(im); };
  const cg = new T.ConeGeometry(1.3, 11, 7); cg.translate(0, 5.5, 0);
  mk(cg, new T.MeshLambertMaterial({ color: 0xffffff }), cyp, t => { ps.set(t.x, t.y - 0.3, t.z); sc.set(t.s, t.s, t.s); });
  const tg = new T.CylinderGeometry(0.25, 0.35, 1, 6); tg.translate(0, 0.5, 0);
  const trunks = pine.concat(round);
  const im = new T.InstancedMesh(tg, new T.MeshLambertMaterial({ color: 0x5a4330 }), trunks.length);
  trunks.forEach((t, i) => { const pin = i < pine.length; ps.set(t.x, t.y - 0.3, t.z); sc.set(t.s, (pin ? 8 : 3) * t.s, t.s); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); }); scene.add(im);
  const pg = new T.SphereGeometry(1, 9, 6); pg.scale(4, 1.3, 4);
  mk(pg, new T.MeshLambertMaterial({ color: 0xffffff }), pine, t => { ps.set(t.x, t.y + 8 * t.s, t.z); sc.set(t.s, t.s, t.s); });
  const rg = new T.IcosahedronGeometry(2.6, 0);
  mk(rg, new T.MeshLambertMaterial({ color: 0xffffff }), round, t => { ps.set(t.x, t.y + 4 * t.s, t.z); sc.set(t.s, t.s * 1.1, t.s); });
}
function buildClouds(scene) {
  const mat = new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, emissive: 0x666666 });
  const geo = new T.IcosahedronGeometry(1, 1);
  const parts = [];
  for (let i = 0; i < 70; i++) {
    const x = G.x0 + rnd() * G.w, z = G.z0 + rnd() * G.d, y = 380 + rnd() * 160;
    for (let k = 0; k < 6; k++) parts.push({ x: x + (rnd() - 0.5) * 120, y: y + rnd() * 20, z: z + (rnd() - 0.5) * 60, s: 25 + rnd() * 35 });
  }
  const im = new T.InstancedMesh(geo, mat, parts.length); const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
  parts.forEach((p, i) => { ps.set(p.x, p.y, p.z); sc.set(p.s * 1.6, p.s * 0.6, p.s); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); });
  scene.add(im);
}


})();
