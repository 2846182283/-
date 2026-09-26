/**
 * Reusable shop parts, emitted into the shops Batcher in lot-local space.
 *
 * Every function takes the per-lot build context `S`:
 *   S.B      Batcher (base transform = lot frame; front faces +Z)
 *   S.A      Atlas (cells by name)
 *   S.gy     (lx, lz) -> local height of the paved apron at a lot-local point
 *   S.rng    deterministic RNG for this lot
 *
 * Kinds: 'solid' (outlined, casts), 'deco' (decals / small bits), 'plaster',
 * 'wood', 'rows' (repeating surfaces), 'lit' (unlit glow), 'glass', 'cloth'
 * (swaying fabric), 'cut' (alpha cards), 'inner' (warm-lit interior).
 */
import * as THREE from 'three';
import { PALETTE as P } from '../../core/palette.js';

export const C = {
  frameDark: '#4a3a30',
  frameWood: '#6a4e3a',
  alu: '#c9ccd0',
  aluDark: '#8e949a',
  concrete: '#c4c1ba',
  concreteDark: '#a9a59e',
  black: '#34343a',
  white: '#f6f4ee',
  metal: '#9aa1a8',
  bulb: '#fff1c8',
  bulbWarm: '#ffd89a',
};

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

/** Decal / poster quad slightly in front of a +Z facing surface at z. */
export function poster(S, x, y, z, w, h, rect, o = {}) {
  S.B.quad(o.kind || 'deco', x, y, z + (o.off ?? 0.012), w, h, o.color || '#ffffff', rect, { ry: o.ry || 0, rx: o.rx || 0, rz: o.rz || 0 });
}

/** Rectangular frame (4 bars) in the XY plane at z, outer size w x h centred at (x, y). */
export function rectFrame(S, kind, x, y, z, w, h, bar, depth, color) {
  const B = S.B;
  B.boxC(kind, x, y + h / 2 - bar / 2, z, w, bar, depth, color);
  B.boxC(kind, x, y - h / 2 + bar / 2, z, w, bar, depth, color);
  B.boxC(kind, x - w / 2 + bar / 2, y, z, bar, h - bar * 2, depth, color);
  B.boxC(kind, x + w / 2 - bar / 2, y, z, bar, h - bar * 2, depth, color);
}

// ---------------------------------------------------------------------------
// doors & windows
// ---------------------------------------------------------------------------

/**
 * Glass sliding doors (引き戸) filling an opening x0..x1, y0..y1 at plane z.
 * o.panels (2|4), o.frame colour, o.kick (solid lower panel height),
 * o.bars (horizontal muntins per panel), o.koshi (vertical lattice count on the
 * upper part), o.open (0..1 how far the first panel is slid open).
 */
export function slidingDoors(S, x0, x1, y0, y1, z, o = {}) {
  const B = S.B;
  const n = o.panels || 2;
  const fc = o.frame || C.frameDark;
  const kind = o.kind || 'solid';
  const bar = o.bar || 0.05;
  const w = (x1 - x0) / n;
  const h = y1 - y0;
  // track + head
  B.box(kind, x0, y0 - 0.02, z - 0.08, x1, y0 + 0.015, z + 0.04, C.aluDark);
  B.box(kind, x0, y1 - 0.02, z - 0.08, x1, y1 + 0.05, z + 0.04, fc);
  for (let i = 0; i < n; i++) {
    // alternate panels sit on two tracks
    const zz = z + (i % 2 ? -0.045 : 0);
    let px = x0 + w * (i + 0.5);
    if (i === 0 && o.open) px += w * o.open * 0.95;
    const pw = w + 0.02;
    rectFrame(S, kind, px, y0 + h / 2, zz, pw, h, bar, 0.035, fc);
    let gy0 = y0 + bar;
    if (o.kick) {
      B.box(o.kickKind || kind, px - pw / 2 + bar, y0 + bar, zz - 0.012, px + pw / 2 - bar, y0 + o.kick, zz + 0.012, o.kickColor || fc);
      B.boxC(kind, px, y0 + o.kick, zz, pw - bar * 2, bar * 0.7, 0.035, fc);
      gy0 = y0 + o.kick;
    }
    const gy1 = y1 - bar;
    B.quad('glass', px, (gy0 + gy1) / 2, zz, pw - bar * 2, gy1 - gy0, '#ffffff');
    const nb = o.bars ?? 0;
    for (let k = 1; k <= nb; k++) B.boxC(kind, px, gy0 + ((gy1 - gy0) * k) / (nb + 1), zz, pw - bar * 2, 0.022, 0.03, fc);
    if (o.koshi) {
      const top = gy0 + (gy1 - gy0) * (o.koshiFrom ?? 0);
      for (let k = 1; k <= o.koshi; k++) {
        const lx = px - pw / 2 + bar + ((pw - bar * 2) * k) / (o.koshi + 1);
        B.box(kind, lx - 0.011, top, zz - 0.015, lx + 0.011, gy1, zz + 0.015, fc);
      }
    }
    // pull
    if (o.handle !== false) B.boxC(kind, px + (i % 2 ? -1 : 1) * (pw / 2 - bar - 0.04), y0 + h * 0.48, zz + 0.022, 0.025, 0.16, 0.01, C.aluDark);
  }
}

/**
 * Residential aluminium sliding window with curtains behind.
 * (x, y) = centre, z = outer wall face.  o.curtain index, o.rail (balcony-style
 * bars), o.box (flower box), o.shutterBox, o.frame colour, o.sill.
 */
export function houseWindow(S, x, y, z, w, h, o = {}) {
  const B = S.B, A = S.A;
  const fc = o.frame || C.alu;
  const inset = o.inset ?? 0.08;
  const zg = z - inset;
  // reveal lining + sill
  rectFrame(S, 'solid', x, y, zg, w, h, 0.045, 0.06, fc);
  B.boxC('solid', x, y, zg, 0.04, h - 0.08, 0.05, fc);
  B.box('solid', x - w / 2 - 0.05, y - h / 2 - 0.05, z - 0.02, x + w / 2 + 0.05, y - h / 2, z + 0.06, o.sill || C.aluDark);
  B.quad('glass', x - w / 4 + 0.01, y, zg + 0.012, w / 2 - 0.06, h - 0.09, '#ffffff');
  B.quad('glass', x + w / 4 - 0.01, y, zg - 0.012, w / 2 - 0.06, h - 0.09, '#ffffff');
  // curtains / room (o.plain: clear window onto a modelled interior)
  if (!o.plain) S.B.quad('inner', x, y, zg - 0.08, w - 0.06, h - 0.06, '#ffffff', A.get(`curtain${(o.curtain ?? 0) % 4}`));
  if (o.shutterBox) B.box('solid', x - w / 2 - 0.06, y + h / 2, zg - 0.05, x + w / 2 + 0.06, y + h / 2 + 0.2, z + 0.12, o.shutterCol || '#d8d8d2');
  if (o.rail) {
    // 面格子 / fall-guard bars
    const rz = z + 0.1;
    B.box('solid', x - w / 2, y - h / 2 + 0.3, rz - 0.02, x + w / 2, y - h / 2 + 0.34, rz + 0.02, fc);
    B.box('solid', x - w / 2, y - h / 2 + 0.72, rz - 0.02, x + w / 2, y - h / 2 + 0.76, rz + 0.02, fc);
    for (let k = 0; k <= 8; k++) {
      const bx = x - w / 2 + (w * k) / 8;
      B.box('deco', bx - 0.01, y - h / 2 + 0.3, rz - 0.01, bx + 0.01, y - h / 2 + 0.76, rz + 0.01, fc);
    }
    for (const sx of [-1, 1]) B.box('solid', x + (sx * w) / 2 - 0.02, y - h / 2 + 0.3, z, x + (sx * w) / 2 + 0.02, y - h / 2 + 0.76, rz, fc);
  }
  if (o.box) flowerBox(S, x, y - h / 2 - 0.05, z + 0.02, w * 0.8, o.boxCol);
}

/** Window flower box with blooms (on a bracket). */
export function flowerBox(S, x, y, z, w, col = '#8a6446') {
  const B = S.B, rng = S.rng;
  B.box('solid', x - w / 2, y - 0.2, z, x + w / 2, y - 0.02, z + 0.2, col);
  B.box('solid', x - w / 2 + 0.02, y - 0.05, z + 0.02, x + w / 2 - 0.02, y - 0.02, z + 0.18, '#6a5040');
  const cols = ['#f59ab4', '#fbf2f4', '#f4c93a', '#e86a5a', '#c8a8e0'];
  const n = Math.round(w * 9);
  for (let i = 0; i < n; i++) {
    const bx = x - w / 2 + 0.06 + (w - 0.12) * (i / Math.max(1, n - 1));
    B.sphere('solid', bx, y + 0.03 + rng() * 0.04, z + 0.07 + rng() * 0.07, 0.06 + rng() * 0.02, '#7fae62', { w: 7, h: 5 });
    if (rng() < 0.75) B.sphere('deco', bx + (rng() - 0.5) * 0.05, y + 0.1 + rng() * 0.05, z + 0.08 + rng() * 0.06, 0.035, cols[Math.floor(rng() * cols.length)], { ico: 0 });
  }
}

// ---------------------------------------------------------------------------
// fabric: awnings, noren, flags
// ---------------------------------------------------------------------------

/**
 * Sloped fabric awning from the wall (z0, y0) out to (z0 + depth, y0 - drop),
 * spanning x0..x1.  o.stripes [c1, c2] (stripe width o.sw), o.color (solid),
 * o.valance (atlas rect for a scalloped 'cut' valance), o.valH, o.arms.
 */
export function awning(S, x0, x1, y0, z0, depth, drop, o = {}) {
  const B = S.B;
  const y1 = y0 - drop, z1 = z0 + depth;
  const slope = Math.atan2(drop, depth);
  const len = Math.hypot(depth, drop);
  const w = x1 - x0;
  // the fabric: strips across the width, slight sag via 2 segments
  const cols = o.stripes || [o.color, o.color];
  const sw = o.sw || 0.3;
  const n = Math.max(1, Math.round(w / sw));
  const sag = o.sag ?? 0.04;
  const zm = z0 + depth * 0.55, ym = y0 - drop * 0.55 - sag;
  for (let i = 0; i < n; i++) {
    const a = x0 + (w * i) / n, b = x0 + (w * (i + 1)) / n;
    const col = cols[i % cols.length];
    B.poly('cloth', [[a, ym, zm], [b, ym, zm], [b, y0, z0], [a, y0, z0]], col);
    B.poly('cloth', [[a, y1, z1], [b, y1, z1], [b, ym, zm], [a, ym, zm]], col);
  }
  // side cheeks (triangles) for closed awnings
  if (o.cheeks !== false) {
    for (const sx of [x0, x1]) {
      B.poly('cloth', [[sx, y0, z0], [sx, y1, z1], [sx, y1 - (o.valH || 0.22), z1], [sx, y0 - 0.02, z0 + 0.02]].map((p) => p), cols[0]);
    }
  }
  // valance
  const vh = o.valH || 0.22;
  if (o.valance) {
    B.sway = 0.25;
    const nv = Math.max(1, Math.round(w / 1.6));
    for (let i = 0; i < nv; i++) {
      const a = x0 + (w * i) / nv, b = x0 + (w * (i + 1)) / nv;
      B.quad('cut', (a + b) / 2, y1 - vh / 2, z1 + 0.005, b - a, vh, '#ffffff', o.valance, { back: true });
    }
    B.sway = 0;
  } else {
    for (let i = 0; i < n; i++) {
      const a = x0 + (w * i) / n, b = x0 + (w * (i + 1)) / n;
      B.poly('cloth', [[a, y1 - vh, z1], [b, y1 - vh, z1], [b, y1, z1], [a, y1, z1]], cols[i % cols.length]);
    }
  }
  // frame: wall bar + front bar + arms
  B.box('solid', x0 - 0.02, y0 - 0.03, z0, x1 + 0.02, y0 + 0.03, z0 + 0.05, o.frame || C.aluDark);
  B.beam('solid', [x0, y1 - 0.02, z1 - 0.02], [x1, y1 - 0.02, z1 - 0.02], 0.035, 0.035, o.frame || C.aluDark);
  const arms = o.arms ?? 2;
  for (let i = 0; i < arms; i++) {
    const ax = arms === 1 ? (x0 + x1) / 2 : x0 + 0.1 + ((w - 0.2) * i) / (arms - 1);
    B.beam('solid', [ax, y0 - 0.5, z0 + 0.02], [ax, y1 + 0.02, z1 - 0.06], 0.025, 0.025, o.frame || C.aluDark);
  }
  return { y1: y1 - vh, z1, slope, len };
}

/**
 * Noren curtain: `panels` cloth strips hanging from a rod at yTop, centred at x,
 * in front of a +Z facing opening at z.  rect spans the whole curtain.
 */
export function noren(S, x, yTop, z, w, h, rect, panels = 3, o = {}) {
  const B = S.B;
  const gap = o.gap ?? 0.015;
  const pw = (w - gap * (panels - 1)) / panels;
  // rod + brackets
  B.cyl('solid', x - w / 2 - 0.12, yTop + 0.03, z, 0.018, w + 0.24, o.rodCol || '#6a4e3a', { rz: -Math.PI / 2, seg: 6 });
  for (const sx of [-1, 1]) B.box('solid', x + sx * (w / 2 + 0.08) - 0.015, yTop + 0.02, z - 0.1, x + sx * (w / 2 + 0.08) + 0.015, yTop + 0.06, z + 0.02, '#4a3a30');
  // hood (the part above the slits is continuous: top 22%)
  const top = o.top ?? 0.22;
  B.swayFn = (lx, ly) => Math.max(0, (yTop - ly) / h) * (o.sway ?? 1);
  const col = o.color || '#ffffff';
  const Rsub = (u0, u1, v0, v1) => ({
    u0: rect.u0 + (rect.u1 - rect.u0) * u0, u1: rect.u0 + (rect.u1 - rect.u0) * u1,
    v0: rect.v0 + (rect.v1 - rect.v0) * v0, v1: rect.v0 + (rect.v1 - rect.v0) * v1,
  });
  const segs = 3;
  for (let i = 0; i < panels; i++) {
    const a = x - w / 2 + i * (pw + gap), b = a + pw;
    const ua = (a - (x - w / 2)) / w, ub = (b - (x - w / 2)) / w;
    // subdivide vertically so the lower part swings more than the top
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const ya = yTop - h * t0, yb = yTop - h * t1;
      const r = Rsub(ua, ub, 1 - t1, 1 - t0);
      B.poly('cloth', [[a, yb, z], [b, yb, z], [b, ya, z], [a, ya, z]], col,
        [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]], [0, 0, 1]);
    }
  }
  // fill the slits in the top band (continuous cloth)
  for (let i = 0; i < panels - 1; i++) {
    const a = x - w / 2 + (i + 1) * pw + i * gap, b = a + gap;
    const ua = (a - (x - w / 2)) / w, ub = (b - (x - w / 2)) / w;
    const r = Rsub(ua, ub, 1 - top, 1);
    B.poly('cloth', [[a, yTop - h * top, z], [b, yTop - h * top, z], [b, yTop, z], [a, yTop, z]], col,
      [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]], [0, 0, 1]);
  }
  B.swayFn = null;
}

/**
 * のぼり flag: pole standing at (x, y, z) with a vertical cloth banner.
 * ry turns the banner (0 = banner faces +Z).
 */
export function nobori(S, x, y, z, rect, o = {}) {
  const B = S.B;
  const h = o.h || 1.8, w = o.w || 0.45, pole = h + 0.35;
  B.pushT(x, y, z, o.ry || 0);
  // weighted base + pole + top arm
  B.cyl('solid', 0, 0, 0, 0.14, 0.1, '#3a3a40', { seg: 10 });
  B.cyl('solid', 0, 0, 0, 0.016, pole, '#e8e8e4', { seg: 6 });
  B.cyl('solid', 0, pole - 0.06, 0, 0.012, w + 0.04, '#e8e8e4', { rz: -Math.PI / 2, seg: 5 });
  const yTop = pole - 0.08;
  B.swayFn = (lx, ly) => (0.3 + 0.7 * (lx / w)) * (0.6 + 0.4 * (yTop - ly) / h);
  B.quad('cloth', w / 2 + 0.02, yTop - h / 2, 0, w, h, '#ffffff', rect, { back: true });
  B.swayFn = null;
  B.pop();
}

/**
 * Paper lantern (chochin): lathe body wrapped with rect, dark caps, hanging
 * from (x, yTop, z).  o.lit -> glowing (unlit) body.
 */
export function lantern(S, x, yTop, z, r, h, rect, o = {}) {
  const B = S.B;
  const key = `lantern|${o.shape || 'barrel'}`;
  const g = B._cached(key, () => {
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const rr = o.shape === 'round' ? 0.62 + 0.38 * Math.sin(t * Math.PI) : 0.72 + 0.28 * Math.sin(t * Math.PI);
      pts.push(new THREE.Vector2(rr, t - 0.5));
    }
    return new THREE.LatheGeometry(pts, 14);
  });
  const cy = yTop - 0.08 - h / 2;
  B.geo(o.lit ? 'lit' : 'solid', g, o.color || '#ffffff', { rect, m: new THREE.Matrix4().compose(new THREE.Vector3(x, cy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (o.ry || 0) + Math.PI / 2, 0)), new THREE.Vector3(r, h, r)) });
  const capR = r * (o.shape === 'round' ? 0.62 : 0.72);
  B.cyl('solid', x, cy + h / 2 - 0.02, z, capR * 1.02, 0.05, '#2a2020', { seg: 12 });
  B.cyl('solid', x, cy - h / 2 - 0.03, z, capR * 1.02, 0.05, '#2a2020', { seg: 12 });
  B.cyl('solid', x, cy + h / 2 + 0.03, z, 0.012, 0.1, '#2a2020', { seg: 4 });
}

// ---------------------------------------------------------------------------
// lamps
// ---------------------------------------------------------------------------

/** Pendant lamp hanging from the ceiling at yCeil (cord + shade + glowing bulb). */
export function pendant(S, x, yCeil, z, drop, o = {}) {
  const B = S.B;
  const yl = yCeil - drop;
  B.box('deco', x - 0.006, yl + 0.1, z - 0.006, x + 0.006, yCeil, z + 0.006, '#2a2a2a');
  const style = o.style || 'dome';
  if (style === 'dome') {
    B.sphere('solid', x, yl + 0.02, z, 0.16, o.shade || '#3f5a4a', { half: true, w: 12, h: 4, sy: 0.7 });
    B.sphere('lit', x, yl, z, 0.07, C.bulb, { ico: 1 });
  } else if (style === 'cone') {
    B.cyl('solid', x, yl - 0.02, z, 0.03, 0.18, o.shade || '#e8e0cc', { rb: 0.14, seg: 10 });
    B.sphere('lit', x, yl - 0.02, z, 0.06, C.bulb, { ico: 1 });
  } else {
    // bare warm bulb in a glass globe
    B.sphere('lit', x, yl, z, 0.085, C.bulbWarm, { ico: 1 });
  }
}

/** Ceiling light panel (lit rectangle facing down). */
export function ceilingLight(S, x, y, z, w, d, col = '#fbfaf2') {
  S.B.box('lit', x - w / 2, y - 0.03, z - d / 2, x + w / 2, y, z + d / 2, col, { skip: 'Y' });
}

// ---------------------------------------------------------------------------
// furniture & goods
// ---------------------------------------------------------------------------

/** Round café table (bistro): x,y (floor),z. */
export function roundTable(S, x, y, z, o = {}) {
  const B = S.B;
  const top = o.h || 0.72, r = o.r || 0.32;
  const kind = o.kind || 'solid';
  B.cyl(kind, x, y, z, 0.2, 0.03, o.base || '#3a3a40', { seg: 10 });
  B.cyl(kind, x, y, z, 0.025, top - 0.03, o.base || '#3a3a40', { seg: 6 });
  B.cyl(kind, x, y + top - 0.03, z, r, 0.03, o.top || '#f2ede2', { seg: 16 });
}

/** Metal bistro chair facing direction ry (seat front = +Z after ry). */
export function bistroChair(S, x, y, z, ry, o = {}) {
  const B = S.B;
  const kind = o.kind || 'solid';
  const col = o.color || '#3f5a4a';
  B.pushT(x, y, z, ry);
  const sh = 0.45;
  for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) B.beam(kind, [lx * 1.1, 0, lz * 1.1], [lx, sh, lz], 0.022, 0.022, col);
  B.cyl(kind, 0, sh, 0, 0.21, 0.035, o.seat || col, { seg: 12 });
  // back
  B.beam(kind, [-0.17, sh, -0.17], [-0.16, sh + 0.42, -0.2], 0.022, 0.022, col);
  B.beam(kind, [0.17, sh, -0.17], [0.16, sh + 0.42, -0.2], 0.022, 0.022, col);
  B.beam(kind, [-0.16, sh + 0.4, -0.2], [0.16, sh + 0.4, -0.2], 0.03, 0.06, col);
  B.beam(kind, [-0.16, sh + 0.24, -0.19], [0.16, sh + 0.24, -0.19], 0.02, 0.02, col);
  B.pop();
}

/** Wooden chair (interiors). */
export function woodChair(S, x, y, z, ry, col = '#7a5a40', kind = 'inner') {
  const B = S.B;
  B.pushT(x, y, z, ry);
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) B.box(kind, lx - 0.02, 0, lz - 0.02, lx + 0.02, 0.44, lz + 0.02, col);
  B.box(kind, -0.21, 0.42, -0.21, 0.21, 0.47, 0.21, col);
  B.box(kind, -0.21, 0.47, -0.21, 0.21, 0.9, -0.17, col);
  B.pop();
}

/** Simple table (rectangular) with 4 legs. */
export function table(S, x, y, z, w, d, h, col, kind = 'inner', ry = 0) {
  const B = S.B;
  B.pushT(x, y, z, ry);
  B.box(kind, -w / 2, h - 0.04, -d / 2, w / 2, h, d / 2, col);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(kind, sx * (w / 2 - 0.05) - 0.025, 0, sz * (d / 2 - 0.05) - 0.025, sx * (w / 2 - 0.05) + 0.025, h - 0.04, sz * (d / 2 - 0.05) + 0.025, col);
  B.pop();
}

/**
 * Shelf unit whose front face shows goods (atlas rect), standing on y,
 * back against z (front at z + d).  o.kind default 'inner'.
 */
export function shelf(S, x, y, z, w, h, d, rect, o = {}) {
  const B = S.B;
  const kind = o.kind || 'inner';
  const col = o.color || '#e6e2da';
  // carcass: sides, top, back
  B.box(kind, x - w / 2, y, z, x - w / 2 + 0.03, y + h, z + d, col);
  B.box(kind, x + w / 2 - 0.03, y, z, x + w / 2, y + h, z + d, col);
  B.box(kind, x - w / 2, y + h - 0.03, z, x + w / 2, y + h, z + d, col);
  B.box(kind, x - w / 2, y, z, x + w / 2, y + 0.1, z + d, o.base || col);
  // goods plane, set back a little
  B.quad(kind, x, y + 0.1 + (h - 0.13) / 2, z + d * 0.55, w - 0.06, h - 0.13, '#ffffff', rect);
  if (o.topper) B.quad(o.topperKind || 'lit', x, y + h + 0.12, z + d, w * 0.9, 0.2, '#ffffff', o.topper);
}

/** Gondola (double-sided island shelf) running along local z, centred at (x, z). */
export function gondola(S, x, y, z, len, h, rectA, rectB, o = {}) {
  const B = S.B;
  const kind = o.kind || 'inner';
  const d = 0.9;
  B.box(kind, x - d / 2, y, z - len / 2, x + d / 2, y + 0.1, z + len / 2, '#e2e2dc');
  B.box(kind, x - 0.03, y, z - len / 2, x + 0.03, y + h, z + len / 2, '#eeeeea');
  B.box(kind, x - d / 2, y, z + len / 2 - 0.03, x + d / 2, y + h, z + len / 2, o.endColor || '#f2f2ee', { rect: o.endRect, face: 'Z' });
  B.box(kind, x - d / 2, y, z - len / 2, x + d / 2, y + h, z - len / 2 + 0.03, '#f2f2ee');
  B.quad(kind, x + 0.2, y + 0.1 + (h - 0.12) / 2, z, len - 0.08, h - 0.12, '#ffffff', rectA, { ry: Math.PI / 2 });
  B.quad(kind, x - 0.2, y + 0.1 + (h - 0.12) / 2, z, len - 0.08, h - 0.12, '#ffffff', rectB, { ry: -Math.PI / 2 });
  // shelf lips
  for (let k = 1; k <= 3; k++) {
    const yy = y + 0.1 + ((h - 0.12) * k) / 4;
    for (const sx of [-1, 1]) B.box(kind, x + sx * d / 2 - (sx > 0 ? 0.25 : 0), yy - 0.015, z - len / 2 + 0.04, x + sx * d / 2 + (sx > 0 ? 0 : 0.25), yy + 0.015, z + len / 2 - 0.04, '#dcdcd6');
  }
}

/** Potted plant: pot + foliage blob cluster (o.flowers colour list). */
export function pottedPlant(S, x, y, z, s = 1, o = {}) {
  const B = S.B, rng = S.rng;
  const kind = o.kind || 'solid';
  const pr = 0.13 * s, ph = 0.22 * s;
  B.cyl(kind, x, y, z, pr, ph, o.pot || '#b86f4f', { rb: pr * 0.78, seg: 10 });
  B.cyl(kind, x, y + ph - 0.03 * s, z, pr * 1.08, 0.04 * s, o.pot || '#b86f4f', { seg: 10 });
  const green = o.green || '#6f9e58';
  const n = o.blobs || 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng();
    const rr = 0.08 * s + rng() * 0.05 * s;
    B.sphere(kind, x + Math.cos(a) * 0.07 * s, y + ph + 0.1 * s + rng() * 0.12 * s * (o.tall || 1), z + Math.sin(a) * 0.07 * s, rr, i % 2 ? green : shadeHex(green, -0.06), { w: 9, h: 6, sy: o.tall || 1 });
  }
  if (o.flowers) {
    for (let i = 0; i < (o.nf || 6); i++) {
      const a = rng() * Math.PI * 2, rr = rng() * 0.12 * s;
      B.sphere('deco', x + Math.cos(a) * rr, y + ph + 0.16 * s + rng() * 0.1 * s, z + Math.sin(a) * rr, 0.035 * s, o.flowers[i % o.flowers.length], { ico: 0 });
    }
  }
}

/** Plastic beverage crate (open top) with atlas side texture. */
export function crate(S, x, y, z, w, h, d, col, o = {}) {
  const B = S.B, A = S.A;
  const r = A.get('zCrate');
  B.box('solid', x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, col, { skip: 'Y', rects: { Z: r, z: r, X: r, x: r } });
  B.box('deco', x - w / 2 + 0.02, y + h - 0.02, z - d / 2 + 0.02, x + w / 2 - 0.02, y + h - 0.015, z + d / 2 - 0.02, shadeHex(col, -0.2), { skip: 'y' });
  if (o.bottles) {
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
      B.cyl('deco', x - w / 2 + w * (i + 0.5) / 4, y + 0.02, z - d / 2 + d * (k + 0.5) / 3, 0.028, h + 0.08, o.bottles, { seg: 5 });
    }
  }
}

/** Galvanised bucket (tapered, open) with optional stems of flowers (cards). */
export function bucket(S, x, y, z, r, h, col = '#b9c0c6') {
  const B = S.B;
  B.cyl('solid', x, y, z, r, h, col, { rb: r * 0.8, seg: 12, open: true });
  B.cyl('solid', x, y, z, r * 0.8, 0.01, col, { seg: 12 });
  B.cyl('deco', x, y + h - 0.02, z, r * 1.03, 0.025, shadeHex(col, -0.08), { seg: 12 });
  B.cyl('deco', x, y + h * 0.35, z, r * 0.92, 0.02, shadeHex(col, -0.08), { seg: 12 });
}

/** Flower bunch: crossed alpha cards (cell i of fCards) standing at (x, y, z). */
export function flowerCards(S, x, y, z, h, cell, o = {}) {
  const B = S.B, A = S.A;
  const r = A.cell('fCards', cell, 8, 1);
  const w = h * 0.5 * (o.wide || 1);
  const rot = o.ry ?? S.rng() * Math.PI;
  B.swayFn = (lx, ly) => Math.max(0, (ly + h / 2) / h) * 0.35; // quad frame is centred
  for (let k = 0; k < (o.n || 2); k++) B.quad('cut', x, y + h / 2, z, w, h, '#ffffff', r, { ry: rot + (k * Math.PI) / (o.n || 2) });
  B.swayFn = null;
}

/** Cluster of round blooms (roses, hydrangea, pansies) as small spheres. */
export function bloomCluster(S, x, y, z, rad, n, cols, size = 0.045, o = {}) {
  const B = S.B, rng = S.rng;
  if (o.leaves !== false) B.sphere('solid', x, y - size, z, rad * 0.95, o.leafCol || '#6f9e58', { w: 9, h: 6, sy: 0.6 });
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * rad;
    B.sphere(o.kind || 'solid', x + Math.cos(a) * rr, y + rng() * size * 1.5, z + Math.sin(a) * rr, size * (0.8 + rng() * 0.4), cols[Math.floor(rng() * cols.length)], { ico: 0 });
  }
}

/** A-frame chalkboard standing at (x, y, z), front facing ry. */
export function aFrame(S, x, y, z, ry, rectFront, rectBack, o = {}) {
  const B = S.B;
  const h = o.h || 1.0, w = o.w || 0.55, spread = 0.2;
  const tilt = Math.atan2(spread, h);
  B.pushT(x, y, z, ry);
  for (const side of [1, -1]) {
    B.pushT(0, 0, side * spread, side > 0 ? 0 : Math.PI, -tilt, 0);
    B.box('solid', -w / 2, 0, -0.012, w / 2, h, 0.012, '#8a6446', { rect: side > 0 ? rectFront : rectBack, face: 'Z' });
    B.pop();
  }
  B.beam('deco', [0, h * 0.35, spread * 0.62], [0, h * 0.35, -spread * 0.62], 0.01, 0.01, '#444');
  B.pop();
}

/** Outdoor air-conditioner unit (室外機) with pipe cover, sitting on y. */
export function acUnit(S, x, y, z, ry = 0, o = {}) {
  const B = S.B, A = S.A;
  B.pushT(x, y, z, ry);
  B.box('solid', -0.4, 0.05, -0.14, 0.4, 0.6, 0.14, '#ecebe6', { rect: A.get('ac'), face: 'Z' });
  B.box('solid', -0.36, 0, -0.12, -0.3, 0.05, 0.12, '#8e949a');
  B.box('solid', 0.3, 0, -0.12, 0.36, 0.05, 0.12, '#8e949a');
  // pipe cover up the wall
  if (o.pipe !== false) B.box('solid', 0.28, 0.3, -0.2, 0.38, o.pipeH || 1.6, -0.12, '#e6e4dc');
  B.pop();
}

/** Downpipe from (x, y1) to the ground y0 at wall plane z (+Z facing wall). */
export function downpipe(S, x, y0, y1, z, col = '#8e949a') {
  const B = S.B;
  B.cyl('solid', x, y0, z + 0.07, 0.035, y1 - y0, col, { seg: 6 });
  for (let yy = y0 + 0.8; yy < y1 - 0.2; yy += 1.4) B.box('deco', x - 0.05, yy, z, x + 0.05, yy + 0.03, z + 0.07, col);
  B.box('solid', x - 0.05, y0, z + 0.03, x + 0.05, y0 + 0.05, z + 0.16, col);
}

/** Maneki-neko figurine (sitting, one paw raised). Scale s: 1 = 0.3 m tall. */
export function manekiNeko(S, x, y, z, ry, s = 1) {
  const B = S.B, A = S.A;
  B.pushT(x, y, z, ry, 0, 0, s);
  B.sphere('solid', 0, 0.1, 0, 0.1, '#fbf8f2', { w: 10, h: 8, sy: 1.05 });
  B.sphere('solid', 0, 0.23, 0.005, 0.085, '#fbf8f2', { w: 10, h: 8 });
  B.quad('deco', 0, 0.225, 0.087, 0.12, 0.12, '#ffffff', A.get('wNeko'));
  for (const sx of [-1, 1]) B.sphere('solid', sx * 0.055, 0.31, 0, 0.03, '#fbf8f2', { ico: 0, sy: 1.3 });
  B.cyl('solid', 0, 0.15, 0, 0.07, 0.025, '#d8433d', { seg: 10 }); // collar
  B.sphere('solid', 0, 0.145, 0.07, 0.022, '#f2c230', { ico: 0 }); // bell
  B.sphere('solid', 0.085, 0.3, 0.02, 0.03, '#fbf8f2', { ico: 0, sy: 1.6 }); // raised paw
  B.box('solid', -0.06, 0.02, 0.06, 0.06, 0.1, 0.1, '#d8433d'); // koban
  B.pop();
}

/** Mamachari-style bicycle standing on y at (x, z), heading ry (front = +Z). */
export function bicycle(S, x, y, z, ry, col = '#6fa0c8', o = {}) {
  const B = S.B;
  const R = 0.33;
  const wheel = B._cached('bikeWheel', () => new THREE.TorusGeometry(R, 0.022, 4, 18));
  const kind = o.kind || 'solid';
  B.pushT(x, y, z, ry);
  const wf = 0.52, wb = -0.52;
  for (const wz of [wf, wb]) {
    B.geo(kind, wheel, '#2e2e32', { m: new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(0, R + 0.02, wz) });
    B.geo('deco', wheel, '#c9ccd0', { m: new THREE.Matrix4().makeRotationY(Math.PI / 2).multiply(new THREE.Matrix4().makeScale(0.88, 0.88, 0.5)).setPosition(0, R + 0.02, wz) });
    B.cyl('deco', -0.03, R + 0.02, wz, 0.03, 0.06, '#c9ccd0', { rz: -Math.PI / 2, seg: 6 }); // hub
    // spokes (a few)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      B.beam('deco', [0, R + 0.02 + Math.sin(a) * R * 0.85, wz + Math.cos(a) * R * 0.85], [0, R + 0.02 - Math.sin(a) * R * 0.85, wz - Math.cos(a) * R * 0.85], 0.004, 0.004, '#c9ccd0');
    }
  }
  const hy = R + 0.02;
  const bb = [0, hy - 0.02, -0.02]; // bottom bracket
  const seat = [0, 0.88, -0.2];
  const head = [0, 0.82, 0.36];
  // step-through frame (mamachari): down tube curves low
  B.tube(kind, [head, [0, 0.55, 0.26], [0, 0.36, 0.08], bb], 0.022, col);
  B.tube(kind, [bb, seat], 0.02, col);
  B.tube(kind, [bb, [0, hy, wb]], 0.014, col);
  B.tube(kind, [seat.map((v, i) => (i === 1 ? v - 0.08 : v)), [0, hy, wb]], 0.014, col);
  B.tube(kind, [head, [0, hy, wf]], 0.018, '#c9ccd0');
  // handlebar + grips
  B.tube(kind, [[-0.26, 0.98, 0.26], [-0.1, 1.0, 0.36], [0.1, 1.0, 0.36], [0.26, 0.98, 0.26]], 0.014, '#c9ccd0');
  B.tube(kind, [head, [0, 1.0, 0.36]], 0.016, '#c9ccd0');
  // saddle
  B.boxC(kind, 0, 0.9, -0.21, 0.16, 0.06, 0.26, '#3a3030');
  // fenders
  for (const wz of [wf, wb]) B.box(kind, -0.04, hy + R + 0.04, wz - 0.28, 0.04, hy + R + 0.06, wz + 0.28, o.fender || '#d8dadc');
  // front basket + rear carrier
  if (o.basket !== false) {
    B.box(kind, -0.18, 0.78, 0.44, 0.18, 1.02, 0.74, '#c9ccd0', { skip: 'Y' });
    B.box('deco', -0.17, 0.8, 0.45, 0.17, 0.81, 0.73, '#8e949a');
  }
  B.box(kind, -0.12, 0.8, -0.72, 0.12, 0.82, -0.36, '#c9ccd0');
  // kickstand (rear, down)
  B.box(kind, -0.18, 0, -0.62, 0.18, 0.03, -0.58, '#8e949a');
  // pedals / chain guard
  B.box(kind, 0.05, hy - 0.1, -0.35, 0.07, hy + 0.08, 0.05, col);
  B.pop();
}

/** Capsule-toy (gachapon) machine at (x, y, z) facing +Z after ry; front picture rect. */
export function gachapon(S, x, y, z, ry, rect, capsuleCols) {
  const B = S.B, rng = S.rng;
  B.pushT(x, y, z, ry);
  const w = 0.42, d = 0.4;
  // body
  B.box('solid', -w / 2, 0, -d / 2, w / 2, 0.62, d / 2, '#f4f4f0', { rect, face: 'Z' });
  // coin mechanism: dial + slot
  B.cyl('solid', 0, 0.3, d / 2, 0.07, 0.03, '#c9ccd0', { rx: Math.PI / 2, seg: 12 });
  B.boxC('solid', 0, 0.3, d / 2 + 0.035, 0.12, 0.025, 0.02, '#8e949a');
  B.box('solid', -0.08, 0.06, d / 2 - 0.01, 0.08, 0.16, d / 2 + 0.03, '#555b62', { skip: 'Z' }); // outlet
  // capsule globe box
  B.box('solid', -w / 2, 0.62, -d / 2, w / 2, 0.66, d / 2, '#e8483f');
  B.box('solid', -w / 2, 1.08, -d / 2, w / 2, 1.14, d / 2, '#e8483f');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box('solid', sx * (w / 2) - 0.02, 0.66, sz * (d / 2) - 0.02, sx * (w / 2) + 0.02, 1.08, sz * (d / 2) + 0.02, '#e8483f');
  B.quad('glass', 0, 0.87, d / 2, w - 0.04, 0.42, '#fff');
  B.quad('glass', w / 2, 0.87, 0, d - 0.04, 0.42, '#fff', null, { ry: Math.PI / 2 });
  B.quad('glass', -w / 2, 0.87, 0, d - 0.04, 0.42, '#fff', null, { ry: -Math.PI / 2 });
  for (let i = 0; i < 16; i++) {
    const cx = (rng() - 0.5) * (w - 0.12), cz = (rng() - 0.5) * (d - 0.12);
    const cy = 0.7 + Math.floor(i / 6) * 0.08 + rng() * 0.05;
    B.sphere('deco', cx, cy, cz, 0.045, capsuleCols[i % capsuleCols.length], { w: 8, h: 5 });
  }
  B.pop();
}

/** Plastic shopping basket (open box, handles) at (x, y, z). */
export function basket(S, x, y, z, col, ry = 0) {
  const B = S.B;
  B.pushT(x, y, z, ry);
  B.box('solid', -0.24, 0, -0.17, 0.24, 0.24, 0.17, col, { skip: 'Y' });
  B.box('deco', -0.23, 0.2, -0.16, 0.23, 0.205, 0.16, shadeHex(col, -0.15), { skip: 'y' });
  B.beam('deco', [-0.12, 0.24, -0.17], [-0.12, 0.3, 0], 0.012, 0.012, col);
  B.beam('deco', [-0.12, 0.3, 0], [-0.12, 0.24, 0.17], 0.012, 0.012, col);
  B.pop();
}

/** Broom leaning against a +Z wall at (x, y, z). */
export function broom(S, x, y, z, lean = 0.18, o = {}) {
  const B = S.B;
  const top = [x + lean * 0.3, y + 1.25, z + 0.03];
  const bot = [x, y + 0.28, z + 0.22];
  B.beam('solid', bot, top, 0.025, 0.025, o.handle || '#c8a878');
  // straw head (bamboo broom / 竹ぼうき style)
  B.pushT(x, y, z + 0.24, 0, -0.15);
  B.cyl('solid', 0, 0, 0, 0.03, 0.3, o.head || '#c9a860', { rb: 0.13, seg: 8, sz: 0.45 });
  B.box('deco', -0.06, 0.2, -0.03, 0.06, 0.23, 0.03, '#d8433d');
  B.pop();
}

/** Cardboard box (段ボール) with tape and a printed side. */
export function cardboard(S, x, y, z, w, h, d, ry = 0) {
  const B = S.B, r = S.A.get('box');
  B.pushT(x, y, z, ry);
  B.box('solid', -w / 2, 0, -d / 2, w / 2, h, d / 2, '#e0bc88', { rects: { Z: r, X: r, z: r, x: r } });
  B.box('deco', -0.04, h, -d / 2 - 0.002, 0.04, h + 0.004, d / 2 + 0.002, '#ecd6aa');
  B.pop();
}

/** Rice sack (paper bag) with printed front. */
export function riceBag(S, x, y, z, ry, rect) {
  const B = S.B;
  B.pushT(x, y, z, ry);
  B.box('solid', -0.18, 0, -0.09, 0.18, 0.46, 0.09, '#f4ecd8', { rect, face: 'Z' });
  B.boxC('solid', 0, 0.48, 0, 0.3, 0.05, 0.14, '#e8dcc0');
  B.pop();
}

/** Wooden bench (縁台) with red felt; ry = long axis along x after ry. */
export function engawaBench(S, x, y, z, w, ry = 0) {
  const B = S.B;
  B.pushT(x, y, z, ry);
  const d = 0.55, h = 0.42;
  for (const sx of [-1, 1]) {
    B.box('solid', sx * (w / 2 - 0.08) - 0.04, 0, -d / 2 + 0.04, sx * (w / 2 - 0.08) + 0.04, h - 0.05, -d / 2 + 0.1, '#6a4e3a');
    B.box('solid', sx * (w / 2 - 0.08) - 0.04, 0, d / 2 - 0.1, sx * (w / 2 - 0.08) + 0.04, h - 0.05, d / 2 - 0.04, '#6a4e3a');
    B.box('solid', sx * (w / 2 - 0.08) - 0.04, 0.12, -d / 2 + 0.04, sx * (w / 2 - 0.08) + 0.04, 0.16, d / 2 - 0.04, '#6a4e3a');
  }
  B.box('solid', -w / 2, h - 0.05, -d / 2, w / 2, h, d / 2, '#8a6446');
  // red felt (毛氈) draped over the front
  B.box('solid', -w / 2 + 0.05, h, -d / 2 + 0.03, w / 2 - 0.05, h + 0.012, d / 2 + 0.02, '#c8423a');
  B.box('solid', -w / 2 + 0.05, h - 0.14, d / 2 + 0.01, w / 2 - 0.05, h + 0.012, d / 2 + 0.025, '#c8423a');
  B.pop();
}

/** Red parasol (野点傘) on a pole. */
export function parasol(S, x, y, z, r = 1.1, h = 2.2) {
  const B = S.B;
  B.cyl('solid', x, y, z, 0.12, 0.08, '#3a3a40', { seg: 8 });
  B.cyl('solid', x, y, z, 0.022, h, '#c8a878', { seg: 6 });
  const g = B._cached(`parasol|${r}`, () => new THREE.ConeGeometry(r, 0.42, 16, 1, true));
  B.geo('cloth', g, '#c8423a', { m: new THREE.Matrix4().setPosition(x, y + h - 0.12, z) });
  B.geo('cloth', g, '#a8342e', { m: new THREE.Matrix4().makeRotationX(Math.PI).setPosition(x, y + h - 0.13, z).multiply(new THREE.Matrix4().makeScale(1, -1, 1)) });
}

/** Small hanging sign plate (e.g. 営業中) on a string. */
export function hangingPlate(S, x, y, z, w, h, rect) {
  const B = S.B;
  B.beam('deco', [x - w * 0.3, y + h / 2, z + 0.01], [x, y + h / 2 + 0.1, z + 0.01], 0.004, 0.004, '#555');
  B.beam('deco', [x + w * 0.3, y + h / 2, z + 0.01], [x, y + h / 2 + 0.1, z + 0.01], 0.004, 0.004, '#555');
  B.box('solid', x - w / 2, y - h / 2, z, x + w / 2, y + h / 2, z + 0.015, '#7a5a3e', { rect, face: 'Z' });
}

/** Projecting sign (袖看板): a box sign perpendicular to the facade at x on wall plane z. */
export function projectingSign(S, x, y, z, w, h, t, rectA, rectB, o = {}) {
  const B = S.B;
  const out = o.out ?? 0.12;
  // bracket arms
  for (const yy of [y + h / 2 - 0.08, y - h / 2 + 0.08]) B.box('solid', x - 0.02, yy - 0.02, z, x + 0.02, yy + 0.02, z + out + 0.02, C.aluDark);
  B.pushT(x, y, z + out + w / 2, Math.PI / 2);
  // sign box: faces ±Z (after rotation) show the pictures -> viewers up/down the street
  B.box(o.lit ? 'solid' : 'solid', -w / 2, -h / 2, -t / 2, w / 2, h / 2, t / 2, o.color || '#f6f4ee', { rects: { Z: rectA, z: rectB || rectA }, kinds: o.lit ? { Z: 'lit', z: 'lit' } : undefined });
  B.pop();
}

/** Wind chime (furin): glass bell + paper strip that sways. */
export function windChime(S, x, y, z, rect) {
  const B = S.B;
  B.box('deco', x - 0.003, y - 0.06, z - 0.003, x + 0.003, y + 0.12, z + 0.003, '#444');
  B.sphere('solid', x, y - 0.08, z, 0.05, '#bfe3f0', { half: true, w: 10, h: 4 });
  B.swayFn = (lx, ly) => Math.max(0, (0.1 - ly) / 0.2) * 1.3; // quad frame is centred
  B.quad('cut', x, y - 0.22, z, 0.06, 0.2, '#ffffff', rect, { back: true, ry: 0.4 });
  B.swayFn = null;
}

/** Utility: lighten / darken a hex colour by dL in HSL lightness. */
export function shadeHex(hex, dL = 0, satMul = 1) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * satMul), Math.min(1, Math.max(0, hsl.l + dL)));
  return '#' + c.getHexString();
}

export { P };
