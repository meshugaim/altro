import pkg from '/home/oriamasas/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pkg;
const logs = [];
const browser = await chromium.launch({
  args: ['--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', m => { if (m.type()==='error') logs.push('[error] '+m.text()); });
page.on('pageerror', e => logs.push('[pageerror] '+e.message));
page.on('requestfailed', r => { const u=r.url(); if(/img\/|psv|photo-sphere|three/.test(u)) logs.push('[reqfail] '+u+' '+(r.failure()?.errorText||'')); });

await page.goto('https://palazzo-tour.vercel.app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
const out = {};
out.introVisible = await page.isVisible('#intro:not(.hidden)');
out.canvasPresent = await page.evaluate(() => !!document.querySelector('#viewer canvas'));
out.canvasSize = await page.evaluate(() => { const c=document.querySelector('#viewer canvas'); return c? c.width+'x'+c.height : 'none'; });

await page.click('#enter');
await page.waitForTimeout(3500);
out.room1_title = await page.textContent('#capTitle');
out.room1_counter = (await page.textContent('#counter'))?.replace(/\s+/g,' ').trim();
out.topbar = await page.isVisible('#topbar:not(.hidden)');
await page.screenshot({ path: 'v2-room1.png' });

// Next via caption button -> room 2
await page.click('#capActions .cap-btn:last-child');
await page.waitForTimeout(3500);
out.room2_title = await page.textContent('#capTitle');
out.room2_counter = (await page.textContent('#counter'))?.replace(/\s+/g,' ').trim();
await page.screenshot({ path: 'v2-room2.png' });

// jump to terrace via index
await page.click('#openIndex');
await page.waitForTimeout(300);
out.indexRows = await page.$$eval('#ixList .ix-row .nm', els => els.map(e=>e.textContent));
await page.click('#ixList .ix-row:last-child');
await page.waitForTimeout(3500);
out.terrace_title = await page.textContent('#capTitle');
out.terrace_actions = await page.$$eval('#capActions .cap-btn', els=>els.map(e=>e.textContent));
await page.screenshot({ path: 'v2-terrace.png' });

out.errors = logs;
console.log(JSON.stringify(out, null, 2));
await browser.close();
