/**
 * World module: station (桜ヶ丘駅)
 *
 * A small suburban ground-level station with two side platforms:
 *   building.js   the station house (walls, roof, front gable + name board, entrance, windows, garden)
 *   interior.js   concourse: ticket machines, fare chart, gates, staffed booth, office, stairs + ramp to P1,
 *                 notice board, stamp table, bins, umbrella rack, clock, departure board...
 *   platforms.js  P1 / P2 bodies, paving, tactile blocks, safety line, door marks, ramps, fences, weeds
 *   furniture.js  canopies, lights, hanging signs, 駅名標, benches, bins, platform-end equipment
 *   xcrossing.js  in-station level crossing (構内踏切) with warning lamp + chain gates
 *   signs.js      every sign / poster painted into two canvas atlases
 *   clocks.js     all clock hands in one InstancedMesh, driven by sim time
 *
 * Everything static is merged with geom.bakeStatic (one mesh per material), so
 * the whole station costs a few dozen draw calls.
 */
import * as THREE from 'three';
import { createKit } from './station/kit.js';
import { makeSigns } from './station/signs.js';
import { createClocks } from './station/clocks.js';
import { buildBuilding } from './station/building.js';
import { buildInterior } from './station/interior.js';
import { buildPlatforms } from './station/platforms.js';
import { buildFurniture } from './station/furniture.js';
import { buildInStationCrossing } from './station/xcrossing.js';

export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = 'station';

  const kit = createKit(ctx);
  const S = makeSigns(kit);
  const clocks = createClocks(kit, S);

  const statics = new THREE.Group();
  statics.name = 'station-static';
  buildBuilding(kit, S, statics, clocks);
  buildInterior(kit, S, statics, clocks);
  buildPlatforms(kit, S, statics);
  buildFurniture(kit, S, statics, clocks);
  const crossing = buildInStationCrossing(kit, S, statics);

  // sign atlas pages after packing (trimmed to their content): debug / budget info
  root.userData.atlasStats = [...new Set([kit.atlas, kit.atlas2, kit.atlas3])].map((a) => ({
    size: `${a.w}x${a.h}`, used: +a.used.toFixed(2), fill: +a.fill.toFixed(2),
  }));

  const baked = ctx.geom.bakeStatic(statics, { name: 'station' });
  root.add(baked);
  clocks.finish(root);
  if (crossing.dynamic) root.add(crossing.dynamic);

  // walk-mode colliders (the building's outer walls are registered by the controls)
  for (const c of kit.colliders || []) ctx.addCollider(...c);

  ctx.onUpdate((dt, t) => {
    clocks.update(t);
    crossing.update(dt, t);
  });
  return root;
}
