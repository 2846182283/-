/**
 * World module: houses (住宅) — every lot of type 'house' in layout.LOTS.
 *
 * Each lot is turned into a deterministic plan (houses/plan.js) and emitted
 * straight into a district-wide geometry batch (houses/batch.js):
 *   shell.js      foundation, walls with real openings, roofs, eaves, gutters
 *   openings.js   windows (glass + room boxes + curtains), doors, porch,
 *                 balcony + laundry
 *   exterior.js   fences, gates, plants, doorstep clutter, AC units, meters,
 *                 service drop, antennas, garden patches
 *   templates.js  small repeated objects (stamped)
 *   textures.js   canvas atlases (walls, roofs, decals, grime, laundry)
 *
 * All houses end up as ~one mesh per (area chunk x material kind): roughly
 * 60 draw calls for 117 houses.  Laundry and wind-chime strips sway in the
 * vertex shader (toonWind / toonTime), so they stay batched too.
 */
import * as THREE from 'three';
import { Batcher, mtx } from './houses/batch.js';
import { makePlan } from './houses/plan.js';
import { roofParams, buildFoundation, buildFacadeWall, buildRoof, buildFrontEave } from './houses/shell.js';
import { planOpenings, buildOpenings } from './houses/openings.js';
import { buildExterior, pottedPlant } from './houses/exterior.js';
import { makeTemplates } from './houses/templates.js';
import { makeWallAtlas, makeRoofAtlas, makeDecalAtlas, makeGrimeAtlas, makeLaundryAtlas } from './houses/textures.js';

/** Laundry sway: displacement grows with the distance below the pole (attribute `sway`). */
const LAUNDRY_PATCH = {
  key: 'houses-laundry-sway',
  pars: 'attribute float sway;',
  main: /* glsl */ `
    if ( sway > 0.0 ) {
      vec2 wd = toonWind.xz;
      float ws = length( wd );
      vec2 dir = ws > 0.001 ? wd / ws : vec2( 1.0, 0.0 );
      float ph = position.x * 0.9 + position.z * 0.7;
      float osc = sin( toonTime * 2.1 + ph ) * 0.6 + sin( toonTime * 3.7 + ph * 1.9 ) * 0.4;
      float amp = sway * ( 0.07 + 0.2 * ws + 0.25 * toonWind.y );
      transformed.xz += dir * ( sway * 0.1 * ws + osc * amp );
      transformed.y += sway * sway * 0.06 * ws * ( 0.7 + 0.3 * osc );
    }
  `,
};

/**
 * Window glass: the shared toon glass with a house-specific tint, and cooler,
 * darker sky reflections so glass reads blue-grey (not white) at grazing
 * angles and the room behind stays visible.
 */
function houseGlass(toon) {
  const m = toon.glass({ tint: '#7d97b0', opacity: 0.24, sheen: 0.2 });
  m.uniforms.skyHorizon.value.set('#9fb4c9');
  m.uniforms.skyTop.value.set('#6f94c2');
  m.uniforms.groundRefl.value.set('#6d7079');
  return m;
}

/** Area chunks keep frustum culling useful while holding draw calls down. */
function chunkOf(lot) {
  if (lot.street === 'north') return lot.x < 0 ? 'nrW' : 'nrE';
  if (lot.street === 'stationFront') return lot.x < 0 ? 'sfW' : 'sfE';
  return lot.z < 78 ? 'mainN' : 'mainS';
}

export default async function build(ctx) {
  const { toon, layout } = ctx;
  const root = new THREE.Group();
  root.name = 'houses';

  // --- textures & materials --------------------------------------------------
  const wallTex = makeWallAtlas();
  const roofTex = makeRoofAtlas();
  const decal = makeDecalAtlas();
  const grime = makeGrimeAtlas();
  const laundry = makeLaundryAtlas();
  const solid = toon.mat('#ffffff', { vertexColors: true, name: 'houses-solid' });
  const kinds = {
    wall: { material: toon.mat('#ffffff', { map: wallTex, vertexColors: true, name: 'houses-wall' }), castShadow: true },
    roof: { material: toon.mat('#ffffff', { map: roofTex, vertexColors: true, name: 'houses-roof' }), castShadow: true },
    solid: { material: solid, castShadow: true },
    small: { material: solid, noOutline: true, castShadow: false },
    metal: { material: toon.metal('#ffffff', { vertexColors: true, name: 'houses-metal' }), castShadow: true },
    leaf: { material: toon.mat('#ffffff', { vertexColors: true, rim: 0.35, name: 'houses-leaf' }), castShadow: true },
    glass: { material: houseGlass(toon), noOutline: true, castShadow: false },
    // interiors stay in the outline pre-pass so they hide the edges of geometry behind them
    unlit: { material: toon.unlit('#ffffff', { vertexColors: true, name: 'houses-unlit' }), castShadow: false },
    decal: { material: toon.mat('#ffffff', { map: decal.texture, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, name: 'houses-decal' }), noOutline: true, castShadow: false },
    grime: { material: toon.mat('#ffffff', { map: grime.texture, transparent: true, depthWrite: false, polygonOffset: 2, name: 'houses-grime' }), noOutline: true, castShadow: false, renderOrder: 1 },
    laundry: {
      material: toon.mat('#ffffff', { map: laundry.texture, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, vertexPatch: LAUNDRY_PATCH, name: 'houses-laundry' }),
      castShadow: true, sway: true,
    },
  };

  // shared resources handed to the builders
  const D = { decal, grime, laundry, mtx, tpl: null, porch: null };
  D.tpl = makeTemplates(D);
  D.pottedPlant = (B, x, y, z, r, kind) => pottedPlant(B, D, x, y, z, r, kind);

  const B = new Batcher(kinds);
  const lots = layout.LOTS.filter((l) => l.type === 'house');
  const stats = { full: 0, reduced: 0, simple: 0 };
  const lotM = new THREE.Matrix4();
  for (const lot of lots) {
    const P = makePlan(lot);
    stats[P.lod]++;
    planOpenings(P);
    B.setChunk(chunkOf(lot));
    lotM.makeRotationY(lot.rotY).setPosition(lot.x, lot.y, lot.z);
    B.setBase(lotM);
    D.porch = null;
    for (const b of P.blocks) b.rp = roofParams(b);
    for (const b of P.blocks) buildFoundation(B, P, b);
    for (const f of P.facades) buildFacadeWall(B, P, f);
    for (const b of P.blocks) buildRoof(B, P, b);
    if (P.frontEave) buildFrontEave(B, P);
    buildOpenings(B, P, D);
    buildExterior(B, P, D);
    addColliders(ctx, lot, P);
  }
  const batch = B.build('houses');
  root.add(batch);
  root.userData.stats = { ...stats, triangles: B.tris, meshes: batch.children.length };
  if (ctx.params.has('shot')) console.info(`[houses] lots ${lots.length} (${JSON.stringify(stats)}), meshes ${batch.children.length}, tris ${B.tris}`);
  return root;
}

/** Walk-mode colliders: world AABB of each (slightly shrunk) block footprint. */
function addColliders(ctx, lot, P) {
  if (!ctx.addCollider) return;
  for (const b of P.blocks) {
    const pts = [[b.x0 + 0.1, b.z0 + 0.1], [b.x1 - 0.1, b.z0 + 0.1], [b.x1 - 0.1, b.z1 - 0.1], [b.x0 + 0.1, b.z1 - 0.1]].map(([x, z]) => lot.toWorld(x, z));
    const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    ctx.addCollider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
  }
}

