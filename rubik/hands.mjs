// Two see-through human hands made of glowing green dots, holding the cube the
// way a beginner does: thumb low on the front, index finger over the top, the
// other fingers wrapped around the back. Coordinates are the solver's frame
// (+x right, +y up, +z toward you); the cube spans -1.5..1.5.
import * as THREE from '../assets/vendor/three/three.module.min.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Right hand. The left hand is its mirror image. Each finger is built like a
// real one: bones of different lengths that bend at the knuckles, starting
// from the palm. `bends` are the knuckle angles in degrees, base to tip.
const DEG = Math.PI / 180;
const SPECS = [
  // index: up the right side, over the top, pad resting on the top
  { base: v(1.98, 0.8, -0.6), dir: v(0, 1, 0.04), axis: v(0, 0, 1), bends: [16, 70, 12], lengths: [1.0, 0.66, 0.5], r: 0.26 },
  // middle, ring, little: around the back-right edge, fanning slightly
  { base: v(2.14, 0.34, -0.9), dir: v(0, 0.02, -1), axis: v(0, 1, 0), bends: [18, 70, 14], lengths: [1.06, 0.72, 0.52], r: 0.27 },
  { base: v(2.14, -0.16, -0.88), dir: v(0, -0.06, -1), axis: v(0, 1, 0), bends: [20, 68, 14], lengths: [1.0, 0.68, 0.5], r: 0.255 },
  { base: v(2.1, -0.62, -0.96), dir: v(0, -0.14, -1), axis: v(0, 1, 0), bends: [16, 72, 10], lengths: [0.84, 0.52, 0.44], r: 0.22 },
  // thumb: two bones, around the front-right edge, pad low on the front
  { base: v(2.16, -0.44, 0.72), dir: v(0, 0.06, 1), axis: v(0, -1, 0), bends: [10, 74, 8], lengths: [0.98, 0.76], r: 0.29, thumb: true },
];
// Points along the finger: a root inside the palm, then each bone's middle
// and end, so bones stay straight and only the knuckles curve.
function fingerPath({ base, dir, axis, bends, lengths, r, thumb }) {
  const d = dir.clone().normalize();
  const turn = axis.clone().normalize();
  const joints = [base.clone().addScaledVector(d, -0.45), base.clone()];
  let at = base.clone();
  lengths.forEach((length, i) => {
    d.applyAxisAngle(turn, bends[i] * DEG);
    joints.push(at.clone().addScaledVector(d, length / 2));
    at = at.clone().addScaledVector(d, length);
    joints.push(at.clone());
  });
  return { joints, r, thumb };
}
const FINGERS = SPECS.map(fingerPath);
// A cupped palm against the right face, the fleshy pad under the thumb, and
// the pad along the little-finger side.
const PALM = { center: v(2.3, -0.16, -0.16), size: v(0.34, 1.0, 0.86) };
const THENAR = { center: v(2.24, -0.56, 0.5), size: v(0.36, 0.52, 0.44) };
const HYPOTHENAR = { center: v(2.3, -0.82, -0.62), size: v(0.3, 0.42, 0.34) };
const ARM = [v(2.36, -1.0, -0.06), v(2.5, -1.6, 0.25), v(2.75, -2.5, 0.9), v(3.0, -3.4, 1.6)];

const random = () => Math.random();
const randomUnit = () => {
  const u = random() * 2 - 1;
  const a = random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return v(s * Math.cos(a), s * Math.sin(a), u);
};

function createBuffers(mirror) {
  const data = { position: [], normal: [], size: [], fade: [], seed: [], curl: [], nail: [] };
  const push = (point, normal, { size = 1, fade = 1, curl = 0, nail = 0 } = {}) => {
    data.position.push(mirror ? -point.x : point.x, point.y, point.z);
    data.normal.push(mirror ? -normal.x : normal.x, normal.y, normal.z);
    data.size.push(size * (0.7 + random() * 0.6));
    data.fade.push(fade);
    data.seed.push(random());
    data.curl.push(curl);
    data.nail.push(nail);
  };
  return { data, push };
}

// Dots scattered over a soft, slightly flattened tube with knuckle bulges.
function finger({ joints, r, thumb }, push) {
  const curve = new THREE.CatmullRomCurve3(joints, false, 'centripetal');
  const length = curve.getLength();
  const count = Math.round(length * r * 2600);
  const knuckles = joints.map((joint, i) => i).filter(i => i > 0 && i < joints.length - 1 && i % 2 === 1).map(i => i / (joints.length - 1));
  for (let i = 0; i < count; i++) {
    const p = random();
    const center = curve.getPointAt(p);
    const tangent = curve.getTangentAt(p);
    // The back of the finger points away from the cube.
    const dorsal = center.clone().sub(tangent.clone().multiplyScalar(center.dot(tangent))).normalize();
    const lateral = tangent.clone().cross(dorsal).normalize();
    let radius = r * (thumb ? 1.1 - 0.24 * p : 1.06 - 0.26 * p) * (p < 0.12 ? 1 + 0.25 * (0.12 - p) / 0.12 : 1);
    for (const k of knuckles) radius *= 1 + 0.08 * Math.exp(-(((p - k) / 0.045) ** 2));
    if (p > 0.88) radius *= Math.sqrt(Math.max(0.04, 1 - ((p - 0.88) / 0.12) ** 2));
    const angle = random() * Math.PI * 2;
    // Fingers are wider than they are deep, and the pad side is fuller.
    const across = Math.cos(angle) * radius * 1.12;
    const depth = Math.sin(angle) * radius * (Math.sin(angle) < 0 ? 0.98 : 0.84);
    const normal = lateral.clone().multiplyScalar(Math.cos(angle)).add(dorsal.clone().multiplyScalar(Math.sin(angle))).normalize();
    const surface = random() < 0.9 ? 1 : 0.6 + random() * 0.4;
    const point = center.clone().add(lateral.clone().multiplyScalar(across * surface)).add(dorsal.clone().multiplyScalar(depth * surface));
    push(point, normal, { curl: p });
    // Fingernail on the back of the last segment.
    if (p > 0.8 && p < 0.97 && Math.sin(angle) > 0.55 && Math.abs(Math.cos(angle)) < 0.55 && random() < 0.7) {
      push(point.clone().add(dorsal.clone().multiplyScalar(0.012)), normal, { size: 1.15, curl: p, nail: 1 });
    }
  }
}

// Dots over a rounded box (superellipsoid): the palm, and the pad under the thumb.
function blob({ center, size }, count, push) {
  for (let i = 0; i < count; i++) {
    const n = randomUnit();
    const e = 2.15;
    const scale = (Math.abs(n.x) ** e + Math.abs(n.y) ** e + Math.abs(n.z) ** e) ** (-1 / e);
    const point = v(n.x * size.x, n.y * size.y, n.z * size.z).multiplyScalar(scale * (random() < 0.92 ? 1 : 0.75)).add(center);
    const normal = v(n.x / size.x, n.y / size.y, n.z / size.z).normalize();
    push(point, normal);
  }
}

function arm(push) {
  const curve = new THREE.CatmullRomCurve3(ARM);
  for (let i = 0; i < 2200; i++) {
    const t = random();
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const a = (Math.abs(tangent.y) < 0.9 ? v(0, 1, 0) : v(1, 0, 0)).cross(tangent).normalize();
    const b = tangent.clone().cross(a).normalize();
    const angle = random() * Math.PI * 2;
    const radius = 0.42 + 0.16 * t;
    const normal = a.clone().multiplyScalar(Math.cos(angle) * 1.15).add(b.clone().multiplyScalar(Math.sin(angle) * 0.85)).normalize();
    const point = center.clone().add(a.multiplyScalar(Math.cos(angle) * radius * 1.15)).add(b.multiplyScalar(Math.sin(angle) * radius * 0.85));
    push(point, normal, { fade: Math.max(0, 1 - t * 1.05) ** 1.3 });
  }
}

function buildHand(mirror) {
  const { data, push } = createBuffers(mirror);
  for (const f of FINGERS) finger(f, push);
  blob(PALM, 5200, push);
  blob(THENAR, 1100, push);
  blob(HYPOTHENAR, 700, push);
  arm(push);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
  geometry.setAttribute('aNormal', new THREE.Float32BufferAttribute(data.normal, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(data.size, 1));
  geometry.setAttribute('aFade', new THREE.Float32BufferAttribute(data.fade, 1));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(data.seed, 1));
  geometry.setAttribute('aCurl', new THREE.Float32BufferAttribute(data.curl, 1));
  geometry.setAttribute('aNail', new THREE.Float32BufferAttribute(data.nail, 1));
  return geometry;
}

const vertexShader = `
  attribute vec3 aNormal; attribute float aSize; attribute float aFade;
  attribute float aSeed; attribute float aCurl; attribute float aNail;
  uniform float uTime; uniform float uPixel; uniform float uIntensity; uniform vec3 uAnchor;
  varying float vAlpha; varying float vNail; varying float vTone;
  void main() {
    float t = uTime;
    // Breathing: the whole hand swells very slightly; a soft pulse runs down each finger.
    vec3 p = uAnchor + (position - uAnchor) * (1.0 + 0.006 * sin(t * 1.15));
    p += aNormal * 0.01 * sin(t * 1.7 - aCurl * 4.0);
    p += 0.004 * vec3(sin(t * 1.3 + aSeed * 40.0), sin(t * 1.1 + aSeed * 23.0), sin(t * 1.7 + aSeed * 31.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    // Rim light: dots on the outline glow more, so the form reads as rounded skin.
    vec3 n = normalize(normalMatrix * aNormal);
    float rim = 1.0 - abs(n.z);
    gl_PointSize = aSize * uPixel * (0.95 + 0.7 * rim) * (1.0 + 0.25 * aNail);
    vAlpha = aFade * uIntensity * (0.55 + 0.75 * pow(rim, 1.4)) * (0.85 + 0.15 * sin(t * 2.0 + aSeed * 50.0));
    vNail = aNail;
    vTone = aSeed;
  }`;
const fragmentShader = `
  uniform vec3 uColor; uniform float uDim;
  varying float vAlpha; varying float vNail; varying float vTone;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.08, d) * vAlpha * uDim;
    vec3 color = uColor * (0.82 + 0.3 * vTone);
    color = mix(color, vec3(0.86, 1.0, 0.92), vNail * 0.55);
    gl_FragColor = vec4(color * a, a);
  }`;

export function createHands() {
  const group = new THREE.Group();
  const shared = { uTime: { value: 0 }, uPixel: { value: 2 } };
  const hands = ['left', 'right'].map(side => {
    const geometry = buildHand(side === 'left');
    const anchor = PALM.center.clone();
    if (side === 'left') anchor.x *= -1;
    const uniforms = {
      ...shared,
      uIntensity: { value: 0.78 },
      uColor: { value: new THREE.Color(0x5cf2a0) },
      uAnchor: { value: anchor },
    };
    const material = (dim, depthFunc) => new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uDim: { value: dim } },
      vertexShader, fragmentShader,
      transparent: true, depthWrite: false, depthFunc, blending: THREE.AdditiveBlending,
    });
    const hand = new THREE.Group();
    // Dots in front of the cube are bright; dots behind it still show, faintly.
    hand.add(new THREE.Points(geometry, material(1, THREE.LessEqualDepth)));
    hand.add(new THREE.Points(geometry, material(0.24, THREE.GreaterDepth)));
    group.add(hand);
    return { side, hand, uniforms, held: false, target: 0.6 };
  });
  const rest = new THREE.Quaternion();
  let last = 0;

  return {
    group,
    setActive(which) {
      for (const hand of hands) hand.target = which === 'both' || which === hand.side ? 1.25 : 0.78;
    },
    // Rotate a hand around the cube with the layer it is turning.
    hold(which, axis, angle) {
      for (const hand of hands) {
        if (which !== 'both' && which !== hand.side) continue;
        hand.held = true;
        hand.hand.quaternion.setFromAxisAngle(axis, angle);
      }
    },
    release() { for (const hand of hands) hand.held = false; },
    update(seconds, pixel) {
      const dt = Math.min(0.05, seconds - last || 0.016);
      last = seconds;
      shared.uTime.value = seconds;
      shared.uPixel.value = pixel;
      for (const hand of hands) {
        const intensity = hand.uniforms.uIntensity;
        intensity.value += (hand.target - intensity.value) * Math.min(1, dt * 8);
        // Let go and regrip smoothly after each turn.
        if (!hand.held) hand.hand.quaternion.slerp(rest, Math.min(1, dt * 7));
      }
    },
    get settling() { return hands.some(hand => !hand.held && hand.hand.quaternion.angleTo(rest) > 0.002); },
  };
}
