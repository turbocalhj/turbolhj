import { escapeHtml } from './markdown.js';

const MAINLINE = ['前端', '后端', '框架', '语言', '数据库', '计算机基础', 'DevOps', '大数据', 'Agent'];
const PROJECT_FOLDERS = ['短链服务', '网约车监控', 'CloudeV2', 'PLM开发BOM入口', 'PLM系统开发', '数据分析挖掘'];

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

/** 左侧知识库目录树 */
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
  const body = groups.map((g) => {
    const open = currentId && currentId.startsWith(`${g.key}/`) ? ' open' : '';
    const items = g.items.map((n) => {
      const active = n.id === currentId;
      return `<a class="side-note${n.isIndex ? ' is-index' : ''}${active ? ' is-active' : ''}" href="${noteUrl(ctx, n.id)}">${escapeHtml(n.base)}</a>`;
    }).join('');
    return `<details class="side-group"${open}><summary><span>${escapeHtml(g.key)}</span><em>${g.items.length}</em></summary><div class="side-items">${items}</div></details>`;
  }).join('');
  return `<aside class="sidebar" aria-label="知识库目录"><div class="sidebar-head"><a href="${ctx.url('knowledge', 'index.html')}">知识库 · ${ctx.notes.length} 篇</a><input class="side-filter" id="side-filter" type="search" placeholder="筛选目录" autocomplete="off"></div><div class="side-body">${body}</div></aside>`;
}

export function homePage(ctx) {
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
      eyebrow: `${f.notes.length} 篇${f.indexId ? ' · 有索引' : ''}`,
      title: `<a href="${f.indexId ? noteUrl(ctx, f.indexId) : ctx.folderPageUrl(f.key)}">${escapeHtml(f.label)}</a>`,
      desc: f.desc ? escapeHtml(f.desc) : '随手笔记归档。',
      meta: preview ? `<div class="mini-links">${preview}</div>` : '',
    });
  }).join('');

  const stack = p.person.stack.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('');

  const content = `
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
<section class="band"><h2 class="band-title">精选项目</h2><p class="band-sub">每个项目都配一份可回溯的档案笔记：定位、实现、边界与不足。</p><div class="grid grid-2">${projCards}</div><p class="band-more"><a href="${ctx.url('projects', 'index.html')}">全部 ${stats.repos + ctx.profile.workProjects.length} 个项目 →</a></p></section>
<section class="band"><h2 class="band-title">知识地图</h2><p class="band-sub">技术主线打底，项目档案落地，两边用双链互指。</p><div class="grid grid-3">${folderCards}</div><p class="band-more"><a href="${ctx.url('knowledge', 'index.html')}">知识库总览 →</a></p></section>`;

  return renderPageWrap(ctx, {
    title: `${p.site.title} · ${p.site.tagline}`,
    desc: p.site.description,
    section: 'home',
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
  const folderCards = ctx.folders.map((f) => {
    const items = f.notes.slice(0, 12).map((n) => `<a href="${noteUrl(ctx, n.id)}">${escapeHtml(n.base)}</a>`).join('');
    return `<article class="foldercard">
      <header><h3><a href="${f.indexId ? noteUrl(ctx, f.indexId) : ctx.folderPageUrl(f.key)}">${escapeHtml(f.label)}</a></h3><span class="count">${f.notes.length}</span></header>
      ${f.desc ? `<p>${escapeHtml(f.desc)}</p>` : ''}
      <div class="foldercard-notes">${items}${f.notes.length > 12 ? `<a class="more" href="${ctx.folderPageUrl(f.key)}">全部 ${f.notes.length} 篇 →</a>` : ''}</div>
    </article>`;
  }).join('');
  const content = `
<section class="page-head"><h1>知识库</h1><p class="page-sub">来自本地 Obsidian 库 <code>${escapeHtml(ctx.profile.vault)}</code>，共 ${ctx.notes.length} 篇笔记、${ctx.stats.folders} 个分区。双链、代码块、表格按原样保留并转为站内链接。</p></section>
${mocHtml}
<section class="band"><h2 class="band-title">分区</h2><div class="grid grid-2">${folderCards}</div></section>`;
  return renderPageWrap(ctx, {
    title: '知识库 · ' + ctx.profile.site.title,
    section: 'knowledge',
    content,
    sidebar: buildSidebar(ctx, null),
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
  const nav = noteNav(ctx, note);
  const content = `
<article class="note">
  <header class="note-head">
    <h1>${escapeHtml(note.title)}</h1>
    <div class="note-meta"><span>${ctx.statByNote.get(note.id)?.headings ?? 0} 个标题</span><span>${escapeHtml(note.rel)}</span><span>${(note.bytes / 1024).toFixed(1)} KB</span>${meta.join('')}</div>
    ${chips ? `<div class="note-chips">${chips}</div>` : ''}
    ${aliases}
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
  const blocks = cats.map((c) => {
    const items = ctx.projects.filter((p) => p.category === c);
    if (!items.length) return '';
    const html = items.map((pr) => card({
      eyebrow: `${pr.category}${pr.isGitHub ? ' · 开源' : ' · 内部'}${pr.stackTop ? ' · ' + pr.stackTop : ''}`,
      title: `<a href="${pr.pageHref}">${escapeHtml(pr.display)}</a>`,
      desc: escapeHtml(pr.tagline),
      meta: `${pr.langBars || ''}${(pr.highlights || []).slice(0, 3).map((h) => `<span class="chip chip-ghost">${escapeHtml(h)}</span>`).join('')}`,
      links: [
        pr.repoUrl ? `<a href="${pr.repoUrl}" target="_blank" rel="noopener">GitHub</a>` : '',
        pr.archiveHref ? `<a href="${pr.archiveHref}">档案笔记</a>` : '',
        pr.readmeHref ? `<a href="${pr.pageHref}">README</a>` : '',
      ].filter(Boolean).join(''),
    })).join('');
    return `<section class="band"><h2 class="band-title">${escapeHtml(c)}</h2><div class="grid grid-2">${html}</div></section>`;
  }).join('');

  const langRows = ctx.langStats.map(([lang, n]) => `<tr><td>${escapeHtml(lang)}</td><td>${n}</td><td><div class="bar"><i style="width:${Math.round((n / ctx.langStats[0][1]) * 100)}%"></i></div></td></tr>`).join('');
  const content = `
<section class="page-head"><h1>项目</h1><p class="page-sub">GitHub 上的 ${ctx.stats.repos} 个开源仓库，加上两份未开源的工作项目档案。元数据来自 <code>data/github.json</code> 快照，可用 <code>npm run refresh</code> 更新。</p></section>
${blocks}
<section class="band"><h2 class="band-title">语言分布</h2><div class="panel-table"><table><thead><tr><th>语言</th><th>仓库数</th><th>占比</th></tr></thead><tbody>${langRows}</tbody></table></div></section>`;
  return renderPageWrap(ctx, { title: '项目 · ' + ctx.profile.site.title, section: 'projects', content });
}

export function projectPage(ctx, pr) {
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

export function aboutPage(ctx) {
  const p = ctx.profile;
  const content = `
<section class="page-head"><h1>关于</h1><p class="page-sub">${escapeHtml(p.person.tagline || p.site.tagline)}</p></section>
<div class="about-grid">
  <div class="panel-table">
    <table><tbody>
      <tr><td>姓名</td><td>${escapeHtml(p.person.name)}</td></tr>
      <tr><td>GitHub</td><td><a href="${p.github}" target="_blank" rel="noopener">${escapeHtml(p.person.handle)} ↗</a></td></tr>
      <tr><td>方向</td><td>${escapeHtml(p.person.role)}</td></tr>
      <tr><td>坐标</td><td>${escapeHtml(p.person.location)}</td></tr>
      <tr><td>知识库</td><td><code>${escapeHtml(p.vault)}</code></td></tr>
      <tr><td>站点</td><td>本地静态站，<code>npm run dev</code> 起服务</td></tr>
    </tbody></table>
  </div>
  <div class="panel">
    <div class="panel-title">这个站是怎么来的</div>
    <ol class="steps">
      <li>扫描 Obsidian 库，解析 frontmatter、双链 <code>[[ ]]</code>、代码块与表格。</li>
      <li>拉取 GitHub 仓库元数据与 README，缓存成 <code>data/</code> 快照，离线可构建。</li>
      <li>生成静态页面与搜索索引，全部产物在 <code>dist/</code>。</li>
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
  <p class="page-sub">${f.desc ? escapeHtml(f.desc) : `${f.notes.length} 篇笔记。`}</p>
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
