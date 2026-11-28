import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import * as esbuild from 'esbuild';
import { createEngine, renderPlainMarkdown, escapeHtml } from './src/core/markdown.js';
import { loadVault, createLinkIndex } from './src/core/vault.js';
import { createRedactor, isPrivateNote } from './src/core/privacy.js';
import { renderPage, makeUrl } from './src/site/layout.js';
import { reloadPage, archivePage, knowledgePage, notePage, projectsPage, projectPage, aboutPage, folderPage, gamesPage, gameDetailPage, esportsPage, tutorialsPage, achievementsPage, linksPage, acgPage, privatePage, updatesPage, authPage, adminPage, notFoundPage, noteUrl, MAINLINE, PROJECT_FOLDERS } from './src/site/pages.js';

const ROOT = import.meta.dirname;
const DIST = path.join(ROOT, 'dist');
const skipped = [];
const htmlPages = [];
/** 页面路径 → 内容最后修改时间，供 sitemap 标注 lastmod。 */
const lastmodByPath = new Map();
cleanDist(DIST);

/** 逐个删除，被浏览器占用的文件跳过（Windows 下整目录 rm 会 EPERM）。 */
function cleanDist(dir) {
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  const dirs = [];
  while (stack.length) {
    const d = stack.pop();
    dirs.push(d);
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) stack.push(abs);
      else {
        try { fs.unlinkSync(abs); } catch {
          // 文件被占用或宿主环境的安全删除机制失败时跳过；同名文件会在写入时覆盖
          skipped.push(abs);
        }
      }
    }
  }
  for (const d of dirs.sort((a, b) => b.length - a.length)) {
    if (d === dir) continue;
    try { fs.rmdirSync(d); } catch { /* 非空或占用 */ }
  }
}

const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/profile.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const SITE_URL = String(profile.siteUrl || '').replace(/\/+$/, '');
const ghRepos = readJson('data/github.json', []);
const ghExtra = readJson('data/github-extra.json', { repos: {} });
const gamesData = readJson('data/games.json', { updated: '', games: [] });
const esportsData = readJson('data/esports.json', { titles: [], events: [], teams: [], milestones: [] });
const liquipediaData = readJson('data/esports-liquipedia.json', { titles: [], players: [], posters: [] });
const linksData = readJson('data/links.json', { groups: [] });
const updatesData = readJson('data/updates.json', { updated: '', entries: [] });
const acgData = readJson('data/acg.json', { items: [] });
const tutorialsData = readJson('data/tutorials.json', { pageSize: 12, items: [] });
const achievementsData = readJson('data/achievements.json', { games: [], items: [] });

function readJson(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    console.warn(`! 缺少 ${rel}，使用空数据`);
    return fallback;
  }
}

// ---------- 知识库 ----------
const redact = createRedactor(profile.privacy);
const rawNotes = loadVault(path.resolve(profile.vault));
if (!rawNotes.length) throw new Error(`知识库为空：${profile.vault}`);
const privateNotes = rawNotes.filter((n) => isPrivateNote(n, profile.privacy));
const privateLink = createLinkIndex(privateNotes);
const privateById = new Map(privateNotes.map((n) => [n.id, n]));
const notes = rawNotes
  .filter((n) => !isPrivateNote(n, profile.privacy))
  .map((n) => ({
    ...n,
    body: redact(n.body),
    title: redact(n.title),
    tags: n.tags.map(redact),
    aliases: n.aliases.map(redact),
  }));
const byId = new Map(notes.map((n) => [n.id, n]));
const link = createLinkIndex(notes);

let currentId = null;
const url = makeUrl(profile.basePath);
const ctx = {
  profile,
  url,
  notes,
  byId,
  renderPage: (opts) => renderPage({ ctx, ...opts }),
};
const headingIds = new Map();
const engine = createEngine({
  resolve: (target, alias) => {
    const hit = link.resolve(target, currentId);
    if (!hit) {
      const ph = privateLink.resolve(target, currentId);
      if (!ph) return null;
      const pn = privateById.get(ph.id);
      return { id: ph.id, label: pn ? pn.base : ph.id.split('/').pop(), private: true };
    }
    const note = byId.get(hit.id);
    return {
      id: hit.id,
      label: note ? note.base : hit.id.split('/').pop(),
      index: note?.isIndex,
      anchors: headingIds.get(hit.id),
    };
  },
  noteUrl: (id) => noteUrl(ctx, id),
});
ctx.engine = engine;
ctx.version = pkg.version;

/** 资源内容指纹：给 app.css / app.js / 图层加 ?v=，改版后不会被浏览器旧缓存挡住。 */
const assetVersions = new Map();
ctx.assetVersion = (rel) => {
  if (assetVersions.has(rel)) return assetVersions.get(rel);
  let hash = '0';
  try {
    hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8);
  } catch { /* 缺文件时退回 0，不影响构建 */ }
  assetVersions.set(rel, hash);
  return hash;
};

ctx.folderOf = link.folderIndex;
ctx.folderPageUrl = (key) => url('knowledge', 'f', key) + '.html';
ctx.orderedNotes = notes;

// ---------- 渲染笔记 ----------
const stats = { notes: notes.length, folders: 0, headings: 0, wikiLinks: 0, unresolved: 0, snippets: 0, codeLines: 0, bytes: 0, repos: ghRepos.length, commits: 0 };
ctx.stats = stats;
const statByNote = new Map();
const unresolvedList = [];
const searchDocs = [];
const feedItems = [];
const renderedByNote = new Map();

ctx.statByNote = statByNote;

/** 第一遍：只为收集每篇笔记的标题 id，第二遍才能校验跨笔记锚点。 */
for (const note of notes) {
  currentId = note.id;
  const pass = engine.render(note.body);
  headingIds.set(note.id, new Set(pass.sections.map((s) => s.a).filter(Boolean)));
}

for (const note of notes) {
  currentId = note.id;
  const rendered = engine.render(note.body);
  let snippets = 0;
  let codeLines = 0;
  for (const m of note.body.matchAll(/^ {0,3}(?:`{3,}|~{3,})[^\n]*\n([\s\S]*?)^ {0,3}(?:`{3,}|~{3,})[ \t]*$/gm)) {
    snippets++;
    codeLines += m[1].split('\n').filter((l) => l.trim()).length;
  }
  stats.headings += rendered.toc.length + 1;
  stats.wikiLinks += rendered.wikiCount;
  stats.unresolved += rendered.unresolved.count;
  stats.snippets += snippets;
  stats.codeLines += codeLines;
  stats.bytes += note.bytes;
  statByNote.set(note.id, { headings: rendered.toc.length + 1, wiki: rendered.wikiCount });
  for (const u of rendered.unresolved.items) unresolvedList.push(`${note.id} → ${u}`);
  for (const w of rendered.warnings) console.warn(`  ! ${note.id}: ${w}`);

  const href = noteUrl(ctx, note.id);
  for (const s of rendered.sections) {
    searchDocs.push({
      note: note.id,
      title: note.title,
      sec: s.h,
      lvl: s.lvl,
      href: href + (s.a ? `#${s.a}` : ''),
      folder: note.folder || '根目录',
      tags: note.tags.filter((t) => !t.startsWith('图谱/')),
      aliases: note.aliases,
      text: s.t,
      index: note.isIndex,
    });
  }

  renderedByNote.set(note.id, rendered);
  feedItems.push({
    title: note.title,
    href,
    date: new Date(note.mtime),
    desc: (rendered.sections.find((s) => s.t)?.t || '').replace(/\s+/g, ' ').trim().slice(0, 160),
  });
}
currentId = null;

// ---------- 分区 ----------
function firstQuote(body) {
  const lines = body.split('\n');
  let fence = false;
  for (const line of lines) {
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const m = line.match(/^ {0,3}>+\s?(.+)$/);
    if (m) {
      let t = m[1].replace(/\[\[([^\[\]]+)\]\]/g, (_, inner) => {
        const p = inner.split('|');
        return p.length > 1 ? p[p.length - 1] : p[0].split('#')[0].split('/').pop();
      }).replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
      return t.length > 150 ? t.slice(0, 150) + '…' : t;
    }
  }
  return '';
}

const folders = [];
const folderMap = new Map();
for (const n of notes) {
  const key = n.folder || '根目录';
  if (!folderMap.has(key)) {
    const f = { key, label: key, notes: [], indexId: null, desc: '' };
    folderMap.set(key, f);
    folders.push(f);
  }
  folderMap.get(key).notes.push(n);
}
for (const f of folders) {
  if (f.key === '根目录') { f.label = '总览与暂存'; continue; }
  const idx = link.folderIndex.get(f.key);
  f.indexId = idx || null;
  if (idx) f.desc = firstQuote(byId.get(idx).body);
}
const order = new Map();
MAINLINE.forEach((k, i) => order.set(k, i));
PROJECT_FOLDERS.forEach((k, i) => order.set(k, 100 + i));
folders.sort((a, b) => {
  const oa = order.has(a.key) ? order.get(a.key) : (a.key === '根目录' ? 900 : 200);
  const ob = order.has(b.key) ? order.get(b.key) : (b.key === '根目录' ? 900 : 200);
  if (oa !== ob) return oa - ob;
  return b.notes.length - a.notes.length || a.key.localeCompare(b.key, 'zh');
});
ctx.folders = folders;
stats.folders = folders.filter((f) => f.key !== '根目录').length;

// ---------- 项目 ----------
const repoArchive = new Map();
for (const n of notes) {
  if (!n.repo) continue;
  const m = String(n.repo).match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (m) repoArchive.set(m[2].toLowerCase(), n.id);
}

const catIndex = (c) => profile.categories.indexOf(c) + 1;
const plainMarked = engine.marked;

function readmeFor(name, repo) {
  const file = path.join(ROOT, 'data/readmes', `${name}.md`);
  if (!fs.existsSync(file)) return '';
  const src = redact(fs.readFileSync(file, 'utf8'));
  return renderPlainMarkdown(plainMarked, src, {
    repoUrl: repo.html_url,
    transformLink: (href) => `${repo.html_url}/blob/${repo.default_branch}/${href.replace(/^\.\//, '')}`,
    transformImage: (src) => `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${src.replace(/^\.\//, '')}`,
  });
}

const projects = [];
for (const repo of ghRepos) {
  const ov = profile.projects[repo.name] || {};
  const extra = ghExtra.repos[repo.name] || {};
  const archiveId = ov.note || repoArchive.get(repo.name.toLowerCase()) || null;
  const langs = Object.entries(extra.languages || {}).filter(([, v]) => v > 0).slice(0, 4);
  projects.push({
    key: repo.name,
    slug: repo.name,
    display: redact(ov.display || repo.name),
    category: ov.category || '个人项目',
    categoryIndex: catIndex(ov.category || '个人项目'),
    tagline: redact(ov.tagline || repo.description || ''),
    highlights: (ov.highlights || []).map(redact),
    featured: !!ov.featured,
    featuredRank: ov.featuredRank ?? 99,
    local: false,
    isGitHub: true,
    repo,
    repoUrl: repo.html_url,
    pageHref: url('projects', repo.name) + '.html',
    archiveId,
    archiveHref: archiveId ? noteUrl(ctx, archiveId) : null,
    noteIds: archiveId ? [archiveId] : [],
    relatedIds: [],
    readmeHtml: readmeFor(repo.name, repo),
    langBreakdown: langs,
    langBars: langs.length ? `<div class="langbars-inline">${langs.map(([l, v]) => `<span class="langchip"><i data-l="${l}"></i>${l} ${v}%</span>`).join('')}</div>` : '',
    stackTop: repo.language || langs[0]?.[0] || '—',
    commitCount: extra.commits ?? null,
    pushedShort: (repo.pushed_at || '').slice(0, 10),
  });
}
for (const wp of profile.localProjects || []) {
  const noteIds = (wp.notes || []).filter((id) => byId.has(id));
  const relatedIds = (wp.related || []).filter((id) => byId.has(id));
  const archiveId = noteIds[0] || null;
  const stack = (wp.stack || []).map(redact);
  projects.push({
    key: wp.slug,
    slug: wp.slug,
    display: redact(wp.display),
    category: wp.category || '工作项目',
    categoryIndex: catIndex(wp.category || '工作项目'),
    tagline: redact(wp.tagline),
    summary: redact(wp.summary),
    role: redact(wp.role),
    period: redact(wp.period),
    stack,
    stats: (wp.stats || []).map((s) => ({ n: redact(s.n), l: redact(s.l) })),
    modules: (wp.modules || []).map((m) => ({ name: redact(m.name), desc: redact(m.desc) })),
    challenges: (wp.challenges || []).map((c) => ({ title: redact(c.title), desc: redact(c.desc) })),
    privacy: redact(wp.privacy),
    highlights: (wp.highlights || []).map(redact),
    featured: !!wp.featured,
    featuredRank: wp.featuredRank ?? 99,
    local: true,
    isGitHub: false,
    repo: null,
    repoUrl: null,
    pageHref: url('projects', wp.slug) + '.html',
    archiveId,
    archiveHref: archiveId ? noteUrl(ctx, archiveId) : null,
    noteIds,
    relatedIds,
    readmeHtml: '',
    langBreakdown: [],
    langBars: stack.map((s) => `<span class="chip chip-ghost">${escapeHtml(s)}</span>`).join(''),
    stackTop: stack[0] || '内部交付',
    commitCount: null,
    pushedShort: '',
  });
}
stats.commits = projects.reduce((a, p) => a + (p.commitCount || 0), 0);
ctx.projects = projects;
ctx.games = gamesData.games || [];
const mergedTitles = [...(esportsData.titles || [])];
for (const t of (liquipediaData.titles || [])) {
  if (!mergedTitles.some((x) => x.key === t.key)) mergedTitles.push(t);
}
ctx.esports = {
  ...esportsData,
  titles: mergedTitles,
  players: liquipediaData.players || [],
  posters: liquipediaData.posters || [],
};
ctx.updates = updatesData;
ctx.acg = acgData;
ctx.tutorials = tutorialsData;
ctx.achievements = achievementsData;
ctx.links = linksData;
ctx.featuredProjects = projects
  .filter((p) => p.featured)
  .sort((a, b) => a.featuredRank - b.featuredRank);
const projectByNote = new Map();
for (const pr of projects) {
  for (const id of pr.noteIds || []) {
    if (!projectByNote.has(id)) projectByNote.set(id, pr);
  }
}
ctx.projectByNote = projectByNote;
const langCount = new Map();
for (const r of ghRepos) langCount.set(r.language || '其他', (langCount.get(r.language || '其他') || 0) + 1);
ctx.langStats = [...langCount].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

// ---------- 笔记页（依赖项目映射，放在项目之后写盘） ----------
for (const note of notes) {
  currentId = note.id;
  const rel = path.join('notes', ...note.id.split('/')) + '.html';
  writeFile(rel, notePage(ctx, note, renderedByNote.get(note.id)));
  const stamp = new Date(note.mtime).toISOString();
  lastmodByPath.set(pagePath(rel), stamp.slice(0, 10));
}
currentId = null;

// ---------- 站点页面 ----------
writeFile('index.html', reloadPage(ctx));
writeFile('archive.html', archivePage(ctx));
writeFile(path.join('knowledge', 'index.html'), knowledgePage(ctx));
for (const f of folders) writeFile(path.join('knowledge', 'f', f.key) + '.html', folderPage(ctx, f));
writeFile(path.join('projects', 'index.html'), projectsPage(ctx));
writeFile('about.html', aboutPage(ctx));
for (const pr of projects) writeFile(path.join('projects', pr.slug) + '.html', projectPage(ctx, pr));
writeFile(path.join('games', 'index.html'), gamesPage(ctx));
for (const g of ctx.games) writeFile(path.join('games', g.slug) + '.html', gameDetailPage(ctx, g));
writeFile(path.join('esports', 'index.html'), esportsPage(ctx));
const tutorialPageSize = Number(tutorialsData.pageSize) || 12;
const tutorialTotalPages = Math.max(1, Math.ceil((tutorialsData.items || []).length / tutorialPageSize));
for (let i = 1; i <= tutorialTotalPages; i++) {
  const rel = i === 1 ? path.join('tutorials', 'index.html') : path.join('tutorials', 'page', `${i}.html`);
  writeFile(rel, tutorialsPage(ctx, i));
}
writeFile(path.join('achievements', 'index.html'), achievementsPage(ctx));
writeFile(path.join('links', 'index.html'), linksPage(ctx));
writeFile(path.join('acg', 'index.html'), acgPage(ctx));
writeFile('private.html', privatePage(ctx));
writeFile('updates.html', updatesPage(ctx));
writeFile('login.html', authPage(ctx, 'login'), { noindex: true });
writeFile('register.html', authPage(ctx, 'register'), { noindex: true });
writeFile('admin.html', adminPage(ctx), { noindex: true });
writeFile('404.html', notFoundPage(ctx), { noindex: true });

writeFile(path.join('assets', 'search-index.json'), JSON.stringify({
  builtAt: new Date().toISOString(),
  notes: searchDocs,
  projects: projects.map((p) => ({ title: p.display, text: p.tagline, href: p.pageHref, category: p.category })),
}));
const minifyAsset = (file, loader) => esbuild.transformSync(
  fs.readFileSync(path.join(ROOT, file), 'utf8'),
  { loader, minify: true, legalComments: 'none' },
).code;
writeFile(path.join('assets', 'app.css'), minifyAsset('src/client/app.css', 'css'));
writeFile(path.join('assets', 'app.js'), minifyAsset('src/client/app.js', 'js'));
for (const name of ['auth.js', 'admin.js']) {
  writeFile(path.join('assets', name), minifyAsset(`src/client/${name}`, 'js'));
}
const layersDir = path.join(ROOT, 'src/client/layers');
if (fs.existsSync(layersDir)) {
  for (const name of fs.readdirSync(layersDir).sort()) {
    const ext = path.extname(name).slice(1);
    const src = fs.readFileSync(path.join(layersDir, name), 'utf8');
    const out = ext === 'css' || ext === 'js'
      ? esbuild.transformSync(src, { loader: ext, minify: true, legalComments: 'none' }).code
      : src;
    writeFile(path.join('assets', 'layers', name), out);
  }
}
fs.cpSync(path.join(ROOT, 'src/assets'), path.join(DIST, 'assets'), { recursive: true });
const achievementsImages = path.join(ROOT, 'src/static/achievements');
if (fs.existsSync(achievementsImages)) {
  fs.cpSync(achievementsImages, path.join(DIST, 'assets/achievements'), { recursive: true });
}
fs.copyFileSync(path.join(ROOT, 'src/static/manifest.webmanifest'), path.join(DIST, 'manifest.webmanifest'));
const buildId = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, 'src/client/app.css')))
  .update(fs.readFileSync(path.join(ROOT, 'src/client/app.js')))
  .digest('hex').slice(0, 10);
fs.writeFileSync(
  path.join(DIST, 'sw.js'),
  fs.readFileSync(path.join(ROOT, 'src/static/sw.js'), 'utf8').replaceAll('__BUILD_ID__', buildId),
);
writeSeoFiles();
writeFeed();

// ---------- React 岛屿 ----------
await bundleIslands();

async function bundleIslands() {
  const out = path.join(DIST, 'assets', 'islands.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/islands/index.jsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    jsx: 'automatic',
    alias: {
      react: 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat',
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    outfile: out,
    logLevel: 'warning',
  });
  return fs.statSync(out).size;
}

function pagePath(rel) {
  const p = rel.replace(/\\/g, '/');
  const pathname = p === 'index.html'
    ? '/'
    : '/' + p.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
  return pathname.split('/').map(encodeURIComponent).join('/');
}

function writeFile(rel, content, opts = {}) {
  const abs = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (rel.endsWith('.html')) {
    if (!opts.noindex) htmlPages.push(pagePath(rel));
    const canonical = (SITE_URL || '') + pagePath(rel);
    content = String(content)
      .replaceAll('__CANONICAL__', canonical)
      .replaceAll('__SITE_URL__', SITE_URL);
  }
  fs.writeFileSync(abs, content);
}

function writeSeoFiles() {
  if (!SITE_URL) {
    console.warn('! 未配置 profile.siteUrl，跳过 sitemap.xml / robots.txt');
    return;
  }
  const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const urls = htmlPages.map((p) => {
    const lastmod = lastmodByPath.get(p);
    return `  <url><loc>${escXml(SITE_URL + p)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  }).join('\n');
  writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  writeFile('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

/** RSS 2.0：按文件修改时间取最近 30 篇笔记，供阅读器与聚合站订阅。 */
function writeFeed() {
  if (!SITE_URL) {
    console.warn('! 未配置 profile.siteUrl，跳过 feed.xml');
    return 0;
  }
  const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const items = feedItems
    .slice()
    .sort((a, b) => b.date - a.date)
    .slice(0, 30)
    .map((it) => `    <item>
      <title>${xml(it.title)}</title>
      <link>${xml(SITE_URL + it.href)}</link>
      <guid isPermaLink="true">${xml(SITE_URL + it.href)}</guid>
      <pubDate>${it.date.toUTCString()}</pubDate>
      <description>${xml(it.desc)}</description>
    </item>`)
    .join('\n');
  writeFile('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(profile.site.title)} · 笔记</title>
    <link>${xml(SITE_URL + '/')}</link>
    <description>${xml(profile.site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${xml(SITE_URL + '/feed.xml')}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`);
  return Math.min(feedItems.length, 30);
}

/** 为文本类产物预生成 .br / .gz，供服务器按 Accept-Encoding 直接返回。 */
function precompress() {
  if (process.env.NO_COMPRESS === '1') {
    console.log('  已跳过预压缩（NO_COMPRESS=1，静态托管自带 gzip 时用）');
    return 0;
  }
  const exts = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);
  const stack = [DIST];
  let n = 0;
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { stack.push(abs); continue; }
      if (e.name.endsWith('.br') || e.name.endsWith('.gz')) continue;
      if (!exts.has(path.extname(e.name).toLowerCase())) continue;
      const buf = fs.readFileSync(abs);
      fs.writeFileSync(abs + '.br', zlib.brotliCompressSync(buf, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
      }));
      fs.writeFileSync(abs + '.gz', zlib.gzipSync(buf, { level: 9 }));
      n++;
    }
  }
  return n;
}

precompress();
