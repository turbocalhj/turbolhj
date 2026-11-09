import fs from 'node:fs';
import path from 'node:path';
import { createEngine, renderPlainMarkdown, escapeHtml } from './src/markdown.js';
import { loadVault, createLinkIndex } from './src/vault.js';
import { renderPage, makeUrl } from './src/layout.js';
import { homePage, knowledgePage, notePage, projectsPage, projectPage, aboutPage, folderPage, noteUrl, MAINLINE, PROJECT_FOLDERS } from './src/pages.js';

const ROOT = import.meta.dirname;
const DIST = path.join(ROOT, 'dist');
const skipped = [];
cleanDist(DIST);
const T0 = Date.now();

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
        try { fs.unlinkSync(abs); } catch (err) {
          if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
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
const ghRepos = readJson('data/github.json', []);
const ghExtra = readJson('data/github-extra.json', { repos: {} });

function readJson(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    console.warn(`! 缺少 ${rel}，使用空数据`);
    return fallback;
  }
}

// ---------- 知识库 ----------
const notes = loadVault(path.resolve(profile.vault));
if (!notes.length) throw new Error(`知识库为空：${profile.vault}`);
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
    if (!hit) return null;
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

ctx.folderOf = link.folderIndex;
ctx.folderPageUrl = (key) => url('knowledge', 'f', key) + '.html';
ctx.orderedNotes = notes;

// ---------- 渲染笔记 ----------
const stats = { notes: notes.length, folders: 0, headings: 0, wikiLinks: 0, unresolved: 0, snippets: 0, codeLines: 0, bytes: 0, repos: ghRepos.length, commits: 0 };
ctx.stats = stats;
const statByNote = new Map();
const unresolvedList = [];
const searchDocs = [];

ctx.statByNote = statByNote;
const degradedList = [];

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
  for (const d of rendered.unresolved.degraded) degradedList.push(`${note.id} → ${d}`);
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

  writeFile(path.join('notes', ...note.id.split('/')) + '.html', notePage(ctx, note, rendered));
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
  const src = fs.readFileSync(file, 'utf8');
  return renderPlainMarkdown(plainMarked, src, {
    repoUrl: repo.html_url,
    transformLink: (href) => `${repo.html_url}/blob/${repo.default_branch}/${href.replace(/^\.\//, '')}`,
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
    display: ov.display || repo.name,
    category: ov.category || '个人项目',
    categoryIndex: catIndex(ov.category || '个人项目'),
    tagline: ov.tagline || repo.description || '',
    highlights: ov.highlights || [],
    featured: !!ov.featured,
    isGitHub: true,
    repo,
    repoUrl: repo.html_url,
    pageHref: url('projects', repo.name) + '.html',
    archiveId,
    archiveHref: archiveId ? noteUrl(ctx, archiveId) : null,
    readmeHtml: readmeFor(repo.name, repo),
    langBreakdown: langs,
    langBars: langs.length ? `<div class="langbars-inline">${langs.map(([l, v]) => `<span class="langchip"><i data-l="${l}"></i>${l} ${v}%</span>`).join('')}</div>` : '',
    stackTop: repo.language || langs[0]?.[0] || '—',
    commitCount: extra.commits ?? null,
    pushedShort: (repo.pushed_at || '').slice(0, 10),
  });
}
for (const wp of profile.workProjects || []) {
  const archiveId = wp.note && byId.has(wp.note) ? wp.note : null;
  const slug = (archiveId || wp.display).split('/').pop().replace(/\s+/g, '-');
  projects.push({
    key: wp.display,
    slug: 'work-' + slug,
    display: wp.display,
    category: wp.category || '工作项目',
    categoryIndex: catIndex(wp.category || '工作项目'),
    tagline: wp.tagline,
    highlights: wp.highlights || [],
    featured: !!wp.featured,
    isGitHub: false,
    repo: null,
    repoUrl: null,
    pageHref: url('projects', 'work-' + slug) + '.html',
    archiveId,
    archiveHref: archiveId ? noteUrl(ctx, archiveId) : null,
    readmeHtml: '',
    langBreakdown: [],
    langBars: (wp.stack || []).map((s) => `<span class="chip chip-ghost">${escapeHtml(s)}</span>`).join(''),
    stackTop: (wp.stack || [])[0] || '内部交付',
    commitCount: null,
    pushedShort: '',
  });
}
stats.commits = projects.reduce((a, p) => a + (p.commitCount || 0), 0);
ctx.projects = projects;
ctx.featuredProjects = projects.filter((p) => p.featured);
const langCount = new Map();
for (const r of ghRepos) langCount.set(r.language || '其他', (langCount.get(r.language || '其他') || 0) + 1);
ctx.langStats = [...langCount].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

// ---------- 站点页面 ----------
writeFile('index.html', homePage(ctx));
writeFile(path.join('knowledge', 'index.html'), knowledgePage(ctx));
for (const f of folders) writeFile(path.join('knowledge', 'f', f.key) + '.html', folderPage(ctx, f));
writeFile(path.join('projects', 'index.html'), projectsPage(ctx));
writeFile('about.html', aboutPage(ctx));
for (const pr of projects) writeFile(path.join('projects', pr.slug) + '.html', projectPage(ctx, pr));

writeFile(path.join('assets', 'search-index.json'), JSON.stringify({
  builtAt: new Date().toISOString(),
  notes: searchDocs,
  projects: projects.map((p) => ({ title: p.display, text: p.tagline, href: p.pageHref, category: p.category })),
}));
writeFile(path.join('assets', 'app.css'), fs.readFileSync(path.join(ROOT, 'src/app.css'), 'utf8'));
writeFile(path.join('assets', 'app.js'), fs.readFileSync(path.join(ROOT, 'src/client.js'), 'utf8'));
writeFile(path.join('assets', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#4f46e5"/><text x="16" y="22" font-family="ui-monospace,monospace" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">L</text></svg>`);

function writeFile(rel, content) {
  const abs = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

// 报告
const totalFiles = countFiles(DIST);
console.log(`\n构建完成（${((Date.now() - T0) / 1000).toFixed(1)}s）`);
console.log(`  笔记 ${stats.notes} 篇 / 分区 ${stats.folders} 个 / 标题 ${stats.headings} / 双链 ${stats.wikiLinks}（未解析 ${stats.unresolved}）`);
console.log(`  代码块 ${stats.snippets} 个 / ${stats.codeLines} 行；知识库体积 ${(stats.bytes / 1048576).toFixed(2)} MB`);
console.log(`  项目 ${projects.length} 个（开源 ${ghRepos.length}）/ 提交 ${stats.commits}`);
console.log(`  产物 ${totalFiles} 个文件 → dist/`);
console.log(`  搜索索引 ${searchDocs.length} 个小节（${(fs.statSync(path.join(DIST, 'assets/search-index.json')).size / 1024).toFixed(0)} KB）`);
if (degradedList.length) {
  const uniq = [...new Set(degradedList)];
  console.log(`\n  锚点已失效的双链（${uniq.length} 条，已降级为跳到笔记开头）：`);
  for (const d of uniq.slice(0, 20)) console.log('    - ' + d);
  if (uniq.length > 20) console.log(`    … 其余 ${uniq.length - 20} 条`);
}
if (skipped.length) console.log(`  ! ${skipped.length} 个旧文件被占用未删除（重启服务后重建即可）：${skipped.slice(0, 3).join(', ')}`);
if (unresolvedList.length) {
  const uniq = [...new Map(unresolvedList.map((u) => [u, u])).values()];
  console.log(`\n  未解析的双链（${uniq.length} 条）：`);
  for (const u of uniq.slice(0, 25)) console.log('    - ' + u);
  if (uniq.length > 25) console.log(`    … 其余 ${uniq.length - 25} 条`);
}

function countFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countFiles(path.join(dir, e.name));
    else n++;
  }
  return n;
}
