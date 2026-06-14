// Local POC backend: serves the viewer + regenerates the room from a prompt.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { generateRoom } from './room.mjs';

const ROOT = new URL('.', import.meta.url).pathname;
const ROOM_OUT = join(ROOT, 'out', 'room.jpg');
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.jpg':'image/jpeg','.png':'image/png',
  '.glb':'model/gltf-binary','.css':'text/css' };

let busy = false;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/room') {
      if (busy) { res.writeHead(429); return res.end(JSON.stringify({ error: 'busy' })); }
      let body = ''; for await (const c of req) body += c;
      const { prompt } = JSON.parse(body || '{}');
      if (!prompt) { res.writeHead(400); return res.end(JSON.stringify({ error: 'no prompt' })); }
      busy = true;
      console.log('[api] room:', prompt);
      try {
        await generateRoom(prompt, ROOM_OUT);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ url: `out/room.jpg?t=${Date.now()}` }));
      } catch (e) {
        console.error('[api] gen failed:', e.message);
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      } finally { busy = false; }
      return;
    }
    // static
    let p = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (p === '/') p = '/viewer.html';
    const fp = join(ROOT, p);
    if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    const data = await readFile(fp);
    res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500);
    res.end(String(e.message || e));
  }
});

const PORT = 8799;
server.listen(PORT, () => console.log(`POC at http://localhost:${PORT}/viewer.html`));
