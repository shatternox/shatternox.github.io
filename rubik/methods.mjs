// Solving methods as data: steps → recognition groups → cases → moves.
// The beginner method comes from tree.mjs; CFOP is built from the verified
// algorithm sets in algs.mjs. Case pictures are generated from the
// algorithms themselves, so a picture and its moves can never disagree.
import { solved, applyMoves, pieces, tiles } from './cube.mjs?v=202611161630';
import { run, parse, invert, IDENTITY } from './moves.mjs?v=202611161630';
import { relevance, pieceLocation, ALGS } from './method.mjs?v=202611161630';
import { lessons, algNames } from './lessons.mjs?v=202611161630';
import { tree, goalState } from './tree.mjs?v=202611161630';
import {
  OLL, PLL, F2L, CROSS, CMLL, LSE_EO, LSE_ULUR, LSE_L4E, EDGE_DL, EDGE_DB, SB_EDGE, SB_PAIR, SB_BACK, FB_PAIR, FB_BACK,
  ZZ_EO, ZZ_LINE, ZZ_EDGE, RU_PAIR, RU_BACK, PETRUS_BL, PETRUS_DF, PETRUS_FL, PETRUS_EO,
} from './algs.mjs?v=202611161630';
import { goodEdge } from './verify.mjs?v=202611161630';

const SIDE_WORDS = { F: 'front', R: 'right', B: 'back', L: 'left' };
const U = k => [[], ['U'], ['U2'], ["U'"]][((k % 4) + 4) % 4];

// ---------- Masks: which stickers matter in a step ----------
function mask(state, keep) {
  const show = Array(54).fill(false);
  for (let f = 0; f < 6; f++) show[f * 9 + 4] = true;
  for (const [slot, indices] of Object.entries(pieces)) {
    const colors = indices.map(i => state[i]);
    indices.forEach((index, k) => { show[index] = keep(colors, k, slot); });
  }
  return show;
}
const crossMask = s => mask(s, colors => colors.length === 2 && colors.includes('D'));
const f2lMask = s => mask(s, colors => !colors.includes('U'));
const ollMask = s => mask(s, (colors, k) => !colors.includes('U') || colors[k] === 'U');
const ollEdgeMask = s => mask(s, (colors, k) => !colors.includes('U') || (colors.length === 2 && colors[k] === 'U'));
const pllCornerMask = s => mask(s, colors => !(colors.includes('U') && colors.length === 2));
const allMask = () => Array(54).fill(true);

// ---------- Building a case from an algorithm ----------
function fromAlg(key, alg, extra) {
  const moves = parse(alg);
  const start = run(solved, IDENTITY, invert(moves));
  const frames = [start];
  for (const move of moves) frames.push(run(frames.at(-1).state, frames.at(-1).orient, [move]));
  return {
    key, alg,
    start, frames,
    moves: moves.map(move => ({ move, block: 0 })),
    blocks: [{ kind: 'alg', label: extra.name ?? 'Algorithm', moves }],
    ...extra,
  };
}

// ---------- Recognition features ----------
const topIndex = { UF: 7, UR: 5, UB: 1, UL: 3 };
function edgeShape(state) {
  const up = ['UF', 'UR', 'UB', 'UL'].map(n => state[topIndex[n]] === 'U');
  const count = up.filter(Boolean).length;
  if (count === 4) return 'Cross (all 4 edges up)';
  if (count === 0) return 'Dot (no edges up)';
  return up[0] === up[2] ? 'Line (2 opposite edges up)' : 'L-shape (2 neighbour edges up)';
}
const cornersUp = state => [0, 2, 6, 8].filter(i => state[i] === 'U').length;
const sideRow = (state, face) => [0, 1, 2].map(i => state['URFDLB'.indexOf(face) * 9 + i]);
function pllFeatures(state) {
  let lights = 0;
  let bars = 0;
  for (const face of 'FRBL') {
    const [a, b, c] = sideRow(state, face);
    if (a === c) lights++;
    if (a === b && b === c) bars++;
  }
  const corners = lights === 4 ? 'Corners solved (headlights everywhere)' : lights === 1 ? 'Headlights on one side' : 'No headlights';
  return [corners, bars ? `${bars} full bar${bars > 1 ? 's' : ''}` : 'No full bar'];
}
function f2lFeatures(state) {
  const find = name => Object.entries(pieces).find(([, idx]) => idx.length === name.length && idx.every(i => name.includes(state[i])));
  const [cornerSlot, cornerIdx] = find('DRF');
  const [edgeSlot] = find('FR');
  const white = tiles[cornerIdx[cornerIdx.findIndex(i => state[i] === 'D')]].face;
  const corner = cornerSlot === 'DRF' ? 'Corner in the slot' : white === 'U' ? 'Corner on top, white up' : 'Corner on top, white to the side';
  const edge = edgeSlot === 'FR' ? 'Edge in the slot' : 'Edge on top';
  return [corner, edge];
}
function crossFeatures(state) {
  const find = Object.entries(pieces).find(([, idx]) => idx.length === 2 && idx.every(i => 'DF'.includes(state[i])) && idx.some(i => state[i] === 'D'));
  const [slot, idx] = find;
  const white = tiles[idx.find(i => state[i] === 'D')];
  const layer = white.position[1];
  const where = [...slot].filter(c => SIDE_WORDS[c]).map(c => SIDE_WORDS[c]).join('-') || 'top';
  if (layer === 1) return [white.face === 'U' ? 'On top, white facing up' : 'On top, white to the side', `${where}`];
  if (layer === 0) return ['In the middle layer', `${where}, white on ${SIDE_WORDS[white.face]}`];
  return ['On the bottom', `${where}, white ${white.face === 'D' ? 'down' : 'to the side'}`];
}
const focusFor = names => state => names.map(name => pieceLocation(state, name));

// ---------- Step definitions ----------
const OCLL_NAMES = { 21: 'H', 22: 'Pi', 23: 'Headlights', 24: 'Chameleon', 25: 'Bowtie', 26: 'Antisune', 27: 'Sune' };

function crossStep() {
  return {
    id: 'cross', name: 'Cross', art: 'iso', mask: crossMask, goal: goalState(1),
    summary: 'A white cross on the bottom, each edge matching its side center.',
    how: [
      'Hold <b>white on the bottom</b> from the start. Fast solvers plan the whole cross before turning.',
      'Place one edge at a time: turn the whole cube so the edge’s home (its other color’s center) is in front.',
      'Find the edge, see where its white sticker is, and pick that case.',
      'Aim for 8 moves or fewer. Stuck? The Beginner method’s daisy always works.',
    ],
    look: 'Choose a cross edge that isn’t home yet. Hold its home (the center of its other color) in front, white on the bottom. Where is the edge, and where does its white face?',
    done: 'White cross on the bottom, sides matching',
    hint: 'Hold the cube so the edge’s home is front-bottom, like the picture. The other cross edges stay where they are.',
    cases: CROSS.map((alg, i) => {
      const c = fromAlg(`c${i}`, alg, { name: 'Moves' });
      const [group, detail] = crossFeatures(c.start.state);
      return { ...c, group: [group], label: detail[0].toUpperCase() + detail.slice(1), focus: focusFor(['DF']) };
    }),
  };
}

function f2lStep() {
  return {
    id: 'f2l', name: 'F2L', art: 'iso', mask: f2lMask, goal: goalState(3),
    summary: 'The first two layers: four corner-edge pairs, each joined and placed in its slot.',
    how: [
      'Pick an empty slot and hold it at the <b>front-right</b>.',
      'Find its corner (white + the two side colors) and its edge (the two side colors).',
      'Turn the top until the pieces look like a picture, then do its moves: the pair joins and drops in.',
      'Repeat for all four slots. Next level: while you turn, look for the next pair.',
    ],
    look: 'Hold an unsolved slot at the front-right. Where is its corner, which way does its white face, and where is its edge?',
    done: 'First two layers solved',
    hint: 'Empty slot at the front-right. Turn the top until the corner and edge sit like the picture.',
    cases: F2L.map((alg, i) => {
      const c = fromAlg(`f${i + 1}`, alg, { name: `F2L ${i + 1}` });
      return { ...c, group: f2lFeatures(c.start.state), label: `F2L ${i + 1}`, focus: focusFor(['DRF', 'FR']) };
    }),
  };
}

function ollStep(subset) {
  const keys = subset ?? Object.keys(OLL);
  return {
    id: subset ? 'ocll' : 'oll', name: subset ? 'OLL corners' : 'OLL', art: 'top', mask: ollMask, goal: goalState(5),
    summary: 'The whole top is yellow. The sides can still be mixed.',
    how: subset ? [
      'You have a yellow cross. Now count the yellow corners facing up.',
      'Match the picture by turning the top (U), then do the algorithm.',
      'Seven cases, and two of them (Sune and Antisune) solve the rest if you repeat them.',
    ] : [
      'Look at the <b>edges</b> first: dot, line, L or cross.',
      'Then the <b>corners</b>: how many face up, and where the other yellow stickers point.',
      'Turn the top until it matches the picture, then do the algorithm.',
      'Learn in groups: the 7 cross cases first, then dots, lines and L shapes.',
    ],
    look: subset ? 'Count the yellow corners facing up, and see where the side yellow stickers point.' : 'What do the yellow edges make on top: a dot, a line, an L or a cross? Then look at the corners.',
    done: 'The whole top is yellow',
    hint: 'Turn the top until your yellow pattern matches the picture. The bottom edge of the picture is the side facing you.',
    cases: keys.map(n => {
      const c = fromAlg(`o${n}`, OLL[n], { name: `OLL ${n}` });
      const group = subset ? [] : [edgeShape(c.start.state), `${cornersUp(c.start.state)} corner${cornersUp(c.start.state) === 1 ? '' : 's'} up`];
      return { ...c, group, label: OCLL_NAMES[n] ? `${OCLL_NAMES[n]} (OLL ${n})` : `OLL ${n}` };
    }),
  };
}

function ollEdgeStep() {
  const algs = { dot: "F R U R' U' F' f R U R' U' f'", el: "f R U R' U' f'", line: "F R U R' U' F'" };
  const labels = { dot: 'Dot', el: 'L shape (hold it back-left)', line: 'Line (hold it left to right)' };
  return {
    id: 'eo', name: 'Yellow cross', art: 'top', mask: ollEdgeMask, goal: goalState(4),
    summary: 'A yellow cross on top. Corners don’t matter yet.',
    how: ['Look only at the 4 edges around the yellow center.', 'Hold the shape like the picture and do its algorithm.', 'Three cases, all built from F R U R′ U′ F′.'],
    look: 'Look at the 4 edges around the yellow center: dot, L or line?',
    done: 'A yellow cross on top',
    hint: 'Turn the top until the shape matches the picture.',
    cases: Object.entries(algs).map(([key, alg]) => ({ ...fromAlg(key, alg, { name: labels[key] }), group: [], label: labels[key] })),
  };
}

function pllStep(subset) {
  const names = subset ?? Object.keys(PLL);
  return {
    id: subset ? `pll-${subset.join('')}` : 'pll', name: subset ? (subset.includes('T') ? 'PLL corners' : 'PLL edges') : 'PLL',
    art: 'top', mask: subset?.includes('T') ? pllCornerMask : allMask, goal: subset?.includes('T') ? goalState(6) : solved,
    summary: subset?.includes('T') ? 'The top corners in their spots (headlights on every side).' : 'Solved: every side one color.',
    how: subset?.includes('T') ? [
      'Look at the top corners on each side. Same color on both = headlights.',
      'Headlights on one side: hold them on the left, do the T-perm. None: do the Y-perm.',
    ] : subset ? [
      'Corners are done. Look for a side whose whole top row is solved (a bar).',
      'Match the picture, do the algorithm, then turn the top to finish.',
    ] : [
      'Look at the sides of the top layer: corners first (headlights), then edges (bars).',
      'Turn the top to match the picture, then do the algorithm.',
      'Finish with a top turn so every side lines up.',
    ],
    look: subset?.includes('T') ? 'Look for headlights: the same color on both top corners of a side.' : 'Look at the top row of each side: where are the headlights and the full bars?',
    done: subset?.includes('T') ? 'Headlights on every side' : 'Solved!',
    hint: 'Turn the top until your side colors match the picture, then do the moves.',
    cases: names.map(name => {
      const c = fromAlg(name, PLL[name], { name: `${name} perm` });
      return { ...c, group: subset ? [] : pllFeatures(c.start.state), label: `${name} perm` };
    }),
  };
}

// ---------- Block methods: Roux, ZZ, Petrus ----------
const COLOR = { U: 'yellow', D: 'white', F: 'green', B: 'blue', R: 'orange', L: 'red' };
const FACING = { U: 'up', D: 'down', F: 'to the front', B: 'to the back', R: 'to the right', L: 'to the left' };
const capital = text => text[0].toUpperCase() + text.slice(1);
const isPiece = (colors, names) => names.some(n => n.length === colors.length && [...n].every(c => colors.includes(c)));
// An edge's key sticker: its yellow/white one, or else its green/blue one.
const keySticker = (colors, k) => colors.length === 2 && (colors.some(c => 'UD'.includes(c)) ? 'UD'.includes(colors[k]) : 'FB'.includes(colors[k]));
function maskWith(state, keep, centers) {
  const show = mask(state, keep);
  for (const f of 'URFDLB') show['URFDLB'.indexOf(f) * 9 + 4] = centers.includes(f);
  return show;
}
// Whole pieces from `names`, plus just the key sticker of edges in `keyed`
// (to see which edges are good or bad).
const blockMask = (names, centers = 'URFDLB', keyed = []) => s => maskWith(s, (colors, k) =>
  isPiece(colors, names) || (isPiece(colors, keyed) && keySticker(colors, k)), centers);

const FB = ['DL', 'DFL', 'DLB', 'FL', 'BL'];
const SB = ['DR', 'DRF', 'DBR', 'FR', 'BR'];
const U_CORNERS = ['UFR', 'URB', 'UBL', 'ULF'];
const LSE = ['UF', 'UR', 'UB', 'UL', 'DF', 'DB'];
const ALL_EDGES = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'BR', 'BL', 'FL'];
const P222 = ['DLB', 'DL', 'DB', 'BL'];
const P223 = [...P222, 'DF', 'DFL', 'FL'];
const F2L_ALL = [...FB, ...SB, 'DF', 'DB'];

function findPiece(state, name) {
  return Object.entries(pieces).find(([, idx]) => idx.length === name.length && [...name].every(c => idx.some(i => state[i] === c)));
}
const slotWords = slot => [...slot].filter(c => SIDE_WORDS[c]).map(c => SIDE_WORDS[c]).join('-');
// Where an edge is: its layer, then its spot and which way its key color faces.
function edgeFeatures(state, name, anyTop) {
  const [slot, idx] = findPiece(state, name);
  const face = tiles[idx.find(i => state[i] === name[0])].face;
  const color = `${COLOR[name[0]]} ${FACING[face]}`;
  if (slot === name) return ['In its spot', `In its spot, ${color}`];
  if (slot.includes('U')) return ['On top', anyTop ? `On top, ${color}` : `On top at the ${slotWords(slot)}, ${color}`];
  if (slot.includes('D')) return ['On the bottom', `Bottom-${slotWords(slot)}, ${color}`];
  return ['In the middle layer', `${capital(slotWords(slot))}, ${color}`];
}
function pairFeatures(state, corner, edge) {
  const [cornerSlot, cornerIdx] = findPiece(state, corner);
  const [edgeSlot] = findPiece(state, edge);
  const white = tiles[cornerIdx.find(i => state[i] === 'D')].face;
  return [
    cornerSlot === corner ? 'Corner in its slot' : white === 'U' ? 'Corner on top, white up' : 'Corner on top, white to the side',
    edgeSlot === edge ? 'Edge in its slot' : 'Edge on top',
  ];
}

// A part of a step: one piece or pair, with its own cases.
function edgeCases(prefix, part, name, algs, anyTop, extra = {}) {
  return algs.map((alg, i) => {
    const c = fromAlg(`${prefix}${i}`, alg, { name: 'Moves', ...extra });
    const [layer, label] = edgeFeatures(c.start.state, name, anyTop);
    return { ...c, group: [part, layer], label, focus: focusFor([name]) };
  });
}
function pairCases(prefix, part, corner, edge, algs, extra = {}) {
  return algs.map((alg, i) => {
    const c = fromAlg(`${prefix}${i}`, alg, { name: 'Moves', ...extra });
    return { ...c, group: [part, ...pairFeatures(c.start.state, corner, edge)], label: `${part} ${i + 1}`, focus: focusFor([corner, edge]) };
  });
}
// Pictures of left-side steps are drawn from the front-left.
const fromLeft = c => ({ ...c, start: { ...c.start, yaw: 3 } });

const KEY_COLOR = 'Every edge has a <b>key color</b>: yellow or white if it has one, otherwise green or blue.';
const GOOD_EDGE = 'An edge is <b>good</b> if its key color faces up or down (for the 4 middle-layer edges, front or back is good too). Any other edge is <b>bad</b>.';

// Shape of the top corners, named like the OLL corner cases.
const twistKey = state => [0, 1, 2, 3].map(k => {
  const s = applyMoves(state, U(k));
  return U_CORNERS.map(n => pieces[n].findIndex(i => s[i] === 'U')).join('');
}).sort()[0];
let shapes;
function cornerShape(state) {
  shapes ??= Object.fromEntries([[21, 'H'], [22, 'Pi'], [23, 'U'], [24, 'T'], [25, 'L'], [26, 'Antisune'], [27, 'Sune']]
    .map(([n, name]) => [twistKey(run(solved, IDENTITY, invert(parse(OLL[n]))).state), name]));
  return shapes[twistKey(state)] ?? 'O';
}
const SHAPE_GROUP = { O: 'All corners yellow up (O)', H: 'H: no corner up, two bars', Pi: 'Pi: no corner up', U: 'U: two up, headlights', T: 'T: two up, side by side', L: 'L: two up, diagonal', Sune: 'Sune: one up', Antisune: 'Antisune: one up' };

const NEAR = { UF: 'front', UR: 'right', UB: 'back', UL: 'left', DF: 'bottom-front', DB: 'bottom-back' };
function badWords(slots) {
  const top = slots.filter(s => s[0] === 'U');
  const bottom = slots.filter(s => s[0] === 'D');
  const parts = [];
  if (top.length === 4) parts.push('all 4 on top');
  else if (top.length === 2) parts.push(top.includes('UF') === top.includes('UB') && top.includes('UR') === top.includes('UL') ? '2 opposite on top' : '2 side by side on top');
  else if (top.length) parts.push(`${top.length} on top`);
  if (bottom.length === 2) parts.push('both bottom ones');
  else if (bottom.length) parts.push(`the ${NEAR[bottom[0]]} one`);
  return parts.join(' + ');
}

function rouxSteps() {
  const fbMask = blockMask(FB, 'L');
  const sbMask = blockMask([...FB, ...SB], 'LR');
  return [{
    id: 'fb', name: 'First block', art: 'iso', yaw: 3, mask: fbMask, goal: solved,
    summary: 'A 1×2×3 block on the left side: the bottom-left edge and two corner-edge pairs, matching the left center.',
    how: [
      'Hold <b>white on the bottom</b>. The block is the whole left side except its top row.',
      'First the <b>bottom-left edge</b> (white + the left center’s color), like a cross edge.',
      'Then the <b>front pair</b> and the <b>back pair</b>: a corner and its edge, joined and dropped in.',
      'Pieces stuck somewhere awkward? Bring them to the top first. Experts plan this whole block before turning.',
    ],
    look: 'Next piece of the left block: the bottom-left edge, then the front pair, then the back pair. Where is it?',
    done: 'Left block done',
    hint: 'White on the bottom, block on the left. The picture shows the cube from the front-left; turn the top until your pieces match it.',
    cases: [
      ...edgeCases('fe', 'Bottom-left edge', 'DL', EDGE_DL, false).map(fromLeft),
      ...pairCases('fp', 'Front pair', 'DFL', 'FL', FB_PAIR).map(fromLeft),
      ...pairCases('fq', 'Back pair', 'DLB', 'BL', FB_BACK).map(fromLeft),
    ],
  }, {
    id: 'sb', name: 'Second block', art: 'iso', mask: sbMask, goal: solved,
    summary: 'The same 1×2×3 block on the right side. Only the top layer and the middle slice are left after it.',
    how: [
      'Turn only <b>R, r, U and M</b>: they never touch the left block.',
      'Bottom-right edge first, then the front pair, then the back pair.',
      'The middle slice is free: its edges and centers can be anywhere for now, so the pictures grey them out.',
      'An edge stuck in the bottom middle? M′ or M2 brings it up without hurting anything.',
    ],
    look: 'Next piece of the right block: the bottom-right edge, then the front pair, then the back pair. Where is it?',
    done: 'Both blocks done',
    hint: 'Left block on the left. Turn the top (or the middle slice) until your pieces match the picture.',
    cases: [
      ...edgeCases('se', 'Bottom-right edge', 'DR', SB_EDGE, true),
      ...pairCases('sp', 'Front pair', 'DRF', 'FR', SB_PAIR),
      ...pairCases('sq', 'Back pair', 'DBR', 'BR', SB_BACK),
    ],
  }, {
    id: 'cmll', name: 'CMLL', art: 'top', mask: blockMask([...FB, ...SB, ...U_CORNERS], 'LR'), goal: solved,
    summary: 'The four top corners solved in one go: yellow up and in their spots, matching the blocks.',
    how: [
      'First the <b>shape</b>: how many corners show yellow on top? It’s the same shapes as OLL corners (Sune, H, Pi…).',
      'Then the <b>side colors</b> of the corners pick the exact case, 6 per shape.',
      'Top edges and the middle slice don’t matter here: CMLL may mix them, the last step fixes them.',
      'Learn one shape at a time. Sune and Antisune first: they come up most.',
    ],
    look: 'How many top corners show yellow on top? Then look at the colors on their sides.',
    done: 'Top corners solved',
    hint: 'Turn the top until your corners match the picture, then do the moves.',
    cases: (() => {
      const count = {};
      return CMLL.map((alg, i) => {
        const c = fromAlg(`cm${i}`, alg, { name: 'CMLL' });
        const shape = cornerShape(c.start.state);
        count[shape] = (count[shape] ?? 0) + 1;
        return { ...c, group: [SHAPE_GROUP[shape]], label: `${shape} ${count[shape]}` };
      }).sort((a, b) => Object.keys(SHAPE_GROUP).indexOf(a.label.split(' ')[0]) - Object.keys(SHAPE_GROUP).indexOf(b.label.split(' ')[0]));
    })(),
  }, {
    id: 'lse-eo', name: 'LSE · edge orientation', art: 'iso', mask: blockMask([...FB, ...SB], 'URFDLB', LSE), goal: solved,
    summary: 'The last six edges all “good”: their yellow or white sticker faces up or down.',
    how: [
      'From here on only the middle slice (<b>M</b>) and the top (<b>U</b>) turn.',
      'First turn M until the yellow center is on top (if white is on top, M2).',
      'An edge is <b>bad</b> if its yellow or white sticker faces a side. There are always 0, 2, 4 or 6.',
      'Turn the top to match a picture, do its moves, and all six edges are good.',
    ],
    look: 'Yellow center on top. Which of the six edges (top layer + bottom-front + bottom-back) show yellow or white to the side?',
    done: 'All six edges good',
    hint: 'Yellow center on top. Turn U until your bad edges sit like the picture.',
    cases: LSE_EO.map((alg, i) => {
      const c = fromAlg(`le${i}`, alg, { name: 'Moves' });
      const bad = LSE.filter(s => !goodEdge(c.start.state, s));
      return { ...c, group: [`${bad.length} bad edges`], label: capital(badWords(bad)), focus: focusFor(bad) };
    }),
  }, {
    id: 'lse-lr', name: 'LSE · left and right edges', art: 'iso', mask: blockMask([...FB, ...SB, ...U_CORNERS, 'UL', 'UR'], 'URFDLB', LSE), goal: solved,
    summary: 'The top-left and top-right edges in place, matching the corners.',
    how: [
      'Find the two edges that belong at the top-left (yellow-red) and top-right (yellow-orange).',
      'They can be anywhere in the top layer or at the bottom-front and bottom-back.',
      'The usual trick: get both to the bottom (front and back), then M2 and a top turn puts them home.',
      'M and U2 keep all edges good. A single U turn is fine too while the yellow center is on top.',
    ],
    look: 'Where are the yellow-red and yellow-orange edges? Top layer, or bottom middle?',
    done: 'Top-left and top-right edges solved',
    hint: 'Turn the top until the corners and these two edges sit like the picture.',
    cases: LSE_ULUR.map((alg, i) => {
      const c = fromAlg(`lr${i}`, alg, { name: 'Moves' });
      const where = ['UL', 'UR'].map(n => findPiece(c.start.state, n)[0]);
      const down = where.filter(s => s[0] === 'D').length;
      const words = ['UL', 'UR'].map((n, k) => `${n === 'UL' ? 'red' : 'orange'} edge ${where[k] === n ? 'home' : `at ${NEAR[where[k]]}`}`);
      // The top turn that would bring the corners home.
      const turn = [0, 1, 2, 3].find(k => pieces.UFR.every(i => applyMoves(c.start.state, U(k))[i] === solved[i]));
      if (turn) words.push(`corners ${["", "U", "U2", "U′"][turn]} away`);
      return { ...c, group: [['Both on top', 'One at the bottom', 'Both at the bottom'][down]], label: capital(words.join(', ')), focus: focusFor(['UL', 'UR']) };
    }),
  }, {
    id: 'lse-4', name: 'LSE · last four edges', art: 'iso', mask: allMask, goal: solved,
    summary: 'The four middle-slice edges and the centers. Then the cube is solved.',
    how: [
      'Only the middle slice is left: its four edges (top-front, top-back, bottom-front, bottom-back) and its centers.',
      'Find the case and do its M and U2 moves. The centers come home with the edges.',
      'Tip: M2 and U2 never break the other pieces, so you can line things up with them freely.',
    ],
    look: 'Look at the middle slice: the front and back edges on top and bottom, and the centers.',
    done: 'Solved!',
    hint: 'Hold the cube like the picture: the middle-slice edges and centers matter now.',
    cases: LSE_L4E.map((alg, i) => ({ ...fromAlg(`l4${i}`, alg, { name: 'Moves' }), group: [], label: `Last 4 edges ${i + 1}`, focus: focusFor(['UF', 'UB', 'DF', 'DB']) })),
  }];
}

function eoCases(prefix, algs, slots) {
  return algs.map((alg, i) => {
    const c = fromAlg(`${prefix}${i}`, alg, { name: 'Moves' });
    const bad = slots.filter(s => !goodEdge(c.start.state, s));
    return { ...c, group: [], bad, focus: focusFor(bad) };
  });
}
const opposite = bad => (bad.includes('UF') && bad.includes('UB')) || (bad.includes('UR') && bad.includes('UL'));

function f2lFinish(prefix, edgeAlgs) {
  return [
    ...edgeCases(`${prefix}e`, 'Bottom-right edge', 'DR', edgeAlgs, true),
    ...pairCases(`${prefix}p`, 'Front-right pair', 'DRF', 'FR', RU_PAIR),
    ...pairCases(`${prefix}q`, 'Back-right pair', 'DBR', 'BR', RU_BACK),
  ];
}

function zzSteps() {
  return [{
    id: 'zz-eo', name: 'Edge orientation', art: 'iso', mask: blockMask([], 'URFDLB', ALL_EDGES), goal: solved,
    summary: 'All 12 edges “good”: each can be solved without quarter turns of the front or back.',
    how: [
      KEY_COLOR,
      GOOD_EDGE,
      'Bad edges come in pairs. Turn U, D, R and L to bring them onto the <b>front face</b> (those turns never change good or bad), then pick the case.',
      'More than 4 bad? Fix 4 at a time and look again. Experts do this step and the next in one go (EOLine).',
    ],
    look: 'Find the bad edges (key color facing the wrong way) and bring them to the front face. How many, and where?',
    done: 'All 12 edges good',
    hint: 'Only the key stickers are shown. Get your bad edges onto the front face like the picture.',
    cases: eoCases('ze', ZZ_EO, ALL_EDGES).map(c => {
      const words = c.bad.map(s => ({ UF: 'top', FR: 'right', DF: 'bottom', FL: 'left' })[s]);
      return { ...c, label: c.bad.length === 4 ? '4 bad, all on the front' : `2 bad on the front: ${words.join(' and ')}` };
    }),
  }, {
    id: 'zz-line', name: 'Line', art: 'iso', mask: blockMask(['DF', 'DB'], 'DFB'), goal: solved,
    summary: 'The bottom-front and bottom-back edges in place: a white line on the bottom.',
    how: [
      'Place the two white edges that belong at the bottom-front and bottom-back.',
      'Turn U, D, R and L freely, but F and B <b>only as half turns</b> (F2, B2): that keeps every edge good.',
      'Place one, turn the cube around (y2), place the other. Turning the cube around keeps edges good too.',
    ],
    look: 'Hold a line edge’s home at the bottom-front. Where is that edge now?',
    done: 'White line at the bottom-front and bottom-back',
    hint: 'Hold the edge’s home at the bottom-front, like the picture. The other line edge stays put.',
    cases: ZZ_LINE.map((alg, i) => {
      const c = fromAlg(`zl${i}`, alg, { name: 'Moves' });
      const [layer, label] = edgeFeatures(c.start.state, 'DF', false);
      const swapped = findPiece(c.start.state, 'DF')[0] === 'DB';
      return { ...c, group: [layer], label: swapped ? 'Both line edges swapped' : label, focus: focusFor(['DF']) };
    }),
  }, {
    id: 'zz-f2l', name: 'ZZ-F2L', art: 'iso', mask: f2lMask, goal: solved,
    summary: 'A 1×2×3 block on each side of the line: the first two layers, with only R, U and L.',
    how: [
      'All edges are good, so <b>R, U and L</b> are enough. No cube rotations, no F or B.',
      'Right block first: the bottom-right edge, then the front-right pair, then the back-right pair, all with R and U.',
      'Then turn the cube around (y2) and build the other block the same way.',
      'A piece of the first block stuck on the left? An L turn brings it up (that side isn’t built yet).',
    ],
    look: 'Unbuilt block on the right. Next: the bottom-right edge, then the front-right pair, then the back-right pair. Where are the pieces?',
    done: 'First two layers solved',
    hint: 'Unbuilt block on the right. Turn the top until your pieces match the picture.',
    cases: f2lFinish('zf', ZZ_EDGE),
  }, ollStep(['21', '22', '23', '24', '25', '26', '27']), pllStep()];
}

function petrusSteps() {
  return [{
    id: 'p222', name: '2×2×2 block', art: 'iso', yaw: 3, mask: blockMask(P222, 'DLB'), goal: solved,
    summary: 'A 2×2×2 block at the bottom-back-left: one corner and its three edges, matching the centers.',
    how: [
      'Hold <b>white on the bottom</b>. The block goes at the bottom-back-left.',
      'Place the <b>bottom-left edge</b>, then the <b>bottom-back edge</b>, then the corner with its edge (the <b>back-left pair</b>).',
      'Nothing else is built yet, so any turn is fine. Experts plan the whole block before turning: about 7 moves.',
    ],
    look: 'Next piece of the 2×2×2: the bottom-left edge, then the bottom-back edge, then the back-left pair. Where is it?',
    done: '2×2×2 block done',
    hint: 'White on the bottom. The picture shows the cube from the front-left; match the piece, then do the moves.',
    cases: [
      ...edgeCases('pa', 'Bottom-left edge', 'DL', EDGE_DL, false),
      ...edgeCases('pb', 'Bottom-back edge', 'DB', EDGE_DB, false),
      ...pairCases('pc', 'Back-left pair', 'DLB', 'BL', PETRUS_BL),
    ].map(fromLeft),
  }, {
    id: 'p223', name: '2×2×3 block', art: 'iso', yaw: 3, mask: blockMask(P223, 'DLBF'), goal: solved,
    summary: 'The block grown forward to 2×2×3: the whole bottom-left. Only the top and the right side are left.',
    how: [
      'Turn only <b>U, R and F</b>: they leave the 2×2×2 alone.',
      'Place the <b>bottom-front edge</b>, then the <b>front-left pair</b>.',
      'Look ahead: after this, every move is R or U except one short edge fix.',
    ],
    look: 'Next: the bottom-front edge, then the front-left pair. Where are the pieces?',
    done: '2×2×3 block done',
    hint: 'Block at the bottom-left. Turn the top until your pieces match the picture.',
    cases: [
      ...edgeCases('pd', 'Bottom-front edge', 'DF', PETRUS_DF, true),
      ...pairCases('pe', 'Front-left pair', 'DFL', 'FL', PETRUS_FL),
    ].map(fromLeft),
  }, {
    id: 'p-eo', name: 'Edge orientation', art: 'iso', mask: blockMask(P223, 'URFDLB', ALL_EDGES), goal: solved,
    summary: 'Every remaining edge “good”, so the rest of the first two layers needs only R and U.',
    how: [
      KEY_COLOR,
      GOOD_EDGE,
      'Bring the bad edges to the top with R and U (those turns never change good or bad), then pick the case.',
      'Always an even number. 6 bad? Fix 4, then look again.',
    ],
    look: 'Find the bad edges among the top and right-side edges, and bring them to the top. How many, and where?',
    done: 'All edges good',
    hint: 'Only key stickers are shown. Turn the top until your bad edges sit like the picture.',
    cases: eoCases('po', PETRUS_EO, ALL_EDGES).map(c => ({ ...c, label: c.bad.length === 4 ? '4 bad, all on top' : opposite(c.bad) ? '2 bad, opposite' : '2 bad, side by side' })),
  }, {
    id: 'p-f2l', name: 'Finish F2L', art: 'iso', mask: f2lMask, goal: solved,
    summary: 'The rest of the first two layers with only R and U.',
    how: [
      'With good edges, <b>R and U</b> are all you need: no rotations.',
      'Bottom-right edge first, then the front-right pair, then the back-right pair.',
      'These are the same cases as ZZ-F2L.',
    ],
    look: 'Next: the bottom-right edge, then the front-right pair, then the back-right pair. Where are the pieces?',
    done: 'First two layers solved',
    hint: 'Block on the left. Turn the top until your pieces match the picture.',
    cases: f2lFinish('pf', ZZ_EDGE.filter(a => /^[RU' 2]+$/.test(a))),
  }, ollStep(['21', '22', '23', '24', '25', '26', '27']), pllStep()];
}

// The beginner method, as the same kind of data.
function beginnerSteps() {
  return tree.map((step, stage) => {
    const lesson = lessons[stage];
    const algs = lesson.alg ? [lesson.alg].flat() : [];
    return {
      id: `b${stage}`, name: step.name, art: lesson.art, mask: s => relevance(stage, s), goal: goalState(stage),
      summary: lesson.goal, how: lesson.how, look: step.look, done: step.done,
      memo: algs.map(key => ({ name: algNames[key], moves: ALGS[key] })),
      cases: step.cases.map(c => ({ ...c, group: [], focus: c.target ? s => [pieceLocation(s, c.target)] : undefined })),
    };
  });
}

const DEFINITIONS = {
  beginner: {
    name: 'Beginner', level: 'Start here', blurb: 'Layer by layer, about 8 short steps and a handful of moves. The classic way most people learn.',
    steps: beginnerSteps,
  },
  cfop4: {
    name: 'CFOP · 4-look', level: 'Intermediate', blurb: 'The speedcubing method with a lighter last layer: Cross, F2L, then 4 short looks using 16 algorithms.',
    steps: () => [crossStep(), f2lStep(), ollEdgeStep(), ollStep(['21', '22', '23', '24', '25', '26', '27']), pllStep(['T', 'Y']), pllStep(['Ua', 'Ub', 'H', 'Z'])],
  },
  cfop: {
    name: 'CFOP · full', level: 'Advanced', blurb: 'Full CFOP: Cross, all 41 F2L cases, all 57 OLLs and all 21 PLLs. What most fast solvers use.',
    steps: () => [crossStep(), f2lStep(), ollStep(), pllStep()],
  },
  roux: {
    name: 'Roux', level: 'Advanced', blurb: 'Two side blocks, then the top corners (42 CMLLs), then the last six edges with only M and U. Few moves, few algorithms.',
    steps: rouxSteps,
  },
  zz: {
    name: 'ZZ', level: 'Advanced', blurb: 'Orient every edge and place a line first, then build both layers with only R, U and L, and finish with OCLL and PLL.',
    steps: zzSteps,
  },
  petrus: {
    name: 'Petrus', level: 'Advanced', blurb: 'Grow a block from 2×2×2 to 2×2×3, fix the edges, finish both layers with R and U, then OCLL and PLL.',
    steps: petrusSteps,
  },
};

const built = {};
export const methodList = Object.entries(DEFINITIONS).map(([id, d]) => ({ id, name: d.name, level: d.level, blurb: d.blurb }));
export function getMethod(id) {
  const key = DEFINITIONS[id] ? id : 'beginner';
  built[key] ??= { id: key, ...DEFINITIONS[key], steps: DEFINITIONS[key].steps() };
  return built[key];
}
export const caseCount = method => method.steps.reduce((sum, step) => sum + step.cases.length, 0);
