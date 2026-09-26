/**
 * Procedural canvas textures: signage with Japanese text, posters, hand-painted
 * wall variation, noise.  No external image assets are used anywhere in the
 * project — everything is drawn here or in module code with these helpers.
 *
 * Fonts: index.html loads Zen Maru Gothic / M PLUS Rounded 1c / Noto Sans JP /
 * Shippori Mincho from Google Fonts; main.js awaits ensureFonts() before any
 * module builds, so text drawn during build() uses them.  Offline, the stacks
 * below fall back to system Japanese fonts.
 */
import * as THREE from 'three';

export const FONTS = {
  round: '"Zen Maru Gothic", "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", "IPAGothic", "IPAPGothic", "WenQuanYi Zen Hei", sans-serif',
  gothic: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Meiryo", "IPAGothic", "IPAPGothic", "WenQuanYi Zen Hei", sans-serif',
  mincho: '"Shippori Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", "IPAMincho", "IPAPMincho", serif',
  latin: '"Zen Maru Gothic", "Helvetica Neue", Arial, sans-serif',
};

let _anisotropy = 4;
export function setMaxAnisotropy(a) { _anisotropy = Math.min(8, a || 4); }

export async function ensureFonts(timeoutMs = 4000) {
  if (!document.fonts || !document.fonts.load) return;
  const loads = [
    '700 32px "Zen Maru Gothic"', '500 32px "Zen Maru Gothic"',
    '800 32px "M PLUS Rounded 1c"',
    '700 32px "Noto Sans JP"', '400 32px "Noto Sans JP"',
    '700 32px "Shippori Mincho"',
  ].map((f) => document.fonts.load(f, '桜ヶ丘駅さくらがおかSakuragaoka').catch(() => null));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, timeoutMs))]);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Wrap a canvas as an sRGB texture.
 * opts: repeat [x,y], wrap (bool), mipmaps (default true), nearest
 */
export function toTexture(canvas, opts = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = _anisotropy;
  if (opts.wrap || opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (opts.nearest) {
    t.magFilter = THREE.NearestFilter;
  }
  if (opts.mipmaps === false) {
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  t.needsUpdate = true;
  return t;
}

/** Draw via callback on a fresh canvas and return a texture. draw(ctx, w, h) */
export function drawTexture(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  draw(ctx, w, h, c);
  const t = toTexture(c, opts);
  t.userData.canvas = c;
  return t;
}

/** Rounded rectangle path helper. */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Fit a single line of text into a box. Returns the font size used.
 * opts: font (family stack), weight, color, align ('center'|'left'|'right'),
 * maxSize, stroke {color,width}, letterSpacing (px)
 */
export function fitText(ctx, text, x, y, w, h, opts = {}) {
  const family = opts.font || FONTS.round;
  const weight = opts.weight || 700;
  let size = Math.min(opts.maxSize || h, h);
  ctx.font = `${weight} ${size}px ${family}`;
  let tw = measure(ctx, text, opts.letterSpacing || 0);
  if (tw > w) {
    size = Math.max(6, Math.floor(size * (w / tw)));
    ctx.font = `${weight} ${size}px ${family}`;
    tw = measure(ctx, text, opts.letterSpacing || 0);
  }
  ctx.textBaseline = 'middle';
  const align = opts.align || 'center';
  let sx = x;
  if (align === 'center') sx = x + (w - tw) / 2;
  else if (align === 'right') sx = x + w - tw;
  const cy = y + h / 2 + size * 0.04;
  drawSpaced(ctx, text, sx, cy, opts.letterSpacing || 0, opts);
  return size;
}

function measure(ctx, text, spacing) {
  if (!spacing) return ctx.measureText(text).width;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

function drawSpaced(ctx, text, x, y, spacing, opts) {
  ctx.textAlign = 'left';
  if (!spacing) {
    if (opts.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = opts.stroke.color; ctx.lineWidth = opts.stroke.width; ctx.strokeText(text, x, y); }
    ctx.fillStyle = opts.color || '#222';
    ctx.fillText(text, x, y);
    return;
  }
  let cx = x;
  for (const ch of text) {
    if (opts.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = opts.stroke.color; ctx.lineWidth = opts.stroke.width; ctx.strokeText(ch, cx, y); }
    ctx.fillStyle = opts.color || '#222';
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/**
 * Vertical Japanese text (縦書き) centred in a column.
 * Draws each character stacked; long-vowel marks and small kana are rotated/adjusted.
 */
export function verticalText(ctx, text, cx, top, bottom, opts = {}) {
  const chars = [...text];
  const family = opts.font || FONTS.mincho;
  const weight = opts.weight || 700;
  const avail = bottom - top;
  let size = Math.min(opts.maxSize || 200, (avail / chars.length) * 0.92);
  if (opts.width) size = Math.min(size, opts.width);
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = Math.min(size * 1.08, avail / chars.length);
  const start = top + (avail - step * chars.length) / 2 + step / 2;
  chars.forEach((ch, i) => {
    const y = start + i * step;
    ctx.save();
    ctx.translate(cx, y);
    if ('ー〜－…—'.includes(ch)) ctx.rotate(Math.PI / 2);
    if (opts.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = opts.stroke.color; ctx.lineWidth = opts.stroke.width; ctx.strokeText(ch, 0, 0); }
    ctx.fillStyle = opts.color || '#222';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  return size;
}

/**
 * Simple sign texture: background colour (optionally rounded / bordered) with
 * one or more lines of text.
 * lines: [{text, size (fraction of height), color, font, weight, y (0..1 centre)}]
 */
export function signTexture({ w = 512, h = 128, bg = '#ffffff', border, radius = 0, lines = [], padding = 0.06, draw } = {}) {
  return drawTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    if (bg) {
      ctx.fillStyle = bg;
      roundRect(ctx, 0, 0, w, h, radius);
      ctx.fill();
    }
    if (border) {
      ctx.strokeStyle = border.color;
      ctx.lineWidth = border.width;
      roundRect(ctx, border.width / 2, border.width / 2, w - border.width, h - border.width, Math.max(0, radius - border.width / 2));
      ctx.stroke();
    }
    const pad = w * padding;
    lines.forEach((l, i) => {
      const lh = h * (l.size || 0.6);
      const cy = h * (l.y ?? (lines.length === 1 ? 0.5 : (i + 0.5) / lines.length));
      fitText(ctx, l.text, pad + (l.x || 0) * w, cy - lh / 2, w - pad * 2 - (l.x || 0) * w, lh, { font: l.font, weight: l.weight, color: l.color, align: l.align, letterSpacing: l.spacing, stroke: l.stroke });
    });
    if (draw) draw(ctx, w, h);
  });
}

/** Seeded value noise canvas (tileable), for hand-painted variation. */
export function noiseTexture({ size = 256, scale = 8, octaves = 3, base = '#ffffff', variation = 0.06, seed = 1, tint = null, repeat } = {}) {
  const rnd = seeded(seed);
  const grid = [];
  const N = scale;
  for (let i = 0; i < N * N * 4; i++) grid.push(rnd());
  const val = (x, y, n) => {
    const xi = Math.floor(x) % n, yi = Math.floor(y) % n;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const g = (a, b) => grid[((b % n) * n + (a % n)) % grid.length];
    const s = (t) => t * t * (3 - 2 * t);
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
  };
  return drawTexture(size, size, (ctx) => {
    const img = ctx.createImageData(size, size);
    const bc = new THREE.Color(base);
    const tc = tint ? new THREE.Color(tint) : null;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0, amp = 1, tot = 0;
        for (let o = 0; o < octaves; o++) {
          const n = N * (1 << o);
          v += val((x / size) * n, (y / size) * n, n) * amp;
          tot += amp;
          amp *= 0.5;
        }
        v = v / tot - 0.5;
        let r = bc.r + v * variation, g = bc.g + v * variation, b = bc.b + v * variation;
        if (tc && v > 0.15) { const k = (v - 0.15) * 2; r += (tc.r - r) * k; g += (tc.g - g) * k; b += (tc.b - b) * k; }
        const i = (y * size + x) * 4;
        img.data[i] = Math.max(0, Math.min(255, Math.round(Math.pow(r, 1 / 2.2) * 255)));
        img.data[i + 1] = Math.max(0, Math.min(255, Math.round(Math.pow(g, 1 / 2.2) * 255)));
        img.data[i + 2] = Math.max(0, Math.min(255, Math.round(Math.pow(b, 1 / 2.2) * 255)));
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { wrap: true, repeat });
}

/** Seeded RNG for canvas drawing. */
export function seeded(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default { FONTS, ensureFonts, makeCanvas, toTexture, drawTexture, roundRect, fitText, verticalText, signTexture, noiseTexture, seeded, setMaxAnisotropy };
