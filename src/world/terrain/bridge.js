/**
 * terrain/bridge — the small concrete road/foot bridge over the river (layout BRIDGE).
 *
 *   deck     asphalt carriageway between two raised concrete kerbs, ramping from
 *            the levee-top paths (2.4 m) up to BRIDGE.deckY over 3 m at each end
 *            (the same profile as layout.walkFloorY), worn white edge lines and
 *            steel expansion joints where the span meets the abutments
 *   body     deck slab with a projecting coping (the outline-catching edge), solid
 *            abutments sunk into both levees, two round-nosed river piers with caps
 *            and a darker wet band, a broken foam ring round each pier on the water
 *   railing  pale-green steel 高欄: posts + top / mid / bottom rails (one baked mesh)
 *            and thin balusters (instanced, noOutline)
 *   親柱     four concrete end posts carrying bronze name plates (桜橋 / さくらばし /
 *            春風川 / 竣功 date) — plate art lives in the markings atlas
 *   paths    gravel pad from the far end to the far levee path and a gravel lane
 *            climbing the hillside (sky.js keeps x ±9 m of the bridge clear there)
 *
 * Solid concrete goes into the 'concreteRaised' bin (casts shadows), paint / foam
 * into 'marks', the asphalt into 'asphalt', the plates into 'plates'.
 */
import * as THREE from 'three';
import { BRIDGE, TERRAIN, groundY } from '../../core/layout.js';
import { LIFT, addSlab, clamp, lerp, lin, fbm } from './common.js';
import { surfaceQuad } from './markings.js';
import { gravelStripZ } from './paths.js';

const T = TERRAIN;
const B = BRIDGE;
const RAMP = 3; // m, matches layout.walkFloorY
const HW = B.halfWidth;
const KERB_W = 0.32; // raised kerb along each deck edge
const KERB_H = 0.2;
const SLAB_D = 0.62; // deck slab depth under the span
const RAIL_X = HW - 0.12; // railing line (on the kerb)
const PIERS = [-81.8, -88.2];
const ABUT = { south: -75.4, north: -94.6 }; // abutment river faces (span between them)

const CONC = [0.95, 0.95, 0.96];
const CONC_SHADE = [0.86, 0.87, 0.9];
const WET = lin('#86938a');

/** Deck (asphalt) top height at z: levee height at the ends, deckY on the span. */
export function bridgeDeckY(z) {
  const t = clamp(Math.min(B.zSouth - z, z - B.zNorth) / RAMP, 0, 1);
  // ends sit 8 mm above the levee paths they overlap (no z-fighting with the gravel)
  return lerp(T.leveeHeight + LIFT.path + 0.008, B.deckY, t);
}

/** z samples along the deck: dense on the ramps, ~1.5 m on the span, exact at joints. */
function deckSamples() {
  const zs = new Set([B.zSouth, B.zNorth, ABUT.south, ABUT.north, ...PIERS]);
  for (let k = 1; k <= 3; k++) { zs.add(B.zSouth - k); zs.add(B.zNorth + k); }
  for (let z = B.zSouth - RAMP; z > B.zNorth + RAMP; z -= 1.5) zs.add(z);
  return [...zs].sort((a, b) => b - a); // south (larger z) -> north
}

/** Append a THREE geometry (world-space via matrix) to a GeoBuilder with per-vertex colour fn. */
function appendGeometry(b, geo, matrix, colorFn, uvScale = 0.5) {
  const g = geo;
  g.applyMatrix4(matrix);
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const base = b.count;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ny = nrm.getY(i);
    // planar uvs: horizontal faces use xz, vertical faces run along (x+z) and up
    const u = Math.abs(ny) > 0.7 ? x * uvScale : (x + z) * uvScale;
    const v = Math.abs(ny) > 0.7 ? z * uvScale : y * uvScale;
    b.vert(x, y, z, u, v, colorFn(x, y, z), [nrm.getX(i), ny, nrm.getZ(i)]);
  }
  if (g.index) for (let i = 0; i < g.index.count; i += 3) b.tri(base + g.index.getX(i), base + g.index.getX(i + 1), base + g.index.getX(i + 2));
  else for (let i = 0; i < pos.count; i += 3) b.tri(base + i, base + i + 1, base + i + 2);
}

/** Concrete colour with a darker, greener wet band just above the water. */
const pierColor = (x, y) => {
  const h = y - T.waterLevel;
  if (h < 0.35) return WET;
  const k = 0.94 + 0.06 * fbm(x * 0.7, y * 1.3, 71, 2);
  return [CONC[0] * k, CONC[1] * k, CONC[2] * k];
};

/** Deck: asphalt surface, kerbs, slab / abutments, paint, joints. */
function deck(bins, atlas, zs) {
  const asp = bins.get('asphalt');
  const cr = bins.get('concreteRaised');
  const mk = bins.get('marks');
  const x0 = B.x - HW + KERB_W, x1 = B.x + HW - KERB_W;
  // asphalt: 4 strips across so the vertex tint can darken the wheel paths a touch
  const across = [0, 0.18, 0.5, 0.82, 1];
  asp.grid(across.length - 1, zs.length - 1, (i, j) => {
    const x = lerp(x0, x1, across[i]), z = zs[j];
    const wheel = i === 1 || i === 3 ? 0.97 : 1.0;
    const k = (0.95 + 0.06 * fbm(x * 0.3, z * 0.2, 88, 2)) * wheel;
    return [x, bridgeDeckY(z), z, x / 8, z / 8, [k * 0.98, k * 0.99, k * 1.02]];
  });
  const yDeck = (x, z) => bridgeDeckY(z);
  for (let j = 0; j < zs.length - 1; j++) {
    const za = zs[j], zb = zs[j + 1];
    const span = za <= ABUT.south && zb >= ABUT.north; // segment lies over the river span
    const bottom = span ? (x, z) => B.deckY - SLAB_D : (x, z) => groundY(x, z) - 0.35; // abutments sink into the levee
    // slab body (fascia stops just under the kerb coping)
    addSlab(cr, { x: B.x, z: za }, { x: B.x, z: zb }, 2 * HW + 0.06, bottom, (x, z) => yDeck(x, z) - 0.025, span ? CONC_SHADE : CONC, [0.1, 0.1, 0.9, 0.9]);
    // kerbs with a projecting coping on the outside (reads as the bridge's edge line)
    for (const s of [-1, 1]) {
      const xc = B.x + s * (HW - KERB_W / 2 + 0.05);
      addSlab(cr, { x: xc, z: za }, { x: xc, z: zb }, KERB_W + 0.1, (x, z) => yDeck(x, z) - 0.32, (x, z) => yDeck(x, z) + KERB_H, CONC, [0.1, 0.1, 0.9, 0.3]);
    }
  }
  // white edge lines just inside the kerbs (worn paint)
  const yL = (x, z) => bridgeDeckY(z) + 0.006;
  for (let j = 0; j < zs.length - 1; j++) {
    const za = zs[j], zb = zs[j + 1];
    for (const s of [-1, 1]) surfaceQuad(mk, B.x + s * (HW - KERB_W - 0.25), (za + zb) / 2, 0, -1, za - zb, 0.12, atlas.cell('white2', 20), yL);
  }
  // steel expansion joints across the deck where the span meets each abutment
  for (const z of [ABUT.south, ABUT.north]) surfaceQuad(mk, B.x, z, 1, 0, x1 - x0, 0.14, atlas.cell('white', 30), yL, [0.33, 0.35, 0.39]);
}

/** Round-nosed pier with a cap beam, plus a foam ring on the water. */
function piers(bins, atlas) {
  const cr = bins.get('concreteRaised');
  const mk = bins.get('marks');
  const len = 2 * HW - 0.2, thick = 0.72, r = thick / 2;
  const yb = T.riverBed - 0.25, capH = 0.4;
  const yTop = B.deckY - SLAB_D;
  const shaftH = yTop - capH - yb;
  const m = new THREE.Matrix4();
  for (const z of PIERS) {
    // shaft: box core + two half-round noses (cylinders), subdivided for the wet band
    appendGeometry(cr, new THREE.BoxGeometry(len - thick, shaftH, thick, 1, 10, 1), m.makeTranslation(B.x, yb + shaftH / 2, z), pierColor);
    for (const s of [-1, 1]) {
      appendGeometry(cr, new THREE.CylinderGeometry(r, r, shaftH, 12, 10, true, s > 0 ? 0 : Math.PI, Math.PI), m.makeTranslation(B.x + s * (len - thick) / 2, yb + shaftH / 2, z), pierColor);
    }
    // cap beam under the slab
    addSlab(cr, { x: B.x - HW - 0.02, z }, { x: B.x + HW + 0.02, z }, thick + 0.36, yTop - capH, yTop, CONC_SHADE, [0.1, 0.1, 0.9, 0.3]);
    // foam: broken white ring round the pier, trailing downstream (+x)
    const n = 28, yW = T.waterLevel + 0.012;
    const uv = atlas.cell('white2', 12);
    const ring = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const cx = B.x + Math.sign(ca) * (len - thick) / 2; // stadium: centre of the nearer nose
      const w = 0.12 + 0.45 * Math.max(0, ca) ** 2;
      const rin = r + 0.02, rout = r + 0.02 + w;
      const bx = Math.abs(ca) < 1e-6 ? B.x + ca * (len - thick) / 2 : cx;
      ring.push([bx + ca * rin, z + sa * rin, bx + ca * rout + Math.max(0, ca) * w * 1.5, z + sa * rout, i / n]);
    }
    for (let i = 0; i < n; i++) {
      const [ax, az, aox, aoz, ua] = ring[i];
      const [bx, bz, box, boz, ub] = ring[i + 1];
      const c = [0.96, 0.98, 1.0];
      const i0 = mk.vert(ax, yW, az, lerp(uv[0], uv[2], ua), uv[1], c);
      const i1 = mk.vert(bx, yW, bz, lerp(uv[0], uv[2], ub), uv[1], c);
      const i2 = mk.vert(box, yW, boz, lerp(uv[0], uv[2], ub), uv[3], c);
      const i3 = mk.vert(aox, yW, aoz, lerp(uv[0], uv[2], ua), uv[3], c);
      // angle grows from +x towards +z: this order faces up
      mk.quad(i0, i1, i2, i3);
    }
  }
}

/** Steel railing (posts + rails baked) and balusters (instanced transforms returned). */
function railing(bins, zs) {
  const rb = bins.get('bridgeRail');
  const col = [1, 1, 1];
  const kerbTop = (z) => bridgeDeckY(z) + KERB_H;
  const top = (z) => bridgeDeckY(z) + B.railH;
  const balusters = [];
  const zA = B.zSouth - 0.55, zB = B.zNorth + 0.55; // between the end posts
  for (const s of [-1, 1]) {
    const x = B.x + s * RAIL_X;
    // rails: top (flat bar), mid and bottom, following the deck profile segment by segment
    const zz = zs.filter((z) => z < zA && z > zB);
    zz.unshift(zA); zz.push(zB);
    for (let j = 0; j < zz.length - 1; j++) {
      const a = zz[j], b = zz[j + 1];
      addSlab(rb, { x, z: a }, { x, z: b }, 0.075, (xx, z) => top(z) - 0.055, (xx, z) => top(z), col);
      addSlab(rb, { x, z: a }, { x, z: b }, 0.035, (xx, z) => kerbTop(z) + 0.52, (xx, z) => kerbTop(z) + 0.56, col);
      addSlab(rb, { x, z: a }, { x, z: b }, 0.04, (xx, z) => kerbTop(z) + 0.1, (xx, z) => kerbTop(z) + 0.14, col);
    }
    // posts every ~1.9 m
    const nP = Math.round((zA - zB) / 1.9);
    for (let i = 0; i <= nP; i++) {
      const z = lerp(zA, zB, i / nP);
      addSlab(rb, { x, z: z + 0.045 }, { x, z: z - 0.045 }, 0.09, kerbTop(z) - 0.02, top(z) + 0.012, col);
    }
    // balusters every 0.15 m between the bottom and top rails
    for (let z = zA - 0.12; z > zB + 0.06; z -= 0.15) {
      const y0 = kerbTop(z) + 0.12, y1 = top(z) - 0.03;
      balusters.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0, z), new THREE.Quaternion(), new THREE.Vector3(1, y1 - y0, 1)));
    }
  }
  return balusters;
}

/** Concrete end posts (親柱) with bronze name plates facing the approach. */
function endPosts(bins, atlas) {
  const cr = bins.get('concreteRaised');
  const pl = bins.get('plates');
  const posts = [
    { z: B.zSouth - 0.25, s: -1, face: 1, plate: 'plate:name' },
    { z: B.zSouth - 0.25, s: 1, face: 1, plate: 'plate:kana' },
    { z: B.zNorth + 0.25, s: -1, face: -1, plate: 'plate:river' },
    { z: B.zNorth + 0.25, s: 1, face: -1, plate: 'plate:date' },
  ];
  const W = 0.46, H = B.railH + 0.3;
  for (const p of posts) {
    const x = B.x + p.s * (RAIL_X + 0.04);
    const y0 = bridgeDeckY(p.z);
    addSlab(cr, { x, z: p.z + W / 2 }, { x, z: p.z - W / 2 }, W, y0 - 0.3, y0 + H, CONC, [0.1, 0.1, 0.9, 0.9]);
    // cap: a slightly wider slab + a low pyramid-ish top
    addSlab(cr, { x, z: p.z + W / 2 + 0.04 }, { x, z: p.z - W / 2 - 0.04 }, W + 0.08, y0 + H, y0 + H + 0.08, [1.0, 1.0, 1.0], [0.1, 0.1, 0.9, 0.3]);
    addSlab(cr, { x, z: p.z + W / 2 - 0.06 }, { x, z: p.z - W / 2 + 0.06 }, W - 0.12, y0 + H + 0.08, y0 + H + 0.16, [1.0, 1.0, 1.0], [0.1, 0.1, 0.9, 0.3]);
    // plate on the face towards the approaching walker (±z), portrait 0.26 x 0.5
    const [u0, v0, u1, v1] = atlas.cell(p.plate, 4);
    const uc = (u0 + u1) / 2, uh = (u1 - u0) * 0.28;
    const zf = p.z + p.face * (W / 2 + 0.006);
    const yc = y0 + H - 0.42;
    const hw = 0.13, hh = 0.25;
    const n = [0, 0, p.face];
    // corners seen from the front: left/right depend on facing
    const xl = x - p.face * hw, xr = x + p.face * hw;
    const a = pl.vert(xl, yc - hh, zf, uc - uh, v0, [1, 1, 1], n);
    const b = pl.vert(xr, yc - hh, zf, uc + uh, v0, [1, 1, 1], n);
    const c = pl.vert(xr, yc + hh, zf, uc + uh, v1, [1, 1, 1], n);
    const d = pl.vert(xl, yc + hh, zf, uc - uh, v1, [1, 1, 1], n);
    pl.quad(a, b, c, d);
  }
}

/** Gravel pad from the far bridge end to the far levee path, and a lane up the hillside. */
function farPaths(bins) {
  const g = bins.get('gravel');
  const top = T.leveeHeight + LIFT.path + 0.003;
  const fz = (T.farLeveeTopSouth + T.farLeveeTopNorth) / 2 - 0.9; // far levee path centre (paths.js)
  gravelStripZ(g, B.zNorth + 0.02, fz + 0.55, B.x - HW - 0.2, B.x + HW + 0.2, () => top, 41);
  // lane climbing the hillside, with worn wheel tracks
  const yH = (x, z) => groundY(x, z) + LIFT.path;
  gravelStripZ(g, fz - 0.6, T.farLeveeTopNorth - 30, B.x - 1.6, B.x + 1.6, yH, 42);
}

/**
 * Build the bridge into the shared bins.  Returns the instanced baluster mesh
 * (needs the railing material) — terrain.js adds it to the root.
 */
export function buildBridge(ctx, bins, atlas, railMat) {
  const zs = deckSamples();
  deck(bins, atlas, zs);
  piers(bins, atlas);
  const balusters = railing(bins, zs);
  endPosts(bins, atlas);
  farPaths(bins);
  const geo = new THREE.BoxGeometry(0.022, 1, 0.022);
  geo.translate(0, 0.5, 0);
  const im = ctx.geom.instanced(geo, railMat, balusters, { castShadow: true, noOutline: true });
  im.name = 'terrain:balusters';
  return { balusters: im };
}

/** True inside the bridge footprint (+margin) — used to keep grass off the deck / abutments. */
export function inBridge(x, z, margin = 0.4) {
  return Math.abs(x - B.x) < HW + margin && z < B.zSouth + margin && z > B.zNorth - margin;
}
