/**
 * Post-processing for the anime look.
 *
 *   1. normal/depth pre-pass (layer 1 only = everything not flagged noOutline)
 *   2. main scene render into an MSAA HDR target
 *   3. outline pass: edges from depth (1/z Laplacian, so flat ground at grazing
 *      angles stays clean) + normal discontinuities; line colour is a darkened,
 *      violet-shifted version of the underlying colour (never pure black), and
 *      lines fade with distance so far scenery stays airy
 *   4. subtle bloom (only very bright things: lamps, backlit petals)
 *   5. grade: saturation / split-toning / sun haze / vignette
 *   6. output (tone mapping + sRGB), FXAA
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { TOON_UNIFORMS } from './toon.js';

export const OUTLINE_LAYER = 1;

const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 1000 },
    thickness: { value: 1.0 },
    depthThreshold: { value: 0.18 },
    normalThreshold: { value: 0.35 },
    fadeNear: { value: 45 },
    fadeFar: { value: 320 },
    strength: { value: 0.85 },
    lineTint: { value: new THREE.Color(0.32, 0.27, 0.38) },
    enabled: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float thickness;
    uniform float depthThreshold;
    uniform float normalThreshold;
    uniform float fadeNear;
    uniform float fadeFar;
    uniform float strength;
    uniform vec3 lineTint;
    uniform float enabled;
    varying vec2 vUv;

    float viewZ( vec2 uv ) {
      float d = texture2D( tDepth, uv ).x;
      return -perspectiveDepthToViewZ( d, cameraNear, cameraFar );
    }
    vec3 nrm( vec2 uv ) {
      vec4 t = texture2D( tNormal, uv );
      return t.a < 0.5 ? vec3( 0.0 ) : unpackRGBToNormal( t.rgb );
    }
    void main() {
      vec4 base = texture2D( tDiffuse, vUv );
      if ( enabled < 0.5 ) { gl_FragColor = base; return; }
      vec2 px = thickness / resolution;
      float zc = viewZ( vUv );
      float zl = viewZ( vUv - vec2( px.x, 0.0 ) );
      float zr = viewZ( vUv + vec2( px.x, 0.0 ) );
      float zu = viewZ( vUv + vec2( 0.0, px.y ) );
      float zd = viewZ( vUv - vec2( 0.0, px.y ) );
      // Laplacian of 1/z is ~0 on planes -> no false edges on grazing surfaces
      float ic = 1.0 / zc;
      float lap = abs( 1.0 / zl + 1.0 / zr + 1.0 / zu + 1.0 / zd - 4.0 * ic ) / ic;
      float zmin = min( min( zl, zr ), min( zu, zd ) );
      float dEdge = smoothstep( depthThreshold, depthThreshold * 1.8, lap );
      // only draw depth edges on the NEAR side of a discontinuity (keeps lines 1 layer thick)
      dEdge *= step( zc, zmin * 1.02 + 0.05 );

      vec3 nc = nrm( vUv );
      vec3 nl = nrm( vUv - vec2( px.x, 0.0 ) );
      vec3 nr = nrm( vUv + vec2( px.x, 0.0 ) );
      vec3 nu = nrm( vUv + vec2( 0.0, px.y ) );
      vec3 nd = nrm( vUv - vec2( 0.0, px.y ) );
      float nEdge = 0.0;
      if ( dot( nc, nc ) > 0.1 ) {
        float nd1 = ( 1.0 - dot( nc, nl ) ) + ( 1.0 - dot( nc, nr ) ) + ( 1.0 - dot( nc, nu ) ) + ( 1.0 - dot( nc, nd ) );
        nEdge = smoothstep( normalThreshold, normalThreshold * 1.6, nd1 );
      }
      float edge = max( dEdge, nEdge * 0.85 );
      float fade = 1.0 - smoothstep( fadeNear, fadeFar, zc );
      edge *= fade * strength;
      vec3 lineCol = base.rgb * lineTint;
      gl_FragColor = vec4( mix( base.rgb, lineCol, edge ), base.a );
    }
  `,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.08 },
    contrast: { value: 1.02 },
    exposure: { value: 1.0 },
    shadowTint: { value: new THREE.Color(0.95, 0.96, 1.06) },
    highlightTint: { value: new THREE.Color(1.03, 1.0, 0.96) },
    vignette: { value: 0.22 },
    sunScreen: { value: new THREE.Vector3(0.2, 1.1, 0) }, // xy = uv of sun, z = on-screen weight
    sunGlow: { value: 0.22 },
    sunGlowColor: { value: new THREE.Color('#ffe2c0') },
    aspect: { value: 1.7 },
  },
  vertexShader: OutlineShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float exposure;
    uniform vec3 shadowTint;
    uniform vec3 highlightTint;
    uniform float vignette;
    uniform vec3 sunScreen;
    uniform float sunGlow;
    uniform vec3 sunGlowColor;
    uniform float aspect;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      vec3 col = c.rgb * exposure;
      float l = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
      col = mix( vec3( l ), col, saturation );
      col = ( col - 0.5 ) * contrast + 0.5;
      float t = smoothstep( 0.05, 0.9, l );
      col *= mix( shadowTint, highlightTint, t );
      // soft sun haze from the upper-left, stronger when the sun is near/in frame
      vec2 d = vUv - sunScreen.xy;
      d.x *= aspect;
      float g = exp( -dot( d, d ) * 1.6 ) * sunScreen.z;
      col += sunGlowColor * g * sunGlow;
      // gentle vignette
      vec2 v = vUv - 0.5;
      col *= 1.0 - vignette * smoothstep( 0.35, 0.85, length( v * vec2( 1.0, 1.15 ) ) );
      gl_FragColor = vec4( max( col, 0.0 ), c.a );
    }
  `,
};

export function createPostFX(renderer, scene, camera, { quality = 'high', sunDir } = {}) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: quality === 'low' ? 0 : 4,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); // sizes are already in drawing-buffer pixels
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // normal + depth pre-pass target
  const depthTexture = new THREE.DepthTexture(size.x, size.y);
  depthTexture.type = THREE.UnsignedIntType;
  const normalRT = new THREE.WebGLRenderTarget(size.x, size.y, {
    depthTexture,
    depthBuffer: true,
    type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });

  const outline = new ShaderPass(OutlineShader);
  outline.uniforms.tNormal.value = normalRT.texture;
  outline.uniforms.tDepth.value = depthTexture;
  composer.addPass(outline);

  let bloom = null;
  if (quality !== 'low') {
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.18, 0.55, 0.92);
    composer.addPass(bloom);
  }

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  const fxaa = new FXAAPass();
  composer.addPass(fxaa);

  // ---- normal-variant materials (keeps vertex-animated meshes aligned) ----
  const variantCache = new WeakMap();
  const baseNormal = { [THREE.FrontSide]: null, [THREE.BackSide]: null, [THREE.DoubleSide]: null };
  function variantFor(src) {
    let v = variantCache.get(src);
    if (v) return v;
    const vp = src.userData && src.userData.vertexPatch;
    const cut = src.alphaTest > 0 && src.map ? src.map : null;
    if (cut) {
      // alpha-cut cards: discard like the real material so outlines follow the cut-out shape
      v = new THREE.MeshNormalMaterial({ side: src.side });
      const uniforms = { cutMap: { value: cut }, cutTest: { value: src.alphaTest }, cutXf: { value: cut.matrix } };
      v.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.uniforms.toonTime = TOON_UNIFORMS.toonTime;
        shader.uniforms.toonWind = TOON_UNIFORMS.toonWind;
        if (vp) Object.assign(shader.uniforms, vp.uniforms || {});
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\nuniform mat3 cutXf;\nvarying vec2 vCutUv;\nuniform float toonTime;\nuniform vec3 toonWind;\n${vp ? vp.pars || '' : ''}`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>\nvCutUv = ( cutXf * vec3( uv, 1.0 ) ).xy;\n${vp ? vp.main || '' : ''}`);
        shader.fragmentShader = shader.fragmentShader
          .replace('void main() {', 'uniform sampler2D cutMap;\nuniform float cutTest;\nvarying vec2 vCutUv;\nvoid main() {\n  if ( texture2D( cutMap, vCutUv ).a < cutTest ) discard;');
      };
      v.customProgramCacheKey = () => 'nrmcut|' + (vp ? vp.key || vp.main : '');
    } else if (!vp) {
      const side = src.side ?? THREE.FrontSide;
      if (!baseNormal[side]) baseNormal[side] = new THREE.MeshNormalMaterial({ side });
      v = baseNormal[side];
    } else {
      v = new THREE.MeshNormalMaterial({ side: src.side });
      v.onBeforeCompile = (shader) => {
        shader.uniforms.toonTime = TOON_UNIFORMS.toonTime;
        shader.uniforms.toonWind = TOON_UNIFORMS.toonWind;
        Object.assign(shader.uniforms, vp.uniforms || {});
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\nuniform float toonTime;\nuniform vec3 toonWind;\n${vp.pars || ''}`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vp.main || ''}`);
      };
      v.customProgramCacheKey = () => 'nrm|' + (vp.key || vp.main);
    }
    variantCache.set(src, v);
    return v;
  }

  const swapped = [];
  const layerCam = new THREE.PerspectiveCamera();
  const clearColor = new THREE.Color();

  function renderNormalPass() {
    swapped.length = 0;
    scene.traverseVisible((o) => {
      if ((o.isMesh || o.isInstancedMesh) && o.layers.isEnabled(OUTLINE_LAYER) && !Array.isArray(o.material)) {
        swapped.push(o, o.material);
        o.material = variantFor(o.material);
      }
    });
    layerCam.copy(camera);
    layerCam.layers.set(OUTLINE_LAYER);
    // lines are fully faded beyond fadeFar, so the pre-pass can skip everything further away
    layerCam.far = Math.min(camera.far, outline.uniforms.fadeFar.value + 30);
    layerCam.updateProjectionMatrix();
    const bg = scene.background;
    const fog = scene.fog;
    scene.background = null;
    scene.fog = null;
    renderer.getClearColor(clearColor);
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(normalRT);
    renderer.clear();
    renderer.render(scene, layerCam);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColor, alpha);
    scene.background = bg;
    scene.fog = fog;
    for (let i = 0; i < swapped.length; i += 2) swapped[i].material = swapped[i + 1];
  }

  const sunWorld = new THREE.Vector3();
  const sunNdc = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function render(dt, needsShadow = true) {
    const outlinesOn = outline.uniforms.enabled.value > 0.5;
    renderer.shadowMap.needsUpdate = false;
    if (outlinesOn) renderNormalPass();
    outline.uniforms.cameraNear.value = layerCam.near;
    outline.uniforms.cameraFar.value = layerCam.far;
    // sun haze position
    if (sunDir) {
      sunWorld.copy(camera.position).addScaledVector(sunDir, 1000);
      sunNdc.copy(sunWorld).project(camera);
      camera.getWorldDirection(camDir);
      const facing = camDir.dot(sunDir);
      const w = THREE.MathUtils.smoothstep(facing, -0.1, 0.6);
      grade.uniforms.sunScreen.value.set(sunNdc.x * 0.5 + 0.5, sunNdc.y * 0.5 + 0.5, w);
    }
    renderer.shadowMap.needsUpdate = needsShadow;
    composer.render(dt);
  }

  function setSize(w, h) {
    composer.setSize(w, h);
    normalRT.setSize(w, h);
    outline.uniforms.resolution.value.set(w, h);
    outline.uniforms.thickness.value = Math.max(1, Math.round(h / 1000));
    grade.uniforms.aspect.value = w / h;
    if (bloom) bloom.resolution.set(w / 2, h / 2);
    fxaa.setSize?.(w, h);
  }
  setSize(size.x, size.y);

  return { composer, render, setSize, outline, grade, bloom, normalRT, OUTLINE_LAYER };
}
