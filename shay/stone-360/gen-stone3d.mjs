// Real stone photo -> 3D textured mesh (.glb) you can orbit. Replicate hunyuan3d-2 turbo.
// Usage: node gen-stone3d.mjs /path/to/stone.jpg
import { run, download } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HUNYUAN = '0602bae6db1ce420f2690339bf2feb47e18c0c722a1f02e9db9abd774abaff5d';

const src = process.argv[2] || '/home/oriamasas/shay/stones/boulder/original.jpg';
const outName = process.argv[3] || 'stone.glb';   // e.g. stone-flint.glb
const small = '/tmp/stone-in.jpg';
// Downscale so the data URI stays small and bg-removal is fast.
execSync(`python3 -c "from PIL import Image; im=Image.open('${src}').convert('RGB'); im.thumbnail((1024,1024)); im.save('${small}',quality=90)"`);

const b64 = readFileSync(small).toString('base64');
const dataUri = `data:image/jpeg;base64,${b64}`;
console.log('Stone image:', src, `(${(b64.length/1024).toFixed(0)} KB b64)`);

const out = await run(HUNYUAN, {
  image: dataUri,
  remove_background: true,
  steps: 30,
  octree_resolution: 256,
}, { label: 'stone3d' });

// output may be {mesh: url} or a url string
const url = typeof out === 'string' ? out : (out.mesh || out.glb || Object.values(out)[0]);
await download(url, new URL('./out/' + outName, import.meta.url).pathname);
