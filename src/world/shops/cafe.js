/**
 * 喫茶 はるかぜ — small retro kissaten on the station-road corner.
 * Cream plaster + dark-brown timber shop front, big multi-pane windows, deep
 * green scalloped awning, carved signboard with gooseneck lamps, round
 * projecting 珈琲 sign, chalk A-frame menu, two bistro tables outside with a
 * few sakura petals on them.  Inside: counter with espresso machine, cake
 * showcase, tables under green pendant lamps, plants, wall clock.
 */
import { shopHouse, room } from './shell.js';
import {
  awning, pendant, roundTable, bistroChair, woodChair, table, pottedPlant, aFrame, flowerBox, poster, rectFrame,
  hangingPlate, C,
} from './parts.js';

const WOOD = '#4a3426';
const CREAM = '#f2e6cf';

export function buildCafe(S) {
  const { B, W, D } = S;
  const F = S.frontY + 0.12;
  const Z = D / 2;
  const H1 = 3.5;
  const hs = shopHouse(S, {
    W, D, F, H1, H2: 2.7, floors: 2,
    wall1: { kind: 'plaster', color: CREAM }, wall2: { kind: 'plaster', color: '#f5ecd9' }, sides: { kind: 'plaster', color: '#f0e4cc' },
    base: '#b9a996',
    open: { x0: -4.15, x1: 4.15, y1: 2.62 },
    win2: [{ x: -2.3, w: 1.5, h: 1.1, y: 1.35, box: true, frame: WOOD }, { x: 2.2, w: 1.5, h: 1.1, y: 1.35, box: true, frame: WOOD }],
    sideWin: [
      { side: 1, z: 1.6, w: 2.2, h: 1.35, y: 1.55, plain: true, frame: WOOD },
      { side: 1, z: 1.0, w: 1.2, h: 1.0, y: H1 + 1.4, frame: WOOD },
      { side: -1, z: -2.5, w: 0.9, h: 0.9, y: H1 + 1.4 },
    ],
    roof: { type: 'gable', color: '#6c5647', rise: 1.7, overZ: 0.65, overX: 0.45 },
    bandColor: '#7a5a40',
  });

  storefront(S, F, Z);
  interior(S, F, Z, H1);
  signage(S, F, Z, H1);
  outdoor(S, F, Z);

  // corner downlight on the station-road side + meter box
  B.box('solid', W / 2, F + 1.2, -3.6, W / 2 + 0.12, F + 1.6, -3.2, '#e6e4dc');
  B.box('solid', W / 2, F + 0.5, -2.0, W / 2 + 0.16, F + 1.0, -1.4, '#8e949a');
  return hs;
}

/** Timber shop front: door with glass, two multi-pane windows, transoms, kick panels. */
function storefront(S, F, Z) {
  const { B, A } = S;
  const zf = Z - 0.1; // frame plane
  const top = F + 2.62, head = F + 2.2, sill = F + 0.5;
  // outer frame & head rail
  B.box('solid', -4.15, top - 0.08, zf - 0.07, 4.15, top, zf + 0.07, WOOD);
  B.box('solid', -4.15, head - 0.05, zf - 0.07, 4.15, head + 0.05, zf + 0.07, WOOD);
  for (const px of [-4.15, -2.6, -1.05, 0.45, 1.55, 2.85, 4.15]) {
    const w = px === -4.15 || px === 4.15 ? 0.1 : 0.08;
    B.box('solid', px - w / 2, F, zf - 0.07, px + w / 2, top, zf + 0.07, WOOD);
  }
  // kick panels + sills under the windows
  for (const [a, b] of [[-4.1, 0.41], [1.59, 4.1]]) {
    B.box('wood', a, F, zf - 0.04, b, sill, zf + 0.03, '#6a4a34');
    B.box('solid', a - 0.02, sill - 0.03, zf - 0.08, b + 0.02, sill + 0.03, zf + 0.22, WOOD);
    B.quad('glass', (a + b) / 2, (sill + head) / 2, zf, b - a, head - sill - 0.03, '#fff');
  }
  // window muntins (small panes at the top: classic kissaten)
  for (const [a, b] of [[-4.1, -2.64], [-2.56, -1.09], [-1.01, 0.41], [1.59, 2.81], [2.89, 4.1]]) {
    B.box('solid', a, head - 0.52, zf - 0.02, b, head - 0.48, zf + 0.03, WOOD);
    for (let k = 1; k < 3; k++) {
      const mx = a + ((b - a) * k) / 3;
      B.box('solid', mx - 0.015, head - 0.5, zf - 0.02, mx + 0.015, head, zf + 0.03, WOOD);
    }
  }
  // transom glass (head .. top)
  B.quad('glass', 0, (head + top) / 2, zf, 8.2, top - head - 0.1, '#fff');
  for (let x = -3.6; x < 4.1; x += 0.55) B.box('solid', x - 0.012, head, zf - 0.02, x + 0.012, top - 0.08, zf + 0.03, WOOD);
  // door (x 0.5 .. 1.5): stile frame, glass upper, raised panel lower, brass handle
  const dx = 1.0, dw = 0.9;
  rectFrame(S, 'solid', dx, F + 1.1, zf + 0.02, dw, 2.18, 0.09, 0.06, WOOD);
  B.box('wood', dx - dw / 2 + 0.09, F + 0.09, zf + 0.0, dx + dw / 2 - 0.09, F + 0.85, zf + 0.04, '#6a4a34');
  B.boxC('solid', dx, F + 0.88, zf + 0.02, dw - 0.18, 0.06, 0.06, WOOD);
  B.quad('glass', dx, F + 1.5, zf + 0.02, dw - 0.18, 1.1, '#fff');
  B.cyl('solid', dx - dw / 2 + 0.14, F + 1.0, zf + 0.06, 0.018, 0.06, '#c9a24a', { rx: Math.PI / 2, seg: 6 });
  B.boxC('solid', dx - dw / 2 + 0.14, F + 1.05, zf + 0.1, 0.03, 0.3, 0.03, '#c9a24a');
  // door signs: hours card, OPEN plate, payment stickers
  poster(S, dx + 0.12, F + 1.25, zf + 0.03, 0.2, 0.25, A.get('hours'));
  hangingPlate(S, dx, F + 1.78, zf + 0.06, 0.34, 0.25, A.get('shopcard'));
  poster(S, 3.5, F + 0.95, zf + 0.005, 0.36, 0.12, A.get('pay'));
  poster(S, -3.35, F + 1.2, zf + 0.005, 0.32, 0.45, A.get('season'));
  // stone step at the door
  B.box('solid', 0.35, S.gy(1, Z + 0.4) - 0.1, Z, 1.65, F - 0.01, Z + 0.4, '#c9c3b8');
  // exterior window ledge with small pots, glass bottles and a menu card
  const rng = S.rng;
  B.box('solid', -4.2, sill - 0.04, Z, 0.45, sill + 0.02, Z + 0.2, WOOD);
  for (const px of [-3.8, -2.2, -0.3]) pottedPlant(S, px, sill + 0.02, Z + 0.1, 0.55, { pot: rng() < 0.5 ? '#e8e0d0' : '#b86f4f', flowers: ['#f59ab4', '#fbf2f4'], nf: 4 });
  for (const [px, col, h] of [[-3.3, '#a8d4c8', 0.18], [-3.15, '#c8e0f0', 0.13], [-1.2, '#b8d8b0', 0.2], [-1.05, '#f0d8e0', 0.12]]) {
    B.cyl('solid', px, sill + 0.02, Z + 0.1, 0.035, h, col, { seg: 8 });
    B.cyl('deco', px, sill + 0.02 + h, Z + 0.1, 0.015, 0.06, col, { seg: 6 });
  }
  B.quad('solid', -1.8, sill + 0.12, Z + 0.1, 0.14, 0.2, '#ffffff', A.get('cMenu'), { rx: -0.2 });
  flowerBox(S, 2.85, sill - 0.02, Z + 0.02, 2.2, WOOD);
}

function interior(S, F, Z, H1) {
  const { B, A } = S;
  const zb = -0.3, zf = Z - 0.2, ceil = F + 3.0;
  room(S, -4.3, 4.3, zb, zf, F, ceil, { floor: '#a57a55', wall: '#f3e4c8', back: '#efdcbc', ceil: '#efe2c8', skirt: '#5a4030' });
  // wainscot on the back wall
  B.box('inner', -4.3, F, zb, 4.3, F + 1.0, zb + 0.03, '#6a4a34');
  // counter along the back wall
  B.box('inner', -3.9, F, zb + 0.4, 0.9, F + 1.0, zb + 1.0, '#5a4030');
  B.box('inner', -3.95, F + 1.0, zb + 0.35, 0.95, F + 1.05, zb + 1.08, '#c8a47a');
  // espresso machine, grinder, cups, cake dome
  B.box('inner', -3.2, F + 1.05, zb + 0.45, -2.5, F + 1.5, zb + 0.9, '#c9ccd0');
  B.box('lit', -3.05, F + 1.4, zb + 0.905, -2.95, F + 1.44, zb + 0.91, '#ff9a6a');
  B.box('inner', -3.1, F + 1.12, zb + 0.9, -2.6, F + 1.16, zb + 1.0, '#555b62');
  B.cyl('inner', -2.2, F + 1.05, zb + 0.7, 0.08, 0.35, '#3a3a40', { seg: 8 });
  B.cyl('inner', -2.2, F + 1.4, zb + 0.7, 0.07, 0.1, '#8a6446', { rb: 0.04, seg: 8 });
  for (let i = 0; i < 5; i++) B.cyl('inner', -1.6 + i * 0.14, F + 1.05, zb + 0.8, 0.045, 0.07, '#fbf6ea', { seg: 8 });
  B.cyl('inner', -0.2, F + 1.05, zb + 0.7, 0.14, 0.03, '#e8e0cc', { seg: 12 });
  B.sphere('glass', -0.2, F + 1.08, zb + 0.7, 0.14, '#fff', { half: true, w: 10, h: 4 });
  B.cyl('inner', -0.2, F + 1.08, zb + 0.7, 0.08, 0.06, '#f7c6d4', { seg: 8 });
  // back shelves with jars & cups, menu board
  for (const yy of [F + 1.6, F + 2.05]) {
    B.box('inner', -3.9, yy, zb, -1.0, yy + 0.04, zb + 0.28, '#6a4a34');
    for (let i = 0; i < 9; i++) B.cyl('inner', -3.7 + i * 0.32, yy + 0.04, zb + 0.14, 0.06, 0.14 + (i % 3) * 0.04, ['#e8d8b8', '#c8e0d8', '#8a6446', '#f0e0e8'][i % 4], { seg: 8 });
  }
  B.quad('inner', 0.0, F + 2.0, zb + 0.02, 0.8, 1.1, '#ffffff', A.get('cBoardB'));
  B.quad('inner', 2.6, F + 2.3, zb + 0.02, 0.36, 0.36, '#ffffff', A.get('clock'));
  B.quad('inner', 3.4, F + 1.7, zb + 0.02, 0.8, 0.4, '#ffffff', A.get('frames'));
  // cake showcase (x 1.5 .. 3.7)
  B.box('inner', 1.5, F, zb + 0.4, 3.7, F + 0.85, zb + 1.0, '#5a4030');
  B.box('inner', 1.55, F + 0.85, zb + 0.45, 3.65, F + 0.88, zb + 0.95, '#e8e0cc');
  B.quad('lit', 2.6, F + 1.02, zb + 0.9, 2.0, 0.28, '#ffffff', A.get('cCake'));
  B.box('glass', 1.52, F + 0.88, zb + 0.42, 3.68, F + 1.3, zb + 0.98, '#fff');
  B.box('inner', 1.5, F + 1.3, zb + 0.4, 3.7, F + 1.34, zb + 1.0, WOOD);
  // tables & chairs by the windows
  for (const tx of [-3.3, -1.5, 3.0]) {
    table(S, tx, F, Z - 1.3, 0.62, 0.62, 0.72, '#5a4030');
    woodChair(S, tx - 0.55, F, Z - 1.3, Math.PI / 2, '#7a5a40');
    woodChair(S, tx + 0.55, F, Z - 1.3, -Math.PI / 2, '#7a5a40');
    B.cyl('inner', tx - 0.1, F + 0.72, Z - 1.3, 0.05, 0.08, '#fbf6ea', { seg: 8 });
    B.cyl('inner', tx + 0.12, F + 0.72, Z - 1.25, 0.03, 0.12, '#c8e0f0', { seg: 6 });
    pendant(S, tx, ceil, Z - 1.3, 0.85, { style: 'dome', shade: '#3f5a48' });
  }
  for (const px of [-3.0, -1.8, -0.6]) pendant(S, px, ceil, zb + 0.9, 0.7, { style: 'bulb' });
  pendant(S, 2.6, ceil, zb + 0.7, 0.9, { style: 'cone', shade: '#e8e0cc' });
  // plants
  pottedPlant(S, -4.0, F, Z - 2.6, 1.8, { kind: 'inner', tree: 0.7, blobs: 8, pot: '#e8e0d0', green: '#6f9e58' });
  pottedPlant(S, 4.0, F, Z - 0.6, 1.3, { kind: 'inner', tall: 1.6, pot: '#b86f4f' });
  // ceiling fan hint: a wooden beam across
  B.box('inner', -4.3, ceil - 0.18, Z - 2.4, 4.3, ceil, Z - 2.2, '#6a4a34');
}

function signage(S, F, Z, H1) {
  const { B, A, W } = S;
  // carved signboard above the awning + two gooseneck lamps
  const sy = F + 3.08, sw = 3.3, sh = 0.55;
  B.box('solid', -sw / 2 - 0.06, sy - sh / 2 - 0.06, Z, sw / 2 + 0.06, sy + sh / 2 + 0.06, Z + 0.07, WOOD);
  B.quad('solid', 0, sy, Z + 0.075, sw, sh, '#ffffff', A.get('cSign'));
  for (const lx of [-1.0, 1.0]) {
    B.tube('solid', [[lx, sy + 0.4, Z + 0.02], [lx, sy + 0.52, Z + 0.2], [lx, sy + 0.48, Z + 0.42]], 0.015, '#3a3a40');
    B.cyl('solid', lx, sy + 0.4, Z + 0.42, 0.03, 0.1, '#3a3a40', { rb: 0.09, seg: 8 });
    B.sphere('lit', lx, sy + 0.4, Z + 0.42, 0.04, C.bulb, { ico: 0 });
  }
  // awning: deep green, scalloped valance with the shop name
  awning(S, -4.35, 4.35, F + 2.8, Z + 0.02, 1.35, 0.5, { stripes: ['#2f5a48', '#335f4c'], sw: 0.5, valance: A.get('cValance'), valH: 0.24, arms: 3, frame: '#3a3a40' });
  // round projecting sign on the north corner (faces up & down the street)
  const rx = W / 2 - 0.15, ry = F + 4.25;
  B.box('solid', rx - 0.03, ry + 0.3, Z, rx + 0.03, ry + 0.34, Z + 0.72, '#3a3a40');
  B.cyl('solid', rx - 0.04, ry, Z + 0.42, 0.34, 0.08, '#ffffff', { rz: -Math.PI / 2, seg: 20, rect: A.get('cRound') });
  B.box('deco', rx - 0.005, ry + 0.3, Z + 0.3, rx + 0.005, ry + 0.34, Z + 0.32, '#3a3a40');
  // name plate + mascot sticker by the side window (station-road side)
  S.B.pushT(W / 2, 0, 1.6, Math.PI / 2);
  poster(S, 1.0, F + 0.7, 0.0, 0.18, 0.18, A.cell('mascot', 0, 2, 2));
  poster(S, -1.35, F + 1.9, 0.0, 0.3, 0.42, A.get('newitem'), { off: 0.02 });
  S.B.pop();
}

function outdoor(S, F, Z) {
  const { B, A } = S;
  const rng = S.rng;
  // two bistro tables with metal chairs; a few sakura petals on the table tops
  for (const tx of [-1.25, -3.35]) {
    const tz = Z + 1.0;
    const gy = S.gy(tx, tz);
    roundTable(S, tx, gy, tz, { top: '#f4efe4', base: '#34343a' });
    bistroChair(S, tx - 0.58, S.gy(tx - 0.58, tz), tz, Math.PI / 2 + 0.15, { color: '#3a4a44' });
    bistroChair(S, tx + 0.58, S.gy(tx + 0.58, tz), tz, -Math.PI / 2 - 0.1, { color: '#3a4a44' });
    for (let i = 0; i < 5; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 0.26;
      B.quad('deco', tx + Math.cos(a) * r, gy + 0.723, tz + Math.sin(a) * r, 0.03, 0.022, '#f9c3d2', null, { rx: -Math.PI / 2, rz: rng() * 3 });
    }
    // sugar pot + menu stand on the table
    B.cyl('solid', tx + 0.08, gy + 0.72, tz - 0.05, 0.035, 0.07, '#fbf6ea', { seg: 8 });
    B.quad('solid', tx - 0.1, gy + 0.8, tz + 0.05, 0.08, 0.12, '#ffffff', A.get('cMenu'), { ry: 0.6 });
  }
  // petals scattered on the apron
  for (let i = 0; i < 30; i++) {
    const px = -4.5 + rng() * 9, pz = Z + 0.2 + rng() * 1.7;
    B.quad('deco', px, S.gy(px, pz) + 0.004, pz, 0.03, 0.022, rng() < 0.5 ? '#f9c3d2' : '#fbd6e0', null, { rx: -Math.PI / 2, rz: rng() * 3 });
  }
  // chalkboard A-frame by the door, angled toward the station road
  aFrame(S, 3.45, S.gy(3.45, Z + 0.85), Z + 0.85, 0.45, A.get('cBoard'), A.get('cBoardB'), { h: 1.0, w: 0.56 });
  // potted olive by the door
  pottedPlant(S, 1.85, S.gy(1.85, Z + 0.3), Z + 0.3, 1.9, { pot: '#d8cfc0', tree: 0.62, blobs: 9, green: '#8aa878' });
  pottedPlant(S, -4.45, S.gy(-4.45, Z + 0.3), Z + 0.3, 1.4, { pot: '#b86f4f', flowers: ['#f7b6c8', '#fff'], nf: 8 });
}
