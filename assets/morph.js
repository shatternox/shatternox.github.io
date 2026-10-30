// Page-wide morphing particle field (Three.js). One fixed canvas sits behind
// the content below the hero. A single particle cloud travels between
// `.gl-anchor[data-shape]` elements and re-forms into each section's shape as
// the reader scrolls. Decorative only: hidden from assistive tech, disabled
// under reduced motion, and the page is complete without it.

const SHAPES = ['sphere', 'helix', 'constellation', 'knot', 'shield', 'clusters', 'rings'];
const FLAT = new Set(['shield', 'knot', 'clusters', 'constellation', 'helix']);

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Every shape fills `count` points in a unit-ish volume (radius about 1).
function buildShape(name, count) {
  const out = new Float32Array(count * 3);
  const rand = rng(SHAPES.indexOf(name) * 7919 + 17);
  const set = (i, x, y, z) => { out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z; };
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const t = i / count;
    switch (name) {
      case 'sphere': {
        // Fibonacci sphere with a thin equatorial ring: "a curious mind".
        if (i % 7 === 0) {
          const a = rand() * Math.PI * 2;
          const r = 1.42 + (rand() - 0.5) * 0.05;
          set(i, Math.cos(a) * r, (rand() - 0.5) * 0.03, Math.sin(a) * r);
        } else {
          const y = 1 - (i / (count - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const th = golden * i;
          set(i, Math.cos(th) * r, y, Math.sin(th) * r);
        }
        break;
      }
      case 'helix': {
        // Two strands joined by solid base-pair bars.
        const turns = 2.6 * Math.PI;
        const H = 2.4, Rh = 0.58;
        const pick = rand();
        if (pick < 0.42) {
          const u = rand();
          const a = u * turns + (i % 2) * Math.PI;
          const j = (rand() - 0.5) * 0.04;
          set(i, Math.cos(a) * Rh + j, (u - 0.5) * H, Math.sin(a) * Rh + j);
        } else {
          const rungs = 11;
          const k = (Math.floor(rand() * rungs) + 0.5) / rungs;
          const a = k * turns;
          const s = rand() * 2 - 1;
          const j = (rand() - 0.5) * 0.025;
          set(i, Math.cos(a) * Rh * s, (k - 0.5) * H + j, Math.sin(a) * Rh * s * 0.35);
        }
        break;
      }
      case 'constellation': {
        // Scattered nodes joined by faint trails: a public index of sources.
        const nodes = 9;
        const n = i % nodes;
        const nr = rng(n * 131 + 5);
        const nx = (nr() - 0.5) * 2.6, ny = (nr() - 0.5) * 1.8, nz = (nr() - 0.5) * 1.2;
        if (rand() < 0.45) {
          const r = Math.pow(rand(), 2) * 0.16;
          const a = rand() * Math.PI * 2, b = Math.acos(rand() * 2 - 1);
          set(i, nx + Math.sin(b) * Math.cos(a) * r, ny + Math.cos(b) * r, nz + Math.sin(b) * Math.sin(a) * r);
        } else {
          const m = (n + 1 + Math.floor(rand() * 2)) % nodes;
          const mr = rng(m * 131 + 5);
          const mx = (mr() - 0.5) * 2.6, my = (mr() - 0.5) * 1.8, mz = (mr() - 0.5) * 1.2;
          const f = rand();
          set(i, nx + (mx - nx) * f, ny + (my - ny) * f, nz + (mz - nz) * f);
        }
        break;
      }
      case 'knot': {
        // Trefoil knot tube: pressure, tension, a problem worked through.
        const u = t * Math.PI * 2;
        // (2,3) torus knot: reads as a clean trefoil from the front.
        const R0 = 0.72, r0 = 0.3;
        const rr = R0 + r0 * Math.cos(3 * u);
        const x = rr * Math.cos(2 * u), y = rr * Math.sin(2 * u), z = r0 * Math.sin(3 * u);
        const a = rand() * Math.PI * 2;
        const r = 0.11 * Math.sqrt(rand());
        set(i, x + Math.cos(a) * r, y + Math.sin(a) * r, z + Math.sin(a + 1.3) * r);
        break;
      }
      case 'shield': {
        // A faceted shield outline with an inner lattice: certified practice.
        const shape = (v) => {
          // Symmetric heater-shield outline: flat top, straight sides, curved
          // taper to a point. Sample one half, mirror for the other.
          const side = v < 0.5 ? -1 : 1;
          const q = (v < 0.5 ? v : v - 0.5) * 2;
          if (q < 0.25) return [side * (q / 0.25) * 0.85, 0.95];
          if (q < 0.55) return [side * 0.85, 0.95 - ((q - 0.25) / 0.3) * 0.75];
          const k = (q - 0.55) / 0.45;
          return [side * 0.85 * Math.cos(k * Math.PI / 2), 0.2 - Math.sin(k * Math.PI / 2) * 1.15];
        };
        const mode = rand();
        if (mode < 0.55) {
          const [x, y] = shape(rand());
          const layer = (Math.floor(rand() * 3) - 1) * 0.12;
          set(i, x * (1 + layer * 0.2), y * (1 + layer * 0.2), layer);
        } else {
          // Rejection-sample the interior; the bottom tapers to a point.
          let x = 0, y = 0;
          for (let tries = 0; tries < 40; tries++) {
            x = rand() * 1.7 - 0.85;
            y = rand() * 1.9 - 0.95;
            const halfWidth = y > 0.2 ? 0.85 : 0.85 * Math.cos(Math.asin(Math.min(1, (0.2 - y) / 1.15)));
            if (Math.abs(x) < halfWidth) break;
          }
          const gx = Math.round(x * 6) / 6, gy = Math.round(y * 6) / 6;
          const snap = rand() < 0.5;
          set(i, snap ? gx : x, snap ? y : gy, 0);
        }
        break;
      }
      case 'clusters': {
        // Four orbiting groups linked to a centre: communities and mentoring.
        const g = i % 5;
        if (g === 4) {
          const a = rand() * Math.PI * 2, b = Math.acos(rand() * 2 - 1), r = 0.22 * Math.cbrt(rand());
          set(i, Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r);
        } else {
          const ga = g * Math.PI / 2 + 0.4;
          const cx = Math.cos(ga) * 1.05, cy = Math.sin(ga) * 0.75, cz = Math.sin(ga * 2) * 0.3;
          if (rand() < 0.8) {
            const a = rand() * Math.PI * 2, b = Math.acos(rand() * 2 - 1), r = 0.32 * Math.cbrt(rand());
            set(i, cx + Math.sin(b) * Math.cos(a) * r, cy + Math.cos(b) * r, cz + Math.sin(b) * Math.sin(a) * r);
          } else {
            const f = rand();
            set(i, cx * f, cy * f, cz * f);
          }
        }
        break;
      }
      case 'rings': {
        // Interlocked rings: links out to the wider world.
        const k = i % 3;
        const a = rand() * Math.PI * 2;
        const r = 0.82 + (rand() - 0.5) * 0.06;
        let x = Math.cos(a) * r, y = Math.sin(a) * r, z = (rand() - 0.5) * 0.05;
        if (k === 1) { [x, z] = [x * Math.cos(1.1) - z * Math.sin(1.1), x * Math.sin(1.1) + z * Math.cos(1.1)]; x += 0.55; }
        if (k === 2) { [y, z] = [y * Math.cos(1.2) - z * Math.sin(1.2), y * Math.sin(1.2) + z * Math.cos(1.2)]; x -= 0.55; }
        set(i, x, y, z);
        break;
      }
      default: set(i, 0, 0, 0);
    }
  }
  return out;
}

export function startMorph(THREE, { reducedMotion, pointer, isCompact, easePointer }) {
  const anchors = [...document.querySelectorAll('.gl-anchor[data-shape]')].filter((el) => SHAPES.includes(el.dataset.shape));
  const hero = document.querySelector('.hero');
  if (!anchors.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'gl-morph';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  document.body.prepend(canvas);
  document.documentElement.dataset.morph = 'on';

  // Particle budget scales with the device; a frame-time probe can halve it later.
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const count = Math.round((isCompact() ? 6000 : 11000) * (weak ? 0.55 : 1));
  const shapeData = anchors.map((el) => buildShape(el.dataset.shape, count));
  const seeds = new Float32Array(count);
  const seedRand = rng(99);
  for (let i = 0; i < count; i++) seeds[i] = seedRand();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(shapeData[0].slice(), 3));
  geometry.setAttribute('aFrom', new THREE.BufferAttribute(shapeData[0].slice(), 3));
  geometry.setAttribute('aTo', new THREE.BufferAttribute(shapeData[0].slice(), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMix: { value: 0 },
    uPixel: { value: 1 },
    uAlpha: { value: 0 },
    uScatter: { value: 0 },
    uScale: { value: 1 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uMix, uPixel, uScatter, uScale;
      attribute vec3 aFrom, aTo;
      attribute float aSeed;
      varying float vDepth, vSeed;
      vec3 noise3(float s, float t) {
        return vec3(sin(t * 0.7 + s * 43.0), cos(t * 0.6 + s * 71.0), sin(t * 0.5 + s * 19.0));
      }
      void main() {
        // Stagger each particle so the transition ripples instead of snapping.
        float local = smoothstep(aSeed * 0.25, aSeed * 0.25 + 0.75, uMix);
        vec3 p = mix(aFrom, aTo, local);
        float lift = sin(local * 3.14159);
        p += noise3(aSeed, uTime) * (0.008 + lift * 0.16 + uScatter * 0.5);
        p *= uScale;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vDepth = clamp((mv.z + 10.0) / (2.0 * uScale) + 0.5, 0.0, 1.0);
        vSeed = aSeed;
        gl_PointSize = uPixel * (1.8 + aSeed * 1.2) * (10.0 / -mv.z) * mix(0.8, 1.3, vDepth);
      }`,
    fragmentShader: /* glsl */`
      uniform float uAlpha;
      varying float vDepth, vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 base = vec3(0.3, 0.92, 0.6);
        vec3 hot = vec3(0.78, 1.0, 0.88);
        vec3 col = mix(base, hot, step(0.93, vSeed) * 0.8);
        gl_FragColor = vec4(col * mix(0.75, 1.2, vDepth), a * a * uAlpha * mix(0.3, 1.0, vDepth));
      }`
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  const scene = new THREE.Scene();
  scene.add(group);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  let width = 1, height = 1, halfH = 1, halfW = 1;
  let degraded = false, probeTime = 0, probeFrames = 0;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setPixelRatio(degraded ? 1 : Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    uniforms.uPixel.value = Math.min(window.devicePixelRatio || 1, 1.6) * (isCompact() ? 1.1 : 1.25);
  }

  // Convert an anchor's viewport rect to world-space centre and radius.
  function anchorFrame(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return {
      x: (cx / width) * 2 * halfW - halfW,
      y: -((cy / height) * 2 * halfH - halfH),
      s: (Math.min(r.width, r.height) / height) * halfH * 0.72,
      dist: Math.abs(cy - height / 2),
      top: r.top,
      bottom: r.bottom,
      alpha: Number(el.dataset.alpha || 1),
      visible: r.width > 0 && r.height > 0
    };
  }

  let fromIndex = 0, toIndex = 0, mixValue = 1, mixTarget = 1;
  const pos = new THREE.Vector3(), target = new THREE.Vector3();
  let scale = 1, targetScale = 1, alpha = 0, targetAlpha = 0, spin = 0;
  const fromAttr = geometry.attributes.aFrom, toAttr = geometry.attributes.aTo;

  function retarget(next) {
    if (next === toIndex) return;
    // Freeze the current blend as the new origin so nothing jumps mid-flight.
    const f = fromAttr.array, t = toAttr.array;
    const m = mixValue;
    for (let i = 0; i < count; i++) {
      const local = Math.min(1, Math.max(0, (m - seeds[i] * 0.25) / 0.75));
      const e = local * local * (3 - 2 * local);
      for (let k = 0; k < 3; k++) f[i * 3 + k] = f[i * 3 + k] + (t[i * 3 + k] - f[i * 3 + k]) * e;
    }
    t.set(shapeData[next]);
    fromAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    fromIndex = toIndex;
    toIndex = next;
    mixValue = 0;
    mixTarget = 1;
  }

  let frame = 0, last = 0, elapsed = 0, lost = false;
  function tick(time) {
    frame = 0;
    if (lost || document.hidden || reducedMotion.matches) return;
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0.016;
    last = time;
    elapsed += dt;
    easePointer(time, dt);

    // Pick the anchor nearest the viewport centre. The cloud is pinned to it
    // (it scrolls with its section) and fades out as the anchor leaves the
    // middle of the screen, so it never floats over dividers or cards.
    let best = -1, bestDist = Infinity;
    const frames = anchors.map(anchorFrame);
    frames.forEach((fr, i) => {
      if (fr.visible && fr.bottom > 0 && fr.top < height && fr.dist < bestDist) { best = i; bestDist = fr.dist; }
    });
    const heroBox = hero ? hero.getBoundingClientRect() : null;
    const heroCover = heroBox ? Math.min(1, Math.max(0, heroBox.bottom / height)) : 0;

    let switched = false;
    if (best >= 0) {
      switched = best !== toIndex;
      retarget(best);
      const fr = frames[toIndex];
      target.set(fr.x, fr.y, 0);
      targetScale = Math.max(0.6, fr.s);
      const centred = 1 - Math.min(1, Math.max(0, (fr.dist - height * 0.22) / (height * 0.3)));
      targetAlpha = centred * 1.25 * fr.alpha * (1 - heroCover);
    } else {
      targetAlpha = 0;
    }

    // Snap position when the cloud is invisible (switching sections), track
    // tightly otherwise so it reads as part of the page, not a floating cursor.
    if (switched && alpha < 0.08) { pos.copy(target); scale = targetScale; }
    const k = 1 - Math.exp(-dt * 16);
    pos.lerp(target, k);
    scale += (targetScale - scale) * k;
    alpha += (targetAlpha - alpha) * (1 - Math.exp(-dt * 6));
    mixValue = Math.min(mixTarget, mixValue + dt * 1.4);
    spin += dt * 0.12;

    // Frame-time probe: on slow devices, draw half the particles at 1x DPR.
    if (!degraded && alpha > 0.1) {
      probeTime += dt; probeFrames++;
      if (probeFrames === 90) {
        if (probeTime / probeFrames > 0.026) {
          degraded = true;
          geometry.setDrawRange(0, Math.floor(count / 2));
          renderer.setPixelRatio(1);
          renderer.setSize(width, height, false);
        }
      }
    }

    group.position.copy(pos);
    // Flat emblems sway instead of spinning so their silhouette stays legible.
    const sway = FLAT.has(anchors[toIndex].dataset.shape);
    group.rotation.y = (sway ? Math.sin(spin * 2.2) * 0.45 : spin) + pointer.x * 0.35;
    group.rotation.x = (sway ? 0.05 : 0.18) + pointer.y * 0.2;
    uniforms.uTime.value = elapsed;
    uniforms.uMix.value = mixValue;
    uniforms.uScale.value = scale;
    uniforms.uAlpha.value = alpha;
    canvas.style.opacity = alpha > 0.01 ? '1' : '0';
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    const run = !lost && !document.hidden && !reducedMotion.matches;
    document.documentElement.dataset.morph = run || document.hidden ? 'on' : 'off';
    if (run && !frame) { last = 0; frame = requestAnimationFrame(tick); }
    if (!run && frame) { cancelAnimationFrame(frame); frame = 0; }
  }

  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; sync(); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); sync(); });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener?.('change', sync);
  resize();
  // Start already formed at the first anchor so the first reveal is clean.
  const f0 = anchorFrame(anchors.find((el) => el.getBoundingClientRect().width > 0) || anchors[0]);
  pos.set(f0.x, f0.y, 0);
  target.copy(pos);
  scale = targetScale = Math.max(0.6, f0.s);
  sync();
  return { canvas };
}
