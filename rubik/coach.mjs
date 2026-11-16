// The coach: takes someone who has never solved a cube from "pick it up" to
// solved, one move at a time, on their own cube.
import { solved, applyMoves, showMove } from './cube.mjs?v=202611160411';
import { planNext, play, currentStage, ALGS } from './method.mjs?v=202611160411';
import { palette, standard, lessons, algNames } from './lessons.mjs?v=202611160411';
import { moveIcon, describeMove } from './art.mjs?v=202611160411';
import { createCubeInput } from './scan.mjs?v=202611160411';
import { sfx, confetti } from './sfx.mjs?v=202611160411';
import { getMethod } from './methods.mjs?v=202611160411';
import { thumb, goalThumb, movesText } from './map.mjs?v=202611160411';

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

  // ---------- Rendering ----------
  function card(html) {
    root.innerHTML = `<div class="coach-card">${html}</div>`;
    root.querySelector('.coach-card').animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }
  const on = (selector, handler) => root.querySelector(selector)?.addEventListener('click', handler);

  function render() {
    token++;
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
        <p class="lead">I’ll walk you through it one move at a time. Watch the cube here, copy it on yours, press <b>Done</b>. About 20–30 minutes the first time.</p>
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
        <div class="coach-actions"><button class="button primary big" data-go>Got it →</button></div>`);
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
        <div class="coach-actions"><button class="button primary big" data-go>I’m holding it →</button></div>`);
      on('[data-go]', () => { sfx.tick(); set({ step: 3, move: 0 }); });
      return;
    }
    if (step === 3) {
      const index = s.move ?? 0;
      const move = introMoves[index];
      const before = { state: applyMoves(solved, introMoves.slice(0, index)), yaw: 0 };
      card(`${dots}
        <div class="eyebrow">Your first moves · ${index + 1} of ${introMoves.length}</div>
        <h2>${index % 2 ? 'Now undo it.' : 'Try this move.'}</h2>
        ${moveCard(move)}
        <p class="note">${index === 0 ? 'Watch the arrow and the glowing hand, then do the same on your cube.' : index === 1 ? 'The ′ mark means the other direction. Your cube is back to normal.' : index === 2 ? 'Your right index finger pushes the top layer to the left.' : 'Left index finger pushes it back. That’s all a move is: one side, a quarter turn.'}</p>
        <div class="coach-actions"><button class="button ghost" data-replay>↻ Show again</button><button class="button primary big" data-done>✓ Done</button></div>`);
      const myToken = token;
      demo(before, move, myToken);
      on('[data-replay]', () => demo(before, move, token));
      on('[data-done]', () => {
        sfx.correct();
        set(index + 1 < introMoves.length ? { move: index + 1 } : { step: 4 });
      });
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
      <div class="coach-actions"><button class="button primary big" data-go>Start step 1 →</button></div>
      <p class="note">From here on, I show you every pattern you might see. You pick the one that looks like your cube, and I show the moves.</p>
      <button class="link" data-scan>Prefer exact moves for your cube? Scan it instead</button>`);
    on('[data-go]', () => { sfx.tick(); set({ phase: 'stage', stage: 0, startedAt: Date.now() }); });
    on('[data-scan]', () => { sfx.tick(); set({ phase: 'input' }); });
  }

  function moveCard(move) {
    return `<div class="coach-move">${moveIcon(move)}<div><strong>${showMove(move)}</strong><span>${describeMove(move)}</span></div></div>`;
  }

  // Show a move: arrow first, then the turn.
  async function demo(before, move, myToken) {
    cube.show(before, { colors: standard, all: true, move });
    await wait(550);
    if (myToken !== token) return;
    await cube.animate(move, before.yaw);
    if (myToken !== token) return;
    cube.show(play(before.state, before.yaw, [move]), { colors: standard, all: true });
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
  const stepBar = stage => `<div class="progress" style="--n:${steps().length}">${steps().map((step, i) =>
    `<i class="${i < stage ? 'done' : i === stage ? 'now' : ''}" title="${step.name}"></i>`).join('')}</div>`;
  const findCase = (stage, key) => steps()[stage].cases.find(c => c.key === key);

  function renderPatternStage() {
    const stage = s.stage;
    const step = steps()[stage];
    cube.reset();
    cube.show({ state: step.goal, yaw: 0 }, { colors: standard, mask: step.mask(step.goal) });
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
      <div class="coach-actions"><button class="button primary big" data-go>Look at my cube →</button></div>
      <button class="link" data-map>See this step on the map</button>`);
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
    cube.show({ state: step.goal, yaw: 0 }, { colors: standard, mask: step.mask(step.goal) });
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
      <p class="note">Grey squares don’t matter for this step.${step.art === 'iso' ? ' The gold outline marks the pieces to look for.' : ' The bottom edge of each picture is the side facing you.'}</p>`);
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
      confetti(Object.values(palette));
      set({ phase: 'stage', stage: stage + 1, won: stage, rounds: 0, path: [] });
    });
  }

  function renderCase() {
    const stage = s.stage;
    const step = steps()[stage];
    const c = findCase(stage, s.key);
    if (!c) return set({ phase: 'look' });
    const options = { colors: standard, mask: step.mask(c.start.state), stage: method.id === 'beginner' ? stage : -1, target: c.target };
    if (s.cursor >= c.moves.length) {
      sfx.chime();
      const end = c.frames.at(-1);
      cube.show(end, { ...options, mask: step.mask(end.state) });
      card(`
        ${stepBar(stage)}
        <div class="eyebrow">${method.name} · step ${stage + 1} · ${step.name}</div>
        <h2>Nice. Look at your cube again.</h2>
        <p class="lead">Each round fixes one thing. Find the next pattern, or tell me the step is done.</p>
        <div class="coach-actions"><button class="button ghost" data-replay>↻ Replay this case</button><button class="button primary big" data-go>Look again →</button></div>`);
      on('[data-go]', () => { sfx.tick(); set({ phase: 'look', rounds: (s.rounds ?? 0) + 1, path: [] }); });
      on('[data-replay]', () => set({ cursor: 0 }));
      return;
    }
    const { move, block } = c.moves[s.cursor];
    let offset = 0;
    const formula = c.blocks.map((b, bi) => `<span class="block-mini ${bi === block ? 'now' : ''}"><small>${b.label}</small>${b.moves.map(m => {
      const i = offset++;
      return chip(m, i < s.cursor ? 'done' : i === s.cursor ? 'current' : '');
    }).join('')}</span>`).join('');
    card(`
      ${stepBar(stage)}
      <div class="eyebrow">${method.name} · step ${stage + 1} · ${step.name} · <button class="crumb" data-back>change case</button></div>
      <p class="coach-case"><b>${c.label}.</b> ${c.hint ?? step.hint ?? ''}</p>
      ${s.cursor === 0 ? '<p class="note">Hold your cube like the 3D one: same pieces in the same spots. Grey squares don’t matter.</p>' : ''}
      ${moveCard(move)}
      <div class="coach-sub">${c.blocks[block].label} · move ${s.cursor + 1} of ${c.moves.length}</div>
      <div class="coach-actions"><button class="button ghost" data-replay>↻ Show again</button><button class="button primary big" data-done>✓ Done</button></div>
      <div class="coach-links"><button class="link" data-undo ${s.cursor ? '' : 'disabled'}>← Back a move</button><button class="link" data-back>Not my case</button></div>
      <div class="coach-formula">${formula}</div>`);
    const myToken = token;
    playCaseMove(c, options, myToken);
    on('[data-replay]', () => playCaseMove(c, options, token));
    on('[data-done]', () => { sfx.tick(); set({ cursor: s.cursor + 1 }); });
    on('[data-undo]', () => set({ cursor: Math.max(0, s.cursor - 1) }));
    root.querySelectorAll('[data-back]').forEach(node => node.addEventListener('click', () => set({ phase: 'look' })));
  }

  async function playCaseMove(c, options, myToken) {
    const before = c.frames[s.cursor];
    const { move } = c.moves[s.cursor];
    const masks = frame => ({ ...options, mask: steps()[s.stage].mask(frame.state) });
    cube.reset();
    cube.show(before, { ...masks(before), move });
    await wait(650);
    if (myToken !== token) return;
    await cube.animate(move);
    if (myToken !== token) return;
    cube.show(c.frames[s.cursor + 1], masks(c.frames[s.cursor + 1]));
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
    const { move, block } = plan.moves[s.cursor];
    const lesson = lessons[stage];
    const [caseName, caseHint] = lesson.cases[plan.key];
    let offset = 0;
    const formula = plan.blocks.map((b, bi) => `<span class="block-mini ${bi === block ? 'now' : ''}"><small>${b.label}</small>${b.moves.map(m => {
      const i = offset++;
      return chip(m, i < s.cursor ? 'done' : i === s.cursor ? 'current' : '');
    }).join('')}</span>`).join('');
    card(`
      ${progressBar(stage)}
      <div class="eyebrow">Step ${stage + 1} of ${lessons.length} · ${lesson.name}</div>
      <p class="coach-case"><b>${caseName}.</b> ${caseHint}</p>
      ${moveCard(move)}
      <div class="coach-sub">${plan.blocks[block].label} · move ${s.cursor + 1} of ${plan.moves.length}</div>
      <div class="coach-actions"><button class="button ghost" data-replay>↻ Show again</button><button class="button primary big" data-done>✓ Done</button></div>
      <div class="coach-links"><button class="link" data-undo ${s.cursor ? '' : 'disabled'}>← Back a move</button><button class="link" data-lost>My cube looks different</button></div>
      <div class="coach-formula">${formula}</div>`);
    const myToken = token;
    playMove(myToken);
    on('[data-replay]', () => playMove(token));
    on('[data-done]', () => {
      sfx.tick();
      set({ cursor: s.cursor + 1 });
    });
    on('[data-undo]', () => set({ cursor: Math.max(0, s.cursor - 1) }));
    on('[data-lost]', renderLost);
  }

  async function playMove(myToken) {
    const before = frames[s.cursor];
    const { move } = plan.moves[s.cursor];
    const options = { colors: s.colors, all: true, stage: plan.stage, target: plan.blocks[plan.moves[s.cursor].block].target ?? plan.target };
    cube.reset();
    cube.show(before, { ...options, move });
    await wait(650);
    if (myToken !== token) return;
    await cube.animate(move, before.yaw);
    if (myToken !== token) return;
    cube.show(frames[s.cursor + 1], options);
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
      confetti(Object.values(palette));
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
    confetti(Object.values(palette));
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
      try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
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

