/**
 * terrain/paths — unpaved and utility surfaces:
 *   - levee-top gravel path (ROADS.leveePath) with worn bicycle tracks and
 *     grassy edges, a narrower path on the far levee
 *   - a gravel footpath from the crossing road's north end to concrete stairs
 *     (with cheek walls and a handrail) climbing the south levee
 *   - a small gravel monthly car park (月極駐車場) beside that footpath
 *   - railway corridor: inspection paths and open concrete drainage troughs
 *     along the fences
 */
import * as THREE from 'three';
import { TERRAIN, RAIL, PLATFORM, TREES, groundY } from '../../core/layout.js';
import { LIFT, LP, NR, CR, addSlab, fbm, lin, mixLin } from './common.js';

const GRAVEL_UV = 1 / 3;
const EDGE_GREEN = lin('#b6c98f');

/** Straight gravel strip along x (z0..z1 across) with worn tracks + grassy edges. */
function gravelStripX(b, x0, x1, z0, z1, yFn, { tracks = [], step = 2, seed = 1 } = {}) {
  const D = [0, 0.12, 0.3];
  for (const t of tracks) D.push(t - 0.18, t, t + 0.18);
  const w = z1 - z0;
  D.push(w - 0.3, w - 0.12, w);
  const Ds = [...new Set(D.filter((d) => d >= 0 && d <= w).map((d) => Math.round(d * 1000) / 1000))].sort((a, c) => a - c);
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  b.grid(Ds.length - 1, n, (i, j) => {
    const x = x0 + ((x1 - x0) * j) / n;
    const d = Ds[i];
    const z = z0 + d;
    const edge = Math.min(d, w - d);
    const g = Math.max(0, 1 - edge / 0.3) * (0.55 + 0.45 * fbm(x * 0.3, z, seed, 2));
    let c = [1, 1, 1];
    for (const t of tracks) if (Math.abs(d - t) < 0.1) c = [1.07, 1.06, 1.04];
    const k = 0.95 + 0.1 * fbm(x * 0.05, z * 0.2, seed + 1, 2);
    c = [c[0] * k, c[1] * k, c[2] * k];
    c = mixLin(c, EDGE_GREEN, g);
    return [x, yFn(x, z), z, z * GRAVEL_UV, x * GRAVEL_UV, c];
  });
}

/** Straight gravel strip along z. */
function gravelStripZ(b, z0, z1, x0, x1, yFn, seed = 3) {
  const n = Math.max(1, Math.ceil(Math.abs(z1 - z0) / 1.5));
  const D = [0, 0.15, (x1 - x0) / 2, x1 - x0 - 0.15, x1 - x0];
  b.grid(D.length - 1, n, (i, j) => {
    const z = z0 + ((z1 - z0) * j) / n;
    const x = x0 + D[i];
    const edge = Math.min(D[i], x1 - x0 - D[i]);
    const g = Math.max(0, 1 - edge / 0.25) * 0.8;
    const k = 0.95 + 0.1 * fbm(x * 0.2, z * 0.1, seed, 2);
    return [x, yFn(x, z), z, x * GRAVEL_UV, z * GRAVEL_UV, mixLin([k, k, k], EDGE_GREEN, g)];
  });
}

/** Pick an x for the levee stairs near `x0` that stays clear of the levee cherry trees. */
function stairsX(x0, lo, hi) {
  let best = x0, bestD = -1;
  for (let x = lo; x <= hi; x += 0.25) {
    let d = Infinity;
    for (const t of TREES) {
      if (t.z > -66 || t.z < -75) continue;
      d = Math.min(d, Math.abs(t.x - x));
    }
    const score = d - Math.abs(x - x0) * 0.15;
    if (score > bestD) { bestD = score; best = x; }
  }
  return best;
}

/** Concrete stairs up the south levee, each 0.2 m step ending where the slope reaches its height. */
function leveeStairs(bins, x, handrailPts) {
  const b = bins.get('concreteRaised');
  const T = TERRAIN;
  const n = Math.round(T.leveeHeight / 0.2);
  const W = 1.6;
  // z where the levee slope reaches y
  const zAt = (y) => {
    let a = T.leveeSouthFoot, c = T.leveeTopSouth;
    for (let i = 0; i < 40; i++) {
      const m = (a + c) / 2;
      if (groundY(x, m) < y) a = m; else c = m;
    }
    return (a + c) / 2;
  };
  let zPrev = T.leveeSouthFoot + 0.35;
  const stepCol = [1.0, 1.0, 1.0];
  const wallCol = [0.93, 0.93, 0.95];
  for (let i = 1; i <= n; i++) {
    const top = i * 0.2 + 0.02;
    const zEnd = i === n ? T.leveeTopSouth - 0.35 : zAt(i * 0.2);
    // step block: from zPrev (downhill) to zEnd (uphill)
    addSlab(b, { x, z: zPrev }, { x, z: zEnd }, W, (xx, zz) => groundY(xx, zz) - 0.25, top, i % 2 ? stepCol : [0.97, 0.97, 0.98], [0.1, 0.1, 0.6, 0.35]);
    // nosing strip (slightly lighter) so each step edge reads
    addSlab(b, { x, z: zPrev - 0.02 }, { x, z: zPrev - 0.07 }, W - 0.02, top - 0.05, top + 0.006, [1.08, 1.08, 1.08], [0.1, 0.1, 0.2, 0.2]);
    // cheek walls
    for (const s of [-1, 1]) {
      addSlab(b, { x: x + s * (W / 2 + 0.08), z: zPrev + 0.1 }, { x: x + s * (W / 2 + 0.08), z: zEnd }, 0.16, (xx, zz) => groundY(xx, zz) - 0.2, top + 0.14, wallCol, [0.3, 0.3, 0.8, 0.5]);
    }
    handrailPts.push(new THREE.Vector3(x + W / 2 + 0.08, top + 0.14 + 0.85, (zPrev + zEnd) / 2));
    zPrev = zEnd;
  }
  return { x, width: W };
}

/** Open concrete drainage trough (two low walls + dark wet bottom), along x. */
function troughX(bins, x0, x1, z) {
  const b = bins.get('concrete');
  const dark = lin('#6f7572');
  for (let x = x0; x < x1 - 0.1; x += 4) {
    const xe = Math.min(x1, x + 4);
    for (const s of [-1, 1]) addSlab(b, { x: x + 0.005, z: z + s * 0.2 }, { x: xe - 0.005, z: z + s * 0.2 }, 0.08, -0.02, 0.14, [0.96, 0.96, 0.97], [0.1, 0.1, 0.9, 0.2]);
    addSlab(b, { x, z }, { x: xe, z }, 0.32, -0.02, 0.018, dark, [0.2, 0.2, 0.8, 0.8]);
  }
}

export function buildPaths(ctx, bins) {
  const g = bins.get('gravel');
  const T = TERRAIN;
  // levee path: full length, bicycle-worn tracks
  const topY = T.leveeHeight + LIFT.path;
  gravelStripX(g, T.extentX[0], T.extentX[1], LP.z - LP.halfWidth, LP.z + LP.halfWidth, () => topY, { tracks: [1.05, 2.1], step: 3, seed: 5 });
  // far levee path (narrower)
  const fz = (T.farLeveeTopSouth + T.farLeveeTopNorth) / 2 - 0.9;
  gravelStripX(g, T.extentX[0], T.extentX[1], fz - 0.6, fz + 0.6, () => T.leveeHeight + LIFT.path, { tracks: [0.6], step: 3, seed: 6 });

  // stairs + footpath from the crossing road's end
  const sx = stairsX(CR.x, CR.x - 2.5, CR.x + 3.2);
  const handrail = [];
  const stairs = leveeStairs(bins, sx, handrail);
  const zFoot = T.leveeSouthFoot + 0.35;
  const zRoad = NR.z - NR.gutter[1] - 0.3;
  gravelStripZ(g, zRoad, zFoot, sx - 1.0, sx + 1.0, (x, z) => groundY(x, z) + LIFT.path);
  // top landing between the stairs and the levee path
  gravelStripZ(g, T.leveeTopSouth - 0.3, LP.z + LP.halfWidth, sx - 1.0, sx + 1.0, () => topY + 0.004);
  // handrail: posts + pipe (metal)
  const rail = new THREE.Group();
  const metal = ctx.toon.metal('#9aa3ad');
  if (handrail.length > 1) {
    const pts = [handrail[0].clone().setZ(zFoot + 0.25), ...handrail];
    pts[0].y = handrail[0].y - 0.15;
    const tube = new THREE.Mesh(ctx.geom.tubeAlong(pts, 0.024, 6), metal);
    tube.userData.noOutline = true;
    rail.add(tube);
    for (let i = 0; i < handrail.length; i += 3) {
      const p = handrail[i];
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.86, 6), metal);
      post.position.set(p.x, p.y - 0.43, p.z);
      post.userData.noOutline = true;
      rail.add(post);
    }
  }

  // monthly gravel car park west of the footpath
  const pk = { x0: 17.2, x1: sx - 1.3, z0: -60.6, z1: zRoad };
  gravelStripX(g, pk.x0, pk.x1, pk.z0, pk.z1, (x, z) => groundY(x, z) + LIFT.path, { tracks: [3.2, 7.3], step: 2, seed: 8 });
  // concrete wheel stops (車止め) at the back of each bay
  const cr = bins.get('concreteRaised');
  const bays = [];
  for (let x = pk.x0 + 0.6; x + 2.5 <= pk.x1 - 0.3; x += 2.6) {
    bays.push(x);
    addSlab(cr, { x: x + 0.45, z: pk.z0 + 1.3 }, { x: x + 2.05, z: pk.z0 + 1.3 }, 0.14, 0, 0.12 + LIFT.path, [0.95, 0.95, 0.96], [0.1, 0.1, 0.5, 0.2]);
  }

  // railway corridor: inspection paths + drainage troughs along both fences
  const xA = PLATFORM.xMin - PLATFORM.rampLength - 1.5, xB = PLATFORM.xMax + PLATFORM.rampLength + 1.0;
  const crossW = CR.x - CR.gutter[1] - 0.6, crossE = CR.x + CR.gutter[1] + 0.6;
  const zS = RAIL.corridor.zMax, zN = RAIL.corridor.zMin;
  const yP = (x, z) => groundY(x, z) + LIFT.path;
  gravelStripX(g, RAIL.xMin, xA, zS - 1.9, zS - 0.8, yP, { step: 4, seed: 9 });
  gravelStripX(g, crossE, RAIL.xMax, zS - 1.9, zS - 0.8, yP, { step: 4, seed: 10 });
  gravelStripX(g, xB, crossW, zS - 1.9, zS - 0.8, yP, { step: 2, seed: 11 });
  gravelStripX(g, RAIL.xMin, crossW, zN + 0.75, zN + 1.75, yP, { step: 4, seed: 12 });
  gravelStripX(g, crossE, RAIL.xMax, zN + 0.75, zN + 1.75, yP, { step: 4, seed: 13 });
  troughX(bins, RAIL.xMin, xA, zS - 0.42);
  troughX(bins, xB, crossW, zS - 0.42);
  troughX(bins, crossE, RAIL.xMax, zS - 0.42);
  troughX(bins, RAIL.xMin, crossW, zN + 0.42);
  troughX(bins, crossE, RAIL.xMax, zN + 0.42);

  // north road: gravel track continuing past the dead end
  gravelStripX(g, NR.to + NR.shoulder - 0.5, NR.to + 24, NR.z - 1.3, NR.z + 1.3, (x, z) => groundY(x, z) + LIFT.path, { tracks: [0.55, 2.05], step: 2, seed: 14 });

  return { rail, stairs, carPark: { ...pk, bays } };
}
