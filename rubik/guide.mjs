// Face labels and see-through "ghost" hands drawn over the 3D cube.
// Everything is in the solver's frame: +z is the side facing you.

const LABELS = [
  { face: 'F', text: 'FRONT', anchor: [0, -1.5, 1.5], normal: [0, 0, 1], shift: [0, 20] },
  { face: 'U', text: 'TOP', anchor: [0, 1.5, -1.5], normal: [0, 1, 0], shift: [0, -16] },
  { face: 'R', text: 'RIGHT', anchor: [1.5, -1.5, 0], normal: [1, 0, 0], shift: [26, 10] },
  { face: 'L', text: 'LEFT', anchor: [-1.5, -1.5, 0], normal: [-1, 0, 0], shift: [-26, 10] },
  { face: 'B', text: 'BACK', anchor: [0, 1.5, -1.5], normal: [0, 0, -1], shift: [0, -16] },
  { face: 'D', text: 'BOTTOM', anchor: [0, -1.5, 0], normal: [0, -1, 0], shift: [0, 20] },
];

// A right hand holding the right side: palm on the side, index finger over
// the top, thumb on the front. The left hand is the mirror image.
const HAND = 'M58 30 L22 37 Q7 40 10 53 Q13 62 27 60 L55 56 L55 118 Q57 136 74 138 L91 138 Q100 122 98 96 L98 32 Q98 10 79 8 L45 6 Q33 6 33 16 Q33 25 45 25 Z';
const PALM = [78, 76];
const BOX = [104, 144];

const who = move => {
  const face = move[0];
  if (face === 'y') return 'both';
  if (face === 'U') return move === "U'" ? 'left' : 'right';
  if (face === 'D') return move === "D'" ? 'right' : 'left';
  return face === 'L' ? 'left' : 'right';
};
const push = {
  R: [0, 1, 0], L: [0, -1, 0], U: [-1, 0, 0], D: [1, 0, 0], F: [0, -1, 0], B: [0, 1, 0], y: [-1, 0, 0],
};
function motionVector(move) {
  const k = move.endsWith("'") ? -1 : move.endsWith('2') ? 1.5 : 1;
  return push[move[0]].map(v => v * k);
}

export function createGuide(container) {
  const layer = document.createElement('div');
  layer.className = 'guide';
  layer.setAttribute('aria-hidden', 'true');
  const labels = LABELS.map(label => {
    const node = document.createElement('span');
    node.className = `face-label face-${label.face}`;
    node.innerHTML = `${label.text} <b>${label.face}</b>`;
    layer.append(node);
    return node;
  });
  const hands = ['left', 'right'].map(side => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', `0 0 ${BOX[0]} ${BOX[1]}`);
    node.classList.add('hand', `hand-${side}`);
    node.innerHTML = `<g${side === 'left' ? ` transform="translate(${BOX[0]} 0) scale(-1 1)"` : ''}><path d="${HAND}"/><path class="knuckle" d="M45 25 L58 30 M55 56 L58 30"/></g>`;
    layer.append(node);
    return node;
  });
  container.append(layer);

  let view;
  let move;
  let showHands = true;

  function place() {
    if (!view) return;
    const origin = view.project(0, 0, 0);
    const unit = Math.abs(view.project(0, 1, 0).y - origin.y);
    LABELS.forEach((label, index) => {
      const node = labels[index];
      const facing = view.facing(...label.normal);
      const always = label.face === 'L' || label.face === 'R';
      node.hidden = facing < (always ? -0.45 : 0.25);
      if (label.face === 'B' && facing > 0.25) labels[1].hidden = true;
      const point = view.project(...label.anchor);
      node.style.transform = `translate(${point.x + label.shift[0]}px, ${point.y + label.shift[1]}px) translate(-50%, -50%)`;
      node.classList.toggle('turning', !!move && move[0] === label.face);
    });
    const active = move ? who(move) : '';
    const t = view.motion ?? 0;
    const scale = unit * 2.45 / BOX[1];
    hands.forEach((node, index) => {
      const side = index ? 'right' : 'left';
      const anchor = [side === 'right' ? 1.62 : -1.62, -0.3, 0.25];
      const moving = active === side || active === 'both';
      let dx = 0;
      let dy = 0;
      if (moving && t) {
        const v = motionVector(move);
        const to = view.project(...anchor.map((value, axis) => value + v[axis] * .7 * t));
        const from = view.project(...anchor);
        dx = to.x - from.x;
        dy = to.y - from.y;
      }
      const point = view.project(...anchor);
      const palmX = side === 'right' ? PALM[0] : BOX[0] - PALM[0];
      node.style.width = `${BOX[0] * scale}px`;
      node.style.height = `${BOX[1] * scale}px`;
      node.style.transform = `translate(${point.x - palmX * scale + dx}px, ${point.y - PALM[1] * scale + dy}px)`;
      node.classList.toggle('active', moving);
      node.hidden = !showHands;
    });
  }

  return {
    attach(viewer) {
      view = viewer;
      container.addEventListener('cube-draw', place);
      place();
    },
    setMove(next) { move = next; place(); },
    setHands(on) { showHands = on; place(); },
  };
}
