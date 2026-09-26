/**
 * terrain/vegetation — low ground plants that make the ground feel lived-in:
 *   - grass / weed tufts (instanced, 5 blades each, flat up-facing normals so
 *     they shade like the painted ground; gentle wind sway in the vertex shader)
 *     along gutters, in the crack between asphalt and gutter, at pole bases,
 *     along the railway fences, on the verges, levee slopes and path edges
 *   - reeds at the waterline
 *   - flowers (dandelion / white clover / henbit / violets): one merged mesh
 *     with a per-vertex sway weight
 * Everything here is noOutline and casts no shadows.
 */
import * as THREE from 'three';
import { TERRAIN, RAIL, PLATFORM, POLE_LINES, TREES, makeRng, groundY } from '../../core/layout.js';
import { LIFT, LP, NR, onRoad, inPlaza, GeoBuilder, fbm } from './common.js';
import { WATERLINE, REVET } from './river.js';
import { PLAZA_Y, plazaTrees } from './paving.js';

const SWAY = {
  key: 'terrainTuftSway',
  pars: '',
  main: /* glsl */ `
    {
      float hgt = max( position.y, 0.0 );
      vec3 ip = vec3( 0.0 );
      #ifdef USE_INSTANCING
        ip = vec3( instanceMatrix[3][0], 0.0, instanceMatrix[3][2] );
      #endif
      float ph = toonTime * 2.1 + ip.x * 0.63 + ip.z * 0.41;
      float amt = hgt * hgt * ( 0.10 + 0.06 * sin( ph ) + 0.08 * toonWind.y * sin( ph * 2.7 ) );
      transformed.x += toonWind.x * amt;
      transformed.z += toonWind.z * amt;
    }`,
};

const FLOWER_SWAY = {
  key: 'terrainFlowerSway',
  pars: 'attribute float sway;',
  main: /* glsl */ `
    {
      float ph = toonTime * 2.6 + position.x * 0.9 + position.z * 0.7;
      float amt = sway * ( 0.018 + 0.012 * sin( ph ) + 0.02 * toonWind.y * sin( ph * 2.3 ) );
      transformed.x += toonWind.x * amt;
      transformed.z += toonWind.z * amt;
    }`,
};

/** Unit tuft: 5 (or 7) blades, height 1, radius ~0.5, colours dark base -> light tip. */
function tuftGeometry(blades = 5, seed = 1, spread = 1) {
  const rng = makeRng(seed);
  const pos = [], col = [], nrm = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + rng() * 0.8;
    const lean = (0.3 + rng() * 0.4) * spread;
    const h = 0.45 + rng() * 0.55;
    const w = (0.09 + rng() * 0.06) * spread;
    const cx = Math.cos(a) * 0.12, cz = Math.sin(a) * 0.12;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const tx = cx + Math.cos(a) * lean, tz = cz + Math.sin(a) * lean;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz);
    col.push(0.82, 0.88, 0.8, 0.82, 0.88, 0.8, 1.1, 1.08, 1.0);
    nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const GREENS = ['#9cc276', '#aacd82', '#92ba70', '#b7d38c', '#a3c47a', '#afc985'];
const DRY = ['#b9c08a', '#c2c394', '#a8b57c'];
const REED = ['#9fb877', '#b3c486', '#8faa6c'];

export function buildVegetation(ctx, { gutterRuns, stairs, carPark }) {
  const rng = makeRng(1357);
  const tufts = [];
  const reeds = [];
  const fb = new GeoBuilder();
  const sway = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  const tuft = (list, x, y, z, h, wScale = 1, palette = GREENS) => {
    e.set(0, rng() * Math.PI * 2, 0);
    q.setFromEuler(e);
    s.set(h * 0.9 * wScale, h, h * 0.9 * wScale);
    p.set(x, y, z);
    m.compose(p, q, s);
    const mm = m.clone();
    mm.color = palette[Math.floor(rng() * palette.length)];
    list.push(mm);
  };
  const cluster = (x, z, y, n, r, hMin, hMax, palette) => {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r;
      tuft(tufts, x + Math.cos(a) * d, y, z + Math.sin(a) * d, hMin + rng() * (hMax - hMin), 1, palette);
    }
  };

  // flower heads: disc on a stem (merged geometry)
  const flower = (x, y, z, kind) => {
    const colors = {
      dandelion: [[1.0, 0.78, 0.18], 0.032],
      clover: [[0.98, 0.96, 0.92], 0.024],
      henbit: [[0.86, 0.55, 0.78], 0.02],
      violet: [[0.62, 0.52, 0.9], 0.02],
      speedwell: [[0.55, 0.68, 0.98], 0.014],
    }[kind];
    const [c, r] = colors;
    const h = 0.05 + rng() * 0.09;
    const stem = [0.36, 0.5, 0.22];
    // stem (thin quad, both windings)
    const a0 = fb.vert(x - 0.004, y, z, 0, 0, stem), a1 = fb.vert(x + 0.004, y, z, 0, 0, stem);
    const a2 = fb.vert(x + 0.003, y + h, z, 0, 0, stem), a3 = fb.vert(x - 0.003, y + h, z, 0, 0, stem);
    fb.quad(a0, a1, a2, a3);
    fb.quad(a0, a3, a2, a1);
    sway.push(0, 0, 1, 1);
    // head: hexagon facing up (slightly domed)
    const cId = fb.vert(x, y + h + r * 0.35, z, 0, 0, [c[0] * 1.05, c[1] * 1.05, c[2] * 1.05]);
    sway.push(1);
    const ring = [];
    for (let k = 0; k < 6; k++) {
      const an = (k / 6) * Math.PI * 2;
      ring.push(fb.vert(x + Math.cos(an) * r, y + h, z + Math.sin(an) * r, 0, 0, c));
      sway.push(1);
    }
    for (let k = 0; k < 6; k++) fb.tri(cId, ring[(k + 1) % 6], ring[k]);
  };
  const flowerKinds = ['dandelion', 'dandelion', 'clover', 'clover', 'clover', 'henbit', 'violet', 'speedwell'];

  // ---- gutters: along the outer rim (on the apron line) and the asphalt crack ----
  for (const run of gutterRuns) {
    const pts = run.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      if (L < 0.01) continue;
      const nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L;
      for (let t = 0; t < L; t += 0.9) {
        const r = rng();
        const fx = a.x + ((b.x - a.x) * t) / L, fz = a.z + ((b.z - a.z) * t) / L;
        // which side is "outside" (away from the road)?  test both offsets
        const o1 = { x: fx + nx * (run.width / 2 + 0.07), z: fz + nz * (run.width / 2 + 0.07) };
        const o2 = { x: fx - nx * (run.width / 2 + 0.07), z: fz - nz * (run.width / 2 + 0.07) };
        const outside = onRoad(o1.x, o1.z) ? o2 : o1;
        const inside = outside === o1 ? o2 : o1;
        if (r < 0.26 && !inPlaza(outside.x, outside.z, -0.2)) {
          const n = 1 + Math.floor(rng() * 3);
          for (let k = 0; k < n; k++) tuft(tufts, outside.x + (rng() - 0.5) * 0.25, groundY(outside.x, outside.z) + LIFT.apron - 0.005, outside.z + (rng() - 0.5) * 0.25, 0.1 + rng() * 0.2);
          if (rng() < 0.12) flower(outside.x, groundY(outside.x, outside.z) + LIFT.apron, outside.z, rng() < 0.6 ? 'dandelion' : 'clover');
        } else if (r > 0.93) {
          tuft(tufts, inside.x, groundY(inside.x, inside.z) + LIFT.road, inside.z, 0.06 + rng() * 0.08);
        }
      }
    }
  }

  // ---- pole bases ------------------------------------------------------------------
  for (const line of POLE_LINES) {
    for (const pole of line.poles) {
      const y = groundY(pole.x, pole.z) + LIFT.road;
      const n = 3 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2, d = 0.2 + rng() * 0.18;
        tuft(tufts, pole.x + Math.cos(a) * d, y, pole.z + Math.sin(a) * d, 0.12 + rng() * 0.2);
      }
      if (rng() < 0.4) flower(pole.x + 0.25, y, pole.z - 0.1, 'dandelion');
    }
  }

  // ---- railway fences + north verge ------------------------------------------
  const zS = RAIL.corridor.zMax, zN = RAIL.corridor.zMin;
  const px0 = PLATFORM.xMin - PLATFORM.rampLength - 1, px1 = PLATFORM.xMax + PLATFORM.rampLength + 1;
  for (let x = -180; x < 180; x += 0.55) {
    if (Math.abs(x - 32) < 4.5) continue;
    if (x < px0 || x > px1) {
      if (rng() < 0.5) tuft(tufts, x + rng() * 0.4, LIFT.path, zS - 0.1 - rng() * 0.3, 0.18 + rng() * 0.32, 1, rng() < 0.3 ? DRY : GREENS);
    }
    if (rng() < 0.5) tuft(tufts, x + rng() * 0.4, LIFT.path, zN + 0.1 + rng() * 0.3, 0.18 + rng() * 0.35, 1, rng() < 0.3 ? DRY : GREENS);
    // verge between the north road band and the fence
    if (rng() < 0.55) tuft(tufts, x + rng() * 0.5, 0, NR.z + NR.gutter[1] + 0.45 + rng() * 1.3, 0.12 + rng() * 0.28, 1.2);
    if (rng() < 0.06) flower(x, 0.0, NR.z + NR.gutter[1] + 0.5 + rng() * 1.2, rng.pick(flowerKinds));
  }

  // ---- levee: path edges, slopes ----------------------------------------------
  const T = TERRAIN;
  const top = T.leveeHeight;
  for (let x = -205; x < 205; x += 0.4) {
    if (stairs && Math.abs(x - stairs.x) < 1.3) continue;
    for (const side of [-1, 1]) {
      // clumpy: dense runs where the noise is high, gaps elsewhere
      const dens = fbm(x * 0.12, side * 3.7, 77, 2);
      if (rng() < dens * dens * 1.6) {
        const z = LP.z + side * (LP.halfWidth + 0.02 + rng() * 0.45);
        const n = 1 + Math.floor(rng() * 3);
        for (let k = 0; k < n; k++) tuft(tufts, x + rng() * 0.4, top, z + (rng() - 0.5) * 0.2, 0.1 + rng() * 0.2, 1.1);
      }
    }
    if (rng() < 0.25) flower(x + rng() * 0.4, top, LP.z + (rng() < 0.5 ? -1 : 1) * (LP.halfWidth + 0.2 + rng() * 0.6), rng.pick(flowerKinds));
  }
  // slopes (inner south slope, river-side slope above the revetment)
  const slopeBands = [[T.leveeSouthFoot - 0.2, T.leveeTopSouth + 0.1], [REVET.south[1] + 0.3, T.leveeTopNorth - 0.1]];
  for (let i = 0; i < 1100; i++) {
    const x = -210 + rng() * 420;
    const band = slopeBands[i % 2];
    const z = band[0] + rng() * (band[1] - band[0]);
    if (stairs && Math.abs(x - stairs.x) < 1.6) continue;
    const n = 2 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const xx = x + (rng() - 0.5) * 0.7, zz = z + (rng() - 0.5) * 0.4;
      tuft(tufts, xx, groundY(xx, zz) - 0.01, zz, 0.08 + rng() * 0.18, 1.2, rng() < 0.15 ? DRY : GREENS);
    }
    if (rng() < 0.7) flower(x + 0.2, groundY(x + 0.2, z), z + 0.1, rng.pick(flowerKinds));
    if (rng() < 0.4) flower(x - 0.3, groundY(x - 0.3, z), z - 0.15, rng.pick(flowerKinds));
  }
  // far levee: sparser
  for (let i = 0; i < 500; i++) {
    const x = -260 + rng() * 520;
    const z = T.farLeveeTopSouth + 0.3 - rng() * (T.farLeveeTopSouth - REVET.north[0] - 0.6);
    tuft(tufts, x, groundY(x, z) - 0.01, z, 0.12 + rng() * 0.2, 1.2);
  }

  // ---- reeds at the waterline --------------------------------------------------------
  for (const wz of [WATERLINE.south, WATERLINE.north]) {
    const dir = wz === WATERLINE.south ? -1 : 1; // towards the water
    for (let x = -260; x < 260; x += 1.5) {
      const nrm = Math.sin(x * 0.045) + Math.sin(x * 0.13 + 2) * 0.5;
      if (nrm < 0.4) continue;
      const n = 2 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) {
        const z = wz + dir * (rng() * 0.6 - 0.25);
        tuft(reeds, x + rng() * 1.4, T.waterLevel - 0.05, z, 0.55 + rng() * 0.7, 0.45, REED);
      }
    }
  }

  // ---- stairs / footpath / car park edges -------------------------------------------
  if (stairs) {
    for (let z = T.leveeSouthFoot + 0.2; z > NR.z - 3.5; z -= 0.6) {
      for (const s2 of [-1, 1]) if (rng() < 0.7) tuft(tufts, stairs.x + s2 * (1.1 + rng() * 0.3), groundY(stairs.x, z), z, 0.12 + rng() * 0.25);
    }
  }
  if (carPark) {
    for (let x = carPark.x0; x < carPark.x1; x += 0.5) {
      if (rng() < 0.6) tuft(tufts, x, groundY(x, carPark.z0), carPark.z0 + 0.1 + rng() * 0.25, 0.12 + rng() * 0.25);
    }
  }

  // ---- plaza: around tree pits ------------------------------------------------------------
  for (const t of plazaTrees()) {
    const r = t.kind === 'grand' ? 1.45 : 0.95;
    for (let k = 0; k < 14; k++) {
      const a = rng() * Math.PI * 2;
      tuft(tufts, t.x + Math.cos(a) * r * (0.7 + rng() * 0.25), PLAZA_Y + 0.005, t.z + Math.sin(a) * r * (0.7 + rng() * 0.25), 0.08 + rng() * 0.12);
    }
  }
  // garden-tree bases elsewhere in the town (small clumps of grass)
  for (const t of TREES) {
    if (t.far || t.kind === 'row' || t.kind === 'grand') continue;
    if (inPlaza(t.x, t.z)) continue;
    cluster(t.x, t.z, groundY(t.x, t.z), 8, 0.9, 0.1, 0.26, GREENS);
  }

  // ---- meshes --------------------------------------------------------------------------------
  const tuftMat = ctx.toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, vertexPatch: SWAY, name: 'terrainTuft' });
  const out = [];
  const mk = (geo, list, name) => {
    // geom.instanced applies each matrix's .color as the instance colour
    const im = ctx.geom.instanced(geo, tuftMat, list, { castShadow: false, noOutline: true });
    im.name = name;
    out.push(im);
  };
  mk(tuftGeometry(6, 3, 1.25), tufts, 'terrain:tufts');
  mk(tuftGeometry(7, 9, 0.6), reeds, 'terrain:reeds');

  const fg = fb.build({ colors: true });
  fg.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  const flowers = new THREE.Mesh(fg, ctx.toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, vertexPatch: FLOWER_SWAY, name: 'terrainFlower' }));
  flowers.name = 'terrain:flowers';
  flowers.userData.noOutline = true;
  flowers.userData.dynamic = true;
  flowers.castShadow = false;
  flowers.receiveShadow = true;
  out.push(flowers);
  return { meshes: out, counts: { tufts: tufts.length, reeds: reeds.length } };
}
