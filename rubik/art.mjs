// Small SVG drawings: move icons, case thumbnails.
import { faces } from './cube.mjs';
import { toAbsolute } from './method.mjs';

const GREY = '#4a554f';

// ---------- Move icons: the front face, the moving layer, and its direction ----------
const arrowHead = (x, y, angle) => {
  const r = angle * Math.PI / 180;
  const p = (dx, dy) => `${x + dx * Math.cos(r) - dy * Math.sin(r)},${y + dx * Math.sin(r) + dy * Math.cos(r)}`;
  return `<path d="M${p(0, 0)} L${p(-7, -5)} L${p(-7, 5)} Z" fill="currentColor"/>`;
};
function straight(x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return `<path d="M${x1},${y1} L${x2},${y2}" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>${arrowHead(x2, y2, angle)}`;
}
function circular(clockwise, dashed) {
  // Three-quarter circle with a head at the end.
  const r = 13, c = 24;
  const start = clockwise ? -150 : -30;
  const end = clockwise ? 120 : -300;
  const pt = a => [c + r * Math.cos(a * Math.PI / 180), c + r * Math.sin(a * Math.PI / 180)];
  const [x1, y1] = pt(start), [x2, y2] = pt(end);
  const tangent = end + (clockwise ? 90 : -90);
  return `<path d="M${x1},${y1} A${r},${r} 0 1 ${clockwise ? 1 : 0} ${x2},${y2}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" ${dashed ? 'stroke-dasharray="3 4"' : ''}/>${arrowHead(x2, y2, tangent)}`;
}

export function moveIcon(move) {
  const face = move[0];
  const prime = move.endsWith("'");
  const double = move.endsWith('2');
  const cells = [];
  const lit = (row, col) => ({ U: row === 0, D: row === 2, R: col === 2, L: col === 0, F: true, B: false, y: true })[face];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push(`<rect x="${6 + col * 12.4}" y="${6 + row * 12.4}" width="11" height="11" rx="2.4" class="${lit(row, col) ? 'lit' : 'dim'}"/>`);
    }
  }
  let arrow;
  if (face === 'U' || face === 'y') arrow = prime ? straight(10, face === 'y' ? 24 : 12.5, 38, face === 'y' ? 24 : 12.5) : straight(38, face === 'y' ? 24 : 12.5, 10, face === 'y' ? 24 : 12.5);
  if (face === 'D') arrow = prime ? straight(38, 37.3, 10, 37.3) : straight(10, 37.3, 38, 37.3);
  if (face === 'R') arrow = prime ? straight(37.3, 10, 37.3, 38) : straight(37.3, 38, 37.3, 10);
  if (face === 'L') arrow = prime ? straight(12.5, 38, 12.5, 10) : straight(12.5, 10, 12.5, 38);
  if (face === 'F') arrow = circular(!prime, false);
  if (face === 'B') arrow = circular(prime, true);
  if (double && face !== 'F' && face !== 'B') arrow = arrow.replace('<path', '<path class="double"');
  return `<svg class="move-icon move-${face}" viewBox="0 0 48 48" aria-hidden="true"><g class="grid">${cells.join('')}</g><g class="arrow">${arrow}</g>${double ? '<text x="41" y="45" class="times">2</text>' : ''}</svg>`;
}

// Plain-language instruction, including which hand does it.
export function describeMove(move) {
  const twice = move.endsWith('2');
  const prime = move.endsWith("'");
  const text = {
    R: ['Right hand: turn the right side up', 'Right hand: turn the right side down'],
    L: ['Left hand: turn the left side down', 'Left hand: turn the left side up'],
    U: ['Right finger: push the top to the left', 'Left finger: push the top to the right'],
    D: ['Left hand: turn the bottom to the right', 'Right hand: turn the bottom to the left'],
    F: ['Turn the front clockwise, like a wheel to the right', 'Turn the front counterclockwise, like a wheel to the left'],
    B: ['Reach behind: turn the back so its top goes left', 'Reach behind: turn the back so its top goes right'],
    y: ['Spin the whole cube: the right side comes to the front', 'Spin the whole cube: the left side comes to the front'],
  }[move[0]][prime ? 1 : 0];
  if (!twice) return text;
  if (move[0] === 'y') return 'Spin the whole cube half a turn: the back comes to the front';
  return `${text.replace(/, like a wheel to the right/, '')}, twice`;
}

// ---------- Case thumbnails ----------
const color = (palette, colors, state, show, index) => show[index] ? palette[colors[state[index]]] : GREY;
// Index order of the user's top face, given yaw (rotate the U grid clockwise).
function topOrder(yaw) {
  let order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = 0; i < yaw; i++) order = [6, 3, 0, 7, 4, 1, 8, 5, 2].map(k => order[k]);
  return order;
}
const faceStart = face => faces.indexOf(face) * 9;

// Isometric view of the top, front and right faces.
export function isoCube(state, { palette, colors, show, yaw = 0, focus = [] }) {
  const s = 15;
  const ox = 52, oy = 8;
  const top = (r, c) => [ox + (c - r) * s * .866, oy + (c + r) * s * .5];
  const quad = (pts, fill, extra = '') => `<path d="M${pts.map(p => p.join(',')).join(' L')} Z" fill="${fill}" ${extra}/>`;
  const shrink = (pts, k = .13) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4, cy = pts.reduce((a, p) => a + p[1], 0) / 4;
    return pts.map(([x, y]) => [x + (cx - x) * k, y + (cy - y) * k]);
  };
  const out = [];
  const order = topOrder(yaw);
  const F = toAbsolute('F', yaw), R = toAbsolute('R', yaw);
  const mark = index => focus.includes(index) ? 'class="focus"' : '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const index = order[r * 3 + c];
    const pts = [top(r, c), top(r, c + 1), top(r + 1, c + 1), top(r + 1, c)];
    out.push(quad(shrink(pts), color(palette, colors, state, show, index), mark(index)));
  }
  const corner = top(3, 3);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const index = faceStart(F) + r * 3 + c;
    const a = [top(3, 0)[0] + c * s * .866, top(3, 0)[1] + c * s * .5 + r * s];
    const pts = [a, [a[0] + s * .866, a[1] + s * .5], [a[0] + s * .866, a[1] + s * 1.5], [a[0], a[1] + s]];
    out.push(quad(shrink(pts), color(palette, colors, state, show, index), mark(index) + ' opacity=".9"'));
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const index = faceStart(R) + r * 3 + c;
    const a = [corner[0] + c * s * .866, corner[1] - c * s * .5 + r * s];
    const pts = [a, [a[0] + s * .866, a[1] - s * .5], [a[0] + s * .866, a[1] + s * .5], [a[0], a[1] + s]];
    out.push(quad(shrink(pts), color(palette, colors, state, show, index), mark(index) + ' opacity=".78"'));
  }
  return `<svg class="iso" viewBox="0 0 104 112" aria-hidden="true">${out.join('')}</svg>`;
}

// Top view with the top row of each side around it — how the last layer is read.
export function topView(state, { palette, colors, show, yaw = 0 }) {
  const cell = 16, gap = 2, off = 13;
  const out = [];
  const order = topOrder(yaw);
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${fill}"/>`;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    out.push(rect(off + c * (cell + gap), off + r * (cell + gap), cell, cell, color(palette, colors, state, show, order[r * 3 + c])));
  }
  const strip = (face, place) => {
    const abs = toAbsolute(face, yaw);
    for (let i = 0; i < 3; i++) {
      const index = faceStart(abs) + i;
      const fill = color(palette, colors, state, show, index);
      const along = off + i * (cell + gap);
      const rev = off + (2 - i) * (cell + gap);
      if (place === 'F') out.push(rect(along, off + 3 * (cell + gap), cell, 8, fill));
      if (place === 'B') out.push(rect(rev, off - 10, cell, 8, fill));
      if (place === 'L') out.push(rect(off - 10, along, 8, cell, fill));
      if (place === 'R') out.push(rect(off + 3 * (cell + gap), rev, 8, cell, fill));
    }
  };
  for (const face of 'FRBL') strip(face, face);
  return `<svg class="topview" viewBox="0 0 80 80" aria-hidden="true">${out.join('')}</svg>`;
}

// Flat net used when WebGL is unavailable.
export function net(state, { palette, colors, show }) {
  const face = f => `<div class="net-face net-${f}">${Array.from({ length: 9 }, (_, i) =>
    `<i style="background:${color(palette, colors, state, show, faceStart(f) + i)}"></i>`).join('')}</div>`;
  return `<div class="net">${[...'ULFRBD'].map(face).join('')}</div>`;
}
