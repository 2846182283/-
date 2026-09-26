/**
 * people/accessories — hand-held and worn props, built straight into a
 * character's RigMesh so they cost no extra draw calls:
 *   school satchel, eco shopping bag (with a leek!), plastic bag, tote,
 *   briefcase, backpack, shoulder-strap bag, paperback with a bookstore
 *   cover (+ a page on its own bone), phone, chalk, sailor scarf, glasses.
 *
 * Positions are given in model space of the REST pose relative to a bone;
 * helpers take the bone's rest position so props follow the posed hand.
 */
import * as THREE from 'three';
import { rbox, ellipsoid, cyl, torus, tube, strand, M, V3, loft } from './mesh.js';

/** Satchel (学生鞄) hanging from a hand grip; top handle in the fist. */
export function satchel(RM, rest, bone, o = {}) {
  const h = rest[bone];
  const col = o.color || '#3b2f2c';
  const w = 0.36, hh = 0.25, d = 0.09;
  const y = h.y - 0.1 - hh / 2 - 0.03;
  const m = (x, yy, z, rx = 0, ry = 0, rz = 0) => M(h.x + x, yy, h.z + z, rx, (o.ry || 0) + ry, rz);
  RM.add(rbox(d, hh, w, 0.018), { m: m(0, y, 0), bone, color: col });
  // flap + clasp
  RM.add(rbox(d + 0.008, hh * 0.55, w + 0.006, 0.016), { m: m(0.0, y + hh * 0.24, 0), bone, color: new THREE.Color(col).multiplyScalar(1.12) });
  RM.add(rbox(0.012, 0.04, 0.05, 0.004), { m: m(o.side || 0.05, y + 0.0, 0), bone, color: '#c9b36a' });
  // handle
  RM.add(torus(0.045, 0.009, 5, 10, Math.PI), { m: m(0, y + hh / 2, 0, 0, Math.PI / 2), bone, color: col });
  if (o.charm) RM.add(ellipsoid(0.018, 0.022, 0.012, 8, 6), { m: m(0.05, y + hh / 2 - 0.04, w / 2 - 0.02), bone, color: o.charm, flut: 0.01 });
}

/** Eco bag held by its handles (hanging from the hand), optional leek. */
export function ecoBag(RM, rest, bone, rect, o = {}) {
  const h = rest[bone];
  const w = o.w || 0.3, hh = o.h || 0.3, d = o.d || 0.13;
  const y = h.y - 0.13 - hh / 2;
  const ry = o.ry || 0;
  const m = (x, yy, z, rx = 0, ry2 = 0, rz = 0) => M(h.x + x, yy, h.z + z, rx, ry + ry2, rz);
  const g = ellipsoid(w / 2, hh / 2, d / 2, 14, 10, (p) => {
    // boxy soft bag, flat top opening
    p.x *= 1 + 0.15 * (1 - Math.abs(p.y) / (hh / 2));
    if (p.y > hh * 0.35) p.y = hh * 0.35 + (p.y - hh * 0.35) * 0.2;
  });
  RM.add(g, {
    m: m(0, y, 0), bone,
    color: '#ffffff',
    uv: rect ? (p) => {
      const lx = p.x - h.x, ly = p.y - y;
      return rect.map(0.5 + lx / w, 0.5 + ly / hh);
    } : null,
  });
  // handles up to the fist
  for (const s of [-1, 1]) {
    RM.add(tube([V3(h.x + s * w * 0.28, y + hh * 0.34, h.z), V3(h.x + s * 0.02, h.y - 0.07, h.z), V3(h.x, h.y - 0.05, h.z)], 0.007, 4), { bone, color: o.handle || '#5a6e62' });
  }
  if (o.leek) {
    // negi sticking out of the bag (white shaft -> green leaves)
    const base = V3(h.x - w * 0.18, y + hh * 0.2, h.z + d * 0.1);
    const top = base.clone().add(V3(-0.05, 0.3, -0.03));
    const shaft = loft([
      { y: 0, rx: 0.016, rz: 0.016, c: '#f3f1e6' }, { y: 0.16, rx: 0.017, rz: 0.017, c: '#eef2da' }, { y: 0.2, rx: 0.018, rz: 0.018, c: '#9cc27a' }, { y: 0.26, rx: 0.016, rz: 0.016, c: '#7fa865' },
    ], { seg: 8 });
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), top.clone().sub(base).normalize());
    RM.add(shaft, { m: new THREE.Matrix4().compose(base, q, V3(1, 1, 1)), bone, color: undefined });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1;
      const p0 = top.clone(), p1 = top.clone().add(V3(Math.cos(a) * 0.05, 0.08, Math.sin(a) * 0.04)), p2 = top.clone().add(V3(Math.cos(a) * 0.12, 0.05 - k * 0.03, Math.sin(a) * 0.09));
      RM.add(strand([p0, p1, p2], { width: (t) => 0.012 * (1 - t * 0.7), thick: () => 0.005, out: top.clone().add(V3(0, -0.2, 0)) }), { bone, color: '#86ad69', flut: (p, t) => 0.02 * t });
    }
  }
}

/** Soft white plastic bag (konbini bag) with a visible carton inside. */
export function plasticBag(RM, rest, bone, o = {}) {
  const h = rest[bone];
  const y = h.y - 0.22;
  const g = ellipsoid(0.14, 0.13, 0.08, 12, 8, (p) => { if (p.y > 0.06) p.y = 0.06 + (p.y - 0.06) * 0.3; });
  RM.add(g, { m: M(h.x, y, h.z, 0, o.ry || 0, 0.05), bone, color: '#f4f4f0', flut: (p) => 0.006 });
  for (const s of [-1, 1]) RM.add(tube([V3(h.x + s * 0.08, y + 0.07, h.z), V3(h.x + s * 0.02, h.y - 0.06, h.z), V3(h.x, h.y - 0.05, h.z)], 0.008, 4), { bone, color: '#f4f4f0' });
  RM.add(rbox(0.07, 0.09, 0.05, 0.005), { m: M(h.x + 0.03, y + 0.07, h.z), bone, color: '#7fb3d8' });
}

/** Briefcase held by the handle. */
export function briefcase(RM, rest, bone, o = {}) {
  const h = rest[bone];
  const y = h.y - 0.08 - 0.15;
  RM.add(rbox(0.08, 0.28, 0.4, 0.014), { m: M(h.x, y, h.z + 0.02, 0, o.ry || 0), bone, color: o.color || '#3c3230' });
  RM.add(torus(0.04, 0.009, 5, 10, Math.PI), { m: M(h.x, y + 0.14, h.z + 0.02, 0, Math.PI / 2 + (o.ry || 0)), bone, color: '#2a2422' });
  RM.add(rbox(0.086, 0.02, 0.05, 0.004), { m: M(h.x, y + 0.08, h.z + 0.02, 0, o.ry || 0), bone, color: '#b8a36a' });
}

/** Backpack on the upper back (chest bone) with straps over the shoulders. */
export function backpack(RM, P, o = {}) {
  const col = o.color || '#46505a';
  const zb = -(P.torso[5].rz + 0.07);
  const y = P.chestY - 0.03;
  RM.add(rbox(0.3, 0.4, 0.14, 0.05, 3), { m: M(0, y, zb), bone: 'chest', color: col });
  RM.add(rbox(0.24, 0.16, 0.05, 0.02), { m: M(0, y - 0.1, zb - 0.07), bone: 'chest', color: new THREE.Color(col).multiplyScalar(0.85) });
  RM.add(rbox(0.26, 0.08, 0.12, 0.03), { m: M(0, y + 0.19, zb - 0.005), bone: 'chest', color: new THREE.Color(col).multiplyScalar(0.9) });
  for (const sx of [-1, 1]) {
    const pts = [V3(sx * 0.09, y + 0.17, zb + 0.05), V3(sx * 0.1, P.shoulderY + 0.035, -0.04), V3(sx * 0.11, P.shoulderY - 0.03, P.torso[6].rz + 0.012), V3(sx * 0.12, P.chestY - 0.12, P.torso[5].rzf + 0.01), V3(sx * 0.13, P.waistY + 0.04, -0.04 + P.torso[4].rz * 0.2)];
    RM.add(strand(pts, { width: () => 0.022, thick: () => 0.006, out: V3(0, P.chestY, 0) }), { bone: 'chest', color: new THREE.Color(col).multiplyScalar(0.7) });
  }
}

/** Shoulder bag: strap across the body, bag at the opposite hip. */
export function crossBag(RM, P, o = {}) {
  const col = o.color || '#6a5a4a';
  const side = o.side || 1; // strap on the LEFT shoulder -> bag on the right hip
  const T = P.torso;
  const pts = [
    V3(side * 0.1, P.shoulderY + 0.02, T[7].rz * 0.2),
    V3(side * 0.05, P.chestY + 0.04, T[5].rzf + 0.012),
    V3(-side * 0.08, P.waistY + 0.02, T[3].rz + 0.015),
    V3(-side * 0.16, P.hipsY, 0.02),
  ];
  RM.add(strand(pts, { width: () => o.strap || 0.016, thick: () => 0.004, out: V3(0, P.waistY, -0.3) }), { bone: 'chest', color: new THREE.Color(col).multiplyScalar(0.75) });
  const back = [V3(side * 0.1, P.shoulderY + 0.02, T[7].rz * 0.2), V3(0, P.chestY - 0.02, -T[5].rz - 0.014), V3(-side * 0.16, P.hipsY + 0.02, -0.04)];
  RM.add(strand(back, { width: () => o.strap || 0.016, thick: () => 0.004, out: V3(0, P.waistY, 0.3) }), { bone: 'chest', color: new THREE.Color(col).multiplyScalar(0.75) });
  RM.add(rbox(o.w || 0.08, o.h || 0.2, o.d || 0.26, 0.02), { m: M(-side * (T[2].rx + 0.05), P.hipsY - 0.04, 0.02, 0, 0, -side * 0.05), bone: 'hips', color: col });
}

/** Paperback with a bookstore paper cover, held open in front at `centre` (model), with a turning page bone. */
export function book(RM, bone, pageBone, centre, rect, o = {}) {
  const ry = o.ry || 0, rx = o.rx || 0;
  const w = 0.105, h = 0.15;
  const add = (g, x, y, z, color, extra = {}) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')).premultiply(new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z)).multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    RM.add(g, { m, bone: extra.bone || bone, color, uv: extra.uv, flip: extra.flip });
  };
  // open book: two halves in a shallow V (hinged at the spine), cover on the outside
  for (const s of [-1, 1]) {
    const cover = rbox(w, h, 0.004, 0.0015, 1).translate(s * w * 0.5, 0, -0.012).rotateY(-s * 0.18);
    add(cover, 0, 0, 0, '#ffffff', { uv: () => rect.map(0.5 + s * 0.25, 0.5) });
    const pages = rbox(w * 0.96, h * 0.95, 0.012, 0.002, 1).translate(s * w * 0.49, 0, -0.004).rotateY(-s * 0.18);
    add(pages, 0, 0, 0, '#f6f2e6');
  }
  // the turning page (hinged at the spine on pageBone), resting on the right half
  if (pageBone) {
    const page = new THREE.PlaneGeometry(w * 0.94, h * 0.93, 3, 1).translate(w * 0.47, 0, 0.004).rotateY(-0.18);
    add(page, 0, 0, 0, '#fbf8ee', { bone: pageBone });
    add(page, 0, 0, 0, '#efeadb', { bone: pageBone, flip: true });
  }
}

/** Smartphone at `centre` (model), screen facing `dir` yaw. */
export function phone(RM, D, bone, centre, rect, o = {}) {
  const m = M(centre.x, centre.y, centre.z, o.rx || 0, o.ry || 0, o.rz || 0);
  RM.add(rbox(0.072, 0.145, 0.009, 0.006), { m, bone, color: o.color || '#e8dfe6' });
  const scr = new THREE.PlaneGeometry(0.062, 0.128).translate(0, 0, 0.0052);
  D.add(scr, { m, bone, color: '#ffffff', uv: (p, n, uv) => rect.map(uv[0], uv[1]) });
}

/** Sailor scarf: knot at the V + two tails (flutter). */
export function sailorScarf(RM, P, color) {
  const z = P.torso[5].rzf + 0.012;
  const y = P.chestY - 0.005;
  RM.add(ellipsoid(0.03, 0.024, 0.016, 10, 6), { m: M(0, y, z + 0.004), bone: 'chest', color });
  for (const s of [-1, 1]) {
    const pts = [V3(s * 0.01, y - 0.01, z + 0.01), V3(s * 0.035, y - 0.05, z + 0.014), V3(s * 0.045, y - 0.11, z + 0.006)];
    RM.add(strand(pts, { width: (t) => 0.024 + t * 0.012, thick: () => 0.004, out: V3(0, y, 0) }), { bone: 'chest', color, flut: (p, t) => 0.018 * t });
  }
  // the scarf band continuing around the neck under the collar
  for (const s of [-1, 1]) {
    RM.add(strand([V3(s * 0.012, y + 0.01, z + 0.004), V3(s * 0.06, P.shoulderY - 0.02, P.torso[6].rz + 0.004), V3(s * 0.07, P.neckBase, 0.02)], { width: () => 0.012, thick: () => 0.004, out: V3(0, P.chestY, 0) }), { bone: 'chest', color });
  }
}

/** Thin round glasses (detail mesh: no outline) on the head bone. */
export function glasses(D, P, color = '#6a5550') {
  const R = P.R;
  const ey = P.cy - 0.2 * R, ez = P.cz + R * 0.95;
  for (const sx of [-1, 1]) {
    const ring = torus(R * 0.2, 0.0022, 4, 16);
    D.add(ring, { m: M(sx * 0.37 * R, ey, ez, 0, sx * 0.12, 0), bone: 'head', color });
    D.add(tube([V3(sx * 0.56 * R, ey + 0.004, ez - 0.004), V3(sx * 0.98 * R, ey + 0.006, P.cz - 0.2 * R), V3(sx * 0.98 * R, ey - 0.01, P.cz - 0.55 * R)], 0.002, 4), { bone: 'head', color });
  }
  D.add(tube([V3(-0.17 * R, ey + 0.004, ez + 0.004), V3(0, ey + 0.008, ez + 0.012), V3(0.17 * R, ey + 0.004, ez + 0.004)], 0.002, 4), { bone: 'head', color });
}

export { cyl };
