/**
 * poles/signs.js — traffic signs (道路標識) and convex traffic mirrors
 * (カーブミラー) at the spots reserved in layout.SPOTS.
 *
 * Signs are real shapes (disc / diamond / inverted triangle / rounded square
 * / board): a grey aluminium back plate extruded from the shape plus a face
 * cut from the same shape with its UVs projected into the atlas, so the
 * silhouette outline is clean.  A sign within 1.5 m of a utility pole is
 * strapped to that pole; otherwise it gets its own galvanised post.  Signs
 * on the main street face the traffic that keeps left (west side -> south,
 * east side -> north); the others use the layout's rotY.
 * Mirrors are double-headed (二面鏡) so both roads at a corner are covered.
 */
import * as THREE from 'three';
import { MAIN_STREET } from '../../core/layout.js';
import { mtx, planarUV } from './kit.js';
import { rAt } from './pole.js';

const POST = '#b7bdc2';
const BACK = '#a1a8ae';
const ORANGE = '#ec7a34';

// --- shapes ------------------------------------------------------------------------
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function disc(r) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
}
function diamond(h) {
  const s = new THREE.Shape();
  const k = 0.03; // tiny corner chamfer so the outline is not needle sharp
  s.moveTo(0, h); s.lineTo(k, h - k);
  s.lineTo(h - k, k); s.lineTo(h, 0); s.lineTo(h - k, -k);
  s.lineTo(k, -h + k); s.lineTo(0, -h); s.lineTo(-k, -h + k);
  s.lineTo(-h + k, -k); s.lineTo(-h, 0); s.lineTo(-h + k, k);
  s.lineTo(-k, h - k); s.lineTo(0, h);
  return s;
}
function invTriangle(side) {
  const h = side * 0.866;
  const s = new THREE.Shape();
  s.moveTo(-side / 2, h / 2); s.lineTo(side / 2, h / 2); s.lineTo(0, -h / 2); s.lineTo(-side / 2, h / 2);
  return s;
}

/** Type table: shape, size (bbox w,h), atlas region, optional sub plate. */
const TYPES = {
  speed30: { shape: () => disc(0.3), w: 0.6, h: 0.6, face: 's_speed30', sub: 'sub_zone' },
  noParking: { shape: () => disc(0.3), w: 0.6, h: 0.6, face: 's_noParking', sub: 'sub_time' },
  schoolRoute: { shape: () => diamond(0.32), w: 0.64, h: 0.64, face: 's_school', sub: 'sub_school' },
  pedestrianPriority: { shape: () => roundedRect(0.6, 0.6, 0.05), w: 0.6, h: 0.6, face: 's_ped', sub: 'sub_ped' },
  stop: { shape: () => invTriangle(0.8), w: 0.8, h: 0.8 * 0.866, face: 's_stop', sub: null },
  railwayCrossingAhead: { shape: () => diamond(0.32), w: 0.64, h: 0.64, face: 's_rail', sub: 'sub_rail' },
  direction: { shape: () => roundedRect(1.2, 0.75, 0.05), w: 1.2, h: 0.75, face: 'dir', sub: null },
};

/** Grey back plate + atlas face for one shape, in a frame facing +Z. */
function signPanel(K, f, shape, w, h, region, cy) {
  const back = new THREE.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: false, curveSegments: 20 });
  back.translate(0, 0, -0.014);
  f.geo('metal', back, BACK, 0, cy, 0);
  // rolled reinforcing rim on the back
  const rim = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 20 });
  rim.translate(0, 0, -0.034);
  f.geo('metalS', rim, '#8d949a', 0, cy, 0, 0, 0, 0, 0.94, 0.94, 1);
  const face = new THREE.ShapeGeometry(shape, 20);
  planarUV(face, region, -w / 2, w / 2, -h / 2, h / 2);
  f.geo('decal', face, '#fff', 0, cy, 0.004);
}

/** Rectangular sub plate (補助標識) under a sign. */
function subPlate(K, f, region, cy) {
  f.box('metal', 0.5, 0.19, 0.012, BACK, 0, cy, -0.007);
  f.plane(region, 0.49, 0.18, 0, cy, 0.0015, 0);
}

/**
 * @param {object} K     kit
 * @param {object} L     layout
 * @param {Array} poles  pole plans (x,y,z)
 */
export function buildSigns(K, L, poles) {
  const R = K.R;
  for (const spot of L.SPOTS.signs) {
    const T = TYPES[spot.type];
    if (!T) continue;
    const yaw = signYaw(spot);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    // nearest utility pole
    let host = null, best = 1.5;
    for (const p of poles) {
      const d = Math.hypot(p.x - spot.x, p.z - spot.z);
      if (d < best) { best = d; host = p; }
    }
    const isDir = spot.type === 'direction';
    // centre of the main panel above the foot (sub plates hang below it, bottom edge ~2 m)
    const cy = isDir ? 3.05 : spot.type === 'stop' ? 2.25 : 2.6;
    if (host) {
      // strap to the utility pole, on its traffic-facing side
      const off = rAt(cy) + 0.09;
      const F = mtx(host.x + fx * off, host.y, host.z + fz * off, 0, yaw, 0);
      const f = K.frame(F);
      signPanel(K, f, T.shape(), T.w, T.h, R[T.face], cy);
      if (T.sub) subPlate(K, f, R[T.sub], cy - T.h / 2 - 0.15);
      // brackets: flat bars to U-bolt bands around the pole
      const hf = K.frame(mtx(host.x, host.y, host.z, 0, yaw, 0));
      const lo = T.sub ? cy - T.h / 2 - 0.15 : cy - T.h * 0.3;
      for (const yy of [cy + T.h * 0.3, lo]) {
        hf.cyl('metalS', rAt(yy) + 0.01, rAt(yy) + 0.01, 0.04, '#7f868d', 0, yy - 0.02, 0, 14);
        hf.box('metalS', 0.05, 0.035, off - 0.03, '#7f868d', 0, yy, (off - 0.03) / 2 + 0.02);
      }
      continue;
    }
    // own galvanised post
    const y0 = spot.y ?? L.groundY(spot.x, spot.z);
    const top = cy + T.h / 2 + 0.08;
    const pf = K.frame(mtx(spot.x, y0, spot.z, 0, yaw, 0));
    const pr = isDir ? 0.05 : 0.032;
    pf.cyl('metal', pr, pr, top + 0.1, POST, 0, -0.1, 0, 12);
    pf.cyl('metalS', pr + 0.004, pr + 0.004, 0.02, '#8d949a', 0, top, 0, 12);
    const capG = K.proto(`postcap${pr}`, () => new THREE.SphereGeometry(pr + 0.004, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2));
    K.add('metalS', capG, '#8d949a', pf.m(0, top + 0.02, 0));
    pf.cyl('vc', pr + 0.05, pr + 0.07, 0.05, '#a8a6a0', 0, -0.02, 0, 12); // concrete foot
    // reflective band on the post
    pf.cyl('vcS', pr + 0.003, pr + 0.003, 0.08, '#eef1f4', 0, 1.0, 0, 12);
    const f = K.frame(mtx(spot.x + fx * (pr + 0.035), y0, spot.z + fz * (pr + 0.035), 0, yaw, 0));
    signPanel(K, f, T.shape(), T.w, T.h, R[T.face], cy);
    if (T.sub) subPlate(K, f, R[T.sub], cy - T.h / 2 - 0.15);
    const lo = T.sub ? cy - T.h / 2 - 0.15 : cy - T.h * 0.3;
    for (const yy of [cy + T.h * 0.3, lo]) {
      pf.cyl('metalS', pr + 0.008, pr + 0.008, 0.035, '#7f868d', 0, yy - 0.018, 0, 12);
      pf.box('metalS', isDir ? 0.9 : 0.2, 0.03, 0.02, '#7f868d', 0, yy, pr + 0.012);
    }
  }
}

/** Which way a sign face points (world yaw of its +Z). */
function signYaw(spot) {
  if (spot.z > 10 && spot.type !== 'direction') {
    const fr = MAIN_STREET.atZ(spot.z);
    if (Math.abs(spot.x - fr.x) < 6.5) {
      const side = Math.sign(spot.x - fr.x) || 1;
      // keep-left: west side serves northbound traffic (faces south), east side faces north
      return side < 0 ? Math.atan2(fr.tx, fr.tz) : Math.atan2(-fr.tx, -fr.tz);
    }
  }
  if (spot.type === 'direction') {
    // guide sign for traffic heading to the station: faces south down the street
    const fr = MAIN_STREET.atZ(spot.z);
    return Math.atan2(fr.tx, fr.tz);
  }
  return spot.rotY;
}

/**
 * Convex mirrors (カーブミラー): orange post with reflective bands, a plate
 * under the heads, and at T-junction corners TWO heads (二面鏡) on a short
 * T-bar — one at the layout's rotY, the second turned ~110° toward the
 * approach from the south — so both roads meeting at the corner are covered.
 * Each head: back drum + domed back, rim, hood, and a painted fish-eye
 * reflection on a slightly domed face.
 */
const MIRROR_R = 0.3;
const MIRROR_Y = 2.95;
const SECOND_HEAD = 1.9; // yaw between the two heads (rad)

export function buildMirrors(K, L) {
  const R = K.R;
  L.SPOTS.mirrors.forEach((m, i) => {
    const y0 = m.y ?? L.groundY(m.x, m.z);
    // second head: whichever of rotY ± SECOND_HEAD faces more toward +Z (the main approach)
    const yawB = Math.cos(m.rotY + SECOND_HEAD) > Math.cos(m.rotY - SECOND_HEAD) ? m.rotY + SECOND_HEAD : m.rotY - SECOND_HEAD;
    const mid = (m.rotY + yawB) / 2; // bisector: the post frame faces between the heads
    const half = (yawB - m.rotY) / 2;
    const f = K.frame(mtx(m.x, y0, m.z, 0, mid, 0));
    const H = MIRROR_Y + 0.12; // post top, just under the T-bar
    // post + foot + cap + reflective stripes
    f.cyl('vc', 0.07, 0.085, 0.06, '#a8a6a0', 0, -0.02, 0, 12);
    f.cyl('metal', 0.038, 0.038, H, ORANGE, 0, 0, 0, 12);
    const capG = K.proto('mirrorCap', () => new THREE.SphereGeometry(0.042, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2));
    K.add('metalS', capG, ORANGE, f.m(0, H, 0));
    for (const yy of [0.75, 0.95]) f.cyl('vcS', 0.041, 0.041, 0.1, yy < 0.8 ? '#f2f4f6' : '#d8433d', 0, yy, 0, 12);
    // plate under the heads (faces the bisector)
    const py = 2.2;
    f.box('metal', 0.42, 0.13, 0.012, '#f4f4f0', 0, py, 0.048);
    f.plane(R[`mplate${i % 2}`], 0.41, 0.12, 0, py, 0.0555, 0);
    for (const yy of [py + 0.04, py - 0.04]) f.cyl('metalS', 0.044, 0.044, 0.025, '#7f868d', 0, yy - 0.012, 0, 12);
    // T-bar: two horizontal arms carrying the heads, clamped to the post
    const armX = 0.4; // lateral offset of each head from the post
    for (const yy of [MIRROR_Y + 0.05, MIRROR_Y - 0.12]) {
      f.box('metal', armX * 2 - 0.1, 0.045, 0.045, ORANGE, 0, yy, 0.02);
      f.cyl('metalS', 0.046, 0.046, 0.04, '#7f868d', 0, yy - 0.02, 0, 12);
    }
    // heads: the one for rotY sits on the side it turns toward
    const sA = Math.sign(-half) || 1;
    mirrorHead(K, R, f, sA * armX, 0.06, -half);
    mirrorHead(K, R, f, -sA * armX, 0.06, half);
  });
}

/** One mirror head in the post frame: centre (lx, MIRROR_Y, lz), turned by yaw. */
function mirrorHead(K, R, f, lx, lz, yaw) {
  const hf = K.frame(f.m(lx, MIRROR_Y, lz, 0, yaw, 0));
  const mr = MIRROR_R;
  // bracket stubs from the T-bar into the back housing
  hf.box('metal', 0.05, 0.05, 0.1, ORANGE, 0, 0.05, -0.08);
  hf.box('metal', 0.05, 0.05, 0.1, ORANGE, 0, -0.12, -0.08);
  // back housing (shallow drum + domed back)
  const drum = K.proto('mirrorDrum', () => { const g = new THREE.CylinderGeometry(mr + 0.02, mr + 0.02, 0.07, 32); g.rotateX(Math.PI / 2); return g; });
  K.add('metal', drum, ORANGE, hf.m(0, 0, 0));
  const dome = K.proto('mirrorDome', () => {
    const g = new THREE.SphereGeometry(mr + 0.02, 28, 6, 0, Math.PI * 2, 0, 0.9);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (mr + 0.02) * Math.cos(0.9)); // rim at z = 0, dome bulges toward -z
    return g;
  });
  K.add('metal', dome, ORANGE, hf.m(0, 0, -0.034, 0, 0, 0, 1, 1, 0.4));
  // front rim
  const rim = K.proto('mirrorRim', () => new THREE.TorusGeometry(mr + 0.005, 0.02, 6, 36));
  K.add('metal', rim, ORANGE, hf.m(0, 0, 0.04));
  // convex face: low spherical cap, UVs projected onto the painted reflection
  const face = K.proto('mirrorFace', () => {
    const Rs = 1.1;
    const a = Math.asin(mr / Rs);
    const g = new THREE.SphereGeometry(Rs, 32, 6, 0, Math.PI * 2, 0, a);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, -Rs * Math.cos(a));
    planarUV(g, R.mirror, -mr, mr, -mr, mr);
    return g;
  });
  K.add('glow', face, '#fff', hf.m(0, 0, 0.03));
  // hood over the top half (double-sided thin shell)
  const hood = K.proto('mirrorHood', () => {
    const outer = new THREE.CylinderGeometry(mr + 0.035, mr + 0.035, 0.13, 20, 1, true, Math.PI / 2, Math.PI);
    const inner = new THREE.CylinderGeometry(mr + 0.028, mr + 0.028, 0.13, 20, 1, true, Math.PI / 2, Math.PI);
    flip(inner);
    const g = K.ctx.geom.merge([outer, inner]);
    g.rotateX(Math.PI / 2);
    return g;
  });
  K.add('metal', hood, ORANGE, hf.m(0, 0, 0.08));
}

/** Reverse winding + normals (inner surface of a shell). */
function flip(g) {
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}
