/**
 * Grows every sakura in layout.TREES and collects its render data:
 *   - bark: tapered tube arrays per LOD cell, at two detail levels (full / coarse)
 *   - blossom clumps: one item per blossom mass (drawn by lod.js at hi / lo / far detail)
 *   - blossom cards: alpha-tested sprigs covering the crown surface (+ a few 胴吹き
 *     tufts sprouting straight from old trunks on town trees)
 *   - fringe cards: extra sprigs ringing the rim and hanging under every mass,
 *     only drawn while the tree is close to the camera (near LOD)
 * Returns per-tree records + per-cell bark, and per-tree info (crown centre /
 * radius / top) that the pits, ground petals and falling-petal density map use.
 */
import * as THREE from 'three';
import { KINDS, growTree, addTwigs, appendBark, newBarkArrays } from './treeGen.js';
import { mulberry, packItems } from './canopy.js';

/** Which setting a tree stands in (drives its pit and a few style choices). */
export function treeContext(t) {
  if (t.kind === 'grand') return 'plaza';
  if (t.kind === 'small') return 'far';
  if (t.kind === 'row') return 'levee';
  if (t.lotId) return 'garden';
  if (t.z > -25 && t.z < -10 && Math.abs(t.x) < 25) return 'street';
  return 'rail';
}

/**
 * Render region: town trees get the finest bark, levee rows (incl. the far-bank row, which
 * walkers on the levee path see from ~30 m) are a little cheaper, hillside dots cheapest.
 */
function regionOf(t) {
  if (t.kind === 'small') return 'far';
  if (t.kind === 'row') return 'levee';
  return 'town';
}

/**
 * LOD cell of a tree: town in 90 m x-runs split into station / near street / far street
 * bands, levee rows in 70 m runs (the far bank, seen across the river, in 140 m runs),
 * hillside dots in 300 m runs.
 */
function cellOf(t, region) {
  if (region === 'town') return `town:${Math.floor(t.x / 90)},${t.z < 0 ? 0 : t.z < 60 ? 1 : 2}`;
  if (region === 'levee') return t.z < -90 ? `levee:n${Math.floor(t.x / 140)}` : `levee:s${Math.floor(t.x / 70)}`;
  return `far:${Math.floor(t.x / 300)}`;
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
const CARD_TINT = new THREE.Color(1, 0.94, 0.96);

/** Atlas cell for a sprig: 0 pale, 1 pink, 2 with young leaves, 3 dense cluster. */
function pickCell(r, leafy = 0.18) {
  return r < 0.3 ? 0 : r < 0.62 - leafy * 0.5 ? 1 : r < 0.62 + leafy * 0.5 ? 2 : 3;
}

/** Sprigs covering one blossom mass: half ring the rim, half cover the upper faces. */
function surfaceCards(c, n, rng, region, t, list) {
  const tmp = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const rimCard = k % 2 === 0;
    const d = rimCard
      ? new THREE.Vector3(rng() - 0.5, (rng() - 0.5) * 0.35, rng() - 0.5).normalize()
      : new THREE.Vector3(rng() - 0.5, rng() * 1.5 - (region === 'levee' ? 0.85 : 0.6), rng() - 0.5).normalize();
    if (d.dot(c.out) < -0.25) { d.x = -d.x; d.z = -d.z; }
    const rim = rimCard ? 0.95 : region === 'levee' ? 0.9 : 0.78;
    const p = c.p.clone().add(tmp.set(d.x * c.s.x * rim, d.y * c.s.y * 0.72 + c.s.y * 0.05, d.z * c.s.z * rim));
    const face = d.clone().multiplyScalar(0.6).addScaledVector(c.out, 0.5).add(tmp.set(rng() - 0.5, rng() - 0.5, rng() - 0.5)).normalize();
    const cs = (0.5 + rng() * 0.35) * Math.min(1.2, t.scale) * (region === 'levee' ? 1.25 : 1);
    list.push({ p, face, roll: (rng() - 0.5) * 2.0, s: cs, cell: pickCell(rng()), color: c.color.clone().lerp(CARD_TINT, 0.15), out: c.out, sway: c.sway * 1.15 });
  }
}

/**
 * Near-LOD fringe for one mass: a scalloped ring of sprigs straddling the rim (breaks the
 * mound's silhouette) and a few hanging under it (so undersides read as blossoms, not a
 * flat lilac plate), with more young-leaf sprigs mixed in.
 */
function fringeCards(c, rng, t, list) {
  const tmp = new THREE.Vector3();
  const nRim = 9, nUnder = 8;
  const a0 = rng() * Math.PI * 2;
  for (let k = 0; k < nRim + nUnder; k++) {
    const under = k >= nRim;
    const a = under ? rng() * Math.PI * 2 : a0 + (k / nRim) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const rr = under ? 0.15 + Math.sqrt(rng()) * 0.75 : 1.02 + rng() * 0.15;
    // (underside sprigs hang just below the mass: a ragged blossom fringe, not a flat plate)
    const dy = under ? -0.48 - rng() * 0.22 : (rng() - 0.3) * 0.45;
    const p = c.p.clone().add(tmp.set(Math.cos(a) * rr * c.s.x * 0.8, dy * c.s.y + c.s.y * 0.05, Math.sin(a) * rr * c.s.z * 0.8));
    const d = tmp.set(Math.cos(a), under ? -1.2 : 0.15, Math.sin(a)).normalize();
    const face = d.clone().addScaledVector(c.out, 0.4).normalize();
    const cs = (under ? 0.52 : 0.58) + rng() * 0.3;
    const col = c.color.clone().lerp(CARD_TINT, 0.15);
    if (under) col.multiplyScalar(0.94);
    list.push({ p, face, roll: (rng() - 0.5) * 2.4, s: cs * Math.min(1.2, t.scale), cell: pickCell(rng(), 0.3), color: col, out: c.out, sway: c.sway * 1.2 });
  }
}

export function buildTrees(ctx, opts = {}) {
  const { layout } = ctx;
  const infos = [];
  const records = [];
  const cells = new Map();
  const heroCam = layout.CAMERAS.hero.pos;

  for (const t of layout.TREES) {
    const K = KINDS[t.kind];
    const region = regionOf(t);
    if (opts.onlyNear && region !== 'town') continue;
    const rng = mulberry(t.seed);
    const context = treeContext(t);
    const farBank = t.kind === 'row' && t.z < -90;
    // hero: the extra limb reaches out over the road, slightly toward the hero camera
    let heroDir = null;
    if (t.hero) {
      const toCam = new THREE.Vector2(heroCam[0] - t.x, heroCam[2] - t.z).normalize();
      heroDir = { x: t.lean.x * 0.75 + toCam.x * 0.45, z: t.lean.z * 0.75 + toCam.y * 0.45 };
    }
    const lean = t.lean ? { x: t.lean.x, z: t.lean.z } : { x: rng() - 0.5, z: rng() - 0.5 };
    const leanAmt = t.hero ? 0.22 : t.lean ? (t.kind === 'row' ? 0.14 : 0.22) : 0.05;
    const tree = growTree(t.kind, rng, { scale: t.scale, lean, leanAmt, heroDir, cheap: region === 'far' });
    // thin twigs poking out between / past the masses (dark strokes against the sky)
    if (K.lod === 'hi') addTwigs(tree, rng, Math.round(tree.anchors.length * 0.4), t.scale);

    // ---- bark, into the tree's LOD cell (full + coarse detail) ----
    const key = cellOf(t, region);
    let cell = cells.get(key);
    if (!cell) {
      cell = { key, region, trees: [], full: newBarkArrays(), coarse: newBarkArrays() };
      cells.set(key, cell);
    }
    // grown in world orientation (lean is a world direction), so no extra yaw
    const world = { x: t.x, y: t.y, z: t.z, ry: 0 };
    if (region !== 'far') appendBark(cell.full, tree, t.kind, world, mulberry(t.seed ^ 77), { maxLevel: region === 'town' ? 99 : 2 });
    appendBark(cell.coarse, tree, t.kind, world, mulberry(t.seed ^ 77), { maxLevel: region === 'town' ? 2 : 1, radialMul: region === 'far' ? 1 : 0.6 });

    const toW = (v, o) => o.set(t.x + v.x, t.y + v.y, t.z + v.z);
    const crownC = toW(tree.crownCentre, new THREE.Vector3());
    crownC.y -= tree.height * 0.12;
    const height = tree.height, radius = tree.radius;
    const idx = records.length;

    // ---- clumps ----
    const swayMul = region === 'far' ? 0 : t.hero ? 1.25 : region === 'levee' ? 0.8 : 1;
    const clumps = [];
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
      const stretch = 0.88 + rng() * 0.24; // one shared shape, so vary the proportions per mass
      clumps.push({
        p, up, yaw: rng() * Math.PI * 2,
        s: new THREE.Vector3(s * stretch, s * (0.6 + rng() * 0.2), s / stretch),
        color: new THREE.Color().setRGB(tint[0] * ao, tint[1] * ao * 0.98, tint[2] * Math.min(1, ao * 1.03)),
        out, sway: (0.3 + 0.7 * hN) * swayMul * (a.lobe ? 1.3 : 1), tree: idx,
      });
    }

    // ---- cards (flower sprigs covering the masses: fluffy silhouette + visible blossoms) ----
    const cards = [];
    const fringe = [];
    if (K.cards > 0 && region !== 'far') {
      for (const c of clumps) {
        const nc = K.cards * (t.hero ? 1.5 : 1) * (farBank ? 0.5 : 1);
        surfaceCards(c, Math.floor(nc) + (rng() < nc % 1 ? 1 : 0), rng, region, t, cards);
        fringeCards(c, rng, t, fringe);
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
          cards.push({ p: pp, face: dir, roll: (rng() - 0.5) * 0.8, s: 0.3 + rng() * 0.1, cell: rng() < 0.5 ? 3 : 0, color: new THREE.Color(1, 1, 1), out: dir, sway: 0.05 });
        }
      }
    }

    const info = {
      tree: t, context, region, height, radius,
      crown: { x: crownC.x, z: crownC.z, y: crownC.y }, top,
      trunkR: tree.trunkR,
      base: { x: t.x, y: t.y, z: t.z },
    };
    infos.push(info);
    const rec = {
      idx, info, cell: key, region,
      centre: crownC.clone(), radius: Math.max(radius, height * 0.5) + 1.0,
      clumps: packItems(clumps), cards, fringe: packItems(fringe),
    };
    records.push(rec);
    cell.trees.push(rec);
  }
  return { infos, records, cells: [...cells.values()] };
}
