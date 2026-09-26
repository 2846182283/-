/**
 * Concourse interior (visible from the plaza and walkable):
 *   unpaid hall  : 2 ticket machines + fare chart, area map, timetables, IC signs,
 *                  notice board with posters, message chalkboard, stamp table,
 *                  waiting bench, umbrella rack, sorted bins, disaster-supplies
 *                  cabinet + AED, fire extinguisher, lost & found, no-smoking,
 *                  staff window (窓口) with counter, wall clock
 *   gate line    : 3 automatic gates + a staffed passage with a small booth,
 *                  LED departure board overhead
 *   paid area    : 9-step stair + a two-leg ramp (1:8) up to platform 1,
 *                  handrails, tactile blocks, posters
 *   office       : desks, chairs, shelves, cabinet, whiteboard (seen through windows)
 * Ceiling with warm fluorescent panels (unlit) — interior slightly warmer.
 */
import * as THREE from 'three';
import { STATION, PLATFORM } from '../../core/layout.js';
import { BLD } from './building.js';

const B = STATION.building;
const FY = B.floorY;
const PT = PLATFORM.top;
const IN = { x0: B.xMin + BLD.WT, x1: B.xMax - BLD.WT, z0: B.zMin + BLD.WT, z1: B.zMax - BLD.WT };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// key interior coordinates
export const INT = {
  officeX: BLD.OFFICE_X,
  gateZ: BLD.GATE_Z,
  cabinets: [-6.05, -5.15, -4.25, -3.35],
  boothX0: -1.5,
  stair: { x0: -5.8, x1: -2.4, z0: -21.3, steps: 9 },
  rampS: { x0: -12.35, x1: -6.3, z0: -21.2, z1: -20.0 }, // lower leg (rises westward)
  rampN: { x0: -12.35, x1: -7.55, z0: -23.75, z1: -22.45 }, // upper leg (rises eastward)
  landW: { x0: IN.x0, x1: -12.35 },
  yMid: FY + 0.7,
};

export function buildInterior(kit, S, parent, clocks) {
  buildPartitions(kit, S, parent, clocks);
  buildTicketHall(kit, S, parent, clocks);
  buildGates(kit, S, parent);
  buildStairRamp(kit, S, parent);
  buildOffice(kit, S, parent);
  buildCeiling(kit, parent);
  buildFloorMarks(kit, S, parent);
}

// ---------------------------------------------------------------------------
function buildPartitions(kit, S, parent, clocks) {
  const { M } = kit;
  const C = BLD.CEIL;
  const ox = INT.officeX;
  // office west wall: staff window (z -17.8..-19.2) + door to the paid area (z -22.9..-22.0)
  const win = { a: -19.2, b: -17.8, y0: 0.95, y1: 2.05 };
  const door = { a: -22.95, b: -22.05, y0: -1, y1: 2.15 };
  kit.wall(parent, M.wallIn, '#f5efe3', 'z', IN.z0, IN.z1, ox - 0.075, ox + 0.075, FY, C, [win, door], { uv: [2.5, 2.5] });
  kit.colliders.push([ox - 0.1, ox + 0.1, IN.z0, door.a], [ox - 0.1, ox + 0.1, door.b, IN.z1]);
  // wainscot on the concourse side
  kit.bx(parent, M.wood, '#b8946c', ox - 0.095, ox - 0.075, FY, 1.0, -17.8, IN.z1, { uv: [1, 1] });
  kit.bx(parent, M.wood, '#b8946c', ox - 0.095, ox - 0.075, FY, 0.95, -19.2, -17.8, { uv: [1, 1] });
  // staff window: frame, glass with a speaking grill, counter, cash tray
  {
    const x = ox - 0.075;
    kit.bx(parent, M.vc, '#6a4e3a', x - 0.04, x + 0.02, win.y0 - 0.02, win.y1 + 0.05, win.a - 0.05, win.a);
    kit.bx(parent, M.vc, '#6a4e3a', x - 0.04, x + 0.02, win.y0 - 0.02, win.y1 + 0.05, win.b, win.b + 0.05);
    kit.bx(parent, M.vc, '#6a4e3a', x - 0.04, x + 0.02, win.y1, win.y1 + 0.05, win.a, win.b);
    const gp = new THREE.PlaneGeometry(win.b - win.a, win.y1 - win.y0 - 0.1);
    gp.rotateY(-Math.PI / 2);
    gp.translate(ox, (win.y0 + 0.1 + win.y1) / 2, (win.a + win.b) / 2);
    kit.add(parent, gp, M.glass, null, { noOutline: true, cast: false });
    kit.cyl(parent, M.metal, '#c9ccd0', 0.09, 0.09, 0.01, ox - 0.005, 1.45, -18.5, 14, { rz: Math.PI / 2, noOutline: true });
    kit.bx(parent, M.wood, '#c49a6c', ox - 0.4, ox + 0.3, win.y0 - 0.04, win.y0, win.a - 0.1, win.b + 0.1, { uv: [1, 1] });
    kit.bx(parent, M.metal, '#9aa1a8', ox - 0.3, ox - 0.05, win.y0, win.y0 + 0.03, -18.75, -18.25);
    kit.board(parent, S.staffWin, 1.5, 0.32, ox - 0.1, 2.45, -18.5, -Math.PI / 2, { frameColor: '#26324f', thick: 0.04, kind: 'in' });
    // small bell + leaflet stand on the counter
    kit.cyl(parent, M.metal, '#d8b85a', 0.035, 0.045, 0.05, ox - 0.25, win.y0, -19.0, 10, { noOutline: true });
    kit.bx(parent, M.vc, '#f4f1ea', ox - 0.36, ox - 0.24, win.y0, win.y0 + 0.22, -17.95, -17.8);
    kit.decal(parent, S.posterHanami, 0.1, 0.14, ox - 0.37, win.y0 + 0.12, -17.875, -Math.PI / 2, { mat: kit.matFor(S.posterHanami, 'in') });
  }
  // office door (paid side)
  {
    const g = new THREE.Group();
    g.position.set(ox - 0.075, 0, (door.a + door.b) / 2);
    g.rotation.y = -Math.PI / 2;
    parent.add(g);
    kit.bx(g, M.vc, '#8b6b52', -0.43, 0.43, FY, 2.13, 0.0, 0.04);
    kit.bx(g, M.vc, '#6a4e3a', -0.47, 0.47, 2.13, 2.2, -0.02, 0.06);
    kit.cyl(g, M.metal, '#d8d8d4', 0.022, 0.022, 0.1, 0.33, 1.0, 0.04, 8, { rx: Math.PI / 2 });
    kit.decal(g, S.officeDoor, 0.5, 0.15, 0, 1.65, 0.045, 0, { mat: kit.matFor(S.officeDoor, 'in') });
  }
  // ticket-machine wall on the gate line (west part)
  const tz = INT.gateZ;
  kit.bx(parent, M.wallIn, '#f5efe3', IN.x0, INT.cabinets[0] - 0.1, FY, C, tz - 0.075, tz + 0.075, { uv: [2.5, 2.5] });
  kit.bx(parent, M.wood, '#b8946c', IN.x0, INT.cabinets[0] - 0.1, FY, 1.0, tz + 0.075, tz + 0.095, { uv: [1, 1] });
  kit.bx(parent, M.vc, '#e7dcc6', INT.cabinets[0] - 0.16, INT.cabinets[0] - 0.04, FY, C, tz - 0.12, tz + 0.12);
  kit.colliders.push([IN.x0, INT.cabinets[0] - 0.05, tz - 0.12, tz + 0.12]);
  // wall clock on the office wall, facing the entrance hall
  clocks.face(parent, ox - 0.09, 2.95, -16.3, -Math.PI / 2, 0.25);
}

// ---------------------------------------------------------------------------
function ticketMachine(kit, S, parent, x, z, ry, o = {}) {
  const { M } = kit;
  const g = new THREE.Group();
  g.position.set(x, FY, z);
  g.rotation.y = ry;
  parent.add(g);
  const w = 0.82, d = 0.6, body = o.body || '#b9d3e3', trimC = '#e9eef2';
  // body
  kit.bx(g, M.metal, body, -w / 2, w / 2, 0, 1.78, -d, 0.0);
  kit.bx(g, M.vc, '#8aa7ba', -w / 2 - 0.01, w / 2 + 0.01, 0, 0.08, -d - 0.01, 0.01);
  // lit header
  kit.bx(g, M.metal, '#2c3c5a', -w / 2, w / 2, 1.78, 1.98, -d + 0.1, 0.02);
  const head = o.head || S.tvmHead;
  kit.decal(g, head, w - 0.02, 0.18, 0, 1.88, 0.025, 0, { mat: kit.matFor(head, 'unlit') });
  // recessed, tilted touch screen
  const scr = new THREE.Group();
  scr.position.set(0, 1.28, 0.0);
  scr.rotation.x = -0.35;
  g.add(scr);
  kit.bx(scr, M.metal, trimC, -w / 2 + 0.03, w / 2 - 0.03, -0.22, 0.22, -0.05, 0.03);
  kit.decal(scr, S.tvmScreen, w - 0.14, 0.36, 0, 0.0, 0.035, 0, { mat: kit.matFor(S.tvmScreen, 'unlit') });
  // lower panel: coin / note / IC / ticket & change trays
  kit.bx(g, M.metal, trimC, -w / 2 + 0.03, w / 2 - 0.03, 0.3, 1.02, -0.02, 0.015);
  kit.decal(g, S.tvmPanel, w - 0.1, 0.7, 0, 0.66, 0.017, 0, { mat: kit.matFor(S.tvmPanel, 'in') });
  kit.bx(g, M.metal, '#6d7680', -0.26, 0.26, 0.34, 0.42, 0.0, 0.07); // change tray lip
  kit.bx(g, M.metal, '#9fb4c4', -w / 2 + 0.06, w / 2 - 0.06, 1.02, 1.07, -0.02, 0.1); // hand shelf
  // mascot sticker on the side
  if (o.sticker !== false) kit.decal(g, S.mascot, 0.18, 0.18, w / 2 + 0.002, 1.5, -0.3, Math.PI / 2, { mat: kit.matFor(S.mascot, 'in') });
}

function buildTicketHall(kit, S, parent, clocks) {
  const { M } = kit;
  const tz = INT.gateZ + 0.075; // south face of the ticket wall
  const wd = (region, w, h, x, y) => kit.decal(parent, region, w, h, x, y, tz + 0.006, 0, { mat: kit.matFor(region, 'in') });
  // ticket machines + fare chart
  ticketMachine(kit, S, parent, -9.8, tz + 0.6, 0);
  ticketMachine(kit, S, parent, -8.9, tz + 0.6, 0);
  kit.bx(parent, M.vc, '#26324f', -10.85, -7.85, 2.24, 3.47, tz, tz + 0.04);
  kit.decal(parent, S.fareChart, 2.9, 1.16, -9.35, 2.855, tz + 0.045, 0, { mat: kit.matFor(S.fareChart, 'in') });
  kit.bx(parent, M.lamp, '#fff6e2', -10.8, -7.9, 3.5, 3.53, tz + 0.02, tz + 0.12, { noOutline: true, cast: false });
  // area map (framed) + timetables + IC sign
  kit.bx(parent, M.vc, '#6a4e3a', -12.62, -10.98, 1.28, 2.52, tz, tz + 0.03);
  kit.decal(parent, S.areaMap, 1.54, 1.13, -11.8, 1.9, tz + 0.035, 0, { mat: kit.matFor(S.areaMap, 'in') });
  kit.board(parent, S.tt1, 0.48, 0.65, -7.45, 1.7, tz + 0.025, 0, { thick: 0.03, kind: 'in' });
  kit.board(parent, S.tt2, 0.48, 0.65, -6.8, 1.7, tz + 0.025, 0, { thick: 0.03, kind: 'in' });
  wd(S.icSign, 0.34, 0.34, -7.1, 2.55);
  wd(S.noSmokeSmall, 0.3, 0.28, -12.2, 2.95);
  // fire extinguisher box (red) at the west end of the wall
  kit.bx(parent, M.vc, '#c9372f', -13.1, -12.7, FY, FY + 0.72, tz, tz + 0.22);
  kit.decal(parent, S.fireBox, 0.34, 0.6, -12.9, FY + 0.38, tz + 0.225, 0, { mat: kit.matFor(S.fireBox, 'in') });

  // west wall: cork notice board with posters, chalk message board, bench
  const wx = IN.x0 + 0.005;
  {
    const zc = -17.4, w = 2.5, h = 1.5, y = 1.85;
    kit.bx(parent, M.wood, '#8a6446', wx, wx + 0.05, y - h / 2 - 0.06, y + h / 2 + 0.06, zc - w / 2 - 0.06, zc + w / 2 + 0.06, { uv: [1, 1] });
    const fx = wx + 0.052;
    const put = (r, ww, hh, dz, dy, rot = 0) => kit.decal(parent, r, ww, hh, fx + 0.002 + Math.abs(dz) * 0.0005, y + dy, zc + dz, Math.PI / 2, { rz: rot, mat: kit.matFor(r, 'in') });
    put(S.cork, w, h, 0, 0);
    put(S.posterSakura, 0.42, 0.6, -0.95, 0.2, 0.02);
    put(S.posterFest, 0.42, 0.6, -0.45, 0.25, -0.03);
    put(S.posterSafety, 0.42, 0.6, 0.05, 0.3, 0.01);
    put(S.posterHanami, 0.42, 0.6, 0.55, 0.22, 0.03);
    put(S.posterSummer, 0.4, 0.56, 1.0, 0.18, -0.05);
    put(S.kid1, 0.36, 0.26, -0.8, -0.42, -0.04);
    put(S.kid2, 0.36, 0.26, -0.3, -0.45, 0.05);
    put(S.kid3, 0.36, 0.26, 0.2, -0.42, -0.02);
    put(S.lostFound, 0.3, 0.42, 0.72, -0.4, 0.02);
    put(S.mascot, 0.16, 0.16, 1.08, -0.5, 0.2);
  }
  // bench under the notice board
  {
    const g = new THREE.Group();
    g.position.set(IN.x0 + 0.35, FY, -17.4);
    g.rotation.y = Math.PI / 2;
    parent.add(g);
    for (const lx of [-0.8, 0.8]) kit.bx(g, M.metal, '#4a4d52', lx - 0.03, lx + 0.03, 0, 0.42, -0.18, 0.18);
    for (let i = 0; i < 3; i++) kit.bx(g, M.wood, '#b0875f', -0.95, 0.95, 0.42, 0.46, -0.2 + i * 0.14, -0.08 + i * 0.14, { uv: [1, 1] });
  }
  // disaster supplies cabinet + AED in the west corner by the ticket wall
  {
    const x0 = IN.x0, z0 = -19.55, z1 = -18.55;
    kit.bx(parent, M.metal, '#dfe2e4', x0, x0 + 0.45, FY, FY + 1.8, z0, z1);
    kit.bx(parent, M.metal, '#c9ccd0', x0 + 0.45, x0 + 0.47, FY + 0.05, FY + 1.75, z0 + 0.04, (z0 + z1) / 2 - 0.01);
    kit.bx(parent, M.metal, '#c9ccd0', x0 + 0.45, x0 + 0.47, FY + 0.05, FY + 1.75, (z0 + z1) / 2 + 0.01, z1 - 0.04);
    kit.decal(parent, S.bousai, 0.8, 0.27, x0 + 0.475, FY + 1.45, (z0 + z1) / 2, Math.PI / 2, { mat: kit.matFor(S.bousai, 'in') });
    kit.bx(parent, M.metal, '#f3f3ef', x0, x0 + 0.2, FY + 0.95, FY + 1.35, z1 + 0.08, z1 + 0.48);
    kit.decal(parent, S.aed, 0.3, 0.3, x0 + 0.205, FY + 1.15, z1 + 0.28, Math.PI / 2, { mat: kit.matFor(S.aed, 'in') });
  }
  // south wall (inside): chalk message board between the windows, stamp table under the west window
  const sz = IN.z1 - 0.005;
  kit.decal(parent, S.dengon, 0.86, 0.55, -10.8, 1.65, sz, Math.PI, { mat: kit.matFor(S.dengon, 'in') });
  kit.bx(parent, M.vc, '#e9e2d2', -11.1, -10.5, 1.3, 1.34, sz - 0.08, sz); // chalk ledge
  kit.bx(parent, M.vc, '#ffffff', -10.9, -10.84, 1.34, 1.36, sz - 0.06, sz - 0.03, { noOutline: true });
  {
    // stamp table (スタンプ台)
    const x = -12.1, z = sz - 0.35;
    kit.bx(parent, M.wood, '#c49a6c', x - 0.5, x + 0.5, FY + 0.72, FY + 0.76, z - 0.3, z + 0.3, { uv: [1, 1] });
    for (const dx of [-0.44, 0.44]) for (const dz of [-0.24, 0.24]) kit.bx(parent, M.wood, '#8a6446', x + dx - 0.025, x + dx + 0.025, FY, FY + 0.72, z + dz - 0.025, z + dz + 0.025, { uv: [1, 1] });
    const ty = FY + 0.76;
    // stamp (handle + base), ink pad, paper stack, standing sign card, stamp book
    kit.cyl(parent, M.wood, '#8a6446', 0.03, 0.035, 0.09, x - 0.15, ty + 0.04, z, 10);
    kit.sphere(parent, M.wood, '#8a6446', 0.035, x - 0.15, ty + 0.14, z, { ws: 8, hs: 6 });
    kit.cyl(parent, M.vc, '#3a3d44', 0.05, 0.05, 0.04, x - 0.15, ty, z, 12);
    kit.bx(parent, M.vc, '#3a3d44', x + 0.02, x + 0.16, ty, ty + 0.02, z - 0.05, z + 0.05);
    kit.bx(parent, M.vc, '#c24a6a', x + 0.035, x + 0.145, ty + 0.02, ty + 0.023, z - 0.04, z + 0.04, { noOutline: true });
    kit.bx(parent, M.vc, '#fbf6ea', x + 0.22, x + 0.4, ty, ty + 0.03, z - 0.12, z + 0.12);
    kit.decal(parent, S.stampPrint, 0.12, 0.12, x + 0.31, ty + 0.032, z, 0, { rx: -Math.PI / 2, mat: kit.matFor(S.stampPrint, 'in') });
    const card = new THREE.Group();
    card.position.set(x, ty, z + 0.2);
    card.rotation.y = Math.PI;
    card.rotation.x = 0.0;
    parent.add(card);
    kit.box(card, M.vc, '#f4f1ea', 0.44, 0.22, 0.01, 0, 0.11, 0, { rx: -0.2 });
    kit.decal(card, S.stampSign, 0.42, 0.2, 0, 0.11, 0.008, 0, { rx: -0.2, mat: kit.matFor(S.stampSign, 'in') });
    kit.bx(parent, M.vc, '#ef8fae', x - 0.42, x - 0.26, ty, ty + 0.02, z - 0.12, z + 0.1);
  }
  // umbrella rack + sign by the entrance (east side)
  {
    const x = BLD.ENT1 + 0.75, z = sz - 0.3;
    kit.bx(parent, M.metal, '#9aa1a8', x - 0.45, x + 0.45, FY, FY + 0.05, z - 0.18, z + 0.18);
    kit.bx(parent, M.metal, '#9aa1a8', x - 0.45, x + 0.45, FY + 0.5, FY + 0.54, z - 0.18, z + 0.18);
    for (const dx of [-0.43, 0.43]) kit.bx(parent, M.metal, '#9aa1a8', x + dx - 0.02, x + dx + 0.02, FY, FY + 0.54, z - 0.18, z + 0.18);
    const cols = ['#3b7fd1', '#f58fae', '#2c3037', '#f2c230', '#6fbf8e', '#ffffff', '#d8484a'];
    cols.forEach((c, i) => {
      const ux = x - 0.36 + i * 0.12;
      const lean = (i % 2 ? 0.08 : -0.06);
      kit.cyl(parent, M.vc, c, 0.035, 0.012, 0.72, ux, FY + 0.05, z + (i % 2 ? 0.05 : -0.05), 6, { rz: lean });
      kit.beam(parent, M.vc, '#6a4e3a', V(ux - lean * 0.75, FY + 0.76, z), V(ux - lean * 0.75 + 0.06, FY + 0.86, z), 0.025, 0.025);
    });
    kit.decal(parent, S.umbrella, 0.62, 0.39, x, 1.35, sz, Math.PI, { mat: kit.matFor(S.umbrella, 'in') });
    kit.decal(parent, S.noSmoke, 0.3, 0.39, x + 0.02, 2.2, sz, Math.PI, { mat: kit.matFor(S.noSmoke, 'in') });
  }
  // sorted bins on the other side of the entrance
  sortedBinsIn(kit, S, parent, BLD.ENT0 - 0.85, sz - 0.24, Math.PI);
  // lost & found on the office wall
  kit.decal(parent, S.lostFound, 0.45, 0.63, INT.officeX - 0.08, 1.55, -16.2, -Math.PI / 2, { mat: kit.matFor(S.lostFound, 'in') });
}

function sortedBinsIn(kit, S, parent, x, z, ry) {
  const { M } = kit;
  const g = new THREE.Group();
  g.position.set(x, FY, z);
  g.rotation.y = ry;
  parent.add(g);
  const types = [[S.binCan, '#3b7fd1'], [S.binPet, '#2ea36a'], [S.binBurn, '#d8484a']];
  const w = 0.36, L = types.length * w;
  types.forEach(([lab, col], i) => {
    const cx = -L / 2 + w * (i + 0.5);
    kit.bx(g, M.metal, '#d5d9dd', cx - w / 2 + 0.01, cx + w / 2 - 0.01, 0, 0.85, -0.18, 0.18);
    kit.bx(g, M.vc, col, cx - w / 2 + 0.01, cx + w / 2 - 0.01, 0.85, 0.92, -0.19, 0.19);
    kit.cyl(g, M.vc, '#26282c', 0.06, 0.06, 0.012, cx, 0.92, 0.02, 12, { noOutline: true });
    kit.decal(g, lab, w - 0.06, (w - 0.06) * 0.55, cx, 0.68, 0.183, 0, { mat: kit.matFor(lab, 'in') });
  });
}

// ---------------------------------------------------------------------------
function gateCabinet(kit, S, parent, x, z0, z1, o = {}) {
  const { M } = kit;
  const w = 0.2;
  kit.bx(parent, M.metal, '#e4e7e9', x - w / 2, x + w / 2, FY, FY + 0.95, z1, z0);
  kit.bx(parent, M.vc, '#b9bfc5', x - w / 2 - 0.005, x + w / 2 + 0.005, FY, FY + 0.08, z1 - 0.005, z0 + 0.005);
  // top plate (dark), slightly wider
  kit.bx(parent, M.metal, '#4a5058', x - w / 2 - 0.02, x + w / 2 + 0.02, FY + 0.95, FY + 1.0, z1 - 0.02, z0 + 0.02);
  // IC pad near the entry end (south), tilted toward the passenger
  const pad = new THREE.Group();
  pad.position.set(x, FY + 1.02, z0 - 0.2);
  pad.rotation.x = 0.25;
  parent.add(pad);
  kit.bx(pad, M.metal, '#3a3f46', -0.1, 0.1, -0.02, 0.02, -0.1, 0.1);
  kit.decal(pad, S.icPad, 0.16, 0.16, 0, 0.022, 0, 0, { rx: -Math.PI / 2, mat: kit.matFor(S.icPad, 'unlit') });
  // ticket slot + return
  kit.bx(parent, M.vc, '#1f2226', x - 0.06, x + 0.06, FY + 1.0, FY + 1.01, z0 - 0.45, z0 - 0.42, { noOutline: true });
  kit.bx(parent, M.vc, '#1f2226', x - 0.06, x + 0.06, FY + 1.0, FY + 1.01, z1 + 0.3, z1 + 0.33, { noOutline: true });
  // end displays
  kit.decal(parent, o.inOk === false ? S.gateNo : S.gateIn, 0.16, 0.08, x, FY + 0.85, z0 + 0.003, 0, { mat: kit.matFor(S.gateIn, 'unlit') });
  kit.decal(parent, o.outOk === false ? S.gateNo : S.gateIn, 0.16, 0.08, x, FY + 0.85, z1 - 0.003, Math.PI, { mat: kit.matFor(S.gateIn, 'unlit') });
  // retracted flaps (slivers of orange at mid length on both sides)
  for (const s of [-1, 1]) kit.bx(parent, M.vc, '#e8744a', x + s * (w / 2) - 0.008, x + s * (w / 2) + 0.008, FY + 0.55, FY + 0.85, (z0 + z1) / 2 - 0.15, (z0 + z1) / 2 + 0.15, { noOutline: true });
  kit.colliders.push([x - 0.12, x + 0.12, z1, z0]);
}

function buildGates(kit, S, parent) {
  const { M } = kit;
  const z0 = INT.gateZ + 0.7, z1 = INT.gateZ - 0.7;
  INT.cabinets.forEach((x, i) => gateCabinet(kit, S, parent, x, z0, z1, { inOk: i !== 0, outOk: i !== 3 }));
  // fare adjustment machine on the paid side, facing passengers coming down from the platform
  ticketMachine(kit, S, parent, -0.35, INT.gateZ - 1.43, Math.PI, { body: '#bfdcc9', head: S.seisanHead, sticker: false });
  kit.colliders.push([-0.8, 0.1, INT.gateZ - 1.4, INT.gateZ - 0.75]);
  // staffed booth (有人改札) attached to the office
  const bx0 = INT.boothX0, bx1 = INT.officeX - 0.075, bz0 = INT.gateZ - 0.8, bz1 = INT.gateZ + 0.55;
  const col = '#e8e1d2';
  kit.bx(parent, M.vc, col, bx0, bx1, FY, FY + 1.0, bz0, bz0 + 0.06);
  kit.bx(parent, M.vc, col, bx0, bx1, FY, FY + 1.0, bz1 - 0.06, bz1);
  kit.bx(parent, M.vc, col, bx0, bx0 + 0.06, FY, FY + 1.0, bz0, bz1);
  // counter shelf on the passage side
  kit.bx(parent, M.wood, '#c49a6c', bx0 - 0.18, bx0 + 0.08, FY + 1.0, FY + 1.04, bz0 - 0.02, bz1 + 0.02, { uv: [1, 1] });
  // glass upper part + posts + roof
  for (const [x, z] of [[bx0, bz0], [bx0, bz1], [bx1, bz0], [bx1, bz1]]) kit.bx(parent, M.metal, '#b9bfc5', x - 0.03, x + 0.03, FY + 1.0, FY + 2.2, z - 0.03, z + 0.03);
  const gl = (w, h, x, y, z, ry) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); kit.add(parent, g, M.glass, null, { noOutline: true, cast: false }); };
  gl(bz1 - bz0, 1.15, bx0, FY + 1.62, (bz0 + bz1) / 2, Math.PI / 2);
  gl(bx1 - bx0, 1.15, (bx0 + bx1) / 2, FY + 1.62, bz0, 0);
  gl(bx1 - bx0, 1.15, (bx0 + bx1) / 2, FY + 1.62, bz1, 0);
  kit.bx(parent, M.vc, '#f4f1ea', bx0 - 0.08, bx1, FY + 2.2, FY + 2.32, bz0 - 0.08, bz1 + 0.08);
  kit.decal(parent, S.boothSign, 0.9, 0.225, (bx0 + bx1) / 2, FY + 2.26, bz1 + 0.081, 0, { mat: kit.matFor(S.boothSign, 'in') });
  // stool + desk inside
  kit.bx(parent, M.wood, '#c49a6c', bx0 + 0.1, bx1 - 0.1, FY + 0.72, FY + 0.76, bz0 + 0.1, bz0 + 0.55, { uv: [1, 1] });
  kit.cyl(parent, M.vc, '#3d6fb0', 0.18, 0.18, 0.06, (bx0 + bx1) / 2, FY + 0.45, INT.gateZ + 0.1, 12);
  kit.cyl(parent, M.metal, '#8f969d', 0.03, 0.03, 0.45, (bx0 + bx1) / 2, FY, INT.gateZ + 0.1, 6);
  kit.colliders.push([bx0, bx1, bz0, bz1]);
  // low swing gate in the staffed passage (open)
  const gx = bx0 - 0.02;
  kit.bx(parent, M.metal, '#b9bfc5', gx - 0.05, gx, FY, FY + 0.85, INT.gateZ - 0.05, INT.gateZ + 0.05);
  kit.bx(parent, M.metal, '#c9ccd0', gx - 0.04, gx - 0.01, FY + 0.35, FY + 0.8, INT.gateZ - 0.6, INT.gateZ - 0.05);

  // LED departure board hanging over the gates, facing the hall
  const lx = -4.7, lz = INT.gateZ + 0.2, ly = 3.2;
  for (const dx of [-0.7, 0.7]) kit.bx(parent, M.metal, '#8f969d', lx + dx - 0.01, lx + dx + 0.01, ly + 0.25, BLD.CEIL, lz - 0.01, lz + 0.01, { noOutline: true });
  kit.bx(parent, M.metal, '#3a3d44', lx - 0.86, lx + 0.86, ly - 0.26, ly + 0.26, lz - 0.08, lz + 0.08);
  kit.decal(parent, S.ledBoth, 1.64, 0.43, lx, ly, lz + 0.082, 0, { mat: kit.matFor(S.ledBoth, 'unlit') });
  kit.decal(parent, S.ledBoth, 1.64, 0.43, lx, ly, lz - 0.082, Math.PI, { mat: kit.matFor(S.ledBoth, 'unlit') });
  // IC signs on the first cabinet ends
  kit.decal(parent, S.icSign, 0.2, 0.2, INT.cabinets[1], FY + 0.6, z0 + 0.003, 0, { mat: kit.matFor(S.icSign, 'in') });
  kit.decal(parent, S.icSign, 0.2, 0.2, INT.cabinets[2], FY + 0.6, z0 + 0.003, 0, { mat: kit.matFor(S.icSign, 'in') });
}

// ---------------------------------------------------------------------------
function handrail(kit, parent, pts, o = {}) {
  const { M } = kit;
  const h = o.h ?? 0.85;
  const top = pts.map((p) => V(p.x, p.y + h, p.z));
  kit.tube(parent, M.metal, o.color || '#c9ccd0', top, 0.022, 8, { noOutline: false });
  if (o.low !== false) kit.tube(parent, M.metal, o.color || '#c9ccd0', pts.map((p) => V(p.x, p.y + 0.65, p.z)), 0.018, 8, { noOutline: false });
  for (const p of pts) kit.cyl(parent, M.metal, o.color || '#c9ccd0', 0.02, 0.02, h, p.x, p.y, p.z, 6);
}

function buildStairRamp(kit, S, parent) {
  const { M } = kit;
  const st = INT.stair;
  const n = st.steps, rise = (PT - FY) / n, run = (st.z0 - B.zMin) / n;
  // steps: solid blocks with dark anti-slip nosing
  for (let i = 1; i <= n; i++) {
    const za = st.z0 - (i - 1) * run, zb = st.z0 - i * run;
    const y = FY + i * rise;
    kit.bx(parent, M.concreteIn, '#ebe6dc', st.x0, st.x1, FY, y, zb, za, { uv: [6, 6] });
    kit.bx(parent, M.vc, '#5a5d63', st.x0 + 0.05, st.x1 - 0.05, y, y + 0.006, za - 0.06, za - 0.01, { noOutline: true, cast: false });
    kit.bx(parent, M.vc, '#f2c230', st.x0 + 0.05, st.x1 - 0.05, y, y + 0.007, za - 0.01, za, { noOutline: true, cast: false });
  }
  // stair side walls (east: short wall with rail; west: toward the upper ramp landing)
  const sideWall = (x0, x1) => kit.prism(parent, M.wallIn, '#efe8da', 'x', [[st.z0 + 0.02, FY], [B.zMin, FY], [B.zMin, PT + 0.95], [st.z0 + 0.02, FY + rise + 0.95]], x0, x1, { uv: [2.5, 2.5] });
  sideWall(st.x1, st.x1 + 0.12);
  kit.beam(parent, M.wood, '#b0875f', V(st.x1 + 0.06, FY + rise + 0.95, st.z0 + 0.02), V(st.x1 + 0.06, PT + 0.95, B.zMin), 0.18, 0.05, { under: true, uv: [1, 1] });
  kit.colliders.push([st.x1, st.x1 + 0.15, B.zMin, st.z0]);
  // handrails: west side + centre
  const railPts = (x) => [V(x, FY + rise, st.z0 + 0.2), V(x, FY + rise, st.z0 - 0.02), V(x, PT, B.zMin + 0.02), V(x, PT, B.zMin - 0.3)];
  handrail(kit, parent, railPts((st.x0 + st.x1) / 2), { low: false });
  handrail(kit, parent, railPts(st.x1 - 0.08).slice(1), { low: true });
  // warning dots at the bottom of the stair + "のぼり" arrow
  kit.bx(parent, M.tactileDot, null, st.x0, st.x1, FY, FY + 0.006, st.z0 + 0.05, st.z0 + 0.65, { uv: [0.3, 0.3], noOutline: true, cast: false });
  kit.decal(parent, S.stairSign, 2.6, 0.43, (st.x0 + st.x1) / 2, 3.3, st.z0 + 0.5, 0, { mat: kit.matFor(S.stairSign, 'in') });
  kit.bx(parent, M.vc, '#26324f', st.x0 + 0.38, st.x1 - 0.38, 3.08, 3.52, st.z0 + 0.46, st.z0 + 0.495);
  for (const dx of [-1.1, 1.1]) kit.bx(parent, M.metal, '#8f969d', (st.x0 + st.x1) / 2 + dx - 0.01, (st.x0 + st.x1) / 2 + dx + 0.01, 3.52, BLD.CEIL, st.z0 + 0.47, st.z0 + 0.49, { noOutline: true });

  // --- ramp: lower leg (east -> west), landing, upper leg (west -> east), top landing ---
  const rs = INT.rampS, rn = INT.rampN, ym = INT.yMid;
  const rampMat = M.concreteIn, rampCol = '#e2d9c8';
  // lower leg body: prism in the x-y plane between z0..z1
  kit.prism(parent, M.wallIn, '#efe8da', 'z', [[rs.x1, FY], [rs.x0, FY], [rs.x0, ym - 0.03], [rs.x1, FY - 0.03 + 0.001]], rs.z0, rs.z1, { uv: [2.5, 2.5] });
  kit.beam(parent, rampMat, rampCol, V(rs.x1, FY - 0.03, (rs.z0 + rs.z1) / 2), V(rs.x0, ym - 0.03, (rs.z0 + rs.z1) / 2), rs.z1 - rs.z0, 0.03, { under: true, uv: [6, 6] });
  // west landing (full depth between the two legs)
  kit.bx(parent, M.wallIn, '#efe8da', INT.landW.x0, INT.landW.x1, FY, ym - 0.03, rn.z0, rs.z1, { uv: [2.5, 2.5] });
  kit.bx(parent, rampMat, rampCol, INT.landW.x0, INT.landW.x1, ym - 0.03, ym, rn.z0, rs.z1, { uv: [6, 6] });
  // upper leg
  kit.prism(parent, M.wallIn, '#efe8da', 'z', [[rn.x0, FY], [rn.x1, FY], [rn.x1, PT - 0.03], [rn.x0, ym - 0.03]], rn.z0, rn.z1, { uv: [2.5, 2.5] });
  kit.beam(parent, rampMat, rampCol, V(rn.x0, ym - 0.03, (rn.z0 + rn.z1) / 2), V(rn.x1, PT - 0.03, (rn.z0 + rn.z1) / 2), rn.z1 - rn.z0, 0.03, { under: true, uv: [6, 6] });
  // top landing next to the stair, open to the platform
  kit.bx(parent, M.wallIn, '#efe8da', rn.x1, st.x0, FY, PT - 0.03, rn.z0 - 0.25, rn.z1, { uv: [2.5, 2.5] });
  kit.bx(parent, rampMat, rampCol, rn.x1, st.x0, PT - 0.03, PT, rn.z0 - 0.25, rn.z1, { uv: [6, 6] });
  // guard walls with wooden caps + handrails along the ramp legs
  const guard = (pts, x0, x1, z0, z1) => {
    kit.prism(parent, M.wallIn, '#efe8da', 'z', pts, z0, z1, { uv: [2.5, 2.5] });
  };
  // lower leg, north side (toward the gap)
  guard([[rs.x1, FY], [rs.x0, ym], [rs.x0, ym + 0.9], [rs.x1, FY + 0.9]], rs.x0, rs.x1, rs.z0 - 0.1, rs.z0);
  // upper leg, south side
  guard([[rn.x0, ym], [rn.x1, PT], [rn.x1, PT + 0.9], [rn.x0, ym + 0.9]], rn.x0, rn.x1, rn.z1, rn.z1 + 0.1);
  handrail(kit, parent, [V(rs.x1 + 0.2, FY, rs.z1 - 0.06), V(rs.x1, FY, rs.z1 - 0.06), V(rs.x0 + 0.05, ym, rs.z1 - 0.06), V(INT.landW.x0 + 0.1, ym, rs.z1 - 0.06)]);
  handrail(kit, parent, [V(INT.landW.x0 + 0.08, ym, rs.z1 - 0.2), V(INT.landW.x0 + 0.08, ym, rn.z0 + 0.2)], { low: true });
  handrail(kit, parent, [V(rn.x0 - 1.3, ym, rn.z0 + 0.06), V(rn.x0, ym, rn.z0 + 0.06), V(rn.x1, PT, rn.z0 + 0.06), V(rn.x1 + 0.5, PT, rn.z0 + 0.06)]);
  // guard between the top landing and the stair
  handrail(kit, parent, [V(st.x0 - 0.04, PT, rn.z1 - 0.05), V(st.x0 - 0.04, PT, B.zMin + 0.05)], { low: true });
  kit.colliders.push([rs.x0, rs.x1, rs.z0 - 0.1, rs.z1], [rn.x0, rn.x1, rn.z0, rn.z1 + 0.1]);
  // tactile guide line on the lower leg + posters along the ramp walls
  kit.decal(parent, S.stairArrowUp, 0.8, 0.4, (rs.x0 + rs.x1) / 2 + 1.5, FY + (ym - FY) * 0.25 + 0.012, (rs.z0 + rs.z1) / 2, Math.PI / 2, { rx: -Math.PI / 2, rz: 0, mat: kit.matFor(S.stairArrowUp, 'floor') });
  const wallZ = IN.z0 + 0.006;
  const posters = [S.posterSafety, S.posterSakura, S.kid2, S.posterFest, S.posterHanami];
  posters.forEach((r, i) => {
    const x = -13.0 + i * 1.05;
    const kid = r === S.kid2;
    kit.decal(parent, r, kid ? 0.5 : 0.52, kid ? 0.37 : 0.74, x, PT + 1.25 + (x + 13) * 0.05, wallZ, 0, { mat: kit.matFor(r, 'in') });
  });
  // spine wall between the two legs (wood cap); posters face the lower leg / gates
  const spineTop = 2.5;
  kit.bx(parent, M.wallIn, '#efe8da', rn.x0, rs.x1, FY, spineTop, rn.z1 + 0.1, rs.z0 - 0.1, { uv: [2.5, 2.5] });
  kit.bx(parent, M.wood, '#b0875f', rn.x0, rs.x1 + 0.03, spineTop, spineTop + 0.05, rn.z1 + 0.05, rs.z0 - 0.05, { uv: [1, 1] });
  [S.posterFest, S.kid3, S.posterSakura, S.adJuku].forEach((r, i) => {
    const x = -11.2 + i * 1.3;
    const ad = r === S.adJuku, kid = r === S.kid3;
    const w = ad ? 1.0 : kid ? 0.5 : 0.46, h = ad ? 0.34 : kid ? 0.37 : 0.66;
    const yb = FY + (ym - FY) * ((rs.x1 - x) / (rs.x1 - rs.x0)) + 0.95; // above the handrail line
    kit.decal(parent, r, w, h, x, Math.min(spineTop - h / 2 - 0.05, yb + h / 2), rs.z0 - 0.095, 0, { mat: kit.matFor(r, 'in') });
  });
  // fire extinguisher at the foot of the ramp
  kit.cyl(parent, M.vc, '#d33a31', 0.08, 0.08, 0.5, -6.0, FY, -21.05, 10);
  kit.cyl(parent, M.vc, '#26282c', 0.02, 0.02, 0.08, -6.0, FY + 0.5, -21.05, 6);
}

// ---------------------------------------------------------------------------
function buildOffice(kit, S, parent) {
  const { M } = kit;
  const x0 = INT.officeX + 0.075, x1 = IN.x1, z0 = IN.z0;
  // two facing desks with monitors, chairs
  const desk = (x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, FY, z);
    g.rotation.y = ry;
    parent.add(g);
    kit.bx(g, M.vcIn, '#c9c3b6', -0.6, 0.6, 0.7, 0.74, -0.35, 0.35);
    kit.bx(g, M.vcIn, '#9aa1a8', -0.58, -0.3, 0, 0.7, -0.33, 0.33);
    kit.bx(g, M.vcIn, '#9aa1a8', 0.56, 0.6, 0, 0.7, -0.33, 0.33);
    kit.bx(g, M.vcIn, '#3a3d44', -0.22, 0.22, 0.8, 1.1, -0.2, -0.16);
    kit.bx(g, M.vcIn, '#3a3d44', -0.03, 0.03, 0.74, 0.8, -0.2, -0.14);
    kit.bx(g, M.vcIn, '#f4f1ea', 0.25, 0.5, 0.74, 0.76, -0.1, 0.15);
    // chair
    kit.bx(g, M.vcIn, '#3d6fb0', -0.22, 0.22, 0.44, 0.5, 0.45, 0.85);
    kit.bx(g, M.vcIn, '#3d6fb0', -0.22, 0.22, 0.5, 0.95, 0.83, 0.88);
    kit.cyl(g, M.vcIn, '#555b62', 0.03, 0.03, 0.44, 0, 0, 0.65, 6);
  };
  desk(3.3, -18.0, Math.PI);
  desk(3.3, -19.4, 0);
  desk(4.9, -16.6, Math.PI);
  // shelves with binders along the north wall
  kit.bx(parent, M.vcIn, '#d8d2c4', x0 + 0.2, x1 - 0.1, FY, FY + 1.9, z0, z0 + 0.4);
  const rng = kit.ctx.rng(515);
  for (let r = 0; r < 3; r++) {
    for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.07) {
      kit.bx(parent, M.vcIn, rng.pick(['#3b7fd1', '#e8e2d2', '#d8484a', '#6fbf8e', '#f2c230']), x, x + 0.06, FY + 0.35 + r * 0.55, FY + 0.35 + r * 0.55 + rng.range(0.25, 0.32), z0 + 0.4, z0 + 0.42, { noOutline: true });
    }
  }
  // filing cabinet + kettle + whiteboard + calendar
  kit.bx(parent, M.vcIn, '#c9ccd0', x1 - 0.5, x1, FY, FY + 1.3, -21.3, -20.6);
  kit.cyl(parent, M.vcIn, '#e9e8e2', 0.08, 0.1, 0.2, x1 - 0.25, FY + 1.3, -20.95, 10);
  kit.bx(parent, M.vcIn, '#f7f7f4', x1 - 0.03, x1, 1.2, 2.2, -19.8, -18.2);
  kit.bx(parent, M.vcIn, '#9aa1a8', x1 - 0.05, x1, 1.18, 1.22, -19.85, -18.15);
  kit.decal(parent, S.posterSakura, 0.36, 0.5, x1 - 0.01, 1.6, -22.6, -Math.PI / 2, { mat: kit.matFor(S.posterSakura, 'in') });
  // station master's cap on a hook by the door
  kit.cyl(parent, M.vcIn, '#26324f', 0.13, 0.11, 0.08, INT.officeX + 0.25, 1.75, -21.6, 12);
  kit.cyl(parent, M.vcIn, '#1f2226', 0.14, 0.14, 0.015, INT.officeX + 0.25, 1.74, -21.55, 12);
  kit.bx(parent, M.vcIn, '#d8b85a', INT.officeX + 0.22, INT.officeX + 0.28, 1.78, 1.81, -21.49, -21.47);
}

// ---------------------------------------------------------------------------
function buildCeiling(kit, parent) {
  const { M } = kit;
  const C = BLD.CEIL;
  kit.bx(parent, M.vcIn, '#f4f0e6', IN.x0, IN.x1, C, C + 0.06, IN.z0, IN.z1);
  // cornice
  kit.bx(parent, M.vcIn, '#e5dccb', IN.x0, IN.x1, C - 0.08, C, IN.z1 - 0.06, IN.z1);
  kit.bx(parent, M.vcIn, '#e5dccb', IN.x0, IN.x1, C - 0.08, C, IN.z0, IN.z0 + 0.06);
  // warm fluorescent panels
  const panel = (x, z) => {
    kit.bx(parent, M.vcIn, '#e9e6de', x - 0.66, x + 0.66, C - 0.06, C, z - 0.2, z + 0.2);
    kit.bx(parent, M.lamp, '#fff1d2', x - 0.6, x + 0.6, C - 0.075, C - 0.06, z - 0.14, z + 0.14, { noOutline: true, cast: false });
  };
  for (const z of [-16.4, -18.3]) for (let x = -12.2; x < 0.5; x += 2.6) panel(x, z);
  for (const z of [-21.0, -22.9]) for (let x = -12.2; x < 0.5; x += 2.6) panel(x, z);
  panel(3.4, -17.2);
  panel(3.4, -20.8);
}

// ---------------------------------------------------------------------------
function buildFloorMarks(kit, S, parent) {
  const { M } = kit;
  const y0 = FY, y1 = FY + 0.006;
  const lin = (x0, x1, z0, z1, alongX) => {
    const m = kit.bx(parent, M.tactileLine, null, x0, x1, y0, y1, z0, z1, { uv: [0.3, 0.3], noOutline: true, cast: false });
    if (alongX) {
      const uv = m.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setX(i, uv.getY(i)); uv.setY(i, u); }
    }
  };
  const dot = (x0, x1, z0, z1) => kit.bx(parent, M.tactileDot, null, x0, x1, y0, y1, z0, z1, { uv: [0.3, 0.3], noOutline: true, cast: false });
  const gx = -3.8;
  // entrance -> junction
  lin(gx - 0.15, gx + 0.15, -18.2, IN.z1, false);
  dot(gx - 0.15, gx + 0.15, -18.5, -18.2);
  // junction -> ticket machines
  lin(-9.2, gx - 0.15, -18.5, -18.2, true);
  dot(-9.8, -9.2, -18.8, -18.2);
  // junction -> gate
  dot(gx - 0.15, gx + 0.15, -18.95, -18.65);
  // after the gate -> stair
  lin(gx - 0.15, gx + 0.15, INT.stair.z0 + 0.65, INT.gateZ - 0.75, false);
  // a few petals blown in through the open doors
  for (const [x, z, r, w] of [[-5.6, -15.55, 0.4, 0.8], [-2.3, -15.8, -0.3, 0.6], [-6.4, -16.9, 1.2, 0.5], [-1.4, -17.2, 2.2, 0.45]]) {
    kit.decal(parent, S.petals, w, w * 0.5, x, FY + 0.011, z, r, { rx: -Math.PI / 2, mat: kit.matFor(S.petals, 'floor') });
  }
  // threshold mat inside the entrance
  kit.bx(parent, M.vcIn, '#8a7b6c', BLD.ENT0 + 0.3, gx - 0.3, FY, FY + 0.008, IN.z1 - 1.2, IN.z1 - 0.1, { noOutline: true, cast: false });
  kit.bx(parent, M.vcIn, '#8a7b6c', gx + 0.3, BLD.ENT1 - 0.3, FY, FY + 0.008, IN.z1 - 1.2, IN.z1 - 0.1, { noOutline: true, cast: false });
}
