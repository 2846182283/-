/**
 * Station clocks.  Faces are static decals (atlas); the hands of every clock
 * in the station live in ONE InstancedMesh whose matrices are updated each
 * frame from the simulation time (the scene starts at 16:00).
 *
 *   const clocks = createClocks(kit);
 *   clocks.face(parent, x, y, z, ry, radius)   // registers a face (+ housing)
 *   root.add(clocks.finish())                    // after all faces are placed
 */
import * as THREE from 'three';

const START_SECONDS = 16 * 3600 + 2 * 60; // 16:02 when the scene starts

export function createClocks(kit, signs) {
  const faces = [];
  const { M } = kit;

  function face(parent, x, y, z, ry, r, o = {}) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    if (o.housing !== false) {
      // round housing: short cylinder with its axis along local Z
      const depth = o.depth ?? 0.08;
      const cyl = new THREE.CylinderGeometry(r * 1.08, r * 1.08, depth, 28);
      cyl.rotateX(Math.PI / 2);
      cyl.translate(0, 0, -depth / 2);
      kit.add(g, cyl, M.metal, o.rim || '#e9e8e2');
    }
    kit.decal(g, signs.clock, r * 2, r * 2, 0, 0, 0.004, 0, { mat: o.mat || kit.M.signIn });
    g.updateMatrixWorld(true);
    faces.push({ matrix: g.matrixWorld.clone(), r });
    return g;
  }

  let mesh = null;
  function finish(root) {
    // one unit "hand" geometry: pointing up (+Y), pivot at the origin, slightly in front of the face
    const hand = new THREE.BoxGeometry(1, 1, 1);
    hand.translate(0, 0.38, 0.5);
    const n = faces.length * 3;
    mesh = new THREE.InstancedMesh(hand, kit.ctx.toon.mat('#2b2f3a', { name: 'st_clockhand' }), Math.max(1, n));
    mesh.userData.noOutline = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.name = 'station:clockHands';
    const red = new THREE.Color('#d8342c'), dark = new THREE.Color('#2b2f3a');
    for (let i = 0; i < n; i++) mesh.setColorAt(i, i % 3 === 2 ? red : dark);
    mesh.instanceColor.needsUpdate = true;
    update(0);
    root.add(mesh);
    return mesh;
  }

  const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _s = new THREE.Matrix4(), _t = new THREE.Matrix4();
  /** Point every hand at time t (sim seconds since start). */
  function update(t) {
    if (!mesh) return;
    const secs = START_SECONDS + t;
    const sec = secs % 60, min = (secs / 60) % 60, hr = (secs / 3600) % 12;
    // hands: [angle, length (x r), width (x r), z-offset]
    const spec = [
      [(hr / 12) * Math.PI * 2, 0.55, 0.075, 0.006],
      [(min / 60) * Math.PI * 2, 0.82, 0.05, 0.012],
      [(Math.floor(sec) / 60) * Math.PI * 2, 0.86, 0.018, 0.018],
    ];
    let k = 0;
    for (const f of faces) {
      for (const [ang, len, wid, dz] of spec) {
        _s.makeScale(f.r * wid, f.r * len, 0.008);
        _r.makeRotationZ(-ang);
        _t.makeTranslation(0, 0, dz);
        _m.copy(f.matrix).multiply(_t).multiply(_r).multiply(_s);
        mesh.setMatrixAt(k++, _m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { face, finish, update, faces };
}
