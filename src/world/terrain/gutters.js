/**
 * terrain/gutters — 側溝: concrete U-channels along both sides of every road.
 *
 * Each run is a polyline of the channel centre line.  Along it:
 *   - two low concrete rims (swept strips, part of the concrete bin)
 *   - instanced lids every 0.5 m: mostly precast concrete covers with two
 *     lifting holes, a steel grate every few lids, long grate runs in front
 *     of shops / the konbini (driveway crossings)
 * Gaps: runs stop at junction mouths (the kerb arcs take over), at the
 * plaza front (catch-basin grates instead) and short of the level crossing.
 */
import * as THREE from 'three';
import { PLAZA, LOTS } from '../../core/layout.js';
import { LIFT, SF, CR, NR, MS, MS_S0, MS_S1, CORNERS, cornerById, cornerArc, groundY, hash2, GeoBuilder } from './common.js';

const PIECE = 0.5;

/** Resample a polyline into points every `step` metres (keeps ends). */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    let t = step - carry;
    while (t <= L) {
      out.push({ x: a.x + ((b.x - a.x) * t) / L, z: a.z + ((b.z - a.z) * t) / L });
      t += step;
    }
    carry = L - (t - step);
  }
  const last = pts[pts.length - 1];
  const pl = out[out.length - 1];
  if (Math.hypot(last.x - pl.x, last.z - pl.z) > step * 0.3) out.push(last);
  return out;
}

/** All gutter runs: { pts: [{x,z}], width, tag } (pts = channel centre line). */
export function gutterRuns() {
  const runs = [];
  // main street, both sides
  for (const side of [-1, 1]) {
    const c = cornerById(side < 0 ? 'mainW' : 'mainE');
    const dc = (MS.gutter[0] + MS.gutter[1]) / 2;
    const pts = [];
    for (let s = MS_S0 + c.R; s <= MS_S1 - 0.5; s += 1) {
      const f = MS.atS(s);
      pts.push({ x: f.x + f.nx * side * dc, z: f.z + f.nz * side * dc, s });
    }
    runs.push({ pts, width: MS.gutter[1] - MS.gutter[0], tag: side < 0 ? 'mainW' : 'mainE', side });
  }
  // kerb arcs
  for (const c of CORNERS) {
    runs.push({ pts: cornerArc(c, c.R - c.w / 2, 10), width: c.w, tag: `arc:${c.id}` });
  }
  const xRun = (road, side, x0, x1, tag) => {
    if (x1 - x0 < 0.6) return;
    const z = road.z + side * (road.gutter[0] + road.gutter[1]) / 2;
    runs.push({ pts: [{ x: x0, z }, { x: x1, z }], width: road.gutter[1] - road.gutter[0], tag });
  };
  const zRun = (road, side, z0, z1, tag) => {
    if (Math.abs(z1 - z0) < 0.6) return;
    const x = road.x + side * (road.gutter[0] + road.gutter[1]) / 2;
    runs.push({ pts: [{ x, z: z0 }, { x, z: z1 }], width: road.gutter[1] - road.gutter[0], tag });
  };
  const mW = cornerById('mainW'), mE = cornerById('mainE');
  const cSW = cornerById('crSW'), cSE = cornerById('crSE'), cNW = cornerById('crNW'), cNE = cornerById('crNE');
  // station-front road
  xRun(SF, 1, SF.from, mW.K.x - mW.R, 'sfS');
  xRun(SF, 1, mE.K.x + mE.R, SF.to, 'sfS');
  xRun(SF, -1, SF.from, PLAZA.xMin, 'sfN');
  xRun(SF, -1, PLAZA.xMax, cSW.K.x - cSW.R, 'sfN');
  xRun(SF, -1, cSE.K.x + cSE.R, SF.to, 'sfN');
  // crossing road (stop short of the barriers)
  zRun(CR, -1, cSW.K.z - cSW.R, -23.3, 'crW');
  zRun(CR, 1, cSE.K.z - cSE.R, -23.3, 'crE');
  zRun(CR, -1, -41.3, cNW.K.z + cNW.R, 'crW');
  zRun(CR, 1, -41.3, cNE.K.z + cNE.R, 'crE');
  // north road
  xRun(NR, -1, NR.from, NR.to, 'nrN');
  xRun(NR, 1, NR.from, cNW.K.x - cNW.R, 'nrS');
  xRun(NR, 1, cNE.K.x + cNE.R, NR.to, 'nrS');
  return runs;
}

/** Shop fronts get continuous grates (driveway / forecourt crossings). */
function shopGrateZones() {
  const zones = [];
  for (const lot of LOTS) {
    if (lot.street !== 'main' || lot.type === 'house') continue;
    zones.push({ x: lot.front.x, z: lot.front.z, r: lot.type === 'konbini' ? 5.5 : 1.6 });
  }
  return zones;
}

export function buildGutters(ctx, bins, gutterMat) {
  const runs = gutterRuns();
  const conc = bins.get('concrete');
  const covers = [];
  const grates = [];
  const grateSpots = []; // for decals (wet stains, leaves)
  const zones = shopGrateZones();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const sc = new THREE.Vector3();
  const p = new THREE.Vector3();
  let k = 0;
  const rimCol = [1.0, 1.0, 1.0];
  for (const run of runs) {
    const pts = resample(run.pts, PIECE);
    const rw = 0.06; // rim width
    const inner = run.width - rw * 2;
    // rims: swept strips, one quad top + two faces per 1 m
    const rimPts = resample(run.pts, 1.0);
    for (const off of [-(run.width / 2 - rw / 2), run.width / 2 - rw / 2]) {
      for (let i = 0; i < rimPts.length - 1; i++) {
        const a = rimPts[i], b = rimPts[i + 1];
        const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L;
        const A = { x: a.x + nx * off, z: a.z + nz * off }, B = { x: b.x + nx * off, z: b.z + nz * off };
        rimStrip(conc, A, B, rw, rimCol);
      }
    }
    // lids
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      if (L < 0.2) continue;
      const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const inZone = zones.some((z) => Math.hypot(z.x - cx, z.z - cz) < z.r);
      const h = hash2(Math.floor(cx * 3), Math.floor(cz * 3), 91);
      const grate = inZone || k % 5 === 4 || h < 0.06;
      k++;
      const y = groundY(cx, cz) + LIFT.gutterTop;
      q.setFromAxisAngle(up, yaw);
      p.set(cx, y - 0.05, cz);
      sc.set(inner + 0.004, 1, L - 0.012);
      m.compose(p, q, sc);
      (grate ? grates : covers).push(m.clone());
      if (grate && !inZone && h < 0.5) grateSpots.push({ x: cx, z: cz, yaw, run: run.tag });
    }
  }
  // catch-basin grates along the plaza kerb (no side channel there)
  for (let x = PLAZA.xMin + 4; x < PLAZA.xMax - 2; x += 9) {
    if (x > -3.5 && x < 1.5) continue;
    const z = PLAZA.zMax + 0.2;
    q.setFromAxisAngle(up, Math.PI / 2);
    p.set(x, LIFT.gutterTop - 0.05, z);
    sc.set(0.34, 1, 0.9);
    m.compose(p, q, sc);
    grates.push(m.clone());
    grateSpots.push({ x, z, yaw: Math.PI / 2, run: 'plaza' });
  }

  const coverGeo = lidGeometry(0);
  const grateGeo = lidGeometry(0.5);
  const cov = ctx.geom.instanced(coverGeo, gutterMat, covers, { castShadow: false });
  cov.name = 'terrain:gutterCovers';
  const gr = ctx.geom.instanced(grateGeo, gutterMat, grates, { castShadow: false });
  gr.name = 'terrain:gutterGrates';
  return { meshes: [cov, gr], grateSpots, runs };
}

/** A gutter rim segment: top + both side faces (sides go down to the road surface). */
function rimStrip(b, A, B, w, c) {
  const L = Math.hypot(B.x - A.x, B.z - A.z) || 1;
  const nx = (B.z - A.z) / L, nz = -(B.x - A.x) / L;
  const hw = w / 2;
  const yT = (x, z) => groundY(x, z) + LIFT.gutterRim;
  const yB = (x, z) => groundY(x, z) + LIFT.road - 0.01;
  const P = [
    { x: A.x - nx * hw, z: A.z - nz * hw }, { x: A.x + nx * hw, z: A.z + nz * hw },
    { x: B.x + nx * hw, z: B.z + nz * hw }, { x: B.x - nx * hw, z: B.z - nz * hw },
  ];
  const u = (p) => p.x * 0.5 + p.z * 0.13;
  const v = (p) => p.z * 0.5 - p.x * 0.13;
  const t = P.map((p) => b.vert(p.x, yT(p.x, p.z), p.z, u(p), v(p), c));
  b.quad(t[0], t[3], t[2], t[1]);
  // two long faces: the -n side (P0->P3) winds outward as (a0,b0,b1,a1), the +n side reversed
  const shade = [c[0] * 0.9, c[1] * 0.9, c[2] * 0.93];
  for (const [i, j, flip] of [[0, 3, false], [1, 2, true]]) {
    const pa = P[i], pb = P[j];
    const a0 = b.vert(pa.x, yB(pa.x, pa.z), pa.z, u(pa), 0, shade), b0 = b.vert(pb.x, yB(pb.x, pb.z), pb.z, u(pb), 0, shade);
    const b1 = b.vert(pb.x, yT(pb.x, pb.z), pb.z, u(pb), 0.02, shade), a1 = b.vert(pa.x, yT(pa.x, pa.z), pa.z, u(pa), 0.02, shade);
    if (flip) b.quad(a0, a1, b1, b0);
    else b.quad(a0, b0, b1, a1);
  }
}

/**
 * Unit gutter lid (1 x 0.1 x 1, bottom at y = 0): top + the two long sides
 * only (the short ends butt against the neighbours and are never seen).
 * u0 selects the atlas half (0 = concrete cover, 0.5 = grate).
 */
function lidGeometry(u0) {
  const b = new GeoBuilder();
  const h = 0.1;
  const t = [b.vert(-0.5, h, -0.5, u0, 0), b.vert(0.5, h, -0.5, u0 + 0.5, 0), b.vert(0.5, h, 0.5, u0 + 0.5, 1), b.vert(-0.5, h, 0.5, u0, 1)];
  b.quad(t[0], t[3], t[2], t[1]);
  for (const sx of [-1, 1]) {
    const n = [sx, 0, 0];
    const x = sx * 0.5;
    const a0 = b.vert(x, 0, -0.5, u0, 0, undefined, n), a1 = b.vert(x, h, -0.5, u0, 0.03, undefined, n);
    const b0 = b.vert(x, 0, 0.5, u0 + 0.02, 0, undefined, n), b1 = b.vert(x, h, 0.5, u0 + 0.02, 0.03, undefined, n);
    if (sx > 0) b.quad(a0, a1, b1, b0);
    else b.quad(a0, b0, b1, a1);
  }
  return b.build({ colors: false });
}
