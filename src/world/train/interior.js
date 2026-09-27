/**
 * Car interior seen through the windows / open doors: longitudinal bench
 * seats (pastel moquette, lavender priority seats), seat-end partitions,
 * stanchions, grab rails with hanging straps (吊革), luggage racks, ceiling
 * with warm light strips, cove advertisements, hanging posters (中吊り),
 * door-top information LCDs, the driver's cab and low-poly passengers.
 */
import * as THREE from 'three';
import { D, DOORS, CAB, xFront } from './dims.js';
import { COL } from './shell.js';
import { atlasPlane } from './parts.js';

const SEAT_W = 0.46;
const I = {
  seat: '#79aeb6', seatBack: '#6ea3ac', prio: '#9d93c6', prioBack: '#9087bb',
  base: '#b9bdc3', partition: '#e4e7eb', pole: '#d4d8dd', rail: '#c9ced4',
  strap: '#f4f2ec', strapPrio: '#f2b441', ceiling: '#f6f3ec', rack: '#b7bcc2',
};

/** Benches for a car kind: [{x0, n, prio}] (x0 = start x, n seats). */
export function benchesFor(kind) {
  const doors = DOORS[kind];
  const out = [];
  for (let i = 0; i < doors.length - 1; i++) {
    const mid = (doors[i] + doors[i + 1]) / 2;
    out.push({ x0: mid - (7 * SEAT_W) / 2, n: 7, prio: false });
  }
  // rear end (-x)
  const rearFree = doors[0] - D.doorHalf - 0.3 - (-D.bodyHalf + 0.1);
  const nr = Math.min(3, Math.floor(rearFree / SEAT_W));
  if (nr >= 2) out.push({ x0: -D.bodyHalf + 0.1, n: nr, prio: true });
  if (kind === 'mid') out.push({ x0: D.bodyHalf - 0.1 - 3 * SEAT_W, n: 3, prio: true });
  return out;
}

function bench(P, b, side, atlas) {
  const len = b.n * SEAT_W;
  const x1 = b.x0 + len;
  const s = side;
  const seatCol = b.prio ? I.prio : I.seat, backCol = b.prio ? I.prioBack : I.seatBack;
  // stainless base with a heater grille, cushions per seat, backrest pads
  P.box('inner', len, 0.3, 0.03, b.x0 + len / 2, 1.74, s * 0.86, I.base);
  P.box('innerNO', len - 0.2, 0.05, 0.012, b.x0 + len / 2, 1.68, s * 0.843, '#8e939a');
  P.box('inner', len, 0.08, 0.42, b.x0 + len / 2, 1.86, s * 1.07, '#9da2a8');
  for (let k = 0; k < b.n; k++) {
    const x = b.x0 + (k + 0.5) * SEAT_W;
    P.box('inner', SEAT_W - 0.02, 0.1, 0.5, x, 1.95, s * 1.02, seatCol);
    P.box('inner', SEAT_W - 0.02, 0.44, 0.09, x, 2.26, s * 1.225, backCol, s * 0.1, 0, 0);
  }
  // seat-end partitions (袖仕切り) with a stanchion at the inner edge
  for (const x of [b.x0 - 0.03, x1 + 0.03]) {
    P.box('inner', 0.04, 0.98, 0.52, x, 2.1, s * 1.02, I.partition);
    P.box('inner', 0.05, 0.05, 0.52, x, 2.61, s * 1.02, '#c9cdd3');
    P.cyl('innerMetal', 0.018, 0.018, D.ceilingY - D.floorY, x, (D.ceilingY + D.floorY) / 2, s * 0.74, I.pole, { seg: 6 });
  }
  if (b.n === 7) for (const k of [2, 5]) P.cyl('innerMetal', 0.016, 0.016, D.ceilingY - D.floorY, b.x0 + k * SEAT_W, (D.ceilingY + D.floorY) / 2, s * 0.8, I.pole, { seg: 6 });
  // luggage rack above the bench
  P.box('inner', len, 0.02, 0.28, b.x0 + len / 2, 3.47, s * 1.14, I.rack);
  P.box('innerMetal', len, 0.02, 0.02, b.x0 + len / 2, 3.45, s * 1.0, I.rail);
  // priority sticker on the window glass of priority seats
  void atlas;
}

function strapRow(P, x0, x1, side, prioRanges) {
  const ring = new THREE.TorusGeometry(0.048, 0.009, 3, 6);
  for (let x = x0; x <= x1; x += 0.36) {
    const prio = prioRanges.some(([a, b]) => x > a && x < b);
    const col = prio ? I.strapPrio : I.strap;
    P.add('innerNO', new THREE.PlaneGeometry(0.026, 0.2).rotateY(Math.PI / 2 * 0), col, new THREE.Matrix4().makeTranslation(x, 3.24, side * 0.9));
    P.add('innerNO', new THREE.PlaneGeometry(0.026, 0.2).rotateY(Math.PI), col, new THREE.Matrix4().makeTranslation(x, 3.24, side * 0.9));
    P.add('innerNO', ring.clone(), col, new THREE.Matrix4().makeTranslation(x, 3.1, side * 0.9));
  }
}

/** Interior for a car kind (car-local).  atlas: {r} regions. */
export function interior(P, kind, atlas) {
  const r = atlas.r;
  const xEnd = kind === 'cab' ? D.cabBack : D.bodyHalf - 0.08;
  const x0 = -D.bodyHalf + 0.08;
  const benches = benchesFor(kind);
  const prioRanges = benches.filter((b) => b.prio).map((b) => [b.x0 - 0.1, b.x0 + b.n * SEAT_W + 0.1]);
  for (const side of [1, -1]) {
    for (const b of benches) bench(P, b, side, atlas);
    // grab rail + brackets + straps
    P.cyl('innerMetal', 0.016, 0.016, xEnd - x0 - 0.4, (x0 + xEnd) / 2, 3.36, side * 0.9, I.rail, { axis: 'x', seg: 6 });
    for (let x = x0 + 0.5; x < xEnd - 0.2; x += 2.2) P.box('innerMetal', 0.03, 0.5, 0.03, x, 3.61, side * 0.9, I.rail);
    strapRow(P, x0 + 0.4, xEnd - 0.4, side, prioRanges);
    // cove panel (lining top -> ceiling), ceiling edge
    P.box('body', xEnd - x0, 0.02, 0.34, (x0 + xEnd) / 2, 3.74, side * 1.16, COL.lining, side * Math.PI / 4, 0, 0);
    // cove advertisements
    let k = 0;
    for (let x = x0 + 1.4; x < xEnd - 1.0; x += 2.6, k++) {
      const g = atlasPlane(0.62, 0.21, r[`ad${(k + (side > 0 ? 0 : 2)) % 5}`]);
      if (side > 0) { g.rotateY(Math.PI); g.rotateX(-Math.PI / 4); } else g.rotateX(Math.PI / 4);
      g.translate(x, 3.735, side * 1.145);
      P.add('decal', g);
    }
    // warm light strip
    const ls = atlasPlane(xEnd - x0 - 0.6, 0.1, r.light);
    ls.rotateX(Math.PI / 2);
    ls.translate((x0 + xEnd) / 2, D.ceilingY - 0.006, side * 0.62);
    P.add('led', ls);
    P.box('body', xEnd - x0 - 0.5, 0.02, 0.16, (x0 + xEnd) / 2, D.ceilingY - 0.012, side * 0.62, '#dcd8cf');
  }
  // ceiling & centre ventilation line
  P.box('body', xEnd - x0, 0.04, 2.1, (x0 + xEnd) / 2, D.ceilingY + 0.02, 0, I.ceiling);
  P.box('bodyNO', xEnd - x0 - 0.4, 0.01, 0.22, (x0 + xEnd) / 2, D.ceilingY - 0.003, 0, '#d9d6ce');
  // grab handles beside the doors
  for (const dx of DOORS[kind]) {
    for (const side of [1, -1]) {
      P.box('body', 0.58, 0.19, 0.05, dx, 3.53, side * (D.liningIn - 0.02), '#2a2f3a'); // LCD housing
      for (const e of [-1, 1]) P.box('innerMetal', 0.03, 0.9, 0.03, dx + e * (D.doorHalf + 0.06), 2.45, side * (D.liningIn - 0.05), I.pole);
    }
  }
  // hanging posters (中吊り) along the centre line
  for (let x = x0 + 3.0; x < xEnd - 2; x += 5.8) {
    P.box('innerMetal', 0.02, 0.02, 1.0, x, 3.83, 0, I.rail);
    for (const [zc, name] of [[-0.27, 'hang0'], [0.27, 'hang1']]) {
      const a = atlasPlane(0.46, 0.34, r[name]);
      a.rotateY(Math.PI / 2);
      a.translate(x + 0.004, 3.64, zc);
      P.add('innerDecal', a);
      const b = atlasPlane(0.46, 0.34, r[name === 'hang0' ? 'hang1' : 'hang0']);
      b.rotateY(-Math.PI / 2);
      b.translate(x - 0.004, 3.64, zc);
      P.add('innerDecal', b);
    }
  }
  // free space with a wall handrail at the cab end of cab cars
  if (kind === 'cab') {
    const fx0 = DOORS.cab[2] + D.doorHalf + 0.1;
    for (const side of [1, -1]) {
      P.cyl('innerMetal', 0.018, 0.018, D.cabBack - fx0 - 0.1, (fx0 + D.cabBack) / 2, 2.35, side * (D.liningIn - 0.06), I.pole, { axis: 'x', seg: 6 });
      P.box('inner', 0.5, 0.12, 0.12, (fx0 + D.cabBack) / 2, 1.61, side * 1.2, '#9aa0a8');
    }
    cabInterior(P, r);
  }
}

/** Door-top passenger information screens (per trainset: they show its destination). */
export function doorLCDs(P, kind, region) {
  for (const dx of DOORS[kind]) {
    for (const side of [1, -1]) {
      const lcd = atlasPlane(0.5, 0.15, region);
      if (side > 0) lcd.rotateY(Math.PI);
      lcd.translate(dx, 3.53, side * (D.liningIn - 0.047));
      P.add('led', lcd);
    }
  }
}

// ---------------------------------------------------------------------------
function cabInterior(P, r) {
  const xb = D.cabBack;
  // partition wall with a window and the cab door
  const sh = new THREE.Shape();
  sh.moveTo(-D.liningIn, D.floorY); sh.lineTo(D.liningIn, D.floorY); sh.lineTo(D.liningIn, D.ceilingY); sh.lineTo(-D.liningIn, D.ceilingY); sh.closePath();
  const hWin = new THREE.Path(); hWin.moveTo(0.25, 2.45); hWin.lineTo(1.05, 2.45); hWin.lineTo(1.05, 3.2); hWin.lineTo(0.25, 3.2); hWin.closePath();
  const hDoor = new THREE.Path(); hDoor.moveTo(-0.55, 2.5); hDoor.lineTo(-0.15, 2.5); hDoor.lineTo(-0.15, 3.2); hDoor.lineTo(-0.55, 3.2); hDoor.closePath();
  sh.holes.push(hWin, hDoor);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
  g.rotateY(-Math.PI / 2);
  g.translate(xb + 0.02, 0, 0);
  P.add('inner', g, COL.lining);
  // door outline & knob
  P.box('innerNO', 0.012, 1.9, 0.02, xb - 0.025, 2.5, -0.9, '#b9b2a4');
  P.box('innerNO', 0.012, 1.9, 0.02, xb - 0.025, 2.5, 0.1, '#b9b2a4');
  P.box('innerMetal', 0.03, 0.03, 0.12, xb - 0.04, 2.45, 0.02, '#c9ccd0');
  for (const [z0, z1] of [[0.25, 1.05], [-0.55, -0.15]]) {
    const gl = new THREE.PlaneGeometry(z1 - z0, 0.72);
    gl.rotateY(-Math.PI / 2);
    gl.translate(xb - 0.001, 2.83, (z0 + z1) / 2);
    P.add('glass', gl);
  }
  // cab floor, console, desk, instruments, controllers
  P.span('inner', xb + 0.03, 8.4, D.floorY, D.floorY + 0.08, -D.wallIn, D.wallIn, '#4a4e56');
  const deskX = xFront(2.3, 0) - 0.42;
  P.span('inner', deskX, xFront(2.0, 0) - 0.06, D.floorY, 2.22, -1.2, 1.2, '#50555e');
  P.box('inner', 0.5, 0.05, 2.3, deskX + 0.18, 2.28, 0, '#3b3e46', 0, 0, 0.22);
  for (const [z, w] of [[-0.62, 0.36], [-0.2, 0.2], [0.35, 0.5]]) {
    P.box('inner', 0.18, 0.12, w, deskX + 0.24, 2.36, z, '#2b2d33', 0, 0, 0.5);
    const lamp = atlasPlane(w * 0.8, 0.07, r.cabLamp);
    lamp.rotateY(Math.PI / 2);
    lamp.translate(deskX + 0.145, 2.36, z);
    P.add('led', lamp);
  }
  P.cyl('innerMetal', 0.015, 0.015, 0.2, deskX + 0.05, 2.36, -0.55, '#c9ccd0', { seg: 6, rz: 0.4 });
  P.box('inner', 0.05, 0.05, 0.22, deskX + 0.0, 2.45, -0.55, '#2d2f35');
  // driver's seat (left side: -z) and the roller blinds at the top of the windscreen
  P.cyl('inner', 0.05, 0.05, 0.4, deskX - 0.62, 1.82, -0.55, '#3a3d44', { seg: 8 });
  P.box('inner', 0.46, 0.1, 0.46, deskX - 0.62, 2.06, -0.55, '#4d5a78');
  P.box('inner', 0.1, 0.55, 0.46, deskX - 0.88, 2.38, -0.55, '#4d5a78', 0, 0, 0.12);
  for (const s of [1, -1]) {
    const z = s * 0.6;
    P.box('inner', 0.03, 0.14, 0.95, xFront(3.4, z) - 0.07, 3.36, z, '#6f7d73', 0, 0, 0.28);
  }
  // back of the destination display
  P.span('inner', xFront(3.8, 0) - 0.28, xFront(3.8, 0) - 0.05, 3.52, 3.84, -0.8, 0.8, '#3a3d44');
}

// ---------------------------------------------------------------------------
// passengers
// ---------------------------------------------------------------------------
const OUTFITS = [
  { top: '#3e4a6b', bottom: '#3a3f4d', hair: '#2c2a33' }, // school blazer
  { top: '#d8c7a6', bottom: '#5a5f6b', hair: '#5a3e32' }, // trench coat
  { top: '#eef0f2', bottom: '#3a3f4d', hair: '#2c2a33' }, // white shirt
  { top: '#e9b3c0', bottom: '#8a7a6a', hair: '#6b4a3a' }, // pink cardigan
  { top: '#8a9a6b', bottom: '#4a4f5a', hair: '#3a3036' },
  { top: '#a9c2dc', bottom: '#6b6f78', hair: '#2c2a33' },
  { top: '#5b6477', bottom: '#2f3440', hair: '#8a8585' }, // older man, grey hair
  { top: '#c8a2c8', bottom: '#5a5470', hair: '#d8d4d0' }, // old lady, white hair
];
const SKIN = ['#f3d6c4', '#efcdb8', '#f6dccb'];

/** Seated passenger at (x, z) facing across the aisle (towards -side). */
function seated(P, x, side, o, skin, rng) {
  const f = -side; // facing direction along z
  const zb = side * 1.18; // back against the backrest
  const Z = (d) => zb + f * d;
  const bucket = 'inner';
  const lean = rng() * 0.04;
  for (const k of [-1, 1]) {
    const lx = x + k * 0.1;
    P.capsule(bucket, 0.075, [lx, 2.06, Z(0.12)], [lx, 2.06, Z(0.46)], o.bottom);
    P.capsule(bucket, 0.06, [lx, 2.02, Z(0.5)], [lx, 1.66, Z(0.54)], o.bottom);
    P.box(bucket, 0.1, 0.07, 0.22, lx, 1.59, Z(0.6), '#4a3f3a');
  }
  P.capsule(bucket, 0.155, [x, 2.14, Z(0.1)], [x, 2.46, Z(0.08 + lean)], o.top, 7);
  P.sphere(bucket, 0.1, x, 2.72, Z(0.1 + lean), skin, 1, 1.05, 1, 7, 5);
  P.sphere(bucket, 0.108, x, 2.75, Z(0.07 + lean), o.hair, 1.02, 0.95, 1.02, 7, 5);
  const act = rng();
  for (const k of [-1, 1]) {
    const sx = x + k * 0.18;
    const hand = act < 0.5 ? [x + k * 0.06, 2.22, Z(0.36)] : [x + k * 0.1, 2.12, Z(0.4)];
    P.capsule(bucket, 0.048, [sx, 2.5, Z(0.08)], [sx + k * 0.02, 2.26, Z(0.2)], o.top);
    P.capsule(bucket, 0.042, [sx + k * 0.02, 2.26, Z(0.2)], hand, o.top);
  }
  if (act < 0.35) P.box(bucket, 0.08, 0.13, 0.015, x, 2.28, Z(0.38), '#2d3038', 0.5 * side, 0, 0); // phone
  else if (act < 0.55) P.box(bucket, 0.2, 0.03, 0.15, x, 2.2, Z(0.38), '#f2e6cf', 0, 0, 0); // book
  else if (act < 0.7) P.box(bucket, 0.36, 0.26, 0.14, x, 2.22, Z(0.36), rng() < 0.5 ? '#8a6446' : '#d24a3c'); // bag on lap
}

/** Standing passenger holding a strap, facing the windows of `side`. */
function standing(P, x, z, face, o, skin) {
  const bucket = 'inner';
  for (const k of [-1, 1]) {
    P.capsule(bucket, 0.07, [x + k * 0.09, 1.6, z], [x + k * 0.09, 2.38, z], o.bottom);
    P.box(bucket, 0.1, 0.07, 0.24, x + k * 0.09, 1.585, z + face * 0.05, '#40393a');
  }
  P.capsule(bucket, 0.16, [x, 2.5, z], [x, 2.92, z], o.top, 7);
  P.sphere(bucket, 0.1, x, 3.16, z, skin, 1, 1.05, 1, 7, 5);
  P.sphere(bucket, 0.108, x, 3.19, z - face * 0.03, o.hair, 1.02, 0.95, 1.02, 7, 5);
  P.capsule(bucket, 0.046, [x + 0.19, 2.98, z], [x + 0.22, 3.1, z + face * 0.08], o.top);
  P.capsule(bucket, 0.042, [x + 0.22, 3.1, z + face * 0.08], [x + 0.2, 3.14, face > 0 ? 0.9 : -0.9], o.top);
  P.capsule(bucket, 0.046, [x - 0.19, 2.98, z], [x - 0.2, 2.62, z + face * 0.04], o.top);
  P.box(bucket, 0.3, 0.34, 0.12, x - 0.26, 2.5, z, '#6b4a3a'); // shoulder bag
}

/** Passengers for one car instance.  seed varies per car; doorSide: -1/+1 local side of the platform. */
export function passengers(P, kind, rng, opts = {}) {
  const benches = benchesFor(kind);
  const density = opts.density ?? 0.3;
  for (const side of [1, -1]) {
    for (const b of benches) {
      for (let k = 0; k < b.n; k++) {
        if (rng() > density) continue;
        const o = b.prio && rng() < 0.6 ? OUTFITS[6 + (rng() < 0.5 ? 0 : 1)] : OUTFITS[Math.floor(rng() * 6)];
        seated(P, b.x0 + (k + 0.5) * SEAT_W, side, o, SKIN[Math.floor(rng() * 3)], rng);
      }
    }
  }
  const nStand = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < nStand; i++) {
    const dx = DOORS[kind][Math.floor(rng() * 3)] + (rng() < 0.5 ? -1 : 1) * (1.2 + rng() * 0.6);
    const face = rng() < 0.5 ? 1 : -1;
    standing(P, dx, face * 0.45, face, OUTFITS[Math.floor(rng() * 6)], SKIN[Math.floor(rng() * 3)]);
  }
  if (kind === 'cab' && opts.driver) {
    // driver in the cab: navy uniform & cap, seated facing +x
    const x = xFront(2.3, 0) - 0.42 - 0.6, z = -0.55;
    P.capsule('inner', 0.15, [x, 2.14, z], [x + 0.04, 2.5, z], '#2f3a55', 7);
    P.sphere('inner', 0.1, x + 0.06, 2.74, z, SKIN[0], 1, 1.05, 1, 7, 5);
    P.cyl('inner', 0.115, 0.11, 0.07, x + 0.05, 2.84, z, '#2b3350', { seg: 10 });
    P.box('inner', 0.12, 0.015, 0.2, x + 0.15, 2.81, z, '#1f2436');
    // simple anime face on the +x side of the head: eyes, brows, mouth, sideburns
    const fx = x + 0.06 + 0.094;
    for (const k of [-1, 1]) {
      P.sphere('innerNO', 0.016, fx, 2.745, z + k * 0.036, '#2e2630', 0.5, 1.35, 1, 6, 4);
      P.box('innerNO', 0.012, 0.009, 0.036, fx - 0.004, 2.778, z + k * 0.04, '#3a2c2a', 0, 0, 0);
      P.box('innerNO', 0.05, 0.06, 0.02, x + 0.07, 2.76, z + k * 0.095, '#3a2c2a'); // hair below the cap
    }
    P.box('innerNO', 0.01, 0.006, 0.03, fx - 0.006, 2.697, z, '#b8736e');
    for (const k of [-1, 1]) {
      P.capsule('inner', 0.07, [x, 2.06, z + k * 0.1], [x + 0.4, 2.08, z + k * 0.1], '#2f3a55');
      P.capsule('inner', 0.045, [x + 0.04, 2.48, z + k * 0.18], [x + 0.36, 2.4, z + k * 0.12], '#2f3a55');
      P.sphere('inner', 0.04, x + 0.4, 2.4, z + k * 0.1, '#ffffff', 1, 1, 1, 6, 4); // white gloves
    }
  }
}
