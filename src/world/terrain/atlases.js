/**
 * terrain/atlases — the two 2048² canvas atlases used by the ground layers:
 *
 *   marks   8 x 8 cells of 256 px: road paint (worn white / yellow / orange /
 *           green), road-text characters (glyphs fill the cell height, drawn
 *           narrow so the elongated road quads read like real 路面標示),
 *           bicycle / pedestrian pictograms, arrow
 *   decals  manholes (incl. the sakura design), patches, stains, spray marks,
 *           leaves, tree-pit soil
 */
import { drawTexture, seeded, roundRect, FONTS } from '../../core/canvasTex.js';
import { rgba, crack } from './textures.js';

// ---------------------------------------------------------------------------
// road paint atlas
// ---------------------------------------------------------------------------
const WHITE_PAINT = '#eeede6';
const YELLOW_PAINT = '#f2c53d';

/**
 * Atlas of 256 px cells (8 x 8).  Returns { texture, cell(name) -> [u0,v0,u1,v1] }.
 * Character cells are named 'w:<char>' (white) and 'y:<char>' (yellow).
 */
export function markingsAtlas(whiteChars, yellowChars) {
  const S = 2048, C = 256, N = 8;
  const cells = new Map();
  let next = 0;
  const alloc = (name) => {
    const i = next++;
    const cx = (i % N) * C, cy = Math.floor(i / N) * C;
    cells.set(name, [cx, cy]);
    return [cx, cy];
  };
  const rnd = seeded(8181);
  const tex = drawTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    // worn edges: knock random holes out of whatever was drawn in the cell
    const wear = (cx, cy, amount) => {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < amount; i++) {
        const x = cx + 4 + rnd() * (C - 8), y = cy + 4 + rnd() * (C - 8);
        ctx.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.55})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 1 + rnd() * 4, 1 + rnd() * 2.5, rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    const paintCell = (name, color, amount) => {
      const [cx, cy] = alloc(name);
      ctx.fillStyle = color;
      ctx.fillRect(cx + 4, cy + 4, C - 8, C - 8);
      wear(cx, cy, amount);
    };
    paintCell('white', WHITE_PAINT, 260);
    paintCell('white2', WHITE_PAINT, 700); // heavily worn (zebra wheel paths, old lines)
    paintCell('orange', '#ee9f38', 300);
    paintCell('yellow', YELLOW_PAINT, 300);
    paintCell('green', '#a3c49c', 1300); // school-route shoulder (old, faded mint)
    {
      // big worn-through patches so the asphalt shows through the green paint
      const [gx, gy] = cells.get('green');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 14; i++) {
        const x = gx + rnd() * C, y = gy + rnd() * C;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 20 + rnd() * 40);
        gr.addColorStop(0, `rgba(0,0,0,${0.35 + rnd() * 0.4})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(gx, gy, C, C);
      }
      ctx.restore();
    }
    paintCell('blue', '#4f86c9', 500);
    // characters
    // Road-text glyph: fills the cell height and is drawn slightly narrow; the
    // road quad (long along the travel direction) then gives the classic tall,
    // squeezed 路面標示 look seen from the driver's seat.
    const drawChar = (ch, color, key) => {
      const [cx, cy] = alloc(key);
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `900 ${C * 0.95}px ${FONTS.gothic}`;
      const m = ctx.measureText(ch);
      const left = m.actualBoundingBoxLeft || 0, right = m.actualBoundingBoxRight || m.width;
      const asc = m.actualBoundingBoxAscent || C * 0.8, desc = m.actualBoundingBoxDescent || C * 0.1;
      const gw = Math.max(1, left + right), gh = Math.max(1, asc + desc);
      const sy = (C * 0.9) / gh; // tight vertical fit
      const sx = Math.min(sy * 0.9, (C * 0.86) / gw); // never widened
      ctx.translate(cx + C / 2, cy + C / 2);
      ctx.scale(sx, sy);
      const ox = (left - right) / 2, oy = (asc - desc) / 2;
      ctx.fillText(ch, ox, oy);
      // make strokes a touch bolder (compensates the squeeze)
      ctx.lineWidth = 5 / sx;
      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      ctx.strokeText(ch, ox, oy);
      ctx.restore();
      wear(cx, cy, 380);
    };
    for (const ch of whiteChars) drawChar(ch, WHITE_PAINT, `w:${ch}`);
    for (const ch of yellowChars) drawChar(ch, YELLOW_PAINT, `y:${ch}`);
    // bicycle pictogram (cell: u across the road, v along travel; front of bike = top)
    {
      const [cx, cy] = alloc('bicycle');
      ctx.save();
      ctx.translate(cx + C / 2, cy + C / 2);
      ctx.rotate(-Math.PI / 2); // bicycle drawn side-on, rotated so it points "up" the cell
      ctx.strokeStyle = WHITE_PAINT;
      ctx.fillStyle = WHITE_PAINT;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const r = 42;
      ctx.beginPath(); ctx.arc(-62, 30, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(62, 30, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-62, 30); ctx.lineTo(-20, -30); ctx.lineTo(40, -30); ctx.lineTo(62, 30);
      ctx.moveTo(-20, -30); ctx.lineTo(0, 30); ctx.lineTo(40, -30);
      ctx.moveTo(-62, 30); ctx.lineTo(0, 30);
      ctx.moveTo(-26, -44); ctx.lineTo(-6, -44);
      ctx.moveTo(40, -30); ctx.lineTo(34, -56); ctx.lineTo(52, -60);
      ctx.stroke();
      ctx.restore();
      wear(cx, cy, 300);
    }
    // arrow (points to the top of the cell)
    {
      const [cx, cy] = alloc('arrow');
      ctx.fillStyle = WHITE_PAINT;
      ctx.beginPath();
      ctx.moveTo(cx + C / 2, cy + 14);
      ctx.lineTo(cx + C - 30, cy + 110);
      ctx.lineTo(cx + C / 2 + 26, cy + 110);
      ctx.lineTo(cx + C / 2 + 26, cy + C - 12);
      ctx.lineTo(cx + C / 2 - 26, cy + C - 12);
      ctx.lineTo(cx + C / 2 - 26, cy + 110);
      ctx.lineTo(cx + 30, cy + 110);
      ctx.closePath();
      ctx.fill();
      wear(cx, cy, 250);
    }
    // pedestrian pictogram (walking person, head at the top of the cell)
    {
      const [cx, cy] = alloc('pedestrian');
      ctx.save();
      ctx.translate(cx + C / 2, cy + C / 2);
      ctx.fillStyle = WHITE_PAINT;
      ctx.strokeStyle = WHITE_PAINT;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(4, -92, 22, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 26;
      ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(-6, 18); ctx.stroke();
      ctx.lineWidth = 17;
      ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(-42, 64); ctx.lineTo(-54, 108); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(24, 60); ctx.lineTo(52, 100); ctx.stroke();
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(-36, -8); ctx.lineTo(-48, 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(34, -12); ctx.lineTo(54, 12); ctx.stroke();
      ctx.restore();
      wear(cx, cy, 260);
    }
  }, { mipmaps: true });
  tex.anisotropy = 8;
  const cell = (name, pad = 6) => {
    const c = cells.get(name);
    if (!c) throw new Error(`markings atlas: no cell ${name}`);
    // canvas y grows downward; texture v grows upward (flipY)
    return [(c[0] + pad) / S, 1 - (c[1] + C - pad) / S, (c[0] + C - pad) / S, 1 - (c[1] + pad) / S];
  };
  return { texture: tex, cell };
}

// ---------------------------------------------------------------------------
// decal atlas (manholes, patches, stains, spray marks, leaves)
// ---------------------------------------------------------------------------
export function decalAtlas() {
  const S = 2048, U = 256;
  const rects = new Map();
  const rnd = seeded(4242);
  // name: [x, y, w, h] in px
  const layout = {
    manholeSakura: [0, 0, 512, 512],
    manholePlain: [512, 0, 512, 512],
    manholeRain: [1024, 0, 512, 512],
    valve: [1536, 0, 256, 256],
    hydrantLid: [1792, 0, 256, 256],
    meter: [1536, 256, 256, 256],
    sqCover: [1792, 256, 256, 256],
    patchA: [0, 512, 512, 256],
    patchB: [512, 512, 256, 256],
    patchC: [768, 512, 256, 256],
    cracks: [1024, 512, 256, 256],
    stainWet: [1280, 512, 256, 256],
    oil: [1536, 512, 256, 256],
    sand: [0, 768, 512, 256],
    sprayA: [512, 768, 256, 256],
    sprayB: [768, 768, 256, 256],
    sprayC: [1024, 768, 256, 256],
    sprayD: [1280, 768, 256, 256],
    leavesA: [1536, 768, 256, 256],
    leavesB: [1792, 768, 256, 256],
    drainStreak: [1792, 512, 256, 256],
    plazaStain: [0, 1024, 256, 256],
    gum: [256, 1024, 256, 256],
    tireMark: [512, 1024, 512, 256],
    soilDisc: [1024, 1024, 512, 512],
  };
  for (const [k, v] of Object.entries(layout)) rects.set(k, v);

  const tex = drawTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    const at = (name) => rects.get(name);
    const softBlob = (x, y, rx, ry, col, a) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.6, rgba(col, a * 0.7));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // ---- manholes -------------------------------------------------------
    const manholeBase = (x0, y0, size, ring = true) => {
      const cx = x0 + size / 2, cy = y0 + size / 2, R = size * 0.46;
      if (ring) {
        ctx.fillStyle = '#6a6c70';
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#85878a';
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.95, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#5a5d62';
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.88, 0, Math.PI * 2); ctx.fill();
      return { cx, cy, R: R * 0.88 };
    };
    {
      // sakura design manhole (painted, like the local-pride lids)
      const [x0, y0, w] = at('manholeSakura');
      const { cx, cy, R } = manholeBase(x0, y0, w);
      ctx.fillStyle = '#8fa9c6';
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.fill();
      // river waves
      ctx.strokeStyle = '#dbe7f1';
      ctx.lineWidth = 6;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let t = -1; t <= 1; t += 0.05) {
          const x = cx + t * R * 0.85, y = cy + R * (0.35 + k * 0.17) + Math.sin(t * 9 + k) * 8;
          if (t === -1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // sakura blossoms
      const flower = (fx, fy, r, col) => {
        ctx.fillStyle = col;
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(a) * r * 0.55, fy + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, a + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#e9859f';
        ctx.beginPath(); ctx.arc(fx, fy, r * 0.18, 0, Math.PI * 2); ctx.fill();
      };
      flower(cx - R * 0.3, cy - R * 0.25, R * 0.42, '#f7c3d2');
      flower(cx + R * 0.35, cy - R * 0.38, R * 0.3, '#fbd8e2');
      flower(cx + R * 0.25, cy + R * 0.08, R * 0.22, '#f4b3c6');
      // train silhouette band
      ctx.fillStyle = '#f5f1e6';
      roundRect(ctx, cx - R * 0.65, cy + R * 0.08, R * 0.5, R * 0.18, 8);
      ctx.fill();
      ctx.fillStyle = '#ef8fae';
      ctx.fillRect(cx - R * 0.65, cy + R * 0.18, R * 0.5, 6);
      // rim + text band
      ctx.strokeStyle = '#4d5055';
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e8e4da';
      ctx.font = `700 26px ${FONTS.gothic}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('さくらがおか', cx, cy - R * 0.72);
      ctx.fillText('おすい', cx, cy + R * 0.76);
      // wear: lighter scuffs on the paint
      for (let i = 0; i < 160; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * R * 0.85;
        ctx.fillStyle = `rgba(90,92,96,${0.2 + rnd() * 0.4})`;
        ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + rnd() * 5, 1 + rnd() * 3);
      }
    }
    {
      // plain cast-iron sewer lid: concentric rings + chequer lugs
      const [x0, y0, w] = at('manholePlain');
      const { cx, cy, R } = manholeBase(x0, y0, w);
      ctx.strokeStyle = '#6f7277';
      ctx.lineWidth = 5;
      for (const f of [0.82, 0.55, 0.28]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#757a80';
      for (let ring = 0; ring < 3; ring++) {
        const rr = R * (0.41 + ring * 0.14 - 0.14);
        const n = 10 + ring * 8;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          ctx.rotate(a);
          ctx.fillRect(-7, -4, 14, 8);
          ctx.restore();
        }
      }
      ctx.fillStyle = '#7b8086';
      ctx.font = `700 34px ${FONTS.gothic}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('下水', cx, cy);
      for (let i = 0; i < 120; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * R;
        ctx.fillStyle = `rgba(150,152,155,${0.2 + rnd() * 0.3})`;
        ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + rnd() * 4, 1 + rnd() * 2);
      }
    }
    {
      // rainwater lid with a radial pattern
      const [x0, y0, w] = at('manholeRain');
      const { cx, cy, R } = manholeBase(x0, y0, w);
      ctx.strokeStyle = '#72767b';
      ctx.lineWidth = 7;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.25);
        ctx.lineTo(cx + Math.cos(a + 0.25) * R * 0.85, cy + Math.sin(a + 0.25) * R * 0.85);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.25, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#7b8086';
      ctx.font = `700 30px ${FONTS.gothic}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('雨水', cx, cy);
    }
    const smallLid = (name, text, square, col = '#5f6368') => {
      const [x0, y0, w] = at(name);
      const cx = x0 + w / 2, cy = y0 + w / 2, R = w * 0.4;
      ctx.fillStyle = '#7d7f83';
      if (square) { roundRect(ctx, cx - R * 1.05, cy - R * 0.8, R * 2.1, R * 1.6, 8); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = col;
      if (square) { roundRect(ctx, cx - R * 0.92, cy - R * 0.68, R * 1.84, R * 1.36, 6); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(140,144,150,0.9)';
      ctx.lineWidth = 3;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.8, cy + k * R * 0.2);
        ctx.lineTo(cx + R * 0.8, cy + k * R * 0.2);
        ctx.stroke();
      }
      ctx.fillStyle = col;
      ctx.fillRect(cx - R * 0.6, cy - R * 0.28, R * 1.2, R * 0.56);
      ctx.fillStyle = '#b8bcc2';
      ctx.font = `700 ${Math.round(R * 0.42)}px ${FONTS.gothic}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy + 2);
    };
    smallLid('valve', '仕切弁', false);
    smallLid('hydrantLid', '消火栓', false, '#6a5f5a');
    smallLid('meter', '量水器', true, '#4f6a8a');
    smallLid('sqCover', 'ガス', true);
    // hydrant lid is traditionally painted yellow around the rim
    {
      const [x0, y0, w] = at('hydrantLid');
      ctx.strokeStyle = YELLOW_PAINT;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(x0 + w / 2, y0 + w / 2, w * 0.44, 0, Math.PI * 2); ctx.stroke();
    }

    // ---- asphalt repair patches -----------------------------------------
    const patch = (name, color) => {
      const [x0, y0, w, h] = at(name);
      const pad = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      // slightly irregular rectangle
      ctx.moveTo(x0 + pad + rnd() * 6, y0 + pad + rnd() * 6);
      ctx.lineTo(x0 + w - pad - rnd() * 6, y0 + pad + rnd() * 6);
      ctx.lineTo(x0 + w - pad - rnd() * 6, y0 + h - pad - rnd() * 6);
      ctx.lineTo(x0 + pad + rnd() * 6, y0 + h - pad - rnd() * 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(82,85,92,0.7)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      for (let i = 0; i < (w * h) / 60; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(130,134,142,0.5)' : 'rgba(80,84,90,0.45)';
        ctx.fillRect(x0 + rnd() * w, y0 + rnd() * h, 1.5, 1.5);
      }
      ctx.restore();
    };
    patch('patchA', 'rgba(122,126,135,0.7)');
    patch('patchB', 'rgba(128,132,140,0.7)');
    patch('patchC', 'rgba(156,159,166,0.65)'); // older, bleached patch
    {
      const [x0, y0, w, h] = at('cracks');
      for (let k = 0; k < 7; k++) crack(ctx, S, S, rnd, x0 + 40 + rnd() * (w - 80), y0 + 40 + rnd() * (h - 80), 50 + rnd() * 70, 2, '#4b4e55', 0.85, false);
    }
    {
      const [x0, y0, w, h] = at('stainWet');
      softBlob(x0 + w / 2, y0 + h / 2, w * 0.42, h * 0.3, '#4c5058', 0.45);
      softBlob(x0 + w * 0.45, y0 + h * 0.55, w * 0.25, h * 0.18, '#43474e', 0.35);
    }
    {
      const [x0, y0, w, h] = at('drainStreak');
      // wet streak running toward the gutter (top of the cell = gutter side)
      const g = ctx.createLinearGradient(0, y0 + h, 0, y0);
      g.addColorStop(0, 'rgba(70,74,82,0)');
      g.addColorStop(0.5, 'rgba(70,74,82,0.28)');
      g.addColorStop(1, 'rgba(62,66,74,0.5)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.42, y0 + h);
      ctx.bezierCurveTo(x0 + w * 0.2, y0 + h * 0.6, x0 + w * 0.3, y0 + h * 0.3, x0 + w * 0.12, y0 + 6);
      ctx.lineTo(x0 + w * 0.88, y0 + 6);
      ctx.bezierCurveTo(x0 + w * 0.7, y0 + h * 0.3, x0 + w * 0.8, y0 + h * 0.6, x0 + w * 0.58, y0 + h);
      ctx.closePath();
      ctx.fill();
    }
    {
      const [x0, y0, w, h] = at('oil');
      softBlob(x0 + w / 2, y0 + h / 2, w * 0.3, h * 0.24, '#3f4249', 0.4);
      softBlob(x0 + w * 0.6, y0 + h * 0.45, w * 0.14, h * 0.1, '#6d6a86', 0.25);
    }
    {
      const [x0, y0, w, h] = at('sand');
      for (let i = 0; i < 26; i++) softBlob(x0 + 30 + rnd() * (w - 60), y0 + h * (0.35 + rnd() * 0.3), 20 + rnd() * 30, 8 + rnd() * 16, '#c7b9a0', 0.35);
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(200,188,168,0.6)' : 'rgba(150,140,125,0.5)';
        ctx.fillRect(x0 + 20 + rnd() * (w - 40), y0 + h * 0.3 + rnd() * h * 0.4, 2, 2);
      }
    }
    // ---- survey / utility spray marks -----------------------------------
    const spray = (name, color, draw) => {
      const [x0, y0, w, h] = at(name);
      ctx.save();
      ctx.translate(x0 + w / 2, y0 + h / 2);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      draw();
      ctx.restore();
    };
    spray('sprayA', '#ef6f9f', () => {
      ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(80, 0); ctx.moveTo(0, -80); ctx.lineTo(0, 80); ctx.stroke();
    });
    spray('sprayB', '#f3d24a', () => {
      ctx.beginPath(); ctx.moveTo(-90, 40); ctx.lineTo(60, 40); ctx.lineTo(40, 20); ctx.moveTo(60, 40); ctx.lineTo(40, 60); ctx.stroke();
      ctx.font = `700 64px ${FONTS.gothic}`;
      ctx.textAlign = 'center';
      ctx.fillText('ガ', -30, -20);
      ctx.font = `700 40px ${FONTS.gothic}`;
      ctx.fillText('1.2', 50, -30);
    });
    spray('sprayC', '#f4f4ee', () => {
      ctx.beginPath(); ctx.moveTo(-60, 50); ctx.lineTo(0, -60); ctx.lineTo(60, 50); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 12, 8, 0, Math.PI * 2); ctx.fill();
    });
    spray('sprayD', '#6fb2e8', () => {
      ctx.font = `700 70px ${FONTS.gothic}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('水', -34, 0);
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(100, 0); ctx.moveTo(80, -18); ctx.lineTo(100, 0); ctx.lineTo(80, 18); ctx.stroke();
    });
    // ---- dry leaves & twigs ---------------------------------------------
    const leaves = (name, n) => {
      const [x0, y0, w, h] = at(name);
      const cols = ['#9a7248', '#b58a57', '#7d6040', '#c29b62', '#8c7a4a'];
      for (let i = 0; i < n; i++) {
        const x = x0 + 30 + rnd() * (w - 60), y = y0 + 30 + rnd() * (h - 60);
        const a = rnd() * Math.PI * 2, L = 10 + rnd() * 12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
        ctx.beginPath();
        ctx.moveTo(-L, 0);
        ctx.quadraticCurveTo(0, -L * 0.55, L, 0);
        ctx.quadraticCurveTo(0, L * 0.55, -L, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,60,40,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L + 3, 0); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = '#6a5440';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const x = x0 + 40 + rnd() * (w - 80), y = y0 + 40 + rnd() * (h - 80);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 * (rnd() - 0.5) * 2, y + 30 * (rnd() - 0.5) * 2); ctx.stroke();
      }
    };
    leaves('leavesA', 16);
    leaves('leavesB', 9);
    {
      const [x0, y0, w, h] = at('plazaStain');
      softBlob(x0 + w / 2, y0 + h / 2, w * 0.4, h * 0.4, '#9d978c', 0.3);
    }
    {
      const [x0, y0, w, h] = at('gum');
      for (let i = 0; i < 9; i++) softBlob(x0 + 30 + rnd() * (w - 60), y0 + 30 + rnd() * (h - 60), 6 + rnd() * 6, 5 + rnd() * 5, '#8b8a86', 0.6);
    }
    {
      const [x0, y0, w, h] = at('tireMark');
      for (const yy of [0.3, 0.7]) {
        const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
        g.addColorStop(0, 'rgba(50,52,58,0)');
        g.addColorStop(0.3, 'rgba(50,52,58,0.35)');
        g.addColorStop(1, 'rgba(50,52,58,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x0, y0 + h * yy - 10, w, 20);
      }
    }
    {
      // tree-pit soil disc with a stone ring
      const [x0, y0, w] = at('soilDisc');
      const cx = x0 + w / 2, cy = y0 + w / 2, R = w * 0.47;
      ctx.fillStyle = '#9b8468';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 700; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R * 0.95;
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(125,104,80,0.7)' : 'rgba(180,160,130,0.6)';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // moss and fallen petals
      for (let i = 0; i < 40; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R * 0.9;
        softBlob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 14, 10, '#8ea56a', 0.5);
      }
      for (let i = 0; i < 160; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R * 0.95;
        ctx.fillStyle = rnd() < 0.6 ? '#f9c9d6' : '#fde6ec';
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, 2.6, rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#b9b5ab';
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(cx, cy, R - 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,116,108,0.8)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16));
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }
    }
  }, { mipmaps: true });
  tex.anisotropy = 8;
  const uv = (name, pad = 2) => {
    const [x, y, w, h] = rects.get(name);
    return [(x + pad) / S, 1 - (y + h - pad) / S, (x + w - pad) / S, 1 - (y + pad) / S];
  };
  return { texture: tex, uv };
}
