/**
 * terrain/ground — the base height-field over TERRAIN.extentX/Z.
 *
 * One tensor-product grid with graded spacing: ~2 m in the town, 0.7 m
 * across the levee / river band (so the slopes are smooth), coarsening to
 * ~14 m at the extents.  Region colours are baked into vertex colours and a
 * small splat attribute (x = soil weight, y = flower weight) drives a toon
 * material patched with a detail shader:
 *   - grass blade strokes / soil speckle from one linear 3-channel texture
 *   - large-scale macro variation (breaks up tiling)
 *   - clover / dandelion / violet overlay on the levees
 * The ground mesh is not baked (bakeStatic would drop the splat attribute).
 */
import * as THREE from 'three';
import { TERRAIN, RAIL, PLAZA, groundY, smoothstep, clamp, lerp } from '../../core/layout.js';
import { fbm, vnoise, hash2, lin, mixLin, onRoad, inPlaza } from './common.js';

const T = TERRAIN;

// palette (linear) ---------------------------------------------------------
const C = {
  grass: lin('#a6c682'),
  grassFresh: lin('#b3d38c'),
  grassDark: lin('#8cb070'),
  grassDry: lin('#bcc28e'),
  soil: lin('#b4a791'),
  soilDark: lin('#a09280'),
  gravel: lin('#bcb6a9'),
  corridor: lin('#aaa296'),
  corridorBrown: lin('#a48f7c'),
  riverbed: lin('#98a293'),
  fieldGreen: lin('#a4c77e'),
  fieldPale: lin('#c8d79c'),
  fieldYellow: lin('#e9d765'),
  fieldSoil: lin('#bba07c'),
  fieldTea: lin('#7ea06a'),
  fieldPink: lin('#e8c6cf'),
};

/** Graded 1D sample positions between lo and hi.  spacing(v) gives the local step. */
function gradedLines(lo, hi, spacing, breaks = []) {
  const out = [];
  let v = lo;
  while (v < hi) {
    out.push(v);
    v += spacing(v);
  }
  out.push(hi);
  for (const b of breaks) out.push(b);
  out.sort((a, b) => a - b);
  const clean = [out[0]];
  for (let i = 1; i < out.length; i++) if (out[i] - clean[clean.length - 1] > 0.12) clean.push(out[i]);
  return clean;
}

/** Field patchwork (hillside and outskirts). */
function fieldColor(x, z, seed) {
  const a = 0.35;
  const u = x * Math.cos(a) + z * Math.sin(a), v = -x * Math.sin(a) + z * Math.cos(a);
  const cu = Math.floor(u / 28), cv = Math.floor(v / 17);
  const h = hash2(cu, cv, seed);
  let c;
  if (h < 0.34) c = C.fieldGreen;
  else if (h < 0.52) c = C.fieldPale;
  else if (h < 0.62) c = C.fieldYellow; // nanohana (rape blossom) — a spring accent
  else if (h < 0.76) c = C.fieldSoil;
  else if (h < 0.9) c = C.fieldTea;
  else c = C.grassDry;
  const n = fbm(x * 0.03, z * 0.03, seed + 5, 2);
  return mixLin(c, C.grassDark, (n - 0.5) * 0.5 + 0.1);
}

/**
 * Colour + splat weights for a ground point.
 * Returns [r, g, b, soil, flower].
 */
function groundLook(x, z) {
  const n1 = fbm(x * 0.06, z * 0.06, 3, 3);
  const n2 = vnoise(x * 0.35, z * 0.35, 9);
  let c, soil = 0, flower = 0;

  const farOut = Math.max(0, Math.abs(x) - 150, z - 175);
  if (z < T.farLeveeTopNorth - 3) {
    // northern hillside: patchwork of fields
    c = fieldColor(x, z, 21);
    soil = 0.2;
    // blend the first metres behind the far levee into grass
    const t = smoothstep(T.farLeveeTopNorth - 3, T.farLeveeTopNorth - 14, z);
    c = mixLin(C.grass, c, t);
  } else if (z < T.riverNorthBank + 0.5) {
    // far levee: grass, slightly paler on the crest
    c = mixLin(C.grass, C.grassFresh, n1);
    flower = 0.55;
  } else if (z < T.riverSouthBank - 0.5) {
    // riverbed (mostly under water): grey-green pebbles
    c = mixLin(C.riverbed, C.soilDark, n2 * 0.4);
    soil = 1;
  } else if (z < T.leveeSouthFoot + 0.6) {
    // south levee: lush grass with flowers, a bit darker at the foot of the slopes
    c = mixLin(C.grassFresh, C.grass, n1);
    const y = groundY(x, z);
    c = mixLin(C.grassDark, c, clamp(0.55 + y / T.leveeHeight * 0.6, 0, 1));
    flower = 0.9;
    if (Math.abs(x) > 230) flower = 0.4;
  } else if (z < -49.9) {
    // north residential backs: gardens (mostly grass, some soil)
    const g = smoothstep(0.18, 0.36, fbm(x * 0.14, z * 0.14, 14, 3));
    c = mixLin(C.soil, C.grass, g);
    soil = 1 - g;
    flower = 0.2 * g;
  } else if (z < RAIL.corridor.zMin) {
    // verge between the north road and the railway fence: weedy grass
    c = mixLin(C.grassDark, C.grassDry, n2);
    flower = 0.3;
  } else if (z < RAIL.corridor.zMax) {
    // railway corridor: compacted grey-brown gravel, weedy along the fences
    c = mixLin(C.corridor, C.corridorBrown, smoothstep(0.35, 0.8, n1));
    soil = 1;
    const edge = Math.min(z - RAIL.corridor.zMin, RAIL.corridor.zMax - z);
    const weedy = 1 - smoothstep(0.4, 1.6, edge);
    c = mixLin(c, C.grassDry, weedy * 0.8);
    soil = 1 - weedy * 0.7;
  } else if (inPlaza(x, z, 0.5) || onRoad(x, z, 0.6)) {
    c = C.soil;
    soil = 1;
  } else {
    // town ground between buildings: short grass with small worn-soil patches
    // (high-frequency so they read as footpaths / bare spots, not camouflage)
    const nt = fbm(x * 0.16, z * 0.16, 12, 3);
    const g = smoothstep(0.15, 0.32, nt);
    const bare = smoothstep(0.6, 0.72, fbm(x * 0.32, z * 0.32, 13, 2)) * 0.5;
    const grassC = mixLin(mixLin(C.grass, C.grassFresh, n1 * 0.7), C.grassDry, n2 * 0.45);
    c = mixLin(C.soil, grassC, g * (1 - bare));
    soil = 1 - g * (1 - bare) * 0.9;
    flower = 0.3 * g * (1 - bare);
  }
  if (farOut > 0 && z > T.farLeveeTopNorth) {
    const t = smoothstep(0, 40, farOut);
    c = mixLin(c, fieldColor(x, z, 37), t);
    soil = lerp(soil, 0.2, t);
    flower = lerp(flower, 0, t);
  }
  return [c[0], c[1], c[2], soil, flower];
}

// ---------------------------------------------------------------------------
// shader patch (detail + overlay)
// ---------------------------------------------------------------------------
function groundShader(detail, flowers) {
  return (shader) => {
    shader.uniforms.tDetail = { value: detail };
    shader.uniforms.tFlowers = { value: flowers };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 splat;\nvarying vec2 vSplat;\nvarying vec3 vGWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvGWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tDetail;\nuniform sampler2D tFlowers;\nvarying vec2 vSplat;\nvarying vec3 vGWorld;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 wp = vGWorld.xz;
        float grassD = texture2D( tDetail, wp * 0.27 ).r;
        float grassD2 = texture2D( tDetail, wp * 0.071 + 0.31 ).r;
        float soilD = texture2D( tDetail, wp * 0.36 ).g;
        float macro = texture2D( tDetail, wp * 0.0123 ).b;
        float macro2 = texture2D( tDetail, wp * 0.0037 + 0.5 ).b;
        float det = mix( grassD * 0.6 + grassD2 * 0.4, soilD, vSplat.x ) * 1.275;
        det *= 0.82 + 0.36 * ( macro * 0.6 + macro2 * 0.4 );
        diffuseColor.rgb *= det;
        vec4 fl = texture2D( tFlowers, wp * 0.17 );
        float fm = clamp( fl.a * vSplat.y * smoothstep( 0.45, 0.7, macro ) * 1.3, 0.0, 1.0 );
        diffuseColor.rgb = mix( diffuseColor.rgb, fl.rgb, fm );
      }`);
  };
}

export function buildGround(ctx, tex) {
  const xs = gradedLines(T.extentX[0], T.extentX[1], (x) => {
    const d = x < -150 ? -150 - x : x > 160 ? x - 160 : 0;
    return 2 + Math.min(14, d * 0.1);
  }, [PLAZA.xMin, PLAZA.xMax]);
  const zs = gradedLines(T.extentZ[0], T.extentZ[1], (z) => {
    if (z > -106 && z < -60) return 0.8;
    if (z <= -106) return 2.5 + Math.min(14, (-106 - z) * 0.08);
    if (z > 180) return 2.5 + Math.min(10, (z - 180) * 0.08);
    return z > -60 ? 2.0 : 2.5;
  }, [RAIL.corridor.zMin, RAIL.corridor.zMax, T.leveeSouthFoot, T.leveeTopSouth, T.leveeTopNorth, T.riverSouthBank, T.riverNorthBank, T.farLeveeTopSouth, T.farLeveeTopNorth]);

  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const spl = new Float32Array(nx * nz * 2);
  const uv = new Float32Array(nx * nz * 2);
  let k = 0;
  for (let j = 0; j < nz; j++) {
    const z = zs[j];
    for (let i = 0; i < nx; i++) {
      const x = xs[i];
      pos[k * 3] = x;
      pos[k * 3 + 1] = groundY(x, z);
      pos[k * 3 + 2] = z;
      const L = groundLook(x, z);
      col[k * 3] = L[0];
      col[k * 3 + 1] = L[1];
      col[k * 3 + 2] = L[2];
      spl[k * 2] = L[3];
      spl[k * 2 + 1] = L[4];
      uv[k * 2] = x * 0.25;
      uv[k * 2 + 1] = z * 0.25;
      k++;
    }
  }
  // shared vertex attributes; normals from the whole grid so chunk seams stay smooth
  const attrs = {
    position: new THREE.BufferAttribute(pos, 3),
    color: new THREE.BufferAttribute(col, 3),
    splat: new THREE.BufferAttribute(spl, 2),
    uv: new THREE.BufferAttribute(uv, 2),
  };
  const full = new THREE.BufferGeometry();
  for (const [n, a] of Object.entries(attrs)) full.setAttribute(n, a);
  full.setIndex(new THREE.BufferAttribute(gridIndex(nx, 0, nx - 1, 0, nz - 1), 1));
  full.computeVertexNormals();
  const normal = full.getAttribute('normal');

  // Chunks (3 x 3 blocks of cells) share the attributes but have their own index and
  // bounding sphere, so frustum culling skips the ground behind / beside the camera.
  const iCuts = [0, ...[-70, 30].map((c) => nearestIndex(xs, c)), nx - 1];
  const jCuts = [0, ...[-58, 30].map((c) => nearestIndex(zs, c)), nz - 1];
  const group = new THREE.Group();
  group.name = 'terrain:groundChunks';
  const mat = ctx.toon.mat('#ffffff', {
    vertexColors: true,
    onShader: groundShader(tex.detail, tex.flowers),
    onShaderKey: 'terrainGround',
    name: 'terrainGround',
  });
  for (let a = 0; a < iCuts.length - 1; a++) {
    for (let b = 0; b < jCuts.length - 1; b++) {
      const g = new THREE.BufferGeometry();
      for (const [n, at] of Object.entries(attrs)) g.setAttribute(n, at);
      g.setAttribute('normal', normal);
      g.setIndex(new THREE.BufferAttribute(gridIndex(nx, iCuts[a], iCuts[a + 1], jCuts[b], jCuts[b + 1]), 1));
      g.boundingSphere = chunkSphere(pos, nx, iCuts[a], iCuts[a + 1], jCuts[b], jCuts[b + 1]);
      const mesh = new THREE.Mesh(g, mat);
      mesh.name = `terrain:ground:${a}${b}`;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.userData.dynamic = true; // keep out of bakeStatic (custom attribute)
      group.add(mesh);
    }
  }
  return group;
}

/** Index buffer for grid cells i0..i1-1 x j0..j1-1 of a grid nx wide. */
function gridIndex(nx, i0, i1, j0, j1) {
  const idx = new Uint32Array((i1 - i0) * (j1 - j0) * 6);
  let q = 0;
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      // x right, z "down": (a, c, b) faces +y
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
  }
  return idx;
}

function nearestIndex(lines, v) {
  let best = 0;
  for (let i = 1; i < lines.length; i++) if (Math.abs(lines[i] - v) < Math.abs(lines[best] - v)) best = i;
  return best;
}

/** Bounding sphere of the vertices of one chunk. */
function chunkSphere(pos, nx, i0, i1, j0, j1) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const k = (j * nx + i) * 3;
      box.expandByPoint(v.set(pos[k], pos[k + 1], pos[k + 2]));
    }
  }
  return box.getBoundingSphere(new THREE.Sphere());
}
