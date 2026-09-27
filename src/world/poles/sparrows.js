/**
 * poles/sparrows.js — sparrows (スズメ) perched on the wires.
 *
 * Two InstancedMeshes (bodies, wings — 2 wing instances per bird).  The
 * animation is a pure function of sim time, so screenshots at a given ?t=
 * are reproducible and nothing accumulates per frame:
 *   - time is cut into per-bird "slots" (1.3–2.5 s); each slot picks an
 *     action from a hash: idle (breathing, tail flicks), peck / preen,
 *     look around, or a hop along the wire; the facing flips now and then
 *     with a little hop-turn
 *   - a few "fliers" leave the wire on a long cycle, loop out over the
 *     street flapping / gliding and land back on the same perch
 */
import * as THREE from 'three';
import { hashString } from '../../core/layout.js';
import { spanPoint } from './wires.js';

const SCALE = 1.3; // slightly larger than life so they read at street distance

/** Deterministic 0..1 hash of (a, b). */
function h2(a, b) {
  let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12; x = Math.imul(x, 0x297a2d39); x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

function paint(g, color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Body geometry: origin at the feet, beak toward +Z. */
function birdGeometry(geom) {
  const parts = [];
  const blob = (sx, sy, sz, x, y, z, color, rx = 0, ws = 9, hs = 7) => {
    const g = new THREE.SphereGeometry(1, ws, hs);
    g.scale(sx, sy, sz);
    g.rotateX(rx);
    g.translate(x, y, z);
    parts.push(paint(g, color));
  };
  blob(0.034, 0.033, 0.05, 0, 0.05, -0.004, '#8b6446', -0.25); // back / body
  blob(0.03, 0.028, 0.04, 0, 0.042, 0.008, '#ece2cc', -0.2); // pale belly
  blob(0.026, 0.026, 0.027, 0, 0.086, 0.035, '#7b4a33'); // chestnut crown
  blob(0.021, 0.017, 0.02, 0, 0.078, 0.046, '#f4efe4'); // white cheeks / face
  blob(0.006, 0.006, 0.004, 0.02, 0.078, 0.047, '#2a282c', 0, 6, 4); // black cheek spots
  blob(0.006, 0.006, 0.004, -0.02, 0.078, 0.047, '#2a282c', 0, 6, 4);
  blob(0.011, 0.01, 0.006, 0, 0.066, 0.055, '#2a282c', 0, 6, 4); // black bib
  blob(0.0045, 0.0045, 0.0045, 0.016, 0.091, 0.053, '#1d1c20', 0, 6, 4); // eyes
  blob(0.0045, 0.0045, 0.0045, -0.016, 0.091, 0.053, '#1d1c20', 0, 6, 4);
  const beak = new THREE.ConeGeometry(0.0075, 0.018, 6);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.082, 0.066);
  parts.push(paint(beak, '#3b3431'));
  const tail = new THREE.BoxGeometry(0.02, 0.005, 0.052);
  tail.translate(0, 0, -0.026);
  tail.rotateX(-0.35);
  tail.translate(0, 0.05, -0.04);
  parts.push(paint(tail, '#5e4331'));
  for (const s of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 4);
    leg.translate(s * 0.009, 0.015, 0.004);
    parts.push(paint(leg, '#a07e6c'));
  }
  return geom.merge(parts, ['color']);
}

/** Wing: pivot at the shoulder, span along +X, chord along Z. */
function wingGeometry(geom) {
  const a = new THREE.SphereGeometry(1, 8, 5);
  a.scale(0.042, 0.005, 0.02);
  a.translate(0.04, 0, -0.006);
  const bar = new THREE.BoxGeometry(0.05, 0.007, 0.005);
  bar.translate(0.036, 0.0005, 0.004);
  return geom.merge([paint(a, '#6f4c33'), paint(bar, '#efe6d2')], ['color']);
}

/** Bounding sphere of all perch points, padded by the longest flight excursion. */
function staticBounds(perches) {
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  for (const q of perches) box.expandByPoint(spanPoint(q.span.a, q.span.b, q.span.sag, Math.min(0.95, Math.max(0.05, q.t)), p));
  const sphere = new THREE.Sphere();
  if (box.isEmpty()) return sphere;
  box.getBoundingSphere(sphere);
  sphere.radius += 14;
  return sphere;
}

/**
 * @param {object} ctx
 * @param {Array} perches  [{span, t, facing, flier}] (span from wires.js)
 */
export function buildSparrows(ctx, perches) {
  const { toon, geom } = ctx;
  const n = perches.length;
  const bodyMat = toon.mat('#ffffff', { vertexColors: true, name: 'pl_sparrow' });
  const wingMat = toon.mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, name: 'pl_sparrowWing' });
  const bodies = new THREE.InstancedMesh(birdGeometry(geom), bodyMat, Math.max(1, n));
  const wings = new THREE.InstancedMesh(wingGeometry(geom), wingMat, Math.max(1, n * 2));
  for (const m of [bodies, wings]) {
    m.userData.noOutline = true;
    m.userData.dynamic = true;
    m.castShadow = false;
    m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  // static culling sphere covering every perch plus the fliers' loops (fA <= 13 m, fB <= 3 m, fH <= 5 m),
  // so the per-frame instance updates never need a bounds recompute
  const bounds = staticBounds(perches);
  bodies.boundingSphere = bounds;
  wings.boundingSphere = bounds.clone();
  bodies.name = 'poles:sparrows';
  wings.name = 'poles:sparrowWings';

  // per-bird constants
  const birds = perches.map((p, i) => {
    const seed = hashString(`sparrow${i}`);
    const s = p.span;
    const tan = new THREE.Vector3().subVectors(s.b, s.a).setY(0).normalize();
    const flightDir = h2(seed, 7) < 0.5 ? 1 : -1;
    return {
      seed,
      span: s,
      t: p.t,
      tan,
      facing0: p.facing,
      slotLen: 1.3 + h2(seed, 1) * 1.2,
      phase: h2(seed, 2) * 50,
      flier: p.flier,
      period: 26 + h2(seed, 3) * 22,
      fPhase: h2(seed, 4) * 40,
      fDur: 7 + h2(seed, 5) * 3,
      fA: (7 + h2(seed, 6) * 6) * flightDir,
      fB: (h2(seed, 8) - 0.5) * 6,
      fH: 2 + h2(seed, 9) * 3,
    };
  });

  // scratch objects (no per-frame allocation)
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), V = new THREE.Vector3();
  const side = new THREE.Vector3();
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  const q = new THREE.Quaternion(), qw = new THREE.Quaternion();
  const S = new THREE.Vector3(SCALE, SCALE, SCALE);
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), L = new THREE.Matrix4();
  const shoulder = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);

  /** Perch point (feet) for wire parameter tt. */
  const perchAt = (b, tt, out) => {
    spanPoint(b.span.a, b.span.b, b.span.sag, Math.min(0.95, Math.max(0.05, tt)), out);
    out.y += b.span.r * 0.8;
    return out;
  };
  const facingAt = (b, k) => (h2(b.seed, 1000 + (k >> 2)) < 0.5 ? b.facing0 : -b.facing0);
  const offsetAt = (b, k) => (h2(b.seed, 2000 + (k >> 1)) - 0.5) * 0.36 / b.span.L;

  /** Flight path position for flight progress u (0..1), relative to the perch. */
  const flightPos = (b, u, base, out) => {
    const s1 = Math.sin(Math.PI * u), s2 = Math.sin(2 * Math.PI * u);
    side.set(-b.tan.z, 0, b.tan.x);
    out.copy(base).addScaledVector(b.tan, b.fA * s1).addScaledVector(side, b.fB * s2);
    out.y += b.fH * Math.pow(s1, 0.7);
    return out;
  };

  function setWings(i, flap, open) {
    // flap: roll angle; open: 0 folded .. 1 spread
    for (let w = 0; w < 2; w++) {
      const sd = w === 0 ? 1 : -1;
      shoulder.set(sd * 0.022, 0.066, 0.012);
      e.set(0, sd * (Math.PI / 2) * (1 - open) + sd * 0.25 * open, sd * (open > 0.01 ? flap : -0.35), 'YXZ');
      qw.setFromEuler(e);
      L.compose(shoulder, qw, one);
      L.scale(V.set(sd, 1, 1));
      W.multiplyMatrices(M, L);
      wings.setMatrixAt(i * 2 + w, W);
    }
  }

  function update(t) {
    for (let i = 0; i < n; i++) {
      const b = birds[i];
      const tt = t + b.phase;
      const k = Math.floor(tt / b.slotLen);
      const u = tt / b.slotLen - k;
      const act = h2(b.seed, k);
      const facing = facingAt(b, k), prevFacing = facingAt(b, k - 1);
      const off = offsetAt(b, k), prevOff = offsetAt(b, k - 1);
      // flight?
      let flying = false, fu = 0;
      if (b.flier) {
        const ft = ((t + b.fPhase) % b.period + b.period) % b.period;
        if (ft < b.fDur) { flying = true; fu = ft / b.fDur; }
      }
      perchAt(b, b.t + off, P);
      let yaw = Math.atan2(-b.tan.z * facing, b.tan.x * facing); // body faces across the wire
      let pitch = 0, flap = 0, open = 0, bob = 0;
      if (flying) {
        flightPos(b, fu, P, Q);
        flightPos(b, Math.min(1, fu + 0.01), P, V);
        V.sub(Q);
        if (fu > 0.985) V.set(-b.tan.z * facing, 0, b.tan.x * facing); // settle facing across the wire
        yaw = Math.atan2(V.x, V.z);
        const hl = Math.hypot(V.x, V.z);
        pitch = -Math.atan2(V.y, hl + 1e-4) * 0.6;
        // flap bursts with glides; always flap at take-off / landing
        const edge = fu < 0.12 || fu > 0.85;
        const glide = !edge && Math.sin(fu * 37 + b.seed) > 0.55;
        open = Math.min(1, Math.min(fu, 1 - fu) * 25);
        flap = glide ? 0.1 : Math.sin(t * 72 + i) * 0.9;
        P.copy(Q);
      } else {
        // hop-turn when the facing changed at this slot start
        if (facing !== prevFacing && u < 0.22) {
          const w = u / 0.22;
          const y0 = Math.atan2(-b.tan.z * prevFacing, b.tan.x * prevFacing);
          yaw = y0 + Math.PI * w * (h2(b.seed, k + 7) < 0.5 ? 1 : -1);
          bob = Math.sin(Math.PI * w) * 0.05;
          open = Math.sin(Math.PI * w) * 0.4;
          flap = 0.6;
        }
        // hop along the wire when the offset changed
        if (off !== prevOff && u < 0.28) {
          const w = u / 0.28;
          perchAt(b, b.t + prevOff + (off - prevOff) * w, P);
          bob = Math.max(bob, Math.sin(Math.PI * w) * 0.07);
        }
        if (act < 0.2) {
          // peck / preen: dip forward
          const w = Math.max(0, Math.sin(Math.PI * Math.min(1, u * 1.6)));
          pitch = 0.55 * w * (h2(b.seed, k + 3) < 0.5 ? 1 : 0.6);
          yaw += h2(b.seed, k + 3) < 0.5 ? 0 : 0.5 * w;
        } else if (act < 0.38) {
          // look around
          yaw += Math.sin(u * Math.PI * 2) * 0.55 * (h2(b.seed, k + 5) - 0.5) * 2;
        }
        // breathing + tail flick
        bob += Math.sin(t * 7 + i * 1.7) * 0.0025;
        pitch += act > 0.9 && u > 0.5 && u < 0.62 ? -0.18 : 0;
      }
      e.set(pitch, yaw, 0, 'YXZ');
      q.setFromEuler(e);
      P.y += bob;
      M.compose(P, q, S);
      bodies.setMatrixAt(i, M);
      setWings(i, flap, open);
    }
    bodies.instanceMatrix.needsUpdate = true;
    wings.instanceMatrix.needsUpdate = true;
  }

  update(ctx.sim.time);
  ctx.onUpdate((dt, t) => update(t));
  const group = new THREE.Group();
  group.name = 'sparrows';
  group.userData.dynamic = true;
  group.add(bodies, wings);
  return group;
}
