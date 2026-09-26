/**
 * people/mesh — geometry toolkit for the skinned characters.
 *
 * Every character (and cat) is ONE SkinnedMesh with a vertex-coloured toon
 * material sampling the shared people atlas.  Parts are generated in the
 * character's rest-pose model space (feet at y = 0, facing +Z) and appended
 * to a RigMesh, which records per vertex:
 *
 *   position / normal / uv (atlas) / color / skinIndex / skinWeight / aFlut
 *
 * `aFlut` is the wind flutter amplitude in metres (0 = rigid).  The material's
 * vertex patch (see people.js) displaces those vertices down-wind, so hair tips,
 * skirt hems and scarf ends flutter with sim.wind without CPU work.
 *
 * Generators:
 *   loft(rings, o)        tube through elliptical rings stacked along +Y
 *   strand(points, o)     tapered lens-section ribbon (hair clumps, scarf tails)
 *   ellipsoid(...)        deformable sphere
 *   rbox(...)             rounded box (bags, books, phones)
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();
const _nm = new THREE.Matrix3();

/** UV used for untextured parts (a pure white texel block in the atlas). */
export const WHITE_UV = [0.0305, 0.9695];

export class RigMesh {
  /** @param {Object<string, number>} boneIndex  bone name -> index */
  constructor(boneIndex) {
    this.bi = boneIndex;
    this.P = []; this.N = []; this.UV = []; this.C = []; this.SI = []; this.SW = []; this.F = []; this.I = [];
    this.count = 0;
  }

  /**
   * Append a geometry.
   * o.m      Matrix4 part -> model space
   * o.color  colour | (p, n, t) => colour           (default: geometry 'color' attribute or white)
   * o.bone   bone name | (p, t) => [[name, w], ...]  (required)
   * o.uv     null (white) | (p, n, uvIn, t) => [u, v]
   * o.flut   number | (p, t) => metres
   * o.shade  (p, n, t) => lightness multiplier (hand-painted gradients)
   * `t` is the geometry's 'along' attribute (0..1 root->tip) when present, else 0.
   */
  add(geo, o = {}) {
    const g = geo.index ? geo : geo;
    const pos = g.attributes.position;
    if (!g.attributes.normal) g.computeVertexNormals();
    const nrm = g.attributes.normal;
    const uvA = g.attributes.uv;
    const colA = g.attributes.color;
    const along = g.attributes.along;
    const m = o.m || null;
    if (m) _nm.getNormalMatrix(m);
    const base = this.count;
    const colConst = o.color !== undefined && typeof o.color !== 'function' ? new THREE.Color(o.color) : null;
    const boneConst = typeof o.bone === 'string' ? this.bi[o.bone] : undefined;
    if (typeof o.bone === 'string' && boneConst === undefined) throw new Error(`people: unknown bone ${o.bone}`);
    const uvIn = [0, 0];
    for (let i = 0; i < pos.count; i++) {
      _p.fromBufferAttribute(pos, i);
      _n.fromBufferAttribute(nrm, i);
      if (m) { _p.applyMatrix4(m); _n.applyMatrix3(_nm).normalize(); }
      const t = along ? along.getX(i) : 0;
      this.P.push(_p.x, _p.y, _p.z);
      this.N.push(_n.x, _n.y, _n.z);
      // colour
      if (colConst) _c.copy(colConst);
      else if (typeof o.color === 'function') _c.set(o.color(_p, _n, t));
      else if (colA) _c.fromBufferAttribute(colA, i);
      else _c.setRGB(1, 1, 1);
      if (o.shade) _c.multiplyScalar(o.shade(_p, _n, t));
      this.C.push(_c.r, _c.g, _c.b);
      // uv
      if (typeof o.uv === 'function') {
        if (uvA) { uvIn[0] = uvA.getX(i); uvIn[1] = uvA.getY(i); }
        const uv = o.uv(_p, _n, uvIn, t);
        this.UV.push(uv[0], uv[1]);
      } else this.UV.push(WHITE_UV[0], WHITE_UV[1]);
      // skin
      if (boneConst !== undefined) {
        this.SI.push(boneConst, 0, 0, 0);
        this.SW.push(1, 0, 0, 0);
      } else {
        const list = o.bone(_p, t).filter((e) => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
        let sum = 0;
        for (const e of list) sum += e[1];
        for (let k = 0; k < 4; k++) {
          const e = list[k];
          if (e) {
            const idx = this.bi[e[0]];
            if (idx === undefined) throw new Error(`people: unknown bone ${e[0]}`);
            this.SI.push(idx); this.SW.push(e[1] / sum);
          } else { this.SI.push(0); this.SW.push(0); }
        }
      }
      // flutter amplitude
      const f = typeof o.flut === 'function' ? o.flut(_p, t) : (o.flut || 0);
      this.F.push(f);
    }
    if (g.index) {
      const idx = g.index.array;
      if (o.flip) for (let i = 0; i < idx.length; i += 3) this.I.push(base + idx[i], base + idx[i + 2], base + idx[i + 1]);
      else for (let i = 0; i < idx.length; i++) this.I.push(base + idx[i]);
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        if (o.flip) this.I.push(base + i, base + i + 2, base + i + 1);
        else this.I.push(base + i, base + i + 1, base + i + 2);
      }
    }
    this.count += pos.count;
    return this;
  }

  get empty() { return this.count === 0; }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.UV, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.SI, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.SW, 4));
    g.setAttribute('aFlut', new THREE.Float32BufferAttribute(this.F, 1));
    g.setIndex(this.I);
    g.computeBoundingSphere();
    return g;
  }
}

// ---------------------------------------------------------------------------
// generators
// ---------------------------------------------------------------------------

/**
 * Loft through rings stacked along +Y.
 * rings: [{ y, rx, rz, x = 0, z = 0, c (colour), pleat (0..0.2), sq (squareness 0..1) }]
 * o.seg        segments around (default 16)
 * o.capBottom / o.capTop   close the ends (default true)
 * o.pleats     number of pleats (with ring.pleat amplitude)
 * o.uvWrap     duplicate the seam so u runs 0..1 around (u = 0.5 at the front, +Z);
 *              v = ring index fraction.  Seam normals are welded.
 * o.front      angular range [a0, a1] (radians, 0 = +X, PI/2 = +Z) for open patches
 * Attribute 'along' = ring fraction (0 bottom .. 1 top).
 */
export function loft(rings, o = {}) {
  const seg = o.seg || 16;
  const open = !!o.front;
  const wrap = !!o.uvWrap || open;
  const cols = wrap ? seg + 1 : seg;
  const pos = [], col = [], uv = [], along = [], idx = [];
  const n = rings.length;
  const a0 = open ? o.front[0] : -Math.PI / 2;
  const span = open ? o.front[1] - o.front[0] : Math.PI * 2;
  const cc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = rings[i];
    cc.set(r.c ?? '#ffffff');
    for (let j = 0; j < cols; j++) {
      const a = a0 + (span * j) / seg;
      let ca = Math.cos(a), sa = Math.sin(a);
      if (r.sq) {
        // superellipse-ish squaring for boxy garments
        const e = 1 - r.sq * 0.6;
        ca = Math.sign(ca) * Math.pow(Math.abs(ca), e);
        sa = Math.sign(sa) * Math.pow(Math.abs(sa), e);
      }
      let k = 1;
      if (r.pleat && o.pleats) {
        const ph = ((a - a0) / (Math.PI * 2)) * o.pleats;
        const fr = ph - Math.floor(ph);
        k = 1 + r.pleat * (fr < 0.5 ? fr * 2 : (1 - fr) * 2) - r.pleat * 0.5;
      }
      const ex = r.rx * k * ca;
      const ez = (sa > 0 ? (r.rzf ?? r.rz) : (r.rzb ?? r.rz)) * k * sa;
      pos.push((r.x || 0) + ex, r.y, (r.z || 0) + ez);
      col.push(cc.r, cc.g, cc.b);
      uv.push(1 - j / seg, n > 1 ? i / (n - 1) : 0);
      along.push(n > 1 ? i / (n - 1) : 0);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const j1 = wrap ? j + 1 : (j + 1) % seg;
      const a = i * cols + j, b = i * cols + j1, c = (i + 1) * cols + j, d = (i + 1) * cols + j1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const addCap = (ri, top) => {
    const r = rings[ri];
    const ci = pos.length / 3;
    pos.push(r.x || 0, r.y + (r.dome || 0) * (top ? 1 : -1), r.z || 0);
    cc.set(r.c ?? '#ffffff');
    col.push(cc.r, cc.g, cc.b);
    uv.push(0.5, top ? 1 : 0);
    along.push(top ? 1 : 0);
    for (let j = 0; j < seg; j++) {
      const j1 = wrap ? j + 1 : (j + 1) % seg;
      const a = ri * cols + j, b = ri * cols + j1;
      if (top) idx.push(ci, b, a); else idx.push(ci, a, b);
    }
  };
  if (!open && o.capBottom !== false) addCap(0, false);
  if (!open && o.capTop !== false) addCap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (wrap && !open) weldSeam(g, n, cols);
  return g;
}

/** Average the normals of the duplicated seam column of a wrapped loft. */
function weldSeam(g, rows, cols) {
  const nr = g.attributes.normal;
  for (let i = 0; i < rows; i++) {
    const a = i * cols, b = i * cols + cols - 1;
    const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l);
    nr.setXYZ(b, x / l, y / l, z / l);
  }
}

/**
 * Tapered strand with a lens cross-section, following a polyline.
 * points: Vector3[] (root first).  o.width(t) / o.thick(t) in metres,
 * o.out: Vector3 centre the strand curls around (width axis is tangent x radial),
 * o.twist: extra roll (radians) along the strand, o.seg: cross-section verts (6).
 */
export function strand(points, o = {}) {
  const seg = o.seg || 6;
  const n = points.length;
  const pos = [], along = [], idx = [];
  const T = new THREE.Vector3(), R = new THREE.Vector3(), B = new THREE.Vector3(), Nn = new THREE.Vector3();
  const centre = o.out || new THREE.Vector3();
  // cumulative length for t
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = L[n - 1] || 1;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const t = L[i] / total;
    T.subVectors(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)]).normalize();
    R.subVectors(p, centre);
    if (o.radialAxis) R.copy(o.radialAxis);
    R.addScaledVector(T, -R.dot(T));
    if (R.lengthSq() < 1e-8) R.set(0, 0, 1);
    R.normalize();
    B.crossVectors(T, R).normalize();
    if (o.twist) {
      const tw = o.twist * t;
      const c = Math.cos(tw), s = Math.sin(tw);
      Nn.copy(B).multiplyScalar(c).addScaledVector(R, s);
      R.multiplyScalar(c).addScaledVector(B, -s);
      B.copy(Nn);
    }
    const w = o.width ? o.width(t) : 0.02 * (1 - t);
    const th = o.thick ? o.thick(t) : w * 0.35;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // lens: sharper at the width ends
      const lens = Math.sign(sa) * Math.pow(Math.abs(sa), 0.8);
      pos.push(p.x + B.x * w * ca + R.x * th * lens, p.y + B.y * w * ca + R.y * th * lens, p.z + B.z * w * ca + R.z * th * lens);
      along.push(t);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      const a = i * seg + j, b = i * seg + j1, c = (i + 1) * seg + j, d = (i + 1) * seg + j1;
      idx.push(a, b, c, b, d, c);
    }
  }
  // root cap
  const ci = pos.length / 3;
  pos.push(points[0].x, points[0].y, points[0].z);
  along.push(0);
  for (let j = 0; j < seg; j++) idx.push(ci, (j + 1) % seg, j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  fixWinding(g, points, seg);
  return g;
}

/** Flip a strand's index order if its normals point inward (winding depends on frame handedness). */
function fixWinding(g, points, seg) {
  const nr = g.attributes.normal, ps = g.attributes.position;
  let dot = 0;
  for (let i = 0; i < points.length * seg; i++) {
    _p.fromBufferAttribute(ps, i).sub(points[Math.floor(i / seg)]);
    _n.fromBufferAttribute(nr, i);
    dot += _p.dot(_n);
  }
  if (dot < 0) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.index.needsUpdate = true;
    g.computeVertexNormals();
  }
}

/** Sphere scaled to an ellipsoid, optional per-vertex deform(v: Vector3). */
export function ellipsoid(rx, ry, rz, ws = 12, hs = 8, deform) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    _p.fromBufferAttribute(p, i);
    _p.set(_p.x * rx, _p.y * ry, _p.z * rz);
    if (deform) deform(_p);
    p.setXYZ(i, _p.x, _p.y, _p.z);
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return mergeVerts(g);
}

/** Rounded box centred at the origin. */
export function rbox(w, h, d, r = 0.01, seg = 2) {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  g.deleteAttribute('uv');
  return g;
}

/** Cylinder (origin at the bottom). */
export function cyl(rTop, rBot, h, seg = 10, open = false) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
  g.translate(0, h / 2, 0);
  g.deleteAttribute('uv');
  return g;
}

/** Torus (ring) for handles / wheels, in the XY plane. */
export function torus(r, tube, rs = 6, ts = 16, arc = Math.PI * 2) {
  const g = new THREE.TorusGeometry(r, tube, rs, ts, arc);
  g.deleteAttribute('uv');
  return g;
}

/** Thin tube along points (for straps, spokes, frames). */
export function tube(points, radius = 0.006, radial = 5) {
  const pos = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    t.subVectors(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)]).normalize();
    a.crossVectors(t, Math.abs(t.y) > 0.95 ? _p.set(1, 0, 0) : up).normalize();
    b.crossVectors(t, a).normalize();
    for (let j = 0; j < radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const c = Math.cos(ang), s = Math.sin(ang);
      const p = points[i];
      pos.push(p.x + (a.x * c + b.x * s) * radius, p.y + (a.y * c + b.y * s) * radius, p.z + (a.z * c + b.z * s) * radius);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const j1 = (j + 1) % radial;
      const A = i * radial + j, B = i * radial + j1, C = (i + 1) * radial + j, D = (i + 1) * radial + j1;
      idx.push(A, C, B, B, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // ensure outward winding
  const nr = g.attributes.normal;
  _p.fromBufferAttribute(g.attributes.position, 0).sub(points[0]);
  _n.fromBufferAttribute(nr, 0);
  if (_p.dot(_n) < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const s = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = s; }
    g.computeVertexNormals();
  }
  return g;
}

/** Weld duplicate vertices (sphere seams) so normals are smooth. */
export function mergeVerts(g) {
  const p = g.attributes.position;
  const map = new Map();
  const remap = new Uint32Array(p.count);
  const out = [];
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getY(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`;
    let k = map.get(key);
    if (k === undefined) { k = out.length / 3; map.set(key, k); out.push(p.getX(i), p.getY(i), p.getZ(i)); }
    remap[i] = k;
  }
  const src = g.index ? g.index.array : [...Array(p.count).keys()];
  const idx = [];
  for (let i = 0; i < src.length; i += 3) {
    const a = remap[src[i]], b = remap[src[i + 1]], c = remap[src[i + 2]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  o.setIndex(idx);
  o.computeVertexNormals();
  return o;
}

/** Keep only the triangles whose three vertices pass keep(p). Returns a new indexed geometry. */
export function clip(g, keep) {
  const p = g.attributes.position;
  const src = g.index.array;
  const idx = [];
  const ok = new Uint8Array(p.count);
  for (let i = 0; i < p.count; i++) { _p.fromBufferAttribute(p, i); ok[i] = keep(_p) ? 1 : 0; }
  for (let i = 0; i < src.length; i += 3) if (ok[src[i]] && ok[src[i + 1]] && ok[src[i + 2]]) idx.push(src[i], src[i + 1], src[i + 2]);
  const o = g.clone();
  o.setIndex(idx);
  return o;
}

/** Matrix helper: translate, Euler (YXZ) rotate, scale. */
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _t = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_t.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Matrix placing local +Y along the segment a->b (for limbs / straps), origin at a. */
export function alongSeg(a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return new THREE.Matrix4().compose(a.clone(), q, new THREE.Vector3(1, 1, 1));
}

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Colour mix helper returning a THREE.Color. */
export function mix(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}
