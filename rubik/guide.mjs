// Face labels drawn over the 3D cube.
// Everything is in the solver's frame: +z is the side facing you.

const LABELS = [
  { face: 'F', text: 'FRONT', anchor: [0, -1.5, 1.5], normal: [0, 0, 1], shift: [0, 20] },
  { face: 'U', text: 'TOP', anchor: [0, 1.5, -1.5], normal: [0, 1, 0], shift: [0, -16] },
  { face: 'R', text: 'RIGHT', anchor: [1.5, -1.5, 0], normal: [1, 0, 0], shift: [26, 10] },
  { face: 'L', text: 'LEFT', anchor: [-1.5, -1.5, 0], normal: [-1, 0, 0], shift: [-26, 10] },
  { face: 'B', text: 'BACK', anchor: [0, 1.5, -1.5], normal: [0, 0, -1], shift: [0, -16] },
  { face: 'D', text: 'BOTTOM', anchor: [0, -1.5, 0], normal: [0, -1, 0], shift: [0, 20] },
];

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
  container.append(layer);

  let view;
  let move;

  function place() {
    if (!view) return;
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
  }

  return {
    attach(viewer) {
      view = viewer;
      container.addEventListener('cube-draw', place);
      place();
    },
    setMove(next) { move = next; place(); },
  };
}
