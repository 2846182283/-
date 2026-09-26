/**
 * In-station level crossing (構内踏切) at STATION.internalCrossingX, linking
 * the west landings of P1 and P2 across both tracks: rubber panels at rail-top
 * height with flangeway gaps, a concrete walkway between the tracks, yellow
 * edge lines and とまれ marks, warning-lamp posts (flash while a train
 * approaches or moves over the crossing), chain gates (unhooked = open) and
 * the "この踏切は駅構内の通路です" notice.
 */
import * as THREE from 'three';
import { RAIL, STATION, PLATFORM } from '../../core/layout.js';
import { PLAT } from './platforms.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildInStationCrossing(kit, S, parent) {
  const { M, ctx } = kit;
  const X = STATION.internalCrossingX;
  const x0 = PLAT.xLandW + 0.12, x1 = PLAT.xLandE;
  const yT = RAIL.railTop, yB = RAIL.sleeperTop;
  const zP1 = PLATFORM.P1.zTrack, zP2 = PLATFORM.P2.zTrack;
  const halfG = 0.5665; // rail centre offset from the track centre
  const gap = 0.075;

  // --- deck panels: split around every rail head ---
  const rails = [];
  for (const t of RAIL.tracks) rails.push(t.z + halfG, t.z - halfG);
  rails.sort((a, b) => b - a); // from P1 (larger z) toward P2
  const cuts = [zP1];
  for (const r of rails) cuts.push(r + gap, r - gap);
  cuts.push(zP2);
  const midA = RAIL.tracks[0].z - halfG - 0.7, midB = RAIL.tracks[1].z + halfG + 0.7;
  for (let i = 0; i < cuts.length; i += 2) {
    const za = cuts[i], zb = cuts[i + 1];
    if (za - zb < 0.05) continue;
    const between = za < RAIL.tracks[0].z - halfG && zb > RAIL.tracks[1].z + halfG;
    if (between) {
      // outer rubber panels + concrete walkway on a plinth between the tracks
      kit.bx(parent, M.vc, '#55565b', x0, x1, yB, yT, midA, za);
      kit.bx(parent, M.vc, '#55565b', x0, x1, yB, yT, zb, midB);
      kit.bx(parent, M.platform, '#d9d7d1', x0, x1, 0, yT, midB, midA, { uv: [6, 6] });
      kit.bx(parent, M.paint, '#f2c230', x0 + 0.02, x0 + 0.1, yT, yT + 0.002, midB, midA, { noOutline: true, cast: false });
      kit.bx(parent, M.paint, '#f2c230', x1 - 0.1, x1 - 0.02, yT, yT + 0.002, midB, midA, { noOutline: true, cast: false });
    } else {
      kit.bx(parent, M.vc, '#55565b', x0, x1, yB, yT, zb, za);
      // anti-slip ribs (painted lighter strips across the panel)
      for (let z = zb + 0.08; z < za - 0.05; z += 0.16) kit.bx(parent, M.paint, '#6b6c72', x0 + 0.05, x1 - 0.05, yT, yT + 0.002, z, z + 0.05, { noOutline: true, cast: false });
      kit.bx(parent, M.paint, '#f2c230', x0 + 0.02, x0 + 0.1, yT, yT + 0.002, zb, za, { noOutline: true, cast: false });
      kit.bx(parent, M.paint, '#f2c230', x1 - 0.1, x1 - 0.02, yT, yT + 0.002, zb, za, { noOutline: true, cast: false });
    }
  }
  // とまれ on both landings (text top points toward the tracks)
  kit.decal(parent, S.tomare, 1.1, 0.44, X, yT + 0.004, zP1 + 0.95, 0, { rx: -Math.PI / 2, mat: kit.matFor(S.tomare, 'floor') });
  kit.decal(parent, S.tomare, 1.1, 0.44, X, yT + 0.004, zP2 - 0.95, Math.PI, { rx: -Math.PI / 2, mat: kit.matFor(S.tomare, 'floor') });
  // stop lines
  kit.bx(parent, M.paint, '#f7f6f1', x0, x1, yT, yT + 0.003, zP1 + 0.5, zP1 + 0.62, { noOutline: true, cast: false });
  kit.bx(parent, M.paint, '#f7f6f1', x0, x1, yT, yT + 0.003, zP2 - 0.62, zP2 - 0.5, { noOutline: true, cast: false });

  // --- warning lamp posts + chain gates on each landing ---
  const lampGeoA = [], lampGeoB = [];
  const post = (z, s) => {
    // s: +1 on P1 (tracks toward -z), -1 on P2
    const px = x0 + 0.02, pz = z + s * 0.25;
    kit.cyl(parent, M.metal, '#f2f1ec', 0.05, 0.05, 2.4, px, yT, pz, 10);
    for (let i = 0; i < 6; i++) kit.cyl(parent, M.vc, i % 2 ? '#26262a' : '#f2c230', 0.052, 0.052, 0.12, px, yT + 0.35 + i * 0.12, pz, 10, { noOutline: true });
    // lamp head (two lamps facing the approaching pedestrians)
    const g = new THREE.Group();
    g.position.set(px, yT + 2.05, pz);
    g.rotation.y = s > 0 ? 0 : Math.PI;
    parent.add(g);
    kit.bx(g, M.metal, '#26262a', -0.34, 0.34, -0.12, 0.12, -0.04, 0.04);
    for (const lx of [-0.2, 0.2]) {
      const cyl = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16);
      cyl.rotateX(Math.PI / 2);
      cyl.translate(lx, 0, 0.07);
      kit.add(g, cyl, M.metal, '#26262a');
      // visor
      const vis = new THREE.CylinderGeometry(0.115, 0.115, 0.1, 16, 1, true, -Math.PI / 2, Math.PI);
      vis.rotateX(Math.PI / 2);
      vis.translate(lx, 0, 0.14);
      kit.add(g, vis, M.metal, '#26262a', { noOutline: true });
      const lens = new THREE.CircleGeometry(0.075, 16);
      lens.translate(lx, 0, 0.101);
      g.updateMatrixWorld(true);
      lens.applyMatrix4(g.matrixWorld);
      (lx < 0 ? lampGeoA : lampGeoB).push(lens);
    }
    // X-shaped crossing mark + small bell box
    const xm = new THREE.Group();
    xm.position.set(px, yT + 2.55, pz);
    xm.rotation.y = s > 0 ? 0 : Math.PI;
    parent.add(xm);
    for (const r of [0.6, -0.6]) kit.box(xm, M.vc, '#f2c230', 0.62, 0.09, 0.02, 0, 0, 0.0, { rz: r });
    for (const r of [0.6, -0.6]) kit.box(xm, M.vc, '#26262a', 0.2, 0.092, 0.022, 0, 0, 0.0, { rz: r, noOutline: true });
    kit.cyl(parent, M.metal, '#26262a', 0.09, 0.09, 0.12, px, yT + 1.72, pz, 12);
    // chain gate: second post across the path, chain unhooked and hanging from the first post
    const qx = x1 - 0.08;
    kit.cyl(parent, M.vc, '#f2c230', 0.035, 0.035, 0.85, qx, yT, pz, 8);
    kit.cyl(parent, M.vc, '#26262a', 0.036, 0.036, 0.12, qx, yT + 0.6, pz, 8, { noOutline: true });
    const top = V(px + 0.05, yT + 0.8, pz);
    const low = V(px + 0.07, yT + 0.25, pz - s * 0.02);
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const p = new THREE.Vector3().lerpVectors(top, low, t);
      p.x += Math.sin(t * Math.PI) * 0.22;
      pts.push(p);
    }
    for (let i = 0; i < pts.length - 1; i++) kit.tube(parent, M.vc, i % 2 ? '#26262a' : '#f2c230', [pts[i], pts[i + 1]], 0.018, 5);
    // notice board on the end fence, facing the landing
    const nz = s > 0 ? PLATFORM.P1.zBack + (zP1 - PLATFORM.P1.zBack) * 0.72 : PLATFORM.P2.zBack + (zP2 - PLATFORM.P2.zBack) * 0.72;
    const b = new THREE.Group();
    b.position.set(PLAT.xLandW + 0.14, yT + 1.25, nz);
    b.rotation.y = Math.PI / 2;
    parent.add(b);
    kit.board(b, S.crossNotice, 1.05, 0.64, 0, 0, 0, 0, { thick: 0.025, frameColor: '#ffffff' });
  };
  post(zP1 - 0.1, 1);
  post(zP2 + 0.1, -1);

  // --- dynamic flashing lamps (not baked) ---
  const matA = ctx.toon.unlit('#3a1512', { name: 'st_xlampA' });
  const matB = ctx.toon.unlit('#3a1512', { name: 'st_xlampB' });
  const dynamic = new THREE.Group();
  dynamic.name = 'station:xcrossingLamps';
  for (const [geos, mat] of [[lampGeoA, matA], [lampGeoB, matB]]) {
    const m = new THREE.Mesh(ctx.geom.merge(geos), mat);
    m.userData.noOutline = true;
    m.castShadow = false;
    dynamic.add(m);
  }
  const on = new THREE.Color('#ff3b2e'), off = new THREE.Color('#3a1512');
  let active = false;
  function trainNear() {
    for (const tr of ctx.sim.trains || []) {
      if (!tr || typeof tr.x !== 'number') continue;
      const dir = tr.dir || 1, len = tr.length || 55;
      const tail = tr.x - dir * len;
      const moving = (tr.speed || 0) > 0.3;
      if (moving && X > Math.min(tr.x, tail) - 3 && X < Math.max(tr.x, tail) + 3) return true;
      const ahead = (X - tr.x) * dir;
      if (moving && ahead > 0 && ahead < 140) return true;
    }
    return false;
  }
  function update(dt, t) {
    active = trainNear();
    const ph = active ? Math.floor(t * 2) % 2 : -1;
    matA.color.copy(ph === 0 ? on : off);
    matB.color.copy(ph === 1 ? on : off);
  }
  update(0, 0);
  return { dynamic, update, get active() { return active; } };
}
