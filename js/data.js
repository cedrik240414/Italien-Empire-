// ===== ITALIEN EMPIRE – Daten: Geografie, Städte, Shops, Fahrzeuge, Waffen, Story =====
'use strict';
window.IE = window.IE || {};

// Projektion: Längen-/Breitengrad -> Weltkoordinaten (1 Einheit ≈ 1 Meter im Spiel)
IE.K = 400;
IE.LONS = Math.cos(42 * Math.PI / 180);
IE.geo = function (lon, lat) {
  return { x: (lon - 12.5) * IE.K * IE.LONS, z: (42 - lat) * IE.K };
};

// Küstenlinien (lon, lat)
IE.coastRaw = {
  festland: [
    [7.53,43.78],[8.0,43.88],[8.4,44.2],[8.93,44.41],[9.4,44.25],[9.85,44.07],[10.25,43.85],[10.3,43.55],
    [10.52,42.93],[11.1,42.55],[11.6,42.3],[11.8,42.1],[12.25,41.75],[12.6,41.45],[13.05,41.23],[13.55,41.22],
    [14.05,40.82],[14.25,40.8],[14.33,40.62],[14.75,40.65],[14.95,40.35],[15.25,40.0],[15.65,40.0],[15.8,39.6],
    [16.05,39.1],[16.2,38.75],[15.88,38.68],[15.65,38.25],[15.65,37.95],[16.05,37.92],[16.55,38.4],[16.6,38.8],
    [17.15,39.0],[17.1,39.4],[16.6,39.75],[16.9,40.1],[17.2,40.45],[17.9,40.3],[18.0,40.05],[18.4,39.8],
    [18.52,40.15],[18.0,40.65],[17.4,40.9],[16.87,41.13],[16.2,41.35],[15.9,41.6],[16.2,41.9],[15.6,41.93],
    [15.1,41.95],[14.7,42.1],[14.2,42.45],[13.9,42.9],[13.6,43.55],[13.0,43.85],[12.6,44.05],[12.3,44.5],
    [12.55,44.95],[12.3,45.25],[12.38,45.42],[12.75,45.55],[13.1,45.65],[13.77,45.65],[13.6,46.0],[13.7,46.5],
    [12.7,46.65],[12.3,47.05],[11.5,47.0],[10.5,46.85],[10.15,46.6],[9.5,46.4],[9.0,46.45],[8.6,46.1],
    [8.45,46.45],[7.9,45.95],[7.0,45.9],[6.8,45.7],[7.1,45.2],[6.65,45.0],[7.0,44.25],[7.65,44.15]
  ],
  sizilien: [
    [12.4,37.8],[12.5,38.05],[13.0,38.15],[13.35,38.17],[14.0,38.03],[14.6,38.07],[15.1,38.15],[15.6,38.27],
    [15.25,37.8],[15.1,37.5],[15.25,37.05],[15.1,36.7],[14.5,36.8],[13.9,37.1],[13.2,37.5],[12.6,37.6]
  ],
  sardinien: [
    [8.2,41.0],[9.2,41.25],[9.65,40.9],[9.8,40.4],[9.65,39.95],[9.6,39.4],[9.1,39.15],[8.6,38.9],
    [8.4,39.1],[8.4,39.7],[8.5,40.3],[8.2,40.6]
  ]
};
IE.coast = {};
for (const k in IE.coastRaw) IE.coast[k] = IE.coastRaw[k].map(p => IE.geo(p[0], p[1]));

// Gebirge (Höhenzüge)
IE.ridges = [
  { name: 'Alpen', h: 260, w: 150, pts: [[7.0,44.4],[7.15,45.3],[7.6,45.85],[8.6,46.25],[9.6,46.3],[10.6,46.55],[11.5,46.75],[12.5,46.5],[13.3,46.35]] },
  { name: 'Apennin', h: 120, w: 110, pts: [[8.6,44.45],[9.6,44.4],[10.6,44.15],[11.6,43.75],[12.6,43.1],[13.4,42.45],[14.2,41.75],[15.1,41.0],[15.7,40.4],[16.1,39.6],[16.2,38.6]] },
  { name: 'Sizilien', h: 70, w: 90, pts: [[13.0,37.85],[14.0,37.75],[14.8,37.95]] },
  { name: 'Sardinien', h: 70, w: 80, pts: [[9.2,40.9],[9.3,40.1],[9.0,39.5]] }
];
IE.volcanoes = [
  { name: 'Ätna', lon: 14.99, lat: 37.75, h: 230, r: 200 },
  { name: 'Vesuv', lon: 14.62, lat: 40.86, h: 120, r: 110 }
];

// Städte (r = Radius der bebauten Fläche in Metern)
IE.cities = [
  { id: 'neapel',  name: 'Neapel',  lon: 14.27, lat: 40.86, r: 230, base: 4,  style: 'sued', landmark: 'castel' },
  { id: 'rom',     name: 'Rom',     lon: 12.50, lat: 41.90, r: 280, base: 6,  style: 'rom',  landmark: 'kolosseum' },
  { id: 'mailand', name: 'Mailand', lon: 9.19,  lat: 45.46, r: 270, base: 5,  style: 'nord', landmark: 'duomo' },
  { id: 'florenz', name: 'Florenz', lon: 11.25, lat: 43.77, r: 200, base: 6,  style: 'toskana', landmark: 'kuppel' },
  { id: 'venedig', name: 'Venedig', lon: 12.27, lat: 45.47, r: 170, base: 2.5,style: 'venedig', landmark: 'campanile' },
  { id: 'bari',    name: 'Bari',    lon: 16.84, lat: 41.10, r: 170, base: 3,  style: 'sued', landmark: 'teatro' },
  { id: 'palermo', name: 'Palermo', lon: 13.34, lat: 38.11, r: 200, base: 3,  style: 'sued', landmark: 'kathedrale' },
  { id: 'genua',   name: 'Genua',   lon: 8.93,  lat: 44.45, r: 170, base: 4,  style: 'nord', landmark: 'leuchtturm' },
  { id: 'turin',   name: 'Turin',   lon: 7.69,  lat: 45.07, r: 180, base: 6,  style: 'nord', landmark: 'mole' },
  { id: 'bologna', name: 'Bologna', lon: 11.34, lat: 44.49, r: 160, base: 5,  style: 'toskana', landmark: 'tuerme' },
  { id: 'pisa',    name: 'Pisa',    lon: 10.42, lat: 43.71, r: 110, base: 3,  style: 'toskana', landmark: 'schieferturm' },
  { id: 'cagliari',name: 'Cagliari',lon: 9.11,  lat: 39.24, r: 140, base: 3,  style: 'sued', landmark: 'bastion' },
  { id: 'catania', name: 'Catania', lon: 15.07, lat: 37.52, r: 150, base: 3,  style: 'sued', landmark: 'kathedrale' },
  { id: 'reggio',  name: 'Reggio Calabria', lon: 15.68, lat: 38.13, r: 110, base: 3, style: 'sued', landmark: null },
  { id: 'pescara', name: 'Pescara', lon: 14.19, lat: 42.44, r: 110, base: 3,  style: 'sued', landmark: null },
  { id: 'ancona',  name: 'Ancona',  lon: 13.48, lat: 43.6,  r: 110, base: 3,  style: 'toskana', landmark: null },
  { id: 'sanremo', name: 'Sanremo', lon: 7.85,  lat: 43.84, r: 100, base: 3,  style: 'nord', landmark: 'casino' },
  { id: 'verona',  name: 'Verona',  lon: 10.99, lat: 45.44, r: 130, base: 5,  style: 'nord', landmark: 'arena' }
];
IE.cities.forEach(c => { const p = IE.geo(c.lon, c.lat); c.x = p.x; c.z = p.z; });
IE.cityById = {}; IE.cities.forEach(c => IE.cityById[c.id] = c);

// Straßen (Autostrade) – Verbindungen zwischen Städten, optional mit Zwischenpunkten
IE.roadDefs = [
  ['mailand','turin'], ['mailand','genua'], ['turin','genua'], ['genua','sanremo'],
  ['mailand','verona'], ['verona','venedig'], ['verona','bologna'], ['mailand','bologna',[[10.3,44.8]]],
  ['bologna','florenz'], ['florenz','pisa'], ['pisa','genua',[[10.0,44.05]]], ['florenz','rom',[[11.9,43.0]]],
  ['bologna','ancona',[[12.5,44.0]]], ['ancona','pescara'], ['pescara','bari',[[15.4,41.7]]],
  ['rom','pescara',[[13.4,42.2]]], ['rom','neapel',[[13.6,41.4]]], ['neapel','bari',[[15.1,41.5],[15.6,41.55]]], ['neapel','flughafen'],
  ['neapel','reggio',[[15.4,40.3],[16.15,39.3],[16.0,38.6]]],
  ['palermo','catania',[[14.2,37.7]]], ['catania','reggio',[[15.4,38.15]]], ['palermo','reggio',[[14.6,38.05]]]
];

// Shops: type weapon | car | heli. Offsets relativ zum Stadtzentrum
IE.shops = [
  { type: 'weapon', city: 'neapel',  dx: 60,  dz: 40 },
  { type: 'car',    city: 'neapel',  dx: -90, dz: 20 },
  { type: 'heli',   city: 'neapel',  dx: 150, dz: -120 },
  { type: 'weapon', city: 'rom',     dx: -70, dz: 60 },
  { type: 'car',    city: 'rom',     dx: 110, dz: 70 },
  { type: 'heli',   city: 'rom',     dx: -180, dz: -150 },
  { type: 'weapon', city: 'mailand', dx: 80,  dz: -60 },
  { type: 'car',    city: 'mailand', dx: -100,dz: 80 },
  { type: 'heli',   city: 'mailand', dx: 190, dz: 150 },
  { type: 'weapon', city: 'florenz', dx: 50,  dz: 70 },
  { type: 'heli',   city: 'florenz', dx: -140,dz: 110 },
  { type: 'car',    city: 'venedig', dx: -40, dz: 110 },
  { type: 'heli',   city: 'venedig', dx: -130,dz: 30 },
  { type: 'weapon', city: 'bari',    dx: -50, dz: 50 },
  { type: 'heli',   city: 'bari',    dx: -120,dz: 90 },
  { type: 'weapon', city: 'palermo', dx: 60,  dz: 50 },
  { type: 'car',    city: 'palermo', dx: -80, dz: 40 },
  { type: 'heli',   city: 'palermo', dx: 130, dz: 120 },
  { type: 'car',    city: 'turin',   dx: 70,  dz: 50 },
  { type: 'weapon', city: 'genua',   dx: -40, dz: -40 },
  { type: 'heli',   city: 'genua',   dx: 110, dz: -90 },
  { type: 'car',    city: 'bologna', dx: 60,  dz: 60 },
  { type: 'heli',   city: 'cagliari',dx: 90,  dz: -60 },
  { type: 'weapon', city: 'cagliari',dx: -40, dz: 40 },
  { type: 'heli',   city: 'catania', dx: 90,  dz: -70 },
  { type: 'heli',   city: 'reggio',  dx: 60,  dz: 50 },
  { type: 'luxury', city: 'neapel',  dx: -160, dz: -70 },
  { type: 'luxury', city: 'mailand', dx: 130, dz: 130 },
  { type: 'luxury', city: 'rom',     dx: 160, dz: -60 },
  // eigene Geschäfte (kaufen -> passives Einkommen)
  { type: 'biz', id: 'b_nap_pizza',  biz: 'pizzeria',   city: 'neapel',  dx: 120,  dz: 120 },
  { type: 'biz', id: 'b_nap_rist',   biz: 'ristorante', city: 'neapel',  dx: -40,  dz: 150 },
  { type: 'biz', id: 'b_rom_rist',   biz: 'ristorante', city: 'rom',     dx: -40,  dz: -150 },
  { type: 'biz', id: 'b_rom_hotel',  biz: 'hotel',      city: 'rom',     dx: 60,   dz: -150 },
  { type: 'biz', id: 'b_mil_club',   biz: 'nightclub',  city: 'mailand', dx: -160, dz: -40 },
  { type: 'biz', id: 'b_flo_gelato', biz: 'gelateria',  city: 'florenz', dx: -60,  dz: -80 },
  { type: 'biz', id: 'b_pal_werk',   biz: 'werkstatt',  city: 'palermo', dx: -120, dz: -60 },
  { type: 'biz', id: 'b_bol_pizza',  biz: 'pizzeria',   city: 'bologna', dx: -60,  dz: -60 },
  { type: 'biz', id: 'b_ven_hotel',  biz: 'hotel',      city: 'venedig', dx: 60,   dz: -60 },
  { type: 'biz', id: 'b_gen_rist',   biz: 'ristorante', city: 'genua',   dx: 60,   dz: 60 }
];

IE.weapons = [
  { id: 'faust',   name: 'Fäuste',          price: 0,     dmg: 12, rate: 0.45, range: 2.6, spread: 0,     ammoPrice: 0,   clip: 0,  pellets: 1, auto: false },
  { id: 'pistola', name: 'Pistole 9mm',     price: 800,   dmg: 28, rate: 0.28, range: 120, spread: 0.012, ammoPrice: 60,  clip: 36, pellets: 1, auto: false },
  { id: 'mitra',   name: 'Maschinenpistole',price: 4500,  dmg: 16, rate: 0.08, range: 110, spread: 0.03,  ammoPrice: 150, clip: 120,pellets: 1, auto: true },
  { id: 'pompa',   name: 'Schrotflinte',    price: 7500,  dmg: 18, rate: 0.8,  range: 45,  spread: 0.07,  ammoPrice: 180, clip: 24, pellets: 7, auto: false },
  { id: 'assalto', name: 'Sturmgewehr',     price: 16000, dmg: 30, rate: 0.11, range: 200, spread: 0.015, ammoPrice: 300, clip: 150,pellets: 1, auto: true },
  { id: 'cecchino',name: 'Scharfschützengewehr', price: 35000, dmg: 160, rate: 1.1, range: 600, spread: 0, ammoPrice: 500, clip: 20, pellets: 1, auto: false, scope: true },
  { id: 'minigun', name: 'Minigun', price: 150000, dmg: 24, rate: 0.035, range: 160, spread: 0.03, ammoPrice: 900, clip: 600, pellets: 1, auto: true, spin: true },
  { id: 'revolver', name: 'Revolver .44',       price: 3500,   dmg: 55,  rate: 0.6,  range: 140, spread: 0.008, ammoPrice: 120,  clip: 30,  pellets: 1, auto: false },
  { id: 'deagle',   name: 'Desert Eagle',       price: 9000,   dmg: 72,  rate: 0.45, range: 150, spread: 0.01,  ammoPrice: 200,  clip: 28,  pellets: 1, auto: false },
  { id: 'uzi',      name: 'Uzi',                price: 6000,   dmg: 13,  rate: 0.055,range: 80,  spread: 0.04,  ammoPrice: 140,  clip: 160, pellets: 1, auto: true },
  { id: 'ak',       name: 'Kalaschnikow AK-47', price: 22000,  dmg: 34,  rate: 0.12, range: 190, spread: 0.02,  ammoPrice: 320,  clip: 150, pellets: 1, auto: true },
  { id: 'kampf',    name: 'Kampfschrotflinte',  price: 14000,  dmg: 16,  rate: 0.3,  range: 40,  spread: 0.075, ammoPrice: 260,  clip: 40,  pellets: 8, auto: true },
  { id: 'lmg',      name: 'Leichtes MG',        price: 48000,  dmg: 28,  rate: 0.07, range: 180, spread: 0.025, ammoPrice: 600,  clip: 300, pellets: 1, auto: true },
  { id: 'heavysniper', name: 'Schweres Sniper .50', price: 90000, dmg: 420, rate: 1.6, range: 900, spread: 0, ammoPrice: 1200, clip: 15, pellets: 1, auto: false, scope: true },
  { id: 'granat',   name: 'Granatwerfer',       price: 120000, dmg: 60,  rate: 0.9,  range: 120, spread: 0.01,  ammoPrice: 2000, clip: 12,  pellets: 1, auto: false, explode: 6 },
  { id: 'rpg',      name: 'Raketenwerfer (RPG)',price: 250000, dmg: 200, rate: 1.6,  range: 320, spread: 0,     ammoPrice: 5000, clip: 6,   pellets: 1, auto: false, explode: 9 },
  { id: 'laser',    name: 'Laserkanone',        price: 500000, dmg: 90,  rate: 0.15, range: 400, spread: 0,     ammoPrice: 3000, clip: 200, pellets: 1, auto: true, laser: true }
];
IE.weaponById = {}; IE.weapons.forEach(w => IE.weaponById[w.id] = w);

IE.cars = [
  { id: 'cinquino', name: 'Cinquino',        price: 6000,   speed: 34, accel: 14, grip: 2.2, color: 0xd33a2c, kind: 'klein' },
  { id: 'berlina',  name: 'Berlina 1.9',     price: 18000,  speed: 44, accel: 17, grip: 2.0, color: 0x2a3b5c, kind: 'limo' },
  { id: 'fuori',    name: 'Fuoristrada 4x4', price: 42000,  speed: 46, accel: 18, grip: 2.4, color: 0x5b6a3a, kind: 'suv' },
  { id: 'veloce',   name: 'Veloce GT',       price: 95000,  speed: 64, accel: 26, grip: 2.3, color: 0xf2c230, kind: 'sport' },
  { id: 'toro',     name: 'Toro SV',         price: 280000, speed: 80, accel: 34, grip: 2.6, color: 0x6fbf2a, kind: 'super' },
  { id: 'rosso',    name: 'Rosso Corsa 812', price: 450000, speed: 88, accel: 38, grip: 2.7, color: 0xc0101a, kind: 'super' },
  { id: 'furgone',  name: 'Furgone (Lieferwagen)', price: 22000, speed: 36, accel: 12, grip: 1.8, color: 0xe8e4da, kind: 'van' },
  { id: 'kombi',    name: 'Familiare Kombi', price: 24000, speed: 45, accel: 16, grip: 2.0, color: 0x6e7f8c, kind: 'kombi' },
  { id: 'pickup',   name: 'Pickup Strada',   price: 32000, speed: 42, accel: 16, grip: 2.1, color: 0x8a2a1e, kind: 'pickup' },
  { id: 'classica', name: 'Classica 1965',   price: 55000, speed: 48, accel: 15, grip: 1.9, color: 0x9fc3c9, kind: 'retro' },
  { id: 'rally',    name: 'Rally Integrale', price: 70000, speed: 58, accel: 27, grip: 3.0, color: 0xf3f0e8, kind: 'klein' },
  { id: 'spider',   name: 'Spider Cabrio',   price: 120000, speed: 66, accel: 27, grip: 2.4, color: 0x1f4f8f, kind: 'cabrio' },
  { id: 'topolino', name: 'Topolino 1950',   price: 28000,  speed: 38, accel: 12, grip: 1.9, color: 0xe8d8a8, kind: 'retro' },
  { id: 'camper',   name: 'Camper Vacanze',  price: 46000,  speed: 38, accel: 11, grip: 1.8, color: 0xf2efe6, kind: 'van' },
  { id: 'lusso',    name: 'Lusso SUV',       price: 88000,  speed: 56, accel: 22, grip: 2.4, color: 0x1a1a1a, kind: 'suv' },
  { id: 'barchetta',name: 'Barchetta Roadster', price: 98000, speed: 62, accel: 25, grip: 2.5, color: 0xb81d24, kind: 'cabrio' },
  { id: 'stallone', name: 'Stallone GT',     price: 145000, speed: 70, accel: 28, grip: 2.3, color: 0x1d2b4a, kind: 'sport' },
  { id: 'ammiraglia', name: 'Ammiraglia Limousine', price: 165000, speed: 60, accel: 21, grip: 2.2, color: 0x101418, kind: 'limo' },
  { id: 'gt3',      name: 'Corsa GT3 (Rennwagen)', price: 240000, speed: 82, accel: 33, grip: 3.1, color: 0xf27a1a, kind: 'sport' },
  { id: 'fulmine',  name: 'Fulmine Hyper',   price: 650000, speed: 96, accel: 42, grip: 2.9, color: 0x2a8fd8, kind: 'super' },
  { id: 'iperione', name: 'Iperione 1000 PS', price: 1100000, speed: 104, accel: 46, grip: 3.0, color: 0xe8e8e8, kind: 'super' },
  { id: 'diamante', name: 'Diamante GTR',     price: 2500000,  speed: 100, accel: 44, grip: 3.1, color: 0xdfe8f0, kind: 'super', luxury: true },
  { id: 'leggenda', name: 'Leggenda V12',     price: 3800000,  speed: 104, accel: 45, grip: 3.0, color: 0x7a0c14, kind: 'super', luxury: true },
  { id: 'saetta',   name: 'Saetta Elettrica', price: 4500000,  speed: 108, accel: 52, grip: 3.2, color: 0x18c2d8, kind: 'sport', luxury: true },
  { id: 'imperatore', name: 'Imperatore Limousine', price: 6000000, speed: 78, accel: 26, grip: 2.6, color: 0x0b0b0d, kind: 'limo', luxury: true },
  { id: 'oro',      name: 'Oro Assoluto (vergoldet)', price: 9000000, speed: 106, accel: 46, grip: 3.0, color: 0xd6b04a, kind: 'super', luxury: true },
  { id: 'aquila',   name: 'Aquila Hyper 2000 PS', price: 15000000, speed: 120, accel: 58, grip: 3.4, color: 0x14161a, kind: 'super', luxury: true },
  // Weihnachtsautos (nur aus dem Adventskalender)
  { id: 'xflitzer', name: 'Weihnachtsflitzer',   price: 0, speed: 92, accel: 40, grip: 2.9, color: 0xc8102e, kind: 'super', xmas: true },
  { id: 'xgrinch',  name: 'Grinch-Monster',      price: 0, speed: 62, accel: 30, grip: 2.8, color: 0x3fa535, kind: 'suv', xmas: true },
  { id: 'xschnee',  name: 'Schneeraupe',         price: 0, speed: 60, accel: 26, grip: 3.4, color: 0xf2f6fb, kind: 'suv', xmas: true },
  { id: 'xlebkuchen', name: 'Lebkuchen GT',      price: 0, speed: 84, accel: 34, grip: 2.7, color: 0x8a5a2b, kind: 'sport', xmas: true },
  { id: 'xeis',     name: 'Eiskönig',            price: 0, speed: 100, accel: 44, grip: 3.0, color: 0x9fd8f2, kind: 'super', xmas: true },
  { id: 'xsanta',   name: 'Santa GT',            price: 0, speed: 96, accel: 42, grip: 3.0, color: 0xb3001b, kind: 'sport', xmas: true },
  { id: 'xtanne',   name: 'Tannenbaum Cabrio',   price: 0, speed: 78, accel: 32, grip: 2.6, color: 0x1e5c2e, kind: 'cabrio', xmas: true },
  { id: 'jeep',     name: 'Militärjeep',     price: 0, speed: 44, accel: 18, grip: 2.5, color: 0x4f5a34, kind: 'suv', military: true },
  { id: 'panzer',   name: 'Carro Armato (Panzer)', price: 0, speed: 17, accel: 7, grip: 2.6, color: 0x55603a, kind: 'tank', military: true }
];
IE.bizDefs = {
  pizzeria:   { name: 'Pizzeria',          price: 150000,  inc: 3000,  color: 0x2e8b57, sign: '#2e8b57' },
  gelateria:  { name: 'Gelateria',         price: 120000,  inc: 2400,  color: 0xf2a6c8, sign: '#d0569a' },
  ristorante: { name: 'Ristorante',        price: 400000,  inc: 7000,  color: 0x8a2a1e, sign: '#8a2a1e' },
  werkstatt:  { name: 'Autowerkstatt',     price: 500000,  inc: 8500,  color: 0x3a6fb0, sign: '#1f4fb0' },
  nightclub:  { name: 'Nachtclub',         price: 1200000, inc: 20000, color: 0x5a1a7a, sign: '#7a2aa8' },
  hotel:      { name: 'Hotel',             price: 3000000, inc: 45000, color: 0xd9b45a, sign: '#b8902e' }
};
IE.carColors = [0xd33a2c, 0x2a3b5c, 0xe8e4da, 0x1a1a1a, 0x7c8a8e, 0x3e6b8a, 0xa8382c, 0xf0d24a, 0x5b6a3a, 0x2e6b4f, 0xc77d2e, 0x9fc3c9];

IE.boats = [
  { id: 'jetski',  name: 'Moto d\'acqua (Jetski)', price: 15000,  speed: 32, accel: 16, color: 0xe8e8e8, accent: 0x1e7fc8, kind: 'jetski' },
  { id: 'gommone', name: 'Gommone (Schlauchboot)', price: 25000, speed: 26, accel: 12, color: 0x2a2a2a, accent: 0xe05a20, kind: 'gommone' },
  { id: 'riva',    name: 'Motoscafo Riva',  price: 95000,  speed: 46, accel: 18, color: 0x7a4422, accent: 0xf3efe6, kind: 'riva' },
  { id: 'offshore',name: 'Offshore Veloce', price: 240000, speed: 62, accel: 24, color: 0xd11f2a, accent: 0xffffff, kind: 'speed' },
  { id: 'sub',     name: 'U-Boot (Torpedos)', price: 3000000, speed: 34, accel: 12, color: 0x2a3a46, accent: 0xc8d0d6, kind: 'sub', torpedo: true },
  { id: 'xmasyacht', name: 'Weihnachts-Yacht', price: 0, speed: 34, accel: 9, color: 0xb3001b, accent: 0xd6b04a, kind: 'yacht', xmas: true },
  { id: 'yacht',   name: 'Yacht Azzurra',   price: 750000, speed: 30, accel: 8,  color: 0xf6f6f2, accent: 0x1b3d6e, kind: 'yacht' }
];
IE.boatById = {}; IE.boats.forEach(b => IE.boatById[b.id] = b);
IE.boatShopCities = ['neapel', 'venedig', 'genua', 'palermo', 'bari', 'sanremo', 'cagliari', 'catania'];

// Militärbasis (Sperrgebiet)
IE.base = { name: 'Base Militare Sardegna', lon: 9.02, lat: 40.62, r: 190, hw: 160, hd: 115 };
(function () { const p = IE.geo(IE.base.lon, IE.base.lat); IE.base.x = p.x; IE.base.z = p.z; })();
IE.carById = {}; IE.cars.forEach(c => IE.carById[c.id] = c);

// Flughafen bei Neapel (Start der Story)
IE.airport = { name: 'Aeroporto di Napoli', lon: 15.46, lat: 40.84, hw: 80, hd: 160, h: 14 };
(function () { const p = IE.geo(IE.airport.lon, IE.airport.lat); IE.airport.x = p.x; IE.airport.z = p.z; })();
IE.cityById.flughafen = { id: 'flughafen', name: 'Flughafen', x: IE.airport.x - IE.airport.hw - 30, z: IE.airport.z + 60, r: 20, base: IE.airport.h };
IE.flatZones = [ { x: IE.base.x, z: IE.base.z, hw: IE.base.hw, hd: IE.base.hd, h: 12 }, { x: IE.airport.x, z: IE.airport.z, hw: IE.airport.hw + 10, hd: IE.airport.hd + 10, h: IE.airport.h } ];
// Rennstrecke: große Ebene an der Nordost-Adria (gegenüber von Italien), weit weg von Städten
IE.track = { name: 'Autodromo dell\'Adriatico', x: 1550, z: -1700, hw: 380, hd: 235, h: 20 };
IE.flatZones.push({ x: IE.track.x, z: IE.track.z, hw: IE.track.hw, hd: IE.track.hd, h: IE.track.h, f: 120 });
// Mondrakete hinter den Bergen nördlich von Mailand – Start am 25.11.2026 um 16:00 Uhr (deutsche Zeit)
IE.rocket = { x: -980, z: -2150, h: 22, launch: Date.UTC(2026, 10, 25, 15, 0, 0) };
IE.flatZones.push({ x: IE.rocket.x, z: IE.rocket.z, hw: 70, hd: 70, h: IE.rocket.h, f: 40 });
// Straße von Venedig zur Rennstrecke
IE.trackRoad = [[-68, -1400], [-40, -1460], [60, -1505], [300, -1520], [600, -1520], [880, -1530], [1040, -1610], [1140, -1700], [1170, -1800], [1200, -1880], [1250, -1895]];
// Villenstraße am Hang über Neapel (Blick auf Stadt und Golf)
IE.villaRoad = [[395, 235], [388, 200], [382, 160], [380, 120], [384, 92], [400, 112], [425, 135], [460, 147], [500, 152], [540, 154], [580, 155], [620, 153], [660, 152], [700, 152]];
IE.villaRoadH = 58;
// side: 'n' = bergseitig (Tor vorne zur Straße), 's' = talseitig (Tor hinten zur Straße); alle blicken aufs Meer
IE.villas = [
  { id: 'v1', name: 'Villa Aurora',     x: 470, z: 116, side: 'n', price: 1500000 },
  { id: 'v2', name: 'Villa Belvedere',  x: 510, z: 188, side: 's', price: 2200000 },
  { id: 'v3', name: 'Villa Sirena',     x: 550, z: 122, side: 'n', price: 3000000 },
  { id: 'v4', name: 'Villa Vesuvio',    x: 590, z: 189, side: 's', price: 4200000 },
  { id: 'v5', name: 'Villa del Golfo',  x: 630, z: 121, side: 'n', price: 6500000 },
  { id: 'v6', name: 'Villa Imperiale',  x: 705, z: 117, side: 'n', price: 9500000, big: true }
];
IE.villas.push(
  { id: 'v7',  name: 'Villa Oliveto',   x: 400, z: 118, side: 'n', price: 1600000 },
  { id: 'v8',  name: 'Villa Smeraldo',  x: 400, z: 188, side: 's', price: 1800000 },
  { id: 'v9',  name: 'Villa Mare',      x: 460, z: 188, side: 's', price: 2600000 },
  { id: 'v10', name: 'Villa Panorama',  x: 660, z: 188, side: 's', price: 3800000 },
  { id: 'v11', name: 'Villa Corallo',   x: 700, z: 188, side: 's', price: 5200000 });
// Zweite Villen-Gegend: Berghang nördlich (verschneiter Gipfel, Panorama über Rom & den Golf)
IE.villas.push(
  { id: 'b1', name: 'Villa Montebianco',    x: 470, z: 8,  h: 82, side: 'n', price: 2000000 },
  { id: 'b2', name: 'Villa Cima',           x: 470, z: 76, h: 82, side: 's', price: 3200000 },
  { id: 'b3', name: 'Villa Nevosa',         x: 580, z: 8,  h: 82, side: 'n', price: 4500000 },
  { id: 'b4', name: 'Villa Vetta',          x: 580, z: 76, h: 82, side: 's', price: 6000000 },
  { id: 'b5', name: 'Villa Aquila',         x: 690, z: 8,  h: 82, side: 'n', price: 8000000 },
  { id: 'b6', name: 'Villa Belvedere Alto', x: 690, z: 76, h: 82, side: 's', price: 11000000 });
// Dritte Villen-Gegend: Toskana-Hügel bei Pisa
IE.villas.push(
  { id: 't1', name: 'Villa Toscana',  x: -730, z: -1010, h: 92, side: 'n', price: 1800000 },
  { id: 't2', name: 'Villa Chianti',  x: -680, z: -940,  h: 92, side: 's', price: 2800000 },
  { id: 't3', name: 'Villa Firenze',  x: -620, z: -1010, h: 92, side: 'n', price: 4000000 },
  { id: 't4', name: 'Villa Girasole', x: -570, z: -940,  h: 92, side: 's', price: 5500000 },
  { id: 't5', name: 'Villa Collina',  x: -520, z: -1010, h: 92, side: 'n', price: 7000000 });
// Vierte Villen-Gegend: Berge bei Reggio Calabria (Süden)
IE.villas.push(
  { id: 'c1', name: 'Villa Calabra',     x: 1080, z: 995,  h: 112, side: 'n', price: 2000000 },
  { id: 'c2', name: 'Villa Scilla',      x: 1130, z: 1065, h: 112, side: 's', price: 3000000 },
  { id: 'c3', name: 'Villa Jonica',      x: 1180, z: 995,  h: 112, side: 'n', price: 4200000 },
  { id: 'c4', name: 'Villa Aspromonte',  x: 1230, z: 1065, h: 112, side: 's', price: 6000000 },
  { id: 'c5', name: 'Villa dello Stretto',x: 1270, z: 995, h: 112, side: 'n', price: 8500000 });
IE.villas.push(
  { id: 'm1', name: 'Villa Lago di Como',     x: -926,  z: -1720, h: 45, side: 'n', price: 28000000, mega: true },
  { id: 'm2', name: 'Tenuta Toscana',         x: -416,  z: -440,  h: 7,  side: 'n', price: 22000000, mega: true },
  { id: 'm3', name: 'Villa Calabria',         x: 1290,  z: 1128,  h: 10, side: 'n', price: 35000000, mega: true },
  { id: 'm4', name: 'Palazzo Taormina',       x: 557,   z: 1652,  h: 33, side: 'n', price: 30000000, mega: true },
  { id: 'm5', name: 'Villa Portofino',        x: -773,  z: -1116, h: 19, side: 'n', price: 40000000, mega: true },
  { id: 'm6', name: 'Villa sul Garda',        x: -303,  z: -1232, h: 7,  side: 'n', price: 25000000, mega: true });
// Kaufbare Häuser in Dubai (eigenes Areal bei x=-12000) – nutzen dasselbe Kauf-/Betreten-System
IE.villas.push(
  { id: 'du1', name: 'Villa Jumeirah',   x: -12300, z: 950, h: 3, side: 'n', price: 12000000 },
  { id: 'du2', name: 'Villa Marina',     x: -12150, z: 950, h: 3, side: 'n', price: 18000000 },
  { id: 'du3', name: 'Villa Palme',      x: -12000, z: 950, h: 3, side: 'n', price: 24000000 },
  { id: 'du4', name: 'Residenz Al Burj', x: -11850, z: 950, h: 3, side: 'n', price: 35000000 },
  { id: 'du5', name: 'Villa Oasis',      x: -11700, z: 950, h: 3, side: 'n', price: 28000000 });
for (const v of IE.villas) v.s = v.mega ? 3 : v.big ? 2 : 1.6;
for (let i = 7; i < IE.villaRoad.length; i++) { const a = IE.villaRoad[i - 1], b = IE.villaRoad[i]; IE.flatZones.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: Math.abs(b[0] - a[0]) / 2 + 3, hd: Math.abs(b[1] - a[1]) / 2 + 6, h: IE.villaRoadH, f: 16, small: true }); }
for (const v of IE.villas) IE.flatZones.push({ x: v.x, z: v.z + (v.mega ? 3 : 1.25 * v.s), hw: v.mega ? 62 : 10 * v.s + 3, hd: v.mega ? 36 : 9.25 * v.s + 3, h: v.h !== undefined ? v.h : IE.villaRoadH + 1.5, f: v.mega ? 30 : 20, small: true });
// Panoramastraßen der zusätzlichen Villen-Gegenden (Berghänge)
IE.extraVillaRoads = [
  { pts: [[415, 42], [480, 42], [540, 42], [600, 42], [660, 42], [735, 42]], h: 82 },        // Berg bei Rom/Neapel
  { pts: [[-770, -975], [-690, -975], [-610, -975], [-530, -975], [-480, -975]], h: 92 },     // Toskana bei Pisa
  { pts: [[1040, 1030], [1110, 1030], [1180, 1030], [1250, 1030], [1310, 1030]], h: 112 }      // Kalabrien bei Reggio
];
for (const r of IE.extraVillaRoads) for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i]; IE.flatZones.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: Math.abs(b[0] - a[0]) / 2 + 5, hd: Math.abs(b[1] - a[1]) / 2 + 6, h: r.h, f: 18, small: true }); }
// Private Inseln im offenen Meer (werden zu Land erhoben, kaufbar & ausbaubar)
IE.islands = [
  { id: 'iadria',   name: 'Isola Adriatica', x: 1200, z: -630, r: 60, h: 6, price: 350000000 },
  { id: 'iwest',    name: 'Isola del Tirreno', x: -440, z: 640, r: 60, h: 6, price: 400000000 },
  { id: 'itirreno', name: 'Isola Sarda',     x: -830, z: 1890, r: 60, h: 6, price: 450000000 },
  { id: 'iionio',   name: 'Isola Ionica',    x: 1450, z: 1980, r: 60, h: 6, price: 500000000 },
  { id: 'iligure',  name: 'Isola Ligure',    x: -820, z: -320, r: 55, h: 6, price: 300000000 },
  { id: 'iponente', name: 'Isola di Ponente', x: -520, z: 60,  r: 55, h: 6, price: 320000000 },
  { id: 'isud',     name: 'Isola del Sud',    x: -720, z: 520, r: 55, h: 6, price: 360000000 },
  { id: 'ilontana', name: 'Isola Lontana',   x: -1400, z: 1050, r: 55, h: 6, price: 420000000 },
  { id: 'inord',    name: 'Isola del Nord',   x: 620,  z: -1150, r: 55, h: 6, price: 340000000 },
  { id: 'iveneta',  name: 'Isola Veneta',    x: 300,  z: -1120, r: 55, h: 6, price: 330000000 },
  { id: 'iorient',  name: 'Isola Orientale', x: 1150, z: -140, r: 55, h: 6, price: 380000000 },
  { id: 'igolfo',   name: 'Isola del Golfo',  x: 250,  z: 560, r: 55, h: 6, price: 350000000 }
];
for (const is of IE.islands) IE.flatZones.push({ x: is.x, z: is.z, hw: is.r - 6, hd: is.r - 6, h: is.h, f: 55, sea: true });

IE.planes = [
  { id: 'piccolo',  name: 'Piccolo 172 (Propeller)', price: 0,       speed: 62,  minSpeed: 22, turn: 1.0, color: 0xf2f2ee, accent: 0xc8372d, kind: 'prop' },
  { id: 'acrobata', name: 'Acrobata (Kunstflug)',    price: 180000,  speed: 85,  minSpeed: 24, turn: 1.8, color: 0xd12b2b, accent: 0xf2f2f2, kind: 'stunt' },
  { id: 'idro',     name: 'Idrovolante (Wasserflugzeug)', price: 260000, speed: 70, minSpeed: 22, turn: 1.0, color: 0xf2c230, accent: 0x1b3d6e, kind: 'sea' },
  { id: 'jet',      name: 'Jet Privato',             price: 1200000, speed: 150, minSpeed: 40, turn: 0.8, color: 0xf6f6f2, accent: 0x1b3d6e, kind: 'jet' },
  { id: 'turbo',    name: 'Turboelica Cargo',        price: 140000,  speed: 78,  minSpeed: 26, turn: 0.9, color: 0xdfe3e6, accent: 0x2e6b4f, kind: 'prop' },
  { id: 'biplano',  name: 'Biplano Acrobatico',      price: 230000,  speed: 80,  minSpeed: 20, turn: 2.2, color: 0xf2c230, accent: 0x1b3d6e, kind: 'stunt' },
  { id: 'freccia',  name: 'Freccia Tricolore (Kunstflug-Jet)', price: 780000, speed: 140, minSpeed: 38, turn: 1.9, color: 0x1f4fb0, accent: 0xf2f2f2, kind: 'fighter' },
  { id: 'anfibio',  name: 'Anfibio Grande',          price: 420000,  speed: 82,  minSpeed: 26, turn: 0.9, color: 0xc8372d, accent: 0xf2f2ee, kind: 'sea' },
  { id: 'jetxl',    name: 'Jet Executive XL',        price: 2400000, speed: 175, minSpeed: 45, turn: 0.85, color: 0x1a1a1a, accent: 0xd9b45a, kind: 'jet' },
  { id: 'schlitten', name: 'Rentierschlitten', price: 0, speed: 100, minSpeed: 16, turn: 1.7, color: 0xc8102e, accent: 0xd6b04a, kind: 'sleigh', xmas: true },
  { id: 'airliner',  name: 'Linienflugzeug',      price: 5000000,  speed: 170, minSpeed: 50, turn: 0.55, color: 0xf2f2ee, accent: 0x1f4fb0, kind: 'jet' },
  { id: 'wasserjet', name: 'Düsen-Wasserflugzeug', price: 900000,   speed: 120, minSpeed: 34, turn: 1.0,  color: 0x1e7fc8, accent: 0xffffff, kind: 'sea' },
  { id: 'doppelprop', name: 'Doppelpropeller',     price: 320000,   speed: 95,  minSpeed: 28, turn: 1.1,  color: 0x2e8b57, accent: 0xf2f2ee, kind: 'prop' },
  { id: 'kunstrot',  name: 'Kunstflug Rosso',      price: 450000,   speed: 112, minSpeed: 24, turn: 2.4,  color: 0xd11f2a, accent: 0x1a1a1a, kind: 'stunt' },
  { id: 'ueberschall', name: 'Überschalljet',      price: 6500000,  speed: 235, minSpeed: 55, turn: 1.0,  color: 0x9aa0a8, accent: 0xd6b04a, kind: 'jet' },
  { id: 'burger',   name: 'Burger-Jet (Raketen)',    price: 2800000,       speed: 150, minSpeed: 42, turn: 1.3, color: 0xd9a441, accent: 0x7a4a1e, kind: 'burger', armed: true },
  { id: 'caccia',   name: 'Caccia (Kampfjet)',       price: 3500000,       speed: 190, minSpeed: 45, turn: 1.4, color: 0x7b8590, accent: 0x4a5236, kind: 'fighter', armed: true, military: true }
];
IE.planeById = {}; IE.planes.forEach(p => IE.planeById[p.id] = p);

IE.helis = [
  { id: 'libellula', name: 'Libellula',  price: 60000,   speed: 55, climb: 18, color: 0x1e7fc8 },
  { id: 'aquila',    name: 'Aquila 109', price: 180000,  speed: 72, climb: 24, color: 0x222222 },
  { id: 'falco',     name: 'Falco Executive', price: 520000, speed: 92, climb: 30, color: 0xb8902e },
  { id: 'predatore', name: 'Predatore (Kampfhubschrauber)', price: 2500000, speed: 80, climb: 26, color: 0x4a5236, armed: true, military: true }
];
IE.heliById = {}; IE.helis.forEach(h => IE.heliById[h.id] = h);

IE.chars = {
  jack:  { name: 'Jack Moretti',  age: 28, home: 'neapel',  shirt: 0x2b2b2b, jacket: 0x4a3222, pants: 0x1d2635, skin: 0xd8a47f, hair: 0x2a1a10,
           info: 'Geboren in Neapel. Früher Fahrer für eine Mafiafamilie. Sein Vater Antonio und sein Bruder Luca starben unter mysteriösen Umständen. Jack kehrt zurück, um die Wahrheit zu finden.' },
  marco: { name: 'Marco Bellini', age: 32, home: 'palermo', shirt: 0x1d3557, jacket: 0x1d3557, pants: 0x3b3b3b, skin: 0xc8946c, hair: 0x3a2a1a,
           info: 'Jacks bester Freund aus Palermo. Mechaniker, liebt schnelle Autos. Mutig, aber impulsiv – und hat ständig Geldprobleme.' },
  sofia: { name: 'Sofia Romano',  age: 27, home: 'rom',     shirt: 0x111111, jacket: 0x111111, pants: 0x111111, skin: 0xe9c3a6, hair: 0x140c08, female: true,
           info: 'Ehemalige IT-Spezialistin einer kriminellen Organisation. Plant Aufträge, kennt geheime Informationen über La Corona und das FIB.' }
};

// ===== STORY =====
// Schritt-Typen: talk, goto, kill, race, collect, escape, drive (goto im Fahrzeug)
IE.chapters = [
  'Kapitel 1 – Der Anfang in Neapel',
  'Kapitel 2 – Die Crew',
  'Kapitel 3 – Der Norden',
  'Kapitel 4 – Der Aufstieg zum Imperium',
  'Kapitel 5 – Krieg gegen La Corona und das FIB'
];

IE.missions = [
  { ch: 0, title: 'Zurück in Neapel', city: 'neapel', at: 'airport', reward: 2500,
    steps: [
      { t: 'talk', lines: [
        ['Erzähler','Jack landet nach fünf Jahren am Flughafen von Neapel. Er hat nur einen Koffer – und draußen wartet ein kaputter Wagen.'],
        ['Marco','Du siehst beschissen aus.'],
        ['Jack','Du auch.'],
        ['Marco','Komm, steig ein. Rinaldi weiß schon, dass du zurück bist.'] ] },
      { t: 'enter', text: 'Steig in ein Auto (F / 🚗)' },
      { t: 'goto', city: 'neapel', dx: -90, dz: 20, r: 8, vehicle: true, inside: 'werkstatt', text: 'Fahr zu Marcos Werkstatt' },
      { t: 'talk', lines: [['Marco','Hier ist mein Laden. Und das hier ist ab heute auch deiner, Bruder.'],['Jack','Ich will eigentlich ein neues Leben, Marco.'],['Marco','Das wollen wir alle. Aber dafür brauchst du Geld.']] }
    ] },
  { ch: 0, title: 'Rinaldis Männer', city: 'neapel', dx: -90, dz: 20, reward: 4000,
    steps: [
      { t: 'talk', lines: [['Marco','Ein lokaler Gangster namens Rinaldi hat meine Werkstatt bedroht. Seine Männer hängen am Hafen rum.'],['Jack','Dann statten wir ihnen einen Besuch ab.']] },
      { t: 'goto', city: 'neapel', dx: 120, dz: 140, r: 25, text: 'Fahr zum Hafen von Neapel' },
      { t: 'kill', city: 'neapel', dx: 120, dz: 140, n: 5, text: 'Erledige Rinaldis Männer' },
      { t: 'talk', lines: [['Marco','Rinaldi wird uns nicht mehr belästigen.'],['Jack','Er war nur ein kleiner Fisch. Hinter ihm steckt jemand anderes.']] }
    ] },
  { ch: 0, title: 'Die Lieferung', city: 'neapel', dx: -90, dz: 20, reward: 4000,
    steps: [
      { t: 'talk', lines: [['Marco','Ich habe einen Auftrag: eine wertvolle Lieferung zu einem Geschäftsmann nach Pescara.'],['Erzähler','Unterwegs merken sie, dass sie verfolgt werden. Jack entdeckt, dass die Lieferung einem Mann namens Vittorio Salvatore gehört.']] },
      { t: 'collect', city: 'neapel', dx: 30, dz: -110, r: 6, text: 'Hol die Lieferung ab' },
      { t: 'goto', city: 'pescara', dx: 0, dz: 0, r: 25, vehicle: true, text: 'Liefere die Ware nach Pescara', chasers: 2 },
      { t: 'talk', lines: [['Jack','Vittorio Salvatore... Den Namen hat mein Vater immer nur geflüstert.']] }
    ] },
  { ch: 1, title: 'Der Kontakt aus Rom', city: 'rom', dx: -40, dz: -40, reward: 6000,
    steps: [
      { t: 'goto', city: 'rom', dx: -40, dz: -40, r: 6, inside: 'buero', text: 'Triff Sofia in ihrem kleinen Büro in Rom' },
      { t: 'talk', lines: [['Sofia','Ihr wollt mehr Geld? Dann müsst ihr aufhören, wie Kleinganoven zu arbeiten.'],['Sofia','Ich kenne La Corona. Ich kenne ihre Konten, ihre Leute, ihre Fehler.'],['Erzähler','Sie zeigt ihnen eine Liste mit möglichen Auftraggebern. Die Crew ist komplett.']] }
    ] },
  { ch: 1, title: 'Das Lagerhaus', city: 'rom', dx: -40, dz: -40, reward: 15000,
    steps: [
      { t: 'talk', lines: [['Sofia','Ein Luxushändler hat uns beauftragt. In einem Lagerhaus vor der Stadt liegen gestohlene Waren, die zurückgeholt werden müssen.'],['Sofia','Jack übernimmt den Zugang, Marco den Transport. Ich behalte die Lage im Blick.']] },
      { t: 'goto', city: 'rom', dx: 230, dz: 260, r: 30, text: 'Fahr zum Lagerhaus' },
      { t: 'kill', city: 'rom', dx: 230, dz: 260, n: 6, text: 'Schalte die Wachen aus' },
      { t: 'collect', city: 'rom', dx: 240, dz: 270, r: 6, text: 'Nimm die Ware' },
      { t: 'escape', stars: 2, text: 'Ein Mitarbeiter hat Sofia erkannt! Hänge die Polizei ab' }
    ] },
  { ch: 1, title: 'Der Hafen von Bari', city: 'bari', dx: 0, dz: -30, reward: 25000,
    steps: [
      { t: 'talk', lines: [['Sofia','Im Hafen von Bari kommt heute Nacht ein Container von La Corona an.'],['Marco','Und wir holen ihn uns, bevor Vittorios Leute da sind.']] },
      { t: 'goto', city: 'bari', dx: 60, dz: -90, r: 25, text: 'Fahr zum Hafen von Bari' },
      { t: 'kill', city: 'bari', dx: 60, dz: -90, n: 7, text: 'Besiege die Hafenwachen von La Corona' },
      { t: 'collect', city: 'bari', dx: 70, dz: -100, r: 6, text: 'Sichere die Dokumente aus dem Container' }
    ] },
  { ch: 2, title: 'Das Rennen in Mailand', city: 'mailand', dx: 0, dz: 40, reward: 35000,
    steps: [
      { t: 'talk', lines: [['Marco','In Mailand gibt es heute Nacht ein illegales Rennen. Der Gewinner bekommt 35.000 €.'],['Marco','Lass mich das machen. Ich wurde für so was geboren.']] },
      { t: 'enter', text: 'Steig in ein schnelles Auto' },
      { t: 'race', city: 'mailand', time: 75, cps: [[0,140],[160,160],[260,0],[160,-180],[-120,-200],[-240,-40],[-140,130],[0,40]], text: 'Gewinne das Rennen' },
      { t: 'talk', lines: [['Erzähler','Marco gewinnt gegen mehrere Profis. Doch nach dem Rennen sabotiert ein Konkurrent seine Fahrzeuge.']] }
    ] },
  { ch: 2, title: 'Das Kunstgeschäft', city: 'florenz', dx: 30, dz: 30, reward: 60000,
    steps: [
      { t: 'talk', lines: [['Sofia','In Florenz soll ein wertvolles Gemälde zurückgeholt werden. Es hängt in einer privaten Kunstveranstaltung.']] },
      { t: 'goto', city: 'florenz', dx: -30, dz: -50, r: 6, inside: 'galerie', text: 'Geh zur Kunstveranstaltung' },
      { t: 'talk', lines: [['Erzähler','Dort trifft Jack Enzo Ricci, einen ehemaligen Freund seines Vaters.'],['Enzo','Dein Vater hat damals einen großen Fehler gemacht.'],['Jack','Welchen? Rede!'],['Erzähler','Doch Enzo verschwindet in der Menge.']] },
      { t: 'collect', city: 'florenz', dx: -40, dz: -60, r: 2.5, inside: 'galerie', text: 'Nimm das Gemälde' },
      { t: 'kill', city: 'florenz', dx: -40, dz: -60, n: 5, text: 'Wehr die Sicherheitsleute ab' }
    ] },
  { ch: 2, title: 'Die Yacht in Venedig', city: 'venedig', dx: 0, dz: 0, reward: 45000,
    steps: [
      { t: 'talk', lines: [['Sofia','Ein reicher Geschäftsmann beauftragt uns. Seine Yacht ist verschwunden – angeblich in der Lagune von Venedig.']] },
      { t: 'goto', city: 'venedig', dx: 120, dz: 80, r: 25, text: 'Finde die Yacht am Hafen' },
      { t: 'kill', city: 'venedig', dx: 120, dz: 80, n: 6, text: 'Erledige die Schmuggler' },
      { t: 'talk', lines: [['Erzähler','Auf dem Boot entdeckt die Crew eine Verbindung zu La Corona. Der Geschäftsmann war nur ein Strohmann.']] }
    ] },
  { ch: 2, title: 'Marcos Schulden', city: 'palermo', dx: 0, dz: 0, reward: 20000,
    steps: [
      { t: 'talk', lines: [['Erzähler','Marco bekommt Besuch von seinen alten Gläubigern in Palermo.'],['Marco','Jack, ich steck tief drin. Die wollen mich umbringen.'],['Jack','Dann klären wir das. Zusammen.']] },
      { t: 'goto', city: 'palermo', dx: -120, dz: -60, r: 25, text: 'Fahr zum Versteck der Gläubiger in Palermo' },
      { t: 'kill', city: 'palermo', dx: -120, dz: -60, n: 6, text: 'Kümmere dich um die Gläubiger' }
    ] },
  { ch: 3, title: 'Das Casino am Meer', city: 'sanremo', dx: 0, dz: 0, reward: 250000,
    steps: [
      { t: 'talk', lines: [['Sofia','Wir investieren in ein Casino-Projekt an der Küste von Sanremo.'],['Sofia','Ein rivalisierender Besitzer versucht, uns aus dem Geschäft zu drängen.']] },
      { t: 'goto', city: 'sanremo', dx: 30, dz: 40, r: 6, inside: 'casino', text: 'Fahr zum Casino in Sanremo' },
      { t: 'talk', lines: [['Sofia','Willkommen in unserem Casino. Und da kommen schon die Männer des Konkurrenten …']] },
      { t: 'kill', city: 'sanremo', dx: 30, dz: 40, n: 8, text: 'Verteidige das Casino' }
    ] },
  { ch: 3, title: 'Die Flucht aus Florenz', city: 'florenz', dx: 0, dz: 0, reward: 160000,
    steps: [
      { t: 'talk', lines: [['Enzo','Jack. Komm allein. Ich erzähle dir alles über deinen Vater.']] },
      { t: 'goto', city: 'florenz', dx: 100, dz: -90, r: 12, text: 'Triff Enzo Ricci in Florenz' },
      { t: 'talk', lines: [['Erzähler','Doch das Treffen ist eine Falle. Mehrere Männer suchen nach Jack. Er muss die Stadt verlassen.']] },
      { t: 'kill', city: 'florenz', dx: 100, dz: -90, n: 6, text: 'Kämpf dich frei' },
      { t: 'escape', stars: 3, text: 'Verlasse Florenz und hänge die Verfolger ab' }
    ] },
  { ch: 3, title: 'Die geheimen Konten', city: 'mailand', dx: 0, dz: 0, reward: 300000,
    steps: [
      { t: 'talk', lines: [['Sofia','Ich habe Finanzunterlagen gefunden, die La Corona schwer belasten. Sie liegen in einer Privatbank in Mailand.'],['Jack','Ich will die Unterlagen veröffentlichen.'],['Marco','Bist du verrückt? Damit können wir Vittorio erpressen!'],['Erzähler','Die beiden streiten sich zum ersten Mal ernsthaft.']] },
      { t: 'goto', city: 'mailand', dx: 110, dz: -110, r: 6, inside: 'bank', text: 'Geh in die Privatbank' },
      { t: 'kill', city: 'mailand', dx: 110, dz: -110, n: 6, inside: 'bank', text: 'Überwältige die Bankwachen' },
      { t: 'collect', city: 'mailand', dx: 115, dz: -115, r: 2.5, inside: 'bank', text: 'Nimm die Finanzunterlagen aus dem Tresor' },
      { t: 'escape', stars: 3, text: 'Entkomme der Polizei' }
    ] },
  { ch: 3, title: 'Der Verrat in Palermo', city: 'palermo', dx: 0, dz: 0, reward: 280000,
    steps: [
      { t: 'talk', lines: [['Erzähler','Jack entdeckt, dass Marco sich heimlich mit einem Mann von Vittorio getroffen hat.'],['Marco','Ich habe nur Informationen gesammelt!'],['Erzähler','Jack glaubt ihm nicht vollständig.']] },
      { t: 'goto', city: 'palermo', dx: 150, dz: 90, r: 20, text: 'Folge Marcos Spur zum Treffpunkt' },
      { t: 'kill', city: 'palermo', dx: 150, dz: 90, n: 7, text: 'Erledige Vittorios Männer' }
    ] },
  { ch: 3, title: 'Der erste große Sieg', city: 'rom', dx: 0, dz: 0, reward: 500000,
    steps: [
      { t: 'talk', lines: [['Sofia','Vittorios Geschäftspartner fährt heute mit einem Konvoi durch Rom.'],['Jack','Dann holen wir uns, was ihm gehört.']] },
      { t: 'goto', city: 'rom', dx: -150, dz: 160, r: 25, text: 'Fang den Konvoi ab' },
      { t: 'kill', city: 'rom', dx: -150, dz: 160, n: 9, text: 'Besiege den Konvoi', boss: 'Vittorios Partner' },
      { t: 'talk', lines: [['Erzähler','Die Crew besiegt einen wichtigen Geschäftspartner Vittorios. Jack wird in der Unterwelt Italiens bekannt.'],['Erzähler','Sein Name taucht erstmals in einer FIB-Ermittlungsakte auf.']] }
    ] },
  { ch: 4, title: 'Das Geheimnis von Luca', city: 'neapel', dx: 0, dz: 0, reward: 750000,
    steps: [
      { t: 'goto', city: 'neapel', dx: -150, dz: -140, r: 6, inside: 'villa', text: 'Fahr zur Villa der Crew' },
      { t: 'talk', lines: [['Sofia','Jack... ich muss dir etwas sagen. Ich kannte Luca. Vor seinem Tod.'],['Sofia','Ich wusste, dass er in Gefahr war.'],['Jack','Und du hast mir nichts erzählt?!'],['Erzähler','Jack wird wütend und verlässt die Villa.']] }
    ] },
  { ch: 4, title: 'Der Maulwurf', city: 'genua', dx: 0, dz: 0, reward: 500000,
    steps: [
      { t: 'talk', lines: [['Enzo','Jemand aus deiner Crew gibt Informationen an das FIB weiter.'],['Erzähler','Jack beginnt, Marco und Sofia zu misstrauen. Die Spur führt nach Genua.']] },
      { t: 'goto', city: 'genua', dx: 80, dz: 90, r: 20, text: 'Fahr zum Hafen von Genua' },
      { t: 'kill', city: 'genua', dx: 80, dz: 90, n: 8, text: 'Die FIB-Kontaktleute wehren sich!' }
    ] },
  { ch: 4, title: 'Die letzte Warnung', city: 'rom', dx: 0, dz: 0, reward: 1000000,
    steps: [
      { t: 'talk', lines: [['Erzähler','Vittorio ruft Jack persönlich an. Er bietet ihm einen Platz an seiner Seite an.'],['Vittorio','Komm zu mir, Jack. Zusammen gehört uns ganz Italien.'],['Jack','Ich will nicht dein König werden. Ich will dein Ende sein.']] },
      { t: 'goto', city: 'rom', dx: 200, dz: -200, r: 25, text: 'Vittorio hat ein Killerkommando geschickt – stell dich ihnen' },
      { t: 'kill', city: 'rom', dx: 200, dz: -200, n: 10, text: 'Überlebe den Angriff' }
    ] },
  { ch: 4, title: 'Projekt Imperium', city: 'rom', dx: 0, dz: 0, reward: 1000000,
    steps: [
      { t: 'talk', lines: [['Erzähler','Ein hochrangiger FIB-Beamter aus den USA kommt nach Italien. Er befiehlt, die Ermittlungen gegen La Corona sofort zu beenden.'],['Elena Conti','Jack, ich brauche deine Hilfe. Projekt Imperium ist viel größer, als wir dachten.'],['Elena Conti','Richard Hayes arbeitet mit Vittorio zusammen.']] },
      { t: 'goto', city: 'neapel', dx: 160, dz: -40, r: 25, text: 'Hol die FIB-Akten aus dem Versteck in Neapel' },
      { t: 'kill', city: 'neapel', dx: 160, dz: -40, n: 9, text: 'Hayes\' Agenten greifen an!' },
      { t: 'collect', city: 'neapel', dx: 165, dz: -45, r: 5, text: 'Nimm die Akten' }
    ] },
  { ch: 4, title: 'Das Treffen mit Vittorio', city: 'palermo', dx: 0, dz: 0, reward: 3000000,
    steps: [
      { t: 'goto', city: 'palermo', dx: 40, dz: -120, r: 6, inside: 'villa', text: 'Triff Vittorio in seiner Villa in Palermo' },
      { t: 'talk', lines: [['Vittorio','Luca hat nicht nur gegen mich gearbeitet. Er hat Beweise gegen Hayes gesammelt.'],['Vittorio','Und dein Vater, Antonio Moretti, hatte vor Jahren einen Deal mit dem FIB abgeschlossen.'],['Jack','Hat mein Vater dich verraten?'],['Vittorio','Dein Vater hat versucht, uns alle zu retten.']] }
    ] },
  { ch: 4, title: 'Marcos Geheimnis', city: 'palermo', dx: 0, dz: 0, reward: 1500000,
    steps: [
      { t: 'talk', lines: [['Erzähler','Marco verschwindet mit einem Teil des Geldes.'],['Erzähler','Jack findet heraus, dass Marco heimlich mit Vittorio verhandelt hat – um Sofia und Jack zu schützen.']] },
      { t: 'goto', city: 'catania', dx: 0, dz: 0, r: 30, text: 'Folge Marco nach Catania' },
      { t: 'kill', city: 'catania', dx: 0, dz: 0, n: 8, text: 'Marco wird angegriffen – hilf ihm!' },
      { t: 'talk', lines: [['Marco','Ich hab das getan, um euch zu schützen, Jack.'],['Jack','Du bist ein Idiot. Aber du bist mein Bruder.']] }
    ] },
  { ch: 4, title: 'Das Ende von La Corona', city: 'rom', dx: 0, dz: 0, reward: 10000000,
    steps: [
      { t: 'talk', lines: [['Sofia','Das ist es. Vittorio und Hayes treffen sich am Kolosseum.'],['Marco','Diesmal gehen wir zusammen.'],['Jack','Für Antonio. Für Luca.']] },
      { t: 'goto', city: 'rom', dx: 0, dz: 0, r: 40, text: 'Fahr zum Kolosseum' },
      { t: 'kill', city: 'rom', dx: 0, dz: 0, n: 12, text: 'Besiege La Corona und Hayes\' Agenten', boss: 'Vittorio Salvatore' },
      { t: 'talk', lines: [['Erzähler','La Corona ist zerschlagen. Richard Hayes wird von Elena Conti verhaftet.'],['Jack','Jetzt gehört Italien uns.'],['Erzähler','Das Ende der Geschichte ist nicht das Ende des Spiels. Erkunde Italien, kaufe Autos, Helikopter und Waffen!']] }
    ] }
];

// ===== ONLINE: Crew-Aufträge (gemeinsam mit anderen Spielern) =====
IE.coopJobs = [
  { id: 'transporter', coop: true, ch: 0, title: 'Der Geldtransporter', city: 'rom', dx: 150, dz: 200, reward: 60000,
    steps: [
      { t: 'goto', city: 'rom', dx: 150, dz: 200, r: 30, text: 'Fahrt zum Geldtransporter in Rom' },
      { t: 'kill', city: 'rom', dx: 150, dz: 200, n: 10, text: 'Schaltet die Wachleute aus' },
      { t: 'collect', city: 'rom', dx: 158, dz: 206, r: 5, text: 'Schnappt euch das Geld' },
      { t: 'escape', stars: 2, text: 'Hängt die Polizei ab' } ] },
  { id: 'kartell', coop: true, ch: 0, title: 'Das Kartell am Hafen', city: 'genua', dx: 80, dz: 90, reward: 80000,
    steps: [
      { t: 'goto', city: 'genua', dx: 80, dz: 90, r: 30, text: 'Fahrt zum Hafen von Genua' },
      { t: 'kill', city: 'genua', dx: 80, dz: 90, n: 12, text: 'Besiegt das Kartell', boss: 'Kartellboss Russo' } ] },
  { id: 'tresor', coop: true, ch: 0, title: 'Der Tresor der Banca', city: 'mailand', dx: 110, dz: -110, reward: 120000,
    steps: [
      { t: 'goto', city: 'mailand', dx: 110, dz: -110, r: 6, inside: 'bank', text: 'Geht in die Privatbank in Mailand' },
      { t: 'kill', city: 'mailand', dx: 110, dz: -110, n: 8, inside: 'bank', text: 'Überwältigt die Bankwachen' },
      { t: 'collect', city: 'mailand', dx: 110, dz: -110, r: 2.5, inside: 'bank', text: 'Räumt den Tresor aus' },
      { t: 'escape', stars: 3, text: 'Entkommt der Polizei' } ] },
  { id: 'showdown', coop: true, ch: 0, title: 'Showdown in Palermo', city: 'palermo', dx: 150, dz: 90, reward: 150000,
    steps: [
      { t: 'goto', city: 'palermo', dx: 150, dz: 90, r: 30, text: 'Trefft euch in Palermo' },
      { t: 'kill', city: 'palermo', dx: 150, dz: 90, n: 14, text: 'Vernichtet Vittorios Armee', boss: 'Vittorios Leibwächter' } ] }
];

// ===== SKINS (Kleiderschrank) =====
// price 0 = gratis, admin = nur für Admins
const SK = { light: 0xe9c3a6, mid: 0xd8a47f, tan: 0xc8946c, dark: 0x8a5a3a, pale: 0xf0d8c4 };
IE.skins = [
  { id: 'trooper', name: 'Weißer Weltraumsoldat', cat: 'Spaß', price: 75000, look: { pants: 0xf2f2f0, jacket: 0xf2f2f0, shirt: 0x1a1a1a, skin: SK.light, hair: 0x111111, hat: 'trooper', hands: 0x111111, shoes: 0xf2f2f0, stripe: 0x1a1a1a } },
  { id: 'jack', name: 'Jack Moretti', cat: 'Crew', price: 0, look: IE.chars.jack },
  { id: 'marco', name: 'Marco Bellini', cat: 'Crew', price: 0, look: IE.chars.marco },
  { id: 'sofia', name: 'Sofia Romano', cat: 'Crew', price: 0, look: IE.chars.sofia },
  { id: 'anzug', name: 'Typ im Anzug', cat: 'Business', price: 0, look: { pants: 0x1a1a1f, jacket: 0x1a1a1f, shirt: 0xf4f4f4, tie: 0xb3202a, skin: SK.mid, hair: 0x2a1a10 } },
  { id: 'banker', name: 'Banker', cat: 'Business', price: 15000, look: { pants: 0x1f2c48, jacket: 0x1f2c48, shirt: 0xdfe8f5, tie: 0x3a6fb0, skin: SK.light, hair: 0x6b5a48, glasses: 'nerd' } },
  { id: 'smoking', name: 'Smoking', cat: 'Business', price: 40000, look: { pants: 0x0d0d0f, jacket: 0x0d0d0f, shirt: 0xffffff, bow: 0x0d0d0f, skin: SK.mid, hair: 0x111111, shoes: 0x050505 } },
  { id: 'fib', name: 'FIB-Mitarbeiter', cat: 'Behörden', price: 0, look: { pants: 0x2a2f38, jacket: 0x1d2a44, shirt: 0xd8dde6, skin: SK.light, hair: 0x3a2a1a, hat: 'cap', hatColor: 0x1d2a44, back: 'FIB', backColor: '#f2c230' } },
  { id: 'fib_agent', name: 'FIB-Agent im Anzug', cat: 'Behörden', price: 25000, look: { pants: 0x111114, jacket: 0x111114, shirt: 0xffffff, tie: 0x111114, skin: SK.tan, hair: 0x111111, glasses: 'sun', back: 'FIB', backColor: '#f2c230' } },
  { id: 'polizia', name: 'Polizist', cat: 'Behörden', price: 10000, look: { pants: 0x1a2340, jacket: 0x1a2340, shirt: 0xd8dce6, skin: SK.mid, hair: 0x111111, hat: 'pilot', hatColor: 0x1a2340, back: 'POLIZIA', backColor: '#ffffff' } },
  { id: 'carabiniere', name: 'Carabiniere', cat: 'Behörden', price: 30000, look: { pants: 0x101012, jacket: 0x101012, shirt: 0xffffff, stripe: 0xc8202a, skin: SK.light, hair: 0x111111, hat: 'pilot', hatColor: 0x101012, beard: 0x2a1a10 } },
  { id: 'soldat', name: 'Soldat', cat: 'Behörden', price: 20000, look: { pants: 0x4b5233, jacket: 0x59613d, shirt: 0x3e4429, skin: SK.tan, hair: 0x2a2a1a, hat: 'helmet', hatColor: 0x4f5636, pack: true } },
  { id: 'maskiert', name: 'Maskierter Verbrecher', cat: 'Unterwelt', price: 0, look: { pants: 0x111111, jacket: 0x1b1b1b, shirt: 0x2a2a2a, skin: SK.mid, hair: 0x111111, mask: 'ski', maskColor: 0x121212, hands: 0x111111 } },
  { id: 'bankraeuber', name: 'Bankräuber', cat: 'Unterwelt', price: 12000, look: { pants: 0x2b3440, jacket: 0x3d4652, shirt: 0x3d4652, skin: SK.light, hair: 0x111111, mask: 'ski', maskColor: 0x8a1c22, hands: 0x111111, pack: true, packColor: 0x1b1b1b } },
  { id: 'clown', name: 'Clown-Gangster', cat: 'Unterwelt', price: 35000, look: { pants: 0x6b2a8a, jacket: 0x2a7a3a, shirt: 0xf2c230, skin: SK.light, hair: 0xd85a1a, mask: 'face', maskColor: 0xf6f6f6, hands: 0xf6f6f6 } },
  { id: 'mafiaboss', name: 'Mafia-Boss', cat: 'Unterwelt', price: 75000, look: { pants: 0x3a3a40, jacket: 0x3a3a40, shirt: 0x111111, tie: 0xf4f4f4, skin: SK.tan, hair: 0x6b6b6b, hat: 'fedora', hatColor: 0x2a2a2e, chain: true } },
  { id: 'don', name: 'Don im weißen Anzug', cat: 'Unterwelt', price: 150000, look: { pants: 0xf2efe6, jacket: 0xf2efe6, shirt: 0x111111, tie: 0xb3202a, skin: SK.tan, hair: 0x8a8a8a, hat: 'fedora', hatColor: 0xf2efe6, beard: 0x8a8a8a, shoes: 0xf2efe6 } },
  { id: 'killer', name: 'Auftragskiller', cat: 'Unterwelt', price: 60000, look: { pants: 0x0d0d0f, jacket: 0x0d0d0f, shirt: 0x0d0d0f, tie: 0x0d0d0f, skin: SK.pale, hair: 0x050505, hairStyle: 'none', glasses: 'sun', hands: 0x0d0d0f } },
  { id: 'hacker', name: 'Hacker', cat: 'Unterwelt', price: 18000, look: { pants: 0x1b1f2a, jacket: 0x111111, shirt: 0x1fae5a, skin: SK.light, hair: 0x111111, mask: 'half', maskColor: 0x111111, glasses: 'visor' } },
  { id: 'ninja', name: 'Ninja', cat: 'Unterwelt', price: 90000, look: { pants: 0x0b0b0d, jacket: 0x0b0b0d, shirt: 0x0b0b0d, skin: SK.light, hair: 0x0b0b0d, mask: 'ski', maskColor: 0x0b0b0d, hands: 0x0b0b0d, shoes: 0x0b0b0d } },
  { id: 'rapper', name: 'Rapper', cat: 'Stadt', price: 22000, look: { pants: 0x1b1b1b, jacket: 0x111111, shirt: 0x111111, skin: SK.dark, hair: 0x111111, hat: 'cap', hatColor: 0xb3202a, chain: true, glasses: 'sun' } },
  { id: 'tourist', name: 'Tourist', cat: 'Stadt', price: 0, look: { pants: 0xd8c4a0, jacket: 0xe8762a, shirt: 0xf2d24a, skin: SK.pale, hair: 0xb89a6a, hat: 'cap', hatColor: 0xf4f4f4, glasses: 'sun', pack: true, packColor: 0x3a6fb0 } },
  { id: 'calcio', name: 'Fußballer Azzurro', cat: 'Stadt', price: 8000, look: { pants: 0xf4f4f4, jacket: 0x1f5fb8, shirt: 0x1f5fb8, sleeves: 0x1f5fb8, skin: SK.mid, hair: 0x2a1a10, back: '10', backColor: '#ffffff', shoes: 0xf4f4f4 } },
  { id: 'koch', name: 'Pizzabäcker', cat: 'Berufe', price: 0, look: { pants: 0x3a3a3a, jacket: 0xf6f6f6, shirt: 0xf6f6f6, skin: SK.mid, hair: 0x2a1a10, hat: 'chef', beard: 0x2a1a10 } },
  { id: 'gondoliere', name: 'Gondoliere', cat: 'Berufe', price: 5000, look: { pants: 0x111111, jacket: 0xf6f6f6, shirt: 0xc8202a, sleeves: 0xf6f6f6, skin: SK.tan, hair: 0x2a1a10, hat: 'straw', hatColor: 0xe8d38a } },
  { id: 'mechaniker', name: 'Mechaniker', cat: 'Berufe', price: 4000, look: { pants: 0x2a4a7a, jacket: 0x2a4a7a, shirt: 0x2a4a7a, skin: SK.tan, hair: 0x2a1a10, hat: 'cap', hatColor: 0xb3202a, hands: 0x2a2a2a } },
  { id: 'arzt', name: 'Arzt', cat: 'Berufe', price: 9000, look: { pants: 0x3a5a8a, jacket: 0xf6f6f6, shirt: 0x7fb0d8, skin: SK.light, hair: 0x6b5a48, glasses: 'nerd', back: 'MEDICO', backColor: '#c8202a' } },
  { id: 'pilot', name: 'Pilot', cat: 'Berufe', price: 14000, look: { pants: 0x111a2a, jacket: 0xf4f4f4, shirt: 0xf4f4f4, tie: 0x111a2a, sleeves: 0xf4f4f4, skin: SK.mid, hair: 0x2a1a10, hat: 'pilot', hatColor: 0x111a2a, glasses: 'sun' } },
  { id: 'feuerwehr', name: 'Feuerwehrmann', cat: 'Berufe', price: 16000, look: { pants: 0x2a2a2a, jacket: 0xb3202a, shirt: 0xf2c230, skin: SK.mid, hair: 0x2a1a10, hat: 'helmet', hatColor: 0xf2c230, back: 'VVF', backColor: '#f2c230' } },
  { id: 'bau', name: 'Bauarbeiter', cat: 'Berufe', price: 3000, look: { pants: 0x2a4a7a, jacket: 0xf28a1a, shirt: 0xf2d24a, skin: SK.tan, hair: 0x2a1a10, hat: 'hard', hatColor: 0xf2c230, beard: 0x3a2a1a } },
  { id: 'rennfahrer', name: 'Rennfahrer', cat: 'Sport', price: 45000, look: { pants: 0xc8101a, jacket: 0xc8101a, shirt: 0xf2c230, sleeves: 0xc8101a, skin: SK.light, hair: 0x2a1a10, hat: 'helmet', hatColor: 0xc8101a, glasses: 'visor', hands: 0x111111 } },
  { id: 'taucher', name: 'Taucher', cat: 'Sport', price: 12000, look: { pants: 0x0d1b2a, jacket: 0x0d1b2a, shirt: 0x1f6fb8, skin: SK.light, hair: 0x2a1a10, glasses: 'goggles', hands: 0x0d1b2a, shoes: 0x1f6fb8, pack: true, packColor: 0xf2c230 } },
  { id: 'cowboy', name: 'Cowboy', cat: 'Spaß', price: 28000, look: { pants: 0x2a3a5a, jacket: 0x7a4a2a, shirt: 0xd8c4a0, skin: SK.tan, hair: 0x3a2a1a, hat: 'cowboy', hatColor: 0x6b4422, beard: 0x3a2a1a, shoes: 0x4a2a1a } },
  { id: 'astronaut', name: 'Astronaut', cat: 'Spaß', price: 120000, look: { pants: 0xeeeeee, jacket: 0xeeeeee, shirt: 0xd8d8d8, skin: SK.light, hair: 0x2a1a10, hat: 'space', hands: 0xeeeeee, shoes: 0xdddddd, pack: true, packColor: 0xdddddd, back: 'ASI', backColor: '#1f5fb8' } },
  { id: 'zombie', name: 'Zombie', cat: 'Spaß', price: 33000, look: { pants: 0x3a3a2a, jacket: 0x5a5a4a, shirt: 0x7a2a2a, skin: 0x7fa06a, hair: 0x2a2a1a, hairStyle: 'mohawk' } },
  { id: 'punk', name: 'Punk', cat: 'Spaß', price: 11000, look: { pants: 0x2a2a2a, jacket: 0x111111, shirt: 0xc8202a, skin: SK.pale, hair: 0x2fc85a, hairStyle: 'mohawk', chain: true } },
  { id: 'koenig', name: 'König', cat: 'Luxus', price: 500000, look: { pants: 0x4a1a6a, jacket: 0x6a2a8a, shirt: 0xf2c230, skin: SK.mid, hair: 0x2a1a10, hat: 'crown', chain: true, beard: 0x2a1a10, shoes: 0xe8c040 } },
  { id: 'gold', name: 'Goldener Anzug', cat: 'Luxus', price: 1000000, look: { pants: 0xd6b04a, jacket: 0xd6b04a, shirt: 0x111111, tie: 0xd6b04a, skin: SK.mid, hair: 0x111111, glasses: 'sun', chain: true, shoes: 0xd6b04a } },
  { id: 'diva', name: 'Diva', cat: 'Luxus', price: 80000, look: { pants: 0xb3202a, jacket: 0xb3202a, shirt: 0xb3202a, skin: SK.light, hair: 0xe8c48a, female: true, glasses: 'sun', chain: true, shoes: 0xb3202a } },
  { id: 'agentin', name: 'Geheimagentin', cat: 'Luxus', price: 55000, look: { pants: 0x111111, jacket: 0x111111, shirt: 0x111111, skin: SK.light, hair: 0x3a1a10, female: true, glasses: 'sun', hands: 0x111111 } },
  { id: 'admin', name: '★ Admin-Imperator', cat: 'Admin', price: 0, admin: true, look: { pants: 0x111111, jacket: 0xd6b04a, shirt: 0x111111, tie: 0xc8202a, skin: SK.mid, hair: 0x111111, hat: 'crown', glasses: 'sun', chain: true, back: 'ADMIN', backColor: '#111111', shoes: 0xd6b04a } }
];
IE.skinById = {}; IE.skins.forEach(s => IE.skinById[s.id] = s);

// ===================== MOTORRÄDER (normal kaufbar im Autosalone) =====================
IE.cars.push(
  { id: 'scatto',   name: 'Scatto 600 (Motorrad)',        price: 38000,  speed: 74,  accel: 40, grip: 2.6, color: 0xc8102e, kind: 'moto' },
  { id: 'strada',   name: 'Strada Cruiser (Motorrad)',    price: 46000,  speed: 58,  accel: 26, grip: 2.3, color: 0x1a1a1a, kind: 'moto' },
  { id: 'cross',    name: 'Cross Enduro (Motorrad)',      price: 34000,  speed: 60,  accel: 34, grip: 2.9, color: 0x2fae4a, kind: 'moto' },
  { id: 'fulmoto',  name: 'Fulmine Elettrica (Motorrad)', price: 120000, speed: 92,  accel: 56, grip: 2.8, color: 0x18c2d8, kind: 'moto' }
);

// ===================== ERWEITERUNGEN / PACKS – exklusive Inhalte =====================
// Pack-Fahrzeuge/-Waffen: price 0 + pack-Flag -> in normalen Läden versteckt, nur über Packs freischaltbar
IE.cars.push(
  { id: 'ufo',       name: 'Disco Volante X (Sci-Fi)',   price: 0, speed: 118, accel: 60, grip: 3.3, color: 0x18e0e0, kind: 'super',  pack: 'scifi' },
  { id: 'hover',     name: 'Hover GT (Sci-Fi)',          price: 0, speed: 110, accel: 54, grip: 3.1, color: 0x8a3cf0, kind: 'sport',  pack: 'scifi' },
  { id: 'hearse',    name: 'Leichenwagen (Halloween)',   price: 0, speed: 70,  accel: 26, grip: 2.3, color: 0x0b0b0d, kind: 'limo',   pack: 'halloween' },
  { id: 'pumpkin',   name: 'Kürbis-Monster (Halloween)', price: 0, speed: 66,  accel: 34, grip: 2.8, color: 0xe8761a, kind: 'suv',    pack: 'halloween' },
  { id: 'firework',  name: 'Raketen-GT (Silvester)',     price: 0, speed: 112, accel: 58, grip: 2.9, color: 0xf2c230, kind: 'super',  pack: 'silvester' },
  { id: 'beachbug',  name: 'Strandflitzer (Sommer)',     price: 0, speed: 72,  accel: 30, grip: 2.5, color: 0x18c2d8, kind: 'cabrio', pack: 'sommer' },
  { id: 'herbstgt',  name: 'Herbst GT (Herbst)',         price: 0, speed: 84,  accel: 36, grip: 2.6, color: 0xc8641a, kind: 'sport',  pack: 'herbst' },
  { id: 'schoolbus', name: 'Schulbus (Schule)',          price: 0, speed: 48,  accel: 14, grip: 2.0, color: 0xf2c230, kind: 'van',    pack: 'schule' },
  { id: 'moped',     name: 'Schul-Moped (Schule)',       price: 0, speed: 40,  accel: 20, grip: 2.4, color: 0x3a6fb0, kind: 'moto',   pack: 'schule' },
  { id: 'f1rosso',   name: 'F1 Rosso (Formel 1)',        price: 0, speed: 116, accel: 62, grip: 3.6, color: 0xc8101a, kind: 'super',  pack: 'formel1' },
  { id: 'f1argento', name: 'F1 Argento (Formel 1)',      price: 0, speed: 116, accel: 62, grip: 3.6, color: 0xcfd6dc, kind: 'super',  pack: 'formel1' },
  { id: 'xpanettone', name: 'Panettone GT (Weihnachten)', price: 0, speed: 98, accel: 44, grip: 2.9, color: 0xc8102e, kind: 'super',  pack: 'xmas' },
  { id: 'xrentier',   name: 'Rentier-Monster (Weihnachten)', price: 0, speed: 64, accel: 32, grip: 2.9, color: 0x7a4a2a, kind: 'suv', pack: 'xmas' }
);
IE.boats.push(
  { id: 'hoverboat',  name: 'Hover-Gleiter (Sci-Fi)',     price: 0, speed: 70, accel: 30, color: 0x18e0e0, accent: 0x8a3cf0, kind: 'speed', pack: 'scifi' },
  { id: 'ghostyacht', name: 'Geister-Yacht (Halloween)',  price: 0, speed: 34, accel: 9,  color: 0x1a1a1f, accent: 0x8a3cf0, kind: 'yacht', pack: 'halloween' },
  { id: 'partyyacht', name: 'Party-Yacht (Silvester)',    price: 0, speed: 36, accel: 10, color: 0x101018, accent: 0xf2c230, kind: 'yacht', pack: 'silvester' },
  { id: 'sunyacht',   name: 'Sonnen-Yacht (Sommer)',      price: 0, speed: 34, accel: 9,  color: 0xf6f0e0, accent: 0x18c2d8, kind: 'yacht', pack: 'sommer' },
  { id: 'xyachtlux',  name: 'Weihnachts-Luxusyacht',      price: 0, speed: 36, accel: 10, color: 0xb3001b, accent: 0xd6b04a, kind: 'yacht', pack: 'xmas' }
);
IE.planes.push(
  { id: 'ufojet',     name: 'UFO-Jet (Sci-Fi)',           price: 0, speed: 220, minSpeed: 30, turn: 1.8, color: 0x18e0e0, accent: 0x8a3cf0, kind: 'jet',     pack: 'scifi' },
  { id: 'batplane',   name: 'Fledermaus-Jet (Halloween)', price: 0, speed: 160, minSpeed: 40, turn: 1.5, color: 0x1a1a1f, accent: 0x8a3cf0, kind: 'fighter', pack: 'halloween' },
  { id: 'fireworkjet',name: 'Feuerwerk-Jet (Silvester)',  price: 0, speed: 170, minSpeed: 42, turn: 1.6, color: 0xf2c230, accent: 0xc8101a, kind: 'fighter', pack: 'silvester' },
  { id: 'xjet',       name: 'Weihnachts-Jet',             price: 0, speed: 160, minSpeed: 40, turn: 1.4, color: 0xc8102e, accent: 0xd6b04a, kind: 'fighter', pack: 'xmas' }
);
IE.weapons.push(
  { id: 'laserpulse',  name: 'Puls-Laser (Sci-Fi)',        price: 0, dmg: 70,  rate: 0.1,  range: 350, spread: 0,     ammoPrice: 0, clip: 400, pellets: 1, auto: true,  laser: true,  pack: 'scifi' },
  { id: 'kuerbis',     name: 'Kürbis-Werfer (Halloween)',  price: 0, dmg: 70,  rate: 0.9,  range: 120, spread: 0.01,  ammoPrice: 0, clip: 20,  pellets: 1, auto: false, explode: 6,   pack: 'halloween' },
  { id: 'raketenbox',  name: 'Feuerwerks-Box (Silvester)', price: 0, dmg: 120, rate: 1.0,  range: 300, spread: 0.02,  ammoPrice: 0, clip: 12,  pellets: 4, auto: false, explode: 7,   pack: 'silvester' },
  { id: 'wasserwerfer',name: 'Wasserwerfer (Sommer)',      price: 0, dmg: 8,   rate: 0.05, range: 70,  spread: 0.04,  ammoPrice: 0, clip: 400, pellets: 1, auto: true,  pack: 'sommer' },
  { id: 'schneeball',  name: 'Schneeball-MG (Weihnachten)',price: 0, dmg: 12,  rate: 0.08, range: 90,  spread: 0.05,  ammoPrice: 0, clip: 300, pellets: 1, auto: true,  pack: 'xmas' },
  { id: 'konfetti',    name: 'Konfetti-Kanone (Schule)',   price: 0, dmg: 10,  rate: 0.1,  range: 60,  spread: 0.08,  ammoPrice: 0, clip: 300, pellets: 3, auto: true,  pack: 'schule' }
);
IE.skins.push(
  { id: 'santa',      name: 'Weihnachtsmann', cat: 'Pack', price: 0, fromPack: 'xmas',      look: { pants: 0xb3001b, jacket: 0xc8102e, shirt: 0xffffff, skin: SK.light, hair: 0xf2f2f2, beard: 0xf2f2f2, hat: 'cap', hatColor: 0xc8102e } },
  { id: 'alienpilot', name: 'Alien-Pilot',    cat: 'Pack', price: 0, fromPack: 'scifi',     look: { pants: 0x2a3a2a, jacket: 0x1fae8a, shirt: 0x0f2a1a, skin: 0x8fbf6a, hair: 0x1fae8a, glasses: 'visor', hands: 0x8fbf6a } },
  { id: 'geist',      name: 'Geist',          cat: 'Pack', price: 0, fromPack: 'halloween', look: { pants: 0xe8e8e8, jacket: 0xf2f2f2, shirt: 0xf2f2f2, skin: 0xe8e8e8, hair: 0xf2f2f2, mask: 'face', maskColor: 0xffffff, hands: 0xf2f2f2 } },
  { id: 'partyking',  name: 'Party-König',    cat: 'Pack', price: 0, fromPack: 'silvester', look: { pants: 0x101018, jacket: 0xf2c230, shirt: 0x101018, tie: 0xf2c230, skin: SK.mid, hair: 0x111111, glasses: 'sun', chain: true, hat: 'crown' } },
  { id: 'strand',     name: 'Strand-Typ',     cat: 'Pack', price: 0, fromPack: 'sommer',    look: { pants: 0xf2a61a, jacket: 0x18c2d8, shirt: 0xf2d24a, skin: SK.tan, hair: 0xb89a6a, glasses: 'sun' } },
  { id: 'jaeger',     name: 'Jäger',          cat: 'Pack', price: 0, fromPack: 'herbst',    look: { pants: 0x5a4a2a, jacket: 0x6b5a2a, shirt: 0x3a4a2a, skin: SK.tan, hair: 0x3a2a1a, hat: 'cowboy', hatColor: 0x4a3a1a, beard: 0x3a2a1a } },
  { id: 'schueler',   name: 'Schüler',        cat: 'Pack', price: 0, fromPack: 'schule',    look: { pants: 0x1f2c48, jacket: 0xb3202a, shirt: 0xffffff, tie: 0x1f2c48, skin: SK.light, hair: 0x2a1a10 } }
);
// ById-Maps neu aufbauen, damit die neuen Inhalte enthalten sind
IE.carById = {}; IE.cars.forEach(c => IE.carById[c.id] = c);
IE.boatById = {}; IE.boats.forEach(b => IE.boatById[b.id] = b);
IE.planeById = {}; IE.planes.forEach(p => IE.planeById[p.id] = p);
IE.weaponById = {}; IE.weapons.forEach(w => IE.weaponById[w.id] = w);
IE.skinById = {}; IE.skins.forEach(s => IE.skinById[s.id] = s);

IE.packs = [
  { id: 'sport',     name: 'Sportwagen', emoji: '🏎️', color: 0xc8101a, price: 75000000,  desc: 'Die schnellsten Supersportwagen Italiens.',
    cars: ['toro', 'rosso', 'fulmine', 'gt3'], skins: ['rennfahrer'] },
  { id: 'xmas',      name: 'Weihnachten', emoji: '🎄', color: 0xc8102e, price: 90000000,  desc: 'Eigene Weihnachtsfahrzeuge, Luxusyacht, Weihnachts-Jet & Schneeball-MG. (Adventskalender-Autos bleiben exklusiv im Kalender.)',
    cars: ['xpanettone', 'xrentier'], boats: ['xyachtlux'], planes: ['xjet'], weapons: ['schneeball'], skins: ['santa'] },
  { id: 'herbst',    name: 'Herbst', emoji: '🍂', color: 0xc8641a, price: 35000000,  desc: 'Herbstlicher Flitzer, Oldtimer & Jäger-Outfit.',
    cars: ['herbstgt', 'classica'], skins: ['jaeger'] },
  { id: 'sommer',    name: 'Sommer', emoji: '☀️', color: 0x18c2d8, price: 45000000,  desc: 'Cabrio, Jetski, Sonnen-Yacht & Wasserwerfer.',
    cars: ['beachbug', 'spider'], boats: ['sunyacht', 'jetski'], weapons: ['wasserwerfer'], skins: ['strand'] },
  { id: 'scifi',     name: 'Sci-Fi', emoji: '🛸', color: 0x18e0e0, price: 150000000,  desc: 'Hover-Autos, UFO-Jet, Hover-Boot & Puls-Laser.',
    cars: ['ufo', 'hover'], boats: ['hoverboat'], planes: ['ufojet'], weapons: ['laserpulse'], skins: ['alienpilot'] },
  { id: 'schule',    name: 'Schule', emoji: '🎒', color: 0xf2c230, price: 25000000,   desc: 'Schulbus, Moped, Konfetti-Kanone & Schüler-Outfit.',
    cars: ['schoolbus', 'moped'], weapons: ['konfetti'], skins: ['schueler'] },
  { id: 'militaer',  name: 'Militär', emoji: '🪖', color: 0x59613d, price: 200000000,  desc: 'Panzer, Militärjeep, Kampfjet, Kampfheli & schwere Waffen.',
    cars: ['panzer', 'jeep'], planes: ['caccia'], helis: ['predatore'], weapons: ['ak', 'rpg'], skins: ['soldat'] },
  { id: 'italien',   name: 'Italien', emoji: '🇮🇹', color: 0x2e8b57, price: 40000000,  desc: 'Italienische Klassiker, Riva-Boot & Tricolore-Jet.',
    cars: ['classica', 'topolino', 'barchetta'], boats: ['riva'], planes: ['freccia'], skins: ['calcio'] },
  { id: 'silvester', name: 'Silvester', emoji: '🎆', color: 0xf2c230, price: 55000000, desc: 'Feuerwerk-GT, Party-Yacht, Feuerwerk-Jet & Raketen-Box.',
    cars: ['firework'], boats: ['partyyacht'], planes: ['fireworkjet'], weapons: ['raketenbox'], skins: ['partyking'] },
  { id: 'halloween', name: 'Halloween', emoji: '🎃', color: 0xe8761a, price: 60000000, desc: 'Leichenwagen, Kürbis-Monster, Geister-Yacht, Bat-Jet & Kürbis-Werfer.',
    cars: ['hearse', 'pumpkin'], boats: ['ghostyacht'], planes: ['batplane'], weapons: ['kuerbis'], skins: ['geist'] },
  { id: 'formel1',   name: 'Formel 1', emoji: '🏁', color: 0xc8101a, price: 120000000,  desc: 'Zwei Formel-1-Boliden & Rennfahrer-Outfit.',
    cars: ['f1rosso', 'f1argento'], skins: ['rennfahrer'] },
  { id: 'luxus',     name: 'Luxus', emoji: '💎', color: 0xd6b04a, price: 500000000, desc: 'Vergoldete Hyper-Autos, Luxus-Jet & Yacht Azzurra.',
    cars: ['oro', 'diamante', 'leggenda', 'imperatore'], boats: ['yacht'], planes: ['jetxl'], skins: ['gold'] }
];
IE.packById = {}; IE.packs.forEach(p => IE.packById[p.id] = p);

// ===================== ENGEL & TEUFEL PACK + HANDY-LÄDEN =====================
IE.cars.push(
  { id: 'engel',  name: 'Engel-GT (Engel & Teufel)',  price: 0, speed: 104, accel: 50, grip: 3.1, color: 0xf7f3e8, kind: 'super', pack: 'engelteufel' },
  { id: 'teufel', name: 'Teufel-GT (Engel & Teufel)', price: 0, speed: 104, accel: 52, grip: 3.0, color: 0x7a0c14, kind: 'super', pack: 'engelteufel' }
);
IE.planes.push(
  { id: 'engelflug',  name: 'Engels-Jet',  price: 0, speed: 170, minSpeed: 40, turn: 1.6, color: 0xffffff, accent: 0xd6b04a, kind: 'fighter', pack: 'engelteufel' },
  { id: 'teufelflug', name: 'Teufels-Jet', price: 0, speed: 180, minSpeed: 42, turn: 1.5, color: 0x1a0a0a, accent: 0xc8101a, kind: 'fighter', pack: 'engelteufel' }
);
IE.weapons.push(
  { id: 'heiligenschein', name: 'Heiligenschein-Laser', price: 0, dmg: 85,  rate: 0.12, range: 360, spread: 0,    ammoPrice: 0, clip: 300, pellets: 1, auto: true,  laser: true, pack: 'engelteufel' },
  { id: 'dreizack',       name: 'Höllen-Dreizack',      price: 0, dmg: 130, rate: 1.0,  range: 280, spread: 0.02, ammoPrice: 0, clip: 14,  pellets: 1, auto: false, explode: 7,  pack: 'engelteufel' }
);
IE.skins.push(
  { id: 'engelskin',  name: 'Engel',  cat: 'Pack', price: 0, fromPack: 'engelteufel', look: { pants: 0xf4f1e6, jacket: 0xfbf8ef, shirt: 0xffffff, skin: SK.light, hair: 0xf2e2b0, chain: true, shoes: 0xf4f1e6 } },
  { id: 'teufelskin', name: 'Teufel', cat: 'Pack', price: 0, fromPack: 'engelteufel', look: { pants: 0x160808, jacket: 0x7a0c14, shirt: 0x160808, tie: 0xc8101a, skin: 0xc8402e, hair: 0x160808, glasses: 'sun', hands: 0xc8402e, shoes: 0x160808 } }
);
IE.carById = {}; IE.cars.forEach(c => IE.carById[c.id] = c);
IE.planeById = {}; IE.planes.forEach(p => IE.planeById[p.id] = p);
IE.weaponById = {}; IE.weapons.forEach(w => IE.weaponById[w.id] = w);
IE.skinById = {}; IE.skins.forEach(s => IE.skinById[s.id] = s);
IE.packs.push(
  { id: 'engelteufel', name: 'Engel & Teufel', emoji: '😇', color: 0xc8101a, price: 180000000,
    desc: 'Himmlische & höllische Supersportwagen, Engels- & Teufels-Jet, Heiligenschein-Laser, Höllen-Dreizack sowie Engel- & Teufel-Outfit.',
    cars: ['engel', 'teufel'], planes: ['engelflug', 'teufelflug'], weapons: ['heiligenschein', 'dreizack'], skins: ['engelskin', 'teufelskin'] }
);
IE.packById = {}; IE.packs.forEach(p => IE.packById[p.id] = p);

// Handy-Läden in großen Städten (kein Innenraum – Kauf per E am Marker)
IE.shops.push(
  { type: 'phone', city: 'neapel',  dx: 40,   dz: -70 },
  { type: 'phone', city: 'rom',     dx: -110, dz: -30 },
  { type: 'phone', city: 'mailand', dx: 30,   dz: 90 },
  { type: 'phone', city: 'venedig', dx: 70,   dz: -40 }
);

// ===================== STAR WARS, JAMES BOND, FOOD, ATOM & ADMIN PACKS + FREIZEITPARK =====================
IE.cars.push(
  { id: 'speeder',    name: 'Landgleiter (Star Wars)',  price: 0, speed: 100, accel: 50, grip: 2.8, color: 0xdfe6ea, kind: 'cabrio', pack: 'starwars' },
  { id: 'podracer',   name: 'Podracer (Star Wars)',     price: 0, speed: 120, accel: 60, grip: 3.0, color: 0xe8761a, kind: 'super',  pack: 'starwars' },
  { id: 'spion',      name: 'Agenten-Sportwagen (007)', price: 0, speed: 96,  accel: 44, grip: 3.0, color: 0xcfd6dc, kind: 'sport',  pack: 'bond' },
  { id: 'spionsuv',   name: 'Agenten-SUV (007)',        price: 0, speed: 70,  accel: 32, grip: 2.6, color: 0x101014, kind: 'suv',    pack: 'bond' },
  { id: 'burgerauto', name: 'Burger-Mobil (Food)',      price: 0, speed: 60,  accel: 28, grip: 2.4, color: 0xd9a441, kind: 'suv',    pack: 'food' },
  { id: 'pizzaauto',  name: 'Pizza-Flitzer (Food)',     price: 0, speed: 58,  accel: 24, grip: 2.3, color: 0xc8101a, kind: 'retro',  pack: 'food' },
  { id: 'hotdogauto', name: 'Hotdog-Van (Food)',        price: 0, speed: 55,  accel: 20, grip: 2.1, color: 0xd83a2a, kind: 'van',    pack: 'food' },
  { id: 'reaktor',    name: 'Reaktor GT (Atom)',        price: 0, speed: 110, accel: 54, grip: 3.0, color: 0x3fff6a, kind: 'super',  pack: 'atom' },
  { id: 'atommonster',name: 'Atom-Monster (Atom)',      price: 0, speed: 66,  accel: 34, grip: 2.8, color: 0x6aff2a, kind: 'suv',    pack: 'atom' }
);
IE.boats.push(
  { id: 'spionyacht', name: 'Agenten-Yacht (007)',      price: 0, speed: 40, accel: 10, color: 0x101018, accent: 0xcfd6dc, kind: 'yacht', pack: 'bond' },
  { id: 'sushiyacht', name: 'Sushi-Yacht (Food)',       price: 0, speed: 36, accel: 10, color: 0xf6f0e0, accent: 0xe8761a, kind: 'yacht', pack: 'food' }
);
IE.planes.push(
  { id: 'xwing',      name: 'Sternjäger X (Star Wars)', price: 0, speed: 200, minSpeed: 40, turn: 1.8, color: 0xcfd6dc, accent: 0xc8101a, kind: 'fighter', pack: 'starwars' },
  { id: 'tiefighter', name: 'TIE-Jäger (Star Wars)',    price: 0, speed: 190, minSpeed: 42, turn: 1.7, color: 0x2a2a2e, accent: 0x6a6a72, kind: 'fighter', pack: 'starwars' },
  { id: 'spionjet',   name: 'Agenten-Jet (007)',        price: 0, speed: 200, minSpeed: 45, turn: 1.0, color: 0xdfe6ea, accent: 0x1b3d6e, kind: 'jet',     pack: 'bond' },
  { id: 'pizzajet',   name: 'Pizza-Jet (Food)',         price: 0, speed: 150, minSpeed: 40, turn: 1.4, color: 0xc8101a, accent: 0xf2c230, kind: 'fighter', pack: 'food' },
  { id: 'atomjet',    name: 'Atom-Jet (Atom)',          price: 0, speed: 200, minSpeed: 42, turn: 1.5, color: 0x3fff6a, accent: 0xf2f230, kind: 'fighter', pack: 'atom' }
);
IE.weapons.push(
  { id: 'blaster',      name: 'Laser-Blaster (Star Wars)',      price: 0, dmg: 55,  rate: 0.14, range: 220, spread: 0.005, ammoPrice: 0, clip: 200,  pellets: 1, auto: true,  laser: true, pack: 'starwars' },
  { id: 'laserschwert', name: 'Laserschwert (Star Wars)',       price: 0, dmg: 220, rate: 0.25, range: 6,   spread: 0,     ammoPrice: 0, clip: 9999, pellets: 1, auto: true,  laser: true, pack: 'starwars' },
  { id: 'goldwaffe',    name: 'Goldene Pistole (007)',          price: 0, dmg: 500, rate: 0.5,  range: 200, spread: 0,     ammoPrice: 0, clip: 50,   pellets: 1, auto: false, pack: 'bond' },
  { id: 'schallpistole',name: 'Schallgedämpfte Pistole (007)',  price: 0, dmg: 80,  rate: 0.25, range: 160, spread: 0.004, ammoPrice: 0, clip: 60,   pellets: 1, auto: false, pack: 'bond' },
  { id: 'atombombe',    name: 'Atombomben-Werfer (Atom)',       price: 0, dmg: 500, rate: 2.5,  range: 320, spread: 0.01,  ammoPrice: 0, clip: 5,    pellets: 1, auto: false, explode: 16, pack: 'atom' },
  { id: 'strahlung',    name: 'Strahlenkanone (Atom)',          price: 0, dmg: 45,  rate: 0.1,  range: 300, spread: 0,     ammoPrice: 0, clip: 400,  pellets: 1, auto: true,  laser: true, pack: 'atom' },
  { id: 'ketchup',      name: 'Ketchup-Werfer (Food)',          price: 0, dmg: 9,   rate: 0.06, range: 60,  spread: 0.05,  ammoPrice: 0, clip: 300,  pellets: 1, auto: true,  pack: 'food' }
);
IE.skins.push(
  { id: 'jedi',    name: 'Jedi',             cat: 'Pack', price: 0, fromPack: 'starwars', look: { pants: 0x6a5436, jacket: 0x7a6342, shirt: 0x8a7352, skin: SK.light, hair: 0x6b5a48, beard: 0x6b5a48 } },
  { id: 'sith',    name: 'Sith',             cat: 'Pack', price: 0, fromPack: 'starwars', look: { pants: 0x0b0b0d, jacket: 0x0b0b0d, shirt: 0x0b0b0d, skin: SK.pale, hair: 0x0b0b0d, glasses: 'sun', hands: 0x0b0b0d } },
  { id: 'agent007',name: 'Geheimagent 007',  cat: 'Pack', price: 0, fromPack: 'bond',     look: { pants: 0x0d0d0f, jacket: 0x0d0d0f, shirt: 0xffffff, bow: 0x0d0d0f, skin: SK.mid, hair: 0x1a1a1a, glasses: 'sun', shoes: 0x050505 } },
  { id: 'foodie',  name: 'Fast-Food-Fan',    cat: 'Pack', price: 0, fromPack: 'food',     look: { pants: 0xc8641a, jacket: 0xf2c230, shirt: 0xc8101a, skin: SK.tan, hair: 0x2a1a10, hat: 'chef' } },
  { id: 'hazmat',  name: 'Atom-Schutzanzug', cat: 'Pack', price: 0, fromPack: 'atom',     look: { pants: 0xf2c230, jacket: 0xf2c230, shirt: 0xf2c230, skin: SK.light, hair: 0x111111, hat: 'space', hands: 0xf2c230, shoes: 0xf2c230 } }
);
IE.carById = {}; IE.cars.forEach(c => IE.carById[c.id] = c);
IE.boatById = {}; IE.boats.forEach(b => IE.boatById[b.id] = b);
IE.planeById = {}; IE.planes.forEach(p => IE.planeById[p.id] = p);
IE.weaponById = {}; IE.weapons.forEach(w => IE.weaponById[w.id] = w);
IE.skinById = {}; IE.skins.forEach(s => IE.skinById[s.id] = s);
IE.packs.push(
  { id: 'starwars', name: 'Star Wars', emoji: '⚔️', color: 0x3a9bff, price: 200000000, desc: 'Landgleiter, Podracer, Sternjäger X & TIE-Jäger, Laser-Blaster, Laserschwert sowie Jedi-, Sith- & Sturmtruppen-Outfit.',
    cars: ['speeder', 'podracer'], planes: ['xwing', 'tiefighter'], weapons: ['blaster', 'laserschwert'], skins: ['jedi', 'sith', 'trooper'] },
  { id: 'bond', name: 'James Bond', emoji: '🕵️', color: 0x111111, price: 150000000, desc: 'Agenten-Sportwagen & -SUV, Agenten-Jet & -Yacht, Goldene Pistole, schallgedämpfte Pistole, Agenten-Outfit & Smoking.',
    cars: ['spion', 'spionsuv'], planes: ['spionjet'], boats: ['spionyacht'], weapons: ['goldwaffe', 'schallpistole'], skins: ['agent007', 'smoking'] },
  { id: 'food', name: 'Food', emoji: '🍔', color: 0xf2c230, price: 80000000, desc: 'Autos, Jet & Yacht, die wie Essen aussehen: Burger-Mobil, Pizza-Flitzer, Hotdog-Van, Pizza-Jet, Burger-Jet, Sushi-Yacht & Ketchup-Werfer.',
    cars: ['burgerauto', 'pizzaauto', 'hotdogauto'], planes: ['pizzajet', 'burger'], boats: ['sushiyacht'], weapons: ['ketchup'], skins: ['foodie', 'koch'] },
  { id: 'atom', name: 'Atom', emoji: '☢️', color: 0x6aff2a, price: 250000000, desc: 'Reaktor GT, Atom-Monster, Atom-Jet, Atombomben-Werfer & Strahlenkanone sowie Atom-Schutzanzug.',
    cars: ['reaktor', 'atommonster'], planes: ['atomjet'], weapons: ['atombombe', 'strahlung'], skins: ['hazmat'] },
  { id: 'adminpack', name: 'Admin', emoji: '👑', color: 0xd6b04a, price: 1000000000, special: true, desc: 'Kein Admin-Panel, aber mächtige Extras: Teleport zu anderen Spielern, Kassierer anheuern (holen Geld aus deinen Shops), deine eigenen Shops besonders markiert – plus König- & Gold-Outfit.',
    skins: ['koenig', 'gold'] }
);
IE.packById = {}; IE.packs.forEach(p => IE.packById[p.id] = p);

// Freizeitpark hinter den großen Bergen (nördlich der Alpen bei Como) + Zufahrtsstraße
IE.funpark = { x: -600, z: -2180, r: 120, h: 30 };
IE.flatZones.push({ x: IE.funpark.x, z: IE.funpark.z, hw: 150, hd: 120, h: IE.funpark.h, f: 70 });
IE.parkRoad = [[-852, -1770], [-810, -1870], [-740, -1970], [-680, -2060], [-640, -2130], [-600, -2175]];
for (let i = 1; i < IE.parkRoad.length; i++) { const a = IE.parkRoad[i - 1], b = IE.parkRoad[i]; IE.flatZones.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: Math.abs(b[0] - a[0]) / 2 + 11, hd: Math.abs(b[1] - a[1]) / 2 + 11, h: IE.funpark.h, f: 24, small: true }); }

// ===================== MOLOTOWCOCKTAIL + JONATHAN-PACK =====================
IE.weapons.push(
  { id: 'molotov', name: 'Molotowcocktail', price: 8000, dmg: 12, rate: 0.9, range: 90, spread: 0.02, ammoPrice: 200, clip: 10, pellets: 1, auto: false, explode: 3, fire: true }
);
IE.cars.push(
  { id: 'jonathanmobil', name: 'Jonathan Gauner-Mobil', price: 0, speed: 92, accel: 46, grip: 2.8, color: 0x1a1a1f, kind: 'sport', pack: 'jonathan' }
);
IE.weapons.push(
  { id: 'stuhl', name: 'Stuhl', price: 0, dmg: 70, rate: 0.5, range: 2.8, spread: 0, ammoPrice: 0, clip: 9999, pellets: 1, auto: false, melee: true, pack: 'jonathan' },
  { id: 'mace', name: 'Minecraft-Mace', price: 0, dmg: 200, rate: 0.9, range: 3.4, spread: 0, ammoPrice: 0, clip: 9999, pellets: 1, auto: false, melee: true, knock: true, pack: 'jonathan' }
);
IE.skins.push(
  { id: 'jonathan', name: 'Jonathan der Gauner', cat: 'Pack', price: 0, fromPack: 'jonathan', look: { pants: 0x1b1b1b, jacket: 0x2a2a2e, shirt: 0x1a1a1a, skin: SK.mid, hair: 0x111111, mask: 'ski', maskColor: 0x1a1a1a, hands: 0x111111, chain: true } }
);
IE.carById = {}; IE.cars.forEach(c => IE.carById[c.id] = c);
IE.weaponById = {}; IE.weapons.forEach(w => IE.weaponById[w.id] = w);
IE.skinById = {}; IE.skins.forEach(s => IE.skinById[s.id] = s);
IE.packs.push(
  { id: 'jonathan', name: 'Jonathan', emoji: '🧢', color: 0x1a1a1f, price: 30000000, desc: 'Das Jonathan Gauner-Mobil, ein Stuhl und eine Minecraft-Mace als Nahkampfwaffen, Molotowcocktails und das Gauner-Outfit.',
    cars: ['jonathanmobil'], weapons: ['stuhl', 'mace', 'molotov'], skins: ['jonathan'] }
);
IE.packById = {}; IE.packs.forEach(p => IE.packById[p.id] = p);

// ===================== PINGUIN, SCHOLL SMP, AVOCADO3SEB PACKS + GLEITER =====================
IE.cars.push(
  { id: 'pinguinauto', name: 'Pinguin-Mobil (Pinguin)', price: 0, speed: 56, accel: 24, grip: 2.6, color: 0x1a1a1a, kind: 'suv',    pack: 'pinguin' },
  { id: 'minecart',    name: 'Minecart (Scholl SMP)',   price: 0, speed: 52, accel: 20, grip: 2.3, color: 0xb0b4ba, kind: 'pickup', pack: 'schollsmp' },
  { id: 'avocadoauto', name: 'Avocado-Flitzer (Avocado3seb)', price: 0, speed: 72, accel: 30, grip: 2.6, color: 0x6a9a3a, kind: 'sport', pack: 'avocado' }
);
IE.boats.push(
  { id: 'eisboot', name: 'Eisbrecher-Boot (Pinguin)', price: 0, speed: 60, accel: 26, color: 0xeaf2f8, accent: 0x3a9bff, kind: 'speed', pack: 'pinguin' }
);
IE.planes.push(
  { id: 'segler',      name: 'Segelflugzeug (Gleiter)',    price: 300000, speed: 72,  minSpeed: 18, turn: 1.6, color: 0xf2f2ee, accent: 0x3a9bff, kind: 'stunt', glider: true },
  { id: 'drachen',     name: 'Drachenflieger (Gleiter)',   price: 180000, speed: 55,  minSpeed: 14, turn: 2.2, color: 0xf2a020, accent: 0xc8101a, kind: 'stunt', glider: true },
  { id: 'gleitschirm', name: 'Gleitschirm (Gleiter)',      price: 150000, speed: 46,  minSpeed: 12, turn: 2.5, color: 0xff5fd2, accent: 0xffffff, kind: 'stunt', glider: true }
);
IE.weapons.push(
  { id: 'diamantschwert', name: 'Diamantschwert (Scholl SMP)', price: 0, dmg: 160, rate: 0.35, range: 3.2, spread: 0, ammoPrice: 0, clip: 9999, pellets: 1, auto: true,  melee: true, pack: 'schollsmp' },
  { id: 'spitzhacke',     name: 'Diamant-Spitzhacke (Scholl SMP)', price: 0, dmg: 95, rate: 0.5, range: 2.8, spread: 0, ammoPrice: 0, clip: 9999, pellets: 1, auto: false, melee: true, knock: true, pack: 'schollsmp' },
  { id: 'tnt',            name: 'TNT (Scholl SMP)',           price: 0, dmg: 350, rate: 1.6, range: 120, spread: 0.01, ammoPrice: 0, clip: 8, pellets: 1, auto: false, explode: 11, pack: 'schollsmp' },
  { id: 'avocadowerfer',  name: 'Avocado-Werfer (Avocado3seb)', price: 0, dmg: 40, rate: 0.7, range: 90, spread: 0.02, ammoPrice: 0, clip: 14, pellets: 1, auto: false, explode: 3, pack: 'avocado' }
);
IE.skins.push(
  { id: 'pinguin',  name: 'Pinguin',   cat: 'Pack', price: 0, fromPack: 'pinguin',   look: { pants: 0x111111, jacket: 0x1a1a1a, shirt: 0xffffff, skin: SK.light, hair: 0x111111, hands: 0x111111, shoes: 0xf2a020 } },
  { id: 'steve',    name: 'Steve',     cat: 'Pack', price: 0, fromPack: 'schollsmp', look: { pants: 0x3a5fb0, jacket: 0x1aa0a0, shirt: 0x1aa0a0, skin: 0xe0a070, hair: 0x3a2a1a } },
  { id: 'avocado',  name: 'Avocado',   cat: 'Pack', price: 0, fromPack: 'avocado',   look: { pants: 0x3a5a2a, jacket: 0x6a9a3a, shirt: 0xd8c84a, skin: SK.tan, hair: 0x2a1a10 } }
);
IE.carById = {}; IE.cars.forEach(c => IE.carById[c.id] = c);
IE.boatById = {}; IE.boats.forEach(b => IE.boatById[b.id] = b);
IE.planeById = {}; IE.planes.forEach(p => IE.planeById[p.id] = p);
IE.weaponById = {}; IE.weapons.forEach(w => IE.weaponById[w.id] = w);
IE.skinById = {}; IE.skins.forEach(s => IE.skinById[s.id] = s);
IE.packs.push(
  { id: 'pinguin', name: 'Pinguin', emoji: '🐧', color: 0x1a1a1a, price: 40000000, desc: 'Pinguin-Mobil, Eisbrecher-Boot und Pinguin-Outfit.',
    cars: ['pinguinauto'], boats: ['eisboot'], skins: ['pinguin'] },
  { id: 'schollsmp', name: 'Scholl SMP', emoji: '⛏️', color: 0x1aa0a0, price: 60000000, desc: 'Minecraft-Sachen: Minecart, Diamantschwert, Diamant-Spitzhacke, TNT und Steve-Outfit.',
    cars: ['minecart'], weapons: ['diamantschwert', 'spitzhacke', 'tnt'], skins: ['steve'] },
  { id: 'avocado', name: 'Avocado3seb', emoji: '🥑', color: 0x6a9a3a, price: 40000000, desc: 'Avocado-Sachen: Avocado-Flitzer, Avocado-Werfer und Avocado-Outfit.',
    cars: ['avocadoauto'], weapons: ['avocadowerfer'], skins: ['avocado'] }
);
IE.packById = {}; IE.packs.forEach(p => IE.packById[p.id] = p);
