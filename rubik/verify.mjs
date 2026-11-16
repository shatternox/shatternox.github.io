// Checks for the CFOP algorithm sets: every algorithm must keep the solved
// part of the cube intact, and each set must cover every possible case.
// Used by the page at load (cheap) and by `node rubik/verify.mjs` in full.
import { solved, applyMoves, pieces } from './cube.mjs?v=202611160411';
import { run, parse, invert, IDENTITY, sameOrient } from './moves.mjs?v=202611160411';

const F2L_PIECES = ['DF', 'DR', 'DB', 'DL', 'DRF', 'DBR', 'DLB', 'DFL', 'FR', 'BR', 'BL', 'FL'];
const OTHER_SLOTS = ['DF', 'DR', 'DB', 'DL', 'DBR', 'DLB', 'DFL', 'BR', 'BL', 'FL'];
const LL_EDGES = ['UF', 'UR', 'UB', 'UL'];
const LL_CORNERS = ['UFR', 'URB', 'UBL', 'ULF'];
const placed = (state, name) => pieces[name].every((index, k) => state[index] === name[k]);
const U = k => [[], ['U'], ['U2'], ["U'"]][((k % 4) + 4) % 4];

export function caseState(alg, base = solved) {
  return run(base, IDENTITY, invert(parse(alg)));
}

// Orientation pattern of the last layer, the same under any top-layer turn.
function ollKey(state) {
  const keys = [];
  for (let k = 0; k < 4; k++) {
    const s = applyMoves(state, U(k));
    const edges = LL_EDGES.map(n => (s[pieces[n][0]] === 'U' ? 0 : 1)).join('');
    const corners = LL_CORNERS.map(n => pieces[n].findIndex(i => s[i] === 'U')).join('');
    keys.push(edges + corners);
  }
  return keys.sort()[0];
}

// Permutation of the last layer, the same under top turns before or after.
function pllKey(alg) {
  const keys = [];
  for (let b = 0; b < 4; b++) {
    const end = run(applyMoves(solved, U(b)), IDENTITY, invert(parse(alg))).state;
    for (let a = 0; a < 4; a++) {
      const s = applyMoves(end, U(a));
      keys.push(['F', 'R', 'B', 'L'].map(f => s.slice('URFDLB'.indexOf(f) * 9, 'URFDLB'.indexOf(f) * 9 + 3)).join(''));
    }
  }
  // Colors only matter relative to each other: relabel by first appearance.
  return keys.map(key => {
    const names = {};
    return [...key].map(c => (names[c] ??= String.fromCharCode(97 + Object.keys(names).length))).join('');
  }).sort()[0];
}

// Where the front-right pair is, the same under any top-layer turn.
function f2lKey(state) {
  const keys = [];
  for (let k = 0; k < 4; k++) {
    const s = applyMoves(state, U(k));
    const find = name => Object.entries(pieces).find(([, idx]) => idx.length === name.length
      && [...name].every(c => idx.some(i => s[i] === c)) && idx.every(i => name.includes(s[i])));
    const [cornerSlot, cornerIdx] = find('DRF');
    const [edgeSlot, edgeIdx] = find('FR');
    keys.push(`${cornerSlot}${cornerIdx.findIndex(i => s[i] === 'D')}|${edgeSlot}${edgeIdx.findIndex(i => s[i] === 'F')}`);
  }
  return keys.sort()[0];
}

export function checkSet(kind, algs) {
  const problems = [];
  const seen = new Map();
  for (const [name, alg] of Object.entries(algs)) {
    let after;
    try { after = run(solved, IDENTITY, parse(alg)); } catch (error) { problems.push(`${name}: cannot parse (${error.message})`); continue; }
    if (!sameOrient(after.orient, IDENTITY)) problems.push(`${name}: leaves the cube rotated`);
    const keep = kind === 'f2l' ? OTHER_SLOTS : F2L_PIECES;
    const broken = keep.filter(n => !placed(after.state, n));
    if (broken.length) { problems.push(`${name}: breaks ${broken.join(' ')}`); continue; }
    const start = caseState(alg).state;
    if (start === solved) { problems.push(`${name}: does nothing`); continue; }
    if (kind === 'pll' && start.slice(0, 9) !== 'UUUUUUUUU') { problems.push(`${name}: is not a PLL (changes orientation)`); continue; }
    const key = kind === 'oll' ? ollKey(start) : kind === 'pll' ? pllKey(alg) : f2lKey(start);
    if (seen.has(key)) problems.push(`${name}: same case as ${seen.get(key)}`);
    else seen.set(key, name);
  }
  const expected = { oll: 57, pll: 21, f2l: 41 }[kind];
  return { kind, cases: seen.size, expected, complete: seen.size === expected, problems };
}

if (typeof process !== 'undefined' && import.meta.url === `file:///${process.argv[1].replaceAll('\\', '/')}`) {
  const { OLL, PLL, F2L } = await import('./algs.mjs?v=202611160411');
  for (const [kind, algs] of [['oll', OLL], ['pll', PLL], ['f2l', Object.fromEntries(F2L.map((a, i) => [i + 1, a]))]]) {
    const result = checkSet(kind, algs);
    console.log(`${kind}: ${result.cases}/${result.expected} cases${result.problems.length ? '' : ', no problems'}`);
    for (const p of result.problems) console.log('  -', p);
  }
}
