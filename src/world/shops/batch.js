/**
 * Geometry accumulator for the shops module.
 *
 * Shops are made of thousands of small parts (mullions, goods on shelves,
 * flower heads, lantern ribs...).  Building each as a THREE.Mesh and merging
 * afterwards would be slow, so every part is written straight into
 * per-(chunk, kind) vertex buckets.  finish() turns each bucket into ONE mesh.
 *
 *   B.setBase(m)             lot-local -> world transform
 *   B.pushT(x,y,z,ry,rx,rz)  nested frames;  B.pop()
 *   B.box / boxC / boxB      axis aligned boxes (per-face colours, atlas rects,
 *                            metric UVs for repeating textures)
 *   B.quad                   textured plane facing +Z (signs, posters, decals)
 *   B.poly                   arbitrary convex polygon
 *   B.geo / cyl / sphere     any THREE geometry (cached primitives)
 *   B.beam / tube            boxes / tubes along segments
 *
 * Colours are '#rrggbb' strings (sRGB) converted once to linear vertex
 * colours; most materials are white * vertexColor * texture, so one material
 * paints hundreds of differently coloured parts.  In atlas kinds, faces
 * without an explicit rect sample the atlas' white texel.
 *
 * `sway` (per vertex float) drives cloth / foliage motion in the vertex shader
 * (see SWAY_PATCH in shops.js); B.sway sets a constant, B.swayFn(localPoint)
 * a function of the local position.
 */
import * as THREE from 'three';

const colorCache = new Map();
/** '#rrggbb' -> linear [r, g, b] (cached). */
export function rgb(c) {
  if (Array.isArray(c)) return c;
  let v = colorCache.get(c);
  if (!v) {
    const col = new THREE.Color(c);
    v = [col.r, col.g, col.b];
    colorCache.set(c, v);
  }
  return v;
}
/** Multiply a colour by k (returns linear array). */
export function mulc(c, k) {
  const a = rgb(c);
  return [a[0] * k, a[1] * k, a[2] * k];
}

// Box faces: corner selectors [x?, y?, z?] (0 = min, 1 = max) in CCW order seen
// from outside, the outward normal and the face-local (u, v) axes (u to the
// right as seen from outside, v up).
const FACES = [
  { id: 'X', n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: (p) => [-p[2], p[1]] },
  { id: 'x', n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: (p) => [p[2], p[1]] },
  { id: 'Y', n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uv: (p) => [p[0], -p[2]] },
  { id: 'y', n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uv: (p) => [p[0], p[2]] },
  { id: 'Z', n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: (p) => [p[0], p[1]] },
  { id: 'z', n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: (p) => [-p[0], p[1]] },
];

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function bucketNew() {
  return { pos: [], nrm: [], uv: [], col: [], sway: [], idx: [], n: 0 };
}

export class Batcher {
  /**
   * @param {Object<string,{uv:'atlas'|'metric', scale?:number, sway?:boolean}>} kinds
   * @param {{u:number,v:number}} white  atlas UV of a white texel
   */
  constructor(kinds, white) {
    this.kinds = kinds;
    this.white = white;
    this.buckets = new Map();
    this.chunk = 'c0';
    this.M = new THREE.Matrix4();
    this.N = new THREE.Matrix3();
    this.stack = [];
    this.sway = 0;
    this.swayFn = null;
    this.tris = 0;
    this.geoCache = new Map();
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

  /** Push translate + rotation (YXZ order) frame. */
  pushT(x, y, z, ry = 0, rx = 0, rz = 0, s = 1) {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(s, s, s);
    _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    this.push(_m);
  }

  pop() {
    this.M.copy(this.stack.pop());
    this.N.getNormalMatrix(this.M);
  }

  /** Current local -> world transform of point (x,y,z) (returns a new Vector3). */
  toWorld(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.M); }

  bucket(kind) {
    const key = `${this.chunk}|${kind}`;
    let b = this.buckets.get(key);
    if (!b) {
      if (!this.kinds[kind]) throw new Error(`shops batch: unknown kind ${kind}`);
      b = bucketNew();
      b.kind = kind;
      b.chunk = this.chunk;
      this.buckets.set(key, b);
    }
    return b;
  }

  _vert(b, x, y, z, nx, ny, nz, u, v, col) {
    _v.set(x, y, z).applyMatrix4(this.M);
    _n.set(nx, ny, nz).applyMatrix3(this.N).normalize();
    b.pos.push(_v.x, _v.y, _v.z);
    b.nrm.push(_n.x, _n.y, _n.z);
    b.uv.push(u, v);
    b.col.push(col[0], col[1], col[2]);
    b.sway.push(this.swayFn ? this.swayFn(x, y, z) : this.sway);
    return b.n++;
  }

  /** UV for a face point: atlas rect mapping, metric, or the white texel. */
  _uvOf(kind, fu, fv, rect, bounds) {
    const k = this.kinds[kind];
    if (rect) {
      const tu = bounds ? (fu - bounds[0]) / (bounds[1] - bounds[0] || 1) : fu;
      const tv = bounds ? (fv - bounds[2]) / (bounds[3] - bounds[2] || 1) : fv;
      return [rect.u0 + (rect.u1 - rect.u0) * tu, rect.v0 + (rect.v1 - rect.v0) * tv];
    }
    if (k.uv === 'metric') return [fu * (k.scale || 1), fv * (k.scale || 1)];
    return [this.white.u, this.white.v];
  }

  // ---------------------------------------------------------------------------
  // emitters
  // ---------------------------------------------------------------------------

  /** Newell normal of a polygon given as [[x,y,z],...]. */
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

  /** Convex polygon (CCW seen from the front).  uvs: [[u,v]...] already final, or null. */
  poly(kind, pts, color, uvs = null, normal = null, colors = null) {
    const b = this.bucket(kind);
    const col = rgb(color);
    const n = normal || Batcher.normalOf(pts);
    const base = b.n;
    const k = this.kinds[kind];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      let uv;
      if (uvs) uv = uvs[i];
      else if (k.uv === 'metric') {
        // planar projection along the dominant normal axis (matches box faces)
        const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
        const sc = k.scale || 1;
        if (ay >= ax && ay >= az) uv = [p[0] * sc, -p[2] * Math.sign(n[1]) * sc];
        else if (ax >= az) uv = [-p[2] * Math.sign(n[0]) * sc, p[1] * sc];
        else uv = [p[0] * Math.sign(n[2]) * sc, p[1] * sc];
      } else uv = this._uvOf(kind, 0, 0, null);
      this._vert(b, p[0], p[1], p[2], n[0], n[1], n[2], uv[0], uv[1], colors ? rgb(colors[i]) : col);
    }
    for (let i = 1; i < pts.length - 1; i++) b.idx.push(base, base + i, base + i + 1);
    this.tris += pts.length - 2;
  }

  /**
   * Box from min to max corner in the current frame.
   * o.skip   faces to omit, e.g. 'yz' ('X','x','Y','y','Z','z')
   * o.rect   atlas rect for face o.face (default 'Z'); o.rects {Z: rect, z: rect ...}
   * o.colors per-face colour override {Y: '#..'}
   * o.grad   multiply colour of bottom vertices (hand-painted grime), e.g. 0.88
   * o.kinds  per-face kind override {Z: 'lit'}
   */
  box(kind, x0, y0, z0, x1, y1, z1, color, o = {}) {
    const skip = o.skip || '';
    const lo = [x0, y0, z0], hi = [x1, y1, z1];
    const baseCol = rgb(color);
    for (const F of FACES) {
      if (skip.includes(F.id)) continue;
      const k = (o.kinds && o.kinds[F.id]) || kind;
      const b = this.bucket(k);
      const rect = (o.rects && o.rects[F.id]) || (o.rect && (o.face || 'Z') === F.id ? o.rect : null);
      const fcol = o.colors && o.colors[F.id] ? rgb(o.colors[F.id]) : baseCol;
      const pts = F.c.map((s) => [s[0] ? hi[0] : lo[0], s[1] ? hi[1] : lo[1], s[2] ? hi[2] : lo[2]]);
      let bounds = null;
      if (rect) {
        const uvs = pts.map(F.uv);
        bounds = [Math.min(...uvs.map((q) => q[0])), Math.max(...uvs.map((q) => q[0])), Math.min(...uvs.map((q) => q[1])), Math.max(...uvs.map((q) => q[1]))];
      }
      const base = b.n;
      for (const p of pts) {
        const fu = F.uv(p);
        const uv = this._uvOf(k, fu[0], fu[1], rect, bounds);
        const c = o.grad && p[1] === y0 && F.n[1] === 0 ? [fcol[0] * o.grad, fcol[1] * o.grad, fcol[2] * o.grad] : fcol;
        this._vert(b, p[0], p[1], p[2], F.n[0], F.n[1], F.n[2], uv[0], uv[1], c);
      }
      b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      this.tris += 2;
    }
  }

  /** Box by centre + size; o.ry/o.rx/o.rz rotate about the centre. */
  boxC(kind, cx, cy, cz, sx, sy, sz, color, o = {}) {
    if (o.ry || o.rx || o.rz) {
      this.pushT(cx, cy, cz, o.ry || 0, o.rx || 0, o.rz || 0);
      this.box(kind, -sx / 2, -sy / 2, -sz / 2, sx / 2, sy / 2, sz / 2, color, o);
      this.pop();
    } else {
      this.box(kind, cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, color, o);
    }
  }

  /** Box by bottom-centre + size. */
  boxB(kind, cx, y, cz, sx, sy, sz, color, o = {}) {
    if (o.ry || o.rx || o.rz) {
      this.pushT(cx, y, cz, o.ry || 0, o.rx || 0, o.rz || 0);
      this.box(kind, -sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2, color, o);
      this.pop();
    } else {
      this.box(kind, cx - sx / 2, y, cz - sz / 2, cx + sx / 2, y + sy, cz + sz / 2, color, o);
    }
  }

  /**
   * Plane of size w x h centred at (cx,cy,cz) facing +Z (before o.ry / o.rx).
   * rect: atlas rect (null = white texel / metric).  o.back: also emit the back
   * face (o.backRect for a different picture).  o.flipU mirrors the picture.
   */
  quad(kind, cx, cy, cz, w, h, color, rect = null, o = {}) {
    const rot = o.ry || o.rx || o.rz;
    if (rot) this.pushT(cx, cy, cz, o.ry || 0, o.rx || 0, o.rz || 0);
    const X = rot ? 0 : cx, Y = rot ? 0 : cy, Z = rot ? 0 : cz;
    const b = this.bucket(kind);
    const col = rgb(color);
    const hw = w / 2, hh = h / 2;
    const face = (sign, r) => {
      const base = b.n;
      const pts = sign > 0
        ? [[X - hw, Y - hh, 0, 0], [X + hw, Y - hh, 1, 0], [X + hw, Y + hh, 1, 1], [X - hw, Y + hh, 0, 1]]
        : [[X + hw, Y - hh, 0, 0], [X - hw, Y - hh, 1, 0], [X - hw, Y + hh, 1, 1], [X + hw, Y + hh, 0, 1]];
      for (const p of pts) {
        let tu = p[2];
        if (o.flipU) tu = 1 - tu;
        const uv = r ? [r.u0 + (r.u1 - r.u0) * tu, r.v0 + (r.v1 - r.v0) * p[3]] : this._uvOf(kind, (p[0] - X) * sign, p[1], null);
        this._vert(b, p[0], p[1], Z, 0, 0, sign, uv[0], uv[1], col);
      }
      b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      this.tris += 2;
    };
    face(1, rect);
    // double-sided kinds already show the back; a second coplanar face would z-fight
    if (o.back && !this.kinds[kind].double) face(-1, o.backRect === undefined ? rect : o.backRect);
    if (rot) this.pop();
  }

  /**
   * Any BufferGeometry.  o.m: local Matrix4 applied first.  o.rect: remap the
   * geometry's 0..1 uvs into an atlas rect.  Metric kinds use uv * scale.
   */
  geo(kind, g, color, o = {}) {
    if (o.m) this.push(o.m);
    const b = this.bucket(kind);
    const col = rgb(color);
    const pos = g.attributes.position, nrm = g.attributes.normal, uva = g.attributes.uv;
    const k = this.kinds[kind];
    const base = b.n;
    for (let i = 0; i < pos.count; i++) {
      let u, v;
      if (o.rect && uva) { u = o.rect.u0 + (o.rect.u1 - o.rect.u0) * uva.getX(i); v = o.rect.v0 + (o.rect.v1 - o.rect.v0) * uva.getY(i); }
      else if (k.uv === 'metric' && uva) { u = uva.getX(i) * (o.uvScale || 1); v = uva.getY(i) * (o.uvScale || 1); }
      else { u = this.white.u; v = this.white.v; }
      this._vert(b, pos.getX(i), pos.getY(i), pos.getZ(i), nrm.getX(i), nrm.getY(i), nrm.getZ(i), u, v, col);
    }
    if (g.index) {
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) b.idx.push(base + ix[i]);
      this.tris += ix.length / 3;
    } else {
      for (let i = 0; i < pos.count; i++) b.idx.push(base + i);
      this.tris += pos.count / 3;
    }
    if (o.m) this.pop();
  }

  _cached(key, make) {
    let g = this.geoCache.get(key);
    if (!g) { g = make(); this.geoCache.set(key, g); }
    return g;
  }

  /**
   * Cylinder standing on (x, y, z).  o: rb (bottom radius, default r), seg,
   * open, rx, rz, ry (about the base point), rect (wrap texture), sx/sz (scale).
   */
  cyl(kind, x, y, z, r, h, color, o = {}) {
    const seg = o.seg || 10;
    const rb = o.rb ?? r;
    const g = this._cached(`cyl|${seg}|${o.open ? 1 : 0}|${o.caps || ''}`, () => {
      const c = new THREE.CylinderGeometry(1, 1, 1, seg, 1, !!o.open);
      c.translate(0, 0.5, 0);
      return c;
    });
    // unit cylinder scaled; tapering needs its own geometry
    if (rb !== r) {
      const tg = this._cached(`cylT|${seg}|${o.open ? 1 : 0}|${(r / rb).toFixed(3)}`, () => {
        const c = new THREE.CylinderGeometry(r / rb, 1, 1, seg, 1, !!o.open);
        c.translate(0, 0.5, 0);
        return c;
      });
      this.geo(kind, tg, color, { ...o, m: new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ')), _s.set(rb * (o.sx || 1), h, rb * (o.sz || 1))) });
      return;
    }
    this.geo(kind, g, color, { ...o, m: new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ')), _s.set(r * (o.sx || 1), h, r * (o.sz || 1))) });
  }

  /** Ellipsoid centred at (x,y,z) with radius r (o.sx/sy/sz scale, o.w/o.h segments, o.detail ico). */
  sphere(kind, x, y, z, r, color, o = {}) {
    const g = o.ico !== undefined
      ? this._cached(`ico|${o.ico}`, () => new THREE.IcosahedronGeometry(1, o.ico))
      : this._cached(`sph|${o.w || 8}|${o.h || 6}|${o.half ? 1 : 0}`, () => new THREE.SphereGeometry(1, o.w || 8, o.h || 6, 0, Math.PI * 2, 0, o.half ? Math.PI / 2 : Math.PI));
    this.geo(kind, g, color, { ...o, m: new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ')), _s.set(r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1))) });
  }

  /** Box stretched from p0 to p1 ([x,y,z]); w across (horizontal), h the other way. */
  beam(kind, p0, p1, w, h, color, o = {}) {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return;
    const dir = new THREE.Vector3(dx, dy, dz).divideScalar(len);
    // frame: Z along the segment, X horizontal-ish
    let xa = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir);
    if (xa.lengthSq() < 1e-6) xa.set(1, 0, 0);
    xa.normalize();
    const ya = new THREE.Vector3().crossVectors(dir, xa).normalize();
    const m = new THREE.Matrix4().makeBasis(xa, ya, dir);
    m.setPosition((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
    this.push(m);
    this.box(kind, -w / 2, -h / 2, -len / 2, w / 2, h / 2, len / 2, color, o);
    this.pop();
  }

  /** Thin round tube along a polyline of [x,y,z] points (radial segments o.radial, default 5). */
  tube(kind, pts, r, color, o = {}) {
    const radial = o.radial || 5;
    const b = this.bucket(kind);
    const col = rgb(color);
    const base = b.n;
    const up = new THREE.Vector3(0, 1, 0);
    const t = new THREE.Vector3(), n = new THREE.Vector3(), bn = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      t.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]).normalize();
      n.crossVectors(t, up);
      if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
      n.normalize();
      bn.crossVectors(n, t).normalize();
      for (let j = 0; j < radial; j++) {
        const ang = (j / radial) * Math.PI * 2;
        const cx = Math.cos(ang), sy = Math.sin(ang);
        const nx = n.x * cx + bn.x * sy, ny = n.y * cx + bn.y * sy, nz = n.z * cx + bn.z * sy;
        this._vert(b, pts[i][0] + nx * r, pts[i][1] + ny * r, pts[i][2] + nz * r, nx, ny, nz, this.white.u, this.white.v, col);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * radial + j, bb = base + i * radial + ((j + 1) % radial);
        const c = base + (i + 1) * radial + j, d = base + (i + 1) * radial + ((j + 1) % radial);
        b.idx.push(a, c, bb, bb, c, d);
        this.tris += 2;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // output
  // ---------------------------------------------------------------------------

  /**
   * Build one mesh per (chunk, kind).
   * mats: {kind: {material, castShadow, noOutline}}
   */
  finish(mats) {
    const out = [];
    for (const b of this.buckets.values()) {
      if (!b.n) continue;
      const def = mats[b.kind];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      if (this.kinds[b.kind].sway) g.setAttribute('sway', new THREE.Float32BufferAttribute(b.sway, 1));
      g.setIndex(b.n > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, def.material);
      mesh.name = `shops:${b.chunk}:${b.kind}`;
      mesh.castShadow = !!def.castShadow;
      mesh.receiveShadow = def.receiveShadow !== false;
      if (def.noOutline) mesh.userData.noOutline = true;
      if (def.renderOrder) mesh.renderOrder = def.renderOrder;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      out.push(mesh);
    }
    this.buckets.clear();
    return out;
  }
}
