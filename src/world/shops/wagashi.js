/**
 * 和菓子 さくら庵 — a Showa-era Japanese sweets shop.
 * Dark timber facade, tiled lean-to eave (庇), dark-framed glass sliding
 * doors behind a pink noren, carved wooden signboard, a pair of washi
 * lanterns, 出格子 lattice window with a small bamboo blind, display window
 * with sweets and a maneki-neko, sakura-mochi poster.  Out front: red bench
 * with felt and a red parasol, wooden display rack, たい焼き flag.
 */
import { shopHouse, room, hisashi } from './shell.js';
import { slidingDoors, noren, lantern, engawaBench, parasol, nobori, pendant, poster, manekiNeko, hangingPlate } from './parts.js';

const DARK = '#3a2a20';
const TIMBER = '#6e5038';

export function buildWagashi(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.12;
  const Z = D / 2;
  const H1 = 3.1;
  const hs = shopHouse(S, {
    W, D, F, H1, H2: 2.7, floors: 2,
    wall1: { kind: 'wood', color: TIMBER }, wall2: { kind: 'plaster', color: '#f4efe4' }, sides: { kind: 'plaster', color: '#eee6d6' },
    base: '#9a948c',
    open: { x0: -3.35, x1: 3.35, y1: 2.35 },
    win2: [{ x: 0, w: 2.6, h: 1.0, y: 1.5, frame: '#5a4030' }],
    sideWin: [{ side: -1, z: -1.0, w: 0.9, h: 0.9, y: 4.6 }],
    roof: { type: 'gable', color: '#4f5864', rise: 1.6, overZ: 0.75, overX: 0.5 },
    bandColor: '#5a4030',
  });
  const zf = Z - 0.1;

  // --- posts between the bays + head beam
  for (const x of [-3.35, -1.68, 1.68, 3.35]) B.box('solid', x - 0.07, F, zf - 0.08, x + 0.07, F + 2.35, zf + 0.1, DARK);
  B.box('solid', -3.4, F + 2.28, zf - 0.08, 3.4, F + 2.4, zf + 0.12, DARK);
  // --- centre: 4 dark-framed glass sliding doors (lower kick panel, one slid open)
  slidingDoors(S, -1.6, 1.6, F, F + 2.28, zf, { panels: 4, frame: DARK, kick: 0.42, kickKind: 'wood', kickColor: '#5a4030', bars: 1, open: 0.55 });
  B.box('solid', -1.62, S.gy(0, Z + 0.35) - 0.08, Z, 1.62, F - 0.005, Z + 0.35, '#b8b2a8'); // stone step
  // --- left: projecting lattice window (出格子) with a bamboo blind
  const lx0 = -3.28, lx1 = -1.76;
  B.box('wood', lx0, F, zf - 0.02, lx1, F + 0.7, zf + 0.02, '#5a4030');
  B.quad('inner', (lx0 + lx1) / 2, F + 1.45, zf - 0.25, lx1 - lx0, 1.5, '#ffffff', A.get('curtain3'));
  B.quad('glass', (lx0 + lx1) / 2, F + 1.45, zf - 0.05, lx1 - lx0, 1.5, '#fff');
  B.box('solid', lx0 - 0.04, F + 0.66, zf, lx1 + 0.04, F + 0.72, Z + 0.24, DARK);
  B.box('solid', lx0 - 0.04, F + 2.12, zf, lx1 + 0.04, F + 2.18, Z + 0.24, DARK);
  for (let x = lx0 + 0.04; x <= lx1 - 0.02; x += 0.085) B.box('solid', x - 0.018, F + 0.72, Z + 0.17, x + 0.018, F + 2.12, Z + 0.22, '#5a4030');
  B.sway = 0.18;
  B.quad('cut', (lx0 + lx1) / 2, F + 1.62, Z + 0.3, lx1 - lx0 + 0.1, 0.95, '#ffffff', A.get('wSudare'), { back: true });
  B.sway = 0;
  B.box('solid', lx0 - 0.02, F + 2.1, Z + 0.28, lx1 + 0.02, F + 2.13, Z + 0.31, '#8a6446');
  // menu plaques on the lattice
  B.box('solid', -2.95, F + 0.18, Z + 0.02, -2.1, F + 0.6, Z + 0.05, '#6a4e3a', { rect: A.get('wTags'), face: 'Z', colors: { Z: '#ffffff' } });
  // --- right: display window with sweets and a maneki-neko
  const rx0 = 1.76, rx1 = 3.28;
  B.box('wood', rx0, F, zf - 0.02, rx1, F + 0.72, zf + 0.02, '#5a4030');
  B.box('solid', rx0 - 0.02, F + 0.7, zf - 0.5, rx1 + 0.02, F + 0.74, zf + 0.05, '#8a6446');
  B.quad('glass', (rx0 + rx1) / 2, F + 1.5, zf + 0.02, rx1 - rx0, 1.52, '#fff');
  for (let i = 0; i < 3; i++) B.box('inner', rx0 + 0.1 + i * 0.47, F + 0.74, zf - 0.42, rx0 + 0.5 + i * 0.47, F + 0.8, zf - 0.12, '#f4ecdc', { rect: A.sub('wTray', (i % 5) * 0.2, 0, 0.2, 0.5), face: 'Y' });
  B.box('inner', rx0 + 0.05, F + 1.12, zf - 0.45, rx1 - 0.05, F + 1.15, zf - 0.1, '#8a6446');
  for (let i = 0; i < 3; i++) B.box('inner', rx0 + 0.15 + i * 0.45, F + 1.15, zf - 0.38, rx0 + 0.45 + i * 0.45, F + 1.27, zf - 0.18, ['#f7c6d4', '#fbf6ea', '#c8e0c0'][i]);
  manekiNeko(S, rx0 + 0.32, F + 1.15, zf - 0.28, 0.2, 0.9);
  poster(S, rx1 - 0.42, F + 1.5, zf + 0.02, 0.5, 0.66, A.get('wPoster'));
  poster(S, rx0 + 0.3, F + 1.95, zf + 0.02, 0.2, 0.25, A.get('hours'));
  poster(S, -1.2, F + 1.1, zf + 0.012, 0.3, 0.1, A.get('pay'));

  // --- tiled lean-to eave, signboard, noren, lanterns
  hisashi(S, -W / 2 - 0.12, W / 2 + 0.12, F + 2.66, Z, 0.95, 0.36, '#5a6470', { brackets: 3, bracket: DARK, fascia: DARK });
  const sy = F + 3.28;
  B.box('solid', -1.85, sy - 0.36, Z + 0.06, 1.85, sy + 0.36, Z + 0.16, DARK);
  B.quad('solid', 0, sy, Z + 0.165, 3.5, 0.62, '#ffffff', A.get('wSign'));
  B.box('solid', -1.95, sy + 0.36, Z + 0.02, 1.95, sy + 0.44, Z + 0.24, '#4f5864'); // tiny roof over the board
  noren(S, 0, F + 2.3, Z + 0.14, 2.0, 0.95, A.get('wNoren'), 3, { rodCol: '#5a4030' });
  hangingPlate(S, 1.2, F + 1.2, zf + 0.03, 0.34, 0.25, A.get('shopcard'));
  andon(S, 1.42, Z + 0.32);
  for (const x of [-1.98, 1.98]) {
    B.box('solid', x - 0.02, F + 2.22, Z + 0.3, x + 0.02, F + 2.26, Z + 0.78, DARK);
    lantern(S, x, F + 2.2, Z + 0.72, 0.19, 0.46, A.get('wLantern'), { lit: true, color: '#fff2da' });
  }

  // --- upper floor: lattice screen over the window + noren-like awning cloth
  const y2 = hs.y2;
  for (let x = -1.25; x <= 1.25; x += 0.1) B.box('solid', x - 0.015, y2 + 1.0, Z + 0.08, x + 0.015, y2 + 2.0, Z + 0.12, '#6a4e3a');
  B.box('solid', -1.35, y2 + 1.98, Z, 1.35, y2 + 2.04, Z + 0.14, '#5a4030');
  B.box('solid', -1.35, y2 + 0.96, Z, 1.35, y2 + 1.02, Z + 0.14, '#5a4030');

  // --- apron: red bench + parasol, display rack, taiyaki flag, petals
  const bz = Z + 0.72;
  engawaBench(S, -2.25, S.gy(-2.25, bz), bz, 1.5, 0);
  parasol(S, -3.3, S.gy(-3.3, Z + 1.0), Z + 1.0, 0.85, 1.95);
  B.box('solid', -2.0, S.gy(-2.0, bz) + 0.43, bz - 0.12, -1.8, S.gy(-2.0, bz) + 0.435, bz + 0.08, '#8a6446'); // tray
  B.cyl('solid', -1.95, S.gy(-2.0, bz) + 0.435, bz, 0.035, 0.07, '#4f6a4a', { seg: 8 }); // tea cup
  displayRack(S, 2.35, Z + 0.55);
  nobori(S, 3.45, S.gy(3.45, Z + 1.18), Z + 1.18, A.get('wFlag'), { ry: -0.25, h: 1.7, w: 0.42 });
  const rng = S.rng;
  for (let i = 0; i < 14; i++) {
    const px = -3.5 + rng() * 3.4, pz = Z + 0.2 + rng() * 1.0;
    B.quad('deco', px, S.gy(px, pz) + 0.004, pz, 0.03, 0.022, '#f9c3d2', null, { rx: -Math.PI / 2, rz: rng() * 3 });
  }

  interior(S, F, Z);
  return hs;
}

/** Standing paper lightbox (行灯看板): timber frame, glowing washi faces, small roof. */
function andon(S, x, z) {
  const { B, A } = S;
  const gy = S.gy(x, z);
  const w = 0.3, h = 0.95, y0 = 0.12;
  B.pushT(x, gy, z, -0.2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box('solid', sx * w / 2 - 0.025, 0, sz * w / 2 - 0.025, sx * w / 2 + 0.025, y0 + h + 0.04, sz * w / 2 + 0.025, DARK);
  const r = A.get('wAndon');
  // glowing faces (front/back carry the picture, sides plain washi)
  B.box('lit', -w / 2 + 0.02, y0, -w / 2 + 0.02, w / 2 - 0.02, y0 + h, w / 2 - 0.02, '#fff4dc', { rects: { Z: r, z: r }, skip: 'yY' });
  B.box('solid', -w / 2 - 0.05, y0 + h + 0.04, -w / 2 - 0.05, w / 2 + 0.05, y0 + h + 0.09, w / 2 + 0.05, DARK);
  B.box('solid', -w / 2 - 0.02, y0 - 0.04, -w / 2 - 0.02, w / 2 + 0.02, y0, w / 2 + 0.02, DARK);
  B.pop();
}

/** Two-tier wooden stand with wrapped gift boxes. */
function displayRack(S, x, z) {
  const { B, A } = S;
  const gy = S.gy(x, z);
  B.pushT(x, gy, z, 0);
  for (const sx of [-0.45, 0.45]) {
    B.box('wood', sx - 0.03, 0, -0.25, sx + 0.03, 0.85, -0.2, '#8a6446');
    B.box('wood', sx - 0.03, 0, 0.2, sx + 0.03, 0.5, 0.25, '#8a6446');
  }
  B.box('wood', -0.5, 0.46, 0.0, 0.5, 0.5, 0.3, '#b58c63');
  B.box('wood', -0.5, 0.8, -0.3, 0.5, 0.84, 0.0, '#b58c63');
  const cols = [['#f7c6d4', '#e98aa7'], ['#fbf6ea', '#c23a3a'], ['#c8e0c0', '#6a8a5a'], ['#f4e0a8', '#b58c63']];
  for (let i = 0; i < 4; i++) {
    const [a, b] = cols[i];
    const bx = -0.35 + i * 0.23;
    B.box('solid', bx - 0.1, 0.5, 0.06, bx + 0.1, 0.58, 0.26, a);
    B.box('deco', bx - 0.012, 0.5, 0.055, bx + 0.012, 0.585, 0.265, b);
    B.box('solid', bx - 0.1, 0.84, -0.26, bx + 0.1, 0.94 - (i % 2) * 0.03, -0.04, cols[(i + 1) % 4][0]);
    B.box('deco', bx - 0.101, 0.88, -0.261, bx + 0.101, 0.9, -0.039, cols[(i + 1) % 4][1]);
  }
  // price card
  B.box('solid', 0.35, 0.58, 0.24, 0.49, 0.76, 0.25, '#fbf6ea', { rect: A.sub('wTags', 0, 0, 0.17, 1), face: 'Z' });
  B.pop();
}

function interior(S, F, Z) {
  const { B, A } = S;
  const zb = Z - 5.0, zf = Z - 0.2, ceil = F + 2.6;
  room(S, -3.5, 3.5, zb, zf, F, ceil, { floor: '#8a7058', wall: '#f2e8d6', back: '#e8dcc4', ceil: '#d8c8a8', skirt: '#4a3a30' });
  // glass display counter across the shop (sweets under glass)
  B.box('inner', -2.6, F, Z - 1.9, 2.0, F + 0.8, Z - 1.3, '#5a4030');
  B.box('inner', -2.55, F + 0.8, Z - 1.85, 1.95, F + 0.84, Z - 1.35, '#f4ecdc', { rect: A.get('wTray'), face: 'Y' });
  B.box('glass', -2.6, F + 0.84, Z - 1.9, 2.0, F + 1.15, Z - 1.3, '#fff');
  B.box('inner', -2.62, F + 1.15, Z - 1.92, 2.02, F + 1.18, Z - 1.28, DARK);
  // back shelves with gift boxes and tea canisters
  for (const yy of [F + 0.9, F + 1.45, F + 2.0]) {
    B.box('inner', -3.3, yy, zb, 1.2, yy + 0.04, zb + 0.4, '#6a4e3a');
    for (let i = 0; i < 9; i++) {
      const bx = -3.1 + i * 0.48;
      if ((i + yy * 10) % 4 < 1) B.cyl('inner', bx, yy + 0.04, zb + 0.2, 0.08, 0.2, ['#3a5a4a', '#8a3a3a', '#c8a040'][i % 3], { seg: 8 });
      else B.box('inner', bx - 0.18, yy + 0.04, zb + 0.05, bx + 0.18, yy + 0.16, zb + 0.35, ['#f7c6d4', '#fbf6ea', '#c8e0c0', '#e8d4b0'][i % 4]);
    }
  }
  // kitchen doorway with a short white noren
  B.box('inner', 1.6, F, zb + 0.01, 3.0, F + 2.0, zb + 0.02, '#3a3028');
  B.quad('inner', 2.3, F + 1.75, zb + 0.08, 1.3, 0.5, '#f8f4ec');
  // kakejiku scroll + small ikebana
  B.quad('inner', -3.45, F + 1.6, Z - 3.2, 0.4, 1.1, '#f4ecdc', A.get('furin'), { ry: Math.PI / 2 });
  B.cyl('inner', -3.2, F, Z - 2.6, 0.1, 0.3, '#3a5a4a', { seg: 8 });
  pendant(S, -1.2, ceil, Z - 1.6, 0.55, { style: 'bulb' });
  pendant(S, 0.8, ceil, Z - 1.6, 0.55, { style: 'bulb' });
  pendant(S, -0.2, ceil, zb + 1.0, 0.6, { style: 'cone', shade: '#e8d8b8' });
}
