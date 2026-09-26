/**
 * House planner: turns a layout lot + its seed into a complete description
 * of one house (massing blocks, finishes, roofs, facades with openings,
 * entrance, balcony, style flags).  Pure data, no geometry — shell.js,
 * openings.js and exterior.js read the plan and emit geometry.
 *
 * Lot-local frame: front faces +Z, footprint centred on the origin, y = 0 at
 * the lot's ground height (lot.y).  Walls start on a 0.45 m concrete
 * foundation; storeys are 2.75 m.
 */
import { makeRng, groundY } from '../../core/layout.js';
import { PALETTE as P } from '../../core/palette.js';

export const FOUND = 0.45; // top of the concrete foundation (floor level)
export const STOREY = 2.75;
export const WALL_T = 0.12; // wall reveal depth at openings

// --- colour sets ------------------------------------------------------------
const FINISHES = {
  plaster: ['#f2e6cf', '#f6f3ec', '#ebe0c9', '#f1e4d8', '#e9e5da', '#f4ecd9'],
  siding: ['#b9cddd', '#c4d6c0', '#ebe4d2', '#d3dce4', '#f2eee4', '#c9d9e6', '#dfe5d5'],
  tile: ['#c9cbcc', '#d9d4c9', '#c2c6c9', '#e0dcd3'],
  wood: ['#5b4332', '#4f3d31', '#66503f'],
};
const KAWARA = ['#5f6670', '#56677a', '#4f6b5e', '#646a74', '#5a6272', '#7a808a', '#4d5f73', '#8a6a55'];
const METAL = ['#56677a', '#5f6670', '#4f6b5e', '#6d5a4f', '#7d858e', '#4d5a6a', '#6e7c6a', '#8a5a4a', '#5b7a8c'];
const FRAMES = ['#4a4d52', '#5d4636', '#8a8e93', '#3f3b38', '#6a4e3a'];
const TRIMS = ['#f3f1ea', '#e9e5dc', '#4d4843', '#5b4332', '#d9d6cf'];
const CURTAINS = ['#f4efe4', '#f7e8e8', '#e8eef4', '#efe9d6', '#f1f1ec', '#e6ebdc', '#f2dfd0'];

const pickW = (r, items) => {
  // items: [[value, weight], ...]
  let t = 0;
  for (const [, w] of items) t += w;
  let x = r() * t;
  for (const [v, w] of items) { x -= w; if (x <= 0) return v; }
  return items[items.length - 1][0];
};

/** Detail level for a lot. */
export function lodFor(lot) {
  if (lot.simple) return 'simple';
  const cx = lot.x, cz = lot.z;
  // north-road houses near the station are seen from the platforms: keep them full
  if (lot.street === 'north') return Math.abs(cx) < 75 ? 'full' : 'reduced';
  if (Math.abs(cx) > 90 || cz > 140 || cz < -45) return 'reduced';
  return 'full';
}

export function makePlan(lot) {
  const r = makeRng(lot.seed ^ 0x5bd1e995);
  const lod = lodFor(lot);
  const W = lot.width, D = lot.depth;
  const floors = lot.floors;
  const c = Math.cos(lot.rotY), s = Math.sin(lot.rotY);
  const plan = {
    lot, lod, W, D, floors, r,
    seed: lot.seed,
    /** ground height (lot-local y) under lot-local (lx, lz) */
    gy: (lx, lz) => groundY(lot.x + lx * c + lz * s, lot.z - lx * s + lz * c) - lot.y,
  };

  // --- style ----------------------------------------------------------------
  const finish1 = pickW(r, [['plaster', 4], ['siding', 4], ['tile', 1.6], ['wood', 1.2]]);
  let finish2 = finish1;
  if (floors === 2 && r() < 0.28) finish2 = finish1 === 'tile' ? 'siding' : finish1 === 'wood' ? 'plaster' : r() < 0.5 ? 'plaster' : 'siding';
  if (finish1 === 'wood' && r() < 0.5) finish2 = 'plaster'; // classic dark boards below, plaster above
  plan.trad = finish1 === 'wood' || (finish1 === 'plaster' && r() < 0.35) || (floors === 1 && r() < 0.6);
  const col1 = r.pick(FINISHES[finish1]);
  const col2 = finish2 === finish1 ? col1 : r.pick(FINISHES[finish2]);
  plan.zones = [
    { band: finish1, color: col1 },
    { band: finish2, color: col2 },
  ];
  plan.beltCourse = finish1 !== finish2 || r() < 0.35;
  plan.frame = plan.trad ? r.pick(['#5d4636', '#6a4e3a', '#4a4d52']) : r.pick(FRAMES);
  plan.trim = plan.trad ? r.pick(['#5b4332', '#4d4843', '#f3f1ea']) : r.pick(TRIMS);
  plan.soffit = plan.trad ? '#b89a78' : r.pick(['#f1eee6', '#e8e4da', '#ded9ce']);
  plan.gutter = r.pick(['#ece8de', '#d9d4c7', '#6b5a4c', '#9aa1a8', '#4a4d52']);
  plan.found = r.pick(['#c9c6be', '#bdbab3', '#d2cfc7']);
  plan.curtain = r.pick(CURTAINS);
  plan.curtain2 = r.pick(CURTAINS);
  plan.interior = r.pick(['#a39a8f', '#9d9690', '#a89d90', '#978f8a']);
  plan.nameIdx = Math.floor(r() * 20);
  plan.addrIdx = Math.floor(r() * 6);

  // --- massing ----------------------------------------------------------------
  const sideL = r.range(0.35, 0.6), sideR = r.range(0.35, 0.6);
  const backM = r.range(0.45, 0.9);
  const bx0 = -W / 2 + sideL, bx1 = W / 2 - sideR;
  const bz0 = -D / 2 + backM;
  let bz1 = D / 2 - 0.12;
  let massing = 'box';
  if (lod !== 'simple') {
    if (floors === 2 && W >= 8.4 && r() < 0.38) massing = 'wing';
    else if (D >= 10 && r() < (floors === 1 ? 0.6 : 0.22)) massing = 'yard';
  }
  plan.massing = massing;
  const wallTop = (fl) => FOUND + fl * STOREY + 0.08;
  const blocks = [];
  let roofType;
  const kawaraP = plan.trad ? 0.92 : 0.55;
  if (floors === 1) roofType = pickW(r, [['hip', 5], ['gableX', 4], ['gableZ', 1]]);
  else roofType = pickW(r, [['gableX', 3.4], ['gableZ', 2.0], ['hip', 3.2], ['shed', lod === 'simple' ? 0.6 : 1.4]]);
  const mat = roofType === 'shed' ? 'metal' : r() < kawaraP ? 'kawara' : 'metal';
  const roof = {
    type: roofType,
    mat,
    color: mat === 'kawara' ? r.pick(KAWARA) : r.pick(METAL),
    pitch: roofType === 'shed' ? r.range(0.2, 0.3) : mat === 'kawara' ? r.range(0.45, 0.56) : r.range(0.34, 0.46),
    eave: roofType === 'shed' ? r.range(0.35, 0.5) : r.range(0.48, 0.66),
    verge: r.range(0.32, 0.45),
    shedDir: r() < 0.5 ? 1 : -1, // +1: high side at the back (slopes down to the street)
  };
  if (massing === 'yard') bz1 = D / 2 - r.range(1.9, 2.7);
  if (massing === 'wing') {
    const wingW = Math.min(3.0, Math.max(2.2, (bx1 - bx0) * r.range(0.26, 0.34)));
    const mainX1 = bx1 - wingW;
    blocks.push({ id: 'main', x0: bx0, x1: mainX1, z0: bz0, z1: bz1, floors: 2, top: wallTop(2), roof });
    const setBack = r() < 0.5 ? r.range(0.6, 1.4) : 0;
    const wingRoof = r() < 0.4
      ? { type: 'flat', mat: 'metal', color: '#9aa1a8' }
      : { type: 'lean', mat: roof.mat, color: roof.color, pitch: roof.mat === 'kawara' ? 0.42 : 0.3, eave: 0.45, verge: 0.3 };
    blocks.push({ id: 'wing', x0: mainX1, x1: bx1, z0: bz0 + r.range(0.8, 2.2), z1: bz1 - setBack, floors: 1, top: wallTop(1) - 0.1, roof: wingRoof, wing: true });
  } else {
    blocks.push({ id: 'main', x0: bx0, x1: bx1, z0: bz0, z1: bz1, floors, top: wallTop(floors), roof });
  }
  plan.blocks = blocks;
  plan.main = blocks[0];
  plan.wing = blocks[1] || null;

  // --- facades ------------------------------------------------------------------
  plan.facades = [];
  for (const b of blocks) {
    for (const side of ['front', 'right', 'back', 'left']) {
      if (b.wing && side === 'left') continue; // hidden against the main block
      const f = makeFacade(b, side);
      f.block = b;
      f.openings = [];
      f.occ = []; // occupied rects for props: {u0,u1,y0,y1}
      f.items = [];
      plan.facades.push(f);
    }
  }
  plan.facade = (blockId, side) => plan.facades.find((f) => f.block.id === blockId && f.side === side);

  // Side facing the garden tree / neighbour gap: which local x side has more room?
  plan.gardenSide = lot.gardenTree ? (localOf(lot, lot.gardenTree.x, lot.gardenTree.z).x > 0 ? 1 : -1) : 0;
  if (lot.gardenTree) plan.treeLocal = localOf(lot, lot.gardenTree.x, lot.gardenTree.z);

  // --- entrance -------------------------------------------------------------------
  const main = plan.main;
  const frontF = plan.facade('main', 'front');
  let entryF = frontF;
  if (plan.wing && plan.wing.z1 > plan.main.z1 - 1.5 && r() < 0.55) entryF = plan.facade('wing', 'front');
  const doorW = plan.trad ? r.range(1.5, 1.75) : r.pick([0.95, 1.0, 1.2]);
  const entryL = entryF.L;
  let du;
  if (entryF === frontF) du = r() < 0.6 ? entryL - 0.55 - doorW - r.range(0, 0.4) : 0.55 + r.range(0, 0.4);
  else du = (entryL - doorW) / 2;
  du = Math.max(0.45, Math.min(entryL - 0.45 - doorW, du));
  plan.entry = { facade: entryF, u0: du, u1: du + doorW, y0: FOUND, y1: FOUND + 2.1, type: plan.trad && doorW > 1.3 ? 'lattice' : 'panel', canopy: pickW(r, [['slab', 3], ['hood', 2], ['kawara', plan.trad ? 3 : 0.3], ['none', entryF.block.floors === 2 ? 0.6 : 0]]) };
  entryF.openings.push({ kind: 'door', u0: du, u1: du + doorW, y0: FOUND, y1: FOUND + 2.1 });
  plan.lampStyle = r.pick(['box', 'globe', 'lantern']);

  // --- balcony (2F) ------------------------------------------------------------------
  plan.balcony = null;
  if (main.floors === 2 && lod !== 'simple') {
    const faceFront = !(lot.front.dirZ < -0.7 && lot.street === 'stationFront' && r() < 0.6); // north-facing fronts: many at the back
    const bf = plan.facade('main', faceFront ? 'front' : 'back');
    if (r() < 0.72 && bf.L > 4.4) {
      const bw = Math.min(bf.L - 1.0, r.range(2.6, Math.max(2.7, bf.L * 0.75)));
      const bu0 = r() < 0.5 ? r.range(0.3, Math.max(0.35, bf.L - bw - 0.3)) : (bf.L - bw) / 2;
      plan.balcony = {
        facade: bf, u0: bu0, u1: bu0 + bw, depth: r.range(0.8, 1.0),
        rail: pickW(r, [['solid', 4], ['bars', 3], ['panel', 2]]),
        laundry: r() < 0.82,
        futon: r() < 0.35,
        dish: r() < 0.3,
        ac: r() < 0.55,
      };
    }
  }

  // --- small flags ----------------------------------------------------------------------
  plan.frontEave = plan.trad && main.floors === 2 && !plan.balcony && r() < 0.6;
  plan.antenna = lod === 'simple' ? r() < 0.4 : r() < 0.72;
  plan.dishRoof = !plan.antenna && r() < 0.3;
  plan.fence = pickW(r, [['block', 4], ['lattice', 2], ['mesh', 1.5], ['hedge', 2.2], ['none', 1.2]]);
  plan.fenceH = plan.fence === 'block' ? r.pick([0.8, 1.0, 1.2]) : plan.fence === 'hedge' ? r.range(0.8, 1.1) : r.range(0.9, 1.2);
  plan.windChime = r() < 0.18;
  plan.blockColor = r.pick(['#d6d3cc', '#cfcbc3', '#dcd6ca', '#c9c6be']);
  plan.latticeColor = r.pick(['#8a6446', '#6d5040', '#a07a55', '#5b4332']);
  plan.meshColor = r.pick(['#4d6b55', '#6b7075', '#5a4f48']);
  plan.hedgeColor = r.pick(['#5f8a4f', '#4f7a48', '#6b9454']);
  plan.postColor = r() < 0.5 ? plan.zones[0].color : r.pick(['#e9e4d8', '#d9d3c6', '#c9b9a3']);
  plan.openwork = r() < 0.3;
  if (plan.frontEave) plan.entry.canopy = 'eave';
  // front strip between the house and the road edge (fence / gate decisions are made here
  // because the porch needs to know whether a gate post carries the name plate)
  const apron = (lot.setback ?? 0) + 0.15;
  const edgeZ = D / 2 + apron - 0.14;
  const strip = edgeZ - plan.main.z1;
  plan.gatePost = lod !== 'simple' && strip > 0.85 && plan.fence !== 'none' && plan.fence !== 'hedge';
  return plan;
}

/** world (x,z) -> lot-local {x, z} */
export function localOf(lot, wx, wz) {
  const c = Math.cos(lot.rotY), s = Math.sin(lot.rotY);
  const dx = wx - lot.x, dz = wz - lot.z;
  // inverse of wx = x + lx*c + lz*s ; wz = z - lx*s + lz*c
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/**
 * Facade frame: origin at the wall's bottom-left corner seen from outside,
 * u runs left -> right, n (local +z of the frame) points outwards.
 */
function makeFacade(b, side) {
  const L = side === 'front' || side === 'back' ? b.x1 - b.x0 : b.z1 - b.z0;
  const o = {
    front: { ox: b.x0, oz: b.z1, ry: 0 },
    right: { ox: b.x1, oz: b.z1, ry: Math.PI / 2 },
    back: { ox: b.x1, oz: b.z0, ry: Math.PI },
    left: { ox: b.x0, oz: b.z0, ry: -Math.PI / 2 },
  }[side];
  const c = Math.cos(o.ry), s = Math.sin(o.ry);
  return {
    side, L, ...o,
    /** facade (u, n) -> lot-local [x, z] */
    toLocal: (u, n = 0) => [o.ox + u * c + n * s, o.oz - u * s + n * c],
  };
}

export { pickW };
