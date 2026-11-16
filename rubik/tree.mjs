// The solving map: for every step, where to look, every case you can see,
// and the moves for it, already held the right way. Pure data plus drawings,
// shared by the coach and the map view.
import { solved, applyMoves, tokens, inverse, tiles, inspectCube } from './cube.mjs?v=202611160440';
import { planNext, play, relevance, pieceLocation, currentStage, WHITE_EDGES } from './method.mjs?v=202611160440';
import { lessons, standard, palette } from './lessons.mjs?v=202611160440';
import { examples } from './examples.mjs?v=202611160440';
import { isoCube, topView } from './art.mjs?v=202611160440';

// A cube with a finished daisy: every white edge on top, white facing up.
const daisy = applyMoves(solved, tokens('F2 R2 B2 L2'));
const fromGoal = (goal, moves) => applyMoves(goal, inverse(tokens(moves)));

const LOOK = [
  'No white on top yet? That’s normal: start with any white edge (white plus one other color) that isn’t on top with white facing up. If its white is on a side, turn the whole cube so the white faces you. If it’s on the bottom face, keep holding as is.',
  'Look at the white petals on top. Check each petal’s other color against the center below it.',
  'Find a corner with white in the top layer. Turn the top until it sits above its spot, and hold that spot at the front-right.',
  'Find a top edge with no yellow. Turn the top until its front color matches the center below, and face it.',
  'Look at the top only. How many yellow edges touch the yellow center?',
  'Count the yellow corners facing up, then look at where the other yellow stickers point.',
  'Look at the two top corners of each side. Same color on both = headlights.',
  'Look for a side whose whole top row is one color.',
];
const DONE = [
  'All 4 white edges are on top: a daisy',
  'A white plus on the bottom, sides matching',
  'The bottom is all white, bottom row matches',
  'The bottom two rows are solved',
  'A yellow plus on top',
  'The whole top is yellow',
  'Headlights on every side',
  'Solved!',
];

// Hand-made cases for the first two steps: the piece is shown where you hold it.
const MANUAL = {
  0: {
    middle: { moves: 'R', hold: 'White faces you in the middle row. First check the top spot right above it (top-right for R, top-left for L′): if it’s already white, turn the top (U) until it isn’t. Then: on the right side → R, on the left side → L′.' },
    top: { moves: "F U' R", hold: 'White faces you in the top row. No need to make room first: F drops it to the middle, U′ makes room on top, R lifts it up.' },
    bottom: { moves: "F L' F'", hold: 'White faces you in the bottom row. If the top-left spot is already white, turn the top (U) until it isn’t. Then: F brings it to the middle, L′ lifts it, F′ puts the front back.' },
    down: { state: applyMoves(daisy, tokens('U F2')), moves: 'F2', hold: 'White is on the bottom face. Turn the bottom (D) until the piece is at the front. If the top-front spot is already white, turn the top (U) until it isn’t. Then F2.' },
  },
  1: {
    matched: { state: daisy, moves: 'F2', hold: 'The petal’s side color already matches the center under it. Hold that side in front.' },
    turn: { state: applyMoves(daisy, ['U']), moves: "U' F2", hold: 'Turn the top until the petal’s side color matches the center below, then hold that side in front.' },
  },
};

function framesOf(start, blocks) {
  const frames = [start];
  const moves = blocks.flatMap((block, index) => block.moves.map(move => ({ move, block: index })));
  for (const { move } of moves) {
    const last = frames.at(-1);
    frames.push(play(last.state, last.yaw, [move]));
  }
  return { moves, frames };
}

// The piece a case is about: not done before, done after.
const home = inspectCube(solved);
function changedPiece(stage, before, after) {
  const pb = inspectCube(before);
  const pa = inspectCube(after);
  const good = positions => name => stage === 0 ? tiles[positions[name]].face === 'U' : positions[name] === home[name];
  return WHITE_EDGES.find(name => !good(pb)(name) && good(pa)(name));
}

function buildCase(stage, key) {
  const manual = MANUAL[stage]?.[key];
  if (manual) {
    const moves = tokens(manual.moves);
    const state = manual.state ?? fromGoal(daisy, manual.moves);
    const blocks = [{ kind: 'alg', label: stage === 0 ? 'Bring it up' : 'Send it down', moves }];
    const start = { state, yaw: 0 };
    const end = play(state, 0, moves).state;
    return { start, blocks, hold: manual.hold, target: changedPiece(stage, state, end), ...framesOf(start, blocks) };
  }
  // Everything else comes from a real example, starting from the moment
  // it is held the right way: setup turns are described, not demonstrated.
  const [state, yaw] = examples[stage][key];
  const plan = planNext(state, yaw);
  let start = { state, yaw };
  let index = 0;
  const skip = block => block.kind === 'setup' || block.kind === 'rotate';
  if (key === 'stuck') {
    while (plan.blocks[index]?.kind === 'rotate') start = play(start.state, start.yaw, plan.blocks[index++].moves);
    const pop = plan.blocks.findIndex(block => block.kind === 'alg');
    const blocks = plan.blocks.slice(index, pop + 1);
    return { start, blocks, target: plan.target, ...framesOf(start, blocks) };
  }
  while (plan.blocks[index] && skip(plan.blocks[index]) && index < plan.blocks.length - 1) {
    start = play(start.state, start.yaw, plan.blocks[index++].moves);
  }
  const blocks = plan.blocks.slice(index);
  return { start, blocks, target: plan.target, ...framesOf(start, blocks) };
}

export const tree = lessons.map((lesson, stage) => ({
  stage,
  name: lesson.name,
  look: LOOK[stage],
  done: DONE[stage],
  cases: Object.entries(lesson.cases).map(([key, [label, hint]]) => {
    const built = buildCase(stage, key);
    return { key, label, hint: built.hold ?? hint, ...built };
  }),
}));

export const findCase = (stage, key) => tree[stage].cases.find(c => c.key === key);

// What a finished step looks like, for "is this step done?".
let goals;
export function goalState(stage) {
  if (!goals) {
    goals = [];
    let at = { state: applyMoves(solved, tokens("R2 D' B U2 L F' D2 R' U B2 L2 F R D' L' U2 B' R2 F2 D L")), yaw: 0 };
    for (let guard = 0; guard < 80; guard++) {
      const plan = planNext(at.state, at.yaw);
      if (plan.stage < 0) break;
      at = plan.end;
      const now = currentStage(at.state);
      for (let s = plan.stage; s < (now < 0 ? 8 : now); s++) goals[s] ??= at.state;
    }
  }
  return goals[stage] ?? solved;
}

// ---------- Drawings ----------
const thumbs = new Map();
export function caseThumb(stage, key) {
  const id = `${stage}:${key}`;
  if (thumbs.has(id)) return thumbs.get(id);
  const c = findCase(stage, key);
  const { state, yaw } = c.start;
  let html;
  if (lessons[stage].art === 'top') {
    html = topView(state, { palette, colors: standard, show: relevance(stage, state), yaw });
  } else {
    const where = pieceLocation(state, c.target);
    const focus = where ? tiles.map((tile, i) => tile.position.join() === where.join() ? i : -1).filter(i => i >= 0) : [];
    html = isoCube(state, { palette, colors: standard, show: relevance(stage, state), yaw, focus });
  }
  thumbs.set(id, html);
  return html;
}
export function goalThumb(stage) {
  const state = goalState(stage);
  return lessons[stage].art === 'top'
    ? topView(state, { palette, colors: standard, show: relevance(stage, state) })
    : isoCube(state, { palette, colors: standard, show: relevance(stage, state) });
}
export function movesText(c) {
  const parts = [];
  for (const block of c.blocks) {
    const text = block.moves.join(' ');
    if (parts.at(-1)?.text === text) parts.at(-1).count++;
    else parts.push({ text, count: 1 });
  }
  return parts.map(({ text, count }) => (count > 1 ? `(${text})×${count}` : text)).join('  ').replaceAll("'", '′');
}

// The whole method as a tree: step → where to look → each case → its moves.
export function renderMap(container, { current, onPick }) {
  container.innerHTML = `<ol class="map">${tree.map(step => `
    <li class="map-step ${current?.stage === step.stage ? 'now' : current && step.stage < current.stage ? 'done' : ''}">
      <div class="map-node">
        <span class="map-num">${String(step.stage + 1).padStart(2, '0')}</span>
        <div><b>${step.name}</b><p>${step.look}</p></div>
      </div>
      <ul class="map-branches">
        ${step.cases.map(c => `<li><button type="button" class="map-case ${current?.stage === step.stage && current?.key === c.key ? 'here' : ''}" data-stage="${step.stage}" data-key="${c.key}">
          <span class="map-thumb">${caseThumb(step.stage, c.key)}</span>
          <span class="map-label">${c.label}</span>
          <code>${movesText(c)}</code>
          <span class="map-loop">↻ look again</span>
        </button></li>`).join('')}
        <li><div class="map-exit"><span class="map-thumb">${goalThumb(step.stage)}</span><span><b>✓ ${step.done}</b>${step.stage < 7 ? `<small>→ step ${String(step.stage + 2).padStart(2, '0')}</small>` : ''}</span></div></li>
      </ul>
    </li>`).join('')}</ol>`;
  container.querySelectorAll('.map-case').forEach(node => node.addEventListener('click', () => onPick(Number(node.dataset.stage), node.dataset.key)));
}
