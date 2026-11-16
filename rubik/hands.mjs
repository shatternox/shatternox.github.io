// Two see-through hands made of glowing green dots, holding the cube the way a
// beginner does: thumb on the front, index finger on top, the other fingers
// behind. Coordinates are the solver's frame (+x right, +y up, +z toward you).
import * as THREE from '../assets/vendor/three/three.module.min.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Right hand. The left hand is its mirror image.
const FINGERS = [
  // joints, radius at base, radius at tip, dots
  { joints: [v(1.96, -0.05, 0.55), v(2.05, 0.3, 1.25), v(1.78, 0.5, 1.86), v(1.2, 0.56, 1.86), v(0.78, 0.56, 1.83)], r: [0.22, 0.15],},
  { joints: [v(1.94, 0.72, -0.72), v(1.98, 1.42, -0.68), v(1.72, 1.86, -0.62), v(1.12, 1.88, -0.58), v(0.62, 1.85, -0.55)], r: [0.18, 0.13],},
  { joints: [v(1.95, 0.28, -1.02), v(1.98, 0.28, -1.66), v(1.7, 0.27, -1.94), v(1.05, 0.26, -1.9), v(0.4, 0.25, -1.86)], r: [0.18, 0.13],},
  { joints: [v(1.94, -0.2, -1.0), v(1.97, -0.21, -1.62), v(1.68, -0.22, -1.92), v(1.08, -0.23, -1.88), v(0.55, -0.24, -1.85)], r: [0.17, 0.12],},
  { joints: [v(1.92, -0.64, -0.92), v(1.96, -0.66, -1.48), v(1.7, -0.67, -1.86), v(1.22, -0.68, -1.85), v(0.88, -0.69, -1.83)], r: [0.15, 0.11],},
];
const PALM = { center: v(1.93, -0.06, -0.12), ry: 0.95, rz: 1.0, thick: 0.12 };
const ARM = { joints: [v(1.98, -0.85, 0.7), v(2.25, -1.6, 1.5), v(2.55, -2.5, 2.4)], r: [0.42, 0.5] };

const randomUnit = () => {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return v(s * Math.cos(a), s * Math.sin(a), u);
};

// Dots laid out in rings around each bone, so fingers read as solid tubes.
function sampleTube(joints, [r0, r1], push, { flow = [0.35, 1], fade = () => 1, spacing = 0.075 } = {}) {
  const curve = new THREE.CatmullRomCurve3(joints, false, 'centripetal');
  const length = curve.getLength();
  const rings = Math.max(4, Math.round(length / spacing));
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = Math.abs(tangent.y) < 0.9 ? v(0, 1, 0) : v(1, 0, 0);
    const a = side.clone().cross(tangent).normalize();
    const b = tangent.clone().cross(a).normalize();
    // Taper, with a rounded fingertip.
    let radius = r0 + (r1 - r0) * t;
    if (t > 0.9) radius *= Math.sqrt(Math.max(0.05, 1 - ((t - 0.9) / 0.1) ** 2));
    const count = Math.max(5, Math.round(radius * 2 * Math.PI / 0.062));
    const twist = ring * 0.37;
    for (let k = 0; k < count; k++) {
      const angle = twist + k / count * Math.PI * 2;
      const point = center.clone()
        .add(a.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(b.clone().multiplyScalar(Math.sin(angle) * radius))
        .add(randomUnit().multiplyScalar(0.008));
      push(point, 1, fade(t), flow[0] + (flow[1] - flow[0]) * t);
    }
  }
  // Brighter dots on the knuckles.
  for (const joint of joints.slice(1, -1)) {
    for (let i = 0; i < 8; i++) push(joint.clone().add(randomUnit().multiplyScalar(r0 * 0.35)), 1.7, fade(0), flow[0]);
  }
}

function buildHand(mirror) {
  const positions = [];
  const sizes = [];
  const fades = [];
  const seeds = [];
  const flows = [];
  const push = (point, size = 1, fade = 1, flow = 0.3) => {
    positions.push(mirror ? -point.x : point.x, point.y, point.z);
    sizes.push(size * (0.85 + Math.random() * 0.3));
    fades.push(fade);
    seeds.push(Math.random());
    flows.push(flow);
  };
  for (const finger of FINGERS) sampleTube(finger.joints, finger.r, push);
  // Palm: a dotted grid on both sheets, closed by an outline.
  const inside = (y, z) => ((y - PALM.center.y) / PALM.ry) ** 2 + ((z - PALM.center.z) / PALM.rz) ** 2;
  for (let y = -PALM.ry; y <= PALM.ry; y += 0.075) {
    for (let z = -PALM.rz; z <= PALM.rz; z += 0.075) {
      const py = PALM.center.y + y;
      const pz = PALM.center.z + z;
      if (inside(py, pz) > 1) continue;
      const flow = 0.2 + 0.15 * (1 - (pz - PALM.center.z + PALM.rz) / (2 * PALM.rz));
      for (const sheet of [-1, 1]) push(v(PALM.center.x + sheet * PALM.thick, py, pz).add(randomUnit().multiplyScalar(0.01)), 1, 1, flow);
    }
  }
  for (let k = 0; k < 140; k++) {
    const angle = k / 140 * Math.PI * 2;
    for (const x of [-1, 0, 1]) push(v(PALM.center.x + x * PALM.thick, PALM.center.y + Math.cos(angle) * PALM.ry, PALM.center.z + Math.sin(angle) * PALM.rz), 1.2, 1, 0.25);
  }
  sampleTube(ARM.joints, ARM.r, push, { flow: [0.2, -0.4], fade: t => Math.max(0, 1 - t * 0.95) ** 1.2, spacing: 0.1 });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aFade', new THREE.Float32BufferAttribute(fades, 1));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setAttribute('aFlow', new THREE.Float32BufferAttribute(flows, 1));
  return geometry;
}

const vertexShader = `
  attribute float aSize; attribute float aFade; attribute float aSeed; attribute float aFlow;
  uniform float uTime; uniform float uPixel; uniform float uIntensity;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float t = uTime;
    // Slow flowing drift so the hand looks alive, not frozen.
    p += 0.011 * vec3(
      sin(t * 1.7 + aSeed * 6.283 + p.y * 3.1),
      sin(t * 1.3 + aSeed * 12.1 + p.z * 2.7),
      sin(t * 1.9 + aSeed * 4.2 + p.x * 3.3));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    // A soft glow that flows from the wrist out to the fingertips.
    float wave = 0.5 + 0.5 * sin(aFlow * 9.0 - t * 2.4);
    gl_PointSize = aSize * uPixel * (1.45 + 0.55 * wave);
    vAlpha = aFade * uIntensity * (0.45 + 0.55 * wave) * (0.85 + 0.15 * sin(t * 3.0 + aSeed * 40.0));
  }`;
const fragmentShader = `
  uniform vec3 uColor; uniform float uDim;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d) * vAlpha * uDim * 1.15;
    gl_FragColor = vec4(uColor * a, a);
  }`;

export function createHands() {
  const group = new THREE.Group();
  const shared = { uTime: { value: 0 }, uPixel: { value: 2 } };
  const hands = ['left', 'right'].map(side => {
    const geometry = buildHand(side === 'left');
    const uniforms = { ...shared, uIntensity: { value: 0.5 }, uColor: { value: new THREE.Color(0x3dff8f) } };
    const material = (dim, depthFunc) => new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uDim: { value: dim } },
      vertexShader, fragmentShader,
      transparent: true, depthWrite: false, depthFunc, blending: THREE.AdditiveBlending,
    });
    const hand = new THREE.Group();
    // Dots in front of the cube are bright; dots behind it still show, faintly.
    hand.add(new THREE.Points(geometry, material(1, THREE.LessEqualDepth)));
    hand.add(new THREE.Points(geometry, material(0.3, THREE.GreaterDepth)));
    group.add(hand);
    return { side, hand, uniforms, held: false, target: 0.5 };
  });
  const rest = new THREE.Quaternion();
  let last = 0;

  return {
    group,
    setActive(which) {
      for (const hand of hands) hand.target = which === 'both' || which === hand.side ? 1.15 : 0.72;
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
