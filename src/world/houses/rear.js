/**
 * Back gardens of the north row (NR lots).  Their backs face the levee path,
 * the main walkable "quiet residential side" view, so each lot gets:
 *   - a rear boundary (block wall / mesh fence / hedge / lattice, by seed) at
 *     world z = REAR_Z, leaving a strip of verge before the levee foot, and
 *     short side returns from the rear boundary to the back corners
 *   - a concrete apron along the back wall (犬走り) and a gravel or lawn yard
 *   - one or two back-garden props: steel storage shed (物置), laundry stand
 *     (物干し) with laundry, vegetable planter, pot cluster, a shrub in the
 *     corner, a rear AC unit — never the same set twice in a row
 *
 * Lot-local coordinates (front = +z, so the back garden is at -z).
 */
import { pickW } from './plan.js';
import { mtx } from './batch.js';
import { hangLaundry } from './openings.js';
import { fenceRun, shrub, wallAC, LEAF } from './exterior.js';
import { shade } from '../../core/toon.js';
import { TERRAIN } from '../../core/layout.js';

/** World z of the rear boundary (the levee slope starts at TERRAIN.leveeSouthFoot). */
const REAR_Z = TERRAIN.leveeSouthFoot + 1.35;

const SHED_COLORS = ['#e6e1d3', '#c9d3c4', '#d8d2c2', '#b9c6cf', '#e9e4da'];

export function buildRearYard(B, P, D) {
  const lot = P.lot, r = P.r, W = P.W;
  const m = P.main;
  const backZ = m.z0; // back wall of the main block (the wing starts further forward)
  const zRear = Math.min(REAR_Z - lot.z, -P.D / 2 - 0.3);
  if (backZ - zRear < 1.2) return;
  const g = (x, z) => P.gy(x, z);
  const gy = Math.min(g(-W / 2, zRear), g(W / 2, zRear), g(0, backZ));

  // --- surfaces: concrete apron along the back wall, gravel / lawn beyond ---------
  const xa = m.x0 - 0.45, xb = (P.wing ? Math.max(P.wing.x1, m.x1) : m.x1) + 0.45;
  const apron = r.range(0.55, 0.8);
  const concrete = shade('#c4c1b9', ((P.seed >>> 4) % 7) * 0.008 - 0.024);
  B.box('solid', xa, gy - 0.25, backZ - apron, xb, gy + 0.035, backZ, concrete, { skip: 'yZ' });
  const ground = pickW(r, [['gravel', 3], ['lawn', 2], ['soil', 1]]);
  if (ground !== 'lawn') {
    const gc = ground === 'gravel' ? r.pick(['#c7c1b3', '#bdb7aa', '#cfc9bc']) : '#a58f73';
    B.box('solid', -W / 2 + 0.12, gy - 0.2, zRear + 0.12, W / 2 - 0.12, gy + 0.02, backZ - apron, gc, { skip: 'y' });
  }
  // stepping stones from the back door area to the garden
  if (ground !== 'soil') {
    const sx = r.range(-W / 4, W / 4);
    for (let z = backZ - apron - 0.35; z > zRear + 0.5; z -= 0.55) {
      B.stamp(D.tpl.stone, mtx(sx + (r() - 0.5) * 0.2, gy - 0.02, z, r() * 3, r.range(0.4, 0.5), 0.07, r.range(0.34, 0.42)), shade('#b3ada2', (r() - 0.5) * 0.06));
    }
  }

  // --- boundary: rear run + side returns ----------------------------------------------
  const k = parseInt(lot.id.slice(2), 10) || 0;
  const type = ['block', 'mesh', 'hedge', 'block', 'lattice', 'hedge', 'block', 'mesh'][(k * 3 + (lot.seed & 3)) % 8];
  const H = type === 'block' ? r.pick([1.0, 1.1, 1.2]) : type === 'hedge' ? r.range(0.95, 1.2) : r.range(0.95, 1.15);
  const fz = zRear + 0.08;
  fenceRun(B, P, D, -W / 2 + 0.05, W / 2 - 0.05, fz, 'x', type, H);
  // side returns (lattice / mesh sides are cheaper block walls: neighbours share them)
  const sideType = type === 'hedge' ? 'hedge' : 'block';
  const sideH = sideType === 'block' ? Math.min(H, 1.0) : H;
  for (const sx of [-1, 1]) fenceRun(B, P, D, fz + 0.1, backZ - 0.15, sx * (W / 2 - 0.08), 'z', sideType, sideH, true);

  // --- props: 1..2 of a lot-specific set, spread across x slots ----------------------
  const slots = [[-W / 2 + 0.4, -W / 6], [-W / 6, W / 6], [W / 6, W / 2 - 0.4]];
  const order = [0, 1, 2];
  for (let i = 2; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const kinds = [];
  const menu = [['shed', 3], ['laundry', 2.4], ['veg', 1.6], ['pots', 1.6], ['shrub', 1.4]];
  const n = r() < 0.55 ? 2 : 1;
  while (kinds.length < n) {
    const kd = pickW(r, menu);
    if (!kinds.includes(kd)) kinds.push(kd);
  }
  kinds.forEach((kd, i) => {
    const [s0, s1] = slots[order[i]];
    const depth = backZ - apron - zRear;
    if (kd === 'shed') shed(B, P, D, (s0 + s1) / 2, zRear + 0.2, gy, Math.min(1.9, s1 - s0 - 0.1));
    else if (kd === 'laundry') laundryStand(B, P, D, s0, s1, zRear + Math.min(1.4, depth * 0.55), gy);
    else if (kd === 'veg') vegBed(B, P, D, (s0 + s1) / 2, zRear + 0.75, gy, Math.min(1.8, s1 - s0 - 0.2));
    else if (kd === 'pots') {
      const c = r.int(2, 4);
      for (let j = 0; j < c; j++) D.pottedPlant(B, s0 + 0.3 + r() * Math.max(0.1, s1 - s0 - 0.6), gy + 0.035, backZ - apron * 0.5, r);
    } else shrub(B, D, (s0 + s1) / 2, gy, zRear + 0.7, r.range(0.5, 0.7), r, r.pick(LEAF));
  });
  // AC outdoor unit on the back wall of some houses (the front row puts them on the sides)
  if (r() < 0.45) wallAC(B, P, D, P.facade('main', 'back'), false);
}

/** 物置: steel storage shed against the rear boundary, doors facing the house. */
function shed(B, P, D, cx, z0, gy, w) {
  const r = P.r;
  if (w < 1.2) return;
  const d = 0.85, h = r.range(1.75, 1.95);
  const c = r.pick(SHED_COLORS);
  const x0 = cx - w / 2, x1 = cx + w / 2, z1 = z0 + d;
  // blocks + body
  for (const x of [x0 + 0.1, x1 - 0.3]) B.box('solid', x, gy - 0.05, z0 + 0.05, x + 0.2, gy + 0.1, z1 - 0.05, '#b9b6ae', { skip: 'y' });
  B.box('solid', x0, gy + 0.1, z0, x1, gy + h, z1, c, { skip: 'y', colors: { Z: shade(c, 0.02) } });
  // two sliding doors: frame lines + handles + vent slots
  const dc = shade(c, -0.08);
  B.box('small', x0 + 0.04, gy + 0.14, z1, x1 - 0.04, gy + 0.18, z1 + 0.015, dc);
  B.box('small', x0 + 0.04, gy + h - 0.14, z1, x1 - 0.04, gy + h - 0.1, z1 + 0.015, dc);
  B.box('small', cx - 0.015, gy + 0.18, z1, cx + 0.015, gy + h - 0.14, z1 + 0.02, dc);
  for (const hx of [cx - 0.12, cx + 0.08]) B.box('small', hx, gy + 0.9, z1, hx + 0.04, gy + 1.1, z1 + 0.03, '#6b7075');
  for (const vx of [x0 + 0.25, x1 - 0.45]) B.box('small', vx, gy + h - 0.45, z1, vx + 0.2, gy + h - 0.36, z1 + 0.012, shade(c, -0.18));
  // mono-pitch lid sloping down towards the back, with a drip edge
  const rc = r.pick(['#8a939c', '#6f8a7a', '#9a8a7a', '#7d8e9e']);
  B.hexa([[x0 - 0.06, gy + h + 0.04, z1 + 0.08], [x1 + 0.06, gy + h + 0.04, z1 + 0.08], [x1 + 0.06, gy + h - 0.06, z0 - 0.06], [x0 - 0.06, gy + h - 0.06, z0 - 0.06]],
    [[x0 - 0.06, gy + h - 0.01, z1 + 0.08], [x1 + 0.06, gy + h - 0.01, z1 + 0.08], [x1 + 0.06, gy + h - 0.11, z0 - 0.06], [x0 - 0.06, gy + h - 0.11, z0 - 0.06]],
    { top: { kind: 'solid', color: rc }, bottom: { kind: 'solid', color: shade(rc, -0.1) }, sides: [{ kind: 'solid', color: shade(rc, -0.05) }, { kind: 'solid', color: rc }, { kind: 'solid', color: rc }, { kind: 'solid', color: rc }] });
  B.shadowBox(x0, gy, z0, x1, gy + h + 0.05, z1);
  (P.solids ||= []).push({ x0, x1, z0, z1 });
  // a bucket or watering can beside it
  if (r() < 0.6) {
    const bx = x1 + 0.3, bz = z0 + 0.35;
    if (r() < 0.5) B.stamp(D.tpl.bucket, mtx(bx, gy, bz, 0, 1.1), r.pick(['#4f8fd0', '#e0564a', '#f2c230', '#6fbf8e']));
    else B.stamp(D.tpl.wateringCan, mtx(bx, gy, bz, r() * 6, 1), r.pick(['#6fbf8e', '#4f8fd0', '#f2a03a']));
  }
}

/** 物干し: two posts on concrete bases, a pole (竿) and a line of laundry. */
function laundryStand(B, P, D, s0, s1, z, gy) {
  const r = P.r;
  const len = Math.min(2.6, s1 - s0 + 0.9);
  const mid = (s0 + s1) / 2;
  const x0 = mid - len / 2, x1 = mid + len / 2;
  for (const x of [x0, x1]) {
    B.box('solid', x - 0.17, gy - 0.05, z - 0.17, x + 0.17, gy + 0.12, z + 0.17, '#b9b4aa');
    B.cyl('metal', [x, gy + 0.12, z], [x, gy + 1.9, z], 0.03, '#b9c4cc', 6);
    B.box('metal', x - 0.02, gy + 1.86, z - 0.3, x + 0.02, gy + 1.9, z + 0.3, '#b9c4cc');
  }
  B.shadowBox(x0 - 0.03, gy, z - 0.03, x0 + 0.03, gy + 1.9, z + 0.03);
  B.shadowBox(x1 - 0.03, gy, z - 0.03, x1 + 0.03, gy + 1.9, z + 0.03);
  const yP = gy + 1.92;
  B.cyl('small', [x0 - 0.12, yP, z + 0.22], [x1 + 0.12, yP, z + 0.22], 0.017, r.pick(['#9fc3d8', '#c9d3da', '#a9d3b8']), 6);
  if (r() < 0.8) hangLaundry(B, P, D, x0 + 0.12, x1 - 0.12, yP, z + 0.22, -1);
}

/** 家庭菜園: a low timber-edged bed with rows of greens and a few bamboo stakes. */
function vegBed(B, P, D, cx, zc, gy, w) {
  const r = P.r;
  if (w < 1.0) return;
  const d = 0.75;
  const wc = r.pick(['#8a6446', '#a07a55', '#b9b4aa']);
  const x0 = cx - w / 2, x1 = cx + w / 2;
  B.box('solid', x0, gy - 0.05, zc - d / 2, x1, gy + 0.22, zc + d / 2, wc, { skip: 'y' });
  B.box('solid', x0 + 0.06, gy + 0.1, zc - d / 2 + 0.06, x1 - 0.06, gy + 0.2, zc + d / 2 - 0.06, '#8a7258');
  for (const dz of [-0.16, 0.16]) {
    for (let x = x0 + 0.2; x < x1 - 0.15; x += 0.3) {
      B.stamp(D.tpl.blobsLow[Math.floor(r() * 4)], mtx(x, gy + 0.26, zc + dz, r() * 6, 0.14, 0.1, 0.14), shade(r.pick(LEAF), 0.05));
    }
  }
  if (r() < 0.6) {
    for (let x = x0 + 0.25; x < x1 - 0.2; x += 0.45) B.cyl('small', [x, gy + 0.2, zc], [x + 0.02, gy + 1.1, zc], 0.01, '#b8a878', 4, { caps: false });
  }
  B.shadowBox(x0, gy, zc - d / 2, x1, gy + 0.3, zc + d / 2);
}
