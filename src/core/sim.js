/**
 * Shared simulation state.  Modules communicate through this object instead of
 * importing each other.
 *
 *   sim.time            seconds since start (scaled by sim.timeScale)
 *   sim.wind            { dir: Vector2 (unit, xz), strength (0..1.5), gust (0..1) } — updated here
 *   sim.trains          array written by train.js each frame:
 *                         { id, track: 'A'|'B', x (front coupler x), dir (-1|+1), speed (m/s, >=0),
 *                           length (m), z (track centreline), doorsOpen (0..1), state }
 *                       The train occupies x in [x, x - dir*length] (i.e. it trails behind its front).
 *   sim.crossing        { active: bool, since: seconds } — written by train.js (it knows the
 *                         timetable and asserts `active` early enough for barriers to close);
 *                         crossing.js animates barriers / lamps / bell from it.
 *   sim.events          tiny pub/sub: sim.on('trainArrive', fn), sim.emit('trainArrive', payload)
 */
import * as THREE from 'three';
import { TOON_UNIFORMS } from './toon.js';

export function createSim(params = {}) {
  const listeners = new Map();
  const sim = {
    time: params.startTime ?? 0,
    timeScale: 1,
    wind: { dir: new THREE.Vector2(0.94, 0.34).normalize(), strength: 0.6, gust: 0 },
    trains: [],
    crossing: { active: false, since: 0 },
    on(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    emit(evt, payload) {
      for (const fn of listeners.get(evt) || []) fn(payload);
    },
    /** Advance global state; called by the engine before module updates. */
    step(dt) {
      sim.time += dt * sim.timeScale;
      const t = sim.time;
      // slow-varying wind with occasional gusts
      const g = Math.max(0, Math.sin(t * 0.21) * Math.sin(t * 0.077 + 1.3));
      sim.wind.gust = g * g;
      sim.wind.strength = 0.45 + 0.25 * Math.sin(t * 0.13) + 0.8 * sim.wind.gust;
      const a = 0.35 + 0.18 * Math.sin(t * 0.05);
      sim.wind.dir.set(Math.cos(a), Math.sin(a));
      TOON_UNIFORMS.toonTime.value = t;
      TOON_UNIFORMS.toonWind.value.set(sim.wind.dir.x * sim.wind.strength, sim.wind.gust, sim.wind.dir.y * sim.wind.strength);
    },
  };
  return sim;
}
