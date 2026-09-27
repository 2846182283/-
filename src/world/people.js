/**
 * World module: people — a small cast of anime townsfolk and three cats.
 *
 * Kept deliberately modest (18 people spread over the whole town): each carries a little story —
 * the station attendant checking his watch, a girl with her bike waiting at
 * the crossing, a boy choosing a drink, a reader on the platform bench, the
 * café clerk chalking today's menu, a grandmother with a leek in her eco bag,
 * a girl holding her hair against the spring breeze under the great sakura,
 * students chatting at a door mark, a commuter at the ticket machine, an old
 * man strolling up the street, and a child pointing at the blossoms.
 *
 * Tech: every character / cat is ONE SkinnedMesh (plus an optional no-outline
 * detail mesh for spokes, glasses, whiskers, phone screen) sharing a single
 * vertex-coloured toon material and one 2048² canvas atlas (faces, garment
 * wraps, prints).  Hair tips / hems / scarves flutter in the vertex shader
 * from sim.wind; bones handle poses, IK reaches and idle animation.
 * Cats find their perches (garden-wall tops, the shrine's stone ledge, a
 * stepping stone) with a one-pass triangle-grid probe over the geometry the
 * other modules built (people/probe.js), so they sit ON things.
 * See people/*.js for the pieces:
 *   mesh.js (RigMesh + generators), rig.js (proportions, bones, IK), body.js,
 *   hair.js, accessories.js, bicycle.js, atlas.js (faces / garments / prints),
 *   character.js (assembly), recipes.js (looks), cast.js (placement + idles),
 *   cats.js, probe.js.
 */
import * as THREE from 'three';
import { PeopleAtlas, paintBookCover, paintBag, paintBadge, paintPhone } from './people/atlas.js';
import { FLUTTER_PATCH } from './people/character.js';
import { buildCast } from './people/cast.js';
import { buildCats } from './people/cats.js';

export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = 'people';

  // shared atlas: small print cells first (faces / garments are added per character)
  const atlas = new PeopleAtlas();
  const rects = {
    book: atlas.cell('book', (g, S) => paintBookCover(g, S)),
    bagGreen: atlas.cell('bagGreen', (g, S) => paintBag(g, S, '#7f9a86', 'はるマート')),
    badge: atlas.cell('badge', (g, S) => paintBadge(g, S)),
    phone: atlas.cell('phone', (g, S) => paintPhone(g, S)),
  };
  // the material samples the atlas texture, which is created after all cells are painted
  const shared = { atlas, rects, material: null };
  const tex = new THREE.CanvasTexture(atlas.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  shared.material = ctx.toon.mat('#ffffff', { map: tex, vertexColors: true, rim: 0.28, vertexPatch: FLUTTER_PATCH, name: 'people' });

  const cast = buildCast(ctx, shared);
  root.add(cast.group);
  const cats = buildCats(ctx, shared, root);
  root.add(cats.group);

  tex.needsUpdate = true; // all cells painted
  return root;
}
