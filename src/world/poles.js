/**
 * World module: poles — utility poles (電柱), overhead wires, service drops,
 * traffic signs, convex mirrors and the sparrows on the wires.
 *
 *   poles/kit.js       buckets (merged meshes), wire tube + min-width shader
 *   poles/textures.js  the canvas atlas (plates, adverts, stickers, sign faces)
 *   poles/pole.js      one concrete pole with all its equipment
 *   poles/wires.js     spans, cross-street spans, drops, closures
 *   poles/signs.js     traffic signs + convex mirrors
 *   poles/sparrows.js  instanced, animated sparrows
 *
 * Planning (this file): per-pole equipment choices (deterministic from the
 * pole id), the wire network (line spans, junction links into the
 * station-front line, cross-street spans, the high span over the railway),
 * service drops to lot fronts, guy wires at line ends, and perches.
 */
import * as THREE from 'three';
import { createKit, updateWireWidth } from './poles/kit.js';
import { makePoleAtlas } from './poles/textures.js';
import { buildPole } from './poles/pole.js';
import { buildWires } from './poles/wires.js';
import { buildSigns, buildMirrors } from './poles/signs.js';
import { buildSparrows } from './poles/sparrows.js';

const LINE_LABEL = { 'main-W': '桜ヶ丘幹', 'main-E': '桜ヶ丘幹', 'stationFront-S': '駅前線', 'crossing-E': '踏切支', 'north-N': '北町線' };
const STICKERS = ['nobill', 'chikan', 'cat', 'dog', 'junk', 'tutor', 'graffiti', 'default'];
const ADS = ['clinic', 'dental', 'estate', 'abacus'];
const CCTV_POLES = new Set(['PMW0', 'PME0', 'PSF5', 'PSF6', 'PCR1']);

/** Centre of the road a pole stands beside (for the road-side sign rs). */
function roadCentre(L, lineId, p) {
  if (lineId.startsWith('main')) { const f = L.MAIN_STREET.atZ(p.z); return [f.x, f.z]; }
  if (lineId === 'stationFront-S') return [p.x, L.ROADS.stationFront.z];
  if (lineId === 'crossing-E') return [L.ROADS.crossingRoad.x, p.z];
  return [p.x, L.ROADS.northRoad.z];
}

export function planPoles(ctx) {
  const L = ctx.layout;
  const plans = [];
  const byId = new Map();
  for (const line of L.POLE_LINES) {
    line.poles.forEach((p, idx) => {
      const seed = L.hashString(p.id);
      const rng = ctx.rng(seed);
      const lx = Math.cos(p.rotY), lz = -Math.sin(p.rotY); // local +X in world
      const [cx, cz] = roadCentre(L, line.id, p);
      const rs = (cx - p.x) * lx + (cz - p.z) * lz >= 0 ? 1 : -1;
      const tRoad = rs * Math.PI / 2;
      const main = line.id.startsWith('main');
      const sleeve = main || line.id === 'stationFront-S' || line.id === 'crossing-E' || rng() < 0.3;
      const ad = rng() < (main ? 0.45 : 0.25) ? ADS[Math.floor(rng() * ADS.length)] : null;
      let address = null;
      if (rng() < 0.5) {
        if (main) address = p.z < 45 ? 0 : p.z < 110 ? 1 : 2;
        else if (line.id === 'north-N') address = 4;
        else address = 3;
      }
      // stickers on the non-road faces, just above the sleeve
      const stickers = [];
      const nSt = main ? 1 + Math.floor(rng() * 4) : Math.floor(rng() * 3);
      for (let i = 0; i < nSt; i++) {
        const w = 0.085 + rng() * 0.04;
        stickers.push({
          kind: STICKERS[Math.floor(rng() * STICKERS.length)],
          theta: tRoad + (rng() < 0.5 ? 1 : -1) * (0.75 + rng() * 1.9),
          y: (sleeve ? 1.75 : 1.3) + rng() * 0.55,
          w, h: w * 1.33,
        });
      }
      // CCTV looks along the street toward the station
      const zx = Math.sin(p.rotY), zz = Math.cos(p.rotY);
      const cctvDir = (0 - p.x) * zx + (-8 - p.z) * zz >= 0 ? 1 : -1;
      const num = line.id === 'main-W' ? 11 + idx * 2 : line.id === 'main-E' ? 12 + idx * 2 : idx + 1;
      const plan = {
        id: p.id, line: line.id, idx, x: p.x, y: p.y - 0.04, z: p.z, rotY: p.rotY, rs,
        variant: seed % 4,
        transformer: p.transformer ? (rng() < 0.35 ? 2 : 1) : 0,
        streetLight: !!p.streetLight,
        lampStyle: rng() < 0.5 ? 'oval' : 'long',
        sleeve, ad, address, stickers,
        plateKey: p.id, plateLabel: LINE_LABEL[line.id] || '桜ヶ丘', plateNum: num,
        plateSub: `${rs > 0 ? '右' : '左'}${1 + (seed % 9)}`,
        telPlate: seed % 3,
        switchBox: !p.transformer && rng() < 0.3,
        crossArm: false,
        coil: rng() < 0.3,
        box: rng() < 0.28 ? (rng() < 0.5 ? 'tel' : 'pow') : null,
        cctv: CCTV_POLES.has(p.id), cctvDir,
        guy: null,
      };
      plans.push(plan);
      byId.set(p.id, plan);
    });
  }
  return { plans, byId };
}

/** Wire network: which poles are linked and how. */
export function planNetwork(ctx, byId) {
  const L = ctx.layout;
  const links = [];
  const link = (a, b, kind) => { if (byId.has(a) && byId.has(b)) links.push({ a, b, kind }); };
  const skip = new Set(['PSF5|PSF6', 'PNR6|PNR7']); // road junction / crossing gaps: joined via other poles
  for (const line of L.POLE_LINES) {
    for (let i = 0; i + 1 < line.poles.length; i++) {
      const a = line.poles[i].id, b = line.poles[i + 1].id;
      if (skip.has(`${a}|${b}`)) continue;
      // the crossing line jumps the railway high up: HV only
      link(a, b, a === 'PCR1' && b === 'PCR2' ? 'hv' : 'full');
    }
  }
  // junction links: main street lines tie into the station-front line, crossing line into both roads
  link('PSF5', 'PMW0', 'full');
  link('PME0', 'PSF6', 'full');
  link('PSF6', 'PCR0', 'full');
  link('PNR6', 'PCR2', 'full');
  link('PCR2', 'PNR7', 'full');
  // cross-street spans between the west and east main-street lines (every 2nd pole)
  for (const k of [0, 2, 4, 6]) {
    const a = `PMW${k}`, b = `PME${k}`;
    if (!byId.has(a) || !byId.has(b)) continue;
    link(a, b, 'cross');
    if (k <= 2) { byId.get(a).crossArm = true; byId.get(b).crossArm = true; }
  }
  return links;
}

/** Guy wires at line ends (degree-1 poles) where the anchor spot is clear. */
export function planGuys(ctx, plans, links, byId) {
  const L = ctx.layout;
  const deg = new Map();
  const nb = new Map();
  for (const l of links) {
    if (l.kind === 'cross') continue;
    for (const [x, y] of [[l.a, l.b], [l.b, l.a]]) { deg.set(x, (deg.get(x) || 0) + 1); nb.set(x, y); }
  }
  const obstacles = [
    ...L.SPOTS.mirrors, ...L.SPOTS.signs, ...L.SPOTS.bicycles, ...L.SPOTS.vending, ...L.SPOTS.vehicles,
    ...L.TREES.filter((t) => !t.far), ...Object.values(L.SPOTS.people).filter(Boolean),
  ];
  for (const p of plans) {
    if (deg.get(p.id) !== 1) continue;
    const o = byId.get(nb.get(p.id));
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
    const ax = p.x + (dx / d) * 3.2, az = p.z + (dz / d) * 3.2;
    if (obstacles.some((s) => Math.hypot(s.x - ax, s.z - az) < 1.6)) continue;
    p.guy = { x: ax, y: L.groundY(ax, az), z: az };
  }
}

/** Service drops: each street lot gets a drop from the nearest pole (same side, sometimes across). */
export function planDrops(ctx, plans, attach) {
  const L = ctx.layout;
  const drops = [];
  const lines = {
    main: { [-1]: plans.filter((p) => p.line === 'main-W'), [1]: plans.filter((p) => p.line === 'main-E') },
    stationFront: plans.filter((p) => p.line === 'stationFront-S' || p.line === 'crossing-E'),
    north: plans.filter((p) => p.line === 'north-N' || p.id === 'PCR2'),
  };
  for (const lot of L.LOTS) {
    if (lot.street === 'backrow' || !lot.drop) continue;
    const h = L.hashString(`drop${lot.id}`);
    let cands;
    if (lot.street === 'main') cands = h % 5 === 0 ? lines.main[-lot.side] : lines.main[lot.side];
    else if (lot.street === 'stationFront') cands = lines.stationFront;
    else if (lot.street === 'north') cands = lines.north;
    else continue;
    let best = null, bd = 27;
    for (const p of cands) {
      const d = Math.hypot(p.x - lot.drop.x, p.z - lot.drop.z);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) continue;
    const wallDir = new THREE.Vector3(lot.front.dirX, 0, lot.front.dirZ).normalize();
    const target = new THREE.Vector3(lot.drop.x, lot.drop.y, lot.drop.z).addScaledVector(wallDir, 0.08);
    // telecom drop lands 0.7 m along the wall, 0.45 m lower
    const along = new THREE.Vector3(-wallDir.z, 0, wallDir.x).multiplyScalar(h % 2 ? 0.7 : -0.7);
    drops.push({ pole: attach.get(best.id), target, wallDir, tel: h % 3 !== 0, telOffset: along.setY(-0.45) });
  }
  return drops;
}

/** Choose sparrow perches on spans near the hero view, the station-front junction and the crossing. */
export function planPerches(ctx, spans) {
  const rng = ctx.rng(4242);
  const groups = [
    { n: 12, test: (m) => m.z > 50 && m.z < 78 && Math.abs(m.x) < 9 && m.y > 5 && m.y < 8.8 }, // inside the hero frame
    { n: 7, test: (m) => m.z > 8 && m.z < 30 && m.x > -24 && m.x < 30 && m.y > 5 },
    { n: 4, test: (m) => m.x > 25 && m.x < 40 && m.z > -14 && m.z < 12 && m.y > 5 },
  ];
  const perches = [];
  const mid = new THREE.Vector3();
  for (const g of groups) {
    const cand = spans.filter((s) => {
      if (s.kind === 'hv' || s.L < 6) return false;
      mid.lerpVectors(s.a, s.b, 0.5);
      return g.test(mid);
    });
    if (!cand.length) continue;
    let left = g.n;
    while (left > 0) {
      const s = cand[Math.floor(rng() * cand.length)];
      const k = Math.min(left, 1 + Math.floor(rng() * 4)); // little rows of 1-4 birds
      const t0 = 0.2 + rng() * 0.5;
      const facing = rng() < 0.5 ? 1 : -1;
      for (let i = 0; i < k; i++) {
        perches.push({ span: s, t: t0 + (i * (0.16 + rng() * 0.12)) / s.L, facing: rng() < 0.8 ? facing : -facing, flier: rng() < 0.12 });
      }
      left -= k;
    }
  }
  // make sure at least two birds fly now and then
  let fl = perches.filter((p) => p.flier).length;
  for (let i = 0; fl < 2 && i < perches.length; i += 5) if (!perches[i].flier) { perches[i].flier = true; fl++; }
  return perches;
}

export default async function build(ctx) {
  const { plans, byId } = planPoles(ctx);
  const net = planNetwork(ctx, byId);
  planGuys(ctx, plans, net, byId);

  const atlas = makePoleAtlas({
    plates: plans.map((p) => ({ key: p.plateKey, label: p.plateLabel, num: p.plateNum, sub: p.plateSub })),
    directionText: ctx.layout.SPOTS.signs.find((s) => s.type === 'direction')?.text || ['桜ヶ丘駅', '春日野 2km', '花見台 1.5km'],
  });
  const K = createKit(ctx, atlas);

  // poles
  const attach = new Map();
  const extras = [];
  for (const P of plans) {
    const a = buildPole(K, P);
    a.roadLv = P.rs > 0 ? 1 : 0;
    attach.set(P.id, a);
    extras.push(...a.extraWires);
  }
  // wires
  const rng = ctx.rng(777);
  const links = net.map((l, i) => ({
    A: attach.get(l.a), B: attach.get(l.b), kind: l.kind,
    optical: i % 3 === 0,
    closure: i % 2 === 0, closureT: 0.1 + rng() * 0.12,
  }));
  const drops = planDrops(ctx, plans, attach);
  const spans = buildWires(K, links, drops, extras, rng);

  // signs + mirrors
  buildSigns(K, ctx.layout, plans);
  buildMirrors(K, ctx.layout);

  const root = K.finish('poles');
  // wires keep a minimum on-screen width (depends on fov + drawing-buffer height)
  const bufSize = new THREE.Vector2();
  updateWireWidth(ctx.camera, ctx.renderer, bufSize);
  ctx.onUpdate(() => updateWireWidth(ctx.camera, ctx.renderer, bufSize));
  root.add(buildSparrows(ctx, planPerches(ctx, spans)));
  root.userData.stats = { poles: plans.length, spans: spans.length, drops: drops.length };
  return root;
}
