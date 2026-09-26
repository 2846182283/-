/**
 * railway/catenary.js — overhead line equipment (架空電車線):
 *   - steel pipe masts every RAIL.catenary.poleSpacing on both outer sides,
 *     each with a hinged cantilever (main tube, stay tube, brown rod insulators,
 *     steady arm) over its own track
 *   - near the station: taller lattice portal structures (門型ビーム) spanning both
 *     tracks, with drop tubes and suspension insulators
 *   - an extra portal over the crossover carries the diagonal contact wire
 *   - wires: messenger (sagging), contact wire (level, zig-zag stagger), droppers,
 *     feeder, three distribution conductors on white pin insulators and an
 *     overhead earth wire on every mast — so the lines converge in perspective
 *
 * Wires are thin dark tubes (close-ups) plus 1-px GL lines (so they never
 * vanish in the distance).  Masts carry number plates and high-voltage signs.
 */
import * as THREE from 'three';
import { RAIL } from '../../core/layout.js';
import { TRK, inCrossing } from './common.js';

const C = RAIL.catenary;
const POLE_H = 9.35;
const STEEL = '#8b929a';
const STEEL_D = '#6f767e';
const INS_BROWN = '#8a5a45';
const INS_WHITE = '#ecebe6';

/** Which masts become lattice portals (station area) + the crossover portal. */
export function catenaryPlan(crossover) {
  const xs = [];
  for (let x = C.poleX0; x <= TRK.xMax; x += C.poleSpacing) xs.push(x);
  const portals = new Set(xs.filter((x) => x > -75 && x < 70));
  const extra = [];
  if (crossover) extra.push(Math.round(crossover.xs + (crossover.xe - crossover.xs) * 0.38));
  return { xs, portals, extra };
}

export function buildCatenary(K, crossover) {
  const B = K.B;
  const plan = catenaryPlan(crossover);
  const [zS, zN] = C.poleZ; // south (track A side), north (track B side)
  const sideOf = (pz) => (pz === zS ? TRK.A : TRK.B);
  let plateIdx = 0;

  // support points (per track): x -> {msgY, cwZ}
  const supports = { A: [], B: [] };
  const allX = [...plan.xs, ...plan.extra].sort((a, b) => a - b);
  let stagger = 1;

  for (const x of allX) {
    const isExtra = plan.extra.includes(x);
    const portal = isExtra || plan.portals.has(x);
    for (const pz of [zS, zN]) {
      if (portal) latticeColumn(B, x, pz);
      else pipeMast(B, x, pz);
      K.mastSpots.push({ x, z: pz });
      K.occupy(x, pz, portal ? 0.7 : 0.55);
      const out = Math.sign(pz - TRK.zMid); // outward direction (away from the tracks)
      mastTopFittings(B, x, pz, out, portal);
      // number plate facing the track, high-voltage sign facing outward (walkers)
      K.sign(`pole:${plateIdx++ % K.poleCount}`, 0.2, 0.35, x, 2.25, pz - out * (portal ? 0.24 : 0.17), out > 0 ? Math.PI : 0);
      if (!inCrossing(x, 20) && (portal || Math.abs(x) < 160)) K.sign('warn:hvsmall', 0.28, 0.245, x, 2.75, pz + out * (portal ? 0.24 : 0.17), out > 0 ? 0 : Math.PI);
    }
    stagger = -stagger;
    if (portal) {
      portalBeam(B, x, zS, zN);
      for (const tr of [TRK.A, TRK.B]) {
        portalDrop(K, x, tr.z, stagger);
        supports[tr.id].push({ x, cwZ: tr.z + stagger * 0.2 });
      }
      if (isExtra && crossover) {
        const z = crossover.f(x);
        portalDrop(K, x, z, 0);
        K.crossoverSupport = { x, z };
      }
    } else {
      for (const pz of [zS, zN]) {
        const tr = sideOf(pz);
        cantilever(K, x, pz, tr.z, stagger);
        supports[tr.id].push({ x, cwZ: tr.z + stagger * 0.2 });
      }
    }
  }

  // --- running wires between supports -------------------------------------
  for (const tr of [TRK.A, TRK.B]) {
    const sp = supports[tr.id];
    for (let i = 0; i < sp.length - 1; i++) span(K, sp[i], sp[i + 1], tr.z);
  }
  // crossover wire: from the A contact wire near T1 through the portal to the B wire near T2
  if (crossover && K.crossoverSupport) {
    const s = K.crossoverSupport;
    const a = { x: crossover.xs, cwZ: crossover.zS, msgZ: crossover.zS, msgY: C.messengerY - 0.25 };
    const b = { x: crossover.xe, cwZ: crossover.zE, msgZ: crossover.zE, msgY: C.messengerY - 0.25 };
    const m = { x: s.x, cwZ: s.z, msgZ: s.z, msgY: C.messengerY };
    span(K, a, m, null, 0.18);
    span(K, m, b, null, 0.18);
  }
  // feeder, distribution conductors and earth wire along each mast line
  for (const pz of [zS, zN]) {
    const out = Math.sign(pz - TRK.zMid);
    const lines = [
      { dz: out * 0.95, y: 7.55, r: 0.026, sag: 0.75 }, // feeder (hangs below its bracket)
      { dz: out * 0.95, y: 8.97, r: 0.016, sag: 0.85, noLine: true }, // distribution x3 on the cross-arm
      { dz: out * 0.45, y: 8.97, r: 0.016, sag: 0.85 },
      { dz: -out * 0.55, y: 8.97, r: 0.016, sag: 0.85, noLine: true },
      { dz: 0, y: POLE_H + 0.12, r: 0.012, sag: 0.6 }, // overhead earth wire
    ];
    for (const l of lines) {
      for (let i = 0; i < allX.length - 1; i++) {
        const x0 = allX[i], x1 = allX[i + 1];
        const a = new THREE.Vector3(x0, l.y, pz + l.dz), b = new THREE.Vector3(x1, l.y, pz + l.dz);
        K.wire(K.geom.catenaryPoints(a, b, l.sag * ((x1 - x0) / C.poleSpacing) ** 2, 12), l.r, 3, !!l.noLine);
      }
    }
  }
}

/** Steel pipe mast with concrete foundation and a small cap. */
function pipeMast(B, x, z) {
  B.block('vc', 0.72, 0.28, 0.72, '#bdbab2', x, 0, z);
  B.box('vc', 0.8, 0.05, 0.8, '#c9c6be', x, 0.3, z);
  B.cyl('steel', 0.125, 0.155, POLE_H - 0.3, STEEL, x, 0.3, z, 12);
  B.cyl('steel', 0.02, 0.14, 0.14, STEEL_D, x, POLE_H, z, 12);
  // painted band where the walkers see it (reflective white/black)
  B.cyl('vcSmall', 0.158, 0.158, 0.18, '#f4f2ec', x, 1.35, z, 12, 0, 0, 0, true);
  B.cyl('vcSmall', 0.158, 0.158, 0.1, '#2d2e33', x, 1.53, z, 12, 0, 0, 0, true);
}

/** Square lattice column (4 angle chords + zig-zag lacing). */
function latticeColumn(B, x, z) {
  const hw = 0.21;
  B.block('vc', 0.95, 0.32, 0.95, '#bdbab2', x, 0, z);
  B.box('vc', 1.02, 0.05, 1.02, '#c9c6be', x, 0.34, z);
  B.box('steel', 0.62, 0.05, 0.62, STEEL_D, x, 0.39, z); // base plate
  for (const [cx, cz] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]]) {
    B.box('steel', 0.055, POLE_H - 0.4, 0.055, STEEL, x + cx, 0.4 + (POLE_H - 0.4) / 2, z + cz);
  }
  const step = 0.55;
  const faces = [
    [[-hw, -hw], [hw, -hw]], [[hw, -hw], [hw, hw]], [[hw, hw], [-hw, hw]], [[-hw, hw], [-hw, -hw]],
  ];
  let k = 0;
  for (let y = 0.45; y < POLE_H - step; y += step, k++) {
    for (const [p, q] of faces) {
      const [a, b] = k % 2 ? [p, q] : [q, p];
      B.bar('steel', { x: x + a[0], y, z: z + a[1] }, { x: x + b[0], y: y + step, z: z + b[1] }, 0.028, STEEL);
    }
  }
  for (const y of [0.45, POLE_H - 0.05]) {
    for (const [p, q] of faces) B.bar('steel', { x: x + p[0], y, z: z + p[1] }, { x: x + q[0], y, z: z + q[1] }, 0.04, STEEL);
  }
}

/** Rectangular truss girder spanning both tracks between two columns. */
function portalBeam(B, x, z0, z1) {
  const yb = 7.45, yt = 8.1, hd = 0.24;
  const za = Math.max(z0, z1) + 0.3, zb = Math.min(z0, z1) - 0.3;
  const L = za - zb, zc = (za + zb) / 2;
  for (const y of [yb, yt]) for (const dx of [-hd, hd]) B.box('steel', 0.06, 0.06, L, STEEL, x + dx, y, zc);
  const n = Math.round(L / 0.6);
  for (let i = 0; i <= n; i++) {
    const z = za - (L * i) / n;
    for (const dx of [-hd, hd]) B.bar('steel', { x: x + dx, y: yb, z }, { x: x + dx, y: yt, z }, 0.03, STEEL);
    B.bar('steel', { x: x - hd, y: yt, z }, { x: x + hd, y: yt, z }, 0.03, STEEL);
    B.bar('steel', { x: x - hd, y: yb, z }, { x: x + hd, y: yb, z }, 0.03, STEEL);
    if (i < n) {
      const zn = za - (L * (i + 1)) / n;
      for (const dx of [-hd, hd]) {
        const [p, q] = i % 2 ? [yb, yt] : [yt, yb];
        B.bar('steel', { x: x + dx, y: p, z }, { x: x + dx, y: q, z: zn }, 0.026, STEEL);
      }
    }
  }
}

/** Rod insulator between two points: core + sheds. */
function rodInsulator(B, a, b, color = INS_BROWN, sheds = 5) {
  B.tube('vcSmall', a, b, 0.028, color, 6);
  if (Math.abs(a.x) > 180) sheds = Math.min(sheds, 2); // far masts: fewer sheds
  for (let i = 0; i < sheds; i++) {
    const t = (i + 0.5) / sheds;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    const q = { x: p.x + d.x * 0.018, y: p.y + d.y * 0.018, z: p.z + d.z * 0.018 };
    B.tube('vcSmall', p, q, 0.07, color, 7, true);
  }
}

/** Hinged cantilever from a pipe mast at (x, pz) over the track at tz. */
function cantilever(K, x, pz, tz, stagger) {
  const B = K.B;
  const s = Math.sign(tz - pz);
  const z0 = pz + s * 0.16;
  // brackets on the mast
  for (const y of [5.0, 6.8]) B.box('steel', 0.2, 0.14, 0.12, STEEL_D, x, y, z0 + s * 0.04);
  // insulators at the mast end of both tubes
  const mainA = { x, y: 5.0, z: z0 + s * 0.1 }, mainB = { x, y: 5.08, z: z0 + s * 0.55 };
  rodInsulator(B, mainA, mainB);
  const stayA = { x, y: 6.8, z: z0 + s * 0.1 }, stayB = { x, y: 6.8, z: z0 + s * 0.55 };
  rodInsulator(B, stayA, stayB);
  // main tube rises to pass just under the messenger over the track
  const yAtTrack = C.messengerY - 0.07;
  const zEnd = tz + s * 0.55;
  const slope = (yAtTrack - mainB.y) / (tz - mainB.z);
  const end = { x, y: mainB.y + slope * (zEnd - mainB.z), z: zEnd };
  B.tube('steel', mainB, end, 0.03, '#9aa1a9', 8);
  // stay tube down to the main tube near its end
  const meet = { x, y: mainB.y + slope * (tz - s * 0.2 - mainB.z) + 0.03, z: tz - s * 0.2 };
  B.tube('steel', stayB, meet, 0.022, '#9aa1a9', 6);
  // messenger support saddle
  B.box('steel', 0.14, 0.05, 0.08, STEEL_D, x, yAtTrack + 0.03, tz);
  // drop + steady arm to the contact wire (registration)
  const dz = tz - s * 0.75;
  const dy = mainB.y + slope * (dz - mainB.z);
  const cw = { x, y: C.contactWireY + 0.04, z: tz + stagger * 0.2 };
  B.tube('steel', { x, y: dy, z: dz }, { x, y: 5.62, z: dz }, 0.018, '#9aa1a9', 6);
  B.tube('steel', { x, y: 5.62, z: dz }, cw, 0.012, '#8a9199', 5);
  B.box('vcSmall', 0.1, 0.035, 0.035, '#5e6369', cw.x, cw.y, cw.z); // clamp
}

/** Drop tube + suspension insulator + steady arm hanging from a portal beam. */
function portalDrop(K, x, tz, stagger) {
  const B = K.B;
  const yb = 7.45;
  // messenger suspension: short rod insulator hanging from the beam
  rodInsulator(B, { x, y: yb - 0.04, z: tz }, { x, y: C.messengerY + 0.35, z: tz }, INS_BROWN, 4);
  B.tube('steel', { x, y: C.messengerY + 0.35, z: tz }, { x, y: C.messengerY + 0.02, z: tz }, 0.012, '#9aa1a9', 5);
  B.box('steel', 0.14, 0.05, 0.08, STEEL_D, x, C.messengerY, tz);
  // registration drop tube (offset so the pantograph path stays clear)
  const dz = tz - 0.95;
  B.tube('steel', { x, y: yb - 0.03, z: dz }, { x, y: 5.6, z: dz }, 0.03, '#9aa1a9', 8);
  rodInsulator(B, { x, y: 5.62, z: dz }, { x, y: 5.6, z: dz + 0.45 }, INS_BROWN, 4);
  const cw = { x, y: C.contactWireY + 0.04, z: tz + stagger * 0.2 };
  B.tube('steel', { x, y: 5.6, z: dz + 0.45 }, cw, 0.012, '#8a9199', 5);
  B.box('vcSmall', 0.1, 0.035, 0.035, '#5e6369', cw.x, cw.y, cw.z);
}

/** Feeder bracket, distribution cross-arm with pin insulators, earth-wire peak. */
function mastTopFittings(B, x, pz, out, portal) {
  const r = portal ? 0.26 : 0.14;
  // feeder bracket + suspension insulator
  B.box('steel', 0.08, 0.08, 0.95, STEEL_D, x, 8.15, pz + out * (r + 0.42));
  rodInsulator(B, { x, y: 8.1, z: pz + out * 0.95 }, { x, y: 7.6, z: pz + out * 0.95 }, INS_BROWN, 4);
  // cross-arm (along z) with three pin insulators
  B.box('steel', 0.09, 0.09, 1.9, STEEL_D, x, 8.8, pz + out * 0.2);
  for (const dz of [out * 0.95, out * 0.45, -out * 0.55]) {
    B.cyl('vcSmall', 0.035, 0.05, 0.1, INS_WHITE, x, 8.845, pz + dz, 8);
    B.cyl('vcSmall', 0.065, 0.065, 0.025, INS_WHITE, x, 8.9, pz + dz, 8);
    B.cyl('vcSmall', 0.03, 0.045, 0.06, INS_WHITE, x, 8.925, pz + dz, 8);
  }
  // earth wire peak
  B.box('steel', 0.06, 0.2, 0.06, STEEL_D, x, POLE_H + 0.05, pz);
}

/** One span of messenger + contact wire + droppers between two supports. */
function span(K, a, b, tz, sagMul = 1) {
  const L = b.x - a.x;
  const sag = 0.55 * sagMul * (L / C.poleSpacing) ** 2;
  const ma = a.msgY ?? C.messengerY, mb = b.msgY ?? C.messengerY;
  const mza = a.msgZ ?? tz, mzb = b.msgZ ?? tz;
  const cwY = C.contactWireY;
  const msg = [], cw = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + L * t;
    msg.push(new THREE.Vector3(x, ma + (mb - ma) * t - sag * 4 * t * (1 - t), mza + (mzb - mza) * t));
    cw.push(new THREE.Vector3(x, cwY - 0.015 * 4 * t * (1 - t), a.cwZ + (b.cwZ - a.cwZ) * t));
  }
  K.wire(msg, 0.014);
  K.wire(cw, 0.013);
  // droppers every ~5 m
  const nd = Math.max(2, Math.round(L / 5));
  for (let i = 1; i < nd; i++) {
    const t = i / nd;
    const x = a.x + L * t;
    const my = ma + (mb - ma) * t - sag * 4 * t * (1 - t);
    const z0 = mza + (mzb - mza) * t, z1 = a.cwZ + (b.cwZ - a.cwZ) * t;
    K.wire([new THREE.Vector3(x, my - 0.01, z0), new THREE.Vector3(x, cwY + 0.01, z1)], 0.006, 3, true);
  }
}
