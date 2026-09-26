/**
 * Tiny shelf-packing canvas atlas.  Every sign / poster of the station is
 * drawn into one of two big canvases so they all share a single material
 * (one draw call after baking).
 *
 *   const r = atlas.add(512, 256, (g, w, h) => { ...draw... });   // queued
 *   atlas.pack();                                                 // packs (tallest first) + draws
 *   kit.decal(parent, r, 1.2, 0.6, x, y, z)                       // r now carries its UVs
 *
 * Each region gets a gutter whose pixels replicate the region's border so
 * mip-mapping does not bleed neighbouring signs into each other.
 */
import { makeCanvas, toTexture } from '../../core/canvasTex.js';

const PAD = 5;

export class Atlas {
  constructor(w = 2048, h = 2048) {
    this.w = w;
    this.h = h;
    this.canvas = makeCanvas(w, h);
    this.g = this.canvas.getContext('2d');
    this.g.fillStyle = '#808080';
    this.g.fillRect(0, 0, w, h);
    this.texture = toTexture(this.canvas);
    this.texture.userData.canvas = this.canvas;
    this.queue = [];
    this.subs = [];
    this.used = 0;
  }

  /** Queue a region; draw(ctx2d, w, h) paints it in local pixel coordinates. */
  add(w, h, draw) {
    const region = { atlas: this, aspect: w / h };
    this.queue.push({ w: Math.round(w), h: Math.round(h), draw, region });
    return region;
  }

  /** Sub-rectangle (pixels, relative to region r); resolved in pack(). */
  sub(r, sx, sy, sw, sh) {
    const region = { atlas: this, aspect: sw / sh };
    this.subs.push({ r, sx, sy, sw, sh, region });
    return region;
  }

  setUV(region, x, y, w, h, inset = true) {
    const ix = inset ? 0.5 / this.w : 0, iy = inset ? 0.5 / this.h : 0;
    Object.assign(region, {
      px: { x, y, w, h },
      u0: x / this.w + ix, u1: (x + w) / this.w - ix,
      v1: 1 - y / this.h - iy, v0: 1 - (y + h) / this.h + iy,
    });
  }

  /** Shelf-pack every queued region (tallest first) and draw them. */
  pack() {
    const items = [...this.queue].sort((a, b) => b.h - a.h || b.w - a.w);
    const shelves = [];
    let nextY = 0;
    for (const it of items) {
      const W = it.w + PAD * 2, H = it.h + PAD * 2;
      let s = shelves.find((q) => H <= q.h && q.x + W <= this.w);
      if (!s) {
        if (nextY + H > this.h) throw new Error(`station atlas full (${it.w}x${it.h})`);
        s = { y: nextY, h: H, x: 0 };
        shelves.push(s);
        nextY += H;
      }
      it.x = s.x + PAD;
      it.y = s.y + PAD;
      s.x += W;
    }
    this.used = nextY / this.h;
    const sc = makeCanvas(8, 8);
    const g = this.g;
    for (const it of items) {
      const { x, y, w, h } = it;
      sc.width = w; sc.height = h;
      const c = sc.getContext('2d');
      c.clearRect(0, 0, w, h);
      c.save();
      it.draw(c, w, h);
      c.restore();
      g.clearRect(x - PAD, y - PAD, w + PAD * 2, h + PAD * 2);
      g.drawImage(sc, x, y);
      // gutters: stretch the 1px borders outwards
      g.drawImage(sc, 0, 0, w, 1, x, y - PAD, w, PAD);
      g.drawImage(sc, 0, h - 1, w, 1, x, y + h, w, PAD);
      g.drawImage(sc, 0, 0, 1, h, x - PAD, y, PAD, h);
      g.drawImage(sc, w - 1, 0, 1, h, x + w, y, PAD, h);
      this.setUV(it.region, x, y, w, h);
    }
    for (const s of this.subs) this.setUV(s.region, s.r.px.x + s.sx, s.r.px.y + s.sy, s.sw, s.sh);
    this.queue.length = 0;
    this.subs.length = 0;
    this.texture.needsUpdate = true;
  }
}

export default Atlas;
