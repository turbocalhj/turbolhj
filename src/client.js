(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 载入动画 ---------- */
  const booting = document.documentElement.classList.contains('is-booting');
  const loader = $('#p3r-loader');
  const endBoot = () => {
    document.documentElement.classList.remove('is-booting');
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    try { sessionStorage.setItem('p3r-booted', '1'); } catch (e) {}
  };

  if (booting) {
    const fill = $('#p3r-loader-fill');
    const pct = $('#p3r-loader-pct');
    if (!loader || reduceMotion) {
      endBoot();
    } else {
      const started = performance.now();
      const duration = 1150;
      const step = (now) => {
        const t = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const n = Math.round(eased * 100);
        if (fill) fill.style.width = n + '%';
        if (pct) pct.textContent = String(n).padStart(2, '0');
        if (t < 1) { requestAnimationFrame(step); return; }
        loader.classList.add('is-exit');
        setTimeout(endBoot, 760);
      };
      requestAnimationFrame(step);
      setTimeout(() => {
        if (document.documentElement.classList.contains('is-booting')) endBoot();
      }, 6000);
    }
  }

  /* ---------- 顶栏时钟 ---------- */
  const clockTime = $('#p3r-clock-time');
  const clockDay = $('#p3r-clock-day');
  const clockDate = $('#p3r-clock-date');
  if (clockTime) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const tickClock = () => {
      const d = new Date();
      clockTime.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (clockDay) clockDay.textContent = days[d.getDay()];
      if (clockDate) clockDate.textContent = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------- 页面切换：P3R 斜切转场 ---------- */
  const transition = $('#p3r-transition');
  document.addEventListener('click', (e) => {
    if (reduceMotion || !transition || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault();
    transition.classList.add('is-active');
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = u.href; }, 620);
  });
  window.addEventListener('pageshow', () => {
    if (!transition) return;
    transition.classList.remove('is-active');
    document.body.classList.remove('is-leaving');
  });

  /* ---------- 自定义光标 ---------- */
  const cursor = $('#p3r-cursor');
  if (cursor && !reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;
    window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const follow = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
    const hot = 'a, button, .card, .p3r-work, .p3r-menu-item, input, textarea, [role="button"]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(hot)) cursor.classList.add('is-hot');
    });
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget || !(e.relatedTarget.closest && e.relatedTarget.closest(hot))) cursor.classList.remove('is-hot');
    });
  }

  /* ---------- 卡片聚光跟随 ---------- */
  $$('.card, .foldercard, .p3r-work, .pager-item, .flist-item').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- 主题 ---------- */
  const themeBtn = $('#theme-toggle');
  const current = () => document.documentElement.dataset.theme || 'dark';
  const paintTheme = () => { if (themeBtn) themeBtn.textContent = current() === 'dark' ? '☾' : '☀'; };
  if (themeBtn) {
    paintTheme();
    themeBtn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('lhj-theme', next); } catch (e) {}
      paintTheme();
    });
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

  function open() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    input.focus();
    load().then(() => render(input.value));
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
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
      if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && !overlay.hidden) close();
    });
  }
})();
