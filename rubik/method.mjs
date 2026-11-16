// The beginner method, as a planner. Every plan is a list of blocks written
// from the solver's point of view (yellow on top, whatever face is in front).
// `y` turns the whole cube; it changes which face is "front" without moving
// any piece, so the state stays absolute and only the yaw changes.
import { faces, pieces, tiles, applyMoves, permutation, inspectCube, home, tokens, solved } from './cube.mjs?v=202611161615';

const SIDES = 'FRBL';
export const ALGS = {
  down: tokens('F2'),
  trigger: tokens("R U R' U'"),
  right: tokens("U R U' R' U' F' U F"),
  left: tokens("U' L' U L U F U' F'"),
  cross: tokens("F R U R' U' F'"),
  sune: tokens("R U R' U R U2 R'"),
  corners: tokens("R' F R' B2 R F' R' B2 R2"),
  edges: tokens("R U' R U R U R U' R' U' R2"),
};

export const toAbsolute = (move, yaw) => {
  const index = SIDES.indexOf(move[0]);
  return index < 0 ? move : SIDES[(index + yaw) % 4] + move.slice(1);
};
const amount = move => move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1;
export function play(state, yaw, moves) {
  for (const move of moves) {
    if (move[0] === 'y') yaw = (yaw + amount(move)) % 4;
    else state = applyMoves(state, [toAbsolute(move, yaw)]);
  }
  return { state, yaw };
}
const quarter = (letter, k) => [[], [letter], [letter + '2'], [letter + "'"]][(k % 4 + 4) % 4];
// Whole-cube turn that brings absolute face `front` to the front.
const faceFront = (yaw, front) => quarter('y', SIDES.indexOf(front) - yaw);
const userFace = (face, yaw) => toAbsolute(face, yaw);

const slotOf = new Map();
for (const [name, indices] of Object.entries(pieces)) for (const index of indices) slotOf.set(index, name);
const faceAt = index => tiles[index].face;
const layer = index => tiles[index].position[1];
const placed = (state, name) => pieces[name].every((index, k) => state[index] === name[k]);
const sticker = (state, face, index) => state[faces.indexOf(face) * 9 + index];

export const WHITE_EDGES = ['DF', 'DR', 'DB', 'DL'];
export const WHITE_CORNERS = ['DRF', 'DBR', 'DLB', 'DFL'];
export const MIDDLE = ['FR', 'BR', 'BL', 'FL'];
export const TOP_EDGES = ['UF', 'UR', 'UB', 'UL'];
export const TOP_CORNERS = ['UFR', 'URB', 'UBL', 'ULF'];
// The side a slot sits on when it is held at front-right.
const frontFor = { DRF: 'F', DBR: 'R', DLB: 'B', DFL: 'L', FR: 'F', BR: 'R', BL: 'B', FL: 'L' };
const above = { DRF: 'UFR', DBR: 'URB', DLB: 'UBL', DFL: 'ULF' };
const topEdgeIndex = { F: 7, R: 5, B: 1, L: 3 };

const isPetal = (positions, name) => faceAt(positions[name]) === 'U';
const daisyGood = (state, positions, name) => isPetal(positions, name) || placed(state, name);

const checks = [
  state => { const p = inspectCube(state); return WHITE_EDGES.every(name => daisyGood(state, p, name)); },
  state => WHITE_EDGES.every(name => placed(state, name)),
  state => WHITE_CORNERS.every(name => placed(state, name)),
  state => MIDDLE.every(name => placed(state, name)),
  state => [1, 3, 5, 7].every(index => state[index] === 'U'),
  state => state.slice(0, 9) === 'UUUUUUUUU',
  state => TOP_CORNERS.every(name => placed(state, name)),
  state => state === solved,
];

export function currentStage(state) {
  return checks.findIndex(check => !check(state));
}

const block = (kind, label, moves) => ({ kind, label, moves });
function addBlock(plan, kind, label, moves) {
  if (!moves.length) return;
  plan.blocks.push(block(kind, label, moves));
  Object.assign(plan.end, play(plan.end.state, plan.end.yaw, moves));
}
const startPlan = (state, yaw) => ({ blocks: [], end: { state, yaw }, key: '', target: undefined });

// ---------- 1 · Daisy ----------
const singleMoves = [...'UFRLDB'].flatMap(face => ['', "'", '2'].map(suffix => face + suffix));
const singleMaps = singleMoves.map(move => permutation([move]));
function planDaisy(state, yaw) {
  const positions = inspectCube(state);
  const good = WHITE_EDGES.filter(name => daisyGood(state, positions, name));
  const okay = (indices, name) => faceAt(indices[name]) === 'U' || indices[name] === home(name);
  const start = Object.fromEntries(WHITE_EDGES.map(name => [name, positions[name]]));
  const key = indices => WHITE_EDGES.map(name => indices[name]).join(',');
  const seen = new Set([key(start)]);
  let frontier = [{ indices: start, moves: [] }];
  let found;
  for (let depth = 0; depth < 6 && !found; depth++) {
    const next = [];
    for (const node of frontier) {
      for (let m = 0; m < singleMoves.length && !found; m++) {
        if (node.moves.at(-1)?.[0] === singleMoves[m][0]) continue;
        const indices = Object.fromEntries(WHITE_EDGES.map(name => [name, singleMaps[m][node.indices[name]]]));
        const k = key(indices);
        if (seen.has(k)) continue;
        seen.add(k);
        const moves = [...node.moves, singleMoves[m]];
        if (good.every(name => okay(indices, name)) && WHITE_EDGES.filter(name => okay(indices, name)).length > good.length) {
          found = { indices, moves };
        }
        next.push({ indices, moves });
      }
      if (found) break;
    }
    frontier = next;
  }
  const target = WHITE_EDGES.find(name => !good.includes(name) && okay(found.indices, name));
  const from = positions[target];
  const plan = startPlan(state, yaw);
  plan.target = target;
  plan.key = layer(from) === 1 ? 'top' : layer(from) === 0 ? 'middle' : faceAt(from) === 'D' ? 'down' : 'bottom';
  // Turn the cube so the moves use the faces you can see.
  let best;
  for (let d = 0; d < 4; d++) {
    const view = (yaw + d) % 4;
    const moves = found.moves.map(move => {
      const index = SIDES.indexOf(move[0]);
      return index < 0 ? move : SIDES[(index - view + 8) % 4] + move.slice(1);
    });
    const cost = moves.filter(move => move[0] === 'B').length * 3 + moves.filter(move => move[0] === 'L').length + (d ? 1 : 0);
    if (!best || cost < best.cost) best = { cost, d, moves };
  }
  addBlock(plan, 'rotate', 'Turn the cube', quarter('y', best.d));
  const freeing = best.moves[0][0] === 'U' && best.moves.length > 1;
  if (freeing) addBlock(plan, 'setup', 'Free a spot', best.moves.slice(0, 1));
  addBlock(plan, 'move', 'Bring it up', freeing ? best.moves.slice(1) : best.moves);
  return plan;
}

// ---------- 2 · White cross ----------
function planCross(state, yaw) {
  const positions = inspectCube(state);
  let best;
  for (const name of WHITE_EDGES) {
    if (!isPetal(positions, name)) continue;
    const slot = slotOf.get(positions[name]);
    const side = slot[1];
    const k = (SIDES.indexOf(side) - SIDES.indexOf(name[1]) + 4) % 4;
    const cost = [0, 1, 2, 1][k];
    if (!best || cost < best.cost) best = { name, k, cost };
  }
  const plan = startPlan(state, yaw);
  plan.target = best.name;
  plan.key = best.k ? 'turn' : 'matched';
  addBlock(plan, 'setup', 'Match the color', quarter('U', best.k));
  addBlock(plan, 'rotate', 'Face it', faceFront(yaw, best.name[1]));
  addBlock(plan, 'move', 'Send it down', ['F2']);
  return plan;
}

// ---------- 3 · White corners ----------
function planCorners(state, yaw) {
  const plan = startPlan(state, yaw);
  let positions = inspectCube(state);
  const todo = WHITE_CORNERS.filter(name => !placed(state, name));
  let target = todo.find(name => layer(positions[name]) === 1);
  if (!target) {
    target = todo[0];
    plan.key = 'stuck';
    addBlock(plan, 'rotate', 'Face it', faceFront(plan.end.yaw, frontFor[slotOf.get(positions[target])]));
    addBlock(plan, 'alg', 'Pop it out', ALGS.trigger);
    positions = inspectCube(plan.end.state);
  }
  plan.target = target;
  let k = 0;
  while (slotOf.get(permutation(quarter('U', k))[positions[target]]) !== above[target]) k++;
  addBlock(plan, 'setup', 'Above its spot', quarter('U', k));
  addBlock(plan, 'rotate', 'Spot to front-right', faceFront(plan.end.yaw, frontFor[target]));
  if (!plan.key) {
    const face = faceAt(inspectCube(plan.end.state)[target]);
    plan.key = face === 'U' ? 'up' : face === userFace('F', plan.end.yaw) ? 'front' : 'right';
  }
  for (let n = 1; !placed(plan.end.state, target); n++) {
    if (n > 6) throw new Error('Corner insert did not finish');
    addBlock(plan, 'alg', `Trigger ${n}`, ALGS.trigger);
  }
  return plan;
}

// ---------- 4 · Middle layer ----------
function topEdgeToInsert(state) {
  let best;
  for (const slot of TOP_EDGES) {
    const [top, side] = pieces[slot].map(index => state[index]);
    if (top === 'U' || side === 'U') continue;
    const k = (SIDES.indexOf(slot[1]) - SIDES.indexOf(side) + 4) % 4;
    const cost = [0, 1, 2, 1][k];
    if (!best || cost < best.cost) best = { k, cost, side, top, name: [side, top].join('') };
  }
  return best;
}
const pieceName = colors => [...MIDDLE].find(name => [...name].sort().join('') === [...colors].sort().join(''));
function planMiddle(state, yaw) {
  const plan = startPlan(state, yaw);
  let edge = topEdgeToInsert(state);
  if (!edge) {
    const slot = MIDDLE.find(name => !placed(state, name));
    plan.key = 'stuck';
    plan.target = pieceName(pieces[slot].map(index => state[index]).join(''));
    addBlock(plan, 'rotate', 'Face it', faceFront(plan.end.yaw, frontFor[slot]));
    addBlock(plan, 'alg', 'Pop it out', ALGS.right);
    edge = topEdgeToInsert(plan.end.state);
  }
  plan.target ??= pieceName(edge.name);
  addBlock(plan, 'setup', 'Match the front', quarter('U', edge.k));
  addBlock(plan, 'rotate', 'Face it', faceFront(plan.end.yaw, edge.side));
  const right = edge.top === userFace('R', plan.end.yaw);
  plan.key ||= right ? 'right' : 'left';
  addBlock(plan, 'alg', right ? 'Insert right' : 'Insert left', right ? ALGS.right : ALGS.left);
  return plan;
}

// ---------- 5 · Yellow cross ----------
const yellowEdge = (state, yaw, face) => state[topEdgeIndex[userFace(face, yaw)]] === 'U';
function crossShape(state, yaw) {
  const up = [...SIDES].map(face => yellowEdge(state, yaw, face));
  const count = up.filter(Boolean).length;
  if (count === 4) return 'done';
  if (count === 0) return 'dot';
  return up[0] === up[2] ? 'line' : 'el';
}
function planYellowCross(state, yaw) {
  const plan = startPlan(state, yaw);
  plan.key = crossShape(state, yaw);
  const ready = s => plan.key === 'dot'
    || (plan.key === 'line' ? yellowEdge(s, yaw, 'L') && yellowEdge(s, yaw, 'R') : yellowEdge(s, yaw, 'B') && yellowEdge(s, yaw, 'L'));
  let k = 0;
  while (!ready(applyMoves(state, quarter('U', k)))) k++;
  addBlock(plan, 'setup', plan.key === 'line' ? 'Line left–right' : 'L to back-left', quarter('U', k));
  addBlock(plan, 'alg', 'Algorithm', ALGS.cross);
  return plan;
}

// ---------- 6 · Yellow face ----------
// Corner seen from the front-left, in the solver's frame.
function frontLeft(state, yaw) {
  const want = ['U', userFace('F', yaw), userFace('L', yaw)];
  const slot = TOP_CORNERS.find(name => want.every(face => name.includes(face)));
  const read = face => state[pieces[slot][slot.indexOf(face)]];
  return { up: read('U') === 'U', front: read(want[1]) === 'U', left: read(want[2]) === 'U' };
}
const cornerUp = state => [0, 2, 6, 8].filter(index => state[index] === 'U').length;
function faceShape(state, yaw) {
  const up = cornerUp(state);
  if (up === 4) return 'done';
  if (up === 1) return play(state, yaw, ALGS.sune).state.slice(0, 9) === 'UUUUUUUUU' ? 'sune' : 'antisune';
  const sideCount = face => [0, 2].filter(index => sticker(state, face, index) === 'U').length;
  if (up === 0) {
    return [...SIDES].some(face => sideCount(face) === 2 && sideCount(SIDES[(SIDES.indexOf(face) + 2) % 4]) === 2) ? 'h' : 'pi';
  }
  if ((state[0] === 'U') === (state[8] === 'U')) return 'bowtie';
  return [...SIDES].some(face => sideCount(face) === 2) ? 'headlights' : 'chameleon';
}
function planYellowFace(state, yaw) {
  const plan = startPlan(state, yaw);
  const up = cornerUp(state);
  const ready = s => {
    const corner = frontLeft(s, yaw);
    return up === 1 ? corner.up : up === 0 ? corner.left : corner.front;
  };
  let k = 0;
  while (!ready(applyMoves(state, quarter('U', k)))) k++;
  plan.key = faceShape(applyMoves(state, quarter('U', k)), yaw);
  addBlock(plan, 'setup', 'Set up the corner', quarter('U', k));
  addBlock(plan, 'alg', 'Algorithm', ALGS.sune);
  return plan;
}

// ---------- 7 · Yellow corners ----------
const headlights = state => [...SIDES].filter(face => sticker(state, face, 0) === sticker(state, face, 2));
function planCornerSwap(state, yaw) {
  const plan = startPlan(state, yaw);
  const lights = headlights(state);
  if (lights.length === 4) {
    plan.key = 'align';
    let k = 0;
    while (!TOP_CORNERS.every(name => placed(applyMoves(state, quarter('U', k)), name))) k++;
    addBlock(plan, 'setup', 'Line up the top', quarter('U', k));
    return plan;
  }
  plan.key = lights.length ? 'pair' : 'none';
  if (lights.length) {
    const back = userFace('B', yaw);
    let k = 0;
    while (!headlights(applyMoves(state, quarter('U', k))).includes(back)) k++;
    addBlock(plan, 'setup', 'Headlights to back', quarter('U', k));
  }
  addBlock(plan, 'alg', 'Algorithm', ALGS.corners);
  return plan;
}

// ---------- 8 · Yellow edges ----------
const solvedSides = state => [...SIDES].filter(face => [0, 1, 2].every(index => sticker(state, face, index) === face));
function planEdges(state, yaw) {
  const plan = startPlan(state, yaw);
  const done = solvedSides(state);
  if (done.length) {
    const back = done[0];
    addBlock(plan, 'rotate', 'Solved side to back', faceFront(yaw, SIDES[(SIDES.indexOf(back) + 2) % 4]));
    const once = play(plan.end.state, plan.end.yaw, ALGS.edges).state === solved;
    plan.key = once ? 'cw' : 'ccw';
    addBlock(plan, 'alg', once ? 'Algorithm' : 'Algorithm 1', ALGS.edges);
    if (!once) addBlock(plan, 'alg', 'Algorithm 2', ALGS.edges);
    return plan;
  }
  plan.key = sticker(state, 'F', 1) === 'B' ? 'h' : 'z';
  // Any side works for H. For Z, start where a single pass leaves one solved side.
  let d = 0;
  while (!solvedSides(play(state, (yaw + d) % 4, ALGS.edges).state).length) d++;
  addBlock(plan, 'rotate', 'Turn the cube', quarter('y', d));
  addBlock(plan, 'alg', 'Algorithm', ALGS.edges);
  return plan;
}

const planners = [planDaisy, planCross, planCorners, planMiddle, planYellowCross, planYellowFace, planCornerSwap, planEdges];

export function planNext(state, yaw = 0) {
  const stage = currentStage(state);
  if (stage < 0) return { stage, blocks: [], key: 'solved', end: { state, yaw } };
  return { stage, ...planners[stage](state, yaw) };
}

// Which stickers matter for a stage. Everything else is drawn in grey.
export function relevance(stage, state) {
  const show = Array(54).fill(false);
  for (let face = 0; face < 6; face++) show[face * 9 + 4] = true;
  for (const [slot, indices] of Object.entries(pieces)) {
    const colors = indices.map(index => state[index]);
    const has = color => colors.includes(color);
    let visible;
    if (stage < 0 || stage >= 7) visible = indices.map(() => true);
    else if (stage <= 1) visible = indices.map(() => slot.length === 2 && has('D'));
    else if (stage === 2) visible = indices.map(() => has('D'));
    else if (stage === 3) visible = indices.map(() => !has('U'));
    else visible = indices.map((index, k) => !has('U') || colors[k] === 'U' || (stage === 6 && slot.length === 3));
    indices.forEach((index, k) => { show[index] = visible[k]; });
  }
  return show;
}

export function pieceLocation(state, name) {
  if (!name) return undefined;
  return tiles[inspectCube(state)[name]].position;
}
