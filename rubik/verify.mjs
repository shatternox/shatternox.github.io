// Checks for the CFOP algorithm sets: every algorithm must keep the solved
// part of the cube intact, and each set must cover every possible case.
// Used by the page at load (cheap) and by `node rubik/verify.mjs` in full.
import { solved, applyMoves, pieces, tiles as TILES } from './cube.mjs?v=202611161352';
import { run, parse, invert, IDENTITY, sameOrient } from './moves.mjs?v=202611161352';

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

// ---------- Roux, ZZ and Petrus sets ----------
// Where a piece is: its slot, and which of its stickers faces the slot's first face.
function locate(state, name) {
  const [slot, idx] = Object.entries(pieces).find(([, idx]) => idx.length === name.length && [...name].every(c => idx.some(i => state[i] === c)));
  return `${slot}${idx.findIndex(i => state[i] === name[0])}`;
}
// Edge orientation, front/back axis: the edge's key color (yellow/white, or
// else green/blue) must face up/down, or front/back for a middle-layer edge.
export function goodEdge(state, slot) {
  const idx = pieces[slot];
  let k = idx.findIndex(i => 'UD'.includes(state[i]));
  if (k < 0) k = idx.findIndex(i => 'FB'.includes(state[i]));
  return 'UD'.includes(slot[k]) || (!/[UD]/.test(slot) && 'FB'.includes(slot[k]));
}
const EDGES = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'BR', 'BL', 'FL'];
const LSE = ['UF', 'UR', 'UB', 'UL', 'DF', 'DB'];
const eoPattern = (state, slots) => slots.map(s => (goodEdge(state, s) ? 0 : 1)).join('');
const withPre = (state, turns, f) => turns.map(t => f(applyMoves(state, t))).sort()[0];
const PRE_U = [0, 1, 2, 3].map(U);
const FB = ['DL', 'DFL', 'DLB', 'FL', 'BL'];
const SB = ['DR', 'DRF', 'DBR', 'FR', 'BR'];
const BLOCK222 = ['DLB', 'DL', 'DB', 'BL'];
const BLOCK223 = [...BLOCK222, 'DF', 'DFL', 'FL'];
const allGood = state => EDGES.every(s => goodEdge(state, s));
const piecesKey = names => state => withPre(state, PRE_U, s => names.map(n => locate(s, n)).join(' '));
const without = (list, drop) => list.filter(n => !drop.includes(n));

// For each set: pieces the moves must keep, how a case is told apart from
// the others, which starting positions are valid, and how many cases exist.
export const SETS = {
  CMLL: { keep: [...FB, ...SB], expected: 42,
    // Corners only, the same under top turns before and after.
    keyAlg: alg => [0, 1, 2, 3].flatMap(b => {
      const start = run(applyMoves(solved, U(b)), IDENTITY, invert(parse(alg))).state;
      return PRE_U.map(t => { const s = applyMoves(start, t); return LL_CORNERS.map(n => pieces[n].map(i => s[i]).join('')).join(' '); });
    }).sort()[0] },
  LSE_EO: { keep: [...FB, ...SB], expected: 11, key: s => withPre(s, PRE_U, x => eoPattern(x, LSE)) },
  LSE_ULUR: { keep: [...FB, ...SB], expected: 30, valid: s => LSE.every(e => goodEdge(s, e)), key: piecesKey(['UL', 'UR', 'UFR']) },
  LSE_L4E: { keep: [...FB, ...SB, 'UL', 'UR', ...LL_CORNERS], expected: 11, valid: s => LSE.every(e => goodEdge(s, e)), key: s => s },
  EDGE_DL: { keep: [], expected: 23, key: s => locate(s, 'DL') },
  EDGE_DB: { keep: ['DL'], expected: 21, key: s => locate(s, 'DB') },
  SB_EDGE: { keep: FB, expected: 11, key: piecesKey(['DR']) },
  SB_PAIR: { keep: [...FB, 'DR', 'DBR', 'BR'], expected: 41, key: piecesKey(['DRF', 'FR']) },
  SB_BACK: { keep: [...FB, 'DR', 'DRF', 'FR'], expected: 41, key: piecesKey(['DBR', 'BR']) },
  FB_PAIR: { keep: ['DL', 'DLB', 'BL'], expected: 41, key: piecesKey(['DFL', 'FL']) },
  FB_BACK: { keep: ['DL', 'DFL', 'FL'], expected: 41, key: piecesKey(['DLB', 'BL']) },
  ZZ_EO: { keep: [], expected: 5, valid: s => EDGES.every(e => goodEdge(s, e) || /F/.test(e)),
    key: s => withPre(s, [[], ['F2']], x => eoPattern(x, EDGES)) },
  // The line's back edge stays put, unless the two line edges start swapped.
  ZZ_LINE: { keep: ['DB'], expected: 11, valid: allGood, free: s => locate(s, 'DF').startsWith('DB'), key: s => locate(s, 'DF') },
  ZZ_EDGE: { keep: ['DF', 'DB'], expected: 6, valid: allGood, key: piecesKey(['DR']) },
  RU_PAIR: { keep: without(F2L_PIECES, ['DRF', 'FR']), expected: 20, valid: allGood, key: piecesKey(['DRF', 'FR']) },
  RU_BACK: { keep: without(F2L_PIECES, ['DBR', 'BR']), expected: 20, valid: allGood, key: piecesKey(['DBR', 'BR']) },
  PETRUS_BL: { keep: ['DL', 'DB'], expected: 41, key: piecesKey(['DLB', 'BL']) },
  PETRUS_DF: { keep: BLOCK222, expected: 11, key: piecesKey(['DF']) },
  PETRUS_FL: { keep: [...BLOCK222, 'DF'], expected: 41, key: piecesKey(['DFL', 'FL']) },
  PETRUS_EO: { keep: BLOCK223, expected: 3, valid: s => EDGES.every(e => goodEdge(s, e) || e[0] === 'U'),
    key: s => withPre(s, PRE_U, x => eoPattern(x, LL_EDGES)) },
};

export function checkCases(name, algs) {
  const rule = SETS[name];
  const problems = [];
  const seen = new Map();
  algs.forEach((alg, n) => {
    const label = `${name}[${n}] ${alg}`;
    let after;
    try { after = run(solved, IDENTITY, parse(alg)); } catch (error) { problems.push(`${label}: cannot parse (${error.message})`); return; }
    if (!sameOrient(after.orient, IDENTITY)) { problems.push(`${label}: leaves the centers turned`); return; }
    const start = caseState(alg).state;
    const keep = rule.free?.(start) ? [] : rule.keep;
    const broken = keep.filter(p => !placed(after.state, p));
    if (broken.length) problems.push(`${label}: breaks ${broken.join(' ')}`);
    if (rule.valid && !rule.valid(start)) problems.push(`${label}: starts from a position this step never sees`);
    if (start === solved) problems.push(`${label}: does nothing`);
    const key = rule.keyAlg ? rule.keyAlg(alg) : rule.key(start);
    if (seen.has(key)) problems.push(`${label}: same case as ${seen.get(key)}`);
    else seen.set(key, `[${n}]`);
  });
  return { kind: name, cases: seen.size, expected: rule.expected, complete: seen.size === rule.expected && !problems.length, problems };
}

// ---------- Stuck pieces ----------
// Each freeing sequence must bring the piece to the top layer (in the
// solver's view) and leave what is already solved intact.
const NORMAL3 = { R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] };
const timesV = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
function cubie(state, name) {
  return Object.values(pieces).find(idx => idx.length === name.length && idx.every(i => name.includes(state[i])) && [...name].every(c => idx.some(i => state[i] === c)));
}
function inPlace(state, orient, name) {
  const idx = cubie(state, name);
  return [...name].every(c => timesV(orient, TILES[idx.find(j => state[j] === c)].normal).every((v, a) => v === NORMAL3[c][a]));
}
const onTop = (state, orient, name) => timesV(orient, TILES[cubie(state, name)[0]].position)[1] === 1;
const CROSS4 = ['DF', 'DR', 'DB', 'DL'];
const RIGHT_KEEP = ['DF', 'DB', 'DL', 'DR', 'DLB', 'DFL', 'BL', 'FL'];
export const STUCK_RULES = {
  F2L_STUCK: { keep: CROSS4 },
  CORNER_STUCK: { keep: CROSS4, moves: "R U R' U'" },
  EDGE_STUCK: { keep: [...CROSS4, 'DRF', 'DBR', 'DLB', 'DFL'], moves: "U R U' R' U' F' U F" },
  RU_STUCK: { keep: RIGHT_KEEP }, RU_BACK_STUCK: { keep: RIGHT_KEEP },
  FB_STUCK: { keep: ['DL', 'DLB', 'BL'] }, FB_BACK_STUCK: { keep: ['DL', 'DFL', 'FL'] },
  SB_STUCK: { keep: [...FB, 'DR', 'DBR', 'BR'] }, SB_BACK_STUCK: { keep: [...FB, 'DR', 'DRF', 'FR'] },
  PETRUS_BL_STUCK: { keep: ['DL', 'DB'] }, PETRUS_FL_STUCK: { keep: [...BLOCK222, 'DF'] },
};
export function checkStuck(name, list) {
  const rule = STUCK_RULES[name];
  const problems = [];
  const seen = new Set();
  for (const c of list) {
    const label = `${name} ${c.piece}@${c.at}`;
    const start = run(solved, IDENTITY, parse(c.setup));
    const slot = Object.entries(pieces).find(([, idx]) => idx.includes(cubie(start.state, c.piece).find(i => start.state[i] === c.piece[0])))[0];
    if (!rule.keep.every(n => inPlace(start.state, start.orient, n))) problems.push(`${label}: setup breaks the solved part`);
    const end = run(start.state, start.orient, parse(rule.moves ?? c.moves));
    if (!onTop(end.state, end.orient, c.piece)) problems.push(`${label}: does not bring the piece up`);
    if (!rule.keep.every(n => inPlace(end.state, end.orient, n))) problems.push(`${label}: breaks the solved part`);
    if (seen.has(`${c.piece}@${c.at}`)) problems.push(`${label}: duplicate position`);
    seen.add(`${c.piece}@${c.at}`);
    if (!c.at.startsWith(slot)) problems.push(`${label}: piece is not where the case says`);
  }
  return { kind: name, cases: list.length, problems };
}

if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url.split('?')[0] === `file:///${process.argv[1].replaceAll('\\', '/')}`) {
  const sets = await import('./algs.mjs?v=202611161352');
  const { OLL, PLL, F2L } = sets;
  for (const [kind, algs] of [['oll', OLL], ['pll', PLL], ['f2l', Object.fromEntries(F2L.map((a, i) => [i + 1, a]))]]) {
    const result = checkSet(kind, algs);
    console.log(`${kind}: ${result.cases}/${result.expected} cases${result.problems.length ? '' : ', no problems'}`);
    for (const p of result.problems) console.log('  -', p);
  }
  let failed = false;
  for (const name of Object.keys(SETS)) {
    const result = checkCases(name, sets[name]);
    failed ||= !result.complete;
    console.log(`${name}: ${result.cases}/${result.expected} cases${result.problems.length ? '' : ', no problems'}`);
    for (const p of result.problems) console.log('  -', p);
  }
  for (const [name, list] of Object.entries(sets.STUCK)) {
    const result = checkStuck(name, list);
    failed ||= result.problems.length > 0;
    console.log(`${name}: ${result.cases} stuck positions${result.problems.length ? '' : ', no problems'}`);
    for (const p of result.problems) console.log('  -', p);
  }
  if (failed) process.exitCode = 1;
}
