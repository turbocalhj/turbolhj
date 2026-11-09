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
  { key: 'home', label: '首页', file: 'index.html' },
  { key: 'projects', label: '项目', file: 'projects/index.html' },
  { key: 'knowledge', label: '知识库', file: 'knowledge/index.html' },
  { key: 'about', label: '关于', file: 'about.html' },
];

export function renderPage({ ctx, title, desc, section, content, sidebar, toc, breadcrumb, bodyClass = '' }) {
  const { url } = ctx;
  const pageHref = (file) => url(file.split('/').filter(Boolean));
  const nav = NAV.map((n) => {
    const active = n.key === section;
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${pageHref(n.file)}"${active ? ' aria-current="page"' : ''}>${n.label}</a>`;
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
<script>try{var t=localStorage.getItem('lhj-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}</script>
</head>
<body class="section-${section} ${bodyClass}" data-base="${url()}" data-search-index="${url('assets', 'search-index.json')}">
<a class="skip-link" href="#main">跳到正文</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${url()}">
      <span class="brand-mark">李鸿杰</span><span class="brand-sub">turbocalhj</span>
    </a>
    <nav class="nav">${nav}</nav>
    <div class="tools">
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
    <span>本地构建 · Obsidian 知识库 + GitHub 项目</span>
    <a href="${ctx.profile.github}" target="_blank" rel="noopener">github.com/turbocalhj</a>
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
