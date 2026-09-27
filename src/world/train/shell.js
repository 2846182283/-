/**
 * Car body shell: side walls (painted in horizontal bands so the sakura
 * stripe / roofline band have crisp edges), window & door openings with
 * reveals, window frames + glass, roof, the rounded cab front with its black
 * mask / windscreen / lamp housings / skirt / coupler, and the plain car ends
 * with gangway, bellows, drawbar and jumper cables.
 *
 * Everything is written into a Parts accumulator in CAR-LOCAL coordinates
 * (cab end at +X).
 */
import * as THREE from 'three';
import { PALETTE } from '../../core/palette.js';
import { STATION } from '../../core/layout.js';
import { D, DOORS, CREW_DOOR, CAB, Y_ROWS, BROW_F, Z_COLS, roofY, roofNormal, xFront, frontNormal } from './dims.js';
import { roundRectPath, extrude } from './parts.js';

export const COL = {
  // PALETTE.trainCream (#f5f1e6) clips to flat peach-white in the warm 4 pm sun;
  // the body uses a ~6% darker, more neutral cream (the warm sun + grade add the
  // yellow back) so panel shading survives.
  cream: '#e9e5dc',
  pink: STATION.lineColor,
  pinkBand: PALETTE.trainPink,
  roof: '#c3c7cc',
  mask: '#33353d',
  frame: '#c2c7ce',
  dark: '#3d4149',
  darker: '#2c2e34',
  grey: '#7b818a',
  lining: '#eee8dc',
  bellows: '#3e4148',
};

// ---------------------------------------------------------------------------
// layout of openings along a car side
// ---------------------------------------------------------------------------
/** Door + window openings for a car kind (car-local x). */
export function openingsFor(kind) {
  const doors = DOORS[kind];
  const ops = doors.map((dx) => ({ a: dx - D.doorHalf, b: dx + D.doorHalf, lo: D.floorY, hi: D.doorTop, type: 'door', dx }));
  if (kind === 'cab') ops.push({ ...CREW_DOOR, type: 'crew' });
  const wins = [];
  const m = D.doorHalf + D.pocket + 0.04;
  for (let i = 0; i < doors.length - 1; i++) {
    const s0 = doors[i] + m, s1 = doors[i + 1] - m, mid = (s0 + s1) / 2;
    wins.push({ a: s0, b: mid - 0.05, type: 'win', bay: i, pos: 0 }, { a: mid + 0.05, b: s1, type: 'win', bay: i, pos: 1 });
  }
  const r0 = -D.bodyHalf + 0.3, r1 = doors[0] - m;
  if (r1 - r0 > 0.35) wins.push({ a: r0, b: r1, type: 'end', end: -1 });
  if (kind === 'mid') wins.push({ a: doors[doors.length - 1] + m, b: D.bodyHalf - 0.3, type: 'end', end: 1 });
  else {
    const a = CREW_DOOR.b + 0.14;
    wins.push({ type: 'cab', a, b: xFront(D.win[0], D.hw) - 0.2, poly: [[a, D.win[0]], [xFront(D.win[0], D.hw) - 0.2, D.win[0]], [xFront(3.3, D.hw) - 0.2, 3.3], [a, 3.3]] });
  }
  for (const w of wins) { if (w.type !== 'cab') { w.lo = D.win[0]; w.hi = D.win[1]; } else { w.lo = D.win[0]; w.hi = 3.3; } }
  return { ops, wins, doors };
}

/** Path of a window outline in "u" coordinates (u = side * x), inset metres inward. */
function windowPath(w, side, inset = 0) {
  const p = new THREE.Path();
  if (w.poly) {
    const pts = w.poly.map(([x, y], k) => {
      const ix = k === 0 || k === 3 ? inset : -inset;
      const iy = k < 2 ? inset : -inset;
      return [side * (x + ix), y + iy];
    });
    if (side < 0) pts.reverse();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) p.lineTo(pts[k][0], pts[k][1]);
    p.closePath();
    return p;
  }
  const a = side > 0 ? w.a : -w.b, b = side > 0 ? w.b : -w.a;
  return roundRectPath(p, a + inset, w.lo + inset, b - inset, w.hi - inset, 0.1 - inset);
}

/**
 * Build the shape(s) of one horizontal wall band [y0,y1] in u coordinates.
 * uL(y) / uR(y): end edges. ops: door-like openings {a,b,lo,hi} (u). holes: [{a,b,path}] fully inside.
 */
function bandShapes(y0, y1, uL, uR, ops, holes) {
  const eps = 1e-5;
  const hit = ops.filter((o) => o.lo < y1 - eps && o.hi > y0 + eps).sort((p, q) => p.a - q.a);
  const full = hit.filter((o) => o.lo <= y0 + eps && o.hi >= y1 - eps);
  const segs = [];
  let start = null;
  for (const o of full) { segs.push([start, o.a]); start = o.b; }
  segs.push([start, null]);
  const rows = Y_ROWS.filter((y) => y > y0 + eps && y < y1 - eps);
  const shapes = [];
  for (const [s0, s1] of segs) {
    const L = (y) => (s0 === null ? uL(y) : s0);
    const R = (y) => (s1 === null ? uR(y) : s1);
    const inSeg = (o) => o.a > L(y0) - eps && o.b < R(y0) + eps && !full.includes(o);
    const pts = [[L(y0), y0]];
    for (const o of hit) if (inSeg(o) && o.lo <= y0 + eps) pts.push([o.a, y0], [o.a, o.hi], [o.b, o.hi], [o.b, y0]);
    pts.push([R(y0), y0]);
    for (const y of rows) pts.push([R(y), y]);
    pts.push([R(y1), y1]);
    for (let k = hit.length - 1; k >= 0; k--) {
      const o = hit[k];
      if (inSeg(o) && o.hi >= y1 - eps && o.lo > y0 + eps) pts.push([o.b, y1], [o.b, o.lo], [o.a, o.lo], [o.a, y1]);
    }
    pts.push([L(y1), y1]);
    for (let k = rows.length - 1; k >= 0; k--) pts.push([L(rows[k]), rows[k]]);
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) if (h.a > L(y0) && h.b < R(y0) && h.lo > y0 && h.hi < y1) shape.holes.push(h.path);
    shapes.push(shape);
  }
  return shapes;
}

/** Hand-painted weathering: darken / warm vertex colours towards y0 (factor k at y0, 1 at y1). */
function weather(g, y0, y1, k) {
  const pos = g.attributes.position, col = g.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    const f = k + (1 - k) * Math.pow(t, 0.7);
    col.setXYZ(i, col.getX(i) * f, col.getY(i) * (f * 0.99), col.getZ(i) * (f * 0.96));
  }
}

// ---------------------------------------------------------------------------
// side walls, lining, frames, glass, reveals
// ---------------------------------------------------------------------------
export function sideWalls(P, kind) {
  const { ops, wins } = openingsFor(kind);
  const xRight = kind === 'cab' ? (y) => xFront(y, D.hw) : () => D.bodyHalf;
  const xLeft = () => -D.bodyHalf;
  const bands = [
    [D.bodyBottom, D.stripe[0], COL.cream],
    [D.stripe[0], D.stripe[1], COL.pink],
    [D.stripe[1], D.band[0], COL.cream],
    [D.band[0], D.band[1], COL.pinkBand],
    [D.band[1], D.wallTop, COL.cream],
  ];
  for (const side of [1, -1]) {
    const uL = side > 0 ? xLeft : (y) => -xRight(y);
    const uR = side > 0 ? xRight : (y) => -xLeft(y);
    const uOps = ops.map((o) => (side > 0 ? o : { ...o, a: -o.b, b: -o.a }));
    const holes = wins.map((w) => ({ a: side > 0 ? w.a : -w.b, b: side > 0 ? w.b : -w.a, lo: w.lo, hi: w.hi, path: windowPath(w, side) }));
    const fin = (g) => { g.translate(0, 0, D.wallIn); if (side < 0) g.rotateY(Math.PI); return g; };
    for (const [y0, y1, col] of bands) {
      for (const s of bandShapes(y0, y1, uL, uR, uOps, holes)) {
        const g = P.add('body', fin(extrude(s, D.hw - D.wallIn, 3)), col);
        if (y0 === D.bodyBottom) weather(g, y0, y1, 0.86); // soft brake-dust grime near the bottom
      }
    }
    // interior lining (floor -> wall top), stops at the cab partition
    const liningR = kind === 'cab' ? () => (side > 0 ? D.cabBack : D.bodyHalf - 0.08) : () => D.bodyHalf - 0.08;
    const liningL = kind === 'cab' ? () => (side > 0 ? -D.bodyHalf + 0.08 : -D.cabBack) : () => -D.bodyHalf + 0.08;
    const lOps = uOps.filter((o) => o.type === 'door');
    const lHoles = wins.filter((w) => w.type !== 'cab').map((w) => {
      const a = side > 0 ? w.a : -w.b, b = side > 0 ? w.b : -w.a;
      const path = new THREE.Path();
      path.moveTo(a, w.lo); path.lineTo(b, w.lo); path.lineTo(b, w.hi); path.lineTo(a, w.hi); path.closePath();
      return { a, b, lo: w.lo, hi: w.hi, path };
    });
    for (const s of bandShapes(D.floorY, D.wallTop, liningL, liningR, lOps, lHoles)) {
      const g = extrude(s, D.liningOut - D.liningIn, 1);
      g.translate(0, 0, D.liningIn);
      if (side < 0) g.rotateY(Math.PI);
      P.add('body', g, COL.lining);
    }
    // window frames (recessed silver ring spanning lining -> wall) + glass
    for (const w of wins) {
      const outer = windowPath(w, side, 0);
      const ring = new THREE.Shape(outer.getPoints(3));
      ring.holes.push(windowPath(w, side, 0.04));
      const g = extrude(ring, 0.1, 3);
      g.translate(0, 0, D.liningIn);
      if (side < 0) g.rotateY(Math.PI);
      P.add('body', g, COL.frame);
      const gl = new THREE.ShapeGeometry(new THREE.Shape(windowPath(w, side, 0.035).getPoints(3)));
      gl.translate(0, 0, D.liningIn + 0.085);
      if (side < 0) gl.rotateY(Math.PI);
      P.add('glass', gl);
    }
    // door reveals: split posts / header leave a slot for the leaf to slide into its pocket
    for (const o of ops) {
      if (o.type === 'door') {
        // threshold plate (steel) + yellow warning line on the floor just inside
        P.box('metal', o.b - o.a, 0.03, 0.16, (o.a + o.b) / 2, D.floorY - 0.012, side * (D.hw - 0.07), '#aeb3ba');
        P.box('body', o.b - o.a - 0.06, 0.008, 0.07, (o.a + o.b) / 2, D.floorY + 0.004, side * (D.liningIn - 0.07), PALETTE.tactileYellow);
        // thin yellow edge lines on the door posts (safety marking)
        for (const x of [o.a, o.b]) P.box('bodyNO', 0.012, o.hi - o.lo - 0.1, 0.004, x + (x === o.a ? -0.006 : 0.006), (o.lo + o.hi) / 2 - 0.03, side * (D.liningIn - 0.003), '#f2c230');
      } else {
        // crew door: full-depth reveal, static recessed door with a small window
        for (const x of [o.a, o.b]) P.box('body', 0.03, o.hi - o.lo, D.hw - D.liningIn, x + (x === o.a ? 0.015 : -0.015), (o.lo + o.hi) / 2, side * (D.hw + D.liningIn) / 2, COL.cream);
        P.box('body', o.b - o.a, 0.03, D.hw - D.liningIn, (o.a + o.b) / 2, o.hi - 0.015, side * (D.hw + D.liningIn) / 2, COL.cream);
        const sh = new THREE.Shape();
        const ua = side > 0 ? o.a : -o.b, ub = side > 0 ? o.b : -o.a;
        sh.moveTo(ua, o.lo); sh.lineTo(ub, o.lo); sh.lineTo(ub, o.hi); sh.lineTo(ua, o.hi); sh.closePath();
        const hole = roundRectPath(new THREE.Path(), ua + 0.1, 2.5, ub - 0.1, 3.25, 0.06);
        sh.holes.push(hole);
        const g = extrude(sh, 0.03, 3);
        g.translate(0, 0, D.leafZ - 0.015);
        if (side < 0) g.rotateY(Math.PI);
        P.add('body', g, COL.cream);
        const gl = new THREE.ShapeGeometry(new THREE.Shape(roundRectPath(new THREE.Path(), ua + 0.1, 2.5, ub - 0.1, 3.25, 0.06).getPoints(3)));
        gl.translate(0, 0, D.leafZ + 0.02);
        if (side < 0) gl.rotateY(Math.PI);
        P.add('glass', gl);
        // grab handle beside the crew door
        P.box('metalNO', 0.025, 0.5, 0.025, o.b + 0.1, 2.35, side * (D.hw + 0.04), '#c9ccd0');
        P.box('body', o.b - o.a, 0.05, 0.06, (o.a + o.b) / 2, 1.6, side * (D.hw + 0.01), COL.dark); // step
      }
    }
    // gutter along the roof edge
    const gx1 = kind === 'cab' ? xFront(3.64, D.hw) - 0.02 : D.bodyHalf;
    P.box('body', gx1 + D.bodyHalf, 0.035, 0.035, (gx1 - D.bodyHalf) / 2, 3.64, side * (D.hw + 0.012), '#d9dcdf');
    // side sill (dark line under the body)
    const sx1 = kind === 'cab' ? 8.35 : D.bodyHalf;
    P.box('body', sx1 + D.bodyHalf, 0.12, 0.05, (sx1 - D.bodyHalf) / 2, 1.22, side * 1.33, COL.dark);
  }
  return { ops, wins };
}

// ---------------------------------------------------------------------------
// roof surface
// ---------------------------------------------------------------------------
export function roof(P, kind) {
  const pos = [], nrm = [], idx = [];
  const x0 = -D.bodyHalf;
  const xEnd = (z) => (kind === 'cab' ? xFront(roofY(z), z) : D.bodyHalf);
  const colours = [];
  for (let i = 0; i < Z_COLS.length - 1; i++) {
    const za = Z_COLS[i], zb = Z_COLS[i + 1];
    const ya = roofY(za), yb = roofY(zb);
    const [nya, nza] = roofNormal(za), [nyb, nzb] = roofNormal(zb);
    const base = pos.length / 3;
    pos.push(x0, ya, za, xEnd(za), ya, za, xEnd(zb), yb, zb, x0, yb, zb);
    nrm.push(0, nya, nza, 0, nya, nza, 0, nyb, nzb, 0, nyb, nzb);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    const c = new THREE.Color(Math.abs((za + zb) / 2) > 1.22 ? COL.cream : COL.roof);
    for (let k = 0; k < 4; k++) colours.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.length / 3 * 2, 2));
  g.setIndex(idx);
  const cols = new THREE.Float32BufferAttribute(colours, 3);
  P.add('body', g);
  g.setAttribute('color', cols); // keep per-quad colours (Parts.add painted white first)
}

// ---------------------------------------------------------------------------
// cab front
// ---------------------------------------------------------------------------
const _n = [0, 0, 0];

/** Point on the cab front at (y,z) pushed `off` metres along the outward normal. */
export function frontPoint(y, z, off = 0) {
  frontNormal(y, z, _n);
  return [xFront(y, z) + _n[0] * off, y + _n[1] * off, z + _n[2] * off];
}

/** Matrix placing a +Z-facing local object on the cab front at (y,z): local X = viewer's right. */
export function frontFrame(y, z, off = 0) {
  const n = new THREE.Vector3(...frontNormal(y, z, [0, 0, 0]));
  const X = new THREE.Vector3(0, 1, 0).cross(n).normalize();
  const Y = new THREE.Vector3().crossVectors(n, X).normalize();
  const p = frontPoint(y, z, off);
  return new THREE.Matrix4().makeBasis(X, Y, n).setPosition(p[0], p[1], p[2]);
}

/**
 * Grid patch conforming to the cab front (for glass, LEDs, decals).
 * uv: atlas rect (optional); u runs from +z (viewer's left) to -z.
 */
export function conformPatch(y0, y1, z0, z1, ny, nz, off, r = null) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nz; i++) {
      const y = y0 + ((y1 - y0) * j) / ny, z = z0 + ((z1 - z0) * i) / nz;
      pos.push(...frontPoint(y, z, off));
      let u = 1 - i / nz, v = j / ny;
      if (r) { u = r.u0 + u * (r.u1 - r.u0); v = r.v0 + v * (r.v1 - r.v0); }
      uv.push(u, v);
    }
  }
  const w = nz + 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) {
    const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function cabFront(P) {
  const nLow = Y_ROWS.length;
  const maskTopRow = nLow + BROW_F.indexOf(CAB.maskTopF);
  const rowY = (j, z) => (j < nLow ? Y_ROWS[j] : D.wallTop + BROW_F[j - nLow] * (roofY(z) - D.wallTop));
  const nRows = nLow + BROW_F.length;
  const pos = [], nrm = [], col = [];
  const cCream = new THREE.Color(COL.cream), cPink = new THREE.Color(COL.pink), cBand = new THREE.Color(COL.pinkBand), cMask = new THREE.Color(COL.mask);
  const vert = (y, z) => {
    pos.push(xFront(y, z), y, z);
    frontNormal(Math.min(y, D.roofTop - 0.01), Math.max(-D.hw + 0.02, Math.min(D.hw - 0.02, z)), _n);
    nrm.push(_n[0], _n[1], _n[2]);
  };
  for (let i = 0; i < Z_COLS.length - 1; i++) {
    const za = Z_COLS[i], zb = Z_COLS[i + 1], zc = (za + zb) / 2;
    for (let j = 0; j < nRows - 1; j++) {
      const y00 = rowY(j, za), y01 = rowY(j + 1, za), y10 = rowY(j, zb), y11 = rowY(j + 1, zb);
      const yc = (y00 + y01 + y10 + y11) / 4;
      const az = Math.abs(zc);
      // windscreen opening
      if (j < nLow && yc > CAB.winLo && yc < CAB.winHi && az > CAB.winZ[0] && az < CAB.winZ[1]) continue;
      let c = cCream;
      if (yc > D.stripe[0] && yc < D.stripe[1]) c = cPink;
      else if (az < CAB.maskZ && yc > CAB.maskLo && j < maskTopRow) c = cMask;
      else if (yc > D.band[0] && yc < D.band[1]) c = cBand;
      vert(y00, za); vert(y01, za); vert(y10, zb);
      vert(y10, zb); vert(y01, za); vert(y11, zb);
      for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.length / 3 * 2, 2));
  P.add('body', g);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  // windscreen glass (two large panes) + black gasket
  for (const s of [1, -1]) {
    const z0 = s > 0 ? CAB.winZ[0] : -CAB.winZ[1], z1 = s > 0 ? CAB.winZ[1] : -CAB.winZ[0];
    P.add('glassF', conformPatch(CAB.winLo, CAB.winHi, z0, z1, 4, 6, -0.012));
  }
  // lamp housings: black rounded units at the lower corners
  for (const s of [1, -1]) {
    const m = frontFrame(CAB.lampY, s * 0.8, 0.0);
    const hs = new THREE.Shape();
    roundRectPath(hs, -0.34, -0.14, 0.34, 0.14, 0.12);
    const g2 = extrude(hs, 0.07, 4);
    g2.translate(0, 0, -0.03);
    P.add('body', g2, COL.darker, m);
    // chrome rim around the unit
    const rim = new THREE.Shape();
    roundRectPath(rim, -0.36, -0.16, 0.36, 0.16, 0.14);
    rim.holes.push(roundRectPath(new THREE.Path(), -0.34, -0.14, 0.34, 0.14, 0.12));
    const g3 = extrude(rim, 0.05, 4);
    g3.translate(0, 0, -0.02);
    P.add('metal', g3, '#b8bec6', m);
  }
  // wipers resting along the bottom of each pane (arm + blade)
  for (const s of [1, -1]) {
    const pivot = frontPoint(CAB.winLo + 0.05, s * 0.28, 0.03);
    const tip = frontPoint(CAB.winLo + 0.1, s * 1.02, 0.03);
    P.rod('metalNO', 0.014, pivot, tip, '#2f3136');
    const b0 = frontPoint(CAB.winLo + 0.075, s * 0.5, 0.036), b1 = frontPoint(CAB.winLo + 0.13, s * 1.05, 0.036);
    P.rod('metalNO', 0.009, b0, b1, '#1f2024');
    P.add('bodyNO', new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10).rotateZ(Math.PI / 2), '#26282d', frontFrame(CAB.winLo + 0.05, s * 0.28, 0.01).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
  }
  // pillar trim between panes & small grab handles at the corners
  for (const s of [1, -1]) {
    P.rod('metalNO', 0.014, frontPoint(1.95, s * 1.24, 0.05), frontPoint(2.2, s * 1.24, 0.05), '#c9ccd0');
  }
  // anti-climber (ribbed bar) and bottom valance
  for (let k = 0; k < 3; k++) P.box('metal', 0.18, 0.025, 2.1, CAB.xb - 0.02, 1.2 + k * 0.045, 0, '#9ba1a9');
  P.box('body', 0.2, 0.1, 2.2, CAB.xb - 0.1, 1.24, 0, COL.dark);
  // skirt (排障器): slanted plate in two halves + lower centre piece, with slots
  const sk = new THREE.Shape();
  sk.moveTo(8.28, 1.2); sk.lineTo(8.66, 1.2); sk.lineTo(8.96, 0.6); sk.lineTo(8.86, 0.56); sk.lineTo(8.28, 0.84); sk.closePath();
  for (const s of [1, -1]) {
    const g4 = extrude(sk, 0.84, 1);
    g4.translate(0, 0, s > 0 ? 0.34 : -1.18);
    P.add('body', g4, '#8a9098');
    for (let k = 0; k < 2; k++) {
      const t = 0.3 + k * 0.3;
      const x = 8.66 + (8.96 - 8.66) * t, y = 1.2 + (0.6 - 1.2) * t;
      P.box('bodyNO', 0.02, 0.07, 0.5, x + 0.011, y + 0.005, s * 0.78, COL.darker, 0, 0, Math.atan2(0.3, 0.6));
    }
  }
  const lo = new THREE.Shape();
  lo.moveTo(8.45, 0.8); lo.lineTo(8.8, 0.8); lo.lineTo(8.95, 0.6); lo.lineTo(8.85, 0.56); lo.lineTo(8.45, 0.7); lo.closePath();
  const g5 = extrude(lo, 0.7, 1);
  g5.translate(0, 0, -0.35);
  P.add('body', g5, '#8a9098');
  // coupler: tight-lock head, shank, electric coupler box, air hoses
  P.cyl('body', 0.07, 0.07, 0.8, 8.5, 1.1, 0, COL.dark, { axis: 'x', seg: 8 });
  P.box('body', 0.22, 0.26, 0.3, 8.9, 1.1, 0, '#4a4f57');
  P.box('body', 0.06, 0.18, 0.2, 9.0, 1.1, 0, '#5a6069');
  P.box('body', 0.2, 0.14, 0.34, 8.88, 0.9, 0, '#6b717a');
  for (const s of [1, -1]) P.tube('bodyNO', [new THREE.Vector3(8.6, 1.02, s * 0.2), new THREE.Vector3(8.8, 0.9, s * 0.24), new THREE.Vector3(8.9, 0.86, s * 0.3)], 0.025, '#2a2c31');
}

// ---------------------------------------------------------------------------
// car end (non-cab): end wall with gangway door, end windows, bellows, drawbar
// ---------------------------------------------------------------------------
function profileShape() {
  const s = new THREE.Shape();
  s.moveTo(-D.hw, D.bodyBottom);
  s.lineTo(D.hw, D.bodyBottom);
  for (let i = Z_COLS.length - 1; i >= 0; i--) s.lineTo(Z_COLS[i], roofY(Z_COLS[i]));
  s.closePath();
  return s;
}

/** Extrude a shape drawn in (z, y) along -X by depth; outer face at x = 0 facing +X. */
function extrudeZY(shape, depth, seg = 3) {
  const g = extrude(shape, depth, seg);
  g.rotateY(-Math.PI / 2);
  return g;
}

export function carEnd(P, sign) {
  const place = (g) => { g.translate(D.bodyHalf, 0, 0); if (sign < 0) g.rotateY(Math.PI); return g; };
  const sh = profileShape();
  sh.holes.push(roundRectPath(new THREE.Path(), -0.46, D.floorY, 0.46, 3.45, 0.06));
  for (const s of [1, -1]) sh.holes.push(roundRectPath(new THREE.Path(), s > 0 ? 0.72 : -1.12, 2.55, s > 0 ? 1.12 : -0.72, 3.3, 0.08));
  P.add('body', place(extrudeZY(sh, 0.04)), COL.cream);
  // interior face of the end wall (lining colour)
  const inner = profileShape();
  inner.holes.push(roundRectPath(new THREE.Path(), -0.46, D.floorY, 0.46, 3.45, 0.06));
  for (const s of [1, -1]) inner.holes.push(roundRectPath(new THREE.Path(), s > 0 ? 0.72 : -1.12, 2.55, s > 0 ? 1.12 : -0.72, 3.3, 0.08));
  const gi = extrudeZY(inner, 0.02);
  gi.scale(1, 1, 0.985);
  gi.translate(-0.06, 0, 0);
  P.add('body', place(gi), COL.lining);
  // end window glass + gangway door (closed, with a tall window)
  for (const s of [1, -1]) {
    const gl = new THREE.ShapeGeometry(new THREE.Shape(roundRectPath(new THREE.Path(), s > 0 ? 0.72 : -1.12, 2.55, s > 0 ? 1.12 : -0.72, 3.3, 0.08).getPoints(3)));
    gl.rotateY(-Math.PI / 2); gl.rotateY(Math.PI); // face +X
    gl.translate(-0.03, 0, 0);
    P.add('glass', place(gl));
  }
  const door = new THREE.Shape();
  roundRectPath(door, -0.46, D.floorY, 0.46, 3.45, 0.06);
  door.holes.push(roundRectPath(new THREE.Path(), -0.26, 2.45, 0.26, 3.28, 0.06));
  const gd = extrudeZY(door, 0.03);
  gd.translate(-0.05, 0, 0);
  P.add('body', place(gd), '#cfd3d8');
  const dg = new THREE.ShapeGeometry(new THREE.Shape(roundRectPath(new THREE.Path(), -0.26, 2.45, 0.26, 3.28, 0.06).getPoints(3)));
  dg.rotateY(Math.PI / 2);
  dg.translate(-0.065, 0, 0);
  P.add('glass', place(dg));
  P.box('metalNO', 0.03, 0.04, 0.18, D.bodyHalf - 0.08, 2.3, 0.3 * sign, '#b0b5bc');
  // bellows: accordion rings between the cars
  for (let k = 0; k < 5; k++) {
    const x = D.bodyHalf + 0.03 + k * 0.058;
    const w = k % 2 ? 0.6 : 0.64, t = 0.07;
    const pts = [[0, 3.56 + (k % 2 ? 0 : 0.03)], [0, 1.47 - (k % 2 ? 0 : 0.03)]];
    const top = pts[0][1], bot = pts[1][1];
    const ring = [
      [0.04, t, w * 2, x, top - t / 2, 0], [0.04, t, w * 2, x, bot + t / 2, 0],
      [0.04, top - bot, t, x, (top + bot) / 2, w - t / 2], [0.04, top - bot, t, x, (top + bot) / 2, -w + t / 2],
    ];
    for (const [a, b, c, px, py, pz] of ring) {
      const g = new THREE.BoxGeometry(a, b, c);
      g.translate(px, py, pz);
      if (sign < 0) g.rotateY(Math.PI);
      P.add('body', g, k % 2 ? COL.bellows : '#4a4d55');
    }
  }
  // drawbar + air pipes
  const bar = new THREE.BoxGeometry(0.42, 0.16, 0.22);
  bar.translate(D.bodyHalf + 0.1, 1.12, 0);
  if (sign < 0) bar.rotateY(Math.PI);
  P.add('body', bar, COL.dark);
  // control jumpers (drooping cables meeting the neighbour's halfway)
  for (const s of [1, -1]) {
    const pts = [new THREE.Vector3(D.bodyHalf - 0.01, 1.62, s * 0.95), new THREE.Vector3(D.bodyHalf + 0.12, 1.4, s * 0.96), new THREE.Vector3(D.half, 1.33, s * 0.97)];
    if (sign < 0) for (const p of pts) p.set(-p.x, p.y, -p.z);
    P.tube('bodyNO', pts, 0.03, COL.darker);
    const box = new THREE.BoxGeometry(0.06, 0.22, 0.26);
    box.translate(D.bodyHalf + 0.02, 1.7, s * 0.95);
    if (sign < 0) box.rotateY(Math.PI);
    P.add('body', box, '#5b616b');
  }
  // end-wall grab handle and conduit
  for (const s of [1, -1]) {
    const g = new THREE.BoxGeometry(0.03, 0.9, 0.03);
    g.translate(D.bodyHalf + 0.05, 2.3, s * 1.25);
    if (sign < 0) g.rotateY(Math.PI);
    P.add('metalNO', g, '#b9bec5');
  }
}

/** Underframe (floor slab + sills) common to every car. */
export function floorSlab(P, kind) {
  const x1 = kind === 'cab' ? 8.38 : D.bodyHalf - 0.02;
  P.span('body', -D.bodyHalf + 0.02, x1, D.bodyBottom - 0.06, D.floorY, -D.liningIn, D.liningIn, '#c9c0b2');
}
