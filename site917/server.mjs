// 917 站点服务：静态页面 + 把 /api/* 转发到现有测评服务（918）
// 用法：node site917/server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const UPSTREAM = 'http://127.0.0.1:918';
const PORT = Number(process.env.SITE917_PORT || 917);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  // API 转发（老师教案、朗读、听力、识别等都在 918 的插件里）
  if (url.pathname.startsWith('/api/')) {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      const body = Buffer.concat(chunks);
      const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        },
        body: body.length ? body : undefined,
      });
      res.statusCode = upstream.status;
      upstream.headers.forEach((v, k) => {
        if (!/content-encoding|transfer-encoding|connection/i.test(k)) res.setHeader(k, v);
      });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, code: 'upstream-unavailable' }));
    }
    return;
  }

  // 静态文件
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) { res.statusCode = 403; res.end('forbidden'); return; }
  fs.readFile(full, (err, data) => {
    if (err) {
      // 无扩展名的路径回退到首页
      if (!path.extname(file)) {
        fs.readFile(path.join(PUBLIC, 'index.html'), (e2, home) => {
          if (e2) { res.statusCode = 404; res.end('not found'); return; }
          res.setHeader('Content-Type', MIME['.html']);
          res.end(home);
        });
        return;
      }
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[917] AI 一人学校 · 英语 已启动：http://127.0.0.1:${PORT}/`);
});
