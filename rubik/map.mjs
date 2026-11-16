// Pictures of cases, and the solving map: a method drawn as a tree of
// steps → recognition groups → cases → moves.
import { tiles, showMove } from './cube.mjs?v=202611161447';
import { palette, standard } from './lessons.mjs?v=202611161447';
import { isoCube, topView, moveIcon, moveHand, describeMove } from './art.mjs?v=202611161447';
import { toAbsolute } from './method.mjs?v=202611161447';

const cache = new Map();
function focusIndices(c, state) {
  const where = c.focus?.(state) ?? [];
  return tiles.map((tile, i) => (where.some(p => p && p.join() === tile.position.join()) ? i : -1)).filter(i => i >= 0);
}
const SIDES = 'FRBL';
const SIDE_WORD = { F: 'FRONT', R: 'RIGHT', B: 'BACK', L: 'LEFT' };
// Name a drawn face from the solver's point of view. Beginner cases are held
// turned (their yaw); other methods are always held the standard way and
// only drawn from another angle.
const viewWord = (drawYaw, holdYaw, side) => SIDE_WORD[SIDES[(SIDES.indexOf(side) + drawYaw - holdYaw + 8) % 4]];
// ---------- Choosing how to draw a case ----------
// A picture must show the pieces the case is about. Draw from the angle that
// shows them; if no single angle can (one at the bottom-front, one at the
// bottom-back), add a second picture seen from below.
const faceStart = f => 'URFDLB'.indexOf(f) * 9;
const drawnIso = yaw => ['U', toAbsolute('F', yaw), toAbsolute('R', yaw)].flatMap(f => [...Array(9).keys()].map(i => faceStart(f) + i));
// Turning the cube upside down (z2): where each sticker goes.
const Z2 = tiles.map(t => {
  const p = [-t.position[0], -t.position[1], t.position[2]].join();
  const n = [-t.normal[0], -t.normal[1], t.normal[2]].join();
  return tiles.findIndex(u => u.position.join() === p && u.normal.join() === n);
});
const flip = list => { const out = []; Z2.forEach((to, from) => { out[to] = list[from]; }); return out; };
const BELOW = new Set(drawnIso(0));
// For each piece a case is about: the stickers that must be visible. A piece
// with white or yellow must show that sticker (it tells which way the piece
// faces), unless it faces the floor, which you can't see on your cube either.
export function focusGroups(c, state) {
  return (c.focus?.(state) ?? []).filter(Boolean).map(p => {
    const stickers = tiles.map((t, i) => (t.position.join() === p.join() ? i : -1)).filter(i => i >= 0);
    const key = stickers.find(i => state[i] === 'D') ?? stickers.find(i => state[i] === 'U');
    return key === undefined || tiles[key].face === 'D' ? stickers : [key];
  });
}
function baseYaws(method, step, c, frame) {
  const startYaw = c.start.yaw ?? step.yaw ?? 0;
  const yaw = method.id === 'beginner' ? frame.yaw ?? startYaw : startYaw;
  return { yaw, hold: method.id === 'beginner' ? yaw : 0 };
}
export function pictureViews(method, stepIndex, c, frame) {
  const step = method.steps[stepIndex];
  const { yaw, hold } = baseYaws(method, step, c, frame);
  if (step.art === 'top') return { hold, views: [{ yaw }] };
  const show = step.mask(frame.state);
  const groups = focusGroups(c, frame.state);
  if (!groups.length) return { hold, views: [{ yaw }] };
  const seen = y => new Set(drawnIso(y).filter(i => show[i]));
  const covers = set => groups.filter(g => g.some(i => set.has(i))).length;
  const ranked = [yaw, ...[0, 1, 2, 3].filter(y => y !== yaw)].map(y => ({ y, n: covers(seen(y)) }));
  const best = ranked.reduce((a, b) => (b.n > a.n ? b : a));
  if (best.n === groups.length) return { hold, views: [{ yaw: best.y }] };
  // Add the fewest extra views (another side, or from below) that show the rest.
  const shown = new Set(seen(best.y));
  const views = [{ yaw: best.y }];
  const options = [...[0, 1, 2, 3].filter(y => y !== best.y).map(y => ({ view: { yaw: y }, set: seen(y) })),
    { view: { yaw: 0, below: true }, set: new Set(tiles.map((_, i) => i).filter(i => BELOW.has(Z2[i]) && show[i])) }];
  while (covers(shown) < groups.length && views.length < 3) {
    const left = groups.filter(g => !g.some(i => shown.has(i)));
    const pick = options.map(o => ({ o, n: left.filter(g => g.some(i => o.set.has(i))).length })).reduce((a, b) => (b.n > a.n ? b : a));
    if (!pick.n) break;
    views.push(pick.o.view);
    for (const i of pick.o.set) shown.add(i);
  }
  return { hold, views };
}
// Sticker indices (of the real cube) a case picture shows in color.
export function visibleStickers(method, stepIndex, c, frame) {
  const step = method.steps[stepIndex];
  const show = step.mask(frame.state);
  const out = new Set();
  for (const v of pictureViews(method, stepIndex, c, frame).views) {
    if (step.art === 'top') {
      for (const i of [...Array(9).keys(), ...['F', 'R', 'B', 'L'].flatMap(f => [0, 1, 2].map(k => faceStart(f) + k))]) if (show[i]) out.add(i);
    } else if (v.below) {
      Z2.forEach((to, from) => { if (BELOW.has(to) && show[from]) out.add(from); });
    } else {
      for (const i of drawnIso(v.yaw)) if (show[i]) out.add(i);
    }
  }
  return out;
}

// Draw a case at its start, or at its end (`after`) to show the expected result.
export function thumb(method, stepIndex, c, { labels = false, after = false } = {}) {
  const id = `${method.id}:${stepIndex}:${c.key}:${labels}:${after}`;
  if (cache.has(id)) return cache.get(id);
  const step = method.steps[stepIndex];
  const frame = after ? c.frames.at(-1) : c.start;
  const { state } = frame;
  const show = step.mask(state);
  const { hold, views } = pictureViews(method, stepIndex, c, frame);
  const pics = views.map(v => {
    if (step.art === 'top') {
      return topView(state, { palette, colors: standard, show, yaw: v.yaw, labels: labels && { bottom: viewWord(v.yaw, hold, 'F') === 'FRONT' ? 'FACES YOU' : `${viewWord(v.yaw, hold, 'F')} SIDE` } });
    }
    if (v.below) {
      // Upside down: the bottom is on top, the front stays in front, left and right swap.
      return `<span class="from-below">${isoCube(flip([...state]).join(''), { palette, colors: standard, show: flip(show), yaw: 0, focus: flip(tiles.map((_, i) => i)).filter((_, j) => focusIndices(c, state).includes(flip(tiles.map((_, k) => k)).indexOf(j))), labels: labels && { left: viewWord(0, hold, 'F'), right: viewWord(0, hold, 'L') } })}<small>seen from below</small></span>`;
    }
    return isoCube(state, { palette, colors: standard, show, yaw: v.yaw, focus: focusIndices(c, state), labels: labels && { left: viewWord(v.yaw, hold, 'F'), right: viewWord(v.yaw, hold, 'R') } });
  });
  const html = pics.length > 1 ? `<span class="thumb-pair">${pics.join('')}</span>` : pics[0];
  cache.set(id, html);
  return html;
}
// One sentence on where the picture is seen from.
function viewText(method, step, c) {
  const stepIndex = method.steps.indexOf(step);
  if (step.art === 'top') return 'Seen from above. The edge marked ▼ is the side facing you.';
  const { hold, views } = pictureViews(method, stepIndex, c, c.start);
  const left = viewWord(views[0].yaw, hold, 'F');
  const first = left === 'FRONT'
    ? 'Seen from the front-right: the FRONT side faces you, yellow on top.'
    : `Seen from the ${left.toLowerCase()} and ${viewWord(views[0].yaw, hold, 'R').toLowerCase()} sides so the piece shows: hold it so the side marked FRONT faces you, yellow on top.`;
  if (views.length === 1) return first;
  const extra = views.slice(1).map(v => (v.below ? 'from below' : `from the ${viewWord(v.yaw, hold, 'F').toLowerCase()} and ${viewWord(v.yaw, hold, 'R').toLowerCase()} sides`));
  return `${first} The other picture${extra.length > 1 ? 's show' : ' shows'} the same cube ${extra.join(' and ')}.`;
}
export function goalThumb(method, stepIndex) {
  const id = `${method.id}:${stepIndex}:goal`;
  if (cache.has(id)) return cache.get(id);
  const step = method.steps[stepIndex];
  const show = step.mask(step.goal);
  const html = step.art === 'top'
    ? topView(step.goal, { palette, colors: standard, show })
    : isoCube(step.goal, { palette, colors: standard, show, yaw: step.yaw ?? 0 });
  cache.set(id, html);
  return html;
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

function formulaGroups(c) {
  const parts = [];
  for (const block of c.blocks) {
    const text = block.moves.map(showMove).join(' ');
    if (parts.at(-1)?.text === text) parts.at(-1).count++;
    else parts.push({ text, count: 1, moves: block.moves });
  }
  return parts;
}
function resultText(step, c) {
  if (step.art === 'top') return 'Your top should now look like this. Same pattern, the colors may differ.';
  return c.focus ? 'Your cube should now look like this: the outlined piece has moved to its new spot. Same pattern, the colors may differ.' : 'Your cube should now look like this. Same pattern, the colors may differ.';
}
const HAND_WORD = { R: 'right hand', L: 'left hand', both: 'whole cube' };
// Where move `cursor` sits in the formula groups (repeats are shown once).
function locate(parts, cursor) {
  let at = 0;
  for (let g = 0; g < parts.length; g++) {
    const span = parts[g].moves.length * parts[g].count;
    if (cursor < at + span) {
      const offset = cursor - at;
      return { group: g, move: offset % parts[g].moves.length, round: Math.floor(offset / parts[g].moves.length) + 1 };
    }
    at += span;
  }
  return undefined;
}

export function caseCard(method, stepIndex, c, { here = false, playing = false, cursor = 0 } = {}) {
  const step = method.steps[stepIndex];
  const parts = formulaGroups(c);
  const formula = parts.map(({ text, count }) => (count > 1 ? `(${text}) ×${count}` : text)).join('&ensp;');
  const now = playing ? locate(parts, cursor) : undefined;
  // Each distinct group's moves once, with its repeat count.
  const chips = parts.map(({ moves, count }, g) => `<span class="mc-group ${now?.group === g ? 'now' : ''}">${moves.map((m, i) =>
    `<span class="mc-move ${now?.group === g && now.move === i ? 'now' : ''}" title="${showMove(m)}: ${HAND_WORD[moveHand(m)]}">${moveIcon(m)}<b>${showMove(m)}</b><small>${moveHand(m) === 'both' ? '⟲' : moveHand(m)}</small></span>`).join('')}${count > 1 ? `<span class="mc-times">${now?.group === g ? `${now.round}/${count}` : `×${count}`}</span>` : ''}</span>`).join('');
  const total = c.moves.length;
  const current = c.moves[cursor]?.move;
  const player = playing ? `<div class="mc-player" role="group" aria-label="Play this case on the 3D cube">
      <div class="mc-now">${current
        ? `<span class="mc-count">Move ${cursor + 1} of ${total}</span>${moveIcon(current)}<b>${showMove(current)}</b><span>${describeMove(current)}</span>`
        : `<span class="mc-count">All ${total} moves done</span><span>Compare with the expected result below.</span>`}</div>
      <div class="mc-buttons">
        <button type="button" class="button" data-map-act="back" ${cursor ? '' : 'disabled'} aria-label="Back one move">←</button>
        <button type="button" class="button primary" data-map-act="step" ${current ? '' : 'disabled'}>Next move →</button>
        <button type="button" class="button" data-map-act="play">${current ? '▶ Play all' : '↺ Play again'}</button>
        <button type="button" class="link" data-coach="${stepIndex}:${c.key}">Practise in the coach</button>
      </div>
    </div>` : '';
  return `<article class="map-case ${here ? 'here' : ''} ${playing ? 'playing' : ''}" data-case="${stepIndex}:${c.key}">
    <div class="mc-head">
      <span class="map-thumb">${thumb(method, stepIndex, c, { labels: true })}</span>
      <div><h4 class="map-label">${c.label}</h4><p class="mc-view">${viewText(method, step, c)}</p></div>
    </div>
    <ol class="mc-steps">
      <li><b>Hold &amp; get ready</b><span>${c.hint ?? step.hint ?? ''}</span></li>
      <li><b>Do ${total} move${total === 1 ? '' : 's'}</b><code class="mc-formula">${formula}</code><span class="mc-chips">${chips}</span><small class="mc-legend">R / L under a move = the hand that turns it</small>${player}</li>
      <li><b>Expected result</b><span class="mc-result"><span class="map-thumb">${thumb(method, stepIndex, c, { labels: true, after: true })}</span><span>${resultText(step, c)}</span></span></li>
      <li><b>Then</b><span>Doesn’t match? Undo the moves and check how you held it. Matches? Look at your cube again and pick the next picture, until it looks like this step’s finish picture.</span></li>
    </ol>
    ${player ? '' : `<button type="button" class="button ghost mc-open" data-select="${stepIndex}:${c.key}">▶ Show me in 3D</button>`}
  </article>`;
}

// Cases nested by their recognition groups.
function branches(method, stepIndex, cases, depth, view) {
  const labels = [...new Set(cases.map(c => c.group?.[depth]).filter(Boolean))];
  if (!labels.length) {
    return cases.map(c => {
      const playing = view.selected?.stage === stepIndex && view.selected?.key === c.key;
      return `<li>${caseCard(method, stepIndex, c, { here: view.current?.stage === stepIndex && view.current?.key === c.key, playing, cursor: view.cursor })}</li>`;
    }).join('');
  }
  const question = method.steps[stepIndex].questions?.[depth] ?? (depth ? 'Then, which one?' : 'What do you see?');
  return `<li class="map-q"><span class="q-badge">?</span><span>${question}</span></li>${labels.map(label => {
    const inGroup = cases.filter(c => c.group[depth] === label);
    return `<li class="map-group"><div class="map-group-head"><span class="a-badge">→</span><span>${label}</span><small>${inGroup.length} case${inGroup.length === 1 ? '' : 's'}</small></div><ul class="map-branches nested">${branches(method, stepIndex, inGroup, depth + 1, view)}</ul></li>`;
  }).join('')}`;
}

// What the cube looks like when a step begins: the previous step's finish.
function startThumb(method, stepIndex) {
  return stepIndex === 0 ? scrambledThumb() : goalThumb(method, stepIndex - 1);
}
let scrambled;
function scrambledThumb() {
  if (!scrambled) {
    const colors = 'URFDLB';
    let seed = 7;
    const state = Array.from({ length: 54 }, (_, i) => (i % 9 === 4 ? colors[Math.floor(i / 9)] : colors[(seed = (seed * 16807) % 2147483647) % 6])).join('');
    scrambled = isoCube(state, { palette, colors: standard, show: Array(54).fill(true) });
  }
  return scrambled;
}

const pad = n => String(n).padStart(2, '0');
export function renderMap(container, { method, current, open, done, selected, cursor = 0 }) {
  const view = { current, selected, cursor };
  container.innerHTML = `
    <p class="map-intro"><b>${method.name}</b> · ${method.steps.length} steps · ${method.steps.reduce((n, s) => n + s.cases.length, 0)} cases. Always hold the cube with <b>yellow on top</b>. Open the step you’re on, answer its question, find the picture that looks like your cube, and press <b>▶ Show me in 3D</b> to watch it move by move. Colors in the pictures are examples: match the pattern, not the exact colors.</p>
    <ol class="map">${method.steps.map((step, i) => {
      const isOpen = open.has(i);
      const isDone = done.has(i);
      const isHere = current?.stage === i;
      return `
    <li class="map-step ${isOpen ? 'open' : ''} ${isDone ? 'done' : ''} ${isHere ? 'now' : ''}">
      <button type="button" class="step-head" data-toggle="${i}" aria-expanded="${isOpen}">
        <span class="map-num">${isDone ? '✓' : pad(i + 1)}</span>
        <span class="step-title"><b>${step.name}</b><small>${step.summary ?? step.done}</small></span>
        <span class="step-pics" aria-hidden="true"><span class="map-thumb">${startThumb(method, i)}</span><i>→</i><span class="map-thumb">${goalThumb(method, i)}</span></span>
        <span class="step-meta">${isHere ? '<em>You are here</em>' : isDone ? '<em class="ok">Done</em>' : ''}<span>${step.cases.length} case${step.cases.length === 1 ? '' : 's'}</span><span class="chev">${isOpen ? 'Close ▴' : 'Open ▾'}</span></span>
      </button>
      ${isOpen ? `<div class="step-grid">
        <div class="map-node">
          <span class="look-tag">👀 Look</span>
          <p>${step.look}</p>
        </div>
        <ul class="map-branches">
          ${branches(method, i, step.cases, 0, view)}
          <li class="map-exit-row"><div class="map-exit"><span class="map-thumb">${goalThumb(method, i)}</span><span><small class="exit-tag">Step ${pad(i + 1)} finished when it looks like this</small><b>✓ ${step.done}</b>
            <button type="button" class="button primary" data-done-step="${i}">${i < method.steps.length - 1 ? `Done → step ${pad(i + 2)}: ${method.steps[i + 1].name}` : 'Solved! 🎉'}</button></span></div></li>
        </ul>
      </div>` : ''}
    </li>`;
    }).join('')}</ol>`;
}
