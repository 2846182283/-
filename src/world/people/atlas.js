/**
 * people/atlas — one 2048² canvas atlas shared by every character and cat.
 *
 * 8 × 8 cells of 256 px.  Cell 0 is solid white (untextured parts sample it,
 * see mesh.WHITE_UV).  Other cells are allocated on demand:
 *   faces     planar front projection of the head (skin, eyes, brows, blush, mouth)
 *   garments  cylindrical torso wraps (u = 0.5 at the chest centre, v = crotch -> neck)
 *   prints    book covers, shopping-bag logos, cap badges, cat faces ...
 * Painting is deliberately simple and flat: anime colour fields with a few
 * soft gradients, never photographic noise.
 */
import * as THREE from 'three';
import { makeCanvas, toTexture, FONTS, roundRect, fitText } from '../../core/canvasTex.js';

const SIZE = 2048;
const CELL = 256;
const N = SIZE / CELL;

export class PeopleAtlas {
  constructor() {
    this.canvas = makeCanvas(SIZE, SIZE);
    this.g = this.canvas.getContext('2d');
    this.g.fillStyle = '#ffffff';
    this.g.fillRect(0, 0, SIZE, SIZE);
    this.next = 1;
    this.cells = {};
    this.texture = null;
  }

  /** Allocate a cell, paint it via draw(g, 256) in a local coordinate system; returns the uv rect. */
  cell(name, draw) {
    if (this.cells[name]) return this.cells[name];
    const i = this.next++;
    if (i >= N * N) throw new Error('people atlas full');
    const cx = (i % N) * CELL, cy = Math.floor(i / N) * CELL;
    const g = this.g;
    g.save();
    g.translate(cx, cy);
    g.beginPath();
    g.rect(0, 0, CELL, CELL);
    g.clip();
    draw(g, CELL);
    g.restore();
    const pad = 1.5 / SIZE;
    const rect = { u0: cx / SIZE + pad, u1: (cx + CELL) / SIZE - pad, v0: 1 - (cy + CELL) / SIZE + pad, v1: 1 - cy / SIZE - pad };
    rect.map = (u, v) => [rect.u0 + (rect.u1 - rect.u0) * THREE.MathUtils.clamp(u, 0, 1), rect.v0 + (rect.v1 - rect.v0) * THREE.MathUtils.clamp(v, 0, 1)];
    this.cells[name] = rect;
    return rect;
  }

  finish() {
    this.texture = toTexture(this.canvas, { mipmaps: true });
    this.texture.anisotropy = 4;
    return this.texture;
  }
}

// ---------------------------------------------------------------------------
// face painting
// ---------------------------------------------------------------------------
/**
 * Face projection used by body.js: head-local (x, y) with the cranium centre
 * at 0 and radius R maps to cell (u, v):
 *   u = 0.5 + x / (2R),  v = (y + 1.3R) / (2.4R)
 */
export const FACE = { vBottom: -1.3, vSpan: 2.4 };

/**
 * f: { skin, iris, brow, lash, style: 'open'|'soft'|'down'|'smile'|'wide', eyeW, eyeH, lashes (female),
 *      mouth: 'smile'|'neutral'|'open'|'o'|'grin', blush 0..1, elder, man, child, lookX, lookY }
 */
export function paintFace(g, S, f) {
  const px = (x) => (0.5 + x / 2) * S; // x in head radii
  const py = (y) => (1 - (y - FACE.vBottom) / FACE.vSpan) * S;
  const skin = new THREE.Color(f.skin);
  g.fillStyle = f.skin;
  g.fillRect(0, 0, S, S);
  // hair shadow on the upper forehead (anime cue under bangs)
  const shade = '#' + skin.clone().multiplyScalar(0.9).lerp(new THREE.Color('#b9a0c0'), 0.18).getHexString();
  const grad = g.createLinearGradient(0, py(0.62), 0, py(0.28));
  grad.addColorStop(0, shade);
  grad.addColorStop(1, f.skin);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, py(0.28));
  // soft shadow under the jaw sides
  // blush
  if (f.blush) {
    for (const sx of [-1, 1]) {
      const bx = px(sx * 0.52), by = py(-0.5);
      const rg = g.createRadialGradient(bx, by, 1, bx, by, S * 0.085);
      rg.addColorStop(0, `rgba(240,130,140,${0.42 * f.blush})`);
      rg.addColorStop(1, 'rgba(240,130,140,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(bx, by, S * 0.09, S * 0.05, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = `rgba(215,95,110,${0.5 * f.blush})`;
      g.lineWidth = 1.6;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.moveTo(bx + k * 7 - 3, by + 4);
        g.lineTo(bx + k * 7 + 3, by - 4);
        g.stroke();
      }
    }
  }
  const lash = f.lash || '#2b2027';
  const eyeW = (f.eyeW || 0.3) * S / 2; // eye width in px
  const eyeH = (f.eyeH || 0.34) * S / 2;
  const ey = py(-0.2);
  for (const sx of [-1, 1]) {
    const ex = px(sx * (f.eyeX || 0.37));
    eye(g, ex, ey, eyeW, eyeH, sx, f, lash);
  }
  // brows
  g.strokeStyle = f.brow || '#4a3a38';
  g.lineCap = 'round';
  g.lineWidth = f.man ? 4.2 : 2.6;
  for (const sx of [-1, 1]) {
    const bx = px(sx * 0.4), by = py(f.style === 'down' ? 0.1 : 0.14) - (f.browUp || 0) * 6;
    g.beginPath();
    g.moveTo(bx - sx * eyeW * 0.55, by + (f.man ? 1 : 3));
    g.quadraticCurveTo(bx, by - 4, bx + sx * eyeW * 0.6, by + (f.elder ? 5 : 2));
    g.stroke();
  }
  // nose: tiny shadow tick
  g.strokeStyle = '#' + skin.clone().multiplyScalar(0.78).getHexString();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px(0.03), py(-0.46));
  g.lineTo(px(0.06), py(-0.54));
  g.stroke();
  // mouth
  const mx = px(0), my = py(-0.8);
  const mouthCol = '#8a4a4e';
  g.strokeStyle = mouthCol;
  g.fillStyle = '#b2585e';
  g.lineWidth = 2.2;
  switch (f.mouth) {
    case 'open':
      g.beginPath();
      g.moveTo(mx - 9, my - 2);
      g.quadraticCurveTo(mx, my + 13, mx + 9, my - 2);
      g.closePath();
      g.fill();
      g.fillStyle = '#e88f94';
      g.beginPath();
      g.ellipse(mx, my + 5, 5, 2.5, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'o':
      g.beginPath();
      g.ellipse(mx, my + 1, 4, 5, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'grin':
      g.beginPath();
      g.moveTo(mx - 10, my - 3);
      g.quadraticCurveTo(mx, my + 8, mx + 10, my - 3);
      g.stroke();
      break;
    case 'neutral':
      g.beginPath();
      g.moveTo(mx - 6, my);
      g.lineTo(mx + 5, my);
      g.stroke();
      break;
    default: // soft smile
      g.beginPath();
      g.moveTo(mx - 8, my - 2);
      g.quadraticCurveTo(mx, my + 5, mx + 8, my - 2);
      g.stroke();
  }
  if (f.elder) {
    // gentle smile lines + crow's feet
    g.strokeStyle = 'rgba(150,110,100,0.55)';
    g.lineWidth = 1.5;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(px(sx * 0.3), py(-0.55));
      g.quadraticCurveTo(px(sx * 0.36), py(-0.72), px(sx * 0.3), py(-0.86));
      g.stroke();
      g.beginPath();
      g.moveTo(px(sx * 0.62), py(-0.14));
      g.lineTo(px(sx * 0.7), py(-0.1));
      g.moveTo(px(sx * 0.62), py(-0.22));
      g.lineTo(px(sx * 0.7), py(-0.24));
      g.stroke();
    }
  }
}

function eye(g, ex, ey, w, h, sx, f, lash) {
  const style = f.style || 'open';
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (style === 'smile') {
    // closed happy arcs ^ ^
    g.strokeStyle = lash;
    g.lineWidth = 3.4;
    g.beginPath();
    g.moveTo(ex - w * 0.95, ey + h * 0.15);
    g.quadraticCurveTo(ex, ey - h * 0.55, ex + w * 0.95, ey + h * 0.15);
    g.stroke();
    g.restore();
    return;
  }
  const lidTop = style === 'down' ? ey - h * 0.05 : style === 'soft' ? ey - h * 0.62 : ey - h * 0.8;
  const bottom = ey + h * 0.72;
  // eye white (clip region)
  const outer = sx; // outer corner direction
  g.beginPath();
  g.moveTo(ex - outer * w, ey + h * 0.05);
  g.bezierCurveTo(ex - outer * w * 0.8, lidTop - h * 0.05, ex + outer * w * 0.7, lidTop - h * 0.08, ex + outer * w * 1.05, ey - h * 0.15);
  g.bezierCurveTo(ex + outer * w * 0.95, bottom, ex - outer * w * 0.6, bottom + h * 0.05, ex - outer * w, ey + h * 0.05);
  g.closePath();
  g.fillStyle = '#fbf9f7';
  g.fill();
  g.save();
  g.clip();
  // iris with vertical gradient + pupil + highlights
  const iris = new THREE.Color(f.iris || '#6b4a3e');
  const ix = ex + (f.lookX || 0) * w * 0.25, iy = ey + h * 0.08 + (f.lookY || 0) * h * 0.2;
  const iw = w * (f.man ? 0.62 : 0.72), ih = h * 0.86;
  const gr = g.createLinearGradient(0, iy - ih, 0, iy + ih);
  gr.addColorStop(0, '#' + iris.clone().multiplyScalar(0.45).getHexString());
  gr.addColorStop(0.55, '#' + iris.getHexString());
  gr.addColorStop(1, '#' + iris.clone().lerp(new THREE.Color('#ffffff'), 0.35).getHexString());
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(ix, iy, iw, ih, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#' + iris.clone().multiplyScalar(0.35).getHexString();
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = '#' + iris.clone().multiplyScalar(0.25).getHexString();
  g.beginPath();
  g.ellipse(ix, iy + ih * 0.05, iw * 0.45, ih * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  // upper-lid shadow on the eyeball
  g.fillStyle = 'rgba(90,70,110,0.28)';
  g.fillRect(ex - w * 1.2, lidTop - h, w * 2.4, h * 0.55 + h * 0.3);
  // highlights
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(ix - iw * 0.35, iy - ih * 0.38, iw * 0.3, ih * 0.22, -0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(ix + iw * 0.35, iy + ih * 0.42, iw * 0.12, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // upper lash line (thick, with an outer flick for female eyes)
  g.strokeStyle = lash;
  g.fillStyle = lash;
  g.lineWidth = f.man ? 3.2 : 4.2;
  g.beginPath();
  g.moveTo(ex - outer * w * 1.02, ey + h * 0.02);
  g.bezierCurveTo(ex - outer * w * 0.8, lidTop - h * 0.06, ex + outer * w * 0.7, lidTop - h * 0.1, ex + outer * w * 1.1, ey - h * 0.2);
  g.stroke();
  if (f.lashes) {
    g.beginPath();
    g.moveTo(ex + outer * w * 0.95, ey - h * 0.28);
    g.lineTo(ex + outer * w * 1.32, ey - h * 0.45);
    g.lineTo(ex + outer * w * 1.1, ey - h * 0.08);
    g.closePath();
    g.fill();
  }
  // lower lash hint (outer half)
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(ex + outer * w * 0.2, bottom + h * 0.02);
  g.quadraticCurveTo(ex + outer * w * 0.75, bottom - h * 0.04, ex + outer * w * 0.98, ey + h * 0.12);
  g.stroke();
  // double-lid crease
  if (!f.man && style !== 'down') {
    g.strokeStyle = 'rgba(120,80,80,0.45)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(ex - outer * w * 0.5, lidTop - h * 0.32);
    g.quadraticCurveTo(ex + outer * w * 0.3, lidTop - h * 0.42, ex + outer * w * 0.9, ey - h * 0.55);
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// cat faces (head-local projection like FACE, painted on the fur colour)
// ---------------------------------------------------------------------------
export function paintCatFace(g, S, c) {
  const px = (x) => (0.5 + x / 2) * S;
  const py = (y) => (1 - (y - FACE.vBottom) / FACE.vSpan) * S;
  g.fillStyle = c.fur;
  g.fillRect(0, 0, S, S);
  if (c.patches) {
    // calico: orange + black patches on the crown / one eye
    g.fillStyle = c.patches[0];
    g.beginPath();
    g.ellipse(px(-0.45), py(0.35), S * 0.2, S * 0.2, 0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c.patches[1];
    g.beginPath();
    g.ellipse(px(0.5), py(0.45), S * 0.16, S * 0.18, -0.3, 0, Math.PI * 2);
    g.fill();
  }
  if (c.muzzle) {
    g.fillStyle = c.muzzle;
    g.beginPath();
    g.ellipse(px(0), py(-0.62), S * 0.16, S * 0.1, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (c.dog) {
    // shiba: cream cheeks + 'maro' brow dots, round dark eyes with a catch-light
    g.fillStyle = c.muzzle || c.shade;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(px(sx * 0.42), py(-0.55), S * 0.13, S * 0.09, sx * 0.3, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(px(sx * 0.3), py(0.14), S * 0.035, S * 0.024, 0, 0, Math.PI * 2);
      g.fill();
    }
    for (const sx of [-1, 1]) {
      const ex = px(sx * 0.34), ey = py(-0.12);
      g.fillStyle = c.eye;
      g.beginPath();
      g.ellipse(ex, ey, S * 0.042, S * 0.046, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(ex - S * 0.014, ey - S * 0.016, S * 0.012, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }
  // eyes: almond, coloured iris with slit pupil
  for (const sx of [-1, 1]) {
    const ex = px(sx * 0.36), ey = py(-0.12);
    g.fillStyle = c.eye;
    g.beginPath();
    g.ellipse(ex, ey, S * 0.058, S * 0.05, sx * -0.25, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1d1a1e';
    g.beginPath();
    g.ellipse(ex, ey, S * 0.012, S * 0.042, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = c.line || '#2a2226';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(ex, ey, S * 0.058, S * 0.05, sx * -0.25, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ex - S * 0.018, ey - S * 0.018, S * 0.012, 0, Math.PI * 2);
    g.fill();
  }
  // nose + mouth
  g.fillStyle = c.nose || '#e39aa0';
  g.beginPath();
  g.moveTo(px(-0.09), py(-0.5));
  g.lineTo(px(0.09), py(-0.5));
  g.lineTo(px(0), py(-0.6));
  g.closePath();
  g.fill();
  g.strokeStyle = c.line || '#4a3a3e';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px(0), py(-0.6));
  g.lineTo(px(0), py(-0.68));
  g.quadraticCurveTo(px(-0.1), py(-0.78), px(-0.18), py(-0.7));
  g.moveTo(px(0), py(-0.68));
  g.quadraticCurveTo(px(0.1), py(-0.78), px(0.18), py(-0.7));
  g.stroke();
  // whisker dots
  g.fillStyle = c.line || '#6a5a5e';
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.arc(px(sx * (0.2 + k * 0.06)), py(-0.62 - (k % 2) * 0.05), 1.3, 0, Math.PI * 2);
    g.fill();
  }
}

// ---------------------------------------------------------------------------
// garments (torso wraps).  Painter helpers: U(a) maps a signed angle from the
// chest centre (radians, + toward the character's left) to px; Y(y) maps a
// model-space height to px using the torso range [y0, y1].
// ---------------------------------------------------------------------------
export function garmentPainter(y0, y1) {
  return {
    U: (a) => (0.5 + a / (Math.PI * 2)) * CELL,
    Y: (y) => (1 - (y - y0) / (y1 - y0)) * CELL,
  };
}

/** Torso garment designs.  d: { kind, base, ... colours }, P: proportions. */
export function paintGarment(g, S, d, P, y0, y1) {
  const { U, Y } = garmentPainter(y0, y1);
  const W = S;
  g.fillStyle = d.base;
  g.fillRect(0, 0, W, S);
  const cx = U(0);
  const neckY = Y(P.neckBase + 0.01);
  const lighten = (c, k) => '#' + new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k).getHexString();
  const darken = (c, k) => '#' + new THREE.Color(c).multiplyScalar(1 - k).getHexString();
  // soft hand-painted fold hints under the chest / at the waist
  const folds = (col, alpha = 0.18) => {
    g.strokeStyle = col;
    g.globalAlpha = alpha;
    g.lineWidth = 2;
    for (const a of [-0.9, -0.55, 0.55, 0.9]) {
      g.beginPath();
      g.moveTo(U(a), Y(P.waistY + 0.05));
      g.quadraticCurveTo(U(a * 1.05), Y(P.waistY), U(a * 0.95), Y(P.waistY - 0.06));
      g.stroke();
    }
    g.globalAlpha = 1;
  };
  const buttons = (xs, ys, col, r = 3.2) => {
    g.fillStyle = col;
    for (const x of xs) for (const y of ys) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  };
  const vNeck = (bottomY, halfW, fill) => {
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(cx - halfW, neckY - 6);
    g.lineTo(cx, bottomY);
    g.lineTo(cx + halfW, neckY - 6);
    g.closePath();
    g.fill();
  };
  const tie = (topY, botY, col, stripe) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx - 5, topY);
    g.lineTo(cx + 5, topY);
    g.lineTo(cx + 8, botY - 8);
    g.lineTo(cx, botY);
    g.lineTo(cx - 8, botY - 8);
    g.closePath();
    g.fill();
    if (stripe) {
      g.strokeStyle = stripe;
      g.lineWidth = 2;
      for (let yy = topY + 10; yy < botY - 8; yy += 9) { g.beginPath(); g.moveTo(cx - 7, yy + 4); g.lineTo(cx + 7, yy - 3); g.stroke(); }
    }
  };
  const lapels = (col, edge, bottomY, halfW) => {
    // two lapel triangles framing the V
    g.fillStyle = col;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + s * halfW, neckY - 8);
      g.lineTo(cx + s * (halfW + 16), neckY + 18);
      g.lineTo(cx + s * 22, neckY + 40);
      g.lineTo(cx + s * 3, bottomY);
      g.lineTo(cx + s * 2, neckY + 4);
      g.closePath();
      g.fill();
      g.strokeStyle = edge;
      g.lineWidth = 1.5;
      g.stroke();
    }
  };
  switch (d.kind) {
    case 'sailor': {
      folds('#9aa0b8');
      const nv = d.collar, st = d.stripe;
      // back flap (square) + shoulders
      const flapBot = Y(P.chestY - 0.035);
      for (const [a0, a1] of [[-Math.PI, -Math.PI * 0.66], [Math.PI * 0.66, Math.PI]]) {
        g.fillStyle = nv;
        g.fillRect(U(a0), 0, U(a1) - U(a0), flapBot);
      }
      // front V collar bands
      const vb = Y(P.chestY - 0.02);
      g.fillStyle = nv;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * 2, vb);
        g.lineTo(U(s * Math.PI * 0.66), Y(P.shoulderY - 0.02));
        g.lineTo(U(s * Math.PI * 0.66), 0);
        g.lineTo(cx + s * 18, 0);
        g.closePath();
        g.fill();
      }
      // white stripes along the collar edges
      g.strokeStyle = st;
      g.lineWidth = 2.2;
      for (const off of [5, 10]) {
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + s * (2 + off * 0.6), vb - off * 1.2);
          g.lineTo(U(s * (Math.PI * 0.66)) - s * off, Y(P.shoulderY - 0.02) - off);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(U(-Math.PI * 0.66) - off, 0);
        g.lineTo(U(-Math.PI * 0.66) - off, flapBot - off);
        g.lineTo(0, flapBot - off);
        g.moveTo(U(Math.PI * 0.66) + off, 0);
        g.lineTo(U(Math.PI * 0.66) + off, flapBot - off);
        g.lineTo(W, flapBot - off);
        g.stroke();
      }
      // modesty panel (white V fill with a tiny emblem)
      g.fillStyle = lighten(d.base, 0.2);
      g.beginPath();
      g.moveTo(cx - 22, 0);
      g.lineTo(cx, vb - 16);
      g.lineTo(cx + 22, 0);
      g.fill();
      break;
    }
    case 'blazer':
    case 'staff':
    case 'suit': {
      folds(darken(d.base, 0.3), 0.3);
      const vb = Y(d.kind === 'staff' ? P.chestY - 0.03 : P.waistY + 0.04);
      vNeck(vb, 26, d.shirt);
      tie(neckY - 2, vb - 2, d.tie, d.tieStripe);
      // shirt collar points
      g.fillStyle = lighten(d.shirt, 0.3);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * 4, neckY - 2);
        g.lineTo(cx + s * 22, neckY - 8);
        g.lineTo(cx + s * 12, neckY + 12);
        g.closePath();
        g.fill();
      }
      lapels(darken(d.base, 0.08), darken(d.base, 0.35), vb, 28);
      // front opening line below the V + buttons
      g.strokeStyle = darken(d.base, 0.4);
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(cx + 3, vb);
      g.lineTo(cx + 3, S);
      g.stroke();
      const by = d.kind === 'staff' ? [Y(P.chestY - 0.07), Y(P.waistY + 0.03), Y(P.waistY - 0.06)] : [Y(P.waistY - 0.01), Y(P.waistY - 0.09)];
      buttons([cx + 9], by, d.button || '#c9b36a');
      // pockets
      g.strokeStyle = darken(d.base, 0.35);
      g.lineWidth = 2;
      for (const s of [-1, 1]) {
        g.strokeRect(U(s * 0.75) - 16, Y(P.hipsY + 0.02), 32, 6);
      }
      g.strokeRect(U(0.62) - 12, Y(P.chestY + 0.02), 24, 4);
      if (d.emblem) {
        g.fillStyle = d.emblem;
        g.beginPath();
        g.arc(U(0.62), Y(P.chestY - 0.005), 6, 0, Math.PI * 2);
        g.fill();
      }
      if (d.nameplate) {
        g.fillStyle = '#f4f2ea';
        g.fillRect(U(-0.62) - 13, Y(P.chestY + 0.015), 26, 9);
        g.fillStyle = '#3a3a44';
        g.fillRect(U(-0.62) - 9, Y(P.chestY + 0.015) + 3, 18, 3);
      }
      break;
    }
    case 'apron': {
      // white shirt, apron front panel + neck strap + waist tie line
      folds('#b8bcc8', 0.25);
      g.fillStyle = d.shirt;
      g.fillRect(0, 0, W, S);
      g.fillStyle = lighten(d.shirt, 0.4);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * 3, neckY - 2);
        g.lineTo(cx + s * 22, neckY - 8);
        g.lineTo(cx + s * 12, neckY + 12);
        g.closePath();
        g.fill();
      }
      buttons([cx], [Y(P.chestY + 0.05), Y(P.chestY - 0.03)], '#e6e6e6', 2.2);
      g.fillStyle = d.base;
      g.beginPath();
      g.moveTo(U(-0.55), Y(P.chestY + 0.06));
      g.lineTo(U(0.55), Y(P.chestY + 0.06));
      g.lineTo(U(1.1), Y(P.waistY));
      g.lineTo(U(1.2), S);
      g.lineTo(U(-1.2), S);
      g.lineTo(U(-1.1), Y(P.waistY));
      g.closePath();
      g.fill();
      // neck strap
      g.strokeStyle = d.base;
      g.lineWidth = 7;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(U(s * 0.5), Y(P.chestY + 0.05));
        g.lineTo(U(s * 0.9), 0);
        g.stroke();
      }
      // waist tie band around the back
      g.fillStyle = darken(d.base, 0.1);
      g.fillRect(0, Y(P.waistY + 0.012), W, Y(P.waistY - 0.012) - Y(P.waistY + 0.012));
      // pocket + stitched logo
      g.strokeStyle = lighten(d.base, 0.25);
      g.setLineDash([3, 3]);
      g.lineWidth = 1.5;
      g.strokeRect(U(-0.35), Y(P.waistY - 0.03), U(0.35) - U(-0.35), 22);
      g.setLineDash([]);
      g.fillStyle = lighten(d.base, 0.55);
      g.font = `700 13px ${FONTS.round}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('はるかぜ', cx, Y(P.chestY - 0.02));
      break;
    }
    case 'cardigan': {
      // ribbed knit, front opening with buttons, blouse collar
      g.strokeStyle = darken(d.base, 0.07);
      g.lineWidth = 1.5;
      for (let x = 0; x < W; x += 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
      g.fillStyle = darken(d.base, 0.12);
      g.fillRect(0, Y(P.hipsY - 0.01), W, S);
      vNeck(Y(P.chestY + 0.02), 18, d.shirt);
      g.fillStyle = lighten(d.shirt, 0.3);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * 2, neckY - 2);
        g.lineTo(cx + s * 20, neckY - 6);
        g.lineTo(cx + s * 14, neckY + 10);
        g.closePath();
        g.fill();
      }
      g.strokeStyle = darken(d.base, 0.25);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx, Y(P.chestY + 0.02));
      g.lineTo(cx, S);
      g.stroke();
      buttons([cx + 5], [Y(P.chestY), Y(P.chestY - 0.07), Y(P.waistY + 0.02), Y(P.waistY - 0.05)], d.button || '#efe6d2', 3);
      break;
    }
    case 'hoodie': {
      folds(darken(d.base, 0.3), 0.3);
      // kangaroo pocket
      g.fillStyle = darken(d.base, 0.06);
      g.beginPath();
      g.moveTo(U(-0.6), Y(P.waistY - 0.02));
      g.lineTo(U(0.6), Y(P.waistY - 0.02));
      g.lineTo(U(0.75), Y(P.hipsY - 0.03));
      g.lineTo(U(-0.75), Y(P.hipsY - 0.03));
      g.closePath();
      g.fill();
      g.strokeStyle = darken(d.base, 0.3);
      g.lineWidth = 1.5;
      g.stroke();
      // rib hem
      g.fillStyle = darken(d.base, 0.12);
      g.fillRect(0, Y(P.hipsY - 0.02), W, S);
      // print on the chest
      g.fillStyle = lighten(d.base, 0.55);
      g.font = `800 16px ${FONTS.latin}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('HARUKAZE', cx, Y(P.chestY - 0.01));
      // drawstrings
      g.strokeStyle = '#f2efe8';
      g.lineWidth = 2.4;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 9, neckY); g.lineTo(cx + s * 11, Y(P.chestY + 0.02)); g.stroke(); }
      break;
    }
    case 'trench': {
      folds(darken(d.base, 0.3), 0.25);
      const vb = Y(P.chestY - 0.01);
      vNeck(vb, 22, d.shirt);
      lapels(darken(d.base, 0.06), darken(d.base, 0.3), vb, 24);
      buttons([cx - 14, cx + 20], [Y(P.chestY - 0.05), Y(P.waistY + 0.05)], darken(d.base, 0.45), 3.4);
      // belt
      g.fillStyle = darken(d.base, 0.1);
      g.fillRect(0, Y(P.waistY + 0.02), W, Y(P.waistY - 0.02) - Y(P.waistY + 0.02));
      g.strokeStyle = darken(d.base, 0.4);
      g.lineWidth = 1.4;
      g.strokeRect(cx - 7, Y(P.waistY + 0.02), 14, Y(P.waistY - 0.02) - Y(P.waistY + 0.02));
      // back yoke
      g.strokeStyle = darken(d.base, 0.2);
      g.beginPath();
      g.moveTo(U(-2.2), Y(P.chestY + 0.05));
      g.lineTo(U(2.2), Y(P.chestY + 0.05));
      g.stroke();
      break;
    }
    case 'dress': {
      // pale dress + open cream cardigan, ribbon at the collar
      g.fillStyle = d.base;
      g.fillRect(0, 0, W, S);
      g.fillStyle = d.cardigan;
      g.fillRect(0, 0, U(-0.42), S);
      g.fillRect(U(0.42), 0, W - U(0.42), S);
      g.strokeStyle = darken(d.cardigan, 0.15);
      g.lineWidth = 1.2;
      for (let x = 0; x < W; x += 5) {
        if (x > U(-0.42) && x < U(0.42)) continue;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke();
      }
      g.strokeStyle = darken(d.cardigan, 0.25);
      g.lineWidth = 2;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(U(s * 0.42), 0); g.lineTo(U(s * 0.42), S); g.stroke(); }
      // round collar + ribbon
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx, neckY, 30, 14, 0, 0, Math.PI);
      g.fill();
      g.fillStyle = d.ribbon;
      g.beginPath();
      g.moveTo(cx, neckY + 6);
      g.lineTo(cx - 10, neckY);
      g.lineTo(cx - 10, neckY + 12);
      g.closePath();
      g.moveTo(cx, neckY + 6);
      g.lineTo(cx + 10, neckY);
      g.lineTo(cx + 10, neckY + 12);
      g.closePath();
      g.fill();
      // waist seam
      g.strokeStyle = darken(d.base, 0.12);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(U(-0.42), Y(P.waistY + 0.01));
      g.lineTo(U(0.42), Y(P.waistY + 0.01));
      g.stroke();
      break;
    }
    case 'knit': {
      // round-neck sweater (mother) with subtle cable stripes
      g.strokeStyle = darken(d.base, 0.08);
      g.lineWidth = 2;
      for (let x = 8; x < W; x += 16) {
        g.beginPath();
        for (let y = 0; y < S; y += 8) g.lineTo(x + ((y / 8) % 2 ? 3 : -3), y);
        g.stroke();
      }
      g.fillStyle = darken(d.base, 0.1);
      g.fillRect(0, Y(P.hipsY - 0.015), W, S);
      g.fillStyle = darken(d.base, 0.12);
      g.beginPath();
      g.ellipse(cx, 0, 34, neckY + 8, 0, 0, Math.PI);
      g.fill();
      g.fillStyle = d.base;
      g.beginPath();
      g.ellipse(cx, 0, 28, neckY + 2, 0, 0, Math.PI);
      g.fill();
      break;
    }
    case 'smock': {
      // kindergarten smock: round white collar, flower name tag, pocket
      folds(darken(d.base, 0.3), 0.3);
      g.fillStyle = '#ffffff';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + s * 18, neckY + 8, 22, 14, s * 0.3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f4b8c8';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(U(-0.5) + Math.cos(a) * 6, Y(P.chestY) + Math.sin(a) * 6, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#fff6c8';
      g.beginPath();
      g.arc(U(-0.5), Y(P.chestY), 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = darken(d.base, 0.25);
      g.lineWidth = 1.5;
      g.strokeRect(U(0.3), Y(P.waistY), 26, 20);
      break;
    }
    case 'vest': {
      // knit vest over a shirt (elder man)
      g.fillStyle = d.shirt;
      g.fillRect(0, 0, W, S);
      g.fillStyle = d.base;
      g.fillRect(U(-Math.PI), Y(P.shoulderY - 0.05), W, S);
      vNeck(Y(P.chestY - 0.02), 24, d.shirt);
      g.fillStyle = d.shirt;
      for (const s of [-1, 1]) g.fillRect(U(s * 1.35) - 18, Y(P.shoulderY - 0.02), 36, Y(P.chestY - 0.02) - Y(P.shoulderY - 0.02));
      g.strokeStyle = darken(d.base, 0.12);
      g.lineWidth = 1.2;
      for (let x = 0; x < W; x += 5) { g.beginPath(); g.moveTo(x, Y(P.chestY)); g.lineTo(x, S); g.stroke(); }
      buttons([cx + 2], [Y(P.chestY - 0.05), Y(P.waistY + 0.02), Y(P.waistY - 0.05)], '#5a4a3a', 2.8);
      g.fillStyle = lighten(d.shirt, 0.4);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * 3, neckY - 2);
        g.lineTo(cx + s * 22, neckY - 8);
        g.lineTo(cx + s * 12, neckY + 12);
        g.closePath();
        g.fill();
      }
      break;
    }
    default:
      folds(darken(d.base, 0.3), 0.2);
  }
}

// ---------------------------------------------------------------------------
// prints
// ---------------------------------------------------------------------------
/** Bookstore paper cover (書皮) with the 青空書店 logo. */
export function paintBookCover(g, S) {
  g.fillStyle = '#e9e2d0';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#9cb7cf';
  g.lineWidth = 2;
  for (let i = -S; i < S * 2; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S * 0.6, S); g.stroke(); }
  g.fillStyle = '#e9e2d0';
  roundRect(g, S * 0.18, S * 0.3, S * 0.64, S * 0.4, 10);
  g.fill();
  g.strokeStyle = '#5f87ad';
  g.lineWidth = 3;
  g.stroke();
  fitText(g, '青空書店', S * 0.2, S * 0.36, S * 0.6, S * 0.16, { font: FONTS.mincho, color: '#3f6b93', weight: 700 });
  fitText(g, 'AOZORA BOOKS', S * 0.2, S * 0.53, S * 0.6, S * 0.08, { font: FONTS.latin, color: '#5f87ad', weight: 700 });
}

/** Eco shopping bag print. */
export function paintBag(g, S, col, text) {
  g.fillStyle = col;
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(S * 0.5, S * 0.45, S * 0.16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = col;
  // tiny sakura mark
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.ellipse(S * 0.5 + Math.cos(a) * S * 0.06, S * 0.45 + Math.sin(a) * S * 0.06, S * 0.05, S * 0.035, a, 0, Math.PI * 2);
    g.fill();
  }
  fitText(g, text, S * 0.1, S * 0.66, S * 0.8, S * 0.14, { font: FONTS.round, color: 'rgba(255,255,255,0.9)', weight: 800 });
}

/** Round cap badge: golden sakura on navy. */
export function paintBadge(g, S) {
  g.fillStyle = '#2b3650';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#d8bf72';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.ellipse(S / 2 + Math.cos(a) * S * 0.2, S / 2 + Math.sin(a) * S * 0.2, S * 0.17, S * 0.12, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#f3e3a8';
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.09, 0, Math.PI * 2);
  g.fill();
}

/** Phone screen with a pastel chat UI (unlit feel via bright colours). */
export function paintPhone(g, S) {
  g.fillStyle = '#dfeaf6';
  g.fillRect(0, 0, S, S);
  const bubbles = [[0.1, 0.12, 0.55, '#ffffff'], [0.35, 0.3, 0.55, '#bfe3b0'], [0.1, 0.48, 0.45, '#ffffff'], [0.3, 0.66, 0.6, '#bfe3b0']];
  for (const [x, y, w, c] of bubbles) {
    g.fillStyle = c;
    roundRect(g, x * S, y * S, w * S, 0.12 * S, 12);
    g.fill();
  }
}
