import { escapeHtml } from '../core/markdown.js';

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
  { key: 'home', en: 'HOME', label: '主页', file: 'index.html' },
  { key: 'projects', en: 'PROJECTS', label: '项目', file: 'projects/index.html' },
  { key: 'games', en: 'GAMES', label: '游戏库', file: 'games/index.html' },
  { key: 'esports', en: 'ESPORTS', label: '电竞', file: 'esports/index.html' },
  { key: 'knowledge', en: 'KNOWLEDGE', label: '知识库', file: 'knowledge/index.html' },
  { key: 'archive', en: 'ARCHIVE', label: '档案库', file: 'archive.html' },
  { key: 'about', en: 'ABOUT', label: '关于', file: 'about.html' },
];

const WAVES = `<svg class="waves" xmlns="http://www.w3.org/2000/svg" viewBox="0 24 150 28" preserveAspectRatio="none">
  <defs><path id="mm-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"/></defs>
  <g class="parallax">
    <use href="#mm-wave" x="48" y="0" fill="rgba(2,158,235,.7)"/>
    <use href="#mm-wave" x="48" y="3" fill="rgba(2,158,235,.5)"/>
    <use href="#mm-wave" x="48" y="5" fill="rgba(2,158,235,.2)"/>
    <use href="#mm-wave" x="48" y="7" fill="#029eeb"/>
  </g>
</svg>`;

export function renderPage({ ctx, title, desc, section, content, sidebar, toc, breadcrumb, bodyClass = '', scripts = [], jsonLd = null, noindex = false }) {
  const { url } = ctx;
  const pageHref = (file) => url(file.split('/').filter(Boolean));
  const nav = NAV.map((n) => {
    const active = n.key === section;
    return `<a class="nav-link${active ? ' is-active' : ''}" href="${pageHref(n.file)}"${active ? ' aria-current="page"' : ''}><span class="nav-cn">${n.label}</span><span class="nav-en">${n.en}</span></a>`;
  }).join('');

  const tocHtml = toc && toc.length
    ? `<aside class="toc" aria-label="目录"><div class="toc-title">本页目录</div><nav class="toc-list">${toc
        .map((t) => `<a class="toc-item lv${t.level}" href="#${t.id}">${escapeHtml(t.text)}</a>`)
        .join('')}</nav></aside>`
    : '';

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(ctx.profile.site.title)}</title>
${noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
<meta name="description" content="${escapeHtml(desc || ctx.profile.site.description)}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#081226">
<meta name="view-transition" content="same-origin">
<link rel="canonical" href="__CANONICAL__">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(ctx.profile.site.title)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc || ctx.profile.site.description)}">
<meta property="og:url" content="__CANONICAL__">
<meta property="og:locale" content="zh_CN">
<meta property="og:image" content="__SITE_URL__${url('assets', 'p3r', 'hero-poster.webp')}">
<meta property="og:image:alt" content="${escapeHtml(ctx.profile.site.title)} · ${escapeHtml(ctx.profile.site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc || ctx.profile.site.description)}">
<meta name="twitter:image" content="__SITE_URL__${url('assets', 'p3r', 'hero-poster.webp')}">
<meta name="twitter:image:alt" content="${escapeHtml(ctx.profile.site.title)} · ${escapeHtml(ctx.profile.site.tagline)}">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ctx.profile.site.title,
    url: '__SITE_URL__/',
    description: ctx.profile.site.description,
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: ctx.profile.person.name, url: ctx.profile.github },
  }).replace(/</g, '\\u003c')}</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<link rel="icon" href="${url('assets', 'p3r', 'favicon.ico')}" sizes="any">
<link rel="stylesheet" href="${url('assets', 'app.css')}">
<link rel="preload" href="${url('assets', 'fonts', 'Urbanist-Variable.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="manifest" href="${url('manifest.webmanifest')}">
${ctx.profile.siteUrl ? `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(ctx.profile.site.title)} · 笔记" href="${url('feed.xml')}">` : ''}
<script type="speculationrules">
{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"selector_matches":"a[target=_blank]"}},{"not":{"selector_matches":"a[download]"}}]},"eagerness":"moderate"}]}
</script>
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>try{var t=localStorage.getItem('lhj-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}</script>
<script>try{if(!sessionStorage.getItem('mm-boot')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('is-booting');}catch(e){}</script>
</head>
<body class="section-${section} ${bodyClass}" data-base="${url()}" data-search-index="${url('assets', 'search-index.json')}">
<div class="boot" id="boot" aria-hidden="true">
  <div class="boot-inner">
    <img class="boot-mark" src="${url('assets', 'p3r', 'memento-mori.svg')}" alt="Memento Mori" width="251" height="30">
    <p class="boot-copy">Remember, You Will Die.<br>Time never waits.<br>It delivers all equally to the same end.</p>
  </div>
  <div class="boot-wave">${WAVES}</div>
</div>
<div class="progress" aria-hidden="true"></div>
${section === 'games' || section === 'esports' ? '<canvas class="hero-particles" id="hero-particles" aria-hidden="true"></canvas>' : ''}
<a class="skip-link" href="#main">跳到正文</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${url()}">
      <span class="brand-mark">${escapeHtml(ctx.profile.site.title)}</span>
      <span class="brand-sub">${escapeHtml(ctx.profile.person.handle)}</span>
    </a>
    <nav class="nav" aria-label="主导航">${nav}</nav>
    <div class="tools">
      <button class="search-btn" type="button" id="search-open" aria-label="搜索知识库">
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.6"/><path d="M13.2 13.2 17.4 17.4"/></svg>
        <span>搜索</span><kbd>/</kbd>
      </button>
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
    <img class="footer-mark" src="${url('assets', 'p3r', 'memento-mori.svg')}" alt="Memento Mori" width="150" height="18">
    <div class="footer-row">
      <span class="footer-note">本地构建 · 笔记与项目分离归档 · 构建时脱敏</span>
      <nav class="footer-nav" aria-label="页脚导航">
        <a href="${url('archive.html')}">档案库</a>
        <a href="${url('projects', 'index.html')}">项目</a>
        <a href="${url('knowledge', 'index.html')}">知识库</a>
        <a href="${url('about.html')}">关于</a>
        <a href="${url('links', 'index.html')}">友链</a>
      </nav>
      <a class="footer-gh" href="${ctx.profile.github}" target="_blank" rel="noopener">github.com/turbocalhj ↗</a>
    </div>
  </div>
</footer>
<div class="search-overlay" id="search-overlay" hidden>
  <div class="search-box" role="dialog" aria-modal="true" aria-label="搜索知识库">
    <div class="search-head"><span>SEARCH / 知识库</span><kbd>Esc</kbd></div>
    <input type="search" id="search-input" placeholder="搜索笔记标题、正文、标签…" autocomplete="off" spellcheck="false">
    <div class="search-results" id="search-results"></div>
    <div class="search-hint"><kbd>↑↓</kbd> 选择 <kbd>Enter</kbd> 打开</div>
  </div>
</div>
<button class="back-to-top" id="back-to-top" type="button" aria-label="回到顶部">↑</button>
<script src="${url('assets', 'app.js')}" defer></script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
}
