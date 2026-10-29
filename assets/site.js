(() => {
  'use strict';

  function init() {
    const header = document.getElementById('header');
    const menu = document.querySelector('.menu');
    const navList = document.getElementById('site-links');
    const hero = document.querySelector('.hero');
    const orbit = document.querySelector('.signal-orbit');
    const signal = document.querySelector('.scroll-signal');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 761px)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

    function onMediaChange(query, callback) {
      if (query.addEventListener) query.addEventListener('change', callback);
      else query.addListener(callback);
    }

    // A disclosure menu keeps the same controls in every close path.
    if (menu && navList) {
      function setMenu(open, returnFocus = false) {
        menu.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.textContent = open ? '×' : '☰';
        navList.classList.toggle('mobile-open', open);
        if (returnFocus) menu.focus();
      }

      const isMenuOpen = () => menu.getAttribute('aria-expanded') === 'true';

      menu.addEventListener('click', () => setMenu(!isMenuOpen()));
      (header || navList).addEventListener('click', (event) => {
        if (event.target.closest('a')) setMenu(false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isMenuOpen()) {
          event.preventDefault();
          setMenu(false, true);
        }
      });
      document.addEventListener('pointerdown', (event) => {
        if (isMenuOpen() && !menu.contains(event.target) && !navList.contains(event.target)) {
          setMenu(false);
        }
      });
      onMediaChange(desktop, () => {
        if (desktop.matches) setMenu(false);
      });
      setMenu(false);
    }

    const navLinks = [...document.querySelectorAll('nav li a[href^="#"]')];
    const sections = [...document.querySelectorAll('main section[id]')];
    let viewportFrame = 0;
    let activeId = null;

    function updateViewport() {
      viewportFrame = 0;
      const viewportHeight = window.innerHeight;
      const scrollTop = Math.max(0, window.scrollY);
      const scrollRange = document.documentElement.scrollHeight - viewportHeight;
      if (signal) {
        const progress = scrollRange > 0 ? Math.min(1, scrollTop / scrollRange) : 0;
        signal.style.transform = `scaleX(${progress})`;
      }
      if (header) header.classList.toggle('scrolled', scrollTop > 16);

      // Track a reading line, so a section stays current even when it is taller
      // than the viewport or its content expands through a role disclosure.
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const readingLine = headerHeight + Math.min(160, (viewportHeight - headerHeight) * 0.25);
      let nextId = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top > readingLine) break;
        nextId = section.id;
      }
      if (nextId !== activeId) {
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${nextId}`) {
            link.setAttribute('aria-current', 'location');
          } else {
            link.removeAttribute('aria-current');
          }
        });
        activeId = nextId;
      }
    }

    function scheduleViewportUpdate() {
      if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
    }

    window.addEventListener('scroll', scheduleViewportUpdate, { passive: true });
    window.addEventListener('resize', scheduleViewportUpdate, { passive: true });
    window.addEventListener('load', scheduleViewportUpdate);
    window.addEventListener('pageshow', scheduleViewportUpdate);
    window.addEventListener('hashchange', scheduleViewportUpdate);
    document.addEventListener('toggle', scheduleViewportUpdate, true);
    if ('ResizeObserver' in window) {
      const layoutObserver = new ResizeObserver(scheduleViewportUpdate);
      layoutObserver.observe(document.body);
      if (header) layoutObserver.observe(header);
    }
    if (document.fonts) document.fonts.ready.then(scheduleViewportUpdate);
    updateViewport();

    const reveals = [...document.querySelectorAll('.reveal')];
    // Stagger order for items revealed inside each section (CSS reads --i).
    reveals.forEach((section) => {
      section.querySelectorAll('.index-card, .award, .cert-highlight, .community-card, .link-card, .principle')
        .forEach((item, index) => item.style.setProperty('--i', String(Math.min(index, 8))));
    });
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
      reveals.forEach((item) => revealObserver.observe(item));
    } else {
      reveals.forEach((item) => item.classList.add('is-visible'));
    }

    // Experience timeline: highlight the role at the reading line and mirror
    // its dates in the sticky aside. The rail fill tracks progress through it.
    const jobs = [...document.querySelectorAll('.job')];
    const jobsList = document.querySelector('.jobs');
    const railFill = document.querySelector('.jobs-rail i');
    const nowYear = document.querySelector('.exp-year');
    const nowRole = document.querySelector('.exp-role');
    let currentJob = null;
    function updateJobs() {
      if (!jobs.length || !jobsList) return;
      const line = window.innerHeight * 0.45;
      let next = jobs[0];
      for (const job of jobs) {
        if (job.getBoundingClientRect().top <= line) next = job;
      }
      const box = jobsList.getBoundingClientRect();
      if (railFill) {
        const progress = Math.min(1, Math.max(0, (line - box.top) / Math.max(1, box.height)));
        railFill.style.transform = `scaleY(${progress})`;
      }
      if (next === currentJob) return;
      currentJob?.classList.remove('is-current');
      next.classList.add('is-current');
      currentJob = next;
      const date = next.querySelector('.job-date')?.textContent.trim() || '';
      if (nowYear) nowYear.textContent = date;
      if (nowRole) nowRole.textContent = `${next.querySelector('h3')?.textContent.trim() || ''}, ${next.querySelector('.company')?.textContent.trim() || ''}`;
    }
    let jobsFrame = 0;
    const scheduleJobs = () => { if (!jobsFrame) jobsFrame = requestAnimationFrame(() => { jobsFrame = 0; updateJobs(); }); };
    window.addEventListener('scroll', scheduleJobs, { passive: true });
    window.addEventListener('resize', scheduleJobs, { passive: true });
    document.addEventListener('toggle', scheduleJobs, true);
    updateJobs();

    // Pointer movement only shifts the light; card movement belongs to CSS.
    const cards = [...document.querySelectorAll('.index-card')];
    const pointerEffectsEnabled = () => finePointer.matches && !reducedMotion.matches;

    function pointerPosition(element, event) {
      const bounds = element.getBoundingClientRect();
      return {
        x: Math.min(100, Math.max(0, (event.clientX - bounds.left) / bounds.width * 100)),
        y: Math.min(100, Math.max(0, (event.clientY - bounds.top) / bounds.height * 100))
      };
    }

    function resetHeroPointer() {
      if (hero) {
        hero.style.removeProperty('--mx');
        hero.style.removeProperty('--my');
      }
      if (orbit) {
        orbit.style.removeProperty('--field-x');
        orbit.style.removeProperty('--field-y');
      }
    }

    if (hero) {
      hero.addEventListener('pointermove', (event) => {
        if (!pointerEffectsEnabled()) return;
        const { x, y } = pointerPosition(hero, event);
        hero.style.setProperty('--mx', `${x}%`);
        hero.style.setProperty('--my', `${y}%`);
        if (orbit) {
          orbit.style.setProperty('--field-x', `${x}%`);
          orbit.style.setProperty('--field-y', `${y}%`);
        }
      }, { passive: true });
      hero.addEventListener('pointerleave', resetHeroPointer);
    }

    function resetCardPointer(card) {
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
    }

    cards.forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        if (!pointerEffectsEnabled()) return;
        const { x, y } = pointerPosition(card, event);
        card.style.setProperty('--spot-x', `${x}%`);
        card.style.setProperty('--spot-y', `${y}%`);
      }, { passive: true });
      card.addEventListener('pointerleave', () => resetCardPointer(card));
    });

    function resetPointerEffects() {
      if (!pointerEffectsEnabled()) {
        resetHeroPointer();
        cards.forEach(resetCardPointer);
      }
    }
    onMediaChange(reducedMotion, resetPointerEffects);
    onMediaChange(finePointer, resetPointerEffects);

    const canvas = document.getElementById('hero-vfx');
    let context = null;
    if (canvas) {
      try {
        context = canvas.getContext('2d');
      } catch {
        // Decorative effects must never prevent navigation or content access.
      }
    }
    if (!canvas || !hero || !context) return;

    const particles = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let canvasFrame = 0;
    let previousTime = 0;
    const initialBounds = hero.getBoundingClientRect();
    let heroVisible = initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;

    function canAnimate() {
      return heroVisible && !document.hidden && !reducedMotion.matches && hero.dataset.gl !== 'on' && width > 0 && height > 0;
    }

    function stopCanvas() {
      if (canvasFrame) cancelAnimationFrame(canvasFrame);
      canvasFrame = 0;
      previousTime = 0;
      canvas.dataset.running = '';
    }

    function drawCanvas(time) {
      canvasFrame = 0;
      if (!canAnimate()) {
        stopCanvas();
        return;
      }
      const step = previousTime ? Math.min((time - previousTime) / 16.667, 2) : 1;
      previousTime = time;
      const drift = time * 0.00035;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += (particle.vx + Math.sin(drift + particle.y * 0.01) * 0.11) * step;
        particle.y += (particle.vy + Math.cos(drift + particle.x * 0.01) * 0.07) * step;
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
        context.beginPath();
        context.fillStyle = `rgba(${particle.bright ? '145,195,255' : '53,208,127'},${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const first = particles[i];
          const second = particles[j];
          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (distance >= 82) continue;
          context.strokeStyle = `rgba(53,208,127,${0.12 * (1 - distance / 82)})`;
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.stroke();
        }
      }
      canvasFrame = requestAnimationFrame(drawCanvas);
    }

    function syncCanvas() {
      hero.dataset.visible = String(heroVisible);
      hero.dataset.motion = canAnimate() ? 'running' : 'paused';
      if (canAnimate()) {
        if (!canvasFrame) {
          canvas.dataset.running = 'true';
          canvasFrame = requestAnimationFrame(drawCanvas);
        }
      } else {
        stopCanvas();
        if (reducedMotion.matches) context.clearRect(0, 0, width, height);
      }
    }

    function sizeCanvas() {
      const nextWidth = hero.clientWidth;
      const nextHeight = hero.clientHeight;
      const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (nextWidth === width && nextHeight === height && nextRatio === pixelRatio) return;
      width = nextWidth;
      height = nextHeight;
      pixelRatio = nextRatio;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      particles.length = 0;
      const count = Math.min(96, Math.max(24, Math.floor(width / 13)));
      for (let i = 0; i < count; i++) {
        const bright = Math.random() > 0.84;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.8 + 0.35,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          alpha: bright ? Math.random() * 0.16 + 0.18 : Math.random() * 0.14 + 0.06,
          bright
        });
      }
      syncCanvas();
    }

    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        syncCanvas();
      }, { threshold: 0 });
      heroObserver.observe(hero);
    } else {
      window.addEventListener('scroll', () => {
        const bounds = hero.getBoundingClientRect();
        heroVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
        syncCanvas();
      }, { passive: true });
    }
    if ('ResizeObserver' in window) {
      const heroSizeObserver = new ResizeObserver(sizeCanvas);
      heroSizeObserver.observe(hero);
    }
    window.addEventListener('resize', sizeCanvas, { passive: true });
    document.addEventListener('visibilitychange', syncCanvas);
    window.addEventListener('pagehide', stopCanvas);
    window.addEventListener('pageshow', syncCanvas);
    onMediaChange(reducedMotion, syncCanvas);
    document.addEventListener('hero-gl', syncCanvas);
    sizeCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
