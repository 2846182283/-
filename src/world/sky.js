/**
 * Sky, clouds, distant mountains and the far-away town.
 *
 * - gradient sky dome with a warm glow around the low afternoon sun
 * - thin wind-stretched clouds (canvas-painted, toon-stepped: white tops,
 *   lilac undersides) that drift slowly, plus a soft cumulus bank on the horizon
 * - three rings of mountain silhouettes, each paler/bluer with distance
 * - instanced far houses on the northern hillside and around the horizon
 */
import * as THREE from 'three';
import { groundY, TERRAIN, makeRng, WALK_BOUNDS } from '../core/layout.js';
import { drawTexture, seeded } from '../core/canvasTex.js';

const SKY_R = 2200;

function skyDome(sunDir) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: new THREE.Color('#5f9be0') },
      mid: { value: new THREE.Color('#9cc5ef') },
      horizon: { value: new THREE.Color('#e9f0f6') },
      below: { value: new THREE.Color('#dfe6ee') },
      sunDir: { value: sunDir },
      sunColor: { value: new THREE.Color('#fff0d8') },
      glowColor: { value: new THREE.Color('#ffe3c4') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize( position );
        vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith; uniform vec3 mid; uniform vec3 horizon; uniform vec3 below;
      uniform vec3 sunDir; uniform vec3 sunColor; uniform vec3 glowColor;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize( vDir );
        float h = d.y;
        vec3 col;
        if ( h < 0.0 ) col = mix( horizon, below, smoothstep( 0.0, 0.15, -h ) );
        else {
          col = mix( horizon, mid, smoothstep( 0.0, 0.22, h ) );
          col = mix( col, zenith, smoothstep( 0.18, 0.85, h ) );
        }
        float s = max( dot( d, normalize( sunDir ) ), 0.0 );
        // soft wide glow + tighter halo; the disc itself is hidden behind scenery / kept subtle
        col += glowColor * ( pow( s, 6.0 ) * 0.35 + pow( s, 60.0 ) * 0.45 );
        col = mix( col, sunColor * 1.6, smoothstep( 0.9993, 0.9996, s ) );
        // warm the horizon on the sun side
        float side = max( dot( normalize( vec3( d.x, 0.0, d.z ) ), normalize( vec3( sunDir.x, 0.0, sunDir.z ) ) ), 0.0 );
        col = mix( col, col * vec3( 1.04, 1.0, 0.95 ), side * ( 1.0 - smoothstep( 0.0, 0.3, abs( h ) ) ) );
        gl_FragColor = vec4( col, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 48, 24), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  mesh.userData.noOutline = true;
  return mesh;
}

/** Paint one wispy, wind-stretched cloud onto a canvas. */
function cloudTexture(seed, kind) {
  const rnd = seeded(seed);
  const W = 1024, H = kind === 'wisp' ? 256 : 512;
  return drawTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    const blobs = [];
    if (kind === 'wisp') {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = W * (0.08 + 0.84 * t) + (rnd() - 0.5) * 60;
        const y = H * (0.55 + Math.sin(t * Math.PI * (1 + rnd())) * 0.12) + (rnd() - 0.5) * 30;
        const rx = 70 + rnd() * 120 * Math.sin(t * Math.PI) + 30;
        const ry = 18 + rnd() * 26 * Math.sin(t * Math.PI) + 8;
        blobs.push([x, y, rx, ry]);
      }
    } else {
      const n = 22;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = W * (0.1 + 0.8 * t) + (rnd() - 0.5) * 50;
        const hump = Math.sin(t * Math.PI);
        const y = H * (0.78 - hump * (0.25 + rnd() * 0.25));
        const r = 50 + hump * (70 + rnd() * 60);
        blobs.push([x, y, r * 1.2, r]);
      }
    }
    // underside (lilac) layer, then lit layer offset upward -> stepped toon look
    const layer = (color, dy, shrink, alpha) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (const [x, y, rx, ry] of blobs) {
        ctx.beginPath();
        ctx.ellipse(x, y + dy, Math.max(4, rx * shrink), Math.max(3, ry * shrink), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    ctx.filter = 'blur(10px)';
    layer('#d9dbf0', 6, 1.0, 0.85);
    ctx.filter = 'blur(6px)';
    layer('#ffffff', -4, 0.86, 0.95);
    ctx.filter = 'blur(3px)';
    layer('#fffaf4', -10, 0.55, 0.9);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    // fade the long ends so they dissolve into the sky
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.18, 'rgba(0,0,0,1)');
    g.addColorStop(0.82, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }, { mipmaps: true });
}

function clouds(ctx) {
  const group = new THREE.Group();
  group.name = 'clouds';
  const rng = makeRng(77);
  const items = [];
  const specs = [];
  // thin high wisps across the sky (more toward the view direction = north)
  for (let i = 0; i < 16; i++) specs.push({ kind: 'wisp', az: -Math.PI / 2 + (rng() - 0.5) * Math.PI * 1.6, el: 0.12 + rng() * 0.42, w: 700 + rng() * 700, seed: 100 + i });
  // soft cumulus bank low on the horizon
  for (let i = 0; i < 9; i++) specs.push({ kind: 'cumulus', az: rng() * Math.PI * 2, el: 0.035 + rng() * 0.03, w: 600 + rng() * 500, seed: 300 + i });
  const texCache = new Map();
  for (const s of specs) {
    const key = `${s.kind}${s.seed % 6}`;
    if (!texCache.has(key)) texCache.set(key, cloudTexture(s.seed % 6 + (s.kind === 'wisp' ? 0 : 50), s.kind));
    const tex = texCache.get(key);
    const aspect = s.kind === 'wisp' ? 4 : 2;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: s.kind === 'wisp' ? 0.75 + rng() * 0.25 : 0.95 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.w / aspect), mat);
    m.userData.noOutline = true;
    m.renderOrder = -9;
    m.frustumCulled = false;
    items.push({ m, ...s, drift: (rng() - 0.5) * 0.004 + 0.003 });
    group.add(m);
  }
  const R = SKY_R * 0.8;
  const dir = new THREE.Vector3();
  const place = (it) => {
    dir.set(Math.cos(it.el) * Math.cos(it.az), Math.sin(it.el), Math.cos(it.el) * Math.sin(it.az));
    it.m.position.copy(dir).multiplyScalar(R);
    it.m.lookAt(0, it.m.position.y * 0.2, 0);
  };
  items.forEach(place);
  ctx.onUpdate((dt) => {
    for (const it of items) {
      it.az += it.drift * dt * (0.5 + ctx.sim.wind.strength);
      place(it);
    }
    group.position.copy(ctx.camera.position);
    group.position.y = 0;
  });
  return group;
}

function mountains() {
  const group = new THREE.Group();
  group.name = 'mountains';
  const rings = [
    { r: 1500, base: -20, h: 260, color: '#b7c9da', freq: 5, seed: 3 },
    { r: 1100, base: -10, h: 170, color: '#a3bccf', freq: 8, seed: 7 },
    { r: 760, base: -5, h: 95, color: '#98b4b8', freq: 13, seed: 11 },
  ];
  for (const ring of rings) {
    const rnd = seeded(ring.seed);
    const N = 360;
    const phases = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    const pos = [];
    const col = [];
    const idx = [];
    const top = new THREE.Color(ring.color);
    const bottom = new THREE.Color('#e3eaf1');
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      // higher mountains behind the station (north, a = -PI/2), lower to the south
      const northness = 0.5 + 0.5 * -Math.sin(a);
      let hgt = 0.35 + 0.65 * northness;
      hgt *= 0.55 + 0.25 * Math.sin(a * ring.freq + phases[0]) + 0.15 * Math.sin(a * ring.freq * 2.3 + phases[1]) + 0.08 * Math.sin(a * ring.freq * 5.1 + phases[2]);
      hgt = Math.max(0.08, hgt);
      const x = Math.cos(a) * ring.r, z = Math.sin(a) * ring.r;
      pos.push(x, ring.base - 30, z, x, ring.base + hgt * ring.h, z);
      col.push(bottom.r, bottom.g, bottom.b, top.r, top.g, top.b);
      if (i < N) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.userData.noOutline = true;
    m.renderOrder = -8;
    m.frustumCulled = false;
    group.add(m);
  }
  return group;
}

/** Wall texture for distant houses: near-white plaster (tinted per instance) with window rows. */
function farWallTexture(rows) {
  return drawTexture(256, 256, (ctx, W, H) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // faint base band + eave shadow
    ctx.fillStyle = 'rgba(120,120,140,0.18)';
    ctx.fillRect(0, H - 14, W, 14);
    ctx.fillStyle = 'rgba(90,90,120,0.22)';
    ctx.fillRect(0, 0, W, 10);
    const rowH = (H - 30) / rows;
    for (let r = 0; r < rows; r++) {
      const y = 16 + r * rowH + rowH * 0.22;
      const h = rowH * 0.42;
      const n = rows > 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        if (rows <= 2 && (i + r) % 3 === 2) continue; // irregular houses
        const w = (W / n) * 0.52;
        const x = (W / n) * (i + 0.24);
        ctx.fillStyle = '#6f84a3';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + w * 0.08, y + h * 0.1, w * 0.18, h * 0.8);
        if (rows > 2) { ctx.fillStyle = 'rgba(80,80,100,0.35)'; ctx.fillRect(x - 3, y + h, w + 6, 4); } // balcony line
      }
    }
  }, { mipmaps: true });
}

/** Triangular gable prism (unit: base 1x1 at y=0, ridge along X at y=1). */
function gablePrism() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2); // extrusion now along X, triangle in the ZY plane
  return g;
}

/**
 * Instanced far-away town: small houses in lanes on the hillside north of the
 * river plus a ring beyond the walkable area, a few apartment blocks.  Pastel,
 * no outlines, cheap (4 draw calls).
 */
function farTown(ctx) {
  const rng = makeRng(2024);
  const body = new THREE.BoxGeometry(1, 1, 1);
  body.translate(0, 0.5, 0);
  const roof = gablePrism();
  const houses = [];
  const roofs = [];
  const blocks = [];
  const wallCols = ['#f4efe6', '#ece3d3', '#e9edf1', '#f1e7dc', '#e2e9ee', '#f6f2ea', '#efe1d6', '#e6ecdf'];
  const roofCols = ['#5d6672', '#56677a', '#6a5a50', '#4f6b5e', '#7b6f6a', '#687a8e', '#8a5a4c', '#4d5a6b'];
  const addHouse = (x, z, s = 1, ry = 0) => {
    const y = groundY(x, z);
    const w = (7 + rng() * 3) * s, d = (6 + rng() * 2.5) * s, h = (rng() < 0.18 ? 3.1 : 5.7) * s;
    ry += (rng() - 0.5) * 0.25 + (rng() < 0.35 ? Math.PI / 2 : 0);
    houses.push({ x, y: y - 0.3, z, ry, sx: w, sy: h + 0.3, sz: d, color: rng.pick(wallCols) });
    roofs.push({ x, y: y + h - 0.05, z, ry, sx: w * 1.12, sy: d * 0.36, sz: d * 1.18, color: rng.pick(roofCols) });
  };
  const addBlock = (x, z) => {
    const y = groundY(x, z);
    const floors = 3 + Math.floor(rng() * 3);
    blocks.push({ x, y: y - 0.3, z, ry: (rng() - 0.5) * 0.2, sx: 22 + rng() * 14, sy: floors * 2.9 + 0.3, sz: 9 + rng() * 3, color: rng.pick(['#f3f1ec', '#ece8e0', '#e8ecef']) });
  };
  // hillside north of the river: lanes that follow the contour (houses on both sides)
  for (let lane = 0; lane < 14; lane++) {
    const z0 = TERRAIN.farLeveeTopNorth - 14 - lane * 22 - rng() * 6;
    for (let x = -430; x < 430; x += 11 + rng() * 7) {
      if (rng() < 0.12 + Math.abs(x) / 1400) continue;
      const wob = Math.sin(x * 0.012 + lane) * 6;
      addHouse(x, z0 + wob + (rng() < 0.5 ? -6 : 6), 0.95 + rng() * 0.2);
    }
    if (lane % 3 === 1) for (let k = 0; k < 3; k++) addBlock(-300 + rng() * 600, z0 - 3);
  }
  // east / west / south outskirts beyond the walkable area
  for (let i = 0; i < 620; i++) {
    const a = rng() * Math.PI * 2;
    const r = 175 + rng() * 260;
    const x = Math.cos(a) * r, z = 40 + Math.sin(a) * r * 0.9;
    if (z < -60) continue; // north is the river / hillside
    if (x > WALK_BOUNDS.xMin - 15 && x < WALK_BOUNDS.xMax + 15 && z > -60 && z < WALK_BOUNDS.zMax + 20) continue;
    addHouse(x, z, 0.95 + rng() * 0.2, Math.round(a / (Math.PI / 2)) * (Math.PI / 2));
    if (rng() < 0.03) addBlock(x + 20, z + 10);
  }
  const toon = ctx.toon;
  const mk = (geo, mat, list) => {
    const im = ctx.geom.instanced(geo, mat, list.map((t) => ({ x: t.x, y: t.y, z: t.z, ry: t.ry, sx: t.sx, sy: t.sy, sz: t.sz })), { castShadow: false, noOutline: true });
    list.forEach((t, i) => im.setColorAt(i, new THREE.Color(t.color)));
    im.instanceColor.needsUpdate = true;
    return im;
  };
  const group = new THREE.Group();
  group.name = 'farTown';
  group.add(
    mk(body, toon.mat('#ffffff', { map: farWallTexture(2), name: 'farHouseWall' }), houses),
    mk(roof, toon.mat('#ffffff', { name: 'farHouseRoof' }), roofs),
    mk(body, toon.mat('#ffffff', { map: farWallTexture(4), name: 'farBlockWall' }), blocks),
  );
  return group;
}

export default async function build(ctx) {
  const group = new THREE.Group();
  group.name = 'sky';
  const sky = skyDome(ctx.sunDir);
  group.add(sky);
  ctx.onUpdate(() => sky.position.copy(ctx.camera.position));
  group.add(clouds(ctx));
  group.add(mountains());
  group.add(farTown(ctx));
  ctx.scene.background = null;
  return group;
}
