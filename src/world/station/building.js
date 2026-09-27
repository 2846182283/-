/**
 * Station building shell: walls with openings, gable roof with standing
 * seams, gutters and downpipes, the front "pediment" gable carrying the
 * station name board and a clock, the entrance canopy with open glass sliding
 * doors, windows (with interiors behind), wall lamps, the platform-side
 * facade and small garden bits around the building.
 *
 * Coordinates are world metres (the station root sits at the origin).
 */
import * as THREE from 'three';
import { STATION, PLATFORM } from '../../core/layout.js';

const B = STATION.building;
export const BLD = {
  WT: 0.25, // outer wall thickness
  EAVE: B.eaveY,
  RIDGE: B.ridgeY,
  ZC: (B.zMin + B.zMax) / 2,
  OH: 0.7, // eave overhang
  GOH: 0.5, // gable overhang
  CEIL: 3.85,
  // entrance
  ENT0: STATION.entrance.x - STATION.entrance.width / 2, // -7
  ENT1: STATION.entrance.x + STATION.entrance.width / 2, // -1
  ENT_H: 2.95,
  // pediment (front gable)
  PED0: -7.4,
  PED1: -0.6,
  PED_EAVE: 4.85,
  PED_APEX: 6.05,
  // interior partitions
  OFFICE_X: 1.2, // office west wall centre line
  GATE_Z: -19.8, // gate line / ticket wall centre line
  // platform access through the north wall
  NORTH_OPEN0: -7.6,
  NORTH_OPEN1: -2.4,
};

export const COLORS = {
  wall: '#f8eed9',
  wallIn: '#f7f1e6',
  plinth: '#a49b90',
  trim: '#f6f2ea',
  frame: '#6a4e3a',
  frameLight: '#c9ccd0',
  roof: '#5d646e',
  roofRib: '#6a727c',
  gutter: '#7a828b',
  navy: '#26324f',
};

const tanA = (B.ridgeY - B.eaveY) / ((B.zMax - B.zMin) / 2);
/** Height of the main roof underside at world z (south or north slope). */
export function roofY(z) {
  return B.eaveY + (Math.abs(z - BLD.ZC) <= (B.zMax - B.zMin) / 2 ? ((B.zMax - B.zMin) / 2 - Math.abs(z - BLD.ZC)) * tanA : -(Math.abs(z - BLD.ZC) - (B.zMax - B.zMin) / 2) * tanA);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------
// windows
// ---------------------------------------------------------------------------
/**
 * Window unit in a wall.  (x, z) is the exterior face centre of the opening
 * at floor level, ry turns local +Z to the exterior.  Local: opening spans
 * x in [-w/2, w/2], y in [y0, y1]; the wall occupies local z in [-depth, 0].
 */
export function windowUnit(kit, parent, { x, z, ry, w, y0, y1, depth = BLD.WT, cols = 2, transom = true, hood = true, blind = 0, frame = COLORS.frame, glass }) {
  const { M } = kit;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  parent.add(g);
  const f = 0.055, fz0 = -depth * 0.62, fz1 = -depth * 0.3;
  const h = y1 - y0;
  // outer frame
  kit.bx(g, M.vc, frame, -w / 2, w / 2, y1 - f, y1, fz0, fz1);
  kit.bx(g, M.vc, frame, -w / 2, w / 2, y0, y0 + f, fz0, fz1);
  kit.bx(g, M.vc, frame, -w / 2, -w / 2 + f, y0, y1, fz0, fz1);
  kit.bx(g, M.vc, frame, w / 2 - f, w / 2, y0, y1, fz0, fz1);
  // sash bars
  for (let i = 1; i < cols; i++) {
    const cx = -w / 2 + (w * i) / cols;
    kit.bx(g, M.vc, frame, cx - 0.025, cx + 0.025, y0, y1, fz0 + 0.01, fz1 - 0.01);
  }
  if (transom) {
    const ty = y1 - h * 0.28;
    kit.bx(g, M.vc, frame, -w / 2, w / 2, ty - 0.025, ty + 0.025, fz0 + 0.01, fz1 - 0.01);
  }
  // glass
  const gp = new THREE.PlaneGeometry(w - f * 2, h - f * 2);
  gp.translate(0, (y0 + y1) / 2, (fz0 + fz1) / 2);
  kit.add(g, gp, glass || M.glass, null, { noOutline: true, cast: false });
  // exterior sill + interior sill board
  kit.bx(g, M.vc, COLORS.trim, -w / 2 - 0.08, w / 2 + 0.08, y0 - 0.06, y0, -0.04, 0.07);
  kit.bx(g, M.vcIn, '#d9c7a8', -w / 2 - 0.03, w / 2 + 0.03, y0 - 0.02, y0 + 0.02, -depth - 0.08, -depth + 0.02);
  // small hood above the window (retro 庇)
  if (hood) {
    kit.beam(g, M.vc, COLORS.roof, V(-w / 2 - 0.18, y1 + 0.2, -0.02), V(w / 2 + 0.18, y1 + 0.2, -0.02), 0.44, 0.05, { up: V(0, 1, 0.35).normalize(), under: false, extend: 0 });
    kit.bx(g, M.vc, COLORS.trim, -w / 2 - 0.18, w / 2 + 0.18, y1 + 0.08, y1 + 0.13, 0.12, 0.2);
  }
  // half-lowered blind inside
  if (blind > 0) kit.bx(g, M.vcIn, '#efe6cf', -w / 2 + 0.05, w / 2 - 0.05, y1 - h * blind, y1 - 0.05, -depth - 0.06, -depth - 0.04);
  return g;
}

// ---------------------------------------------------------------------------
export function buildBuilding(kit, S, parent, clocks) {
  const { M } = kit;
  const WT = BLD.WT;
  const wallUV = { uv: [4, 4.2] };
  const inUV = { uv: [2.5, 2.5] };
  const E = BLD.EAVE;

  // ---------------- floor slab + plinth ----------------
  kit.bx(parent, M.floor, '#ffffff', B.xMin + WT, B.xMax - WT, 0, B.floorY, B.zMin + WT, B.zMax - WT, { uv: [3, 3] });
  // plinth band around the outside (slightly proud)
  const P0 = 0.5;
  const pl = (x0, x1, z0, z1) => kit.bx(parent, M.retaining, COLORS.plinth, x0, x1, 0, P0, z0, z1, { uv: [4, 1.6] });
  pl(B.xMin - 0.03, BLD.ENT0, B.zMax - 0.05, B.zMax + 0.03);
  pl(BLD.ENT1, B.xMax + 0.03, B.zMax - 0.05, B.zMax + 0.03);
  pl(B.xMin - 0.03, B.xMin + 0.05, B.zMin + 0.1, B.zMax + 0.03);
  pl(B.xMax - 0.05, B.xMax + 0.03, B.zMin + 0.1, -22.1);
  pl(B.xMax - 0.05, B.xMax + 0.03, -21.1, B.zMax + 0.03);

  // ---------------- walls (outer skin + interior lining) ----------------
  const winS = [
    { a: -12.9, b: -11.3, y0: 0.95, y1: 2.35 },
    { a: -10.3, b: -8.7, y0: 0.95, y1: 2.35 },
    { a: 1.9, b: 3.3, y0: 0.95, y1: 2.35 },
    { a: 4.0, b: 5.4, y0: 0.95, y1: 2.35 },
  ];
  const entrance = { a: BLD.ENT0, b: BLD.ENT1, y0: -1, y1: BLD.ENT_H };
  // south: gap where the plinth is replaced by the entrance
  kit.wall(parent, M.wall, COLORS.wall, 'x', B.xMin, B.xMax, B.zMax - WT + 0.05, B.zMax, 0, E, [...winS, entrance], wallUV);
  kit.wall(parent, M.wallIn, COLORS.wallIn, 'x', B.xMin + WT, B.xMax - WT, B.zMax - WT, B.zMax - WT + 0.05, B.floorY, BLD.CEIL, [...winS, entrance], inUV);

  const winE = [{ a: -17.9, b: -16.5, y0: 0.95, y1: 2.35 }];
  const doorE = { a: -22.1, b: -21.1, y0: -1, y1: 2.2 };
  kit.wall(parent, M.wall, COLORS.wall, 'z', B.zMin, B.zMax, B.xMax - WT + 0.05, B.xMax, 0, E, [...winE, doorE], wallUV);
  kit.wall(parent, M.wallIn, COLORS.wallIn, 'z', B.zMin + WT, B.zMax - WT, B.xMax - WT, B.xMax - WT + 0.05, B.floorY, BLD.CEIL, [...winE, doorE], inUV);

  const winW = [{ a: -23.0, b: -21.9, y0: 1.95, y1: 2.95 }];
  kit.wall(parent, M.wall, COLORS.wall, 'z', B.zMin, B.zMax, B.xMin, B.xMin + WT - 0.05, 0, E, winW, wallUV);
  kit.wall(parent, M.wallIn, COLORS.wallIn, 'z', B.zMin + WT, B.zMax - WT, B.xMin + WT - 0.05, B.xMin + WT, B.floorY, BLD.CEIL, winW, inUV);

  const PT = PLATFORM.top;
  const northOpen = { a: BLD.NORTH_OPEN0, b: BLD.NORTH_OPEN1, y0: -1, y1: PT + 2.35 };
  const winN = [{ a: 2.0, b: 3.2, y0: PT + 1.0, y1: PT + 1.85 }, { a: 3.9, b: 5.1, y0: PT + 1.0, y1: PT + 1.85 }];
  kit.wall(parent, M.wall, COLORS.wall, 'x', B.xMin, B.xMax, B.zMin, B.zMin + WT - 0.05, 0, E, [northOpen, ...winN], wallUV);
  kit.wall(parent, M.wallIn, COLORS.wallIn, 'x', B.xMin + WT, B.xMax - WT, B.zMin + WT - 0.05, B.zMin + WT, B.floorY, BLD.CEIL, [northOpen, ...winN], inUV);
  // lintel trim over the platform opening
  kit.bx(parent, M.vc, COLORS.trim, BLD.NORTH_OPEN0 - 0.1, BLD.NORTH_OPEN1 + 0.1, northOpen.y1, northOpen.y1 + 0.18, B.zMin - 0.05, B.zMin + WT + 0.02);
  for (const x of [BLD.NORTH_OPEN0, BLD.NORTH_OPEN1]) kit.bx(parent, M.vc, COLORS.trim, x - 0.08, x + 0.08, PT, northOpen.y1, B.zMin - 0.05, B.zMin + WT + 0.02);

  // wainscot band (warm wood-tone skirting) inside the concourse
  kit.bx(parent, M.wood, '#b8946c', B.xMin + WT, BLD.ENT0, B.floorY, 1.0, B.zMax - WT - 0.02, B.zMax - WT, { uv: [1, 1] });
  kit.bx(parent, M.wood, '#b8946c', BLD.ENT1, BLD.OFFICE_X - 0.08, B.floorY, 1.0, B.zMax - WT - 0.02, B.zMax - WT, { uv: [1, 1] });
  kit.bx(parent, M.wood, '#b8946c', B.xMin + WT, B.xMin + WT + 0.02, B.floorY, 1.0, BLD.GATE_Z + 0.1, B.zMax - WT, { uv: [1, 1] });

  // corner trims (outlines read nicely on the silhouette)
  for (const [x, z] of [[B.xMin, B.zMax], [B.xMax, B.zMax], [B.xMin, B.zMin], [B.xMax, B.zMin]]) {
    kit.bx(parent, M.vc, COLORS.trim, x - 0.07, x + 0.07, P0, E, z - 0.07, z + 0.07);
  }
  // frieze band just under the eaves
  kit.bx(parent, M.vc, COLORS.trim, B.xMin - 0.05, B.xMax + 0.05, E - 0.22, E - 0.02, B.zMax - 0.02, B.zMax + 0.05);
  kit.bx(parent, M.vc, COLORS.trim, B.xMin - 0.05, B.xMax + 0.05, E - 0.22, E - 0.02, B.zMin - 0.05, B.zMin + 0.02);

  // ---------------- windows ----------------
  const zS = B.zMax, zN = B.zMin;
  windowUnit(kit, parent, { x: -12.1, z: zS, ry: 0, w: 1.6, y0: 0.95, y1: 2.35 });
  windowUnit(kit, parent, { x: -9.5, z: zS, ry: 0, w: 1.6, y0: 0.95, y1: 2.35 });
  windowUnit(kit, parent, { x: 2.6, z: zS, ry: 0, w: 1.4, y0: 0.95, y1: 2.35, blind: 0.35 });
  windowUnit(kit, parent, { x: 4.7, z: zS, ry: 0, w: 1.4, y0: 0.95, y1: 2.35, blind: 0.5 });
  windowUnit(kit, parent, { x: B.xMax, z: -17.2, ry: Math.PI / 2, w: 1.4, y0: 0.95, y1: 2.35, blind: 0.3 });
  windowUnit(kit, parent, { x: B.xMin, z: -22.45, ry: -Math.PI / 2, w: 1.1, y0: 1.95, y1: 2.95, cols: 1, transom: false });
  windowUnit(kit, parent, { x: 2.6, z: zN, ry: Math.PI, w: 1.2, y0: PT + 1.0, y1: PT + 1.85, cols: 2, transom: false, hood: false, blind: 0.3 });
  windowUnit(kit, parent, { x: 4.5, z: zN, ry: Math.PI, w: 1.2, y0: PT + 1.0, y1: PT + 1.85, cols: 2, transom: false, hood: false });

  // staff door on the east wall (closed, with a small hood + step)
  {
    const g = new THREE.Group();
    g.position.set(B.xMax, 0, -21.6);
    g.rotation.y = Math.PI / 2;
    parent.add(g);
    kit.bx(g, M.metal, '#8f98a2', -0.5, 0.5, 0, 2.2, -0.16, -0.1);
    kit.bx(g, M.vc, COLORS.frame, -0.55, 0.55, 2.2, 2.28, -0.2, 0.0);
    kit.bx(g, M.vc, COLORS.frame, -0.55, -0.5, 0, 2.2, -0.2, 0.0);
    kit.bx(g, M.vc, COLORS.frame, 0.5, 0.55, 0, 2.2, -0.2, 0.0);
    kit.bx(g, M.vc, '#b9cfe0', -0.18, 0.18, 1.35, 1.85, -0.095, -0.09, { noOutline: true });
    kit.cyl(g, M.metal, '#d8d8d4', 0.025, 0.025, 0.14, 0.38, 1.0, -0.09, 8, { rx: Math.PI / 2 });
    kit.bx(g, M.retaining, COLORS.plinth, -0.7, 0.7, 0, 0.16, 0, 0.55, { uv: [2, 1] });
    kit.beam(g, M.vc, COLORS.roof, V(-0.8, 2.55, 0.0), V(0.8, 2.55, 0.0), 0.7, 0.05, { up: V(0, 1, 0.3).normalize() });
    kit.decal(g, S.officeDoor, 0.5, 0.15, 0, 1.65, 0.01 - 0.09, 0);
  }
  buildEastEnd(kit, S, parent);

  // ---------------- roof ----------------
  buildRoof(kit, parent);
  buildPediment(kit, S, parent, clocks);
  buildEntrance(kit, S, parent);
  buildFacadeDetails(kit, S, parent, clocks);
  buildGarden(kit, parent);
}

// ---------------------------------------------------------------------------
/**
 * East end (seen from platform 1): wall-mounted AC outdoor unit on brackets
 * with its cream pipe duct, an electric conduit + meter box running up to the
 * eave, a vertical 駅務室 name plate and a small lamp by the staff door.
 */
function buildEastEnd(kit, S, parent) {
  const { M } = kit;
  const xw = B.xMax; // outer wall face
  // AC outdoor unit on wall brackets, north of the staff door
  {
    const z0 = -23.65, z1 = -22.85, y0 = 2.35, y1 = 2.95;
    for (const z of [z0 + 0.1, z1 - 0.1]) {
      kit.bx(parent, M.metal, '#8f969d', xw, xw + 0.42, y0 - 0.05, y0, z - 0.02, z + 0.02);
      kit.beam(parent, M.metal, '#8f969d', V(xw, y0 - 0.45, z), V(xw + 0.4, y0 - 0.03, z), 0.03, 0.03);
    }
    kit.bx(parent, M.metal, '#e8e8e2', xw + 0.04, xw + 0.34, y0, y1, z0, z1);
    kit.cyl(parent, M.vc, '#8e949b', 0.2, 0.2, 0.01, xw + 0.34, y0 + 0.3, z0 + 0.33, 16, { rz: -Math.PI / 2, noOutline: true });
    for (let i = -2; i <= 2; i++) kit.bx(parent, M.vc, '#6f757c', xw + 0.345, xw + 0.355, y0 + 0.29 + i * 0.07, y0 + 0.31 + i * 0.07, z0 + 0.15, z0 + 0.52, { noOutline: true });
    kit.bx(parent, M.vc, '#c9c9c2', xw + 0.345, xw + 0.35, y0 + 0.08, y1 - 0.08, z1 - 0.17, z1 - 0.05, { noOutline: true });
    // pipe duct: out of the unit's side, up the wall and into it under the eave
    kit.bx(parent, M.vc, '#e9e2cf', xw, xw + 0.09, y0 + 0.15, y0 + 0.25, z1, z1 + 0.35);
    kit.bx(parent, M.vc, '#e9e2cf', xw, xw + 0.09, y0 + 0.15, 3.75, z1 + 0.25, z1 + 0.35);
    kit.bx(parent, M.vc, '#d7cfba', xw, xw + 0.1, 3.72, 3.8, z1 + 0.22, z1 + 0.38);
    // drain hose dripping to a small gravel patch
    kit.tube(parent, M.vc, '#3a3d44', [V(xw + 0.2, y0, z0 + 0.1), V(xw + 0.25, y0 - 0.8, z0 + 0.05), V(xw + 0.3, 0.05, z0 + 0.1)], 0.012, 5);
    kit.cyl(parent, M.vc, '#9a958c', 0.2, 0.22, 0.03, xw + 0.3, 0, z0 + 0.1, 10, { noOutline: true });
  }
  // electric conduit from a meter box to the eave
  {
    const z = -19.9;
    kit.bx(parent, M.metal, '#dcdcd4', xw, xw + 0.14, 1.3, 1.78, z - 0.2, z + 0.2);
    kit.bx(parent, M.lamp, '#f0f2ea', xw + 0.141, xw + 0.142, 1.52, 1.66, z - 0.12, z + 0.02, { noOutline: true, cast: false });
    kit.cyl(parent, M.metal, '#b9bcc0', 0.025, 0.025, B.eaveY - 0.3 - 1.78, xw + 0.06, 1.78, z + 0.1, 8);
    kit.cyl(parent, M.metal, '#b9bcc0', 0.025, 0.025, 1.3 - 0.05, xw + 0.06, 0.05, z - 0.08, 8);
    for (const y of [0.6, 2.4, 3.2]) kit.bx(parent, M.metal, '#7c838b', xw, xw + 0.09, y, y + 0.04, z + (y > 1.5 ? 0.06 : -0.12), z + (y > 1.5 ? 0.14 : -0.04), { noOutline: true });
  }
  // 駅務室 name plate beside the staff door + a small bracket lamp under the hood
  kit.bx(parent, M.wood, '#b8946c', xw, xw + 0.025, 1.15, 2.05, -22.62, -22.34, { uv: [1, 1] });
  kit.decal(parent, S.ekimuPlate, 0.24, 0.8, xw + 0.027, 1.6, -22.48, Math.PI / 2);
  kit.bx(parent, M.metal, '#4a4d52', xw, xw + 0.18, 2.4, 2.44, -21.64, -21.56);
  kit.cyl(parent, M.lamp, '#ffe6b0', 0.07, 0.07, 0.12, xw + 0.18, 2.28, -21.6, 10, { noOutline: true, cast: false });
  kit.cyl(parent, M.metal, '#4a4d52', 0.02, 0.09, 0.05, xw + 0.18, 2.4, -21.6, 10);
}

// ---------------------------------------------------------------------------
function buildRoof(kit, parent) {
  const { M } = kit;
  const x0 = B.xMin - BLD.GOH, x1 = B.xMax + BLD.GOH;
  const T = 0.16;
  const eS = B.zMax + BLD.OH, eN = B.zMin - BLD.OH;
  const R = BLD.RIDGE;
  const ZC = BLD.ZC;
  const slab = (xa, xb, zr, ze) => kit.beam(parent, M.roof, COLORS.roof, V((xa + xb) / 2, R, zr), V((xa + xb) / 2, roofY(ze), ze), xb - xa, T, { under: true, uv: [1, 1] });
  // south slope: split around the front pediment (the middle part stops behind it)
  slab(x0, BLD.PED0, ZC, eS);
  slab(BLD.PED1, x1, ZC, eS);
  slab(BLD.PED0, BLD.PED1, ZC, B.zMax - BLD.WT);
  // north slope, continuous
  slab(x0, x1, ZC, eN);

  // standing seams: thin ribs every 0.5 m on top of the slabs
  const ribs = new THREE.Group();
  const Tv = T * Math.sqrt(1 + tanA * tanA); // vertical thickness of the sloped slab
  const rib = (x, ze) => kit.beam(ribs, M.roof, COLORS.roofRib, V(x, R + Tv, ZC), V(x, roofY(ze) + Tv, ze), 0.035, 0.045, { under: true, noOutline: true, uv: [1, 1] });
  for (let x = x0 + 0.25; x < x1; x += 0.5) {
    const front = x > BLD.PED0 - 0.05 && x < BLD.PED1 + 0.05;
    rib(x, front ? B.zMax - BLD.WT - 0.05 : eS);
    rib(x, eN);
  }
  parent.add(ribs);

  // ridge cap
  kit.box(parent, M.metal, COLORS.roofRib, x1 - x0 + 0.1, 0.12, 0.34, (x0 + x1) / 2, R + T + 0.03, ZC);
  // fascia / eave boards and gutters
  const fasc = (xa, xb, ze, s) => {
    const y = roofY(ze);
    kit.bx(parent, M.vc, COLORS.trim, xa, xb, y - 0.06, y + T + 0.02, ze + s * 0.0 - 0.03, ze + 0.03);
    // half-round gutter (rendered as a full rod, reads fine from below) + hangers
    kit.rod(parent, M.metal, COLORS.gutter, 0.075, 'x', xa, xb, y - 0.02, ze + s * 0.1, 10);
  };
  fasc(x0, BLD.PED0 + 0.02, eS, 1);
  fasc(BLD.PED1 - 0.02, x1, eS, 1);
  fasc(x0, x1, eN, -1);

  // barge boards along the gable edges (white, slightly thicker than the roof)
  for (const x of [x0, x1]) {
    for (const ze of [eS, eN]) {
      kit.beam(parent, M.vc, COLORS.trim, V(x, R - 0.08, ZC), V(x, roofY(ze) - 0.08, ze), 0.06, 0.3, { under: true });
    }
  }

  // gable end walls (triangles) + louvred vents
  for (const [xa, xb, s] of [[B.xMin, B.xMin + BLD.WT, -1], [B.xMax - BLD.WT, B.xMax, 1]]) {
    kit.prism(parent, M.wall, COLORS.wall, 'x', [[B.zMin, B.eaveY], [B.zMax, B.eaveY], [ZC, B.ridgeY]], xa, xb, { uv: [4, 4.2] });
    const vx = s > 0 ? xb : xa;
    const g = new THREE.Group();
    g.position.set(vx, 5.05, ZC);
    g.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    kit.bx(g, M.vc, COLORS.trim, -0.62, 0.62, -0.4, 0.4, 0, 0.06);
    kit.bx(g, M.vc, '#5f636a', -0.54, 0.54, -0.33, 0.33, 0.06, 0.065, { noOutline: true });
    for (let i = 0; i < 6; i++) kit.box(g, M.vc, '#9a9ea5', 1.06, 0.035, 0.1, 0, -0.27 + i * 0.105, 0.1, { rx: 0.6, noOutline: i > 0 && i < 5 });
    kit.box(g, M.vc, COLORS.trim, 1.4, 0.08, 0.14, 0, 0.46, 0.08); // drip hood
    parent.add(g);
  }

  // downpipes at the four corners
  for (const [x, ze, s] of [[B.xMin + 0.18, eS, 1], [B.xMax - 0.18, eS, 1], [B.xMin + 0.18, eN, -1], [B.xMax - 0.18, eN, -1]]) {
    const yTop = roofY(ze) - 0.05;
    const zw = s > 0 ? B.zMax + 0.1 : B.zMin - 0.1;
    const yBot = s > 0 ? 0.05 : PLATFORM.top + 0.02;
    kit.beam(parent, M.metal, COLORS.gutter, V(x, yTop, ze + s * 0.1), V(x, yTop - 0.45, zw), 0.09, 0.09);
    kit.cyl(parent, M.metal, COLORS.gutter, 0.045, 0.045, yTop - 0.45 - yBot, x, yBot, zw, 8);
    for (const y of [1.2, 2.4, 3.4]) if (y > yBot + 0.2) kit.bx(parent, M.metal, '#9aa1a8', x - 0.06, x + 0.06, y, y + 0.04, zw - 0.06 * s, zw + 0.02 * s);
    kit.beam(parent, M.metal, COLORS.gutter, V(x, yBot + 0.2, zw), V(x, yBot + 0.03, zw + s * 0.2), 0.09, 0.09);
  }
}

// ---------------------------------------------------------------------------
function buildPediment(kit, S, parent, clocks) {
  const { M } = kit;
  const z1 = B.zMax, z0 = B.zMax - BLD.WT;
  const xa = BLD.PED0, xb = BLD.PED1, xm = (xa + xb) / 2;
  const E = BLD.EAVE, PE = BLD.PED_EAVE, PA = BLD.PED_APEX;
  // front wall above the main eave: rectangle + gable triangle
  kit.prism(parent, M.wall, COLORS.wall, 'z', [[xa, E], [xb, E], [xb, PE], [xm, PA], [xa, PE]], z0, z1, { uv: [4, 4.2, 0, 0.0] });
  const depth = 1.45; // pediment roof depth
  const zb = z1 - depth;
  // back gable wall where the pediment roof meets the main roof
  kit.prism(parent, M.wall, COLORS.wall, 'z', [[xa, roofY(zb)], [xb, roofY(zb)], [xb, PE], [xm, PA], [xa, PE]], zb - 0.15, zb, { uv: [4, 4.2] });
  // side cheeks between the main roof and the pediment eave
  for (const x of [xa, xb - 0.2]) {
    kit.prism(parent, M.wall, COLORS.wall, 'x', [[zb, roofY(zb)], [z1, E], [z1, PE], [zb, PE]], x, x + 0.2, { uv: [4, 4.2] });
  }
  // pediment roof slabs
  const T = 0.14, ov = 0.3;
  const k = (PA - PE) / ((xb - xa) / 2);
  for (const s of [-1, 1]) {
    const xe = s < 0 ? xa - ov : xb + ov;
    const ye = PE - ov * k;
    kit.beam(parent, M.roof, COLORS.roof, V(xm, PA, (z1 + 0.35 + zb) / 2), V(xe, ye, (z1 + 0.35 + zb) / 2), depth + 0.35, T, { under: true, up: V(0, 1, 0), uv: [1, 1] });
    // barge board on the front edge
    kit.beam(parent, M.vc, COLORS.trim, V(xm, PA - 0.1, z1 + 0.36), V(xe, ye - 0.1, z1 + 0.36), 0.28, 0.07, { under: true, up: V(0, 0, 1) });
  }
  // ridge cap + finial
  kit.box(parent, M.metal, COLORS.roofRib, 0.24, 0.12, depth + 0.4, xm, PA + T + 0.02, (z1 + 0.35 + zb) / 2);
  // trim line between wall and gable
  kit.bx(parent, M.vc, COLORS.trim, xa - 0.05, xb + 0.05, PE - 0.1, PE, z1 - 0.02, z1 + 0.06);
  kit.bx(parent, M.vc, COLORS.trim, xa - 0.05, xb + 0.05, E - 0.22, E - 0.02, z1 - 0.02, z1 + 0.05);

  // station name board (6.2 x 0.9) with a navy frame
  const bw = 6.1, bh = 0.88, by = 3.78;
  kit.bx(parent, M.vc, COLORS.navy, xm - bw / 2 - 0.08, xm + bw / 2 + 0.08, by - bh / 2 - 0.08, by + bh / 2 + 0.08, z1, z1 + 0.1);
  kit.decal(parent, S.entranceBoard, bw, bh, xm, by, z1 + 0.105, 0);
  // gooseneck lamps lighting the name board
  for (const dx of [-2.1, 0, 2.1]) {
    const x = xm + dx, yb = by + bh / 2 + 0.12;
    kit.bx(parent, M.metal, '#4a4d52', x - 0.04, x + 0.04, yb + 0.1, yb + 0.22, z1, z1 + 0.04);
    kit.beam(parent, M.metal, '#4a4d52', V(x, yb + 0.16, z1 + 0.02), V(x, yb + 0.3, z1 + 0.32), 0.03, 0.03);
    const shade = new THREE.CylinderGeometry(0.05, 0.11, 0.1, 12, 1, true);
    shade.rotateX(0.6);
    shade.translate(x, yb + 0.26, z1 + 0.4);
    kit.add(parent, shade, M.metal, '#4a4d52', { noOutline: true });
    const bulb = new THREE.CircleGeometry(0.085, 12);
    bulb.rotateX(Math.PI / 2 + 0.6);
    bulb.translate(x, yb + 0.222, z1 + 0.375);
    kit.add(parent, bulb, M.lamp, '#fff0cc', { noOutline: true, cast: false });
  }
  // gable clock
  clocks.face(parent, xm, 5.3, z1 + 0.09, 0, 0.36, { rim: '#f1ede4', depth: 0.09 });
}

// ---------------------------------------------------------------------------
function buildEntrance(kit, S, parent) {
  const { M } = kit;
  const z1 = B.zMax;
  const x0 = BLD.ENT0, x1 = BLD.ENT1, H = BLD.ENT_H;
  // threshold slope from the concourse floor down to the plaza + tactile guide
  kit.beam(parent, M.platform, '#ecebe7', V(-4, B.floorY - 0.12, z1 - BLD.WT), V(-4, B.floorY - 0.12, z1), x1 - x0, 0.12, { under: true, uv: [6, 6] });
  kit.beam(parent, M.platform, '#ecebe7', V(-4, B.floorY - 0.2, z1), V(-4, -0.19, z1 + 1.35), x1 - x0 + 0.6, 0.2, { under: true, uv: [6, 6] });

  // tactile guide line continuing from the concourse down the threshold slope toward the plaza
  kit.beam(parent, M.tactileLine, null, V(-3.8, B.floorY + 0.001, z1 - 0.05), V(-3.8, 0.011, z1 + 1.35), 0.3, 0.006, { under: true, uv: [0.3, 0.3], noOutline: true, cast: false });
  kit.bx(parent, M.tactileDot, null, -4.25, -3.35, 0, 0.012, z1 + 1.35, z1 + 1.95, { uv: [0.3, 0.3], noOutline: true, cast: false });

  // door frame: jambs, head, transom
  const fz0 = z1 - 0.2, fz1 = z1 - 0.05;
  const alu = '#c3c8cd';
  kit.bx(parent, M.metal, alu, x0, x0 + 0.08, 0, H, fz0, fz1);
  kit.bx(parent, M.metal, alu, x1 - 0.08, x1, 0, H, fz0, fz1);
  kit.bx(parent, M.metal, alu, x0, x1, H - 0.1, H, fz0, fz1);
  kit.bx(parent, M.metal, alu, x0, x1, 2.3, 2.4, fz0, fz1);
  // transom glass
  const tg = new THREE.PlaneGeometry(x1 - x0 - 0.16, H - 0.1 - 2.4);
  tg.translate((x0 + x1) / 2, (2.4 + H - 0.1) / 2, (fz0 + fz1) / 2);
  kit.add(parent, tg, M.glass, null, { noOutline: true, cast: false });
  // "自動ドア" style label strip on the transom: the station logo
  kit.decal(parent, S.logo, 0.4, 0.4, (x0 + x1) / 2, 2.63, fz1 + 0.01, 0);
  // fixed side panels + sliding leaves parked behind them (doors open)
  const leaf = (xa, xb, z, fixed) => {
    kit.bx(parent, M.metal, alu, xa, xb, B.floorY, B.floorY + 0.12, z - 0.03, z + 0.03);
    kit.bx(parent, M.metal, alu, xa, xb, 2.24, 2.3, z - 0.03, z + 0.03);
    kit.bx(parent, M.metal, alu, xa, xa + 0.05, B.floorY, 2.3, z - 0.03, z + 0.03);
    kit.bx(parent, M.metal, alu, xb - 0.05, xb, B.floorY, 2.3, z - 0.03, z + 0.03);
    const gp = new THREE.PlaneGeometry(xb - xa - 0.1, 2.3 - B.floorY - 0.18);
    gp.translate((xa + xb) / 2, (B.floorY + 0.12 + 2.24) / 2, z);
    kit.add(parent, gp, M.glass, null, { noOutline: true, cast: false });
    if (!fixed) kit.bx(parent, M.metal, '#9aa1a8', xb - 0.14, xb - 0.1, 0.9, 1.3, z + 0.03, z + 0.05);
    else kit.decal(parent, S.logo, 0.22, 0.22, (xa + xb) / 2, 1.45, z + 0.035, 0);
  };
  const wL = 1.5;
  leaf(x0 + 0.08, x0 + 0.08 + wL, z1 - 0.1, true);
  leaf(x1 - 0.08 - wL, x1 - 0.08, z1 - 0.1, true);
  leaf(x0 + 0.12, x0 + 0.12 + wL, z1 - 0.2, false);
  leaf(x1 - 0.12 - wL, x1 - 0.12, z1 - 0.2, false);
  // door rail on the floor
  kit.bx(parent, M.metal, '#8f969d', x0, x1, B.floorY - 0.005, B.floorY + 0.01, z1 - 0.24, z1 - 0.05);

  // canopy (庇) over the entrance with tie rods
  const cz0 = z1, cz1 = z1 + 2.3, cy = 3.0;
  const cx0 = BLD.PED0 - 0.25, cx1 = BLD.PED1 + 0.25;
  kit.bx(parent, M.vc, '#f4f1ea', cx0, cx1, cy, cy + 0.16, cz0, cz1);
  kit.bx(parent, M.vc, COLORS.trim, cx0 - 0.02, cx1 + 0.02, cy - 0.06, cy + 0.26, cz1, cz1 + 0.08);
  kit.bx(parent, M.vc, kit.ctx.layout.STATION.lineColor, cx0 - 0.02, cx1 + 0.02, cy + 0.02, cy + 0.09, cz1 + 0.08, cz1 + 0.09, { noOutline: true });
  kit.bx(parent, M.vc, COLORS.trim, cx0 - 0.02, cx0 + 0.06, cy - 0.06, cy + 0.26, cz0, cz1 + 0.08);
  kit.bx(parent, M.vc, COLORS.trim, cx1 - 0.06, cx1 + 0.02, cy - 0.06, cy + 0.26, cz0, cz1 + 0.08);
  // roof membrane on top, sloping slightly outward
  kit.bx(parent, M.metal, '#9ea6ae', cx0, cx1, cy + 0.16, cy + 0.2, cz0, cz1);
  for (const x of [cx0 + 0.6, cx1 - 0.6]) {
    kit.tube(parent, M.metal, '#6d747c', [V(x, 3.95, z1 + 0.02), V(x, cy + 0.22, cz1 - 0.15)], 0.02, 6, { noOutline: false });
    kit.bx(parent, M.metal, '#6d747c', x - 0.06, x + 0.06, 3.9, 4.02, z1, z1 + 0.04);
  }
  // downlights
  for (const x of [-6.2, -4.0, -1.8]) {
    for (const z of [z1 + 0.7, z1 + 1.6]) {
      kit.cyl(parent, M.lamp, '#fff4dc', 0.1, 0.1, 0.02, x, cy - 0.02, z, 12, { noOutline: true, cast: false });
      kit.cyl(parent, M.metal, '#dcdcd6', 0.13, 0.13, 0.02, x, cy - 0.005, z, 12, { cast: false });
    }
  }
}

// ---------------------------------------------------------------------------
function buildFacadeDetails(kit, S, parent, clocks) {
  const { M } = kit;
  const zS = B.zMax;
  // wall lanterns either side of the pediment
  for (const x of [BLD.PED0 - 0.55, BLD.PED1 + 0.55]) {
    const g = new THREE.Group();
    g.position.set(x, 2.55, zS);
    parent.add(g);
    kit.bx(g, M.metal, '#4a4d52', -0.09, 0.09, -0.14, 0.14, 0, 0.04);
    kit.bx(g, M.metal, '#4a4d52', -0.02, 0.02, 0.1, 0.14, 0.04, 0.3);
    kit.bx(g, M.metal, '#4a4d52', -0.13, 0.13, 0.12, 0.17, 0.2, 0.46);
    kit.bx(g, M.lamp, '#ffe2a8', -0.1, 0.1, -0.16, 0.12, 0.23, 0.43, { noOutline: true, cast: false });
    kit.bx(g, M.metal, '#4a4d52', -0.12, 0.12, -0.19, -0.16, 0.21, 0.45);
  }
  // spring-festival のぼり flags either side of the entrance + an A-frame notice
  for (const x of [BLD.PED0 - 1.15, BLD.PED1 + 0.75]) {
    const z = zS + 0.85;
    kit.cyl(parent, M.metal, '#e8e8e4', 0.022, 0.022, 2.75, x, 0.18, z, 8);
    kit.cyl(parent, M.vc, '#5a8ab0', 0.16, 0.18, 0.2, x, 0, z, 12); // weighted base
    kit.bx(parent, M.metal, '#e8e8e4', x, x + 0.5, 2.83, 2.86, z - 0.012, z + 0.012);
    kit.decal(parent, S.nobori, 0.48, 1.75, x + 0.26, 1.95, z + 0.004, 0);
    kit.decal(parent, S.nobori, 0.48, 1.75, x + 0.26, 1.95, z - 0.004, Math.PI);
  }
  {
    const g = new THREE.Group();
    g.position.set(-6.6, 0, zS + 1.25);
    g.rotation.y = 0.3;
    parent.add(g);
    const a = 0.2;
    for (const s of [1, -1]) {
      const p = new THREE.Group();
      p.position.set(0, 0, s * 0.18);
      p.rotation.x = -s * a;
      p.rotation.y = s < 0 ? Math.PI : 0;
      g.add(p);
      kit.bx(p, M.wood, '#8a6446', -0.3, 0.3, 0, 0.9, 0.02, 0.05, { uv: [1, 1] });
      kit.decal(p, S.aframe, 0.5, 0.66, 0, 0.52, 0.052, 0);
    }
  }

  // information case (glazed notice board) between the west windows
  {
    const g = new THREE.Group();
    g.position.set(-10.9, 0, zS);
    parent.add(g);
    kit.bx(g, M.vc, COLORS.frame, -0.42, 0.42, 1.05, 2.15, 0, 0.1);
    kit.decal(g, S.posterSakura, 0.36, 0.5, -0.19, 1.6, 0.075, 0);
    kit.decal(g, S.posterFest, 0.36, 0.5, 0.19, 1.6, 0.075, 0);
    const gp = new THREE.PlaneGeometry(0.78, 1.02);
    gp.translate(0, 1.6, 0.105);
    kit.add(g, gp, M.glass, null, { noOutline: true, cast: false });
  }
  // "きっぷうりば" + company plate east of the entrance
  kit.board(parent, S.kippu, 1.05, 0.24, 0.35, 2.75, zS + 0.03, 0, { frameColor: COLORS.navy, thick: 0.03 });
  // company emblem on the east end of the facade
  kit.decal(parent, S.logo, 0.55, 0.55, 5.35, 3.35, zS + 0.01, 0);

  // air-conditioner outdoor unit + pipes by the office (a lived-in touch)
  {
    const x = B.xMax + 0.35, z = -16.3;
    kit.bx(parent, M.metal, '#e6e6e0', x - 0.3, x + 0.02, 0.05, 0.65, z - 0.4, z + 0.4);
    kit.cyl(parent, M.vc, '#8e949b', 0.2, 0.2, 0.01, x + 0.02, 0.35, z - 0.1, 16, { rz: -Math.PI / 2, noOutline: true });
    for (let i = -2; i <= 2; i++) kit.bx(parent, M.vc, '#6f757c', x + 0.025, x + 0.035, 0.34 + i * 0.07, 0.36 + i * 0.07, z - 0.28, z + 0.08, { noOutline: true });
    kit.bx(parent, M.vc, '#b9b3a8', B.xMax + 0.01, B.xMax + 0.08, 0.5, 2.6, z + 0.25, z + 0.33);
    kit.bx(parent, M.retaining, COLORS.plinth, x - 0.35, x + 0.07, 0, 0.05, z - 0.45, z + 0.45, { uv: [2, 1] });
  }
  // electricity meter box on the west wall
  kit.bx(parent, M.metal, '#dcdcd4', B.xMin - 0.12, B.xMin, 1.3, 1.75, -20.4, -20.05);

  // platform-side (north) facade: notice case, posters, timetable, platform number, fire box
  const zN = B.zMin;
  const PT = PLATFORM.top;
  const nf = (region, w, h, x, y, kind = 'lit') => kit.decal(parent, region, w, h, x, y, zN - 0.012, Math.PI, { mat: kit.matFor(region, kind) });
  // glazed poster case (4 posters)
  {
    const cx = -10.6;
    kit.bx(parent, M.vc, COLORS.frame, cx - 1.55, cx + 1.55, PT + 0.75, PT + 1.95, zN - 0.08, zN);
    kit.bx(parent, M.vc, '#e9e4d8', cx - 1.48, cx + 1.48, PT + 0.8, PT + 1.9, zN - 0.085, zN - 0.08, { noOutline: true });
    const ps = [S.posterSakura, S.posterSafety, S.posterHanami, S.posterSummer];
    ps.forEach((r, i) => kit.decal(parent, r, 0.62, 0.88, cx + 1.08 - i * 0.72, PT + 1.35, zN - 0.09, Math.PI));
    const gp = new THREE.PlaneGeometry(3.0, 1.12);
    gp.rotateY(Math.PI);
    gp.translate(cx, PT + 1.35, zN - 0.1);
    kit.add(parent, gp, M.glass, null, { noOutline: true, cast: false });
  }
  kit.board(parent, S.tt1, 0.62, 0.85, -8.35, PT + 1.45, zN - 0.04, Math.PI, { frameColor: '#e8e8e6', thick: 0.04 });
  nf(S.adOnsen, 1.5, 0.52, -13.0 + 0.1, PT + 1.4 + 0.9 - 0.28);
  // east part: platform number board, fire extinguisher box, edge warning
  kit.board(parent, S.num1, 0.5, 0.58, -1.3, PT + 1.2, zN - 0.04, Math.PI, { frameColor: COLORS.navy, thick: 0.04 });
  kit.bx(parent, M.vc, '#c9372f', 0.6, 1.0, PT + 0.05, PT + 0.75, zN - 0.22, zN);
  nf(S.fireBox, 0.36, 0.6, 0.8, PT + 0.42);
  kit.decal(parent, S.fireBox, 0.36, 0.6, 0.8, PT + 0.42, zN - 0.225, Math.PI);
  nf(S.edgeWarn, 1.3, 0.33, 3.55, PT + 0.85);
  nf(S.noSmoke, 0.36, 0.46, 1.6, PT + 1.55);
  // wall clock over the platform opening's east side
  clocks.face(parent, -1.3, PT + 2.0, zN - 0.05, Math.PI, 0.26);
  // bracket lamps on the north facade
  for (const x of [-12.9, 0.3, 5.3]) {
    kit.bx(parent, M.metal, '#4a4d52', x - 0.03, x + 0.03, PT + 2.35, PT + 2.4, zN - 0.35, zN);
    kit.bx(parent, M.lamp, '#fff1d0', x - 0.3, x + 0.3, PT + 2.26, PT + 2.33, zN - 0.4, zN - 0.3, { noOutline: true, cast: false });
    kit.bx(parent, M.metal, '#e8e8e2', x - 0.33, x + 0.33, PT + 2.33, PT + 2.37, zN - 0.42, zN - 0.28);
  }
}

// ---------------------------------------------------------------------------
function buildGarden(kit, parent) {
  const { M, ctx } = kit;
  const rng = ctx.rng(4242);
  // planter boxes under the south windows with pansies / tulips
  const planter = (x0, x1, z0, z1) => {
    kit.bx(parent, M.retaining, '#b9ada0', x0, x1, 0, 0.42, z0, z1, { uv: [2, 1] });
    kit.bx(parent, M.vc, '#7a5f48', x0 + 0.06, x1 - 0.06, 0.36, 0.4, z0 + 0.06, z1 - 0.06);
    const n = Math.round((x1 - x0) * 5);
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.12 + (i / n) * (x1 - x0 - 0.2) + rng.range(-0.04, 0.04);
      const z = (z0 + z1) / 2 + rng.range(-0.1, 0.1);
      kit.sphere(parent, M.vc, rng.pick(['#7fa865', '#8db86e', '#6f9a5a']), 0.1, x, 0.47, z, { sy: 0.7, ws: 6, hs: 4, noOutline: true });
      const col = rng.pick(['#f6d25a', '#f58fae', '#ffffff', '#b99ee0', '#f39a6a']);
      if (rng.chance(0.75)) kit.sphere(parent, M.vc, col, 0.045, x + rng.range(-0.05, 0.05), 0.56, z + rng.range(-0.05, 0.05), { ws: 6, hs: 4, noOutline: true });
    }
  };
  planter(-13.7, -11.0, B.zMax + 0.08, B.zMax + 0.5);
  planter(-10.4, -7.95, B.zMax + 0.08, B.zMax + 0.5);
  planter(1.7, 5.7, B.zMax + 0.08, B.zMax + 0.5);

  // low azalea hedge along the west wall (tree at -20.5,-20 keeps ~5 m clear)
  for (let z = -23.4; z < -15.3; z += 0.45) {
    const r = rng.range(0.28, 0.38);
    kit.sphere(parent, M.vc, rng.pick(['#6f9a5a', '#7fa865', '#648f52']), r, B.xMin - 0.45, r * 0.8, z, { sy: 0.85, ws: 8, hs: 6 });
    if (rng.chance(0.6)) kit.sphere(parent, M.vc, rng.pick(['#f58fae', '#f7a9c0', '#ffffff']), 0.08, B.xMin - 0.45 + rng.range(-0.2, 0.2), r * 1.35, z + rng.range(-0.15, 0.15), { ws: 6, hs: 4, noOutline: true });
  }
  // potted plants by the staff door and a watering can
  for (const [x, z] of [[B.xMax + 0.45, -22.6], [B.xMax + 0.45, -20.6]]) {
    kit.cyl(parent, M.vc, '#b86f4c', 0.16, 0.12, 0.3, x, 0, z, 10);
    kit.sphere(parent, M.vc, '#7fa865', 0.22, x, 0.42, z, { ws: 8, hs: 6 });
  }
  kit.cyl(parent, M.vc, '#5aa3c8', 0.1, 0.11, 0.22, B.xMax + 0.5, 0, -23.1, 10);
  kit.beam(parent, M.vc, '#5aa3c8', V(B.xMax + 0.5, 0.15, -23.0), V(B.xMax + 0.5, 0.27, -22.8), 0.03, 0.03);
}
