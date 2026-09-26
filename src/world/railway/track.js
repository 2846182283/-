/**
 * railway/track.js — the permanent way of the double track:
 *   - ballast bed (one continuous double-track cross-section, lumpy toes,
 *     painted stone texture, rust-dust darkening along the rails)
 *   - loose stones (instanced) on the shoulders / between the tracks near the station
 *   - concrete PC sleepers (a few old creosoted wooden ones), instanced
 *   - rails with a head / web / foot profile: polished silver running band,
 *     steel-grey head sides, rust-brown web and foot; 25 m rails with joint gaps,
 *     fishplates, bolts and copper bond wires
 *   - rail fastenings (tie plates, spring clips, bolts) instanced near the station
 */
import * as THREE from 'three';
import { RAIL } from '../../core/layout.js';
import { TRK, ZONE, sweep, wobble, inPlatformX, inCrossing, inInternalCrossing, inRange, isNear, jitter, mtx, paint, openBox } from './common.js';

// ---------------------------------------------------------------------------
// rail profile
// ---------------------------------------------------------------------------
const Y0 = TRK.railBase;
const RIGHT = [
  [0.066, Y0], [0.066, Y0 + 0.010], [0.014, Y0 + 0.028], [0.0085, Y0 + 0.038], [0.0085, Y0 + 0.082],
  [0.016, Y0 + 0.092], [0.033, Y0 + 0.097], [0.034, Y0 + 0.127], [0.026, RAIL.railTop],
];
/** closed CCW rail cross-section (d = lateral from rail centre, y = world height) */
export const RAIL_PROFILE = [[-0.066, Y0], ...RIGHT, ...RIGHT.slice(1).reverse().map(([d, y]) => [-d, y])];
export const RAIL_COL = {
  rust: '#7d6353', rustD: '#6a5549', under: '#6c5d55', side: '#8e9196', cham: '#b8bcc2', top: '#eef0f3',
};
const RC = RAIL_COL;
/** per-edge colours matching RAIL_PROFILE */
export const RAIL_COLORS = [
  RC.rustD, // bottom
  RC.rust, RC.rust, RC.rust, RC.rust, RC.rust, RC.under, RC.side, RC.cham, // right side, bottom -> top
  RC.top, // running surface
  RC.cham, RC.side, RC.under, RC.rust, RC.rust, RC.rust, RC.rust, RC.rust, // left side, top -> bottom
];

/**
 * Add one rail along a path.  shape(j) may return {s, o} to scale the profile
 * laterally and offset it (tapered switch blades).
 */
export function addRail(K, path, shape = null, bucket = 'rail') {
  const prof = shape
    ? (j) => { const { s = 1, o = 0 } = shape(j) || {}; return RAIL_PROFILE.map(([d, y]) => [d * s + o, y]); }
    : RAIL_PROFILE;
  const g = sweep(path, prof, RAIL_COLORS, { closed: true, capColor: RC.rust, uvScale: 1 });
  K.B.add(bucket, g, null);
  return g;
}

// ---------------------------------------------------------------------------
// ballast bed
// ---------------------------------------------------------------------------
const zA = TRK.A.z, zB = TRK.B.z, zM = TRK.zMid;
const RO = TRK.railOff;

/** Bed cross-section at x: [[z, y, colour], ...] ordered from south (+z) to north (-z). */
export function bedSection(x) {
  const j1 = 0.07 * wobble(x * 1.1, 1), j2 = 0.07 * wobble(x * 1.1, 2);
  const h1 = 0.018 * wobble(x * 2.3, 3), h2 = 0.018 * wobble(x * 2.3, 4);
  const toeCol = '#d2ccc6', shCol = '#fbf9f6', midCol = '#e8e4df', railCol = '#cdbfb3', centreCol = '#ddd5cd';
  const side = (zc, sgn, jt, jh) => {
    // sgn = +1: toward +z of this track
    return [
      [zc + sgn * (2.15 + jt), -0.03, toeCol],
      [zc + sgn * (1.78 + jt * 0.6), 0.14 + jh, '#f1eee9'],
      [zc + sgn * 1.32, 0.283 + jh * 0.5, shCol],
      [zc + sgn * 1.04, 0.262, '#e6e1da'],
    ];
  };
  const inner = (zc) => [
    [zc + RO + 0.12, 0.252, midCol], [zc + RO - 0.1, 0.25, railCol], [zc + 0.16, 0.246, centreCol],
    [zc - 0.16, 0.246, centreCol], [zc - RO + 0.1, 0.25, railCol], [zc - RO - 0.12, 0.252, midCol],
  ];
  const pts = [];
  pts.push(...side(zA, +1, j1, h1));
  pts.push(...inner(zA));
  pts.push([zA - 1.04, 0.262, '#e6e1da'], [zA - 1.42, 0.268, midCol]);
  pts.push([zM, 0.205 + h2 * 0.5, '#c9c2ba']);
  pts.push([zB + 1.42, 0.268, midCol], [zB + 1.04, 0.262, '#e6e1da']);
  pts.push(...inner(zB));
  pts.push(...side(zB, -1, j2, h2).reverse());
  return pts;
}

/** Height of the bed surface at (x, z) (linear interpolation of the section). */
export function bedHeight(x, z) {
  const s = bedSection(x);
  if (z > s[0][0] || z < s[s.length - 1][0]) return 0;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    if (z <= a[0] && z >= b[0]) {
      const t = (a[0] - z) / (a[0] - b[0] || 1);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return 0;
}

function buildBed(K) {
  const path = [];
  let x = TRK.xMin;
  while (x < TRK.xMax) {
    path.push({ x, z: 0 });
    x += isNear(x) ? 0.8 : 3.0;
  }
  path.push({ x: TRK.xMax, z: 0 });
  const secs = path.map((p) => bedSection(p.x));
  const colors = [];
  const s0 = secs[0];
  for (let i = 0; i < s0.length - 1; i++) colors.push([s0[i][2], s0[i + 1][2]]);
  // lateral d == world z because the path runs along +x at z = 0
  const g = sweep(path, (j) => secs[j].map(([z, y]) => [z, y]), colors, { uvScale: 1.35 });
  K.B.add('bed', g, null);
}

// ---------------------------------------------------------------------------
// sleepers
// ---------------------------------------------------------------------------
function sleeperGeometry() {
  const prof = [[-0.14, 0.14], [0.14, 0.14], [0.124, 0.292], [0.104, 0.31], [-0.104, 0.31], [-0.124, 0.292]];
  const g = sweep([{ x: 0, z: -1 }, { x: 0, z: 1 }], prof, ['#ffffff'], { closed: true, capColor: '#ffffff' });
  g.deleteAttribute('color');
  return g;
}

/** Positions of regular sleepers for a track (skips the crossover timbers). */
export function sleeperXs(track, K) {
  const xs = [];
  const skip = K.crossoverSpan; // [x0, x1] covered by long timbers
  const rng = K.rng(track.id === 'A' ? 301 : 302);
  const off = track.id === 'A' ? 0 : 0.21;
  for (let x = TRK.xMin + 0.31 + off; x < TRK.xMax; x += RAIL.sleeperSpacing) {
    if (skip && x > skip[0] && x < skip[1]) continue;
    xs.push(x + (rng() - 0.5) * 0.03);
  }
  return xs;
}

function buildSleepers(K) {
  const { THREE: T } = K;
  const geo = sleeperGeometry();
  const list = [];
  for (const track of [TRK.A, TRK.B]) {
    const rng = K.rng(track.id === 'A' ? 311 : 312);
    for (const x of sleeperXs(track, K)) {
      const far = !isNear(x);
      const wood = rng() < (far ? 0.18 : inRange(x, ZONE.detail) ? 0.025 : 0.07);
      const color = wood
        ? jitter(rng() < 0.5 ? '#6d5647' : '#5f4d42', rng, 0.03)
        : jitter(rng() < 0.2 ? '#aeaaa2' : '#bcb8b0', rng, 0.03);
      list.push({ x, y: 0, z: track.z + (rng() - 0.5) * 0.02, ry: (rng() - 0.5) * 0.012, color });
    }
  }
  // crossover timbers (long, brown synthetic / wooden) spanning both tracks
  for (const t of K.timbers || []) list.push({ x: t.x, y: 0, z: t.z, ry: t.ry || 0, sz: t.len / 2, color: t.color });
  const mats = list.map((t) => mtx(t.x, t.y, t.z, 0, t.ry, 0, 1, 1, t.sz || 1));
  const im = K.geom.instanced(geo, K.M.inst, mats, { castShadow: false });
  const c = new T.Color();
  list.forEach((t, i) => im.setColorAt(i, c.set(t.color)));
  im.instanceColor.needsUpdate = true;
  im.name = 'railway:sleepers';
  K.add(im);
}

// ---------------------------------------------------------------------------
// fastenings
// ---------------------------------------------------------------------------
function fasteningGeometry(full) {
  const parts = [];
  const plate = openBox(0.17, 0.014, full ? 0.34 : 0.3);
  plate.translate(0, 0.31 + 0.007 - 0.003, 0);
  parts.push(paint(plate, '#4d4e53'));
  for (const s of [-1, 1]) {
    if (full) {
      // spring clip: a bent bar pressing on the rail foot
      const pts = [
        new THREE.Vector3(-0.034, 0.322, s * 0.126), new THREE.Vector3(0.0, 0.343, s * 0.066), new THREE.Vector3(0.034, 0.322, s * 0.126),
      ];
      parts.push(paint(tubeGeo(pts, 0.008, 3), '#34373c'));
      // bolt / nut (a squat block reads as a nut at walking distance)
      const nut = openBox(0.03, 0.026, 0.03);
      nut.rotateY(0.4);
      nut.translate(0, 0.317 + 0.013, s * 0.158);
      parts.push(paint(nut, '#625c56'));
    } else {
      const blk = openBox(0.07, 0.03, 0.045);
      blk.translate(0, 0.317 + 0.015, s * 0.1);
      parts.push(paint(blk, '#3a3c41'));
    }
  }
  return parts;
}

/** Minimal tube along points (same idea as geom.tubeAlong, kept local for the fastening template). */
function tubeGeo(points, r, radial) {
  const pos = [], nor = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)], c = points[Math.min(points.length - 1, i + 1)];
    t.subVectors(c, a).normalize();
    n.crossVectors(t, up);
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
    n.normalize();
    b.crossVectors(n, t).normalize();
    for (let k = 0; k < radial; k++) {
      const ang = (k / radial) * Math.PI * 2;
      const nx = n.x * Math.cos(ang) + b.x * Math.sin(ang), ny = n.y * Math.cos(ang) + b.y * Math.sin(ang), nz = n.z * Math.cos(ang) + b.z * Math.sin(ang);
      pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      nor.push(nx, ny, nz);
    }
  });
  for (let i = 0; i < points.length - 1; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k, bb = i * radial + ((k + 1) % radial), c = (i + 1) * radial + k, d = (i + 1) * radial + ((k + 1) % radial);
      idx.push(a, c, bb, bb, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

function buildFastenings(K) {
  const full = K.geom.merge(fasteningGeometry(true), ['color']);
  const lite = K.geom.merge(fasteningGeometry(false), ['color']);
  const fullM = [], liteM = [];
  for (const track of [TRK.A, TRK.B]) {
    for (const x of sleeperXs(track, K)) {
      if (!isNear(x)) continue;
      if (inCrossing(x, 0.3)) continue; // under the crossing deck
      const list = inRange(x, ZONE.detail) ? fullM : liteM;
      for (const s of [-1, 1]) list.push(mtx(x, 0, track.z + s * RO));
    }
  }
  for (const [geo, ms, name] of [[full, fullM, 'fastenings'], [lite, liteM, 'fasteningsLite']]) {
    const im = K.geom.instanced(geo, K.M.fast, ms, { castShadow: false, noOutline: true });
    im.name = `railway:${name}`;
    K.add(im);
  }
}

// ---------------------------------------------------------------------------
// rails, joints, fishplates
// ---------------------------------------------------------------------------
export const JOINT_SPACING = 25;

function jointXs(track) {
  const xs = [];
  const off = track.id === 'A' ? 0 : 11.3;
  for (let x = TRK.xMin + off; x <= TRK.xMax; x += JOINT_SPACING) {
    if (x > TRK.xMin + 1 && x < TRK.xMax - 1 && !inCrossing(x, 1.5)) xs.push(x);
  }
  return xs;
}

function buildRails(K) {
  const gap = 0.004;
  for (const track of [TRK.A, TRK.B]) {
    const joints = jointXs(track);
    const cuts = [TRK.xMin, ...joints, TRK.xMax];
    for (const s of [-1, 1]) {
      const z = track.z + s * RO;
      for (let i = 0; i < cuts.length - 1; i++) {
        const x0 = cuts[i] + (i ? gap : 0), x1 = cuts[i + 1] - (i < cuts.length - 2 ? gap : 0);
        addRail(K, [{ x: x0, z }, { x: x1, z }]);
      }
    }
    // joint hardware near the walkable area
    for (const x of joints) {
      if (!isNear(x)) continue;
      for (const s of [-1, 1]) addJoint(K, x, track.z + s * RO, s);
    }
  }
}

/** Fishplates both sides of the web, 4 bolts, a copper bond wire outside the head. */
export function addJoint(K, x, z, outward) {
  const B = K.B;
  for (const side of [-1, 1]) {
    const pz = z + side * 0.019;
    B.box('rail', 0.56, 0.052, 0.014, '#6a5b52', x, 0.381, pz);
    for (const bx of [-0.2, -0.07, 0.07, 0.2]) {
      // nut (outside) / bolt head (inside), hex prisms along z
      const g = new THREE.CylinderGeometry(0.013, 0.013, 0.02, 6);
      B.add('railSmall', g, side === outward ? '#5f5752' : '#6b635c', mtx(x + bx, 0.381, pz + side * 0.016, Math.PI / 2, 0, 0));
    }
  }
  // bond wire arc on the outer side of the head
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(new THREE.Vector3(x - 0.16 + 0.32 * t, 0.41 - 0.05 * Math.sin(t * Math.PI), z + outward * (0.042 + 0.012 * Math.sin(t * Math.PI))));
  }
  B.add('railSmall', tubeGeo(pts, 0.005, 3), '#c98752');
}

// ---------------------------------------------------------------------------
// loose stones (instanced) near the station
// ---------------------------------------------------------------------------
function buildStones(K) {
  const rng = K.rng(404);
  const geo = new THREE.OctahedronGeometry(1, 0);
  const cols = ['#8e8983', '#7a756f', '#6a6560', '#937f6e', '#b1aba2', '#827d78', '#7d6a5c'];
  const list = [];
  const push = (x, z, sMin, sMax, yOff = 0) => {
    const s = sMin + rng() * (sMax - sMin);
    const y = bedHeight(x, z) + s * 0.35 + yOff;
    list.push({ x, y, z, rx: rng() * 3, ry: rng() * 6.3, rz: rng() * 3, sx: s * (0.9 + rng() * 0.5), sy: s * (0.55 + rng() * 0.3), sz: s * (0.8 + rng() * 0.4), color: jitter(rng.pick(cols), rng, 0.04) });
  };
  const skip = (x) => inCrossing(x, 0.6) || inInternalCrossing(x, 0.2);
  const [n0, n1] = ZONE.near;
  for (let x = n0; x < n1; x += 0.22) {
    if (skip(x)) continue;
    const plat = inPlatformX(x, 0.5);
    // outer shoulders (not along platform walls)
    if (!plat) {
      for (const [zc, sg] of [[zA, 1], [zB, -1]]) {
        if (rng() < 0.85) push(x + rng() * 0.2, zc + sg * (1.2 + rng() * 0.9), 0.035, 0.06);
        if (rng() < 0.35) push(x + rng() * 0.2, zc + sg * (2.1 + rng() * 0.35), 0.03, 0.05, -0.01); // spilled onto the ground
      }
    }
    // the trough between the tracks
    if (rng() < 0.6) push(x + rng() * 0.2, zM + (rng() - 0.5) * 1.4, 0.03, 0.055);
    // on top, between the sleepers (outside the rail heads)
    if (rng() < 0.35) {
      const tr = rng() < 0.5 ? zA : zB;
      const dz = (rng() < 0.5 ? -1 : 1) * (RO + 0.12 + rng() * 0.28);
      push(x + rng() * 0.2, tr + dz, 0.025, 0.04);
    }
  }
  const mats = list.map((t) => mtx(t.x, t.y, t.z, t.rx, t.ry, t.rz, t.sx, t.sy, t.sz));
  const im = K.geom.instanced(geo, K.M.inst, mats, { castShadow: false, noOutline: true });
  const c = new THREE.Color();
  list.forEach((t, i) => im.setColorAt(i, c.set(t.color)));
  im.instanceColor.needsUpdate = true;
  im.name = 'railway:stones';
  K.add(im);
  K.stats.stones = list.length;
}

export function buildTrack(K) {
  buildBed(K);
  buildSleepers(K);
  buildRails(K);
  buildFastenings(K);
  buildStones(K);
}
