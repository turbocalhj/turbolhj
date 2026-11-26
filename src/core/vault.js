import fs from 'node:fs';
import path from 'node:path';
import { splitFrontmatter, slugify } from './markdown.js';

const INDEX_TAG = '图谱/索引';

export function titleOf(body, fallback) {
  const lines = body.split('\n');
  let fence = false;
  for (const line of lines) {
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const m = line.match(/^ {0,3}#[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    if (m) return m[1].replace(/[*_`]/g, '').trim();
  }
  return fallback;
}

function walk(dir, root, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, root, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(abs);
  }
}

export function loadVault(vaultPath) {
  const files = [];
  walk(vaultPath, vaultPath, files);
  const notes = [];
  for (const abs of files) {
    const rel = path.relative(vaultPath, abs).replace(/\\/g, '/');
    const raw = fs.readFileSync(abs, 'utf8');
    const { data, body } = splitFrontmatter(raw);
    const id = rel.replace(/\.md$/i, '');
    const folder = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : '';
    const base = id.slice(id.lastIndexOf('/') + 1);
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    const aliases = Array.isArray(data.aliases) ? data.aliases.map(String) : [];
    notes.push({
      id, folder, base, rel, abs, data, body, tags, aliases,
      title: titleOf(body, base),
      isIndex: tags.includes(INDEX_TAG) || /\s·\s索引$/.test(base),
      repo: typeof data.仓库 === 'string' ? data.仓库 : null,
      bytes: Buffer.byteLength(raw, 'utf8'),
      mtime: fs.statSync(abs).mtimeMs,
    });
  }
  notes.sort((a, b) => a.id.localeCompare(b.id, 'zh'));
  return notes;
}

export function createLinkIndex(notes, currentIdRef) {
  const byPath = new Map();
  const byBase = new Map();
  const byAlias = new Map();
  for (const n of notes) {
    byPath.set(n.id.toLowerCase(), n.id);
    const k = n.base.toLowerCase();
    if (!byBase.has(k)) byBase.set(k, []);
    byBase.get(k).push(n.id);
    for (const a of [...n.aliases, n.title, n.base]) {
      const ak = String(a).toLowerCase().trim();
      if (ak && !byAlias.has(ak)) byAlias.set(ak, n.id);
    }
  }
  const folderIndex = new Map();
  for (const n of notes) {
    if (!n.isIndex || n.folder === '') continue;
    const top = n.folder.split('/')[0];
    if (!folderIndex.has(top)) folderIndex.set(top, n.id);
  }

  /** Obsidian 式解析：整路径 → 文件夹索引 → 文件名 → 别名。 */
  function resolve(target, currentId) {
    if (!target) return currentId ? { id: currentId } : null;
    const t = target.toLowerCase();
    if (byPath.has(t)) return { id: byPath.get(t) };
    const top = t.split('/')[0];
    if (!byBase.has(top) && folderIndex.has(top)) {
      return { id: folderIndex.get(top), folderFallback: true };
    }
    const base = t.slice(t.lastIndexOf('/') + 1);
    const list = byBase.get(base);
    if (list && list.length === 1) return { id: list[0] };
    if (list && list.length > 1) {
      const curFolder = (currentId || '').split('/')[0];
      const same = list.find((id) => id.split('/')[0] === curFolder);
      const shortest = list.slice().sort((a, b) => a.length - b.length)[0];
      return { id: same || shortest, ambiguous: list.length };
    }
    if (byAlias.has(t)) return { id: byAlias.get(t) };
    return null;
  }

  return { resolve, byPath, byBase, byAlias, folderIndex };
}

export { slugify };
