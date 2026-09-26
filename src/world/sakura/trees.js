/**
 * Builds every sakura in layout.TREES:
 *   - bark: one merged tube mesh per region (town / levee / far) -> 3 draw calls
 *   - blossom clumps: shared clump variants, InstancedMesh per (region, variant)
 *   - blossom cards: alpha-tested sprigs covering the crown surface (+ a few 胴吹き
 *     tufts sprouting straight from old trunks on near trees)
 * Returns the meshes plus per-tree info (crown centre / radius / top) that the
 * pits, ground petals and falling-petal density map use.
 */
import * as THREE from 'three';
import { KINDS, growTree, addTwigs, appendBark, barkGeometry, newBarkArrays } from './treeGen.js';
import { clumpGeometry, cardGeometry, buildInstances, mulberry } from './canopy.js';

const HI_VARIANTS = 3;
const LO_VARIANTS = 2;

/** Which setting a tree stands in (drives its pit and a few style choices). */
export function treeContext(t) {
  if (t.kind === 'grand') return 'plaza';
  if (t.kind === 'small') return 'far';
  if (t.kind === 'row') return 'levee';
  if (t.lotId) return 'garden';
  if (t.z > -25 && t.z < -10 && Math.abs(t.x) < 25) return 'street';
  return 'rail';
}

function regionOf(t) {
  if (t.kind === 'small') return 'far';
  if (t.kind === 'row') return t.z < -90 ? 'far' : 'levee'; // far-bank row: seen across the river only
  return 'town';
}

// instance tints (multiply the painted value bands)
const TINTS = [
  [0.46, [1, 1, 1]],
  [0.24, [1.0, 0.93, 0.96]], // pinker
  [0.16, [1.0, 0.95, 0.9]], // warm peach
  [0.14, [0.98, 0.98, 1.0]], // cool white
];
function pickTint(r) {
  let acc = 0;
  for (const [w, c] of TINTS) { acc += w; if (r < acc) return c; }
  return TINTS[0][1];
}

export function buildTrees(ctx, mats, opts = {}) {
  const { layout } = ctx;
  const infos = [];
  const bark = { town: newBarkArrays(), levee: newBarkArrays(), far: newBarkArrays() };
  const clumps = {
    town: Array.from({ length: HI_VARIANTS }, () => []),
    levee: Array.from({ length: LO_VARIANTS }, () => []),
    far: [[]],
  };
  const cards = { town: [], levee: [] };
  const heroCam = layout.CAMERAS.hero.pos;
  const tmp = new THREE.Vector3();

  for (const t of layout.TREES) {
    const K = KINDS[t.kind];
    const region = regionOf(t);
    if (opts.onlyNear && region !== 'town') continue;
    const rng = mulberry(t.seed);
    const context = treeContext(t);
    // hero: the extra limb reaches out over the road, slightly toward the hero camera
    let heroDir = null;
    if (t.hero) {
      const toCam = new THREE.Vector2(heroCam[0] - t.x, heroCam[2] - t.z).normalize();
      heroDir = { x: t.lean.x * 0.75 + toCam.x * 0.45, z: t.lean.z * 0.75 + toCam.y * 0.45 };
    }
    const lean = t.lean ? { x: t.lean.x, z: t.lean.z } : { x: rng() - 0.5, z: rng() - 0.5 };
    const leanAmt = t.hero ? 0.22 : t.lean ? (t.kind === 'row' ? 0.14 : 0.22) : 0.05;
    const tree = growTree(t.kind, rng, { scale: t.scale, lean, leanAmt, heroDir, cheap: region === 'far' });
    if (K.lod === 'hi') addTwigs(tree, rng, Math.round(tree.anchors.length * 0.25), t.scale);

    // grown in world orientation (lean is a world direction), so no extra yaw
    const world = { x: t.x, y: t.y, z: t.z, ry: 0 };
    appendBark(bark[region], tree, t.kind, world, rng, { maxLevel: region === 'town' ? 99 : region === 'levee' ? 2 : 1 });
    const toW = (v, o) => o.set(t.x + v.x, t.y + v.y, t.z + v.z);
    const crownC = toW(tree.crownCentre, new THREE.Vector3());
    crownC.y -= tree.height * 0.12;
    const height = tree.height, radius = tree.radius;

    // ---- clumps ----
    const variants = region === 'town' ? HI_VARIANTS : region === 'levee' ? LO_VARIANTS : 1;
    const list = clumps[region];
    const swayMul = region === 'far' ? 0 : t.hero ? 1.25 : region === 'levee' ? 0.8 : 1;
    const clumpItems = [];
    let top = 0;
    for (const a of tree.anchors) {
      const p = toW(a.p, new THREE.Vector3());
      const s = a.size;
      top = Math.max(top, p.y + s * 0.4);
      const out = p.clone().sub(crownC);
      out.y *= 1.3;
      out.normalize();
      const hN = THREE.MathUtils.clamp((p.y - t.y) / Math.max(height, 1), 0, 1);
      // blossom masses tilt outward like shingles
      const up = new THREE.Vector3(out.x * 0.4 + (rng() - 0.5) * 0.3, 1, out.z * 0.4 + (rng() - 0.5) * 0.3).normalize();
      // ambient occlusion: lower / inner masses a touch lilac
      const inner = 1 - THREE.MathUtils.clamp(p.clone().sub(crownC).setY(0).length() / Math.max(radius, 1), 0, 1);
      const ao = 1 - 0.1 * inner - 0.08 * (1 - hN);
      const tint = pickTint(rng());
      const item = {
        p, up, yaw: rng() * Math.PI * 2,
        s: new THREE.Vector3(s, s * (0.6 + rng() * 0.2), s),
        color: new THREE.Color().setRGB(tint[0] * ao, tint[1] * ao * 0.98, tint[2] * Math.min(1, ao * 1.03)),
        out, sway: (0.3 + 0.7 * hN) * swayMul * (a.lobe ? 1.3 : 1),
      };
      list[Math.floor(rng() * variants)].push(item);
      clumpItems.push(item);
    }

    // ---- cards (flower sprigs covering the masses: fluffy silhouette + visible blossoms) ----
    if (K.cards > 0 && region !== 'far') {
      const clist = cards[region];
      for (const c of clumpItems) {
        const nc = K.cards * (t.hero ? 1.5 : 1);
        const n = Math.floor(nc) + (rng() < nc % 1 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          // a point on the upper / outer surface of the mass; cards straddle the surface
          // (half inside, half out) at random tilts so both the face and the silhouette get flowers
          // half of the sprigs ring the rim (breaks the faceted silhouette), the rest cover the faces
          const d = k % 2 === 0
            ? new THREE.Vector3(rng() - 0.5, (rng() - 0.5) * 0.35, rng() - 0.5).normalize()
            : new THREE.Vector3(rng() - 0.5, rng() * 1.5 - (region === 'levee' ? 0.85 : 0.6), rng() - 0.5).normalize();
          if (d.dot(c.out) < -0.25) { d.x = -d.x; d.z = -d.z; }
          const rim = k % 2 === 0 ? 0.95 : region === 'levee' ? 0.9 : 0.78;
          const p = c.p.clone().add(tmp.set(d.x * c.s.x * rim, d.y * c.s.y * 0.72 + c.s.y * 0.05, d.z * c.s.z * rim));
          const rnd3 = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5);
          const face = d.clone().multiplyScalar(0.6).addScaledVector(c.out, 0.5).add(rnd3).normalize();
          const cs = (0.5 + rng() * 0.35) * Math.min(1.2, t.scale) * (region === 'levee' ? 1.25 : 1);
          const r = rng();
          const cell = r < 0.3 ? 0 : r < 0.62 ? 1 : r < 0.8 ? 2 : 3;
          clist.push({
            p, face, roll: (rng() - 0.5) * 2.0, s: cs, cell,
            color: c.color.clone().lerp(new THREE.Color(1, 0.94, 0.96), 0.15),
            out: c.out, sway: c.sway * 1.15,
          });
        }
      }
      // 胴吹き: little flower tufts sprouting straight out of the old trunk
      if (region === 'town') {
        const trunk = tree.branches[0];
        const nT = t.kind === 'grand' ? 6 : 2 + Math.floor(rng() * 2);
        for (let k = 0; k < nT; k++) {
          const i = 2 + Math.floor(rng() * (trunk.pts.length - 3));
          const a = rng() * Math.PI * 2;
          const dir = new THREE.Vector3(Math.cos(a), 0.3, Math.sin(a)).normalize();
          const pp = toW(trunk.pts[i], new THREE.Vector3()).addScaledVector(dir, trunk.radii[i] * 0.85);
          if (pp.y - t.y < 0.9) continue;
          clist.push({ p: pp, face: dir, roll: (rng() - 0.5) * 0.8, s: 0.3 + rng() * 0.1, cell: rng() < 0.5 ? 3 : 0, color: new THREE.Color(1, 1, 1), out: dir, sway: 0.05 });
        }
      }
    }

    infos.push({
      tree: t, context, region, height, radius,
      crown: { x: crownC.x, z: crownC.z, y: crownC.y }, top,
      trunkR: tree.trunkR,
      base: { x: t.x, y: t.y, z: t.z },
    });
  }

  // ---- meshes ----
  const group = new THREE.Group();
  group.name = 'sakura_trees';
  for (const region of Object.keys(bark)) {
    if (!bark[region].pos.length) continue;
    const m = new THREE.Mesh(barkGeometry(bark[region]), mats.bark);
    m.name = `sakura_bark_${region}`;
    m.castShadow = region !== 'far';
    m.receiveShadow = true;
    group.add(m);
  }
  const geos = {
    town: Array.from({ length: HI_VARIANTS }, (_, i) => clumpGeometry(i, 'hi')),
    levee: Array.from({ length: LO_VARIANTS }, (_, i) => clumpGeometry(i + 10, 'lo')),
    far: [clumpGeometry(20, 'far')],
  };
  const stats = { clumps: 0, cards: 0 };
  for (const region of Object.keys(clumps)) {
    clumps[region].forEach((items, v) => {
      if (!items.length) return;
      const im = buildInstances(geos[region][v], mats.clump, items, { depthMaterial: mats.clumpDepth, castShadow: region !== 'far', name: `sakura_clumps_${region}_${v}` });
      group.add(im);
      stats.clumps += items.length;
    });
  }
  const cardGeo = cardGeometry();
  for (const region of Object.keys(cards)) {
    if (!cards[region].length) continue;
    const im = buildInstances(cardGeo, mats.card, cards[region], { cells: true, noOutline: true, castShadow: region === 'town', name: `sakura_cards_${region}` });
    group.add(im);
    stats.cards += cards[region].length;
  }
  return { group, infos, stats };
}
