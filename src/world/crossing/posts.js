/**
 * crossing/posts.js — the four crossing units at the corners of the road.
 *
 * Every corner gets a 警報機 (warning post): tiger-striped pole, 踏切警標
 * crossbuck, 全方向閃光灯 (omni lamp) on top, alarm speaker, double-sided
 * twin red flashing lamps with hoods and black back plates, 列車進行方向指示器
 * (direction indicator), とまれみよ plate, 非常ボタン (emergency button), the
 * crossing name plate and a cable conduit.  The two corners on the LEFT of
 * each approach (keep-left traffic: south-west, north-east) also carry the
 * 遮断機 (barrier machine housing, hub and boom mount); the boom itself is
 * dynamic (see barrier.js).
 *
 * Static geometry goes into kit buckets; dynamic lamp lenses / arrows / booms
 * are returned as placement lists for the animated meshes.
 */
import * as THREE from 'three';
import { CROSSING } from '../../core/layout.js';
import { regionUV, solidUV } from './kit.js';

export const POST = {
  r: 0.083,
  stripeTop: 3.24,
  top: 3.6,
  xCenterY: 3.22,
  xArmLen: 1.24,
  xArmW: 0.2,
  xAngle: 0.62, // arm angle from horizontal
  lampY: 2.42,
  lampDX: 0.33,
  lampR: 0.135,
  indY: 2.03,
  speakerY: 2.74,
  offsetX: 3.55, // from the road centreline
  // barrier machine (local frame of the post: +z = approach side, road at local +x)
  hubY: 0.98,
  boomZ: 0.62,
};

/** Corner definitions. face: +1 = the unit's front faces +z (south approach). */
export function cornerUnits() {
  const X0 = CROSSING.x;
  return [
    { id: 'SW', x: X0 - POST.offsetX, z: CROSSING.zSouth, face: 1, road: 1, machine: true },
    { id: 'SE', x: X0 + POST.offsetX, z: CROSSING.zSouth, face: 1, road: -1, machine: false },
    { id: 'NW', x: X0 - POST.offsetX, z: CROSSING.zNorth, face: -1, road: -1, machine: false },
    { id: 'NE', x: X0 + POST.offsetX, z: CROSSING.zNorth, face: -1, road: 1, machine: true },
  ].map((u) => ({ ...u, ry: u.face > 0 ? 0 : Math.PI }));
}

/** Copy of g with reversed winding & flipped normals merged in (for open shells like hoods). */
function doubleSided(g) {
  const back = g.clone();
  const idx = back.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const n = back.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  const out = new THREE.BufferGeometry();
  const merged = [g, back];
  const pos = [], nor = [], uv = [], ind = [];
  let off = 0;
  for (const m of merged) {
    pos.push(...m.attributes.position.array);
    nor.push(...m.attributes.normal.array);
    uv.push(...(m.attributes.uv ? m.attributes.uv.array : new Float32Array(m.attributes.position.count * 2)));
    for (const i of m.index.array) ind.push(i + off);
    off += m.attributes.position.count;
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(ind);
  return out;
}

/** Lamp head (back plate, rim, hood) on one side (s = +1 front, -1 back) at local lx. */
function lampHead(f, lx, y, s, lamps, unit, group) {
  const P = POST;
  const zPlate = s * 0.035;
  // round black back plate with a thin grey rim (both grow outward from the bar)
  f.cyl('vc', 0.225, 0.225, 0.03, '#232428', lx, y, s * 0.02, 20, { rx: s * Math.PI / 2 });
  f.cyl('vcS', 0.232, 0.232, 0.012, '#6c6f76', lx, y, s * 0.017, 20, { rx: s * Math.PI / 2 });
  // lens rim (short tube) + hood over the top half
  f.cyl('vc', P.lampR + 0.02, P.lampR + 0.02, 0.05, '#1d1e22', lx, y, zPlate, 18, { rx: s * Math.PI / 2 });
  const hood = new THREE.CylinderGeometry(P.lampR + 0.035, P.lampR + 0.035, 0.2, 16, 1, true, Math.PI / 2, Math.PI);
  hood.translate(0, 0.1, 0);
  hood.rotateX(Math.PI / 2); // axis along +z, open half facing down
  if (s < 0) hood.rotateY(Math.PI);
  f.geo('vc', doubleSided(hood), '#1d1e22', lx, y, zPlate + s * 0.02);
  // lens placement (dynamic)
  const p = f.p(lx, y, zPlate + s * 0.05);
  const n = f.p(lx, y, zPlate + s * 1.05).sub(p).normalize();
  lamps.push({ pos: p, normal: n, r: P.lampR, depth: 0.45, group, unit: unit.id, glow: s > 0 ? 1.0 : 0.9 });
}

/** Crossbuck (踏切警標): two striped arms, printed on both faces, with a centre clamp. */
function crossbuck(kit, f) {
  const P = POST;
  const R = kit.R;
  for (const a of [P.xAngle, -P.xAngle]) {
    f.box('vc', P.xArmLen, P.xArmW, 0.03, '#26262a', 0, P.xCenterY, 0.13, { rz: a });
    for (const s of [1, -1]) {
      const g = regionUV(new THREE.PlaneGeometry(P.xArmLen - 0.01, P.xArmW - 0.01), R.xArm, { flipU: s < 0 });
      kit.add('atlasS', g, '#fff', f.m(0, P.xCenterY, 0.13 + s * 0.0165, 0, s > 0 ? 0 : Math.PI, s > 0 ? a : -a));
    }
  }
  // clamp plate + bolts
  f.box('metal', 0.14, 0.14, 0.05, '#3a3c42', 0, P.xCenterY, 0.09);
  f.box('metal', 0.2, 0.05, 0.1, '#3a3c42', 0, P.xCenterY, 0.04);
}

/** Alarm speaker (警報音発生器): box with a grille face and a short rain hood. */
function speaker(kit, f) {
  const P = POST;
  const y = P.speakerY, z = 0.16;
  f.box('vc', 0.26, 0.24, 0.16, '#3f4148', 0, y, z);
  f.box('vc', 0.3, 0.025, 0.2, '#35373d', 0, y + 0.13, z + 0.02);
  kit.add('atlas', regionUV(new THREE.PlaneGeometry(0.22, 0.2), kit.R.grille), '#fff', f.m(0, y, z + 0.081));
  f.box('metal', 0.06, 0.06, 0.1, '#35373d', 0, y, 0.05);
}

/** 列車進行方向指示器: black box with arrow windows (arrows are dynamic). */
function indicator(kit, f, arrows, unit) {
  const P = POST;
  const z = 0.15;
  f.box('vc', 0.58, 0.21, 0.12, '#1f2024', 0, P.indY, z);
  f.box('vc', 0.62, 0.025, 0.16, '#26272c', 0, P.indY + 0.115, z + 0.02); // rain visor
  kit.add('atlasS', regionUV(new THREE.PlaneGeometry(0.56, 0.19), kit.R.indicator), '#fff', f.m(0, P.indY, z + 0.061));
  f.box('metal', 0.08, 0.08, 0.08, '#35373d', 0, P.indY, 0.06);
  for (const side of [-1, 1]) {
    const m = f.m(side * 0.15, P.indY, z + 0.064);
    arrows.push({ matrix: m, side, unit: unit.id, face: unit.face });
  }
}

/** Plates on the post: とまれみよ (front), name plate + emergency button (road side), bicycle notice. */
function plates(kit, f, unit) {
  const P = POST;
  const R = kit.R;
  // とまれ みよ (front)
  f.box('vc', 0.5, 0.17, 0.02, '#1c1d21', 0, 1.74, 0.105);
  f.plane(R.tomare, 0.48, 0.155, 0, 1.74, 0.1165);
  f.box('metal', 0.05, 0.05, 0.03, '#2f3136', 0, 1.74, 0.085);
  // road side: name plate + emergency button box
  const rs = unit.road; // local x of the road side
  const sx = rs * (P.r + 0.012);
  const ry = rs > 0 ? Math.PI / 2 : -Math.PI / 2;
  // (on machine corners the housing sits in front of the pole: shift the plate back)
  const nz = unit.machine ? -0.1 : 0, nw = unit.machine ? 0.36 : 0.46;
  f.box('vc', 0.02, 0.13, nw, '#f2f1ea', sx, 0.86, nz);
  f.plane(R.name, nw - 0.02, 0.11, sx + rs * 0.0105, 0.86, nz, ry);
  const bx = rs * (P.r + 0.06);
  f.box('vc', 0.1, 0.32, 0.22, '#f0c030', bx, 1.3, 0);
  f.plane(R.emergency, 0.2, 0.3, bx + rs * 0.0505, 1.3, 0, ry);
  f.cyl('vc', 0.042, 0.046, 0.04, '#d8433d', bx + rs * 0.05, 1.3 + 0.3 * 0.02, 0, 16, { rz: -rs * Math.PI / 2 });
  // clear flip cover (glass-ish, tiny)
  f.box('vcS', 0.03, 0.12, 0.12, '#dfe9ef', bx + rs * 0.085, 1.305, 0);
  if (!unit.machine) {
    // bicycle notice on the front
    f.box('vc', 0.3, 0.42, 0.02, '#f2f1ea', 0, 1.33, 0.105);
    f.plane(R.pushBike, 0.28, 0.4, 0, 1.33, 0.1165);
  }
}

/** Barrier machine housing (遮断機本体), hub and boom mount; returns the boom pivot. */
function machine(kit, f, unit) {
  const P = POST;
  const R = kit.R;
  const zc = 0.34;
  // concrete plinth under post + machine
  f.block('vc', 0.72, 0.12, 0.66, '#c7c4bb', 0.02, -0.02, 0.18);
  // body
  f.block('vc', 0.44, 1.12, 0.34, '#d6d2c5', 0, 0.1, zc);
  f.block('vc', 0.48, 0.05, 0.38, '#bdb9ad', 0, 0.1, zc); // foot flange
  // rounded top cap (half cylinder along x)
  const cap = new THREE.CylinderGeometry(0.17, 0.17, 0.44, 14, 1, false, 0, Math.PI);
  cap.rotateZ(Math.PI / 2);
  f.geo('vc', cap, '#e2ba35', 0, 1.22, zc);
  // printed front (approach side) and road side
  f.plane(R.machineFront, 0.4, 0.98, 0, 0.64, zc + 0.172, 0, 'atlasS');
  f.plane(R.machineFront, 0.3, 0.98, 0.222, 0.64, zc, Math.PI / 2, 'atlasS');
  // hub (drive shaft housing) toward the boom plane
  f.cyl('metal', 0.1, 0.1, P.boomZ - zc - 0.1, '#4a4d54', 0, P.hubY, zc + 0.12, 18, { rx: Math.PI / 2 });
  f.cyl('metal', 0.06, 0.06, 0.06, '#8e939a', 0, P.hubY, P.boomZ - 0.06, 12, { rx: Math.PI / 2 });
  // name/maker tag and warning sticker on the cap
  f.box('vcS', 0.12, 0.05, 0.005, '#f7f6f1', -0.1, 1.1, zc + 0.173);
  // cable gland at the bottom rear
  f.cyl('vc', 0.04, 0.04, 0.2, '#2a2b30', -0.12, 0.05, zc - 0.17, 8, { rx: Math.PI / 2 });
  return { pivot: f.p(0, P.hubY, P.boomZ + 0.02), ry: unit.ry };
}

/**
 * Build all four corner units.  Returns { lamps, arrows, booms } placement lists.
 */
export function buildPosts(kit) {
  const P = POST;
  const R = kit.R;
  const lamps = [];
  const arrows = [];
  const booms = [];
  for (const unit of cornerUnits()) {
    const f = kit.frame(unit.x, 0, unit.z, unit.ry);
    // foundation
    if (!unit.machine) f.block('vc', 0.5, 0.12, 0.5, '#c7c4bb', 0, -0.02, 0);
    f.cyl('metal', 0.13, 0.14, 0.05, '#34363b', 0, 0.1, 0, 16);
    // striped pole + plain upper part
    const pole = new THREE.CylinderGeometry(P.r, P.r, P.stripeTop - 0.15, 20, 1, false);
    pole.translate(0, (P.stripeTop - 0.15) / 2, 0);
    regionUV(pole, R.postStripe);
    kit.add('atlas', pole, '#fff', f.m(0, 0.15, 0));
    f.cyl('metal', P.r * 0.85, P.r, P.top - P.stripeTop, '#2c2d31', 0, P.stripeTop, 0, 16);
    // omni lamp (全方向閃光灯): black base, red dome (dynamic lens), finial
    f.cyl('metal', 0.1, 0.1, 0.07, '#232428', 0, P.top, 0, 16);
    f.cyl('vc', 0.108, 0.108, 0.1, '#6d1712', 0, P.top + 0.07, 0, 16);
    lamps.push({ pos: f.p(0, P.top + 0.17, 0), normal: new THREE.Vector3(0, 1, 0), r: 0.106, depth: 1.25, group: 'omni', unit: unit.id, glow: 0.7, omni: true });
    // devices
    crossbuck(kit, f);
    speaker(kit, f);
    // lamp bar through the post, double-sided twin lamps
    f.box('metal', P.lampDX * 2 + 0.12, 0.07, 0.07, '#26272b', 0, P.lampY, 0);
    f.box('metal', 0.14, 0.16, 0.12, '#2a2b30', 0, P.lampY, 0); // clamp
    for (const [lx, group] of [[-P.lampDX, 'A'], [P.lampDX, 'B']]) {
      for (const s of [1, -1]) lampHead(f, lx, P.lampY, s, lamps, unit, group);
    }
    indicator(kit, f, arrows, unit);
    plates(kit, f, unit);
    // cable conduit up the back of the pole
    f.cyl('vcS', 0.022, 0.022, P.lampY - 0.1, '#2b2c31', 0, 0.12, -P.r - 0.02, 6);
    for (let y = 0.5; y < P.lampY; y += 0.55) f.box('vcS', 0.07, 0.025, 0.05, '#8e939a', 0, y, -P.r - 0.01);
    if (unit.machine) booms.push({ ...machine(kit, f, unit), unit: unit.id, face: unit.face });
    kit.ctx.addCollider(unit.x - 0.3, unit.x + 0.3, unit.z - 0.3, unit.z + 0.3);
  }
  return { lamps, arrows, booms };
}

export { solidUV };
