/**
 * crossing/barrier.js — the moving parts of the 遮断機: booms and their fringe.
 *
 *   boom   (遮断桿) one InstancedMesh (both booms): tapered yellow/black bar,
 *          mount plate, counterweight arm + weight, red tip cap and three
 *          small LED lamp housings.  Pivots about the hub (local z axis).
 *   fringe (垂れ) one InstancedMesh of short striped strands hanging from the
 *          boom's underside; they always hang plumb, sway a little in the
 *          wind and gather up (shorten) as the boom rises.
 *
 * The boom LEDs are lens instances of lamps.js; this module reports their
 * world positions each time the boom moves (see lensPlacements()).
 */
import * as THREE from 'three';
import { CROSSING } from '../../core/layout.js';
import { POST } from './posts.js';
import { regionUV, solidUV } from './kit.js';

export const BOOM = {
  // from the pivot to the tip: reaches just past the far road edge line
  length: CROSSING.roadHalfWidth * 2 + (POST.offsetX - CROSSING.roadHalfWidth) + 0.05,
  h0: 0.12, h1: 0.075, // height at root / tip
  t0: 0.075, t1: 0.05, // thickness at root / tip
  upAngle: 1.43, // raised (about 82°)
  lampXs: [2.0, 4.1],
  fringeFrom: 0.95,
  fringeStep: 0.15,
  fringeLen: 0.3,
};
BOOM.lampXs.push(BOOM.length - 0.22);

const heightAt = (x) => BOOM.h0 + (BOOM.h1 - BOOM.h0) * Math.min(1, Math.max(0, x / BOOM.length));
const thickAt = (x) => BOOM.t0 + (BOOM.t1 - BOOM.t0) * Math.min(1, Math.max(0, x / BOOM.length));

/** Boom geometry in its pivot frame (pivot at origin, boom along +x, plane z = 0). */
function boomGeometry(kit) {
  const R = kit.R;
  const parts = [];
  const solid = (g, r, m) => { solidUV(g, r); if (m) g.applyMatrix4(m); parts.push(g); };
  const B = BOOM;
  // tapered striped bar
  const x0 = 0.06;
  const bar = new THREE.BoxGeometry(1, 1, 1, 8, 1, 1);
  const p = bar.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = x0 + (p.getX(i) + 0.5) * (B.length - x0);
    p.setXYZ(i, x, p.getY(i) * heightAt(x), p.getZ(i) * thickAt(x));
  }
  bar.computeVertexNormals();
  regionUV(bar, R.boom);
  parts.push(bar);
  // slightly rounded top/bottom edges read better: thin highlight strip on top
  const strip = new THREE.BoxGeometry(B.length - 0.3, 0.012, 0.02);
  solid(strip, R.white, new THREE.Matrix4().makeTranslation(x0 + (B.length - 0.3) / 2 + 0.1, heightAt(B.length / 2) / 2 + 0.004, thickAt(B.length / 2) / 2 - 0.012));
  // mount plate between the hub and the bar
  solid(new THREE.BoxGeometry(0.62, 0.22, 0.02), R.grey, new THREE.Matrix4().makeTranslation(0.08, 0, -B.t0 / 2 - 0.012));
  for (const bx of [-0.12, 0.08, 0.28]) {
    for (const by of [-0.07, 0.07]) {
      const bolt = new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6);
      bolt.rotateX(Math.PI / 2);
      solid(bolt, R.dark, new THREE.Matrix4().makeTranslation(bx, by, B.t0 / 2 + 0.008));
    }
  }
  // counterweight arm + weight (behind the pivot)
  solid(new THREE.BoxGeometry(0.62, 0.07, 0.035), R.dark, new THREE.Matrix4().makeTranslation(-0.3, 0, -B.t0 / 2 - 0.035));
  solid(new THREE.BoxGeometry(0.2, 0.3, 0.13), R.dark, new THREE.Matrix4().makeTranslation(-0.56, -0.03, -B.t0 / 2 - 0.035));
  solid(new THREE.BoxGeometry(0.21, 0.04, 0.14), R.grey, new THREE.Matrix4().makeTranslation(-0.56, 0.13, -B.t0 / 2 - 0.035));
  // red tip cap
  solid(new THREE.BoxGeometry(0.1, B.h1 + 0.01, B.t1 + 0.01), R.red, new THREE.Matrix4().makeTranslation(B.length + 0.04, 0, 0));
  // LED housings (both faces)
  for (const x of B.lampXs) {
    for (const s of [1, -1]) {
      const g = new THREE.CylinderGeometry(0.048, 0.048, 0.026, 12);
      g.rotateX(Math.PI / 2);
      solid(g, R.black, new THREE.Matrix4().makeTranslation(x, 0, s * (thickAt(x) / 2 + 0.012)));
    }
  }
  const g = kit.ctx.geom.merge(parts);
  g.computeBoundingSphere();
  return g;
}

/** A single fringe strand: thin striped ribbon hanging from y = 0 down to y = -1. */
function strandGeometry(kit) {
  const g = new THREE.BoxGeometry(0.02, 1, 0.008);
  g.translate(0, -0.5, 0);
  regionUV(g, kit.R.fringe, { swap: true });
  return g;
}

/**
 * Build the dynamic boom meshes for the machine corners.
 * booms: [{ pivot: Vector3, ry, unit, face }]
 */
export function createBooms(kit, booms) {
  const { M } = kit;
  const group = new THREE.Group();
  group.name = 'crossing:booms';
  const boomMesh = new THREE.InstancedMesh(boomGeometry(kit), M.atlas, booms.length);
  boomMesh.name = 'crossing:boom';
  boomMesh.castShadow = true;
  boomMesh.receiveShadow = true;
  boomMesh.frustumCulled = false; // instances sweep through a large arc
  group.add(boomMesh);

  const fx = [];
  for (let x = BOOM.fringeFrom; x < BOOM.length - 0.3; x += BOOM.fringeStep) fx.push(x);
  const fringe = new THREE.InstancedMesh(strandGeometry(kit), M.atlas, fx.length * booms.length);
  fringe.name = 'crossing:fringe';
  fringe.castShadow = false;
  fringe.receiveShadow = true;
  fringe.userData.noOutline = true;
  fringe.frustumCulled = false;
  group.add(fringe);

  // scratch objects (no per-frame allocation)
  const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _y = new THREE.Matrix4(), _s = new THREE.Matrix4();
  const _v = new THREE.Vector3(), _n = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const base = booms.map((b) => new THREE.Matrix4().makeTranslation(b.pivot.x, b.pivot.y, b.pivot.z).multiply(new THREE.Matrix4().makeRotationY(b.ry)));
  const frames = booms.map(() => new THREE.Matrix4());
  const angles = booms.map(() => BOOM.upAngle);

  /** Lens placements on the booms (filled by update()): pos/normal Vector3s reused. */
  const lenses = [];
  booms.forEach((b, bi) => {
    BOOM.lampXs.forEach((x, li) => {
      for (const s of [1, -1]) lenses.push({ boom: bi, x, s, pos: new THREE.Vector3(), normal: new THREE.Vector3(), r: 0.034, depth: 0.5, group: li % 2 ? 'B' : 'A', glow: 0.45 });
    });
  });

  /**
   * Set the boom angles (0 = down / horizontal, BOOM.upAngle = raised) and
   * re-pose fringe + lens placements.  `t` / `wind` drive the fringe sway.
   */
  function pose(angleList, t, wind) {
    for (let bi = 0; bi < booms.length; bi++) {
      const a = angleList[bi];
      angles[bi] = a;
      _r.makeRotationZ(a);
      frames[bi].multiplyMatrices(base[bi], _r);
      boomMesh.setMatrixAt(bi, frames[bi]);
      // fringe strands: attach under the bar, hang plumb, shorter as the boom rises
      const gather = Math.max(0.12, Math.cos(a));
      _y.makeRotationY(booms[bi].ry);
      for (let k = 0; k < fx.length; k++) {
        const x = fx[k];
        _v.set(x, -heightAt(x) / 2, 0).applyMatrix4(frames[bi]);
        const sway = (Math.sin(t * 2.3 + k * 0.7 + bi) * 0.06 + Math.sin(t * 5.1 + k * 1.9) * 0.02) * (0.4 + wind);
        _e.set(sway * 0.5, 0, sway, 'YXZ');
        _q.setFromEuler(_e);
        _s.makeScale(1, BOOM.fringeLen * gather, 1);
        _m.makeRotationFromQuaternion(_q);
        _m.premultiply(_y);
        _m.setPosition(_v);
        _m.multiply(_s);
        fringe.setMatrixAt(bi * fx.length + k, _m);
      }
    }
    boomMesh.instanceMatrix.needsUpdate = true;
    fringe.instanceMatrix.needsUpdate = true;
    for (const L of lenses) {
      const F = frames[L.boom];
      L.pos.set(L.x, 0, L.s * (thickAt(L.x) / 2 + 0.026)).applyMatrix4(F);
      _n.set(0, 0, L.s).transformDirection(F);
      L.normal.copy(_n);
    }
  }
  pose(angles, 0, 0.5);
  return { group, pose, lenses, angles };
}
