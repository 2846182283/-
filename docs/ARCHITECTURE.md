# 桜ヶ丘駅 — architecture & module contract

A cel-shaded ("三渲二") Japanese suburban sakura station built with plain
Three.js (r186) + Vite. **No external assets**: every mesh is procedural and
every texture is drawn on a canvas at runtime.

```
index.html            loading screen + UI shell
src/main.js           builds modules in order, UI, URL params
src/core/
  layout.js           MASTER PLAN — coordinates of everything (read this first)
  toon.js             cel-shading material factory (+ glass, metal, unlit)
  geom.js             bakeStatic (merge by material), primitives, wires, instancing
  canvasTex.js        canvas textures: Japanese signage, vertical text, noise
  palette.js          shared colours
  sim.js              shared simulation state (time, wind, trains, crossing)
  lighting.js         sun (16:00, behind-left of the hero view) + hemisphere fill
  postfx.js           outline (depth/normal edges) + bloom + grade + FXAA
  controls.js         shot / tour / walk (pointer lock) / orbit cameras
  audio.js            WebAudio hub (off until the user enables sound)
src/world/<module>.js one file (plus optional folder src/world/<module>/) per module
scripts/shot.mjs      headless screenshot tool (software WebGL)
```

## Coordinates

Metres, Y up. **North = −Z** (railway, station), **south = +Z** (shopping
street, hero camera), **east = +X**. The main street is a gentle S-curve
running south from the station-front road (z = 7.5) and climbs ~3 m.
Always place things with `layout.groundY(x, z)`; the railway corridor, plaza
and station area are flat at y = 0. Key heights: rail top 0.45, platform /
train floor 1.55, contact wire 5.3.

Everything positional lives in `src/core/layout.js`: tracks, platforms,
station building box, plaza furniture spots, roads & markings, **lots**
(building plots with type/size/orientation), **trees**, **pole lines**,
reserved **SPOTS** (vending machines, bicycles, vehicles, mirrors, signs,
people hints) and **CAMERAS**. If two modules need to agree on a position, it
belongs in layout.js. Modules must not place objects inside space that layout
assigns to another module (lots → houses/shops, trees → sakura, poles → poles,
SPOTS.vending/bicycles/vehicles → props, SPOTS.people → people, …).

### Lot convention

`lot = { id, type, x, z, y, rotY, width, depth, floors, setback, front, toWorld(lx, lz), drop, corners, gardenTree?, simple? }`

Build the building in a local group whose **front faces +Z**, footprint
centred on the origin (width along X, depth along Z, front wall at
z = +depth/2), then `group.position.set(lot.x, lot.y, lot.z); group.rotation.y = lot.rotY`.
The strip between the lot front and the road gutter (≈ `setback` metres) is
the lot's apron (plants, signboards, crates, gates). `gardenTree` means a
sakura stands at that world position: keep ~2.5 m clear. `simple` lots are
back-row filler and can use cheaper geometry.

## Module contract

```js
// src/world/<module>.js
import * as THREE from 'three';
export default async function build(ctx) {
  const root = new THREE.Group();
  root.name = '<module>';
  // ... build ...
  ctx.onUpdate((dt, t) => { /* animation; dt = scaled sim seconds */ });
  return root;             // main.js adds it to the scene
}
```

`ctx` provides: `THREE, scene, camera, renderer, layout, toon, geom, tex,
palette, sim, audio, quality ('high'|'low'), params (URLSearchParams),
sunDir, rng(seed), onUpdate(fn), addCollider(minX,maxX,minZ,maxZ)`.

Rules:

1. **Only edit your own files** (`src/world/<module>.js`, `src/world/<module>/**`).
   Need a core change? Describe it in your final report instead.
2. **Materials from `ctx.toon`** (`mat`, `metal`, `unlit`, `glass`, `shade`) so
   everything shares the cel look. Reuse materials (they are cached by
   parameters) — that is what makes batching work.
3. **Batch static geometry**: build naturally, then `ctx.geom.bakeStatic(group)`
   (merges all static meshes per material). Use `ctx.geom.instanced(...)` for
   many repeats (sleepers, ballast, petals, bushes, windows). Keep animated
   parts separate and mark them `userData.dynamic = true` before baking.
4. **Outlines** come from a post-process on everything except objects with
   `userData.noOutline = true`. Set it on: decals / text planes, glass,
   wires & cables, particles, foliage cards with alpha, tiny details that
   would turn into black blobs at distance, emissive lamp faces.
5. **Shadows**: `castShadow` on solid things taller than ~0.3 m;
   `receiveShadow` on almost everything. Tiny parts should not cast.
6. **Text** on canvas via `ctx.tex` (`signTexture`, `fitText`, `verticalText`,
   `drawTexture`); fonts: `ctx.tex.FONTS.round | gothic | mincho`. Japanese
   text should be plausible and use the fictional names in layout.js
   (春風電鉄 / 春風線 / 桜ヶ丘駅 / shop names). Never use real brands.
7. **Determinism**: use `ctx.rng(seed)` / `layout.hashString`, not Math.random,
   for placement (so screenshots are reproducible).
8. **Budget** (main pass, your module alone via `?only=<module>` incl. ~10 calls
   for the sky): see the per-module numbers in your task. Prefer fewer, merged
   meshes; avoid per-object materials; canvas textures ≤ 1024 px (a few 2048
   atlases are fine).
9. **Style**: pastel, clean, simplified-but-believable anime film look.
   Shadows are blue-violet (automatic). Accent colours are small. Give hard
   edges a tiny bevel / chamfer or separate trim pieces so outlines read.
   Avoid photographic noise; hand-painted variation only.
10. Walk mode: players can walk anywhere in `WALK_BOUNDS`, on platforms
    (walkFloorY) and through the station entrance, so avoid invisible gaps and
    back faces that look broken from street level.

## Simulation contract

- `train.js` writes `sim.trains` every frame and `sim.crossing.active`
  (true from ~12 s before a train reaches the crossing until its tail clears).
- `crossing.js` reads `sim.crossing.active` and animates barriers, lamps, bell.
- `sim.wind` (dir, strength, gust) drives petals, foliage sway, flags, noren.
  `toonWind` / `toonTime` uniforms are available in `vertexPatch` shaders.
- Sound: `ctx.audio.onReady(a => …)` then drive gains in `onUpdate`; audio is
  off until the user clicks 声音.

## Testing

```
node scripts/shot.mjs --params "only=<module>&view=hero" --out .shots/<module>/hero.png
node scripts/shot.mjs --params "only=terrain,<module>&cam=x,y,z&look=x,y,z" --out .shots/<module>/a.png
node scripts/shot.mjs --batch .shots/<module>/batch.json    # [{ "params": "...", "out": "..." }]
```

`view` presets: hero, plaza, crossing, platform, levee, aerial. `t=<seconds>`
sets the simulation time (the tool pauses time by default). `debug=layout`
overlays footprints. The tool prints draw calls / triangles / build times and
console errors; a module that throws is reported as `MODULE ERROR`. Software
rendering is slow (~1 min per shot); batch several views per run.
`npm run build` must pass.
