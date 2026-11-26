/* motion.js —— 增量动效层：滚动揭示 / 首页项目悬停预览 / 编辑式跑马灯
   纯原生实现，不接管滚动、不替换光标；重复执行安全（幂等）。 */
(function () {
  'use strict';

  // 同一文档内只执行一次：重复注入或恢复执行时直接退出
  if (window.__tsMotionLayer) return;
  window.__tsMotionLayer = true;

  const root = document.documentElement;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const onMediaChange = (mq, fn) => {
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', fn);
    else if (typeof mq.addListener === 'function') mq.addListener(fn);
  };

  /* ====================================================================
     01 滚动揭示
     ==================================================================== */

  const REVEAL_SELECTOR = '.home-section, .home-work, .home-kb-card, .band, .card, .game-card, .event-card, .team-card';
  let revealObserver = null;

  function startReveal() {
    if (!('IntersectionObserver' in window)) return;
    const targets = $$(REVEAL_SELECTOR);
    if (!targets.length) return;

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-inview');
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0 }
      );
    }

    targets.forEach((el) => {
      el.classList.add('ts-reveal');
      if (!el.classList.contains('is-inview')) revealObserver.observe(el);
    });

    // 只在确有需要揭示的目标时挂类；无 JS 或减少动效时保持原样可见
    root.classList.add('ts-motion');
  }

  function stopReveal() {
    root.classList.remove('ts-motion');
    if (revealObserver) revealObserver.disconnect();
    $$('.ts-reveal.is-inview').forEach((el) => el.classList.remove('is-inview'));
  }

  if (!reduceMQ.matches) startReveal();

  onMediaChange(reduceMQ, (e) => {
    if (e.matches) stopReveal();
    else startReveal();
  });

  // 客户端渲染的卡片（游戏库 / 电竞）晚于本脚本插入，补一次标记与观察
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((records) => {
      if (reduceMQ.matches) return;
      let found = false;
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(REVEAL_SELECTOR)) found = true;
          else if (node.querySelector && node.querySelector(REVEAL_SELECTOR)) found = true;
        });
      });
      if (found) startReveal();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ====================================================================
     02 首页项目悬停预览
     ==================================================================== */

  function setupPreview() {
    if (!document.body.classList.contains('home')) return;
    if (!document.getElementById('works')) return;
    if (!hoverMQ.matches) return;
    if (document.getElementById('ts-preview')) return;

    const works = $$('.home-work');
    if (!works.length) return;

    const panel = document.createElement('div');
    panel.className = 'ts-preview';
    panel.id = 'ts-preview';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="ts-preview-head"><span class="ts-preview-no"></span><span class="ts-preview-cat"></span></div>' +
      '<p class="ts-preview-title"></p>' +
      '<p class="ts-preview-desc"></p>';
    document.body.appendChild(panel);

    const noEl = panel.querySelector('.ts-preview-no');
    const catEl = panel.querySelector('.ts-preview-cat');
    const titleEl = panel.querySelector('.ts-preview-title');
    const descEl = panel.querySelector('.ts-preview-desc');

    let current = null;
    let visible = false;
    let rafId = 0;
    let curX = 0;
    let curY = 0;
    let tgtX = 0;
    let tgtY = 0;
    let panelW = 0;
    let panelH = 0;

    const textOf = (el, sel) => {
      const node = el.querySelector(sel);
      return node ? (node.textContent || '').trim() : '';
    };

    function frame() {
      rafId = 0;
      curX += (tgtX - curX) * 0.16;
      curY += (tgtY - curY) * 0.16;
      panel.style.transform = 'translate3d(' + curX.toFixed(2) + 'px, ' + curY.toFixed(2) + 'px, 0)';
      if (visible && (Math.abs(tgtX - curX) > 0.4 || Math.abs(tgtY - curY) > 0.4)) {
        rafId = requestAnimationFrame(frame);
      }
    }

    // 计算目标点并限制在视口内，避免被裁切
    function aim(x, y, snap) {
      const gap = 20;
      const edge = 14;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let nx = x + gap;
      let ny = y + gap;

      if (nx + panelW > vw - edge) nx = x - panelW - gap;
      if (nx < edge) nx = edge;
      if (ny + panelH > vh - edge) ny = y - panelH - gap;
      if (ny < edge) ny = edge;

      tgtX = nx;
      tgtY = ny;

      if (snap) {
        curX = nx;
        curY = ny;
        panel.style.transform = 'translate3d(' + nx + 'px, ' + ny + 'px, 0)';
      }
      if (!rafId) rafId = requestAnimationFrame(frame);
    }

    function show(el, x, y) {
      if (current === el) return;
      if (reduceMQ.matches || !hoverMQ.matches) return;

      current = el;
      noEl.textContent = textOf(el, '.hw-no');
      catEl.textContent = textOf(el, '.hw-cat');
      titleEl.textContent = textOf(el, 'h3');
      descEl.textContent = textOf(el, 'p');

      panel.classList.add('is-on');
      panelW = panel.offsetWidth || 300;
      panelH = panel.offsetHeight || 120;
      visible = true;
      aim(x, y, true);
    }

    function hide() {
      if (!visible && !current) return;
      visible = false;
      current = null;
      panel.classList.remove('is-on');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    works.forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        show(el, e.clientX, e.clientY);
      }, { passive: true });
      el.addEventListener('pointerleave', hide, { passive: true });
    });

    window.addEventListener('pointermove', (e) => {
      if (visible) aim(e.clientX, e.clientY, false);
    }, { passive: true });

    // 滚动 / 失焦时收起，避免浮层停留在错误位置
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('blur', hide, { passive: true });
    window.addEventListener('resize', () => {
      panelW = 0;
      panelH = 0;
      hide();
    }, { passive: true });

    onMediaChange(reduceMQ, (e) => { if (e.matches) hide(); });
    onMediaChange(hoverMQ, (e) => { if (!e.matches) hide(); });
  }

  /* ====================================================================
     03 首页编辑式跑马灯
     ==================================================================== */

  function setupMarquee() {
    if (!document.body.classList.contains('home')) return;
    if (document.querySelector('.ts-marquee')) return;

    const hero = document.querySelector('.home-hero');
    const works = document.getElementById('works');
    if (!hero || !works) return;

    const words = ['TURBO SPARK', 'SELECTED WORKS', 'KNOWLEDGE BASE', 'ARCHIVE', '2026'];

    // 一组内容重复两遍；两组结构完全一致，保证 -50% 位移后无缝衔接
    const makeGroup = () => {
      const group = document.createElement('div');
      group.className = 'ts-marquee-group';
      for (let round = 0; round < 2; round++) {
        words.forEach((word) => {
          const item = document.createElement('span');
          item.className = 'ts-marquee-item';
          item.textContent = word;
          group.appendChild(item);
        });
      }
      return group;
    };

    const bar = document.createElement('div');
    bar.className = 'ts-marquee';
    bar.setAttribute('aria-hidden', 'true');

    const track = document.createElement('div');
    track.className = 'ts-marquee-track';
    track.appendChild(makeGroup());
    track.appendChild(makeGroup());
    bar.appendChild(track);

    // 插在首屏主视觉之后、精选项目之前
    hero.insertAdjacentElement('afterend', bar);
  }

  setupMarquee();
  setupPreview();
})();
