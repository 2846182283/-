/**
 * Building shells for the shops: walls with real openings, foundations,
 * floor bands, gable / flat / lean-to roofs, gutters, simple interiors and
 * the typical "shop below, owner's home above" two-storey composition.
 *
 * Lot-local frame: footprint centred on the origin, front wall outer face at
 * z = +D/2, y = 0 is the ground at the lot front centre (lot.y).
 */
import { houseWindow, acUnit, C, shadeHex } from './parts.js';

/**
 * Wall slab with rectangular holes, decomposed into a grid of boxes.
 *   axis 'x': wall runs along x at outer plane z = plane, thickness toward inward (+1|-1)
 *   axis 'z': wall runs along z at outer plane x = plane
 * holes: [{a0, a1, y0, y1}] in the running coordinate (x or z) and y.
 * o.grad darkens the wall foot (hand-painted grime), o.colors per-face override.
 */
export function wall(S, kind, color, axis, plane, a0, a1, y0, y1, t, inward, holes = [], o = {}) {
  const B = S.B;
  const as = new Set([a0, a1]);
  const ys = new Set([y0, y1]);
  for (const h of holes) {
    for (const v of [h.a0, h.a1]) if (v > a0 && v < a1) as.add(v);
    for (const v of [h.y0, h.y1]) if (v > y0 && v < y1) ys.add(v);
  }
  const A = [...as].sort((p, q) => p - q), Y = [...ys].sort((p, q) => p - q);
  const inHole = (a, y) => holes.some((h) => a > h.a0 && a < h.a1 && y > h.y0 && y < h.y1);
  const pIn = plane + inward * t;
  const p0 = Math.min(plane, pIn), p1 = Math.max(plane, pIn);
  for (let j = 0; j < Y.length - 1; j++) {
    const ya = Y[j], yb = Y[j + 1], ym = (ya + yb) / 2;
    let i = 0;
    while (i < A.length - 1) {
      if (inHole((A[i] + A[i + 1]) / 2, ym)) { i++; continue; }
      let k = i;
      while (k + 1 < A.length - 1 && !inHole((A[k + 1] + A[k + 2]) / 2, ym)) k++;
      const s0 = A[i], s1 = A[k + 1];
      const opt = { grad: ya === y0 ? o.grad : undefined, colors: o.colors };
      if (axis === 'x') B.box(kind, s0, ya, p0, s1, yb, p1, color, opt);
      else B.box(kind, p0, ya, s0, p1, yb, s1, color, opt);
      i = k + 1;
    }
  }
}

/** Concrete foundation (slightly proud of the walls) from below ground up to the floor. */
export function foundation(S, W, D, yTop, o = {}) {
  const yBot = Math.min(S.minGround - 0.25, yTop - 0.3);
  const e = o.outset ?? 0.03;
  S.B.box('solid', -W / 2 - e, yBot, -D / 2 - e, W / 2 + e, yTop, D / 2 + e, o.color || C.concrete, { skip: 'y', grad: 0.9 });
}

/** Horizontal trim band (floor line / 帯) around the front + sides. */
export function band(S, W, D, y, h, color, o = {}) {
  const B = S.B, e = o.out ?? 0.05;
  B.box('solid', -W / 2 - e, y, D / 2 - 0.02, W / 2 + e, y + h, D / 2 + e, color);
  if (o.sides !== false) {
    B.box('solid', -W / 2 - e, y, -D / 2 - e, -W / 2 + 0.02, y + h, D / 2 + e, color);
    B.box('solid', W / 2 - 0.02, y, -D / 2 - e, W / 2 + e, y + h, D / 2 + e, color);
  }
}

/**
 * Gable roof, ridge along X.  Eaves at yEave over the wall lines z = ±D/2.
 * o.overX / o.overZ overhangs, o.t slab thickness, o.fascia colour,
 * o.infill {kind, color} for the gable-end triangles, o.gutter.
 */
export function gableRoof(S, W, D, yEave, rise, color, o = {}) {
  const B = S.B;
  const ox = o.overX ?? 0.45, oz = o.overZ ?? 0.6, t = o.t ?? 0.16;
  const half = D / 2;
  const a = Math.atan2(rise, half);
  const L = (half + oz) / Math.cos(a);
  const fascia = o.fascia || shadeHex(color, -0.1);
  for (const side of [1, -1]) {
    B.pushT(0, yEave + rise, 0, side > 0 ? 0 : Math.PI, a, 0);
    B.box('rows', -W / 2 - ox, -t, 0, W / 2 + ox, 0, L, color, { colors: { Z: fascia, x: fascia, X: fascia, y: o.soffit || '#e8e2d6' } });
    // eave tile line (軒瓦) + barge boards
    B.box('solid', -W / 2 - ox, -0.02, L - 0.16, W / 2 + ox, 0.06, L, o.eaveTile || shadeHex(color, -0.05));
    const ex = W / 2 + ox;
    for (const sx of [-1, 1]) B.box('solid', sx > 0 ? ex - 0.06 : -ex - 0.02, -t - 0.04, -0.02, sx > 0 ? ex + 0.02 : -ex + 0.06, 0.07, L + 0.02, o.barge || fascia);
    B.pop();
  }
  // ridge
  B.box('solid', -W / 2 - ox - 0.04, yEave + rise - 0.04, -0.17, W / 2 + ox + 0.04, yEave + rise + 0.14, 0.17, o.ridge || shadeHex(color, -0.08));
  B.cyl('solid', -W / 2 - ox - 0.06, yEave + rise + 0.05, 0, 0.11, 0.12, o.ridge || shadeHex(color, -0.08), { rz: -Math.PI / 2, seg: 8 });
  B.cyl('solid', W / 2 + ox - 0.06, yEave + rise + 0.05, 0, 0.11, 0.12, o.ridge || shadeHex(color, -0.08), { rz: -Math.PI / 2, seg: 8 });
  // gable-end infill triangles
  const inf = o.infill || { kind: 'plaster', color: '#f2eee6' };
  for (const sx of [-1, 1]) {
    const x = sx * W / 2;
    const pts = [[x, yEave, -half], [x, yEave, half], [x, yEave + rise - 0.05, 0]];
    B.poly(inf.kind, sx > 0 ? [pts[1], pts[0], pts[2]] : pts, inf.color);
  }
  // ceiling under the slabs at wall-top level (closes the attic)
  B.box('solid', -W / 2, yEave - 0.02, -half, W / 2, yEave, half, '#d8d2c8', { skip: 'Y' });
  if (o.gutter !== false) {
    const zg = half + oz + 0.02, yg = yEave - oz * Math.tan(a) - t - 0.02;
    B.box('solid', -W / 2 - ox, yg - 0.1, zg - 0.02, W / 2 + ox, yg, zg + 0.1, o.gutterCol || '#8e949a');
    if (o.downpipe !== false) {
      // outlet at the gutter end, elbow back to the side wall, then down the front corner
      const sx = Math.sign(o.downpipeX ?? 1) || 1;
      const col = o.gutterCol || '#8e949a';
      const xg = sx * (W / 2 + ox - 0.12), xw = sx * (W / 2 + 0.08), zw = half - 0.2;
      const yk = yg - 0.45;
      B.tube('solid', [[xg, yg - 0.02, zg - 0.06], [xg, yg - 0.15, zg - 0.06], [xw, yk, zw], [xw, yk - 0.12, zw]], 0.035, col, { radial: 6 });
      B.cyl('solid', xw, S.minGround, zw, 0.035, yk - 0.1 - S.minGround, col, { seg: 6 });
      for (let yy = S.minGround + 0.8; yy < yk - 0.3; yy += 1.4) B.box('deco', sx > 0 ? W / 2 : xw - 0.05, yy, zw - 0.05, sx > 0 ? xw + 0.05 : -W / 2, yy + 0.03, zw + 0.05, col);
      B.box('solid', xw - 0.05, S.minGround, zw - 0.05, xw + 0.05, S.minGround + 0.05, zw + 0.16, col); // shoe
    }
  }
  return { top: yEave + rise, eaveY: yEave - oz * Math.tan(a) };
}

/** Flat roof slab with a parapet ring and coping. */
export function flatRoof(S, W, D, y, parapet, color, o = {}) {
  const B = S.B;
  B.box('solid', -W / 2, y - 0.2, -D / 2, W / 2, y, D / 2, o.slab || '#b9b8b2');
  const t = 0.18, cop = o.coping || '#dcdad4';
  B.box(o.kind || 'plaster', -W / 2, y, D / 2 - t, W / 2, y + parapet, D / 2, color);
  B.box(o.kind || 'plaster', -W / 2, y, -D / 2, W / 2, y + parapet, -D / 2 + t, color);
  B.box(o.kind || 'plaster', -W / 2, y, -D / 2, -W / 2 + t, y + parapet, D / 2, color);
  B.box(o.kind || 'plaster', W / 2 - t, y, -D / 2, W / 2, y + parapet, D / 2, color);
  B.box('solid', -W / 2 - 0.04, y + parapet, -D / 2 - 0.04, W / 2 + 0.04, y + parapet + 0.06, D / 2 + 0.04, cop);
}

/**
 * Lean-to eave (庇 / hisashi) over a shop front: from the wall at height y
 * (plane z) out by `depth`, falling `drop`; tiled (rows) or sheet metal.
 */
export function hisashi(S, x0, x1, y, z, depth, drop, color, o = {}) {
  const B = S.B;
  const a = Math.atan2(drop, depth);
  const L = Math.hypot(depth, drop) + 0.05;
  B.pushT(0, y, z - 0.05, 0, a, 0);
  B.box(o.kind || 'rows', x0, -0.08, 0, x1, 0, L, color, { colors: { Z: o.fascia || shadeHex(color, -0.1), y: o.soffit || '#d9cbb4', x: o.fascia || shadeHex(color, -0.1), X: o.fascia || shadeHex(color, -0.1) } });
  B.box('solid', x0, -0.02, L - 0.12, x1, 0.05, L, o.edge || shadeHex(color, -0.05));
  B.pop();
  // wall flashing + brackets
  B.box('solid', x0, y - 0.02, z - 0.02, x1, y + 0.08, z + 0.06, o.fascia || shadeHex(color, -0.1));
  const nb = o.brackets ?? 2;
  for (let i = 0; i < nb; i++) {
    const bx = nb === 1 ? (x0 + x1) / 2 : x0 + 0.15 + ((x1 - x0 - 0.3) * i) / (nb - 1);
    B.beam('solid', [bx, y - 0.55, z + 0.02], [bx, y - drop * 0.75 - 0.06, z + depth * 0.75], 0.05, 0.05, o.bracket || '#4a3a30');
  }
}

/**
 * Interior room box seen through the shop front (inner faces only).
 * x0..x1, z0 (back) .. z1 (just behind the facade), floor y0, ceiling y1.
 */
export function room(S, x0, x1, z0, z1, y0, y1, o = {}) {
  const B = S.B;
  const floor = o.floor || '#c8b8a0', wallc = o.wall || '#efe6d6', ceil = o.ceil || '#f4efe6';
  B.box(o.floorKind || 'inner', x0, y0 - 0.05, z0, x1, y0, z1, floor, { skip: 'y' });
  B.box('inner', x0, y1, z0, x1, y1 + 0.05, z1, ceil, { skip: 'Y' });
  B.box('inner', x0, y0, z0 - 0.05, x1, y1, z0, o.back || wallc, { skip: 'z' });
  B.box('inner', x0 - 0.05, y0, z0, x0, y1, z1, wallc, { skip: 'x' });
  B.box('inner', x1, y0, z0, x1 + 0.05, y1, z1, wallc, { skip: 'X' });
  if (o.skirting !== false) {
    B.box('inner', x0, y0, z0, x1, y0 + 0.08, z0 + 0.02, o.skirt || '#8a6446');
  }
}

/**
 * Standard two-storey shop house: foundation, ground floor walls with a
 * storefront opening, upper floor with windows, band, roof, side & back
 * windows, AC units.
 *
 * spec: {
 *   W, D, F (floor y), H1, H2, t,
 *   wall1: {kind, color}, wall2: {kind, color}, sides: {kind, color},
 *   open: {x0, x1, y1} | [...]    ground-floor front opening(s) (from F)
 *   win2: [{x, w, h, y}]          upper front windows (y = centre above F+H1)
 *   roof: {type:'gable'|'flat', color, rise, overZ, overX, parapet}
 *   bandColor, sideWin: [{side:-1|1, z, w, h, y}], ac: bool
 * }
 * Returns key heights.
 */
export function shopHouse(S, spec) {
  const { W, D, F } = spec;
  const H1 = spec.H1 ?? 3.1, H2 = spec.floors === 1 ? 0 : spec.H2 ?? 2.75;
  const t = spec.t ?? 0.18;
  const top = F + H1 + H2;
  const w1 = spec.wall1, w2 = spec.wall2 || spec.wall1, sd = spec.sides || w2;
  foundation(S, W, D, F, { color: spec.base });
  // --- ground floor front wall with the storefront opening
  const ops = !spec.open ? [] : Array.isArray(spec.open) ? spec.open : [spec.open];
  wall(S, w1.kind, w1.color, 'x', D / 2, -W / 2, W / 2, F, F + H1, t, -1, ops.map((op) => ({ a0: op.x0, a1: op.x1, y0: F - 0.01, y1: F + op.y1 })), { grad: 0.86 });
  // --- upper floor front wall with windows
  const y2 = F + H1;
  if (H2 > 0) {
    const holes = (spec.win2 || []).map((w) => ({ a0: w.x - w.w / 2, a1: w.x + w.w / 2, y0: y2 + w.y - w.h / 2, y1: y2 + w.y + w.h / 2 }));
    if (spec.balconyDoor) {
      const b = spec.balconyDoor;
      holes.push({ a0: b.x - b.w / 2, a1: b.x + b.w / 2, y0: y2 + 0.12, y1: y2 + 0.12 + b.h });
    }
    wall(S, w2.kind, w2.color, 'x', D / 2, -W / 2, W / 2, y2, top, t, -1, holes);
    (spec.win2 || []).forEach((w, i) => houseWindow(S, w.x, y2 + w.y, D / 2, w.w, w.h, { curtain: (S.lot.seed + i) % 4, rail: w.rail, box: w.box, frame: w.frame, shutterBox: w.shutterBox }));
    band(S, W, D, y2 - 0.06, 0.16, spec.bandColor || shadeHex(w2.color, -0.12));
  }
  // --- side & back walls (full height), with small windows
  const sideHoles = { '-1': [], '1': [] };
  for (const sw of spec.sideWin || []) sideHoles[sw.side].push({ a0: sw.z - sw.w / 2, a1: sw.z + sw.w / 2, y0: F + sw.y - sw.h / 2, y1: F + sw.y + sw.h / 2 });
  wall(S, sd.kind, sd.color, 'z', -W / 2, -D / 2, D / 2 - t, F, top, t, 1, sideHoles['-1'], { grad: 0.88 });
  wall(S, sd.kind, sd.color, 'z', W / 2, -D / 2, D / 2 - t, F, top, t, -1, sideHoles['1'], { grad: 0.88 });
  const backHoles = H2 > 0 ? [{ a0: -W / 4 - 0.6, a1: -W / 4 + 0.6, y0: y2 + 0.8, y1: y2 + 2.0 }, { a0: W / 4 - 0.45, a1: W / 4 + 0.45, y0: F + 1.2, y1: F + 2.1 }] : [];
  wall(S, sd.kind, sd.color, 'x', -D / 2, -W / 2 + t, W / 2 - t, F, top, t, 1, backHoles, { grad: 0.88 });
  // side / back window units (rotated frames)
  for (const sw of spec.sideWin || []) {
    S.B.pushT(sw.side * W / 2, 0, sw.z, sw.side * Math.PI / 2);
    houseWindow(S, 0, F + sw.y, 0, sw.w, sw.h, { curtain: Math.abs((sw.z * 7) | 0), rail: sw.rail, frame: sw.frame, plain: sw.plain, box: sw.box });
    S.B.pop();
  }
  S.B.pushT(0, 0, -D / 2, Math.PI);
  for (const h of backHoles) houseWindow(S, -(h.a0 + h.a1) / 2, (h.y0 + h.y1) / 2, 0, h.a1 - h.a0, h.y1 - h.y0, { curtain: 1 });
  S.B.pop();
  // --- roof
  const r = spec.roof || { type: 'gable' };
  let roofTop = top;
  if (r.type === 'gable') {
    const res = gableRoof(S, W, D, top, r.rise ?? 1.5, r.color || P_ROOF, { overZ: r.overZ, overX: r.overX, infill: { kind: sd.kind, color: sd.color }, downpipeX: r.downpipeX, gutter: r.gutter });
    roofTop = res.top;
  } else if (r.type === 'flat') {
    flatRoof(S, W, D, top, r.parapet ?? 0.6, w2.color, { kind: w2.kind });
    roofTop = top + (r.parapet ?? 0.6);
  } else if (r.type === 'kanban') {
    // 看板建築: tall flat front parapet hiding a shallow gable behind
    const ph = r.parapet ?? 1.1;
    const res = gableRoof(S, W - 0.1, D - 0.6, top, r.rise ?? 1.2, r.color || P_ROOF, { overZ: 0.25, overX: 0.3, infill: { kind: sd.kind, color: sd.color }, gutter: false });
    S.B.box(w2.kind, -W / 2, top, D / 2 - 0.22, W / 2, top + ph, D / 2, w2.color);
    S.B.box('solid', -W / 2 - 0.06, top + ph, D / 2 - 0.3, W / 2 + 0.06, top + ph + 0.08, D / 2 + 0.06, r.coping || '#dcdad4');
    roofTop = Math.max(res.top, top + ph);
  }
  if (spec.ac !== false && H2 > 0) acUnit(S, W / 2 + 0.24, F + 0.05, -D / 2 + 1.6, Math.PI / 2, { pipeH: H1 + 0.4 });
  S.addCollider(-W / 2 - 0.05, W / 2 + 0.05, -D / 2 - 0.05, D / 2 + 0.05);
  return { top, y2, roofTop, H1, H2, t };
}

const P_ROOF = '#5f6670';
