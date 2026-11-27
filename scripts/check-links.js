#!/usr/bin/env node
/** 全站自检：所有内链可达、页内锚点存在、外链格式合法。 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const files = [];
walk(DIST);

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs);
    else if (e.name.endsWith('.html')) files.push(abs);
  }
}

const idsOf = new Map();
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  idsOf.set(f, new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])));
}

let checked = 0;
const bad = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(DIST, f).replace(/\\/g, '/');
  for (const m of html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    const href = m[1];
    checked++;
    if (/^(https?:|mailto:|tel:)/.test(href)) {
      if (/[\s"<>]/.test(href)) bad.push(`${rel}: 外链含空格/尖括号 ${href}`);
      continue;
    }
    const [rawPart, hash] = href.split('#');
    const rawPath = rawPart.split('?')[0];
    let target;
    if (rawPath === '') target = f;
    else {
      const decoded = rawPath.split('/').map(decodeURIComponent).join('/');
      target = path.join(DIST, decoded.replace(/^\/+/, ''));
      if (!fs.existsSync(target) && !fs.existsSync(target + '.html')) {
        bad.push(`${rel}: 目标缺失 ${rawPath}`);
        continue;
      }
      if (!fs.existsSync(target)) target = target + '.html';
    }
    if (hash) {
      const id = decodeURIComponent(hash);
      const set = idsOf.get(target);
      if (!set) { bad.push(`${rel}: 无法检查锚点 ${href}`); continue; }
      if (!set.has(id)) bad.push(`${rel}: 锚点不存在 ${rawPath}#${id}`);
    }
  }
}

const assets = [...fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').matchAll(/(src|href)="\/assets\/([^"]+)"/g)].map((m) => m[2].split('?')[0]);
for (const a of new Set(assets)) {
  if (!fs.existsSync(path.join(DIST, 'assets', a))) bad.push(`资产缺失: ${a}`);
}

console.log(`扫描 ${files.length} 个 HTML，检查 ${checked} 个链接`);
if (bad.length) {
  console.log(`\n✗ ${bad.length} 个问题：`);
  for (const b of [...new Set(bad)].slice(0, 40)) console.log('  - ' + b);
  process.exitCode = 1;
} else {
  console.log('✓ 内链、锚点、资产全部可达');
}
