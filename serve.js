#!/usr/bin/env node
/** 零依赖静态服务器，只服务 dist/。 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(import.meta.dirname, 'dist');
const PORT = Number(process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolveTarget(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname.replace(/^\/+/, ''));
  } catch {
    return null; // 畸形百分号编码，按 404 处理而不是让进程崩掉
  }
  if (rel.includes('\0') || rel.startsWith('..')) return null;
  const abs = path.join(DIST, rel);
  if (!abs.startsWith(DIST)) return null;
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    const idx = path.join(abs, 'index.html');
    return fs.existsSync(idx) ? idx : null;
  }
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  const withHtml = abs + '.html';
  if (fs.existsSync(withHtml)) return withHtml;
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = resolveTarget(url.pathname);
  if (!file && url.pathname.endsWith('/')) file = resolveTarget(path.join(url.pathname, 'index.html'));
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 · TURBO SPARK</title><link rel="stylesheet" href="/assets/app.css"></head>
<body class="section-404" style="display:grid;place-items:center;min-height:100svh;padding:32px">
<div style="text-align:center;max-width:460px">
<p class="eyebrow">SIGNAL LOST / 404</p>
<h1 style="margin:16px 0 12px;font-family:var(--font-sans);font-size:clamp(32px,6vw,52px);font-weight:700">页面不存在</h1>
<p style="margin:0 0 26px;color:var(--muted);font-size:13.5px;line-height:1.9">这个地址没有对应的笔记或项目档案，可能是链接过期，也可能从未存在。</p>
<a class="btn btn-primary" href="/">回到首页 →</a>
</div></body></html>`);
    console.log(`404 ${url.pathname}`);
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Content-Length': fs.statSync(file).size,
  });
  fs.createReadStream(file).pipe(res);
  if (ext === '.html') console.log(`200 ${url.pathname}`);
});

server.on('error', (e) => console.error('服务错误:', e.message));
server.on('clientError', (e, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });

server.listen(PORT, () => {
  console.log(`\n个人网站已启动 → http://localhost:${PORT}/`);
  console.log(`服务目录 ${DIST}`);
  console.log('Ctrl+C 停止\n');
});
