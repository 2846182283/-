/**
 * people/rig — anime body proportions, the bone hierarchy, and posing helpers.
 *
 * Rest pose: standing straight, arms hanging in a slight A, facing +Z, feet
 * on y = 0.  Every bone's rest rotation is identity, so a bone's local axes
 * equal the model axes at rest; pose by setting Euler angles (radians):
 *   thigh.x < 0 swings a leg forward, shin.x > 0 bends the knee,
 *   upperArm.x < 0 raises an arm forward, upperArm.z > 0 lifts the LEFT (+X) arm sideways,
 *   spine/chest.x > 0 bends forward, head.y turns the head to its left.
 *
 * Posing is two-level: build-time "base" rotations (commit() stores them) and
 * per-frame additive deltas (delta()) for idle / walk animation, allocation-free.
 */
import * as THREE from 'three';

/** Per-body-type parameters. Widths are for H = 1.56 and scale with height. */
const KINDS = {
  //          head R  neck  legFrac  shoulder  waist  hips  bust  limb   depth
  girl: { R: 0.098, neck: 0.05, leg: 0.64, sh: 1.0, wa: 1.0, hi: 1.0, bu: 1.0, li: 1.0, de: 1.0 },
  woman: { R: 0.096, neck: 0.055, leg: 0.63, sh: 1.02, wa: 1.05, hi: 1.05, bu: 1.08, li: 1.02, de: 1.03 },
  boy: { R: 0.098, neck: 0.06, leg: 0.63, sh: 1.14, wa: 1.12, hi: 0.93, bu: 0.85, li: 1.08, de: 1.0 },
  man: { R: 0.097, neck: 0.065, leg: 0.615, sh: 1.2, wa: 1.22, hi: 0.95, bu: 0.9, li: 1.15, de: 1.08 },
  child: { R: 0.1, neck: 0.03, leg: 0.52, sh: 0.95, wa: 1.25, hi: 1.02, bu: 0.8, li: 1.1, de: 1.12 },
  elderF: { R: 0.094, neck: 0.045, leg: 0.6, sh: 1.0, wa: 1.3, hi: 1.12, bu: 1.0, li: 1.08, de: 1.15 },
  elderM: { R: 0.096, neck: 0.055, leg: 0.6, sh: 1.12, wa: 1.3, hi: 1.0, bu: 0.95, li: 1.1, de: 1.15 },
};

/**
 * Body landmarks in rest-pose model space.
 * @param {string} kind  key of KINDS
 * @param {number} H     total height (m) incl. hair
 */
export function proportions(kind, H) {
  const k = KINDS[kind];
  const s = kind === 'child' ? H / 1.25 : H / 1.56; // width scale
  const R = k.R * (kind === 'child' ? 0.96 : Math.pow(H / 1.56, 0.35));
  const cy = H - R * 1.03 - 0.008; // cranium centre
  const chinY = cy - R * 1.2;
  const neckTop = cy - R * 0.7;
  const neckBase = chinY - k.neck * s * 0.8;
  const shoulderY = neckBase - 0.03 * s;
  const hipJ = shoulderY * k.leg;
  const trunk = shoulderY - hipJ;
  const P = {
    kind, H, s, R, cy, cz: 0.012 * s, chinY, neckTop, neckBase, shoulderY, hipJ, trunk,
    waistY: hipJ + trunk * 0.42,
    chestY: hipJ + trunk * 0.78,
    hipsY: hipJ + 0.04 * s,
    crotchY: hipJ - 0.065 * s,
    kneeY: hipJ * 0.55,
    ankleY: 0.072 * Math.min(1, s * 1.05),
    shX: 0.165 * s * k.sh,
    hipX: 0.083 * s * Math.sqrt(k.hi),
    upperArm: trunk * 0.56,
    foreArm: trunk * 0.5,
    hand: R * 1.45,
    limb: k.li * s,
    k,
  };
  P.elbowY = shoulderY - P.upperArm;
  P.wristY = P.elbowY - P.foreArm;
  // torso cross-sections (crotch .. neck base): y, rx, rz(back), rzf(front), z
  const w = s;
  P.torso = [
    { y: P.crotchY - 0.01, rx: 0.1 * w * k.hi, rz: 0.075 * w * k.de, z: -0.005 },
    { y: P.crotchY + 0.03, rx: 0.13 * w * k.hi, rz: 0.088 * w * k.de, z: -0.008 },
    { y: P.hipsY, rx: 0.15 * w * k.hi, rz: 0.1 * w * k.de, rzb: 0.108 * w * k.de * (kind === 'girl' || kind === 'woman' ? 1.05 : 1), z: -0.01 },
    { y: P.waistY, rx: 0.106 * w * k.wa, rz: 0.076 * w * k.de * Math.sqrt(k.wa), z: 0 },
    { y: hipJ + trunk * 0.64, rx: 0.118 * w * (k.wa * 0.5 + k.sh * 0.5), rz: 0.082 * w * k.de, z: 0.004 },
    { y: P.chestY, rx: 0.128 * w * k.sh, rz: 0.085 * w * k.de, rzf: 0.09 * w * k.bu * k.de, z: 0.006 },
    { y: hipJ + trunk * 0.9, rx: 0.14 * w * k.sh, rz: 0.08 * w * k.de, z: 0.0 },
    { y: shoulderY + 0.012 * s, rx: 0.132 * w * k.sh, rz: 0.066 * w * k.de, z: -0.008 },
    { y: neckBase - 0.004, rx: 0.075 * w * Math.sqrt(k.sh), rz: 0.05 * w, z: -0.012 },
    { y: neckBase + 0.012, rx: 0.042 * w, rz: 0.04 * w, z: -0.01 },
  ];
  return P;
}

/**
 * Create the bone hierarchy for a body.  extra: [[name, parent, x, y, z], ...]
 * Returns { root, bones, list, index, rest }.
 */
export function makeRig(P, extra = []) {
  const defs = [
    ['root', null, 0, 0, 0],
    ['hips', 'root', 0, P.hipJ + 0.03 * P.s, 0],
    ['spine', 'hips', 0, P.waistY, 0],
    ['chest', 'spine', 0, P.chestY, 0],
    ['neck', 'chest', 0, P.neckBase, -0.01],
    ['head', 'neck', 0, P.neckTop, 0],
    ['hair1', 'head', 0, P.cy + P.R * 0.25, -P.R * 0.95],
    ['hair2', 'hair1', 0, P.cy - P.R * 0.95, -P.R * 1.15],
  ];
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    defs.push([`upperArm_${sd}`, 'chest', sx * P.shX, P.shoulderY, -0.012]);
    defs.push([`foreArm_${sd}`, `upperArm_${sd}`, sx * (P.shX + 0.028 * P.s), P.elbowY, -0.02]);
    defs.push([`hand_${sd}`, `foreArm_${sd}`, sx * (P.shX + 0.042 * P.s), P.wristY, -0.005]);
    defs.push([`thigh_${sd}`, 'hips', sx * P.hipX, P.hipJ, 0]);
    defs.push([`shin_${sd}`, `thigh_${sd}`, sx * P.hipX * 0.88, P.kneeY, 0.004]);
    defs.push([`foot_${sd}`, `shin_${sd}`, sx * P.hipX * 0.82, P.ankleY, -0.006]);
  }
  defs.push(...extra);
  const bones = {}, list = [], index = {}, rest = {};
  for (const [name, parent, x, y, z] of defs) {
    const b = new THREE.Bone();
    b.name = name;
    rest[name] = new THREE.Vector3(x, y, z);
    if (parent) {
      b.position.set(x, y, z).sub(rest[parent]);
      bones[parent].add(b);
    }
    bones[name] = b;
    index[name] = list.length;
    list.push(b);
  }
  return { root: bones.root, bones, list, index, rest };
}

// ---------------------------------------------------------------------------
// posing
// ---------------------------------------------------------------------------
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _u = new THREE.Vector3();
const _n = new THREE.Vector3();
const _S = new THREE.Vector3();
const _E = new THREE.Vector3();
const _U = new THREE.Vector3();
const _El = new THREE.Vector3();

export class Poser {
  constructor(rig, object) {
    this.rig = rig;
    this.object = object;
    this.base = {};
    for (const name of Object.keys(rig.bones)) this.base[name] = new THREE.Quaternion();
  }
  /** Set a bone's base rotation from Euler angles (XYZ order) — overwrites. */
  set(name, x = 0, y = 0, z = 0) {
    this.rig.bones[name].rotation.set(x, y, z);
    return this;
  }
  /** Add a rotation on top of the bone's current rotation (build time). */
  turn(name, x = 0, y = 0, z = 0) {
    const b = this.rig.bones[name];
    _e.set(x, y, z);
    b.quaternion.multiply(_q.setFromEuler(_e));
    return this;
  }
  /** Store the current pose as the base for per-frame deltas. */
  commit() {
    for (const [name, b] of Object.entries(this.rig.bones)) this.base[name].copy(b.quaternion);
    return this;
  }
  /** Per-frame: bone = base * euler(x, y, z).  Allocation-free. */
  delta(name, x = 0, y = 0, z = 0) {
    const b = this.rig.bones[name];
    _e.set(x, y, z);
    b.quaternion.copy(this.base[name]).multiply(_q.setFromEuler(_e));
  }
  /** Reset a bone to its base rotation. */
  reset(name) { this.rig.bones[name].quaternion.copy(this.base[name]); }

  updateWorld() { this.object.updateWorldMatrix(true, true); }

  /**
   * Two-bone IK: aim upper/lower (e.g. upperArm_L / foreArm_L) so the end joint
   * (child of lower, e.g. hand_L) reaches the world-space target.
   * pole: world-space direction the middle joint (elbow / knee) should bend toward.
   * roll: extra twist of the upper bone about its own axis.
   */
  ik(upper, lower, end, target, pole, roll = 0) {
    const R = this.rig.rest;
    const bu = this.rig.bones[upper], bl = this.rig.bones[lower];
    const L1 = R[upper].distanceTo(R[lower]);
    const L2 = R[lower].distanceTo(R[end]);
    this.updateWorld();
    bu.getWorldPosition(_S);
    _d.subVectors(target, _S);
    let dist = _d.length();
    dist = THREE.MathUtils.clamp(dist, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    _d.normalize();
    _E.copy(_S).addScaledVector(_d, dist); // reachable end point
    // bend plane: contains d and the pole direction
    _n.crossVectors(_d, pole);
    if (_n.lengthSq() < 1e-8) _n.set(1, 0, 0);
    _n.normalize();
    const cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    const A = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
    // rotate d toward the pole by A about n  (world direction of the upper bone)
    _U.copy(_d).applyAxisAngle(_n, -A);
    if (_U.dot(pole) < _d.dot(pole)) _U.copy(_d).applyAxisAngle(_n, A);
    _El.copy(_S).addScaledVector(_U, L1);
    this._aim(bu, R[upper], R[lower], _U, roll);
    this.updateWorld();
    _b.subVectors(_E, _El).normalize();
    this._aim(bl, R[lower], R[end], _b, 0);
    this.updateWorld();
  }

  /** Aim a bone so its rest direction (from -> to) points along world direction dir. */
  _aim(bone, from, to, dir, roll) {
    const restDir = _a.subVectors(to, from).normalize();
    bone.parent.getWorldQuaternion(_q2);
    const local = _u.copy(dir).applyQuaternion(_q2.invert()).normalize();
    bone.quaternion.setFromUnitVectors(restDir, local);
    if (roll) bone.quaternion.premultiply(_q.setFromAxisAngle(local, roll));
  }

  /** Aim a single bone (e.g. head / upper arm) at a world point (rest direction from -> to). */
  aim(name, fromRest, toRest, targetWorld) {
    const b = this.rig.bones[name];
    this.updateWorld();
    const p = b.getWorldPosition(_c);
    _d.subVectors(targetWorld, p).normalize();
    this._aim(b, fromRest, toRest, _d, 0);
    this.updateWorld();
  }
}

/** Smooth 1D value noise in [-1, 1] (deterministic, allocation-free). */
export function vnoise(t, seed = 0) {
  const i = Math.floor(t);
  const f = t - i;
  const h = (n) => {
    const x = Math.sin((n + seed * 17.13) * 127.1) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

