/**
 * props/common.js — shared placement helpers: which walkable surface a point
 * sits on (terrain lifts its paved layers a few cm above layout.groundY) and
 * which spatial cluster a prop belongs to.
 */
import { MAIN_STREET, ROADS, PLAZA, PLATFORM, LOTS, groundY } from '../../core/layout.js';

// terrain's height stack (see terrain/common.js): asphalt +0.03, gutter covers +0.05,
// aprons / plaza +0.07, konbini forecourt +0.11
const LIFT = { road: 0.03, gutter: 0.05, apron: 0.07, plaza: 0.07, konbini: 0.11 };

const konbini = LOTS.find((l) => l.type === 'konbini');

function inPlaza(x, z) {
  if (x > PLAZA.xMin - 0.5 && x < PLAZA.xMax + 0.5 && z > -24 && z < PLAZA.zMax) return true;
  const E = PLAZA.east;
  return x > E.xMin - 0.3 && x < E.xMax && z > E.zMin && z < E.zMax;
}

/** Signed lateral offset from the main-street centreline (+ = east) and the frame. */
export function mainOffset(x, z) {
  const f = MAIN_STREET.atZ(z);
  return { d: (x - f.x) * f.nx + (z - f.z) * f.nz, f };
}

/**
 * Height of the walkable surface at (x, z) relative to `baseY` (the spot's y).
 * Platform spots (baseY = PLATFORM.top) sit directly on the platform.
 */
export function surfaceY(x, z, baseY = groundY(x, z)) {
  if (Math.abs(baseY - PLATFORM.top) < 1e-3) return 0;
  const g = groundY(x, z) - baseY;
  if (inPlaza(x, z)) return g + LIFT.plaza;
  if (konbini) {
    // forecourt in front of the konbini (between the gutter and the shop front)
    const c = Math.cos(konbini.rotY), s = Math.sin(konbini.rotY);
    const lx = (x - konbini.x) * c - (z - konbini.z) * s;
    const lz = (x - konbini.x) * s + (z - konbini.z) * c;
    if (Math.abs(lx) < konbini.width / 2 + 0.5 && lz > konbini.depth / 2 - 0.2 && lz < konbini.depth / 2 + konbini.setback + 0.2) return g + LIFT.konbini;
  }
  if (z > ROADS.stationFront.z + ROADS.stationFront.gutter[1]) {
    const d = Math.abs(mainOffset(x, z).d);
    if (d < MAIN_STREET.gutter[0]) return g + LIFT.road;
    if (d < MAIN_STREET.gutter[1]) return g + LIFT.gutter;
    return g + LIFT.apron;
  }
  // straight roads (station front, crossing road, north road)
  const sf = ROADS.stationFront, cr = ROADS.crossingRoad, nr = ROADS.northRoad;
  if (Math.abs(z - sf.z) < sf.gutter[0] || Math.abs(x - cr.x) < cr.gutter[0] || Math.abs(z - nr.z) < nr.gutter[0]) return g + LIFT.road;
  return g;
}

/** Cluster name for a world position (keeps merged meshes spatially compact for culling). */
export function clusterAt(x, z, y = 0) {
  if (y > 1) return z < -32 ? 'platform2' : 'platform1';
  if (x < -35 && z < -10) return 'shrine';
  if (z < -40) return 'north';
  if (z < 4.5 || (z < 12 && Math.abs(x) > 6)) return x < -2 ? 'plazaW' : 'plazaE';
  if (z < 45) return 'streetN';
  if (z < 80) return 'streetM';
  return 'streetS';
}
