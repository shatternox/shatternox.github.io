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

export const home = name => pieces[name][0];
