/**
 * Everything outside the shell: front walls / fences / hedges with a gate,
 * approach path, plants (hydrangea, small pine, nandina, bonsai, pots),
 * doorstep clutter (umbrella stand, watering can, broom, bucket, slippers,
 * parcel, newspaper, milk box, garbage box), side-wall services (AC outdoor
 * units with pipe covers, gas / electric meters, water heater, vent hoods,
 * drain pipes, water tap), the service-drop bracket or 引込柱 at lot.drop,
 * roof TV antennas / dishes, wind chimes and the garden patch around a
 * garden sakura.
 *
 * Coordinates are lot-local unless a facade frame is pushed.
 */
import * as THREE from 'three';
import { FOUND, STOREY, pickW, localOf } from './plan.js';
import { facadeMatrix } from './shell.js';
import { wallV, WALL_U_PERIOD } from './textures.js';
import { mtx } from './batch.js';
import { nameplate, intercom, decalQuad, hangLaundry } from './openings.js';
import { shade } from '../../core/toon.js';
import { SPOTS } from '../../core/layout.js';

// world positions other modules own near lot fronts (keep clear)
// (fences only avoid vending machines / mirrors; plants & props also avoid the jizo corner)
const RESERVED_FENCE = [
  ...SPOTS.vending.map((s) => ({ x: s.x, z: s.z, r: 1.3 })),
  ...SPOTS.mirrors.map((s) => ({ x: s.x, z: s.z, r: 0.6 })),
];
const RESERVED = [...RESERVED_FENCE, { x: SPOTS.jizo.x, z: SPOTS.jizo.z, r: 0.7 }];

// TV antennas in town all point at the same transmitter; BS dishes all face south-west
const TV_DIR = Math.atan2(0.6, -0.8); // world yaw of the boom direction (north-east-ish)
const BS_DIR = Math.atan2(-0.6, 0.8); // world yaw the dish faces (south-west)

export function buildExterior(B, P, D) {
  const lot = P.lot;
  P.claims = [];
  P.claim = (x, z, rr) => {
    if (P.claims.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + rr)) return false;
    const w = lot.toWorld(x, z);
    if (RESERVED.some((q) => Math.hypot(q.x - w.x, q.z - w.z) < q.r + rr)) return false;
    P.claims.push({ x, z, r: rr });
    return true;
  };
  // the porch area is taken
  if (D.porch) {
    const f = P.entry.facade;
    const [x, z] = f.toLocal((D.porch.u0 + D.porch.u1) / 2, D.porch.depth / 2);
    P.claims.push({ x, z, r: Math.max(0.6, (D.porch.u1 - D.porch.u0) / 2) });
  }

  serviceDrop(B, P, D);
  if (P.lod === 'full') for (const f of P.facades) facadeGrime(B, P, D, f);
  if (P.lod !== 'simple') {
    if (!P.apartment) frontYard(B, P, D);
    dogWalk(B, P);
    sideServices(B, P, D);
    if (lot.gardenTree) gardenPatch(B, P, D);
  } else {
    // back-row / lane filler houses: a couple of cheap signs of life
    const f = P.facade('main', P.r() < 0.5 ? 'left' : 'right');
    if (f && P.r() < 0.6) wallAC(B, P, D, f, lot.filler ? P.r() < 0.4 : true);
    if (lot.filler) laneFront(B, P, D);
  }
  roofTop(B, P, D);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const rectHit = (a, b) => a.u0 < b.u1 && a.u1 > b.u0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Find a free rect of size w x h on facade f within the y band and u range. */
function findSpot(P, f, w, h, y0, y1, uMin = 0.35, uMax = null, tries = 12) {
  uMax = uMax ?? f.L - 0.35;
  if (uMax - uMin < w) return null;
  for (let i = 0; i < tries; i++) {
    const u = uMin + P.r() * (uMax - uMin - w);
    const y = y0 + P.r() * Math.max(0, y1 - y0 - h);
    const rc = { u0: u, u1: u + w, y0: y, y1: y + h };
    const pad = { u0: rc.u0 - 0.12, u1: rc.u1 + 0.12, y0: rc.y0 - 0.1, y1: rc.y1 + 0.1 };
    if (f.openings.some((o) => rectHit(pad, o))) continue;
    if (f.occ.some((o) => rectHit(pad, o))) continue;
    f.occ.push(rc);
    return rc;
  }
  return null;
}

/** ground (lot-local y) at facade point (u, n) */
const fGround = (P, f, u, n = 0.2) => P.gy(...f.toLocal(u, n));

/** Weathering decals: moss at the wall foot, hairline cracks, eave stains (subtle, sparse). */
function facadeGrime(B, P, D, f) {
  const r = P.r;
  const q = (name, u0, y0, u1, y1, z = 0.006) => {
    const g = D.grime.uv(name);
    B.quad('grime', [u0, y0, z], [u1, y0, z], [u1, y1, z], [u0, y1, z], '#ffffff', [[g[0], g[1]], [g[2], g[1]], [g[2], g[3]], [g[0], g[3]]]);
  };
  B.push(facadeMatrix(f));
  const nm = r.int(0, 2);
  for (let i = 0; i < nm; i++) {
    const w = r.range(0.8, 2.2), u = r() * Math.max(0.1, f.L - w);
    const g = Math.min(fGround(P, f, u), fGround(P, f, u + w));
    q(r() < 0.5 ? 'moss0' : 'moss1', u, g - 0.05, u + w, FOUND + r.range(0.1, 0.35), 0.042);
  }
  if (r() < 0.35) {
    const u = 0.3 + r() * (f.L - 0.8);
    q(r() < 0.5 ? 'crack0' : 'crack1', u, FOUND - 0.3, u + 0.22, FOUND + 0.1, 0.03);
  }
  if (r() < 0.25) {
    const u = 0.3 + r() * (f.L - 1.0), y = FOUND + 0.3 + r() * (f.block.top - FOUND - 1.2);
    const cr = { u0: u, u1: u + 0.25, y0: y, y1: y + 0.35 };
    if (!f.openings.some((o) => rectHit(cr, o))) q(r() < 0.5 ? 'crack0' : 'crack1', u, y, u + 0.25, y + 0.35);
  }
  if (r() < 0.4) {
    const w = r.range(1.2, f.L * 0.6), u = r() * (f.L - w);
    q('stain', u, f.block.top - 0.9, u + w, f.block.top - 0.02);
  }
  B.pop();
}

// ---------------------------------------------------------------------------
// plants
// ---------------------------------------------------------------------------
const LEAF = ['#6f9a58', '#5f8a4f', '#7aa663', '#648f55', '#86ad6a'];

/** Potted plant of a random kind at (x, y, z) in the current frame. */
export function pottedPlant(B, D, x, y, z, r, kind = null) {
  const T = D.tpl;
  kind = kind || pickW(r, [['leafy', 3], ['flower', 2.5], ['hydrangea', 1.5], ['pine', 1], ['nandina', 1], ['herb', 1.5]]);
  const s = r.range(0.22, 0.34);
  const pot = pickW(r, [['terracotta', 3], ['glazed', 2], ['box', 1.2]]);
  const pc = pot === 'terracotta' ? r.pick(['#c9825a', '#b8764f', '#d49a70']) : pot === 'glazed' ? r.pick(['#4f7fa8', '#3f6a5a', '#7a5a8a', '#e9e5dc', '#2f3a55']) : r.pick(['#e9e5dc', '#6a4e3a', '#8a939c']);
  const tpl = pot === 'terracotta' ? T.potTerracotta : pot === 'glazed' ? T.potGlazed : T.potBox;
  B.stamp(tpl, mtx(x, y, z, r() * 6, s, s * r.range(0.8, 1.2), s), pot === 'terracotta' ? '#ffffff' : pc);
  const top = y + s * 0.95;
  plant(B, D, kind, x, top, z, s * 1.2, r);
}

/** Plant above soil at (x, y, z); size ~ radius. */
export function plant(B, D, kind, x, y, z, size, r) {
  const T = D.tpl;
  const blob = () => T.blobs[Math.floor(r() * T.blobs.length)];
  const green = r.pick(LEAF);
  switch (kind) {
    case 'flower': {
      B.stamp(blob(), mtx(x, y + size * 0.3, z, r() * 6, size * 0.8, size * 0.45, size * 0.8), green);
      const fc = r.pick(['#f29bb4', '#f7e39a', '#ffffff', '#c792d6', '#f28a6a', '#8fb8f0']);
      for (let i = 0; i < 6; i++) {
        const a = r() * 6.28, d = r() * size * 0.6;
        B.stamp(T.blobs[0], mtx(x + Math.cos(a) * d, y + size * 0.55 + r() * 0.05, z + Math.sin(a) * d, 0, size * 0.18), i % 2 ? fc : shade(fc, 0.06));
      }
      break;
    }
    case 'hydrangea': {
      B.stamp(blob(), mtx(x, y + size * 0.45, z, r() * 6, size, size * 0.75, size), shade(green, -0.03));
      if (size > 0.28) B.shadowBlob(x, y + size * 0.6, z, size, size * 0.6, size);
      const hc = r.pick(['#9db8e8', '#b9a3e3', '#f2b8cf', '#a7c7f2', '#d6c2f0']);
      for (let i = 0; i < 5; i++) {
        const a = r() * 6.28, d = size * (0.35 + r() * 0.45);
        B.stamp(T.blobs[i % 4], mtx(x + Math.cos(a) * d, y + size * (0.7 + r() * 0.35), z + Math.sin(a) * d, r() * 6, size * 0.34), i % 2 ? hc : shade(hc, 0.05, 1, 0.03));
      }
      break;
    }
    case 'pine': {
      // small trained pine (松): crooked trunk + flat pads
      const tc = '#6b4e3a';
      const h = size * 2.4;
      const p1 = [x, y, z], p2 = [x + size * 0.35, y + h * 0.45, z + size * 0.1], p3 = [x - size * 0.2, y + h * 0.85, z - size * 0.05];
      B.cyl('solid', p1, p2, size * 0.09, tc, 5, { r1: size * 0.07 });
      B.cyl('solid', p2, p3, size * 0.07, tc, 5, { r1: size * 0.05 });
      const pads = [[p2[0] + size * 0.45, p2[1] + size * 0.1, p2[2], 0.75], [p3[0], p3[1] + size * 0.15, p3[2], 0.85], [p2[0] - size * 0.5, p2[1] + size * 0.35, p2[2] + size * 0.1, 0.6]];
      for (const [px, py, pz, k] of pads) B.stamp(blob(), mtx(px, py, pz, r() * 6, size * k, size * 0.3 * k, size * 0.8 * k), r.pick(['#46704a', '#3f6444', '#4f7a50']));
      break;
    }
    case 'nandina': {
      // 南天: thin cane stems, small leaf clusters with red tips and berries
      for (let i = 0; i < 4; i++) {
        const sx = x + (r() - 0.5) * size * 0.4, sz = z + (r() - 0.5) * size * 0.4, h = size * (1.6 + r() * 1.2);
        B.cyl('small', [sx, y, sz], [sx, y + h, sz], 0.012, '#7a6a48', 4);
        B.stamp(blob(), mtx(sx, y + h, sz, r() * 6, size * 0.4, size * 0.3, size * 0.4), i % 2 ? '#7aa050' : '#b86a4a');
        if (i < 2) B.stamp(T.blobs[1], mtx(sx + 0.04, y + h * 0.82, sz + 0.03, 0, size * 0.12), '#d8433d');
      }
      break;
    }
    case 'herb': {
      for (let i = 0; i < 3; i++) B.stamp(blob(), mtx(x + (r() - 0.5) * size * 0.5, y + size * 0.25, z + (r() - 0.5) * size * 0.5, r() * 6, size * 0.45, size * 0.5, size * 0.45), shade(green, r() * 0.06));
      break;
    }
    case 'azalea': {
      shrub(B, D, x, y - size * 0.1, z, size * 0.9, r, '#5f8a4f');
      const fc = r.pick(['#f08bb0', '#e76f9a', '#f7b6cc', '#ffffff']);
      for (let i = 0; i < 7; i++) {
        const a = r() * 6.28, d = size * (0.4 + r() * 0.5);
        B.stamp(T.blobs[i % 4], mtx(x + Math.cos(a) * d, y + size * (0.5 + r() * 0.35), z + Math.sin(a) * d, 0, size * 0.22), fc);
      }
      break;
    }
    default: {
      // leafy foliage plant
      B.stamp(blob(), mtx(x, y + size * 0.5, z, r() * 6, size * 0.8, size * 0.8, size * 0.8), green);
      B.stamp(blob(), mtx(x + size * 0.25, y + size * 0.85, z - size * 0.1, r() * 6, size * 0.5), shade(green, 0.05));
    }
  }
}

function shrub(B, D, x, y, z, size, r, color) {
  // a cluster of smaller clumps reads as foliage rather than one smooth blob
  const T = D.tpl;
  if (size > 0.28) B.shadowBlob(x, y + size * 0.6, z, size * 0.95, size * 0.6, size * 0.95);
  const base = color || r.pick(LEAF);
  const n = size > 0.4 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.8, d = i === 0 ? 0 : size * r.range(0.35, 0.55);
    const s = size * (i === 0 ? 0.62 : r.range(0.42, 0.55));
    const h = i === 0 ? size * 0.75 : size * r.range(0.35, 0.6);
    B.stamp(T.blobs[Math.floor(r() * 4)], mtx(x + Math.cos(a) * d, y + h, z + Math.sin(a) * d, r() * 6, s, s * 0.85, s), shade(base, (i === 0 ? 0.03 : -0.02) + (r() - 0.5) * 0.04));
  }
}

// ---------------------------------------------------------------------------
// front yard
// ---------------------------------------------------------------------------
function frontYard(B, P, D) {
  const lot = P.lot, r = P.r;
  const W = P.W, Dp = P.D;
  const apron = (lot.setback ?? 0) + 0.15;
  const edgeZ = Dp / 2 + apron - 0.14; // keep clear of the road gutter
  const frontZ = P.main.z1;
  const strip = edgeZ - frontZ;
  const ef = P.entry.facade;
  const doorC = ef.toLocal((P.entry.u0 + P.entry.u1) / 2, 0)[0];
  const doorZ = ef.toLocal(0, 0)[1];
  P.yard = { edgeZ, frontZ, strip, doorC };

  // gate position (centred on the door) and an optional parking gap
  const gateW = P.trad ? 1.5 : r.range(1.0, 1.3);
  const gate = [doorC - gateW / 2, doorC + gateW / 2];
  let parking = null;
  if (P.massing === 'yard' && strip > 3.0) {
    const left = doorC > 0;
    parking = left ? [-W / 2 + 0.3, -W / 2 + 3.0] : [W / 2 - 3.0, W / 2 - 0.3];
    if (parking[1] > gate[0] - 0.3 && parking[0] < gate[1] + 0.3) parking = null;
  }
  const hasFence = strip > 0.85 && P.fence !== 'none';

  // approach path from the street edge to the porch
  const porchEnd = doorZ + (D.porch ? D.porch.depth + (D.porch.top - FOUND > -0.05 ? 0.3 : 0.6) : 0.6);
  if (edgeZ - porchEnd > 0.3) {
    const pathC = shade(P.trad ? '#b9b4aa' : '#c9c3b6', 0);
    if (P.trad || r() < 0.4) {
      // stepping stones
      for (let z = porchEnd + 0.25; z < edgeZ - 0.1; z += 0.5) {
        const g = P.gy(doorC, z);
        B.stamp(D.tpl.stone, mtx(doorC + (r() - 0.5) * 0.15, g - 0.02, z, r() * 3, r.range(0.42, 0.52), 0.06, r.range(0.36, 0.44)), shade(pathC, (r() - 0.5) * 0.06));
      }
    } else {
      const g = Math.min(P.gy(doorC, porchEnd), P.gy(doorC, edgeZ));
      const uv = (fid, p) => [p[0] / WALL_U_PERIOD, wallV('tile', 1.2 + p[2] * 0.5)];
      B.box('wall', doorC - 0.55, g - 0.2, porchEnd, doorC + 0.55, g + 0.03, edgeZ - 0.02, pathC, { uv, skip: 'y' });
    }
    P.claims.push({ x: doorC, z: (porchEnd + edgeZ) / 2, r: 0.55 });
    for (let z = porchEnd; z < edgeZ; z += 0.8) P.claims.push({ x: doorC, z, r: 0.5 });
  }
  if (parking) {
    const g = Math.min(P.gy(parking[0], edgeZ), P.gy(parking[1], edgeZ));
    B.box('solid', parking[0], g - 0.2, frontZ + 0.1, parking[1], g + 0.03, edgeZ - 0.02, '#bebbb4', { skip: 'y' });
    // expansion joints
    for (let z = frontZ + 1.6; z < edgeZ - 0.3; z += 1.6) B.box('small', parking[0], g + 0.03, z, parking[1], g + 0.035, z + 0.03, '#a9a69f');
    B.box('solid', (parking[0] + parking[1]) / 2 - 0.9, g + 0.03, frontZ + 0.8, (parking[0] + parking[1]) / 2 - 0.3, g + 0.13, frontZ + 0.95, '#d9d6cf');
    B.box('solid', (parking[0] + parking[1]) / 2 + 0.3, g + 0.03, frontZ + 0.8, (parking[0] + parking[1]) / 2 + 0.9, g + 0.13, frontZ + 0.95, '#d9d6cf');
    P.claims.push({ x: (parking[0] + parking[1]) / 2, z: (frontZ + edgeZ) / 2, r: 1.4 });
  }

  if (hasFence) {
    const fz = edgeZ - 0.08;
    const segs = [];
    const gaps = [gate, parking].filter(Boolean).sort((a, b) => a[0] - b[0]);
    let x = -W / 2 + 0.05;
    for (const g of gaps) { if (g[0] - x > 0.2) segs.push([x, g[0]]); x = g[1]; }
    if (W / 2 - 0.05 - x > 0.2) segs.push([x, W / 2 - 0.05]);
    // extend across the garden-tree side (not for the hero tree: that corner stays open)
    if (lot.gardenTree && !lot.gardenTree.hero && P.treeLocal && Math.abs(P.treeLocal.z - fz) < 4.5) {
      const sx = Math.sign(P.treeLocal.x);
      const ext = Math.min(3.8, Math.abs(P.treeLocal.x) - W / 2 + 1.6);
      if (sx > 0) segs.push([W / 2 - 0.05, W / 2 + ext]);
      else segs.push([-W / 2 - ext, -W / 2 + 0.05]);
    }
    for (const [a, b] of segs) fenceRun(B, P, D, a, b, fz, 'x');
    // short returns along the lot sides back to the house front
    if (strip > 1.3) {
      for (const sx of [-1, 1]) {
        if (lot.gardenTree && P.treeLocal && Math.sign(P.treeLocal.x) === sx) continue;
        fenceRun(B, P, D, frontZ + 0.2, fz - 0.06, sx * (W / 2 - 0.1), 'z');
      }
    }
    // gate posts
    if (P.fence !== 'hedge' || r() < 0.5) gatePosts(B, P, D, gate, fz);
    for (let xx = -W / 2; xx < W / 2; xx += 0.7) P.claims.push({ x: xx, z: fz, r: 0.18 });
  }

  // plants: shrubs inside the fence line, pots by the door
  const plantsZ0 = frontZ + 0.35, plantsZ1 = edgeZ - (hasFence ? 0.35 : 0.1);
  if (plantsZ1 - plantsZ0 > 0.25) {
    let n = Math.round((W / 3) * (P.trad ? 1.4 : 1)) + (strip > 2 ? 2 : 0);
    if (P.lod === 'reduced') n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const px = -W / 2 + 0.5 + r() * (W - 1.0);
      const pz = plantsZ0 + r() * (plantsZ1 - plantsZ0);
      const sz = Math.min(0.55, (plantsZ1 - plantsZ0) * 0.5 + 0.15) * r.range(0.7, 1.1);
      if (!P.claim(px, pz, sz * 0.8)) continue;
      const g = P.gy(px, pz);
      const kind = pickW(r, [['shrub', 3], ['hydrangea', 2], ['pine', P.trad ? 2 : 0.5], ['nandina', 1.2], ['azalea', 1.5]]);
      if (kind === 'shrub') shrub(B, D, px, g, pz, sz, r);
      else plant(B, D, kind, px, g, pz, sz * (kind === 'pine' ? 0.7 : 1), r);
    }
  }
  if (P.lod === 'full') doorstep(B, P, D, hasFence, gate);
  else if (D.porch) {
    // far houses: just a pot or two by the door
    const f = P.entry.facade;
    B.push(facadeMatrix(f));
    const u = D.porch.u1 + 0.35;
    if (u < f.L - 0.3) pottedPlant(B, D, u, fGround(P, f, u, 0.3), 0.3, r);
    B.pop();
  }
}

/**
 * 犬走り: a narrow concrete apron along the back and sides of the house so the
 * wall base meets something harder than lawn.  Follows the ground slope.
 */
function dogWalk(B, P) {
  const w = 0.45;
  const c = shade('#c4c1b9', ((P.seed >>> 4) % 7) * 0.008 - 0.024);
  const strip = (x0, z0, x1, z1, open) => {
    const g = (x, z) => P.gy(x, z);
    const t = [[x0, g(x0, z1) + 0.035, z1], [x1, g(x1, z1) + 0.035, z1], [x1, g(x1, z0) + 0.035, z0], [x0, g(x0, z0) + 0.035, z0]];
    const bt = t.map((p) => [p[0], p[1] - 0.25, p[2]]);
    const F = { kind: 'solid', color: c }, E = { kind: 'solid', color: shade(c, -0.06) };
    // sides: 0 = +z edge, 1 = +x edge, 2 = -z edge, 3 = -x edge; `open` lists edges against a wall
    B.hexa(t, bt, { top: F, bottom: null, sides: [0, 1, 2, 3].map((i) => (open.includes(i) ? null : E)) });
  };
  const m = P.main;
  if (P.lot.street !== 'north') strip(m.x0 - w, m.z0 - w, m.x1 + w, m.z0, [0]); // (north row: rear.js paves the back garden)
  strip(m.x0 - w, m.z0 - (P.lot.street === 'north' ? 0 : w), m.x0, m.z1, [1]);
  const right = P.wing ? P.wing : m;
  strip(right.x1, right.z0 - (P.lot.street === 'north' ? 0 : w), right.x1 + w, right.z1, [3]);
}

/**
 * Lane-side front of a filler lot: a low block wall, hedge or mesh fence along
 * the lane edge with a gap at the door, a step, and maybe a pot or bin.
 * Budget: well under 200 triangles.
 */
function laneFront(B, P, D) {
  const lot = P.lot, r = P.r, W = P.W;
  const edgeZ = P.D / 2 + (lot.setback ?? 0) + 0.01;
  const fz = edgeZ - 0.08;
  const f = P.entry.facade;
  const doorC = f.toLocal((P.entry.u0 + P.entry.u1) / 2, 0)[0];
  const doorZ = f.toLocal(0, 0)[1];
  // entrance step
  const g = P.gy(doorC, doorZ + 0.3);
  B.box('solid', doorC - 0.6, g - 0.2, doorZ, doorC + 0.6, FOUND - 0.2, doorZ + 0.4, shade(P.found, 0.04), { skip: 'yz' });
  const type = pickW(r, [['block', 4], ['hedge', 2.5], ['mesh', 1.2], ['none', 2]]);
  if (type !== 'none') {
    const H = type === 'block' ? r.pick([0.7, 0.9, 1.0]) : type === 'hedge' ? r.range(0.75, 0.95) : 0.85;
    const runs = [[-W / 2 + 0.05, doorC - 0.65], [doorC + 0.65, W / 2 - 0.05]];
    for (const [a, b] of runs) if (b - a > 0.4) fenceRun(B, P, D, a, b, fz, 'x', type, H, true);
  }
  // one small sign of life by the door
  const side = r() < 0.5 ? -1 : 1;
  const px = doorC + side * r.range(0.75, 1.1);
  const pz = doorZ + 0.28;
  if (Math.abs(px) < W / 2 - 0.3) {
    const k = r();
    const gp = P.gy(px, pz);
    if (k < 0.45) {
      const s = r.range(0.22, 0.3);
      B.stamp(D.tpl.potLow, mtx(px, gp, pz, r() * 0.4, s), r.pick(['#c9825a', '#8a939c', '#e9e5dc', '#4f7fa8']));
      B.stamp(D.tpl.blobsLow[Math.floor(r() * 4)], mtx(px, gp + s + s * 0.55, pz, r() * 6, s * 1.25, s * 0.9, s * 1.25), r.pick(LEAF));
    } else if (k < 0.62) {
      B.stamp(D.tpl.bucket, mtx(px, gp, pz, 0, 1.1), r.pick(['#4f8fd0', '#e0564a', '#f2c230', '#6fbf8e']));
    } else if (k < 0.72) {
      B.stamp(D.tpl.garbageBox, mtx(px, gp, pz + 0.05, 0, 0.9), r.pick(['#6fa37a', '#8a939c', '#5f7f9f']));
    }
  }
}

/** One straight run of fence between a..b at `c` (axis 'x': runs along x at z=c; 'z': along z at x=c). */
function fenceRun(B, P, D, a, b, c, axis, type = P.fence, H = P.fenceH, cheap = false) {
  const r = P.r;
  const len = b - a;
  if (len < 0.15) return;
  const n = Math.max(1, Math.ceil(len / 1.8));
  // world check against reserved spots
  for (let i = 0; i < n; i++) {
    const s0 = a + (len * i) / n, s1 = a + (len * (i + 1)) / n;
    const pt = (s) => (axis === 'x' ? [s, c] : [c, s]);
    const [mx, mz] = pt((s0 + s1) / 2);
    const w = P.lot.toWorld(mx, mz);
    if (RESERVED_FENCE.some((q) => Math.hypot(q.x - w.x, q.z - w.z) < q.r + 0.5)) continue;
    const g = Math.min(P.gy(...pt(s0)), P.gy(...pt(s1)));
    const box = (kind, sA, sB, y0, y1, t0, t1, col, opts) => {
      if (axis === 'x') B.box(kind, sA, y0, c + t0, sB, y1, c + t1, col, opts);
      else B.box(kind, c + t0, y0, sA, c + t1, y1, sB, col, opts);
    };
    const blockUV = (fid, p) => [(axis === 'x' ? p[0] : p[2]) / WALL_U_PERIOD + (fid === 'x' || fid === 'X' ? p[2] : 0), wallV('block', p[1] - g + 0.02)];
    // shadow proxy: the solid part of the run (lattice / mesh infill lets the light through)
    const shadowTop = type === 'block' ? H + 0.05 : type === 'hedge' ? H - 0.05 : type === 'mesh' ? 0.25 : 0.3;
    if (axis === 'x') B.shadowBox(s0, g - 0.2, c - 0.07, s1, g + shadowTop, c + 0.07);
    else B.shadowBox(c - 0.07, g - 0.2, s0, c + 0.07, g + shadowTop, s1);
    if (type === 'block') {
      box('wall', s0, s1, g - 0.2, g + H, -0.07, 0.07, P.blockColor, { uv: blockUV });
      box('solid', s0 - 0.01, s1 + 0.01, g + H, g + H + 0.05, -0.09, 0.09, '#bdbab3');
      // decorative openwork row on some walls
      if (P.openwork && !cheap && s1 - s0 > 1.2) {
        for (let s = s0 + 0.3; s < s1 - 0.4; s += 0.4) box('unlit', s, s + 0.3, g + H - 0.35, g + H - 0.15, -0.071, 0.071, '#8f8c86');
      }
    } else if (type === 'lattice') {
      box('wall', s0, s1, g - 0.2, g + 0.3, -0.07, 0.07, P.blockColor, { uv: blockUV });
      const wc = P.latticeColor;
      box('solid', s0, s0 + 0.08, g + 0.3, g + H + 0.3, -0.04, 0.04, shade(wc, -0.08));
      box('solid', s0, s1, g + H + 0.25, g + H + 0.31, -0.035, 0.035, wc);
      box('solid', s0, s1, g + 0.4, g + 0.46, -0.02, 0.03, wc);
      for (let s = s0 + 0.12; s < s1 - 0.04; s += 0.11) box('solid', s, s + 0.07, g + 0.32, g + H + 0.25, -0.012, 0.012, i % 2 ? wc : shade(wc, 0.03), { skip: 'y' });
    } else if (type === 'mesh') {
      box('wall', s0, s1, g - 0.2, g + 0.25, -0.07, 0.07, P.blockColor, { uv: blockUV });
      const mc = P.meshColor;
      box('metal', s0, s0 + 0.05, g + 0.25, g + H + 0.25, -0.025, 0.025, mc);
      box('metal', s0, s1, g + H + 0.2, g + H + 0.25, -0.02, 0.02, mc);
      box('small', s0, s1, g + 0.27, g + 0.3, -0.015, 0.015, mc);
      const uv = D.decal.uv('mesh');
      const k = Math.max(1, Math.round((s1 - s0) / 1.0));
      for (let j = 0; j < k; j++) {
        const q0 = s0 + ((s1 - s0) * j) / k, q1 = s0 + ((s1 - s0) * (j + 1)) / k;
        const P0 = axis === 'x' ? [q0, g + 0.3, c] : [c, g + 0.3, q0];
        const P1 = axis === 'x' ? [q1, g + 0.3, c] : [c, g + 0.3, q1];
        const P2 = axis === 'x' ? [q1, g + H + 0.2, c] : [c, g + H + 0.2, q1];
        const P3 = axis === 'x' ? [q0, g + H + 0.2, c] : [c, g + H + 0.2, q0];
        B.quad('decal', P0, P1, P2, P3, mc, [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
      }
    } else if (type === 'hedge') {
      // trimmed hedge (生垣): a leafy core with a soft, lumpy crown on a stone curb
      box('solid', s0, s1, g - 0.2, g + 0.12, -0.26, 0.26, '#b9b4aa');
      const hc = P.hedgeColor;
      box('leaf', s0 + 0.04, s1 - 0.04, g + 0.1, g + H - 0.16, -0.2, 0.2, shade(hc, -0.05), { skip: 'y' });
      // lumpy crown: low-poly clumps (the hedge is long, so each clump stays cheap)
      const step = cheap ? 0.5 : 0.34;
      for (let s = s0 + 0.16; s < s1 - 0.08; s += step) {
        const [hx, hz] = pt(s + (r() - 0.5) * 0.06);
        B.stamp(D.tpl.blobsLow[Math.floor(r() * 4)], mtx(hx, g + H - 0.2 + r() * 0.04, hz, r() * 6, 0.27, 0.17, 0.26), shade(hc, (r() - 0.5) * 0.06));
      }
    }
    if (type !== 'hedge' && type !== 'block' && i === n - 1) {
      // end post
      box('solid', s1 - 0.08, s1, g + 0.25, g + H + 0.3, -0.04, 0.04, type === 'lattice' ? shade(P.latticeColor, -0.08) : P.meshColor);
    }
  }
}

function gatePosts(B, P, D, gate, fz) {
  const r = P.r;
  const H = P.fenceH + 0.35;
  const pc = P.postColor;
  const tex = P.fence === 'block' && r() < 0.5;
  for (const [i, x] of [[0, gate[0] - 0.2], [1, gate[1] + 0.2]]) {
    const g = P.gy(x, fz);
    if (!P.claim(x, fz, 0.42)) {
      if (i === 0) P.gatePost = null;
      continue;
    }
    const uv = (fid, p) => [(p[0] + p[2]) / WALL_U_PERIOD, wallV(tex ? 'tile' : 'plaster', p[1] - g + 0.4)];
    B.box('wall', x - 0.2, g - 0.2, fz - 0.2, x + 0.2, g + H, fz + 0.2, pc, { uv });
    B.shadowBox(x - 0.2, g - 0.2, fz - 0.2, x + 0.2, g + H + 0.06, fz + 0.2);
    B.box('solid', x - 0.23, g + H, fz - 0.23, x + 0.23, g + H + 0.06, fz + 0.23, shade(pc, -0.1));
    if (i === 0) {
      // name plate, intercom, mailbox slot on the street face
      B.pushT(x, 0, fz + 0.2, 0);
      nameplate(B, P, D, 0, g + H - 0.3, 0.004);
      intercom(B, D, 0, g + H - 0.58, 0.004);
      if (r() < 0.4) decalQuad(B, D, `addr${P.addrIdx}`, 0, g + 0.35, 0.006, 0.28, 0.08);
      B.pop();
      P.gatePost = { x, z: fz };
    } else if (r() < 0.55) {
      // gate lamp on the post
      B.stamp(D.tpl.ball, mtx(x, g + H + 0.2, fz, 0, 0.13, 0.15, 0.13), '#fff0cc');
      B.box('solid', x - 0.05, g + H + 0.05, fz - 0.05, x + 0.05, g + H + 0.09, fz + 0.05, '#3f3b38');
    }
  }
  // gate leaves (closed aluminium lattice gate)
  if (r() < 0.45 && gate[1] - gate[0] > 0.8) {
    const gc = r.pick(['#4a4d52', '#6a4e3a', '#8a8e93']);
    const g = P.gy((gate[0] + gate[1]) / 2, fz);
    const mid = (gate[0] + gate[1]) / 2;
    for (const [a, b] of [[gate[0] + 0.01, mid - 0.01], [mid + 0.01, gate[1] - 0.01]]) {
      B.box('metal', a, g + 0.08, fz - 0.02, b, g + 0.12, fz + 0.02, gc);
      B.box('metal', a, g + 0.9, fz - 0.02, b, g + 0.95, fz + 0.02, gc);
      B.box('metal', a, g + 0.08, fz - 0.02, a + 0.04, g + 0.95, fz + 0.02, gc);
      B.box('metal', b - 0.04, g + 0.08, fz - 0.02, b, g + 0.95, fz + 0.02, gc);
      for (let x = a + 0.12; x < b - 0.06; x += 0.1) B.box('small', x, g + 0.12, fz - 0.01, x + 0.02, g + 0.9, fz + 0.01, gc);
    }
  }
}

/** Clutter by the door: umbrella stand, watering can, broom, bucket, slippers, parcel... */
function doorstep(B, P, D, hasFence, gate) {
  const r = P.r;
  const T = D.tpl;
  const f = P.entry.facade;
  const pr = D.porch;
  if (!pr) return;
  B.push(facadeMatrix(f));
  const ground = (u, n) => P.gy(...f.toLocal(u, n));
  // pots cluster beside the porch
  const nPots = r.int(1, P.trad ? 4 : 3);
  for (let i = 0; i < nPots; i++) {
    const left = r() < 0.5;
    const u = left ? pr.u0 - 0.25 - r() * 0.8 : pr.u1 + 0.25 + r() * 0.8;
    const n = 0.2 + r() * Math.min(0.9, (P.yard?.strip ?? 0.5) - 0.3);
    if (u < 0.2 || u > f.L - 0.2) continue;
    const [x, z] = f.toLocal(u, n);
    if (!P.claim(x, z, 0.22)) continue;
    pottedPlant(B, D, u, ground(u, n), n, r);
  }
  // on the porch landing
  if (r() < 0.55) {
    const u = r() < 0.5 ? pr.u0 + 0.2 : pr.u1 - 0.2;
    B.stamp(T.umbrellaStand, mtx(u, pr.top, 0.35, r() * 6, 1));
  }
  if (r() < 0.45) B.stamp(T.slippers, mtx((pr.u0 + pr.u1) / 2 + (r() - 0.5) * 0.4, pr.top + 0.015, 0.3 + r() * 0.2, (r() - 0.5) * 0.6), r.pick(['#8fb8d8', '#f2b8cf', '#6a8a6a', '#e9e5dc']));
  if (r() < 0.12) B.stamp(T.parcel, mtx(pr.u1 - 0.35, pr.top, 0.35, (r() - 0.5) * 0.3, r.range(0.8, 1.2)));
  if (r() < 0.12) B.stamp(T.newspaper, mtx((pr.u0 + pr.u1) / 2 + 0.3, pr.top, 0.7, r() * 3, 1));
  if (r() < 0.15) {
    // folded umbrella leaning by the door
    const u = pr.u0 + 0.12;
    B.cyl('solid', [u, pr.top, 0.1], [u + 0.05, pr.top + 0.85, 0.03], 0.03, r.pick(['#3b5f8a', '#d35d6e', '#2f3a55']), 6, { r1: 0.018 });
  }
  // milk box on the wall
  if (r() < 0.14) B.stamp(T.milkBox, mtx(pr.u1 + 0.35, FOUND + 1.0, 0, 0, 1));
  // wall mailbox (when no gate post)
  if (!P.gatePost) {
    const u = pr.u0 - 0.5;
    if (u > 0.3) B.stamp(T.mailboxWall, mtx(u, FOUND + 0.95, 0, 0, 1), r.pick(['#ffffff', '#e8e0cc', '#c9ccd0']));
  }
  // broom / bucket / watering can near the wall
  const wallThings = [['broom', 0.45], ['bucket', 0.35], ['can', 0.45], ['stand', 0]];
  for (const [kind, p] of wallThings) {
    if (r() >= p) continue;
    const u = r() < 0.5 ? pr.u0 - 0.4 - r() * 1.4 : pr.u1 + 0.4 + r() * 1.4;
    if (u < 0.3 || u > f.L - 0.3) continue;
    const n = 0.18;
    const [x, z] = f.toLocal(u, n);
    if (!P.claim(x, z, 0.16)) continue;
    const g = ground(u, n);
    if (kind === 'broom') B.stamp(T.broom, mtx(u, g, 0.12, 0, 1, 1, 1, -0.12, r() < 0.5 ? 0.1 : -0.1));
    else if (kind === 'bucket') B.stamp(T.bucket, mtx(u, g, n, 0, 1.1), r.pick(['#4f8fd0', '#e0564a', '#f2c230', '#6fbf8e']));
    else B.stamp(T.wateringCan, mtx(u, g, n + 0.05, r() * 6, 1), r.pick(['#6fbf8e', '#4f8fd0', '#f2a03a', '#d35d6e']));
  }
  B.pop();
  // bonsai shelf (盆栽棚) by the wall on traditional houses
  if (P.trad && r() < 0.6) bonsaiShelf(B, P, D);
  // garbage sorting box near the street edge
  if (r() < 0.25 && P.yard) {
    const x = (r() < 0.5 ? -1 : 1) * (P.W / 2 - 0.8);
    const z = P.yard.edgeZ - (hasFence ? 0.55 : 0.4);
    if (P.yard.strip > 1.0 && P.claim(x, z, 0.55)) {
      B.stamp(T.garbageBox, mtx(x, P.gy(x, z), z, 0, 1), r.pick(['#6fa37a', '#8a939c', '#5f7f9f']));
      B.shadowBox(x - 0.45, P.gy(x, z), z - 0.3, x + 0.45, P.gy(x, z) + 0.72, z + 0.3);
    }
  }
}

function bonsaiShelf(B, P, D) {
  const r = P.r;
  const f = P.entry.facade;
  const pr = D.porch;
  const left = pr.u0 > f.L - pr.u1;
  const u0 = left ? pr.u0 - 1.6 : pr.u1 + 0.35;
  if (u0 < 0.25 || u0 + 1.25 > f.L - 0.25) return;
  const n = 0.35;
  const [x, z] = f.toLocal(u0 + 0.6, n);
  if (!P.claim(x, z, 0.6)) return;
  B.push(facadeMatrix(f));
  const g = Math.min(P.gy(...f.toLocal(u0, n)), P.gy(...f.toLocal(u0 + 1.2, n)));
  const wood = '#8a6446';
  for (const u of [u0 + 0.08, u0 + 1.12]) B.box('solid', u - 0.1, g - 0.05, n - 0.14, u + 0.1, g + 0.35, n + 0.14, '#b9b4aa');
  B.box('solid', u0, g + 0.35, n - 0.18, u0 + 1.2, g + 0.39, n + 0.18, wood);
  B.shadowBox(u0, g + 0.3, n - 0.18, u0 + 1.2, g + 0.6, n + 0.18);
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.2 + i * 0.4;
    B.box('solid', u - 0.13, g + 0.39, n - 0.09, u + 0.13, g + 0.47, n + 0.09, r.pick(['#5a4a3e', '#3f4a5a', '#7a5a4a']));
    plant(B, D, i === 1 ? 'pine' : r.pick(['pine', 'azalea', 'herb']), u, g + 0.47, n, 0.13, r);
  }
  B.pop();
}

// ---------------------------------------------------------------------------
// side services
// ---------------------------------------------------------------------------
function sideServices(B, P, D) {
  const r = P.r;
  const sides = ['left', 'right'].map((s) => P.facade('main', s)).filter(Boolean);
  if (P.wing) sides.push(P.facade('wing', 'right'));
  const back = P.facade('main', 'back');
  // AC outdoor units: 1..3 per house (ground or wall bracket)
  const nAC = r.int(1, P.lod === 'full' ? 3 : 1);
  for (let i = 0; i < nAC; i++) {
    const f = r() < 0.8 ? r.pick(sides) : back;
    wallAC(B, P, D, f, r() < 0.4 && P.main.floors === 2);
  }
  if (P.lod !== 'full') return;
  // gas meter + water heater near the front corner of one side
  const gf = r.pick(sides);
  const frontEnd = gf.side === 'left' ? [gf.L - 2.8, gf.L - 0.4] : [0.4, 2.8];
  if (gf.block === P.main) {
    const gm = findSpot(P, gf, 0.3, 0.34, 1.05, 1.5, frontEnd[0], frontEnd[1]);
    if (gm) {
      B.push(facadeMatrix(gf));
      B.stamp(D.tpl.gasMeter, mtx((gm.u0 + gm.u1) / 2, gm.y0, 0, 0, 1));
      B.pop();
    }
    const ht = findSpot(P, gf, 0.5, 0.7, 0.75, 1.6, frontEnd[0] - 1.5, frontEnd[1] + 1.5);
    if (ht && r() < 0.8) {
      B.push(facadeMatrix(gf));
      B.stamp(D.tpl.heater, mtx((ht.u0 + ht.u1) / 2, ht.y0 + 0.35, 0, 0, 1));
      B.pop();
    }
  }
  // vent hoods, drain pipes, water tap
  for (const f of sides) {
    B.push(facadeMatrix(f));
    const nv = r.int(0, 2);
    for (let i = 0; i < nv; i++) {
      const fl = f.block.floors === 2 && r() < 0.5 ? 1 : 0;
      const s = findSpot(P, f, 0.26, 0.26, FOUND + fl * STOREY + 1.9, FOUND + fl * STOREY + 2.35);
      if (s) B.stamp(r() < 0.6 ? D.tpl.vent : D.tpl.ventSquare, mtx((s.u0 + s.u1) / 2, (s.y0 + s.y1) / 2, 0, 0, 1));
    }
    // exposed drain pipe below a small (bathroom) window
    const bw = f.openings.find((o) => o.type === 'small' && o.floorY < 1);
    if (bw && r() < 0.7) {
      const u = (bw.u0 + bw.u1) / 2 + 0.2;
      const g = fGround(P, f, u);
      const u2 = u + (r() < 0.5 ? -0.9 : 0.9);
      const g2 = fGround(P, f, u2);
      B.pipe('solid', [[u, bw.y0 - 0.2, 0], [u, bw.y0 - 0.2, 0.06], [u, g + 0.22, 0.06], [u2, g2 + 0.22, 0.06], [u2, g2 - 0.05, 0.06]], 0.035, '#b3b7bb', 6);
      B.box('solid', u2 - 0.15, g2 - 0.05, -0.02, u2 + 0.15, g2 + 0.06, 0.28, '#a9a7a1');
    }
    B.pop();
  }
  // water tap by the front corner
  if (r() < 0.3) {
    const f = r.pick(sides);
    const u = f.side === 'left' ? f.L - 0.9 : 0.9;
    const [x, z] = f.toLocal(u, 0.35);
    if (P.claim(x, z, 0.3)) {
      B.push(facadeMatrix(f));
      B.stamp(D.tpl.tap, mtx(u, fGround(P, f, u, 0.35), 0.12, 0, 1));
      if (r() < 0.6) B.stamp(D.tpl.bucket, mtx(u + 0.3, fGround(P, f, u + 0.3, 0.35), 0.3, 0, 1.1), r.pick(['#4f8fd0', '#e0564a', '#f2c230']));
      B.pop();
    }
  }
  // wind chime under an eave / balcony
  if (P.windChime) windChime(B, P, D);
  // side-yard laundry stand for single-storey and yard houses
  if ((P.main.floors === 1 || (P.massing === 'yard' && !P.balcony)) && P.yard && P.yard.strip > 2.2) yardLaundry(B, P, D);
}

/** AC outdoor unit on a side facade, on the ground or on a wall bracket, with its pipe cover. */
export function wallAC(B, P, D, f, high) {
  if (!f) return;
  const r = P.r;
  const floorTop = f.block.floors === 2 && high;
  const y0 = floorTop ? FOUND + STOREY + 0.55 : 0;
  let spot;
  if (floorTop) spot = findSpot(P, f, 0.95, 0.75, y0, y0 + 0.5);
  else spot = findSpot(P, f, 0.95, 0.75, -0.2, -0.2);
  if (!spot) return;
  const u = (spot.u0 + spot.u1) / 2;
  const g = fGround(P, f, u, 0.3);
  const [x, z] = f.toLocal(u, 0.3);
  if (!floorTop && !P.claim(x, z, 0.5)) return;
  B.push(facadeMatrix(f));
  const baseY = floorTop ? spot.y0 : g + 0.09;
  if (floorTop) B.stamp(D.tpl.acBracket, mtx(u, baseY, 0, 0, 1));
  else B.stamp(D.tpl.acBase, mtx(u, g, 0.02, 0, 1));
  B.stamp(D.tpl.ac, mtx(u, baseY, 0.03, 0, 1));
  B.shadowBox(u - 0.4, baseY + 0.06, 0.03, u + 0.4, baseY + 0.62, 0.32);
  // pipe cover (化粧カバー) from the unit's side up into the wall
  const pu = u + 0.52;
  const topY = floorTop ? baseY + 0.9 : (f.block.floors === 2 && r() < 0.5 ? FOUND + STOREY + 2.05 : FOUND + 1.95);
  const col = { u0: pu - 0.06, u1: pu + 0.06, y0: baseY + 0.1, y1: topY + 0.1 };
  const blocked = f.openings.some((o) => rectHit(col, o)) || pu > f.L - 0.2;
  const pc = r.pick(['#ecebe6', '#d9d4c7', '#bfb8ab']);
  if (!blocked) {
    B.box('solid', u + 0.4, baseY + 0.18, 0.02, pu + 0.06, baseY + 0.28, 0.12, pc);
    B.box('solid', pu - 0.05, baseY + 0.18, 0, pu + 0.05, topY, 0.08, pc);
    B.box('solid', pu - 0.08, topY, 0, pu + 0.08, topY + 0.12, 0.1, pc);
    f.occ.push(col);
  } else {
    B.box('solid', u + 0.4, baseY + 0.18, 0, u + 0.55, baseY + 0.3, 0.12, pc);
  }
  // drain hose
  B.cyl('small', [u + 0.3, baseY + 0.05, 0.1], [u + 0.36, Math.max(g + 0.02, baseY - 0.6), 0.2], 0.01, '#8d9197', 4);
  B.pop();
}

function windChime(B, P, D) {
  const r = P.r;
  const f = P.balcony ? P.balcony.facade : P.entry.facade;
  B.push(facadeMatrix(f));
  let u, y, z;
  if (P.balcony) { u = P.balcony.u0 + 0.3; y = FOUND + STOREY + 2.05; z = P.balcony.depth * 0.3; }
  else { u = (P.entry.u0 + P.entry.u1) / 2 + 0.6; y = P.entry.y1 + 0.28; z = 0.6; }
  B.box('small', u - 0.005, y, z - 0.005, u + 0.005, y + 0.1, z + 0.005, '#555');
  const top = y;
  const glass = r.pick(['#bfe0f0', '#f6d0dc', '#d8ecd0']);
  B.cyl('small', [u, top - 0.13, z], [u, top, z], 0.05, glass, 7, { r1: 0.02 });
  B.box('small', u - 0.003, top - 0.3, z - 0.003, u + 0.003, top - 0.13, z + 0.003, '#8a7a6a');
  B.swayFn = (p) => Math.max(0, top - 0.28 - p[1]) * 3.0;
  const uv = D.laundry.uv('towelPink');
  B.quad('laundry', [u - 0.03, top - 0.48, z], [u + 0.03, top - 0.48, z], [u + 0.03, top - 0.3, z], [u - 0.03, top - 0.3, z], '#ffffff', [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
  B.swayFn = null;
  B.pop();
}

function yardLaundry(B, P, D) {
  const r = P.r;
  const y = P.yard;
  const z = y.frontZ + Math.min(1.2, y.strip * 0.45);
  const len = Math.min(2.6, P.W - 3);
  if (len < 1.5) return;
  const x0 = -P.W / 2 + 0.6 + r() * (P.W - len - 1.2);
  const x1 = x0 + len;
  for (let x = x0; x < x1; x += 0.5) if (!P.claim(x, z, 0.2)) return;
  for (const x of [x0, x1]) {
    const g = P.gy(x, z);
    B.box('solid', x - 0.18, g, z - 0.18, x + 0.18, g + 0.12, z + 0.18, '#b9b4aa');
    B.cyl('metal', [x, g + 0.12, z], [x, g + 1.9, z], 0.03, '#b9c4cc', 6);
    B.box('metal', x - 0.02, g + 1.86, z - 0.3, x + 0.02, g + 1.9, z + 0.3, '#b9c4cc');
  }
  const gY = P.gy(x0, z) + 1.9;
  B.cyl('small', [x0 - 0.1, gY + 0.02, z + 0.25], [x1 + 0.1, gY + 0.02, z + 0.25], 0.017, '#9fc3d8', 6);
  B.pushT(0, 0, 0, 0);
  hangLaundry(B, P, D, x0 + 0.1, x1 - 0.1, gY + 0.02, z + 0.25, -1);
  B.pop();
}

// ---------------------------------------------------------------------------
// service drop (poles.js runs the wire to lot.drop)
// ---------------------------------------------------------------------------
function serviceDrop(B, P, D) {
  const lot = P.lot;
  const loc = localOf(lot, lot.drop.x, lot.drop.z);
  const dy = lot.drop.y - lot.y;
  const m = P.main;
  const f = P.facade('main', 'front');
  const onWall = Math.abs(loc.z - m.z1) < 0.4 && loc.x > m.x0 + 0.1 && loc.x < m.x1 - 0.1 && dy < m.top;
  const wireC = '#2d3035';
  if (onWall) {
    B.push(facadeMatrix(f));
    const u = loc.x - m.x0;
    const n = loc.z - m.z1;
    // bracket + insulator reaching the drop point
    B.box('metal', u - 0.03, dy - 0.12, 0, u + 0.03, dy + 0.06, 0.02, '#8d9197');
    B.box('small', u - 0.012, dy - 0.03, 0.02, u + 0.012, dy - 0.01, n, '#8d9197');
    B.cyl('small', [u, dy - 0.06, n], [u, dy + 0.03, n], 0.025, '#f2f2ee', 6);
    if (P.lod === 'simple') { B.pop(); return; }
    // conduit down to the meter; dodge windows by shifting sideways
    let cu = u;
    const free = (uu) => !f.openings.some((o) => uu > o.u0 - 0.15 && uu < o.u1 + 0.15 && o.y1 > 1.6 && o.y0 < dy);
    if (!free(cu)) {
      for (let k = 1; k < 12; k++) {
        if (u + k * 0.25 < f.L - 0.3 && free(u + k * 0.25)) { cu = u + k * 0.25; break; }
        if (u - k * 0.25 > 0.3 && free(u - k * 0.25)) { cu = u - k * 0.25; break; }
      }
    }
    const meterY = FOUND + 1.35;
    const pts = [[u, dy - 0.05, n], [u, dy - 0.2, 0.05]];
    if (cu !== u) pts.push([cu, dy - 0.2, 0.05]);
    pts.push([cu, meterY + 0.36, 0.05]);
    B.pipe('solid', pts, 0.02, '#9aa1a8', 5);
    B.stamp(D.tpl.elecMeter, mtx(cu, meterY, 0, 0, 1));
    const g = fGround(P, f, cu);
    B.pipe('solid', [[cu, meterY, 0.05], [cu, g - 0.05, 0.05]], 0.02, '#9aa1a8', 5);
    f.occ.push({ u0: cu - 0.2, u1: cu + 0.2, y0: 0, y1: dy });
    B.pop();
  } else {
    // 引込柱: slender steel service pole at the lot front carrying the drop + meter
    const x = loc.x, z = loc.z - 0.05;
    const g = P.gy(x, z);
    P.claims.push({ x, z, r: 0.3 });
    const pc = '#a3a8ad';
    B.cyl('metal', [x, g - 0.2, z], [x, dy + 0.35, z], 0.055, pc, 8);
    B.shadowBox(x - 0.05, g - 0.2, z - 0.05, x + 0.05, dy + 0.4, z + 0.05);
    B.cyl('solid', [x, dy + 0.35, z], [x, dy + 0.4, z], 0.065, '#6b7075', 8);
    B.box('small', x - 0.012, dy - 0.02, z, x + 0.012, dy + 0.0, loc.z, pc);
    B.cyl('small', [x, dy - 0.06, loc.z], [x, dy + 0.03, loc.z], 0.025, '#f2f2ee', 6);
    B.stamp(D.tpl.elecMeter, mtx(x, g + 1.3, z + 0.055, 0, 1));
    B.cyl('small', [x + 0.07, g + 0.3, z + 0.02], [x + 0.07, dy - 0.1, z + 0.02], 0.018, '#8d9197', 5);
    // service cable on to the house front wall
    const hx = Math.max(m.x0 + 0.3, Math.min(m.x1 - 0.3, x));
    const hy = Math.min(dy - 0.2, m.top - 0.4);
    const a = new THREE.Vector3(x, dy - 0.1, z), b = new THREE.Vector3(hx, hy, m.z1 + 0.05);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 0.25 * 4 * t * (1 - t), a.z + (b.z - a.z) * t]);
    }
    for (let i = 0; i < pts.length - 1; i++) B.cyl('small', pts[i], pts[i + 1], 0.011, wireC, 4, { caps: false });
    B.box('metal', hx - 0.03, hy - 0.08, m.z1, hx + 0.03, hy + 0.08, m.z1 + 0.06, '#8d9197');
  }
}

// ---------------------------------------------------------------------------
// roof top: TV antenna, BS dish
// ---------------------------------------------------------------------------
function roofTop(B, P, D) {
  const r = P.r;
  const b = P.main;
  const R = b.roof, rp = b.rp;
  if (!rp) return;
  let ax, az, ay;
  if (R.type === 'gableX' || (R.type === 'hip' && rp.W >= rp.D)) {
    ax = rp.cx + (r() < 0.5 ? -1 : 1) * Math.max(0, (R.type === 'hip' ? rp.W / 2 - rp.D / 2 : rp.W / 2) * r.range(0.3, 0.7));
    az = rp.cz; ay = rp.ridgeY + (rp.kawara ? 0.3 : 0.05);
  } else if (R.type === 'gableZ' || R.type === 'hip') {
    az = rp.cz + (r() < 0.5 ? -1 : 1) * Math.max(0, (R.type === 'hip' ? rp.D / 2 - rp.W / 2 : rp.D / 2) * r.range(0.3, 0.7));
    ax = rp.cx; ay = rp.ridgeY + (rp.kawara ? 0.3 : 0.05);
  } else if (R.type === 'shed') {
    const hiZ = R.shedDir > 0 ? b.z0 + 0.8 : b.z1 - 0.8;
    ax = rp.cx + (r() - 0.5) * rp.W * 0.5;
    az = hiZ;
    ay = rp.yWall + (R.shedDir > 0 ? b.z1 - hiZ : hiZ - b.z0) * R.pitch;
  } else return;
  const lotYaw = P.lot.rotY;
  if (P.antenna) {
    const mastH = r.range(1.6, 2.4);
    B.cyl('metal', [ax, ay - 0.1, az], [ax, ay + mastH, az], 0.022, '#aab0b6', 6);
    // tripod base legs
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      B.cyl('small', [ax, ay + 0.5, az], [ax + Math.cos(a) * 0.45, ay - 0.05, az + Math.sin(a) * 0.45], 0.012, '#9aa1a8', 4);
    }
    // guy wires
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.8;
      B.cyl('small', [ax, ay + mastH * 0.7, az], [ax + Math.cos(a) * 1.5, ay - 0.15, az + Math.sin(a) * 1.5], 0.004, '#50555c', 3, { caps: false });
    }
    const yaw = TV_DIR - lotYaw;
    B.stamp(D.tpl.yagi, mtx(ax, ay + mastH - 0.12, az, yaw, 1));
    if (r() < 0.45) B.stamp(D.tpl.yagi, mtx(ax, ay + mastH - 0.62, az, yaw, 0.85));
    if (r() < 0.35) B.stamp(D.tpl.dish, mtx(ax, ay + mastH * 0.45, az + 0.03, BS_DIR - lotYaw, 0.9));
  } else if (P.dishRoof) {
    B.cyl('metal', [ax, ay - 0.1, az], [ax, ay + 0.6, az], 0.025, '#aab0b6', 6);
    B.stamp(D.tpl.dish, mtx(ax, ay + 0.5, az, BS_DIR - lotYaw, 1));
  }
}

// ---------------------------------------------------------------------------
// garden patch around a garden sakura (sakura.js builds the tree itself)
// ---------------------------------------------------------------------------
function gardenPatch(B, P, D) {
  const r = P.r;
  const t = P.treeLocal;
  if (!t) return;
  const edgeZ = P.yard ? P.yard.edgeZ : P.D / 2;
  const hero = P.lot.gardenTree.hero;
  // low stone curb ring around the trunk (root bed)
  const g0 = P.gy(t.x, t.z);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const x = t.x + Math.cos(a) * 1.05, z = t.z + Math.sin(a) * 1.05;
    if (z > edgeZ - 0.1) continue;
    B.stamp(D.tpl.stone, mtx(x, P.gy(x, z) - 0.05, z, a, 0.28, 0.14, 0.2), shade('#b8b2a6', (r() - 0.5) * 0.08));
  }
  // moss / soil bed inside the ring
  B.stamp(D.tpl.stone, mtx(t.x, g0 - 0.08, t.z, 0, 2.0, 0.1, 2.0), '#8fa66e');
  // shrubs and azaleas around
  const n = hero ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = 1.5 + r() * 0.9;
    const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
    if (z > edgeZ - 0.4) continue;
    if (Math.abs(x) < P.W / 2 - 0.2 && z < P.D / 2) continue; // inside the house footprint side
    if (!P.claim(x, z, 0.45)) continue;
    const g = P.gy(x, z);
    if (r() < 0.5) plant(B, D, 'azalea', x, g, z, r.range(0.35, 0.5), r);
    else shrub(B, D, x, g, z, r.range(0.35, 0.55), r);
  }
  // stepping stones from the front yard toward the tree
  const sx = Math.sign(t.x) * (P.W / 2 - 0.2);
  for (let i = 0; i < 4; i++) {
    const k = (i + 0.5) / 4;
    const x = sx + (t.x - sx) * k * 0.7, z = (P.yard ? P.yard.frontZ + 0.6 : P.D / 2 - 0.5) + (t.z - (P.D / 2 - 0.5)) * k * 0.4;
    if (z > edgeZ - 0.2) continue;
    B.stamp(D.tpl.stone, mtx(x, P.gy(x, z) - 0.03, z, r() * 3, 0.42, 0.06, 0.34), '#b3ada2');
  }
  if (P.trad && !hero && r() < 0.6) {
    const a = r() * Math.PI * 2;
    const x = t.x + Math.cos(a) * 1.7, z = t.z + Math.sin(a) * 1.7;
    if (z < edgeZ - 0.5 && P.claim(x, z, 0.4)) {
      B.stamp(D.tpl.lantern, mtx(x, P.gy(x, z), z, r() * 6, 1));
      B.shadowBox(x - 0.2, P.gy(x, z), z - 0.2, x + 0.2, P.gy(x, z) + 1.0, z + 0.2);
    }
  }
}

export { findSpot, fenceRun, shrub, LEAF };
