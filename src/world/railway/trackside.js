/**
 * railway/trackside.js — everything along the corridor edges:
 *   concrete cable troughs with lids (both sides), the north inspection path
 *   (concrete slabs; terrain.js adds the gravel strips + drainage troughs by the fences),
 *   corridor fences (green chain-link on grey posts, low white rail fences,
 *   old concrete posts with wires) with keep-out boards, kilometre posts,
 *   speed-limit / release boards, running-line and track-number boards,
 *   whistle board, equipment cabinets, emergency telephones (非常電話),
 *   reflective delineators, ATS stop beacons, a stack of spare rails and old
 *   sleepers for storytelling.
 */
import * as THREE from 'three';
import { RAIL, CROSSING, TRAIN } from '../../core/layout.js';
import { TRK, ZONE, inPlatformX, isNear, inRange, jitter, mtx, openBox } from './common.js';
import { addRail } from './track.js';
import { relayBox, atsBeacon } from './signals.js';

const Z = {
  fenceS: RAIL.corridor.zMax - 0.1,
  fenceN: RAIL.corridor.zMin + 0.1,
  troughS: RAIL.corridor.zMax - 1.05, // clear of terrain's drainage trough at the fence (zMax - 0.42)
  troughN: RAIL.catenary.poleZ[1] - 0.75,
  path: RAIL.catenary.poleZ[1] - 1.45,
  // terrain.js lays gravel strips (zMin+0.75..1.75, zMax-1.9..-0.8) and open drainage
  // troughs just inside both fences; this module keeps its equipment clear of them.
  gravelN: RAIL.corridor.zMin + 1.75,
  gravelS: RAIL.corridor.zMax - 1.9,
  boxS: RAIL.corridor.zMax - 1.8,
  boxN: RAIL.catenary.poleZ[1] - 2.35,
};
export const EDGE_Z = Z;

const nearCrossing = (x, pad = 0) => Math.abs(x - CROSSING.x) < 4.6 + pad;

/** Split [x0,x1] into runs that avoid the given blocked predicate (sampled every `step`). */
function runs(x0, x1, blocked, step = 0.5) {
  const out = [];
  let start = null;
  for (let x = x0; x <= x1 + 1e-6; x += step) {
    const b = blocked(x);
    if (!b && start === null) start = x;
    if ((b || x + step > x1) && start !== null) {
      const end = b ? x - step : x;
      if (end - start > 1) out.push([start, end]);
      start = null;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// cable troughs
// ---------------------------------------------------------------------------
function troughs(K) {
  const B = K.B;
  const rng = K.rng(501);
  for (const z of [Z.troughS, Z.troughN]) {
    const blocked = (x) => nearCrossing(x) || inPlatformX(x, 1);
    for (const [x0, x1] of runs(TRK.xMin, TRK.xMax, blocked)) {
      const L = x1 - x0;
      // body as one long piece, lids individually near the walkable area
      B.add('vc', openBox(L, 0.17, 0.34), '#b3b0a8', mtx((x0 + x1) / 2, 0.085, z));
      if (!isNear(x0) && !isNear(x1) && !isNear((x0 + x1) / 2)) {
        B.box('vc', L, 0.035, 0.37, '#c3c0b8', (x0 + x1) / 2, 0.185, z);
        continue;
      }
      for (let x = x0; x < x1 - 0.2; x += 1.0) {
        const w = Math.min(0.985, x1 - x);
        const near = isNear(x);
        if (!near) {
          const L2 = Math.min(x1 - x, 20);
          B.box('vc', L2, 0.035, 0.37, '#c3c0b8', x + L2 / 2, 0.185, z);
          x += L2 - 1.0;
          continue;
        }
        const tilt = rng() < 0.04 ? (rng() - 0.5) * 0.06 : 0;
        B.box('vc', w, 0.035, 0.37, jitter('#c6c3bb', rng, 0.035), x + w / 2, 0.186 + Math.abs(tilt) * 0.3, z + (rng() - 0.5) * 0.015, (rng() - 0.5) * 0.01, 0, tilt);
      }
      // end caps where runs stop
      for (const xe of [x0, x1]) B.box('vc', 0.06, 0.2, 0.38, '#a9a69e', xe, 0.1, z);
    }
  }
}

// ---------------------------------------------------------------------------
// inspection path (north): concrete slabs next to the cable trough
// ---------------------------------------------------------------------------
function inspectionPath(K) {
  const B = K.B;
  const rng = K.rng(502);
  // concrete slab path, only where people can walk to it
  const blocked = (x) => nearCrossing(x) || inPlatformX(x, 1) || !isNear(x);
  for (const [x0, x1] of runs(TRK.xMin, TRK.xMax, blocked)) {
    for (let x = x0; x < x1 - 0.5; x += 0.95) {
      B.add('vc', openBox(0.9, 0.05, 0.6), jitter('#cfccc4', rng, 0.04), mtx(x + 0.45, 0.014, Z.path + (rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.02));
    }
  }
}

// ---------------------------------------------------------------------------
// fences
// ---------------------------------------------------------------------------
function fenceStyle(x, side) {
  if (Math.abs(x - CROSSING.x) < 40 || isNear(x)) {
    const h = Math.floor((x + 1000) / 57) * 7 + (side > 0 ? 3 : 0);
    return h % 5 === 0 ? 'white' : 'mesh';
  }
  const h = Math.floor((x + 1000) / 80) * 13 + (side > 0 ? 5 : 0);
  return h % 4 === 0 ? 'concrete' : h % 4 === 1 ? 'white' : 'mesh';
}

function fences(K) {
  const B = K.B;
  const rng = K.rng(503);
  const ranges = [[TRK.xMin, ZONE.fenceSkip[0]], [ZONE.fenceSkip[1], CROSSING.x - 4.5], [CROSSING.x + 4.5, TRK.xMax]];
  K.fenceRuns = [];
  let plateCount = 0;
  for (const [side, z] of [[1, Z.fenceS], [-1, Z.fenceN]]) {
    for (const [a, b] of ranges) {
      if (b - a < 1) continue;
      // split into style sections
      let x = a;
      while (x < b - 0.5) {
        const style = fenceStyle(x, side);
        let end = x;
        while (end < b && fenceStyle(end, side) === style) end += 1;
        end = Math.min(end, b);
        K.fenceRuns.push({ side, z, x0: x, x1: end, style });
        buildFenceRun(K, style, x, end, z, side, rng);
        // keep-out boards facing outward on near runs
        for (let px = x + 8; px < end - 3; px += 44) {
          if (!isNear(px) && Math.abs(px - CROSSING.x) > 60) continue;
          const name = plateCount++ % 3 === 2 ? 'warn:keepout2' : 'warn:keepout';
          const [w, h] = name === 'warn:keepout' ? [0.6, 0.35] : [0.48, 0.3];
          const zz = z + side * 0.05;
          B.box('vc', w + 0.04, h + 0.04, 0.02, '#e9e7e0', px, 1.05, zz);
          K.sign(name, w, h, px, 1.05, zz + side * 0.012, side > 0 ? 0 : Math.PI);
        }
        x = end;
      }
    }
  }
}

function buildFenceRun(K, style, x0, x1, z, side, rng) {
  const B = K.B;
  const L = x1 - x0;
  if (style === 'mesh') {
    const H = 1.5;
    const n = Math.max(1, Math.round(L / 2.4));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (L * i) / n;
      const end = i === 0 || i === n;
      const seg = isNear(x) ? 6 : 4;
      B.cyl('steel', end ? 0.04 : 0.03, end ? 0.04 : 0.03, H + 0.08, '#8e949b', x, 0, z, seg);
      if (isNear(x)) B.cyl('steel', 0.012, end ? 0.045 : 0.036, 0.04, '#7c828a', x, H + 0.08, z, seg);
      if (end) {
        // corner brace
        const dir = i === 0 ? 1 : -1;
        B.tube('steel', { x, y: 1.1, z }, { x: x + dir * 1.1, y: 0.05, z }, 0.018, '#8e949b', 6);
      }
    }
    B.tube('steel', { x: x0, y: H, z }, { x: x1, y: H, z }, 0.021, '#8e949b', 6);
    B.tube('vcSmall', { x: x0, y: 0.12, z }, { x: x1, y: 0.12, z }, 0.006, '#6f7a74', 4);
    // chain-link panel (one quad; UVs in world metres)
    const g = new THREE.PlaneGeometry(L, H - 0.1);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.16, uv.getY(i) * (H - 0.1) / 0.16);
    const nor = g.attributes.normal;
    for (let i = 0; i < nor.count; i++) nor.setXYZ(i, 0, 1, 0);
    B.add(side > 0 ? 'fenceS' : 'fenceN', g, '#ffffff', mtx((x0 + x1) / 2, 0.1 + (H - 0.1) / 2, z));
  } else if (style === 'white') {
    const H = 1.1;
    const n = Math.max(1, Math.round(L / 2.0));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (L * i) / n;
      B.block('vc', 0.08, H, 0.08, jitter('#eeece5', rng, 0.02), x, 0, z);
      B.box('vc', 0.1, 0.03, 0.1, '#e2e0d8', x, H + 0.015, z);
    }
    for (const y of [0.42, 0.92]) B.box('vc', L, 0.06, 0.045, '#f1efe8', (x0 + x1) / 2, y, z - side * 0.06);
    // a few rust / dirt chips near the bottom rail for hand-painted wear
    for (let x = x0 + 1; x < x1 - 1; x += 3 + rng() * 6) B.box('vcSmall', 0.05 + rng() * 0.08, 0.02, 0.003, '#b99a82', x, 0.4 + rng() * 0.04, z - side * 0.084);
  } else {
    const H = 1.25;
    const n = Math.max(1, Math.round(L / 2.5));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (L * i) / n;
      B.block('vc', 0.12, H, 0.12, jitter('#bdbab2', rng, 0.03), x, 0, z);
      B.add('vc', new THREE.ConeGeometry(0.09, 0.08, 4, 1), '#b3b0a8', mtx(x, H + 0.04, z, 0, Math.PI / 4));
    }
    for (const y of [0.35, 0.7, 1.05]) {
      K.wire(K.geom.catenaryPoints(new THREE.Vector3(x0, y, z - side * 0.065), new THREE.Vector3(x1, y, z - side * 0.065), 0.02 * (L / 2.5), Math.max(2, Math.round(L / 2.5))), 0.005, 3, true);
    }
  }
}

// ---------------------------------------------------------------------------
// posts, boards and cabinets
// ---------------------------------------------------------------------------
/** A white-painted board on a steel post, facing ry (both faces printed when twoSided). */
function boardOnPost(K, name, w, h, x, z, ry, y = 1.9, twoSided = false) {
  const B = K.B;
  B.block('vc', 0.3, 0.12, 0.3, '#bdbab2', x, 0, z);
  B.cyl('steel', 0.035, 0.035, y - 0.1 + h / 2 - 0.05, '#8e949b', x, 0.12, z, 8);
  const nx = Math.sin(ry), nz = Math.cos(ry);
  B.box('vc', w + 0.04, h + 0.04, 0.03, '#e2e0d9', x + nx * 0.05, y, z + nz * 0.05, ry);
  K.sign(name, w, h, x + nx * 0.067, y, z + nz * 0.067, ry);
  if (twoSided) K.sign(name, w, h, x + nx * 0.033, y, z + nz * 0.033, ry + Math.PI);
  K.occupy(x, z, 0.5);
}

function kmPosts(K) {
  const B = K.B;
  for (const k of RAIL.kmPosts) {
    if (k.x < TRK.xMin || k.x > TRK.xMax) continue;
    let x = k.x, z = RAIL.catenary.poleZ[0] + 0.55;
    if (inPlatformX(x, 1)) { z = TRK.zMid; }
    if (!K.free(x, z, 0.8)) x += 1.2;
    B.block('vc', 0.17, 0.95, 0.17, '#f1f0ea', x, 0, z);
    B.add('vc', new THREE.ConeGeometry(0.125, 0.12, 4, 1), '#e9e8e2', mtx(x, 1.01, z, 0, Math.PI / 4));
    for (const s of [-1, 1]) K.sign(`km:${k.x}`, 0.13, 0.36, x + s * 0.0865, 0.7, z, s * Math.PI / 2);
    K.occupy(x, z, 0.5);
  }
}

function boards(K) {
  const out = { A: TRK.A.z + TRK.outer.A * 2.5, B: TRK.B.z + TRK.outer.B * 2.5 };
  const face = { A: Math.PI / 2, B: -Math.PI / 2 }; // toward approaching trains
  const cx = K.crossover;
  // speed limits for the crossover and the station approach
  const list = [
    ['speed:45', 'B', cx ? cx.xs - 32 : -150],
    ['speed:45', 'A', cx ? cx.xe + 14 : -70],
    ['speed:release', 'A', cx ? cx.xs - 64 : -182],
    ['speed:release', 'B', cx ? cx.xe + 30 : -54],
    ['speed:60', 'A', 146],
    ['speed:65', 'B', -236],
  ];
  for (const [name, tr, x] of list) {
    let xx = x;
    while (!K.free(xx, out[tr], 1.2)) xx += 1.5;
    if (inPlatformX(xx, 1)) continue;
    boardOnPost(K, name, 0.42, 0.49, xx, out[tr], face[tr], 2.15);
  }
  // running line boards near the crossover
  if (cx) {
    boardOnPost(K, 'line:up', 0.5, 0.19, cx.xs - 8, out.A, face.A, 1.3, true);
    boardOnPost(K, 'line:down', 0.5, 0.19, cx.xe + 8, out.B, face.B, 1.3, true);
  }
  // track numbers at the west platform ends
  const xw = ZONE.platform[0] - 1.6;
  boardOnPost(K, 'track:1', 0.42, 0.42, xw, out.A - 0.1, Math.PI / 2, 1.6, true);
  boardOnPost(K, 'track:2', 0.42, 0.42, xw, out.B + 0.1, Math.PI / 2, 1.6, true);
  // whistle board before the level crossing (westbound)
  boardOnPost(K, 'whistle', 0.4, 0.4, CROSSING.x + 82, out.A, face.A, 2.0);
}

function cabinets(K) {
  const spots = [
    ['box:signal', -63.5, 'S'], ['box:signal', -63.5, 'N'], ['box:power', 39.5, 'S'], ['box:signal', 52, 'N'],
    ['box:power', -137, 'N'], ['box:signal', 96, 'S'], ['box:power', 132, 'N'], ['box:signal', -160, 'S'],
  ];
  if (K.crossover) {
    spots.push(['box:point', K.crossover.xs - 4.5, K.crossover.sigma < 0 ? 'S' : 'N']);
    spots.push(['box:point', K.crossover.xe + 4.5, K.crossover.sigma < 0 ? 'N' : 'S']);
  }
  for (let x = -420; x < 430; x += 95) if (!isNear(x)) spots.push([x % 190 === 0 ? 'box:power' : 'box:signal', x + 7, x % 2 ? 'N' : 'S']);
  for (const [label, x0, side] of spots) {
    const z = side === 'S' ? Z.boxS : Z.boxN;
    let x = x0;
    let tries = 0;
    while ((!K.free(x, z, 0.9) || inPlatformX(x, 1) || Math.abs(x - CROSSING.x) < 5.5) && tries++ < 12) x += 1.3;
    const ry = side === 'S' ? Math.PI : 0; // doors face the track
    relayBox(K, x, z, ry, 1.2, label);
    // cable into the trough
    const tz = side === 'S' ? Z.troughS : Z.troughN;
    if (!inPlatformX(x, 1)) K.B.tube('vcSmall', { x: x + 0.2, y: 0.2, z }, { x: x + 0.35, y: 0.16, z: tz }, 0.018, '#26282c', 5);
  }
}

function phones(K) {
  const B = K.B;
  for (const [x0, side] of [[-67, 'S'], [47.5, 'N'], [-146, 'S'], [118, 'N']]) {
    const z = side === 'S' ? Z.boxS : Z.boxN;
    let x = x0;
    while (!K.free(x, z, 0.8)) x += 1.2;
    const ry = side === 'S' ? Math.PI : 0;
    const nz = Math.cos(ry);
    B.block('vc', 0.3, 0.1, 0.3, '#bdbab2', x, 0, z);
    B.block('steel', 0.07, 2.1, 0.07, '#8e949b', x, 0.1, z);
    B.box('vc', 0.34, 0.44, 0.2, '#d9d7ce', x, 1.2, z + nz * 0.13);
    B.box('vc', 0.36, 0.04, 0.22, '#c4c2b9', x, 1.44, z + nz * 0.13);
    B.box('vcSmall', 0.2, 0.18, 0.01, '#2f8f5f', x, 1.24, z + nz * 0.235);
    B.box('vc', 0.68, 0.28, 0.03, '#e8e6df', x, 1.95, z);
    K.sign('phone', 0.64, 0.256, x, 1.95, z + nz * 0.017, ry);
    K.sign('phone', 0.64, 0.256, x, 1.95, z - nz * 0.017, ry + Math.PI);
    K.occupy(x, z, 0.6);
  }
}

function delineators(K) {
  const B = K.B;
  const spots = [];
  // at the fence ends beside the crossing and the platform ends
  for (const x of [CROSSING.x - 5.2, CROSSING.x + 5.2]) spots.push([x, Z.fenceS - 1.25], [x, Z.fenceN + 1.9]);
  for (const x of [ZONE.fenceSkip[0] - 0.8]) spots.push([x, Z.fenceS - 1.25], [x, Z.fenceN + 1.9]);
  // along the track approaching the platform ends (driver sighting markers)
  for (const x of [-72, -84, 60, 88]) spots.push([x, x < 0 ? TRK.A.z + 2.2 : TRK.B.z - 2.2]);
  for (const [x, z] of spots) {
    if (!K.free(x, z, 0.4)) continue;
    B.block('vc', 0.07, 0.95, 0.07, '#f3f1ea', x, 0, z);
    B.box('vcSmall', 0.074, 0.08, 0.074, '#d8433d', x, 0.8, z);
    for (const s of [-1, 1]) K.sign(Math.abs(x - CROSSING.x) < 8 ? 'reflY' : 'reflO', 0.1, 0.1, x + s * 0.04, 0.95, z, s * Math.PI / 2);
    B.cyl('vc', 0.001, 0.05, 0.04, '#f3f1ea', x, 0.95 - 0.02 + 0.05, z, 6);
    K.occupy(x, z, 0.3);
  }
  // stop-position beacons for the platform stops
  atsBeacon(K, TRAIN.stopFrontX.A - 2.5 * TRK.A.dir, TRK.A.z);
  atsBeacon(K, TRAIN.stopFrontX.B - 2.5 * TRK.B.dir, TRK.B.z);
}

/** Spare rails on wooden blocks and a stack of retired sleepers (north side, by the crossover). */
function storytelling(K) {
  const B = K.B;
  const rng = K.rng(504);
  const x0 = (K.crossover ? K.crossover.xs : -118) - 26;
  const z = Z.boxN;
  if (!isNear(x0)) return;
  for (const bx of [0.6, 4.5, 8.4, 11.4]) B.block('vc', 0.24, 0.12, 0.9, jitter('#6b5446', rng, 0.03), x0 + bx, 0, z);
  for (let i = 0; i < 3; i++) {
    const zz = z - 0.3 + i * 0.3;
    // spare rails lie on their feet, raised onto the blocks
    const g = addRail(K, [{ x: x0, z: 0 }, { x: x0 + 12, z: 0 }], null, 'rail');
    g.translate(0, 0.12 - TRK.railBase, zz);
  }
  // retired wooden sleepers, stacked in slightly untidy layers
  const sx = x0 - 3.2;
  for (let layer = 0; layer < 4; layer++) {
    for (let i = 0; i < 3; i++) {
      if (layer === 3 && i === 2) continue;
      B.box('vc', 2.0, 0.15, 0.24, jitter('#5f4d42', rng, 0.04), sx + (rng() - 0.5) * 0.2, 0.075 + layer * 0.15, z + (i - 1) * 0.28 + (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.06);
    }
  }
  K.occupy(x0 + 6, z, 7);
  K.occupy(sx, z, 1.3);
}

export function buildTrackside(K) {
  troughs(K);
  inspectionPath(K);
  fences(K);
  kmPosts(K);
  boards(K);
  cabinets(K);
  phones(K);
  delineators(K);
  storytelling(K);
}
