/**
 * people/cats — neighbourhood cats: a white cat sitting on a garden wall along
 * the main street, a calico loafing by the little shrine and a black cat
 * sitting beside it.  Each cat is one SkinnedMesh (body / head / ears / tail
 * chain bones); idle animation sways the tail, turns the head now and then
 * and twitches an ear.
 *
 * Perches are found at build time by ray-casting down onto the geometry
 * other modules already built (wall tops / stones), so the cats sit ON things
 * instead of floating; without those modules they fall back to the ground.
 */
import * as THREE from 'three';
import { RigMesh, ellipsoid, strand, M, V3 } from './mesh.js';
import { makeRig, vnoise } from './rig.js';
import { paintCatFace, FACE } from './atlas.js';
import { finishRig, fitBounds } from './character.js';
import { makeRegionProbe } from './probe.js';

const CATS = {
  white: { fur: '#f4f1ec', shade: '#e3dcd6', eye: '#8fc0d8', nose: '#eaa0a8', line: '#6a5a5e', inner: '#f2c4c8' },
  calico: { fur: '#f5f0e8', shade: '#e6ddd2', eye: '#d9b04a', nose: '#e39aa0', inner: '#f2c4c8', patches: ['#d9965a', '#3a3438'], muzzle: null },
  black: { fur: '#2e2c33', shade: '#2e2c33', eye: '#e6c14a', nose: '#4a3a40', line: '#1a181c', inner: '#5a4a52' },
};

/** Build one cat. pose: 'sit' | 'loaf'. */
function buildCat(id, kind, pose, shared) {
  const c = CATS[kind];
  const sit = pose === 'sit';
  const HR = 0.056; // head radius
  const head = sit ? V3(0, 0.255, 0.075) : V3(0, 0.125, 0.19);
  const P = { R: HR, cy: head.y, cz: head.z };
  const rig = makeRig({ hipJ: 0.1, waistY: 0.12, chestY: 0.15, neckBase: 0.18, neckTop: 0.2, cy: head.y, R: HR, s: 1, shX: 0.03, shoulderY: 0.15, elbowY: 0.08, wristY: 0.02, hipX: 0.05, kneeY: 0.06, ankleY: 0.02 }, [
    ['cHead', 'root', 0, head.y - 0.03, head.z - 0.02],
    ['earL', 'cHead', 0.032, head.y + 0.04, head.z - 0.005],
    ['earR', 'cHead', -0.032, head.y + 0.04, head.z - 0.005],
    ['tail1', 'root', 0, 0.03, sit ? -0.14 : -0.2],
    ['tail2', 'tail1', sit ? 0.08 : 0.07, 0.02, sit ? -0.13 : -0.26],
    ['tail3', 'tail2', sit ? 0.13 : 0.12, 0.02, sit ? -0.02 : -0.2],
  ]);
  const RM = new RigMesh(rig.index);
  const D = new RigMesh(rig.index);
  // fur colour with calico patches (in model space)
  const patchSpots = kind === 'calico' ? [
    [V3(0.05, 0.12, -0.05), 0.07, c.patches[0]], [V3(-0.06, 0.09, -0.12), 0.06, c.patches[1]], [V3(0.02, 0.07, 0.05), 0.05, c.patches[0]],
    [V3(-0.04, 0.14, 0.04), 0.045, c.patches[1]],
  ] : [];
  const fur = (p) => {
    for (const [q, r, col] of patchSpots) if (p.distanceTo(q) < r) return col;
    return p.y < 0.03 ? c.shade : c.fur;
  };
  const body = (g, m, bone = 'root') => RM.add(g, { m, bone, color: fur });
  if (sit) {
    body(ellipsoid(0.085, 0.078, 0.1, 14, 10), M(0, 0.075, -0.06));
    body(ellipsoid(0.064, 0.11, 0.07, 14, 10), M(0, 0.15, 0.02, -0.3));
    body(ellipsoid(0.048, 0.05, 0.05, 10, 8), M(0, 0.215, 0.045), 'cHead');
    for (const sx of [-1, 1]) {
      body(ellipsoid(0.016, 0.06, 0.017, 8, 6), M(sx * 0.026, 0.055, 0.075));
      body(ellipsoid(0.019, 0.012, 0.026, 8, 6), M(sx * 0.026, 0.011, 0.088));
      body(ellipsoid(0.022, 0.014, 0.035, 8, 6), M(sx * 0.058, 0.013, 0.03));
    }
  } else {
    body(ellipsoid(0.085, 0.072, 0.19, 16, 10, (p) => { if (p.y < -0.04) p.y = -0.04 - (p.y + 0.04) * 0.3; }), M(0, 0.072, -0.02));
    body(ellipsoid(0.05, 0.045, 0.05, 10, 8), M(0, 0.1, 0.14), 'cHead');
    for (const sx of [-1, 1]) body(ellipsoid(0.02, 0.013, 0.03, 8, 6), M(sx * 0.03, 0.013, 0.17));
  }
  // head with the painted face (planar projection like the people)
  const faceRect = shared.atlas.cell(`cat_${id}`, (g, S) => paintCatFace(g, S, c));
  const hg = ellipsoid(HR * 1.12, HR * 0.92, HR * 0.95, 20, 14, (p) => { if (p.y < 0) p.x *= 1 + 0.1 * (-p.y / HR); });
  RM.add(hg, {
    m: M(head.x, head.y, head.z), bone: 'cHead', color: '#ffffff',
    uv: (p) => {
      const lx = (p.x - head.x) / 1.12, ly = p.y - head.y, lz = p.z - head.z;
      if (lz < -0.3 * HR) return faceRect.map(0.04, 0.96);
      return faceRect.map(0.5 + lx / (2 * HR), (ly / HR - FACE.vBottom) / FACE.vSpan);
    },
  });
  RM.add(ellipsoid(HR * 0.5, HR * 0.32, HR * 0.35, 10, 6), { m: M(head.x, head.y - HR * 0.35, head.z + HR * 0.72), bone: 'cHead', color: kind === 'black' ? c.fur : '#fbf8f4' });
  // ears: flattened cones with a pink inner face
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const ear = new THREE.ConeGeometry(0.024, 0.045, 4, 1);
    ear.deleteAttribute('uv');
    ear.scale(1, 1, 0.45);
    RM.add(ear, { m: M(sx * 0.034, head.y + 0.058, head.z - 0.005, -0.1, sx * 0.15, -sx * 0.32), bone: `ear${sd}`, color: kind === 'calico' && sx > 0 ? c.patches[0] : c.fur });
    const inner = new THREE.ConeGeometry(0.016, 0.032, 3, 1);
    inner.deleteAttribute('uv');
    inner.scale(1, 1, 0.3);
    RM.add(inner, { m: M(sx * 0.034, head.y + 0.054, head.z + 0.004, -0.1, sx * 0.15, -sx * 0.32), bone: `ear${sd}`, color: c.inner });
  }
  // whiskers (detail mesh, no outline)
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const a = V3(sx * 0.02, head.y - 0.02 - k * 0.005, head.z + HR * 0.85);
    const b = V3(sx * 0.09, head.y - 0.012 - k * 0.018, head.z + HR * 0.6);
    D.add(strand([a, b], { width: () => 0.0012, thick: () => 0.0008, out: head, seg: 3 }), { bone: 'cHead', color: kind === 'black' ? '#8a8490' : '#ffffff' });
  }
  // tail chain
  const tp = sit
    ? [V3(0, 0.035, -0.14), V3(0.06, 0.02, -0.15), V3(0.11, 0.016, -0.08), V3(0.125, 0.016, 0.0), V3(0.1, 0.018, 0.07), V3(0.06, 0.02, 0.1)]
    : [V3(0, 0.05, -0.2), V3(0.06, 0.03, -0.26), V3(0.11, 0.022, -0.2), V3(0.12, 0.02, -0.08), V3(0.11, 0.02, 0.02)];
  RM.add(strand(tp, { width: (t) => 0.02 * (1 - t * 0.35), thick: (t) => 0.018 * (1 - t * 0.35), out: V3(0, 0.3, 0), seg: 8 }), {
    bone: (p, t) => { const a = THREE.MathUtils.smoothstep(t, 0.15, 0.4), b = THREE.MathUtils.smoothstep(t, 0.5, 0.8); return [['tail1', 1 - a], ['tail2', a * (1 - b)], ['tail3', a * b]]; },
    color: (p, n, t) => (kind === 'calico' && t > 0.5 ? c.patches[t > 0.8 ? 1 : 0] : kind === 'white' || kind === 'black' ? c.fur : c.fur),
  });
  const ch = finishRig(RM, D, rig, P, shared, `cat_${id}`);
  return ch;
}

/** Scene roots other modules built (everything but the sky and ourselves). */
function perchRoots(ctx, exclude) {
  return ctx.scene.children.filter((o) => o !== exclude && o.name !== 'sky' && !o.isLight && !o.isCamera);
}

export function buildCats(ctx, shared, cast) {
  const { layout } = ctx;
  const { LOTS, SPOTS, groundY } = layout;
  const group = new THREE.Group();
  group.name = 'cats';
  const roots = perchRoots(ctx, cast);
  const cats = [];

  // ---- white cat on a garden wall along the main street ----------------------------
  {
    let best = null;
    const want = { z: 50, side: 1 };
    const lots = LOTS.filter((l) => l.street === 'main' && l.type === 'house' && l.z > 30 && l.z < 75);
    // one triangle grid covering the fronts of the candidate lots
    const reg = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
    for (const lot of lots) {
      for (const [lx, lz] of [[-0.5, 0.5], [0.5, 0.5], [-0.5, 0.5 + 2.2 / lot.depth], [0.5, 0.5 + 2.2 / lot.depth]]) {
        const w = lot.toWorld(lx * lot.width, lz * lot.depth);
        reg.x0 = Math.min(reg.x0, w.x - 0.5); reg.x1 = Math.max(reg.x1, w.x + 0.5);
        reg.z0 = Math.min(reg.z0, w.z - 0.5); reg.z1 = Math.max(reg.z1, w.z + 0.5);
      }
    }
    const probe = makeRegionProbe(roots, reg, 0.4);
    for (const lot of lots) {
      const edge = lot.depth / 2 + (lot.setback || 0.8);
      for (let lx = -lot.width / 2 + 0.4; lx <= lot.width / 2 - 0.4; lx += 0.35) {
        for (let lz = lot.depth / 2 + 0.25; lz <= edge + 0.05; lz += 0.08) {
          const w = lot.toWorld(lx, lz);
          const g = groundY(w.x, w.z);
          const h = probe(w.x, w.z, g + 3);
          if (!h || h.ny < 0.95) continue;
          const hh = h.y - g;
          if (hh < 0.75 || hh > 1.35) continue;
          // must be a narrow top: lower just in front (street side)
          const f = lot.toWorld(lx, lz + 0.2);
          const hf = probe(f.x, f.z, g + 3);
          if (hf && hf.y > h.y - 0.3) continue;
          const a = lot.toWorld(lx + 0.18, lz), b = lot.toWorld(lx - 0.18, lz);
          const ha = probe(a.x, a.z, g + 3), hb = probe(b.x, b.z, g + 3);
          if (!ha || !hb || Math.abs(ha.y - h.y) > 0.02 || Math.abs(hb.y - h.y) > 0.02) continue;
          const score = Math.abs(w.z - want.z) + (lot.side === want.side ? 0 : 6);
          if (!best || score < best.score) best = { x: w.x, y: h.y, z: w.z, rotY: lot.rotY + 0.5, score };
        }
      }
    }
    if (!best) {
      const lot = lots[0];
      const w = lot.toWorld(lot.width / 2 - 0.5, lot.depth / 2 + 0.3);
      best = { x: w.x, y: groundY(w.x, w.z) + 0.07, z: w.z, rotY: lot.rotY + 0.5 };
    }
    cats.push({ ch: buildCat('white', 'white', 'sit', shared), ...best, seed: 1 });
  }

  // ---- calico + black cat by the shrine -----------------------------------------------
  {
    const sh = SPOTS.shrine;
    const probe = makeRegionProbe(roots, { x0: sh.x - 3.5, x1: sh.x + 3.5, z0: sh.z - 3, z1: sh.z + 3.5 }, 0.25);
    // A loafing cat needs ~0.14 m across and ~0.34 m along its body: test both axes of the
    // shrine frame, so the narrow ledges of the two-tier stone base qualify.  Prefer the
    // right-hand side ledge, facing the visitors (+Z of the shrine).
    const cs = Math.cos(sh.rotY), sn = Math.sin(sh.rotY);
    const toW = (lx, lz) => ({ x: sh.x + lx * cs + lz * sn, z: sh.z - lx * sn + lz * cs });
    let perch = null;
    for (let lx = -2.2; lx <= 2.2; lx += 0.05) {
      for (let lz = -1.6; lz <= 1.8; lz += 0.05) {
        const w = toW(lx, lz);
        const h = probe(w.x, w.z, 3.5);
        if (!h || h.ny < 0.97) continue;
        const hh = h.y - groundY(w.x, w.z);
        if (hh < 0.25 || hh > 0.9) continue;
        for (const along of [0, 1]) { // 0: body along shrine Z, 1: along shrine X
          let ok = true;
          for (const [a, c] of [[0.07, 0], [-0.07, 0], [0, 0.17], [0, -0.17], [0.05, 0.12], [-0.05, -0.12]]) {
            const q = along ? toW(lx + c, lz + a) : toW(lx + a, lz + c);
            const r = probe(q.x, q.z, 3.5);
            if (!r || Math.abs(r.y - h.y) > 0.015) { ok = false; break; }
          }
          if (!ok) continue;
          const score = Math.hypot(lx - 0.72, lz + 0.45) + along * 0.3;
          if (!perch || score < perch.score) {
            // face away from the shrine body: +Z (front) along a side ledge, outward along a front/back one
            const yaw = along ? (lx >= 0 ? Math.PI / 2 : -Math.PI / 2) : (lz < -0.7 ? Math.PI : 0);
            perch = { x: w.x, y: h.y, z: w.z, rotY: sh.rotY + yaw, score };
          }
        }
      }
    }
    if (!perch) perch = { x: sh.x + 1.3, y: groundY(sh.x + 1.3, sh.z + 0.6), z: sh.z + 0.6, rotY: sh.rotY + 0.9 };
    cats.push({ ch: buildCat('calico', 'calico', 'loaf', shared), ...perch, seed: 2 });
    // black cat: sits on a stepping stone of the approach, just outside the little torii,
    // facing whoever comes up the path (props/shrine.js: stones at shrine-local z 0.55..1.75).
    // Fallback: a ring of flat, low spots around the calico, clear of statues / lanterns.
    let spot = null;
    {
      const w = toW(0.02, 1.35);
      const c = probe(w.x, w.z, 3.5);
      if (c && c.y - groundY(w.x, w.z) < 0.12) spot = { x: w.x, y: c.y, z: w.z, rotY: sh.rotY + 0.45 };
    }
    for (let k = 0; k < 16 && !spot; k++) {
      const ang = 0.8 + k * 0.785, rad = 0.9 + (k >> 3) * 0.35;
      const bx = perch.x + Math.cos(ang) * rad, bz = perch.z + Math.sin(ang) * rad;
      const g0 = groundY(bx, bz);
      const c = probe(bx, bz, 3.5);
      if (!c || c.y - g0 > 0.1) continue;
      let flat = true;
      for (const [ox, oz] of [[0.15, 0], [-0.15, 0], [0, 0.18], [0, -0.18]]) {
        const q = probe(bx + ox, bz + oz, 3.5);
        if (!q || Math.abs(q.y - c.y) > 0.03) { flat = false; break; }
      }
      if (flat) spot = { x: bx, y: c.y, z: bz, rotY: Math.atan2(perch.x - bx, perch.z - bz) + 0.3 };
    }
    if (!spot) spot = { x: perch.x + 0.9, y: groundY(perch.x + 0.9, perch.z + 0.9) + 0.02, z: perch.z + 0.9, rotY: 0 };
    cats.push({ ch: buildCat('black', 'black', 'sit', shared), ...spot, seed: 3 });
  }

  if (ctx.params?.get('peopleDebug')) {
    for (const c of cats) console.warn(`[people] cat ${c.ch.object.name} at ${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}`);
  }
  for (const c of cats) {
    c.ch.object.position.set(c.x, c.y, c.z);
    c.ch.object.rotation.y = c.rotY;
    c.ch.poser.commit();
    fitBounds(c.ch, 0.15);
    group.add(c.ch.object);
  }

  ctx.onUpdate((dt, t) => {
    for (const c of cats) {
      const p = c.ch.poser, s = c.seed;
      // tail: slow sway + an occasional tip flick
      const flick = Math.max(0, Math.sin(t * 0.7 + s * 2)) ** 8;
      p.delta('tail1', 0, Math.sin(t * 0.9 + s) * 0.12, 0);
      p.delta('tail2', -flick * 0.3, Math.sin(t * 1.3 + s) * 0.25, 0);
      p.delta('tail3', -flick * 0.6, Math.sin(t * 1.9 + s * 3) * 0.35, 0);
      // head: mostly still, occasional look around
      p.delta('cHead', vnoise(t * 0.25, s + 20) * 0.12, vnoise(t * 0.18, s + 30) * 0.7, vnoise(t * 0.2, s + 40) * 0.15);
      // ear twitch
      const tw = (t * 0.4 + s * 0.37) % 1;
      const e = tw < 0.04 ? Math.sin((tw / 0.04) * Math.PI) : 0;
      p.delta(s % 2 ? 'earL' : 'earR', 0, 0, (s % 2 ? -1 : 1) * e * 0.5);
    }
  });
  return { group, cats };
}
