/**
 * terrain/roads — asphalt surfaces.
 *
 *  - main street: curved, sloped ribbon from the station-front road's south
 *    edge to the end of the street (carriageway + pedestrian shoulders)
 *  - station-front road, crossing road (two pieces either side of the level
 *    crossing deck), north road: straight ribbons
 *  - rounded kerb fillets at every junction corner
 *
 * Vertex colours carry the large-scale "life" of the road: tyre-polished wheel
 * paths, a darker oil strip in each lane centre, dusty shoulders, slow tonal
 * drift along the street.  The canvas texture adds cracks / seams / aggregate.
 */
import { ROADS } from '../../core/layout.js';
import { LIFT, SF, CR, NR, MS, MS_S0, MS_S1, CR_SEGMENTS, CORNERS, cornerArc, straightPoint, roadY, fbm, vnoise, smoothstep, groundY } from './common.js';

const UV = 1 / 8; // asphalt texture covers 8 m

/**
 * Asphalt tint (linear multipliers) for lateral offset d on a road whose
 * carriageway half-width is hw and outer edge (shoulder) is sh; a = distance along.
 */
function asphaltTint(d, a, hw, sh, seed, twoLane = true) {
  let k = 1.0;
  const ad = Math.abs(d);
  if (twoLane) {
    const lane = hw / 2;
    const dl = Math.abs(ad - lane);
    // polished wheel paths either side of the lane centre, darker oil drip strip in the middle
    k += 0.07 * Math.exp(-Math.pow((dl - 0.75) / 0.28, 2));
    k -= 0.07 * Math.exp(-Math.pow(dl / 0.3, 2));
  } else {
    k += 0.04 * Math.exp(-Math.pow((ad - 0.8) / 0.3, 2));
    k -= 0.04 * Math.exp(-Math.pow(ad / 0.35, 2));
  }
  // slow tonal drift + blotchy re-surfacing patches along the road
  k *= 0.97 + 0.06 * fbm(a * 0.045, d * 0.05 + seed, seed, 2);
  const patch = smoothstep(0.66, 0.72, vnoise(a * 0.09, d * 0.12 + seed * 3.1, seed + 7));
  k *= 1 - patch * 0.04;
  let r = k, g = k, b = k;
  // dusty, slightly warm shoulders outside the edge line
  const dust = smoothstep(hw - 0.1, sh, ad);
  r *= 1 + dust * 0.1;
  g *= 1 + dust * 0.08;
  b *= 1 + dust * 0.03;
  return [r, g, b];
}

/** Main street ribbon. */
function mainStreet(b) {
  const D = [];
  for (const d of [0, 0.4, 0.75, 1.1, 1.5, 1.9, 2.25, 2.6, 2.9, 3.05, 3.3, 3.6, 3.85, 4.0]) {
    D.push(d);
    if (d > 0) D.push(-d);
  }
  D.sort((a, c) => a - c);
  const step = 1.0;
  const nRows = Math.ceil((MS_S1 - MS_S0) / step);
  const zEdge = SF.z + SF.shoulder;
  b.grid(D.length - 1, nRows, (i, j) => {
    const s = Math.min(MS_S1, MS_S0 + j * step);
    const f = MS.atS(s);
    const d = D[i];
    let x = f.x + f.nx * d, z = f.z + f.nz * d;
    if (j === 0) {
      // first row: slide along the tangent onto the station-front road's edge (no overlap, no gap)
      const k = (zEdge - z) / f.tz;
      x += f.tx * k;
      z += f.tz * k;
    }
    return [x, roadY(x, z), z, d * UV, s * UV, asphaltTint(d, s, MS.halfWidth, MS.shoulder, 1)];
  });
}

/** Straight road ribbon between along-coords a0..a1 with lateral extent [dMin, dMax]. */
function straightRoad(b, road, a0, a1, dMin, dMax, seed, twoLane = true) {
  const D = [];
  const hw = road.halfWidth, sh = road.shoulder;
  const cand = [0, 0.35, 0.7, 1.05, 1.4, 1.8, hw - 0.4, hw - 0.1, hw, hw + 0.25, sh - 0.25, sh];
  for (const d of cand) {
    if (d <= 0) { D.push(0); continue; }
    D.push(d, -d);
  }
  const Ds = [...new Set(D.map((d) => Math.round(d * 1000) / 1000))].filter((d) => d >= dMin - 1e-6 && d <= dMax + 1e-6).sort((a, c) => a - c);
  if (Ds[0] > dMin) Ds.unshift(dMin);
  if (Ds[Ds.length - 1] < dMax) Ds.push(dMax);
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  const step = 1.5;
  const n = Math.max(1, Math.ceil((hi - lo) / step));
  b.grid(Ds.length - 1, n, (i, j) => {
    const a = Math.min(hi, lo + j * step);
    const d = Ds[i];
    const p = straightPoint(road, a, d);
    return [p.x, roadY(p.x, p.z), p.z, d * UV, a * UV, asphaltTint(d, a, hw, sh, seed, twoLane)];
  });
}

/** Asphalt fillet filling a rounded junction corner. */
function fillet(b, c) {
  const pts = cornerArc(c, c.R, 10);
  const tint = [1.03, 1.02, 1.0];
  const k = b.vert(c.K.x, roadY(c.K.x, c.K.z), c.K.z, c.K.x * UV, c.K.z * UV, tint);
  const ids = pts.map((p) => b.vert(p.x, roadY(p.x, p.z), p.z, p.x * UV, p.z * UV, tint));
  // decide winding from the first triangle
  const p0 = pts[0], p1 = pts[1];
  const ny = (p0.z - c.K.z) * (p1.x - c.K.x) - (p0.x - c.K.x) * (p1.z - c.K.z);
  for (let i = 0; i < ids.length - 1; i++) {
    if (ny > 0) b.tri(k, ids[i], ids[i + 1]);
    else b.tri(k, ids[i + 1], ids[i]);
  }
}

export function buildRoads(bins) {
  const b = bins.get('asphalt');
  mainStreet(b);
  straightRoad(b, SF, SF.from, SF.to, -SF.shoulder, SF.shoulder, 2);
  for (const seg of CR_SEGMENTS) straightRoad(b, CR, seg.z0, seg.z1, -CR.shoulder, CR.shoulder, 3, false);
  straightRoad(b, NR, NR.from, NR.to, -NR.shoulder, NR.shoulder, 4, false);
  for (const c of CORNERS) fillet(b, c);
  // north road: rounded dead end (turning bulb) at its east end
  {
    const x0 = NR.to, z0 = NR.z, R = NR.shoulder;
    const k = b.vert(x0, roadY(x0, z0), z0, x0 * UV, z0 * UV, [1, 1, 1]);
    const ids = [];
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      const x = x0 + Math.cos(a) * R, z = z0 + Math.sin(a) * R;
      ids.push(b.vert(x, roadY(x, z), z, x * UV, z * UV, [1.04, 1.03, 1.0]));
    }
    for (let i = 0; i < 12; i++) b.tri(k, ids[i + 1], ids[i]);
  }
}

export { asphaltTint, groundY, LIFT, ROADS };
