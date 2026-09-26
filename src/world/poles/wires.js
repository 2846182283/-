/**
 * poles/wires.js — overhead lines (架空線).
 *
 *   - line spans pole to pole: 3 high-voltage conductors on the cross arm,
 *     2 low-voltage cables on the rack, 2 thick black telecom cables (plus a
 *     thin optical cable on some spans) with hanging closures
 *   - cross-street spans between the two main-street lines
 *   - service drops (引込線) from the nearest pole to each building front,
 *     some crossing the street, plus thin telecom drops
 *   - short leads on the poles (transformer / switch / riser)
 *
 * Every wire is a thin sagging tube in ONE merged mesh (min on-screen width
 * enforced in the vertex shader, see kit.js).  Each span is also returned as
 * {a, b, sag, kind} so the sparrows can perch on it analytically.
 */
import * as THREE from 'three';
import { wireTube, tubeBetween } from './kit.js';

/** Parabolic sag polyline (same shape as geom.catenaryPoints). */
export function spanPoint(a, b, sag, t, out = new THREE.Vector3()) {
  out.lerpVectors(a, b, t);
  out.y -= sag * 4 * t * (1 - t);
  return out;
}

function spanPts(a, b, sag, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(spanPoint(a, b, sag, i / n));
  return pts;
}

const segsFor = (L) => Math.max(6, Math.min(16, Math.round(L / 1.7)));

/**
 * @param {object} K        kit
 * @param {Array} links     [{A, B, kind: 'full'|'hv'|'cross', seed}] with A/B = pole attach objects
 * @param {Array} drops     [{pole, target: Vector3, wallDir: Vector3, tel: bool, seed}]
 * @param {Array} extras    [{pts, r}] polylines from the poles
 * @param {function} rng
 * @returns {Array} spans usable as perches
 */
export function buildWires(K, links, drops, extras, rng) {
  const spans = [];
  const add = (a, b, sag, r, kind, perch = true) => {
    const L = a.distanceTo(b);
    K.addWire(wireTube(spanPts(a, b, sag, segsFor(L)), r, 4));
    if (perch) spans.push({ a: a.clone(), b: b.clone(), sag, r, kind, L });
  };

  for (const lk of links) {
    const { A, B } = lk;
    const L = A.hv[0].distanceTo(B.hv[0]);
    const j = () => (rng() - 0.5) * 0.08;
    if (lk.kind === 'full' || lk.kind === 'hv') {
      A.hv.forEach((p, i) => add(p, B.hv[i], 0.009 * L + 0.1 + i * 0.025 + j(), 0.012, 'hv'));
    }
    if (lk.kind === 'full') {
      A.lv.forEach((p, i) => add(p, B.lv[i], 0.015 * L + 0.14 + j(), 0.015, 'lv'));
      add(A.tel[0], B.tel[0], 0.021 * L + 0.2 + j(), 0.027, 'tel');
      add(A.tel[1], B.tel[1], 0.018 * L + 0.16 + j(), 0.019, 'tel');
      if (lk.optical) {
        const o = new THREE.Vector3(0, -0.14, 0);
        add(A.tel[1].clone().add(o), B.tel[1].clone().add(o), 0.022 * L + 0.2, 0.009, 'opt');
      }
      // closures hanging on the thick telecom cable, near one end
      if (lk.closure) closure(K, A.tel[0], B.tel[0], 0.021 * L + 0.2, lk.closureT);
    }
    if (lk.kind === 'cross') {
      // cross-street span: road-side LV spool + lower telecom + (optional) HV pair on the cross arms
      add(A.lv[A.roadLv], B.lv[B.roadLv], 0.02 * L + 0.12, 0.014, 'lv');
      add(A.tel[1], B.tel[1], 0.024 * L + 0.14, 0.02, 'tel');
      if (A.crossHV.length && B.crossHV.length) {
        // pair the insulators so the two conductors do not cross mid-span
        const [a0, a1] = A.crossHV;
        const [b0, b1] = B.crossHV;
        const straight = a0.distanceTo(b0) + a1.distanceTo(b1) <= a0.distanceTo(b1) + a1.distanceTo(b0);
        add(a0, straight ? b0 : b1, 0.012 * L + 0.06, 0.011, 'hv');
        add(a1, straight ? b1 : b0, 0.012 * L + 0.08, 0.011, 'hv');
      }
    }
  }

  // service drops (thin, slightly sagging) + wall hooks
  for (const d of drops) {
    const a = d.pole.dropFrom(d.target, 'lv');
    const L = a.distanceTo(d.target);
    add(a, d.target, 0.012 * L + 0.07, 0.009, 'drop', L > 4);
    hook(K, d.target, d.wallDir);
    if (d.tel) {
      const t2 = d.target.clone().add(d.telOffset);
      const a2 = d.pole.dropFrom(t2, 'tel');
      add(a2, t2, 0.014 * a2.distanceTo(t2) + 0.08, 0.007, 'drop', false);
      hook(K, t2, d.wallDir);
    }
  }

  for (const e of extras) K.addWire(wireTube(e.pts, e.r, 4));
  return spans;
}

/** Telecom closure (black cylinder with end cones and hanger bands). */
function closure(K, a, b, sag, t) {
  const p = spanPoint(a, b, sag, t);
  const q = spanPoint(a, b, sag, t + 0.02);
  const dir = new THREE.Vector3().subVectors(q, p).normalize();
  const c0 = p.clone().addScaledVector(dir, -0.3).add(new THREE.Vector3(0, -0.1, 0));
  const c1 = p.clone().addScaledVector(dir, 0.3).add(new THREE.Vector3(0, -0.1, 0));
  K.add('vcS', tubeBetween(c0, c1, 0.075, 10), '#33363b');
  K.add('vcS', tubeBetween(c0.clone().addScaledVector(dir, -0.12), c0, 0.03, 8, 0.07), '#2b2e33');
  K.add('vcS', tubeBetween(c1, c1.clone().addScaledVector(dir, 0.12), 0.07, 8, 0.03), '#2b2e33');
  for (const s of [-0.18, 0.18]) {
    const h = p.clone().addScaledVector(dir, s);
    K.add('vcS', tubeBetween(h.clone().add(new THREE.Vector3(0, -0.03, 0)), h.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.012, 4), '#50545a');
  }
}

/** Small wall bracket + eye where a service drop ends. */
function hook(K, p, wallDir) {
  const back = p.clone().addScaledVector(wallDir, -0.07);
  K.add('vcS', tubeBetween(back, p, 0.012, 5), '#50545a');
  K.add('vcS', tubeBetween(p.clone().add(new THREE.Vector3(0, -0.035, 0)), p.clone().add(new THREE.Vector3(0, 0.035, 0)), 0.02, 6), '#e8e6df');
}
