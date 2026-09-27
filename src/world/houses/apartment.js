/**
 * The small two-storey アパート on the north row (plan.special === 'apartment').
 *
 * The shell (siding walls, parapet roof, unit doors + kitchen windows on the
 * front, balconies on the levee side) comes from the regular builders; this
 * file adds what makes it read as a rental block from the north road:
 *   - the open 2F corridor (外廊下) with its slab, solid railing panel and
 *     steel columns, a canopy over it and corridor lights (warm, unlit)
 *   - the outside steel stair running along the front, with a landing
 *   - a mailbox bank, the building name board, concrete forecourt and a
 *     short block wall at the road edge
 *
 * Lot-local coordinates (front = +z).  The front strip between the block
 * and the road is ~2.6 m (plan.js sets the block back for it).
 */
import { FOUND, STOREY } from './plan.js';
import { wallV, WALL_U_PERIOD } from './textures.js';
import { decalQuad } from './openings.js';
import { fenceRun } from './exterior.js';
import { shade } from '../../core/toon.js';

const STEEL = '#8d9197';
const STAIR_W = 0.85; // stair flight width
const CORR_D = 1.15; // corridor depth (wall face -> railing outer face)

export function buildApartment(B, P, D) {
  const b = P.main;
  const r = P.r;
  const x0 = b.x0, x1 = b.x1, z1 = b.z1;
  const yF = FOUND + STOREY; // 2F floor level
  const zone = P.zones[1];
  const wallUV = (fid, p) => [(p[0] + p[2]) / WALL_U_PERIOD, wallV(zone.band, p[1] - FOUND)];
  const g = (x, z) => P.gy(x, z);
  const zc = z1 + CORR_D; // corridor outer edge
  const zs0 = zc + 0.05, zs1 = zs0 + STAIR_W; // stair flight band in front of the corridor
  const land1 = x0 + 1.05; // landing spans x0 .. land1

  // --- forecourt: concrete from the wall to the road edge -------------------------
  const edgeZ = P.D / 2 + (P.lot.setback ?? 0) + 0.01;
  const g0 = Math.min(g(x0, edgeZ), g(x1, edgeZ), g(x0, z1));
  B.box('solid', x0 - 0.25, g0 - 0.2, z1, x1 + 0.25, g0 + 0.035, edgeZ - 0.02, '#c3c0b8', { skip: 'y' });
  for (let x = x0 + 1.8; x < x1 - 0.3; x += 1.8) B.box('small', x, g0 + 0.035, z1, x + 0.03, g0 + 0.04, edgeZ - 0.02, '#aeaba4');

  // --- 2F corridor slab, canopy, railing panel ---------------------------------------
  B.box('solid', x0, yF - 0.22, z1, x1, yF, zc, '#c9c7c2', { colors: { y: shade(P.soffit, -0.02), Z: '#e3e0d8' } });
  B.shadowBox(x0, yF - 0.22, z1 + 0.01, x1, yF, zc);
  const canY = b.top - 0.02;
  B.box('solid', x0 - 0.05, canY, z1, x1 + 0.05, canY + 0.14, zc + 0.08, '#e3e0d8', { colors: { y: P.soffit } });
  B.shadowBox(x0 - 0.05, canY, z1 + 0.01, x1 + 0.05, canY + 0.14, zc + 0.08);
  // railing: solid siding panel (the building's face from the road), open at the landing
  const rh = 1.1;
  B.box('wall', land1, yF, zc - 0.1, x1, yF + rh, zc, zone.color, { uv: wallUV, skip: 'y' });
  B.box('wall', x1 - 0.1, yF, z1, x1, yF + rh, zc - 0.1, zone.color, { uv: wallUV, skip: 'yzZ' });
  B.box('metal', land1 - 0.02, yF + rh, zc - 0.12, x1 + 0.02, yF + rh + 0.05, zc + 0.02, '#9aa1a8');
  B.box('metal', x1 - 0.12, yF + rh, z1, x1 + 0.02, yF + rh + 0.05, zc - 0.12, '#9aa1a8');
  B.shadowBox(land1, yF, zc - 0.1, x1, yF + rh + 0.05, zc);
  // name board on the railing
  B.pushT((land1 + x1) / 2 + 0.6, 0, zc, 0);
  B.box('solid', -0.85, yF + 0.36, 0, 0.85, yF + 0.78, 0.03, '#f4f1e8', { skip: 'z' });
  decalQuad(B, D, 'aptSign', 0, yF + 0.57, 0.034, 1.62, 0.36);
  B.pop();
  // steel columns at the corridor edge + corridor lights
  const cols = [land1, (land1 + x1) / 2, x1 - 0.08];
  for (const cx of cols) {
    B.box('metal', cx - 0.06, g(cx, zc) - 0.05, zc - 0.2, cx + 0.06, yF - 0.22, zc - 0.08, STEEL);
    B.box('solid', cx - 0.12, g(cx, zc) - 0.05, zc - 0.26, cx + 0.12, g(cx, zc) + 0.12, zc - 0.02, '#b9b6ae');
  }
  const half = (x1 - x0) / 2;
  for (let k = 0; k < 2; k++) {
    const lx = x0 + k * half + 1.55;
    for (const ly of [yF - 0.23, canY - 0.005]) {
      B.box('unlit', lx - 0.12, ly - 0.05, z1 + 0.45, lx + 0.12, ly, z1 + 0.65, '#ffe6b0');
      B.box('small', lx - 0.14, ly - 0.005, z1 + 0.43, lx + 0.14, ly + 0.002, z1 + 0.67, '#e9e6de');
    }
    // unit number plates beside each door (both floors)
    for (const fy of [FOUND, yF]) B.box('small', x0 + k * half + 0.2, fy + 1.55, z1 + 0.001, x0 + k * half + 0.36, fy + 1.64, z1 + 0.014, '#f1efe9');
  }

  // --- outside stair ---------------------------------------------------------------------
  // landing at 2F level (x0 .. land1), flight runs down towards +x in front of the corridor
  B.box('solid', x0, yF - 0.2, zc - 0.1, land1, yF, zs1, '#c9c7c2', { colors: { y: P.soffit } });
  B.shadowBox(x0, yF - 0.2, zc - 0.1, land1, yF, zs1);
  const nSteps = Math.round((yF - g(land1, zs0)) / 0.2);
  const rise = (yF - g(land1 + 3.6, zs0)) / nSteps;
  const run = 0.245;
  const xBot = land1 + nSteps * run;
  for (let i = 1; i < nSteps; i++) {
    const ty = yF - i * rise;
    const tx = land1 + i * run;
    B.box('solid', tx - 0.02, ty - 0.035, zs0 + 0.04, tx + run, ty, zs1 - 0.04, i % 2 ? '#a9aeb3' : '#b1b5ba', { skip: 'y' });
  }
  const gb = g(xBot, (zs0 + zs1) / 2);
  for (const zz of [zs0 + 0.02, zs1 - 0.02]) {
    B.beam('metal', [land1, yF - 0.12, zz], [xBot + 0.1, gb - 0.02, zz], 0.04, 0.22, STEEL, { centerY: true });
  }
  B.box('solid', xBot - 0.1, gb - 0.05, zs0 - 0.05, xBot + 0.35, gb + 0.06, zs1 + 0.05, '#b9b6ae');
  B.shadowPoly([[land1, yF, zs0], [xBot, gb, zs0], [xBot, gb, zs1], [land1, yF, zs1]]);
  // handrails: outer + inner, posts every ~1 m, plus the landing's railing
  for (const zz of [zs0 + 0.02, zs1 - 0.02]) {
    B.beam('metal', [land1, yF + 0.9, zz], [xBot, gb + 0.9, zz], 0.04, 0.04, STEEL, { centerY: true });
    for (let x = land1 + 0.9; x < xBot - 0.2; x += 1.0) {
      const t = (x - land1) / (xBot - land1);
      const y = yF + (gb - yF) * t;
      B.box('small', x - 0.018, y, zz - 0.018, x + 0.018, y + 0.9, zz + 0.018, STEEL);
    }
  }
  B.box('metal', x0, yF + 0.95, zs1 - 0.05, land1, yF + 1.0, zs1, STEEL);
  B.box('metal', x0, yF + 0.95, zc - 0.1, x0 + 0.05, yF + 1.0, zs1, STEEL);
  B.box('metal', x0 - 0.02, yF, zs1 - 0.06, x0 + 0.05, yF + 0.97, zs1, STEEL);
  B.box('solid', x0, yF + 0.1, zs1 - 0.03, land1, yF + 0.9, zs1 - 0.02, '#d9e2e8');
  B.box('solid', x0 + 0.02, yF + 0.1, zc - 0.1, x0 + 0.03, yF + 0.9, zs1 - 0.05, '#d9e2e8');
  (P.solids ||= []).push({ x0: land1 + 0.6, x1: xBot + 0.3, z0: zs0, z1: zs1 });
  // landing column
  B.box('metal', x0 + 0.02, g(x0, zs1) - 0.05, zs1 - 0.14, x0 + 0.14, yF - 0.2, zs1 - 0.02, STEEL);

  // --- mailbox bank at the right end of the forecourt ---------------------------------
  const mx = x1 - 0.75, mz = edgeZ - 0.55;
  const gm = g(mx, mz);
  B.box('metal', mx - 0.03, gm, mz - 0.03, mx + 0.03, gm + 0.85, mz + 0.03, STEEL);
  B.box('solid', mx - 0.48, gm + 0.85, mz - 0.18, mx + 0.48, gm + 1.3, mz + 0.18, '#e9e7e1');
  B.box('small', mx - 0.5, gm + 1.3, mz - 0.2, mx + 0.5, gm + 1.34, mz + 0.22, '#9aa1a8');
  B.pushT(mx, 0, mz + 0.181, 0);
  for (let k = 0; k < 4; k++) decalQuad(B, D, 'mailbox', -0.36 + k * 0.24, gm + 1.075, 0.001, 0.21, 0.19);
  B.pop();
  B.shadowBox(mx - 0.48, gm + 0.85, mz - 0.18, mx + 0.48, gm + 1.34, mz + 0.18);
  // short block wall at the road edge on both sides of the entrance
  const fz = edgeZ - 0.08;
  fenceRun(B, P, D, -P.W / 2 + 0.05, x0 + 0.9, fz, 'x', 'block', 0.9, true);
  fenceRun(B, P, D, mx + 0.6, P.W / 2 - 0.05, fz, 'x', 'block', 0.9, true);
  // a tenant's pots and a bucket by the ground-floor doors
  for (let k = 0; k < 2; k++) {
    if (r() < 0.35) continue;
    const px = x0 + k * half + 1.55 + r.range(0.2, 0.6);
    D.pottedPlant(B, px, g(px, z1 + 0.35), z1 + 0.35, r);
  }
}
