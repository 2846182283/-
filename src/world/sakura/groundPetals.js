/**
 * Fallen petals: instanced alpha-tested petal decals, never a uniform carpet.
 *
 *   under crowns   scatter + wind-blown drift bands + small heaps (denser downwind)
 *   road edges     along the main street / station-front road gutters, thicker near trees
 *   corners        heaps where the wind piles them (junction corners, crossing corners)
 *   ballast        between the sleepers near the station
 *   platform 2     under the overhanging crowns (via surface height lookup)
 *   café window    a few stuck to the glass (vertical decals)
 *   river 花筏     petal rafts: long ribbons drifting slowly on the water (animated)
 *   vending tops   a light sprinkle (props already scatters petals on its benches)
 */
import * as THREE from 'three';
import { mulberry } from './canopy.js';

/**
 * A fallen petal as real geometry (no alpha test, so it never vanishes at a
 * distance): notched sakura petal, 6 vertices / 4 triangles, lying in XY
 * (faces +Z), deeper pink at the base, near-white at the tip.
 */
function petalGeometry() {
  const P = [[0, -0.5], [-0.4, 0.05], [-0.17, 0.5], [0, 0.36], [0.17, 0.5], [0.4, 0.05]];
  const base = new THREE.Color('#f0a8bf'), tip = new THREE.Color('#ffffff');
  const pos = [], col = [];
  for (const [x, y] of P) {
    pos.push(x * 0.8, y, 0);
    const c = base.clone().lerp(tip, THREE.MathUtils.smoothstep(y, -0.5, 0.3));
    col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(P.flatMap(() => [0, 0, 1]), 3));
  g.setIndex([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
  return g;
}

/** Cheap 2-triangle kite petal for dense kerb drifts (shapes overlap there anyway). */
function kiteGeometry() {
  const P = [[0, -0.5], [-0.38, 0.1], [0, 0.5], [0.38, 0.1]];
  const base = new THREE.Color('#f2afc4'), tip = new THREE.Color('#fff8fa');
  const pos = [], col = [];
  for (const [x, y] of P) {
    pos.push(x * 0.8, y, 0);
    const c = base.clone().lerp(tip, THREE.MathUtils.smoothstep(y, -0.5, 0.3));
    col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(P.flatMap(() => [0, 0, 1]), 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  return g;
}

/**
 * Thin petals stay pink in shade: lift the unlit side toward a pale lilac-pink instead of
 * letting drifts sink to a grey that reads as grime on the asphalt.
 */
function petalLift(shader) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
    {
      float sakDirect = dot( reflectedLight.directDiffuse, vec3( 0.3333 ) );
      outgoingLight += diffuseColor.rgb * vec3( 0.3, 0.25, 0.36 ) * ( 1.0 - smoothstep( 0.05, 0.4, sakDirect ) );
    }
    #include <opaque_fragment>`);
}

/** Box-Muller gaussian. */
function gauss(rnd) {
  const u = Math.max(1e-6, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Build a surface-height lookup: returns y for a petal at (x, z) or null to skip. */
function makeSurface(layout, infos) {
  const { groundY, PLATFORM, STATION, RAIL, LOTS, TERRAIN } = layout;
  const B = STATION.building;
  const lots = LOTS.map((l) => ({ x: l.x, z: l.z, c: Math.cos(l.rotY), s: Math.sin(l.rotY), hw: l.width / 2 - 0.15, hd: l.depth / 2 - 0.15 }));
  const inLot = (x, z) => {
    for (const l of lots) {
      const dx = x - l.x, dz = z - l.z;
      if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue;
      // world -> local (inverse of toWorld)
      const lx = dx * l.c - dz * l.s, lz = dx * l.s + dz * l.c;
      if (Math.abs(lx) < l.hw && Math.abs(lz) < l.hd) return true;
    }
    return false;
  };
  const pits = infos.filter((i) => i.pit).map((i) => i.pit);
  return (x, z) => {
    for (const p of pits) {
      if (p.r ? Math.hypot(x - p.x, z - p.z) < p.r : Math.abs(x - p.x) < p.half && Math.abs(z - p.z) < p.half) return p.y + 0.012;
    }
    if (x > B.xMin - 0.3 && x < B.xMax + 0.3 && z > B.zMin && z < B.zMax + 0.3) return null;
    if (x > PLATFORM.xMin && x < PLATFORM.xMax) {
      if (z < PLATFORM.P1.zBack && z > PLATFORM.P1.zTrack + 0.5) return PLATFORM.top + 0.012;
      if (z > PLATFORM.P2.zBack && z < PLATFORM.P2.zTrack - 0.5) return PLATFORM.top + 0.012;
      if ((z <= PLATFORM.P1.zBack + 0.1 && z >= PLATFORM.P1.zTrack - 0.1) || (z >= PLATFORM.P2.zBack - 0.1 && z <= PLATFORM.P2.zTrack + 0.1)) return null;
    }
    if (z > RAIL.corridor.zMin && z < RAIL.corridor.zMax) {
      for (const tr of RAIL.tracks) if (Math.abs(z - tr.z) < RAIL.ballastTopWidth / 2 - 0.05) return RAIL.ballastTop + 0.02;
      for (const tr of RAIL.tracks) if (Math.abs(z - tr.z) < RAIL.ballastBottomWidth / 2 + 0.1) return null; // ballast shoulder slope
    }
    if (z < TERRAIN.riverSouthBank + 0.5 && z > TERRAIN.riverNorthBank - 0.5) return null;
    if (inLot(x, z)) return null;
    return groundY(x, z) + surfaceLift(layout, x, z) + 0.008;
  };
}

/**
 * Height of terrain's paved layers above groundY at (x, z) (mirrors the terrain
 * module's stack: gravel +0.02, asphalt +0.03 (paint +0.038), gutter rims +0.065, gutter lids
 * +0.10, aprons / plaza +0.07).  Petals are laid just above it.
 */
function surfaceLift(layout, x, z) {
  const { PLAZA, MAIN_STREET: MS, ROADS } = layout;
  if (x > PLAZA.xMin && x < PLAZA.xMax && z > PLAZA.zMin && z < PLAZA.zMax) return 0.07;
  // lateral profile of a road with a U-channel gutter [g0, g1]
  const band = (d, g0, g1) => (d < g0 - 0.01 ? 0.042 : d < g0 + 0.07 ? 0.066 : d < g1 - 0.07 ? 0.1 : d < g1 + 0.01 ? 0.066 : d < g1 + 2.4 ? 0.07 : null);
  if (z > MS.zStart + 3 && z < MS.zEnd) {
    const f = MS.atZ(z);
    const b = band(Math.abs((x - f.x) * f.nx + (z - f.z) * f.nz), MS.gutter[0], MS.gutter[1]);
    if (b !== null) return b;
  }
  const sf = ROADS.stationFront, cr = ROADS.crossingRoad, nr = ROADS.northRoad;
  if (x > sf.from && x < sf.to) {
    const b = band(Math.abs(z - sf.z), sf.gutter[0], sf.gutter[1]);
    if (b !== null) return b;
  }
  if (z > cr.from && z < cr.to) {
    const b = band(Math.abs(x - cr.x), cr.gutter[0], cr.gutter[1]);
    if (b !== null) return b;
  }
  if (x > nr.from && x < nr.to) {
    const d = Math.abs(z - nr.z);
    if (d < nr.gutter[1] + 0.01) return band(d, nr.gutter[0], nr.gutter[1]);
  }
  return 0.022;
}

export function buildGroundPetals(ctx, infos) {
  const { layout, toon, sim } = ctx;
  const { MAIN_STREET, ROADS, RAIL, SPOTS } = layout;
  const surface = makeSurface(layout, infos);
  const rnd = mulberry(424242);
  const wx = sim.wind.dir.x, wz = sim.wind.dir.y;
  const items = [];
  const drift = []; // dense kerb drifts (kite petals)
  const cols = [new THREE.Color('#fff4f7'), new THREE.Color('#ffe2eb'), new THREE.Color('#fbd0dc'), new THREE.Color('#f6bccb'), new THREE.Color('#f9d6cf')];
  // older petals (a day on the ground) are a touch duller / browner
  const old = new THREE.Color('#e6cfc9');

  // low quality: drop ~40% of the fallen petals (decided up front so the layout stays the same)
  const thin = ctx.quality === 'low' ? mulberry(9191) : null;
  const add = (x, z, opts = {}) => {
    if (thin && thin() < 0.4) return false;
    const y = opts.y ?? surface(x, z);
    if (y === null || y === undefined) return false;
    const c = cols[Math.floor(rnd() * cols.length)].clone();
    if (rnd() < 0.12) c.lerp(old, 0.6);
    const s = (opts.s ?? 1) * (0.045 + rnd() * 0.025);
    // curled petals tilt up from the ground, which also keeps them readable at grazing angles
    (opts.list || items).push({ x, y: y + (opts.lift || 0) + 0.004, z, ry: rnd() * Math.PI * 2, rx: -Math.PI / 2 + (rnd() - 0.5) * 0.9, rz: (rnd() - 0.5) * 0.7, s, color: c });
    return true;
  };

  // ---- 1. under / downwind of every crown ----
  for (const inf of infos) {
    if (inf.context === 'far') continue;
    const R = inf.radius;
    const base = { levee: 200, garden: 520, rail: 560, street: 560, plaza: 1500 }[inf.context] ?? 400;
    const n = Math.round(base * (R / 5) * (R / 5) * (inf.tree.kind === 'row' ? 1 : 0.9));
    const cx = inf.crown.x + wx * R * 0.2, cz = inf.crown.z + wz * R * 0.2;
    // scattered layer
    for (let i = 0; i < n * 0.45; i++) {
      const r = R * 0.55 * Math.abs(gauss(rnd)), a = rnd() * Math.PI * 2;
      add(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    }
    // drift bands (streaks along the wind)
    const bands = 2 + Math.floor(rnd() * 3);
    for (let b = 0; b < bands; b++) {
      const a0 = rnd() * Math.PI * 2, r0 = R * (0.2 + rnd() * 0.7);
      const bx = cx + Math.cos(a0) * r0, bz = cz + Math.sin(a0) * r0;
      const ang = Math.atan2(wz, wx) + (rnd() - 0.5) * 0.7;
      const L = 1.5 + rnd() * R * 0.5, W = 0.12 + rnd() * 0.3;
      const cnt = (n * 0.4) / bands;
      for (let i = 0; i < cnt; i++) {
        const u = rnd() * L, taper = Math.sin((u / L) * Math.PI);
        const v = gauss(rnd) * W * (0.4 + taper);
        add(bx + Math.cos(ang) * u - Math.sin(ang) * v, bz + Math.sin(ang) * u + Math.cos(ang) * v);
      }
    }
    // small heaps
    const heaps = 1 + Math.floor(rnd() * 3);
    for (let h = 0; h < heaps; h++) {
      const a0 = rnd() * Math.PI * 2, r0 = R * (0.3 + rnd() * 0.6);
      const hx = cx + Math.cos(a0) * r0 + wx * 1.5, hz = cz + Math.sin(a0) * r0 + wz * 1.5;
      const hr = 0.12 + rnd() * 0.2;
      const cnt = (n * 0.15) / heaps;
      for (let i = 0; i < cnt; i++) {
        const r = Math.abs(gauss(rnd)) * hr, a = rnd() * Math.PI * 2;
        add(hx + Math.cos(a) * r, hz + Math.sin(a) * r, { lift: Math.max(0, 0.02 * (1 - r / (hr * 2))) * rnd() });
      }
    }
  }

  // tree proximity (for gutter density)
  const nearTree = (x, z) => {
    let d = 0;
    for (const inf of infos) {
      if (inf.region !== 'town') continue;
      const dx = x - inf.crown.x, dz = z - inf.crown.z;
      d += Math.exp(-(dx * dx + dz * dz) / (2 * (inf.radius * 1.6) ** 2));
    }
    return Math.min(1.5, d);
  };

  // ---- 2. main street gutters / edges: drifts piled against the gutter kerb ----
  // density follows nearby crowns and a slow noise, so the line breaks into patches
  const patchy = (u, seed) => Math.max(0, Math.sin(u * 0.9 + seed) * 0.6 + Math.sin(u * 2.3 + seed * 1.7) * 0.4);
  for (const side of [-1, 1]) {
    for (let s = 2; s < MAIN_STREET.length - 10; s += 0.5) {
      const f = MAIN_STREET.atS(s);
      const near = nearTree(f.x, f.z);
      const pz = patchy(s, side * 3.1);
      // scattered petals on the lane / carriageway / lids
      const k = Math.floor(0.3 + near * (3 + 6 * pz) + rnd());
      for (let i = 0; i < k; i++) {
        const r = rnd();
        const lat = r < 0.3 ? 4.1 + rnd() * 0.25 : r < 0.7 ? 3.35 + rnd() * 0.6 : 0.3 + rnd() * 2.7;
        add(f.x + f.nx * side * lat + (rnd() - 0.5) * 0.5 * f.tx, f.z + f.nz * side * lat + (rnd() - 0.5) * 0.5 * f.tz);
      }
      // the drift itself: piled against the gutter rim, thick where the noise says so
      const kd = Math.floor(near * (4 + 46 * pz * pz) + rnd());
      for (let i = 0; i < kd; i++) {
        const lat = 3.975 - Math.abs(gauss(rnd)) * 0.07 * (0.6 + pz);
        add(f.x + f.nx * side * lat + (rnd() - 0.5) * 0.5 * f.tx, f.z + f.nz * side * lat + (rnd() - 0.5) * 0.5 * f.tz, { list: drift, lift: rnd() * 0.012 * pz });
      }
    }
  }
  // station-front road gutters
  const sf = ROADS.stationFront;
  for (const side of [-1, 1]) {
    for (let x = -70; x < 70; x += 0.5) {
      const z0 = sf.z + side * (sf.gutter[0] - 0.05);
      const pz = patchy(x, side * 5.3);
      const k = Math.floor(0.2 + nearTree(x, z0) * (3 + 40 * pz * pz) + rnd());
      for (let i = 0; i < k; i++) add(x + (rnd() - 0.5) * 0.5, z0 - side * Math.abs(gauss(rnd)) * 0.08, { list: drift });
    }
  }

  // ---- 3. corner heaps (wind piles petals into corners) ----
  const corners = [
    [4.6, 11.8], [-4.6, 11.6], [5.5, 3.2], [-6, 3.3], [29.2, 3.4], [34.9, 3.5], [29.2, -21.5], [34.9, -21.9], [28.5, -44.8], [35.2, -44.6],
  ];
  for (const [x, z] of corners) {
    const cnt = 90 + Math.floor(rnd() * 70);
    for (let i = 0; i < cnt; i++) {
      const r = Math.abs(gauss(rnd)) * 0.28;
      const a = rnd() * Math.PI * 2;
      add(x + Math.cos(a) * r, z + Math.sin(a) * r * 1.6, { lift: Math.max(0, 0.025 - r * 0.06) * rnd() });
    }
  }

  // ---- 4. ballast near the station ----
  for (const tr of RAIL.tracks) {
    for (let i = 0; i < 2600; i++) {
      const x = -70 + rnd() * 100;
      const near = nearTree(x, tr.z);
      if (rnd() > 0.15 + near * 0.9) continue;
      add(x, tr.z + (rnd() - 0.5) * (RAIL.ballastTopWidth - 0.2), { y: RAIL.ballastTop + 0.015 + rnd() * 0.02 });
    }
  }

  // ---- 5. vending machine tops (light sprinkle; props puts petals on the benches itself) ----
  for (const v of SPOTS.vending) {
    const c = Math.cos(v.rotY), s = Math.sin(v.rotY);
    for (let i = 0; i < 7; i++) {
      const lx = (rnd() - 0.5) * 0.8, lz = (rnd() - 0.5) * 0.55;
      add(v.x + lx * c + lz * s, v.z - lx * s + lz * c, { y: v.y + 1.835 });
    }
  }

  // ---- 6. café window: a few petals stuck to the glass ----
  // (shops/cafe.js: glass plane at local z = depth/2 - 0.10, panes x in [-4.1, 0.41] and
  //  [1.59, 4.1], sill 0.72 m / head 2.2 m above the shop floor F = front apron + 0.12)
  const cafe = layout.LOTS.find((l) => l.type === 'cafe');
  if (cafe) {
    const F = cafe.y + 0.07 + 0.12;
    for (let i = 0; i < 28; i++) {
      const lx = rnd() < 0.55 ? -4.0 + rnd() * 4.3 : 1.7 + rnd() * 2.3;
      const ly = 0.78 + Math.pow(rnd(), 1.8) * 1.3; // most cling low on the pane
      const w = cafe.toWorld(lx, cafe.depth / 2 - 0.1 + 0.014);
      items.push({ x: w.x, y: F + ly, z: w.z, ry: cafe.rotY, rx: 0, rz: rnd() * Math.PI * 2, s: 0.04 + rnd() * 0.015, color: cols[Math.floor(rnd() * 3)].clone() });
    }
  }

  // ---- meshes: split by area so each can be frustum-culled ----
  const mat = toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, polygonOffset: 2, onShaderKey: 'sakura-petal-lift', onShader: petalLift, name: 'sakura_ground_petal' });
  const geo = petalGeometry();
  // street / station / levee, the long levee strip cut into 90 m runs along x
  const areas = {};
  for (const it of items) {
    const key = it.z > 9 ? 'street' : it.z > -52 ? 'station' : `levee${Math.floor(it.x / 90)}`;
    (areas[key] ||= []).push(it);
  }
  const group = new THREE.Group();
  group.name = 'sakura_ground_petals';
  for (const [name, list] of Object.entries(areas)) {
    if (!list.length) continue;
    const im = ctx.geom.instanced(geo, mat, list, { castShadow: false, noOutline: true });
    im.name = `sakura_ground_petals_${name}`;
    group.add(im);
  }
  if (drift.length) {
    const im = ctx.geom.instanced(kiteGeometry(), mat, drift, { castShadow: false, noOutline: true });
    im.name = 'sakura_kerb_drifts';
    group.add(im);
  }

  // ---- 7. river petal rafts (花筏), drifting downstream ----
  const rafts = buildRafts(ctx, rnd, cols);
  return { ground: group, rafts, count: items.length + drift.length };
}

/** Petal rafts on the river: ribbons of petals that drift east and fade before wrapping. */
function buildRafts(ctx, rnd, cols) {
  const { layout, toon } = ctx;
  const T = layout.TERRAIN;
  const y = T.waterLevel + 0.012;
  const CHUNKS = 4; // split along x so each chunk can be frustum-culled
  const chunks = Array.from({ length: CHUNKS }, () => ({ items: [], phases: [] }));
  const PERIOD = 60; // metres travelled before a raft recycles
  const nRafts = ctx.quality === 'low' ? 20 : 30;
  for (let r = 0; r < nRafts; r++) {
    const x0 = -150 + rnd() * 300;
    // hug the south bank more (the levee trees drop them there)
    const z0 = T.riverSouthBank - 1.0 - Math.pow(rnd(), 1.7) * 13;
    const L = 2.5 + rnd() * 5, W = 0.25 + rnd() * 0.6;
    const ang = (rnd() - 0.5) * 0.25;
    const cnt = Math.round(L * W * 150); // dense: petals almost touching, like a real 花筏
    const ph = rnd() * PERIOD;
    const { items, phases } = chunks[Math.min(CHUNKS - 1, Math.floor(((x0 + 150) / 300) * CHUNKS))];
    for (let i = 0; i < cnt; i++) {
      const u = (rnd() - 0.5) * L, taper = Math.cos((u / L) * Math.PI);
      const v = gauss(rnd) * W * 0.35 * (0.3 + taper);
      const c = cols[Math.floor(rnd() * cols.length)].clone();
      items.push({ x: x0 + Math.cos(ang) * u - Math.sin(ang) * v, y, z: z0 + Math.sin(ang) * u + Math.cos(ang) * v, ry: rnd() * 6.28, rx: -Math.PI / 2 + (rnd() - 0.5) * 0.3, s: 0.05 + rnd() * 0.025, color: c });
      phases.push(ph);
    }
  }
  const patch = {
    key: 'sakura-raft',
    pars: 'attribute float aPhase;\n',
    main: /* glsl */ `
    {
      // drift downstream (+x); fade out/in around the wrap so the jump is invisible
      float travel = mod( toonTime * 0.22 + aPhase, ${PERIOD.toFixed(1)} );
      float fade = smoothstep( 0.0, 6.0, travel ) * ( 1.0 - smoothstep( ${(PERIOD - 6).toFixed(1)}, ${PERIOD.toFixed(1)}, travel ) );
      transformed *= fade;
      #ifdef USE_INSTANCING
        transformed += inverse( mat3( instanceMatrix ) ) * vec3( travel - ${(PERIOD / 2).toFixed(1)} + sin( toonTime * 0.3 + aPhase ) * 0.3, 0.0, sin( toonTime * 0.17 + aPhase * 2.0 ) * 0.4 );
      #endif
    }
    `,
  };
  const mat = toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, polygonOffset: 2, vertexPatch: patch, name: 'sakura_raft_petal' });
  const group = new THREE.Group();
  group.name = 'sakura_river_rafts';
  chunks.forEach(({ items, phases }, k) => {
    if (!items.length) return;
    const geo = petalGeometry();
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
    const im = ctx.geom.instanced(geo, mat, items, { castShadow: false, noOutline: true });
    // instances drift up to +-PERIOD/2 along x from their build-time spot: widen the bounds
    im.computeBoundingSphere();
    im.boundingSphere.radius += PERIOD / 2 + 1;
    im.frustumCulled = true;
    im.name = `sakura_river_rafts_${k}`;
    group.add(im);
  });
  return group;
}
