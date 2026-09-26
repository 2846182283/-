/**
 * 150-second looping timetable for the two trainsets.
 *
 * Motion is built from segments whose velocity follows a cubic ease
 * (smoothstep) between two speeds, so acceleration starts and ends at zero.
 * The whole loop is pre-sampled every 0.05 s into tables (x, speed, state,
 * visibility, doors), and the level-crossing "active" flag is derived from the
 * sampled positions with a 12 s look-ahead, so it always agrees with the
 * motion.
 *
 *   t (s)   set 1 — track A, westbound, 各停 花見台      set 2 — track B, eastbound, 各停 春日野
 *   0       standing at platform 1, doors OPEN           hidden (beyond the west end)
 *   8                                                     appears at x = -440, 50 km/h
 *   15.0    door chime, doors close (15 – 17.5)
 *   20      departs west, accelerates to 50 km/h
 *   25.8                                                  brakes (30 s smooth stop)
 *   ~41     leaves the world (hidden from ~41 s)
 *   55.75                                                 stops at platform 2 (front x = 18.5)
 *   57.5                                                  doors open
 *   66.5                                                  chime, doors close (66.5 – 69)
 *   ~67.8                                                 crossing closes (12 s before the front reaches it)
 *   72                                                    departs east, over the crossing at ~13–30 km/h
 *   ~87                                                   crossing re-opens (tail +5 m clear)
 *   75.2    appears at x = +440 (east), 50 km/h
 *   ~89.5   brakes 50 -> 17 km/h over 20 s
 *   ~102    crossing closes
 *   109.5   rolls at 17 km/h (4.8 m/s) ...
 *   ~113.7  ... front reaches the level crossing (x = 32), barriers down
 *   ~118    whole train over the crossing (good crossing-shot time 104 – 118)
 *   122     final braking (16 s)
 *   ~125    crossing re-opens
 *   138     stops at platform 1 (front x = -46.5)
 *   140     doors open (and stay open through t = 0 of the next loop)
 */
import { TRAIN, RAIL, CROSSING, ROADS } from '../../core/layout.js';

export const PERIOD = 150;
export const DT = 0.05;
const N = Math.round(PERIOD / DT);
const RANGE = 440; // rails end: a train fully beyond this is hidden
const SET_LEN = TRAIN.cars * TRAIN.carLength;

export const STATE = { hidden: 0, standing: 1, departing: 2, arriving: 3 };
export const STATE_NAMES = ['hidden', 'standing', 'departing', 'arriving'];

const segDist = (s) => (s.dur * (s.v0 + s.v1)) / 2;
function segAt(s, tau) {
  const e = tau * tau * tau - (tau * tau * tau * tau) / 2; // integral of smoothstep
  const k = tau * tau * (3 - 2 * tau);
  return { d: s.dur * (s.v0 * tau + (s.v1 - s.v0) * e), v: s.v0 + (s.v1 - s.v0) * k };
}

/** Departure from rest: ease 0 -> cruise, then cruise until the tail is past the world edge. */
function departure(dir, x0) {
  const vc = TRAIN.cruiseSpeed;
  const acc = { dur: 22, v0: 0, v1: vc };
  const total = RANGE + SET_LEN + 2 - dir * x0; // distance until the tail is beyond the edge
  const cruise = { dur: (total - segDist(acc)) / vc, v0: vc, v1: vc };
  return [acc, cruise];
}

/** Arrival from the world edge ending exactly at xStop.  pre: extra slow segments before the final stop. */
function arrival(dir, xStop, { slowTo = null, slowDur = 0, hold = 0, stopDur = 30 } = {}) {
  const vc = TRAIN.cruiseSpeed;
  const segs = [];
  let tail;
  if (slowTo !== null) tail = [{ dur: slowDur, v0: vc, v1: slowTo }, { dur: hold, v0: slowTo, v1: slowTo }, { dur: stopDur, v0: slowTo, v1: 0 }];
  else tail = [{ dur: stopDur, v0: vc, v1: 0 }];
  const dist = dir * xStop + RANGE; // from x = -dir*RANGE
  const cruiseDist = dist - tail.reduce((a, s) => a + segDist(s), 0);
  segs.push({ dur: cruiseDist / vc, v0: vc, v1: vc }, ...tail);
  return segs;
}

const dur = (segs) => segs.reduce((a, s) => a + s.dur, 0);

/** Phase list for both sets.  Each phase: { t0, t1, state, x0, dir, segs? }. */
function buildPhases() {
  const A = RAIL.tracks.find((t) => t.id === 'A');
  const B = RAIL.tracks.find((t) => t.id === 'B');
  const sA = TRAIN.stopFrontX.A, sB = TRAIN.stopFrontX.B;
  // --- set 1 (track A, westbound) -------------------------------------------
  const depA = departure(A.dir, sA);
  const arrA = arrival(A.dir, sA, { slowTo: 4.8, slowDur: 20, hold: 12.5, stopDur: 16 });
  const arrAStart = 138 - dur(arrA);
  const set1 = [
    { t0: 0, t1: 20, state: STATE.standing, x0: sA },
    { t0: 20, t1: 20 + dur(depA), state: STATE.departing, x0: sA, segs: depA },
    { t0: 20 + dur(depA), t1: arrAStart, state: STATE.hidden },
    { t0: arrAStart, t1: 138, state: STATE.arriving, x0: -A.dir * RANGE, segs: arrA },
    { t0: 138, t1: PERIOD, state: STATE.standing, x0: sA },
  ];
  // --- set 2 (track B, eastbound) --------------------------------------------
  const arrB = arrival(B.dir, sB, { stopDur: 30 });
  const depB = departure(B.dir, sB);
  const arrBEnd = 8 + dur(arrB);
  const set2 = [
    { t0: 0, t1: 8, state: STATE.hidden },
    { t0: 8, t1: arrBEnd, state: STATE.arriving, x0: -B.dir * RANGE, segs: arrB },
    { t0: arrBEnd, t1: 72, state: STATE.standing, x0: sB },
    { t0: 72, t1: 72 + dur(depB), state: STATE.departing, x0: sB, segs: depB },
    { t0: 72 + dur(depB), t1: PERIOD, state: STATE.hidden },
  ];
  return [
    { track: A, phases: set1, doors: [{ open: 140, close: 15 + PERIOD }], chimes: [140, 14.5] },
    { track: B, phases: set2, doors: [{ open: arrBEnd + 1.75, close: 66.5 }], chimes: [arrBEnd + 1.75, 66] },
  ];
}

function evalPhase(p, dir, t) {
  if (!p.segs) return { x: p.x0, v: 0 };
  let tt = t - p.t0, d = 0;
  for (const s of p.segs) {
    if (tt <= s.dur) {
      const r = segAt(s, Math.max(0, tt) / s.dur);
      return { x: p.x0 + dir * (d + r.d), v: r.v };
    }
    tt -= s.dur;
    d += segDist(s);
  }
  const last = p.segs[p.segs.length - 1];
  return { x: p.x0 + dir * d, v: last.v1 };
}

const DOOR_RAMP = 2.5;
function doorValue(doors, t) {
  let best = 0;
  for (const d of doors) {
    for (const tt of [t, t + PERIOD, t - PERIOD]) {
      if (tt < d.open || tt > d.close + DOOR_RAMP) continue;
      const up = Math.min(1, (tt - d.open) / DOOR_RAMP);
      const down = 1 - Math.min(1, Math.max(0, (tt - d.close) / DOOR_RAMP));
      best = Math.max(best, Math.min(up, down));
    }
  }
  return best;
}

/** Build all sampled tables.  Returns { sets: [...], crossing: Uint8Array, sample(), crossingActive() }. */
export function buildTimetable() {
  const specs = buildPhases();
  const sets = specs.map((spec) => {
    const x = new Float32Array(N + 1), v = new Float32Array(N + 1), st = new Uint8Array(N + 1), vis = new Uint8Array(N + 1), door = new Float32Array(N + 1);
    const dir = spec.track.dir;
    for (let i = 0; i <= N; i++) {
      const t = Math.min(i * DT, PERIOD - 1e-6);
      const p = spec.phases.find((q) => t >= q.t0 && t < q.t1) || spec.phases[spec.phases.length - 1];
      st[i] = p.state;
      if (p.state === STATE.hidden) { x[i] = dir * (RANGE + SET_LEN + 50); v[i] = 0; vis[i] = 0; continue; }
      const r = evalPhase(p, dir, t);
      x[i] = r.x; v[i] = r.v;
      const lo = Math.min(r.x, r.x - dir * SET_LEN), hi = Math.max(r.x, r.x - dir * SET_LEN);
      vis[i] = hi > -RANGE && lo < RANGE ? 1 : 0;
      door[i] = p.state === STATE.standing ? doorValue(spec.doors, t) : 0;
    }
    return { track: spec.track, dir, x, v, st, vis, door, chimes: spec.chimes, doors: spec.doors, phases: spec.phases };
  });

  // --- level crossing: occupied while any part is on the road (+5 m past it on the exit side) ---
  const xc = CROSSING.x, hw = ROADS.crossingRoad.halfWidth;
  const occ = new Uint8Array(N);
  for (const s of sets) {
    for (let i = 0; i < N; i++) {
      if (!s.vis[i]) continue;
      const lo = Math.min(s.x[i], s.x[i] - s.dir * SET_LEN), hi = Math.max(s.x[i], s.x[i] - s.dir * SET_LEN);
      const z0 = xc - hw - (s.dir < 0 ? 5 : 0), z1 = xc + hw + (s.dir > 0 ? 5 : 0);
      if (hi > z0 && lo < z1) occ[i] = 1;
    }
  }
  const look = Math.round(12 / DT);
  const crossing = new Uint8Array(N);
  let next = Infinity; // samples until the next occupied sample (cyclic, two sweeps)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = N - 1; i >= 0; i--) {
      next = occ[i] ? 0 : next + 1;
      if (pass === 1) crossing[i] = next <= look ? 1 : 0;
    }
  }

  const wrap = (t) => ((t % PERIOD) + PERIOD) % PERIOD;
  return {
    sets,
    crossing,
    period: PERIOD,
    /** Fill `out` for set k at sim time t (no allocation). */
    sample(k, t, out) {
      const s = sets[k];
      const f = wrap(t) / DT;
      const i = Math.min(N - 1, Math.floor(f));
      const a = f - i;
      out.visible = (s.vis[i] === 1 && s.vis[i + 1] === 1) || (s.vis[i] === 1 && a < 0.5) || (s.vis[i + 1] === 1 && a >= 0.5);
      out.x = s.st[i] === s.st[i + 1] || s.vis[i + 1] ? s.x[i] + (s.x[i + 1] - s.x[i]) * a : s.x[i];
      out.v = s.v[i] + (s.v[i + 1] - s.v[i]) * a;
      out.state = s.st[i];
      out.doors = s.door[i] + (s.door[i + 1] - s.door[i]) * a;
      return out;
    },
    crossingActive(t) {
      return crossing[Math.min(N - 1, Math.floor(wrap(t) / DT))] === 1;
    },
    /** Sorted list of [start, end] seconds where the crossing is active (for docs / debugging). */
    crossingWindows() {
      const w = [];
      for (let i = 0; i < N; i++) {
        if (crossing[i] && (i === 0 || !crossing[i - 1])) w.push([+(i * DT).toFixed(2), null]);
        if (!crossing[i] && i > 0 && crossing[i - 1]) w[w.length - 1][1] = +(i * DT).toFixed(2);
      }
      if (w.length && w[w.length - 1][1] === null) w[w.length - 1][1] = PERIOD;
      return w;
    },
  };
}
