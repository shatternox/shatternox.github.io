// Solving methods as data: steps → recognition groups → cases → moves.
// The beginner method comes from tree.mjs; CFOP is built from the verified
// algorithm sets in algs.mjs. Case pictures are generated from the
// algorithms themselves, so a picture and its moves can never disagree.
import { solved, applyMoves, pieces, tiles } from './cube.mjs?v=202611160411';
import { run, parse, invert, IDENTITY } from './moves.mjs?v=202611160411';
import { relevance, pieceLocation, ALGS } from './method.mjs?v=202611160411';
import { lessons, algNames } from './lessons.mjs?v=202611160411';
import { tree, goalState } from './tree.mjs?v=202611160411';
import { OLL, PLL, F2L, CROSS } from './algs.mjs?v=202611160411';

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
    name: 'Beginner', level: 'Start here', blurb: 'Layer by layer, about 8 short steps and a handful of moves. The method from Kelvin Kurniawan’s tutorial.',
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
};

const built = {};
export const methodList = Object.entries(DEFINITIONS).map(([id, d]) => ({ id, name: d.name, level: d.level, blurb: d.blurb }));
export function getMethod(id) {
  const key = DEFINITIONS[id] ? id : 'beginner';
  built[key] ??= { id: key, ...DEFINITIONS[key], steps: DEFINITIONS[key].steps() };
  return built[key];
}
export const caseCount = method => method.steps.reduce((sum, step) => sum + step.cases.length, 0);
