/**
 * MASTER LAYOUT — the single source of truth for where everything lives.
 *
 * Units: metres.  Y is up.  North = -Z (the railway / station side),
 * south = +Z (the shopping street where the hero camera stands), east = +X.
 *
 *            z = -85  ~~~~~~~~~~~~ river ~~~~~~~~~~~~
 *            z = -70  ==== levee with sakura row =====
 *            z = -56      north residential lots
 *            z = -47  ------ north road ---------------
 *            z = -37.5  [ platform 2 ]
 *            z = -34.2  ======= track B (eastbound) ======= |crossing| x = 32
 *            z = -30.0  ======= track A (westbound) ======= |        |
 *            z = -26.2  [ platform 1 ]                      |        |
 *            z = -19.5  [station bldg]                      | road   |
 *            z =  -6      station plaza                     |        |
 *            z =  7.5 ------ station-front road ---------------------
 *            z = 10 .. 170   main street (gentle S-curve, slopes up)
 *                            shops + houses on both sides
 *                            hero camera around z = 70
 *
 * Every module reads positions from here instead of hard-coding them, so
 * independently built pieces line up.  Keep this file dependency-light.
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// small math helpers (exported so modules can reuse them)
// ---------------------------------------------------------------------------
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic PRNG (mulberry32).  rng() -> [0,1). */
export function makeRng(seed = 1) {
  let a = seed >>> 0 || 1;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * rng()); // inclusive
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

/** Stable string -> 32-bit hash, handy for per-object seeds. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// terrain height
// ---------------------------------------------------------------------------
export const TERRAIN = {
  // south: the main street climbs gently away from the station
  southSlopeStart: 12,
  southSlopeEnd: 125,
  southRise: 3.2,
  // north: levee, river, far bank, hillside
  leveeSouthFoot: -63.5,
  leveeTopSouth: -67.5,
  leveeTopNorth: -72.5,
  riverSouthBank: -77.5,
  riverNorthBank: -93.5,
  farLeveeTopSouth: -97.5,
  farLeveeTopNorth: -101.5,
  leveeHeight: 2.4,
  riverBed: -1.9,
  waterLevel: -1.15,
  hillSlope: 0.11, // rise per metre north of the far levee
  extentX: [-460, 460],
  extentZ: [-460, 300],
};

/**
 * Ground height at (x, z).  Roads, plaza, rail corridor and lots all sit on
 * this surface; always place things with groundY() rather than assuming 0.
 */
export function groundY(x, z) {
  const T = TERRAIN;
  let y = 0;
  if (z > T.southSlopeStart) {
    y = T.southRise * smoothstep(T.southSlopeStart, T.southSlopeEnd, z);
    // beyond the end keep rising very slowly so the far south isn't a plateau
    if (z > T.southSlopeEnd) y += (z - T.southSlopeEnd) * 0.03;
  } else if (z < T.leveeSouthFoot) {
    if (z >= T.leveeTopSouth) {
      y = T.leveeHeight * smoothstep(T.leveeSouthFoot, T.leveeTopSouth, z);
    } else if (z >= T.leveeTopNorth) {
      y = T.leveeHeight;
    } else if (z >= T.riverSouthBank) {
      y = lerp(T.riverBed, T.leveeHeight, smoothstep(T.riverSouthBank, T.leveeTopNorth, z));
    } else if (z >= T.riverNorthBank) {
      y = T.riverBed;
    } else if (z >= T.farLeveeTopSouth) {
      y = lerp(T.riverBed, T.leveeHeight, smoothstep(T.riverNorthBank, T.farLeveeTopSouth, z));
    } else if (z >= T.farLeveeTopNorth) {
      y = T.leveeHeight;
    } else {
      const d = T.farLeveeTopNorth - z;
      // hillside with gentle undulation along x
      y = T.leveeHeight + d * T.hillSlope + Math.sin(x * 0.013) * Math.min(d * 0.04, 6) + Math.sin(x * 0.031 + 1.3) * Math.min(d * 0.02, 3);
    }
  }
  return y;
}

/** True if (x,z) lies over the river water surface. */
export function isRiver(x, z) {
  return z < TERRAIN.riverSouthBank && z > TERRAIN.riverNorthBank;
}

// ---------------------------------------------------------------------------
// railway
// ---------------------------------------------------------------------------
export const RAIL = {
  xMin: -440,
  xMax: 440,
  gauge: 1.067, // Japanese narrow gauge (rail centre-to-centre ~1.13)
  tracks: [
    { id: 'A', z: -30.0, dir: -1, platform: 'P1' }, // south track, trains head west (-x)
    { id: 'B', z: -34.2, dir: +1, platform: 'P2' }, // north track, trains head east (+x)
  ],
  corridor: { zMin: -42.0, zMax: -24.0 }, // fenced railway land (platforms included)
  ballastBottomWidth: 4.2, // per track, at y = 0
  ballastTopWidth: 2.9,
  ballastTop: 0.25,
  sleeperTop: 0.31,
  railTop: 0.45, // top of rail head, world y (railway ground is flat y = 0)
  sleeperSpacing: 0.62,
  catenary: {
    contactWireY: 5.3, // above y = 0
    messengerY: 6.3,
    poleSpacing: 45,
    poleZ: [-26.9, -37.3], // outer sides; poles carry cantilevers over both tracks
    poleX0: -430,
  },
  // signals / markers
  homeSignals: [
    { track: 'A', x: 72, side: -1 }, // westbound home signal east of station (before crossing)
    { track: 'B', x: -96, side: 1 }, // eastbound home signal west of station
  ],
  startSignals: [
    { track: 'A', x: -62, side: -1 },
    { track: 'B', x: 34 + 10, side: 1 },
  ],
  kmPosts: [-180, -80, 20, 120, 220].map((x, i) => ({ x, km: 12.4 + i * 0.1 })),
  // A scissors-free crossover west of the station (two turnouts linking A and B), purely scenic:
  // trains in the simulation never take the diverging route.  Point machines sit beside each switch.
  turnouts: [
    { id: 'T1', track: 'A', xSwitch: -118, xFrog: -101, divergesTo: 'B', hand: 'toward -z' },
    { id: 'T2', track: 'B', xSwitch: -84, xFrog: -101, divergesTo: 'A', hand: 'toward +z' },
  ],
};

// ---------------------------------------------------------------------------
// station & platforms
// ---------------------------------------------------------------------------
export const PLATFORM = {
  top: 1.55, // platform surface y == train floor height
  xMin: -50,
  xMax: 22,
  rampLength: 5, // sloped ends beyond xMin / xMax down to y = 0 (staff / in-station crossing)
  P1: { zTrack: -28.4, zBack: -24.0, track: 'A' }, // edge near track A .. back edge
  P2: { zTrack: -35.8, zBack: -39.6, track: 'B' },
  edgeTactileWidth: 0.6, // yellow warning blocks start ~0.8 m from the edge
  doorMarks: true,
};

export const STATION = {
  name: '桜ヶ丘',
  kana: 'さくらがおか',
  romaji: 'Sakuragaoka',
  code: 'HK07',
  line: '春風線',
  lineRomaji: 'Harukaze Line',
  company: '春風電鉄',
  companyRomaji: 'Harukaze Electric Railway',
  lineColor: '#f29bb4', // soft sakura pink line identification colour
  west: { name: '花見台', kana: 'はなみだい', romaji: 'Hanamidai', code: 'HK06' },
  east: { name: '春日野', kana: 'かすがの', romaji: 'Kasugano', code: 'HK08' },
  // single-storey building sitting between the plaza and platform 1
  building: { xMin: -14, xMax: 6, zMin: -24.0, zMax: -15.0, floorY: 0.15, eaveY: 4.1, ridgeY: 6.2 },
  entrance: { x: -4, z: -15.0, width: 6 }, // opening in the south facade
  // in-station level crossing (構内踏切) linking P1 and P2 at the west end
  internalCrossingX: -53.5,
  staffWindow: { x: 1.5, z: -18.5 },
};

// ---------------------------------------------------------------------------
// roads
// ---------------------------------------------------------------------------
/**
 * Main shopping street.  Centreline is a gentle S-curve running south from
 * the station-front road.  Profile (metres from centreline):
 *   0 .. 3.0   asphalt carriageway (white edge line at 2.9..3.05)
 *   3.0 .. 4.0 outer asphalt strip used by pedestrians (no raised pavement)
 *   4.0 .. 4.45 concrete gutter (U-channel with grates / covers)
 *   4.6        lot front line — buildings start here
 */
const mainPts = [
  [0, 7.5], [0.4, 22], [0.9, 38], [-0.4, 55], [-2.6, 72], [-3.6, 92], [-2.4, 115], [0.4, 140], [1.6, 172], [1.0, 215],
].map(([x, z]) => new THREE.Vector3(x, 0, z));
const mainCurve = new THREE.CatmullRomCurve3(mainPts, false, 'centripetal');
const MAIN_SAMPLES = 800;
const mainTable = [];
{
  const len = mainCurve.getLength();
  for (let i = 0; i <= MAIN_SAMPLES; i++) {
    const u = i / MAIN_SAMPLES;
    const p = mainCurve.getPointAt(u);
    const t = mainCurve.getTangentAt(u);
    mainTable.push({ s: u * len, u, x: p.x, z: p.z, tx: t.x, tz: t.z });
  }
}

function sampleTable(table, key, v) {
  let lo = 0, hi = table.length - 1;
  if (v <= table[0][key]) return { ...table[0] };
  if (v >= table[hi][key]) return { ...table[hi] };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid][key] <= v) lo = mid; else hi = mid;
  }
  const a = table[lo], b = table[hi];
  const t = (v - a[key]) / (b[key] - a[key]);
  const o = {};
  for (const k of Object.keys(a)) o[k] = lerp(a[k], b[k], t);
  const l = Math.hypot(o.tx, o.tz) || 1;
  o.tx /= l; o.tz /= l;
  return o;
}

function framed(o) {
  // tangent points south (+z-ish).  "right" normal = tangent rotated -90deg about +Y.
  // With tangent ~ (0,0,1), right normal ~ (-1,0,0)?  We define side +1 = east (+x).
  const nx = o.tz, nz = -o.tx; // (tz, -tx) points east when tangent points south
  return { ...o, nx, nz };
}

export const MAIN_STREET = {
  curve: mainCurve,
  length: mainTable[mainTable.length - 1].s,
  halfWidth: 3.0,
  edgeLine: 2.95,
  shoulder: 4.0,
  gutter: [4.0, 4.45],
  lotFront: 4.6,
  zStart: 7.5,
  zEnd: 215,
  /** Sample by z (z increases monotonically along the street). Returns {x,z,s,tx,tz,nx,nz}; n points east. */
  atZ(z) { return framed(sampleTable(mainTable, 'z', z)); },
  /** Sample by arc length s. */
  atS(s) { return framed(sampleTable(mainTable, 's', s)); },
  /** Point offset `d` metres to the east (+) / west (-) of the centreline at arc length s. */
  offsetAtS(s, d) {
    const o = this.atS(s);
    return { x: o.x + o.nx * d, z: o.z + o.nz * d, y: groundY(o.x + o.nx * d, o.z + o.nz * d), frame: o };
  },
  centerX(z) { return this.atZ(z).x; },
};

/** Straight roads (axis aligned). `axis` is the direction the road runs along. */
export const ROADS = {
  stationFront: { axis: 'x', z: 7.5, from: -150, to: 160, halfWidth: 3.25, centerLine: 'orange', edgeLine: 3.2, shoulder: 4.1, gutter: [4.1, 4.5] },
  crossingRoad: { axis: 'z', x: 32, from: -49.5, to: 7.5, halfWidth: 2.75, centerLine: 'none', edgeLine: 2.65, shoulder: 2.75, gutter: [2.75, 3.1] },
  northRoad: { axis: 'x', z: -47, from: -150, to: 120, halfWidth: 2.5, centerLine: 'none', edgeLine: 2.4, shoulder: 2.5, gutter: [2.5, 2.85] },
  leveePath: { axis: 'x', z: -70, from: -200, to: 200, halfWidth: 1.6, surface: 'gravel' },
  /**
   * Narrow residential lanes (路地) that fill the blocks behind the frontage with simple houses
   * (layout lots with filler: true).  Plain faded asphalt, white edge lines at most, no centre line.
   */
  lanes: [
    { id: 'LE1', axis: 'x', z: 44, from: 38, to: 146, halfWidth: 1.8 },
    { id: 'LE2', axis: 'x', z: 78, from: 39, to: 146, halfWidth: 1.8 },
    { id: 'LE3', axis: 'x', z: 112, from: 37, to: 146, halfWidth: 1.8 },
    { id: 'LW1', axis: 'x', z: 44, from: -140, to: -40, halfWidth: 1.8 },
    { id: 'LW2', axis: 'x', z: 78, from: -140, to: -43, halfWidth: 1.8 },
    { id: 'LW3', axis: 'x', z: 112, from: -140, to: -43, halfWidth: 1.8 },
    { id: 'LNE', axis: 'x', z: -12.8, from: 38, to: 146, halfWidth: 1.6, oneSide: 'north' },
    { id: 'LNW', axis: 'x', z: -12.8, from: -140, to: -34, halfWidth: 1.6, oneSide: 'north' },
  ],
};

// Road markings the terrain module should paint (all world-space, text reads toward the approaching driver)
/**
 * Small concrete road/foot bridge over the river (terrain.js builds it): deck spans from the
 * levee-top path to the far levee, walkable.
 */
export const BRIDGE = { x: 58, halfWidth: 2.4, zSouth: -71.5, zNorth: -98.5, deckY: 3.05, railH: 1.1 };

/**
 * Road markings for terrain.js to paint.
 *   street: 'main' (position by z along the curve, `lateral` = signed offset from the centreline, + = east)
 *           'crossing' (x = 32 road, position by z, lateral + = east)
 *           'stationFront' (z = 7.5 road, position by x, lateral + = south)
 *   readFrom: the direction a reader approaches from; the text's top points away from them.
 *   Traffic keeps LEFT: on the main street northbound (towards the station) uses the WEST half.
 */
export const ROAD_MARKINGS = [
  // main street approach to the T-junction with the station-front road
  { type: 'zebra', street: 'main', z: 12.4, length: 3.0 }, // stripes span the full carriageway
  { type: 'stopLine', street: 'main', z: 14.6, lateral: -1.5, width: 2.9 },
  { type: 'tomare', street: 'main', z: 17.8, lateral: -1.5, readFrom: 'south' },
  { type: 'diamond', street: 'main', z: 36, lateral: -1.5, readFrom: 'south' }, // ◇ pedestrian crossing ahead
  { type: 'text', text: 'スピード落とせ', street: 'main', z: 58, lateral: -1.5, readFrom: 'south' },
  { type: 'text', text: '通学路', street: 'main', z: 96, lateral: 1.5, readFrom: 'north' },
  { type: 'bicycle', street: 'main', z: 26, lateral: 3.45, readFrom: 'north' },
  { type: 'bicycle', street: 'main', z: 82, lateral: -3.45, readFrom: 'south' },
  { type: 'pedestrian', street: 'main', z: 44, lateral: -3.45, readFrom: 'south' },
  // station-front road: zebra linking the plaza and the main street
  { type: 'zebra', street: 'stationFront', x: -1.0, length: 3.0 },
  // crossing road: stop lines and warnings before the level crossing
  { type: 'stopLine', street: 'crossing', z: -22.4, lateral: -1.35, width: 2.6 }, // northbound = west half (keep left)
  { type: 'stopLine', street: 'crossing', z: -42.0, lateral: 1.35, width: 2.6 }, // southbound = east half
  { type: 'tomare', street: 'crossing', z: -19.6, lateral: -1.35, readFrom: 'south' },
  { type: 'tomare', street: 'crossing', z: -44.6, lateral: 1.35, readFrom: 'north' },
  { type: 'text', text: '踏切注意', street: 'crossing', z: -12.5, lateral: -1.35, readFrom: 'south' },
];

// ---------------------------------------------------------------------------
// level crossing (踏切)
// ---------------------------------------------------------------------------
export const CROSSING = {
  x: 32,
  roadHalfWidth: 2.75,
  zSouth: -24.4, // barrier / warning-post line south of the tracks
  zNorth: -39.9, // ... north of the tracks
  deckZ: [-26.2, -38.0], // rubber / concrete crossing panels span
  pedestrianWait: [{ x: 35.6, z: -22.9 }, { x: 28.4, z: -41.4 }],
  // time the barriers take to come down / go up
  lowerSeconds: 6,
  raiseSeconds: 4,
};

// ---------------------------------------------------------------------------
// train
// ---------------------------------------------------------------------------
export const TRAIN = {
  cars: 3,
  carLength: 18.0, // coupler face to coupler face
  carGap: 0.6,
  width: 2.8,
  floorY: PLATFORM.top, // world y of the car floor when on the track
  roofY: RAIL.railTop + 3.65,
  doorsPerSide: 3,
  // stop positions (x of the FRONT coupler face) at the platform
  stopFrontX: { A: -46.5, B: 18.5 },
  cruiseSpeed: 14, // m/s (~50 km/h) when entering / leaving
};

// ---------------------------------------------------------------------------
// plaza (駅前広場)
// ---------------------------------------------------------------------------
export const PLAZA = {
  xMin: -30, xMax: 22, zMin: -15.0, zMax: 3.85,
  paving: 'grey-square-tiles',
  grandTree: { x: -15.5, z: -5.5 }, // big sakura with the round wooden bench
  // furniture spots (props module owns these unless noted)
  busStop: { x: 13.5, z: 2.9, rotY: 0 },
  taxiSign: { x: 18.5, z: 2.6, rotY: 0 },
  phoneBooth: { x: -26.5, z: 0.6, rotY: Math.PI / 2 },
  mailbox: { x: 7.8, z: -12.6, rotY: 0 },
  mapBoard: { x: -9.5, z: -13.6, rotY: 0 },
  touristBoard: { x: 10.8, z: -11.8, rotY: -0.35 },
  noticeBoard: { x: -26.8, z: -9.0, rotY: Math.PI / 2 },
  bikeParking: { xMin: -29.4, xMax: -21.5, zMin: -14.4, zMax: -2.5 }, // rows run along z
  flowerBeds: [
    { x: -3.5, z: -3.0, w: 7.0, d: 1.6 },
    { x: 6.5, z: -3.0, w: 5.0, d: 1.6 },
    { x: 15.5, z: -8.0, w: 1.8, d: 6.0 },
  ],
  benches: [
    { x: 1.0, z: -9.6, rotY: Math.PI },
    { x: 12.5, z: -3.6, rotY: -Math.PI / 2 },
  ],
  bollards: { z: 3.3, xs: [-28, -24, -20, -16, -12, -8, 9, 13, 17, 21] },
  trashBins: [{ x: 9.8, z: -15.3, rotY: 0 }],
  east: { xMin: 22.3, xMax: 28.8, zMin: -22.5, zMax: 3.5, use: 'second bicycle parking + public toilet box' },
};

// ---------------------------------------------------------------------------
// lots (building plots)
// ---------------------------------------------------------------------------
/**
 * Lot convention (shared by houses.js and shops.js):
 *   - (x, z) = centre of the footprint at ground level; y = groundY at the lot front centre
 *   - rotY: the building's local +Z axis points to the street (the FRONT faces +Z locally)
 *   - width along local X, depth along local Z; front wall at local z = +depth/2
 *   - the "apron" is the strip between the lot front and the road gutter (≈ 0.2..1.4 m):
 *     the lot owner may put potted plants, signboards, bikes, crates there.
 *   - gardenTree: if set, a sakura tree stands at that world position and the
 *     building must leave a ~2.5 m radius clear around it (tree is built by sakura.js)
 *   - drop: world point on the front wall (~5.6 m up) where the utility-pole
 *     service wire attaches (built by poles.js)
 */
function lotFromStreet({ s0, side, spec, idx }) {
  // side: -1 west, +1 east.  Front faces the street centreline.
  if (spec.setback === undefined) spec = { ...spec, setback: spec.type === 'house' ? 0.7 + (hashString(`sb${side}${idx}`) % 14) / 10 : 0.8 };
  const sMid = s0 + spec.width / 2;
  const fr = MAIN_STREET.atS(sMid);
  const off = MAIN_STREET.lotFront + spec.depth / 2 + (spec.setback || 0);
  const x = fr.x + fr.nx * side * off;
  const z = fr.z + fr.nz * side * off;
  const fx = -fr.nx * side, fz = -fr.nz * side; // front direction (towards the street)
  const rotY = Math.atan2(fx, fz);
  const frontX = fr.x + fr.nx * side * (MAIN_STREET.lotFront + (spec.setback || 0));
  const frontZ = fr.z + fr.nz * side * (MAIN_STREET.lotFront + (spec.setback || 0));
  return {
    id: `M${side < 0 ? 'W' : 'E'}${String(idx).padStart(2, '0')}`,
    street: 'main',
    side,
    x, z,
    y: groundY(frontX, frontZ),
    rotY,
    width: spec.width,
    depth: spec.depth,
    floors: spec.floors ?? 2,
    type: spec.type,
    name: spec.name,
    seed: hashString(`main-${side}-${idx}-${spec.type}`),
    front: { x: frontX, z: frontZ, dirX: fx, dirZ: fz },
    setback: spec.setback,
    s: sMid,
  };
}

function lotAxis({ x, z, width, depth, facing, spec, id }) {
  // facing: 'north' | 'south' | 'east' | 'west' (direction the FRONT faces)
  const dir = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[facing];
  const rotY = Math.atan2(dir[0], dir[1]);
  const frontX = x + dir[0] * depth / 2;
  const frontZ = z + dir[1] * depth / 2;
  return {
    id,
    street: spec.street,
    side: 0,
    x, z,
    y: groundY(frontX, frontZ),
    rotY,
    width,
    depth,
    floors: spec.floors ?? 2,
    type: spec.type,
    name: spec.name,
    seed: hashString(id),
    front: { x: frontX, z: frontZ, dirX: dir[0], dirZ: dir[1] },
  };
}

// Main street frontage, listed from the station end southwards.
const MAIN_WEST = [
  { type: 'cafe', name: '喫茶 はるかぜ', width: 9.5, depth: 10, floors: 2, setback: 2.0 },
  { type: 'flower', name: 'フラワーショップ 花音', width: 6.5, depth: 9, floors: 2, setback: 1.5 },
  { type: 'books', name: '青空書店', width: 7.5, depth: 10, floors: 2, setback: 0.8 },
  { type: 'house', width: 8.5, depth: 10, floors: 2 },
  { type: 'bicycle', name: 'サイクル 風見', width: 8, depth: 10, floors: 2, setback: 1.4 },
  { type: 'house', width: 9, depth: 10, floors: 2, gardenTree: 'hero' },
  { type: 'house', width: 8, depth: 9.5, floors: 2 },
  { type: 'house', width: 9.5, depth: 11, floors: 2 },
  { type: 'house', width: 8, depth: 10, floors: 2, gardenTree: true },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 8.5, depth: 10, floors: 1 },
  { type: 'house', width: 9.5, depth: 11, floors: 2 },
  { type: 'house', width: 8, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 10, depth: 11, floors: 2 },
  { type: 'house', width: 8.5, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
];
const MAIN_EAST = [
  { type: 'konbini', name: 'はるマート', width: 15, depth: 12, floors: 1, setback: 3.0 },
  { type: 'wagashi', name: '和菓子 さくら庵', width: 7.5, depth: 10, floors: 2, setback: 1.3 },
  { type: 'zakka', name: '山田商店', width: 7.5, depth: 10, floors: 2, setback: 1.1 },
  { type: 'ramen', name: 'らーめん 春来', width: 7, depth: 10, floors: 2, setback: 0.8 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 8.5, depth: 10, floors: 2 },
  { type: 'house', width: 9.5, depth: 11, floors: 2, gardenTree: true },
  { type: 'house', width: 8, depth: 9.5, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 1 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 8.5, depth: 10, floors: 2 },
  { type: 'house', width: 10, depth: 11, floors: 2 },
  { type: 'house', width: 8, depth: 10, floors: 2, gardenTree: true },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 9.5, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
  { type: 'house', width: 9, depth: 10, floors: 2 },
];

function buildLots() {
  const lots = [];
  const streetStartS = MAIN_STREET.atZ(ROADS.stationFront.z + ROADS.stationFront.gutter[1] + 0.9).s;
  for (const [side, list] of [[-1, MAIN_WEST], [1, MAIN_EAST]]) {
    let s = streetStartS;
    list.forEach((spec, i) => {
      const gap = i === 0 ? 0 : 0.9 + ((hashString(`gap${side}${i}`) % 100) / 100) * 1.2;
      s += gap;
      if (s + spec.width > MAIN_STREET.length - 6) return;
      const lot = lotFromStreet({ s0: s, side, spec, idx: i });
      if (spec.gardenTree) {
        // tree sits in a side garden, just beyond the lot's far side edge (southern end), set back 2 m
        const fr = MAIN_STREET.atS(s + spec.width + 2.2);
        const off = MAIN_STREET.lotFront + (spec.gardenTree === 'hero' ? 1.9 : 2.6);
        lot.gardenTree = { x: fr.x + fr.nx * side * off, z: fr.z + fr.nz * side * off, hero: spec.gardenTree === 'hero' };
        s += 4.2; // leave room for the garden
      }
      lots.push(lot);
      s += spec.width;
    });
  }

  // Second row behind the main street frontage (partially visible through gaps).
  // Simplified houses are fine here.
  for (const side of [-1, 1]) {
    let s = MAIN_STREET.atZ(26).s;
    let i = 0;
    while (s < MAIN_STREET.length - 30) {
      const w = 8 + (hashString(`r2w${side}${i}`) % 30) / 10;
      const d = 9 + (hashString(`r2d${side}${i}`) % 20) / 10;
      const fr = MAIN_STREET.atS(s + w / 2);
      const off = MAIN_STREET.lotFront + 12.5 + 2 + d / 2;
      const x = fr.x + fr.nx * side * off;
      const z = fr.z + fr.nz * side * off;
      const fx = -fr.nx * side, fz = -fr.nz * side;
      lots.push({
        id: `R${side < 0 ? 'W' : 'E'}${String(i).padStart(2, '0')}`,
        street: 'backrow', side, x, z, y: groundY(x, z), rotY: Math.atan2(fx, fz), width: w, depth: d,
        floors: hashString(`r2f${side}${i}`) % 5 === 0 ? 1 : 2, type: 'house', simple: true,
        seed: hashString(`backrow${side}${i}`),
        front: { x: x + fx * d / 2, z: z + fz * d / 2, dirX: fx, dirZ: fz },
      });
      s += w + 1.5 + (hashString(`r2g${side}${i}`) % 20) / 10;
      i++;
    }
  }

  // Station-front road, south side (fronts face north towards the station).
  // west of the café corner lot, and east of the konbini corner lot.
  const sf = ROADS.stationFront;
  const southFrontZ = sf.z + sf.gutter[1] + 0.15;
  const cafe = lots.find((l) => l.type === 'cafe');
  const konbini = lots.find((l) => l.type === 'konbini');
  const cafeWestEdge = Math.min(...cornerXs(cafe)) - 1.2;
  const konbiniEastEdge = Math.max(...cornerXs(konbini)) + 1.2;
  const sfSouthWest = [
    { type: 'tabako', name: '松本たばこ店', width: 6.5, depth: 9, floors: 2, setback: 0.6 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 8.5, depth: 10, gardenTree: true },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 10, depth: 11 },
    { type: 'house', width: 8.5, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9.5, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
  ];
  let x = cafeWestEdge;
  sfSouthWest.forEach((spec, i) => {
    const cx = x - spec.width / 2;
    if (cx - spec.width / 2 < sf.from + 6) return;
    const lot = lotAxis({ x: cx, z: southFrontZ + spec.depth / 2, width: spec.width, depth: spec.depth, facing: 'north', spec: { ...spec, street: 'stationFront' }, id: `SW${String(i).padStart(2, '0')}` });
    if (spec.gardenTree) { lot.gardenTree = { x: cx - spec.width / 2 - 2.4, z: southFrontZ + 2.6 }; x -= 4.6; }
    lots.push(lot);
    x -= spec.width + 1.1 + (i % 3) * 0.4;
  });
  const sfSouthEast = [
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 8.5, depth: 10 },
    { type: 'house', width: 9.5, depth: 10, gardenTree: true },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 10, depth: 11 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 8.5, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9.5, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
    { type: 'house', width: 9, depth: 10 },
  ];
  x = konbiniEastEdge;
  sfSouthEast.forEach((spec, i) => {
    const cx = x + spec.width / 2;
    if (cx + spec.width / 2 > sf.to - 6) return;
    const lot = lotAxis({ x: cx, z: southFrontZ + spec.depth / 2, width: spec.width, depth: spec.depth, facing: 'north', spec: { ...spec, street: 'stationFront' }, id: `SE${String(i).padStart(2, '0')}` });
    if (spec.gardenTree) { lot.gardenTree = { x: cx + spec.width / 2 + 2.4, z: southFrontZ + 2.6 }; x += 4.6; }
    lots.push(lot);
    x += spec.width + 1.1 + (i % 3) * 0.4;
  });

  // Station-front road, north side (fronts face south), west of the plaza and east of the crossing road.
  const northFrontZ = sf.z - sf.gutter[1] - 0.15;
  x = PLAZA.xMin - 1.5;
  const nwSpecs = [
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 8.5, depth: 11 },
    { type: 'house', width: 10, depth: 12 },
    { type: 'house', width: 9, depth: 11, gardenTree: true },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9.5, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
  ];
  nwSpecs.forEach((spec, i) => {
    const cx = x - spec.width / 2;
    if (cx - spec.width / 2 < sf.from + 6) return;
    const lot = lotAxis({ x: cx, z: northFrontZ - spec.depth / 2, width: spec.width, depth: spec.depth, facing: 'south', spec: { ...spec, street: 'stationFront' }, id: `NW${String(i).padStart(2, '0')}` });
    if (spec.gardenTree) { lot.gardenTree = { x: cx - spec.width / 2 - 2.4, z: northFrontZ - 3 }; x -= 4.6; }
    lots.push(lot);
    x -= spec.width + 1.2 + (i % 2) * 0.5;
  });
  x = ROADS.crossingRoad.x + ROADS.crossingRoad.gutter[1] + 1.2;
  const neSpecs = [
    { type: 'house', width: 9, depth: 11, gardenTree: true },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 8.5, depth: 11 },
    { type: 'house', width: 10, depth: 12 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9.5, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
    { type: 'house', width: 9, depth: 11 },
  ];
  neSpecs.forEach((spec, i) => {
    if (spec.gardenTree && i === 0) x += 4.6; // tree at the crossing-road corner
    const cx = x + spec.width / 2;
    if (cx + spec.width / 2 > sf.to - 6) return;
    const lot = lotAxis({ x: cx, z: northFrontZ - spec.depth / 2, width: spec.width, depth: spec.depth, facing: 'south', spec: { ...spec, street: 'stationFront' }, id: `NE${String(i).padStart(2, '0')}` });
    if (spec.gardenTree && i === 0) lot.gardenTree = { x: cx - spec.width / 2 - 2.5, z: northFrontZ - 3.5 };
    lots.push(lot);
    x += spec.width + 1.2 + (i % 2) * 0.5;
  });

  // North road, north side (fronts face south towards the railway): quiet residential.
  const nr = ROADS.northRoad;
  const nrFrontZ = nr.z - nr.gutter[1] - 0.2;
  const northSpecs = [];
  for (let i = 0; i < 26; i++) {
    const w = 8.5 + (hashString(`nw${i}`) % 25) / 10;
    northSpecs.push({ type: 'house', width: w, depth: 10 + (hashString(`nd${i}`) % 15) / 10, floors: hashString(`nf${i}`) % 6 === 0 ? 1 : 2, gardenTree: i % 5 === 2 });
  }
  x = nr.from + 8;
  northSpecs.forEach((spec, i) => {
    const cx = x + spec.width / 2;
    // skip the crossing road corridor
    const cr = ROADS.crossingRoad;
    if (cx + spec.width / 2 > cr.x - cr.gutter[1] - 0.8 && cx - spec.width / 2 < cr.x + cr.gutter[1] + 0.8) {
      x = cr.x + cr.gutter[1] + 1.0;
      return;
    }
    if (cx + spec.width / 2 > nr.to - 4) return;
    const lot = lotAxis({ x: cx, z: nrFrontZ - spec.depth / 2, width: spec.width, depth: spec.depth, facing: 'south', spec: { ...spec, street: 'north' }, id: `NR${String(i).padStart(2, '0')}` });
    if (spec.gardenTree) { lot.gardenTree = { x: cx + spec.width / 2 + 2.3, z: nrFrontZ - 3.2 }; x += 4.6; }
    lots.push(lot);
    x += spec.width + 1.3 + (i % 3) * 0.4;
  });

  // derived data common to every lot
  for (const lot of lots) {
    const c = Math.cos(lot.rotY), s = Math.sin(lot.rotY);
    // local -> world: wx = x + lx*c + lz*s ; wz = z - lx*s + lz*c
    lot.toWorld = (lx, lz) => ({ x: lot.x + lx * c + lz * s, z: lot.z - lx * s + lz * c });
    const fh = lot.floors === 1 ? 3.4 : 6.0;
    const fl = lot.toWorld(-lot.width * 0.3, lot.depth / 2);
    lot.drop = { x: fl.x, y: lot.y + Math.min(fh - 0.4, 5.6), z: fl.z };
    lot.corners = [
      lot.toWorld(-lot.width / 2, -lot.depth / 2), lot.toWorld(lot.width / 2, -lot.depth / 2),
      lot.toWorld(lot.width / 2, lot.depth / 2), lot.toWorld(-lot.width / 2, lot.depth / 2),
    ];
  }
  return lots;
}

function cornerXs(lot) {
  const c = Math.cos(lot.rotY), s = Math.sin(lot.rotY);
  const xs = [];
  for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    xs.push(lot.x + (lx * lot.width) / 2 * c + (lz * lot.depth) / 2 * s);
  }
  return xs;
}

export const LOTS = buildLots();

// Filler lots along the residential lanes (simple houses; built by houses.js as cheap 'simple' lots).
{
  const keepOut = [
    { x: -46.5, z: -18.5, r: 4 }, // shrine
    { x: 38.0, z: -21.6, r: 5 }, { x: -62, z: -21.5, r: 5 }, { x: -78, z: -21.8, r: 4.5 }, { x: -20.5, z: -20.0, r: 4.5 },
  ];
  let n = 0;
  for (const lane of ROADS.lanes) {
    const sides = lane.oneSide === 'north' ? [-1] : [-1, 1]; // -1 = north side (lot fronts face south)
    for (const side of sides) {
      let x = lane.from + 1.5;
      let i = 0;
      while (true) {
        const h = hashString(`fill-${lane.id}-${side}-${i}`);
        const w = 8 + (h % 25) / 10;
        const d = lane.oneSide ? 8.2 : 9 + ((h >>> 5) % 12) / 10;
        if (x + w > lane.to - 1) break;
        const cx = x + w / 2;
        const cz = lane.z + side * (lane.halfWidth + 0.6 + d / 2);
        const blocked = keepOut.some((k) => Math.abs(k.x - cx) < w / 2 + k.r && Math.abs(k.z - cz) < d / 2 + k.r);
        const vacant = (h >>> 9) % 10 < 2; // some empty plots: gardens, parking, fields
        if (!blocked && !vacant) {
          const id = `F${lane.id}${side < 0 ? 'N' : 'S'}${String(i).padStart(2, '0')}`;
          const facing = side < 0 ? 'south' : 'north';
          const dir = facing === 'south' ? [0, 1] : [0, -1];
          const rotY = Math.atan2(dir[0], dir[1]);
          const fx = cx, fz = cz + dir[1] * d / 2;
          const lot = {
            id, street: lane.id, side: 0, x: cx, z: cz, y: groundY(fx, fz), rotY, width: w, depth: d,
            floors: (h >>> 13) % 5 === 0 ? 1 : 2, type: 'house', simple: true, filler: true, setback: 0.6,
            seed: hashString(id), front: { x: fx, z: fz, dirX: dir[0], dirZ: dir[1] },
          };
          const c = Math.cos(rotY), sn = Math.sin(rotY);
          lot.toWorld = (lx, lz) => ({ x: lot.x + lx * c + lz * sn, z: lot.z - lx * sn + lz * c });
          const fl = lot.toWorld(-w * 0.3, d / 2);
          lot.drop = { x: fl.x, y: lot.y + (lot.floors === 1 ? 3.0 : 5.4), z: fl.z };
          lot.corners = [lot.toWorld(-w / 2, -d / 2), lot.toWorld(w / 2, -d / 2), lot.toWorld(w / 2, d / 2), lot.toWorld(-w / 2, d / 2)];
          LOTS.push(lot);
          n++;
        }
        x += w + 1.2 + ((h >>> 17) % 15) / 10;
        i++;
      }
    }
  }
}
export const lotById = (id) => LOTS.find((l) => l.id === id);
export const lotsOfType = (type) => LOTS.filter((l) => l.type === type);
export const SHOP_TYPES = ['cafe', 'flower', 'books', 'bicycle', 'konbini', 'wagashi', 'zakka', 'ramen', 'tabako'];

// ---------------------------------------------------------------------------
// sakura trees
// ---------------------------------------------------------------------------
/**
 * kind: 'grand' (plaza centrepiece), 'large', 'medium', 'row' (levee rows), 'small'.
 * lean: optional {x,z} horizontal lean direction (trunk leans toward it, canopy
 *       spreads over the road).  scale multiplies the kind's base size.
 */
function buildTrees() {
  const T = [];
  const add = (x, z, kind, extra = {}) => T.push({ x, z, y: groundY(x, z), kind, scale: 1, seed: hashString(`tree${T.length}`), ...extra });
  // plaza centrepiece
  add(PLAZA.grandTree.x, PLAZA.grandTree.z, 'grand', { scale: 1.0 });
  // near the station entrance / platform ends
  add(11.5, -18.5, 'medium', { scale: 0.9 });
  add(19.0, -21.8, 'medium', { scale: 0.85 });
  add(-20.5, -20.0, 'medium', { scale: 0.95 });
  // along the outside of platform 2 (canopies overhang the platform fence)
  for (const x of [-44, -29, -13, 3, 17]) add(x, -43.0, 'large', { scale: 0.95 + ((hashString(`p2t${x}`) % 20) / 100), lean: { x: 0, z: 1 } });
  // west end of the railway, south side
  add(-62, -21.5, 'large', { lean: { x: 0, z: -1 } });
  add(-78, -21.8, 'medium');
  // by the level crossing
  add(38.0, -21.6, 'large', { lean: { x: -1, z: -0.3 } });
  add(25.0, -43.3, 'medium');
  // main street corner trees + the foreground hero tree overhanging the road
  // garden trees behind walls
  for (const lot of LOTS) {
    if (!lot.gardenTree) continue;
    if (lot.gardenTree.hero) {
      // foreground hero tree: leans out over the main street and frames the hero shot
      add(lot.gardenTree.x, lot.gardenTree.z, 'large', { scale: 1.15, lean: { x: lot.front.dirX, z: lot.front.dirZ }, hero: true, lotId: lot.id });
    } else {
      add(lot.gardenTree.x, lot.gardenTree.z, 'medium', { scale: 0.8 + ((lot.seed % 30) / 100), lotId: lot.id });
    }
  }
  // levee rows (both edges of the levee-top path), classic hanami tunnel
  for (let x = -190; x <= 190; x += 10.5) {
    const j = ((hashString(`lv${x}`) % 100) / 100 - 0.5) * 2.4;
    add(x + j, -67.2, 'row', { scale: 0.9 + ((hashString(`lvs${x}`) % 25) / 100), lean: { x: 0, z: -0.6 } });
    add(x + 5 + j * 0.7, -73.0, 'row', { scale: 0.85 + ((hashString(`lvn${x}`) % 25) / 100), lean: { x: 0, z: 0.6 } });
  }
  // far bank + hillside dots (cheap)
  for (let x = -260; x <= 260; x += 16) add(x + ((hashString(`fb${x}`) % 60) / 10), -99.5, 'row', { scale: 0.8 });
  for (let i = 0; i < 40; i++) {
    const hx = -300 + (hashString(`hx${i}`) % 600);
    // between the far-town lanes (sky.js: lanes at farLeveeTopNorth - 40 - k*22 with houses at ±6 m)
    const lane = hashString(`hz${i}`) % 10;
    const hz = TERRAIN.farLeveeTopNorth - 40 - lane * 22 - 11 - ((hashString(`hzj${i}`) % 30) / 10 - 1.5);
    add(hx, hz, 'small', { scale: 1.2 + (hashString(`hs${i}`) % 10) / 10, far: true });
  }
  return T;
}
export const TREES = buildTrees();

// ---------------------------------------------------------------------------
// utility poles (電柱) and wire runs
// ---------------------------------------------------------------------------
/**
 * Pole lines: an ordered list of poles; wires run pole to pole along the line.
 * Each pole: {x, z, y, rotY, transformer?, streetLight?, id}.  After rotation by rotY the pole's
 * local +X axis points ACROSS the road (the cross-arm direction, perpendicular to the wire run).
 * Poles stand just inside the road edge strip (in the pedestrian shoulder).
 */
function buildPoles() {
  const lines = [];
  // main street: alternate sides every ~23 m
  for (const side of [-1, 1]) {
    const line = [];
    let s = MAIN_STREET.atZ(side < 0 ? 14 : 25).s;
    let k = 0;
    while (s < MAIN_STREET.length - 10) {
      const p = MAIN_STREET.offsetAtS(s, side * 3.85);
      const f = p.frame;
      line.push({
        id: `PM${side < 0 ? 'W' : 'E'}${k}`,
        x: p.x, z: p.z, y: p.y,
        rotY: Math.atan2(-f.nz, f.nx), // local +X (cross arm) spans across the street
        transformer: k % 3 === 1,
        streetLight: k % 2 === 0,
        side,
      });
      s += 22 + (hashString(`pole${side}${k}`) % 5);
      k++;
    }
    lines.push({ id: `main-${side < 0 ? 'W' : 'E'}`, poles: line });
  }
  // station-front road, south edge
  {
    const sf = ROADS.stationFront;
    const line = [];
    let k = 0;
    for (let x = sf.from + 8; x < sf.to - 5; x += 24) {
      if (Math.abs(x) < 7) continue; // keep the junction clear
      line.push({ id: `PSF${k}`, x, z: sf.z + 3.95, y: groundY(x, sf.z + 3.95), rotY: Math.PI / 2, transformer: k % 3 === 0, streetLight: k % 2 === 1, side: 1 });
      k++;
    }
    lines.push({ id: 'stationFront-S', poles: line });
  }
  // crossing road, east edge
  {
    const cr = ROADS.crossingRoad;
    const line = [];
    for (const z of [4.5, -12, -45.5]) line.push({ id: `PCR${line.length}`, x: cr.x + 2.55, z, y: groundY(cr.x + 2.55, z), rotY: 0, transformer: false, streetLight: true, side: 1 });
    lines.push({ id: 'crossing-E', poles: line });
  }
  // north road, north edge
  {
    const nr = ROADS.northRoad;
    const line = [];
    let k = 0;
    for (let x = nr.from + 10; x < nr.to - 4; x += 25) {
      if (Math.abs(x - ROADS.crossingRoad.x) < 5) continue;
      line.push({ id: `PNR${k}`, x, z: nr.z - 2.35, y: 0, rotY: Math.PI / 2, transformer: k % 3 === 2, streetLight: k % 2 === 0, side: -1 });
      k++;
    }
    lines.push({ id: 'north-N', poles: line });
  }
  return lines;
}
export const POLE_LINES = buildPoles();

// ---------------------------------------------------------------------------
// reserved street-furniture spots (props.js owns these; others keep clear)
// ---------------------------------------------------------------------------
function streetSpot(z, side, off = 3.55, extra = {}) {
  const f = MAIN_STREET.atZ(z);
  const x = f.x + f.nx * side * off;
  const zz = f.z + f.nz * side * off;
  const rotY = Math.atan2(-f.nx * side, -f.nz * side); // facing the street centre
  return { x, z: zz, y: groundY(x, zz), rotY, ...extra };
}

export const SPOTS = {
  // vending machines (自販機): the object's local +Z (front) faces rotY
  vending: [
    { id: 'V1', x: 8.2, z: -15.35, y: 0, rotY: 0, where: 'station entrance east', color: 'white' },
    { id: 'V2', x: -24.0, z: -24.55, y: PLATFORM.top, rotY: Math.PI, where: 'platform 1, faces track A', color: 'blue' },
    { id: 'V5', x: -34.0, z: -39.0, y: PLATFORM.top, rotY: 0, where: 'platform 2, faces track B', color: 'green' },
    // konbini pair and quiet corner are computed below
  ],
  // parked vehicles (props.js)
  vehicles: [],
  // bicycles leaning at walls/shoulders (props.js). Each {x,z,y,rotY}
  bicycles: [],
  // convex traffic mirrors at junctions (poles.js)
  mirrors: [
    { x: 4.4, z: 11.2, y: groundY(4.4, 11.2), rotY: -2.3 },
    { x: -4.6, z: 11.0, y: groundY(-4.6, 11.0), rotY: 2.3 },
    { x: 35.4, z: 3.6, y: 0, rotY: -2.6 },
    { x: 29.0, z: -44.0, y: 0, rotY: 0.8 },
  ],
  // traffic signs (poles.js).  type: speed30 | noParking | schoolRoute | direction | stop | oneWay | pedestrianPriority | railwayCrossingAhead
  signs: [
    { ...streetSpot(20, 1, 3.8), type: 'direction', text: ['桜ヶ丘駅', '春日野 2km', '花見台 1.5km'] },
    { ...streetSpot(40, -1, 3.8), type: 'speed30' },
    { ...streetSpot(52, 1, 3.8), type: 'noParking' },
    { ...streetSpot(88, -1, 3.8), type: 'schoolRoute' },
    { ...streetSpot(104, 1, 3.8), type: 'pedestrianPriority' },
    { x: -4.2, z: 12.3, y: groundY(-4.2, 12.3), rotY: Math.PI, type: 'stop' },
    { x: 35.2, z: -19.5, y: 0, rotY: 0, type: 'railwayCrossingAhead' },
    { x: 29.0, z: -46.0, y: 0, rotY: Math.PI, type: 'railwayCrossingAhead' },
  ],
  // small shrines / jizo / quirky objects (props.js)
  shrine: { x: -46.5, z: -18.5, y: 0, rotY: 0, note: 'small hokora with fox statues + ema rack, beside the railway fence west of the plaza' },
  jizo: { ...streetSpot(76, -1, 4.2), note: 'roadside jizo statue with red bib, tucked against a wall' },
  gachapon: { x: 3.8, z: 21.0, note: 'beside konbini entrance (computed below)' },
  // pedestrians, cats, birds (people.js).  Plain hints; people.js may place more.
  people: {
    crossingGirlWithBike: { x: 35.8, z: -22.2, rotY: Math.PI },
    stationStaff: { x: -1.0, z: -17.6, rotY: 0 },
    cafeClerk: null, // near the café blackboard (computed below)
    vendingBoy: { x: 8.2, z: -14.1, rotY: Math.PI },
    readerOnPlatformBench: { x: -12, z: -24.8, rotY: Math.PI },
    oldLadyWithBags: { ...streetSpot(30, 1, 3.2) },
    windGirlUnderTree: { x: PLAZA.grandTree.x + 3.3, z: PLAZA.grandTree.z + 2.8, rotY: 0.6 },
  },
};

// konbini-related spots
{
  const k = LOTS.find((l) => l.type === 'konbini');
  const a = k.toWorld(-k.width / 2 + 1.0, k.depth / 2 + 0.75);
  const b = k.toWorld(-k.width / 2 + 2.05, k.depth / 2 + 0.75);
  SPOTS.vending.push({ id: 'V3', x: a.x, z: a.z, y: groundY(a.x, a.z), rotY: k.rotY, where: 'konbini apron', color: 'red' });
  SPOTS.vending.push({ id: 'V4', x: b.x, z: b.z, y: groundY(b.x, b.z), rotY: k.rotY, where: 'konbini apron', color: 'white' });
  const g = k.toWorld(k.width / 2 - 0.8, k.depth / 2 + 0.7);
  SPOTS.gachapon = { x: g.x, z: g.z, y: groundY(g.x, g.z), rotY: k.rotY };
  const cafe = LOTS.find((l) => l.type === 'cafe');
  const c = cafe.toWorld(cafe.width * 0.25, cafe.depth / 2 + 1.2);
  SPOTS.people.cafeClerk = { x: c.x, z: c.z, y: groundY(c.x, c.z), rotY: cafe.rotY };
  const ht = TREES.find((t) => t.hero);
  const q = streetSpot(ht.z + 1.2, -1, 5.05);
  SPOTS.vending.push({ id: 'V6', ...q, where: 'quiet corner under the foreground sakura (hero shot foreground)', color: 'lightgreen' });
}
// vehicles
{
  const add = (z, side, kind, off = 3.35) => {
    const f = MAIN_STREET.atZ(z);
    const x = f.x + f.nx * side * off, zz = f.z + f.nz * side * off;
    SPOTS.vehicles.push({ x, z: zz, y: groundY(x, zz), rotY: Math.atan2(f.tx, f.tz) + (side > 0 ? 0 : Math.PI), kind }); // keep-left traffic
  };
  add(48, 1, 'kei-van-white', 2.2);
  add(100, -1, 'kei-car', 2.2);
  // keep-left: the taxi waits at the north kerb facing east; the kei car waits southbound behind the north stop line
  SPOTS.vehicles.push({ x: 20.0, z: 5.9, y: 0, rotY: Math.PI / 2, kind: 'retro-taxi' });
  SPOTS.vehicles.push({ x: 33.35, z: -44.05, y: 0, rotY: 0, kind: 'kei-car-waiting-at-crossing', note: 'crossing road, southbound half, behind the north stop line' });
}
// bicycles leaning along the street
{
  // parked along the pedestrian shoulder (between the white edge line and the gutter), clear of poles
  const poles = POLE_LINES.flatMap((l) => l.poles);
  for (const [z0, side] of [[19, -1], [30.5, -1], [33, 1], [47, -1], [53.5, -1], [70, 1], [85, -1]]) {
    let z = z0;
    for (let k = 0; k < 8; k++) {
      const p = streetSpot(z, side, 3.55);
      if (!poles.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1.4)) break;
      z += 1.0;
    }
    const f = MAIN_STREET.atZ(z);
    SPOTS.bicycles.push(streetSpot(z, side, 3.55, { rotY: Math.atan2(f.tx, f.tz) + (side < 0 ? 0.12 : -0.12) }));
  }
}

// ---------------------------------------------------------------------------
// cameras
// ---------------------------------------------------------------------------
const heroTree = TREES.find((t) => t.hero);
const streetZ = heroTree.z + 9.5;
const streetX = MAIN_STREET.centerX(streetZ) + 0.9;
const heroZ = 24;
const heroX = MAIN_STREET.centerX(heroZ) + 0.35;
export const CAMERAS = {
  // key frame: café awning in the foreground, 止まれ + zebra leading to the station, grand sakura left, crossing right
  hero: { pos: [heroX, groundY(heroX, heroZ) + 1.5, heroZ], look: [-2.6, 3.5, -22], fov: 44, label: '站前 · 望向车站' },
  street: { pos: [streetX, groundY(streetX, streetZ) + 1.45, streetZ], look: [-4.5, 4.0, -24], fov: 45, label: '商店街' },
  plaza: { pos: [-3.5, 1.5, 1.5], look: [-8, 3.2, -20], fov: 55, label: '站前广场' },
  crossing: { pos: [33.6, 1.55, -15.5], look: [30.5, 2.4, -33], fov: 50, label: '道口' },
  platform: { pos: [15.5, PLATFORM.top + 1.5, -25.2], look: [-30, PLATFORM.top + 1.3, -30.5], fov: 55, label: '站台' },
  levee: { pos: [-40, TERRAIN.leveeHeight + 1.6, -70], look: [20, 3, -40], fov: 50, label: '河堤' },
  aerial: { pos: [70, 38, 70], look: [-4, 0, -18], fov: 45, label: '俯瞰' },
};

/**
 * Paved-surface lifts above groundY used by terrain.js (roads, plaza tiles,
 * aprons, konbini forecourt).  Anything standing on a paved surface should use
 * surfaceY() so it neither floats nor sinks.
 */
export const SURFACE_LIFT = { road: 0.03, plaza: 0.07, apron: 0.07, konbiniForecourt: 0.11 };

function onRoad(x, z) {
  const sf = ROADS.stationFront, cr = ROADS.crossingRoad, nr = ROADS.northRoad;
  if (Math.abs(z - sf.z) <= sf.halfWidth + 1 && x >= sf.from && x <= sf.to) return true;
  if (Math.abs(x - cr.x) <= cr.halfWidth && z >= cr.from && z <= cr.to) return true;
  if (Math.abs(z - nr.z) <= nr.halfWidth && x >= nr.from && x <= nr.to) return true;
  if (z >= MAIN_STREET.zStart && z <= MAIN_STREET.zEnd && Math.abs(x - MAIN_STREET.centerX(z)) <= MAIN_STREET.shoulder) return true;
  for (const l of ROADS.lanes) if (Math.abs(z - l.z) <= l.halfWidth && x >= l.from && x <= l.to) return true;
  return false;
}

/** Top of the visible ground/paving at (x, z) (approximate: plaza, aprons, roads, forecourt). */
export function surfaceY(x, z) {
  const g = groundY(x, z);
  const P = PLAZA;
  if ((x >= P.xMin && x <= P.xMax && z >= P.zMin && z <= P.zMax) || (x >= P.east.xMin && x <= P.east.xMax && z >= P.east.zMin && z <= P.east.zMax)) return g + SURFACE_LIFT.plaza;
  if (onRoad(x, z)) return g + SURFACE_LIFT.road;
  if (z >= MAIN_STREET.zStart && z <= MAIN_STREET.zEnd) {
    const d = Math.abs(x - MAIN_STREET.centerX(z));
    if (d > MAIN_STREET.gutter[1] && d < MAIN_STREET.lotFront + 3.2) {
      const k = LOTS.find((l) => l.type === 'konbini');
      if (k) {
        const lx = (x - k.x) * Math.cos(k.rotY) - (z - k.z) * Math.sin(k.rotY);
        const lz = (x - k.x) * Math.sin(k.rotY) + (z - k.z) * Math.cos(k.rotY);
        if (Math.abs(lx) <= k.width / 2 && lz >= k.depth / 2 && lz <= k.depth / 2 + k.setback + 0.2) return g + SURFACE_LIFT.konbiniForecourt;
      }
      return g + SURFACE_LIFT.apron;
    }
  }
  return g;
}

/** Platform surface height along x (flat top, west ramp to the in-station crossing landing, east ramp to the ground). */
export function platformY(x) {
  const P = PLATFORM;
  const xRampW = P.xMin + 1.0, xLandE = P.xMin - 2.6, xLandW = P.xMin - 4.4;
  if (x >= xRampW && x <= P.xMax) return P.top;
  if (x > P.xMax) return Math.max(0, P.top * (1 - (x - P.xMax) / P.rampLength));
  if (x >= xLandE) return RAIL.railTop + (P.top - RAIL.railTop) * (x - xLandE) / (xRampW - xLandE);
  if (x >= xLandW) return RAIL.railTop;
  return 0;
}

/** Station interior stairs / accessible ramp from the concourse (0.15) up to platform 1 (1.55). */
function stationFloorY(x, z) {
  const B = STATION.building, T = PLATFORM.top, f = B.floorY;
  // stairs: x -5.8..-2.4, z -21.3 (bottom) .. -24.0 (top)
  if (x >= -5.8 && x <= -2.4 && z <= -21.3) return f + (T - f) * clamp((-21.3 - z) / 2.7, 0, 1);
  // ramp lower leg: z -20.0..-21.2, x -6.3 -> -12.35 rising 0.15 -> 0.85
  if (z <= -20.0 && z >= -21.2 && x <= -6.3 && x >= -12.35) return f + (0.85 - f) * clamp((-6.3 - x) / 6.05, 0, 1);
  // west landing
  if (x < -12.35 && x >= -13.75 && z <= -20.0 && z >= -23.75) return 0.85;
  // ramp upper leg: z -22.45..-23.75, x -12.35 -> -7.55 rising 0.85 -> 1.55
  if (z <= -22.45 && z >= -23.75 && x >= -12.35 && x <= -7.55) return 0.85 + (T - 0.85) * clamp((x + 12.35) / 4.8, 0, 1);
  // top landing
  if (z <= -22.45 && x > -7.55 && x < -5.8) return T;
  return f;
}

/** River band the walker may not enter (between the waterlines) except on the bridge. */
export const RIVER_BLOCK = { zSouth: -76.2, zNorth: -94.4 };

export function onBridge(x, z) {
  return Math.abs(x - BRIDGE.x) <= BRIDGE.halfWidth && z <= BRIDGE.zSouth && z >= BRIDGE.zNorth;
}

/** Where the walking camera should stand (eye height added by the controls). */
export function walkFloorY(x, z) {
  const P = PLATFORM;
  const onP1 = z < P.P1.zBack && z > P.P1.zTrack;
  const onP2 = z < P.P2.zTrack && z > P.P2.zBack;
  if ((onP1 || onP2) && x > P.xMin - 4.4 && x < P.xMax + P.rampLength) return platformY(x);
  const B = STATION.building;
  if (x > B.xMin && x < B.xMax && z > B.zMin && z < B.zMax) return stationFloorY(x, z);
  if (onBridge(x, z)) {
    // ramps up from the levee tops to the deck
    const t = Math.min(1, (BRIDGE.zSouth - z) / 3, (z - BRIDGE.zNorth) / 3);
    return lerp(TERRAIN.leveeHeight, BRIDGE.deckY, clamp(t, 0, 1));
  }
  // level crossing deck and the in-station crossing sit at rail-top height
  const C = CROSSING;
  if (Math.abs(x - C.x) <= C.roadHalfWidth + 0.5 && z <= C.deckZ[0] + 1.5 && z >= C.deckZ[1] - 1.5) {
    const edge = Math.min(C.deckZ[0] - z, z - C.deckZ[1]);
    return edge >= 0 ? RAIL.railTop : lerp(RAIL.railTop, SURFACE_LIFT.road, clamp(-edge / 1.5, 0, 1));
  }
  if (x >= P.xMin - 4.4 && x <= P.xMin - 2.6 && z < P.P1.zBack && z > P.P2.zBack) return RAIL.railTop;
  // ballast beds
  if (z < RAIL.corridor.zMax && z > RAIL.corridor.zMin) {
    for (const t of RAIL.tracks) if (Math.abs(z - t.z) < RAIL.ballastTopWidth / 2) return RAIL.ballastTop + 0.04;
  }
  return surfaceY(x, z);
}

/** World bounds the walking camera is clamped to. */
export const WALK_BOUNDS = { xMin: -140, xMax: 150, zMin: -104, zMax: 175 };

export default {
  TERRAIN, RAIL, PLATFORM, STATION, MAIN_STREET, ROADS, ROAD_MARKINGS, CROSSING, TRAIN, PLAZA,
  LOTS, TREES, POLE_LINES, SPOTS, CAMERAS, WALK_BOUNDS, SHOP_TYPES, BRIDGE, RIVER_BLOCK, onBridge,
  groundY, surfaceY, platformY, SURFACE_LIFT, isRiver, walkFloorY, lotById, lotsOfType, makeRng, hashString, clamp, lerp, smoothstep,
};
