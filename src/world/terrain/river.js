/**
 * terrain/river — the stylised river and its stone-faced banks.
 *
 * Water: a toon material patched in the fragment shader —
 *   - soft blue gradient, darker / greener band along both banks
 *   - thin light flow streaks drifting downstream (towards +x) at different speeds
 *   - a lacy foam line at the waterline
 *   - sun glints (small twinkling dashes) where the view reflects the low sun,
 *     plus a fresnel sky tint at grazing angles
 * It still receives shadows (levee cherry rows shade the water).
 *
 * Banks: 間知ブロック revetment on the lower slopes (vertex-coloured wet band
 * and moss near the water) topped by a concrete coping that casts a shadow.
 */
import * as THREE from 'three';
import { TERRAIN, groundY } from '../../core/layout.js';
import { GeoBuilder, addSlab, fbm, lin } from './common.js';

const T = TERRAIN;

/** z where the ground crosses height y on a monotonic bank segment [za, zb]. */
function solveZ(za, zb, y) {
  let a = za, b = zb;
  const fa = groundY(0, a) - y;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    const fm = groundY(0, m) - y;
    if ((fm > 0) === (fa > 0)) a = m; else b = m;
  }
  return (a + b) / 2;
}

export const WATERLINE = {
  south: solveZ(T.riverSouthBank, T.leveeTopNorth, T.waterLevel),
  north: solveZ(T.riverNorthBank, T.farLeveeTopSouth, T.waterLevel),
};
const REVET_TOP_Y = 0.35;
export const REVET = {
  south: [T.riverSouthBank - 0.3, solveZ(T.riverSouthBank, T.leveeTopNorth, REVET_TOP_Y)],
  north: [solveZ(T.riverNorthBank, T.farLeveeTopSouth, REVET_TOP_Y), T.riverNorthBank + 0.3],
};

function waterShader(sunDir) {
  return (shader) => {
    shader.uniforms.uSun = { value: sunDir };
    shader.uniforms.uWS = { value: WATERLINE.south };
    shader.uniforms.uWN = { value: WATERLINE.north };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float toonTime;
        uniform vec3 uSun;
        uniform float uWS;
        uniform float uWN;
        varying vec3 vWWorld;
        float wHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float streakLayer( vec2 wp, float rowH, float speed, float lenMin, float lenVar, float seed ) {
          float row = floor( wp.y / rowH );
          float h = wHash( vec2( row, seed ) );
          float h2 = wHash( vec2( row, seed + 7.0 ) );
          float len = lenMin + h * lenVar;
          float u = ( wp.x - toonTime * speed * ( 0.7 + h2 * 0.6 ) ) / len + h * 17.0;
          float seg = fract( u );
          float cellId = floor( u );
          float on = step( 0.45, wHash( vec2( cellId, row + seed ) ) );
          float duty = 0.25 + 0.35 * h2;
          float s = smoothstep( 0.0, 0.06, seg ) * ( 1.0 - smoothstep( duty - 0.06, duty, seg ) );
          float fy = abs( fract( wp.y / rowH ) - 0.5 ) * 2.0;
          // tapered: thicker in the middle of the dash
          float thick = 0.10 + 0.14 * sin( clamp( seg / duty, 0.0, 1.0 ) * 3.1416 );
          return s * on * ( 1.0 - smoothstep( thick * 0.6, thick, fy ) );
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 wp = vWWorld.xz;
        float dEdge = min( uWS - wp.y, wp.y - uWN );
        float mid = smoothstep( 0.4, 5.5, dEdge );
        vec3 cEdge = vec3( 0.20, 0.36, 0.42 );
        vec3 cMid = vec3( 0.33, 0.55, 0.72 );
        vec3 wc = mix( cEdge, cMid, mid );
        // gentle broad tonal ripples along the flow
        float rip = sin( wp.x * 0.11 + wp.y * 0.9 - toonTime * 0.35 ) * sin( wp.x * 0.037 - toonTime * 0.12 + wp.y * 0.3 );
        wc *= 0.96 + 0.05 * rip;
        float st = streakLayer( wp, 0.7, 0.55, 3.0, 7.0, 1.0 ) * 0.55 + streakLayer( wp + vec2( 3.1, 0.35 ), 1.3, 0.8, 5.0, 10.0, 4.0 ) * 0.4;
        wc = mix( wc, vec3( 0.80, 0.90, 0.97 ), st * ( 0.45 + 0.55 * mid ) );
        // foam at the waterline
        float lace = 0.18 + 0.12 * sin( wp.x * 0.9 + toonTime * 1.1 ) * sin( wp.x * 0.37 - toonTime * 0.6 );
        float foam = 1.0 - smoothstep( lace - 0.06, lace + 0.02, dEdge );
        wc = mix( wc, vec3( 0.93, 0.96, 0.98 ), foam * 0.85 );
        diffuseColor.rgb = wc;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 V = normalize( cameraPosition - vWWorld );
          vec3 R = reflect( -V, vec3( 0.0, 1.0, 0.0 ) );
          float fres = pow( 1.0 - clamp( V.y, 0.0, 1.0 ), 4.0 );
          totalEmissiveRadiance += vec3( 0.55, 0.68, 0.82 ) * fres * 0.35;
          float sunR = pow( max( dot( R, normalize( uSun ) ), 0.0 ), 5.0 );
          vec2 g = vWWorld.xz * vec2( 1.3, 3.2 ) + vec2( -toonTime * 0.5, 0.0 );
          vec2 gi = floor( g );
          float gh = wHash( gi );
          // jitter each dash inside its cell so the glints don't line up in rows
          vec2 gf = fract( g ) - 0.5 - ( vec2( wHash( gi + 3.7 ), wHash( gi + 9.1 ) ) - 0.5 ) * vec2( 0.4, 0.6 );
          float tw = 0.5 + 0.5 * sin( toonTime * ( 2.0 + gh * 4.0 ) + gh * 30.0 );
          float dash = ( 1.0 - smoothstep( 0.18, 0.3, abs( gf.x ) ) ) * ( 1.0 - smoothstep( 0.05, 0.12, abs( gf.y ) ) );
          float glint = dash * step( 0.88, gh ) * tw;
          totalEmissiveRadiance += vec3( 1.0, 0.95, 0.82 ) * glint * ( 0.04 + 1.8 * smoothstep( 0.15, 0.6, sunR ) ); // only on the sun side
        }`);
  };
}

export function buildRiver(ctx, bins, tex) {
  const group = [];
  // ---- water ---------------------------------------------------------------
  const b = new GeoBuilder();
  const z0 = WATERLINE.north - 1.2, z1 = WATERLINE.south + 1.2;
  const x0 = T.extentX[0], x1 = T.extentX[1];
  b.grid(46, 4, (i, j) => {
    const x = x0 + ((x1 - x0) * i) / 46, z = z0 + ((z1 - z0) * j) / 4;
    return [x, T.waterLevel, z, x * 0.1, z * 0.1];
  });
  const water = new THREE.Mesh(b.build({ colors: false }), ctx.toon.mat('#ffffff', {
    onShader: waterShader(ctx.sunDir),
    onShaderKey: 'terrainWater',
    name: 'terrainWater',
  }));
  water.name = 'terrain:water';
  water.receiveShadow = true;
  water.castShadow = false;
  water.userData.dynamic = true;
  group.push(water);

  // ---- revetment -----------------------------------------------------------
  const rv = bins.get('revetment');
  const wet = lin('#8d9a8c'), dry = [1, 1, 1], moss = lin('#b9c7a0');
  for (const [za, zb] of [REVET.south, REVET.north]) {
    const nz = 6;
    rv.grid(230, nz, (i, j) => {
      const x = x0 + ((x1 - x0) * i) / 230;
      const z = za + ((zb - za) * j) / nz;
      const y = groundY(x, z);
      const h = y - T.waterLevel; // height above the water
      const m = fbm(x * 0.08, z * 0.5, 61, 2);
      let c = h < 0.12 ? wet : dry;
      if (h >= 0.12) {
        const k = Math.min(1, Math.max(0, (m - 0.45) * 2.2)) * (1 - Math.min(1, h / 1.2));
        c = [dry[0] + (moss[0] - 1) * k, dry[1] + (moss[1] - 1) * k, dry[2] + (moss[2] - 1) * k];
      }
      const slope = Math.hypot(z - za, y - groundY(x, za));
      return [x, y + 0.05, z, x / 6, slope / 6 + (za < -90 ? 0.5 : 0), c];
    });
  }
  // concrete coping along the top of each revetment (raised: casts a thin shadow)
  const cap = bins.get('concreteRaised');
  for (const zc of [REVET.south[1], REVET.north[0]]) {
    for (let x = x0; x < x1 - 0.1; x += 4) {
      const xe = Math.min(x1, x + 4);
      addSlab(cap, { x: x + 0.01, z: zc }, { x: xe - 0.01, z: zc }, 0.4, (xx, zz) => groundY(xx, zz) - 0.2, (xx) => Math.max(groundY(xx, zc - 0.2), groundY(xx, zc + 0.2)) + 0.08,[0.97, 0.97, 0.98], [0.05, 0.05, 0.95, 0.3]);
    }
  }
  return group;
}
