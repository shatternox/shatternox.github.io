import * as THREE from '../assets/vendor/three/three.module.min.js';
import { tiles, turnSpec } from './cube.mjs';
import { palette } from './lessons.mjs';

const vector = array => new THREE.Vector3(...array);
const forward = new THREE.Vector3(0, 0, 1);
const defaultView = new THREE.Vector3(5.7, 4.6, 8.3);

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
  function draw() {
    camera.position.copy(pose);
    camera.up.copy(up);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
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
    const vertical = Math.max(2.52, 2.32 / ratio);
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

  view();
  return {
    view,
    setState,
    animate(move, duration) {
      if (!duration) return Promise.resolve();
      const whole = move[0] === 'y';
      const { axis, side, quarters } = turnSpec(whole ? 'U' + move.slice(1) : move);
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
          draw();
          if (time < 1) animation = requestAnimationFrame(frame);
          else {
            settle = undefined;
            resolve();
          }
        };
        animation = requestAnimationFrame(frame);
      });
    },
  };
}
