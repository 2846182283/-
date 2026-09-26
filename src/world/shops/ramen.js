/**
 * らーめん 春来 — small neighbourhood ramen shop.
 * Red signboard, navy noren over a wooden sliding door, a pair of red
 * lanterns (赤提灯), wooden menu plaques, a food-sample window with plastic
 * ramen bowls and gyoza, metal lean-to eave, stainless exhaust duct up the
 * side wall.  Inside: counter with stools, steaming kitchen, warm bulbs.
 */
import * as THREE from 'three';
import { shopHouse, room, hisashi } from './shell.js';
import { slidingDoors, noren, lantern, pendant, poster, crate, projectingSign, aFrame } from './parts.js';

const WOODR = '#5a3a2e';

export function buildRamen(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.1;
  const Z = D / 2;
  const hs = shopHouse(S, {
    W, D, F, H1: 3.05, H2: 2.7, floors: 2,
    wall1: { kind: 'wood', color: '#7a4e3a' }, wall2: { kind: 'plaster', color: '#efe6d6' }, sides: { kind: 'plaster', color: '#e8dcc8' },
    base: '#8a847c',
    open: { x0: -3.1, x1: 3.1, y1: 2.3 },
    win2: [{ x: -1.6, w: 1.3, h: 1.0, y: 1.4, rail: true }, { x: 1.6, w: 1.3, h: 1.0, y: 1.4, rail: true }],
    sideWin: [{ side: -1, z: -1.5, w: 0.8, h: 0.8, y: 4.6 }],
    roof: { type: 'gable', color: '#5f6670', rise: 1.4, overZ: 0.6 },
    bandColor: '#5a3a2e',
  });
  const zf = Z - 0.1;
  // --- posts: menu bay | door | sample window
  for (const x of [-3.1, -1.95, 0.35, 3.1]) B.box('solid', x - 0.06, F, zf - 0.08, x + 0.06, F + 2.3, zf + 0.1, WOODR);
  B.box('solid', -3.15, F + 2.22, zf - 0.08, 3.15, F + 2.34, zf + 0.12, WOODR);
  // menu bay: wooden plaques board + a poster
  B.box('wood', -3.04, F, zf - 0.02, -2.01, F + 2.22, zf + 0.02, '#6a4234');
  B.box('solid', -2.95, F + 1.0, zf + 0.02, -2.1, F + 1.85, zf + 0.06, '#4a3426', { rect: A.get('rMenu'), face: 'Z', colors: { Z: '#ffffff' } });
  poster(S, -2.52, F + 0.62, zf + 0.02, 0.4, 0.56, A.get('rPoster'));
  // sliding door (2 panels, lower wood, one open a crack)
  slidingDoors(S, -1.89, 0.29, F, F + 2.22, zf, { panels: 2, frame: WOODR, kick: 0.5, kickKind: 'wood', kickColor: '#6a4234', bars: 2, open: 0.25 });
  B.box('solid', -1.95, S.gy(-0.8, Z + 0.3) - 0.08, Z, 0.35, F - 0.005, Z + 0.3, '#b8b2a8');
  poster(S, -0.2, F + 1.35, zf + 0.012, 0.26, 0.32, A.get('hours'));
  // food sample window: lit shelf with bowls, gyoza plates, price cards
  const sx0 = 0.41, sx1 = 3.04;
  B.box('wood', sx0, F, zf - 0.02, sx1, F + 0.8, zf + 0.02, '#6a4234');
  B.box('inner', sx0, F + 0.8, zf - 0.55, sx1, F + 1.9, zf - 0.05, '#f4efe4', { skip: 'Z' });
  B.box('solid', sx0, F + 0.78, zf - 0.55, sx1, F + 0.82, zf + 0.12, '#c9ccd0');
  B.quad('lit', (sx0 + sx1) / 2, F + 1.88, zf - 0.3, sx1 - sx0 - 0.1, 0.4, '#fff6e0', null, { rx: Math.PI / 2 });
  sampleShelf(S, sx0, sx1, F + 0.82, zf - 0.3);
  B.quad('glass', (sx0 + sx1) / 2, F + 1.36, zf + 0.03, sx1 - sx0, 1.1, '#fff');
  B.box('solid', sx0, F + 1.9, zf - 0.05, sx1, F + 2.22, zf + 0.02, '#6a4234');

  // --- metal eave, sign, noren, lanterns
  hisashi(S, -W / 2 - 0.08, W / 2 + 0.08, F + 2.62, Z, 0.8, 0.3, '#7a8088', { kind: 'rows', brackets: 2, bracket: '#3a3a40', fascia: '#5a6068' });
  const sy = F + 3.25;
  B.box('solid', -2.7, sy - 0.33, Z + 0.06, 2.7, sy + 0.33, Z + 0.16, '#8a2a24');
  B.quad('solid', 0, sy, Z + 0.165, 3.1, 0.6, '#ffffff', A.get('rSign'));
  B.quad('solid', -2.25, sy, Z + 0.165, 0.8, 0.6, '#b8342e');
  B.quad('solid', 2.25, sy, Z + 0.165, 0.8, 0.6, '#b8342e');
  noren(S, -0.8, F + 2.2, Z + 0.12, 2.0, 0.85, A.get('rNoren'), 3, { rodCol: '#3a2a20' });
  for (const x of [-2.4, 0.95]) {
    B.box('solid', x - 0.02, F + 2.22, Z + 0.24, x + 0.02, F + 2.26, Z + 0.62, '#3a3a40');
    lantern(S, x, F + 2.22, Z + 0.58, 0.22, 0.58, A.get('rLantern'), { lit: true, color: '#ff9e8a', shape: 'round' });
  }
  // projecting vertical sign (reads from far up the street) + folding stand sign
  projectingSign(S, W / 2 - 0.25, F + 4.35, Z, 0.42, 1.6, 0.14, A.get('rVert'), A.get('rVert'), { out: 0.18 });
  aFrame(S, -2.55, S.gy(-2.55, Z + 0.45), Z + 0.45, -0.3, A.get('rStand'), A.get('rStand'), { h: 0.9, w: 0.5 });
  // --- side: stainless exhaust duct + beer crates (south side, seen from the hero view)
  const sw = W / 2;
  B.box('solid', sw, F + 1.6, -2.4, sw + 0.35, F + 1.95, -2.05, '#c9ccd0');
  B.box('solid', sw + 0.05, F + 1.6, -2.35, sw + 0.3, hs.roofTop + 0.6, -2.1, '#c9ccd0');
  B.box('solid', sw - 0.02, hs.roofTop + 0.6, -2.45, sw + 0.37, hs.roofTop + 0.7, -2.0, '#9aa1a8');
  for (let yy = F + 2.6; yy < hs.roofTop; yy += 1.3) B.box('solid', sw, yy, -2.38, sw + 0.12, yy + 0.04, -2.07, '#8e949a');
  for (let i = 0; i < 3; i++) crate(S, sw + 0.35, S.rawY(sw + 0.35, -0.6) + i * 0.3, -0.6, 0.34, 0.3, 0.45, '#e8a23a', { bottles: i === 2 ? '#6a4a2a' : null });
  B.box('solid', sw + 0.1, S.rawY(sw + 0.35, 1.4), 1.1, sw + 0.6, S.rawY(sw + 0.35, 1.4) + 0.7, 1.7, '#4a6a8a'); // bin

  interior(S, F, Z);
  return hs;
}

/** Plastic food samples: ramen bowls with toppings, gyoza plates, price cards. */
function sampleShelf(S, x0, x1, y, z) {
  const { B, A } = S;
  const bowlG = B._cached('ramenBowl', () => {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(0.35 + 0.65 * Math.sin(t * Math.PI / 2), t)); }
    return new THREE.LatheGeometry(pts, 14);
  });
  const soups = ['#c8894a', '#e0b070', '#f0e0c0', '#8a5a3a'];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const bx = x0 + 0.35 + i * ((x1 - x0 - 0.7) / (n - 1));
    B.geo('inner', bowlG, i % 2 ? '#2a2a2e' : '#c8322c', { m: new THREE.Matrix4().compose(new THREE.Vector3(bx, y + 0.1, z), new THREE.Quaternion(), new THREE.Vector3(0.13, 0.1, 0.13)) });
    B.cyl('inner', bx, y + 0.1, z, 0.12, 0.09, '#f4efe4', { seg: 12 }); // plate under
    B.cyl('inner', bx, y + 0.17, z, 0.12, 0.012, soups[i], { seg: 12 });
    B.box('inner', bx - 0.06, y + 0.18, z - 0.02, bx - 0.01, y + 0.19, z + 0.05, '#f4c0a0'); // chashu
    B.cyl('inner', bx + 0.04, y + 0.18, z - 0.03, 0.025, 0.012, '#fbf6ea', { seg: 8 }); // naruto / egg
    B.box('inner', bx + 0.01, y + 0.18, z + 0.03, bx + 0.07, y + 0.19, z + 0.07, '#2d3a2d'); // nori
    B.cyl('inner', bx, y + 0.18, z, 0.04, 0.02, '#8ac06a', { seg: 6 }); // negi
    B.quad('inner', bx, y + 0.06, z + 0.16, 0.18, 0.08, '#ffffff', A.sub('rMenu', i / 6, 0.75, 1 / 6, 0.2), { rx: -0.3 });
  }
  // gyoza plate at the back
  B.cyl('inner', (x0 + x1) / 2, y + 0.3, z - 0.18, 0.14, 0.02, '#f4efe4', { seg: 12 });
  for (let k = 0; k < 5; k++) B.sphere('inner', (x0 + x1) / 2 - 0.08 + k * 0.04, y + 0.33, z - 0.18, 0.03, '#e0b070', { sx: 0.7, sy: 0.5, sz: 1.4, w: 6, h: 4 });
  B.box('inner', x0 + 0.1, y, z - 0.25, x1 - 0.1, y + 0.3, z - 0.2, '#e8e0d0');
}

function interior(S, F, Z) {
  const { B } = S;
  const zb = Z - 5.2, zf = Z - 0.2, ceil = F + 2.6;
  room(S, -3.3, 3.3, zb, zf, F, ceil, { floor: '#8a7a6a', wall: '#f0e6d4', back: '#e0d4bc', ceil: '#e8dcc4', skirt: '#3a2a20' });
  // L counter with stools
  B.box('inner', -3.0, F, zb + 1.8, 1.8, F + 1.0, zb + 2.3, WOODR);
  B.box('inner', -3.1, F + 1.0, zb + 1.75, 1.9, F + 1.05, zb + 2.5, '#c8a878');
  for (let i = 0; i < 5; i++) {
    const sx = -2.6 + i * 0.9;
    B.cyl('inner', sx, F, zb + 2.85, 0.03, 0.62, '#8e949a', { seg: 6 });
    B.cyl('inner', sx, F + 0.62, zb + 2.85, 0.17, 0.07, '#c8322c', { seg: 10 });
  }
  // kitchen: stainless range, pots, hood, menu strips
  B.box('inner', -3.2, F, zb, 2.0, F + 0.9, zb + 0.7, '#c9ccd0');
  for (let i = 0; i < 3; i++) B.cyl('inner', -2.4 + i * 1.0, F + 0.9, zb + 0.35, 0.2, 0.32, '#b8bcc0', { seg: 10 });
  B.box('inner', -3.2, F + 1.9, zb, 2.0, F + 2.3, zb + 0.8, '#b8bcc0');
  for (let i = 0; i < 6; i++) B.quad('inner', -2.8 + i * 0.5, F + 1.5, zb + 0.02, 0.36, 0.6, '#ffffff', S.A.sub('rMenu', i / 6, 0, 1 / 6, 1));
  pendant(S, -2.0, ceil, zb + 2.1, 0.55, { style: 'cone', shade: '#c8322c' });
  pendant(S, -0.4, ceil, zb + 2.1, 0.55, { style: 'cone', shade: '#c8322c' });
  pendant(S, 1.2, ceil, zb + 2.1, 0.55, { style: 'cone', shade: '#c8322c' });
  // tables by the window
  B.box('inner', 1.2, F, Z - 1.6, 2.6, F + 0.72, Z - 0.9, '#6a4234');
}
