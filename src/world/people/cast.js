/**
 * people/cast — who stands where, how they are posed, and their small idle
 * animations.  Positions come from layout.SPOTS.people (+ a few extras on the
 * platform, at the ticket machines, on the plaza and walking the main street).
 *
 *   stationStaff        gate side of the concourse; checks his watch now and then
 *   crossingGirl        waits at the crossing with her bike; looks toward trains
 *   vendingBoy          points along the drink rows of the entrance machine
 *   reader              seated on the P1 bench, turns a page every ~9 s
 *   cafeClerk           writes on the café's chalk A-frame
 *   oldLady             pauses on the shoulder with her shopping, looks up at the blossoms
 *   windGirl            under the grand sakura, holding her hair in the breeze
 *   studentA / B        chat at a door mark on platform 1 (one laughs)
 *   blazerBoy           scrolls his phone at the next door mark
 *   salaryman           taps the ticket machine screen
 *   walker              strolls north along the main street (looping walk cycle)
 *   mother + child      the child points up at the grand tree
 */
import * as THREE from 'three';
import { buildCharacter, fitBounds } from './character.js';
import { recipes } from './recipes.js';
import { vnoise } from './rig.js';
import { ss } from './mesh.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// scratch objects for per-frame work (no allocations in updates)
const _t = new THREE.Vector3();
const _t2 = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _look = { yaw: 0, pitch: 0 };

/** A placed character with helpers for world <-> local work. */
class Actor {
  constructor(ch, x, y, z, rotY) {
    this.ch = ch;
    this.p = ch.poser;
    this.P = ch.P;
    this.rest = ch.rig.rest;
    this.o = ch.object;
    this.o.position.set(x, y, z);
    this.o.rotation.y = rotY;
    this.o.updateMatrixWorld(true);
    this.update = null;
  }
  /** Character-local point -> world (into out, or a new vector). */
  w(x, y, z, out = new THREE.Vector3()) {
    return this.o.localToWorld(out.set(x, y, z));
  }
  /** Character-local direction -> world. */
  dir(x, y, z, out = new THREE.Vector3()) {
    return out.set(x, y, z).applyQuaternion(this.o.quaternion);
  }
  /** Arm IK to a world target; poleLocal = elbow bend direction in character space. */
  arm(side, target, px, py, pz, roll = 0) {
    this.dir(px, py, pz, _pole);
    this.p.ik(`upperArm_${side}`, `foreArm_${side}`, `hand_${side}`, target, _pole, roll);
  }
  leg(side, target, px = 0, py = 0.3, pz = 1) {
    this.dir(px, py, pz, _pole);
    this.p.ik(`thigh_${side}`, `shin_${side}`, `foot_${side}`, target, _pole, 0);
  }
  /** Keep the foot level with the character root after leg IK. */
  levelFoot(side) {
    const foot = this.ch.rig.bones[`foot_${side}`];
    foot.parent.getWorldQuaternion(_q).invert();
    foot.quaternion.copy(_q).multiply(this.o.quaternion);
  }
  /** Turn the head (yaw/pitch, radians) toward a world point, clamped. */
  headToward(target, maxYaw = 1.0, weight = 1) {
    const head = this.ch.rig.bones.head;
    head.getWorldPosition(_t2);
    _t.subVectors(target, _t2);
    // into character space
    _t.applyQuaternion(_q.copy(this.o.quaternion).invert());
    const yaw = THREE.MathUtils.clamp(Math.atan2(_t.x, _t.z), -maxYaw, maxYaw) * weight;
    const pitch = THREE.MathUtils.clamp(-Math.atan2(_t.y, Math.hypot(_t.x, _t.z)), -0.6, 0.7) * weight;
    _look.yaw = yaw;
    _look.pitch = pitch;
    return _look; // shared scratch: read it immediately
  }
}

/** Gentle breathing on the chest (called every frame for standing actors). */
function breathe(a, t, seed, extraX = 0, extraY = 0, extraZ = 0) {
  a.p.delta('chest', Math.sin(t * 1.7 + seed) * 0.012 + extraX, extraY, extraZ);
}

export function buildCast(ctx, shared) {
  const { layout, sim } = ctx;
  const { SPOTS, PLATFORM, STATION, PLAZA, MAIN_STREET, ROADS, LOTS, surfaceY } = layout;
  const R = recipes();
  const group = new THREE.Group();
  group.name = 'cast';
  const actors = [];
  const add = (recipe, x, y, z, rotY, pose, update, collider = 0.28) => {
    const ch = buildCharacter(recipe, shared);
    const a = new Actor(ch, x, y, z, rotY);
    group.add(ch.object);
    pose?.(a);
    a.p.commit();
    fitBounds(ch);
    a.update = update || null;
    if (collider) ctx.addCollider(x - collider, x + collider, z - collider, z + collider);
    actors.push(a);
    return a;
  };
  const wind = sim.wind;
  /** Wind direction in an actor's local frame (x, z) * strength. */
  const windLocal = (a, out) => {
    const c = Math.cos(a.o.rotation.y), s = Math.sin(a.o.rotation.y);
    const wx = wind.dir.x * wind.strength, wz = wind.dir.y * wind.strength;
    out.set(wx * c - wz * s, 0, wx * s + wz * c);
    return out;
  };
  const _wl = new THREE.Vector3();
  const ponytail = (a, t, amp = 1) => {
    windLocal(a, _wl);
    const g = 0.6 + wind.gust;
    a.p.delta('hair1', 0.18 - _wl.z * 0.2 * amp + Math.sin(t * 2.3) * 0.05 * g, 0, _wl.x * 0.25 * amp + Math.sin(t * 1.7 + 1) * 0.06 * g);
    a.p.delta('hair2', -_wl.z * 0.15 * amp + Math.sin(t * 3.1 + 0.5) * 0.08 * g, 0, _wl.x * 0.2 * amp + Math.sin(t * 2.6) * 0.08 * g);
  };

  // ---- 1. station staff ------------------------------------------------------
  {
    const s = SPOTS.people.stationStaff;
    const watch = V();
    add(R.stationStaff, s.x, STATION.building.floorY, s.z, s.rotY ?? 0, (a) => {
      a.p.set('upperArm_L', 0, 0, -0.04).set('upperArm_R', 0, 0, 0.04);
    }, (a, t) => {
      breathe(a, t, 1);
      // watch check every ~14 s: left wrist up in front of the chest, glance down
      const ph = (t + 3) % 14;
      const f = THREE.MathUtils.smoothstep(ph, 0, 0.8) * (1 - THREE.MathUtils.smoothstep(ph, 2.6, 3.4));
      a.p.reset('upperArm_L'); a.p.reset('foreArm_L');
      if (f > 0.001) {
        const P = a.P, r = a.rest.hand_L;
        a.w(THREE.MathUtils.lerp(r.x, 0.06, f), THREE.MathUtils.lerp(r.y, P.chestY - 0.06, f), THREE.MathUtils.lerp(r.z, 0.26, f), watch);
        a.arm('L', watch, 1, -0.5, -0.4);
      }
      a.p.delta('head', 0.05 + f * 0.35 + vnoise(t * 0.2, 4) * 0.05, vnoise(t * 0.12, 9) * 0.45 * (1 - f), 0);
    });
  }

  // ---- 2. crossing girl with her bike ------------------------------------------
  {
    const s = SPOTS.people.crossingGirlWithBike;
    // she stands a little west of the hint spot (the crossing control cabinet
    // occupies x > 36.35) and turns toward her bike, which faces the tracks
    const gx = s.x - 0.35, gz = s.z;
    const turn = -0.45;
    const rotY = s.rotY + turn;
    const y = surfaceY(gx, gz) + 0.005;
    // bike frame in her model space: 0.45 m to her right (-X), 0.2 m ahead, yaw back to world-north
    const bikeWorld = V(gx, 0, gz).addScaledVector(V(Math.cos(s.rotY), 0, -Math.sin(s.rotY)), -0.45).addScaledVector(V(Math.sin(s.rotY), 0, Math.cos(s.rotY)), 0.2);
    const cr = Math.cos(rotY), sr = Math.sin(rotY);
    const dx = bikeWorld.x - gx, dz = bikeWorld.z - gz;
    const bikeM = new THREE.Matrix4().makeRotationY(-turn).setPosition(dx * cr - dz * sr, 0, dx * sr + dz * cr);
    const bike = {};
    const look = V(), grip = V();
    let yawS = 0;
    add(R.crossingGirl(bikeM, bike), gx, y, gz, rotY, (a) => {
      a.p.set('hips', 0, 0, 0.03).set('spine', 0.04, -0.05, 0).set('chest', 0.03, -0.05, 0);
      a.p.set('thigh_L', -0.06, 0, 0.02).set('shin_L', 0.12, 0, 0).set('foot_L', -0.06, 0.15, 0);
      a.p.updateWorld();
      // left hand on the bike's left grip, right hand resting on the saddle
      const gl = bike.grips[0], sd = bike.saddle;
      a.w(gl.x, gl.y + 0.035, gl.z - 0.01, grip);
      a.arm('L', grip, 0.6, -0.8, -0.4, 0.4);
      a.w(sd.x, sd.y + 0.045, sd.z, grip);
      a.arm('R', grip, -0.8, -0.6, -0.2, -0.3);
    }, (a, t, dt) => {
      breathe(a, t, 2);
      ponytail(a, t);
      // look toward the nearest approaching / passing train while the crossing is active
      let target = 0;
      if (sim.crossing.active && sim.trains.length) {
        let best = null, bd = 1e9;
        for (const tr of sim.trains) { const d = Math.abs(tr.x - 32); if (d < bd) { bd = d; best = tr; } }
        if (best) {
          look.set(best.x, 2.5, best.z);
          target = a.headToward(look, 1.1).yaw;
        }
      } else target = vnoise(t * 0.15, 3) * 0.35 - 0.1;
      yawS += (target - yawS) * Math.min(1, dt * 2.5);
      a.p.delta('head', 0.02 + vnoise(t * 0.3, 5) * 0.04, yawS, 0.05);
      a.p.delta('neck', 0, yawS * 0.3, 0);
    }, 0);
    ctx.addCollider(Math.min(gx, bikeWorld.x) - 0.35, Math.max(gx, bikeWorld.x) + 0.3, gz - 1.0, gz + 0.8);
  }

  // ---- 3. vending boy ----------------------------------------------------------------
  {
    const s = SPOTS.people.vendingBoy;
    const vm = SPOTS.vending.find((v) => v.id === 'V1');
    const z = vm ? vm.z + 0.36 + 0.5 : s.z; // cabinet front face is 0.36 m in front of the spot (props/vending.js)
    const tgt = V();
    add(R.vendingBoy, s.x + 0.05, surfaceY(s.x, z), z, s.rotY, (a) => {
      a.p.set('spine', 0.06, 0, 0).set('chest', 0.04, 0.05, 0);
      a.p.set('upperArm_L', 0.1, 0, -0.03).set('foreArm_L', -0.2, 0, 0);
      a.p.set('thigh_R', -0.08, 0, -0.02).set('shin_R', 0.12, 0, 0).set('foot_R', -0.04, -0.2, 0);
    }, (a, t) => {
      breathe(a, t, 3, 0, 0.05);
      // finger drifts along the rows: undecided...
      const k = vnoise(t * 0.35, 11);
      const row = 1.02 + Math.round((vnoise(t * 0.12, 13) + 1) * 1.2) * 0.2;
      const fz = vm ? vm.z + 0.4 : z - 0.9;
      tgt.set((vm ? vm.x : s.x) + k * 0.28, row + (vm ? vm.y : 0), fz);
      a.arm('R', tgt, -1, -0.8, -0.3);
      const h = a.headToward(tgt, 0.8);
      a.p.delta('head', h.pitch * 0.8, h.yaw * 0.8, 0.06);
    });
  }

  // ---- 4. reader on the platform-1 bench -------------------------------------------------
  {
    const s = SPOTS.people.readerOnPlatformBench;
    const seatY = PLATFORM.top + 0.46;
    const rec = R.reader;
    const book = V(), hand = V(), axis = V();
    let page = null;
    add(rec, s.x, 0, s.z + 0.08, s.rotY, (a) => {
      const P = a.P;
      // root so that the hip joints sit just above the seat, near the backrest
      a.o.position.y = seatY + 0.07 - P.hipJ;
      a.o.updateMatrixWorld(true);
      a.p.set('spine', 0.12, 0, 0).set('chest', 0.1, 0, 0).set('neck', 0.12, 0, 0).set('head', 0.3, 0.05, 0.04);
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        // feet flat on the platform, shins roughly vertical below the knees (local coords)
        a.w(sx * 0.1, PLATFORM.top - a.o.position.y + P.ankleY, P.hipJ - P.kneeY + 0.07, _t);
        a.leg(sd, _t, 0, 0.4, 1);
        a.levelFoot(sd);
      }
      a.p.updateWorld();
      // hands to the book's outer edges
      const bk = a.ch.rig.bones.book;
      bk.getWorldPosition(book);
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        a.w(a.rest.book.x + sx * 0.1, a.rest.book.y - 0.07, a.rest.book.z - 0.07, hand);
        a.arm(sd, hand, sx * 0.35, -1, -0.15, sx * 0.6); // elbows dropped toward the lap
      }
      // spine axis of the book in character space (book frame: rx -0.95 then ry PI)
      axis.set(0, 1, 0).applyEuler(new THREE.Euler(-0.95, Math.PI, 0, 'YXZ'));
      page = a.ch.rig.bones.page;
    }, (a, t) => {
      breathe(a, t, 4);
      const cyc = t % 9;
      const f = THREE.MathUtils.smoothstep(cyc, 7.6, 8.5);
      const ang = f < 1 ? -f * (Math.PI - 0.36) : 0;
      page.quaternion.setFromAxisAngle(axis, ang);
      a.p.delta('head', 0.02 * Math.sin(t * 0.5) + f * (1 - f) * 0.2, 0.03 * vnoise(t * 0.2, 6), 0);
    }, 0);
  }

  // ---- 5. café clerk at the chalk A-frame ------------------------------------------------
  // The A-frame (shops/cafe.js) stands at lot-local (3.45, D/2 + 0.85), yawed 0.45 in the
  // lot frame, 1.0 m tall with its face leaning back 0.2 m at the foot.  The clerk stands
  // on its door side, turned toward the face, writing today's menu with her right hand.
  {
    const cafe = LOTS.find((l) => l.type === 'cafe');
    if (cafe) {
      const board = cafe.toWorld(3.45, cafe.depth / 2 + 0.85);
      const rot = cafe.rotY + 0.45;
      const frontW = V(Math.sin(rot), 0, Math.cos(rot)); // board face normal (horizontal)
      const rightW = V(-frontW.z, 0, frontW.x).negate(); // viewer's right when facing the board
      const gy = surfaceY(board.x, board.z);
      const px = board.x + frontW.x * 0.4 - rightW.x * 0.38, pz = board.z + frontW.z * 0.4 - rightW.z * 0.38;
      const aim = V(board.x + frontW.x * 0.12 - rightW.x * 0.06, 0, board.z + frontW.z * 0.12 - rightW.z * 0.06);
      const rotY = Math.atan2(aim.x - px, aim.z - pz);
      const pen = V(), rest = V();
      /** Point on the (leaning) board face: h above the foot, `across` along the viewer's right. */
      const onFace = (h, across, out) => out.set(board.x, gy + h, board.z)
        .addScaledVector(rightW, across).addScaledVector(frontW, 0.2 * (1 - h) + 0.035);
      add(R.cafeClerk, px, surfaceY(px, pz), pz, rotY, (a) => {
        a.p.set('hips', 0.08, 0, 0.03).set('spine', 0.2, 0, 0).set('chest', 0.14, 0, 0);
        a.p.set('thigh_L', -0.16, 0, 0.03).set('shin_L', 0.22, 0, 0).set('foot_L', -0.12, 0, 0);
        a.p.set('thigh_R', -0.08, 0, 0).set('shin_R', 0.08, 0, 0);
        // left hand steadies the board's top rail on her side
        onFace(0.98, -0.2, rest);
        a.arm('L', rest, 0.6, -0.8, -0.3);
      }, (a, t) => {
        breathe(a, t, 5);
        // chalk moves in short strokes along three menu lines (~0.68 .. 0.88 m up)
        const line = Math.floor(t / 4) % 3;
        const u = (t % 4) / 4;
        const h = 0.88 - line * 0.1 + Math.sin(t * 9) * 0.01;
        const across = -0.16 + u * 0.26 + Math.sin(t * 7.3) * 0.008;
        onFace(h, across, pen);
        a.arm('R', pen, -1, -0.7, -0.2);
        const hh = a.headToward(pen, 0.9);
        a.p.delta('head', hh.pitch * 0.7 + 0.05, hh.yaw * 0.7, 0.08);
      });
    }
  }

  // ---- 6. old lady with shopping bags ------------------------------------------------------
  // pauses on the east shoulder in front of the wagashi shop, eyeing today's sweets
  {
    const s = SPOTS.people.oldLadyWithBags;
    const y = surfaceY(s.x, s.z);
    const rotY = s.rotY + Math.PI - 0.35; // turned from the street toward the shop front (3/4 view from the south)
    const look = V(s.x + Math.sin(rotY) * 1.6, y + 1.0, s.z + Math.cos(rotY) * 1.6);
    add(R.oldLady, s.x, y, s.z, rotY, (a) => {
      a.p.set('spine', 0.16, 0, 0).set('chest', 0.1, 0, 0).set('neck', -0.08, 0, 0);
      a.p.set('thigh_R', -0.05, 0, 0).set('shin_R', 0.1, 0, 0).set('foot_R', -0.05, 0, 0);
      // bags pull the arms nearly straight, elbows tucked back against the body
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        const r = a.rest[`hand_${sd}`];
        a.w(r.x + sx * 0.02, r.y + 0.03, r.z + 0.06, _t);
        a.arm(sd, _t, sx * 0.25, 0, -1);
      }
    }, (a, t) => {
      breathe(a, t, 6);
      const h = a.headToward(look, 0.7, 0.8);
      a.p.delta('head', h.pitch + vnoise(t * 0.2, 7) * 0.05, h.yaw + vnoise(t * 0.1, 8) * 0.2, 0.04);
    });
  }

  // ---- 7. wind girl under the grand sakura --------------------------------------------------
  {
    const s = SPOTS.people.windGirlUnderTree;
    const rotY = -0.5;
    // prevailing wind (sim.js): heading ~0.35 rad from +X -> into her local frame
    const wx = Math.cos(0.35), wz = Math.sin(0.35);
    const c = Math.cos(rotY), sn = Math.sin(rotY);
    const blow = { x: wx * c - wz * sn, z: wx * sn + wz * c };
    const hairHand = V(), skirtHand = V();
    add(R.windGirl(blow), s.x, surfaceY(s.x, s.z), s.z, rotY, (a) => {
      a.p.set('hips', 0, 0.05, -0.03).set('chest', -0.04, -0.12, 0.03).set('head', 0.02, -0.25, 0.12);
      a.p.set('thigh_R', -0.1, 0, -0.03).set('shin_R', 0.18, 0, 0).set('foot_R', -0.08, 0, 0);
    }, (a, t) => {
      const P = a.P;
      breathe(a, t, 7, 0, -0.12, 0.03);
      const g = wind.gust;
      // left hand gathers her blowing hair at the temple; right hand presses the skirt
      a.w(0.12 + g * 0.01, P.cy + 0.01 + Math.sin(t * 1.3) * 0.01, 0.0, hairHand);
      a.arm('L', hairHand, 1, -0.3, 0.2);
      a.w(-0.1, P.hipsY - 0.14, 0.12 + g * 0.02, skirtHand);
      a.arm('R', skirtHand, -1, 0, -0.4);
      a.p.delta('head', 0.02 + vnoise(t * 0.25, 2) * 0.04, -0.25 + vnoise(t * 0.12, 3) * 0.12, 0.12 + g * 0.05);
    });
  }

  // ---- 8-10. students on platform 1 (door marks of car 3) -----------------------------------
  {
    const PT = PLATFORM.top;
    const mouth = V();
    add(R.studentA, 3.25, PT, -26.0, 1.25, (a) => {
      a.p.set('hips', 0, 0, -0.04).set('thigh_L', -0.06, 0, 0).set('shin_L', 0.12, 0, 0).set('foot_L', -0.06, 0, 0);
      a.p.set('upperArm_L', 0, 0, -0.02);
    }, (a, t) => {
      const P = a.P;
      const laugh = Math.max(0, Math.sin(t * 0.45)) ** 2;
      breathe(a, t, 8, 0.04 * laugh + Math.sin(t * 11) * 0.02 * laugh, 0, 0);
      a.w(0.0, P.chinY - 0.015, 0.1, mouth);
      a.arm('R', mouth, -0.8, -0.8, -0.2);
      a.p.delta('head', -0.08 * laugh + 0.04, 0.15, 0.08 + 0.06 * laugh);
    });
    const handle = V();
    add(R.studentB, 3.95, PT, -25.72, -1.95, (a) => {
      a.p.set('hips', 0, 0, 0.03).set('thigh_R', -0.05, 0, 0).set('shin_R', 0.1, 0, 0).set('foot_R', -0.05, 0, 0);
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        const b = a.rest.bag;
        a.w(b.x + sx * 0.035, b.y - 0.045, b.z - 0.01, handle);
        a.arm(sd, handle, sx, -0.3, -0.6);
      }
    }, (a, t) => {
      breathe(a, t, 9);
      a.p.delta('head', 0.05 + vnoise(t * 0.3, 1) * 0.04, -0.12 + vnoise(t * 0.15, 2) * 0.15, -0.1);
    });
    const ph = V();
    add(R.blazerBoy, -1.55, PT, -26.1, Math.PI + 0.35, (a) => {
      a.p.set('hips', 0, 0, 0.03).set('thigh_L', -0.04, 0, 0.03).set('shin_L', 0.08, 0, 0);
      a.p.updateWorld();
      a.ch.rig.bones.phone.getWorldPosition(ph);
      a.w(a.rest.phone.x - 0.005, a.rest.phone.y - 0.07, a.rest.phone.z - 0.06, _t);
      a.arm('R', _t, -1, -0.8, -0.2);
      const r = a.rest.hand_L;
      a.w(r.x - 0.02, a.P.hipsY - 0.02, 0.02, _t);
      a.arm('L', _t, 1, 0, -0.6);
      a.p.set('neck', 0.2, 0, 0).set('head', 0.35, 0, 0);
    }, (a, t) => {
      breathe(a, t, 10);
      a.p.delta('head', Math.sin(t * 0.7) * 0.02, vnoise(t * 0.2, 12) * 0.08, 0);
    });
  }

  // ---- 11. salaryman at the ticket machines ----------------------------------------------------
  {
    const touch = V();
    // ticket machine (station/interior.js): x -9.8, front face z -19.125, tilted
    // touch screen centred ~1.28 m above the concourse floor
    const FY = STATION.building.floorY;
    add(R.salaryman, -9.72, FY, -18.6, Math.PI, (a) => {
      a.p.set('spine', 0.05, 0, 0).set('thigh_L', -0.04, 0, 0).set('shin_L', 0.1, 0, 0);
    }, (a, t) => {
      breathe(a, t, 11);
      const k = (t % 6) / 6;
      const press = Math.sin(Math.min(1, k * 3) * Math.PI) * 0.025;
      const col = Math.floor(t / 6) % 3;
      const ty = FY + 1.24 + (col === 1 ? 0.08 : 0);
      touch.set(-9.9 + col * 0.12, ty, -19.02 - (ty - FY - 1.28) * 0.37 + 0.03 - press);
      a.arm('R', touch, -1, -0.7, -0.3);
      const h = a.headToward(touch, 0.6);
      a.p.delta('head', h.pitch * 0.9, h.yaw * 0.8, 0);
    });
  }

  // ---- 12. walker on the main street (looping walk cycle) ------------------------------------------
  {
    // Strolls north from z ~70 (behind the hero camera, which looks north from z ~24),
    // turns left at the station-front road and walks west until the café building hides
    // him from the hero view (x < ~-8.5), so neither end of the loop pops in view.
    const s0 = MAIN_STREET.atZ(70).s, s1 = MAIN_STREET.atZ(12.8).s;
    const speed = 0.72;
    const hand = V();
    let stride = 0;
    // He keeps to the pedestrian strip outside the white edge line (west side, walking
    // north = keep-left), stepping in toward the line around parked bikes, poles and signs.
    const LANE = -3.35, DODGE = -2.5;
    const obstacles = [];
    const addObstacle = (x, z) => {
      if (z < 8 || z > 75) return;
      const f = MAIN_STREET.atZ(z);
      const d = (x - f.x) * f.nx + (z - f.z) * f.nz;
      if (d < -2.9 && d > -4.6) obstacles.push(f.s);
    };
    for (const b of SPOTS.bicycles) addObstacle(b.x, b.z);
    for (const l of layout.POLE_LINES) for (const q of l.poles) addObstacle(q.x, q.z);
    for (const q of SPOTS.signs) addObstacle(q.x, q.z);
    const lateralAt = (sArc) => {
      let w = 0;
      for (const so of obstacles) w = Math.max(w, ss(Math.abs(sArc - so), 2.2, 1.0));
      return LANE + (DODGE - LANE) * w;
    };
    // raw route: main street (every 0.25 m of arc), then round the corner (clear of the
    // junction mirror at (-4.6, 11.0) and the stop sign) along the station-front road edge
    const raw = [];
    for (let sa = s0; sa > s1; sa -= 0.25) raw.push(MAIN_STREET.offsetAtS(sa, lateralAt(sa)));
    const roadZ = ROADS.stationFront.z + ROADS.stationFront.halfWidth - 0.45;
    const last = raw[raw.length - 1];
    for (const [x, z] of [[last.x - 0.15, 12.1], [last.x - 0.55, 11.35], [last.x - 1.3, roadZ + 0.2], [last.x - 2.4, roadZ], [-30, roadZ]]) raw.push({ x, z });
    // resample to equal 0.25 m steps -> path table (x, y, z, yaw), so the update never allocates
    const STEP = 0.25;
    const cum = [0];
    for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z));
    const len = cum[cum.length - 1];
    const nPath = Math.floor(len / STEP) + 1;
    const path = new Float32Array(nPath * 4);
    for (let i = 0, j = 0; i < nPath; i++) {
      const d = i * STEP;
      while (j < raw.length - 2 && cum[j + 1] < d) j++;
      const k = Math.min(1, (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]));
      const x = raw[j].x + (raw[j + 1].x - raw[j].x) * k, z = raw[j].z + (raw[j + 1].z - raw[j].z) * k;
      path[i * 4] = x;
      path[i * 4 + 1] = surfaceY(x, z);
      path[i * 4 + 2] = z;
    }
    const loopLen = (nPath - 1) * STEP;
    const phase0 = cum[Math.max(0, raw.findIndex((p) => p.z < 16.5))]; // t = 0: a few metres ahead of the hero camera
    // heading from the path itself (so side-steps turn the body a little)
    for (let i = 0; i < nPath; i++) {
      const a = Math.max(0, i - 2) * 4, b = Math.min(nPath - 1, i + 2) * 4;
      path[i * 4 + 3] = Math.atan2(path[b] - path[a], path[b + 2] - path[a + 2]);
    }
    // unwrap (heading is near +-PI when walking north) so interpolation never spins
    for (let i = 1; i < nPath; i++) {
      let h = path[i * 4 + 3];
      const prev = path[(i - 1) * 4 + 3];
      while (h - prev > Math.PI) h -= Math.PI * 2;
      while (h - prev < -Math.PI) h += Math.PI * 2;
      path[i * 4 + 3] = h;
    }
    add(R.walker, 0, 0, 60, 0, (a) => {
      a.p.set('spine', 0.12, 0, 0).set('chest', 0.05, 0, 0).set('neck', -0.05, 0, 0).set('head', -0.08, 0, 0);
      // hands clasped behind the back
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        a.w(sx * 0.035, a.P.waistY - 0.1, -(a.P.torso[3].rz + 0.1), hand);
        a.arm(sd, hand, sx, -0.2, -0.3, -sx * 0.6);
      }
      stride = 0.5;
    }, (a, t) => {
      const d = (t * speed + phase0) % loopLen;
      const fi = d / STEP, i = Math.min(nPath - 2, Math.floor(fi)), k = fi - i;
      const j = i * 4;
      const ph = (t * speed / stride) * Math.PI; // one step per stride length
      a.o.position.set(
        path[j] + (path[j + 4] - path[j]) * k,
        path[j + 1] + (path[j + 5] - path[j + 1]) * k + 0.01 * Math.cos(2 * ph),
        path[j + 2] + (path[j + 6] - path[j + 2]) * k,
      );
      a.o.rotation.y = path[j + 3] + (path[j + 7] - path[j + 3]) * k;
      const sw = Math.sin(ph), cw = Math.cos(ph);
      a.p.delta('thigh_L', -0.3 * sw, 0, 0);
      a.p.delta('thigh_R', 0.3 * sw, 0, 0);
      a.p.delta('shin_L', 0.08 + 0.5 * Math.max(0, cw) ** 1.5, 0, 0);
      a.p.delta('shin_R', 0.08 + 0.5 * Math.max(0, -cw) ** 1.5, 0, 0);
      a.p.delta('foot_L', 0.25 * sw - 0.15 * Math.max(0, cw), 0, 0);
      a.p.delta('foot_R', -0.25 * sw - 0.15 * Math.max(0, -cw), 0, 0);
      a.p.delta('hips', 0, 0.06 * sw, 0.02 * cw);
      a.p.delta('chest', 0.01 * Math.cos(2 * ph), -0.05 * sw, 0);
      a.p.delta('head', 0.02 * Math.cos(2 * ph), vnoise(t * 0.1, 21) * 0.4, 0);
    }, 0);
  }

  // ---- 13-14. mother and child by the grand sakura -------------------------------------------------
  {
    const gt = PLAZA.grandTree;
    const mx = -8.7, mz = -8.5;
    const mRot = Math.atan2(gt.x - mx, gt.z - mz);
    const left = V(Math.cos(mRot), 0, -Math.sin(mRot)); // character +X in world
    const cx = mx + left.x * 0.55, cz = mz + left.z * 0.55;
    const PY = surfaceY(mx, mz);
    const clasp = V((mx + cx) / 2, PY + 0.66, (mz + cz) / 2);
    const canopy = V(gt.x, 5.5, gt.z);
    add(R.mother, mx, PY, mz, mRot - 0.15, (a) => {
      a.p.set('hips', 0, 0, -0.03).set('thigh_R', -0.06, 0, 0).set('shin_R', 0.12, 0, 0).set('foot_R', -0.06, 0, 0);
      a.arm('L', clasp, 1, 0, -0.5);
      a.p.set('upperArm_R', 0, 0, 0.05).set('foreArm_R', -0.35, 0, 0);
    }, (a, t) => {
      breathe(a, t, 12);
      const h = a.headToward(canopy, 0.8, 0.5);
      a.p.delta('head', h.pitch + 0.1, h.yaw + 0.25 + vnoise(t * 0.15, 14) * 0.1, 0.06);
    });
    const point = V(), sh = V();
    let baseY = PY;
    add(R.child, cx, PY, cz, mRot + 0.25, (a) => {
      a.arm('R', clasp, -1, 0, -0.5);
      baseY = a.o.position.y;
    }, (a, t) => {
      const hop = Math.max(0, Math.sin(t * 4.2)) * 0.025 * (0.5 + 0.5 * Math.sin(t * 0.6));
      a.o.position.y = baseY + hop;
      breathe(a, t, 13, -0.06, 0, 0);
      a.ch.rig.bones.upperArm_L.getWorldPosition(sh);
      point.subVectors(canopy, sh).normalize().multiplyScalar(0.6).add(sh);
      point.y += Math.sin(t * 4.2) * 0.03;
      a.arm('L', point, 1, -0.5, -0.3);
      const h = a.headToward(canopy, 0.9);
      a.p.delta('head', h.pitch * 0.8, h.yaw * 0.8, 0);
    });
  }

  // one updater for the whole cast
  ctx.onUpdate((dt, t) => {
    for (const a of actors) if (a.update) a.update(a, t, dt);
  });
  return { group, actors };
}

