/* Palazzo Aventino — v3: generative explorer.
 *
 * Photo Sphere Viewer (core) over panoramas that are *conjured on demand*: double-click
 * (or "Walk on") generates the next room via the Skybox backend (/api/conjure + /api/status),
 * fades into it, and remembers it. Two contexts — Palazzo (opulent interior) and Fuori
 * (Roman exterior) — each keep their own walked history; Back is instant (cached).
 */
import { Viewer } from '@photo-sphere-viewer/core';

const el = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
const roman = n => ROMAN[n] || ('' + n);

/* per-context state: a seed room + the walked history */
const CTX = {
  palazzo: { label:'Il Palazzo', seed:'img/seed-palazzo.webp', seedName:'L’Atrio', rooms:[], cursor:0 },
  fuori:   { label:'Fuori',      seed:'img/seed-fuori.webp',    seedName:'Il Cortile', rooms:[], cursor:0 },
};
let ctx = 'palazzo', viewer = null, busy = false, hintShown = false;

/* roomType phrase (from server) -> elegant Italian label */
function labelFor(t){
  t = (t || '').toLowerCase();
  const m = [
    ['throne','La Sala del Trono'], ['banquet','La Sala dei Banchetti'], ['bath','Il Bagno Reale'],
    ['library','La Biblioteca'], ['divan','La Sala dei Divani'], ['dome','La Sala a Cupola'],
    ['salon','Il Salone'], ['hall','Il Salone'], ['courtyard','Il Cortile'], ['fountain','Il Cortile'],
    ['garden','Il Giardino'], ['piazza','La Piazza'], ['loggia','La Loggia'], ['avenue','Il Viale'],
    ['cypress','Il Viale'], ['terrace','La Terrazza'], ['orchard','L’Agrumeto'],
  ];
  for (const [k,v] of m) if (t.includes(k)) return v;
  return ctx === 'fuori' ? 'Un Cortile' : 'Una Sala';
}

function initViewer(){
  viewer = new Viewer({
    container: 'viewer',
    panorama: CTX.palazzo.seed,
    navbar: false,
    defaultZoomLvl: 2, minFov: 35, maxFov: 85,
    moveInertia: true, mousewheel: true,
    loadingTxt: '',
  });
  viewer.addEventListener('ready', () => {
    document.documentElement.style.setProperty('--introbg', `url('${CTX.palazzo.seed}')`);
    // seed each context's first room
    CTX.palazzo.rooms = [{ name: CTX.palazzo.seedName, panorama: CTX.palazzo.seed }];
    CTX.fuori.rooms   = [{ name: CTX.fuori.seedName,   panorama: CTX.fuori.seed }];
  }, { once: true });
  // double-click anywhere = walk on (conjure). PSV's default dblclick-zoom happens behind
  // the overlay and is reset by the next setPanorama, so it's invisible.
  viewer.addEventListener('dblclick', () => conjure());
}

/* ---- generation ---- */
async function conjure(){
  if (busy) return;
  busy = true; showConjure(true); hideHint();
  try {
    const r = await fetch('/api/conjure', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ context: ctx }) });
    if (!r.ok) throw new Error((await r.json()).error || ('HTTP ' + r.status));
    const { id, roomType } = await r.json();
    const url = await pollStatus(id);
    // Skybox CDN sends no CORS header → route the image through our same-origin proxy so WebGL can texture it
    const panoUrl = '/api/pano?u=' + encodeURIComponent(url);
    const C = CTX[ctx];
    // drop any "forward" history if we'd branched after going back
    C.rooms = C.rooms.slice(0, C.cursor + 1);
    C.rooms.push({ name: labelFor(roomType), panorama: panoUrl });
    C.cursor = C.rooms.length - 1;
    await viewer.setPanorama(panoUrl, { transition: true, showLoader: false, zoom: 2 });
    paintChrome();
  } catch (e) {
    notice('<b>Could not conjure the next room.</b> ' + (e.message || '') );
  } finally {
    showConjure(false); busy = false;
  }
}
async function pollStatus(id){
  for (let i = 0; i < 70; i++){
    await sleep(4000);
    const r = await fetch('/api/status?id=' + encodeURIComponent(id));
    if (!r.ok) continue;
    const d = await r.json();
    if (d.status === 'complete' && d.file_url) return d.file_url;
    if (d.status === 'error' || d.status === 'abort') throw new Error(d.error_message || 'generation failed');
  }
  throw new Error('timed out');
}

/* ---- navigation ---- */
async function back(){
  const C = CTX[ctx];
  if (busy || C.cursor <= 0) return;
  C.cursor--; await viewer.setPanorama(C.rooms[C.cursor].panorama, { transition: true, showLoader: false, zoom: 2 }); paintChrome();
}
async function switchCtx(next){
  if (busy || next === ctx) return;
  ctx = next;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.ctx === ctx));
  const C = CTX[ctx];
  await viewer.setPanorama(C.rooms[C.cursor].panorama, { transition: true, showLoader: false, zoom: 2 });
  paintChrome();
}

/* ---- chrome ---- */
function paintChrome(){
  const C = CTX[ctx], room = C.rooms[C.cursor];
  el('counter').textContent = 'Room ' + roman(C.cursor + 1);
  el('capEyebrow').textContent = C.label;
  el('capTitle').textContent = room.name;
  el('capDesc').textContent = ctx === 'fuori'
    ? 'The grounds of the Aventine — walk on to discover the next garden, court, or view over Rome.'
    : 'Walk deeper and the palace reveals another hall, conjured as you go. No two visits are alike.';
  const a = el('capActions'); a.innerHTML = '';
  const b = capBtn('← Back', back, true); if (C.cursor <= 0) b.setAttribute('disabled','');
  a.appendChild(b);
  a.appendChild(capBtn('Walk on ⤢', conjure));
}
function capBtn(label, fn, ghost){
  const b = document.createElement('button');
  b.className = 'cap-btn' + (ghost ? ' ghost' : '');
  b.textContent = label; b.addEventListener('click', fn);
  return b;
}
function showViewerChrome(on){
  el('topbar').classList.toggle('hidden', !on);
  el('caption').classList.toggle('hidden', !on);
  el('veil').classList.toggle('on', on);
  if (on && !hintShown){ el('hint').classList.remove('hidden'); hintShown = true; setTimeout(hideHint, 6000); }
}
function hideHint(){ el('hint').classList.add('hidden'); }
function showConjure(on){
  el('cjTitle').textContent = ctx === 'fuori' ? 'Stepping outside…' : 'Conjuring the next hall…';
  el('conjure').classList.toggle('on', on);
}
function notice(html){ const n = el('notice'); n.innerHTML = html; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 6000); }

/* ---- boot ---- */
function start(){
  el('enter').addEventListener('click', () => { el('intro').classList.add('hidden'); showViewerChrome(true); paintChrome(); });
  el('home').addEventListener('click', () => { el('intro').classList.remove('hidden'); showViewerChrome(false); });
  el('restart').addEventListener('click', () => { el('closing').classList.add('hidden'); el('intro').classList.remove('hidden'); showViewerChrome(false); });
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchCtx(t.dataset.ctx)));
  document.addEventListener('keydown', (e) => {
    if (el('topbar').classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') back();
    if (e.key === 'ArrowRight' || e.key === 'Enter') conjure();
  });
}

initViewer();
start();
