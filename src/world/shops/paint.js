/**
 * Canvas painters for every picture used by the shops: signboards, noren,
 * posters, product fronts, menus, flower cards...  All cells are packed into
 * one Atlas (see atlas.js).  Style: flat, hand-painted, gently weathered —
 * anime background art rather than photo texture.
 *
 * Text uses the fictional names from layout.js (lot.name) and made-up goods.
 * No real brands anywhere.
 */
import { seeded } from '../../core/canvasTex.js';
import { hashString } from '../../core/layout.js';
import { R, G, M, fill, grad, weather, frame, T, V, blossom, petal, paper, goodsRow, shelfBoard, chalk, roundRect, split } from './paintkit.js';
import { paintStreet } from './paint2.js';

/**
 * Paint all shop cells into the atlas.
 * names: {cafe, flower, books, bicycle, konbini, wagashi, zakka, ramen, tabako} (lot.name)
 */
export function paintAll(A, names) {
  const rndFor = (n) => seeded(hashString(n) || 1);
  const add = (name, w, h, fn) => A.add(name, w, h, (c, W, H) => fn(c, W, H, rndFor(name)));
  paintCommon(add, names);
  paintStreet(add, names);
}

/** Generic cells (posters, stickers, curtains...) + konbini, café, flower shop. */
function paintCommon(add, names) {
  // ================= generic ==================================================
  add('hours', 128, 160, (c, w, h) => {
    fill(c, w, h, '#fbfaf5');
    frame(c, w, h, '#6a8a7a', 4, 8);
    T(c, '営業時間', 10, 12, w - 20, 26, { font: G, color: '#3e5a4c' });
    c.fillStyle = '#9ab8a8'; c.fillRect(16, 44, w - 32, 2);
    T(c, '10:00〜19:00', 8, 54, w - 16, 26, { font: G, color: '#333' });
    T(c, '定休日', 8, 92, w - 16, 20, { font: G, color: '#666' });
    T(c, '水曜日', 8, 114, w - 16, 26, { font: G, color: '#c24a4a' });
  });
  add('pay', 192, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // IC card sticker
    c.fillStyle = '#3d78c4'; roundRect(c, 2, 4, 92, 56, 10); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(26, 32, 8 + i * 7, -0.8, 0.8); c.stroke(); }
    T(c, 'IC', 48, 12, 42, 26, { font: R, color: '#fff' });
    T(c, 'ご利用可', 44, 38, 48, 16, { font: G, color: '#fff' });
    // QR sticker
    c.fillStyle = '#fff'; roundRect(c, 100, 4, 90, 56, 8); c.fill();
    c.strokeStyle = '#e46d4f'; c.lineWidth = 3; roundRect(c, 101.5, 5.5, 87, 53, 7); c.stroke();
    const rnd = seeded(33);
    c.fillStyle = '#222';
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (rnd() < 0.5 || (x < 2 && y < 2) || (x > 4 && y < 2) || (x < 2 && y > 4)) c.fillRect(108 + x * 5, 14 + y * 5, 5, 5);
    T(c, 'QR', 148, 12, 36, 20, { font: R, color: '#e46d4f' });
    T(c, '決済OK', 146, 34, 40, 16, { font: G, color: '#e46d4f' });
  });
  add('season', 128, 180, (c, w, h, rnd) => {
    paper(c, w, h, '#fde3ea', rnd);
    for (let i = 0; i < 12; i++) petal(c, rnd() * w, rnd() * h, 4 + rnd() * 4, rnd() * 6, i % 2 ? '#f6a9bf' : '#fbd0dc');
    c.fillStyle = '#e8849f'; c.beginPath(); c.arc(w / 2, 58, 34, 0, Math.PI * 2); c.fill();
    T(c, '季節', 30, 36, 68, 22, { font: R, color: '#fff' });
    T(c, '限定', 30, 58, 68, 22, { font: R, color: '#fff' });
    T(c, '春のおすすめ', 8, 104, w - 16, 22, { font: R, color: '#b54b6a' });
    blossom(c, 34, 148, 14); blossom(c, 70, 152, 11, '#fbd0dc'); blossom(c, 100, 144, 13);
  });
  add('newitem', 128, 180, (c, w, h, rnd) => {
    paper(c, w, h, '#fff6cf', rnd);
    c.fillStyle = '#e8483f';
    c.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 36 : 48; c.lineTo(w / 2 + Math.cos(a) * r, 62 + Math.sin(a) * r); }
    c.fill();
    T(c, '新発売', 30, 48, 68, 28, { font: R, color: '#fff' });
    T(c, 'NEW!', 20, 118, w - 40, 22, { font: R, color: '#e8483f' });
    T(c, 'ただいま販売中', 8, 146, w - 16, 18, { font: G, color: '#555' });
  });
  add('matsuri', 180, 256, (c, w, h, rnd) => {
    // an old summer-festival poster, sun-bleached to pastel
    paper(c, w, h, '#e8e2f0', rnd);
    grad(c, 0, 0, w, h * 0.6, '#9fb4d8', '#d8c8e0');
    // fireworks
    for (const [x, y, r, col] of [[50, 50, 30, '#f4d27a'], [128, 70, 38, '#f2a3b8'], [90, 28, 18, '#c8e0f0']]) {
      c.strokeStyle = col; c.lineWidth = 2.5;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
    }
    V(c, '夏祭り', w - 30, 112, 230, { font: M, color: '#b24a55', maxSize: 40 });
    T(c, '桜ヶ丘', 12, 130, 100, 30, { font: M, color: '#40507a' });
    T(c, '盆踊り・夜店・花火', 10, 170, 120, 18, { font: G, color: '#444' });
    T(c, '8月15日(土) 18時〜', 10, 194, 120, 18, { font: G, color: '#444' });
    T(c, '会場 桜ヶ丘駅前広場', 10, 220, 120, 14, { font: G, color: '#666' });
    // lanterns row
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#e37a6a' : '#f3e2b0'; c.beginPath(); c.ellipse(16 + i * 18, 110, 6, 8, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,250,235,0.35)'; c.fillRect(0, 0, w, h); // faded
    weather(c, w, h, rnd, 8, 0.12, '160,140,110');
    c.strokeStyle = 'rgba(120,100,80,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, h * 0.62); c.lineTo(w, h * 0.6); c.stroke(); // old fold
  });
  add('mascot', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // さくらちゃん: round pink face with blossom hat
    const face = (x, y, r, col, hat) => {
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r + 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a2f3a'; c.beginPath(); c.arc(x - r * 0.33, y, r * 0.1, 0, Math.PI * 2); c.arc(x + r * 0.33, y, r * 0.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f08aa0'; c.beginPath(); c.arc(x - r * 0.55, y + r * 0.22, r * 0.14, 0, Math.PI * 2); c.arc(x + r * 0.55, y + r * 0.22, r * 0.14, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3a2f3a'; c.lineWidth = 2; c.beginPath(); c.arc(x, y + r * 0.15, r * 0.18, 0.2, Math.PI - 0.2); c.stroke();
      hat(x, y - r * 0.85);
    };
    face(32, 36, 24, '#fde7ee', (x, y) => blossom(c, x, y, 12));
    face(96, 36, 24, '#e8f0fb', (x, y) => { c.fillStyle = '#ef8fae'; c.fillRect(x - 16, y - 2, 32, 8); c.fillStyle = '#f5f1e6'; c.fillRect(x - 16, y - 8, 32, 6); });
    T(c, 'さくらちゃん', 2, 70, 60, 14, { font: R, color: '#d0607e' });
    T(c, 'はるでん', 66, 70, 60, 14, { font: R, color: '#4a6aa0' });
    c.fillStyle = '#fff'; roundRect(c, 8, 90, 112, 34, 10); c.fill();
    c.strokeStyle = '#f29bb4'; c.lineWidth = 3; roundRect(c, 9.5, 91.5, 109, 31, 9); c.stroke();
    T(c, '桜ヶ丘 商店会', 14, 96, 100, 22, { font: R, color: '#d0607e' });
  });
  // upper-floor window interiors: curtains partly drawn, room glimpses
  for (let i = 0; i < 4; i++) {
    add(`curtain${i}`, 128, 128, (c, w, h, rnd) => {
      const walls = ['#efe4d0', '#e6e9ee', '#f0e2d8', '#e4ead8'];
      const cur = [['#f3eee4', '#c9d8e8'], ['#f7f0f2', '#e8b8c4'], ['#f2f2ea', '#b9cfa8'], ['#f5efe2', '#d9c09a']][i];
      grad(c, 0, 0, w, h, walls[i], '#b8b0a8');
      // shelf / lamp silhouette
      c.fillStyle = 'rgba(120,100,90,0.35)';
      c.fillRect(20 + rnd() * 40, 70, 40, 58);
      c.fillStyle = 'rgba(255,230,180,0.8)'; c.beginPath(); c.arc(90, 40, 10, 0, Math.PI * 2); c.fill();
      // lace
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1;
      for (let x = 4; x < w; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 2, h); c.stroke(); }
      // drapes at the sides with folds
      for (const side of [0, 1]) {
        const x0 = side ? w - 30 - rnd() * 10 : 0, cw = 30 + rnd() * 10;
        c.fillStyle = cur[1];
        c.fillRect(side ? x0 : 0, 0, cw, h);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        for (let k = 0; k < 4; k++) c.fillRect((side ? x0 : 0) + k * (cw / 4) + 3, 0, 3, h);
      }
      c.fillStyle = '#b8a890'; c.fillRect(0, 0, w, 5);
    });
  }
  add('ac', 128, 96, (c, w, h) => {
    grad(c, 0, 0, w, h, '#f4f4f0', '#dcdcd6');
    c.strokeStyle = '#9a9ea4'; c.lineWidth = 2;
    c.beginPath(); c.arc(78, 48, 34, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.2;
    for (let r = 8; r < 34; r += 5) { c.beginPath(); c.arc(78, 48, r, 0, Math.PI * 2); c.stroke(); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; c.beginPath(); c.moveTo(78 - Math.cos(a) * 34, 48 - Math.sin(a) * 34); c.lineTo(78 + Math.cos(a) * 34, 48 + Math.sin(a) * 34); c.stroke(); }
    c.fillStyle = '#b4b8bc';
    for (let y = 14; y < 86; y += 6) c.fillRect(10, y, 26, 2);
    c.fillStyle = '#8a8e94'; c.fillRect(0, h - 4, w, 4);
  });
  add('clock', 64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#5b4332'; c.beginPath(); c.arc(32, 32, 31, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(32, 32, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#333';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillRect(32 + Math.cos(a) * 21 - 1.5, 32 + Math.sin(a) * 21 - 1.5, 3, 3); }
    c.strokeStyle = '#333'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 32); c.lineTo(32, 16); c.stroke(); // 4 o'clock-ish
    c.lineWidth = 3.5; c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + 12, 32 + 6); c.stroke();
  });
  add('frames', 128, 64, (c, w, h, rnd) => {
    fill(c, w, h, '#6a4e3a');
    grad(c, 5, 5, 54, 54, '#a9ccf0', '#f5e6c8');
    c.fillStyle = '#7fa865'; c.beginPath(); c.moveTo(5, 59); c.lineTo(30, 30); c.lineTo(59, 59); c.fill();
    blossom(c, 44, 22, 7);
    c.fillStyle = '#f7f1e6'; c.fillRect(69, 5, 54, 54);
    c.fillStyle = '#c86a5a'; c.beginPath(); c.arc(96, 30, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a8a4a'; c.fillRect(94, 42, 4, 14);
  });
  add('shopcard', 128, 96, (c, w, h, rnd) => {
    // "welcome" / open sign hanging on doors
    c.fillStyle = '#7a5a3e'; roundRect(c, 0, 0, w, h, 10); c.fill();
    c.fillStyle = '#f7efdf'; roundRect(c, 6, 6, w - 12, h - 12, 8); c.fill();
    T(c, '営業中', 10, 16, w - 20, 40, { font: R, color: '#c0504a' });
    T(c, 'OPEN', 10, 58, w - 20, 26, { font: R, color: '#5a7a5a' });
  });

  // ================= konbini ===================================================
  const [, kName] = split(names.konbini || 'はるマート');
  const kLogo = (c, x, y, r) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3aa37a'; c.beginPath(); c.arc(x, y, r * 0.9, 0, Math.PI * 2); c.fill();
    blossom(c, x, y, r * 0.72, '#ffffff', '#f29a3a', 0.3);
  };
  const kStripes = (c, w, y, h) => {
    c.fillStyle = '#3aa37a'; c.fillRect(0, y, w, h * 0.4);
    c.fillStyle = '#f29a3a'; c.fillRect(0, y + h * 0.4, w, h * 0.3);
    c.fillStyle = '#3b7fd1'; c.fillRect(0, y + h * 0.7, w, h * 0.3);
  };
  add('kSign', 1024, 160, (c, w, h) => {
    grad(c, 0, 0, w, h, '#ffffff', '#eef1ef');
    kStripes(c, w, h - 46, 40);
    kLogo(c, 110, 58, 44);
    T(c, kName || 'はるマート', 170, 14, 520, 92, { font: R, weight: 800, color: '#2f8a64', align: 'left', letterSpacing: 6 });
    T(c, 'HARU MART', 700, 30, 300, 44, { font: R, color: '#f29a3a', align: 'right', letterSpacing: 4 });
    T(c, '24H OPEN', 760, 74, 240, 28, { font: R, color: '#3b7fd1', align: 'right' });
  });
  add('kSide', 512, 160, (c, w, h) => {
    grad(c, 0, 0, w, h, '#ffffff', '#eef1ef');
    kStripes(c, w, h - 46, 40);
    kLogo(c, 70, 58, 42);
    T(c, kName || 'はるマート', 124, 18, 370, 80, { font: R, weight: 800, color: '#2f8a64', align: 'left' });
  });
  add('kPole', 256, 256, (c, w, h) => {
    grad(c, 0, 0, w, h, '#ffffff', '#eef1ef');
    kStripes(c, w, h - 62, 54);
    kLogo(c, w / 2, 78, 56);
    T(c, kName || 'はるマート', 12, 140, w - 24, 50, { font: R, weight: 800, color: '#2f8a64' });
  });
  add('k24', 128, 128, (c, w, h) => {
    fill(c, w, h, '#3b7fd1');
    c.fillStyle = '#fff'; roundRect(c, 8, 8, w - 16, h - 16, 12); c.fill();
    T(c, '24', 14, 14, w - 28, 64, { font: R, color: '#3b7fd1' });
    T(c, 'OPEN', 14, 80, w - 28, 30, { font: R, color: '#f29a3a' });
  });
  add('kAtm', 128, 128, (c, w, h) => {
    fill(c, w, h, '#2d6fb8');
    T(c, 'ATM', 10, 12, w - 20, 50, { font: R, color: '#fff' });
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, 86, 22, 0, Math.PI * 2); c.fill();
    T(c, '¥', w / 2 - 20, 66, 40, 40, { font: R, color: '#2d6fb8' });
  });
  add('kPostDrink', 128, 192, (c, w, h, rnd) => {
    paper(c, w, h, '#e4f4fb', rnd, false);
    for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(rnd() * w, rnd() * h, 3 + rnd() * 6, 0, Math.PI * 2); c.fill(); }
    // bottle
    c.fillStyle = '#f7b6c8'; roundRect(c, 44, 50, 40, 100, 12); c.fill();
    c.fillRect(56, 30, 16, 26); c.fillStyle = '#fff'; c.fillRect(54, 24, 20, 8);
    c.fillStyle = '#fff'; c.fillRect(44, 88, 40, 26); blossom(c, 64, 101, 10);
    T(c, '新発売', 8, 6, w - 16, 22, { font: R, color: '#e8483f' });
    T(c, 'さくらソーダ', 6, 154, w - 12, 20, { font: R, color: '#d0607e' });
    T(c, '¥150', 6, 174, w - 12, 16, { font: R, color: '#444' });
  });
  add('kPostBento', 128, 192, (c, w, h, rnd) => {
    paper(c, w, h, '#fff4e0', rnd, false);
    T(c, '春の彩り弁当', 6, 8, w - 12, 22, { font: R, color: '#c0603a' });
    c.fillStyle = '#333'; roundRect(c, 14, 44, 100, 80, 8); c.fill();
    c.fillStyle = '#fbf8f0'; c.fillRect(20, 50, 44, 68);
    c.fillStyle = '#f3a8bb'; c.beginPath(); c.arc(42, 84, 12, 0, Math.PI * 2); c.fill();
    for (const [x, y, col] of [[80, 64, '#f2c230'], [98, 64, '#e8704a'], [80, 100, '#7fb069'], [98, 100, '#c0603a']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); }
    T(c, '¥498', 10, 132, w - 20, 34, { font: R, color: '#e8483f' });
    T(c, '税込 ¥537', 10, 168, w - 20, 16, { font: G, color: '#666' });
  });
  add('kPostIce', 128, 192, (c, w, h, rnd) => {
    paper(c, w, h, '#fde8ef', rnd, false);
    c.fillStyle = '#d8b07a'; c.beginPath(); c.moveTo(46, 96); c.lineTo(82, 96); c.lineTo(64, 156); c.fill();
    c.fillStyle = '#f7b6c8'; c.beginPath(); c.arc(64, 84, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fbf2e6'; c.beginPath(); c.arc(56, 62, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8483f'; c.beginPath(); c.arc(70, 52, 6, 0, Math.PI * 2); c.fill();
    T(c, 'いちごミルク', 6, 6, w - 12, 20, { font: R, color: '#d0607e' });
    T(c, 'アイス', 6, 26, w - 12, 18, { font: R, color: '#d0607e' });
    T(c, '期間限定', 6, 164, w - 12, 20, { font: R, color: '#3b7fd1' });
  });
  add('kPostSpring', 128, 192, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#ffe9f0', '#fbd0dc');
    for (let i = 0; i < 14; i++) petal(c, rnd() * w, rnd() * h, 3 + rnd() * 4, rnd() * 6, '#fff');
    T(c, '春の', 10, 16, w - 20, 26, { font: R, color: '#d0607e' });
    T(c, 'さくらフェア', 6, 44, w - 12, 26, { font: R, color: '#d0607e' });
    blossom(c, 64, 112, 30, '#f59ab4', '#fff2a8');
    T(c, '3/1〜4/15', 8, 152, w - 16, 20, { font: R, color: '#2f8a64' });
    T(c, 'ポイント2倍', 8, 172, w - 16, 16, { font: G, color: '#444' });
  });
  add('kFridge', 512, 256, (c, w, h, rnd) => {
    // cold-case interior seen through the doors, 5 shelves of drinks
    grad(c, 0, 0, w, h, '#f6fbff', '#dfe9f2');
    const rows = 5, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      goodsRow(c, 0, y + 4, w, rh - 10, rnd, [
        { shape: 'bottle', w: [12, 16], h: [0.72, 0.95], cols: ['#8fc9e8', '#f2a3b8', '#9fd49a', '#f4c96a', '#e86a5a', '#f5f1e6', '#6a9ad8', '#c8a8e0'], rep: 4 },
        { shape: 'box', w: [16, 22], h: [0.6, 0.8], cols: ['#f5f1e6', '#f2c230', '#8fc9e8', '#d8f0d0'], rep: 3 },
        { shape: 'cup', w: [16, 18], h: [0.5, 0.6], cols: ['#8a6446', '#f5f1e6', '#3a7a5a'], rep: 3 },
      ]);
      shelfBoard(c, 0, y + rh - 7, w, '#cfd8e0');
    }
    // door mullions + handles
    for (let x = 0; x <= w; x += w / 4) { c.fillStyle = '#b8c0c8'; c.fillRect(x - 3, 0, 6, h); c.fillStyle = '#e8ecf0'; c.fillRect(x + 8, h * 0.3, 4, h * 0.4); }
  });
  for (let i = 0; i < 3; i++) {
    add(`kShelf${i}`, 512, 128, (c, w, h, rnd) => {
      fill(c, w, h, '#f4f4f1');
      const sets = [
        [{ shape: 'bag', w: [22, 30], h: [0.7, 0.95], cols: ['#f2c230', '#e8483f', '#f29a3a', '#8fc9e8', '#7fb069'] }, { shape: 'box', w: [16, 24], h: [0.5, 0.8], cols: ['#f5f1e6', '#e86a5a', '#6a9ad8'] }],
        [{ shape: 'cup', w: [20, 24], h: [0.55, 0.75], cols: ['#e8483f', '#f2c230', '#f5f1e6', '#3b7fd1', '#f29a3a'], rep: 4 }, { shape: 'box', w: [20, 26], h: [0.6, 0.8], cols: ['#d8433d', '#2f63b5'] }],
        [{ shape: 'bottle', w: [14, 20], h: [0.6, 0.95], cols: ['#8fc9e8', '#f5f1e6', '#c8a8e0', '#9fd49a', '#f7b6c8'] }, { shape: 'box', w: [16, 24], h: [0.5, 0.9], cols: ['#f5f1e6', '#8fc9e8', '#f2a3b8', '#e4ead8'] }],
      ][i];
      goodsRow(c, 0, 4, w, h / 2 - 12, rnd, sets);
      shelfBoard(c, 0, h / 2 - 8, w);
      goodsRow(c, 0, h / 2 + 2, w, h / 2 - 12, rnd, sets);
      shelfBoard(c, 0, h - 8, w);
    });
  }
  add('kMag', 256, 128, (c, w, h, rnd) => {
    fill(c, w, h, '#e6e6e2');
    const cols = ['#f7b6c8', '#8fc9e8', '#f4c96a', '#f5f1e6', '#c8a8e0', '#9fd49a', '#e86a5a', '#6a9ad8'];
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 6; i++) {
        const x = 4 + i * 42, y = 6 + r * 62;
        c.fillStyle = cols[(i + r * 3) % cols.length]; c.fillRect(x, y, 38, 54);
        c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(x + 3, y + 3, 32, 10);
        c.fillStyle = 'rgba(80,60,70,0.4)'; c.beginPath(); c.arc(x + 19, y + 34, 11, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x + 3, y + 46, 20, 4);
      }
    }
  });
  add('kBento', 256, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#f0f6fa', '#d8e4ec');
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 7; i++) {
        const x = 4 + i * 36, y = 10 + r * 60;
        if (r === 0 || i % 2) {
          c.fillStyle = '#2a2a2a'; c.fillRect(x, y + 10, 32, 36);
          c.fillStyle = '#fbf8f0'; c.fillRect(x + 2, y + 12, 14, 32);
          c.fillStyle = ['#f2c230', '#e8704a', '#7fb069', '#c0603a'][i % 4]; c.fillRect(x + 18, y + 12, 12, 16);
          c.fillStyle = '#e86a5a'; c.fillRect(x + 18, y + 30, 12, 14);
        } else {
          // onigiri triangles
          for (let k = 0; k < 2; k++) {
            c.fillStyle = '#f7f5ee'; c.beginPath(); c.moveTo(x + 4 + k * 14, y + 46); c.lineTo(x + 12 + k * 14, y + 24); c.lineTo(x + 20 + k * 14, y + 46); c.fill();
            c.fillStyle = '#2d3a2d'; c.fillRect(x + 7 + k * 14, y + 38, 10, 8);
          }
        }
      }
      shelfBoard(c, 0, y0(r), w, '#c8d0d8');
    }
    function y0(r) { return 56 + r * 62; }
  });
  add('kHot', 128, 64, (c, w, h) => {
    grad(c, 0, 0, w, h, '#fff1d8', '#f2c88a');
    for (let i = 0; i < 5; i++) { c.fillStyle = '#d8903a'; c.beginPath(); c.ellipse(14 + i * 24, 40, 10, 8, 0, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 4; i++) { c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(24 + i * 26, 16, 9, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#e8483f'; c.fillRect(0, h - 8, w, 8);
  });
  add('kTrash', 512, 64, (c, w, h) => {
    const L = [['もえるゴミ', '#e8704a'], ['カン', '#3b7fd1'], ['ビン', '#3aa37a'], ['ペットボトル', '#f2a33a']];
    L.forEach(([t, col], i) => {
      const x = i * 128;
      c.fillStyle = col; c.fillRect(x, 0, 128, h);
      c.fillStyle = '#fff'; roundRect(c, x + 6, 6, 116, h - 12, 8); c.fill();
      T(c, t, x + 10, 12, 108, h - 24, { font: R, color: col });
    });
  });
  add('kDoor', 256, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(58,163,122,0.92)'; roundRect(c, 0, 4, 120, 56, 8); c.fill();
    T(c, '自動ドア', 6, 10, 108, 26, { font: R, color: '#fff' });
    T(c, 'AUTO DOOR', 6, 36, 108, 18, { font: R, color: '#fff' });
    c.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(c, 132, 4, 124, 56, 8); c.fill();
    T(c, 'いらっしゃいませ', 136, 12, 116, 22, { font: R, color: '#2f8a64' });
    T(c, 'WELCOME', 136, 36, 116, 18, { font: R, color: '#f29a3a' });
  });
  add('kGacha', 384, 192, (c, w, h, rnd) => {
    const themes = [['#f7b6c8', 'さくら', 'どうぶつ', '#d0607e'], ['#8fc9e8', 'でんしゃ', 'コレクション', '#2f63b5'], ['#f4d27a', 'ねこ', 'マスコット', '#c07a2a']];
    themes.forEach(([bg, a, b, fg], i) => {
      const x = i * 128;
      c.fillStyle = bg; c.fillRect(x, 0, 128, h);
      c.fillStyle = '#fff'; roundRect(c, x + 8, 8, 112, 92, 10); c.fill();
      // character art
      c.fillStyle = bg; c.beginPath(); c.arc(x + 64, 50, 26, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a2f3a'; c.beginPath(); c.arc(x + 55, 48, 3, 0, Math.PI * 2); c.arc(x + 73, 48, 3, 0, Math.PI * 2); c.fill();
      if (i === 1) { c.fillStyle = '#f5f1e6'; c.fillRect(x + 36, 70, 56, 16); c.fillStyle = '#ef8fae'; c.fillRect(x + 36, 78, 56, 4); }
      else { c.beginPath(); c.moveTo(x + 42, 34); c.lineTo(x + 48, 18); c.lineTo(x + 56, 30); c.moveTo(x + 86, 34); c.lineTo(x + 80, 18); c.lineTo(x + 72, 30); c.fillStyle = bg; c.fill(); }
      T(c, a, x + 10, 104, 108, 26, { font: R, color: fg });
      T(c, b, x + 10, 128, 108, 18, { font: R, color: fg });
      c.fillStyle = '#e8483f'; roundRect(c, x + 22, 152, 84, 30, 8); c.fill();
      T(c, '1回 200円', x + 24, 156, 80, 22, { font: R, color: '#fff' });
    });
  });
  add('kCoffee', 128, 128, (c, w, h) => {
    grad(c, 0, 0, w, h, '#3a3a3e', '#1f1f22');
    T(c, 'HARU CAFE', 8, 10, w - 16, 20, { font: R, color: '#f29a3a' });
    c.fillStyle = '#9ad0f0'; c.fillRect(20, 38, 88, 36);
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#f5f1e6', '#8a6446', '#f29a3a'][i]; c.fillRect(20 + i * 30, 82, 26, 12); }
    c.fillStyle = '#555'; c.fillRect(40, 100, 48, 24);
  });

  // ================= café ======================================================
  const [cA, cB] = split(names.cafe || '喫茶 はるかぜ');
  add('cSign', 768, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#5c4230', '#4a3426');
    c.strokeStyle = '#c9a66b'; c.lineWidth = 3; roundRect(c, 8, 8, w - 16, h - 16, 6); c.stroke();
    T(c, cA, 30, 22, 120, 84, { font: M, color: '#f2e6cf' });
    T(c, cB, 150, 12, 420, 104, { font: R, weight: 800, color: '#f7eedc', letterSpacing: 10 });
    T(c, 'COFFEE & CAKE', 560, 30, 190, 34, { font: R, color: '#c9a66b' });
    T(c, 'since 1979', 560, 70, 190, 26, { font: M, color: '#c9a66b' });
    weather(c, w, h, rnd, 8, 0.1, '30,20,10');
  });
  add('cValance', 512, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const col = '#2f5a48';
    c.fillStyle = col;
    c.fillRect(0, 0, w, h * 0.62);
    const n = 16, sw = w / n;
    for (let i = 0; i < n; i++) { c.beginPath(); c.arc(i * sw + sw / 2, h * 0.6, sw / 2, 0, Math.PI); c.fill(); }
    c.fillStyle = '#f2e6cf'; c.fillRect(0, 4, w, 2);
    T(c, `COFFEE · ${cB} · CAKE · ${cA}`, 20, 8, w - 40, h * 0.46, { font: R, color: '#f2e6cf', letterSpacing: 2 });
  });
  add('cBoard', 256, 384, (c, w, h, rnd) => {
    fill(c, w, h, '#8a6446');
    grad(c, 12, 12, w - 24, h - 24, '#2f3a36', '#26302c');
    weather(c, w, h, rnd, 12, 0.06, '255,255,255');
    chalk(c, '本日のおすすめ', 26, 22, 200, 30, '#f7e7b0');
    c.strokeStyle = 'rgba(244,241,232,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(28, 58); c.lineTo(226, 60); c.stroke();
    const items = [['桜ラテ', '¥520', '#f9bfd0'], ['いちごショートケーキ', '¥480', '#f4f1e8'], ['小倉トースト', '¥450', '#f4f1e8']];
    items.forEach(([n, p, col], i) => {
      chalk(c, n, 26, 76 + i * 58, 150, 26, col);
      chalk(c, p, 170, 100 + i * 58, 60, 24, '#f7e7b0');
    });
    c.fillStyle = '#e98aa7'; roundRect(c, 24, 256, 96, 34, 14); c.fill();
    T(c, '春限定', 28, 260, 88, 26, { font: R, color: '#fff' });
    // doodles: cup + blossoms
    c.strokeStyle = '#f4f1e8'; c.lineWidth = 2.5;
    roundRect(c, 150, 268, 44, 36, 6); c.stroke();
    c.beginPath(); c.arc(198, 286, 8, -1.2, 1.2); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(160 + i * 12, 262); c.quadraticCurveTo(165 + i * 12, 252, 160 + i * 12, 244); c.stroke(); }
    blossom(c, 50, 326, 14, '#f9bfd0', '#f7e7b0'); blossom(c, 84, 340, 10, '#f9bfd0', '#f7e7b0'); blossom(c, 210, 340, 12, '#f9bfd0', '#f7e7b0');
    chalk(c, 'OPEN 8:00-18:00', 26, 350, 200, 20, '#cfe8d8');
  });
  add('cBoardB', 256, 384, (c, w, h, rnd) => {
    fill(c, w, h, '#8a6446');
    grad(c, 12, 12, w - 24, h - 24, '#2f3a36', '#26302c');
    chalk(c, 'Welcome!', 30, 30, 196, 44, '#f9bfd0');
    chalk(c, 'モーニング', 30, 100, 196, 30, '#f4f1e8');
    chalk(c, '8:00〜11:00', 30, 136, 196, 26, '#f7e7b0');
    chalk(c, 'トースト・ゆで卵付', 30, 172, 196, 22, '#f4f1e8');
    chalk(c, 'ブレンド ¥420', 30, 220, 196, 26, '#f4f1e8');
    chalk(c, 'ナポリタン ¥780', 30, 256, 196, 26, '#f4f1e8');
    blossom(c, 200, 330, 20, '#f9bfd0', '#f7e7b0');
  });
  add('cMenu', 96, 128, (c, w, h) => {
    fill(c, w, h, '#fbf4e4');
    frame(c, w, h, '#8a6446', 4);
    T(c, 'MENU', 8, 8, w - 16, 22, { font: M, color: '#5b4332' });
    for (let i = 0; i < 5; i++) { c.fillStyle = '#b8a890'; c.fillRect(12, 40 + i * 16, 44, 3); c.fillRect(66, 40 + i * 16, 18, 3); }
    blossom(c, 48, 116, 8);
  });
  add('cRound', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#4a3426'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2e6cf'; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.fill();
    T(c, '珈琲', 18, 24, 92, 44, { font: M, color: '#4a3426' });
    c.strokeStyle = '#4a3426'; c.lineWidth = 3;
    roundRect(c, 46, 76, 30, 22, 4); c.stroke(); c.beginPath(); c.arc(80, 86, 6, -1.3, 1.3); c.stroke();
  });
  add('cCake', 256, 64, (c, w, h) => {
    grad(c, 0, 0, w, h, '#fffaf0', '#f0e2cc');
    const cakes = [['#fbf6ea', '#e8483f'], ['#8a5a3a', '#f4d27a'], ['#f7c6d4', '#f59ab4'], ['#f4e0a8', '#f2c230'], ['#fbf6ea', '#9fd49a']];
    for (let i = 0; i < 8; i++) {
      const [b, t] = cakes[i % cakes.length];
      const x = 8 + i * 31;
      c.fillStyle = b; c.beginPath(); c.moveTo(x, 50); c.lineTo(x + 24, 50); c.lineTo(x + 24, 26); c.lineTo(x, 34); c.fill();
      c.fillStyle = t; c.beginPath(); c.arc(x + 12, 26, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.fillRect(x + 4, 54, 16, 6);
    }
  });

  // ================= flower shop ==============================================
  const [fA, fB] = split(names.flower || 'フラワーショップ 花音');
  add('fSign', 640, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#f7f4ea', '#ece6d6');
    c.fillStyle = '#9cc49a'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10);
    T(c, fB, 150, 14, 300, 96, { font: M, weight: 700, color: '#4a6a4a', letterSpacing: 8 });
    T(c, fA, 440, 26, 180, 34, { font: R, color: '#7a9a6a' });
    T(c, 'flower shop KANON', 440, 66, 180, 30, { font: R, color: '#c77a90' });
    // flower spray logo
    for (let i = 0; i < 5; i++) blossom(c, 60 + Math.cos(i * 1.3) * 28, 64 + Math.sin(i * 1.3) * 28, 16, ['#f7b6c8', '#f4d27a', '#c8a8e0', '#f59ab4', '#fff'][i]);
    c.strokeStyle = '#6a9a5a'; c.lineWidth = 4; c.beginPath(); c.moveTo(60, 70); c.lineTo(80, 118); c.stroke();
    weather(c, w, h, rnd, 6, 0.05);
  });
  add('fTags', 256, 128, (c, w, h, rnd) => {
    const tags = [['チューリップ', '1本 ¥180'], ['ガーベラ', '¥200'], ['かすみ草', '¥350'], ['バラ', '1本 ¥300'], ['紫陽花 鉢', '¥1,800'], ['桜の枝', '¥500'], ['春の花束', '¥1,500〜'], ['スイートピー', '¥250']];
    tags.forEach(([n, p], i) => {
      const x = (i % 4) * 64, y = Math.floor(i / 4) * 64;
      c.fillStyle = ['#fffbea', '#fdeef2', '#eef6ea', '#fdf6e4'][i % 4]; c.fillRect(x + 1, y + 1, 62, 62);
      c.strokeStyle = '#c9a66b'; c.lineWidth = 1.5; c.strokeRect(x + 3, y + 3, 58, 58);
      T(c, n, x + 4, y + 8, 56, 20, { font: R, color: '#4a6a4a' });
      T(c, p, x + 4, y + 32, 56, 22, { font: R, color: '#d04a5a' });
    });
  });
  // alpha flower cards (8 cells 64 x 128): bunches seen from the side
  add('fCards', 512, 128, (c, w, h, rnd) => {
    c.clearRect(0, 0, w, h);
    const stems = (x, n, top, col = '#6a9a4a') => {
      c.strokeStyle = col; c.lineWidth = 2.2;
      for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(x + 32 + (i - n / 2) * 2.5, h); c.quadraticCurveTo(x + 32 + (i - n / 2) * 5, h * 0.6, x + 32 + (i - n / 2) * 8 + (rnd() - 0.5) * 6, top + rnd() * 10); c.stroke(); }
    };
    const leaves = (x, n) => { c.fillStyle = '#7fb069'; for (let i = 0; i < n; i++) { c.save(); c.translate(x + 20 + rnd() * 24, h - 10 - rnd() * 40); c.rotate((rnd() - 0.5) * 1.4); c.beginPath(); c.ellipse(0, -10, 4, 14, 0, 0, Math.PI * 2); c.fill(); c.restore(); } };
    const cellsDef = [
      (x) => { stems(x, 7, 22); leaves(x, 5); for (let i = 0; i < 7; i++) { const bx = x + 32 + (i - 3.5) * 8, by = 22 + rnd() * 12; c.fillStyle = '#e8483f'; c.beginPath(); c.ellipse(bx, by, 5.5, 8, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx - 1, by - 6, 2, 8); } },
      (x) => { stems(x, 7, 22); leaves(x, 5); for (let i = 0; i < 7; i++) { const bx = x + 32 + (i - 3.5) * 8, by = 22 + rnd() * 12; c.fillStyle = '#f4c93a'; c.beginPath(); c.ellipse(bx, by, 5.5, 8, 0, 0, Math.PI * 2); c.fill(); } },
      (x) => { stems(x, 7, 22); leaves(x, 5); for (let i = 0; i < 7; i++) { const bx = x + 32 + (i - 3.5) * 8, by = 22 + rnd() * 12; c.fillStyle = i % 2 ? '#f59ab4' : '#fbd0dc'; c.beginPath(); c.ellipse(bx, by, 5.5, 8, 0, 0, Math.PI * 2); c.fill(); } },
      (x) => { stems(x, 9, 18); for (let i = 0; i < 11; i++) { const bx = x + 8 + rnd() * 48, by = 12 + rnd() * 40; c.fillStyle = '#fff'; for (let k = 0; k < 8; k++) { c.save(); c.translate(bx, by); c.rotate(k * 0.785); c.beginPath(); c.ellipse(0, -4, 1.6, 4, 0, 0, Math.PI * 2); c.fill(); c.restore(); } c.fillStyle = '#f2c230'; c.beginPath(); c.arc(bx, by, 2.2, 0, Math.PI * 2); c.fill(); } },
      (x) => { stems(x, 10, 16, '#8aaa6a'); c.fillStyle = '#fbfbf6'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(x + 6 + rnd() * 52, 8 + rnd() * 56, 1.6 + rnd() * 1.2, 0, Math.PI * 2); c.fill(); } },
      (x) => { stems(x, 6, 24, '#4a7a3a'); leaves(x, 6); for (let i = 0; i < 6; i++) { const bx = x + 32 + (i - 3) * 9, by = 24 + rnd() * 12; c.fillStyle = ['#d8433d', '#f59ab4', '#fbf2e6'][i % 3]; c.beginPath(); c.arc(bx, by, 6.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 1; c.beginPath(); c.arc(bx, by, 3, 0, 5); c.stroke(); } },
      (x) => { // sakura branch
        c.strokeStyle = '#6a4a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 30, h); c.lineTo(x + 34, 60); c.lineTo(x + 20, 20); c.moveTo(x + 34, 60); c.lineTo(x + 48, 14); c.moveTo(x + 33, 80); c.lineTo(x + 54, 50); c.stroke();
        for (let i = 0; i < 22; i++) blossom(c, x + 12 + rnd() * 44, 8 + rnd() * 70, 4 + rnd() * 2, rnd() < 0.5 ? '#fbd0dc' : '#f7b6c8', '#e2738f', rnd() * 6);
      },
      (x) => { stems(x, 8, 20, '#7aa05a'); for (let i = 0; i < 14; i++) { const bx = x + 8 + rnd() * 48, by = 14 + rnd() * 44; c.fillStyle = ['#c8a8e0', '#f7b6c8', '#fbf2e6', '#e8a0c0'][i % 4]; c.beginPath(); c.ellipse(bx, by, 4, 3, rnd(), 0, Math.PI * 2); c.fill(); } },
    ];
    cellsDef.forEach((f, i) => f(i * 64));
  });
  add('fWrap', 256, 128, (c, w, h, rnd) => {
    const pats = [
      (x) => { c.fillStyle = '#d8b48a'; c.fillRect(x, 0, 64, h); c.fillStyle = 'rgba(120,80,40,0.15)'; for (let i = 0; i < 30; i++) c.fillRect(x + rnd() * 64, rnd() * h, 6, 1); },
      (x) => { c.fillStyle = '#fbd8e2'; c.fillRect(x, 0, 64, h); c.fillStyle = '#fff'; for (let y = 6; y < h; y += 12) for (let xx = 6 + ((y / 12) % 2) * 6; xx < 64; xx += 12) { c.beginPath(); c.arc(x + xx, y, 2.5, 0, 7); c.fill(); } },
      (x) => { c.fillStyle = '#f5f2ea'; c.fillRect(x, 0, 64, h); c.strokeStyle = '#c8d8b8'; c.lineWidth = 3; for (let i = 0; i < 64; i += 12) { c.beginPath(); c.moveTo(x + i, 0); c.lineTo(x + i, h); c.stroke(); } for (let y = 0; y < h; y += 12) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 64, y); c.stroke(); } },
      (x) => { c.fillStyle = '#cfe0f0'; c.fillRect(x, 0, 64, h); for (let i = 0; i < 6; i++) blossom(c, x + 10 + rnd() * 44, 10 + rnd() * 108, 6, '#fff', '#f2c230'); },
    ];
    pats.forEach((p, i) => p(i * 64));
  });
  add('fPoster', 128, 180, (c, w, h, rnd) => {
    paper(c, w, h, '#f4f8ec', rnd);
    T(c, '春のブーケ', 8, 12, w - 16, 26, { font: R, color: '#6a8a4a' });
    for (let i = 0; i < 7; i++) blossom(c, 36 + rnd() * 56, 56 + rnd() * 50, 10 + rnd() * 6, ['#f7b6c8', '#f4d27a', '#c8a8e0', '#fff', '#f59ab4'][i % 5]);
    c.fillStyle = '#e8d8b8'; c.beginPath(); c.moveTo(40, 110); c.lineTo(88, 110); c.lineTo(64, 158); c.fill();
    T(c, 'ご予約承ります', 8, 158, w - 16, 18, { font: G, color: '#555' });
  });
  add('furin', 32, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f7f2e0'; c.fillRect(4, 0, w - 8, h);
    V(c, '春風', w / 2, 8, h - 8, { font: M, color: '#3a5a8a', maxSize: 20 });
  });

}
