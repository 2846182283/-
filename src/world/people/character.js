/**
 * people/character — assembles one skinned character from a recipe:
 *
 *   recipe = {
 *     id, kind ('girl'|'woman'|'boy'|'man'|'child'|'elderF'|'elderM'), H,
 *     skin, face {...paintFace opts}, head {jaw, wide},
 *     hair {...buildHair opts} | null, hat {kind, color} | null,
 *     garment {kind, base, ...paintGarment opts, bulk},
 *     sleeve {color, end, cuff, bulk}, hands {L, R, color},
 *     legs {color(y), edges, bulk, hemFlare}, shoes {color, sole, kind},
 *     skirt {...buildSkirt opts} | null, hem {...buildTexturedHem opts} | null,
 *     bones: [[name, parent, x, y, z]]  (extra bones: pages, props),
 *     extras(kit)  (accessories; kit = { RM, D, P, rig, atlas, rects, recipe })
 *   }
 *
 * Output: { object (Group holding the SkinnedMesh + optional detail mesh), mesh,
 *           rig, P, poser }.  One draw call per character (+1 for the no-outline
 *           detail mesh when the recipe has spokes / glasses / screens).
 */
import * as THREE from 'three';
import { RigMesh } from './mesh.js';
import { proportions, makeRig, Poser } from './rig.js';
import { paintFace, paintGarment } from './atlas.js';
import { buildHead, buildTorso, buildArms, buildHands, buildLegs, buildShoes, buildSkirt, buildTexturedHem } from './body.js';
import { buildHair, buildHat } from './hair.js';

/**
 * Flutter vertex patch (shared by every people material): vertices with
 * aFlut > 0 are pushed down-wind (wind converted into object space through
 * the model matrix) with two layered sine waves so hems and hair tips ripple.
 */
export const FLUTTER_PATCH = {
  key: 'peopleFlutter1',
  pars: 'attribute float aFlut;',
  main: /* glsl */ `
  {
    vec3 wW = vec3( toonWind.x, 0.0, toonWind.z );
    vec3 wL = ( vec4( wW, 0.0 ) * modelMatrix ).xyz;
    float ph = dot( position, vec3( 23.1, 11.7, 17.3 ) );
    float w1 = sin( toonTime * 5.3 + ph );
    float w2 = sin( toonTime * 8.9 + ph * 1.7 + 1.3 );
    float s = length( wW );
    float gust = 0.7 + 0.6 * toonWind.y;
    transformed += ( wL * ( 0.75 + 0.35 * w1 ) + vec3( w2 * 0.4, w1 * 0.3 + 0.15, -w2 * 0.3 ) * s ) * aFlut * gust;
  }`,
};

export function buildCharacter(recipe, shared) {
  const { atlas } = shared;
  const P = proportions(recipe.kind, recipe.H);
  const rig = makeRig(P, (typeof recipe.bones === 'function' ? recipe.bones(P) : recipe.bones) || []);
  const RM = new RigMesh(rig.index);
  const D = new RigMesh(rig.index);
  const skin = recipe.skin || '#fbe3d3';

  // face + head
  const faceRect = atlas.cell(`face_${recipe.id}`, (g, S) => paintFace(g, S, { skin, ...recipe.face }));
  buildHead(RM, P, faceRect, skin, recipe.head || {});
  if (recipe.hair) buildHair(RM, P, recipe.hair);
  if (recipe.hat) buildHat(RM, P, recipe.hat, shared.rects);

  // torso garment (texture wrap)
  const y0 = P.torso[0].y, y1 = P.torso[P.torso.length - 1].y;
  const gRect = atlas.cell(`garment_${recipe.id}`, (g, S) => paintGarment(g, S, recipe.garment, P, y0, y1));
  const torso = buildTorso(RM, P, { rect: gRect, bulk: recipe.garment.bulk || 0 });
  const R = (v) => (typeof v === 'function' ? v(P) : v);
  buildArms(RM, P, skin, R(recipe.sleeve));
  buildHands(RM, P, recipe.hands?.color || skin, recipe.hands || {});
  buildLegs(RM, P, R(recipe.legs));
  buildShoes(RM, P, recipe.shoes);
  if (recipe.skirt) buildSkirt(RM, P, R(recipe.skirt));
  if (recipe.hem) buildTexturedHem(RM, P, torso, gRect, R(recipe.hem));

  const kit = { RM, D, P, rig, atlas, rects: shared.rects, recipe, torso, gRect, skin };
  if (recipe.extras) recipe.extras(kit);

  return finishRig(RM, D, rig, P, shared, recipe.id);
}

/** Turn filled RigMeshes + rig into scene objects (also used by cats). */
export function finishRig(RM, D, rig, P, shared, id) {
  const object = new THREE.Group();
  object.name = `person:${id}`;
  const mesh = new THREE.SkinnedMesh(RM.build(), shared.material);
  mesh.name = `skin:${id}`;
  mesh.add(rig.root);
  mesh.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(rig.list);
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  object.add(mesh);
  let detail = null;
  if (!D.empty) {
    detail = new THREE.SkinnedMesh(D.build(), shared.material);
    detail.name = `detail:${id}`;
    detail.bind(skeleton, mesh.matrixWorld);
    detail.userData.noOutline = true;
    detail.castShadow = false;
    detail.receiveShadow = true;
    mesh.add(detail);
  }
  const poser = new Poser(rig, object);
  return { object, mesh, detail, rig, P, poser, skeleton };
}

/** After posing: bounding spheres from the posed skeleton (+ margin for animation). */
export function fitBounds(ch, margin = 0.35) {
  // updateMatrixWorld (not updateWorldMatrix): SkinnedMesh refreshes its bindMatrixInverse
  // there, and the skeleton must be current, otherwise computeBoundingSphere() returns a
  // WORLD-space sphere that the renderer then offsets again -> the character gets culled.
  ch.object.updateMatrixWorld(true);
  ch.skeleton.update();
  for (const m of [ch.mesh, ch.detail]) {
    if (!m) continue;
    m.computeBoundingSphere();
    m.boundingSphere.radius += margin;
    m.computeBoundingBox?.();
  }
}
