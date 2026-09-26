/**
 * Train sounds (WebAudio, synthesised; silent until the user enables sound):
 *   - VVVF-ish motor whine: two detuned saws through a band-pass whose pitch
 *     follows speed, loud while accelerating / braking
 *   - rolling noise (low-passed noise, level ~ speed)
 *   - rail-joint clatter: every axle crossing a joint (every 25 m) fires a
 *     short thump, giving the classic タタン タタン rhythm
 *   - brake squeal in the last metres before a stop
 *   - two-tone door chime + door air "pshh" at opening / closing
 * Everything is attenuated by the distance from the camera to the nearest
 * point of the train.
 */
const JOINT = 25;

export function createTrainAudio(ctx, sets, tt) {
  const cam = ctx.camera.position;
  let A = null;
  const voices = [];

  ctx.audio.onReady((a) => {
    A = a;
    for (const s of sets) voices.push(makeVoice(a, s));
  });

  function makeVoice(a, s) {
    const ac = a.ctx;
    const out = ac.createGain();
    out.gain.value = 0;
    out.connect(a.master);
    // motor
    const mg = ac.createGain(); mg.gain.value = 0;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
    const o1 = ac.createOscillator(); o1.type = 'sawtooth';
    const o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 700;
    o1.connect(bp); o2.connect(bp); bp.connect(mg); mg.connect(out);
    o1.start(); o2.start();
    // rolling noise
    const nsrc = ac.createBufferSource(); nsrc.buffer = a.noiseBuffer(); nsrc.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const rg = ac.createGain(); rg.gain.value = 0;
    nsrc.connect(lp); lp.connect(rg); rg.connect(out); nsrc.start();
    // brake squeal
    const sq = ac.createOscillator(); sq.type = 'sine'; sq.frequency.value = 2650;
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.5;
    const lfoG = ac.createGain(); lfoG.gain.value = 18;
    lfo.connect(lfoG); lfoG.connect(sq.frequency);
    const sg = ac.createGain(); sg.gain.value = 0;
    sq.connect(sg); sg.connect(out); sq.start(); lfo.start();
    return { s, out, mg, bp, o1, o2, rg, sg, lastJ: new Int32Array(s.axles.length).fill(0x7fffffff), lastT: null, lastV: 0 };
  }

  function thump(a, dest, gain, when) {
    const ac = a.ctx;
    const src = ac.createBufferSource();
    src.buffer = a.noiseBuffer();
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, when + 0.12);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(when, Math.random() * 1.5, 0.14);
    const o = ac.createOscillator(); o.frequency.value = 78;
    const og = ac.createGain();
    og.gain.setValueAtTime(gain * 0.8, when); og.gain.exponentialRampToValueAtTime(0.0008, when + 0.1);
    o.connect(og); og.connect(dest); o.start(when); o.stop(when + 0.12);
  }

  function chime(a, dest, gain) {
    const ac = a.ctx;
    const t0 = ac.currentTime + 0.02;
    [[1175, 0], [880, 0.42]].forEach(([f, d]) => {
      for (const [mul, lvl] of [[1, 1], [2, 0.18], [3, 0.06]]) {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, t0 + d);
        g.gain.linearRampToValueAtTime(gain * lvl, t0 + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0005, t0 + d + 1.1);
        o.connect(g); g.connect(dest); o.start(t0 + d); o.stop(t0 + d + 1.2);
      }
    });
    // door engine air
    const src = ac.createBufferSource(); src.buffer = a.noiseBuffer();
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0 + 0.9); g.gain.linearRampToValueAtTime(gain * 0.35, t0 + 1.0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 1.8);
    src.connect(hp); hp.connect(g); g.connect(dest); src.start(t0 + 0.9, 0.3, 1.0);
  }

  /** Distance from the camera to the train's centreline segment. */
  function distance(s) {
    const x = s.sample.x, x2 = x - s.track.dir * s.simEntry.length;
    const nx = Math.min(Math.max(cam.x, Math.min(x, x2)), Math.max(x, x2));
    return Math.hypot(cam.x - nx, cam.y - 2, cam.z - s.track.z);
  }

  return {
    update(t, dt) {
      if (!A || !A.enabled) return;
      const now = A.ctx.currentTime;
      for (const v of voices) {
        const s = v.s;
        const o = s.sample;
        const period = tt.period;
        const tm = ((t % period) + period) % period;
        // door chimes (open & close)
        if (v.lastT !== null && dt > 0 && o.visible) {
          for (const c of s.spec ? tt.sets[s.k].chimes : []) {
            const cc = c % period;
            if ((v.lastT < cc && tm >= cc) || (v.lastT > tm && (cc >= v.lastT || cc < tm))) chime(A, v.out, 0.5);
          }
        }
        v.lastT = tm;
        if (!o.visible) { v.out.gain.setTargetAtTime(0, now, 0.1); continue; }
        const d = distance(s);
        const g = A.distanceGain(d, 10, 1.2);
        v.out.gain.setTargetAtTime(g, now, 0.08);
        const speed = o.v;
        const acc = dt > 0 ? (speed - v.lastV) / dt : 0;
        v.lastV = speed;
        const base = 140 + speed * 42;
        v.o1.frequency.setTargetAtTime(base, now, 0.05);
        v.o2.frequency.setTargetAtTime(base * 0.5, now, 0.05);
        v.bp.frequency.setTargetAtTime(base * 1.6, now, 0.05);
        const effort = Math.min(1, Math.abs(acc) / 0.7);
        v.mg.gain.setTargetAtTime(speed > 0.2 ? 0.035 + 0.12 * effort : 0, now, 0.15);
        v.rg.gain.setTargetAtTime(Math.min(1, speed / 14) * 0.35, now, 0.2);
        v.sg.gain.setTargetAtTime(o.state === 3 && speed > 0.05 && speed < 2.6 ? 0.05 * (1 - speed / 2.6) + 0.02 : 0, now, 0.12);
        // rail joints under every axle
        if (speed > 0.3) {
          const gx = s.group.position.x;
          const sgn = s.track.dir > 0 ? 1 : -1;
          for (let i = 0; i < s.axles.length; i++) {
            const wx = gx + sgn * s.axles[i].x;
            const j = Math.floor(wx / JOINT);
            if (v.lastJ[i] !== 0x7fffffff && j !== v.lastJ[i]) thump(A, v.out, 0.1 + Math.min(0.25, speed * 0.02), now + 0.01);
            v.lastJ[i] = j;
          }
        }
      }
    },
  };
}
