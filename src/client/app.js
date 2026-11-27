(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 载入：Memento Mori 白屏 → 蓝潮覆盖 ---------- */
  const booting = document.documentElement.classList.contains('is-booting');
  const boot = $('#boot');
  if (booting) {
    let ended = false;
    const timers = [];
    const finish = () => {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
      document.documentElement.classList.remove('is-booting');
      try { sessionStorage.setItem('mm-boot', '1'); } catch (e) {}
    };
    // 首页进入封面会承担开场，两道全屏门不叠加
    let coverPending = false;
    try {
      coverPending = !!document.getElementById('entry-cover') && !sessionStorage.getItem('ts-entry-cover');
    } catch (e) { coverPending = !!document.getElementById('entry-cover'); }
    if (!boot || reduceMotion || coverPending) {
      finish();
    } else {
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      requestAnimationFrame(() => boot.classList.add('is-on'));
      at(1050, () => boot.classList.add('is-open'));
      at(1500, () => boot.classList.add('is-text-out'));
      at(2050, () => boot.classList.add('is-done'));
      at(2500, finish);
      const skip = () => finish();
      boot.addEventListener('click', skip);
      window.addEventListener('keydown', function onKey(e) {
        if (ended) { window.removeEventListener('keydown', onKey); return; }
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
      });
    }
  }

  /* ---------- 首页背景视频：只在桌面、非省流时加载 ---------- */
  const heroVideo = $('.wallpaper-video');
  if (heroVideo) {
    const wide = window.matchMedia('(min-width: 900px)').matches;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    if (reduceMotion || !wide || saveData) {
      heroVideo.removeAttribute('autoplay');
    } else {
      const src = heroVideo.dataset.src;
      if (src) {
        const s = document.createElement('source');
        s.src = src;
        s.type = 'video/mp4';
        heroVideo.appendChild(s);
        heroVideo.load();
        const playing = heroVideo.play();
        if (playing && playing.catch) playing.catch(() => {});
      }
    }
  }

  /* ---------- PWA：注册离线服务 ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(document.body.dataset.base + 'sw.js').catch(() => {});
    });
  }

  /* ---------- 首页时钟 ---------- */
  const clockTime = $('#home-clock-time');
  if (clockTime) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const clockDay = $('#home-clock-day');
    const clockDate = $('#home-clock-date');
    const tick = () => {
      const d = new Date();
      clockTime.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (clockDay) clockDay.textContent = days[d.getDay()];
      if (clockDate) clockDate.textContent = `${String(d.getMonth() + 1).padStart(2, '0')} / ${String(d.getDate()).padStart(2, '0')}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 首页顶栏：离开主视觉后转为实心玻璃 ---------- */
  const topbar = $('.topbar');
  const hero = $('.home-hero');
  if (topbar && hero) {
    const onScroll = () => {
      topbar.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------- 主题 ---------- */
  const themeBtn = $('#theme-toggle');
  const current = () => document.documentElement.dataset.theme || 'dark';
  const paintTheme = () => {
    if (!themeBtn) return;
    const dark = current() === 'dark';
    themeBtn.textContent = dark ? '☾' : '☀';
    const label = dark ? '切换到浅色主题' : '切换到深色主题';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
  };
  const root = document.documentElement;
  const syncThemeColor = (theme) => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.removeAttribute('media');
      m.setAttribute('content', theme === 'dark' ? '#081226' : '#f4f1e9');
    });
  };
  const applyTheme = (theme, persist = true) => {
    root.dataset.theme = theme;
    if (persist) { try { localStorage.setItem('lhj-theme', theme); } catch (e) {} }
    syncThemeColor(theme);
    paintTheme();
  };
  if (themeBtn) {
    paintTheme();
    syncThemeColor(current());
    themeBtn.addEventListener('click', (e) => {
      const next = current() === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        applyTheme(next);
        return;
      }
      const r = e.currentTarget.getBoundingClientRect();
      root.style.setProperty('--theme-x', `${r.left + r.width / 2}px`);
      root.style.setProperty('--theme-y', `${r.top + r.height / 2}px`);
      root.classList.add('theme-switching');
      const vt = document.startViewTransition(() => applyTheme(next));
      vt.finished.finally(() => root.classList.remove('theme-switching'));
    });
  }

  const navToggle = document.getElementById('nav-toggle');
  const navPanel = document.getElementById('nav-panel');
  if (navToggle && navPanel) {
    const setOpen = (open) => {
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
      navPanel.hidden = !open;
      root.classList.toggle('nav-panel-open', open);
      if (open) {
        const first = navPanel.querySelector('a');
        if (first) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
      } else {
        navToggle.focus({ preventScroll: true });
      }
    };
    navToggle.addEventListener('click', () => setOpen(navPanel.hidden));
    navPanel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !navPanel.hidden) setOpen(false); });
    const wide = window.matchMedia('(min-width: 901px)');
    if (wide.addEventListener) wide.addEventListener('change', (e) => { if (e.matches && !navPanel.hidden) setOpen(false); });
  }

  /* ---------- 代码块复制 ---------- */
  const legacyCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  };
  const copyFeedback = (btn, ok) => {
    btn.textContent = ok ? '已复制' : '复制失败';
    setTimeout(() => { btn.textContent = '复制'; }, 1400);
  };
  $$('.codeblock-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.codeblock').querySelector('pre').innerText;
      let ok = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { ok = false; }
      }
      if (!ok) ok = legacyCopy(code);
      copyFeedback(btn, ok);
    });
  });

  /* ---------- TOC 高亮 ---------- */
  const tocItems = $$('.toc-item');
  if (tocItems.length && 'IntersectionObserver' in window) {
    const map = new Map(tocItems.map((a) => [a.getAttribute('href').slice(1), a]));
    const heads = $$('h2[id], h3[id], h4[id]').filter((h) => map.has(h.id));
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
      });
      const active = heads.find((h) => visible.has(h.id));
      tocItems.forEach((a) => a.classList.remove('is-active'));
      if (active) map.get(active.id).classList.add('is-active');
    }, { rootMargin: '-84px 0px -70% 0px', threshold: [0, 1] });
    heads.forEach((h) => io.observe(h));
  }

  /* ---------- 侧栏筛选 ---------- */
  const filter = $('#side-filter');
  if (filter) {
    const groups = $$('.side-group');
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      groups.forEach((g) => {
        let hits = 0;
        $$('.side-note', g).forEach((a) => {
          const on = !q || a.textContent.toLowerCase().includes(q);
          a.style.display = on ? '' : 'none';
          if (on) hits++;
        });
        const nameHit = !q || g.querySelector('summary').textContent.toLowerCase().includes(q);
        g.style.display = hits || nameHit ? '' : 'none';
        if (q && hits) g.open = true;
      });
      $$('.side-section').forEach((label) => {
        let el = label.nextElementSibling;
        let any = false;
        while (el && !el.classList.contains('side-section')) {
          if (el.classList.contains('side-group') && el.style.display !== 'none') any = true;
          el = el.nextElementSibling;
        }
        label.style.display = any ? '' : 'none';
      });
    });
  }

  /* ---------- 搜索 ---------- */
  const overlay = $('#search-overlay');
  const input = $('#search-input');
  const results = $('#search-results');
  const openers = $$('#search-open, [data-search-open]');
  let index = null;
  let loading = null;
  let sel = 0;

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(document.body.dataset.searchIndex)
        .then((r) => r.json())
        .then((data) => { index = data; return data; })
        .catch(() => { index = { notes: [], projects: [] }; return index; });
    }
    return loading;
  }

  function score(doc, terms) {
    const title = doc.title.toLowerCase();
    const sec = (doc.sec || '').toLowerCase();
    const text = (doc.text || '').toLowerCase();
    const tags = (doc.tags || []).join(' ').toLowerCase();
    const alias = (doc.aliases || []).join(' ').toLowerCase();
    let s = 0;
    for (const t of terms) {
      const inText = text.includes(t);
      const inSec = sec.includes(t);
      const inTitle = title.includes(t);
      const inAlias = alias.includes(t);
      const inTags = tags.includes(t);
      if (!inText && !inSec && !inTitle && !inAlias && !inTags) return 0;
      if (title === t || sec === t) s += 34;
      else if (inTitle) s += 12;
      if (inAlias) s += 10;
      if (inSec) s += 7;
      if (inTags) s += 4;
      if (doc.index && terms.length === 1) s += 2;
      if (doc.lvl && doc.lvl <= 2) s += 1;
      let n = 0; let i = text.indexOf(t);
      while (i >= 0 && n < 6) { n++; i = text.indexOf(t, i + t.length); }
      s += n;
    }
    return s;
  }

  function snippet(doc, terms) {
    const text = doc.text || '';
    const lower = text.toLowerCase();
    let at = -1;
    for (const t of terms) {
      const i = secIndex(lower, t, doc.sec);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    if (at < 0) at = 0;
    const from = Math.max(0, at - 50);
    let out = text.slice(from, from + 170);
    if (from > 0) out = '…' + out;
    if (from + 170 < text.length) out += '…';
    return hi(out, terms);
  }

  function secIndex(lower, term, sec) {
    const body = lower.indexOf(term);
    const head = (sec || '').toLowerCase().indexOf(term);
    if (head >= 0 && (body < 0 || head <= body)) return 0;
    return body;
  }

  function render(q) {
    if (!index) return;
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { results.innerHTML = '<div class="search-empty">输入关键词开始搜索：命中会直接跳到对应小节</div>'; return; }
    const hits = index.notes
      .map((d) => ({ d, s: score(d, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const perNote = new Map();
    const picked = [];
    for (const h of hits) {
      const n = perNote.get(h.d.note) || 0;
      if (n >= 2) continue;
      perNote.set(h.d.note, n + 1);
      picked.push(h);
      if (picked.length >= 12) break;
    }
    const proj = index.projects
      .map((d) => ({ d, s: score({ title: d.title, sec: '', text: d.text, aliases: [], tags: [] }, terms) }))
      .filter((x) => x.s > 0)
      .slice(0, 3);
    const rows = picked.map(({ d }) => `<a class="sr-item" href="${d.href}">
        <div><span class="sr-title">${hi(d.title, terms)}</span><span class="sr-path">${esc(d.folder)}</span><span class="sr-kind">笔记</span></div>
        ${d.sec && d.sec !== d.title ? `<div class="sr-sec">${hi(d.sec, terms)}</div>` : ''}
        <div class="sr-snip">${snippet(d, terms)}</div></a>`)
      .concat(proj.map(({ d }) => `<a class="sr-item" href="${d.href}">
        <div><span class="sr-title">${hi(d.title, terms)}</span><span class="sr-kind">项目</span></div>
        <div class="sr-snip">${esc(d.text)}</div></a>`));
    if (!rows.length) { results.innerHTML = '<div class="search-empty">没有匹配的笔记</div>'; return; }
    results.innerHTML = rows.join('');
    sel = 0;
    markSel();
  }

  function hi(text, terms) {
    let out = esc(text);
    for (const t of terms) {
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, (m) => '<mark>' + m + '</mark>');
    }
    return out;
  }

  function markSel() {
    const items = $$('.sr-item', results);
    items.forEach((a, i) => a.classList.toggle('is-sel', i === sel));
    if (items[sel]) items[sel].scrollIntoView({ block: 'nearest' });
  }

  let lastOpener = null;
  function overlayFocusables() {
    return $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', overlay)
      .filter((el) => el.offsetParent !== null);
  }
  function open() {
    lastOpener = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    input.focus();
    load().then(() => render(input.value));
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastOpener && typeof lastOpener.focus === 'function') lastOpener.focus();
    lastOpener = null;
  }
  if (overlay && openers.length) {
    openers.forEach((btn) => btn.addEventListener('click', open));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      const items = $$('.sr-item', results);
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); markSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); markSel(); }
      else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); location.href = items[sel].href; }
    });
    document.addEventListener('keydown', (e) => {
      const typing = /input|textarea/i.test(document.activeElement.tagName);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
      else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && !overlay.hidden) close();
      else if (e.key === 'Tab' && !overlay.hidden) {
        // 焦点在对话框内循环，不落到被遮住的页面上
        const list = overlayFocusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- 滚动进度 ---------- */
  const progress = $('.progress');
  if (progress) {
    const updateProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      progress.style.width = max > 0 ? `${(doc.scrollTop / max) * 100}%` : '0%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  /* ---------- 滚动揭示（仅脚本可用时隐藏，避免脚本失败导致空白） ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = $$('.card, .home-kb-card, .home-work, .foldercard, .stat, .proj-module, .kb-group, .band > .panel, .event-card, .team-card');
    if (targets.length) {
      document.documentElement.classList.add('has-reveal');
      targets.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', `${Math.min(i % 6, 5) * 45}ms`);
      });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -28px 0px', threshold: 0.04 });
      targets.forEach((el) => io.observe(el));
    }
  }

  /* ---------- 数字滚动 ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const counters = $$('.stat-n, .game-hero-stats b, .home-stats b');
    if (counters.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          io.unobserve(el);
          const num = Number(el.textContent.trim().replace(/,/g, ''));
          if (!Number.isFinite(num)) return;
          const t0 = performance.now();
          const step = (t) => {
            const p = Math.min((t - t0) / 900, 1);
            el.textContent = Math.round(num * (1 - Math.pow(1 - p, 3))).toLocaleString('en');
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.5 });
      counters.forEach((el) => io.observe(el));
    }
  }

  /* ---------- 回到顶部 ---------- */
  const toTop = $('#back-to-top');
  if (toTop) {
    const syncTop = () => toTop.classList.toggle('is-visible', window.scrollY > 560);
    window.addEventListener('scroll', syncTop, { passive: true });
    syncTop();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  /* ---------- 磁吸主按钮 ---------- */
  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    $$('.btn-primary').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.1}px, ${(e.clientY - r.top - r.height / 2) * 0.16}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Hero 粒子（离屏暂停渲染） ---------- */
  const canvas = $('#hero-particles');
  if (canvas && !reduceMotion && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, visible = true;
    const dots = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const seed = () => {
      dots.length = 0;
      const n = Math.min(48, Math.round(w / 26));
      for (let i = 0; i < n; i++) dots.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.4 + 0.7,
      });
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(127, 212, 255, 0.38)'; ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 108) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(2, 158, 235, ${0.1 * (1 - dist / 108)})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      if (visible) raf = requestAnimationFrame(draw);
    };
    resize(); seed(); draw();
    window.addEventListener('resize', () => { resize(); seed(); });
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) draw();
    }).observe(canvas);
  }
})();
