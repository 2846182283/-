/**
 * people/outskirts — a few quiet figures away from the station, so the long
 * street and the hanami levee are not deserted (spec 十四: few people, each
 * with a small story):
 *
 *   photoGirl    under the foreground sakura on the main street, phone raised to the blossoms
 *   shopper      on the east shoulder in front of the zakka shop, eyeing the window display
 *   dogWalker    resting on the levee path with his shiba sitting at his feet (leash in hand)
 *   slopeGirl    sitting on the levee's grass slope hugging her knees, looking over the town
 *
 * Called from cast.js with its `add` helper (same Actor / pose / update contract).
 */
import * as THREE from 'three';
import { buildCat } from './cats.js';
import { fitBounds } from './character.js';
import { vnoise } from './rig.js';
import { tube } from './mesh.js';

const _v = new THREE.Vector3();
const _k = new THREE.Vector3();

/**
 * @param ctx      module ctx
 * @param shared   { atlas, rects, material }
 * @param kit      { add, R (recipes), breathe(a, t, seed, ...), group, far(object) (distance cull) }
 */
export function buildOutskirts(ctx, shared, kit) {
  const { layout, sim } = ctx;
  const { MAIN_STREET, LOTS, TREES, surfaceY, groundY } = layout;
  const { add, R, breathe, group, far } = kit;
  const wind = sim.wind;
  const updates = [];

  // ---- photo girl under the foreground (hero) sakura ---------------------------------------
  // West shoulder between the quiet-corner vending machine and the jizo, clear of the
  // walker's loop (which starts at z 70) and the pole at z ~71.
  {
    const ht = TREES.find((t) => t.hero);
    const f = MAIN_STREET.offsetAtS(MAIN_STREET.atZ(73.6).s, -3.95);
    const rotY = Math.atan2(ht.x - f.x, ht.z - f.z) + 0.15;
    const hand = new THREE.Vector3();
    let phoneRest = null;
    add(R.photoGirl, f.x, surfaceY(f.x, f.z), f.z, rotY, (a) => {
      a.p.set('spine', -0.06, 0, 0).set('chest', -0.08, 0, 0).set('neck', -0.08, 0, 0).set('head', -0.12, 0.04, 0);
      a.p.set('thigh_R', -0.05, 0, -0.02).set('shin_R', 0.1, 0, 0).set('foot_R', -0.05, -0.15, 0);
      a.p.updateWorld();
      phoneRest = a.rest.phone;
      // both hands on the phone's long edges
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        a.w(phoneRest.x + sx * 0.05, phoneRest.y - 0.1, phoneRest.z - 0.1, hand);
        a.arm(sd, hand, sx * 0.6, -1, -0.3);
      }
    }, (a, t) => {
      breathe(a, t, 21);
      // tiny re-framing moves of the phone every few seconds, then a glance past it at the tree
      const k = vnoise(t * 0.4, 31);
      a.p.delta('chest', -0.01 * k, 0.03 * k, 0);
      const peek = Math.max(0, Math.sin(t * 0.33)) ** 6;
      a.p.delta('head', -0.1 * peek + 0.01 * k, 0.12 * peek, 0.03);
    });
  }

  // ---- shopper at the zakka shop --------------------------------------------------------------
  {
    const zk = LOTS.find((l) => l.type === 'zakka');
    const f = MAIN_STREET.offsetAtS(MAIN_STREET.atZ(zk ? zk.z + 0.2 : 43).s, 3.6);
    // facing the shop window (east) but turned a little south, so the long street view
    // (looking north from the hero tree) gets a 3/4 look at her
    const rotY = Math.PI / 2 - 0.4;
    const look = new THREE.Vector3(f.x + Math.sin(rotY) * 2.2, surfaceY(f.x, f.z) + 1.1, f.z + Math.cos(rotY) * 2.2);
    const chin = new THREE.Vector3();
    add(R.shopper, f.x, surfaceY(f.x, f.z), f.z, rotY, (a) => {
      a.p.set('hips', 0, 0, 0.03).set('spine', 0.06, 0, 0).set('chest', 0.05, 0.08, 0);
      a.p.set('thigh_L', -0.06, 0, 0.02).set('shin_L', 0.12, 0, 0).set('foot_L', -0.06, 0.15, 0);
      // tote on the left forearm-hanging hand, elbow slightly bent
      const r = a.rest.hand_L;
      a.w(r.x + 0.02, r.y + 0.05, r.z + 0.07, _v);
      a.arm('L', _v, 0.4, 0, -1);
    }, (a, t) => {
      breathe(a, t, 22);
      // right hand drifts up to the chin while she makes up her mind
      const think = THREE.MathUtils.smoothstep(Math.sin(t * 0.21 + 1), -0.2, 0.4);
      const P = a.P;
      a.w(-0.03 + 0.05 * (1 - think), THREE.MathUtils.lerp(P.hipsY - 0.02, P.chinY - 0.03, think), THREE.MathUtils.lerp(0.06, 0.1, think), chin);
      a.arm('R', chin, -0.9, -0.7, -0.2);
      const h = a.headToward(look, 0.7, 0.9);
      a.p.delta('head', h.pitch + 0.08 * think, h.yaw + vnoise(t * 0.15, 23) * 0.15, -0.08 * think);
    });
  }

  // ---- levee: grandpa resting with his shiba ----------------------------------------------------
  {
    const x = -24.5, z = -69.25;
    const y = surfaceY(x, z);
    const rotY = -Math.PI / 2 + 0.3; // facing west along the path, toward the levee view
    const c = Math.cos(rotY), s = Math.sin(rotY);
    // dog: sitting at his right front, looking up at him
    const dl = { x: -0.45, z: 0.42 };
    const dx = x + dl.x * c + dl.z * s, dz = z - dl.x * s + dl.z * c;
    const dog = buildCat('shiba', 'shiba', 'sit', shared);
    const DS = 1.75;
    dog.object.scale.setScalar(DS);
    dog.object.position.set(dx, surfaceY(dx, dz), dz);
    dog.object.rotation.y = Math.atan2(x - dx, z - dz) - 0.35;
    dog.poser.commit();
    fitBounds(dog, 0.1);
    group.add(dog.object);
    far(dog.object);
    // collar in dog-model space (sit pose: neck at ~(0, 0.2, 0.05)), scaled into the world
    const collar = new THREE.Vector3(0, 0.205, 0.07);
    const grip = new THREE.Vector3();
    const walker = add(R.dogWalker, x, y, z, rotY, (a) => {
      a.p.set('spine', 0.1, 0, 0).set('chest', 0.04, -0.1, 0).set('neck', 0.06, 0, 0);
      a.p.set('thigh_L', -0.05, 0, 0.02).set('shin_L', 0.1, 0, 0).set('foot_L', -0.05, 0.1, 0);
      // left hand behind the back, right hand low in front holding the leash
      a.w(0.04, a.P.waistY - 0.08, -(a.P.torso[3].rz + 0.1), _v);
      a.arm('L', _v, 1, -0.2, -0.3, -0.6);
      a.w(-0.2, a.P.hipsY + 0.02, 0.16, _v);
      a.arm('R', _v, -1, -0.4, -0.3);
    }, (a, t) => {
      breathe(a, t, 24);
      a.p.delta('head', 0.12 + vnoise(t * 0.2, 25) * 0.05, -0.3 + vnoise(t * 0.12, 26) * 0.25, 0); // smiling down at the dog, face clear of the brim
    }, 0);
    ctx.addCollider(Math.min(x, dx) - 0.35, Math.max(x, dx) + 0.35, Math.min(z, dz) - 0.35, Math.max(z, dz) + 0.35);
    // leash: a sagging line from his fist to the collar (static; hand and collar barely move)
    walker.o.updateMatrixWorld(true);
    walker.ch.rig.bones.hand_R.getWorldPosition(grip);
    grip.y -= 0.07 * walker.P.s;
    dog.object.updateMatrixWorld(true);
    const end = dog.object.localToWorld(collar.clone());
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      pts.push(grip.clone().lerp(end, u).add(_k.set(0, -Math.sin(u * Math.PI) * 0.12, 0)));
    }
    const leash = new THREE.Mesh(tube(pts, 0.006, 4), ctx.toon.mat('#b0584e', { name: 'people-leash' }));
    leash.userData.noOutline = true;
    leash.position.copy(end); // geometry is world-space; the position only serves the distance cull
    leash.geometry.translate(-end.x, -end.y, -end.z);
    group.add(leash);
    far(leash);
    // dog: happy tail wag, looks up at grandpa and around
    const dp = dog.poser;
    updates.push((t) => {
      const w = Math.sin(t * 9) * (0.6 + 0.4 * Math.sin(t * 0.5));
      dp.delta('tail1', 0, w * 0.25, 0);
      dp.delta('tail2', 0, w * 0.35, 0);
      dp.delta('tail3', 0, w * 0.2, 0);
      dp.delta('cHead', -0.25 + vnoise(t * 0.3, 41) * 0.12, vnoise(t * 0.2, 42) * 0.5, vnoise(t * 0.25, 43) * 0.2);
      const tw = (t * 0.3) % 1;
      const e = tw < 0.05 ? Math.sin((tw / 0.05) * Math.PI) : 0;
      dp.delta('earL', 0, 0, -e * 0.4);
    });
  }

  // ---- levee: a student sitting on the south grass slope --------------------------------------
  {
    const x = -17.8, z = -66.35;
    const rotY = -0.55; // looking out over the town, south-south-west
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const seatY = groundY(x, z);
    const knee = new THREE.Vector3();
    add(R.slopeGirl, x, 0, z, rotY, (a) => {
      const P = a.P;
      a.o.position.y = seatY + 0.07 - P.hipJ;
      a.o.updateMatrixWorld(true);
      a.p.set('spine', 0.22, 0, 0).set('chest', 0.1, 0, 0).set('neck', -0.12, 0, 0).set('head', -0.14, 0.1, 0.05);
      // feet planted down-slope, knees drawn up
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        const fx = sx * 0.1, fz = 0.42;
        const wx = x + fx * c + fz * s, wz = z - fx * s + fz * c;
        a.w(fx, groundY(wx, wz) - a.o.position.y + P.ankleY, fz, _v);
        a.leg(sd, _v, 0, 1, 0.5);
        a.levelFoot(sd);
      }
      a.p.updateWorld();
      // arms wrapped around the shins, hands meeting just below the knees
      for (const [sd, sx] of [['L', 1], ['R', -1]]) {
        a.ch.rig.bones[`shin_${sd}`].getWorldPosition(knee);
        a.o.worldToLocal(knee);
        a.w(sx * 0.02, knee.y - 0.1, knee.z + 0.07, _v);
        a.arm(sd, _v, sx * 0.9, -0.2, -0.2, sx * 0.3);
      }
    }, (a, t) => {
      breathe(a, t, 26);
      a.p.delta('head', vnoise(t * 0.2, 27) * 0.04, vnoise(t * 0.08, 28) * 0.3, 0.05 + wind.gust * 0.03);
    });
  }

  return (dt, t) => { for (const u of updates) u(t, dt); };
}
