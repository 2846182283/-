/**
 * props/vending.js — 自動販売機 at SPOTS.vending plus their companions:
 * recycling bins (かん・びん / ペットボトル), plastic drink crates and のぼり flags.
 *
 * Machine anatomy (local frame, front = +Z, origin on the spot at spot.y):
 *   plinth + adjuster feet, cabinet in the machine colour, top cap,
 *   backlit brand header, recessed backlit display (3 shelves of drink dummies
 *   painted on the atlas) behind a clear pane with a bezel, lower door with
 *   とりだしぐち flap, right-hand control panel (LED readout, coin slot, bill
 *   slot, IC reader, return lever, coin-return cup), side ad panels, lock,
 *   anchor brackets.  The top always sits at spot.y + 1.83 (sakura drops a
 *   light sprinkle of petals there).
 */
import { SPOTS, LOTS, PLAZA, groundY } from '../../core/layout.js';
import { MACHINES } from './vendTex.js';
import { surfaceY } from './common.js';

const W = 1.0; // width
const DEP = 0.76; // cabinet depth
const TOP = 1.83; // top height above spot.y
const FZ = DEP / 2 - 0.02; // cabinet front face z

/** Sub-rectangle of an atlas region; x0..x1 / y0..y1 are 0..1 from the region's top-left. */
export function sub(r, x0, y0, x1, y1) {
  const du = r.u1 - r.u0, dv = r.v1 - r.v0;
  return { u0: r.u0 + x0 * du, u1: r.u0 + x1 * du, v1: r.v1 - y0 * dv, v0: r.v1 - y1 * dv };
}

/** One vending machine in the current frame.  s = surface height above the frame origin. */
export function vendingMachine(kit, id, s) {
  const m = MACHINES[id];
  const V = kit.V;
  const y0 = s + 0.05; // cabinet bottom
  const yT = TOP; // cabinet top
  const dispB = yT - 0.97, dispT = yT - 0.33; // display window
  const headB = yT - 0.3, headT = yT - 0.05; // brand header
  const lowT = dispB - 0.03; // top of the lower door panel
  const dark = '#2c3038';

  // plinth + feet + anchor brackets
  kit.box(W - 0.04, 0.09, DEP - 0.06, 0, s - 0.04, -0.02, 'vc', '#5a5e66', { bottom: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl(0.025, 0.03, 0.05, sx * 0.42, s - 0.01, -0.02 + sz * 0.3, 'metal', '#8a9098', { seg: 8, no: true, cast: false });
  for (const sx of [-1, 1]) {
    kit.box(0.02, 0.08, 0.1, sx * (W / 2 + 0.01), s + 0.04, 0.2, 'metal', '#7a8088', { no: true });
    kit.box(0.08, 0.01, 0.1, sx * (W / 2 + 0.05), s + 0.005, 0.2, 'metal', '#7a8088', { no: true, cast: false });
  }

  // cabinet shell in the machine colour: full depth below / above the display,
  // shallower behind it (the display recess sits in front), plus side walls
  const zBack = -DEP / 2 - 0.02;
  const shell = (yb, yt, zf) => kit.box(W, yt - yb, zf - zBack, 0, yb, (zf + zBack) / 2, 'vc', m.body, { bottom: true });
  shell(y0, dispB, FZ);
  shell(dispT, yT - 0.03, FZ);
  shell(dispB, dispT, FZ - 0.075);
  for (const sx of [-1, 1]) kit.box(0.05, dispT - dispB, FZ - zBack, sx * (W / 2 - 0.025), dispB, (FZ + zBack) / 2, 'vc', m.body, { bottom: true });
  kit.rbox(W + 0.03, 0.045, DEP + 0.02, 0.012, 0, yT - 0.012, -0.02, 'vc', m.trim);
  // side panels (ads / plain) on both sides
  for (const sx of [-1, 1]) {
    kit.plane(DEP - 0.12, yT - y0 - 0.14, sx * (W / 2 + 0.004), y0 + (yT - y0 - 0.1) / 2 + 0.02, -0.05, 'texV', '#ffffff', { ry: sx * Math.PI / 2, region: V(`side_${id}`) });
  }

  // ---- front door frame (pieces around the display + header openings) ----
  const fz = FZ + 0.02; // door slab centre
  const slab = (x0, x1, yb, yt, col = m.body) => kit.box(x1 - x0, yt - yb, 0.04, (x0 + x1) / 2, (yb + yt) / 2, fz, 'vc', col);
  slab(-W / 2, -0.45, dispB, dispT); // left strip
  slab(0.45, W / 2, dispB, dispT); // right strip
  slab(-W / 2, W / 2, dispT, headB); // between display and header
  slab(-W / 2, -0.47, headB, headT);
  slab(0.47, W / 2, headB, headT);
  slab(-W / 2, W / 2, headT, yT - 0.03);
  slab(-W / 2, W / 2, y0, lowT); // lower door
  // bezel rails between the display and the lower door
  slab(-W / 2, W / 2, lowT, dispB, m.trim);

  // brand header (backlit) with a thin bezel
  kit.plane(0.94, headT - headB - 0.01, 0, (headB + headT) / 2, fz + 0.024, 'glowV', '#f4f4f4', { region: V(`head_${id}`) });
  kit.box(0.96, 0.012, 0.012, 0, headT, fz + 0.022, 'vc', m.trim, { no: true });
  kit.box(0.96, 0.012, 0.012, 0, headB, fz + 0.022, 'vc', m.trim, { no: true });

  // ---- display recess: back (backlit drinks), side walls, clear pane, bezel ----
  const dw = 0.9, dh = dispT - dispB;
  const recessZ = FZ - 0.06;
  kit.plane(dw, dh, 0, (dispB + dispT) / 2, recessZ, 'glowV', '#ececec', { region: V(`disp_${m.display}`) });
  kit.box(dw, 0.01, 0.1, 0, dispT - 0.005, recessZ + 0.05, 'vc', '#e6ecf2', { no: true, cast: false }); // lit ceiling
  kit.box(dw, 0.01, 0.1, 0, dispB + 0.005, recessZ + 0.05, 'vc', '#c9d0d8', { no: true, cast: false });
  for (const sx of [-1, 1]) kit.box(0.01, dh, 0.1, sx * (dw / 2 - 0.005), (dispB + dispT) / 2, recessZ + 0.05, 'vc', '#d7dee6', { no: true, cast: false });
  kit.plane(dw, dh, 0, (dispB + dispT) / 2, FZ + 0.035, 'glass', '#ffffff');
  // bezel frame around the window (outlined: it frames the display nicely)
  const bz = FZ + 0.045;
  kit.box(dw + 0.04, 0.025, 0.012, 0, dispT + 0.0125, bz, 'vc', m.trim);
  kit.box(dw + 0.04, 0.025, 0.012, 0, dispB - 0.0125, bz, 'vc', m.trim);
  for (const sx of [-1, 1]) kit.box(0.025, dh + 0.05, 0.012, sx * (dw / 2 + 0.0125), (dispB + dispT) / 2, bz, 'vc', m.trim);

  // ---- lower door: painted panel + take-out flap + control panel ----
  const lowH = lowT - y0;
  const lz = fz + 0.024;
  kit.plane(W - 0.002, lowH, 0, y0 + lowH / 2, lz, 'texV', '#ffffff', { region: V(`low_${id}`) });
  // take-out flap (とりだしぐち): u 0.06..0.56 of the panel, v 0.5..0.84 from the top
  const flx0 = -W / 2 + 0.06 * W, flx1 = -W / 2 + 0.56 * W;
  const fly1 = lowT - 0.5 * lowH, fly0 = lowT - 0.84 * lowH;
  const flw = flx1 - flx0, flh = fly1 - fly0, fcx = (flx0 + flx1) / 2, fcy = (fly0 + fly1) / 2;
  kit.box(flw + 0.05, 0.025, 0.03, fcx, fly1 + 0.012, lz + 0.012, 'vc', dark);
  kit.box(flw + 0.05, 0.03, 0.04, fcx, fly0 - 0.012, lz + 0.016, 'vc', dark);
  for (const sx of [-1, 1]) kit.box(0.025, flh + 0.05, 0.03, fcx + sx * (flw / 2 + 0.012), fcy, lz + 0.012, 'vc', dark);
  kit.box(flw, flh, 0.012, fcx, fcy, lz + 0.004, 'vc', '#1e2228', { no: true, rx: -0.12 }); // smoked flap
  kit.box(flw * 0.6, 0.012, 0.01, fcx, fly1 - 0.035, lz + 0.014, 'vc', '#5a616c', { no: true, cast: false }); // flap grip
  // control strip (right): u 0.6..0.94, v 0.02..0.72 from the top of the lower panel
  const cx0 = -W / 2 + 0.6 * W, cx1 = -W / 2 + 0.94 * W;
  const cy1 = lowT - 0.02 * lowH, cy0 = lowT - 0.72 * lowH;
  const cw = cx1 - cx0, ch = cy1 - cy0, ccx = (cx0 + cx1) / 2;
  const cz = lz + 0.012;
  const ctrl = V('ctrl');
  kit.box(cw + 0.02, ch + 0.02, 0.02, ccx, (cy0 + cy1) / 2, lz + 0.001, 'vc', '#3a3e46');
  kit.plane(cw, ch, ccx, (cy0 + cy1) / 2, cz, 'texV', '#ffffff', { region: ctrl });
  // glowing bits of the strip: LED readout + IC reader re-use the same texels, unlit
  const glowPart = (a, b) => kit.plane(cw * 0.8, ch * (b - a), ccx, cy1 - ch * (a + b) / 2, cz + 0.002, 'glowV', '#ffffff', { region: sub(ctrl, 0.1, a, 0.9, b) });
  glowPart(0.02, 0.12);
  glowPart(0.5, 0.7);
  // coin slot bezel (v 0.16..0.28) with a dark slit
  const vy = (v) => cy1 - ch * v;
  kit.rbox(0.07, 0.1, 0.025, 0.008, ccx, vy(0.22), cz + 0.008, 'metal', '#c9cdd3', { seg: 1 });
  kit.box(0.012, 0.06, 0.01, ccx, vy(0.22), cz + 0.022, 'vc', '#15181c', { no: true, cast: false });
  // bill slot (v 0.36..0.44)
  kit.rbox(cw * 0.86, 0.045, 0.03, 0.008, ccx, vy(0.4), cz + 0.01, 'metal', '#b9bec6', { seg: 1 });
  kit.box(cw * 0.7, 0.008, 0.01, ccx, vy(0.4), cz + 0.026, 'vc', '#15181c', { no: true, cast: false });
  // IC reader lip
  kit.box(cw * 0.84, 0.012, 0.02, ccx, vy(0.71), cz + 0.008, 'vc', '#2a2e36', { no: true, cast: false });
  // change-return lever (v 0.78..0.88)
  kit.rbox(0.06, 0.06, 0.03, 0.01, ccx, vy(0.83), cz + 0.012, 'metal', '#d9dde2', { seg: 1 });
  kit.box(0.05, 0.02, 0.035, ccx + 0.03, vy(0.83), cz + 0.03, 'metal', '#c2c7ce', { rz: -0.35, no: true });
  // coin-return cup (below the strip)
  const crY = cy0 - 0.09;
  kit.box(0.14, 0.1, 0.035, ccx, crY, lz + 0.015, 'vc', '#3a3e46');
  kit.box(0.1, 0.06, 0.02, ccx, crY - 0.005, lz + 0.03, 'vc', '#15181c', { no: true, cast: false });
  kit.box(0.12, 0.012, 0.02, ccx, crY + 0.045, lz + 0.035, 'metal', '#c9cdd3', { no: true });
  // key lock on the right strip
  kit.cyl(0.016, 0.016, 0.018, 0.475, dispB + 0.12, fz + 0.02, 'metal', '#d0d4da', { rx: Math.PI / 2, seg: 10, no: true, cast: false });
  // eco lamp in the header corner
  kit.plane(0.03, 0.012, -0.42, headB - 0.012, fz + 0.022, 'glow', '#8ff0a0');
}

/** Pair of recycling bins (かん・びん + ペットボトル) side by side, local frame, front +Z. */
export function recycleBins(kit, s, pairs = ['can', 'pet']) {
  const S = kit.S;
  const col = { can: '#2f6fb8', pet: '#e8a23a', burn: '#d8433d', plastic: '#3c9a62' };
  pairs.forEach((k, i) => {
    const x = (i - (pairs.length - 1) / 2) * 0.46;
    kit.rbox(0.42, 0.78, 0.4, 0.04, x, s, 0, 'vc', '#eef0ef', { bottom: true });
    kit.rbox(0.44, 0.1, 0.42, 0.03, x, s + 0.76, 0, 'vc', col[k], { bottom: true });
    // round opening on the lid front edge
    kit.cyl(0.075, 0.075, 0.02, x, s + 0.86, 0.06, 'vc', '#1d2126', { seg: 14, no: true, cast: false });
    kit.plane(0.36, 0.18, x, s + 0.6, 0.2 + 0.003, 'texS', '#ffffff', { region: S(`bin_${k}`) });
    // a can peeking out of the hole
    if (k === 'can' && i === 0) kit.cyl(0.032, 0.032, 0.1, x + 0.02, s + 0.86, 0.06, 'metal', '#c9cdd3', { rz: 0.5, seg: 8, no: true });
  });
}

/** Plastic drink crate (open top) with bottles, origin bottom centre. */
export function crate(kit, x, y, z, ry, color = 'crateBlue', bottles = true) {
  const S = kit.S;
  const cw = 0.46, ch = 0.3, cd = 0.34;
  kit.push(kit.mtx(x, y, z, 0, ry));
  const tint = '#ffffff';
  for (const sz of [-1, 1]) kit.plane(cw, ch, 0, ch / 2, sz * cd / 2, 'texS2', tint, { region: S(color), ry: sz > 0 ? 0 : Math.PI, no: false, cast: true });
  for (const sx of [-1, 1]) kit.plane(cd, ch, sx * cw / 2, ch / 2, 0, 'texS2', tint, { region: S(color), ry: sx * Math.PI / 2, no: false, cast: true });
  kit.box(cw, 0.02, cd, 0, 0.01, 0, 'vc', color === 'crateBlue' ? '#3a74b8' : '#e2b834', { cast: false });
  // top rim
  for (const sz of [-1, 1]) kit.box(cw + 0.01, 0.02, 0.02, 0, ch, sz * cd / 2, 'vc', color === 'crateBlue' ? '#3a74b8' : '#e2b834', { no: true });
  for (const sx of [-1, 1]) kit.box(0.02, 0.02, cd + 0.01, sx * cw / 2, ch, 0, 'vc', color === 'crateBlue' ? '#3a74b8' : '#e2b834', { no: true });
  if (bottles) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const bx = -cw / 2 + 0.07 + i * 0.105, bz = -cd / 2 + 0.07 + j * 0.1;
      kit.lathe([[0, 0], [0.035, 0], [0.036, 0.16], [0.02, 0.22], [0.013, 0.25], [0.014, 0.27], [0, 0.27]], bx, 0.02, bz, 'vc', (i + j) % 3 ? '#9fd0b8' : '#c9e6f2', { seg: 8, no: true, cast: false });
    }
  }
  kit.pop();
}

/** のぼり flag on a pole with a water-tank base. region: noboriA|B|C. */
export function nobori(kit, x, y, z, ry, region, lean = 0) {
  const S = kit.S;
  kit.push(kit.mtx(x, y, z, 0, ry, lean));
  kit.cyl(0.16, 0.19, 0.16, 0, 0, 0, 'vc', '#2f3338', { seg: 12 });
  kit.cyl(0.05, 0.08, 0.06, 0, 0.16, 0, 'vc', '#2f3338', { seg: 10, no: true });
  kit.cyl(0.012, 0.012, 2.35, 0, 0.18, 0, 'metal', '#dadde0', { seg: 6 });
  kit.beam([0, 2.46, 0], [0.47, 2.46, 0], 0.008, 'metal', '#dadde0', { no: true });
  // fabric: a gently waved strip (a few columns bent in z)
  const fw = 0.45, fh = 1.8;
  const g = new kit.ctx.THREE.PlaneGeometry(fw, fh, 6, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + fw / 2) / fw;
    const v = p.getY(i) / fh + 0.5;
    p.setZ(i, Math.sin(u * 5.2 + v * 1.4) * 0.03 * u + u * u * 0.04);
  }
  g.computeVertexNormals();
  kit.add(g, 'texS2', '#ffffff', { region: S(region), m: kit.mtx(fw / 2 + 0.015, 2.45 - fh / 2, 0), no: true, cast: true });
  kit.pop();
}

/**
 * Build every machine in SPOTS.vending plus their companions.
 * clusterOf(spot) -> cluster name.
 */
export function buildVending(kit, clusterOf) {
  for (const v of SPOTS.vending) {
    kit.cluster(clusterOf(v));
    const s = surfaceY(v.x, v.z, v.y);
    kit.push(kit.mtx(v.x, v.y, v.z, 0, v.rotY));
    vendingMachine(kit, v.id, s);
    kit.collide(W + 0.1, DEP + 0.1, 0, -0.02);
    // companions (local +X is on the viewer's right when facing the machine)
    if (v.id === 'V1') {
      // sorted bin station is PLAZA.trashBins (plaza.js); here: a nobori flag on the left
      nobori(kit, -0.95, s, 0.15, 0, 'noboriA', 0.015);
    } else if (v.id === 'V4') {
      // recycling bins to the right of the konbini pair
      kit.push(kit.mtx(1.02, 0, 0.02));
      recycleBins(kit, s);
      kit.pop();
    } else if (v.id === 'V3') {
      // drink crates stacked at the left end of the konbini pair
      crate(kit, -0.85, s, -0.05, 0.1, 'crateYellow');
      crate(kit, -0.85, s + 0.31, -0.05, -0.08, 'crateYellow', false);
      crate(kit, -0.82, s, 0.35, -0.2, 'crateBlue');
    } else if (v.id === 'V6') {
      // quiet corner: bins on the far side, a nobori and a blue crate used as a seat
      kit.push(kit.mtx(-1.0, 0, 0.05));
      recycleBins(kit, s);
      kit.pop();
      nobori(kit, 0.85, s, 0.25, 0.3, 'noboriB', -0.02);
      crate(kit, -1.0, s, 0.55, 0.35, 'crateBlue', false);
    }
    kit.pop();
  }
}

export { W as VEND_W, DEP as VEND_D, TOP as VEND_TOP, PLAZA, LOTS, groundY };
