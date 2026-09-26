/**
 * crossing/deck.js — the road surface over the tracks (踏切道).
 *
 *   south ramp (asphalt) -> track A rubber panels -> concrete filler ->
 *   track B rubber panels -> north ramp, all flush with the rail head
 *   (RAIL.railTop) with ~70 mm flangeway gaps inside each rail.  The rails are
 *   railway.js's and run straight through; this module only fills around them.
 *
 * Painted edge lines and the pale-green pedestrian strips are part of the
 * surface textures (see textures.js) so they follow the ramp slope exactly.
 */
import * as THREE from 'three';
import { CROSSING, RAIL, ROADS } from '../../core/layout.js';
import { DECK } from './textures.js';
import { regionUV } from './kit.js';

const X0 = CROSSING.x;
const HW = DECK.halfW;
const RO = RAIL.gauge / 2 + 0.033; // rail centre offset from the track centre
const HEAD = 0.034; // rail head half width (+ clearance)
const FLANGE = 0.07; // flangeway gap inside each rail
const OUTER = 0.8; // outer panel width
const TOP = RAIL.railTop; // deck surface height
const ROAD_Y = 0.03; // terrain asphalt height (LIFT.road)
const TA = RAIL.tracks.find((t) => t.id === 'A');
const TB = RAIL.tracks.find((t) => t.id === 'B');

/** z extents of every deck piece, south (+z) to north (-z). */
export function deckLayout() {
  const panels = [];
  for (const t of [TA, TB]) {
    const rs = t.z + RO, rn = t.z - RO; // south / north rail
    panels.push({ kind: 'outer', z0: rs + HEAD + 0.01, z1: rs + HEAD + 0.01 + OUTER, track: t.id });
    panels.push({ kind: 'inner', z0: rn + HEAD + FLANGE, z1: rs - HEAD - FLANGE, track: t.id });
    panels.push({ kind: 'outer', z0: rn - HEAD - 0.01 - OUTER, z1: rn - HEAD - 0.01, track: t.id });
  }
  const aS = TA.z + RO + HEAD + 0.01 + OUTER; // top of the south ramp
  const aN = TB.z - RO - HEAD - 0.01 - OUTER; // top of the north ramp
  const midS = TA.z - RO - HEAD - 0.01 - OUTER, midN = TB.z + RO + HEAD + 0.01 + OUTER;
  return {
    panels,
    rampS: { zLow: CROSSING.deckZ[0], zHigh: aS },
    rampN: { zLow: CROSSING.deckZ[1], zHigh: aN },
    mid: { z0: midN, z1: midS },
    rails: [TA.z + RO, TA.z - RO, TB.z + RO, TB.z - RO],
  };
}

/** Ramp profile: eased so it meets the road and the deck without a kink. */
export function rampY(t) {
  const s = t * t * (3 - 2 * t);
  return ROAD_Y + (TOP - ROAD_Y) * s;
}

/** Height of the deck surface at z (for placing things on it). */
export function deckY(z) {
  const L = deckLayout();
  if (z > L.rampS.zLow || z < L.rampN.zLow) return ROAD_Y;
  if (z > L.rampS.zHigh) return rampY((L.rampS.zLow - z) / (L.rampS.zLow - L.rampS.zHigh));
  if (z < L.rampN.zHigh) return rampY((z - L.rampN.zLow) / (L.rampN.zHigh - L.rampN.zLow));
  return TOP;
}

/** Sloped ramp surface (atlas 'ramp'), u across the road, v = 0 at the road end. */
function rampSurface(kit, zLow, zHigh) {
  const nz = 14, nx = 6;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) {
    const t = j / nz;
    const z = zLow + (zHigh - zLow) * t;
    const y = rampY(t);
    for (let i = 0; i <= nx; i++) {
      const x = X0 - HW + (2 * HW * i) / nx;
      pos.push(x, y, z);
      uv.push(i / nx, t);
    }
  }
  const flip = zHigh > zLow; // keep the front face up for either direction
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      if (flip) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  regionUV(g, kit.R.ramp);
  kit.add('atlas', g);

  // side walls (concrete) under the sloped edge, both sides
  for (const s of [-1, 1]) {
    const wp = [], wi = [];
    for (let j = 0; j <= nz; j++) {
      const t = j / nz;
      const z = zLow + (zHigh - zLow) * t;
      wp.push(X0 + s * HW, rampY(t), z, X0 + s * HW, -0.02, z);
    }
    for (let j = 0; j < nz; j++) {
      const a = j * 2, b = a + 1, c = a + 2, d = a + 3;
      // outward facing (+x for s = 1)
      const out = (s > 0) === flip;
      if (out) wi.push(a, c, b, b, c, d);
      else wi.push(a, b, c, b, d, c);
    }
    const w = new THREE.BufferGeometry();
    w.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    w.setIndex(wi);
    w.computeVertexNormals();
    kit.add('vc', w, '#b7b4ac');
  }
  // concrete kerb stones along both edges of the ramp (low, reads as a clean outline)
  const zs = Math.min(zLow, zHigh), ze = Math.max(zLow, zHigh);
  const f = kit.world;
  for (const s of [-1, 1]) {
    for (let z = zs; z < ze - 0.05; z += 0.6) {
      const z1 = Math.min(ze, z + 0.6);
      const zc = (z + z1) / 2;
      const t = (zc - zLow) / (zHigh - zLow);
      const y = rampY(Math.min(1, Math.max(0, t)));
      const ang = Math.atan2(rampY(Math.min(1, t + 0.02)) - rampY(Math.max(0, t - 0.02)), Math.abs(zHigh - zLow) * 0.04);
      // the edge block tilts with the slope (rotation about x)
      f.box('vc', 0.16, 0.08, z1 - z - 0.02, '#d3d0c8', X0 + s * (HW + 0.08), y - 0.02, zc, { rx: zHigh < zLow ? ang : -ang });
    }
  }
}

/** Mirror a non-indexed geometry in x, keeping the triangles front-facing. */
function mirrorX(g) {
  g.scale(-1, 1, 1);
  for (const at of Object.values(g.attributes)) {
    const n = at.itemSize, a = at.array;
    for (let i = 0; i < at.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = a[(i + 1) * n + k];
        a[(i + 1) * n + k] = a[(i + 2) * n + k];
        a[(i + 2) * n + k] = t;
      }
    }
  }
  return g;
}

/**
 * Triangular end wedge: vertical face at x = 0 from yLow to yTop, sloping
 * out to x = s * w at yLow; extruded `d` along z (centred).
 */
function endWedge(w, yTop, yLow, d, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, yLow);
  sh.lineTo(w, yLow);
  sh.lineTo(0, yTop);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  if (s < 0) mirrorX(g);
  g.computeVertexNormals();
  return g;
}

/** Rubber panels, concrete filler, flangeway bottoms and steel end angles. */
function panels(kit, L) {
  const f = kit.world;
  const R = kit.R;
  for (const p of L.panels) {
    const zc = (p.z0 + p.z1) / 2, d = p.z1 - p.z0;
    // body (dark rubber, a hair below the textured top)
    f.block('vc', 2 * HW, TOP - 0.004 - RAIL.sleeperTop, d, '#43454b', X0, RAIL.sleeperTop, zc);
    // textured top
    const g = regionUV(new THREE.PlaneGeometry(2 * HW, d), R.rubber);
    kit.add('atlas', g, '#fff', f.m(X0, TOP, zc, -Math.PI / 2));
    // steel end angles at both ends (catch the light, crisp outline)
    for (const s of [-1, 1]) f.box('metal', 0.05, 0.06, d, '#80858c', X0 + s * (HW + 0.02), TOP - 0.03, zc);
    // tapered rubber end pieces (端部ゴム) sloping down to the ballast
    for (const s of [-1, 1]) kit.add('vc', endWedge(0.3, TOP - 0.006, 0.24, d - 0.01, s), '#6b6d74', f.m(X0 + s * HW, 0, zc));
  }
  // flangeway bottoms (dark rubber boots) inside each rail
  for (const t of [TA, TB]) {
    for (const s of [-1, 1]) {
      const zr = t.z + s * RO;
      const zg = zr - s * (HEAD + FLANGE / 2);
      f.box('vcS', 2 * HW, 0.02, FLANGE, '#2a2b30', X0, TOP - 0.1, zg);
    }
  }
  // concrete filler between the tracks: solid block down to the ballast
  const m = L.mid;
  const zc = (m.z0 + m.z1) / 2, d = m.z1 - m.z0;
  f.block('vc', 2 * HW, TOP - 0.004, d, '#aaa79f', X0, 0, zc);
  kit.add('atlas', regionUV(new THREE.PlaneGeometry(2 * HW, d), R.mid), '#fff', f.m(X0, TOP, zc, -Math.PI / 2));
  // sloped concrete ends of the filler
  for (const s of [-1, 1]) kit.add('vc', endWedge(0.55, TOP - 0.004, 0.12, d, s), '#bdbab2', f.m(X0 + s * HW, 0, zc));
}

/** Painted decals on the deck / approaches: bicycle navigation arrows and pedestrian waiting marks. */
function decals(kit, L) {
  const D = kit.DR;
  const f = kit.world;
  const cr = ROADS.crossingRoad;
  // bicycle navigation arrows on both lanes' outer edge, pointing across the tracks (keep-left traffic)
  const lane = cr.edgeLine - 0.55;
  const bike = (x, z, y, heading, slope = 0) => {
    const g = regionUV(new THREE.PlaneGeometry(0.62, 1.24), D.bikeNav);
    // plane lies flat; texture top points along `heading` (0 = -z / north)
    kit.add('decal', g, '#fff', f.m(x, y + 0.012, z, -Math.PI / 2 + slope, heading, 0));
  };
  bike(X0 - lane, (L.mid.z0 + L.mid.z1) / 2, TOP, 0); // northbound on the west half
  bike(X0 + lane, (L.mid.z0 + L.mid.z1) / 2, TOP, Math.PI); // southbound on the east half
  // pedestrian waiting marks just behind the barrier line, on the road edge, text toward the tracks
  const wait = (x, z, heading) => {
    const g = regionUV(new THREE.PlaneGeometry(1.2, 0.45), D.wait);
    kit.add('decal', g, '#fff', f.m(x, ROAD_Y + 0.014, z, -Math.PI / 2, heading, 0));
  };
  for (const s of [-1, 1]) {
    wait(X0 + s * (cr.edgeLine - 0.72), CROSSING.zSouth + 1.1, 0);
    wait(X0 + s * (cr.edgeLine - 0.72), CROSSING.zNorth - 1.1, Math.PI);
  }
}

export function buildDeck(kit) {
  const L = deckLayout();
  rampSurface(kit, L.rampS.zLow, L.rampS.zHigh);
  rampSurface(kit, L.rampN.zLow, L.rampN.zHigh);
  panels(kit, L);
  decals(kit, L);
  return L;
}
