/**
 * railway/weeds.js — spring weeds and wild flowers along the line:
 * grass tufts, dandelions, harujion daisies, white clover, speedwell and
 * horsetail growing from the ballast toes, the trough between the tracks,
 * gaps in the ballast shoulders, fence lines, cable-trough and gravel-strip edges and
 * around mast / signal foundations.
 *
 * Every plant is a pair of crossed alpha cards from one atlas, merged into a
 * single mesh with a per-vertex `sway` weight (0 at the root, 1 at the tip)
 * that the wind vertex patch uses.  Normals point up so both faces are lit
 * like the ground (no dark back sides).
 */
import * as THREE from 'three';
import { TRK, inPlatformX, inCrossing, inInternalCrossing, isNear, wobble, thinner } from './common.js';
import { bedHeight } from './track.js';
import { EDGE_Z } from './trackside.js';

const TYPES = {
  tuft: { w: [0.34, 0.6], h: [0.2, 0.38] },
  tuftTall: { w: [0.3, 0.45], h: [0.42, 0.7] },
  tuftDry: { w: [0.34, 0.6], h: [0.22, 0.42] },
  dandelion: { w: [0.36, 0.48], h: [0.26, 0.36] },
  daisy: { w: [0.4, 0.55], h: [0.42, 0.6] },
  clover: { w: [0.45, 0.6], h: [0.2, 0.26] },
  speedwell: { w: [0.45, 0.6], h: [0.13, 0.18] },
  horsetail: { w: [0.3, 0.4], h: [0.3, 0.4] },
};
const MIX_EDGE = [['tuft', 33], ['tuftTall', 14], ['tuftDry', 9], ['dandelion', 14], ['daisy', 11], ['clover', 10], ['speedwell', 6], ['horsetail', 3]];
const MIX_GAP = [['tuft', 55], ['tuftDry', 20], ['dandelion', 18], ['speedwell', 7]];

function picker(rng, mix) {
  const total = mix.reduce((s, m) => s + m[1], 0);
  return () => {
    let r = rng() * total;
    for (const [n, w] of mix) { r -= w; if (r <= 0) return n; }
    return mix[0][0];
  };
}

export function buildWeeds(K) {
  const rng = K.rng(601);
  const cells = K.weedCells;
  const pos = [], nor = [], uv = [], col = [], sway = [], idx = [];
  const c = new THREE.Color();

  const keep = thinner(K.rng(602), K.density); // fewer plants on the low quality tier
  const plant = (type, x, z, y, scale = 1) => {
    if (!keep()) return;
    const T = TYPES[type];
    const w = (T.w[0] + rng() * (T.w[1] - T.w[0])) * scale;
    const h = (T.h[0] + rng() * (T.h[1] - T.h[0])) * scale;
    const [u0, v0, u1, v1] = cells[type];
    const th = rng() * Math.PI;
    const tint = 0.9 + rng() * 0.16;
    c.setRGB(tint, tint * (0.98 + rng() * 0.04), tint * (0.94 + rng() * 0.06));
    for (const a of [th, th + Math.PI / 2]) {
      const dx = Math.cos(a) * w / 2, dz = Math.sin(a) * w / 2;
      const base = pos.length / 3;
      const lean = (rng() - 0.5) * 0.1;
      pos.push(x - dx, y - 0.02, z - dz, x + dx, y - 0.02, z + dz, x + dx + lean, y + h, z + dz, x - dx + lean, y + h, z - dz);
      for (let i = 0; i < 4; i++) { nor.push(0, 1, 0); col.push(c.r, c.g, c.b); }
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      sway.push(0, 0, h, h);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };

  const edge = picker(rng, MIX_EDGE);
  const gap = picker(rng, MIX_GAP);
  const skip = (x) => inCrossing(x, 0.8) || inInternalCrossing(x, 0.4);
  const zA = TRK.A.z, zB = TRK.B.z, zM = TRK.zMid;

  for (let x = TRK.xMin + 1; x < TRK.xMax - 1; ) {
    const near = isNear(x);
    const step = near ? 0.42 : 2.6;
    if (!skip(x)) {
      const plat = inPlatformX(x, 0.5);
      // ballast toes (outer), clumping with a slow wobble so growth looks patchy
      if (!plat) {
        for (const [zc, s, seed] of [[zA, 1, 1], [zB, -1, 2]]) {
          const dens = 0.55 + 0.45 * wobble(x * 0.35, seed + 10);
          if (rng() < dens) {
            const z = zc + s * (2.0 + rng() * 0.55);
            plant(edge(), x + rng() * step, z, bedHeight(x, z), 0.8 + rng() * 0.45);
          }
          // occasional plant from a gap in the shoulder
          if (near && rng() < 0.07) {
            const z = zc + s * (1.25 + rng() * 0.6);
            plant(gap(), x + rng() * step, z, bedHeight(x, z), 0.55 + rng() * 0.3);
          }
        }
      }
      // trough between the tracks
      if (rng() < (near ? 0.3 : 0.5)) {
        const z = zM + (rng() - 0.5) * 0.9;
        plant(rng() < 0.7 ? gap() : edge(), x + rng() * step, z, bedHeight(x, z), 0.6 + rng() * 0.35);
      }
      // cable trough edges
      if (near && !plat) {
        if (rng() < 0.35) plant(edge(), x, EDGE_Z.troughS + (rng() < 0.5 ? -0.28 : 0.28), 0, 0.7 + rng() * 0.4);
        if (rng() < 0.35) plant(edge(), x, EDGE_Z.troughN + (rng() < 0.5 ? -0.28 : 0.28), 0, 0.7 + rng() * 0.4);
      }
      // gravel strip edges (terrain.js strips); only the northern one behind the platforms
      if (near && rng() < 0.3 && (!plat || rng() < 0.5)) plant(edge(), x, plat || rng() < 0.5 ? EDGE_Z.gravelN + 0.05 : EDGE_Z.gravelS - 0.05, 0, 0.8 + rng() * 0.4);
    }
    x += step;
  }

  // fence lines (both faces of the fence)
  for (const run of K.fenceRuns || []) {
    for (let x = run.x0 + 0.2; x < run.x1; ) {
      const near = isNear(x);
      if (rng() < 0.8) plant(edge(), x, run.z + (rng() - 0.5) * 0.55, 0, (near ? 0.85 : 1.1) + rng() * 0.45);
      x += near ? 0.5 + rng() * 0.4 : 2.5 + rng() * 2;
    }
  }
  // around mast / signal / box foundations
  for (const o of K.occupied) {
    if (!isNear(o.x) || o.r > 3) continue;
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, r = o.r * 0.5 + 0.25 + rng() * 0.2;
      const x = o.x + Math.cos(a) * r, z = o.z + Math.sin(a) * r;
      plant(edge(), x, z, bedHeight(x, z), 0.8 + rng() * 0.3);
    }
  }
  for (const p of K.mastSpots || []) {
    if (!isNear(p.x) || inPlatformX(p.x, 1)) continue;
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      plant(edge(), p.x + Math.cos(a) * 0.6, p.z + Math.sin(a) * 0.6, 0, 0.9 + rng() * 0.3);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  g.setIndex(idx);
  K.B.add('weed', g, null);
  K.stats.weeds = pos.length / 24;
}

export default buildWeeds;
