/**
 * crossing/furniture.js — everything around the crossing that isn't a post,
 * a boom or the deck:
 *
 *   - 踏切防護柵: yellow/black striped guard pipes along both deck edges
 *     (keep walkers off the ballast) and anti-intrusion chain-link panels
 *     linking each corner post to the railway fence
 *   - ポストコーン: flexible rubber poles on the edge lines before the deck
 *   - 踏切制御器: the grey-green control cabinet on its plinth, with cables
 *   - 障害物検知装置: two obstacle-detector posts aiming across the deck
 *   - この先踏切 standing boards on both approaches, a 踏切事故をなくそう
 *     enamel plate, 立入禁止 plates, delineator reflectors
 */
import * as THREE from 'three';
import { CROSSING, RAIL } from '../../core/layout.js';
import { POST } from './posts.js';
import { deckLayout } from './deck.js';

const X0 = CROSSING.x;
const FENCE_S = RAIL.corridor.zMax - 0.1; // railway fence lines (railway.js)
const FENCE_N = RAIL.corridor.zMin + 0.1;
const RAIL_FENCE_END = 4.5; // railway fences stop this far from the crossing centre

/** Cylinder between two world points with the striped 'pipe' region repeating every 2 m. */
function stripedPipe(kit, a, b, r = 0.03) {
  const R = kit.R.pipe;
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, 8, 1, false);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const along = uv.getY(i) * (len / 2); // 8 bands per 2 m
    uv.setXY(i, R.u0 + (along % 1.0001) * (R.u1 - R.u0), R.v0 + uv.getX(i) * (R.v1 - R.v0));
  }
  g.translate(0, len / 2, 0);
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  kit.add('atlasM', g);
}

/** Steel fence post with a cap. */
function fencePost(kit, x, z, h, color = '#8e949b') {
  const f = kit.world;
  f.cyl('metal', 0.032, 0.036, h, color, x, 0, z, 8);
  f.cyl('metal', 0.012, 0.042, 0.045, '#7c828a', x, h, z, 8);
  f.cyl('vc', 0.07, 0.08, 0.06, '#c3c0b8', x, -0.01, z, 8); // little concrete collar
}

/**
 * A fence run from (x0,z0) to (x1,z1): striped pipes at `ys`, posts every
 * ~1.2 m, optional chain-link panel.
 */
function fenceRun(kit, x0, z0, x1, z1, { ys = [0.5, 0.95], mesh = false, h = 1.02 } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.2) return;
  const n = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i <= n; i++) fencePost(kit, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, h);
  for (const y of ys) stripedPipe(kit, new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z1));
  if (mesh) {
    const H = ys[ys.length - 1] - 0.1;
    const R = kit.R.mesh;
    // split into ~0.95 m panels so the texture repeats without an atlas wrap
    const k = Math.max(1, Math.round(len / 0.95));
    for (let i = 0; i < k; i++) {
      const pg = new THREE.PlaneGeometry(len / k, H);
      const pu = pg.attributes.uv;
      for (let j = 0; j < pu.count; j++) pu.setXY(j, R.u0 + pu.getX(j) * (R.u1 - R.u0), R.v0 + pu.getY(j) * (R.v1 - R.v0));
      const t = (i + 0.5) / k;
      const cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t;
      const ry = Math.atan2(-(z1 - z0), x1 - x0);
      const pb = pg.clone(); // the back side too (the atlas material is single sided)
      kit.add('atlasS', pg, '#fff', kit.world.m(cx, 0.06 + H / 2, cz, 0, ry, 0));
      kit.add('atlasS', pb, '#fff', kit.world.m(cx, 0.06 + H / 2, cz, 0, ry + Math.PI, 0));
    }
    stripedPipe(kit, new THREE.Vector3(x0, 0.08, z0), new THREE.Vector3(x1, 0.08, z1), 0.012);
  }
  kit.ctx.addCollider(Math.min(x0, x1) - 0.05, Math.max(x0, x1) + 0.05, Math.min(z0, z1) - 0.05, Math.max(z0, z1) + 0.05);
}

function fences(kit) {
  const L = deckLayout();
  const xIn = POST.offsetX + 0.22; // guard pipes just outside the deck kerb
  const toeS = L.rampS.zHigh + 0.95, toeN = L.rampN.zHigh - 0.95;
  for (const s of [-1, 1]) {
    const xp = X0 + s * POST.offsetX;
    const xg = X0 + s * xIn;
    const xe = X0 + s * RAIL_FENCE_END;
    // south corners: post -> railway fence end, along the fence line
    fenceRun(kit, xp + s * 0.2, CROSSING.zSouth + 0.28, xe, FENCE_S + 0.02, { mesh: true });
    // along the deck edge toward the ballast (guard pipes only)
    fenceRun(kit, xg, CROSSING.zSouth - 0.25, xg, toeS, { ys: [0.45, 0.85], h: 0.9 });
    // north corners: post -> corner -> railway fence (the fence line is 2 m further north)
    const zc = CROSSING.zNorth + 0.15;
    fenceRun(kit, xp + s * 0.2, zc, xe, zc, { mesh: true });
    fenceRun(kit, xe, zc, xe, FENCE_N + 0.05, { mesh: true });
    fenceRun(kit, xg, CROSSING.zNorth + 0.28, xg, toeN, { ys: [0.45, 0.85], h: 0.9 });
  }
}

/** ポストコーン on the edge lines before the deck (both approaches). */
function rubberPoles(kit) {
  const R = kit.R.rubberPole;
  const f = kit.world;
  const spots = [];
  for (const s of [-1, 1]) {
    for (const z of [CROSSING.zSouth - 0.5, CROSSING.zSouth - 1.25]) spots.push([X0 + s * 2.65, z]);
    for (const z of [CROSSING.zNorth + 0.5, CROSSING.zNorth + 1.25]) spots.push([X0 + s * 2.65, z]);
  }
  for (const [x, z] of spots) {
    f.cyl('vc', 0.12, 0.13, 0.05, '#2a2b30', x, 0.03, z, 12); // base
    const g = new THREE.CylinderGeometry(0.035, 0.042, 0.72, 10);
    g.translate(0, 0.36, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, R.u0 + uv.getX(i) * (R.u1 - R.u0), R.v0 + uv.getY(i) * (R.v1 - R.v0));
    kit.add('atlas', g, '#fff', f.m(x, 0.08, z));
    f.cyl('vc', 0.03, 0.036, 0.03, '#f2c230', x, 0.8, z, 10);
  }
}

/** 踏切制御器 (control cabinet) on a plinth, doors facing the approach. */
function cabinet(kit) {
  const x = X0 + 4.95, z = CROSSING.zSouth + 0.78;
  const f = kit.frame(x, 0, z, 0);
  const W = 0.9, H = 1.36, D = 0.46;
  f.block('vc', W + 0.2, 0.16, D + 0.2, '#c3c0b7', 0, -0.02, 0);
  f.block('vc', W, H, D, '#c3c8bf', 0, 0.14, 0);
  // roof: slightly overhanging, sloped back
  f.box('vc', W + 0.08, 0.05, D + 0.1, '#aeb3aa', 0, 0.14 + H + 0.03, 0.01, { rx: -0.08 });
  // door face + side louvres
  f.plane(kit.R.cabinetDoor, W - 0.04, H - 0.06, 0, 0.14 + H / 2, D / 2 + 0.002, 0, 'atlas');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) f.box('vcS', 0.012, 0.025, D - 0.14, '#9ea398', s * (W / 2 + 0.006), 0.4 + i * 0.05, 0);
  }
  // 立入禁止 plate on the side facing the road
  f.box('vc', 0.012, 0.26, 0.4, '#efeee7', -W / 2 - 0.006, 1.05, 0);
  f.plane(kit.R.danger, 0.38, 0.24, -W / 2 - 0.013, 1.05, 0, -Math.PI / 2);
  // cable conduits into a concrete trough running toward the tracks
  f.box('vc', 0.3, 0.1, 1.1, '#bebbb2', -0.15, 0.03, -D / 2 - 0.6);
  for (const dx of [-0.25, -0.1, 0.05]) {
    f.tube('vcS', [dx, 0.25, -D / 2 + 0.02], [dx, 0.1, -D / 2 - 0.2], 0.025, '#2a2b30', 6);
  }
  // cable to the SE post along the ground, under a small cover
  f.box('vc', 1.35, 0.06, 0.14, '#b4b1a9', -W / 2 - 0.68, 0.0, -0.3);
  kit.ctx.addCollider(x - W / 2 - 0.1, x + W / 2 + 0.1, z - D / 2 - 0.1, z + D / 2 + 0.1);
}

/** 障害物検知装置: short post with a sensor head aimed across the deck. */
function detector(kit, x, z, aim) {
  const f = kit.frame(x, 0, z, aim);
  f.block('vc', 0.36, 0.1, 0.36, '#c3c0b7', 0, -0.02, 0);
  f.cyl('metal', 0.045, 0.05, 1.35, '#9aa0a6', 0, 0.08, 0, 10);
  f.box('vc', 0.26, 0.24, 0.32, '#d9dcd6', 0, 1.5, 0.04);
  f.box('vc', 0.3, 0.03, 0.36, '#b9bcb6', 0, 1.635, 0.04);
  f.box('vcS', 0.18, 0.12, 0.01, '#23252b', 0, 1.5, 0.205); // sensor window
  f.box('vcS', 0.03, 0.03, 0.012, '#5bd06f', 0.09, 1.4, 0.205); // status LED (green = clear)
  kit.ctx.addCollider(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
}

/** Standing board (立て看板) on two legs, facing yaw ry. */
function standingBoard(kit, region, x, z, ry, w = 0.72, h = 0.42) {
  const f = kit.frame(x, 0, z, ry);
  for (const s of [-1, 1]) {
    f.block('metal', 0.04, 1.12 + h / 2, 0.04, '#9aa0a6', s * (w / 2 - 0.08), 0, -0.02);
    f.block('vc', 0.16, 0.08, 0.3, '#3b3d42', s * (w / 2 - 0.08), 0, -0.02); // weighted feet
  }
  f.box('vc', w + 0.04, h + 0.04, 0.025, '#e9e7e0', 0, 1.1, 0);
  f.plane(region, w, h, 0, 1.1, 0.0135);
  kit.ctx.addCollider(x - w / 2, x + w / 2, z - 0.2, z + 0.2);
}

/** Small plates: 踏切事故をなくそう on a fence post, delineators at the fence ends. */
function plates(kit) {
  const f = kit.world;
  // safety enamel plate on the SW mesh-fence (faces the plaza side / approach)
  const x = X0 - RAIL_FENCE_END + 0.25, z = FENCE_S + 0.05;
  f.box('vc', 0.18, 0.56, 0.015, '#dfe6ea', x, 0.62, z + 0.02);
  f.plane(kit.R.safety, 0.16, 0.54, x, 0.62, z + 0.029, 0);
  // yellow delineator discs on the guard-pipe ends facing the road
  for (const s of [-1, 1]) {
    for (const zz of [CROSSING.zSouth - 0.25, CROSSING.zNorth + 0.28]) {
      const xg = X0 + s * (POST.offsetX + 0.22);
      f.cyl('vcS', 0.045, 0.045, 0.012, '#f2a93a', xg - s * 0.04, 0.95, zz, 12, { rz: Math.PI / 2 });
    }
  }
}

export function buildFurniture(kit) {
  fences(kit);
  rubberPoles(kit);
  cabinet(kit);
  const L = deckLayout();
  detector(kit, X0 - POST.offsetX - 0.55, L.rampS.zHigh + 0.35, Math.PI * 0.8); // SW, aims NE across the deck
  detector(kit, X0 + POST.offsetX + 0.55, L.rampN.zHigh - 0.35, -Math.PI * 0.2); // NE, aims SW
  standingBoard(kit, kit.R.konosaki, X0 + 3.75, -1.2, 0);
  standingBoard(kit, kit.R.konosaki, X0 + 3.9, -43.3, Math.PI);
  plates(kit);
}
