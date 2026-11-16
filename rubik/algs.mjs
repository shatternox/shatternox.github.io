// Standard CFOP algorithm sets. Every entry is checked by tools/verify (see
// scratch tests) and by checkAlgorithms() at build time: it must keep the
// solved part of the cube intact, and each set must cover every case.

export const PLL = {
  Aa: "x R' U R' D2 R U' R' D2 R2 x'",
  Ab: "x R2 D2 R U R' D2 R U' R x'",
  E: "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
  F: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
  Ga: "R2 U R' U R' U' R U' R2 U' D R' U R D'",
  Gb: "R' U' R U D' R2 U R' U R U' R U' R2 D",
  Gc: "R2 U' R U' R U R' U R2 U D' R U' R' D",
  Gd: "R U R' U' D R2 U' R U' R' U R' U R2 D'",
  H: 'M2 U M2 U2 M2 U M2',
  Ja: "R' U L' U2 R U' R' U2 R L",
  Jb: "R U R' F' R U R' U' R' F R2 U' R'",
  Na: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
  Nb: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
  Ra: "R U' R' U' R U R D R' U' R D' R' U2 R'",
  Rb: "R2 F R U R U' R' F' R U2 R' U2 R",
  T: "R U R' U' R' F R2 U' R' U' R U R' F'",
  Ua: "M2 U M U2 M' U M2",
  Ub: "M2 U' M U2 M' U' M2",
  V: "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2",
  Y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
  Z: "M' U M2 U M2 U M' U2 M2",
};

export const OLL = {
  1: "R U2 R2 F R F' U2 R' F R F'",
  2: "F R U R' U' F' f R U R' U' f'",
  3: "f R U R' U' f' U' F R U R' U' F'",
  4: "f R U R' U' f' U F R U R' U' F'",
  5: "r' U2 R U R' U r",
  6: "r U2 R' U' R U' r'",
  7: "r U R' U R U2 r'",
  8: "r' U' R U' R' U2 r",
  9: "R U R' U' R' F R2 U R' U' F'",
  10: "R U R' U R' F R F' R U2 R'",
  11: "r U R' U R' F R F' R U2 r'",
  12: "M' R' U' R U' R' U2 R U' R r'",
  13: "F U R U' R2 F' R U R U' R'",
  14: "R' F R U R' F' R F U' F'",
  15: "r' U' r R' U' R U r' U r",
  16: "r U r' R U R' U' r U' r'",
  17: "R U R' U R' F R F' U2 R' F R F'",
  18: "r U R' U R U2 r2 U' R U' R' U2 r",
  19: "r' R U R U R' U' M' R' F R F'",
  20: "r U R' U' M2 U R U' R' U' M'",
  21: "R U2 R' U' R U R' U' R U' R'",
  22: "R U2 R2 U' R2 U' R2 U2 R",
  23: "R2 D' R U2 R' D R U2 R",
  24: "r U R' U' r' F R F'",
  25: "F' r U R' U' r' F R",
  26: "R U2 R' U' R U' R'",
  27: "R U R' U R U2 R'",
  28: "r U R' U' r' R U R U' R'",
  29: "R U R' U' R U' R' F' U' F R U R'",
  30: "F R' F R2 U' R' U' R U R' F2",
  31: "R' U' F U R U' R' F' R",
  32: "R U B' U' R' U R B R'",
  33: "R U R' U' R' F R F'",
  34: "R U R2 U' R' F R U R U' F'",
  35: "R U2 R2 F R F' R U2 R'",
  36: "L' U' L U' L' U L U L F' L' F",
  37: "F R' F' R U R U' R'",
  38: "R U R' U R U' R' U' R' F R F'",
  39: "L F' L' U' L U F U' L'",
  40: "R' F R U R' U' F' U R",
  41: "R U R' U R U2 R' F R U R' U' F'",
  42: "R' U' R U' R' U2 R F R U R' U' F'",
  43: "F' U' L' U L F",
  44: "F U R U' R' F'",
  45: "F R U R' U' F'",
  46: "R' U' R' F R F' U R",
  47: "R' U' R' F R F' R' F R F' U R",
  48: "F R U R' U' R U R' U' F'",
  49: "r U' r2 U r2 U r2 U' r",
  50: "r' U r2 U' r2 U' r2 U r'",
  51: "F U R U' R' U R U' R' F'",
  52: "R U R' U R U' B U' B' R'",
  53: "r' U' R U' R' U R U' R' U2 r",
  54: "r U R' U R U' R' U R U2 r'",
  55: "R U2 R2 U' R U' R' U2 F R F'",
  56: "r U r' U R U' R' U R U' R' r U' r'",
  57: "R U R' U' M' U R U' r'",
};

// F2L, front-right slot. Keys are only labels; cases are recognised from
// the pieces, not from these numbers.
export const F2L = [
  'U R U\' R\'', 'U\' F\' U F', 'F\' U\' F', 'R U R\'',
  'U\' R U R\' U2 R U\' R\'', 'U F\' U\' F U2 F\' U F', 'U\' R U2 R\' U2 R U\' R\'', 'U F\' U2 F U2 F\' U F',
  'U\' R U\' R\' U F\' U\' F', 'U\' R U R\' U R U R\'', 'U\' R U2 R\' U F\' U\' F', 'R U\' R\' U R U\' R\' U2 R U\' R\'',
  'U F\' U F U\' F\' U\' F', 'U\' R U\' R\' U R U R\'', 'R\' D\' R U\' R\' D R U R U\' R\'', 'R U\' R\' U2 F\' U\' F',
  'R U2 R\' U\' R U R\'', 'F\' U2 F U F\' U\' F', 'U R U2 R\' U R U\' R\'', 'U\' F\' U2 F U\' F\' U F',
  'U2 R U R\' U R U\' R\'', 'U2 F\' U\' F U\' F\' U F', 'U R U\' R\' U\' R U\' R\' U R U\' R\'', 'U\' F\' U F U F\' U F U\' F\' U F',
  'U\' R\' F R F\' R U R\'', 'U R U\' R\' F R\' F\' R', 'R U\' R\' U R U\' R\'', 'F\' U F U\' F\' U F',
  "R U' R' F' U' F", 'R U R\' U\' R U R\'', 'U\' R\' F R F\' R U\' R\'', 'R U R\' U\' R U R\' U\' R U R\'',
  'U\' R U\' R\' U2 R U\' R\'', 'U R U R\' U2 R U R\'', 'U2 R U\' R\' U\' F\' U\' F', 'U F\' U\' F U\' R U R\'',
  'R2 U2 F R2 F\' U2 R\' U R\'', 'R U\' R\' U\' R U R\' U2 R U\' R\'', 'R U\' R\' U R U2 R\' U R U\' R\'', "R F U R U' R' F' U' R'",
  "R U F R U R' U' F' R'",
];

// Cross: every place one cross edge can be, relative to its home at the
// bottom-front, with the shortest moves that keep the other cross edges in
// place (found by search).
export const CROSS = ["D' L' D", "D L' D' F'", "U R' F R", "D R D'", "L2 U' F2", "B2 U2 F2", "R2 U F2", "D' L D", "F D' L D", "U L F' L'", "D R' D'", "L' F'", "D2 B D2", "F'", "L F' L'", 'R F', 'R2 F R2', 'F', "R' F R", "U' F2", 'U2 F2', 'F2', 'U F2'];

// ---------- Roux, ZZ and Petrus ----------
// Found by search (bidirectional BFS on the pieces each step tracks): each is
// a shortest solution, and each set covers every case once. Checked by verify.mjs.

// CMLL: the top corners, keeping both Roux blocks. M-slice edges are free.
export const CMLL = ["F R2 F2 U R' U R U2 F2 R2 F'", "F U F' U' R2 F2 L F' L' F2 R2", "R' F2 R2 U R' U L' U L2 F2 L'", "R U R' U R U2 R'", "L U2 L' U' L U' L'", "F U2 F2 U' F2 U F2 U2 F'", "F U2 F' U2 F' U2 F' U2 F", "R2 F2 R U L' U2 R U' L", "F2 L2 F' R2 F L2 F' R2 F'", "R U2 R F2 R' U2 R F2 R2", "R' F R U2 F U2 F'", "R U2 R2 F2 R F R' F2 R2 U2 R'", "F' U2 F U2 L F L'", "L2 U L' F2 L U' L' F2 L'", "R' F2 R' U' R F2 R' U R2", "R' U L U' R U L'", "L F2 L U L' F2 L U' L2", "R U' L' U R' U' L", "R2 U' R F2 R' U R F2 R", "F R' F' R U2 R U2 R'", "F' U2 F U2 F R' F' R", "R' U2 L F' L2 U2 L F R' F2 R2", "R' F' R F' U' F2 U' F' U2 F", "R' U2 F U2 F' U2 F' U2 R", "R' F2 U F2 U F2 U' F2 R", "F U2 F' U2 R' F' R", "R' F' R F' U' F U F", "F' L U2 L' F L F' U2 F L'", "R2 U' R F R' U R2 F U' F'", "F' L F L' U2 F2 R' F' R F'", "R U R2 F R F' U F R' F' R", "R U2 R' U2 R' F R F'", "R U2 R F2 R2 U' R U' R F2 R2", "F' L F L' U2 R' F2 R", "R2 U2 F2 U' R2 U2 F2 U R2 U2 F2", "F2 R2 F L' U' L U F' R2 F2", "R' U' F' U F R", "R U2 R' F R' F' R2 U2 R'", "R U R' U R' F R F' R U2 R'", "F U2 F' U' F U' R U R' U' F'", "R' U' R U' R' U F' U F R", "F R2 F2 U2 F R2 F' U2 F2 R2 F'"];

// LSE edge orientation (M and U only), yellow center on top.
export const LSE_EO = ["M U' M'", "M' U' M", "M2 U' M' U' M'", "M U' M U' M' U' M'", "M U M U' M' U' M'", "M' U' M' U2 M' U' M'", "M' U2 M' U2 M' U' M'", "M U2 M U2 M' U' M'", "M U' M' U' M U' M'", "M U M' U' M U' M'", "M' U' M' U2 M' U' M U' M' U' M'"];
// LSE: the left and right top edges, keeping edge orientation.
export const LSE_ULUR = [
  "U'","M2 U' M2", "M2 U M2", "M U2 M' U'", "M' U2 M U'", "M2 U' M2 U'", "M2 U M2 U'", "M2 U2 M2 U'", "M U2 M' U", "M' U2 M U", "M' U2 M' U' M2", "M U2 M U' M2", "M' U2 M' U M2", "M U2 M U M2", "M2 U' M' U2 M' U'", "M2 U M' U2 M' U'", "M2 U' M U2 M U'", "M2 U M U2 M U'", "M' U2 M' U' M2 U'", "M U2 M U' M2 U'", "M' U2 M' U M2 U'", "M U2 M U M2 U'", "M' U2 M' U' M2 U", "M U2 M U' M2 U", "M' U2 M' U M2 U", "M U2 M U M2 U", "M2 U' M U2 M' U' M2", "M2 U M U2 M' U' M2", "M2 U' M' U2 M U' M2", "M2 U M' U2 M U' M2"];
// LSE: the last four edges (M slice).
export const LSE_L4E = ["U2 M U2 M'", "U2 M' U2 M", "U2 M2 U2 M2", "M U2 M' U2", "M' U2 M U2", "M2 U2 M' U2 M'", "M' U2 M2 U2 M'", "M2 U2 M U2 M", "M' U2 M' U2 M2", "M U2 M U2 M2", "U2 M' U2 M2 U2 M' U2"];
// Roux second block: bottom-right edge, with R, r, U, M.
export const SB_EDGE = ["R'", "R", "R2", "r2 U' r2", "r2 U r2", "r U' r' R'", "r U r' R'", "r' U r R", "r U' r' U' R2", "r' U r U R2", "r2 U' r' U' r' R'"];
// Roux second block: front-right pair, keeping the first block, the bottom-right edge and the back pair.
export const SB_PAIR = ["R2 U2 R' U' R U' R2", "M' U R U2 r' U R U' R'", "R U2 R' U' R U R'", "r U2 r' U r U' r'", "R U2 R' U R U' R'", "r U' r' U2 r U r'", "R U' R' U2 R U R'", "R U' r' U2 r2 R' U r'", "R2 U' r2 U2 r2 U R2", "R U2 r' U' r U R'", "M U r U' R'", "M2 U' r U' M' R'", "R U' R'", "r2 R' U2 M U r'", "M U' r U' R'", "M2 U r U' M' R'", "M U2 r U' R'", "M' U M R U' R'", "R U' R' U2 R U' R'", "r U' M U' R'", "M R U2 M' U' R'", "r U r'", "M2 U r2 R' U R'", "M U' r2 R' U r'", "R U R'", "r U2 M2 U' M' R'", "R U' r' U' r U' R'", "R U' M2 U M U r'", "R U M U M' U' R'", "R U M2 U' M U r'", "M R U M' U' R'", "r U M U' R'", "R U M2 U2 M U r'", "R U R' U' R U R'", "R U r' U' r U R'", "R U2 R U R' U R U2 R2", "R U r' U' r2 R' U r'", "R U' R' U R U' R'", "R U' R' U2 r U' M U' R'", "R2 U2 R' U' R U' R' U2 R'", "r U' M2 R' U r U' R'"];
// ZZ edge orientation: bad edges only on the front face.
export const ZZ_EO = ["F'", "R F' R' F'", "U' F' R' F'", "R F R' F'", "L' F' U' F'"];
// ZZ line: the bottom-front edge, keeping edge orientation and the bottom-back edge.
export const ZZ_LINE = ["D2", "F2", "U' F2", "U F2", "U2 F2", "D R' D'", "D R D'", "D' L' D", "D' L D", "L2 U' F2", "R2 U F2"];
// ZZ-F2L: the bottom-right edge with R, U, L, keeping the line.
export const ZZ_EDGE = ["R'", "R", "R2", "L' U2 R2", "L U2 R2", "L2 U2 R2"];
// ZZ-F2L and Petrus: the front-right pair with R and U only.
export const RU_PAIR = ["R U' R'", "R U R'", "R U' R' U R U' R'", "R U R' U R U' R'", "R U2 R' U R U' R'", "R U' R' U2 R U' R'", "R U R' U2 R U' R'", "R U2 R' U2 R U' R'", "R U' R' U' R U R'", "R U R' U' R U R'", "R U2 R' U' R U R'", "R U' R' U R U R'", "R U2 R' U R U R'", "R' U2 R2 U R2 U R", "R2 U2 R' U' R U' R2", "R2 U2 R2 U' R2 U' R2", "R' U' R2 U' R2 U2 R2 U R'", "R2 U2 R' U' R U' R' U2 R'", "R' U2 R' U R' U' R U2 R", "R U2 R U R' U R U2 R2"];
// Bottom-left edge from anywhere (Roux first block, Petrus 2x2x2).
export const EDGE_DL = ["L'", "L", "L2", "D'", "D", "D2", "B' L'", "B L'", "B2 L'", "F' L", "F L", "F2 L", "U' L2", "U L2", "U2 L2", "F' D'", "F D'", "B' D", "B D", "D' B' L'", "D B' L'", "U' B L'", "U B L'"];
// Petrus 2x2x2: bottom-back edge, keeping the bottom-left edge.
export const EDGE_DB = ["B'", "B", "B2", "R' B'", "R B'", "R2 B'", "U' B2", "U B2", "U2 B2", "L D' L'", "L D L'", "L D2 L'", "L' D' L", "L' B L", "L2 B L2", "D' R' D", "D' R D", "U' R B'", "U R B'", "F L D' L'", "B' L' D' L"];
// Petrus 2x2x2: the back-left pair, keeping the two bottom edges.
export const PETRUS_BL = ["L R' U' F' U2 L'", "B' U R2 U2 B", "L U' F2 U2 L'", "B' F U R U2 B", "F L R2 U' L'", "F' U B' U' B", "R U' L U L'", "R' B' F2 U B", "L B' R B L'", "L U' L F' L2", "B' R B L U L'", "R B' R2 U2 B", "L U2 L'", "B U2 B2 U' B", "L B L' B' L'", "B2 U' B U B2", "R2 B2 R' B2", "B' U' B", "B2 U F U' B2", "L F' U' L F' L2", "B2 R2 B2 L U L'", "L2 F' L2", "F' L F2 U2 L'", "L F' L' B' U' B", "L R U' L'", "F2 L2 F L2", "L2 U L' U' L2", "L B L B' L'", "L2 U' R' U L2", "B' R U B' R B2", "L B U B' L'", "L' F' L F L", "L B U B L B2 L'", "L U2 R U' L'", "B2 R' B U2 B", "L U' B L2 U B' L'", "L U' L' B' R' U2 B", "B' U2 B' R B2", "L U' L' B' U' B", "L B U' L2 B' U L'", "B' U B L F U2 L'"];
// Petrus 2x2x3: the bottom-front edge with U, R, F, keeping the 2x2x2.
export const PETRUS_DF = ["F'", "F", "F2", "R' F", "R F", "R2 F", "R' U F2", "R U F2", "R2 U F2", "F U' R' F", "F2 U' R' F"];
// Petrus 2x2x3: the front-left pair, keeping the 2x2x2 and the bottom-front edge.
export const PETRUS_FL = ["F' U2 F U2 L' U' L", "R F2 U F' U' F2", "F R2 U F R F2", "F U' R2 U2 F'", "L' U R' U L", "F R2 U2 F'", "R U2 R2 F2 R F2", "R U2 F U F'", "F U2 R2 U2 F'", "F U' F R' F2", "F' U F L' U' L", "R U2 F R U2 F'", "F2 U2 F U2 R' F2", "F U' F'", "F R F' L' U' L", "F L F' L' F'", "L' U' L", "F2 R2 F' U2 F'", "L' U' R' U L", "F U F2 U2 F' R' F2", "L' U L", "F' U2 F2 U F'", "F U2 L F L' F'", "F2 U F U' F2", "R2 F2 R F2", "F U F'", "F L F L' F'", "F' U F2 U F'", "L' F R F' L", "F2 R U F U' F2", "F2 U2 R' U2 F2", "F' R' F' R F", "F2 U R U F U2 F2", "F U2 F R' F2", "F U' R U2 F'", "F2 R' U F2 R U' F2", "F U2 R' F' L' U' L", "F R2 U2 R' U F'", "F2 R F' U2 F'", "F2 U R' F2 U' R F2", "L' U L F R U2 F'"];
// Petrus edge orientation, bad edges on top, keeping the 2x2x3.
export const PETRUS_EO = ["U' F R' F'", "F U R' U' F'", "R' F' U2 F2 R' F'"];

// Mirror an algorithm left↔right ('x') or front↔back ('z'). Turns about the
// mirror's axis swap sides; every turn changes direction, except the slice
// that lies in the mirror itself.
const inv = m => (m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : `${m}'`);
export function mirror(alg, axis) {
  const swap = axis === 'x' ? { R: 'L', L: 'R', r: 'l', l: 'r' } : { F: 'B', B: 'F', f: 'b', b: 'f' };
  const slice = axis === 'x' ? 'M' : 'S';
  return alg.split(' ').map(m => (m[0] === slice ? m : inv((swap[m[0]] ?? m[0]) + m.slice(1)))).join(' ');
}
// The back pair is the front pair seen in a mirror; the first Roux block is
// the second one seen in a mirror.
export const SB_BACK = SB_PAIR.map(a => mirror(a, 'z'));
export const FB_PAIR = SB_PAIR.map(a => mirror(a, 'x'));
export const FB_BACK = SB_BACK.map(a => mirror(a, 'x'));
export const RU_BACK = RU_PAIR.map(a => mirror(a, 'z'));

// Free a stuck piece: for every place a piece of a pair/slot step can be
// stuck, a start position (setup from solved, the solved part intact) and the
// shortest moves, allowed in that step, that bring it to the top layer. Found
// by search; checked by verify.mjs.
export const STUCK = {
  F2L_STUCK: [
    { piece: "DBR", at: "DRF0", setup: "R' U' R F' U2 F", moves: "R U R'" },
    { piece: "DBR", at: "DRF1", setup: "R' U' R2 U2 R'", moves: "R U R'" },
    { piece: "DBR", at: "DRF2", setup: "F' B U F B'", moves: "R U R'" },
    { piece: "BR", at: "FR0", setup: "R2 F R2 F'", moves: "R U R'" },
    { piece: "BR", at: "FR1", setup: "F D R D' F'", moves: "R U R'" },
  ],
  CORNER_STUCK: [
    { piece: "DRF", at: "DRF1", setup: "U R U' R' U R U' R'", moves: "R U R' U'" },
    { piece: "DRF", at: "DRF2", setup: "R U R' U' R U R' U'", moves: "R U R' U'" },
    { piece: "DBR", at: "DRF0", setup: "B U B' U' U U R U' R' U' B U B' U'", moves: "R U R' U'" },
    { piece: "DBR", at: "DRF1", setup: "U B U' B' U U R U' R' U' B U B' U'", moves: "R U R' U'" },
    { piece: "DBR", at: "DRF2", setup: "B U B' U' U R U R' U' U' B U B' U'", moves: "R U R' U'" },
  ],
  EDGE_STUCK: [
    { piece: "FR", at: "FR1", setup: "U R U' R' U' F' U F U2 U R U' R' U' F' U F", moves: "U R U' R' U' F' U F" },
    { piece: "BR", at: "FR0", setup: "U R U' R' U' F' U F U' R' U R U B U' B' U' U' F' U F U R U' R'", moves: "U R U' R' U' F' U F" },
    { piece: "BR", at: "FR1", setup: "U R U' R' U' F' U F U' R' U R U B U' B' U R U' R' U' F' U F", moves: "U R U' R' U' F' U F" },
  ],
  RU_STUCK: [
    { piece: "DRF", at: "DBR0", setup: "R U R' U2 R' U' R", moves: "R' U R" },
    { piece: "DRF", at: "DBR1", setup: "R U' R' U' R' U' R", moves: "R' U R" },
    { piece: "DRF", at: "DBR2", setup: "R U R' R' U2 R", moves: "R' U R" },
    { piece: "FR", at: "BR0", setup: "R U R' R' U' R", moves: "R' U R" },
  ],
  RU_BACK_STUCK: [
    { piece: "DBR", at: "DRF0", setup: "R' U R U' R U2 R'", moves: "R U R'" },
    { piece: "DBR", at: "DRF1", setup: "R' U' R R U2 R'", moves: "R U R'" },
    { piece: "DBR", at: "DRF2", setup: "R' U R U R U R'", moves: "R U R'" },
    { piece: "BR", at: "FR0", setup: "R' U R R U' R'", moves: "R U R'" },
  ],
  FB_STUCK: [
    { piece: "DFL", at: "DRF0", setup: "F' R F", moves: "R" },
    { piece: "DFL", at: "DRF1", setup: "F U2 R2", moves: "R" },
    { piece: "DFL", at: "DRF2", setup: "F U' F", moves: "R" },
    { piece: "DFL", at: "DBR0", setup: "F L2 B L2", moves: "R'" },
    { piece: "DFL", at: "DBR1", setup: "F2 U' R", moves: "R'" },
    { piece: "DFL", at: "DBR2", setup: "F U2 R", moves: "R'" },
    { piece: "FL", at: "FR0", setup: "F2", moves: "R" },
    { piece: "FL", at: "FR1", setup: "F U' F' R'", moves: "R" },
    { piece: "FL", at: "BR0", setup: "F2 U R2", moves: "R'" },
    { piece: "FL", at: "BR1", setup: "F U' R", moves: "R'" },
    { piece: "FL", at: "DF0", setup: "L D L'", moves: "F2" },
    { piece: "FL", at: "DF1", setup: "F' R", moves: "F2" },
    { piece: "FL", at: "DB0", setup: "L D' R' L'", moves: "M" },
    { piece: "FL", at: "DB1", setup: "L2 B L2", moves: "M" },
    { piece: "FL", at: "DR0", setup: "F2 U R'", moves: "R2" },
    { piece: "FL", at: "DR1", setup: "D' F' D", moves: "R2" },
  ],
  FB_BACK_STUCK: [
    { piece: "DLB", at: "DRF0", setup: "B' L2 F' L2", moves: "R" },
    { piece: "DLB", at: "DRF1", setup: "B R B'", moves: "R" },
    { piece: "DLB", at: "DRF2", setup: "B2 U R'", moves: "R" },
    { piece: "DLB", at: "DBR0", setup: "B R' B'", moves: "R'" },
    { piece: "DLB", at: "DBR1", setup: "B' U B'", moves: "R'" },
    { piece: "DLB", at: "DBR2", setup: "D' R D", moves: "R'" },
    { piece: "BL", at: "FR0", setup: "B2 U' R2", moves: "R" },
    { piece: "BL", at: "FR1", setup: "B' U R'", moves: "R" },
    { piece: "BL", at: "BR0", setup: "B2", moves: "R'" },
    { piece: "BL", at: "BR1", setup: "D B D' R'", moves: "R'" },
    { piece: "BL", at: "DF0", setup: "L' D R L", moves: "M'" },
    { piece: "BL", at: "DF1", setup: "L2 F' L2", moves: "M'" },
    { piece: "BL", at: "DB0", setup: "L' D' L", moves: "B2" },
    { piece: "BL", at: "DB1", setup: "B R'", moves: "B2" },
    { piece: "BL", at: "DR0", setup: "B2 U R", moves: "R2" },
    { piece: "BL", at: "DR1", setup: "D B D'", moves: "R2" },
  ],
  SB_STUCK: [
    { piece: "FR", at: "DF0", setup: "R' L2 D' R L2", moves: "M'" },
    { piece: "FR", at: "DF1", setup: "L F L'", moves: "M'" },
    { piece: "FR", at: "DB0", setup: "R' L2 D R L2", moves: "M" },
    { piece: "FR", at: "DB1", setup: "R2 L' B' R2 L", moves: "M" },
  ],
  SB_BACK_STUCK: [
    { piece: "BR", at: "DF0", setup: "R L2 D' R' L2", moves: "M'" },
    { piece: "BR", at: "DF1", setup: "R2 L F R2 L'", moves: "M'" },
    { piece: "BR", at: "DB0", setup: "R L2 D R' L2", moves: "M" },
    { piece: "BR", at: "DB1", setup: "L' B' L", moves: "M" },
  ],
  PETRUS_BL_STUCK: [
    { piece: "DLB", at: "DFL0", setup: "L U R2 L' F", moves: "F" },
    { piece: "DLB", at: "DFL1", setup: "L U2 L' F2", moves: "F" },
    { piece: "DLB", at: "DFL2", setup: "L U R' L' F2", moves: "F" },
    { piece: "DLB", at: "DRF0", setup: "D F2 R2 F2 D'", moves: "R" },
    { piece: "DLB", at: "DRF1", setup: "L U R2 L'", moves: "R" },
    { piece: "DLB", at: "DRF2", setup: "L U2 F L'", moves: "R" },
    { piece: "DLB", at: "DBR0", setup: "L U' L' U R", moves: "R'" },
    { piece: "DLB", at: "DBR1", setup: "B' U B U2 R2", moves: "R'" },
    { piece: "DLB", at: "DBR2", setup: "L U R L'", moves: "R'" },
    { piece: "BL", at: "FL0", setup: "D' L2 D", moves: "F" },
    { piece: "BL", at: "FL1", setup: "D' L' D F", moves: "F" },
    { piece: "BL", at: "FR0", setup: "D B2 R2 D'", moves: "R" },
    { piece: "BL", at: "FR1", setup: "D B D' R", moves: "R" },
    { piece: "BL", at: "BR0", setup: "D B2 D'", moves: "R'" },
    { piece: "BL", at: "BR1", setup: "D B D' R'", moves: "R'" },
    { piece: "BL", at: "DF0", setup: "D' L' D", moves: "F2" },
    { piece: "BL", at: "DF1", setup: "D2 B D2", moves: "F2" },
    { piece: "BL", at: "DR0", setup: "D2 L' D2", moves: "R2" },
    { piece: "BL", at: "DR1", setup: "D B D'", moves: "R2" },
  ],
  PETRUS_FL_STUCK: [
    { piece: "DFL", at: "DRF0", setup: "L' U L U' R'", moves: "R" },
    { piece: "DFL", at: "DRF1", setup: "F U2 F' R2", moves: "R" },
    { piece: "DFL", at: "DRF2", setup: "F U F2 U2 F", moves: "R" },
    { piece: "DFL", at: "DBR0", setup: "F U' F' U2 R", moves: "R'" },
    { piece: "DFL", at: "DBR1", setup: "F' R F R' F", moves: "R'" },
    { piece: "DFL", at: "DBR2", setup: "F U2 R F'", moves: "R'" },
    { piece: "FL", at: "FR0", setup: "D' F2 D", moves: "R" },
    { piece: "FL", at: "FR1", setup: "F U' F' R'", moves: "R" },
    { piece: "FL", at: "BR0", setup: "F2 R' F2 R'", moves: "R'" },
    { piece: "FL", at: "BR1", setup: "F U' R F'", moves: "R'" },
    { piece: "FL", at: "DR0", setup: "F2 R' F2", moves: "R2" },
    { piece: "FL", at: "DR1", setup: "D' F' D", moves: "R2" },
  ],
};

// Edge-orientation steps: one case per place a bad edge can be outside the
// area the cases expect, with the move that brings it in (never changes
// good/bad). Found by search; checked by verify.mjs.
export const EO_BRING = {
  ZZ: [
    { at: 'UR', setup: "F U'", moves: 'U' }, { at: 'UB', setup: 'F U2', moves: 'U2' }, { at: 'UL', setup: 'F U', moves: "U'" },
    { at: 'DR', setup: 'F D', moves: "D'" }, { at: 'DB', setup: 'F D2', moves: 'D2' }, { at: 'DL', setup: "F D'", moves: 'D' },
    { at: 'BR', setup: 'F R2', moves: 'R2' }, { at: 'BL', setup: 'F L2', moves: 'L2' },
  ],
  PETRUS: [
    { at: 'FR', setup: "F' U F", moves: 'R' }, { at: 'BR', setup: "F R2 F'", moves: "R'" }, { at: 'DR', setup: "F R' F'", moves: 'R2' },
  ],
};
