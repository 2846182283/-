/**
 * props/vendTex.js — the vending-machine atlas ("V").
 *
 *   disp_A|B|C     backlit drink display: 3 shelves x 6 dummies (cans, PET
 *                  bottles, short bottles) with price labels, つめたい / あたたかい
 *                  tags and selection buttons (one sold-out)
 *   head_<id>      brand header per machine (fictional brands only)
 *   side_<id>      side panel (colour, big ad graphic or plain, grime)
 *   low_<id>       lower front panel: machine colour, とりだしぐち label,
 *                  stickers, dust / scratches / rain streaks
 *   ctrl           right-hand control strip: coin / bill slots, IC reader,
 *                  おつり lever labels, tiny LED readout
 */
import { mural } from './signTex.js';
import { Atlas, roundRect, fitText, verticalText, FONTS, seeded, grime, blotches, blossom, text, font } from './atlas.js';

/** Per-machine look (keys match SPOTS.vending ids). */
export const MACHINES = {
  V1: { body: '#f3f5f6', trim: '#d9dee4', display: 'A', brand: 'HARUKAZE', sub: 'はるかぜ飲料', headBg: '#eaf3fb', headInk: '#2f6fb8', accent: '#f29bb4', side: 'sakura' },
  V2: { body: '#3f7fc8', trim: '#2e5f9a', display: 'B', brand: 'Fresh Spring', sub: 'フレッシュスプリング', headBg: '#2f6fb8', headInk: '#ffffff', accent: '#9fd4ff', side: 'water' },
  V3: { body: '#d8484a', trim: '#a93537', display: 'B', brand: 'KIRAMEKI', sub: 'きらめきソーダ', headBg: '#c93c3f', headInk: '#ffffff', accent: '#ffd35c', side: 'soda' },
  V4: { body: '#f2f4f5', trim: '#d5dade', display: 'A', brand: 'さくらドリンク', sub: 'SAKURA DRINK', headBg: '#fde9ef', headInk: '#d9668d', accent: '#8fc9a0', side: 'plain' },
  V5: { body: '#4fa878', trim: '#3a8560', display: 'C', brand: '茶の香', sub: 'CHA-NO-KA', headBg: '#3f9168', headInk: '#ffffff', accent: '#e8f2c8', side: 'tea' },
  V6: { body: '#a9d9b8', trim: '#86bd98', display: 'C', brand: 'そよかぜ', sub: 'Soyokaze Water', headBg: '#dff1e4', headInk: '#3a8560', accent: '#f5a9bf', side: 'sakura' },
};

// ---------------------------------------------------------------------------
// drink catalogue
// ---------------------------------------------------------------------------
// kind: can | tall (tall can) | pet (500 ml PET) | short (280 ml PET) | bottle (glass-ish)
const D = {
  bitou: { kind: 'can', body: '#6b4a36', band: '#f1e2c8', ink: '#6b4a36', label: '微糖', sub: 'COFFEE', motif: 'bean', price: 130 },
  black: { kind: 'can', body: '#26262c', band: '#c9a36a', ink: '#f3e7cf', label: 'BLACK', sub: '無糖', motif: 'bean', price: 130 },
  cafeole: { kind: 'tall', body: '#e8d6b8', band: '#8a5a3c', ink: '#5a3a26', label: 'カフェオレ', sub: 'CAFE AU LAIT', motif: 'cup', price: 140 },
  ryokucha: { kind: 'pet', liquid: '#b7c96a', band: '#3c8a4e', ink: '#ffffff', label: '緑茶', sub: 'お〜い', motif: 'leaf', price: 160, vertical: true },
  houji: { kind: 'pet', liquid: '#b07a48', band: '#7a4a2a', ink: '#fff4e0', label: 'ほうじ茶', motif: 'leaf', price: 160, vertical: true },
  mugicha: { kind: 'pet', liquid: '#c58a4a', band: '#e2c26a', ink: '#6a3a1a', label: '麦茶', motif: 'grain', price: 150, vertical: true },
  jasmine: { kind: 'pet', liquid: '#d8d08a', band: '#ffffff', ink: '#3a8a6a', label: 'ジャスミン', motif: 'flower', price: 160 },
  water: { kind: 'pet', liquid: '#dff0fb', band: '#3f8fd0', ink: '#ffffff', label: '天然水', sub: 'WATER', motif: 'mountain', price: 110 },
  lemon: { kind: 'can', body: '#f4d84a', band: '#ffffff', ink: '#2f8a4a', label: 'レモン', sub: 'SQUASH', motif: 'lemon', price: 130 },
  sakura: { kind: 'can', body: '#f7b6c8', band: '#ffffff', ink: '#d9668d', label: '桜ソーダ', sub: '限定', motif: 'sakura', price: 150, limited: true },
  orange: { kind: 'pet', liquid: '#f6a33a', band: '#ffffff', ink: '#e8742a', label: 'オレンジ', sub: '100%', motif: 'orange', price: 160 },
  sports: { kind: 'pet', liquid: '#eef6fb', band: '#3b7fd1', ink: '#ffffff', label: 'ION', sub: 'SUPPLY', motif: 'wave', price: 150 },
  ichigo: { kind: 'short', liquid: '#f7c3cf', band: '#ffffff', ink: '#e0607f', label: 'いちご', sub: 'ミルク', motif: 'berry', price: 140 },
  milktea: { kind: 'short', liquid: '#d9b894', band: '#fff7ec', ink: '#8a5a3c', label: 'ミルクティー', motif: 'cup', price: 140 },
  oshiruko: { kind: 'can', body: '#7a2e2e', band: '#f2dcc0', ink: '#7a2e2e', label: 'おしるこ', motif: 'bean', price: 130, vertical: true },
  corn: { kind: 'can', body: '#f2c94a', band: '#ffffff', ink: '#d0662a', label: 'コーン', sub: 'スープ', motif: 'corn', price: 130 },
  cider: { kind: 'bottle', liquid: '#dff3ff', band: '#5aa8e0', ink: '#ffffff', label: 'サイダー', motif: 'bubble', price: 140 },
  melon: { kind: 'can', body: '#8fd08a', band: '#ffffff', ink: '#3a8a4a', label: 'メロン', sub: 'SODA', motif: 'bubble', price: 130 },
  cocoa: { kind: 'can', body: '#8a5a3c', band: '#f2e2c8', ink: '#5a3322', label: 'ココア', motif: 'cup', price: 130 },
};

// per display: rows top -> bottom; each entry [drinkKey, hot?]
const DISPLAYS = {
  A: [
    [['bitou'], ['black'], ['cafeole'], ['ryokucha'], ['houji'], ['water']],
    [['lemon'], ['sakura'], ['sakura'], ['orange'], ['sports'], ['ichigo']],
    [['oshiruko', 1], ['corn', 1], ['bitou', 1], ['milktea', 1], ['cocoa', 1], ['ryokucha', 1]],
  ],
  B: [
    [['sakura'], ['sakura'], ['melon'], ['lemon'], ['cider'], ['water']],
    [['sports'], ['sports'], ['orange'], ['ryokucha'], ['ichigo'], ['cafeole']],
    [['bitou'], ['black'], ['corn', 1], ['oshiruko', 1], ['milktea', 1], ['cocoa', 1]],
  ],
  C: [
    [['ryokucha'], ['ryokucha'], ['houji'], ['mugicha'], ['jasmine'], ['water']],
    [['water'], ['sakura'], ['lemon'], ['ichigo'], ['orange'], ['bitou']],
    [['ryokucha', 1], ['houji', 1], ['oshiruko', 1], ['corn', 1], ['milktea', 1], ['cafeole', 1]],
  ],
};

// ---------------------------------------------------------------------------
// drink dummies
// ---------------------------------------------------------------------------
function motif(g, m, cx, cy, s, d) {
  g.save();
  switch (m) {
    case 'bean':
      g.fillStyle = d.kind === 'can' && d.body === '#26262c' ? '#c9a36a' : '#6b4a36';
      g.beginPath(); g.ellipse(cx, cy, s * 0.35, s * 0.24, 0.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f1e2c8'; g.lineWidth = s * 0.06;
      g.beginPath(); g.moveTo(cx - s * 0.25, cy - s * 0.1); g.quadraticCurveTo(cx, cy + s * 0.1, cx + s * 0.25, cy + s * 0.1); g.stroke();
      break;
    case 'lemon':
      g.fillStyle = '#fff27a'; g.beginPath(); g.arc(cx, cy, s * 0.36, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e8c23a'; g.lineWidth = s * 0.05;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * s * 0.32, cy + Math.sin(a) * s * 0.32); g.stroke(); }
      break;
    case 'orange':
      g.fillStyle = '#f7a23a'; g.beginPath(); g.arc(cx, cy, s * 0.36, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5aa04a'; g.beginPath(); g.ellipse(cx + s * 0.12, cy - s * 0.36, s * 0.14, s * 0.07, -0.5, 0, Math.PI * 2); g.fill();
      break;
    case 'sakura':
      blossom(g, cx, cy, s * 0.36, '#ffffff', '#e98aa7', 0.3);
      blossom(g, cx + s * 0.34, cy + s * 0.3, s * 0.18, '#ffe3ec', '#e98aa7', 1.1);
      break;
    case 'berry':
      g.fillStyle = '#e0435f'; g.beginPath(); g.moveTo(cx - s * 0.3, cy - s * 0.15); g.quadraticCurveTo(cx, cy + s * 0.55, cx + s * 0.3, cy - s * 0.15); g.quadraticCurveTo(cx, cy - s * 0.35, cx - s * 0.3, cy - s * 0.15); g.fill();
      g.fillStyle = '#5aa04a'; g.fillRect(cx - s * 0.14, cy - s * 0.3, s * 0.28, s * 0.08);
      break;
    case 'corn':
      g.fillStyle = '#ffd84a'; g.beginPath(); g.ellipse(cx, cy, s * 0.18, s * 0.38, 0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7fb85a'; g.beginPath(); g.ellipse(cx + s * 0.16, cy + s * 0.08, s * 0.08, s * 0.34, 0.2, 0, Math.PI * 2); g.fill();
      break;
    case 'leaf':
      g.fillStyle = d.kind === 'pet' ? '#ffffff' : '#5aa04a';
      g.beginPath(); g.ellipse(cx, cy, s * 0.14, s * 0.3, 0.6, 0, Math.PI * 2); g.fill();
      break;
    case 'mountain':
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - s * 0.4, cy + s * 0.2); g.lineTo(cx - s * 0.05, cy - s * 0.25); g.lineTo(cx + s * 0.4, cy + s * 0.2); g.fill();
      break;
    case 'cup':
      g.fillStyle = '#ffffff'; g.fillRect(cx - s * 0.2, cy - s * 0.12, s * 0.4, s * 0.3);
      g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(cx + s * 0.24, cy + s * 0.02, s * 0.1, -1.4, 1.4); g.stroke();
      break;
    case 'bubble':
      g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.05;
      for (const [dx, dy, r] of [[-0.15, 0.1, 0.12], [0.12, -0.1, 0.09], [0.05, 0.22, 0.06], [-0.05, -0.25, 0.05]]) { g.beginPath(); g.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); g.stroke(); }
      break;
    case 'wave':
      g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.07; g.beginPath();
      for (let i = 0; i <= 8; i++) { const x = cx - s * 0.4 + (i / 8) * s * 0.8; const y = cy + Math.sin(i * 1.2) * s * 0.1; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      break;
    case 'grain':
      g.fillStyle = '#c58a4a';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(cx - s * 0.1 + (i % 2) * s * 0.2, cy - s * 0.2 + i * s * 0.13, s * 0.08, s * 0.05, 0.6, 0, Math.PI * 2); g.fill(); }
      break;
    case 'flower':
      blossom(g, cx, cy, s * 0.3, '#ffffff', '#f2c230', 0);
      break;
    default:
  }
  g.restore();
}

/** Draw one dummy standing on y = base, centred at cx, available width w. */
function drink(g, d, cx, base, w, hot, maxH = Infinity) {
  const k = d.kind;
  const aspect = k === 'can' ? 1.55 : k === 'tall' ? 1.85 : k === 'short' ? 1.9 : k === 'bottle' ? 2.2 : 2.35;
  if (w * aspect > maxH) w = maxH / aspect; // keep proportions when the shelf is too low
  const H = w * aspect;
  const bw = k === 'can' || k === 'tall' ? w * 0.82 : w * 0.78;
  const x0 = cx - bw / 2, top = base - H;
  g.save();
  // soft contact shadow on the shelf
  g.fillStyle = 'rgba(40,50,70,0.18)';
  g.beginPath(); g.ellipse(cx + 2, base, bw * 0.55, 3.5, 0, 0, Math.PI * 2); g.fill();
  if (k === 'can' || k === 'tall') {
    // body
    g.fillStyle = d.body;
    roundRect(g, x0, top + 5, bw, H - 5, 5);
    g.fill();
    // label band
    g.fillStyle = d.band;
    g.fillRect(x0, top + H * 0.28, bw, H * 0.42);
    // lid rim
    g.fillStyle = '#c9cdd3';
    roundRect(g, x0 + 2, top, bw - 4, 8, 3); g.fill();
    g.fillStyle = '#9aa1a8';
    g.fillRect(x0 + 2, top + 6, bw - 4, 2);
    // bottom rim
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x0, base - 5, bw, 2);
  } else {
    // bottle: cap, neck, shoulders, body with liquid, label band
    const capW = bw * 0.34, neckY = top + H * 0.12, shY = top + H * 0.27;
    g.fillStyle = d.kind === 'bottle' ? '#5aa8e0' : '#f4f4f4';
    roundRect(g, cx - capW / 2, top, capW, H * 0.08, 3); g.fill();
    g.fillStyle = 'rgba(200,215,230,0.9)';
    g.beginPath();
    g.moveTo(cx - capW / 2, top + H * 0.08);
    g.lineTo(cx - capW / 2, neckY);
    g.quadraticCurveTo(x0, neckY + H * 0.04, x0, shY);
    g.lineTo(x0, base - 3);
    g.quadraticCurveTo(x0, base, x0 + 4, base);
    g.lineTo(x0 + bw - 4, base);
    g.quadraticCurveTo(x0 + bw, base, x0 + bw, base - 3);
    g.lineTo(x0 + bw, shY);
    g.quadraticCurveTo(x0 + bw, neckY + H * 0.04, cx + capW / 2, neckY);
    g.lineTo(cx + capW / 2, top + H * 0.08);
    g.closePath();
    g.fill();
    // liquid
    g.save();
    g.clip();
    g.fillStyle = d.liquid;
    g.fillRect(x0, top + H * 0.2, bw, H);
    g.restore();
    // label
    g.fillStyle = d.band;
    g.fillRect(x0, top + H * 0.42, bw, H * 0.34);
  }
  // text + motif on the label band
  const bandY = k === 'can' || k === 'tall' ? top + H * 0.28 : top + H * 0.42;
  const bandH = k === 'can' || k === 'tall' ? H * 0.42 : H * 0.34;
  if (d.vertical) {
    verticalText(g, d.label, cx, bandY + 2, bandY + bandH - 2, { font: FONTS.mincho, weight: 700, color: d.ink, width: bw * 0.7 });
  } else {
    fitText(g, d.label, x0 + 2, bandY + bandH * 0.05, bw - 4, bandH * 0.36, { font: FONTS.round, weight: 800, color: d.ink });
    motif(g, d.motif, cx, bandY + bandH * 0.66, bandH * 0.55, d);
  }
  if (d.sub && !d.vertical) {
    const sy = k === 'can' || k === 'tall' ? top + H * 0.14 : top + H * 0.3;
    fitText(g, d.sub, x0 + 3, sy, bw - 6, H * 0.1, { font: FONTS.gothic, weight: 700, color: k === 'can' || k === 'tall' ? d.band : d.ink });
  }
  if (d.limited) {
    // 限定 starburst sticker
    g.fillStyle = '#e8434f';
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? 9 : 13;
      g.lineTo(x0 + bw - 4 + Math.cos(a) * r, top + 18 + Math.sin(a) * r);
    }
    g.fill();
    text(g, '限定', x0 + bw - 4, top + 18, 9, '#ffffff', { family: FONTS.gothic });
  }
  // vertical highlight + shade (toon-ish two tone)
  g.globalAlpha = 0.28;
  g.fillStyle = '#ffffff';
  g.fillRect(x0 + bw * 0.16, top + 8, bw * 0.12, H - 14);
  g.globalAlpha = 0.14;
  g.fillStyle = '#1a2440';
  g.fillRect(x0 + bw * 0.74, top + 8, bw * 0.26, H - 12);
  g.globalAlpha = 1;
  if (hot) {
    // a warm glow behind hot drinks
    g.globalCompositeOperation = 'destination-over';
    const rg = g.createRadialGradient(cx, base - H * 0.4, 2, cx, base - H * 0.4, w * 0.9);
    rg.addColorStop(0, 'rgba(255,190,150,0.55)');
    rg.addColorStop(1, 'rgba(255,190,150,0)');
    g.fillStyle = rg;
    g.fillRect(cx - w, base - H, w * 2, H);
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

function display(g, w, h, rows, seed) {
  const rnd = seeded(seed);
  // backlit background: cool white with a faint blue gradient + fluorescent band
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#f4f8fc');
  bg.addColorStop(1, '#dde8f3');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const rowH = h / rows.length;
  const soldOut = Math.floor(rnd() * 6);
  rows.forEach((row, ri) => {
    const y0 = ri * rowH;
    const shelfY = y0 + rowH * 0.74;
    const colW = w / row.length;
    // shelf back tint
    const hotRow = row.some((e) => e[1]);
    g.fillStyle = hotRow ? 'rgba(255,215,200,0.35)' : 'rgba(210,228,245,0.35)';
    g.fillRect(0, y0 + 4, w, shelfY - y0 - 4);
    row.forEach(([key, hot], ci) => {
      const d = D[key];
      const cx = (ci + 0.5) * colW;
      drink(g, d, cx, shelfY, colW * 0.8, !!hot, shelfY - y0 - 10);
    });
    // shelf lip
    g.fillStyle = '#c3ccd6';
    g.fillRect(0, shelfY, w, 4);
    g.fillStyle = '#ffffff';
    g.fillRect(0, shelfY + 4, w, rowH * 0.26 - 4);
    // price labels / temperature tags / buttons
    row.forEach(([key, hot], ci) => {
      const d = D[key];
      const cx = (ci + 0.5) * colW;
      const ty = shelfY + 7;
      // temperature tag
      g.fillStyle = hot ? '#e0484a' : '#3a78c8';
      roundRect(g, cx - colW * 0.42, ty, colW * 0.84, 13, 3); g.fill();
      fitText(g, hot ? 'あたたか〜い' : 'つめた〜い', cx - colW * 0.4, ty, colW * 0.8, 13, { font: FONTS.round, weight: 800, color: '#ffffff' });
      // price
      fitText(g, `¥${d.price}`, cx - colW * 0.4, ty + 14, colW * 0.8, 15, { font: FONTS.gothic, weight: 800, color: '#2a2e36' });
      // push button (lit)
      const sold = ri === 1 && ci === soldOut;
      const by = ty + 31;
      g.fillStyle = sold ? '#ff5a5a' : '#7ad0ff';
      roundRect(g, cx - colW * 0.3, by, colW * 0.6, Math.max(7, rowH * 0.26 - 36), 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(cx - colW * 0.24, by + 2, colW * 0.48, 2);
      if (sold) fitText(g, 'うりきれ', cx - colW * 0.3, by, colW * 0.6, Math.max(7, rowH * 0.26 - 36), { font: FONTS.gothic, weight: 700, color: '#ffffff' });
    });
  });
  // subtle vignette at the edges of the window (the recess)
  const vg = g.createLinearGradient(0, 0, w, 0);
  vg.addColorStop(0, 'rgba(60,70,90,0.18)');
  vg.addColorStop(0.05, 'rgba(60,70,90,0)');
  vg.addColorStop(0.95, 'rgba(60,70,90,0)');
  vg.addColorStop(1, 'rgba(60,70,90,0.18)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

function header(g, w, h, m) {
  g.fillStyle = m.headBg;
  g.fillRect(0, 0, w, h);
  // soft diagonal light bands
  g.globalAlpha = 0.18;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(w * (0.1 + i * 0.28), 0); g.lineTo(w * (0.22 + i * 0.28), 0); g.lineTo(w * (0.12 + i * 0.28), h); g.lineTo(w * (0.0 + i * 0.28), h);
    g.fill();
  }
  g.globalAlpha = 1;
  // accent swoosh
  g.strokeStyle = m.accent;
  g.lineWidth = h * 0.08;
  g.beginPath(); g.moveTo(w * 0.05, h * 0.82); g.quadraticCurveTo(w * 0.5, h * 0.62, w * 0.95, h * 0.84); g.stroke();
  const jp = /[^\x00-\x7f]/.test(m.brand);
  fitText(g, m.brand, w * 0.08, h * 0.1, w * 0.84, h * 0.52, { font: jp ? FONTS.round : FONTS.latin, weight: 800, color: m.headInk, letterSpacing: jp ? 2 : 4 });
  fitText(g, m.sub, w * 0.2, h * 0.62, w * 0.6, h * 0.2, { font: FONTS.gothic, weight: 700, color: m.headInk });
  blossom(g, w * 0.07, h * 0.3, h * 0.16, '#ffffff', m.accent, 0.4);
  blossom(g, w * 0.93, h * 0.34, h * 0.13, '#ffffff', m.accent, 1.2);
}

function sidePanel(g, w, h, m, seed) {
  const rnd = seeded(seed);
  g.fillStyle = m.body;
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#ffffff', 5, 0.05, 0.4);
  const art = { x: w * 0.1, y: h * 0.06, w: w * 0.8, h: h * 0.58 };
  if (m.side === 'sakura') {
    const bg = g.createLinearGradient(0, art.y, 0, art.y + art.h);
    bg.addColorStop(0, '#fbe3ea'); bg.addColorStop(1, '#f7c1d0');
    g.fillStyle = bg;
    roundRect(g, art.x, art.y, art.w, art.h, 12); g.fill();
    for (let i = 0; i < 14; i++) blossom(g, art.x + rnd() * art.w, art.y + rnd() * art.h * 0.6, 8 + rnd() * 12, '#ffffff', '#e98aa7', rnd() * 6);
    // big can
    drink(g, D.sakura, w / 2, art.y + art.h * 0.95, art.w * 0.42, false);
    fitText(g, '春限定', art.x, art.y + art.h * 0.04, art.w, 34, { font: FONTS.round, weight: 800, color: '#d9668d' });
  } else if (m.side === 'water') {
    const bg = g.createLinearGradient(0, art.y, 0, art.y + art.h);
    bg.addColorStop(0, '#e6f3fc'); bg.addColorStop(1, '#a9d2f0');
    g.fillStyle = bg;
    roundRect(g, art.x, art.y, art.w, art.h, 12); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(art.x, art.y + art.h * 0.7); g.lineTo(art.x + art.w * 0.35, art.y + art.h * 0.42); g.lineTo(art.x + art.w * 0.6, art.y + art.h * 0.6); g.lineTo(art.x + art.w * 0.8, art.y + art.h * 0.48); g.lineTo(art.x + art.w, art.y + art.h * 0.64); g.lineTo(art.x + art.w, art.y + art.h); g.lineTo(art.x, art.y + art.h); g.fill();
    drink(g, D.water, w / 2, art.y + art.h * 0.95, art.w * 0.34, false);
    fitText(g, 'おいしい水', art.x, art.y + art.h * 0.04, art.w, 30, { font: FONTS.round, weight: 800, color: '#2f6fb8' });
  } else if (m.side === 'soda') {
    g.fillStyle = '#ffd35c';
    roundRect(g, art.x, art.y, art.w, art.h, 12); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(art.x + rnd() * art.w, art.y + rnd() * art.h, 4 + rnd() * 10, 0, Math.PI * 2); g.stroke(); }
    drink(g, D.lemon, w / 2 - art.w * 0.18, art.y + art.h * 0.95, art.w * 0.34, false);
    drink(g, D.melon, w / 2 + art.w * 0.2, art.y + art.h * 0.95, art.w * 0.34, false);
    fitText(g, 'シュワッと！', art.x, art.y + art.h * 0.04, art.w, 32, { font: FONTS.round, weight: 800, color: '#c93c3f' });
  } else if (m.side === 'tea') {
    g.fillStyle = '#eef4d8';
    roundRect(g, art.x, art.y, art.w, art.h, 12); g.fill();
    g.fillStyle = '#8fc070';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(art.x + rnd() * art.w, art.y + art.h * (0.2 + rnd() * 0.3), 18, 8, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    drink(g, D.ryokucha, w / 2, art.y + art.h * 0.96, art.w * 0.3, false);
    verticalText(g, '香り立つ', art.x + art.w * 0.15, art.y + 20, art.y + art.h * 0.7, { font: FONTS.mincho, color: '#3a7a4a', width: 26 });
  } else {
    // plain: a small recycling notice sticker only
    g.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(g, w * 0.22, h * 0.32, w * 0.56, h * 0.1, 8); g.fill();
    fitText(g, '空き容器は', w * 0.24, h * 0.33, w * 0.52, h * 0.04, { font: FONTS.gothic, color: '#3a78c8' });
    fitText(g, 'リサイクルへ', w * 0.24, h * 0.37, w * 0.52, h * 0.04, { font: FONTS.gothic, color: '#3a78c8' });
  }
  // maintenance plate
  g.fillStyle = 'rgba(255,255,255,0.85)';
  roundRect(g, w * 0.25, h * 0.7, w * 0.5, h * 0.05, 4); g.fill();
  fitText(g, 'お問合せ 0120-XX-XXXX', w * 0.26, h * 0.7, w * 0.48, h * 0.05, { font: FONTS.gothic, weight: 500, color: '#555' });
  grime(g, w, h, rnd, { dust: 0.3, streaks: 8, scratches: 6, from: 0.72 });
}

function lowerPanel(g, w, h, m, seed) {
  const rnd = seeded(seed);
  g.fillStyle = m.body;
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#ffffff', 4, 0.05, 0.35);
  // とりだしぐち label above the flap (flap geometry sits at u 0.06..0.56, v 0.12..0.5)
  g.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(g, w * 0.08, h * 0.08, w * 0.46, h * 0.1, 6); g.fill();
  fitText(g, 'とりだしぐち', w * 0.09, h * 0.08, w * 0.44, h * 0.1, { font: FONTS.round, weight: 800, color: '#2f6fb8' });
  // stickers
  g.fillStyle = '#ffffff';
  roundRect(g, w * 0.08, h * 0.2, w * 0.2, h * 0.07, 4); g.fill();
  fitText(g, '千円札のみ', w * 0.09, h * 0.2, w * 0.18, h * 0.07, { font: FONTS.gothic, color: '#d8433d' });
  g.fillStyle = '#fff3a8';
  roundRect(g, w * 0.3, h * 0.2, w * 0.24, h * 0.07, 4); g.fill();
  fitText(g, '交通系IC使えます', w * 0.31, h * 0.2, w * 0.22, h * 0.07, { font: FONTS.gothic, color: '#333' });
  // kick plate band
  g.fillStyle = 'rgba(40,40,50,0.25)';
  g.fillRect(0, h * 0.88, w, h * 0.12);
  grime(g, w, h, rnd, { dust: 0.42, streaks: 12, scratches: 16, from: 0.45 });
}

function controlStrip(g, w, h) {
  // dark plastic panel with printed labels; geometry adds the slots / bezels
  g.fillStyle = '#3a3e46';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#4a4f58';
  g.fillRect(4, 4, w - 8, h - 8);
  // (v from top) 0..0.12 LED readout
  g.fillStyle = '#131820';
  roundRect(g, w * 0.14, h * 0.03, w * 0.72, h * 0.08, 4); g.fill();
  g.fillStyle = '#ff6a3a';
  g.font = font(h * 0.055, 700, FONTS.gothic);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('- - - -', w / 2, h * 0.07);
  // coin label (slot bezel sits at v 0.16..0.28)
  fitText(g, 'コイン', 0, h * 0.13, w, h * 0.04, { font: FONTS.gothic, color: '#e8e8e8' });
  fitText(g, '10 50 100 500', 0, h * 0.29, w, h * 0.035, { font: FONTS.gothic, weight: 500, color: '#cfd3d8' });
  // bill slot (v 0.34..0.44)
  fitText(g, 'お札', 0, h * 0.33, w, h * 0.035, { font: FONTS.gothic, color: '#e8e8e8' });
  g.fillStyle = '#6fe08a';
  g.beginPath(); g.arc(w * 0.84, h * 0.4, 3, 0, Math.PI * 2); g.fill();
  // IC reader (v 0.5..0.7): glowing blue square
  const icy = h * 0.5;
  const ig = g.createLinearGradient(0, icy, 0, icy + h * 0.2);
  ig.addColorStop(0, '#bfe6ff'); ig.addColorStop(1, '#6ab8f0');
  g.fillStyle = ig;
  roundRect(g, w * 0.12, icy, w * 0.76, h * 0.2, 8); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w * 0.38, icy + h * 0.1, 8 + i * 8, -0.7, 0.7); g.stroke(); }
  fitText(g, 'IC', w * 0.52, icy + h * 0.05, w * 0.3, h * 0.1, { font: FONTS.latin, weight: 800, color: '#ffffff' });
  fitText(g, 'タッチ', w * 0.14, icy + h * 0.15, w * 0.72, h * 0.04, { font: FONTS.gothic, color: '#2a5a8a' });
  // change return lever label (v 0.74..0.9)
  fitText(g, 'おつり', 0, h * 0.73, w, h * 0.04, { font: FONTS.gothic, color: '#e8e8e8' });
  fitText(g, 'レバー', 0, h * 0.91, w, h * 0.035, { font: FONTS.gothic, weight: 500, color: '#cfd3d8' });
}

/** Build the vending atlas.  Returns { texture, r(name) }. */
export function makeVendAtlas() {
  const A = new Atlas(2048, 2048, 'vend');
  const ids = Object.keys(MACHINES);
  ['A', 'B', 'C'].forEach((k, i) => A.region(`disp_${k}`, 512, 576, (g, w, h) => display(g, w, h, DISPLAYS[k], 11 + i)));
  ids.forEach((id, i) => A.region(`side_${id}`, 256, 480, (g, w, h) => sidePanel(g, w, h, MACHINES[id], 40 + i)));
  A.region('ctrl', 128, 384, controlStrip);
  ids.forEach((id, i) => A.region(`low_${id}`, 480, 288, (g, w, h) => lowerPanel(g, w, h, MACHINES[id], 60 + i)));
  ids.forEach((id) => A.region(`head_${id}`, 480, 120, (g, w, h) => header(g, w, h, MACHINES[id])));
  // spare space on the last shelf: the toilet-wall mural (the sign atlas is full)
  A.region('mural', 448, 160, mural);
  const texture = A.finish();
  return { texture, r: (n) => A.r(n) };
}
