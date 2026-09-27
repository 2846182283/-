/**
 * Sakura level of detail + culling.
 *
 * Trees are bucketed into LOD cells (trees.js: 60 m town grid, 70 m levee runs,
 * 200 m hillside runs).  Each cell owns a handful of meshes that frustum-cull on
 * their own bounds:
 *   bark        full tubes near (< D_BARK), coarse tubes (fewer sides, no twigs) beyond
 *   clumps      one InstancedMesh; its geometry is swapped between the 'lo' mound
 *               (100 tris) and the 'far' mound (40 tris) by distance (D_LO); the
 *               'lo' clumps are also the canopy's shadow casters everywhere
 *   cards       alpha-cut sprigs in shuffled order, so drawing fewer of them
 *               (distance fade D_CARDS) thins them evenly; never cast shadows
 * On top of that ONE dynamic near-LOD layer is refilled whenever the set of trees
 * within HI_IN m of the camera changes (at most HI_MAX trees):
 *   hi clumps   the same masses with the scalloped 'hi' mound (no shadow casting:
 *               the base 'lo' clumps of those trees still cast, see canopy.js)
 *   fringe      extra rim / underside sprigs
 * The base clumps of near trees are collapsed in the vertex shader through a per-tree
 * mask uniform (canopy.js MASK_MAIN), in the main and outline passes alike.
 * Everything here is O(trees + cells) per frame with no allocations.
 */
import * as THREE from 'three';
import { OUTLINE_LAYER } from '../../core/postfx.js';
import { barkGeometry } from './treeGen.js';
import { clumpGeometry, cardGeometry, joinPacks, packItems, packAttributes, instGeometry, meshFromAttributes, mulberry, MASK_TREES } from './canopy.js';

const D_BARK = 55; // full bark within this distance of a cell (m from its bounding sphere)
const D_LO = 95; // 'lo' clump mounds within, 'far' mounds beyond
const D_CARDS = [25, 150]; // card density fades out between
const D_OUTLINE = 160; // no outline pre-pass for cells beyond
const HI_IN = 13, HI_OUT = 18; // near LOD: enter / leave (m from the crown's bounding sphere)
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

export function buildCanopyLod(ctx, trees, mats) {
  const group = new THREE.Group();
  group.name = 'sakura_trees';
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
    const st = { region: cell.region, sphere, barkFull: null, barkCoarse: null, clumps: null, gLo: null, gFar: null, cards: null, cardTotal: 0, outline: true };

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

    // clumps (lo <-> far geometry swap)
    const pk = joinPacks(recs.map((r) => r.clumps));
    if (pk.n) {
      const attrs = packAttributes(pk, pk.n, { tree: true });
      st.gLo = instGeometry(geos.lo, attrs);
      st.gFar = instGeometry(geos.far, attrs);
      const im = meshFromAttributes(st.gLo, mats.clump, attrs, pk.n, { castShadow: cell.region !== 'far', depthMaterial: mats.clumpDepth, name: `sakura_clumps_${cell.key}` });
      im.computeBoundingSphere(); // with the larger 'lo' mound; kept when the geometry swaps
      if (cell.region === 'far') im.geometry = st.gFar;
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

  // ---------------------------------------------------------------- near LOD layer
  const recs = trees.records;
  const hiCandidates = recs.filter((r) => r.region !== 'far');
  const topN = (key) => hiCandidates.map((r) => r[key].n).sort((a, b) => b - a).slice(0, HI_MAX).reduce((a, b) => a + b, 0);
  const capClumps = topN('clumps'), capFringe = topN('fringe');
  const hiAttrs = packAttributes(packItems([]), capClumps);
  const frAttrs = packAttributes(packItems([]), capFringe, { cells: true });
  const hiClumps = meshFromAttributes(instGeometry(geos.hi, hiAttrs), mats.clumpHi, hiAttrs, 0, { name: 'sakura_clumps_near' });
  const hiFringe = meshFromAttributes(instGeometry(cardGeo, frAttrs), mats.card, frAttrs, 0, { noOutline: true, name: 'sakura_cards_near' });
  const hiSphere = new THREE.Sphere();
  hiClumps.boundingSphere = hiSphere;
  hiFringe.boundingSphere = hiSphere;
  hiClumps.visible = hiFringe.visible = false;
  group.add(hiClumps, hiFringe);
  for (const a of [hiAttrs.matrix, hiAttrs.color, hiAttrs.canopy, frAttrs.matrix, frAttrs.color, frAttrs.canopy, frAttrs.cell]) a.setUsage(THREE.DynamicDrawUsage);

  const mask = mats.clump.userData.vertexPatch.uniforms.sakHiMask.value;
  const isHi = new Uint8Array(recs.length);
  const want = new Uint8Array(recs.length);
  const candIdx = new Int32Array(HI_MAX);
  const candD = new Float32Array(HI_MAX);
  const tmpS = new THREE.Sphere();

  /** Copy the near trees' instances into the dynamic meshes and flag them in the mask. */
  function refill() {
    let o = 0, of = 0;
    hiSphere.makeEmpty();
    for (let i = 0; i < recs.length; i++) {
      const on = want[i] === 1;
      isHi[i] = want[i];
      mask[i >> 2].setComponent(i & 3, on ? 1 : 0);
      if (!on) continue;
      const r = recs[i];
      const c = r.clumps, f = r.fringe;
      hiAttrs.matrix.array.set(c.mat, o * 16); hiAttrs.color.array.set(c.col, o * 3); hiAttrs.canopy.array.set(c.can, o * 4);
      o += c.n;
      frAttrs.matrix.array.set(f.mat, of * 16); frAttrs.color.array.set(f.col, of * 3); frAttrs.canopy.array.set(f.can, of * 4); frAttrs.cell.array.set(f.cell, of);
      of += f.n;
      hiSphere.union(tmpS.set(r.centre, r.radius));
    }
    hiClumps.count = o;
    hiFringe.count = of;
    hiClumps.visible = o > 0;
    hiFringe.visible = of > 0;
    for (const a of [hiAttrs.matrix, hiAttrs.color, hiAttrs.canopy]) { a.clearUpdateRanges(); a.addUpdateRange(0, o * a.itemSize); a.needsUpdate = true; }
    for (const a of [frAttrs.matrix, frAttrs.color, frAttrs.canopy, frAttrs.cell]) { a.clearUpdateRanges(); a.addUpdateRange(0, of * a.itemSize); a.needsUpdate = true; }
  }

  /** Per frame: pick the near trees, then the per-cell detail levels. */
  function update(cam) {
    // near set: the HI_MAX closest eligible trees inside HI_IN (hysteresis: stay until HI_OUT)
    let nC = 0;
    for (let i = 0; i < recs.length; i++) {
      want[i] = 0;
      const r = recs[i];
      if (r.region === 'far') continue;
      const d = cam.distanceTo(r.centre) - r.radius;
      if (d > (isHi[i] ? HI_OUT : HI_IN)) continue;
      // insertion into the sorted top-HI_MAX list
      let k = nC < HI_MAX ? nC++ : HI_MAX;
      if (k === HI_MAX) { if (d >= candD[HI_MAX - 1]) continue; k = HI_MAX - 1; }
      while (k > 0 && candD[k - 1] > d) { candD[k] = candD[k - 1]; candIdx[k] = candIdx[k - 1]; k--; }
      candD[k] = d; candIdx[k] = i;
    }
    for (let k = 0; k < nC; k++) want[candIdx[k]] = 1;
    let changed = false;
    for (let i = 0; i < recs.length; i++) if (want[i] !== isHi[i]) { changed = true; break; }
    if (changed) refill();

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const d = Math.max(0, cam.distanceTo(c.sphere.center) - c.sphere.radius);
      if (c.clumps && c.region !== 'far') {
        const g = d > D_LO ? c.gFar : c.gLo;
        if (c.clumps.geometry !== g) c.clumps.geometry = g;
      }
      if (c.cards) {
        const n = Math.round(c.cardTotal * (1 - smooth(D_CARDS[0], D_CARDS[1], d)));
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
