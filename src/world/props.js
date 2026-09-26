/**
 * World module: props — street furniture, vending machines, vehicles and the
 * small objects that tell the town's stories.
 *
 *   props/vending.js   自販機 x6 (SPOTS.vending) + recycling bins, drink crates, のぼり
 *   props/plaza.js     station plaza furniture: round bench around the grand
 *                      sakura (with a school bag, shopping bag, half-drunk cup),
 *                      area / walking maps, bus stop, taxi sign, round post box,
 *                      phone booth, notice board, flower beds, bollards + chains,
 *                      benches, sorted bins, public toilet, 防災倉庫, 消火器, tanuki
 *   props/bicycles.js  mamachari generator (baskets, child seats, rain covers,
 *                      locks, stands) for the plaza racks, the east parking and
 *                      SPOTS.bicycles along the street
 *   props/vehicles.js  kei van, kei car x2, retro taxi (SPOTS.vehicles)
 *   props/shrine.js    hokora with torii / kitsune / ema rack (SPOTS.shrine),
 *                      jizo (SPOTS.jizo), gutter-repair cones + 工事中 sign
 *   props/vendTex.js, props/signTex.js   the two canvas atlases (V, S)
 *   props/kit.js       buckets / transform stack / primitives; one merge per cluster
 *
 * Everything is static: parts are merged per spatial cluster and material,
 * so the module costs a few dozen draw calls.
 */
import * as THREE from 'three';
import { makeVendAtlas } from './props/vendTex.js';
import { makeSignAtlas } from './props/signTex.js';
import { createKit } from './props/kit.js';
import { clusterAt } from './props/common.js';
import { buildVending } from './props/vending.js';
import { buildPlaza } from './props/plaza.js';
import { buildBicycles } from './props/bicycles.js';
import { buildVehicles } from './props/vehicles.js';
import { buildShrine } from './props/shrine.js';

export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = 'props';

  const atlases = { V: makeVendAtlas(), S: makeSignAtlas() };
  const kit = createKit(ctx, atlases);
  const clusterOf = (p) => clusterAt(p.x, p.z, p.y || 0);

  buildVending(kit, clusterOf);
  buildPlaza(kit, clusterOf);
  buildBicycles(kit, clusterOf);
  buildVehicles(kit, clusterOf);
  buildShrine(kit, clusterOf);

  const statics = kit.finish('props-static');
  root.add(statics);

  // ?propsStats=1 prints triangles per cluster / material (development aid)
  if (ctx.params.has('propsStats')) {
    const rows = [];
    let total = 0;
    statics.traverse((o) => {
      if (!o.isMesh) return;
      const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      total += t;
      rows.push(`${o.name}=${Math.round(t)}`);
    });
    console.warn(`[props] meshes=${rows.length} triangles=${Math.round(total)} :: ${rows.join(' ')}`);
  }
  return root;
}
