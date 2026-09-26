/**
 * Geometry helpers.
 *
 * The scene contains thousands of small parts.  Build them naturally with
 * Groups and Meshes, then call bakeStatic(group) once: it merges every static
 * mesh that shares a material into a single draw call (world transforms baked
 * in).  InstancedMesh / Points / Lines / meshes with userData.dynamic = true
 * are kept as-is so they can still be animated.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * Build a transform matrix. rotation in radians, order YXZ (yaw first).
 */
export function matrix(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  _s.set(sx, sy, sz);
  _p.set(x, y, z);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/** Box geometry whose origin is at the bottom-centre (sits on y = 0). */
export function boxBottom(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}

/**
 * Add a box mesh to a parent.  Position is the box CENTRE unless opts.bottom.
 * returns the mesh.
 */
export function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
  const g = opts.bottom ? boxBottom(w, h, d) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.castShadow !== undefined) m.castShadow = opts.castShadow;
  if (opts.receiveShadow !== undefined) m.receiveShadow = opts.receiveShadow;
  if (opts.noOutline) m.userData.noOutline = true;
  parent.add(m);
  return m;
}

/** Cylinder mesh with origin at its bottom. */
export function addCylinder(parent, rTop, rBot, h, material, x = 0, y = 0, z = 0, radial = 12, opts = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, radial, 1, !!opts.open);
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.noOutline) m.userData.noOutline = true;
  parent.add(m);
  return m;
}

/** A flat textured plane (e.g. a sign face).  Faces +Z by default. */
export function addPlane(parent, w, h, material, x = 0, y = 0, z = 0, ry = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.noOutline !== false) m.userData.noOutline = true; // decals should not outline by default
  m.castShadow = false;
  parent.add(m);
  return m;
}

/**
 * Gable roof geometry: two slabs meeting at a ridge that runs along local X.
 * width along X (ridge direction), depth along Z (wall to wall), rise = ridge
 * height above the wall top.  overhang extends the eaves on all sides and the
 * slabs have `thickness` so the eave edge reads clearly in toon style.
 * Origin: y = 0 at the wall top, centred.  Eave edges end up slightly below 0.
 */
export function gableRoof(width, depth, rise, overhang = 0.5, thickness = 0.14) {
  const W = width + overhang * 2;
  const half = depth / 2;
  const a = Math.atan2(rise, half);
  const L = (half + overhang) / Math.cos(a);
  const slabs = [];
  for (const side of [1, -1]) {
    const g = new THREE.BoxGeometry(W, thickness, L);
    g.translate(0, -thickness / 2, L / 2);
    g.rotateX(a);
    if (side < 0) g.rotateY(Math.PI);
    g.translate(0, rise, 0);
    slabs.push(g);
  }
  return merge(slabs);
}

/** Triangular gable-end infill (the wall triangle under a gable roof) facing ±Z at local X ends. */
export function gableEnd(depth, rise, thickness = 0.12) {
  const s = new THREE.Shape();
  s.moveTo(-depth / 2, 0);
  s.lineTo(depth / 2, 0);
  s.lineTo(0, rise);
  s.lineTo(-depth / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
  g.translate(0, 0, -thickness / 2);
  g.rotateY(Math.PI / 2); // triangle now lies in the YZ plane
  return g;
}

/**
 * Hip-ish "prism" roof: simple mono-pitch (shed) roof.  Origin at the low eave,
 * slopes up towards -Z.
 */
export function shedRoof(width, depth, rise, overhang = 0.4, thickness = 0.12) {
  const D = depth + overhang * 2;
  const len = Math.hypot(D, rise * (D / depth));
  const g = new THREE.BoxGeometry(width + overhang * 2, thickness, len);
  g.rotateX(Math.atan2(rise, depth));
  g.translate(0, rise / 2, 0);
  return g;
}

/** Points along a hanging wire between a and b (Vector3), sag metres at mid-span. */
export function catenaryPoints(a, b, sag = 0.4, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

/**
 * Thin tube along a polyline (for wires / cables / railings).  Cheap: no
 * curve evaluation, radial segments default 4.  Returns BufferGeometry in world
 * space of the given points.
 */
export function tubeAlong(points, radius = 0.015, radial = 4) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const up = new THREE.Vector3(0, 1, 0);
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  const bn = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    t.subVectors(b, a).normalize();
    n.crossVectors(t, up);
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
    n.normalize();
    bn.crossVectors(n, t).normalize();
    for (let j = 0; j < radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const cx = Math.cos(ang), sy = Math.sin(ang);
      const nx = n.x * cx + bn.x * sy, ny = n.y * cx + bn.y * sy, nz = n.z * cx + bn.z * sy;
      positions.push(p.x + nx * radius, p.y + ny * radius, p.z + nz * radius);
      normals.push(nx, ny, nz);
      uvs.push(j / radial, i / (points.length - 1));
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

/** Make a geometry mergeable: indexed, has position/normal/uv, no extra attributes (unless keep). */
export function ensureAttrs(g, keep = []) {
  if (!g.index) {
    const count = g.attributes.position.count;
    const idx = new (count > 65535 ? Uint32Array : Uint16Array)(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv' && !keep.includes(name)) g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/** Merge geometries (auto-normalising attributes).  keep: extra attribute names (e.g. ['color']). */
export function merge(geoms, keep = []) {
  if (!geoms.length) return null;
  // ensure every geometry has kept attributes when any has them
  for (const k of keep) {
    const sample = geoms.find((g) => g.attributes[k]);
    if (!sample) continue;
    const itemSize = sample.attributes[k].itemSize;
    for (const g of geoms) {
      if (!g.attributes[k]) {
        const arr = new Float32Array(g.attributes.position.count * itemSize).fill(1);
        g.setAttribute(k, new THREE.BufferAttribute(arr, itemSize));
      }
    }
  }
  const norm = geoms.map((g) => ensureAttrs(g, keep));
  // index width must match
  const out = mergeGeometries(norm, false);
  return out;
}

/** Paint a flat vertex colour onto a geometry (for merged multi-colour props with vertexColors materials). */
export function paint(g, color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/**
 * Merge all static meshes under `root` by material.  Returns a NEW Group
 * (the input is consumed).  Options:
 *   castShadow (default true), receiveShadow (default true), name
 * Per-mesh flags respected: userData.noOutline, userData.dynamic (kept as-is),
 * castShadow === false on a source mesh keeps it out of shadow casting.
 */
export function bakeStatic(root, opts = {}) {
  const out = new THREE.Group();
  out.name = opts.name || root.name || 'baked';
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const keepers = [];
  root.traverse((o) => {
    if (o === root) return;
    // skip descendants of kept objects (they move with their parent)
    let p = o.parent;
    while (p && p !== root) { if (p.userData.__kept) return; p = p.parent; }
    if (o.userData.dynamic || o.isInstancedMesh || o.isPoints || o.isLine || o.isSprite || o.isSkinnedMesh || o.isLight || (o.isMesh && Array.isArray(o.material))) {
      o.userData.__kept = true;
      keepers.push(o);
      return;
    }
    if (!o.isMesh) return;
    const mat = o.material;
    const noOutline = !!o.userData.noOutline || !!mat.userData?.isGlass;
    const cast = o.castShadow !== false && opts.castShadow !== false && !mat.transparent;
    const key = `${mat.uuid}|${noOutline}|${cast}`;
    let b = buckets.get(key);
    if (!b) { b = { mat, noOutline, cast, geoms: [], vc: !!mat.vertexColors }; buckets.set(key, b); }
    const g = o.geometry.clone();
    _m.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(_m);
    b.geoms.push(g);
  });
  for (const b of buckets.values()) {
    // chunk very large buckets to keep frustum culling useful and index sizes sane
    const merged = merge(b.geoms, b.vc ? ['color'] : []);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = opts.receiveShadow !== false;
    if (b.noOutline) mesh.userData.noOutline = true;
    mesh.name = `${out.name}:${b.mat.name}`;
    merged.computeBoundingSphere();
    out.add(mesh);
  }
  for (const k of keepers) {
    // preserve world transform relative to root
    const m = new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld);
    k.removeFromParent();
    m.decompose(k.position, k.quaternion, k.scale);
    delete k.userData.__kept;
    out.add(k);
  }
  out.position.copy(root.position);
  out.quaternion.copy(root.quaternion);
  out.scale.copy(root.scale);
  // root's own transform was inverted above; baked children are in root-local space
  return out;
}

/**
 * Build an InstancedMesh from a list of matrices (or {x,y,z,ry,s} objects).
 */
export function instanced(geometry, material, transforms, opts = {}) {
  const n = transforms.length;
  const im = new THREE.InstancedMesh(geometry, material, Math.max(1, n));
  for (let i = 0; i < n; i++) {
    const t = transforms[i];
    const m = t.isMatrix4 ? t : matrix(t.x || 0, t.y || 0, t.z || 0, t.rx || 0, t.ry || 0, t.rz || 0, t.s ?? t.sx ?? 1, t.s ?? t.sy ?? 1, t.s ?? t.sz ?? 1);
    im.setMatrixAt(i, m);
    if (t.color) im.setColorAt(i, new THREE.Color(t.color));
  }
  im.count = n;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = opts.castShadow !== false;
  im.receiveShadow = opts.receiveShadow !== false;
  if (opts.noOutline) im.userData.noOutline = true;
  im.computeBoundingSphere();
  im.computeBoundingBox?.();
  return im;
}

/** Place an object on the ground at (x,z) with yaw ry using the layout groundY. */
export function placeAt(obj, x, y, z, ry = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  return obj;
}

export default { matrix, boxBottom, addBox, addCylinder, addPlane, gableRoof, gableEnd, shedRoof, catenaryPoints, tubeAlong, ensureAttrs, merge, paint, bakeStatic, instanced, placeAt };
