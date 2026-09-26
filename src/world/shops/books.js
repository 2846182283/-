/**
 * 青空書店 — a neighbourhood bookshop in a 看板建築 (flat signboard facade).
 * Navy signboard across the upper facade, vertical 本・雑誌・文具 sign,
 * short blue/white awning, aluminium sliding doors, magazine racks and a
 * 100-yen bargain cart outside, tall shelves of spines inside.
 */
import { shopHouse, room } from './shell.js';
import { awning, slidingDoors, pendant, ceilingLight, poster, projectingSign, pottedPlant, C } from './parts.js';

export function buildBooks(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.1;
  const Z = D / 2;
  const hs = shopHouse(S, {
    W, D, F, H1: 3.2, H2: 2.7, floors: 2,
    wall1: { kind: 'plaster', color: '#e9e6de' }, wall2: { kind: 'rows', color: '#c8d6e2' }, sides: { kind: 'plaster', color: '#e4e0d6' },
    open: { x0: -3.35, x1: 3.35, y1: 2.5 },
    win2: [{ x: -2.1, w: 1.3, h: 0.95, y: 1.7, rail: true }, { x: 2.1, w: 1.3, h: 0.95, y: 1.7, rail: true }],
    sideWin: [{ side: 1, z: -1.5, w: 0.8, h: 0.9, y: 4.6 }],
    roof: { type: 'kanban', color: '#5a6a78', parapet: 1.0, rise: 1.2 },
    bandColor: '#8ea4b8',
  });

  // --- storefront: 4 aluminium doors (two slid open), fixed side lights
  const zf = Z - 0.1;
  slidingDoors(S, -2.4, 2.4, F, F + 2.3, zf, { panels: 4, frame: C.alu, open: 0.9, bar: 0.045 });
  for (const [a, b] of [[-3.35, -2.4], [2.4, 3.35]]) {
    B.box('solid', a, F, zf - 0.05, b, F + 0.45, zf + 0.04, '#b8b8b2');
    B.quad('glass', (a + b) / 2, F + 1.38, zf, b - a, 1.84, '#fff');
    B.box('solid', a, F + 2.3, zf - 0.05, b, F + 2.5, zf + 0.05, C.alu);
  }
  B.box('solid', -2.4, F + 2.3, zf - 0.05, 2.4, F + 2.5, zf + 0.05, C.alu);
  for (const x of [-3.35, -2.4, 2.4, 3.35]) B.box('solid', x - 0.04, F, zf - 0.06, x + 0.04, F + 2.5, zf + 0.06, C.alu);
  poster(S, -2.87, F + 1.35, zf, 0.42, 0.6, A.get('bPoster'));
  poster(S, 2.87, F + 1.5, zf, 0.3, 0.38, A.get('hours'));
  poster(S, 2.87, F + 1.05, zf, 0.36, 0.12, A.get('pay'));
  poster(S, -2.87, F + 0.75, zf, 0.2, 0.2, A.cell('mascot', 1, 2, 2));
  B.box('solid', -2.5, S.gy(0, Z + 0.3) - 0.08, Z, 2.5, F - 0.005, Z + 0.3, '#c9c3b8'); // entrance step

  // --- signboard across the upper facade + vertical sign
  const y2 = hs.y2;
  B.box('solid', -3.5, y2 + 0.12, Z, 3.5, y2 + 1.05, Z + 0.1, '#263e66');
  B.quad('solid', 0, y2 + 0.585, Z + 0.105, 4.6, 0.86, '#ffffff', A.get('bSign'));
  for (const sx of [-1, 1]) B.box('solid', sx * 2.3 - 0.01, y2 + 0.2, Z + 0.1, sx * 2.3 + 0.01, y2 + 0.97, Z + 0.105, '#e8e0c8');
  projectingSign(S, W / 2 - 0.2, F + 4.1, Z, 0.42, 1.7, 0.12, A.get('bVert'), A.get('bVert'), { out: 0.15 });
  // blue/white awning
  awning(S, -3.55, 3.55, F + 2.95, Z + 0.02, 0.95, 0.35, { stripes: ['#3b6aa8', '#f4f2ea'], sw: 0.28, valH: 0.16, arms: 2 });

  // --- outside: magazine racks + bargain cart
  magazineRack(S, -2.3, Z + 0.45);
  bargainCart(S, 2.3, Z + 0.45);
  pottedPlant(S, -3.45, S.gy(-3.45, Z + 0.3), Z + 0.3, 1.0, { flowers: ['#f4c93a', '#fff'], nf: 5 });

  interior(S, F, Z);
  return hs;
}

/** Tiered wire rack with magazines leaning back (faces the street). */
function magazineRack(S, x, z) {
  const { B, A } = S;
  const gy = S.gy(x, z);
  B.pushT(x, gy, z, 0);
  for (const sx of [-0.55, 0.55]) {
    B.beam('solid', [sx, 0, 0.25], [sx, 1.35, -0.12], 0.025, 0.025, '#8e949a');
    B.beam('solid', [sx, 0, -0.2], [sx, 1.35, -0.12], 0.025, 0.025, '#8e949a');
  }
  for (let k = 0; k < 3; k++) {
    const yy = 0.25 + k * 0.4, zz = 0.18 - k * 0.1;
    B.box('solid', -0.58, yy - 0.02, zz - 0.06, 0.58, yy, zz + 0.06, '#8e949a');
    for (let i = 0; i < 4; i++) {
      B.quad('solid', -0.42 + i * 0.28, yy + 0.17, zz - 0.02, 0.24, 0.33, '#ffffff', A.cell('bMags', (i + k * 3) % 8, 4, 2), { rx: -0.22 });
    }
  }
  B.pop();
}

/** Wooden wagon with paperbacks and a 100-yen sign. */
function bargainCart(S, x, z) {
  const { B, A } = S;
  const gy = S.gy(x, z);
  B.pushT(x, gy, z, 0);
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.2, 0.2]) {
    B.box('solid', sx - 0.025, 0.06, sz - 0.025, sx + 0.025, 0.72, sz + 0.025, '#8a6446');
    B.cyl('solid', sx - 0.02, 0.06, sz, 0.06, 0.04, '#3a3a40', { rz: -Math.PI / 2, seg: 8 });
  }
  B.box('wood', -0.56, 0.62, -0.26, 0.56, 0.66, 0.26, '#b58c63');
  B.box('wood', -0.56, 0.66, -0.26, 0.56, 0.8, -0.22, '#9a7250');
  B.box('wood', -0.56, 0.66, 0.22, 0.56, 0.8, 0.26, '#9a7250');
  // paperbacks standing in two rows, spines up (individual thin boxes read at any distance)
  const cols = ['#e8e0cc', '#c86a5a', '#4a6a8a', '#7a9a6a', '#d8b48a', '#8a5a7a', '#f4efe2', '#3a4a5a', '#e0a878', '#b8c8d8'];
  const rng = S.rng;
  B.box('solid', -0.54, 0.66, -0.2, 0.54, 0.68, 0.2, '#8a6446');
  for (const rz of [-0.1, 0.1]) {
    let x = -0.52;
    while (x < 0.5) {
      const t = 0.025 + rng() * 0.02, hh = 0.14 + rng() * 0.05;
      B.box('solid', x, 0.68, rz - 0.075, x + t, 0.68 + hh * 0.75, rz + 0.075, cols[Math.floor(rng() * cols.length)]);
      x += t + 0.003;
    }
  }
  // 100-yen sign on a stick
  B.box('solid', 0.46, 0.8, 0.18, 0.48, 1.12, 0.2, '#8a6446');
  B.box('solid', 0.3, 1.02, 0.2, 0.64, 1.2, 0.215, '#e0b860', { rect: A.get('b100'), face: 'Z', colors: { Z: '#ffffff' } });
  B.pop();
}

function interior(S, F, Z) {
  const { B, A } = S;
  const zb = Z - 6.0, zf = Z - 0.2, ceil = F + 2.75;
  room(S, -3.55, 3.55, zb, zf, F, ceil, { floor: '#c8bca8', wall: '#f0ebe0', back: '#ece4d4' });
  const spines = (i) => A.cell('bSpines', i % 4, 1, 4);
  // wall shelves (left/right), facing inward
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const z0 = zb + 0.3 + k * 1.8;
      B.pushT(side * 3.55, F, z0 + 0.8, -side * Math.PI / 2);
      B.box('inner', -0.85, 0, 0, 0.85, 2.2, 0.35, '#8a6446', { skip: 'Z' });
      for (let r = 0; r < 5; r++) B.quad('inner', 0, 0.3 + r * 0.42, 0.2, 1.6, 0.36, '#ffffff', A.sub('bSpines', 0, ((r + k) % 4) * 0.25, 1, 0.22));
      B.pop();
    }
  }
  // back wall shelves + counter with register
  B.box('inner', -3.4, F, zb, 3.4, F + 2.3, zb + 0.35, '#8a6446', { skip: 'Z' });
  for (let r = 0; r < 5; r++) B.quad('inner', 0, F + 0.3 + r * 0.42, zb + 0.2, 6.6, 0.36, '#ffffff', spines(r + 1));
  B.box('inner', 1.2, F, zb + 1.1, 3.2, F + 0.95, zb + 1.7, '#6a4e3a');
  B.box('inner', 1.15, F + 0.95, zb + 1.05, 3.25, F + 0.99, zb + 1.75, '#c8a878');
  B.box('inner', 2.3, F + 0.99, zb + 1.3, 2.7, F + 1.2, zb + 1.6, '#3a3a40');
  B.box('lit', 2.35, F + 1.1, zb + 1.605, 2.65, F + 1.18, zb + 1.61, '#9ad0f0');
  // central island tables with flat stacks (covers up)
  for (const tz of [Z - 2.2, Z - 4.0]) {
    B.box('inner', -1.2, F, tz - 0.45, 1.2, F + 0.8, tz + 0.45, '#8a6446');
    for (let i = 0; i < 8; i++) {
      const bx = -1.0 + (i % 4) * 0.66, bz = tz - 0.2 + Math.floor(i / 4) * 0.42;
      const h = 0.08 + (i % 3) * 0.05;
      B.box('inner', bx - 0.14, F + 0.8, bz - 0.2, bx + 0.14, F + 0.8 + h, bz + 0.2, '#f4efe2', { rect: A.cell('bMags', i, 4, 2), face: 'Y' });
    }
  }
  // fluorescent light rows + a pendant over the counter
  for (const lz of [Z - 1.6, Z - 3.4, Z - 5.2]) ceilingLight(S, 0, ceil, lz, 2.4, 0.18, '#f8f8f0');
  pendant(S, 2.2, ceil, zb + 1.4, 0.6, { style: 'cone', shade: '#2f4a78' });
}
