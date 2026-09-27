/**
 * Platforms P1 / P2: concrete bodies (dark recessed face toward the track,
 * overhanging coping), worn paving, tactile warning + guide blocks, white
 * safety line, door-position marks for the 3-car train, end ramps (the west
 * ramps drop to the in-station crossing landing at rail-top height), white
 * back railings with ad boards, weeds / dandelions / daisies / shrubs outside,
 * and platform-end equipment (gates, 立入禁止 signs, departure indicator,
 * stop-position markers, trackside equipment boxes).
 */
import * as THREE from 'three';
import { PLATFORM, TRAIN, STATION, RAIL, TREES } from '../../core/layout.js';

const PT = PLATFORM.top;
export const PLAT = {
  xRampW: -49.0, // flat top ends here (west); ramp down to the landing
  xLandE: -52.6, // landing (rail-top height) east edge
  xLandW: -54.4, // landing west edge (= end of the platform)
  yLand: RAIL.railTop, // 0.45
  xRampE: PLATFORM.xMax, // east ramp start (22)
  xRampEnd: PLATFORM.xMax + PLATFORM.rampLength, // 27
  coping: 0.4,
  recess: 0.15,
  // door centres in car-local x (+x toward the leading end), matching train.js / train/dims.js:
  // cab cars [-6.6, -0.6, 5.4], middle car [-6, 0, 6]; the rear cab car is turned around.
  doorsCab: [-6.6, -0.6, 5.4],
  doorsMid: [-6.0, 0.0, 6.0],
};

/** Door centres along x for the train on a track: [{x, car, door}] (car 1 = leading car). */
export function doorPositions(track) {
  const dir = RAIL.tracks.find((t) => t.id === track).dir;
  const front = TRAIN.stopFrontX[track];
  const out = [];
  for (let c = 0; c < TRAIN.cars; c++) {
    const cab = c === 0 || c === TRAIN.cars - 1;
    const flip = c === TRAIN.cars - 1 ? -1 : 1;
    const centre = -TRAIN.carLength / 2 - c * TRAIN.carLength; // set-local (front at 0, rear toward -x)
    const xs = (cab ? PLAT.doorsCab : PLAT.doorsMid).map((d) => front + dir * (centre + flip * d));
    xs.sort((a, b) => (b - a) * dir); // leading door first
    xs.forEach((x, d) => out.push({ x, car: c + 1, door: d + 1 }));
  }
  return out;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Sheet-metal fence sign: matte off-white edge (not the bright metal, which
 * glows in backlight) and a grey primer back with rivets + inventory sticker.
 */
export const SIGN_PLATE = (kit, S, thick = 0.02) => ({ thick, frameColor: '#d6d6d0', frameMat: kit.M.vc, back: S.signBack });

/** Surface height of the platform walkway at x (flat top, ramps, landing). */
export function platY(x) {
  if (x >= PLAT.xRampW && x <= PLAT.xRampE) return PT;
  if (x > PLAT.xRampE) return Math.max(0, PT * (1 - (x - PLAT.xRampE) / (PLAT.xRampEnd - PLAT.xRampE)));
  if (x >= PLAT.xLandE) return PLAT.yLand + (PT - PLAT.yLand) * (x - PLAT.xLandE) / (PLAT.xRampW - PLAT.xLandE);
  return PLAT.yLand;
}

export function platformsInfo() {
  return ['P1', 'P2'].map((id) => {
    const p = PLATFORM[id];
    const s = Math.sign(p.zTrack - p.zBack); // direction from the back to the track edge
    return { id, zE: p.zTrack, zB: p.zBack, s, track: p.track, num: id === 'P1' ? 1 : 2 };
  });
}

// ---------------------------------------------------------------------------
export function buildPlatforms(kit, S, parent) {
  for (const P of platformsInfo()) {
    buildBody(kit, P, parent);
    buildSurface(kit, S, P, parent);
    buildFences(kit, S, P, parent);
    buildEnds(kit, S, P, parent);
    buildBackWall(kit, S, P, parent);
  }
  buildGreenery(kit, parent);
}

// ---------------------------------------------------------------------------
function buildBody(kit, P, parent) {
  const { M } = kit;
  const { zE, zB, s } = P;
  const zFace = zE - s * PLAT.recess;
  const top = -0.03; // surface slabs sit on the body
  const prof = [
    [PLAT.xLandW, 0], [PLAT.xRampEnd, 0], [PLAT.xRampE, PT + top], [PLAT.xRampW, PT + top],
    [PLAT.xLandE, PLAT.yLand + top], [PLAT.xLandW, PLAT.yLand + top],
  ];
  const z0 = Math.min(zB, zFace), z1 = Math.max(zB, zFace);
  kit.prism(parent, M.retaining, '#d4d2cd', 'z', prof, z0, z1, { uv: [4, 1.6] });
  // darker track-facing face plate under the coping (the recess reads as a shadow band)
  const zf0 = zFace + s * 0.02, zf1 = zFace;
  kit.bx(parent, M.retaining, '#8e8c89', PLAT.xRampW, PLAT.xRampE, 0, PT - 0.2, Math.min(zf0, zf1), Math.max(zf0, zf1), { uv: [4, 1.6] });
  // coping stones along the edge (flat part) + slope parts follow the ramps
  const zc0 = zE, zc1 = zE - s * PLAT.coping;
  kit.bx(parent, M.retaining, '#dedbd4', PLAT.xRampW, PLAT.xRampE, PT - 0.2, PT, Math.min(zc0, zc1), Math.max(zc0, zc1), { uv: [0.9, 0.9] });
  // coping joints every 0.9 m (small dark gaps on the vertical face)
  for (let x = PLAT.xRampW + 0.9; x < PLAT.xRampE; x += 0.9) {
    kit.bx(parent, M.paint, '#9d9a95', x - 0.006, x + 0.006, PT - 0.2, PT - 0.005, zE - 0.003 * s, zE + 0.002 * s, { noOutline: true, cast: false });
  }
  // ramp side coping (sloped)
  kit.beam(parent, M.vc, '#dedbd4', V(PLAT.xRampW, PT - 0.2, zE - s * PLAT.coping / 2), V(PLAT.xLandE, PLAT.yLand - 0.2, zE - s * PLAT.coping / 2), PLAT.coping, 0.2, { under: true });
  kit.beam(parent, M.vc, '#dedbd4', V(PLAT.xRampE, PT - 0.2, zE - s * PLAT.coping / 2), V(PLAT.xRampEnd, -0.2, zE - s * PLAT.coping / 2), PLAT.coping, 0.2, { under: true });
  kit.bx(parent, M.vc, '#dedbd4', PLAT.xLandW, PLAT.xLandE, PLAT.yLand - 0.2, PLAT.yLand, Math.min(zc0, zc1), Math.max(zc0, zc1));
}

// ---------------------------------------------------------------------------
function buildSurface(kit, S, P, parent) {
  const { M } = kit;
  const { zE, zB, s } = P;
  const zIn = zE - s * PLAT.coping; // inner edge of the coping
  const zlo = Math.min(zIn, zB), zhi = Math.max(zIn, zB);
  const zAt = (d) => zE - s * d; // z at distance d from the edge
  // paving (flat part)
  kit.bx(parent, M.platform, '#ffffff', PLAT.xRampW, PLAT.xRampE, PT - 0.03, PT, zlo, zhi, { uv: [6, 6, P.num * 0.37, 0] });
  // ramps + landing (full width incl. edge), anti-slip grooves painted as darker bands
  const zmidIn = (zlo + zhi) / 2;
  kit.beam(parent, M.platform, '#f1efea', V(PLAT.xRampW, PT - 0.03, zmidIn), V(PLAT.xLandE, PLAT.yLand - 0.03, zmidIn), Math.abs(zhi - zlo), 0.03, { under: true, uv: [6, 6] });
  kit.beam(parent, M.platform, '#f1efea', V(PLAT.xRampE, PT - 0.03, zmidIn), V(PLAT.xRampEnd, -0.03, zmidIn), Math.abs(zhi - zlo), 0.03, { under: true, uv: [6, 6] });
  kit.bx(parent, M.platform, '#f1efea', PLAT.xLandW, PLAT.xLandE, PLAT.yLand - 0.03, PLAT.yLand, zlo, zhi, { uv: [6, 6] });
  // anti-slip grooves on the ramps
  const grooves = (xa, ya, xb, yb, n) => {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = xa + (xb - xa) * t, y = ya + (yb - ya) * t;
      kit.box(parent, M.paint, '#b9b7b2', 0.05, 0.004, Math.abs(zhi - zlo) - 0.2, x, y + 0.004, zmidIn, { rz: Math.atan2(yb - ya, xb - xa), noOutline: true, cast: false });
    }
  };
  grooves(PLAT.xRampW, PT, PLAT.xLandE, PLAT.yLand, 16);
  grooves(PLAT.xRampE, PT, PLAT.xRampEnd, 0, 22);

  // white safety line (0.55..0.63 m from the edge)
  const line = (d0, d1, color, x0 = PLAT.xRampW, x1 = PLAT.xRampE) => {
    const a = zAt(d0), b = zAt(d1);
    kit.bx(parent, M.paint, color, x0, x1, PT, PT + 0.002, Math.min(a, b), Math.max(a, b), { noOutline: true, cast: false });
  };
  line(0.5, 0.6, '#f7f6f1');
  // edge paint on the coping lip (yellow-white for visibility at night)
  // tactile warning blocks (dots) 0.8..1.4 from the edge, with the inner linear bar
  {
    const a = zAt(0.8), b = zAt(1.4);
    const za = Math.min(a, b), zb = Math.max(a, b);
    const ov = -((-zb / 0.3) % 1);
    kit.bx(parent, M.tactileDot, null, PLAT.xRampW + 0.3, PLAT.xRampE - 0.3, PT, PT + 0.007, za, zb, { uv: [0.3, 0.3, 0, ov], noOutline: true, cast: false });
    const c = zAt(1.47);
    kit.bx(parent, M.vc, '#f2c230', PLAT.xRampW + 0.3, PLAT.xRampE - 0.3, PT, PT + 0.008, c - 0.025, c + 0.025, { noOutline: true, cast: false });
  }
  // tactile dots across the ramp tops (warning before the slope)
  for (const x of [PLAT.xRampW + 0.15, PLAT.xRampE - 0.15]) {
    kit.bx(parent, M.tactileDot, null, x - 0.15, x + 0.15, PT, PT + 0.007, zlo + 0.3, zhi - 0.3, { uv: [0.3, 0.3], noOutline: true, cast: false });
  }

  // door position marks (behind the tactile strip)
  const doors = doorPositions(P.track);
  const md = 1.85; // centre distance from the edge
  for (const d of doors) {
    const idx = (d.car - 1) * 3 + (d.door - 1);
    kit.decal(parent, S.doorMark[idx], 1.25, 0.65, d.x, PT + 0.004, zAt(md), s < 0 ? 0 : Math.PI, { rx: -Math.PI / 2, mat: kit.matFor(S.doorMark[idx], 'floor') });
  }

  // guide blocks (linear) from the entrance / crossing to the warning strip
  const guide = (x0, x1, z0, z1, alongX) => {
    const m = kit.bx(parent, M.tactileLine, null, x0, x1, PT, PT + 0.007, Math.min(z0, z1), Math.max(z0, z1), { uv: [0.3, 0.3], noOutline: true, cast: false });
    if (alongX) swapUV(m.geometry);
  };
  if (P.id === 'P1') {
    // from the building's platform opening straight to the edge strip
    guide(-5.2, -4.9, zB, zAt(1.5), false);
    // and along the platform toward the west end (for the crossing)
    guide(PLAT.xRampW + 0.3, -5.2, zAt(3.05), zAt(2.75), true);
    guide(-5.2, -4.9, zAt(2.75), zAt(3.05), false);
  } else {
    guide(PLAT.xRampW + 0.3, -8, zAt(2.5), zAt(2.22), true);
  }

  // 足元注意 floor text before the ramps, on plain paving clear of the guide-block line
  // (west: between the edge strip and the P1 guide line / behind the P2 guide line)
  const zWest = P.id === 'P1' ? zAt(2.12) : zAt(3.12);
  kit.decal(parent, S.ashimoto, 1.0, 0.28, PLAT.xRampW + 0.75, PT + 0.004, zWest, Math.PI / 2, { rx: -Math.PI / 2, mat: kit.matFor(S.ashimoto, 'floor') });
  kit.decal(parent, S.ashimoto, 1.0, 0.28, PLAT.xRampE - 0.75, PT + 0.004, zmidIn, -Math.PI / 2, { rx: -Math.PI / 2, mat: kit.matFor(S.ashimoto, 'floor') });

  // petals & grit collected along the back edge / in corners
  const rng = kit.ctx.rng(P.num * 97 + 5);
  for (let i = 0; i < 26; i++) {
    const x = rng.range(PLAT.xRampW + 1, PLAT.xRampE - 1);
    if (P.id === 'P1' && x > STATION.building.xMin - 0.5 && x < STATION.building.xMax + 0.5 && rng.chance(0.6)) continue;
    const w = rng.range(0.6, 1.1);
    kit.decal(parent, S.petals, w, w * 0.45, x, PT + 0.003, zB + s * 0.3, s < 0 ? 0 : Math.PI, { rx: -Math.PI / 2, mat: kit.matFor(S.petals, 'floor') });
  }
  // a few near the edge / around tactile blocks
  for (let i = 0; i < 10; i++) {
    const x = rng.range(PLAT.xRampW + 2, PLAT.xRampE - 2);
    kit.decal(parent, S.petals, 0.5, 0.25, x, PT + 0.009, zAt(rng.range(1.5, 3.0)), rng.range(0, 6.28), { rx: -Math.PI / 2, mat: kit.matFor(S.petals, 'floor') });
  }
}

function swapUV(g) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setX(i, uv.getY(i)); uv.setY(i, u); }
  uv.needsUpdate = true;
}

// ---------------------------------------------------------------------------
/** White metal railing along x from x0 to x1 at z, following platY(). */
export function railing(kit, parent, x0, x1, z, o = {}) {
  const { M } = kit;
  const H = o.height ?? 1.1;
  const col = o.color || '#f2f1ec';
  const yAt = o.yAt || platY;
  const step = 2.0;
  const n = Math.max(1, Math.round((x1 - x0) / step));
  const xs = [];
  for (let i = 0; i <= n; i++) xs.push(x0 + ((x1 - x0) * i) / n);
  // add kinks where the surface slope changes so rails follow ramps exactly
  for (const k of [PLAT.xRampW, PLAT.xLandE, PLAT.xRampE]) if (k > x0 + 0.05 && k < x1 - 0.05 && !xs.some((x) => Math.abs(x - k) < 0.05)) xs.push(k);
  xs.sort((a, b) => a - b);
  for (const x of xs) {
    const y = yAt(x);
    kit.bx(parent, M.metal, col, x - 0.03, x + 0.03, y, y + H + 0.03, z - 0.03, z + 0.03);
  }
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i], xb = xs[i + 1];
    const ya = yAt(xa), yb = yAt(xb);
    for (const h of [H, H * 0.55, 0.1]) {
      kit.beam(parent, M.metal, col, V(xa, ya + h, z), V(xb, yb + h, z), 0.035, 0.035);
    }
    // balusters
    const nb = Math.max(1, Math.round((xb - xa) / 0.16));
    for (let j = 1; j < nb; j++) {
      const t = j / nb;
      const x = xa + (xb - xa) * t, y = ya + (yb - ya) * t;
      kit.bx(parent, M.metal, col, x - 0.009, x + 0.009, y + 0.1, y + H, z - 0.009, z + 0.009, { noOutline: true, cast: false });
    }
  }
  if (o.collider !== false) kit.colliders.push([x0, x1, z - 0.2, z + 0.2]);
}

function buildFences(kit, S, P, parent) {
  const { zB, s } = P;
  const zf = zB + s * 0.08;
  const B = STATION.building;
  if (P.id === 'P1') {
    railing(kit, parent, PLAT.xLandW, B.xMin - 0.05, zf);
    railing(kit, parent, B.xMax + 0.05, PLAT.xRampEnd, zf);
  } else {
    railing(kit, parent, PLAT.xLandW, PLAT.xRampEnd, zf);
  }
  // ad boards on the railing (face the platform)
  const ads = P.id === 'P1' ? [[-40.5, S.adDental], [-28.6, S.adEstate]] : [[-40.5, S.adJuku], [-21.5, S.adDental], [-2.5, S.adOnsen], [13.5, S.adEstate]];
  for (const [x, r] of ads) {
    const g = new THREE.Group();
    g.position.set(x, PT, zf);
    g.rotation.y = s < 0 ? Math.PI : 0;
    parent.add(g);
    const w = 2.1, h = 0.72;
    kit.bx(g, kit.M.metal, '#e9e8e2', -w / 2 - 0.05, w / 2 + 0.05, 0.3, 0.3 + h + 0.1, 0.04, 0.09);
    kit.decal(g, r, w, h, 0, 0.35 + h / 2, 0.095, 0);
    for (const px of [-w / 2 + 0.1, w / 2 - 0.1]) kit.bx(g, kit.M.metal, '#b9bcc0', px - 0.03, px + 0.03, 0, 0.35, 0.03, 0.09);
  }
}

// ---------------------------------------------------------------------------
function buildEnds(kit, S, P, parent) {
  const { M } = kit;
  const { zE, zB, s } = P;
  const zlo = Math.min(zE, zB), zhi = Math.max(zE, zB);
  const zAt = (d) => zE - s * d;
  // --- east end: staff-only gate across the ramp top ---
  {
    const x = PLAT.xRampE + 0.3;
    const y = PT;
    const za = zhi - 0.15, zb = zlo + 0.15;
    for (const z of [za, zb, (za + zb) / 2]) kit.bx(parent, M.metal, '#f2f1ec', x - 0.04, x + 0.04, y, y + 1.15, z - 0.04, z + 0.04);
    for (const [z0, z1] of [[zb, (za + zb) / 2], [(za + zb) / 2, za]]) {
      for (const h of [0.2, 0.6, 1.05]) kit.bx(parent, M.metal, '#f2f1ec', x - 0.02, x + 0.02, y + h - 0.02, y + h + 0.02, z0 + 0.05, z1 - 0.05);
      kit.beam(parent, M.metal, '#f2f1ec', V(x, y + 0.2, z0 + 0.05), V(x, y + 1.05, z1 - 0.05), 0.03, 0.03);
    }
    // yellow/black striped top rail
    kit.bx(parent, M.vc, '#f2c230', x - 0.03, x + 0.03, y + 1.15, y + 1.2, zb, za);
    const g = new THREE.Group();
    g.position.set(x - 0.06, y + 0.75, (za + zb) / 2 + 0.9);
    g.rotation.y = -Math.PI / 2;
    parent.add(g);
    kit.board(g, S.noEntry, 0.46, 0.59, 0, 0, 0, 0, SIGN_PLATE(kit, S));
    kit.colliders.push([x - 0.2, x + 0.2, zlo, zhi]);
  }
  // --- west end: fence across the landing end + sign ---
  {
    const x = PLAT.xLandW + 0.08;
    const y = PLAT.yLand;
    const za = zB + s * 0.08, zb = zE - s * 0.3;
    const n = 3;
    for (let i = 0; i <= n; i++) {
      const z = za + ((zb - za) * i) / n;
      kit.bx(parent, M.metal, '#f2f1ec', x - 0.03, x + 0.03, y, y + 1.13, z - 0.03, z + 0.03);
    }
    for (const h of [0.1, 0.6, 1.1]) kit.beam(parent, M.metal, '#f2f1ec', V(x, y + h, za), V(x, y + h, zb), 0.035, 0.035);
    for (let t = 0.04; t < 1; t += 0.04) {
      const z = za + (zb - za) * t;
      kit.bx(parent, M.metal, '#f2f1ec', x - 0.009, x + 0.009, y + 0.1, y + 1.1, z - 0.009, z + 0.009, { noOutline: true, cast: false });
    }
    const g = new THREE.Group();
    g.position.set(x + 0.05, y + 0.7, za + (zb - za) * 0.2);
    g.rotation.y = Math.PI / 2;
    parent.add(g);
    kit.board(g, S.noEntry, 0.4, 0.51, 0, 0, 0, 0, SIGN_PLATE(kit, S));
    kit.colliders.push([x - 0.2, x + 0.2, zlo, zhi]);
  }

  // --- departure indicator (出発反応標識) at the leading end + stop-position marker ---
  {
    const dir = RAIL.tracks.find((t) => t.id === P.track).dir;
    const xStop = TRAIN.stopFrontX[P.track];
    // stop marker: small board on a short post at the platform edge, facing the approaching driver
    const x = xStop + dir * 0.6;
    const post = new THREE.Group();
    post.position.set(x, PT, zAt(0.5));
    parent.add(post);
    kit.cyl(post, M.metal, '#f2f1ec', 0.025, 0.025, 1.6, 0, 0, 0, 8);
    const face = dir < 0 ? Math.PI / 2 : -Math.PI / 2; // face the train coming from behind the stop point
    const b = new THREE.Group();
    b.position.set(0, 1.75, 0);
    b.rotation.y = face;
    post.add(b);
    kit.board(b, S.stopMark, 0.34, 0.42, 0, 0, 0, 0, { thick: 0.03, frameColor: '#f2c230' });
    // departure indicator on a bracket near the platform end (leading end)
    const xi = dir < 0 ? PLAT.xRampW + 1.2 : PLAT.xRampE - 1.2;
    const g = new THREE.Group();
    g.position.set(xi, PT, zAt(2.2));
    parent.add(g);
    kit.cyl(g, M.metal, '#9aa1a8', 0.04, 0.04, 2.6, 0, 0, 0, 8);
    const hd = new THREE.Group();
    hd.position.set(0, 2.55, 0);
    hd.rotation.y = dir < 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(hd);
    kit.bx(hd, M.metal, '#2b2d33', -0.22, 0.22, -0.22, 0.22, -0.12, 0.05);
    kit.decal(hd, S.depIndicator, 0.36, 0.36, 0, 0, 0.055, 0, { mat: kit.matFor(S.depIndicator, 'unlit') });
    kit.bx(hd, M.metal, '#2b2d33', -0.26, 0.26, 0.22, 0.26, -0.12, 0.15);
  }

  // --- trackside equipment boxes on the ground beyond the platform ends ---
  const box = (x, z, w, d, h) => {
    kit.bx(parent, M.metal, '#b8bdc2', x - w / 2, x + w / 2, 0.08, 0.08 + h, z - d / 2, z + d / 2);
    kit.bx(parent, M.metal, '#9aa1a8', x - w / 2 - 0.03, x + w / 2 + 0.03, 0.08 + h, 0.12 + h, z - d / 2 - 0.03, z + d / 2 + 0.03);
    kit.bx(parent, M.retaining, '#a8a39c', x - w / 2 - 0.08, x + w / 2 + 0.08, 0, 0.08, z - d / 2 - 0.08, z + d / 2 + 0.08, { uv: [2, 1] });
    for (let i = 0; i < 4; i++) kit.bx(parent, M.vc, '#7c838b', x - w * 0.3, x + w * 0.3, 0.3 + i * 0.06, 0.32 + i * 0.06, z + d / 2, z + d / 2 + 0.01, { noOutline: true });
  };
  if (P.id === 'P1') { box(PLAT.xRampEnd + 1.1, zB - 0.6, 0.9, 0.55, 1.0); box(PLAT.xLandW - 1.6, zB - 0.8, 0.6, 0.45, 0.8); }
  else { box(PLAT.xRampEnd + 1.0, zB + 0.7, 0.8, 0.5, 0.9); }
}

// ---------------------------------------------------------------------------
/**
 * Back retaining wall of a platform (the side facing the plaza / the fields):
 * PVC weep-hole pipes every ~3 m with a dark damp run below each, a couple of
 * 'ホーム下 立入禁止' plates, a cable conduit with clips, and a dandelion /
 * weed fringe along the foot.
 */
function buildBackWall(kit, S, P, parent) {
  const { M, ctx } = kit;
  const B = STATION.building;
  const s = -P.s; // outward normal (z) of the back face
  const zw = P.zB; // wall face
  const rng = ctx.rng(P.num * 131 + 9);
  const x0 = PLAT.xRampW + 1.0, x1 = PLAT.xRampE - 0.5;
  const outside = (x) => P.id !== 'P1' || x < B.xMin - 0.4 || x > B.xMax + 0.4;
  const trees = TREES.filter((t) => Math.abs(t.z - zw) < 3);
  const nearTree = (x) => trees.some((t) => Math.abs(t.x - x) < 0.9);

  const pipe = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8, 1, true);
  pipe.rotateX(Math.PI / 2);
  const hole = new THREE.CircleGeometry(0.028, 8);
  if (s < 0) hole.rotateY(Math.PI);
  for (let x = x0; x < x1; x += 3.0) {
    if (!outside(x)) continue;
    const y = 0.32 + rng.range(-0.03, 0.03);
    const g = pipe.clone();
    g.translate(x, y, zw + s * 0.03);
    kit.add(parent, g, M.vc, '#c9cbc6', { noOutline: true, cast: false });
    const h = hole.clone();
    h.translate(x, y, zw + s * 0.066);
    kit.add(parent, h, M.vc, '#34363a', { noOutline: true, cast: false });
    // damp run: two thin darker streaks below the pipe (flat paint strips)
    const len = rng.range(0.12, 0.26);
    kit.bx(parent, M.paint, '#a9aaa5', x - 0.03, x + 0.03, Math.max(0.01, y - 0.03 - len), y - 0.03, Math.min(zw, zw + s * 0.004), Math.max(zw, zw + s * 0.004), { noOutline: true, cast: false });
    kit.bx(parent, M.paint, '#b5b6b1', x - 0.06, x - 0.035, Math.max(0.01, y - 0.05 - len * 0.6), y - 0.04, Math.min(zw, zw + s * 0.004), Math.max(zw, zw + s * 0.004), { noOutline: true, cast: false });
  }
  // rain streaks under the coping at a few spots (paint strips, broken lengths)
  for (let x = x0 + 0.7; x < x1; x += rng.range(1.2, 2.6)) {
    if (!outside(x)) continue;
    const len = rng.range(0.25, 0.7), w = rng.range(0.03, 0.08);
    kit.bx(parent, M.paint, rng.pick(['#b7b8b3', '#bdbdb7', '#aeb0ab']), x, x + w, PT - 0.02 - len, PT - 0.02, Math.min(zw, zw + s * 0.004), Math.max(zw, zw + s * 0.004), { noOutline: true, cast: false });
  }
  // cable conduit with clips along the wall at 1.0 m
  const cx0 = P.id === 'P1' ? B.xMax + 0.4 : x0, cx1 = P.id === 'P1' ? x1 : x1;
  kit.rod(parent, M.metal, '#9ea3a8', 0.022, 'x', cx0, cx1, 1.02, zw + s * 0.03, 6, { noOutline: true });
  for (let x = cx0 + 0.3; x < cx1; x += 1.5) kit.bx(parent, M.metal, '#7c838b', x - 0.02, x + 0.02, 0.99, 1.05, Math.min(zw, zw + s * 0.06), Math.max(zw, zw + s * 0.06), { noOutline: true });
  // enamel plates
  const plates = P.id === 'P1' ? [-37.2, -19.6, 11.8] : [-30.5, 0.5];
  for (const x of plates) {
    const g = new THREE.Group();
    g.position.set(x, 0.95, zw + s * 0.012);
    g.rotation.y = s > 0 ? 0 : Math.PI;
    parent.add(g);
    kit.board(g, S.underPlat, 0.48, 0.2, 0, 0, 0, 0, { thick: 0.012, frame: 0.008, frameMat: M.vc, frameColor: '#cfcfc9' });
  }
  // dandelions, daisies and weeds hugging the wall foot
  const blade = new THREE.ConeGeometry(0.02, 1, 3);
  blade.translate(0, 0.5, 0);
  for (let x = x0 - 0.8; x < x1 + 3; x += rng.range(0.25, 0.7)) {
    if (!outside(x) || nearTree(x)) continue;
    const z = zw + s * rng.range(0.04, 0.22);
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const g = blade.clone();
      g.scale(1, rng.range(0.12, 0.34), 1);
      g.rotateZ(rng.range(-0.5, 0.5));
      g.rotateY(rng() * 6.28);
      g.translate(x + rng.range(-0.08, 0.08), 0, z + rng.range(-0.04, 0.04));
      kit.add(parent, g, M.vc, rng.pick(['#88b36a', '#7fa865', '#9cc27a', '#6f9a5a']), { noOutline: true, cast: false });
    }
    if (rng.chance(0.45)) {
      const h = rng.range(0.1, 0.24);
      const fx = x + rng.range(-0.1, 0.1);
      const st = new THREE.CylinderGeometry(0.005, 0.005, h, 3);
      st.translate(fx, h / 2, z);
      kit.add(parent, st, M.vc, '#6f9a5a', { noOutline: true, cast: false });
      const dand = rng.chance(0.6);
      kit.sphere(parent, M.vc, dand ? '#f6cf35' : '#fbfbf6', dand ? 0.03 : 0.032, fx, h, z, { sy: dand ? 0.55 : 0.3, ws: 7, hs: 4, noOutline: true, cast: false });
      if (!dand) kit.sphere(parent, M.vc, '#f2c230', 0.012, fx, h + 0.008, z, { ws: 5, hs: 3, noOutline: true, cast: false });
      kit.sphere(parent, M.vc, '#7fa865', 0.06, fx, 0.01, z, { sy: 0.2, ws: 6, hs: 3, noOutline: true, cast: false });
    }
  }
}

// ---------------------------------------------------------------------------
/** Weeds, dandelions, daisies and low shrubs outside the platform railings. */
function buildGreenery(kit, parent) {
  const { M, ctx } = kit;
  const rng = ctx.rng(7711);
  const B = STATION.building;
  const trees = TREES.filter((t) => t.z < -15 && t.z > -48 && t.x > -70 && t.x < 40);
  const nearTree = (x, z, r) => trees.some((t) => Math.hypot(t.x - x, t.z - z) < r);
  const blade = new THREE.ConeGeometry(0.025, 1, 3);
  blade.translate(0, 0.5, 0);
  const green = ['#88b36a', '#7fa865', '#9cc27a', '#6f9a5a', '#a9c983'];
  const tuft = (x, y, z, h) => {
    const n = 4 + Math.floor(rng() * 3);
    const col = rng.pick(green);
    for (let i = 0; i < n; i++) {
      const g = blade.clone();
      g.scale(1, h * rng.range(0.6, 1.1), 1);
      g.rotateZ(rng.range(-0.45, 0.45));
      g.rotateY(rng() * 6.28);
      g.translate(x + rng.range(-0.06, 0.06), y, z + rng.range(-0.06, 0.06));
      kit.add(parent, g, M.vc, col, { noOutline: true, cast: false });
    }
  };
  const flower = (x, y, z, kind) => {
    const h = rng.range(0.12, 0.28);
    const stem = new THREE.CylinderGeometry(0.006, 0.006, h, 3);
    stem.translate(x, y + h / 2, z);
    kit.add(parent, stem, M.vc, '#6f9a5a', { noOutline: true, cast: false });
    if (kind === 'dandelion') kit.sphere(parent, M.vc, '#f6cf35', 0.035, x, y + h, z, { sy: 0.55, ws: 7, hs: 4, noOutline: true, cast: false });
    else if (kind === 'puff') kit.sphere(parent, M.vc, '#f7f6f0', 0.04, x, y + h, z, { ws: 7, hs: 5, noOutline: true, cast: false });
    else {
      kit.sphere(parent, M.vc, '#fbfbf6', 0.035, x, y + h, z, { sy: 0.3, ws: 8, hs: 3, noOutline: true, cast: false });
      kit.sphere(parent, M.vc, '#f2c230', 0.013, x, y + h + 0.01, z, { ws: 5, hs: 3, noOutline: true, cast: false });
    }
    // rosette leaves
    kit.sphere(parent, M.vc, '#7fa865', 0.07, x, y + 0.01, z, { sy: 0.2, ws: 6, hs: 3, noOutline: true, cast: false });
  };
  const shrub = (x, z, r, hy) => {
    // a loose cluster of lumps (irregular silhouette), optional azalea flowers
    const base = rng.pick(['#6f9a5a', '#7fa865', '#5f8a4f', '#88a06a']);
    const lumps = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < lumps; i++) {
      const a = rng() * 6.28, d = i === 0 ? 0 : r * rng.range(0.35, 0.7);
      const rr = r * (i === 0 ? 0.8 : rng.range(0.45, 0.65));
      const col = i % 2 ? toonShade(base) : base;
      kit.sphere(parent, M.vc, col, rr, x + Math.cos(a) * d, hy - r * 0.15 + rng.range(-0.1, 0.15) * r, z + Math.sin(a) * d * 0.6, { sy: 0.78, ws: 8, hs: 6 });
    }
    if (rng.chance(0.5)) {
      const fc = rng.pick(['#f58fae', '#f7a9c0', '#ffffff', '#e978a0']);
      for (let i = 0; i < 12; i++) {
        const a = rng() * 6.28, e = rng.range(0.15, 1.0);
        kit.sphere(parent, M.vc, fc, 0.05, x + Math.cos(a) * r * 0.8 * Math.cos(e), hy - r * 0.1 + Math.sin(e) * r * 0.6, z + Math.sin(a) * r * 0.5 * Math.cos(e), { ws: 5, hs: 3, noOutline: true, cast: false });
      }
    }
  };
  const toonShade = (c) => kit.ctx.toon.shade(c, 0.06, 1.05);

  // strips: [x0, x1, z0, z1, groundY]
  const strips = [
    [PLAT_X0(), B.xMin - 1.2, -23.85, -22.9, 0], // outside P1 (west of the building)
    [B.xMax + 1.0, PLAT.xRampEnd, -23.85, -22.9, 0], // outside P1 (east)
    [PLAT_X0(), PLAT.xRampEnd, -41.2, -39.7, 0], // outside P2
  ];
  for (const [x0, x1, z0, z1, y] of strips) {
    const len = x1 - x0;
    for (let i = 0; i < len * 3.2; i++) {
      const x = rng.range(x0, x1), z = rng.range(z0, z1);
      if (nearTree(x, z, 0.9)) continue;
      tuft(x, y, z, rng.range(0.18, 0.45));
    }
    for (let i = 0; i < len * 0.9; i++) {
      const x = rng.range(x0, x1), z = rng.range(z0, z1);
      if (nearTree(x, z, 0.9)) continue;
      flower(x, y, z, rng.pick(['dandelion', 'dandelion', 'daisy', 'daisy', 'puff']));
    }
  }
  // shrubs outside P2 (peek over the platform edge) and a few outside P1
  for (let x = PLAT_X0() + 1.5; x < PLAT.xRampEnd - 1; x += rng.range(2.2, 4.2)) {
    if (nearTree(x, -40.6, 2.3)) continue;
    const r = rng.range(0.6, 0.9);
    shrub(x, -40.5 - rng.range(0, 0.4), r, rng.range(0.75, 1.15));
  }
  for (let x = PLAT_X0() + 2; x < B.xMin - 2; x += rng.range(3, 6)) {
    if (nearTree(x, -23.2, 2.6)) continue;
    shrub(x, -23.1, rng.range(0.45, 0.65), 0.45);
  }
  for (let x = B.xMax + 2.5; x < PLAT.xRampEnd; x += rng.range(3, 6)) {
    if (nearTree(x, -23.2, 2.6)) continue;
    shrub(x, -23.1, rng.range(0.45, 0.6), 0.45);
  }
  // weeds in the cracks along the railing bases on the platforms
  for (const [z, x0, x1] of [[-24.15, PLAT.xRampW, B.xMin - 0.5], [-24.15, B.xMax + 0.5, PLAT.xRampE], [-39.45, PLAT.xRampW, PLAT.xRampE]]) {
    for (let i = 0; i < (x1 - x0) * 0.2; i++) {
      const x = rng.range(x0, x1);
      tuft(x, PT, z + rng.range(-0.04, 0.04), rng.range(0.05, 0.12));
      if (rng.chance(0.25)) flower(x + 0.1, PT - 0.1, z, rng.pick(['dandelion', 'daisy']));
    }
  }
}
function PLAT_X0() { return PLAT.xLandW - 0.5; }
