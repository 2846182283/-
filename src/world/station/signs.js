/**
 * Railway signage and labels of 桜ヶ丘駅, painted into the three station
 * atlases (posters / maps come from posters.js).  makeSigns(kit) returns a
 * dictionary of atlas regions and packs the atlases.
 *
 * Style notes: railway signage is crisp (white / navy / line-colour pink,
 * yellow for exits); posters are softer and hand-drawn; notices are aged a
 * little (faded colours, tape, torn corners) for environmental storytelling.
 * All names are fictional (春風電鉄 / 春風線 and the HK line stations).
 */
import { FONTS, fitText, verticalText, seeded } from '../../core/canvasTex.js';
import { STATION } from '../../core/layout.js';
import { NAVY, PINK, PINK_DEEP, LINE_STATIONS, scaled, T, R, rrect, arrow, badge, sakuraFlower, agePaper, noSmokingIcon } from './paint.js';
import { makePosters } from './posters.js';

export { NAVY, PINK, PINK_DEEP, LINE_STATIONS };

export function makeSigns(kit) {
  const A = kit.atlas, P = kit.atlas2, Q = kit.atlas3;
  const S = {};
  const west = STATION.west, east = STATION.east;

  // ======================= station identity =======================
  // entrance name board (6.2 m x 0.9 m)
  S.entranceBoard = A.add(1680, 244, (g, w, h) => {
    g.fillStyle = '#fbf8f1';
    g.fillRect(0, 0, w, h);
    g.fillStyle = PINK;
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = NAVY;
    g.fillRect(0, 0, w, 10);
    // company mark (sakura in a pink circle) + name
    g.fillStyle = PINK;
    g.beginPath(); g.arc(120, 112, 70, 0, 7); g.fill();
    sakuraFlower(g, 120, 112, 70, '#ffffff', '#f7d56a');
    T(g, STATION.company, 205, 58, 260, 58, { color: NAVY, align: 'left' });
    T(g, 'HARUKAZE RAILWAY', 205, 122, 260, 34, { color: '#6b7389', align: 'left', font: FONTS.latin });
    // main name
    fitText(g, `${STATION.name}駅`, 500, 12, 760, 170, { font: FONTS.mincho, weight: 700, color: NAVY, letterSpacing: 30 });
    T(g, `${STATION.kana}  ·  ${STATION.romaji.toUpperCase()} STATION`, 460, 176, 840, 44, { color: '#58607a', letterSpacing: 3 });
    // station number badge on the right
    badge(g, 1400, 40, 140, STATION.code);
    T(g, STATION.line, 1300, 190, 340, 30, { color: '#ffffff' });
  });

  /** 駅名標: classic board.  leftSt / rightSt = stations shown with arrows. */
  const ekimeihyo = (leftSt, rightSt) => P.add(860, 400, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const band = 108;
    // station number badge + line name
    badge(g, 24, 22, 96, STATION.code);
    T(g, STATION.line, 24, 124, 96, 28, { color: '#6b7389' });
    T(g, STATION.kana, 140, 18, w - 280, 60, { color: NAVY, letterSpacing: 10 });
    fitText(g, STATION.name, 150, 70, w - 300, 150, { font: FONTS.gothic, weight: 700, color: NAVY, letterSpacing: 22 });
    T(g, STATION.romaji, 140, 222, w - 280, 50, { color: '#3d4a70', font: FONTS.latin });
    // bottom band in the line colour, with previous / next
    g.fillStyle = PINK;
    g.fillRect(0, h - band, w, band);
    g.fillStyle = '#ffffff';
    g.fillRect(w / 2 - 3, h - band + 14, 6, band - 28);
    // left
    arrow(g, 44, h - band / 2, 50, 'l', NAVY);
    T(g, leftSt.name, 80, h - band + 10, 200, 52, { color: NAVY, align: 'left' });
    T(g, leftSt.kana, 80, h - band + 60, 180, 24, { color: NAVY, align: 'left' });
    T(g, leftSt.romaji, 80, h - band + 82, 180, 22, { color: NAVY, align: 'left', font: FONTS.latin });
    badge(g, w / 2 - 88, h - band + 22, 64, leftSt.code, { border: '#ffffff' });
    // right
    arrow(g, w - 44, h - band / 2, 50, 'r', NAVY);
    T(g, rightSt.name, w - 280, h - band + 10, 200, 52, { color: NAVY, align: 'right' });
    T(g, rightSt.kana, w - 260, h - band + 60, 180, 24, { color: NAVY, align: 'right' });
    T(g, rightSt.romaji, w - 260, h - band + 82, 180, 22, { color: NAVY, align: 'right', font: FONTS.latin });
    badge(g, w / 2 + 24, h - band + 22, 64, rightSt.code, { border: '#ffffff' });
    // city name, small
    T(g, '桜ヶ丘市', w - 150, 22, 130, 30, { color: '#8a90a2' });
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
  });
  const WST = { ...west }, EST = { ...east };
  S.ekiP1 = ekimeihyo(WST, EST); // on P1 facing north: west is on the left
  S.ekiP2 = ekimeihyo(EST, WST); // on P2 facing south: east is on the left

  S.hangName = Q.add(900, 150, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = PINK; g.fillRect(0, h - 18, w, 18);
    badge(g, 18, 20, 94, STATION.code);
    fitText(g, STATION.name, 140, 10, 360, 110, { font: FONTS.gothic, weight: 700, color: NAVY, letterSpacing: 14 });
    T(g, STATION.kana, 520, 22, 360, 48, { color: NAVY, align: 'left' });
    T(g, STATION.romaji, 520, 74, 360, 46, { color: '#3d4a70', align: 'left', font: FONTS.latin });
  });

  // ======================= directions / numbers =======================
  const dirSign = (num, dest, destR) => Q.add(820, 150, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    rrect(g, 16, 16, h - 32, h - 32, 14, PINK);
    T(g, String(num), 16, 22, h - 32, h - 44, { color: '#ffffff', font: FONTS.latin });
    T(g, '番線', h + 2, 22, 110, 62, { color: '#ffffff', align: 'left' });
    T(g, `Track ${num}`, h + 2, 88, 110, 40, { color: '#c8d0e4', align: 'left', font: FONTS.latin });
    T(g, `${dest} 方面`, h + 130, 12, w - h - 150, 84, { color: '#ffffff', align: 'left' });
    T(g, `for ${destR}`, h + 130, 96, w - h - 150, 40, { color: '#c8d0e4', align: 'left', font: FONTS.latin });
  });
  S.dir1 = dirSign(1, `${west.name}・${LINE_STATIONS[0].name}`, `${west.romaji} / ${LINE_STATIONS[0].romaji}`);
  S.dir2 = dirSign(2, `${east.name}・${LINE_STATIONS[11].name}`, `${east.romaji} / ${LINE_STATIONS[11].romaji}`);

  const exitSign = (dir, sub) => Q.add(640, 150, (g, w, h) => {
    g.fillStyle = '#f4c72d'; g.fillRect(0, 0, w, h);
    const ax = dir === 'r' ? w - 70 : 70;
    arrow(g, ax, h / 2, 96, dir, '#1e1e22');
    const x0 = dir === 'r' ? 30 : 140;
    T(g, '出口', x0, 12, 200, 84, { color: '#1e1e22', align: 'left', letterSpacing: 8 });
    T(g, 'Exit', x0 + 210, 30, 150, 60, { color: '#1e1e22', align: 'left', font: FONTS.latin });
    T(g, sub, x0, 100, 440, 38, { color: '#1e1e22', align: 'left' });
  });
  S.exitUp = exitSign('u', '改札口・駅前広場');
  S.exitCrossUp = exitSign('u', '構内踏切を渡って改札口へ');

  const platNum = (n) => A.add(256, 300, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    rrect(g, 28, 22, w - 56, w - 56, 26, '#ffffff');
    T(g, String(n), 28, 30, w - 56, w - 70, { color: NAVY, font: FONTS.latin });
    T(g, `${n}番線 のりば`, 10, w - 20, w - 20, 44, { color: '#ffffff' });
    g.fillStyle = PINK; g.fillRect(0, h - 22, w, 22);
  });
  S.num1 = platNum(1);
  S.num2 = platNum(2);

  // stairs overhead: 1番線 ↑ 2番線 ←
  S.stairSign = Q.add(900, 150, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    arrow(g, 70, h / 2, 90, 'u', '#ffffff');
    rrect(g, 130, 24, 100, 100, 12, PINK);
    T(g, '1', 130, 30, 100, 90, { color: '#fff', font: FONTS.latin });
    T(g, `番線 ${west.name}方面`, 240, 20, 300, 64, { color: '#fff', align: 'left' });
    T(g, `Track 1  for ${west.romaji}`, 240, 88, 300, 38, { color: '#c8d0e4', align: 'left', font: FONTS.latin });
    rrect(g, 560, 24, 100, 100, 12, PINK);
    T(g, '2', 560, 30, 100, 90, { color: '#fff', font: FONTS.latin });
    T(g, `番線 ${east.name}方面`, 670, 20, 220, 64, { color: '#fff', align: 'left' });
    T(g, '構内踏切経由', 670, 88, 220, 38, { color: '#c8d0e4', align: 'left' });
  });

  S.gateSign = Q.add(700, 140, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    T(g, '改札口', 30, 14, 260, 80, { color: '#fff', align: 'left', letterSpacing: 10 });
    T(g, 'Ticket Gates', 30, 94, 260, 36, { color: '#c8d0e4', align: 'left', font: FONTS.latin });
    arrow(g, w - 80, h / 2, 90, 'u', '#fff');
    T(g, 'のりば  Platforms', 320, 40, 280, 60, { color: '#fff' });
  });

  // ======================= departure LED boards (unlit) =======================
  const led = (rows, head) => Q.add(680, 180, scaled(760, 200, (g, w, h) => {
    g.fillStyle = '#15161a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2c33'; g.fillRect(0, 0, w, 44);
    T(g, head, 16, 4, w - 32, 36, { color: '#ffffff', align: 'left' });
    rows.forEach((r, i) => {
      const y = 50 + i * 72;
      T(g, r[0], 16, y, 90, 62, { color: '#6fe08a' });
      T(g, r[1], 120, y, 110, 62, { color: '#ffb84a', font: FONTS.latin });
      T(g, r[2], 250, y, 250, 62, { color: '#ffb84a', align: 'left' });
      T(g, r[3], 520, y, 100, 62, { color: '#8fd0ff' });
      T(g, r[4], 630, y, 120, 62, { color: '#ff9a9a' });
    });
    // LED dot mask
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 44; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 4) g.fillRect(x, 44, 1, h - 44);
  }));
  S.led1 = led([['普通', '16:08', `${west.name}`, '3両', '1番線'], ['普通', '16:23', `${LINE_STATIONS[0].name}`, '3両', '1番線']], `  1番線  ${west.name}・${LINE_STATIONS[0].name}方面   Track 1`);
  S.led2 = led([['普通', '16:12', `${east.name}`, '3両', '2番線'], ['快速', '16:27', `${LINE_STATIONS[11].name}`, '3両', '2番線']], `  2番線  ${east.name}・${LINE_STATIONS[11].name}方面   Track 2`);
  S.ledBoth = led([['普通', '16:08', west.name, '3両', '1番線'], ['普通', '16:12', east.name, '3両', '2番線']], '  発車案内   Departures');

  // ======================= clock face =======================
  S.clock = A.add(256, 256, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = '#fbfbf8';
    g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.fill();
    g.strokeStyle = '#3a3f4c'; g.lineWidth = 8;
    g.beginPath(); g.arc(c, c, c - 6, 0, 7); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      g.strokeStyle = '#2b2f3a';
      g.lineWidth = big ? 6 : 2;
      const r0 = c - 16, r1 = big ? c - 36 : c - 24;
      g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
    }
    g.font = `700 26px ${FONTS.latin}`;
    g.fillStyle = '#2b2f3a';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillText(String(i), c + Math.sin(a) * (c - 56), c - Math.cos(a) * (c - 56) + 2);
    }
    T(g, STATION.company, c - 50, c + 30, 100, 20, { color: '#9aa0ae' });
  });

  makePosters(kit, S);

  // ======================= concourse equipment labels =======================
  S.tvmScreen = A.add(420, 320, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#eaf4ff'); gr.addColorStop(1, '#cfe3f6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f63b5'; g.fillRect(0, 0, w, 44);
    T(g, 'ご希望のボタンを押してください', 10, 6, w - 110, 32, { color: '#fff', align: 'left' });
    rrect(g, w - 96, 7, 86, 30, 6, '#fff');
    T(g, 'English', w - 96, 9, 86, 26, { color: '#2f63b5', font: FONTS.latin });
    const btn = (x, y, bw, bh, col, t, t2) => {
      rrect(g, x + 3, y + 4, bw, bh, 12, 'rgba(0,0,0,0.15)');
      rrect(g, x, y, bw, bh, 12, col);
      T(g, t, x, y + 8, bw, bh * 0.5, { color: '#fff' });
      if (t2) T(g, t2, x, y + bh * 0.58, bw, bh * 0.3, { color: 'rgba(255,255,255,0.9)', font: FONTS.latin });
    };
    btn(14, 60, 124, 110, PINK_DEEP, 'きっぷ', 'Tickets');
    btn(148, 60, 124, 110, '#3b7fd1', 'チャージ', 'IC Charge');
    btn(282, 60, 124, 110, '#3c9a62', '定期券', 'Pass');
    // fare buttons
    const fares = [150, 180, 210, 240, 280, 310];
    fares.forEach((f, i) => {
      const x = 14 + (i % 3) * 134, y = 184 + Math.floor(i / 3) * 52;
      rrect(g, x, y, 124, 44, 8, '#ffffff', '#9fb6d8', 2);
      T(g, `${f}円`, x, y + 6, 124, 32, { color: NAVY, font: FONTS.latin });
    });
    T(g, '路線図から選ぶ  ▶', 14, h - 26, w - 28, 22, { color: '#2f63b5', align: 'right' });
  });

  S.tvmHead = A.add(420, 90, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    T(g, 'きっぷ・チャージ', 16, 8, w - 150, 50, { color: '#fff', align: 'left' });
    T(g, 'Tickets / IC Charge', 16, 58, w - 150, 26, { color: '#c8d0e4', align: 'left', font: FONTS.latin });
    rrect(g, w - 120, 16, 104, 58, 10, PINK);
    T(g, 'IC', w - 120, 20, 104, 50, { color: '#fff', font: FONTS.latin });
  });

  S.tvmPanel = A.add(300, 420, (g, w, h) => {
    g.fillStyle = '#dfe8ef'; g.fillRect(0, 0, w, h);
    const lab = (t, x, y, bw, col = '#3d4a70') => T(g, t, x, y, bw, 26, { color: col });
    // coin slot
    rrect(g, 20, 20, 120, 70, 10, '#cfd9e2', '#9aa7b4', 2);
    g.fillStyle = '#2c3037'; g.fillRect(40, 46, 80, 10);
    lab('硬貨 Coins', 20, 94, 120);
    // note slot
    rrect(g, 160, 20, 120, 70, 10, '#cfd9e2', '#9aa7b4', 2);
    g.fillStyle = '#2c3037'; g.fillRect(172, 50, 96, 8);
    lab('紙幣 Notes', 160, 94, 120);
    // IC slot
    rrect(g, 20, 140, 260, 60, 10, '#cfd9e2', '#9aa7b4', 2);
    g.fillStyle = '#2c3037'; g.fillRect(100, 164, 100, 8);
    rrect(g, 36, 152, 40, 36, 6, PINK);
    T(g, 'IC', 36, 156, 40, 28, { color: '#fff', font: FONTS.latin });
    lab('ICカード・領収書', 20, 204, 260);
    // ticket out + change tray
    rrect(g, 20, 250, 260, 70, 10, '#2c3037');
    rrect(g, 30, 262, 240, 46, 6, '#454b55');
    lab('きっぷ・おつり Tickets / Change', 10, 326, 280);
    // bottom tray
    rrect(g, 60, 360, 180, 48, 8, '#9aa7b4');
    rrect(g, 70, 368, 160, 30, 6, '#3a3f48');
  });

  S.seisanHead = A.add(420, 90, (g, w, h) => {
    g.fillStyle = '#2e6b52'; g.fillRect(0, 0, w, h);
    T(g, 'のりこし精算機', 16, 8, w - 32, 50, { color: '#fff', align: 'left' });
    T(g, 'Fare Adjustment', 16, 58, w - 32, 26, { color: '#d6efe2', align: 'left', font: FONTS.latin });
  });

  S.icSign = A.add(240, 240, (g, w, h) => {
    rrect(g, 0, 0, w, h, 26, PINK);
    rrect(g, 30, 60, 120, 80, 10, '#fff');
    T(g, 'IC', 30, 70, 120, 60, { color: PINK_DEEP, font: FONTS.latin });
    g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round';
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(150, 100, 20 + i * 18, -0.7, 0.7); g.stroke(); }
    T(g, 'ICカード', 10, 160, w - 20, 40, { color: '#fff' });
    T(g, 'タッチしてください', 10, 200, w - 20, 30, { color: '#fff' });
  });
  S.gateIn = A.add(160, 80, (g, w, h) => {
    g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
    arrow(g, w / 2, h / 2, 60, 'u', '#4be07a');
    g.fillStyle = '#4aa6ff';
    T(g, 'IC', 4, 4, 40, 30, { color: '#4aa6ff', font: FONTS.latin });
  });
  S.gateNo = A.add(160, 80, (g, w, h) => {
    g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff4a4a'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(w / 2 - 22, h / 2 - 22); g.lineTo(w / 2 + 22, h / 2 + 22); g.moveTo(w / 2 + 22, h / 2 - 22); g.lineTo(w / 2 - 22, h / 2 + 22); g.stroke();
  });
  S.icPad = A.add(96, 96, (g, w, h) => {
    rrect(g, 0, 0, w, h, 16, '#58b4f0');
    g.strokeStyle = '#e8f6ff'; g.lineWidth = 5;
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(w / 2 - 14, h / 2, 8 + i * 10, -0.8, 0.8); g.stroke(); }
    T(g, 'IC', 8, 8, 34, 24, { color: '#fff', font: FONTS.latin });
  });

  S.staffWin = Q.add(560, 120, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    T(g, '駅 窓口', 20, 10, 300, 60, { color: '#ffd9e4', align: 'left', letterSpacing: 8 });
    T(g, 'きっぷうりば・精算・お問い合わせ', 20, 72, 400, 36, { color: '#fff', align: 'left' });
    T(g, 'Ticket Office', w - 200, 30, 180, 50, { color: '#c8d0e4', font: FONTS.latin });
  });
  S.officeDoor = A.add(300, 90, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    T(g, '駅事務室', 10, 6, w - 20, 50, { color: NAVY });
    T(g, '関係者以外立入禁止', 10, 56, w - 20, 28, { color: '#d8342c' });
    g.strokeStyle = NAVY; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
  S.boothSign = A.add(320, 80, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    T(g, '係員窓口 Staff', 10, 10, w - 20, 60, { color: '#fff' });
  });

  S.noSmoke = A.add(280, 360, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    noSmokingIcon(g, w / 2, 130, 100);
    T(g, '禁煙', 10, 240, w - 20, 60, { color: '#d8342c', letterSpacing: 16 });
    T(g, '駅構内は全面禁煙です', 10, 298, w - 20, 30, { color: '#333' });
    T(g, 'No Smoking', 10, 326, w - 20, 28, { color: '#666', font: FONTS.latin });
    g.strokeStyle = '#ccc'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
  S.noSmokeSmall = A.sub(S.noSmoke, 20, 20, 240, 220);

  S.fireBox = A.add(180, 260, (g, w, h) => {
    g.fillStyle = '#d33a31'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b52f28'; g.fillRect(0, h - 30, w, 30);
    g.fillStyle = '#fff';
    verticalText(g, '消火器', w / 2, 30, h - 60, { font: FONTS.gothic, color: '#fff', maxSize: 60 });
    g.strokeStyle = '#8a221c'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
  });
  S.bousai = A.add(360, 120, (g, w, h) => {
    g.fillStyle = '#f07a2c'; g.fillRect(0, 0, w, h);
    T(g, '防災用品', 14, 8, w - 28, 62, { color: '#fff', letterSpacing: 10 });
    T(g, '非常用 救急箱・担架・AED', 14, 74, w - 28, 34, { color: '#fff' });
  });
  S.aed = A.add(160, 160, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2ea44f'; g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(w / 2, h * 0.72); g.bezierCurveTo(w * 0.1, h * 0.45, w * 0.3, h * 0.12, w / 2, h * 0.32); g.bezierCurveTo(w * 0.7, h * 0.12, w * 0.9, h * 0.45, w / 2, h * 0.72); g.fill();
    g.fillStyle = '#2ea44f';
    g.beginPath(); g.moveTo(w * 0.52, h * 0.3); g.lineTo(w * 0.42, h * 0.5); g.lineTo(w * 0.52, h * 0.5); g.lineTo(w * 0.46, h * 0.66); g.lineTo(w * 0.6, h * 0.44); g.lineTo(w * 0.5, h * 0.44); g.closePath(); g.fill();
    T(g, 'AED', 8, h - 42, w - 16, 30, { color: '#fff', font: FONTS.latin });
  });

  S.umbrella = A.add(320, 200, (g, w, h) => {
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    g.fillStyle = PINK; g.fillRect(0, 0, w, 50);
    T(g, '置き傘  ご自由にどうぞ', 10, 6, w - 20, 40, { color: '#fff' });
    // umbrella pictogram
    g.fillStyle = '#3b7fd1';
    g.beginPath(); g.arc(70, 130, 44, Math.PI, 0); g.fill();
    g.strokeStyle = '#3b7fd1'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(70, 130); g.lineTo(70, 175); g.arc(60, 175, 10, 0, Math.PI); g.stroke();
    R(g, '雨の日にお使いください。', 125, 70, 185, 34, { color: '#444', align: 'left' });
    R(g, '使ったら返してね', 125, 108, 185, 34, { color: '#444', align: 'left' });
    R(g, '桜ヶ丘駅・駅前商店会', 125, 150, 185, 28, { color: '#888', align: 'left' });
  });

  const binLabel = (t, col, sub) => A.add(200, 110, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    T(g, t, 6, 8, w - 12, 60, { color: '#fff' });
    T(g, sub, 6, 70, w - 12, 32, { color: 'rgba(255,255,255,0.9)', font: FONTS.latin });
  });
  S.binCan = binLabel('かん・びん', '#3b7fd1', 'Cans & Bottles');
  S.binPet = binLabel('ペットボトル', '#2ea36a', 'PET Bottles');
  S.binPaper = binLabel('新聞・雑誌', '#e89a2c', 'Paper');
  S.binBurn = binLabel('もえるごみ', '#d8484a', 'Burnable');

  S.stampSign = A.add(420, 200, (g, w, h) => {
    g.fillStyle = '#fff7f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = PINK; g.fillRect(0, 0, 16, h);
    R(g, '記念スタンプ', 30, 10, w - 50, 80, { color: '#c0506e', letterSpacing: 6 });
    R(g, '桜ヶ丘駅へようこそ！ ご自由に押してね', 30, 96, w - 50, 36, { color: '#555' });
    R(g, 'Station Stamp  ·  Free', 30, 140, w - 50, 36, { color: '#888', font: FONTS.latin });
    for (let i = 0; i < 4; i++) sakuraFlower(g, w - 30 - i * 26, h - 18, 11);
  });
  S.stampPrint = A.add(160, 160, (g, w, h) => {
    g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h);
    const c = w / 2;
    g.strokeStyle = '#c24a6a'; g.lineWidth = 6;
    g.beginPath(); g.arc(c, c, 66, 0, 7); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(c, c, 58, 0, 7); g.stroke();
    g.fillStyle = '#c24a6a';
    // tiny station silhouette
    g.fillRect(c - 36, c + 4, 72, 22);
    g.beginPath(); g.moveTo(c - 44, c + 6); g.lineTo(c, c - 18); g.lineTo(c + 44, c + 6); g.closePath(); g.fill();
    sakuraFlower(g, c + 30, c - 26, 14, '#c24a6a', '#fbf6ea');
    T(g, '桜ヶ丘駅', c - 50, c + 30, 100, 26, { color: '#c24a6a' });
  });

  S.lostFound = P.add(300, 420, (g, w, h) => {
    const rnd = seeded(5);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3b7fd1'; g.fillRect(0, 0, w, 70);
    T(g, 'お忘れ物', 10, 8, w - 20, 56, { color: '#fff', letterSpacing: 6 });
    T(g, 'Lost & Found', 10, 76, w - 20, 34, { color: '#3b7fd1', font: FONTS.latin });
    // icons
    const icon = (x, y, draw) => { rrect(g, x, y, 80, 80, 12, '#eaf2fb'); draw(x + 40, y + 40); };
    icon(20, 124, (cx, cy) => { g.fillStyle = '#3b7fd1'; g.beginPath(); g.arc(cx, cy, 26, Math.PI, 0); g.fill(); g.fillRect(cx - 2, cy, 4, 26); });
    icon(110, 124, (cx, cy) => { g.fillStyle = '#e89a2c'; g.fillRect(cx - 24, cy - 14, 48, 36); g.fillRect(cx - 10, cy - 24, 20, 12); });
    icon(200, 124, (cx, cy) => { g.fillStyle = '#6b7389'; g.fillRect(cx - 14, cy - 22, 28, 44); g.fillStyle = '#cfe3f6'; g.fillRect(cx - 10, cy - 16, 20, 28); });
    R(g, '車内・駅構内での', 16, 222, w - 32, 36, { color: '#333' });
    R(g, 'お忘れ物・落とし物は', 16, 258, w - 32, 36, { color: '#333' });
    R(g, '駅係員までお問い合わせください', 16, 294, w - 32, 32, { color: '#333' });
    g.fillStyle = '#26324f'; g.fillRect(0, h - 70, w, 70);
    T(g, `${STATION.company} お客さまセンター`, 10, h - 64, w - 20, 28, { color: '#fff' });
    T(g, '☎ 0120-00-4152', 10, h - 34, w - 20, 28, { color: '#fff', font: FONTS.latin });
    agePaper(g, w, h, rnd, 0.06, false);
  });

  // ======================= warnings =======================
  S.noEntry = P.add(360, 460, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8342c'; g.fillRect(0, 0, w, 120);
    T(g, '危険', 10, 10, w - 20, 100, { color: '#fff', letterSpacing: 30 });
    verticalText(g, '立入禁止', w * 0.3, 140, h - 20, { font: FONTS.gothic, color: '#d8342c', maxSize: 90 });
    T(g, '関係者以外', w * 0.52, 150, w * 0.44, 50, { color: '#333' });
    T(g, 'の立入りを', w * 0.52, 200, w * 0.44, 50, { color: '#333' });
    T(g, '禁じます', w * 0.52, 250, w * 0.44, 50, { color: '#333' });
    T(g, 'No Entry', w * 0.52, 330, w * 0.44, 40, { color: '#d8342c', font: FONTS.latin });
    T(g, STATION.company, w * 0.52, 400, w * 0.44, 30, { color: '#888' });
    g.strokeStyle = '#d8342c'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
  S.crossNotice = P.add(620, 380, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    // yellow-black hazard stripe header
    g.save(); g.beginPath(); g.rect(0, 0, w, 40); g.clip();
    for (let x = -40; x < w + 40; x += 40) { g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 0); g.lineTo(x + 40, 40); g.lineTo(x + 20, 40); g.fill(); }
    g.fillStyle = 'rgba(30,30,34,1)'; g.globalCompositeOperation = 'destination-over'; g.fillRect(0, 0, w, 40); g.restore();
    T(g, 'この踏切は駅構内の通路です', 20, 52, w - 40, 70, { color: '#1e1e22' });
    rrect(g, 20, 134, w - 40, 110, 12, '#d8342c');
    T(g, '列車に注意', 30, 142, w - 60, 94, { color: '#fff', letterSpacing: 14 });
    T(g, '左右の安全を確かめてお渡りください', 20, 256, w - 40, 50, { color: '#1e1e22' });
    T(g, 'Watch for trains. Look both ways before crossing.', 20, 312, w - 40, 36, { color: '#555', font: FONTS.latin });
    T(g, `${STATION.name}駅長`, w - 220, h - 36, 200, 28, { color: '#888', align: 'right' });
  });
  S.tomare = A.add(300, 120, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    T(g, 'とまれ', 0, 0, w, h, { color: '#ffffff', letterSpacing: 20 });
  });
  S.ashimoto = A.add(360, 100, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    T(g, '足元注意', 0, 0, w, h, { color: '#f2c230', letterSpacing: 16 });
  });
  S.edgeWarn = A.add(560, 140, (g, w, h) => {
    g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e1e22';
    g.beginPath(); g.moveTo(70, 20); g.lineTo(122, 112); g.lineTo(18, 112); g.closePath(); g.fill();
    g.fillStyle = '#f2c230'; g.fillRect(66, 50, 8, 36); g.fillRect(66, 92, 8, 8);
    T(g, 'ホームの端にご注意ください', 140, 14, w - 160, 64, { color: '#1e1e22', align: 'left' });
    T(g, 'Mind the platform edge', 140, 82, w - 160, 40, { color: '#1e1e22', align: 'left', font: FONTS.latin });
  });
  S.stopMark = A.add(200, 250, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1e1e22'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
    T(g, '3', 20, 20, w - 40, 160, { color: '#1e1e22', font: FONTS.latin });
    T(g, '両', 20, 176, w - 40, 56, { color: '#1e1e22' });
  });
  S.depIndicator = A.add(128, 128, (g, w, h) => {
    g.fillStyle = '#1b1c20'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f6f6f0'; g.lineWidth = 12;
    g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 7); g.stroke();
  });

  // ======================= floor decals =======================
  // door position marks: car c, door d  (白い乗車位置 + 号車番号)
  S.doorMark = [];
  for (let c = 1; c <= 3; c++) {
    for (let d = 1; d <= 3; d++) {
      S.doorMark.push(A.add(288, 150, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(250,250,246,0.95)';
        // two chevron lanes pointing to the track (top of the texture = track side)
        for (const x of [20, w - 88]) {
          g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 34, 12); g.lineTo(x + 68, 70); g.lineTo(x + 52, 70); g.lineTo(x + 34, 40); g.lineTo(x + 16, 70); g.closePath(); g.fill();
          g.fillRect(x + 8, 84, 52, 10);
          g.fillRect(x + 8, 104, 52, 10);
        }
        rrect(g, w / 2 - 48, 30, 96, 94, 10, PINK);
        T(g, `${c}号車`, w / 2 - 46, 36, 92, 36, { color: '#fff' });
        T(g, String(d), w / 2 - 46, 70, 92, 52, { color: '#fff', font: FONTS.latin });
      }));
    }
  }
  S.stairArrowUp = A.add(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    arrow(g, 60, h / 2, 90, 'u', 'rgba(250,250,246,0.95)');
    T(g, 'のぼり', 110, 20, 140, 88, { color: 'rgba(250,250,246,0.95)', align: 'left' });
  });
  S.petals = A.add(256, 128, (g, w, h) => {
    const rnd = seeded(91);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = h * 0.3 + rnd() * h * 0.7;
      g.fillStyle = rnd() < 0.25 ? 'rgba(170,150,130,0.9)' : ['#f8c6d3', '#f5b3c6', '#fbe0e7', '#eeaabd'][Math.floor(rnd() * 4)];
      g.save(); g.translate(x, y); g.rotate(rnd() * 6.3);
      g.beginPath(); g.ellipse(0, 0, 4 + rnd() * 3, 2.5 + rnd() * 2, 0, 0, 7); g.fill();
      g.restore();
    }
    // dust / grit
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(150,140,130,0.8)'; g.fillRect(rnd() * w, h * 0.5 + rnd() * h * 0.5, 2, 2); }
  });

  S.logo = A.add(200, 200, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = PINK; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill();
    sakuraFlower(g, w / 2, h / 2, w * 0.42, '#ffffff', '#f6d25a');
  });

  S.kippu = A.add(480, 110, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    T(g, 'きっぷうりば', 20, 8, w - 150, 60, { color: '#fff', align: 'left', letterSpacing: 6 });
    T(g, 'Tickets', 20, 68, w - 150, 34, { color: '#c8d0e4', align: 'left', font: FONTS.latin });
    arrow(g, w - 60, h / 2, 70, 'u', '#fff');
  });

  // のぼり flag for the spring festival (vertical)
  S.nobori = Q.add(144, 520, scaled(170, 620, (g, w, h) => {
    g.fillStyle = '#f7a9c0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e0708f'; g.fillRect(0, 0, w, 56); g.fillRect(0, h - 30, w, 30);
    T(g, '春風線', 0, 8, w, 42, { color: '#fff' });
    for (let i = 0; i < 6; i++) sakuraFlower(g, 20 + (i % 2) * (w - 40), 110 + i * 85, 16, '#ffffff', '#f6d25a');
    verticalText(g, 'さくらまつり開催中', w / 2, 70, h - 50, { font: FONTS.gothic, color: '#ffffff', maxSize: 66, stroke: { color: '#c24a6a', width: 6 } });
  }));
  // A-frame notice at the entrance
  S.aframe = Q.add(320, 420, (g, w, h) => {
    g.fillStyle = '#fdfbf5'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, 70);
    T(g, '駅からのお知らせ', 10, 10, w - 20, 50, { color: '#fff' });
    R(g, '本日、春風線は', 16, 90, w - 32, 44, { color: '#26324f', align: 'left' });
    R(g, '平常どおり運転', 16, 136, w - 32, 44, { color: '#26324f', align: 'left' });
    R(g, 'しております。', 16, 182, w - 32, 44, { color: '#26324f', align: 'left' });
    R(g, '桜の見ごろは今週末まで！', 16, 244, w - 32, 36, { color: '#c0506e', align: 'left' });
    R(g, 'お花見のお客さまは', 16, 286, w - 32, 32, { color: '#555', align: 'left' });
    R(g, '足元にお気をつけて。', 16, 322, w - 32, 32, { color: '#555', align: 'left' });
    for (let i = 0; i < 5; i++) sakuraFlower(g, 40 + i * 60, h - 34, 14);
  });

  S.shelterSign = Q.add(560, 80, (g, w, h) => {
    g.fillStyle = '#26324f'; g.fillRect(0, 0, w, h);
    T(g, '待合室  Waiting Room', 10, 8, w - 20, h - 16, { color: '#fff' });
  });


  A.pack();
  P.pack();
  Q.pack();
  return S;
}
