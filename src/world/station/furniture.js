/**
 * Platform furniture: canopies (slim steel columns, light grey deck with a
 * translucent skylight band, white fascia with a pink line stripe), hanging
 * fluorescent fixtures, hanging signs (station name, direction, exit, LED
 * departure boards, clocks), classic 駅名標 boards on legs, benches (plastic
 * bucket seats and wooden slat benches), sorted trash bins, platform-number
 * plates, timetables on columns and a small glazed waiting shelter on P2.
 */
import * as THREE from 'three';
import { PLATFORM, STATION, SPOTS } from '../../core/layout.js';

const PT = PLATFORM.top;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// canopy definitions (s = direction from the back toward the track edge)
const CANOPIES = [
  {
    id: 'P1', s: -1, x0: -38.2, x1: 12.4,
    zBack: -24.05, zFront: -28.1, zCol: -24.95,
    cols: [-37, -31.5, -26.5, -20.5, -14.6, -8.2, -1.5, 4.8, 11.2],
  },
  {
    id: 'P2', s: 1, x0: -37.2, x1: 11.2,
    zBack: -39.55, zFront: -36.1, zCol: -38.65,
    cols: [-35.8, -29.5, -23, -16.5, -10, -3.5, 3, 9.5],
  },
];
const Y_BACK = PT + 2.9; // girder top at the back
const Y_FRONT = PT + 3.15; // girder top at the track side

const colColor = '#dcd7cb';
const deckColor = '#c7cbd0';

export function buildFurniture(kit, S, parent, clocks) {
  for (const C of CANOPIES) buildCanopy(kit, S, parent, clocks, C);
  buildEkimeihyo(kit, S, parent);
  buildBenchesAndBins(kit, S, parent);
  buildShelter(kit, S, parent);
}

// ---------------------------------------------------------------------------
function canopyY(C, z) {
  const t = (z - C.zBack) / (C.zFront - C.zBack);
  return Y_BACK + (Y_FRONT - Y_BACK) * t;
}

function buildCanopy(kit, S, parent, clocks, C) {
  const { M } = kit;
  const { s } = C;
  const GD = 0.3; // girder depth
  // columns + girders
  for (const x of C.cols) {
    const yTop = canopyY(C, C.zCol) - GD;
    kit.cyl(parent, M.metal, colColor, 0.085, 0.085, yTop - PT, x, PT, C.zCol, 12);
    kit.cyl(parent, M.metal, '#b7b2a6', 0.12, 0.12, 0.12, x, PT, C.zCol, 12); // base collar
    kit.bx(parent, M.metal, '#9ea3a8', x - 0.2, x + 0.2, PT, PT + 0.02, C.zCol - 0.2, C.zCol + 0.2);
    // tapered cantilever girder (two boxes: deep near the column, shallow at the tips)
    kit.beam(parent, M.metal, colColor, V(x, canopyY(C, C.zBack) - GD * 0.6, C.zBack), V(x, canopyY(C, C.zFront) - GD * 0.6, C.zFront), 0.12, GD * 0.6, { under: true });
    kit.beam(parent, M.metal, colColor, V(x, canopyY(C, C.zCol - s * 0.9) - GD, C.zCol - s * 0.9), V(x, canopyY(C, C.zCol + s * 1.6) - GD, C.zCol + s * 1.6), 0.1, GD * 0.45, { under: true });
    // knee brace
    kit.beam(parent, M.metal, colColor, V(x, yTop - 0.9, C.zCol), V(x, canopyY(C, C.zCol + s * 1.3) - GD * 0.6, C.zCol + s * 1.3), 0.07, 0.07);
    kit.colliders.push([x - 0.15, x + 0.15, C.zCol - 0.15, C.zCol + 0.15]);
  }
  // purlins along x
  const purl = (z, w = 0.08, h = 0.1) => kit.beam(parent, M.metal, colColor, V(C.x0, canopyY(C, z) - h, z), V(C.x1, canopyY(C, z) - h, z), w, h, { under: true });
  const zs = [C.zBack + s * 0.05, C.zBack + s * 1.25, C.zBack + s * 2.25, C.zFront - s * 0.05];
  for (const z of zs) purl(z);
  // deck: two opaque bands + a translucent skylight band between them
  const xm = (C.x0 + C.x1) / 2, W = C.x1 - C.x0 + 0.2;
  const deck = (za, zb, mat, color) => kit.beam(parent, mat, color, V(xm, canopyY(C, za), za), V(xm, canopyY(C, zb), zb), W, 0.05, { under: true, uv: [1, 1] });
  const zSky0 = C.zBack + s * 1.3, zSky1 = C.zBack + s * 2.2;
  deck(C.zBack - s * 0.05, zSky0, M.roof, deckColor);
  deck(zSky1, C.zFront + s * 0.1, M.roof, deckColor);
  {
    const g = new THREE.PlaneGeometry(W, Math.abs(zSky1 - zSky0));
    g.rotateX(-Math.PI / 2 - Math.atan((Y_FRONT - Y_BACK) / (C.zFront - C.zBack)) * 1);
    g.translate(xm, (canopyY(C, zSky0) + canopyY(C, zSky1)) / 2 + 0.03, (zSky0 + zSky1) / 2);
    kit.add(parent, g, kit.ctx.toon.glass({ tint: '#e6eef3', opacity: 0.72, sheen: 0.12, side: THREE.DoubleSide }), null, { noOutline: true, cast: false });
    // glazing bars across the skylight
    for (let x = C.x0 + 1.2; x < C.x1; x += 1.2) kit.beam(parent, M.metal, colColor, V(x, canopyY(C, zSky0) - 0.02, zSky0), V(x, canopyY(C, zSky1) - 0.02, zSky1), 0.05, 0.06, { under: true });
  }
  // fascia along the track edge: white board with the line-colour stripe
  const yf = canopyY(C, C.zFront);
  const zf = C.zFront + s * 0.12;
  kit.bx(parent, M.vc, '#f6f3ec', C.x0 - 0.1, C.x1 + 0.1, yf - 0.28, yf + 0.1, Math.min(zf, zf - s * 0.08), Math.max(zf, zf - s * 0.08));
  kit.bx(parent, M.vc, STATION.lineColor, C.x0 - 0.1, C.x1 + 0.1, yf - 0.16, yf - 0.09, Math.min(zf + s * 0.001, zf + s * 0.006), Math.max(zf + s * 0.001, zf + s * 0.006), { noOutline: true });
  // gutter + end boards at the back
  const yb = canopyY(C, C.zBack);
  kit.rod(parent, M.metal, '#8f969d', 0.07, 'x', C.x0 - 0.1, C.x1 + 0.1, yb - 0.05, C.zBack - s * 0.08, 10);
  for (const x of [C.x0 - 0.1, C.x1 + 0.1]) {
    kit.beam(parent, M.vc, '#f6f3ec', V(x, yb - 0.2, C.zBack - s * 0.05), V(x, yf - 0.2, C.zFront + s * 0.12), 0.05, 0.32, { under: true });
  }
  // downpipes at the two end columns
  for (const x of [C.cols[0], C.cols[C.cols.length - 1]]) {
    kit.cyl(parent, M.metal, '#8f969d', 0.04, 0.04, yb - 0.1 - PT, x + 0.16, PT, C.zCol - s * 0.05, 8);
  }

  // fluorescent fixtures along the middle, hanging just below the purlins
  const zl = C.zBack + s * 1.9;
  const lampY = canopyY(C, zl) - 0.32;
  for (let x = C.x0 + 1.4; x < C.x1 - 0.8; x += 3.2) {
    if (C.cols.some((c) => Math.abs(c - x) < 0.8)) continue;
    kit.bx(parent, M.metal, '#f2f2ee', x - 0.65, x + 0.65, lampY, lampY + 0.08, zl - 0.07, zl + 0.07);
    kit.bx(parent, M.lamp, '#fff7e6', x - 0.6, x + 0.6, lampY - 0.03, lampY, zl - 0.035, zl + 0.035, { noOutline: true, cast: false });
    for (const dx of [-0.4, 0.4]) kit.bx(parent, M.metal, '#9aa1a8', x + dx - 0.008, x + dx + 0.008, lampY + 0.08, canopyY(C, zl) - 0.1, zl - 0.008, zl + 0.008, { noOutline: true, cast: false });
  }

  // ---------------- hanging signs ----------------
  const hang = (x, z, w, h, front, back, ryFront, y = null) => {
    const yTop = canopyY(C, z) - 0.12;
    const yc = y ?? yTop - 0.5 - h / 2;
    for (const dx of [-w * 0.38, w * 0.38]) {
      const px = x + (ryFront === 0 || ryFront === Math.PI ? dx : 0);
      const pz = z + (ryFront === 0 || ryFront === Math.PI ? 0 : dx);
      kit.bx(parent, M.metal, '#8f969d', px - 0.01, px + 0.01, yc + h / 2, yTop, pz - 0.01, pz + 0.01, { noOutline: true });
    }
    const g = kit.board(parent, front, w, h, x, yc, z, ryFront, { back: back || true, thick: 0.06, frameColor: '#e4e4e0', mat: kit.matFor(front, 'lit') });
    return g;
  };
  const perp = Math.PI / 2; // face +x (front) / -x (back)
  if (C.id === 'P1') {
    hang(-23.0, -26.2, 2.3, 0.38, S.hangName, S.hangName, Math.PI);
    hang(-3.0, -26.6, 2.3, 0.38, S.hangName, S.hangName, Math.PI);
    hang(-17.0, -26.2, 1.9, 0.345, S.dir1, S.exitUp, perp);
    hang(8.0, -26.2, 1.9, 0.345, S.exitUp, S.dir1, perp);
    hang(-33.5, -26.2, 1.9, 0.345, S.exitUp, S.dir1, -perp);
    // gate sign in front of the building opening
    hang(-5.0, -24.45, 2.3, 0.46, S.gateSign, null, Math.PI, PT + 2.25);
    // LED departure board
    hangLed(kit, parent, -10.5, -26.4, canopyY(C, -26.4), S.led1);
    // hanging double-faced clock
    hangClock(kit, parent, clocks, 1.6, -26.3, canopyY(C, -26.3));
    // timetable and number plate on columns (facing the track)
    columnBoard(kit, parent, S.tt1, -20.5, C.zCol, s, 0.5, 0.68, PT + 1.45);
    columnBoard(kit, parent, S.num1, -31.5, C.zCol, s, 0.36, 0.42, PT + 1.9);
    columnBoard(kit, parent, S.num1, 4.8, C.zCol, s, 0.36, 0.42, PT + 1.9);
    columnBoard(kit, parent, S.posterSafety, -26.5, C.zCol, s, 0.42, 0.6, PT + 1.4);
    columnBoard(kit, parent, S.noSmokeSmall, -14.6, C.zCol, s, 0.36, 0.33, PT + 1.8);
  } else {
    hang(-20.0, -37.6, 2.3, 0.38, S.hangName, S.hangName, 0);
    hang(0.5, -37.6, 2.3, 0.38, S.hangName, S.hangName, 0);
    hang(-27.0, -37.6, 1.9, 0.345, S.exitCrossUp, S.dir2, perp);
    hang(6.2, -37.6, 1.9, 0.345, S.exitCrossUp, S.dir2, perp);
    hangLed(kit, parent, -6.5, -37.5, canopyY(C, -37.5), S.led2);
    hangClock(kit, parent, clocks, -13.2, -37.5, canopyY(C, -37.5));
    columnBoard(kit, parent, S.tt2, -23, C.zCol, s, 0.5, 0.68, PT + 1.45);
    columnBoard(kit, parent, S.num2, -29.5, C.zCol, s, 0.36, 0.42, PT + 1.9);
    columnBoard(kit, parent, S.num2, 3, C.zCol, s, 0.36, 0.42, PT + 1.9);
    columnBoard(kit, parent, S.posterSakura, -3.5, C.zCol, s, 0.42, 0.6, PT + 1.4);
    columnBoard(kit, parent, S.edgeWarn, 9.5, C.zCol, s, 0.8, 0.2, PT + 1.7);
  }
}

function hangLed(kit, parent, x, z, yRoof, region) {
  const { M } = kit;
  const w = 1.5, h = 0.4, yc = yRoof - 0.75;
  for (const dz of [-0.5, 0.5]) kit.bx(parent, M.metal, '#8f969d', x - 0.01, x + 0.01, yc + h / 2, yRoof - 0.1, z + dz - 0.01, z + dz + 0.01, { noOutline: true });
  kit.box(parent, M.metal, '#3a3d44', 0.16, h + 0.08, w + 0.08, x, yc, z);
  kit.decal(parent, region, w, h, x + 0.081, yc, z, Math.PI / 2, { mat: kit.matFor(region, 'unlit') });
  kit.decal(parent, region, w, h, x - 0.081, yc, z, -Math.PI / 2, { mat: kit.matFor(region, 'unlit') });
}

function hangClock(kit, parent, clocks, x, z, yRoof) {
  const { M } = kit;
  const r = 0.26, yc = yRoof - 0.7;
  kit.bx(parent, M.metal, '#8f969d', x - 0.012, x + 0.012, yc + r, yRoof - 0.1, z - 0.012, z + 0.012, { noOutline: true });
  const cyl = new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.12, 28);
  cyl.rotateZ(Math.PI / 2);
  cyl.translate(x, yc, z);
  kit.add(parent, cyl, M.metal, '#ecebe6');
  clocks.face(parent, x + 0.061, yc, z, Math.PI / 2, r, { housing: false, mat: kit.matFor({ atlas: kit.atlas }, 'lit') });
  clocks.face(parent, x - 0.061, yc, z, -Math.PI / 2, r, { housing: false, mat: kit.matFor({ atlas: kit.atlas }, 'lit') });
}

function columnBoard(kit, parent, region, x, zCol, s, w, h, y) {
  const z = zCol + s * 0.1;
  kit.board(parent, region, w, h, x, y, z + s * 0.02, s > 0 ? 0 : Math.PI, { thick: 0.03, frameColor: '#e8e8e4' });
  kit.bx(parent, kit.M.metal, '#9aa1a8', x - w * 0.3, x + w * 0.3, y - 0.02, y + 0.02, Math.min(zCol, z), Math.max(zCol, z), { noOutline: true });
}

// ---------------------------------------------------------------------------
/** Classic JR-style 駅名標 on two legs (2 per platform). */
function buildEkimeihyo(kit, S, parent) {
  const { M } = kit;
  const w = 2.2, h = 1.02;
  const one = (x, z, ry, region) => {
    const g = new THREE.Group();
    g.position.set(x, PT, z);
    g.rotation.y = ry;
    parent.add(g);
    const y0 = 1.25;
    for (const lx of [-w / 2 + 0.2, w / 2 - 0.2]) {
      kit.bx(g, M.metal, '#f0efea', lx - 0.045, lx + 0.045, 0, y0 + h, -0.1, -0.02);
      kit.bx(g, M.metal, '#b9bcc0', lx - 0.1, lx + 0.1, 0, 0.03, -0.14, 0.02);
    }
    kit.bx(g, M.metal, '#f0efea', -w / 2 - 0.05, w / 2 + 0.05, y0 - 0.05, y0 + h + 0.05, -0.02, 0.05);
    kit.bx(g, M.metal, '#dcdcd7', -w / 2 - 0.08, w / 2 + 0.08, y0 + h + 0.05, y0 + h + 0.1, -0.06, 0.09);
    kit.decal(g, region, w, h, 0, y0 + h / 2, 0.052, 0);
    kit.decal(g, S.hangName, w * 0.9, w * 0.9 * 0.167, 0, y0 + h / 2, -0.025, Math.PI);
    kit.colliders.push([x - w / 2, x + w / 2, z - 0.2, z + 0.2]);
  };
  one(-44, -24.7, Math.PI, S.ekiP1);
  one(18.6, -24.7, Math.PI, S.ekiP1);
  one(-44, -38.9, 0, S.ekiP2);
  one(16.5, -38.9, 0, S.ekiP2);
}

// ---------------------------------------------------------------------------
function plasticBench(kit, parent, x, z, ry, color, seats = 4) {
  const { M } = kit;
  const g = new THREE.Group();
  g.position.set(x, PT, z);
  g.rotation.y = ry;
  parent.add(g);
  const sw = 0.46, L = seats * sw;
  // frame: beam + two legs
  kit.bx(g, M.metal, '#8f969d', -L / 2, L / 2, 0.3, 0.36, -0.05, 0.05);
  for (const lx of [-L / 2 + 0.25, L / 2 - 0.25]) {
    kit.bx(g, M.metal, '#8f969d', lx - 0.04, lx + 0.04, 0, 0.33, -0.04, 0.04);
    kit.bx(g, M.metal, '#8f969d', lx - 0.14, lx + 0.14, 0, 0.02, -0.25, 0.25);
  }
  for (let i = 0; i < seats; i++) {
    const cx = -L / 2 + sw * (i + 0.5);
    kit.box(g, M.vc, color, sw - 0.05, 0.05, 0.42, cx, 0.41, 0.06, { rx: -0.06 });
    kit.box(g, M.vc, color, sw - 0.05, 0.42, 0.05, cx, 0.66, -0.17, { rx: -0.18 });
    kit.box(g, M.vc, kit.ctx.toon.shade(color, -0.06), sw - 0.09, 0.04, 0.3, cx, 0.39, 0.06, { rx: -0.06 });
    kit.bx(g, M.metal, '#8f969d', cx - 0.02, cx + 0.02, 0.36, 0.4, -0.05, 0.05);
  }
}

function woodBench(kit, parent, x, z, ry, legColor = '#3f5a4a', L = 1.9) {
  const { M } = kit;
  const g = new THREE.Group();
  g.position.set(x, PT, z);
  g.rotation.y = ry;
  parent.add(g);
  // cast legs (side frames) with armrests
  for (const lx of [-L / 2 + 0.12, L / 2 - 0.12]) {
    kit.bx(g, M.metal, legColor, lx - 0.03, lx + 0.03, 0, 0.42, 0.18, 0.24);
    kit.beam(g, M.metal, legColor, V(lx, 0, -0.2), V(lx, 0.85, -0.3), 0.06, 0.05);
    kit.bx(g, M.metal, legColor, lx - 0.03, lx + 0.03, 0.38, 0.42, -0.24, 0.24);
    kit.bx(g, M.metal, legColor, lx - 0.035, lx + 0.035, 0.6, 0.64, -0.24, 0.26);
    kit.bx(g, M.metal, legColor, lx - 0.03, lx + 0.03, 0.42, 0.62, 0.2, 0.25);
  }
  // seat slats
  for (let i = 0; i < 4; i++) {
    const z0 = -0.22 + i * 0.12;
    kit.bx(g, M.wood, '#b0875f', -L / 2, L / 2, 0.42, 0.46, z0, z0 + 0.1, { uv: [1, 1] });
  }
  // back slats (tilted)
  for (let i = 0; i < 3; i++) {
    const y = 0.56 + i * 0.12;
    const zz = -0.24 - (y - 0.5) * 0.12;
    kit.box(g, M.wood, '#b0875f', L - 0.04, 0.09, 0.03, 0, y, zz, { rx: -0.12, uv: [1, 1] });
  }
}

function sortedBins(kit, S, parent, x, z, ry) {
  const { M } = kit;
  const g = new THREE.Group();
  g.position.set(x, PT, z);
  g.rotation.y = ry;
  parent.add(g);
  const types = [[S.binCan, '#3b7fd1'], [S.binPet, '#2ea36a'], [S.binPaper, '#e89a2c'], [S.binBurn, '#d8484a']];
  const w = 0.34, L = types.length * w;
  kit.bx(g, M.metal, '#9aa1a8', -L / 2 - 0.02, L / 2 + 0.02, 0, 0.06, -0.2, 0.2);
  types.forEach(([lab, col], i) => {
    const cx = -L / 2 + w * (i + 0.5);
    kit.bx(g, M.metal, '#d5d9dd', cx - w / 2 + 0.01, cx + w / 2 - 0.01, 0.06, 0.88, -0.18, 0.18);
    kit.bx(g, M.vc, col, cx - w / 2 + 0.01, cx + w / 2 - 0.01, 0.88, 0.95, -0.19, 0.19);
    // opening in the lid (dark)
    if (i < 2) kit.cyl(g, M.vc, '#26282c', 0.06, 0.06, 0.012, cx, 0.95, 0.02, 12, { noOutline: true });
    else kit.bx(g, M.vc, '#26282c', cx - 0.11, cx + 0.11, 0.95, 0.962, -0.01, 0.03, { noOutline: true });
    kit.decal(g, lab, w - 0.06, (w - 0.06) * 0.55, cx, 0.7, 0.183, 0);
  });
}

function buildBenchesAndBins(kit, S, parent) {
  const green = '#3f7d63', blue = '#3d6fb0';
  // P1 (seat faces the track, i.e. -z)
  plasticBench(kit, parent, -34.2, -24.75, Math.PI, green);
  woodBench(kit, parent, -17.5, -24.8, Math.PI);
  // the reader's bench (people.js seats a reader at SPOTS.people.readerOnPlatformBench)
  const rd = SPOTS.people.readerOnPlatformBench;
  woodBench(kit, parent, rd.x, rd.z + 0.05, Math.PI);
  plasticBench(kit, parent, 7.6, -24.75, Math.PI, blue);
  // P2 (faces +z)
  plasticBench(kit, parent, -27.0, -38.8, 0, blue);
  woodBench(kit, parent, -20.2, -38.85, 0);
  plasticBench(kit, parent, -6.6, -38.8, 0, green);
  woodBench(kit, parent, 6.2, -38.85, 0);
  // sorted bins beside the vending machines + near the stairs
  sortedBins(kit, S, parent, -22.2, -24.35, Math.PI);
  sortedBins(kit, S, parent, -32.1, -39.2, 0);
  sortedBins(kit, S, parent, 2.9, -24.35, Math.PI);
}

// ---------------------------------------------------------------------------
/** Small glazed waiting shelter (待合室) against the back of P2. */
function buildShelter(kit, S, parent) {
  const { M } = kit;
  const x0 = -15.4, x1 = -11.2, z0 = -39.45, z1 = -38.45, H = 2.3;
  const col = '#e3ded2';
  // frame posts
  for (const x of [x0, x1, (x0 + x1) / 2]) for (const z of [z0, z1]) kit.bx(parent, M.metal, col, x - 0.04, x + 0.04, PT, PT + H, z - 0.04, z + 0.04);
  // roof slab
  kit.bx(parent, M.metal, '#b9bec4', x0 - 0.12, x1 + 0.12, PT + H, PT + H + 0.1, z0 - 0.12, z1 + 0.15);
  kit.bx(parent, M.vc, '#f6f3ec', x0 - 0.13, x1 + 0.13, PT + H - 0.05, PT + H + 0.12, z1 + 0.13, z1 + 0.17);
  // back wall (solid lower part) + glass
  kit.bx(parent, M.vc, '#d9d4c8', x0, x1, PT, PT + 0.9, z0 - 0.03, z0 + 0.03);
  const glassPanel = (w, h, x, y, z, ry) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(ry);
    g.translate(x, y, z);
    kit.add(parent, g, M.glass, null, { noOutline: true, cast: false });
  };
  glassPanel(x1 - x0, H - 0.95, (x0 + x1) / 2, PT + 0.9 + (H - 0.9) / 2, z0, 0);
  glassPanel(z1 - z0, H - 0.1, x0, PT + H / 2, (z0 + z1) / 2, Math.PI / 2);
  glassPanel(z1 - z0, H - 0.1, x1, PT + H / 2, (z0 + z1) / 2, Math.PI / 2);
  // front: glass either side of a sliding door opening (open)
  glassPanel(1.3, H - 0.1, x0 + 0.65, PT + H / 2, z1, 0);
  glassPanel(1.3, H - 0.1, x1 - 0.65, PT + H / 2, z1, 0);
  kit.bx(parent, M.metal, col, x0, x1, PT + 2.0, PT + 2.06, z1 - 0.03, z1 + 0.03);
  kit.bx(parent, M.metal, col, x0, x1, PT + 0.02, PT + 0.08, z1 - 0.03, z1 + 0.03);
  // sign on the front transom
  kit.decal(parent, S.shelterSign, 1.4, 0.2, (x0 + x1) / 2, PT + 2.17, z1 + 0.045, 0);
  kit.bx(parent, M.vc, '#26324f', (x0 + x1) / 2 - 0.74, (x0 + x1) / 2 + 0.74, PT + 2.06, PT + 2.28, z1 + 0.0, z1 + 0.04);
  // bench inside + a lamp
  woodBench(kit, parent, (x0 + x1) / 2, z0 + 0.4, 0, '#5b4a3c', 3.2);
  kit.bx(parent, M.lamp, '#fff4dc', (x0 + x1) / 2 - 0.5, (x0 + x1) / 2 + 0.5, PT + H - 0.05, PT + H - 0.02, (z0 + z1) / 2 - 0.05, (z0 + z1) / 2 + 0.05, { noOutline: true, cast: false });
  // poster inside
  kit.decal(parent, S.kid1, 0.45, 0.33, x0 + 0.6, PT + 1.25, z0 + 0.04, 0);
  kit.colliders.push([x0, x1, z0, z0 + 0.1], [x0, x0 + 0.1, z0, z1], [x1 - 0.1, x1, z0, z1]);
}
