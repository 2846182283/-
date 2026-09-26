/**
 * people/hair — sculpted anime hair: a cap shell over the skull plus tapered
 * clumps (bangs, side locks, back curtain, ponytail, bob).  Everything is
 * built head-local (origin at the cranium centre) and moved to model space.
 *
 * Clump tips carry flutter amplitude (aFlut) so they sway with sim.wind in
 * the vertex shader; long hair blends from the head bone into the chest bone
 * along its length so turning the head never swings it through the shoulders;
 * ponytails ride the hair1 / hair2 bones (animated from the wind in cast.js).
 */
import * as THREE from 'three';
import { strand, ellipsoid, clip, torus, M, V3, mix, ss } from './mesh.js';


/** Point on a sphere around the head centre: az from +Z toward +X, el up from horizontal. */
function sph(r, az, el) {
  return new THREE.Vector3(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
}

/**
 * h: { style, color, length (model y of the tips for long hair), bangs: 'full'|'side'|'short'|'none',
 *      blow {x,z} (head-local metres of build-time wind lean at the tips), flut (tip amplitude m),
 *      sideLocks bool, tieColor }
 */
export function buildHair(RM, P, h) {
  const R = P.R;
  const base = new THREE.Color(h.color);
  const dark = base.clone().multiplyScalar(0.82);
  const light = base.clone().lerp(new THREE.Color('#fff4ec'), 0.22);
  const toModel = M(0, P.cy, P.cz);
  const blow = h.blow || { x: 0, z: 0 };
  const flutTip = h.flut ?? 0.02;

  // hair colour: angel-ring highlight band on the crown, darker toward the nape
  const capColor = (p) => {
    const ly = (p.y - P.cy) / R, lz = (p.z - P.cz) / R;
    const ring = ss(ly, 0.42, 0.5) * (1 - ss(ly, 0.6, 0.7)) * ss(lz, -0.4, 0.1);
    const c = base.clone().lerp(light, ring * 0.9);
    if (ly < 0) c.lerp(dark, Math.min(1, -ly));
    return c;
  };

  // ---- cap ----------------------------------------------------------------
  const capR = R * 1.075;
  const napeY = (h.style === 'short' || h.style === 'elder' ? -0.5 : -0.62) * R;
  let cap = ellipsoid(capR, capR, capR, 30, 22, (p) => {
    if (p.z > 0) p.z *= 0.95; else p.z *= 1.07;
    if (p.y < 0) { const t = -p.y / capR; p.x *= 1 - 0.18 * t * t; }
  });
  cap = clip(cap, (p) => {
    const front = p.z > 0.12 * R;
    const ax = Math.abs(p.x) / R;
    if (front) {
      const hairline = ax > 0.55 ? -0.15 * R : h.bangs === 'none' ? 0.55 * R : 0.42 * R;
      return p.y > hairline;
    }
    return p.y > napeY - (ax > 0.7 ? 0.05 * R : 0);
  });
  RM.add(cap, { m: toModel, bone: 'head', color: capColor });

  const add = (pts, width, thick, o = {}) => {
    const g = strand(pts, { width, thick, out: o.out || V3(0, 0, 0), seg: o.seg || 6, twist: o.twist });
    RM.add(g, {
      m: toModel,
      bone: o.bone || 'head',
      flut: (p, t) => (o.flut ?? flutTip) * t * t,
      color: (p, n, t) => mix(dark, base, ss(t, 0, 0.35)).lerp(light, (o.tipLight || 0) * t),
    });
  };
  const leanPts = (pts, k = 1) => pts.map((p, i) => {
    const t = i / (pts.length - 1);
    return p.clone().add(V3(blow.x * t * t * k, 0, blow.z * t * t * k));
  });

  // ---- bangs ---------------------------------------------------------------
  if (h.bangs !== 'none') {
    const n = h.bangs === 'short' ? 6 : 7;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5
      const az = u * (h.bangs === 'side' ? 1.5 : 1.9) + (h.bangs === 'side' ? 0.25 : 0);
      const long = (i % 2 === 0 ? 1 : 0.8) * (1 - Math.abs(u) * 0.25);
      const tipEl = h.bangs === 'short' ? 0.42 - long * 0.18 : 0.26 - long * 0.2 + Math.abs(u) * 0.05;
      const tipAz = az * 1.08 + (h.bangs === 'side' ? 0.12 : 0);
      const pts = [sph(capR * 0.98, az * 0.6, 1.15), sph(capR * 1.05, az * 0.85, 0.75), sph(capR * 1.08, az, 0.45 + tipEl * 0.3), sph(capR * 1.09, tipAz, tipEl)];
      add(leanPts(pts, 0.25), (t) => R * 0.23 * (1 - t) ** 0.8 * (1 - 0.3 * t), (t) => R * 0.06 * (1 - t * 0.7), { flut: flutTip * 0.25 });
    }
  }

  // ---- side locks (in front of the ears) ------------------------------------
  if (h.sideLocks !== false && h.style !== 'short' && h.style !== 'elder') {
    for (const sx of [-1, 1]) {
      const low = h.style === 'bob' ? -1.05 : -1.3;
      const pts = [sph(capR, sx * 1.05, 0.55), sph(capR * 1.08, sx * 1.2, 0.05), V3(sx * R * 0.98, -0.6 * R, 0.28 * R), V3(sx * R * 0.9, low * R, 0.3 * R)];
      add(leanPts(pts, 0.6), (t) => R * 0.2 * (1 - t) ** 0.7, (t) => R * 0.07, { flut: flutTip * 0.8 });
    }
  }

  // ---- back / style specific ----------------------------------------------
  const headY = P.cy;
  const toLocalY = (yModel) => yModel - headY;
  switch (h.style) {
    case 'long': {
      const tipY = toLocalY(h.length ?? P.chestY - 0.06);
      const backZ = -(P.torso[5].rz + 0.035) - P.cz; // behind the back
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1); // around the back
        const az = Math.PI + (u - 0.5) * 3.2; // ~ -1.6 .. +1.6 around the back
        const sx = Math.sin(az), cz = Math.cos(az);
        const mid = sph(capR * 1.14, az, -0.2);
        const lowX = sx * (Math.abs(sx) > 0.8 ? 0.13 : 0.1);
        const lowZ = Math.min(backZ + (1 - Math.abs(cz)) * 0.02, cz * 0.1);
        const len = 1 - Math.abs(u - 0.5) * 0.3 + ((i * 7) % 3) * 0.04;
        const pts = [sph(capR * 0.96, az, 0.75), sph(capR * 1.1, az, 0.25), mid, V3(lowX * 0.95, toLocalY(P.shoulderY + 0.02), lowZ * 0.9), V3(lowX, tipY * len + toLocalY(0) * 0, lowZ)];
        add(leanPts(pts), (t) => R * (0.3 + 0.1 * Math.sin(t * Math.PI)) * (1 - ss(t, 0.7, 1)), (t) => R * 0.09, {
          bone: (p, t) => { const k = ss(t, 0.35, 0.75); return [['head', 1 - k], ['chest', k]]; },
          tipLight: 0.08,
        });
      }
      break;
    }
    case 'bob': {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const az = Math.PI + (u - 0.5) * 4.0;
        const pts = [sph(capR * 0.97, az, 0.9), sph(capR * 1.12, az, 0.2), sph(capR * 1.16, az * 0.98 + Math.PI * 0.0, -0.45), sph(capR * 1.02, az, -0.78)];
        add(leanPts(pts, 0.4), (t) => R * 0.34 * (1 - ss(t, 0.75, 1)), (t) => R * 0.085, { flut: flutTip * 0.5 });
      }
      break;
    }
    case 'ponytail':
    case 'lowtail': {
      const low = h.style === 'lowtail';
      // tuck the back into a smooth shell (cap covers) and add the tail on hair1
      const tie = low ? V3(0, -0.55 * R, -0.98 * R) : V3(0, 0.3 * R, -1.02 * R);
      RM.add(torus(R * 0.1, R * 0.035, 6, 12), { m: M(tie.x, P.cy + tie.y, P.cz + tie.z, low ? 0.2 : 1.1), bone: 'head', color: h.tieColor || '#c74b5a' });
      const lenY = toLocalY(h.length ?? (low ? P.chestY - 0.02 : P.chestY + 0.02));
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * 0.28 * R;
        const pts = low
          ? [tie, V3(off * 0.6, tie.y - 0.2 * R, tie.z - 0.1 * R), V3(off, (tie.y + lenY) / 2, tie.z - 0.12 * R), V3(off * 1.2, lenY, tie.z - 0.02 * R)]
          : [tie, V3(off * 0.4, tie.y + 0.05 * R, tie.z - 0.35 * R), V3(off * 0.8, tie.y - 0.5 * R, tie.z - 0.55 * R), V3(off, (tie.y + lenY) * 0.5 - 0.3 * R, tie.z - 0.45 * R), V3(off * 1.1, lenY, tie.z - 0.25 * R)];
        add(leanPts(pts, 0.7), (t) => R * (k === 1 ? 0.22 : 0.15) * Math.sin(Math.min(1, t * 1.2 + 0.15) * Math.PI) ** 0.7, (t) => R * 0.12, {
          bone: (p, t) => { const a = ss(t, 0.02, 0.12), b = ss(t, 0.35, 0.7); return [['head', 1 - a], ['hair1', a * (1 - b)], ['hair2', a * b]]; },
          flut: flutTip * 1.2,
          tipLight: 0.1,
        });
      }
      // a few short nape strands under the cap edge
      for (const sx of [-1, 1]) add([sph(capR, Math.PI + sx * 0.5, -0.3), sph(capR * 1.02, Math.PI + sx * 0.55, -0.6)], (t) => R * 0.15 * (1 - t), () => R * 0.05, { flut: 0.004 });
      break;
    }
    case 'short': {
      // boy's shaggy cut: clumps radiating from the crown
      const n = 16;
      for (let i = 0; i < n; i++) {
        const az = (i / n) * Math.PI * 2 + 0.2;
        const front = Math.cos(az) > 0.3;
        if (front) continue; // bangs handle the front
        const el0 = 1.25, el1 = -0.05 - 0.35 * Math.max(0, -Math.cos(az));
        const pts = [sph(capR * 0.9, az, el0), sph(capR * 1.12, az, 0.55), sph(capR * 1.1, az + 0.12, el1)];
        add(leanPts(pts, 0.3), (t) => R * 0.3 * (1 - t) ** 0.9, (t) => R * 0.1 * (1 - t * 0.5), { flut: 0.006 });
      }
      // crown tufts
      for (let i = 0; i < 3; i++) {
        const az = -0.5 + i * 0.5;
        add([sph(capR * 0.95, az + Math.PI, 1.3), sph(capR * 1.15, az + Math.PI + 0.3, 0.95)], (t) => R * 0.16 * (1 - t), () => R * 0.07, { flut: 0.01 });
      }
      break;
    }
    case 'elder': {
      // soft grey perm + small bun
      for (let i = 0; i < 14; i++) {
        const az = (i / 14) * Math.PI * 2;
        for (const el of [0.2, 0.75]) {
          const c = sph(capR * 1.02, az + el * 0.3, el);
          RM.add(ellipsoid(R * 0.22, R * 0.18, R * 0.22, 8, 6), { m: M(c.x, P.cy + c.y, P.cz + c.z), bone: 'head', color: capColor({ x: 0, y: P.cy + c.y, z: P.cz + c.z }) });
        }
      }
      RM.add(ellipsoid(R * 0.36, R * 0.3, R * 0.3, 10, 8), { m: M(0, P.cy + 0.25 * R, P.cz - 1.05 * R), bone: 'head', color: base });
      break;
    }
    default:
  }
}

/** Hats. kind: 'staffCap' | 'bucket' | 'kinder' | 'flatCap' */
export function buildHat(RM, P, hat, atlasRects) {
  const R = P.R;
  const y0 = P.cy + R * 0.32;
  const col = new THREE.Color(hat.color);
  const add = (g, m, color, o = {}) => RM.add(g, { m, bone: 'head', color, ...o });
  if (hat.kind === 'staffCap') {
    // crown: short cylinder flaring to a flat top, tilted slightly forward
    const crown = new THREE.LatheGeometry([
      new THREE.Vector2(R * 1.1, 0), new THREE.Vector2(R * 1.12, R * 0.3), new THREE.Vector2(R * 1.28, R * 0.62), new THREE.Vector2(R * 1.3, R * 0.68), new THREE.Vector2(R * 1.2, R * 0.74), new THREE.Vector2(0, R * 0.76),
    ], 20);
    crown.deleteAttribute('uv');
    const tilt = -0.12;
    add(crown, M(0, y0, P.cz + 0.004, tilt), col);
    // band + gold cord
    add(new THREE.CylinderGeometry(R * 1.115, R * 1.105, R * 0.2, 20, 1, true).translate(0, R * 0.1, 0), M(0, y0, P.cz + 0.004, tilt), col.clone().multiplyScalar(0.7));
    add(torus(R * 1.125, R * 0.018, 4, 24), M(0, y0 + R * 0.22, P.cz + 0.006, Math.PI / 2 + tilt), '#cdb46e');
    // visor
    const visor = ellipsoid(R * 0.95, R * 0.04, R * 0.62, 16, 4, (p) => { if (p.z < 0) p.z *= 0.2; p.y -= (p.z / R) * 0.12 * R; });
    add(visor, M(0, y0 + R * 0.02, P.cz + R * 0.95, tilt - 0.35), '#1e2230');
    // badge
    const badge = new THREE.CircleGeometry(R * 0.2, 14);
    RM.add(badge, { m: M(0, y0 + R * 0.46, P.cz + R * 1.26, tilt - 0.2), bone: 'head', color: '#ffffff', uv: (p, n, uv) => atlasRects.badge.map(uv[0], uv[1]) });
  } else if (hat.kind === 'bucket' || hat.kind === 'kinder') {
    const k = hat.kind === 'kinder';
    const prof = [
      new THREE.Vector2(R * (k ? 1.65 : 1.6), -R * (k ? 0.12 : 0.28)), new THREE.Vector2(R * 1.52, -R * 0.2), new THREE.Vector2(R * 1.15, R * 0.05), new THREE.Vector2(R * 1.12, R * 0.35),
      new THREE.Vector2(R * 1.05, R * 0.7), new THREE.Vector2(R * 0.8, R * 0.9), new THREE.Vector2(0, R * 0.95),
    ];
    const lathe = new THREE.LatheGeometry(prof, 22);
    lathe.deleteAttribute('uv');
    add(lathe, M(0, y0 - R * 0.12, P.cz - R * 0.02, -0.08), col);
    // underside of the brim
    add(new THREE.LatheGeometry(prof.slice(0, 3).reverse(), 22), M(0, y0 - R * 0.13, P.cz - R * 0.02, -0.08), col.clone().multiplyScalar(0.8));
    // band
    add(new THREE.CylinderGeometry(R * 1.14, R * 1.16, R * 0.16, 22, 1, true).translate(0, R * 0.13, 0), M(0, y0 - R * 0.12, P.cz - R * 0.02, -0.08), hat.band || col.clone().multiplyScalar(0.75));
    if (k) {
      // elastic chin strap
      for (const sx of [-1, 1]) {
        RM.add(strand([V3(sx * R * 1.08, R * 0.1, 0), V3(sx * R * 0.9, -R * 0.7, R * 0.1), V3(sx * R * 0.2, -R * 1.25, R * 0.45)], { width: () => R * 0.03, thick: () => R * 0.012, out: V3(0, 0, 0) }), { m: M(0, P.cy, P.cz), bone: 'head', color: '#f2efe6' });
      }
    }
  } else if (hat.kind === 'flatCap') {
    const cap = ellipsoid(R * 1.15, R * 0.42, R * 1.22, 16, 10, (p) => { if (p.y < 0) p.y *= 0.3; if (p.z > 0) p.y -= p.z * 0.2; });
    add(cap, M(0, y0 + R * 0.12, P.cz + R * 0.05, -0.1), col);
    const visor = ellipsoid(R * 0.8, R * 0.05, R * 0.45, 12, 4, (p) => { if (p.z < 0) p.z *= 0.1; });
    add(visor, M(0, y0 + R * 0.02, P.cz + R * 1.0, -0.3), col.clone().multiplyScalar(0.85));
  }
}
