// Decorative Three.js orbit: isolated from content, lazy loaded, disposable.
import * as THREE from './three.module.js';

const host = document.querySelector('.hero-three');
const section = document.querySelector('.hero');

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
if (host && section && !reduce.matches && !matchMedia('(prefers-reduced-data: reduce)').matches) {
  let renderer, observer, resizeObserver, frame = 0, running = false, visible = false;
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    camera.position.set(0, 0, 9);
    const group = new THREE.Group();
    group.position.set(1.8, 0, 0);
    scene.add(group);
    for (const [radius, tilt, color, opacity] of [
      [1.7, 0.45, 0x4d80ff, 0.78],
      [1.38, -0.65, 0x00e0ff, 0.72],
      [1.05, 1.15, 0x7aa8ff, 0.63],
      [0.75, -1.1, 0x00e0ff, 0.54]
    ]) {
      const material = new THREE.MeshBasicMaterial({color, transparent:true, opacity, depthWrite:false});
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.013, 5, 180), material);
      ring.rotation.x = tilt;
      group.add(ring);
    }
    // Short data-like spokes imply structure without copying a certificate or dashboard.
    const vertices = [];
    for (let i = 0; i < 40; i++) {
      const angle = i * Math.PI * 2 / 40;
      const radius = i % 5 === 0 ? 1.88 : 1.78;
      vertices.push(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0,
                    Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }
    const spokes = new THREE.BufferGeometry();
    spokes.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const lines = new THREE.LineSegments(spokes, new THREE.LineBasicMaterial({color:0x79baff, transparent:true, opacity:0.23}));
    group.add(lines);
    renderer = new THREE.WebGLRenderer({alpha:true, antialias:false, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    host.append(renderer.domElement);
    const resize = () => {
      const {width, height} = section.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 700 ? 10 : 9;
      group.position.x = width < 700 ? -1 : 2.4;
      group.position.y = width < 700 ? -1.5 : 0;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const tick = () => {
      if (!running) return;
      group.rotation.y += 0.0015;
      group.rotation.z += 0.00035;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      const shouldRun = visible && !document.hidden && !reduce.matches;
      if (shouldRun === running) return;
      running = shouldRun;
      if (running) frame = requestAnimationFrame(tick);
      else cancelAnimationFrame(frame);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);
    observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; sync();});
    observer.observe(section);
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', sync);
    resize();
    host.classList.add('is-ready');
    section.classList.add('has-three');
    host.dataset.renderer = 'three';
    renderer.domElement.addEventListener('webglcontextlost', e => {
      e.preventDefault(); running = false; cancelAnimationFrame(frame);
      host.classList.remove('is-ready'); section.classList.remove('has-three'); host.dataset.renderer = 'fallback';
    });
  } catch (error) {
    // Preserve the authored still artwork if GPU initialization fails.
    cancelAnimationFrame(frame);
    observer?.disconnect(); resizeObserver?.disconnect();
    renderer?.dispose(); renderer?.domElement.remove();
    host.classList.remove('is-ready'); section.classList.remove('has-three'); host.dataset.renderer = 'fallback';
  }
}
