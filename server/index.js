import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import * as auth from './lib/auth.js';

/**
 * 站点后端服务（零依赖）。
 * - 静态托管 dist/，优先返回预压缩的 .br / .gz
 * - API：健康检查、站点统计、搜索、联系表单
 * - 联系表单落盘到 data/inbox.jsonl（简单限流，不引入数据库）
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX_FILE = path.join(DIST, 'assets', 'search-index.json');
const INBOX = path.join(ROOT, 'data', 'inbox.jsonl');
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY = 32 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
};

let cachedIndex = null;
let cachedMtime = 0;

function loadIndex() {
  const stat = fs.statSync(INDEX_FILE);
  if (cachedIndex && stat.mtimeMs === cachedMtime) return cachedIndex;
  cachedIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  cachedMtime = stat.mtimeMs;
  return cachedIndex;
}

function score(doc, terms) {
  const title = String(doc.title || '').toLowerCase();
  const sec = String(doc.sec || '').toLowerCase();
  const text = String(doc.text || '').toLowerCase();
  let total = 0;
  for (const term of terms) {
    const inTitle = title.includes(term);
    const inSec = sec.includes(term);
    const inText = text.includes(term);
    if (!inTitle && !inSec && !inText) return 0;
    if (title === term || sec === term) total += 34;
    else if (inTitle) total += 12;
    if (inSec) total += 7;
    let n = 0;
    let at = text.indexOf(term);
    while (at >= 0 && n < 6) { n++; at = text.indexOf(term, at + term.length); }
    total += n;
  }
  return total;
}

function search(query, limit) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const index = loadIndex();
  return index.notes
    .map((doc) => ({ doc, score: score(doc, terms) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(Number(limit) || 12, 1), 50))
    .map(({ doc, score: s }) => ({
      title: doc.title,
      section: doc.sec,
      folder: doc.folder,
      href: doc.href,
      score: s,
      snippet: String(doc.text || '').slice(0, 140),
    }));
}

/* ---------- 简易限流：每个 IP 每分钟最多 5 次提交 ---------- */
const buckets = new Map();
function allow(ip) {
  const now = Date.now();
  const list = (buckets.get(ip) || []).filter((t) => now - t < 60_000);
  if (list.length >= 5) { buckets.set(ip, list); return false; }
  list.push(now);
  buckets.set(ip, list);
  return true;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/admin/')) {
    return handleAccountApi(req, res, url);
  }
  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, uptime: Math.round(process.uptime()), node: process.version });
  }
  if (url.pathname === '/api/stats') {
    const index = loadIndex();
    return json(res, 200, {
      notes: new Set(index.notes.map((n) => n.note)).size,
      sections: index.notes.length,
      projects: index.projects.length,
      builtAt: index.builtAt,
    });
  }
  if (url.pathname === '/api/search') {
    const q = url.searchParams.get('q') || '';
    return json(res, 200, { q, results: search(q, url.searchParams.get('limit')) });
  }
  if (url.pathname === '/api/contact') {
    if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });
    const ip = req.socket.remoteAddress || 'unknown';
    if (!allow(ip)) return json(res, 429, { error: 'too many requests' });
    let payload;
    try { payload = await readBody(req); }
    catch (err) { return json(res, 400, { error: err.message }); }
    const name = String(payload.name || '').trim().slice(0, 60);
    const email = String(payload.email || '').trim().slice(0, 120);
    const message = String(payload.message || '').trim().slice(0, 2000);
    if (!name || !message) return json(res, 400, { error: 'name and message are required' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'invalid email' });
    fs.appendFileSync(INBOX, `${JSON.stringify({ at: new Date().toISOString(), name, email, message })}\n`);
    return json(res, 201, { ok: true });
  }
  return json(res, 404, { error: 'not found' });
}

/* ================= 账号 / 后台 ================= */

const PROFILE_FILE = path.join(ROOT, 'data', 'profile.json');
const buildState = { status: 'idle', startedAt: null, finishedAt: null, code: null, log: [] };

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function readInbox() {
  try {
    return fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean).map((line, i) => {
      let entry = {};
      try { entry = JSON.parse(line); } catch { entry = { message: line }; }
      return { id: i + 1, ...entry };
    }).reverse();
  } catch { return []; }
}

function deleteInbox(id) {
  let lines = [];
  try { lines = fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean); } catch { return false; }
  if (!lines[id - 1]) return false;
  lines.splice(id - 1, 1);
  fs.writeFileSync(INBOX, lines.length ? lines.join('\n') + '\n' : '');
  return true;
}

function walk(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) { const sub = walk(abs); files += sub.files; bytes += sub.bytes; continue; }
    files += 1;
    bytes += fs.statSync(abs).size;
  }
  return { files, bytes };
}

function readProfile() {
  return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
}

function saveProfile(profile) {
  const tmp = `${PROFILE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(profile, null, 2) + '\n');
  fs.renameSync(tmp, PROFILE_FILE);
}

function pickText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : undefined;
}

function runBuild() {
  if (buildState.status === 'running') return false;
  buildState.status = 'running';
  buildState.startedAt = new Date().toISOString();
  buildState.finishedAt = null;
  buildState.code = null;
  buildState.log = ['$ node build.js'];
  const child = spawn(process.execPath, [path.join(ROOT, 'build.js')], { cwd: ROOT, env: process.env });
  const collect = (buf) => {
    for (const line of String(buf).split('\n')) {
      if (!line.trim()) continue;
      buildState.log.push(line);
      if (buildState.log.length > 240) buildState.log.shift();
    }
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.on('close', (code) => {
    buildState.status = code === 0 ? 'done' : 'error';
    buildState.code = code;
    buildState.finishedAt = new Date().toISOString();
  });
  return true;
}

async function handleAccountApi(req, res, url) {
  try {
    const mutating = req.method !== 'GET' && req.method !== 'HEAD';
    if (mutating && !sameOrigin(req)) return json(res, 403, { error: '跨站请求被拒绝' });
    if (mutating && !String(req.headers['content-type'] || '').includes('application/json')) {
      return json(res, 415, { error: '需要 application/json' });
    }
    const ip = req.socket.remoteAddress || 'unknown';

    if (url.pathname === '/api/auth/me') {
      return json(res, 200, { user: auth.currentUser(req) });
    }

    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      if (!auth.rateLimit(`reg:${ip}`, 5, 60_000)) return json(res, 429, { error: '操作过于频繁' });
      const body = await readBody(req);
      const isFirst = auth.countUsers() === 0;
      const isAdmin = isFirst || (process.env.ADMIN_EMAIL && String(body.email || '').toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
      const user = auth.createUser({
        email: body.email,
        password: body.password,
        name: body.name,
        role: isAdmin ? 'admin' : 'user',
      });
      auth.issueSession(res, user, req.headers['x-forwarded-proto'] === 'https');
      return json(res, 201, { user });
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      if (!auth.rateLimit(`login:${ip}`, 8, 60_000)) return json(res, 429, { error: '操作过于频繁' });
      const body = await readBody(req);
      const user = auth.verifyPassword(body.email, body.password);
      if (!user) return json(res, 401, { error: '邮箱或密码不正确' });
      auth.issueSession(res, user, req.headers['x-forwarded-proto'] === 'https');
      return json(res, 200, { user });
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      auth.clearSession(res);
      return json(res, 200, { ok: true });
    }

    const admin = auth.requireAdmin(req);

    if (url.pathname === '/api/admin/inbox' && req.method === 'GET') {
      return json(res, 200, { items: readInbox().slice(0, 200) });
    }

    if (url.pathname === '/api/admin/inbox/delete' && req.method === 'POST') {
      const body = await readBody(req);
      const ok = deleteInbox(Number(body.id));
      return json(res, ok ? 200 : 404, { ok });
    }

    if (url.pathname === '/api/admin/stats' && req.method === 'GET') {
      const dist = fs.existsSync(DIST) ? walk(DIST) : { files: 0, bytes: 0 };
      let builtAt = null;
      let indexBytes = 0;
      try {
        const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
        builtAt = index.builtAt;
        indexBytes = fs.statSync(INDEX_FILE).size;
      } catch { /* 尚未构建 */ }
      return json(res, 200, {
        distFiles: dist.files,
        distBytes: dist.bytes,
        indexBytes,
        builtAt,
        inbox: readInbox().length,
        users: auth.countUsers(),
        uptime: Math.round(process.uptime()),
        build: { status: buildState.status, startedAt: buildState.startedAt, finishedAt: buildState.finishedAt, code: buildState.code },
        admin: admin.email,
      });
    }

    if (url.pathname === '/api/admin/config' && req.method === 'GET') {
      const profile = readProfile();
      return json(res, 200, {
        site: profile.site,
        person: profile.person,
        github: profile.github,
        siteUrl: profile.siteUrl || '',
      });
    }

    if (url.pathname === '/api/admin/config' && req.method === 'PUT') {
      const body = await readBody(req);
      const profile = readProfile();
      const site = body.site || {};
      const person = body.person || {};
      const fields = [
        [site.title, (v) => { profile.site.title = v; }, 60],
        [site.tagline, (v) => { profile.site.tagline = v; }, 120],
        [site.description, (v) => { profile.site.description = v; }, 200],
        [person.name, (v) => { profile.person.name = v; }, 40],
        [person.role, (v) => { profile.person.role = v; }, 120],
        [person.location, (v) => { profile.person.location = v; }, 60],
        [body.siteUrl, (v) => { profile.siteUrl = v.replace(/\/+$/, ''); }, 200],
      ];
      for (const [raw, apply, max] of fields) {
        const value = pickText(raw, max);
        if (value !== undefined && value !== '') apply(value);
      }
      saveProfile(profile);
      return json(res, 200, { ok: true, site: profile.site, person: profile.person, siteUrl: profile.siteUrl || '' });
    }

    if (url.pathname === '/api/admin/build' && req.method === 'POST') {
      const started = runBuild();
      return json(res, started ? 202 : 409, { started, build: buildState });
    }

    if (url.pathname === '/api/admin/build' && req.method === 'GET') {
      return json(res, 200, { build: buildState });
    }

    return json(res, 404, { error: 'not found' });
  } catch (err) {
    return json(res, err.status || 400, { error: err.message || '请求失败' });
  }
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(DIST, '.' + rel);
  if (!file.startsWith(DIST + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
  let stat;
  try { stat = fs.statSync(file); }
  catch {
    const fallback = path.join(DIST, '404.html');
    if (fs.existsSync(fallback)) {
      res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(fallback));
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
  if (stat.isDirectory()) { res.writeHead(302, { Location: rel + '/' }); return res.end(); }

  const ext = path.extname(file).toLowerCase();
  const etag = `W/"${stat.size}-${Math.round(stat.mtimeMs)}"`;
  const immutable = /\.(woff2|webp|png|jpg|jpeg|ico|mp4|svg)$/.test(file);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    ETag: etag,
    Vary: 'Accept-Encoding',
  };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }

  const accept = String(req.headers['accept-encoding'] || '');
  let body;
  if (accept.includes('br') && fs.existsSync(file + '.br')) {
    headers['Content-Encoding'] = 'br';
    body = fs.readFileSync(file + '.br');
  } else if (accept.includes('gzip') && fs.existsSync(file + '.gz')) {
    headers['Content-Encoding'] = 'gzip';
    body = fs.readFileSync(file + '.gz');
  } else {
    body = fs.readFileSync(file);
  }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = http.createServer(async (req, res) => {  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end('method not allowed');
    }
    return serveStatic(req, res, url);
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('internal error');
  }
});

auth.ensureAdminByEnv();

server.listen(PORT, HOST, () => {
  console.log(`站点服务已启动 → http://${HOST}:${PORT}/`);
  console.log(`  API：/api/health · /api/stats · /api/search?q= · /api/contact（POST）`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
