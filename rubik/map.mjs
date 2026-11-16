// Pictures of cases, and the solving map: a method drawn as a tree of
// steps → recognition groups → cases → moves.
import { tiles } from './cube.mjs?v=202611161630';
import { palette, standard } from './lessons.mjs?v=202611161630';
import { isoCube, topView } from './art.mjs?v=202611161630';

const cache = new Map();
function focusIndices(c, state) {
  const where = c.focus?.(state) ?? [];
  return tiles.map((tile, i) => (where.some(p => p && p.join() === tile.position.join()) ? i : -1)).filter(i => i >= 0);
}
export function thumb(method, stepIndex, c) {
  const id = `${method.id}:${stepIndex}:${c.key}`;
  if (cache.has(id)) return cache.get(id);
  const step = method.steps[stepIndex];
  const { state } = c.start;
  const yaw = c.start.yaw ?? step.yaw ?? 0;
  const show = step.mask(state);
  const html = step.art === 'top'
    ? topView(state, { palette, colors: standard, show, yaw })
    : isoCube(state, { palette, colors: standard, show, yaw, focus: focusIndices(c, state) });
  cache.set(id, html);
  return html;
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

const caseButton = (method, stepIndex, c, here) => `<button type="button" class="map-case ${here ? 'here' : ''}" data-stage="${stepIndex}" data-key="${c.key}">
  <span class="map-thumb">${thumb(method, stepIndex, c)}</span>
  <span class="map-label">${c.label}</span>
  <code>${movesText(c)}</code>
  <span class="map-loop">↻ look again</span>
</button>`;

// Cases nested by their recognition groups.
function branches(method, stepIndex, cases, depth, current) {
  const labels = [...new Set(cases.map(c => c.group?.[depth]).filter(Boolean))];
  if (!labels.length) {
    return cases.map(c => `<li>${caseButton(method, stepIndex, c, current?.stage === stepIndex && current?.key === c.key)}</li>`).join('');
  }
  return labels.map(label => {
    const inGroup = cases.filter(c => c.group[depth] === label);
    return `<li class="map-group"><div class="map-group-head"><span>${label}</span><small>${inGroup.length}</small></div><ul class="map-branches nested">${branches(method, stepIndex, inGroup, depth + 1, current)}</ul></li>`;
  }).join('');
}

export function renderMap(container, { method, current, onPick }) {
  container.innerHTML = `
    <p class="map-intro"><b>${method.name}</b> · ${method.steps.length} steps · ${method.steps.reduce((n, s) => n + s.cases.length, 0)} cases. Every step: look, pick the case that matches, do its moves, look again until the step is done.</p>
    <ol class="map">${method.steps.map((step, i) => `
    <li class="map-step ${current?.stage === i ? 'now' : current && i < current.stage ? 'done' : ''}">
      <div class="map-node">
        <span class="map-num">${String(i + 1).padStart(2, '0')}</span>
        <div><b>${step.name}</b><p>${step.look}</p><small>${step.cases.length} case${step.cases.length === 1 ? '' : 's'}</small></div>
      </div>
      <ul class="map-branches">
        ${branches(method, i, step.cases, 0, current)}
        <li class="map-exit-row"><div class="map-exit"><span class="map-thumb">${goalThumb(method, i)}</span><span><b>✓ ${step.done}</b>${i < method.steps.length - 1 ? `<small>→ step ${String(i + 2).padStart(2, '0')}</small>` : ''}</span></div></li>
      </ul>
    </li>`).join('')}</ol>`;
  container.querySelectorAll('.map-case').forEach(node => node.addEventListener('click', () => onPick(Number(node.dataset.stage), node.dataset.key)));
}
