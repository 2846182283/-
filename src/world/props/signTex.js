/**
 * props/signTex.js — the signs & misc atlas ("S"): plaza boards and posters,
 * bus / taxi / post / phone / toilet / disaster signage, bin labels, nobori
 * flags, number plates, vehicle liveries, ema plaques, and small tiling
 * materials (wood, brick, stone) plus alpha cut-outs (spokes, wire basket,
 * chain, crate walls).  Only fictional names are used.
 */
import { Atlas, roundRect, fitText, verticalText, FONTS, seeded, blotches, blossom, woodGrain, pin, text, font } from './atlas.js';

// ---------------------------------------------------------------------------
// maps
// ---------------------------------------------------------------------------
function areaMap(g, w, h) {
  const rnd = seeded(5);
  g.fillStyle = '#fbfaf5';
  g.fillRect(0, 0, w, h);
  // title bar
  g.fillStyle = '#2f5f9a';
  g.fillRect(0, 0, w, 78);
  fitText(g, '駅周辺案内図', 24, 8, 420, 62, { font: FONTS.gothic, weight: 700, color: '#ffffff', align: 'left' });
  fitText(g, 'Sakuragaoka Station Area Map', 460, 22, 540, 36, { font: FONTS.latin, weight: 700, color: '#dfe9f5', align: 'right' });
  const mx = 20, my = 92, mw = w - 300, mh = h - 110;
  g.save();
  g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
  g.fillStyle = '#f1efe6';
  g.fillRect(mx, my, mw, mh);
  // river (top) + levee green
  g.fillStyle = '#cfe6c0';
  g.fillRect(mx, my, mw, 70);
  g.fillStyle = '#9fcbe8';
  g.beginPath(); g.moveTo(mx, my + 8); g.bezierCurveTo(mx + mw * 0.3, my + 24, mx + mw * 0.6, my - 4, mx + mw, my + 16); g.lineTo(mx + mw, my + 40); g.bezierCurveTo(mx + mw * 0.6, my + 22, mx + mw * 0.3, my + 48, mx, my + 34); g.fill();
  // city blocks
  for (let i = 0; i < 70; i++) {
    const bx = mx + rnd() * mw, by = my + 80 + rnd() * (mh - 80);
    g.fillStyle = rnd() < 0.15 ? '#d7e8c9' : '#e6dfcf';
    g.fillRect(bx, by, 24 + rnd() * 40, 16 + rnd() * 30);
  }
  // roads
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  const road = (pts, wdt) => { g.lineWidth = wdt + 4; g.strokeStyle = '#c9c4b8'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(mx + x * mw, my + y * mh) : g.moveTo(mx + x * mw, my + y * mh))); g.stroke(); g.lineWidth = wdt; g.strokeStyle = '#ffffff'; g.stroke(); };
  road([[0, 0.7], [1, 0.7]], 16); // station-front road
  road([[0.5, 0.7], [0.51, 0.8], [0.48, 0.9], [0.46, 1]], 14); // main street
  road([[0, 0.2], [1, 0.2]], 10); // north road
  road([[0.8, 0.2], [0.8, 0.7]], 10); // crossing road
  // railway
  g.strokeStyle = '#555'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(mx, my + mh * 0.4); g.lineTo(mx + mw, my + mh * 0.4); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.setLineDash([16, 16]);
  g.stroke(); g.setLineDash([]);
  // station
  g.fillStyle = '#e06a7a';
  roundRect(g, mx + mw * 0.36, my + mh * 0.42, mw * 0.16, mh * 0.12, 6); g.fill();
  fitText(g, '桜ヶ丘駅', mx + mw * 0.36, my + mh * 0.43, mw * 0.16, mh * 0.1, { font: FONTS.gothic, color: '#ffffff' });
  // plaza + you-are-here
  g.fillStyle = '#dcd6ea';
  g.fillRect(mx + mw * 0.3, my + mh * 0.55, mw * 0.3, mh * 0.12);
  g.fillStyle = '#e8343f';
  g.beginPath(); g.arc(mx + mw * 0.38, my + mh * 0.6, 12, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#e8343f';
  roundRect(g, mx + mw * 0.38 + 16, my + mh * 0.6 - 16, 86, 32, 6); g.fill();
  text(g, '現在地', mx + mw * 0.38 + 59, my + mh * 0.6, 22, '#ffffff', { family: FONTS.gothic });
  // icons
  const icon = (x, y, c, ch) => { g.fillStyle = c; roundRect(g, mx + x * mw - 14, my + y * mh - 14, 28, 28, 5); g.fill(); text(g, ch, mx + x * mw, my + y * mh + 1, 18, '#fff', { family: FONTS.gothic }); };
  icon(0.62, 0.62, '#3a78c8', 'P'); icon(0.66, 0.74, '#2f9a62', 'B'); icon(0.22, 0.62, '#e8743a', '〒'); icon(0.85, 0.75, '#555', '交'); icon(0.1, 0.78, '#8a5ac8', 'WC');
  // sakura on the levee
  for (let i = 0; i < 14; i++) blossom(g, mx + (i + 0.5) * mw / 14, my + 58, 9, '#f7b6c8', '#e0708f', i);
  g.restore();
  g.strokeStyle = '#888'; g.lineWidth = 2; g.strokeRect(mx, my, mw, mh);
  // north arrow
  g.fillStyle = '#333';
  g.beginPath(); g.moveTo(mx + mw - 34, my + 20); g.lineTo(mx + mw - 44, my + 50); g.lineTo(mx + mw - 24, my + 50); g.fill();
  text(g, 'N', mx + mw - 34, my + 62, 16, '#333', { family: FONTS.latin });
  // legend
  const lx = w - 262;
  g.fillStyle = '#eef2f7';
  g.fillRect(lx, 92, 244, h - 110);
  fitText(g, '凡例 Legend', lx + 10, 100, 224, 34, { font: FONTS.gothic, color: '#2f5f9a', align: 'left' });
  const items = [['#3a78c8', 'P', '駐輪場'], ['#2f9a62', 'B', 'バスのりば'], ['#e8743a', '〒', '郵便局'], ['#555', '交', '交番'], ['#8a5ac8', 'WC', 'トイレ'], ['#e8c23a', 'T', 'タクシー'], ['#e06a7a', '駅', '駅']];
  items.forEach(([c, ch, label], i) => {
    const y = 150 + i * 56;
    g.fillStyle = c; roundRect(g, lx + 12, y, 34, 34, 6); g.fill();
    text(g, ch, lx + 29, y + 18, 18, '#fff', { family: FONTS.gothic });
    fitText(g, label, lx + 56, y, 176, 34, { font: FONTS.gothic, weight: 500, color: '#333', align: 'left' });
  });
  fitText(g, '桜ヶ丘町', lx + 10, h - 60, 224, 34, { font: FONTS.mincho, color: '#666' });
}

function walkMap(g, w, h) {
  const rnd = seeded(9);
  // cream paper with a painted border
  g.fillStyle = '#fbf3e1';
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#e8d6b0', 10, 0.12, 0.4);
  g.strokeStyle = '#d98aa0'; g.lineWidth = 10;
  roundRect(g, 10, 10, w - 20, h - 20, 26); g.stroke();
  // title
  fitText(g, '桜ヶ丘 さんぽマップ', 40, 22, w * 0.62, 72, { font: FONTS.round, weight: 800, color: '#d9668d', stroke: { color: '#ffffff', width: 8 } });
  fitText(g, 'Sakuragaoka Walking Map', 40, 92, w * 0.5, 30, { font: FONTS.latin, weight: 700, color: '#8a6446', align: 'left' });
  // hand-drawn river
  g.strokeStyle = '#8fc3e6'; g.lineWidth = 34; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, 170); g.bezierCurveTo(300, 140, 520, 210, w - 40, 160); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([10, 12]);
  g.beginPath(); g.moveTo(60, 168); g.bezierCurveTo(300, 140, 520, 208, w - 60, 160); g.stroke(); g.setLineDash([]);
  // levee sakura row (round pink puffs)
  for (let i = 0; i < 18; i++) {
    const x = 60 + i * 52 + rnd() * 10, y = 214 + Math.sin(i) * 6;
    g.fillStyle = '#8a6446'; g.fillRect(x - 2, y, 4, 14);
    g.fillStyle = '#f7b6c8'; g.beginPath(); g.arc(x, y - 4, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbd3de'; g.beginPath(); g.arc(x - 5, y - 9, 7, 0, Math.PI * 2); g.fill();
  }
  // railway (hand-drawn ties)
  g.strokeStyle = '#7a6a5a'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(30, 330); g.lineTo(w - 30, 322); g.stroke();
  g.lineWidth = 3;
  for (let x = 40; x < w - 30; x += 18) { g.beginPath(); g.moveTo(x, 322); g.lineTo(x, 338); g.stroke(); }
  // little train
  g.fillStyle = '#f5f1e6'; roundRect(g, 600, 306, 120, 26, 8); g.fill();
  g.fillStyle = '#ef8fae'; g.fillRect(600, 320, 120, 5);
  g.fillStyle = '#7fb0d8'; for (let i = 0; i < 5; i++) g.fillRect(608 + i * 22, 310, 14, 8);
  // dotted walking route
  g.strokeStyle = '#e8743a'; g.lineWidth = 5; g.setLineDash([2, 12]);
  g.beginPath(); g.moveTo(420, 420); g.bezierCurveTo(360, 380, 250, 300, 180, 236); g.bezierCurveTo(300, 250, 600, 260, 820, 240); g.bezierCurveTo(840, 360, 700, 470, 520, 540); g.stroke(); g.setLineDash([]);
  // spots
  const spot = (x, y, n, label, c) => {
    g.fillStyle = c; g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.stroke();
    text(g, String(n), x, y + 1, 22, '#fff', { family: FONTS.round });
    g.fillStyle = 'rgba(255,255,255,0.85)'; roundRect(g, x + 24, y - 16, label.length * 22 + 16, 32, 8); g.fill();
    fitText(g, label, x + 30, y - 16, label.length * 22 + 4, 32, { font: FONTS.round, weight: 700, color: '#5a3a26', align: 'left' });
  };
  // station
  g.fillStyle = '#ffffff'; roundRect(g, 380, 380, 110, 60, 10); g.fill();
  g.strokeStyle = '#d9668d'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#d9668d'; g.beginPath(); g.moveTo(370, 384); g.lineTo(435, 350); g.lineTo(500, 384); g.fill();
  fitText(g, '桜ヶ丘駅', 384, 396, 102, 34, { font: FONTS.round, color: '#d9668d' });
  // torii icon for the shrine
  g.fillStyle = '#e0483a'; g.fillRect(150, 400, 8, 40); g.fillRect(196, 400, 8, 40); g.fillRect(140, 396, 74, 8); g.fillRect(146, 410, 62, 6);
  spot(180, 236, 1, '桜並木の土手', '#e98aa7');
  spot(176, 470, 2, 'おいなりさん', '#e0483a');
  spot(560, 520, 3, 'はるかぜ商店街', '#e8a23a');
  spot(820, 240, 4, '河川敷ひろば', '#5aa0d8');
  // doodles: cat, flowers, sun
  g.fillStyle = '#f2c230'; g.beginPath(); g.arc(w - 110, 80, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2c230'; g.lineWidth = 4;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(w - 110 + Math.cos(a) * 38, 80 + Math.sin(a) * 38); g.lineTo(w - 110 + Math.cos(a) * 48, 80 + Math.sin(a) * 48); g.stroke(); }
  g.fillStyle = '#5a4a44';
  g.beginPath(); g.ellipse(700, 590, 30, 18, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(730, 574, 14, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(722, 562); g.lineTo(726, 550); g.lineTo(732, 562); g.fill();
  g.beginPath(); g.moveTo(734, 562); g.lineTo(740, 551); g.lineTo(742, 564); g.fill();
  for (let i = 0; i < 12; i++) blossom(g, 60 + rnd() * (w - 120), 560 + rnd() * 50, 8 + rnd() * 6, '#f7b6c8', '#e0708f', rnd() * 6);
  fitText(g, '桜ヶ丘観光協会', w - 300, h - 58, 260, 30, { font: FONTS.round, weight: 700, color: '#8a6446', align: 'right' });
}

// ---------------------------------------------------------------------------
// community notice board
// ---------------------------------------------------------------------------
function noticeBoard(g, w, h) {
  const rnd = seeded(21);
  // cork / felt board
  g.fillStyle = '#6d8a6a';
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#5a7456', 12, 0.25, 0.3);
  // header plate
  g.fillStyle = '#f6f1e2';
  roundRect(g, w * 0.25, 10, w * 0.5, 54, 6); g.fill();
  fitText(g, '桜ヶ丘町内会 掲示板', w * 0.26, 12, w * 0.48, 50, { font: FONTS.mincho, weight: 700, color: '#3a3a3a' });
  const paper = (x, y, pw, ph, rot, bg, draw) => {
    g.save();
    g.translate(x + pw / 2, y + ph / 2);
    g.rotate(rot);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(-pw / 2 + 5, -ph / 2 + 6, pw, ph);
    g.fillStyle = bg;
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.translate(-pw / 2, -ph / 2);
    draw(pw, ph);
    g.restore();
  };
  // 1. spring sakura festival
  paper(24, 82, 300, 420, -0.02, '#fde3ea', (pw, ph) => {
    for (let i = 0; i < 18; i++) blossom(g, rnd() * pw, rnd() * ph * 0.45, 10 + rnd() * 16, '#f7a9bf', '#d9668d', rnd() * 6);
    fitText(g, '春の', 20, 30, pw - 40, 50, { font: FONTS.round, weight: 800, color: '#d9668d' });
    fitText(g, 'さくらまつり', 10, 82, pw - 20, 68, { font: FONTS.round, weight: 800, color: '#c94f78', stroke: { color: '#ffffff', width: 8 } });
    fitText(g, '4月6日(土)・7日(日)', 16, 176, pw - 32, 40, { font: FONTS.gothic, weight: 700, color: '#333' });
    fitText(g, '会場：桜ヶ丘 土手 特設会場', 16, 228, pw - 32, 28, { font: FONTS.gothic, weight: 500, color: '#444' });
    fitText(g, 'ぼんぼり点灯 18:00〜', 16, 266, pw - 32, 28, { font: FONTS.gothic, weight: 500, color: '#444' });
    // lanterns
    for (let i = 0; i < 5; i++) { g.fillStyle = '#fff3d6'; roundRect(g, 30 + i * 52, 318, 34, 46, 12); g.fill(); g.fillStyle = '#e0483a'; g.fillRect(30 + i * 52, 336, 34, 8); }
    fitText(g, '主催：桜ヶ丘町内会', 16, ph - 44, pw - 32, 26, { font: FONTS.gothic, weight: 500, color: '#666' });
  });
  // 2. radio calisthenics
  paper(348, 90, 250, 200, 0.03, '#f4f8d8', (pw, ph) => {
    g.fillStyle = '#7fb85a'; g.fillRect(0, 0, pw, 46);
    fitText(g, 'ラジオ体操', 10, 4, pw - 20, 40, { font: FONTS.round, weight: 800, color: '#ffffff' });
    fitText(g, '毎朝 6:30〜', 10, 58, pw - 20, 36, { font: FONTS.gothic, weight: 700, color: '#3a6a2a' });
    fitText(g, 'はるかぜ公園', 10, 100, pw - 20, 28, { font: FONTS.gothic, weight: 500, color: '#444' });
    // stick figure
    g.strokeStyle = '#3a6a2a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(pw / 2, 142, 10, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(pw / 2, 152); g.lineTo(pw / 2, 180); g.moveTo(pw / 2 - 30, 140); g.lineTo(pw / 2, 160); g.lineTo(pw / 2 + 30, 140); g.moveTo(pw / 2, 180); g.lineTo(pw / 2 - 16, 196); g.moveTo(pw / 2, 180); g.lineTo(pw / 2 + 16, 196); g.stroke();
  });
  // 3. disaster drill
  paper(350, 312, 250, 230, -0.025, '#ffffff', (pw, ph) => {
    g.fillStyle = '#e8743a'; g.fillRect(0, 0, pw, 54);
    fitText(g, '防災訓練', 10, 4, pw - 20, 48, { font: FONTS.gothic, weight: 800, color: '#ffffff' });
    fitText(g, '5月12日(日) 9:00', 10, 66, pw - 20, 34, { font: FONTS.gothic, weight: 700, color: '#333' });
    fitText(g, '集合：駅前広場', 10, 108, pw - 20, 28, { font: FONTS.gothic, weight: 500, color: '#444' });
    fitText(g, '消火器・AEDの使い方', 10, 144, pw - 20, 24, { font: FONTS.gothic, weight: 500, color: '#444' });
    g.fillStyle = '#e8743a';
    g.beginPath(); g.moveTo(pw / 2, 176); g.lineTo(pw / 2 - 24, 216); g.lineTo(pw / 2 + 24, 216); g.fill();
    text(g, '!', pw / 2, 202, 26, '#fff', { family: FONTS.gothic });
  });
  // 4. lost cat
  paper(624, 84, 210, 290, 0.035, '#ffffff', (pw, ph) => {
    fitText(g, '迷い猫', 10, 8, pw - 20, 52, { font: FONTS.gothic, weight: 800, color: '#d8433d' });
    fitText(g, 'さがしています', 10, 58, pw - 20, 26, { font: FONTS.gothic, weight: 700, color: '#333' });
    // cat drawing (calico)
    g.fillStyle = '#f6f1e6'; g.fillRect(20, 92, pw - 40, 110);
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(pw / 2, 160, 48, 30, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(pw / 2 + 36, 132, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8a23a'; g.beginPath(); g.ellipse(pw / 2 - 16, 152, 20, 14, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(pw / 2 + 16, 168, 16, 10, -0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(pw / 2 + 22, 116); g.lineTo(pw / 2 + 26, 100); g.lineTo(pw / 2 + 34, 114); g.fill();
    g.fillStyle = '#e8a23a'; g.beginPath(); g.moveTo(pw / 2 + 40, 114); g.lineTo(pw / 2 + 50, 100); g.lineTo(pw / 2 + 54, 118); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(20, 92, pw - 40, 110);
    fitText(g, '名前：みけ（♀3才）', 10, 210, pw - 20, 24, { font: FONTS.gothic, weight: 500, color: '#333' });
    fitText(g, '赤い首輪・鈴つき', 10, 236, pw - 20, 22, { font: FONTS.gothic, weight: 500, color: '#333' });
    // tear-off tabs
    for (let i = 0; i < 7; i++) { g.strokeStyle = '#bbb'; g.lineWidth = 1; g.strokeRect(8 + i * 28, 262, 26, 26); }
  });
  // 5. garbage calendar + newsletter
  paper(630, 396, 200, 150, -0.01, '#eaf2fb', (pw, ph) => {
    fitText(g, 'ごみ出しカレンダー', 8, 8, pw - 16, 28, { font: FONTS.gothic, weight: 700, color: '#2f6fb8' });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
      g.fillStyle = ['#ffffff', '#fde3ea', '#e2f2d8', '#fff3c8'][(r * 7 + c) % 4];
      g.fillRect(10 + c * 26, 44 + r * 24, 24, 22);
    }
  });
  paper(856, 90, 150, 220, 0.02, '#fffbe8', (pw, ph) => {
    fitText(g, '町内会だより', 8, 8, pw - 16, 28, { font: FONTS.mincho, weight: 700, color: '#333' });
    g.fillStyle = '#bbb';
    for (let i = 0; i < 9; i++) g.fillRect(12, 50 + i * 18, pw - 24 - (i % 3) * 14, 5);
  });
  paper(852, 336, 156, 200, -0.03, '#e2f2f8', (pw, ph) => {
    fitText(g, '子ども見守り隊', 8, 8, pw - 16, 26, { font: FONTS.round, weight: 700, color: '#2f8a9a' });
    fitText(g, '募集中！', 8, 40, pw - 16, 32, { font: FONTS.round, weight: 800, color: '#e8743a' });
    g.fillStyle = '#f2c230'; g.beginPath(); g.arc(pw / 2, 130, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#333'; g.beginPath(); g.arc(pw / 2 - 12, 124, 4, 0, Math.PI * 2); g.arc(pw / 2 + 12, 124, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#333'; g.lineWidth = 3; g.beginPath(); g.arc(pw / 2, 134, 14, 0.3, Math.PI - 0.3); g.stroke();
  });
  // pins
  for (const [x, y] of [[40, 92], [300, 92], [364, 98], [584, 98], [364, 320], [586, 318], [640, 94], [820, 94], [646, 402], [816, 402], [870, 98], [990, 98], [866, 342], [994, 342]]) pin(g, x, y, rnd() < 0.5 ? '#e05050' : '#3a78c8');
}

// ---------------------------------------------------------------------------
// small signs
// ---------------------------------------------------------------------------
function busRound(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2f9a62'; g.lineWidth = 16;
  g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 12, 0, Math.PI * 2); g.stroke();
  fitText(g, 'はるかぜバス', 40, 40, w - 80, 30, { font: FONTS.gothic, weight: 700, color: '#2f9a62' });
  fitText(g, '桜ヶ丘駅前', 30, 88, w - 60, 64, { font: FONTS.gothic, weight: 800, color: '#222' });
  fitText(g, 'Sakuragaoka Sta.', 40, 156, w - 80, 26, { font: FONTS.latin, weight: 700, color: '#555' });
  g.fillStyle = '#2f9a62';
  roundRect(g, w / 2 - 40, 190, 80, 30, 6); g.fill();
  text(g, '1番', w / 2, 206, 22, '#fff', { family: FONTS.gothic });
}

function busTable(g, w, h) {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2f9a62';
  g.fillRect(0, 0, w, 44);
  fitText(g, '時刻表  春日野 方面', 8, 4, w - 16, 36, { font: FONTS.gothic, weight: 700, color: '#ffffff' });
  const rnd = seeded(33);
  for (let hr = 6; hr <= 21; hr++) {
    const y = 50 + (hr - 6) * 20.5;
    g.fillStyle = hr % 2 ? '#f2f6f3' : '#ffffff';
    g.fillRect(0, y, w, 20);
    text(g, String(hr), 20, y + 10, 14, '#2f9a62', { family: FONTS.gothic });
    let s = '';
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) s += `${String(Math.floor((i + rnd() * 0.8) * (60 / n))).padStart(2, '0')}  `;
    g.font = font(13, 500, FONTS.gothic);
    g.textAlign = 'left';
    g.fillStyle = '#333';
    g.fillText(s, 42, y + 11);
  }
}

function taxiSign(g, w, h) {
  g.fillStyle = '#2f5f9a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  roundRect(g, 10, 10, w - 20, h - 20, 10); g.fill();
  g.fillStyle = '#f2c230';
  roundRect(g, 22, 22, w - 44, 90, 8); g.fill();
  text(g, 'TAXI', w / 2, 68, 44, '#222', { family: FONTS.latin });
  verticalText(g, 'タクシーのりば', w / 2, 128, h - 60, { font: FONTS.gothic, weight: 800, color: '#2f5f9a', width: 64 });
  fitText(g, 'Taxi Stand', 20, h - 56, w - 40, 30, { font: FONTS.latin, weight: 700, color: '#555' });
}

function postPlate(g, w, h) {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#d24a3c';
  g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  text(g, '〒', 40, h / 2, 54, '#d24a3c', { family: FONTS.gothic });
  fitText(g, '郵便', 76, 10, 90, h * 0.5, { font: FONTS.gothic, weight: 800, color: '#333' });
  fitText(g, 'POST', 76, h * 0.52, 90, h * 0.36, { font: FONTS.latin, weight: 700, color: '#333' });
  fitText(g, '手紙', 170, 16, 76, h * 0.34, { font: FONTS.gothic, weight: 500, color: '#555' });
  fitText(g, 'はがき', 170, h * 0.5, 76, h * 0.34, { font: FONTS.gothic, weight: 500, color: '#555' });
}

function postTimes(g, w, h) {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d24a3c'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  fitText(g, '取集時刻', 8, 6, w - 16, 26, { font: FONTS.gothic, weight: 700, color: '#d24a3c' });
  ['平日  10:30', '        15:40', '土曜  11:00', '休日  11:00'].forEach((s, i) => fitText(g, s, 8, 38 + i * 21, w - 16, 18, { font: FONTS.gothic, weight: 500, color: '#333', align: 'left' }));
}

function phoneSign(g, w, h) {
  g.fillStyle = '#f7f7f2';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#3a9a5a';
  roundRect(g, 8, 8, h - 16, h - 16, 6); g.fill();
  // handset glyph
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(h / 2, h / 2 + 8, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  fitText(g, '公衆電話', h, 6, w - h - 10, h - 12, { font: FONTS.gothic, weight: 800, color: '#2f7a4a' });
}

function phoneFace(g, w, h) {
  g.fillStyle = '#58b870';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#4aa062';
  g.fillRect(0, h * 0.7, w, h * 0.3);
  // LCD
  g.fillStyle = '#b8d0a0';
  roundRect(g, w * 0.14, h * 0.08, w * 0.72, h * 0.12, 4); g.fill();
  g.fillStyle = '#3a4a2a';
  g.font = font(12, 700, FONTS.gothic); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('0 円', w / 2, h * 0.14);
  // keypad
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    g.fillStyle = '#f4f4ee';
    roundRect(g, w * 0.2 + c * w * 0.22, h * 0.26 + r * h * 0.1, w * 0.16, h * 0.075, 3); g.fill();
    g.fillStyle = '#333';
    g.font = font(10, 700, FONTS.latin);
    g.fillText('123456789*0#'[r * 3 + c], w * 0.28 + c * w * 0.22, h * 0.3 + r * h * 0.1);
  }
  // coin / card slot labels
  g.fillStyle = '#2a2a2a'; g.fillRect(w * 0.64, h * 0.76, w * 0.2, 5);
  fitText(g, '10円・100円', w * 0.1, h * 0.84, w * 0.8, h * 0.08, { font: FONTS.gothic, color: '#ffffff' });
}

function toiletSign(g, w, h) {
  g.fillStyle = '#2f5f9a';
  g.fillRect(0, 0, w, h);
  const cell = h - 20;
  const man = (x, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, 30, 11, 0, Math.PI * 2); g.fill(); g.fillRect(x - 13, 44, 26, 34); g.fillRect(x - 11, 78, 9, 26); g.fillRect(x + 2, 78, 9, 26); };
  const woman = (x, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, 30, 11, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x - 6, 44); g.lineTo(x + 6, 44); g.lineTo(x + 20, 86); g.lineTo(x - 20, 86); g.fill(); g.fillRect(x - 9, 86, 6, 20); g.fillRect(x + 3, 86, 6, 20); };
  const chair = (x, c) => { g.fillStyle = c; g.beginPath(); g.arc(x - 2, 28, 10, 0, Math.PI * 2); g.fill(); g.fillRect(x - 8, 40, 12, 30); g.fillRect(x - 8, 62, 28, 10); g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(x, 88, 18, 0, Math.PI * 2); g.stroke(); };
  g.fillStyle = '#ffffff'; roundRect(g, 10, 10, cell, cell, 10); g.fill(); man(10 + cell / 2, '#2f6fb8');
  g.fillStyle = '#ffffff'; roundRect(g, 20 + cell, 10, cell, cell, 10); g.fill(); woman(20 + cell * 1.5, '#d8433d');
  g.fillStyle = '#ffffff'; roundRect(g, 30 + cell * 2, 10, cell, cell, 10); g.fill(); chair(30 + cell * 2.5, '#2f6fb8');
  fitText(g, 'トイレ', 50 + cell * 3, 12, w - 60 - cell * 3, h * 0.5, { font: FONTS.gothic, weight: 800, color: '#ffffff' });
  fitText(g, 'Toilet', 50 + cell * 3, h * 0.56, w - 60 - cell * 3, h * 0.34, { font: FONTS.latin, weight: 700, color: '#dfe9f5' });
}

function bousai(g, w, h) {
  g.fillStyle = '#f6f6f2';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8743a';
  g.fillRect(0, 0, w, h * 0.16);
  fitText(g, '防災倉庫', 10, h * 0.2, w - 20, h * 0.46, { font: FONTS.gothic, weight: 800, color: '#333' });
  fitText(g, '桜ヶ丘町内会 自主防災会', 10, h * 0.68, w - 20, h * 0.22, { font: FONTS.gothic, weight: 500, color: '#555' });
}

function extinguisher(g, w, h) {
  g.fillStyle = '#d8433d';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  roundRect(g, 8, 8, w - 16, h - 16, 6); g.fill();
  fitText(g, '消火器', 12, 16, w - 24, h * 0.4, { font: FONTS.gothic, weight: 800, color: '#d8433d' });
  fitText(g, 'FIRE', 12, h * 0.55, w - 24, h * 0.3, { font: FONTS.latin, weight: 800, color: '#d8433d' });
}

function binLabel(g, w, h, label, en, c) {
  g.fillStyle = c;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  roundRect(g, 6, 6, w - 12, h - 12, 8); g.fill();
  fitText(g, label, 12, 10, w - 24, h * 0.52, { font: FONTS.gothic, weight: 800, color: c });
  fitText(g, en, 12, h * 0.6, w - 24, h * 0.26, { font: FONTS.latin, weight: 700, color: '#555' });
}

function nobori(g, w, h, main, sub, bg, ink) {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // chichi (loops) band on the pole side
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(0, 0, 10, h);
  g.fillStyle = ink;
  g.fillRect(w - 16, 0, 16, h);
  verticalText(g, main, w / 2 - 6, 30, h * 0.72, { font: FONTS.round, weight: 800, color: '#ffffff', width: w * 0.62, stroke: { color: ink, width: 6 } });
  verticalText(g, sub, w / 2 - 6, h * 0.76, h - 20, { font: FONTS.gothic, weight: 700, color: ink, width: w * 0.4 });
  for (let i = 0; i < 4; i++) blossom(g, 18 + (i % 2) * 70, 60 + i * 110, 12, '#ffffff', ink, i);
}

function bikeSign(g, w, h) {
  g.fillStyle = '#2f6fb8';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  // bicycle pictogram
  g.strokeStyle = '#ffffff'; g.lineWidth = 6;
  g.beginPath(); g.arc(40, h * 0.62, 20, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(100, h * 0.62, 20, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(40, h * 0.62); g.lineTo(64, h * 0.34); g.lineTo(92, h * 0.34); g.lineTo(100, h * 0.62); g.moveTo(64, h * 0.34); g.lineTo(72, h * 0.62); g.lineTo(92, h * 0.34); g.stroke();
  fitText(g, '駐輪場', 132, 8, w - 140, h * 0.56, { font: FONTS.gothic, weight: 800, color: '#ffffff' });
  fitText(g, 'Bicycle Parking', 132, h * 0.62, w - 140, h * 0.28, { font: FONTS.latin, weight: 700, color: '#dfe9f5' });
}

function bikeNotice(g, w, h) {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#d8433d';
  g.fillRect(0, 0, w, 40);
  fitText(g, '放置禁止', 8, 2, w - 16, 36, { font: FONTS.gothic, weight: 800, color: '#ffffff' });
  fitText(g, '長期間放置された自転車は', 8, 52, w - 16, 26, { font: FONTS.gothic, weight: 500, color: '#333' });
  fitText(g, '撤去します', 8, 84, w - 16, 30, { font: FONTS.gothic, weight: 700, color: '#d8433d' });
  fitText(g, '桜ヶ丘町', 8, h - 36, w - 16, 26, { font: FONTS.gothic, weight: 500, color: '#555' });
}

function plate(g, w, h, bg, ink, top, bottom) {
  g.fillStyle = bg;
  roundRect(g, 0, 0, w, h, 8); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
  roundRect(g, 3, 3, w - 6, h - 6, 6); g.stroke();
  fitText(g, top, 20, 4, w - 40, h * 0.36, { font: FONTS.gothic, weight: 700, color: ink });
  fitText(g, bottom, 10, h * 0.38, w - 20, h * 0.58, { font: FONTS.gothic, weight: 800, color: ink });
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.arc(12, h * 0.22, 3, 0, Math.PI * 2); g.arc(w - 12, h * 0.22, 3, 0, Math.PI * 2); g.fill();
}

function taxiLamp(g, w, h) {
  g.fillStyle = '#fff4d0';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e0483a';
  g.fillRect(0, h - 10, w, 10);
  fitText(g, 'さくら交通', 6, 4, w - 12, h * 0.58, { font: FONTS.round, weight: 800, color: '#2f7a4a' });
  fitText(g, 'TAXI', 6, h * 0.58, w - 12, h * 0.26, { font: FONTS.latin, weight: 800, color: '#e0483a' });
}

function taxiDoor(g, w, h) {
  g.clearRect(0, 0, w, h);
  blossom(g, 30, h / 2, 22, '#f7a9bf', '#ffffff', 0.3);
  fitText(g, 'さくら交通', 60, 6, w - 70, h * 0.62, { font: FONTS.round, weight: 800, color: '#2f5a3a', align: 'left' });
  fitText(g, 'TEL 0120-39-XXXX', 60, h * 0.66, w - 70, h * 0.28, { font: FONTS.gothic, weight: 500, color: '#2f5a3a', align: 'left' });
}

function vanSide(g, w, h) {
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) blossom(g, 26 + i * 22, 34 + (i % 2) * 44, 16, ['#f7a9bf', '#f2c230', '#b99ee0', '#ffffff', '#f39a6a'][i], '#d9668d', i);
  fitText(g, 'フラワーショップ', 146, 4, w - 150, h * 0.4, { font: FONTS.round, weight: 800, color: '#3a8560', align: 'left' });
  fitText(g, '花音', 146, h * 0.38, 150, h * 0.5, { font: FONTS.mincho, weight: 700, color: '#d9668d', align: 'left' });
  fitText(g, 'KANON  ☎ 555-8710', 300, h * 0.5, w - 306, h * 0.34, { font: FONTS.latin, weight: 700, color: '#6a8a70', align: 'left' });
}

function ema(g, w, h, i) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#e2c79a';
  g.beginPath(); g.moveTo(0, h * 0.34); g.lineTo(w * 0.25, 0); g.lineTo(w * 0.75, 0); g.lineTo(w, h * 0.34); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  g.strokeStyle = '#b08a5a'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#d8433d'; g.beginPath(); g.arc(w / 2, h * 0.16, 3, 0, Math.PI * 2); g.fill();
  const art = i % 4;
  if (art === 0) { // fox face
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w * 0.3, h * 0.36); g.lineTo(w * 0.7, h * 0.36); g.lineTo(w * 0.5, h * 0.72); g.fill();
    g.fillStyle = '#d8433d'; g.fillRect(w * 0.4, h * 0.46, 3, 3); g.fillRect(w * 0.56, h * 0.46, 3, 3);
  } else if (art === 1) {
    blossom(g, w / 2, h * 0.56, h * 0.2, '#f7a9bf', '#d9668d', 0);
  } else if (art === 2) {
    g.fillStyle = '#d8433d'; g.fillRect(w * 0.3, h * 0.4, w * 0.4, 4); g.fillRect(w * 0.34, h * 0.4, 3, h * 0.36); g.fillRect(w * 0.63, h * 0.4, 3, h * 0.36); g.fillRect(w * 0.32, h * 0.48, w * 0.36, 3);
  } else {
    g.fillStyle = '#2a2a2a'; g.font = font(h * 0.26, 700, FONTS.mincho); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('合格', w / 2, h * 0.58);
  }
  // scribbled wishes
  g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 1;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(w * 0.18, h * (0.8 + k * 0.06)); g.lineTo(w * (0.5 + (k % 2) * 0.3), h * (0.8 + k * 0.06)); g.stroke(); }
}

function shrinePlaque(g, w, h) {
  g.fillStyle = '#5b4332';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8d4a8';
  g.fillRect(5, 5, w - 10, h - 10);
  verticalText(g, '稲荷大明神', w / 2, 12, h - 12, { font: FONTS.mincho, weight: 700, color: '#2a2a2a', width: w * 0.7 });
}

function brick(g, w, h, rnd) {
  g.fillStyle = '#dcd6ca';
  g.fillRect(0, 0, w, h);
  const bh = h / 4, bw = w / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = -1; c < 5; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0);
      // faded, weathered brick (muted terracotta so the plaza stays pastel)
      const tone = ['#b87864', '#c4866f', '#ab6f5e', '#c99380', '#b57f6c', '#bf8a78'][Math.floor(rnd() * 6)];
      g.fillStyle = tone;
      g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x + 2, r * bh + 2, bw - 4, 3);
    }
  }
}

function stone(g, w, h, rnd, base) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#ffffff', 6, 0.08, 0.3);
  blotches(g, w, h, rnd, '#6a6a60', 8, 0.08, 0.2);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(80,80,70,0.18)' : 'rgba(255,255,255,0.2)';
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  // moss at the bottom edge
  g.fillStyle = 'rgba(120,150,90,0.35)';
  for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(rnd() * w, h - rnd() * 8, 6 + rnd() * 10, 3 + rnd() * 4, 0, 0, Math.PI * 2); g.fill(); }
}

function spokes(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#d0d4d8';
  g.lineWidth = 1.6;
  const cx = w / 2, cy = h / 2, R = w / 2 - 2;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const hub = ((i % 2) ? 1 : -1) * 0.25;
    g.beginPath(); g.moveTo(cx + Math.cos(a + hub) * 7, cy + Math.sin(a + hub) * 7); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
  }
  g.fillStyle = '#c0c4c8';
  g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
}

function wireGrid(g, w, h, color = '#e8eaec', cell = 12) {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = color;
  g.lineWidth = 2.6;
  for (let x = 1; x < w; x += cell) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 1; y < h; y += cell) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.lineWidth = 6;
  g.strokeRect(2, 2, w - 4, h - 4);
}

function chain(g, w, h) {
  g.clearRect(0, 0, w, h);
  const n = 8, lw = w / n;
  for (let i = 0; i < n; i++) {
    g.strokeStyle = i % 2 ? '#f2f2ee' : '#e0483a'; // red / white safety chain
    g.lineWidth = i % 2 ? 5 : 6;
    g.beginPath(); g.ellipse((i + 0.5) * lw, h / 2, lw * 0.62, i % 2 ? h * 0.12 : h * 0.34, 0, 0, Math.PI * 2); g.stroke();
  }
}

function crateSide(g, w, h, color) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  // cut-out windows
  g.globalCompositeOperation = 'destination-out';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { roundRect(g, 10 + c * ((w - 20) / 4), 14 + r * ((h - 28) / 2), (w - 20) / 4 - 8, (h - 28) / 2 - 8, 5); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  fitText(g, 'はるかぜ飲料', w * 0.2, h - 13, w * 0.6, 12, { font: FONTS.gothic, color: 'rgba(255,255,255,0.8)' });
}

function constructionSign(g, w, h) {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f2c230';
  g.fillRect(0, 0, w, 50);
  // stripes
  for (let i = -2; i < 12; i++) { g.fillStyle = '#26262a'; g.beginPath(); g.moveTo(i * 24, 50); g.lineTo(i * 24 + 12, 50); g.lineTo(i * 24 + 24, 0); g.lineTo(i * 24 + 12, 0); g.fill(); }
  fitText(g, '工事中', 10, 60, w - 20, 60, { font: FONTS.gothic, weight: 800, color: '#d8433d' });
  fitText(g, 'ご迷惑をおかけします', 10, 128, w - 20, 26, { font: FONTS.gothic, weight: 700, color: '#333' });
  // bowing worker
  g.fillStyle = '#2f6fb8';
  g.beginPath(); g.arc(w / 2 - 10, 180, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2c230'; g.beginPath(); g.arc(w / 2 - 10, 176, 13, Math.PI, 0); g.fill();
  g.fillStyle = '#2f6fb8'; g.save(); g.translate(w / 2, 200); g.rotate(0.6); g.fillRect(-10, -8, 22, 40); g.restore();
  fitText(g, '側溝補修工事  桜ヶ丘町', 10, h - 32, w - 20, 24, { font: FONTS.gothic, weight: 500, color: '#555' });
}

function shopBag(g, w, h) {
  g.fillStyle = '#fbf6ec';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#3aa37a';
  g.fillRect(0, h * 0.62, w, h * 0.12);
  g.fillStyle = '#f29a3a';
  g.fillRect(0, h * 0.74, w, h * 0.06);
  fitText(g, 'はるマート', 6, h * 0.22, w - 12, h * 0.3, { font: FONTS.round, weight: 800, color: '#3aa37a' });
}

function sakuraCup(g, w, h) {
  g.fillStyle = '#fffaf6';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f7b6c8';
  g.fillRect(0, h * 0.55, w, h * 0.45);
  blossom(g, w * 0.5, h * 0.35, h * 0.18, '#f29bb4', '#ffffff', 0.2);
}

/**
 * Children's mural for the back wall of the public toilet (hand-painted look).
 * Packed into the vending atlas (the sign atlas is full), see vendTex.js.
 */
export function mural(g, w, h) {
  const rnd = seeded(404);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9fcbef'); sky.addColorStop(1, '#e6f2fb');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rnd, '#ffffff', 8, 0.12, 0.35);
  // sun + clouds
  g.fillStyle = '#ffd86a'; g.beginPath(); g.arc(w * 0.88, h * 0.22, h * 0.12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  for (const [cx, cy, r] of [[0.18, 0.2, 0.08], [0.24, 0.17, 0.1], [0.3, 0.21, 0.07], [0.6, 0.14, 0.06], [0.65, 0.12, 0.08]]) { g.beginPath(); g.arc(w * cx, h * cy, h * r, 0, Math.PI * 2); g.fill(); }
  // rolling green hill (the levee) + river line
  g.fillStyle = '#9cc27a';
  g.beginPath(); g.moveTo(0, h * 0.62); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.66, w, h * 0.55); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#8fc3e6'; g.fillRect(0, h * 0.86, w, h * 0.06);
  // sakura trees (round pink puffs with brown trunks), slightly wobbly like a child's brush
  for (let i = 0; i < 7; i++) {
    const x = w * (0.06 + i * 0.145) + (rnd() - 0.5) * 10, y = h * (0.52 + Math.sin(i * 1.7) * 0.04);
    g.fillStyle = '#8a6446'; g.fillRect(x - 3, y, 6, h * 0.16);
    g.fillStyle = i % 2 ? '#f7b6c8' : '#f9c9d6';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * 22, y - 8 + (rnd() - 0.5) * 12, 13 + rnd() * 6, 0, Math.PI * 2); g.fill(); }
  }
  // the little Harukaze train running across the hill
  g.fillStyle = '#f5f1e6'; roundRect(g, w * 0.34, h * 0.64, w * 0.3, h * 0.12, 8); g.fill();
  g.fillStyle = '#ef8fae'; g.fillRect(w * 0.34, h * 0.72, w * 0.3, h * 0.025);
  g.fillStyle = '#7fb0d8'; for (let i = 0; i < 6; i++) { roundRect(g, w * 0.35 + i * w * 0.048, h * 0.66, w * 0.034, h * 0.04, 2); g.fill(); }
  g.fillStyle = '#555'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(w * (0.37 + i * 0.08), h * 0.77, 4, 0, Math.PI * 2); g.fill(); }
  // flowers in the foreground
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y = h * (0.8 + rnd() * 0.18);
    g.fillStyle = ['#e8434f', '#f2c230', '#ffffff', '#b99ee0'][i % 4];
    g.beginPath(); g.arc(x, y, 3 + rnd() * 2, 0, Math.PI * 2); g.fill();
  }
  // title + credit in rounded "handwriting"
  fitText(g, 'みんなの さくらがおか', w * 0.04, h * 0.03, w * 0.5, h * 0.16, { font: FONTS.round, weight: 800, color: '#d9668d', stroke: { color: '#ffffff', width: 6 } });
  fitText(g, '桜ヶ丘小学校 6年生', w * 0.62, h * 0.9, w * 0.36, h * 0.09, { font: FONTS.round, weight: 700, color: '#5a3a26', align: 'right' });
  // painted border
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
}

/**
 * Hand-painted weathering for a plain rendered wall (white base; the mesh's vertex colour
 * supplies the wall tone): a soft splash band at the foot, rain streaks running down
 * from the roof edge and a couple of faint water stains.  Packed into the vending atlas.
 */
export function wallStains(g, w, h) {
  const rnd = seeded(515);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  // broad, very soft colour unevenness (hand-painted, not noise)
  blotches(g, w, h, rnd, '#d8d0c4', 7, 0.1, 0.35);
  blotches(g, w, h, rnd, '#c9cdd6', 4, 0.08, 0.3);
  // splash / dust band rising from the plinth, with a wavy upper edge
  g.save();
  const grad = g.createLinearGradient(0, h * 0.7, 0, h);
  grad.addColorStop(0, 'rgba(140,125,110,0)');
  grad.addColorStop(1, 'rgba(140,125,110,0.42)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    g.globalAlpha = 0.06 + rnd() * 0.08;
    g.fillStyle = rnd() < 0.6 ? '#8f7f6c' : '#8a9088';
    g.beginPath();
    g.ellipse(rnd() * w, h - rnd() * h * 0.14, 6 + rnd() * 18, 2 + rnd() * 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  // rain streaks from the roof edge: tapered, in loose groups
  g.globalAlpha = 1;
  for (let k = 0; k < 7; k++) {
    const gx = rnd() * w;
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const x = gx + (rnd() - 0.5) * 24, len = h * (0.2 + rnd() * 0.45), wd = 1.5 + rnd() * 3;
      const sg = g.createLinearGradient(0, 0, 0, len);
      sg.addColorStop(0, 'rgba(105,105,115,0.2)');
      sg.addColorStop(1, 'rgba(105,105,115,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(x - wd / 2, 0); g.lineTo(x + wd / 2, 0); g.lineTo(x + wd * 0.15, len); g.lineTo(x - wd * 0.15, len);
      g.fill();
    }
  }
  // top shadow line under the roof overhang
  const tg = g.createLinearGradient(0, 0, 0, h * 0.08);
  tg.addColorStop(0, 'rgba(110,110,125,0.25)');
  tg.addColorStop(1, 'rgba(110,110,125,0)');
  g.fillStyle = tg;
  g.fillRect(0, 0, w, h * 0.08);
  g.restore();
}

/** Build the signs & misc atlas.  Returns { texture, r(name) }. */
export function makeSignAtlas() {
  const A = new Atlas(2048, 2048, 'signs');
  const rnd = seeded(77);
  // big boards first (shelf rows)
  A.region('areaMap', 1024, 640, areaMap);
  A.region('walkMap', 1000, 640, walkMap);
  A.region('notice', 1024, 576, noticeBoard);
  A.region('busTable', 256, 384, busTable);
  A.region('taxi', 192, 512, taxiSign);
  A.region('noboriA', 128, 512, (g, w, h) => nobori(g, w, h, '桜ソーダ', '春限定', '#f7b6c8', '#d9668d'));
  A.region('noboriB', 128, 512, (g, w, h) => nobori(g, w, h, 'つめた〜い', '冷えてます', '#8fc3ea', '#2f6fb8'));
  A.region('noboriC', 128, 512, (g, w, h) => nobori(g, w, h, 'お稲荷さん', '奉納', '#e0483a', '#9a2a22'));
  A.region('wood', 256, 256, (g, w, h) => woodGrain(g, w, h, rnd, '#dcc29c', '#a7825c'));
  A.region('busRound', 256, 256, busRound);
  A.region('stone', 128, 256, (g, w, h) => stone(g, w, h, rnd, '#b9b6ae'));
  A.region('spokes', 128, 128, spokes);
  A.region('basket', 128, 128, (g, w, h) => wireGrid(g, w, h));
  A.region('basketDark', 128, 128, (g, w, h) => wireGrid(g, w, h, '#3a3e44', 10));
  A.region('constr', 192, 256, constructionSign);
  A.region('bikeNotice', 192, 160, bikeNotice);
  A.region('postTimes', 128, 128, postTimes);
  A.region('phoneFace', 128, 192, phoneFace);
  A.region('toilet', 512, 128, toiletSign);
  A.region('brick', 256, 128, (g, w, h) => brick(g, w, h, rnd));
  A.region('bousai', 256, 128, bousai);
  A.region('bikeSign', 256, 128, bikeSign);
  A.region('vanSide', 512, 128, vanSide);
  A.region('postPlate', 256, 96, postPlate);
  A.region('extinguisher', 128, 128, extinguisher);
  A.region('crateBlue', 128, 96, (g, w, h) => crateSide(g, w, h, '#3f7fc8'));
  A.region('crateYellow', 128, 96, (g, w, h) => crateSide(g, w, h, '#efc33f'));
  A.region('shopBag', 96, 128, shopBag);
  A.region('bin_burn', 192, 96, (g, w, h) => binLabel(g, w, h, 'もえるごみ', 'Burnable', '#d8433d'));
  A.region('bin_plastic', 192, 96, (g, w, h) => binLabel(g, w, h, 'プラスチック', 'Plastic', '#3c9a62'));
  A.region('bin_can', 192, 96, (g, w, h) => binLabel(g, w, h, 'かん・びん', 'Cans & Bottles', '#2f6fb8'));
  A.region('bin_pet', 192, 96, (g, w, h) => binLabel(g, w, h, 'ペットボトル', 'PET Bottles', '#e8a23a'));
  A.region('phoneSign', 256, 64, phoneSign);
  A.region('taxiDoor', 256, 64, taxiDoor);
  A.region('taxiLamp', 128, 64, taxiLamp);
  A.region('plateKei', 160, 80, (g, w, h) => plate(g, w, h, '#f2d23a', '#222', '桜ヶ丘 580', 'え 12-34'));
  A.region('plateKei2', 160, 80, (g, w, h) => plate(g, w, h, '#f2d23a', '#222', '桜ヶ丘 50', 'あ 38-10'));
  A.region('plateVan', 160, 80, (g, w, h) => plate(g, w, h, '#26262a', '#f2d23a', '桜ヶ丘 480', 'く 87-10'));
  A.region('plateTaxi', 160, 80, (g, w, h) => plate(g, w, h, '#2f7a4a', '#ffffff', '桜ヶ丘 500', 'か 21-07'));
  A.region('chain', 128, 32, chain);
  A.region('shrinePlaque', 64, 160, shrinePlaque);
  for (let i = 0; i < 4; i++) A.region(`ema${i}`, 64, 48, (g, w, h) => ema(g, w, h, i));
  A.region('sakuraCup', 64, 64, sakuraCup);
  A.region('stoneDark', 64, 64, (g, w, h) => stone(g, w, h, rnd, '#8e8b84'));
  const texture = A.finish();
  return { texture, r: (n) => A.r(n) };
}
