/**
 * Openings: window / door placement on every facade, and their geometry —
 * sliding aluminium windows (two sashes, glass, room box behind with
 * curtains and furniture silhouettes), frosted bathroom windows with grilles,
 * rain-shutter boxes (戸袋), roller-shutter boxes, window awnings (霧除け),
 * genkan doors (panel / lattice sliding) with porch, canopy, lamp, name plate,
 * intercom; the 2F balcony with its railing, laundry pole and laundry.
 */
import { FOUND, STOREY, WALL_T, pickW } from './plan.js';
import { facadeMatrix, face } from './shell.js';
import { wallV, WALL_U_PERIOD, roofV, ROOF_U_PERIOD, LAUNDRY } from './textures.js';
import { shade } from '../../core/toon.js';

const WIN = {
  std: { w: 1.65, h: 1.1, sill: 0.95 },
  mid: { w: 1.2, h: 1.1, sill: 0.95 },
  tall: { w: 1.7, h: 1.95, sill: 0.08 },
  small: { w: 0.6, h: 0.75, sill: 1.15 },
  slit: { w: 0.45, h: 1.15, sill: 0.8 },
  high: { w: 1.2, h: 0.5, sill: 1.55 },
  bdoor: { w: 1.7, h: 2.0, sill: 0.04 },
  udoor: { w: 0.85, h: 2.0, sill: 0.02 }, // steel unit door (apartment)
};

// ---------------------------------------------------------------------------
// planning
// ---------------------------------------------------------------------------
/** Fill every facade with windows (the door / balcony door are reserved first). */
export function planOpenings(P) {
  const r = P.r;
  const simple = P.lod === 'simple';
  const wing = P.wing;
  for (const f of P.facades) {
    const b = f.block;
    const isFront = f.side === 'front', isBack = f.side === 'back';
    for (let fl = 0; fl < b.floors; fl++) {
      const floorY = FOUND + fl * STOREY;
      const reserved = [];
      // door
      for (const o of f.openings) if (o.kind === 'door' && fl === 0) reserved.push([o.u0 - 0.4, o.u1 + 0.4]);
      // balcony doors
      if (fl === 1) {
        for (const bc of P.balconies) {
          if (bc.facade !== f) continue;
          const bw = Math.min(WIN.bdoor.w, bc.u1 - bc.u0 - 0.5);
          const u0 = (bc.u0 + bc.u1) / 2 - bw / 2 + (r() - 0.5) * Math.max(0, bc.u1 - bc.u0 - bw - 0.6);
          addWin(f, 'bdoor', u0, floorY, bw, P, r);
          reserved.push([u0 - 0.3, u0 + bw + 0.3]);
        }
      }
      if (P.apartment && isFront) {
        // two units per floor: steel door + small frosted kitchen window each
        const half = f.L / 2;
        for (let k = 0; k < 2; k++) {
          const du = k * half + 0.45;
          addWin(f, 'udoor', du, floorY, WIN.udoor.w, P, r);
          const w = addWin(f, 'small', du + 1.35, floorY, WIN.small.w, P, r);
          w.frosted = true; w.grille = true;
          reserved.push([k * half, (k + 1) * half]);
        }
        continue;
      }
      // the wing hides the lower part of the main block's right facade
      if (wing && b === P.main && f.side === 'right') {
        const a = b.z1 - wing.z1 - 0.4, c = b.z1 - wing.z0 + 0.4;
        reserved.push([a, c]);
      }
      let types;
      if (simple) types = isFront ? (fl === 0 ? ['mid', 'std'] : ['std', 'std']) : isBack ? ['mid'] : [r() < 0.5 ? 'small' : 'mid'];
      else if (isFront) types = fl === 0 ? [pickW(r, [['tall', P.massing === 'yard' ? 4 : 1.2], ['std', 2], ['mid', 1.5]]), pickW(r, [['mid', 2], ['high', 1], ['small', 1], ['none', 1.5]])] : [pickW(r, [['std', 3], ['mid', 2]]), pickW(r, [['mid', 1.5], ['small', 1], ['slit', 0.6], ['none', 1.5]])];
      else if (isBack) types = fl === 0 ? [pickW(r, [['tall', 2], ['mid', 1]]), pickW(r, [['small', 1], ['high', 1], ['none', 1]])] : [pickW(r, [['std', 2], ['mid', 1]]), pickW(r, [['mid', 1], ['none', 1]])];
      else types = fl === 0 ? [pickW(r, [['small', 3], ['high', 2], ['mid', 1.5]]), pickW(r, [['small', 1.5], ['slit', 0.6], ['mid', 1], ['none', 1.2]])] : [pickW(r, [['mid', 2], ['small', 1.5], ['slit', 0.8]]), pickW(r, [['small', 1], ['none', 2]])];
      // long plain side walls read as blank slabs from the street: give them a second opening
      if (!simple && !isFront && !isBack && f.L > 7 && types.length < 2) types.push(fl === 0 ? 'high' : 'mid');
      if (b.wing) types = f.side === 'front' ? [r() < 0.5 ? 'mid' : 'std'] : f.side === 'right' ? [r() < 0.5 ? 'small' : 'high'] : ['small'];
      if (P.apartment && isBack && fl === 0) types = ['tall', 'tall'];
      types = types.filter((t) => t !== 'none');
      for (const t of types) {
        const spec = WIN[t];
        const trad = P.trad;
        const shutter = !simple && (t === 'std' || t === 'tall') && (trad ? r() < 0.75 : r() < 0.22);
        const foot = spec.w + (shutter ? spec.w * 0.5 + 0.14 : 0);
        const free = freeSegments(0.5, f.L - 0.5, reserved).filter(([a, c]) => c - a >= foot);
        if (!free.length) continue;
        const seg = free[Math.floor(r() * free.length)];
        const slack = seg[1] - seg[0] - foot;
        const u = seg[0] + slack * (0.25 + r() * 0.5);
        const side = shutter ? (r() < 0.5 ? -1 : 1) : 0;
        const wu0 = side < 0 ? u + spec.w * 0.5 + 0.14 : u;
        const o = addWin(f, t, wu0, floorY, spec.w, P, r);
        o.shutter = side;
        reserved.push([u - 0.35, u + foot + 0.35]);
      }
    }
  }
}

function addWin(f, type, u0, floorY, w, P, r) {
  const spec = WIN[type];
  const y0 = floorY + spec.sill;
  const o = { kind: 'win', type, u0, u1: u0 + w, y0, y1: y0 + spec.h, floorY };
  o.frosted = type === 'small' || type === 'slit' ? r() < 0.9 : type === 'high' ? r() < 0.5 : r() < 0.06;
  o.grille = (type === 'small' || type === 'high') && floorY < 1 && r() < 0.75;
  o.curtains = !o.frosted && r() < 0.88;
  o.lace = o.curtains && r() < 0.5;
  o.open = r(); // curtain opening fraction seed
  o.lit = !o.frosted && r() < 0.14;
  o.roller = !P.trad && (type === 'std' || type === 'tall' || type === 'mid') && r() < 0.3;
  o.rollerDown = o.roller && r() < 0.35 ? 0.15 + r() * 0.45 : 0;
  o.awning = (P.trad ? r() < 0.55 : r() < 0.12) && type !== 'bdoor' && type !== 'tall';
  o.flowerBox = floorY > 1 && type !== 'bdoor' && !o.frosted && r() < 0.08;
  o.sudare = P.trad && type !== 'small' && !o.frosted && r() < 0.18;
  o.louvre = o.frosted && (type === 'small' || type === 'slit') && r() < 0.35; // jalousie (ジャロジー)
  o.closed = (type === 'std' || type === 'tall') && r() < (P.trad ? 0.12 : 0.04); // rain shutters drawn
  if (type === 'udoor') Object.assign(o, { frosted: false, curtains: false, lit: false, roller: false, awning: false, flowerBox: false, sudare: false, louvre: false, grille: false });
  f.openings.push(o);
  return o;
}

function freeSegments(a, b, reserved) {
  let segs = [[a, b]];
  for (const [ra, rb] of reserved) {
    const out = [];
    for (const [sa, sb] of segs) {
      if (rb <= sa || ra >= sb) { out.push([sa, sb]); continue; }
      if (ra > sa) out.push([sa, ra]);
      if (rb < sb) out.push([rb, sb]);
    }
    segs = out;
  }
  return segs;
}

// ---------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------
export function buildOpenings(B, P, D) {
  for (const f of P.facades) {
    B.push(facadeMatrix(f));
    const roomDepth = Math.min(1.7, (f.side === 'front' || f.side === 'back' ? f.block.z1 - f.block.z0 : f.block.x1 - f.block.x0) * 0.4);
    for (const o of f.openings) {
      if (o.kind === 'door') door(B, P, f, o, D);
      else window_(B, P, f, o, roomDepth, D);
    }
    for (const bc of P.balconies) if (bc.facade === f) balcony(B, P, f, D, bc);
    B.pop();
  }
}

/**
 * Rectangular frame ring inside an opening.  flush: the ring fills the
 * opening exactly, so its outer faces sit against the wall reveals (skipped).
 */
function ring(B, kind, u0, y0, u1, y1, fw, z0, z1, color, flush = false) {
  B.box(kind, u0, y0, z0, u1, y0 + fw, z1, color, { skip: flush ? 'zy' : 'z' });
  B.box(kind, u0, y1 - fw, z0, u1, y1, z1, color, { skip: flush ? 'zY' : 'z' });
  B.box(kind, u0, y0 + fw, z0, u0 + fw, y1 - fw, z1, color, { skip: flush ? 'zyYx' : 'zy' });
  B.box(kind, u1 - fw, y0 + fw, z0, u1, y1 - fw, z1, color, { skip: flush ? 'zyYX' : 'zy' });
}

function window_(B, P, f, o, roomDepth, D) {
  const fc = P.frame;
  const { u0, u1, y0, y1 } = o;
  const w = u1 - u0;
  const simple = P.lod === 'simple';
  const light = P.lod !== 'full'; // far houses: single mullion + flat interior
  const fw = 0.045;
  if (o.type === 'udoor') return unitDoor(B, P, o);
  ring(B, 'solid', u0, y0, u1, y1, fw, -0.075, 0.014, fc, true);
  // sill flashing (水切り)
  if (o.type !== 'bdoor') B.box('solid', u0 - 0.03, y0 - 0.035, -0.01, u1 + 0.03, y0 + 0.004, 0.055, shade(fc, 0.08), { skip: 'z' });
  const gy0 = y0 + fw, gy1 = y1 - fw;
  const mid = (u0 + u1) / 2;
  const panes = [];
  if (light) {
    B.box('solid', mid - 0.02, gy0, -0.06, mid + 0.02, gy1, -0.01, fc, { skip: 'z' });
    panes.push([u0 + fw, mid, -0.035], [mid, u1 - fw, -0.035]);
  } else if (o.type === 'high' || w < 0.7) {
    // single pane (fixed / top-hung)
    ring(B, 'small', u0 + fw, gy0, u1 - fw, gy1, 0.03, -0.05, -0.02, shade(fc, 0.05));
    panes.push([u0 + fw + 0.03, u1 - fw - 0.03, -0.035, gy0 + 0.03, gy1 - 0.03]);
  } else {
    // 引き違い: left sash outside, right sash inside, overlapping at the middle
    const s1 = [u0 + fw, mid + 0.025, -0.03, -0.008];
    const s2 = [mid - 0.025, u1 - fw, -0.058, -0.036];
    for (const [a, c, za, zb] of [s1, s2]) {
      ring(B, 'solid', a, gy0, c, gy1, 0.035, za, zb, shade(fc, 0.04));
      panes.push([a + 0.035, c - 0.035, (za + zb) / 2, gy0 + 0.035, gy1 - 0.035]);
    }
    // crescent lock
    B.boxC('small', mid, (gy0 + gy1) / 2, -0.004, 0.03, 0.06, 0.012, '#c9cdd2');
  }
  // glass or frosted panels
  if (o.louvre && !simple) {
    // jalousie: tilted frosted-glass slats in a single frame
    panes.length = 0;
    for (let y = gy0 + 0.02; y < gy1 - 0.05; y += 0.085) B.beam('small', [u0 + fw, y, -0.05], [u1 - fw, y, -0.05], 0.075, 0.012, '#dfe7ec', { up: [0, 0.6, 0.8], centerY: true });
    B.quad('unlit', [u0, y0, -0.08], [u1, y0, -0.08], [u1, y1, -0.08], [u0, y1, -0.08], '#6d6a70');
  }
  for (const p of panes) {
    const [a, c, z] = p;
    const ya = p[3] ?? gy0, yb = p[4] ?? gy1;
    if (o.frosted) B.quad('solid', [a, ya, z], [c, ya, z], [c, yb, z], [a, yb, z], o.lit ? '#f4ead2' : '#dce4e8');
    else B.quad('glass', [a, ya, z], [c, ya, z], [c, yb, z], [a, yb, z], '#ffffff');
  }
  if (!o.frosted) room(B, P, f, o, roomDepth, light);
  if (simple) return;

  if (o.closed) {
    // rain shutters (雨戸) drawn across: steel panels with horizontal ribs
    const uv = D.decal.uv('shutter');
    const sc = P.trad ? '#8a7a66' : '#d6d2c8';
    const n = Math.max(2, Math.round(w / 0.9));
    for (let i = 0; i < n; i++) {
      const a = u0 + (w * i) / n, c = u0 + (w * (i + 1)) / n;
      B.quad('decal', [a + 0.01, y0, 0.1], [c - 0.01, y0, 0.1], [c - 0.01, y1, 0.1], [a + 0.01, y1, 0.1], sc, [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
    }
    if (!o.shutter) o.shutter = 1;
  }
  if (o.grille) grille(B, P, o);
  if (o.shutter) shutterBox(B, P, o);
  if (o.roller) rollerShutter(B, P, o);
  if (o.awning) awning(B, P, o);
  if (o.flowerBox) flowerBox(B, P, o, D);
  if (o.sudare) {
    const uv = D.decal.uv('sudare');
    const h = (y1 - y0) * 0.75;
    const zz = 0.09;
    B.quad('decal', [u0 + 0.05, y1 - h, zz], [u1 - 0.05, y1 - h, zz], [u1 - 0.05, y1 + 0.08, zz], [u0 + 0.05, y1 + 0.08, zz], '#ffffff', [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
    B.box('small', u0 - 0.02, y1 + 0.08, 0.02, u1 + 0.02, y1 + 0.11, 0.1, '#7a5a3c');
  }
  // rain streak below some windows
  if (P.lod === 'full' && P.r() < 0.45 && o.type !== 'bdoor') {
    const g = D.grime.uv(P.r() < 0.5 ? 'streak0' : 'streak1');
    const h = 0.5 + P.r() * 0.7;
    const zz = 0.004;
    B.quad('grime', [u0, y0 - 0.04 - h, zz], [u1, y0 - 0.04 - h, zz], [u1, y0 - 0.04, zz], [u0, y0 - 0.04, zz], '#ffffff', [[g[0], g[1]], [g[2], g[1]], [g[2], g[3]], [g[0], g[3]]]);
  }
}

/** Apartment unit door: steel leaf in a pressed frame, lever handle, peephole, number plate. */
function unitDoor(B, P, o) {
  const { u0, u1, y0, y1 } = o;
  const fc = '#8d9197';
  ring(B, 'solid', u0, y0, u1, y1, 0.05, -0.08, 0.02, fc, true);
  const dc = P.aptDoor || (P.aptDoor = P.r.pick(['#7b8a96', '#8a7a6a', '#6d7f73', '#a49a8c']));
  B.box('solid', u0 + 0.05, y0, -0.07, u1 - 0.05, y1 - 0.05, -0.04, dc, { skip: 'z' });
  // pressed panel lines + lever + peephole + mail slot
  B.box('small', u0 + 0.12, y0 + 0.25, -0.04, u1 - 0.12, y0 + 0.27, -0.035, shade(dc, -0.12));
  B.box('small', u0 + 0.12, y1 - 0.3, -0.04, u1 - 0.12, y1 - 0.28, -0.035, shade(dc, -0.12));
  B.box('metal', u1 - 0.2, y0 + 0.95, -0.04, u1 - 0.08, y0 + 0.98, 0.0, '#c9cdd2');
  B.box('small', u0 + 0.28, y0 + 0.7, -0.04, u1 - 0.28, y0 + 0.74, -0.03, '#c9cdd2');
  B.boxC('small', (u0 + u1) / 2, y0 + 1.5, -0.035, 0.03, 0.03, 0.01, '#3a3d42');
  B.box('small', u0 - 0.2, y0 + 1.55, 0.0, u0 - 0.06, y0 + 1.63, 0.012, '#f1efe9');
}

/** Interior box behind a window: back wall, floor, ceiling, sides, curtains. */
function room(B, P, f, o, depth, simple) {
  const { u0, u1, y0, y1 } = o;
  const z0 = -WALL_T + 0.002, z1 = -WALL_T - depth;
  const fy = Math.min(o.floorY + 0.02, y0 - 0.01);
  const cy = Math.max(Math.min(o.floorY + 2.45, f.block.top - 0.05), y1 + 0.02);
  const ic = shade(P.interior, -0.2);
  if (simple) {
    B.quad('unlit', [u0, y0, -0.07], [u1, y0, -0.07], [u1, y1, -0.07], [u0, y1, -0.07], o.lit ? '#e8c890' : shade(ic, -0.12));
    if (o.curtains && P.lod !== 'simple') {
      const w = u1 - u0, c1 = P.curtain;
      B.quad('solid', [u0, y0, -0.065], [u0 + w * 0.3, y0, -0.065], [u0 + w * 0.3, y1, -0.065], [u0, y1, -0.065], c1);
      B.quad('solid', [u1 - w * 0.25, y0, -0.065], [u1, y0, -0.065], [u1, y1, -0.065], [u1 - w * 0.25, y1, -0.065], shade(c1, -0.05));
    }
    return;
  }
  const ra = Math.max(0.03, u0 - 0.55), rb = Math.min(f.L - 0.03, u1 + 0.55);
  B.quad('unlit', [ra, fy, z1], [rb, fy, z1], [rb, cy, z1], [ra, cy, z1], ic);
  face(B, 'unlit', [[ra, fy, z0], [rb, fy, z0], [rb, fy, z1], [ra, fy, z1]], '#6b5646', null, [0, 1, 0]);
  face(B, 'unlit', [[ra, cy, z0], [rb, cy, z0], [rb, cy, z1], [ra, cy, z1]], shade(ic, 0.1), null, [0, -1, 0]);
  face(B, 'unlit', [[ra, fy, z0], [ra, cy, z0], [ra, cy, z1], [ra, fy, z1]], shade(ic, -0.07), null, [1, 0, 0]);
  face(B, 'unlit', [[rb, fy, z0], [rb, cy, z0], [rb, cy, z1], [rb, fy, z1]], shade(ic, -0.07), null, [-1, 0, 0]);
  const r = P.r;
  const reduced = P.lod !== 'full';
  // furniture silhouette against the back wall
  if (!reduced && r() < 0.7) {
    const fw = 0.5 + r() * 0.9, fh = 0.5 + r() * 1.3, fu = u0 + r() * Math.max(0.1, u1 - u0 - fw);
    B.box('unlit', fu, fy, z1, fu + fw, fy + fh, z1 + 0.4, pickW(r, [['#5e4c40', 2], ['#8a7d70', 1], ['#6d6660', 1]]), { skip: 'z' });
    if (r() < 0.4) B.box('unlit', fu + 0.1, fy + fh, z1 + 0.05, fu + 0.3, fy + fh + 0.25, z1 + 0.2, '#6f8a5e', { skip: 'z' });
  }
  // pendant lamp (lit rooms)
  if (o.lit) {
    const lu = (u0 + u1) / 2;
    B.box('unlit', lu - 0.2, cy - 0.45, z1 * 0.55 - 0.2, lu + 0.2, cy - 0.3, z1 * 0.55 + 0.2, '#ffe0a6');
    B.box('unlit', lu - 0.01, cy - 0.3, z1 * 0.55 - 0.01, lu + 0.01, cy, z1 * 0.55 + 0.01, '#444');
  }
  // curtains (pleated, two panels) + optional lace
  if (o.curtains) {
    const w = u1 - u0;
    const c1 = o.lit ? '#f6e3c0' : P.curtain;
    const openL = 0.12 + (o.open * 0.3), openR = 0.12 + ((o.open * 7.3) % 1) * 0.3;
    const zc = -WALL_T - 0.02;
    const cy0 = Math.max(fy + 0.02, y0 - 0.1), cy1 = Math.min(cy - 0.02, y1 + 0.1);
    const pleat = (a, c) => {
      const n = reduced ? 1 : Math.max(2, Math.round((c - a) / 0.12));
      for (let i = 0; i < n; i++) {
        const pa = a + ((c - a) * i) / n, pc = a + ((c - a) * (i + 1)) / n;
        B.quad('solid', [pa, cy0, zc], [pc, cy0, zc], [pc, cy1, zc], [pa, cy1, zc], i % 2 ? shade(c1, -0.07) : c1);
      }
    };
    pleat(u0 - 0.1, u0 + w * openL);
    pleat(u1 - w * openR, u1 + 0.1);
    if (o.lace) {
      const zl = zc + 0.005;
      B.quad('solid', [u0 + w * openL, cy0, zl], [u1 - w * openR, cy0, zl], [u1 - w * openR, cy1, zl], [u0 + w * openL, cy1, zl], shade('#f4f1ea', -0.05));
    }
    // curtain rail
    B.box('small', u0 - 0.1, cy1, zc - 0.05, u1 + 0.1, cy1 + 0.04, zc + 0.01, '#d8d2c8', { skip: 'z' });
  }
}

function grille(B, P, o) {
  const c = shade(P.frame, 0.12);
  const { u0, u1, y0, y1 } = o;
  const z0 = 0.02, z1 = 0.09;
  ring(B, 'solid', u0 - 0.06, y0 - 0.04, u1 + 0.06, y1 + 0.04, 0.035, z0, z1, c);
  for (let u = u0 + 0.02; u < u1 - 0.02; u += 0.075) B.box('small', u, y0 - 0.01, z0 + 0.02, u + 0.022, y1 + 0.01, z1 - 0.01, c, { skip: 'zy' });
  B.box('small', u0 - 0.03, (y0 + y1) / 2 - 0.012, z0 + 0.02, u1 + 0.03, (y0 + y1) / 2 + 0.012, z1, c, { skip: 'z' });
}

function shutterBox(B, P, o) {
  const { u0, u1, y0, y1 } = o;
  const w = (u1 - u0) * 0.5 + 0.1;
  const c = P.trad ? (P.r() < 0.5 ? '#5b4a3d' : '#7b6a58') : P.r() < 0.5 ? '#e7e3da' : shade(P.frame, 0.15);
  const a = o.shutter > 0 ? u1 + 0.03 : u0 - 0.03 - w, b = a + w;
  B.box('solid', a, y0 - 0.06, 0, b, y1 + 0.07, 0.14, c, { skip: 'z' });
  for (let k = 1; k < 4; k++) {
    const u = a + (w * k) / 4;
    B.box('small', u - 0.012, y0 - 0.04, 0.14, u + 0.012, y1 + 0.05, 0.16, shade(c, -0.08), { skip: 'z' });
  }
  // shutter rails (敷居 / 鴨居) along the window
  B.box('small', u0 - 0.03, y1 + 0.005, 0.01, u1 + 0.03, y1 + 0.05, 0.12, shade(c, -0.05), { skip: 'z' });
  B.box('small', u0 - 0.03, y0 - 0.04, 0.01, u1 + 0.03, y0 - 0.005, 0.12, shade(c, -0.05), { skip: 'z' });
}

function rollerShutter(B, P, o) {
  const { u0, u1, y0, y1 } = o;
  const c = P.r() < 0.5 ? shade(P.frame, 0.2) : '#dcd8cf';
  B.box('solid', u0 - 0.06, y1 + 0.02, 0, u1 + 0.06, y1 + 0.26, 0.19, c, { skip: 'z' });
  for (const u of [u0 - 0.06, u1]) B.box('small', u, y0, 0, u + 0.06, y1 + 0.02, 0.07, c, { skip: 'z' });
  if (o.rollerDown) {
    const h = (y1 - y0) * o.rollerDown;
    for (let y = y1 - h; y < y1; y += 0.05) B.box('small', u0, y, 0.025, u1, Math.min(y1, y + 0.045), 0.045, shade(c, (Math.round(y * 20) % 2) * -0.05), { skip: 'z' });
  }
}

function awning(B, P, o) {
  const { u0, u1, y1 } = o;
  const c = P.trad ? shade(P.main.roof.color, 0.05) : '#8a939c';
  const a = u0 - 0.18, b = u1 + 0.18, d = 0.42;
  const yt = y1 + 0.34, yb = y1 + 0.2;
  B.shadowBox(a, yb - 0.04, 0.01, b, yt, d);
  B.hexa([[a, yb, d], [b, yb, d], [b, yt, 0], [a, yt, 0]], [[a, yb - 0.04, d], [b, yb - 0.04, d], [b, yt - 0.04, 0], [a, yt - 0.04, 0]],
    { top: { kind: 'solid', color: c }, bottom: { kind: 'solid', color: P.soffit }, sides: [{ kind: 'solid', color: shade(c, -0.05) }, { kind: 'solid', color: c }, null, { kind: 'solid', color: c }] });
  for (const u of [a + 0.05, b - 0.05]) face(B, 'small', [[u, yt - 0.04, 0], [u, yb - 0.04, d * 0.8], [u, yt - 0.22, 0]], shade(c, -0.1), null, [1, 0, 0]);
}

function flowerBox(B, P, o, D) {
  const { u0, u1, y0 } = o;
  const c = P.r() < 0.5 ? '#6a4e3a' : '#e9e5dc';
  B.box('solid', u0 + 0.1, y0 - 0.3, 0.02, u1 - 0.1, y0 - 0.08, 0.26, c);
  const cols = ['#f29bb4', '#f7e39a', '#ffffff', '#c792d6', '#f28a6a'];
  for (let u = u0 + 0.2; u < u1 - 0.15; u += 0.16) {
    B.stamp(D.tpl.blobs[Math.floor(P.r() * D.tpl.blobs.length)], D.mtx(u, y0 - 0.06, 0.14, P.r() * 6, 0.11, 0.09, 0.1), '#6f9a58');
    B.stamp(D.tpl.blobs[0], D.mtx(u + 0.03, y0 + 0.01, 0.16, 0, 0.045), cols[Math.floor(P.r() * cols.length)]);
  }
}

// ---------------------------------------------------------------------------
// doors & entrance
// ---------------------------------------------------------------------------
const DOOR_COLORS = ['#7a5a42', '#5e4838', '#8a6a4e', '#3f4247', '#e9e6de', '#6d7f73', '#a47c58'];

function door(B, P, f, o, D) {
  const r = P.r;
  const { u0, u1, y0, y1 } = o;
  const w = u1 - u0;
  const fc = P.frame;
  const fw = 0.06;
  ring(B, 'solid', u0, y0, u1, y1, fw, -0.09, 0.016, fc, true);
  B.box('metal', u0 + fw, y0, -0.1, u1 - fw, y0 + 0.02, 0.01, '#b5b9be');
  const dc = P.trad ? r.pick(['#6b4e38', '#7a5a42', '#5b4332']) : r.pick(DOOR_COLORS);
  const simple = P.lod === 'simple';
  // interior behind the door is never seen (door is closed) -> back plate only
  if (P.entry.type === 'lattice' && !simple) {
    const mid = (u0 + u1) / 2;
    const uv = D.decal.uv('lattice');
    for (const [a, c, z] of [[u0 + fw, mid + 0.03, -0.035], [mid - 0.03, u1 - fw, -0.07]]) {
      ring(B, 'solid', a, y0 + 0.02, c, y1 - fw, 0.05, z - 0.03, z, dc);
      B.quad('decal', [a + 0.05, y0 + 0.07, z - 0.012], [c - 0.05, y0 + 0.07, z - 0.012], [c - 0.05, y1 - fw - 0.05, z - 0.012], [a + 0.05, y1 - fw - 0.05, z - 0.012], '#ffffff',
        [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
      B.box('small', a + 0.07, y0 + 0.02 + 0.3, z - 0.035, a + 0.1, y0 + 0.62, z + 0.005, '#c9b27a');
    }
  } else {
    const leafW = Math.min(0.92, w - 2 * fw);
    const hingeLeft = r() < 0.5;
    const la = hingeLeft ? u0 + fw : u1 - fw - leafW, lb = la + leafW;
    B.box('solid', la, y0 + 0.02, -0.07, lb, y1 - fw, -0.03, dc, { skip: 'z' });
    if (!simple) {
      // vertical glass slit + panel grooves
      const gs = hingeLeft ? la + 0.12 : lb - 0.24;
      B.quad('glass', [gs, y0 + 0.5, -0.028], [gs + 0.12, y0 + 0.5, -0.028], [gs + 0.12, y1 - 0.3, -0.028], [gs, y1 - 0.3, -0.028], '#ffffff');
      B.quad('unlit', [gs, y0 + 0.5, -0.032], [gs + 0.12, y0 + 0.5, -0.032], [gs + 0.12, y1 - 0.3, -0.032], [gs, y1 - 0.3, -0.032], '#3e3a38');
      ring(B, 'small', gs - 0.02, y0 + 0.48, gs + 0.14, y1 - 0.28, 0.02, -0.035, -0.022, shade(dc, -0.1));
      for (const yy of [y0 + 0.35, y1 - 0.2]) B.box('small', la + 0.05, yy, -0.03, lb - 0.05, yy + 0.015, -0.026, shade(dc, -0.1), { skip: 'z' });
      // handle
      const hu = hingeLeft ? lb - 0.09 : la + 0.09;
      B.box('metal', hu - 0.015, y0 + 0.85, -0.03, hu + 0.015, y0 + 1.3, 0.02, '#c9cdd2');
      B.boxC('metal', hu, y0 + 1.15, -0.01, 0.05, 0.08, 0.02, '#aab0b6');
      // side panel (fixed, frosted) when the opening is wide
      if (w - 2 * fw - leafW > 0.12) {
        const sa = hingeLeft ? lb : u0 + fw, sb = hingeLeft ? u1 - fw : la;
        B.box('solid', sa, y0 + 0.02, -0.06, sb, y1 - fw, -0.04, dc, { skip: 'z' });
        B.quad('solid', [sa + 0.05, y0 + 0.3, -0.038], [sb - 0.05, y0 + 0.3, -0.038], [sb - 0.05, y1 - fw - 0.1, -0.038], [sa + 0.05, y1 - fw - 0.1, -0.038], '#dfe6ea');
      }
    }
  }
  if (simple) return;
  porch(B, P, f, o, D);
}

/** Porch landing + step, canopy, lamp, name plate, intercom, stickers. */
function porch(B, P, f, o, D) {
  const r = P.r;
  const { u0, u1, y0, y1 } = o;
  const uc = (u0 + u1) / 2;
  const pd = r.range(0.95, 1.25);
  const pa = u0 - 0.45, pb = u1 + 0.45;
  const [lx, lz] = f.toLocal(uc, pd / 2);
  const g = Math.min(P.gy(lx, lz), P.gy(...f.toLocal(uc, pd + 0.4)));
  const top = y0 - 0.16;
  const tc = r.pick(['#c8c1b4', '#b9b2a6', '#d6d0c4', '#a9a49c']);
  const tileUV = (fid, p) => (fid === 'Y' ? [p[0] / WALL_U_PERIOD, wallV('tile', 1 + p[2] * 0.6)] : [p[0] / WALL_U_PERIOD, wallV('tile', 0.8)]);
  B.box('wall', pa, g - 0.3, 0, pb, top, pd, tc, { uv: tileUV, skip: 'z' });
  const rise = top - g;
  if (rise > 0.12) {
    const steps = rise > 0.3 ? 2 : 1;
    for (let k = 0; k < steps; k++) {
      const st = g + (rise * (steps - k)) / (steps + 1);
      B.box('solid', pa + 0.1, g - 0.3, pd + k * 0.3, pb - 0.1, st, pd + (k + 1) * 0.3, shade(tc, 0.04), { skip: 'z' });
    }
  }
  D.porch = { u0: pa, u1: pb, depth: pd, top };
  // door mat + shoe scraper mat
  const mc = r.pick(['#7a5a48', '#5d6b58', '#6d6a72', '#8a6a52']);
  B.box('small', uc - 0.4, top, 0.1, uc + 0.4, top + 0.015, 0.6, mc);
  if (r() < 0.5) B.box('small', uc - 0.35, g, pd + 0.35, uc + 0.35, g + 0.02, pd + 0.8, '#5b5d60');

  // canopy
  let ct = P.entry.canopy;
  const underBalcony = P.balcony && P.balcony.facade === f && P.balcony.u0 < u0 && P.balcony.u1 > u1;
  if (ct === 'none' && !underBalcony) ct = 'slab';
  if (underBalcony && r() < 0.6) ct = 'none';
  const ca = u0 - 0.45, cb = u1 + 0.45;
  if (ct === 'slab') {
    const cy = y1 + 0.3;
    B.box('solid', ca, cy, 0, cb, cy + 0.1, 0.95, P.trim === '#5b4332' ? '#e9e6de' : P.trim, { colors: { y: P.soffit } });
    B.shadowBox(ca, cy, 0.01, cb, cy + 0.1, 0.95);
    B.box('small', ca - 0.01, cy - 0.02, 0.93, cb + 0.01, cy + 0.12, 0.97, '#9aa1a8');
    B.boxC('unlit', uc, cy - 0.005, 0.5, 0.14, 0.01, 0.14, '#ffe6b0');
  } else if (ct === 'hood') {
    const c = r.pick(['#8a939c', '#6b7a86', '#5f6670', '#b9c4cc']);
    const yt = y1 + 0.55, yb = y1 + 0.3, d = 0.85;
    B.shadowBox(ca, yb - 0.05, 0.01, cb, yt, d);
    B.hexa([[ca, yb, d], [cb, yb, d], [cb, yt, 0], [ca, yt, 0]], [[ca, yb - 0.05, d], [cb, yb - 0.05, d], [cb, yt - 0.05, 0], [ca, yt - 0.05, 0]],
      { top: { kind: 'solid', color: c }, bottom: { kind: 'solid', color: shade(c, 0.1) }, sides: [{ kind: 'solid', color: shade(c, -0.05) }, { kind: 'solid', color: c }, null, { kind: 'solid', color: c }] });
    for (const u of [ca + 0.08, cb - 0.08]) B.beam('small', [u, yt - 0.35, 0], [u, yb - 0.04, d - 0.1], 0.03, 0.03, shade(c, -0.15), { centerY: true });
  } else if (ct === 'kawara') {
    const c = P.main.roof.color;
    const yt = y1 + 0.75, yb = y1 + 0.38, d = 1.0;
    B.shadowBox(ca - 0.1, yb - 0.14, 0.01, cb + 0.1, yt, d);
    const uvf = (p) => [p[0] / ROOF_U_PERIOD, roofV('kawara', (d - p[2]) * 1.1)];
    B.hexa([[ca - 0.1, yb, d], [cb + 0.1, yb, d], [cb + 0.1, yt, 0], [ca - 0.1, yt, 0]], [[ca - 0.1, yb - 0.14, d], [cb + 0.1, yb - 0.14, d], [cb + 0.1, yt - 0.14, 0], [ca - 0.1, yt - 0.14, 0]],
      { top: { kind: 'roof', color: c, uv: uvf }, bottom: { kind: 'solid', color: '#b89a78' }, sides: [{ kind: 'solid', color: shade(c, -0.05) }, { kind: 'solid', color: shade(c, -0.05) }, null, { kind: 'solid', color: shade(c, -0.05) }] });
    for (const u of [ca + 0.1, cb - 0.1]) {
      B.beam('solid', [u, y1 + 0.1, 0], [u, yb - 0.12, d - 0.2], 0.08, 0.08, '#7a5a3c', { centerY: true });
      B.box('solid', u - 0.04, yb - 0.2, 0, u + 0.04, yb - 0.12, d - 0.1, '#7a5a3c');
    }
  }

  // door lamp on the free side
  const lampLeft = u0 > f.L - u1; // lamp on the side with more wall
  const lu = lampLeft ? u0 - 0.28 : u1 + 0.28;
  const ly = y1 - 0.2;
  if (P.lampStyle === 'box') {
    B.box('solid', lu - 0.07, ly - 0.12, 0, lu + 0.07, ly + 0.12, 0.025, P.frame, { skip: 'z' });
    B.box('unlit', lu - 0.055, ly - 0.1, 0.025, lu + 0.055, ly + 0.1, 0.12, '#ffe2a8', { skip: 'z' });
    B.box('small', lu - 0.065, ly + 0.1, 0.02, lu + 0.065, ly + 0.125, 0.13, P.frame);
  } else if (P.lampStyle === 'globe') {
    B.box('solid', lu - 0.05, ly - 0.05, 0, lu + 0.05, ly + 0.08, 0.03, '#3f3b38', { skip: 'z' });
    B.box('small', lu - 0.012, ly, 0.03, lu + 0.012, ly + 0.02, 0.14, '#3f3b38');
    B.stamp(D.tpl.ball, D.mtx(lu, ly - 0.06, 0.16, 0, 0.09), '#fff0cc');
  } else {
    B.box('solid', lu - 0.02, ly - 0.02, 0, lu + 0.02, ly + 0.02, 0.12, '#3a3632');
    B.box('unlit', lu - 0.07, ly - 0.2, 0.06, lu + 0.07, ly, 0.2, '#ffdf9e');
    B.hexa([[lu - 0.1, ly, 0.23], [lu + 0.1, ly, 0.23], [lu + 0.1, ly + 0.06, 0.13], [lu - 0.1, ly + 0.06, 0.13]], [[lu - 0.1, ly - 0.01, 0.23], [lu + 0.1, ly - 0.01, 0.23], [lu + 0.1, ly - 0.01, 0.03], [lu - 0.1, ly - 0.01, 0.03]],
      { top: { kind: 'small', color: '#3a3632' }, bottom: null, sides: [{ kind: 'small', color: '#3a3632' }, null, null, null] });
    B.box('small', lu - 0.1, ly + 0.05, 0.03, lu + 0.1, ly + 0.07, 0.14, '#3a3632');
  }
  // name plate + intercom on the other side (if no gate post takes them)
  const nu = lampLeft ? u1 + 0.3 : u0 - 0.3;
  if (!P.gatePost || r() < 0.5) nameplate(B, P, D, nu, y0 + 1.45, 0.02);
  if (!P.gatePost) intercom(B, D, nu, y0 + 1.12, 0.02);
  // stickers on the door frame side
  if (r() < 0.35) decalQuad(B, D, r.pick(['bouhan', 'dogSign', 'salesSign']), nu, y0 + 0.85, 0.022, 0.12, r() < 0.5 ? 0.12 : 0.075);
  if (r() < 0.3 && !P.gatePost) decalQuad(B, D, `addr${P.addrIdx}`, nu + (lampLeft ? 0.1 : -0.1), y1 + 0.45, 0.012, 0.3, 0.085);
}

export function nameplate(B, P, D, u, y, z) {
  const vertical = P.trad && P.r() < 0.7;
  const name = `${vertical ? 'nameV' : 'nameH'}${P.nameIdx}`;
  const w = vertical ? 0.1 : 0.26, h = vertical ? 0.27 : 0.1;
  B.box('solid', u - w / 2 - 0.012, y - h / 2 - 0.012, z - 0.02, u + w / 2 + 0.012, y + h / 2 + 0.012, z + 0.012, '#3a3632', { skip: 'z' });
  decalQuad(B, D, name, u, y, z + 0.014, w, h);
}

export function intercom(B, D, u, y, z) {
  B.box('solid', u - 0.045, y - 0.07, z - 0.02, u + 0.045, y + 0.07, z + 0.018, '#e6e6e3', { skip: 'z' });
  decalQuad(B, D, 'intercom', u, y, z + 0.02, 0.07, 0.12);
}

/** Decal quad centred at (u, y) on the plane z (facade frame). */
export function decalQuad(B, D, name, u, y, z, w, h) {
  const uv = D.decal.uv(name);
  B.quad('decal', [u - w / 2, y - h / 2, z], [u + w / 2, y - h / 2, z], [u + w / 2, y + h / 2, z], [u - w / 2, y + h / 2, z], '#ffffff',
    [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
}

// ---------------------------------------------------------------------------
// balcony + laundry
// ---------------------------------------------------------------------------
function balcony(B, P, f, D, bc) {
  const r = P.r;
  const { u0, u1 } = bc;
  const dp = bc.depth;
  const yS = FOUND + STOREY + 0.02;
  const zone = P.zones[1];
  const edge = P.trim === '#4d4843' || P.trim === '#5b4332' ? P.trim : '#e9e6de';
  // floor slab + fascia + brackets
  B.box('solid', u0, yS - 0.2, 0, u1, yS, dp, '#c9c7c2', { colors: { y: P.soffit, Z: edge, X: edge, x: edge } });
  B.box('solid', u0 - 0.015, yS - 0.24, dp - 0.02, u1 + 0.015, yS - 0.12, dp + 0.02, shade(edge, -0.04), { skip: 'z' });
  // shadow proxy: slab + front railing (bars only cast their top rail)
  B.shadowBox(u0, yS - 0.24, 0.01, u1, yS, dp + 0.02);
  if (bc.rail === 'bars') B.shadowBox(u0, yS + 0.99, dp - 0.07, u1, yS + 1.1, dp);
  else B.shadowBox(u0, yS, dp - 0.1, u1, yS + 1.09, dp);
  // steel knee braces under the slab
  for (const u of [u0 + 0.15, u1 - 0.15]) {
    B.beam('metal', [u, yS - 0.62, 0.02], [u, yS - 0.21, dp * 0.72], 0.05, 0.05, '#8d9197', { centerY: true });
    B.box('metal', u - 0.03, yS - 0.26, 0, u + 0.03, yS - 0.2, dp * 0.8, '#8d9197');
    B.box('small', u - 0.05, yS - 0.7, 0, u + 0.05, yS - 0.5, 0.02, '#8d9197');
  }
  // wall-side drain + small drain pipe
  // drain pipe at the end away from the entrance
  const door = P.entry.facade === f ? P.entry : null;
  const clear = (u) => !door || u < door.u0 - 0.9 || u > door.u1 + 0.9;
  const du = clear(u1 - 0.12) ? u1 - 0.12 : clear(u0 + 0.12) ? u0 + 0.12 : null;
  if (du !== null) B.cyl('solid', [du, yS - 0.2, dp - 0.12], [du, P.gy(...f.toLocal(du, dp - 0.12)) + 0.1, dp - 0.12], 0.03, P.gutter, 6);

  const rh = 1.05;
  let railTop = yS + rh;
  if (bc.rail === 'solid') {
    const uv = (fid, p) => [(p[0] + p[2]) / WALL_U_PERIOD, wallV(zone.band, p[1] - FOUND)];
    B.box('wall', u0, yS, dp - 0.1, u1, yS + rh, dp, zone.color, { uv, skip: 'y' });
    B.box('wall', u0, yS, 0, u0 + 0.1, yS + rh, dp - 0.1, zone.color, { uv, skip: 'yz' });
    B.box('wall', u1 - 0.1, yS, 0, u1, yS + rh, dp - 0.1, zone.color, { uv, skip: 'yz' });
    const cc = '#9aa1a8';
    B.box('metal', u0 - 0.02, yS + rh, dp - 0.12, u1 + 0.02, yS + rh + 0.04, dp + 0.02, cc);
    B.box('metal', u0 - 0.02, yS + rh, 0, u0 + 0.12, yS + rh + 0.04, dp - 0.12, cc);
    B.box('metal', u1 - 0.12, yS + rh, 0, u1 + 0.02, yS + rh + 0.04, dp - 0.12, cc);
    railTop += 0.04;
  } else {
    const rc = bc.rail === 'bars' ? r.pick(['#b9bec4', '#4a4d52', '#6a4e3a', '#e9e6de']) : '#b9bec4';
    const posts = [];
    for (let u = u0 + 0.03; u < u1 - 0.1; u += 1.1) posts.push(u);
    posts.push(u1 - 0.03);
    for (const u of posts) B.box('metal', u - 0.025, yS, dp - 0.06, u + 0.025, yS + rh, dp - 0.01, rc);
    for (const zz of [0.05, dp * 0.5]) {
      B.box('metal', u0, yS, zz - 0.025, u0 + 0.05, yS + rh, zz + 0.025, rc);
      B.box('metal', u1 - 0.05, yS, zz - 0.025, u1, yS + rh, zz + 0.025, rc);
    }
    B.box('metal', u0 - 0.02, yS + rh, dp - 0.07, u1 + 0.02, yS + rh + 0.05, dp, rc);
    B.box('metal', u0, yS + rh, 0, u0 + 0.05, yS + rh + 0.05, dp - 0.07, rc);
    B.box('metal', u1 - 0.05, yS + rh, 0, u1, yS + rh + 0.05, dp - 0.07, rc);
    B.box('small', u0, yS + 0.08, dp - 0.05, u1, yS + 0.12, dp - 0.02, rc);
    railTop += 0.05;
    // infill
    const fill = (a, b, zA, zB, horizontal) => {
      if (bc.rail === 'bars') {
        const uv = D.decal.uv('bars');
        const n = Math.max(1, Math.round((horizontal ? b - a : zB - zA) / 1.1));
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          const p = (t) => (horizontal ? [a + (b - a) * t, dp - 0.035] : [a, zA + (zB - zA) * t]);
          const [ua, za] = p(t0), [ub, zb] = p(t1);
          B.quad('decal', [ua, yS + 0.12, za], [ub, yS + 0.12, zb], [ub, yS + rh, zb], [ua, yS + rh, za], rc, [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
        }
      } else {
        const pc = r() < 0.5 ? '#d9e2e8' : '#e8e4da';
        if (horizontal) B.box('solid', a, yS + 0.15, dp - 0.045, b, yS + rh - 0.06, dp - 0.03, pc);
        else B.box('solid', a - 0.008, yS + 0.15, zA, a + 0.008, yS + rh - 0.06, zB, pc);
      }
    };
    fill(u0 + 0.05, u1 - 0.05, 0, 0, true);
    fill(u0 + 0.025, 0, 0.05, dp - 0.07, false);
    fill(u1 - 0.025, 0, 0.05, dp - 0.07, false);
  }
  const occupied = [];
  // AC outdoor unit on the balcony floor
  if (bc.ac && u1 - u0 > 3.0) {
    const left = r() < 0.5;
    const au = left ? u0 + 0.55 : u1 - 0.55;
    B.stamp(D.tpl.ac, D.mtx(au, yS, 0.02, 0, 1));
    occupied.push([au - 0.45, au + 0.45]);
    // pipe cover into the wall
    B.box('solid', au + (left ? 0.42 : -0.5), yS + 0.25, 0, au + (left ? 0.5 : -0.42), yS + 1.9, 0.07, '#ecebe6');
  }
  // potted plant in a corner
  if (bc.rail !== 'solid' && r() < 0.6) {
    const pu = r() < 0.5 ? u0 + 0.42 : u1 - 0.42;
    if (!occupied.some(([a, b]) => pu > a - 0.3 && pu < b + 0.3)) D.pottedPlant(B, pu, yS, Math.min(0.4, dp * 0.42), r, 'herb');
  }
  // satellite dish on the railing
  if (bc.dish) {
    const du = r() < 0.5 ? u0 + 0.35 : u1 - 0.35;
    B.stamp(D.tpl.dish, D.mtx(du, railTop - 0.25, dp + 0.08, r.range(-0.5, 0.5), 0.9));
  }
  // laundry pole + laundry
  if (bc.laundry && P.lod !== 'simple') {
    const yP = yS + (bc.rail === 'solid' ? 2.02 : 1.82); // laundry shows above solid parapets
    const zP = dp * 0.6;
    const pa = u0 + 0.12, pb = u1 - 0.12;
    for (const u of [pa + 0.12, pb - 0.12]) {
      B.box('metal', u - 0.03, yP - 0.05, 0, u + 0.03, yP + 0.35, 0.02, '#aab2b8');
      B.beam('small', [u, yP + 0.3, 0.02], [u, yP + 0.02, zP + 0.05], 0.025, 0.025, '#aab2b8', { centerY: true });
      B.box('small', u - 0.02, yP - 0.06, zP - 0.03, u + 0.02, yP + 0.03, zP + 0.03, '#aab2b8');
    }
    B.cyl('small', [pa, yP, zP], [pb, yP, zP], 0.018, r.pick(['#9fc3d8', '#c9d3da', '#a9d3b8']), 6);
    hangLaundry(B, P, D, pa + 0.25, pb - 0.25, yP, zP, 0);
  }
  if (bc.futon) {
    const fw = LAUNDRY.futon.w;
    const fu = u0 + 0.3 + r() * Math.max(0, u1 - u0 - fw - 0.6);
    const kind = r() < 0.5 ? 'futon' : 'futonBlue';
    const uv = D.laundry.uv(kind);
    const zt = dp + 0.03, drop = 0.6;
    const yt = railTop + 0.03;
    const vm = uv[1] + (uv[3] - uv[1]) * 0.3;
    B.swayFn = (p) => Math.max(0, yt - p[1]) * 0.35;
    B.quad('laundry', [fu, yt - drop, zt + 0.08], [fu + fw, yt - drop, zt + 0.08], [fu + fw, yt, zt], [fu, yt, zt], '#ffffff', [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], vm], [uv[0], vm]]);
    B.quad('laundry', [fu, yt, zt], [fu + fw, yt, zt], [fu + fw, yt - 0.3, zt - 0.22], [fu, yt - 0.3, zt - 0.22], '#ffffff', [[uv[0], vm], [uv[2], vm], [uv[2], uv[3]], [uv[0], uv[3]]]);
    B.swayFn = null;
    for (const u of [fu + 0.2, fu + fw - 0.2]) B.box('small', u - 0.03, yt - 0.04, zt - 0.04, u + 0.03, yt + 0.04, zt + 0.1, '#f29bb4');
  }
  D.balconyFrame = { yS, dp };
}

const FAMILIES = [
  ['shirt', 'shirt', 'sailor', 'skirt', 'towelPink', 'towelWhite', 'pinch', 'tshirtPink', 'bathTowel'],
  ['shirtBlue', 'blazer', 'shirt', 'jeans', 'towelBlue', 'tshirtMint', 'pinch', 'kids', 'kids', 'towelYellow'],
  ['sheet', 'towelWhite', 'towelPink', 'shirt', 'tshirtYellow', 'pinch', 'bathTowel'],
  ['sailor', 'sailor', 'skirt', 'tshirtPink', 'towelYellow', 'shirt', 'pinch'],
  ['shirt', 'jeans', 'towelBlue', 'tshirtYellow', 'bathTowel', 'sheet'],
];

/**
 * Hang laundry along a pole from u = a..b at height yP, depth zP (current
 * frame, pole along +u).  Each item is a double-sided alpha card; the sway
 * attribute (metres below the pole) drives the wind shader.
 */
export function hangLaundry(B, P, D, a, b, yP, zP, fam = -1) {
  const r = P.r;
  const family = FAMILIES[fam >= 0 ? fam : Math.floor(r() * FAMILIES.length)] || FAMILIES[Math.floor(r() * FAMILIES.length)];
  let u = a;
  let n = 0;
  while (u < b && n < 9) {
    const name = family[Math.floor(r() * family.length)];
    const L = LAUNDRY[name];
    if (u + L.w > b + 0.1) { u += 0.1; if (u > b - 0.3) break; continue; }
    const cu = u + L.w / 2;
    const yawJ = L.hang === 'hanger' || L.hang === 'pinch' ? (r() - 0.5) * 1.0 : (r() - 0.5) * 0.15;
    const uv = D.laundry.uv(name);
    const topY = yP + (L.hang === 'hanger' || L.hang === 'pinch' ? 0.06 : 0.02);
    B.pushT(cu, 0, zP, yawJ);
    B.swayFn = (p) => Math.max(0, topY - p[1]);
    const hw = L.w / 2;
    const quad = (y0, y1, z, v0, v1) => B.quad('laundry', [-hw, y0, z], [hw, y0, z], [hw, y1, z], [-hw, y1, z], '#ffffff', [[uv[0], v0], [uv[2], v0], [uv[2], v1], [uv[0], v1]]);
    if (L.hang === 'fold') {
      // folded over the pole: front part longer, back part shorter
      quad(topY - L.h, topY, 0.012, uv[1], uv[3]);
      quad(topY - L.h * 0.7, topY, -0.012, uv[1], uv[1] + (uv[3] - uv[1]) * 0.7);
    } else {
      quad(topY - L.h, topY, 0, uv[1], uv[3]);
    }
    B.swayFn = null;
    B.pop();
    u += L.w + 0.04 + r() * 0.1;
    n++;
  }
}
