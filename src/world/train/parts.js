/**
 * Geometry accumulator for the train.
 *
 * A trainset has thousands of small parts (seat pads, straps, springs,
 * insulators...).  Instead of creating a Mesh per part and baking afterwards,
 * parts are pushed straight into named buckets (one bucket = one material /
 * outline / shadow combination) and merged once.  Opaque buckets carry vertex
 * colours so one toon material covers every colour of the car.
 *
 *   const P = new Parts();
 *   P.box('body', w, h, d, x, y, z, '#f5f1e6');
 *   P.cyl('metal', r, r, h, x, y, z, '#aab', { axis: 'z' });
 *   P.add('decal', geometry);            // any BufferGeometry (consumed)
 *   const geo = P.merged('body');        // BufferGeometry, car-local
 */
import * as THREE from 'three';
import { merge, paint, matrix, tubeAlong } from '../../core/geom.js';

export const BUCKETS = {
  body: { vc: true }, // opaque toon, outlined, casts shadows
  bodyNO: { vc: true }, // opaque toon, no outline (tiny parts / interior clutter)
  metal: { vc: true }, // toon + stepped specular, outlined
  metalNO: { vc: true }, // thin metal: rails, wipers, pantograph links, straps
  inner: { vc: true }, // interior furniture & passengers (hidden when far away)
  innerNO: { vc: true }, // interior small parts, no outline
  innerMetal: { vc: true }, // stanchions, rails, straps' brackets
  innerDecal: { vc: false }, // hanging posters
  glass: { vc: false }, // side windows
  glassF: { vc: false }, // cab windscreen (a touch darker)
  decal: { vc: false }, // atlas stickers / lettering, lit
  led: { vc: false }, // atlas, unlit (LED displays, lamps, light strips)
  glow: { vc: false }, // atlas, unlit transparent halo cards
};

const _m = new THREE.Matrix4();

export class Parts {
  constructor() {
    this.b = new Map();
  }

  /** Add a geometry (consumed).  color paints a flat vertex colour (vc buckets). m: Matrix4 applied first. */
  add(bucket, g, color = null, m = null) {
    if (m) g.applyMatrix4(m);
    if (BUCKETS[bucket]?.vc) paint(g, color ?? '#ffffff');
    else if (g.attributes.color) g.deleteAttribute('color');
    if (!this.b.has(bucket)) this.b.set(bucket, []);
    this.b.get(bucket).push(g);
    return g;
  }

  /** Axis-aligned (optionally rotated, YXZ order) box centred at x,y,z. */
  box(bucket, w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0) {
    return this.add(bucket, new THREE.BoxGeometry(w, h, d), color, matrix(x, y, z, rx, ry, rz));
  }

  /** Box spanning explicit min/max corners. */
  span(bucket, x0, x1, y0, y1, z0, z1, color) {
    return this.box(bucket, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, color);
  }

  /** Cylinder centred at x,y,z.  opts.axis 'x'|'y'|'z' (default y), seg, open, rx/ry/rz extra rotation. */
  cyl(bucket, rTop, rBot, h, x, y, z, color, opts = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, opts.seg || 10, 1, !!opts.open);
    if (opts.axis === 'x') g.rotateZ(-Math.PI / 2);
    else if (opts.axis === 'z') g.rotateX(Math.PI / 2);
    return this.add(bucket, g, color, matrix(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0));
  }

  /** Low-poly sphere / ellipsoid. */
  sphere(bucket, r, x, y, z, color, sx = 1, sy = 1, sz = 1, ws = 8, hs = 6) {
    const g = new THREE.SphereGeometry(r, ws, hs);
    g.scale(sx, sy, sz);
    return this.add(bucket, g, color, matrix(x, y, z));
  }

  /** Capsule between two points a -> b (arrays [x,y,z]). */
  capsule(bucket, r, a, b, color, radial = 5) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 1, radial);
    // capsule is along Y; rotate Y -> (dx,dy,dz)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    _m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
    return this.add(bucket, g, color, _m.clone());
  }

  /** Round rod between two points (cylinder). */
  rod(bucket, r, a, b, color, radial = 6) {
    const pts = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
    return this.add(bucket, tubeAlong(pts, r, radial), color);
  }

  /** Tube along a list of Vector3 points. */
  tube(bucket, pts, r, color, radial = 5) {
    return this.add(bucket, tubeAlong(pts, r, radial), color);
  }

  /** Append every bucket of another Parts (or merged geometry map) transformed by matrix m. */
  append(other, m) {
    for (const [k, list] of other.b) {
      for (const g of list) {
        const c = g.clone();
        if (m) c.applyMatrix4(m);
        if (!this.b.has(k)) this.b.set(k, []);
        this.b.get(k).push(c);
      }
    }
  }

  /** Collapse every bucket into one geometry (keeps the Parts usable for append()). */
  compact() {
    for (const [k, list] of this.b) {
      if (list.length <= 1) continue;
      const g = merge(list, BUCKETS[k]?.vc ? ['color'] : []);
      for (const s of list) s.dispose();
      this.b.set(k, [g]);
    }
    return this;
  }

  merged(bucket) {
    const list = this.b.get(bucket);
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    return merge(list, BUCKETS[bucket]?.vc ? ['color'] : []);
  }

  triangles() {
    let n = 0;
    for (const list of this.b.values()) for (const g of list) n += (g.index ? g.index.count : g.attributes.position.count) / 3;
    return n;
  }
}

/** PlaneGeometry (facing +Z) whose UVs map to an atlas rectangle {u0,v0,u1,v1}. */
export function atlasPlane(w, h, r, flipX = false) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i);
    if (flipX) u = 1 - u;
    uv.setXY(i, r.u0 + u * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
  }
  return g;
}

/** Remap existing 0..1 UVs of a geometry into an atlas rect. */
export function remapUV(g, r) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
  return g;
}

/**
 * Rounded rectangle path (THREE.Shape or Path) with corner radius r.
 */
export function roundRectPath(target, x0, y0, x1, y1, r) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  target.moveTo(x0 + r, y0);
  target.lineTo(x1 - r, y0);
  target.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  target.lineTo(x1, y1 - r);
  target.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  target.lineTo(x0 + r, y1);
  target.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  target.lineTo(x0, y0 + r);
  target.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return target;
}

/** Extrude a shape along +Z by depth (no bevel), curveSegments small. */
export function extrude(shape, depth, curveSegments = 3) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
}

/** Helix points (coil spring) standing on y = 0, radius r, height h, turns. */
export function helix(r, h, turns, perTurn = 8) {
  const pts = [];
  const n = Math.round(turns * perTurn);
  for (let i = 0; i <= n; i++) {
    const a = (i / perTurn) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, (i / n) * h, Math.sin(a) * r));
  }
  return pts;
}
