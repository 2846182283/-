/**
 * One 2048x1024 canvas atlas for every painted detail of the trains:
 * destination LEDs (dot-matrix), line badge, run numbers, lamps & glows,
 * company logo, car numbers, priority / free-space / door-caution stickers,
 * passenger-information LCD, cove & hanging advertisements, petal decals.
 *
 * Every region is registered by name with its UV rectangle {u0,v0,u1,v1}.
 * All text uses the fictional names of layout.js (春風電鉄 / 春風線 / stations).
 */
import { makeCanvas, toTexture, roundRect, fitText, FONTS, seeded } from '../../core/canvasTex.js';
import { STATION } from '../../core/layout.js';

const W = 2048, H = 1024, PAD = 4;

class Atlas {
  constructor() {
    this.canvas = makeCanvas(W, H);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }); // CPU canvas: many small paths
    this.x = 0; this.y = 0; this.rowH = 0;
    this.r = {};
  }
  add(name, w, h, draw) {
    if (this.x + w + PAD * 2 > W) { this.x = 0; this.y += this.rowH; this.rowH = 0; }
    const rx = this.x + PAD, ry = this.y + PAD;
    if (ry + h > H) throw new Error(`train atlas full at ${name}`);
    const c = this.ctx;
    c.save();
    c.translate(rx, ry);
    c.beginPath(); c.rect(0, 0, w, h); c.clip();
    draw(c, w, h);
    c.restore();
    this.r[name] = { u0: (rx + 0.5) / W, u1: (rx + w - 0.5) / W, v0: 1 - (ry + h - 0.5) / H, v1: 1 - (ry + 0.5) / H, w, h };
    this.x += w + PAD * 2;
    this.rowH = Math.max(this.rowH, h + PAD * 2);
  }
}

// ---------------------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------------------

/**
 * Dot-matrix LED: text is rasterised small, then every lit pixel becomes a
 * round LED dot.  Dots are written straight into ImageData (thousands of
 * canvas arc() fills are very slow on software-GL canvases).
 */
function ledPanel(c, w, h, items, dot = 4) {
  const cols = Math.floor(w / dot), rows = Math.floor(h / dot);
  const off = makeCanvas(cols, rows);
  const o = off.getContext('2d', { willReadFrequently: true });
  o.fillStyle = '#000';
  o.fillRect(0, 0, cols, rows);
  for (const it of items) {
    if (it.box) {
      o.strokeStyle = it.color;
      o.lineWidth = 1;
      o.strokeRect(it.x + 0.5, 1.5, it.w - 1, rows - 3);
    }
    fitText(o, it.text, it.x + (it.box ? 2 : 0), 1, it.w - (it.box ? 4 : 0), rows - 2, { font: FONTS.gothic, weight: 700, color: it.color, letterSpacing: it.spacing || 0 });
  }
  const src = o.getImageData(0, 0, cols, rows).data;
  const big = makeCanvas(w, h);
  const b = big.getContext('2d', { willReadFrequently: true });
  const img = b.createImageData(w, h);
  const d = img.data;
  const rad = dot * 0.42;
  for (let y = 0; y < h; y++) {
    const r = Math.min(rows - 1, Math.floor(y / dot));
    const dy = y + 0.5 - (r * dot + dot / 2);
    for (let x = 0; x < w; x++) {
      const q = Math.min(cols - 1, Math.floor(x / dot));
      const dx = x + 0.5 - (q * dot + dot / 2);
      const i = (r * cols + q) * 4;
      const lum = Math.max(src[i], src[i + 1], src[i + 2]) / 255;
      const inside = Math.max(0, Math.min(1, rad + 0.5 - Math.hypot(dx, dy)));
      let cr = 0x2b, cg = 0x26, cb = 0x22;
      if (lum > 0.35) {
        const k = Math.min(1, 0.55 + lum * 0.6);
        cr = Math.min(255, src[i] * k + 30); cg = Math.min(255, src[i + 1] * k + 18); cb = src[i + 2] * k;
      }
      const p = (y * w + x) * 4;
      d[p] = 0x16 + (cr - 0x16) * inside;
      d[p + 1] = 0x16 + (cg - 0x16) * inside;
      d[p + 2] = 0x1a + (cb - 0x1a) * inside;
      d[p + 3] = 255;
    }
  }
  b.putImageData(img, 0, 0);
  c.drawImage(big, 0, 0);
}

function radial(c, w, h, stops) {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
  for (const [t, col] of stops) g.addColorStop(t, col);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** Five-petal sakura flower (notched petals) centred at cx,cy. */
function sakuraFlower(c, cx, cy, r, fill, centre) {
  c.save();
  c.translate(cx, cy);
  for (let i = 0; i < 5; i++) {
    c.save();
    c.rotate((i / 5) * Math.PI * 2);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-r * 0.55, -r * 0.35, -r * 0.5, -r * 0.95, -r * 0.14, -r);
    c.lineTo(0, -r * 0.84);
    c.lineTo(r * 0.14, -r);
    c.bezierCurveTo(r * 0.5, -r * 0.95, r * 0.55, -r * 0.35, 0, 0);
    c.fillStyle = fill;
    c.fill();
    c.restore();
  }
  if (centre) {
    c.beginPath();
    c.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    c.fillStyle = centre;
    c.fill();
  }
  c.restore();
}

/** 春風電鉄 mark: navy ring, sakura flower, a wind swoosh sweeping through. */
function logoMark(c, cx, cy, R) {
  c.save();
  c.lineCap = 'round';
  c.beginPath();
  c.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
  c.fillStyle = '#ffffff';
  c.fill();
  c.lineWidth = R * 0.1;
  c.strokeStyle = '#34406a';
  c.stroke();
  sakuraFlower(c, cx + R * 0.08, cy - R * 0.06, R * 0.62, '#f08fae', '#ffe28a');
  // wind swoosh
  c.beginPath();
  c.moveTo(cx - R * 0.78, cy + R * 0.34);
  c.bezierCurveTo(cx - R * 0.3, cy + R * 0.7, cx + R * 0.35, cy + R * 0.55, cx + R * 0.8, cy + R * 0.05);
  c.lineWidth = R * 0.13;
  c.strokeStyle = '#4f86c6';
  c.stroke();
  c.beginPath();
  c.moveTo(cx - R * 0.62, cy + R * 0.58);
  c.bezierCurveTo(cx - R * 0.2, cy + R * 0.82, cx + R * 0.3, cy + R * 0.72, cx + R * 0.6, cy + R * 0.42);
  c.lineWidth = R * 0.07;
  c.strokeStyle = '#8fc1e8';
  c.stroke();
  c.restore();
}

// --- pictograms (stroked stick figures, size s, top-left x,y) --------------
function pictoElder(c, x, y, s, col) {
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = s * 0.09; c.lineCap = c.lineJoin = 'round';
  c.beginPath(); c.arc(x + s * 0.44, y + s * 0.16, s * 0.1, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.4, y + s * 0.3); c.quadraticCurveTo(x + s * 0.3, y + s * 0.45, x + s * 0.36, y + s * 0.6); // bent back
  c.lineTo(x + s * 0.3, y + s * 0.9); c.moveTo(x + s * 0.36, y + s * 0.6); c.lineTo(x + s * 0.48, y + s * 0.9);
  c.moveTo(x + s * 0.38, y + s * 0.38); c.lineTo(x + s * 0.6, y + s * 0.5); c.stroke();
  c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(x + s * 0.62, y + s * 0.48); c.lineTo(x + s * 0.7, y + s * 0.92); c.stroke(); // cane
  c.restore();
}
function pictoChild(c, x, y, s, col) {
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = s * 0.09; c.lineCap = c.lineJoin = 'round';
  // adult
  c.beginPath(); c.arc(x + s * 0.32, y + s * 0.14, s * 0.1, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.32, y + s * 0.28); c.lineTo(x + s * 0.32, y + s * 0.6); c.lineTo(x + s * 0.24, y + s * 0.92);
  c.moveTo(x + s * 0.32, y + s * 0.6); c.lineTo(x + s * 0.4, y + s * 0.92);
  c.moveTo(x + s * 0.32, y + s * 0.36); c.lineTo(x + s * 0.54, y + s * 0.56); c.stroke();
  // child
  c.beginPath(); c.arc(x + s * 0.68, y + s * 0.44, s * 0.08, 0, Math.PI * 2); c.fill();
  c.lineWidth = s * 0.075;
  c.beginPath(); c.moveTo(x + s * 0.68, y + s * 0.55); c.lineTo(x + s * 0.68, y + s * 0.74); c.lineTo(x + s * 0.62, y + s * 0.92);
  c.moveTo(x + s * 0.68, y + s * 0.74); c.lineTo(x + s * 0.74, y + s * 0.92);
  c.moveTo(x + s * 0.68, y + s * 0.6); c.lineTo(x + s * 0.56, y + s * 0.57); c.stroke();
  c.restore();
}
function pictoWheelchair(c, x, y, s, col) {
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = s * 0.08; c.lineCap = c.lineJoin = 'round';
  c.beginPath(); c.arc(x + s * 0.4, y + s * 0.13, s * 0.09, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.4, y + s * 0.27); c.lineTo(x + s * 0.4, y + s * 0.52); c.lineTo(x + s * 0.64, y + s * 0.52); c.lineTo(x + s * 0.76, y + s * 0.8);
  c.moveTo(x + s * 0.4, y + s * 0.36); c.lineTo(x + s * 0.58, y + s * 0.36); c.stroke();
  c.beginPath(); c.arc(x + s * 0.42, y + s * 0.66, s * 0.24, -Math.PI * 0.25, Math.PI * 1.35); c.stroke();
  c.restore();
}
function pictoStroller(c, x, y, s, col) {
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = s * 0.07; c.lineCap = c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x + s * 0.2, y + s * 0.42); c.lineTo(x + s * 0.7, y + s * 0.42); c.lineTo(x + s * 0.64, y + s * 0.64); c.lineTo(x + s * 0.28, y + s * 0.64); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.2, y + s * 0.42); c.arc(x + s * 0.38, y + s * 0.42, s * 0.18, Math.PI, Math.PI * 1.5); c.lineTo(x + s * 0.38, y + s * 0.42); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.7, y + s * 0.42); c.lineTo(x + s * 0.8, y + s * 0.2); c.lineTo(x + s * 0.88, y + s * 0.2); c.stroke();
  for (const wx of [0.32, 0.62]) { c.beginPath(); c.arc(x + s * wx, y + s * 0.8, s * 0.08, 0, Math.PI * 2); c.stroke(); }
  c.restore();
}
function pictoHand(c, x, y, s) {
  c.save();
  c.fillStyle = '#fbe0cc'; c.strokeStyle = '#2a2a2a'; c.lineWidth = s * 0.04; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x + s * 0.2, y + s * 0.95); c.lineTo(x + s * 0.2, y + s * 0.5);
  for (let i = 0; i < 4; i++) { const fx = x + s * (0.2 + i * 0.13); c.lineTo(fx, y + s * (0.18 + (i === 0 || i === 3 ? 0.08 : 0))); c.lineTo(fx + s * 0.11, y + s * (0.18 + (i === 0 || i === 3 ? 0.08 : 0))); c.lineTo(fx + s * 0.11, y + s * 0.5); }
  c.lineTo(x + s * 0.72, y + s * 0.95); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#e04b3f';
  c.beginPath(); c.moveTo(x + s * 0.95, y + s * 0.3); c.lineTo(x + s * 0.78, y + s * 0.42); c.lineTo(x + s * 0.95, y + s * 0.54); c.fill();
  c.restore();
}

function petal(c, x, y, r, rot, col, hi) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath();
  c.moveTo(0, r);
  c.bezierCurveTo(-r * 0.9, r * 0.3, -r * 0.6, -r * 0.8, -r * 0.12, -r);
  c.lineTo(0, -r * 0.78);
  c.lineTo(r * 0.12, -r);
  c.bezierCurveTo(r * 0.6, -r * 0.8, r * 0.9, r * 0.3, 0, r);
  c.fillStyle = col; c.fill();
  c.beginPath(); c.ellipse(-r * 0.1, r * 0.2, r * 0.22, r * 0.38, 0.3, 0, Math.PI * 2); c.fillStyle = hi; c.fill();
  c.restore();
}

// ---------------------------------------------------------------------------
export function buildAtlas(sets) {
  const A = new Atlas();
  const P = STATION;

  // --- destination LEDs (one per set) --------------------------------------
  for (const s of sets) {
    A.add(`led_${s.key}`, 512, 96, (c, w, h) => ledPanel(c, w, h, [
      { text: '各停', x: 1, w: 38, color: '#ffd84a', box: true },
      { text: s.dest, x: 46, w: 80, color: '#ff9b2e', spacing: 3 },
    ]));
    A.add(`run_${s.key}`, 128, 48, (c, w, h) => ledPanel(c, w, h, [{ text: s.run, x: 2, w: 28, color: '#ffb23e' }]));
    A.add(`lcd_${s.key}`, 256, 96, (c, w, h) => {
      c.fillStyle = '#1f2940'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f29bb4'; c.fillRect(0, 0, w, 22);
      fitText(c, `${P.line} 各停 ${s.dest}行`, 6, 2, w - 12, 18, { font: FONTS.gothic, color: '#ffffff' });
      fitText(c, '次は', 8, 30, 50, 34, { font: FONTS.gothic, color: '#ffe08a', align: 'left' });
      fitText(c, `${P.name}`, 58, 26, w - 66, 44, { font: FONTS.gothic, weight: 700, color: '#ffffff' });
      fitText(c, `Next  ${P.romaji}  ${P.code}`, 8, 72, w - 16, 20, { font: FONTS.latin, color: '#b9c8e6' });
    });
  }

  // --- line badge (線路記号) ------------------------------------------------
  A.add('badge', 128, 128, (c, w, h) => {
    c.fillStyle = '#ffffff'; roundRect(c, 4, 4, w - 8, h - 8, 20); c.fill();
    c.fillStyle = P.lineColor; roundRect(c, 12, 12, w - 24, h - 24, 14); c.fill();
    fitText(c, 'HK', 16, 18, w - 32, 56, { font: FONTS.latin, weight: 800, color: '#ffffff' });
    fitText(c, P.line, 16, 76, w - 32, 30, { font: FONTS.gothic, weight: 700, color: '#ffffff' });
  });

  // --- lamps ---------------------------------------------------------------
  A.add('headOn', 128, 128, (c, w, h) => {
    c.fillStyle = '#2c2d33'; c.fillRect(0, 0, w, h);
    radial(c, w, h, [[0, '#ffffff'], [0.45, '#fffbee'], [0.72, '#ffeec2'], [0.86, '#d6cdb7'], [0.9, '#34353b'], [1, '#2c2d33']]);
  });
  A.add('headOff', 128, 128, (c, w, h) => {
    radial(c, w, h, [[0, '#e9edf2'], [0.3, '#c9d0d9'], [0.34, '#eef1f4'], [0.6, '#b8c0ca'], [0.64, '#e4e8ee'], [0.86, '#9aa3ae'], [0.9, '#34353b'], [1, '#2c2d33']]);
  });
  A.add('tailOn', 96, 64, (c, w, h) => {
    c.fillStyle = '#2c2d33'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fff0e8'); g.addColorStop(0.25, '#ff6a55'); g.addColorStop(0.9, '#e0271f');
    c.fillStyle = g; roundRect(c, 5, 5, w - 10, h - 10, 12); c.fill();
  });
  A.add('tailOff', 96, 64, (c, w, h) => {
    c.fillStyle = '#2c2d33'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6e2a2e'; roundRect(c, 5, 5, w - 10, h - 10, 12); c.fill();
    c.strokeStyle = 'rgba(255,190,190,0.35)'; c.lineWidth = 2;
    for (let i = 14; i < w - 10; i += 10) { c.beginPath(); c.moveTo(i, 8); c.lineTo(i, h - 8); c.stroke(); }
  });
  A.add('glowW', 128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); radial(c, w, h, [[0, 'rgba(255,252,238,0.95)'], [0.18, 'rgba(255,246,214,0.6)'], [0.5, 'rgba(255,236,190,0.16)'], [1, 'rgba(255,230,180,0)']]); });
  A.add('glowR', 128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); radial(c, w, h, [[0, 'rgba(255,180,160,0.9)'], [0.2, 'rgba(255,80,60,0.5)'], [0.55, 'rgba(255,60,50,0.12)'], [1, 'rgba(255,60,50,0)']]); });
  A.add('light', 32, 32, (c, w, h) => { c.fillStyle = '#fff6e2'; c.fillRect(0, 0, w, h); });
  A.add('cabLamp', 32, 32, (c, w, h) => { c.fillStyle = '#9fd0ff'; c.fillRect(0, 0, w, h); });

  // --- logo ------------------------------------------------------------------
  A.add('logo', 256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); logoMark(c, w / 2, h / 2, w * 0.46); });
  A.add('logoSide', 512, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    logoMark(c, 62, 64, 56);
    fitText(c, P.company, 128, 10, 370, 70, { font: FONTS.gothic, weight: 700, color: '#34406a', align: 'left', letterSpacing: 6 });
    fitText(c, 'HARUKAZE ELECTRIC RAILWAY', 130, 84, 360, 30, { font: FONTS.latin, weight: 700, color: '#d9668d', align: 'left', letterSpacing: 2 });
  });

  // --- car numbers -------------------------------------------------------------
  for (const s of sets) {
    s.cars.forEach((car, i) => {
      A.add(`no_${s.key}${i}`, 256, 56, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        fitText(c, `${car.kana} ${car.no}`, 4, 4, w - 8, h - 8, { font: FONTS.gothic, weight: 700, color: '#3f434c', align: 'left', letterSpacing: 4 });
      });
      A.add(`nof_${s.key}${i}`, 128, 48, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        fitText(c, car.no, 4, 4, w - 8, h - 8, { font: FONTS.latin, weight: 800, color: '#3f434c', letterSpacing: 2 });
      });
    });
  }
  A.add('hk', 256, 56, (c, w, h) => { c.clearRect(0, 0, w, h); fitText(c, 'ハル', 4, 4, w - 8, h - 8, { font: FONTS.gothic, weight: 700, color: '#3f434c', align: 'left', letterSpacing: 4 }); });

  // --- stickers ------------------------------------------------------------------
  A.add('priority', 384, 144, (c, w, h) => {
    c.fillStyle = '#ffffff'; roundRect(c, 2, 2, w - 4, h - 4, 12); c.fill();
    c.fillStyle = '#ee8a3a'; roundRect(c, 2, 2, w - 4, 44, 12); c.fill(); c.fillRect(2, 30, w - 4, 16);
    fitText(c, '優先席  Priority Seat', 10, 6, w - 20, 36, { font: FONTS.gothic, weight: 700, color: '#ffffff' });
    const fns = [pictoElder, pictoChild, pictoWheelchair, pictoStroller];
    fns.forEach((fn, i) => {
      const x = 14 + i * 91;
      c.fillStyle = '#f3eee6'; roundRect(c, x, 54, 82, 82, 10); c.fill();
      fn(c, x + 4, 56, 76, '#3b4a6b');
    });
  });
  A.add('freeSpace', 192, 192, (c, w, h) => {
    c.fillStyle = '#3f7fc8'; roundRect(c, 2, 2, w - 4, h - 4, 16); c.fill();
    pictoWheelchair(c, 12, 18, 84, '#ffffff');
    pictoStroller(c, 96, 22, 84, '#ffffff');
    fitText(c, 'フリースペース', 10, 116, w - 20, 34, { font: FONTS.gothic, weight: 700, color: '#ffffff' });
    fitText(c, 'Wheelchair / Stroller', 10, 152, w - 20, 26, { font: FONTS.latin, weight: 700, color: '#dbe8f7' });
  });
  A.add('doorCaution', 192, 112, (c, w, h) => {
    c.fillStyle = '#f7d13e'; roundRect(c, 2, 2, w - 4, h - 4, 14); c.fill();
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 3; roundRect(c, 6, 6, w - 12, h - 12, 10); c.stroke();
    pictoHand(c, 12, 14, 70);
    fitText(c, 'ドアに', 86, 14, 96, 36, { font: FONTS.round, weight: 700, color: '#222' });
    fitText(c, 'ご注意', 86, 50, 96, 36, { font: FONTS.round, weight: 700, color: '#d8433d' });
    fitText(c, '手をはさまれないように', 12, 88, w - 24, 16, { font: FONTS.gothic, weight: 700, color: '#333' });
  });
  A.add('doorNo', 64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f29bb4'; c.beginPath(); c.arc(32, 32, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 22, 0, Math.PI * 2); c.fill();
    fitText(c, '▲', 12, 12, 40, 40, { font: FONTS.gothic, color: '#d9668d' });
  });

  // --- petals ---------------------------------------------------------------------
  A.add('petals', 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const rnd = seeded(77);
    for (let i = 0; i < 26; i++) {
      const x = 16 + rnd() * (w - 32), y = 16 + rnd() * (h - 32);
      petal(c, x, y, 7 + rnd() * 6, rnd() * Math.PI * 2, rnd() < 0.5 ? '#f7b9cc' : '#fbd3df', 'rgba(255,245,248,0.8)');
    }
  });
  A.add('petalsFew', 256, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const rnd = seeded(91);
    for (let i = 0; i < 12; i++) petal(c, 10 + rnd() * (w - 20), 12 + rnd() * (h - 24), 6 + rnd() * 4, rnd() * 6.28, rnd() < 0.5 ? '#f7b9cc' : '#fbd3df', 'rgba(255,245,248,0.8)');
  });

  // --- advertisements ------------------------------------------------------------
  const ads = [
    { bg: '#fde3ea', title: '花見台さくらまつり', sub: '4/1 → 4/10  河川敷にて', col: '#d9668d', deco: 'sakura' },
    { bg: '#5aa6a0', title: '湯けむりの宿 ゆのか', sub: '春風線で1本 ・ 日帰り入浴', col: '#ffffff', deco: 'mount' },
    { bg: '#fbe7a6', title: 'はるかぜ英会話', sub: '春の入会キャンペーン', col: '#3a4a7a', deco: 'bubble' },
    { bg: '#f6efe0', title: 'パン工房 こむぎ', sub: '桜あんぱん 新発売', col: '#8a5a44', deco: 'bread' },
    { bg: '#dfeaf7', title: '春日野 動物公園', sub: 'レッサーパンダの赤ちゃん', col: '#2f63b5', deco: 'sun' },
  ];
  ads.forEach((ad, i) => {
    A.add(`ad${i}`, 320, 112, (c, w, h) => {
      c.fillStyle = ad.bg; c.fillRect(0, 0, w, h);
      if (ad.deco === 'sakura') for (let k = 0; k < 6; k++) sakuraFlower(c, 30 + k * 55, 90 - (k % 2) * 60, 14, '#f7b9cc');
      if (ad.deco === 'mount') { c.fillStyle = '#3e8a86'; c.beginPath(); c.moveTo(0, h); c.lineTo(80, 40); c.lineTo(150, h); c.lineTo(230, 55); c.lineTo(w, h); c.fill(); }
      if (ad.deco === 'bubble') { c.fillStyle = '#fff'; roundRect(c, 240, 18, 66, 44, 14); c.fill(); fitText(c, 'Hello!', 244, 26, 58, 28, { font: FONTS.latin, color: '#3a4a7a' }); }
      if (ad.deco === 'bread') { c.fillStyle = '#d99a5b'; c.beginPath(); c.ellipse(270, 60, 38, 28, 0, 0, Math.PI * 2); c.fill(); sakuraFlower(c, 270, 54, 10, '#f29bb4'); }
      if (ad.deco === 'sun') { c.fillStyle = '#f6c25a'; c.beginPath(); c.arc(275, 50, 26, 0, Math.PI * 2); c.fill(); }
      fitText(c, ad.title, 12, 14, w * 0.74, 48, { font: FONTS.round, weight: 700, color: ad.col, align: 'left' });
      fitText(c, ad.sub, 12, 66, w * 0.74, 28, { font: FONTS.gothic, weight: 700, color: ad.col, align: 'left' });
    });
  });
  A.add('hang0', 192, 144, (c, w, h) => {
    c.fillStyle = '#fff7ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e98aa7'; c.fillRect(0, 0, w, 34);
    fitText(c, '月刊 ことり', 8, 3, w - 16, 28, { font: FONTS.mincho, weight: 700, color: '#fff' });
    c.fillStyle = '#9cc27a'; c.fillRect(10, 44, 70, 90);
    c.fillStyle = '#6fa6e3'; c.fillRect(88, 44, 94, 40);
    fitText(c, '春の散歩道', 88, 90, 94, 22, { font: FONTS.gothic, color: '#333' });
    fitText(c, '特集', 88, 112, 94, 22, { font: FONTS.gothic, color: '#d8433d' });
  });
  A.add('hang1', 192, 144, (c, w, h) => {
    c.fillStyle = '#e6f2ea'; c.fillRect(0, 0, w, h);
    fitText(c, '新生活フェア', 8, 10, w - 16, 40, { font: FONTS.round, weight: 700, color: '#3c9a62' });
    for (let k = 0; k < 4; k++) { c.fillStyle = ['#f9bfd0', '#a9ccf0', '#f2e6cf', '#c8d98f'][k]; c.fillRect(12 + k * 44, 62, 36, 50); }
    fitText(c, 'はるマート', 8, 116, w - 16, 22, { font: FONTS.gothic, color: '#555' });
  });

  const texture = toTexture(A.canvas);
  return { texture, r: A.r, canvas: A.canvas };
}
