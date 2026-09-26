/**
 * props/atlas.js — a tiny shelf-packing canvas atlas plus drawing helpers
 * shared by the vending / sign texture painters.
 *
 *   const A = new Atlas(2048, 2048);
 *   A.region('name', w, h, (g, w, h) => { ...draw in local px... });
 *   const tex = A.finish();           // CanvasTexture (sRGB, mipmapped)
 *   A.r('name') -> { u0, v0, u1, v1 } // UV rectangle for regionUV()
 *
 * Regions are padded and their border pixels are extended into the padding so
 * mip-mapping does not bleed neighbouring regions into each other.
 */
import * as THREE from 'three';
import { makeCanvas, toTexture, roundRect, fitText, verticalText, FONTS, seeded } from '../../core/canvasTex.js';

export { roundRect, fitText, verticalText, FONTS, seeded };

const PAD = 6;

export class Atlas {
  constructor(w = 2048, h = 2048, name = 'atlas') {
    this.w = w;
    this.h = h;
    this.name = name;
    this.canvas = makeCanvas(w, h);
    this.g = this.canvas.getContext('2d');
    this.g.fillStyle = '#808080';
    this.g.fillRect(0, 0, w, h);
    this.regions = new Map();
    this.x = PAD;
    this.y = PAD;
    this.rowH = 0;
  }

  /** Allocate + draw a region.  draw(g, w, h) paints in local pixel coords. */
  region(name, w, h, draw) {
    w = Math.round(w);
    h = Math.round(h);
    if (this.x + w + PAD > this.w) {
      this.x = PAD;
      this.y += this.rowH + PAD * 2;
      this.rowH = 0;
    }
    if (this.y + h + PAD > this.h) throw new Error(`props atlas "${this.name}" full at region ${name}`);
    const x = this.x, y = this.y;
    this.x += w + PAD * 2;
    this.rowH = Math.max(this.rowH, h);
    const g = this.g;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    g.restore();
    this.bleed(x, y, w, h);
    // half-texel inset keeps bilinear sampling inside the region
    const r = {
      x, y, w, h,
      u0: (x + 0.5) / this.w, u1: (x + w - 0.5) / this.w,
      v1: 1 - (y + 0.5) / this.h, v0: 1 - (y + h - 0.5) / this.h,
    };
    this.regions.set(name, r);
    return r;
  }

  /** Copy the region's outer pixel rows/columns into the padding ring. */
  bleed(x, y, w, h) {
    const g = this.g;
    for (let i = 1; i <= PAD - 1; i++) {
      g.drawImage(this.canvas, x, y, w, 1, x, y - i, w, 1);
      g.drawImage(this.canvas, x, y + h - 1, w, 1, x, y + h - 1 + i, w, 1);
    }
    for (let i = 1; i <= PAD - 1; i++) {
      g.drawImage(this.canvas, x, y - PAD + 1, 1, h + PAD * 2 - 2, x - i, y - PAD + 1, 1, h + PAD * 2 - 2);
      g.drawImage(this.canvas, x + w - 1, y - PAD + 1, 1, h + PAD * 2 - 2, x + w - 1 + i, y - PAD + 1, 1, h + PAD * 2 - 2);
    }
  }

  /** Region lookup (throws on a typo so mistakes show up immediately). */
  r(name) {
    const r = this.regions.get(name);
    if (!r) throw new Error(`props atlas "${this.name}": no region ${name}`);
    return r;
  }

  finish() {
    const t = toTexture(this.canvas);
    t.name = `props_${this.name}`;
    return t;
  }
}

// ---------------------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------------------

/** Soft hand-painted variation: a few big translucent blotches. */
export function blotches(g, w, h, rnd, color, n = 8, alpha = 0.06, size = 0.4) {
  g.save();
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.5 + rnd());
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(rnd() * w, rnd() * h, (0.3 + rnd()) * w * size, (0.3 + rnd()) * h * size, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Dust / grime rising from the bottom edge + rain streaks + scratches. */
export function grime(g, w, h, rnd, { dust = 0.28, streaks = 10, scratches = 8, from = 0.55 } = {}) {
  g.save();
  const grad = g.createLinearGradient(0, h * from, 0, h);
  grad.addColorStop(0, 'rgba(120,105,90,0)');
  grad.addColorStop(1, `rgba(120,105,90,${dust})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // blotchy splash band near the bottom
  for (let i = 0; i < 26; i++) {
    g.globalAlpha = 0.05 + rnd() * 0.08;
    g.fillStyle = rnd() < 0.5 ? '#8a7a66' : '#9a948a';
    g.beginPath();
    g.ellipse(rnd() * w, h - rnd() * h * 0.12, 4 + rnd() * 16, 2 + rnd() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  // rain streaks from the top
  for (let i = 0; i < streaks; i++) {
    const x = rnd() * w, len = h * (0.15 + rnd() * 0.5), y0 = rnd() * h * 0.3;
    const sg = g.createLinearGradient(0, y0, 0, y0 + len);
    sg.addColorStop(0, 'rgba(110,110,120,0.10)');
    sg.addColorStop(1, 'rgba(110,110,120,0)');
    g.globalAlpha = 1;
    g.fillStyle = sg;
    g.fillRect(x, y0, 1.5 + rnd() * 2.5, len);
  }
  // fine scratches (light + dark pairs)
  g.lineCap = 'round';
  for (let i = 0; i < scratches; i++) {
    const x = rnd() * w, y = h * (0.55 + rnd() * 0.42), a = (rnd() - 0.5) * 0.9, l = 6 + rnd() * 26;
    g.globalAlpha = 0.35;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    g.globalAlpha = 0.18;
    g.strokeStyle = '#4a4a4a';
    g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(x + 1 + Math.cos(a) * l, y + 1 + Math.sin(a) * l); g.stroke();
  }
  g.restore();
}

/** Simple wood grain (planks along x). */
export function woodGrain(g, w, h, rnd, base = '#b58c63', dark = '#8a6446') {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#ffffff', 5, 0.05, 0.5);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const y = rnd() * h;
    g.strokeStyle = dark;
    g.globalAlpha = 0.12 + rnd() * 0.16;
    g.lineWidth = 1 + rnd() * 2.2;
    g.beginPath();
    g.moveTo(0, y);
    const amp = 2 + rnd() * 5, f = 0.01 + rnd() * 0.02, ph = rnd() * 6;
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * f + ph) * amp);
    g.stroke();
  }
  // a couple of knots
  for (let i = 0; i < 2; i++) {
    const x = rnd() * w, y = rnd() * h;
    g.globalAlpha = 0.3;
    g.strokeStyle = dark;
    g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(x, y, 7, 3.5, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(x, y, 3, 1.5, 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

/** Draw a small pushpin. */
export function pin(g, x, y, color = '#e05050') {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.arc(x + 2, y + 2, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = color;
  g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.arc(x - 1.5, y - 1.5, 1.8, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Five-petal sakura blossom. */
export function blossom(g, x, y, r, fill = '#f7b6c8', centre = '#e0708f', rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = fill;
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate((i / 5) * Math.PI * 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(r * 0.55, -r * 0.25, r * 0.6, -r * 0.95, r * 0.12, -r * 1.0);
    g.lineTo(0, -r * 0.86);
    g.lineTo(-r * 0.12, -r * 1.0);
    g.bezierCurveTo(-r * 0.6, -r * 0.95, -r * 0.55, -r * 0.25, 0, 0);
    g.fill();
    g.restore();
  }
  g.fillStyle = centre;
  g.beginPath(); g.arc(0, 0, r * 0.22, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Text helper: font string. */
export const font = (size, weight = 700, family = FONTS.round) => `${weight} ${size}px ${family}`;

/** Centered text line (no fitting). */
export function text(g, s, x, y, size, color = '#222', { weight = 700, family = FONTS.round, align = 'center', stroke } = {}) {
  g.font = font(size, weight, family);
  g.textAlign = align;
  g.textBaseline = 'middle';
  if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke.color; g.lineWidth = stroke.width; g.strokeText(s, x, y); }
  g.fillStyle = color;
  g.fillText(s, x, y);
}

export const TAU = Math.PI * 2;
export { THREE };
