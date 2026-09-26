/**
 * House shell: foundation, walls (with real openings + reveals), trims,
 * roofs (kawara / metal: gable, hip, shed, lean-to, flat), eaves with
 * thickness, soffits, barge boards, ridges, gutters and downpipes.
 *
 * Walls are single-sided panels built per facade in the facade frame
 * (u along the wall, y up, +z outwards).  Every opening gets reveal faces;
 * openings.js fills them with frames, glass and a small interior box so
 * windows have real depth up close.
 */
import * as THREE from 'three';
import { FOUND, STOREY, WALL_T } from './plan.js';
import { wallV, WALL_U_PERIOD, BAND_H, roofV, roofEaveV, ROOF_U_PERIOD } from './textures.js';
import { shade } from '../../core/toon.js';
import { Batcher } from './batch.js';

const EPS = 1e-4;

/** Facade frame matrix (lot-local). */
export function facadeMatrix(f) {
  return new THREE.Matrix4().makeRotationY(f.ry).setPosition(f.ox, 0, f.oz);
}

/** Emit a convex polygon, auto-oriented so that its normal faces `want`. */
export function face(B, kind, pts, color, uvs, want) {
  const n = Batcher.normalOf(pts);
  if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) {
    pts = pts.slice().reverse();
    if (uvs) uvs = uvs.slice().reverse();
  }
  B.poly(kind, pts, color, uvs, want);
}

/** wall-texture UV for facade point (u, y); y is lot-local (wall base = FOUND). */
function wallUV(band, uOff, yShift) {
  return (p) => [(uOff + p[0]) / WALL_U_PERIOD, wallV(band, p[1] - FOUND - yShift)];
}

// ---------------------------------------------------------------------------
// roof parameters (shared between walls and roof geometry)
// ---------------------------------------------------------------------------
export function roofParams(b) {
  const R = b.roof;
  const kawara = R.mat === 'kawara';
  const t = kawara ? 0.2 : 0.11;
  const h0 = t - 0.02; // slab underside dips just below the wall top (no gap at the eave)
  const yWall = b.top + h0; // roof top surface height over the wall line
  const W = b.x1 - b.x0, Dd = b.z1 - b.z0;
  const rp = { kawara, t, h0, yWall, W, D: Dd, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 };
  if (R.type === 'gableX' || R.type === 'gableZ') {
    const run = (R.type === 'gableX' ? Dd : W) / 2;
    rp.ridgeY = yWall + run * R.pitch;
  } else if (R.type === 'hip') {
    rp.ridgeY = yWall + (Math.min(W, Dd) / 2) * R.pitch;
  } else if (R.type === 'shed') {
    rp.ridgeY = yWall + Dd * R.pitch;
  } else if (R.type === 'lean') {
    rp.ridgeY = yWall + W * R.pitch;
  } else rp.ridgeY = b.top + 0.3;
  return rp;
}

/** Extra wall polygon above the wall top (gable ends, shed sides) in facade coords. */
function gablePoly(b, rp, side, L) {
  const R = b.roof, top = b.top, under = Math.max(top, rp.yWall - rp.t);
  const tri = (hiAtStart) => {
    const rise = (R.type === 'lean' ? b.x1 - b.x0 : b.z1 - b.z0) * R.pitch;
    return hiAtStart
      ? [[0, top], [L, top], [L, under], [0, under + rise]]
      : [[0, top], [L, top], [L, under + rise], [0, under]];
  };
  switch (R.type) {
    case 'gableX':
      if (side === 'left' || side === 'right') return [[0, top], [L, top], [L, under], [L / 2, rp.ridgeY - rp.t], [0, under]];
      return null;
    case 'gableZ':
      if (side === 'front' || side === 'back') return [[0, top], [L, top], [L, under], [L / 2, rp.ridgeY - rp.t], [0, under]];
      return null;
    case 'shed': {
      // shedDir +1: high side at the back (z0)
      const hiBack = R.shedDir > 0;
      if (side === 'left') return tri(hiBack); // left: u runs z0 -> z1
      if (side === 'right') return tri(!hiBack); // right: u runs z1 -> z0
      const rise = (b.z1 - b.z0) * R.pitch;
      if ((side === 'back' && hiBack) || (side === 'front' && !hiBack)) return [[0, top], [L, top], [L, under + rise], [0, under + rise]];
      return null;
    }
    case 'lean':
      if (side === 'front') return tri(true); // u runs x0 (high, main wall) -> x1
      if (side === 'back') return tri(false);
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// walls
// ---------------------------------------------------------------------------
/**
 * Build one facade's wall panels (with openings), reveals, belt course,
 * corner boards and the gable infill.
 */
export function buildFacadeWall(B, P, f) {
  const b = f.block;
  const L = f.L;
  const rp = b.rp;
  const top = b.top;
  const z1 = FOUND + STOREY;
  const zones = P.zones;
  const uOff = (P.seed % 97) * 0.37 + ['front', 'right', 'back', 'left'].indexOf(f.side) * 1.3;
  B.push(facadeMatrix(f));

  // --- panels around openings
  const ys = new Set([FOUND, top]);
  if (b.floors === 2) ys.add(z1);
  for (const o of f.openings) { ys.add(Math.max(FOUND, o.y0)); ys.add(Math.min(top, o.y1)); }
  const yl = [...ys].filter((y) => y >= FOUND - EPS && y <= top + EPS).sort((a, c) => a - c);
  for (let i = 0; i < yl.length - 1; i++) {
    const ya = yl[i], yb = yl[i + 1];
    if (yb - ya < EPS) continue;
    const zi = b.floors === 2 && ya >= z1 - EPS ? 1 : 0;
    const zone = zones[zi];
    const cover = f.openings.filter((o) => o.y0 < yb - EPS && o.y1 > ya + EPS).sort((a, c) => a.u0 - c.u0);
    let u = 0;
    const uvf = wallUV(zone.band, uOff, 0);
    const emit = (ua, ub) => {
      if (ub - ua < EPS) return;
      const pts = [[ua, ya, 0], [ub, ya, 0], [ub, yb, 0], [ua, yb, 0]];
      B.poly('wall', pts, zone.color, pts.map(uvf), [0, 0, 1]);
    };
    for (const o of cover) { emit(u, o.u0); u = Math.max(u, o.u1); }
    emit(u, L);
  }

  // --- reveals
  for (const o of f.openings) {
    const zi = b.floors === 2 && o.y0 >= z1 - EPS ? 1 : 0;
    const rc = shade(zones[zi].color, -0.08, 0.9);
    const T = -WALL_T;
    face(B, 'solid', [[o.u0, o.y1, 0], [o.u1, o.y1, 0], [o.u1, o.y1, T], [o.u0, o.y1, T]], rc, null, [0, -1, 0]);
    face(B, 'solid', [[o.u0, o.y0, 0], [o.u1, o.y0, 0], [o.u1, o.y0, T], [o.u0, o.y0, T]], rc, null, [0, 1, 0]);
    face(B, 'solid', [[o.u0, o.y0, 0], [o.u0, o.y1, 0], [o.u0, o.y1, T], [o.u0, o.y0, T]], rc, null, [1, 0, 0]);
    face(B, 'solid', [[o.u1, o.y0, 0], [o.u1, o.y1, 0], [o.u1, o.y1, T], [o.u1, o.y0, T]], rc, null, [-1, 0, 0]);
  }

  // --- gable / shed infill above the wall top
  const gp = rp && gablePoly(b, rp, f.side, L);
  if (gp) {
    const zone = zones[b.floors === 2 ? 1 : 0];
    const maxY = Math.max(...gp.map((p) => p[1]));
    const shift = maxY - FOUND > BAND_H - 0.05 ? 4.2 : 0;
    const uvf = wallUV(zone.band, uOff, shift);
    const pts = gp.map(([u, y]) => [u, y, 0]);
    B.poly('wall', pts, zone.color, pts.map(uvf), [0, 0, 1]);
    // gable vent (換気口) on kawara houses / a small louvre
    if ((b.roof.type === 'gableX' || b.roof.type === 'gableZ') && P.lod !== 'simple') {
      const ay = top + (rp.ridgeY - rp.t - top) * 0.45;
      if (rp.ridgeY - top > 1.2) {
        B.box('solid', L / 2 - 0.22, ay - 0.14, 0, L / 2 + 0.22, ay + 0.14, 0.04, P.trim === '#f3f1ea' ? '#e9e6de' : P.trim, { skip: 'z' });
        for (let k = 0; k < 4; k++) B.box('small', L / 2 - 0.18, ay - 0.1 + k * 0.065, 0.04, L / 2 + 0.18, ay - 0.08 + k * 0.065, 0.06, shade(P.trim, -0.2), { skip: 'z' });
      }
    }
  }

  // --- belt course between the floors, and the foundation flashing
  if (b.floors === 2 && P.beltCourse) {
    B.box('solid', -0.03, z1 - 0.06, 0, L + 0.03, z1 + 0.08, 0.035, P.trim, { skip: 'z' });
  }
  B.box('solid', -0.035, FOUND - 0.03, 0, L + 0.035, FOUND + 0.015, 0.035, '#8d9197', { skip: 'z' });
  // corner boards on board / siding facades
  if (zones[0].band === 'siding' || zones[0].band === 'wood') {
    const cc = zones[0].band === 'wood' ? shade(zones[0].color, -0.04) : P.trim === '#4d4843' || P.trim === '#5b4332' ? '#f1efe9' : P.trim;
    for (const u of [0, L - 0.09]) B.box('solid', u, FOUND, 0, u + 0.09, (b.floors === 2 && zones[1].band !== zones[0].band ? z1 - 0.06 : top), 0.025, cc, { skip: 'z' });
  }
  B.pop();
}

/** Concrete foundation under a block (extends below the sloping ground). */
export function buildFoundation(B, P, b) {
  const c = P.found;
  B.box('solid', b.x0 + 0.01, -0.9, b.z0 + 0.01, b.x1 - 0.01, FOUND - 0.02, b.z1 - 0.01, c, { skip: 'y' });
  // underfloor vents (old houses) on the front and sides
  if (P.trad && P.lod === 'full') {
    const xs = [];
    for (let x = b.x0 + 1.2; x < b.x1 - 1.0; x += 2.6) xs.push(x);
    for (const x of xs) {
      B.box('small', x, 0.14, b.z1 - 0.01, x + 0.36, 0.3, b.z1 + 0.005, '#6a6d72', { skip: 'z' });
      for (let k = 0; k < 4; k++) B.box('small', x + 0.03 + k * 0.09, 0.14, b.z1, x + 0.05 + k * 0.09, 0.3, b.z1 + 0.012, '#b9bcbf', { skip: 'z' });
    }
  }
}

// ---------------------------------------------------------------------------
// roofs
// ---------------------------------------------------------------------------
/**
 * Build the roof of block b.  The roof is modelled in a canonical frame
 * centred on the block where the ridge / eave runs along local X and the
 * main slopes face +/-Z, then rotated into place.
 */
export function buildRoof(B, P, b) {
  const R = b.roof;
  const rp = b.rp;
  if (R.type === 'flat') return buildFlatRoof(B, P, b);
  let ry = 0, hw, hd;
  if (R.type === 'gableX' || R.type === 'shed') { hw = rp.W / 2; hd = rp.D / 2; ry = R.type === 'shed' && R.shedDir < 0 ? Math.PI : 0; }
  else if (R.type === 'gableZ') { hw = rp.D / 2; hd = rp.W / 2; ry = Math.PI / 2; }
  else if (R.type === 'hip') {
    if (rp.W >= rp.D) { hw = rp.W / 2; hd = rp.D / 2; } else { hw = rp.D / 2; hd = rp.W / 2; ry = Math.PI / 2; }
  } else if (R.type === 'lean') { hw = rp.D / 2; hd = rp.W / 2; ry = Math.PI / 2; }
  B.pushT(rp.cx, 0, rp.cz, ry);
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const ground = (x, z) => P.gy(rp.cx + x * cs + z * sn, rp.cz - x * sn + z * cs);
  const ctx = { B, P, b, R, rp, hw, hd, ground };
  if (R.type === 'gableX' || R.type === 'gableZ') gableRoof(ctx);
  else if (R.type === 'hip') hipRoof(ctx);
  else if (R.type === 'shed') shedRoof(ctx);
  else if (R.type === 'lean') leanRoof(ctx);
  B.pop();
}

const slopeLen = (p) => Math.sqrt(1 + p * p);

/** A roof slab from its top quad (CCW from above), with face styling. */
function slab(c, top, eaveEdge, verges, opts = {}) {
  const { B, R, rp, P } = c;
  const t = opts.t ?? rp.t;
  const bot = top.map((p) => [p[0], p[1] - t, p[2]]);
  const band = rp.kawara ? 'kawara' : 'metal';
  const uOff = (P.seed % 13) * 0.21;
  // slope distance from the eave line along the slab's descent direction
  const e0 = top[0], e1 = top[1];
  const ex = e1[0] - e0[0], ez = e1[2] - e0[2];
  const el = Math.hypot(ex, ez) || 1;
  const dirX = ex / el, dirZ = ez / el;
  const k = slopeLen(opts.pitch ?? R.pitch);
  const topUV = (p) => {
    const along = (p[0] - e0[0]) * dirX + (p[2] - e0[2]) * dirZ;
    const across = Math.abs((p[0] - e0[0]) * -dirZ + (p[2] - e0[2]) * dirX);
    return [(uOff + along) / ROOF_U_PERIOD, roofV(band, across * k)];
  };
  const fascia = { kind: 'solid', color: rp.kawara ? shade(R.color, -0.06) : shade(R.color, 0.04) };
  const [ev0, ev1] = roofEaveV();
  const eaveSide = rp.kawara
    ? { kind: 'roof', color: shade(R.color, 0.08), uv: (p) => [(uOff + (p[0] - e0[0]) * dirX + (p[2] - e0[2]) * dirZ) / ROOF_U_PERIOD, p[1] > top[0][1] - t * 0.5 ? ev1 : ev0] }
    : fascia;
  const sides = [eaveEdge ? eaveSide : null, verges[0] ? fascia : null, opts.ridgeSide ? fascia : null, verges[1] ? fascia : null];
  B.hexa(top, bot, {
    top: { kind: 'roof', color: R.color, uv: topUV },
    bottom: { kind: 'solid', color: P.soffit },
    sides,
  });
}

function gableRoof(c) {
  const { B, P, R, rp, hw, hd } = c;
  const e = R.eave, v = R.verge, p = R.pitch;
  const yE = rp.yWall - e * p, yr = rp.ridgeY;
  const X0 = -hw - v, X1 = hw + v;
  slab(c, [[X0, yE, hd + e], [X1, yE, hd + e], [X1, yr, 0], [X0, yr, 0]], true, [true, true]);
  slab(c, [[X1, yE, -hd - e], [X0, yE, -hd - e], [X0, yr, 0], [X1, yr, 0]], true, [true, true]);
  // barge boards (破風板) along both verges
  const bb = rp.kawara ? (P.trad ? '#5b4332' : P.trim) : P.trim;
  for (const sx of [-1, 1]) {
    const x = sx * (hw + v + 0.02);
    for (const sz of [-1, 1]) {
      B.beam('solid', [x, yE - rp.t - 0.1, sz * (hd + e + 0.02)], [x, yr - rp.t - 0.08 + 0.02, 0], 0.05, rp.t + 0.14, bb, { skip: '' });
    }
    if (rp.kawara) {
      // verge tile roll (袖瓦)
      for (const sz of [-1, 1]) B.beam('roof', [x - sx * 0.1, yE + 0.02, sz * (hd + e)], [x - sx * 0.1, yr + 0.02, 0], 0.16, 0.09, shade(R.color, 0.05));
    }
  }
  ridge(c, X0, X1, yr);
  gutters(c, [[X0, X1, hd + e, yE, 1], [X0, X1, -hd - e, yE, -1]]);
}

function hipRoof(c) {
  const { B, R, rp, hw, hd } = c;
  const e = R.eave, p = R.pitch;
  const yE = rp.yWall - e * p, yr = rp.ridgeY;
  const X0 = -hw - e, X1 = hw + e, Z0 = -hd - e, Z1 = hd + e;
  const rx = Math.max(0.001, hw - hd);
  slab(c, [[X0, yE, Z1], [X1, yE, Z1], [rx, yr, 0], [-rx, yr, 0]], true, [false, false]);
  slab(c, [[X1, yE, Z0], [X0, yE, Z0], [-rx, yr, 0], [rx, yr, 0]], true, [false, false]);
  slab(c, [[X1, yE, Z1], [X1, yE, Z0], [rx, yr, 0], [rx, yr, 0]], true, [false, false]);
  slab(c, [[X0, yE, Z0], [X0, yE, Z1], [-rx, yr, 0], [-rx, yr, 0]], true, [false, false]);
  // hip ridges
  const hc = rp.kawara ? shade(R.color, 0.06) : shade(R.color, 0.1);
  for (const [cx, cz, ex] of [[X0, Z1, -rx], [X1, Z1, rx], [X1, Z0, rx], [X0, Z0, -rx]]) {
    B.beam(rp.kawara ? 'roof' : 'solid', [cx, yE - 0.01, cz], [ex, yr, 0], rp.kawara ? 0.24 : 0.16, rp.kawara ? 0.14 : 0.05, hc);
    if (rp.kawara) B.boxC('solid', cx - Math.sign(cx) * 0.12, yE + 0.12, cz - Math.sign(cz) * 0.12, 0.22, 0.26, 0.22, shade(R.color, -0.05), { ry: Math.atan2(cx, cz) });
  }
  if (rx > 0.01) ridge(c, -rx - 0.1, rx + 0.1, yr, true);
  else B.boxC(rp.kawara ? 'roof' : 'solid', 0, yr + 0.1, 0, 0.3, 0.22, 0.3, hc);
  gutters(c, [[X0, X1, Z1, yE, 1], [X0, X1, Z0, yE, -1]], [[Z0, Z1, X0, yE, -1], [Z0, Z1, X1, yE, 1]]);
}

function shedRoof(c) {
  const { B, P, R, rp, hw, hd } = c;
  const e = R.eave, v = R.verge, p = R.pitch;
  const yE = rp.yWall - e * p; // low eave at +z
  const yH = rp.yWall + (2 * hd + e) * p; // high eave at -z
  const X0 = -hw - v, X1 = hw + v;
  slab(c, [[X0, yE, hd + e], [X1, yE, hd + e], [X1, yH, -hd - e], [X0, yH, -hd - e]], true, [true, true], { ridgeSide: true });
  // high-side fascia + barge boards
  B.box('solid', X0 - 0.03, yH - rp.t - 0.18, -hd - e - 0.05, X1 + 0.03, yH + 0.02, -hd - e, P.trim);
  for (const sx of [-1, 1]) B.beam('solid', [sx * (hw + v + 0.02), yE - rp.t - 0.1, hd + e + 0.02], [sx * (hw + v + 0.02), yH - rp.t - 0.1, -hd - e - 0.02], 0.05, rp.t + 0.14, P.trim);
  gutters(c, [[X0, X1, hd + e, yE, 1]]);
}

function leanRoof(c) {
  // canonical: eave along X at +z (low side, outer wall of the wing), high side at -z against the main wall
  const { B, P, R, rp, hw, hd } = c;
  const e = R.eave, v = R.verge, p = R.pitch;
  const yE = rp.yWall - e * p;
  const yH = rp.yWall + 2 * hd * p;
  const X0 = -hw - v, X1 = hw + v;
  slab(c, [[X0, yE, hd + e], [X1, yE, hd + e], [X1, yH, -hd], [X0, yH, -hd]], true, [true, true]);
  // flashing strip against the main wall
  B.box('solid', X0, yH - 0.02, -hd - 0.02, X1, yH + 0.1, -hd + 0.06, shade(R.color, 0.12));
  for (const sx of [-1, 1]) B.beam('solid', [sx * (hw + v + 0.02), yE - rp.t - 0.08, hd + e + 0.02], [sx * (hw + v + 0.02), yH - rp.t - 0.08, -hd], 0.04, rp.t + 0.1, P.trim);
  gutters(c, [[X0, X1, hd + e, yE, 1]]);
}

function buildFlatRoof(B, P, b) {
  // flat roof with parapet (used as a small roof terrace)
  const y = b.top;
  const c = P.zones[0].color;
  B.box('solid', b.x0 - 0.05, y, b.z0 - 0.05, b.x1 + 0.05, y + 0.18, b.z1 + 0.05, '#bfc1c2');
  const pc = P.zones[0];
  const uv = (f, p) => [(p[0] + p[2]) / WALL_U_PERIOD, wallV(pc.band, p[1] - FOUND)];
  B.box('wall', b.x1 - 0.12, y, b.z0, b.x1 + 0.05, y + 0.5, b.z1 + 0.05, c, { uv });
  B.box('wall', b.x0, y, b.z1 - 0.12, b.x1 + 0.05, y + 0.5, b.z1 + 0.05, c, { uv });
  B.box('wall', b.x0, y, b.z0 - 0.05, b.x1 + 0.05, y + 0.5, b.z0 + 0.07, c, { uv });
  B.box('metal', b.x0, y + 0.5, b.z1 - 0.13, b.x1 + 0.07, y + 0.54, b.z1 + 0.07, '#9aa1a8');
  B.box('metal', b.x1 - 0.13, y + 0.5, b.z0 - 0.07, b.x1 + 0.07, y + 0.54, b.z1 + 0.07, '#9aa1a8');
  // aluminium railing on the parapet
  const ry = y + 0.54, rh = 0.55;
  B.box('metal', b.x0, ry + rh, b.z1 - 0.06, b.x1 + 0.02, ry + rh + 0.04, b.z1 - 0.01, '#b9bec4');
  B.box('metal', b.x1 - 0.06, ry + rh, b.z0, b.x1 - 0.01, ry + rh + 0.04, b.z1, '#b9bec4');
  for (let x = b.x0 + 0.4; x < b.x1; x += 0.9) B.box('small', x, ry, b.z1 - 0.05, x + 0.03, ry + rh, b.z1 - 0.02, '#b9bec4');
  // drain spout
  B.box('solid', b.x1 + 0.05, y + 0.05, b.z1 - 0.6, b.x1 + 0.3, y + 0.12, b.z1 - 0.5, '#9aa1a8');
  B.cyl('solid', [b.x1 + 0.25, y + 0.05, b.z1 - 0.55], [b.x1 + 0.25, P.gy(b.x1 + 0.25, b.z1 - 0.55) + 0.1, b.z1 - 0.55], 0.04, P.gutter, 6);
}

/** Ridge (棟): stacked kawara layers + round cap + onigawara, or a metal cap. */
function ridge(c, X0, X1, yr, hip = false) {
  const { B, R, rp } = c;
  if (!rp.kawara) {
    B.box('solid', X0 - 0.02, yr - 0.03, -0.14, X1 + 0.02, yr + 0.06, 0.14, shade(R.color, 0.1));
    return;
  }
  const dc = shade(R.color, -0.04), lc = shade(R.color, 0.08);
  B.box('roof', X0 + 0.05, yr - 0.08, -0.2, X1 - 0.05, yr + 0.07, 0.2, dc, { uv: () => [0.1, roofV('kawara', 0.1)] });
  B.box('solid', X0 + 0.08, yr + 0.07, -0.16, X1 - 0.08, yr + 0.17, 0.16, lc);
  B.box('solid', X0 + 0.1, yr + 0.17, -0.13, X1 - 0.1, yr + 0.25, 0.13, dc);
  B.cyl('roof', [X0 + 0.1, yr + 0.26, 0], [X1 - 0.1, yr + 0.26, 0], 0.1, lc, 8, { caps: true });
  if (!hip) {
    // onigawara at both ends
    for (const x of [X0 + 0.12, X1 - 0.12]) {
      B.boxC('solid', x, yr + 0.2, 0, 0.12, 0.5, 0.52, shade(R.color, -0.08));
      B.boxC('solid', x, yr + 0.5, 0, 0.12, 0.14, 0.34, shade(R.color, -0.08));
      B.boxC('small', x + Math.sign(x) * 0.065, yr + 0.26, 0, 0.02, 0.14, 0.14, shade(R.color, 0.15));
    }
  }
}

/**
 * Gutters along eaves (canonical frame).  runsX: [x0, x1, z, yEaveTop, sideSign]
 * (gutter parallel to X), runsZ: [z0, z1, x, yEaveTop, sideSign].
 * Downpipes drop at the run ends to a drain box at the foot of the wall.
 */
function gutters(c, runsX, runsZ = []) {
  const { B, P, rp, hw, hd, ground, b } = c;
  if (P.lod === 'simple') return;
  const gc = P.gutter;
  const dy = rp.t + 0.02;
  const r = makeRngLite(P.seed + b.x0 * 13);
  const pipeAt = (px, pz, wx, wz, y) => {
    // px,pz: outlet on the gutter; wx,wz: point on the wall surface below
    const gY = ground(wx, wz);
    const bend = y - 0.25;
    const pts = [[px, y, pz], [px, bend, pz], [wx, bend - 0.45, wz], [wx, gY + 0.18, wz]];
    B.pipe('solid', pts, 0.042, gc, 6);
    // brackets
    for (let yy = bend - 1.2; yy > gY + 0.6; yy -= 1.5) B.boxC('small', wx, yy, wz, 0.12, 0.03, 0.12, shade(gc, -0.15));
    // drain box / elbow at the foot
    B.boxC('solid', wx, gY + 0.05, wz, 0.3, 0.12, 0.3, '#a9a7a1');
  };
  for (const [x0, x1, z, yE, sgn] of runsX) {
    const zz = z + sgn * 0.07;
    B.box('solid', x0, yE - dy - 0.11, Math.min(zz - 0.065, zz + 0.065), x1, yE - dy, Math.max(zz - 0.065, zz + 0.065), gc);
    B.box('small', x0, yE - dy - 0.005, Math.min(zz - 0.075, zz + 0.075), x1, yE - dy + 0.012, Math.max(zz - 0.075, zz + 0.075), shade(gc, 0.08));
    // one or two downpipes
    const ends = r() < 0.5 ? [x0 + 0.25] : [x1 - 0.25];
    if (x1 - x0 > 9 && r() < 0.6) ends.push(ends[0] < 0 ? x1 - 0.25 : x0 + 0.25);
    for (const px of ends) {
      const wx = Math.max(-hw + 0.12, Math.min(hw - 0.12, px));
      pipeAt(px, zz, wx, sgn * (hd + 0.07), yE - dy - 0.05);
    }
  }
  for (const [z0, z1, x, yE, sgn] of runsZ) {
    const xx = x + sgn * 0.07;
    B.box('solid', Math.min(xx - 0.065, xx + 0.065), yE - dy - 0.11, z0, Math.max(xx - 0.065, xx + 0.065), yE - dy, z1, gc);
  }
}

function makeRngLite(seed) {
  let a = (Math.floor(Math.abs(seed)) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 1F front eave (下屋庇 / 一文字庇) across the main front facade of
 * traditional two-storey houses: a shallow kawara or metal lean-to between
 * the floors, with its own gutter.
 */
export function buildFrontEave(B, P) {
  const f = P.facade('main', 'front');
  const b = P.main;
  const R = { color: b.roof.color, pitch: 0.36 };
  const rp = { kawara: b.roof.mat === 'kawara', t: b.roof.mat === 'kawara' ? 0.14 : 0.08 };
  const c = { B, P, R, rp, b };
  B.push(facadeMatrix(f));
  const d = 0.85, yT = FOUND + STOREY + 0.32, yE = yT - d * R.pitch;
  const a = -0.25, e = f.L + 0.25;
  // canonical slab: eave edge along +u at z = d, high side against the wall
  slab(c, [[a, yE, d], [e, yE, d], [e, yT, 0], [a, yT, 0]], true, [true, true], { t: rp.t });
  B.box('solid', a, yT - 0.02, -0.01, e, yT + 0.08, 0.05, shade(R.color, 0.12));
  B.box('solid', a, yE - rp.t - 0.1, d + 0.02, e, yE - rp.t, d + 0.12, P.gutter);
  B.pop();
}
