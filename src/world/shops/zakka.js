/**
 * 山田商店 — Showa general store (よろず屋) in a 看板建築 with a verdigris
 * copper-green facade.  Faded striped awning, old enamel tin signs, a faded
 * summer-festival poster and local mascot stickers.  Goods spill onto the
 * apron: drink crates, rice sacks, brooms, buckets, plastic baskets, a chest
 * freezer with an アイスクリーム flag.
 */
import { shopHouse, room } from './shell.js';
import {
  awning, slidingDoors, crate, bucket, basket, broom, riceBag, nobori, pendant, ceilingLight, poster, shelf, pottedPlant, projectingSign, cardboard,
} from './parts.js';

const COPPER = '#8fb3a4';

export function buildZakka(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.1;
  const Z = D / 2;
  const hs = shopHouse(S, {
    W, D, F, H1: 3.15, H2: 2.7, floors: 2,
    wall1: { kind: 'plaster', color: '#e6dcc6' }, wall2: { kind: 'rows', color: COPPER }, sides: { kind: 'plaster', color: '#e2d8c4' },
    base: '#9a948c',
    open: { x0: -3.4, x1: 3.4, y1: 2.45 },
    win2: [{ x: -1.8, w: 1.4, h: 1.0, y: 1.35, frame: '#d8d4c8', rail: true }, { x: 1.8, w: 1.4, h: 1.0, y: 1.35, frame: '#d8d4c8', rail: true }],
    sideWin: [{ side: 1, z: -2.0, w: 0.9, h: 0.9, y: 4.6 }],
    roof: { type: 'kanban', color: '#6c5647', parapet: 1.2, rise: 1.2, coping: '#6f9484' },
    bandColor: '#6f9484',
  });
  const y2 = hs.y2;
  // decorative copper-panel ribs + cornice on the upper facade
  for (let x = -3.5; x <= 3.5; x += 0.7) B.box('solid', x - 0.02, y2 + 0.1, Z, x + 0.02, hs.top + 1.1, Z + 0.035, '#7fa394');
  B.box('solid', -W / 2 - 0.05, hs.top + 0.5, Z, W / 2 + 0.05, hs.top + 0.6, Z + 0.1, '#7fa394');

  // --- storefront: aluminium doors half open, the shop wide open
  const zf = Z - 0.1;
  slidingDoors(S, -3.4, 3.4, F, F + 2.3, zf, { panels: 4, frame: '#b8bab8', open: 0.95, bars: 1 });
  B.box('solid', -3.4, F + 2.3, zf - 0.05, 3.4, F + 2.45, zf + 0.05, '#b8bab8');
  poster(S, -0.9, F + 1.3, zf + 0.02, 0.3, 0.38, A.get('hours'));
  poster(S, 2.5, F + 0.9, zf - 0.03, 0.18, 0.18, A.cell('mascot', 0, 2, 2));
  poster(S, 2.75, F + 0.9, zf - 0.03, 0.18, 0.18, A.cell('mascot', 1, 2, 2));
  poster(S, 2.62, F + 0.62, zf - 0.03, 0.3, 0.1, A.cell('mascot', 2, 2, 2));
  B.box('solid', -3.4, S.gy(0, Z + 0.3) - 0.08, Z, 3.4, F - 0.005, Z + 0.3, '#c0bab0');

  // --- signboard on the upper facade
  const sy = y2 + 0.6;
  B.box('solid', -3.2, sy - 0.52, Z + 0.03, 3.2, sy + 0.52, Z + 0.12, '#2f5a48');
  B.quad('solid', 0, sy, Z + 0.125, 5.2, 1.04, '#ffffff', A.get('zSign'));
  // faded red / white awning
  awning(S, -3.6, 3.6, F + 2.95, Z + 0.02, 1.05, 0.4, { stripes: ['#d98a82', '#f4efe4'], sw: 0.32, valH: 0.18, arms: 2 });

  // --- tin signs on the side pier + festival poster (seen from down the street)
  B.pushT(W / 2, 0, 1.0, Math.PI / 2);
  for (let i = 0; i < 3; i++) B.box('solid', -2.9 + i * 0.95, F + 1.6, 0, -2.1 + i * 0.95, F + 2.0, 0.02, '#ffffff', { rect: A.cell('zTins', i, 3, 1), face: 'Z' });
  poster(S, 0.4, F + 1.2, 0, 0.6, 0.85, A.get('matsuri'), { off: 0.01 });
  B.pop();
  B.box('solid', -3.72, F + 1.45, Z + 0.0, -3.42, F + 1.85, Z + 0.02, '#ffffff', { rect: A.cell('zTins', 1, 3, 1), face: 'Z' });
  poster(S, 3.58, F + 1.2, Z, 0.3, 0.42, A.get('matsuri'), { off: 0.005 });

  projectingSign(S, W / 2 - 0.22, F + 4.45, Z, 0.42, 1.65, 0.12, A.get('zVert'), A.get('zVert'), { out: 0.16 });
  // cardboard boxes just inside the door (deliveries not yet unpacked)
  cardboard(S, -0.3, F, Z - 0.7, 0.5, 0.36, 0.38, 0.1);
  cardboard(S, -0.28, F + 0.36, Z - 0.72, 0.42, 0.3, 0.34, -0.15);
  cardboard(S, 0.3, F, Z - 0.9, 0.44, 0.32, 0.36, 0.3);
  apron(S, F, Z);
  interior(S, F, Z);
  return hs;
}

function apron(S, F, Z) {
  const { B, A } = S;
  const g = (x, z) => S.gy(x, z);
  // chest freezer with a sliding glass top + ice cream flag
  const fx = -2.3, fz = Z + 0.5, fy = g(fx, fz);
  B.box('solid', fx - 0.62, fy, fz - 0.33, fx + 0.62, fy + 0.82, fz + 0.33, '#f4f6f6', { rect: A.get('zFreezer'), face: 'Z' });
  B.box('solid', fx - 0.62, fy + 0.82, fz - 0.33, fx + 0.62, fy + 0.86, fz + 0.33, '#c9ccd0');
  B.quad('lit', fx, fy + 0.835, fz, 1.1, 0.56, '#dfeaf0', A.get('zIceTop'), { rx: -Math.PI / 2 });
  B.quad('glass', fx, fy + 0.865, fz, 1.14, 0.6, '#fff', null, { rx: -Math.PI / 2 });
  for (const sx of [-1, 1]) B.box('solid', fx - 0.62, fy + 0.02, fz + sx * 0.32 - 0.02, fx - 0.5, fy + 0.1, fz + sx * 0.32 + 0.02, '#8e949a');
  nobori(S, -3.4, g(-3.4, Z + 0.95), Z + 0.95, A.get('zIceFlag'), { ry: 0.2, h: 1.7, w: 0.42 });
  // drink crates stacked (with bottles) at the right
  const cx = 2.55;
  const cols = ['#f2c230', '#d8433d', '#3b7fd1', '#f2c230'];
  for (let i = 0; i < 4; i++) {
    const x = cx + (i % 2) * 0.46 - 0.23, z = Z + 0.45 + (i > 1 ? 0 : 0);
    const stack = i < 2 ? 2 : 1;
    for (let k = 0; k < stack; k++) crate(S, x + (i > 1 ? 0 : 0), g(x, z) + k * 0.28 + (i > 1 ? 0.56 : 0), z, 0.44, 0.28, 0.34, cols[(i + k) % 4], { bottles: k === stack - 1 ? (i % 2 ? '#8a5a3a' : '#9ad0a0') : null });
  }
  // rice sacks leaning by the door
  riceBag(S, 1.55, g(1.55, Z + 0.25), Z + 0.25, 0.1, A.get('zRice'));
  riceBag(S, 1.15, g(1.15, Z + 0.3), Z + 0.3, -0.12, A.get('zRice'));
  // brooms leaning on the left pier, galvanised buckets stacked
  broom(S, -3.55, g(-3.55, Z), Z, 0.12);
  broom(S, -3.3, g(-3.3, Z), Z, 0.2, { head: '#b89a58' });
  bucket(S, -1.25, g(-1.25, Z + 0.35), Z + 0.35, 0.16, 0.28);
  bucket(S, -1.25, g(-1.25, Z + 0.35) + 0.12, Z + 0.35, 0.165, 0.28, '#c4cad0');
  // plastic shopping baskets stacked by the door
  for (let k = 0; k < 4; k++) basket(S, 0.7, g(0.7, Z + 0.35) + k * 0.06, Z + 0.35, k % 2 ? '#3aa37a' : '#d8433d', 0.05);
  // potted plant + styrofoam planter (Showa shopfront garden)
  pottedPlant(S, 3.55, g(3.55, Z + 0.3), Z + 0.3, 1.0, { flowers: ['#f4c93a'], nf: 5 });
  B.box('solid', 3.1, g(3.3, Z + 0.85), Z + 0.7, 3.6, g(3.3, Z + 0.85) + 0.22, Z + 1.0, '#f4f4f0');
  for (let i = 0; i < 5; i++) B.sphere('solid', 3.18 + i * 0.1, g(3.3, Z + 0.85) + 0.26, Z + 0.85, 0.07, '#7fae62', { ico: 0 });
}

function interior(S, F, Z) {
  const { B, A } = S;
  const zb = Z - 5.5, zf = Z - 0.2, ceil = F + 2.7;
  room(S, -3.55, 3.55, zb, zf, F, ceil, { floor: '#a09888', wall: '#ece4d2', back: '#e4dac4' });
  // wall shelves of goods (sides + back), a low island, old counter & register
  for (const side of [-1, 1]) {
    B.pushT(side * 3.55, F, Z - 2.8, -side * Math.PI / 2);
    shelf(S, -0.9, 0, 0, 1.7, 2.1, 0.4, A.get('zGoods'), { color: '#b58c63' });
    shelf(S, 0.9, 0, 0, 1.7, 2.1, 0.4, A.get(side < 0 ? 'kShelf2' : 'zGoods'), { color: '#b58c63' });
    B.pop();
  }
  shelf(S, -1.2, F, zb, 3.4, 2.1, 0.4, A.get('zGoods'), { color: '#b58c63' });
  B.box('inner', -1.0, F, Z - 2.9, 1.0, F + 0.9, Z - 2.1, '#8a6446', { rect: A.sub('zGoods', 0, 0.5, 0.4, 0.5), face: 'Z' });
  B.box('inner', -0.95, F + 0.9, Z - 2.85, 0.95, F + 1.05, Z - 2.15, '#e8483f', { rect: A.sub('zGoods', 0.4, 0, 0.5, 0.45), face: 'Y' });
  B.box('inner', 1.2, F, zb + 0.6, 3.2, F + 0.9, zb + 1.2, '#6a4e3a');
  B.box('inner', 2.0, F + 0.9, zb + 0.7, 2.5, F + 1.15, zb + 1.1, '#c9a24a');
  B.box('inner', 2.6, F + 0.9, zb + 0.75, 2.9, F + 1.3, zb + 1.05, '#8a6446');
  // hanging goods: sandals & fly swatters on a rail by the door
  B.box('inner', -3.2, F + 2.2, Z - 0.8, -1.2, F + 2.23, Z - 0.77, '#8e949a');
  for (let i = 0; i < 6; i++) B.box('inner', -3.1 + i * 0.33, F + 1.75, Z - 0.8, -2.9 + i * 0.33, F + 2.2, Z - 0.78, ['#3b7fd1', '#e8483f', '#f2c230', '#3aa37a'][i % 4]);
  ceilingLight(S, 0, ceil, Z - 1.8, 2.2, 0.12, '#f4f8f4');
  ceilingLight(S, 0, ceil, Z - 3.8, 2.2, 0.12, '#f4f8f4');
  pendant(S, 2.3, ceil, zb + 0.9, 0.7, { style: 'bulb' });
}
