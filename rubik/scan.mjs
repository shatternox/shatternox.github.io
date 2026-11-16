// Getting the user's cube into the app: scan each face with the camera, or tap
// the colors in. Camera frames are read only in this page and never uploaded.
import { faces, inspectCube } from './cube.mjs?v=202611161600';
import { palette, standard } from './lessons.mjs?v=202611161600';
import { sfx } from './sfx.mjs?v=202611161600';

export const inputOrder = [...'FRBLUD'];
const capital = word => word[0].toUpperCase() + word.slice(1);
const name = color => capital(color);

// Instructions by color, so they work whether you hold the cube up to a phone
// or turn it toward a laptop camera.
function howToShow(face) {
  const c = standard[face];
  if (face === 'U') return `Show the <b>${c}</b> center, with the <b>${standard.F}</b> side at the bottom edge.`;
  if (face === 'D') return `Show the <b>${c}</b> center, with the <b>${standard.F}</b> side at the top edge.`;
  return `Show the <b>${c}</b> center, with <b>${standard.U}</b> on top.`;
}

// ---------- Color matching ----------
function toLab([r, g, b]) {
  const lin = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
// Typical camera colors, used until the real centers have been seen.
const typical = {
  white: [205, 210, 212], yellow: [215, 205, 60], green: [40, 170, 90],
  blue: [30, 90, 200], red: [190, 35, 45], orange: [235, 110, 40],
};
function distance(a, b) {
  // Weight chroma more than lightness: lighting changes brightness most.
  return 0.45 * (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
function nearest(rgb, references) {
  const lab = toLab(rgb);
  let best;
  for (const [color, ref] of Object.entries(references)) {
    const d = distance(lab, ref);
    if (!best || d < best.d) best = { color, d };
  }
  return best.color;
}
// Assign all 54 samples at once, nine per color, closest matches first.
function assignBalanced(samples, references) {
  const pairs = [];
  samples.forEach((rgb, index) => {
    if (!rgb) return;
    const lab = toLab(rgb);
    for (const [color, ref] of Object.entries(references)) pairs.push({ index, color, d: distance(lab, ref) });
  });
  pairs.sort((a, b) => a.d - b.d);
  const result = Array(54).fill('');
  const left = Object.fromEntries(Object.keys(references).map(color => [color, 9]));
  for (const { index, color } of pairs) {
    if (result[index] || !left[color]) continue;
    result[index] = color;
    left[color]--;
  }
  return result;
}

export function createCubeInput(root, { onDone, onFace, onChange }) {
  let face = 'F';
  let selected = 'white';
  let stickers = Array(54).fill('');
  const samples = Array(54).fill(null);
  for (const f of faces) stickers[faces.indexOf(f) * 9 + 4] = standard[f];
  let stream;
  let video;
  let live = 0;

  root.innerHTML = `
    <div class="input-faces" role="tablist" aria-label="Faces"></div>
    <p class="input-how" aria-live="polite"></p>
    <div class="input-body">
      <div class="camera" hidden>
        <video playsinline muted></video>
        <div class="camera-grid">${'<i></i>'.repeat(9)}</div>
        <p class="camera-note">Fill the grid with one side. Even light, no glare.</p>
      </div>
      <div class="paint">
        <div class="paint-grid">${'<button type="button" class="paint-tile"></button>'.repeat(9)}</div>
      </div>
    </div>
    <div class="input-palette" aria-label="Pick a color, then tap squares"></div>
    <p class="input-status" role="status"></p>
    <div class="input-actions">
      <button type="button" class="button ghost" data-act="camera">📷 Use camera</button>
      <button type="button" class="button primary" data-act="capture" hidden>Capture this side</button>
      <button type="button" class="button primary" data-act="next">Next side →</button>
    </div>`;
  const $ = selector => root.querySelector(selector);
  const tiles = [...root.querySelectorAll('.paint-tile')];
  const liveCells = [...root.querySelectorAll('.camera-grid i')];

  tiles.forEach((tile, i) => tile.addEventListener('click', () => {
    stickers[faces.indexOf(face) * 9 + i] = selected;
    sfx.tick();
    render();
  }));
  $('[data-act="camera"]').addEventListener('click', () => (stream ? stopCamera() : startCamera()));
  $('[data-act="capture"]').addEventListener('click', capture);
  $('[data-act="next"]').addEventListener('click', next);

  function count(color) { return stickers.filter(value => value === color).length; }
  function faceDone(f) { const start = faces.indexOf(f) * 9; return stickers.slice(start, start + 9).every(Boolean); }

  function render() {
    $('.input-faces').replaceChildren(...inputOrder.map(f => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'face-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(f === face));
      tab.innerHTML = `<i style="--c:${palette[standard[f]]}"></i>${faceDone(f) ? '✓' : ''}`;
      tab.title = `${name(standard[f])} side`;
      tab.addEventListener('click', () => setFace(f));
      return tab;
    }));
    $('.input-how').innerHTML = howToShow(face);
    const offset = faces.indexOf(face) * 9;
    tiles.forEach((tile, i) => {
      const color = stickers[offset + i];
      tile.style.setProperty('--tile', color ? palette[color] : 'transparent');
      tile.classList.toggle('empty', !color);
      tile.setAttribute('aria-label', `Row ${Math.floor(i / 3) + 1}, column ${i % 3 + 1}: ${color || 'empty'}`);
    });
    $('.input-palette').replaceChildren(...Object.entries(palette).map(([color, hex]) => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'swatch-button';
      choice.style.setProperty('--c', hex);
      choice.setAttribute('aria-pressed', String(color === selected));
      const n = count(color);
      choice.innerHTML = `<span>${name(color)}</span><small class="${n > 9 ? 'over' : ''}">${n}/9</small>`;
      choice.addEventListener('click', () => { selected = color; render(); });
      return choice;
    }));
    const all = inputOrder.every(faceDone);
    $('[data-act="next"]').textContent = all ? 'Done, solve my cube →' : 'Next side →';
    onChange?.(stickers);
  }

  function setFace(f) {
    face = f;
    $('.input-status').textContent = '';
    render();
    onFace?.(f);
  }

  function next() {
    const missing = inputOrder.find(f => !faceDone(f));
    if (!faceDone(face)) {
      $('.input-status').textContent = 'Fill all 9 squares of this side first.';
      sfx.wrong();
      return;
    }
    if (missing) {
      const after = inputOrder.slice(inputOrder.indexOf(face) + 1).concat(inputOrder);
      setFace(after.find(f => !faceDone(f)));
      sfx.tick();
      return;
    }
    finish();
  }

  function finish() {
    try {
      const colors = Object.fromEntries([...faces].map((f, i) => [f, stickers[i * 9 + 4]]));
      if (new Set(Object.values(colors)).size !== 6) throw new Error('Each side’s center needs a different color.');
      const over = Object.keys(palette).find(color => count(color) !== 9);
      if (over) throw new Error(`Every color appears exactly 9 times. ${name(over)} has ${count(over)}. Check the sides marked in the counter.`);
      const byColor = Object.fromEntries(Object.entries(colors).map(([f, color]) => [color, f]));
      const state = stickers.map(color => byColor[color]).join('');
      inspectCube(state);
      stopCamera();
      onDone(state, colors);
    } catch (error) {
      $('.input-status').textContent = `${error.message} Tip: a side is easy to enter turned or mirrored. Recheck it while holding the cube as described.`;
      sfx.wrong();
    }
  }

  // ---------- Camera ----------
  async function startCamera() {
    $('.input-status').textContent = '';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 960 } }, audio: false,
      });
    } catch {
      stream = undefined;
      $('.input-status').textContent = 'The camera isn’t available. You can tap the colors in instead.';
      return;
    }
    video = $('video');
    video.srcObject = stream;
    await video.play().catch(() => {});
    $('.camera').hidden = false;
    $('[data-act="capture"]').hidden = false;
    $('[data-act="camera"]').textContent = 'Stop camera';
    root.classList.add('scanning');
    const loop = () => {
      if (!stream) return;
      const read = readGrid();
      if (read) read.forEach((rgb, i) => { liveCells[i].style.background = palette[nearest(rgb, references())] + '88'; });
      live = setTimeout(() => requestAnimationFrame(loop), 180);
    };
    loop();
  }

  function stopCamera() {
    clearTimeout(live);
    stream?.getTracks().forEach(track => track.stop());
    stream = undefined;
    $('.camera').hidden = true;
    $('[data-act="capture"]').hidden = true;
    $('[data-act="camera"]').textContent = '📷 Use camera';
    root.classList.remove('scanning');
  }

  const canvas = document.createElement('canvas');
  function readGrid() {
    if (!video?.videoWidth) return undefined;
    const size = Math.min(video.videoWidth, video.videoHeight) * 0.78;
    const x0 = (video.videoWidth - size) / 2;
    const y0 = (video.videoHeight - size) / 2;
    canvas.width = canvas.height = 96;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(video, x0, y0, size, size, 0, 0, 96, 96);
    const data = g.getImageData(0, 0, 96, 96).data;
    const cells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = [0, 0, 0];
        let n = 0;
        for (let y = r * 32 + 10; y < r * 32 + 22; y++) {
          for (let x = c * 32 + 10; x < c * 32 + 22; x++) {
            const i = (y * 96 + x) * 4;
            sum = [sum[0] + data[i], sum[1] + data[i + 1], sum[2] + data[i + 2]];
            n++;
          }
        }
        cells.push(sum.map(v => v / n));
      }
    }
    return cells;
  }

  // Centers seen so far are the best reference for their color.
  function references() {
    const refs = Object.fromEntries(Object.entries(typical).map(([color, rgb]) => [color, toLab(rgb)]));
    for (const f of faces) {
      const sample = samples[faces.indexOf(f) * 9 + 4];
      if (sample) refs[standard[f]] = toLab(sample);
    }
    return refs;
  }

  function capture() {
    const read = readGrid();
    if (!read) return;
    sfx.shutter();
    const offset = faces.indexOf(face) * 9;
    read.forEach((rgb, i) => { samples[offset + i] = rgb; });
    const refs = references();
    if (samples.every(Boolean)) {
      stickers = assignBalanced(samples, refs);
    } else {
      read.forEach((rgb, i) => { stickers[offset + i] = i === 4 ? standard[face] : nearest(rgb, refs); });
    }
    const nextFace = inputOrder.find(f => !faceDone(f));
    if (nextFace) setFace(nextFace);
    else {
      setFace(face);
      $('.input-status').textContent = 'All six sides scanned. Check each side and tap any square that looks wrong.';
      stopCamera();
    }
  }

  render();
  onFace?.(face);
  return {
    stop: stopCamera,
    useCamera: startCamera,
    fill(colors) { stickers = [...colors]; render(); },
    get stickers() { return stickers; },
    get face() { return face; },
  };
}
