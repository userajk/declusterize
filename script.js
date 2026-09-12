/* ============================================================
   ClearDigit — interactions
   ============================================================ */
(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     Ambient telemetry field — drifting nodes + proximity links
     ============================================================ */
  (function bgField() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes, raf;
    const COUNT = 56;        // modest count for performance
    const MAX_DIST = 132;    // link distance
    const COLORS = ['16,185,129', '14,165,233'];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(innerWidth * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
    };
    const seed = () => {
      nodes = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18 * dpr,
        vy: (Math.random() - 0.5) * 0.18 * dpr,
        c: COLORS[Math.random() < 0.5 ? 0 : 1],
        r: (Math.random() * 1.4 + 0.6) * dpr
      }));
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const d = Math.hypot(dx, dy);
          if (d < MAX_DIST * dpr) {
            ctx.strokeStyle = `rgba(${n.c}, ${0.12 * (1 - d / (MAX_DIST * dpr))})`;
            ctx.lineWidth = dpr * 0.6;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(${n.c}, 0.5)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize(); seed(); tick();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { cancelAnimationFrame(raf); resize(); seed(); tick(); }, 200); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else tick();
    });
  })();

  /* ---------- Sticky header shadow ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const toggleMenu = (force) => {
    const open = force !== undefined ? force : !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  };
  hamburger.addEventListener('click', () => toggleMenu());
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if (reduceMotion) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
    // Safety net: never leave content hidden if the observer is throttled/unsupported
    window.addEventListener('load', () => setTimeout(() => reveals.forEach(el => el.classList.add('in')), 1600));
  }

  /* ---------- Animate progress bars + circular meter when visible ---------- */
  const animateProgress = () => {
    $$('.spark').forEach(s => s.classList.add('in'));
    $$('[data-progress]').forEach(bar => {
      if (!bar.dataset.done) { bar.style.width = bar.dataset.progress + '%'; bar.dataset.done = '1'; }
    });
    $$('[data-circ]').forEach(circle => {
      if (circle.dataset.done) return;
      const r = circle.r.baseVal.value;
      const c = 2 * Math.PI * r;
      const pct = Number(circle.dataset.circ);
      circle.style.strokeDasharray = c;
      circle.style.strokeDashoffset = c;
      // force reflow so the transition runs
      void circle.getBoundingClientRect();
      circle.style.strokeDashoffset = c * (1 - pct / 100);
      circle.dataset.done = '1';
    });
  };
  const progIO = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) animateProgress(); });
  }, { threshold: 0.4 });
  $$('[data-progress], [data-circ]').forEach(el => progIO.observe(el.closest('section') || el));

  /* ---------- Dashboard checkbox: live progress ---------- */
  const dash = $('.dash');
  if (dash) {
    const bar = $('[data-progress]', dash);
    const pctLabel = $('.progress-pct', dash);
    const chartPct = $('.chart-pct', dash);
    const checks = $$('.check', dash);
    const recompute = () => {
      const done = checks.filter(c => c.checked).length;
      const pct = Math.round((done / checks.length) * 100);
      bar.dataset.progress = pct;
      bar.style.width = pct + '%';
      if (pctLabel) pctLabel.textContent = pct + '%';
      if (chartPct) chartPct.textContent = pct + '%';
    };
    checks.forEach(c => c.addEventListener('change', () => {
      c.closest('.task').classList.toggle('done', c.checked);
      recompute();
    }));
  }

  /* ---------- Count-up numbers ---------- */
  const countEl = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const raw = el.dataset.count;
    const target = parseFloat(raw);
    const decimals = (raw.split('.')[1] || '').length;
    const suffix = el.dataset.suffix || '';
    const fmt = (v) => (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()) + suffix;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const dur = 1400, t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  };
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { countEl(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Card spotlight (cursor-tracking glow) ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });

    /* ---------- Dashboard 3D tilt ---------- */
    const wrap = $('.dash-wrap');
    const dashEl = wrap && $('.dash', wrap);
    if (dashEl) {
      let frame = null;
      wrap.addEventListener('pointermove', (e) => {
        const r = wrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          dashEl.style.transform = `rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateZ(0)`;
        });
      });
      wrap.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        dashEl.style.transform = '';
      });
    }
  }

  /* ---------- Scroll progress beam ---------- */
  const scrollBar = $('#scrollProgress');
  if (scrollBar) {
    const updateBar = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      scrollBar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
  }

  /* ============================================================
     ONBOARDING QUIZ
     ============================================================ */
  const overlay = $('#quizModal');
  const steps = $$('.quiz-step', overlay);
  const segs = $$('.quiz-progress .seg', overlay);
  let current = 0;
  let lastFocused = null;

  const showStep = (i) => {
    current = i;
    steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === i));
    // progress segments (intro=0 fills first seg; final keeps all)
    segs.forEach((seg, idx) => seg.classList.toggle('active', idx <= Math.min(i, segs.length - 1)));
    const active = steps.find(s => Number(s.dataset.step) === i);
    const focusTarget = $('.opt, [data-next], [data-open-dashboard]', active);
    if (focusTarget) focusTarget.focus();
  };

  const openQuiz = () => {
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    showStep(0);
  };
  const closeQuiz = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  };

  $$('[data-open-quiz]').forEach(b => b.addEventListener('click', openQuiz));
  $('#quizClose').addEventListener('click', closeQuiz);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeQuiz(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeQuiz();
  });

  // Option selection (single-select per step)
  steps.forEach(step => {
    const opts = $$('.opt', step);
    const nextBtn = $('[data-next], [data-finish]', step);
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        opts.forEach(o => { o.classList.remove('selected'); o.setAttribute('aria-checked', 'false'); });
        opt.classList.add('selected');
        opt.setAttribute('aria-checked', 'true');
        if (nextBtn) nextBtn.disabled = false;
      });
    });
  });

  // Navigation
  $$('[data-next]', overlay).forEach(b => b.addEventListener('click', () => showStep(current + 1)));
  $$('[data-back]', overlay).forEach(b => b.addEventListener('click', () => showStep(current - 1)));
  $('[data-finish]', overlay).addEventListener('click', () => showStep(4)); // final screen
  $('[data-open-dashboard]', overlay).addEventListener('click', () => {
    closeQuiz();
    const hero = $('.dash');
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      hero.animate(
        [{ boxShadow: 'var(--glow-teal)' }, { boxShadow: '0 0 0 4px rgba(78,205,196,.4), var(--shadow-lg)' }, { boxShadow: 'var(--shadow-lg)' }],
        { duration: 1100, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
    }
  });

  // Simple focus trap inside the modal
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = $$('button, [href], input, [tabindex]:not([tabindex="-1"])', overlay)
      .filter(el => el.offsetParent !== null && !el.disabled);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
