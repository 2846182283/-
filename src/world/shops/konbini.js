/**
 * はるマート — the corner convenience store.
 *
 * White / light-grey box, full-height glass front with an automatic double
 * door (slides open when the viewer walks up), a lit horizontal sign band
 * (green / orange / blue stripes + original blossom logo) that wraps round
 * both corners, a tall pole sign at the forecourt corner.  Bright interior:
 * magazine rack along the window, gondola shelves, glowing drinks fridges,
 * chilled bento case, counter with registers, hot-snack case and coffee
 * machine, ATM.  Outside: sorted trash bins, umbrella stand, entrance canopy
 * with downlights, gachapon machines at SPOTS.gachapon.  The vending machines
 * in the forecourt (SPOTS V3/V4) belong to props.js; this module keeps clear.
 */
import * as THREE from 'three';
import { Batcher } from './batch.js';
import { room } from './shell.js';
import { gondola, shelf, ceilingLight, gachapon, poster, acUnit, downpipe, C } from './parts.js';

const WHITE = '#f3f4f1';
const SIDE = '#e6e8e6';
const STRIPES = [['#3aa37a', 0.19, 0.29], ['#f29a3a', 0.115, 0.19], ['#3b7fd1', 0.04, 0.115]];

export function buildKonbini(S) {
  const { B, A, W, D } = S;
  const Z = D / 2;
  const F = S.gy(0, Z + 0.45) + 0.012; // flush with the forecourt at the door (barrier free)
  const H = 4.35, band0 = F + 2.8, band1 = F + 3.85;

  // --- shell -----------------------------------------------------------------
  const yBot = Math.min(S.minGround - 0.25, F - 0.3);
  B.box('solid', -W / 2 - 0.03, yBot, -D / 2 - 0.03, W / 2 + 0.03, F, D / 2 + 0.03, C.concrete, { skip: 'y' });
  // side + back walls (metal panel siding), full height
  B.box('rows', -W / 2, F, -D / 2, -W / 2 + 0.2, F + H, Z - 0.02, SIDE, { grad: 0.9 });
  B.box('rows', W / 2 - 0.2, F, -D / 2, W / 2, F + H, Z - 0.02, SIDE, { grad: 0.9 });
  B.box('rows', -W / 2 + 0.2, F, -D / 2, W / 2 - 0.2, F + H, -D / 2 + 0.2, SIDE, { grad: 0.9 });
  // front: corner piers, fascia block, parapet
  for (const sx of [-1, 1]) B.box('solid', sx > 0 ? W / 2 - 0.25 : -W / 2, F, Z - 0.3, sx > 0 ? W / 2 : -W / 2 + 0.25, band0, Z, WHITE);
  B.box('solid', -W / 2, band0 - 0.08, Z - 0.35, W / 2, H + F, Z, WHITE);
  B.box('solid', -W / 2 - 0.04, F + H, -D / 2 - 0.04, W / 2 + 0.04, F + H + 0.06, D / 2 + 0.04, '#d8dad8');
  B.box('solid', -W / 2 + 0.2, F + H - 0.3, -D / 2 + 0.2, W / 2 - 0.2, F + H - 0.1, D / 2 - 0.35, '#b9b8b2'); // roof slab
  roofTop(S, F + H - 0.1);
  S.addCollider(-W / 2 - 0.05, W / 2 + 0.05, -D / 2 - 0.05, D / 2 + 0.05);

  signBand(S, F, band0, band1);
  glassFront(S, F, Z, band0);
  interior(S, F, Z);
  doors(S, F, Z);
  exterior(S, F, Z, band0);
  sides(S, F, Z, H, band0, band1);
  poleSign(S, Z);

  // gachapon at the reserved spot (convert the world spot into lot-local space)
  const g = S.ctx.layout.SPOTS.gachapon;
  const inv = new THREE.Matrix4().copy(S.matrix).invert();
  const p = new THREE.Vector3(g.x, 0, g.z).applyMatrix4(inv);
  const gy = S.gy(p.x, p.z);
  B.box('solid', p.x - 0.72, gy, p.z - 0.26, p.x + 0.72, gy + 0.12, p.z + 0.24, '#b9bcc0');
  const caps = [['#f7b6c8', '#fbf2e6', '#8fc9e8', '#f4d27a'], ['#8fc9e8', '#f5f1e6', '#ef8fae'], ['#f4d27a', '#e86a5a', '#9fd49a', '#fbf2e6']];
  for (let i = 0; i < 3; i++) gachapon(S, p.x - 0.45 + i * 0.45, gy + 0.12, p.z, 0, A.cell('kGacha', i, 3, 1), caps[i]);
  return { F };
}

/** Lit sign band: white fascia, stripes, logo panel, 24H + ATM squares. */
function signBand(S, F, y0, y1) {
  const { B, A, W, D } = S;
  const Z = D / 2;
  const zf = Z + 0.08;
  B.box('solid', -W / 2 - 0.05, y0 - 0.05, Z - 0.02, W / 2 + 0.05, y1 + 0.05, zf, '#dfe2e0');
  B.quad('lit', 0, (y0 + y1) / 2, zf + 0.002, W - 0.1, y1 - y0, '#f2f4f2');
  for (const [col, a, b] of STRIPES) B.quad('lit', 0, y0 + (a + b) / 2 * (y1 - y0), zf + 0.004, W - 0.1, (b - a) * (y1 - y0), col);
  const h = y1 - y0, w = h * 6.4;
  B.quad('lit', 0, (y0 + y1) / 2, zf + 0.006, w, h, '#f4f4f2', A.get('kSign'));
  B.quad('lit', -W / 2 + 0.75, y0 + 0.62 * h, zf + 0.006, 0.62, 0.62, '#f4f4f2', A.get('k24'));
  B.quad('lit', W / 2 - 0.75, y0 + 0.62 * h, zf + 0.006, 0.62, 0.62, '#f4f4f2', A.get('kAtm'));
}

/** Aluminium storefront: mullions, rails, glass, posters (door opening x -1.1..1.1). */
function glassFront(S, F, Z, band0) {
  const { B, A, W } = S;
  const zf = Z - 0.12;
  const top = band0 - 0.08;
  const posts = [-W / 2 + 0.25, -5.3, -3.2, -1.1, 1.1, 3.2, 5.3, W / 2 - 0.25];
  for (const x of posts) B.box('solid', x - 0.05, F, zf - 0.06, x + 0.05, top, zf + 0.06, C.alu);
  B.box('solid', -W / 2 + 0.25, top - 0.08, zf - 0.06, W / 2 - 0.25, top, zf + 0.06, C.alu);
  B.box('solid', -W / 2 + 0.25, F + 2.3, zf - 0.05, W / 2 - 0.25, F + 2.36, zf + 0.05, C.alu);
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    if (a === -1.1) continue; // door bay handled by doors()
    B.box('solid', a, F, zf - 0.05, b, F + 0.22, zf + 0.05, '#b9bcc0');
    B.quad('glass', (a + b) / 2, (F + 0.22 + F + 2.3) / 2, zf, b - a - 0.1, 2.08, '#fff');
  }
  // transom glass (full width) + automatic-door sticker over the door
  B.quad('glass', 0, (F + 2.36 + top - 0.08) / 2, zf, W - 0.6, top - 0.08 - F - 2.36, '#fff');
  poster(S, 0, F + 2.2, zf + 0.02, 0.9, 0.22, A.sub('kDoor', 0, 0, 0.47, 1));
  poster(S, 0.0, F + 2.55, zf + 0.004, 1.0, 0.25, A.sub('kDoor', 0.51, 0, 0.49, 1));
  // posters on the glass (the classic konbini window collage)
  const ps = [['kPostDrink', -6.4], ['kPostSpring', -5.9], ['kPostBento', -4.6], ['kPostIce', -4.1], ['newitem', -2.4], ['season', 2.4], ['kPostDrink', 4.2], ['kPostIce', 6.4]];
  for (const [name, x] of ps) poster(S, x, F + 0.6, zf, 0.4, 0.6, A.get(name));
  poster(S, -1.55, F + 1.35, zf, 0.3, 0.38, A.get('hours'));
  poster(S, 1.55, F + 1.2, zf, 0.4, 0.13, A.get('pay'));
  poster(S, 1.55, F + 1.5, zf, 0.3, 0.3, A.get('kAtm'));
  poster(S, -1.55, F + 0.95, zf, 0.16, 0.16, A.cell('mascot', 0, 2, 2));
  // door threshold (stainless) + mat outside
  B.box('solid', -1.15, F - 0.01, zf - 0.1, 1.15, F + 0.008, zf + 0.12, '#c9ccd0');
  B.box('deco', -1.0, F - 0.004, zf + 0.12, 1.0, F + 0.012, zf + 0.9, '#5a6068');
}

/** Automatic sliding doors: two dynamic leaves that open when the viewer approaches. */
function doors(S, F, Z) {
  const zf = Z - 0.12;
  const group = new THREE.Group();
  group.name = 'konbini-doors';
  const kinds = { solid: { uv: 'atlas' }, glass: { uv: 'atlas' } };
  const leaves = [];
  for (const side of [-1, 1]) {
    const LB = new Batcher(kinds, S.A.whiteUV);
    LB.setBase(new THREE.Matrix4());
    const w = 1.1, h = 2.3;
    // leaf built around its closed position centre x = side * w/2
    const bar = 0.06;
    LB.box('solid', -w / 2, 0, -0.025, w / 2, bar, 0.025, C.alu);
    LB.box('solid', -w / 2, h - bar, -0.025, w / 2, h, 0.025, C.alu);
    LB.box('solid', -w / 2, bar, -0.025, -w / 2 + bar, h - bar, 0.025, C.alu);
    LB.box('solid', w / 2 - bar, bar, -0.025, w / 2, h - bar, 0.025, C.alu);
    LB.quad('glass', 0, h / 2, 0, w - bar * 2, h - bar * 2, '#fff');
    const leaf = new THREE.Group();
    for (const m of LB.finish(S.mats)) { m.matrixAutoUpdate = true; leaf.add(m); }
    leaf.position.set(side * w / 2, F, zf - 0.07);
    group.add(leaf);
    leaves.push({ leaf, side, x0: side * w / 2 });
  }
  const doorWorld = new THREE.Vector3(0, F + 1.2, Z + 0.8).applyMatrix4(S.matrix);
  let open = 0, first = true;
  S.addDynamic(group, (cam, dt) => {
    const d = Math.hypot(cam.x - doorWorld.x, cam.z - doorWorld.z);
    const target = d < 3.4 && Math.abs(cam.y - doorWorld.y) < 3 ? 1 : 0;
    const k = first ? 1 : Math.min(1, dt * 2.2); // snap on the first frame (shots, teleports)
    first = false;
    const prev = open;
    open += Math.sign(target - open) * Math.min(Math.abs(target - open), k);
    if (open === prev) return;
    const e = open * open * (3 - 2 * open);
    for (const l of leaves) l.leaf.position.x = l.x0 + l.side * e * 1.02;
  });
}

function interior(S, F, Z) {
  const { B, A, W, D } = S;
  const zb = -D / 2 + 0.2, zf = Z - 0.2, ceil = F + 2.95;
  room(S, -W / 2 + 0.25, W / 2 - 0.25, zb, zf, F, ceil, { floor: '#d6d6d0', wall: '#e2e2de', back: '#dcdcd8', ceil: '#e6e6e2', skirt: '#b0b0aa' });
  // fridges along the back wall (glowing doors)
  B.box('inner', -7.2, F, zb, 3.0, F + 2.2, zb + 0.75, '#e2e6ea');
  for (let i = 0; i < 4; i++) B.quad('lit', -6.0 + i * 2.55, F + 1.05, zb + 0.76, 2.5, 1.95, '#ffffff', A.get('kFridge'));
  B.quad('lit', -2.1, F + 2.35, zb + 0.4, 10, 0.25, '#ffffff', A.sub('kSign', 0.1, 0.1, 0.8, 0.5));
  // chilled bento case on the left wall (open front, lit)
  B.pushT(-W / 2 + 0.25, F, -2.0, Math.PI / 2);
  B.box('inner', -2.4, 0, 0, 2.4, 1.9, 0.7, '#e2e6ea', { skip: 'Z' });
  B.quad('lit', 0, 1.0, 0.45, 4.6, 1.2, '#ffffff', A.get('kBento'));
  B.box('inner', -2.4, 0, 0.5, 2.4, 0.7, 0.75, '#dfe4e8');
  B.pop();
  // gondola shelves (perpendicular to the front)
  gondola(S, -4.9, F, -0.4, 6.0, 1.45, A.get('kShelf0'), A.get('kShelf1'), { endRect: A.get('kPostSpring') });
  gondola(S, -2.6, F, -0.4, 6.0, 1.45, A.get('kShelf2'), A.get('kShelf0'), { endRect: A.get('kPostIce') });
  gondola(S, 1.9, F, -1.0, 4.8, 1.45, A.get('kShelf1'), A.get('kShelf2'), { endRect: A.get('newitem') });
  // magazine rack along the left window (faces into the shop; its back shows through the glass)
  B.box('inner', -7.1, F, Z - 0.75, -1.6, F + 1.15, Z - 0.4, '#dcdcd8', { rects: { Z: A.get('kMag'), z: A.get('kMag') } });
  // counter (along z, right side) with registers, hot snacks, coffee machine
  const cx = 4.6;
  B.box('inner', cx - 0.35, F, -3.0, cx + 0.35, F + 1.0, 3.6, '#f0f0ec', { colors: { x: '#e8e8e2' } });
  B.box('inner', cx - 0.42, F + 1.0, -3.05, cx + 0.42, F + 1.04, 3.65, '#c8b89a');
  for (const rz of [2.8, 0.6]) {
    B.box('inner', cx - 0.15, F + 1.04, rz - 0.18, cx + 0.15, F + 1.22, rz + 0.18, '#3a3a40');
    B.box('lit', cx - 0.16, F + 1.25, rz - 0.14, cx - 0.14, F + 1.45, rz + 0.14, '#9ad0f0');
    B.box('inner', cx - 0.14, F + 1.22, rz - 0.15, cx - 0.1, F + 1.47, rz + 0.15, '#2a2a2e');
  }
  B.box('inner', cx - 0.3, F + 1.04, 1.4, cx + 0.3, F + 1.55, 2.1, '#d8dcdc');
  B.quad('lit', cx - 0.305, F + 1.3, 1.75, 0.66, 0.4, '#ffffff', A.get('kHot'), { ry: -Math.PI / 2 });
  // back shelf behind the counter
  B.pushT(W / 2 - 0.25, F, 0.3, -Math.PI / 2);
  shelf(S, 0, 0, 0, 5.6, 2.1, 0.45, A.get('kShelf1'), { color: '#e8e8e4', topper: A.get('kSide'), topperKind: 'lit' });
  B.pop();
  // coffee machine by the window (self service)
  B.box('inner', 3.3, F, Z - 1.1, 4.2, F + 0.9, Z - 0.5, '#e8e8e4');
  B.box('inner', 3.45, F + 0.9, Z - 1.0, 4.05, F + 1.75, Z - 0.55, '#2a2a2e');
  B.quad('lit', 3.75, F + 1.35, Z - 0.545, 0.55, 0.55, '#ffffff', A.get('kCoffee'));
  // ATM near the door (faces the aisle)
  B.box('inner', 2.35, F, Z - 1.0, 3.05, F + 1.55, Z - 0.35, '#e8ecf0', { colors: { x: '#dfe4ea' } });
  B.box('lit', 2.3, F + 1.55, Z - 0.95, 3.1, F + 1.85, Z - 0.4, '#ffffff', { rects: { Z: A.get('kAtm'), x: A.get('kAtm') } });
  // ceiling light rows
  for (const lx of [-5.8, -3.6, -1.4, 0.8, 3.0, 5.6]) ceilingLight(S, lx, ceil, -0.4, 0.3, 9.4, '#fff6e2');
}

function exterior(S, F, Z, band0) {
  const { B, A } = S;
  // entrance canopy with downlights
  const cy = band0 - 0.12;
  B.box('solid', -1.8, cy - 0.14, Z, 1.8, cy, Z + 1.1, '#f0f0ee', { colors: { y: '#e4e4e2' } });
  for (const lx of [-1.0, 0, 1.0]) B.cyl('lit', lx, cy - 0.145, Z + 0.6, 0.08, 0.005, '#fff6dc', { seg: 10 });
  // sorted trash-bin station (left of the door; vending machines are further left)
  const tx = -3.6, tz = Z + 0.3, ty = S.gy(tx, tz);
  B.box('solid', tx - 1.0, ty, tz - 0.27, tx + 1.0, ty + 1.02, tz + 0.27, '#c9ccd0');
  B.box('solid', tx - 1.04, ty + 1.02, tz - 0.3, tx + 1.04, ty + 1.07, tz + 0.3, '#b0b4b8');
  B.quad('solid', tx, ty + 0.9, tz + 0.275, 1.96, 0.24, '#ffffff', A.get('kTrash'));
  for (let i = 0; i < 4; i++) {
    const bx = tx - 0.75 + i * 0.5;
    B.box('deco', bx - 0.14, ty + 0.62, tz + 0.27, bx + 0.14, ty + 0.72, tz + 0.28, '#2a2a2e');
    B.box('deco', bx - 0.2, ty + 0.05, tz + 0.27, bx + 0.2, ty + 0.55, tz + 0.278, '#b8bcc0');
  }
  // umbrella stand (right of the door)
  const ux = 1.75, uz = Z + 0.3, uy = S.gy(ux, uz);
  B.box('solid', ux - 0.3, uy, uz - 0.14, ux + 0.3, uy + 0.05, uz + 0.14, '#8e949a');
  B.box('solid', ux - 0.3, uy + 0.5, uz - 0.14, ux + 0.3, uy + 0.54, uz + 0.14, '#8e949a');
  for (const sx of [-1, 1]) B.box('solid', ux + sx * 0.29 - 0.015, uy, uz - 0.015, ux + sx * 0.29 + 0.015, uy + 0.54, uz + 0.015, '#8e949a');
  const ucols = ['#3b7fd1', '#f4f4f0', '#e8704a'];
  for (let i = 0; i < 3; i++) {
    const px = ux - 0.18 + i * 0.18;
    B.cyl('solid', px, uy + 0.05, uz, 0.012, 0.9, '#555b62', { rz: (i - 1) * 0.08, seg: 4 });
    B.cyl('solid', px, uy + 0.15, uz, 0.02, 0.55, ucols[i], { rb: 0.045, seg: 6, rz: (i - 1) * 0.08 });
  }
  // fire extinguisher box on the left door post
  B.box('solid', -1.45, F + 0.05, Z - 0.02, -1.2, F + 0.6, Z + 0.1, '#d8433d');
  // 'ATM' projecting light box on the right corner (visible from the junction and the street)
  const ax = S.W / 2 - 0.1;
  B.box('solid', ax - 0.03, F + 2.35, Z - 0.02, ax + 0.03, F + 2.4, Z + 0.55, '#8e949a');
  B.pushT(ax, F + 2.05, Z + 0.33, Math.PI / 2);
  B.box('solid', -0.24, -0.3, -0.06, 0.24, 0.3, 0.06, '#ffffff', { rects: { Z: A.get('kAtm'), z: A.get('kAtm') }, kinds: { Z: 'lit', z: 'lit' } });
  B.pop();
}

function sides(S, F, Z, H, y0, y1) {
  const { B, A, W, D } = S;
  for (const sx of [-1, 1]) {
    B.pushT(sx * W / 2, 0, 0, sx * Math.PI / 2);
    // (local frame: +Z = outward, x runs along the side wall; front of the shop at x = -sx*Z... )
    const zf = 0.06;
    // band: fascia + stripes along the side, logo panel
    B.box('solid', -D / 2 - 0.02, y0 - 0.05, -0.02, D / 2 + 0.05, y1 + 0.05, zf, '#dfe2e0');
    B.quad('lit', 0, (y0 + y1) / 2, zf + 0.002, D, y1 - y0, '#f2f4f2');
    for (const [col, a, b] of STRIPES) B.quad('lit', 0, y0 + (a + b) / 2 * (y1 - y0), zf + 0.004, D, (b - a) * (y1 - y0), col);
    const lx = sx < 0 ? 2.2 : -2.2; // logo panel nearer the front
    B.quad('lit', lx, (y0 + y1) / 2, zf + 0.006, (y1 - y0) * 3.2, y1 - y0, '#f4f4f2', A.get('kSide'));
    // staff door, meter box, pipes (toward the back)
    const bx = sx < 0 ? -3.8 : 3.8;
    B.box('solid', bx - 0.45, F, 0, bx + 0.45, F + 2.05, 0.04, '#c9ccd0');
    B.box('solid', bx - 0.4, F + 0.05, 0.04, bx + 0.4, F + 2.0, 0.05, '#d8dcdc');
    B.box('solid', bx + 0.25, F + 0.9, 0.05, bx + 0.32, F + 1.05, 0.08, '#555b62');
    B.box('solid', bx - 1.4, F + 1.1, 0, bx - 0.9, F + 1.6, 0.18, '#dcdcd6');
    B.box('solid', bx - 2.2, F + 0.6, 0, bx - 1.7, F + 1.2, 0.2, '#8e949a');
    poster(S, sx < 0 ? -1.2 : 1.2, F + 1.4, 0.0, 0.5, 0.75, A.get(sx < 0 ? 'kPostSpring' : 'kPostBento'), { off: 0.01 });
    downpipe(S, sx < 0 ? 5.7 : -5.7, S.minGround, F + H - 0.1, -0.04, '#b8bcc0');
    B.pop();
  }
  // outdoor AC units at the back corners
  acUnit(S, W / 2 - 1.2, S.rawY(W / 2 - 1.2, -D / 2 - 0.45), -D / 2 - 0.45, Math.PI, { pipeH: 2.4 });
  acUnit(S, W / 2 - 2.2, S.rawY(W / 2 - 2.2, -D / 2 - 0.45), -D / 2 - 0.45, Math.PI, { pipeH: 2.4 });
}

function roofTop(S, y) {
  const { B } = S;
  for (const [x, z] of [[-4, -3], [-2.6, -3], [3.5, 0.5]]) {
    B.box('solid', x - 0.5, y, z - 0.35, x + 0.5, y + 0.75, z + 0.35, '#e4e4de');
    B.cyl('solid', x, y + 0.75, z, 0.28, 0.03, '#8e949a', { seg: 12 });
  }
  B.box('solid', 1.0, y, -4.2, 1.5, y + 0.9, -3.7, '#c9ccd0');
}

/** Tall pole sign at the forecourt's south-street corner. */
function poleSign(S, Z) {
  const { B, A, W } = S;
  const x = W / 2 - 0.35, z = Z + 2.55, y = S.gy(x, z);
  B.cyl('solid', x, y, z, 0.28, 0.12, '#b9bcc0', { seg: 10 });
  B.cyl('solid', x, y, z, 0.1, 4.6, '#d8dcdc', { seg: 10 });
  B.box('solid', x - 0.2, y + 4.6, z - 0.72, x + 0.2, y + 6.04, z + 0.72, '#e4e6e4');
  B.pushT(x, y + 5.32, z, Math.PI / 2);
  B.quad('lit', 0, 0, 0.205, 1.3, 1.3, '#f4f4f2', A.get('kPole'));
  B.quad('lit', 0, 0, -0.205, 1.3, 1.3, '#f4f4f2', A.get('kPole'), { ry: Math.PI });
  B.pop();
  B.box('solid', x - 0.22, y + 6.04, z - 0.74, x + 0.22, y + 6.1, z + 0.74, '#3aa37a');
}
