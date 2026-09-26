/**
 * World module: train — two 3-car 春風電鉄 commuter EMU sets (クハ + モハ + クハ).
 *
 *  - cream body, sakura-pink line stripe + thin roofline band, rounded cab
 *    with a raked windscreen in a black mask, dot-matrix destination LED,
 *    line badge, run number, round headlights (lit, with glow cards) /
 *    taillights (red, trailing end only), wipers, logo, car numbers, skirt,
 *    anti-climber, coupler
 *  - sides: rounded windows (blue-grey glass) with a full interior behind
 *    (benches, partitions, stanchions, straps, racks, light strips, ads,
 *    passengers), 3 pairs of sliding doors per side that really open, yellow
 *    safety lines, priority / free-space / door-caution stickers
 *  - roof: AC units, vents, single-arm pantograph raised to the contact wire,
 *    insulated HV bus with jumpers; visible bogies & under-floor equipment
 *  - 150 s looping timetable (see train/timetable.js), writes sim.trains and
 *    sim.crossing every frame; WebAudio motor / joints / brake / door chime
 *
 * Draw calls: every trainset is ~11 meshes (merged per material + instanced
 * doors / wheels); a set that is off the rails' range is hidden.
 */
import * as THREE from 'three';
import { STATION, RAIL, TRAIN, PLATFORM } from '../core/layout.js';
import { Parts, atlasPlane, remapUV } from './train/parts.js';
import { D } from './train/dims.js';
import { buildAtlas } from './train/atlas.js';
import { sideWalls, roof, cabFront, carEnd, floorSlab, openingsFor, frontFrame, conformPatch } from './train/shell.js';
import { wheelsetGeometry, bogie, underfloor } from './train/under.js';
import { acUnit, vent, roofCables, pantograph, antenna } from './train/roof.js';
import { interior, passengers, doorLCDs } from './train/interior.js';
import { leafGeometries, LEAF } from './train/doors.js';
import { buildTimetable, STATE_NAMES } from './train/timetable.js';
import { createTrainAudio } from './train/sound.js';

const SETS = [
  {
    key: 'A', id: 'set1', track: 'A', dest: STATION.west.name, run: '07',
    cars: [{ kana: 'クハ', no: '7001' }, { kana: 'モハ', no: '7101' }, { kana: 'クハ', no: '7201' }],
  },
  {
    key: 'B', id: 'set2', track: 'B', dest: STATION.east.name, run: '12',
    cars: [{ kana: 'クハ', no: '7002' }, { kana: 'モハ', no: '7102' }, { kana: 'クハ', no: '7202' }],
  },
];
const CAR_KINDS = ['cab', 'mid', 'cab'];

/** Set-local transform of car i: front coupler of the set at x = 0, set extends to -X. */
function carMatrix(i) {
  const m = new THREE.Matrix4().makeTranslation(-D.half - i * D.L, 0, 0);
  if (i === CAR_KINDS.length - 1) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
  return m;
}

// ---------------------------------------------------------------------------
// shared car geometry (built once per car kind)
// ---------------------------------------------------------------------------
function buildCarParts(kind, atlas, rng) {
  const P = new Parts();
  sideWalls(P, kind);
  roof(P, kind);
  floorSlab(P, kind);
  if (kind === 'cab') { cabFront(P); carEnd(P, -1); } else { carEnd(P, 1); carEnd(P, -1); }
  interior(P, kind, atlas);
  bogie(P, -D.bogieX, { motor: kind === 'mid' });
  bogie(P, D.bogieX, { motor: kind === 'mid', lead: kind === 'cab' });
  underfloor(P, kind, rng);
  if (kind === 'mid') {
    pantograph(P, -5.7); // towards the rear cab of each set (nearer the station centre)
    acUnit(P, 1.6);
    vent(P, 7.3); vent(P, -2.3);
    roofCables(P);
  } else {
    acUnit(P, -0.8);
    vent(P, -7.3); vent(P, 2.6);
    antenna(P, 5.4);
    roofCables(P, { front: false, xFrontEnd: 7.4 });
  }
  sideDecals(P, kind, atlas);
  return P.compact();
}

/** Decals that are the same on every car of a kind: logo, stickers, petals on the roof. */
function sideDecals(P, kind, atlas) {
  const r = atlas.r;
  const { wins } = openingsFor(kind);
  const onSide = (g, side, x, y, off = 0.004) => {
    if (side < 0) g.rotateY(Math.PI);
    g.translate(x, y, side * (D.hw + off));
    P.add('decal', g);
  };
  for (const side of [1, -1]) {
    // company logo + name on the lower panel of the middle bay
    onSide(atlasPlane(0.88, 0.22, r.logoSide), side, kind === 'cab' ? -3.6 : -3.0, 1.66);
    // priority-seat stickers on the end windows (glass sits 3.5 cm inside the wall face)
    for (const w of wins.filter((q) => q.type === 'end')) {
      const g = atlasPlane(0.3, 0.1125, r.priority);
      if (side < 0) g.rotateY(Math.PI);
      g.translate((w.a + w.b) / 2, w.lo + 0.14, side * (D.liningIn + 0.09));
      P.add('decal', g);
    }
    if (kind === 'cab') onSide(atlasPlane(0.2, 0.2, r.freeSpace), side, 6.42, 2.9);
  }
  // a few fallen petals on the roof (flat top, clear of the equipment)
  const spots = kind === 'mid' ? [[-6.2, 0.15], [3.2, -0.25], [-4.6, -0.3]] : [[-6.0, -0.2], [2.4, 0.25], [4.3, -0.15], [6.6, 0.1]];
  for (const [x, z] of spots) {
    const g = atlasPlane(0.8, 0.8, r.petals);
    g.rotateX(-Math.PI / 2);
    g.rotateY(x * 1.3);
    g.translate(x, D.roofTop + 0.004, z);
    P.add('decal', g);
  }
}

/** Per-trainset details: destination LEDs, lamps, glows, car numbers, side LEDs, passengers. */
function setDecals(S, set, atlas, rng) {
  const r = atlas.r;
  CAR_KINDS.forEach((kind, i) => {
    const P = new Parts();
    const car = set.cars[i];
    for (const side of [1, -1]) {
      const place = (g, x, y, bucket, off = 0.004) => {
        if (side < 0) g.rotateY(Math.PI);
        g.translate(x, y, side * (D.hw + off));
        P.add(bucket, g);
      };
      // car number near the -X end, side destination LED right of the centre door
      place(atlasPlane(0.52, 0.114, r[`no_${set.key}${i}`]), kind === 'cab' ? -7.95 : -7.9, 1.6, 'decal');
      const dxC = kind === 'cab' ? -0.6 : 0;
      P.box('body', 0.7, 0.2, 0.02, dxC + 1.02, 3.12, side * (D.hw + 0.005), '#1d1e22');
      place(atlasPlane(0.62, 0.116, r[`led_${set.key}`]), dxC + 1.02, 3.12, 'led', 0.017);
    }
    doorLCDs(P, kind, r[`lcd_${set.key}`]);
    passengers(P, kind, rng, { driver: kind === 'cab' && i === 0 });
    if (kind === 'cab') cabDecals(P, set, i === 0, r, i);
    S.append(P, carMatrix(i));
  });
}

/** Cab front details for one cab: LED, badge, run number, lamps (+glows), logo, number, petals. */
function cabDecals(P, set, leading, r, i) {
  P.add('led', conformPatch(3.56, 3.8, -0.72, 0.72, 2, 8, 0.012, r[`led_${set.key}`]));
  P.add('led', conformPatch(3.6, 3.74, 0.82, 1.14, 1, 3, 0.012, r[`run_${set.key}`]));
  P.add('decal', conformPatch(3.57, 3.83, -1.15, -0.89, 1, 2, 0.012, r.badge));
  for (const s of [1, -1]) {
    const m = frontFrame(1.74, s * 0.8, 0);
    const head = remapUV(new THREE.CircleGeometry(0.105, 20), r[leading ? 'headOn' : 'headOff']);
    head.translate(-0.16 * s, 0, 0.046);
    P.add('led', head, null, m);
    const tail = atlasPlane(0.17, 0.11, r[leading ? 'tailOff' : 'tailOn']);
    tail.translate(0.17 * s, 0, 0.046);
    P.add('led', tail, null, m);
    if (leading) {
      const g = atlasPlane(1.0, 1.0, r.glowW);
      g.translate(-0.16 * s, 0, 0.09);
      P.add('glow', g, null, m);
    } else {
      const g = atlasPlane(0.55, 0.55, r.glowR);
      g.translate(0.17 * s, 0, 0.09);
      P.add('glow', g, null, m);
    }
  }
  P.add('decal', atlasPlane(0.3, 0.3, r.logo), null, frontFrame(1.74, 0, 0.004));
  P.add('decal', atlasPlane(0.34, 0.1275, r[`nof_${set.key}${i}`]), null, frontFrame(1.45, 0, 0.004));
  P.add('decal', conformPatch(2.29, 2.47, -1.05, 0.95, 1, 6, 0.02, r.petalsFew));
}

// ---------------------------------------------------------------------------
export default async function build(ctx) {
  const { toon, geom, sim } = ctx;
  const root = new THREE.Group();
  root.name = 'train';
  const rng = ctx.rng(7031);

  const atlas = buildAtlas(SETS);
  const noise = ctx.tex.noiseTexture({ size: 256, scale: 6, octaves: 3, base: '#ffffff', variation: 0.07, seed: 71, repeat: [1, 1] });
  const M = {
    body: toon.mat('#ffffff', { vertexColors: true, map: noise, rim: 0.18, name: 'train_body' }),
    metal: toon.metal('#ffffff', { vertexColors: true, name: 'train_metal' }),
    glass: toon.glass({ tint: '#98b0c4', opacity: 0.34, sheen: 0.3 }),
    glassF: toon.glass({ tint: '#7690a8', opacity: 0.48, sheen: 0.4 }),
    decal: toon.mat('#ffffff', { map: atlas.texture, alphaTest: 0.45, polygonOffset: 1, name: 'train_decal' }),
    led: toon.unlit('#ffffff', { map: atlas.texture, name: 'train_led' }),
    glow: toon.unlit('#ffffff', { map: atlas.texture, transparent: true, depthWrite: false, name: 'train_glow' }),
  };
  const BUCKET_MESH = {
    body: { mat: M.body, cast: true }, bodyNO: { mat: M.body, noOutline: true }, metal: { mat: M.metal, cast: true },
    metalNO: { mat: M.metal, noOutline: true },
    inner: { mat: M.body, cast: true, inner: true }, innerNO: { mat: M.body, noOutline: true, inner: true },
    innerMetal: { mat: M.metal, noOutline: true, inner: true }, innerDecal: { mat: M.decal, noOutline: true, inner: true },
    glass: { mat: M.glass, noOutline: true }, glassF: { mat: M.glassF, noOutline: true },
    decal: { mat: M.decal, noOutline: true }, led: { mat: M.led, noOutline: true }, glow: { mat: M.glow, noOutline: true, order: 5 },
  };
  const carParts = { cab: buildCarParts('cab', atlas, rng), mid: buildCarParts('mid', atlas, rng) };
  const wheelGeo = wheelsetGeometry(Parts);
  const leaf = leafGeometries(Parts, atlas);
  const tt = buildTimetable();

  const sets = SETS.map((spec, k) => {
    const track = RAIL.tracks.find((t) => t.id === spec.track);
    const S = new Parts();
    CAR_KINDS.forEach((kind, i) => S.append(carParts[kind], carMatrix(i)));
    setDecals(S, spec, atlas, ctx.rng(900 + k * 17));
    const g = new THREE.Group();
    g.name = `train-${spec.id}`;
    g.userData.dynamic = true;
    let tris = 0;
    const innerMeshes = [];
    for (const [bucket, info] of Object.entries(BUCKET_MESH)) {
      const geo = S.merged(bucket);
      if (!geo) continue;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, info.mat);
      mesh.name = `${g.name}:${bucket}`;
      mesh.castShadow = !!info.cast;
      mesh.receiveShadow = true;
      if (info.noOutline) mesh.userData.noOutline = true;
      if (info.order) mesh.renderOrder = info.order;
      if (info.inner) innerMeshes.push(mesh);
      g.add(mesh);
      tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    }
    // wheelsets (instanced, rotate with distance travelled)
    const axles = [];
    CAR_KINDS.forEach((kind, i) => {
      const cm = carMatrix(i);
      for (const bx of [-D.bogieX, D.bogieX]) for (const a of [-1, 1]) axles.push(new THREE.Vector3(bx + a * D.axleHalf, D.wheelY, 0).applyMatrix4(cm));
    });
    const wheels = geom.instanced(wheelGeo, M.metal, axles.map((p) => new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)), { castShadow: true });
    wheels.name = `${g.name}:wheels`;
    g.add(wheels);
    // door leaves (instanced), platform side slides open
    const platformZ = PLATFORM[track.platform].zTrack;
    const platformSideLocal = Math.sign(platformZ - track.z) * (track.dir > 0 ? 1 : -1);
    const leaves = [];
    CAR_KINDS.forEach((kind, i) => {
      const cm = carMatrix(i);
      const rot = i === CAR_KINDS.length - 1 ? -1 : 1;
      for (const dx of openingsFor(kind).doors) for (const side of [1, -1]) for (const kSide of [-1, 1]) {
        const local = new THREE.Matrix4().makeTranslation(dx + kSide * LEAF.w / 2, 0, side * D.leafZ);
        if (side < 0) local.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
        const base = new THREE.Matrix4().multiplyMatrices(cm, local);
        const slide = new THREE.Vector3(kSide * rot, 0, 0); // set-local slide direction
        leaves.push({ base, slide, moves: side * rot === platformSideLocal });
      }
    });
    const mk = (geo, mat, name, noOutline, cast) => {
      const im = geom.instanced(geo, mat, leaves.map((l) => l.base), { castShadow: cast, noOutline });
      im.name = `${g.name}:${name}`;
      g.add(im);
      return im;
    };
    const doorMeshes = [mk(leaf.body, M.body, 'doors', false, true), mk(leaf.glass, M.glass, 'doorGlass', true, false), mk(leaf.decal, M.decal, 'doorDecal', true, false)];
    tris += wheelGeo.index.count / 3 * axles.length + (leaf.body.index.count / 3) * leaves.length;
    g.position.set(TRAIN.stopFrontX[spec.track], 0, track.z);
    g.rotation.y = track.dir > 0 ? 0 : Math.PI;
    root.add(g);
    return {
      spec, k, track, group: g, innerMeshes, innerOn: true, wheels, axles, leaves, doorMeshes, tris,
      sample: { x: 0, v: 0, state: 0, visible: false, doors: 0 },
      lastX: NaN, lastDoors: -1,
      simEntry: { id: spec.id, track: spec.track, x: 0, dir: track.dir, speed: 0, length: TRAIN.cars * TRAIN.carLength, z: track.z, doorsOpen: 0, state: 'standing' },
    };
  });
  root.userData.stats = { triangles: sets.map((s) => s.tris), crossingWindows: tt.crossingWindows() };

  // ---------------------------------------------------------------------------
  // per-frame update (no allocations)
  // ---------------------------------------------------------------------------
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3(1, 1, 1);
  const _z = new THREE.Vector3(0, 0, 1);

  function updateWheels(s, x) {
    const ang = -(s.track.dir * x) / D.wheelR;
    _q.setFromAxisAngle(_z, ang);
    for (let i = 0; i < s.axles.length; i++) {
      _m.compose(s.axles[i], _q, _s);
      s.wheels.setMatrixAt(i, _m);
    }
    s.wheels.instanceMatrix.needsUpdate = true;
  }
  function updateDoors(s, open) {
    const e = open * open * (3 - 2 * open);
    for (let i = 0; i < s.leaves.length; i++) {
      const l = s.leaves[i];
      if (!l.moves) continue;
      _m.copy(l.base);
      _p.copy(l.slide).multiplyScalar(e * LEAF.slide);
      _m.elements[12] += _p.x; _m.elements[13] += _p.y; _m.elements[14] += _p.z;
      for (const im of s.doorMeshes) im.setMatrixAt(i, _m);
    }
    for (const im of s.doorMeshes) im.instanceMatrix.needsUpdate = true;
  }

  const INTERIOR_LOD = 75; // metres
  const cam = ctx.camera.position;
  function distanceToSet(s, x) {
    const x2 = x - s.track.dir * s.simEntry.length;
    const nx = Math.min(Math.max(cam.x, Math.min(x, x2)), Math.max(x, x2));
    return Math.hypot(cam.x - nx, cam.y - 2.5, cam.z - s.track.z);
  }

  const audio = createTrainAudio(ctx, sets, tt);
  let crossingWas = null;

  ctx.onUpdate((dt, t) => {
    sim.trains.length = 0;
    for (const s of sets) {
      const o = tt.sample(s.k, t, s.sample);
      s.group.visible = o.visible;
      if (!o.visible) continue;
      s.group.position.x = o.x;
      if (o.x !== s.lastX) { updateWheels(s, o.x); s.lastX = o.x; }
      if (Math.abs(o.doors - s.lastDoors) > 1e-4) { updateDoors(s, o.doors); s.lastDoors = o.doors; }
      // interior LOD: furniture & passengers only when the camera is near enough to see them
      const near = distanceToSet(s, o.x) < INTERIOR_LOD;
      if (near !== s.innerOn) { for (const m of s.innerMeshes) m.visible = near; s.innerOn = near; }
      const e = s.simEntry;
      e.x = o.x; e.speed = o.v; e.doorsOpen = o.doors; e.state = STATE_NAMES[o.state];
      sim.trains.push(e);
    }
    const active = tt.crossingActive(t);
    if (active !== crossingWas) {
      sim.crossing.active = active;
      sim.crossing.since = t;
      crossingWas = active;
    }
    audio.update(t, dt);
  });

  return root;
}
