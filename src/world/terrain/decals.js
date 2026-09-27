/**
 * terrain/decals — the small "environmental storytelling" layer on the
 * ground, all in one atlas mesh:
 *   manhole lids (one painted sakura design per street), valve / meter / gas
 *   lids, the hydrant lid inside each yellow box, asphalt repair patches,
 *   crack clusters, wet drainage streaks and stains by the grates, oil drips
 *   under parked cars, sand drifts at the kerbs, survey / utility spray marks,
 *   dry leaves, tyre marks at the stop line, plaza stains and tree-pit soil.
 */
import { SPOTS, LOTS, PLAZA, makeRng } from '../../core/layout.js';
import { LIFT, SF, CR, NR, MS, MS_S0, MS_S1, LANES, onRoad, groundY } from './common.js';
import { surfaceQuad } from './markings.js';
import { PLAZA_Y, plazaTrees } from './paving.js';

const roadDecalY = (x, z) => groundY(x, z) + LIFT.decal;
const plazaDecalY = () => PLAZA_Y + 0.004;
const apronDecalY = (x, z) => groundY(x, z) + LIFT.apron + 0.006;

export function buildDecals(bins, atlas, { grateSpots, hydrants }) {
  const b = bins.get('decals');
  const rng = makeRng(2718);
  const put = (name, x, z, dx, dz, len, wid, yFn = roadDecalY) => surfaceQuad(b, x, z, dx, dz, len, wid, atlas.uv(name), yFn, [1, 1, 1]);
  const rot = () => {
    const a = rng() * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  };

  // ---- main street -----------------------------------------------------------
  let k = 0;
  for (let s = MS_S0 + 9; s < MS_S1 - 4; s += 24 + rng() * 8) {
    const f = MS.atS(s);
    const lat = k % 2 ? 1.2 : -1.3;
    const x = f.x + f.nx * lat, z = f.z + f.nz * lat;
    const name = k === 2 || k === 5 ? 'manholeSakura' : k % 3 === 1 ? 'manholeRain' : 'manholePlain';
    put(name, x, z, f.tx, f.tz, 0.74, 0.74);
    // a survey mark next to some lids
    if (k % 3 === 0) put(rng.pick(['sprayA', 'sprayC']), x + f.nx * 0.9, z + f.nz * 0.9, f.tx, f.tz, 0.5, 0.5);
    k++;
  }
  // repair patches, crack clusters, sand at the kerbs, small lids
  for (let s = MS_S0 + 3; s < MS_S1 - 3; s += 5 + rng() * 9) {
    const f = MS.atS(s);
    const r = rng();
    const lat = (rng() - 0.5) * 5.2;
    const x = f.x + f.nx * lat, z = f.z + f.nz * lat;
    if (r < 0.18) put('patchA', x, z, f.tx, f.tz, 1.1 + rng() * 1.4, 0.8 + rng() * 0.8);
    else if (r < 0.46) put(rng.pick(['patchB', 'patchC']), x, z, f.tx, f.tz, 0.8 + rng() * 0.5, 0.8 + rng() * 0.5);
    else if (r < 0.62) put('cracks', x, z, ...rot(), 1.3, 1.3);
    else if (r < 0.74) { const d = rng() < 0.5 ? -2.4 : 2.4; put('valve', f.x + f.nx * d, f.z + f.nz * d, f.tx, f.tz, 0.32, 0.32); }
    else if (r < 0.82) { const d = rng() < 0.5 ? -3.4 : 3.4; put('sqCover', f.x + f.nx * d, f.z + f.nz * d, f.tx, f.tz, 0.4, 0.3); }
    else { const d = rng() < 0.5 ? -1.5 : 1.5; put('oil', f.x + f.nx * d, f.z + f.nz * d, f.tx, f.tz, 1.2, 0.9); }
    // sand drift along the kerb
    if (rng() < 0.45) {
      const side = rng() < 0.5 ? -1 : 1;
      const d = side * 3.78;
      put('sand', f.x + f.nx * d, f.z + f.nz * d, f.tx, f.tz, 2.2 + rng() * 2, 0.5);
    }
  }
  // tyre marks at the stop line + junction mouth
  {
    const f = MS.atZ(16.5);
    put('tireMark', f.x - f.nx * 1.5, f.z - f.nz * 1.5, f.tx, f.tz, 3.2, 1.6);
  }

  // ---- straight roads: lids, patches, sprays ---------------------------------
  const straight = (road, a0, a1, seed) => {
    const r2 = makeRng(seed);
    for (let a = a0 + 5; a < a1 - 5; a += 7 + r2() * 11) {
      const r = r2();
      const lat = (r2() - 0.5) * (road.halfWidth * 1.6);
      const p = road.axis === 'x' ? { x: a, z: road.z + lat } : { x: road.x + lat, z: a };
      const t = road.axis === 'x' ? [1, 0] : [0, 1];
      if (r < 0.14) put(r2() < 0.25 ? 'manholeSakura' : 'manholePlain', p.x, p.z, ...t, 0.74, 0.74);
      else if (r < 0.4) put('patchA', p.x, p.z, ...t, 1.2 + r2() * 1.6, 0.8 + r2());
      else if (r < 0.52) put('patchC', p.x, p.z, ...t, 1.0, 1.0);
      else if (r < 0.64) put('cracks', p.x, p.z, ...rot(), 1.3, 1.3);
      else if (r < 0.72) put('valve', p.x, p.z, ...t, 0.32, 0.32);
      else if (r < 0.8) put(r2.pick(['sprayB', 'sprayD', 'sprayA']), p.x, p.z, ...t, 0.55, 0.55);
      if (r2() < 0.35) {
        const side = r2() < 0.5 ? -1 : 1;
        const d = side * (road.shoulder - 0.22);
        const q = road.axis === 'x' ? { x: a + 2, z: road.z + d } : { x: road.x + d, z: a + 2 };
        put('sand', q.x, q.z, ...t, 2.4, 0.42);
      }
    }
  };
  straight(SF, SF.from, SF.to, 31);
  straight(CR, -26, 3.4, 32);
  straight(NR, NR.from, NR.to, 33);
  LANES.forEach((l, i) => straight(l, l.x0, l.x1, 40 + i));

  // hydrant lids inside the yellow boxes
  for (const h of hydrants) put('hydrantLid', h.x, h.z, h.dx, h.dz, 0.52, 0.52);

  // ---- wet stains & leaves by the grates -------------------------------------
  for (const g of grateSpots) {
    const r = rng();
    if (g.run === 'plaza') {
      put('leavesB', g.x + 0.2, g.z - 0.5, ...rot(), 0.55, 0.55, plazaDecalY);
      continue;
    }
    // push the decal a little towards the road centre (inside the asphalt)
    const inward = inwardDir(g.x, g.z);
    const x = g.x + inward[0] * 0.5, z = g.z + inward[1] * 0.5;
    if (!onRoad(x, z)) continue;
    if (r < 0.45) put('stainWet', x, z, inward[0], inward[1], 0.9, 0.7);
    else if (r < 0.7) put('drainStreak', g.x + inward[0] * 0.95, g.z + inward[1] * 0.95, -inward[0], -inward[1], 1.3, 0.9);
    if (rng() < 0.55) put(rng.pick(['leavesA', 'leavesB']), g.x + inward[0] * 0.3, g.z + inward[1] * 0.3, ...rot(), 0.6, 0.6);
  }
  // leaves drifting along the kerbs
  for (let i = 0; i < 70; i++) {
    const s = MS_S0 + rng() * (MS_S1 - MS_S0 - 2);
    const f = MS.atS(s);
    const d = (rng() < 0.5 ? -1 : 1) * (3.6 + rng() * 0.3);
    put(rng.pick(['leavesA', 'leavesB']), f.x + f.nx * d, f.z + f.nz * d, ...rot(), 0.5 + rng() * 0.3, 0.5 + rng() * 0.3);
  }

  // ---- parked cars: oil drips --------------------------------------------------
  for (const v of SPOTS.vehicles) {
    const fx = Math.sin(v.rotY), fz = Math.cos(v.rotY);
    put('oil', v.x + fx * 0.8, v.z + fz * 0.8, fx, fz, 1.1, 0.9);
  }

  // ---- lot aprons: water meters -------------------------------------------------
  for (const lot of LOTS) {
    if (lot.street !== 'main' || (lot.setback || 0) < 0.8 || lot.type === 'konbini') continue;
    if ((lot.seed & 3) === 0) continue;
    const p = lot.toWorld(lot.width * 0.38, lot.depth / 2 + (lot.setback || 0) * 0.55);
    put('meter', p.x, p.z, lot.front.dirX, lot.front.dirZ, 0.3, 0.42, apronDecalY);
  }

  // ---- plaza --------------------------------------------------------------------
  put('manholeSakura', 6.2, -8.2, 0, -1, 0.8, 0.8, plazaDecalY);
  put('manholePlain', -21.5, -8.5, 0, -1, 0.74, 0.74, plazaDecalY);
  put('meter', 4.2, -14.4, 0, -1, 0.3, 0.42, plazaDecalY);
  for (let i = 0; i < 26; i++) {
    const x = PLAZA.xMin + 2 + rng() * (PLAZA.xMax - PLAZA.xMin - 4);
    const z = -14 + rng() * 17;
    put(rng() < 0.5 ? 'plazaStain' : 'gum', x, z, ...rot(), 0.6 + rng() * 0.9, 0.6 + rng() * 0.9, plazaDecalY);
  }
  for (const s of [...PLAZA.benches, ...PLAZA.trashBins, SPOTS.vending[0]]) put('gum', s.x, s.z + 0.8, 0, -1, 0.9, 0.9, plazaDecalY);
  for (let i = 0; i < 10; i++) {
    const x = PLAZA.xMin + 1 + rng() * (PLAZA.xMax - PLAZA.xMin - 2);
    put('leavesB', x, PLAZA.zMax - 0.45, ...rot(), 0.5, 0.5, plazaDecalY);
  }
  // tree pits (soil disc with a stone ring and fallen petals)
  for (const t of plazaTrees()) {
    const r = t.kind === 'grand' ? 1.55 : 1.05;
    surfaceQuad(b, t.x, t.z, 0, -1, r * 2, r * 2, atlas.uv('soilDisc'), () => PLAZA_Y + 0.006, [1, 1, 1]);
  }
}

/** Unit vector from a gutter spot towards the nearest road centre line. */
function inwardDir(x, z) {
  // main street?
  if (z > MS.zStart + 4) {
    const f = MS.atZ(z);
    const d = (x - f.x) * f.nx + (z - f.z) * f.nz;
    if (Math.abs(d) < 5) return [-Math.sign(d) * f.nx, -Math.sign(d) * f.nz];
  }
  if (Math.abs(z - SF.z) < 5) return [0, -Math.sign(z - SF.z)];
  if (Math.abs(z - NR.z) < 4) return [0, -Math.sign(z - NR.z)];
  if (Math.abs(x - CR.x) < 4) return [-Math.sign(x - CR.x), 0];
  return [0, 1];
}
