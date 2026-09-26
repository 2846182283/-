/**
 * Tiny WebAudio hub.  Audio is OFF until the user presses the sound button
 * (browsers require a gesture).  Modules synthesise their own sounds:
 *
 *   ctx.audio.onReady((a) => {
 *     const g = a.ctx.createGain(); g.connect(a.master);  // build your nodes
 *   });
 *   // each frame: g.gain.value = a.distanceGain(distanceToCamera) * 0.3
 *
 * Nothing here plays by itself except an optional soft ambience (birds + wind)
 * built in main.js.
 */
export function createAudio() {
  const ready = [];
  const a = {
    ctx: null,
    master: null,
    enabled: false,
    unlock() {
      if (!a.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        a.ctx = new AC();
        a.master = a.ctx.createGain();
        a.master.gain.value = 0;
        a.master.connect(a.ctx.destination);
        for (const fn of ready.splice(0)) {
          try { fn(a); } catch (e) { console.warn('audio init failed', e); }
        }
      }
      a.ctx.resume?.();
    },
    setEnabled(v) {
      a.enabled = v;
      if (v) a.unlock();
      if (a.master) a.master.gain.setTargetAtTime(v ? 0.9 : 0, a.ctx.currentTime, 0.2);
    },
    onReady(fn) {
      if (a.ctx) fn(a);
      else ready.push(fn);
    },
    /** 0..1 attenuation for a source `d` metres away. */
    distanceGain(d, ref = 8, rolloff = 1.1) {
      return Math.min(1, ref / Math.max(ref, ref + rolloff * (d - ref)));
    },
    /** Shared white-noise buffer (2 s). */
    noiseBuffer() {
      if (!a.ctx) return null;
      if (a._noise) return a._noise;
      const len = a.ctx.sampleRate * 2;
      const b = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      a._noise = b;
      return b;
    },
  };
  return a;
}
