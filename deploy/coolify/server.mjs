// Static server for frontend/ + same-origin proxy for /.netlify/functions/gw/*
// reusing the audited allowlist handler from the repo (single source of truth).
import http from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import gwHandler from './frontend/city/deploy/netlify/functions/gw.mjs';

const ROOT = '/app/frontend';
const PORT = Number(process.env.PORT || 80);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.map': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
  '.txt': 'text/plain', '.xml': 'application/xml', '.pdf': 'application/pdf'
};

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://local');
    if (u.pathname.startsWith('/.netlify/functions/gw')) {
      const webReq = new Request('http://local' + u.pathname + u.search, { method: req.method });
      const resp = await gwHandler(webReq);
      const body = Buffer.from(await resp.arrayBuffer());
      const headers = Object.fromEntries(resp.headers);
      headers['content-length'] = String(body.length);
      res.writeHead(resp.status, headers);
      return res.end(body);
    }
    let p = decodeURIComponent(u.pathname);
    let f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    if (!existsSync(f) || statSync(f).isDirectory()) f = path.join(ROOT, 'index.html'); // SPA fallback, mirrors netlify.toml
    res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    createReadStream(f).pipe(res);
  } catch (e) {
    res.writeHead(502); res.end('edge error');
  }
}).listen(PORT, () => console.log('city fallback listening on ' + PORT));
