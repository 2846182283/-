/**
 * Prebuilt multi-part templates for small objects that appear many times
 * (AC outdoor units, meters, water heaters, vent hoods, pots, plant blobs,
 * satellite dishes, TV antennas, props).  Each template is drawn once into a
 * scratch Batcher at the origin and later stamped into the district batch
 * with a matrix (still one draw call per material in the end).
 *
 * Conventions: wall-mounted things have their back at z = 0 and face +z;
 * ground things sit on y = 0.
 */
import * as THREE from 'three';
import { makeTemplate, fromGeometry, mtx } from './batch.js';
import { decalQuad } from './openings.js';

function jitterIco(seed, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // consistent jitter for shared vertices (non-indexed geometry: key by rounded position)
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let f = map.get(k);
    if (f === undefined) { f = 0.85 + rnd() * 0.28; map.set(k, f); }
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
  }
  g.computeVertexNormals();
  // smooth normals: average by position
  const nrm = g.attributes.normal;
  const acc = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    const a = acc.get(k) || [0, 0, 0];
    a[0] += nrm.getX(i); a[1] += nrm.getY(i); a[2] += nrm.getZ(i);
    acc.set(k, a);
  }
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    const a = acc.get(k);
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    nrm.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
  return g;
}

function lathe(profile, seg = 10) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  return g;
}

export function makeTemplates(D) {
  const T = {};
  T.blobs = [11, 23, 37, 51].map((s) => fromGeometry(jitterIco(s), 'leaf', '#ffffff'));
  // 20-triangle clumps for long hedges and the cheap lane-side planting
  T.blobsLow = [11, 23, 37, 51].map((s) => fromGeometry(jitterIco(s, 0), 'leaf', '#ffffff'));
  T.ball = fromGeometry(new THREE.IcosahedronGeometry(1, 1), 'unlit', '#ffffff');
  T.ballSolid = fromGeometry(new THREE.IcosahedronGeometry(1, 1), 'solid', '#ffffff');

  // --- pots (unit height 1, rim radius ~0.5) ---------------------------------
  T.potTerracotta = fromGeometry(lathe([[0, 0], [0.34, 0], [0.4, 0.05], [0.48, 0.82], [0.54, 0.84], [0.54, 1.0], [0.46, 1.0], [0.44, 0.9], [0, 0.9]]), 'solid', '#c9825a');
  T.potGlazed = fromGeometry(lathe([[0, 0], [0.3, 0], [0.45, 0.2], [0.5, 0.55], [0.42, 0.92], [0.44, 1.0], [0.36, 1.0], [0, 0.9]]), 'solid', '#4f7fa8');
  T.potBox = makeTemplate((B) => {
    B.box('solid', -0.5, 0, -0.5, 0.5, 0.9, 0.5, '#ffffff');
    B.box('solid', -0.54, 0.86, -0.54, 0.54, 1.0, 0.54, '#ffffff', { skip: 'y' });
  });
  // cheap square planter pot (filler lots)
  T.potLow = makeTemplate((B) => {
    B.box('solid', -0.5, 0, -0.5, 0.5, 0.9, 0.5, '#ffffff', { skip: 'y' });
    B.box('solid', -0.54, 0.86, -0.54, 0.54, 1.0, 0.54, '#ffffff', { skip: 'y' });
  });
  T.bucket = fromGeometry(lathe([[0, 0.01], [0.13, 0.01], [0.16, 0.28], [0.17, 0.3], [0.155, 0.3], [0.14, 0.05], [0, 0.05]]), 'solid', '#ffffff');

  // --- AC outdoor unit (0.8 x 0.6 x 0.3) --------------------------------------
  T.ac = makeTemplate((B) => {
    B.box('solid', -0.4, 0.06, 0, 0.4, 0.62, 0.29, '#ecebe6');
    B.box('small', -0.36, 0, 0.02, -0.28, 0.06, 0.29, '#8d9197');
    B.box('small', 0.28, 0, 0.02, 0.36, 0.06, 0.29, '#8d9197');
    decalQuad(B, D, 'acfront', 0, 0.34, 0.292, 0.78, 0.54);
    // side service valves + pipe stubs
    B.box('small', 0.4, 0.14, 0.05, 0.47, 0.3, 0.2, '#c9c9c4');
    B.cyl('small', [0.47, 0.2, 0.09], [0.6, 0.2, 0.09], 0.012, '#d9b38a', 5);
    B.cyl('small', [0.47, 0.26, 0.14], [0.6, 0.26, 0.14], 0.01, '#d9b38a', 5);
  });
  // AC plastic base block
  T.acBase = makeTemplate((B) => {
    B.box('solid', -0.42, 0, -0.02, -0.26, 0.09, 0.36, '#6b6f75');
    B.box('solid', 0.26, 0, -0.02, 0.42, 0.09, 0.36, '#6b6f75');
  });
  // wall bracket pair for a hung AC unit
  T.acBracket = makeTemplate((B) => {
    for (const x of [-0.3, 0.3]) {
      B.box('metal', x - 0.02, -0.02, 0, x + 0.02, 0.02, 0.36, '#9aa1a8');
      B.beam('metal', [x, -0.3, 0.01], [x, -0.01, 0.34], 0.03, 0.03, '#9aa1a8', { centerY: true });
      B.box('metal', x - 0.025, -0.34, 0, x + 0.025, 0.04, 0.02, '#9aa1a8');
    }
  });

  // --- meters, heater, vents ---------------------------------------------------
  T.elecMeter = makeTemplate((B) => {
    B.box('solid', -0.11, 0, 0, 0.11, 0.32, 0.12, '#e6e8ea');
    B.box('small', -0.12, 0.3, 0, 0.12, 0.34, 0.15, '#cfd2d5');
    decalQuad(B, D, 'meter', 0, 0.15, 0.122, 0.18, 0.24);
  });
  T.gasMeter = makeTemplate((B) => {
    B.box('solid', -0.13, 0, 0, 0.13, 0.3, 0.16, '#d9dadb');
    decalQuad(B, D, 'gasmeter', 0, 0.17, 0.162, 0.22, 0.2);
    B.pipe('solid', [[-0.08, 0.0, 0.08], [-0.08, -0.12, 0.08], [-0.08, -0.12, 0.03], [-0.08, -1.2, 0.03]], 0.022, '#d6b24c', 6);
    B.pipe('solid', [[0.08, 0.0, 0.08], [0.08, -0.08, 0.08], [0.08, -0.08, 0.0]], 0.02, '#d6b24c', 6);
  });
  T.heater = makeTemplate((B) => {
    B.box('solid', -0.23, 0, 0, 0.23, 0.62, 0.24, '#f1f1ee');
    decalQuad(B, D, 'heater', 0, 0.31, 0.242, 0.42, 0.56);
    for (let k = 0; k < 4; k++) B.cyl('small', [-0.15 + k * 0.1, 0, 0.1], [-0.15 + k * 0.1, -0.35, 0.1], 0.013, k === 0 ? '#d6b24c' : '#b9b0a6', 5);
    B.box('small', -0.2, -0.36, 0, 0.2, -0.32, 0.16, '#c9c9c4');
  });
  T.vent = makeTemplate((B) => {
    B.cyl('solid', [0, 0, 0], [0, 0, 0.1], 0.085, '#e9e6de', 8);
    B.box('solid', -0.1, -0.02, 0.06, 0.1, 0.1, 0.13, '#e9e6de');
    B.box('small', -0.08, -0.03, 0.08, 0.08, -0.02, 0.12, '#9aa1a8');
  });
  T.ventSquare = makeTemplate((B) => {
    B.box('solid', -0.12, -0.12, 0, 0.12, 0.12, 0.04, '#e3e1da');
    for (let k = 0; k < 4; k++) B.box('small', -0.1, -0.09 + k * 0.05, 0.04, 0.1, -0.07 + k * 0.05, 0.07, '#b9bcbf');
  });
  T.tap = makeTemplate((B) => {
    B.box('solid', -0.06, 0, -0.06, 0.06, 0.8, 0.06, '#b9b4aa');
    B.cyl('metal', [0, 0.62, 0.06], [0, 0.62, 0.14], 0.015, '#c9cdd2', 6);
    B.box('metal', -0.025, 0.66, 0.08, 0.025, 0.69, 0.11, '#c9cdd2');
    B.box('solid', -0.2, 0, -0.08, 0.2, 0.06, 0.3, '#a9a7a1');
  });

  // --- satellite dish (faces +z, tilted up) --------------------------------------
  T.dish = makeTemplate((B) => {
    B.box('metal', -0.03, -0.1, 0, 0.03, 0.1, 0.05, '#aab0b6');
    B.push(mtx(0, 0.05, 0.12, 0, 1, 1, 1, -0.6));
    const cap = new THREE.SphereGeometry(0.5, 12, 3, 0, Math.PI * 2, 0, 0.5);
    cap.rotateX(-Math.PI / 2);
    cap.translate(0, 0, -0.44);
    B.geo('solid', cap, null, '#eeeeea');
    const back = cap.clone();
    back.scale(1, 1, 1);
    const idx = back.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
    const n = back.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    B.geo('solid', back, null, '#d7d7d2');
    B.beam('small', [0, -0.2, 0.06], [0, -0.1, 0.42], 0.02, 0.02, '#c9cdd2', { centerY: true });
    B.boxC('small', 0, -0.1, 0.44, 0.06, 0.08, 0.08, '#5a5f68');
    B.pop();
  });

  // --- Yagi TV antenna (mast along +y from 0, boom along +z) --------------------------
  T.yagi = makeTemplate((B) => {
    const c = '#b3b9bf';
    B.box('small', -0.012, -0.012, -0.55, 0.012, 0.012, 0.95, c); // boom
    for (let i = 0; i < 12; i++) {
      const z = -0.45 + i * 0.12;
      const w = i === 0 ? 0.62 : 0.38 - i * 0.012;
      B.box('small', -w / 2, -0.007, z - 0.007, w / 2, 0.007, z + 0.007, c);
    }
    // reflector screen
    for (const y of [-0.16, -0.06, 0.06, 0.16]) B.box('small', -0.3, y - 0.006, -0.54, 0.3, y + 0.006, -0.53, c);
    B.box('small', -0.02, -0.18, -0.55, 0.02, 0.18, -0.52, c);
    // clamp + dipole box
    B.boxC('small', 0, 0, -0.2, 0.06, 0.06, 0.08, '#3a3d42');
  });

  // --- small props --------------------------------------------------------------------------
  T.umbrellaStand = makeTemplate((B) => {
    B.cyl('solid', [0, 0, 0], [0, 0.45, 0], 0.13, '#7d8a96', 10);
    const cols = ['#3b5f8a', '#d35d6e', '#f0ede5', '#3c9a62'];
    cols.slice(0, 3).forEach((col, i) => {
      const a = i * 2.1;
      const x = Math.cos(a) * 0.06, z = Math.sin(a) * 0.06;
      B.cyl('solid', [x, 0.2, z], [x * 2.2, 0.85, z * 2.2], 0.035, col, 6, { r1: 0.02 });
      B.cyl('small', [x * 2.2, 0.85, z * 2.2], [x * 2.3, 0.95, z * 2.3], 0.01, '#3a2a20', 4);
      B.boxC('small', x * 2.35, 0.97, z * 2.35 + 0.03, 0.02, 0.02, 0.07, '#3a2a20');
    });
  });
  T.wateringCan = makeTemplate((B) => {
    B.cyl('solid', [0, 0, 0], [0, 0.24, 0], 0.11, '#ffffff', 10);
    B.beam('solid', [0.08, 0.06, 0], [0.34, 0.28, 0], 0.035, 0.035, '#ffffff', { centerY: true });
    B.boxC('solid', 0.35, 0.29, 0, 0.06, 0.03, 0.06, '#ffffff');
    B.beam('solid', [-0.1, 0.22, 0], [0.02, 0.33, 0], 0.03, 0.025, '#ffffff', { centerY: true });
    B.beam('solid', [0.02, 0.33, 0], [0.09, 0.22, 0], 0.03, 0.025, '#ffffff', { centerY: true });
  });
  T.broom = makeTemplate((B) => {
    B.cyl('solid', [0, 0.28, 0], [0, 1.25, 0], 0.014, '#b58c63', 5);
    B.cyl('solid', [0, 0.0, 0], [0, 0.32, 0], 0.13, '#d9c27a', 6, { r1: 0.035 });
  });
  T.garbageBox = makeTemplate((B) => {
    B.box('solid', -0.45, 0, -0.3, 0.45, 0.65, 0.3, '#ffffff');
    B.hexa([[-0.47, 0.68, 0.32], [0.47, 0.68, 0.32], [0.47, 0.76, -0.32], [-0.47, 0.76, -0.32]], [[-0.47, 0.64, 0.32], [0.47, 0.64, 0.32], [0.47, 0.64, -0.32], [-0.47, 0.64, -0.32]],
      { top: { kind: 'solid', color: '#ffffff' }, bottom: { kind: 'solid', color: '#ffffff' }, sides: [{ kind: 'solid', color: '#ffffff' }, { kind: 'solid', color: '#ffffff' }, { kind: 'solid', color: '#ffffff' }, { kind: 'solid', color: '#ffffff' }] });
    B.box('small', -0.1, 0.5, 0.3, 0.1, 0.56, 0.33, '#e0e0da');
  });
  T.parcel = makeTemplate((B) => {
    B.box('solid', -0.2, 0, -0.15, 0.2, 0.26, 0.15, '#c9a26d');
    decalQuad(B, D, 'parcel', 0, 0.13, 0.152, 0.38, 0.24);
  });
  T.newspaper = makeTemplate((B) => {
    B.cyl('solid', [-0.16, 0.035, 0], [0.16, 0.035, 0], 0.035, '#ecebe4', 7);
    B.box('small', -0.02, 0.0, -0.04, 0.02, 0.075, 0.04, '#d8433d');
  });
  T.slippers = makeTemplate((B) => {
    for (const x of [-0.06, 0.06]) {
      B.box('solid', x - 0.045, 0, -0.12, x + 0.045, 0.025, 0.12, '#ffffff');
      B.box('small', x - 0.046, 0.025, -0.02, x + 0.046, 0.05, 0.06, '#ffffff');
    }
  });
  T.milkBox = makeTemplate((B) => {
    B.box('solid', -0.13, 0, 0, 0.13, 0.26, 0.2, '#f2ede0');
    B.box('solid', -0.14, 0.26, 0, 0.14, 0.29, 0.21, '#6f8fbf');
    decalQuad(B, D, 'milkbox', 0, 0.13, 0.202, 0.22, 0.22);
  });
  T.mailboxWall = makeTemplate((B) => {
    B.box('solid', -0.19, 0, 0, 0.19, 0.3, 0.12, '#e9e7e1');
    B.box('solid', -0.2, 0.3, 0, 0.2, 0.33, 0.14, '#b8b4aa');
    decalQuad(B, D, 'mailbox', 0, 0.15, 0.122, 0.34, 0.26);
  });
  T.mailboxPost = makeTemplate((B) => {
    B.box('metal', -0.03, 0, -0.03, 0.03, 0.85, 0.03, '#5a5f68');
    B.box('solid', -0.19, 0.85, -0.15, 0.19, 1.15, 0.15, '#ffffff');
    B.box('solid', -0.2, 1.15, -0.16, 0.2, 1.19, 0.16, '#ffffff');
    decalQuad(B, D, 'mailbox', 0, 1.0, 0.152, 0.34, 0.26);
  });
  T.lantern = makeTemplate((B) => {
    // small stone lantern (灯籠)
    const c = '#b8b4aa';
    B.box('solid', -0.2, 0, -0.2, 0.2, 0.1, 0.2, c);
    B.cyl('solid', [0, 0.1, 0], [0, 0.55, 0], 0.07, c, 6);
    B.box('solid', -0.18, 0.55, -0.18, 0.18, 0.62, 0.18, c);
    B.box('solid', -0.14, 0.62, -0.14, 0.14, 0.85, 0.14, c);
    B.box('unlit', -0.07, 0.66, 0.14, 0.07, 0.8, 0.141, '#6a6258');
    B.hexa([[-0.28, 0.85, 0.28], [0.28, 0.85, 0.28], [0.02, 1.02, 0.02], [-0.02, 1.02, 0.02]], [[-0.28, 0.82, 0.28], [0.28, 0.82, 0.28], [0.28, 0.82, -0.28], [-0.28, 0.82, -0.28]],
      { top: { kind: 'solid', color: c }, bottom: null, sides: [{ kind: 'solid', color: c }, null, null, null] });
    B.hexa([[0.28, 0.85, -0.28], [-0.28, 0.85, -0.28], [-0.02, 1.02, -0.02], [0.02, 1.02, -0.02]], [[0.28, 0.82, -0.28], [-0.28, 0.82, -0.28], [-0.28, 0.82, 0.28], [0.28, 0.82, 0.28]],
      { top: { kind: 'solid', color: c }, bottom: null, sides: [{ kind: 'solid', color: c }, null, null, null] });
    B.hexa([[0.28, 0.85, 0.28], [0.28, 0.85, -0.28], [0.02, 1.02, -0.02], [0.02, 1.02, 0.02]], [[0.28, 0.82, 0.28], [0.28, 0.82, -0.28], [0.28, 0.82, -0.28], [0.28, 0.82, 0.28]],
      { top: { kind: 'solid', color: c }, bottom: null, sides: null });
    B.hexa([[-0.28, 0.85, -0.28], [-0.28, 0.85, 0.28], [-0.02, 1.02, 0.02], [-0.02, 1.02, -0.02]], [[-0.28, 0.82, -0.28], [-0.28, 0.82, 0.28], [-0.28, 0.82, 0.28], [-0.28, 0.82, -0.28]],
      { top: { kind: 'solid', color: c }, bottom: null, sides: null });
    B.boxC('solid', 0, 1.06, 0, 0.08, 0.08, 0.08, c);
  });
  T.stone = fromGeometry(new THREE.CylinderGeometry(0.5, 0.52, 1, 9).translate(0, 0.5, 0), 'solid', '#ffffff');
  return T;
}
