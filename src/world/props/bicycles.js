/**
 * props/bicycles.js — ママチャリ (city bicycles) and parking racks.
 *
 * A bike is generated part by part in its local frame (front = +Z, origin on
 * the ground midway between the axles) and merged with everything else, so
 * each can have its own frame colour and accessories without extra draw
 * calls: step-through frame, fork, swept-back bars with grips and bell, saddle,
 * tyres + rims + alpha spoke discs, fenders, chain guard, cranks + pedals, rear
 * carrier, rear stand, ring lock, dynamo lamp, reflector, and optionally a
 * front wire basket (with an anti-snatch cover), a rear or front child seat
 * and a child-seat rain cover.
 */
import * as THREE from 'three';
import { PLAZA, SPOTS, groundY } from '../../core/layout.js';
import { surfaceY } from './common.js';

const R = 0.335; // 26" wheel
const AX = 0.54; // axle z (front +, rear -)

export const FRAME_COLOURS = ['#f2f2ee', '#c9ccd0', '#2f3440', '#a8d5c0', '#f4b8c8', '#2f4a78', '#f0e2c0', '#c8433d', '#8fbde0', '#7a8a5a', '#8a5a3c', '#f2d45a'];
const SEAT_COLOURS = ['#2f3a55', '#e8dcc4', '#d8433d', '#6fae8e', '#f29bb4'];

/** Tyre + rim + spokes + hub at axle z. */
function wheel(kit, z) {
  kit.torus(R - 0.022, 0.022, 0, R, z, 'vc', '#2a2c30', { ry: Math.PI / 2, rs: 6, ts: 22 });
  kit.torus(R - 0.05, 0.009, 0, R, z, 'metal', '#d4d8dc', { ry: Math.PI / 2, rs: 4, ts: 22, no: true });
  kit.plane((R - 0.05) * 2, (R - 0.05) * 2, 0, R, z, 'texS2', '#ffffff', { ry: Math.PI / 2, region: kit.S('spokes') });
  kit.cyl(0.028, 0.028, 0.12, 0, R, z, 'metal', '#b9bec4', { rz: Math.PI / 2, center: true, seg: 8, no: true });
}

/** Fender arc over a wheel (from angle a0 to a1, measured from +Z towards +Y). */
function fender(kit, z, a0, a1, color) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([0, R + Math.sin(a) * (R + 0.03), z + Math.cos(a) * (R + 0.03)]);
  }
  kit.tube(pts, 0.03, 'metal', color, { seg: 5 });
}

/**
 * One bicycle in the current frame.
 * o: { frame, basket: 'wire'|'black'|null, cover, childSeat: 'rear'|'front'|null, seatColor, rainCover, fenderColor }
 */
export function bicycle(kit, o) {
  const frame = o.frame;
  const fcol = o.fenderColor || '#d4d8dc';
  wheel(kit, AX);
  wheel(kit, -AX);
  fender(kit, AX, 0.35, 2.35, fcol);
  fender(kit, -AX, 0.9, 2.9, fcol);

  // step-through main tube: head tube -> sweeping low -> bottom bracket
  const headTop = new THREE.Vector3(0, 0.9, 0.37);
  const headBot = new THREE.Vector3(0, 0.66, 0.42);
  const bb = new THREE.Vector3(0, 0.29, -0.02);
  kit.beam(headBot, headTop, 0.026, 'vc', frame, { seg: 8 });
  kit.curveTube([[0, 0.7, 0.4], [0, 0.52, 0.32], [0, 0.36, 0.16], [0, 0.3, 0.04], [0, 0.29, -0.02]], 0.024, 12, 'vc', frame, { seg: 7 });
  // second, thinner parallel tube (typical mamachari twin-lateral)
  kit.curveTube([[0, 0.8, 0.39], [0, 0.6, 0.28], [0, 0.45, 0.12], [0, 0.4, -0.02], [0, 0.44, -0.08]], 0.014, 10, 'vc', frame, { seg: 6 });
  // seat tube, chain & seat stays
  const seatTop = new THREE.Vector3(0, 0.78, -0.17);
  kit.beam(bb, seatTop, 0.022, 'vc', frame, { seg: 7 });
  for (const sx of [-1, 1]) {
    kit.beam([sx * 0.05, 0.29, -0.03], [sx * 0.06, R, -AX], 0.012, 'vc', frame, { seg: 5, no: true });
    kit.beam([sx * 0.03, 0.74, -0.16], [sx * 0.06, R, -AX], 0.011, 'vc', frame, { seg: 5, no: true });
  }
  // fork
  for (const sx of [-1, 1]) kit.curveTube([[sx * 0.035, 0.67, 0.42], [sx * 0.05, 0.52, 0.47], [sx * 0.058, R, AX]], 0.013, 5, 'vc', frame, { seg: 5, no: true });
  kit.box(0.1, 0.03, 0.05, 0, 0.66, 0.42, 'vc', frame, { rx: -0.35, no: true });

  // handlebar: stem + swept-back bar + grips + bell
  kit.beam(headTop, [0, 1.0, 0.34], 0.014, 'metal', '#c9cdd2', { seg: 6 });
  kit.curveTube([[-0.29, 0.98, 0.1], [-0.25, 1.0, 0.22], [-0.1, 1.01, 0.33], [0, 1.01, 0.34], [0.1, 1.01, 0.33], [0.25, 1.0, 0.22], [0.29, 0.98, 0.1]], 0.011, 14, 'metal', '#c9cdd2', { seg: 5, no: true });
  for (const sx of [-1, 1]) {
    kit.beam([sx * 0.29, 0.98, 0.1], [sx * 0.3, 0.975, 0.0], 0.017, 'vc', '#3a3430', { seg: 6, no: true });
    kit.beam([sx * 0.24, 1.01, 0.23], [sx * 0.3, 1.02, 0.17], 0.004, 'metal', '#9aa0a8', { seg: 3, no: true, cast: false }); // brake lever
  }
  kit.sphere(0.022, -0.2, 1.03, 0.26, 'metal', '#e2e5e8', { ws: 8, hs: 4, thetaLen: Math.PI / 2, no: true, cast: false });

  // saddle + post
  kit.beam(seatTop, [0, 0.86, -0.2], 0.012, 'metal', '#c9cdd2', { seg: 6, no: true });
  kit.rbox(0.19, 0.06, 0.27, 0.025, 0, 0.885, -0.22, 'vc', o.saddle || '#3a3430');
  for (const sx of [-1, 1]) kit.torus(0.025, 0.004, sx * 0.05, 0.84, -0.31, 'metal', '#b9bec4', { ry: Math.PI / 2, rs: 3, ts: 8, no: true, cast: false });

  // chain guard (drive side = +X), cranks, pedals
  kit.rbox(0.02, 0.1, 0.62, 0.01, 0.075, 0.31, -0.28, 'vc', o.guard || frame, { rx: 0.08 });
  kit.cyl(0.1, 0.1, 0.012, 0.075, 0.29, -0.02, 'vc', o.guard || frame, { rz: Math.PI / 2, center: true, seg: 14, no: true });
  for (const sx of [-1, 1]) {
    const a = sx > 0 ? 0.6 : 0.6 + Math.PI;
    const px = sx * 0.1, py = 0.29 + Math.sin(a) * 0.16, pz = -0.02 + Math.cos(a) * 0.16;
    kit.beam([sx * 0.09, 0.29, -0.02], [px, py, pz], 0.01, 'metal', '#b9bec4', { seg: 4, no: true });
    kit.box(0.1, 0.02, 0.06, sx * 0.15, py, pz, 'vc', '#2a2c30', { no: true });
  }

  // rear carrier + stand + lock + reflector
  const cy = 0.8;
  for (const sx of [-1, 1]) {
    kit.beam([sx * 0.07, cy, -0.3], [sx * 0.07, cy, -0.78], 0.008, 'metal', '#c9cdd2', { seg: 4, no: true });
    kit.beam([sx * 0.07, cy, -0.62], [sx * 0.065, R, -AX], 0.008, 'metal', '#c9cdd2', { seg: 4, no: true });
    kit.beam([sx * 0.065, R, -AX], [sx * 0.15, 0.0, -0.66], 0.011, 'metal', '#b9bec4', { seg: 4, no: true });
  }
  for (const z of [-0.36, -0.5, -0.64, -0.78]) kit.beam([-0.07, cy, z], [0.07, cy, z], 0.007, 'metal', '#c9cdd2', { seg: 4, no: true });
  kit.beam([-0.15, 0.01, -0.66], [0.15, 0.01, -0.66], 0.011, 'metal', '#b9bec4', { seg: 4, no: true });
  kit.box(0.03, 0.07, 0.12, 0.06, 0.5, -0.44, 'vc', o.lock || '#3a3e46', { rx: 0.5, no: true });
  kit.box(0.06, 0.04, 0.012, 0, 0.72, -0.82, 'glow', '#e8584a', { no: true });

  // dynamo lamp on the fork (or basket front later)
  kit.cyl(0.028, 0.03, 0.06, 0.08, 0.6, 0.48, 'vc', '#d9dde2', { rx: Math.PI / 2, center: true, seg: 8, no: true });
  kit.cyl(0.024, 0.024, 0.005, 0.08, 0.6, 0.512, 'glow', '#fff6d8', { rx: Math.PI / 2, center: true, seg: 8 });

  // ---- accessories ----
  if (o.childSeat === 'front') {
    childSeat(kit, 0, 1.02, 0.46, o.seatColor, 0.9, false);
  } else if (o.basket) {
    basket(kit, o.basket === 'black' ? 'basketDark' : 'basket', o.basket === 'black' ? '#3a3e44' : '#dfe2e4', o.cover);
  }
  if (o.childSeat === 'rear') {
    childSeat(kit, 0, cy + 0.02, -0.56, o.seatColor, 1, o.rainCover);
  }
}

/** Wire basket over the front wheel (+ optional anti-snatch cover). */
function basket(kit, region, rimColor, cover) {
  const bw = 0.36, bh = 0.25, bd = 0.28;
  const bx = 0, by = 0.78, bz = 0.66;
  kit.push(kit.mtx(bx, by, bz, -0.05, 0, 0));
  const S = kit.S(region);
  kit.plane(bw, bh, 0, bh / 2, bd / 2, 'texS2', '#ffffff', { region: S });
  kit.plane(bw, bh, 0, bh / 2, -bd / 2, 'texS2', '#ffffff', { region: S });
  kit.plane(bd, bh, bw / 2, bh / 2, 0, 'texS2', '#ffffff', { region: S, ry: Math.PI / 2 });
  kit.plane(bd, bh, -bw / 2, bh / 2, 0, 'texS2', '#ffffff', { region: S, ry: Math.PI / 2 });
  kit.plane(bw, bd, 0, 0.004, 0, 'texS2', '#ffffff', { region: S, rx: -Math.PI / 2 });
  // rim
  const r = [[-bw / 2, bh, -bd / 2], [bw / 2, bh, -bd / 2], [bw / 2, bh, bd / 2], [-bw / 2, bh, bd / 2], [-bw / 2, bh, -bd / 2]];
  kit.tube(r, 0.008, 'metal', rimColor, { seg: 4 });
  if (cover) {
    kit.rbox(bw + 0.03, 0.08, bd + 0.03, 0.035, 0, bh + 0.02, 0, 'vc', cover);
    kit.box(bw + 0.035, 0.035, 0.012, 0, bh - 0.02, bd / 2 + 0.017, 'vc', cover, { no: true });
  }
  kit.pop();
  // basket stays down to the fork
  kit.beam([-0.05, 0.78, 0.75], [-0.058, R, AX], 0.006, 'metal', '#c9cdd2', { seg: 3, no: true, cast: false });
  kit.beam([0.05, 0.78, 0.75], [0.058, R, AX], 0.006, 'metal', '#c9cdd2', { seg: 3, no: true, cast: false });
}

/** Plastic child seat (rear on the carrier or front on the bars) + optional rain cover. */
function childSeat(kit, x, y, z, color, scale, rainCover) {
  kit.push(kit.mtx(x, y, z, 0, 0, 0, scale));
  const s = z < 0 ? 1 : -1; // backrest towards the rear (or the rider for a front seat)
  kit.rbox(0.32, 0.07, 0.3, 0.03, 0, 0.04, 0, 'vc', color);
  kit.rbox(0.32, 0.42, 0.06, 0.03, 0, 0.25, -s * 0.15, 'vc', color, { rx: s * 0.12 });
  for (const sx of [-1, 1]) {
    kit.rbox(0.05, 0.2, 0.28, 0.02, sx * 0.16, 0.14, -s * 0.01, 'vc', color);
    kit.box(0.07, 0.02, 0.1, sx * 0.1, -0.18, s * 0.14, 'vc', '#3a3e46', { no: true });
    kit.beam([sx * 0.1, 0, s * 0.08], [sx * 0.1, -0.18, s * 0.14], 0.01, 'vc', '#3a3e46', { seg: 4, no: true });
  }
  kit.box(0.26, 0.02, 0.05, 0, 0.2, s * 0.14, 'vc', '#3a3e46', { no: true }); // safety bar
  if (rainCover) {
    // dome-shaped fabric cover with a clear front window
    kit.sphere(0.25, 0, 0.12, -s * 0.02, 'vc', rainCover, { sx: 0.95, sy: 1.25, sz: 1.2, ws: 12, hs: 8, thetaLen: Math.PI * 0.55 });
    kit.box(0.46, 0.06, 0.58, 0, 0.12, -s * 0.02, 'vc', rainCover);
    kit.plane(0.3, 0.18, 0, 0.3, s * 0.2, 'glass', '#ffffff', { rx: s * -0.5, ry: s > 0 ? 0 : Math.PI });
  }
  kit.pop();
}

/** Deterministic accessory mix for bike #i. */
export function bikeSpec(rng, i) {
  const frame = FRAME_COLOURS[(i * 5 + 3) % FRAME_COLOURS.length]; // gcd(5, 12) = 1: every colour, neighbours differ
  const r = rng();
  const o = { frame, basket: rng.chance(0.85) ? (rng.chance(0.25) ? 'black' : 'wire') : null };
  if (o.basket && rng.chance(0.25)) o.cover = rng.pick(['#2f3a55', '#3a3e46', '#6a4e3a', '#e98aa7']);
  if (r < 0.22) {
    o.childSeat = 'rear';
    o.seatColor = rng.pick(SEAT_COLOURS);
    if (rng.chance(0.55)) o.rainCover = rng.pick(['#3a4a6a', '#7a8a9a', '#c9a36a', '#5a7a6a']);
  } else if (r < 0.3) {
    o.childSeat = 'front';
    o.seatColor = rng.pick(SEAT_COLOURS);
  }
  o.saddle = rng.pick(['#3a3430', '#5a3a2a', '#2c2a33', '#6a5a4a']);
  o.lock = rng.pick(['#3a3e46', '#c9cdd3', '#d8433d']);
  o.fenderColor = rng.chance(0.3) ? frame : '#d4d8dc';
  return o;
}

/** Front-wheel rack segment (slot every `pitch` m along local X), origin at the rail centre. */
function rackRow(kit, len, pitch) {
  const n = Math.floor(len / pitch) + 1;
  kit.box(len + 0.1, 0.05, 0.06, 0, 0.025, 0, 'metal', '#8a9098');
  kit.box(len + 0.1, 0.03, 0.04, 0, 0.42, -0.02, 'metal', '#9aa1a8');
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + i * pitch;
    // U loop that clamps the front wheel
    for (const sx of [-1, 1]) kit.beam([x + sx * 0.05, 0.02, 0.04], [x + sx * 0.05, 0.42, -0.02], 0.012, 'metal', '#b9bec4', { seg: 5 });
    kit.box(0.14, 0.02, 0.2, x, 0.02, 0.12, 'metal', '#8a9098', { no: true, cast: false });
  }
}

/**
 * Plaza parking (two facing rows), east parking (under a roof) and the street
 * spots.  cluster(name) selects the kit cluster.
 */
export function buildBicycles(kit, clusterOf) {
  const rng = kit.ctx.rng(90210);
  let k = 0;
  const place = (x, z, ry, y, s) => {
    kit.push(kit.mtx(x, y + s, z, 0, ry));
    bicycle(kit, bikeSpec(rng, k++));
    kit.pop();
  };

  // ---- plaza bike parking: racks along the west and east edges of the area ----
  const B = PLAZA.bikeParking;
  const s0 = surfaceY((B.xMin + B.xMax) / 2, (B.zMin + B.zMax) / 2, 0);
  kit.cluster(clusterOf({ x: B.xMin, z: B.zMax }));
  const len = B.zMax - B.zMin - 0.6;
  const zc = (B.zMin + B.zMax) / 2;
  const pitch = 0.62;
  // rails run along z; the rack's local +Z (wheel side) faces into the parking
  kit.push(kit.mtx(B.xMin + 0.15, s0, zc, 0, Math.PI / 2)); rackRow(kit, len, pitch); kit.pop();
  kit.push(kit.mtx(B.xMax - 0.15, s0, zc, 0, -Math.PI / 2)); rackRow(kit, len, pitch); kit.pop();
  const nb = PLAZA.noticeBoard;
  const n = Math.floor(len / pitch) + 1;
  for (let i = 0; i < n; i++) {
    const z = zc - len / 2 + i * pitch;
    // west row (front wheel west, in the rack); leave the slots behind the notice board free
    if (Math.abs(z - nb.z) > 1.2 && rng() < 0.62) place(B.xMin + 0.15 + 0.62, z, -Math.PI / 2 + (rng() - 0.5) * 0.06, 0, s0);
    if (rng() < 0.5) place(B.xMax - 0.15 - 0.62, z, Math.PI / 2 + (rng() - 0.5) * 0.06, 0, s0);
  }
  // sign post at the south end of the parking + a 放置禁止 notice
  kit.push(kit.mtx(B.xMin + 3.9, s0, B.zMax + 0.35, 0, 0));
  kit.cyl(0.035, 0.035, 2.2, 0, 0, 0, 'metal', '#9aa1a8', { seg: 8 });
  kit.box(0.84, 0.44, 0.03, 0, 1.95, 0, 'vc', '#2f6fb8');
  kit.plane(0.8, 0.4, 0, 1.95, 0.017, 'texS', '#ffffff', { region: kit.S('bikeSign') });
  kit.plane(0.8, 0.4, 0, 1.95, -0.017, 'texS', '#ffffff', { region: kit.S('bikeSign'), ry: Math.PI });
  kit.box(0.5, 0.42, 0.02, 0, 1.3, 0.03, 'vc', '#ffffff');
  kit.plane(0.48, 0.4, 0, 1.3, 0.042, 'texS', '#ffffff', { region: kit.S('bikeNotice') });
  kit.pop();

  // ---- east parking (PLAZA.east) under a light shed roof ----
  const E = PLAZA.east;
  const sE = surfaceY(25, -8, 0);
  kit.cluster(clusterOf({ x: 25, z: -8 }));
  const ez0 = -14.6, ez1 = -3.2;
  const rackX = E.xMin + 2.55;
  kit.push(kit.mtx(rackX, sE, (ez0 + ez1) / 2, 0, -Math.PI / 2)); rackRow(kit, ez1 - ez0 - 0.4, 0.6); kit.pop();
  for (let z = ez0 + 0.2; z <= ez1 - 0.2; z += 0.6) {
    if (rng() < 0.6) place(rackX - 0.62, z, Math.PI / 2 + (rng() - 0.5) * 0.06, 0, sE);
  }
  // roof: posts on the east side, a gently sloped corrugated deck
  const rx0 = E.xMin + 0.1, rx1 = E.xMin + 3.2;
  for (let z = ez0; z <= ez1 + 0.01; z += (ez1 - ez0) / 3) {
    kit.box(0.1, 2.45, 0.1, rx1 - 0.15, sE, z, 'metal', '#c9ccc8', { bottom: true });
    kit.beam([rx1 - 0.15, sE + 2.0, z], [rx1 - 0.9, sE + 2.42, z], 0.03, 'metal', '#c9ccc8', { seg: 5 });
  }
  const deck = (y0, y1) => {
    const L = ez1 - ez0 + 0.6;
    const dx = rx1 - rx0, dy = y1 - y0;
    const ang = Math.atan2(dy, dx);
    const w = Math.hypot(dx, dy) + 0.2;
    kit.box(w, 0.04, L, (rx0 + rx1) / 2, (y0 + y1) / 2 + sE, (ez0 + ez1) / 2, 'vc', '#d6e6da', { rz: ang });
    for (let i = 0; i < 18; i++) kit.box(w, 0.025, 0.04, (rx0 + rx1) / 2, (y0 + y1) / 2 + sE + 0.03, ez0 - 0.3 + (i + 0.5) * (L / 18), 'vc', '#c3d9ca', { rz: ang, no: true });
  };
  deck(2.35, 2.5);
  kit.box(0.08, 0.12, ez1 - ez0 + 0.6, rx1 - 0.15, sE + 2.44, (ez0 + ez1) / 2, 'metal', '#c9ccc8');

  // ---- street: SPOTS.bicycles (on the shoulder, parked with the stand) ----
  for (const b of SPOTS.bicycles) {
    kit.cluster(clusterOf(b));
    const s = surfaceY(b.x, b.z, b.y);
    // pitch to the street slope
    const ahead = groundY(b.x + Math.sin(b.rotY) * 0.5, b.z + Math.cos(b.rotY) * 0.5) - groundY(b.x - Math.sin(b.rotY) * 0.5, b.z - Math.cos(b.rotY) * 0.5);
    kit.push(kit.mtx(b.x, b.y + s, b.z, -Math.atan2(ahead, 1.0), b.rotY));
    bicycle(kit, bikeSpec(rng, k++));
    kit.pop();
  }
}
