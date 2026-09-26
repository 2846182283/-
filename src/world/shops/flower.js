/**
 * フラワーショップ 花音 — a small flower shop.  Pale green lap siding, cream
 * upper floor with a little balcony, striped awning hung with a wind chime
 * and handwritten price tags.  The apron overflows with a tiered wooden
 * stand, galvanised buckets, crates and pots: tulips, daisies, baby's breath,
 * roses, hydrangeas, sakura branches.  Warm interior: flower fridge,
 * wrapping-paper rolls, ribbon reels, scissors and vases on the work counter.
 */
import { shopHouse, room } from './shell.js';
import {
  awning, slidingDoors, pendant, pottedPlant, bucket, flowerCards, bloomCluster, crate, poster, windChime, acUnit, cardboard, C,
} from './parts.js';

const GREEN = '#c4d8c0';
const FRAME = '#f4f1e8';

export function buildFlower(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.1;
  const Z = D / 2;
  const hs = shopHouse(S, {
    W, D, F, H1: 3.35, H2: 2.7, floors: 2,
    wall1: { kind: 'rows', color: GREEN }, wall2: { kind: 'plaster', color: '#f4efe2' }, sides: { kind: 'plaster', color: '#eee8d8' },
    open: { x0: -2.85, x1: 2.85, y1: 2.45 },
    win2: [{ x: 1.6, w: 1.4, h: 1.1, y: 1.35, frame: '#e8e6e0' }],
    balconyDoor: { x: -1.4, w: 1.6, h: 1.95 },
    sideWin: [{ side: -1, z: 0.5, w: 0.9, h: 0.9, y: 4.5 }, { side: 1, z: -1.0, w: 0.9, h: 0.9, y: 4.5 }],
    roof: { type: 'gable', color: '#56677a', rise: 1.5, overZ: 0.6 },
    bandColor: '#9ab896',
    ac: false,
  });
  const y2 = hs.y2;

  // --- storefront: left fixed glass with posters, right doors slid wide open
  const zf = Z - 0.1;
  B.box('solid', -2.85, F + 2.37, zf - 0.06, 2.85, F + 2.45, zf + 0.06, FRAME);
  B.box('solid', -2.85, F, zf - 0.06, -2.75, F + 2.45, zf + 0.06, FRAME);
  B.box('solid', 2.75, F, zf - 0.06, 2.85, F + 2.45, zf + 0.06, FRAME);
  B.box('solid', -1.25, F, zf - 0.06, -1.15, F + 2.45, zf + 0.06, FRAME);
  B.box('rows', -2.75, F, zf - 0.03, -1.25, F + 0.5, zf + 0.03, '#9ab896');
  B.quad('glass', -2.0, F + 1.43, zf, 1.5, 1.86, '#fff');
  poster(S, -2.35, F + 1.2, zf, 0.4, 0.56, A.get('fPoster'));
  poster(S, -1.55, F + 1.55, zf, 0.26, 0.32, A.get('hours'));
  poster(S, -1.55, F + 0.8, zf, 0.3, 0.1, A.get('pay'));
  // open sliding doors stacked on the right
  slidingDoors(S, 1.55, 2.75, F, F + 2.37, zf - 0.02, { panels: 2, frame: FRAME, kind: 'solid', bars: 0, handle: false });
  B.box('solid', -1.15, F - 0.01, zf - 0.07, 2.75, F + 0.012, zf + 0.04, C.aluDark); // threshold

  // --- awning, sign, chime, tags
  awning(S, -3.1, 3.1, F + 2.64, Z + 0.02, 1.2, 0.45, { stripes: ['#f6f2e6', '#8fb88a'], sw: 0.26, valH: 0.18, arms: 2, frame: '#e8e6e0' });
  const sy = F + 3.0;
  B.box('solid', -2.0, sy - 0.26, Z, 2.0, sy + 0.26, Z + 0.06, '#f4f1e8');
  B.quad('solid', 0, sy, Z + 0.065, 3.6, 0.47, '#ffffff', A.get('fSign'));
  windChime(S, -2.45, F + 2.14, Z + 1.05, A.get('furin'));
  for (let i = 0; i < 4; i++) {
    const tx = -1.4 + i * 0.95;
    B.box('deco', tx - 0.003, F + 1.95, Z + 1.13, tx + 0.003, F + 2.17, Z + 1.14, '#666');
    B.swayFn = (lx, ly) => Math.max(0, (0.06 - ly) / 0.12) * 0.8;
    B.quad('cut', tx, F + 1.89, Z + 1.14, 0.13, 0.13, '#ffffff', A.cell('fTags', i + 4 * (i % 2), 4, 2), { back: true, ry: 0.001 });
    B.swayFn = null;
  }

  // --- balcony on the upper floor (door behind), laundry, AC
  balcony(S, y2, Z);

  // --- apron: stands, buckets, crates
  apron(S, F, Z);
  interior(S, F, Z);
  return hs;
}

function balcony(S, y2, Z) {
  const { B, A } = S;
  const x0 = -2.9, x1 = 0.3, d = 0.85, yb = y2 + 0.1;
  // door (sliding glass) in the balcony opening
  B.box('solid', -2.22, yb, Z - 0.1, -0.58, yb + 0.04, Z - 0.04, C.alu);
  B.quad('glass', -1.8, yb + 1.0, Z - 0.1, 0.8, 1.9, '#fff');
  B.quad('glass', -1.0, yb + 1.0, Z - 0.12, 0.8, 1.9, '#fff');
  B.quad('inner', -1.4, yb + 1.0, Z - 0.3, 1.6, 1.95, '#ffffff', A.get('curtain1'));
  B.box('solid', -1.43, yb, Z - 0.13, -1.37, yb + 1.95, Z - 0.08, C.alu);
  // slab + railing (aluminium bars)
  B.box('solid', x0, yb - 0.14, Z, x1, yb, Z + d, '#dcd8cf');
  B.box('solid', x0, yb + 0.95, Z + d - 0.04, x1, yb + 1.0, Z + d, C.alu);
  for (const sx of [x0, x1]) B.box('solid', sx - 0.02, yb, Z, sx + 0.02, yb + 1.0, Z + d, C.alu);
  B.box('solid', x0, yb + 0.95, Z, x0 + 0.04, yb + 1.0, Z + d, C.alu);
  B.box('solid', x1 - 0.04, yb + 0.95, Z, x1, yb + 1.0, Z + d, C.alu);
  for (let x = x0 + 0.1; x < x1; x += 0.11) B.box('deco', x - 0.012, yb, Z + d - 0.03, x + 0.012, yb + 0.95, Z + d - 0.01, C.alu);
  // laundry pole with towels + a potted geranium
  B.cyl('solid', x0 + 0.1, yb + 1.75, Z + 0.45, 0.016, x1 - x0 - 0.2, '#8e949a', { rz: -Math.PI / 2, seg: 5 });
  const cols = ['#f4f4f0', '#f7c6d4', '#bcd8ec', '#f4f4f0'];
  for (let i = 0; i < 4; i++) {
    const lx = x0 + 0.5 + i * 0.7;
    B.swayFn = (x, y) => Math.max(0, (yb + 1.72 - y) / 0.55);
    B.quad('cloth', lx, yb + 1.45, Z + 0.45, 0.42, 0.55, cols[i], null, { back: true });
    B.swayFn = null;
  }
  acUnit(S, 0.0 - 0.3, yb, Z + 0.35, 0, { pipe: false });
  pottedPlant(S, x0 + 0.3, yb, Z + 0.5, 0.9, { flowers: ['#e8483f', '#f59ab4'], nf: 6 });
}

function apron(S, F, Z) {
  const { B } = S;
  const rng = S.rng;
  const g = (x, z) => S.gy(x, z);
  // tiered wooden stand (3 steps) on the left with potted hydrangeas / daisies / pansies
  const sx = -1.7, sz = Z + 0.55;
  const gy0 = g(sx, sz);
  for (let k = 0; k < 3; k++) {
    const yy = gy0 + 0.28 + k * 0.28, zz = sz + 0.35 - k * 0.3;
    B.box('wood', sx - 1.0, yy - 0.04, zz - 0.15, sx + 1.0, yy, zz + 0.15, '#b58c63');
    for (let i = 0; i < 5; i++) {
      const px = sx - 0.8 + i * 0.4;
      const kinds = [
        () => { B.cyl('solid', px, yy, zz, 0.1, 0.13, '#e8e0d0', { rb: 0.08, seg: 8 }); bloomCluster(S, px, yy + 0.2, zz, 0.12, 7, ['#8fb4e6', '#b8a8e0', '#a8c8f0'], 0.05); },
        () => { B.cyl('solid', px, yy, zz, 0.1, 0.13, '#b86f4f', { rb: 0.08, seg: 8 }); bloomCluster(S, px, yy + 0.2, zz, 0.12, 7, ['#f7b6c8', '#f59ab4', '#fbd0dc'], 0.05); },
        () => { B.cyl('solid', px, yy, zz, 0.09, 0.12, '#b86f4f', { rb: 0.07, seg: 8 }); flowerCards(S, px, yy + 0.1, zz, 0.3, 3, { wide: 1.3 }); },
        () => { B.cyl('solid', px, yy, zz, 0.09, 0.12, '#f4f0e6', { rb: 0.07, seg: 8 }); bloomCluster(S, px, yy + 0.18, zz, 0.1, 8, ['#f4c93a', '#8a5ab8', '#fbf2e6', '#e86a5a'], 0.04); },
      ];
      kinds[(i + k) % kinds.length]();
    }
  }
  for (const lx of [sx - 0.95, sx + 0.95]) B.box('wood', lx - 0.04, gy0, sz - 0.3, lx + 0.04, gy0 + 0.84, sz + 0.55, '#9a7250');
  // buckets with cut flowers (right of the door path)
  const bk = [[0.45, 3], [0.85, 0], [1.25, 6], [1.65, 5], [2.05, 1], [2.45, 4], [2.85, 2]];
  bk.forEach(([bx, cell], i) => {
    const bz = Z + 0.5 + (i % 2) * 0.42;
    const gy = g(bx, bz);
    const r = 0.14 + (i % 3) * 0.015;
    const h = 0.3 + (i % 2) * 0.05;
    // bucket on a low wooden crate for the back row
    const lift = i % 2 ? 0 : 0.18;
    if (lift) B.box('wood', bx - 0.2, gy, bz - 0.18, bx + 0.2, gy + lift, bz + 0.18, '#c8a878');
    bucket(S, bx, gy + lift, bz, r, h);
    flowerCards(S, bx, gy + lift + h - 0.12, bz, cell === 6 ? 0.9 : 0.6, cell, { n: 3, wide: cell === 4 ? 1.4 : 1.1 });
  });
  // crates with potted plants at the far right + a watering can
  crate(S, 3.0, g(3.0, Z + 1.05), Z + 1.05, 0.5, 0.28, 0.36, '#c8a878');
  for (let i = 0; i < 3; i++) pottedPlant(S, 2.85 + i * 0.15, g(3.0, Z + 1.05) + 0.28, Z + 0.98 + (i % 2) * 0.12, 0.55, { flowers: ['#f7b6c8', '#fff', '#f4c93a'], nf: 4 });
  const wx = -3.0, wz = Z + 1.1, wy = g(wx, wz);
  B.cyl('solid', wx, wy, wz, 0.1, 0.22, '#7fb0c8', { seg: 10 });
  B.beam('solid', [wx + 0.08, wy + 0.08, wz], [wx + 0.32, wy + 0.28, wz], 0.03, 0.03, '#7fb0c8');
  B.tube('solid', [[wx - 0.04, wy + 0.22, wz], [wx, wy + 0.34, wz], [wx + 0.06, wy + 0.22, wz]], 0.012, '#6a9ab8');
  // a big hydrangea pot and a potted sakura sapling by the pier
  B.cyl('solid', -3.05, g(-3.05, Z + 0.4), Z + 0.4, 0.2, 0.28, '#8a8f98', { rb: 0.16, seg: 10 });
  bloomCluster(S, -3.05, g(-3.05, Z + 0.4) + 0.42, Z + 0.4, 0.22, 16, ['#8fb4e6', '#a8c0f0', '#c0b0e8'], 0.07);
  for (let i = 0; i < 8; i++) {
    const px = -0.8 + rng() * 1.0, pz = Z + 0.2 + rng() * 0.9;
    B.quad('deco', px, g(px, pz) + 0.004, pz, 0.05, 0.02, '#7fb069', null, { rx: -Math.PI / 2, rz: rng() * 3 });
  }
}

function interior(S, F, Z) {
  const { B, A } = S;
  const zb = Z - 4.6, zf = Z - 0.2, ceil = F + 2.7;
  room(S, -2.95, 2.95, zb, zf, F, ceil, { floor: '#b8b4ac', wall: '#f7efe2', back: '#f2e6d4', skirt: '#9a8a78' });
  // flower fridge along the left wall (glass doors, lit, flowers inside)
  B.box('inner', -2.95, F, zb + 0.3, -2.25, F + 2.1, zb + 3.0, '#e8ecee');
  B.box('lit', -2.26, F + 0.3, zb + 0.4, -2.24, F + 2.0, zb + 2.9, '#e8f4f8', { skip: 'x' });
  for (let i = 0; i < 5; i++) for (let k = 0; k < 2; k++) flowerCards(S, -2.55, F + 0.35 + k * 0.85, zb + 0.6 + i * 0.5, 0.55, (i + k * 3) % 8, { n: 2 });
  B.quad('glass', -2.2, F + 1.15, zb + 1.65, 2.6, 1.8, '#fff', null, { ry: Math.PI / 2 });
  // work counter at the back with wrapping paper rolls, ribbon reels, scissors, vases
  B.box('inner', -1.9, F, zb + 0.4, 1.8, F + 0.9, zb + 1.0, '#c8a878');
  B.box('inner', -1.95, F + 0.9, zb + 0.35, 1.85, F + 0.94, zb + 1.05, '#e8dcc4');
  for (let i = 0; i < 4; i++) B.cyl('inner', -1.7 + i * 0.26, F + 0.94, zb + 0.18, 0.1, 1.1, '#ffffff', { seg: 10, rect: A.cell('fWrap', i, 4, 1) });
  B.box('inner', -1.9, F + 1.45, zb, 1.8, F + 1.48, zb + 0.25, '#b58c63'); // shelf
  B.cyl('inner', -0.3, F + 1.75, zb + 0.12, 0.012, 1.8, '#8e949a', { rz: -Math.PI / 2, seg: 4 });
  const rib = ['#e8483f', '#f7b6c8', '#f4d27a', '#8fb88a', '#8fb4e6', '#c8a8e0', '#fbf2e6', '#d8433d'];
  for (let i = 0; i < 8; i++) B.cyl('inner', -0.25 + i * 0.2, F + 1.75, zb + 0.12, 0.07, 0.06, rib[i], { rz: -Math.PI / 2, seg: 10 });
  for (let i = 0; i < 5; i++) {
    const vx = -1.6 + i * 0.3;
    B.cyl('inner', vx, F + 1.48, zb + 0.12, 0.06 + (i % 2) * 0.02, 0.2 + (i % 3) * 0.08, ['#c8e0f0', '#f4f0e6', '#b8d8c8', '#e8d8f0'][i % 4], { seg: 8 });
  }
  // scissors + string on the counter
  B.box('inner', 0.4, F + 0.94, zb + 0.7, 0.62, F + 0.955, zb + 0.73, '#8e949a');
  B.cyl('inner', 0.36, F + 0.94, zb + 0.72, 0.03, 0.01, '#e8483f', { seg: 8 });
  B.cyl('inner', 0.9, F + 0.94, zb + 0.7, 0.06, 0.08, '#d8b48a', { seg: 10 });
  bloomCluster(S, 1.4, F + 1.05, zb + 0.7, 0.12, 9, ['#f7b6c8', '#fbf2e6', '#f4c93a'], 0.045, { kind: 'inner' });
  // buckets of flowers on the floor, hanging dried flowers, pendant lamps
  for (let i = 0; i < 4; i++) {
    const bx = 0.2 + i * 0.6, bz = Z - 1.6 - (i % 2) * 0.4;
    B.cyl('inner', bx, F, bz, 0.15, 0.32, '#b9c0c6', { rb: 0.12, seg: 10 });
    flowerCards(S, bx, F + 0.2, bz, 0.7, [0, 5, 7, 1][i], { n: 3 });
  }
  for (let i = 0; i < 5; i++) {
    const dx = -1.4 + i * 0.6;
    B.box('deco', dx - 0.004, ceil - 0.35, zb + 1.4, dx + 0.004, ceil, zb + 1.41, '#6a5040');
    bloomCluster(S, dx, ceil - 0.45, zb + 1.4, 0.07, 5, ['#d8b48a', '#c88a8a', '#b8a0c8'], 0.03, { kind: 'inner', leafCol: '#9aa878' });
  }
  cardboard(S, 2.4, F, zb + 0.5, 0.5, 0.4, 0.4, 0.2);
  cardboard(S, 2.42, F + 0.4, zb + 0.5, 0.44, 0.3, 0.36, -0.1);
  pendant(S, -0.5, ceil, zb + 1.2, 0.6, { style: 'cone', shade: '#f4ecd8' });
  pendant(S, 1.2, ceil, Z - 1.4, 0.5, { style: 'bulb' });
  pendant(S, -1.2, ceil, Z - 1.2, 0.5, { style: 'bulb' });
}
