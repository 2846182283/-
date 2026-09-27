/**
 * Sakura canopy: layered, sheet-like blossom clumps + alpha blossom cards.
 *
 * Clumps are flattened, lumpy mounds (one shared shape at hi / lo / far detail,
 * see lod.js) drawn as InstancedMeshes; trees.js groups them into overlapping
 * "sheets" of 3-5 masses.  Their
 * look comes from three stacked tricks:
 *   1. per-clump value bands in the fragment shader (lilac underside -> soft
 *      pink -> pale -> near-white top), edges jittered by value noise so the
 *      bands read as painted strokes, then multiplied by a floral carpet map;
 *   2. "canopy normals": vertex normals are blended toward the direction out of
 *      the whole crown, so the tree is lit as ONE mass (bright sun side, lilac
 *      back) and the outline pass only draws the silhouette and the big layers;
 *   3. a soft back-light translucency term (pink-white glow on edges facing
 *      away from the sun) on top of the toon rim light.
 * Cards are camera-facing (per-instance rolled) alpha-tested flower sprigs from a
 * 2x2 atlas; they cover the masses so near trees show individual blossoms and
 * fluffy silhouettes, and they share the crown normal so they shade with it.
 * Wind sway is applied in world space (amplitude = per-instance weight that
 * grows with height) through toon's vertexPatch, which postfx re-applies in its
 * normal pass, and a matching depth material keeps shadows aligned.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../core/palette.js';

// ---------------------------------------------------------------------------
// clump geometry
// ---------------------------------------------------------------------------
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
/** Smooth-ish 3D value noise for lump displacement (deterministic). */
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  let r = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const h = hash3(xi + dx, yi + dy, zi + dz);
    r += h * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return r;
}

/**
 * One lumpy mound: icosphere, slightly flattened underneath, displaced by
 * noise so the silhouette is scalloped rather than spherical.  UVs are a
 * per-mound spherical projection (u wraps `U` whole texture tiles).
 * `scallop` adds a finer, outward-only ripple (near LOD): the low-frequency
 * shape is identical at every detail level, so a finer mound encloses the
 * coarse one that casts its shadow.
 */
function lump(detail, seed, sx, sy, sz, ox, oy, oz, scallop = 0) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const U = Math.max(2, Math.round(5 * sx)), V = U * 0.5;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    uv[i * 2] = (Math.atan2(z, x) / (2 * Math.PI) + 0.5) * U;
    uv[i * 2 + 1] = (Math.asin(THREE.MathUtils.clamp(y, -1, 1)) / Math.PI + 0.5) * V;
    const n = vnoise(x * 1.9 + seed, y * 1.9 + seed * 0.3, z * 1.9 - seed) - 0.5;
    let bump = 1 + n * 0.34;
    if (scallop) {
      // blossom-cluster scallops: sharp ridges between soft cushions
      const r2 = vnoise(x * 5.2 - seed, y * 5.2 + seed, z * 5.2 + seed * 0.7);
      bump += scallop * Math.pow(r2, 1.6);
    }
    x *= bump; z *= bump; y *= bump;
    y = y < 0 ? y * 0.62 : y * 0.86; // softer underside, domed top
    p.setXYZ(i, x * sx + ox, y * sy + oy, z * sz + oz);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  g.userData.U = U;
  return g;
}

/**
 * The clump shape at three detail levels (same silhouette family):
 *   hi   near trees (<~15 m): detail-2 main mound with scalloped rim + detail-1 side mound (400 tris)
 *   lo   the default (and the shadow caster of near trees): detail-1 + detail-0 (100 tris)
 *   far  distant cells: detail-0 + detail-0 (40 tris)
 * Local size ~ [-1, 1] horizontally, y ~ [-0.5, 0.8].
 */
export function clumpGeometry(variant, lod) {
  const rnd = mulberry(variant * 97 + 1);
  const main = lod === 'hi' ? 2 : lod === 'lo' ? 1 : 0;
  const parts = [lump(main, variant * 3.1, 0.8, 0.74, 0.8, 0, 0.05, 0, lod === 'hi' ? 0.16 : 0)];
  const a = rnd() * Math.PI * 2;
  const d = 0.5 + rnd() * 0.12;
  const s = 0.52 + rnd() * 0.12;
  parts.push(lump(lod === 'hi' ? 1 : 0, variant * 3.1 + 1, s, s * 0.9, s, Math.cos(a) * d, -0.08 + rnd() * 0.16, Math.sin(a) * d, lod === 'hi' ? 0.12 : 0));
  const g = fixSeams(mergeParts(parts), parts);
  g.computeBoundingSphere();
  return g;
}

/** De-index and shift wrapped u values so triangles never smear across the texture. */
function fixSeams(g, parts) {
  const ng = g.toNonIndexed();
  const uv = ng.attributes.uv;
  // each part's wrap width; vertices were appended part by part (3 per triangle after de-indexing)
  let tri = 0;
  for (const p of parts) {
    const U = p.userData.U;
    const nTri = p.index.count / 3;
    for (let t = 0; t < nTri; t++, tri++) {
      const i0 = tri * 3;
      const us = [uv.getX(i0), uv.getX(i0 + 1), uv.getX(i0 + 2)];
      if (Math.max(...us) - Math.min(...us) > U * 0.5) {
        for (let k = 0; k < 3; k++) if (us[k] < U * 0.5) uv.setX(i0 + k, us[k] + U);
      }
    }
  }
  return ng;
}

function mergeParts(parts) {
  let n = 0, m = 0;
  for (const p of parts) { n += p.attributes.position.count; m += p.index.count; }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uvs = new Float32Array(n * 2), idx = new Uint16Array(m);
  let vo = 0, io = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, vo * 3);
    nrm.set(p.attributes.normal.array, vo * 3);
    uvs.set(p.attributes.uv.array, vo * 2);
    const src = p.index.array;
    for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
    vo += p.attributes.position.count;
    io += src.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/** A blossom card: a unit quad centred on its origin, facing +Z. */
export function cardGeometry() {
  return new THREE.PlaneGeometry(1, 1, 1, 1);
}

export function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// shader patches
// ---------------------------------------------------------------------------
const SWAY_PARS = /* glsl */ `
attribute vec4 aCanopy;   // xyz: direction out of the crown (world), w: sway weight
uniform float sakNBlend;
varying float vSakH;
`;
// base clumps: per-instance tree id + a per-tree "drawn by the near LOD" mask (see lod.js)
export const MASK_TREES = 256;
const MASK_PARS = /* glsl */ `
attribute float aTree;
uniform vec4 sakHiMask[ ${MASK_TREES / 4} ];
`;
// collapse the whole instance to a point: zero-area triangles, no fragments
const MASK_MAIN = /* glsl */ `
{
  int sakTi = int( aTree + 0.5 );
  if ( sakHiMask[ sakTi >> 2 ][ sakTi & 3 ] > 0.5 ) transformed = vec3( 0.0 );
}
`;

/** World-space sway + canopy-normal blend (shared by clumps, cards, depth + normal passes). */
function swayMain(heightExpr) {
  return /* glsl */ `
{
  #ifdef USE_INSTANCING
    mat4 sakIM = instanceMatrix;
  #else
    mat4 sakIM = mat4( 1.0 );
  #endif
  vec3 sakWP = ( modelMatrix * sakIM * vec4( transformed, 1.0 ) ).xyz;
  vSakH = ${heightExpr};
  #ifndef SAK_NO_NORMAL
    vec3 sakOut = normalize( ( viewMatrix * vec4( normalize( aCanopy.xyz ), 0.0 ) ).xyz );
    vNormal = normalize( mix( normalize( vNormal ), sakOut, sakNBlend ) );
  #endif
  float sakPh = dot( sakWP.xz, vec2( 0.23, 0.19 ) ) + sakWP.y * 0.31;
  float sakG = toonWind.y;
  vec3 sakD = vec3( toonWind.x, 0.0, toonWind.z ) * ( 0.05 + 0.1 * sakG ) * ( 0.55 + 0.45 * sin( toonTime * 1.1 + sakPh ) );
  sakD += vec3( sin( toonTime * 2.3 + sakPh * 1.7 ), 0.45 * sin( toonTime * 1.9 + sakPh ), cos( toonTime * 2.1 + sakPh * 1.3 ) ) * ( 0.016 + 0.03 * sakG );
  sakD *= aCanopy.w;
  transformed += inverse( mat3( modelMatrix ) * mat3( sakIM ) ) * sakD;
}
`;
}

const GLOW_PARS = /* glsl */ `
uniform vec3 sakSunDir;
uniform vec3 sakGlow;
uniform float sakGlowAmt;
uniform float sakLift;
`;
const GLOW_MAIN = /* glsl */ `
{
  // back-light translucency: edges of blossom masses glow when the sun is behind them
  vec3 sL = normalize( ( viewMatrix * vec4( sakSunDir, 0.0 ) ).xyz );
  vec3 sV = normalize( vViewPosition );
  float back = pow( saturate( dot( -sV, sL ) ), 2.5 );
  float edge = pow( 1.0 - saturate( abs( dot( normal, sV ) ) ), 2.0 );
  outgoingLight += sakGlow * diffuseColor.rgb * back * ( 0.12 + edge ) * sakGlowAmt;
  // blossoms are thin & translucent: lift the shaded side toward a pale lilac-pink
  float sakDirect = dot( reflectedLight.directDiffuse, vec3( 0.3333 ) );
  outgoingLight += diffuseColor.rgb * sakLift * ( 1.0 - smoothstep( 0.05, 0.45, sakDirect ) );
}
#include <opaque_fragment>
`;

const BAND_PARS = /* glsl */ `
uniform vec3 sakBand0;
uniform vec3 sakBand1;
uniform vec3 sakBand2;
uniform vec3 sakBand3;
uniform vec3 sakLeaf;
varying float vSakH;
float sakHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float sakNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( sakHash( i ), sakHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( sakHash( i + vec2( 0.0, 1.0 ) ), sakHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
`;
const BAND_MAIN = /* glsl */ `
#include <color_fragment>
{
  // 4 painted value steps inside each clump; noise wobbles the band borders
  float h = vSakH + ( sakNoise( vMapUv * 2.2 ) - 0.5 ) * 0.34 + ( sakNoise( vMapUv * 7.0 ) - 0.5 ) * 0.1;
  vec3 bc = h < 0.28 ? sakBand0 : ( h < 0.52 ? sakBand1 : ( h < 0.78 ? sakBand2 : sakBand3 ) );
  diffuseColor.rgb *= bc;
  // sparse yellow-green young-leaf flecks between the blossoms
  float lf = sakNoise( vMapUv * 19.0 + 3.7 ) * sakNoise( vMapUv * 7.3 - 1.3 );
  diffuseColor.rgb = mix( diffuseColor.rgb, sakLeaf, smoothstep( 0.5, 0.56, lf ) * step( 0.25, h ) * 0.85 );
}
`;

/**
 * Create the shared canopy materials.
 * returns { clump, card, clumpDepth, uniforms }
 */
export function canopyMaterials(ctx, { floralMap, atlas }) {
  const { toon } = ctx;
  const uniforms = {
    sakNBlend: { value: 0.68 },
    sakSunDir: { value: ctx.sunDir },
    sakGlow: { value: new THREE.Color('#fff0f4') },
    sakGlowAmt: { value: 0.55 },
    sakLift: { value: 0.28 },
    sakBand0: { value: new THREE.Color('#efc6d8') }, // lilac-pink underside
    sakBand1: { value: new THREE.Color('#fad7e3') }, // soft sakura pink
    sakBand2: { value: new THREE.Color('#ffeaf1') }, // pale
    sakBand3: { value: new THREE.Color(PALETTE.sakuraWhite) }, // near-white lit top
    sakLeaf: { value: new THREE.Color('#c2d68a') }, // young leaves (low-saturation yellow-green)
    sakCardNBlend: { value: 0.92 },
    sakHiMask: { value: Array.from({ length: MASK_TREES / 4 }, () => new THREE.Vector4()) },
  };
  // clump-local height (0 bottom .. 1 top) nudged by the normal -> band selector
  const clumpMain = swayMain('clamp( position.y * 0.72 + 0.4 + normal.y * 0.2, 0.0, 1.0 )');
  const clumpFrag = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLOW_PARS}\n${BAND_PARS}`)
      .replace('#include <color_fragment>', BAND_MAIN)
      .replace('#include <opaque_fragment>', GLOW_MAIN);
  };
  // base clumps (per-cell meshes): hidden where the near LOD mesh draws the same tree
  const clumpPatch = { key: 'sakura-clump', uniforms, pars: SWAY_PARS + MASK_PARS, main: clumpMain + MASK_MAIN };
  const clump = toon.mat('#ffffff', {
    map: floralMap, rim: 0.35, vertexPatch: clumpPatch, onShaderKey: 'sakura-clump-frag', onShader: clumpFrag, name: 'sakura_clump',
  });
  // near LOD clumps (one dynamic mesh): same look, no mask
  const clumpHiPatch = { key: 'sakura-clump-hi', uniforms, pars: SWAY_PARS, main: clumpMain };
  const clumpHi = toon.mat('#ffffff', {
    map: floralMap, rim: 0.35, vertexPatch: clumpHiPatch, onShaderKey: 'sakura-clump-frag', onShader: clumpFrag, name: 'sakura_clump_hi',
  });

  // cards: alpha-tested sprigs; the per-instance aCell attribute picks the atlas cell
  const cardPatch = {
    key: 'sakura-card',
    uniforms: { ...uniforms, sakNBlend: uniforms.sakCardNBlend },
    pars: SWAY_PARS + 'attribute float aCell;\n',
    // camera-facing (rolled) sprigs: flowers always show their face, edges stay fluffy
    main: /* glsl */ `
      #ifdef USE_INSTANCING
      {
        vec3 bbC = ( modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
        float bbS = length( instanceMatrix[ 0 ].xyz );
        vec3 camR = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
        vec3 camU = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
        float rl = fract( sin( dot( bbC.xz, vec2( 12.9898, 78.233 ) ) + bbC.y ) * 43758.5453 ) * 6.2832;
        vec2 q = vec2( cos( rl ) * position.x - sin( rl ) * position.y, sin( rl ) * position.x + cos( rl ) * position.y );
        transformed = inverse( mat3( modelMatrix ) * mat3( instanceMatrix ) ) * ( ( camR * q.x + camU * q.y ) * bbS );
      }
      #endif
    ` + swayMain('0.5') + /* glsl */ `
      #ifdef USE_MAP
        vMapUv = vMapUv * 0.5 + vec2( mod( aCell, 2.0 ), floor( aCell * 0.5 ) ) * 0.5;
      #endif
      #ifdef USE_ALPHAMAP
        vAlphaMapUv = vAlphaMapUv * 0.5 + vec2( mod( aCell, 2.0 ), floor( aCell * 0.5 ) ) * 0.5;
      #endif
    `,
  };
  const card = toon.mat('#ffffff', {
    map: atlas.map,
    alphaMap: atlas.alpha,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    rim: 0.25,
    vertexPatch: cardPatch,
    onShaderKey: 'sakura-card-frag',
    onShader: (shader) => {
      const { sakSunDir, sakGlow, sakGlowAmt, sakLift } = uniforms;
      Object.assign(shader.uniforms, { sakSunDir, sakGlow, sakGlowAmt, sakLift });
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${GLOW_PARS}`)
        // never flip: cards are lit with the crown normal from both sides
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize( vNormal );')
        // keep alpha-tested sprigs from dissolving in distant mip levels
        .replace('#include <alphatest_fragment>', `
          #ifdef USE_ALPHAMAP
          {
            vec2 sakT = vAlphaMapUv * 1024.0;
            float sakMip = max( 0.0, 0.5 * log2( max( dot( dFdx( sakT ), dFdx( sakT ) ), dot( dFdy( sakT ), dFdy( sakT ) ) ) ) );
            diffuseColor.a *= 1.0 + sakMip * 0.28;
          }
          #endif
          #include <alphatest_fragment>`)
        .replace('#include <opaque_fragment>', GLOW_MAIN);
    },
    name: 'sakura_card',
  });

  // shadow depth material with the same sway (keeps self-shadowing aligned while swaying)
  const clumpDepth = new THREE.MeshDepthMaterial();
  clumpDepth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { toonTime: ctx.toon.TOON_UNIFORMS.toonTime, toonWind: ctx.toon.TOON_UNIFORMS.toonWind });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#define SAK_NO_NORMAL\n#include <common>\nuniform float toonTime;\nuniform vec3 toonWind;\n${SWAY_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${clumpMain}`);
  };
  // (no mask here: the coarse base clumps of near trees keep casting their shadows)
  clumpDepth.customProgramCacheKey = () => 'sakura-clump-depth';
  return { clump, clumpHi, card, clumpDepth, uniforms };
}

// ---------------------------------------------------------------------------
// instancing
// ---------------------------------------------------------------------------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _q2 = new THREE.Quaternion();

/**
 * Pack a list of items into flat per-instance arrays:
 *   { p: Vector3, up: Vector3 (orientation of local +Y), yaw, s: Vector3|number, color: Color, out: Vector3, sway, cell?, tree? }
 * Items with `face` (cards) turn local +Z toward it instead (+ `roll`); that static
 * orientation is what their shadows use, the visible card is billboarded in the shader.
 * returns { n, mat (16/inst), col (3), can (4: crown-out dir + sway), cell (1), tree (1) }
 */
export function packItems(items) {
  const n = items.length;
  const pk = {
    n,
    mat: new Float32Array(n * 16), col: new Float32Array(n * 3), can: new Float32Array(n * 4),
    cell: new Float32Array(n), tree: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const it = items[i];
    if (it.face) {
      // card: +Z toward it.face, +Y roughly up
      _m.lookAt(_p.set(0, 0, 0), _dir.copy(it.face).negate(), _up);
      _q.setFromRotationMatrix(_m);
      _q2.setFromAxisAngle(_dir.set(0, 0, 1), it.roll || 0);
      _q.multiply(_q2);
    } else {
      _q.setFromUnitVectors(_up, it.up || _up);
      _q2.setFromAxisAngle(_up, it.yaw || 0);
      _q.multiply(_q2);
    }
    if (typeof it.s === 'number') _s.set(it.s, it.s, it.s); else _s.copy(it.s);
    _m.compose(it.p, _q, _s);
    _m.toArray(pk.mat, i * 16);
    pk.col[i * 3] = it.color.r; pk.col[i * 3 + 1] = it.color.g; pk.col[i * 3 + 2] = it.color.b;
    pk.can[i * 4] = it.out.x; pk.can[i * 4 + 1] = it.out.y; pk.can[i * 4 + 2] = it.out.z; pk.can[i * 4 + 3] = it.sway;
    pk.cell[i] = it.cell || 0;
    pk.tree[i] = it.tree || 0;
  }
  return pk;
}

/** Concatenate packs (same layout). */
export function joinPacks(packs) {
  let n = 0;
  for (const p of packs) n += p.n;
  const out = { n, mat: new Float32Array(n * 16), col: new Float32Array(n * 3), can: new Float32Array(n * 4), cell: new Float32Array(n), tree: new Float32Array(n) };
  let o = 0;
  for (const p of packs) {
    out.mat.set(p.mat, o * 16); out.col.set(p.col, o * 3); out.can.set(p.can, o * 4);
    out.cell.set(p.cell, o); out.tree.set(p.tree, o);
    o += p.n;
  }
  return out;
}

/**
 * Per-instance attributes of a pack (capacity >= pack.n, so dynamic meshes can be refilled).
 * attrs.canopy / cell / tree are InstancedBufferAttributes to put on each LOD geometry.
 */
export function packAttributes(pk, capacity = pk.n, { cells = false, tree = false } = {}) {
  const cap = Math.max(1, capacity);
  const grow = (src, k) => { const a = new Float32Array(cap * k); a.set(src.subarray(0, Math.min(src.length, cap * k))); return a; };
  return {
    matrix: new THREE.InstancedBufferAttribute(grow(pk.mat, 16), 16),
    color: new THREE.InstancedBufferAttribute(grow(pk.col, 3), 3),
    canopy: new THREE.InstancedBufferAttribute(grow(pk.can, 4), 4),
    cell: cells ? new THREE.InstancedBufferAttribute(grow(pk.cell, 1), 1) : null,
    tree: tree ? new THREE.InstancedBufferAttribute(grow(pk.tree, 1), 1) : null,
  };
}

/** A geometry that shares `base`'s vertex data and carries the given per-instance attributes. */
export function instGeometry(base, attrs) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
  if (base.index) g.setIndex(base.index);
  g.setAttribute('aCanopy', attrs.canopy);
  if (attrs.cell) g.setAttribute('aCell', attrs.cell);
  if (attrs.tree) g.setAttribute('aTree', attrs.tree);
  g.boundingSphere = base.boundingSphere;
  return g;
}

/** InstancedMesh over shared per-instance attributes (matrix / colour live on the mesh). */
export function meshFromAttributes(geometry, material, attrs, count, opts = {}) {
  const im = new THREE.InstancedMesh(geometry, material, 1);
  im.instanceMatrix = attrs.matrix;
  im.instanceColor = attrs.color;
  im.count = count;
  im.castShadow = !!opts.castShadow;
  im.receiveShadow = true;
  if (opts.noOutline) im.userData.noOutline = true;
  if (opts.depthMaterial) im.customDepthMaterial = opts.depthMaterial;
  im.name = opts.name || 'sakura_instances';
  return im;
}
