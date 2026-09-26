/**
 * Renderer / scene / loop wiring and the `ctx` object handed to every world
 * module's build(ctx).
 */
import * as THREE from 'three';
import layout, { makeRng } from './layout.js';
import toon, { TOON_UNIFORMS } from './toon.js';
import geom from './geom.js';
import tex, { setMaxAnisotropy } from './canvasTex.js';
import { PALETTE } from './palette.js';
import { createSim } from './sim.js';
import { createLighting, SUN, setSunAngles } from './lighting.js';
import { createPostFX, OUTLINE_LAYER } from './postfx.js';
import { createControls } from './controls.js';
import { createAudio } from './audio.js';

export function createEngine(canvas, params) {
  const quality = params.get('q') || (matchMedia('(pointer: coarse)').matches ? 'low' : 'high');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: params.has('shot'),
  });
  const maxDpr = quality === 'low' ? 1.0 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.FogExp2(new THREE.Color('#dfe8f2'), 0.0021);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.15, 2600);
  camera.layers.enable(0);

  if (params.has('sun')) {
    const [az, el] = params.get('sun').split(',').map(Number);
    setSunAngles(az, el);
  }

  const lighting = createLighting(scene, renderer, quality);
  const sim = createSim({ startTime: params.has('t') ? Number(params.get('t')) : 0 });
  if (params.has('pause')) sim.timeScale = 0;
  const audio = createAudio();

  const updaters = [];
  const ctx = {
    THREE,
    scene,
    camera,
    renderer,
    layout,
    toon,
    geom,
    tex,
    palette: PALETTE,
    sim,
    audio,
    quality,
    /**
     * Content scaling for the quality preset. Modules multiply instance counts (petals, tufts,
     * stones, cards…) by lod.density and may drop small details when lod.detail === 'low'.
     */
    lod: quality === 'low' ? { density: 0.45, detail: 'low', shadowDetail: false } : { density: 1, detail: 'high', shadowDetail: true },
    params,
    sunDir: SUN.dir,
    lighting,
    rng: (seed) => makeRng(seed),
    /** Register a per-frame callback (dt seconds (scaled sim time), t = sim.time). */
    onUpdate(fn) { updaters.push(fn); },
    /** Walk-mode collider (axis aligned box in world XZ). */
    addCollider(minX, maxX, minZ, maxZ) { controls.addCollider(minX, maxX, minZ, maxZ); },
    OUTLINE_LAYER,
  };

  const controls = createControls(camera, canvas, { onModeChange: (m) => ctx.onModeChange?.(m) });
  const post = createPostFX(renderer, scene, camera, { quality, sunDir: SUN.dir });
  if (params.get('fx') === '0') post.outline.uniforms.enabled.value = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    post.setSize(s.x, s.y);
  }
  window.addEventListener('resize', resize);

  /** Put outline-able meshes on the outline layer; call after modules add content. */
  function assignLayers(root = scene) {
    const list = [];
    root.traverse((o) => {
      if (!(o.isMesh || o.isInstancedMesh)) return;
      const m = o.material;
      const transparent = Array.isArray(m) ? false : (m.transparent || m.userData?.isGlass);
      if (o.userData.noOutline || transparent) o.layers.disable(OUTLINE_LAYER);
      else {
        o.layers.enable(OUTLINE_LAYER);
        list.push(o);
      }
    });
    if (root === scene) post.setOutlineMeshes(list);
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  renderer.info.autoReset = false;
  let frames = 0;
  const frameWaiters = [];
  let running = false;

  // adaptive resolution: trade pixel ratio for frame rate on slower GPUs (never in screenshot mode)
  const dprMax = renderer.getPixelRatio();
  const dprMin = Math.min(dprMax, quality === 'low' ? 0.7 : 0.85);
  let dpr = dprMax;
  let frameAcc = 0, frameN = 0, lastAdjust = 0;
  function adaptResolution(rdt) {
    if (params.has('shot') || params.has('fixeddpr')) return;
    frameAcc += rdt; frameN++;
    const now = performance.now();
    if (now - lastAdjust < 2500 || frameN < 30) return;
    const avg = frameAcc / frameN;
    frameAcc = 0; frameN = 0; lastAdjust = now;
    let next = dpr;
    if (avg > 1 / 45) next = Math.max(dprMin, dpr * 0.85);
    else if (avg < 1 / 58 && dpr < dprMax) next = Math.min(dprMax, dpr * 1.1);
    if (Math.abs(next - dpr) > 0.02) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      resize();
    }
  }

  function frame() {
    timer.update();
    const rdt = Math.min(timer.getDelta(), 0.1);
    adaptResolution(rdt);
    renderer.info.reset();
    const dt = rdt * sim.timeScale;
    sim.step(rdt);
    for (const fn of updaters) fn(dt, sim.time, rdt);
    controls.update(rdt);
    lighting.update(camera, sim);
    post.render(rdt, lighting.state.needsShadow);
    frames++;
    for (let i = frameWaiters.length - 1; i >= 0; i--) {
      if (frames >= frameWaiters[i].at) { frameWaiters[i].resolve(); frameWaiters.splice(i, 1); }
    }
  }

  /** Stop rendering (screenshot tool: freeze the last frame before capture). */
  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  function start() {
    if (running) return;
    running = true;
    timer.reset?.();
    renderer.setAnimationLoop(frame);
  }

  function waitFrames(n) {
    return new Promise((resolve) => frameWaiters.push({ at: frames + n, resolve }));
  }

  function stats() {
    const info = renderer.info;
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length,
      materials: toon.materialCount(),
      frames,
    };
  }

  return { renderer, scene, camera, ctx, controls, post, lighting, sim, audio, start, stop, resize, assignLayers, waitFrames, stats, quality, TOON_UNIFORMS };
}
