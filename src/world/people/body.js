/**
 * people/body — the base anime body: head (with the painted face), neck,
 * torso (garment-textured), arms with sleeves, hands, legs with socks /
 * trousers, shoes, skirts and jacket hems.
 *
 * All parts are generated in rest-pose model space (see rig.js) and appended
 * to a RigMesh with their skinning.  Garments are mostly the body surfaces
 * themselves coloured by rings / the torso texture, plus a few shells (skirt,
 * hem, collar flap) that lift off the body for a clean silhouette.
 */
import * as THREE from 'three';
import { loft, ellipsoid, M, mix, ss } from './mesh.js';
import { FACE } from './atlas.js';

const lerp = THREE.MathUtils.lerp;

/** Anime head (cranium + tapered jaw), head-local: origin at the cranium centre. */
export function headGeometry(R, o = {}) {
  return ellipsoid(R, R, R, 30, 22, (p) => {
    const ny = p.y / R;
    if (ny < 0) {
      const t = -ny;
      p.x *= 1 - 0.3 * t * t - (o.jaw || 0) * t;
      p.z *= 1 - 0.12 * t;
      p.y *= 1.2;
      if (p.z > 0) p.z += R * 0.08 * t * t; // chin forward
    }
    if (p.z > 0) p.z *= 0.9; // flatter face
    else p.z *= 1.06; // rounder back of the skull
    p.x *= o.wide || 1;
  });
}

/** Head + ears; face projected from the atlas cell. */
export function buildHead(RM, P, faceRect, skin, o = {}) {
  const R = P.R;
  const m = M(0, P.cy, P.cz);
  const g = headGeometry(R, o);
  RM.add(g, {
    m, bone: 'head', color: '#ffffff',
    uv: (p) => {
      const lx = p.x, ly = p.y - P.cy, lz = p.z - P.cz;
      if (lz < -0.3 * R) return faceRect.map(0.04, 0.04); // plain skin corner behind the face
      return faceRect.map(0.5 + lx / (2 * R), (ly / R - FACE.vBottom) / FACE.vSpan);
    },
  });
  // ears
  for (const sx of [-1, 1]) {
    RM.add(ellipsoid(R * 0.12, R * 0.2, R * 0.13, 8, 6), { m: M(sx * R * 0.93, P.cy - R * 0.2, P.cz - R * 0.08, 0, sx * 0.4, sx * -0.15), bone: 'head', color: skin });
  }
  // neck
  const n0 = P.neckBase - 0.03, n1 = P.neckTop + 0.03;
  const nr = 0.034 * P.s * (P.kind === 'man' || P.kind === 'elderM' ? 1.15 : 1);
  RM.add(loft([
    { y: n0, rx: nr * 1.1, rz: nr, z: -0.012 },
    { y: (n0 + n1) / 2, rx: nr, rz: nr * 0.95, z: -0.008 },
    { y: n1, rx: nr * 0.95, rz: nr * 0.9, z: -0.004 },
  ], { seg: 12 }), {
    bone: (p) => { const t = ss(p.y, P.neckBase, P.neckTop + 0.02); return [['neck', 1 - t], ['head', t]]; },
    color: (p) => mix(skin, '#c9a4a8', 0.25 * (1 - ss(p.y, P.chinY - 0.02, P.chinY + 0.01))), // chin shadow
  });
}

/** Torso weights: hips -> spine -> chest -> neck by height. */
export function torsoSkin(P) {
  return (p) => {
    const a = ss(p.y, P.hipsY - 0.02, P.waistY + 0.02);
    const b = ss(p.y, P.waistY + 0.03, P.chestY - 0.02);
    const c = ss(p.y, P.neckBase - 0.03, P.neckBase + 0.02) * 0.6;
    return [['hips', 1 - a], ['spine', a * (1 - b)], ['chest', a * b * (1 - c)], ['neck', a * b * c]];
  };
}

/**
 * Torso wrapped in a garment.  garment: { rect (atlas) | color, bulk (extra m) }.
 * Returns the torso ring list used (for shells that follow the torso).
 */
export function buildTorso(RM, P, garment) {
  const bulk = garment.bulk || 0;
  const rings = P.torso.map((r, i) => {
    const top = i >= P.torso.length - 2;
    const b = top ? bulk * 0.3 : bulk;
    return { ...r, rx: r.rx + b, rz: r.rz + b, rzf: r.rzf ? r.rzf + b : undefined, rzb: r.rzb ? r.rzb + b : undefined };
  });
  const y0 = rings[0].y, y1 = rings[rings.length - 1].y;
  const g = loft(rings, { seg: 28, uvWrap: true, capTop: false });
  RM.add(g, {
    bone: torsoSkin(P),
    color: garment.rect ? '#ffffff' : garment.color,
    uv: garment.rect ? (p, n, uv) => garment.rect.map(uv[0], (p.y - y0) / (y1 - y0)) : null,
  });
  return { rings, y0, y1 };
}

/** Radius of the torso at height y, angle a (0 = +X, PI/2 = front). */
export function torsoRadius(rings, y, a) {
  let i = 0;
  while (i < rings.length - 2 && rings[i + 1].y < y) i++;
  const r0 = rings[i], r1 = rings[i + 1];
  const t = THREE.MathUtils.clamp((y - r0.y) / (r1.y - r0.y), 0, 1);
  const s = Math.sin(a);
  const rz0 = s > 0 ? (r0.rzf ?? r0.rz) : (r0.rzb ?? r0.rz), rz1 = s > 0 ? (r1.rzf ?? r1.rz) : (r1.rzb ?? r1.rz);
  return {
    rx: lerp(r0.rx, r1.rx, t), rz: lerp(rz0, rz1, t), z: lerp(r0.z || 0, r1.z || 0, t),
  };
}

/**
 * A shell following the torso between y0 and y1 (optionally over an angular
 * range), offset outward.  Used for the sailor collar flap and apron bib.
 */
export function torsoShell(torso, ys, off, o = {}) {
  const rings = ys.map((y) => {
    const r = torsoRadius(torso.rings, y, Math.PI / 2);
    const rb = torsoRadius(torso.rings, y, -Math.PI / 2);
    return { y, rx: r.rx + off, rzf: r.rz + off, rzb: rb.rz + off, rz: rb.rz + off, z: r.z };
  });
  return loft(rings, { seg: o.seg || 20, front: o.front, capTop: false, capBottom: false });
}

// ---------------------------------------------------------------------------
// arms
// ---------------------------------------------------------------------------
/**
 * sleeve: { color, end: 'wrist'|'elbow'|'short'|'rolled', cuff: [[fromY, toY, color], ...] (model y), bulk }
 */
export function buildArms(RM, P, skin, sleeve) {
  const s = P.limb;
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const sh = new THREE.Vector3(sx * P.shX, P.shoulderY, -0.012);
    const el = new THREE.Vector3(sx * (P.shX + 0.028 * P.s), P.elbowY, -0.02);
    const wr = new THREE.Vector3(sx * (P.shX + 0.042 * P.s), P.wristY, -0.005);
    const at = (y) => (y > el.y ? new THREE.Vector3().lerpVectors(el, sh, (y - el.y) / (sh.y - el.y)) : new THREE.Vector3().lerpVectors(wr, el, (y - wr.y) / (el.y - wr.y)));
    const bulk = sleeve.bulk ?? 0.006;
    const endY = sleeve.end === 'wrist' ? P.wristY + 0.005 : sleeve.end === 'rolled' ? P.elbowY - 0.07 : sleeve.end === 'elbow' ? P.elbowY - 0.02 : P.shoulderY - 0.12;
    const prof = [
      [P.shoulderY + 0.03, 0.022], [P.shoulderY + 0.012, 0.04], [P.shoulderY - 0.03, 0.045], [P.shoulderY - P.upperArm * 0.5, 0.039],
      [P.elbowY + 0.025, 0.033], [P.elbowY, 0.031], [P.elbowY - 0.045, 0.033], [P.wristY + 0.045, 0.026], [P.wristY + 0.01, 0.022], [P.wristY - 0.015, 0.02],
    ];
    const rings = [];
    for (const [y, r0] of prof) {
      const covered = y >= endY - 1e-4;
      let r = r0 * s + (covered ? bulk : 0);
      const c = at(y);
      rings.push({ y, rx: r, rz: r * 0.95, x: c.x, z: c.z, c: covered ? sleeve.color : skin });
    }
    // hard colour edge + cuff lip at the sleeve end
    const ec = at(endY);
    const rEnd = (interpR(prof, endY) * s) + bulk;
    const lip = sleeve.end === 'rolled' ? 0.012 : 0.004;
    rings.push({ y: endY + 0.0005, rx: rEnd + lip, rz: (rEnd + lip) * 0.95, x: ec.x, z: ec.z, c: sleeve.color });
    rings.push({ y: endY, rx: rEnd + lip, rz: (rEnd + lip) * 0.95, x: ec.x, z: ec.z, c: sleeve.color });
    rings.push({ y: endY - 0.0005, rx: interpR(prof, endY) * s * 0.98, rz: interpR(prof, endY) * s * 0.93, x: ec.x, z: ec.z, c: skin });
    rings.sort((a, b) => a.y - b.y);
    // cuff stripes (sailor) recolour rings by y range
    for (const r of rings) {
      for (const [a, b, col] of sleeve.cuff || []) if (r.y >= a && r.y <= b && r.c === sleeve.color) r.c = col;
    }
    const g = loft(rings.map((r) => ({ ...r })), { seg: 12 });
    const eb = el.y;
    RM.add(g, {
      bone: (p) => {
        const t = ss(p.y, eb + 0.035, eb - 0.035); // 0 upper .. 1 fore
        const sc = ss(p.y, P.shoulderY - 0.01, P.shoulderY + 0.03) * 0.45; // blend into the chest at the top
        return [[`upperArm_${sd}`, (1 - t) * (1 - sc)], [`foreArm_${sd}`, t], ['chest', sc]];
      },
    });
    // shoulder ball keeps the joint closed when the arm lifts
    RM.add(ellipsoid(0.047 * s + bulk, 0.045 * s + bulk, 0.044 * s + bulk, 10, 8), { m: M(sh.x - sx * 0.005, sh.y - 0.005, sh.z), bone: `upperArm_${sd}`, color: sleeve.color });
  }
}

function interpR(prof, y) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [ya, ra] = prof[i], [yb, rb] = prof[i + 1];
    if (y <= ya && y >= yb) return lerp(ra, rb, (ya - y) / (ya - yb));
  }
  return prof[prof.length - 1][1];
}

/**
 * Hands in hand-local space (origin at the wrist, hanging toward -Y, palm
 * facing inward).  shape: 'relaxed' | 'grip' | 'point' | 'fist' | 'open'
 */
export function buildHands(RM, P, color, shapes = {}) {
  const s = P.s * (P.kind === 'man' || P.kind === 'elderM' ? 1.08 : 1);
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const w = new THREE.Vector3(sx * (P.shX + 0.042 * P.s), P.wristY, -0.005);
    const shape = shapes[sd] || 'relaxed';
    const add = (g, x, y, z, rx = 0, ry = 0, rz = 0) => RM.add(g, { m: M(w.x + sx * x, w.y + y, w.z + z, rx, ry * sx, rz * sx), bone: `hand_${sd}`, color });
    // palm
    add(ellipsoid(0.015 * s, 0.042 * s, 0.033 * s, 10, 8), 0.0, -0.04 * s, 0.003);
    if (shape === 'relaxed' || shape === 'open') {
      add(ellipsoid(0.012 * s, 0.036 * s, 0.03 * s, 10, 8), -0.004, -0.09 * s, 0.006, shape === 'open' ? 0 : -0.25, 0, -0.12);
      add(ellipsoid(0.011 * s, 0.028 * s, 0.011 * s, 8, 6), -0.006, -0.045 * s, 0.035 * s, 0.35, 0, -0.2);
    } else {
      // curled fingers (fist), thumb over the front
      add(ellipsoid(0.019 * s, 0.027 * s, 0.03 * s, 10, 8), -0.008, -0.075 * s, 0.004);
      add(ellipsoid(0.01 * s, 0.024 * s, 0.01 * s, 8, 6), -0.012, -0.055 * s, 0.03 * s, 0.6, 0, -0.3);
      if (shape === 'point') add(ellipsoid(0.008 * s, 0.034 * s, 0.008 * s, 8, 6), -0.004, -0.115 * s, 0.022 * s);
    }
  }
}

// ---------------------------------------------------------------------------
// legs + shoes
// ---------------------------------------------------------------------------
/**
 * legs: { color(y) -> colour, bulk (trousers), hemFlare }
 */
export function buildLegs(RM, P, legs) {
  const s = P.limb * (P.kind === 'girl' || P.kind === 'woman' ? 0.95 : 1);
  const bulk = legs.bulk || 0;
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const hip = new THREE.Vector3(sx * P.hipX, P.hipJ, 0);
    const knee = new THREE.Vector3(sx * P.hipX * 0.88, P.kneeY, 0.004);
    const ank = new THREE.Vector3(sx * P.hipX * 0.82, P.ankleY, -0.006);
    const at = (y) => (y > knee.y ? new THREE.Vector3().lerpVectors(knee, hip, (y - knee.y) / (hip.y - knee.y)) : new THREE.Vector3().lerpVectors(ank, knee, (y - ank.y) / (knee.y - ank.y)));
    const prof = [
      [P.hipJ + 0.07, 0.066, 0], [P.crotchY, 0.078, -0.004], [lerp(P.hipJ, P.kneeY, 0.4), 0.067, 0], [P.kneeY + 0.06, 0.05, 0.002],
      [P.kneeY, 0.047, 0.004], [P.kneeY - 0.08, 0.052, -0.01], [P.ankleY + 0.12, 0.037, -0.004], [P.ankleY + 0.035, 0.028, 0], [P.ankleY - 0.03, 0.027, 0.004],
    ];
    const rings = [];
    for (const [y, r, dz] of prof) {
      const c = at(y);
      let rr = r * s;
      if (bulk) rr = Math.max(rr, (y < P.kneeY ? 0.052 : 0.06) * P.s) + bulk;
      rings.push({ y, rx: rr, rz: rr * 0.98, x: c.x, z: c.z + dz, c: legs.color(y) });
    }
    // hard colour steps (sock tops, trouser hems)
    for (const edge of legs.edges || []) {
      const c = at(edge.y);
      const r = interpLeg(rings, edge.y);
      rings.push({ y: edge.y + 0.0005, rx: r + (edge.lip || 0), rz: (r + (edge.lip || 0)) * 0.98, x: c.x, z: c.z, c: legs.color(edge.y + 0.01) });
      rings.push({ y: edge.y - 0.0005, rx: r + (edge.lip || 0), rz: (r + (edge.lip || 0)) * 0.98, x: c.x, z: c.z, c: legs.color(edge.y - 0.01) });
    }
    if (legs.hemFlare) {
      const c = at(P.ankleY + 0.02);
      rings.push({ y: P.ankleY + 0.02, rx: 0.055 * P.s + bulk, rz: 0.058 * P.s + bulk, x: c.x, z: c.z + 0.01, c: legs.color(P.ankleY + 0.05) });
      rings.push({ y: P.ankleY + 0.019, rx: 0.03 * P.s, rz: 0.03 * P.s, x: c.x, z: c.z + 0.01, c: '#3a3438' });
    }
    rings.sort((a, b) => a.y - b.y);
    const kb = knee.y, ab = ank.y;
    RM.add(loft(rings, { seg: 12 }), {
      bone: (p) => {
        const t = ss(p.y, kb + 0.04, kb - 0.04);
        const f = ss(p.y, ab + 0.02, ab - 0.02);
        return [[`thigh_${sd}`, 1 - t], [`shin_${sd}`, t * (1 - f)], [`foot_${sd}`, t * f]];
      },
    });
  }
}

function interpLeg(rings, y) {
  const sorted = [...rings].sort((a, b) => a.y - b.y);
  for (let i = 0; i < sorted.length - 1; i++) if (y >= sorted[i].y && y <= sorted[i + 1].y) return lerp(sorted[i].rx, sorted[i + 1].rx, (y - sorted[i].y) / (sorted[i + 1].y - sorted[i].y));
  return sorted[0].rx;
}

/** shoes: { color, sole, kind: 'loafer'|'sneaker'|'pump'|'boot' } */
export function buildShoes(RM, P, shoes) {
  const s = Math.max(0.8, P.s);
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const ax = sx * P.hipX * 0.82;
    const len = (shoes.kind === 'pump' ? 0.11 : 0.12) * s, wid = (shoes.kind === 'sneaker' ? 0.047 : 0.043) * s;
    const hgt = (shoes.kind === 'boot' ? 0.1 : shoes.kind === 'pump' ? 0.036 : 0.048) * s;
    const g = ellipsoid(wid, hgt, len, 12, 8, (p) => {
      if (p.y < -hgt * 0.35) p.y = -hgt * 0.35; // flat sole
      if (p.z > len * 0.4) p.y -= (p.z - len * 0.4) * 0.12; // toe spring
      if (p.z < -len * 0.5 && p.y > 0) p.y += 0.01; // heel counter
    });
    const baseY = hgt * 0.35 + 0.002;
    RM.add(g, {
      m: M(ax, baseY, 0.03 * s), bone: `foot_${sd}`,
      color: (p) => (p.y < 0.016 ? shoes.sole : shoes.color),
    });
    if (shoes.kind === 'loafer') {
      // saddle strap across the instep
      RM.add(ellipsoid(wid * 0.9, 0.012, 0.02, 10, 4), { m: M(ax, baseY + hgt * 0.45, 0.06 * s, -0.4), bone: `foot_${sd}`, color: new THREE.Color(shoes.color).multiplyScalar(0.8) });
    }
    if (shoes.kind === 'sneaker') {
      RM.add(ellipsoid(wid * 1.02, 0.012, len * 1.01, 12, 4), { m: M(ax, 0.012, 0.03 * s), bone: `foot_${sd}`, color: shoes.sole });
    }
  }
}

// ---------------------------------------------------------------------------
// skirts / hems
// ---------------------------------------------------------------------------
/**
 * Skirt shell from just above the waist to hemY.
 * o: { color, hemY, flare (1.3), pleats (0 = smooth), pleatAmp, flut (m), blow {x, z} (m at the hem), lining colour }
 */
export function buildSkirt(RM, P, o) {
  const t0 = P.torso;
  const waist = t0.find((r) => r.y === P.waistY) || t0[3];
  const hips = t0[2];
  const top = o.topY ?? P.waistY + 0.015;
  const hem = o.hemY;
  const flare = o.flare ?? 1.3;
  const blow = o.blow || { x: 0, z: 0 };
  const rings = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0 top .. 1 hem
    const y = lerp(top, hem, t);
    let rx, rz, z;
    if (y > hips.y) {
      const k = (y - hips.y) / (top - hips.y);
      rx = lerp(hips.rx + 0.018, waist.rx + 0.012, k);
      rz = lerp((hips.rzb || hips.rz) + 0.018, waist.rz + 0.012, k);
      z = lerp(hips.z || 0, 0, k);
    } else {
      const k = (hips.y - y) / Math.max(0.01, hips.y - hem);
      rx = (hips.rx + 0.02) * lerp(1, flare, k);
      rz = ((hips.rzb || hips.rz) + 0.02) * lerp(1, flare * 0.95, k);
      z = hips.z || 0;
    }
    const b = t * t;
    rings.push({ y: y + (o.lift || 0) * b, rx, rz, x: blow.x * b, z: z + blow.z * b, pleat: o.pleats ? (o.pleatAmp ?? 0.07) * Math.min(1, t * 3) : 0, c: o.color });
  }
  rings.reverse(); // loft wants increasing y
  const seg = o.pleats ? o.pleats * 2 : 24;
  const g = loft(rings, { seg, pleats: o.pleats || 0, capBottom: false, capTop: false });
  // loft 'along' runs 0 (hem) .. 1 (waist); u = 1 - along is the depth down the skirt
  if (o.billow) billowSkirt(g, o.billow);
  const skin = (p, a) => {
    const k = ss(1 - a, 0.25, 1) * 0.75;
    const l = ss(p.x, -0.05, 0.05);
    return [['hips', 1 - k], ['thigh_L', k * l], ['thigh_R', k * (1 - l)]];
  };
  const flut = (p, a) => (o.flut ?? 0.03) * (1 - a) * (1 - a);
  const base = new THREE.Color(o.color);
  const trim = o.trim ? new THREE.Color(o.trim) : null;
  RM.add(g, {
    bone: skin, flut,
    color: (p, n, a) => (trim && a < 0.07 ? trim : base.clone().multiplyScalar(1 - 0.06 * (1 - a))),
  });
  if (o.lining) {
    // inner surface (seen when the hem lifts): same shape, flipped, darker
    RM.add(g, { bone: skin, flut, color: o.lining, flip: true });
  }
  return rings;
}

/**
 * Wind-caught skirt: the downwind half of the hem lifts and swings outward
 * (strongest at the hem, nothing at the waist) so the silhouette reads as a
 * gust even in a still frame.  b: { x, z } downwind direction (model space), amt (m).
 */
function billowSkirt(g, b) {
  const pos = g.attributes.position, along = g.attributes.along;
  const len = Math.hypot(b.x, b.z) || 1;
  const dx = b.x / len, dz = b.z / len;
  for (let i = 0; i < pos.count; i++) {
    const u = 1 - along.getX(i);
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z) || 1;
    const side = Math.max(0, (x * dx + z * dz) / r); // 0 upwind .. 1 downwind
    const k = u * u * side * side * b.amt;
    pos.setXYZ(i, x + dx * k * 0.8, pos.getY(i) + k * 0.9, z + dz * k * 0.8);
  }
  g.computeVertexNormals();
}

/** Jacket / coat hem: a short flared shell over the hips (skinned like a skirt). */
export function buildHem(RM, P, o) {
  return buildSkirt(RM, P, { flare: 1.08, pleats: 0, flut: 0.004, ...o, topY: o.topY ?? P.waistY - 0.02 });
}

/** A textured hem: like buildHem but sampling the torso garment texture so pockets continue. */
export function buildTexturedHem(RM, P, torso, rect, o) {
  const top = o.topY ?? P.waistY + 0.01;
  const hem = o.hemY;
  const rings = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = lerp(hem, top, t);
    const r = torsoRadius(torso.rings, Math.max(y, torso.y0 + 0.001), Math.PI / 2);
    const rb = torsoRadius(torso.rings, Math.max(y, torso.y0 + 0.001), -Math.PI / 2);
    const hips = P.torso[2];
    const k = y < hips.y ? (hips.y - y) / Math.max(0.01, hips.y - hem) : 0;
    const add = (o.gap ?? 0.012) + k * (o.flare ?? 0.02);
    const rx = Math.max(r.rx, y < hips.y ? hips.rx : 0) + add;
    const rzf = Math.max(r.rz, y < hips.y ? hips.rz : 0) + add;
    const rzb = Math.max(rb.rz, y < hips.y ? (hips.rzb || hips.rz) : 0) + add;
    rings.push({ y, rx, rz: rzb, rzf, rzb, z: r.z });
  }
  const g = loft(rings, { seg: 28, uvWrap: true, capTop: false, capBottom: false });
  const span = top - hem;
  RM.add(g, {
    color: '#ffffff',
    uv: (p, nrm, uv) => rect.map(uv[0], (p.y - torso.y0) / (torso.y1 - torso.y0)),
    bone: (p) => {
      const t = THREE.MathUtils.clamp((top - p.y) / span, 0, 1);
      const k = ss(t, 0.3, 1) * 0.5;
      const l = ss(p.x, -0.05, 0.05);
      return [['hips', 1 - k], ['thigh_L', k * l], ['thigh_R', k * (1 - l)]];
    },
    flut: (p) => 0.006 * THREE.MathUtils.clamp((top - p.y) / span, 0, 1),
  });
  // inner lining so the open bottom never shows a see-through edge
  RM.add(g, { color: o.lining || '#3a3848', flip: true, bone: 'hips' });
}

