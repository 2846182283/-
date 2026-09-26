/**
 * Canvas painters, part 2: books, bicycle, wagashi, zakka, ramen, tabako
 * (see paint.js for the generic cells, konbini, café and flower shop).
 */
import { R, G, M, fill, grad, weather, frame, T, V, blossom, petal, paper, goodsRow, shelfBoard, enamel, roundRect, split } from './paintkit.js';

export function paintStreet(add, names) {
  // ================= books =====================================================
  add('bSign', 640, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#2f4a78', '#263e66');
    c.strokeStyle = '#e8e0c8'; c.lineWidth = 3; c.strokeRect(10, 10, w - 20, h - 20);
    T(c, names.books || '青空書店', 40, 14, 420, 100, { font: M, color: '#fbf6ea', letterSpacing: 16 });
    T(c, 'AOZORA', 470, 30, 150, 34, { font: R, color: '#a9ccf0' });
    T(c, 'BOOKS', 470, 66, 150, 34, { font: R, color: '#a9ccf0' });
    weather(c, w, h, rnd, 6, 0.08, '255,255,255');
  });
  add('bVert', 96, 384, (c, w, h) => {
    fill(c, w, h, '#fbf6ea');
    frame(c, w, h, '#2f4a78', 6);
    V(c, '本・雑誌・文具', w / 2, 16, h - 16, { font: G, color: '#2f4a78', maxSize: 56 });
  });
  add('bMags', 512, 192, (c, w, h, rnd) => {
    const cols = ['#f7b6c8', '#8fc9e8', '#f4d27a', '#fbf6ea', '#c8a8e0', '#9fd49a', '#e86a5a', '#6a9ad8'];
    const titles = ['季刊 さくら', '鉄道ファン', '月刊ねこ', 'COOK', '旅と散歩', 'ガーデン', '週刊少年', 'HOME'];
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 128, y = Math.floor(i / 4) * 96;
      c.fillStyle = cols[i]; c.fillRect(x + 2, y + 2, 124, 92);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x + 6, y + 6, 116, 20);
      T(c, titles[i], x + 8, y + 7, 112, 18, { font: R, color: '#333' });
      c.fillStyle = 'rgba(70,50,60,0.35)'; c.beginPath(); c.arc(x + 64, y + 60, 22, 0, Math.PI * 2); c.fill();
      if (i === 1) { c.fillStyle = '#f5f1e6'; c.fillRect(x + 20, y + 56, 88, 20); c.fillStyle = '#ef8fae'; c.fillRect(x + 20, y + 66, 88, 4); }
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x + 8, y + 82, 50, 6);
    }
  });
  add('bSpines', 512, 256, (c, w, h, rnd) => {
    fill(c, w, h, '#6a4e3a');
    const cols = ['#e8e0cc', '#c86a5a', '#4a6a8a', '#7a9a6a', '#d8b48a', '#8a5a7a', '#f4efe2', '#3a4a5a', '#e0a878', '#b8c8d8'];
    for (let r = 0; r < 4; r++) {
      const y = r * 64;
      let x = 2;
      while (x < w - 4) {
        const bw = 7 + rnd() * 12, bh = 40 + rnd() * 18;
        c.fillStyle = cols[Math.floor(rnd() * cols.length)];
        c.fillRect(x, y + 60 - bh, bw, bh);
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x + 1, y + 62 - bh + 6, bw - 2, 3);
        c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x + bw - 1, y + 60 - bh, 1, bh);
        x += bw + 0.5;
        if (rnd() < 0.05) x += 8;
      }
      c.fillStyle = '#8a6446'; c.fillRect(0, y + 60, w, 4);
    }
  });
  add('b100', 128, 64, (c, w, h) => {
    fill(c, w, h, '#f4d27a');
    T(c, '文庫 1冊', 6, 4, w - 12, 24, { font: R, color: '#8a3a2a' });
    T(c, '100円', 6, 28, w - 12, 32, { font: R, color: '#d8433d' });
  });
  add('bPoster', 128, 180, (c, w, h, rnd) => {
    paper(c, w, h, '#eef4fb', rnd);
    T(c, '新刊入荷', 8, 12, w - 16, 28, { font: R, color: '#2f4a78' });
    c.fillStyle = '#f7b6c8'; c.fillRect(24, 50, 36, 54); c.fillStyle = '#8fc9e8'; c.fillRect(66, 56, 36, 48);
    T(c, '春の文庫フェア', 6, 116, w - 12, 20, { font: R, color: '#d0607e' });
    T(c, '全品ポイント5倍', 6, 144, w - 12, 18, { font: G, color: '#444' });
  });

  // ================= bicycle shop ==============================================
  const [yA, yB] = split(names.bicycle || 'サイクル 風見');
  add('ySign', 640, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#f5f5f0', '#e6e8e4');
    c.fillStyle = '#3f7fc8'; c.fillRect(0, 0, 150, h);
    // bicycle pictogram
    c.strokeStyle = '#fff'; c.lineWidth = 5;
    c.beginPath(); c.arc(42, 76, 22, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(108, 76, 22, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(42, 76); c.lineTo(66, 46); c.lineTo(98, 46); c.lineTo(108, 76); c.moveTo(66, 46); c.lineTo(76, 76); c.lineTo(98, 46); c.moveTo(60, 38); c.lineTo(74, 38); c.stroke();
    T(c, yA, 160, 16, 130, 44, { font: R, color: '#3f7fc8' });
    T(c, yB, 290, 8, 200, 70, { font: M, weight: 700, color: '#2d3a4a', letterSpacing: 10 });
    T(c, '自転車 販売・修理', 170, 80, 440, 36, { font: G, color: '#d8433d' });
    weather(c, w, h, rnd, 8, 0.07);
  });
  add('yPump', 128, 96, (c, w, h) => {
    fill(c, w, h, '#fffbe8');
    frame(c, w, h, '#3f7fc8', 4);
    T(c, '空気入れ', 8, 10, w - 16, 30, { font: R, color: '#3f7fc8' });
    T(c, 'ご自由に', 8, 44, w - 16, 20, { font: R, color: '#333' });
    T(c, 'どうぞ', 8, 66, w - 16, 20, { font: R, color: '#333' });
  });
  add('yTools', 256, 128, (c, w, h, rnd) => {
    fill(c, w, h, '#c8b89a');
    c.fillStyle = 'rgba(80,60,40,0.4)';
    for (let y = 6; y < h; y += 12) for (let x = 6; x < w; x += 12) c.fillRect(x, y, 2.5, 2.5);
    const tool = (x, y, l, col, ang) => { c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col; c.fillRect(-3, 0, 6, l); c.fillRect(-7, -6, 14, 8); c.restore(); };
    for (let i = 0; i < 9; i++) tool(20 + i * 26, 14, 40 + rnd() * 30, ['#d8433d', '#555b62', '#3f7fc8', '#f2c230'][i % 4], (rnd() - 0.5) * 0.2);
    c.strokeStyle = '#333'; c.lineWidth = 6; c.beginPath(); c.arc(60, 104, 16, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(190, 104, 16, 0, Math.PI * 2); c.stroke();
  });
  add('yTin', 192, 96, (c, w, h, rnd) => enamel(c, 0, 0, w, h, '#f4efe2', '#2f63b5', 'パンク修理', '承ります', rnd));
  add('yPrice', 128, 64, (c, w, h) => {
    fill(c, w, h, '#fff');
    c.fillStyle = '#e8483f'; c.fillRect(0, 0, w, 22);
    T(c, '特価', 4, 2, w - 8, 18, { font: R, color: '#fff' });
    T(c, '¥19,800', 4, 26, w - 8, 32, { font: R, color: '#e8483f' });
  });

  // ================= wagashi ===================================================
  const [wA, wB] = split(names.wagashi || '和菓子 さくら庵');
  add('wSign', 640, 128, (c, w, h, rnd) => {
    // aged keyaki board, carved characters with sumi fill
    grad(c, 0, 0, w, h, '#b58c63', '#9a7250');
    c.strokeStyle = 'rgba(90,60,40,0.25)'; c.lineWidth = 2;
    for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, 8 + i * 10 + rnd() * 4); c.bezierCurveTo(200, i * 10 + rnd() * 20, 400, i * 10 + rnd() * 20, w, 6 + i * 10 + rnd() * 6); c.stroke(); }
    T(c, wB, 150, 10, 360, 106, { font: M, color: '#2a1e18', letterSpacing: 14 });
    T(c, wA, 30, 30, 110, 66, { font: M, color: '#3a2a20' });
    c.fillStyle = '#c23a3a'; c.fillRect(540, 30, 64, 64);
    T(c, '桜', 544, 34, 56, 56, { font: M, color: '#fbe8e0' });
    weather(c, w, h, rnd, 10, 0.1, '60,40,30');
  });
  add('wNoren', 512, 256, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#f5a9bf', '#ec93ad');
    c.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h); // weave
    // crest: sakura in circle
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, 86, 50, 0, Math.PI * 2); c.stroke();
    blossom(c, w / 2, 86, 38, '#ffffff', '#f5a9bf');
    T(c, wB, 40, 150, w - 80, 76, { font: M, color: '#ffffff', letterSpacing: 20 });
    c.fillStyle = 'rgba(160,60,90,0.25)'; c.fillRect(0, h - 10, w, 10);
  });
  add('wLantern', 256, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#fffaf0', '#f3e6cc');
    c.strokeStyle = 'rgba(160,130,90,0.35)'; c.lineWidth = 1.5;
    for (let y = 8; y < h; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    V(c, '和菓子', w * 0.25, 10, h - 10, { font: M, color: '#c23a3a', maxSize: 34 });
    V(c, wB, w * 0.75, 10, h - 10, { font: M, color: '#2a1e18', maxSize: 30 });
    c.fillStyle = '#2a1e18'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
  });
  // standing paper lightbox (行灯看板) by the door: one face per side
  add('wAndon', 96, 256, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#fffaf0', '#f6ead2');
    for (let i = 0; i < 5; i++) petal(c, rnd() * w, h * 0.75 + rnd() * h * 0.22, 3 + rnd() * 3, rnd() * 6, '#f9c3d2');
    V(c, wB, w / 2, 14, h * 0.7, { font: M, color: '#2a1e18', maxSize: 50 });
    c.fillStyle = '#c23a3a'; roundRect(c, w / 2 - 20, h * 0.74, 40, 40, 5); c.fill();
    T(c, '菓', w / 2 - 17, h * 0.74 + 3, 34, 34, { font: M, color: '#fff' });
  });
  add('wPoster', 192, 256, (c, w, h, rnd) => {
    paper(c, w, h, '#fde8ee', rnd);
    for (let i = 0; i < 16; i++) petal(c, rnd() * w, rnd() * h, 4 + rnd() * 4, rnd() * 6, '#f9c3d2');
    V(c, '桜もち', w - 30, 16, 150, { font: M, color: '#b24a6a', maxSize: 42 });
    // sakura mochi: pink rice cake wrapped in a leaf
    for (const [x, y] of [[62, 110], [100, 124]]) {
      c.fillStyle = '#7a9a4a'; c.beginPath(); c.ellipse(x, y + 6, 34, 20, -0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#5a7a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 30, y + 14); c.lineTo(x + 30, y - 2); c.stroke();
      c.fillStyle = '#f7b6c8'; c.beginPath(); c.ellipse(x, y - 6, 26, 18, -0.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x - 8, y - 12, 8, 4, -0.3, 0, Math.PI * 2); c.fill();
    }
    blossom(c, 40, 40, 16); blossom(c, 80, 30, 11, '#fbd0dc');
    c.fillStyle = '#b24a6a'; roundRect(c, 14, 170, 110, 30, 12); c.fill();
    T(c, '春季限定', 18, 173, 102, 24, { font: R, color: '#fff' });
    T(c, '1個 ¥180', 12, 208, w - 24, 34, { font: M, color: '#6a3a3a' });
  });
  add('wFlag', 96, 384, (c, w, h, rnd) => {
    fill(c, w, h, '#fbf6ea');
    c.fillStyle = '#d8433d'; c.fillRect(0, 0, w, 36); c.fillRect(0, h - 30, w, 30);
    for (let y = 44; y < h - 36; y += 36) { c.fillStyle = '#d8433d'; c.fillRect(0, y, 10, 18); }
    V(c, 'たい焼き', w / 2 + 6, 50, h - 110, { font: M, color: '#2a1e18', maxSize: 60 });
    // taiyaki fish icon
    c.fillStyle = '#c8894a'; c.beginPath(); c.ellipse(w / 2 + 4, h - 70, 30, 16, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(w / 2 - 22, h - 70); c.lineTo(w / 2 - 38, h - 84); c.lineTo(w / 2 - 38, h - 56); c.fill();
    c.fillStyle = '#2a1e18'; c.beginPath(); c.arc(w / 2 + 22, h - 74, 3, 0, 7); c.fill();
    weather(c, w, h, rnd, 5, 0.06);
  });
  add('wTags', 256, 128, (c, w, h, rnd) => {
    fill(c, w, h, '#8a6446');
    const it = [['桜餅', '180'], ['草餅', '160'], ['三色団子', '150'], ['どら焼き', '200'], ['豆大福', '180'], ['たい焼き', '160']];
    it.forEach(([n, p], i) => {
      const x = 4 + i * 42;
      c.fillStyle = '#e8d4b0'; c.fillRect(x, 4, 38, h - 8);
      c.fillStyle = 'rgba(120,90,60,0.2)'; c.fillRect(x + 34, 4, 4, h - 8);
      V(c, n, x + 19, 10, h - 36, { font: M, color: '#2a1e18', maxSize: 22 });
      T(c, p, x + 2, h - 32, 34, 22, { font: M, color: '#c23a3a' });
    });
  });
  add('wTray', 256, 128, (c, w, h, rnd) => {
    fill(c, w, h, '#f4ecdc');
    const sw = [['#f7b6c8', '#7a9a4a'], ['#9fbf7a', '#fff'], ['#fbf6ea', '#7a4a3a'], ['#c8894a', '#6a3a2a'], ['#f7f0f4', '#b04a6a']];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
      const x = 8 + i * 50, y = 8 + r * 60, [a, b] = sw[(i + r * 2) % sw.length];
      c.fillStyle = '#2a2a2a'; c.fillRect(x, y, 44, 52); c.fillStyle = '#fbf8f0'; c.fillRect(x + 2, y + 2, 40, 48);
      for (let k = 0; k < 4; k++) { c.fillStyle = a; c.beginPath(); c.arc(x + 12 + (k % 2) * 20, y + 14 + Math.floor(k / 2) * 22, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = b; c.beginPath(); c.arc(x + 12 + (k % 2) * 20, y + 14 + Math.floor(k / 2) * 22, 2.5, 0, Math.PI * 2); c.fill(); }
    }
  });
  add('wSudare', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { c.fillStyle = y % 8 ? '#d8bb92' : '#c8a878'; c.fillRect(0, y, w, 3); }
    c.fillStyle = '#6a4e3a'; for (const x of [20, 64, 108]) c.fillRect(x, 0, 2, h);
    c.fillStyle = '#6a4e3a'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
  });
  add('wNeko', 64, 64, (c, w, h) => {
    fill(c, w, h, '#fbf8f2');
    c.fillStyle = '#2a2a2a';
    c.beginPath(); c.arc(22, 30, 3.5, 0, 7); c.arc(42, 30, 3.5, 0, 7); c.fill();
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(28, 40); c.quadraticCurveTo(32, 44, 36, 40); c.stroke();
    c.beginPath(); c.moveTo(6, 36); c.lineTo(18, 38); c.moveTo(6, 42); c.lineTo(18, 41); c.moveTo(58, 36); c.lineTo(46, 38); c.moveTo(58, 42); c.lineTo(46, 41); c.stroke();
    c.fillStyle = '#f08aa0'; c.beginPath(); c.arc(32, 37, 2.5, 0, 7); c.fill();
    c.fillStyle = '#e8704a'; c.beginPath(); c.arc(14, 14, 6, 0, 7); c.fill();
  });

  // ================= zakka / general store =====================================
  add('zSign', 640, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#f1ead6', '#e2d8bc');
    c.strokeStyle = '#2f5a48'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
    T(c, names.zakka || '山田商店', 30, 10, 380, 108, { font: M, color: '#2f5a48', letterSpacing: 18 });
    T(c, '食料品・日用品', 420, 22, 200, 36, { font: G, color: '#8a3a2a' });
    T(c, '酒・米・雑貨', 420, 66, 200, 36, { font: G, color: '#8a3a2a' });
    weather(c, w, h, rnd, 14, 0.12, '140,110,70');
    for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(150,90,50,0.35)'; c.fillRect(rnd() * w, 6 + rnd() * 4, 2, 8 + rnd() * 20); } // rust drips
  });
  add('zTins', 576, 96, (c, w, h, rnd) => {
    enamel(c, 0, 0, 192, 96, '#e8483f', '#fff6e0', 'ミカンサイダー', '冷えてます', rnd);
    enamel(c, 192, 0, 192, 96, '#2f4a78', '#f4efe2', 'さくら醤油', null, rnd);
    enamel(c, 384, 0, 192, 96, '#f4d27a', '#2a4a3a', 'ツバメ石鹸', '清潔な毎日', rnd);
  });
  add('zIceFlag', 96, 384, (c, w, h, rnd) => {
    fill(c, w, h, '#eef6fb');
    c.fillStyle = '#3f7fc8'; c.fillRect(0, 0, w, 30); c.fillRect(0, h - 30, w, 30);
    V(c, 'アイスクリーム', w / 2, 40, h - 90, { font: R, color: '#d8433d', maxSize: 44 });
    c.fillStyle = '#d8b07a'; c.beginPath(); c.moveTo(w / 2 - 12, h - 62); c.lineTo(w / 2 + 12, h - 62); c.lineTo(w / 2, h - 34); c.fill();
    c.fillStyle = '#f7b6c8'; c.beginPath(); c.arc(w / 2, h - 68, 13, 0, 7); c.fill();
    weather(c, w, h, rnd, 4, 0.05);
  });
  add('zFreezer', 256, 64, (c, w, h) => {
    grad(c, 0, 0, w, h, '#f4f8fb', '#dfe8ef');
    c.fillStyle = '#3f7fc8'; c.fillRect(0, 0, w, 8);
    T(c, 'アイスクリーム', 70, 12, 176, 40, { font: R, color: '#3f7fc8' });
    c.fillStyle = '#d8b07a'; c.beginPath(); c.moveTo(24, 36); c.lineTo(44, 36); c.lineTo(34, 60); c.fill();
    c.fillStyle = '#f7b6c8'; c.beginPath(); c.arc(34, 30, 11, 0, 7); c.fill();
    c.fillStyle = '#fbf2e6'; c.beginPath(); c.arc(34, 20, 9, 0, 7); c.fill();
  });
  add('zIceTop', 256, 128, (c, w, h, rnd) => {
    fill(c, w, h, '#e4eef4');
    for (let i = 0; i < 60; i++) {
      c.save(); c.translate(8 + rnd() * (w - 16), 8 + rnd() * (h - 16)); c.rotate(rnd() * 3);
      c.fillStyle = ['#f7b6c8', '#8fc9e8', '#f4d27a', '#9fd49a', '#fbf6ea', '#e8704a'][i % 6];
      c.fillRect(-12, -6, 24, 12);
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-8, -2, 12, 4);
      c.restore();
    }
  });
  add('zRice', 128, 160, (c, w, h, rnd) => {
    fill(c, w, h, '#f4ecd8');
    c.fillStyle = '#c23a3a'; c.fillRect(0, 0, w, 14);
    V(c, 'さくら米', w * 0.62, 24, 136, { font: M, color: '#2a1e18', maxSize: 32 });
    c.fillStyle = '#c23a3a'; c.beginPath(); c.arc(30, 44, 18, 0, 7); c.fill();
    T(c, '新米', 14, 32, 32, 24, { font: M, color: '#fff' });
    T(c, '5kg', 10, 128, 50, 22, { font: G, color: '#555' });
    // ears of rice
    c.strokeStyle = '#c8a040'; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(20 + i * 8, 120); c.quadraticCurveTo(24 + i * 8, 90, 34 + i * 6, 76); c.stroke(); }
  });
  add('zGoods', 512, 128, (c, w, h, rnd) => {
    fill(c, w, h, '#efe8da');
    const sets = [
      { shape: 'box', w: [18, 28], h: [0.5, 0.9], cols: ['#f5f1e6', '#e86a5a', '#6a9ad8', '#f2c230', '#9fd49a'] },
      { shape: 'cup', w: [16, 20], h: [0.4, 0.55], cols: ['#d8433d', '#f5f1e6', '#f2c230'] },
      { shape: 'bottle', w: [14, 20], h: [0.7, 0.95], cols: ['#5a3a2a', '#8fc9e8', '#f5f1e6', '#3a6a3a'] },
      { shape: 'bag', w: [22, 30], h: [0.6, 0.9], cols: ['#f29a3a', '#f7b6c8', '#e8483f'] },
    ];
    goodsRow(c, 0, 4, w, h / 2 - 12, rnd, sets);
    shelfBoard(c, 0, h / 2 - 8, w, '#b58c63');
    goodsRow(c, 0, h / 2 + 2, w, h / 2 - 12, rnd, sets);
    shelfBoard(c, 0, h - 8, w, '#b58c63');
  });
  add('zCrate', 128, 64, (c, w, h) => {
    fill(c, w, h, '#ffffff');
    c.fillStyle = 'rgba(0,0,0,0.28)';
    for (let x = 8; x < w - 8; x += 16) for (let y = 10; y < h - 10; y += 16) { roundRect(c, x, y, 10, 10, 2); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(0, 0, w, 5);
  });

  // ================= ramen =====================================================
  const [rA, rB] = split(names.ramen || 'らーめん 春来');
  add('rSign', 640, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#c8423a', '#a8342e');
    c.strokeStyle = '#f4d27a'; c.lineWidth = 4; c.strokeRect(8, 8, w - 16, h - 16);
    T(c, rA, 28, 14, 280, 100, { font: M, color: '#fff6e0', letterSpacing: 6 });
    T(c, rB, 320, 10, 170, 108, { font: M, color: '#f4d27a', letterSpacing: 10 });
    T(c, '中華そば', 500, 22, 120, 40, { font: G, color: '#fff6e0' });
    T(c, '餃子', 500, 66, 120, 40, { font: G, color: '#fff6e0' });
    weather(c, w, h, rnd, 10, 0.1, '60,20,20');
  });
  add('rNoren', 512, 256, (c, w, h) => {
    grad(c, 0, 0, w, h, '#2e3c5c', '#253250');
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h);
    T(c, rA, 30, 40, w - 60, 130, { font: M, color: '#fbf6ea', letterSpacing: 24 });
    T(c, rB, w / 2 - 60, 184, 120, 48, { font: M, color: '#f4d27a' });
    c.fillStyle = '#c8423a'; c.fillRect(0, 0, w, 14);
  });
  add('rLantern', 256, 128, (c, w, h) => {
    grad(c, 0, 0, w, h, '#e8483f', '#c8322c');
    c.strokeStyle = 'rgba(120,20,20,0.35)'; c.lineWidth = 1.5;
    for (let y = 8; y < h; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    V(c, rA, w * 0.25, 10, h - 10, { font: M, color: '#1e1414', maxSize: 30 });
    V(c, rB, w * 0.75, 18, h - 18, { font: M, color: '#1e1414', maxSize: 36 });
    c.fillStyle = '#1e1414'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
  });
  add('rMenu', 256, 256, (c, w, h, rnd) => {
    fill(c, w, h, '#6a4e3a');
    const it = [['醤油らーめん', '750'], ['味噌らーめん', '850'], ['塩らーめん', '750'], ['チャーシュー麺', '950'], ['餃子', '400'], ['半チャーハン', '350']];
    it.forEach(([n, p], i) => {
      const x = 4 + i * 42;
      c.fillStyle = '#efe0c0'; c.fillRect(x, 6, 38, h - 12);
      V(c, n, x + 19, 12, h - 58, { font: M, color: '#1e1414', maxSize: 26 });
      T(c, p, x + 2, h - 50, 34, 22, { font: M, color: '#c8322c' });
      T(c, '円', x + 2, h - 28, 34, 16, { font: M, color: '#1e1414' });
    });
  });
  add('rPoster', 128, 180, (c, w, h, rnd) => {
    paper(c, w, h, '#fff6e6', rnd);
    c.fillStyle = '#f7b6c8'; c.fillRect(0, 0, w, 40);
    T(c, '春限定', 8, 6, w - 16, 28, { font: R, color: '#fff' });
    // bowl
    c.fillStyle = '#c8322c'; c.beginPath(); c.arc(64, 96, 40, 0, Math.PI); c.fill();
    c.fillStyle = '#f4d8a0'; c.beginPath(); c.ellipse(64, 96, 40, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f59ab4'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(44 + i * 8, 94, 3, 0, 7); c.fill(); }
    T(c, '桜えび塩らーめん', 4, 146, w - 8, 18, { font: R, color: '#b04a4a' });
    T(c, '¥900', 4, 164, w - 8, 14, { font: R, color: '#333' });
  });

  add('rVert', 96, 384, (c, w, h, rnd) => {
    fill(c, w, h, '#c8423a');
    c.strokeStyle = '#f4d27a'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12);
    V(c, rA, w / 2, 20, h - 110, { font: M, color: '#fff6e0', maxSize: 60 });
    V(c, rB, w / 2, h - 104, h - 18, { font: M, color: '#f4d27a', maxSize: 40 });
    weather(c, w, h, rnd, 6, 0.08, '60,20,20');
  });
  add('rStand', 192, 320, (c, w, h) => {
    fill(c, w, h, '#fbf6ea');
    c.fillStyle = '#c8423a'; c.fillRect(0, 0, w, 48);
    T(c, '本日のおすすめ', 8, 8, w - 16, 32, { font: R, color: '#fff' });
    T(c, '味噌らーめん', 10, 64, w - 20, 36, { font: R, color: '#2a1e18' });
    T(c, '¥850', 10, 104, w - 20, 36, { font: R, color: '#c8322c' });
    c.fillStyle = '#c8322c'; c.beginPath(); c.arc(w / 2, 190, 50, 0, Math.PI); c.fill();
    c.fillStyle = '#e0b070'; c.beginPath(); c.ellipse(w / 2, 190, 50, 12, 0, 0, Math.PI * 2); c.fill();
    T(c, '餃子セット +300円', 10, 262, w - 20, 26, { font: R, color: '#2a1e18' });
    T(c, '営業中', 10, 290, w - 20, 24, { font: R, color: '#3a7a5a' });
  });
  add('zVert', 96, 384, (c, w, h, rnd) => {
    fill(c, w, h, '#f1ead6');
    c.strokeStyle = '#2f5a48'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
    V(c, '米・酒・食料品', w / 2, 18, h - 18, { font: M, color: '#2f5a48', maxSize: 52 });
    weather(c, w, h, rnd, 8, 0.12, '140,110,70');
  });
  add('box', 128, 96, (c, w, h) => {
    fill(c, w, h, '#d2ad7a');
    c.fillStyle = 'rgba(120,80,40,0.25)'; c.fillRect(0, h / 2 - 5, w, 10);
    c.fillStyle = 'rgba(200,180,140,0.9)'; c.fillRect(w / 2 - 12, 0, 24, h);
    c.strokeStyle = 'rgba(90,60,30,0.6)'; c.lineWidth = 3;
    c.strokeRect(14, 22, 40, 26);
    T(c, 'みかん', 16, 24, 36, 22, { font: G, color: '#b04a2a' });
    T(c, '天地無用', 70, 60, 50, 20, { font: G, color: '#5a3a1a' });
  });

  // ================= tabako ====================================================
  add('tTabako', 256, 96, (c, w, h, rnd) => {
    fill(c, w, h, '#d8403a');
    c.strokeStyle = '#fbf2e0'; c.lineWidth = 4; roundRect(c, 8, 8, w - 16, h - 16, 10); c.stroke();
    T(c, 'たばこ', 20, 10, w - 40, h - 20, { font: G, weight: 700, color: '#fbf2e0', letterSpacing: 18 });
    weather(c, w, h, rnd, 6, 0.1, '80,30,20');
  });
  add('tSign', 512, 128, (c, w, h, rnd) => {
    grad(c, 0, 0, w, h, '#f3ead6', '#e0d4b8');
    T(c, names.tabako || '松本たばこ店', 20, 14, w - 40, 76, { font: M, color: '#2a1e18', letterSpacing: 10 });
    T(c, '切手・はがき・収入印紙', 20, 92, w - 40, 26, { font: G, color: '#6a4e3a' });
    weather(c, w, h, rnd, 10, 0.1, '120,90,60');
  });
  add('tSmall', 256, 96, (c, w, h, rnd) => {
    enamel(c, 0, 0, 160, 96, '#f4efe2', '#c23a3a', '切手', 'はがき', rnd);
    enamel(c, 164, 0, 92, 96, '#2f63b5', '#fff', '塩', null, rnd);
  });
}
