/**
 * props/kit.js — materials, geometry buckets, a transform stack and small
 * primitive helpers shared by every props builder.
 *
 * Draw-call strategy
 *   Every part is transformed into world space and dropped into a bucket keyed
 *   by (cluster, material, outline, shadow).  Solid colours are baked as vertex
 *   colours; signs / labels / drink displays are regions of two canvas atlases
 *   (V = vending, S = signs & misc).  At the end each cluster (a spatial group:
 *   plaza, platform, konbini, street north / south, shrine ...) is merged into
 *   one mesh per bucket, so the whole module is a few dozen draw calls while
 *   frustum culling still works per cluster.
 *
 * Usage
 *   kit.cluster('plaza');
 *   kit.push(kit.mtx(x, y, z, 0, rotY));      // enter an object's local frame
 *   kit.box(1, 2, 0.8, 0, 1, 0, 'vc', '#fff'); // centre-positioned box
 *   kit.pop();
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

/** Matrix from position / YXZ euler / scale (a fresh Matrix4). */
export function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Remap 0..1 UVs of a geometry into an atlas region. */
export function regionUV(g, r, { swap = false, flipU = false, flipV = false } = {}) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i), v = uv.getY(i);
    if (swap) [u, v] = [v, u];
    if (flipU) u = 1 - u;
    if (flipV) v = 1 - v;
    uv.setXY(i, r.u0 + u * (r.u1 - r.u0), r.v0 + v * (r.v1 - r.v0));
  }
  uv.needsUpdate = true;
  return g;
}

/** Normalise a geometry for merging: indexed, position/normal/uv/color only. */
function normalise(g) {
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

function paint(g, color) {
  _c.set(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/**
 * @param ctx  module ctx
 * @param atlases { V: {texture, r(name)}, S: {texture, r(name)} }
 */
export function createKit(ctx, atlases) {
  const { toon } = ctx;
  const texV = atlases.V.texture;
  const texS = atlases.S.texture;
  const M = {
    vc: toon.mat('#ffffff', { vertexColors: true, name: 'props_vc' }),
    vc2: toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, name: 'props_vc2' }),
    metal: toon.metal('#ffffff', { vertexColors: true, name: 'props_metal' }),
    texV: toon.mat('#ffffff', { map: texV, vertexColors: true, alphaTest: 0.5, name: 'props_texV' }),
    texS: toon.mat('#ffffff', { map: texS, vertexColors: true, alphaTest: 0.5, name: 'props_texS' }),
    texS2: toon.mat('#ffffff', { map: texS, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, name: 'props_texS2' }),
    glowV: toon.unlit('#ffffff', { map: texV, vertexColors: true, name: 'props_glowV' }),
    glowS: toon.unlit('#ffffff', { map: texS, vertexColors: true, name: 'props_glowS' }),
    glow: toon.unlit('#ffffff', { vertexColors: true, name: 'props_glow' }),
    glass: toon.glass({ tint: '#a9c3d6', opacity: 0.14, sheen: 0.22 }),
    glassDark: toon.glass({ tint: '#3a4c62', opacity: 0.66, sheen: 0.32 }),
  };
  // materials that never get an outline (unlit faces, glass)
  const NO_OUTLINE = new Set(['glowV', 'glowS', 'glow', 'glass', 'glassDark']);
  const NO_SHADOW = new Set(['glass', 'glassDark']);

  const clusters = new Map();
  let cur = null;
  const stack = [new THREE.Matrix4()];
  const colliders = [];

  const kit = {
    ctx, M, mtx, regionUV,
    V: atlases.V.r, // region lookup: kit.V('vendHeader_red')
    S: atlases.S.r,

    /** Select the spatial cluster new parts go into. */
    cluster(name) {
      if (!clusters.has(name)) clusters.set(name, new Map());
      cur = clusters.get(name);
      return kit;
    },

    /** Enter a local frame (Matrix4 relative to the current top). */
    push(m) { stack.push(stack[stack.length - 1].clone().multiply(m)); return kit; },
    pop() { if (stack.length > 1) stack.pop(); return kit; },
    top() { return stack[stack.length - 1]; },
    /** Local point -> world (for colliders / placement). */
    world(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(stack[stack.length - 1]); },

    /**
     * Add a geometry (consumed) with the current transform.
     * mat: key of M.  color: vertex colour (tint for textured materials).
     * opts: m (extra local Matrix4), no (noOutline), cast (shadow), region (atlas UV remap), uvOpts
     */
    add(g, mat = 'vc', color = '#ffffff', opts = {}) {
      if (!cur) kit.cluster('default');
      if (opts.region) regionUV(g, opts.region, opts.uvOpts);
      normalise(g);
      paint(g, color);
      const m = opts.m ? stack[stack.length - 1].clone().multiply(opts.m) : stack[stack.length - 1];
      g.applyMatrix4(m);
      const no = !!opts.no || NO_OUTLINE.has(mat);
      const cast = opts.cast ?? (!no && !NO_SHADOW.has(mat));
      const key = `${mat}|${no ? 1 : 0}|${cast ? 1 : 0}`;
      let b = cur.get(key);
      if (!b) { b = { mat, no, cast, geoms: [] }; cur.set(key, b); }
      b.geoms.push(g);
      return g;
    },

    // ---------------------------------------------------------------------
    // primitives (all positions in the current local frame)
    // ---------------------------------------------------------------------
    /** Box centred at (x,y,z).  opts: rx,ry,rz, bottom (y is the base), no, cast, region */
    box(w, h, d, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (opts.bottom) g.translate(0, h / 2, 0);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0) });
    },
    /** Rounded box (radius r, segments seg) centred at (x,y,z). */
    rbox(w, h, d, r, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new RoundedBoxGeometry(w, h, d, opts.seg ?? 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
      if (opts.bottom) g.translate(0, h / 2, 0);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0) });
    },
    /** Cylinder with its base at (x,y,z) (axis +Y before rotation). */
    cyl(rt, rb, h, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 12, 1, !!opts.open, opts.t0 ?? 0, opts.tl ?? Math.PI * 2);
      g.translate(0, opts.center ? 0 : h / 2, 0);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0) });
    },
    /** Sphere centred at (x,y,z); opts sx,sy,sz scale, ws/hs segments, phiLen/thetaLen for partial. */
    sphere(r, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new THREE.SphereGeometry(r, opts.ws ?? 10, opts.hs ?? 7, 0, Math.PI * 2, 0, opts.thetaLen ?? Math.PI);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0, opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1) });
    },
    /** Torus centred at (x,y,z), lying in the local XY plane (axis +Z) before rotation. */
    torus(R, r, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new THREE.TorusGeometry(R, r, opts.rs ?? 6, opts.ts ?? 20, opts.arc ?? Math.PI * 2);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0) });
    },
    /** Lathe of [[r,y],...] around +Y, base at (x,y,z). */
    lathe(pts, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(r, yy)), opts.seg ?? 12);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0, opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1) });
    },
    /** Flat quad facing +Z (before rotation), centred at (x,y,z). */
    plane(w, h, x, y, z, mat, color = '#ffffff', opts = {}) {
      const g = new THREE.PlaneGeometry(w, h);
      return kit.add(g, mat, color, { no: true, cast: false, ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0) });
    },
    /** Cylinder beam between two local points a, b (Vector3 or [x,y,z]). */
    beam(a, b, r, mat = 'vc', color = '#ffffff', opts = {}) {
      const A = Array.isArray(a) ? new THREE.Vector3(...a) : a;
      const B = Array.isArray(b) ? new THREE.Vector3(...b) : b;
      const dir = new THREE.Vector3().subVectors(B, A);
      const len = dir.length();
      if (len < 1e-5) return null;
      const g = new THREE.CylinderGeometry(opts.rb ?? r, r, len, opts.seg ?? 6, 1, !!opts.open);
      g.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize());
      g.applyMatrix4(new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)));
      return kit.add(g, mat, color, opts);
    },
    /** Square-section bar between two points (w across, h "up" relative to world-ish). */
    bar(a, b, w, h, mat = 'vc', color = '#ffffff', opts = {}) {
      const A = Array.isArray(a) ? new THREE.Vector3(...a) : a;
      const B = Array.isArray(b) ? new THREE.Vector3(...b) : b;
      const dir = new THREE.Vector3().subVectors(B, A);
      const len = dir.length();
      if (len < 1e-5) return null;
      const g = new THREE.BoxGeometry(w, h, len);
      g.translate(0, 0, len / 2);
      // Matrix4.lookAt(eye, target) aligns +Z with (eye - target): +Z -> dir
      const up = Math.abs(dir.y / len) > 0.98 ? new THREE.Vector3(1, 0, 0) : _up;
      const m = new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), up);
      g.applyMatrix4(m);
      g.translate(A.x, A.y, A.z);
      return kit.add(g, mat, color, opts);
    },
    /** Tube through local points (array of Vector3/[x,y,z]); radial segments seg. */
    tube(points, r, mat = 'vc', color = '#ffffff', opts = {}) {
      const pts = points.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p));
      const g = ctx.geom.tubeAlong(pts, r, opts.seg ?? 6);
      return kit.add(g, mat, color, opts);
    },
    /** Smooth tube along a Catmull-Rom curve through the points. */
    curveTube(points, r, n, mat = 'vc', color = '#ffffff', opts = {}) {
      const pts = points.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p));
      const c = new THREE.CatmullRomCurve3(pts, !!opts.closed, 'centripetal');
      return kit.tube(c.getPoints(n), r, mat, color, opts);
    },
    /** Extruded 2D shape (THREE.Shape in local XY), depth along +Z, centred on z. */
    extrude(shape, depth, x, y, z, mat = 'vc', color = '#ffffff', opts = {}) {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: !!opts.bevel, bevelSize: opts.bevel || 0, bevelThickness: opts.bevel || 0, bevelSegments: opts.bevelSeg ?? 2, curveSegments: opts.curveSeg ?? 8,
      });
      g.translate(0, 0, -depth / 2);
      return kit.add(g, mat, color, { ...opts, m: mtx(x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0) });
    },

    /** Register a walk-mode collider around a local box footprint (current frame). */
    collide(w, d, x = 0, z = 0) {
      const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => kit.world(x + a, 0, z + b));
      const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
      colliders.push([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]);
    },

    /** Merge every cluster into meshes; returns a Group. */
    finish(name = 'props') {
      const out = new THREE.Group();
      out.name = name;
      for (const [cname, buckets] of clusters) {
        const grp = new THREE.Group();
        grp.name = `props:${cname}`;
        for (const b of buckets.values()) {
          if (!b.geoms.length) continue;
          const merged = mergeGeometries(b.geoms, false);
          if (!merged) { console.warn('props: merge failed', cname, b.mat); continue; }
          merged.computeBoundingSphere();
          const mesh = new THREE.Mesh(merged, M[b.mat]);
          mesh.name = `props:${cname}:${b.mat}`;
          mesh.castShadow = b.cast;
          mesh.receiveShadow = !NO_SHADOW.has(b.mat);
          if (b.no) mesh.userData.noOutline = true;
          mesh.userData.dynamic = true; // already merged
          grp.add(mesh);
        }
        out.add(grp);
      }
      clusters.clear();
      for (const c of colliders) ctx.addCollider(...c);
      return out;
    },
  };
  return kit;
}
