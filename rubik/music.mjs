// Calm background music, generated live with WebAudio: soft electric-piano
// chords, a round bass, a few plucked notes and a quiet brushed beat.
// Original and procedural, so there are no audio files or licenses involved.
let context;
let out;
let timer = 0;
let nextBar = 0;
let bar = 0;
let playing = false;
const BPM = 74;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// Fmaj9 → Em7 → Dm9 → Cmaj7 (as MIDI notes), with a bass root for each.
const CHORDS = [
  { bass: 41, notes: [57, 60, 64, 67] },
  { bass: 40, notes: [55, 59, 62, 67] },
  { bass: 38, notes: [53, 57, 60, 64] },
  { bass: 36, notes: [55, 59, 64, 67] },
];
const hz = note => 440 * 2 ** ((note - 69) / 12);

function setup() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return false;
  context = new Context();
  out = context.createGain();
  out.gain.value = 0;
  // Warm the whole mix and add a little space.
  const tone = context.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2400;
  const delay = context.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = context.createGain();
  feedback.gain.value = 0.28;
  const wet = context.createGain();
  wet.gain.value = 0.22;
  out.connect(tone);
  tone.connect(context.destination);
  tone.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(context.destination);
  return true;
}

function note(freq, at, length, { type = 'sine', gain = 0.05, attack = 0.01, detune = 0, cutoff } = {}) {
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const amp = context.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  if (cutoff) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    osc.connect(filter).connect(amp);
  } else {
    osc.connect(amp);
  }
  amp.connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

let noise;
function brush(at, gain) {
  if (!noise) {
    noise = context.createBuffer(1, context.sampleRate * 0.3, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const amp = context.createGain();
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  source.connect(filter).connect(amp).connect(out);
  source.start(at, 0, 0.12);
}

function kick(at) {
  const osc = context.createOscillator();
  osc.frequency.setValueAtTime(110, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.18);
  const amp = context.createGain();
  amp.gain.setValueAtTime(0.18, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + 0.32);
}

function scheduleBar(at) {
  const chord = CHORDS[bar % CHORDS.length];
  // Electric-piano pad: two slightly detuned voices per note, slow swell.
  chord.notes.forEach((n, i) => {
    for (const detune of [-6, 6]) note(hz(n), at + i * 0.018, BAR * 0.98, { type: 'triangle', gain: 0.022, attack: 0.25, detune, cutoff: 1500 });
  });
  // Bass on beats 1 and 3, a passing note before the next chord.
  note(hz(chord.bass), at, BEAT * 1.8, { gain: 0.11, attack: 0.02 });
  note(hz(chord.bass + 7), at + BEAT * 2, BEAT * 1.4, { gain: 0.08, attack: 0.02 });
  // A few plucked melody notes from the chord, a little different every bar.
  const steps = [0, 1.5, 2.5, 3];
  steps.forEach((beat, i) => {
    if (Math.random() < 0.35 && i > 0) return;
    const pitch = chord.notes[(bar + i * 2) % chord.notes.length] + 12;
    note(hz(pitch), at + beat * BEAT + (Math.random() - 0.5) * 0.02, BEAT * 1.2, { type: 'sine', gain: 0.035, attack: 0.005 });
  });
  // Lazy beat with a little swing.
  for (let b = 0; b < 4; b++) {
    if (b === 0 || b === 2) kick(at + b * BEAT);
    brush(at + b * BEAT + BEAT * 0.5 + 0.03, 0.03);
    if (b === 1 || b === 3) brush(at + b * BEAT, 0.05);
  }
  bar++;
}

function tick() {
  while (nextBar < context.currentTime + 1.2) {
    scheduleBar(nextBar);
    nextBar += BAR;
  }
}

function remember(on) {
  try { localStorage.setItem('rubik-music', on ? '1' : '0'); } catch { /* storage blocked */ }
}

export const music = {
  get playing() { return playing; },
  get wanted() { try { return localStorage.getItem('rubik-music') === '1'; } catch { return false; } },
  start() {
    if (playing) return;
    if (!context && !setup()) return;
    context.resume();
    playing = true;
    remember(true);
    nextBar = Math.max(nextBar, context.currentTime + 0.1);
    out.gain.cancelScheduledValues(context.currentTime);
    out.gain.setTargetAtTime(0.9, context.currentTime, 0.8);
    tick();
    timer = setInterval(tick, 400);
  },
  stop() {
    if (!playing) return;
    playing = false;
    remember(false);
    clearInterval(timer);
    out.gain.cancelScheduledValues(context.currentTime);
    out.gain.setTargetAtTime(0, context.currentTime, 0.25);
    setTimeout(() => { if (!playing) context.suspend(); }, 1500);
  },
  toggle() { if (playing) this.stop(); else this.start(); },
};
