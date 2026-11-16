import { faces, solved, tiles, inspectCube, showMove, inverse, applyMoves, tokens } from './cube.mjs';
import { planNext, play, toAbsolute, relevance, pieceLocation, ALGS, currentStage } from './method.mjs';
import { palette, standard, lessons, algNames } from './lessons.mjs';
import { examples } from './examples.mjs';
import { moveIcon, describeMove, isoCube, topView, net } from './art.mjs';
import { createGuide } from './guide.mjs';

const $ = id => document.getElementById(id);
const capital = word => word[0].toUpperCase() + word.slice(1);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = () => (reducedMotion.matches ? 'instant' : 'smooth');
let view;
let run;
let cursor = 0;
let session = 0;
let playing = false;
let playbackId = 0;
let busy = false;
let showAll = false;
let ownSolve;
const guide = createGuide($('canvas'));

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
const swatch = color => `<i class="swatch" style="--color:${palette[color]}"></i>`;
const chip = move => `${moveIcon(move)}<span>${showMove(move)}</span>`;

// ---------- Running a plan ----------
// Every piece of the current step, back to back.
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

function start(state, yaw = 0, { mode = 'lesson', colors = standard, demo, whole } = {}) {
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
  run = { mode, colors, ...plan, moves, frames };
  if (mode === 'practice' || mode === 'mine') ownSolve = { state, yaw, colors, mode };
  if (plan.stage >= 0 || plan.stage === -1) shownStage = plan.stage < 0 ? lessons.length - 1 : plan.stage;
  view?.view();
  render();
}
let shownStage = 0;

function startCase(stage, key) {
  const [state, yaw] = examples[stage][key];
  start(state, yaw, { mode: 'lesson' });
}
// A starting cube for each step, taken from one fixed scramble.
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
  start(state, yaw, { mode: 'lesson', whole: true });
  $('player').scrollIntoView({ behavior: smooth(), block: 'nearest' });
  playback();
}
function startStage(stage) {
  startCase(stage, Object.keys(lessons[stage].cases)[0]);
}

function render() {
  renderSteps();
  renderPanel();
  renderPlayer();
}

// ---------- Step bar ----------
function renderSteps() {
  const tracking = run.mode === 'practice' || run.mode === 'mine';
  $('steps').replaceChildren(...lessons.map(({ name }, index) => {
    const done = tracking && (run.stage === -1 || index < run.stage);
    const item = button(`<b>${done ? '✓' : index + 1}</b><span>${name}</span>`, 'step-pill');
    if (index === shownStage) item.setAttribute('aria-current', 'step');
    if (done) item.classList.add('done');
    item.addEventListener('click', () => {
      startStage(index);
      $('player').scrollIntoView({ behavior: smooth(), block: 'nearest' });
    });
    return item;
  }));
  const current = $('steps').querySelector('[aria-current]');
  if (current) $('steps').scrollTo({ left: current.offsetLeft - 16, behavior: smooth() });
  $('resume').hidden = !ownSolve || tracking;
}

// ---------- Step panel ----------
const artCache = new Map();
function caseArt(stage, key) {
  const id = `${stage}:${key}`;
  if (artCache.has(id)) return artCache.get(id);
  const [state, yaw] = examples[stage][key];
  const plan = planNext(state, yaw);
  let html;
  if (lessons[stage].art === 'top') {
    // Show the case the way you hold it, right before the formula.
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

// Short written formula: repeated algorithms collapse to (…)×n.
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
    <div class="eyebrow">Step ${shownStage + 1} of ${lessons.length}</div>
    <h2 id="panel-title">${lesson.name}</h2>
    <p class="goal">${lesson.goal}</p>
    ${algs.length ? `<div class="learn"><div class="label">Memorize</div>${algs.map(formula).join('')}${lesson.repeat ? `<p class="repeat">↻ ${lesson.repeat}</p>` : ''}</div>` : ''}
    <div class="label how-label">How to do it</div>
    <ol class="how">${lesson.how.map(line => `<li><span>${line}</span></li>`).join('')}</ol>
    <button class="secondary watch" id="watch-whole">▶ Watch the whole step</button>
    <div class="label cases-label">Which one looks like yours?</div>
    <div class="cases" id="cases"></div>
    <p class="tip"><b>Tip</b> ${lesson.tip}</p>`;
  const tracking = run.mode === 'practice' || run.mode === 'mine';
  $('cases').replaceChildren(...Object.entries(lesson.cases).map(([key, [label]]) => {
    const card = button(`<span class="art">${caseArt(shownStage, key)}</span><span class="case-name">${label}</span><code class="case-formula">${caseFormula(shownStage, key)}</code>`, 'case');
    const active = !run.whole && run.stage === shownStage && run.key === key;
    card.setAttribute('aria-pressed', String(active));
    if (active && tracking) card.classList.add('yours');
    card.addEventListener('click', () => {
      startCase(shownStage, key);
      if (matchMedia('(max-width: 900px)').matches) $('player').scrollIntoView({ behavior: smooth() });
    });
    return card;
  }));
  $('watch-whole').addEventListener('click', () => watchWhole(shownStage));
}

// ---------- Player ----------
function frameAt(index = cursor) { return run.frames[index]; }

function updateModel() {
  const { state, yaw } = frameAt();
  const stage = showAll || run.stage < 0 ? -1 : run.stage;
  const show = relevance(stage, state);
  const entry = run.moves[Math.min(cursor, run.moves.length - 1)];
  const target = entry && run.blocks[entry.block].target || run.target;
  const focus = run.stage >= 0 && run.stage < 4 ? pieceLocation(state, target) : undefined;
  const move = run.moves[cursor]?.move;
  const preview = move && (move[0] === 'y' ? move : toAbsolute(move, yaw));
  if (!busy) guide.setMove(move);
  if (view) {
    if (!busy) view.setState(state, { colors: run.colors, show, focus, preview, turn: yaw });
  } else {
    $('fallback').innerHTML = net(state, { palette, colors: run.colors, show });
  }
  const front = run.colors[toAbsolute('F', yaw)];
  $('hold').innerHTML = `${swatch(run.colors.U)} ${run.colors.U} top · ${swatch(front)} ${front} front`;
  $('hold').title = `Hold the cube with ${run.colors.U} on top and ${front} facing you`;
}

function renderPlayer() {
  const { moves, blocks, stage, key, mode } = run;
  const current = moves[cursor];
  const finished = cursor === moves.length;
  const lesson = lessons[stage];
  const caseInfo = lesson?.cases[key];
  $('case-line').innerHTML = mode === 'demo' ? '<b>Practice a turn</b>'
    : stage === -1 ? '<b>Solved!</b> Every face is one color.'
      : run.whole ? `<span class="tag">Whole step</span> <b>${lesson.name}</b>, every piece from start to finish.`
        : `<span class="tag">${mode === 'lesson' ? 'Example' : mode === 'mine' ? 'Your cube' : 'Scramble'}</span> <b>${lesson.name}: ${caseInfo[0]}.</b> ${caseInfo[1]}`;
  $('full-formula').innerHTML = moves.length ? `<span class="label">Full formula</span> <code>${compactFormula(blocks)}</code>` : '';
  if (current) {
    $('now-icon').innerHTML = moveIcon(current.move);
    $('now-move').textContent = showMove(current.move);
    $('now-text').textContent = describeMove(current.move);
    $('now-step').textContent = `${blocks[current.block].label} · move ${cursor + 1} of ${moves.length}`;
  } else {
    $('now-icon').innerHTML = '<span class="check">✓</span>';
    $('now-move').textContent = '';
    $('now-text').textContent = moves.length ? 'Done. Compare with your cube.' : stage === -1 ? 'Nothing left to do.' : '';
    $('now-step').textContent = moves.length ? `${moves.length} move${moves.length === 1 ? '' : 's'}` : '';
  }
  $('prev').disabled = cursor === 0 || busy || playing;
  $('next').disabled = finished || busy || playing;
  $('play').disabled = finished && !playing;
  $('play').innerHTML = playing ? '❚❚ Pause' : '▶ Play';
  $('restart').disabled = cursor === 0 || busy || playing;
  let offset = 0;
  $('timeline').replaceChildren(...blocks.map((block, blockIndex) => {
    const group = el('div', `block block-${block.kind}`);
    group.append(el('div', 'block-label', block.label));
    const row = el('div', 'chips');
    for (const move of block.moves) {
      const index = offset++;
      const token = button(chip(move), 'chip', `Jump to move ${index + 1}`);
      if (index === cursor) token.setAttribute('aria-current', 'true');
      if (index < cursor) token.classList.add('done');
      token.disabled = busy || playing;
      token.addEventListener('click', () => { cursor = index; renderPlayer(); });
      row.append(token);
    }
    group.append(row);
    if (blocks[blockIndex].moves.length && current?.block === blockIndex) group.classList.add('active');
    return group;
  }));
  renderFinish(finished);
  updateModel();
}

function renderFinish(finished) {
  const box = $('finish');
  box.hidden = !finished || playing;
  if (box.hidden) return;
  const { mode, stage, frames } = run;
  const end = frames.at(-1);
  const next = currentStage(end.state);
  const actions = [];
  let message;
  if (mode === 'demo') {
    message = 'That’s one turn.';
    actions.push(['↺ Replay', 'secondary', replay]);
  } else if (stage === -1) {
    message = 'Solved! 🎉';
    actions.push(['New scramble', 'primary', scramble]);
  } else if (mode === 'lesson') {
    message = next !== stage ? `${lessons[stage].name} complete.` : 'That piece is done. Real solves repeat this for each piece.';
    if (stage < lessons.length - 1) actions.push([`Next: ${lessons[stage + 1].name} →`, 'primary', () => startStage(stage + 1)]);
    actions.push(['↺ Replay', 'secondary', replay]);
    if (next >= 0) actions.push(['Keep solving this cube', 'secondary', () => start(end.state, end.yaw, { mode: 'practice' })]);
  } else {
    if (next < 0) $('steps').querySelectorAll('.step-pill').forEach(pill => { pill.classList.add('done'); pill.querySelector('b').textContent = '✓'; });
    message = next < 0 ? 'Solved! 🎉' : next !== stage ? `${lessons[stage].name} complete!` : 'Piece done. On to the next one.';
    if (next < 0) actions.push(['New scramble', 'primary', scramble]);
    else actions.push([next !== stage ? `Start ${lessons[next].name} →` : 'Next piece →', 'primary', () => start(end.state, end.yaw, { mode, colors: run.colors })]);
    actions.push(['↺ Replay', 'secondary', replay]);
  }
  box.innerHTML = `<p>${message}</p>`;
  const row = el('div', 'actions');
  actions.forEach(([label, style, action], index) => {
    const control = button(label, style);
    control.addEventListener('click', action);
    row.append(control);
    if (index === 0) queueMicrotask(() => { if (document.activeElement === document.body || document.activeElement?.id === 'next' || document.activeElement?.id === 'play') control.focus({ preventScroll: true }); });
  });
  box.append(row);
}

function replay() {
  playing = false;
  playbackId++;
  cursor = 0;
  renderPlayer();
}

async function step(direction) {
  if (busy) return;
  const forward = direction > 0;
  const entry = run.moves[forward ? cursor : cursor - 1];
  if (!entry) return;
  const { yaw } = frameAt();
  const move = forward ? entry.move : inverse([entry.move])[0];
  const absolute = move[0] === 'y' ? move : toAbsolute(move, yaw);
  const currentSession = session;
  if (view?.turned) view.view();
  busy = true;
  renderPlayer();
  guide.setMove(move);
  await view?.animate(absolute, reducedMotion.matches ? 0 : Number($('speed').value) * (move[0] === 'y' ? 1.3 : 1));
  if (currentSession !== session) return;
  cursor += direction;
  busy = false;
  renderPlayer();
}

async function playback() {
  if (playing) {
    playing = false;
    playbackId++;
    renderPlayer();
    return;
  }
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

function scramble() {
  const options = [...'URFDLB'].flatMap(face => [face, face + "'", face + '2']);
  const moves = [];
  while (moves.length < 22) {
    const option = options[Math.floor(Math.random() * options.length)];
    if (moves.at(-1)?.[0] !== option[0]) moves.push(option);
  }
  start(applyMoves(solved, moves), 0, { mode: 'practice' });
  $('player').scrollIntoView({ behavior: smooth(), block: 'nearest' });
}

// ---------- Notation dialog ----------
const notationMoves = ['U', "U'", 'R', "R'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'", 'U2', 'R2', 'y', "y'"];
$('notation-grid').replaceChildren(...notationMoves.map(move => {
  const tile = button(`${moveIcon(move)}<b>${showMove(move)}</b><span>${describeMove(move)}</span>`, 'notation-tile');
  tile.addEventListener('click', () => {
    $('notation').close();
    start(solved, 0, { mode: 'demo', demo: [move] });
    $('player').scrollIntoView({ behavior: smooth(), block: 'nearest' });
    step(1);
  });
  return tile;
}));

// ---------- Sticker editor ----------
const faceOrder = [...'FRBLUD'];
const faceNames = { U: 'top', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' };
let editorFace = 'F';
let selectedColor = 'green';
let editorStickers = emptyEditor();
function emptyEditor() {
  const state = Array(54).fill('');
  state[4] = 'yellow';
  state[31] = 'white';
  return state;
}
const directions = {
  F: 'Yellow on top. Look straight at the side you chose as front.',
  R: 'Turn the whole cube left so the right side faces you. Yellow stays on top.',
  B: 'Turn once more. Yellow stays on top.',
  L: 'Turn once more. Yellow stays on top.',
  U: 'Back to the original front, then tip the cube toward you to see the top. Front edge at the bottom.',
  D: 'Back to the original front, then tip the cube away to see the bottom. Front edge at the top.',
};
function renderEditor() {
  const offset = faces.indexOf(editorFace) * 9;
  $('paint-title').textContent = `${capital(faceNames[editorFace])} face`;
  $('paint-hint').textContent = directions[editorFace];
  $('editor-faces').replaceChildren(...faceOrder.map(face => {
    const start = faces.indexOf(face) * 9;
    const complete = editorStickers.slice(start, start + 9).every(Boolean);
    const choice = button(`${capital(faceNames[face])}${complete ? ' ✓' : ''}`, 'secondary small');
    choice.setAttribute('aria-pressed', String(face === editorFace));
    choice.addEventListener('click', () => setEditorFace(face));
    return choice;
  }));
  $('palette').replaceChildren(...Object.entries(palette).map(([name, color]) => {
    const choice = button('', 'color-choice', capital(name));
    choice.setAttribute('aria-label', capital(name));
    choice.style.setProperty('--color', color);
    choice.setAttribute('aria-pressed', String(selectedColor === name));
    choice.addEventListener('click', () => { selectedColor = name; renderEditor(); });
    return choice;
  }));
  $('paint-grid').replaceChildren(...Array.from({ length: 9 }, (_, index) => {
    const color = editorStickers[offset + index];
    const cell = button('', 'paint-tile');
    cell.style.setProperty('--tile', palette[color] || '#24352e');
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${color || 'empty'}`);
    cell.disabled = index === 4 && (editorFace === 'U' || editorFace === 'D');
    cell.addEventListener('click', () => {
      editorStickers[offset + index] = selectedColor;
      $('editor-status').textContent = '';
      renderEditor();
      $('paint-grid').children[index].focus();
    });
    return cell;
  }));
  $('color-count').textContent = `${editorStickers.filter(Boolean).length} of 54 filled`;
  $('next-face').hidden = editorFace === 'D';
}
function setEditorFace(face) {
  editorFace = face;
  $('editor-status').textContent = '';
  renderEditor();
}
function useColors() {
  try {
    if (editorStickers.some(color => !color)) throw new Error('Fill in all six faces first.');
    const colors = Object.fromEntries([...faces].map((face, index) => [face, editorStickers[index * 9 + 4]]));
    if (new Set(Object.values(colors)).size !== 6) throw new Error('Each of the six centers needs a different color.');
    const byColor = Object.fromEntries(Object.entries(colors).map(([face, color]) => [color, face]));
    const state = editorStickers.map(color => byColor[color]).join('');
    inspectCube(state);
    start(state, 0, { mode: 'mine', colors });
    $('editor').close();
    $('player').scrollIntoView({ behavior: smooth(), block: 'nearest' });
  } catch (error) {
    $('editor-status').textContent = error.message;
  }
}

// ---------- Wiring ----------
$('open-notation').addEventListener('click', () => $('notation').showModal());
$('start-lesson').addEventListener('click', () => { startStage(0); $('player').scrollIntoView({ behavior: smooth() }); });
$('scramble').addEventListener('click', scramble);
$('open-editor').addEventListener('click', () => { renderEditor(); $('editor').showModal(); });
$('resume').addEventListener('click', () => start(ownSolve.state, ownSolve.yaw, { mode: ownSolve.mode, colors: ownSolve.colors }));
$('reset-view').addEventListener('click', () => view?.view());
$('show-all').addEventListener('change', event => { showAll = event.target.checked; updateModel(); });
$('show-hands').addEventListener('change', event => guide.setHands(event.target.checked));
$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));
$('play').addEventListener('click', playback);
$('restart').addEventListener('click', replay);
$('clear-editor').addEventListener('click', () => { editorStickers = emptyEditor(); setEditorFace('F'); });
$('load-example').addEventListener('click', () => {
  editorStickers = [...examples[3].right[0]].map(face => standard[face]);
  setEditorFace('F');
});
$('next-face').addEventListener('click', () => setEditorFace(faceOrder[faceOrder.indexOf(editorFace) + 1]));
$('solve-input').addEventListener('click', useColors);
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || event.target.closest('input, select, textarea')) return;
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
  $('logo').innerHTML = `<div class="logo-spin">${slab('top', face('top', 'yellow', 9).replace('lf-top', 'lf-cap lf-top') + '<div class="lf lf-cap lf-in-bottom"></div>')}${slab('mid', inner)}${slab('bottom', face('bottom', 'white', 9).replace('lf-bottom', 'lf-cap lf-bottom') + '<div class="lf lf-cap lf-in-top"></div>')}</div>`;
}
buildLogo();
startStage(0);
import('./viewer.mjs').then(({ createViewer }) => {
  view = createViewer($('canvas'));
  guide.attach(view);
  $('fallback').hidden = true;
  updateModel();
}).catch(() => {
  $('canvas').hidden = true;
  $('fallback').hidden = false;
  $('drag-hint').textContent = 'Flat view';
  updateModel();
});
