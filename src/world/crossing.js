/**
 * World module: crossing — the level crossing (踏切) at x = CROSSING.x where
 * the crossing road meets both tracks east of the station.
 *
 *   deck.js       rubber panels / concrete filler / asphalt ramps, flush with the
 *                 rail head, flangeway gaps, painted edge lines + pedestrian
 *                 strips, bicycle navigation arrows, pedestrian waiting marks
 *   posts.js      four 警報機 units (crossbuck, omni lamp, speaker, twin
 *                 double-sided flashing lamps, direction indicator, plates,
 *                 emergency button) + two 遮断機 housings (left of each approach)
 *   barrier.js    the booms (遮断桿) with hanging fringe — dynamic
 *   lamps.js      lamp lenses, glow cards, direction arrows — dynamic
 *   furniture.js  guard pipes, anti-intrusion fences, rubber poles, control
 *                 cabinet, obstacle detectors, この先踏切 boards, plates
 *
 * State comes from ctx.sim.crossing.active (written by train.js).  Lamps
 * alternate ~50 flashes/min, the booms start down ~3 s after the lamps and
 * take CROSSING.lowerSeconds / raiseSeconds, the direction arrows follow the
 * approaching train(s) and the bell ("カンカン") is synthesised with WebAudio.
 *
 * Test hook: ?crossingTest=1 forces the active state (booms down, lamps on,
 * ← arrow lit when no train is present); ?crossingTest=cycle alternates
 * active / idle every 24 s / 16 s.
 */
import * as THREE from 'three';
import { CROSSING, smoothstep } from '../core/layout.js';
import { createKit } from './crossing/kit.js';
import { buildDeck } from './crossing/deck.js';
import { buildPosts, cornerUnits } from './crossing/posts.js';
import { buildFurniture } from './crossing/furniture.js';
import { createBooms, BOOM } from './crossing/barrier.js';
import { createLamps } from './crossing/lamps.js';

const FLASH_HALF = 0.6; // s each lamp is lit: 50 flashes / min per lamp
const BOOM_DELAY = 3.0; // s of flashing before the booms start down
const BELL_RATE = 1.8; // hits per second

export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = 'crossing';

  const kit = createKit(ctx);
  buildDeck(kit);
  const placed = buildPosts(kit);
  buildFurniture(kit);
  const statics = kit.finish('crossing:static');
  root.add(statics);

  const booms = createBooms(kit, placed.booms);
  root.add(booms.group);
  const lamps = createLamps(kit, placed.lamps, booms.lenses, placed.arrows);
  root.add(lamps.group);

  // ---------------------------------------------------------------------------
  // state
  // ---------------------------------------------------------------------------
  const test = ctx.params.get('crossingTest');
  const S = { active: false, activeTime: 0, boomT: 0, frames: 0, lastAngle: -1 };
  const lit = { A: 0, B: 0, omni: 0 };
  const angles = booms.angles.map(() => BOOM.upAngle);
  const trainDir = { pos: false, neg: false };

  function readActive(t) {
    if (test === '1') return true;
    if (test === 'cycle') return t % 40 < 24;
    return !!ctx.sim.crossing.active;
  }

  /** Which travel directions (world +x / -x) have a train approaching or on the crossing. */
  function scanTrains() {
    trainDir.pos = false;
    trainDir.neg = false;
    const trains = ctx.sim.trains || [];
    for (let i = 0; i < trains.length; i++) {
      const tr = trains[i];
      if (!tr || typeof tr.x !== 'number' || tr.state === 'hidden') continue;
      const dir = tr.dir || 1;
      const ahead = (CROSSING.x - tr.x) * dir; // distance from the train's front to the crossing
      if (ahead > -((tr.length || 54) + 6) && ahead < 520) {
        if (dir > 0) trainDir.pos = true; else trainDir.neg = true;
      }
    }
    if (test && !trainDir.pos && !trainDir.neg) trainDir.neg = true; // test mode without trains
  }

  const arrowLit = (a) => {
    if (!S.active) return false;
    const rightWorld = a.face > 0 ? 1 : -1; // viewer's right in world x
    return a.side * rightWorld > 0 ? trainDir.pos : trainDir.neg;
  };

  // ---------------------------------------------------------------------------
  // bell: two detuned tones through a fast-decay envelope, scheduled on the
  // audio clock; distance attenuation from the nearest post
  // ---------------------------------------------------------------------------
  const units = cornerUnits();
  let bell = null;
  ctx.audio.onReady((a) => {
    const ac = a.ctx;
    const out = ac.createGain();
    out.gain.value = 0;
    out.connect(a.master);
    const env = ac.createGain();
    env.gain.value = 0.0001;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3400;
    lp.Q.value = 0.7;
    env.connect(lp);
    lp.connect(out);
    const tones = [['square', 742, 0.16], ['triangle', 1068, 0.42], ['sine', 2012, 0.12]];
    for (const [type, freq, g] of tones) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const og = ac.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(env);
      o.start();
    }
    bell = { a, ac, out, env, next: 0 };
  });

  function updateBell(active) {
    if (!bell || !bell.a.enabled) return;
    const { ac, env, out } = bell;
    const now = ac.currentTime;
    // distance to the nearest post (no allocation)
    const cp = ctx.camera.position;
    let d = Infinity;
    for (let i = 0; i < units.length; i++) d = Math.min(d, Math.hypot(cp.x - units[i].x, cp.y - 2.7, cp.z - units[i].z));
    const target = active ? bell.a.distanceGain(d, 9, 1.0) * 0.55 : 0;
    out.gain.setTargetAtTime(target, now, active ? 0.03 : 0.12);
    if (!active) { bell.next = 0; return; }
    if (bell.next < now) bell.next = now + 0.03;
    while (bell.next < now + 0.2) {
      const t0 = bell.next;
      env.gain.cancelScheduledValues(t0);
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(1.0, t0 + 0.004);
      env.gain.exponentialRampToValueAtTime(0.22, t0 + 0.085);
      env.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.48);
      bell.next += 1 / BELL_RATE;
    }
  }

  // ---------------------------------------------------------------------------
  // per-frame update
  // ---------------------------------------------------------------------------
  function step(dt, t) {
    const active = readActive(t);
    // the first frames snap to the steady state (loading mid-cycle, paused screenshots)
    if (S.frames < 3) {
      S.boomT = active ? 1 : 0;
      S.activeTime = active ? 99 : 0;
    }
    S.frames++;
    S.active = active;
    S.activeTime = active ? S.activeTime + dt : 0;
    const target = active && S.activeTime >= BOOM_DELAY ? 1 : 0;
    if (S.boomT < target) S.boomT = Math.min(target, S.boomT + dt / CROSSING.lowerSeconds);
    else if (S.boomT > target) S.boomT = Math.max(target, S.boomT - dt / CROSSING.raiseSeconds);
    // eased swing: slow start, gentle landing
    const e = smoothstep(0, 1, S.boomT);
    const angle = BOOM.upAngle * (1 - e);
    const moved = Math.abs(angle - S.lastAngle) > 1e-5;
    for (let i = 0; i < angles.length; i++) angles[i] = angle;
    // fringe sways with the wind even when the boom is still (cheap: ~40 matrices)
    booms.pose(angles, t, ctx.sim.wind.strength);
    S.lastAngle = angle;

    // lamps: alternate A / B while active; omni lamps with A
    if (active) {
      const ph = Math.floor(t / FLASH_HALF) % 2;
      lit.A = ph === 0 ? 1 : 0;
      lit.B = 1 - lit.A;
      lit.omni = lit.A;
    } else {
      lit.A = lit.B = lit.omni = 0;
    }
    scanTrains();
    lamps.update(lit, arrowLit, ctx.camera, moved || S.frames < 3);
    updateBell(active);
  }
  step(0, ctx.sim.time);
  S.frames = 0;
  ctx.onUpdate((dt, t) => step(dt, t));

  root.userData.stats = { triangles: statics.userData.triangles };
  return root;
}
