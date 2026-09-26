/**
 * poles/textures.js — one 2048² canvas atlas for the whole module:
 *   concrete shaft strips (4 hand-painted variations), the yellow/black foot
 *   sleeve, per-pole number plates, telecom / address plates, wrap-around
 *   adverts (巻き看板), stickers & flyers, every traffic-sign face, the convex
 *   mirror "reflection", and small warning labels.
 *
 * All text is drawn with the shared canvas helpers; names are fictional
 * (春風電鉄 area: はるかぜ電力 / はるかぜ通信, 桜ヶ丘, 春日野, 花見台).
 */
import { FONTS, fitText, verticalText, roundRect, toTexture, seeded } from '../../core/canvasTex.js';

const SIZE = 2048;
const PAD = 4;

/**
 * Skyline packer over one big canvas.  Items are queued with
 * region(name, w, h, draw) and packed (tallest first) + drawn by pack().
 */
function createAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext('2d');
  c.fillStyle = '#b9b7b1';
  c.fillRect(0, 0, SIZE, SIZE);
  const R = {};
  const queue = [];
  const region = (name, w, h, draw) => queue.push({ name, w, h, draw });
  function pack() {
    queue.sort((a, b) => b.h - a.h || b.w - a.w);
    let sky = [{ x: 0, y: 0, w: SIZE }];
    for (const it of queue) {
      const W = it.w + PAD, H = it.h + PAD;
      let best = null;
      for (let i = 0; i < sky.length; i++) {
        const x = sky[i].x;
        if (x + W > SIZE + PAD) break;
        let y = 0, rem = W, j = i;
        while (rem > 0 && j < sky.length) { y = Math.max(y, sky[j].y); rem -= sky[j].w; j++; }
        if (rem > 0) continue;
        if (y + H > SIZE + PAD) continue;
        if (!best || y < best.y) best = { x, y };
      }
      if (!best) throw new Error(`poles atlas full at ${it.name}`);
      const { x, y } = best;
      // raise the skyline over [x, x+W)
      const next = [];
      for (const s of sky) {
        if (s.x + s.w <= x || s.x >= x + W) { next.push(s); continue; }
        if (s.x < x) next.push({ x: s.x, y: s.y, w: x - s.x });
        if (s.x + s.w > x + W) next.push({ x: x + W, y: s.y, w: s.x + s.w - (x + W) });
      }
      next.push({ x, y: y + H, w: W });
      next.sort((a, b) => a.x - b.x);
      // merge equal-height neighbours
      sky = [];
      for (const s of next) {
        const last = sky[sky.length - 1];
        if (last && last.y === s.y && last.x + last.w === s.x) last.w += s.w; else sky.push({ ...s });
      }
      c.save();
      c.translate(x, y);
      c.beginPath();
      c.rect(0, 0, it.w, it.h);
      c.clip();
      it.draw(c, it.w, it.h);
      c.restore();
      // half-texel inset keeps bilinear sampling inside the region
      R[it.name] = { u0: (x + 0.5) / SIZE, u1: (x + it.w - 0.5) / SIZE, v0: 1 - (y + it.h - 0.5) / SIZE, v1: 1 - (y + 0.5) / SIZE };
    }
  }
  return { canvas, c, R, region, pack };
}

// ---------------------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------------------
const font = (weight, size, family = FONTS.gothic) => `${weight} ${size}px ${family}`;

function softBlob(c, x, y, rx, ry, color, alpha) {
  c.save();
  c.globalAlpha = alpha;
  const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.translate(x, y);
  c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
  c.beginPath();
  c.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Concrete pole strip: canvas top = pole top (12 m), wraps horizontally. */
function drawShaft(seed) {
  return (c, w, h) => {
    const rnd = seeded(seed);
    const H = 12;
    const py = (m) => (H - m) * (h / H);
    const base = c.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#a6a49f');
    base.addColorStop(0.08, '#b2b0aa');
    base.addColorStop(0.7, '#b6b4ad');
    base.addColorStop(0.93, '#adaba3');
    base.addColorStop(1, '#98978e');
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    // large soft patches (hand-painted unevenness), wrapped horizontally
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h;
      const rx = 20 + rnd() * 50, ry = 30 + rnd() * 120;
      const col = rnd() < 0.5 ? '#c6c4bd' : '#96948d';
      for (const ox of [-w, 0, w]) softBlob(c, x + ox, y, rx, ry, col, 0.22 + rnd() * 0.18);
    }
    // green-grey grime near the ground + splash line
    const gr = c.createLinearGradient(0, py(0.9), 0, h);
    gr.addColorStop(0, 'rgba(140,146,128,0)');
    gr.addColorStop(1, 'rgba(128,136,118,0.55)');
    c.fillStyle = gr;
    c.fillRect(0, py(0.9), w, h - py(0.9));
    // rain streaks below fittings (thin, soft, a few px wide)
    for (const m of [11.2, 10.5, 9.7, 8.2, 6.3, 5.3]) {
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const x = rnd() * w;
        const len = (0.4 + rnd() * 1.4) * (h / H);
        const g = c.createLinearGradient(0, py(m), 0, py(m) + len);
        g.addColorStop(0, 'rgba(120,118,112,0.35)');
        g.addColorStop(1, 'rgba(120,118,112,0)');
        c.fillStyle = g;
        c.fillRect(x, py(m), 1.5 + rnd() * 2.5, len);
      }
    }
    // a few tiny chips / pores (very sparse, not photographic)
    c.fillStyle = 'rgba(150,148,140,0.5)';
    for (let i = 0; i < 70; i++) {
      c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
    }
    // weathered horizontal casting joints
    c.strokeStyle = 'rgba(150,148,140,0.35)';
    c.lineWidth = 1;
    for (const m of [3.0, 7.0]) { c.beginPath(); c.moveTo(0, py(m)); c.lineTo(w, py(m)); c.stroke(); }
    // stencilled manufacture mark (tiny), faint, at ~1.9 m on one side
    c.fillStyle = 'rgba(96,96,102,0.4)';
    c.font = font(700, 6);
    c.textAlign = 'center';
    c.fillText('12-50', w * 0.25, py(2.9));
    c.fillText('H18', w * 0.25, py(2.84));
  };
}

function drawSleeve(c, w, h) {
  c.fillStyle = '#f2c230';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#2b2a2e';
  const P = 64;
  for (let k = -8; k < 12; k++) {
    c.beginPath();
    const x0 = k * P;
    c.moveTo(x0, h);
    c.lineTo(x0 + P / 2, h);
    c.lineTo(x0 + P / 2 + h * 1.36, 0);
    c.lineTo(x0 + h * 1.36, 0);
    c.closePath();
    c.fill();
  }
  // reflective bands + dark rims
  const band = (y0, y1) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#f7f9fb');
    g.addColorStop(0.5, '#e4ebf2');
    g.addColorStop(1, '#f2f5f8');
    c.fillStyle = g;
    c.fillRect(0, y0, w, y1 - y0);
    c.fillStyle = 'rgba(160,170,185,0.5)';
    for (let x = 0; x < w; x += 8) c.fillRect(x, y0 + 2, 1, y1 - y0 - 4); // prism texture hint
  };
  band(h * 0.07, h * 0.17);
  band(h * 0.52, h * 0.59);
  c.fillStyle = '#2b2a2e';
  c.fillRect(0, 0, w, h * 0.025);
  c.fillRect(0, h * 0.975, w, h * 0.025);
  // light scuffs near the bottom
  const rnd = seeded(91);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 14; i++) c.fillRect(rnd() * w, h * (0.8 + rnd() * 0.18), 4 + rnd() * 14, 1.5);
}

function drawNumberPlate(label, num, sub) {
  return (c, w, h) => {
    c.fillStyle = '#f6f5ef';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7d8288';
    c.lineWidth = 3;
    c.strokeRect(1.5, 1.5, w - 3, h - 3);
    // company header band with a sakura mark
    c.fillStyle = '#e98aa7';
    c.fillRect(3, 3, w - 6, h * 0.12);
    c.fillStyle = '#ffffff';
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      c.ellipse(w / 2 + Math.cos(a) * 6, 3 + h * 0.06 + Math.sin(a) * 6, 4.5, 4.5, 0, 0, Math.PI * 2);
    }
    c.fill();
    verticalText(c, label, w / 2, h * 0.15, h * 0.66, { font: FONTS.gothic, weight: 700, color: '#26282c', width: w * 0.62 });
    fitText(c, String(num), 4, h * 0.67, w - 8, h * 0.17, { font: FONTS.gothic, weight: 800, color: '#1c1e22' });
    fitText(c, sub, 4, h * 0.85, w - 8, h * 0.11, { font: FONTS.gothic, weight: 700, color: '#44484f' });
  };
}

function drawTelecomPlate(num) {
  return (c, w, h) => {
    c.fillStyle = '#dfe7ee';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#3b6fa8';
    c.fillRect(0, 0, w * 0.2, h);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(w * 0.1, h / 2, h * 0.22, 0, Math.PI * 2); c.fill();
    fitText(c, 'はるかぜ通信', w * 0.23, 2, w * 0.74, h * 0.45, { font: FONTS.gothic, weight: 700, color: '#2c4d77', align: 'left' });
    fitText(c, `桜ヶ丘 ${num}`, w * 0.23, h * 0.48, w * 0.74, h * 0.48, { font: FONTS.gothic, weight: 800, color: '#1d2a3a', align: 'left' });
  };
}

function drawAddressPlate(area, chome, num, romaji) {
  return (c, w, h) => {
    c.fillStyle = '#2f63b5';
    roundRect(c, 0, 0, w, h, 8); c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    roundRect(c, 4, 4, w - 8, h - 8, 6); c.stroke();
    fitText(c, `${area}${chome}`, 12, 8, w * 0.66, h * 0.58, { font: FONTS.gothic, weight: 700, color: '#ffffff', align: 'left' });
    fitText(c, romaji, 12, h * 0.62, w * 0.66, h * 0.26, { font: FONTS.latin, weight: 600, color: '#dce8ff', align: 'left' });
    c.fillStyle = '#ffffff';
    roundRect(c, w * 0.72, 10, w * 0.24, h - 20, 5); c.fill();
    fitText(c, String(num), w * 0.72, 12, w * 0.24, h - 24, { font: FONTS.gothic, weight: 800, color: '#2f63b5' });
  };
}

/** 巻き看板 (wrap-around pole advert), portrait. */
function drawWrapAd(kind) {
  return (c, w, h) => {
    const rnd = seeded(kind.length * 17 + 3);
    const K = {
      clinic: { bg: '#fff3b8', band: '#3a8f5a', top: '内科・小児科', main: 'さくらクリニック', foot: 'この先 50m', arrow: '↑', mainColor: '#1f5a36' },
      dental: { bg: '#ffffff', band: '#4a86c8', top: '予約制', main: '春日野歯科', foot: '→ 120m', arrow: '', mainColor: '#23456f' },
      estate: { bg: '#2f63b5', band: '#f2c230', top: '賃貸・売買', main: 'はるかぜ不動産', foot: '駅前店', arrow: '', mainColor: '#ffffff' },
      abacus: { bg: '#ffe6d6', band: '#d8433d', top: '生徒募集中', main: 'そろばん教室', foot: '見学歓迎', arrow: '', mainColor: '#7a2a24' },
    }[kind];
    c.fillStyle = K.bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = K.band;
    c.fillRect(0, 0, w, h * 0.16);
    c.fillRect(0, h * 0.86, w, h * 0.14);
    fitText(c, K.top, 8, h * 0.02, w - 16, h * 0.12, { font: FONTS.gothic, weight: 700, color: kind === 'estate' ? '#2a3550' : '#ffffff' });
    verticalText(c, K.main, w / 2, h * 0.18, h * 0.84, { font: FONTS.round, weight: 800, color: K.mainColor, width: w * 0.5 });
    fitText(c, `${K.arrow}${K.foot}`, 8, h * 0.87, w - 16, h * 0.11, { font: FONTS.gothic, weight: 800, color: kind === 'estate' ? '#2a3550' : '#ffffff' });
    // soft sun fading toward the top + a couple of scratches
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const x = rnd() * w, y = rnd() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 + rnd() * 20, y + rnd() * 6); c.stroke(); }
  };
}

/** Small stickers / flyers taped to poles. */
function drawSticker(kind) {
  return (c, w, h) => {
    const rnd = seeded(kind.charCodeAt(0) * 7 + kind.length);
    c.clearRect(0, 0, w, h);
    const paper = (bg) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); };
    switch (kind) {
      case 'nobill':
        paper('#ffffff');
        c.strokeStyle = '#d8433d'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
        verticalText(c, '貼紙禁止', w / 2, 12, h - 12, { font: FONTS.gothic, weight: 800, color: '#d8433d', width: w * 0.6 });
        break;
      case 'chikan':
        paper('#ffd6e2');
        fitText(c, '痴漢に', 6, 10, w - 12, h * 0.22, { font: FONTS.round, weight: 800, color: '#c0305a' });
        fitText(c, '注意!', 6, h * 0.3, w - 12, h * 0.26, { font: FONTS.round, weight: 800, color: '#c0305a' });
        fitText(c, '桜ヶ丘防犯協会', 6, h * 0.72, w - 12, h * 0.14, { font: FONTS.gothic, weight: 700, color: '#6a4050' });
        break;
      case 'cat':
        paper('#fbfaf4');
        fitText(c, '迷い猫', 6, 4, w - 12, h * 0.16, { font: FONTS.gothic, weight: 800, color: '#222' });
        c.fillStyle = '#e9b87a'; // a simple drawn cat face
        c.beginPath(); c.arc(w / 2, h * 0.42, w * 0.22, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(w / 2 - w * 0.2, h * 0.36); c.lineTo(w / 2 - w * 0.14, h * 0.2); c.lineTo(w / 2 - w * 0.04, h * 0.3); c.fill();
        c.beginPath(); c.moveTo(w / 2 + w * 0.2, h * 0.36); c.lineTo(w / 2 + w * 0.14, h * 0.2); c.lineTo(w / 2 + w * 0.04, h * 0.3); c.fill();
        c.fillStyle = '#333'; c.fillRect(w / 2 - 9, h * 0.4, 4, 4); c.fillRect(w / 2 + 5, h * 0.4, 4, 4);
        fitText(c, 'みーちゃん 3才', 6, h * 0.6, w - 12, h * 0.1, { font: FONTS.gothic, weight: 700, color: '#333' });
        c.strokeStyle = '#999'; c.lineWidth = 1;
        for (let x = 0; x < w; x += w / 6) { c.beginPath(); c.moveTo(x, h * 0.78); c.lineTo(x, h); c.stroke(); }
        c.beginPath(); c.moveTo(0, h * 0.78); c.lineTo(w, h * 0.78); c.stroke();
        c.clearRect(w / 6 * 2 + 1, h * 0.79, w / 6 - 2, h * 0.21); // one tab torn off
        break;
      case 'dog':
        paper('#dff0d8');
        fitText(c, '犬のフンは', 6, 8, w - 12, h * 0.2, { font: FONTS.round, weight: 800, color: '#2f6b3a' });
        fitText(c, '持ち帰り', 6, h * 0.3, w - 12, h * 0.2, { font: FONTS.round, weight: 800, color: '#2f6b3a' });
        fitText(c, 'ましょう', 6, h * 0.5, w - 12, h * 0.2, { font: FONTS.round, weight: 800, color: '#2f6b3a' });
        c.fillStyle = '#6a9a5a'; c.beginPath(); c.arc(w * 0.5, h * 0.83, h * 0.08, 0, Math.PI * 2); c.fill();
        break;
      case 'junk':
        paper('#fff27a');
        fitText(c, '不用品', 6, 8, w - 12, h * 0.26, { font: FONTS.gothic, weight: 900, color: '#d8433d' });
        fitText(c, '無料回収', 6, h * 0.34, w - 12, h * 0.24, { font: FONTS.gothic, weight: 900, color: '#222' });
        fitText(c, '☎ 0120-XX-XXXX', 4, h * 0.68, w - 8, h * 0.14, { font: FONTS.gothic, weight: 700, color: '#222' });
        break;
      case 'tutor':
        paper('#e2ecfa');
        fitText(c, '家庭教師', 6, 8, w - 12, h * 0.24, { font: FONTS.round, weight: 800, color: '#2f63b5' });
        fitText(c, '生徒募集', 6, h * 0.34, w - 12, h * 0.22, { font: FONTS.round, weight: 800, color: '#d8433d' });
        fitText(c, '小・中・高', 6, h * 0.64, w - 12, h * 0.16, { font: FONTS.gothic, weight: 700, color: '#333' });
        break;
      case 'graffiti':
        paper('#ffffff');
        c.strokeStyle = '#2f63b5'; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
        verticalText(c, '落書き禁止', w / 2, 10, h - 10, { font: FONTS.gothic, weight: 800, color: '#2f63b5', width: w * 0.55 });
        break;
      default: // torn residue: patches of paper + tape
        c.fillStyle = 'rgba(250,248,240,0.95)';
        for (let i = 0; i < 5; i++) { c.fillRect(rnd() * w * 0.7, rnd() * h * 0.8, 10 + rnd() * 30, 8 + rnd() * 26); }
        c.fillStyle = 'rgba(230,220,180,0.9)';
        c.fillRect(4, 4, 26, 10); c.fillRect(w - 30, h - 16, 26, 10);
        break;
    }
    // tape corners on flyers
    if (kind !== 'default' && kind !== 'nobill' && kind !== 'graffiti') {
      c.fillStyle = 'rgba(240,235,210,0.85)';
      c.fillRect(2, 0, 20, 8);
      c.fillRect(w - 22, 0, 20, 8);
    }
  };
}

// --- traffic sign faces ------------------------------------------------------
function discFace(draw) {
  return (c, w, h) => {
    c.fillStyle = '#9aa1a8';
    c.fillRect(0, 0, w, h);
    draw(c, w, h);
  };
}

function drawSpeed30(c, w, h) {
  const r = w / 2;
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d8433d'; c.beginPath(); c.arc(r, r, r * 0.97, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(r, r, r * 0.78, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2f63b5';
  c.font = font(700, r * 0.95, FONTS.gothic);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.translate(r, r * 1.04); c.scale(0.82, 1.1); c.fillText('30', 0, 0); c.restore();
}

function drawNoParking(c, w, h) {
  const r = w / 2;
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d8433d'; c.beginPath(); c.arc(r, r, r * 0.97, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2f63b5'; c.beginPath(); c.arc(r, r, r * 0.8, 0, Math.PI * 2); c.fill();
  c.save();
  c.beginPath(); c.arc(r, r, r * 0.8, 0, Math.PI * 2); c.clip();
  c.strokeStyle = '#d8433d'; c.lineWidth = r * 0.2;
  c.beginPath(); c.moveTo(r * 0.35, r * 0.35); c.lineTo(r * 1.65, r * 1.65); c.stroke();
  c.restore();
}

function drawDiamond(c, w, h, inner) {
  // yellow diamond (rotated square) with black border
  const r = w / 2;
  c.fillStyle = '#26262a';
  c.beginPath(); c.moveTo(r, 0); c.lineTo(w, r); c.lineTo(r, h); c.lineTo(0, r); c.closePath(); c.fill();
  c.fillStyle = '#f2c230';
  const k = 0.1 * w;
  c.beginPath(); c.moveTo(r, k); c.lineTo(w - k, r); c.lineTo(r, h - k); c.lineTo(k, r); c.closePath(); c.fill();
  c.fillStyle = '#26262a';
  inner(c, r);
}

function drawSchool(c, w, h) {
  drawDiamond(c, w, h, (c, r) => {
    // two children walking hand in hand (big sister with a bag + small brother)
    const kid = (x, y, s, skirt) => {
      c.beginPath(); c.arc(x, y - 52 * s, 11 * s, 0, Math.PI * 2); c.fill();
      c.beginPath();
      if (skirt) { c.moveTo(x - 7 * s, y - 38 * s); c.lineTo(x + 7 * s, y - 38 * s); c.lineTo(x + 15 * s, y - 8 * s); c.lineTo(x - 15 * s, y - 8 * s); }
      else { c.moveTo(x - 9 * s, y - 38 * s); c.lineTo(x + 9 * s, y - 38 * s); c.lineTo(x + 8 * s, y - 12 * s); c.lineTo(x - 8 * s, y - 12 * s); }
      c.closePath(); c.fill();
      c.fillRect(x - 7 * s, y - 10 * s, 5 * s, 28 * s);
      c.save(); c.translate(x + 4 * s, y - 10 * s); c.rotate(-0.35); c.fillRect(0, 0, 5 * s, 28 * s); c.restore();
    };
    kid(r - 14, r + 38, 1.25, true);
    kid(r + 30, r + 44, 0.95, false);
    c.lineWidth = 5; c.strokeStyle = '#26262a';
    c.beginPath(); c.moveTo(r - 6, r - 2); c.lineTo(r + 22, r + 6); c.stroke(); // holding hands
    c.fillRect(r - 38, r - 6, 16, 22); // school bag
  });
}

function drawRailway(c, w, h) {
  drawDiamond(c, w, h, (c, r) => {
    // simplified steam locomotive silhouette (踏切あり)
    const x0 = r - 62, y0 = r + 30;
    c.fillRect(x0, y0 - 30, 84, 26); // boiler
    c.fillRect(x0 + 72, y0 - 58, 44, 54); // cab
    c.fillRect(x0 + 68, y0 - 64, 52, 8); // roof
    c.fillRect(x0 + 8, y0 - 50, 13, 22); // chimney
    c.fillRect(x0 - 8, y0 - 6, 132, 8); // frame
    for (const [cx, rr] of [[x0 + 10, 12], [x0 + 38, 12], [x0 + 66, 12], [x0 + 98, 10]]) {
      c.beginPath(); c.arc(cx, y0 + 12, rr, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#f2c230';
    c.fillRect(x0 + 82, y0 - 50, 22, 16); // cab window
  });
}

function drawPedestrian(c, w, h) {
  c.fillStyle = '#ffffff';
  roundRect(c, 0, 0, w, h, 18); c.fill();
  c.fillStyle = '#2f63b5';
  roundRect(c, 7, 7, w - 14, h - 14, 13); c.fill();
  c.fillStyle = '#ffffff';
  // adult + child walking
  const person = (x, y, s) => {
    c.beginPath(); c.arc(x, y - 70 * s, 13 * s, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(x - 11 * s, y - 54 * s); c.lineTo(x + 11 * s, y - 54 * s); c.lineTo(x + 9 * s, y - 16 * s); c.lineTo(x - 9 * s, y - 16 * s); c.closePath(); c.fill();
    c.save(); c.translate(x - 4 * s, y - 18 * s); c.rotate(0.35); c.fillRect(-4 * s, 0, 8 * s, 40 * s); c.restore();
    c.save(); c.translate(x + 4 * s, y - 18 * s); c.rotate(-0.4); c.fillRect(-4 * s, 0, 8 * s, 40 * s); c.restore();
    c.save(); c.translate(x - 9 * s, y - 50 * s); c.rotate(0.5); c.fillRect(-3.5 * s, 0, 7 * s, 30 * s); c.restore();
    c.save(); c.translate(x + 9 * s, y - 50 * s); c.rotate(-0.55); c.fillRect(-3.5 * s, 0, 7 * s, 30 * s); c.restore();
  };
  person(w * 0.4, h * 0.8, 1.35);
  person(w * 0.68, h * 0.82, 0.95);
}

function drawStop(c, w, h) {
  // inverted triangle, white rim, 止まれ + STOP
  const tri = (k, col) => {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(k * 1.1, k * 0.7); c.lineTo(w - k * 1.1, k * 0.7); c.lineTo(w / 2, h - k * 1.2); c.closePath(); c.fill();
  };
  tri(0, '#ffffff');
  tri(9, '#d8433d');
  fitText(c, '止まれ', w * 0.16, h * 0.1, w * 0.68, h * 0.3, { font: FONTS.gothic, weight: 800, color: '#ffffff' });
  fitText(c, 'STOP', w * 0.3, h * 0.42, w * 0.4, h * 0.13, { font: FONTS.latin, weight: 800, color: '#ffffff' });
}

function drawDirection(lines) {
  return (c, w, h) => {
    c.fillStyle = '#2b5fae';
    roundRect(c, 0, 0, w, h, 14); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 6;
    roundRect(c, 8, 8, w - 16, h - 16, 10); c.stroke();
    const romaji = ['Sakuragaoka Sta.', 'Kasugano', 'Hanamidai'];
    const arrows = ['up', 'right', 'left'];
    const rowH = (h - 32) / 3;
    lines.forEach((text, i) => {
      const y = 16 + i * rowH;
      if (i > 0) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(24, y, w - 48, 2); }
      drawArrow(c, arrows[i], 60, y + rowH / 2, rowH * 0.36);
      fitText(c, text, 110, y + rowH * 0.06, w - 140, rowH * 0.6, { font: FONTS.gothic, weight: 800, color: '#ffffff', align: 'left' });
      fitText(c, romaji[i], 112, y + rowH * 0.62, w - 150, rowH * 0.3, { font: FONTS.latin, weight: 700, color: '#ffffff', align: 'left' });
    });
  };
}

function drawArrow(c, dir, x, y, s) {
  c.save();
  c.translate(x, y);
  c.rotate({ up: 0, right: Math.PI / 2, left: -Math.PI / 2 }[dir]);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0, -s); c.lineTo(s * 0.8, -s * 0.1); c.lineTo(s * 0.28, -s * 0.1); c.lineTo(s * 0.28, s);
  c.lineTo(-s * 0.28, s); c.lineTo(-s * 0.28, -s * 0.1); c.lineTo(-s * 0.8, -s * 0.1); c.closePath();
  c.fill();
  c.restore();
}

function drawSubPlate(text, opts = {}) {
  return (c, w, h) => {
    c.fillStyle = opts.bg || '#ffffff';
    roundRect(c, 0, 0, w, h, 6); c.fill();
    c.strokeStyle = opts.border || '#2f63b5'; c.lineWidth = 5;
    roundRect(c, 4, 4, w - 8, h - 8, 5); c.stroke();
    fitText(c, text, 14, 8, w - 28, h - 16, { font: FONTS.gothic, weight: 800, color: opts.color || '#2f63b5', letterSpacing: opts.spacing || 0 });
  };
}

/**
 * Convex mirror: a small fish-eye painting of the street corner — bowed
 * horizon, a road bending away to an off-centre vanishing point, buildings
 * leaning outward at the rim, a pole curving along the right edge.
 * Composition is deliberately asymmetric (no face-like pareidolia).
 */
function drawMirror(c, w, h) {
  const r = w / 2;
  c.fillStyle = '#9aa1a8';
  c.fillRect(0, 0, w, h);
  c.save();
  c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.clip();
  // sky
  const sky = c.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, '#86b4e6'); sky.addColorStop(1, '#e6eef7');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // soft cloud
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.beginPath(); c.ellipse(w * 0.3, h * 0.2, 46, 12, -0.15, 0, Math.PI * 2); c.fill();
  // ground (bowed horizon)
  const vx = w * 0.58, vy = h * 0.47; // vanishing point, off-centre
  c.fillStyle = '#c9c6bf';
  c.beginPath(); c.moveTo(0, h * 0.58); c.quadraticCurveTo(vx, h * 0.38, w, h * 0.56); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  // distant low houses along the horizon
  const far = [[0.2, 0.43, 34, 16, '#f2e6cf', '#56677a'], [0.36, 0.41, 26, 14, '#e8dcc4', '#5f6670'], [0.72, 0.42, 30, 15, '#f6f3ec', '#6c5647']];
  for (const [fx, fy, bw, bh, wall, roof] of far) {
    c.fillStyle = wall; c.fillRect(fx * w, fy * h, bw, bh);
    c.fillStyle = roof; c.fillRect(fx * w - 2, fy * h - 4, bw + 4, 5);
  }
  // sakura canopy peeking over the houses (upper left of centre)
  c.fillStyle = '#f7c2d2';
  c.beginPath(); c.ellipse(w * 0.3, h * 0.36, 30, 16, 0.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fde2ea';
  c.beginPath(); c.ellipse(w * 0.27, h * 0.33, 16, 8, 0.1, 0, Math.PI * 2); c.fill();
  // road: wide at the bottom, bending away to the vanishing point
  c.fillStyle = '#8d9096';
  c.beginPath();
  c.moveTo(w * 0.02, h); c.quadraticCurveTo(w * 0.34, h * 0.62, vx - 6, vy);
  c.lineTo(vx + 6, vy); c.quadraticCurveTo(w * 0.9, h * 0.66, w * 1.02, h * 0.9); c.lineTo(w, h); c.fill();
  c.strokeStyle = '#f4f3ee'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(w * 0.14, h); c.quadraticCurveTo(w * 0.4, h * 0.64, vx - 3, vy + 1); c.stroke();
  c.beginPath(); c.moveTo(w * 0.94, h * 0.9); c.quadraticCurveTo(w * 0.82, h * 0.64, vx + 3, vy + 1); c.stroke();
  // a white car approaching on the far lane
  c.fillStyle = '#f7f7f4'; c.fillRect(w * 0.62, h * 0.53, 16, 9);
  c.fillStyle = '#5c6a7a'; c.fillRect(w * 0.625, h * 0.535, 14, 3);
  // big near building bending along the left rim
  c.fillStyle = '#f0e2c8';
  c.beginPath(); c.moveTo(0, h * 0.22); c.quadraticCurveTo(w * 0.16, h * 0.3, w * 0.2, h * 0.52); c.lineTo(w * 0.17, h * 0.78); c.lineTo(0, h * 0.86); c.fill();
  c.fillStyle = '#5a6776';
  c.beginPath(); c.moveTo(0, h * 0.16); c.quadraticCurveTo(w * 0.17, h * 0.24, w * 0.23, h * 0.46); c.lineTo(w * 0.2, h * 0.5); c.quadraticCurveTo(w * 0.15, h * 0.3, 0, h * 0.24); c.fill();
  c.fillStyle = '#9fb6c8';
  c.fillRect(w * 0.06, h * 0.4, 14, 18); c.fillRect(w * 0.06, h * 0.62, 14, 16);
  // right-hand house corner + wall
  c.fillStyle = '#e4ecef';
  c.beginPath(); c.moveTo(w, h * 0.3); c.quadraticCurveTo(w * 0.84, h * 0.36, w * 0.8, h * 0.52); c.lineTo(w * 0.83, h * 0.7); c.lineTo(w, h * 0.78); c.fill();
  c.fillStyle = '#6c5647';
  c.beginPath(); c.moveTo(w, h * 0.25); c.quadraticCurveTo(w * 0.83, h * 0.31, w * 0.78, h * 0.49); c.lineTo(w * 0.8, h * 0.52); c.quadraticCurveTo(w * 0.85, h * 0.36, w, h * 0.31); c.fill();
  // utility pole curving along the right edge + two thin grey wires
  c.strokeStyle = '#a19f99'; c.lineWidth = 6; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(w * 0.9, h * 0.95); c.quadraticCurveTo(w * 0.93, h * 0.45, w * 0.99, h * 0.08); c.stroke();
  c.strokeStyle = 'rgba(70,74,82,0.55)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(w * 0.96, h * 0.2); c.quadraticCurveTo(w * 0.6, h * 0.16, w * 0.08, h * 0.08); c.stroke();
  c.beginPath(); c.moveTo(w * 0.95, h * 0.27); c.quadraticCurveTo(w * 0.7, h * 0.3, w * 0.35, h * 0.24); c.stroke();
  c.restore();
  // darkened rim (convex look) + glossy highlight arcs upper left
  const rim = c.createRadialGradient(r, r, r * 0.62, r, r, r);
  rim.addColorStop(0, 'rgba(40,50,70,0)'); rim.addColorStop(1, 'rgba(40,50,70,0.32)');
  c.fillStyle = rim; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 8; c.lineCap = 'round';
  c.beginPath(); c.arc(r, r, r * 0.82, Math.PI * 1.08, Math.PI * 1.36); c.stroke();
  c.lineWidth = 3.5;
  c.beginPath(); c.arc(r, r, r * 0.69, Math.PI * 1.12, Math.PI * 1.22); c.stroke();
}

function drawMirrorPlate(line1, line2) {
  return (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8742f'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
    fitText(c, line1, 8, 8, w - 16, h * 0.5, { font: FONTS.gothic, weight: 800, color: '#d8433d' });
    fitText(c, line2, 8, h * 0.52, w - 16, h * 0.38, { font: FONTS.gothic, weight: 700, color: '#2f3a55' });
  };
}

function drawDanger(c, w, h) {
  c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#26262a'; c.fillRect(0, 0, w, h * 0.3);
  fitText(c, '危険', 6, 4, w - 12, h * 0.24, { font: FONTS.gothic, weight: 900, color: '#f2c230' });
  c.fillStyle = '#d8433d';
  c.beginPath(); c.moveTo(w * 0.55, h * 0.34); c.lineTo(w * 0.36, h * 0.58); c.lineTo(w * 0.5, h * 0.58); c.lineTo(w * 0.42, h * 0.76); c.lineTo(w * 0.66, h * 0.5); c.lineTo(w * 0.52, h * 0.5); c.closePath(); c.fill();
  fitText(c, '高電圧', 6, h * 0.78, w - 12, h * 0.18, { font: FONTS.gothic, weight: 900, color: '#26262a' });
}

function drawCctv(c, w, h) {
  c.fillStyle = '#ffffff'; roundRect(c, 0, 0, w, h, 8); c.fill();
  c.fillStyle = '#2f63b5'; roundRect(c, 4, 4, w - 8, h - 8, 6); c.fill();
  // camera pictogram
  c.fillStyle = '#ffffff';
  c.save(); c.translate(w * 0.2, h * 0.42); c.rotate(0.2);
  c.fillRect(-22, -9, 36, 18); c.beginPath(); c.moveTo(14, -6); c.lineTo(26, -12); c.lineTo(26, 12); c.lineTo(14, 6); c.fill();
  c.restore();
  c.fillRect(w * 0.2 - 3, h * 0.5, 6, 20);
  fitText(c, '防犯カメラ', w * 0.38, 8, w * 0.58, h * 0.42, { font: FONTS.gothic, weight: 800, color: '#ffffff' });
  fitText(c, '作動中', w * 0.38, h * 0.5, w * 0.58, h * 0.4, { font: FONTS.gothic, weight: 800, color: '#fff27a' });
}

function drawTransLabel(c, w, h) {
  c.fillStyle = '#eef0f0'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#555b62'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
  fitText(c, '30kVA', 3, 2, w - 6, h * 0.55, { font: FONTS.latin, weight: 800, color: '#26282c' });
  fitText(c, 'はるかぜ電力', 3, h * 0.55, w - 6, h * 0.4, { font: FONTS.gothic, weight: 700, color: '#555b62' });
}

function drawLampLens(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fffbef'); g.addColorStop(1, '#ffe7b8'); // warm, faintly lit
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.12);
}

function drawBoxDoor(title) {
  return (c, w, h) => {
    c.fillStyle = '#c9ccc9'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8e9396'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#6d7278'; c.fillRect(w - 20, h * 0.45, 7, 18);
    c.fillStyle = '#ffffff'; c.fillRect(14, 14, w - 44, 26);
    fitText(c, title, 16, 15, w - 48, 24, { font: FONTS.gothic, weight: 700, color: '#2c3a4a' });
    c.fillStyle = '#f2c230'; c.fillRect(14, 48, 30, 26);
    c.fillStyle = '#26262a';
    c.beginPath(); c.moveTo(29, 52); c.lineTo(41, 72); c.lineTo(17, 72); c.closePath(); c.fill();
    c.fillStyle = '#f2c230'; c.fillRect(27.5, 58, 3, 8);
  };
}

// ---------------------------------------------------------------------------
// public: build the atlas
// ---------------------------------------------------------------------------
/**
 * @param {object} spec  { plates: [{key,label,num,sub}], telecom: n, directionText: [3 strings] }
 * @returns {{texture: THREE.Texture, R: object}}
 */
export function makePoleAtlas(spec) {
  const A = createAtlas();
  const { region } = A;
  for (let i = 0; i < 4; i++) region(`shaft${i}`, 128, 1024, drawShaft(101 + i * 13));
  region('sleeve', 256, 256, drawSleeve);
  region('dir', 512, 320, drawDirection(spec.directionText));
  for (const k of ['clinic', 'dental', 'estate', 'abacus']) region(`ad_${k}`, 192, 320, drawWrapAd(k));
  for (const p of spec.plates) region(`plate_${p.key}`, 64, 256, drawNumberPlate(p.label, p.num, p.sub));
  // signs
  region('s_speed30', 256, 256, discFace(drawSpeed30));
  region('s_noParking', 256, 256, discFace(drawNoParking));
  region('s_school', 256, 256, discFace(drawSchool));
  region('s_rail', 256, 256, discFace(drawRailway));
  region('s_ped', 256, 256, discFace(drawPedestrian));
  region('s_stop', 256, 222, discFace(drawStop));
  region('mirror', 256, 256, drawMirror);
  const stickers = ['nobill', 'chikan', 'cat', 'dog', 'junk', 'tutor', 'graffiti', 'default'];
  for (const k of stickers) region(`st_${k}`, 96, 128, drawSticker(k));
  region('danger', 96, 128, drawDanger);
  region('box_tel', 128, 160, drawBoxDoor('はるかぜ通信'));
  region('box_pow', 128, 160, drawBoxDoor('はるかぜ電力'));
  region('sub_time', 256, 96, drawSubPlate('8 - 20', { spacing: 6 }));
  region('sub_school', 256, 96, drawSubPlate('通学路', { spacing: 10 }));
  region('sub_rail', 256, 96, drawSubPlate('この先踏切'));
  region('sub_zone', 256, 96, drawSubPlate('ここから'));
  region('sub_ped', 256, 96, drawSubPlate('歩行者優先'));
  region('mplate0', 256, 72, drawMirrorPlate('交通安全', '桜ヶ丘町会'));
  region('mplate1', 256, 72, drawMirrorPlate('とびだし注意', '駅前商店会'));
  region('addr0', 256, 80, drawAddressPlate('桜ヶ丘', '一丁目', 4, 'Sakuragaoka 1'));
  region('addr1', 256, 80, drawAddressPlate('桜ヶ丘', '二丁目', 11, 'Sakuragaoka 2'));
  region('addr2', 256, 80, drawAddressPlate('桜ヶ丘', '三丁目', 7, 'Sakuragaoka 3'));
  region('addr3', 256, 80, drawAddressPlate('駅前', '一丁目', 2, 'Ekimae 1'));
  region('addr4', 256, 80, drawAddressPlate('北町', '二丁目', 15, 'Kitamachi 2'));
  region('cctv', 160, 96, drawCctv);
  for (let i = 0; i < 3; i++) region(`tel${i}`, 128, 48, drawTelecomPlate(20 + i * 7));
  region('trans', 64, 40, drawTransLabel);
  region('lens', 64, 32, drawLampLens);

  A.pack();
  const texture = toTexture(A.canvas, { mipmaps: true });
  texture.name = 'poles_atlas';
  texture.userData.canvas = A.canvas;
  return { texture, R: A.R };
}

export default makePoleAtlas;
