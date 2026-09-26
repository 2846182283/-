/**
 * World module: shops (商店街) — every non-house lot in layout.LOTS:
 *   cafe 喫茶, flower 花屋, books 書店, bicycle 自転車店, konbini コンビニ,
 *   wagashi 和菓子, zakka 山田商店 (Showa general store), ramen らーめん,
 *   tabako たばこ店.
 *
 * Pipeline
 *   1. paint every sign / poster / product front into one canvas atlas
 *      (shops/paint.js -> shops/atlas.js)
 *   2. each lot's builder (shops/<type>.js) emits geometry in lot-local space
 *      into a Batcher (shops/batch.js) using parts / shell helpers
 *   3. the Batcher yields ONE mesh per (street chunk x material kind)
 *      -> ~40 draw calls for all nine shops
 *   4. dynamic bits: the konbini's automatic doors slide open when the viewer
 *      walks up to them.  Noren, flags, awning valances, wind chimes and
 *      flower cards sway in the vertex shader (toonWind / toonTime), so they
 *      stay batched.
 */
import * as THREE from 'three';
import { Batcher } from './shops/batch.js';
import { Atlas, plasterTexture, woodTexture, rowsTexture } from './shops/atlas.js';
import { paintAll } from './shops/paint.js';
import { buildCafe } from './shops/cafe.js';
import { buildFlower } from './shops/flower.js';
import { buildBooks } from './shops/books.js';
import { buildBicycle } from './shops/bicycle.js';
import { buildKonbini } from './shops/konbini.js';
import { buildWagashi } from './shops/wagashi.js';
import { buildZakka } from './shops/zakka.js';
import { buildRamen } from './shops/ramen.js';
import { buildTabako } from './shops/tabako.js';

/** Cloth / foliage sway.  `sway` (vertex attribute) = 0 at attachment .. 1 at the free end. */
const SWAY_PATCH = {
  key: 'shops-sway',
  pars: 'attribute float sway;',
  main: /* glsl */ `
    if ( sway > 0.0 ) {
      vec2 wd = toonWind.xz;
      float ws = length( wd );
      vec2 dir = ws > 0.001 ? wd / ws : vec2( 1.0, 0.0 );
      float ph = position.x * 1.3 + position.z * 1.1 + position.y * 0.35;
      float osc = sin( toonTime * 2.1 + ph ) * 0.65 + sin( toonTime * 3.6 + ph * 1.7 ) * 0.35;
      vec3 nn = normalize( objectNormal );
      float push = dot( dir, nn.xz );
      float amp = sway * ( 0.03 + 0.06 * ws + 0.08 * toonWind.y );
      transformed.xz += nn.xz * ( push * ws * 0.07 * sway + osc * amp ) + dir * sway * ws * 0.025;
      transformed.y += sway * sway * ws * 0.02;
    }
  `,
};

const BUILDERS = {
  cafe: buildCafe,
  flower: buildFlower,
  books: buildBooks,
  bicycle: buildBicycle,
  konbini: buildKonbini,
  wagashi: buildWagashi,
  zakka: buildZakka,
  ramen: buildRamen,
  tabako: buildTabako,
};

/** Street chunks: neighbouring shops share meshes (few draw calls, useful culling). */
function chunkOf(lot) {
  if (lot.type === 'konbini') return 'konbini';
  if (lot.side > 0) return 'east';
  if (lot.type === 'books' || lot.type === 'bicycle') return 'westS';
  return 'westN';
}

/** Glass tuned for shop fronts: bluish-grey reflection, interior clearly visible. */
function shopGlass(toon, opacity = 0.2, sheen = 0.22) {
  const m = toon.glass({ tint: '#8ea6ba', opacity, sheen });
  m.uniforms.skyHorizon.value.set('#a9bdd0');
  m.uniforms.skyTop.value.set('#7fa2cc');
  m.uniforms.groundRefl.value.set('#72757e');
  return m;
}

export default async function build(ctx) {
  const { toon, layout } = ctx;
  const root = new THREE.Group();
  root.name = 'shops';
  const lots = layout.LOTS.filter((l) => layout.SHOP_TYPES.includes(l.type));

  // --- 1. textures -----------------------------------------------------------
  const names = {};
  for (const l of lots) names[l.type] = l.name;
  const A = new Atlas(2048, 4096, 3, 0.93); // packs into one 2048 x 2048 page
  paintAll(A, names);
  const atlasTex = A.finish();
  const plaster = plasterTexture();
  const wood = woodTexture();
  const rows = rowsTexture();

  // --- 2. materials ----------------------------------------------------------
  const solid = toon.mat('#ffffff', { map: atlasTex, vertexColors: true, name: 'shops-solid' });
  const kinds = {
    solid: { uv: 'atlas' },
    deco: { uv: 'atlas' },
    plaster: { uv: 'metric', scale: 0.5 },
    wood: { uv: 'metric', scale: 1 },
    rows: { uv: 'metric', scale: 1 },
    lit: { uv: 'atlas' },
    glass: { uv: 'atlas' },
    glassClear: { uv: 'atlas' },
    cloth: { uv: 'atlas', sway: true, double: true },
    cut: { uv: 'atlas', sway: true, double: true },
    inner: { uv: 'atlas' },
  };
  const mats = {
    solid: { material: solid, castShadow: true },
    deco: { material: solid, castShadow: false, noOutline: true },
    plaster: { material: toon.mat('#ffffff', { map: plaster, vertexColors: true, name: 'shops-plaster' }), castShadow: true },
    wood: { material: toon.mat('#ffffff', { map: wood, vertexColors: true, name: 'shops-wood' }), castShadow: true },
    rows: { material: toon.mat('#ffffff', { map: rows, vertexColors: true, name: 'shops-rows' }), castShadow: true },
    lit: { material: toon.unlit('#ffffff', { map: atlasTex, vertexColors: true, name: 'shops-lit' }), noOutline: true },
    glass: { material: shopGlass(toon), noOutline: true },
    // konbini floor-to-ceiling glass: thinner so the bright interior reads from oblique angles
    glassClear: { material: shopGlass(toon, 0.1, 0.16), noOutline: true },
    cloth: { material: toon.mat('#ffffff', { map: atlasTex, vertexColors: true, side: THREE.DoubleSide, vertexPatch: SWAY_PATCH, name: 'shops-cloth' }), castShadow: true },
    cut: { material: toon.mat('#ffffff', { map: atlasTex, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.5, vertexPatch: SWAY_PATCH, name: 'shops-cut' }), noOutline: true },
    inner: { material: toon.mat('#ffffff', { map: atlasTex, vertexColors: true, emissive: '#4a3a26', name: 'shops-inner' }), castShadow: false },
  };

  // --- 3. geometry -----------------------------------------------------------
  const B = new Batcher(kinds, A.whiteUV);
  const dynamic = [];
  for (const lot of lots) {
    const S = makeContext(ctx, B, A, lot, { dynamic, mats });
    const fn = BUILDERS[lot.type];
    try {
      fn(S);
    } catch (e) {
      console.error(`[shops] ${lot.type} failed`, e);
      throw e;
    }
  }
  for (const mesh of B.finish(mats)) root.add(mesh);
  for (const d of dynamic) root.add(d.object);

  // --- 4. animation (konbini doors) -----------------------------------------
  if (dynamic.length) {
    const camPos = new THREE.Vector3();
    ctx.onUpdate((dt, t, rdt) => {
      ctx.camera.getWorldPosition(camPos);
      for (const d of dynamic) d.update(camPos, rdt ?? dt);
    });
  }
  return root;
}

/** Per-lot build context (see parts.js for the conventions). */
function makeContext(ctx, B, A, lot, extra) {
  const { layout } = ctx;
  const m = new THREE.Matrix4().makeRotationY(lot.rotY).setPosition(lot.x, lot.y, lot.z);
  B.setChunk(chunkOf(lot));
  B.setBase(m);
  const W = lot.width, D = lot.depth;
  const apronLift = lot.type === 'konbini' ? 0.114 : 0.075; // terrain paving heights (aprons / forecourt)
  const rawY = (lx, lz) => { const w = lot.toWorld(lx, lz); return layout.groundY(w.x, w.z) - lot.y; };
  const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]].map(([a, b]) => rawY(a, b));
  const frontY = Math.max(rawY(-W / 2, D / 2 + 0.3), rawY(W / 2, D / 2 + 0.3), rawY(0, D / 2 + 0.3)) + apronLift;
  const S = {
    ctx, B, A, lot, W, D,
    rng: ctx.rng(lot.seed || 7),
    minGround: Math.min(...corners),
    maxGround: Math.max(...corners),
    frontY,
    /** Paved surface height at a lot-local point (apron in front of the lot line, raw ground behind). */
    gy: (lx, lz) => rawY(lx, lz) + (lz > D / 2 - 0.05 ? apronLift : 0),
    rawY,
    /** Lot-local AABB -> world walk collider. */
    addCollider(x0, x1, z0, z1) {
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => lot.toWorld(a, b));
      ctx.addCollider(Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.z)), Math.max(...pts.map((p) => p.z)));
    },
    /** Register a dynamic object ({object, update(camPos, dt)}) built in lot-local space. */
    addDynamic(obj, update) {
      obj.applyMatrix4(m);
      extra.dynamic.push({ object: obj, update });
    },
    mats: extra.mats,
    matrix: m,
  };
  return S;
}
