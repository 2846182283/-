/**
 * Tiled, hand-painted textures for the station (all procedural canvas):
 *   plaster     exterior wall: soft blotches, rain streaks under the eaves, splash grime at the foot
 *   plasterIn   interior wall: cleaner, faint brush variation
 *   floorTile   concourse floor: 30 cm tiles in two creams, worn walking line
 *   concrete    platform paving: expansion joints, cracks, patch repairs, rain marks
 *   retaining   platform side walls: board-formed concrete with streaks
 *   tactileDot / tactileLine   yellow tactile paving blocks
 *   wood        bench slats / tables / frames: simplified grain in value blocks
 *   roof        standing-seam metal: pan shading + faint rust runs
 * Textures are painted near-neutral and tinted with vertex colours.
 */
import * as THREE from 'three';
import { drawTexture, seeded } from '../../core/canvasTex.js';

function blotches(g, rnd, w, h, n, colors, rMin, rMax, aMin, aMax) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rMin + rnd() * (rMax - rMin);
    const col = colors[Math.floor(rnd() * colors.length)];
    const a = aMin + rnd() * (aMax - aMin);
    // draw wrapped so the tile stays seamless
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      if (x + ox + r < 0 || x + ox - r > w || y + oy + r < 0 || y + oy - r > h) continue;
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, `rgba(${col},${a})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
}

function crack(g, rnd, x, y, len, w) {
  g.strokeStyle = 'rgba(70,68,72,0.55)';
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  let a = rnd() * Math.PI * 2;
  let cx = x, cy = y;
  const steps = 6 + Math.floor(rnd() * 6);
  for (let i = 0; i < steps; i++) {
    a += (rnd() - 0.5) * 1.1;
    cx += Math.cos(a) * len / steps;
    cy += Math.sin(a) * len / steps;
    g.lineTo(cx, cy);
    if (rnd() < 0.25) { // small branch
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a + 1.2) * len * 0.12, cy + Math.sin(a + 1.2) * len * 0.12);
      g.moveTo(cx, cy);
    }
  }
  g.stroke();
}

export function makeTextures(ctx) {
  const T = {};

  // ---- exterior plaster: 512 px = 4 m wide, 4.2 m tall (v = y / 4.2) ----
  T.plaster = drawTexture(512, 512, (g, w, h) => {
    const rnd = seeded(11);
    g.fillStyle = '#f5f1ea';
    g.fillRect(0, 0, w, h);
    blotches(g, rnd, w, h, 40, ['236,226,210', '250,248,244', '226,222,214'], 30, 110, 0.25, 0.5);
    // faint horizontal trowel strokes
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '220,212,200'},${0.08 + rnd() * 0.1})`;
      g.fillRect(rnd() * w, rnd() * h, 30 + rnd() * 90, 2 + rnd() * 3);
    }
    // rain streaks running down from the eaves (top of the tile)
    for (let i = 0; i < 16; i++) {
      const x = rnd() * w, len = 40 + rnd() * 170, sw = 3 + rnd() * 9;
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, 'rgba(128,124,138,0.17)');
      gr.addColorStop(1, 'rgba(120,118,128,0)');
      g.fillStyle = gr;
      g.fillRect(x, 0, sw, len);
      g.fillRect(x + sw * 0.3, 0, sw * 0.35, len * 1.25);
    }
    // soft grime band along the eave line
    let gr = g.createLinearGradient(0, 0, 0, 26);
    gr.addColorStop(0, 'rgba(110,105,115,0.22)');
    gr.addColorStop(1, 'rgba(110,105,115,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, 26);
    // splash grime at the foot of the wall (bottom of the tile)
    gr = g.createLinearGradient(0, h, 0, h - 60);
    gr.addColorStop(0, 'rgba(130,120,110,0.35)');
    gr.addColorStop(1, 'rgba(130,120,110,0)');
    g.fillStyle = gr;
    g.fillRect(0, h - 60, w, 60);
    // a couple of simplified stains
    blotches(g, rnd, w, h * 0.7, 5, ['170,160,150'], 10, 26, 0.18, 0.28);
  }, { wrap: true });

  T.plasterIn = drawTexture(256, 256, (g, w, h) => {
    const rnd = seeded(12);
    g.fillStyle = '#f7f4ee';
    g.fillRect(0, 0, w, h);
    blotches(g, rnd, w, h, 20, ['240,232,220', '252,251,248'], 20, 70, 0.3, 0.5);
  }, { wrap: true });

  // ---- concourse floor tiles: 512 px = 3 m (10 x 10 tiles of 30 cm) ----
  T.floorTile = drawTexture(512, 512, (g, w, h) => {
    const rnd = seeded(21);
    const n = 10, s = w / n;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const alt = (i + j) % 2 === 0;
        const v = rnd() * 8 - 4;
        const base = alt ? [226, 221, 210] : [236, 232, 223];
        g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
        g.fillRect(i * s, j * s, s, s);
        // subtle speckle
        for (let k = 0; k < 10; k++) {
          g.fillStyle = `rgba(150,140,130,${0.08 + rnd() * 0.08})`;
          g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 2, 2);
        }
      }
    }
    g.strokeStyle = 'rgba(160,152,142,0.8)';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
    blotches(g, rnd, w, h, 12, ['180,170,160'], 30, 80, 0.06, 0.12);
  }, { wrap: true });

  // ---- platform concrete: 1024 px = 6 m ----
  T.concrete = drawTexture(1024, 1024, (g, w, h) => {
    const rnd = seeded(31);
    g.fillStyle = '#cfcdc8';
    g.fillRect(0, 0, w, h);
    blotches(g, rnd, w, h, 70, ['200,198,194', '226,224,220', '190,190,192'], 40, 160, 0.25, 0.5);
    // patch repairs (slightly different concrete tone, crisp edges)
    for (let i = 0; i < 5; i++) {
      const pw = 60 + rnd() * 160, ph = 40 + rnd() * 110;
      const x = rnd() * (w - pw), y = rnd() * (h - ph);
      const warm = rnd() < 0.5;
      g.fillStyle = warm ? 'rgba(206,200,188,0.35)' : 'rgba(188,190,194,0.35)';
      g.fillRect(x, y, pw, ph);
      g.strokeStyle = 'rgba(150,148,146,0.3)';
      g.lineWidth = 2;
      g.strokeRect(x, y, pw, ph);
    }
    // rain marks: darker soft puddle shapes
    blotches(g, rnd, w, h, 14, ['160,165,175'], 30, 90, 0.12, 0.22);
    // expansion joints every 3 m
    g.strokeStyle = 'rgba(120,118,120,0.7)';
    g.lineWidth = 3;
    for (const x of [0, w / 2]) { g.beginPath(); g.moveTo(x + 1, 0); g.lineTo(x + 1, h); g.stroke(); }
    // fine cracks
    for (let i = 0; i < 9; i++) crack(g, rnd, rnd() * w, rnd() * h, 60 + rnd() * 140, 1.3 + rnd());
    // speckles / grit
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '120,118,118' : '250,250,248'},${0.12 + rnd() * 0.15})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    // dark gum/stain dots
    for (let i = 0; i < 24; i++) {
      g.fillStyle = `rgba(110,105,110,${0.2 + rnd() * 0.2})`;
      g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 4, 0, Math.PI * 2); g.fill();
    }
  }, { wrap: true });

  // ---- retaining walls: board-formed concrete, 512 px = 4 m x 1.6 m ----
  T.retaining = drawTexture(512, 256, (g, w, h) => {
    const rnd = seeded(41);
    g.fillStyle = '#d2d0cb';
    g.fillRect(0, 0, w, h);
    blotches(g, rnd, w, h, 30, ['196,194,190', '222,220,216'], 20, 80, 0.3, 0.5);
    // form-tie holes + board seams
    g.strokeStyle = 'rgba(150,148,146,0.45)';
    g.lineWidth = 2;
    for (let y = h / 4; y < h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.fillStyle = 'rgba(120,118,120,0.5)';
    for (let x = w / 8; x < w; x += w / 4) for (let y = h / 8; y < h; y += h / 4) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    // streaks from the top
    for (let i = 0; i < 14; i++) {
      const x = rnd() * w, len = 30 + rnd() * 120;
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, 'rgba(110,108,112,0.3)');
      gr.addColorStop(1, 'rgba(110,108,112,0)');
      g.fillStyle = gr;
      g.fillRect(x, 0, 3 + rnd() * 6, len);
    }
    // moss / damp at the foot
    const gr = g.createLinearGradient(0, h, 0, h - 50);
    gr.addColorStop(0, 'rgba(120,140,100,0.35)');
    gr.addColorStop(1, 'rgba(120,140,100,0)');
    g.fillStyle = gr;
    g.fillRect(0, h - 50, w, 50);
  }, { wrap: true });

  // ---- tactile paving (one 30 cm block per tile) ----
  const tactileBase = (g, w, h) => {
    g.fillStyle = '#f1c02c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(170,120,20,0.55)';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
  };
  T.tactileDot = drawTexture(128, 128, (g, w, h) => {
    tactileBase(g, w, h);
    const n = 5, s = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * s, cy = (j + 0.5) * s;
      g.fillStyle = 'rgba(190,135,20,0.8)'; // shade side (sun from the back-left)
      g.beginPath(); g.arc(cx + 1.5, cy + 1.5, s * 0.3, 0, 7); g.fill();
      g.fillStyle = '#f9d24a';
      g.beginPath(); g.arc(cx, cy, s * 0.28, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,245,200,0.9)';
      g.beginPath(); g.arc(cx - 2, cy - 2, s * 0.09, 0, 7); g.fill();
    }
  }, { wrap: true });
  T.tactileLine = drawTexture(128, 128, (g, w, h) => {
    tactileBase(g, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * s;
      g.fillStyle = 'rgba(190,135,20,0.8)';
      g.fillRect(x - s * 0.18 + 2, 10, s * 0.36, h - 18);
      g.fillStyle = '#f9d24a';
      g.fillRect(x - s * 0.18, 8, s * 0.36, h - 18);
      g.fillStyle = 'rgba(255,245,200,0.8)';
      g.fillRect(x - s * 0.12, 10, s * 0.08, h - 22);
    }
  }, { wrap: true });

  // ---- wood: 256 px = 1 m, grain along u ----
  T.wood = drawTexture(256, 256, (g, w, h) => {
    const rnd = seeded(51);
    g.fillStyle = '#e4d2b8';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const v = Math.sin(y * 0.19) * 0.5 + Math.sin(y * 0.047 + 1.3) * 0.5;
      g.fillStyle = `rgba(150,110,70,${0.06 + Math.max(0, v) * 0.1})`;
      g.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(130,90,55,${0.12 + rnd() * 0.12})`;
      g.lineWidth = 1 + rnd() * 1.5;
      const y = rnd() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 12, w * 0.6, y + (rnd() - 0.5) * 12, w, y);
      g.stroke();
    }
    // a knot
    g.strokeStyle = 'rgba(120,80,50,0.35)';
    for (let r = 3; r < 14; r += 3) { g.beginPath(); g.ellipse(w * 0.62, h * 0.4, r * 2, r, 0, 0, 7); g.stroke(); }
  }, { wrap: true });

  // ---- roof: 256 px = 1 m (u across seams); pans shaded, light rust runs ----
  T.roof = drawTexture(256, 256, (g, w, h) => {
    const rnd = seeded(61);
    g.fillStyle = '#e8e8ea';
    g.fillRect(0, 0, w, h);
    const pan = w / 2; // seam every 0.5 m
    for (let i = 0; i < 2; i++) {
      const gr = g.createLinearGradient(i * pan, 0, (i + 1) * pan, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(90,90,110,0.18)');
      g.fillStyle = gr;
      g.fillRect(i * pan, 0, pan, h);
    }
    for (let i = 0; i < 6; i++) {
      const x = rnd() * w, len = 40 + rnd() * 160;
      g.fillStyle = `rgba(150,110,90,${0.08 + rnd() * 0.08})`;
      g.fillRect(x, h - len, 2 + rnd() * 3, len);
    }
  }, { wrap: true });

  for (const k of Object.keys(T)) T[k].colorSpace = THREE.SRGBColorSpace;
  return T;
}
