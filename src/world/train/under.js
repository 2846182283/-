/**
 * Running gear & under-floor equipment: bolsterless bogies (fish-belly side
 * frames, axle boxes with wing coil springs, air springs, tread brake units,
 * yaw dampers, traction motors on the motor car), the rotating wheelset
 * geometry (instanced separately), and the under-floor boxes / tanks.
 */
import * as THREE from 'three';
import { D } from './dims.js';
import { COL } from './shell.js';
import { helix, extrude } from './parts.js';

const C = {
  frame: '#3c4049',
  box: '#474c55',
  spring: '#5f6670',
  air: '#24262b',
  brake: '#555b64',
  motor: '#3a3e46',
  damper: '#8c939c',
};

/** Wheelset (axle + two wheels) geometry, vertex coloured, axle along Z, centred at the origin. */
export function wheelsetGeometry(Parts) {
  const P = new Parts();
  const r = D.wheelR;
  // wheel profile revolved about Y: hub, web, rim, tread, flange (inner side = -y in lathe space)
  const prof = [
    [0.0, -0.07], [0.14, -0.06], [0.36, -0.04], [r - 0.02, -0.065], [r + 0.035, -0.065], [r + 0.035, -0.045],
    [r, -0.03], [r - 0.004, 0.065], [r - 0.03, 0.065], [0.3, 0.03], [0.14, 0.06], [0.0, 0.07],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  for (const s of [1, -1]) {
    const g = new THREE.LatheGeometry(prof, 16);
    // colour: bright tread / flange, dark web
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const bright = new THREE.Color('#c3c7cc'), dark = new THREE.Color('#4a4f57');
    for (let i = 0; i < pos.count; i++) {
      const rr = Math.hypot(pos.getX(i), pos.getZ(i));
      const c = rr > r - 0.025 ? bright : dark;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.rotateX(s > 0 ? Math.PI / 2 : -Math.PI / 2); // lathe Y -> +-Z so the flange faces inward
    g.translate(0, 0, s * D.wheelZ);
    P.add('metal', g);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // hub bolts (show the rotation)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      P.box('metal', 0.035, 0.035, 0.03, Math.cos(a) * 0.19, Math.sin(a) * 0.19, s * (D.wheelZ + 0.035), '#8d939b');
    }
    P.box('metal', 0.07, 0.3, 0.02, 0, 0, s * (D.wheelZ + 0.032), '#6a7079');
  }
  P.cyl('metal', 0.085, 0.085, 2 * (D.wheelZ + 0.34), 0, 0, 0, '#5d636c', { axis: 'z', seg: 10 });
  return P.merged('metal');
}

/** Static bogie parts around bogie centre xb (car-local). motor: add traction motors; lead: add a guard. */
export function bogie(P, xb, { motor = false, lead = false } = {}) {
  const yA = D.wheelY;
  // side frames: fish-belly profile extruded across z
  const sf = new THREE.Shape();
  sf.moveTo(-1.5, 1.07); sf.lineTo(-0.8, 1.07); sf.lineTo(-0.5, 0.72); sf.lineTo(0.5, 0.72); sf.lineTo(0.8, 1.07); sf.lineTo(1.5, 1.07);
  sf.lineTo(1.5, 1.23); sf.lineTo(0.72, 1.23); sf.lineTo(0.45, 1.06); sf.lineTo(-0.45, 1.06); sf.lineTo(-0.72, 1.23); sf.lineTo(-1.5, 1.23); sf.closePath();
  for (const s of [1, -1]) {
    const g = extrude(sf, 0.15, 1);
    g.translate(xb, 0, s * 1.0 - 0.075);
    P.add('body', g, C.frame);
    // axle boxes with wing springs + lids
    for (const ax of [-1, 1]) {
      const x = xb + ax * D.axleHalf;
      P.box('body', 0.3, 0.3, 0.22, x, yA, s * 1.0, C.box);
      P.cyl('body', 0.1, 0.1, 0.05, x, yA, s * 1.13, '#5a6069', { axis: 'z', seg: 10 });
      P.box('body', 0.74, 0.05, 0.2, x, yA - 0.1, s * 1.0, C.box); // wings
      for (const w of [-1, 1]) {
        const pts = helix(0.085, 0.3, 3.5, 6);
        const tg = P.tube('metal', pts, 0.018, C.spring, 3);
        tg.translate(x + w * 0.28, yA - 0.075, s * 1.0);
      }
    }
    // air spring (rubber bellows) on the frame centre, under the body
    const as = new THREE.LatheGeometry([[0.0, 0], [0.2, 0], [0.26, 0.05], [0.27, 0.1], [0.24, 0.16], [0.18, 0.2], [0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    as.translate(xb, 1.06, s * 1.0);
    P.add('body', as, C.air);
    // yaw damper (outside, shiny) & lateral stop
    P.cyl('metal', 0.045, 0.045, 0.62, xb + 0.35, 1.13, s * 1.16, C.damper, { axis: 'x', seg: 8 });
    P.box('body', 0.1, 0.12, 0.08, xb + 0.72, 1.13, s * 1.16, C.box);
    // tread brake units on each wheel (inboard, towards the bogie centre)
    for (const ax of [-1, 1]) {
      const x = xb + ax * D.axleHalf;
      P.box('body', 0.08, 0.3, 0.12, x - ax * 0.48, yA, s * D.wheelZ, '#2f3238'); // brake shoe
      P.box('body', 0.24, 0.2, 0.2, x - ax * 0.62, yA + 0.03, s * D.wheelZ, C.brake);
      P.cyl('body', 0.08, 0.08, 0.16, x - ax * 0.62, yA + 0.03, s * (D.wheelZ + 0.17), '#6c737c', { axis: 'z', seg: 10 });
    }
  }
  // transom (cross beam) and centre pivot
  P.box('body', 0.4, 0.26, 1.85, xb, 0.86, 0, C.frame);
  P.box('body', 0.22, 0.22, 0.22, xb, 1.12, 0, C.box);
  if (motor) {
    for (const ax of [-1, 1]) {
      const x = xb + ax * D.axleHalf;
      P.cyl('body', 0.23, 0.23, 0.56, x - ax * 0.47, yA + 0.02, -0.08, C.motor, { axis: 'z', seg: 12 });
      P.box('body', 0.3, 0.34, 0.16, x - ax * 0.15, yA, 0.34, '#4f555e'); // gearbox
    }
  }
  if (lead) {
    // life guard in front of the leading wheels + ATS pickup
    for (const s of [1, -1]) P.box('body', 0.06, 0.34, 0.2, xb + D.axleHalf + 0.5, 0.72, s * D.wheelZ, '#6b717a');
    P.box('body', 0.34, 0.08, 0.3, xb + D.axleHalf + 0.62, 0.62, 0.35, '#f2c230');
  }
}

/** Under-floor equipment between the bogies. */
export function underfloor(P, kind, rng) {
  const top = D.bodyBottom - 0.06;
  const defs = kind === 'mid'
    ? [
      { x0: -4.3, x1: -2.0, h: 0.55, z0: -1.18, z1: 0.3, col: '#6a717b', fins: true }, // VVVF inverter
      { x0: -1.6, x1: -0.6, h: 0.45, z0: 0.35, z1: 1.18, col: '#80868e' }, // filter reactor
      { x0: 0.0, x1: 1.6, h: 0.5, z0: -1.15, z1: -0.1, col: '#5c626b' }, // high-speed breaker
      { x0: 2.0, x1: 4.2, h: 0.42, z0: 0.1, z1: 1.18, col: '#8d939a' }, // resistor / blower
      { x0: 2.3, x1: 3.6, h: 0.35, z0: -1.1, z1: -0.3, col: '#6f757d' },
    ]
    : [
      { x0: -4.2, x1: -2.8, h: 0.5, z0: 0.2, z1: 1.16, col: '#6d737c' }, // compressor
      { x0: -2.4, x1: -0.2, h: 0.45, z0: -1.16, z1: -0.1, col: '#7f858d', fins: true }, // SIV
      { x0: 0.4, x1: 1.6, h: 0.4, z0: 0.3, z1: 1.16, col: '#5f656e' }, // battery box
      { x0: 2.2, x1: 3.9, h: 0.38, z0: -1.1, z1: -0.2, col: '#8a9097' },
    ];
  for (const d of defs) {
    P.span('body', d.x0, d.x1, top - d.h, top, d.z0, d.z1, d.col);
    // lids / handles on the outer face
    const zf = d.z1 > 0.9 ? d.z1 : d.z0 < -0.9 ? d.z0 : null;
    if (zf !== null && !d.fins) {
      const s = Math.sign(zf);
      const n = Math.max(1, Math.round((d.x1 - d.x0) / 0.7));
      for (let k = 0; k < n; k++) {
        const x = d.x0 + ((k + 0.5) * (d.x1 - d.x0)) / n;
        P.box('bodyNO', (d.x1 - d.x0) / n - 0.06, d.h - 0.1, 0.012, x, top - d.h / 2, zf + s * 0.006, new THREE.Color(d.col).offsetHSL(0, 0, 0.05).getStyle());
        P.box('metalNO', 0.12, 0.025, 0.03, x, top - d.h * 0.3, zf + s * 0.02, '#b8bdc4');
      }
    }
    if (d.fins) for (let x = d.x0 + 0.1; x < d.x1 - 0.05; x += 0.12) P.box('bodyNO', 0.03, d.h * 0.7, 0.05, x, top - d.h / 2, d.z0 - 0.02, '#4d535c');
  }
  // air tanks (cylinders along x) and piping
  for (const [x, z, len] of [[-3.3, -0.75, 1.6], [3.0, 0.72, 1.4]]) {
    P.cyl('body', 0.17, 0.17, len, x, top - 0.24, z, '#a0a6ad', { axis: 'x', seg: 12 });
    P.sphere('body', 0.17, x - len / 2, top - 0.24, z, '#a0a6ad', 0.35, 1, 1, 10, 6);
    P.sphere('body', 0.17, x + len / 2, top - 0.24, z, '#a0a6ad', 0.35, 1, 1, 10, 6);
  }
  for (const z of [-0.3, 0.05]) P.cyl('metalNO', 0.02, 0.02, 9.2, 0, top - 0.04, z, '#9ea4ab', { axis: 'x', seg: 5 });
  // cable ducts along both sides
  for (const s of [1, -1]) P.box('body', 12.0, 0.08, 0.1, 0, top - 0.05, s * 1.2, COL.dark);
  void rng;
}
