/**
 * Roof equipment: centralised air-conditioning units, ventilators, the
 * single-arm pantograph (raised to the contact wire), lightning arrester,
 * insulated HV bus cables with jumpers between cars, walkway boards, radio
 * antenna on the cab cars.
 */
import * as THREE from 'three';
import { RAIL } from '../../core/layout.js';
import { D, roofY } from './dims.js';
import { COL } from './shell.js';
import { extrude } from './parts.js';

const AC = { body: '#d7dade', louver: '#8f969f', base: '#9ba1a8', fan: '#474c54' };
const BUS_Z = 1.1;

/** Centralised AC unit centred at car-local x, length len. */
export function acUnit(P, x, len = 3.6) {
  const base = roofY(1.02) - 0.02;
  const sh = new THREE.Shape();
  sh.moveTo(-1.02, 0); sh.lineTo(1.02, 0); sh.lineTo(1.02, 0.24); sh.lineTo(0.86, 0.36); sh.lineTo(-0.86, 0.36); sh.lineTo(-1.02, 0.24); sh.closePath();
  const g = extrude(sh, len, 1);
  g.rotateY(-Math.PI / 2);
  g.translate(x + len / 2, base, 0);
  P.add('body', g, AC.body);
  // plinth down to the curved roof
  P.box('body', len - 0.1, 0.12, 1.9, x, base - 0.04, 0, AC.base);
  // louvres on the long sides
  for (const s of [1, -1]) {
    for (let k = 0; k < Math.floor((len - 0.3) / 0.12); k++) {
      P.box('bodyNO', 0.045, 0.15, 0.012, x - len / 2 + 0.2 + k * 0.12, base + 0.12, s * 1.026, AC.louver);
    }
    P.box('body', len + 0.02, 0.025, 0.03, x, base + 0.245, s * 1.03, '#c4c8cd');
  }
  // fan grilles on the top
  for (const fx of [-len * 0.26, len * 0.26]) {
    P.cyl('body', 0.32, 0.32, 0.03, x + fx, base + 0.37, 0, '#b9bec4', { seg: 20 });
    P.cyl('bodyNO', 0.27, 0.27, 0.035, x + fx, base + 0.372, 0, AC.fan, { seg: 20 });
    for (const a of [0, Math.PI / 2]) P.box('bodyNO', 0.56, 0.02, 0.025, x + fx, base + 0.392, 0, '#9ba1a8', 0, a, 0);
  }
  // lid seams
  for (const sx of [-0.5, 0, 0.5]) P.box('bodyNO', 0.012, 0.004, 1.7, x + sx * len * 0.9, base + 0.362, 0, '#aeb3b9');
}

/** Small ventilator hood. */
export function vent(P, x, z = 0) {
  const y = roofY(z);
  P.box('body', 0.52, 0.12, 0.38, x, y + 0.05, z, '#cdd1d5');
  P.box('bodyNO', 0.02, 0.05, 0.3, x + 0.265, y + 0.06, z, COL.dark);
}

/** Insulated HV bus along both roof shoulders + jumpers to the neighbour cars. */
export function roofCables(P, { front = true, rear = true, xFrontEnd = D.bodyHalf } = {}) {
  for (const s of [1, -1]) {
    const z = s * BUS_Z;
    const y = roofY(z) + 0.07;
    const x0 = -D.bodyHalf + 0.15, x1 = Math.min(xFrontEnd, D.bodyHalf) - 0.3;
    P.cyl('bodyNO', 0.022, 0.022, x1 - x0, (x0 + x1) / 2, y, z, '#2e3035', { axis: 'x', seg: 6 });
    for (let x = x0 + 0.3; x < x1; x += 1.5) P.cyl('bodyNO', 0.02, 0.028, 0.08, x, y - 0.045, z, '#d9d4c8', { seg: 6 });
    const ends = [];
    if (rear) ends.push(-1);
    if (front) ends.push(1);
    for (const e of ends) {
      const xa = e * (D.bodyHalf - 0.2);
      P.tube('bodyNO', [new THREE.Vector3(xa, y, z), new THREE.Vector3(e * (D.bodyHalf + 0.05), y - 0.1, z * 1.02), new THREE.Vector3(e * D.half, y - 0.16, z * 1.03)], 0.026, '#26282c');
    }
  }
}

/** Single-arm pantograph centred at car-local x0, head raised to the contact wire. */
export function pantograph(P, x0) {
  const wireY = RAIL.catenary.contactWireY;
  const baseY = roofY(0.42);
  const insY = baseY + 0.24;
  const metal = '#8f98a2', dark = '#4d535b', porcelain = '#e7e3d9';
  // insulators (porcelain stacks) + base frame
  for (const ix of [-0.5, 0.5]) for (const iz of [-0.42, 0.42]) {
    P.cyl('body', 0.05, 0.06, 0.24, x0 + ix, baseY + 0.12, iz, porcelain, { seg: 8 });
    for (let k = 0; k < 3; k++) P.cyl('body', 0.095, 0.095, 0.022, x0 + ix, baseY + 0.06 + k * 0.06, iz, porcelain, { seg: 10 });
    P.box('body', 0.18, 0.03, 0.18, x0 + ix, baseY + 0.01, iz, dark);
  }
  for (const iz of [-0.42, 0.42]) P.box('metal', 1.2, 0.06, 0.07, x0, insY + 0.03, iz, metal);
  for (const ix of [-0.5, 0.5]) P.box('metal', 0.07, 0.06, 0.9, x0 + ix, insY + 0.03, 0, metal);
  P.box('metal', 0.34, 0.14, 0.5, x0 - 0.42, insY + 0.12, 0, '#8e959d'); // main spring box
  // arms: lower (stout) from the hinge, upper (slim V) back over the base to the head
  const hinge = [x0 - 0.5, insY + 0.14, 0];
  const knee = [x0 + 0.8, insY + 0.55, 0];
  const head = [x0 - 0.02, wireY - 0.08, 0];
  P.capsule('metal', 0.055, hinge, knee, metal, 8);
  P.rod('metalNO', 0.016, [x0 - 0.62, insY + 0.09, 0.09], [knee[0] - 0.08, knee[1] - 0.02, 0.05], dark, 5); // push rod
  P.sphere('metal', 0.06, knee[0], knee[1], knee[2], dark, 1, 1, 1, 8, 6);
  for (const s of [1, -1]) P.rod('metal', 0.03, [knee[0], knee[1], s * 0.03], [head[0], head[1], s * 0.26], metal, 6);
  P.rod('metalNO', 0.012, [x0 + 0.4, (knee[1] + head[1]) / 2 - 0.04, -0.12], [x0 + 0.4, (knee[1] + head[1]) / 2 - 0.04, 0.12], metal, 4);
  // collector head: cross bar, two contact strips, bent horns
  P.box('metal', 0.06, 0.05, 0.62, head[0], head[1], 0, dark);
  for (const hx of [-0.13, 0.13]) {
    P.box('metal', 0.3, 0.035, 0.05, head[0] + hx / 2, head[1] + 0.03, 0.26, dark);
    P.box('metal', 0.3, 0.035, 0.05, head[0] + hx / 2, head[1] + 0.03, -0.26, dark);
    P.box('metal', 0.055, 0.04, 1.24, head[0] + hx, wireY - 0.02, 0, '#7d848c');
    P.box('metalNO', 0.03, 0.012, 1.18, head[0] + hx, wireY - 0.002, 0, '#2f3136'); // carbon strip
  }
  for (const s of [1, -1]) {
    const pts = [[0.6, wireY - 0.02], [0.76, wireY - 0.05], [0.88, wireY - 0.13], [0.95, wireY - 0.25]].map(([z, y]) => new THREE.Vector3(head[0], y, s * z));
    for (const hx of [-0.13, 0.13]) P.tube('metal', pts.map((p) => p.clone().setX(head[0] + hx)), 0.024, metal, 5);
    P.rod('metalNO', 0.014, [head[0] - 0.13, wireY - 0.2, s * 0.93], [head[0] + 0.13, wireY - 0.2, s * 0.93], metal, 4);
  }
  // lightning arrester + HV lead to the roof bus
  P.cyl('body', 0.06, 0.07, 0.28, x0 - 1.5, roofY(0.5) + 0.14, -0.5, '#9aa0a8', { seg: 8 });
  P.cyl('body', 0.09, 0.09, 0.02, x0 - 1.5, roofY(0.5) + 0.3, -0.5, porcelain, { seg: 8 });
  P.tube('bodyNO', [new THREE.Vector3(x0 - 0.2, insY + 0.02, -0.42), new THREE.Vector3(x0 - 0.9, baseY + 0.12, -0.7), new THREE.Vector3(x0 - 1.5, roofY(BUS_Z) + 0.08, -BUS_Z)], 0.025, '#2a2c31');
  P.tube('bodyNO', [new THREE.Vector3(x0 - 1.5, roofY(0.5) + 0.3, -0.5), new THREE.Vector3(x0 - 1.2, baseY + 0.2, -0.6)], 0.012, '#2a2c31');
  // walkway boards (non-slip) around the pantograph
  for (const s of [1, -1]) P.box('body', 2.8, 0.025, 0.3, x0 - 0.2, roofY(0.78) + 0.012, s * 0.78, '#6f757e', s * -0.12, 0, 0);
}

/** Radio antenna + small GPS dome (cab cars). */
export function antenna(P, x) {
  const y = roofY(0.35);
  P.box('body', 0.3, 0.06, 0.2, x, y + 0.02, 0.35, COL.dark);
  P.box('body', 0.03, 0.28, 0.46, x, y + 0.18, 0.35, '#4b5058');
  P.sphere('body', 0.08, x - 0.8, roofY(0.0) + 0.02, -0.3, '#e9e9e6', 1, 0.6, 1, 10, 6);
}
