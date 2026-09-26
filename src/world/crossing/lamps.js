/**
 * crossing/lamps.js — everything that lights up.
 *
 *   lenses  one InstancedMesh (unlit, instance colours) for every red lamp:
 *           the twin flashing lamps on both faces of each post (groups A / B,
 *           alternating), the omni lamps on the post tops and the LEDs on
 *           the booms.  Off = dull maroon glass, on = HDR red (blooms).
 *   glows   one InstancedMesh of additive camera-facing cards, one per lens,
 *           scaled by how directly the lamp faces the camera.
 *   arrows  one InstancedMesh for the ← → train direction indicators.
 *
 * All three are updated in place each frame (no allocation).
 */
import * as THREE from 'three';
import { regionUV } from './kit.js';

const ON = new THREE.Color(4.2, 0.55, 0.32);
const OFF = new THREE.Color(0.34, 0.07, 0.07);
const GLOW = new THREE.Color(1.0, 0.26, 0.14);
const ARROW_ON = new THREE.Color(2.4, 1.75, 0.85);
const ARROW_OFF = new THREE.Color(0.055, 0.055, 0.065);
const BLACK = new THREE.Color(0, 0, 0);

/** Hemisphere lens, pole along +z, unit radius. */
function lensGeometry() {
  const g = new THREE.SphereGeometry(1, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * staticLenses: [{pos, normal, r, depth, group, glow, omni?}]
 * dynLenses: same shape, positions updated by the booms (objects are reused)
 * arrows: [{matrix, side, unit, face}]
 */
export function createLamps(kit, staticLenses, dynLenses, arrows) {
  const { M, DR } = kit;
  const all = [...staticLenses, ...dynLenses];
  const n = all.length;
  const group = new THREE.Group();
  group.name = 'crossing:lamps';

  const lens = new THREE.InstancedMesh(lensGeometry(), M.lamp, n);
  lens.name = 'crossing:lenses';
  lens.userData.noOutline = true;
  lens.castShadow = false;
  lens.frustumCulled = false;
  group.add(lens);

  const glowGeo = regionUV(new THREE.PlaneGeometry(1, 1), DR.glow);
  const glow = new THREE.InstancedMesh(glowGeo, M.glow, n);
  glow.name = 'crossing:glow';
  glow.userData.noOutline = true;
  glow.castShadow = false;
  glow.receiveShadow = false;
  glow.frustumCulled = false;
  glow.renderOrder = 5;
  group.add(glow);

  const arrowGeo = regionUV(new THREE.PlaneGeometry(0.17, 0.11), DR.arrow);
  const arrow = new THREE.InstancedMesh(arrowGeo, M.arrow, arrows.length);
  arrow.name = 'crossing:arrows';
  arrow.userData.noOutline = true;
  arrow.castShadow = false;
  arrows.forEach((a, i) => {
    const m = a.matrix.clone();
    if (a.side < 0) m.multiply(new THREE.Matrix4().makeRotationZ(Math.PI)); // left-pointing
    arrow.setMatrixAt(i, m);
    arrow.setColorAt(i, ARROW_OFF);
  });
  arrow.instanceMatrix.needsUpdate = true;
  arrow.computeBoundingSphere();
  group.add(arrow);

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  const _z = new THREE.Vector3(0, 0, 1), _toCam = new THREE.Vector3(), _c = new THREE.Color();

  function placeLens(i) {
    const L = all[i];
    _q.setFromUnitVectors(_z, L.normal);
    _s.set(L.r, L.r, L.r * L.depth);
    _m.compose(L.pos, _q, _s);
    lens.setMatrixAt(i, _m);
  }
  for (let i = 0; i < n; i++) { placeLens(i); lens.setColorAt(i, OFF); glow.setColorAt(i, BLACK); }
  lens.instanceMatrix.needsUpdate = true;

  /**
   * lit: { A: 0..1, B: 0..1, omni: 0..1 }; arrowsLit: function(arrowDef) -> bool
   * camera: THREE.Camera; movedBooms: re-place the boom lenses.
   */
  function update(lit, arrowsLit, camera, movedBooms) {
    if (movedBooms) {
      for (let i = staticLenses.length; i < n; i++) placeLens(i);
      lens.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < n; i++) {
      const L = all[i];
      const k = lit[L.group] || 0;
      _c.copy(OFF).lerp(ON, k);
      lens.setColorAt(i, _c);
      // glow card: faces the camera, sized by lamp facing
      _toCam.subVectors(camera.position, L.pos);
      const dist = _toCam.length();
      _toCam.multiplyScalar(1 / Math.max(dist, 1e-3));
      const facing = L.omni ? 1 : THREE.MathUtils.clamp((L.normal.dot(_toCam) + 0.15) * 1.6, 0, 1);
      const vis = k * facing;
      const size = vis > 0.01 ? L.r * 9 * L.glow * (0.75 + 0.25 * Math.min(1, dist / 25)) : 0.0001;
      _p.copy(L.pos).addScaledVector(_toCam, Math.min(0.3, L.r * 2.2));
      _s.set(size, size, size);
      _m.compose(_p, camera.quaternion, _s);
      glow.setMatrixAt(i, _m);
      _c.copy(GLOW).multiplyScalar(vis);
      glow.setColorAt(i, _c);
    }
    lens.instanceColor.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    glow.instanceColor.needsUpdate = true;
    for (let i = 0; i < arrows.length; i++) arrow.setColorAt(i, arrowsLit(arrows[i]) ? ARROW_ON : ARROW_OFF);
    arrow.instanceColor.needsUpdate = true;
  }
  return { group, update };
}
