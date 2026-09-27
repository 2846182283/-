/**
 * Sakura level of detail + culling.
 *
 * Trees are bucketed into LOD cells (trees.js: 90 m town runs, 70 m levee runs,
 * 140 / 300 m far-bank and hillside runs).  Each cell owns a few static meshes that
 * frustum-cull on their own bounds:
 *   bark        full tubes near (< D_BARK), coarse tubes (fewer sides, no twigs) beyond
 *   clumps      every blossom mass as the cheap 'far' mound (40 tris); these are also
 *               the canopy's shadow casters everywhere (dappled shadows at 40 % of the
 *               cost, and a caster that sits inside every finer mound, so self-shadowing
 *               stays consistent)
 *   cards       alpha-cut sprigs in shuffled order, so drawing fewer of them
 *               (distance fade D_CARDS) thins them evenly; never cast shadows
 * Two dynamic layers draw the trees near the camera at higher detail; they are
 * refilled (plain typed-array copies) only when a tree changes level:
 *   mid         'lo' mounds (100 tris) for trees within LO_IN m
 *   near        'hi' mounds (three scalloped cushions, 240 tris) + fringe sprigs on
 *               every rim / underside for the HI_MAX trees within HI_IN m
 * The cell clumps of trees drawn by a dynamic layer are collapsed in the vertex shader
 * through a per-tree mask uniform (canopy.js MASK_MAIN), in the main and outline passes
 * alike (the shadow pass keeps them).  Per frame this is O(trees + cells), no allocations.
 */
import * as THREE from 'three';
import { OUTLINE_LAYER } from '../../core/postfx.js';
import { barkGeometry } from './treeGen.js';
import { clumpGeometry, cardGeometry, joinPacks, packItems, packAttributes, instGeometry, meshFromAttributes, mulberry, MASK_TREES } from './canopy.js';

const D_BARK = 55; // full bark within this distance of a cell (m from its bounding sphere)
const D_CARDS = [25, 150]; // card density fades out between
const D_OUTLINE = 160; // no outline pre-pass for cells beyond
const HI_IN = 13, HI_OUT = 18; // near layer: enter / leave (m from the crown's bounding sphere)
const LO_IN = 42, LO_OUT = 50; // mid layer
const HI_MAX = 6;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Deterministic in-place shuffle. */
function shuffle(list, rnd) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

function setOutline(obj, on) {
  if (!obj || obj.userData.noOutline) return;
  if (on) obj.layers.enable(OUTLINE_LAYER); else obj.layers.disable(OUTLINE_LAYER);
}

export function buildCanopyLod(ctx, trees, mats, dbg = []) {
  const group = new THREE.Group();
  group.name = 'sakura_trees';
  // low quality: fewer near-LOD trees and thinner sprig cards
  const low = ctx.quality === 'low';
  const hiMax = low ? 3 : HI_MAX;
  const cardMul = low ? 0.6 : 1;
  const geos = { hi: clumpGeometry(0, 'hi'), lo: clumpGeometry(0, 'lo'), far: clumpGeometry(0, 'far') };
  const cardGeo = cardGeometry();
  cardGeo.computeBoundingSphere();
  const rnd = mulberry(4321);
  const stats = { cells: 0, clumps: 0, cards: 0, fringe: 0 };
  if (trees.records.length > MASK_TREES) console.warn(`[sakura] ${trees.records.length} trees > mask size ${MASK_TREES}`);

  // ---------------------------------------------------------------- cells
  const cells = [];
  for (const cell of trees.cells) {
    const recs = cell.trees;
    const sphere = new THREE.Sphere();
    sphere.makeEmpty();
    const s = new THREE.Sphere();
    for (const r of recs) sphere.union(s.set(r.centre, r.radius));
    const st = { region: cell.region, sphere, barkFull: null, barkCoarse: null, clumps: null, cards: null, cardTotal: 0, outline: true };

    // bark
    const bark = (arrs, name, cast) => {
      if (!arrs.pos.length) return null;
      const m = new THREE.Mesh(barkGeometry(arrs), mats.bark);
      m.name = name;
      m.castShadow = cast;
      m.receiveShadow = true;
      group.add(m);
      return m;
    };
    st.barkFull = bark(cell.full, `sakura_bark_${cell.key}`, true);
    st.barkCoarse = bark(cell.coarse, `sakura_bark_lo_${cell.key}`, cell.region !== 'far');

    // clumps: the cheap mound for every mass (hidden per tree while a dynamic layer draws it)
    const pk = joinPacks(recs.map((r) => r.clumps));
    if (pk.n) {
      const attrs = packAttributes(pk, pk.n, { tree: true });
      const im = meshFromAttributes(instGeometry(geos.far, attrs), mats.clump, attrs, pk.n, { castShadow: cell.region !== 'far', depthMaterial: mats.clumpDepth, name: `sakura_clumps_${cell.key}` });
      im.computeBoundingSphere();
      st.clumps = im;
      group.add(im);
      stats.clumps += pk.n;
    }

    // cards
    const cards = shuffle(recs.flatMap((r) => r.cards), rnd);
    if (cards.length) {
      const cpk = packItems(cards);
      const attrs = packAttributes(cpk, cpk.n, { cells: true });
      const im = meshFromAttributes(instGeometry(cardGeo, attrs), mats.card, attrs, cpk.n, { noOutline: true, name: `sakura_cards_${cell.key}` });
      im.computeBoundingSphere();
      st.cards = im;
      st.cardTotal = cpk.n;
      group.add(im);
      stats.cards += cpk.n;
    }
    cells.push(st);
  }
  stats.cells = cells.length;

  // ---------------------------------------------------------------- dynamic layers
  const recs = trees.records;
  const eligible = recs.filter((r) => r.region !== 'far');
  const topN = (key, n) => eligible.map((r) => r[key].n).sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0);
  stats.fringe = eligible.reduce((a, r) => a + r.fringe.n, 0);
  const tmpS = new THREE.Sphere();

  /** A refillable instanced layer (clumps with `geo`, optionally + fringe cards). */
  function makeLayer(name, geo, capTrees, fringe) {
    const attrs = packAttributes(packItems([]), topN('clumps', capTrees));
    const L = {
      attrs, sphere: new THREE.Sphere(),
      clumps: meshFromAttributes(instGeometry(geo, attrs), mats.clumpHi, attrs, 0, { name: `sakura_clumps_${name}` }),
      fAttrs: null, fringe: null,
    };
    const dyn = [attrs.matrix, attrs.color, attrs.canopy];
    L.clumps.boundingSphere = L.sphere;
    L.clumps.visible = false;
    group.add(L.clumps);
    if (fringe) {
      L.fAttrs = packAttributes(packItems([]), topN('fringe', capTrees), { cells: true });
      L.fringe = meshFromAttributes(instGeometry(cardGeo, L.fAttrs), mats.card, L.fAttrs, 0, { noOutline: true, name: `sakura_cards_${name}` });
      L.fringe.boundingSphere = L.sphere;
      L.fringe.visible = false;
      group.add(L.fringe);
      dyn.push(L.fAttrs.matrix, L.fAttrs.color, L.fAttrs.canopy, L.fAttrs.cell);
    }
    for (const a of dyn) a.setUsage(THREE.DynamicDrawUsage);
    return L;
  }
  const flush = (attrs, n, keys) => {
    for (const k of keys) {
      const a = attrs[k];
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(1, n) * a.itemSize);
      a.needsUpdate = true;
    }
  };
  const near = makeLayer('near', geos.hi, hiMax, true);
  const mid = makeLayer('mid', geos.lo, eligible.length, false);
  near.hidden = dbg.includes('noNear'); // dev: ?sakura=noNear / noMid / noCells
  mid.hidden = dbg.includes('noMid');
  if (dbg.includes('noCells')) for (const c of cells) if (c.clumps) c.clumps.visible = false;

  const mask = mats.clump.userData.vertexPatch.uniforms.sakHiMask.value;
  const level = new Uint8Array(recs.length); // 0 cell mesh only, 1 mid layer, 2 near layer
  const want = new Uint8Array(recs.length);
  const candIdx = new Int32Array(HI_MAX);
  const candD = new Float32Array(HI_MAX);

  /** Copy the instances of every tree at `lv` into layer L. */
  function refill(L, lv) {
    let o = 0, of = 0;
    L.sphere.makeEmpty();
    for (let i = 0; i < recs.length; i++) {
      if (want[i] !== lv) continue;
      const r = recs[i];
      const c = r.clumps;
      L.attrs.matrix.array.set(c.mat, o * 16); L.attrs.color.array.set(c.col, o * 3); L.attrs.canopy.array.set(c.can, o * 4);
      o += c.n;
      if (L.fAttrs) {
        const f = r.fringe;
        L.fAttrs.matrix.array.set(f.mat, of * 16); L.fAttrs.color.array.set(f.col, of * 3); L.fAttrs.canopy.array.set(f.can, of * 4); L.fAttrs.cell.array.set(f.cell, of);
        of += f.n;
      }
      L.sphere.union(tmpS.set(r.centre, r.radius));
    }
    L.clumps.count = o;
    L.clumps.visible = o > 0 && !L.hidden;
    flush(L.attrs, o, ['matrix', 'color', 'canopy']);
    if (L.fringe) {
      L.fringe.count = of;
      L.fringe.visible = of > 0 && !L.hidden;
      flush(L.fAttrs, of, ['matrix', 'color', 'canopy', 'cell']);
    }
  }

  /** Per frame: assign tree levels (with hysteresis), refill changed layers, then per-cell detail. */
  function update(cam) {
    // near: the hiMax closest eligible trees inside HI_IN (they stay until HI_OUT)
    let nC = 0;
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      want[i] = 0;
      if (r.region === 'far') continue;
      const d = cam.distanceTo(r.centre) - r.radius;
      if (d < (level[i] >= 1 ? LO_OUT : LO_IN)) want[i] = 1;
      if (d > (level[i] === 2 ? HI_OUT : HI_IN)) continue;
      // insertion into the sorted top-hiMax list
      let k = nC < hiMax ? nC++ : hiMax;
      if (k === hiMax) { if (d >= candD[hiMax - 1]) continue; k = hiMax - 1; }
      while (k > 0 && candD[k - 1] > d) { candD[k] = candD[k - 1]; candIdx[k] = candIdx[k - 1]; k--; }
      candD[k] = d; candIdx[k] = i;
    }
    for (let k = 0; k < nC; k++) want[candIdx[k]] = 2;
    let chNear = false, chMid = false;
    for (let i = 0; i < recs.length; i++) {
      if (want[i] === level[i]) continue;
      if (want[i] === 2 || level[i] === 2) chNear = true;
      if (want[i] === 1 || level[i] === 1) chMid = true;
    }
    if (chNear || chMid) {
      if (chNear) refill(near, 2);
      if (chMid) refill(mid, 1);
      for (let i = 0; i < recs.length; i++) {
        level[i] = want[i];
        mask[i >> 2].setComponent(i & 3, want[i] ? 1 : 0);
      }
    }

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const d = Math.max(0, cam.distanceTo(c.sphere.center) - c.sphere.radius);
      if (c.cards) {
        const n = Math.round(c.cardTotal * cardMul * (1 - smooth(D_CARDS[0], D_CARDS[1], d)));
        c.cards.count = n;
        c.cards.visible = n > 0;
      }
      if (c.barkFull) {
        c.barkFull.visible = d < D_BARK;
        if (c.barkCoarse) c.barkCoarse.visible = !c.barkFull.visible;
      }
      const outline = d < D_OUTLINE;
      if (outline !== c.outline) {
        c.outline = outline;
        setOutline(c.clumps, outline);
        setOutline(c.barkFull, outline);
        setOutline(c.barkCoarse, outline);
      }
    }
  }

  return { group, update, stats };
}
