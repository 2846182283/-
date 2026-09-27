/**
 * Canvas textures for the houses module.
 *
 *  wallAtlas   1024 x 2048, five horizontal BANDS (plaster, siding, tile, wood
 *              boards, concrete block).  Each band tiles in U (4 m period) and
 *              spans 0..BAND_H metres of wall height in V, so moss at the wall
 *              foot and board lines stay aligned on every house.  Near-white:
 *              the per-house colour comes from vertex colours.
 *  roofAtlas   kawara tile field, standing-seam metal, kawara eave-tile ends.
 *  decalAtlas  name plates, address plates, meter / intercom / AC faces,
 *              stickers, balcony bars, mesh fence... (alpha-tested, packed).
 *  grimeAtlas  soft transparent rain streaks, moss, cracks, rust drips.
 *  laundryAtlas shirts, sailor tops, blazers, towels, sheets, futon... (alpha).
 */
import * as THREE from 'three';
import { drawTexture, fitText, verticalText, roundRect, seeded, FONTS } from '../../core/canvasTex.js';

// ---------------------------------------------------------------------------
// wall atlas
// ---------------------------------------------------------------------------
export const WALL_U_PERIOD = 4; // metres per texture repeat along the wall
export const BAND_H = 6.6; // metres of wall height covered by one band
const WALL_W = 1024, WALL_H = 2048, BAND_PX = 400, BAND_GAP = 8;
export const WALL_BANDS = ['plaster', 'siding', 'tile', 'wood', 'block'];

/** V coordinate for height h (m above the wall base) in `band`. */
export function wallV(band, h) {
  const i = typeof band === 'number' ? band : WALL_BANDS.indexOf(band);
  const y0 = i * (BAND_PX + BAND_GAP) + 4; // canvas px (top of band)
  const hh = Math.min(Math.max(h, 0), BAND_H);
  const py = y0 + BAND_PX - (hh / BAND_H) * BAND_PX;
  return 1 - py / WALL_H;
}

/** Draw something that wraps horizontally (drawn at x, x-W, x+W). */
function wrapDraw(W, fn) { fn(0); fn(-W); fn(W); }

function paintPlaster(ctx, y0, rnd) {
  const W = WALL_W, H = BAND_PX, pxm = H / BAND_H;
  ctx.fillStyle = '#f6f4ef';
  ctx.fillRect(0, y0, W, H);
  // soft hand-painted blotches (large, low contrast)
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = y0 + rnd() * H, r = 30 + rnd() * 110;
    const light = rnd() < 0.5;
    wrapDraw(W, (o) => {
      const g = ctx.createRadialGradient(x + o, y, 0, x + o, y, r);
      g.addColorStop(0, light ? 'rgba(255,255,252,0.35)' : 'rgba(200,196,188,0.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + o - r, y - r, r * 2, r * 2);
    });
  }
  // faint trowel strokes
  ctx.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = y0 + rnd() * H, l = 8 + rnd() * 22;
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(180,176,168,0.12)';
    ctx.beginPath();
    ctx.arc(x, y + l, l, -Math.PI * 0.7, -Math.PI * 0.3);
    ctx.stroke();
  }
  wallFoot(ctx, y0, rnd, pxm);
  streaks(ctx, y0, rnd, pxm, 10, 0.07);
}

/** Moss / splash dirt at the foot of every wall band (bottom ~0.4 m). */
function wallFoot(ctx, y0, rnd, pxm, strength = 1) {
  const W = WALL_W, bottom = y0 + BAND_PX;
  const g = ctx.createLinearGradient(0, bottom, 0, bottom - 0.45 * pxm);
  g.addColorStop(0, `rgba(120,132,104,${0.30 * strength})`);
  g.addColorStop(0.5, `rgba(140,146,120,${0.12 * strength})`);
  g.addColorStop(1, 'rgba(150,150,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, bottom - 0.45 * pxm, W, 0.45 * pxm);
  // moss clumps
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, r = 6 + rnd() * 20;
    wrapDraw(W, (o) => {
      const gg = ctx.createRadialGradient(x + o, bottom, 0, x + o, bottom, r * 1.6);
      gg.addColorStop(0, `rgba(108,134,88,${0.35 * strength})`);
      gg.addColorStop(1, 'rgba(108,134,88,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x + o, bottom, r * 1.6, r, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
  }
}

/** Faint vertical rain streaks. */
function streaks(ctx, y0, rnd, pxm, n, alpha) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * WALL_WRAP(), top = y0 + rnd() * BAND_PX * 0.6, len = (0.4 + rnd() * 1.4) * pxm, w = 3 + rnd() * 10;
    const g = ctx.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, `rgba(150,146,140,${alpha})`);
    g.addColorStop(1, 'rgba(150,146,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, w, len);
  }
}
const WALL_WRAP = () => WALL_W - 12;

function paintSiding(ctx, y0, rnd) {
  const W = WALL_W, H = BAND_PX, pxm = H / BAND_H;
  const board = 0.2 * pxm;
  ctx.fillStyle = '#f5f5f2';
  ctx.fillRect(0, y0, W, H);
  let row = 0;
  for (let y = y0 + H; y > y0 - board; y -= board, row++) {
    const v = 0.96 + rnd() * 0.05;
    ctx.fillStyle = `rgba(${Math.round(245 * v)},${Math.round(245 * v)},${Math.round(242 * v)},1)`;
    ctx.fillRect(0, y - board, W, board);
    // soft gradient inside the board (lap siding is slightly angled)
    const g = ctx.createLinearGradient(0, y - board, 0, y);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(170,172,180,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - board, W, board);
    // shadow line under the lap
    ctx.fillStyle = 'rgba(95,98,112,0.55)';
    ctx.fillRect(0, y - 2, W, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, y - board, W, 1);
    // caulked joints (staggered)
    for (let k = 0; k < 2; k++) {
      const x = ((row * 397 + k * 512 + rnd() * 60) % W);
      ctx.fillStyle = 'rgba(140,142,150,0.5)';
      ctx.fillRect(x, y - board, 2, board);
    }
  }
  wallFoot(ctx, y0, rnd, pxm, 0.8);
  streaks(ctx, y0, rnd, pxm, 6, 0.05);
}

function paintTile(ctx, y0, rnd) {
  const W = WALL_W, H = BAND_PX, pxm = H / BAND_H, pxu = W / WALL_U_PERIOD;
  ctx.fillStyle = '#dcdcdc';
  ctx.fillRect(0, y0, W, H);
  const th = 0.15 * pxm, tw = 0.4 * pxu;
  let row = 0;
  for (let y = y0 + H; y > y0 - th; y -= th, row++) {
    const off = (row % 2) * tw * 0.5;
    for (let x = -tw + off; x < W + tw; x += tw) {
      const v = 0.93 + rnd() * 0.08;
      const c = Math.round(250 * v);
      ctx.fillStyle = `rgb(${c},${c},${Math.round(c * 0.995)})`;
      ctx.fillRect(x + 1.5, y - th + 1.5, tw - 3, th - 3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + 1.5, y - th + 1.5, tw - 3, 1);
    }
  }
  wallFoot(ctx, y0, rnd, pxm, 0.7);
  streaks(ctx, y0, rnd, pxm, 5, 0.05);
}

function paintWood(ctx, y0, rnd) {
  const W = WALL_W, H = BAND_PX, pxm = H / BAND_H, pxu = W / WALL_U_PERIOD;
  const board = 0.21 * pxm;
  ctx.fillStyle = '#ece6dc';
  ctx.fillRect(0, y0, W, H);
  for (let y = y0 + H; y > y0 - board; y -= board) {
    const v = 0.9 + rnd() * 0.12;
    ctx.fillStyle = `rgb(${Math.round(236 * v)},${Math.round(228 * v)},${Math.round(216 * v)})`;
    ctx.fillRect(0, y - board, W, board);
    // grain
    for (let k = 0; k < 7; k++) {
      const gy = y - board + rnd() * board, x = rnd() * W, l = 60 + rnd() * 240;
      ctx.strokeStyle = `rgba(150,130,110,${0.12 + rnd() * 0.14})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(x + l * 0.3, gy + 1.5, x + l * 0.6, gy - 1.5, x + l, gy);
      ctx.stroke();
    }
    // overlap shadow (下見板)
    const g = ctx.createLinearGradient(0, y - 5, 0, y);
    g.addColorStop(0, 'rgba(60,50,45,0)');
    g.addColorStop(1, 'rgba(60,50,45,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 5, W, 5);
  }
  // vertical battens (押縁) every 1 m
  for (let x = 0; x < W; x += pxu) {
    ctx.fillStyle = 'rgba(245,240,232,0.95)';
    ctx.fillRect(x, y0, 8, H);
    ctx.fillStyle = 'rgba(60,50,45,0.45)';
    ctx.fillRect(x + 8, y0, 3, H);
  }
  wallFoot(ctx, y0, rnd, pxm, 0.6);
}

function paintBlock(ctx, y0, rnd) {
  const W = WALL_W, H = BAND_PX, pxm = H / BAND_H, pxu = W / WALL_U_PERIOD;
  ctx.fillStyle = '#c9c7c2';
  ctx.fillRect(0, y0, W, H);
  const bh = 0.2 * pxm, bw = 0.4 * pxu;
  let row = 0;
  for (let y = y0 + H; y > y0 - bh; y -= bh, row++) {
    const off = (row % 2) * bw * 0.5;
    for (let x = -bw + off; x < W + bw; x += bw) {
      const v = 0.94 + rnd() * 0.07;
      const c = Math.round(242 * v);
      ctx.fillStyle = `rgb(${c},${c - 1},${c - 4})`;
      ctx.fillRect(x + 2, y - bh + 2, bw - 4, bh - 4);
      // speckles
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = 'rgba(150,146,140,0.25)';
        ctx.fillRect(x + 2 + rnd() * (bw - 6), y - bh + 2 + rnd() * (bh - 6), 2, 2);
      }
    }
  }
  wallFoot(ctx, y0, rnd, pxm, 1.3);
  streaks(ctx, y0, rnd, pxm, 14, 0.09);
}

export function makeWallAtlas() {
  const rnd = seeded(4242);
  const t = drawTexture(WALL_W, WALL_H, (ctx) => {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, WALL_W, WALL_H);
    const painters = [paintPlaster, paintSiding, paintTile, paintWood, paintBlock];
    painters.forEach((p, i) => {
      const y0 = i * (BAND_PX + BAND_GAP) + 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0 - 4, WALL_W, BAND_PX + 8);
      ctx.clip();
      p(ctx, y0, rnd);
      // replicate the band edges into the gap (mip bleeding guard)
      ctx.restore();
      ctx.drawImage(ctx.canvas, 0, y0, WALL_W, 1, 0, y0 - 4, WALL_W, 4);
      ctx.drawImage(ctx.canvas, 0, y0 + BAND_PX - 1, WALL_W, 1, 0, y0 + BAND_PX, WALL_W, 4);
    });
  }, { wrap: true });
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// roof atlas
// ---------------------------------------------------------------------------
export const ROOF_U_PERIOD = 3; // m
export const ROOF_SLOPE_M = 8; // m of slope per band
const ROOF_W = 1024, ROOF_H = 2048;
const ROOF_BANDS = { kawara: [4, 900], metal: [916, 900], eave: [1832, 200] }; // [top px, height px]

/** V for distance d (m) up-slope from the eave edge. */
export function roofV(band, d) {
  const [y0, h] = ROOF_BANDS[band];
  const dd = Math.min(Math.max(d, 0), ROOF_SLOPE_M);
  const py = y0 + h - (dd / ROOF_SLOPE_M) * h;
  return 1 - py / ROOF_H;
}
/** V range [bottom, top] of the eave-tile band. */
export function roofEaveV() {
  const [y0, h] = ROOF_BANDS.eave;
  return [1 - (y0 + h) / ROOF_H, 1 - y0 / ROOF_H];
}

export function makeRoofAtlas() {
  const rnd = seeded(777);
  const t = drawTexture(ROOF_W, ROOF_H, (ctx) => {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, ROOF_W, ROOF_H);
    // --- kawara: J-tile rolls running down-slope, course lines across
    {
      const [y0, H] = ROOF_BANDS.kawara;
      const pxm = H / ROOF_SLOPE_M, pxu = ROOF_W / ROOF_U_PERIOD;
      const colW = 0.3 * pxu, course = 0.27 * pxm;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y0 - 4, ROOF_W, H + 8); ctx.clip();
      for (let x = 0; x < ROOF_W; x += colW) {
        for (let y = y0 + H + course; y > y0 - course; y -= course) {
          const v = 0.9 + rnd() * 0.1;
          const base = Math.round(236 * v);
          // cel-stepped roll: shadow crease | mid | highlight | mid
          const bands = [[0, 0.16, 0.62], [0.16, 0.42, 0.9], [0.42, 0.66, 1.06], [0.66, 1, 0.86]];
          for (const [a, b, k] of bands) {
            const c = Math.min(255, Math.round(base * k));
            ctx.fillStyle = `rgb(${c},${c},${Math.min(255, c + 3)})`;
            ctx.fillRect(x + a * colW, y - course, (b - a) * colW + 0.5, course);
          }
          // lip of the tile above (lighter band) and its shadow
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.fillRect(x, y - course, colW, course * 0.14);
          ctx.fillStyle = 'rgba(40,44,60,0.55)';
          ctx.fillRect(x, y - 3, colW, 3);
        }
      }
      // gentle large-scale variation (sun-faded patches)
      for (let i = 0; i < 40; i++) {
        const x = rnd() * ROOF_W, y = y0 + rnd() * H, r = 40 + rnd() * 120;
        wrapDraw(ROOF_W, (o) => {
          const g = ctx.createRadialGradient(x + o, y, 0, x + o, y, r);
          g.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(120,120,130,0.10)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x + o - r, y - r, r * 2, r * 2);
        });
      }
      ctx.restore();
    }
    // --- metal: standing seams
    {
      const [y0, H] = ROOF_BANDS.metal;
      const n = 7, sw = ROOF_W / n;
      ctx.fillStyle = '#ececec';
      ctx.fillRect(0, y0 - 4, ROOF_W, H + 8);
      for (let i = 0; i < n; i++) {
        const x = i * sw;
        const g = ctx.createLinearGradient(x, 0, x + sw, 0);
        g.addColorStop(0, 'rgba(255,255,255,0.25)');
        g.addColorStop(0.5, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(150,150,160,0.18)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y0 - 4, sw, H + 8);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x, y0 - 4, 3, H + 8);
        ctx.fillStyle = 'rgba(60,64,80,0.5)';
        ctx.fillRect(x + 3, y0 - 4, 4, H + 8);
      }
      for (let i = 0; i < 30; i++) {
        const x = rnd() * ROOF_W, y = y0 + rnd() * H;
        ctx.fillStyle = 'rgba(140,140,150,0.07)';
        ctx.fillRect(x, y, 4 + rnd() * 20, 30 + rnd() * 120);
      }
    }
    // --- eave tile ends (軒瓦): round ends with a small crest
    {
      const [y0, H] = ROOF_BANDS.eave;
      const pxu = ROOF_W / ROOF_U_PERIOD, colW = 0.3 * pxu;
      ctx.fillStyle = '#9a9aa0';
      ctx.fillRect(0, y0 - 4, ROOF_W, H + 8);
      for (let x = 0; x < ROOF_W; x += colW) {
        ctx.fillStyle = '#d8d8dc';
        roundRect(ctx, x + 4, y0 + 10, colW - 8, H - 20, 26);
        ctx.fill();
        ctx.fillStyle = '#f2f2f4';
        roundRect(ctx, x + 10, y0 + 16, colW - 36, H * 0.3, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,90,100,0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + colW * 0.62, y0 + H * 0.56, H * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, { wrap: true });
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// decal atlas (packed cells, alpha-tested)
// ---------------------------------------------------------------------------
export const FAMILY_NAMES = ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤', '吉田', '山口', '松本', '井上', '木村', '清水', '森', '池田', '橋本', '石川'];
const ROMAJI = { 佐藤: 'SATO', 鈴木: 'SUZUKI', 高橋: 'TAKAHASHI', 田中: 'TANAKA', 渡辺: 'WATANABE', 伊藤: 'ITO', 山本: 'YAMAMOTO', 中村: 'NAKAMURA', 小林: 'KOBAYASHI', 加藤: 'KATO', 吉田: 'YOSHIDA', 山口: 'YAMAGUCHI', 松本: 'MATSUMOTO', 井上: 'INOUE', 木村: 'KIMURA', 清水: 'SHIMIZU', 森: 'MORI', 池田: 'IKEDA', 橋本: 'HASHIMOTO', 石川: 'ISHIKAWA' };

/**
 * Returns { texture, uv(name) -> [u0, v0, u1, v1] }.
 */
export function makeDecalAtlas() {
  const S = 2048;
  const cells = new Map();
  let cx = 0, cy = 0, rowH = 0;
  const jobs = [];
  const add = (name, w, h, draw) => {
    if (cx + w > S) { cx = 0; cy += rowH + 4; rowH = 0; }
    cells.set(name, [cx, cy, w, h]);
    jobs.push([cx, cy, w, h, draw]);
    cx += w + 4;
    rowH = Math.max(rowH, h);
  };

  // --- name plates (表札): horizontal stone / metal / wood, and vertical wood
  FAMILY_NAMES.forEach((n, i) => {
    add(`nameH${i}`, 256, 96, (c, w, h) => {
      const style = i % 3;
      const bg = ['#e9e6de', '#3d3f44', '#c9a77a'][style];
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      if (style === 0) { c.strokeStyle = '#b9b4aa'; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8); }
      if (style === 2) for (let k = 0; k < 8; k++) { c.strokeStyle = 'rgba(120,85,50,0.25)'; c.beginPath(); c.moveTo(0, 10 + k * 11); c.lineTo(w, 12 + k * 11); c.stroke(); }
      const col = ['#3b3a38', '#f2efe6', '#3a2618'][style];
      fitText(c, n, 10, 6, w - 20, h * 0.62, { font: style === 1 ? FONTS.gothic : FONTS.mincho, weight: 700, color: col, letterSpacing: 18 });
      fitText(c, ROMAJI[n] || '', 10, h * 0.66, w - 20, h * 0.26, { font: FONTS.latin, weight: 500, color: col, letterSpacing: 4 });
    });
  });
  FAMILY_NAMES.forEach((n, i) => {
    add(`nameV${i}`, 80, 220, (c, w, h) => {
      c.fillStyle = i % 2 ? '#d9bf94' : '#e7d7b8'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 6; k++) { c.strokeStyle = 'rgba(140,100,60,0.22)'; c.beginPath(); c.moveTo(8 + k * 12, 0); c.lineTo(10 + k * 12, h); c.stroke(); }
      c.strokeStyle = 'rgba(90,60,30,0.5)'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
      verticalText(c, n, w / 2, 14, h - 14, { font: FONTS.mincho, weight: 700, color: '#2b1d12', width: 60 });
    });
  });
  // --- 住居表示 blue address plates
  for (let i = 0; i < 6; i++) {
    add(`addr${i}`, 256, 72, (c, w, h) => {
      c.fillStyle = '#2f5aa8'; roundRect(c, 0, 0, w, h, 8); c.fill();
      c.strokeStyle = '#f5f5f5'; c.lineWidth = 3; roundRect(c, 5, 5, w - 10, h - 10, 6); c.stroke();
      fitText(c, `桜ヶ丘${['一', '二', '三'][i % 3]}丁目`, 12, 8, w * 0.62, h - 16, { font: FONTS.gothic, color: '#ffffff', weight: 700 });
      fitText(c, `${3 + i * 4}`, w * 0.68, 6, w * 0.28, h - 12, { font: FONTS.gothic, color: '#ffffff', weight: 700 });
    });
  }
  // --- intercom (インターホン)
  add('intercom', 64, 112, (c, w, h) => {
    c.fillStyle = '#e8e8e6'; roundRect(c, 0, 0, w, h, 10); c.fill();
    c.fillStyle = '#2d3038'; c.beginPath(); c.arc(w / 2, 22, 10, 0, 7); c.fill();
    c.fillStyle = '#5c6f86'; c.beginPath(); c.arc(w / 2, 22, 4, 0, 7); c.fill();
    for (let k = 0; k < 4; k++) { c.fillStyle = '#b8b8b8'; c.fillRect(16, 42 + k * 7, w - 32, 3); }
    c.fillStyle = '#c9ccd2'; c.beginPath(); c.arc(w / 2, 86, 13, 0, 7); c.fill();
    c.strokeStyle = '#8a8e96'; c.lineWidth = 2; c.stroke();
  });
  // --- electric meter
  add('meter', 96, 128, (c, w, h) => {
    c.fillStyle = '#e6e8ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#b8cbd6'; roundRect(c, 10, 12, w - 20, 64, 8); c.fill();
    c.fillStyle = '#20252c'; c.fillRect(22, 28, w - 44, 16);
    c.fillStyle = '#7fe0a0'; c.font = `700 12px ${FONTS.latin}`; c.fillText('0 4 2 7 1', 26, 41);
    c.fillStyle = '#6c737d'; c.fillRect(16, 90, w - 32, 6); c.fillRect(16, 104, w - 48, 6);
  });
  add('gasmeter', 96, 96, (c, w, h) => {
    c.fillStyle = '#d9dadb'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f3f3f0'; roundRect(c, 12, 14, w - 24, 38, 6); c.fill();
    c.fillStyle = '#2a2a2a'; c.font = `700 14px ${FONTS.latin}`; c.fillText('0 3 5 8', 22, 39);
    c.fillStyle = '#e0b030'; c.fillRect(12, 64, 22, 12);
    fitText(c, 'ガス', 40, 60, w - 50, 22, { font: FONTS.gothic, color: '#555' });
  });
  // --- AC outdoor unit front (fan grille)
  add('acfront', 256, 176, (c, w, h) => {
    c.fillStyle = '#ecebe6'; c.fillRect(0, 0, w, h);
    const r = h * 0.4, x = w * 0.37, y = h * 0.5;
    c.fillStyle = '#5a5f68'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.strokeStyle = '#d7d7d2'; c.lineWidth = 3;
    for (let k = 1; k < 6; k++) { c.beginPath(); c.arc(x, y, (r * k) / 6, 0, 7); c.stroke(); }
    for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(k * 0.785) * r, y + Math.sin(k * 0.785) * r); c.stroke(); }
    c.fillStyle = '#d0d0cb'; for (let k = 0; k < 12; k++) c.fillRect(w * 0.76, 20 + k * 11, w * 0.18, 5);
    c.strokeStyle = '#b9b9b4'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
  });
  add('heater', 112, 144, (c, w, h) => {
    c.fillStyle = '#f1f1ee'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9cbcc'; for (let k = 0; k < 7; k++) c.fillRect(14, 20 + k * 8, w - 28, 4);
    c.fillStyle = '#8b9096'; roundRect(c, w / 2 - 20, h - 42, 40, 22, 5); c.fill();
    c.strokeStyle = '#c5c7c9'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
  });
  // --- mailbox front, milk box
  add('mailbox', 128, 112, (c, w, h) => {
    c.fillStyle = '#e9e7e1'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#35373b'; roundRect(c, 16, 18, w - 32, 12, 5); c.fill();
    fitText(c, 'POST', 20, 44, w - 40, 26, { font: FONTS.latin, color: '#6a6e74', weight: 700, letterSpacing: 4 });
    c.fillStyle = '#bdbab2'; c.fillRect(w / 2 - 6, 80, 12, 16);
  });
  add('milkbox', 96, 96, (c, w, h) => {
    c.fillStyle = '#f2ede0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6f8fbf'; c.lineWidth = 5; c.strokeRect(5, 5, w - 10, h - 10);
    fitText(c, '牛乳', 10, 18, w - 20, 40, { font: FONTS.round, color: '#3f63a6', weight: 700 });
    fitText(c, 'MILK', 10, 60, w - 20, 22, { font: FONTS.latin, color: '#3f63a6', weight: 700 });
  });
  // --- stickers / small signs
  add('dogSign', 128, 80, (c, w, h) => {
    c.fillStyle = '#fbe36a'; roundRect(c, 0, 0, w, h, 8); c.fill();
    fitText(c, '犬がいます', 8, 8, w - 16, h * 0.5, { font: FONTS.gothic, color: '#222', weight: 700 });
    fitText(c, 'ワン！', 8, h * 0.56, w - 16, h * 0.36, { font: FONTS.round, color: '#c0392b', weight: 700 });
  });
  add('salesSign', 128, 56, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d33'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
    fitText(c, 'セールスお断り', 8, 8, w - 16, h - 16, { font: FONTS.gothic, color: '#d33', weight: 700 });
  });
  add('bouhan', 96, 96, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
    c.strokeStyle = '#2f5aa8'; c.lineWidth = 6; c.stroke();
    fitText(c, '防犯', 14, 18, w - 28, 34, { font: FONTS.gothic, color: '#2f5aa8', weight: 700 });
    fitText(c, '協力の家', 14, 54, w - 28, 22, { font: FONTS.gothic, color: '#2f5aa8', weight: 700 });
  });
  add('newspaper', 128, 64, (c, w, h) => {
    c.fillStyle = '#ecebe4'; c.fillRect(0, 0, w, h);
    fitText(c, '桜ヶ丘新聞', 6, 4, w * 0.6, 18, { font: FONTS.mincho, color: '#222', weight: 700, align: 'left' });
    c.fillStyle = '#9a9a96'; for (let k = 0; k < 5; k++) c.fillRect(6, 28 + k * 7, w - 12 - (k % 2) * 20, 3);
  });
  add('parcel', 128, 96, (c, w, h) => {
    c.fillStyle = '#c9a26d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9c19a'; c.fillRect(0, h * 0.42, w, h * 0.16);
    c.fillStyle = '#f4f2ea'; c.fillRect(w * 0.55, h * 0.64, w * 0.38, h * 0.26);
    c.fillStyle = '#6a6a6a'; for (let k = 0; k < 3; k++) c.fillRect(w * 0.58, h * 0.68 + k * 6, w * 0.3, 2);
    c.fillStyle = '#6e8f4e'; fitText(c, 'こわれもの', 6, 6, w * 0.5, 16, { font: FONTS.gothic, color: '#a33', align: 'left' });
  });
  add('notice', 96, 128, (c, w, h) => {
    c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e98aa7'; c.fillRect(0, 0, w, 22);
    fitText(c, '町内会', 4, 2, w - 8, 18, { font: FONTS.gothic, color: '#fff', weight: 700 });
    fitText(c, '春の清掃', 6, 28, w - 12, 20, { font: FONTS.round, color: '#333', weight: 700 });
    c.fillStyle = '#999'; for (let k = 0; k < 6; k++) c.fillRect(8, 56 + k * 10, w - 16 - (k % 3) * 10, 3);
  });
  // --- apartment name board (north-row アパート)
  add('aptSign', 512, 114, (c, w, h) => {
    c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6f9fc4'; c.fillRect(0, h - 14, w, 6);
    fitText(c, 'コーポ春風', 18, 8, w * 0.62, h * 0.66, { font: FONTS.round, color: '#3b5f7e', weight: 700, letterSpacing: 6 });
    fitText(c, 'CORPO HARUKAZE', w * 0.64, h * 0.2, w * 0.34, h * 0.34, { font: FONTS.latin, color: '#6f8196', weight: 700 });
    fitText(c, '桜ヶ丘2-9', w * 0.64, h * 0.52, w * 0.34, h * 0.26, { font: FONTS.gothic, color: '#8a8e93', weight: 400 });
  });
  // --- alpha patterns: balcony bars, mesh fence, frosted lattice, shutter slats
  add('bars', 256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    for (let x = 6; x < w; x += 25.6) c.fillRect(x, 0, 7, h);
  });
  add('mesh', 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff'; c.lineWidth = 3.2;
    for (let k = -8; k < 16; k++) {
      c.beginPath(); c.moveTo(k * 32, 0); c.lineTo(k * 32 + h, h); c.stroke();
      c.beginPath(); c.moveTo(k * 32, h); c.lineTo(k * 32 + h, 0); c.stroke();
    }
  });
  add('lattice', 128, 256, (c, w, h) => {
    c.fillStyle = '#eef0ee'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6b4a34';
    for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 5, h);
    c.fillRect(0, 0, w, 8); c.fillRect(0, h - 8, w, 8); c.fillRect(0, h * 0.5, w, 6);
  });
  add('shutter', 128, 128, (c, w, h) => {
    c.fillStyle = '#e4e2dc'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) { c.fillStyle = 'rgba(90,90,100,0.45)'; c.fillRect(0, y + 7, w, 3); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(0, y, w, 2); }
  });
  add('louvre', 128, 128, (c, w, h) => {
    c.fillStyle = '#d7dee3'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(0, y, w, 4); c.fillStyle = 'rgba(80,90,105,0.5)'; c.fillRect(0, y + 12, w, 4); }
  });
  add('curtainLace', 128, 128, (c, w, h) => {
    c.fillStyle = '#f7f4ee'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(200,190,180,0.6)'; c.lineWidth = 2;
    for (let x = 8; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.6, x, h); c.stroke(); }
    for (let k = 0; k < 10; k++) { c.beginPath(); c.arc(8 + (k % 5) * 28, h - 16 - Math.floor(k / 5) * 18, 5, 0, 7); c.stroke(); }
  });
  add('sudare', 128, 192, (c, w, h) => {
    c.fillStyle = '#c9ae7c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { c.fillStyle = y % 8 ? 'rgba(120,90,50,0.3)' : 'rgba(255,240,210,0.35)'; c.fillRect(0, y, w, 2); }
    c.fillStyle = '#6a4a2c'; c.fillRect(20, 0, 3, h); c.fillRect(w - 23, 0, 3, h);
  });

  const texture = drawTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    for (const [x, y, w, h, draw] of jobs) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      draw(ctx, w, h);
      ctx.restore();
    }
  });
  const uv = (name) => {
    const c = cells.get(name);
    if (!c) throw new Error(`decal ${name}?`);
    const [x, y, w, h] = c;
    const e = 1.5; // inset against bleeding
    return [(x + e) / S, 1 - (y + h - e) / S, (x + w - e) / S, 1 - (y + e) / S];
  };
  return { texture, uv };
}

// ---------------------------------------------------------------------------
// grime atlas (soft, transparent)
// ---------------------------------------------------------------------------
export function makeGrimeAtlas() {
  const S = 512;
  const rnd = seeded(99);
  const cells = {
    streak0: [0, 0, 128, 256], streak1: [128, 0, 128, 256], streak2: [256, 0, 128, 256], rust: [384, 0, 64, 256], drip: [448, 0, 64, 256],
    moss0: [0, 256, 256, 96], moss1: [256, 256, 256, 96],
    crack0: [0, 352, 128, 160], crack1: [128, 352, 128, 160], stain: [256, 352, 256, 160],
  };
  const texture = drawTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    const streak = ([x, y, w, h], n, color) => {
      for (let i = 0; i < n; i++) {
        const sx = x + 8 + rnd() * (w - 20), sw = 3 + rnd() * 9, len = h * (0.35 + rnd() * 0.6);
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, color(0.28 + rnd() * 0.2));
        g.addColorStop(1, color(0));
        ctx.fillStyle = g;
        ctx.fillRect(sx, y, sw, len);
      }
    };
    const grey = (a) => `rgba(98,96,104,${a})`;
    streak(cells.streak0, 9, grey);
    streak(cells.streak1, 5, grey);
    streak(cells.streak2, 14, (a) => `rgba(110,106,100,${a * 0.8})`);
    streak(cells.rust, 3, (a) => `rgba(150,96,60,${a})`);
    streak(cells.drip, 2, (a) => `rgba(80,86,96,${a * 1.2})`);
    for (const k of ['moss0', 'moss1']) {
      const [x, y, w, h] = cells[k];
      for (let i = 0; i < 26; i++) {
        const mx = x + 20 + rnd() * (w - 40), r = 8 + rnd() * 26;
        const g = ctx.createRadialGradient(mx, y + h, 0, mx, y + h, r * 1.8);
        g.addColorStop(0, `rgba(96,128,78,${0.35 + rnd() * 0.25})`);
        g.addColorStop(1, 'rgba(96,128,78,0)');
        ctx.fillStyle = g;
        ctx.fillRect(mx - r * 2, y, r * 4, h);
      }
    }
    for (const k of ['crack0', 'crack1']) {
      const [x, y, w, h] = cells[k];
      ctx.strokeStyle = 'rgba(70,66,70,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let px = x + w * 0.5, py = y + 6;
      ctx.moveTo(px, py);
      while (py < y + h - 10) {
        px += (rnd() - 0.5) * 18; py += 8 + rnd() * 12;
        px = Math.min(x + w - 6, Math.max(x + 6, px));
        ctx.lineTo(px, py);
        if (rnd() < 0.25) { ctx.moveTo(px, py); ctx.lineTo(px + (rnd() - 0.5) * 30, py + 10 + rnd() * 10); ctx.moveTo(px, py); }
      }
      ctx.stroke();
    }
    {
      const [x, y, w, h] = cells.stain;
      for (let i = 0; i < 14; i++) {
        const sx = x + 20 + rnd() * (w - 40), sy = y + 10 + rnd() * (h - 20), r = 14 + rnd() * 40;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, 'rgba(120,116,110,0.18)');
        g.addColorStop(1, 'rgba(120,116,110,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
    }
  });
  const uv = (name) => {
    const [x, y, w, h] = cells[name];
    return [(x + 1) / S, 1 - (y + h - 1) / S, (x + w - 1) / S, 1 - (y + 1) / S];
  };
  return { texture, uv };
}

// ---------------------------------------------------------------------------
// laundry atlas
// ---------------------------------------------------------------------------
/** Laundry items: name -> {w, h metres, hang: 'hanger'|'fold'|'pinch'} */
export const LAUNDRY = {
  shirt: { w: 0.62, h: 0.78, hang: 'hanger' },
  shirtBlue: { w: 0.62, h: 0.78, hang: 'hanger' },
  sailor: { w: 0.62, h: 0.66, hang: 'hanger' },
  blazer: { w: 0.62, h: 0.8, hang: 'hanger' },
  skirt: { w: 0.48, h: 0.58, hang: 'hanger' },
  tshirtPink: { w: 0.56, h: 0.64, hang: 'hanger' },
  tshirtYellow: { w: 0.56, h: 0.64, hang: 'hanger' },
  tshirtMint: { w: 0.56, h: 0.64, hang: 'hanger' },
  kids: { w: 0.4, h: 0.46, hang: 'hanger' },
  towelPink: { w: 0.36, h: 0.5, hang: 'fold' },
  towelBlue: { w: 0.36, h: 0.5, hang: 'fold' },
  towelWhite: { w: 0.36, h: 0.5, hang: 'fold' },
  towelYellow: { w: 0.36, h: 0.5, hang: 'fold' },
  bathTowel: { w: 0.62, h: 0.62, hang: 'fold' },
  jeans: { w: 0.44, h: 0.9, hang: 'fold' },
  sheet: { w: 1.25, h: 0.95, hang: 'fold' },
  futon: { w: 1.0, h: 0.8, hang: 'rail' },
  futonBlue: { w: 1.0, h: 0.8, hang: 'rail' },
  pinch: { w: 0.5, h: 0.52, hang: 'pinch' },
};

export function makeLaundryAtlas() {
  const S = 1024;
  const cells = new Map();
  const layout = [
    ['shirt', 0, 0, 160, 200], ['shirtBlue', 160, 0, 160, 200], ['sailor', 320, 0, 160, 200], ['blazer', 480, 0, 160, 200],
    ['skirt', 640, 0, 128, 160], ['kids', 768, 0, 128, 160], ['tshirtPink', 0, 208, 144, 168], ['tshirtYellow', 144, 208, 144, 168],
    ['tshirtMint', 288, 208, 144, 168], ['towelPink', 432, 208, 96, 136], ['towelBlue', 528, 208, 96, 136], ['towelWhite', 624, 208, 96, 136],
    ['towelYellow', 720, 208, 96, 136], ['bathTowel', 816, 208, 160, 160], ['jeans', 0, 384, 112, 224], ['sheet', 112, 384, 320, 240],
    ['futon', 432, 384, 256, 208], ['futonBlue', 688, 384, 256, 208], ['pinch', 0, 640, 200, 208],
  ];
  const outline = 'rgba(90,86,110,0.9)';
  const texture = drawTexture(S, S, (c) => {
    c.clearRect(0, 0, S, S);
    for (const [name, x, y, w, h] of layout) {
      cells.set(name, [x, y, w, h]);
      c.save();
      c.translate(x, y);
      c.beginPath(); c.rect(0, 0, w, h); c.clip();
      drawLaundry(c, name, w, h, outline);
      c.restore();
    }
  });
  const uv = (name) => {
    const [x, y, w, h] = cells.get(name);
    return [(x + 1) / S, 1 - (y + h - 1) / S, (x + w - 1) / S, 1 - (y + 1) / S];
  };
  return { texture, uv };
}

function hangerHook(c, w) {
  c.strokeStyle = '#8a8f98'; c.lineWidth = 3;
  c.beginPath(); c.arc(w / 2, 9, 6, Math.PI, Math.PI * 2.3); c.stroke();
  c.beginPath(); c.moveTo(w / 2, 15); c.lineTo(w * 0.12, 30); c.lineTo(w * 0.88, 30); c.closePath(); c.stroke();
}

function shirtShape(c, w, h, top, sleeve = 0.22, len = 1) {
  c.beginPath();
  c.moveTo(w * 0.36, top);
  c.lineTo(w * 0.1, top + h * 0.05);
  c.lineTo(w * 0.02, top + h * sleeve * 1.5);
  c.lineTo(w * 0.17, top + h * sleeve * 1.7);
  c.lineTo(w * 0.2, top + h * 0.25);
  c.lineTo(w * 0.2, top + (h - top) * len - 2);
  c.lineTo(w * 0.8, top + (h - top) * len - 2);
  c.lineTo(w * 0.8, top + h * 0.25);
  c.lineTo(w * 0.83, top + h * sleeve * 1.7);
  c.lineTo(w * 0.98, top + h * sleeve * 1.5);
  c.lineTo(w * 0.9, top + h * 0.05);
  c.lineTo(w * 0.64, top);
  c.quadraticCurveTo(w * 0.5, top + h * 0.07, w * 0.36, top);
  c.closePath();
}

function drawLaundry(c, name, w, h, outline) {
  c.lineJoin = 'round';
  const fillOut = (fill) => { c.fillStyle = fill; c.fill(); c.strokeStyle = outline; c.lineWidth = 2.5; c.stroke(); };
  const folds = (x0, x1, y0, y1, n, col) => {
    c.strokeStyle = col; c.lineWidth = 2;
    for (let k = 1; k < n; k++) { const x = x0 + ((x1 - x0) * k) / n; c.beginPath(); c.moveTo(x, y0 + 6); c.lineTo(x + 3, y1 - 4); c.stroke(); }
  };
  if (['shirt', 'shirtBlue', 'sailor', 'blazer', 'tshirtPink', 'tshirtYellow', 'tshirtMint', 'kids'].includes(name)) {
    hangerHook(c, w);
    const col = { shirt: '#fbfbf8', shirtBlue: '#dde9f6', sailor: '#fbfbf8', blazer: '#34405e', tshirtPink: '#f8c9d6', tshirtYellow: '#f7e39a', tshirtMint: '#c8ead9', kids: '#a9d3f0' }[name];
    const tee = name.startsWith('tshirt') || name === 'kids';
    shirtShape(c, w, h, 28, tee ? 0.16 : 0.24, 1);
    fillOut(col);
    folds(w * 0.22, w * 0.78, h * 0.35, h - 4, 4, 'rgba(160,160,190,0.35)');
    if (name === 'shirt' || name === 'shirtBlue') {
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(w * 0.36, 28); c.lineTo(w * 0.5, 44); c.lineTo(w * 0.64, 28); c.lineTo(w * 0.58, 26); c.lineTo(w * 0.5, 36); c.lineTo(w * 0.42, 26); c.closePath(); c.fill(); c.strokeStyle = outline; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#b8bcc8'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(w * 0.5, 54 + k * 26, 2.2, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(140,140,170,0.5)'; c.beginPath(); c.moveTo(w * 0.5, 44); c.lineTo(w * 0.5, h - 6); c.stroke();
    }
    if (name === 'sailor') {
      c.fillStyle = '#2c3657';
      c.beginPath(); c.moveTo(w * 0.28, 28); c.lineTo(w * 0.72, 28); c.lineTo(w * 0.78, 76); c.lineTo(w * 0.5, 100); c.lineTo(w * 0.22, 76); c.closePath(); c.fill();
      c.strokeStyle = '#f4f4f2'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(w * 0.25, 70); c.lineTo(w * 0.5, 92); c.lineTo(w * 0.75, 70); c.stroke();
      c.fillStyle = '#d8434d'; c.beginPath(); c.moveTo(w * 0.42, 96); c.lineTo(w * 0.58, 96); c.lineTo(w * 0.54, 128); c.lineTo(w * 0.5, 118); c.lineTo(w * 0.46, 128); c.closePath(); c.fill();
      c.fillStyle = '#2c3657'; c.fillRect(w * 0.02, 28 + h * 0.3, w * 0.15, 6); c.fillRect(w * 0.83, 28 + h * 0.3, w * 0.15, 6);
    }
    if (name === 'blazer') {
      c.strokeStyle = '#1f283f'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.38, 28); c.lineTo(w * 0.5, 96); c.lineTo(w * 0.62, 28); c.stroke();
      c.fillStyle = '#e8c65a'; for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(w * 0.54, 110 + k * 24, 3, 0, 7); c.fill(); }
      c.fillStyle = '#f2d36b'; c.fillRect(w * 0.26, 80, 16, 10); // school emblem
      c.fillStyle = '#2a3450'; c.fillRect(w * 0.24, h * 0.72, w * 0.16, 4); c.fillRect(w * 0.6, h * 0.72, w * 0.16, 4);
    }
    if (tee) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(w * 0.3, h * 0.5, w * 0.4, 5); }
    return;
  }
  if (name === 'skirt') {
    hangerHook(c, w);
    c.beginPath(); c.moveTo(w * 0.22, 32); c.lineTo(w * 0.78, 32); c.lineTo(w * 0.96, h - 4); c.lineTo(w * 0.04, h - 4); c.closePath();
    fillOut('#3a4668');
    c.strokeStyle = 'rgba(20,24,40,0.6)'; c.lineWidth = 2;
    for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(w * (0.22 + 0.07 * k), 36); c.lineTo(w * (0.04 + 0.115 * k), h - 6); c.stroke(); }
    c.strokeStyle = '#e7e7ef'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.06, h - 18); c.lineTo(w * 0.94, h - 18); c.stroke();
    return;
  }
  if (name.startsWith('towel') || name === 'bathTowel') {
    const base = { towelPink: '#f6c3cf', towelBlue: '#b9d7ef', towelWhite: '#fbfbf7', towelYellow: '#f5e3a0', bathTowel: '#cfe7d8' }[name];
    c.beginPath(); roundRect(c, 3, 3, w - 6, h - 6, 5);
    fillOut(base);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillRect(3, h * 0.78, w - 6, 5); c.fillRect(3, h * 0.84, w - 6, 3);
    c.fillStyle = 'rgba(120,120,160,0.18)'; c.fillRect(3, 3, w - 6, 8);
    if (name === 'towelBlue') { c.fillStyle = '#7fa9d8'; for (let k = 0; k < 3; k++) c.fillRect(3, 20 + k * 22, w - 6, 6); }
    folds(8, w - 8, 12, h - 12, 3, 'rgba(150,150,180,0.25)');
    return;
  }
  if (name === 'jeans') {
    c.beginPath(); c.moveTo(4, 4); c.lineTo(w - 4, 4); c.lineTo(w - 6, h - 4); c.lineTo(w * 0.56, h - 4); c.lineTo(w * 0.5, h * 0.3); c.lineTo(w * 0.44, h - 4); c.lineTo(6, h - 4); c.closePath();
    fillOut('#6f8fb8');
    c.strokeStyle = '#e6b86a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(10, 20); c.lineTo(w - 10, 20); c.stroke();
    return;
  }
  if (name === 'sheet') {
    c.beginPath(); c.rect(3, 3, w - 6, h - 6);
    fillOut('#fbfbf8');
    folds(6, w - 6, 6, h - 6, 7, 'rgba(160,170,200,0.3)');
    c.fillStyle = 'rgba(190,200,230,0.25)'; c.fillRect(3, 3, w - 6, 16);
    return;
  }
  if (name === 'futon' || name === 'futonBlue') {
    c.beginPath(); roundRect(c, 3, 3, w - 6, h - 6, 14);
    fillOut(name === 'futon' ? '#f7dfe6' : '#dbe7f5');
    const flower = name === 'futon' ? '#e98aa7' : '#6f95c8';
    for (let k = 0; k < 16; k++) {
      const fx = 20 + ((k * 53) % (w - 40)), fy = 20 + ((k * 37) % (h - 40));
      c.fillStyle = flower;
      for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(fx + Math.cos(p * 1.256) * 6, fy + Math.sin(p * 1.256) * 6, 4.5, 0, 7); c.fill(); }
      c.fillStyle = '#f7e39a'; c.beginPath(); c.arc(fx, fy, 3, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(150,120,150,0.35)'; c.lineWidth = 2;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(6, (h * k) / 4); c.lineTo(w - 6, (h * k) / 4 + 3); c.stroke(); }
    return;
  }
  if (name === 'pinch') {
    // square pinch hanger with socks, handkerchiefs and small towels
    c.strokeStyle = '#8fb8d8'; c.lineWidth = 4;
    c.beginPath(); c.arc(w / 2, 10, 6, Math.PI, Math.PI * 2.3); c.stroke();
    c.beginPath(); c.moveTo(w / 2, 16); c.lineTo(w / 2, 26); c.stroke();
    c.strokeRect(8, 26, w - 16, 10);
    const items = [['#ffffff', 22, 46], ['#f4b8c8', 22, 40], ['#b0d4ee', 18, 70], ['#fbfbf7', 30, 52], ['#f7e39a', 18, 44], ['#3a4668', 16, 62], ['#ffffff', 22, 48]];
    let x = 12;
    for (const [col, iw, ih] of items) {
      c.fillStyle = '#e0e4ea'; c.fillRect(x + iw / 2 - 2, 36, 4, 8);
      c.beginPath(); roundRect(c, x, 44, iw, ih, 4);
      fillOut(col);
      x += iw + 4;
      if (x > w - 20) break;
    }
  }
}
