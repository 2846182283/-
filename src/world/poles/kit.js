/**
 * poles/kit.js — materials, geometry buckets and small geometry helpers.
 *
 * Draw-call strategy: every static part of every pole, sign and mirror is
 * transformed to world space and dropped into a bucket (material + outline +
 * shadow flags).  Solid colours are baked as vertex colours, textured parts
 * use regions of one canvas atlas, all wires share one tube material.  Each
 * bucket is further split into a handful of coarse street regions (see
 * regionOf) so views looking away from part of the network can frustum-cull
 * it: ~8 regions x <=8 buckets, of which a typical view draws 10-30 meshes.
 */
import * as THREE from 'three';

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

/** Matrix from position / YXZ euler / scale (a fresh Matrix4). */
export function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Box with its origin at the bottom centre. */
export function boxB(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}

/** Cylinder with its origin at the bottom centre. */
export function cylB(rt, rb, h, seg = 12, open = false, thetaStart = 0, thetaLength = Math.PI * 2) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, thetaStart, thetaLength);
  g.translate(0, h / 2, 0);
  return g;
}

/** Cylinder (radius r / rb, `seg` sides) spanning two world points. */
export function tubeBetween(a, b, r, seg = 6, rb = r) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, rb, len, seg, 1, false);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Remap a geometry's 0..1 UVs into an atlas region. */
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

/** Planar XY projection of a geometry's positions into an atlas region (for shaped sign faces). */
export function planarUV(g, r, minX, maxX, minY, maxY) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) - minX) / (maxX - minX);
    const v = (pos.getY(i) - minY) / (maxY - minY);
    uv[i * 2] = r.u0 + u * (r.u1 - r.u0);
    uv[i * 2 + 1] = r.v0 + v * (r.v1 - r.v0);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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
 * Wire material vertex patch: every wire vertex is pushed outward along its
 * normal so the tube is never thinner than ~1.3 px on screen (uv.x carries the
 * true radius).  Distant wires therefore stay crisp continuous lines instead
 * of breaking up into dots — the way wires are drawn in anime backgrounds.
 */
export const WIRE_UNIFORMS = { wirePx: { value: 0.0008 } }; // min radius per metre of distance (updated per frame)
const WIRE_PATCH = {
  key: 'poles-wire-minwidth-v2',
  uniforms: WIRE_UNIFORMS,
  pars: 'uniform float wirePx;\nvarying float vWireD;',
  main: /* glsl */ `
    {
      vec4 wpW = modelMatrix * vec4( transformed, 1.0 );
      float dW = distance( wpW.xyz, cameraPosition );
      transformed += objectNormal * max( 0.0, min( dW * wirePx, 0.045 ) - uv.x ); // capped: far bundles may thin out
      vWireD = dW;
    }
  `,
};

/**
 * Aerial perspective for wires: distant (min-width) wires fade toward the fog
 * colour so converging bundles stay airy instead of forming a dark knot.
 */
function wireHaze(shader) {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vWireD;')
    .replace('#include <fog_fragment>', `
      #ifdef USE_FOG
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, smoothstep( 12.0, 150.0, vWireD ) * 0.7 );
      #endif
      #include <fog_fragment>`);
}

/**
 * Keep WIRE_UNIFORMS.wirePx equal to ~0.9 px of screen size per metre of
 * view distance (the square tube profile then stays >= ~1.3 px wide).  Call every frame.
 */
export function updateWireWidth(camera, renderer, size) {
  renderer.getDrawingBufferSize(size);
  const pxAngle = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, size.y);
  WIRE_UNIFORMS.wirePx.value = pxAngle * 0.9;
}

/**
 * Coarse culling region of a world point: the north line (W / E of the
 * station), the station-front junction, the station-front road west / east,
 * and three stretches of the main street.  Boundaries sit between poles so a
 * pole's parts mostly land in one region.
 */
export function regionOf(x, z) {
  if (z < -30) return x < -25 ? 'NW' : 'NE';
  if (z > 130) return 'M2';
  if (z > 58) return 'M1';
  if (x < -35) return 'W';
  if (x > 40) return 'E';
  return z > 30 ? 'M0' : 'C';
}

const _box = new THREE.Box3();
const _ctr = new THREE.Vector3();
const SMALL = 0.1; // parts smaller than this (m) skip the outline + shadow pass
const DEMOTE = { vc: 'vcS', metal: 'metalS' };

export function createKit(ctx, atlas) {
  const { toon } = ctx;
  const M = {
    vc: toon.mat('#ffffff', { vertexColors: true, name: 'pl_vc' }),
    metal: toon.metal('#ffffff', { vertexColors: true, spec: 0.4, shininess: 50, name: 'pl_metal' }),
    atlas: toon.mat('#ffffff', { map: atlas.texture, name: 'pl_atlas' }),
    decal: toon.mat('#ffffff', { map: atlas.texture, polygonOffset: 2, name: 'pl_decal' }),
    glow: toon.unlit('#ffffff', { map: atlas.texture, name: 'pl_glow' }),
    wire: toon.mat(ctx.palette.wire, { vertexPatch: WIRE_PATCH, onShader: wireHaze, onShaderKey: 'pl-wire-haze', name: 'pl_wire' }),
  };

  /**
   * Buckets: name -> { mat, noOutline, cast, vc }.  `S` suffix = small parts
   * (no outline, no shadow) so they don't turn into black mush at distance.
   */
  const defs = {
    vc: { mat: M.vc, noOutline: false, cast: true, vc: true },
    vcS: { mat: M.vc, noOutline: true, cast: false, vc: true },
    metal: { mat: M.metal, noOutline: false, cast: true, vc: true },
    metalS: { mat: M.metal, noOutline: true, cast: false, vc: true },
    // the three atlas buckets are small (a few k triangles): one mesh each, not split by region
    atlas: { mat: M.atlas, noOutline: false, cast: true, vc: false, whole: true },
    decal: { mat: M.decal, noOutline: true, cast: false, vc: false, whole: true },
    glow: { mat: M.glow, noOutline: true, cast: false, vc: false, whole: true },
    wire: { mat: M.wire, noOutline: true, cast: false, vc: false, raw: true },
  };
  // bucket -> region -> [geometry]
  const geoms = Object.fromEntries(Object.keys(defs).map((k) => [k, new Map()]));
  /** File a world-space geometry under its bucket + region (by bbox centre). */
  const file = (bucket, g) => {
    let reg = 'all';
    if (!defs[bucket].whole) {
      g.computeBoundingBox();
      _box.copy(g.boundingBox).getCenter(_ctr);
      reg = regionOf(_ctr.x, _ctr.z);
    }
    const m = geoms[bucket];
    if (!m.has(reg)) m.set(reg, []);
    m.get(reg).push(g);
  };
  // prototype cache: identical small parts (bolts, insulators...) are generated once and cloned
  const protos = new Map();

  const kit = {
    ctx,
    M,
    R: atlas.R,
    /** Add a geometry (consumed) to a bucket with an optional colour and world matrix. */
    add(bucket, g, color = '#ffffff', m = null) {
      if (!defs[bucket]) throw new Error(`poles: unknown bucket ${bucket}`);
      if (m) g.applyMatrix4(m);
      // tiny outlined parts (bolts, clamps, lugs) would only become black specks in the outline pass
      if (DEMOTE[bucket]) {
        g.computeBoundingBox();
        _box.copy(g.boundingBox).getSize(_ctr);
        if (Math.max(_ctr.x, _ctr.y, _ctr.z) < SMALL) bucket = DEMOTE[bucket];
      }
      const d = defs[bucket];
      if (d.vc) paint(g, color);
      else if (g.attributes.color) g.deleteAttribute('color');
      file(bucket, g);
      return g;
    },
    /** Cached prototype geometry, cloned on each call. */
    proto(key, make) {
      let g = protos.get(key);
      if (!g) { g = make(); protos.set(key, g); }
      return g.clone();
    },
    /** Add a finished world-space wire geometry (from wireTube). */
    addWire(g) { file('wire', g); },
    /**
     * A local frame (world matrix F) for building one object.  Parts are
     * given in local coordinates; `f.m(...)` returns F * local.
     */
    frame(F) {
      const f = {
        F,
        m: (lx = 0, ly = 0, lz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().multiplyMatrices(F, mtx(lx, ly, lz, rx, ry, rz, sx, sy, sz)),
        p: (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(F),
        /** box centred at (lx,ly,lz) */
        box: (bucket, w, h, d, color, lx, ly, lz, rx = 0, ry = 0, rz = 0) => kit.add(bucket, kit.proto(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)), color, f.m(lx, ly, lz, rx, ry, rz)),
        /** cylinder standing on (lx,ly,lz) along local y (then rotated) */
        cyl: (bucket, rt, rb, h, color, lx, ly, lz, seg = 10, rx = 0, ry = 0, rz = 0, open = false) =>
          kit.add(bucket, kit.proto(`c${rt}|${rb}|${h}|${seg}|${open}`, () => cylB(rt, rb, h, seg, open)), color, f.m(lx, ly, lz, rx, ry, rz)),
        /** arbitrary geometry at a local transform */
        geo: (bucket, g, color, lx = 0, ly = 0, lz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => kit.add(bucket, g, color, f.m(lx, ly, lz, rx, ry, rz, sx, sy, sz)),
        /** atlas plane facing local +z (after rotation ry) */
        plane: (region, w, h, lx, ly, lz, ry = 0, bucket = 'decal', o = {}) => {
          const g = regionUV(new THREE.PlaneGeometry(w, h), region, o);
          return kit.add(bucket, g, '#fff', f.m(lx, ly, lz, o.rx || 0, ry, o.rz || 0));
        },
        /** tube between two local points */
        tube: (bucket, a, b, r, color, seg = 6) => kit.add(bucket, tubeBetween(f.p(a[0], a[1], a[2]), f.p(b[0], b[1], b[2]), r, seg), color),
      };
      return f;
    },
    /** Merge every bucket, region by region, into meshes under a new group. */
    finish(name) {
      const group = new THREE.Group();
      group.name = name;
      let tris = 0;
      for (const [k, d] of Object.entries(defs)) {
        for (const [reg, list] of geoms[k]) {
          const merged = ctx.geom.merge(list, d.vc ? ['color'] : []);
          merged.computeBoundingSphere();
          if (d.raw) merged.boundingSphere.radius += 0.1; // min-width wire inflation
          const mesh = new THREE.Mesh(merged, d.mat);
          mesh.name = `${name}:${k}:${reg}`;
          mesh.castShadow = d.cast;
          mesh.receiveShadow = !d.raw;
          if (d.noOutline) mesh.userData.noOutline = true;
          mesh.matrixAutoUpdate = false;
          group.add(mesh);
          tris += (merged.index ? merged.index.count : merged.attributes.position.count) / 3;
        }
        geoms[k].clear();
      }
      group.userData.triangles = tris;
      return group;
    },
  };
  return kit;
}

/**
 * Tube along a polyline for wires.  uv.x stores the radius (read by the wire
 * material's min-width patch), uv.y the position along the wire.
 */
export function wireTube(points, radius, radial = 4) {
  const n = points.length;
  const positions = new Float32Array(n * radial * 3);
  const normals = new Float32Array(n * radial * 3);
  const uvs = new Float32Array(n * radial * 2);
  const idx = [];
  const t = new THREE.Vector3(), nn = new THREE.Vector3(), bn = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    t.subVectors(b, a).normalize();
    nn.crossVectors(t, up);
    if (nn.lengthSq() < 1e-6) nn.set(1, 0, 0);
    nn.normalize();
    bn.crossVectors(nn, t).normalize();
    for (let j = 0; j < radial; j++) {
      const ang = (j / radial) * Math.PI * 2 + Math.PI / 4;
      const cx = Math.cos(ang), sy = Math.sin(ang);
      const nx = nn.x * cx + bn.x * sy, ny = nn.y * cx + bn.y * sy, nz = nn.z * cx + bn.z * sy;
      const k = i * radial + j;
      positions[k * 3] = p.x + nx * radius; positions[k * 3 + 1] = p.y + ny * radius; positions[k * 3 + 2] = p.z + nz * radius;
      normals[k * 3] = nx; normals[k * 3 + 1] = ny; normals[k * 3 + 2] = nz;
      uvs[k * 2] = radius; uvs[k * 2 + 1] = i / (n - 1);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}
