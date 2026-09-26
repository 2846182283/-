/**
 * crossing/textures.js — every canvas texture the level crossing uses.
 *
 *   atlas  (2048 x 1024, opaque + alpha-tested holes)
 *          deck surfaces (ramp asphalt, rubber panels, concrete filler, all with
 *          their painted edge lines / pedestrian strips baked in), tiger-stripe
 *          regions for posts / booms / pipes / crossbuck arms, the barrier
 *          housing front, speaker grille, direction-indicator face, cabinet door,
 *          chain-link fence, and every sign plate (とまれみよ, 踏切名, 非常ボタン,
 *          自転車は押して, この先踏切, 踏切制御器, 高電圧 …)
 *   decals (1024 x 512, alpha) ground markings: pedestrian waiting boxes with
 *          footprints, blue bicycle navigation arrows, plus the direction arrow
 *          and the soft lamp glow used by the dynamic lamp meshes.
 *
 * Regions are packed with a tiny shelf packer; each region exposes
 * { u0, v0, u1, v1 } (texture flipY is on, so canvas top = v1).
 */
import { drawTexture, roundRect, fitText, verticalText, FONTS, seeded } from '../../core/canvasTex.js';
import { STATION } from '../../core/layout.js';

// ---------------------------------------------------------------------------
// deck dimensions shared with deck.js (texture regions are drawn to scale)
// ---------------------------------------------------------------------------
export const DECK = {
  halfW: 3.45, // deck half width (x) — a little wider than the road + gutter
  edgeLine: 2.65, // white edge line (matches ROADS.crossingRoad.edgeLine)
  lineW: 0.14,
};

const Y = '#f2c230'; // crossing yellow
const K = '#26262a'; // crossing black

/**
 * Shelf packer over a W x H canvas: regions are declared with add(), then
 * pack() places them tallest-first in rows (much tighter than insertion order).
 */
export function packer(W, H, pad = 4) {
  const regions = {};
  const list = [];
  return {
    regions,
    add(name, w, h) { list.push({ name, w, h }); },
    pack() {
      list.sort((a, b) => b.h - a.h || b.w - a.w);
      const rows = []; // { y, h, x }
      let yNext = 0;
      for (const it of list) {
        let row = rows.find((r) => r.x + it.w <= W && it.h <= r.h);
        if (!row) {
          row = { y: yNext, h: it.h, x: 0 };
          yNext += it.h + pad;
          if (yNext - pad > H) throw new Error(`crossing atlas overflow at ${it.name}`);
          rows.push(row);
        }
        const x = row.x, y = row.y;
        row.x += it.w + pad;
        regions[it.name] = { name: it.name, x, y, w: it.w, h: it.h, u0: (x + 0.5) / W, u1: (x + it.w - 0.5) / W, v1: 1 - (y + 0.5) / H, v0: 1 - (y + it.h - 0.5) / H };
      }
      return yNext;
    },
  };
}

/** Hand-painted speckle: sparse soft dots in a colour, seeded. */
function speckle(g, r, n, color, sizeMin, sizeMax, alpha, rnd) {
  g.save();
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    const s = sizeMin + rnd() * (sizeMax - sizeMin);
    g.beginPath();
    g.ellipse(r.x + rnd() * r.w, r.y + rnd() * r.h, s, s * (0.6 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Soft blotches for low-frequency colour unevenness (painted, not photographic). */
function blotches(g, r, n, color, rMin, rMax, alpha, rnd) {
  g.save();
  for (let i = 0; i < n; i++) {
    const cx = r.x + rnd() * r.w, cy = r.y + rnd() * r.h, rad = rMin + rnd() * (rMax - rMin);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alpha * (0.5 + rnd() * 0.5);
    g.fillStyle = gr;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  g.restore();
}

/** Clip drawing to a region. */
function clip(g, r, fn) {
  g.save();
  g.beginPath();
  g.rect(r.x, r.y, r.w, r.h);
  g.clip();
  fn();
  g.restore();
}

// ---------------------------------------------------------------------------
// deck surfaces (drawn to scale: u = x across the road, v = z along it)
// ---------------------------------------------------------------------------
const PX_PER_M = 1024 / (DECK.halfW * 2);
const xToPx = (r, x) => r.x + (x + DECK.halfW) * PX_PER_M; // x relative to the road centre

/** White edge lines + pale-green pedestrian strips outside them, full region height. */
function roadPaint(g, r, { green = true, dashes = false } = {}) {
  const lw = DECK.lineW * PX_PER_M;
  for (const s of [-1, 1]) {
    const xl = xToPx(r, s * DECK.edgeLine) - lw / 2;
    if (green) {
      // pedestrian strip between the edge line and the deck edge (カラー舗装)
      const x0 = s < 0 ? r.x + 0.18 * PX_PER_M : xl + lw;
      const x1 = s < 0 ? xl : r.x + r.w - 0.18 * PX_PER_M;
      g.fillStyle = '#9cc79a';
      g.globalAlpha = 0.9;
      g.fillRect(x0, r.y, x1 - x0, r.h);
      g.globalAlpha = 1;
    }
    g.fillStyle = '#eeede6';
    if (dashes) {
      for (let y = r.y; y < r.y + r.h; y += 24) g.fillRect(xl, y, lw, 14);
    } else g.fillRect(xl, r.y, lw, r.h);
  }
}

function drawRamp(g, r, rnd) {
  // asphalt, a touch lighter & warmer than the street so the newer patch reads
  g.fillStyle = '#757880';
  g.fillRect(r.x, r.y, r.w, r.h);
  blotches(g, r, 26, 'rgba(96,99,108,1)', 30, 90, 0.35, rnd);
  blotches(g, r, 14, 'rgba(140,142,146,1)', 30, 70, 0.25, rnd);
  speckle(g, r, 900, '#9b9ea4', 0.8, 1.8, 0.5, rnd);
  speckle(g, r, 600, '#5a5d64', 0.8, 1.8, 0.5, rnd);
  // tyre polish in both wheel tracks (lighter bands along v)
  for (const x of [-1.9, -0.6, 0.6, 1.9]) {
    const cx = xToPx(r, x);
    const gr = g.createLinearGradient(cx - 26, 0, cx + 26, 0);
    gr.addColorStop(0, 'rgba(160,162,168,0)');
    gr.addColorStop(0.5, 'rgba(160,162,168,0.22)');
    gr.addColorStop(1, 'rgba(160,162,168,0)');
    g.fillStyle = gr;
    g.fillRect(cx - 26, r.y, 52, r.h);
  }
  roadPaint(g, r);
  // concrete kerb nosing at the top (deck side) end: v near 1 = canvas top
  g.fillStyle = '#b9b7b0';
  g.fillRect(r.x, r.y, r.w, 10);
  g.fillStyle = '#8f8d88';
  g.fillRect(r.x, r.y + 10, r.w, 3);
  // sealed crack lines (tar)
  g.strokeStyle = 'rgba(52,54,60,0.55)';
  g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    let x = r.x + 120 + rnd() * (r.w - 240), y = r.y + 40 + rnd() * (r.h - 80);
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 60; y += 10 + rnd() * 25; g.lineTo(x, y); }
    g.stroke();
  }
}

function drawMid(g, r, rnd) {
  // precast concrete filler between the tracks, slabs every ~1.15 m
  g.fillStyle = '#bdbbb4';
  g.fillRect(r.x, r.y, r.w, r.h);
  blotches(g, r, 20, 'rgba(168,166,160,1)', 20, 60, 0.45, rnd);
  blotches(g, r, 10, 'rgba(214,212,205,1)', 20, 60, 0.35, rnd);
  speckle(g, r, 500, '#9f9d97', 0.6, 1.4, 0.45, rnd);
  g.fillStyle = '#8c8a85';
  for (let i = 1; i < 6; i++) g.fillRect(r.x + (r.w * i) / 6 - 1.5, r.y, 3, r.h);
  // steel edge angles along both rail-side edges
  g.fillStyle = '#7d8187';
  g.fillRect(r.x, r.y, r.w, 7);
  g.fillRect(r.x, r.y + r.h - 7, r.w, 7);
  roadPaint(g, r);
}

function drawRubber(g, r, rnd) {
  // ゴム踏板: dark rubber modules ~1.15 m long with a studded anti-slip pattern
  g.fillStyle = '#56585f';
  g.fillRect(r.x, r.y, r.w, r.h);
  blotches(g, r, 14, 'rgba(70,72,80,1)', 14, 40, 0.5, rnd);
  const mods = 6;
  for (let m = 0; m < mods; m++) {
    const x0 = r.x + (r.w * m) / mods, w = r.w / mods;
    // studs (diagonal grid of small light dots)
    g.fillStyle = '#6a6c74';
    for (let yy = 10; yy < r.h - 8; yy += 11) {
      for (let xx = 8 + ((yy / 11) % 2) * 5; xx < w - 6; xx += 10) {
        g.fillRect(x0 + xx, r.y + yy, 3, 3);
      }
    }
    // module joint + bolt heads at the corners
    g.fillStyle = '#34363b';
    g.fillRect(x0, r.y, 3, r.h);
    g.fillStyle = '#8e9197';
    for (const [bx, by] of [[10, 10], [w - 10, 10], [10, r.h - 10], [w - 10, r.h - 10]]) {
      g.beginPath();
      g.arc(x0 + bx, r.y + by, 3.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  // tyre-worn sheen in the wheel tracks
  for (const x of [-1.9, -0.6, 0.6, 1.9]) {
    const cx = xToPx(r, x);
    g.fillStyle = 'rgba(128,130,138,0.18)';
    g.fillRect(cx - 18, r.y, 36, r.h);
  }
  roadPaint(g, r, { green: false });
  // green strips are only painted where the pedestrians walk: a lighter dashed tint on rubber
  for (const s of [-1, 1]) {
    const xl = xToPx(r, s * (DECK.edgeLine + 0.4));
    g.fillStyle = 'rgba(156,199,154,0.55)';
    for (let y = r.y + 6; y < r.y + r.h - 6; y += 22) g.fillRect(xl - 30, y, 60, 10);
  }
}

// ---------------------------------------------------------------------------
// stripes
// ---------------------------------------------------------------------------
/**
 * Helical tiger stripes for a cylinder: u = around (0..1), v = up.  One
 * yellow+black pair per `period` metres of height and exactly one turn per
 * circumference, so the pattern wraps seamlessly and reads as 45° bands.
 */
function drawHelix(g, r, heightM, turns = 1) {
  const img = g.createImageData(r.w, r.h);
  const cy = [242, 194, 48], ck = [38, 38, 42];
  const period = heightM / Math.round(heightM / 0.52);
  for (let j = 0; j < r.h; j++) {
    const yM = ((r.h - 1 - j) / (r.h - 1)) * heightM;
    for (let i = 0; i < r.w; i++) {
      const u = i / r.w;
      const ph = u * turns + yM / period;
      const f = ph - Math.floor(ph);
      // anti-aliased band edges
      const e = Math.min(Math.abs(f - 0.5), Math.min(f, 1 - f)) * period * 180;
      const inY = f < 0.5;
      const w = Math.min(1, e);
      const a = inY ? cy : ck, b = inY ? ck : cy;
      const k = (j * r.w + i) * 4;
      const mix = 0.5 + 0.5 * w;
      img.data[k] = a[0] * mix + b[0] * (1 - mix);
      img.data[k + 1] = a[1] * mix + b[1] * (1 - mix);
      img.data[k + 2] = a[2] * mix + b[2] * (1 - mix);
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, r.x, r.y);
}

/** Straight bands along u (for booms / pipes / fringe), `n` bands, first colour yellow. */
function drawBands(g, r, n, { soft = true, shade = true, cols = [Y, K] } = {}) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    const x0 = r.x + Math.floor((r.w * i) / n), x1 = r.x + Math.floor((r.w * (i + 1)) / n);
    g.fillRect(x0, r.y, x1 - x0, r.h);
  }
  if (shade) {
    // painted rounding: light top edge, soft darker underside (v spans the girth)
    const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h);
    gr.addColorStop(0, 'rgba(255,255,255,0.18)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0)');
    gr.addColorStop(0.8, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(40,30,70,0.18)');
    g.fillStyle = gr;
    g.fillRect(r.x, r.y, r.w, r.h);
  }
  if (soft) {
    g.fillStyle = 'rgba(80,60,40,0.25)';
    for (let i = 1; i < n; i++) g.fillRect(r.x + Math.floor((r.w * i) / n) - 1, r.y, 2, r.h);
  }
}

/** Crossbuck arm: yellow board, black 45° stripes, thin black rim. */
function drawXArm(g, r) {
  g.fillStyle = Y;
  g.fillRect(r.x, r.y, r.w, r.h);
  clip(g, r, () => {
    g.fillStyle = K;
    const step = r.w / 7;
    for (let i = -2; i < 9; i++) {
      const x = r.x + i * step;
      g.beginPath();
      g.moveTo(x, r.y + r.h);
      g.lineTo(x + step * 0.5, r.y + r.h);
      g.lineTo(x + step * 0.5 + r.h, r.y);
      g.lineTo(x + r.h, r.y);
      g.closePath();
      g.fill();
    }
  });
  g.strokeStyle = K;
  g.lineWidth = 6;
  g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
}

// ---------------------------------------------------------------------------
// hardware faces
// ---------------------------------------------------------------------------
function drawMachineFront(g, r) {
  // barrier machine housing front: warm grey body, black/yellow band, maker plate, vents
  g.fillStyle = '#d7d3c6';
  g.fillRect(r.x, r.y, r.w, r.h);
  const band = { x: r.x, y: r.y + r.h * 0.08, w: r.w, h: r.h * 0.2 };
  clip(g, band, () => {
    g.fillStyle = Y;
    g.fillRect(band.x, band.y, band.w, band.h);
    g.fillStyle = K;
    for (let x = band.x - band.h; x < band.x + band.w + band.h; x += 44) {
      g.beginPath();
      g.moveTo(x, band.y + band.h);
      g.lineTo(x + 22, band.y + band.h);
      g.lineTo(x + 22 + band.h, band.y);
      g.lineTo(x + band.h, band.y);
      g.fill();
    }
  });
  // door seam + hinge side
  g.strokeStyle = '#9c988c';
  g.lineWidth = 3;
  roundRect(g, r.x + 16, r.y + r.h * 0.33, r.w - 32, r.h * 0.6, 8);
  g.stroke();
  // louvres
  g.fillStyle = '#a9a598';
  for (let i = 0; i < 5; i++) g.fillRect(r.x + 50, r.y + r.h * 0.72 + i * 14, r.w - 100, 6);
  // key lock + handle
  g.fillStyle = '#6d6a62';
  g.fillRect(r.x + r.w - 44, r.y + r.h * 0.55, 10, 44);
  g.beginPath();
  g.arc(r.x + r.w - 39, r.y + r.h * 0.5, 7, 0, Math.PI * 2);
  g.fill();
  // maker plate
  g.fillStyle = '#eceadf';
  g.fillRect(r.x + 44, r.y + r.h * 0.4, r.w - 100, 50);
  g.strokeStyle = '#8f8b80';
  g.lineWidth = 2;
  g.strokeRect(r.x + 44, r.y + r.h * 0.4, r.w - 100, 50);
  fitText(g, '電気踏切遮断機', r.x + 50, r.y + r.h * 0.4 + 4, r.w - 112, 24, { font: FONTS.gothic, color: '#333', weight: 700 });
  fitText(g, 'HK-E 形  No.07-1', r.x + 50, r.y + r.h * 0.4 + 28, r.w - 112, 18, { font: FONTS.gothic, color: '#555', weight: 400 });
}

function drawGrille(g, r) {
  g.fillStyle = '#3b3d43';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#23252a';
  for (let yy = 14; yy < r.h - 10; yy += 12) {
    for (let xx = 14 + ((yy / 12) % 2) * 6; xx < r.w - 10; xx += 12) {
      g.beginPath();
      g.arc(r.x + xx, r.y + yy, 3.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.strokeStyle = '#55585f';
  g.lineWidth = 6;
  g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
}

function drawIndicator(g, r) {
  // 列車進行方向指示器 face: black panel, two dark arrow windows, 'れっしゃ' legend
  g.fillStyle = '#1f2024';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#4a4c52';
  g.lineWidth = 4;
  g.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  g.fillStyle = '#34363c';
  for (const cx of [0.27, 0.73]) {
    roundRect(g, r.x + r.w * cx - 50, r.y + 12, 100, r.h - 24, 10);
    g.fill();
  }
}

function drawCabinetDoor(g, r, rnd) {
  // 踏切制御器 cabinet door: pale grey-green, pressed panel lines, louvres, sticker slots
  g.fillStyle = '#c9cdc4';
  g.fillRect(r.x, r.y, r.w, r.h);
  blotches(g, r, 8, 'rgba(180,182,172,1)', 20, 60, 0.4, rnd);
  g.strokeStyle = '#9ea298';
  g.lineWidth = 3;
  roundRect(g, r.x + 10, r.y + 10, r.w / 2 - 14, r.h - 20, 6);
  g.stroke();
  roundRect(g, r.x + r.w / 2 + 4, r.y + 10, r.w / 2 - 14, r.h - 20, 6);
  g.stroke();
  g.fillStyle = '#a4a89e';
  for (const x0 of [r.x + 26, r.x + r.w / 2 + 20]) {
    for (let i = 0; i < 6; i++) g.fillRect(x0, r.y + r.h - 90 + i * 12, r.w / 2 - 46, 5);
  }
  // handles
  g.fillStyle = '#5d6158';
  g.fillRect(r.x + r.w / 2 - 20, r.y + r.h * 0.42, 8, 50);
  g.fillRect(r.x + r.w / 2 + 12, r.y + r.h * 0.42, 8, 50);
  // rust streak under the hinge, very soft
  g.fillStyle = 'rgba(150,110,80,0.18)';
  g.fillRect(r.x + 12, r.y + 60, 5, 90);
  // label plates
  g.fillStyle = '#f1efe6';
  g.fillRect(r.x + 26, r.y + 40, r.w / 2 - 46, 44);
  g.strokeStyle = '#555';
  g.lineWidth = 2;
  g.strokeRect(r.x + 26, r.y + 40, r.w / 2 - 46, 44);
  fitText(g, '踏切制御器', r.x + 30, r.y + 44, r.w / 2 - 54, 36, { font: FONTS.gothic, color: '#222' });
  // yellow high-voltage sticker
  const sx = r.x + r.w / 2 + 22, sy = r.y + 40, sw = r.w / 2 - 44, sh = 70;
  g.fillStyle = '#f2c230';
  g.fillRect(sx, sy, sw, sh);
  g.fillStyle = '#26262a';
  g.beginPath();
  g.moveTo(sx + 26, sy + 10); g.lineTo(sx + 44, sy + 46); g.lineTo(sx + 8, sy + 46); g.closePath();
  g.fill();
  g.fillStyle = '#f2c230';
  g.fillRect(sx + 24, sy + 22, 4, 14);
  fitText(g, '危険', sx + 48, sy + 6, sw - 52, 30, { font: FONTS.gothic, color: '#26262a', weight: 900 });
  fitText(g, '高電圧', sx + 48, sy + 36, sw - 52, 26, { font: FONTS.gothic, color: '#26262a' });
}

function drawMesh(g, r) {
  // chain-link (diamond) fence: transparent holes, galvanised wire
  g.clearRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#9aa1a6';
  g.lineWidth = 2.6;
  const s = 16;
  clip(g, r, () => {
    for (let x = -r.h; x < r.w + r.h; x += s) {
      g.beginPath();
      g.moveTo(r.x + x, r.y);
      g.lineTo(r.x + x + r.h, r.y + r.h);
      g.stroke();
      g.beginPath();
      g.moveTo(r.x + x + r.h, r.y);
      g.lineTo(r.x + x, r.y + r.h);
      g.stroke();
    }
  });
}

// ---------------------------------------------------------------------------
// signs
// ---------------------------------------------------------------------------
function drawTomareMiyo(g, r) {
  g.fillStyle = K;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#f4f3ee';
  g.lineWidth = 6;
  g.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
  fitText(g, 'とまれ  みよ', r.x + 20, r.y + 18, r.w - 40, r.h - 36, { font: FONTS.round, color: '#f7f5ec', weight: 800, letterSpacing: 10 });
}

function drawNamePlate(g, r) {
  g.fillStyle = '#f7f6f1';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#2d3a6a';
  g.lineWidth = 5;
  g.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
  fitText(g, `${STATION.name}第１踏切道`, r.x + 18, r.y + 12, r.w - 36, r.h * 0.5, { font: FONTS.gothic, color: '#1f2a55', weight: 700 });
  fitText(g, `${STATION.company}  ${STATION.line}  12k450m`, r.x + 18, r.y + r.h * 0.6, r.w - 36, r.h * 0.28, { font: FONTS.gothic, color: '#3a4570', weight: 400 });
}

function drawEmergency(g, r) {
  g.fillStyle = Y;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#d8433d';
  g.fillRect(r.x, r.y, r.w, r.h * 0.26);
  fitText(g, '非常ボタン', r.x + 10, r.y + 6, r.w - 20, r.h * 0.2, { font: FONTS.gothic, color: '#fff', weight: 900 });
  // button ring (the real button is geometry; this is the bezel print)
  g.fillStyle = '#26262a';
  g.beginPath();
  g.arc(r.x + r.w / 2, r.y + r.h * 0.52, r.w * 0.2, 0, Math.PI * 2);
  g.fill();
  const lines = ['踏切で危険なときは', 'このボタンを', '押してください'];
  lines.forEach((t, i) => fitText(g, t, r.x + 10, r.y + r.h * (0.74 + i * 0.085), r.w - 20, r.h * 0.08, { font: FONTS.gothic, color: '#26262a', weight: 700 }));
}

function drawBicycle(g, r, cx, cy, s, color, lw) {
  // simple bicycle pictogram centred on (cx, cy), wheel radius s
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const dx of [-1.25, 1.25]) {
    g.beginPath();
    g.arc(cx + dx * s, cy + s * 0.3, s, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(cx - 1.25 * s, cy + s * 0.3);
  g.lineTo(cx - 0.25 * s, cy - s * 0.75);
  g.lineTo(cx + 0.85 * s, cy - s * 0.75);
  g.lineTo(cx + 1.25 * s, cy + s * 0.3);
  g.moveTo(cx - 0.25 * s, cy - s * 0.75);
  g.lineTo(cx, cy + s * 0.3);
  g.lineTo(cx + 0.85 * s, cy - s * 0.75);
  g.moveTo(cx - 0.45 * s, cy - s * 1.05);
  g.lineTo(cx - 0.05 * s, cy - s * 1.05);
  g.moveTo(cx + 0.85 * s, cy - s * 0.75);
  g.lineTo(cx + 0.7 * s, cy - s * 1.2);
  g.lineTo(cx + 1.05 * s, cy - s * 1.25);
  g.stroke();
}

function drawPushBike(g, r) {
  g.fillStyle = '#f7f6f1';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#2f63b5';
  g.lineWidth = 8;
  g.strokeRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
  // blue disc with a walking person pushing a bicycle
  const cx = r.x + r.w / 2, cy = r.y + r.h * 0.33, R = r.w * 0.3;
  g.fillStyle = '#2f63b5';
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  drawBicycle(g, r, cx + R * 0.18, cy + R * 0.18, R * 0.24, '#fff', 5);
  // person
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(cx - R * 0.55, cy - R * 0.5, R * 0.12, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(cx - R * 0.55, cy - R * 0.35);
  g.lineTo(cx - R * 0.6, cy + R * 0.12);
  g.lineTo(cx - R * 0.8, cy + R * 0.55);
  g.moveTo(cx - R * 0.6, cy + R * 0.12);
  g.lineTo(cx - R * 0.35, cy + R * 0.55);
  g.moveTo(cx - R * 0.56, cy - R * 0.22);
  g.lineTo(cx - R * 0.1, cy - R * 0.08);
  g.stroke();
  fitText(g, '自転車は', r.x + 14, r.y + r.h * 0.63, r.w - 28, r.h * 0.1, { font: FONTS.gothic, color: '#1f2a55' });
  fitText(g, '降りて押して', r.x + 14, r.y + r.h * 0.74, r.w - 28, r.h * 0.1, { font: FONTS.gothic, color: '#d8433d', weight: 900 });
  fitText(g, '渡りましょう', r.x + 14, r.y + r.h * 0.85, r.w - 28, r.h * 0.1, { font: FONTS.gothic, color: '#1f2a55' });
}

function drawKonosaki(g, r) {
  // この先踏切 board: white with red rim, a small crossbuck and a train pictogram
  g.fillStyle = '#f7f6f1';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#d8433d';
  g.lineWidth = 12;
  g.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
  // crossbuck
  const cx = r.x + r.w * 0.2, cy = r.y + r.h * 0.5;
  g.save();
  g.translate(cx, cy);
  for (const a of [0.65, -0.65]) {
    g.save();
    g.rotate(a);
    g.fillStyle = Y;
    g.fillRect(-58, -11, 116, 22);
    g.fillStyle = K;
    for (let i = -3; i <= 3; i += 2) g.fillRect(i * 14 - 7, -11, 12, 22);
    g.strokeStyle = K;
    g.lineWidth = 2;
    g.strokeRect(-58, -11, 116, 22);
    g.restore();
  }
  g.restore();
  fitText(g, 'この先', r.x + r.w * 0.38, r.y + r.h * 0.12, r.w * 0.56, r.h * 0.24, { font: FONTS.gothic, color: '#26262a' });
  fitText(g, '踏切', r.x + r.w * 0.38, r.y + r.h * 0.34, r.w * 0.56, r.h * 0.4, { font: FONTS.gothic, color: '#d8433d', weight: 900, letterSpacing: 8 });
  fitText(g, '一時停止', r.x + r.w * 0.38, r.y + r.h * 0.74, r.w * 0.56, r.h * 0.16, { font: FONTS.gothic, color: '#26262a' });
}

function drawDanger(g, r) {
  g.fillStyle = '#f7f6f1';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#d8433d';
  g.fillRect(r.x, r.y, r.w, r.h * 0.38);
  fitText(g, '危険', r.x + 10, r.y + 4, r.w - 20, r.h * 0.32, { font: FONTS.gothic, color: '#fff', weight: 900, letterSpacing: 12 });
  fitText(g, '線路内に', r.x + 10, r.y + r.h * 0.42, r.w - 20, r.h * 0.26, { font: FONTS.gothic, color: '#26262a' });
  fitText(g, '立入禁止', r.x + 10, r.y + r.h * 0.68, r.w - 20, r.h * 0.28, { font: FONTS.gothic, color: '#26262a', weight: 900 });
}

function drawSafety(g, r) {
  // small enamel plate on the fence: 踏切事故をなくしましょう (vertical text)
  g.fillStyle = '#eaf2f7';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#2f63b5';
  g.fillRect(r.x, r.y, r.w, 26);
  g.fillRect(r.x, r.y + r.h - 26, r.w, 26);
  verticalText(g, '踏切事故をなくそう', r.x + r.w * 0.5, r.y + 36, r.y + r.h - 36, { font: FONTS.gothic, color: '#1f2a55', weight: 700, width: r.w * 0.6 });
}

// ---------------------------------------------------------------------------
// decals (alpha)
// ---------------------------------------------------------------------------
function footprint(g, x, y, s, flip) {
  g.save();
  g.translate(x, y);
  if (flip) g.scale(-1, 1);
  g.beginPath();
  g.ellipse(0, 0, s * 0.36, s * 0.62, 0.12, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(s * 0.1, s * 0.95, s * 0.28, s * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawWait(g, r) {
  // 歩行者待機位置: white bar, two pairs of footprints and 'とまれ', text top toward the tracks (canvas top)
  g.clearRect(r.x, r.y, r.w, r.h);
  g.fillStyle = 'rgba(246,245,238,0.95)';
  g.fillRect(r.x + 8, r.y + 8, r.w - 16, 20);
  g.fillStyle = 'rgba(242,194,48,0.95)';
  for (const [fx, fl] of [[0.22, false], [0.34, true], [0.66, false], [0.78, true]]) footprint(g, r.x + r.w * fx, r.y + r.h * 0.58, 40, fl);
  fitText(g, 'とまれ', r.x + r.w * 0.36, r.y + 40, r.w * 0.28, 58, { font: FONTS.round, color: 'rgba(246,245,238,0.95)', weight: 800 });
}

function drawBikeNav(g, r) {
  // 自転車ナビマーク: blue arrow chevron with a white bicycle, pointing to the canvas top
  g.clearRect(r.x, r.y, r.w, r.h);
  const cx = r.x + r.w / 2;
  g.fillStyle = 'rgba(47,99,181,0.92)';
  g.beginPath();
  g.moveTo(cx, r.y + 6);
  g.lineTo(r.x + r.w - 10, r.y + r.h * 0.3);
  g.lineTo(r.x + r.w - 10, r.y + r.h - 6);
  g.lineTo(r.x + 10, r.y + r.h - 6);
  g.lineTo(r.x + 10, r.y + r.h * 0.3);
  g.closePath();
  g.fill();
  // bicycle rotated to read along the arrow (drawn sideways: wheels stacked along v)
  g.save();
  g.translate(cx, r.y + r.h * 0.62);
  g.rotate(-Math.PI / 2);
  drawBicycle(g, r, 0, 0, r.w * 0.16, 'rgba(250,250,246,0.95)', 9);
  g.restore();
}

function drawArrow(g, r) {
  // right-pointing arrow (white, alpha) for the direction indicator
  g.clearRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#ffffff';
  g.beginPath();
  const x = r.x, y = r.y, w = r.w, h = r.h;
  g.moveTo(x + w * 0.08, y + h * 0.38);
  g.lineTo(x + w * 0.56, y + h * 0.38);
  g.lineTo(x + w * 0.56, y + h * 0.14);
  g.lineTo(x + w * 0.94, y + h * 0.5);
  g.lineTo(x + w * 0.56, y + h * 0.86);
  g.lineTo(x + w * 0.56, y + h * 0.62);
  g.lineTo(x + w * 0.08, y + h * 0.62);
  g.closePath();
  g.fill();
}

function drawGlow(g, r) {
  g.clearRect(r.x, r.y, r.w, r.h);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r.w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,0.8)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(r.x, r.y, r.w, r.h);
}

// ---------------------------------------------------------------------------
export function makeCrossingTextures() {
  const rnd = seeded(7021);
  // ---- main atlas ----
  const A = packer(2048, 2048);
  const R = A.regions;
  A.add('ramp', 1024, 356);
  A.add('postStripe', 128, 512);
  A.add('machineFront', 256, 512);
  A.add('cabinetDoor', 256, 384);
  A.add('mid', 1024, 204);
  A.add('rubber', 1024, 128);
  A.add('boom', 1024, 64);
  A.add('pipe', 512, 32);
  A.add('fringe', 64, 32);
  A.add('xArm', 512, 96);
  A.add('grille', 128, 128);
  A.add('indicator', 256, 96);
  A.add('tomare', 384, 128);
  A.add('name', 512, 128);
  A.add('mesh', 384, 192);
  A.add('emergency', 192, 288);
  A.add('pushBike', 224, 320);
  A.add('konosaki', 384, 224);
  A.add('danger', 256, 160);
  A.add('safety', 96, 320);
  A.add('rubberPole', 64, 256);
  A.add('black', 16, 16);
  A.add('grey', 16, 16);
  A.add('dark', 16, 16);
  A.add('red', 16, 16);
  A.add('white', 16, 16);
  A.pack();

  const atlas = drawTexture(2048, 2048, (g) => {
    g.clearRect(0, 0, 2048, 2048);
    drawRamp(g, R.ramp, rnd);
    drawHelix(g, R.postStripe, 3.12);
    drawMachineFront(g, R.machineFront);
    drawCabinetDoor(g, R.cabinetDoor, rnd);
    drawMid(g, R.mid, rnd);
    drawRubber(g, R.rubber, rnd);
    drawBands(g, R.boom, 14);
    drawBands(g, R.pipe, 8, { soft: false });
    drawBands(g, R.fringe, 4, { soft: false, shade: false });
    drawXArm(g, R.xArm);
    drawGrille(g, R.grille);
    drawIndicator(g, R.indicator);
    drawTomareMiyo(g, R.tomare);
    drawNamePlate(g, R.name);
    drawMesh(g, R.mesh);
    drawEmergency(g, R.emergency);
    drawPushBike(g, R.pushBike);
    drawKonosaki(g, R.konosaki);
    drawDanger(g, R.danger);
    drawSafety(g, R.safety);
    // rubber pole (ポストコーン): yellow body with two white reflective bands
    const rp = R.rubberPole;
    g.fillStyle = Y;
    g.fillRect(rp.x, rp.y, rp.w, rp.h);
    g.fillStyle = '#f5f5f0';
    g.fillRect(rp.x, rp.y + rp.h * 0.12, rp.w, rp.h * 0.12);
    g.fillRect(rp.x, rp.y + rp.h * 0.34, rp.w, rp.h * 0.12);
    g.fillStyle = K;
    g.fillRect(rp.x, rp.y + rp.h * 0.88, rp.w, rp.h * 0.12);
    for (const [k, c] of [['black', '#202125'], ['grey', '#8b9097'], ['dark', '#43464d'], ['red', '#d8433d'], ['white', '#f4f3ee']]) {
      g.fillStyle = c;
      g.fillRect(R[k].x, R[k].y, R[k].w, R[k].h);
    }
  });

  // ---- decal atlas ----
  const D = packer(1024, 512);
  const DR = D.regions;
  D.add('wait', 512, 192);
  D.add('bikeNav', 192, 384);
  D.add('arrow', 128, 128);
  D.add('glow', 128, 128);
  D.pack();
  const decals = drawTexture(1024, 512, (g) => {
    g.clearRect(0, 0, 1024, 512);
    drawWait(g, DR.wait);
    drawBikeNav(g, DR.bikeNav);
    drawArrow(g, DR.arrow);
    drawGlow(g, DR.glow);
  });

  return { atlas, R, decals, DR };
}
