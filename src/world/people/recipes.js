/**
 * people/recipes — the cast's looks.  Low-saturation clothing so people never
 * out-shout the architecture: navy uniforms, cream, sage, lilac-grey, khaki,
 * with a few tiny accents (a red sailor scarf, a yellow kindergarten hat).
 */
import * as THREE from 'three';
import { loft, M, V3, ellipsoid, strand, ss } from './mesh.js';
import { torsoShell } from './body.js';
import { satchel, ecoBag, plasticBag, briefcase, backpack, crossBag, book, phone, sailorScarf, glasses } from './accessories.js';
import { bicycle } from './bicycle.js';

export const SKIN = { fair: '#f5d4c1', warm: '#f1cbb5', tan: '#e6bea3', elder: '#eacab8' }; // warm enough that hands never read as white gloves in sun
export const HAIR = { black: '#2e2b35', dark: '#3f3136', brown: '#6b4a3a', chestnut: '#86573f', grey: '#bdb8c2', greyDark: '#8d8a92' };
const NAVY = '#2c3657';

// ---- leg helpers -------------------------------------------------------------
const sockLegs = (skin, sock, topY) => ({ color: (y) => (y < topY ? sock : skin), edges: [{ y: topY, lip: 0.003 }] });
const tights = (col) => ({ color: () => col, edges: [] });
const trousers = (col, P) => ({ color: () => col, bulk: 0.012 * P.s, hemFlare: true, edges: [] });

// ---- shared extras ---------------------------------------------------------------
/** Sailor collar flap: a shell on the upper back sampling the garment texture (mirrored), fluttering at its hem. */
function sailorFlap(kit) {
  const { RM, P, torso, gRect } = kit;
  const yb = P.chestY - 0.035, yt = P.shoulderY + 0.01;
  const g = torsoShell(torso, [yb, (yb + yt) / 2, P.hipJ + P.trunk * 0.9, yt], 0.007, { front: [-Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05], seg: 16 });
  RM.add(g, {
    bone: 'chest', color: '#ffffff',
    uv: (p) => {
      const a = Math.atan2(p.x, p.z);
      return gRect.map(0.5 + Math.abs(a) / (Math.PI * 2), (p.y - torso.y0) / (torso.y1 - torso.y0));
    },
    flut: (p) => 0.014 * (1 - ss(p.y, yb, yb + 0.08)),
  });
  // underside (so the lifted flap edge never shows a hole)
  RM.add(g, { bone: 'chest', color: '#252c44', flip: true });
}

function sailor(o) {
  return {
    kind: 'girl', H: o.H || 1.56, skin: o.skin || SKIN.fair,
    face: { iris: o.iris || '#6c4a55', lashes: true, blush: o.blush ?? 0.55, style: o.eyes || 'open', mouth: o.mouth || 'smile', brow: o.brow || '#4a3437', ...o.face },
    hair: { bangs: 'full', flut: 0.02, ...o.hair },
    garment: { kind: 'sailor', base: '#f3f3f0', collar: NAVY, stripe: '#f3f3f0', bulk: 0.004 },
    sleeve: (P) => ({ color: '#f3f3f0', end: 'wrist', cuff: [[P.wristY + 0.008, P.wristY + 0.05, NAVY]] }),
    hands: o.hands || {},
    legs: o.legs,
    shoes: { color: '#3f302b', sole: '#2a2224', kind: 'loafer' },
    skirt: (P) => ({ color: NAVY, hemY: P.kneeY + (o.skirtLen ?? 0.05), flare: 1.28, pleats: 16, pleatAmp: 0.08, flut: o.skirtFlut ?? 0.02 }),
    bones: o.bones,
    extras: (kit) => {
      sailorFlap(kit);
      sailorScarf(kit.RM, kit.P, o.scarf || '#b5595e');
      if (o.extras) o.extras(kit);
    },
  };
}

// ---------------------------------------------------------------------------
export function recipes() {
  const R = {};

  // 車站工作人员 — navy uniform, cap with badge, white gloves
  R.stationStaff = {
    id: 'staff', kind: 'man', H: 1.72, skin: SKIN.warm,
    face: { iris: '#4a3a36', man: true, mouth: 'neutral', style: 'open', brow: '#2e2830', eyeW: 0.27, eyeH: 0.26 },
    head: { jaw: 0.04 },
    hair: { style: 'short', color: HAIR.black, bangs: 'short', sideLocks: false },
    hat: { kind: 'staffCap', color: '#27314a' },
    garment: { kind: 'staff', base: '#2b3550', shirt: '#dfe8f2', tie: '#27314a', tieStripe: '#8b9bc4', button: '#d4bb70', nameplate: true, bulk: 0.012 },
    sleeve: (P) => ({ color: '#2b3550', end: 'wrist', bulk: 0.009, cuff: [[P.wristY + 0.03, P.wristY + 0.04, '#c9b36a']] }),
    hands: { color: '#f6f6f3', L: 'relaxed', R: 'relaxed' },
    legs: (P) => trousers('#28314a', P),
    shoes: { color: '#23242a', sole: '#18181c', kind: 'loafer' },
    hem: (P) => ({ hemY: P.crotchY - 0.02, flare: 0.012 }),
  };

  // 推着自行车等道口的少女 — sailor uniform, ponytail, black tights, mint bike.
  // bikeM: bike frame in her model space (set by cast.js); out.grips receives the
  // handlebar grip positions (model space, [left, right]) and the saddle top for the hand IK.
  R.crossingGirl = (bikeM, out) => ({
    id: 'crossGirl',
    ...sailor({
      H: 1.55,
      hair: { style: 'ponytail', color: HAIR.dark, tieColor: '#c25a66', flut: 0.03 },
      eyes: 'open', mouth: 'neutral', face: { lookX: 0.4 },
      legs: tights('#3b3a45'),
      hands: { R: 'grip', L: 'grip' },
      extras: (kit) => {
        const b = bicycle(kit.RM, kit.D, bikeM, 'root', { color: '#7fbfae', bagColor: '#3b2f2c' });
        out.grips = b.grips;
        out.saddle = b.saddle;
      },
    }),
  });

  // 站在自动贩卖机前选饮料的少年 — hoodie, shorts, backpack
  R.vendingBoy = {
    id: 'vendBoy', kind: 'boy', H: 1.48, skin: SKIN.tan,
    face: { iris: '#4a3c3a', man: true, mouth: 'o', style: 'wide', brow: '#3a2e2c', eyeW: 0.29, eyeH: 0.32, lookY: -0.3, blush: 0.3 },
    hair: { style: 'short', color: HAIR.brown, bangs: 'short', flut: 0.01 },
    garment: { kind: 'hoodie', base: '#cdb67f', bulk: 0.014 },
    sleeve: (P) => ({ color: '#cdb67f', end: 'wrist', bulk: 0.012, cuff: [[P.wristY, P.wristY + 0.035, '#bba36c']] }),
    hands: { R: 'point', L: 'relaxed' },
    legs: (P) => ({ color: (y) => (y > P.kneeY + 0.1 ? '#3d4658' : y < P.ankleY + 0.07 ? '#f2f0ea' : SKIN.tan), edges: [{ y: P.kneeY + 0.1, lip: 0.012 }, { y: P.ankleY + 0.07, lip: 0.002 }] }),
    shoes: { color: '#f3f1ec', sole: '#c9c2b8', kind: 'sneaker' },
    hem: (P) => ({ hemY: P.hipsY - 0.07, flare: 0.006, gap: 0.016 }),
    extras: (kit) => {
      backpack(kit.RM, kit.P, { color: '#56687a' });
      // hood lump behind the neck
      kit.RM.add(ellipsoid(0.1 * kit.P.s, 0.05, 0.05, 10, 6), { m: M(0, kit.P.neckBase + 0.005, -0.075), bone: 'chest', color: '#c2aa72' });
    },
  };

  // 坐在站台长椅上看书的乘客 — trench coat, bob, glasses, paperback with a bookstore cover
  R.reader = {
    id: 'reader', kind: 'woman', H: 1.6, skin: SKIN.fair,
    face: { iris: '#5a4a5a', lashes: true, blush: 0.35, style: 'down', mouth: 'smile', brow: '#5a3e36' },
    hair: { style: 'bob', color: HAIR.chestnut, bangs: 'side', flut: 0.012 },
    garment: { kind: 'trench', base: '#cdbb9b', shirt: '#f1ede4', bulk: 0.012 },
    sleeve: (P) => ({ color: '#cdbb9b', end: 'wrist', bulk: 0.01, cuff: [[P.wristY + 0.05, P.wristY + 0.065, '#b9a584']] }),
    hands: { L: 'grip', R: 'grip' },
    legs: (P) => trousers('#454c60', P),
    shoes: { color: '#6b4d3e', sole: '#3a2a24', kind: 'pump' },
    hem: (P) => ({ hemY: P.crotchY - 0.12, flare: 0.03, lining: '#9c8c72' }),
    // the book floats on its own bones in front of the (seated) lap; hands IK to it in cast.js
    bones: (P) => [['book', 'root', 0, P.hipJ + 0.3, 0.33], ['page', 'book', 0, P.hipJ + 0.3, 0.33]],
    extras: (kit) => {
      glasses(kit.D, kit.P, '#7a5e52');
      const b = kit.rig.rest.book;
      book(kit.RM, 'book', 'page', b, kit.rects.book, { rx: -0.95, ry: Math.PI });
    },
  };

  // 在咖啡店门口整理黑板菜单的店员 — green apron, rolled sleeves, low ponytail
  R.cafeClerk = {
    id: 'clerk', kind: 'woman', H: 1.62, skin: SKIN.warm,
    face: { iris: '#5a463e', lashes: true, blush: 0.35, style: 'soft', mouth: 'smile', brow: '#4a3430', lookX: 0.2, lookY: -0.3 },
    hair: { style: 'lowtail', color: HAIR.brown, bangs: 'side', tieColor: '#e9e2d0', flut: 0.015 },
    garment: { kind: 'apron', base: '#5b725f', shirt: '#f6f4ee', bulk: 0.006 },
    sleeve: { color: '#f6f4ee', end: 'rolled', bulk: 0.008 },
    hands: { R: 'fist', L: 'relaxed' },
    legs: (P) => trousers('#3b3b42', P),
    shoes: { color: '#4a3a32', sole: '#2a2224', kind: 'loafer' },
    extras: (kit) => {
      const { RM, P } = kit;
      // apron skirt panel (front only) + waist bow at the back
      const hips = P.torso[2];
      const rings = [];
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const y = THREE.MathUtils.lerp(P.kneeY + 0.03, P.waistY - 0.01, t);
        const k = 1 - t;
        rings.push({ y, rx: hips.rx + 0.03 + k * 0.03, rz: hips.rz + 0.03 + k * 0.035, z: -0.005 });
      }
      const g = loft(rings, { seg: 14, front: [Math.PI * 0.1, Math.PI * 0.9] });
      const skin = (p) => { const t = ss(p.y, P.hipsY, P.kneeY + 0.03) * 0.7; const l = ss(p.x, -0.05, 0.05); return [['hips', 1 - t], ['thigh_L', t * l], ['thigh_R', t * (1 - l)]]; };
      RM.add(g, { bone: skin, color: '#5b725f', flut: (p) => 0.012 * ss(p.y, P.hipsY, P.kneeY) });
      RM.add(g, { bone: skin, color: '#48594b', flip: true });
      const bz = -(P.torso[3].rz + 0.012);
      RM.add(ellipsoid(0.035, 0.022, 0.012, 8, 6), { m: M(-0.03, P.waistY, bz, 0, 0, 0.5), bone: 'spine', color: '#5b725f' });
      RM.add(ellipsoid(0.035, 0.022, 0.012, 8, 6), { m: M(0.03, P.waistY, bz, 0, 0, -0.5), bone: 'spine', color: '#5b725f' });
      for (const s of [-1, 1]) RM.add(strand([V3(s * 0.01, P.waistY - 0.01, bz), V3(s * 0.03, P.waistY - 0.08, bz - 0.01), V3(s * 0.04, P.waistY - 0.17, bz - 0.005)], { width: () => 0.016, thick: () => 0.003, out: V3(0, P.waistY, 0) }), { bone: 'hips', color: '#546a58', flut: (p, t) => 0.03 * t });
      // chalk in the right fist
      const h = kit.rig.rest.hand_R;
      RM.add(loft([{ y: 0, rx: 0.005, rz: 0.005 }, { y: 0.05, rx: 0.005, rz: 0.005 }], { seg: 6 }), { m: M(h.x - 0.005, h.y - 0.1, h.z + 0.03, 0.9), bone: 'hand_R', color: '#fbfaf5' });
    },
  };

  // 提着购物袋的老人 — lilac cardigan, bucket hat, eco bag with a leek + konbini bag
  R.oldLady = {
    id: 'oldLady', kind: 'elderF', H: 1.47, skin: SKIN.elder,
    face: { iris: '#4a3a3a', elder: true, style: 'soft', mouth: 'smile', brow: '#a39aa0', blush: 0.35, eyeW: 0.27, eyeH: 0.24 },
    hair: { style: 'elder', color: HAIR.grey, bangs: 'none', sideLocks: false },
    hat: { kind: 'bucket', color: '#d9ccb4', band: '#a8917a' },
    garment: { kind: 'cardigan', base: '#a89fb6', shirt: '#efe7d4', button: '#efe6d2', bulk: 0.016 },
    sleeve: (P) => ({ color: '#a89fb6', end: 'wrist', bulk: 0.014, cuff: [[P.wristY, P.wristY + 0.03, '#978ea6']] }),
    hands: { L: 'grip', R: 'grip' },
    legs: { color: () => '#e2c7b8', edges: [] }, // skin-toned stockings
    shoes: { color: '#6b5a50', sole: '#3f3530', kind: 'loafer' },
    hem: (P) => ({ hemY: P.hipsY - 0.07, flare: 0.012, gap: 0.016, lining: '#8a8298' }),
    skirt: (P) => ({ color: '#7f7068', hemY: P.kneeY - 0.14, flare: 1.18, flut: 0.012, topY: P.waistY - 0.03 }),
    extras: (kit) => {
      ecoBag(kit.RM, kit.rig.rest, 'hand_R', kit.rects.bagGreen, { leek: true, handle: '#6f8a78' });
      plasticBag(kit.RM, kit.rig.rest, 'hand_L', {});
    },
  };

  // 樱花树下被风吹起裙摆和发梢的少女 — pale dress, cream cardigan, long hair streaming
  R.windGirl = (blowLocal) => ({
    id: 'windGirl', kind: 'girl', H: 1.58, skin: SKIN.fair,
    face: { iris: '#6a4a5e', lashes: true, blush: 0.6, style: 'soft', mouth: 'smile', brow: '#4a3436', lookX: -0.5 },
    hair: { style: 'long', color: '#4a3432', bangs: 'side', flut: 0.075, blow: { x: blowLocal.x * 0.14, z: blowLocal.z * 0.14 }, length: undefined },
    garment: { kind: 'dress', base: '#e3ecf2', cardigan: '#f3ead8', ribbon: '#b86a7c', bulk: 0.006 },
    sleeve: (P) => ({ color: '#f3ead8', end: 'wrist', bulk: 0.01, cuff: [[P.wristY, P.wristY + 0.025, '#e6dcc6']] }),
    hands: { L: 'open', R: 'relaxed' },
    legs: (P) => sockLegs(SKIN.fair, '#f6f5f0', P.ankleY + 0.06),
    shoes: { color: '#9a7462', sole: '#5a4034', kind: 'pump' },
    skirt: (P) => ({
      color: '#e1eaf2', trim: '#c6d5e4', hemY: P.kneeY - 0.09, flare: 1.55, flut: 0.075, pleats: 0, lining: '#c3cfd9',
      blow: { x: blowLocal.x * 0.1, z: blowLocal.z * 0.1 }, lift: 0.02, billow: { x: blowLocal.x, z: blowLocal.z, amt: 0.16 },
    }),
    extras: (kit) => crossBag(kit.RM, kit.P, { color: '#c9b49a', side: -1, w: 0.06, h: 0.15, d: 0.2, strap: 0.012 }),
  });

  // 站台候车的学生 (两个水手服女生 + 一个西装校服男生)
  R.studentA = {
    id: 'stuA',
    ...sailor({
      H: 1.57, hair: { style: 'long', color: HAIR.black, flut: 0.03 },
      eyes: 'smile', mouth: 'open', blush: 0.7,
      legs: (P) => sockLegs(SKIN.fair, NAVY, P.kneeY - 0.05),
      hands: { R: 'relaxed', L: 'grip' },
      extras: (kit) => satchel(kit.RM, kit.rig.rest, 'hand_L', { color: '#3a2e2b', charm: '#f2b8c8' }),
    }),
  };
  R.studentB = {
    id: 'stuB',
    ...sailor({
      H: 1.53, skin: SKIN.warm, hair: { style: 'bob', color: HAIR.chestnut, bangs: 'full', flut: 0.015 },
      eyes: 'open', mouth: 'smile', iris: '#7a5040', face: { lookX: 0.5 },
      legs: (P) => sockLegs(SKIN.warm, '#f5f4ef', P.ankleY + 0.1),
      hands: { R: 'grip', L: 'grip' },
      bones: (P) => [['bag', 'hips', 0, P.wristY + 0.04, 0.235]],
      extras: (kit) => satchel(kit.RM, kit.rig.rest, 'bag', { color: '#2f3444', side: -0.05, ry: Math.PI / 2 }),
    }),
  };
  R.blazerBoy = {
    id: 'blazer', kind: 'boy', H: 1.7, skin: SKIN.warm,
    face: { iris: '#3e3638', man: true, style: 'down', mouth: 'neutral', brow: '#2e2830', eyeW: 0.27, eyeH: 0.26 },
    hair: { style: 'short', color: HAIR.black, bangs: 'full', flut: 0.012 },
    garment: { kind: 'blazer', base: '#2f3a55', shirt: '#f4f4f2', tie: '#6f4652', tieStripe: '#c9b36a', emblem: '#c9b36a', button: '#c9b36a', bulk: 0.012 },
    sleeve: (P) => ({ color: '#2f3a55', end: 'wrist', bulk: 0.01, cuff: [[P.wristY - 0.004, P.wristY + 0.004, '#f4f4f2']] }),
    hands: { R: 'grip', L: 'fist' },
    legs: (P) => trousers('#6c707a', P),
    shoes: { color: '#2e2622', sole: '#1c1a1a', kind: 'loafer' },
    hem: (P) => ({ hemY: P.crotchY - 0.03, flare: 0.012 }),
    bones: (P) => [['phone', 'chest', -0.05, P.chestY - 0.12, P.torso[5].rzf + 0.2]],
    extras: (kit) => {
      crossBag(kit.RM, kit.P, { color: '#3f4452', side: 1, w: 0.1, h: 0.26, d: 0.36 });
      phone(kit.RM, kit.D, 'phone', kit.rig.rest.phone, kit.rects.phone, { rx: -0.8, ry: Math.PI, color: '#d9dfe8' });
    },
  };

  // 券売機前的上班族
  R.salaryman = {
    id: 'salary', kind: 'man', H: 1.73, skin: SKIN.warm,
    face: { iris: '#3e3638', man: true, style: 'open', mouth: 'neutral', brow: '#2e2830', eyeW: 0.26, eyeH: 0.24, lookY: 0.2 },
    head: { jaw: 0.03 },
    hair: { style: 'short', color: '#2a2830', bangs: 'side', flut: 0.008 },
    garment: { kind: 'suit', base: '#5e636d', shirt: '#f4f4f2', tie: '#4b5d7c', tieStripe: '#8ea0c0', button: '#3a3c42', bulk: 0.012 },
    sleeve: (P) => ({ color: '#5e636d', end: 'wrist', bulk: 0.01, cuff: [[P.wristY - 0.004, P.wristY + 0.004, '#f4f4f2']] }),
    hands: { R: 'point', L: 'grip' },
    legs: (P) => trousers('#555a64', P),
    shoes: { color: '#26221f', sole: '#151414', kind: 'loafer' },
    hem: (P) => ({ hemY: P.crotchY - 0.035, flare: 0.012 }),
    extras: (kit) => briefcase(kit.RM, kit.rig.rest, 'hand_L', {}),
  };

  // 沿街散步的老爷爷 (walk cycle)
  R.walker = {
    id: 'walker', kind: 'elderM', H: 1.62, skin: SKIN.elder,
    face: { iris: '#4a3a3a', elder: true, man: true, style: 'soft', mouth: 'smile', brow: '#b9b3b8', eyeW: 0.25, eyeH: 0.22 },
    head: { jaw: 0.03 },
    hair: { style: 'short', color: HAIR.greyDark, bangs: 'none', sideLocks: false, flut: 0.004 },
    hat: { kind: 'flatCap', color: '#7c6c5a' },
    garment: { kind: 'vest', base: '#8a7862', shirt: '#eee8da', bulk: 0.012 },
    sleeve: { color: '#eee8da', end: 'wrist', bulk: 0.009 },
    hands: { L: 'fist', R: 'fist' },
    legs: (P) => trousers('#9c917e', P),
    shoes: { color: '#5a4436', sole: '#2f2622', kind: 'loafer' },
  };

  // 站前广场的母子
  R.mother = {
    id: 'mother', kind: 'woman', H: 1.6, skin: SKIN.fair,
    face: { iris: '#5a4648', lashes: true, blush: 0.4, style: 'soft', mouth: 'smile', brow: '#4f3a34', lookX: 0.3, lookY: -0.4 },
    hair: { style: 'lowtail', color: HAIR.brown, bangs: 'side', tieColor: '#8a6a5a', flut: 0.02 },
    garment: { kind: 'knit', base: '#c3ccb3', bulk: 0.014 },
    sleeve: (P) => ({ color: '#c3ccb3', end: 'wrist', bulk: 0.012, cuff: [[P.wristY, P.wristY + 0.03, '#b1ba9f']] }),
    hands: { L: 'grip', R: 'relaxed' },
    legs: (P) => sockLegs(SKIN.fair, '#e8e2d6', P.ankleY + 0.05),
    shoes: { color: '#8a6a58', sole: '#4a3a32', kind: 'pump' },
    skirt: (P) => ({ color: '#8d8174', hemY: P.ankleY + 0.16, flare: 1.35, flut: 0.03, pleats: 22, pleatAmp: 0.03, topY: P.waistY - 0.02 }),
    extras: (kit) => crossBag(kit.RM, kit.P, { color: '#e3d8c3', side: 1, w: 0.12, h: 0.3, d: 0.32, strap: 0.02 }),
  };
  R.child = {
    id: 'child', kind: 'child', H: 1.04, skin: SKIN.warm,
    face: { iris: '#5a4038', lashes: false, blush: 0.9, style: 'wide', mouth: 'open', brow: '#5a4038', eyeW: 0.32, eyeH: 0.38, lookY: 0.6 },
    hair: { style: 'bob', color: HAIR.brown, bangs: 'full', flut: 0.012, sideLocks: false },
    hat: { kind: 'kinder', color: '#f1c95a', band: '#d7a948' },
    garment: { kind: 'smock', base: '#bdd3e6', bulk: 0.018 },
    sleeve: (P) => ({ color: '#bdd3e6', end: 'wrist', bulk: 0.012, cuff: [[P.wristY, P.wristY + 0.02, '#a9c2d8']] }),
    hands: { R: 'grip', L: 'point' },
    legs: (P) => ({ color: (y) => (y > P.kneeY + 0.08 ? '#3f4a60' : y < P.ankleY + 0.07 ? '#f6f4ef' : SKIN.warm), edges: [{ y: P.kneeY + 0.08, lip: 0.012 }, { y: P.ankleY + 0.07, lip: 0.002 }] }),
    shoes: { color: '#f3efe6', sole: '#e8a0b0', kind: 'sneaker' },
    hem: (P) => ({ hemY: P.crotchY - 0.02, flare: 0.04, gap: 0.02, lining: '#9fb6ca' }),
    extras: (kit) => crossBag(kit.RM, kit.P, { color: '#f1c95a', side: 1, w: 0.05, h: 0.1, d: 0.12, strap: 0.01 }),
  };

  // ---- outskirts (people/outskirts.js): the levee and the southern main street ----------------

  // 在前景樱花下用手机拍花的女生 — blazer uniform, grey pleated skirt, phone raised in both hands
  R.photoGirl = {
    id: 'photoGirl', kind: 'girl', H: 1.57, skin: SKIN.warm,
    face: { iris: '#5a4650', lashes: true, blush: 0.45, style: 'open', mouth: 'smile', brow: '#3e3034', lookY: 0.35 },
    hair: { style: 'long', color: '#3a2c2e', bangs: 'side', flut: 0.035 },
    garment: { kind: 'blazer', base: '#3a4560', shirt: '#f4f4f2', tie: '#a4505e', tieStripe: '#e3c8cc', button: '#c9b36a', bulk: 0.01 },
    sleeve: (P) => ({ color: '#3a4560', end: 'wrist', bulk: 0.009, cuff: [[P.wristY - 0.004, P.wristY + 0.004, '#f4f4f2']] }),
    hands: { R: 'grip', L: 'grip' },
    legs: (P) => sockLegs(SKIN.warm, '#2c3244', P.kneeY - 0.04),
    shoes: { color: '#3f302b', sole: '#2a2224', kind: 'loafer' },
    skirt: (P) => ({ color: '#6d7282', hemY: P.kneeY + 0.06, flare: 1.28, pleats: 16, pleatAmp: 0.08, flut: 0.025 }),
    hem: (P) => ({ hemY: P.hipsY - 0.05, flare: 0.012 }),
    // the phone rides the chest, raised to eye level ~0.3 m in front of her face
    bones: (P) => [['phone', 'chest', 0, P.cy - 0.03, 0.3]],
    extras: (kit) => {
      crossBag(kit.RM, kit.P, { color: '#2f3444', side: 1, w: 0.09, h: 0.24, d: 0.32 });
      phone(kit.RM, kit.D, 'phone', kit.rig.rest.phone, kit.rects.phone, { rx: -0.25, ry: Math.PI, color: '#e6d9e0' });
    },
  };

  // 杂货店门口挑东西的女士 — lilac cardigan, sage long skirt, cream canvas tote
  R.shopper = {
    id: 'shopper', kind: 'woman', H: 1.6, skin: SKIN.fair,
    face: { iris: '#4e4046', lashes: true, blush: 0.35, style: 'soft', mouth: 'smile', brow: '#4a3432', lookX: 0.3 },
    hair: { style: 'bob', color: HAIR.dark, bangs: 'side', flut: 0.015 },
    garment: { kind: 'cardigan', base: '#b9aec4', shirt: '#f3efe6', button: '#efe6d2', ribbon: '#8a6a7a', bulk: 0.012 },
    sleeve: (P) => ({ color: '#b9aec4', end: 'wrist', bulk: 0.01, cuff: [[P.wristY, P.wristY + 0.03, '#a89cb4']] }),
    hands: { L: 'grip', R: 'relaxed' },
    legs: (P) => sockLegs(SKIN.fair, '#e8e2d6', P.ankleY + 0.05),
    shoes: { color: '#8a6a58', sole: '#4a3a32', kind: 'pump' },
    hem: (P) => ({ hemY: P.hipsY - 0.05, flare: 0.012, gap: 0.016, lining: '#9a8fa8' }),
    skirt: (P) => ({ color: '#8a9a90', hemY: P.ankleY + 0.2, flare: 1.3, flut: 0.03, pleats: 18, pleatAmp: 0.03, topY: P.waistY - 0.02 }),
    extras: (kit) => ecoBag(kit.RM, kit.rig.rest, 'hand_L', null, { handle: '#a08c70', w: 0.28, h: 0.3 }),
  };

  // 河堤上遛柴犬的老爷爷 — bucket hat, blue-grey sweater, the leash in his right hand
  R.dogWalker = {
    id: 'dogWalker', kind: 'elderM', H: 1.64, skin: SKIN.elder,
    face: { iris: '#4a3a3a', elder: true, man: true, style: 'soft', mouth: 'smile', brow: '#c2bcc0', eyeW: 0.25, eyeH: 0.22, lookY: -0.3 },
    head: { jaw: 0.03 },
    hair: { style: 'short', color: HAIR.grey, bangs: 'none', sideLocks: false, flut: 0.004 },
    hat: { kind: 'bucket', color: '#a3ad96', band: '#7d876f' },
    garment: { kind: 'knit', base: '#8492a6', bulk: 0.014 },
    sleeve: (P) => ({ color: '#8492a6', end: 'wrist', bulk: 0.012, cuff: [[P.wristY, P.wristY + 0.03, '#76849a']] }),
    hands: { R: 'fist', L: 'fist' },
    legs: (P) => trousers('#6f6a60', P),
    shoes: { color: '#e9e6df', sole: '#9a948a', kind: 'sneaker' },
  };

  // 坐在河堤草坡上的女生 — sailor uniform, knees hugged, satchel standing on the grass beside her
  R.slopeGirl = {
    id: 'slopeGirl',
    ...sailor({
      H: 1.54, hair: { style: 'long', color: '#5a3e36', bangs: 'full', flut: 0.045 },
      eyes: 'soft', mouth: 'smile', blush: 0.5,
      legs: (P) => sockLegs(SKIN.fair, NAVY, P.kneeY - 0.06),
      hands: { R: 'relaxed', L: 'relaxed' },
      bones: (P) => [['bag', 'root', 0.33, P.hipJ + 0.29, 0.02]],
      extras: (kit) => satchel(kit.RM, kit.rig.rest, 'bag', { color: '#3a2e2b', charm: '#a8c8e8', ry: 0.3 }),
    }),
  };
  return R;
}

