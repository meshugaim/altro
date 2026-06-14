// Tiny Replicate client (ipv4-first; Google/Replicate over IPv6 is flaky here).
import { writeFile } from 'node:fs/promises';
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');   // broken IPv6 here -> force IPv4

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) { console.error('Set REPLICATE_API_TOKEN'); process.exit(1); }

const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// fetch with retry on transient network errors (IPv4 here is intermittent)
async function jfetch(url, opts = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      const code = e.cause?.code || e.name;
      if (i === tries - 1) throw e;
      process.stdout.write(`(net ${code}, retry ${i+1}) `);
      await new Promise(s => setTimeout(s, 1500 * (i + 1)));
    }
  }
}

export async function run(versionId, input, { label = 'pred' } = {}) {
  const t0 = Date.now();
  let p;
  for (let attempt = 0; attempt < 12; attempt++) {
    const r = await jfetch('https://api.replicate.com/v1/predictions', {
      method: 'POST', headers: H,
      body: JSON.stringify({ version: versionId, input }),
    });
    p = await r.json();
    if (r.status === 429) {
      const wait = (p.retry_after || 3) + 1;
      process.stdout.write(`[${label}] throttled, retry in ${wait}s\n`);
      await new Promise(s => setTimeout(s, wait * 1000));
      continue;
    }
    break;
  }
  if (p.error || !p.id) throw new Error(`${label}: ${JSON.stringify(p).slice(0, 300)}`);
  process.stdout.write(`[${label}] queued ${p.id} `);
  while (p.status !== 'succeeded' && p.status !== 'failed' && p.status !== 'canceled') {
    await new Promise(s => setTimeout(s, 2000));
    process.stdout.write('.');
    p = await (await jfetch(`https://api.replicate.com/v1/predictions/${p.id}`, { headers: H })).json();
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(` ${p.status} (${secs}s)`);
  if (p.status !== 'succeeded') throw new Error(`${label} ${p.status}: ${JSON.stringify(p.error).slice(0,300)}`);
  return p.output;
}

export async function download(url, dest) {
  const r = await jfetch(url, {});
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  saved ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
  return dest;
}
