/**
 * Ground treatment around each trunk:
 *   plaza           round pit of 18 chamfered granite blocks (inside the props
 *                   module's round bench), soil, moss, grass and spring flowers
 *   street          square pit with a low chamfered granite curb, same planting
 *   rail            ring of low rough stones (石積み) with grass and moss
 *   garden / levee  natural soil patch with a ragged grass fringe
 * Static parts are baked (curbs, stones, soil, moss); grass tufts and flowers
 * are two InstancedMeshes shared by every pit.  Pits record their soil level on
 * the tree info (inf.pit) so fallen petals settle on it.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry } from './canopy.js';

/** Grass tuft: 7 thin bent blades, vertex-coloured dark base -> light tip. */
function tuftGeometry() {
  const pos = [], col = [], idx = [];
  const rnd = mulberry(55);
  const base = new THREE.Color('#6f9a58'), tip = new THREE.Color('#c4dc92');
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2 + rnd() * 0.6;
    const h = 0.1 + rnd() * 0.14, w = 0.014 + rnd() * 0.01;
    const lean = 0.25 + rnd() * 0.5;
    const ox = Math.cos(a) * 0.025, oz = Math.sin(a) * 0.025;
    const dx = Math.cos(a) * lean * h, dz = Math.sin(a) * lean * h;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const i0 = pos.length / 3;
    pos.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, ox + dx * 0.45 - px * 0.6, h * 0.55, oz + dz * 0.45 - pz * 0.6, ox + dx * 0.45 + px * 0.6, h * 0.55, oz + dz * 0.45 + pz * 0.6, ox + dx, h, oz + dz);
    for (const c of [base, base, base.clone().lerp(tip, 0.5), base.clone().lerp(tip, 0.5), tip]) col.push(c.r, c.g, c.b);
    idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2, i0 + 2, i0 + 3, i0 + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // blades are lit like the ground they grow from
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

/** Tiny five-petal flower head on a short stem (colour via instanceColor on the head). */
function flowerGeometry() {
  const pos = [], col = [], idx = [];
  const H = 0.11;
  // stem
  pos.push(-0.003, 0, 0, 0.003, 0, 0, 0, H, 0);
  const stem = new THREE.Color('#7fa865');
  for (let i = 0; i < 3; i++) col.push(stem.r * 0.9, stem.g * 0.9, stem.b * 0.9);
  idx.push(0, 1, 2);
  // head: centre + 10 rim verts (petal tips / notches)
  const c0 = pos.length / 3;
  pos.push(0, H + 0.004, 0);
  col.push(1.0, 0.9, 0.55);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.03 : 0.016;
    pos.push(Math.cos(a) * r, H + (i % 2 ? 0.002 : 0), Math.sin(a) * r);
    col.push(1, 1, 1);
  }
  for (let i = 0; i < 10; i++) idx.push(c0, c0 + 1 + ((i + 1) % 10), c0 + 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const nrm = new Float32Array(pos.length).fill(0);
  for (let i = 0; i < nrm.length; i += 3) nrm[i + 1] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}

/** Irregular flat blob (moss / soil) following the terrain. */
function blobGeometry(cx, cz, r, rnd, groundY, dy, segs = 14) {
  const pos = [cx, groundY(cx, cz) + dy, cz];
  const idx = [];
  const ph = rnd() * 6.28;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const rr = r * (0.75 + 0.25 * Math.sin(a * 3 + ph) + 0.12 * (rnd() - 0.5));
    const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
    pos.push(x, groundY(x, z) + dy, z);
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Low-poly rough stone (squashed, jittered icosahedron) with smooth normals, so the
 *  outline pass draws its silhouette rather than every facet. */
function stoneGeometry(rnd, s) {
  let g = new THREE.IcosahedronGeometry(1, 0);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const j = 0.82 + rnd() * 0.3;
    p.setXYZ(i, p.getX(i) * j * s * 1.25, Math.max(p.getY(i) * j * s * 0.62, -0.04), p.getZ(i) * j * s);
  }
  g.computeVertexNormals();
  return g;
}

export function buildPits(ctx, infos, texs) {
  const { toon, geom, layout } = ctx;
  const { groundY } = layout;
  const P = ctx.palette;
  const root = new THREE.Group();
  root.name = 'sakura_pits_static';
  const graniteMat = toon.mat('#ffffff', { map: texs.granite, name: 'sakura_granite' });
  const stoneMat = toon.mat('#ffffff', { vertexColors: true, map: texs.granite, name: 'sakura_stone' });
  const soilMat = toon.mat('#ffffff', { map: texs.soil, name: 'sakura_soil' });
  const mossMat = toon.mat(P.moss, { polygonOffset: 2, name: 'sakura_moss' });
  const tufts = [];
  const flowers = [];
  const FLOWER_COLS = ['#ffffff', '#ffffff', '#f6d24a', '#9a7ad0', '#8fb0ea', '#fbe0ea'];

  /** Tufts crowding the inside of a border (`ring`: {square: halfSize} | {r}) or scattered in a disc ({disc: R}). */
  const addTufts = (x, z, y, n, rnd, shape) => {
    for (let i = 0; i < n; i++) {
      let px, pz;
      if (shape.square) {
        const h = shape.square;
        const side = Math.floor(rnd() * 4), u = (rnd() - 0.5) * 2 * h, in_ = h - rnd() * 0.18;
        px = side === 0 ? u : side === 1 ? -u : side === 2 ? in_ : -in_;
        pz = side === 0 ? in_ : side === 1 ? -in_ : side === 2 ? u : -u;
      } else if (shape.r) {
        const a = rnd() * Math.PI * 2, r = shape.r * (0.75 + rnd() * 0.3);
        px = Math.cos(a) * r; pz = Math.sin(a) * r;
      } else {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * shape.disc;
        px = Math.cos(a) * r; pz = Math.sin(a) * r;
      }
      const wx = x + px, wz = z + pz;
      const s = 0.55 + rnd() * 0.5;
      const gc = new THREE.Color(P.grass).lerp(new THREE.Color(rnd() < 0.5 ? P.grassLight : P.grassDark), rnd() * 0.6);
      tufts.push({ x: wx, y: (y ?? groundY(wx, wz)) - 0.005, z: wz, ry: rnd() * 6.28, s, color: gc });
    }
  };
  const addFlowers = (x, z, y, n, rnd, R) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = R * (0.35 + rnd() * 0.6);
      const wx = x + Math.cos(a) * r, wz = z + Math.sin(a) * r;
      flowers.push({ x: wx, y: (y ?? groundY(wx, wz)) - 0.01, z: wz, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.5, color: FLOWER_COLS[Math.floor(rnd() * FLOWER_COLS.length)] });
    }
  };

  for (const inf of infos) {
    const t = inf.tree;
    const rnd = mulberry(t.seed ^ 0x5a5a);
    const { x, z } = t;
    const y = t.y;
    if (inf.context === 'far') continue;
    if (inf.context === 'plaza') {
      // ---- round pit of segmented granite blocks (matches terrain's soil disc; leaves
      //      room for the plaza's round bench outside it) ----
      const R = 1.5, cw = 0.24, ch = 0.3, N = 18;
      const soilY = y + ch - 0.07;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const segL = ((2 * Math.PI * (R + cw / 2)) / N) * 0.985;
        const cx = x + Math.cos(a) * (R + cw / 2), cz = z + Math.sin(a) * (R + cw / 2);
        const m = geom.addBox(root, cw, ch, segL, graniteMat, cx, y + ch / 2 - 0.02, cz, { ry: -a });
        m.castShadow = false;
        const cap = geom.addBox(root, cw - 0.03, 0.025, segL - 0.03, graniteMat, cx, y + ch - 0.008, cz, { ry: -a });
        cap.castShadow = false;
      }
      const sg = blobGeometry(x, z, R + 0.02, rnd, () => soilY, 0, 24);
      const soil = new THREE.Mesh(sg, soilMat);
      soil.castShadow = false;
      root.add(soil);
      for (let k = 0; k < 6; k++) {
        const a = rnd() * 6.28, r = R * (0.3 + rnd() * 0.5);
        const mm = new THREE.Mesh(blobGeometry(x + Math.cos(a) * r, z + Math.sin(a) * r, 0.18 + rnd() * 0.3, rnd, () => soilY, 0.004, 10), mossMat);
        mm.userData.noOutline = true;
        mm.castShadow = false;
        root.add(mm);
      }
      inf.pit = { x, z, r: R + cw, y: soilY }; // ground petals settle on the pit soil
      addTufts(x, z, soilY, 110, rnd, { r: R - 0.1 });
      addTufts(x, z, soilY, 18, rnd, { disc: R * 0.85 });
      addFlowers(x, z, soilY, 34, rnd, R * 0.95);
      ctx.addCollider(x - R - cw, x + R + cw, z - R - cw, z + R + cw);
    } else if (inf.context === 'street') {
      // ---- square granite pit ----
      const half = 0.95;
      const cw = 0.16, ch = 0.17;
      const soilY = y + ch - 0.07;
      const len = half * 2 + cw * 2;
      const sides = [
        [len, cw, x, z + half + cw / 2], [len, cw, x, z - half - cw / 2],
        [cw, half * 2, x + half + cw / 2, z], [cw, half * 2, x - half - cw / 2, z],
      ];
      for (const [w, d, cx, cz] of sides) {
        const m = geom.addBox(root, w, ch, d, graniteMat, cx, y + ch / 2 - 0.02, cz);
        m.castShadow = false;
        // chamfer cap: a slightly narrower top slab makes the outline read as a bevel
        const cap = geom.addBox(root, w - 0.03, 0.025, d - 0.03, graniteMat, cx, y + ch - 0.008, cz);
        cap.castShadow = false;
      }
      const soil = geom.addBox(root, half * 2 + 0.01, 0.05, half * 2 + 0.01, soilMat, x, soilY - 0.025, z);
      soil.castShadow = false;
      for (let k = 0; k < 3; k++) {
        const a = rnd() * 6.28, r = half * (0.3 + rnd() * 0.55);
        const mg = blobGeometry(x + Math.cos(a) * r, z + Math.sin(a) * r, 0.18 + rnd() * 0.18, rnd, () => soilY, 0.004, 10);
        const mm = new THREE.Mesh(mg, mossMat);
        mm.userData.noOutline = true;
        mm.castShadow = false;
        root.add(mm);
      }
      inf.pit = { x, z, half: half + cw, y: soilY };
      addTufts(x, z, soilY, 55, rnd, { square: half - 0.05 });
      addTufts(x, z, soilY, 10, rnd, { disc: half * 0.9 });
      addFlowers(x, z, soilY, 8, rnd, half * 0.95);
      ctx.addCollider(x - half - cw, x + half + cw, z - half - cw, z + half + cw);
    } else if (inf.context === 'rail') {
      // ---- ring of rough low stones ----
      const R = 0.95 + inf.trunkR * 1.5;
      const n = Math.round((Math.PI * 2 * R) / 0.42);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.08;
        const s = 0.2 + rnd() * 0.07;
        const sx = x + Math.cos(a) * R, sz = z + Math.sin(a) * R;
        const g = stoneGeometry(rnd, s);
        geom.paint(g, new THREE.Color('#dcd6cb').lerp(new THREE.Color(rnd() < 0.5 ? '#bdb6ab' : '#ebe5da'), rnd()));
        const m = new THREE.Mesh(g, stoneMat);
        m.position.set(sx, groundY(sx, sz) + 0.04, sz);
        m.rotation.y = -a + (rnd() - 0.5) * 0.4;
        m.castShadow = false;
        root.add(m);
      }
      const sg = blobGeometry(x, z, R - 0.05, rnd, groundY, 0.035, 18);
      const soil = new THREE.Mesh(sg, soilMat);
      soil.castShadow = false;
      root.add(soil);
      for (let k = 0; k < 3; k++) {
        const a = rnd() * 6.28, r = R * (0.3 + rnd() * 0.4);
        const mm = new THREE.Mesh(blobGeometry(x + Math.cos(a) * r, z + Math.sin(a) * r, 0.2 + rnd() * 0.2, rnd, groundY, 0.042, 10), mossMat);
        mm.userData.noOutline = true;
        mm.castShadow = false;
        root.add(mm);
      }
      addTufts(x, z, null, 70, rnd, { r: R - 0.12 });
      addFlowers(x, z, null, 7, rnd, R * 0.9);
      ctx.addCollider(x - inf.trunkR * 1.6, x + inf.trunkR * 1.6, z - inf.trunkR * 1.6, z + inf.trunkR * 1.6);
    } else {
      // ---- natural soil patch ----
      const small = inf.context === 'levee';
      const R = (small ? 0.8 : 0.85) + inf.trunkR * 1.2;
      const sg = blobGeometry(x, z, R, rnd, groundY, 0.018, 16);
      const soil = new THREE.Mesh(sg, soilMat);
      soil.castShadow = false;
      soil.userData.noOutline = true;
      root.add(soil);
      if (!small || Math.abs(x) < 110) {
        const mm = new THREE.Mesh(blobGeometry(x + (rnd() - 0.5) * R, z + (rnd() - 0.5) * R, 0.25, rnd, groundY, 0.024, 10), mossMat);
        mm.userData.noOutline = true;
        mm.castShadow = false;
        root.add(mm);
        addTufts(x, z, null, small ? 22 : 45, rnd, { r: R * 1.05 });
        addFlowers(x, z, null, small ? 3 : 6, rnd, R * 1.1);
      }
      ctx.addCollider(x - inf.trunkR * 1.3, x + inf.trunkR * 1.3, z - inf.trunkR * 1.3, z + inf.trunkR * 1.3);
    }
  }

  const out = new THREE.Group();
  out.name = 'sakura_pits';
  const baked = geom.bakeStatic(root, { name: 'sakura_pits_static' });
  out.add(baked);
  const grassMat = toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, name: 'sakura_grass' });
  const tuftIm = geom.instanced(tuftGeometry(), grassMat, tufts, { castShadow: false, noOutline: true });
  tuftIm.name = 'sakura_grass_tufts';
  out.add(tuftIm);
  const flowerMat = toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, name: 'sakura_wildflower' });
  const flIm = geom.instanced(flowerGeometry(), flowerMat, flowers, { castShadow: false, noOutline: true });
  flIm.name = 'sakura_wildflowers';
  out.add(flIm);
  return out;
}
