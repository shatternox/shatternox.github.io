// Pictures of cases, and the solving map: a method drawn as a tree of
// steps → recognition groups → cases → moves.
import { tiles, showMove } from './cube.mjs?v=202611161745';
import { palette, standard } from './lessons.mjs?v=202611161745';
import { isoCube, topView, moveIcon, moveHand } from './art.mjs?v=202611161745';

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
// Draw a case at its start, or at its end (`after`) to show the expected result.
export function thumb(method, stepIndex, c, { labels = false, after = false } = {}) {
  const id = `${method.id}:${stepIndex}:${c.key}:${labels}:${after}`;
  if (cache.has(id)) return cache.get(id);
  const step = method.steps[stepIndex];
  const frame = after ? c.frames.at(-1) : c.start;
  const { state } = frame;
  const startYaw = c.start.yaw ?? step.yaw ?? 0;
  // Beginner frames carry the way the cube is held; other methods are
  // held the standard way and only drawn from another angle.
  const yaw = method.id === 'beginner' ? frame.yaw ?? startYaw : startYaw;
  const hold = method.id === 'beginner' ? yaw : 0;
  const show = step.mask(state);
  const html = step.art === 'top'
    ? topView(state, { palette, colors: standard, show, yaw, labels: labels && { bottom: viewWord(yaw, hold, 'F') === 'FRONT' ? 'FACES YOU' : `${viewWord(yaw, hold, 'F')} SIDE` } })
    : isoCube(state, { palette, colors: standard, show, yaw, focus: focusIndices(c, state), labels: labels && { left: viewWord(yaw, hold, 'F'), right: viewWord(yaw, hold, 'R') } });
  cache.set(id, html);
  return html;
}
// One sentence on where the picture is seen from.
function viewText(method, step, c) {
  const yaw = c.start.yaw ?? step.yaw ?? 0;
  const hold = method.id === 'beginner' ? yaw : 0;
  if (step.art === 'top') return 'Seen from above. The edge marked ▼ is the side facing you.';
  const left = viewWord(yaw, hold, 'F');
  return left === 'FRONT'
    ? 'Seen from the front-right: the FRONT side faces you, yellow on top.'
    : `Seen from the front-left: hold it so the side marked FRONT faces you, yellow on top.`;
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
function caseCard(method, stepIndex, c, here) {
  const step = method.steps[stepIndex];
  const parts = formulaGroups(c);
  const formula = parts.map(({ text, count }) => (count > 1 ? `(${text}) ×${count}` : text)).join('&ensp;');
  // Each distinct group's moves once, with its repeat count.
  const chips = parts.map(({ moves, count }) => `<span class="mc-group">${moves.map(m =>
    `<span class="mc-move" title="${showMove(m)}: ${HAND_WORD[moveHand(m)]}">${moveIcon(m)}<b>${showMove(m)}</b><small>${moveHand(m) === 'both' ? '⟲' : moveHand(m)}</small></span>`).join('')}${count > 1 ? `<span class="mc-times">×${count}</span>` : ''}</span>`).join('');
  return `<article class="map-case ${here ? 'here' : ''}">
    <div class="mc-head">
      <span class="map-thumb">${thumb(method, stepIndex, c, { labels: true })}</span>
      <div><h4 class="map-label">${c.label}</h4><p class="mc-view">${viewText(method, step, c)}</p></div>
    </div>
    <ol class="mc-steps">
      <li><b>Hold &amp; get ready</b><span>${c.hint ?? step.hint ?? ''}</span></li>
      <li><b>Do ${c.moves.length} move${c.moves.length === 1 ? '' : 's'}</b><code class="mc-formula">${formula}</code><span class="mc-chips">${chips}</span><small class="mc-legend">R / L under a move = the hand that turns it</small></li>
      <li><b>Expected result</b><span class="mc-result"><span class="map-thumb">${thumb(method, stepIndex, c, { labels: true, after: true })}</span><span>${resultText(step, c)}</span></span></li>
      <li><b>Then</b><span>Doesn’t match? Undo the moves and check how you held it. Matches? Look at your cube again and pick the next picture, until it looks like this step’s finish picture.</span></li>
    </ol>
    <button type="button" class="button ghost mc-open" data-stage="${stepIndex}" data-key="${c.key}">▶ Show me in 3D</button>
  </article>`;
}

// Cases nested by their recognition groups.
function branches(method, stepIndex, cases, depth, current) {
  const labels = [...new Set(cases.map(c => c.group?.[depth]).filter(Boolean))];
  if (!labels.length) {
    return cases.map(c => `<li>${caseCard(method, stepIndex, c, current?.stage === stepIndex && current?.key === c.key)}</li>`).join('');
  }
  return labels.map(label => {
    const inGroup = cases.filter(c => c.group[depth] === label);
    return `<li class="map-group"><div class="map-group-head"><span>${label}</span><small>${inGroup.length}</small></div><ul class="map-branches nested">${branches(method, stepIndex, inGroup, depth + 1, current)}</ul></li>`;
  }).join('');
}

export function renderMap(container, { method, current, onPick }) {
  container.innerHTML = `
    <p class="map-intro"><b>${method.name}</b> · ${method.steps.length} steps · ${method.steps.reduce((n, s) => n + s.cases.length, 0)} cases. Always hold the cube with <b>yellow on top</b>. For each step: find the picture that looks like your cube, hold it the way the card says, do the moves, then look again. Colors in the pictures are examples: match the pattern, not the exact colors.</p>
    <ol class="map">${method.steps.map((step, i) => `
    <li class="map-step ${current?.stage === i ? 'now' : current && i < current.stage ? 'done' : ''}">
      <div class="map-node">
        <span class="map-num">${String(i + 1).padStart(2, '0')}</span>
        <div><b>${step.name}</b><p>${step.look}</p><small>${step.cases.length} case${step.cases.length === 1 ? '' : 's'}</small></div>
      </div>
      <ul class="map-branches">
        ${branches(method, i, step.cases, 0, current)}
        <li class="map-exit-row"><div class="map-exit"><span class="map-thumb">${goalThumb(method, i)}</span><span><small class="exit-tag">Step ${String(i + 1).padStart(2, '0')} finished when it looks like this</small><b>✓ ${step.done}</b><small>${i < method.steps.length - 1 ? `Then go to step ${String(i + 2).padStart(2, '0')}: ${method.steps[i + 1].name} ↓` : 'Your cube is solved 🎉'}</small></span></div></li>
      </ul>
    </li>`).join('')}</ol>`;
  container.querySelectorAll('.mc-open').forEach(node => node.addEventListener('click', () => onPick(Number(node.dataset.stage), node.dataset.key)));
}
