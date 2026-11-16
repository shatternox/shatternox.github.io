// Small synthesized sound effects. No audio files: everything is built with
// WebAudio on demand, after the first user gesture.
let context;
let master;
let muted = false;
try { muted = localStorage.getItem('rubik-muted') === '1'; } catch { /* storage blocked */ }

function audio() {
  if (muted) return undefined;
  if (!context) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return undefined;
    context = new Context();
    master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

let noiseBuffer;
function noise(ctx) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  return source;
}

// A plastic "clack": filtered noise burst with a fast decay.
function click(ctx, at, { freq = 2600, q = 3, gain = 0.5, length = 0.035 } = {}) {
  const source = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.001, at + length);
  source.connect(filter).connect(amp).connect(master);
  source.start(at, Math.random() * 0.4, length + 0.02);
}

function tone(ctx, at, freq, { length = 0.18, gain = 0.18, type = 'sine', attack = 0.006 } = {}) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(amp).connect(master);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

export const sfx = {
  get muted() { return muted; },
  setMuted(value) {
    muted = value;
    try { localStorage.setItem('rubik-muted', value ? '1' : '0'); } catch { /* storage blocked */ }
  },
  // Layer turn: a soft start click and a firmer click as it lands.
  turn(duration = 0.4) {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    click(ctx, now, { freq: 1900 + Math.random() * 500, gain: 0.22, length: 0.03 });
    const land = now + Math.max(0.08, duration * 0.85);
    click(ctx, land, { freq: 2800 + Math.random() * 600, gain: 0.5, length: 0.045 });
    click(ctx, land + 0.012, { freq: 900, q: 1.5, gain: 0.25, length: 0.05 });
  },
  // Whole-cube turn: an airy sweep.
  whoosh(duration = 0.5) {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const source = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + duration * 0.6);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.35, now + duration * 0.4);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(amp).connect(master);
    source.start(now, 0, duration + 0.05);
  },
  tick() {
    const ctx = audio();
    if (!ctx) return;
    tone(ctx, ctx.currentTime, 1320, { length: 0.09, gain: 0.12 });
  },
  correct() {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    tone(ctx, now, 880, { length: 0.1, gain: 0.12 });
    tone(ctx, now + 0.07, 1320, { length: 0.14, gain: 0.12 });
  },
  wrong() {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    tone(ctx, now, 196, { length: 0.12, gain: 0.1, type: 'square' });
    tone(ctx, now + 0.13, 165, { length: 0.16, gain: 0.1, type: 'square' });
  },
  // A piece is in place.
  chime() {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    [1046.5, 1318.5, 1568].forEach((freq, i) => tone(ctx, now + i * 0.075, freq, { length: 0.5, gain: 0.1, type: 'triangle' }));
  },
  // A whole step is done, or the cube is solved.
  fanfare(big = false) {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => tone(ctx, now + i * 0.09, freq, { length: 0.6, gain: 0.11, type: 'triangle' }));
    const chordAt = now + notes.length * 0.09;
    [523.25, 659.25, 783.99, 1046.5].forEach(freq => tone(ctx, chordAt, freq * (big ? 1 : 0.5), { length: big ? 1.6 : 0.9, gain: 0.07, type: 'sine', attack: 0.02 }));
  },
  shutter() {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    click(ctx, now, { freq: 3500, gain: 0.4, length: 0.04 });
    click(ctx, now + 0.07, { freq: 2200, gain: 0.3, length: 0.06 });
  },
};

// Confetti burst in cube colors, drawn on a temporary full-screen canvas.
export function confetti(colors) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ratio = Math.min(2, devicePixelRatio || 1);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  const g = canvas.getContext('2d');
  g.scale(ratio, ratio);
  const bits = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 5,
    size: 6 + Math.random() * 7,
    spin: Math.random() * 6,
    turn: (Math.random() - 0.5) * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const started = performance.now();
  const frame = now => {
    const t = (now - started) / 1000;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const bit of bits) {
      bit.vy += 0.42;
      bit.vx *= 0.99;
      bit.x += bit.vx;
      bit.y += bit.vy;
      bit.spin += bit.turn;
      g.save();
      g.globalAlpha = Math.max(0, 1 - t / 3);
      g.translate(bit.x, bit.y);
      g.rotate(bit.spin);
      g.fillStyle = bit.color;
      g.fillRect(-bit.size / 2, -bit.size / 2, bit.size, bit.size * 0.7);
      g.restore();
    }
    if (t < 3) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
