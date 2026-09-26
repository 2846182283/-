/** Dev-only lighting / toon calibration objects (?extra=_calib). */
import * as THREE from 'three';

export default function build(ctx) {
  const { toon, geom, palette: P } = ctx;
  const g = new THREE.Group();
  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), toon.mat(P.paving));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6, 200), toon.mat(P.asphalt));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 60); road.receiveShadow = true;
  g.add(road);
  const cols = [P.plasterWhite, P.plasterCream, P.sidingBlue, P.sakura, P.woodLight, P.konbiniGreen, P.vendRed, P.trainCream];
  cols.forEach((c, i) => {
    const b = geom.addBox(g, 4, 5 + (i % 3), 4, toon.mat(c), -12 + (i % 2) * 24 + (i % 2 ? -1 : 1) * 0, 0, 55 - i * 9, { bottom: true });
    b.castShadow = b.receiveShadow = true;
    const r = new THREE.Mesh(geom.gableRoof(4, 4, 1.6, 0.45), toon.mat(P.roofBlueGrey));
    r.position.set(b.position.x, b.geometry.parameters?.height ?? 0, b.position.z);
    r.position.y = 5 + (i % 3);
    r.castShadow = true;
    g.add(r);
  });
  const sph = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 3), toon.mat(P.sakura, { rim: 0.6 }));
  sph.position.set(0, 6, 10); sph.castShadow = true; g.add(sph);
  const sph2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 3), toon.metal(P.metalGrey));
  sph2.position.set(4, 1.5, 30); sph2.castShadow = true; g.add(sph2);
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), toon.glass());
  glassPane.position.set(-9.9, 2, 55); glassPane.rotation.y = Math.PI / 2; g.add(glassPane);
  const baked = geom.bakeStatic(g, { name: 'calib' });
  return baked;
}
