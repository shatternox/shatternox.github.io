import * as THREE from '../assets/vendor/three/three.module.min.js';
import { tiles, turnSpec } from './cube.mjs';
import { createHands } from './hands.mjs';
import { palette } from './lessons.mjs';

const vector = array => new THREE.Vector3(...array);
const forward = new THREE.Vector3(0, 0, 1);
const defaultView = new THREE.Vector3(3.6, 4.3, 9.1);

function roundedBox(size, radius) {
  const geometry = new THREE.BoxGeometry(size, size, size, 8, 8, 8);
  const positions = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const half = size / 2 - radius;
  const point = new THREE.Vector3();
  const inner = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    inner.copy(point).clampScalar(-half, half);
    point.sub(inner).normalize();
    normal.setXYZ(i, point.x, point.y, point.z);
    point.multiplyScalar(radius).add(inner);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  return geometry;
}

function roundedSticker() {
  const half = .397;
  const radius = .076;
  const edge = half - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-edge, -half);
  shape.lineTo(edge, -half);
  shape.quadraticCurveTo(half, -half, half, -edge);
  shape.lineTo(half, edge);
  shape.quadraticCurveTo(half, half, edge, half);
  shape.lineTo(-edge, half);
  shape.quadraticCurveTo(-half, half, -half, edge);
  shape.lineTo(-half, -edge);
  shape.quadraticCurveTo(-half, -half, -edge, -half);
  return new THREE.ExtrudeGeometry(shape, {
    depth: .018, bevelThickness: .011, bevelSize: .012, bevelSegments: 2, curveSegments: 5,
  });
}

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  const surface = renderer.domElement;
  surface.setAttribute('aria-label', '3D Rubik’s Cube. Drag to look around it.');
  surface.setAttribute('role', 'img');
  container.append(surface);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 40);
  const model = new THREE.Group();
  scene.add(model, new THREE.HemisphereLight(0xf3fff9, 0x9aa4b0, 1.68));
  const keyLight = new THREE.DirectionalLight(0xfff8ed, 2.08);
  keyLight.position.set(-4, 7, 6);
  const rimLight = new THREE.DirectionalLight(0xc4e9ff, 1.45);
  rimLight.position.set(5, 3, -5);
  scene.add(keyLight, rimLight);
  const bodyShape = roundedBox(.964, .10);
  const stickerShape = roundedSticker();
  const body = new THREE.MeshStandardMaterial({ color: 0x10141b, roughness: .34, metalness: .13 });
  const activeBody = new THREE.MeshStandardMaterial({
    color: 0x263e39, emissive: 0x2ba57c, emissiveIntensity: .27, roughness: .34,
  });
  const focusBody = new THREE.MeshStandardMaterial({
    color: 0x77582c, emissive: 0xce9c3f, emissiveIntensity: .33, roughness: .36,
  });
  const materials = Object.fromEntries(Object.entries(palette).map(([name, color]) => [
    name, new THREE.MeshStandardMaterial({
      color, roughness: .38, metalness: .04, emissive: color, emissiveIntensity: .12,
    }),
  ]));
  const grey = new THREE.MeshStandardMaterial({ color: 0x56605b, roughness: .6, metalness: .02 });
  const cubies = [];
  const stickers = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const position = [x, y, z];
        const group = new THREE.Group();
        group.position.set(x, y, z);
        const plastic = new THREE.Mesh(bodyShape, body);
        group.add(plastic);
        cubies.push({ group, position, plastic });
        model.add(group);
        tiles.forEach((tile, index) => {
          if (!tile.position.every((value, axis) => value === position[axis])) return;
          const normal = vector(tile.normal);
          const sticker = new THREE.Mesh(stickerShape);
          sticker.position.copy(normal).multiplyScalar(.489);
          sticker.quaternion.setFromUnitVectors(forward, normal);
          group.add(sticker);
          stickers[index] = sticker;
        });
      }
    }
  }

  let animation = 0;
  let yaw = 0;
  let settle;
  let pose = defaultView.clone();
  let up = new THREE.Vector3(0, 1, 0);
  let pointer;
  let motion;
  const hands = createHands();
  scene.add(hands.group);
  let handsOn = true;
  function draw() {
    hands.group.visible = handsOn;
    hands.update(performance.now() / 1000, renderer.getPixelRatio() * Math.max(1.6, container.clientHeight / 230));
    camera.position.copy(pose);
    camera.up.copy(up);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    container.dispatchEvent(new CustomEvent('cube-draw'));
  }
  // Which hand makes a move, and the axis it turns about (solver's frame).
  function handFor(move) {
    const whole = move[0] === 'y';
    const { axis, side, quarters } = turnSpec(whole ? 'U' + move.slice(1) : move);
    const turn = new THREE.Vector3(0, 1, 0);
    const worldAxis = new THREE.Vector3().setComponent(axis, 1).applyAxisAngle(turn, -yaw * Math.PI / 2).round();
    const normal = worldAxis.clone().multiplyScalar(side);
    const face = whole ? 'y' : normal.x > .5 ? 'R' : normal.x < -.5 ? 'L' : normal.y > .5 ? 'U' : normal.y < -.5 ? 'D' : normal.z > .5 ? 'F' : 'B';
    const prime = quarters === -1;
    const hand = face === 'y' ? 'both' : face === 'L' ? 'left' : face === 'U' ? (prime ? 'left' : 'right')
      : face === 'D' ? (prime ? 'right' : 'left') : 'right';
    // Gripping hands ride the layer; pushing hands only nudge.
    const ratio = face === 'R' || face === 'L' || face === 'y' ? 1 : 0.32;
    return { hand, axis: worldAxis, angle: -side * quarters * Math.PI / 2, ratio };
  }

  // Arrow that wraps around the turning layer, hugging the faces you can see.
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xfff09a });
  const arrowEdge = new THREE.MeshBasicMaterial({ color: 0x1a2a20 });
  let arrow;
  function buildArrow(move) {
    const whole = move[0] === 'y';
    const { axis, side, quarters } = turnSpec(whole ? 'U' + move.slice(1) : move);
    const axisVector = new THREE.Vector3().setComponent(axis, 1);
    const sign = Math.sign(-side * quarters);
    const turn = new THREE.Vector3(0, 1, 0);
    const seen = [[0, 1, 0], [0, 0, 1], [1, 0, 0]]
      .map(w => new THREE.Vector3(...w).applyAxisAngle(turn, yaw * Math.PI / 2))
      .filter(v => Math.abs(v.dot(axisVector)) < .5);
    const center = seen[0].clone().add(seen[1]).normalize();
    const offset = whole ? 0 : side;
    const sweep = (Math.abs(quarters) === 2 ? 150 : 96) * Math.PI / 180;
    const base = whole ? 1.95 : 1.6;
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const angle = sign * (-sweep / 2 + sweep * i / 40);
      const direction = center.clone().applyAxisAngle(axisVector, angle);
      // Find the in-plane angle from the first visible face to round the square outline.
      const a = direction.dot(seen[0]);
      const b = direction.dot(seen[1]);
      const radius = base * (Math.abs(a) ** 12 + Math.abs(b) ** 12) ** (-1 / 12);
      points.push(direction.multiplyScalar(radius).add(axisVector.clone().multiplyScalar(offset)));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, .075, 8), arrowMaterial));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, .11, 8), arrowEdge));
    const heads = Math.abs(quarters) === 2 ? [1, .5] : [1];
    for (const at of heads) {
      const head = new THREE.Mesh(new THREE.ConeGeometry(.24, .5, 18), arrowMaterial);
      const tangent = curve.getTangentAt(at);
      head.position.copy(curve.getPointAt(at)).add(tangent.clone().multiplyScalar(.12));
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      group.add(head);
    }
    group.children[1].renderOrder = -1;
    group.children[1].material.side = THREE.BackSide;
    return group;
  }
  function resetModels() {
    model.rotation.set(0, -yaw * Math.PI / 2, 0);
    for (const cubie of cubies) {
      model.add(cubie.group);
      cubie.group.position.fromArray(cubie.position);
      cubie.group.rotation.set(0, 0, 0);
    }
    for (const child of [...model.children]) {
      if (!cubies.some(cubie => cubie.group === child)) model.remove(child);
    }
  }
  function setState(state, { colors, show, focus, preview, turn = 0 }) {
    cancelAnimationFrame(animation);
    settle?.();
    settle = undefined;
    yaw = turn;
    resetModels();
    const spec = preview && preview[0] !== 'y' && turnSpec(preview);
    arrow = preview ? buildArrow(preview) : undefined;
    hands.setActive(preview ? handFor(preview).hand : '');
    if (arrow) model.add(arrow);
    cubies.forEach(({ position, plastic }) => {
      plastic.material = focus && focus.every((value, axis) => value === position[axis]) ? focusBody
        : spec && position[spec.axis] === spec.side ? activeBody : body;
    });
    stickers.forEach((sticker, index) => { sticker.material = show[index] ? materials[colors[state[index]]] : grey; });
    draw();
  }

  const resize = () => {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const ratio = width / height;
    const vertical = Math.max(3.05, 2.95 / ratio);
    camera.left = -vertical * ratio;
    camera.right = vertical * ratio;
    camera.top = vertical;
    camera.bottom = -vertical;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    draw();
  };
  new ResizeObserver(resize).observe(container);

  function view() {
    pose = defaultView.clone();
    up.set(0, 1, 0);
    draw();
  }

  surface.addEventListener('pointerdown', event => {
    pointer = [event.clientX, event.clientY];
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointermove', event => {
    if (!pointer) return;
    const dx = event.clientX - pointer[0];
    const dy = event.clientY - pointer[1];
    if (!dx && !dy) return;
    const polar = new THREE.Spherical().setFromVector3(pose);
    polar.theta -= dx * .011;
    polar.phi = THREE.MathUtils.clamp(polar.phi - dy * .011, .07, Math.PI - .07);
    pose.setFromSpherical(polar);
    up.set(0, 1, 0);
    pointer = [event.clientX, event.clientY];
    container.dispatchEvent(new Event('orbit-drag'));
    draw();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    surface.addEventListener(event, () => { pointer = undefined; });
  }

  // Keep the dots flowing while the cube is on screen.
  let onScreen = true;
  let idle = 0;
  const tick = () => {
    cancelAnimationFrame(idle);
    if (!onScreen || (!handsOn && !hands.settling)) return;
    if (motion === undefined) draw();
    idle = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; tick(); }).observe(container);
  view();
  tick();
  return {
    setHands(on) { handsOn = on; draw(); tick(); },
    view,
    setState,
    get motion() { return motion; },
    get turned() { return !pose.equals(defaultView); },
    // World point to pixel position inside the container.
    project(x, y, z) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      return { x: (point.x + 1) / 2 * container.clientWidth, y: (1 - point.y) / 2 * container.clientHeight };
    },
    facing(x, y, z) {
      return new THREE.Vector3(x, y, z).dot(camera.position.clone().normalize());
    },
    animate(move, duration) {
      if (!duration) return Promise.resolve();
      const whole = move[0] === 'y';
      const { axis, side, quarters } = turnSpec(whole ? 'U' + move.slice(1) : move);
      if (arrow) model.remove(arrow);
      const grip = handFor(move);
      hands.setActive(grip.hand);
      const pivot = new THREE.Group();
      model.add(pivot);
      for (const cubie of cubies) {
        if (whole || cubie.position[axis] === side) {
          cubie.plastic.material = activeBody;
          pivot.add(cubie.group);
        }
      }
      const started = performance.now();
      const axes = ['x', 'y', 'z'];
      return new Promise(resolve => {
        settle = resolve;
        const frame = now => {
          const time = Math.min(1, (now - started) / duration);
          const ease = time * time * (3 - 2 * time);
          pivot.rotation[axes[axis]] = -side * quarters * Math.PI / 2 * ease;
          motion = ease;
          hands.hold(grip.hand, grip.axis, grip.angle * grip.ratio * ease);
          draw();
          if (time < 1) animation = requestAnimationFrame(frame);
          else {
            hands.release();
            motion = undefined;
            settle = undefined;
            resolve();
          }
        };
        animation = requestAnimationFrame(frame);
      });
    },
  };
}
