import { escapeHtml } from './markdown.js';

const MAINLINE = ['前端', '后端', '框架', '语言', '数据库', '计算机基础', 'DevOps', '大数据', 'Agent', '学习'];
const PROJECT_FOLDERS = ['短链服务', '网约车监控', 'CloudeV2', 'PLM系统开发', '动力微服务', '数据分析挖掘'];

const KB_BLURB = {
  '前端': 'HTML / CSS / JS、Vue / React 与工程化实践。',
  '后端': '接口、鉴权、事务与 Spring Boot 服务端笔记。',
  '框架': 'Spring、Flask、FastAPI 等框架的用法与对照。',
  '语言': 'Java、Python、TS 等语言的语法与陷阱。',
  '数据库': 'MySQL、Redis、MongoDB 与设计清单。',
  '计算机基础': '计算机网络、操作系统与面试概念。',
  'DevOps': 'Linux、Docker、Git 与 CI/CD 工具链。',
  '大数据': 'Flink、Kafka、Hive 与数据处理链路。',
  'Agent': 'LLM、RAG 与智能体工程笔记。',
  '学习': '方法论、复盘与长期学习记录。',
  '工作链': '企业工作流与协作链路记录。',
};

const isProjectFolder = (key) => PROJECT_FOLDERS.includes(String(key).split('/')[0]);

export function noteUrl(ctx, id) {
  return ctx.url('notes', ...String(id).split('/')) + '.html';
}

function tagChips(tags, ctx, currentId) {
  return (tags || []).filter((t) => !t.startsWith('图谱/'))
    .map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
}

function card({ eyebrow, title, desc, meta, links, cls = '' }) {
  return `<article class="card ${cls}">
  ${eyebrow ? `<div class="card-eyebrow">${eyebrow}</div>` : ''}
  <h3 class="card-title">${title}</h3>
  ${desc ? `<p class="card-desc">${desc}</p>` : ''}
  ${meta ? `<div class="card-meta">${meta}</div>` : ''}
  ${links ? `<div class="card-links">${links}</div>` : ''}
</article>`;
}

/** 左侧知识库目录树：技术笔记与项目档案分开 */
export function buildSidebar(ctx, currentId) {
  const groups = [];
  const seen = new Map();
  for (const n of ctx.notes) {
    const key = n.folder || '根目录';
    if (!seen.has(key)) {
      seen.set(key, { key, items: [] });
      groups.push(seen.get(key));
    }
    seen.get(key).items.push(n);
  }
  const renderGroup = (g) => {
    const open = currentId && currentId.startsWith(`${g.key}/`) ? ' open' : '';
    const items = g.items.map((n) => {
      const active = n.id === currentId;
      return `<a class="side-note${n.isIndex ? ' is-index' : ''}${active ? ' is-active' : ''}" href="${noteUrl(ctx, n.id)}">${escapeHtml(n.base)}</a>`;
    }).join('');
    return `<details class="side-group"${open}><summary><span>${escapeHtml(g.key)}</span><em>${g.items.length}</em></summary><div class="side-items">${items}</div></details>`;
  };
  const sectionLabel = (label, sub) => `<div class="side-section"><b>${label}</b><span>${sub}</span></div>`;
  const rank = (key) => {
    const i = MAINLINE.indexOf(key);
    return i === -1 ? MAINLINE.length : i;
  };
  groups.sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key, 'zh'));
  const tech = groups.filter((g) => !isProjectFolder(g.key));
  const proj = groups.filter((g) => isProjectFolder(g.key));
  const body = [
    tech.length ? sectionLabel('技术笔记', 'TECH') + tech.map(renderGroup).join('') : '',
    proj.length ? sectionLabel('项目档案', 'PROJECTS') + proj.map(renderGroup).join('') : '',
  ].join('');
  return `<aside class="sidebar" aria-label="知识库目录"><div class="sidebar-head"><a href="${ctx.url('knowledge', 'index.html')}">知识库 · ${ctx.notes.length} 篇</a><input class="side-filter" id="side-filter" type="search" placeholder="筛选目录" autocomplete="off"></div><div class="side-body">${body}</div></aside>`;
}

/**
 * 首页：官方 P3R 主视觉作全屏壁纸，左侧身份与引言，右侧时钟与玻璃入口。
 * 不放跑马灯、入场动画和指针特效，只保留克制的 hover 过渡。
 */
export function reloadPage(ctx) {
  const p = ctx.profile;
  const stats = ctx.stats;
  const featured = ctx.featuredProjects.slice(0, 3);
  const totalProjects = ctx.projects.length;
  const techFolders = ctx.folders
    .filter((f) => f.key !== '根目录' && !isProjectFolder(f.key))
    .slice(0, 4);

  const icon = {
    projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>',
    knowledge: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H17M9 8h4"/></svg>',
    archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM3 4h18v3H3zM9.5 11h5"/></svg>',
    about: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5A8 8 0 1 0 20 15a6.4 6.4 0 0 1-4.5-10.5Z"/><path d="m18.5 4.5.8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.2-.8 2.2-.8Z"/></svg>',
  };

  const link = (href, ic, cn, en, n) => `<a class="home-link" href="${href}">
        <span class="home-link-icon">${ic}</span>
        <span class="home-link-text"><b>${cn}</b><em>${en} · ${n}</em></span>
        <span class="home-link-arrow" aria-hidden="true">→</span>
      </a>`;

  const works = featured.map((pr, i) => `<a class="home-work" href="${pr.pageHref}">
      <span class="hw-no">0${i + 1}</span>
      <div class="hw-body">
        <span class="hw-cat">${escapeHtml(pr.category)} · ${escapeHtml(pr.stackTop)}</span>
        <h3>${escapeHtml(pr.display)}</h3>
        <p>${escapeHtml(pr.tagline)}</p>
      </div>
      <span class="hw-arrow" aria-hidden="true">↗</span>
    </a>`).join('');

  const kbCards = techFolders.map((f) => {
    const href = f.indexId ? noteUrl(ctx, f.indexId) : ctx.folderPageUrl(f.key);
    const desc = KB_BLURB[f.key] || (f.desc ? escapeHtml(f.desc) : '分区笔记与双链索引。');
    return `<a class="home-kb-card" href="${href}">
      <span class="kb-count">${f.notes.length}</span>
      <h3>${escapeHtml(f.label)}</h3>
      <p>${desc}</p>
      <span class="kb-more">浏览分区 <i aria-hidden="true">→</i></span>
    </a>`;
  }).join('');

  const content = `
<section class="home-hero">
  <div class="wallpaper" aria-hidden="true">
    <video class="wallpaper-video" autoplay muted loop playsinline preload="metadata" poster="${ctx.url('assets', 'p3r', 'hero-poster.webp')}">
      <source src="${ctx.url('assets', 'p3r', 'hero.mp4')}" type="video/mp4">
    </video>
    <div class="wallpaper-shards"></div>
    <div class="wallpaper-veil"></div>
  </div>
  <div class="home-hero-inner">
    <div class="home-intro">
      <p class="home-eyebrow"><span aria-hidden="true">✦</span> PERSONAL ARCHIVE <i>//</i> 2026 <i>//</i> DARK HOUR</p>
      <h1 class="home-name">${escapeHtml(p.person.name)}</h1>
      <p class="home-latin">${escapeHtml(p.person.handle.toUpperCase())} <span>/</span> XUZHOU</p>
      <p class="home-role">${escapeHtml(p.person.role)} · ${escapeHtml(p.person.location)}</p>
      <blockquote class="home-quote">
        <p>把项目、笔记与工程判断，收进一个可回溯的档案。</p>
        <cite>${escapeHtml(p.site.description)}</cite>
      </blockquote>
      <div class="home-actions">
        <a class="btn btn-primary" href="${ctx.url('archive.html')}">打开档案库 <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost" href="${p.github}" target="_blank" rel="noopener">GitHub <span aria-hidden="true">↗</span></a>
      </div>
      <p class="home-stats">
        <span><b>${stats.notes}</b> 篇笔记</span><i aria-hidden="true"></i>
        <span><b>${totalProjects}</b> 个项目</span><i aria-hidden="true"></i>
        <span><b>${stats.wikiLinks.toLocaleString('en')}</b> 条双链</span><i aria-hidden="true"></i>
        <span><b>${stats.commits}</b> 次提交</span>
      </p>
    </div>
    <aside class="home-side" aria-label="站点状态与入口">
      <div class="glass home-clock">
        <div class="home-clock-row"><span id="home-clock-day">FRI</span><span id="home-clock-date">11 / 20</span></div>
        <div class="home-clock-time" id="home-clock-time">00:00</div>
        <div class="home-clock-meta"><span>DARK HOUR</span><span>LOCAL TIME</span></div>
      </div>
      <nav class="glass home-links" aria-label="站点入口">
        <div class="home-links-head"><span>站点入口</span><em>DESTINATIONS</em></div>
        ${link(ctx.url('projects', 'index.html'), icon.projects, '项目档案', 'PROJECTS', totalProjects)}
        ${link(ctx.url('knowledge', 'index.html'), icon.knowledge, '知识库', 'KNOWLEDGE', stats.notes)}
        ${link(ctx.url('archive.html'), icon.archive, '档案库', 'ARCHIVE', stats.folders)}
        ${link(ctx.url('about.html'), icon.about, '关于本站', 'ABOUT', '01')}
      </nav>
    </aside>
  </div>
</section>

<section class="home-section" id="works">
  <header class="home-section-head">
    <div><p class="eyebrow">SELECTED WORKS / 01</p><h2>精选项目</h2></div>
    <a class="home-section-more" href="${ctx.url('projects', 'index.html')}">全部 ${totalProjects} 个项目 <span aria-hidden="true">→</span></a>
  </header>
  <div class="home-works">${works}</div>
</section>

<section class="home-section home-kb">
  <header class="home-section-head">
    <div><p class="eyebrow">KNOWLEDGE BASE / 02</p><h2>技术主线</h2></div>
    <a class="home-section-more" href="${ctx.url('knowledge', 'index.html')}">${stats.notes} 篇笔记 <span aria-hidden="true">→</span></a>
  </header>
  <div class="home-kb-grid">${kbCards}</div>
</section>

<section class="home-cta">
  <p class="eyebrow">THE ARCHIVE CONTINUES</p>
  <h2>项目是项目，笔记是笔记。<br>它们都在同一个档案里。</h2>
  <a class="btn btn-primary" href="${ctx.url('archive.html')}">进入档案库 <span aria-hidden="true">→</span></a>
</section>`;

  return renderPageWrap(ctx, {
    title: `${p.site.title} · ${p.site.tagline}`,
    desc: p.site.description,
    section: 'home',
    content,
    bodyClass: 'home',
  });
}

export function archivePage(ctx) {
  const p = ctx.profile;
  const featured = ctx.featuredProjects;
  const folders = ctx.folders;
  const stats = ctx.stats;

  const statCards = [
    { n: stats.notes, l: '篇知识库笔记', s: `${stats.headings} 个标题` },
    { n: stats.folders, l: '个知识分区', s: `${stats.wikiLinks} 条内链互联` },
    { n: stats.repos, l: '个开源仓库', s: `${stats.commits} 次提交` },
    { n: stats.codeLines, l: '行笔记内代码', s: `${stats.snippets} 个代码块` },
  ].map((s) => `<div class="stat"><div class="stat-n">${s.n.toLocaleString('en')}</div><div class="stat-l">${s.l}</div><div class="stat-s">${s.s}</div></div>`).join('');

  const projCards = featured.map((pr) => card({
    eyebrow: `<span class="dot dot-${pr.categoryIndex}"></span>${pr.category} · ${pr.stackTop}`,
    title: `<a href="${pr.pageHref}">${escapeHtml(pr.display)}</a>`,
    desc: escapeHtml(pr.tagline),
    meta: pr.highlights.slice(0, 4).map((h) => `<span class="chip chip-ghost">${escapeHtml(h)}</span>`).join(''),
    links: [
      pr.repoUrl ? `<a href="${pr.repoUrl}" target="_blank" rel="noopener">GitHub</a>` : '',
      pr.archiveHref ? `<a href="${pr.archiveHref}">项目档案</a>` : '',
      `<a href="${pr.pageHref}">详情 →</a>`,
    ].join(''),
  })).join('');

  const folderCards = folders.map((f) => {
    const link = (n) => `<a href="${noteUrl(ctx, n.id)}">${escapeHtml(n.base)}</a>`;
    const preview = f.notes.filter((n) => !n.isIndex).slice(0, 6).map(link).join('、');
    return card({
      eyebrow: `${isProjectFolder(f.key) ? '项目档案' : '技术笔记'} · ${f.notes.length} 篇${f.indexId ? ' · 有索引' : ''}`,
      title: `<a href="${f.indexId ? noteUrl(ctx, f.indexId) : ctx.folderPageUrl(f.key)}">${escapeHtml(f.label)}</a>`,
      desc: f.desc ? escapeHtml(f.desc) : '随手笔记归档。',
      meta: preview ? `<div class="mini-links">${preview}</div>` : '',
    });
  }).join('');

  const stack = p.person.stack.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('');

  const content = `
<nav class="subnav" aria-label="档案库分区">
  <span class="subnav-tag">ARCHIVE</span>
  <a href="${ctx.url('projects', 'index.html')}">项目<em>PROJECTS</em></a>
  <a href="${ctx.url('knowledge', 'index.html')}">知识库<em>KNOWLEDGE</em></a>
  <a href="${ctx.url('about.html')}">关于<em>ABOUT</em></a>
</nav>
<section class="hero">
  <div class="hero-text">
    <h1>${escapeHtml(p.person.name)}<span class="hero-role">${escapeHtml(p.person.role)}</span></h1>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${ctx.url('projects', 'index.html')}">看项目</a>
      <a class="btn" href="${ctx.url('knowledge', 'index.html')}">进知识库</a>
      <a class="btn btn-ghost" href="${p.github}" target="_blank" rel="noopener">GitHub ↗</a>
    </div>
    <div class="hero-stack">${stack}</div>
  </div>
</section>
<section class="stats">${statCards}</section>
<section class="band"><h2 class="band-title">精选项目</h2><p class="band-sub">每个项目都配一份可回溯的档案笔记：定位、实现、边界与不足。</p><div class="grid grid-2">${projCards}</div><p class="band-more"><a href="${ctx.url('projects', 'index.html')}">全部 ${ctx.projects.length} 个项目 →</a></p></section>
<section class="band"><h2 class="band-title">知识地图</h2><p class="band-sub">技术主线打底，项目档案落地，两边用双链互指。</p><div class="grid grid-3">${folderCards}</div><p class="band-more"><a href="${ctx.url('knowledge', 'index.html')}">知识库总览 →</a></p></section>`;

  return renderPageWrap(ctx, {
    title: `档案库 · ${p.site.title}`,
    desc: p.site.description,
    section: 'archive',
    content,
  });
}

export function knowledgePage(ctx) {
  const moc = ctx.byId.get('总览-MOC');
  let mocHtml = '';
  if (moc) {
    const r = ctx.engine.render(moc.body);
    mocHtml = `<div class="prose">${r.html}</div>`;
  }
  const folderData = (f) => ({
    key: f.key,
    label: f.label,
    href: f.indexId ? noteUrl(ctx, f.indexId) : ctx.folderPageUrl(f.key),
    more: ctx.folderPageUrl(f.key),
    desc: KB_BLURB[f.key] || f.desc || '',
    count: f.notes.length,
    notes: f.notes.map((n) => ({ base: n.base, href: noteUrl(ctx, n.id) })),
  });
  const groups = [
    {
      key: 'tech',
      title: '技术笔记',
      sub: '语言、框架、数据库、大数据与工程工具，按主题串联。',
      folders: ctx.folders.filter((f) => !isProjectFolder(f.key)).map(folderData),
    },
    {
      key: 'project',
      title: '项目档案',
      sub: '项目从需求到交付的过程记录，与「项目」页互相指认。',
      folders: ctx.folders.filter((f) => isProjectFolder(f.key)).map(folderData),
    },
  ].filter((g) => g.folders.length);

  const folderCards = (list) => list.map((f) => {
    const items = f.notes.slice(0, 12).map((n) => `<a href="${n.href}">${escapeHtml(n.base)}</a>`).join('');
    return `<article class="foldercard">
      <header><h3><a href="${f.href}">${escapeHtml(f.label)}</a></h3><span class="count">${f.count}</span></header>
      ${f.desc ? `<p>${escapeHtml(f.desc)}</p>` : ''}
      <div class="foldercard-notes">${items}${f.count > 12 ? `<a class="more" href="${f.more}">全部 ${f.count} 篇 →</a>` : ''}</div>
    </article>`;
  }).join('');

  const groupsHtml = groups.map((g) => `<section class="kb-group">
    <header class="kb-group-head"><h2>${g.title}</h2><p>${g.sub}</p><span>${g.folders.length} 个分区</span></header>
    <div class="grid grid-2">${folderCards(g.folders)}</div>
  </section>`).join('');
  const kbJson = JSON.stringify({ groups }).replace(/</g, '\\u003c');
  const content = `
<section class="page-head"><h1>知识库</h1><p class="page-sub">来自本地 Obsidian 库（构建时脱敏），共 ${ctx.notes.length} 篇公开笔记、${ctx.stats.folders} 个分区。双链、代码块、表格按原样保留并转为站内链接。</p></section>
${mocHtml}
<section class="kb-band"><div class="kb-root" id="kb-root">${groupsHtml}</div><script type="application/json" id="kb-root-data">${kbJson}</script></section>`;
  return renderPageWrap(ctx, {
    title: '知识库 · ' + ctx.profile.site.title,
    section: 'knowledge',
    content,
    sidebar: buildSidebar(ctx, null),
    scripts: [ctx.url('assets', 'islands.js')],
  });
}

export function notePage(ctx, note, rendered) {
  const idxId = ctx.folderOf.get(note.folder);
  const folderHref = idxId ? noteUrl(ctx, idxId) : ctx.folderPageUrl(note.folder);
  const folderCrumb = note.folder
    ? `<a href="${ctx.url('knowledge', 'index.html')}">知识库</a><span>/</span><a href="${folderHref}">${escapeHtml(note.folder)}</a>`
    : `<a href="${ctx.url('knowledge', 'index.html')}">知识库</a>`;
  const meta = [];
  if (note.repo) {
    meta.push(`<a class="meta-repo" href="${escapeHtml(note.repo)}" target="_blank" rel="noopener">仓库 ↗</a>`);
  }
  const chips = tagChips(note.tags, ctx, note.id);
  const aliases = note.aliases.length ? `<div class="note-aliases">别名：${note.aliases.map((a) => `<span class="chip chip-ghost">${escapeHtml(a)}</span>`).join('')}</div>` : '';
  const project = ctx.projectByNote.get(note.id);
  const projectBanner = project
    ? `<a class="note-project" href="${project.pageHref}"><span>所属项目</span><b>${escapeHtml(project.display)}</b><i aria-hidden="true">→</i></a>`
    : '';
  const nav = noteNav(ctx, note);
  const content = `
<article class="note">
  <header class="note-head">
    <h1>${escapeHtml(note.title)}</h1>
    <div class="note-meta"><span>${ctx.statByNote.get(note.id)?.headings ?? 0} 个标题</span><span>${escapeHtml(note.rel)}</span><span>${(note.bytes / 1024).toFixed(1)} KB</span>${meta.join('')}</div>
    ${chips ? `<div class="note-chips">${chips}</div>` : ''}
    ${aliases}
    ${projectBanner}
  </header>
  <div class="prose">${rendered.html}</div>
  ${nav}
</article>`;
  return renderPageWrap(ctx, {
    title: `${note.title} · 知识库`,
    desc: (rendered.plain || '').slice(0, 120),
    section: 'knowledge',
    content,
    sidebar: buildSidebar(ctx, note.id),
    toc: rendered.toc,
    breadcrumb: `${folderCrumb}<span>/</span><span class="crumb-current">${escapeHtml(note.base)}</span>`,
    bodyClass: 'page-note',
  });
}

function noteNav(ctx, note) {
  const list = ctx.orderedNotes.filter((n) => n.folder === note.folder);
  const i = list.findIndex((n) => n.id === note.id);
  const prev = list[i - 1];
  const next = list[i + 1];
  const link = (n, cls, label) => n
    ? `<a class="pager-item ${cls}" href="${noteUrl(ctx, n.id)}"><span>${label}</span><b>${escapeHtml(n.base)}</b></a>`
    : '<span class="pager-item is-empty"></span>';
  return `<nav class="pager">${link(prev, 'pager-prev', '← 上一篇')}${link(next, 'pager-next', '下一篇 →')}</nav>`;
}

export function projectsPage(ctx) {
  const cats = ctx.profile.categories;
  const catNotes = ctx.profile.categoryNotes || {};
  const localCount = ctx.projects.filter((p) => p.local).length;
  const projectCard = (pr) => card({
    eyebrow: `${pr.category} · ${pr.isGitHub ? '开源' : '内部交付'}${pr.stackTop ? ' · ' + pr.stackTop : ''}`,
    title: `<a href="${pr.pageHref}">${escapeHtml(pr.display)}</a>`,
    desc: escapeHtml(pr.tagline),
    meta: `${pr.langBars || ''}${(pr.highlights || []).slice(0, 3).map((h) => `<span class="chip chip-ghost">${escapeHtml(h)}</span>`).join('')}`,
    links: [
      pr.repoUrl ? `<a href="${pr.repoUrl}" target="_blank" rel="noopener">GitHub</a>` : '',
      pr.archiveHref ? `<a href="${pr.archiveHref}">档案笔记</a>` : '',
      `<a href="${pr.pageHref}">详情 →</a>`,
    ].filter(Boolean).join(''),
  });
  const blocks = cats.map((c) => {
    const items = ctx.projects.filter((p) => p.category === c);
    if (!items.length) return '';
    return `<section class="band"><h2 class="band-title">${escapeHtml(c)}</h2><p class="band-sub">${escapeHtml(catNotes[c] || '')} 共 ${items.length} 个。</p><div class="grid grid-2">${items.map(projectCard).join('')}</div></section>`;
  }).join('');

  const langRows = ctx.langStats.map(([lang, n]) => `<tr><td>${escapeHtml(lang)}</td><td>${n}</td><td><div class="bar"><i style="width:${Math.round((n / ctx.langStats[0][1]) * 100)}%"></i></div></td></tr>`).join('');
  const content = `
<section class="page-head"><h1>项目</h1><p class="page-sub">GitHub 上的 ${ctx.stats.repos} 个开源仓库，加上 ${localCount} 个本地工作项目档案。工作项目按脱敏口径整理：技术栈、模块与工程决策保留，公司与内网信息不公开。数据来自 <code>data/</code> 快照与 <code>profile.json</code>。</p></section>
${blocks}
<section class="band"><h2 class="band-title">开源语言分布</h2><div class="panel-table"><table><thead><tr><th>语言</th><th>仓库数</th><th>占比</th></tr></thead><tbody>${langRows}</tbody></table></div></section>`;
  return renderPageWrap(ctx, { title: '项目 · ' + ctx.profile.site.title, section: 'projects', content });
}

export function projectPage(ctx, pr) {
  if (pr.local) return localProjectPage(ctx, pr);
  const facts = [
    pr.repoUrl ? `<a class="btn btn-primary" href="${pr.repoUrl}" target="_blank" rel="noopener">GitHub 仓库 ↗</a>` : '',
    pr.archiveHref ? `<a class="btn" href="${pr.archiveHref}">项目档案笔记</a>` : '',
  ].join('');
  const stats = pr.repo ? `<div class="proj-stats">
      <div><b>${pr.repo.language || '—'}</b><span>主语言</span></div>
      <div><b>${pr.commitCount ?? '—'}</b><span>提交</span></div>
      <div><b>${pr.repo.stargazers_count ?? 0}</b><span>Star</span></div>
      <div><b>${(pr.repo.size / 1024).toFixed(1)} MB</b><span>仓库体积</span></div>
      <div><b>${pr.pushedShort || '—'}</b><span>最近推送</span></div>
    </div>` : '';
  const langs = pr.langBreakdown ? `<div class="langbars">${pr.langBreakdown.map(([l, pct]) => `<div class="langbar"><span>${escapeHtml(l)}</span><i style="width:${pct}%"></i><em>${pct}%</em></div>`).join('')}</div>` : '';
  const topics = (pr.repo?.topics || []).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
  const highlights = (pr.highlights || []).map((h) => `<li>${escapeHtml(h)}</li>`).join('');
  const content = `
<section class="proj-head">
  <div class="crumbs"><a href="${ctx.url('projects', 'index.html')}">项目</a><span>/</span><span class="crumb-current">${escapeHtml(pr.display)}</span></div>
  <h1>${escapeHtml(pr.display)}</h1>
  <p class="page-sub">${escapeHtml(pr.tagline)}</p>
  <div class="note-chips">${topics}</div>
  ${facts}
  ${stats}
  ${langs}
</section>
${highlights ? `<section class="band"><h2 class="band-title">要点</h2><ul class="tick-list">${highlights}</ul></section>` : ''}
${pr.readmeHtml ? `<section class="band"><h2 class="band-title">README</h2><div class="prose readme">${pr.readmeHtml}</div></section>` : ''}`;
  return renderPageWrap(ctx, {
    title: `${pr.display} · 项目`,
    desc: pr.tagline,
    section: 'projects',
    content,
    bodyClass: 'page-project',
  });
}

function localProjectPage(ctx, pr) {
  const stats = (pr.stats || []).map((s) => `<div><b>${escapeHtml(s.n)}</b><span>${escapeHtml(s.l)}</span></div>`).join('');
  const stack = (pr.stack || []).map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('');
  const modules = (pr.modules || []).map((m, i) => `<article class="proj-module">
      <span class="pm-no">${String(i + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.desc)}</p></div>
    </article>`).join('');
  const highlights = (pr.highlights || []).map((h) => `<li>${escapeHtml(h)}</li>`).join('');
  const challenges = (pr.challenges || []).map((c) => card({
    eyebrow: '难点 · 取舍',
    title: escapeHtml(c.title),
    desc: escapeHtml(c.desc),
  })).join('');
  const noteLink = (id) => {
    const n = ctx.byId.get(id);
    return n ? `<a href="${noteUrl(ctx, n.id)}">${escapeHtml(n.base)}</a>` : '';
  };
  const noteLinks = [...(pr.noteIds || []), ...(pr.relatedIds || [])].map(noteLink).filter(Boolean).join('');
  const content = `
<section class="proj-head">
  <div class="crumbs"><a href="${ctx.url('projects', 'index.html')}">项目</a><span>/</span><span class="crumb-current">${escapeHtml(pr.display)}</span></div>
  <h1>${escapeHtml(pr.display)}</h1>
  <p class="page-sub">${escapeHtml(pr.tagline)}</p>
  <div class="proj-facts">
    <span><b>角色</b>${escapeHtml(pr.role || '—')}</span>
    <span><b>周期</b>${escapeHtml(pr.period || '—')}</span>
    <span class="proj-privacy-badge">脱敏档案</span>
  </div>
  <div class="note-chips">${stack}</div>
  ${stats ? `<div class="proj-stats">${stats}</div>` : ''}
</section>
<section class="band"><h2 class="band-title">项目概览</h2><div class="prose"><p>${escapeHtml(pr.summary)}</p></div></section>
${modules ? `<section class="band"><h2 class="band-title">模块与职责</h2><div class="proj-modules">${modules}</div></section>` : ''}
${highlights ? `<section class="band"><h2 class="band-title">关键工作</h2><ul class="tick-list">${highlights}</ul></section>` : ''}
${challenges ? `<section class="band"><h2 class="band-title">难点与取舍</h2><div class="grid grid-2">${challenges}</div></section>` : ''}
${noteLinks ? `<section class="band"><h2 class="band-title">相关笔记</h2><div class="mini-links">${noteLinks}</div></section>` : ''}
<p class="proj-privacy">${escapeHtml(pr.privacy || '')}</p>`;
  return renderPageWrap(ctx, {
    title: `${pr.display} · 项目`,
    desc: pr.tagline,
    section: 'projects',
    content,
    bodyClass: 'page-project',
  });
}

export function aboutPage(ctx) {
  const p = ctx.profile;
  const content = `
<section class="page-head"><h1>关于</h1><p class="page-sub">${escapeHtml(p.person.tagline || p.site.tagline)}</p></section>
<div class="about-grid">
  <div class="panel-table">
    <table><tbody>
      <tr><td>昵称</td><td>${escapeHtml(p.person.name)}</td></tr>
      <tr><td>GitHub</td><td><a href="${p.github}" target="_blank" rel="noopener">${escapeHtml(p.person.handle)} ↗</a></td></tr>
      <tr><td>方向</td><td>${escapeHtml(p.person.role)}</td></tr>
      <tr><td>坐标</td><td>${escapeHtml(p.person.location)}</td></tr>
      <tr><td>知识库</td><td>本地 Obsidian 库（构建时脱敏）</td></tr>
      <tr><td>项目</td><td>${ctx.projects.length} 个 · 工作项目按脱敏口径整理</td></tr>
      <tr><td>站点</td><td>本地静态站，<code>npm run dev</code> 起服务</td></tr>
    </tbody></table>
  </div>
  <div class="panel">
    <div class="panel-title">这个站是怎么来的</div>
    <ol class="steps">
      <li>扫描 Obsidian 库，解析 frontmatter、双链 <code>[[ ]]</code>、代码块与表格。</li>
      <li>拉取 GitHub 仓库元数据与 README，读取本地工作项目档案，统一分类成「项目」。</li>
      <li>构建时脱敏：公司、内网地址、账号与私密笔记在产物中替换或跳过，<code>dist/</code> 只留可公开内容。</li>
      <li>生成静态页面与搜索索引，全部产物在 <code>dist/</code>。</li>
      <li>视觉取自《Persona 3 Reload》官网公开素材（© ATLUS / SEGA），仅作个人非商业展示。</li>
    </ol>
  </div>
</div>
<section class="band"><h2 class="band-title">知识库体量</h2><div class="stats stats-4">${[
    { n: ctx.stats.notes, l: '篇笔记' },
    { n: ctx.stats.folders, l: '个分区' },
    { n: ctx.stats.headings, l: '个标题' },
    { n: ctx.stats.wikiLinks, l: '条双链' },
  ].map((s) => `<div class="stat"><div class="stat-n">${s.n.toLocaleString('en')}</div><div class="stat-l">${s.l}</div></div>`).join('')}</div></section>
<section class="band"><h2 class="band-title">技术栈</h2><div class="hero-stack">${p.person.stack.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div></section>`;
  return renderPageWrap(ctx, { title: '关于 · ' + p.site.title, section: 'about', content });
}

/** 取正文第一句非标题文字作为摘要 */
function brief(body) {
  const lines = body.split('\n');
  let fence = false;
  for (const l of lines) {
    if (/^ {0,3}(`{3,}|~{3,})/.test(l)) { fence = !fence; continue; }
    if (fence) continue;
    if (!l.trim() || /^ {0,3}#/.test(l)) continue;
    let t = l.replace(/^ {0,3}>\s?/, '').replace(/^ {0,3}[-+*]\s+/, '')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, (_, x) => x.split('/').pop())
      .replace(/[*_`]/g, '').trim();
    if (t) return t.length > 96 ? `${t.slice(0, 96)}…` : t;
  }
  return '';
}

export function folderPage(ctx, f) {
  const items = f.notes.map((n) => `<a class="flist-item${n.isIndex ? ' is-index' : ''}" href="${noteUrl(ctx, n.id)}">
      <b>${escapeHtml(n.base)}</b><span>${escapeHtml(brief(n.body))}</span>
      <em>${(n.bytes / 1024).toFixed(0)} KB</em></a>`).join('');
  const content = `
<section class="page-head">
  <div class="crumbs"><a href="${ctx.url('knowledge', 'index.html')}">知识库</a><span>/</span><span class="crumb-current">${escapeHtml(f.label)}</span></div>
  <h1>${escapeHtml(f.label)}</h1>
  <p class="page-sub">${escapeHtml(KB_BLURB[f.key] || f.desc || `${f.notes.length} 篇笔记。`)}</p>
</section>
<div class="flist">${items}</div>`;
  return renderPageWrap(ctx, {
    title: `${f.label} · 知识库`,
    section: 'knowledge',
    content,
    sidebar: buildSidebar(ctx, f.indexId),
  });
}

function renderPageWrap(ctx, opts) {
  return ctx.renderPage(opts);
}

export { MAINLINE, PROJECT_FOLDERS };
