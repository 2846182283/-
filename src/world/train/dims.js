/**
 * Train body dimensions & shape functions shared by every train sub-module.
 *
 * Car-local frame: X along the car (cab / "front" end at +X for a cab car),
 * Y up in WORLD height (y = 0 is the railway ground, the car sits on the rails),
 * Z across the car (z = 0 is the track centreline).
 */
import { TRAIN, RAIL, PLATFORM } from '../../core/layout.js';

export const D = {
  L: TRAIN.carLength, // 18 m coupler face to coupler face
  half: TRAIN.carLength / 2, // 9
  bodyHalf: TRAIN.carLength / 2 - TRAIN.carGap / 2, // 8.7: body end wall
  hw: TRAIN.width / 2, // 1.4 half width (outer wall face)
  railTop: RAIL.railTop, // 0.45
  floorY: PLATFORM.top, // 1.55
  bodyBottom: 1.28, // bottom edge of the side walls
  wallTop: 3.62, // side wall -> roof shoulder
  roofTop: TRAIN.roofY, // 4.10
  stripe: [2.02, 2.24], // sakura-pink line under the windows
  band: [3.52, 3.58], // thin pink roofline band
  win: [2.42, 3.42], // window sill / head
  doorTop: 3.42,
  doorHalf: 0.65, // passenger door opening half width (1.3 m)
  pocket: 0.72, // wall pier beside each door that hides the open leaf
  wallIn: 1.36, // outer wall inner face (outer face = hw)
  leafZ: 1.34, // door leaf centre plane
  liningOut: 1.32,
  liningIn: 1.28,
  ceilingY: 3.86,
  bogieX: 6.0, // bogie centres at +-6
  axleHalf: 1.05, // half wheelbase
  wheelR: 0.43,
  wheelZ: 0.57, // wheel tread centre from track centre
  cabBack: 6.8, // cab partition x (cab cars)
  roofP: 2.6, // superellipse exponent of the roof profile
};
D.wheelY = D.railTop + D.wheelR; // axle centre height 0.88

/** Door centre positions per car type (car-local x). */
export const DOORS = {
  cab: [-6.6, -0.6, 5.4],
  mid: [-6.0, 0.0, 6.0],
};
/** Cab car crew door (static) span on each side. */
export const CREW_DOOR = { a: 6.88, b: 7.4, lo: 1.62, hi: 3.42 };

/** Roof height above the car centreline at lateral offset z (superellipse shoulder). */
export function roofY(z) {
  const a = Math.min(1, Math.abs(z) / D.hw);
  return D.wallTop + (D.roofTop - D.wallTop) * Math.sqrt(Math.max(0, 1 - Math.pow(a, D.roofP)));
}

/** Analytic outward normal of the roof profile at z (x component 0). returns [ny, nz]. */
export function roofNormal(z) {
  const a = D.hw, b = D.roofTop - D.wallTop;
  const y = roofY(z) - D.wallTop;
  const az = Math.abs(z);
  let nz = (D.roofP * Math.pow(Math.max(az, 1e-5), D.roofP - 1)) / Math.pow(a, D.roofP);
  let ny = (2 * y) / (b * b);
  if (az >= a - 1e-4) { nz = 1; ny = 0; }
  const l = Math.hypot(nz, ny) || 1;
  return [ny / l, (Math.sign(z) || 1) * nz / l];
}

/**
 * Lateral sample positions (z) for the roof / cab front grids.  Dense near the
 * shoulders (vertical tangent) and including the cab mask / windscreen edges so
 * the per-cell colouring of the cab front has crisp boundaries.
 */
export const Z_COLS = (() => {
  const must = [D.hw, 1.28, 1.12, 0.06];
  const cand = [1.395, 1.37, 1.33, 0.9, 0.62, 0.34];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = (i / n) * (Math.PI / 2);
    cand.push(D.hw * Math.pow(Math.cos(t), 2 / D.roofP));
  }
  const keep = [...must];
  for (const v of cand.sort((a, b) => b - a)) {
    if (v > 1e-3 && keep.every((k) => Math.abs(k - v) > 0.02)) keep.push(v);
  }
  keep.sort((a, b) => a - b);
  return [...keep.map((v) => -v).reverse(), 0, ...keep];
})();

// ---------------------------------------------------------------------------
// cab front surface: x = xFront(y, z)
// ---------------------------------------------------------------------------
export const CAB = {
  xb: 8.72, // body front at the bottom (the coupler face is at 9.0)
  planSetback: 0.3, // corners pulled back (rounded plan)
  maskLo: 2.3,
  maskZ: 1.28,
  maskTopF: 0.6, // mask reaches this fraction of the brow above the wall top
  winLo: 2.42,
  winHi: 3.48,
  winZ: [0.06, 1.12], // two windscreen panes |z| in this range
  ledY: [3.56, 3.8],
  lampY: 1.74,
};

export function rake(y) {
  if (y < 2.3) return 0.06 * Math.max(0, y - D.bodyBottom) / (2.3 - D.bodyBottom);
  if (y < D.wallTop) return 0.06 + 0.34 * Math.pow((y - 2.3) / (D.wallTop - 2.3), 1.3);
  return 0.4 + 0.36 * Math.pow(Math.min(1, (y - D.wallTop) / (D.roofTop - D.wallTop)), 1.7);
}
export function plan(z) {
  return CAB.planSetback * Math.pow(Math.min(1, Math.abs(z) / D.hw), 3);
}
export function xFront(y, z) {
  return CAB.xb - plan(z) - rake(y);
}
/** Unit outward normal of the cab front at (y, z). */
export function frontNormal(y, z, out = [0, 0, 0]) {
  const e = 0.004;
  const dy = (xFront(y + e, z) - xFront(y - e, z)) / (2 * e);
  const dz = (xFront(y, z + e) - xFront(y, z - e)) / (2 * e);
  const l = Math.hypot(1, dy, dz);
  out[0] = 1 / l; out[1] = -dy / l; out[2] = -dz / l;
  return out;
}

/** Rows (y) of the cab front grid below the wall top.  Band / mask / window edges are rows. */
export const Y_ROWS = [D.bodyBottom, 1.5, 1.74, D.stripe[0], D.stripe[1], CAB.maskLo, CAB.winLo, 2.7, 2.98, 3.24, CAB.winHi, D.band[0], D.band[1], D.wallTop];
/** Fractions of the brow (wall top -> roof) used as extra rows. */
export const BROW_F = [0.2, 0.4, CAB.maskTopF, 0.8, 1.0];
