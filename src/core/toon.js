/**
 * Toon / cel-shading material factory.
 *
 * Every opaque surface in the scene should get its material from here so the
 * whole world shares one look:
 *   - hard-edged (anti-aliased) light bands instead of smooth Lambert
 *   - shadowed / unlit sides tinted a soft blue-violet instead of grey-black
 *   - optional rim light (backlit edges glow warm, like anime films)
 *   - optional stepped specular highlight for metal (rails, train trim)
 *   - optional vertex patch hook (wind sway etc.)
 *
 * Materials are CACHED by their parameters, so calling toon.mat('#ffffff')
 * twice returns the same instance.  This matters: geom.bakeStatic() merges
 * meshes that share a material, so reuse keeps draw calls low.
 *
 * Outlines are a post-process (see postfx.js).  To exclude an object from the
 * outline pass set `object.userData.noOutline = true` (petals, sky, wires,
 * glass, particles, text decals...).
 */
import * as THREE from 'three';

/** Global uniforms shared by every toon material (tweak at runtime). */
export const TOON_UNIFORMS = {
  toonShadowTint: { value: new THREE.Color(0.84, 0.88, 1.08) }, // multiplies indirect light -> blue/violet shadows
  toonTerminator: { value: 0.02 }, // dot(N,L) where lit starts
  toonBandSoftness: { value: 1.2 }, // multiples of fwidth for AA of band edges
  toonMidBand: { value: 0.5 }, // second band threshold
  toonMidBoost: { value: 0.1 }, // extra brightness above mid band
  toonRimColor: { value: new THREE.Color('#ffe2c8') },
  toonTime: { value: 0 },
  toonWind: { value: new THREE.Vector3(1, 0, 0.35) }, // xz = direction, y unused; length = strength
};

const cache = new Map();
let texIds = new WeakMap();
let texCounter = 0;
const texKey = (t) => {
  if (!t) return '';
  if (!texIds.has(t)) texIds.set(t, ++texCounter);
  return 't' + texIds.get(t);
};

function colorKey(c) {
  if (c === undefined || c === null) return '';
  if (c.isColor) return c.getHexString();
  return new THREE.Color(c).getHexString();
}

const TOON_LIGHT_PARS = /* glsl */ `
varying vec3 vViewPosition;
uniform float toonTerminator;
uniform float toonBandSoftness;
uniform float toonMidBand;
uniform float toonMidBoost;
uniform vec3 toonShadowTint;
#ifdef TOON_SPEC
uniform float toonSpecStrength;
uniform float toonShininess;
#endif

struct ToonMaterial {
  vec3 diffuseColor;
};

void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  float dotNL = dot( geometryNormal, directLight.direction );
  float w = max( fwidth( dotNL ) * toonBandSoftness, 0.0015 );
  float lit = smoothstep( toonTerminator - w, toonTerminator + w, dotNL );
  float mid = smoothstep( toonMidBand - w, toonMidBand + w, dotNL );
  vec3 irradiance = ( lit * ( 1.0 - toonMidBoost ) + mid * toonMidBoost * 2.0 ) * directLight.color;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  #ifdef TOON_SPEC
    vec3 h = normalize( directLight.direction + geometryViewDir );
    float s = pow( max( dot( geometryNormal, h ), 0.0 ), toonShininess );
    float sw = max( fwidth( s ), 0.002 );
    s = smoothstep( 0.5 - sw, 0.5 + sw, s ) * lit;
    reflectedLight.directSpecular += s * toonSpecStrength * directLight.color;
  #endif
}

void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  reflectedLight.indirectDiffuse += irradiance * toonShadowTint * BRDF_Lambert( material.diffuseColor );
}

#define RE_Direct RE_Direct_Toon
#define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
`;

function patchToon(material, opts) {
  const rim = opts.rim || 0;
  const spec = opts.spec || 0;
  const vp = opts.vertexPatch || null;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, TOON_UNIFORMS);
    shader.uniforms.toonRimStrength = { value: rim };
    if (spec) {
      shader.uniforms.toonSpecStrength = { value: spec };
      shader.uniforms.toonShininess = { value: opts.shininess || 40 };
      shader.defines = shader.defines || {};
      shader.defines.TOON_SPEC = '';
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', TOON_LIGHT_PARS)
      .replace(
        'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
        `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + totalEmissiveRadiance;
        {
          float rimF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
          outgoingLight += toonRimColor * pow( rimF, 4.0 ) * toonRimStrength * diffuseColor.rgb;
        }`
      )
      .replace('#include <common>', '#include <common>\nuniform vec3 toonRimColor;\nuniform float toonRimStrength;');
    if (vp) {
      Object.assign(shader.uniforms, vp.uniforms || {});
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float toonTime;\nuniform vec3 toonWind;\n${vp.pars || ''}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vp.main || ''}`);
    }
    if (opts.onShader) opts.onShader(shader);
  };
  material.customProgramCacheKey = () => `toon|${rim > 0}|${spec > 0}|${vp ? vp.key || vp.main : ''}|${opts.onShaderKey || ''}`;
}

/**
 * Get a cached toon material.
 * @param {THREE.ColorRepresentation} color
 * @param {object} [o]
 *   map, alphaMap, emissive, emissiveIntensity, emissiveMap, side, transparent, opacity,
 *   alphaTest, vertexColors, flatShading, rim (0..1), spec (0..1), shininess,
 *   depthWrite, polygonOffset (number: factor & units), fog (default true),
 *   vertexPatch: { key, uniforms, pars, main }  — GLSL injected after <begin_vertex>
 *        (modify `transformed`; uniforms toonTime + toonWind are available),
 *   name
 */
export function mat(color = '#ffffff', o = {}) {
  const key = [
    'toon', colorKey(color), texKey(o.map), texKey(o.alphaMap), colorKey(o.emissive), o.emissiveIntensity ?? '',
    texKey(o.emissiveMap), o.side ?? '', o.transparent ? 'T' : '', o.opacity ?? '', o.alphaTest ?? '',
    o.vertexColors ? 'VC' : '', o.flatShading ? 'F' : '', o.rim ?? '', o.spec ?? '', o.shininess ?? '',
    o.depthWrite === false ? 'nodw' : '', o.polygonOffset ?? '', o.fog === false ? 'nofog' : '',
    o.vertexPatch ? o.vertexPatch.key || o.vertexPatch.main : '', o.onShaderKey || '', o.name || '',
  ].join('|');
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshToonMaterial({
    color,
    map: o.map || null,
    alphaMap: o.alphaMap || null,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    emissiveMap: o.emissiveMap || null,
    side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    alphaTest: o.alphaTest ?? 0,
    vertexColors: !!o.vertexColors,
    fog: o.fog !== false,
  });
  if (o.flatShading) m.flatShading = true;
  if (o.depthWrite === false) m.depthWrite = false;
  if (o.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -o.polygonOffset;
    m.polygonOffsetUnits = -o.polygonOffset;
  }
  m.name = o.name || `toon_${colorKey(color)}`;
  patchToon(m, o);
  cache.set(key, m);
  return m;
}

/** Metal: toon + stepped specular. */
export function metal(color = '#9aa3ad', o = {}) {
  return mat(color, { spec: 0.55, shininess: 60, ...o });
}

/**
 * Unlit material (MeshBasicMaterial) for things that emit light or should
 * ignore shading: lamp globes, screens, lit signboards, vending machine
 * fronts.  Still fogged and tone mapped.
 */
export function unlit(color = '#ffffff', o = {}) {
  const key = ['unlit', colorKey(color), texKey(o.map), o.transparent ? 'T' : '', o.opacity ?? '', o.side ?? '', o.alphaTest ?? '', o.depthWrite === false ? 'nodw' : '', o.polygonOffset ?? '', o.fog === false ? 'nofog' : '', o.vertexColors ? 'VC' : '', o.name || ''].join('|');
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({
    color,
    map: o.map || null,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    alphaTest: o.alphaTest ?? 0,
    fog: o.fog !== false,
    vertexColors: !!o.vertexColors,
  });
  if (o.depthWrite === false) m.depthWrite = false;
  if (o.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -o.polygonOffset;
    m.polygonOffsetUnits = -o.polygonOffset;
  }
  m.name = o.name || `unlit_${colorKey(color)}`;
  cache.set(key, m);
  return m;
}

// ---------------------------------------------------------------------------
// stylised glass: tinted, with a fake sky reflection + diagonal sheen streaks
// ---------------------------------------------------------------------------
const glassVert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  #include <beginnormal_vertex>
  #include <begin_vertex>
  vec4 wp = vec4( transformed, 1.0 );
  vec3 wn = objectNormal;
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
    wn = mat3( instanceMatrix ) * wn;
  #endif
  wp = modelMatrix * wp;
  vWorldPos = wp.xyz;
  vWorldNormal = normalize( mat3( modelMatrix ) * wn );
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <fog_vertex>
}
`;
const glassFrag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
uniform vec3 tint;
uniform vec3 skyTop;
uniform vec3 skyHorizon;
uniform vec3 groundRefl;
uniform float baseOpacity;
uniform float sheen;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vWorldNormal );
  if ( !gl_FrontFacing ) n = -n;
  vec3 v = normalize( cameraPosition - vWorldPos );
  vec3 r = reflect( -v, n );
  float fres = pow( 1.0 - saturate( dot( n, v ) ), 3.0 );
  vec3 refl = r.y > 0.0 ? mix( skyHorizon, skyTop, pow( saturate( r.y ), 0.6 ) ) : mix( skyHorizon, groundRefl, saturate( -r.y * 3.0 ) );
  // diagonal sheen streaks, anime style
  float d = dot( vWorldPos, vec3( 0.55, 0.8, 0.35 ) );
  float streak = smoothstep( 0.72, 0.78, fract( d * 0.18 ) ) * ( 1.0 - smoothstep( 0.86, 0.9, fract( d * 0.18 ) ) );
  streak += 0.5 * smoothstep( 0.93, 0.95, fract( d * 0.18 + 0.1 ) ) * ( 1.0 - smoothstep( 0.965, 0.98, fract( d * 0.18 + 0.1 ) ) );
  vec3 col = mix( tint, refl, 0.55 + 0.35 * fres ) + streak * sheen;
  float a = clamp( baseOpacity + fres * 0.35 + streak * sheen * 0.6, 0.0, 1.0 );
  gl_FragColor = vec4( col, a );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * Glass for windows / shop fronts / train windows.  Semi-transparent, so put
 * interior details (shelves, silhouettes, lamps) behind it.  noOutline is set
 * automatically when you use geom helpers; if you build meshes yourself set
 * mesh.userData.noOutline = true.
 * @param {object} o  tint, opacity (0.25..0.8), sheen (0..0.6)
 */
export function glass(o = {}) {
  const key = ['glass', colorKey(o.tint ?? '#9fb6c8'), o.opacity ?? 0.45, o.sheen ?? 0.25, o.side ?? ''].join('|');
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        tint: { value: new THREE.Color(o.tint ?? '#9fb6c8') },
        skyTop: { value: new THREE.Color('#8fb4e6') },
        skyHorizon: { value: new THREE.Color('#e6eef7') },
        groundRefl: { value: new THREE.Color('#7d8088') },
        baseOpacity: { value: o.opacity ?? 0.45 },
        sheen: { value: o.sheen ?? 0.25 },
      },
    ]),
    vertexShader: glassVert,
    fragmentShader: glassFrag,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: o.side ?? THREE.FrontSide,
  });
  m.name = 'glass';
  m.userData.isGlass = true;
  cache.set(key, m);
  return m;
}

/** Colour helpers for quick hue/value variations. */
export function shade(color, lightnessDelta = 0, satMul = 1, hueShift = 0) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL((hsl.h + hueShift + 1) % 1, THREE.MathUtils.clamp(hsl.s * satMul, 0, 1), THREE.MathUtils.clamp(hsl.l + lightnessDelta, 0, 1));
  return '#' + c.getHexString();
}

export function materialCount() {
  return cache.size;
}

export default { mat, metal, unlit, glass, shade, TOON_UNIFORMS, materialCount };
