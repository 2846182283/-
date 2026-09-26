/**
 * props/vehicles.js — parked / waiting cars at SPOTS.vehicles:
 *   kei-van-white        白い軽バン of the flower shop (panel sides with livery)
 *   kei-car              tall kei wagon, pastel two-tone
 *   retro-taxi           boxy 90s-style sedan, butter-yellow with a green belt,
 *                        roof lamp (行灯), fender mirrors, chrome bumpers
 *   kei-car-waiting-...  kei car waiting north of the level crossing
 *
 * Bodies are side-profile shapes extruded across the width (small bevel so
 * the silhouette reads soft and toon-like) with the wheel arches cut out; the
 * greenhouse is a dark glass extrusion with pillars / roof on top and simple
 * seats + dashboard + steering wheel inside so the glass has something to show.
 */
import * as THREE from 'three';
import { SPOTS, ROADS, ROAD_MARKINGS, groundY } from '../../core/layout.js';
import { surfaceY } from './common.js';

/** Side-profile shape (z forward -> shape x, y up) with semicircular wheel arches cut into the bottom edge. */
function profileShape(pts, arches, bottomY) {
  const s = new THREE.Shape();
  // pts run from the rear-bottom corner forward along the top and back; we rebuild the bottom edge with arches
  const [rz] = pts[0];
  s.moveTo(rz, bottomY);
  const sorted = [...arches].sort((a, b) => a.z - b.z);
  for (const a of sorted) {
    s.lineTo(a.z - a.r, bottomY);
    s.absarc(a.z, bottomY, a.r, Math.PI, 0, true);
  }
  const front = pts[pts.length - 1];
  s.lineTo(front[0], bottomY);
  // then the upper outline from the front back to the rear
  for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

function polyShape(pts) {
  const s = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  return s;
}

/** Extrude a (z,y) profile across the car width; returns after adding to the kit. */
function sideExtrude(kit, shape, width, mat, color, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  // shape x -> car z, extrusion z -> car x
  g.rotateY(-Math.PI / 2);
  return kit.add(g, mat, color, { m: new THREE.Matrix4() });
}

function wheelSet(kit, sp) {
  const { wheelBase, wheelR, W } = sp;
  for (const z of [wheelBase / 2, -wheelBase / 2]) {
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.1);
      kit.cyl(wheelR, wheelR, 0.17, x, wheelR, z, 'vc', '#2a2c30', { rz: Math.PI / 2, center: true, seg: 18 });
      kit.cyl(wheelR * 0.62, wheelR * 0.66, 0.02, x + sx * 0.08, wheelR, z, 'metal', sp.hub || '#c9cdd2', { rz: Math.PI / 2, center: true, seg: 14, no: true });
      kit.cyl(wheelR * 0.18, wheelR * 0.18, 0.02, x + sx * 0.095, wheelR, z, 'metal', '#9aa1a8', { rz: Math.PI / 2, center: true, seg: 8, no: true, cast: false });
    }
    // dark wheel well blocking the view through the arches
    kit.box(W - 0.4, wheelR * 1.1, wheelR * 2.2, 0, wheelR + 0.1, z, 'vc', '#2c2f36', { no: true, cast: false });
  }
  kit.box(W - 0.3, 0.12, sp.L - 0.5, 0, sp.bottomY - 0.02, 0, 'vc', '#33363d', { no: true, cast: false });
}

/** Pillars along greenhouse edges on both sides + roof slab + windscreen frame. */
function greenhouseFrame(kit, sp) {
  const x = sp.W / 2 - sp.tumble - 0.012;
  for (const sx of [-1, 1]) {
    for (const [a, b] of sp.pillars) kit.bar([sx * x, a[1], a[0]], [sx * x, b[1], b[0]], 0.05, 0.06, 'vc', sp.pillarColor || sp.roofColor || sp.body);
    // window sill trim
    kit.bar([sx * (x + 0.01), sp.belt + 0.01, sp.sill[0]], [sx * (x + 0.01), sp.belt + 0.01, sp.sill[1]], 0.02, 0.025, 'vc', '#3a3e46', { no: true });
  }
  // roof
  const [rz0, rz1] = sp.roofZ;
  kit.rbox(sp.W - sp.tumble * 2 + 0.02, 0.06, rz1 - rz0 + 0.04, 0.025, 0, sp.roofY, (rz0 + rz1) / 2, 'vc', sp.roofColor || sp.body);
  // windscreen cross members
  for (const [z, y] of sp.wsEdges) kit.bar([-x, y, z], [x, y, z], 0.05, 0.05, 'vc', sp.pillarColor || sp.roofColor || sp.body, { no: true });
}

function interior(kit, sp) {
  const seat = '#8a8f9a';
  const zF = sp.seatZ[0];
  for (const sx of [-1, 1]) {
    kit.box(0.46, 0.14, 0.48, sx * 0.3, sp.floorY + 0.2, zF, 'vc', seat, { no: true, cast: false });
    kit.box(0.46, 0.62, 0.12, sx * 0.3, sp.floorY + 0.55, zF - 0.26, 'vc', seat, { rx: -0.15, no: true, cast: false });
    kit.box(0.24, 0.14, 0.1, sx * 0.3, sp.floorY + 0.94, zF - 0.31, 'vc', seat, { no: true, cast: false });
  }
  if (sp.seatZ[1] !== undefined) {
    kit.box(sp.W - 0.3, 0.14, 0.5, 0, sp.floorY + 0.2, sp.seatZ[1], 'vc', seat, { no: true, cast: false });
    kit.box(sp.W - 0.3, 0.6, 0.12, 0, sp.floorY + 0.55, sp.seatZ[1] - 0.28, 'vc', seat, { rx: -0.12, no: true, cast: false });
  }
  // dashboard + steering wheel (right-hand drive: driver on +X... Japan = right seat; car's right = -X)
  kit.box(sp.W - 0.2, 0.2, 0.36, 0, sp.dashY, sp.dashZ, 'vc', '#4a4d55', { no: true, cast: false });
  kit.torus(0.17, 0.018, -0.3, sp.dashY + 0.12, sp.dashZ - 0.28, 'vc', '#2a2c30', { rx: -0.45, rs: 4, ts: 14, no: true, cast: false });
}

/** Lights, plates, bumpers, mirrors, handles. */
function trims(kit, sp) {
  const L2 = sp.L / 2;
  const S = kit.S;
  // bumpers
  kit.rbox(sp.W + 0.02, 0.16, 0.14, 0.05, 0, sp.bumperY, L2 - 0.03, sp.chrome ? 'metal' : 'vc', sp.chrome ? '#dfe3e8' : sp.bumper || '#c9ccd0');
  kit.rbox(sp.W + 0.02, 0.16, 0.14, 0.05, 0, sp.bumperY, -L2 + 0.03, sp.chrome ? 'metal' : 'vc', sp.chrome ? '#dfe3e8' : sp.bumper || '#c9ccd0');
  // plates
  kit.plane(0.33, 0.165, 0, sp.bumperY + 0.02, L2 + 0.045, 'texS', '#ffffff', { region: S(sp.plate) });
  kit.plane(0.33, 0.165, 0, sp.rearPlateY, -L2 - 0.012, 'texS', '#ffffff', { region: S(sp.plate), ry: Math.PI });
  // grille
  kit.box(sp.grille[0], sp.grille[1], 0.03, 0, sp.grille[2], L2 - 0.005, sp.chrome ? 'metal' : 'vc', sp.chrome ? '#cfd4da' : '#3a3e46');
  if (sp.chrome) for (let i = 0; i < 4; i++) kit.box(sp.grille[0] - 0.04, 0.012, 0.01, 0, sp.grille[2] - sp.grille[1] / 2 + (i + 0.5) * sp.grille[1] / 4, L2 + 0.015, 'vc', '#5a5e66', { no: true, cast: false });
  // head / tail / turn lamps
  for (const sx of [-1, 1]) {
    const hx = sx * (sp.W / 2 - sp.lampW / 2 - 0.06);
    kit.box(sp.lampW, sp.lampH, 0.03, hx, sp.lampY, L2 - 0.005 + sp.lampZ, 'glow', '#f4f2e8');
    kit.box(sp.lampW + 0.03, sp.lampH + 0.03, 0.02, hx, sp.lampY, L2 - 0.015 + sp.lampZ, 'vc', '#6a6e76', { no: true, cast: false });
    kit.box(0.1, 0.05, 0.03, sx * (sp.W / 2 - 0.08), sp.bumperY + 0.06, L2 + 0.03, 'glow', '#ffb04a');
    kit.box(0.14, sp.tailH, 0.03, sx * (sp.W / 2 - 0.1), sp.tailY, -L2 + 0.005, 'vc', '#d8433d', { no: true });
    kit.box(0.14, 0.04, 0.03, sx * (sp.W / 2 - 0.1), sp.tailY - sp.tailH / 2 - 0.03, -L2 + 0.005, 'vc', '#ffb04a', { no: true, cast: false });
    // mirrors
    if (sp.fenderMirror) {
      const mz = L2 - 0.55;
      kit.beam([sx * (sp.W / 2 - 0.14), sp.hoodY, mz], [sx * (sp.W / 2 - 0.1), sp.hoodY + 0.2, mz + 0.05], 0.01, 'vc', '#2a2c30', { seg: 4, no: true });
      kit.rbox(0.07, 0.07, 0.1, 0.02, sx * (sp.W / 2 - 0.1), sp.hoodY + 0.23, mz + 0.05, 'vc', '#2a2c30');
    } else {
      const [mz, my] = sp.mirror;
      kit.box(0.1, 0.03, 0.06, sx * (sp.W / 2 + 0.02), my, mz, 'vc', sp.body, { no: true });
      kit.rbox(0.07, 0.11, 0.14, 0.025, sx * (sp.W / 2 + 0.08), my + 0.04, mz - 0.02, 'vc', sp.mirrorColor || sp.body);
    }
    // door handles + seams
    for (const z of sp.handles) kit.box(0.02, 0.025, 0.12, sx * (sp.W / 2 + 0.005), sp.belt - 0.08, z, 'metal', '#c9cdd2', { no: true, cast: false });
    for (const z of sp.seams) kit.box(0.01, sp.belt - sp.bottomY - 0.12, 0.012, sx * (sp.W / 2 + 0.002), (sp.belt + sp.bottomY) / 2 + 0.02, z, 'vc', '#6a6e76', { no: true, cast: false });
  }
  // wipers
  for (const sx of [-0.35, 0.15]) {
    const [z0, y0] = sp.wsEdges[0];
    kit.bar([sx, y0 + 0.03, z0 - 0.02], [sx + 0.38, y0 + 0.1, z0 - 0.1], 0.015, 0.012, 'vc', '#2a2c30', { no: true, cast: false });
  }
}

const SPECS = {
  'kei-van-white': () => ({
    L: 3.39, W: 1.47, wheelBase: 2.43, wheelR: 0.28, bottomY: 0.3, belt: 1.02, roofY: 1.84, floorY: 0.5, tumble: 0.05,
    body: '#f4f4f0', bumper: '#c9ccd0', plate: 'plateVan',
    upper: [[-1.69, 0.3], [-1.7, 1.02], [-1.68, 1.78], [-1.6, 1.82], [0.47, 1.82], [0.47, 1.02], [1.48, 1.02], [1.62, 0.95], [1.7, 0.62], [1.69, 0.3]],
    glass: [[0.45, 1.0], [0.45, 1.8], [1.02, 1.8], [1.5, 1.0]],
    rearGlass: [[-1.69, 1.18], [-1.69, 1.7]],
    pillars: [[[1.5, 1.02], [1.02, 1.8]], [[0.47, 1.02], [0.47, 1.8]]],
    wsEdges: [[1.49, 1.03], [1.03, 1.79]],
    roofZ: [-1.68, 1.04], sill: [0.47, 1.5],
    seatZ: [0.35], dashY: 1.0, dashZ: 1.25,
    bumperY: 0.42, rearPlateY: 0.62, grille: [0.7, 0.12, 0.72], lampW: 0.26, lampH: 0.14, lampY: 0.78, lampZ: -0.06, tailY: 0.8, tailH: 0.26,
    hoodY: 0.95, mirror: [1.42, 1.06], handles: [1.1, 0.25], seams: [1.52, 0.46, -0.7], livery: true,
  }),
  'kei-car': () => ({
    L: 3.395, W: 1.475, wheelBase: 2.45, wheelR: 0.28, bottomY: 0.32, belt: 1.0, roofY: 1.66, floorY: 0.45, tumble: 0.07,
    body: '#bfe0cf', roofColor: '#f6f4ee', mirrorColor: '#f6f4ee', bumper: '#bfe0cf', plate: 'plateKei',
    upper: [[-1.69, 0.32], [-1.71, 0.95], [-1.66, 1.02], [1.22, 1.0], [1.58, 0.88], [1.7, 0.62], [1.69, 0.32]],
    glass: [[-1.66, 1.0], [-1.58, 1.64], [0.72, 1.64], [1.22, 0.98]],
    pillars: [[[1.22, 1.0], [0.72, 1.64]], [[-0.02, 1.0], [-0.02, 1.64]], [[-1.66, 1.0], [-1.58, 1.64]], [[-1.2, 1.0], [-1.18, 1.64]]],
    wsEdges: [[1.2, 1.0], [0.74, 1.62]],
    roofZ: [-1.6, 0.74], sill: [-1.66, 1.22],
    seatZ: [0.35, -0.75], dashY: 0.95, dashZ: 1.0,
    bumperY: 0.42, rearPlateY: 0.66, grille: [0.62, 0.1, 0.62], lampW: 0.3, lampH: 0.13, lampY: 0.8, lampZ: -0.06, tailY: 0.86, tailH: 0.22,
    hoodY: 0.9, mirror: [1.1, 1.05], handles: [0.3, -0.6], seams: [1.15, 0.0, -1.1],
  }),
  'kei-car-waiting-at-crossing': () => ({
    ...SPECS['kei-car'](), body: '#a9cbe6', bumper: '#a9cbe6', plate: 'plateKei2',
  }),
  'retro-taxi': () => ({
    L: 4.6, W: 1.69, wheelBase: 2.68, wheelR: 0.31, bottomY: 0.34, belt: 0.92, roofY: 1.46, floorY: 0.45, tumble: 0.09,
    body: '#f2da8c', roofColor: '#f2da8c', pillarColor: '#f2da8c', chrome: true, hub: '#e2e6ea', plate: 'plateTaxi', mirrorColor: '#2a2c30',
    upper: [[-2.3, 0.34], [-2.33, 0.62], [-2.28, 0.9], [-1.42, 0.93], [1.2, 0.9], [2.26, 0.82], [2.33, 0.62], [2.3, 0.34]],
    glass: [[-1.4, 0.92], [-0.78, 1.44], [0.55, 1.44], [1.2, 0.9]],
    pillars: [[[1.2, 0.92], [0.55, 1.44]], [[-0.1, 0.92], [-0.1, 1.44]], [[-1.4, 0.93], [-0.78, 1.44]]],
    wsEdges: [[1.18, 0.93], [0.57, 1.42]],
    roofZ: [-0.8, 0.58], sill: [-1.4, 1.2],
    seatZ: [0.3, -0.75], dashY: 0.88, dashZ: 0.95,
    bumperY: 0.46, rearPlateY: 0.72, grille: [0.9, 0.16, 0.7], lampW: 0.34, lampH: 0.12, lampY: 0.7, lampZ: -0.04, tailY: 0.72, tailH: 0.16,
    hoodY: 0.86, fenderMirror: true, handles: [0.35, -0.55], seams: [1.1, -0.1, -1.3], taxi: true,
  }),
};

/** Build one vehicle in the current frame. */
export function vehicle(kit, kind) {
  const sp = SPECS[kind]();
  const arches = [{ z: sp.wheelBase / 2, r: sp.wheelR + 0.05 }, { z: -sp.wheelBase / 2, r: sp.wheelR + 0.05 }];
  // lower body (+ the van's panel sides) with a soft bevel
  sideExtrude(kit, profileShape(sp.upper, arches, sp.bottomY), sp.W, 'vc', sp.body, 0.035);
  // greenhouse glass (narrower = tumblehome), interior, frame
  sideExtrude(kit, polyShape(sp.glass), sp.W - sp.tumble * 2, 'glassDark', '#ffffff');
  if (sp.rearGlass) kit.plane(sp.W - 0.3, sp.rearGlass[1][1] - sp.rearGlass[0][1], 0, (sp.rearGlass[0][1] + sp.rearGlass[1][1]) / 2, sp.rearGlass[0][0] - 0.012, 'glassDark', '#ffffff', { ry: Math.PI });
  interior(kit, sp);
  greenhouseFrame(kit, sp);
  wheelSet(kit, sp);
  trims(kit, sp);
  const S = kit.S;
  if (sp.livery) {
    for (const sx of [-1, 1]) kit.plane(2.0, 0.5, sx * (sp.W / 2 + 0.004), 1.38, -0.62, 'texS', '#ffffff', { ry: sx * Math.PI / 2, region: S('vanSide') });
    // roof rack
    for (const z of [-1.4, -0.4]) kit.box(sp.W - 0.2, 0.03, 0.04, 0, sp.roofY + 0.09, z, 'metal', '#3a3e46', { no: true });
    for (const sx of [-1, 1]) kit.box(0.04, 0.05, 1.3, sx * (sp.W / 2 - 0.12), sp.roofY + 0.1, -0.9, 'metal', '#3a3e46');
  }
  if (sp.taxi) {
    // green belt stripe, door text, roof lamp
    for (const sx of [-1, 1]) {
      kit.box(0.012, 0.07, sp.L - 0.3, sx * (sp.W / 2 + 0.003), 0.66, 0, 'vc', '#2f6a4e', { no: true, cast: false });
      kit.plane(0.9, 0.22, sx * (sp.W / 2 + 0.006), 0.8, 0.3, 'texS', '#ffffff', { ry: sx * Math.PI / 2, region: S('taxiDoor') });
    }
    // 行灯 roof lamp: base, lamp body, lit faces front / back, cap
    kit.box(0.5, 0.05, 0.2, 0, sp.roofY + 0.05, -0.1, 'vc', '#3a3e46');
    kit.box(0.44, 0.2, 0.08, 0, sp.roofY + 0.18, -0.1, 'vc', '#f4f2ea');
    kit.plane(0.42, 0.18, 0, sp.roofY + 0.18, -0.1 + 0.041, 'glowS', '#f4f2ea', { region: S('taxiLamp') });
    kit.plane(0.42, 0.18, 0, sp.roofY + 0.18, -0.1 - 0.041, 'glowS', '#f4f2ea', { region: S('taxiLamp'), ry: Math.PI });
    kit.rbox(0.46, 0.04, 0.1, 0.015, 0, sp.roofY + 0.29, -0.1, 'vc', '#e0483a');
    // chrome window belt
    for (const sx of [-1, 1]) kit.box(0.015, 0.018, 2.6, sx * (sp.W / 2 - sp.tumble), sp.belt + 0.005, -0.1, 'metal', '#e2e6ea', { no: true, cast: false });
  }
  return sp;
}

/**
 * The layout spot for the waiting kei car sits on the south (westbound) half of
 * the north road, which reads as driving on the wrong side.  Keep its intent
 * ("waiting north of the crossing") but put it where a Japanese driver would
 * actually wait: southbound on the crossing road (keep left = east half), nose
 * just behind the north stop line.
 */
function waitingSpot(spot) {
  const cr = ROADS.crossingRoad;
  const stop = ROAD_MARKINGS.find((m) => m.street === 'crossing' && m.type === 'stopLine' && m.lateral > 0);
  const x = cr.x + (stop ? stop.lateral : 1.35);
  const z = (stop ? stop.z : -42) - 0.35 - 3.4 / 2;
  return { ...spot, x, z, y: groundY(x, z), rotY: 0 };
}

export function buildVehicles(kit, clusterOf) {
  for (const spot of SPOTS.vehicles) {
    const v = spot.kind === 'kei-car-waiting-at-crossing' ? waitingSpot(spot) : spot;
    kit.cluster(clusterOf(v));
    const sp = SPECS[v.kind] ? SPECS[v.kind]() : SPECS['kei-car']();
    const s = surfaceY(v.x, v.z, v.y);
    const fx = Math.sin(v.rotY), fz = Math.cos(v.rotY);
    const h = sp.wheelBase / 2;
    const yF = groundY(v.x + fx * h, v.z + fz * h), yR = groundY(v.x - fx * h, v.z - fz * h);
    kit.push(kit.mtx(v.x, v.y + s, v.z, -Math.atan2(yF - yR, sp.wheelBase), v.rotY));
    vehicle(kit, SPECS[v.kind] ? v.kind : 'kei-car');
    kit.collide(sp.W + 0.1, sp.L + 0.1);
    kit.pop();
  }
}
