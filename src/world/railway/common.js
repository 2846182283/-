/**
 * railway/common.js — shared constants, zone predicates and geometry helpers
 * for the railway module.
 *
 * Geometry is collected into "buckets" (one bucket = one material + outline /
 * shadow flags).  Every static part is transformed into railway space, painted
 * with a vertex colour and merged at the end with ctx.geom.merge, so the whole
 * railway costs one draw call per bucket (plus a few InstancedMeshes).
 */
import * as THREE from 'three';
import { RAIL, PLATFORM, STATION, CROSSING, WALK_BOUNDS } from '../../core/layout.js';

// ---------------------------------------------------------------------------
// derived constants
// ---------------------------------------------------------------------------
export const TRK = {
  A: RAIL.tracks.find((t) => t.id === 'A'),
  B: RAIL.tracks.find((t) => t.id === 'B'),
  /** lateral offset of each rail centre from the track centre */
  railOff: RAIL.gauge / 2 + 0.033,
  headHalf: 0.033,
  railBase: 0.315, // rail foot underside (sits on a 5 mm pad on the sleeper)
  sleeperLen: 2.0,
  xMin: RAIL.xMin,
  xMax: RAIL.xMax,
};
TRK.zMid = (TRK.A.z + TRK.B.z) / 2;
TRK.byId = { A: TRK.A, B: TRK.B };
/** outward side (+1 = +z) of each track: A is the southern track, B the northern */
TRK.outer = { A: Math.sign(TRK.A.z - TRK.zMid), B: Math.sign(TRK.B.z - TRK.zMid) };

export const ZONE = {
  /** platforms incl. their end ramps (station.js) */
  platform: [PLATFORM.xMin - PLATFORM.rampLength, PLATFORM.xMax + PLATFORM.rampLength],
  /** corridor fences are left to station.js inside this range */
  fenceSkip: [PLATFORM.xMin - PLATFORM.rampLength - 6, PLATFORM.xMax + 1],
  /** "near" detail range (walkable area plus a margin) */
  near: [WALK_BOUNDS.xMin - 12, WALK_BOUNDS.xMax + 12],
  /** full fastenings only here (station, crossing, their approaches) */
  detail: [-105, 75],
};

/**
 * Spatial chunks along the line (x edges).  Merged buckets, sleepers, stones
 * and fastenings are split per chunk so frustum culling (main, outline and
 * shadow passes) only draws the part of the 880 m railway that is in view.
 * 80 m chunks around the station / crossing, coarse ones out in the country:
 * every chunk costs ~10 draw calls, so this is a balance between culling and
 * call count (a view along the line sees 4-5 chunks).
 */
export const CHUNK_EDGES = [-440, -200, -110, -30, 50, 130, 440];
/** Chunks whose sleepers keep outlines (centre within ~80 m of the platforms). */
export const OUTLINE_X = [PLATFORM.xMin - 80, PLATFORM.xMax + 80];

/** Index of the chunk containing x (clamped to the ends). */
export function chunkOf(x) {
  const E = CHUNK_EDGES;
  for (let i = 1; i < E.length - 1; i++) if (x < E[i]) return i - 1;
  return E.length - 2;
}

/** Split [x0, x1] at chunk edges -> [[a, b], ...] (for long straight parts). */
export function chunkSpans(x0, x1) {
  const out = [];
  let a = x0;
  for (const e of CHUNK_EDGES) {
    if (e > a + 1e-6 && e < x1 - 1e-6) { out.push([a, e]); a = e; }
  }
  out.push([a, x1]);
  return out;
}

/** Does chunk i lie (mostly) in the outlined near range? */
export function chunkOutlined(i) {
  const m = (CHUNK_EDGES[i] + CHUNK_EDGES[i + 1]) / 2;
  return m > OUTLINE_X[0] && m < OUTLINE_X[1];
}

/**
 * Split an indexed geometry into per-chunk geometries by triangle centroid x.
 * Returns [{ chunk, geometry }]; vertices are compacted per chunk so bounding
 * volumes are tight.
 */
export function splitByChunks(g) {
  const idx = g.index.array;
  const pos = g.attributes.position.array;
  const nTri = idx.length / 3;
  const nC = CHUNK_EDGES.length - 1;
  const triC = new Uint8Array(nTri);
  const counts = new Uint32Array(nC);
  for (let t = 0; t < nTri; t++) {
    const cx = (pos[idx[t * 3] * 3] + pos[idx[t * 3 + 1] * 3] + pos[idx[t * 3 + 2] * 3]) / 3;
    const c = chunkOf(cx);
    triC[t] = c;
    counts[c]++;
  }
  const used = [];
  for (let c = 0; c < nC; c++) if (counts[c]) used.push(c);
  if (used.length === 1) return [{ chunk: used[0], geometry: g }];
  const nV = g.attributes.position.count;
  const remap = new Int32Array(nV);
  const names = Object.keys(g.attributes);
  const out = [];
  for (const c of used) {
    remap.fill(-1);
    const order = [];
    const ni = new Uint32Array(counts[c] * 3);
    let k = 0;
    for (let t = 0; t < nTri; t++) {
      if (triC[t] !== c) continue;
      for (let j = 0; j < 3; j++) {
        const v = idx[t * 3 + j];
        if (remap[v] < 0) { remap[v] = order.length; order.push(v); }
        ni[k++] = remap[v];
      }
    }
    const ng = new THREE.BufferGeometry();
    for (const name of names) {
      const a = g.attributes[name];
      const sz = a.itemSize;
      const src = a.array;
      const dst = new Float32Array(order.length * sz);
      for (let i = 0; i < order.length; i++) for (let s = 0; s < sz; s++) dst[i * sz + s] = src[order[i] * sz + s];
      ng.setAttribute(name, new THREE.BufferAttribute(dst, sz));
    }
    ng.setIndex(new THREE.BufferAttribute(order.length > 65535 ? ni : new Uint16Array(ni), 1));
    out.push({ chunk: c, geometry: ng });
  }
  g.dispose();
  return out;
}

/** Deterministic thinning by ctx.lod.density: keep() is true for ~density of calls. */
export function thinner(rng, density) {
  if (density >= 0.999) return () => true;
  return () => rng() < density;
}

export const inCrossing = (x, pad = 0) => Math.abs(x - CROSSING.x) < 3.2 + pad;
export const inInternalCrossing = (x, pad = 0) => Math.abs(x - STATION.internalCrossingX) < 1.7 + pad;
export const inPlatformX = (x, pad = 0) => x > ZONE.platform[0] - pad && x < ZONE.platform[1] + pad;
export const isNear = (x) => x > ZONE.near[0] && x < ZONE.near[1];
export const inRange = (x, r, pad = 0) => x > r[0] - pad && x < r[1] + pad;

/** Smooth 1D value noise (deterministic) built from a few hashed sines. */
export function wobble(x, seed = 0) {
  const s = seed * 12.9898;
  return (
    Math.sin(x * 0.73 + s) * 0.5 +
    Math.sin(x * 1.91 + s * 1.7) * 0.3 +
    Math.sin(x * 4.37 + s * 3.1) * 0.2
  );
}

// ---------------------------------------------------------------------------
// transforms & painting
// ---------------------------------------------------------------------------
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Matrix from position / YXZ euler / scale (a fresh Matrix4). */
export function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

const _c = new THREE.Color();
/** Flat vertex colour (overwrites) — like geom.paint but reuses a temp Color. */
export function paint(g, color) {
  _c.set(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Hex colour jittered in lightness (hand-painted variation). */
export function jitter(color, rng, amount = 0.04, hue = 0) {
  _c.set(color);
  const hsl = {};
  _c.getHSL(hsl);
  _c.setHSL((hsl.h + (rng() - 0.5) * hue + 1) % 1, hsl.s, THREE.MathUtils.clamp(hsl.l + (rng() - 0.5) * 2 * amount, 0, 1));
  return '#' + _c.getHexString();
}

/** Box without its bottom face (saves triangles on things that sit on the ground). */
export function openBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z (6 indices each quad) -> drop -y (group 3)
  const idx = g.index.array;
  const keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (i >= 18 && i < 24) continue;
    keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  g.setIndex(keep);
  g.clearGroups();
  return g;
}

// ---------------------------------------------------------------------------
// profile sweep: extrude a 2D cross-section (d = lateral, y = height) along a
// polyline in the XZ plane.  Hard edges between profile edges (toon friendly),
// smooth along the path.  Vertex colour per edge.
// ---------------------------------------------------------------------------
/**
 * @param {{x:number,z:number}[]} path   centreline points (XZ)
 * @param {(j:number)=>number[][]|number[][]} profile  [[d,y],...] (CCW when d points right / y up), or fn(j)
 * @param {(string|[string,string])[]} colors  per profile edge; a pair = colour at edge start / end
 * @param {object} o  closed (profile loop), caps (end caps for closed profiles), uvScale (world metres per UV unit)
 */
export function sweep(path, profile, colors, o = {}) {
  const closed = !!o.closed;
  const prof = typeof profile === 'function' ? profile : () => profile;
  const P0 = prof(0);
  const nE = closed ? P0.length : P0.length - 1;
  const n = path.length;
  const uvS = o.uvScale || 1;
  // per path point frame
  const lat = [];
  const along = [0];
  for (let j = 0; j < n; j++) {
    const a = path[Math.max(0, j - 1)], b = path[Math.min(n - 1, j + 1)];
    let tx = b.x - a.x, tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    lat.push([-tz, tx]);
    if (j > 0) along.push(along[j - 1] + Math.hypot(path[j].x - path[j - 1].x, path[j].z - path[j - 1].z));
  }
  const profs = [];
  for (let j = 0; j < n; j++) profs.push(prof(j));
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const ca = new THREE.Color(), cb = new THREE.Color();
  // cumulative profile length for v coordinates
  for (let e = 0; e < nE; e++) {
    const c = colors[Math.min(e, colors.length - 1)];
    ca.set(Array.isArray(c) ? c[0] : c);
    cb.set(Array.isArray(c) ? c[1] : c);
    const base = pos.length / 3;
    for (let j = 0; j < n; j++) {
      const pr = profs[j];
      const p0 = pr[e], p1 = pr[(e + 1) % pr.length];
      const dd = p1[0] - p0[0], dy = p1[1] - p0[1];
      const len = Math.hypot(dd, dy) || 1;
      const nd = dy / len, ny = -dd / len; // outward normal of a CCW profile
      const [lx, lz] = lat[j];
      const P = path[j];
      let v0 = 0;
      for (let k = 0; k < e; k++) { const q0 = pr[k], q1 = pr[(k + 1) % pr.length]; v0 += Math.hypot(q1[0] - q0[0], q1[1] - q0[1]); }
      for (const [pt, cc, v] of [[p0, ca, v0], [p1, cb, v0 + len]]) {
        pos.push(P.x + lx * pt[0], pt[1], P.z + lz * pt[0]);
        nor.push(lx * nd, ny, lz * nd);
        uv.push(along[j] / uvS, v / uvS);
        col.push(cc.r, cc.g, cc.b);
      }
    }
    for (let j = 0; j < n - 1; j++) {
      const a = base + j * 2, b = a + 1, c2 = a + 2, d = a + 3;
      idx.push(a, c2, b, b, c2, d);
    }
  }
  // winding check on the first quad: flip everything if it faces inward
  if (idx.length) {
    const i0 = idx[0] * 3, i1 = idx[1] * 3, i2 = idx[2] * 3;
    const ax = pos[i1] - pos[i0], ay = pos[i1 + 1] - pos[i0 + 1], az = pos[i1 + 2] - pos[i0 + 2];
    const bx = pos[i2] - pos[i0], by = pos[i2 + 1] - pos[i0 + 1], bz = pos[i2 + 2] - pos[i0 + 2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    if (fx * nor[i0] + fy * nor[i0 + 1] + fz * nor[i0 + 2] < 0) {
      for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    }
  }
  if (closed && o.caps !== false) {
    const capCol = new THREE.Color(o.capColor || (Array.isArray(colors[0]) ? colors[0][0] : colors[0]));
    const tri = THREE.ShapeUtils.triangulateShape(P0.map(([d, y]) => new THREE.Vector2(d, y)), []);
    for (const [j, sgn] of [[0, -1], [n - 1, 1]]) {
      const pr = profs[j];
      const [lx, lz] = lat[j];
      const P = path[j];
      // tangent = (lz, -lx) rotated back: t = (tx, tz) with lat = (-tz, tx)
      const tx = lz, tz = -lx;
      const base = pos.length / 3;
      for (const pt of pr) {
        pos.push(P.x + lx * pt[0], pt[1], P.z + lz * pt[0]);
        nor.push(tx * sgn, 0, tz * sgn);
        uv.push(pt[0], pt[1]);
        col.push(capCol.r, capCol.g, capCol.b);
      }
      for (const t of tri) {
        // check orientation against the cap normal
        const a = base + t[0], b = base + t[1], c = base + t[2];
        const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
        const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
        const fx = ay * bz - az * by, fz = ax * by - ay * bx;
        if (fx * tx * sgn + fz * tz * sgn >= 0) idx.push(a, b, c);
        else idx.push(a, c, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/** Straight path helper (XZ points) from (x0,z) to (x1,z) with optional intermediate step. */
export function straightPath(x0, x1, z, step = 0) {
  const pts = [];
  if (!step) return [{ x: x0, z }, { x: x1, z }];
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  for (let i = 0; i <= n; i++) pts.push({ x: x0 + ((x1 - x0) * i) / n, z });
  return pts;
}

// ---------------------------------------------------------------------------
// Buckets: collect painted geometry per material/flags, merge at the end.
// ---------------------------------------------------------------------------
export class Buckets {
  constructor(geom) {
    this.geom = geom;
    this.defs = new Map();
    this.lists = new Map();
  }
  /** define a bucket: material + flags {noOutline, cast, receive, renderOrder, keep, low, chunk} */
  define(key, material, flags = {}) {
    this.defs.set(key, { material, ...flags });
    this.lists.set(key, []);
  }
  /** make `key` an alias of an existing bucket (same material / flags / draw call) */
  alias(key, target) {
    this.defs.set(key, { aliasOf: target });
    this.lists.set(key, this.lists.get(target));
  }
  /** push a geometry (already in railway space).  color: paints it (unless it already has colours and color is null) */
  add(key, g, color = null, matrix = null) {
    if (matrix) g.applyMatrix4(matrix);
    if (color !== null && color !== undefined) paint(g, color);
    else if (!g.attributes.color) paint(g, '#ffffff');
    let list = this.lists.get(key);
    if (!list) throw new Error(`railway: unknown bucket ${key}`);
    // low pieces (flat lids, slabs, rails of fences...) go to the non-casting twin bucket
    const def = this.defs.get(key);
    if (def.low) {
      if (!g.boundingBox) g.computeBoundingBox();
      if (g.boundingBox.max.y - g.boundingBox.min.y < 0.3) list = this.lists.get(def.low);
      g.boundingBox = null;
    }
    list.push(g);
    return g;
  }
  /** box centred at (x,y,z) */
  box(key, w, h, d, color, x, y, z, ry = 0, rx = 0, rz = 0) {
    return this.add(key, new THREE.BoxGeometry(w, h, d), color, mtx(x, y, z, rx, ry, rz));
  }
  /** box standing on y (bottom face removed) */
  block(key, w, h, d, color, x, y, z, ry = 0) {
    const g = openBox(w, h, d);
    return this.add(key, g, color, mtx(x, y + h / 2, z, 0, ry, 0));
  }
  /** cylinder with its base at (x,y,z); rx/rz tilt it */
  cyl(key, rTop, rBot, h, color, x, y, z, seg = 8, rx = 0, ry = 0, rz = 0, open = false) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    g.translate(0, h / 2, 0);
    return this.add(key, g, color, mtx(x, y, z, rx, ry, rz));
  }
  /** bar (thin box) between two 3D points */
  bar(key, a, b, t, color, t2 = t) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    const g = new THREE.BoxGeometry(t, len, t2);
    const m = new THREE.Matrix4();
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), q, new THREE.Vector3(1, 1, 1));
    return this.add(key, g, color, m);
  }
  /** round tube between two points (radial segments) */
  tube(key, a, b, r, color, seg = 6, closed = false) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, !closed);
    const m = new THREE.Matrix4();
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), q, new THREE.Vector3(1, 1, 1));
    return this.add(key, g, color, m);
  }
  count(key) {
    return this.lists.get(key)?.length || 0;
  }
  /** merge every bucket and split it into x chunks -> array of meshes */
  finish() {
    const out = [];
    for (const [key, list] of this.lists) {
      const def = this.defs.get(key);
      if (!list.length || def.aliasOf) continue;
      const merged = this.geom.merge(list, def.keep || ['color']);
      if (!merged) continue;
      // tiny buckets (sign faces, fence panels) stay whole: one call beats culling a few quads
      const parts = def.chunk === false ? [{ chunk: 'all', geometry: merged }] : splitByChunks(merged);
      for (const { chunk, geometry } of parts) {
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
        const mesh = new THREE.Mesh(geometry, def.material);
        mesh.name = `railway:${key}@${chunk}`;
        mesh.castShadow = !!def.cast;
        mesh.receiveShadow = def.receive !== false;
        if (def.noOutline) mesh.userData.noOutline = true;
        if (def.renderOrder) mesh.renderOrder = def.renderOrder;
        out.push(mesh);
      }
    }
    return out;
  }
}
