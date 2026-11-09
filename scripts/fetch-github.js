#!/usr/bin/env node
/**
 * 刷新 GitHub 快照。本机 Node 直连被网络策略拦截，因此走 curl（--ssl-no-revoke）。
 * 产物全部落在 data/ 下，build.js 只读缓存，不联网也能构建。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OWNER = 'turbocalhj';
const DATA = path.resolve(import.meta.dirname, '../data');
const README_DIR = path.join(DATA, 'readmes');

function curl(url, { raw = false } = {}) {
  const args = ['-sS', '--ssl-no-revoke', '--max-time', '30', '-H', `User-Agent: lhj-site-build`, '-H', 'Accept: application/vnd.github+json'];
  if (raw) args.push('-H', 'Accept: application/vnd.github.raw');
  args.push(url);
  return execFileSync('curl', args, { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
}

function json(url) {
  const text = curl(url);
  return JSON.parse(text);
}

/** 提交数藏在 Link 头 rel="last" 的分页里。 */
function commitCount(repo) {
  const args = ['-sS', '--ssl-no-revoke', '-I', '-H', 'User-Agent: lhj-site-build',
    `https://api.github.com/repos/${OWNER}/${repo}/commits?per_page=1`];
  const head = execFileSync('curl', args, { encoding: 'utf8' });
  const m = head.match(/page=(\d+)>; rel="last"/i);
  return m ? Number(m[1]) : null;
}

fs.mkdirSync(README_DIR, { recursive: true });

const repos = json(`https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`);
fs.writeFileSync(path.join(DATA, 'github.json'), JSON.stringify(repos, null, 2));
console.log(`github.json ← ${repos.length} 个仓库`);

const extra = { fetchedAt: new Date().toISOString(), repos: {} };
for (const r of repos) {
  const name = r.name;
  let languages = {};
  try {
    const bytes = json(`https://api.github.com/repos/${OWNER}/${name}/languages`);
    const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
    for (const [k, v] of Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
      languages[k] = Math.round((v / total) * 100);
    }
  } catch (e) { console.warn(`  ${name} languages 失败: ${e.message}`); }
  let commits = null;
  try { commits = commitCount(name); } catch (e) { console.warn(`  ${name} commits 失败: ${e.message}`); }
  extra.repos[name] = { commits, languages };
  try {
    const readme = curl(`https://api.github.com/repos/${OWNER}/${name}/readme`, { raw: true });
    fs.writeFileSync(path.join(README_DIR, `${name}.md`), readme);
  } catch (e) { console.warn(`  ${name} README 缺失`); }
  console.log(`  ${name} commits=${commits ?? '?'} langs=${Object.keys(languages).join(',')}`);
}

fs.writeFileSync(path.join(DATA, 'github-extra.json'), JSON.stringify(extra, null, 2));
console.log('done');
