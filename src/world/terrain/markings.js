/**
 * terrain/markings — road paint from layout.ROAD_MARKINGS plus the standard
 * furniture of Japanese streets:
 *   white edge lines, the orange centre line of the station-front road,
 *   zebra crossings, stop lines, 止まれ / スピード落とせ / 通学路 / 踏切注意
 *   (characters stretched ~1.6x along the travel direction, first character
 *   nearest the reader), ◇ crossing-ahead diamond, bicycle navigation marks,
 *   pedestrian pictogram, green school-route shoulders, yellow 消火栓 boxes,
 *   a yellow バス stop marking and bicycle-parking lines on the konbini forecourt.
 * All paint is one mesh (atlas texture, transparent, polygon offset, noOutline).
 */
import { ROAD_MARKINGS, PLAZA } from '../../core/layout.js';
import { LIFT, SF, CR, NR, MS, MS_S0, MS_S1, CR_SEGMENTS, cornerById, straightPoint, groundY, hash2 } from './common.js';
import { ZEBRA_SF, KONBINI_LIFT } from './paving.js';

export const MARK_WHITE_CHARS = [...new Set('止まれスピード落とせ通学路踏切注意')];
export const MARK_YELLOW_CHARS = [...new Set('消火栓バス')];

const roadMarkY = (x, z) => groundY(x, z) + LIFT.mark;
/** Paint is kept a little below white so the sunlit lines don't bloom. */
const PAINT_TINT = [0.9, 0.9, 0.9];

/**
 * A decal quad following the ground: centre (x,z), `dir` = unit (dx,dz) the
 * texture's top points to, `len` along dir, `wid` across.  uv = [u0,v0,u1,v1].
 */
export function surfaceQuad(b, x, z, dx, dz, len, wid, uv, yFn, color = PAINT_TINT) {
  const px = -dz, pz = dx; // right-hand side when looking along dir (u grows to the right)
  const nv = Math.max(1, Math.ceil(len / 1.2)), nu = Math.max(1, Math.ceil(wid / 1.5));
  b.grid(nu, nv, (i, j) => {
    const a = (j / nv - 0.5) * len, c = (i / nu - 0.5) * wid;
    const wx = x + dx * a + px * c, wz = z + dz * a + pz * c;
    return [wx, yFn(wx, wz), wz, uv[0] + (uv[2] - uv[0]) * (i / nu), uv[1] + (uv[3] - uv[1]) * (j / nv), color];
  });
}

// ---------------------------------------------------------------------------
// street frames: position by (street, coordinate) -> point + tangent
// ---------------------------------------------------------------------------
/** Returns {x, z, tx, tz, nx, nz}: t along the street (+z for main/crossing, +x for station-front), n = lateral +. */
function frameOf(street, along, lateral) {
  if (street === 'main') {
    const f = MS.atZ(along);
    return { x: f.x + f.nx * lateral, z: f.z + f.nz * lateral, tx: f.tx, tz: f.tz, nx: f.nx, nz: f.nz };
  }
  if (street === 'crossing') return { x: CR.x + lateral, z: along, tx: 0, tz: 1, nx: 1, nz: 0 };
  if (street === 'north') return { x: along, z: NR.z + lateral, tx: 1, tz: 0, nx: 0, nz: 1 };
  return { x: along, z: SF.z + lateral, tx: 1, tz: 0, nx: 0, nz: 1 }; // stationFront (lateral + = south)
}

/** Unit direction a reader approaching from `readFrom` travels along. */
function readDir(street, f, readFrom) {
  // main/crossing: +t points south; station-front: +t points east
  const sign = { south: -1, north: 1, west: 1, east: -1 }[readFrom] ?? 1;
  return { dx: f.tx * sign, dz: f.tz * sign };
}

/** Characters stretched along the travel direction, first character nearest the reader. */
function roadText(b, atlas, text, street, along, lateral, readFrom, { cw = 1.1, cl = 1.6, gap = 0.3, color = 'w' } = {}) {
  const chars = [...text];
  const f = frameOf(street, along, lateral);
  const { dx, dz } = readDir(street, f, readFrom);
  const total = chars.length * cl + (chars.length - 1) * gap;
  chars.forEach((ch, i) => {
    const off = -total / 2 + i * (cl + gap) + cl / 2;
    const x = f.x + dx * off, z = f.z + dz * off;
    surfaceQuad(b, x, z, dx, dz, cl, cw, atlas.cell(`${color}:${ch}`, 4), roadMarkY);
  });
  return total;
}

/** A painted line along a street between along-coords a0..a1 at `lateral`, in ~1 m pieces. */
function lineAlong(b, atlas, street, a0, a1, lateral, width, cellName = 'white', dash = null) {
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  const seg = dash ? dash[0] : 1.0;
  const period = dash ? dash[0] + dash[1] : 1.0;
  for (let a = lo; a < hi - 0.05; a += period) {
    const e = Math.min(hi, a + seg);
    const mid = (a + e) / 2;
    const f = frameOf(street, mid, lateral);
    const pa = frameOf(street, a, lateral), pe = frameOf(street, e, lateral);
    const len = Math.hypot(pe.x - pa.x, pe.z - pa.z) + 0.01;
    const cell = hash2(Math.floor(a * 7), Math.floor(lateral * 10), 55) < 0.25 ? 'white2' : cellName;
    surfaceQuad(b, f.x, f.z, f.tx, f.tz, len, width, atlas.cell(cellName === 'white' ? cell : cellName, 20), roadMarkY);
  }
}

/** Line along the main street by arc length (for the curved edge lines / green shoulders). */
function mainLine(b, atlas, s0, s1, lateral, width, cellName = 'white', yFn = roadMarkY) {
  for (let s = s0; s < s1 - 0.05; s += 1.0) {
    const e = Math.min(s1, s + 1.0);
    const fa = MS.atS(s), fe = MS.atS(e), fm = MS.atS((s + e) / 2);
    const ax = fa.x + fa.nx * lateral, az = fa.z + fa.nz * lateral;
    const ex = fe.x + fe.nx * lateral, ez = fe.z + fe.nz * lateral;
    const len = Math.hypot(ex - ax, ez - az) + 0.012;
    const cell = cellName === 'white' && hash2(Math.floor(s), Math.floor(lateral * 10), 56) < 0.25 ? 'white2' : cellName;
    surfaceQuad(b, fm.x + fm.nx * lateral, fm.z + fm.nz * lateral, fm.tx, fm.tz, len, width, atlas.cell(cell, 20), yFn);
  }
}

function zebra(b, atlas, street, center, length, halfSpan) {
  for (let d = -halfSpan + 0.3; d <= halfSpan - 0.25; d += 0.9) {
    const f = frameOf(street, center, d);
    surfaceQuad(b, f.x, f.z, f.tx, f.tz, length, 0.45, atlas.cell(Math.abs(d) < 1.5 ? 'white2' : 'white', 20), roadMarkY);
  }
}

function stopLine(b, atlas, street, along, lateral, width) {
  const f = frameOf(street, along, lateral);
  surfaceQuad(b, f.x, f.z, f.tx, f.tz, 0.35, width, atlas.cell('white', 20), roadMarkY);
}

/** ◇ outline (four painted strokes). */
function diamond(b, atlas, street, along, lateral, readFrom) {
  const f = frameOf(street, along, lateral);
  const { dx, dz } = readDir(street, f, readFrom);
  const px = dz, pz = -dx;
  const L = 4.0, W = 1.3;
  const tip = [
    { a: -L / 2, c: 0 }, { a: 0, c: W / 2 }, { a: L / 2, c: 0 }, { a: 0, c: -W / 2 },
  ];
  for (let i = 0; i < 4; i++) {
    const p = tip[i], q = tip[(i + 1) % 4];
    const x0 = f.x + dx * p.a + px * p.c, z0 = f.z + dz * p.a + pz * p.c;
    const x1 = f.x + dx * q.a + px * q.c, z1 = f.z + dz * q.a + pz * q.c;
    const len = Math.hypot(x1 - x0, z1 - z0);
    surfaceQuad(b, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / len, (z1 - z0) / len, len + 0.12, 0.15, atlas.cell('white', 20), roadMarkY);
  }
}

function pictogram(b, atlas, name, street, along, lateral, readFrom, len, wid, withArrow = false) {
  const f = frameOf(street, along, lateral);
  const { dx, dz } = readDir(street, f, readFrom);
  surfaceQuad(b, f.x, f.z, dx, dz, len, wid, atlas.cell(name, 6), roadMarkY);
  if (withArrow) {
    const o = len / 2 + 0.55;
    surfaceQuad(b, f.x + dx * o, f.z + dz * o, dx, dz, 0.8, 0.5, atlas.cell('arrow', 6), roadMarkY);
  }
}

/** Yellow hydrant box: outline + 消火栓 (the lid itself is a decal). Returns lid position. */
function hydrantBox(b, atlas, street, along, lateral, readFrom) {
  const f = frameOf(street, along, lateral);
  const { dx, dz } = readDir(street, f, readFrom);
  const px = dz, pz = -dx;
  const L = 2.6, W = 1.0;
  const Y = atlas.cell('yellow', 20);
  const edge = (a0, c0, a1, c1) => {
    const x0 = f.x + dx * a0 + px * c0, z0 = f.z + dz * a0 + pz * c0;
    const x1 = f.x + dx * a1 + px * c1, z1 = f.z + dz * a1 + pz * c1;
    const len = Math.hypot(x1 - x0, z1 - z0);
    surfaceQuad(b, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / len, (z1 - z0) / len, len + 0.12, 0.12, Y, roadMarkY);
  };
  edge(-L / 2, -W / 2, L / 2, -W / 2);
  edge(-L / 2, W / 2, L / 2, W / 2);
  edge(-L / 2, -W / 2, -L / 2, W / 2);
  edge(L / 2, -W / 2, L / 2, W / 2);
  // characters stacked from the reader's side, lid at the far end
  [...'消火栓'].forEach((ch, i) => {
    const a = -L / 2 + 0.35 + i * 0.52;
    surfaceQuad(b, f.x + dx * a, f.z + dz * a, dx, dz, 0.48, 0.62, atlas.cell(`y:${ch}`, 4), roadMarkY);
  });
  const a = L / 2 - 0.5;
  return { x: f.x + dx * a, z: f.z + dz * a, dx, dz };
}

export function buildMarkings(bins, atlas, konbini) {
  const b = bins.get('marks');
  const hydrants = [];
  // ---- layout markings ----------------------------------------------------
  for (const m of ROAD_MARKINGS) {
    const along = m.street === 'stationFront' ? m.x : m.z;
    if (m.type === 'zebra') {
      if (m.street === 'main') zebra(b, atlas, 'main', m.z, m.length, MS.halfWidth);
      else zebra(b, atlas, 'stationFront', m.x, m.length, SF.halfWidth);
    } else if (m.type === 'stopLine') {
      stopLine(b, atlas, m.street, along, m.lateral, m.width);
    } else if (m.type === 'tomare') {
      if (m.street === 'crossing' && m.z < -40) {
        // squeezed between the stop line and the north-road junction
        roadText(b, atlas, '止まれ', 'crossing', -44.35, m.lateral, m.readFrom, { cw: 1.0, cl: 1.05, gap: 0.2 });
      } else {
        roadText(b, atlas, '止まれ', m.street, along, m.lateral, m.readFrom, { cw: m.street === 'crossing' ? 1.05 : 1.2, cl: 1.6, gap: 0.3 });
      }
    } else if (m.type === 'text') {
      const n = [...m.text].length;
      const opt = n > 4 ? { cw: 1.0, cl: 1.45, gap: 0.22 } : { cw: m.street === 'crossing' ? 1.0 : 1.15, cl: 1.7, gap: 0.3 };
      roadText(b, atlas, m.text, m.street, along, m.lateral, m.readFrom, opt);
    } else if (m.type === 'diamond') {
      diamond(b, atlas, m.street, along, m.lateral, m.readFrom);
    } else if (m.type === 'bicycle') {
      pictogram(b, atlas, 'bicycle', m.street, along, m.lateral, m.readFrom, 1.25, 0.72, true);
    } else if (m.type === 'pedestrian') {
      pictogram(b, atlas, 'pedestrian', m.street, along, m.lateral, m.readFrom, 1.15, 0.7);
    }
  }

  // ---- edge / centre lines --------------------------------------------------
  const mW = cornerById('mainW'), mE = cornerById('mainE');
  const cSW = cornerById('crSW'), cSE = cornerById('crSE'), cNW = cornerById('crNW'), cNE = cornerById('crNE');
  const sEdge0 = MS.atZ(14.1).s;
  // main street: white edge lines (school-route section gets a green shoulder too)
  const greenZ = [62, 132];
  const gs0 = MS.atZ(greenZ[0]).s, gs1 = MS.atZ(greenZ[1]).s;
  for (const side of [-1, 1]) {
    mainLine(b, atlas, sEdge0, MS_S1 - 1, side * MS.edgeLine, 0.15);
    mainLine(b, atlas, gs0, gs1, side * 3.52, 0.86, 'green');
  }
  // station-front road
  const sfW = SF.edgeLine;
  const brk = (ranges, a0, a1) => {
    // split [a0,a1] by removing the given ranges
    let segs = [[a0, a1]];
    for (const [r0, r1] of ranges) {
      segs = segs.flatMap(([s0, s1]) => (r1 <= s0 || r0 >= s1 ? [[s0, s1]] : [[s0, r0], [r1, s1]].filter(([p, q]) => q - p > 0.3)));
    }
    return segs;
  };
  for (const [a0, a1] of brk([[mW.K.x - mW.R - 0.3, mE.K.x + mE.R + 0.3], [ZEBRA_SF.x0, ZEBRA_SF.x1]], SF.from + 2, SF.to - 2)) lineAlong(b, atlas, 'stationFront', a0, a1, sfW, 0.15);
  for (const [a0, a1] of brk([[ZEBRA_SF.x0, ZEBRA_SF.x1], [cSW.K.x - cSW.R - 0.3, cSE.K.x + cSE.R + 0.3]], SF.from + 2, SF.to - 2)) lineAlong(b, atlas, 'stationFront', a0, a1, -sfW, 0.15);
  for (const [a0, a1] of brk([[ZEBRA_SF.x0 - 0.8, ZEBRA_SF.x1 + 0.8]], SF.from + 2, SF.to - 2)) lineAlong(b, atlas, 'stationFront', a0, a1, 0, 0.15, 'orange');
  // crossing road (stop before the deck, leave the stop-line area)
  for (const seg of CR_SEGMENTS) {
    const lo = Math.min(seg.z0, seg.z1), hi = Math.max(seg.z0, seg.z1);
    const top = seg.z1 < -40 ? hi - 0.8 : hi - Math.max(cSW.R, cSE.R) - 0.3;
    const bot = seg.z1 < -40 ? lo + Math.max(cNW.R, cNE.R) + 0.3 : lo + 0.8;
    if (top > bot) for (const side of [-1, 1]) lineAlong(b, atlas, 'crossing', bot, top, side * CR.edgeLine, 0.14);
  }
  // north road
  for (const [a0, a1] of [[NR.from + 2, NR.to - 1]]) lineAlong(b, atlas, 'north', a0, a1, -NR.edgeLine, 0.14);
  for (const [a0, a1] of brk([[cNW.K.x - cNW.R - 0.3, cNE.K.x + cNE.R + 0.3]], NR.from + 2, NR.to - 1)) lineAlong(b, atlas, 'north', a0, a1, NR.edgeLine, 0.14);

  // ---- extras owned by the terrain -----------------------------------------
  // bus stop: yellow バス on the eastbound (north) lane in front of the stop, box outline dashed
  roadText(b, atlas, 'バス', 'stationFront', PLAZA.busStop.x, -1.6, 'west', { cw: 1.2, cl: 1.5, gap: 0.3, color: 'y' });
  for (const [a0, a1] of [[PLAZA.busStop.x - 6, PLAZA.busStop.x + 6]]) {
    lineAlong(b, atlas, 'stationFront', a0, a1, -0.35, 0.12, 'yellow', [0.9, 0.6]);
  }
  // hydrant boxes
  hydrants.push(hydrantBox(b, atlas, 'main', 66, 2.25, 'north'));
  hydrants.push(hydrantBox(b, atlas, 'stationFront', -46, 2.2, 'east'));
  hydrants.push(hydrantBox(b, atlas, 'north', -22, -1.5, 'west'));
  // pedestrian pictogram inside the green school-route shoulder
  pictogram(b, atlas, 'pedestrian', 'main', 112, 3.52, 'north', 1.1, 0.66);
  pictogram(b, atlas, 'pedestrian', 'main', 104, -3.52, 'south', 1.1, 0.66);

  // konbini: bicycle-parking lines on the forecourt
  if (konbini) {
    const { lot, d1 } = konbini;
    const yK = (x, z) => groundY(x, z) + KONBINI_LIFT + 0.004;
    for (let s = lot.s + 2.2; s <= lot.s + 6.8; s += 0.7) {
      const f = MS.atS(s);
      const dm = d1 - 0.95;
      const x = f.x + f.nx * dm, z = f.z + f.nz * dm;
      surfaceQuad(b, x, z, f.nx, f.nz, 1.5, 0.07, atlas.cell('white', 20), yK);
    }
    // front line of the bike bay
    const fa = MS.atS(lot.s + 4.5);
    const dm = d1 - 1.75;
    surfaceQuad(b, fa.x + fa.nx * dm, fa.z + fa.nz * dm, fa.tx, fa.tz, 4.7, 0.07, atlas.cell('white', 20), yK);
  }
  return { hydrants };
}

export { straightPoint };
