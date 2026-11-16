// Full move language for algorithms: face turns, slice turns (M E S), wide
// turns (r l u d f b, or Rw …) and whole-cube rotations (x y z).
//
// The sticker state always keeps the centers in place. Anything that would
// move a center is rewritten as outer-face turns plus a change of the cube's
// orientation, `orient`: a 3×3 matrix that maps the model's axes to the
// solver's view (+x right, +y up, +z toward you).
import { applyMoves, tokens } from './cube.mjs?v=202611161730';

export const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const AXES = { x: 0, y: 1, z: 2 };
const NORMAL = { R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] };

const multiply = (a, b) => a.map(row => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
const apply = (m, v) => m.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
const transpose = m => [0, 1, 2].map(i => [0, 1, 2].map(j => m[j][i]));

// A quarter turn like the face on the positive side of the axis (x like R,
// y like U, z like F) is a −90° rotation about that axis.
function rotation(axis, quarters) {
  let m = IDENTITY;
  const q = ((quarters % 4) + 4) % 4;
  const step = axis === 0 ? [[1, 0, 0], [0, 0, 1], [0, -1, 0]]
    : axis === 1 ? [[0, 0, -1], [0, 1, 0], [1, 0, 0]]
      : [[0, 1, 0], [-1, 0, 0], [0, 0, 1]];
  for (let i = 0; i < q; i++) m = multiply(step, m);
  return m;
}

export const orientFromYaw = yaw => rotation(1, yaw);
export const sameOrient = (a, b) => a.every((row, i) => row.every((v, j) => v === b[i][j]));

// Normalise notation: Rw → r, R2' → R2, ′ → '.
export function normalize(move) {
  let m = move.replace('′', "'").replace(/2'$/, '2');
  if (/^[RLUDFB]w/.test(m)) m = m[0].toLowerCase() + m.slice(2);
  return m;
}
export const parse = text => tokens(text.replace(/[()[\]]/g, ' ')).map(normalize);

const quartersOf = move => (move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1);

// How each move turns layers, in the solver's view: the axis, which layers
// (−1, 0, 1) move, and the turn in quarters (positive = like R / U / F).
const SPEC = {
  R: ['x', [1], 1], L: ['x', [-1], -1], M: ['x', [0], -1], r: ['x', [0, 1], 1], l: ['x', [-1, 0], -1], x: ['x', [-1, 0, 1], 1],
  U: ['y', [1], 1], D: ['y', [-1], -1], E: ['y', [0], -1], u: ['y', [0, 1], 1], d: ['y', [-1, 0], -1], y: ['y', [-1, 0, 1], 1],
  F: ['z', [1], 1], B: ['z', [-1], -1], S: ['z', [0], 1], f: ['z', [0, 1], 1], b: ['z', [-1, 0], -1], z: ['z', [-1, 0, 1], 1],
};
export function spec(move) {
  const [axis, layers, sign] = SPEC[move[0]];
  return { axis, layers, quarters: sign * quartersOf(move) };
}

// Rewrite one move as outer-face turns (in the solver's view) plus rotations.
const OUTER = { x: ['L', 'R'], y: ['D', 'U'], z: ['B', 'F'] };
function primitives(move) {
  const { axis, layers, quarters } = spec(move);
  const [low, high] = OUTER[axis];
  const turn = (face, q) => {
    // Face turn by q quarters in the axis' positive sense.
    const sense = face === high ? q : -q;
    const k = ((sense % 4) + 4) % 4;
    return k === 0 ? [] : [{ face: face + ['', '', '2', "'"][k] }];
  };
  if (layers.length === 3) return [{ rotate: axis, quarters }];
  if (layers.length === 1 && layers[0] !== 0) return turn(layers[0] === 1 ? high : low, quarters);
  // Slices and wide turns: rotate the whole cube, then turn the layers that
  // should not have moved back again.
  const out = [{ rotate: axis, quarters }];
  for (const [layer, face] of [[-1, low], [1, high]]) {
    if (!layers.includes(layer)) out.push(...turn(face, -quarters));
  }
  return out;
}

// The sticker face that currently shows on the solver's side `face`.
export function modelFace(face, orient) {
  const n = apply(transpose(orient), NORMAL[face]);
  return Object.keys(NORMAL).find(key => NORMAL[key].every((v, i) => v === n[i]));
}

export function step(state, orient, move) {
  for (const p of primitives(normalize(move))) {
    if (p.rotate) orient = multiply(rotation(AXES[p.rotate], p.quarters), orient);
    else state = applyMoves(state, [modelFace(p.face[0], orient) + p.face.slice(1)]);
  }
  return { state, orient };
}

export function run(state, orient, moves) {
  let at = { state, orient };
  for (const move of moves) at = step(at.state, at.orient, move);
  return at;
}

// Inverse of a move list in any notation.
export const invert = moves => [...moves].reverse().map(m => (m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : `${m}'`));
