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
  const size = quality === 'low' ? 2048 : 4096;
  sun.shadow.mapSize.set(size, size);
  const ext = 85;
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
  const texel = (ext * 2) / size;
  const lightSpace = new THREE.Matrix4();
  const lightSpaceInv = new THREE.Matrix4();

  /** Re-centre the shadow frustum ahead of the camera, snapped to shadow texels. */
  function update(camera) {
    camera.getWorldDirection(tmp);
    tmp.y = 0;
    if (tmp.lengthSq() < 1e-4) tmp.set(0, 0, -1);
    tmp.normalize();
    focus.copy(camera.position).addScaledVector(tmp, ext * 0.55);
    focus.y = 0;
    // snap in light space
    lightSpace.lookAt(new THREE.Vector3(0, 0, 0), SUN.dir.clone().negate(), new THREE.Vector3(0, 1, 0));
    lightSpaceInv.copy(lightSpace).invert();
    const p = focus.clone().applyMatrix4(lightSpaceInv);
    p.x = Math.round(p.x / texel) * texel;
    p.y = Math.round(p.y / texel) * texel;
    p.applyMatrix4(lightSpace);
    sun.target.position.copy(p);
    sun.position.copy(p).addScaledVector(SUN.dir, 200);
    sun.color.copy(SUN.color);
    sun.intensity = SUN.intensity;
  }

  return { group, sun, hemi, update, focus };
}
