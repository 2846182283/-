/**
 * railway/turnouts.js — the scenic crossover west of the station (RAIL.turnouts
 * T1 on track A, T2 on track B).  The crossover is point-symmetric about its
 * centre, so one half (T1: switch blades, closure rail, frog, check rails,
 * point machine, switch indicator, tie plates) is built and then copied with
 * a 180° rotation to make T2.
 *
 * Trains never take the diverging route; the switches are set "normal"
 * (straight blade closed, curved blade open ~11 cm).
 */
import * as THREE from 'three';
import { RAIL } from '../../core/layout.js';
import { TRK, Buckets, jitter, mtx } from './common.js';
import { addRail, addJoint } from './track.js';

const RO = TRK.railOff;

/** Geometry of the crossover path (computed once). */
export function crossoverPlan() {
  const t1 = RAIL.turnouts.find((t) => t.id === 'T1');
  const t2 = RAIL.turnouts.find((t) => t.id === 'T2');
  if (!t1 || !t2) return null;
  const xs = Math.min(t1.xSwitch, t2.xSwitch), xe = Math.max(t1.xSwitch, t2.xSwitch);
  const first = t1.xSwitch <= t2.xSwitch ? t1 : t2;
  const zS = TRK.byId[first.track].z;
  const zE = TRK.byId[first.divergesTo].z;
  const plan = { xs, xe, zS, zE, xc: (xs + xe) / 2, zc: (zS + zE) / 2, sigma: Math.sign(zE - zS), first };
  const L = xe - xs;
  plan.f = (x) => { const u = THREE.MathUtils.clamp((x - xs) / L, 0, 1); return zS + (zE - zS) * u * u * (3 - 2 * u); };
  plan.df = (x) => { const u = THREE.MathUtils.clamp((x - xs) / L, 0, 1); return ((zE - zS) * 6 * u * (1 - u)) / L; };
  /** point on the path offset laterally by d (d > 0 toward +z) */
  plan.offset = (x, d) => {
    const s = plan.df(x), n = Math.hypot(1, s);
    return { x: x - (s * d) / n, z: plan.f(x) + d / n };
  };
  // frog: where the crossing rail (offset -sigma*RO) meets the through rail at zS + sigma*RO
  const target = zS + plan.sigma * RO;
  let a = xs, b = plan.xc;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    const z = plan.offset(m, -plan.sigma * RO).z;
    if (plan.sigma * (z - target) < 0) a = m; else b = m;
  }
  plan.frogX = (a + b) / 2;
  plan.frogAngle = Math.atan(plan.df(plan.frogX));
  // span covered by long turnout timbers
  plan.span = [xs - 2.2, xe + 2.2];
  return plan;
}

/** Polyline along an offset of the path from x0 to x1. */
function offsetPath(plan, d, x0, x1, step = 0.5) {
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(plan.offset(x0 + ((x1 - x0) * i) / n, d));
  return pts;
}

/** Long timbers (instanced by track.js together with the sleepers). */
export function crossoverTimbers(plan, rng) {
  const out = [];
  const len = Math.abs(plan.zE - plan.zS) + 2.55;
  for (let x = plan.span[0] + 0.31; x < plan.span[1]; x += RAIL.sleeperSpacing) {
    // the two timbers at each switch toe are longer: they carry the point machine
    const nearToe = Math.abs(x - plan.xs) < 0.7 || Math.abs(x - plan.xe) < 0.7;
    let l = len, zc = plan.zc;
    if (nearToe) {
      const toward = Math.abs(x - plan.xs) < 0.7 ? -plan.sigma : plan.sigma; // machine side
      l = len + 0.75;
      zc += toward * 0.375;
    }
    out.push({ x: x + (rng() - 0.5) * 0.03, z: zc, len: l, ry: (rng() - 0.5) * 0.01, color: jitter(rng() < 0.7 ? '#7a6252' : '#6a5647', rng, 0.03) });
  }
  return out;
}

/** Build the rails + hardware of one half (the T1 end) into K.B. */
function buildHalf(K, plan) {
  const { xs, xc, zS, sigma, frogX } = plan;
  const B = K.B;
  const Lb = 6.5; // switch blade length
  const stockOpp = zS - sigma * RO; // stock rail on the far side (the curved blade lies against it)
  const stockNear = zS + sigma * RO; // through rail crossed by the frog
  const dCross = -sigma * RO, dNon = sigma * RO;

  // --- curved switch blade + closure rail up to the frog -----------------
  const pts = offsetPath(plan, dCross, xs, frogX - 0.32, 0.4);
  const clampZ = stockOpp + sigma * 0.067;
  const shapes = pts.map((p) => {
    const t = THREE.MathUtils.clamp((p.x - xs) / Lb, 0, 1);
    // keep the blade inside the stock rail, then open it by up to 11 cm (switch set normal)
    if (sigma * (p.z - clampZ) < 0) p.z = clampZ;
    const open = 0.11 * Math.pow(1 - t, 1.4);
    p.z += sigma * open;
    const s = 0.28 + 0.72 * THREE.MathUtils.smoothstep(t, 0, 0.5);
    return { s, o: -sigma * 0.066 * (1 - s) }; // keep the stock-facing side flush
  });
  addRail(K, pts, (j) => shapes[j]);
  // heel joint of the blade
  const heel = plan.offset(xs + Lb, dCross);
  addJoint(K, heel.x, heel.z, -sigma);

  // --- crossing rail beyond the frog to the middle --------------------------
  addRail(K, offsetPath(plan, dCross, frogX + 0.32, xc, 0.5));

  // --- non-crossing rail: emerges from the through rail and runs to the middle
  let xEm = xs;
  while (xEm < xc && Math.abs(plan.offset(xEm, dNon).z - stockNear) < 0.068) xEm += 0.05;
  addRail(K, offsetPath(plan, dNon, xEm, xc, 0.5));

  // --- straight blade, closed against the near stock rail (gauge side) ------
  {
    const zb = stockNear - sigma * 0.067;
    const p = [];
    for (let i = 0; i <= 12; i++) p.push({ x: xs + (Lb * i) / 12, z: zb });
    addRail(K, p, (j) => {
      const t = j / 12;
      const s = 0.28 + 0.72 * THREE.MathUtils.smoothstep(t, 0, 0.5);
      return { s, o: sigma * 0.066 * (1 - s) };
    });
  }

  // --- frog (crossing nose casting) ----------------------------------------
  {
    const ang = plan.frogAngle / 2; // along the bisector
    B.box('rail', 2.3, 0.13, 0.2, '#7c6f67', frogX + 0.2, 0.378, stockNear + sigma * 0.02, -ang);
    B.box('rail', 1.6, 0.006, 0.09, '#dfe2e6', frogX + 0.45, 0.447, stockNear + sigma * 0.02, -ang);
    // wing rail flare
    B.box('rail', 1.4, 0.1, 0.05, '#77675d', frogX - 0.6, 0.39, stockNear - sigma * 0.1, -plan.frogAngle * 0.3);
  }

  // --- check rails opposite the frog ----------------------------------------
  {
    const zc = stockOpp + sigma * (0.066 + 0.044);
    const p = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const flare = Math.pow(Math.abs(t - 0.5) * 2, 4) * 0.05;
      p.push({ x: frogX - 2 + 4 * t, z: zc + sigma * flare });
    }
    addRail(K, p);
    const q = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const flare = Math.pow(Math.abs(t - 0.5) * 2, 4) * 0.05;
      q.push(plan.offset(frogX - 2 + 4 * t, sigma * (RO - 0.11 - flare)));
    }
    addRail(K, q);
  }

  // --- point machine, rods, switch indicator -------------------------------
  {
    const mz = stockOpp - sigma * 0.98; // outside the far stock rail, on the extended timbers
    const mx = xs + 0.3;
    B.block('vc', 1.25, 0.06, 0.62, '#8f8b84', mx, 0.31, mz); // mounting plate on the long timbers
    B.block('steel', 1.15, 0.26, 0.42, '#b9beb2', mx, 0.37, mz);
    B.box('steel', 1.19, 0.05, 0.46, '#9ea596', mx, 0.655, mz); // lid
    B.box('steel', 0.3, 0.04, 0.2, '#7f877c', mx - 0.3, 0.7, mz); // lid handle boss
    B.box('vcSmall', 0.01, 0.1, 0.3, '#e2b93a', mx + 0.58, 0.5, mz); // yellow caution band on the end
    B.box('vcSmall', 0.012, 0.1, 0.05, '#2c2c30', mx + 0.583, 0.5, mz - 0.06);
    B.box('vcSmall', 0.012, 0.1, 0.05, '#2c2c30', mx + 0.583, 0.5, mz + 0.06);
    // throw rod + detector rod running under the rails to the blade tips
    const zIn = zS + sigma * (RO + 0.25);
    for (const [dx, y, c] of [[0.34, 0.345, '#55585e'], [0.62, 0.34, '#6a6d72']]) {
      B.box('steelSmall', 0.045, 0.03, Math.abs(zIn - mz), c, xs + dx, y, (zIn + mz) / 2);
    }
    // cable to the trough at the corridor edge
    const edge = sigma < 0 ? RAIL.corridor.zMax - 1.9 : RAIL.corridor.zMin + 1.9;
    B.tube('vcSmall', { x: mx + 0.5, y: 0.38, z: mz }, { x: mx + 0.9, y: 0.05, z: mz - sigma * 0.4 }, 0.02, '#26282c', 5);
    B.tube('vcSmall', { x: mx + 0.9, y: 0.05, z: mz - sigma * 0.4 }, { x: mx + 1.2, y: 0.05, z: edge }, 0.02, '#26282c', 5);
    // switch indicator (転てつ器標識): post with a lamp box & a direction disc
    const ix = xs - 1.6, iz = stockOpp - sigma * 1.4;
    B.block('vc', 0.36, 0.1, 0.36, '#bdb9b0', ix, 0, iz);
    B.cyl('steel', 0.035, 0.035, 1.05, '#6b7078', ix, 0.1, iz, 8);
    B.box('steel', 0.24, 0.24, 0.24, '#3a3d42', ix, 1.27, iz);
    B.box('vcSmall', 0.012, 0.16, 0.16, '#f4f2ea', ix + 0.126, 1.27, iz);
    B.box('vcSmall', 0.014, 0.04, 0.16, '#2a2a2e', ix + 0.128, 1.27, iz);
    B.box('vcSmall', 0.012, 0.16, 0.16, '#f4f2ea', ix - 0.126, 1.27, iz);
    B.box('vcSmall', 0.014, 0.04, 0.16, '#2a2a2e', ix - 0.128, 1.27, iz);
    K.pointMachines.push({ x: mx, z: mz, sigma });
  }

  // --- tie plates on the long timbers --------------------------------------
  for (const t of K.timbers) {
    if (t.x > xc) continue;
    const zs = [];
    for (const tr of [TRK.A, TRK.B]) for (const s of [-1, 1]) zs.push([tr.z + s * RO, 0]);
    if (t.x > xs - 0.1) {
      if (t.x < frogX - 0.3 || t.x > frogX + 0.3) {
        const p = plan.offset(t.x, dCross);
        zs.push([p.z, plan.df(t.x)]);
      }
      const q = plan.offset(t.x, dNon);
      if (Math.abs(q.z - stockNear) > 0.2) zs.push([q.z, plan.df(t.x)]);
    }
    for (const [z, slope] of zs) B.box('steelSmall', 0.2, 0.014, 0.36, '#55565b', t.x, 0.312, z, -Math.atan(slope));
  }
}

/** Build both turnouts. */
export function buildTurnouts(K, plan) {
  if (!plan) return;
  const tmp = new Buckets(K.geom);
  for (const key of K.B.lists.keys()) tmp.define(key, null);
  const tmpK = { ...K, B: tmp };
  buildHalf(tmpK, plan);
  const mirror = new THREE.Matrix4()
    .makeTranslation(plan.xc, 0, plan.zc)
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
    .multiply(new THREE.Matrix4().makeTranslation(-plan.xc, 0, -plan.zc));
  for (const [key, list] of tmp.lists) {
    for (const g of list) {
      K.B.add(key, g, null);
      K.B.add(key, g.clone().applyMatrix4(mirror), null);
    }
  }
  // mirrored point machine record (used by trackside for the number plate)
  const pm = K.pointMachines[K.pointMachines.length - 1];
  if (pm) K.pointMachines.push({ x: 2 * plan.xc - pm.x, z: 2 * plan.zc - pm.z, sigma: -pm.sigma });
}

export default { crossoverPlan, crossoverTimbers, buildTurnouts };
