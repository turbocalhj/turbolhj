import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import yaml from 'js-yaml';

const FENCE_TOKEN = (i) => `QQFENCE${i}QQ`;
const INLINE_TOKEN = (i) => `QQINLINE${i}QQ`;
const WIKI_TOKEN = (i) => `QQWIKI${i}QQ`;

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Obsidian 的锚点即标题原文，这里做同一套转换，保证站内链接两端一致。 */
export function slugify(text) {
  return String(text).trim()
    .replace(/`/g, '')
    .replace(/[\\/:*?"<>|#[\]]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-');
}

/** 去掉标题里的强调标记，只处理成对出现的，保留 `create_app()` 这种词内下划线。 */
function stripEmphasis(s) {
  return s
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_{3,}(.+?)_{3,}/g, '$1')
    .replace(/_{2}(.+?)_{2}/g, '$1')
    .replace(/(^|[^\w])_([^_]+?)_(?=[^\w]|$)/g, '$1$2');
}

export function splitFrontmatter(raw) {
  const text = raw.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if ((lines[0] || '').trim() !== '---') return { data: {}, body: text };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      let data = {};
      try {
        data = yaml.load(lines.slice(1, i).join('\n')) || {};
      } catch {
        data = {};
      }
      if (typeof data !== 'object' || Array.isArray(data)) data = {};
      return { data, body: lines.slice(i + 1).join('\n') };
    }
  }
  return { data: {}, body: text };
}

function maskFences(body, store) {
  const lines = body.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const open = lines[i].match(/^ {0,3}(`{3,}|~{3,})[ \t]*([^\n]*)$/);
    if (open) {
      const marker = open[1][0];
      const close = new RegExp(`^ {0,3}\\${marker}{${open[1].length},}[ \\t]*$`);
      const block = [lines[i]];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (close.test(lines[j])) break;
        block.push(lines[j]);
      }
      block.push(j < lines.length ? lines[j] : '');
      store.push(block.join('\n'));
      out.push(FENCE_TOKEN(store.length - 1));
      i = j + 1;
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join('\n');
}

function maskInlineCode(text, store) {
  return text.replace(/(`+)([^\n]*?)\1/g, (m) => {
    store.push(m);
    return INLINE_TOKEN(store.length - 1);
  });
}

function extractWikiLinks(text, resolve) {
  const store = [];
  const masked = text.replace(/(!?)\[\[([^\[\]]+)\]\]/g, (m, bang, inner) => {
    let target = inner;
    let anchor = null;
    let alias = null;
    const bar = target.indexOf('|');
    if (bar >= 0) {
      alias = target.slice(bar + 1).trim();
      target = target.slice(0, bar);
    }
    const hash = target.indexOf('#');
    if (hash >= 0) {
      anchor = target.slice(hash + 1).trim();
      target = target.slice(0, hash);
    }
    target = target.trim().replace(/\\/g, '/').replace(/\.md$/i, '').replace(/^\.\//, '');
    const hit = resolve(target, alias);
    store.push({ embed: bang === '!', hit, raw: target, anchor, alias });
    return WIKI_TOKEN(store.length - 1);
  });
  return { text: masked, store };
}

/** 链接在正文里显示的文字：别名优先，其次锚点，最后文件名。 */
function wikiDisplay(entry) {
  if (entry.alias) return entry.alias;
  if (entry.anchor) return entry.anchor;
  if (entry.hit?.label) return entry.hit.label;
  return entry.raw.split('/').pop();
}

export function createEngine({ resolve, noteUrl }) {
  const marked = new Marked(
    markedHighlight({
      langPrefix: 'language-',
      highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
          } catch { /* 落回纯文本 */ }
        }
        return escapeHtml(code);
      },
    }),
  );
  marked.setOptions({ gfm: true, breaks: false, pedantic: false });

  function linkTo(entry, unresolved) {
    const text = escapeHtml(wikiDisplay(entry));
    if (entry.hit && entry.hit.private) {
      return `<span class="wikilink-private" title="私密笔记，未在站点公开">${text}</span>`;
    }
    if (!entry.hit) {
      unresolved.count++;
      unresolved.items.push(entry.raw + (entry.anchor ? '#' + entry.anchor : ''));
      return `<span class="wikilink-missing" title="笔记未找到">${text}</span>`;
    }
    let anchor = '';
    let degraded = false;
    if (entry.anchor) {
      const slug = slugify(entry.anchor);
      if (entry.hit.anchors && entry.hit.anchors.size && !entry.hit.anchors.has(slug)) {
        degraded = true;
        unresolved.degraded.push(`${entry.hit.id}#${entry.anchor}`);
      } else {
        anchor = `#${slug}`;
      }
    }
    const cls = `wikilink${entry.hit.index ? ' wikilink-index' : ''}${degraded ? ' wikilink-noanchor' : ''}`;
    const title = degraded ? ' title="小节锚点未找到，已跳到笔记开头"' : '';
    return `<a class="${cls}" href="${noteUrl(entry.hit.id) + anchor}"${title}>${text}</a>`;
  }

  /** 渲染笔记正文：返回 HTML、TOC 与未解析链接统计。 */
  function render(body) {
    const unresolved = { count: 0, items: [], degraded: [] };
    const codeStore = [];
    const afterFences = maskFences(body, codeStore);
    const afterInline = maskInlineCode(afterFences, codeStore);
    const wikis = extractWikiLinks(afterInline, resolve);
    // 别名/锚点里可能夹着被屏蔽的行内代码，回填后才能真正对上标题锚点
    const uncloak = (s) => s.replace(/QQ(?:INLINE|FENCE)(\d+)QQ/g, (_, i) => codeStore[+i].replace(/`/g, ''));
    for (const e of wikis.store) {
      if (e.alias) e.alias = uncloak(e.alias);
      if (e.anchor) e.anchor = uncloak(e.anchor);
      e.raw = uncloak(e.raw);
    }

    const headingLines = [];
    const maskedLines = wikis.text.split('\n');
    maskedLines.forEach((line, idx) => {
      const m = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
      if (!m) return;
      // 只剥成对的强调标记：create_app() 这类词内下划线要原样保留，否则与链接锚点算出的 id 对不上
      let text = stripEmphasis(m[2]);
      text = text.replace(/QQWIKI(\d+)QQ/g, (_, i) => wikiDisplay(wikis.store[+i]));
      text = text.replace(/QQ(?:INLINE|FENCE)(\d+)QQ/g, (_, i) => codeStore[+i].replace(/`/g, ''));
      headingLines.push({ level: m[1].length, text, line: idx });
    });

    const src = wikis.text.replace(/QQ(?:INLINE|FENCE)(\d+)QQ/g, (_, i) => codeStore[+i]);

    let html = marked.parse(src);

    const used = new Map();
    const toc = [];
    let hIndex = 0;
    html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, lvl, inner) => {
      const meta = headingLines[hIndex++];
      if (!meta) return `<h${lvl}>${inner}</h${lvl}>`;
      const base = slugify(meta.text) || `h${hIndex}`;
      const n = used.get(base) || 0;
      used.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n + 1}`;
      meta.id = id;
      if (meta.level >= 2 && meta.level <= 4) {
        toc.push({ level: meta.level, id, text: meta.text });
      }
      return `<h${lvl} id="${id}">${inner}<a class="hdr-anchor" href="#${id}" aria-hidden="true">#</a></h${lvl}>`;
    });

    function sectionText(slice) {
      let t = slice
        .replace(/QQWIKI(\d+)QQ/g, (_, i) => wikiDisplay(wikis.store[+i]))
        .replace(/QQ(?:INLINE|FENCE)(\d+)QQ/g, (_, i) => codeStore[+i]);
      t = t.replace(/^ {0,3}(?:`{3,}|~{3,})[^\n]*$/gm, ' ')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^ {0,3}>+ ?/gm, '')
        .replace(/^ {0,3}#{1,6}[ 	]+/gm, '')
        .replace(/^ {0,3}([-*+]|\d+\.) /gm, '')
        .replace(/[*_`|]/g, ' ')
        .replace(/ {2,}/g, ' ');
      return t.replace(/\s+/g, ' ').trim();
    }

    const sections = headingLines.map((hd, i) => {
      const end = i + 1 < headingLines.length ? headingLines[i + 1].line : maskedLines.length;
      return {
        h: hd.text,
        lvl: hd.level,
        a: hd.id || '',
        t: sectionText(maskedLines.slice(hd.line + 1, end).join('\n')).slice(0, 3000),
      };
    });

    const wikiCount = wikis.store.length;
    html = html.replace(/QQWIKI(\d+)QQ/g, (_, i) => linkTo(wikis.store[+i], unresolved));

    html = decorateCodeBlocks(html);
    html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a target="_blank" rel="noopener" href="$1"');
    html = decorateImages(html);

    const warnings = [];
    if (hIndex !== headingLines.length) {
      warnings.push(`标题配对异常：检出 ${headingLines.length}，渲染 ${hIndex}`);
    }
    return { html, toc, sections, wikiCount, unresolved, warnings };
  }

  return { render, marked };
}

function decorateCodeBlocks(html) {
  return html.replace(
    /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (m, attrs, code) => {
      const lang = (attrs.match(/class="[^"]*\blanguage-([\w+#.\-]+)/) || [])[1] || 'text';
      return `<div class="codeblock"><div class="codeblock-bar"><span class="codeblock-lang">${lang}</span>` +
        `<button class="codeblock-copy" type="button">复制</button></div>` +
        `<pre><code${attrs}>${code}</code></pre></div>`;
    },
  );
}

function decorateImages(html) {
  return html.replace(/<img\b([^>]*)>/g, (m, attrs) => {
    if (/\bloading=/.test(attrs)) return m;
    const extra = ' loading="lazy" decoding="async"';
    if (/\/\s*$/.test(attrs)) return `<img${attrs.replace(/\/\s*$/, '')}${extra} />`;
    return `<img${attrs}${extra}>`;
  });
}

/** 纯 README 渲染：相对链接改写为仓库内文件链接，不解析 wiki 链接。 */
export function renderPlainMarkdown(markedInstance, source, { repoUrl, transformLink, transformImage } = {}) {
  let html = markedInstance.parse(source);
  html = decorateCodeBlocks(html);
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a target="_blank" rel="noopener" href="$1"');
  if (repoUrl && transformLink) {
    html = html.replace(/<a href="(?!#|https?:|mailto:)([^"]+)"/g,
      (_, href) => `<a href="${transformLink(decodeURIComponent(href))}" target="_blank" rel="noopener"`);
  }
  if (transformImage) {
    html = html.replace(/<img([^>]*?)\ssrc="(?!#|https?:|data:)([^"]+)"/g,
      (_, pre, src) => `<img${pre} src="${transformImage(decodeURIComponent(src))}"`);
  }
  return decorateImages(html);
}

export { yaml };
