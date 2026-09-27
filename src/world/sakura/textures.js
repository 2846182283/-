/**
 * Canvas textures for the sakura module (all procedural, painted once at build).
 *
 *   barkTexture()     dark brown-grey bark, horizontal lenticel stripes + cracks
 *                     (v runs ALONG the branch, u around it -> stripes are horizontal on the trunk)
 *   floralTexture()   tileable, mostly-white carpet of tiny blossoms that multiplies the
 *                     clump colour: invisible from afar (mips average ~0.95), reads as flowers up close
 *   blossomAtlas()    2x2 atlas of alpha-tested blossom sprigs for silhouette cards
 *                     (cells: pale sprig / pink sprig / sprig with young leaves / dense cluster)
 */
import { seeded, makeCanvas, toTexture } from '../../core/canvasTex.js';

/**
 * Paint on a CPU-backed canvas (willReadFrequently) and wrap it as a texture.
 * CPU canvases avoid thousands of tiny GPU draw calls (very slow on software GL).
 */
function drawTexture(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, w, h, c);
  const t = toTexture(c, opts);
  t.userData.canvas = c;
  return t;
}

// ---------------------------------------------------------------------------
// bark
// ---------------------------------------------------------------------------
export function barkTexture() {
  const S = 512;
  return drawTexture(S, S, (g) => {
    const rnd = seeded(4401);
    g.fillStyle = '#6c5b58';
    g.fillRect(0, 0, S, S);
    // soft hand-painted vertical value variation (wraps horizontally)
    for (let i = 0; i < 26; i++) {
      const x = rnd() * S, w = 30 + rnd() * 90;
      const c = rnd() < 0.5 ? 'rgba(92,74,72,0.35)' : 'rgba(128,112,106,0.25)';
      for (const dx of [-S, 0, S]) {
        g.fillStyle = c;
        g.fillRect(x + dx, 0, w, S);
      }
    }
    // broad glossy horizontal bands (sakura bark rings)
    for (let i = 0; i < 9; i++) {
      const y = rnd() * S, h = 6 + rnd() * 16;
      g.fillStyle = `rgba(150,132,128,${0.18 + rnd() * 0.15})`;
      g.fillRect(0, y, S, h);
      g.fillStyle = 'rgba(60,44,46,0.25)';
      g.fillRect(0, y + h, S, 2);
    }
    // lenticels: short, pale, horizontal dashes (the signature cherry-bark marking)
    for (let i = 0; i < 420; i++) {
      const x = rnd() * S, y = rnd() * S;
      const w = 8 + rnd() * 46, h = 2 + rnd() * 3.5;
      const x0 = x;
      for (const dx of [-S, 0, S]) {
        g.fillStyle = 'rgba(52,38,40,0.55)';
        g.fillRect(x0 + dx, y + h * 0.7, w, 1.5);
        g.fillStyle = `rgba(${170 + rnd() * 30},${150 + rnd() * 20},${140 + rnd() * 15},0.75)`;
        g.beginPath();
        g.ellipse(x0 + dx + w / 2, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    // longer dark horizontal cracks
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = rnd() * S, y = rnd() * S, w = 30 + rnd() * 120;
      g.strokeStyle = `rgba(44,32,36,${0.45 + rnd() * 0.3})`;
      g.lineWidth = 1.2 + rnd() * 2;
      for (const dx of [-S, 0, S]) {
        g.beginPath();
        g.moveTo(x + dx, y);
        g.bezierCurveTo(x + dx + w * 0.3, y + (rnd() - 0.5) * 6, x + dx + w * 0.7, y + (rnd() - 0.5) * 6, x + dx + w, y + (rnd() - 0.5) * 4);
        g.stroke();
      }
    }
    // a few rough dark patches (old bark scars)
    for (let i = 0; i < 14; i++) {
      const x = rnd() * S, y = rnd() * S;
      g.fillStyle = 'rgba(58,44,46,0.3)';
      g.beginPath();
      g.ellipse(x, y, 10 + rnd() * 26, 5 + rnd() * 12, 0, 0, Math.PI * 2);
      g.fill();
    }
  }, { wrap: true });
}

// ---------------------------------------------------------------------------
// blossom drawing helpers (shared by the floral carpet and the sprig cards)
// ---------------------------------------------------------------------------
/** One five-petal sakura flower. squash < 1 foreshortens it (seen at an angle). */
function flower(g, x, y, r, rot, squash, tone, rnd, lineCol) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, squash);
  for (let k = 0; k < 5; k++) {
    g.save();
    g.rotate((k / 5) * Math.PI * 2 + (rnd() - 0.5) * 0.15);
    // petal: rounded wedge with the characteristic notch at the tip
    const pr = r * (0.92 + rnd() * 0.14);
    const grad = g.createLinearGradient(0, 0, 0, -pr);
    grad.addColorStop(0, tone.base);
    grad.addColorStop(0.45, tone.mid);
    grad.addColorStop(1, tone.tip);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-pr * 0.55, -pr * 0.25, -pr * 0.62, -pr * 0.9, -pr * 0.22, -pr);
    g.lineTo(0, -pr * 0.84);
    g.lineTo(pr * 0.22, -pr);
    g.bezierCurveTo(pr * 0.62, -pr * 0.9, pr * 0.55, -pr * 0.25, 0, 0);
    g.fill();
    if (lineCol) {
      g.strokeStyle = lineCol;
      g.lineWidth = Math.max(0.8, r * 0.07);
      g.stroke();
    }
    g.restore();
  }
  // deeper pink eye + stamens
  g.fillStyle = tone.eye;
  g.beginPath();
  g.arc(0, 0, r * (tone.eyeR ?? 0.3), 0, Math.PI * 2);
  g.fill();
  g.fillStyle = tone.stamen;
  for (let k = 0; k < 7; k++) {
    const a = rnd() * Math.PI * 2, d = r * (0.22 + rnd() * 0.18);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.7, r * 0.06), 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

const TONES = [
  { base: '#f7c4d4', mid: '#fde6ee', tip: '#ffffff', eye: '#e17c9c', stamen: '#f3d27a' },
  { base: '#f2afc4', mid: '#fbd6e2', tip: '#fff3f7', eye: '#d9658a', stamen: '#efc86a' },
  { base: '#f6b9c2', mid: '#fcdcdc', tip: '#fff6f2', eye: '#dd7488', stamen: '#f0cf78' }, // warm peach
  { base: '#fbd9e4', mid: '#fff1f5', tip: '#ffffff', eye: '#e897b0', stamen: '#f5dc92' }, // near white
];

function bud(g, x, y, r, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = '#7d4d4a';
  g.fillRect(-r * 0.12, 0, r * 0.24, r * 1.4);
  g.fillStyle = '#e46f93';
  g.beginPath();
  g.ellipse(0, -r * 0.2, r * 0.45, r * 0.75, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f59cb6';
  g.beginPath();
  g.ellipse(-r * 0.12, -r * 0.4, r * 0.18, r * 0.35, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function leaf(g, x, y, r, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = '#c3d58a';
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-r * 0.5, -r * 0.5, 0, -r * 1.3);
  g.quadraticCurveTo(r * 0.5, -r * 0.5, 0, 0);
  g.fill();
  g.fillStyle = '#a9c06c';
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(r * 0.5, -r * 0.5, 0, -r * 1.3);
  g.lineTo(0, 0);
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------------------
// floral carpet for the clump surfaces
// ---------------------------------------------------------------------------
export function floralTexture() {
  const S = 512;
  // pre-render a few flower stamps, then scatter them (cheap, and wraps seamlessly)
  const pale = [
    { base: '#f3d0dc', mid: '#fcf0f4', tip: '#ffffff', eye: '#eab0c2', stamen: '#f3dca8', eyeR: 0.22 },
    { base: '#f0c8d6', mid: '#fbecf1', tip: '#ffffff', eye: '#e5a3b8', stamen: '#f1d8a2', eyeR: 0.22 },
  ];
  const stamps = [];
  for (let i = 0; i < 6; i++) {
    const r = 20, c = makeCanvas(48, 48);
    const g = c.getContext('2d', { willReadFrequently: true });
    flower(g, 24, 24, r, i * 0.7, 1, pale[i % 2], seeded(40 + i), 'rgba(214,160,184,0.75)');
    stamps.push(c);
  }
  return drawTexture(S, S, (g) => {
    const rnd = seeded(913);
    g.fillStyle = '#ead5e1';
    g.fillRect(0, 0, S, S);
    // soft painterly shadows between blossoms
    for (let i = 0; i < 110; i++) {
      const x = rnd() * S, y = rnd() * S;
      const rx = 14 + rnd() * 16, ry = 8 + rnd() * 10, rot = rnd() * 3;
      g.fillStyle = 'rgba(206,176,202,0.28)';
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        g.beginPath();
        g.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (let i = 0; i < 360; i++) {
      const x = rnd() * S, y = rnd() * S;
      const sz = 0.5 + rnd() * 0.45, rot = rnd() * 6.28, sq = 0.55 + rnd() * 0.45;
      const st = stamps[i % stamps.length];
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const px = x + dx, py = y + dy;
        if (px < -30 || px > S + 30 || py < -30 || py > S + 30) continue;
        g.save();
        g.translate(px, py);
        g.rotate(rot);
        g.scale(sz, sz * sq);
        g.drawImage(st, -24, -24);
        g.restore();
      }
    }
  }, { wrap: true });
}

/**
 * Split a transparent canvas into an opaque colour map (transparent areas filled
 * with `fill`, so mip levels never bleed dark fringes) + a grey alpha mask.
 */
function splitAlpha(src, fill, opts) {
  const w = src.width, h = src.height;
  const col = makeCanvas(w, h), msk = makeCanvas(w, h);
  const cg = col.getContext('2d', { willReadFrequently: true });
  cg.fillStyle = fill;
  cg.fillRect(0, 0, w, h);
  cg.drawImage(src, 0, 0);
  const sd = src.getContext('2d').getImageData(0, 0, w, h);
  const mg = msk.getContext('2d', { willReadFrequently: true });
  const md = mg.createImageData(w, h);
  for (let i = 0; i < sd.data.length; i += 4) {
    const a = sd.data[i + 3];
    md.data[i] = md.data[i + 1] = md.data[i + 2] = a;
    md.data[i + 3] = 255;
  }
  mg.putImageData(md, 0, 0);
  return { map: toTexture(col, opts), alpha: toTexture(msk, { ...opts, linear: true }) };
}

// ---------------------------------------------------------------------------
// blossom sprig atlas for alpha cards (1024 x 1024, 2 x 2 cells)
// ---------------------------------------------------------------------------
export function blossomAtlas() {
  const S = 1024, C = 512;
  const t = drawTexture(S, S, (g) => {
    g.clearRect(0, 0, S, S);
    const cells = [
      { ox: 0, oy: 0, tones: [0, 3, 3], n: 16, leaves: 0, buds: 3 },
      { ox: C, oy: 0, tones: [1, 0, 2], n: 18, leaves: 0, buds: 4 },
      { ox: 0, oy: C, tones: [0, 3, 2], n: 12, leaves: 11, buds: 2 },
      { ox: C, oy: C, tones: [1, 1, 0, 2], n: 26, leaves: 0, buds: 2 },
    ];
    cells.forEach((cell, ci) => {
      const rnd = seeded(700 + ci * 13);
      g.save();
      g.beginPath();
      g.rect(cell.ox, cell.oy, C, C);
      g.clip();
      g.translate(cell.ox, cell.oy);
      // twig skeleton
      const twigs = [];
      const root = [C * (0.2 + rnd() * 0.15), C * 0.95];
      const mainEnd = [C * (0.6 + rnd() * 0.2), C * 0.12];
      twigs.push([root, mainEnd]);
      for (let k = 0; k < 3; k++) {
        const t = 0.3 + rnd() * 0.5;
        const a = [root[0] + (mainEnd[0] - root[0]) * t, root[1] + (mainEnd[1] - root[1]) * t];
        twigs.push([a, [a[0] + (rnd() - 0.3) * C * 0.5, a[1] - rnd() * C * 0.35]]);
      }
      g.lineCap = 'round';
      for (const [a, b] of twigs) {
        g.strokeStyle = '#5b3f3d';
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.quadraticCurveTo((a[0] + b[0]) / 2 + 20, (a[1] + b[1]) / 2, b[0], b[1]);
        g.stroke();
      }
      // flowers clustered along the twigs, bigger toward the middle of the card
      const pts = [];
      for (let i = 0; i < cell.n; i++) {
        const [a, b] = twigs[i % twigs.length];
        const t = rnd();
        pts.push([a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * 90, a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * 90]);
      }
      for (let i = 0; i < cell.leaves; i++) {
        const p = pts[i % pts.length];
        leaf(g, p[0] + (rnd() - 0.5) * 60, p[1] + (rnd() - 0.5) * 60, 30 + rnd() * 18, rnd() * 6.28);
      }
      for (let i = 0; i < cell.buds; i++) {
        const p = pts[(i * 3) % pts.length];
        bud(g, p[0] + (rnd() - 0.5) * 80, p[1] + (rnd() - 0.5) * 80, 14 + rnd() * 6, (rnd() - 0.5) * 1.6);
      }
      // sort by y so lower flowers overlap upper ones like a real cluster
      pts.sort((p, q) => p[1] - q[1]);
      pts.forEach((p, i) => {
        const r = 34 + rnd() * 22;
        const tone = TONES[cell.tones[i % cell.tones.length]];
        const edge = Math.min(p[0], C - p[0], p[1], C - p[1]);
        if (edge < r * 0.9) return; // keep flowers inside the cell (no bleeding across atlas cells)
        flower(g, p[0], p[1], r, rnd() * 6.28, 0.6 + rnd() * 0.4, tone, rnd, 'rgba(206,120,150,0.55)');
      });
      g.restore();
    });
  }, { mipmaps: true });
  const out = splitAlpha(t.userData.canvas, '#f8dbe5', {});
  t.dispose();
  return out;
}
