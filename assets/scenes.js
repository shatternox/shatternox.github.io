// Three.js scenes for the portfolio. Each scene is decorative: content and
// CSS fallbacks stay intact if WebGL, the module import, or the context fails.
// Three.js r186 is self-hosted under assets/vendor/three (MIT).

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const EMERALD = [0.24, 0.86, 0.55];
const MINT = [0.72, 1.0, 0.86];

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (event) => {
  if (!finePointer.matches) return;
  pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

// Ease the pointer once per animation frame, however many loops are running.
let pointerStamp = -1;
function easePointer(time, dt) {
  if (time === pointerStamp) return;
  pointerStamp = time;
  pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
  pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const isCompact = () => window.innerWidth < 761;

function announceHero(state) {
  document.dispatchEvent(new CustomEvent('hero-gl', { detail: state }));
}

function createStage(THREE, host, build) {
  const canvas = document.createElement('canvas');
  canvas.className = 'gl-stage';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  host.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const view = { width: 1, height: 1, halfW: 1, halfH: 1 };
  const api = build({ THREE, scene, camera, host, view });

  let visible = false;
  let lost = false;
  let frame = 0;
  let last = 0;
  let elapsed = 0;

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const distance = camera.position.length();
    view.width = width;
    view.height = height;
    view.halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    view.halfW = view.halfH * camera.aspect;
    api.resize?.(view);
    if (!frame) renderOnce();
  }

  function renderOnce() {
    api.update?.(0, elapsed, view);
    renderer.render(scene, camera);
  }

  function loop(time) {
    frame = 0;
    if (!shouldRun()) return;
    const delta = last ? Math.min((time - last) / 1000, 0.05) : 0.016;
    last = time;
    elapsed += delta;
    easePointer(time, delta);
    api.update?.(delta, elapsed, view);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }

  const shouldRun = () => visible && !lost && !document.hidden && !reducedMotion.matches;

  function sync() {
    const enabled = !lost && !reducedMotion.matches;
    host.dataset.gl = enabled ? 'on' : 'off';
    api.onState?.(enabled);
    if (shouldRun()) {
      if (!frame) { last = 0; frame = requestAnimationFrame(loop); }
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; sync(); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); sync(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { rootMargin: '120px 0px' }).observe(host);
  new ResizeObserver(resize).observe(host);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener?.('change', sync);

  resize();
  sync();
  return { canvas, sync };
}

const softPoint = /* glsl */`
  float softDisc() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    return smoothstep(0.5, 0.0, d);
  }
`;

// Hero: a scanning signal terrain with thin orbit rings around the portrait.
function heroScene({ THREE, scene, camera, host, view }) {
  camera.position.set(0, 1.0, 8.5);
  camera.lookAt(0, -0.6, 0);
  const compact = isCompact();
  const cols = compact ? 96 : 160;
  const rows = compact ? 46 : 72;
  const positions = new Float32Array(cols * rows * 3);
  const grid = new Float32Array(cols * rows * 2);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const v = r / (rows - 1);
      positions.set([(u - 0.5) * 30, 0, -13 + v * 17], i * 3);
      grid.set([u, v], i * 2);
      i++;
    }
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  terrainGeometry.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2));
  const terrainUniforms = {
    uTime: { value: 0 }, uScan: { value: -20 }, uLift: { value: 0 }, uIntro: { value: 0 },
    uPixel: { value: 1 }, uColor: { value: new THREE.Vector3(...EMERALD) }, uHot: { value: new THREE.Vector3(...MINT) }
  };
  const terrain = new THREE.Points(terrainGeometry, new THREE.ShaderMaterial({
    uniforms: terrainUniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uScan, uLift, uIntro, uPixel;
      attribute vec2 aGrid;
      varying float vAlpha, vScan;
      float wave(vec2 p, float t) {
        return sin(p.x * 0.55 + t * 0.6) * 0.35
          + sin(p.y * 0.9 - t * 0.45 + p.x * 0.2) * 0.28
          + sin((p.x + p.y) * 0.32 + t * 0.3) * 0.45;
      }
      void main() {
        vec3 p = position;
        float h = wave(p.xz, uTime) * (0.55 + uLift);
        p.y += h - (1.0 - uIntro) * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vScan = exp(-pow((p.x - uScan) * 0.9, 2.0));
        gl_PointSize = uPixel * (2.0 + h * 0.6 + vScan * 2.2) * (22.0 / -mv.z);
        float edge = smoothstep(0.0, 0.16, aGrid.x) * smoothstep(1.0, 0.84, aGrid.x)
          * smoothstep(0.08, 0.45, aGrid.y) * smoothstep(1.0, 0.86, aGrid.y);
        float copyMask = mix(0.28, 1.0, smoothstep(0.2, 0.72, aGrid.x));
        vAlpha = edge * copyMask * uIntro * (0.3 + 0.5 * smoothstep(-0.6, 0.9, h)) * mix(0.75, 1.15, aGrid.y);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor, uHot;
      varying float vAlpha, vScan;
      ${softPoint}
      void main() {
        float a = softDisc();
        gl_FragColor = vec4(mix(uColor, uHot, vScan), a * vAlpha * (1.0 + vScan * 1.8));
      }`
  }));
  terrain.position.y = -2.3;
  scene.add(terrain);

  // Orbit rings with a travelling pulse, centred on the stationary portrait.
  const orbit = new THREE.Group();
  const ringUniforms = { uTime: { value: 0 }, uFade: { value: 0 }, uPixel: { value: 1 } };
  const ringSpecs = [
    { radius: 1.0, tilt: [0.95, 0.15, 0.4], speed: 0.07 },
    { radius: 1.16, tilt: [0.8, 0.5, -0.55], speed: -0.05 },
    { radius: 1.32, tilt: [1.1, -0.35, 1.05], speed: 0.035 }
  ];
  const markers = [];
  const markerPositions = new Float32Array(ringSpecs.length * 3);
  ringSpecs.forEach((spec, index) => {
    const segments = 520;
    const ringPositions = new Float32Array(segments * 3);
    const angles = new Float32Array(segments);
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      ringPositions.set([Math.cos(a), Math.sin(a), 0], s * 3);
      angles[s] = s / segments;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ringUniforms, uSpeed: { value: spec.speed }, uOffset: { value: index / 3 } },
      // Shared uniform objects keep time/fade/pixel ratio in sync across rings.
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uSpeed, uOffset, uPixel;
        attribute float aAngle; varying float vAngle, vTail;
        void main() {
          vAngle = aAngle;
          float head = fract(uTime * uSpeed + uOffset);
          float f = fract((uSpeed > 0.0 ? head - aAngle : aAngle - head) + 1.0);
          vTail = pow(1.0 - f, 10.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPixel * (2.8 + vTail * 3.2);
        }`,
      fragmentShader: /* glsl */`
        uniform float uFade; varying float vAngle, vTail;
        ${softPoint}
        void main() {
          float a = softDisc();
          gl_FragColor = vec4(mix(vec3(0.24, 0.86, 0.55), vec3(0.85, 1.0, 0.92), vTail), a * (0.5 + vTail * 0.5) * uFade);
        }`
    });
    const holder = new THREE.Object3D();
    holder.rotation.set(...spec.tilt);
    const ring = new THREE.Points(geometry, material);
    ring.scale.setScalar(spec.radius);
    holder.add(ring);
    orbit.add(holder);
    markers.push({ holder, spec, index });
  });
  const markerGeometry = new THREE.BufferGeometry();
  markerGeometry.setAttribute('position', new THREE.BufferAttribute(markerPositions, 3));
  const markerMaterial = new THREE.ShaderMaterial({
    uniforms: { uFade: ringUniforms.uFade, uPixel: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uPixel;
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 9.0 * uPixel; }`,
    fragmentShader: /* glsl */`
      uniform float uFade; ${softPoint}
      void main() { float a = softDisc(); gl_FragColor = vec4(0.8, 1.0, 0.9, a * a * uFade); }`
  });
  const markerPoints = new THREE.Points(markerGeometry, markerMaterial);
  scene.add(orbit, markerPoints);

  const portrait = host.querySelector('.portrait');
  const ray = new THREE.Vector3();
  const local = new THREE.Vector3();
  const baseCamera = camera.position.clone();

  function placeOrbit() {
    if (!portrait) { orbit.visible = false; return; }
    const box = portrait.getBoundingClientRect();
    const hostBox = host.getBoundingClientRect();
    const cx = box.left + box.width / 2 - hostBox.left;
    const cy = box.top + box.height / 2 - hostBox.top;
    camera.position.copy(baseCamera);
    camera.lookAt(0, -0.6, 0);
    camera.updateMatrixWorld();
    ray.set((cx / view.width) * 2 - 1, -(cy / view.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const distance = -camera.position.z / ray.z;
    orbit.position.copy(camera.position).addScaledVector(ray, distance);
    const unitsPerPixel = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance) / view.height;
    orbit.scale.setScalar(box.height * unitsPerPixel * 0.42);
  }

  return {
    resize() {
      const pixel = Math.min(window.devicePixelRatio || 1, 1.75);
      terrainUniforms.uPixel.value = pixel * (isCompact() ? 1.15 : 1);
      markerMaterial.uniforms.uPixel.value = pixel;
      ringUniforms.uPixel.value = pixel;
      placeOrbit();
    },
    update(delta, time) {
      const box = host.getBoundingClientRect();
      const exit = clamp01(-box.top / Math.max(1, box.height));
      const intro = smooth(0.1, 2.2, time);
      terrainUniforms.uTime.value = time;
      terrainUniforms.uIntro.value = intro * (1 - exit * 0.6);
      terrainUniforms.uLift.value = exit * 1.1;
      terrainUniforms.uScan.value = ((time % 10) / 7) * 36 - 18;
      ringUniforms.uTime.value = time;
      ringUniforms.uFade.value = smooth(0.6, 2.4, time) * (1 - exit);
      orbit.rotation.z = Math.sin(time * 0.12) * 0.12;
      orbit.rotation.y = pointer.x * 0.18;
      orbit.rotation.x = pointer.y * 0.12;
      orbit.updateMatrixWorld();
      markers.forEach(({ holder, spec, index }) => {
        const head = ((time * spec.speed + index / 3) % 1 + 1) % 1;
        const a = head * Math.PI * 2;
        local.set(Math.cos(a) * spec.radius, Math.sin(a) * spec.radius, 0);
        holder.localToWorld(local);
        markerPositions.set([local.x, local.y, local.z], index * 3);
      });
      markerGeometry.attributes.position.needsUpdate = true;
      camera.position.set(baseCamera.x + pointer.x * 0.35, baseCamera.y - pointer.y * 0.2 + exit * 0.8, baseCamera.z);
      camera.lookAt(0, -0.6, 0);
    },
    onState: (enabled) => announceHero(enabled ? 'on' : 'off')
  };
}

// Visual break: scattered "risk" particles settle into an ordered lattice as the
// reader scrolls through "From finding the risk to making the fix stick."
function assemblyScene({ THREE, scene, camera, host }) {
  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, 0);
  const side = isCompact() ? 18 : 26;
  const count = side * side;
  const start = new Float32Array(count * 3);
  const end = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const gx = i % side;
    const gy = Math.floor(i / side);
    start.set([(Math.random() - 0.35) * 2.6, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.6], i * 3);
    end.set([(gx / (side - 1) - 0.5), (gy / (side - 1) - 0.5), 0], i * 3);
    seed[i] = Math.random();
  }
  const uniforms = {
    uTime: { value: 0 }, uProgress: { value: 0 }, uPixel: { value: 1 },
    uOffset: { value: new THREE.Vector3() }, uScale: { value: 1 }, uSize: { value: 1 }, uAlpha: { value: 1 }
  };
  const shared = /* glsl */`
    uniform float uTime, uProgress, uScale, uSize;
    uniform vec3 uOffset;
    vec3 place(vec3 s, vec3 e, float seed, out float settled) {
      settled = smoothstep(0.0, 1.0, clamp((uProgress - seed * 0.35) / 0.65, 0.0, 1.0));
      vec3 lattice = vec3(e.xy * uSize, 0.0);
      float c = cos(-0.55), si = sin(-0.55);
      lattice = vec3(lattice.x * c, lattice.y, lattice.x * si);
      lattice.y += sin(e.x * 6.0 + uTime * 0.8) * 0.015 * uSize;
      vec3 drift = vec3(sin(uTime * 0.7 + seed * 40.0), cos(uTime * 0.6 + seed * 25.0), sin(uTime * 0.5 + seed * 13.0)) * 0.18;
      vec3 scatter = s * uScale + drift * uScale;
      return mix(scatter, lattice, settled) + uOffset;
    }`;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(start, 3));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(end, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${shared}
      uniform float uPixel;
      attribute vec3 aEnd; attribute float aSeed;
      varying float vSettled;
      void main() {
        float settled;
        vec3 p = place(position, aEnd, aSeed, settled);
        vSettled = settled;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPixel * mix(2.6, 2.1, settled) * (9.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform float uAlpha;
      varying float vSettled;
      ${softPoint}
      void main() {
        float a = softDisc();
        vec3 risk = vec3(0.66, 0.72, 0.69);
        vec3 fix = vec3(0.38, 0.92, 0.62);
        gl_FragColor = vec4(mix(risk, fix, vSettled), a * mix(0.38, 0.85, vSettled) * uAlpha);
      }`
  }));

  // Lattice links appear only once the particles have settled.
  const linkStart = [];
  const linkEnd = [];
  const linkSeed = [];
  const pushVertex = (index) => {
    linkStart.push(start[index * 3], start[index * 3 + 1], start[index * 3 + 2]);
    linkEnd.push(end[index * 3], end[index * 3 + 1], end[index * 3 + 2]);
    linkSeed.push(seed[index]);
  };
  for (let i = 0; i < count; i++) {
    const gx = i % side;
    if (gx < side - 1) { pushVertex(i); pushVertex(i + 1); }
    if (i + side < count) { pushVertex(i); pushVertex(i + side); }
  }
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linkStart, 3));
  linkGeometry.setAttribute('aEnd', new THREE.Float32BufferAttribute(linkEnd, 3));
  linkGeometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(linkSeed, 1));
  const links = new THREE.LineSegments(linkGeometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${shared}
      attribute vec3 aEnd; attribute float aSeed;
      void main() { float settled; gl_Position = projectionMatrix * modelViewMatrix * vec4(place(position, aEnd, aSeed, settled), 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uProgress, uAlpha;
      void main() { gl_FragColor = vec4(0.38, 0.92, 0.62, smoothstep(0.82, 1.0, uProgress) * 0.16 * uAlpha); }`
  }));
  scene.add(points, links);

  return {
    resize(view) {
      const compact = isCompact();
      uniforms.uPixel.value = Math.min(window.devicePixelRatio || 1, 1.75);
      uniforms.uSize.value = Math.min(view.halfH * 1.5, view.halfW * (compact ? 1.1 : 0.62));
      uniforms.uScale.value = Math.min(view.halfW * 0.5, view.halfH * 1.6);
      uniforms.uOffset.value.set(compact ? view.halfW * 0.25 : view.halfW * 0.45, 0, 0);
      uniforms.uAlpha.value = compact ? 0.55 : 1;
    },
    update(delta, time) {
      const box = host.getBoundingClientRect();
      const raw = clamp01((window.innerHeight - box.top) / (window.innerHeight + box.height));
      uniforms.uTime.value = time;
      uniforms.uProgress.value = smooth(0.18, 0.58, raw);
      scene.rotation.y = pointer.x * 0.08;
      scene.rotation.x = pointer.y * 0.05;
    }
  };
}

// Contact: a slowly turning network globe with pulses travelling along arcs.
function globeScene({ THREE, scene, camera }) {
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  const globe = new THREE.Group();
  const count = isCompact() ? 1100 : 1900;
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    positions.set([Math.cos(theta) * radius, y, Math.sin(theta) * radius], i * 3);
  }
  const uniforms = { uTime: { value: 0 }, uPixel: { value: 1 }, uIntro: { value: 0 } };
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  globe.add(new THREE.Points(pointGeometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uPixel, uIntro;
      varying float vFacing;
      void main() {
        vec3 p = position * (1.0 + sin(position.y * 9.0 + uTime * 0.9) * 0.012);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFacing = normalize(normalMatrix * position).z;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPixel * 2.2 * (10.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform float uIntro;
      varying float vFacing;
      ${softPoint}
      void main() {
        float a = softDisc();
        gl_FragColor = vec4(0.36, 0.88, 0.6, a * mix(0.06, 0.42, smoothstep(-0.3, 0.8, vFacing)) * uIntro);
      }`
  })));

  const arcStart = [];
  const arcT = [];
  const arcPhase = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const arcCount = 16;
  for (let n = 0; n < arcCount; n++) {
    a.randomDirection();
    b.randomDirection();
    if (a.angleTo(b) < 0.6) b.negate();
    const phase = Math.random();
    const steps = 56;
    const lift = 0.12 + a.angleTo(b) * 0.12;
    for (let s = 0; s < steps; s++) {
      for (const t of [s / steps, (s + 1) / steps]) {
        p.copy(a).lerp(b, t).normalize().multiplyScalar(1 + Math.sin(Math.PI * t) * lift);
        arcStart.push(p.x, p.y, p.z);
        arcT.push(t);
        arcPhase.push(phase);
      }
    }
  }
  q.set(0, 0, 0);
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute('position', new THREE.Float32BufferAttribute(arcStart, 3));
  arcGeometry.setAttribute('aT', new THREE.Float32BufferAttribute(arcT, 1));
  arcGeometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(arcPhase, 1));
  globe.add(new THREE.LineSegments(arcGeometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aT, aPhase;
      varying float vT, vPhase, vFacing;
      void main() {
        vT = aT; vPhase = aPhase;
        vFacing = normalize(normalMatrix * position).z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uIntro;
      varying float vT, vPhase, vFacing;
      void main() {
        float head = fract(uTime * 0.16 + vPhase) * 1.4 - 0.2;
        float d = head - vT;
        float pulse = d > 0.0 ? pow(max(0.0, 1.0 - d / 0.22), 3.0) : 0.0;
        float facing = smoothstep(-0.4, 0.6, vFacing);
        gl_FragColor = vec4(mix(vec3(0.36, 0.88, 0.6), vec3(0.85, 1.0, 0.92), pulse), (0.06 + pulse * 0.8) * facing * uIntro);
      }`
  })));
  globe.rotation.z = 0.32;
  scene.add(globe);
  let introStart = -1;

  return {
    resize(view) {
      uniforms.uPixel.value = Math.min(window.devicePixelRatio || 1, 1.75);
      const radius = Math.min(view.halfW * 0.95, view.halfH * 1.25);
      globe.scale.setScalar(radius);
      globe.position.set(0, -view.halfH - radius * 0.5, 0);
    },
    update(delta, time) {
      if (introStart < 0) introStart = time;
      uniforms.uTime.value = time;
      uniforms.uIntro.value = smooth(0, 2.0, time - introStart);
      globe.rotation.y += delta * 0.06;
      globe.rotation.x = 0.25 + pointer.y * 0.06;
      scene.rotation.y = pointer.x * 0.1;
    }
  };
}

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start() {
  if (reducedMotion.matches || !webglAvailable()) return;
  let THREE;
  try {
    THREE = await import('./vendor/three/three.module.min.js');
  } catch {
    return; // CSS art and the 2D hero canvas remain as the fallback.
  }
  try {
    const { startMorph } = await import('./morph.js');
    startMorph(THREE, { reducedMotion, pointer, isCompact, easePointer });
  } catch (error) {
    console.warn('Morph field failed', error);
  }
  const jobs = [
    ['.hero', heroScene],
    ['.visual-break', assemblyScene],
    ['.contact', globeScene]
  ];
  for (const [selector, build] of jobs) {
    const host = document.querySelector(selector);
    if (!host) continue;
    try {
      createStage(THREE, host, build);
    } catch (error) {
      host.dataset.gl = 'off';
      if (selector === '.hero') announceHero('off');
      console.warn('Scene failed', selector, error);
    }
  }
}

// Load after the page is interactive so the hero image and text paint first.
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
if (document.readyState === 'complete') whenIdle(start);
else window.addEventListener('load', () => whenIdle(start), { once: true });
