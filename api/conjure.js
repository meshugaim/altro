// POST /api/conjure  { context: 'palazzo'|'fuori', roomType?, seed? }
// Starts a Skybox generation and returns its id immediately (no long-running fn).
// The browser then polls /api/status?id=... until the panorama is ready.
import { buildPrompt, TYPES } from '../lib/prompts.js';

function allowed(req){
  const o = req.headers.origin || req.headers.referer || '';
  try { const h = new URL(o).hostname; return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.vercel.app'); }
  catch { return false; }
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!allowed(req)) return res.status(403).json({ error: 'forbidden origin' });
  const key = process.env.SKYBOX_KEY;
  if (!key) return res.status(500).json({ error: 'SKYBOX_KEY not configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const context = body.context === 'fuori' ? 'fuori' : 'palazzo';
  const types = TYPES[context];
  const roomType = types.includes(body.roomType) ? body.roomType : types[Math.floor(Math.random() * types.length)];
  const seed = Number.isInteger(body.seed) ? body.seed : 8800000 + Math.floor(Math.random() * 900000);

  const spec = buildPrompt(context, roomType);
  const r = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ skybox_style_id: spec.skybox_style_id, prompt: spec.prompt, negative_text: spec.negative_text, seed }),
  });
  if (!r.ok) return res.status(502).json({ error: 'skybox error', detail: (await r.text()).slice(0, 300) });
  const data = await r.json();
  return res.status(200).json({ id: data.id, context, roomType, seed });
}
