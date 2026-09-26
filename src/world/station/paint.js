/**
 * Canvas drawing helpers shared by the station's sign and poster painters:
 * text shortcuts, rounded rects, arrows, line badges, sakura blossoms,
 * paper ageing, pictograms, plus the fictional Harukaze line data.
 */
import { FONTS, fitText, roundRect } from '../../core/canvasTex.js';
import { STATION } from '../../core/layout.js';

export const NAVY = '#1f3160';
export const PINK = STATION.lineColor; // #f29bb4
export const PINK_DEEP = '#e0708f';

/** The Harukaze line (fictional).  HK07 = this station. */
export const LINE_STATIONS = [
  { code: 'HK01', name: '港町', kana: 'みなとまち', romaji: 'Minatomachi' },
  { code: 'HK02', name: '汐見橋', kana: 'しおみばし', romaji: 'Shiomibashi' },
  { code: 'HK03', name: '若葉', kana: 'わかば', romaji: 'Wakaba' },
  { code: 'HK04', name: '緑ヶ丘', kana: 'みどりがおか', romaji: 'Midorigaoka' },
  { code: 'HK05', name: '東雲', kana: 'しののめ', romaji: 'Shinonome' },
  { code: 'HK06', name: '花見台', kana: 'はなみだい', romaji: 'Hanamidai' },
  { code: 'HK07', name: '桜ヶ丘', kana: 'さくらがおか', romaji: 'Sakuragaoka' },
  { code: 'HK08', name: '春日野', kana: 'かすがの', romaji: 'Kasugano' },
  { code: 'HK09', name: '風見', kana: 'かざみ', romaji: 'Kazami' },
  { code: 'HK10', name: '菜の花', kana: 'なのはな', romaji: 'Nanohana' },
  { code: 'HK11', name: '山吹', kana: 'やまぶき', romaji: 'Yamabuki' },
  { code: 'HK12', name: '霞ヶ峰', kana: 'かすみがみね', romaji: 'Kasumigamine' },
];
export const FARES = [150, 150, 180, 210, 240, 280, 310];

// ---------------------------------------------------------------------------
// drawing helpers
/** Draw at a design size W x H into a smaller atlas region. */
export const scaled = (W, H, fn) => (g, w, h) => { g.scale(w / W, h / H); fn(g, W, H); };
// ---------------------------------------------------------------------------
export const T = (g, text, x, y, w, h, o = {}) => fitText(g, text, x, y, w, h, { font: FONTS.gothic, weight: 700, ...o });
export const R = (g, text, x, y, w, h, o = {}) => fitText(g, text, x, y, w, h, { font: FONTS.round, weight: 700, ...o });

export function rrect(g, x, y, w, h, r, fill, stroke, lw = 2) {
  roundRect(g, x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

/** Arrow glyph.  dir: 'l' | 'r' | 'u' | 'd' */
export function arrow(g, cx, cy, s, dir, color) {
  g.save();
  g.translate(cx, cy);
  g.rotate({ r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 }[dir]);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(s * 0.5, 0);
  g.lineTo(0, -s * 0.45);
  g.lineTo(0, -s * 0.18);
  g.lineTo(-s * 0.5, -s * 0.18);
  g.lineTo(-s * 0.5, s * 0.18);
  g.lineTo(0, s * 0.18);
  g.lineTo(0, s * 0.45);
  g.closePath();
  g.fill();
  g.restore();
}

/** Line-number badge (rounded square, pink border) e.g. HK 07 */
export function badge(g, x, y, s, code, o = {}) {
  rrect(g, x, y, s, s, s * 0.18, '#ffffff', o.border || PINK_DEEP, s * 0.1);
  T(g, code.slice(0, 2), x, y + s * 0.1, s, s * 0.3, { color: NAVY });
  T(g, code.slice(2), x, y + s * 0.38, s, s * 0.52, { color: NAVY, font: FONTS.latin });
}

export function sakuraFlower(g, cx, cy, r, color = '#f7a9c0', center = '#fff2a8') {
  g.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.save();
    g.translate(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.ellipse(0, 0, r * 0.36, r * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    // notch
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(0, -r * 0.5, r * 0.08, 0, 7); g.fill();
    g.fillStyle = color;
    g.restore();
  }
  g.fillStyle = center;
  g.beginPath(); g.arc(cx, cy, r * 0.18, 0, 7); g.fill();
}

/** Paper aging: faded overlay, slight yellowing, tape corners. */
export function agePaper(g, w, h, rnd, amount = 0.15, tape = true) {
  g.fillStyle = `rgba(250,240,215,${amount})`;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(215,195,160,${amount * 0.8})`);
    gr.addColorStop(1, 'rgba(215,195,160,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (tape) {
    g.fillStyle = 'rgba(240,235,210,0.8)';
    for (const [x, y, a] of [[0, 0, -0.7], [w, 0, 0.7]]) {
      g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-w * 0.09, -8, w * 0.18, 16); g.restore();
    }
  }
}

export function paperEdge(g, w, h, color = 'rgba(0,0,0,0.12)') {
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
}

/** Small no-smoking pictogram. */
export function noSmokingIcon(g, cx, cy, r) {
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.fillStyle = '#333';
  g.fillRect(cx - r * 0.62, cy - r * 0.08, r * 1.0, r * 0.2);
  g.fillStyle = '#e8883a';
  g.fillRect(cx + r * 0.38, cy - r * 0.08, r * 0.18, r * 0.2);
  g.strokeStyle = '#999';
  g.lineWidth = r * 0.05;
  g.beginPath(); g.moveTo(cx + r * 0.5, cy - r * 0.15); g.bezierCurveTo(cx + r * 0.4, cy - r * 0.4, cx + r * 0.65, cy - r * 0.45, cx + r * 0.55, cy - r * 0.7); g.stroke();
  g.strokeStyle = '#d8342c';
  g.lineWidth = r * 0.16;
  g.beginPath(); g.arc(cx, cy, r * 0.88, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(cx - r * 0.62, cy - r * 0.62); g.lineTo(cx + r * 0.62, cy + r * 0.62); g.stroke();
}

// ---------------------------------------------------------------------------
