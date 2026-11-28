import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from '../core/markdown.js';

// 增量层：src/client/layers 下的 css/js 会自动挂到每个公开页面，用于并行开发与后续叠加效果
const LAYER_DIR = path.join(import.meta.dirname, '..', 'client', 'layers');
const LAYER_FILES = fs.existsSync(LAYER_DIR) ? fs.readdirSync(LAYER_DIR).sort() : [];
const LAYER_CSS = LAYER_FILES.filter((f) => f.endsWith('.css'));
const LAYER_JS = LAYER_FILES.filter((f) => f.endsWith('.js'));

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
  { key: 'acg', en: 'ACG', label: 'ACG', file: 'acg/index.html' },
  {
    key: 'private',
    en: 'PRIVATE',
    label: '私密',
    file: 'private.html',
    children: [
      { key: 'games', en: 'GAMES', label: '游戏库', file: 'games/index.html', desc: '游戏评分 · 游玩记录' },
      { key: 'esports', en: 'ESPORTS', label: '电竞', file: 'esports/index.html', desc: '赛事体系 · 战队与里程碑' },
      { key: 'achievements', en: 'ACHIEVEMENTS', label: '游戏成就', file: 'achievements/index.html', desc: '高光截图 · 段位与记录' },
    ],
  },
  { key: 'knowledge', en: 'KNOWLEDGE', label: '知识库', file: 'knowledge/index.html' },
  { key: 'archive', en: 'ARCHIVE', label: '档案库', file: 'archive.html' },
  { key: 'updates', en: 'UPDATES', label: '更新', file: 'updates.html' },
  { key: 'links', en: 'LINKS', label: '友链', file: 'links/index.html' },
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

export function renderPage({ ctx, title, desc, section, content, sidebar, toc, breadcrumb, bodyClass = '', scripts = [], jsonLd = null, noindex = false, layers = true }) {
  const { url } = ctx;
  const assetVersion = (rel) => (ctx.assetVersion ? ctx.assetVersion(rel) : '0');
  const pageHref = (file) => url(file.split('/').filter(Boolean));
  const nav = NAV.map((n) => {
    if (!n.children) {
      const active = n.key === section;
      return `<a class="nav-link${active ? ' is-active' : ''}" href="${pageHref(n.file)}"${active ? ' aria-current="page"' : ''}><span class="nav-cn">${n.label}</span></a>`;
    }
    const childActive = n.children.some((c) => c.key === section);
    const active = n.key === section || childActive;
    const children = n.children.map((c) => `<a class="nav-drop-link" href="${pageHref(c.file)}">
        <b>${c.label}</b><em>${c.en} · ${c.desc}</em><span class="nav-drop-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
    return `<div class="nav-group${active ? ' is-active' : ''}">
      <a class="nav-link nav-trigger" href="${pageHref(n.file)}"${n.key === section ? ' aria-current="page"' : ''} aria-haspopup="true"><span class="nav-cn">${n.label}<span class="nav-caret" aria-hidden="true">▾</span></span></a>
      <div class="nav-drop" role="group" aria-label="${n.label}内容">
        <p class="nav-drop-kicker">${n.en} ARCHIVE</p>
        ${children}
      </div>
    </div>`;
  }).join('') + `<a class="nav-link nav-ext" href="${escapeHtml(ctx.profile.github)}" target="_blank" rel="noopener"><span class="nav-cn">GitHub<span class="nav-ext-arrow" aria-hidden="true">↗</span></span></a>` +
  `<a class="nav-link nav-auth" href="${pageHref('login.html')}" data-auth-login><span class="nav-cn">登录</span></a>` +
  `<a class="nav-link nav-auth nav-admin" href="${pageHref('admin.html')}" data-auth-admin hidden><span class="nav-cn">后台</span></a>`;

  const mobileNav = NAV.map((n) => {
    if (!n.children) {
      return `<a class="nav-panel-link${n.key === section ? ' is-active' : ''}" href="${pageHref(n.file)}"><span>${n.label}</span><em>${n.en}</em></a>`;
    }
    const kids = n.children.map((c) => `<a class="nav-panel-sub" href="${pageHref(c.file)}"><b>${c.label}</b><em>${c.en}</em></a>`).join('');
    return `<div class="nav-panel-group"><a class="nav-panel-k" href="${pageHref(n.file)}">${n.label} / ${n.en} ↗</a>${kids}</div>`;
  }).join('') + `<a class="nav-panel-link" href="${escapeHtml(ctx.profile.github)}" target="_blank" rel="noopener"><span>GitHub</span><em>↗</em></a>` +
  `<a class="nav-panel-link nav-auth" href="${pageHref('login.html')}" data-auth-login><span>登录</span><em>LOGIN</em></a>` +
  `<a class="nav-panel-link nav-auth" href="${pageHref('admin.html')}" data-auth-admin hidden><span>后台</span><em>ADMIN</em></a>`;

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
<meta name="theme-color" content="#081226" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f2efe8" media="(prefers-color-scheme: light)">
<meta name="view-transition" content="same-origin">
<link rel="canonical" href="__CANONICAL__">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(ctx.profile.site.title)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc || ctx.profile.site.description)}">
<meta property="og:url" content="__CANONICAL__">
<meta property="og:locale" content="zh_CN">
<meta property="og:image" content="__SITE_URL__${url('assets', 'global-bg.jpg')}?v=${assetVersion('src/assets/global-bg.jpg')}">
<meta property="og:image:alt" content="${escapeHtml(ctx.profile.site.title)} · ${escapeHtml(ctx.profile.site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc || ctx.profile.site.description)}">
<meta name="twitter:image" content="__SITE_URL__${url('assets', 'global-bg.jpg')}?v=${assetVersion('src/assets/global-bg.jpg')}">
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
<link rel="preload" as="image" href="${url('assets', 'global-bg.jpg')}?v=${assetVersion('src/assets/global-bg.jpg')}" fetchpriority="high">
<link rel="stylesheet" href="${url('assets', 'app.css')}?v=${assetVersion('src/client/app.css')}">
${layers ? LAYER_CSS.map((f) => `<link rel="stylesheet" href="${url('assets', 'layers', f)}?v=${assetVersion('src/client/layers/' + f)}">`).join('\n') : ''}
<link rel="preload" href="${url('assets', 'fonts', 'Urbanist-Variable.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${url('assets', 'fonts', 'NotoSansSC-subset.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="manifest" href="${url('manifest.webmanifest')}">
${ctx.profile.siteUrl ? `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(ctx.profile.site.title)} · 技术记录" href="${url('feed.xml')}">` : ''}
<script type="speculationrules">
{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"selector_matches":"a[target=_blank]"}},{"not":{"selector_matches":"a[download]"}}]},"eagerness":"moderate"}]}
</script>
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>try{var t=localStorage.getItem('lhj-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;}catch(e){}</script>
<script>try{if(!sessionStorage.getItem('mm-boot')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('is-booting');}catch(e){}</script>
</head>
<body class="section-${section} ${bodyClass}" data-base="${url()}" data-search-index="${url('assets', 'search-index.json')}">
<div class="site-bg" aria-hidden="true"><img src="${url('assets', 'global-bg.jpg')}?v=${assetVersion('src/assets/global-bg.jpg')}" alt="" fetchpriority="high" decoding="async"></div>
<div class="boot" id="boot" aria-hidden="true">
  <div class="boot-inner">
    <img class="boot-mark" src="${url('assets', 'p3r', 'memento-mori.svg')}" alt="Memento Mori" width="251" height="30">
    <p class="boot-copy">Remember, You Will Die.<br>Time never waits.<br>It delivers all equally to the same end.</p>
  </div>
  <div class="boot-wave">${WAVES}</div>
</div>
${section === 'home' ? entryCover(ctx) : ''}
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
      <button class="theme-btn" type="button" id="theme-toggle" aria-label="切换主题" title="切换主题"></button>
      <button class="nav-toggle" type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-panel" aria-label="打开导航"><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="nav-panel" id="nav-panel" hidden>
  <nav class="nav-panel-inner" aria-label="移动导航">${mobileNav}</nav>
</div>
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
      <span class="footer-note">${ctx.version ? `<b class="footer-ver">v${escapeHtml(ctx.version)}</b> · ` : ''}静态生成 · 项目与技术记录双线归档</span>
      <nav class="footer-nav" aria-label="页脚导航">
        <a href="${url('archive.html')}">档案库</a>
        <a href="${url('projects', 'index.html')}">项目</a>
        <a href="${url('knowledge', 'index.html')}">知识库</a>
        <a href="${url('about.html')}">关于</a>
        <a href="${url('updates.html')}">更新公告</a>
        <a href="${url('links', 'index.html')}">友链</a>
      </nav>
      <a class="footer-gh" href="${ctx.profile.github}" target="_blank" rel="noopener">github.com/turbocalhj ↗</a>
    </div>
  </div>
</footer>
<div class="search-overlay" id="search-overlay" hidden>
  <div class="search-box" role="dialog" aria-modal="true" aria-label="搜索知识库">
    <div class="search-head"><span>SEARCH / 知识库</span><kbd>Esc</kbd></div>
    <input type="search" id="search-input" placeholder="搜索记录标题、正文、标签…" autocomplete="off" spellcheck="false">
    <div class="search-results" id="search-results" aria-live="polite"></div>
    <div class="search-hint"><kbd>↑↓</kbd> 选择 <kbd>Enter</kbd> 打开</div>
  </div>
</div>
<button class="back-to-top" id="back-to-top" type="button" aria-label="回到顶部">↑</button>
<script src="${url('assets', 'app.js')}?v=${assetVersion('src/client/app.js')}" defer></script>
${layers ? LAYER_JS.map((f) => `<script src="${url('assets', 'layers', f)}?v=${assetVersion('src/client/layers/' + f)}" defer></script>`).join('\n') : ''}
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
}

/** 首页进入封面：编辑式排版，纯展示；显示与揭幕交给 layers/entry.js。 */
function entryCover(ctx) {
  const profile = ctx.profile || {};
  const site = profile.site || {};
  const person = profile.person || {};
  const stats = ctx.stats || {};
  const updates = ctx.updates && Array.isArray(ctx.updates.entries) ? ctx.updates.entries : [];
  const latestUpdate = updates[0] || null;
  const groups = ctx.links && Array.isArray(ctx.links.groups) ? ctx.links.groups : [];
  const links = groups.reduce((n, g) => n + (g && Array.isArray(g.links) ? g.links.length : 0), 0);
  const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('en'));

  const title = String(site.title || person.name || 'TURBO SPARK').trim();
  const words = title.split(/\s+/).filter(Boolean);
  const line1 = words[0] || 'TURBO';
  const line2 = words.length > 1 ? words.slice(1).join(' ') : String(person.handle || 'SPARK').toUpperCase();
  const handle = String(person.handle || '').trim();
  const location = String(person.location || '').trim();
  const tagline = String(site.tagline || site.description || '').trim();
  const year = new Date().getFullYear();

  return `<div class="entry-cover" id="entry-cover" role="dialog" aria-modal="true" aria-label="站点进入" hidden>
  <div class="entry-frame">
    <header class="entry-top">
      <span class="entry-no">N° 001</span>
      <span class="entry-coord">34.2058° N / 117.2841° E</span>
      <span class="entry-loc">${escapeHtml(location || 'XUZHOU')}</span>
      <span class="entry-year">${year}</span>
    </header>
    <div class="entry-head">
      <p class="entry-tag"><span class="entry-tag-dot" aria-hidden="true"></span>PERSONAL ARCHIVE${handle ? ' / ' + escapeHtml(handle) : ''}</p>
      <h2 class="entry-wordmark"><span class="entry-line">${escapeHtml(line1)}</span><span class="entry-line entry-line-outline">${escapeHtml(line2)}</span></h2>
      ${tagline ? `<p class="entry-note">${escapeHtml(tagline)}</p>` : ''}
    </div>
    <footer class="entry-bottom">
      <ul class="entry-index">
        <li><span class="entry-idx-k">PROJECTS</span><span class="entry-idx-v">${num(ctx.projects ? ctx.projects.length : null)}</span></li>
        <li><span class="entry-idx-k">NOTES</span><span class="entry-idx-v">${num(stats.notes)}</span></li>
        <li><span class="entry-idx-k">LINKS</span><span class="entry-idx-v">${num(links)}</span></li>
        <li><span class="entry-idx-k">ARCHIVE</span><span class="entry-idx-v">${num(stats.folders)}</span></li>
      </ul>
      <div class="entry-action">
        ${latestUpdate ? `<a class="entry-news" href="${ctx.url('updates.html')}">
          <span class="entry-news-k">WHAT'S NEW</span>
          <span class="entry-news-v">${escapeHtml(String(latestUpdate.date || '').slice(5).replace('-', '.'))} · ${escapeHtml(latestUpdate.title || '更新公告')}</span>
          <span class="entry-news-n">${updates.length}</span>
          <span class="entry-news-arrow" aria-hidden="true">↗</span>
        </a>` : ''}
        <span class="entry-hint">CLICK / SCROLL / ENTER</span>
        <button class="entry-enter" type="button"><span>ENTER</span><span class="entry-enter-arrow" aria-hidden="true">↗</span></button>
      </div>
    </footer>
  </div>
</div>`;
}
