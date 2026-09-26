/**
 * サイクル 風見 — a neighbourhood bicycle shop.  Wide open workshop front
 * with a half-raised roll-up shutter, blue-grey siding upstairs, tin sign,
 * free air pump by the door.  Bicycles for sale lined up on the apron with
 * price tags; inside: tyres hanging on the wall, tool pegboard, a bike on a
 * repair stand, workbench, parts shelves.
 */
import * as THREE from 'three';
import { shopHouse, room } from './shell.js';
import { bicycle, pendant, ceilingLight, poster, shelf, crate } from './parts.js';

export function buildBicycle(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.08;
  const Z = D / 2;
  const hs = shopHouse(S, {
    W, D, F, H1: 3.2, H2: 2.7, floors: 2,
    wall1: { kind: 'plaster', color: '#e8e8e2' }, wall2: { kind: 'rows', color: '#b9cddd' }, sides: { kind: 'plaster', color: '#e2e2dc' },
    base: '#a9a59e',
    open: { x0: -3.55, x1: 3.3, y1: 2.55 },
    win2: [{ x: -2.3, w: 1.6, h: 1.1, y: 1.4, shutterBox: true }, { x: 2.0, w: 1.2, h: 1.0, y: 1.45, rail: true }],
    sideWin: [{ side: 1, z: 0.5, w: 1.0, h: 0.9, y: 4.6 }, { side: -1, z: -2.0, w: 1.0, h: 0.9, y: 4.6 }],
    roof: { type: 'gable', color: '#4f6b5e', rise: 1.4, overZ: 0.55 },
    bandColor: '#8a9aa8',
  });

  // --- roll-up shutter, raised to just below the head (box + bottom slats)
  const zf = Z - 0.05;
  B.box('solid', -3.6, F + 2.55, zf - 0.1, 3.35, F + 2.95, zf + 0.22, '#c9ccd0');
  B.box('rows', -3.55, F + 2.3, zf + 0.02, 3.3, F + 2.55, zf + 0.06, '#b8bcc0');
  B.box('solid', -3.55, F + 2.27, zf, 3.3, F + 2.32, zf + 0.08, '#8e949a');
  for (const x of [-3.55, 3.3]) B.box('solid', x - 0.05, F, zf - 0.02, x + 0.05, F + 2.55, zf + 0.1, '#9aa1a8');
  // --- sign on the fascia
  const sy = F + 3.3;
  B.box('solid', -3.1, sy - 0.32, Z, 3.1, sy + 0.32, Z + 0.1, '#e6e8e4');
  B.box('solid', -3.1, sy - 0.32, Z + 0.1, -1.5, sy + 0.32, Z + 0.11, '#3f7fc8');
  B.box('solid', 1.5, sy - 0.32, Z + 0.1, 3.1, sy + 0.32, Z + 0.11, '#3f7fc8');
  B.quad('solid', 0, sy, Z + 0.112, 3.0, 0.6, '#ffffff', A.get('ySign'));
  // tin sign on the right pier
  B.box('solid', 3.36, F + 1.2, Z, 3.98, F + 1.51, Z + 0.02, '#ffffff', { rect: A.get('yTin'), face: 'Z' });
  // side wall tin sign (seen from the hero view)
  B.pushT(-W / 2, 0, 1.5, -Math.PI / 2);
  B.box('solid', -0.5, F + 1.9, 0, 0.5, F + 2.4, 0.03, '#ffffff', { rect: A.get('yTin'), face: 'Z' });
  B.pop();

  // --- apron: bicycles for sale, air pump, a kid's bike
  const bikes = [[-2.8, '#e8f0f4'], [-1.9, '#f2a3b8'], [-1.0, '#6fa0c8'], [1.9, '#9fc88a']];
  bikes.forEach(([bx, col], i) => {
    const bz = Z + 0.72;
    bicycle(S, bx, S.gy(bx, bz), bz, Math.PI / 2 - 0.35, col, { basket: i !== 3 });
    B.quad('solid', bx + 0.12, S.gy(bx, bz) + 0.95, bz + 0.22, 0.2, 0.1, '#ffffff', A.get('yPrice'), { ry: 0.3 });
  });
  // floor pump + sign
  const px = 2.9, pz = Z + 0.35, py = S.gy(px, pz);
  B.box('solid', px - 0.12, py, pz - 0.05, px + 0.12, py + 0.03, pz + 0.05, '#3a3a40');
  B.cyl('solid', px, py, pz, 0.04, 0.62, '#d8433d', { seg: 8 });
  B.box('solid', px - 0.15, py + 0.62, pz - 0.015, px + 0.15, py + 0.65, pz + 0.015, '#3a3a40');
  B.tube('deco', [[px, py + 0.1, pz + 0.04], [px + 0.15, py + 0.05, pz + 0.12], [px + 0.2, py + 0.3, pz + 0.1]], 0.008, '#2a2a2a');
  B.box('solid', px - 0.2, py + 0.9, pz - 0.28, px + 0.2, py + 1.2, pz - 0.26, '#fff', { rect: A.get('yPump'), face: 'Z' });
  B.box('solid', px - 0.015, py, pz - 0.3, px + 0.015, py + 0.9, pz - 0.27, '#8e949a');

  interior(S, F, Z);
  return hs;
}

function interior(S, F, Z) {
  const { B, A } = S;
  const zb = Z - 6.0, zf = Z - 0.2, ceil = F + 2.7;
  room(S, -3.8, 3.8, zb, zf, F, ceil, { floor: '#9a9a96', wall: '#e8e4da', back: '#d8d0c0', skirt: '#6a6a6a' });
  // pegboard with tools on the back wall + workbench
  B.quad('inner', -1.2, F + 1.6, zb + 0.02, 2.4, 1.2, '#ffffff', A.get('yTools'));
  B.box('inner', -2.6, F, zb + 0.05, 0.2, F + 0.85, zb + 0.7, '#8a6446');
  B.box('inner', -2.65, F + 0.85, zb, 0.25, F + 0.9, zb + 0.75, '#a8845c');
  B.box('inner', -2.3, F + 0.9, zb + 0.2, -1.9, F + 1.05, zb + 0.45, '#d8433d'); // tool box
  B.box('inner', -0.8, F + 0.9, zb + 0.3, -0.5, F + 0.95, zb + 0.5, '#555b62');
  // tyres hanging on the right wall
  for (let i = 0; i < 6; i++) {
    const tz = zb + 0.8 + i * 0.55;
    const tyre = B._cached('tyre', () => new THREE.TorusGeometry(0.3, 0.05, 6, 16));
    B.geo('inner', tyre, '#2e2e32', { m: new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(3.62, F + 1.9 - (i % 2) * 0.1, tz) });
  }
  B.box('inner', 3.7, F + 2.2, zb + 0.6, 3.8, F + 2.25, zb + 4.0, '#8e949a');
  // parts shelf on the left wall + boxes
  B.pushT(-3.8, F, zb + 2.6, Math.PI / 2);
  shelf(S, 0, 0, 0, 2.0, 2.0, 0.4, A.get('kShelf0'), { color: '#9aa1a8', base: '#8e949a' });
  B.pop();
  crate(S, -3.2, F, Z - 1.2, 0.5, 0.3, 0.36, '#3f7fc8');
  // a bike upside-down style on a repair stand
  B.box('inner', 0.95, F, zb + 2.0, 1.05, F + 1.0, zb + 2.1, '#3a3a40');
  B.box('inner', 0.7, F, zb + 1.8, 1.3, F + 0.04, zb + 2.3, '#3a3a40');
  bicycle(S, 1.0, F + 0.35, zb + 2.3, Math.PI / 2, '#f2c230', { kind: 'inner', basket: false });
  // bikes in the back
  bicycle(S, -1.5, F, Z - 2.4, Math.PI / 2 + 0.2, '#e8483f', { kind: 'inner' });
  bicycle(S, 1.8, F, Z - 2.0, Math.PI / 2 - 0.2, '#f4f4f0', { kind: 'inner' });
  poster(S, 2.6, F + 1.6, zb + 0.02, 0.5, 0.7, A.get('newitem'));
  ceilingLight(S, -1.5, ceil, Z - 2.5, 1.8, 0.14, '#f8f8f0');
  ceilingLight(S, 1.5, ceil, Z - 4.0, 1.8, 0.14, '#f8f8f0');
  pendant(S, -1.2, ceil, zb + 0.6, 0.5, { style: 'cone', shade: '#555b62' });
}

