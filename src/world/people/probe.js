/**
 * people/probe — fast "what is the top surface under (x, z)?" queries against
 * geometry other modules have already built (wall tops, shrine stones ...).
 *
 * A THREE.Raycaster against the whole scene is far too slow for the few
 * thousand probes the cat-perch search makes (merged meshes hold 100k+
 * triangles and have no BVH).  Instead, one pass collects the world-space
 * triangles overlapping a search region into a uniform xz grid; a downward
 * probe then only tests the triangles of one cell with a 2D point-in-triangle
 * test and barycentric height.
 */
import * as THREE from 'three';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _box = new THREE.Box3();

/**
 * @param {THREE.Object3D[]} roots   objects to scan (recursively)
 * @param {{x0:number,x1:number,z0:number,z1:number}} region  world xz bounds
 * @param {number} [cell]  grid cell size (m)
 * @returns {(x:number, z:number, fromY:number) => ({y:number, ny:number} | null)}
 */
export function makeRegionProbe(roots, region, cell = 0.5) {
  const { x0, x1, z0, z1 } = region;
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell));
  const nz = Math.max(1, Math.ceil((z1 - z0) / cell));
  const cells = new Array(nx * nz);
  const tris = []; // flat: ax ay az bx by bz cx cy cz ny
  const addTri = (a, b, c) => {
    const tx0 = Math.min(a.x, b.x, c.x), tx1 = Math.max(a.x, b.x, c.x);
    const tz0 = Math.min(a.z, b.z, c.z), tz1 = Math.max(a.z, b.z, c.z);
    if (tx1 < x0 || tx0 > x1 || tz1 < z0 || tz0 > z1) return;
    // face normal y (unit) — used to reject walls / steep faces
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const len = Math.hypot(cx, cy, cz);
    if (len < 1e-9 || Math.abs(cy) / len < 0.2) return; // vertical faces never hold a cat
    const id = tris.length / 10;
    tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, Math.abs(cy) / len);
    const i0 = Math.max(0, Math.floor((tx0 - x0) / cell)), i1 = Math.min(nx - 1, Math.floor((tx1 - x0) / cell));
    const k0 = Math.max(0, Math.floor((tz0 - z0) / cell)), k1 = Math.min(nz - 1, Math.floor((tz1 - z0) / cell));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) (cells[k * nx + i] ||= []).push(id);
  };
  const regionBox = new THREE.Box3(new THREE.Vector3(x0, -1e4, z0), new THREE.Vector3(x1, 1e4, z1));
  for (const root of roots) {
    root.updateMatrixWorld(true); // modules are built but not rendered yet: matrices may be stale
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!mat || mat.transparent || o.userData.noOutline) return; // decals / glass / cards are not perches
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      _box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
      if (!_box.intersectsBox(regionBox)) return;
      const pos = g.attributes.position, m = o.matrixWorld;
      const idx = g.index ? g.index.array : null;
      const n = idx ? idx.length : pos.count;
      for (let t = 0; t < n; t += 3) {
        const ia = idx ? idx[t] : t, ib = idx ? idx[t + 1] : t + 1, ic = idx ? idx[t + 2] : t + 2;
        _a.fromBufferAttribute(pos, ia).applyMatrix4(m);
        _b.fromBufferAttribute(pos, ib).applyMatrix4(m);
        _c.fromBufferAttribute(pos, ic).applyMatrix4(m);
        addTri(_a, _b, _c);
      }
    });
  }
  return (x, z, fromY) => {
    const i = Math.floor((x - x0) / cell), k = Math.floor((z - z0) / cell);
    if (i < 0 || k < 0 || i >= nx || k >= nz) return null;
    const list = cells[k * nx + i];
    if (!list) return null;
    let best = null;
    for (const id of list) {
      const o = id * 10;
      const ax = tris[o], az = tris[o + 2], bx = tris[o + 3], bz = tris[o + 5], cx = tris[o + 6], cz = tris[o + 8];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
      const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * tris[o + 1] + l2 * tris[o + 4] + l3 * tris[o + 7];
      if (y > fromY) continue;
      if (!best || y > best.y) best = { y, ny: tris[o + 9] };
    }
    return best;
  };
}
