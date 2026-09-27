/**
 * Falling sakura petals — ONE instanced draw call, fully animated on the GPU.
 *
 * Every petal is a pure function of time and its random seeds (no CPU state):
 *   slow fall + spiral descent + flutter bob + tumble about a random axis,
 *   plus a sideways drift from the integrated wind (uWindOff, updated per frame).
 * Positions are wrapped into boxes that follow the camera, in three layers:
 *   near  (26 m box)  big, crisp petals; defocused/soft when very close
 *   mid   (110 m box) the bulk, trails around crowns, streets and trains
 *   far   (360 m box) tiny sparkling pink dots (size clamped to ~1.5 px)
 * A density map baked from the tree crowns (R = density, G = crown-top height)
 * decides which petals exist where, so petals stream downwind of the trees
 * instead of filling the air uniformly.  Moving trains (sim.trains) lift and
 * swirl petals within ~6 m of the car body and in their wake.
 */
import * as THREE from 'three';

const MAX_TRAINS = 4;
const MAX_ROOFS = 3;

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uTime;
uniform vec2 uWindOff;
uniform sampler2D uDensity;
uniform vec4 uDensityRect;      // minX, minZ, 1/sizeX, 1/sizeZ
uniform vec4 uTrain[ ${MAX_TRAINS} ]; // x front, z track, dir*speed, length
uniform vec4 uRoofBox[ ${MAX_ROOFS} ];  // xMin, xMax, zMin, zMax of a roofed area
uniform vec2 uRoofYK[ ${MAX_ROOFS} ];   // x: roof height, y: fraction of petals kept underneath
uniform float uPixel;          // radians per pixel
uniform vec3 uSunDir;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
attribute vec4 aSeed;
attribute vec4 aSeed2;          // layer, size, spin, phase
varying vec2 vUv;
varying vec3 vCol;
varying float vLight;
varying float vBack;
varying float vSoft;
varying float vDot;

mat3 rotAxis( vec3 a, float ang ) {
  float s = sin( ang ), c = cos( ang ), oc = 1.0 - c;
  return mat3(
    oc * a.x * a.x + c,       oc * a.x * a.y + a.z * s, oc * a.z * a.x - a.y * s,
    oc * a.x * a.y - a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z + a.x * s,
    oc * a.z * a.x + a.y * s, oc * a.y * a.z - a.x * s, oc * a.z * a.z + c );
}

void main() {
  float layer = aSeed2.x;
  vec3 box = layer < 0.5 ? vec3( 26.0, 14.0, 26.0 ) : ( layer < 1.5 ? vec3( 90.0, 16.0, 90.0 ) : vec3( 360.0, 22.0, 360.0 ) );
  float fall = mix( 0.42, 0.95, aSeed.w );
  float drift = mix( 0.7, 1.3, fract( aSeed.w * 7.13 ) );
  float ph = aSeed2.w * 6.2832;
  float spW = mix( 0.8, 2.4, fract( aSeed.z * 9.31 ) );
  float spR = mix( 0.12, 0.6, fract( aSeed.x * 13.7 ) );

  vec3 p = aSeed.xyz * box;
  p.y -= uTime * fall;
  p.xz += uWindOff * drift;
  // spiral descent + flutter
  p.x += cos( uTime * spW + ph ) * spR;
  p.z += sin( uTime * spW + ph ) * spR;
  p.y += sin( uTime * spW * 2.0 + ph ) * 0.12;
  // wrap into a box that follows the camera (height band stays near the ground/crowns)
  vec3 org = vec3( cameraPosition.x - box.x * 0.5, clamp( cameraPosition.y - 5.0, -2.0, 3.0 ), cameraPosition.z - box.z * 0.5 );
  p = org + mod( p - org, box );

  vec2 duv = ( p.xz - uDensityRect.xy ) * uDensityRect.zw;
  vec4 dm = texture2D( uDensity, duv );
  float inside = step( 0.0, duv.x ) * step( duv.x, 1.0 ) * step( 0.0, duv.y ) * step( duv.y, 1.0 );
  float dens = dm.r * inside;
  float top = dm.g * 25.0 - 2.0;

  // train gust: lift + swirl around the car body and in its wake
  vec3 gustOff = vec3( 0.0 );
  float gust = 0.0;
  for ( int i = 0; i < ${MAX_TRAINS}; i ++ ) {
    vec4 tr = uTrain[ i ];
    float spd = abs( tr.z );
    if ( spd < 0.5 ) continue;
    float dir = sign( tr.z );
    float tail = tr.x - dir * tr.w;
    float lo = min( tr.x, tail ), hi = max( tr.x, tail );
    float wake = spd * 1.4;
    if ( dir > 0.0 ) lo -= wake; else hi += wake;
    float dx = max( max( lo - p.x, p.x - hi ), 0.0 );
    float dz = max( abs( p.z - tr.y ) - 1.4, 0.0 );
    float g = ( 1.0 - smoothstep( 0.0, 6.0, length( vec2( dx, dz ) ) ) ) * clamp( spd / 14.0, 0.0, 1.3 ) * ( 1.0 - smoothstep( 4.0, 7.0, p.y ) );
    float sd = sign( p.z - tr.y + 0.001 );
    gustOff += g * vec3( dir * ( 1.4 + 1.1 * sin( uTime * 3.0 + ph ) ), 1.1 + 0.9 * sin( uTime * 4.1 + ph * 2.0 ), sd * ( 0.5 + 0.7 * cos( uTime * 3.3 + ph ) ) );
    gust = max( gust, g );
  }
  p += gustOff;

  float keep = step( fract( aSeed2.w * 91.7 + aSeed.y * 13.1 ), max( dens, gust * 0.9 ) );
  keep *= 1.0 - smoothstep( top - 1.0, top + 0.5, p.y ) * ( 1.0 - gust );
  // roofed areas (station hall, platform canopies): petals cannot fall through the roof
  for ( int i = 0; i < ${MAX_ROOFS}; i ++ ) {
    vec4 rb = uRoofBox[ i ];
    float under = step( rb.x, p.x ) * step( p.x, rb.y ) * step( rb.z, p.z ) * step( p.z, rb.w ) * step( p.y, uRoofYK[ i ].x );
    keep *= 1.0 - under * step( uRoofYK[ i ].y, fract( aSeed.w * 53.3 + aSeed2.y * 7.1 ) );
  }
  vec3 rel = p - cameraPosition;
  float edgeF = 1.0 - smoothstep( 0.36, 0.5, max( abs( rel.x ) / box.x, abs( rel.z ) / box.z ) );
  float dist = length( rel );
  float nearF = smoothstep( 0.22, 0.55, dist );
  float size = layer < 0.5 ? mix( 0.038, 0.058, aSeed2.y ) : ( layer < 1.5 ? mix( 0.03, 0.044, aSeed2.y ) : 0.03 );
  float minSize = dist * uPixel * ( layer > 1.5 ? 1.7 : 1.15 );
  vDot = smoothstep( 0.7, 1.2, minSize / size ); // petal too small to resolve -> draw a soft dot
  size = max( size, minSize );
  float sc = size * keep * edgeF * nearF;

  // tumble about a random axis, slightly cupped
  vec3 axis = normalize( aSeed.zxy - 0.5 + vec3( 0.0, 0.01, 0.0 ) );
  float ang = uTime * mix( 1.2, 4.0, aSeed2.z ) + ph;
  mat3 R = rotAxis( axis, ang );
  vec3 lp = vec3( position.x * 0.8, position.y, position.x * position.x * 0.5 ) * sc;
  vec3 wpos = p + R * lp;
  vec3 n = R * vec3( 0.0, 0.0, 1.0 );

  vec3 L = normalize( uSunDir );
  vLight = smoothstep( 0.1, 0.3, abs( dot( n, L ) ) );
  vec3 V = normalize( cameraPosition - wpos );
  vBack = pow( max( dot( -V, L ), 0.0 ), 3.0 ) * ( 0.4 + 0.6 * ( 1.0 - abs( dot( n, V ) ) ) );
  vSoft = 1.0 - smoothstep( 0.6, 2.2, dist );
  float cr = aSeed.y;
  vCol = cr < 0.55 ? mix( uColA, uColB, cr / 0.55 ) : mix( uColB, uColC, ( cr - 0.55 ) / 0.45 );
  vUv = uv;

  vec4 mvPosition = viewMatrix * vec4( wpos, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uBase;
uniform vec3 uShadow;
uniform vec3 uGlow;
varying vec2 vUv;
varying vec3 vCol;
varying float vLight;
varying float vBack;
varying float vSoft;
varying float vDot;
void main() {
  vec2 q = vUv * 2.0 - 1.0;            // x across, y from base (-1) to tip (+1)
  float soft = mix( 0.1, 0.55, vSoft );
  // petal: ellipse narrowing to the base, notched tip
  float w = 0.64 * ( 0.45 + 0.55 * smoothstep( -1.0, 0.25, q.y ) );
  float d = length( vec2( q.x / w, ( q.y - 0.02 ) / 0.98 ) );
  float a = 1.0 - smoothstep( 1.0 - soft, 1.0, d );
  a *= smoothstep( 0.17, 0.17 + 0.06 + soft * 0.2, length( q - vec2( 0.0, 1.0 ) ) );
  // far: resolve as a soft round sparkle instead
  float dotA = 1.0 - smoothstep( 0.35, 1.0, length( q ) );
  a = mix( a, dotA, vDot );
  a *= 1.0 - vSoft * 0.35;
  if ( a < 0.02 ) discard;
  vec3 col = mix( uBase, vCol, smoothstep( -1.0, -0.25, q.y ) );
  col *= mix( uShadow, vec3( 1.0 ), vLight );
  col += uGlow * vBack * ( 0.35 + 0.65 * smoothstep( 0.55, 1.0, d ) );
  col = mix( col, vCol * 1.15 + uGlow * vBack * 0.5, vDot );
  gl_FragColor = vec4( col, a );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * Bake the density map: R = how many petals live here (crowns + downwind tails),
 * G = crown-top height (petals never spawn above the crowns).
 */
function densityTexture(infos, windDir, streetPts) {
  const W = 256, H = 192;
  const rect = { minX: -230, minZ: -140, sizeX: 460, sizeZ: 330 };
  const dens = new Float32Array(W * H);
  const top = new Float32Array(W * H);
  const wx = windDir.x, wz = windDir.y;
  const amp = { grand: 1.0, large: 1.0, medium: 0.9, row: 0.8, small: 0.25 };
  for (const inf of infos) {
    const R = inf.radius * 1.05;
    const cx = inf.crown.x + wx * R * 0.35, cz = inf.crown.z + wz * R * 0.35;
    const reach = R * 3.2;
    const i0 = Math.max(0, Math.floor(((cx - reach - rect.minX) / rect.sizeX) * W));
    const i1 = Math.min(W - 1, Math.ceil(((cx + reach - rect.minX) / rect.sizeX) * W));
    const j0 = Math.max(0, Math.floor(((cz - reach - rect.minZ) / rect.sizeZ) * H));
    const j1 = Math.min(H - 1, Math.ceil(((cz + reach - rect.minZ) / rect.sizeZ) * H));
    const a = amp[inf.tree.kind] ?? 0.6;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = rect.minX + ((i + 0.5) / W) * rect.sizeX, z = rect.minZ + ((j + 0.5) / H) * rect.sizeZ;
        const dx = x - cx, dz = z - cz;
        let u = dx * wx + dz * wz; // along wind
        const v = -dx * wz + dz * wx;
        if (u > 0) u /= 2.4; // long downwind tail
        const e = (u * u + v * v) / (R * R * 2.2);
        const val = a * Math.exp(-e);
        const k = j * W + i;
        dens[k] = Math.min(1, dens[k] + val);
        if (val > 0.05) top[k] = Math.max(top[k], inf.top + 1.5);
      }
    }
  }
  // a light baseline of drifting petals along the main street and around the plaza
  if (streetPts) {
    for (const [x, z, r, v, tp] of streetPts) {
      const i0 = Math.max(0, Math.floor(((x - r - rect.minX) / rect.sizeX) * W)), i1 = Math.min(W - 1, Math.ceil(((x + r - rect.minX) / rect.sizeX) * W));
      const j0 = Math.max(0, Math.floor(((z - r - rect.minZ) / rect.sizeZ) * H)), j1 = Math.min(H - 1, Math.ceil(((z + r - rect.minZ) / rect.sizeZ) * H));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * W + i;
        dens[k] = Math.max(dens[k], v);
        top[k] = Math.max(top[k], tp);
      }
    }
  }
  const data = new Uint8Array(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    data[k * 4] = Math.round(Math.min(1, dens[k]) * 255);
    data[k * 4 + 1] = Math.round(THREE.MathUtils.clamp((top[k] + 2) / 25, 0, 1) * 255);
    data[k * 4 + 2] = 0;
    data[k * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, rect };
}

/**
 * Roofed areas where airborne petals must not hang: the station hall (all of it except a
 * ~1 m apron inside the entrance) and the two platform canopies (a few petals still blow
 * in sideways).  Canopy extents mirror station/furniture.js CANOPIES.
 */
function roofBoxes(layout) {
  const B = layout.STATION.building;
  const top = layout.PLATFORM.top;
  return [
    { box: [B.xMin - 0.4, B.xMax + 0.4, B.zMin - 0.4, B.zMax - 1.0], y: B.ridgeY + 0.3, keep: 0 },
    { box: [-38.4, 12.6, -28.3, -24.0], y: top + 3.3, keep: 0.12 },
    { box: [-37.4, 11.4, -39.8, -35.9], y: top + 3.3, keep: 0.12 },
  ];
}

export function buildFallingPetals(ctx, infos, { counts = [7500, 24000, 8000] } = {}) {
  const { sim, camera, renderer } = ctx;
  const rng = ctx.rng(88017);
  // low quality: about half the petals (the density map keeps the distribution the same)
  if (ctx.quality === 'low') counts = counts.map((n) => Math.round(n * 0.5));
  const total = counts[0] + counts[1] + counts[2];
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const seed = new Float32Array(total * 4);
  const seed2 = new Float32Array(total * 4);
  let k = 0;
  counts.forEach((n, layer) => {
    for (let i = 0; i < n; i++, k++) {
      seed[k * 4] = rng(); seed[k * 4 + 1] = rng(); seed[k * 4 + 2] = rng(); seed[k * 4 + 3] = rng();
      seed2[k * 4] = layer; seed2[k * 4 + 1] = rng(); seed2[k * 4 + 2] = rng(); seed2[k * 4 + 3] = rng();
    }
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.setAttribute('aSeed2', new THREE.InstancedBufferAttribute(seed2, 4));
  geo.instanceCount = total;

  const street = [];
  const MS = ctx.layout.MAIN_STREET;
  for (let z = 8; z < 170; z += 2) {
    const x = MS.centerX(z);
    street.push([x, z, 6, 0.26, ctx.layout.groundY(x, z) + 7.5]);
  }
  street.push([-4, -6, 22, 0.22, 9]);
  const { tex, rect } = densityTexture(infos, sim.wind.dir, street);
  const trains = [];
  for (let i = 0; i < MAX_TRAINS; i++) trains.push(new THREE.Vector4(0, 0, 0, 0));
  const windOff = new THREE.Vector2().copy(sim.wind.dir).multiplyScalar(0.9 * sim.time);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: sim.time },
        uWindOff: { value: new THREE.Vector2() },
        uDensity: { value: null },
        uDensityRect: { value: new THREE.Vector4(rect.minX, rect.minZ, 1 / rect.sizeX, 1 / rect.sizeZ) },
        uTrain: { value: [] },
        uRoofBox: { value: [] },
        uRoofYK: { value: [] },
        uPixel: { value: 0.001 },
        uSunDir: { value: new THREE.Vector3() },
        uColA: { value: new THREE.Color('#fff6f9') },
        uColB: { value: new THREE.Color('#fbc9d7') },
        uColC: { value: new THREE.Color('#f5a8bd') },
        uBase: { value: new THREE.Color('#ef98b2') },
        uShadow: { value: new THREE.Color(0.78, 0.74, 0.9) },
        uGlow: { value: new THREE.Color('#fff2f0') },
      },
    ]),
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  // UniformsUtils.merge clones values: re-attach live references
  mat.uniforms.uDensity.value = tex;
  mat.uniforms.uWindOff.value = windOff;
  mat.uniforms.uTrain.value = trains;
  const roofs = roofBoxes(ctx.layout);
  mat.uniforms.uRoofBox.value = roofs.map((r) => new THREE.Vector4(...r.box));
  mat.uniforms.uRoofYK.value = roofs.map((r) => new THREE.Vector2(r.y, r.keep));
  mat.uniforms.uSunDir.value = ctx.sunDir;
  mat.name = 'sakura_falling_petals';

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sakura_falling_petals';
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.noOutline = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const U = mat.uniforms;
  ctx.onUpdate((dt, t) => {
    U.uTime.value = t;
    const w = sim.wind;
    windOff.x += w.dir.x * (0.45 + w.strength * 1.1) * dt;
    windOff.y += w.dir.y * (0.45 + w.strength * 1.1) * dt;
    const h = renderer.domElement.height || 720;
    U.uPixel.value = THREE.MathUtils.degToRad(camera.fov) / h;
    for (let i = 0; i < MAX_TRAINS; i++) {
      const tr = sim.trains[i];
      if (tr) trains[i].set(tr.x, tr.z, (tr.dir || 1) * (tr.speed || 0), tr.length || 54);
      else trains[i].set(0, 0, 0, 0);
    }
  });
  return mesh;
}
