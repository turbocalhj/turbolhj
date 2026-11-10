import { escapeHtml } from './markdown.js';

export function urlJoin(...parts) {
  const joined = parts
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter((p) => p.length)
    .join('/');
  return '/' + joined;
}

export function makeUrl(base) {
  const clean = base === '/' ? '' : `/${String(base).replace(/^\/+|\/+$/g, '')}`;
  return (...parts) => {
    const segs = parts.flat().map((s) => encodeURIComponent(String(s)));
    return clean + (segs.length ? '/' + segs.join('/') : '/');
  };
}

const NAV = [
  { key: 'home', en: 'RELOAD', label: '主页', file: 'index.html' },
  { key: 'archive', en: 'ARCHIVE', label: '档案库', file: 'archive.html' },
];
const ARCHIVE_SECTIONS = ['archive', 'projects', 'knowledge', 'about'];

export function renderPage({ ctx, title, desc, section, content, sidebar, toc, breadcrumb, bodyClass = '' }) {
  const { url } = ctx;
  const pageHref = (file) => url(file.split('/').filter(Boolean));
  const nav = NAV.map((n) => {
    const active = n.key === section || (n.key === 'archive' && ARCHIVE_SECTIONS.includes(section));
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${pageHref(n.file)}"${active ? ' aria-current="page"' : ''}><span class="nav-en">${n.en}</span><span class="nav-cn">${n.label}</span></a>`;
  }).join('');

  const tocHtml = toc && toc.length
    ? `<aside class="toc" aria-label="目录"><div class="toc-title">目录</div><nav class="toc-list">${toc
        .map((t) => `<a class="toc-item lv${t.level}" href="#${t.id}">${escapeHtml(t.text)}</a>`)
        .join('')}</nav></aside>`
    : '';

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc || ctx.profile.site.description)}">
<link rel="stylesheet" href="${url('assets', 'app.css')}">
<link rel="icon" href="${url('assets', 'favicon.svg')}">
<meta name="theme-color" content="#08103a">
<script>try{var t=localStorage.getItem('lhj-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}</script>
<script>try{if(!sessionStorage.getItem('p3r-booted'))document.documentElement.classList.add('is-booting');}catch(e){document.documentElement.classList.add('is-booting');}</script>
</head>
<body class="section-${section} ${bodyClass}" data-base="${url()}" data-search-index="${url('assets', 'search-index.json')}">
<div class="p3r-loader" id="p3r-loader" aria-hidden="true">
  <div class="p3r-loader-grid"></div>
  <div class="p3r-loader-core">
    <div class="p3r-loader-crest">
      <span class="p3r-loader-ring"></span>
      <svg viewBox="0 0 140 140" role="presentation">
        <defs>
          <linearGradient id="p3r-boot-moon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#d9f6ff"/>
            <stop offset=".5" stop-color="#6f9bff"/>
            <stop offset="1" stop-color="#1a3ac4"/>
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="64" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 7" opacity=".55"/>
        <path d="M90 15a54 54 0 1 0 35 35 42 42 0 1 1-35-35Z" fill="url(#p3r-boot-moon)"/>
        <path d="M112 30l3.2 8.6L124 42l-8.8 3.4L112 54l-3.2-8.6L100 42l8.8-3.4Z" fill="#eef8ff"/>
      </svg>
    </div>
    <p class="p3r-loader-kicker">PERSONA 3 RELOAD <b>//</b> ARCHIVE SYSTEM</p>
    <p class="p3r-loader-title">LOADING<span class="p3r-loader-dots">...</span></p>
    <div class="p3r-loader-bar"><i id="p3r-loader-fill"></i></div>
    <div class="p3r-loader-meta"><span>INITIALIZING DARK HOUR</span><b id="p3r-loader-pct">00</b></div>
  </div>
  <div class="p3r-loader-panels" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="p3r-loader-foot"><span>EST. 2026</span><span>LHJ / TURBOCALHJ</span></div>
</div>
<div class="p3r-transition" id="p3r-transition" aria-hidden="true">
  <div class="p3r-transition-panels"><i></i><i></i><i></i><i></i><i></i></div>
  <span class="p3r-transition-mark">✦</span>
</div>
<div class="p3r-cursor" id="p3r-cursor" aria-hidden="true"><i></i></div>
<div class="progress" aria-hidden="true"></div>
<a class="skip-link" href="#main">跳到正文</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${url()}">
      <span class="brand-mark">李鸿杰</span><span class="brand-sub">turbocalhj</span>
    </a>
    <nav class="nav">${nav}</nav>
    <div class="tools">
      <div class="p3r-clock" aria-hidden="true">
        <span class="p3r-clock-day" id="p3r-clock-day">MON</span>
        <span class="p3r-clock-date" id="p3r-clock-date">11/10</span>
        <b class="p3r-clock-time" id="p3r-clock-time">00:00</b>
      </div>
      <button class="search-btn" type="button" id="search-open">搜索笔记<kbd>/</kbd></button>
      <button class="theme-btn" type="button" id="theme-toggle" aria-label="切换深浅色"></button>
    </div>
  </div>
</header>
<div class="page${sidebar ? ' has-sidebar' : ''}${toc && toc.length ? ' has-toc' : ''}">
  ${sidebar || ''}
  <main id="main">
    ${breadcrumb ? `<nav class="crumbs">${breadcrumb}</nav>` : ''}
    ${content}
  </main>
  ${tocHtml}
</div>
<footer class="footer">
  <div class="footer-inner">
    <span class="footer-note">本地构建 · Obsidian 知识库 + GitHub 项目</span>
    <nav class="footer-nav" aria-label="页脚导航">
      <a href="${url('archive.html')}">档案库</a>
      <a href="${url('projects', 'index.html')}">项目</a>
      <a href="${url('knowledge', 'index.html')}">知识库</a>
      <a href="${url('about.html')}">关于</a>
    </nav>
    <a class="footer-gh" href="${ctx.profile.github}" target="_blank" rel="noopener">github.com/turbocalhj</a>
  </div>
</footer>
<div class="search-overlay" id="search-overlay" hidden>
  <div class="search-box" role="dialog" aria-modal="true" aria-label="搜索知识库">
    <input type="search" id="search-input" placeholder="搜索笔记标题、正文、标签…" autocomplete="off" spellcheck="false">
    <div class="search-results" id="search-results"></div>
    <div class="search-hint"><kbd>↑↓</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭</div>
  </div>
</div>
<script src="${url('assets', 'app.js')}" defer></script>
</body>
</html>`;
}
