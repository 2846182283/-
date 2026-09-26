/**
 * props/shrine.js — small sacred corners and roadside odds and ends:
 *
 *   hokora (SPOTS.shrine)  tiny wooden inari shrine on a two-tier stone base,
 *                          copper-green gable roof with chigi / katsuogi, lattice
 *                          doors, shimenawa with shide, offerings (sake cups,
 *                          sakaki vases, fried-tofu dish), mini red torii,
 *                          two kitsune on pedestals with red bibs, red のぼり,
 *                          stone lantern, ema rack with plaques, stepping stones
 *   jizo (SPOTS.jizo)      round stone jizo with red bib + cap, offering cup,
 *                          flowers in two small vases, on a slab over the gutter
 *   roadworks              traffic cones + bar around an open gutter section,
 *                          a 工事中 A-frame sign
 */
import * as THREE from 'three';
import { SPOTS, MAIN_STREET } from '../../core/layout.js';
import { surfaceY } from './common.js';
import { nobori } from './vending.js';
import { shrub } from './plaza.js';

const RED = '#d9483a';
const STONE = '#c9c6be';

/** Sitting fox (kitsune) statue on its local origin, facing +Z. */
function kitsune(kit, mirror) {
  const white = '#ecebe6';
  kit.sphere(0.13, 0, 0.16, -0.02, 'vc', white, { sx: 0.8, sy: 1.25, sz: 1, ws: 12, hs: 8 });
  kit.sphere(0.08, 0, 0.1, 0.07, 'vc', white, { sx: 1.1, sy: 0.7, sz: 0.9, ws: 10, hs: 6 }); // haunches
  for (const sx of [-1, 1]) kit.cyl(0.022, 0.026, 0.2, sx * 0.05, 0.0, 0.1, 'vc', white, { seg: 8, rx: -0.12 }); // forelegs
  // head + snout + ears
  kit.sphere(0.075, 0, 0.36, 0.03, 'vc', white, { ws: 12, hs: 8 });
  kit.cyl(0.012, 0.045, 0.1, 0, 0.35, 0.08, 'vc', white, { rx: Math.PI / 2, seg: 8 });
  for (const sx of [-1, 1]) kit.cyl(0.002, 0.03, 0.08, sx * 0.04, 0.41, 0.02, 'vc', white, { rz: -sx * 0.25, seg: 6 });
  kit.sphere(0.012, 0, 0.35, 0.18, 'vc', '#3a3a3a', { ws: 6, hs: 4, no: true });
  for (const sx of [-1, 1]) kit.box(0.025, 0.006, 0.004, sx * 0.032, 0.385, 0.098, 'vc', RED, { rz: sx * 0.35, no: true, cast: false });
  // tail curling up behind
  kit.curveTube([[0.0, 0.08, -0.12], [mirror * 0.06, 0.14, -0.2], [mirror * 0.07, 0.32, -0.18], [mirror * 0.03, 0.44, -0.12]], 0.035, 10, 'vc', white, { seg: 7 });
  // red bib (yodarekake): a flattened half-disc hanging on the chest
  kit.cyl(0.1, 0.1, 0.012, 0, 0.27, 0.08, 'vc', RED, { rx: Math.PI / 2 - 0.35, center: true, seg: 14, t0: Math.PI / 2, tl: Math.PI });
  // key in the mouth for one, jewel for the other
  if (mirror > 0) kit.box(0.08, 0.012, 0.012, 0, 0.33, 0.14, 'vc', '#c9a36a', { no: true, cast: false });
  else kit.sphere(0.022, 0, 0.33, 0.15, 'vc', '#c9a36a', { ws: 6, hs: 4, no: true });
}

/** Mini torii of pillar height h, span w (between pillar centres), local origin at ground centre. */
function torii(kit, w, h) {
  for (const sx of [-1, 1]) {
    kit.cyl(0.045, 0.05, h, sx * w / 2, 0, 0, 'vc', RED, { seg: 10 });
    kit.cyl(0.06, 0.06, 0.08, sx * w / 2, 0, 0, 'vc', '#2a2a2a', { seg: 10 }); // black foot
  }
  kit.box(w + 0.18, 0.06, 0.08, 0, h - 0.18, 0, 'vc', RED); // nuki
  kit.box(w + 0.36, 0.07, 0.11, 0, h + 0.005, 0, 'vc', RED); // shimaki
  // kasagi with upturned ends (three pieces)
  kit.box(w + 0.18, 0.06, 0.13, 0, h + 0.07, 0, 'vc', '#2a2a2a');
  for (const sx of [-1, 1]) kit.box(0.14, 0.06, 0.13, sx * (w / 2 + 0.15), h + 0.09, 0, 'vc', '#2a2a2a', { rz: sx * 0.28 });
  kit.box(0.06, 0.13, 0.05, 0, h - 0.08, 0, 'vc', RED); // gakuzuka
}

function hokora(kit, rng) {
  const sp = SPOTS.shrine;
  const s = surfaceY(sp.x, sp.z, sp.y);
  kit.push(kit.mtx(sp.x, sp.y + s, sp.z, 0, sp.rotY));
  const stone = kit.S('stone');
  // gravel pad edged with low kerb stones + stepping stones leading to the torii
  kit.box(3.5, 0.025, 3.2, 0, 0, 0.3, 'vc', '#bdb7aa', { bottom: true, cast: false });
  for (let i = 0; i < 40; i++) kit.box(0.05 + rng() * 0.05, 0.012, 0.05 + rng() * 0.05, (rng() - 0.5) * 3.3, 0.025, 0.3 + (rng() - 0.5) * 3.0, 'vc', rng() < 0.5 ? '#a9a397' : '#d2ccc0', { ry: rng() * 3, no: true, cast: false });
  for (const [w, d, x, z] of [[3.6, 0.1, 0, 1.9], [0.1, 3.2, -1.78, 0.3], [0.1, 3.2, 1.78, 0.3]]) kit.box(w, 0.08, d, x, 0, z, 'texS', '#e8e6e0', { bottom: true, region: stone });
  for (let i = 0; i < 4; i++) kit.cyl(0.19 + rng() * 0.04, 0.21, 0.05, (rng() - 0.5) * 0.08, 0.0, 1.75 - i * 0.4, 'texS', '#ffffff', { seg: 9, region: stone, cast: false });
  // low bamboo fence (四つ目垣) along the back and sides, shrubs + a sakaki tree behind the shrine
  const bamboo = '#b8a868';
  const fenceRun = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      kit.cyl(0.018, 0.02, i % 3 === 0 ? 0.95 : 0.82, x, 0, z, 'vc', i % 3 === 0 ? '#8a7a4a' : bamboo, { seg: 6 });
    }
    for (const y of [0.3, 0.55, 0.78]) {
      kit.beam([a[0], y, a[1]], [b[0], y, b[1]], 0.014, 'vc', bamboo, { seg: 5 });
      kit.beam([a[0], y + 0.005, a[1]], [b[0], y + 0.005, b[1]], 0.02, 'vc', '#6a5a3a', { seg: 4, no: true, cast: false, rb: 0.02 });
    }
  };
  fenceRun([-1.75, -1.62], [1.75, -1.62]);
  fenceRun([-1.75, -1.62], [-1.75, 0.2]);
  fenceRun([1.75, -1.62], [1.75, 0.0]);
  shrub(kit, -1.2, 0, -1.98, 0.42, rng, null);
  shrub(kit, 0.25, 0, -2.1, 0.5, rng, '#f7a9bf');
  shrub(kit, 1.35, 0, -1.95, 0.38, rng, null);
  kit.cyl(0.07, 0.09, 1.3, -0.55, 0, -2.1, 'vc', '#6a5040', { seg: 7 });
  for (let i = 0; i < 5; i++) kit.add(new THREE.IcosahedronGeometry(0.42 - i * 0.03, 1), 'vc', i % 2 ? '#4f7a4a' : '#5f8a52', { m: kit.mtx(-0.55 + (rng() - 0.5) * 0.5, 1.35 + i * 0.22, -2.1 + (rng() - 0.5) * 0.3, 0, rng() * 3, 0, 1, 0.8, 1) });
  // the shrine proper is built at 1.25x (reads better next to the torii and foxes)
  kit.push(kit.mtx(0, 0, -0.15, 0, 0, 0, 1.25));
  // two-tier stone base
  kit.box(1.3, 0.28, 1.0, 0, 0, -0.55, 'texS', '#ffffff', { bottom: true, region: stone });
  kit.box(1.0, 0.24, 0.78, 0, 0.28, -0.58, 'texS', '#f0eee8', { bottom: true, region: stone });
  const b = 0.52; // shrine floor
  // wooden body
  const wood = kit.S('wood');
  kit.box(0.78, 0.05, 0.62, 0, b, -0.6, 'texS', '#8a6446', { bottom: true, region: wood });
  kit.box(0.6, 0.58, 0.46, 0, b + 0.05, -0.64, 'texS', '#a57a52', { bottom: true, region: wood });
  for (const sx of [-1, 1]) kit.box(0.05, 0.62, 0.05, sx * 0.31, b + 0.05, -0.41, 'texS', '#7a5a3e', { bottom: true, region: wood });
  // lattice doors
  kit.box(0.52, 0.48, 0.02, 0, b + 0.3, -0.4, 'vc', '#3a2a20', { no: true });
  for (let i = 0; i < 6; i++) kit.box(0.012, 0.46, 0.015, -0.22 + i * 0.088, b + 0.3, -0.385, 'texS', '#c29a6a', { region: wood, no: true, cast: false });
  for (let i = 0; i < 4; i++) kit.box(0.5, 0.012, 0.015, 0, b + 0.1 + i * 0.13, -0.385, 'texS', '#c29a6a', { region: wood, no: true, cast: false });
  // porch step + railing
  kit.box(0.7, 0.04, 0.16, 0, b + 0.05, -0.3, 'texS', '#8a6446', { bottom: true, region: wood });
  // roof (copper green), ridge, chigi and katsuogi
  const rw = 0.95, rd = 0.5, rise = 0.24, ry0 = b + 0.66;
  const ang = Math.atan2(rise, rd / 2 + 0.12);
  for (const sz of [-1, 1]) kit.box(rw, 0.035, Math.hypot(rd / 2 + 0.2, rise) + 0.02, 0, ry0 + rise / 2, -0.62 + sz * (rd / 4 + 0.08), 'vc', '#6fa08a', { rx: sz * ang });
  kit.box(rw + 0.04, 0.05, 0.08, 0, ry0 + rise + 0.02, -0.62, 'vc', '#5a8a74');
  for (const sx of [-1, 1]) {
    kit.box(0.025, 0.2, 0.03, sx * (rw / 2 - 0.02), ry0 + rise + 0.08, -0.62, 'vc', '#5a8a74', { rz: sx * 0.4 }); // chigi
  }
  for (const x of [-0.2, 0, 0.2]) kit.cyl(0.02, 0.02, 0.18, x, ry0 + rise + 0.07, -0.71, 'vc', '#c9a36a', { rx: Math.PI / 2, seg: 6, no: true });
  // gable plaque
  kit.plane(0.08, 0.2, 0, b + 0.72, -0.395, 'texS', '#ffffff', { region: kit.S('shrinePlaque') });
  // shimenawa rope + zigzag shide paper
  kit.curveTube([[-0.34, b + 0.62, -0.37], [0, b + 0.56, -0.35], [0.34, b + 0.62, -0.37]], 0.018, 10, 'vc', '#d9c89a', { seg: 6 });
  for (const x of [-0.18, 0.18]) {
    for (let k = 0; k < 3; k++) kit.box(0.03, 0.035, 0.004, x + (k % 2 ? 0.01 : -0.01), b + 0.52 - k * 0.035, -0.345, 'vc2', '#ffffff', { no: true, cast: false });
  }
  // offerings on the upper stone: sake cups, fried tofu, sakaki vases
  const oy = 0.52;
  kit.cyl(0.03, 0.02, 0.025, -0.12, oy, -0.24, 'vc', '#ffffff', { seg: 10, no: true });
  kit.cyl(0.03, 0.02, 0.025, 0.12, oy, -0.24, 'vc', '#ffffff', { seg: 10, no: true });
  kit.box(0.12, 0.012, 0.08, 0, oy, -0.24, 'vc', '#ffffff', { no: true });
  kit.box(0.08, 0.025, 0.05, 0, oy + 0.012, -0.24, 'vc', '#d8a860', { no: true });
  for (const sx of [-1, 1]) {
    kit.cyl(0.035, 0.03, 0.12, sx * 0.38, oy, -0.26, 'vc', '#f4f4ee', { seg: 10 });
    for (let k = 0; k < 5; k++) kit.sphere(0.045, sx * 0.38 + (rng() - 0.5) * 0.06, oy + 0.16 + rng() * 0.1, -0.26 + (rng() - 0.5) * 0.06, 'vc', '#4f7a4a', { sx: 0.6, sy: 1.2, sz: 0.4, ry: rng() * 3, ws: 6, hs: 4, no: true });
  }
  kit.pop(); // end of the 1.25x shrine block
  // mini torii + kitsune on pedestals
  kit.push(kit.mtx(0, 0, 0.75)); torii(kit, 0.9, 1.35); kit.pop();
  for (const sx of [-1, 1]) {
    kit.push(kit.mtx(sx * 0.95, 0, 0.15, 0, -sx * 0.25));
    kit.box(0.34, 0.42, 0.34, 0, 0, 0, 'texS', '#ffffff', { bottom: true, region: stone });
    kit.box(0.4, 0.06, 0.4, 0, 0.42, 0, 'texS', '#e8e6e0', { bottom: true, region: stone });
    kit.push(kit.mtx(0, 0.48, 0, 0, 0, 0, 1.25));
    kitsune(kit, sx);
    kit.pop();
    kit.pop();
  }
  // red inari nobori at the back corners
  nobori(kit, -1.4, 0, -0.7, 0.2, 'noboriC', 0.01);
  nobori(kit, 1.45, 0, -0.9, -0.3, 'noboriC', -0.01);
  // small stone lantern (left front)
  kit.push(kit.mtx(-1.45, 0, 0.9));
  kit.box(0.3, 0.1, 0.3, 0, 0, 0, 'texS', '#ffffff', { bottom: true, region: stone });
  kit.cyl(0.06, 0.07, 0.5, 0, 0.1, 0, 'texS', '#ffffff', { seg: 8, region: stone });
  kit.box(0.26, 0.06, 0.26, 0, 0.6, 0, 'texS', '#ffffff', { bottom: true, region: stone });
  kit.box(0.2, 0.18, 0.2, 0, 0.66, 0, 'texS', '#ffffff', { bottom: true, region: stone });
  kit.box(0.1, 0.1, 0.22, 0, 0.7, 0, 'vc', '#3a3430', { bottom: true, no: true });
  kit.cyl(0.02, 0.22, 0.14, 0, 0.84, 0, 'texS', '#ffffff', { seg: 6, region: stone });
  kit.sphere(0.035, 0, 1.0, 0, 'texS', '#ffffff', { ws: 6, hs: 4, region: stone });
  kit.pop();
  // ema rack (right front): posts, two bars, little roof, hanging plaques
  kit.push(kit.mtx(1.45, 0, 0.75, 0, -0.35));
  for (const sx of [-1, 1]) kit.box(0.06, 1.35, 0.06, sx * 0.5, 0, 0, 'texS', '#8a6446', { bottom: true, region: wood });
  for (const y of [0.85, 1.12]) kit.box(1.1, 0.04, 0.04, 0, y, 0, 'texS', '#8a6446', { region: wood });
  for (const sz of [-1, 1]) kit.box(1.3, 0.03, 0.22, 0, 1.44, sz * 0.08, 'vc', '#5f6670', { rx: sz * 0.5 });
  let e = 0;
  for (const y of [0.85, 1.12]) {
    for (let k = 0; k < 7; k++) {
      const x = -0.42 + k * 0.14 + (rng() - 0.5) * 0.02;
      const g = new THREE.PlaneGeometry(0.1, 0.075);
      kit.add(g, 'texS2', '#ffffff', { region: kit.S(`ema${e++ % 4}`), m: kit.mtx(x, y - 0.06, 0.03 + (k % 2) * 0.012, 0.08, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.25), no: true, cast: false });
      kit.beam([x, y - 0.02, 0.03], [x, y, 0.02], 0.002, 'vc', '#e0483a', { seg: 3, no: true, cast: false });
    }
  }
  kit.pop();
  // offertory box (saisen-bako) in front of the base
  kit.box(0.44, 0.26, 0.26, 0, 0.03, 0.12, 'texS', '#8a6446', { bottom: true, region: wood });
  for (let i = 0; i < 5; i++) kit.box(0.4, 0.012, 0.02, 0, 0.3, 0.02 + i * 0.05, 'vc', '#3a2a20', { no: true, cast: false });
  kit.collide(3.7, 3.8, 0, -0.2);
  kit.pop();
}

function jizo(kit, rng) {
  const sp = SPOTS.jizo;
  const s = surfaceY(sp.x, sp.z, sp.y);
  kit.push(kit.mtx(sp.x, sp.y + s, sp.z, 0, sp.rotY));
  const stone = kit.S('stoneDark');
  // slab over the gutter, pedestal
  kit.box(0.7, 0.06, 0.5, 0, 0, -0.08, 'texS', '#ffffff', { bottom: true, region: kit.S('stone') });
  kit.box(0.4, 0.16, 0.34, 0, 0.06, -0.12, 'texS', '#ffffff', { bottom: true, region: stone });
  kit.cyl(0.19, 0.2, 0.06, 0, 0.22, -0.12, 'texS', '#ffffff', { seg: 12, region: stone });
  // body: rounded capsule, head, face
  kit.lathe([[0, 0], [0.13, 0], [0.15, 0.1], [0.15, 0.3], [0.13, 0.4], [0.08, 0.45], [0, 0.46]], 0, 0.28, -0.12, 'texS', '#f4f2ec', { seg: 14, region: stone });
  kit.sphere(0.11, 0, 0.83, -0.12, 'texS', '#f8f6f0', { ws: 12, hs: 8, region: stone });
  for (const sx of [-1, 1]) kit.box(0.035, 0.005, 0.004, sx * 0.04, 0.85, -0.015, 'vc', '#5a5650', { rz: sx * 0.2, no: true, cast: false });
  // hands together + shakujo staff
  kit.sphere(0.035, 0, 0.6, 0.02, 'texS', '#f4f2ec', { ws: 8, hs: 6, region: stone, no: true });
  kit.beam([0.13, 0.3, -0.03], [0.1, 0.95, -0.02], 0.01, 'vc', '#9a9486', { seg: 4, no: true });
  // red bib (maekake) + knitted cap
  kit.cyl(0.17, 0.17, 0.015, 0, 0.62, -0.06, 'vc', RED, { rx: Math.PI / 2 - 0.3, center: true, seg: 16, t0: Math.PI / 2, tl: Math.PI });
  kit.cyl(0.155, 0.155, 0.06, 0, 0.68, -0.12, 'vc', RED, { seg: 14, open: false });
  kit.sphere(0.115, 0, 0.87, -0.12, 'vc', '#e0584a', { ws: 12, hs: 6, thetaLen: Math.PI * 0.45 });
  kit.sphere(0.03, 0, 0.99, -0.12, 'vc', '#f4f2ec', { ws: 6, hs: 4, no: true });
  // offerings: cup of water, two vases with flowers, a coin
  kit.cyl(0.03, 0.022, 0.035, 0, 0.06, 0.1, 'vc', '#ffffff', { seg: 10, no: true });
  for (const sx of [-1, 1]) {
    kit.cyl(0.03, 0.026, 0.12, sx * 0.25, 0.06, 0.02, 'vc', '#8fa6c0', { seg: 10 });
    for (let k = 0; k < 4; k++) {
      const fx = sx * 0.25 + (rng() - 0.5) * 0.08, fz = 0.02 + (rng() - 0.5) * 0.06;
      kit.beam([sx * 0.25, 0.17, 0.02], [fx, 0.3 + rng() * 0.06, fz], 0.004, 'vc', '#6f9a58', { seg: 3, no: true, cast: false });
      kit.sphere(0.025, fx, 0.31 + rng() * 0.05, fz, 'vc', ['#f2c230', '#ffffff', '#d9668d', '#b99ee0'][k], { ws: 6, hs: 4, no: true, cast: false });
    }
  }
  kit.cyl(0.012, 0.012, 0.003, 0.08, 0.28, 0.02, 'metal', '#c9a36a', { seg: 8, no: true, cast: false });
  kit.pop();
}

function roadworks(kit, rng) {
  // east shoulder at z ≈ 60: an open gutter section fenced by cones + a bar
  const z0 = 59.5, z1 = 62.5;
  const pts = [z0, (z0 + z1) / 2, z1].map((z) => {
    const f = MAIN_STREET.atZ(z);
    const x = f.x + f.nx * 3.75, zz = f.z + f.nz * 3.75;
    return { x, z: zz, y: surfaceY(x, zz, 0), f };
  });
  const cone = (x, y, z) => {
    kit.push(kit.mtx(x, y, z, 0, rng() * 6));
    kit.box(0.36, 0.04, 0.36, 0, 0, 0, 'vc', '#e8743a', { bottom: true });
    kit.cyl(0.035, 0.13, 0.66, 0, 0.04, 0, 'vc', '#f08a3a', { seg: 14 });
    kit.cyl(0.07, 0.1, 0.16, 0, 0.26, 0, 'vc', '#f4f4f0', { seg: 14 });
    kit.cyl(0.045, 0.06, 0.1, 0, 0.5, 0, 'vc', '#f4f4f0', { seg: 14 });
    kit.pop();
  };
  for (const p of pts) cone(p.x, p.y, p.z);
  // yellow / black bar between cone tops
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    kit.bar([a.x, a.y + 0.62, a.z], [b.x, b.y + 0.62, b.z], 0.04, 0.06, 'vc', '#f2c230');
    const n = 5;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.35) / n, t2 = (k + 0.65) / n;
      kit.bar([a.x + (b.x - a.x) * t, a.y + 0.62 + (b.y - a.y) * t, a.z + (b.z - a.z) * t], [a.x + (b.x - a.x) * t2, a.y + 0.62 + (b.y - a.y) * t2, a.z + (b.z - a.z) * t2], 0.045, 0.065, 'vc', '#26262a', { no: true, cast: false });
    }
  }
  // lifted gutter covers leaning against the cones + a dark open channel
  const mid = pts[1];
  const f = mid.f;
  const ry = Math.atan2(f.tx, f.tz);
  const gx = f.x + f.nx * 4.22, gz = f.z + f.nz * 4.22;
  kit.box(0.44, 0.02, 1.6, gx, surfaceY(gx, gz, 0) + 0.002, gz, 'vc', '#4a4e54', { ry, no: true, cast: false });
  kit.box(0.42, 0.06, 0.5, mid.x - f.nx * 0.35, mid.y + 0.2, mid.z, 'vc', '#9a9890', { ry, rz: 1.2 });
  kit.box(0.42, 0.06, 0.5, mid.x - f.nx * 0.35, mid.y + 0.03, mid.z + 0.6, 'vc', '#a8a6a0', { ry: ry + 0.1 });
  // A-frame 工事中 sign facing north (towards traffic coming from the station)
  const ax = pts[0].x - f.nx * 0.2, az = pts[0].z - 0.8;
  kit.push(kit.mtx(ax, surfaceY(ax, az, 0), az, 0, Math.PI + ry));
  for (const sz of [-1, 1]) {
    kit.push(kit.mtx(0, 0, sz * 0.12, sz * 0.14, 0));
    for (const sx of [-1, 1]) kit.box(0.03, 0.95, 0.03, sx * 0.28, 0, 0, 'metal', '#d9dde0', { bottom: true });
    kit.box(0.54, 0.72, 0.02, 0, 0.2, 0, 'vc', '#ffffff', { bottom: true });
    kit.plane(0.52, 0.7, 0, 0.55, sz * 0.012, 'texS', '#ffffff', { region: kit.S('constr'), ry: sz > 0 ? 0 : Math.PI });
    kit.pop();
  }
  kit.pop();
}

export function buildShrine(kit, clusterOf) {
  const rng = kit.ctx.rng(8080);
  kit.cluster(clusterOf(SPOTS.shrine));
  hokora(kit, rng);
  kit.cluster(clusterOf(SPOTS.jizo));
  jizo(kit, rng);
  kit.cluster(clusterOf({ x: 4, z: 61 }));
  roadworks(kit, rng);
}
