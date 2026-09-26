/**
 * Posters, maps and paper notices of 桜ヶ丘駅 (fare chart / route map, area
 * map, timetables, spring tourism, safety, festival, hanami map, an old summer
 * poster, children's drawings, mascot sticker, chalk message board, cork
 * board and local ads).  Painted into the station atlases by makePosters().
 */
import { FONTS, fitText, verticalText, seeded } from '../../core/canvasTex.js';
import { STATION } from '../../core/layout.js';
import { NAVY, PINK, PINK_DEEP, LINE_STATIONS, FARES, scaled, T, R, rrect, arrow, sakuraFlower, agePaper, paperEdge } from './paint.js';

/** Queue every poster / map region into S (atlases A, P, Q are packed by makeSigns). */
export function makePosters(kit, S) {
  const P = kit.atlas2, Q = kit.atlas3;
  const west = STATION.west, east = STATION.east;
  // ======================= fare chart & maps (atlas 2) =======================
  S.fareChart = P.add(1400, 560, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, 64);
    T(g, `${STATION.line}  運賃表  Fares`, 24, 8, 620, 50, { color: '#fff', align: 'left' });
    T(g, '大人 / こども   (IC・きっぷ)', w - 520, 12, 500, 42, { color: '#dfe4f0', align: 'right' });
    const y0 = 250, x0 = 70, x1 = w - 70;
    // line (pink) with a subtle shadow
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x0, y0 - 6, x1 - x0, 24);
    g.fillStyle = PINK; g.fillRect(x0, y0 - 10, x1 - x0, 24);
    const n = LINE_STATIONS.length;
    LINE_STATIONS.forEach((st, i) => {
      const x = x0 + (i / (n - 1)) * (x1 - x0);
      const here = st.code === STATION.code;
      g.fillStyle = '#ffffff';
      g.strokeStyle = here ? '#d8342c' : NAVY;
      g.lineWidth = here ? 8 : 5;
      g.beginPath(); g.arc(x, y0 + 2, here ? 26 : 18, 0, 7); g.fill(); g.stroke();
      g.save();
      g.translate(x, y0 - 36);
      g.fillStyle = here ? '#d8342c' : NAVY;
      verticalText(g, st.name, 0, -150, 0, { font: FONTS.gothic, maxSize: 36, color: here ? '#d8342c' : NAVY });
      g.restore();
      T(g, st.code, x - 40, y0 + 34, 80, 28, { color: '#6b7389', font: FONTS.latin });
      const d = Math.abs(i - 6);
      if (here) {
        rrect(g, x - 58, y0 + 70, 116, 80, 10, '#d8342c');
        T(g, '現在地', x - 58, y0 + 76, 116, 36, { color: '#fff' });
        T(g, 'You are here', x - 58, y0 + 112, 116, 30, { color: '#fff', font: FONTS.latin });
      } else {
        const f = FARES[Math.min(d, FARES.length - 1)];
        rrect(g, x - 50, y0 + 70, 100, 90, 8, '#fff6f8', PINK_DEEP, 3);
        T(g, String(f), x - 48, y0 + 74, 96, 50, { color: NAVY, font: FONTS.latin });
        T(g, String(Math.ceil(f / 20) * 10), x - 48, y0 + 124, 96, 30, { color: '#c0506e', font: FONTS.latin });
      }
    });
    // connecting line at HK04 (green) + HK10 (blue), fictional
    g.fillStyle = '#6fbf8e'; g.fillRect(x0 + (3 / 11) * (x1 - x0) - 6, y0 + 160, 12, 90);
    T(g, 'みどり線 のりかえ', x0 + (3 / 11) * (x1 - x0) - 110, y0 + 254, 220, 34, { color: '#3c8a5c' });
    g.fillStyle = '#6aa6d8'; g.fillRect(x0 + (9 / 11) * (x1 - x0) - 6, y0 + 160, 12, 90);
    T(g, 'そよかぜバス のりかえ', x0 + (9 / 11) * (x1 - x0) - 130, y0 + 254, 260, 34, { color: '#3a78b0' });
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });

  S.areaMap = P.add(760, 560, (g, w, h) => {
    const rnd = seeded(77);
    g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, 60);
    T(g, '駅周辺案内図  Area Map', 20, 8, w - 40, 46, { color: '#fff', align: 'left' });
    const my = 60;
    // river & levee
    g.fillStyle = '#a9cde6'; g.fillRect(0, my + 20, w, 60);
    g.fillStyle = '#cfe3b8'; g.fillRect(0, my + 80, w, 26);
    // railway
    g.fillStyle = '#8a8f99'; g.fillRect(0, my + 190, w, 16);
    g.fillStyle = '#fff'; for (let x = 0; x < w; x += 30) g.fillRect(x, my + 196, 16, 4);
    // roads
    g.fillStyle = '#ffffff';
    g.fillRect(0, my + 150, w, 14);
    g.fillRect(0, my + 290, w, 22);
    g.beginPath(); g.moveTo(w * 0.47, my + 300); g.bezierCurveTo(w * 0.5, my + 380, w * 0.42, my + 440, w * 0.45, h); g.lineTo(w * 0.51, h); g.bezierCurveTo(w * 0.48, my + 440, w * 0.56, my + 380, w * 0.53, my + 300); g.fill();
    g.fillRect(w * 0.82, my + 100, 18, h);
    // blocks
    for (let i = 0; i < 40; i++) {
      const x = rnd() * w, y = my + 320 + rnd() * (h - my - 330);
      if (Math.abs(x - w * 0.48) < 40) continue;
      g.fillStyle = rnd() < 0.2 ? '#f6d9c4' : '#e3ddd0';
      g.fillRect(x, y, 30 + rnd() * 30, 20 + rnd() * 20);
    }
    // station
    rrect(g, w * 0.36, my + 212, 150, 58, 6, '#26324f');
    T(g, '桜ヶ丘駅', w * 0.36, my + 218, 150, 46, { color: '#fff' });
    // sakura spots
    for (let i = 0; i < 26; i++) sakuraFlower(g, rnd() * w, my + 86 + rnd() * 14, 9);
    sakuraFlower(g, w * 0.33, my + 262, 14);
    // current position
    g.fillStyle = '#d8342c';
    g.beginPath(); g.arc(w * 0.46, my + 282, 13, 0, 7); g.fill();
    rrect(g, w * 0.46 + 18, my + 262, 110, 40, 8, '#d8342c');
    T(g, '現在地', w * 0.46 + 18, my + 266, 110, 32, { color: '#fff' });
    // labels
    const lab = (t, x, y, c = '#3d4a70') => { rrect(g, x - 4, y - 2, t.length * 22 + 8, 30, 6, 'rgba(255,255,255,0.85)'); T(g, t, x, y, t.length * 22, 26, { color: c, align: 'left' }); };
    lab('桜川', 30, my + 36, '#3a78b0');
    lab('桜並木の土手', 40, my + 84, '#c0506e');
    lab('商店街', w * 0.52 + 14, my + 380);
    lab('踏切', w * 0.82 + 24, my + 196);
    lab('交番', w * 0.62, my + 330);
    lab('郵便局', 60, my + 340);
    lab('小学校', 70, h - 70);
    lab('八幡神社', w - 190, h - 80, '#b8483a');
    // north arrow
    arrow(g, w - 40, my + 150, 40, 'u', '#3d4a70');
    T(g, 'N', w - 60, my + 170, 40, 26, { color: '#3d4a70', font: FONTS.latin });
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });

  const timetable = (track, dest, seed) => Q.add(380, 520, scaled(440, 600, (g, w, h) => {
    const rnd = seeded(seed);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, 86);
    T(g, `時刻表  ${track}番線`, 16, 6, w - 32, 44, { color: '#fff', align: 'left' });
    T(g, `${dest}方面   平日`, 16, 48, w - 32, 32, { color: '#dfe4f0', align: 'left' });
    const rows = 19; const rh = (h - 100) / rows;
    for (let i = 0; i < rows; i++) {
      const y = 94 + i * rh;
      g.fillStyle = i % 2 ? '#f6f3f4' : '#ffffff'; g.fillRect(0, y, w, rh);
      g.fillStyle = PINK; g.fillRect(0, y, 58, rh - 1);
      T(g, String(5 + i), 0, y + 1, 58, rh - 3, { color: '#fff', font: FONTS.latin });
      const nTr = 1 + Math.floor(rnd() * (i > 1 && i < 5 ? 4 : 3));
      const mins = [];
      for (let k = 0; k < nTr; k++) mins.push(Math.floor(((k + rnd() * 0.8) / nTr) * 60));
      mins.sort((a, b) => a - b);
      mins.forEach((m, k) => {
        const rapid = rnd() < 0.18;
        T(g, String(m).padStart(2, '0'), 72 + k * 88, y + 2, 70, rh - 5, { color: rapid ? '#d8342c' : NAVY, font: FONTS.latin, align: 'left' });
      });
      if (5 + i === 16) { g.strokeStyle = '#d8342c'; g.lineWidth = 3; g.strokeRect(2, y + 1, w - 4, rh - 2); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  }));
  S.tt1 = timetable(1, west.name, 3);
  S.tt2 = timetable(2, east.name, 4);

  // ======================= posters (atlas 2) =======================
  S.posterSakura = P.add(300, 424, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#bfe0f7'); gr.addColorStop(0.6, '#fde6ee'); gr.addColorStop(1, '#fff7f0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rnd = seeded(101);
    // distant hills + levee with a pink tree row
    g.fillStyle = '#a8c7a0';
    g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(w * 0.4, 205, w, 240); g.lineTo(w, 300); g.lineTo(0, 300); g.fill();
    for (let i = 0; i < 18; i++) { g.fillStyle = ['#f7b6c9', '#f9c9d6', '#f3a5bd'][i % 3]; g.beginPath(); g.arc(i * 18 + rnd() * 8, 250 + rnd() * 10, 18 + rnd() * 8, 0, 7); g.fill(); }
    // train
    g.fillStyle = '#f5f1e6'; g.fillRect(40, 268, 220, 34);
    g.fillStyle = '#ef8fae'; g.fillRect(40, 288, 220, 6);
    g.fillStyle = '#6f8fb0'; for (let x = 52; x < 250; x += 24) g.fillRect(x, 274, 16, 10);
    g.fillStyle = '#9cc27a'; g.fillRect(0, 302, w, 20);
    for (let i = 0; i < 40; i++) sakuraFlower(g, rnd() * w, rnd() * 150, 5 + rnd() * 8, ['#f7a9c0', '#fbd0dc'][i % 2]);
    R(g, '桜ヶ丘', 20, 30, w - 40, 70, { color: '#c0506e', stroke: { color: '#fff', width: 8 } });
    R(g, 'さくらまつり', 20, 100, w - 40, 56, { color: '#e0708f', stroke: { color: '#fff', width: 8 } });
    R(g, '4/1(土) → 4/16(日)', 20, 330, w - 40, 36, { color: '#3d4a70' });
    R(g, `${STATION.company}で行こう！ 春の1日乗車券 600円`, 12, 372, w - 24, 26, { color: '#555' });
    g.fillStyle = PINK; g.fillRect(0, h - 18, w, 18);
  });
  S.posterSafety = P.add(300, 424, (g, w, h) => {
    g.fillStyle = '#eaf4ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f63b5'; g.fillRect(0, 0, w, 96);
    R(g, 'ホームの安全', 10, 8, w - 20, 50, { color: '#fff' });
    R(g, 'みんなで守ろう', 10, 56, w - 20, 34, { color: '#dfe9ff' });
    // tactile + person pictogram
    g.fillStyle = '#f2c230'; g.fillRect(30, 270, w - 60, 26);
    g.fillStyle = '#9aa1a8'; g.fillRect(30, 296, w - 60, 40);
    g.fillStyle = '#3d4a70';
    g.beginPath(); g.arc(150, 150, 22, 0, 7); g.fill();
    g.fillRect(136, 176, 28, 60); g.fillRect(136, 232, 10, 36); g.fillRect(154, 232, 10, 36);
    g.strokeStyle = '#d8342c'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(200, 130); g.lineTo(250, 250); g.stroke();
    R(g, '黄色い点字ブロックの', 10, 344, w - 20, 30, { color: '#1f3160' });
    R(g, '内側でお待ちください', 10, 376, w - 20, 30, { color: '#1f3160' });
  });
  S.posterFest = P.add(300, 424, (g, w, h) => {
    const rnd = seeded(103);
    g.fillStyle = '#fff4e0'; g.fillRect(0, 0, w, h);
    // hanging lanterns
    g.strokeStyle = '#8a6446'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(w / 2, 90, w, 40); g.stroke();
    for (let i = 0; i < 6; i++) {
      const x = 25 + i * 50, y = 50 + Math.sin((i / 5) * Math.PI) * 32;
      g.fillStyle = i % 2 ? '#e8583a' : '#f6d25a';
      g.beginPath(); g.ellipse(x, y + 18, 16, 22, 0, 0, 7); g.fill();
      g.fillStyle = '#333'; g.fillRect(x - 8, y - 6, 16, 5); g.fillRect(x - 8, y + 38, 16, 5);
    }
    g.save(); g.translate(w / 2, 0);
    verticalText(g, '春祭り', 0, 118, 300, { font: FONTS.mincho, color: '#b8352c', maxSize: 90, stroke: { color: '#fff', width: 6 } });
    g.restore();
    R(g, '4月20日(土) 21日(日)', 10, 312, w - 20, 34, { color: '#3d3226' });
    R(g, '八幡神社 境内  ·  みこし・夜店', 10, 350, w - 20, 28, { color: '#6a5646' });
    R(g, '桜ヶ丘町内会', 10, 384, w - 20, 26, { color: '#8a7a66' });
    agePaper(g, w, h, rnd, 0.1, true);
  });
  S.posterHanami = P.add(300, 424, (g, w, h) => {
    const rnd = seeded(104);
    g.fillStyle = '#fffaf2'; g.fillRect(0, 0, w, h);
    R(g, 'おはなみマップ', 10, 10, w - 20, 50, { color: '#c0506e' });
    // hand-drawn river + path
    g.strokeStyle = '#8fb8d6'; g.lineWidth = 26; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-10, 120); g.bezierCurveTo(100, 90, 200, 160, w + 10, 110); g.stroke();
    g.strokeStyle = '#c9b89a'; g.lineWidth = 6; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(40, 390); g.bezierCurveTo(60, 300, 200, 260, 170, 160); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 26; i++) sakuraFlower(g, 10 + rnd() * (w - 20), 140 + rnd() * 30, 9);
    for (let i = 0; i < 8; i++) sakuraFlower(g, 60 + rnd() * 180, 220 + rnd() * 150, 8);
    const pin = (x, y, t) => { g.fillStyle = '#d8342c'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); R(g, t, x + 10, y - 14, 130, 26, { color: '#3d3226', align: 'left' }); };
    pin(160, 158, '桜並木の土手');
    pin(60, 360, '駅');
    pin(190, 250, 'さくら公園');
    pin(90, 290, '和菓子 さくら庵');
    R(g, '見ごろ: 4月上旬', 10, h - 40, w - 20, 30, { color: '#e0708f' });
    agePaper(g, w, h, rnd, 0.05, true);
  });
  S.posterSummer = P.add(300, 424, (g, w, h) => {
    const rnd = seeded(105);
    g.fillStyle = '#1f3160'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) { // fireworks
      const cx = 50 + rnd() * 200, cy = 60 + rnd() * 150, r = 30 + rnd() * 40;
      g.strokeStyle = ['#f6d25a', '#f58fae', '#8fe0ff', '#ffb070'][k];
      g.lineWidth = 3;
      for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.28; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
    }
    R(g, '夏祭り 花火大会', 10, 250, w - 20, 50, { color: '#fff' });
    R(g, '8月15日  桜川河川敷', 10, 306, w - 20, 34, { color: '#f6d25a' });
    R(g, '雨天順延', 10, 346, w - 20, 26, { color: '#c8d0e4' });
    // heavy fading: last year's poster
    g.fillStyle = 'rgba(246,238,220,0.45)'; g.fillRect(0, 0, w, h);
    agePaper(g, w, h, rnd, 0.2, true);
    // torn corner
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(w, h); g.lineTo(w - 60, h); g.lineTo(w - 30, h - 20); g.lineTo(w - 44, h - 48); g.lineTo(w, h - 70); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
  });
  const kidDrawing = (seed, kind, name) => Q.add(240, 176, (g, w, h) => {
    const rnd = seeded(seed);
    g.fillStyle = '#fffef8'; g.fillRect(0, 0, w, h);
    g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
    const wob = (x, y) => [x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 3];
    const crayon = (col, pts, fill) => {
      g.strokeStyle = col; g.fillStyle = col;
      g.beginPath(); g.moveTo(...wob(...pts[0])); for (const p of pts.slice(1)) g.lineTo(...wob(...p));
      if (fill) { g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1; }
      g.stroke();
    };
    // sun
    g.fillStyle = '#f6c342'; g.beginPath(); g.arc(w - 36, 32, 20, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) { const a = i * 0.785; crayon('#f6a142', [[w - 36 + Math.cos(a) * 26, 32 + Math.sin(a) * 26], [w - 36 + Math.cos(a) * 36, 32 + Math.sin(a) * 36]]); }
    if (kind === 'train') {
      crayon('#ef8fae', [[20, 100], [180, 100], [190, 140], [20, 140], [20, 100]], true);
      for (let x = 34; x < 170; x += 36) crayon('#6aa6d8', [[x, 108], [x + 22, 108], [x + 22, 124], [x, 124], [x, 108]], true);
      crayon('#555', [[10, 152], [220, 152]]);
      g.fillStyle = '#333'; g.beginPath(); g.arc(50, 144, 8, 0, 7); g.arc(150, 144, 8, 0, 7); g.fill();
    } else if (kind === 'tree') {
      crayon('#8a6446', [[110, 160], [112, 100], [100, 80]]);
      for (let i = 0; i < 14; i++) { g.fillStyle = ['#f7a9c0', '#f38fb0', '#fbd0dc'][i % 3]; g.beginPath(); g.arc(80 + rnd() * 70, 50 + rnd() * 50, 16, 0, 7); g.fill(); }
      crayon('#9cc27a', [[0, 162], [w, 162]]);
    } else {
      // family holding hands
      for (let i = 0; i < 3; i++) {
        const x = 50 + i * 60, s = i === 2 ? 0.7 : 1;
        g.fillStyle = '#fbe3d3'; g.beginPath(); g.arc(x, 160 - 90 * s, 14 * s, 0, 7); g.fill();
        crayon(['#3b7fd1', '#e0708f', '#f2c230'][i], [[x - 14 * s, 160 - 72 * s], [x + 14 * s, 160 - 72 * s], [x + 18 * s, 160 - 20 * s], [x - 18 * s, 160 - 20 * s]], true);
      }
      crayon('#333', [[64, 115], [96, 120]]);
    }
    R(g, name, 6, h - 30, w - 12, 24, { color: '#555', align: 'left' });
    paperEdge(g, w, h);
  });
  S.kid1 = kidDrawing(111, 'train', '2年 さくら でんしゃ だいすき');
  S.kid2 = kidDrawing(112, 'tree', '1年 はると さくらの木');
  S.kid3 = kidDrawing(113, 'family', '3年 ゆい おでかけ');

  S.mascot = Q.add(200, 200, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const c = w / 2;
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c, c + 6, 88, 0, 7); g.fill();
    g.fillStyle = '#f7b6c9'; g.beginPath(); g.arc(c, c + 14, 70, 0, 7); g.fill();
    // conductor cap
    g.fillStyle = '#26324f'; g.fillRect(c - 50, c - 70, 100, 34); g.fillRect(c - 62, c - 40, 124, 10);
    g.fillStyle = '#f2c230'; g.fillRect(c - 12, c - 64, 24, 16);
    // face
    g.fillStyle = '#3a2a30'; g.beginPath(); g.arc(c - 24, c + 8, 7, 0, 7); g.arc(c + 24, c + 8, 7, 0, 7); g.fill();
    g.fillStyle = '#f38fb0'; g.beginPath(); g.arc(c - 42, c + 26, 10, 0, 7); g.arc(c + 42, c + 26, 10, 0, 7); g.fill();
    g.strokeStyle = '#3a2a30'; g.lineWidth = 4; g.beginPath(); g.arc(c, c + 24, 12, 0.2, Math.PI - 0.2); g.stroke();
    R(g, 'はるかぜくん', 10, h - 40, w - 20, 34, { color: '#c0506e', stroke: { color: '#fff', width: 6 } });
  });

  S.dengon = Q.add(440, 280, (g, w, h) => {
    const rnd = seeded(121);
    g.fillStyle = '#8a6446'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f4a3c'; g.fillRect(14, 14, w - 28, h - 28);
    blotchesChalk(g, rnd, w, h);
    const chalk = (t, x, y, s, col = 'rgba(245,245,240,0.9)', rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); fitText(g, t, 0, 0, w, s, { font: FONTS.round, weight: 500, color: col, align: 'left' }); g.restore(); };
    chalk('伝言板', 30, 24, 40, 'rgba(250,230,160,0.9)');
    chalk('3時に 駅前の桜の下で まってる  ゆ', 36, 80, 30, 'rgba(245,245,240,0.9)', -0.02);
    chalk('本、ありがとう！ また貸してね  ハル', 40, 130, 28, 'rgba(250,200,215,0.9)', 0.015);
    chalk('4/9  部活 先に行きます  —K', 36, 182, 28, 'rgba(200,230,250,0.85)', -0.01);
    g.fillStyle = 'rgba(245,245,240,0.8)'; g.fillRect(w - 90, h - 26, 36, 8);
    g.fillStyle = 'rgba(250,200,215,0.8)'; g.fillRect(w - 50, h - 26, 26, 8);
  });
  function blotchesChalk(g, rnd, w, h) {
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`;
      g.beginPath(); g.ellipse(20 + rnd() * (w - 40), 20 + rnd() * (h - 40), 20 + rnd() * 60, 6 + rnd() * 14, rnd(), 0, 7); g.fill();
    }
  }

  S.cork = Q.add(512, 320, (g, w, h) => {
    const rnd = seeded(131);
    g.fillStyle = '#c79c68'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,80,40' : '230,200,150'},${0.25 + rnd() * 0.3})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 2, 2 + rnd() * 2); }
    g.fillStyle = '#fff'; g.fillRect(12, 8, 130, 36);
    R(g, 'お知らせ', 12, 10, 130, 32, { color: NAVY });
  });

  const ad = (seed, draw) => Q.add(600, 206, scaled(640, 220, (g, w, h) => { draw(g, w, h, seeded(seed)); g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); }));
  S.adDental = ad(141, (g, w, h) => {
    g.fillStyle = '#e9f6f3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5fbfa8'; g.fillRect(0, 0, 24, h);
    R(g, 'さくら歯科クリニック', 50, 20, w - 80, 70, { color: '#2f7f6c', align: 'left' });
    R(g, '駅から徒歩3分 · 土曜も診療', 50, 100, w - 80, 44, { color: '#555', align: 'left' });
    R(g, '☎ 0120-80-4618', 50, 152, w - 80, 44, { color: '#2f7f6c', align: 'left' });
  });
  S.adJuku = ad(142, (g, w, h) => {
    g.fillStyle = '#fff6d8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f29a3a'; g.beginPath(); g.arc(w - 90, h / 2, 70, 0, 7); g.fill();
    R(g, '合格!', w - 160, h / 2 - 30, 140, 60, { color: '#fff' });
    R(g, '個別指導 あおば学習塾', 30, 24, w - 220, 70, { color: '#3b5fa8', align: 'left' });
    R(g, '春の無料体験 受付中', 30, 110, w - 220, 50, { color: '#d8342c', align: 'left' });
    R(g, '桜ヶ丘駅前 2F', 30, 164, w - 220, 36, { color: '#555', align: 'left' });
  });
  S.adEstate = ad(143, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a6e9a'; g.fillRect(0, h - 60, w, 60);
    g.fillStyle = '#e0708f';
    g.beginPath(); g.moveTo(40, 110); g.lineTo(100, 50); g.lineTo(160, 110); g.closePath(); g.fill();
    g.fillRect(55, 110, 90, 60);
    R(g, 'はるかぜ不動産', 190, 30, w - 220, 70, { color: '#4a6e9a', align: 'left' });
    R(g, '桜ヶ丘で、春からの新生活を。', 190, 104, w - 220, 44, { color: '#555', align: 'left' });
    R(g, '賃貸・売買  0120-22-3939', 20, h - 52, w - 40, 44, { color: '#fff' });
  });
  S.adOnsen = ad(144, (g, w, h) => {
    g.fillStyle = '#fdeee6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8583a'; g.lineWidth = 8;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(60 + i * 30, 150); g.bezierCurveTo(40 + i * 30, 110, 80 + i * 30, 90, 60 + i * 30, 50); g.stroke(); }
    g.fillStyle = '#e8583a'; g.beginPath(); g.ellipse(90, 170, 70, 18, 0, 0, 7); g.fill();
    R(g, '霞ヶ峰温泉 ゆけむりの宿', 190, 30, w - 220, 64, { color: '#9a3a2a', align: 'left' });
    R(g, `${STATION.line} 終点 ${LINE_STATIONS[11].name}駅から送迎バス`, 190, 110, w - 220, 40, { color: '#555', align: 'left' });
    R(g, '春のお得プラン', 190, 160, w - 220, 40, { color: '#e0708f', align: 'left' });
  });

}
