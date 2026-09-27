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
 *
 * The two atlases (road paint + decals) live in terrain/atlases.js.
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
export function rgba(hex, a) {
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

export function crack(ctx, W, H, rnd, x, y, len, width, color, alpha, tile = true) {
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
