/**
 * railway/signals.js — colour-light signals and small signal-side equipment.
 *
 *   home signals (場内, 3 aspects G/Y/R) on tall masts with a ladder, a small
 *   maintenance platform, black backplate and hoods; start signals (出発,
 *   2 aspects) on short masts; a low shunting signal (入換) at the west
 *   platform end.  Each signal has a relay box, an identification plate and
 *   ATS transponders (yellow) between the rails ahead of it.
 *
 * Lamp faces are ONE instanced unlit mesh; their colours follow a simple
 * automatic-block model driven by sim.trains (red when the block ahead is
 * occupied, yellow when the next signal is red, else green).  Colours are only
 * re-uploaded when an aspect changes.
 */
import * as THREE from 'three';
import { RAIL, TRAIN } from '../../core/layout.js';
import { TRK, mtx } from './common.js';

const LIT = { R: new THREE.Color('#ff3b2f'), Y: new THREE.Color('#ffb83a'), G: new THREE.Color('#34f0b4'), W: new THREE.Color('#fff6e2') };
const DARK = new THREE.Color('#2b2e35');
const PITCH = 0.36;

/** Signal records with world placement.  Placed on the outer (left-hand) side of their track. */
export function signalPlan() {
  const list = [];
  const add = (s, kind) => {
    const tr = TRK.byId[s.track];
    const out = TRK.outer[tr.id];
    list.push({
      kind, track: tr.id, dir: tr.dir, x: s.x,
      z: tr.z + out * 2.45,
      // the face looks toward approaching trains (opposite to the running direction)
      ry: tr.dir < 0 ? Math.PI / 2 : -Math.PI / 2,
      aspects: kind === 'home' ? ['G', 'Y', 'R'] : ['G', 'R'],
      id: `${kind}${tr.id}`,
    });
  };
  for (const s of RAIL.homeSignals) add(s, 'home');
  for (const s of RAIL.startSignals) add(s, 'start');
  return list;
}

export function buildSignals(K) {
  const B = K.B;
  const sigs = signalPlan();
  const lamps = []; // {matrix, sig, aspect}
  for (const s of sigs) {
    const local = new THREE.Group(); // placement helper: local +Z = face direction
    local.position.set(s.x, 0, s.z);
    local.rotation.y = s.ry;
    local.updateMatrixWorld(true);
    const L = local.matrixWorld;
    const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(L);
    const box = (key, w, h, d, c, x, y, z) => B.add(key, new THREE.BoxGeometry(w, h, d), c, L.clone().multiply(mtx(x, y, z)));
    const cyl = (key, r0, r1, h, c, x, y, z, seg = 10, rx = 0) => {
      const g = new THREE.CylinderGeometry(r0, r1, h, seg, 1, false);
      g.translate(0, h / 2, 0);
      B.add(key, g, c, L.clone().multiply(mtx(x, y, z, rx)));
    };
    const tall = s.kind === 'home';
    const n = s.aspects.length;
    const headY = tall ? 4.35 : 2.75; // lowest lamp centre
    const mastH = headY + PITCH * (n - 1) + 0.45;
    // foundation, mast, cap
    box('vc', 0.7, 0.3, 0.7, '#bdbab2', 0, 0.15, -0.12);
    cyl('steel', 0.085, 0.1, mastH, '#8a9098', 0, 0.3, -0.12, 10);
    cyl('steel', 0.02, 0.09, 0.1, '#6e747c', 0, 0.3 + mastH, -0.12, 10);
    // backplate (black, slightly rounded look via a lighter rim frame)
    const bpH = PITCH * n + 0.24, bpY = headY + (PITCH * (n - 1)) / 2;
    box('vc', 0.56, bpH, 0.05, '#25262b', 0, bpY, 0.04);
    box('vc', 0.6, 0.04, 0.07, '#34363c', 0, bpY + bpH / 2, 0.04);
    box('vc', 0.6, 0.04, 0.07, '#34363c', 0, bpY - bpH / 2, 0.04);
    // lamp housings + hoods
    s.aspects.forEach((a, i) => {
      const y = headY + PITCH * (n - 1 - i);
      const hood = new THREE.CylinderGeometry(0.135, 0.135, 0.15, 14, 1, true, 1.1, Math.PI * 2 - 2.2);
      hood.rotateX(Math.PI / 2);
      hood.translate(0, 0, 0.135);
      B.add('vc', hood, '#1f2024', L.clone().multiply(mtx(0, y, 0)));
      B.add('vc', insideOut(hood.clone()), '#17181c', null);
      const ring = new THREE.CylinderGeometry(0.125, 0.125, 0.03, 16);
      ring.rotateX(Math.PI / 2);
      B.add('vc', ring, '#2f3137', L.clone().multiply(mtx(0, y, 0.075)));
      lamps.push({ m: L.clone().multiply(mtx(0, y, 0.093)), sig: s, aspect: a, fixed: false });
    });
    // identification plate on the mast
    const plate = P(0, tall ? 2.35 : 1.45, -0.02);
    K.sign(`sig:${s.id}`, 0.16, 0.37, plate.x, plate.y, plate.z, s.ry);
    box('vc', 0.18, 0.39, 0.02, '#e9e7e0', 0, tall ? 2.35 : 1.45, -0.035);
    if (tall) {
      // ladder behind the mast + a small platform with a railing at the head
      for (const lx of [-0.2, 0.2]) box('steel', 0.035, headY - 0.4, 0.035, '#8a9098', lx, (headY - 0.4) / 2 + 0.3, -0.42);
      for (let y = 0.55; y < headY - 0.2; y += 0.3) box('steel', 0.4, 0.025, 0.025, '#8a9098', 0, y, -0.42);
      box('steel', 0.9, 0.04, 0.55, '#7d838b', 0, headY - 0.3, -0.25);
      for (const lx of [-0.43, 0.43]) box('steel', 0.03, 0.9, 0.03, '#8a9098', lx, headY + 0.15, -0.5);
      box('steel', 0.9, 0.03, 0.03, '#8a9098', 0, headY + 0.6, -0.5);
      box('steel', 0.9, 0.03, 0.03, '#8a9098', 0, headY + 0.25, -0.5);
    }
    // relay box beside the mast
    const rb = P(-0.85, 0, -0.1);
    relayBox(K, rb.x, rb.z, s.ry, tall ? 1.15 : 0.95);
    // cable from the relay box to the mast
    const c0 = P(-0.6, 0.25, -0.1), c1 = P(-0.1, 0.35, -0.12);
    B.tube('vcSmall', c0, c1, 0.02, '#26282c', 5);
    // ATS transponders ahead of the signal (in the approach), between the rails
    const tr = TRK.byId[s.track];
    for (const d of s.kind === 'home' ? [26, 6] : [12]) atsBeacon(K, s.x - tr.dir * d, tr.z);
    K.occupy(s.x, s.z, 1.4);
  }

  // low shunting signal at the west platform end (track A side)
  shuntSignal(K, lamps);

  // lamp faces: one instanced unlit mesh
  const disc = new THREE.CircleGeometry(0.1, 18);
  const im = K.geom.instanced(disc, K.M.lamp, lamps.map((l) => l.m), { castShadow: false, receiveShadow: false, noOutline: true });
  im.name = 'railway:signalLamps';
  const col = new THREE.Color();
  lamps.forEach((l, i) => im.setColorAt(i, col.copy(l.fixed && l.on ? LIT[l.aspect] : DARK)));
  im.instanceColor.needsUpdate = true;
  K.add(im);

  // --- automatic block aspects --------------------------------------------
  const byTrack = { A: sigs.filter((s) => s.track === 'A'), B: sigs.filter((s) => s.track === 'B') };
  for (const id of ['A', 'B']) {
    const list = byTrack[id];
    const dir = TRK.byId[id].dir;
    // order along the running direction
    list.sort((p, q) => (p.x - q.x) * dir);
    list.forEach((s, i) => {
      const next = list[i + 1];
      const far = dir > 0 ? TRK.xMax : TRK.xMin;
      s.block = [Math.min(s.x, next ? next.x : far), Math.max(s.x, next ? next.x : far)];
      s.next = next || null;
      s.state = '';
    });
  }
  const occupied = (track, lo, hi) => {
    const trains = K.ctx.sim.trains;
    for (let i = 0; i < trains.length; i++) {
      const t = trains[i];
      if (t.track !== track) continue;
      const len = t.length || TRAIN.cars * TRAIN.carLength;
      const tail = t.x - (t.dir || TRK.byId[track].dir) * len;
      const a = Math.min(t.x, tail), b = Math.max(t.x, tail);
      if (b > lo && a < hi) return true;
    }
    return false;
  };
  const evaluate = () => {
    let changed = false;
    for (const id of ['A', 'B']) {
      const list = byTrack[id];
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        let st = occupied(id, s.block[0], s.block[1]) ? 'R' : s.next && s.next.state === 'R' ? 'Y' : 'G';
        if (!s.aspects.includes(st)) st = st === 'Y' ? 'R' : st; // 2-aspect start signals: no yellow
        if (st !== s.state) { s.state = st; changed = true; }
      }
    }
    if (!changed) return;
    lamps.forEach((l, i) => {
      if (l.fixed) return;
      im.setColorAt(i, l.aspect === l.sig.state ? LIT[l.aspect] : DARK);
    });
    im.instanceColor.needsUpdate = true;
  };
  evaluate();
  K.ctx.onUpdate(evaluate);
  K.signals = sigs;
}

/** Flip a geometry inside-out (inner faces of open hoods): reverse winding + normals. */
function insideOut(g) {
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  return g;
}

/** Grey relay/equipment box with doors, louvres and a label. */
export function relayBox(K, x, z, ry, h = 1.1, label = 'box:signal') {
  const B = K.B;
  const G = new THREE.Group();
  G.position.set(x, 0, z);
  G.rotation.y = ry;
  G.updateMatrixWorld(true);
  const L = G.matrixWorld;
  const box = (key, w, hh, d, c, lx, ly, lz) => B.add(key, new THREE.BoxGeometry(w, hh, d), c, L.clone().multiply(mtx(lx, ly, lz)));
  box('vc', 0.75, 0.16, 0.5, '#bdbab2', 0, 0.08, 0); // concrete base
  box('vc', 0.62, h, 0.4, '#d4d3c9', 0, 0.16 + h / 2, 0);
  box('vc', 0.7, 0.05, 0.48, '#c2c1b7', 0, 0.16 + h + 0.025, 0.01); // roof lip
  box('vcSmall', 0.012, h - 0.12, 0.004, '#8a8a84', 0, 0.16 + h / 2, 0.202); // door split
  box('vcSmall', 0.03, 0.12, 0.02, '#4e5055', 0.06, 0.16 + h * 0.55, 0.21); // handle
  for (let i = 0; i < 4; i++) box('vcSmall', 0.2, 0.012, 0.006, '#9c9b93', -0.17, 0.3 + i * 0.05, 0.203); // louvres
  const p = new THREE.Vector3(0, 0.16 + h * 0.8, 0.203).applyMatrix4(L);
  K.sign(label, 0.36, 0.135, p.x, p.y, p.z, ry);
  const q = new THREE.Vector3(0.17, 0.16 + h * 0.52, 0.203).applyMatrix4(L);
  K.sign('warn:hvsmall', 0.12, 0.105, q.x, q.y, q.z, ry);
  K.occupy(x, z, 0.8);
}

/** Yellow ATS transponder between the rails at x. */
export function atsBeacon(K, x, z) {
  const B = K.B;
  B.box('vc', 0.5, 0.05, 0.36, '#e6be38', x, 0.345, z);
  B.box('vc', 0.52, 0.02, 0.1, '#3e4045', x, 0.318, z - 0.12);
  B.box('vc', 0.52, 0.02, 0.1, '#3e4045', x, 0.318, z + 0.12);
}

function shuntSignal(K, lamps) {
  const B = K.B;
  const tr = TRK.A;
  const x = -58.6, z = tr.z + TRK.outer.A * 2.3;
  const ry = Math.PI / 2; // faces +x (trains leaving the platform westward)
  const G = new THREE.Group();
  G.position.set(x, 0, z);
  G.rotation.y = ry;
  G.updateMatrixWorld(true);
  const L = G.matrixWorld;
  const box = (key, w, h, d, c, lx, ly, lz) => B.add(key, new THREE.BoxGeometry(w, h, d), c, L.clone().multiply(mtx(lx, ly, lz)));
  box('vc', 0.4, 0.2, 0.4, '#bdbab2', 0, 0.1, 0);
  box('steel', 0.1, 0.9, 0.1, '#8a9098', 0, 0.65, -0.05);
  box('vc', 0.5, 0.42, 0.14, '#25262b', 0, 1.25, 0);
  // three white lamps: two lit horizontally = "stop" for shunting
  for (const [lx, ly, lit] of [[-0.15, 1.33, true], [0.15, 1.33, true], [0.15, 1.13, false]]) {
    lamps.push({ m: L.clone().multiply(mtx(lx, ly, 0.075, 0, 0, 0, 0.55)), sig: null, aspect: 'W', fixed: true, on: lit });
    const ring = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12);
    ring.rotateX(Math.PI / 2);
    B.add('vc', ring, '#34363c', L.clone().multiply(mtx(lx, ly, 0.07)));
  }
  const p = new THREE.Vector3(0.36, 0.95, 0.02).applyMatrix4(L);
  K.sign('sig:shunt', 0.1, 0.23, p.x, p.y, p.z, ry);
  box('vc', 0.12, 0.25, 0.02, '#e9e7e0', 0.36, 0.95, 0.005);
  box('steel', 0.04, 0.8, 0.04, '#8a9098', 0.36, 0.45, 0);
  K.occupy(x, z, 1.0);
}
