import {
  faces, solved, tiles, faceNames, inspectCube, caseKey, currentStage,
  planStage, applyMoves, showMove, inverse, home, focusPiece, generators,
} from './cube.mjs';
import { palette, standard, lessons } from './lessons.mjs';
import { examples } from './examples.mjs';

const $ = id => document.getElementById(id);
const faceOrder = [...'FRBLUD'];
const firstExample = examples[0].middle;
const capital = word => word[0].toUpperCase() + word.slice(1);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const formatPosition = position => position.map(value => value + 1).join('');
let view;
let cameraFace = '';
let run;
let cursor = 0;
let session = 0;
let playing = false;
let playbackId = 0;
let busy = false;
let animatedMove;
let editorFace = 'F';
let selectedColor = 'yellow';
let editorStickers = emptyEditor();

function button(label, className = '', title) {
  const result = document.createElement('button');
  result.type = 'button';
  result.className = className;
  result.textContent = label;
  if (title) result.title = title;
  return result;
}

function swatch(color) {
  return `<i class="swatch" style="--color:${palette[color]}"></i>`;
}

function samePosition(a, b) {
  return a && b && formatPosition(a) === formatPosition(b);
}

function sticker(index, state, colors, focus, clear = false) {
  const color = clear ? '#2a3833' : palette[colors[state[index]]];
  const marked = samePosition(focus, tiles[index].position);
  return `<span class="tile${marked ? ' marked' : ''}" style="--tile:${color}"></span>`;
}

function faceGrid(face, state, colors, focus, label = true) {
  const start = faces.indexOf(face) * 9;
  const description = [...state.slice(start, start + 9)].map(value => colors[value]).join(', ');
  const grid = Array.from({ length: 9 }, (_, index) => sticker(start + index, state, colors, focus)).join('');
  return `<span class="net-face net-${face}">${label ? `<span class="net-label">${face}</span>` : ''}<span class="net-grid" role="img" aria-label="${faceNames[face]}: ${description}">${grid}</span></span>`;
}

function net(state, colors, focus) {
  return `<div class="cube-net">${faceOrder.map(face => faceGrid(face, state, colors, focus)).join('')}</div>`;
}

function currentFocus(state) {
  if (!run.target) return undefined;
  return tiles[inspectCube(state)[run.target]].position;
}

function setCamera(face = '') {
  cameraFace = face;
  view?.view(face);
  updateCameraButtons();
  updateModel();
}

function updateCameraButtons() {
  for (const element of $('cameras').children) element.setAttribute('aria-pressed', String(element.textContent === cameraFace));
  updateDirectionIndicator();
}

function updateDirectionIndicator() {
  const move = animatedMove ?? run?.moves[cursor];
  const indicator = $('direction-indicator');
  indicator.hidden = !cameraFace || move?.[0] !== cameraFace;
  if (!indicator.hidden) {
    indicator.textContent = move.endsWith('2') ? '↻ 180°' : move.endsWith("'") ? '↺ 90°' : '↻ 90°';
  }
}

function updateModel() {
  const state = run.frames[cursor];
  const focus = currentFocus(state);
  if (view) {
    if (!busy) view.setState(state, run.colors, focus, run.moves[cursor]);
  } else {
    $('fallback').innerHTML = cameraFace ? faceGrid(cameraFace, state, run.colors, focus) : net(state, run.colors, focus);
  }
}

function start(state, { mode = 'example', colors = standard, demoTurns } = {}) {
  const positions = inspectCube(state);
  const stage = demoTurns ? -1 : currentStage(positions);
  const plan = demoTurns ? { blocks: [demoTurns] } : stage < 0 ? { blocks: [] } : planStage(stage, positions);
  const moves = plan.blocks.flat();
  const frames = [state];
  for (const move of moves) frames.push(applyMoves(frames.at(-1), [move]));
  session++;
  cursor = 0;
  playing = false;
  busy = false;
  animatedMove = undefined;
  run = {
    mode, colors, stage, positions, ...plan, moves, frames,
    key: stage >= 0 ? caseKey(stage, positions) : '',
  };
  cameraFace = '';
  view?.view();
  updateCameraButtons();
  renderRoadmap();
  renderCases();
  renderPlayer();
}

function renderRoadmap() {
  const stage = run.stage;
  $('stages').replaceChildren(...lessons.map(({ name }, index) => {
    const li = document.createElement('li');
    const marker = run.mode !== 'notation' && (stage < 0 || index < stage) ? '✓' : String(index + 1).padStart(2, '0');
    const entry = button('', 'stage-button');
    entry.innerHTML = `<span class="stage-number">${marker}</span><span>${name}</span>`;
    if (stage === index) entry.setAttribute('aria-current', 'step');
    if (run.mode === 'exact') {
      const label = document.createElement('div');
      label.className = 'stage-button';
      label.innerHTML = entry.innerHTML;
      if (stage === index) label.setAttribute('aria-current', 'step');
      li.append(label);
    } else {
      entry.addEventListener('click', () => start(Object.values(examples[index])[0]));
      li.append(entry);
    }
    return li;
  }));
  const list = $('stages');
  const active = list.querySelector('[aria-current="step"]');
  if (active && list.scrollWidth > list.clientWidth) {
    const bounds = list.getBoundingClientRect();
    const step = active.getBoundingClientRect();
    if (step.left < bounds.left || step.right > bounds.right) list.scrollLeft += step.left - bounds.left;
  }
}

function caseArt(stage, state, positions) {
  if (stage < 3) {
    const focus = positions[focusPiece(stage, positions)];
    const { face, position } = tiles[focus];
    return faceGrid(face, state, standard, position);
  }
  const top = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => {
    const highlight = stage === 3 ? index % 2 === 1 || index === 4 : true;
    return sticker(index, state, standard, undefined, !highlight || (stage < 5 && state[index] !== 'U'));
  }).join('');
  const strip = (face, reverse = false) => {
    const start = faces.indexOf(face) * 9;
    const indexes = reverse ? [2, 1, 0] : [0, 1, 2];
    return indexes.map(index => {
      const absolute = start + index;
      return sticker(absolute, state, standard, undefined, stage === 4 && state[absolute] !== 'U');
    }).join('');
  };
  if (stage === 3) return `<span class="net-grid simple-icon">${top}</span>`;
  return `<span class="pattern-icon">
    <span class="strip-b">${strip('B', true)}</span><span class="strip-l">${strip('L')}</span>
    <span class="net-grid">${top}</span><span class="strip-r">${strip('R', true)}</span><span class="strip-f">${strip('F')}</span>
  </span>`;
}

function renderCases() {
  const stage = run.stage;
  $('case-section').hidden = stage < 0 || run.mode === 'exact';
  if ($('case-section').hidden) return;
  const { name, cases } = lessons[stage];
  $('case-stage').textContent = name;
  const cards = Object.entries(cases).filter(([key]) => key in examples[stage]).map(([key, [label]]) => {
    const state = examples[stage][key];
    const card = button('', 'case-card');
    card.setAttribute('aria-pressed', String(run.key === key && run.mode === 'example'));
    card.innerHTML = `<span class="case-art" aria-hidden="true">${caseArt(stage, state, inspectCube(state))}</span><span>${label}</span>`;
    card.addEventListener('click', () => {
      start(state);
      $('workbench').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      $('next-move').focus({ preventScroll: true });
    });
    return card;
  });
  const completed = button('Already finished this stage →', 'case-card complete-card');
  completed.addEventListener('click', () => {
    start(stage < lessons.length - 1 ? Object.values(examples[stage + 1])[0] : solved);
    $('workbench').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  $('cases').replaceChildren(...cards, completed);
}

function describe(move) {
  const face = faceNames[move[0]];
  if (move.endsWith('2')) return [`Turn the ${face} layer 180°`, 'Make two quarter-turns in either direction.'];
  const direction = move.endsWith("'") ? 'counterclockwise' : 'clockwise';
  return [`Turn the ${face} layer ${direction}`, `Look straight at the ${face} face. Turn just that outer layer by 90°.`];
}

function renderPlayer() {
  const { stage, moves, blocks, colors, mode } = run;
  const move = moves[cursor];
  const finished = cursor === moves.length;
  const [title, detail] = move ? describe(move)
    : [stage < 0 && mode !== 'notation' ? 'Cube solved' : 'Sequence complete',
      stage >= 0 ? 'Check the result and continue when your cube matches.' : ''];
  const modeLabel = { example: 'Case demonstration', practice: 'Practice scramble', exact: 'Your cube', notation: 'Notation practice' }[mode];
  $('mode-label').innerHTML = `<i></i> ${modeLabel}`;
  $('holding').innerHTML = ['U', 'F', 'R'].map(face =>
    `<span>${swatch(colors[face])}<b>${capital(faceNames[face])}</b> ${colors[face]}</span>`).join('');
  $('move-symbol').textContent = move ? showMove(move) : '✓';
  $('move-title').textContent = title;
  $('move-detail').textContent = detail;
  updateDirectionIndicator();
  $('face-view').disabled = !move;
  $('previous-move').disabled = cursor === 0 || playing || busy;
  $('next-move').disabled = finished || playing || busy;
  $('next-move').hidden = finished && stage >= 0;
  $('play').disabled = (finished || busy) && !playing;
  $('play').textContent = playing ? 'Pause' : 'Play';
  $('play').setAttribute('aria-label', playing ? 'Pause playback' : 'Play all turns');
  $('move-count').textContent = moves.length ? `${cursor} / ${moves.length} turns` : '';
  let offset = 0;
  $('formula').replaceChildren(...blocks.map(block => {
    const group = document.createElement('span');
    group.className = 'formula-group';
    for (const turn of block) {
      const index = offset++;
      const token = button(showMove(turn), 'token', `Preview turn ${index + 1}: ${showMove(turn)}`);
      if (index === cursor) token.setAttribute('aria-current', 'true');
      if (index < cursor) token.classList.add('done');
      token.disabled = playing || busy;
      token.addEventListener('click', () => {
        cursor = index;
        renderPlayer();
        $('formula').querySelector('[aria-current]')?.focus();
      });
      group.append(token);
    }
    return group;
  }));
  $('formula').hidden = !moves.length;
  $('snapshots').hidden = !moves.length;
  if ($('snapshots').open) renderSnapshots();
  updateModel();
  renderLesson();
}

function renderSnapshots() {
  const state = run.frames[cursor];
  $('snapshot-content').innerHTML = `<div><h3>Current turn</h3>${net(state, run.colors, currentFocus(state))}</div>
    <div><h3>After this sequence</h3>${net(run.frames.at(-1), run.colors, currentFocus(run.frames.at(-1)))}</div>`;
}

function renderLesson() {
  const { stage, key, target, colors, positions, mode, frames } = run;
  const element = $('lesson-content');
  $('advance').hidden = stage < 0 || cursor !== run.moves.length;
  if (stage < 0) {
    element.innerHTML = mode === 'notation'
      ? '<h2 id="lesson-title">Practice a turn</h2><p>Use the face view to see which way the layer moves. Open Turn notation to try another turn.</p>'
      : '<h2 id="lesson-title">Cube solved!</h2><p>All six sides match their centers. You can start a new scramble or pick a stage to practise again.</p>';
    return;
  }
  const { name, goal, tip, cases, odds } = lessons[stage];
  const [caseName, explanation] = cases[key];
  const targetLabel = target && [...target].map(face => swatch(colors[face]) + colors[face]).join(' <span>·</span> ');
  const where = target && faceNames[tiles[positions[target]].face];
  const goalFace = target && faceNames[tiles[home(target)].face];
  const seen = target && `${capital(colors[target[0]])} starts on the ${where} face. Its home is on the ${goalFace} face.`;
  const finished = cursor === run.moves.length;
  const nextStage = finished ? currentStage(inspectCube(frames.at(-1))) : stage;
  const resultText = nextStage < 0 ? 'All six faces match.' : nextStage === stage
    ? 'This piece is in its slot. Continue to the next piece.' : 'Stage complete. Check the goal against your cube.';
  const continueLabel = nextStage < 0 ? 'Finish solve' : nextStage === stage ? 'Next piece' : 'Next stage';
  element.innerHTML = `<div class="section-label">Stage ${stage + 1} of ${lessons.length}</div>
    <h2 id="lesson-title">${name}</h2><p class="goal">${goal}</p>
    <div class="case-note"><div class="section-label">${mode === 'exact' ? 'Your case' : 'Current case'}</div><h3>${caseName}</h3><p>${explanation}</p>
    ${target ? `<div class="target"><div>${targetLabel}</div><p>${seen} Look for the gold outline.</p><button class="text-button" id="show-target">Find this piece ↗</button></div>` : ''}
    ${mode === 'exact' ? '' : '<a href="#case-section">See other cases ↓</a>'}</div>
    <div class="tip"><strong>Coach’s tip</strong><p>${tip}</p>${odds ? `<details><summary>How common are the shapes?</summary><p>${odds}</p></details>` : ''}</div>
    ${finished ? `<div class="advance"><p>${resultText}</p></div>` : ''}`;
  $('advance').textContent = `${continueLabel} →`;
  $('show-target')?.addEventListener('click', () => {
    const stickerIndex = inspectCube(run.frames[cursor])[target];
    setCamera(tiles[stickerIndex].face);
    $('viewer').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
  });
}

async function step(direction) {
  const move = direction > 0 ? run.moves[cursor] : inverse(run.moves.slice(cursor - 1, cursor))[0];
  if (!move || busy) return;
  const currentSession = session;
  busy = true;
  animatedMove = move;
  renderPlayer();
  await view?.animate(move, reducedMotion.matches ? 0 : Number($('speed').value));
  if (currentSession !== session) return;
  cursor += direction;
  busy = false;
  animatedMove = undefined;
  renderPlayer();
  if (direction > 0 && !playing && cursor === run.moves.length && !$('advance').hidden && document.activeElement === document.body) {
    $('advance').focus({ preventScroll: true });
  }
}

async function playback() {
  if (playing) {
    playing = false;
    playbackId++;
    renderPlayer();
    return;
  }
  const currentSession = session;
  const currentPlayback = ++playbackId;
  playing = true;
  while (playing && currentSession === session && currentPlayback === playbackId && cursor < run.moves.length) {
    await step(1);
    if (view && !reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 95));
  }
  if (currentSession !== session || currentPlayback !== playbackId) return;
  playing = false;
  renderPlayer();
  if (!$('advance').hidden && document.activeElement === document.body) $('advance').focus({ preventScroll: true });
}

function emptyEditor() {
  const state = Array(54).fill('');
  state[4] = 'yellow';
  state[31] = 'white';
  return state;
}

const directions = {
  F: 'Look straight at your original front. Keep the yellow center above it.',
  R: 'Look straight at the original right. Keep yellow up. The original front is now on your left.',
  B: 'Look straight at the face opposite your original front. Keep yellow up.',
  L: 'Look straight at the original left. Keep yellow up. The original front is now on your right.',
  U: 'Look directly at yellow from above. The edge shared with your original front goes in the bottom row.',
  D: 'Look directly at white from below. The edge shared with your original front goes in the top row.',
};

function renderEditor() {
  const offset = faces.indexOf(editorFace) * 9;
  $('paint-title').textContent = `${editorFace} · ${capital(faceNames[editorFace])} face`;
  $('paint-hint').textContent = directions[editorFace];
  $('editor-faces').replaceChildren(...faceOrder.map(face => {
    const start = faces.indexOf(face) * 9;
    const faceColors = editorStickers.slice(start, start + 9);
    const label = faceColors.every(Boolean) ? `${face} ✓` : face;
    const choice = button(label, 'secondary small', `Enter the ${faceNames[face]} face`);
    choice.setAttribute('aria-pressed', String(face === editorFace));
    choice.addEventListener('click', () => setEditorFace(face));
    return choice;
  }));
  $('palette').replaceChildren(...Object.entries(palette).map(([name, color]) => {
    const choice = button(capital(name), 'color-choice');
    choice.style.setProperty('--color', color);
    choice.setAttribute('aria-pressed', String(selectedColor === name));
    choice.addEventListener('click', () => {
      selectedColor = name;
      renderEditor();
      $('palette').querySelector('[aria-pressed="true"]').focus();
    });
    return choice;
  }));
  $('paint-grid').replaceChildren(...Array.from({ length: 9 }, (_, index) => {
    const color = editorStickers[offset + index];
    const cell = button(index === 4 ? editorFace : '', 'paint-tile');
    cell.style.setProperty('--tile', palette[color] || '#24352e');
    cell.setAttribute('aria-label', `${faceNames[editorFace]} row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${color || 'empty'}`);
    cell.disabled = index === 4 && (editorFace === 'U' || editorFace === 'D');
    cell.addEventListener('click', () => {
      editorStickers[offset + index] = selectedColor;
      $('editor-status').textContent = '';
      renderEditor();
      $('paint-grid').children[index].focus();
    });
    return cell;
  }));
  $('color-count').textContent = `${editorStickers.filter(Boolean).length} of 54 stickers filled · ${capital(selectedColor)}: ${editorStickers.filter(color => color === selectedColor).length}/9`;
  $('next-face').disabled = editorFace === 'D';
}

function setEditorFace(face) {
  editorFace = face;
  $('editor-status').textContent = '';
  renderEditor();
  $('editor-faces').querySelector('[aria-pressed="true"]').focus();
}

function useColors() {
  try {
    if (editorStickers.some(color => !color)) throw new Error('Fill in all six faces first, including the side centers.');
    const colors = Object.fromEntries([...faces].map((face, index) => [face, editorStickers[index * 9 + 4]]));
    if (new Set(Object.values(colors)).size !== 6) throw new Error('Use a different color for each of the six center stickers.');
    const byColor = Object.fromEntries(Object.entries(colors).map(([face, color]) => [color, face]));
    const state = editorStickers.map(color => byColor[color]).join('');
    start(state, { colors, mode: 'exact' });
    $('editor').close();
    $('workbench').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    ($('next-move').disabled ? $('practice') : $('next-move')).focus({ preventScroll: true });
  } catch (error) {
    $('editor-status').textContent = error.message;
  }
}

$('open-notation').addEventListener('click', () => $('notation').showModal());
$('notation-demos').addEventListener('click', event => {
  const move = event.target.closest('[data-turn]')?.dataset.turn;
  if (!move) return;
  $('notation').close();
  start(solved, { mode: 'notation', demoTurns: [move] });
  setCamera(move[0]);
  $('workbench').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  $('next-move').focus({ preventScroll: true });
  step(1);
});
$('practice').addEventListener('click', () => {
  if (run.mode !== 'example') start(firstExample);
  if (run.stage < 0) start(firstExample);
  $('case-section').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  $('cases').querySelector('button')?.focus({ preventScroll: true });
});
$('new-scramble').addEventListener('click', () => {
  const moves = [];
  while (moves.length < 23) {
    const option = generators[0][Math.floor(Math.random() * generators[0].length)].moves[0];
    if (moves.at(-1)?.[0] !== option[0]) moves.push(option);
  }
  start(applyMoves(solved, moves), { mode: 'practice' });
  $('next-move').focus({ preventScroll: true });
});
$('orbit').addEventListener('click', () => setCamera());
$('face-view').addEventListener('click', () => setCamera(run.moves[cursor][0]));
$('canvas').addEventListener('orbit-drag', () => { cameraFace = ''; updateCameraButtons(); });
$('cameras').replaceChildren(...[...'UFRLBD'].map(face => {
  const control = button(face, '', `View the ${faceNames[face]} face`);
  control.setAttribute('aria-label', control.title);
  control.addEventListener('click', () => setCamera(face));
  return control;
}));
$('previous-move').addEventListener('click', () => step(-1));
$('next-move').addEventListener('click', () => step(1));
$('play').addEventListener('click', playback);
$('advance').addEventListener('click', () => {
  start(run.frames.at(-1), { mode: run.mode, colors: run.colors });
  ($('next-move').disabled ? $('practice') : $('next-move')).focus({ preventScroll: true });
});
$('snapshots').addEventListener('toggle', () => { if ($('snapshots').open) renderSnapshots(); });
$('open-editor').addEventListener('click', () => { renderEditor(); $('editor').showModal(); });
$('clear-editor').addEventListener('click', () => {
  editorStickers = emptyEditor();
  setEditorFace('F');
});
$('load-example').addEventListener('click', () => {
  editorStickers = [...examples[3].el].map(face => standard[face]);
  setEditorFace('F');
});
$('next-face').addEventListener('click', () => setEditorFace(faceOrder[faceOrder.indexOf(editorFace) + 1]));
$('solve-input').addEventListener('click', useColors);

start(firstExample);
import('./viewer.mjs').then(({ createViewer }) => {
  view = createViewer($('canvas'));
  view.view(cameraFace);
  $('fallback').hidden = true;
  updateModel();
}).catch(() => {
  $('canvas').hidden = true;
  $('fallback').hidden = false;
  $('drag-hint').textContent = '2D view · choose a face';
  $('orbit').textContent = 'Show all faces';
  updateModel();
});
