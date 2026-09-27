/**
 * Procedural sakura (Somei-Yoshino style) skeletons + bark tube geometry.
 *
 * Crown-first growth (a light space-colonisation):
 *   1. blossom "sheets" (3-5 flattened masses side by side) are scattered over a
 *      broad umbrella-shaped shell (wider than tall, drooping lower rim, open
 *      underneath, a few layers deep), stretched toward the tree's lean;
 *      the hero tree adds a low lobe of sheets reaching over the road;
 *   2. a gnarled trunk with root flare rises to the fork;
 *   3. the targets are split recursively with k-means (2-3 groups per level):
 *      every split becomes a branch that travels part-way toward its group,
 *      radii follow the pipe model (r ~ sqrt(masses carried)), and each sheet
 *      ends in short twigs — so limbs fork naturally, converge on the blossom
 *      masses and stay visible between them from below.
 * Everything is generated relative to the tree base (+Y up, final scale).
 */
import * as THREE from 'three';

/** Per-kind parameters (sizes for scale = 1).  clump: blossom mass size range (m). */
export const KINDS = {
  grand: { h: 11.5, spread: 16.5, trunkH: 2.5, trunkR: 0.46, limbs: [5, 6], radial: [10, 8, 6, 4, 3], clump: [0.72, 1.05], cover: 0.62, cards: 8, lod: 'hi' },
  large: { h: 9.6, spread: 12.5, trunkH: 2.1, trunkR: 0.33, limbs: [4, 5], radial: [8, 7, 5, 4, 3], clump: [0.68, 1.0], cover: 0.62, cards: 8, lod: 'hi' },
  medium: { h: 7.2, spread: 9.0, trunkH: 1.75, trunkR: 0.24, limbs: [3, 4], radial: [7, 6, 5, 3, 3], clump: [0.62, 0.92], cover: 0.6, cards: 6, lod: 'hi' },
  row: { h: 7.4, spread: 9.2, trunkH: 1.8, trunkR: 0.26, limbs: [3, 4], radial: [6, 5, 4, 3, 3], clump: [1.0, 1.4], cover: 0.5, cards: 7, lod: 'lo' },
  small: { h: 5.2, spread: 6.2, trunkH: 1.4, trunkR: 0.2, limbs: [3, 3], radial: [5, 4, 3, 3, 3], clump: [1.6, 2.1], cover: 0.5, cards: 0, lod: 'far' },
};

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Polyline from a to b with an arch (bulge along `bend`) and gnarl noise.
 * Returns Vector3[] (segs + 1 points).
 */
function pathBetween(a, b, segs, rng, gnarl, bend) {
  const pts = [];
  const d = b.clone().sub(a);
  const L = d.length();
  const side = new THREE.Vector3().crossVectors(d, UP);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const up2 = new THREE.Vector3().crossVectors(side, d).normalize();
  const ph1 = rng() * 6.28, ph2 = rng() * 6.28;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = a.clone().addScaledVector(d, t);
    const env = Math.sin(t * Math.PI);
    if (bend) p.addScaledVector(bend, env * L);
    if (i > 0 && i < segs) {
      // two low-frequency wobbles: gentle S-curves rather than zig-zags
      p.addScaledVector(side, (Math.sin(t * 3.6 + ph1) * 0.7 + Math.sin(t * 8.3 + ph2) * 0.3) * gnarl * L * env);
      p.addScaledVector(up2, Math.sin(t * 2.9 + ph2) * gnarl * 0.6 * L * env);
    }
    pts.push(p);
  }
  return pts;
}

function taper(n, r0, r1) {
  const r = [];
  for (let i = 0; i <= n; i++) r.push(r0 + (r1 - r0) * Math.pow(i / n, 0.8));
  return r;
}

/** Deterministic k-means (k = 2..3) on target positions (y weighted less). */
function kmeans(items, k, iters = 5) {
  const pts = items.map((a) => a.p);
  // seed: farthest-point initialisation
  const cents = [pts[0].clone()];
  while (cents.length < k) {
    let best = null, bd = -1;
    for (const p of pts) {
      let d = 1e9;
      for (const c of cents) d = Math.min(d, (p.x - c.x) ** 2 + ((p.y - c.y) * 0.6) ** 2 + (p.z - c.z) ** 2);
      if (d > bd) { bd = d; best = p; }
    }
    cents.push(best.clone());
  }
  let groups = [];
  for (let it = 0; it < iters; it++) {
    groups = cents.map(() => []);
    for (const a of items) {
      let bi = 0, bd = 1e9;
      cents.forEach((c, i) => {
        const d = (a.p.x - c.x) ** 2 + ((a.p.y - c.y) * 0.6) ** 2 + (a.p.z - c.z) ** 2;
        if (d < bd) { bd = d; bi = i; }
      });
      groups[bi].push(a);
    }
    cents.forEach((c, i) => {
      if (!groups[i].length) return;
      c.set(0, 0, 0);
      for (const a of groups[i]) c.add(a.p);
      c.multiplyScalar(1 / groups[i].length);
    });
  }
  return groups.filter((g) => g.length);
}

/**
 * Grow a tree.  Returns { branches, anchors, trunkTop, height, radius, crownCentre, trunkR }.
 *   branch: { pts: Vector3[], radii: number[], level }
 *   anchor: { p: Vector3, dir: Vector3, size, lobe, sheet }  (blossom clump centres)
 * opts: scale, lean {x,z} (unit), leanAmt, heroDir {x,z} (extra low lobe over the road),
 *       cheap (far trees: fewer, bigger masses)
 */
export function growTree(kind, rng, opts = {}) {
  const K = KINDS[kind];
  const sc = opts.scale ?? 1;
  const H = K.h * sc, R = (K.spread * sc) / 2;
  const trunkH = K.trunkH * sc;
  const trunkR = K.trunkR * sc;
  const lean = opts.lean ? new THREE.Vector3(opts.lean.x, 0, opts.lean.z).normalize() : null;
  const leanAmt = opts.leanAmt ?? 0;
  const branches = [];

  // ---- crown shell: blossom "sheets" (3..5 flattened masses side by side) ----
  const top = new THREE.Vector3((rng() - 0.5) * 0.3 * sc, trunkH, (rng() - 0.5) * 0.3 * sc);
  if (lean) top.addScaledVector(lean, trunkH * leanAmt);
  const shellC = new THREE.Vector3(top.x, trunkH + (H - trunkH) * 0.4, top.z);
  // the crown drifts further along the lean (except the hero, whose crown stays over the
  // trunk to frame the shot while its lobe limb carries blossoms over the road)
  if (lean && !opts.heroDir) shellC.addScaledVector(lean, R * leanAmt * 0.9);
  const rimLow = opts.heroDir ? -0.62 : -0.4;
  const Hs = (H - trunkH) * 0.6;
  const cl = (K.clump[0] + K.clump[1]) * 0.5 * sc;
  const shellArea = 2 * Math.PI * R * R * 0.75 + Math.PI * R * Hs;
  const cheap = !!opts.cheap;
  const nTarget = Math.max(5, Math.round((shellArea / (Math.PI * cl * cl * 0.25)) * K.cover * 0.55 * (cheap ? 0.3 : 1)));
  const anchors = [];
  let sheetId = 0;
  const addSheet = (c, n, spread, lobe, outDir) => {
    const tang = new THREE.Vector3(-outDir.z, 0, outDir.x).normalize();
    const rad = new THREE.Vector3(outDir.x, 0, outDir.z).normalize();
    for (let k = 0; k < n; k++) {
      const u = (rng() - 0.5) * 2, v = (rng() - 0.5) * 2;
      const p = c.clone().addScaledVector(tang, u * spread).addScaledVector(rad, v * spread * 0.55);
      p.y += (rng() - 0.5) * 0.35 * sc - Math.abs(u) * 0.15 * spread; // sheet edges sag slightly
      const size = (K.clump[0] + (K.clump[1] - K.clump[0]) * rng()) * sc * (lobe ? 0.85 : 1) * (cheap ? 1.7 : 1);
      anchors.push({ p, dir: outDir.clone(), size, lobe, sheet: sheetId });
    }
    sheetId++;
  };
  const perSheet = cheap ? 2 : K.lod === 'hi' ? 5 : K.lod === 'lo' ? 3 : 2;
  const nSheets = Math.max(3, Math.round(nTarget / perSheet));
  for (let i = 0; i < nSheets; i++) {
    const th = rng() * Math.PI * 2;
    const s = rimLow + (1 - rimLow) * Math.pow(rng(), 0.7); // sin(elevation): droopy rim .. crown top
    const ph = Math.asin(THREE.MathUtils.clamp(s, -1, 1));
    const dir = new THREE.Vector3(Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th));
    let rr = R;
    if (lean) rr *= 1 + 0.22 * dir.x * lean.x + 0.22 * dir.z * lean.z;
    const inward = 1 - 0.3 * Math.pow(rng(), 1.5);
    const yy = Hs * s * (s > 0 ? 0.85 : 1.1);
    const c = new THREE.Vector3(shellC.x + dir.x * rr * inward, shellC.y + yy * inward, shellC.z + dir.z * rr * inward);
    const n = Math.max(2, perSheet - 1 + Math.floor(rng() * 3));
    // masses within a sheet overlap by ~25% so no sky shows between them (gaps stay between sheets)
    addSheet(c, n, cl * (0.6 + rng() * 0.28), false, dir);
  }
  // hero: a low lobe of blossom sheets carried by a limb reaching over the road
  if (opts.heroDir) {
    const hd = new THREE.Vector3(opts.heroDir.x, 0, opts.heroDir.z).normalize();
    for (let i = 0; i < 7; i++) {
      const t = 0.35 + i * 0.13 + rng() * 0.06;
      const c = top.clone().addScaledVector(hd, R * t);
      c.y = trunkH + (0.7 + 0.8 * Math.sin(t * 2.4)) * sc; // arches up, then droops at the tip
      c.addScaledVector(new THREE.Vector3(-hd.z, 0, hd.x), (rng() - 0.5) * 2.4 * sc);
      addSheet(c, 4, cl * 0.7, true, hd.clone().setY(0.1).normalize());
    }
  }

  // ---- trunk ----
  const trunkSegs = kind === 'small' ? 3 : 6;
  const trunkPts = pathBetween(new THREE.Vector3(0, -0.3, 0), top, trunkSegs, rng, 0.05, lean ? lean.clone().multiplyScalar(-0.06) : null);
  branches.push({ pts: trunkPts, radii: taper(trunkSegs, trunkR, trunkR * 0.72), level: 0 });

  // ---- branches: recursive k-means split of the targets (pipe-model radii) ----
  const N = anchors.length;
  const radiusFor = (n) => Math.max(0.014 * sc, trunkR * 0.78 * Math.pow(n / N, 0.5));
  const segsFor = (lv) => (lv <= 2 ? 5 : lv === 3 ? 4 : 3);
  const grow = (start, startR, items, level) => {
    const oneSheet = items.every((a) => a.sheet === items[0].sheet);
    if (items.length <= 2 || oneSheet || level >= 7) {
      // short, slightly zig-zag twigs into each blossom mass
      for (const a of items) {
        const end = a.p.clone();
        end.y -= a.size * 0.12;
        const pts = pathBetween(start, end, 2, rng, 0.1, UP.clone().multiplyScalar(0.05));
        branches.push({ pts, radii: taper(2, Math.min(startR, radiusFor(1) * 1.2), Math.max(0.008, radiusFor(1) * 0.45)), level: Math.max(4, level) });
        a.twigDir = end.clone().sub(start).normalize();
      }
      return;
    }
    const k = items.length > 8 && rng() < 0.35 ? 3 : 2;
    const groups = kmeans(items, Math.min(k, items.length));
    for (const g of groups) {
      const cen = new THREE.Vector3();
      for (const a of g) cen.add(a.p);
      cen.multiplyScalar(1 / g.length);
      // branch travels part of the way toward its group's centroid, climbing a little
      const f = g.length > 6 ? 0.45 : g.length > 2 ? 0.55 : 0.7;
      const end = start.clone().lerp(cen, f);
      end.y += (g.length > 6 ? 0.35 : 0.12) * sc;
      const r0 = Math.min(startR * 0.95, radiusFor(g.length) * 1.12);
      const r1 = radiusFor(g.length) * 0.85;
      const segs = segsFor(level);
      branches.push({ pts: pathBetween(start, end, segs, rng, 0.05 + level * 0.015, UP.clone().multiplyScalar(0.06)), radii: taper(segs, r0, r1), level });
      grow(end, r1, g, level + 1);
    }
  };
  // main limbs leave the trunk from slightly different heights
  const mainGroups = kmeans(anchors, Math.min(anchors.length, K.limbs[0] + Math.floor(rng() * (K.limbs[1] - K.limbs[0] + 1))));
  for (const g of mainGroups) {
    const i = trunkPts.length - 1 - Math.floor(rng() * 2);
    const start = trunkPts[i].clone();
    const cen = new THREE.Vector3();
    for (const a of g) cen.add(a.p);
    cen.multiplyScalar(1 / g.length);
    const end = start.clone().lerp(cen, 0.42);
    end.y += 0.4 * sc;
    const r0 = trunkR * 0.72, r1 = radiusFor(g.length);
    branches.push({ pts: pathBetween(start, end, 5, rng, 0.06, UP.clone().multiplyScalar(0.07)), radii: taper(5, r0, r1), level: 1 });
    grow(end, r1, g, 2);
  }
  for (const a of anchors) if (!a.twigDir) a.twigDir = a.dir.clone();
  return { branches, anchors, trunkTop: top.clone(), height: H, radius: R, crownCentre: shellC, trunkR };
}

/** Thin twigs that poke out past the blossom masses (dark lines against the sky). */
export function addTwigs(tree, rng, count, sc) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = tree.anchors[Math.floor(rng() * tree.anchors.length)];
    if (a.dir.y < -0.1) continue;
    const d = a.dir.clone().add(new THREE.Vector3((rng() - 0.5) * 0.8, 0.35 + rng() * 0.4, (rng() - 0.5) * 0.8)).normalize();
    const L = (0.35 + rng() * 0.35) * sc + a.size * 0.45;
    const p0 = a.p.clone();
    const p1 = p0.clone().addScaledVector(d, L * 0.55);
    d.y += 0.25;
    d.normalize();
    const p2 = p1.clone().addScaledVector(d, L * 0.45);
    out.push({ pts: [p0, p1, p2], radii: [0.016 * sc, 0.01 * sc, 0.004], level: 4 });
  }
  tree.branches.push(...out);
}

// ---------------------------------------------------------------------------
// bark tubes
// ---------------------------------------------------------------------------
/**
 * Append tapered tubes for every branch into `out` (arrays of numbers).
 * Vertex colours carry bark tint: moss on the shady lower trunk, reddish young twigs.
 * opts.maxLevel: skip finer branches (cheap far trees); opts.radialMul: fewer sides (coarse LOD).
 */
export function appendBark(out, tree, kind, world, rng, opts = {}) {
  const K = KINDS[kind];
  const cosY = Math.cos(world.ry || 0), sinY = Math.sin(world.ry || 0);
  const toWorld = (v, o) => o.set(world.x + v.x * cosY + v.z * sinY, world.y + v.y, world.z - v.x * sinY + v.z * cosY);
  const maxLevel = opts.maxLevel ?? 99;
  const t = new THREE.Vector3(), n = new THREE.Vector3(), bn = new THREE.Vector3(), prevN = new THREE.Vector3();
  const wp = new THREE.Vector3();
  for (const br of tree.branches) {
    if (br.level > maxLevel) continue;
    const radial = Math.max(3, Math.round(K.radial[Math.min(br.level, K.radial.length - 1)] * (opts.radialMul ?? 1)));
    const P = br.pts.map((v) => toWorld(v, new THREE.Vector3()));
    const base = out.pos.length / 3;
    let vAcc = 0;
    const circ = Math.max(1, Math.round((2 * Math.PI * br.radii[0]) / 0.5));
    const rootPhase = rng() * 6.28;
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      t.subVectors(b, a).normalize();
      if (i === 0) n.crossVectors(t, Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP);
      else n.copy(prevN).addScaledVector(t, -prevN.dot(t)); // parallel transport
      if (n.lengthSq() < 1e-8) n.crossVectors(t, Math.abs(t.x) > 0.9 ? UP : new THREE.Vector3(1, 0, 0));
      n.normalize();
      prevN.copy(n);
      bn.crossVectors(t, n).normalize();
      if (i > 0) vAcc += P[i].distanceTo(P[i - 1]);
      const r = br.radii[i];
      const isTrunkBase = br.level === 0 && i <= 1;
      for (let j = 0; j <= radial; j++) {
        const ang = (j / radial) * Math.PI * 2;
        let rr = r;
        if (isTrunkBase) {
          // root flare with 5 buttress bumps at ground level
          const flare = i === 0 ? 1.5 : 1.12;
          rr = r * flare * (1 + (i === 0 ? 0.25 : 0.08) * Math.pow(Math.max(0, Math.cos(ang * 5 + rootPhase)), 3));
        } else if (br.level <= 1) {
          rr = r * (1 + 0.07 * Math.sin(ang * 3 + i * 1.7 + rootPhase)); // slightly irregular section
        }
        const cx = Math.cos(ang), sy = Math.sin(ang);
        const nx = n.x * cx + bn.x * sy, ny = n.y * cx + bn.y * sy, nz = n.z * cx + bn.z * sy;
        wp.set(P[i].x + nx * rr, P[i].y + ny * rr, P[i].z + nz * rr);
        out.pos.push(wp.x, wp.y, wp.z);
        out.nrm.push(nx, ny, nz);
        out.uv.push((j / radial) * circ, vAcc / 0.9);
        // tint: moss on the lower, shaded trunk; young twigs redder
        let cr = 0.92, cg = 0.9, cb = 0.92;
        if (br.level === 0) {
          const h = wp.y - world.y;
          const moss = Math.max(0, 1 - h / 1.3) * Math.max(0, 0.3 - nx * 0.3 - nz * 0.5);
          cr -= moss * 0.3; cg -= moss * 0.06; cb -= moss * 0.34;
        }
        if (br.level >= 3) { cr = 0.98; cg = 0.8; cb = 0.8; }
        out.col.push(cr, cg, cb);
      }
    }
    const ring = radial + 1;
    for (let i = 0; i < P.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * ring + j, b = a + 1, c = a + ring, d = c + 1;
        out.idx.push(a, c, b, b, c, d);
      }
    }
    // cap thick ends so no hole shows from above
    if (br.level <= 2) {
      const last = base + (P.length - 1) * ring;
      const cIdx = out.pos.length / 3;
      const e = P[P.length - 1];
      const rEnd = br.radii[br.radii.length - 1];
      out.pos.push(e.x + t.x * rEnd * 0.5, e.y + t.y * rEnd * 0.5, e.z + t.z * rEnd * 0.5);
      out.nrm.push(t.x, t.y, t.z);
      out.uv.push(0.5, vAcc / 0.9);
      out.col.push(0.9, 0.88, 0.9);
      for (let j = 0; j < radial; j++) out.idx.push(last + j, cIdx, last + j + 1);
    }
  }
}

/** Build a BufferGeometry from the arrays filled by appendBark. */
export function barkGeometry(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  g.setIndex(out.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(out.idx, 1) : new THREE.Uint16BufferAttribute(out.idx, 1));
  g.computeBoundingSphere();
  return g;
}

export function newBarkArrays() {
  return { pos: [], nrm: [], uv: [], col: [], idx: [] };
}
