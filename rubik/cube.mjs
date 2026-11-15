export const faces = 'URFDLB';
export const solved = [...faces].map(face => face.repeat(9)).join('');
export const faceNames = { U: 'top', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' };
export const normals = {
  U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1],
  D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1],
};

export const tiles = [...solved].map((face, index) => {
  const row = Math.floor(index % 9 / 3) - 1;
  const col = index % 3 - 1;
  const positions = {
    U: [col, 1, row], R: [1, -row, -col], F: [col, -row, 1],
    D: [col, -1, -row], L: [-1, -row, col], B: [-col, -row, -1],
  };
  return { face, position: positions[face], normal: normals[face] };
});

export const tokens = formula => formula.trim().split(/\s+/).filter(Boolean);
export const inverse = moves => [...moves].reverse().map(move =>
  move.endsWith('2') ? move : move.endsWith("'") ? move[0] : move + "'");
export const showMove = move => move.replace("'", '′');

function rotate([x, y, z], axis) {
  return [[x, z, -y], [-z, y, x], [y, -x, z]][axis];
}

export function turnSpec(move) {
  const normal = normals[move[0]];
  const axis = normal.findIndex(Boolean);
  const side = normal[axis];
  const quarters = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;
  return { axis, side, quarters };
}

const byCoordinate = new Map(tiles.map(({ position, normal }, index) => [`${position}|${normal}`, index]));
const permutations = new Map();

export function permutation(moves) {
  const key = moves.join(' ');
  if (permutations.has(key)) return permutations.get(key);
  let result = tiles.map((_, index) => index);
  for (const move of moves) {
    const { axis, side, quarters } = turnSpec(move);
    const steps = (4 + side * quarters) % 4;
    result = result.map(index => {
      let { position, normal } = tiles[index];
      if (position[axis] !== side) return index;
      for (let step = 0; step < steps; step++) {
        position = rotate(position, axis);
        normal = rotate(normal, axis);
      }
      return byCoordinate.get(`${position}|${normal}`);
    });
  }
  permutations.set(key, result);
  return result;
}

export function applyMoves(state, moves) {
  const result = [];
  permutation(moves).forEach((to, from) => { result[to] = state[from]; });
  return result.join('');
}

export const edges = [
  'UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'BR', 'BL', 'FL',
];
export const corners = [
  'UFR', 'URB', 'UBL', 'ULF', 'DRF', 'DBR', 'DLB', 'DFL',
];

function pieceIndices(name) {
  const position = [0, 1, 2].map(axis => [...name].reduce((sum, face) => sum + normals[face][axis], 0));
  return [...name].map(face => byCoordinate.get(`${position}|${normals[face]}`));
}

export const pieces = Object.fromEntries([...edges, ...corners].map(name => [name, pieceIndices(name)]));
const colorKey = name => [...name].sort().join('');
const parity = order => order.reduce((sum, value, index) =>
  sum + order.slice(index + 1).filter(other => other < value).length, 0) % 2;

export function inspectCube(state) {
  if (state.length !== 54 || [...faces].some((face, index) =>
    state[index * 9 + 4] !== face || [...state].filter(value => value === face).length !== 9)) {
    throw new Error('Check the six centers and make sure each color appears exactly nine times.');
  }
  const positions = {};
  const orders = [];
  for (const group of [edges, corners]) {
    const order = [];
    let orientation = 0;
    for (const slot of group) {
      const indices = pieces[slot];
      const colors = indices.map(index => state[index]).join('');
      const name = group.find(piece => colorKey(piece) === colorKey(colors));
      if (!name || Object.hasOwn(positions, name)) {
        throw new Error('A piece has an impossible or duplicate color combination. Check the sticker colors and the viewing direction for each face.');
      }
      const offset = colors.indexOf(name[0]);
      if (name !== colors.slice(offset) + colors.slice(0, offset)) {
        throw new Error('The colors on a corner are in reverse order. Check that you entered each face as viewed directly, rather than in a mirror.');
      }
      positions[name] = indices[offset];
      orientation += offset;
      order.push(group.indexOf(name));
    }
    if (orientation % group[0].length) {
      throw new Error(group === edges
        ? 'The edge orientations are impossible with normal turns. Check the two colors on each edge, especially any edge that looks flipped.'
        : 'The corner orientations are impossible with normal turns. Check the three colors on each corner.');
    }
    orders.push(order);
  }
  if (parity(orders[0]) !== parity(orders[1])) {
    throw new Error('The edge and corner positions are impossible with normal turns. Check for pieces entered in each other’s slots.');
  }
  return positions;
}

export const topEdges = edges.slice(0, 4);
export const topCorners = corners.slice(0, 4);
export const cross = edges.slice(4, 8);
export const bottomCorners = corners.slice(4);
export const middle = edges.slice(8);
export const home = name => pieces[name][0];

const around = formula => Array.from({ length: 4 }, (_, offset) => tokens(formula).map(move => {
  const sides = 'FRBL';
  const index = sides.indexOf(move[0]);
  return index < 0 ? move : sides[(index + offset) % 4] + move.slice(1);
}));
const topTurns = ['U', "U'", 'U2'].map(tokens);
const insertRight = "U R U' R' U' F' U F";
const insertLeft = "U' L' U L U F U' F'";
const makeCross = "F R U R' U' F'";
const orientCorners = "R U R' U R U2 R'";
const swapCorners = "R U R' U' R' F R2 U' R' U' R U R' F'";
const cycleEdges = "R U' R U R U R U' R' U' R2";

const algorithms = [
  [...faces].flatMap(face => ['', "'", '2'].map(suffix => [face + suffix])),
  [...topTurns, ...around("R U R'"), ...around("R U' R'"), ...around("R U R' U'")],
  [...topTurns, ...around(insertRight), ...around(insertLeft)],
  [...topTurns, ...around(makeCross)],
  [...topTurns, ...around(orientCorners)],
  [...topTurns, ...around(swapCorners)],
  around(cycleEdges),
];

export const generators = algorithms.map(group => {
  const unique = new Map([...group, ...group.map(inverse)].map(moves => [moves.join(' '), moves]));
  return [...unique.values()].map(moves => ({ moves, map: permutation(moves), back: permutation(inverse(moves)) }));
});

const ascending = (a, b) => a - b;
const stagePieces = [cross, bottomCorners, middle, topEdges, topCorners, topCorners, topEdges];
const isOrientation = stage => stage === 3 || stage === 4;
const atHome = (names, positions) => names.every(name => positions[name] === home(name));
const onTop = (names, positions) => names.every(name => tiles[positions[name]].face === 'U');

export function currentStage(positions) {
  return stagePieces.findIndex((names, stage) =>
    !(isOrientation(stage) ? onTop(names, positions) : atHome(names, positions)));
}

export function focusPiece(stage, positions) {
  return stage < 3 ? stagePieces[stage].find(name => positions[name] !== home(name)) : undefined;
}

const encode = indices => indices.reduce((number, index) => number * 54 + index, 0);
function decode(number, size) {
  const indices = Array(size);
  for (let i = size - 1; i >= 0; i--) {
    indices[i] = number % 54;
    number = Math.floor(number / 54);
  }
  return indices;
}

export function planStage(stage, positions) {
  const group = stagePieces[stage];
  const target = focusPiece(stage, positions);
  // Track the next piece and all pieces already in place. Last-layer
  // orientation is independent of which yellow piece occupies each slot.
  const names = target ? group.filter(name => name === target || positions[name] === home(name)) : group;
  const start = names.map(name => positions[name]);
  const goal = names.map(home);
  const unordered = isOrientation(stage);
  if (unordered) {
    start.sort(ascending);
    goal.sort(ascending);
  }
  const startKey = encode(start);
  const goalKey = encode(goal);
  const queue = [goalKey];
  const path = new Map([[goalKey, null]]);
  const options = generators[stage];

  // Reverse BFS through the positions of the pieces relevant to this step.
  for (let cursor = 0; cursor < queue.length && !path.has(startKey); cursor++) {
    const next = queue[cursor];
    const indices = decode(next, names.length);
    for (const option of options) {
      const previous = indices.map(index => option.back[index]);
      if (unordered) previous.sort(ascending);
      const key = encode(previous);
      if (path.has(key)) continue;
      path.set(key, { next, moves: option.moves });
      queue.push(key);
    }
  }
  if (!path.has(startKey)) throw new Error('No route was found for this stage. Check the cube position again.');
  const blocks = [];
  for (let key = startKey; key !== goalKey;) {
    const { next, moves } = path.get(key);
    blocks.push(moves);
    key = next;
  }
  return { blocks, target };
}

function cornerPattern(positions) {
  const pattern = topCorners.map(slot => pieces[slot].findIndex(index =>
    topCorners.some(name => positions[name] === index))).join('');
  return [...pattern].reduce((best, _, index) => {
    const rotated = pattern.slice(index) + pattern.slice(0, index);
    return rotated < best ? rotated : best;
  }, pattern);
}

export function caseKey(stage, positions) {
  if (stage < 3) {
    const name = focusPiece(stage, positions);
    const index = positions[name];
    const { face, position: [, y] } = tiles[index];
    if (stage === 0) return y === 1 ? (face === 'U' ? 'up' : 'up-side')
      : y === 0 ? 'middle' : face === 'D' ? 'bottom' : 'bottom-side';
    if (stage === 1) {
      if (y === -1) return pieces[name].includes(index) ? 'twisted' : 'bottom';
      if (face === 'U') return 'up';
      const slot = topCorners.find(piece => pieces[piece].includes(index));
      return pieces[slot][1] === index ? 'side-right' : 'side-front';
    }
    if (y === 0) return index === pieces[name][1] ? 'flipped' : 'wrong';
    const frontColor = name[face === 'U' ? 1 : 0];
    const topColor = [...name].find(color => color !== frontColor);
    // With the visible color aligned to its center, the other center is to its left or right.
    return 'FRBL'[('FRBL'.indexOf(frontColor) + 1) % 4] === topColor ? 'right' : 'left';
  }
  if (stage === 3) {
    const up = topEdges.map(slot => topEdges.some(name => positions[name] === home(slot)));
    if (!up.some(Boolean)) return 'dot';
    return (up[0] && up[2]) || (up[1] && up[3]) ? 'line' : 'el';
  }
  if (stage === 4) return cornerPattern(positions);
  if (stage === 5) {
    const order = topCorners.map(name => topCorners.findIndex(slot => home(slot) === positions[name]));
    const pairs = order.filter((value, index) => (value + 1) % 4 === order[(index + 1) % 4]).length;
    return pairs === 4 ? 'align' : pairs ? 'pair' : 'no-pair';
  }
  const order = topEdges.map(name => topEdges.findIndex(slot => home(slot) === positions[name]));
  const fixed = order.findIndex((slot, index) => slot === index);
  if (fixed >= 0) return order[(fixed + 1) % 4] === (fixed + 2) % 4 ? 'ccw' : 'cw';
  return order[0] === 2 ? 'opposite' : 'adjacent';
}
