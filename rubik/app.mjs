import { solved, tiles, showMove, inverse, applyMoves, tokens } from './cube.mjs?v=202611161257';
import { planNext, play, relevance, pieceLocation, ALGS, currentStage } from './method.mjs?v=202611161257';
import { palette, standard, lessons, algNames } from './lessons.mjs?v=202611161257';
import { examples } from './examples.mjs?v=202611161257';
import { moveIcon, describeMove, isoCube, topView, net } from './art.mjs?v=202611161257';
import { createGuide } from './guide.mjs?v=202611161257';
import { orientFromYaw, modelFace } from './moves.mjs?v=202611161257';
import { createCoach } from './coach.mjs?v=202611161257';
import { sfx } from './sfx.mjs?v=202611161257';
import { music } from './music.mjs?v=202611161257';
import { renderMap, caseCard } from './map.mjs?v=202611161257';
import { methodList, getMethod } from './methods.mjs?v=202611161257';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = () => (reducedMotion.matches ? 'instant' : 'smooth');
const swatch = color => `<i class="swatch" style="--color:${palette[color]}"></i>`;
const chip = move => `${moveIcon(move)}<span>${showMove(move)}</span>`;
function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}
function button(html, className = '', title) {
  const node = el('button', className, html);
  node.type = 'button';
  if (title) node.title = title;
  return node;
}

// ---------- Shared 3D cube ----------
let view;
const guide = createGuide($('canvas'));
const centersOnly = Array.from({ length: 54 }, (_, i) => i % 9 === 4);
let speedValue = 450;
const speed = () => speedValue;
for (const option of document.querySelectorAll('[data-speed]')) {
  option.addEventListener('click', () => {
    speedValue = Number(option.dataset.speed);
    for (const other of document.querySelectorAll('[data-speed]')) other.setAttribute('aria-checked', String(other === option));
  });
}
const cube = {
  shown: undefined,
  show(frame, { colors = standard, all, centers, mask, stage = -1, target, move, hold } = {}) {
    cube.shown = { frame, colors };
    const show = mask ?? (centers ? centersOnly : relevance(all ? -1 : stage, frame.state));
    const focus = target && stage >= 0 && stage < 4 ? pieceLocation(frame.state, target) : undefined;
    const orient = frame.orient ?? orientFromYaw(frame.yaw ?? 0);
    guide.setMove(move);
    if (view) view.setState(frame.state, { colors, show, focus, preview: move, orient });
    else $('fallback').innerHTML = net(frame.state, { palette, colors, show });
    const top = colors[modelFace('U', orient)];
    const front = colors[modelFace('F', orient)];
    $('hold').innerHTML = `${swatch(top)} ${top} top · ${swatch(front)} ${front} front`;
    $('hold').title = `Hold the cube with ${top} on top and ${front} facing you`;
    if (hold) { $('hold').innerHTML = `${swatch(top)} ${hold}`; $('hold').title = hold; }
  },
  async animate(move) {
    const whole = 'xyz'.includes(move[0]);
    const duration = reducedMotion.matches ? 0 : speed() * (whole ? 1.3 : 1) * (move.endsWith('2') ? 1.25 : 1);
    if (whole) sfx.whoosh(duration / 1000 || 0.3);
    else sfx.turn(duration / 1000 || 0.1);
    guide.setMove(move);
    await view?.animate(move, duration);
  },
  look(face) { view?.view(face); },
  reset() { if (view?.turned) view.view(); },
};

// ---------- Modes ----------
let mode;
let methodId = 'beginner';
try { methodId = localStorage.getItem('rubik-method') || 'beginner'; } catch { /* storage blocked */ }
if (!methodList.some(m => m.id === methodId)) methodId = 'beginner';
const coach = createCoach($('coach'), cube, methodId);
function setMode(next, scroll = true) {
  if (mode === next) return;
  mode = next;
  document.body.dataset.mode = next;
  for (const tab of document.querySelectorAll('[data-mode-tab]')) tab.setAttribute('aria-selected', String(tab.dataset.modeTab === next));
  history.replaceState(null, '', `#${next === 'coach' ? 'solve' : next}`);
  session++;
  playing = false;
  busy = false;
  if (next === 'coach') coach.render();
  else if (next === 'map') {
    coach.stop();
    loadMapProgress();
    showMap();
  } else {
    coach.stop();
    if (run) start(run.frames[0].state, run.frames[0].yaw, run.options);
    else startStage(0);
  }
  if (scroll) $('app').scrollIntoView({ behavior: smooth() });
}

// ---------- Map: solve from the map alone, with the pinned 3D cube ----------
const mapState = { method: '', open: new Set(), done: new Set(), selected: undefined, cursor: 0, token: 0, busy: false };
const mapKey = () => `rubik-map-${coach.method.id}`;
function loadMapProgress() {
  if (mapState.method === coach.method.id) return;
  mapState.method = coach.method.id;
  mapState.selected = undefined;
  mapState.cursor = 0;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(mapKey())); } catch { /* storage blocked */ }
  mapState.done = new Set(saved?.done ?? []);
  const here = coach.position?.stage;
  const first = coach.method.steps.findIndex((_, i) => !mapState.done.has(i));
  mapState.open = new Set([here ?? (first < 0 ? 0 : first)]);
}
function saveMapProgress() {
  try { localStorage.setItem(mapKey(), JSON.stringify({ done: [...mapState.done] })); } catch { /* storage blocked */ }
}
function mapCase() {
  const sel = mapState.selected;
  return sel && coach.method.steps[sel.stage].cases.find(c => c.key === sel.key);
}
// The cube stays still until asked: show the case where it starts, or
// where the current move begins, with that move's arrow.
function mapFrame() {
  const method = coach.method;
  const c = mapCase();
  if (!c) {
    const first = [...mapState.open].sort((a, b) => a - b)[0] ?? 0;
    const step = method.steps[first];
    cube.reset();
    cube.show({ state: step.goal, yaw: step.yaw ?? 0 }, { colors: standard, mask: step.mask(step.goal) });
    return;
  }
  const step = method.steps[mapState.selected.stage];
  const frame = c.frames[mapState.cursor];
  cube.show(frame, { colors: standard, mask: step.mask(frame.state), move: c.moves[mapState.cursor]?.move });
}
function refreshCard() {
  const c = mapCase();
  if (!c) return;
  const { stage, key } = mapState.selected;
  const node = $('map').querySelector(`[data-case="${stage}:${key}"]`);
  if (!node) return;
  node.outerHTML = caseCard(coach.method, stage, c, { here: coach.position?.stage === stage && coach.position?.key === key, playing: true, cursor: mapState.cursor });
}
function showMap() {
  renderMap($('map'), {
    method: coach.method,
    current: coach.position,
    open: mapState.open,
    done: mapState.done,
    selected: mapState.selected,
    cursor: mapState.cursor,
  });
  mapFrame();
}
async function mapStep(token = mapState.token) {
  const c = mapCase();
  if (!c || mapState.busy || mapState.cursor >= c.moves.length) return false;
  mapState.busy = true;
  cube.reset();
  mapFrame();
  await cube.animate(c.moves[mapState.cursor].move);
  if (token !== mapState.token) return false;
  mapState.cursor++;
  mapState.busy = false;
  refreshCard();
  mapFrame();
  if (mapState.cursor === c.moves.length) sfx.chime();
  return true;
}
async function mapPlay() {
  const c = mapCase();
  if (!c) return;
  const token = ++mapState.token;
  mapState.busy = false;
  if (mapState.cursor >= c.moves.length) mapState.cursor = 0;
  refreshCard();
  mapFrame();
  while (token === mapState.token && mapState.cursor < c.moves.length) {
    if (!(await mapStep(token))) break;
    await new Promise(resolve => setTimeout(resolve, 180));
  }
}
$('map').addEventListener('click', event => {
  const target = event.target.closest('[data-toggle], [data-select], [data-map-act], [data-done-step], [data-coach]');
  if (!target) return;
  const method = coach.method;
  if (target.dataset.toggle !== undefined) {
    const i = Number(target.dataset.toggle);
    sfx.tick();
    if (mapState.open.has(i)) mapState.open.delete(i); else mapState.open.add(i);
    if (mapState.selected?.stage === i && !mapState.open.has(i)) mapState.selected = undefined;
    mapState.token++;
    mapState.busy = false;
    showMap();
    return;
  }
  if (target.dataset.select) {
    const [stage, key] = target.dataset.select.split(':');
    sfx.tick();
    mapState.token++;
    mapState.busy = false;
    mapState.selected = { stage: Number(stage), key };
    mapState.cursor = 0;
    showMap();
    // On phones the pinned cube sits above: keep the card in view under it.
    $('map').querySelector(`[data-case="${stage}:${key}"]`)?.scrollIntoView({ behavior: smooth(), block: 'nearest' });
    return;
  }
  if (target.dataset.mapAct) {
    const act = target.dataset.mapAct;
    if (act === 'step') { mapState.token++; mapStep(); }
    if (act === 'play') mapPlay();
    if (act === 'back' && mapState.cursor > 0 && !mapState.busy) {
      mapState.token++;
      mapState.cursor--;
      refreshCard();
      mapFrame();
    }
    return;
  }
  if (target.dataset.doneStep !== undefined) {
    const i = Number(target.dataset.doneStep);
    mapState.done.add(i);
    mapState.open.delete(i);
    mapState.selected = undefined;
    mapState.token++;
    saveMapProgress();
    if (i < method.steps.length - 1) {
      mapState.open.add(i + 1);
      sfx.fanfare(false);
    } else {
      sfx.fanfare(true);
    }
    showMap();
    $('map').querySelector(`[data-toggle="${Math.min(i + 1, method.steps.length - 1)}"]`)?.scrollIntoView({ behavior: smooth(), block: 'start' });
    return;
  }
  if (target.dataset.coach) {
    const [stage, key] = target.dataset.coach.split(':');
    sfx.tick();
    mapState.token++;
    setMode('coach', false);
    coach.goTo(Number(stage), key);
    $('app').scrollIntoView({ behavior: smooth() });
  }
});

// ---------- Learn: steps, cases, player ----------
let run;
let cursor = 0;
let session = 0;
let playing = false;
let playbackId = 0;
let busy = false;
let showAll = false;
let shownStage = 0;
let trying = false;
let half;
let misses = 0;
let hinted = false;

function wholePlan(state, yaw) {
  const stage = currentStage(state);
  const plan = { stage, key: '', whole: true, blocks: [] };
  let at = { state, yaw };
  for (let piece = 1; piece <= 12; piece++) {
    const next = planNext(at.state, at.yaw);
    if (next.stage !== stage) break;
    plan.key ||= next.key;
    for (const block of next.blocks) plan.blocks.push({ ...block, label: `#${piece} ${block.label}`, target: next.target });
    at = next.end;
  }
  return plan;
}

function start(state, yaw = 0, options = {}) {
  const { mode: runMode = 'lesson', colors = standard, demo, whole } = options;
  const plan = demo
    ? { stage: -2, key: '', blocks: [{ kind: 'move', label: 'Try it', moves: demo }] }
    : whole ? wholePlan(state, yaw) : planNext(state, yaw);
  const moves = plan.blocks.flatMap((block, index) => block.moves.map(move => ({ move, block: index })));
  const frames = [{ state, yaw }];
  for (const { move } of moves) {
    const last = frames.at(-1);
    frames.push(play(last.state, last.yaw, [move]));
  }
  session++;
  cursor = 0;
  playing = false;
  busy = false;
  half = undefined;
  misses = 0;
  hinted = false;
  run = { mode: runMode, colors, ...plan, moves, frames, options };
  if (plan.stage >= 0 || plan.stage === -1) shownStage = plan.stage < 0 ? lessons.length - 1 : plan.stage;
  cube.reset();
  render();
}

function startCase(stage, key) {
  const [state, yaw] = examples[stage][key];
  start(state, yaw, { mode: 'lesson' });
}
function startStage(stage) {
  startCase(stage, Object.keys(lessons[stage].cases)[0]);
}
let stageStarts;
function stageStart(stage) {
  if (!stageStarts) {
    stageStarts = [];
    let at = { state: applyMoves(solved, tokens("R2 D' B U2 L F' D2 R' U B2 L2 F R D' L' U2 B' R2 F2 D L")), yaw: 0 };
    for (let guard = 0; guard < 60; guard++) {
      const plan = planNext(at.state, at.yaw);
      if (plan.stage < 0) break;
      stageStarts[plan.stage] ??= at;
      at = plan.end;
    }
  }
  return stageStarts[stage] ?? { state: examples[stage][Object.keys(examples[stage])[0]][0], yaw: 0 };
}
function watchWhole(stage) {
  const { state, yaw } = stageStart(stage);
  setTrying(false);
  start(state, yaw, { mode: 'lesson', whole: true });
  $('app').scrollIntoView({ behavior: smooth(), block: 'start' });
  playback();
}

function render() {
  if (mode !== 'learn') return;
  renderSteps();
  renderPanel();
  renderPlayer();
}

function renderSteps() {
  const tracking = run.mode === 'practice';
  $('steps').replaceChildren(...lessons.map(({ name }, index) => {
    const done = tracking && (run.stage === -1 || index < run.stage);
    const item = button(`<b>${done ? '✓' : String(index + 1).padStart(2, '0')}</b><span>${name}</span>`, 'step-pill');
    if (index === shownStage) item.setAttribute('aria-current', 'step');
    if (done) item.classList.add('done');
    item.addEventListener('click', () => { sfx.tick(); startStage(index); });
    return item;
  }));
  const current = $('steps').querySelector('[aria-current]');
  if (current) $('steps').scrollTo({ left: current.offsetLeft - 16, behavior: smooth() });
}

const artCache = new Map();
function caseArt(stage, key) {
  const id = `${stage}:${key}`;
  if (artCache.has(id)) return artCache.get(id);
  const [state, yaw] = examples[stage][key];
  const plan = planNext(state, yaw);
  let html;
  if (lessons[stage].art === 'top') {
    let frame = { state, yaw };
    for (const block of plan.blocks) {
      if (block.kind === 'alg') break;
      frame = play(frame.state, frame.yaw, block.moves);
    }
    html = topView(frame.state, { palette, colors: standard, show: relevance(stage, frame.state), yaw: frame.yaw });
  } else {
    const where = pieceLocation(state, plan.target);
    const focus = where ? tiles.map((tile, index) => tile.position.join() === where.join() ? index : -1).filter(index => index >= 0) : [];
    html = isoCube(state, { palette, colors: standard, show: relevance(stage, state), yaw, focus });
  }
  artCache.set(id, html);
  return html;
}
function compactFormula(blocks) {
  const parts = [];
  for (const block of blocks) {
    const text = block.moves.map(showMove).join(' ');
    const last = parts.at(-1);
    if (last && last.text === text && block.kind === 'alg') last.count++;
    else parts.push({ text, count: 1, group: block.kind === 'alg' && block.moves.length > 1 });
  }
  return parts.map(({ text, count, group }) => count > 1 ? `(${text})×${count}` : group && parts.length > 1 ? `(${text})` : text).join('  ');
}
const formulaCache = new Map();
function caseFormula(stage, key) {
  const id = `${stage}:${key}`;
  if (!formulaCache.has(id)) {
    const [state, yaw] = examples[stage][key];
    formulaCache.set(id, compactFormula(planNext(state, yaw).blocks));
  }
  return formulaCache.get(id);
}
function formula(key) {
  return `<div class="formula-card"><div class="formula-name">${algNames[key]}</div><div class="chips">${ALGS[key].map(move => `<span class="chip">${chip(move)}</span>`).join('')}</div></div>`;
}

function renderPanel() {
  const lesson = lessons[shownStage];
  const algs = lesson.alg ? [lesson.alg].flat() : [];
  $('panel').innerHTML = `
    <div class="eyebrow">Step ${String(shownStage + 1).padStart(2, '0')} / ${String(lessons.length).padStart(2, '0')}</div>
    <h2 id="panel-title">${lesson.name}</h2>
    <p class="goal">${lesson.goal}</p>
    ${algs.length ? `<div class="learn"><div class="eyebrow">Memorize</div>${algs.map(formula).join('')}${lesson.repeat ? `<p class="repeat">↻ ${lesson.repeat}</p>` : ''}</div>` : ''}
    <div class="eyebrow how-label">How to do it</div>
    <ol class="how">${lesson.how.map(line => `<li><span>${line}</span></li>`).join('')}</ol>
    <button class="button ghost watch" id="watch-whole">▶ Watch the whole step</button>
    <div class="eyebrow cases-label">Which one looks like yours?</div>
    <div class="cases" id="cases"></div>
    <p class="tip"><b>Tip</b> ${lesson.tip}</p>`;
  $('cases').replaceChildren(...Object.entries(lesson.cases).map(([key, [label]]) => {
    const card = button(`<span class="art">${caseArt(shownStage, key)}</span><span class="case-name">${label}</span><code class="case-formula">${caseFormula(shownStage, key)}</code>`, 'case');
    const active = !run.whole && run.stage === shownStage && run.key === key;
    card.setAttribute('aria-pressed', String(active));
    card.addEventListener('click', () => {
      sfx.tick();
      startCase(shownStage, key);
      if (matchMedia('(max-width: 900px)').matches) $('app').scrollIntoView({ behavior: smooth() });
    });
    return card;
  }));
  $('watch-whole').addEventListener('click', () => watchWhole(shownStage));
}

function frameAt(index = cursor) { return run.frames[index]; }
function updateModel() {
  let frame = frameAt();
  if (half) frame = play(frame.state, frame.yaw, [half]);
  const entry = run.moves[Math.min(cursor, run.moves.length - 1)];
  const target = entry && run.blocks[entry.block].target || run.target;
  const showArrow = !trying || hinted;
  cube.show(frame, {
    colors: run.colors,
    all: showAll || run.stage < 0,
    stage: run.stage,
    target,
    move: showArrow && !half ? run.moves[cursor]?.move : undefined,
  });
}

function renderPlayer() {
  const { moves, blocks, stage, key, mode: runMode } = run;
  const current = moves[cursor];
  const finished = cursor === moves.length;
  const lesson = lessons[stage];
  const caseInfo = lesson?.cases[key];
  $('case-line').innerHTML = runMode === 'demo' ? '<b>Practice a turn</b>'
    : stage === -1 ? '<b>Solved!</b> Every face is one color.'
      : run.whole ? `<span class="tag">Whole step</span> <b>${lesson.name}</b>, every piece from start to finish.`
        : `<span class="tag">${runMode === 'lesson' ? 'Example' : 'Scramble'}</span> <b>${lesson.name}: ${caseInfo[0]}.</b> ${caseInfo[1]}`;
  $('full-formula').innerHTML = moves.length ? `<span class="eyebrow">Full formula</span> <code>${compactFormula(blocks)}</code>` : '';
  if (trying && current) {
    $('now-icon').innerHTML = hinted ? moveIcon(current.move) : '<span class="q">?</span>';
    $('now-move').textContent = hinted ? showMove(current.move) : '';
    $('now-text').textContent = hinted ? describeMove(current.move) : misses ? 'Not that one. Try again, or ask for a hint.' : 'Your turn: tap the next move on the pad.';
    $('now-step').textContent = `${blocks[current.block].label} · move ${cursor + 1} of ${moves.length}${half ? ' · once more' : ''}`;
  } else if (current) {
    $('now-icon').innerHTML = moveIcon(current.move);
    $('now-move').textContent = showMove(current.move);
    $('now-text').textContent = describeMove(current.move);
    $('now-step').textContent = `${blocks[current.block].label} · move ${cursor + 1} of ${moves.length}`;
  } else {
    $('now-icon').innerHTML = '<span class="check">✓</span>';
    $('now-move').textContent = '';
    $('now-text').textContent = moves.length ? (trying ? 'You did it yourself!' : 'Done. Compare with your cube.') : stage === -1 ? 'Nothing left to do.' : '';
    $('now-step').textContent = moves.length ? `${moves.length} move${moves.length === 1 ? '' : 's'}` : '';
  }
  $('prev').disabled = cursor === 0 || busy || playing;
  $('next').disabled = finished || busy || playing;
  $('play').disabled = finished && !playing;
  $('play').innerHTML = playing ? '❚❚ Pause' : '▶ Play';
  $('restart').disabled = cursor === 0 || busy || playing;
  $('hint').disabled = finished || hinted;
  let offset = 0;
  $('timeline').replaceChildren(...blocks.map((block, blockIndex) => {
    const group = el('div', `block block-${block.kind}`);
    group.append(el('div', 'block-label', block.label));
    const row = el('div', 'chips');
    for (const move of block.moves) {
      const index = offset++;
      const hidden = trying && index >= cursor && !(hinted && index === cursor);
      const token = button(hidden ? '<span class="q">?</span><span>·</span>' : chip(move), 'chip', `Move ${index + 1}`);
      if (index === cursor) token.setAttribute('aria-current', 'true');
      if (index < cursor) token.classList.add('done');
      token.disabled = busy || playing || trying;
      token.addEventListener('click', () => { cursor = index; renderPlayer(); });
      row.append(token);
    }
    group.append(row);
    if (current?.block === blockIndex) group.classList.add('active');
    return group;
  }));
  renderFinish(finished);
  updateModel();
}

function renderFinish(finished) {
  const box = $('finish');
  box.hidden = !finished || playing || !run.moves.length && run.stage !== -1;
  if (box.hidden) return;
  const { mode: runMode, stage, frames } = run;
  const end = frames.at(-1);
  const next = currentStage(end.state);
  const actions = [];
  let message;
  if (runMode === 'demo') {
    message = 'That’s one turn.';
    actions.push(['↺ Replay', 'ghost', replay]);
  } else if (stage === -1) {
    message = 'Solved! 🎉';
    actions.push(['Solve my own cube →', 'primary', () => setMode('coach')]);
  } else if (runMode === 'lesson') {
    message = trying ? `Nice, you did it${misses ? '' : ' without a single slip'}!` : next !== stage ? `${lessons[stage].name} complete.` : 'That piece is done. Real solves repeat this for each piece.';
    if (!trying) actions.push(['✋ Try it yourself', 'primary', () => { setTrying(true); replay(); }]);
    if (stage < lessons.length - 1) actions.push([`Next: ${lessons[stage + 1].name} →`, trying ? 'primary' : 'ghost', () => startStage(stage + 1)]);
    actions.push(['↺ Again', 'ghost', replay]);
  } else {
    message = next < 0 ? 'Solved! 🎉' : next !== stage ? `${lessons[stage].name} complete!` : 'Piece done. On to the next one.';
    if (next >= 0) actions.push([next !== stage ? `Start ${lessons[next].name} →` : 'Next piece →', 'primary', () => start(end.state, end.yaw, { mode: runMode, colors: run.colors })]);
    actions.push(['↺ Replay', 'ghost', replay]);
  }
  box.innerHTML = `<p>${message}</p>`;
  const row = el('div', 'actions');
  actions.forEach(([label, style, action]) => {
    const control = button(label, `button ${style}`);
    control.addEventListener('click', action);
    row.append(control);
  });
  box.append(row);
}

function replay() {
  playing = false;
  playbackId++;
  cursor = 0;
  half = undefined;
  misses = 0;
  hinted = false;
  renderPlayer();
}

async function step(direction) {
  if (busy) return;
  const forward = direction > 0;
  const entry = run.moves[forward ? cursor : cursor - 1];
  if (!entry) return;
  const { yaw } = frameAt();
  const move = forward ? entry.move : inverse([entry.move])[0];
  const currentSession = session;
  cube.reset();
  busy = true;
  renderPlayer();
  await cube.animate(move, yaw);
  if (currentSession !== session) return;
  cursor += direction;
  busy = false;
  if (forward && cursor === run.moves.length) {
    if (currentStage(run.frames.at(-1).state) !== run.stage) sfx.fanfare(false);
    else sfx.chime();
  }
  renderPlayer();
}

async function playback() {
  if (playing) {
    playing = false;
    playbackId++;
    renderPlayer();
    return;
  }
  if (trying) setTrying(false);
  if (cursor === run.moves.length) cursor = 0;
  const currentSession = session;
  const currentPlayback = ++playbackId;
  playing = true;
  renderPlayer();
  while (playing && currentSession === session && currentPlayback === playbackId && cursor < run.moves.length) {
    await step(1);
    const entry = run.moves[cursor];
    const pause = entry && run.moves[cursor - 1]?.block !== entry.block ? 420 : 90;
    if (view && !reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, pause));
  }
  if (currentSession !== session || currentPlayback !== playbackId) return;
  playing = false;
  renderPlayer();
}

// ---------- Try it yourself ----------
const padMoves = ['U', "U'", 'R', "R'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'", 'y', "y'"];
function setTrying(on) {
  trying = on;
  $('player').classList.toggle('trying', on);
  for (const tab of document.querySelectorAll('[data-play-tab]')) tab.setAttribute('aria-selected', String((tab.dataset.playTab === 'try') === on));
  if (run) replay();
}
async function pad(move) {
  if (!trying || busy || cursor >= run.moves.length) return;
  const expected = run.moves[cursor].move;
  const yaw = frameAt().yaw;
  const quarterOf = expected.endsWith('2') ? expected[0] : undefined;
  let accept = false;
  let complete = false;
  if (quarterOf) {
    if (half) { accept = move === half; complete = accept; }
    else { accept = move[0] === quarterOf; }
  } else {
    accept = move === expected;
    complete = accept;
  }
  if (!accept) {
    misses++;
    sfx.wrong();
    $('pad').animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 240 });
    if (misses >= 2) hinted = true;
    renderPlayer();
    return;
  }
  busy = true;
  const currentSession = session;
  const fromHalf = half;
  renderPlayer();
  const shownYaw = fromHalf ? play(frameAt().state, yaw, [fromHalf]).yaw : yaw;
  await cube.animate(move, shownYaw);
  if (currentSession !== session) return;
  busy = false;
  if (complete) {
    cursor++;
    half = undefined;
    hinted = false;
    if (cursor === run.moves.length) sfx.chime(); else sfx.correct();
  } else {
    half = move;
    sfx.tick();
  }
  renderPlayer();
}
$('pad').replaceChildren(...padMoves.map(move => {
  const key = button(`${moveIcon(move)}<span>${showMove(move)}</span>`, 'pad-key', describeMove(move));
  key.addEventListener('click', () => pad(move));
  return key;
}));

// ---------- Notation dialog ----------
const notationMoves = ['U', "U'", 'R', "R'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'", 'U2', 'R2', 'y', "y'"];
$('notation-grid').replaceChildren(...notationMoves.map(move => {
  const tile = button(`${moveIcon(move)}<b>${showMove(move)}</b><span>${describeMove(move)}</span>`, 'notation-tile');
  tile.addEventListener('click', () => {
    $('notation').close();
    setMode('learn', false);
    setTrying(false);
    start(solved, 0, { mode: 'demo', demo: [move] });
    $('app').scrollIntoView({ behavior: smooth() });
    step(1);
  });
  return tile;
}));

// ---------- Wiring ----------
function updateSound() {
  $('sound').textContent = sfx.muted ? '🔇' : '🔊';
  $('sound').setAttribute('aria-label', sfx.muted ? 'Turn sound on' : 'Turn sound off');
  $('sound').setAttribute('aria-pressed', String(!sfx.muted));
}
$('sound').addEventListener('click', () => { sfx.setMuted(!sfx.muted); updateSound(); sfx.tick(); });
updateSound();
for (const tab of document.querySelectorAll('[data-mode-tab]')) tab.addEventListener('click', () => { sfx.tick(); setMode(tab.dataset.modeTab, false); });
for (const tab of document.querySelectorAll('[data-play-tab]')) tab.addEventListener('click', () => { sfx.tick(); setTrying(tab.dataset.playTab === 'try'); });
$('cta-solve').addEventListener('click', () => { sfx.tick(); if (mode === 'coach') $('app').scrollIntoView({ behavior: smooth() }); else setMode('coach'); });
$('cta-learn').addEventListener('click', () => { sfx.tick(); if (mode === 'map') $('app').scrollIntoView({ behavior: smooth() }); else setMode('map'); });
$('restart-coach').addEventListener('click', () => { sfx.tick(); coach.restart(); });
document.addEventListener('open-learn', () => setMode('learn'));
document.addEventListener('open-map', () => setMode('map'));

// ---------- Method picker ----------
function renderMethods() {
  $('methods').replaceChildren(...methodList.map(m => {
    const choice = button(`<small>${m.level}</small><b>${m.name}</b>`, 'method');
    choice.setAttribute('role', 'radio');
    choice.setAttribute('aria-checked', String(m.id === methodId));
    choice.addEventListener('click', () => {
      if (m.id === methodId) return;
      sfx.tick();
      methodId = m.id;
      try { localStorage.setItem('rubik-method', methodId); } catch { /* storage blocked */ }
      coach.setMethod(methodId);
      renderMethods();
      if (mode === 'map') { mode = undefined; setMode('map', false); }
      else if (mode === 'learn' && methodId !== 'beginner') setMode('coach', false);
    });
    return choice;
  }));
  const current = methodList.find(m => m.id === methodId);
  const built = getMethod(methodId);
  $('method-blurb').textContent = `${current.blurb} ${built.steps.length} steps, ${built.steps.reduce((n, s) => n + s.cases.length, 0)} cases.`;
  document.body.dataset.method = methodId;
}
renderMethods();
function updateMusic() {
  $('music').setAttribute('aria-pressed', String(music.playing));
  $('music').textContent = music.playing ? '♫ Music on' : '♫ Music';
}
$('music').addEventListener('click', () => { music.toggle(); updateMusic(); });
// Music is on by default, but browsers only allow sound after the first tap
// or key press, so it starts then. A first tap on the music button itself is
// left to that button.
if (music.wanted) {
  const begin = event => {
    document.removeEventListener('pointerdown', begin, true);
    document.removeEventListener('keydown', begin, true);
    if (event.target.closest?.('#music')) return;
    music.start();
    updateMusic();
  };
  document.addEventListener('pointerdown', begin, true);
  document.addEventListener('keydown', begin, true);
}
updateMusic();
$('open-notation').addEventListener('click', () => $('notation').showModal());
$('reset-view').addEventListener('click', () => view?.view());
$('show-all').addEventListener('change', event => { showAll = event.target.checked; if (mode === 'learn') updateModel(); });
$('show-hands').addEventListener('change', event => view?.setHands(event.target.checked));
$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));
$('play').addEventListener('click', playback);
$('restart').addEventListener('click', replay);
$('hint').addEventListener('click', () => { hinted = true; sfx.tick(); renderPlayer(); });
document.addEventListener('keydown', event => {
  if (mode !== 'learn' || document.querySelector('dialog[open]') || event.target.closest('input, select, textarea')) return;
  if (trying) {
    const letter = event.key.toUpperCase();
    if ('URFLDBY'.includes(letter) && letter.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      pad((letter === 'Y' ? 'y' : letter) + (event.shiftKey ? "'" : ''));
    }
    return;
  }
  if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  if (event.key === ' ' && !event.target.closest('button')) { event.preventDefault(); playback(); }
});

// Hero logo: a CSS 3D cube whose top and bottom layers twist.
function buildLogo() {
  const sides = { front: 'green', right: 'orange', back: 'blue', left: 'red' };
  const face = (name, color, count) => `<div class="lf lf-${name}">${`<i style="--c:${palette[color]}"></i>`.repeat(count)}</div>`;
  const slab = (row, extra) => `<div class="slab slab-${row}">${Object.entries(sides).map(([name, color]) => face(name, color, 3)).join('')}${extra}</div>`;
  const inner = '<div class="lf lf-cap lf-in-top"></div><div class="lf lf-cap lf-in-bottom"></div>';
  $('logo').innerHTML = `<div class="logo-twirl"><div class="logo-spin">${slab('top', face('top', 'yellow', 9).replace('lf-top', 'lf-cap lf-top') + '<div class="lf lf-cap lf-in-bottom"></div>')}${slab('mid', inner)}${slab('bottom', face('bottom', 'white', 9).replace('lf-bottom', 'lf-cap lf-bottom') + '<div class="lf lf-cap lf-in-top"></div>')}</div></div>`;
  // A click gives it one quick extra turn.
  $('logo').addEventListener('click', () => {
    sfx.turn(0.3);
    if (reducedMotion.matches) return;
    $('logo').querySelector('.logo-twirl').animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-360deg)' }], { duration: 750, easing: 'cubic-bezier(.25,.8,.3,1)' });
  });
}
buildLogo();

setMode(location.hash === '#learn' ? 'learn' : location.hash === '#map' ? 'map' : 'coach', false);
import('./viewer.mjs?v=202611161257').then(({ createViewer }) => {
  view = createViewer($('canvas'));
  guide.attach(view);
  $('fallback').hidden = true;
  if (cube.shown) {
    // Redraw whatever was shown before the 3D view loaded.
    if (mode === 'learn') updateModel();
    else coach.render();
  }
}).catch(() => {
  $('canvas').hidden = true;
  $('fallback').hidden = false;
});
