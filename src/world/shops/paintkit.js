/**
 * Shared canvas drawing helpers for the shop painters (paint.js, paint2.js):
 * gradients, weathering, blossoms, posters, shelf goods rows, enamel signs,
 * chalk lettering.
 */
import { fitText, verticalText, roundRect, FONTS } from '../../core/canvasTex.js';

export { roundRect };
// ---------------------------------------------------------------------------
// small drawing helpers
// ---------------------------------------------------------------------------
export const R = FONTS.round, G = FONTS.gothic, M = FONTS.mincho;

export function fill(c, w, h, col) { c.fillStyle = col; c.fillRect(0, 0, w, h); }

/** Vertical gradient background (top lighter). */
export function grad(c, x, y, w, h, top, bottom) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
}

/** Soft blotchy weathering / sun fading. */
export function weather(c, w, h, rnd, n = 10, a = 0.08, col = '120,100,90') {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = (0.1 + rnd() * 0.3) * Math.max(w, h);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a * (0.5 + rnd())})`);
    g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function frame(c, w, h, col, lw, r = 0) {
  c.strokeStyle = col;
  c.lineWidth = lw;
  roundRect(c, lw / 2, lw / 2, w - lw, h - lw, r);
  c.stroke();
}

export function T(c, text, x, y, w, h, o = {}) { return fitText(c, text, x, y, w, h, o); }
export function V(c, text, cx, top, bottom, o = {}) { return verticalText(c, text, cx, top, bottom, o); }

/** Five-petal sakura blossom. */
export function blossom(c, x, y, r, col = '#f7b6c8', center = '#e2738f', rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    c.save();
    c.rotate((i / 5) * Math.PI * 2);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-r * 0.55, -r * 0.35, -r * 0.5, -r * 1.0, -r * 0.12, -r * 1.02);
    c.lineTo(0, -r * 0.86);
    c.lineTo(r * 0.12, -r * 1.02);
    c.bezierCurveTo(r * 0.5, -r * 1.0, r * 0.55, -r * 0.35, 0, 0);
    c.fill();
    c.restore();
  }
  c.fillStyle = center;
  c.beginPath();
  c.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function petal(c, x, y, r, rot, col = '#f9c3d2') {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Poster base: paper, optional tape corners, faded. */
export function paper(c, w, h, col, rnd, tape = true) {
  fill(c, w, h, col);
  weather(c, w, h, rnd, 5, 0.05, '255,255,255');
  if (tape) {
    c.fillStyle = 'rgba(250,245,225,0.75)';
    c.save(); c.translate(6, 6); c.rotate(-0.6); c.fillRect(-10, -4, 22, 9); c.restore();
    c.save(); c.translate(w - 6, 6); c.rotate(0.6); c.fillRect(-12, -4, 22, 9); c.restore();
  }
}

/** Bottles / packages row helpers for product shelves. */
export function goodsRow(c, x0, y0, w, h, rnd, kinds) {
  let x = x0 + 2;
  while (x < x0 + w - 6) {
    const k = kinds[Math.floor(rnd() * kinds.length)];
    const pw = k.w[0] + rnd() * (k.w[1] - k.w[0]);
    const ph = h * (k.h[0] + rnd() * (k.h[1] - k.h[0]));
    const col = k.cols[Math.floor(rnd() * k.cols.length)];
    const facings = 1 + Math.floor(rnd() * (k.rep || 3));
    for (let f = 0; f < facings && x + pw < x0 + w - 2; f++) {
      const y = y0 + h - ph;
      if (k.shape === 'bottle') {
        c.fillStyle = col;
        roundRect(c, x, y + ph * 0.25, pw, ph * 0.75, pw * 0.25); c.fill();
        c.fillRect(x + pw * 0.3, y + ph * 0.05, pw * 0.4, ph * 0.3);
        c.fillStyle = k.cap || '#f2f2f2';
        c.fillRect(x + pw * 0.28, y, pw * 0.44, ph * 0.1);
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.fillRect(x + 1, y + ph * 0.5, pw - 2, ph * 0.2);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(x + pw * 0.15, y + ph * 0.3, pw * 0.12, ph * 0.6);
      } else if (k.shape === 'cup') {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x, y + ph * 0.1); c.lineTo(x + pw, y + ph * 0.1); c.lineTo(x + pw * 0.88, y + ph); c.lineTo(x + pw * 0.12, y + ph); c.fill();
        c.fillStyle = '#f5f1e6'; c.fillRect(x - 1, y, pw + 2, ph * 0.12);
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x + pw * 0.2, y + ph * 0.4, pw * 0.6, ph * 0.2);
      } else if (k.shape === 'bag') {
        c.fillStyle = col;
        roundRect(c, x, y, pw, ph, 3); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.beginPath(); c.arc(x + pw / 2, y + ph * 0.45, pw * 0.25, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x, y, pw, 3);
      } else {
        // box
        c.fillStyle = col;
        c.fillRect(x, y, pw, ph);
        c.fillStyle = 'rgba(255,255,255,0.7)';
        c.fillRect(x + 2, y + ph * 0.2, pw - 4, ph * 0.25);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(x + pw - 2, y, 2, ph);
      }
      x += pw + 1;
    }
    x += 1 + rnd() * 2;
  }
}

/** Shelf board with price rail. */
export function shelfBoard(c, x, y, w, col = '#e9e9e6') {
  c.fillStyle = col;
  c.fillRect(x, y, w, 7);
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.fillRect(x, y + 6, w, 1);
  c.fillStyle = '#fbfbf5';
  for (let i = x + 6; i < x + w - 10; i += 22) c.fillRect(i, y + 1.5, 10, 4);
}

/** Enamel (tin) sign. */
export function enamel(c, x, y, w, h, bg, fg, text, sub, rnd) {
  c.fillStyle = bg;
  roundRect(c, x, y, w, h, 6); c.fill();
  c.strokeStyle = fg; c.lineWidth = 3;
  roundRect(c, x + 5, y + 5, w - 10, h - 10, 4); c.stroke();
  T(c, text, x + 10, y + h * 0.16, w - 20, h * (sub ? 0.46 : 0.68), { font: G, weight: 700, color: fg });
  if (sub) T(c, sub, x + 10, y + h * 0.62, w - 20, h * 0.22, { font: G, weight: 700, color: fg });
  // chips & rust
  for (let i = 0; i < 6; i++) {
    c.fillStyle = `rgba(${rnd() < 0.5 ? '90,60,40' : '40,40,50'},${0.25 + rnd() * 0.3})`;
    c.beginPath(); c.arc(x + rnd() * w, y + (rnd() < 0.5 ? rnd() * 8 : h - rnd() * 8), 1.5 + rnd() * 3, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#ddd'; for (const [px, py] of [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]]) { c.beginPath(); c.arc(px, py, 2.4, 0, Math.PI * 2); c.fill(); }
}

/** Chalk text (slight jitter, soft). */
export function chalk(c, text, x, y, w, h, col = '#f4f1e8', font = R) {
  c.save();
  c.globalAlpha = 0.92;
  c.shadowColor = col;
  c.shadowBlur = 1.5;
  T(c, text, x, y, w, h, { font, weight: 700, color: col, align: 'left' });
  c.restore();
}

/** Split "喫茶 はるかぜ" -> ['喫茶', 'はるかぜ']. */
export function split(s) { const i = s.indexOf(' '); return i < 0 ? ['', s] : [s.slice(0, i), s.slice(i + 1)]; }
