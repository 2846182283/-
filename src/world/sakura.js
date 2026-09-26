/**
 * World module: sakura — the scene's main visual element.
 *
 *   trees          every layout.TREES entry: gnarled trunk with root flare, limbs that
 *                  fork naturally (bark with horizontal lenticels), layered sheet-like
 *                  blossom masses with 4 painted pink value steps, camera-facing flower
 *                  sprigs (young-leaf accents), 胴吹き tufts on old trunks, wind sway,
 *                  back-light glow; the hero tree reaches over the street into the shot
 *   pits           round / square granite pits, stone rings, soil patches with grass,
 *                  moss and small spring flowers
 *   fallen petals  drift bands, heaps, gutter drifts, corners, ballast, platform,
 *                  vending tops, café window, and petal rafts drifting on the river
 *   falling petals one GPU particle system (near / mid / far layers, wind spirals, train gusts)
 *
 * Code lives in src/world/sakura/*.js; this file wires it together.
 * URL debug: ?sakura=noPetals,noTrees,noPits,noGround,nearOnly (dev helpers).
 */
import * as THREE from 'three';
import { barkTexture, floralTexture, blossomAtlas } from './sakura/textures.js';
import { canopyMaterials } from './sakura/canopy.js';
import { buildTrees } from './sakura/trees.js';
import { buildPits } from './sakura/pits.js';
import { buildGroundPetals } from './sakura/groundPetals.js';
import { buildFallingPetals } from './sakura/fallingPetals.js';

export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = 'sakura';
  const dbg = (ctx.params.get('sakura') || '').split(',');

  // ---- shared textures & materials ----
  const texs = {
    bark: barkTexture(),
    floral: floralTexture(),
    atlas: blossomAtlas(),
    granite: ctx.tex.noiseTexture({ size: 128, scale: 16, octaves: 2, base: '#d7d4cd', variation: 0.16, seed: 31 }),
    soil: ctx.tex.noiseTexture({ size: 128, scale: 8, octaves: 3, base: '#8d7760', variation: 0.22, seed: 32, tint: '#7e8a5c', repeat: [1, 1] }),
  };
  texs.floral.anisotropy = 4;
  const canopy = canopyMaterials(ctx, { floralMap: texs.floral, atlas: texs.atlas });
  const mats = {
    bark: ctx.toon.mat('#ffffff', { map: texs.bark, vertexColors: true, rim: 0.2, name: 'sakura_bark' }),
    clump: canopy.clump,
    card: canopy.card,
    clumpDepth: canopy.clumpDepth,
  };

  // ---- trees ----
  const trees = buildTrees(ctx, mats, { onlyNear: dbg.includes('nearOnly') });
  if (!dbg.includes('noTrees')) root.add(trees.group);
  if (!dbg.includes('noPits')) root.add(buildPits(ctx, trees.infos, texs));

  // ---- petals ----
  const gp = buildGroundPetals(ctx, trees.infos);
  if (!dbg.includes('noGround')) root.add(gp.ground, gp.rafts);
  if (!dbg.includes('noPetals')) root.add(buildFallingPetals(ctx, trees.infos));

  root.userData.stats = { trees: trees.infos.length, ...trees.stats, groundPetals: gp.count };
  if (ctx.params.has('shot')) console.info('[sakura]', JSON.stringify(root.userData.stats));
  return root;
}
