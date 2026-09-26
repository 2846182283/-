/**
 * Camera modes:
 *   'shot'  — composed cinematic shots (layout.CAMERAS) with a slow drift; keys 1..6
 *   'tour'  — auto-cycles through the shots with gentle dolly moves
 *   'walk'  — first-person, pointer lock, WASD / arrows, Shift to run; follows the
 *             ground, platforms and station floor; collides with building lots
 *   'orbit' — free inspection with OrbitControls (touch friendly)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CAMERAS, walkFloorY, WALK_BOUNDS, LOTS, STATION, RIVER_BLOCK, onBridge, BRIDGE } from './layout.js';

const EYE = 1.52;

export function createControls(camera, dom, { onModeChange } = {}) {
  const shots = Object.entries(CAMERAS).map(([id, c]) => ({ id, ...c }));
  let mode = 'shot';
  let shotIndex = 0;
  let shotTime = 0;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const fromPos = new THREE.Vector3();
  const fromLook = new THREE.Vector3();
  let transition = 1;

  const orbit = new OrbitControls(camera, dom);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.maxPolarAngle = Math.PI * 0.495;
  orbit.minDistance = 2;
  orbit.maxDistance = 260;
  orbit.enabled = false;

  const plc = new PointerLockControls(camera, dom);
  plc.pointerSpeed = 0.8;
  const keys = new Set();
  const vel = new THREE.Vector3();
  let walkY = null;

  // ---- touch walk: virtual joystick (left) + drag to look (anywhere else) ----
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const touch = { joyId: null, joyX: 0, joyY: 0, jx: 0, jy: 0, lookId: null, lx: 0, ly: 0 };
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const joy = document.createElement('div');
  joy.id = 'joystick';
  joy.innerHTML = '<i></i>';
  Object.assign(joy.style, {
    position: 'fixed', left: '28px', bottom: '96px', width: '112px', height: '112px', borderRadius: '50%',
    background: 'rgba(255,250,246,0.35)', border: '2px solid rgba(255,255,255,0.7)', display: 'none', zIndex: 11, touchAction: 'none',
  });
  Object.assign(joy.firstChild.style, {
    position: 'absolute', left: '36px', top: '36px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239,143,174,0.85)',
  });
  document.body.appendChild(joy);
  const knob = joy.firstChild;
  joy.addEventListener('pointerdown', (e) => {
    touch.joyId = e.pointerId;
    const r = joy.getBoundingClientRect();
    touch.joyX = r.left + r.width / 2;
    touch.joyY = r.top + r.height / 2;
    joy.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== touch.joyId) return;
    let dx = e.clientX - touch.joyX, dy = e.clientY - touch.joyY;
    const l = Math.hypot(dx, dy), max = 44;
    if (l > max) { dx *= max / l; dy *= max / l; }
    touch.jx = dx / max;
    touch.jy = -dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const joyEnd = (e) => {
    if (e.pointerId !== touch.joyId) return;
    touch.joyId = null; touch.jx = 0; touch.jy = 0;
    knob.style.transform = '';
  };
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);
  dom.addEventListener('pointerdown', (e) => {
    if (mode !== 'walk' || e.pointerType === 'mouse' || touch.lookId !== null) return;
    touch.lookId = e.pointerId; touch.lx = e.clientX; touch.ly = e.clientY;
  });
  dom.addEventListener('pointermove', (e) => {
    if (mode !== 'walk' || e.pointerId !== touch.lookId) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= (e.clientX - touch.lx) * 0.005;
    euler.x = THREE.MathUtils.clamp(euler.x - (e.clientY - touch.ly) * 0.005, -1.35, 1.35);
    camera.quaternion.setFromEuler(euler);
    touch.lx = e.clientX; touch.ly = e.clientY;
  });
  const lookEnd = (e) => { if (e.pointerId === touch.lookId) touch.lookId = null; };
  dom.addEventListener('pointerup', lookEnd);
  dom.addEventListener('pointercancel', lookEnd);

  // colliders: lot footprints + station walls (entrance left open)
  const colliders = [];
  for (const l of LOTS) {
    colliders.push({ cx: l.x, cz: l.z, hw: l.width / 2 + 0.15, hd: l.depth / 2 + 0.15, rot: l.rotY });
  }
  const B = STATION.building;
  const extra = [];
  function addCollider(minX, maxX, minZ, maxZ) { extra.push({ minX, maxX, minZ, maxZ }); }
  // station: back wall toward the platform is open (gates), front wall has the entrance gap
  addCollider(B.xMin, B.xMin + 0.4, B.zMin, B.zMax);
  addCollider(B.xMax - 0.4, B.xMax, B.zMin, B.zMax);
  addCollider(B.xMin, STATION.entrance.x - STATION.entrance.width / 2, B.zMax - 0.4, B.zMax);
  addCollider(STATION.entrance.x + STATION.entrance.width / 2, B.xMax, B.zMax - 0.4, B.zMax);

  function collide(p) {
    const r = 0.35;
    for (const c of colliders) {
      const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
      const dx = p.x - c.cx, dz = p.z - c.cz;
      // world -> local (inverse of rotation used by lots)
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const ox = c.hw + r - Math.abs(lx), oz = c.hd + r - Math.abs(lz);
      if (ox > 0 && oz > 0) {
        let nlx = lx, nlz = lz;
        if (ox < oz) nlx = Math.sign(lx || 1) * (c.hw + r); else nlz = Math.sign(lz || 1) * (c.hd + r);
        p.x = c.cx + nlx * cos + nlz * sin;
        p.z = c.cz - nlx * sin + nlz * cos;
      }
    }
    for (const b of extra) {
      if (p.x > b.minX - r && p.x < b.maxX + r && p.z > b.minZ - r && p.z < b.maxZ + r) {
        const dl = p.x - (b.minX - r), dr = b.maxX + r - p.x, dd = p.z - (b.minZ - r), du = b.maxZ + r - p.z;
        const m = Math.min(dl, dr, dd, du);
        if (m === dl) p.x = b.minX - r; else if (m === dr) p.x = b.maxX + r; else if (m === dd) p.z = b.minZ - r; else p.z = b.maxZ + r;
      }
    }
    // the river can only be crossed on the bridge
    if (p.z < RIVER_BLOCK.zSouth && p.z > RIVER_BLOCK.zNorth && !onBridge(p.x, p.z)) {
      if (Math.abs(p.x - BRIDGE.x) < BRIDGE.halfWidth + 0.6 && p.z < BRIDGE.zSouth && p.z > BRIDGE.zNorth) {
        p.x = BRIDGE.x + Math.sign(p.x - BRIDGE.x) * (BRIDGE.halfWidth - 0.05);
      } else {
        p.z = p.z - RIVER_BLOCK.zNorth < RIVER_BLOCK.zSouth - p.z ? RIVER_BLOCK.zNorth : RIVER_BLOCK.zSouth;
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, WALK_BOUNDS.xMin, WALK_BOUNDS.xMax);
    p.z = THREE.MathUtils.clamp(p.z, WALK_BOUNDS.zMin, WALK_BOUNDS.zMax);
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    keys.add(e.code);
    if (/^Digit[1-9]$/.test(e.code)) {
      const i = Number(e.code.slice(5)) - 1;
      if (i < shots.length) { setMode('shot'); goShot(i); }
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  plc.addEventListener('unlock', () => { if (mode === 'walk') onModeChange?.('walk-paused'); });
  plc.addEventListener('lock', () => { if (mode === 'walk') onModeChange?.('walk'); });

  const shotP = new THREE.Vector3();
  const shotL = new THREE.Vector3();
  const shotDir = new THREE.Vector3();
  const shotOut = [shotP, shotL, 45];
  function applyShot(s, t) {
    // slow drift: dolly forward a little and sway (reuses vectors: runs every frame)
    shotP.fromArray(s.pos);
    shotL.fromArray(s.look);
    shotDir.subVectors(shotL, shotP).normalize();
    const drift = mode === 'tour' ? Math.min(t, 16) * 0.22 : Math.sin(t * 0.12) * 0.35;
    shotP.addScaledVector(shotDir, drift);
    shotP.y += Math.sin(t * 0.5) * 0.015;
    shotL.x += Math.sin(t * 0.21) * 0.25;
    shotOut[2] = s.fov;
    return shotOut;
  }

  function goShot(i, immediate = false) {
    shotIndex = (i + shots.length) % shots.length;
    shotTime = 0;
    fromPos.copy(camera.position);
    camera.getWorldDirection(fromLook);
    fromLook.multiplyScalar(20).add(camera.position);
    transition = immediate ? 1 : 0;
  }

  function setMode(m) {
    if (m === mode) return;
    if (mode === 'walk') plc.unlock();
    mode = m;
    orbit.enabled = m === 'orbit';
    if (m === 'orbit') {
      const d = new THREE.Vector3();
      camera.getWorldDirection(d);
      orbit.target.copy(camera.position).addScaledVector(d, 25);
      orbit.update();
    }
    if (m === 'walk') {
      walkY = null;
      // start on the street at eye height if we're in the air
      if (camera.position.y - walkFloorY(camera.position.x, camera.position.z) > 3) {
        const s = CAMERAS.hero.pos;
        camera.position.set(s[0], s[1], s[2]);
        camera.lookAt(...CAMERAS.hero.look);
      }
      if (!isTouch) plc.lock();
    }
    joy.style.display = m === 'walk' && isTouch ? 'block' : 'none';
    if (m === 'shot' || m === 'tour') goShot(shotIndex);
    onModeChange?.(m);
  }

  function update(dt) {
    dt = Math.min(dt, 0.1);
    if (mode === 'shot' || mode === 'tour') {
      shotTime += dt;
      if (mode === 'tour' && shotTime > 16) goShot(shotIndex + 1, true);
      const [p, l, fov] = applyShot(shots[shotIndex], shotTime);
      if (transition < 1) {
        transition = Math.min(1, transition + dt / 1.6);
        const k = transition * transition * (3 - 2 * transition);
        pos.lerpVectors(fromPos, p, k);
        look.lerpVectors(fromLook, l, k);
      } else {
        pos.copy(p);
        look.copy(l);
      }
      camera.position.copy(pos);
      camera.lookAt(look);
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    } else if (mode === 'orbit') {
      orbit.update();
    } else if (mode === 'walk') {
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const speed = run ? 7.5 : 3.2;
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touch.jy;
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.jx;
      vel.x += (r * speed - vel.x) * Math.min(1, dt * 10);
      vel.z += (f * speed - vel.z) * Math.min(1, dt * 10);
      plc.moveRight(vel.x * dt);
      plc.moveForward(vel.z * dt);
      collide(camera.position);
      const floor = walkFloorY(camera.position.x, camera.position.z) + EYE;
      walkY = walkY === null ? floor : walkY + (floor - walkY) * Math.min(1, dt * 6);
      const bob = Math.hypot(vel.x, vel.z) > 0.5 ? Math.sin(performance.now() * 0.009) * 0.03 : 0;
      camera.position.y = walkY + bob;
      if (Math.abs(camera.fov - 60) > 0.01) { camera.fov += (60 - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    }
  }

  /** Force a fixed camera (for screenshots). */
  function fixed(p, l, fov) {
    mode = 'fixed';
    camera.position.set(...p);
    camera.lookAt(...l);
    if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  goShot(0, true);
  return {
    update, setMode, goShot, fixed, shots,
    get mode() { return mode; },
    get shotIndex() { return shotIndex; },
    addCollider,
    orbit, plc, isTouch,
  };
}
