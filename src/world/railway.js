/**
 * World module: railway — the double-track Harukaze Line through 桜ヶ丘.
 *
 *   track.js      ballast bed, stones, sleepers, rails, joints, fastenings
 *   turnouts.js   the scenic crossover (T1 / T2) west of the station
 *   catenary.js   masts, lattice portals, cantilevers, insulators, wires
 *   signals.js    colour-light signals (automatic-block aspects from sim.trains)
 *   trackside.js  troughs, path, ditch, fences, posts, boards, cabinets, phones
 *   weeds.js      spring weeds and wild flowers
 *   signs.js      the painted sign atlas;  textures.js  ballast / mesh / weed textures
 *
 * Static parts are painted with vertex colours and merged per material
 * ("buckets"), so the whole railway is ~16 draw calls.  The level-crossing
 * deck/barriers (crossing.js), platforms (station.js), petals (sakura.js) and
 * trains (train.js) are other modules' work; this module keeps their space clear.
 */
import * as THREE from 'three';
import { Buckets } from './railway/common.js';
import { ballastTexture, mottleTexture, chainLinkTexture, weedAtlas } from './railway/textures.js';
import { buildSignAtlas, signPlane } from './railway/signs.js';
import { buildTrack } from './railway/track.js';
import { crossoverPlan, crossoverTimbers, buildTurnouts } from './railway/turnouts.js';
import { buildCatenary, catenaryPlan } from './railway/catenary.js';
import { buildSignals } from './railway/signals.js';
import { buildTrackside } from './railway/trackside.js';
import { buildWeeds } from './railway/weeds.js';

/** Wind sway for weed cards (uses the per-vertex `sway` height weight). */
const WEED_SWAY = {
  key: 'railwayWeedSway',
  pars: 'attribute float sway;',
  main: /* glsl */ `
    {
      float ph = toonTime * 2.1 + transformed.x * 0.8 + transformed.z * 0.55;
      float gust = 0.35 + length( toonWind.xz ) * 0.6 + toonWind.y * 0.8;
      transformed.x += sway * ( toonWind.x * 0.10 + sin( ph ) * 0.05 * gust );
      transformed.z += sway * ( toonWind.z * 0.10 + cos( ph * 0.83 ) * 0.04 * gust );
    }
  `,
};

/** Both faces of alpha cards share the (upward) normal -> no dark back faces. */
const noFaceFlip = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;');
};

function makeMaterials(ctx, tex) {
  const { toon } = ctx;
  const M = {
    vc: toon.mat('#ffffff', { vertexColors: true, map: tex.mottle, name: 'railway_vc' }),
    rail: toon.metal('#ffffff', { vertexColors: true, spec: 0.42, shininess: 55, name: 'railway_rail' }),
    steel: toon.metal('#ffffff', { vertexColors: true, spec: 0.3, shininess: 28, map: tex.mottle, name: 'railway_steel' }),
    bed: toon.mat('#ffffff', { vertexColors: true, map: tex.ballast, name: 'railway_bed' }),
    inst: toon.mat('#ffffff', { name: 'railway_inst' }),
    fast: toon.metal('#ffffff', { vertexColors: true, spec: 0.35, shininess: 40, name: 'railway_fast' }),
    atlas: toon.mat('#ffffff', { map: tex.atlas.tex, name: 'railway_signs' }),
    wire: toon.unlit('#40434b', { name: 'railway_wire' }),
    lamp: toon.unlit('#ffffff', { name: 'railway_lamp' }),
    weed: toon.mat('#ffffff', {
      map: tex.weeds.tex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true,
      vertexPatch: WEED_SWAY, onShader: noFaceFlip, onShaderKey: 'noFaceFlip', name: 'railway_weed',
    }),
    fence: toon.mat('#ffffff', {
      map: tex.chain, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      onShader: noFaceFlip, onShaderKey: 'noFaceFlip', name: 'railway_fence',
    }),
  };
  return M;
}

/** Triangle count per child (instanced meshes multiplied by their count). */
function triangleReport(root) {
  const out = {};
  let total = 0;
  for (const o of root.children) {
    if (!o.geometry) continue;
    const g = o.geometry;
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    const t = Math.round(n * (o.isInstancedMesh ? o.count : 1));
    if (o.isLineSegments) continue;
    out[o.name] = t;
    total += t;
  }
  out.total = total;
  return out;
}

function devGround(ctx) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1000, 400), ctx.toon.mat('#b3c796'));
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, -0.004, -20);
  m.receiveShadow = true;
  m.userData.noOutline = true;
  return m;
}

export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = 'railway';
  const t0 = performance.now();

  // --- textures & materials -------------------------------------------------
  const poleCount = catenaryPlan(null).xs.length * 2 + 8;
  const tex = {
    ballast: ballastTexture(11),
    mottle: mottleTexture(5),
    chain: chainLinkTexture(),
    weeds: weedAtlas(21),
    atlas: buildSignAtlas(ctx, { poleCount }),
  };
  const M = makeMaterials(ctx, tex);

  // --- the kit shared by every sub-builder ------------------------------------
  const B = new Buckets(ctx.geom);
  B.define('bed', M.bed, { cast: false });
  B.define('rail', M.rail, { cast: true });
  B.define('railSmall', M.rail, { cast: false, noOutline: true });
  B.define('steel', M.steel, { cast: true });
  B.define('steelSmall', M.steel, { cast: false, noOutline: true });
  B.define('vc', M.vc, { cast: true });
  B.define('vcSmall', M.vc, { cast: false, noOutline: true });
  B.define('atlas', M.atlas, { cast: false, noOutline: true });
  B.define('wire', M.wire, { cast: false, noOutline: true });
  B.define('weed', M.weed, { cast: false, noOutline: true, keep: ['color', 'sway'] });
  B.define('fenceS', M.fence, { cast: false, noOutline: true });
  B.define('fenceN', M.fence, { cast: false, noOutline: true });

  const objects = [];
  const linePos = [];
  const K = {
    ctx, THREE, geom: ctx.geom, toon: ctx.toon, B, M,
    rng: (seed) => ctx.rng(seed),
    stats: {},
    poleCount,
    weedCells: tex.weeds.cells,
    pointMachines: [],
    mastSpots: [],
    occupied: [],
    timbers: [],
    add(o) { objects.push(o); },
    /** reserve a round spot (for placing posts / boxes without collisions) */
    occupy(x, z, r) { K.occupied.push({ x, z, r }); },
    free(x, z, r) { return !K.occupied.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r); },
    /** printed sign quad facing ry (plane +Z rotated by ry) */
    sign(name, w, h, x, y, z, ry = 0, rx = 0) {
      const g = signPlane(tex.atlas, name, w, h);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')).setPosition(x, y, z));
      B.add('atlas', g, '#ffffff');
    },
    /** a wire: thin tube (close-up) + a 1-px GL line (distance) */
    wire(points, r = 0.012, radial = 3, noLine = false) {
      B.add('wire', ctx.geom.tubeAlong(points, r, radial), '#ffffff');
      if (noLine) return;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    },
  };

  // --- build ------------------------------------------------------------------
  const plan = crossoverPlan();
  K.crossover = plan;
  if (plan) {
    K.crossoverSpan = plan.span;
    K.timbers = crossoverTimbers(plan, ctx.rng(88));
  }
  buildTrack(K);
  buildTurnouts(K, plan);
  buildCatenary(K, plan);
  buildSignals(K);
  buildTrackside(K);
  buildWeeds(K);

  // --- assemble -----------------------------------------------------------------
  for (const m of B.finish()) root.add(m);
  for (const o of objects) root.add(o);
  if (linePos.length) {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#666b76', transparent: true, opacity: 0.42, fog: true, depthWrite: false }));
    lines.name = 'railway:wireLines';
    lines.userData.noOutline = true;
    root.add(lines);
  }
  // dev aid while terrain.js is unfinished: ?railDevGround=1 adds a flat ground plane
  if (ctx.params.get('railDevGround') === '1') root.add(devGround(ctx));
  root.userData.railTopY = 0.45;
  if (ctx.params.get('railStats') === '1') console.warn('[railway] triangles', JSON.stringify(triangleReport(root)));
  root.userData.buildMs = Math.round(performance.now() - t0);
  root.userData.stats = K.stats;
  return root;
}
