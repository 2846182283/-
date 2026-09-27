/**
 * terrain/lanes — the quiet blocks behind the frontage (layout ROADS.lanes):
 *
 *   - lane ends that no road reaches peter out into worn gravel paths
 *   - the vacant filler plots (layout skips ~20 % of the lane plots) get a use:
 *       家庭菜園  family vegetable plot — soil ridges (畝) with crop rows and a
 *                 few bamboo stake frames (instanced, one draw call)
 *       月極駐車場 gravel monthly car park — white line tapes + wheel stops
 *       空き地    plain grass lot (just more weeds, from vegetation.js)
 *
 * The asphalt, gutters, aprons and edge lines of the lanes themselves are
 * emitted by roads / gutters / paving / markings (LANES in common.js).
 */
import * as THREE from 'three';
import { ROADS, groundY, hashString, makeRng } from '../../core/layout.js';
import { LIFT, LANES, addSlab, fbm, lin, mixLin } from './common.js';
import { gravelStripX } from './paths.js';
import { surfaceQuad } from './markings.js';

const SOIL = lin('#9a7a5c');
const SOIL_DARK = lin('#7d624b');
const SOIL_DRY = lin('#b39a7c');

// same keep-out list layout.js uses when it places the filler lots
const KEEP_OUT = [
  { x: -46.5, z: -18.5, r: 4 },
  { x: 38.0, z: -21.6, r: 5 }, { x: -62, z: -21.5, r: 5 }, { x: -78, z: -21.8, r: 4.5 }, { x: -20.5, z: -20.0, r: 4.5 },
];

/**
 * Re-run layout's filler-lot walk and return the plots it left vacant
 * (deterministic: same hashes).  Each: {x0,x1,z0,z1, front:+1|-1 (lane side along z), h}.
 */
export function vacantPlots() {
  const out = [];
  for (const lane of ROADS.lanes) {
    const sides = lane.oneSide === 'north' ? [-1] : [-1, 1];
    for (const side of sides) {
      let x = lane.from + 1.5;
      for (let i = 0; ; i++) {
        const h = hashString(`fill-${lane.id}-${side}-${i}`);
        const w = 8 + (h % 25) / 10;
        const d = lane.oneSide ? 8.2 : 9 + ((h >>> 5) % 12) / 10;
        if (x + w > lane.to - 1) break;
        const cx = x + w / 2;
        const cz = lane.z + side * (lane.halfWidth + 0.6 + d / 2);
        const blocked = KEEP_OUT.some((k) => Math.abs(k.x - cx) < w / 2 + k.r && Math.abs(k.z - cz) < d / 2 + k.r);
        const vacant = (h >>> 9) % 10 < 2;
        if (!blocked && vacant) {
          out.push({ x0: x, x1: x + w, z0: cz - d / 2, z1: cz + d / 2, front: -side, h, lane: lane.id });
        }
        x += w + 1.2 + ((h >>> 17) % 15) / 10;
      }
    }
  }
  return out;
}

/** Use of a vacant plot: 'garden' | 'parking' | 'grass'. */
export const plotUse = (p) => {
  const u = (p.h >>> 21) % 10;
  return u < 5 ? 'garden' : u < 8 ? 'parking' : 'grass';
};

/** Family vegetable plot: soil bed, ridges along z, crop rows (returned as tuft specs), stakes. */
function garden(bins, p, crops, stakes) {
  const g = bins.get('gravel'); // pebbly gravel texture tinted to soil
  const rng = makeRng(p.h);
  const m = 0.6; // grass margin round the bed
  const x0 = p.x0 + m, x1 = p.x1 - m, z0 = p.z0 + m, z1 = p.z1 - m;
  const y0 = (x, z) => groundY(x, z) + 0.012;
  // flat bed
  g.grid(4, 4, (i, j) => {
    const x = x0 + ((x1 - x0) * i) / 4, z = z0 + ((z1 - z0) * j) / 4;
    const k = 0.9 + 0.2 * fbm(x * 0.4, z * 0.4, 17, 2);
    const c = mixLin(SOIL_DARK, SOIL_DRY, k - 0.9);
    return [x, y0(x, z), z, x / 3, z / 3, c];
  });
  // ridges (畝): trapezoid prisms running along z, 0.95 m pitch
  const pitch = 0.95, base = 0.62, topW = 0.36, hgt = 0.15;
  const nR = Math.floor((x1 - x0 - 0.2) / pitch);
  const rx0 = x0 + (x1 - x0 - nR * pitch) / 2 + pitch / 2;
  const crop = ['cabbage', 'lettuce', 'onion', 'peas', 'bare'];
  for (let r = 0; r < nR; r++) {
    const cx = rx0 + r * pitch;
    const za = z0 + 0.35, zb = z1 - 0.35;
    const n = Math.max(1, Math.ceil((zb - za) / 1.5));
    const prof = [[-base / 2, 0, SOIL_DARK], [-topW / 2, hgt, SOIL], [topW / 2, hgt, SOIL], [base / 2, 0, SOIL_DARK]];
    const b0 = g.count;
    for (let j = 0; j <= n; j++) {
      const z = za + ((zb - za) * j) / n;
      for (const [dx, dy, c] of prof) g.vert(cx + dx, y0(cx + dx, z) + dy, z, (cx + dx) / 3, z / 3, c, dy > 0 ? [0, 1, 0] : [Math.sign(dx) * 0.7, 0.7, 0]);
    }
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < 3; k++) {
        const a = b0 + j * 4 + k, c = a + 4;
        g.quad(a, c, c + 1, a + 1);
      }
    }
    // end caps
    for (const [row, flip] of [[0, true], [n, false]]) {
      const i0 = b0 + row * 4;
      if (flip) { g.tri(i0, i0 + 1, i0 + 2); g.tri(i0, i0 + 2, i0 + 3); } else { g.tri(i0, i0 + 2, i0 + 1); g.tri(i0, i0 + 3, i0 + 2); }
    }
    // crops along the ridge top
    const kind = crop[(r + (p.h & 3)) % crop.length];
    if (kind === 'bare') continue;
    const step = kind === 'onion' ? 0.18 : kind === 'peas' ? 0.3 : 0.42;
    for (let z = za + 0.25; z < zb - 0.15; z += step) {
      if (rng() < 0.08) continue;
      const x = cx + (rng() - 0.5) * 0.06;
      const y = y0(x, z) + hgt - 0.02;
      if (kind === 'cabbage') crops.push({ x, y, z, h: 0.2 + rng() * 0.06, w: 2.0, pal: 'cabbage' });
      else if (kind === 'lettuce') crops.push({ x, y, z, h: 0.14 + rng() * 0.05, w: 2.2, pal: 'lettuce' });
      else if (kind === 'onion') crops.push({ x, y, z, h: 0.32 + rng() * 0.1, w: 0.35, pal: 'onion' });
      else crops.push({ x, y, z, h: 0.35 + rng() * 0.15, w: 0.8, pal: 'peas' });
    }
    // peas climb an A-frame of bamboo stakes with a ridge pole
    if (kind === 'peas') {
      const top = y0(cx, za) + hgt + 1.25;
      for (let z = za + 0.2; z <= zb - 0.1; z += 0.9) {
        for (const s of [-1, 1]) stakes.push({ a: new THREE.Vector3(cx + s * 0.28, y0(cx, z) + hgt - 0.05, z), b: new THREE.Vector3(cx - s * 0.05, top, z), r: 0.011 });
      }
      stakes.push({ a: new THREE.Vector3(cx, top - 0.08, za + 0.1), b: new THREE.Vector3(cx, top - 0.08, zb), r: 0.012 });
    }
  }
  // stepping slabs along the lane-side edge (flat: no shadow casting)
  const conc = bins.get('concrete');
  const zf = p.front > 0 ? p.z1 - 0.3 : p.z0 + 0.3;
  for (let x = p.x0 + 0.8; x < p.x1 - 0.8; x += 1.1) {
    addSlab(conc, { x, z: zf }, { x: x + 0.7, z: zf }, 0.3, (xx, zz) => groundY(xx, zz) - 0.02, (xx, zz) => groundY(xx, zz) + 0.04, [0.9, 0.88, 0.86], [0.1, 0.1, 0.4, 0.3]);
  }
}

/** Gravel monthly car park: bays along x, white line tapes along z, wheel stops at the back. */
function parking(bins, p, atlas) {
  const g = bins.get('gravel');
  const yP = (x, z) => groundY(x, z) + LIFT.path;
  // gravel strip along x with two worn tyre tracks per bay row
  const depth = p.z1 - p.z0;
  const trackA = p.front > 0 ? depth - 1.4 : 1.4;
  gravelStripX(g, p.x0 + 0.2, p.x1 - 0.2, p.z0 + 0.2, p.z1 - 0.2, yP, { tracks: [trackA - 0.2, depth / 2], step: 2, seed: p.h & 255 });
  const mk = bins.get('marks');
  const cr = bins.get('concreteRaised');
  const bayW = 2.5;
  const n = Math.floor((p.x1 - p.x0 - 0.8) / bayW);
  const bx0 = p.x0 + (p.x1 - p.x0 - n * bayW) / 2;
  const zBack = p.front > 0 ? p.z0 + 0.9 : p.z1 - 0.9;
  const zFront = p.front > 0 ? p.z1 - 0.8 : p.z0 + 0.8;
  const zMid = (zBack + zFront) / 2, len = Math.abs(zFront - zBack);
  const yL = (x, z) => yP(x, z) + 0.008;
  for (let i = 0; i <= n; i++) {
    const x = bx0 + i * bayW;
    surfaceQuad(mk, x, zMid, 0, 1, len, 0.07, atlas.cell('white2', 20), yL);
  }
  for (let i = 0; i < n; i++) {
    const x = bx0 + (i + 0.5) * bayW;
    const zs = zBack + (p.front > 0 ? 0.35 : -0.35);
    addSlab(cr, { x: x - 0.75, z: zs }, { x: x + 0.75, z: zs }, 0.14, (xx, zz) => groundY(xx, zz), (xx, zz) => groundY(xx, zz) + 0.13, [0.95, 0.95, 0.96], [0.1, 0.1, 0.5, 0.2]);
  }
}

/**
 * Build lane ends + vacant-plot uses.  Returns { crops, stakeMesh, grassPlots }.
 * crops are tuft specs for vegetation.js (same instanced mesh as the weeds).
 */
export function buildLanes(ctx, bins, atlas) {
  const g = bins.get('gravel');
  // ---- unconnected lane ends: gravel paths fading into grass ----------------
  for (const l of LANES) {
    const z0 = l.z - l.hw * 0.75, z1 = l.z + l.hw * 0.75;
    const yP = (x, z) => groundY(x, z) + LIFT.path;
    const tracks = [l.hw * 0.75 - 0.55, l.hw * 0.75 + 0.55];
    if (!l.join0) gravelStripX(g, l.x0 - 7, l.x0, z0, z1, yP, { tracks, step: 1, seed: 21, fade: [l.x0 - 1.5, l.x0 - 7] });
    if (!l.join1) gravelStripX(g, l.x1, l.x1 + 7, z0, z1, yP, { tracks, step: 1, seed: 22, fade: [l.x1 + 1.5, l.x1 + 7] });
  }

  // ---- vacant plots ----------------------------------------------------------
  const crops = [];
  const stakes = [];
  const grassPlots = [];
  for (const p of vacantPlots()) {
    const use = plotUse(p);
    if (use === 'garden') garden(bins, p, crops, stakes);
    else if (use === 'parking') parking(bins, p, atlas);
    else grassPlots.push(p);
  }

  // bamboo stakes: one instanced unit cylinder (noOutline: thin sticks would outline to mush)
  let stakeMesh = null;
  if (stakes.length) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    geo.translate(0, 0.5, 0);
    const mat = ctx.toon.mat('#cdb784', { name: 'terrainBamboo' });
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const list = stakes.map((st) => {
      dir.subVectors(st.b, st.a);
      const L = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      s.set(st.r, L, st.r);
      return new THREE.Matrix4().compose(st.a, q, s);
    });
    stakeMesh = ctx.geom.instanced(geo, mat, list, { castShadow: true, noOutline: true });
    stakeMesh.name = 'terrain:stakes';
  }
  return { crops, stakeMesh, grassPlots };
}
