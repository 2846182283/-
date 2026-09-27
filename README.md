# 桜ヶ丘駅 · 三渲二樱花车站

A cel-shaded ("三渲二") Japanese suburban railway station in spring, built
with **Three.js** and no external art assets. Every building, train, tree,
sign and poster is generated in code, and all text and patterns are painted on
canvases at runtime.

It is a small walkable town at 4 pm on a spring afternoon:
- a station with two platforms, a ticket hall and a square in front;
- a gently curving shopping street;
- a level crossing whose barriers close for real trains;
- a quiet residential side and a river embankment lined with cherry trees;
- thousands of falling sakura petals.

## Run it

```bash
npm install
npm run dev        # open the printed URL (default http://localhost:5173)
npm run build      # static build in dist/ (relative paths; any static host works)
```

A desktop GPU is recommended. A frame renders the scene in three passes: the
shadow map, the outline pre-pass and the main pass. Across those passes the
full scene draws about 3.6–5.2M triangles and 460–880 draw calls, depending on
the view. The shadow map is only re-rendered when it needs to be, trees and
street furniture are culled in chunks, and cherry trees switch detail with
distance. The renderer also lowers its resolution on slower machines to hold
the frame rate, and `?q=low` forces the light preset (see the URL parameters below).

## Controls

| Mode | How |
| --- | --- |
| Shots | Buttons along the bottom, or keys **1–8**: 站前 (key frame), 咖啡店前, 商店街, 站前广场, 道口, 站台, 河堤, 俯瞰 |
| 巡游 (tour) | Cycles through the shots with slow dolly moves |
| 漫游 (walk) | Click to lock the mouse. **WASD** / arrow keys move, **Shift** runs, **Esc** exits. On touch screens use the on-screen joystick and drag to look. You walk on the streets, the square, the station stairs and the platforms. |
| 自由视角 (orbit) | Drag to rotate, scroll to zoom, right-drag to pan |
| 声音 (sound) | Crossing bell, train motor and rail joints, door chime, birds and breeze. All sound is synthesised with WebAudio and stays off until you enable it. |
| **H** | Hide / show the interface |

The trains run a 150-second timetable. The scene opens at t = 104 s, just
before a train arrives over the level crossing:
- **t = 0 s:** the westbound train stands at platform 1 with its doors open.
- **t ≈ 55 s:** the eastbound train arrives at platform 2.
- **t ≈ 116 s:** a westbound train rolls slowly over the level crossing with the barriers down.

## What's in the scene

- **Station (桜ヶ丘駅):** cream-walled building with a metal roof and a name board.
  - Ticket hall: ticket machines, fare chart and route map, automatic gates plus a staffed booth, posters, clocks, and a station-stamp table.
  - Platforms: two facing platforms with yellow tactile edges, door-position marks, canopies, station name boards, benches and railings.
  - A small level crossing at the west end of the platforms links the two platforms.
- **Railway:**
  - Track: ballast with loose stones, concrete and old wooden sleepers, rails with a polished running strip, fishplates and bolts, and a crossover.
  - Overhead power: catenary masts and portals with cantilevers and zig-zag contact wires.
  - Lineside: signals that react to the trains, kilometre posts, cable troughs, fences and weeds.
- **Trains:** two cream-and-pink 3-car commuter trains with destination displays, lit headlights, sliding doors, visible bogies, a pantograph, and interiors with seats, hanging straps and passengers.
- **Level crossing (踏切):** crossing panels, alternately flashing lamps, direction arrows, striped barrier arms that lower and rise, and a bell.
- **Shopping street:**
  - Showa-era shops: a café, flower shop, bookstore, bicycle shop, convenience store, wagashi shop, general store, ramen shop and tobacco kiosk.
  - Shop fronts: shop curtains (noren), awnings, lanterns, and interiors visible through the glass.
- **Houses:** 118 procedurally varied homes.
  - Tiled or metal roofs, sliding windows with curtains, porches and name plates.
  - Balconies with laundry blowing in the wind.
  - Block walls, hedges, potted plants, and AC units, meters and antennas.
- **Streets:** faded asphalt with patches and cracks, Japanese road markings such as 止まれ and 通学路, gutters with grates, manholes, tactile paving and the station-square tiles.
- **Street furniture:**
  - Utility poles with transformers, street lights and dense sagging wires, plus convex traffic mirrors and road signs.
  - Six vending machines, parked bicycles and cars, a small shrine and a jizo statue.
- **Sakura:** 170+ procedural cherry trees.
  - Blossom masses in several pink tones, with visible branches and new leaves.
  - Wind sway and dappled shadows.
  - Falling petals that drift and swirl, lift in the train's wake, gather in drifts and float on the river.
- **People and animals:** station staff, students, a girl waiting at the crossing with her bicycle, a reader on a platform bench, the café clerk, cats on walls and roofs, and sparrows on the wires.
- **Distance and sky:** a river embankment, a hillside town, three rings of hazy mountains, drifting clouds, and a gradient sky with a warm sun glow.

## How it's built

```
src/core/layout.js     master plan: coordinates of everything (tracks, lots, trees, poles, reserved spots, cameras)
src/core/toon.js       cel-shading materials: banded lighting, blue-violet shadows, rim light, stepped specular, stylised glass
src/core/postfx.js     outline pass (depth Laplacian of 1/z + normal edges, distance-faded, tinted), bloom, colour grade, FXAA
src/core/lighting.js   16:00 sun behind-left of the key view + sky/ground hemisphere fill; shadow frustum follows the camera
src/core/geom.js       merge-by-material batching, instancing helpers, roofs, sagging wires
src/core/canvasTex.js  canvas signage (horizontal and vertical Japanese text), noise
src/world/*.js         one module per part of the world (terrain, railway, station, train, crossing, houses, shops, poles, props, sakura, people, sky)
```

Each world module exports `build(ctx)`. It reads positions from `layout.js`,
builds with the shared toon materials, and merges its static meshes by
material so the whole town renders in a few hundred draw calls. Modules talk
to each other only through `ctx.sim`: for example, the train publishes its
positions, the crossing and signals react to them, and the petals swirl in
the trains' wake. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Useful URL parameters

| Parameter | Effect |
| --- | --- |
| `?view=hero\|cafe\|street\|plaza\|crossing\|platform\|levee\|aerial` | Start on a shot |
| `?mode=tour\|walk\|orbit` | Start in a camera mode |
| `?t=116` | Start the timetable at a given second (default 104) |
| `?pause=1` | Freeze time |
| `?q=low` | Light preset: smaller shadow map, no MSAA or bloom |
| `?only=station,train` | Build only some modules |
| `?fx=0` | Outlines off |
| `?fonts=0` | Skip the Google Fonts request; signage uses local Japanese fonts |
| `?sun=az,el` | Move the sun (degrees) |
| `?debug=layout` | Show the layout plan's footprints |

### Screenshots (headless)

```bash
node scripts/shot.mjs --params "view=hero" --out shots/hero.png
```

This renders with Playwright Chromium using software WebGL, prints draw calls,
triangle counts and per-module build times, and fails if any module throws.
It needs a Chromium build for Playwright (`npx playwright install chromium`).
Use `--batch file.json` to render several views in one run.
