/**
 * railway/textures.js — canvas-painted textures for the railway:
 *   ballastTexture   stylised crushed-stone bed (grey / dark grey / brown / a few light stones)
 *   mottleTexture    faint hand-painted unevenness for concrete / painted metal (vertex-coloured parts)
 *   chainLinkTexture green diamond mesh for the corridor fences (alpha)
 *   weedAtlas        grass tufts and spring wild flowers (dandelion, daisy, clover, speedwell, horsetail)
 */
import * as THREE from 'three';
import { drawTexture, seeded } from '../../core/canvasTex.js';

/** Irregular convex-ish polygon path around (x, y). */
function stonePath(ctx, x, y, r, rnd, sides) {
  ctx.beginPath();
  const a0 = rnd() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = a0 + (i / sides) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const rr = r * (0.72 + rnd() * 0.4);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]);
  }
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  return pts;
}

function shadeHex(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
  return '#' + c.getHexString();
}

/**
 * Ballast: a tileable pile of angular stones painted in flat toon facets —
 * each stone gets a lit upper-left facet and a violet-grey lower-right shade.
 */
export function ballastTexture(seed = 11) {
  const S = 512;
  const rnd = seeded(seed);
  const cols = [
    ['#9a958f', 30], ['#86827d', 22], ['#74706c', 13], ['#9c8b7c', 10], ['#86766a', 6],
    ['#bdb7ae', 10], ['#cfc8bd', 4], ['#8d919b', 5],
  ];
  const total = cols.reduce((s, c) => s + c[1], 0);
  const pick = () => {
    let r = rnd() * total;
    for (const [c, w] of cols) { r -= w; if (r <= 0) return c; }
    return cols[0][0];
  };
  return drawTexture(S, S, (ctx) => {
    ctx.fillStyle = '#5d5957';
    ctx.fillRect(0, 0, S, S);
    const stones = [];
    for (let i = 0; i < 1500; i++) stones.push({ x: rnd() * S, y: rnd() * S, r: 6 + rnd() * rnd() * 11, c: pick(), sides: 5 + Math.floor(rnd() * 3), s: rnd() * 1e6 });
    for (const st of stones) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const x = st.x + dx * S, y = st.y + dy * S;
          if (x < -20 || x > S + 20 || y < -20 || y > S + 20) continue;
          const r2 = seeded(st.s | 0);
          // dark gap halo -> depth between stones
          ctx.fillStyle = 'rgba(52,48,56,0.4)';
          stonePath(ctx, x + 1.5, y + 2, st.r * 1.08, seeded(st.s | 0), st.sides);
          ctx.fill();
          // body (lower-right shade colour)
          ctx.fillStyle = shadeHex(st.c, 0.8);
          const pts = stonePath(ctx, x, y, st.r, r2, st.sides);
          ctx.fill();
          // lit facet: the same polygon shrunk toward the upper-left
          ctx.save();
          ctx.clip();
          ctx.fillStyle = st.c;
          ctx.beginPath();
          pts.forEach(([px, py], k) => {
            const qx = x - st.r * 0.22 + (px - x) * 0.92, qy = y - st.r * 0.25 + (py - y) * 0.9;
            k ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
          });
          ctx.closePath();
          ctx.fill();
          // small bright chip on the top edge of some stones
          if (st.r > 8 && (st.s % 3 < 1)) {
            ctx.fillStyle = shadeHex(st.c, 1.18);
            ctx.beginPath();
            ctx.ellipse(x - st.r * 0.3, y - st.r * 0.35, st.r * 0.35, st.r * 0.18, -0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }
  }, { wrap: true });
}

/** Near-white mottle: soft blotches for painted / concrete surfaces. */
export function mottleTexture(seed = 5) {
  const S = 256;
  const rnd = seeded(seed);
  return drawTexture(S, S, (ctx) => {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * S, y = rnd() * S, r = 10 + rnd() * 38;
      const light = rnd() < 0.5;
      ctx.fillStyle = light ? 'rgba(255,255,255,0.35)' : 'rgba(205,200,210,0.16)';
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        ctx.beginPath();
        ctx.ellipse(x + dx * S, y + dy * S, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // a few vertical drip streaks (weathering)
    for (let i = 0; i < 14; i++) {
      const x = rnd() * S, y = rnd() * S, h = 20 + rnd() * 60;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(190,184,196,0.22)');
      g.addColorStop(1, 'rgba(190,184,196,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 2 + rnd() * 3, h);
    }
  }, { wrap: true });
}

/** Diamond chain-link mesh, one diamond per tile (alpha texture). */
export function chainLinkTexture() {
  const S = 64;
  return drawTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = '#6f9a78';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[0, S / 2, S / 2, 0], [S / 2, 0, S, S / 2], [S, S / 2, S / 2, S], [S / 2, S, 0, S / 2]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // lit upper edges of the wires
    ctx.strokeStyle = '#a9ccb0';
    ctx.lineWidth = 1.5;
    for (const [x0, y0, x1, y1] of [[0, S / 2 - 1, S / 2, -1], [S / 2, -1, S, S / 2 - 1]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }, { wrap: true });
}

/**
 * Weed atlas (4 x 2 cells of 256 px).  Returns { tex, cells: {name: [u0,v0,u1,v1]} }.
 * Cards stand on their bottom edge; the painted plant grows upward from the cell's bottom centre.
 */
export function weedAtlas(seed = 21) {
  const CW = 256, CH = 256, COLS = 4, ROWS = 2;
  const W = CW * COLS, H = CH * ROWS;
  const rnd = seeded(seed);
  const cells = {};
  const names = ['tuft', 'tuftTall', 'tuftDry', 'dandelion', 'daisy', 'clover', 'speedwell', 'horsetail'];
  const tex = drawTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    names.forEach((name, i) => {
      const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx + 2, cy + 2, CW - 4, CH - 4);
      ctx.clip();
      ctx.translate(cx + CW / 2, cy + CH - 4);
      drawPlant(ctx, name, rnd);
      ctx.restore();
      cells[name] = [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / ROWS, ((i % COLS) + 1) / COLS, 1 - Math.floor(i / COLS) / ROWS];
    });
  });
  return { tex, cells };
}

/** Blade: a tapered curved leaf from (0,0) with height h and lean. */
function blade(ctx, x, h, lean, w, col, tip) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w, 0);
  ctx.quadraticCurveTo(x - w * 0.6 + lean * 0.4, -h * 0.55, x + lean, -h);
  ctx.quadraticCurveTo(x + w * 0.6 + lean * 0.4, -h * 0.55, x + w, 0);
  ctx.closePath();
  ctx.fill();
  if (tip) {
    ctx.fillStyle = tip;
    ctx.beginPath();
    ctx.moveTo(x + lean * 0.72 - w * 0.25, -h * 0.72);
    ctx.lineTo(x + lean, -h);
    ctx.lineTo(x + lean * 0.72 + w * 0.3, -h * 0.72);
    ctx.closePath();
    ctx.fill();
  }
}

function grassClump(ctx, rnd, n, hMin, hMax, spread, palette) {
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * spread;
    const h = hMin + rnd() * (hMax - hMin);
    const lean = (rnd() - 0.5) * h * 0.6 + x * 0.3;
    const c = palette[Math.floor(rnd() * palette.length)];
    blade(ctx, x, h, lean, 4 + rnd() * 4, c, rnd() < 0.5 ? '#dbe8a6' : null);
  }
}

function drawPlant(ctx, name, rnd) {
  const greens = ['#6f9a5a', '#7fa865', '#8fb872', '#9cc27a', '#5f8a55'];
  if (name === 'tuft') grassClump(ctx, rnd, 26, 70, 150, 120, greens);
  else if (name === 'tuftTall') grassClump(ctx, rnd, 22, 120, 235, 90, greens);
  else if (name === 'tuftDry') grassClump(ctx, rnd, 24, 60, 170, 130, ['#b9b27a', '#a8a56e', '#9cc27a', '#c7bf8c', '#8fb872']);
  else if (name === 'dandelion') {
    // rosette of toothed leaves + 3 flower heads on stalks
    for (let i = 0; i < 9; i++) blade(ctx, (rnd() - 0.5) * 60, 40 + rnd() * 40, (rnd() - 0.5) * 120, 9, rnd() < 0.5 ? '#6f9a5a' : '#86ad63');
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * 38 + (rnd() - 0.5) * 16, h = 110 + rnd() * 90;
      ctx.strokeStyle = '#7fa865'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x * 0.3, 0); ctx.quadraticCurveTo(x * 0.6, -h * 0.5, x, -h); ctx.stroke();
      if (k === 2 && rnd() < 0.8) { // one seed head
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.arc(x, -h - 6, 17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e6e2da'; ctx.beginPath(); ctx.arc(x + 3, -h - 3, 9, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#e8a92e';
        ctx.beginPath(); ctx.arc(x, -h - 4, 17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd84a';
        for (let p = 0; p < 14; p++) {
          const a = (p / 14) * Math.PI * 2;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 11, -h - 4 + Math.sin(a) * 8, 7, 3.5, a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fff29a'; ctx.beginPath(); ctx.arc(x - 3, -h - 8, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (name === 'daisy') {
    // harujion: thin stems with small white/pink rayed flowers
    grassClump(ctx, rnd, 8, 40, 90, 90, greens);
    for (let k = 0; k < 6; k++) {
      const x = (rnd() - 0.5) * 150, h = 120 + rnd() * 110;
      ctx.strokeStyle = '#86ad63'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(x * 0.25, 0); ctx.quadraticCurveTo(x * 0.5, -h * 0.6, x, -h); ctx.stroke();
      ctx.fillStyle = rnd() < 0.4 ? '#f7dbe6' : '#fbfbf6';
      for (let p = 0; p < 16; p++) {
        const a = (p / 16) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 11, -h + Math.sin(a) * 7, 7, 2.4, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(x, -h, 5.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (name === 'clover') {
    // white clover: trefoil leaves low, round white flower balls
    for (let i = 0; i < 16; i++) {
      const x = (rnd() - 0.5) * 170, y = -10 - rnd() * 55;
      ctx.strokeStyle = '#7fa865'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x * 0.6, 0); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = rnd() < 0.5 ? '#7fae62' : '#94bf72';
      for (let l = 0; l < 3; l++) {
        const a = -Math.PI / 2 + (l - 1) * 2.1;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 7, 9, 7, a, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let k = 0; k < 4; k++) {
      const x = (rnd() - 0.5) * 140, h = 70 + rnd() * 50;
      ctx.strokeStyle = '#86ad63'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x * 0.5, 0); ctx.lineTo(x, -h); ctx.stroke();
      ctx.fillStyle = '#f6f4ea'; ctx.beginPath(); ctx.arc(x, -h - 8, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e4e3d6'; ctx.beginPath(); ctx.arc(x + 4, -h - 4, 8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (name === 'speedwell') {
    // inu-no-fuguri: low mat of leaves dotted with tiny sky-blue flowers
    for (let i = 0; i < 40; i++) {
      const x = (rnd() - 0.5) * 200, y = -rnd() * 60;
      ctx.fillStyle = rnd() < 0.5 ? '#6f9a5a' : '#8fb872';
      ctx.beginPath(); ctx.ellipse(x, y - 6, 10, 7, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = (rnd() - 0.5) * 190, y = -10 - rnd() * 60;
      ctx.fillStyle = '#7fa6e8';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (name === 'horsetail') {
    // tsukushi shoots (brown) among sugina (green feathery)
    for (let k = 0; k < 5; k++) {
      const x = (rnd() - 0.5) * 150, h = 100 + rnd() * 90;
      ctx.strokeStyle = '#8fb872'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -h); ctx.stroke();
      ctx.lineWidth = 2;
      for (let s = 0.3; s < 1; s += 0.12) {
        ctx.beginPath(); ctx.moveTo(x, -h * s); ctx.lineTo(x - 22 * (1.1 - s), -h * s + 14); ctx.moveTo(x, -h * s); ctx.lineTo(x + 22 * (1.1 - s), -h * s + 14); ctx.stroke();
      }
    }
    for (let k = 0; k < 4; k++) {
      const x = (rnd() - 0.5) * 120, h = 70 + rnd() * 60;
      ctx.fillStyle = '#d9c7a4'; ctx.fillRect(x - 5, -h, 10, h);
      ctx.fillStyle = '#9a7a55';
      for (let s = 0.25; s < 0.9; s += 0.2) ctx.fillRect(x - 7, -h * s, 14, 4);
      ctx.fillStyle = '#a98865';
      ctx.beginPath(); ctx.ellipse(x, -h - 16, 9, 22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}
