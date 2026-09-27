/**
 * terrain/paving — everything paved that is not asphalt:
 *
 *  - concrete edge bands behind every gutter and the lot aprons along the
 *    main street (a few houses have gravel fronts instead)
 *  - rounded corner fills behind the kerb fillets
 *  - the konbini forecourt: raised slab with a low ramp edge, bicycle-parking
 *    lines (markings.js) and tactile blocks leading to the door
 *  - the station plaza: grey square tiles, granite kerb stones, a dropped
 *    kerb + ramp at the zebra, tree pits (decals.js) and the tactile guide
 *    route zebra -> station entrance
 */
import * as THREE from 'three';
import { PLAZA, STATION, LOTS, TREES } from '../../core/layout.js';
import { LIFT, SF, CR, NR, MS, MS_S0, MS_S1, LANES, CORNERS, cornerById, cornerArc, straightPoint, groundY, fbm, hash2, addSlab } from './common.js';

const CONC_UV = 1 / 2; // concrete slab joints every 2 m
const PLAZA_UV = 1 / 6.4;
export const KONBINI_LIFT = 0.11;
export const TACTILE_H = 0.012;

// ---------------------------------------------------------------------------
// generic swept slab
// ---------------------------------------------------------------------------
/**
 * A flat-topped strip swept along frame(t) (returns {x,z,nx,nz}), between
 * lateral offsets d0..d1 (measured along n), t in [t0,t1].  Top at
 * groundY + lift(t, d); skirts drop to the ground on the outer side and ends.
 */
function sweptSlab(b, frame, t0, t1, d0, d1, lift, color, { step = 1, uvScale = CONC_UV, skirtInner = false, skirtOuter = true, skirtEnds = true } = {}) {
  const n = Math.max(1, Math.ceil((t1 - t0) / step));
  const liftF = typeof lift === 'function' ? lift : () => lift;
  const colF = typeof color === 'function' ? color : () => color;
  const P = (t, d) => {
    const f = frame(t);
    const x = f.x + f.nx * d, z = f.z + f.nz * d;
    return { x, z, y: groundY(x, z) + liftF(t, d), g: groundY(x, z) };
  };
  b.grid(1, n, (i, j) => {
    const t = Math.min(t1, t0 + j * ((t1 - t0) / n));
    const d = i ? d1 : d0;
    const p = P(t, d);
    return [p.x, p.y, p.z, d * uvScale, t * uvScale, colF(t, d)];
  });
  const skirt = (pa, pb, c) => {
    // vertical quad from pa..pb (top) down to the ground; faces whichever way — make it double by emitting both windings
    // world-scaled uvs (u along the edge, v up) so skirts show the same concrete grain as the top
    const ua = (pa.x + pa.z) * uvScale, ub = (pb.x + pb.z) * uvScale;
    const a0 = b.vert(pa.x, pa.g - 0.02, pa.z, ua, 0, c), b0 = b.vert(pb.x, pb.g - 0.02, pb.z, ub, 0, c);
    const b1 = b.vert(pb.x, pb.y, pb.z, ub, (pb.y - pb.g + 0.02) * uvScale, c), a1 = b.vert(pa.x, pa.y, pa.z, ua, (pa.y - pa.g + 0.02) * uvScale, c);
    b.quad(a0, b0, b1, a1);
    b.quad(a0, a1, b1, b0);
  };
  const shade = (c) => [c[0] * 0.92, c[1] * 0.92, c[2] * 0.94];
  for (let j = 0; j < n; j++) {
    const ta = t0 + j * ((t1 - t0) / n), tb = t0 + (j + 1) * ((t1 - t0) / n);
    if (skirtOuter) skirt(P(ta, d1), P(tb, d1), shade(colF(ta, d1)));
    if (skirtInner) skirt(P(ta, d0), P(tb, d0), shade(colF(ta, d0)));
  }
  // end skirts only where the slab stands proud of its neighbours (a 4 mm step shows no side)
  if (skirtEnds && liftF(t0, d0) - LIFT.apron >= 0.01) {
    skirt(P(t0, d0), P(t0, d1), shade(colF(t0, d0)));
    skirt(P(t1, d0), P(t1, d1), shade(colF(t1, d0)));
  }
}

const msFrameSide = (side) => (s) => {
  const f = MS.atS(s);
  return { x: f.x, z: f.z, nx: f.nx * side, nz: f.nz * side };
};
const axisFrame = (road, side) => (a) => {
  const p = straightPoint(road, a, 0);
  return road.axis === 'x' ? { x: p.x, z: p.z, nx: 0, nz: side } : { x: p.x, z: p.z, nx: side, nz: 0 };
};

const CONC = [1, 1, 1];
const concTint = (seed) => (t, d) => {
  const k = 0.95 + 0.08 * fbm(t * 0.08, d * 0.2 + seed, seed, 2);
  return [k, k, k * 1.01];
};

// ---------------------------------------------------------------------------
// main street aprons
// ---------------------------------------------------------------------------
function mainStreetAprons(bins) {
  const conc = bins.get('concrete');
  const grav = bins.get('gravel');
  const g0 = MS.gutter[1];
  const band1 = MS.lotFront + 0.02;
  for (const side of [-1, 1]) {
    const c = cornerById(side < 0 ? 'mainW' : 'mainE');
    const sStart = MS_S0 + c.R;
    sweptSlab(conc, msFrameSide(side), sStart, MS_S1, g0, band1, LIFT.apron, concTint(side + 3), { skirtOuter: false });
    // per-lot aprons between the band and the lot front
    for (const lot of LOTS) {
      if (lot.street !== 'main' || lot.side !== side || lot.type === 'konbini') continue;
      const d1 = MS.lotFront + (lot.setback || 0);
      if (d1 - band1 < 0.15) continue;
      const s0 = Math.max(sStart, lot.s - lot.width / 2), s1 = Math.min(MS_S1, lot.s + lot.width / 2);
      const gravelFront = lot.type === 'house' && hash2(lot.seed & 1023, 3, 5) < 0.3;
      if (gravelFront) sweptSlab(grav, msFrameSide(side), s0, s1, band1, d1, LIFT.apron - 0.012, [1, 1, 1], { uvScale: 1 / 3, step: 1 });
      else sweptSlab(conc, msFrameSide(side), s0, s1, band1, d1, LIFT.apron + 0.004, concTint(lot.seed % 97));
    }
  }
}

/** Bands behind the gutters of the straight roads (between gutter and lot fronts). */
function straightBands(bins) {
  const conc = bins.get('concrete');
  const mW = cornerById('mainW'), mE = cornerById('mainE');
  // station-front road, south side: west of the main street, east of it
  const sfS = axisFrame(SF, 1);
  sweptSlab(conc, sfS, SF.from, mW.K.x - mW.R, SF.gutter[1], SF.gutter[1] + 0.32, LIFT.apron, concTint(11), { step: 2 });
  sweptSlab(conc, sfS, mE.K.x + mE.R, SF.to, SF.gutter[1], SF.gutter[1] + 0.32, LIFT.apron, concTint(12), { step: 2 });
  // north side: west of the plaza, and east of the crossing road
  const sfN = axisFrame(SF, -1);
  const cSE = cornerById('crSE');
  sweptSlab(conc, sfN, SF.from, PLAZA.xMin - 0.02, SF.gutter[1], SF.gutter[1] + 0.32, LIFT.apron, concTint(13), { step: 2 });
  sweptSlab(conc, sfN, cSE.K.x + cSE.R, SF.to, SF.gutter[1], SF.gutter[1] + 0.32, LIFT.apron, concTint(14), { step: 2 });
  // crossing road, east side (south piece) — west side is the plaza strip
  const crE = axisFrame(CR, 1);
  const lne = LANES.find((l) => l.join0);
  sweptSlab(conc, crE, -23.8, lne.z - lne.gutter[1], CR.gutter[1], CR.gutter[1] + 0.3, LIFT.apron, concTint(15), { step: 2 });
  sweptSlab(conc, crE, lne.z + lne.hw, cSE.K.z - cSE.R, CR.gutter[1], CR.gutter[1] + 0.3, LIFT.apron, concTint(15), { step: 2 });
  // residential lanes: narrow concrete strip between the north gutter and the lot fronts
  for (const l of LANES) {
    const a = l.join0 ? CR.x + CR.gutter[1] : l.x0 + 0.3;
    sweptSlab(conc, axisFrame(l, -1), a, l.x1 - 0.3, l.gutter[1], l.apron, LIFT.apron, concTint(20 + l.z), { step: 2 });
  }
  // north road, north side
  const nrN = axisFrame(NR, -1);
  const cNW = cornerById('crNW');
  sweptSlab(conc, nrN, NR.from, NR.to, NR.gutter[1], NR.gutter[1] + 0.3, LIFT.apron, concTint(16), { step: 2 });
  // north road, south side (towards the railway fence), leaving the crossing mouth
  const nrS = axisFrame(NR, 1);
  const cNE = cornerById('crNE');
  sweptSlab(conc, nrS, NR.from, cNW.K.x - cNW.R, NR.gutter[1], NR.gutter[1] + 0.3, LIFT.apron, concTint(17), { step: 2 });
  sweptSlab(conc, nrS, cNE.K.x + cNE.R, NR.to, NR.gutter[1], NR.gutter[1] + 0.3, LIFT.apron, concTint(18), { step: 2 });
}

/** Quarter-disc fills behind each corner's gutter arc. */
function cornerFills(bins) {
  const conc = bins.get('concrete');
  for (const c of CORNERS) {
    if (c.id === 'crSW') continue; // the plaza strip covers this corner
    const r = c.R - c.w;
    const pts = cornerArc(c, r, 8);
    const y = (x, z) => groundY(x, z) + LIFT.apron;
    const k = conc.vert(c.C.x, y(c.C.x, c.C.z), c.C.z, c.C.x * CONC_UV, c.C.z * CONC_UV);
    const ids = pts.map((p) => conc.vert(p.x, y(p.x, p.z), p.z, p.x * CONC_UV, p.z * CONC_UV));
    const p0 = pts[0], p1 = pts[1];
    const ny = (p0.z - c.C.z) * (p1.x - c.C.x) - (p0.x - c.C.x) * (p1.z - c.C.z);
    for (let i = 0; i < ids.length - 1; i++) {
      if (ny > 0) conc.tri(k, ids[i], ids[i + 1]);
      else conc.tri(k, ids[i + 1], ids[i]);
    }
    // square beyond the quarter disc (towards the lots) so the corner has no hole
    const a = { x: c.C.x, z: c.C.z };
    const u1 = c.u1, u2 = c.u2;
    const q = (s1, s2) => ({ x: a.x + u1.x * s1 + u2.x * s2, z: a.z + u1.z * s1 + u2.z * s2 });
    const quad = [q(0, 0), q(0.3, 0), q(0.3, 0.3), q(0, 0.3)];
    const qi = quad.map((p) => conc.vert(p.x, y(p.x, p.z), p.z, p.x * CONC_UV, p.z * CONC_UV));
    const nyq = (quad[1].z - quad[0].z) * (quad[3].x - quad[0].x) - (quad[1].x - quad[0].x) * (quad[3].z - quad[0].z);
    if (nyq > 0) conc.quad(qi[0], qi[1], qi[2], qi[3]);
    else conc.quad(qi[0], qi[3], qi[2], qi[1]);
  }
}

// ---------------------------------------------------------------------------
// tactile blocks
// ---------------------------------------------------------------------------
/** One 0.3 m tactile block centred at (x,z), bars along (dx,dz). kind 'line' | 'dot'. */
export function tactileTile(b, x, z, dx, dz, kind, yBase) {
  const h = 0.15;
  const uv = kind === 'line' ? [0.01, 0.01, 0.49, 0.99] : [0.51, 0.01, 0.99, 0.99];
  const p0 = { x: x - dx * h, z: z - dz * h }, p1 = { x: x + dx * h, z: z + dz * h };
  addSlab(b, p0, p1, 0.296, yBase - 0.01, yBase + TACTILE_H, [1, 1, 1], uv);
}

/** Row of tactile tiles from a to b (world xz) at yBase(x,z). */
export function tactileRun(b, a, c, kind, yBase) {
  const L = Math.hypot(c.x - a.x, c.z - a.z);
  const n = Math.max(1, Math.round(L / 0.3));
  const dx = (c.x - a.x) / L, dz = (c.z - a.z) / L;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t;
    tactileTile(b, x, z, dx, dz, kind, typeof yBase === 'function' ? yBase(x, z) : yBase);
  }
}

/** Block of dot tiles (nx across, nz along) centred at (x,z) with orientation (dx,dz). */
function dotPad(b, x, z, dx, dz, nAlong, nAcross, yBase) {
  const px = -dz, pz = dx;
  for (let i = 0; i < nAlong; i++) {
    for (let j = 0; j < nAcross; j++) {
      const a = (i - (nAlong - 1) / 2) * 0.3, c = (j - (nAcross - 1) / 2) * 0.3;
      tactileTile(b, x + dx * a + px * c, z + dz * a + pz * c, dx, dz, 'dot', yBase);
    }
  }
}

// ---------------------------------------------------------------------------
// plaza
// ---------------------------------------------------------------------------
export const PLAZA_Y = LIFT.plaza;
export const ZEBRA_SF = { x0: -2.9, x1: 0.9 }; // dropped kerb span at the station-front zebra

function plaza(bins) {
  const p = bins.get('plaza');
  const x0 = PLAZA.xMin, x1 = PLAZA.xMax, z0 = -24.0, z1 = PLAZA.zMax;
  const nx = Math.round((x1 - x0) / 2), nz = Math.round((z1 - z0) / 2);
  const tint = (x, z) => {
    const k = 0.93 + 0.08 * fbm(x * 0.07, z * 0.07, 71, 2);
    const w = fbm(x * 0.2 + 3, z * 0.2, 72, 1);
    return [k * (1 + (w - 0.5) * 0.04), k, k * (1 - (w - 0.5) * 0.03)];
  };
  p.grid(nx, nz, (i, j) => {
    const x = x0 + (i / nx) * (x1 - x0), z = z0 + (j / nz) * (z1 - z0);
    return [x, PLAZA_Y, z, x * PLAZA_UV, z * PLAZA_UV, tint(x, z)];
  });
  // decorative bands of darker tiles: a border frame, two cross bands and a ring round the grand tree
  const bandY = PLAZA_Y + 0.008; // far enough above the tiles for depth precision at 100+ m
  const bandCol = [0.8, 0.79, 0.8];
  const band = (xa, za, xb, zb) => {
    const ids = [[xa, za], [xb, za], [xb, zb], [xa, zb]].map(([x, z]) => p.vert(x, bandY, z, x * PLAZA_UV, z * PLAZA_UV, bandCol));
    p.quad(ids[0], ids[3], ids[2], ids[1]);
  };
  const bw = 0.8;
  band(x0 + 0.2, z1 - 0.2 - bw, x1, z1 - 0.2); // along the kerb
  band(x0 + 0.2, -15.0, x0 + 0.2 + bw, z1 - 0.2 - bw); // west edge
  for (const bx of [-9.2, 6.4]) band(bx, -15.0, bx + 0.4, z1 - 0.2 - bw); // cross bands (0.4 m = one tile)
  band(x0 + 0.2, -15.4, x1, -15.0); // along the station front
  {
    const g = PLAZA.grandTree, r0 = 2.35, r1 = 2.75, n = 40;
    const ring = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      ring.push([p.vert(g.x + Math.cos(a) * r0, bandY, g.z + Math.sin(a) * r0, 0.1, 0.1, bandCol), p.vert(g.x + Math.cos(a) * r1, bandY, g.z + Math.sin(a) * r1, 0.13, 0.1, bandCol)]);
    }
    for (let i = 0; i < n; i++) p.quad(ring[i][0], ring[i + 1][0], ring[i + 1][1], ring[i][1]);
  }
  // east strip (bicycle parking / toilet), with its corner rounded to the crossing-road kerb
  const E = PLAZA.east;
  const c = cornerById('crSW');
  const r = c.R - c.w;
  const ex1 = CR.x - CR.gutter[1], ez1 = SF.z - SF.gutter[1];
  const shape = [];
  shape.push(new THREE.Vector2(x1, E.zMin), new THREE.Vector2(ex1, E.zMin), new THREE.Vector2(ex1, c.C.z));
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI * 0.5;
    shape.push(new THREE.Vector2(c.C.x + Math.cos(a) * r, c.C.z + Math.sin(a) * r));
  }
  shape.push(new THREE.Vector2(c.C.x, ez1), new THREE.Vector2(x1, ez1));
  const tris = THREE.ShapeUtils.triangulateShape(shape, []);
  const ids = shape.map((v) => p.vert(v.x, PLAZA_Y, v.y, v.x * PLAZA_UV, v.y * PLAZA_UV, tint(v.x, v.y)));
  for (const t of tris) {
    const [a, bb, cc] = t.map((k) => shape[k]);
    const ny = (bb.y - a.y) * (cc.x - a.x) - (bb.x - a.x) * (cc.y - a.y);
    if (ny > 0) p.tri(ids[t[0]], ids[t[1]], ids[t[2]]);
    else p.tri(ids[t[0]], ids[t[2]], ids[t[1]]);
  }
  // east strip edge skirt along the station-front gutter and the corridor side
  const conc = bins.get('concrete');
  addSlab(conc, { x: x1, z: E.zMin - 0.06 }, { x: ex1, z: E.zMin - 0.06 }, 0.12, -0.02, PLAZA_Y + 0.02, [0.98, 0.98, 1]);

  // granite kerb stones: south edge (except the dropped kerb at the zebra) and west edge
  const kerbCol = [1.03, 1.03, 1.05];
  const kerb = (a, bb) => addSlab(conc, a, bb, 0.16, -0.02, PLAZA_Y + 0.035, kerbCol, [0.1, 0.1, 0.35, 0.35]);
  const zK = z1 - 0.08;
  for (let x = x0; x < x1 - 0.01; x += 1.0) {
    const xa = x + 0.006, xb = Math.min(x1, x + 1.0) - 0.006;
    if (xb > ZEBRA_SF.x0 && xa < ZEBRA_SF.x1) continue;
    kerb({ x: xa, z: zK }, { x: xb, z: zK });
  }
  for (let z = z0; z < z1 - 0.01; z += 1.0) kerb({ x: x0 + 0.08, z: z + 0.006 }, { x: x0 + 0.08, z: Math.min(z1, z + 1.0) - 0.006 });
  // dropped kerb: a gentle concrete ramp from the plaza down to the road at the zebra
  {
    const zA = z1 - 0.3, zB = z1 + 0.28;
    const yA = PLAZA_Y + 0.002, yB = LIFT.road + 0.004;
    const ids2 = [
      conc.vert(ZEBRA_SF.x0, yA, zA, 0, 0), conc.vert(ZEBRA_SF.x1, yA, zA, 1.9, 0),
      conc.vert(ZEBRA_SF.x1, yB, zB, 1.9, 0.3), conc.vert(ZEBRA_SF.x0, yB, zB, 0, 0.3),
    ];
    conc.quad(ids2[0], ids2[3], ids2[2], ids2[1]);
    // low kerb ends either side of the ramp
    kerb({ x: ZEBRA_SF.x0 - 0.25, z: zK }, { x: ZEBRA_SF.x0 - 0.006, z: zK });
    kerb({ x: ZEBRA_SF.x1 + 0.006, z: zK }, { x: ZEBRA_SF.x1 + 0.25, z: zK });
  }

  // tactile guide route: zebra landing -> station entrance
  const t = bins.get('tactile');
  const yT = PLAZA_Y;
  const ent = STATION.entrance;
  dotPad(t, -1.0, z1 - 0.45, 0, -1, 2, 8, yT); // warning blocks across the zebra landing
  // orthogonal guide line (誘導ブロック) round the flower beds, 2x2 warning pads at
  // every turn / junction, a branch to the bus-stop boarding strip
  const route = [
    { x: -1.0, z: z1 - 0.75 }, { x: -1.0, z: 0.45 }, { x: 2.3, z: 0.45 }, { x: 2.3, z: -6.6 }, { x: ent.x, z: -6.6 }, { x: ent.x, z: ent.z + 1.05 },
  ];
  guideLine(t, route, yT, 0);
  guideLine(t, [{ x: 2.3, z: 0.45 }, { x: PLAZA.busStop.x - 1.5, z: 0.45 }, { x: PLAZA.busStop.x - 1.5, z: z1 - 0.95 }], yT, 1);
  dotPad(t, ent.x, ent.z + 0.6, 0, -1, 2, 3, yT); // at the entrance door
  // boarding strip at the bus stop (along the kerb)
  tactileRun(t, { x: PLAZA.busStop.x - 2.1, z: z1 - 0.5 }, { x: PLAZA.busStop.x + 1.8, z: z1 - 0.5 }, 'dot', yT);
  tactileRun(t, { x: PLAZA.busStop.x - 2.1, z: z1 - 0.8 }, { x: PLAZA.busStop.x + 1.8, z: z1 - 0.8 }, 'dot', yT);
}

/**
 * Tactile guide line along an axis-aligned polyline: linear blocks on the
 * runs and a 2x2 dot pad at each interior vertex.  `startsAtPad` = the first
 * vertex already carries a pad (a branch off another line): stop short of it.
 */
function guideLine(t, pts, yT, startsAtPad) {
  const PAD = 0.3; // half-size of a 2x2 pad
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const L = Math.hypot(c.x - a.x, c.z - a.z);
    const dx = (c.x - a.x) / L, dz = (c.z - a.z) / L;
    const s0 = i > 0 || startsAtPad ? PAD : 0;
    const s1 = i < pts.length - 2 ? L - PAD : L;
    if (s1 - s0 > 0.15) tactileRun(t, { x: a.x + dx * s0, z: a.z + dz * s0 }, { x: a.x + dx * s1, z: a.z + dz * s1 }, 'line', yT);
    if (i < pts.length - 2) dotPad(t, c.x, c.z, 0, -1, 2, 2, yT);
  }
}

// ---------------------------------------------------------------------------
// konbini forecourt
// ---------------------------------------------------------------------------
export function konbiniInfo() {
  const k = LOTS.find((l) => l.type === 'konbini');
  const d1 = MS.lotFront + (k.setback || 0);
  const c = cornerById('mainE');
  return { lot: k, d0: MS.gutter[1], d1, s0: MS_S0 + c.R, s1: k.s + k.width / 2 + 0.3, corner: c };
}

function konbini(bins) {
  const info = konbiniInfo();
  const { lot, d0, d1, s0, s1, corner } = info;
  const conc = bins.get('concrete');
  const ramp = 0.45;
  const frame = msFrameSide(1);
  // a touch darker / warmer than the street aprons: the sunlit forecourt otherwise clips to white
  const base = concTint(77);
  const tint = (t, d) => {
    const c = base(t, d);
    return [c[0] * 0.9, c[1] * 0.89, c[2] * 0.87];
  };
  // ramp strip (street side) then the flat forecourt
  sweptSlab(conc, frame, s0, s1, d0, d0 + ramp, (t, d) => (d < d0 + ramp * 0.5 ? LIFT.gutterRim + 0.004 : KONBINI_LIFT), tint, { skirtOuter: false });
  sweptSlab(conc, frame, s0, s1, d0 + ramp, d1 + 0.25, KONBINI_LIFT, tint, { skirtOuter: false });
  // the corner between the station-front band and the forecourt start
  const fS = MS.atS(s0);
  const zA = SF.z + SF.gutter[1];
  const xOuter = fS.x + fS.nx * (d1 + 0.25);
  const zB = fS.z + fS.nz * (d1 + 0.25);
  const cx = corner.C.x;
  const quad = [{ x: cx, z: zA }, { x: xOuter, z: zA }, { x: xOuter, z: zB }, { x: cx, z: fS.z }];
  const ids = quad.map((p) => conc.vert(p.x, groundY(p.x, p.z) + KONBINI_LIFT - 0.002, p.z, p.x * CONC_UV, p.z * CONC_UV, [0.88, 0.87, 0.85]));
  conc.quad(ids[0], ids[3], ids[2], ids[1]);
  addSlab(conc, { x: cx, z: zA + 0.02 }, { x: xOuter, z: zA + 0.02 }, 0.04, -0.02, KONBINI_LIFT - 0.003, [0.92, 0.92, 0.94]);

  // tactile: from the ramp to the door (lot centre)
  const t = bins.get('tactile');
  const yK = (x, z) => groundY(x, z) + KONBINI_LIFT;
  const fr = MS.atS(lot.s);
  const P = (d) => ({ x: fr.x + fr.nx * d, z: fr.z + fr.nz * d });
  const dirx = fr.nx, dirz = fr.nz;
  dotPad(t, P(d0 + ramp + 0.3).x, P(d0 + ramp + 0.3).z, dirx, dirz, 2, 3, yK(P(d0 + ramp).x, P(d0 + ramp).z));
  tactileRun(t, P(d0 + ramp + 0.6), P(d1 - 0.6), 'line', yK);
  const pe = P(d1 - 0.3);
  dotPad(t, pe.x, pe.z, dirx, dirz, 2, 3, yK(pe.x, pe.z));
  return info;
}

export function buildPaving(bins) {
  mainStreetAprons(bins);
  straightBands(bins);
  cornerFills(bins);
  plaza(bins);
  return { konbini: konbini(bins) };
}

/** Trees standing on the plaza (they get soil pits instead of tiles). */
export function plazaTrees() {
  return TREES.filter((t) => !t.far && t.x > PLAZA.xMin && t.x < PLAZA.xMax && t.z > -24 && t.z < PLAZA.zMax);
}
