/**
 * poles/pole.js — one Japanese concrete utility pole (電柱) and everything
 * bolted to it.
 *
 * Local frame (after the layout's rotY): +X points ACROSS the road (the
 * cross-arm direction), wires run along ±Z, y = 0 at the ground.  `rs` (±1)
 * says which local X side the carriageway is on.
 *
 * From the ground up:
 *   foot collar, yellow/black striped sleeve with reflective bands, number
 *   plate + telecom plate, stickers / flyers, wrap-around advert, address
 *   plate, danger plate, CCTV sticker; telecom terminal box + riser pipe,
 *   CCTV camera; street light arm; telecom cable clamps; service-drop hook;
 *   low-voltage rack; transformer cans with bushings, cut-outs and ground
 *   wire moulding; section switch box; cross-span arm; high-voltage cross arm
 *   with braces and pin insulators; cap.  Step bolts climb the pole.
 *
 * Returns world-space attachment points for wires.
 */
import * as THREE from 'three';
import { mtx, regionUV } from './kit.js';

export const POLE_H = 12;
const R_BOT = 0.165;
const R_TOP = 0.095;
/** Pole radius at height y. */
export const rAt = (y) => R_BOT + (R_TOP - R_BOT) * (y / POLE_H);

// heights (m above the pole foot)
export const Y = {
  hvArm: 11.2,
  crossArm: 10.55,
  cutoutArm: 10.05,
  switchBox: 9.75,
  transTop: 9.55,
  transBot: 8.8,
  lvRack: 8.15,
  drop: 7.65,
  tel0: 6.3,
  tel1: 5.85,
  light: 5.05,
  cctv: 4.35,
  box: 3.55,
};

const C = {
  steel: '#a7aeb5',
  steelDark: '#7f868d',
  band: '#858c93',
  bolt: '#6a7076',
  porcelain: '#f1f0ea',
  porcelainShade: '#e3e2dc',
  trans: '#aeb5ba',
  transLid: '#9aa1a7',
  cutout: '#dedcd4',
  black: '#34373c',
  concrete: '#b6b4ad',
  concreteDark: '#9d9b94',
  lampHousing: '#e9ebea',
  lampLens: '#fff3d6',
  camera: '#f1f1ec',
  yellow: '#f2c230',
  plate: '#e9e9e4',
};

/** Closed partial cylinder shell (thin curved plate) for decals wrapped on the pole. */
function wrapGeo(r, h, thetaC, width, region, seg = 4) {
  const len = width / r;
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true, thetaC - len / 2, len);
  regionUV(g, region);
  return g;
}

/** Point on a circle around the pole: theta from +Z toward +X. */
const around = (r, theta) => [r * Math.sin(theta), r * Math.cos(theta)];

/**
 * Build one pole.
 * @param {object} K     kit
 * @param {object} P     plan (see poles.js planPoles)
 * @returns {object}     attachment points (world) + extra wire polylines
 */
export function buildPole(K, P) {
  const F = mtx(P.x, P.y, P.z, 0, P.rotY, 0);
  const f = K.frame(F);
  const R = K.R;
  const rs = P.rs;
  const field = -rs;
  const extraWires = []; // {pts:[Vector3], r}
  const band = (y, h = 0.035, bucket = 'metalS') => f.cyl(bucket, rAt(y) + 0.008, rAt(y) + 0.008, h, C.band, 0, y - h / 2, 0, 10, 0, 0, 0, true);
  /** Flat plate (metal backing + atlas face) standing off the pole at angle theta. */
  const plate = (region, w, h, y, theta, standOff, color, bucket = 'metal') => {
    const r = rAt(y) + standOff;
    const [px, pz] = around(r, theta);
    f.geo(bucket, new THREE.BoxGeometry(w + 0.01, h + 0.01, 0.01), color, px, y, pz, 0, theta, 0);
    const [qx, qz] = around(r + 0.0065, theta);
    f.plane(region, w, h, qx, y, qz, theta);
  };

  // --- shaft, cap, foot -------------------------------------------------------
  {
    const g = new THREE.CylinderGeometry(R_TOP, R_BOT, POLE_H, 16, 1, true);
    g.translate(0, POLE_H / 2, 0);
    regionUV(g, R[`shaft${P.variant}`]);
    // rotate so the texture's stencilled marks face the pavement side
    K.add('atlas', g, '#fff', f.m(0, 0, 0, 0, P.variant * 1.3, 0));
    const cap = new THREE.SphereGeometry(R_TOP + 0.004, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    f.geo('vc', cap, C.concrete, 0, POLE_H, 0, 0, 0, 0, 1, 0.55, 1);
    f.cyl('vc', R_TOP + 0.012, R_TOP + 0.012, 0.05, C.concreteDark, 0, POLE_H - 0.12, 0, 14);
    f.cyl('vc', R_BOT + 0.035, R_BOT + 0.05, 0.08, C.concreteDark, 0, -0.03, 0, 16);
  }

  // --- foot: striped sleeve or reflective band ---------------------------------------
  if (P.sleeve) {
    const g = new THREE.CylinderGeometry(rAt(1.6) + 0.012, rAt(0.08) + 0.012, 1.52, 20, 1, true);
    g.translate(0, 0.08 + 0.76, 0);
    regionUV(g, R.sleeve);
    K.add('atlas', g, '#fff', f.m(0, 0, 0, 0, rs > 0 ? 0 : Math.PI, 0));
    // rolled top / bottom lips so the sleeve edge reads
    f.cyl('vcS', rAt(1.6) + 0.016, rAt(1.6) + 0.016, 0.025, '#2b2a2e', 0, 1.585, 0, 20);
  } else {
    f.cyl('vcS', rAt(1.0) + 0.006, rAt(1.0) + 0.006, 0.1, '#eef1f4', 0, 0.95, 0, 16);
    f.cyl('vcS', rAt(1.2) + 0.006, rAt(1.2) + 0.006, 0.1, C.yellow, 0, 1.12, 0, 16);
  }

  // --- plates -------------------------------------------------------------------
  const tRoad = rs * Math.PI / 2; // theta of the road-facing side
  {
    // number plate: small vertical metal plate strapped to the road side
    const y = 2.05;
    plate(R[`plate_${P.plateKey}`], 0.125, 0.455, y, tRoad, 0.018, C.plate);
    band(y + 0.2, 0.02);
    band(y - 0.2, 0.02);
    // telecom plate on the line-facing side
    plate(R[`tel${P.telPlate}`], 0.19, 0.07, 1.78, tRoad - rs * 0.9, 0.014, '#dfe7ee', 'metalS');
  }
  if (P.address !== null) {
    const y = P.ad ? 3.35 : 2.7;
    plate(R[`addr${P.address}`], 0.4, 0.125, y, tRoad, 0.02, '#2f63b5');
    band(y, 0.02);
  }
  if (P.ad) {
    // 巻き看板: curved plate hugging the road side, three straps
    const y0 = 2.3, h = 0.78, r = rAt(y0 + h / 2) + 0.012;
    const g = wrapGeo(r, h, tRoad, 0.52, R[`ad_${P.ad}`], 8);
    K.add('decal', g, '#fff', f.m(0, y0 + h / 2, 0));
    for (const yy of [y0 + 0.04, y0 + h / 2, y0 + h - 0.04]) band(yy, 0.018);
  }
  // stickers / flyers + torn residue
  P.stickers.forEach((s) => {
    const r = rAt(s.y) + 0.004;
    const g = wrapGeo(r, s.h, s.theta, s.w, R[`st_${s.kind}`], 4);
    K.add('decal', g, '#fff', f.m(0, s.y, 0));
  });
  if (P.transformer) {
    // 危険 高電圧 plate on the road side
    const y = P.ad || P.address !== null ? 3.95 : 3.1;
    plate(R.danger, 0.16, 0.21, y, tRoad, 0.015, C.yellow, 'metalS');
    band(y + 0.12, 0.015);
  }
  if (P.cctv) {
    const y = 2.62, tt = tRoad + rs * 1.2, r = rAt(y) + 0.005;
    K.add('decal', wrapGeo(r, 0.13, tt, 0.22, R.cctv, 5), '#fff', f.m(0, y, 0));
  }

  // --- step bolts (足場ボルト), alternating along the line direction ---------------
  for (let y = 3.8, k = 0; y < POLE_H - 1.0; y += 0.45, k++) {
    const th = (k % 2 === 0 ? 0 : Math.PI) + 0.35 * rs; // alternate sides, turned slightly off the line axis
    const r = rAt(y);
    const g = K.proto('bolt', () => {
      const a = new THREE.CylinderGeometry(0.011, 0.011, 0.22, 5, 1, true); // ends hidden (pole / knob)
      a.translate(0, 0.11, 0);
      return a;
    });
    const [bx, bz] = around(r - 0.02, th);
    K.add('metalS', g, C.bolt, f.m(bx, y, bz, Math.PI / 2 - 0.12, th, 0)); // slight upward tilt
  }

  // --- high-voltage cross arm + braces + pin insulators ---------------------
  const hv = [];
  const pinInsulator = (lx, ly, lz) => {
    f.cyl('metalS', 0.012, 0.012, 0.06, C.steelDark, lx, ly, lz, 6);
    f.cyl('vc', 0.055, 0.06, 0.04, C.porcelain, lx, ly + 0.05, lz, 9);
    f.cyl('vc', 0.045, 0.05, 0.035, C.porcelainShade, lx, ly + 0.09, lz, 9);
    f.cyl('vc', 0.03, 0.04, 0.035, C.porcelain, lx, ly + 0.125, lz, 8);
    return f.p(lx, ly + 0.165, lz);
  };
  {
    const y = Y.hvArm;
    f.box('metal', 1.8, 0.075, 0.075, C.steel, 0, y, 0);
    f.box('metalS', 0.14, 0.12, 0.2, C.steelDark, 0, y - 0.03, 0); // arm clamp
    band(y - 0.05, 0.06);
    for (const s of [-1, 1]) f.tube('metalS', [s * 0.6, y - 0.03, 0.04], [0, y - 0.55, 0.04], 0.013, C.steel, 5);
    band(y - 0.55, 0.03);
    for (const lx of [-0.78 * rs, -0.3 * rs, 0.78 * rs]) hv.push(pinInsulator(lx, y + 0.0375, 0));
  }
  // cross-span arm (runs along Z so the wires can leave across the road)
  const crossHV = [];
  if (P.crossArm) {
    const y = Y.crossArm;
    f.box('metal', 0.07, 0.07, 1.5, C.steel, 0, y, 0);
    band(y - 0.04, 0.05);
    for (const s of [-1, 1]) f.tube('metalS', [0.03, y - 0.03, s * 0.5], [0.03, y - 0.45, 0], 0.012, C.steel, 5);
    for (const lz of [-0.62, 0.62]) crossHV.push(pinInsulator(0, y + 0.035, lz));
  }

  // --- section switch (区分開閉器) -------------------------------------------------
  if (P.switchBox) {
    const y = Y.switchBox, x = field * (rAt(y) + 0.3);
    f.box('metal', 0.5, 0.05, 0.08, C.steel, field * 0.2, y + 0.23, 0); // hanger
    f.box('metal', 0.4, 0.34, 0.3, '#b3b9bd', x, y, 0);
    f.box('metalS', 0.44, 0.03, 0.34, C.steelDark, x, y + 0.18, 0);
    f.box('metalS', 0.03, 0.2, 0.03, C.black, x + field * 0.21, y - 0.02, 0.1); // lever
    for (const lz of [-0.1, 0, 0.1]) {
      f.cyl('vcS', 0.022, 0.03, 0.09, C.porcelain, x - field * 0.08, y + 0.19, lz, 8);
      const top = f.p(x - field * 0.08, y + 0.28, lz);
      const i = lz < 0 ? 0 : lz > 0 ? 2 : 1;
      extraWires.push({ pts: sagPts(top, hv[i], 0.12, 5), r: 0.006 });
    }
    band(y + 0.2, 0.04);
  }

  // --- transformer(s) ---------------------------------------------------------------
  let lvFromTrans = null;
  if (P.transformer) {
    const cans = P.transformer;
    const yT = Y.transBot, hT = Y.transTop - Y.transBot;
    const cx = field * (rAt(9.1) + 0.3);
    const zs = cans === 2 ? [-0.26, 0.26] : [0];
    // hanger frame: two horizontal bars + vertical channel
    for (const yy of [yT + 0.15, yT + hT - 0.1]) {
      f.box('metal', 0.36, 0.06, 0.08 + (cans - 1) * 0.5, C.steelDark, field * (rAt(yy) + 0.14), yy, 0);
      band(yy, 0.05);
    }
    // cut-out arm with three porcelain cut-outs
    const yc = Y.cutoutArm;
    f.box('metal', 0.07, 0.06, 1.0, C.steel, field * (rAt(yc) + 0.28), yc, 0);
    f.box('metal', 0.3, 0.05, 0.06, C.steel, field * (rAt(yc) + 0.13), yc, 0);
    band(yc, 0.04);
    const cutTops = [];
    const cutBots = [];
    [-0.36, 0, 0.36].forEach((lz) => {
      const x = field * (rAt(yc) + 0.28);
      f.box('vc', 0.075, 0.24, 0.085, C.cutout, x, yc - 0.17, lz);
      f.box('vcS', 0.085, 0.03, 0.095, '#b8b6ae', x, yc - 0.04, lz);
      f.cyl('vcS', 0.012, 0.012, 0.06, C.black, x, yc - 0.33, lz, 5);
      cutTops.push(f.p(x, yc + 0.0, lz));
      cutBots.push(f.p(x, yc - 0.33, lz));
    });
    zs.forEach((lz, ci) => {
      f.cyl('metal', 0.22, 0.22, hT - 0.08, C.trans, cx, yT, lz, 18);
      f.cyl('metalS', 0.235, 0.235, 0.035, C.transLid, cx, yT + hT - 0.1, lz, 18);
      f.cyl('metalS', 0.228, 0.228, 0.03, C.transLid, cx, yT + 0.02, lz, 18);
      const lid = K.proto('lid', () => new THREE.SphereGeometry(0.232, 18, 5, 0, Math.PI * 2, 0, Math.PI / 2));
      K.add('metal', lid, C.transLid, f.m(cx, yT + hT - 0.07, lz, 0, 0, 0, 1, 0.3, 1));
      // vertical cooling ribs on the outer side
      for (let k = -2; k <= 2; k++) {
        const a = (field > 0 ? Math.PI / 2 : -Math.PI / 2) + k * 0.32;
        const [rx, rz] = around(0.225, a);
        f.box('metalS', 0.018, hT - 0.25, 0.018, C.transLid, cx + rx, yT + 0.08 + (hT - 0.25) / 2, lz + rz, 0, a, 0);
      }
      // HV bushings on the lid, LV bushings on the side
      for (const bz of [-0.08, 0.08]) {
        const bx = cx - field * 0.06;
        f.cyl('vc', 0.028, 0.038, 0.12, C.porcelain, bx, yT + hT, lz + bz, 10);
        f.cyl('vcS', 0.036, 0.036, 0.018, C.porcelainShade, bx, yT + hT + 0.05, lz + bz, 10);
        const top = f.p(bx, yT + hT + 0.12, lz + bz);
        const b = bz > 0 ? 1 : 0;
        const cut = cans === 2 ? ci + b : b * 2; // each HV bushing is fed from one cut-out
        extraWires.push({ pts: sagPts(cutBots[cut], top, 0.05, 5), r: 0.006 });
      }
      for (const bz of [-0.12, 0, 0.12]) {
        const bx = cx - field * 0.2;
        const g = K.proto('lvBush', () => { const a = new THREE.CylinderGeometry(0.018, 0.024, 0.08, 8); a.translate(0, 0.04, 0); return a; });
        K.add('vcS', g, '#3d4046', f.m(bx, yT + hT - 0.2, lz + bz, 0, 0, field * Math.PI / 2));
      }
      // rating label
      f.plane(R.trans, 0.11, 0.07, cx, yT + 0.4, lz + (cans === 2 ? Math.sign(lz) : 1) * 0.227, cans === 2 && lz < 0 ? Math.PI : 0);
    });
    // HV conductors -> cut-out tops
    cutTops.forEach((p, i) => extraWires.push({ pts: sagPts(hv[i], p, 0.15, 6), r: 0.006 }));
    // ground-wire moulding down the pole (field side, rotated off the line axis)
    const gt = field * Math.PI / 2 + 0.45;
    const [ax, az] = around(rAt(yT) + 0.03, gt);
    const [bx, bz] = around(rAt(0.2) + 0.03, gt);
    f.tube('metal', [bx, 0.15, bz], [ax, yT + 0.1, az], 0.022, '#a3a9ae', 8);
    for (let y = 0.8; y < yT; y += 1.6) band(y, 0.025);
    lvFromTrans = f.p(cx - field * 0.25, yT + hT - 0.18, 0);
  }

  // --- low-voltage rack (spool insulators) --------------------------------------
  const lv = [];
  {
    const y = Y.lvRack;
    f.box('metal', 0.72, 0.055, 0.055, C.steel, 0, y, 0);
    band(y, 0.05);
    for (const lx of [-0.3, 0.3]) {
      f.cyl('vcS', 0.032, 0.032, 0.07, C.porcelainShade, lx, y + 0.028, -0.035, 10, Math.PI / 2, 0, 0);
      lv.push(f.p(lx, y + 0.0, 0));
    }
    if (lvFromTrans) {
      extraWires.push({ pts: sagPts(lvFromTrans, lv[rs > 0 ? 0 : 1], 0.08, 5), r: 0.008 });
      extraWires.push({ pts: sagPts(lvFromTrans, lv[rs > 0 ? 1 : 0], 0.1, 6), r: 0.008 });
    }
  }
  // service-drop hook bracket (a short plate with an eye bolt on each side)
  {
    const y = Y.drop;
    band(y, 0.05);
    f.box('metalS', 0.1, 0.05, 0.42, C.steelDark, 0, y, 0);
  }

  // --- telecom clamps (on the field side) --------------------------------------------
  const tel = [];
  for (const [i, y] of [[0, Y.tel0], [1, Y.tel1]]) {
    const r = rAt(y);
    band(y, 0.045);
    f.box('metalS', 0.26, 0.04, 0.05, C.steelDark, field * (r + 0.1), y, 0);
    f.box('vcS', 0.06, 0.07, 0.07, C.black, field * (r + 0.2), y - 0.02, 0);
    tel.push(f.p(field * (r + 0.2), y - (i === 0 ? 0.045 : 0.04), 0));
  }
  if (P.coil) {
    // spare-cable slack coil (余長) hanging beside the pole
    const g = K.proto('coil', () => new THREE.TorusGeometry(0.3, 0.022, 5, 20));
    K.add('vcS', g, C.black, f.m(field * (rAt(5.5) + 0.26), 5.5, 0.05, 0, 0, 0, 1, 1.25, 1));
    f.box('metalS', 0.04, 0.12, 0.04, C.steelDark, field * (rAt(5.5) + 0.26), 5.9, 0.05);
  }
  if (P.box) {
    // telecom terminal box + riser pipe from the ground
    const y = Y.box, r = rAt(y);
    const bx = field * (r + 0.1);
    const tt = field * Math.PI / 2;
    f.box('metal', 0.16, 0.44, 0.32, '#c4c7c4', bx, y, 0);
    f.box('metalS', 0.18, 0.03, 0.34, '#a9adab', bx, y + 0.23, 0);
    f.plane(R[`box_${P.box}`], 0.3, 0.38, field * (r + 0.1 + 0.082), y, 0, tt);
    band(y + 0.15, 0.03);
    band(y - 0.15, 0.03);
    // riser pipe (grey conduit) from ground into the box bottom, then cable up to the clamps
    const [px, pz] = around(r + 0.045, tt + 0.55);
    const [qx, qz] = around(rAt(0.1) + 0.045, tt + 0.55);
    f.tube('metal', [qx, 0.0, qz], [px, y - 0.23, pz], 0.035, '#9ea4a9', 8);
    for (let yy = 0.6; yy < y - 0.3; yy += 1.1) band(yy, 0.022);
    extraWires.push({ pts: [f.p(bx, y + 0.24, 0.1), f.p(field * (rAt(5) + 0.12), 5.0, 0.1), f.p(field * (rAt(Y.tel1) + 0.15), Y.tel1 - 0.06, 0.05)], r: 0.012 });
  }

  // --- street light --------------------------------------------------------------
  let lamp = null;
  if (P.streetLight) {
    const y = Y.light;
    band(y, 0.07);
    band(y - 0.32, 0.04);
    const p0 = new THREE.Vector3(rs * rAt(y) * 0.8, y, 0);
    const p1 = new THREE.Vector3(rs * 0.7, y + 0.42, 0);
    const p2 = new THREE.Vector3(rs * 1.45, y + 0.5, 0);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const a = p0.clone().lerp(p1, t), b = p1.clone().lerp(p2, t);
      pts.push(a.lerp(b, t).applyMatrix4(F));
    }
    K.add('metal', K.ctx.geom.tubeAlong(pts, 0.026, 8), '#c9ced2');
    f.tube('metalS', [rs * rAt(y - 0.32), y - 0.32, 0], [rs * 0.55, y + 0.33, 0], 0.013, '#c0c5c9', 5);
    const hx = rs * 1.62, hy = y + 0.47;
    if (P.lampStyle === 'oval') {
      const g = K.proto('lampOval', () => new THREE.SphereGeometry(0.5, 16, 8));
      K.add('metal', g, C.lampHousing, f.m(hx, hy, 0, 0, 0, 0, 0.6, 0.2, 0.34));
      const lens = K.proto('lampOvalLens', () => new THREE.SphereGeometry(0.5, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
      K.add('vcS', lens, C.lampLens, f.m(hx, hy - 0.005, 0, 0, 0, 0, 0.5, 0.25, 0.26));
    } else {
      const g = K.proto('lampLong', () => new THREE.CapsuleGeometry(0.1, 0.46, 6, 14));
      K.add('metal', g, C.lampHousing, f.m(hx + rs * 0.04, hy, 0, 0, 0, Math.PI / 2, 0.42, 1, 1.15));
      f.box('vcS', 0.5, 0.02, 0.15, C.lampLens, hx + rs * 0.04, hy - 0.04, 0);
    }
    f.cyl('vcS', 0.025, 0.025, 0.035, '#f7f7f4', hx - rs * 0.12, hy + 0.05, 0, 8); // photo sensor
    lamp = f.p(hx, hy - 0.06, 0);
  }

  // --- CCTV camera ----------------------------------------------------------------
  if (P.cctv) {
    const y = Y.cctv;
    band(y, 0.05);
    const dirZ = P.cctvDir;
    f.box('metalS', 0.05, 0.05, 0.3, C.steelDark, rs * (rAt(y) + 0.04), y, dirZ * 0.12);
    const cx = rs * (rAt(y) + 0.06), cz = dirZ * 0.34;
    f.box('vc', 0.13, 0.11, 0.26, C.camera, cx, y - 0.06, cz, 0.25 * dirZ, 0, 0);
    f.box('vcS', 0.16, 0.015, 0.32, '#dcdcd6', cx, y + 0.005, cz + dirZ * 0.03, 0.25 * dirZ, 0, 0);
    f.cyl('vcS', 0.035, 0.035, 0.02, '#23262d', cx, y - 0.095, cz + dirZ * 0.125, 10, dirZ * (Math.PI / 2 + 0.25), 0, 0);
  }

  // --- guy wire with yellow guard -------------------------------------------------
  if (P.guy) {
    const top = f.p(0, 8.9, 0);
    const a = new THREE.Vector3(P.guy.x, P.guy.y, P.guy.z);
    band(8.9, 0.05);
    extraWires.push({ pts: [top, a], r: 0.011 });
    // guard sleeve over the bottom 1.8 m of the guy
    const d = new THREE.Vector3().subVectors(top, a).normalize();
    const g1 = a.clone().addScaledVector(d, 0.1), g2 = a.clone().addScaledVector(d, 1.9 / Math.max(0.3, d.y));
    K.add('vc', tubeBetweenLocal(g1, g2, 0.04), C.yellow);
    K.add('vcS', tubeBetweenLocal(g2.clone().addScaledVector(d, -0.25), g2.clone().addScaledVector(d, -0.18), 0.043), '#2b2a2e');
    K.add('vcS', tubeBetweenLocal(g1.clone().addScaledVector(d, 0.3), g1.clone().addScaledVector(d, 0.37), 0.043), '#2b2a2e');
    K.add('vc', new THREE.CylinderGeometry(0.12, 0.14, 0.08, 10).translate(a.x, a.y + 0.02, a.z), C.concreteDark);
  }

  /** Service-drop attachment toward a world target (eye bolt on the drop bracket). */
  const dropFrom = (target, level = 'lv') => {
    const y = level === 'lv' ? Y.drop : Y.tel1 - 0.25;
    const c = f.p(0, y, 0);
    const d = new THREE.Vector3(target.x - c.x, 0, target.z - c.z);
    if (d.lengthSq() < 1e-6) d.set(1, 0, 0);
    d.normalize();
    return c.addScaledVector(d, rAt(y) + 0.1);
  };
  const localPt = (lx, ly, lz) => f.p(lx, ly, lz);
  return { id: P.id, hv, lv, tel, crossHV, lamp, dropFrom, localPt, extraWires, F };
}

/** Sagging polyline between two points. */
export function sagPts(a, b, sag, n = 8) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

function tubeBetweenLocal(a, b, r, seg = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  return g;
}
