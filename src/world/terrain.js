/**
 * World module: terrain — every ground surface not owned by another module.
 *
 *   ground      height-field over TERRAIN.extentX/Z with region colours, grass /
 *               soil detail and a flower overlay (terrain/ground.js)
 *   roads       main street ribbon (curved + sloped), station-front, crossing and
 *               north roads, kerb fillets (terrain/roads.js)
 *   paving      lot aprons, konbini forecourt, station plaza, kerbs, tactile
 *               paving (terrain/paving.js)
 *   gutters     側溝 U-channels with instanced covers / grates (terrain/gutters.js)
 *   markings    road paint + Japanese road text (terrain/markings.js)
 *   decals      manholes, patches, stains, spray marks, leaves (terrain/decals.js)
 *   paths       levee / railway gravel paths, levee stairs, drainage troughs
 *   river       stylised toon water + stone revetment (terrain/river.js)
 *   bridge      concrete footbridge over the river at layout BRIDGE (terrain/bridge.js)
 *   lanes       residential lane ends, vegetable plots, gravel car parks (terrain/lanes.js)
 *   vegetation  grass tufts, reeds, flowers (terrain/vegetation.js)
 *
 * Each surface family is emitted straight into one merged geometry per
 * material ("bins"), so the whole module is ~16 draw calls.
 *
 * Exported helper: roadSurfaceY(x, z) — the asphalt top height.
 */
import * as THREE from 'three';
import { GeoBuilder, roadY } from './terrain/common.js';
import * as TX from './terrain/textures.js';
import { markingsAtlas, decalAtlas } from './terrain/atlases.js';
import { buildGround } from './terrain/ground.js';
import { buildRoads } from './terrain/roads.js';
import { buildPaving } from './terrain/paving.js';
import { buildGutters } from './terrain/gutters.js';
import { buildMarkings, MARK_WHITE_CHARS, MARK_YELLOW_CHARS } from './terrain/markings.js';
import { buildDecals } from './terrain/decals.js';
import { buildPaths } from './terrain/paths.js';
import { buildRiver } from './terrain/river.js';
import { buildVegetation } from './terrain/vegetation.js';
import { buildLanes } from './terrain/lanes.js';
import { buildBridge } from './terrain/bridge.js';

/** Height of the asphalt surface at (x, z) (roads sit 3 cm above layout.groundY). */
export function roadSurfaceY(x, z) {
  return roadY(x, z);
}

/** Lazily created per-material geometry builders. */
function makeBins() {
  const map = new Map();
  return {
    get(name) {
      if (!map.has(name)) map.set(name, new GeoBuilder());
      return map.get(name);
    },
    entries: () => map.entries(),
  };
}

export default async function build(ctx) {
  const { toon } = ctx;
  const root = new THREE.Group();
  root.name = 'terrain';

  // ---- textures ------------------------------------------------------------
  const tex = {
    asphalt: TX.asphaltTexture(),
    concrete: TX.concreteTexture(),
    plaza: TX.plazaTexture(),
    gravel: TX.gravelTexture(),
    detail: TX.detailTexture(),
    flowers: TX.flowerTexture(),
    revetment: TX.revetmentTexture(),
    gutter: TX.gutterTexture(),
    tactile: TX.tactileTexture(),
  };
  const marksAtlas = markingsAtlas(MARK_WHITE_CHARS, MARK_YELLOW_CHARS);
  const decAtlas = decalAtlas();

  // ---- materials (cached by toon; one per surface family) ---------------------
  const M = {
    asphalt: toon.mat('#ffffff', { map: tex.asphalt, vertexColors: true, name: 'terrainAsphalt' }),
    concrete: toon.mat('#ffffff', { map: tex.concrete, vertexColors: true, name: 'terrainConcrete' }),
    plaza: toon.mat('#ffffff', { map: tex.plaza, vertexColors: true, name: 'terrainPlaza' }),
    gravel: toon.mat('#ffffff', { map: tex.gravel, vertexColors: true, name: 'terrainGravel' }),
    revetment: toon.mat('#ffffff', { map: tex.revetment, vertexColors: true, name: 'terrainRevetment' }),
    tactile: toon.mat('#ffffff', { map: tex.tactile, vertexColors: true, name: 'terrainTactile' }),
    gutter: toon.mat('#ffffff', { map: tex.gutter, name: 'terrainGutter' }),
    marks: toon.mat('#ffffff', { map: marksAtlas.texture, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: 2, name: 'terrainMarks' }),
    plates: toon.mat('#ffffff', { map: marksAtlas.texture, vertexColors: true, name: 'terrainPlates' }),
    bridgeRail: toon.metal('#a8c7b3', { vertexColors: true, name: 'terrainBridgeRail' }),
    decals: toon.mat('#ffffff', { map: decAtlas.texture, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: 1, name: 'terrainDecals' }),
  };
  M.concreteRaised = M.concrete;

  // ---- build ---------------------------------------------------------------
  const bins = makeBins();
  root.add(buildGround(ctx, tex));
  buildRoads(bins);
  const paving = buildPaving(bins);
  const gutters = buildGutters(ctx, bins, M.gutter);
  gutters.meshes.forEach((m) => root.add(m));
  const marks = buildMarkings(bins, marksAtlas, paving.konbini);
  buildDecals(bins, decAtlas, { grateSpots: gutters.grateSpots, hydrants: marks.hydrants });
  const paths = buildPaths(ctx, bins);
  root.add(ctx.geom.bakeStatic(paths.rail, { name: 'terrain:handrail' }));
  const lanes = buildLanes(ctx, bins, marksAtlas);
  if (lanes.stakeMesh) root.add(lanes.stakeMesh);
  root.add(buildBridge(ctx, bins, marksAtlas, toon.metal('#a8c7b3', { name: 'terrainBaluster' })).balusters);
  buildRiver(ctx, bins, tex).forEach((m) => root.add(m));
  const veg = buildVegetation(ctx, { gutterRuns: gutters.runs, stairs: paths.stairs, carPark: paths.carPark, crops: lanes.crops, grassPlots: lanes.grassPlots });
  veg.meshes.forEach((m) => root.add(m));

  // ---- emit one mesh per bin ---------------------------------------------------
  for (const [name, b] of bins.entries()) {
    if (!b.count) continue;
    const mat = M[name];
    if (!mat) throw new Error(`terrain: no material for bin ${name}`);
    const mesh = new THREE.Mesh(b.build(), mat);
    mesh.name = `terrain:${name}`;
    mesh.receiveShadow = true;
    mesh.castShadow = name === 'concreteRaised' || name === 'bridgeRail'; // only stairs, copings, wheel stops, the bridge stand proud
    if (name === 'marks' || name === 'decals') {
      mesh.userData.noOutline = true;
      mesh.renderOrder = name === 'decals' ? -3 : -2;
    }
    mesh.userData.dynamic = true; // already merged; keep bakeStatic away
    root.add(mesh);
  }
  root.userData.stats = { tufts: veg.counts };
  if (ctx.params?.get('tstats')) logStats(root); // ?tstats=1: per-mesh triangle counts (debug)
  return root;
}

/** Debug: print triangles per terrain mesh (instances multiplied) as one console warning. */
function logStats(root) {
  const rows = [];
  let total = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const tris = ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
    total += tris;
    rows.push(`${o.name || o.material.name}:${Math.round(tris / 1000)}k${o.userData.noOutline ? '' : '*'}`);
  });
  console.warn(`terrain meshes=${rows.length} tris=${Math.round(total / 1000)}k (* = outlined) ${rows.join(' ')}`);
}
