// Coverage audit for the solving map: for every step of every method,
// enumerate every situation the step can meet, and check that each one has
// a matching picture (a case) on the map. Run: node rubik/audit.mjs
//
// A situation "matches" when, after the hold/turn the case tells you to do
// (turn the top, turn the whole cube, …), it looks like the case's picture.
import { solved, pieces, applyMoves, tiles } from './cube.mjs?v=202611161501';
import { run, parse, invert, IDENTITY } from './moves.mjs?v=202611161501';
import { SETS, goodEdge } from './verify.mjs?v=202611161501';
import * as A from './algs.mjs?v=202611161501';
import { getMethod, methodList } from './methods.mjs?v=202611161501';

const EDGE_SLOTS = Object.keys(pieces).filter(n => n.length === 2);
const CORNER_SLOTS = Object.keys(pieces).filter(n => n.length === 3);
const U = k => [[], ['U'], ['U2'], ["U'"]][((k % 4) + 4) % 4];
const caseStart = alg => run(solved, IDENTITY, invert(parse(alg))).state;
const results = [];
function report(method, step, possible, covered, missing) {
  results.push({ method, step, possible, covered, missing });
}

// Where a piece is: slot and twist (which sticker of the slot shows its first color).
function locate(state, name) {
  const [slot, idx] = Object.entries(pieces).find(([, idx]) => idx.length === name.length && idx.every(i => name.includes(state[i])) && [...name].every(c => idx.some(i => state[i] === c)));
  return `${slot}${idx.findIndex(i => state[i] === name[0])}`;
}
// A sticker state with the given pieces moved; the pieces they displace go to
// the vacated homes (enough for keys that only read the tracked pieces).
function place(placement) {
  const s = [...solved];
  const targets = new Set(Object.values(placement).map(([slot]) => slot));
  const vacated = Object.keys(placement).filter(n => !targets.has(n));
  const displaced = [...targets].filter(slot => !placement[slot]);
  for (const [name, [slot, twist]] of Object.entries(placement)) {
    const idx = pieces[slot];
    for (let k = 0; k < idx.length; k++) s[idx[(k + twist) % idx.length]] = name[k];
  }
  displaced.forEach((victim, i) => { pieces[vacated[i]].forEach((index, k) => { s[index] = victim[k]; }); });
  return s.join('');
}
function* placements(names, keep) {
  const free = n => (n.length === 2 ? EDGE_SLOTS : CORNER_SLOTS).filter(s => !keep.includes(s));
  function* rec(i, used, acc) {
    if (i === names.length) { yield { ...acc }; return; }
    for (const slot of free(names[i])) {
      if (used.has(slot)) continue;
      for (let t = 0; t < names[i].length; t++) {
        used.add(slot);
        acc[names[i]] = [slot, t];
        yield* rec(i + 1, used, acc);
        used.delete(slot);
        delete acc[names[i]];
      }
    }
  }
  yield* rec(0, new Set(), {});
}
const inTopOr = (loc, slot) => loc.startsWith('U') || loc.startsWith(slot);

// ---------- Pair steps: pieces in the top/slot → pair case; else → stuck case ----------
function auditPair(method, step, setName, corner, edge, stuckList, { valid } = {}) {
  const rule = SETS[setName];
  const keys = new Set(A[setName].map(a => rule.key(caseStart(a))));
  const stuck = new Set(stuckList.map(c => `${c.piece}@${c.at}`));
  let possible = 0;
  let covered = 0;
  const missing = [];
  for (const p of placements([corner, edge], rule.keep)) {
    const s = place(p);
    if (valid && !valid(s)) continue;
    const c = locate(s, corner);
    const e = locate(s, edge);
    if (c === `${corner}0` && e === `${edge}0`) continue;
    possible++;
    const outside = [[corner, c], [edge, e]].filter(([, loc]) => !inTopOr(loc, corner === 'DRF' || corner === 'DBR' || corner === 'DFL' || corner === 'DLB' ? (loc.length === 4 ? corner : edge) : corner));
    let ok;
    if (!outside.length) ok = keys.has(rule.key(s));
    else ok = outside.some(([name, loc]) => stuck.has(`${name}@${loc}`));
    if (ok) covered++; else missing.push(`${corner}@${c} ${edge}@${e}`);
  }
  report(method, step, possible, covered, missing);
}

// ---------- Single-piece steps ----------
function auditEdge(method, step, setName, name, { valid } = {}) {
  const rule = SETS[setName];
  const keys = new Set(A[setName].map(a => rule.key(caseStart(a))));
  let possible = 0; let covered = 0; const missing = [];
  for (const p of placements([name], rule.keep)) {
    const s = place(p);
    if (valid && !valid(s)) continue;
    if (locate(s, name) === `${name}0`) continue;
    possible++;
    if (keys.has(rule.key(s))) covered++; else missing.push(locate(s, name));
  }
  report(method, step, possible, covered, missing);
}

// ---------- Last-layer style steps: every orientation / permutation ----------
const LLE = ['UF', 'UR', 'UB', 'UL'];
const LLC = ['UFR', 'URB', 'UBL', 'ULF'];
function llStates() {
  // Every last-layer state: all orientations × all permutations (with legal parity).
  const out = [];
  const perms = arr => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [x, ...p])));
  const parity = p => p.reduce((n, v, i) => n + p.slice(i + 1).filter(w => w < v).length, 0) % 2;
  const ep = perms([0, 1, 2, 3]);
  for (const e of ep) for (const c of ep) {
    if (parity(e) !== parity(c)) continue;
    for (let eo = 0; eo < 16; eo++) {
      if ((eo.toString(2).split('1').length - 1) % 2) continue;
      for (let co = 0; co < 81; co++) {
        const tw = [0, 1, 2, 3].map(i => Math.floor(co / 3 ** i) % 3);
        if (tw.reduce((a, b) => a + b, 0) % 3) continue;
        const placement = {};
        e.forEach((from, to) => { placement[LLE[from]] = [LLE[to], (eo >> to) & 1]; });
        c.forEach((from, to) => { placement[LLC[from]] = [LLC[to], tw[to]]; });
        out.push(place(placement));
      }
    }
  }
  return out;
}
let ll;
function auditLL(method, step, keyOf, caseKeys, filter = () => true) {
  ll ??= llStates();
  const solvedKey = keyOf(solved);
  let possible = 0; let covered = 0; const missing = new Set();
  for (const s of ll) {
    if (!filter(s)) continue;
    const k = keyOf(s);
    if (k === solvedKey) continue;
    possible++;
    if (caseKeys.has(k)) covered++; else missing.add(k);
  }
  report(method, step, possible, covered, [...missing]);
}
const pre = (s, f) => [0, 1, 2, 3].map(k => f(applyMoves(s, U(k)))).sort()[0];
const prePost = (s, f) => [0, 1, 2, 3].flatMap(b => [0, 1, 2, 3].map(a => f(applyMoves(applyMoves(s, U(a)), U(b))))).sort()[0];
const edgesUp = s => LLE.map(n => (s[pieces[n][0]] === 'U' ? 1 : 0)).join('');
const cornerTwists = s => LLC.map(n => pieces[n].findIndex(i => s[i] === 'U')).join('');
const allOriented = s => s.slice(0, 9) === 'UUUUUUUUU';
// Permutation relative to the centers, up to top turns before and after; colors relabeled.
const sideRows = s => ['F', 'R', 'B', 'L'].map(f => s.slice('URFDLB'.indexOf(f) * 9, 'URFDLB'.indexOf(f) * 9 + 3)).join('');
const relabel = key => { const names = {}; return [...key].map(c => (names[c] ??= String.fromCharCode(97 + Object.keys(names).length))).join(''); };
const permKey = s => [0, 1, 2, 3].flatMap(a => [0, 1, 2, 3].map(b => relabel(sideRows(applyMoves(applyMoves(s, U(a)), U(b)))))).sort()[0];
const cornersOnly = s => sideRows(s).split('').filter((_, i) => i % 3 !== 1).join('');
const cornerPermKey = s => [0, 1, 2, 3].flatMap(a => [0, 1, 2, 3].map(b => relabel(cornersOnly(applyMoves(applyMoves(s, U(a)), U(b)))))).sort()[0];

function caseKeys(step, keyOf) {
  return new Set(step.cases.map(c => keyOf(c.start.state)));
}

// ---------- Run every method ----------
for (const { id } of methodList) {
  const m = getMethod(id);
  for (const step of m.steps) {
    const name = `${step.name}`;
    switch (step.id) {
      case 'cross': auditEdge(id, name, 'EDGE_DL', 'DL'); break; // same shape as one cross edge
      case 'f2l': {
        const keys = new Set(A.F2L.map(a => pre(caseStart(a), s => `${locate(s, 'DRF')} ${locate(s, 'FR')}`)));
        let possible = 0; let covered = 0; const missing = [];
        const types = new Set(A.STUCK.F2L_STUCK.map(c => c.at));
        for (const p of placements(['DRF', 'FR'], ['DF', 'DR', 'DB', 'DL'])) {
          const s = place(p);
          const c = locate(s, 'DRF'); const e = locate(s, 'FR');
          if (c === 'DRF0' && e === 'FR0') continue;
          possible++;
          const cOut = !c.startsWith('U') && !c.startsWith('DRF');
          const eOut = !e.startsWith('U') && !e.startsWith('FR');
          // Stuck in another slot: hold that slot at the front-right.
          const ok = cOut ? types.has(`DRF${c.at(-1)}`) : eOut ? types.has(`FR${e.at(-1)}`) : keys.has(pre(s, x => `${locate(x, 'DRF')} ${locate(x, 'FR')}`));
          if (ok) covered++; else missing.push(`${c} ${e}`);
        }
        report(id, name, possible, covered, missing);
        break;
      }
      case 'oll': auditLL(id, name, s => pre(s, x => edgesUp(x) + cornerTwists(x)), caseKeys(step, s => pre(s, x => edgesUp(x) + cornerTwists(x)))); break;
      case 'eo': auditLL(id, name, s => pre(s, edgesUp), caseKeys(step, s => pre(s, edgesUp))); break;
      case 'ocll': auditLL(id, name, s => pre(s, cornerTwists), caseKeys(step, s => pre(s, cornerTwists)), s => LLE.every(n => s[pieces[n][0]] === 'U')); break;
      case 'pll': auditLL(id, name, permKey, caseKeys(step, permKey), allOriented); break;
      case 'pll-TY': auditLL(id, name, cornerPermKey, caseKeys(step, cornerPermKey), allOriented); break;
      case 'pll-UaUbHZ': auditLL(id, name, permKey, caseKeys(step, permKey), s => allOriented(s) && cornerPermKey(s) === cornerPermKey(solved)); break;
      case 'fb':
        auditEdge(id, `${name}: edge`, 'EDGE_DL', 'DL');
        auditPair(id, `${name}: front pair`, 'FB_PAIR', 'DFL', 'FL', A.STUCK.FB_STUCK);
        auditPair(id, `${name}: back pair`, 'FB_BACK', 'DLB', 'BL', A.STUCK.FB_BACK_STUCK);
        break;
      case 'sb':
        auditEdge(id, `${name}: edge`, 'SB_EDGE', 'DR');
        auditPair(id, `${name}: front pair`, 'SB_PAIR', 'DRF', 'FR', A.STUCK.SB_STUCK);
        auditPair(id, `${name}: back pair`, 'SB_BACK', 'DBR', 'BR', A.STUCK.SB_BACK_STUCK);
        break;
      case 'cmll': {
        // Corners only; a top turn before (turn the cube's top) and after (the
        // finished corners may sit a quarter turn off: rotate the side colors).
        const spin = (c, b) => { const i = 'FRBL'.indexOf(c); return i < 0 ? c : 'FRBL'[(i + b) % 4]; };
        const k = s => [0, 1, 2, 3].flatMap(a => [0, 1, 2, 3].map(b => {
          const x = applyMoves(s, U(a));
          return LLC.map(n => pieces[n].map(i => spin(x[i], b)).join('')).join(' ');
        })).sort()[0];
        auditLL(id, name, k, caseKeys(step, k), s => LLE.every((n, i) => true));
        break;
      }
      case 'zz-line': auditEdge(id, name, 'ZZ_LINE', 'DF', { valid: s => EDGE_SLOTS.every(e => goodEdge(s, e)) }); break;
      case 'zz-f2l': {
        const good = s => EDGE_SLOTS.every(e => goodEdge(s, e));
        auditEdge(id, `${name}: edge`, 'ZZ_EDGE', 'DR', { valid: good });
        auditPair(id, `${name}: front pair`, 'RU_PAIR', 'DRF', 'FR', A.STUCK.RU_STUCK, { valid: good });
        auditPair(id, `${name}: back pair`, 'RU_BACK', 'DBR', 'BR', A.STUCK.RU_BACK_STUCK, { valid: good });
        break;
      }
      case 'p222':
        auditEdge(id, `${name}: edge DL`, 'EDGE_DL', 'DL');
        auditEdge(id, `${name}: edge DB`, 'EDGE_DB', 'DB');
        auditPair(id, `${name}: pair`, 'PETRUS_BL', 'DLB', 'BL', A.STUCK.PETRUS_BL_STUCK);
        break;
      case 'p223':
        auditEdge(id, `${name}: edge`, 'PETRUS_DF', 'DF');
        auditPair(id, `${name}: pair`, 'PETRUS_FL', 'DFL', 'FL', A.STUCK.PETRUS_FL_STUCK);
        break;
      case 'p-f2l': {
        const good = s => EDGE_SLOTS.every(e => goodEdge(s, e));
        auditPair(id, `${name}: front pair`, 'RU_PAIR', 'DRF', 'FR', A.STUCK.RU_STUCK, { valid: good });
        auditPair(id, `${name}: back pair`, 'RU_BACK', 'DBR', 'BR', A.STUCK.RU_BACK_STUCK, { valid: good });
        break;
      }
      case 'zz-eo': case 'p-eo': {
        // Every edge orientation pattern (even number of bad edges).
        const area = step.id === 'zz-eo' ? ['UF', 'FR', 'DF', 'FL'] : ['UF', 'UR', 'UB', 'UL'];
        const pool = step.id === 'zz-eo' ? EDGE_SLOTS : ['UF', 'UR', 'UB', 'UL', 'FR', 'BR', 'DR'];
        const bring = new Set((step.id === 'zz-eo' ? A.EO_BRING.ZZ : A.EO_BRING.PETRUS).map(c => c.at));
        const keyCases = new Set(step.cases.filter(c => !c.key.includes('b')).map(c => SETS[step.id === 'zz-eo' ? 'ZZ_EO' : 'PETRUS_EO'].key(c.start.state)));
        let possible = 0; let covered = 0; const missing = [];
        for (let mask = 1; mask < 2 ** pool.length; mask++) {
          const badSet = pool.filter((_, i) => (mask >> i) & 1);
          if (badSet.length % 2) continue;
          possible++;
          const outside = badSet.filter(e => !area.includes(e));
          if (outside.length) {
            if (outside.every(e => bring.has(e)) || badSet.filter(e => area.includes(e)).length === 4) covered++;
            else missing.push(badSet.join(' '));
          } else covered++; // all bad edges inside the area: one of the area cases (checked by verify)
        }
        report(id, name, possible, covered, missing);
        break;
      }
      default:
        // Beginner and LSE steps are audited below.
        break;
    }
  }
}

// ---------- Beginner: every situation the instructions can meet ----------
{
  const b = getMethod('beginner');
  const W = ['DF', 'DR', 'DB', 'DL'];
  // Daisy: one white edge, white sticker anywhere but on top. After turning
  // the cube so white faces you: top row, middle row left/right, bottom row,
  // or white on the bottom face.
  const daisyType = loc => {
    const [slot, t] = [loc.slice(0, -1), Number(loc.at(-1))];
    const face = slot[t];
    if (face === 'U') return 'petal';
    if (face === 'D') return 'down';
    const other = slot[1 - t];
    if (other === 'U') return 'top';
    if (other === 'D') return 'bottom';
    // Middle layer: the white side faces you; the other side is to the right or left.
    const right = { F: 'R', R: 'B', B: 'L', L: 'F' }[face];
    return other === right ? 'middle' : 'middle-left';
  };
  const daisyCases = new Set(b.steps[0].cases.map(c => {
    const s = c.start.state;
    const target = W.find(n => tiles[pieces[locate(s, n).slice(0, -1)][Number(locate(s, n).at(-1))]].face !== 'U');
    return daisyType(locate(s, target));
  }));
  let possible = 0; let covered = 0; const missing = [];
  for (const slot of EDGE_SLOTS) for (let t = 0; t < 2; t++) {
    const type = daisyType(`${slot}${t}`);
    if (type === 'petal') continue;
    possible++;
    if (daisyCases.has(type)) covered++; else missing.push(`${slot}${t}:${type}`);
  }
  report('beginner', 'Daisy', possible, covered, missing);

  // White corners: a white corner in the top (above its spot, held front-right:
  // white up/front/right) or in the bottom (held front-right: own spot twisted,
  // or a wrong spot with white down/front/right).
  const cornerType = (slot, t, own) => (slot[0] === 'U' ? `top-${'UFR'.indexOf('UFR'[t])}` : `${own ? 'own' : 'wrong'}-${t}`);
  const have = new Set();
  for (const c of b.steps[2].cases) {
    if (['right', 'up', 'front'].includes(c.key)) { have.add({ right: 'top-2', up: 'top-0', front: 'top-1' }[c.key]); continue; }
  }
  for (const c of A.STUCK.CORNER_STUCK) have.add(`${c.piece === 'DRF' ? 'own' : 'wrong'}-${c.at.at(-1)}`);
  possible = 0; covered = 0; const cm = [];
  for (const slot of ['UFR', 'URB', 'UBL', 'ULF', 'DRF', 'DBR', 'DLB', 'DFL']) for (let t = 0; t < 3; t++) {
    if (slot === 'DRF' && t === 0) continue; // solved
    // Held so the corner (or its spot) is at the front-right; the twist is kept.
    const type = slot[0] === 'U' ? `top-${t}` : `${slot === 'DRF' ? 'own' : 'wrong'}-${t}`;
    possible++;
    if (have.has(type)) covered++; else cm.push(`${slot}${t}`);
  }
  report('beginner', 'White corners', possible, covered, cm);

  // Middle layer: an edge without yellow on top (goes right or left), or in a
  // middle slot (own slot flipped, or a wrong slot either way round).
  const mid = new Set(['right', 'left'].filter(k => b.steps[3].cases.some(c => c.key === k)));
  for (const c of A.STUCK.EDGE_STUCK) mid.add(`${c.piece === 'FR' ? 'own' : 'wrong'}-${c.at.at(-1)}`);
  possible = 0; covered = 0; const mm = [];
  for (const slot of EDGE_SLOTS.filter(e => !e.includes('D'))) for (let t = 0; t < 2; t++) {
    if (slot === 'FR' && t === 0) continue;
    const type = slot[0] === 'U' ? (t === 0 ? 'right' : 'left') : `${slot === 'FR' ? 'own' : 'wrong'}-${t}`;
    possible++;
    if (mid.has(type)) covered++; else mm.push(`${slot}${t}`);
  }
  report('beginner', 'Middle layer', possible, covered, mm);

  // Last layer: the beginner planner's own case names must all have pictures.
  const { planNext } = await import('./method.mjs?v=202611161501');
  ll ??= llStates();
  for (const stage of [4, 5, 6, 7]) {
    const keys = new Set(b.steps[stage].cases.map(c => c.key));
    const seen = new Set(); const miss = new Set(); let n = 0;
    for (const s of ll) {
      const p = planNext(s, 0);
      if (p.stage !== stage) continue;
      n++;
      seen.add(p.key);
      if (!keys.has(p.key)) miss.add(p.key);
    }
    report('beginner', b.steps[stage].name, n, n - [...miss].length, [...miss]);
  }
}

// ---------- Beginner: each picture must look like its answer ----------
// "Is there a white corner / an edge without yellow on top?" Every picture
// under "No" must really show none on top, and under "Yes" at least one.
{
  const b = getMethod('beginner');
  const hasColor = (st, slot, c) => pieces[slot].some(i => st[i] === c);
  const checks = [
    { stage: 2, name: 'White corners: pictures match the question', usable: st => ['UFR', 'URB', 'UBL', 'ULF'].some(c => hasColor(st, c, 'D')) },
    { stage: 3, name: 'Middle layer: pictures match the question', usable: st => ['UF', 'UR', 'UB', 'UL'].some(e => !hasColor(st, e, 'U')) },
  ];
  for (const { stage, name, usable } of checks) {
    const step = b.steps[stage];
    const wrong = step.cases.filter(c => c.group[0]?.startsWith('Yes') !== usable(c.start.state)).map(c => c.label);
    const yes = step.cases.filter(c => c.group[0]?.startsWith('Yes')).length;
    const no = step.cases.filter(c => c.group[0]?.startsWith('No')).length;
    // What the question asks about must be drawn in real colors, not grey.
    const hidden = step.cases.filter(c => {
      const show = step.mask(c.start.state);
      const slots = stage === 2 ? ['UFR', 'URB', 'UBL', 'ULF'] : ['UF', 'UR', 'UB', 'UL'];
      return slots.some(slot => pieces[slot].some(i => !show[i]));
    }).map(c => `${c.label} (top hidden in grey)`);
    const missing = [...wrong, ...hidden, ...(yes ? [] : ['no “Yes” pictures']), ...(no ? [] : ['no “No” pictures'])];
    report('beginner', name, step.cases.length, step.cases.length - wrong.length, missing);
  }
  // Every middle-layer situation with nothing usable on top (all four
  // non-yellow edges in the middle layer, at least one wrong) must have a
  // "No" picture for some wrong slot held at the front-right.
  const MID = ['FR', 'BR', 'BL', 'FL'];
  const noPics = new Set(A.STUCK.EDGE_STUCK.map(c => `${c.piece === 'FR' ? 'own' : 'wrong'}-${c.at.at(-1)}`));
  const perms = arr => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [x, ...p])));
  let possible = 0; let covered = 0; const missing = [];
  for (const p of perms([0, 1, 2, 3])) for (let flips = 0; flips < 16; flips++) {
    const slots = MID.map((_, i) => ({ piece: MID[p[i]], slot: MID[i], flip: (flips >> i) & 1 }));
    const wrongSlots = slots.filter(x => x.piece !== x.slot || x.flip);
    if (!wrongSlots.length) continue;
    possible++;
    // Hold any wrong slot at the front-right: own piece flipped, or a wrong piece either way.
    const ok = wrongSlots.some(x => noPics.has(`${x.piece === x.slot ? 'own' : 'wrong'}-${x.flip}`));
    if (ok) covered++; else missing.push(slots.map(x => `${x.piece}${x.flip ? '*' : ''}@${x.slot}`).join(' '));
  }
  report('beginner', 'Middle layer: nothing on top', possible, covered, missing);
  // Same for corners: all four white corners in the bottom, at least one wrong.
  const DC = ['DRF', 'DBR', 'DLB', 'DFL'];
  const cornerPics = new Set(A.STUCK.CORNER_STUCK.map(c => `${c.piece === 'DRF' ? 'own' : 'wrong'}-${c.at.at(-1)}`));
  possible = 0; covered = 0; const cmiss = [];
  for (const p of perms([0, 1, 2, 3])) for (let tw = 0; tw < 81; tw++) {
    const slots = DC.map((_, i) => ({ piece: DC[p[i]], slot: DC[i], twist: Math.floor(tw / 3 ** i) % 3 }));
    const wrong = slots.filter(x => x.piece !== x.slot || x.twist);
    if (!wrong.length) continue;
    possible++;
    if (wrong.some(x => cornerPics.has(`${x.piece === x.slot ? 'own' : 'wrong'}-${x.twist}`))) covered++;
    else cmiss.push(slots.map(x => `${x.piece}/${x.twist}@${x.slot}`).join(' '));
  }
  report('beginner', 'White corners: nothing on top', possible, covered, cmiss);
}

// ---------- Every picture must be accurate ----------
// Uses the map's own drawing choices (map.mjs), so it checks what you see:
// 1. the pieces a case is about are drawn, in color, at the start and in the result;
// 2. pictures in the same group look different from each other.
{
  const { visibleStickers, pictureViews, focusGroups } = await import('./map.mjs?v=202611161501');
  for (const { id } of methodList) {
    const m = getMethod(id);
    m.steps.forEach((step, si) => {
      const problems = [];
      const groups = new Map();
      for (const c of step.cases) {
        for (const [frame, when] of [[c.start, 'start'], [c.frames.at(-1), 'result']]) {
          if (frame.orient && frame.orient.flat().join() !== '1,0,0,0,1,0,0,0,1') continue;
          const visible = visibleStickers(m, si, c, frame);
          // The piece's white/yellow sticker (or, if it faces the floor, any of its stickers) is shown.
          for (const stickers of focusGroups(c, frame.state)) {
            if (!stickers.some(i => visible.has(i))) problems.push(`${c.label} (piece or its white/yellow side not visible in the ${when} picture)`);
          }
        }
        // Last-layer pictures (3D, front-right + back-left) show the whole top
        // and the top row of all four sides, wherever they matter (not grey).
        if (step.art === 'top') {
          const need = [...Array(9).keys(), ...['F', 'R', 'B', 'L'].flatMap(f => [0, 1, 2].map(k => 'URFDLB'.indexOf(f) * 9 + k))];
          const show = step.mask(c.start.state);
          const visible = visibleStickers(m, si, c, c.start);
          const hiddenNeed = need.filter(i => show[i] && !visible.has(i));
          if (hiddenNeed.length) problems.push(`${c.label} (top layer not fully visible)`);
        }
        const views = pictureViews(m, si, c, c.start).views;
        const sig = JSON.stringify(views) + '|' + [...visibleStickers(m, si, c, c.start)].sort((x, y) => x - y).map(i => `${i}${c.start.state[i]}`).join('');
        const key = (c.group ?? []).join(' > ');
        if (!groups.has(key)) groups.set(key, new Map());
        const g = groups.get(key);
        if (g.has(sig)) problems.push(`${c.label} looks the same as ${g.get(sig)}`);
        else g.set(sig, c.label);
      }
      report(id, `${step.name}: pictures accurate`, step.cases.length, step.cases.length - Math.min(problems.length, step.cases.length), problems);
    });
  }
}

// ---------- Roux LSE ----------
{
  const r = getMethod('roux');
  for (const step of r.steps.filter(s => s.id.startsWith('lse'))) {
    const set = step.id === 'lse-eo' ? 'LSE_EO' : step.id === 'lse-lr' ? 'LSE_ULUR' : 'LSE_L4E';
    const rule = SETS[set];
    const have = new Set(A[set].map(a => rule.key(caseStart(a))));
    // Explore every position these moves can reach from solved (M and U only).
    const seen = new Set([solved]);
    let frontier = [{ state: solved, orient: IDENTITY }];
    const gens = ['M', "M'", 'M2', 'U', "U'", 'U2'];
    const found = new Set();
    for (let d = 0; d < 12 && frontier.length; d++) {
      const next = [];
      for (const at of frontier) for (const g of gens) {
        const n = run(at.state, at.orient, [g]);
        // Read the state with centers back in place (an M2 or M turn of the centers is
        // the cube held differently, not a different case).
        const key = n.state + n.orient.flat().join();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(n);
        const centred = n.orient.flat().join() === IDENTITY.flat().join() ? n.state : undefined;
        if (!centred) continue;
        if (rule.keep.some(p => !pieces[p].every((i, k) => centred[i] === p[k]))) continue;
        if (rule.valid && !rule.valid(centred)) continue;
        if (centred === solved || rule.key(centred) === rule.key(solved)) continue;
        found.add(rule.key(centred));
      }
      frontier = next;
    }
    const missing = [...found].filter(k => !have.has(k));
    report('roux', step.name, found.size, found.size - missing.length, missing.slice(0, 5));
  }
}

// ---------- One look everywhere: no flat top-down diagrams ----------
{
  const { readFileSync } = await import('node:fs');
  const files = ['map.mjs', 'app.mjs', 'coach.mjs', 'tree.mjs', 'methods.mjs'];
  const flat = files.filter(f => /topView\(/.test(readFileSync(new URL(f, import.meta.url), 'utf8')));
  report('all', 'Pictures are the 3D cube everywhere', files.length, files.length - flat.length, flat.map(f => `${f} draws a flat diagram`));
  // No text left over from the flat diagrams.
  const stale = files.filter(f => /bottom edge of (each|the) picture|▼/.test(readFileSync(new URL(f, import.meta.url), 'utf8')));
  report('all', 'No text about flat diagrams', files.length, files.length - stale.length, stale.map(f => `${f} still describes the flat diagram`));
}

let bad = 0;
for (const r of results) {
  const ok = r.missing.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${r.method.padEnd(8)} ${r.step.padEnd(32)} ${r.covered}/${r.possible} situations have a picture${ok ? '' : ` — missing e.g. ${r.missing.slice(0, 3).join(', ')}`}`);
}
console.log(bad ? `${bad} step(s) with gaps` : 'Every situation of every step has a picture.');
if (bad) process.exitCode = 1;
