/**
 * Soft spring ambience, synthesised: a breeze bed (filtered noise that swells
 * with sim.wind) and occasional small-bird chirps (short FM sweeps, randomly
 * panned).  Silent until the user enables sound.
 */
export function startAmbience(ctx) {
  const { audio, sim } = ctx;
  audio.onReady((a) => {
    const ac = a.ctx;
    const out = ac.createGain();
    out.gain.value = 0.55;
    out.connect(a.master);

    // --- breeze: pink-ish noise through a slowly moving band-pass
    const noise = ac.createBufferSource();
    noise.buffer = a.noiseBuffer();
    noise.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.6;
    const windGain = ac.createGain();
    windGain.gain.value = 0.0;
    noise.connect(lp).connect(bp).connect(windGain).connect(out);
    noise.start();

    // --- birds
    let nextChirp = ac.currentTime + 1.5;
    function chirp(t0) {
      const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      const g = ac.createGain();
      const o = ac.createOscillator();
      const m = ac.createOscillator();
      const mg = ac.createGain();
      const base = 2600 + Math.random() * 1800;
      const notes = 2 + Math.floor(Math.random() * 4);
      o.type = 'sine';
      m.type = 'sine';
      m.frequency.value = 40 + Math.random() * 60;
      mg.gain.value = 180 + Math.random() * 260;
      m.connect(mg).connect(o.frequency);
      g.gain.value = 0;
      let t = t0;
      for (let i = 0; i < notes; i++) {
        const d = 0.05 + Math.random() * 0.07;
        o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.25), t);
        o.frequency.exponentialRampToValueAtTime(base * (1.15 + Math.random() * 0.3), t + d);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, t + d);
        t += d + 0.03 + Math.random() * 0.06;
      }
      o.connect(g);
      if (pan) {
        pan.pan.value = Math.random() * 1.6 - 0.8;
        g.connect(pan).connect(out);
      } else g.connect(out);
      o.start(t0);
      m.start(t0);
      o.stop(t + 0.05);
      m.stop(t + 0.05);
    }

    ctx.onUpdate(() => {
      if (!audio.enabled) return;
      const now = ac.currentTime;
      const w = sim.wind.strength;
      windGain.gain.setTargetAtTime(0.035 + 0.06 * w, now, 0.5);
      bp.frequency.setTargetAtTime(300 + 260 * w + 200 * sim.wind.gust, now, 0.8);
      if (now > nextChirp) {
        chirp(now + 0.02);
        nextChirp = now + (Math.random() < 0.3 ? 0.4 + Math.random() * 0.6 : 2.5 + Math.random() * 6);
      }
    });
  });
}
