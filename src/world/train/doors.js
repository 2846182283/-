/**
 * Sliding passenger door leaf (両開き扉, one of two leaves), built once and
 * drawn with InstancedMeshes: painted leaf (cream / sakura stripe / black
 * rubber edges), its window glass and the "ドアにご注意" sticker.
 * Leaf-local: centred on x = 0, bottom at the floor, outer face +Z.
 * The leaf is symmetric in X so left and right leaves share the geometry.
 */
import * as THREE from 'three';
import { D } from './dims.js';
import { COL } from './shell.js';
import { roundRectPath, extrude, atlasPlane } from './parts.js';

export const LEAF = { w: 0.7, h: D.doorTop + 0.04 - D.floorY, t: 0.03, slide: 0.66 };

export function leafGeometries(Parts, atlas) {
  const P = new Parts();
  const hw = LEAF.w / 2;
  const y0 = D.floorY, y1 = D.floorY + LEAF.h;
  const win = [-0.2, 2.46, 0.2, 3.26];
  const band = (a, b, col, hole) => {
    const s = new THREE.Shape();
    s.moveTo(-hw, a); s.lineTo(hw, a); s.lineTo(hw, b); s.lineTo(-hw, b); s.closePath();
    if (hole) s.holes.push(roundRectPath(new THREE.Path(), win[0], win[1], win[2], win[3], 0.07));
    const g = extrude(s, LEAF.t, 2);
    g.translate(0, 0, -LEAF.t / 2);
    P.add('body', g, col);
  };
  band(y0, D.stripe[0], COL.cream);
  band(D.stripe[0], D.stripe[1], COL.pink);
  band(D.stripe[1], y1, COL.cream, true);
  // window gasket
  const ring = new THREE.Shape(roundRectPath(new THREE.Path(), win[0], win[1], win[2], win[3], 0.07).getPoints(2));
  ring.holes.push(roundRectPath(new THREE.Path(), win[0] + 0.025, win[1] + 0.025, win[2] - 0.025, win[3] - 0.025, 0.05));
  const gr = extrude(ring, LEAF.t + 0.006, 2);
  gr.translate(0, 0, -LEAF.t / 2 - 0.003);
  P.add('body', gr, '#43464d');
  // rubber seals on both vertical edges + a thin kick plate
  for (const s of [1, -1]) P.box('body', 0.024, LEAF.h, LEAF.t + 0.01, s * (hw - 0.012), (y0 + y1) / 2, 0, COL.darker);
  P.box('body', LEAF.w - 0.06, 0.06, LEAF.t + 0.004, 0, y0 + 0.05, 0, '#b8bdc4');
  // glass & sticker
  const gl = new THREE.PlaneGeometry(win[2] - win[0] - 0.03, win[3] - win[1] - 0.03);
  gl.translate(0, (win[1] + win[3]) / 2, 0);
  P.add('glass', gl);
  const st = atlasPlane(0.2, 0.117, atlas.r.doorCaution);
  st.translate(0, win[1] + 0.13, 0.004);
  P.add('decal', st);
  return { body: P.merged('body'), glass: P.merged('glass'), decal: P.merged('decal') };
}
