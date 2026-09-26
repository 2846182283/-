/**
 * Shared colour palette.  Pastel, slightly desaturated, anime-film colours.
 * Pick from here first so the whole town reads as one painting; derive
 * variations with toon.shade(color, dL, satMul, hueShift).
 *
 * Main tones: sakura pink, sky blue, cream white, light grey, pale green, wood brown.
 * Accent pops (keep small): train stripe, konbini sign, vending machines, traffic signs.
 */
export const PALETTE = {
  // sakura
  sakuraWhite: '#fff4f7',
  sakuraPale: '#ffdde7',
  sakura: '#f9bfd0',
  sakuraWarm: '#f5a9bf',
  sakuraDeep: '#e98aa7',
  sakuraShadow: '#c9a3c9', // lilac-grey used on the back side of canopies
  youngLeaf: '#c8d98f',

  // sky / air
  skyZenith: '#6fa6e3',
  skyMid: '#a9ccf0',
  skyHorizon: '#e7eff7',
  haze: '#dde7f2',
  cloud: '#ffffff',
  cloudShade: '#dfe3f3',

  // shadows (reference; the lighting adds blue-violet automatically)
  shadowViolet: '#8c8fc4',

  // ground
  asphalt: '#6d7076',
  asphaltLight: '#80838a',
  asphaltPatch: '#5b5e64',
  asphaltWorn: '#8b8d91',
  concrete: '#c8c6c0',
  concreteLight: '#dcdad3',
  concreteDark: '#a8a6a0',
  paving: '#cfccc5',
  pavingAlt: '#c2bfb8',
  roadWhite: '#f4f3ee',
  roadOrange: '#e8a23a',
  roadYellow: '#efc33f',
  tactileYellow: '#f2c230',
  ballast: '#8a8580',
  ballastDark: '#6f6a66',
  ballastLight: '#a9a39c',
  ballastBrown: '#8d7766',
  soil: '#9c8466',
  grass: '#9cc27a',
  grassDark: '#7fa865',
  grassLight: '#b9d68f',
  moss: '#88a06a',
  water: '#8fb8d6',

  // building materials
  plasterCream: '#f2e6cf',
  plasterWhite: '#f6f3ec',
  plasterBeige: '#e8dcc4',
  sidingBlue: '#b9cddd',
  sidingGreen: '#c4d6c0',
  tileGrey: '#c9cbcc',
  woodDark: '#5b4332',
  wood: '#8a6446',
  woodLight: '#b58c63',
  woodPale: '#d8bb92',
  roofGrey: '#5f6670',
  roofBlueGrey: '#56677a',
  roofGreen: '#4f6b5e',
  roofBrown: '#6c5647',
  metalGrey: '#9aa1a8',
  metalDark: '#555b62',
  windowFrame: '#4a4d52',
  windowFrameBrown: '#6a4e3a',

  // accents
  signBlue: '#2f63b5',
  signRed: '#d8433d',
  signGreen: '#3c9a62',
  mailboxRed: '#d24a3c',
  konbiniGreen: '#3aa37a',
  konbiniOrange: '#f29a3a',
  konbiniBlue: '#3b7fd1',
  vendRed: '#d8484a',
  vendBlue: '#3f7fc8',
  vendWhite: '#f2f4f5',
  vendGreen: '#6fbf8e',
  trainCream: '#f5f1e6',
  trainSilver: '#c9ccd0',
  trainPink: '#ef8fae',
  trainPinkDeep: '#d9668d',
  crossingYellow: '#f2c230',
  crossingBlack: '#26262a',
  crossingRed: '#ff4a3d',
  poleConcrete: '#b9b7b1',
  wire: '#2d3035',

  // people
  uniformNavy: '#2f3a55',
  sailorNavy: '#2c3657',
  sailorWhite: '#f4f4f2',
  skinLight: '#fbe3d3',
  skinShade: '#e9bfae',
  hairBlack: '#2c2a33',
  hairBrown: '#6b4a3a',
  hairChestnut: '#8a5a44',
};

export default PALETTE;
