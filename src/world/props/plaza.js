/**
 * props/plaza.js — station plaza (駅前広場) furniture at the PLAZA spots:
 *
 *   round wooden bench around the grand sakura (backs to the tree, petals on
 *   the slats, a school bag, a konbini paper bag with a leek and a half-drunk
 *   sakura latte), 駅周辺案内図 map board, さんぽマップ tourist board with a
 *   little gable roof, bus stop (round sign, timetable, weighted base, waiting
 *   bench), taxi stand sign, round-top post box, phone booth with a green
 *   phone, community notice board with posters, flower beds (brick / concrete
 *   kerbs; tulips, pansies, daisies, low shrubs), bollards with red/white
 *   chains, slat benches, the sorted bin station, and in PLAZA.east a public
 *   toilet, a 防災倉庫 cabinet, a 消火器 box on a stand and a tanuki statue.
 */
import * as THREE from 'three';
import { PLAZA } from '../../core/layout.js';
import { surfaceY } from './common.js';
import { recycleBins } from './vending.js';

const PS = () => surfaceY(0, -6, 0); // plaza paving height (0.07)

// ---------------------------------------------------------------------------
// shared small builders
// ---------------------------------------------------------------------------
/** Scatter fallen petals on a horizontal rectangle (local frame): n tiny pink quads. */
export function petals(kit, rng, n, x0, x1, z0, z1, y) {
  const cols = ['#fbd3de', '#f7b6c8', '#fde8ee', '#f5a9bf'];
  for (let i = 0; i < n; i++) {
    const g = new THREE.CircleGeometry(0.018 + rng() * 0.01, 5);
    g.scale(1, 0.62, 1);
    kit.add(g, 'vc2', cols[Math.floor(rng() * cols.length)], { no: true, cast: false, m: kit.mtx(x0 + rng() * (x1 - x0), y + rng() * 0.002, z0 + rng() * (z1 - z0), -Math.PI / 2 + (rng() - 0.5) * 0.3, rng() * 6.28) });
  }
}

/** Slat bench (seat top at `seatY`), length along local X, sitter faces +Z. */
export function slatBench(kit, rng, len = 1.8, seatY = 0.455, withPetals = true) {
  const wood = kit.S('wood');
  const iron = '#4a4f58';
  // cast legs / arm rests at both ends + middle support
  for (const x of [-len / 2 + 0.12, len / 2 - 0.12]) {
    kit.box(0.05, seatY - 0.02, 0.06, x, 0, 0.16, 'vc', iron, { bottom: true });
    kit.box(0.05, seatY + 0.36, 0.06, x, 0, -0.2, 'vc', iron, { bottom: true, rx: -0.06 });
    kit.box(0.05, 0.05, 0.46, x, seatY - 0.06, -0.02, 'vc', iron);
    kit.rbox(0.07, 0.04, 0.42, 0.015, x, seatY + 0.2, -0.02, 'vc', iron); // arm rest
    kit.box(0.04, 0.2, 0.04, x, seatY + 0.08, 0.16, 'vc', iron);
  }
  kit.box(len - 0.3, 0.04, 0.04, 0, seatY - 0.08, -0.02, 'vc', iron, { no: true });
  // seat slats
  for (let i = 0; i < 4; i++) kit.box(len, 0.035, 0.085, 0, seatY - 0.0175, 0.17 - i * 0.1, 'texS', '#fbf3e8', { region: wood });
  // back slats (leaning back)
  for (let i = 0; i < 3; i++) kit.box(len, 0.08, 0.03, 0, seatY + 0.14 + i * 0.11, -0.2 - i * 0.012, 'texS', '#fbf3e8', { region: wood, rx: -0.1 });
  if (withPetals) petals(kit, rng, 26, -len / 2 + 0.05, len / 2 - 0.05, -0.2, 0.2, seatY + 0.002);
}

/** Square post from y0 to y1. */
function post(kit, x, z, y0, y1, w, color, mat = 'vc') {
  kit.box(w, y1 - y0, w, x, y0, z, mat, color, { bottom: true });
}

// ---------------------------------------------------------------------------
// round bench around the grand tree
// ---------------------------------------------------------------------------
function roundBench(kit, rng) {
  const { x: cx, z: cz } = PLAZA.grandTree;
  const s = PS();
  const Ri = 2.02, Ro = 2.52, seatY = 0.44, N = 14;
  const wood = kit.S('wood');
  kit.push(kit.mtx(cx, s, cz));
  const dA = (Math.PI * 2) / N;
  for (let i = 0; i < N; i++) {
    const a0 = i * dA, am = a0 + dA / 2;
    // ribs + legs at the sector boundary
    kit.push(kit.mtx(0, 0, 0, 0, -a0));
    // local: +X = radial outward at angle a0
    kit.box(Ro - Ri + 0.02, 0.06, 0.07, (Ri + Ro) / 2, seatY - 0.075, 0, 'vc', '#80644c');
    kit.box(0.08, seatY - 0.1, 0.08, Ri + 0.08, 0, 0, 'vc', '#7a5e48', { bottom: true });
    kit.box(0.08, seatY - 0.1, 0.08, Ro - 0.08, 0, 0, 'vc', '#7a5e48', { bottom: true });
    // backrest post (backs to the tree: the backrest stands on the inner edge)
    kit.box(0.06, 0.46, 0.06, Ri + 0.02, seatY - 0.04, 0, 'vc', '#7a5e48', { bottom: true, rz: 0.1 });
    kit.pop();
    // seat slats (tangential) + back slats
    kit.push(kit.mtx(0, 0, 0, 0, -am));
    for (let k = 0; k < 5; k++) {
      const r = Ri + 0.07 + k * 0.095;
      const len = 2 * r * Math.sin(dA / 2) - 0.012;
      kit.box(0.08, 0.035, len, r, seatY - 0.0175, 0, 'texS', k % 2 ? '#fffaf2' : '#f2e6d4', { region: wood });
    }
    for (let k = 0; k < 2; k++) {
      const r = Ri + 0.04 + k * 0.02, y = seatY + 0.16 + k * 0.14;
      const len = 2 * r * Math.sin(dA / 2) - 0.012;
      kit.box(0.03, 0.09, len, r, y, 0, 'texS', '#f2e6d4', { region: wood, rz: 0.1 });
    }
    // petals collect on the slats (denser on the downwind side)
    for (let k = 0; k < 10; k++) {
      const r = Ri + 0.08 + rng() * (Ro - Ri - 0.12);
      const g = new THREE.CircleGeometry(0.018 + rng() * 0.01, 5);
      g.scale(1, 0.62, 1);
      const t = (rng() - 0.5) * dA * 0.9;
      kit.add(g, 'vc2', ['#fbd3de', '#f7b6c8', '#fde8ee'][Math.floor(rng() * 3)], { no: true, cast: false, m: kit.mtx(r * Math.cos(t), seatY + 0.002, -r * Math.sin(t), -Math.PI / 2 + (rng() - 0.5) * 0.3, rng() * 6.28) });
    }
    kit.pop();
  }
  // belongings on the bench (on the side facing the plaza camera: east / south-east)
  const seatAt = (ang, r = (Ri + Ro) / 2 + 0.03) => ({ x: Math.cos(ang) * r, z: Math.sin(ang) * r, ry: -ang });
  // school bag (navy satchel) lying flat with a keychain charm
  {
    const p = seatAt(0.35);
    kit.push(kit.mtx(p.x, seatY, p.z, 0, p.ry + Math.PI / 2 + 0.25));
    kit.rbox(0.42, 0.11, 0.3, 0.035, 0, 0.055, 0, 'vc', '#2f3a55');
    kit.rbox(0.43, 0.02, 0.2, 0.01, 0, 0.115, 0.06, 'vc', '#28324a');
    kit.box(0.06, 0.012, 0.03, 0, 0.125, 0.15, 'metal', '#c9a36a', { no: true });
    kit.torus(0.07, 0.01, 0, 0.11, -0.18, 'vc', '#2a2c30', { rx: -1.3, rs: 4, ts: 10, arc: Math.PI, no: true });
    kit.sphere(0.028, 0.18, 0.1, 0.19, 'vc', '#f7b6c8', { ws: 8, hs: 6, no: true });
    kit.sphere(0.012, 0.16, 0.13, 0.19, 'vc', '#f7b6c8', { ws: 6, hs: 4, no: true });
    kit.pop();
  }
  // konbini paper bag with a leek and a baguette
  {
    const p = seatAt(0.85);
    kit.push(kit.mtx(p.x, seatY, p.z, 0, p.ry + Math.PI / 2 - 0.2));
    const bag = kit.S('shopBag');
    kit.box(0.28, 0.3, 0.16, 0, 0, 0, 'vc', '#f6f0e2', { bottom: true });
    kit.plane(0.27, 0.29, 0, 0.15, 0.081, 'texS', '#ffffff', { region: bag });
    kit.plane(0.27, 0.29, 0, 0.15, -0.081, 'texS', '#ffffff', { region: bag, ry: Math.PI });
    for (const sz of [-1, 1]) kit.torus(0.06, 0.006, 0, 0.3, sz * 0.05, 'vc', '#e6dcc8', { arc: Math.PI, rs: 3, ts: 8, no: true });
    kit.cyl(0.018, 0.018, 0.38, 0.07, 0.12, 0.02, 'vc', '#f4f4ea', { rz: -0.25, seg: 6 });
    kit.cyl(0.02, 0.016, 0.16, 0.16, 0.44, 0.02, 'vc', '#7fb85a', { rz: -0.25, seg: 6, no: true });
    kit.cyl(0.03, 0.028, 0.34, -0.06, 0.1, -0.02, 'vc', '#d8a860', { rz: 0.18, seg: 8 });
    kit.pop();
  }
  // half-drunk sakura latte (clear cup, pink milk half way, domed lid, straw)
  {
    const p = seatAt(1.05, Ri + 0.2);
    kit.push(kit.mtx(p.x, seatY, p.z));
    kit.cyl(0.037, 0.03, 0.06, 0, 0.002, 0, 'vc', '#f7c3cf', { seg: 12, no: true });
    kit.cyl(0.036, 0.03, 0.05, 0, 0.012, 0, 'vc', '#fbe7ec', { seg: 12, no: true, cast: false });
    kit.cyl(0.045, 0.031, 0.13, 0, 0, 0, 'glass', '#ffffff', { seg: 14 });
    kit.cyl(0.0455, 0.041, 0.045, 0, 0.055, 0, 'texS', '#ffffff', { seg: 14, open: true, region: kit.S('sakuraCup'), no: true });
    kit.sphere(0.047, 0, 0.13, 0, 'glass', '#ffffff', { ws: 14, hs: 6, thetaLen: Math.PI / 2, sy: 0.5 });
    kit.cyl(0.005, 0.005, 0.22, 0.012, 0.03, 0, 'vc', '#f29bb4', { rz: -0.14, seg: 5, no: true });
    kit.pop();
  }
  kit.pop();
}

// ---------------------------------------------------------------------------
// boards & signs
// ---------------------------------------------------------------------------
function mapBoard(kit) {
  const p = PLAZA.mapBoard, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  const W = 1.76, H = 1.1, y0 = 0.72;
  const frame = '#3f5f86';
  for (const sx of [-1, 1]) post(kit, sx * (W / 2 + 0.03), -0.04, 0, y0 + H + 0.25, 0.08, frame);
  kit.box(W + 0.16, 0.04, 0.12, 0, 0, -0.04, 'vc', '#9aa1a8', { bottom: true }); // base plate
  kit.box(W + 0.02, H + 0.02, 0.06, 0, y0 + H / 2, -0.04, 'vc', '#e8ecef');
  kit.plane(W - 0.02, H - 0.02, 0, y0 + H / 2, -0.005, 'texS', '#ffffff', { region: kit.S('areaMap') });
  kit.plane(W, H, 0, y0 + H / 2, 0.006, 'glass', '#ffffff');
  // frame edges + visor
  kit.box(W + 0.12, 0.05, 0.1, 0, y0 - 0.02, -0.02, 'vc', frame);
  kit.box(W + 0.12, 0.05, 0.1, 0, y0 + H + 0.02, -0.02, 'vc', frame);
  kit.box(W + 0.24, 0.035, 0.34, 0, y0 + H + 0.2, 0.06, 'vc', frame, { rx: 0.18 });
  kit.box(W - 0.2, 0.02, 0.04, 0, y0 + H + 0.14, 0.12, 'glow', '#fff4dc'); // lamp strip under the visor
  kit.collide(W + 0.2, 0.3, 0, -0.04);
  kit.pop();
}

function touristBoard(kit) {
  const p = PLAZA.touristBoard, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  const W = 1.6, H = 1.02, y0 = 0.7;
  const wood = kit.S('wood');
  for (const sx of [-1, 1]) {
    kit.box(0.11, y0 + H + 0.45, 0.11, sx * (W / 2 + 0.06), 0, 0, 'texS', '#9a7454', { bottom: true, region: wood });
    kit.box(0.2, 0.08, 0.2, sx * (W / 2 + 0.06), 0, 0, 'vc', '#9a9890', { bottom: true });
  }
  kit.box(W + 0.06, H + 0.06, 0.05, 0, y0 + H / 2, -0.01, 'texS', '#8a6446', { region: wood });
  kit.plane(W, H, 0, y0 + H / 2, 0.02, 'texS', '#ffffff', { region: kit.S('walkMap') });
  kit.box(W + 0.06, 0.05, 0.08, 0, y0 - 0.03, 0.0, 'texS', '#8a6446', { region: wood });
  // little gable roof
  const rw = W + 0.5, rise = 0.22, rd = 0.5;
  for (const sz of [-1, 1]) kit.box(rw, 0.035, Math.hypot(rd / 2, rise) + 0.04, 0, y0 + H + 0.35 + rise / 2, sz * rd / 4, 'vc', '#5f6670', { rx: sz * Math.atan2(rise, rd / 2) });
  kit.box(rw, 0.04, 0.04, 0, y0 + H + 0.35 + rise + 0.01, 0, 'vc', '#4a5058');
  kit.box(W + 0.2, 0.06, 0.06, 0, y0 + H + 0.33, 0, 'texS', '#8a6446', { region: wood });
  kit.collide(W + 0.3, 0.3);
  kit.pop();
}

function busStop(kit, rng) {
  const p = PLAZA.busStop, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  // weighted base (concrete disc with a rubber rim) + pole
  kit.cyl(0.3, 0.32, 0.1, 0, 0, 0, 'vc', '#b9b6ae', { seg: 16 });
  kit.cyl(0.33, 0.33, 0.04, 0, 0, 0, 'vc', '#2f3338', { seg: 16, no: true });
  kit.cyl(0.035, 0.035, 2.45, 0, 0.1, 0, 'metal', '#d9dde0', { seg: 10 });
  // round sign (two-sided) with a green rim
  const rs = kit.S('busRound');
  kit.cyl(0.31, 0.31, 0.03, 0, 2.28, 0, 'vc', '#2f9a62', { rx: Math.PI / 2, center: true, seg: 28 });
  kit.plane(0.6, 0.6, 0, 2.28, 0.016, 'texS', '#ffffff', { region: rs });
  kit.plane(0.6, 0.6, 0, 2.28, -0.016, 'texS', '#ffffff', { region: rs, ry: Math.PI });
  // timetable box (glass front)
  kit.box(0.34, 0.5, 0.06, 0, 1.45, 0.06, 'vc', '#e8ecef');
  kit.plane(0.3, 0.45, 0, 1.45, 0.094, 'texS', '#ffffff', { region: kit.S('busTable') });
  kit.plane(0.32, 0.47, 0, 1.45, 0.098, 'glass', '#ffffff');
  kit.box(0.36, 0.03, 0.09, 0, 1.715, 0.06, 'vc', '#2f9a62', { no: true });
  // approach-light strip
  kit.box(0.06, 0.12, 0.03, 0, 1.08, 0.04, 'glow', '#bfeecb');
  kit.pop();
  // waiting bench next to the stop (faces the road)
  kit.push(kit.mtx(p.x + 1.9, s, p.z - 0.55, 0, 0));
  slatBench(kit, rng, 1.5, 0.43, true);
  kit.pop();
}

function taxiSign(kit) {
  const p = PLAZA.taxiSign, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  kit.box(0.34, 0.08, 0.34, 0, 0, 0, 'vc', '#9a9890', { bottom: true });
  post(kit, 0, 0, 0.08, 2.5, 0.08, '#2f5f9a', 'metal');
  kit.box(0.4, 1.02, 0.05, 0, 1.95, 0.04, 'vc', '#2f5f9a');
  kit.plane(0.36, 0.96, 0, 1.95, 0.066, 'texS', '#ffffff', { region: kit.S('taxi') });
  kit.plane(0.36, 0.96, 0, 1.95, 0.014, 'texS', '#ffffff', { region: kit.S('taxi'), ry: Math.PI });
  kit.pop();
}

function postBox(kit) {
  const p = PLAZA.mailbox, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  const red = '#d24a3c';
  kit.box(0.5, 0.1, 0.5, 0, 0, 0, 'vc', '#b9b6ae', { bottom: true });
  kit.cyl(0.2, 0.21, 0.08, 0, 0.1, 0, 'vc', '#b33c30', { seg: 32 });
  kit.cyl(0.2, 0.2, 1.02, 0, 0.18, 0, 'vc', red, { seg: 32 });
  kit.cyl(0.212, 0.212, 0.04, 0, 1.02, 0, 'vc', '#b33c30', { seg: 32 }); // band under the cap
  kit.sphere(0.215, 0, 1.2, 0, 'vc', red, { ws: 32, hs: 12, thetaLen: Math.PI / 2, sy: 0.55 });
  kit.cyl(0.225, 0.225, 0.03, 0, 1.19, 0, 'vc', '#b33c30', { seg: 32 });
  kit.sphere(0.035, 0, 1.33, 0, 'vc', red, { ws: 12, hs: 8 });
  // two mail slots with little hoods
  for (const x of [-0.075, 0.075]) {
    kit.box(0.11, 0.028, 0.04, x, 0.96, 0.195, 'vc', '#2a2226', { no: true });
    kit.box(0.13, 0.02, 0.06, x, 0.99, 0.2, 'vc', '#b33c30', { rx: 0.35 });
  }
  // plates: 郵便 + collection times, door + lock on the back
  const g = new THREE.CylinderGeometry(0.203, 0.203, 0.16, 16, 1, true, -0.62, 1.24);
  kit.add(g, 'texS', '#ffffff', { region: kit.S('postPlate'), m: kit.mtx(0, 0.78, 0), no: true, cast: false });
  kit.plane(0.12, 0.12, 0.145, 0.55, 0.145, 'texS', '#ffffff', { region: kit.S('postTimes'), ry: Math.PI / 4 });
  kit.box(0.2, 0.34, 0.02, 0, 0.45, -0.197, 'vc', '#c24336', { no: true });
  kit.cyl(0.018, 0.018, 0.02, 0.06, 0.55, -0.2, 'metal', '#c9cdd3', { rx: Math.PI / 2, center: true, seg: 8, no: true });
  kit.collide(0.5, 0.5);
  kit.pop();
}

function phoneBooth(kit) {
  const p = PLAZA.phoneBooth, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  const W = 0.92, D = 0.92, H = 2.1;
  const alu = '#d6dadd', frame = '#3f8f5a';
  kit.box(W + 0.1, 0.08, D + 0.1, 0, 0, 0, 'vc', '#b9b6ae', { bottom: true });
  kit.box(W, 0.02, D, 0, 0.08, 0, 'vc', '#7a7e86', { bottom: true, no: true });
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(kit, sx * (W / 2 - 0.03), sz * (D / 2 - 0.03), 0.08, H, 0.06, alu, 'metal');
  // kick panels + mid rails on four sides
  for (const [ry, dx, dz] of [[0, 0, 1], [Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) {
    kit.push(kit.mtx(dx * (W / 2 - 0.03), 0, dz * (D / 2 - 0.03), 0, ry));
    kit.box(W - 0.1, 0.22, 0.03, 0, 0.08, 0, 'vc', frame, { bottom: true });
    kit.box(W - 0.1, 0.04, 0.035, 0, 0.9, 0, 'metal', alu);
    kit.box(W - 0.1, 0.04, 0.035, 0, H - 0.18, 0, 'metal', alu);
    kit.plane(W - 0.1, H - 0.52, 0, 0.3 + (H - 0.52) / 2, 0, 'glassTint', '#ffffff', { ry: 0 });
    kit.pop();
  }
  // roof box with lit 公衆電話 signs on four sides
  kit.box(W + 0.1, 0.2, D + 0.1, 0, H - 0.02, 0, 'vc', '#eef0ee', { bottom: true });
  kit.box(W + 0.14, 0.04, D + 0.14, 0, H + 0.18, 0, 'vc', frame, { bottom: true });
  const sign = kit.S('phoneSign');
  for (const [ry, dx, dz] of [[0, 0, 1], [Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) {
    kit.plane(W - 0.06, 0.16, dx * (W / 2 + 0.052), H + 0.08, dz * (D / 2 + 0.052), 'glowS', '#f2f2ea', { region: sign, ry });
  }
  kit.box(0.4, 0.02, 0.1, 0, H - 0.04, 0, 'glow', '#fff6dc'); // ceiling lamp
  // door handle (front = +Z)
  kit.box(0.025, 0.4, 0.03, W / 2 - 0.15, 1.05, D / 2 + 0.02, 'metal', '#c9cdd3', { no: true });
  // interior: shelf, green phone, directory binder
  kit.box(0.56, 0.03, 0.3, 0, 0.82, -D / 2 + 0.2, 'vc', '#c9ccc8');
  kit.box(0.04, 0.3, 0.26, 0, 0.52, -D / 2 + 0.2, 'vc', '#9aa1a8', { no: true });
  kit.push(kit.mtx(0, 0.84, -D / 2 + 0.13, -0.12, 0));
  kit.rbox(0.24, 0.36, 0.16, 0.02, 0, 0.18, 0, 'vc', '#4aa062');
  kit.plane(0.2, 0.3, 0, 0.18, 0.081, 'texS', '#ffffff', { region: kit.S('phoneFace') });
  kit.rbox(0.2, 0.05, 0.06, 0.02, 0, 0.39, 0.03, 'vc', '#58b870'); // handset
  kit.pop();
  kit.curveTube([[0.1, 1.15, -D / 2 + 0.2], [0.14, 1.0, -D / 2 + 0.24], [0.12, 1.05, -D / 2 + 0.2]], 0.006, 8, 'vc', '#3a4a3a', { no: true, cast: false });
  kit.box(0.24, 0.3, 0.05, -0.18, 0.6, -D / 2 + 0.12, 'vc', '#3a5a8a');
  kit.collide(W + 0.1, D + 0.1);
  kit.pop();
}

function noticeBoard(kit) {
  const p = PLAZA.noticeBoard, s = PS();
  kit.push(kit.mtx(p.x, s, p.z, 0, p.rotY));
  const W = 1.8, H = 1.01, y0 = 0.8;
  const wood = kit.S('wood');
  for (const sx of [-1, 1]) kit.box(0.1, y0 + H + 0.35, 0.1, sx * (W / 2 + 0.05), 0, -0.04, 'texS', '#7a5a42', { bottom: true, region: wood });
  kit.box(W + 0.08, H + 0.08, 0.06, 0, y0 + H / 2, -0.04, 'texS', '#6a4e3a', { region: wood });
  kit.plane(W, H, 0, y0 + H / 2, -0.005, 'texS', '#ffffff', { region: kit.S('notice') });
  kit.plane(W, H, 0, y0 + H / 2, 0.012, 'glass', '#ffffff');
  kit.box(W + 0.4, 0.04, 0.36, 0, y0 + H + 0.2, 0.02, 'vc', '#5f6670', { rx: 0.16 });
  kit.box(W + 0.12, 0.06, 0.08, 0, y0 - 0.04, -0.01, 'texS', '#6a4e3a', { region: wood });
  kit.collide(W + 0.2, 0.3);
  kit.pop();
}

// ---------------------------------------------------------------------------
// flower beds
// ---------------------------------------------------------------------------
// Pastel spring palette (樱花粉 / 奶油白 / 淡黄) with one warm accent; weights set how
// often a drift of that colour appears.
const TULIP = [
  ['#f5a9bf', 3], ['#fbf4e4', 2], ['#f6dc8a', 2], ['#f4a391', 1], ['#dcb8e6', 1], ['#fbc9d6', 1.5], ['#e0605a', 0.5],
];
const PANSY = [['#b9a2e6', '#f5e07a'], ['#f5e07a', '#8a6aa8'], ['#fbf6ee', '#b99ee0'], ['#f6b89a', '#b86a5a'], ['#d6c6f0', '#fbf6ee'], ['#f7c6d6', '#c86a8a']];
const LEAF = ['#6f9a58', '#7fa865', '#86b06a', '#6a9360'];

/** Weighted pick from [[value, weight], ...]. */
function pickW(list, rng, not) {
  let tot = 0;
  for (const [v, w] of list) if (v !== not) tot += w;
  let r = rng() * tot;
  for (const [v, w] of list) {
    if (v === not) continue;
    if ((r -= w) <= 0) return v;
  }
  return list[0][0];
}

/**
 * Colour drifts along a bed: consecutive x ranges 0.35..0.8 m wide (≈3-7 plants), each
 * one colour, never the same colour twice in a row.  Returns x -> colour.
 */
function drifts(rng, x0, x1, list) {
  const cuts = [];
  let prev = null;
  for (let x = x0; x < x1 + 1;) {
    const w = 0.35 + rng() * 0.45;
    prev = pickW(list, rng, prev);
    cuts.push([x + w, prev]);
    x += w;
  }
  return (x) => {
    for (const [e, c] of cuts) if (x < e) return c;
    return cuts[cuts.length - 1][1];
  };
}

// Flowers are cheap on purpose (hundreds of them are baked): open 3-sided stems and
// leaves, a 5-sided lathe cup, and flat 5-sided discs for petals.  All of them go to the
// double-sided 'vc2' bucket so the open cups and discs read from any angle.
const FL = { no: true, cast: false };

function tulip(kit, x, y, z, color, rng) {
  const h = 0.2 + rng() * 0.12, lean = (rng() - 0.5) * 0.28;
  kit.push(kit.mtx(x, y, z, lean, rng() * 6.28, (rng() - 0.5) * 0.28));
  kit.cyl(0.005, 0.006, h, 0, 0, 0, 'vc2', '#6f9a58', { ...FL, seg: 3, open: true });
  // two strap leaves: flattened open 3-sided cones leaning out from the stem
  for (const a of [0, 2.6]) {
    const L = 0.1 + rng() * 0.05;
    const g = new THREE.CylinderGeometry(0, 0.02, L, 3, 1, true).translate(0, L / 2, 0);
    kit.add(g, 'vc2', '#7fa865', { ...FL, m: kit.mtx(Math.cos(a) * 0.01, 0, Math.sin(a) * 0.01, 0, a, 0.25, 1, 1, 0.3) });
  }
  kit.lathe([[0.004, 0], [0.024, 0.012], [0.031, 0.045], [0.022, 0.074]], 0, h - 0.004, 0, 'vc2', color, { ...FL, seg: 5 });
  kit.pop();
}

function pansy(kit, x, y, z, cols, rng, face = 0) {
  kit.push(kit.mtx(x, y, z, 0, face));
  // leaf rosette: a flattened icosahedron (20 triangles)
  kit.add(new THREE.IcosahedronGeometry(0.06, 0), 'vc2', LEAF[Math.floor(rng() * LEAF.length)], { ...FL, m: kit.mtx(0, 0.01, 0, 0, rng() * 6, 0, 1, 0.45, 1) });
  // flower face looking up and towards the plaza side (+Z); five round petals, two upper darker
  kit.push(kit.mtx((rng() - 0.5) * 0.03, 0.035, 0.015, -0.85 - rng() * 0.35, (rng() - 0.5) * 0.9, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    kit.add(new THREE.CircleGeometry(0.022, 5), 'vc2', i < 2 ? cols[1] : cols[0], { ...FL, m: kit.mtx(Math.cos(a) * 0.02, Math.sin(a) * 0.02, i * 0.0015) });
  }
  kit.add(new THREE.CircleGeometry(0.014, 5), 'vc2', cols[1], { ...FL, m: kit.mtx(0, -0.004, 0.009) });
  kit.add(new THREE.CircleGeometry(0.005, 4), 'vc2', '#f2d45a', { ...FL, m: kit.mtx(0, 0, 0.011) });
  kit.pop();
  kit.pop();
}

function daisy(kit, x, y, z, rng) {
  const h = 0.1 + rng() * 0.1;
  kit.cyl(0.003, 0.003, h, x, y, z, 'vc2', '#7fa865', { ...FL, seg: 3, open: true });
  const m = kit.mtx(x, y + h, z, -Math.PI / 2 + (rng() - 0.5) * 0.6, rng() * 6.28);
  kit.add(new THREE.CircleGeometry(0.022, 8), 'vc2', '#fbfaf4', { ...FL, m });
  kit.add(new THREE.CircleGeometry(0.008, 5).translate(0, 0, 0.002), 'vc2', '#f2c230', { ...FL, m });
}

/** Low leafy ground cover so no bare soil shows between the flowers. */
function groundCover(kit, rng, x0, x1, z0, z1, y, n) {
  for (let i = 0; i < n; i++) {
    const r = 0.07 + rng() * 0.06;
    kit.add(new THREE.IcosahedronGeometry(r, 0), 'vc', LEAF[Math.floor(rng() * LEAF.length)], { ...FL, m: kit.mtx(x0 + rng() * (x1 - x0), y, z0 + rng() * (z1 - z0), 0, rng() * 6, 0, 1, 0.4, 1) });
  }
}

export function shrub(kit, x, y, z, r, rng, blossom) {
  // a few overlapping lobes read as a clipped azalea / boxwood mound
  const lobes = [[0, 0, 0, 1], [0.45, 0.1, 0.2, 0.7], [-0.4, 0.05, -0.25, 0.72], [0.1, 0.35, -0.1, 0.62]];
  lobes.forEach(([dx, dy, dz, k], i) => {
    const g = new THREE.IcosahedronGeometry(r * k, 1);
    kit.add(g, 'vc', i % 2 ? '#7fa865' : '#6f9a5a', { m: kit.mtx(x + dx * r, y + r * (0.55 + dy), z + dz * r, 0, rng() * 6, 0, 1, 0.78, 1), no: i > 1 });
  });
  kit.add(new THREE.IcosahedronGeometry(r * 0.45, 1), 'vc', '#9cc27a', { m: kit.mtx(x + r * 0.15, y + r * 1.05, z + r * 0.25, 0, 0, 0, 1, 0.6, 1), no: true, cast: false });
  if (blossom) for (let i = 0; i < 9; i++) {
    const a = rng() * 6.28, rr = r * (0.55 + rng() * 0.4);
    kit.sphere(0.04, x + Math.cos(a) * rr, y + r * (0.6 + rng() * 0.5), z + Math.sin(a) * rr, 'vc', blossom, { ws: 5, hs: 4, no: true, cast: false });
  }
}

/** Brick kerb tints: faded, slightly uneven (multiplies the muted brick texture). */
const BRICK_TINT = ['#ffffff', '#f6eee8', '#fbf4ee', '#efe6e0', '#fff8f2'];

function flowerBeds(kit, rng) {
  const s = PS();
  PLAZA.flowerBeds.forEach((b, bi) => {
    const brick = bi < 2;
    const kh = 0.36, kt = 0.14;
    kit.push(kit.mtx(b.x, s, b.z));
    // kerb (four walls) + coping.  Walls are split into ~0.9 m blocks so the brick / stone
    // texture keeps a real-world scale; each block gets its own faint tint.
    const wall = (w, d, x, z) => {
      const along = w >= d ? 'x' : 'z';
      const L = Math.max(w, d);
      const n = Math.max(1, Math.round(L / 0.9));
      for (let i = 0; i < n; i++) {
        const c = -L / 2 + (i + 0.5) * (L / n);
        const bx = along === 'x' ? x + c : x, bz = along === 'x' ? z : z + c;
        const bw = along === 'x' ? L / n : w, bd = along === 'x' ? d : L / n;
        if (brick) kit.box(bw, kh, bd, bx, 0, bz, 'texS', BRICK_TINT[Math.floor(rng() * BRICK_TINT.length)], { bottom: true, region: kit.S('brick') });
        else kit.box(bw, kh, bd, bx, 0, bz, 'texS', '#e4e2dc', { bottom: true, region: kit.S('stone') });
      }
      kit.box(w + 0.02, 0.03, d + 0.02, x, kh, z, 'vc', brick ? '#dcd6ca' : '#d4d2cc', { bottom: true });
    };
    wall(b.w, kt, 0, b.d / 2 - kt / 2);
    wall(b.w, kt, 0, -b.d / 2 + kt / 2);
    wall(kt, b.d - kt * 2, b.w / 2 - kt / 2, 0);
    wall(kt, b.d - kt * 2, -b.w / 2 + kt / 2, 0);
    // soil heaped almost to the coping so low pansies stay visible over the kerb
    kit.box(b.w - kt * 2, 0.06, b.d - kt * 2, 0, kh - 0.065, 0, 'vc', '#7a5f48', { bottom: true, cast: false });
    const sy = kh - 0.005;
    const ix = b.w / 2 - kt - 0.06, iz = b.d / 2 - kt - 0.06;
    if (b.w > b.d) longBed(kit, rng, ix, iz, sy, bi);
    else narrowBed(kit, rng, ix, iz, sy);
    // a few petals on the soil / coping
    petals(kit, rng, 40, -b.w / 2 + kt, b.w / 2 - kt, -b.d / 2 + kt, b.d / 2 - kt, sy + 0.004);
    kit.collide(b.w, b.d);
    kit.pop();
  });
}

/**
 * Long bed seen from the plaza (+Z = front): shrubs spread along the back half, three
 * staggered tulip rows in colour drifts, two rows of pansies in front, daisies tucked in
 * at the back and in the gaps, leafy ground cover under everything.
 */
function longBed(kit, rng, ix, iz, sy, bi) {
  // shrubs every ~2.3 m (azalea in bloom / plain boxwood alternating), jittered
  const nS = Math.max(2, Math.round((ix * 2) / 2.3));
  const shrubs = [];
  for (let i = 0; i < nS; i++) {
    const x = -ix + 0.3 + (i / (nS - 1)) * (ix * 2 - 0.6) + (rng() - 0.5) * 0.4;
    const z = -iz + 0.3 + rng() * 0.15, r = 0.22 + rng() * 0.08;
    shrub(kit, x, sy, z, r, rng, i % 2 === bi % 2 ? '#f7a9bf' : rng() < 0.5 ? '#fbf6ee' : null);
    shrubs.push([x, z, r + 0.08]);
  }
  const free = (x, z) => shrubs.every(([sx, sz, r]) => Math.hypot(x - sx, z - sz) > r);
  groundCover(kit, rng, -ix, ix, -iz, iz, sy, Math.round(ix * 2 * 9));

  // tulips: three staggered rows, colour drifts shared across the rows but with ragged edges
  const colourAt = drifts(rng, -ix, ix, TULIP);
  const rows = [-0.24, -0.08, 0.08].map((z) => z * (iz / 0.58));
  rows.forEach((rz, r) => {
    const step = 0.12;
    for (let x = -ix + 0.06 + (r % 2) * step / 2; x < ix - 0.04; x += step * (0.85 + rng() * 0.3)) {
      const px = x + (rng() - 0.5) * 0.04, pz = rz + (rng() - 0.5) * 0.08;
      if (!free(px, pz) || rng() < 0.08) continue;
      tulip(kit, px, sy, pz, colourAt(px + (rng() - 0.5) * 0.3 + r * 0.1), rng);
    }
  });
  // pansies: two staggered front rows in small mixed clumps
  const pansyAt = drifts(rng, -ix, ix, PANSY.map((p) => [p, 1]));
  for (const [pz, off] of [[iz - 0.07, 0], [iz - 0.2, 0.065]]) {
    for (let x = -ix + 0.05 + off; x < ix - 0.03; x += 0.13 * (0.85 + rng() * 0.3)) {
      const px = x + (rng() - 0.5) * 0.03;
      if (rng() < 0.9) pansy(kit, px, sy, pz + (rng() - 0.5) * 0.04, pansyAt(px + (rng() - 0.5) * 0.2), rng);
    }
  }
  // daisies: along the back kerb and a few among the tulips
  for (let x = -ix + 0.05; x < ix; x += 0.1 + rng() * 0.12) {
    const pz = -iz + 0.05 + rng() * 0.12;
    if (free(x, pz)) daisy(kit, x, sy, pz, rng);
  }
  for (let i = 0; i < ix * 4; i++) {
    const x = -ix + rng() * ix * 2, z = rows[0] + rng() * (rows[2] - rows[0]);
    if (free(x, z)) daisy(kit, x, sy, z, rng);
  }
}

/** Narrow stone-edged bed along z: shrubs down the middle, pansy / daisy edges. */
function narrowBed(kit, rng, ix, iz, sy) {
  for (let z = -iz + 0.3; z < iz - 0.2; z += 0.9) shrub(kit, (rng() - 0.5) * 0.15, sy, z, 0.26 + rng() * 0.06, rng, rng() < 0.5 ? '#fbf6ee' : null);
  groundCover(kit, rng, -ix, ix, -iz, iz, sy, Math.round(iz * 2 * 6));
  const pansyAt = drifts(rng, -iz, iz, PANSY.map((p) => [p, 1]));
  for (let z = -iz + 0.06; z < iz; z += 0.12 * (0.85 + rng() * 0.3)) {
    pansy(kit, -ix + 0.07 + (rng() - 0.5) * 0.04, sy, z, pansyAt(z), rng, -Math.PI / 2);
    if (rng() < 0.55) daisy(kit, ix - 0.06, sy, z + (rng() - 0.5) * 0.05, rng);
  }
}

// ---------------------------------------------------------------------------
// bollards + chains, benches, sorted bins
// ---------------------------------------------------------------------------
function bollards(kit) {
  const B = PLAZA.bollards, s = PS();
  const tops = [];
  for (const x of B.xs) {
    kit.push(kit.mtx(x, s, B.z));
    kit.cyl(0.07, 0.075, 0.04, 0, 0, 0, 'metal', '#9aa1a8', { seg: 12, no: true });
    kit.cyl(0.055, 0.055, 0.72, 0, 0.02, 0, 'metal', '#d4d8dc', { seg: 12 });
    kit.sphere(0.056, 0, 0.74, 0, 'metal', '#d4d8dc', { ws: 12, hs: 4, thetaLen: Math.PI / 2, sy: 0.6 });
    kit.cyl(0.057, 0.057, 0.05, 0, 0.6, 0, 'vc', '#f2c230', { seg: 12, no: true }); // reflective band
    for (const sx of [-1, 1]) kit.torus(0.018, 0.005, sx * 0.06, 0.62, 0, 'metal', '#b9bec4', { rs: 3, ts: 8, no: true, cast: false });
    kit.pop();
    tops.push(x);
  }
  // red / white chains between neighbours 4 m apart -- except along the bus stop and the
  // taxi stand, where passengers step off the kerb: those bollards stay bare.
  const chain = kit.S('chain');
  const boardingX0 = PLAZA.busStop.x - 3, boardingX1 = PLAZA.taxiSign.x + 3;
  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i], b = tops[i + 1];
    if (b - a > 4.5) continue;
    if (b > boardingX0 && a < boardingX1) continue;
    const n = Math.round((b - a - 0.16) / 0.22);
    const x0 = a + 0.08, x1 = b - 0.08;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const y0 = 0.62 - 0.22 * 4 * t0 * (1 - t0), y1 = 0.62 - 0.22 * 4 * t1 * (1 - t1);
      const xa = x0 + (x1 - x0) * t0, xb = x0 + (x1 - x0) * t1;
      const len = Math.hypot(xb - xa, y1 - y0);
      kit.plane(len, 0.035, (xa + xb) / 2, s + (y0 + y1) / 2, B.z, 'texS2', '#ffffff', { region: chain, rz: Math.atan2(y1 - y0, xb - xa) });
    }
  }
}

function binStation(kit) {
  const p = PLAZA.trashBins[0], s = PS();
  kit.push(kit.mtx(p.x, s, p.z + 0.2, 0, p.rotY));
  // stainless frame + roof holding four sorted bins
  kit.box(1.98, 0.05, 0.5, 0, 0, 0, 'vc', '#8a9098', { bottom: true });
  for (const sx of [-1, 1]) post(kit, sx * 0.97, -0.2, 0, 1.12, 0.05, '#c9cdd2', 'metal');
  kit.box(2.06, 0.05, 0.56, 0, 1.12, 0, 'metal', '#c9cdd2', { bottom: true });
  kit.box(2.0, 0.12, 0.03, 0, 1.0, -0.23, 'metal', '#c9cdd2');
  kit.push(kit.mtx(0, 0, 0));
  recycleBins(kit, 0.05, ['burn', 'plastic', 'can', 'pet']);
  kit.pop();
  kit.collide(2.1, 0.6);
  kit.pop();
}

// ---------------------------------------------------------------------------
// PLAZA.east: public toilet, disaster cabinet, extinguisher, tanuki
// ---------------------------------------------------------------------------
function toilet(kit) {
  const s = PS();
  // front faces west (-X) towards the plaza
  const W = 4.4, D = 3.0, H = 2.75;
  const cx = 27.0, cz = -20.0;
  kit.push(kit.mtx(cx, s, cz, 0, -Math.PI / 2));
  const wall = '#ece8e0'; // light warm grey so the big wall recedes behind the plaza
  // walls (split so doorways read as openings)
  kit.box(W, 0.3, D, 0, 0, 0, 'vc', '#9aa0a6', { bottom: true }); // tiled plinth band
  kit.box(W - 0.02, H - 0.3, D - 0.02, 0, 0.3, -0.05, 'vc', wall, { bottom: true });
  // flat roof with overhang + fascia
  kit.box(W + 0.7, 0.16, D + 0.7, 0, H, 0.1, 'vc', '#dfe2e2', { bottom: true });
  kit.box(W + 0.72, 0.1, D + 0.72, 0, H + 0.16, 0.1, 'vc', '#7a8a9a', { bottom: true });
  // entrances: men (left), accessible (centre), women (right); privacy screens in front
  const tSign = kit.S('toilet');
  const fz = D / 2 - 0.05;
  const doors = [[-1.45, 'm'], [0, 'a'], [1.45, 'w']];
  for (const [x, k] of doors) {
    kit.box(0.9, 2.05, 0.06, x, 0.3, fz - 0.01, 'vc', '#4a5260', { bottom: true, no: true }); // dark opening
    if (k === 'a') {
      kit.box(0.95, 2.0, 0.05, x + 0.05, 0.3, fz + 0.03, 'vc', '#a9c3d6', { bottom: true }); // sliding door
      kit.box(0.03, 0.4, 0.04, x - 0.32, 1.1, fz + 0.07, 'metal', '#c9cdd3', { no: true });
    } else {
      // L-shaped privacy screen
      kit.box(1.2, 1.9, 0.08, x, 0.0, fz + 0.75, 'vc', wall, { bottom: true });
      kit.box(0.08, 1.9, 0.72, x + (k === 'm' ? -0.56 : 0.56), 0.0, fz + 0.38, 'vc', wall, { bottom: true });
    }
    // pictogram above each entrance (sub-region of the toilet sign atlas)
    const idx = k === 'm' ? 0 : k === 'w' ? 1 : 2;
    const cell = 108 / 512;
    const u0 = (10 + idx * 118) / 512;
    kit.plane(0.3, 0.3, x, 2.42, fz + 0.06, 'texS', '#ffffff', { region: { u0: tSign.u0 + u0 * (tSign.u1 - tSign.u0), u1: tSign.u0 + (u0 + cell) * (tSign.u1 - tSign.u0), v0: tSign.v0 + (8 / 128) * (tSign.v1 - tSign.v0), v1: tSign.v1 - (10 / 128) * (tSign.v1 - tSign.v0) } });
  }
  // name board on the fascia, lamp, vents, high louvred windows on the sides
  kit.plane(1.6, 0.4, 0, H + 0.08, D / 2 + 0.46, 'texS', '#ffffff', { region: tSign });
  kit.box(0.3, 0.06, 0.12, -0.75, H - 0.08, fz + 0.4, 'glow', '#fff1cc');
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      kit.box(0.04, 0.35, 0.8, sx * (W / 2), 2.05, -0.5 + i * 1.0, 'vc', '#7a8a9a');
      for (let k = 0; k < 4; k++) kit.box(0.05, 0.03, 0.74, sx * (W / 2 + 0.01), 1.92 + k * 0.08, -0.5 + i * 1.0, 'vc', '#c9ccd0', { no: true, cast: false });
    }
  }
  // hand-painted weathering (splash band, rain streaks) on the back and side walls
  const stains = kit.V('wallStains');
  const WH = H - 0.3, wy = 0.3 + WH / 2;
  kit.plane(W - 0.04, WH, 0, wy, -D / 2 - 0.046, 'texV', wall, { region: stains, ry: Math.PI });
  for (const sx of [-1, 1]) kit.plane(D - 0.04, WH, sx * (W / 2 - 0.004), wy, -0.05, 'texV', wall, { region: stains, ry: sx * Math.PI / 2, uvOpts: { flipU: sx < 0 } });
  // back wall (faces the crossing road): a children's mural in a thin frame + a downpipe
  const bz = -D / 2 - 0.05;
  kit.box(3.3, 1.22, 0.03, 0, 1.28, bz - 0.005, 'vc', '#e2ded4', { cast: false });
  kit.plane(3.2, 1.14, 0, 1.28, bz - 0.022, 'texV', '#ffffff', { region: kit.V('mural'), ry: Math.PI });
  kit.cyl(0.045, 0.045, H - 0.02, -W / 2 + 0.12, 0.02, bz - 0.06, 'metal', '#b9bec4', { seg: 8 });
  kit.box(0.12, 0.08, 0.12, -W / 2 + 0.12, H - 0.08, bz - 0.04, 'metal', '#b9bec4');
  kit.cyl(0.06, 0.06, 0.5, 1.4, H + 0.26, -0.8, 'metal', '#9aa1a8', { seg: 8 });
  kit.cyl(0.1, 0.1, 0.06, 1.4, H + 0.76, -0.8, 'metal', '#9aa1a8', { seg: 8 });
  // planter strip with weeds along the foot of the back wall + a garden tap and hose reel
  {
    const pz = bz - 0.14, rng = kit.ctx.rng(2718);
    kit.box(3.4, 0.22, 0.22, 0.35, 0, pz, 'texS', '#e4e2dc', { bottom: true, region: kit.S('stone') });
    kit.box(3.32, 0.04, 0.16, 0.35, 0.17, pz, 'vc', '#6e5a46', { bottom: true, cast: false, no: true });
    groundCover(kit, rng, -1.25, 1.95, pz - 0.06, pz + 0.06, 0.21, 22);
    for (let i = 0; i < 26; i++) {
      // grass / weed blades: open 3-sided cones
      const L = 0.12 + rng() * 0.2;
      const g = new THREE.CylinderGeometry(0, 0.015, L, 3, 1, true).translate(0, L / 2, 0);
      kit.add(g, 'vc2', LEAF[Math.floor(rng() * LEAF.length)], { ...FL, m: kit.mtx(-1.25 + rng() * 3.2, 0.2, pz + (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.6, rng() * 6, (rng() - 0.5) * 0.6) });
    }
    for (let i = 0; i < 5; i++) daisy(kit, -1.1 + rng() * 2.9, 0.2, pz + (rng() - 0.5) * 0.1, rng);
    // tap on a short riser pipe, green hose coiled on a wall reel
    kit.cyl(0.018, 0.018, 0.5, -1.9, 0, bz - 0.04, 'metal', '#b9bec4', { seg: 6 });
    kit.box(0.05, 0.05, 0.07, -1.9, 0.5, bz - 0.06, 'metal', '#c9a36a', { no: true });
    kit.cyl(0.13, 0.13, 0.08, -1.62, 0.62, bz - 0.06, 'vc', '#4f9a62', { rx: Math.PI / 2, center: true, seg: 14 });
    kit.cyl(0.06, 0.06, 0.1, -1.62, 0.62, bz - 0.06, 'vc', '#3a3e46', { rx: Math.PI / 2, center: true, seg: 8, no: true });
    kit.curveTube([[-1.62, 0.5, bz - 0.1], [-1.6, 0.2, bz - 0.2], [-1.75, 0.03, bz - 0.28], [-1.97, 0.03, bz - 0.2]], 0.012, 10, 'vc', '#4f9a62', { no: true, cast: false });
  }
  // outdoor hand-wash basin by the accessible door
  kit.box(0.5, 0.8, 0.4, 2.55, 0, 0.9, 'vc', '#c9ccc8', { bottom: true });
  kit.box(0.44, 0.06, 0.34, 2.55, 0.8, 0.9, 'vc', '#eef0f0', { bottom: true });
  kit.beam([2.55, 0.86, 0.8], [2.55, 0.98, 0.9], 0.012, 'metal', '#d0d4da', { no: true });
  kit.collide(W + 0.1, D + 0.1, 0, -0.05);
  kit.collide(W, 1.5, 0, D / 2 + 0.75);
  kit.pop();
}

function bousaiCabinet(kit) {
  const s = PS();
  kit.push(kit.mtx(27.7, s, -9.8, 0, -Math.PI / 2));
  const W = 1.8, H = 1.9, D = 0.9;
  const grey = '#cfd2cf';
  kit.box(W + 0.2, 0.12, D + 0.2, 0, 0, 0, 'vc', '#b9b6ae', { bottom: true });
  kit.box(W, H, D, 0, 0.12, 0, 'vc', grey, { bottom: true });
  kit.box(W + 0.08, 0.06, D + 0.1, 0, 0.12 + H, 0.02, 'vc', '#b9bcb9', { bottom: true });
  // double doors: seam, handles, louvres, sign plate
  kit.box(0.012, H - 0.12, 0.01, 0, 0.18, D / 2 + 0.003, 'vc', '#8a8e8a', { bottom: true, no: true, cast: false });
  for (const sx of [-1, 1]) {
    kit.box(0.03, 0.2, 0.04, sx * 0.08, 1.0, D / 2 + 0.02, 'metal', '#c9cdd3', { no: true });
    for (let k = 0; k < 5; k++) kit.box(0.5, 0.025, 0.02, sx * 0.45, 0.35 + k * 0.06, D / 2 + 0.01, 'vc', '#b0b4b0', { no: true, cast: false });
  }
  kit.plane(0.9, 0.45, 0, 1.55, D / 2 + 0.006, 'texS', '#ffffff', { region: kit.S('bousai') });
  kit.collide(W + 0.2, D + 0.2);
  kit.pop();
}

function extinguisherStand(kit, x, z, ry) {
  const s = PS();
  kit.push(kit.mtx(x, s, z, 0, ry));
  kit.box(0.34, 0.04, 0.3, 0, 0, 0, 'vc', '#8a9098', { bottom: true });
  post(kit, 0, -0.05, 0.04, 0.72, 0.05, '#d8433d', 'metal');
  kit.box(0.34, 0.62, 0.22, 0, 0.72, 0, 'vc', '#d8433d', { bottom: true });
  kit.sphere(0.17, 0, 1.34, 0, 'vc', '#d8433d', { ws: 12, hs: 4, thetaLen: Math.PI / 2, sx: 1, sy: 0.35, sz: 0.66 });
  kit.plane(0.26, 0.26, 0, 1.08, 0.112, 'texS', '#ffffff', { region: kit.S('extinguisher') });
  kit.box(0.2, 0.02, 0.02, 0, 0.82, 0.12, 'metal', '#c9cdd3', { no: true });
  kit.pop();
}

/** Tanuki statue (shigaraki-yaki style): straw hat, sake flask, big belly. */
export function tanuki(kit, x, y, z, ry, sc = 1) {
  kit.push(kit.mtx(x, y, z, 0, ry, 0, sc));
  const brown = '#8a6446', belly = '#e8d4b0', dark = '#4a3628';
  kit.cyl(0.26, 0.28, 0.08, 0, 0, 0, 'vc', '#9a9890', { seg: 14 });
  kit.sphere(0.25, 0, 0.36, 0, 'vc', brown, { sy: 1.1, ws: 14, hs: 10 });
  kit.sphere(0.2, 0, 0.32, 0.1, 'vc', belly, { sx: 1, sy: 1, sz: 0.75, ws: 12, hs: 8 });
  kit.sphere(0.16, 0, 0.72, 0.02, 'vc', brown, { ws: 12, hs: 8 });
  kit.sphere(0.07, 0, 0.69, 0.14, 'vc', belly, { ws: 10, hs: 6 });
  kit.sphere(0.022, 0, 0.7, 0.21, 'vc', dark, { ws: 6, hs: 4, no: true });
  for (const sx of [-1, 1]) {
    kit.sphere(0.038, sx * 0.07, 0.76, 0.12, 'vc', '#fbf6ec', { ws: 8, hs: 6, no: true });
    kit.sphere(0.02, sx * 0.07, 0.76, 0.15, 'vc', dark, { ws: 6, hs: 4, no: true });
    kit.sphere(0.05, sx * 0.11, 0.86, 0, 'vc', brown, { ws: 6, hs: 4, no: true });
    kit.sphere(0.08, sx * 0.14, 0.06, 0.12, 'vc', brown, { sy: 0.6, ws: 8, hs: 5 });
  }
  // straw hat hanging behind + sake flask in the left hand
  kit.cyl(0.2, 0.24, 0.05, 0, 0.9, -0.08, 'vc', '#c9a36a', { rx: -0.5, seg: 14 });
  kit.cyl(0.1, 0.02, 0.08, 0, 0.95, -0.06, 'vc', '#c9a36a', { rx: -0.5, seg: 10 });
  kit.lathe([[0, 0], [0.06, 0.01], [0.075, 0.08], [0.045, 0.14], [0.02, 0.17], [0.024, 0.19], [0, 0.19]], -0.24, 0.2, 0.08, 'vc', '#d9c89a', { seg: 10 });
  kit.sphere(0.06, 0.2, 0.44, 0.1, 'vc', brown, { ws: 8, hs: 6 });
  kit.pop();
}

// ---------------------------------------------------------------------------
export function buildPlaza(kit, clusterOf) {
  const rng = kit.ctx.rng(4711);
  const at = (x, z) => kit.cluster(clusterOf({ x, z }));

  at(PLAZA.grandTree.x, PLAZA.grandTree.z); roundBench(kit, rng);
  at(PLAZA.mapBoard.x, PLAZA.mapBoard.z); mapBoard(kit);
  at(PLAZA.touristBoard.x, PLAZA.touristBoard.z); touristBoard(kit);
  at(PLAZA.busStop.x, PLAZA.busStop.z); busStop(kit, rng);
  at(PLAZA.taxiSign.x, PLAZA.taxiSign.z); taxiSign(kit);
  at(PLAZA.mailbox.x, PLAZA.mailbox.z); postBox(kit);
  at(PLAZA.phoneBooth.x, PLAZA.phoneBooth.z); phoneBooth(kit);
  at(PLAZA.noticeBoard.x, PLAZA.noticeBoard.z); noticeBoard(kit);
  at(0, -3); flowerBeds(kit, rng);
  at(-10, 3); bollards(kit);
  for (const b of PLAZA.benches) {
    at(b.x, b.z);
    kit.push(kit.mtx(b.x, PS(), b.z, 0, b.rotY));
    slatBench(kit, rng, 1.8, 0.455, true);
    kit.collide(1.9, 0.6);
    kit.pop();
  }
  at(PLAZA.trashBins[0].x, PLAZA.trashBins[0].z); binStation(kit);
  // a short bench beside the V1 vending machine / bin station, covered in petals from the
  // sakura by the station's east corner
  kit.push(kit.mtx(12.1, PS(), -15.05, 0, 0.12));
  slatBench(kit, rng, 1.3, 0.44, false);
  petals(kit, rng, 70, -0.62, 0.62, -0.2, 0.2, 0.442);
  kit.collide(1.4, 0.6);
  kit.pop();
  // east strip
  at(25, -18);
  toilet(kit);
  bousaiCabinet(kit);
  extinguisherStand(kit, 23.1, -17.0, Math.PI / 2);
  tanuki(kit, 23.2, PS(), -22.0, 0.9, 1.0);
  // a second extinguisher by the station entrance side of the plaza
  at(-1, -14);
  extinguisherStand(kit, 6.9, -14.95, 0);
}
