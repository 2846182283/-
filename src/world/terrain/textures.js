/**
 * terrain/textures — every ground texture, painted on canvas at build time.
 *
 * Style: hand-painted anime background, not photographic.  Large soft
 * blotches + a few crisp, deliberate details (cracks, seams, joints) instead
 * of per-pixel noise.  Tileable textures draw each feature with wrap-around
 * copies so repeats have no seams.
 *
 *   asphalt   1024² / 8 m   mid blue-grey, sealed cracks, repair patches, aggregate
 *   concrete  512²  / 2 m   warm light grey slab with joints + broom marks
 *   plaza     1024² / 6.4 m 0.4 m grey square tiles, colour variation, cracked tiles, weeds
 *   gravel    512²  / 3 m   beige pebbles (levee path, rail inspection paths, lots)
 *   detail    512² linear   R = grass strokes, G = soil speckle, B = macro noise (ground shader)
 *   flowers   1024² RGBA    clover / dandelion / violets overlay (levee grass)
 *   revetment 512²  / 4 m   diamond-laid concrete blocks (間知ブロック)
 *   gutter    512x256       concrete cover | steel grate
 *   tactile   256x128       linear guide block | warning dot block
 *   marks     2048² atlas   road paint, road text characters, pictograms
 *   decals    2048² atlas   manholes, patches, stains, spray marks, leaves
 */
import { drawTexture, seeded, roundRect, FONTS } from '../../core/canvasTex.js';

// ---------------------------------------------------------------------------
// small painting helpers
// ---------------------------------------------------------------------------
/** Call fn(ox, oy) for the 9 wrap-around offsets (tileable features). */
function wrap(W, H, fn) {
  for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) fn(ox, oy);
}

function blotches(ctx, W, H, rnd, n, rMin, rMax, colors, alpha) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, r = rMin + rnd() * (rMax - rMin);
    const col = colors[Math.floor(rnd() * colors.length)];
    const a = alpha * (0.5 + rnd() * 0.5);
    wrap(W, H, (ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }
}

/** '#rrggbb' + alpha -> css rgba() (sRGB, no colour management involved). */
function rgba(hex, a) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function speckle(ctx, W, H, rnd, n, colors, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = rMin + rnd() * (rMax - rMin);
    ctx.fillStyle = rgba(colors[Math.floor(rnd() * colors.length)], alpha * (0.5 + rnd() * 0.5));
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Random-walk crack polyline (with a branch or two). Returns the points. */
function crackPath(rnd, x, y, len, step, dir) {
  const pts = [[x, y]];
  let a = dir;
  for (let d = 0; d < len; d += step) {
    a += (rnd() - 0.5) * 0.9;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push([x, y]);
  }
  return pts;
}

function strokePath(ctx, pts, ox = 0, oy = 0) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
  ctx.stroke();
}

function crack(ctx, W, H, rnd, x, y, len, width, color, alpha, tile = true) {
  const pts = crackPath(rnd, x, y, len, 6 + rnd() * 6, rnd() * Math.PI * 2);
  const branches = [];
  for (let k = 0; k < 2; k++) {
    if (rnd() < 0.6) {
      const p = pts[Math.floor(rnd() * pts.length)];
      branches.push(crackPath(rnd, p[0], p[1], len * (0.2 + rnd() * 0.3), 5, rnd() * Math.PI * 2));
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const draw = (ox, oy) => {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    strokePath(ctx, pts, ox, oy);
    ctx.lineWidth = Math.max(0.8, width * 0.7);
    for (const b of branches) strokePath(ctx, b, ox, oy);
  };
  if (tile) wrap(W, H, draw);
  else draw(0, 0);
}

// ---------------------------------------------------------------------------
// asphalt
// ---------------------------------------------------------------------------
export function asphaltTexture() {
  const S = 1024;
  const rnd = seeded(4101);
  return drawTexture(S, S, (ctx) => {
    ctx.fillStyle = '#868a93';
    ctx.fillRect(0, 0, S, S);
    // big soft tonal blotches (hand painted variation, kept subtle so repeats don't show)
    blotches(ctx, S, S, rnd, 60, 60, 220, ['#8f939b', '#858992', '#8c8d94', '#878c96'], 0.4);
    // repair patches: slightly darker newer asphalt with tar-sealed seams
    for (let i = 0; i < 2; i++) {
      const w = 110 + rnd() * 160, h = 80 + rnd() * 140;
      const x = rnd() * S, y = rnd() * S;
      const dark = i % 2 === 0;
      wrap(S, S, (ox, oy) => {
        ctx.fillStyle = dark ? 'rgba(122,126,135,0.55)' : 'rgba(146,150,158,0.5)';
        ctx.fillRect(x + ox, y + oy, w, h);
        ctx.strokeStyle = 'rgba(92,95,102,0.55)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + ox, y + oy, w, h);
      });
    }
    // fine aggregate — sparse, painterly dots, never per-pixel noise
    speckle(ctx, S, S, rnd, 7000, ['#a1a5ad', '#a9acb1', '#979ba3'], 0.6, 1.5, 0.5);
    speckle(ctx, S, S, rnd, 4000, ['#6f737b', '#787c84'], 0.6, 1.4, 0.4);
    speckle(ctx, S, S, rnd, 300, ['#b3b3b0', '#a8a49c'], 1.2, 2.4, 0.5);
    // sealed crack "tar snakes": long wavy darker lines
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const pts = [];
      let x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI * 2;
      for (let k = 0; k < 40; k++) {
        a += (rnd() - 0.5) * 0.35;
        x += Math.cos(a) * 10;
        y += Math.sin(a) * 10;
        pts.push([x, y]);
      }
      wrap(S, S, (ox, oy) => {
        ctx.strokeStyle = 'rgba(100,103,112,0.35)';
        ctx.lineWidth = 3.5;
        strokePath(ctx, pts, ox, oy);
        ctx.strokeStyle = 'rgba(84,87,95,0.45)';
        ctx.lineWidth = 1.6;
        strokePath(ctx, pts, ox, oy);
      });
    }
    // thin hairline cracks
    for (let i = 0; i < 16; i++) crack(ctx, S, S, rnd, rnd() * S, rnd() * S, 60 + rnd() * 160, 1.4, '#5c6068', 0.65);
    // alligator cracking cluster
    for (let i = 0; i < 2; i++) {
      const cx = rnd() * S, cy = rnd() * S;
      for (let k = 0; k < 10; k++) crack(ctx, S, S, rnd, cx + (rnd() - 0.5) * 70, cy + (rnd() - 0.5) * 50, 30 + rnd() * 30, 1.1, '#555960', 0.6);
    }
    // small light scuffs / dried water marks
    blotches(ctx, S, S, rnd, 16, 10, 30, ['#9da0a6'], 0.35);
  }, { repeat: [1, 1] });
}

// ---------------------------------------------------------------------------
// concrete (aprons, kerbs, gutter rims, stairs)
// ---------------------------------------------------------------------------
export function concreteTexture() {
  const S = 512;
  const rnd = seeded(5150);
  return drawTexture(S, S, (ctx) => {
    ctx.fillStyle = '#d9d6cf';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, S, rnd, 40, 30, 120, ['#cfccc4', '#e2dfd8', '#d2cfc6', '#c9c7c2'], 0.6);
    // broom finish: faint horizontal strokes
    for (let i = 0; i < 120; i++) {
      const y = rnd() * S, x = rnd() * S, l = 40 + rnd() * 140;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(190,187,180,0.35)' : 'rgba(232,230,224,0.35)';
      ctx.lineWidth = 1;
      wrap(S, S, (ox, oy) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + l + ox, y + oy + (rnd() - 0.5) * 2);
        ctx.stroke();
      });
    }
    speckle(ctx, S, S, rnd, 900, ['#b9b6ae', '#c4c0b8'], 0.6, 1.4, 0.55);
    speckle(ctx, S, S, rnd, 80, ['#a9a59c'], 1.0, 2.2, 0.5);
    // rain streak stains
    blotches(ctx, S, S, rnd, 6, 20, 60, ['#bdb9b0'], 0.35);
    // slab control joints on the tile border
    ctx.fillStyle = 'rgba(150,146,138,0.9)';
    ctx.fillRect(0, 0, S, 3);
    ctx.fillRect(0, 0, 3, S);
    ctx.fillStyle = 'rgba(236,234,228,0.6)';
    ctx.fillRect(0, 3, S, 1);
    ctx.fillRect(3, 0, 1, S);
    crack(ctx, S, S, rnd, rnd() * S, rnd() * S, 90, 1.1, '#9d9a92', 0.6);
  }, { repeat: [1, 1] });
}

// ---------------------------------------------------------------------------
// plaza tiles
// ---------------------------------------------------------------------------
export function plazaTexture() {
  const S = 1024, N = 16, T = S / N; // 16 x 16 tiles of 0.4 m
  const rnd = seeded(777);
  const cols = ['#c0c1c0', '#bcbdbc', '#c4c5c3', '#b9bab9', '#bfbfbc', '#c3c2be', '#bbbdbf'];
  return drawTexture(S, S, (ctx) => {
    ctx.fillStyle = '#9a9994'; // joint mortar
    ctx.fillRect(0, 0, S, S);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let c = cols[Math.floor(rnd() * cols.length)];
        if (rnd() < 0.03) c = '#b6afa6'; // warm replacement tile
        if (rnd() < 0.03) c = '#aeb2b7'; // cool replacement tile
        const x = i * T + 1.5, y = j * T + 1.5, w = T - 3;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, w);
        // soft painted variation inside the tile
        const g = ctx.createLinearGradient(x, y, x + w, y + w);
        g.addColorStop(0, 'rgba(255,255,255,0.10)');
        g.addColorStop(1, 'rgba(120,115,110,0.10)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, w);
        ctx.save();
        ctx.translate(x, y);
        speckle(ctx, w, w, rnd, 30, ['#b6b2ab', '#e4e1db', '#aeaaa2'], 0.6, 1.4, 0.55);
        ctx.restore();
        // occasional stain
        if (rnd() < 0.08) {
          const r = 6 + rnd() * 14;
          const gx = x + rnd() * w, gy = y + rnd() * w;
          const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
          rg.addColorStop(0, 'rgba(120,118,112,0.28)');
          rg.addColorStop(1, 'rgba(120,118,112,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
        }
        // cracked tile
        if (rnd() < 0.035) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, w);
          ctx.clip();
          crack(ctx, S, S, rnd, x + rnd() * w, y, w * 1.4, 1.3, '#7b7872', 0.85, false);
          ctx.restore();
        }
      }
    }
    // tiny weeds in joints
    for (let k = 0; k < 22; k++) {
      const i = Math.floor(rnd() * N), j = Math.floor(rnd() * N);
      const horizontal = rnd() < 0.5;
      const x = horizontal ? i * T + rnd() * T : i * T;
      const y = horizontal ? j * T : j * T + rnd() * T;
      for (let b = 0; b < 7; b++) {
        ctx.strokeStyle = b % 2 ? '#7fa55e' : '#98bf6e';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const a = rnd() * Math.PI * 2;
        const l = 3 + rnd() * 6;
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
    }
    // dust in joints
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(rnd() * N) * T, y = rnd() * S;
      ctx.fillStyle = 'rgba(160,150,132,0.5)';
      ctx.fillRect(x - 1, y, 3, 6 + rnd() * 20);
    }
  }, { repeat: [1, 1] });
}

// ---------------------------------------------------------------------------
// gravel
// ---------------------------------------------------------------------------
export function gravelTexture() {
  const S = 512;
  const rnd = seeded(9090);
  return drawTexture(S, S, (ctx) => {
    ctx.fillStyle = '#cdc6b8';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, S, rnd, 30, 30, 90, ['#c6bfb1', '#d4cec2', '#c9c3b6'], 0.45);
    // pebbles: soft body + light top edge (hand painted)
    const cols = ['#b5ad9f', '#dcd6ca', '#aba497', '#d0cbc1', '#e7e3da', '#bfb6a6'];
    for (let i = 0; i < 1600; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1.4 + rnd() * 3.2;
      const c = cols[Math.floor(rnd() * cols.length)];
      const rot = rnd() * 3;
      wrap(S, S, (ox, oy) => {
        if (x + ox < -8 || x + ox > S + 8 || y + oy < -8 || y + oy > S + 8) return;
        ctx.fillStyle = 'rgba(130,122,110,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + ox + 0.8, y + oy + 1.0, r, r * 0.75, rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, r, r * 0.75, rot, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    speckle(ctx, S, S, rnd, 900, ['#f1ece2', '#8d8577'], 0.5, 1.0, 0.6);
  }, { repeat: [1, 1] });
}

// ---------------------------------------------------------------------------
// ground detail (linear, 3 channels) + flower overlay
// ---------------------------------------------------------------------------
function grayCanvas(S, seed, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = 'rgb(200,200,200)';
  ctx.fillRect(0, 0, S, S);
  paint(ctx, seeded(seed));
  return ctx.getImageData(0, 0, S, S).data;
}

export function detailTexture() {
  const S = 512;
  // R: grass — short blade strokes in clumps
  const R = grayCanvas(S, 11, (ctx, rnd) => {
    for (let i = 0; i < 70; i++) {
      const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 40;
      const v = rnd() < 0.5 ? 182 : 214;
      wrap(S, S, (ox, oy) => {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, `rgba(${v},${v},${v},0.7)`);
        g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
    // blades as thin filled triangles (strokes are very slow on some canvas backends)
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * S, y = rnd() * S;
      const l = 3 + rnd() * 7;
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.4;
      const v = rnd() < 0.55 ? 222 + Math.round(rnd() * 5) * 5 : 160 + Math.round(rnd() * 4) * 5;
      const w = 0.6 + rnd() * 0.5;
      ctx.fillStyle = `rgba(${v},${v},${v},0.8)`;
      const px = -Math.sin(a) * w, py = Math.cos(a) * w;
      wrap(S, S, (ox, oy) => {
        if (x + ox < -12 || x + ox > S + 12 || y + oy < -12 || y + oy > S + 12) return;
        ctx.beginPath();
        ctx.moveTo(x + ox - px, y + oy - py);
        ctx.lineTo(x + ox + px, y + oy + py);
        ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
        ctx.closePath();
        ctx.fill();
      });
    }
  });
  // G: soil — pebbles and dry crumbs
  const G = grayCanvas(S, 12, (ctx, rnd) => {
    for (let i = 0; i < 50; i++) {
      const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 50;
      const v = rnd() < 0.5 ? 186 : 212;
      wrap(S, S, (ox, oy) => {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, `rgba(${v},${v},${v},0.6)`);
        g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * S, y = rnd() * S, r = 0.8 + rnd() * 2.6;
      const v = rnd() < 0.5 ? 235 : 150;
      ctx.fillStyle = `rgba(${v},${v},${v},0.7)`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // B: macro noise (smooth value noise, tileable)
  const B = new Uint8ClampedArray(S * S * 4);
  {
    const rnd = seeded(13);
    const n = 8;
    const grid = [];
    for (let i = 0; i < n * n; i++) grid.push(rnd());
    const g = (a, b) => grid[((b + n) % n) * n + ((a + n) % n)];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const fx = (x / S) * n, fy = (y / S) * n;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const v = (g(ix, iy) * (1 - sx) + g(ix + 1, iy) * sx) * (1 - sy) + (g(ix, iy + 1) * (1 - sx) + g(ix + 1, iy + 1) * sx) * sy;
        B[(y * S + x) * 4] = 150 + v * 100;
      }
    }
  }
  return drawTexture(S, S, (ctx) => {
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      img.data[i * 4] = R[i * 4];
      img.data[i * 4 + 1] = G[i * 4];
      img.data[i * 4 + 2] = B[i * 4];
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, { wrap: true, linear: true });
}

export function flowerTexture() {
  const S = 1024;
  const rnd = seeded(3131);
  return drawTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    // clover patches (trefoils)
    for (let p = 0; p < 26; p++) {
      const cx = rnd() * S, cy = rnd() * S, pr = 30 + rnd() * 60;
      for (let k = 0; k < 40; k++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * pr;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const s = 2.4 + rnd() * 1.6;
        const col = rnd() < 0.5 ? '#a6cf7f' : '#8fbf6e';
        wrap(S, S, (ox, oy) => {
          if (x + ox < -20 || x + ox > S + 20 || y + oy < -20 || y + oy > S + 20) return;
          ctx.fillStyle = col;
          for (let l = 0; l < 3; l++) {
            const la = l * 2.094 + a;
            ctx.beginPath();
            ctx.arc(x + ox + Math.cos(la) * s, y + oy + Math.sin(la) * s, s, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      // white clover heads inside the patch
      for (let k = 0; k < 6; k++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * pr;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        wrap(S, S, (ox, oy) => {
          ctx.fillStyle = '#f4f1ea';
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f2d9e2';
          ctx.beginPath();
          ctx.arc(x + ox + 1, y + oy + 1.2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    // dandelions (bright yellow, the spring accent)
    for (let k = 0; k < 70; k++) {
      const x = rnd() * S, y = rnd() * S;
      wrap(S, S, (ox, oy) => {
        ctx.fillStyle = '#7fae5c';
        for (let l = 0; l < 5; l++) {
          const la = l * 1.256 + k;
          ctx.beginPath();
          ctx.ellipse(x + ox + Math.cos(la) * 6, y + oy + Math.sin(la) * 6, 6, 2, la, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f6cf3a';
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbe57a';
        ctx.beginPath();
        ctx.arc(x + ox - 1, y + oy - 1, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // violets / henbit / speedwell dots
    const small = ['#b69ad9', '#9cb6ef', '#d9a3c9', '#ffffff'];
    for (let k = 0; k < 240; k++) {
      const x = rnd() * S, y = rnd() * S;
      ctx.fillStyle = small[Math.floor(rnd() * small.length)];
      ctx.beginPath();
      ctx.arc(x, y, 1.8 + rnd() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { wrap: true });
}

// ---------------------------------------------------------------------------
// revetment blocks
// ---------------------------------------------------------------------------
export function revetmentTexture() {
  const S = 512, P = 64; // diamond period in px (~0.5 m blocks)
  const rnd = seeded(6060);
  const shades = [];
  for (let i = 0; i < 64; i++) shades.push(0.9 + rnd() * 0.16);
  return drawTexture(S, S, (ctx) => {
    const img = ctx.createImageData(S, S);
    const base = [182, 179, 170];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const a = (x + y) / P, b = (x - y + S) / P;
        const ia = Math.floor(a), ib = Math.floor(b);
        const fa = a - ia, fb = b - ib;
        const joint = Math.min(fa, 1 - fa, fb, 1 - fb) * P;
        const sh = shades[((ia % 8) * 8 + (ib % 8)) % 64];
        // bevel: lighter towards the upper-left edges of each block
        const bevel = fa < 0.1 || fb > 0.9 ? 1.05 : fa > 0.9 || fb < 0.1 ? 0.95 : 1.0;
        let k = sh * bevel;
        if (joint < 1.6) k = 0.8;
        else if (joint < 2.6) k = Math.min(k, 0.9);
        const i = (y * S + x) * 4;
        img.data[i] = base[0] * k;
        img.data[i + 1] = base[1] * k;
        img.data[i + 2] = base[2] * k;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // lichen / moss blotches and pits
    blotches(ctx, S, S, rnd, 26, 10, 40, ['#9aa57e', '#a9a58f', '#8e9a78'], 0.45);
    speckle(ctx, S, S, rnd, 700, ['#9c998f', '#cfccc4'], 0.6, 1.4, 0.5);
  }, { repeat: [1, 1] });
}

// ---------------------------------------------------------------------------
// gutter cover | grate
// ---------------------------------------------------------------------------
export function gutterTexture() {
  const W = 512, H = 256;
  const rnd = seeded(2222);
  return drawTexture(W, H, (ctx) => {
    // --- left: precast concrete cover (u across the channel, v along it)
    ctx.fillStyle = '#cfccc4';
    ctx.fillRect(0, 0, 256, 256);
    blotches(ctx, 256, 256, rnd, 10, 20, 60, ['#c4c1b8', '#d8d5ce'], 0.6);
    speckle(ctx, 256, 256, rnd, 250, ['#b3b0a8', '#e2dfd8'], 0.6, 1.4, 0.6);
    // bevelled edges
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, 256, 7);
    ctx.fillRect(0, 0, 7, 256);
    ctx.fillStyle = 'rgba(90,86,80,0.45)';
    ctx.fillRect(0, 249, 256, 7);
    ctx.fillRect(249, 0, 7, 256);
    // two lifting holes
    for (const y of [70, 186]) {
      ctx.fillStyle = '#4e5054';
      roundRect(ctx, 104, y - 12, 48, 24, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(40,40,44,0.8)';
      roundRect(ctx, 108, y - 8, 40, 12, 6);
      ctx.fill();
    }
    // dirt at the edges
    ctx.fillStyle = 'rgba(140,128,110,0.25)';
    ctx.fillRect(0, 230, 256, 26);
    // --- right: steel grating
    const X = 256;
    ctx.fillStyle = '#2f343b';
    ctx.fillRect(X, 0, 256, 256);
    // wet dark water glints inside the channel
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = `rgba(120,150,170,${0.18 + rnd() * 0.2})`;
      ctx.fillRect(X + 20 + rnd() * 200, rnd() * 256, 18 + rnd() * 30, 3);
    }
    // a few dry leaves caught below
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = ['#8a6a44', '#a8845a', '#6f5a40'][i % 3];
      ctx.beginPath();
      ctx.ellipse(X + 30 + rnd() * 196, rnd() * 256, 9, 4, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // frame
    ctx.strokeStyle = '#8f959c';
    ctx.lineWidth = 14;
    ctx.strokeRect(X + 7, 7, 242, 242);
    // bearing bars (across the channel = along u) with painted highlight
    for (let y = 20; y < 240; y += 16) {
      ctx.fillStyle = '#9ca3aa';
      ctx.fillRect(X + 12, y, 232, 7);
      ctx.fillStyle = '#c4cad0';
      ctx.fillRect(X + 12, y, 232, 2);
      ctx.fillStyle = '#6c737b';
      ctx.fillRect(X + 12, y + 6, 232, 1);
    }
    // cross rods
    ctx.fillStyle = 'rgba(140,148,156,0.9)';
    for (const x of [X + 70, X + 128, X + 186]) ctx.fillRect(x - 2, 14, 4, 228);
    // rust tint
    ctx.fillStyle = 'rgba(160,110,70,0.18)';
    ctx.fillRect(X + 14, 200, 228, 40);
  }, { mipmaps: true });
}

// ---------------------------------------------------------------------------
// tactile paving
// ---------------------------------------------------------------------------
export function tactileTexture() {
  const W = 256, H = 128;
  return drawTexture(W, H, (ctx) => {
    for (const X of [0, 128]) {
      ctx.fillStyle = '#e9b82c';
      ctx.fillRect(X, 0, 128, 128);
      ctx.fillStyle = '#f3c93e';
      ctx.fillRect(X + 3, 3, 122, 122);
      ctx.strokeStyle = 'rgba(160,120,30,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeRect(X + 1.5, 1.5, 125, 125);
    }
    // linear bars (run along v = walking direction)
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 28;
      ctx.fillStyle = '#c99a20';
      roundRect(ctx, x + 2, 12, 16, 106, 8);
      ctx.fill();
      ctx.fillStyle = '#fbd65a';
      roundRect(ctx, x, 10, 15, 104, 7.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,245,200,0.8)';
      ctx.fillRect(x + 3, 14, 3, 94);
    }
    // warning dots 5 x 5
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 5; i++) {
        const x = 128 + 16 + i * 24, y = 16 + j * 24;
        ctx.fillStyle = '#c99a20';
        ctx.beginPath();
        ctx.arc(x + 1.5, y + 1.8, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbd65a';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,248,210,0.9)';
        ctx.beginPath();
        ctx.arc(x - 2.5, y - 2.5, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

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
    paintCell('green', '#8fbf7a', 900); // school-route shoulder (faded)
    paintCell('blue', '#4f86c9', 500);
    // characters
    const drawChar = (ch, color, key) => {
      const [cx, cy] = alloc(key);
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${C * 0.9}px ${FONTS.gothic}`;
      const m = ctx.measureText(ch);
      const sx = Math.min(1.25, (C * 0.94) / Math.max(1, m.width));
      ctx.translate(cx + C / 2, cy + C / 2 + C * 0.03);
      ctx.scale(sx, 1);
      ctx.fillText(ch, 0, 0);
      // make strokes a touch bolder
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctx.strokeText(ch, 0, 0);
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
