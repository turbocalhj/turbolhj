import { escapeHtml } from '../core/markdown.js';

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

/** 摘要按句读收口，避免 description 断在半句。 */
function clipSummary(text, max = 120) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const at = Math.max(...['。', '！', '？', '；', '. '].map((p) => head.lastIndexOf(p)));
  if (at >= max * 0.55) return head.slice(0, at + 1).trim();
  return head.replace(/[，、；：,.．\s]+$/, '') + '…';
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
function tutorialCard(t, i) {
  return `<a class="tutorial-card" href="${escapeHtml(t.url || '#')}" target="_blank" rel="noopener">
    <span class="tutorial-cover" style="--tc:${escapeHtml(t.color || '#029eeb')}">
      <span class="tutorial-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="tutorial-cat">${escapeHtml(t.category || '')}</span>
    </span>
    <span class="tutorial-body">
      <span class="tutorial-meta">${escapeHtml(t.level || '')} · ${Number(t.minutes) || 0} MIN</span>
      <b class="tutorial-title">${escapeHtml(t.title || '')}</b>
      <span class="tutorial-sum">${escapeHtml(t.summary || '')}</span>
      <span class="tutorial-arrow" aria-hidden="true">→</span>
    </span>
  </a>`;
}

export function reloadPage(ctx) {
  const p = ctx.profile;
  const stats = ctx.stats;
  const featured = ctx.featuredProjects.slice(0, 3);
  const tutorialItems = (ctx.tutorials && Array.isArray(ctx.tutorials.items) ? ctx.tutorials.items : []).slice(0, 12);
  const totalProjects = ctx.projects.length;
  const techFolders = ctx.folders
    .filter((f) => f.key !== '根目录' && !isProjectFolder(f.key))
    .slice(0, 4);
  const playing = (ctx.games || []).filter((g) => g.status === '在玩').slice(0, 3);
  const recentUpdates = [...(ctx.notes || [])]
    .filter((n) => !n.isIndex)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 3);
  const latestUpdate = ctx.updates && Array.isArray(ctx.updates.entries) ? ctx.updates.entries[0] : null;
  const shortDay = (v) => {
    const d = new Date(v);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  };

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
    <div class="wallpaper-shards"></div>
    <div class="wallpaper-veil"></div>
  </div>
  <div class="home-hero-inner">
    <div class="home-intro">
      <p class="home-eyebrow"><span aria-hidden="true">✦</span> PERSONAL ARCHIVE <i>//</i> 2026 <i>//</i> DARK HOUR</p>
      <h1 class="home-name">${escapeHtml(p.person.name)}</h1>
      <p class="home-latin">${escapeHtml(p.person.handle.toUpperCase())} <span>/</span> XUZHOU</p>
      <p class="home-role">${escapeHtml(p.person.role)} · ${escapeHtml(p.person.location)}</p>
      <div class="home-motto" aria-label="博客简介">
        <p>这里是 turbospark 的博客。</p>
        <p>所念必至，所愿必成</p>
        <p>这里会分享技术与生活~</p>
      </div>
      <blockquote class="home-quote">
        <p>把项目、技术记录与工程判断，收进一个可回溯的档案。</p>
        <cite>${escapeHtml(p.site.description)}</cite>
      </blockquote>
      <div class="home-actions">
        <a class="btn btn-primary" href="${ctx.url('archive.html')}">打开档案库 <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost" href="${p.github}" target="_blank" rel="noopener">GitHub <span aria-hidden="true">↗</span></a>
      </div>
      <p class="home-stats">
        <span><b>${stats.notes}</b> 篇技术记录</span><i aria-hidden="true"></i>
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

<section class="home-section home-tutorials" id="tutorials">
  <div class="home-section-head">
    <div>
      <p class="eyebrow">STUDY / 学习教程</p>
      <h2>学习教程</h2>
    </div>
    <a class="home-section-more" href="${ctx.url('tutorials', 'index.html')}">全部 ${(ctx.tutorials && ctx.tutorials.items ? ctx.tutorials.items.length : 0)} 篇 <span aria-hidden="true">→</span></a>
  </div>
  <div class="tutorial-grid">${tutorialItems.map(tutorialCard).join('')}</div>
</section>

<section class="home-now" aria-label="最近状态">
  <div class="home-now-col">
    <p class="home-now-k">NOW PLAYING <span>近期在玩</span></p>
    ${playing.length ? playing.map((g) => `<a class="home-now-row" href="${ctx.url('games', g.slug)}.html">
      <i style="--c:${g.accent || '#029eeb'}"></i><b>${escapeHtml(g.name)}</b><em>${escapeHtml(g.status || '')}</em>
    </a>`).join('') : '<p class="home-now-row"><b>暂时没有标记在玩的游戏</b></p>'}
  </div>
  <div class="home-now-col">
    <p class="home-now-k">RECENT NOTES <span>最近更新</span></p>
    ${recentUpdates.length ? recentUpdates.map((n) => `<a class="home-now-row" href="${noteUrl(ctx, n.id)}">
      <i style="--c:var(--accent)"></i><b>${escapeHtml(n.title)}</b><em>${escapeHtml(shortDay(n.mtime))}</em>
    </a>`).join('') : '<p class="home-now-row"><b>内容整理中</b></p>'}
  </div>
  ${latestUpdate ? `<div class="home-now-update">
    <div class="home-now-badge" aria-hidden="true"><span>TS</span><i></i></div>
    <div class="home-now-upbody">
      <p class="home-now-k">NOTICE <span>公告</span></p>
      <a class="home-now-title" href="${ctx.url('updates.html')}">${escapeHtml(latestUpdate.title || '')}</a>
      <p class="home-now-sum">${escapeHtml(latestUpdate.summary || '')}</p>
      <div class="home-now-links">
        <a href="${ctx.url('updates.html')}">更新日志 <i aria-hidden="true">→</i></a>
        <a href="${escapeHtml(ctx.profile.github)}" target="_blank" rel="noopener">GitHub ↗</a>
        <a href="${ctx.url('feed.xml')}">RSS ↗</a>
      </div>
    </div>
  </div>` : ''}
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
    <a class="home-section-more" href="${ctx.url('knowledge', 'index.html')}">${stats.notes} 篇技术记录 <span aria-hidden="true">→</span></a>
  </header>
  <div class="home-kb-grid">${kbCards}</div>
</section>

<section class="home-cta">
  <p class="eyebrow">THE ARCHIVE CONTINUES</p>
  <h2>项目讲交付，技术记录讲方法。<br>两条线都收进同一个档案里。</h2>
  <a class="btn btn-primary" href="${ctx.url('archive.html')}">进入档案库 <span aria-hidden="true">→</span></a>
</section>`;

  return renderPageWrap(ctx, {
    title: p.site.title,
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
    { n: stats.notes, l: '篇技术记录', s: `${stats.headings} 个标题` },
    { n: stats.folders, l: '个知识分区', s: `${stats.wikiLinks} 条内链互联` },
    { n: stats.repos, l: '个开源仓库', s: `${stats.commits} 次提交` },
    { n: stats.codeLines, l: '行示例代码', s: `${stats.snippets} 个代码块` },
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
      desc: f.desc ? escapeHtml(f.desc) : '该分区的技术记录归档。',
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
<section class="band"><h2 class="band-title">精选项目</h2><p class="band-sub">每个项目都配一份可回溯的过程档案：定位、实现、边界与不足。</p><div class="grid grid-2">${projCards}</div><p class="band-more"><a href="${ctx.url('projects', 'index.html')}">全部 ${ctx.projects.length} 个项目 →</a></p></section>
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
    // 页头已有 h1「知识库」，索引笔记的标题降一级，保持单一主标题
    const body = r.html.replace(/<h1(\s|>)/g, '<h2$1').replace(/<\/h1>/g, '</h2>');
    mocHtml = `<div class="prose">${body}</div>`;
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
<section class="page-head"><h1>知识库</h1><p class="page-sub">覆盖语言与语法、后端服务、框架对照、数据库、计算机基础、DevOps、大数据与智能体工程等方向，共 ${ctx.notes.length} 篇技术记录、${ctx.stats.folders} 个分区。主题之间以双链互引，代码块与表格保留原貌。</p></section>
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
  const plainText = (rendered.sections.find((s) => s.t)?.t || '').replace(/\s+/g, ' ').trim();
  return renderPageWrap(ctx, {
    title: `${note.title} · 知识库`,
    desc: clipSummary(plainText, 120),
    section: 'knowledge',
    content,
    sidebar: buildSidebar(ctx, note.id),
    toc: rendered.toc,
    breadcrumb: `${folderCrumb}<span>/</span><span class="crumb-current">${escapeHtml(note.base)}</span>`,
    bodyClass: 'page-note',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: note.title,
      description: clipSummary(plainText, 140),
      url: '__CANONICAL__',
      mainEntityOfPage: '__CANONICAL__',
      inLanguage: 'zh-CN',
      dateModified: new Date(note.mtime).toISOString(),
      author: { '@type': 'Person', name: ctx.profile.person.name, url: ctx.profile.github },
      isPartOf: { '@type': 'WebSite', name: ctx.profile.site.title, url: '__SITE_URL__/' },
    },
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
  const projectCard = (pr) => card({
    eyebrow: `${pr.category} · ${pr.isGitHub ? '开源' : '内部交付'}${pr.stackTop ? ' · ' + pr.stackTop : ''}`,
    title: `<a href="${pr.pageHref}">${escapeHtml(pr.display)}</a>`,
    desc: escapeHtml(pr.tagline),
    meta: `${pr.langBars || ''}${(pr.highlights || []).slice(0, 3).map((h) => `<span class="chip chip-ghost">${escapeHtml(h)}</span>`).join('')}`,
    links: [
      pr.repoUrl ? `<a href="${pr.repoUrl}" target="_blank" rel="noopener">GitHub</a>` : '',
      pr.archiveHref ? `<a href="${pr.archiveHref}">项目档案</a>` : '',
      `<a href="${pr.pageHref}">详情 →</a>`,
    ].filter(Boolean).join(''),
  });
  const blocks = cats.map((c) => {
    const items = ctx.projects.filter((p) => p.category === c);
    if (!items.length) return '';
    return `<section class="band"><h2 class="band-title">${escapeHtml(c)}</h2><p class="band-sub">${escapeHtml(catNotes[c] || '')} 共 ${items.length} 个。</p><div class="grid grid-2">${items.map(projectCard).join('')}</div></section>`;
  }).join('');

  const langRows = ctx.langStats.map(([lang, n]) => `<tr><td>${escapeHtml(lang)}</td><td>${n}</td><td><div class="bar"><i style="width:${Math.round((n / ctx.langStats[0][1]) * 100)}%"></i></div></td></tr>`).join('');
  // GitHub 仓库列表式索引：编号、仓库名、描述、语言色点、提交数、更新时间
  const LANG_COLOR = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5', Java: '#b07219',
    Go: '#00add8', Vue: '#41b883', HTML: '#e34c26', CSS: '#563d7c', 'C++': '#f34b7d',
    'C#': '#178600', Rust: '#dea584', PHP: '#4f5d95', Dart: '#00b4ab', Shell: '#89e051',
    'Jupyter Notebook': '#da5b0b', Kotlin: '#a97bff', Swift: '#f05138', Ruby: '#701516',
  };
  const langColor = (lang) => LANG_COLOR[lang] || '#8b949e';
  const indexRows = ctx.projects.map((pr, i) => {
    const lang = pr.stackTop || (pr.repo && pr.repo.language) || '—';
    const topics = (pr.highlights || []).slice(0, 2);
    return `<li class="pindex-row" style="--pindex-lang:${langColor(lang)}"><a class="pindex-link" href="${pr.pageHref}">
      <span class="pindex-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="pindex-main">
        <span class="pindex-top"><b class="pindex-name">${escapeHtml(pr.display)}</b><em class="pindex-kind">${pr.isGitHub ? 'GITHUB' : 'LOCAL'}</em><span class="pindex-cat">${escapeHtml(pr.category)}</span></span>
        <span class="pindex-desc">${escapeHtml(pr.tagline || '暂无简介')}</span>
        ${topics.length ? `<span class="pindex-topics">${topics.map((t) => `<i>${escapeHtml(t)}</i>`).join('')}</span>` : ''}
      </span>
      <span class="pindex-meta">
        <span class="pindex-lang"><i></i>${escapeHtml(lang)}</span>
        ${pr.commitCount != null ? `<span class="pindex-commits">${pr.commitCount} commits</span>` : ''}
        <span class="pindex-date">${escapeHtml(pr.pushedShort || '—')}</span>
      </span>
      <span class="pindex-arrow" aria-hidden="true">↗</span>
    </a></li>`;
  }).join('');
  const indexTable = `
<section class="pindex" aria-labelledby="pindex-title">
  <header class="pindex-head">
    <h2 class="pindex-title" id="pindex-title"><span class="pindex-title-cn">项目索引 · </span>INDEX <i>/</i> SELECTED &amp; ARCHIVED WORKS</h2>
    <p class="pindex-total"><b>${ctx.projects.length}</b> 个项目</p>
  </header>
  <div class="pindex-cols" aria-hidden="true"><span>NO.</span><span>REPOSITORY</span><span>LANG / COMMITS / UPDATED</span><span></span></div>
  <ol class="pindex-list">${indexRows}</ol>
</section>`;
  const content = `
<section class="page-head"><h1>项目</h1><p class="page-sub">开源仓库与工作交付两条线：开源项目可以直接查看代码、提交与语言分布，工作项目呈现技术栈、模块职责与关键工程决策。共 ${ctx.projects.length} 个项目，按工作 / 个人 / 学习分类。</p></section>
${indexTable}
${blocks}
<section class="band"><h2 class="band-title">开源语言分布</h2><div class="panel-table"><table><thead><tr><th>语言</th><th>仓库数</th><th>占比</th></tr></thead><tbody>${langRows}</tbody></table></div></section>`;
  return renderPageWrap(ctx, { title: '项目 · ' + ctx.profile.site.title, section: 'projects', content });
}

export function projectPage(ctx, pr) {
  if (pr.local) return localProjectPage(ctx, pr);
  const facts = [
    pr.repoUrl ? `<a class="btn btn-primary" href="${pr.repoUrl}" target="_blank" rel="noopener">GitHub 仓库 ↗</a>` : '',
    pr.archiveHref ? `<a class="btn" href="${pr.archiveHref}">项目过程档案</a>` : '',
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
    <span class="proj-privacy-badge">工作档案</span>
  </div>
  <div class="note-chips">${stack}</div>
  ${stats ? `<div class="proj-stats">${stats}</div>` : ''}
</section>
<section class="band"><h2 class="band-title">项目概览</h2><div class="prose"><p>${escapeHtml(pr.summary)}</p></div></section>
${modules ? `<section class="band"><h2 class="band-title">模块与职责</h2><div class="proj-modules">${modules}</div></section>` : ''}
${highlights ? `<section class="band"><h2 class="band-title">关键工作</h2><ul class="tick-list">${highlights}</ul></section>` : ''}
${challenges ? `<section class="band"><h2 class="band-title">难点与取舍</h2><div class="grid grid-2">${challenges}</div></section>` : ''}
${noteLinks ? `<section class="band"><h2 class="band-title">相关记录</h2><div class="mini-links">${noteLinks}</div></section>` : ''}
<p class="proj-privacy">${escapeHtml(pr.privacy || '')}</p>`;
  return renderPageWrap(ctx, {
    title: `${pr.display} · 项目`,
    desc: pr.tagline,
    section: 'projects',
    content,
    bodyClass: 'page-project',
  });
}

function skillRadar() {
  const dims = [
    { label: 'Java 后端', value: 4.6 },
    { label: '大数据', value: 4.0 },
    { label: '架构设计', value: 4.2 },
    { label: '前端工程', value: 3.6 },
    { label: 'DevOps', value: 3.4 },
  ];
  const cx = 160, cy = 152, r = 102;
  const point = (i, ratio) => {
    const a = (-90 + i * 72) * Math.PI / 180;
    return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio];
  };
  const polygon = (ratio) => dims.map((_, i) => point(i, ratio).map((n) => n.toFixed(1)).join(',')).join(' ');
  const data = dims.map((d, i) => point(i, d.value / 5).map((n) => n.toFixed(1)).join(',')).join(' ');
  const grids = [0.33, 0.66, 1].map((x) => `<polygon points="${polygon(x)}" fill="none" stroke="rgba(158,190,235,.16)" stroke-width="1"/>`).join('');
  const axes = dims.map((_, i) => {
    const [x, y] = point(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(158,190,235,.14)" stroke-width="1"/>`;
  }).join('');
  const dots = dims.map((d, i) => {
    const [x, y] = point(i, d.value / 5);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--accent)"/>`;
  }).join('');
  const labels = dims.map((d, i) => {
    const [x, y] = point(i, 1.26);
    const anchor = x < cx - 8 ? 'end' : x > cx + 8 ? 'start' : 'middle';
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="11" fill="var(--muted)">${d.label}</text>`;
  }).join('');
  return `<svg class="skill-radar" viewBox="0 0 320 310" role="img" aria-label="技能自评雷达图：Java 后端、大数据、架构设计、前端工程、DevOps">${grids}${axes}<polygon points="${data}" style="fill:rgba(2,158,235,.18);stroke:var(--accent)" stroke-width="2"/>${dots}${labels}</svg>`;
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
      <tr><td>知识库</td><td>语言、后端、框架、数据库、DevOps、大数据与智能体工程，${ctx.stats.folders} 个分区</td></tr>
      <tr><td>项目</td><td>${ctx.projects.length} 个 · 开源仓库与工作交付</td></tr>
      <tr><td>站点</td><td>静态生成 · 离线可读 · 明暗主题</td></tr>
    </tbody></table>
  </div>
  <div class="panel">
    <div class="panel-title">这个站是怎么来的</div>
    <ol class="steps">
      <li>从零搭静态站：不依赖站点框架，自己实现内容解析、Markdown 渲染、双链解析与页面模板。</li>
      <li>两遍构建：第一遍收集标题锚点，第二遍校验跨页链接；失效锚点自动降级并进入构建报告。</li>
      <li>内容分层：项目档案记录交付与决策，技术记录沉淀方法与结论，两边用双链互指。</li>
      <li>视觉体系：设计令牌 + 明暗主题 + View Transition，主视觉素材来自《Persona 3 Reload》官网（© ATLUS / SEGA）。</li>
      <li>交互与发布：筛选类交互用 React 岛屿，其余原生；PWA 离线可用，SemVer + CHANGELOG + 链接审计负责发布。</li>
    </ol>
  </div>
</div>
<section class="band"><h2 class="band-title">知识库覆盖面</h2><div class="stats stats-4">${[
    { n: ctx.stats.notes, l: '篇技术记录' },
    { n: ctx.stats.folders, l: '个分区' },
    { n: ctx.stats.headings, l: '个标题' },
    { n: ctx.stats.wikiLinks, l: '条双链' },
  ].map((s) => `<div class="stat"><div class="stat-n">${s.n.toLocaleString('en')}</div><div class="stat-l">${s.l}</div></div>`).join('')}</div></section>
<section class="band"><h2 class="band-title">技术栈</h2>
<div class="about-skills"><div class="hero-stack">${p.person.stack.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>${skillRadar()}</div>
<p class="radar-note">雷达图为主观自评，只表示各方向的相对投入程度。</p></section>`;
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
  <p class="page-sub">${escapeHtml(KB_BLURB[f.key] || f.desc || `${f.notes.length} 篇技术记录。`)}</p>
</section>
<div class="flist">${items}</div>`;
  return renderPageWrap(ctx, {
    title: `${f.label} · 知识库`,
    section: 'knowledge',
    content,
    sidebar: buildSidebar(ctx, f.indexId),
  });
}

/* -------------------------------------------------------------------------- */
/*  游戏百科 / 电竞                                                            */
/* -------------------------------------------------------------------------- */

export function gamesPage(ctx) {
  const games = (ctx.games || []).map((g) => ({ ...g, href: ctx.url('games', g.slug) + '.html' }));
  const genres = [...new Set(games.flatMap((g) => g.genres))].sort((a, b) => a.localeCompare(b, 'zh'));
  const platforms = [...new Set(games.flatMap((g) => g.platforms))].sort();
  const statuses = [...new Set(games.map((g) => g.status))];
  const hours = games.reduce((n, g) => n + (g.hours || 0), 0);
  const data = JSON.stringify({ games, genres, platforms, statuses }).replace(/</g, '\\u003c');

  const content = `
<section class="page-head game-hero">
  <p class="eyebrow">GAME ARCHIVE / 游戏档案</p>
  <h1>游戏库</h1>
  <p class="page-sub">玩过的、在玩的、想玩的。共 ${games.length} 款游戏、${hours.toLocaleString('en')} 小时记录。评分与状态是个人主观记录，发行信息是公开事实。</p>
  <div class="game-hero-stats">
    <span><b>${games.length}</b> 款游戏</span>
    <span><b>${genres.length}</b> 种类型</span>
    <span><b>${games.filter((g) => g.status === '已通关').length}</b> 款通关</span>
    <span><b>${games.filter((g) => g.status === '在玩').length}</b> 款在玩</span>
  </div>
</section>
<section class="game-band">
  <div id="game-root" class="game-root"></div>
  <script type="application/json" id="game-root-data">${data}</script>
</section>`;

  return renderPageWrap(ctx, {
    title: '游戏库 · ' + ctx.profile.site.title,
    desc: '个人游戏库：FPS、JRPG、动作、MOBA 等游戏的评分、状态与游玩记录。',
    section: 'games',
    bodyClass: 'page-games',
    content,
    scripts: [ctx.url('assets', 'islands.js')],
  });
}

export function gameDetailPage(ctx, game) {
  const related = (ctx.games || [])
    .filter((g) => g.slug !== game.slug && g.genres.some((x) => game.genres.includes(x)))
    .slice(0, 4);
  const accent = game.accent || '#029eeb';
  const facts = [
    ['开发商', game.developer],
    ['发行年份', game.year],
    ['平台', (game.platforms || []).join(' / ')],
    ['类型', (game.genres || []).join(' / ')],
    ['状态', game.status],
    ['时长', game.hours ? `${game.hours} 小时` : '未开始'],
  ];
  const factRows = facts.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('');
  const tags = (game.tags || []).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
  const relatedHtml = related.length
    ? `<section class="band"><h2 class="band-title">同类推荐</h2><div class="related-games">${related.map((g) => `<a href="${ctx.url('games', g.slug) + '.html'}" style="--game-accent:${g.accent || '#029eeb'}"><span>${escapeHtml(g.short)}</span><b>${escapeHtml(g.name)}</b><em>${g.rating.toFixed(1)}</em></a>`).join('')}</div></section>`
    : '';

  const content = `
<section class="game-detail-hero" style="--game-accent:${accent}">
  <a class="crumb-back" href="${ctx.url('games', 'index.html')}">← 返回游戏库</a>
  <div class="game-detail-grid">
    <div class="detail-cover">
      <span class="detail-cover-short">${escapeHtml(game.short)}</span>
      <span class="detail-cover-year">${game.year}</span>
    </div>
    <div class="detail-main">
      <p class="eyebrow">${escapeHtml((game.genres || []).join(' / '))}</p>
      <h1>${escapeHtml(game.name)}</h1>
      <p class="detail-en">${escapeHtml(game.en)}</p>
      <div class="detail-score"><b>${game.rating.toFixed(1)}</b><span>/ 10 个人评分</span></div>
      <p class="detail-desc">${escapeHtml(game.desc)}</p>
      ${game.review ? `<blockquote class="detail-review">${escapeHtml(game.review)}</blockquote>` : ''}
      ${game.link ? `<a class="btn btn-ghost" href="${escapeHtml(game.link)}" target="_blank" rel="noopener">官方站点 ↗</a>` : ''}
    </div>
  </div>
</section>
<section class="band"><h2 class="band-title">档案信息</h2><dl class="detail-facts">${factRows}</dl>${tags ? `<div class="note-chips">${tags}</div>` : ''}</section>
${relatedHtml}`;

  return renderPageWrap(ctx, {
    title: `${game.name} · 游戏库`,
    desc: game.desc,
    section: 'games',
    bodyClass: 'page-game-detail',
    content,
  });
}

export function tutorialsPage(ctx, page = 1) {
  const all = ctx.tutorials && Array.isArray(ctx.tutorials.items) ? ctx.tutorials.items : [];
  const size = Number(ctx.tutorials && ctx.tutorials.pageSize) || 12;
  const total = Math.max(1, Math.ceil(all.length / size));
  const current = Math.min(Math.max(1, Number(page) || 1), total);
  const start = (current - 1) * size;
  const items = all.slice(start, start + size);
  const pageHref = (n) => (n === 1 ? ctx.url('tutorials', 'index.html') : ctx.url('tutorials', 'page', n + '.html'));
  const nums = Array.from({ length: total }, (_, i) => `<a class="pager-num${i + 1 === current ? ' is-active' : ''}" href="${pageHref(i + 1)}"${i + 1 === current ? ' aria-current="page"' : ''}>${i + 1}</a>`).join('');

  const content = `
<section class="page-head tutorials-head">
  <p class="eyebrow">STUDY / 学习教程</p>
  <h1>学习教程<span class="dot">.</span></h1>
  <p class="page-sub">按方向整理的学习路线，共 ${all.length} 篇，每页 ${size} 篇。内容为占位示例，后续可替换为真实教程。</p>
</section>
<section class="tutorial-band">
  <div class="tutorial-grid">${items.map((t, i) => tutorialCard(t, start + i)).join('')}</div>
  <nav class="pager tutorial-pager" aria-label="教程分页">
    ${current > 1 ? `<a class="pager-prev" href="${pageHref(current - 1)}">← 上一页</a>` : '<span class="pager-prev is-disabled">← 上一页</span>'}
    <span class="pager-nums">${nums}</span>
    ${current < total ? `<a class="pager-next" href="${pageHref(current + 1)}">下一页 →</a>` : '<span class="pager-next is-disabled">下一页 →</span>'}
  </nav>
</section>`;

  return renderPageWrap(ctx, {
    title: '学习教程 · ' + ctx.profile.site.title,
    desc: '按 HTML、CSS、JavaScript、Node、Docker 等技术方向整理的学习教程。',
    section: 'tutorials',
    bodyClass: 'page-tutorials',
    content,
  });
}

export function esportsPage(ctx) {
  const e = ctx.esports || { titles: [], events: [], teams: [], milestones: [] };
  const data = JSON.stringify(e).replace(/</g, '\\u003c');
  const content = `
<section class="page-head esports-hero">
  <p class="eyebrow">ESPORTS / 电竞观察</p>
  <h1>电竞百科</h1>
  <p class="page-sub">赛事体系、值得关注的战队与几个记得住的瞬间。不是资料库，是一份带观点的观赛记录。</p>
  <div class="game-hero-stats">
    <span><b>${e.titles.length}</b> 个项目</span>
    <span><b>${e.events.length}</b> 项赛事</span>
    <span><b>${e.teams.length}</b> 支队伍</span>
  </div>
</section>
<section class="esports-band">
  <div id="esports-root" class="esports-root"></div>
  <script type="application/json" id="esports-root-data">${data}</script>
</section>`;

  return renderPageWrap(ctx, {
    title: '电竞百科 · ' + ctx.profile.site.title,
    desc: '电竞赛事体系、战队观察与记忆点，按项目筛选浏览。',
    section: 'esports',
    bodyClass: 'page-esports',
    content,
    scripts: [ctx.url('assets', 'islands.js')],
  });
}

export function achievementsPage(ctx) {
  const a = ctx.achievements || { games: [], items: [] };
  const games = Array.isArray(a.games) ? a.games : [];
  const items = Array.isArray(a.items) ? a.items : [];
  const gameMap = new Map(games.map((g) => [g.key, g]));
  const tabs = [`<button type="button" class="ach-tab is-active" data-ach-tab="all" aria-pressed="true">全部 <em>${items.length}</em></button>`]
    .concat(games.map((g) => `<button type="button" class="ach-tab" data-ach-tab="${escapeHtml(g.key)}" aria-pressed="false">${escapeHtml(g.name)} <em>${items.filter((i) => i.game === g.key).length}</em></button>`))
    .join('');
  const cards = items.map((it) => {
    const g = gameMap.get(it.game) || { name: it.game, short: it.game, color: '#029eeb' };
    return `<article class="ach-card" data-game="${escapeHtml(it.game)}">
      <div class="ach-cover" style="--ac:${escapeHtml(g.color || '#029eeb')}">
        ${it.image ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.title)}" loading="lazy" decoding="async">` : `<span class="ach-placeholder"><b>${escapeHtml(g.short || g.name)}</b><em>GAME ACHIEVEMENT</em></span>`}
        <span class="ach-rarity">${escapeHtml(it.rarity || '记录')}</span>
      </div>
      <div class="ach-body">
        <p class="ach-game">${escapeHtml(g.name)} · ${escapeHtml(it.date || '')}</p>
        <h2>${escapeHtml(it.title)}</h2>
        <p>${escapeHtml(it.desc || '')}</p>
      </div>
    </article>`;
  }).join('');

  const content = `
<section class="page-head ach-head">
  <p class="eyebrow">ACHIEVEMENTS / 游戏成就</p>
  <h1>成就<span class="dot">.</span></h1>
  <p class="page-sub">游戏里的高光、段位与赛季记录。共 ${items.length} 条，按游戏筛选；图片放入 src/static/achievements/ 即可替换占位封面。</p>
</section>
<section class="ach-band">
  <nav class="ach-tabs" aria-label="按游戏筛选">${tabs}</nav>
  <div class="ach-grid">${cards}</div>
  ${items.length ? '' : '<p class="ach-empty">还没有成就记录。把截图放进 src/static/achievements/，并在 data/achievements.json 里加入条目。</p>'}
</section>`;

  return renderPageWrap(ctx, {
    title: '游戏成就 · ' + ctx.profile.site.title,
    desc: '游戏成就与截图记录：Apex、Overwatch、VALORANT 与 CS2。',
    section: 'achievements',
    bodyClass: 'page-achievements',
    content,
  });
}

export function linksPage(ctx) {
  const groups = ctx.links?.groups || [];
  const total = groups.reduce((n, g) => n + (g.links?.length || 0), 0);
  const blocks = groups.map((g) => `
<section class="band">
  <h2 class="band-title">${escapeHtml(g.title)}</h2>
  <p class="band-sub">${escapeHtml(g.desc)}</p>
  <div class="link-grid">${(g.links || []).map((l) => `<a class="link-card" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
    <div class="link-top"><span class="link-tag">${escapeHtml(l.tag)}</span><span aria-hidden="true">↗</span></div>
    <h3>${escapeHtml(l.name)}</h3>
    <p>${escapeHtml(l.desc)}</p>
  </a>`).join('')}</div>
</section>`).join('');
  const content = `
<section class="page-head"><h1>友链与参考</h1><p class="page-sub">收录 ${total} 个站点：改造本站时参考过的开源个人站，以及做游戏与电竞内容时查过的公开资源。点击会跳转到外部站点。</p></section>
${blocks}
<section class="band"><p class="radar-note">外部链接内容由各站点作者负责，本站仅作索引与致谢。</p></section>`;
  return renderPageWrap(ctx, {
    title: '友链与参考 · ' + ctx.profile.site.title,
    desc: '开源个人站灵感来源与游戏电竞数据资源索引。',
    section: 'links',
    bodyClass: 'page-links',
    content,
  });
}

export function acgPage(ctx) {
  const data = ctx.acg || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const shelf = items.map((it, i) => `<a class="acg-shelf-link" href="#${escapeHtml(it.id)}" style="--c:${it.accent}">
      <span>${String(i + 1).padStart(2, '0')}</span><b>${escapeHtml(it.cn)}</b><em>${escapeHtml(it.en)}</em>
    </a>`).join('');

  const chapters = items.map((it, i) => `<article class="acg-chapter" id="${escapeHtml(it.id)}" data-medium="${escapeHtml(it.medium || 'anime')}" style="--acg:${it.accent};--acg2:${it.accent2}">
    <div class="acg-poster" aria-hidden="true">
      <span class="acg-poster-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="acg-poster-title">${escapeHtml(it.en)}</span>
      <span class="acg-poster-jp">${escapeHtml(it.jp)}</span>
      <span class="acg-poster-line"></span>
    </div>
    <div class="acg-copy">
      <p class="acg-kicker">${escapeHtml(it.kind)} / ${escapeHtml(it.year)} <i>${it.medium === 'game' ? 'GAME' : 'ANIME'}</i></p>
      <h2 class="acg-title">${escapeHtml(it.cn)}<em>${escapeHtml(it.sub)}</em></h2>
      <p class="acg-sum">${escapeHtml(it.summary)}</p>
      <dl class="acg-facts">
        <div><dt>制作</dt><dd>${escapeHtml(it.studio)}</dd></div>
        <div><dt>监督 / 导演</dt><dd>${escapeHtml(it.director)}</dd></div>
        <div><dt>首播 / 发售</dt><dd>${escapeHtml(it.date)}</dd></div>
        <div><dt>平台</dt><dd>${escapeHtml(it.platform)}</dd></div>
      </dl>
      <div class="acg-tags">${(it.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      <div class="acg-actions">
        <a class="btn acg-official" href="${it.official}" target="_blank" rel="noopener">官方网站 ↗</a>
        <p class="acg-note">${escapeHtml(it.note || '')}</p>
      </div>
    </div>
  </article>`).join('');

  const content = `
<section class="acg-hero">
  <p class="eyebrow">ACG / SCREEN &amp; BEYOND</p>
  <h1>屏幕之外<span class="dot">.</span></h1>
  <p class="acg-lead">四部反复重看的作品：异世界、夜之城、交界地与死亡回归。硬信息取自官方网站，简介与判断是本站自写。</p>
  <nav class="acg-shelf" aria-label="ACG 目录">${shelf}</nav>
</section>
<div class="acg-bar">
  <div class="acg-filter" role="group" aria-label="按类型筛选">
    <button type="button" class="acg-chip is-active" data-acg-filter="*">全部<em>${items.length}</em></button>
    <button type="button" class="acg-chip" data-acg-filter="anime">动画<em>${items.filter((i) => i.medium === 'anime').length}</em></button>
    <button type="button" class="acg-chip" data-acg-filter="game">游戏<em>${items.filter((i) => i.medium === 'game').length}</em></button>
  </div>
  <p class="acg-count">${items.length} ENTRIES</p>
</div>
<div class="acg-chapters">${chapters}</div>
<section class="acg-order">
  <p class="eyebrow">WATCH / PLAY ORDER</p>
  <h2>如果只从这里开始<span>.</span></h2>
  <ol class="acg-order-list">
    <li><b>01</b><span><strong>无职转生</strong>：想先看「慢慢变好」的故事。</span></li>
    <li><b>02</b><span><strong>赛博朋克：边缘行者</strong>：只有一个晚上，想被霓虹和结局撞一下。</span></li>
    <li><b>03</b><span><strong>艾尔登法环</strong>：想把一百小时交给一张地图。</span></li>
    <li><b>04</b><span><strong>Re:Zero</strong>：想看「重来」到底要付多少代价。</span></li>
  </ol>
</section>`;

  return renderPageWrap(ctx, {
    title: 'ACG · ' + ctx.profile.site.title,
    desc: 'ACG 分区：无职转生、赛博朋克：边缘行者、艾尔登法环与 Re:Zero 的官方信息与个人记录。',
    section: 'acg',
    bodyClass: 'page-acg',
    content,
  });
}

export function privatePage(ctx) {
  const games = ctx.games || [];
  const esports = ctx.esports || {};
  const events = Array.isArray(esports.events) ? esports.events.length : 0;
  const teams = Array.isArray(esports.teams) ? esports.teams.length : 0;
  const playing = games.filter((g) => g.status === '在玩').slice(0, 3);

  const cards = [
    {
      no: '01',
      key: 'GAMES / 游戏库',
      title: '游戏库',
      desc: '评分、状态与主观记录。按类型、平台与游玩进度筛。',
      meta: `${games.length} 款 · ${playing.length ? `${playing.length} 款在玩` : '持续更新'}`,
      href: ctx.url('games', 'index.html'),
    },
    {
      no: '02',
      key: 'ESPORTS / 电竞',
      title: '电竞',
      desc: '赛事体系、战队观察与时间线。只写公开赛制与里程碑。',
      meta: `${events} 项赛事 · ${teams} 支战队`,
      href: ctx.url('esports', 'index.html'),
    },
  ].map((c) => `<a class="private-card" href="${c.href}">
      <span class="private-no">${c.no}</span>
      <div class="private-body">
        <p class="eyebrow">${c.key}</p>
        <h2>${c.title}</h2>
        <p>${c.desc}</p>
      </div>
      <span class="private-meta">${c.meta} <i aria-hidden="true">↗</i></span>
    </a>`).join('');

  const nowRows = playing.map((g) => `<a class="private-now" href="${ctx.url('games', g.slug)}.html">
      <span class="private-now-dot" style="--c:${g.accent || '#029eeb'}"></span>
      <b>${escapeHtml(g.name)}</b>
      <em>${escapeHtml(g.status || '')}</em>
      <span aria-hidden="true">→</span>
    </a>`).join('');

  const content = `
<section class="page-head private-head">
  <p class="eyebrow">PRIVATE ARCHIVE / 00</p>
  <h1>私密<span class="dot">.</span></h1>
  <p class="page-sub">游戏与电竞的私人记录，收在「私密」入口下。主站聚焦工程、项目与技术记录，这两块爱好单独放在这里。</p>
</section>
<div class="private-grid">${cards}</div>
${playing.length ? `<section class="private-now-box"><p class="eyebrow">NOW PLAYING</p><div class="private-now-list">${nowRows}</div></section>` : ''}
<p class="private-foot">入口在导航「私密」上：桌面端悬浮展开，移动端点击进入本页。它与后台的私密内容无关，只是把爱好从主站动线里抽出来。</p>`;

  return renderPageWrap(ctx, {
    title: '私密 · ' + ctx.profile.site.title,
    desc: '私密档案：游戏库与电竞观察，挂在导航「私密」入口下。',
    section: 'private',
    bodyClass: 'page-private',
    content,
  });
}

export function updatesPage(ctx) {
  const data = ctx.updates || {};
  const entries = Array.isArray(data.entries) ? data.entries.slice() : [];
  entries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const tags = [...new Set(entries.map((e) => e.tag).filter(Boolean))];
  const latest = entries[0];
  const shortDate = (v) => String(v || '').slice(5, 10).replace('-', '.');
  const yearOf = (v) => String(v || '').slice(0, 4);

  const tabs = ['全部', ...tags].map((tag, i) => {
    const count = tag === '全部' ? entries.length : entries.filter((e) => e.tag === tag).length;
    return `<button type="button" class="upd-tab${i === 0 ? ' is-active' : ''}" data-upd-filter="${escapeHtml(tag === '全部' ? '*' : tag)}" aria-pressed="${i === 0}">${escapeHtml(tag)}<em>${count}</em></button>`;
  }).join('');

  const rows = entries.map((e, i) => `
<article class="upd-item" data-tag="${escapeHtml(e.tag || '')}">
  <div class="upd-when">
    <b>${escapeHtml(shortDate(e.date))}</b>
    <span>${escapeHtml(yearOf(e.date))}</span>
    <em>${String(i + 1).padStart(2, '0')}</em>
  </div>
  <div class="upd-body">
    <p class="upd-tagline"><span class="upd-dot" aria-hidden="true"></span>${escapeHtml(e.tag || '更新')}</p>
    <h2 class="upd-title">${escapeHtml(e.title || '')}</h2>
    ${e.summary ? `<p class="upd-sum">${escapeHtml(e.summary)}</p>` : ''}
    ${Array.isArray(e.bullets) && e.bullets.length ? `<ul class="upd-points">${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
  </div>
</article>`).join('');

  const playing = (ctx.games || []).filter((g) => g.status === '在玩').slice(0, 3);
  const recent = [...(ctx.notes || [])]
    .filter((n) => !n.isIndex)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 5);
  const stamp = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  };

  const nowCards = `
  <div class="upd-now-grid">
    <section class="upd-card" aria-labelledby="upd-playing">
      <header class="upd-card-head"><span>NOW PLAYING</span><h3 id="upd-playing">近期在玩</h3></header>
      ${playing.length ? playing.map((g) => `<a class="upd-play" href="${ctx.url('games', g.slug)}.html" style="--upd-game:${g.accent || '#426e52'}">
        <span class="upd-play-mark" aria-hidden="true"></span>
        <span class="upd-play-body"><b>${escapeHtml(g.name)}</b><em>${escapeHtml(g.en || '')}</em></span>
        <span class="upd-play-state">${escapeHtml(g.status || '')}</span>
      </a>`).join('') : '<p class="upd-empty-line">暂时没有标记「在玩」的游戏。</p>'}
    </section>
    <section class="upd-card" aria-labelledby="upd-recent">
      <header class="upd-card-head"><span>RECENT NOTES</span><h3 id="upd-recent">最近更新</h3></header>
      ${recent.map((n) => `<a class="upd-note" href="${noteUrl(ctx, n.id)}">
        <span class="upd-note-date">${escapeHtml(stamp(n.mtime))}</span>
        <b>${escapeHtml(n.title)}</b>
        <em>${escapeHtml(n.folder || '根目录')}</em>
      </a>`).join('')}
    </section>
  </div>`;

  const content = `
<div class="upd-sheet">
  <header class="upd-head">
    <p class="upd-kicker">01 / UPDATE LOG</p>
    <div class="upd-head-row">
      <h1 class="upd-h1">更新公告<span>.</span></h1>
      <div class="upd-stamp"><b>${entries.length}</b> 条记录<span>LAST UPDATE ${escapeHtml(latest ? String(latest.date || '').replace(/-/g, '.') : '—')}</span></div>
    </div>
    <p class="upd-sub">记录站点的功能、内容与体验改进。所有变更只做新增与修正，已发布的区块不删改。</p>
  </header>
  <nav class="upd-tabs" aria-label="按类型筛选更新">${tabs}</nav>
  <div class="upd-list">${rows}</div>
  <p class="upd-noresult" hidden>这个分类下还没有记录。</p>
  <section class="upd-now" aria-labelledby="upd-now-title">
    <p class="upd-kicker">02 / NOW</p>
    <div class="upd-head-row"><h2 class="upd-h2" id="upd-now-title">最近在做什么<span>.</span></h2><a class="upd-more" href="${ctx.url('games', 'index.html')}">去游戏库 <span aria-hidden="true">→</span></a></div>
    ${nowCards}
  </section>
  <footer class="upd-quote">
    <p>把项目、技术记录与工程判断，收进一个可回溯的档案。</p>
    <span>THE ARCHIVE CONTINUES · ${escapeHtml(yearOf(latest && latest.date))}</span>
  </footer>
</div>`;

  return renderPageWrap(ctx, {
    title: '更新公告 · ' + ctx.profile.site.title,
    desc: '站点更新公告：功能、内容与体验改进的时间线，以及最近在玩与最近更新。',
    section: 'updates',
    bodyClass: 'page-updates',
    content,
  });
}

export function notFoundPage(ctx) {
  const p = ctx.profile;
  const entries = [
    ['首页', ctx.url(), '回到主视觉与最新更新'],
    ['知识库', ctx.url('knowledge', 'index.html'), '按语言、后端、数据库与工程实践组织'],
    ['项目档案', ctx.url('projects', 'index.html'), '交付记录与工程判断'],
    ['档案库', ctx.url('archive.html'), '按时间与分区归档'],
  ].map(([label, href, note]) => `<a class="card" href="${href}">
      <div class="card-eyebrow">GO TO</div>
      <h2 class="card-title">${label}</h2>
      <p class="card-desc">${note}</p>
    </a>`).join('');
  const content = `
<section class="page-head">
  <p class="eyebrow"><span aria-hidden="true">✦</span> 404 / NOT FOUND</p>
  <h1>这页没有档案</h1>
  <p class="page-sub">链接可能改名了，或者这条记录还没有公开。从下面任意入口重新开始。</p>
</section>
<div class="grid grid-2">${entries}</div>`;
  return renderPageWrap(ctx, {
    title: `页面未找到 · ${p.site.title}`,
    desc: '页面不存在，可从首页、知识库、项目档案或档案库继续浏览。',
    section: '404',
    content,
    noindex: true,
  });
}

export function authPage(ctx, mode = 'login') {
  const isReg = mode === 'register';
  const content = `
<section class="page-head"><h1>${isReg ? '注册账号' : '登录'}</h1><p class="page-sub">${isReg ? '注册后即可留言与使用后台；首个注册账号自动获得管理员权限。' : '使用邮箱与密码登录，管理员可进入后台管理。'}</p></section>
<div class="auth-panel">
  <form class="auth-form" id="auth-form" data-mode="${mode}">
    ${isReg ? '<label>昵称<input name="name" maxlength="40" autocomplete="nickname" placeholder="怎么称呼你"></label>' : ''}
    <label>邮箱<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
    <label>密码<input name="password" type="password" required minlength="8" autocomplete="${isReg ? 'new-password' : 'current-password'}" placeholder="至少 8 位"></label>
    <button class="btn btn-primary" type="submit">${isReg ? '注册' : '登录'}</button>
    <p class="auth-alt">${isReg ? `已有账号？<a href="${ctx.url('login.html')}">去登录</a>` : `还没有账号？<a href="${ctx.url('register.html')}">注册一个</a>`}</p>
    <p class="auth-error" id="auth-error" role="alert" hidden></p>
  </form>
</div>`;
  return renderPageWrap(ctx, {
    title: isReg ? '注册' : '登录',
    section: 'account',
    content,
    scripts: [`${ctx.url('assets', 'auth.js')}?v=${ctx.assetVersion ? ctx.assetVersion('src/client/auth.js') : '0'}`],
    bodyClass: 'page-auth',
    noindex: true,
    layers: false,
  });
}

export function adminPage(ctx) {
  const content = `
<section class="page-head"><h1>后台管理</h1><p class="page-sub">登录状态：<b id="admin-user">—</b> · <button type="button" class="linklike" id="admin-logout">退出登录</button></p></section>
<nav class="admin-tabs" aria-label="后台分区">
  <button type="button" class="admin-tab is-active" data-tab="overview">概览</button>
  <button type="button" class="admin-tab" data-tab="inbox">留言</button>
  <button type="button" class="admin-tab" data-tab="config">站点配置</button>
  <button type="button" class="admin-tab" data-tab="build">构建</button>
</nav>
<section class="admin-panel" data-panel="overview">
  <div class="admin-stats">
    <div><span>产物文件</span><b id="stat-files">—</b></div>
    <div><span>产物体积</span><b id="stat-size">—</b></div>
    <div><span>搜索索引</span><b id="stat-index">—</b></div>
    <div><span>留言</span><b id="stat-inbox">—</b></div>
    <div><span>账号</span><b id="stat-users">—</b></div>
    <div><span>最近构建</span><b id="stat-built">—</b></div>
    <div><span>服务运行</span><b id="stat-uptime">—</b></div>
    <div><span>构建状态</span><b id="stat-build">—</b></div>
  </div>
</section>
<section class="admin-panel" data-panel="inbox" hidden>
  <div class="admin-list" id="inbox-list"><p class="admin-empty">加载中…</p></div>
</section>
<section class="admin-panel" data-panel="config" hidden>
  <form class="admin-form" id="config-form">
    <label>站点标题<input name="site.title" maxlength="60"></label>
    <label>副标题<input name="site.tagline" maxlength="120"></label>
    <label>站点描述<textarea name="site.description" rows="3" maxlength="200"></textarea></label>
    <label>你的名字<input name="person.name" maxlength="40"></label>
    <label>一句话介绍<input name="person.role" maxlength="120"></label>
    <label>所在地<input name="person.location" maxlength="60"></label>
    <label>站点地址<input name="siteUrl" maxlength="200" placeholder="https://example.com"></label>
    <button class="btn btn-primary" type="submit">保存配置</button>
    <p class="auth-ok" id="config-msg" hidden></p>
  </form>
</section>
<section class="admin-panel" data-panel="build" hidden>
  <p class="admin-hint">触发一次完整构建，日志实时回显；构建状态：<b id="build-status">待命</b></p>
  <button class="btn btn-primary" type="button" id="build-run">重新构建</button>
  <pre class="admin-log" id="build-log"></pre>
</section>`;
  return renderPageWrap(ctx, {
    title: '后台管理',
    section: 'account',
    content,
    scripts: [`${ctx.url('assets', 'admin.js')}?v=${ctx.assetVersion ? ctx.assetVersion('src/client/admin.js') : '0'}`],
    bodyClass: 'page-admin',
    noindex: true,
    layers: false,
  });
}

function renderPageWrap(ctx, opts) {
  return ctx.renderPage(opts);
}

export { MAINLINE, PROJECT_FOLDERS };
