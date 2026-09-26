/**
 * Spring afternoon (~16:00) lighting.
 *
 * The sun sits behind-left of the hero view (north-west, low), so the hero
 * shot is gently backlit: long soft shadows run toward the camera, sakura
 * canopies get warm rims, and shaded faces fall into the blue-violet shadow
 * tint supplied by the hemisphere light + toon shading.
 */
import * as THREE from 'three';

export const SUN = {
  // direction TOWARD the sun (world space).  Override with ?sun=azimuthDeg,elevationDeg
  dir: new THREE.Vector3(-0.62, 0.5, -0.6).normalize(),
  color: new THREE.Color('#ffe7c9'),
  intensity: 2.9,
};

export function setSunAngles(azDeg, elDeg) {
  // azimuth measured from north (-Z) toward west (-X)... i.e. 0 = north, 90 = west, 180 = south, 270 = east
  const az = THREE.MathUtils.degToRad(azDeg);
  const el = THREE.MathUtils.degToRad(elDeg);
  SUN.dir.set(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

export function createLighting(scene, renderer, quality = 'high') {
  const group = new THREE.Group();
  group.name = 'lighting';

  const hemi = new THREE.HemisphereLight('#d3e3ff', '#dccbc6', 2.15);
  hemi.position.set(0, 1, 0);
  group.add(hemi);

  const sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
  sun.castShadow = true;
  const low = quality === 'low';
  const size = low ? 2048 : 4096;
  sun.shadow.mapSize.set(size, size);
  const ext = low ? 68 : 85;
  const cam = sun.shadow.camera;
  cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext;
  cam.near = 1; cam.far = 420;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2.5;
  group.add(sun);
  group.add(sun.target);

  scene.add(group);

  const focus = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const p = new THREE.Vector3();
  const lightSpace = new THREE.Matrix4();
  const lightSpaceInv = new THREE.Matrix4();
  const ORIGIN = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const negSun = new THREE.Vector3();
  // The frustum is re-centred in coarse steps (whole texels, ~6 m) so the shadow map only has to be
  // re-rendered when it actually moves or something big is moving inside it.
  const SNAP = Math.round(6 / ((ext * 2) / size)) * ((ext * 2) / size);
  function refreshLightSpace() {
    negSun.copy(SUN.dir).negate();
    lightSpace.lookAt(ORIGIN, negSun, UP);
    lightSpaceInv.copy(lightSpace).invert();
  }
  refreshLightSpace();

  let framesSince = 1e9;
  let lastSunX = NaN, lastSunY = NaN, lastSunZ = NaN;
  const state = { needsShadow: true };

  /**
   * Re-centre the shadow frustum ahead of the camera and decide whether the shadow map must be
   * re-rendered this frame (moved frustum, trains moving nearby, sun moved, or a periodic refresh
   * at ~20 Hz for small animated casters such as people, barriers and doors).
   */
  function update(camera, sim) {
    if (SUN.dir.x !== lastSunX || SUN.dir.y !== lastSunY || SUN.dir.z !== lastSunZ) {
      refreshLightSpace();
      lastSunX = SUN.dir.x; lastSunY = SUN.dir.y; lastSunZ = SUN.dir.z;
      framesSince = 1e9;
    }
    camera.getWorldDirection(tmp);
    tmp.y = 0;
    if (tmp.lengthSq() < 1e-4) tmp.set(0, 0, -1);
    tmp.normalize();
    focus.copy(camera.position).addScaledVector(tmp, ext * 0.5);
    focus.y = 0;
    p.copy(focus).applyMatrix4(lightSpaceInv);
    p.x = Math.round(p.x / SNAP) * SNAP;
    p.y = Math.round(p.y / SNAP) * SNAP;
    p.applyMatrix4(lightSpace);
    const moved = p.distanceToSquared(sun.target.position) > 1e-4;
    let trainNear = false;
    if (sim) {
      for (const t of sim.trains) {
        if (t.speed > 0.05 && Math.abs(t.x - p.x) < ext + t.length + 10) { trainNear = true; break; }
      }
    }
    framesSince++;
    state.needsShadow = moved || trainNear || framesSince >= 3;
    if (state.needsShadow) {
      framesSince = 0;
      sun.target.position.copy(p);
      sun.position.copy(p).addScaledVector(SUN.dir, 200);
    }
    sun.color.copy(SUN.color);
    sun.intensity = SUN.intensity;
  }

  return { group, sun, hemi, update, focus, state, forceShadow() { framesSince = 1e9; } };
}
