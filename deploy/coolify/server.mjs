// Coolify city server: the live Yappyverse city is the root surface, with the
// audited public read proxy and the separately authenticated owner task proxy.
import http from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import gwHandler from './frontend/city/deploy/netlify/functions/gw.mjs';
import ownerHandler from './frontend/city/deploy/netlify/functions/owner.mjs';

const ROOT = '/app/frontend/city/deploy';
const PORT = Number(process.env.PORT || 80);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.map': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm'
};

async function bodyBytes(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function runFunction(req, handler) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (value != null) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await bodyBytes(req);
  const webReq = new Request('http://local' + req.url, init);
  return handler(webReq);
}
function sendFunction(res, resp) {
  return resp.arrayBuffer().then(raw => {
    const body = Buffer.from(raw), headers = Object.fromEntries(resp.headers);
    headers['content-length'] = String(body.length);
    res.writeHead(resp.status, headers); res.end(body);
  });
}

export function createCityServer() {
  return http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://local');
      if (u.pathname.startsWith('/.netlify/functions/gw')) return sendFunction(res, await runFunction(req, gwHandler));
      if (u.pathname.startsWith('/.netlify/functions/owner')) return sendFunction(res, await runFunction(req, ownerHandler));
      let relative = decodeURIComponent(u.pathname);
      if (relative === '/') relative = '/index.html';
      const f = path.resolve(ROOT, '.' + relative);
      if (f !== ROOT && !f.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
      const target = existsSync(f) && !statSync(f).isDirectory() ? f : path.join(ROOT, 'index.html');
      res.writeHead(200, { 'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' });
      createReadStream(target).pipe(res);
    } catch (_) { res.writeHead(502); res.end('edge error'); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  createCityServer().listen(PORT, () => console.log('city fallback listening on ' + PORT));
}
