/**
 * Geometry accumulator for the houses module.
 *
 * ~120 houses x hundreds of parts would be far too slow to build as individual
 * THREE.Mesh objects and merge afterwards, so every part is written straight
 * into per-(chunk, material-kind) vertex buckets.  At the end each bucket
 * becomes ONE mesh: a handful of draw calls per chunk for the whole district.
 *
 *   B.setBase(lotMatrix)          lot-local -> world transform
 *   B.push(m) / B.pop()           nested frames (facades, props...)
 *   B.quad / tri / box / hexa / beam / cyl / geo / stamp   emitters
 *
 * Points are plain [x, y, z] arrays in the CURRENT frame.  Colours are hex
 * strings (converted once to linear RGB and cached) and are written as vertex
 * colours: most materials are white * vertexColor, so a single material can
 * paint thousands of differently coloured parts.
 */
import * as THREE from 'three';

const colorCache = new Map();
/** '#rrggbb' -> linear [r, g, b] (cached). */
export function rgb(hex) {
  let c = colorCache.get(hex);
  if (!c) {
    const col = new THREE.Color(hex);
    c = [col.r, col.g, col.b];
    colorCache.set(hex, c);
  }
  return c;
}

const _m = new THREE.Matrix4();
const _n3 = new THREE.Matrix3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function newBucket() {
  return { pos: [], nrm: [], uv: [], col: [], sway: [], idx: [], n: 0 };
}

export class Batcher {
  /**
   * @param {Object<string, {material, noOutline?, castShadow?, sway?}>} kinds
   */
  constructor(kinds = {}) {
    this.kinds = kinds;
    this.buckets = new Map();
    this.chunk = 'c0';
    this.M = new THREE.Matrix4();
    this.N = new THREE.Matrix3();
    this.stack = [];
    this.sway = 0; // current per-vertex sway weight (laundry / chimes)
    this.swayFn = null; // optional (worldY) -> sway
    this.tris = 0;
  }

  setChunk(id) { this.chunk = id; }

  setBase(m) {
    this.stack.length = 0;
    this.M.copy(m);
    this.N.getNormalMatrix(this.M);
  }

  push(m) {
    this.stack.push(this.M.clone());
    this.M.multiply(m);
    this.N.getNormalMatrix(this.M);
  }

  /** Push a simple translate + yaw frame. */
  pushT(x, y, z, ry = 0) {
    _m.makeRotationY(ry).setPosition(x, y, z);
    this.push(_m);
  }

  pop() {
    this.M.copy(this.stack.pop());
    this.N.getNormalMatrix(this.M);
  }

  bucket(kind) {
    const key = `${this.chunk}|${kind}`;
    let b = this.buckets.get(key);
    if (!b) {
      b = newBucket();
      b.kind = kind;
      b.chunk = this.chunk;
      this.buckets.set(key, b);
    }
    return b;
  }

  // -- low level -------------------------------------------------------------
  _v(b, p, nx, ny, nz, u, v, col) {
    _a.set(p[0], p[1], p[2]).applyMatrix4(this.M);
    _b.set(nx, ny, nz).applyMatrix3(this.N).normalize();
    b.pos.push(_a.x, _a.y, _a.z);
    b.nrm.push(_b.x, _b.y, _b.z);
    b.uv.push(u, v);
    b.col.push(col[0], col[1], col[2]);
    b.sway.push(this.swayFn ? this.swayFn(p) : this.sway);
    return b.n++;
  }

  /** Face normal of polygon points (Newell) in the current frame's local space. */
  static normalOf(pts) {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length];
      nx += (a[1] - c[1]) * (a[2] + c[2]);
      ny += (a[2] - c[2]) * (a[0] + c[0]);
      nz += (a[0] - c[0]) * (a[1] + c[1]);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  }

  /**
   * Convex polygon (CCW seen from the front).  uvs: array of [u,v] per point
   * or null.  color: hex or [r,g,b].
   */
  poly(kind, pts, color, uvs = null, normal = null) {
    const b = this.bucket(kind);
    const col = typeof color === 'string' ? rgb(color) : color;
    const n = normal || Batcher.normalOf(pts);
    const base = b.n;
    for (let i = 0; i < pts.length; i++) {
      const uv = uvs ? uvs[i] : ZERO_UV;
      this._v(b, pts[i], n[0], n[1], n[2], uv[0], uv[1], col);
    }
    for (let i = 1; i < pts.length - 1; i++) b.idx.push(base, base + i, base + i + 1);
    this.tris += pts.length - 2;
  }

  quad(kind, a, b, c, d, color, uvs = null) { this.poly(kind, [a, b, c, d], color, uvs); }
  tri(kind, a, b, c, color, uvs = null) { this.poly(kind, [a, b, c], color, uvs); }

  /**
   * Axis-aligned box in the current frame from min to max corner.
   * opts.skip: string of faces to omit: 'x' (-x) 'X' (+x) 'y' 'Y' 'z' 'Z'
   * opts.uv: (face, p) => [u, v]   (textured kinds)
   * opts.colors: {Y: '#..', ...} per-face colour override
   */
  box(kind, x0, y0, z0, x1, y1, z1, color, opts = {}) {
    const skip = opts.skip || '';
    const uvf = opts.uv;
    const fc = opts.colors;
    const faces = BOX_FACES;
    for (let f = 0; f < 6; f++) {
      const F = faces[f];
      if (skip.includes(F.id)) continue;
      const pts = F.c.map((k) => [k[0] ? x1 : x0, k[1] ? y1 : y0, k[2] ? z1 : z0]);
      const uvs = uvf ? pts.map((p) => uvf(F.id, p)) : null;
      this.poly(opts.kinds?.[F.id] || kind, pts, (fc && fc[F.id]) || color, uvs, F.n);
    }
  }

  /** Box by centre + size (+ optional yaw about its centre). */
  boxC(kind, cx, cy, cz, sx, sy, sz, color, opts = {}) {
    if (opts.ry) {
      this.pushT(cx, cy, cz, opts.ry);
      this.box(kind, -sx / 2, -sy / 2, -sz / 2, sx / 2, sy / 2, sz / 2, color, opts);
      this.pop();
    } else {
      this.box(kind, cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, color, opts);
    }
  }

  /**
   * Hexahedron from 8 points: top quad t0..t3 (CCW seen from above) and the
   * matching bottom quad b0..b3.  spec: { top, bottom, sides[4] } each
   * {kind, color, uv?:(p)=>[u,v]} or null to skip.  Side i joins t_i -> t_{i+1}.
   */
  hexa(t, bt, spec) {
    const face = (s, pts) => {
      if (!s) return;
      // skip degenerate faces (hip triangles)
      const n = Batcher.normalOf(pts);
      if (!isFinite(n[0]) || (n[0] === 0 && n[1] === 0 && n[2] === 0)) return;
      const clean = dedupe(pts);
      if (clean.length < 3) return;
      this.poly(s.kind, clean, s.color, s.uv ? clean.map(s.uv) : null, n);
    };
    face(spec.top, [t[0], t[1], t[2], t[3]]);
    face(spec.bottom, [bt[3], bt[2], bt[1], bt[0]]);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      face(spec.sides ? spec.sides[i] : null, [bt[i], bt[j], t[j], t[i]]);
    }
  }

  /**
   * Box stretched along the segment p0 -> p1 (width across, height along
   * `up`).  Used for barge boards, hip ridges, diagonal pipes, rails.
   */
  beam(kind, p0, p1, w, h, color, opts = {}) {
    _a.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const len = _a.length();
    if (len < 1e-5) return;
    _a.divideScalar(len);
    const up = opts.up ? _c.set(opts.up[0], opts.up[1], opts.up[2]) : _c.copy(_up);
    if (Math.abs(_a.dot(up)) > 0.99) up.set(1, 0, 0);
    _b.crossVectors(up, _a).normalize(); // side
    up.crossVectors(_a, _b).normalize();
    const m = new THREE.Matrix4().makeBasis(_b, up, _a); // local x = side, y = up, z = along
    m.setPosition(p0[0], p0[1], p0[2]);
    this.push(m);
    const oy = opts.centerY ? -h / 2 : 0;
    this.box(kind, -w / 2, oy, 0, w / 2, oy + h, len, color, { skip: opts.skip });
    this.pop();
  }

  /** Cylinder (n sides) between p0 and p1.  Caps optional. */
  cyl(kind, p0, p1, r, color, n = 6, opts = {}) {
    _a.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const len = _a.length();
    if (len < 1e-5) return;
    _a.divideScalar(len);
    const up = _c.copy(Math.abs(_a.y) > 0.99 ? X_AXIS : _up);
    _b.crossVectors(up, _a).normalize();
    up.crossVectors(_a, _b).normalize();
    const m = new THREE.Matrix4().makeBasis(_b, up, _a);
    m.setPosition(p0[0], p0[1], p0[2]);
    this.push(m);
    const r1 = opts.r1 ?? r;
    const b = this.bucket(kind);
    const col = typeof color === 'string' ? rgb(color) : color;
    const base = b.n;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cx = Math.cos(a), sy = Math.sin(a);
      this._v(b, [cx * r, sy * r, 0], cx, sy, 0, i / n, 0, col);
      this._v(b, [cx * r1, sy * r1, len], cx, sy, 0, i / n, 1, col);
    }
    for (let i = 0; i < n; i++) {
      const k = base + i * 2;
      b.idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    this.tris += n * 2;
    if (opts.caps !== false) {
      const capPts = (rr, z, flip) => {
        const pts = [];
        for (let i = 0; i < n; i++) {
          const a = ((flip ? n - i : i) / n) * Math.PI * 2;
          pts.push([Math.cos(a) * rr, Math.sin(a) * rr, z]);
        }
        return pts;
      };
      if (opts.caps !== 'end') this.poly(kind, capPts(r, 0, true), col, null, [0, 0, -1]);
      if (opts.caps !== 'start') this.poly(kind, capPts(r1, len, false), col, null, [0, 0, 1]);
    }
    this.pop();
  }

  /** Polyline tube (pipes, cables).  pts: [[x,y,z]...] */
  pipe(kind, pts, r, color, n = 6) {
    for (let i = 0; i < pts.length - 1; i++) this.cyl(kind, pts[i], pts[i + 1], r, color, n, { caps: i === 0 ? (pts.length === 2 ? true : 'start') : i === pts.length - 2 ? 'end' : false });
    // joints: small boxes hide the gaps at bends
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      this.boxC(kind, p[0], p[1], p[2], r * 2.05, r * 2.05, r * 2.05, color);
    }
  }

  /**
   * Stamp a template geometry (see toTemplate / fromGeometry) with a local
   * matrix.  tint multiplies the template's vertex colours.
   */
  stamp(tpl, m, tint = null) {
    if (m) this.push(m);
    for (const part of tpl) {
      const b = this.bucket(part.kind);
      const base = b.n;
      const P = part.pos, Nn = part.nrm, U = part.uv, C = part.col, S = part.sway;
      const tc = tint ? (typeof tint === 'string' ? rgb(tint) : tint) : null;
      for (let i = 0; i < P.length / 3; i++) {
        _a.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(this.M);
        _b.set(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]).applyMatrix3(this.N).normalize();
        b.pos.push(_a.x, _a.y, _a.z);
        b.nrm.push(_b.x, _b.y, _b.z);
        b.uv.push(U[i * 2], U[i * 2 + 1]);
        if (tc) b.col.push(C[i * 3] * tc[0], C[i * 3 + 1] * tc[1], C[i * 3 + 2] * tc[2]);
        else b.col.push(C[i * 3], C[i * 3 + 1], C[i * 3 + 2]);
        b.sway.push(S ? S[i] : this.sway);
        b.n++;
      }
      for (const k of part.idx) b.idx.push(base + k);
      this.tris += part.idx.length / 3;
    }
    if (m) this.pop();
  }

  /** Stamp a THREE.BufferGeometry into `kind` with a colour. */
  geo(kind, g, m, color) {
    const tpl = fromGeometry(g, kind, color);
    this.stamp(tpl, m);
  }

  /** Export all buckets (single chunk) as a reusable template. */
  toTemplate() {
    const out = [];
    for (const b of this.buckets.values()) {
      out.push({ kind: b.kind, pos: b.pos, nrm: b.nrm, uv: b.uv, col: b.col, sway: b.sway.some((s) => s !== 0) ? b.sway : null, idx: b.idx });
    }
    return out;
  }

  /**
   * Build the final meshes.  Returns a Group with one mesh per (chunk, kind).
   */
  build(name = 'batch') {
    const group = new THREE.Group();
    group.name = name;
    for (const b of this.buckets.values()) {
      if (!b.n) continue;
      const K = this.kinds[b.kind];
      if (!K) throw new Error(`houses: unknown kind ${b.kind}`);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      if (K.sway) g.setAttribute('sway', new THREE.Float32BufferAttribute(b.sway, 1));
      g.setIndex(b.n > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, K.material);
      mesh.name = `${name}:${b.chunk}:${b.kind}`;
      mesh.castShadow = !!K.castShadow;
      mesh.receiveShadow = K.receiveShadow !== false;
      if (K.noOutline) mesh.userData.noOutline = true;
      if (K.renderOrder) mesh.renderOrder = K.renderOrder;
      group.add(mesh);
    }
    return group;
  }
}

const ZERO_UV = [0, 0];
const X_AXIS = new THREE.Vector3(1, 0, 0);

// corner selectors (0 = min, 1 = max) per face, CCW seen from outside
const BOX_FACES = [
  { id: 'X', n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { id: 'x', n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { id: 'Y', n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { id: 'y', n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { id: 'Z', n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { id: 'z', n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

function dedupe(pts) {
  const out = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (q && Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) + Math.abs(q[2] - p[2]) < 1e-6) continue;
    out.push(p);
  }
  if (out.length > 1) {
    const a = out[0], z = out[out.length - 1];
    if (Math.abs(a[0] - z[0]) + Math.abs(a[1] - z[1]) + Math.abs(a[2] - z[2]) < 1e-6) out.pop();
  }
  return out;
}

/** Convert a BufferGeometry into a template (single kind, flat colour). */
export function fromGeometry(g, kind, color = '#ffffff') {
  const src = g.index ? g : g;
  const pos = Array.from(src.attributes.position.array);
  const nrm = src.attributes.normal ? Array.from(src.attributes.normal.array) : null;
  const n = pos.length / 3;
  const uv = src.attributes.uv ? Array.from(src.attributes.uv.array) : new Array(n * 2).fill(0);
  const c = typeof color === 'string' ? rgb(color) : color;
  const col = [];
  if (src.attributes.color) {
    const a = src.attributes.color.array;
    for (let i = 0; i < n; i++) col.push(a[i * 3] * c[0], a[i * 3 + 1] * c[1], a[i * 3 + 2] * c[2]);
  } else for (let i = 0; i < n; i++) col.push(c[0], c[1], c[2]);
  let idx;
  if (src.index) idx = Array.from(src.index.array);
  else { idx = []; for (let i = 0; i < n; i++) idx.push(i); }
  let normals = nrm;
  if (!normals) {
    const tmp = src.clone();
    tmp.computeVertexNormals();
    normals = Array.from(tmp.attributes.normal.array);
  }
  return [{ kind, pos, nrm: normals, uv, col, sway: null, idx }];
}

/** Make a template by drawing into a scratch batcher: fn(B). */
export function makeTemplate(fn) {
  const t = new Batcher({});
  fn(t);
  return t.toTemplate();
}

/** Helper: Matrix4 from translation / yaw / scale. */
export function mtx(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  return m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}
