/**
 * 松本たばこ店 — a tiny Showa tobacco & sundries kiosk built into the front of
 * a family house on the station-front road.  Tiled counter window with small
 * sliding panes, the classic red たばこ enamel sign, 切手・塩 plates, tiled
 * lean-to eave with the shop signboard, house entrance with name plate and
 * mailbox, potted plants, a futon airing over the upstairs railing.
 */
import { shopHouse, room, hisashi } from './shell.js';
import { pendant, poster, pottedPlant, manekiNeko } from './parts.js';

export function buildTabako(S) {
  const { B, A, W, D } = S;
  const F = S.frontY + 0.14;
  const Z = D / 2;
  const hs = shopHouse(S, {
    W, D, F, H1: 3.15, H2: 2.65, floors: 2,
    wall1: { kind: 'plaster', color: '#ece2cc' }, wall2: { kind: 'wood', color: '#9a7a5a' }, sides: { kind: 'plaster', color: '#e8dcc4' },
    base: '#9a948c',
    open: [{ x0: -2.95, x1: -0.6, y1: 2.0 }, { x0: 0.55, x1: 2.35, y1: 2.0 }],
    win2: [{ x: -1.5, w: 1.6, h: 1.0, y: 1.45 }, { x: 1.7, w: 1.2, h: 0.9, y: 1.35, rail: true }],
    sideWin: [{ side: -1, z: -1.2, w: 1.0, h: 0.9, y: 1.5 }, { side: -1, z: 0.5, w: 1.0, h: 0.9, y: 4.3 }],
    roof: { type: 'gable', color: '#4f5864', rise: 1.5, overZ: 0.7 },
    bandColor: '#6a4e3a',
  });
  const zf = Z - 0.08;

  // --- kiosk counter window (x -2.95 .. -0.6)
  const k0 = -2.95, k1 = -0.6;
  B.box('rows', k0, F, zf - 0.05, k1, F + 0.78, zf + 0.02, '#a8c4d4'); // small tiles below
  B.box('solid', k0 - 0.05, F + 0.78, zf - 0.3, k1 + 0.05, F + 0.84, Z + 0.3, '#c8d8e0'); // tiled ledge
  B.box('solid', k0, F + 1.92, zf - 0.05, k1, F + 2.0, zf + 0.05, '#6a4e3a');
  for (let i = 0; i < 4; i++) {
    const w = (k1 - k0) / 4, px = k0 + w * (i + 0.5), zz = zf + (i % 2 ? -0.03 : 0);
    B.box('solid', px - w / 2, F + 0.84, zz - 0.015, px - w / 2 + 0.035, F + 1.92, zz + 0.015, '#8e949a');
    B.box('solid', px + w / 2 - 0.035, F + 0.84, zz - 0.015, px + w / 2, F + 1.92, zz + 0.015, '#8e949a');
    B.box('solid', px - w / 2, F + 1.36, zz - 0.012, px + w / 2, F + 1.39, zz + 0.012, '#8e949a');
    if (i !== 1) B.quad('glass', px, F + 1.38, zz, w - 0.07, 1.06, '#fff');
  }
  // inside the kiosk: cigarette shelves, tiny TV, maneki-neko on the counter, bulb
  room(S, k0, k1, Z - 1.6, zf - 0.1, F + 0.84, F + 2.4, { floor: '#c8b89a', wall: '#efe4cc', back: '#e4d8bc', skirting: false });
  B.quad('inner', (k0 + k1) / 2, F + 1.55, Z - 1.58, k1 - k0 - 0.1, 0.9, '#ffffff', A.get('kShelf1'));
  B.box('inner', k1 - 0.55, F + 0.84, Z - 1.4, k1 - 0.2, F + 1.12, Z - 1.1, '#5a5a5e');
  B.box('lit', k1 - 0.52, F + 0.9, Z - 1.099, k1 - 0.23, F + 1.08, Z - 1.095, '#9ab8c8');
  manekiNeko(S, k0 + 0.35, F + 0.84, zf - 0.22, 0, 0.7);
  pendant(S, (k0 + k1) / 2, F + 2.4, Z - 0.8, 0.35, { style: 'bulb' });
  // red たばこ sign above the window, small plates beside it
  B.box('solid', k0 + 0.1, F + 2.1, Z, k1 - 0.1, F + 2.58, Z + 0.07, '#b8342e', { rect: A.get('tTabako'), face: 'Z', colors: { Z: '#ffffff' } });
  B.box('solid', -0.5, F + 1.25, Z, 0.05, F + 1.6, Z + 0.02, '#ffffff', { rect: A.sub('tSmall', 0, 0, 0.63, 1), face: 'Z' });
  B.box('solid', -0.42, F + 0.8, Z, -0.03, F + 1.18, Z + 0.02, '#ffffff', { rect: A.sub('tSmall', 0.64, 0, 0.36, 1), face: 'Z' });
  poster(S, -1.1, F + 0.4, Z, 0.36, 0.52, A.get('matsuri'), { off: 0.005 });

  // --- house entrance (x 0.6 .. 2.3): wooden sliding door with frosted glass
  const d0 = 0.55, d1 = 2.35;
  B.box('wood', d0 - 0.1, F, zf - 0.1, d0, F + 2.1, zf + 0.06, '#6a4e3a');
  B.box('wood', d1, F, zf - 0.1, d1 + 0.1, F + 2.1, zf + 0.06, '#6a4e3a');
  B.box('wood', d0 - 0.1, F + 2.0, zf - 0.1, d1 + 0.1, F + 2.1, zf + 0.06, '#6a4e3a');
  for (let i = 0; i < 2; i++) {
    const w = (d1 - d0) / 2, px = d0 + w * (i + 0.5), zz = zf + (i ? -0.04 : 0);
    B.box('wood', px - w / 2, F, zz - 0.02, px + w / 2, F + 0.45, zz + 0.02, '#7a5a40');
    B.box('solid', px - w / 2, F + 0.45, zz - 0.02, px - w / 2 + 0.05, F + 2.0, zz + 0.02, '#7a5a40');
    B.box('solid', px + w / 2 - 0.05, F + 0.45, zz - 0.02, px + w / 2, F + 2.0, zz + 0.02, '#7a5a40');
    for (let k = 1; k < 4; k++) B.box('solid', px - w / 2, F + 0.45 + k * 0.39, zz - 0.02, px + w / 2, F + 0.47 + k * 0.39, zz + 0.02, '#7a5a40');
    B.quad('solid', px, F + 1.22, zz - 0.005, w - 0.1, 1.5, '#e8ecee');
  }
  B.quad('inner', 1.45, F + 1.2, zf - 0.25, 1.8, 2.0, '#d8d0c0'); // genkan behind the frosted glass
  B.box('solid', d0 - 0.2, S.gy(1.4, Z + 0.4) - 0.08, Z, d1 + 0.2, F - 0.02, Z + 0.45, '#b8b2a8'); // step
  B.box('solid', 2.55, F + 1.5, Z, 2.85, F + 1.62, Z + 0.02, '#f4efe2'); // name plate
  B.box('solid', 2.5, F + 0.9, Z, 2.9, F + 1.3, Z + 0.14, '#b8342e'); // mailbox
  B.box('solid', 2.5, F + 1.3, Z, 2.9, F + 1.33, Z + 0.16, '#8a2a24');
  B.box('solid', 2.62, F + 1.72, Z, 2.72, F + 1.84, Z + 0.03, '#f4f4f0'); // bell

  // --- tiled eave, signboard, ashtray stand, bench, plants
  hisashi(S, -W / 2 - 0.1, W / 2 + 0.1, F + 2.95, Z, 0.7, 0.26, '#5a6470', { brackets: 3, bracket: '#4a3a30', fascia: '#4a3a30' });
  const sy = F + 3.5;
  B.box('solid', -2.6, sy - 0.32, Z + 0.06, 1.6, sy + 0.32, Z + 0.15, '#4a3a30');
  B.quad('solid', -0.5, sy, Z + 0.155, 4.0, 0.56, '#ffffff', A.get('tSign'));
  const ax = -3.55, az = Z + 0.3, ay = S.gy(ax, az);
  B.cyl('solid', ax, ay, az, 0.15, 0.03, '#3a3a40', { seg: 10 });
  B.cyl('solid', ax, ay, az, 0.03, 0.72, '#8e949a', { seg: 6 });
  B.cyl('solid', ax, ay + 0.72, az, 0.14, 0.14, '#c8322c', { seg: 12 });
  B.cyl('solid', ax, ay + 0.86, az, 0.12, 0.02, '#8e949a', { seg: 12 });
  // wooden bench under the kiosk window + potted plants by the door
  const bx = -1.75, bz = Z + 0.55, by = S.gy(bx, bz);
  B.box('wood', bx - 0.7, by + 0.4, bz - 0.17, bx + 0.7, by + 0.45, bz + 0.17, '#9a7250');
  for (const sx of [-0.6, 0.6]) B.box('solid', bx + sx - 0.03, by, bz - 0.14, bx + sx + 0.03, by + 0.4, bz + 0.14, '#6a4e3a');
  const pots = [[2.6, 0.35, 0.9, '#b86f4f'], [2.95, 0.55, 0.7, '#8a8f98'], [0.2, 0.3, 0.6, '#b86f4f']];
  for (const [px, pz, s, col] of pots) pottedPlant(S, px, S.gy(px, Z + pz), Z + pz, s, { pot: col, flowers: ['#8a6ad8', '#f7b6c8'], nf: 4 });
  B.box('solid', 2.9, S.gy(3.0, Z + 1.0), Z + 0.85, 3.25, S.gy(3.0, Z + 1.0) + 0.2, Z + 1.15, '#f4f4f0');
  for (let i = 0; i < 3; i++) B.sphere('solid', 2.98 + i * 0.12, S.gy(3.0, Z + 1.0) + 0.25, Z + 1.0, 0.08, '#7fae62', { ico: 0 });

  // --- futon airing over the upstairs railing (right window)
  const y2 = hs.y2;
  const fy = y2 + 1.35 - 0.45 + 0.78; // rail top
  B.swayFn = (lx, ly) => Math.max(0, (fy - ly) / 0.8) * 0.3;
  B.box('cloth', 1.12, fy - 0.78, Z + 0.12, 2.28, fy, Z + 0.17, '#f2c6c0');
  B.box('cloth', 1.12, fy - 0.05, Z - 0.02, 2.28, fy + 0.03, Z + 0.17, '#f2c6c0');
  B.swayFn = null;
  for (let i = 0; i < 2; i++) B.box('deco', 1.35 + i * 0.7, fy - 0.2, Z + 0.17, 1.42 + i * 0.7, fy + 0.06, Z + 0.21, '#e8d8a8'); // clips
  return hs;
}
