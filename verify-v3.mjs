import pkg from '/home/oriamasas/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pkg;
const logs = [];
const b = await chromium.launch({ args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('console', m => { if(m.type()==='error') logs.push('[err] '+m.text()); });
p.on('pageerror', e => logs.push('[pageerr] '+e.message));
p.on('response', r => { if(/\/api\//.test(r.url())) logs.push(`[api] ${r.status()} ${r.url().split('?')[0].replace('http://localhost:3010','')}`); });

const out = {};
await p.goto('http://localhost:3010/', { waitUntil:'networkidle' });
await p.waitForTimeout(3500);
out.canvas = await p.evaluate(()=>!!document.querySelector('#viewer canvas'));
await p.click('#enter');
await p.waitForTimeout(1200);
out.tabs = await p.$$eval('.tab', els=>els.map(e=>e.textContent.trim()));
out.counter_before = await p.textContent('#counter');
out.title_before = await p.textContent('#capTitle');

// double-click to conjure
await p.dblclick('#viewer');
await p.waitForTimeout(800);
out.overlay_shown = await p.evaluate(()=>document.getElementById('conjure').classList.contains('on'));

// wait for the new room (counter -> Room II), up to 80s
let conjured = false;
try { await p.waitForFunction(() => document.getElementById('counter').textContent.includes('II'), { timeout: 85000 }); conjured = true; } catch(e){}
out.conjured = conjured;
out.counter_after = await p.textContent('#counter');
out.title_after = await p.textContent('#capTitle');
out.overlay_after = await p.evaluate(()=>document.getElementById('conjure').classList.contains('on'));
await p.waitForTimeout(1500);
await p.screenshot({ path:'v3-conjured.png' });

// switch to Fuori (seed, no generation)
await p.click('#tab-fuori');
await p.waitForTimeout(2500);
out.fuori_active = await p.evaluate(()=>document.getElementById('tab-fuori').classList.contains('active'));
out.fuori_eyebrow = await p.textContent('#capEyebrow');
await p.screenshot({ path:'v3-fuori.png' });

out.logs = logs;
console.log(JSON.stringify(out, null, 2));
await b.close();
