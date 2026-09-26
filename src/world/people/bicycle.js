/**
 * people/bicycle — a step-through city bike (ママチャリ) with a front wire
 * basket, rear carrier, mudguards, chain guard, bell and dynamo lamp.  Built
 * into the owner's RigMesh on a fixed bone (usually 'root'), so the girl and
 * her bike are one draw call (+ the no-outline detail mesh for the spokes and
 * basket wires).
 *
 * Bike-local frame: forward +Z, ground y = 0, x = 0 is the wheel plane.
 */
import * as THREE from 'three';
import { tube, torus, ellipsoid, rbox, cyl, V3 } from './mesh.js';

const WR = 0.33; // wheel radius (26")

export function bicycle(RM, D, base, bone, o = {}) {
  const frameCol = o.color || '#b9d2c8';
  const chrome = '#d3d7db';
  const dark = '#34363c';
  const T = (p) => p.clone().applyMatrix4(base);
  const addTube = (mesh, pts, r, color, radial = 6) => mesh.add(tube(pts.map(T), r, radial), { bone, color });
  const addG = (mesh, g, m, color, extra = {}) => mesh.add(g, { m: base.clone().multiply(m), bone, color, ...extra });
  const mt = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V3(1, 1, 1));

  const Rh = V3(0, WR, -0.56), Fh = V3(0, WR, 0.56);
  const BB = V3(0, 0.28, -0.08);
  const ST = V3(0, 0.74, -0.3);
  const HB = V3(0, 0.6, 0.41), HT = V3(0, 0.8, 0.37);

  // ---- wheels -------------------------------------------------------------
  for (const hub of [Rh, Fh]) {
    addG(RM, torus(WR - 0.019, 0.021, 6, 36), mt(hub.x, hub.y, hub.z, 0, Math.PI / 2), dark);
    addG(RM, torus(WR - 0.045, 0.008, 4, 36), mt(hub.x, hub.y, hub.z, 0, Math.PI / 2), chrome);
    addG(RM, cyl(0.025, 0.025, 0.1, 10).translate(0, -0.05, 0), mt(hub.x, hub.y, hub.z, 0, 0, Math.PI / 2), chrome);
    // spokes (detail mesh: thin, no outline)
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      const side = k % 2 ? 0.035 : -0.035;
      addTube(D, [V3(side, hub.y + Math.cos(a) * 0.03, hub.z + Math.sin(a) * 0.03), V3(0, hub.y + Math.cos(a + 0.3) * (WR - 0.05), hub.z + Math.sin(a + 0.3) * (WR - 0.05))], 0.0018, 3, '#c0c4c8');
    }
  }
  // mudguards (flattened torus arcs)
  const guard = (hub, a0, arc) => {
    const g = torus(WR + 0.035, 0.016, 4, 18, arc);
    g.rotateZ(a0);
    g.scale(1, 1, 2.4); // flatten across the wheel after rotating into the YZ plane below
    addG(RM, g, mt(hub.x, hub.y, hub.z, 0, Math.PI / 2), chrome);
  };
  guard(Fh, Math.PI * 0.25, Math.PI * 0.8);
  guard(Rh, -Math.PI * 0.12, Math.PI * 0.72);

  // ---- frame --------------------------------------------------------------
  addTube(RM, [BB, V3(0, 0.3, 0.1), V3(0, 0.42, 0.28), HB], 0.022, 8, frameCol); // low step-through tube
  addTube(RM, [V3(0, 0.33, -0.02), V3(0, 0.5, 0.2), V3(0, 0.66, 0.36)], 0.014, 6, frameCol); // second mixte tube
  addTube(RM, [BB, ST], 0.02, 8, frameCol);
  addTube(RM, [HB, HT], 0.024, 8, frameCol);
  for (const sx of [-0.04, 0.04]) {
    addTube(RM, [BB.clone().setX(sx * 0.6), Rh.clone().setX(sx)], 0.01, 5, frameCol); // chain stays
    addTube(RM, [V3(sx * 0.4, 0.68, -0.29), Rh.clone().setX(sx)], 0.01, 5, frameCol); // seat stays
    addTube(RM, [HB.clone().setX(sx * 0.5), V3(sx, 0.47, 0.5), Fh.clone().setX(sx)], 0.011, 5, frameCol); // fork
  }
  // stem + swept-back handlebar + grips + bell
  const stemTop = V3(0, 0.92, 0.35);
  addTube(RM, [HT, stemTop], 0.014, 6, chrome);
  const barL = [V3(0.26, 0.97, 0.16), V3(0.2, 0.95, 0.27), V3(0.1, 0.93, 0.35), V3(0, 0.925, 0.36)];
  const barR = barL.map((p) => p.clone().setX(-p.x)).reverse();
  addTube(RM, [...barL, ...barR.slice(1)], 0.011, 6, chrome);
  for (const sx of [-1, 1]) {
    const a = V3(sx * 0.26, 0.97, 0.16), b = V3(sx * 0.29, 0.975, 0.06);
    addTube(RM, [a, b], 0.017, 7, '#5a4a40');
    // brake lever
    addTube(RM, [V3(sx * 0.2, 0.955, 0.25), V3(sx * 0.27, 0.95, 0.2)], 0.005, 4, chrome);
  }
  addG(RM, ellipsoid(0.024, 0.016, 0.024, 10, 6), mt(0.17, 0.955, 0.31), '#e9ecef');
  // saddle (sprung) + post
  addTube(RM, [ST, V3(0, 0.86, -0.34)], 0.013, 6, chrome);
  addG(RM, ellipsoid(0.1, 0.045, 0.14, 12, 8, (p) => { if (p.z > 0) p.x *= 1 - p.z * 3.5; if (p.y < 0) p.y *= 0.4; }), mt(0, 0.905, -0.36, 0.05), '#6b4a3a');
  for (const sx of [-0.05, 0.05]) addG(RM, cyl(0.012, 0.012, 0.04, 6), mt(sx, 0.86, -0.42), chrome);
  // rear carrier
  const cz0 = -0.34, cz1 = -0.86, cy = 0.73;
  for (const sx of [-0.07, 0.07]) {
    addTube(RM, [V3(sx, cy, cz0), V3(sx, cy, cz1)], 0.007, 4, chrome);
    addTube(RM, [V3(sx, cy, cz1 + 0.05), Rh.clone().setX(sx * 0.7)], 0.006, 4, chrome);
  }
  for (let z = cz0; z >= cz1 - 1e-6; z -= 0.13) addTube(RM, [V3(-0.07, cy, z), V3(0.07, cy, z)], 0.005, 4, chrome);
  addG(RM, rbox(0.05, 0.02, 0.01, 0.004), mt(0, 0.6, -0.97, 0.4), '#d8484a'); // rear reflector
  // chain guard + cranks + pedals
  addG(RM, rbox(0.012, 0.11, 0.52, 0.02), mt(-0.065, 0.3, -0.33, 0.03), frameCol);
  addG(RM, cyl(0.085, 0.085, 0.012, 16), mt(-0.058, 0.28, -0.08, 0, 0, Math.PI / 2), '#8e949a');
  for (const sx of [-1, 1]) {
    const pz = sx > 0 ? 0.08 : -0.24;
    const py = sx > 0 ? 0.2 : 0.36;
    addTube(RM, [V3(sx * 0.07, 0.28, -0.08), V3(sx * 0.08, py, pz)], 0.009, 4, chrome);
    addG(RM, rbox(0.09, 0.02, 0.05, 0.006), mt(sx * 0.13, py, pz), dark);
  }
  // kickstand (folded up along the chain stay)
  addTube(RM, [V3(0.05, 0.3, -0.35), V3(0.06, 0.26, -0.72)], 0.008, 4, chrome);
  // dynamo lamp on the fork crown
  addG(RM, cyl(0.03, 0.034, 0.07, 10).rotateX(Math.PI / 2).translate(0, 0, 0.0), mt(0, 0.62, 0.49), '#e9ecef');
  addG(RM, new THREE.CircleGeometry(0.026, 12), mt(0, 0.62, 0.566), '#fff3cf');

  // ---- front wire basket ----------------------------------------------------
  const bc = V3(0, 0.83, 0.62);
  const bw = 0.36, bh = 0.26, bd = 0.28;
  const x0 = -bw / 2, x1 = bw / 2, z0 = bc.z - bd / 2, z1 = bc.z + bd / 2, y0 = bc.y - bh / 2, y1 = bc.y + bh / 2;
  const rim = (y, r) => addTube(RM, [V3(x0, y, z0), V3(x1, y, z0), V3(x1, y, z1), V3(x0, y, z1), V3(x0, y, z0)], r, 4, chrome);
  rim(y1, 0.007);
  rim(y0 + 0.01, 0.005);
  for (let x = x0; x <= x1 + 1e-6; x += 0.036) {
    addTube(D, [V3(x, y0, z0), V3(x, y1, z0)], 0.0022, 3, '#c9ccd0');
    addTube(D, [V3(x, y0, z1), V3(x, y1, z1)], 0.0022, 3, '#c9ccd0');
  }
  for (let z = z0; z <= z1 + 1e-6; z += 0.036) {
    addTube(D, [V3(x0, y0, z), V3(x0, y1, z)], 0.0022, 3, '#c9ccd0');
    addTube(D, [V3(x1, y0, z), V3(x1, y1, z)], 0.0022, 3, '#c9ccd0');
  }
  for (let y = y0 + 0.06; y < y1; y += 0.06) addTube(D, [V3(x0, y, z0), V3(x1, y, z0), V3(x1, y, z1), V3(x0, y, z1), V3(x0, y, z0)], 0.0022, 3, '#c9ccd0');
  addG(RM, rbox(bw, 0.008, bd, 0.003), mt(bc.x, y0, bc.z), '#9aa1a8');
  addTube(RM, [V3(0, y0, z0), V3(0, 0.62, 0.45)], 0.008, 4, chrome); // basket stay
  // school bag lying in the basket
  if (o.bagColor) {
    addG(RM, rbox(0.33, 0.1, 0.24, 0.02), mt(0, y0 + 0.06, bc.z, 0, 0, 0.06), o.bagColor);
    addG(RM, rbox(0.335, 0.05, 0.13, 0.018), mt(0, y0 + 0.1, bc.z + 0.06, 0, 0, 0.06), new THREE.Color(o.bagColor).multiplyScalar(1.12));
  }
  return { grips: [T(V3(0.28, 0.975, 0.11)), T(V3(-0.28, 0.975, 0.11))], saddle: T(V3(0, 0.93, -0.36)) };
}
