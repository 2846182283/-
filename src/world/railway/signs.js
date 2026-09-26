/**
 * railway/signs.js — one canvas atlas for every painted railway sign:
 * kilometre posts, speed-limit / release boards, track number boards,
 * warning boards (線路内立入禁止, 危険 高電圧), emergency telephone (非常電話),
 * equipment-box labels, signal identification plates, pole numbers,
 * point numbers, whistle boards and reflector discs.
 *
 * All text uses the fictional 春風電鉄 names.  Cells are packed on shelves;
 * each cell is padded so mip-mapping never bleeds a neighbour in.
 */
import * as THREE from 'three';
import { STATION, RAIL } from '../../core/layout.js';

const W = 2048, H = 2048;
const PAD = 6;

/** Registry of cells: name -> {w, h, draw(ctx, w, h)} */
function cellSpecs(F, fitText, roundRect, verticalText, poleCount) {
  const S = [];
  const add = (name, w, h, draw) => S.push({ name, w, h, draw });
  const company = STATION.company;

  // kilometre posts (white, black numerals stacked vertically)
  for (const k of RAIL.kmPosts) {
    add(`km:${k.x}`, 96, 256, (c, w, h) => {
      c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
      const [a, b] = k.km.toFixed(1).split('.');
      fitText(c, a, 4, 18, w - 8, 96, { font: F.gothic, weight: 700, color: '#1d1d22' });
      c.fillStyle = '#1d1d22'; c.fillRect(18, 128, w - 36, 6);
      fitText(c, b, 4, 146, w - 8, 92, { font: F.gothic, weight: 700, color: '#1d1d22' });
    });
  }
  // speed limit boards + release board
  for (const v of ['45', '60', '65']) {
    add(`speed:${v}`, 192, 224, (c, w, h) => {
      c.fillStyle = '#f7f6f1'; roundRect(c, 0, 0, w, h, 14); c.fill();
      c.strokeStyle = '#1d1d22'; c.lineWidth = 10; roundRect(c, 9, 9, w - 18, h - 18, 10); c.stroke();
      fitText(c, '制限', 20, 20, w - 40, 44, { font: F.gothic, weight: 700, color: '#1d1d22' });
      fitText(c, v, 16, 70, w - 32, 130, { font: F.gothic, weight: 800, color: '#1d1d22' });
    });
  }
  add('speed:release', 192, 224, (c, w, h) => {
    c.fillStyle = '#f7f6f1'; roundRect(c, 0, 0, w, h, 14); c.fill();
    c.strokeStyle = '#1d1d22'; c.lineWidth = 10; roundRect(c, 9, 9, w - 18, h - 18, 10); c.stroke();
    c.save(); c.beginPath(); roundRect(c, 14, 14, w - 28, h - 28, 8); c.clip();
    c.fillStyle = '#1d1d22'; c.beginPath(); c.moveTo(w - 60, 14); c.lineTo(w, 14); c.lineTo(60, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.restore();
    fitText(c, '解除', 20, 20, w - 40, 44, { font: F.gothic, weight: 700, color: '#1d1d22', stroke: { color: '#f7f6f1', width: 8 } });
  });
  // track number boards (platform ends)
  for (const n of ['1', '2']) {
    add(`track:${n}`, 192, 192, (c, w, h) => {
      c.fillStyle = '#f7f6f1'; roundRect(c, 0, 0, w, h, 16); c.fill();
      c.fillStyle = '#2f63b5'; c.beginPath(); c.arc(w / 2, h * 0.42, 58, 0, Math.PI * 2); c.fill();
      fitText(c, n, w / 2 - 50, h * 0.42 - 52, 100, 104, { font: F.gothic, weight: 800, color: '#ffffff' });
      fitText(c, '番線', 20, h - 60, w - 40, 46, { font: F.gothic, weight: 700, color: '#2f63b5' });
    });
  }
  // running-line boards (上り本線 / 下り本線)
  for (const [n, t] of [['up', '上り本線'], ['down', '下り本線']]) {
    add(`line:${n}`, 256, 96, (c, w, h) => {
      c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1d1d22'; c.lineWidth = 5; c.strokeRect(4, 4, w - 8, h - 8);
      fitText(c, t, 14, 12, w - 28, h - 24, { font: F.gothic, weight: 700, color: '#1d1d22' });
    });
  }
  // warning boards
  add('warn:keepout', 384, 224, (c, w, h) => {
    c.fillStyle = '#fbfaf5'; roundRect(c, 0, 0, w, h, 10); c.fill();
    c.fillStyle = '#d8433d'; c.fillRect(0, 0, w, 58);
    fitText(c, '危険', 10, 6, w - 20, 48, { font: F.gothic, weight: 800, color: '#ffffff', letterSpacing: 18 });
    fitText(c, '線路内立入禁止', 16, 70, w - 32, 76, { font: F.gothic, weight: 800, color: '#c7322c' });
    fitText(c, `${company}`, 16, 160, w - 32, 44, { font: F.gothic, weight: 700, color: '#333' });
  });
  add('warn:keepout2', 256, 160, (c, w, h) => {
    c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d8433d'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    fitText(c, 'あぶない！', 14, 14, w - 28, 44, { font: F.round, weight: 800, color: '#d8433d' });
    fitText(c, '線路に入らないで', 14, 64, w - 28, 40, { font: F.round, weight: 700, color: '#333' });
    fitText(c, 'ください', 14, 106, w - 28, 38, { font: F.round, weight: 700, color: '#333' });
  });
  add('warn:hv', 192, 256, (c, w, h) => {
    c.fillStyle = '#f2c230'; roundRect(c, 0, 0, w, h, 10); c.fill();
    c.fillStyle = '#1d1d22'; c.fillRect(0, 0, w, 64);
    fitText(c, '危険', 8, 6, w - 16, 54, { font: F.gothic, weight: 800, color: '#f2c230', letterSpacing: 12 });
    // lightning bolt
    c.fillStyle = '#1d1d22';
    c.beginPath(); c.moveTo(108, 76); c.lineTo(62, 150); c.lineTo(96, 150); c.lineTo(76, 210); c.lineTo(134, 128); c.lineTo(100, 128); c.lineTo(122, 76); c.closePath(); c.fill();
    fitText(c, '高電圧 さわるな', 8, 214, w - 16, 36, { font: F.gothic, weight: 800, color: '#1d1d22' });
  });
  add('warn:hvsmall', 128, 112, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f2c230'; c.strokeStyle = '#1d1d22'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w - 8, h - 8); c.lineTo(8, h - 8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1d1d22';
    c.beginPath(); c.moveTo(70, 34); c.lineTo(48, 72); c.lineTo(62, 72); c.lineTo(54, 96); c.lineTo(82, 62); c.lineTo(67, 62); c.lineTo(80, 34); c.closePath(); c.fill();
  });
  // emergency telephone
  add('phone', 320, 128, (c, w, h) => {
    c.fillStyle = '#2f8f5f'; roundRect(c, 0, 0, w, h, 12); c.fill();
    c.fillStyle = '#ffffff'; roundRect(c, 10, 10, 104, h - 20, 10); c.fill();
    // handset icon
    c.fillStyle = '#2f8f5f';
    c.beginPath(); c.ellipse(62, 64, 34, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(34, 62, 14, 26); c.fillRect(76, 62, 14, 26);
    fitText(c, '非常電話', 124, 12, w - 136, 70, { font: F.gothic, weight: 800, color: '#ffffff' });
    fitText(c, 'EMERGENCY', 124, 84, w - 136, 30, { font: F.latin, weight: 700, color: '#d9f0e2' });
  });
  // equipment box labels
  add('box:signal', 256, 96, (c, w, h) => {
    c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2f63b5'; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
    fitText(c, '信号機器箱', 12, 8, w - 24, 50, { font: F.gothic, weight: 700, color: '#1d1d22' });
    fitText(c, `${company} 電気区`, 12, 58, w - 24, 30, { font: F.gothic, weight: 500, color: '#444' });
  });
  add('box:power', 256, 96, (c, w, h) => {
    c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d8433d'; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
    fitText(c, '電気機器箱', 12, 8, w - 24, 50, { font: F.gothic, weight: 700, color: '#1d1d22' });
    fitText(c, '関係者以外さわらないで', 12, 58, w - 24, 30, { font: F.gothic, weight: 500, color: '#c7322c' });
  });
  add('box:point', 256, 96, (c, w, h) => {
    c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3c9a62'; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
    fitText(c, '転てつ器継電器箱', 12, 8, w - 24, 50, { font: F.gothic, weight: 700, color: '#1d1d22' });
    fitText(c, 'No.21・22', 12, 58, w - 24, 30, { font: F.gothic, weight: 500, color: '#444' });
  });
  // signal identification plates
  for (const [n, t] of [['homeA', '上り場内'], ['startA', '上り出発'], ['homeB', '下り場内'], ['startB', '下り出発'], ['shunt', '入換']]) {
    add(`sig:${n}`, 96, 224, (c, w, h) => {
      c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1d1d22'; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
      verticalText(c, t, w / 2, 12, h - 12, { font: F.gothic, weight: 800, color: '#1d1d22', width: 60 });
    });
  }
  // catenary pole numbers
  for (let i = 0; i < poleCount; i++) {
    add(`pole:${i}`, 64, 112, (c, w, h) => {
      c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1d1d22'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
      fitText(c, i % 2 ? '下' : '上', 6, 8, w - 12, 40, { font: F.gothic, weight: 700, color: '#1d1d22' });
      fitText(c, String(101 + Math.floor(i / 2)), 4, 54, w - 8, 48, { font: F.gothic, weight: 800, color: '#1d1d22' });
    });
  }
  // point numbers
  for (const n of ['21', '22']) {
    add(`pm:${n}`, 128, 96, (c, w, h) => {
      c.fillStyle = '#1d1d22'; roundRect(c, 0, 0, w, h, 10); c.fill();
      fitText(c, n, 8, 8, w - 16, h - 16, { font: F.gothic, weight: 800, color: '#f7f6f1' });
    });
  }
  // whistle board
  add('whistle', 160, 160, (c, w, h) => {
    c.fillStyle = '#f7f6f1'; roundRect(c, 0, 0, w, h, 10); c.fill();
    c.strokeStyle = '#1d1d22'; c.lineWidth = 8; roundRect(c, 7, 7, w - 14, h - 14, 8); c.stroke();
    fitText(c, '笛', 16, 16, w - 32, h - 32, { font: F.gothic, weight: 800, color: '#1d1d22' });
  });
  // reflectors
  for (const [n, col, ring] of [['reflO', '#f07a2c', '#fbe8d8'], ['reflY', '#f2c230', '#fff6d0'], ['reflR', '#e2473d', '#ffffff']]) {
    add(n, 64, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = ring; c.beginPath(); c.arc(w / 2, h / 2, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(w / 2, h / 2, 24, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(w / 2 - 7, h / 2 - 8, 7, 0, Math.PI * 2); c.fill();
    });
  }
  // black & yellow hazard stripes (small plates / box edges)
  add('stripe', 128, 32, (c, w, h) => {
    c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d1d22';
    for (let x = -h; x < w + h; x += 32) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 16, h); c.lineTo(x + 16 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); }
  });
  return S;
}

/**
 * Build the atlas.  Returns { tex, uv(name) -> [u0,v0,u1,v1], has(name) }.
 */
export function buildSignAtlas(ctx, { poleCount = 48 } = {}) {
  const { tex: T } = ctx;
  const specs = cellSpecs(T.FONTS, T.fitText, T.roundRect, T.verticalText, poleCount);
  // shelf packing (tallest first keeps rows tidy)
  const order = specs.slice().sort((a, b) => b.h - a.h);
  let x = 0, y = 0, rowH = 0;
  const rects = new Map();
  for (const s of order) {
    const w = s.w + PAD * 2, h = s.h + PAD * 2;
    if (x + w > W) { x = 0; y += rowH; rowH = 0; }
    if (y + h > H) throw new Error('railway sign atlas overflow');
    rects.set(s.name, { x: x + PAD, y: y + PAD, w: s.w, h: s.h, spec: s });
    x += w;
    rowH = Math.max(rowH, h);
  }
  const usedH = Math.min(H, Math.pow(2, Math.ceil(Math.log2(y + rowH))));
  const tex = T.drawTexture(W, usedH, (c) => {
    c.clearRect(0, 0, W, usedH);
    for (const r of rects.values()) {
      c.save();
      c.translate(r.x, r.y);
      // bleed: fill the padding with the cell's edge colour by drawing the cell slightly enlarged first
      c.save();
      c.translate(-PAD, -PAD);
      c.scale((r.w + PAD * 2) / r.w, (r.h + PAD * 2) / r.h);
      r.spec.draw(c, r.w, r.h);
      c.restore();
      c.clearRect(0, 0, r.w, r.h);
      c.beginPath(); c.rect(0, 0, r.w, r.h); c.clip();
      r.spec.draw(c, r.w, r.h);
      c.restore();
    }
  });
  tex.anisotropy = 8;
  const uv = (name) => {
    const r = rects.get(name);
    if (!r) throw new Error(`railway: no sign cell ${name}`);
    return [r.x / W, 1 - (r.y + r.h) / usedH, (r.x + r.w) / W, 1 - r.y / usedH];
  };
  return { tex, uv, has: (n) => rects.has(n) };
}

/** Plane geometry (facing +Z) mapped to an atlas cell. */
export function signPlane(atlas, name, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = atlas.uv(name);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return g;
}
