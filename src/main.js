/**
 * 桜ヶ丘駅 — cel-shaded sakura station.  Bootstraps the engine, builds every
 * world module (each is independent and reads the shared layout), then runs.
 *
 * URL parameters (handy for development / screenshots):
 *   ?only=station,train   build only these modules (sky always included unless 'nosky')
 *   ?skip=people          skip modules
 *   ?cam=x,y,z&look=x,y,z[&fov=50]   fixed camera
 *   ?view=hero|plaza|crossing|platform|levee|aerial   start on a preset shot
 *   ?mode=tour|walk|orbit
 *   ?t=35&pause=1         simulation start time / freeze time
 *   ?fx=0                 disable outlines
 *   ?q=low|high           quality
 *   ?sun=az,el            sun azimuth (0 = north, 90 = west) & elevation, degrees
 *   ?debug=layout         draw lot / road / tree footprints
 *   ?shot=1               screenshot mode (no UI, no web fonts, sets window.__sceneReady)
 *   ?fonts=0              skip the Google Fonts request (signage uses local Japanese fonts)
 */
import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { ensureFonts } from './core/canvasTex.js';
import { startAmbience } from './core/ambience.js';
import { CAMERAS } from './core/layout.js';

export const MODULES = [
  { id: 'sky', label: '天空与远山', load: () => import('./world/sky.js') },
  { id: 'terrain', label: '地面与街道', load: () => import('./world/terrain.js') },
  { id: 'railway', label: '铁路设施', load: () => import('./world/railway.js') },
  { id: 'station', label: '车站与站台', load: () => import('./world/station.js') },
  { id: 'train', label: '电车', load: () => import('./world/train.js') },
  { id: 'crossing', label: '铁路道口', load: () => import('./world/crossing.js') },
  { id: 'houses', label: '住宅', load: () => import('./world/houses.js') },
  { id: 'shops', label: '商店街', load: () => import('./world/shops.js') },
  { id: 'poles', label: '电线杆与电线', load: () => import('./world/poles.js') },
  { id: 'props', label: '街道小物', load: () => import('./world/props.js') },
  { id: 'sakura', label: '樱花', load: () => import('./world/sakura.js') },
  { id: 'people', label: '人物与小动物', load: () => import('./world/people.js') },
];

const params = new URLSearchParams(location.search);
const shotMode = params.has('shot');
if (shotMode) document.body.classList.add('shotmode');

const $ = (id) => document.getElementById(id);
const setLoad = (frac, text) => {
  $('loadbar').style.width = `${Math.round(frac * 100)}%`;
  if (text) $('loadstep').textContent = text;
};

function sprinklePetals() {
  const host = $('loading');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.left = `${Math.random() * 110}vw`;
    p.style.animationDuration = `${6 + Math.random() * 7}s`;
    p.style.animationDelay = `${-Math.random() * 10}s`;
    p.style.transform = `scale(${0.6 + Math.random()})`;
    host.appendChild(p);
  }
}

async function main() {
  sprinklePetals();
  const canvas = $('scene');
  const engine = createEngine(canvas, params);
  const { ctx, scene, controls } = engine;
  window.__app = { engine, ctx, THREE };
  window.__stats = () => ({ ...engine.stats(), buildTimes, errors });
  window.__waitFrames = (n) => engine.waitFrames(n);
  window.__stopLoop = () => engine.stop();

  setLoad(0.03, '加载字体…');
  // Web fonts (Zen Maru Gothic etc.) for the signage when online; screenshot mode and ?fonts=0 use the
  // local Japanese fallbacks in canvasTex.FONTS so renders are deterministic and need no network.
  if (!shotMode && params.get('fonts') !== '0' && navigator.onLine !== false) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;800&family=Noto+Sans+JP:wght@400;700&family=Shippori+Mincho:wght@700&family=Zen+Maru+Gothic:wght@500;700&display=swap';
    document.head.appendChild(link);
    await ensureFonts(3500);
  }

  const only = params.get('only')?.split(',').filter(Boolean);
  const skip = params.get('skip')?.split(',').filter(Boolean) || [];
  let list = MODULES.filter((m) => !skip.includes(m.id));
  if (only) list = list.filter((m) => only.includes(m.id) || (m.id === 'sky' && !only.includes('nosky')));
  if (params.get('debug') === 'layout') list.push({ id: 'debugLayout', label: '布局调试', load: () => import('./world/_debugLayout.js') });
  // ?extra=_calib,foo  -> also load src/world/<name>.js (dev scratch modules)
  for (const name of params.get('extra')?.split(',').filter(Boolean) || []) {
    list.push({ id: name, label: name, load: () => import(`./world/${name}.js`) });
  }

  const buildTimes = {};
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    setLoad(0.05 + (0.85 * i) / list.length, `构建 ${m.label}…`);
    await new Promise((r) => setTimeout(r, 0)); // let the loading UI paint
    const t0 = performance.now();
    try {
      const mod = await m.load();
      const build = mod.default || mod.build;
      if (typeof build === 'function') {
        const obj = await build(ctx);
        if (obj && obj.isObject3D && !obj.parent) {
          obj.name = obj.name || m.id;
          scene.add(obj);
        }
      }
    } catch (e) {
      console.error(`[module ${m.id}] build failed:`, e);
      errors.push({ module: m.id, message: String(e && e.stack ? e.stack : e) });
    }
    buildTimes[m.id] = Math.round(performance.now() - t0);
  }

  engine.assignLayers();
  startAmbience(ctx);
  setLoad(0.93, '编译着色器…');
  // camera setup before first frame
  if (params.has('cam')) {
    const p = params.get('cam').split(',').map(Number);
    const l = (params.get('look') || '0,0,0').split(',').map(Number);
    controls.fixed(p, l, params.has('fov') ? Number(params.get('fov')) : undefined);
  } else if (params.has('view')) {
    const idx = controls.shots.findIndex((s) => s.id === params.get('view'));
    if (idx >= 0) controls.goShot(idx, true);
  }
  controls.update(0);
  try {
    if (engine.renderer.compileAsync) await engine.renderer.compileAsync(scene, engine.camera);
  } catch (e) {
    console.warn('compileAsync failed', e);
  }
  engine.start();
  await engine.waitFrames(shotMode ? 4 : 2);
  setLoad(1, '出发！');
  $('loading').classList.add('done');
  buildUI(engine);
  if (params.has('mode')) controls.setMode(params.get('mode'));
  if (errors.length && !shotMode) {
    $('warn').style.display = 'block';
    $('warn').textContent = `部分模块加载失败: ${errors.map((e) => e.module).join(', ')}`;
  }
  window.__sceneReady = true;
}

function buildUI(engine) {
  if (shotMode) return;
  const { controls, audio } = engine;
  const bar = $('bar');
  const ui = $('ui');
  const hint = $('hint');
  const cross = $('crosshair');
  const btns = {};
  const mk = (id, label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    bar.appendChild(b);
    btns[id] = b;
    return b;
  };
  const sep = () => { const s = document.createElement('span'); s.className = 'sep'; bar.appendChild(s); };
  controls.shots.forEach((s, i) => mk(`shot${i}`, s.label, () => { controls.setMode('shot'); controls.goShot(i); refresh(); }));
  sep();
  mk('tour', '巡游', () => { controls.setMode('tour'); refresh(); });
  mk('walk', '漫游', () => { controls.setMode('walk'); refresh(); });
  mk('orbit', '自由视角', () => { controls.setMode('orbit'); refresh(); });
  sep();
  mk('sound', '声音: 关', () => {
    audio.setEnabled(!audio.enabled);
    btns.sound.textContent = audio.enabled ? '声音: 开' : '声音: 关';
    btns.sound.classList.toggle('on', audio.enabled);
  });
  mk('hide', '隐藏界面', () => ui.classList.add('hidden'));
  $('showui').onclick = () => ui.classList.remove('hidden');
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') ui.classList.toggle('hidden');
    setTimeout(refresh, 0);
  });
  hint.onclick = () => controls.plc.lock();
  engine.ctx.onModeChange = () => refresh();

  function refresh() {
    const m = controls.mode;
    controls.shots.forEach((s, i) => btns[`shot${i}`].classList.toggle('on', m === 'shot' && controls.shotIndex === i));
    btns.tour.classList.toggle('on', m === 'tour');
    btns.walk.classList.toggle('on', m === 'walk');
    btns.orbit.classList.toggle('on', m === 'orbit');
    const walking = m === 'walk';
    const locked = controls.plc.isLocked || controls.isTouch;
    hint.style.display = walking && !locked ? 'block' : 'none';
    cross.style.display = walking && locked ? 'block' : 'none';
  }
  controls.plc.addEventListener('lock', refresh);
  controls.plc.addEventListener('unlock', refresh);
  refresh();
}

main().catch((e) => {
  console.error(e);
  $('loadstep').textContent = `出错了: ${e.message}`;
});

export { CAMERAS };
