/**
 * Texture atlas for the shops module + repeating surface textures.
 *
 * Atlas: one 2048-wide canvas packed with a skyline (bottom-left) packer.  Every sign,
 * poster, product front, noren print, flower card... is painted into its own
 * padded cell; `add()` returns a rect whose UVs are filled in by `finish()`
 * (after the final canvas height is known).  Cell edges are extruded into the
 * padding so mipmaps do not bleed neighbouring cells.  A white cell provides
 * the texel used by all flat-coloured geometry.
 *
 * Surfaces (tileable, near-white, tinted by vertex colours):
 *   plaster  hand-painted stucco with soft blotches and faint rain streaks
 *   wood     vertical boards with simplified grain (1 repeat = 1 m)
 *   rows     horizontal courses (roof tiles / lap siding / shutters)
 */
import * as THREE from 'three';
import { drawTexture, seeded } from '../../core/canvasTex.js';

export class Atlas {
  constructor(width = 2048, maxHeight = 4096, pad = 4, cellScale = 1) {
    this.W = width;
    this.cellScale = cellScale;
    this.maxH = maxHeight;
    this.pad = pad;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = maxHeight;
    this.ctx = this.canvas.getContext('2d');
    this.rects = new Map();
    this.x = 0;
    this.y = 0;
    this.rowH = 0;
    this.used = 0;
    this.white = this.add('white', 16, 16, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); });
  }

  /**
   * Reserve a w x h cell drawn by draw(ctx, w, h) (origin = cell corner, clipped).
   * Drawing is deferred to finish() so cells can be packed tallest-first.
   * Returns the rect (UVs valid after finish()).
   */
  add(name, w, h, draw) {
    // larger cells are rasterised slightly smaller (drawing code keeps its own units)
    const k = w * h >= 16384 ? this.cellScale : 1;
    const r = { name, px: 0, py: 0, w: Math.ceil(w * k), h: Math.ceil(h * k), lw: w, lh: h, k, u0: 0, v0: 0, u1: 1, v1: 1, draw };
    this.rects.set(name, r);
    return r;
  }

  /** Skyline-pack every queued cell (tallest first, lowest free spot) and paint it. */
  _pack() {
    const p = this.pad, G = 4; // skyline granularity (px)
    const cols = this.W / G;
    const sky = new Int32Array(cols);
    const list = [...this.rects.values()].sort((a, b) => b.h - a.h || b.w - a.w);
    for (const r of list) {
      const cw = Math.ceil((r.w + p * 2) / G);
      let bestX = -1, bestY = Infinity;
      for (let x = 0; x + cw <= cols; x++) {
        let y = 0;
        for (let k = x; k < x + cw; k++) if (sky[k] > y) y = sky[k];
        if (y < bestY) { bestY = y; bestX = x; }
      }
      const top = bestY + r.h + p * 2;
      if (top > this.maxH) throw new Error(`shops atlas full at ${r.name}`);
      for (let k = bestX; k < bestX + cw; k++) sky[k] = top;
      r.px = bestX * G + p;
      r.py = bestY + p;
      this.used = Math.max(this.used, top);
      const c = this.ctx;
      c.save();
      c.translate(r.px, r.py);
      c.beginPath();
      c.rect(0, 0, r.w, r.h);
      c.clip();
      c.scale(r.k, r.k);
      r.draw(c, r.lw, r.lh);
      c.restore();
      this._extrude(r.px, r.py, r.w, r.h);
      delete r.draw;
    }
  }

  get(name) {
    const r = this.rects.get(name);
    if (!r) throw new Error(`shops atlas: no cell ${name}`);
    return r;
  }

  /** Sub-rect of a cell in cell-fraction coordinates (fx, fy from top-left). */
  sub(name, fx, fy, fw, fh) {
    const r = this.get(name);
    return { parent: r, fx, fy, fw, fh, get u0() { return r.u0 + (r.u1 - r.u0) * fx; }, get u1() { return r.u0 + (r.u1 - r.u0) * (fx + fw); }, get v1() { return r.v1 - (r.v1 - r.v0) * fy; }, get v0() { return r.v1 - (r.v1 - r.v0) * (fy + fh); } };
  }

  /** Grid cell (i of cols x rows, row-major from top-left) of a cell. */
  cell(name, i, cols, rows) {
    const cx = i % cols, cy = Math.floor(i / cols) % rows;
    return this.sub(name, cx / cols, cy / rows, 1 / cols, 1 / rows);
  }

  _extrude(x, y, w, h) {
    const c = this.ctx, p = this.pad, cv = this.canvas;
    c.drawImage(cv, x, y, w, 1, x, y - p, w, p);
    c.drawImage(cv, x, y + h - 1, w, 1, x, y + h, w, p);
    c.drawImage(cv, x, y - p, 1, h + p * 2, x - p, y - p, p, h + p * 2);
    c.drawImage(cv, x + w - 1, y - p, 1, h + p * 2, x + w, y - p, p, h + p * 2);
  }

  /** Crop to a power-of-two height, create the texture and resolve every rect's UVs. */
  finish() {
    this._pack();
    let H = 256;
    while (H < this.used) H *= 2;
    const out = document.createElement('canvas');
    out.width = this.W;
    out.height = H;
    out.getContext('2d').drawImage(this.canvas, 0, 0);
    this.canvas = out;
    const W = this.W;
    for (const r of this.rects.values()) {
      // inset half a texel to stay inside the cell
      r.u0 = (r.px + 0.5) / W;
      r.u1 = (r.px + r.w - 0.5) / W;
      r.v1 = 1 - (r.py + 0.5) / H;
      r.v0 = 1 - (r.py + r.h - 0.5) / H;
    }
    const w = this.white;
    this.whiteUV = { u: (w.u0 + w.u1) / 2, v: (w.v0 + w.v1) / 2 };
    const t = new THREE.CanvasTexture(out);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    this.texture = t;
    this.height = H;
    return t;
  }
}

// ---------------------------------------------------------------------------
// repeating surfaces
// ---------------------------------------------------------------------------

/** Hand-painted plaster (1 repeat = 2 m).  Near-white, tinted by vertex colour. */
export function plasterTexture() {
  const S = 512;
  const rnd = seeded(4101);
  return drawTexture(S, S, (c) => {
    c.fillStyle = '#f7f5f0';
    c.fillRect(0, 0, S, S);
    const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
    for (let i = 0; i < 60; i++) {
      const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 120;
      const light = rnd() < 0.55;
      wrap((ox, oy) => {
        const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, light ? 'rgba(255,255,253,0.35)' : 'rgba(200,194,186,0.09)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
    // trowel arcs
    c.lineWidth = 1.2;
    for (let i = 0; i < 220; i++) {
      const x = rnd() * S, y = rnd() * S, l = 10 + rnd() * 26;
      c.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(170,164,156,0.07)';
      c.beginPath();
      c.arc(x, y + l, l, -Math.PI * 0.72, -Math.PI * 0.28);
      c.stroke();
    }
    // faint rain streaks (soft vertical)
    for (let i = 0; i < 9; i++) {
      const x = rnd() * S, w = 6 + rnd() * 14, h = 90 + rnd() * 220, y = rnd() * S;
      wrap((ox, oy) => {
        const g = c.createLinearGradient(0, y + oy, 0, y + oy + h);
        g.addColorStop(0, 'rgba(150,146,150,0.06)');
        g.addColorStop(1, 'rgba(150,146,150,0)');
        c.fillStyle = g;
        c.fillRect(x + ox, y + oy, w, h);
      });
    }
  }, { wrap: true });
}

/** Vertical wooden boards with simplified grain (1 repeat = 1 m, 5 boards). */
export function woodTexture() {
  const S = 256;
  const rnd = seeded(5202);
  return drawTexture(S, S, (c) => {
    const bw = S / 5;
    for (let i = 0; i < 5; i++) {
      const l = 0.9 + rnd() * 0.12;
      const v = Math.round(236 * l);
      c.fillStyle = `rgb(${v},${Math.round(v * 0.97)},${Math.round(v * 0.93)})`;
      c.fillRect(i * bw, 0, bw, S);
      // grain: long soft wavy lines
      for (let k = 0; k < 5; k++) {
        const x0 = i * bw + 4 + rnd() * (bw - 8);
        c.strokeStyle = `rgba(120,90,60,${0.06 + rnd() * 0.08})`;
        c.lineWidth = 1 + rnd() * 1.5;
        c.beginPath();
        for (let y = -4; y <= S + 4; y += 8) {
          const x = x0 + Math.sin(y * 0.03 + k + i) * 2.5;
          if (y < 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
      // a knot now and then
      if (rnd() < 0.5) {
        const kx = i * bw + bw * (0.3 + rnd() * 0.4), ky = rnd() * S;
        c.strokeStyle = 'rgba(110,80,55,0.25)';
        c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(kx, ky, 3, 7, 0, 0, Math.PI * 2); c.stroke();
      }
      // joint shadow + highlight
      c.fillStyle = 'rgba(70,50,40,0.35)';
      c.fillRect(i * bw, 0, 2, S);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(i * bw + 2, 0, 2, S);
    }
  }, { wrap: true });
}

/** Horizontal courses: roof tiles / lap siding / shutter slats (1 repeat = 1 m, 4 courses). */
export function rowsTexture() {
  const S = 256;
  const rnd = seeded(6303);
  return drawTexture(S, S, (c) => {
    c.fillStyle = '#f2f2f2';
    c.fillRect(0, 0, S, S);
    const rh = S / 4;
    for (let r = 0; r < 4; r++) {
      const y = r * rh;
      const g = c.createLinearGradient(0, y, 0, y + rh);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(0.75, 'rgba(255,255,255,0)');
      g.addColorStop(0.9, 'rgba(90,90,110,0.18)');
      g.addColorStop(1, 'rgba(60,60,80,0.45)');
      c.fillStyle = g;
      c.fillRect(0, y, S, rh);
      // staggered joints (subtle)
      const off = (r % 2) * (S / 8);
      c.fillStyle = 'rgba(80,80,100,0.13)';
      for (let x = off; x < S + 1; x += S / 4) c.fillRect(x - 1, y + 3, 2, rh - 6);
      // slight tone variation per course
      c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '120,120,130'},${0.03 + rnd() * 0.05})`;
      c.fillRect(0, y, S, rh);
    }
  }, { wrap: true });
}
