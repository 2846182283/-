/**
 * terrain/common — shared constants, surface heights, the road network
 * description (straight roads, main-street frames, junction corners) and a
 * tiny geometry builder used by every terrain sub-module.
 *
 * Height stack above layout.groundY (keeps flat layers apart at grazing angles):
 *   ground mesh 0 · gravel paths +0.02 · asphalt +0.03 · road decals +0.034
 *   · paint +0.038 · gutter covers +0.05 · gutter rims +0.065 · aprons / plaza +0.07
 */
import * as THREE from 'three';
import { groundY, MAIN_STREET, ROADS, PLAZA, clamp, lerp, smoothstep } from '../../core/layout.js';

export const LIFT = {
  path: 0.02,
  road: 0.03,
  decal: 0.034,
  mark: 0.038,
  gutterTop: 0.05,
  gutterRim: 0.065,
  apron: 0.07,
  plaza: 0.07,
};

/** Asphalt top surface height (all roads sit at groundY + LIFT.road). */
export const roadY = (x, z) => groundY(x, z) + LIFT.road;

export const SF = ROADS.stationFront;
export const CR = ROADS.crossingRoad;
export const NR = ROADS.northRoad;
export const LP = ROADS.leveePath;
export const MS = MAIN_STREET;

// ---------------------------------------------------------------------------
// value noise (deterministic, cheap) for colour variation & placement
// ---------------------------------------------------------------------------
function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, seed = 1) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
/** Fractal noise in [0,1]. */
export function fbm(x, y, seed = 1, oct = 3) {
  let v = 0, amp = 1, tot = 0, f = 1;
  for (let o = 0; o < oct; o++) {
    v += vnoise(x * f, y * f, seed + o * 17) * amp;
    tot += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return v / tot;
}
export { hash2 };

// ---------------------------------------------------------------------------
// main street frames
// ---------------------------------------------------------------------------
/** Frame at arc length s: {x,z,tx,tz,nx,nz}; n points east. */
export const msFrame = (s) => MS.atS(s);
/** Arc length where the main-street asphalt starts (south edge of the station-front road). */
export const MS_S0 = MS.atZ(SF.z + SF.shoulder).s;
export const MS_S1 = MS.length;

/** World point at (s, lateral d) on the main street. */
export function msPoint(s, d) {
  const f = MS.atS(s);
  return { x: f.x + f.nx * d, z: f.z + f.nz * d, f };
}

// ---------------------------------------------------------------------------
// junction corners (rounded kerb fillets)
// ---------------------------------------------------------------------------
/**
 * A junction corner: K = where the two asphalt edges meet, u1 = along road A's
 * edge (away from the junction), u2 = along road B's edge, R = fillet radius,
 * w = gutter width round the arc.  C = K + R(u1+u2) is the arc centre.
 */
function corner(id, K, u1, u2, R, w) {
  const C = { x: K.x + R * (u1.x + u2.x), z: K.z + R * (u1.z + u2.z) };
  return { id, K, u1, u2, R, w, C };
}

function mainCorner(side) {
  // K lies on the SF south asphalt edge, at main-street lateral 4.0 * side
  const f = MS.atS(MS_S0);
  const px = f.x + f.nx * side * MS.shoulder, pz = f.z + f.nz * side * MS.shoulder;
  const zEdge = SF.z + SF.shoulder;
  const k = (zEdge - pz) / f.tz;
  const K = { x: px + f.tx * k, z: zEdge };
  return corner(side < 0 ? 'mainW' : 'mainE', K, { x: side, z: 0 }, { x: f.tx, z: f.tz }, side < 0 ? 1.8 : 1.4, 0.45);
}

export const CORNERS = [
  mainCorner(-1),
  mainCorner(1),
  corner('crSW', { x: CR.x - CR.shoulder, z: SF.z - SF.shoulder }, { x: -1, z: 0 }, { x: 0, z: -1 }, 1.3, 0.35),
  corner('crSE', { x: CR.x + CR.shoulder, z: SF.z - SF.shoulder }, { x: 1, z: 0 }, { x: 0, z: -1 }, 1.6, 0.35),
  corner('crNW', { x: CR.x - CR.shoulder, z: NR.z + NR.shoulder }, { x: -1, z: 0 }, { x: 0, z: 1 }, 1.3, 0.35),
  corner('crNE', { x: CR.x + CR.shoulder, z: NR.z + NR.shoulder }, { x: 1, z: 0 }, { x: 0, z: 1 }, 1.3, 0.35),
];
export const cornerById = (id) => CORNERS.find((c) => c.id === id);

/** Points of a corner arc at radius r from C, from the u1 tangent point to the u2 tangent point. */
export function cornerArc(c, r, n = 8) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 0.5;
    const a = Math.cos(th), b = Math.sin(th);
    pts.push({ x: c.C.x - r * (c.u2.x * a + c.u1.x * b), z: c.C.z - r * (c.u2.z * a + c.u1.z * b) });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// straight-road helpers
// ---------------------------------------------------------------------------
/** Along-road coordinate range of the crossing road's two asphalt pieces (z). */
export const CR_SEGMENTS = [
  { z0: SF.z - SF.shoulder, z1: -26.2 }, // station-front road -> crossing deck (south)
  { z0: -38.0, z1: NR.z + NR.shoulder }, // crossing deck (north) -> north road
];

/** World (x,z) from a straight road's (along, lateral) coords.  Lateral + = south (x roads) / east (z roads). */
export function straightPoint(road, a, d) {
  return road.axis === 'x' ? { x: a, z: road.z + d } : { x: road.x + d, z: a };
}

/** True when (x,z) is on any asphalt (used to keep grass / debris off roads). */
export function onRoad(x, z, margin = 0) {
  if (Math.abs(z - SF.z) < SF.shoulder + margin && x > SF.from && x < SF.to) return true;
  if (Math.abs(z - NR.z) < NR.shoulder + margin && x > NR.from && x < NR.to) return true;
  if (Math.abs(x - CR.x) < CR.shoulder + margin && z > CR.from && z < CR.to) return true;
  if (z > MS.zStart && z < MS.zEnd) {
    const f = MS.atZ(z);
    if (Math.abs((x - f.x) * f.nx + (z - f.z) * f.nz) < MS.shoulder + margin) return true;
  }
  return false;
}

/** True inside the paved station plaza (incl. the east strip and the forecourt around the station). */
export function inPlaza(x, z, margin = 0) {
  if (x > PLAZA.xMin - margin && x < PLAZA.xMax + margin && z > -24 - margin && z < PLAZA.zMax + margin) return true;
  const E = PLAZA.east;
  return x > E.xMin - 0.3 - margin && x < CR.x - CR.gutter[1] + margin && z > E.zMin - margin && z < SF.z - SF.gutter[1] + margin;
}

// ---------------------------------------------------------------------------
// geometry builder
// ---------------------------------------------------------------------------
const WHITE = [1, 1, 1];

/**
 * Accumulates vertices (position, normal, uv, colour) + indices and emits a
 * BufferGeometry.  Normals are either given per vertex or computed.
 */
export class GeoBuilder {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.uv = [];
    this.col = [];
    this.idx = [];
    this.hasNormals = true;
  }
  get count() { return this.pos.length / 3; }
  vert(x, y, z, u = 0, v = 0, c = WHITE, n = null) {
    if (!c) c = WHITE;
    this.pos.push(x, y, z);
    this.uv.push(u, v);
    this.col.push(c[0], c[1], c[2]);
    if (n) this.nrm.push(n[0], n[1], n[2]);
    else { this.nrm.push(0, 1, 0); }
    return this.count - 1;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  /** Quad a-b-c-d (counter-clockwise seen from the front). */
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  /**
   * Grid of (nu+1) x (nv+1) vertices.  fn(i, j) -> [x, y, z, u, v, c?].
   * Winding is chosen so the surface faces up (+y) (or down when faceUp = false).
   */
  grid(nu, nv, fn, faceUp = true) {
    const base = this.count;
    const P = [];
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const r = fn(i, j);
        this.vert(r[0], r[1], r[2], r[3], r[4], r[5] || WHITE);
        P.push(r);
      }
    }
    const W = nu + 1;
    // winding test on the first cell
    const a = P[0], b = P[1], c = P[W];
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const flip = faceUp ? ny < 0 : ny > 0;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const i0 = base + j * W + i, i1 = i0 + 1, i2 = i0 + W + 1, i3 = i0 + W;
        if (flip) this.quad(i0, i3, i2, i1);
        else this.quad(i0, i1, i2, i3);
      }
    }
    return base;
  }
  /** Append another builder's content. */
  append(b) {
    const off = this.count;
    this.pos.push(...b.pos);
    this.nrm.push(...b.nrm);
    this.uv.push(...b.uv);
    this.col.push(...b.col);
    for (const i of b.idx) this.idx.push(i + off);
  }
  build({ computeNormals = false, colors = true } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    if (computeNormals) g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Oriented box ("slab") between two ground points: centre line p0 -> p1,
 * width across, from yBot to yTop (each may be a function of (x,z) for
 * sloped ground).  Adds top + 4 sides.  uvTop(u across 0..1, v along 0..1) maps to the atlas.
 */
export function addSlab(b, p0, p1, width, yBot, yTop, c = WHITE, uvRect = [0, 0, 1, 1], uvScale = null) {
  const dx = p1.x - p0.x, dz = p1.z - p0.z;
  const L = Math.hypot(dx, dz) || 1;
  const tx = dx / L, tz = dz / L;
  const nx = tz, nz = -tx; // right-hand normal
  const hw = width / 2;
  const corners = [
    [p0.x - nx * hw, p0.z - nz * hw],
    [p0.x + nx * hw, p0.z + nz * hw],
    [p1.x + nx * hw, p1.z + nz * hw],
    [p1.x - nx * hw, p1.z - nz * hw],
  ];
  const yb = (x, z) => (typeof yBot === 'function' ? yBot(x, z) : yBot);
  const yt = (x, z) => (typeof yTop === 'function' ? yTop(x, z) : yTop);
  const [u0, v0, u1, v1] = uvRect;
  const us = uvScale ? uvScale[0] : 1, vs = uvScale ? uvScale[1] : 1;
  // top
  const tUV = [[u0, v0], [u0 + (u1 - u0) * us, v0], [u0 + (u1 - u0) * us, v0 + (v1 - v0) * vs], [u0, v0 + (v1 - v0) * vs]];
  const top = corners.map(([x, z], i) => b.vert(x, yt(x, z), z, tUV[i][0], tUV[i][1], c, [0, 1, 0]));
  // corners order: p0-left, p0-right, p1-right, p1-left.  Seen from above that is clockwise
  // when (t, n) is right-handed, so emit reversed to face up.
  b.quad(top[0], top[3], top[2], top[1]);
  // sides: each edge (i -> i+1) gets an outward face
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 4];
    const ex = bx - ax, ez = bz - az;
    const el = Math.hypot(ex, ez) || 1;
    const on = [ez / el, 0, -ex / el]; // outward for clockwise ring
    const sv = 0.02 * (v1 - v0);
    const a0 = b.vert(ax, yb(ax, az), az, u0, v0, c, on);
    const b0 = b.vert(bx, yb(bx, bz), bz, u1, v0, c, on);
    const b1 = b.vert(bx, yt(bx, bz), bz, u1, v0 + sv, c, on);
    const a1 = b.vert(ax, yt(ax, az), az, u0, v0 + sv, c, on);
    b.quad(a0, a1, b1, b0);
  }
}

/** Convert a hex/Color to a linear [r,g,b] array (vertex colours are linear). */
export function lin(c, mul = 1) {
  const col = new THREE.Color(c);
  return [col.r * mul, col.g * mul, col.b * mul];
}
export function mixLin(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export { clamp, lerp, smoothstep, groundY };
