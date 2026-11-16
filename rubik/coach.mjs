// The coach: takes someone who has never solved a cube from "pick it up" to
// solved, one move at a time, on their own cube.
import { solved, applyMoves, showMove, inverse } from './cube.mjs?v=202611161745';
import { planNext, play, currentStage, ALGS } from './method.mjs?v=202611161745';
import { standard, lessons, algNames } from './lessons.mjs?v=202611161745';
import { moveIcon, describeMove } from './art.mjs?v=202611161745';
import { createCubeInput } from './scan.mjs?v=202611161745';
import { sfx } from './sfx.mjs?v=202611161745';
import { getMethod } from './methods.mjs?v=202611161745';
import { thumb, goalThumb, movesText } from './map.mjs?v=202611161745';

const keyFor = id => (id === 'beginner' ? 'rubik-coach-v1' : `rubik-coach-v1-${id}`);
const introMoves = ['R', "R'", 'U', "U'"];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const chip = (move, state = '') => `<span class="chip ${state}">${moveIcon(move)}<span>${showMove(move)}</span></span>`;

export function createCoach(root, cube, methodId = 'beginner') {
  let method = getMethod(methodId);
  const fresh = () => (method.id === 'beginner' ? { phase: 'intro', step: 0 } : { phase: 'stage', stage: 0 });
  let s = load() ?? fresh();
  let plan;
  let frames;
  let token = 0;
  let input;

  function load() {
    try { return JSON.parse(localStorage.getItem(keyFor(method.id))); } catch { return undefined; }
  }
  function save() {
    try { localStorage.setItem(keyFor(method.id), JSON.stringify(s)); } catch { /* storage blocked */ }
  }
  function set(next) {
    input?.stop();
    input = undefined;
    s = { ...s, ...next };
    save();
    render();
  }

  // ---------- Formula player ----------
  // Shows a whole formula at once. The 3D cube stays still until you press
  // a button: step forward, step back (undo), play it all, or tap any move.
  let keyHandler;
  document.addEventListener('keydown', event => {
    if (!keyHandler || document.querySelector('dialog[open]') || event.target.closest('input, select, textarea')) return;
    keyHandler(event);
  });

  function formulaHTML(blocks) {
    let offset = 0;
    const groups = [];
    for (const b of blocks) {
      const text = b.moves.map(showMove).join(' ');
      const last = groups.at(-1);
      if (last && last.text === text && b.kind === 'alg') last.count++;
      else groups.push({ text, count: 1 });
    }
    const summary = groups.map(({ text, count }) => (count > 1 ? `(${text}) ×${count}` : text)).join('&ensp;');
    const chips = blocks.map(b => `<span class="block-mini" style="--n:${b.moves.length}"><small>${b.label}</small>${b.moves.map(m =>
      `<button type="button" class="chip" data-i="${offset++}" title="Show this move">${moveIcon(m)}<span>${showMove(m)}</span></button>`).join('')}</span>`).join('');
    return `<div class="formula-line"><code>${summary}</code></div>
      <div class="coach-formula">${chips}</div>`;
  }

  function playerHTML(blocks, total) {
    return `<div class="formula-player" data-player>
      ${formulaHTML(blocks)}
      <div class="player-bar">
        <button type="button" class="button icon" data-first title="Back to the start" aria-label="Back to the start">⏮</button>
        <button type="button" class="button icon" data-prev title="Undo one move (←)" aria-label="Undo one move">←</button>
        <button type="button" class="button play" data-play>▶ Play all</button>
        <button type="button" class="button icon" data-next title="Next move (→)" aria-label="Next move">→</button>
        <span class="player-pos" data-pos></span>
      </div>
      <div class="player-now" data-now></div>
      <p class="player-help">${total > 1 ? 'Tap a move or use ← → to see it on the 3D cube. Nothing moves until you ask.' : 'Press → or ▶ to see it on the 3D cube.'}</p>
    </div>`;
  }

  // frames[i] is the cube before moves[i]; `look(frame)` gives cube.show options.
  function mountPlayer({ frames, moves, look }) {
    const box = root.querySelector('[data-player]');
    const myToken = token;
    const alive = () => myToken === token;
    let pos = 0;
    let busy = false;
    let playing = false;
    const q = sel => box.querySelector(sel);
    function showStill() {
      cube.reset();
      cube.show(frames[pos], { ...look(frames[pos]), move: moves[pos]?.move });
    }
    function draw() {
      box.querySelectorAll('[data-i]').forEach(node => {
        const i = Number(node.dataset.i);
        node.classList.toggle('done', i < pos);
        node.classList.toggle('current', i === pos);
        node.disabled = busy || playing;
      });
      q('[data-pos]').textContent = pos < moves.length ? `Move ${pos + 1} of ${moves.length}` : `All ${moves.length} moves shown`;
      q('[data-first]').disabled = q('[data-prev]').disabled = pos === 0 || busy || playing;
      q('[data-next]').disabled = pos >= moves.length || busy || playing;
      q('[data-play]').innerHTML = playing ? '❚❚ Pause' : pos >= moves.length ? '↻ Play again' : '▶ Play all';
      const now = moves[pos];
      q('[data-now]').innerHTML = now
        ? `${moveIcon(now.move)}<div><strong>${showMove(now.move)}</strong><span>${describeMove(now.move)}</span></div>`
        : '<span class="check">✓</span><div><strong>Done</strong><span>That’s the whole formula. Compare the 3D cube with yours.</span></div>';
    }
    async function step(direction) {
      if (busy || !alive()) return false;
      const forward = direction > 0;
      const entry = moves[forward ? pos : pos - 1];
      if (!entry) return false;
      busy = true;
      draw();
      cube.reset();
      cube.show(frames[pos], look(frames[pos]));
      await cube.animate(forward ? entry.move : inverse([entry.move])[0]);
      if (!alive()) return false;
      pos += direction;
      busy = false;
      if (forward && pos === moves.length) sfx.chime(); else sfx.tick();
      showStill();
      draw();
      return true;
    }
    async function playAll() {
      if (playing) { playing = false; draw(); return; }
      if (pos >= moves.length) { pos = 0; showStill(); }
      playing = true;
      draw();
      while (playing && alive() && pos < moves.length) {
        if (!(await step(1))) break;
        await wait(moves[pos] && moves[pos - 1]?.block !== moves[pos].block ? 380 : 90);
      }
      if (!alive()) return;
      playing = false;
      draw();
    }
    const jump = to => { if (busy || playing) return; pos = to; sfx.tick(); showStill(); draw(); };
    box.querySelectorAll('[data-i]').forEach(node => node.addEventListener('click', () => jump(Number(node.dataset.i))));
    q('[data-first]').addEventListener('click', () => jump(0));
    q('[data-prev]').addEventListener('click', () => step(-1));
    q('[data-next]').addEventListener('click', () => step(1));
    q('[data-play]').addEventListener('click', playAll);
    keyHandler = event => {
      if (!alive()) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    };
    showStill();
    draw();
  }

  // ---------- Rendering ----------
  function card(html) {
    root.innerHTML = `<div class="coach-card">${html}</div>`;
    root.querySelector('.coach-card').animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }
  const on = (selector, handler) => root.querySelector(selector)?.addEventListener('click', handler);

  function render() {
    token++;
    keyHandler = undefined;
    if (s.phase === 'intro') return renderIntro();
    if (s.phase === 'stage') return renderPatternStage();
    if (s.phase === 'look') return renderLook();
    if (s.phase === 'case') return renderCase();
    if (s.phase === 'input') return renderInput();
    if (s.phase === 'solve') return renderSolve();
    if (s.phase === 'solved') return renderSolved();
  }

  // ---------- 1 · Meet your cube ----------
  function renderIntro() {
    const step = s.step;
    const solvedFrame = { state: solved, yaw: 0 };
    const dots = `<div class="intro-dots">${[0, 1, 2, 3, 4].map(i => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</div>`;
    cube.reset();
    if (step === 0) {
      cube.show(solvedFrame, { colors: standard, all: true });
      card(`${dots}
        <div class="eyebrow">Solve my cube · no experience needed</div>
        <h2>Grab your cube.</h2>
        <p class="lead">I’ll walk you through it one move at a time. Watch the cube here, copy it on yours, then press one button when you’ve done the moves. About 20–30 minutes the first time.</p>
        <div class="coach-actions"><button class="button primary big" data-go>Let’s go →</button></div>
        <button class="link" data-virtual>No cube with you? Practice on a virtual one</button>`);
      on('[data-go]', () => { sfx.tick(); set({ step: 1 }); });
      on('[data-virtual]', startVirtual);
      return;
    }
    if (step === 1) {
      cube.show(solvedFrame, { colors: standard, centers: true });
      card(`${dots}
        <div class="eyebrow">Meet your cube</div>
        <h2>Centers never move.</h2>
        <p class="lead">The middle square of each side always stays put. It tells you that side’s color: the side with the <b>yellow center</b> is the yellow side, even while it’s scrambled.</p>
        <div class="coach-actions"><button class="button ghost" data-back>← Back</button><button class="button primary big" data-go>Got it →</button></div>`);
      on('[data-back]', () => { sfx.tick(); set({ step: 0 }); });
      on('[data-go]', () => { sfx.tick(); set({ step: 2 }); });
      return;
    }
    if (step === 2) {
      cube.show(solvedFrame, { colors: standard, all: true });
      card(`${dots}
        <div class="eyebrow">How to hold it</div>
        <h2>Yellow on top, green facing you.</h2>
        <p class="lead">Find the yellow center and put it on top. Then turn the cube until the <b>green center</b> faces you. White is now underneath.</p>
        <p class="note">Keep holding it like this. If you ever need to turn the whole cube, I’ll say so.</p>
        <div class="coach-actions"><button class="button ghost" data-back>← Back</button><button class="button primary big" data-go>I’m holding it →</button></div>`);
      on('[data-back]', () => { sfx.tick(); set({ step: 1 }); });
      on('[data-go]', () => { sfx.tick(); set({ step: 3 }); });
      return;
    }
    if (step === 3) {
      const blocks = [{ kind: 'move', label: 'Right side, then undo it', moves: introMoves.slice(0, 2) }, { kind: 'move', label: 'Top, then undo it', moves: introMoves.slice(2) }];
      const { moves, frames } = framesFor({ state: solved, yaw: 0 }, blocks);
      card(`${dots}
        <div class="eyebrow">Your first moves</div>
        <h2>Try these 4 moves.</h2>
        <p class="lead">Each letter is one side turned a quarter. <b>′</b> means the other way, so every second move undoes the one before it. Your cube ends up back where it started.</p>
        ${playerHTML(blocks, moves.length)}
        <div class="coach-actions"><button class="button ghost" data-back>← Back</button><button class="button primary big" data-done>I did them →</button></div>`);
      mountPlayer({ frames, moves, look: () => ({ colors: standard, all: true }) });
      on('[data-back]', () => { sfx.tick(); set({ step: 2 }); });
      on('[data-done]', () => { sfx.correct(); set({ step: 4 }); });
      return;
    }
    cube.show(solvedFrame, { colors: standard, all: true });
    card(`${dots}
      <div class="eyebrow">Reading moves</div>
      <h2>Letters are just sides.</h2>
      <div class="letter-grid">
        ${['R right', 'L left', 'U top', 'D bottom', 'F front', 'B back'].map(t => `<span><b>${t[0]}</b>${t.slice(2)}</span>`).join('')}
      </div>
      <p class="lead"><b>′</b> means the other way. <b>2</b> means twice. You don’t need to memorize this: every move comes with an arrow and the hand that does it.</p>
      <div class="coach-actions"><button class="button ghost" data-back>← Back</button><button class="button primary big" data-go>Start step 1 →</button></div>
      <p class="note">From here on, I show you every pattern you might see. You pick the one that looks like your cube, and I show the moves.</p>
      <button class="link" data-scan>Prefer exact moves for your cube? Scan it instead</button>`);
    on('[data-back]', () => { sfx.tick(); set({ step: 3 }); });
    on('[data-go]', () => { sfx.tick(); set({ phase: 'stage', stage: 0, startedAt: Date.now() }); });
    on('[data-scan]', () => { sfx.tick(); set({ phase: 'input' }); });
  }

  function framesFor(start, blocks) {
    const moves = blocks.flatMap((block, index) => block.moves.map(move => ({ move, block: index })));
    const frames = [start];
    for (const { move } of moves) frames.push(play(frames.at(-1).state, frames.at(-1).yaw, [move]));
    return { moves, frames };
  }

  function startVirtual() {
    const options = [...'URFDLB'].flatMap(face => [face, face + "'", face + '2']);
    const moves = [];
    while (moves.length < 22) {
      const option = options[Math.floor(Math.random() * options.length)];
      if (moves.at(-1)?.[0] !== option[0]) moves.push(option);
    }
    sfx.tick();
    beginSolve(applyMoves(solved, moves), standard, true);
  }

  // ---------- 2 · Pattern path: look, pick, follow, look again ----------
  const steps = () => method.steps;
  // Every step is a button: jump back (or ahead) to any step at any time.
  const stepBar = stage => `<nav class="progress steps-bar" style="--n:${steps().length}" aria-label="Steps">${steps().map((step, i) =>
    `<button type="button" class="${i < stage ? 'done' : i === stage ? 'now' : ''}" data-goto="${i}" title="Step ${i + 1}: ${step.name}" aria-label="Go to step ${i + 1}: ${step.name}"${i === stage ? ' aria-current="step"' : ''}><i></i></button>`).join('')}</nav>`;
  function wireStepBar() {
    root.querySelectorAll('[data-goto]').forEach(node => node.addEventListener('click', () => {
      sfx.tick();
      set({ phase: 'stage', stage: Number(node.dataset.goto), won: undefined, rounds: 0, path: [] });
    }));
  }
  const findCase = (stage, key) => steps()[stage].cases.find(c => c.key === key);

  function renderPatternStage() {
    const stage = s.stage;
    const step = steps()[stage];
    cube.reset();
    cube.show({ state: step.goal, yaw: 0 }, { colors: standard, mask: step.mask(step.goal), hold: 'The goal of this step (not your cube)' });
    const memo = step.memo?.length ? step.memo : step.cases.length <= 7 ? step.cases.map(c => ({ name: c.label, moves: c.blocks.flatMap(b => b.moves) })) : [];
    card(`
      ${stepBar(stage)}
      ${s.won !== undefined ? `<p class="win">✓ ${steps()[s.won].name} done!</p>` : ''}
      <div class="eyebrow">${method.name} · step ${stage + 1} of ${steps().length}</div>
      <h2>${step.name}</h2>
      <p class="lead"><b>Goal:</b> ${step.summary} The 3D cube shows it.</p>
      <ol class="how">${step.how.map(line => `<li><span>${line}</span></li>`).join('')}</ol>
      ${memo.length ? `<div class="memo"><small>You’ll use</small>${memo.map(m => `<div><b>${m.name}</b> ${m.moves.map(x => chip(x)).join('')}</div>`).join('')}</div>`
        : `<p class="note">${step.cases.length} cases, each with a picture. You don’t need to memorize them first: pick the one you see and copy the moves. They stick with practice.</p>`}
      <div class="coach-actions">${stage ? '<button class="button ghost" data-prev-step>← Step ' + stage + '</button>' : ''}<button class="button primary big" data-go>Look at my cube →</button></div>
      <button class="link" data-map>See this step on the map</button>`);
    wireStepBar();
    on('[data-prev-step]', () => { sfx.tick(); set({ phase: 'stage', stage: stage - 1, won: undefined, rounds: 0, path: [] }); });
    on('[data-go]', () => { sfx.tick(); set({ phase: 'look', won: undefined, path: [] }); });
    on('[data-map]', () => root.dispatchEvent(new CustomEvent('open-map', { bubbles: true })));
  }

  // Cases at this point in the recognition tree, and the groups below it.
  function narrow(step, path) {
    const cases = step.cases.filter(c => path.every((g, i) => c.group?.[i] === g));
    const labels = [...new Set(cases.map(c => c.group?.[path.length]).filter(Boolean))];
    return { cases, labels };
  }

  function renderLook() {
    const stage = s.stage;
    const step = steps()[stage];
    let path = s.path ?? [];
    let view = narrow(step, path);
    // Skip levels with only one choice, and small sets that fit on screen.
    while (view.labels.length === 1) { path = [...path, view.labels[0]]; view = narrow(step, path); }
    const showGroups = view.labels.length > 1 && view.cases.length > 8;
    cube.reset();
    cube.show({ state: step.goal, yaw: 0 }, { colors: standard, mask: step.mask(step.goal), hold: 'The goal of this step (not your cube)' });
    const crumbs = path.length ? `<div class="crumbs"><button class="crumb" data-path="0">All</button>${path.map((p, i) => ` › <button class="crumb" data-path="${i + 1}">${p}</button>`).join('')}</div>` : '';
    const options = showGroups
      ? view.labels.map(label => {
        const inGroup = view.cases.filter(c => c.group[path.length] === label);
        return `<button class="pick-case pick-group" data-group="${label}"><span class="art">${thumb(method, stage, inGroup[0])}</span><span class="pick-name">${label}</span><small>${inGroup.length} case${inGroup.length === 1 ? '' : 's'} →</small></button>`;
      }).join('')
      : view.cases.map(c => `<button class="pick-case" data-key="${c.key}"><span class="art">${thumb(method, stage, c)}</span><span class="pick-name">${c.label}</span><code>${movesText(c)}</code></button>`).join('');
    card(`
      ${stepBar(stage)}
      <div class="eyebrow">${method.name} · step ${stage + 1} · ${step.name}${s.rounds ? ` · round ${s.rounds + 1}` : ''}</div>
      <h2>${showGroups ? 'What do you see?' : 'Which one looks like yours?'}</h2>
      <p class="look"><span>👀 Look</span>${step.look}</p>
      ${crumbs}
      <div class="pick">
        ${options}
        ${path.length ? '' : `<button class="pick-case pick-done" data-done-step><span class="art">${goalThumb(method, stage)}</span><span class="pick-name">✓ None left</span><small>${step.done}</small></button>`}
      </div>
      <p class="note">Grey squares don’t matter for this step.${step.art === 'iso' ? ' The gold outline marks the pieces to look for.' : ' The bottom edge of each picture is the side facing you.'} The colors in the pictures are just an example: match the pattern, not the exact colors.</p>
      <button class="link" data-overview>← Back to the step overview</button>`);
    wireStepBar();
    on('[data-overview]', () => { sfx.tick(); set({ phase: 'stage' }); });
    root.querySelectorAll('[data-group]').forEach(node => node.addEventListener('click', () => {
      sfx.tick();
      set({ path: [...path, node.dataset.group] });
    }));
    root.querySelectorAll('[data-path]').forEach(node => node.addEventListener('click', () => {
      sfx.tick();
      set({ path: path.slice(0, Number(node.dataset.path)) });
    }));
    root.querySelectorAll('[data-key]').forEach(node => node.addEventListener('click', () => {
      sfx.tick();
      set({ phase: 'case', key: node.dataset.key, cursor: 0 });
    }));
    on('[data-done-step]', () => {
      if (stage === steps().length - 1) return set({ phase: 'solved' });
      sfx.fanfare(false);
      set({ phase: 'stage', stage: stage + 1, won: stage, rounds: 0, path: [] });
    });
  }

  function renderCase() {
    const stage = s.stage;
    const step = steps()[stage];
    const c = findCase(stage, s.key);
    if (!c) return set({ phase: 'look' });
    const options = { colors: standard, stage: method.id === 'beginner' ? stage : -1, target: c.target, hold: 'Yellow on top · colors are an example' };
    card(`
      ${stepBar(stage)}
      <div class="eyebrow">${method.name} · step ${stage + 1} of ${steps().length} · ${step.name}</div>
      <h2>${c.label}</h2>
      <div class="case-steps">
        <div class="case-step"><span class="case-num">1</span><div><b>Get ready</b><p>${c.hint ?? step.hint ?? ''}</p></div></div>
        <div class="case-step"><span class="case-num">2</span><div><b>Do these ${c.moves.length} moves</b>
          ${playerHTML(c.blocks, c.moves.length)}</div></div>
        <div class="case-step"><span class="case-num">3</span><div><b>Look at your cube again</b><p>Each round fixes one piece or one pattern. Pick the next picture, or “None left” when the step is done.</p></div></div>
      </div>
      <div class="coach-actions"><button class="button ghost" data-back>← Not my case</button><button class="button primary big" data-go>I did these moves →</button></div>`);
    wireStepBar();
    mountPlayer({ frames: c.frames, moves: c.moves, look: frame => ({ ...options, mask: step.mask(frame.state) }) });
    on('[data-go]', () => { sfx.correct(); set({ phase: 'look', rounds: (s.rounds ?? 0) + 1, path: [] }); });
    on('[data-back]', () => { sfx.tick(); set({ phase: 'look' }); });
  }

  // ---------- 3 · Exact path: show us your cube ----------
  function renderInput() {
    card(`
      <div class="eyebrow">Show me your cube</div>
      <h2>Six sides, one at a time.</h2>
      <p class="lead">Use the camera, or tap a color and then the squares. The 3D cube turns to show which side.</p>
      <div class="cube-input"></div>
      <button class="link" data-back>← Back to the intro</button>`);
    on('[data-back]', () => set({ phase: 'intro', step: 4 }));
    const preview = stickers => {
      const colors = Object.fromEntries(Object.entries(standard));
      const byColor = Object.fromEntries(Object.entries(standard).map(([f, c]) => [c, f]));
      const state = stickers.map(color => byColor[color] ?? 'U').join('');
      cube.show({ state, yaw: 0 }, { colors, mask: stickers.map(Boolean) });
    };
    input = createCubeInput(root.querySelector('.cube-input'), {
      onFace: face => cube.look(face),
      onChange: preview,
      onDone: (state, colors) => { cube.reset(); sfx.correct(); beginSolve(state, colors, false); },
    });
    if (s.prefill) input.fill(s.prefill);
  }

  // ---------- 4 · Exact path: follow along ----------
  function beginSolve(state, colors, virtual) {
    set({ phase: 'solve', colors, state, yaw: 0, cursor: 0, virtual, startedAt: s.startedAt ?? Date.now(), prefill: undefined });
  }

  function buildPlan() {
    plan = planNext(s.state, s.yaw);
    frames = [{ state: s.state, yaw: s.yaw }];
    plan.moves = plan.blocks.flatMap((block, index) => block.moves.map(move => ({ move, block: index })));
    for (const { move } of plan.moves) {
      const last = frames.at(-1);
      frames.push(play(last.state, last.yaw, [move]));
    }
  }

  function progressBar(stage) {
    return `<div class="progress" aria-label="Step ${stage + 1} of ${lessons.length}">${lessons.map((lesson, i) =>
      `<i class="${i < stage ? 'done' : i === stage ? 'now' : ''}" title="${lesson.name}"></i>`).join('')}</div>`;
  }

  function renderSolve() {
    buildPlan();
    if (plan.stage < 0) return set({ phase: 'solved' });
    const stage = plan.stage;
    if (s.stageIntro !== stage) return renderStageIntro(stage);
    if (s.cursor >= plan.moves.length) return renderCheckpoint();
    const lesson = lessons[stage];
    const [caseName, caseHint] = lesson.cases[plan.key];
    card(`
      ${progressBar(stage)}
      <div class="eyebrow">Step ${stage + 1} of ${lessons.length} · ${lesson.name}</div>
      <h2>${caseName}</h2>
      <p class="coach-case">${caseHint} These moves are worked out for your exact cube, starting from how you hold it now (see the label above the 3D cube).</p>
      ${playerHTML(plan.blocks, plan.moves.length)}
      <div class="coach-actions"><button class="button ghost" data-lost>My cube looks different</button><button class="button primary big" data-done>I did these moves →</button></div>`);
    mountPlayer({ frames, moves: plan.moves, look: () => ({ colors: s.colors, all: true, stage: plan.stage, target: plan.target }) });
    on('[data-done]', () => { sfx.correct(); set({ cursor: plan.moves.length }); });
    on('[data-lost]', renderLost);
  }

  function renderCheckpoint() {
    const end = frames.at(-1);
    const nextStage = currentStage(end.state);
    cube.reset();
    cube.show(end, { colors: s.colors, all: true });
    sfx.chime();
    const stageDone = nextStage !== plan.stage;
    card(`
      ${progressBar(plan.stage)}
      <div class="eyebrow">${lessons[plan.stage].name}</div>
      <h2>${stageDone ? 'Step done!' : 'Piece done ✓'}</h2>
      <p class="lead">Check your cube against this one. Turn the 3D cube by dragging it if you want to compare another side.</p>
      <div class="coach-actions"><button class="button ghost" data-lost>Mine looks different</button><button class="button primary big" data-go>Looks the same →</button></div>`);
    on('[data-go]', () => {
      sfx.tick();
      set({ state: end.state, yaw: end.yaw, cursor: 0 });
    });
    on('[data-lost]', renderLost);
  }

  function renderLost() {
    token++;
    const now = frames[Math.min(s.cursor, frames.length - 1)];
    card(`
      <div class="eyebrow">No problem</div>
      <h2>Let’s get back on track.</h2>
      <p class="lead">Small slips happen to everyone. Pick one:</p>
      <div class="lost-options">
        <button class="option" data-back><b>I think I made a wrong turn just now</b><span>Go back to the start of this piece and redo it.</span></button>
        <button class="option" data-rescan><b>Re-enter my cube</b><span>Your cube as I expect it is filled in. Just fix the squares that differ.</span></button>
        <button class="option" data-continue><b>Actually it matches</b><span>Continue where you were.</span></button>
      </div>`);
    on('[data-back]', () => set({ cursor: 0 }));
    on('[data-continue]', render);
    on('[data-rescan]', () => {
      const prefill = [...now.state].map(face => s.colors[face]);
      set({ phase: 'input', prefill });
    });
  }

  function renderStageIntro(stage) {
    const lesson = lessons[stage];
    if (s.stageIntro !== undefined) {
      sfx.fanfare(false);
    }
    cube.reset();
    cube.show({ state: s.state, yaw: s.yaw }, { colors: s.colors, all: true });
    const algs = lesson.alg ? [lesson.alg].flat() : [];
    const done = s.stageIntro !== undefined ? `<p class="win">✓ ${lessons[s.stageIntro]?.name ?? 'Previous step'} done!</p>` : '';
    card(`
      ${progressBar(stage)}
      ${done}
      <div class="eyebrow">Step ${stage + 1} of ${lessons.length}</div>
      <h2>${lesson.name}</h2>
      <p class="lead">${lesson.goal}</p>
      <ol class="how">${lesson.how.map(line => `<li><span>${line}</span></li>`).join('')}</ol>
      ${algs.length ? `<div class="memo"><small>You’ll use</small>${algs.map(key => `<div><b>${algNames[key]}</b> ${ALGS[key].map(m => chip(m)).join('')}</div>`).join('')}</div>` : ''}
      <div class="coach-actions"><button class="button primary big" data-go>Start ${lesson.name.toLowerCase()} →</button></div>`);
    on('[data-go]', () => { sfx.tick(); set({ stageIntro: stage, cursor: 0 }); });
  }

  function renderSolved() {
    sfx.fanfare(true);
    cube.reset();
    cube.show({ state: solved, yaw: 0 }, { colors: s.colors ?? standard, all: true });
    const minutes = s.startedAt ? Math.max(1, Math.round((Date.now() - s.startedAt) / 60000)) : undefined;
    card(`
      ${stepBar(steps().length)}
      <div class="eyebrow">Solved</div>
      <h2>You solved it! 🎉</h2>
      <p class="lead">${s.virtual ? 'That was a virtual cube. Try it on a real one next.' : 'Every side is one color.'}${minutes ? ` It took about ${minutes} minute${minutes === 1 ? '' : 's'}.` : ''}</p>
      <div class="coach-actions"><button class="button primary big" data-again>Solve again →</button></div>
      <button class="link" data-learn>Learn the steps so you can do it without me</button>`);
    on('[data-again]', () => {
      try { localStorage.removeItem(keyFor(method.id)); } catch { /* storage blocked */ }
      s = { ...fresh(), phase: 'stage', stage: 0, startedAt: Date.now() };
      save();
      render();
    });
    on('[data-learn]', () => root.dispatchEvent(new CustomEvent('open-learn', { bubbles: true })));
  }

  return {
    render,
    restart() {
      s = fresh();
      save();
      render();
    },
    get resumable() { return s.phase === 'solve'; },
    get position() { return s.stage !== undefined && ['stage', 'look', 'case'].includes(s.phase) ? { stage: s.stage, key: s.phase === 'case' ? s.key : undefined } : undefined; },
    get method() { return method; },
    setMethod(id) {
      token++;
      input?.stop();
      input = undefined;
      method = getMethod(id);
      s = load() ?? fresh();
      render();
    },
    goTo(stage, key) {
      token++;
      input?.stop();
      input = undefined;
      s = { ...s, phase: 'case', stage, key, cursor: 0, startedAt: s.startedAt ?? Date.now() };
      save();
      render();
    },
    stop() { token++; input?.stop(); },
  };
}

