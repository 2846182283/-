/**
 * crossing/kit.js — materials, geometry buckets and small helpers.
 *
 * Draw-call strategy: every static part is transformed into crossing space and
 * dropped into a bucket (material + outline + shadow flags).  Solid colours
 * are baked as vertex colours, textured parts use regions of one canvas atlas,
 * so the whole static crossing ends up as ~6 merged meshes.
 */
import * as THREE from 'three';
import { makeCrossingTextures } from './textures.js';

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

/** Remap a geometry's 0..1 UVs into an atlas region (optionally swapping u/v first). */
export function regionUV(g, r, { swap = false, flipU = false } = {}) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i), v = uv.getY(i);
    if (swap) [u, v] = [v, u];
    if (flipU) u = 1 - u;
    uv.setXY(i, r.u0 + u * (r.u1 - r.u0), r.v0 + v * (r.v1 - r.v0));
  }
  uv.needsUpdate = true;
  return g;
}

/** Point every UV at one texel (solid colour from the atlas). */
export function solidUV(g, r) {
  const uv = g.attributes.uv;
  const u = (r.u0 + r.u1) / 2, v = (r.v0 + r.v1) / 2;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
  return g;
}

const _c = new THREE.Color();
function paint(g, color) {
  _c.set(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Box with its origin at the bottom centre. */
export function boxB(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}

/** Thin tube between two points (cylinder, radial segments `seg`). */
export function tubeBetween(a, b, r, seg = 6, rb = r) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, rb, len, seg, 1, false);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

export function createKit(ctx) {
  const { toon } = ctx;
  const T = makeCrossingTextures();
  const M = {
    vc: toon.mat('#ffffff', { vertexColors: true, name: 'cr_vc' }),
    metal: toon.metal('#ffffff', { vertexColors: true, name: 'cr_metal' }),
    atlas: toon.mat('#ffffff', { map: T.atlas, alphaTest: 0.5, name: 'cr_atlas' }),
    atlasMetal: toon.metal('#ffffff', { map: T.atlas, alphaTest: 0.5, spec: 0.3, name: 'cr_atlasMetal' }),
    decal: toon.mat('#ffffff', { map: T.decals, transparent: true, depthWrite: false, polygonOffset: 3, name: 'cr_decal' }),
    lamp: toon.unlit('#ffffff', { name: 'cr_lamp' }),
    glow: toon.unlit('#ffffff', { map: T.decals, transparent: true, depthWrite: false, name: 'cr_glow' }),
    arrow: toon.unlit('#ffffff', { map: T.decals, alphaTest: 0.4, name: 'cr_arrow' }),
  };
  // glow cards add light rather than cover it
  M.glow.blending = THREE.AdditiveBlending;

  /**
   * Buckets: name -> { mat, noOutline, cast, vc }.  `S` suffix = small parts
   * (no outline, no shadow) so they don't turn into black mush at distance.
   */
  const defs = {
    vc: { mat: M.vc, noOutline: false, cast: true, vc: true },
    vcS: { mat: M.vc, noOutline: true, cast: false, vc: true },
    metal: { mat: M.metal, noOutline: false, cast: true, vc: true },
    metalS: { mat: M.metal, noOutline: true, cast: false, vc: true },
    atlas: { mat: M.atlas, noOutline: false, cast: true, vc: false },
    atlasS: { mat: M.atlas, noOutline: true, cast: false, vc: false },
    atlasM: { mat: M.atlasMetal, noOutline: false, cast: true, vc: false },
    decal: { mat: M.decal, noOutline: true, cast: false, vc: false },
  };
  const geoms = Object.fromEntries(Object.keys(defs).map((k) => [k, []]));

  const kit = {
    ctx,
    T,
    R: T.R,
    DR: T.DR,
    M,
    /** Add a geometry (consumed) to a bucket with an optional colour and matrix. */
    add(bucket, g, color = '#ffffff', m = null) {
      const d = defs[bucket];
      if (!d) throw new Error(`crossing: unknown bucket ${bucket}`);
      if (m) g.applyMatrix4(m);
      if (d.vc) paint(g, color);
      else if (g.attributes.color) g.deleteAttribute('color');
      geoms[bucket].push(g);
      return g;
    },
    /**
     * A local frame (position + yaw) for building one object.  Parts are
     * given in local coordinates; `f.m(...)` returns frame * local.
     */
    frame(x, y, z, ry = 0) {
      const F = mtx(x, y, z, 0, ry, 0);
      const f = {
        F,
        m: (lx = 0, ly = 0, lz = 0, rx = 0, rry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().multiplyMatrices(F, mtx(lx, ly, lz, rx, rry, rz, sx, sy, sz)),
        /** point in world space */
        p: (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(F),
        /** box centred at (lx,ly,lz) */
        box: (bucket, w, h, d, color, lx, ly, lz, o = {}) => kit.add(bucket, new THREE.BoxGeometry(w, h, d), color, f.m(lx, ly, lz, o.rx || 0, o.ry || 0, o.rz || 0)),
        /** box sitting on ly */
        block: (bucket, w, h, d, color, lx, ly, lz, o = {}) => kit.add(bucket, boxB(w, h, d), color, f.m(lx, ly, lz, o.rx || 0, o.ry || 0, o.rz || 0)),
        /** cylinder from ly upward (along local y unless rotated) */
        cyl: (bucket, rt, rb, h, color, lx, ly, lz, seg = 12, o = {}) => {
          const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open, o.thetaStart || 0, o.thetaLength || Math.PI * 2);
          g.translate(0, h / 2, 0);
          return kit.add(bucket, g, color, f.m(lx, ly, lz, o.rx || 0, o.ry || 0, o.rz || 0));
        },
        /** geometry at a local transform */
        geo: (bucket, g, color, lx = 0, ly = 0, lz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => kit.add(bucket, g, color, f.m(lx, ly, lz, rx, ry, rz, sx, sy, sz)),
        /** atlas plane (sign face) facing local +z (after rotation ry) */
        plane: (region, w, h, lx, ly, lz, ry = 0, bucket = 'atlasS', o = {}) => {
          const g = regionUV(new THREE.PlaneGeometry(w, h), region, o);
          return kit.add(bucket, g, '#fff', f.m(lx, ly, lz, o.rx || 0, ry, o.rz || 0));
        },
        /** tube between two local points */
        tube: (bucket, a, b, r, color, seg = 6) => kit.add(bucket, tubeBetween(f.p(a[0], a[1], a[2]), f.p(b[0], b[1], b[2]), r, seg), color),
      };
      return f;
    },
    /** World-space frame (identity). */
    get world() { return kit.frame(0, 0, 0, 0); },
    /** Merge every bucket into meshes under a new group. */
    finish(name) {
      const group = new THREE.Group();
      group.name = name;
      let tris = 0;
      for (const [k, d] of Object.entries(defs)) {
        const list = geoms[k];
        if (!list.length) continue;
        const merged = ctx.geom.merge(list, d.vc ? ['color'] : []);
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, d.mat);
        mesh.name = `${name}:${k}`;
        mesh.castShadow = d.cast;
        mesh.receiveShadow = true;
        if (d.noOutline) mesh.userData.noOutline = true;
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
        tris += (merged.index ? merged.index.count : merged.attributes.position.count) / 3;
        list.length = 0;
      }
      group.userData.triangles = tris;
      return group;
    },
  };
  return kit;
}
