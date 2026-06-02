/* Palazzo Aventino — 360° tour engine.
 *
 * Engine: google.maps.StreetViewPanorama (Google's real viewer chrome — drag to look,
 * scroll to zoom, ground arrows to walk). Path A+B:
 *   - Room 1 (La Facciata) tries REAL Google Street View at an Aventine coordinate;
 *     if no coverage is found it falls back to a custom placeholder panorama.
 *   - Rooms 2–8 are CUSTOM equirectangular panoramas served via panoProvider, linked
 *     so Google's native ground arrows walk between them. Procedural stone placeholders
 *     stand in until real 360° photos are supplied (set room.pano to an image URL).
 *
 * The whole experience degrades gracefully: if the key is unauthorised or Maps fails to
 * load, a fallback layer shows the same placeholder imagery and the chrome stays navigable.
 */

"use strict";

/* A real, Street-View-covered point on the Aventine (near Via di Santa Sabina, Roma). */
var AVENTINE = { lat: 41.88436, lng: 12.47906 };

var ROOMS = [
  null, // index 0 = intro (no room)
  { idx:1, id:"facade",     exterior:true, it:"La Facciata",              en:"The Façade",
    desc:"A seventeenth-century travertine front on the Aventine's quiet crown — pilasters, a deep cornice, and the city falling away below.",
    tone:{ sky:"#cdbfa6", base:"#b6a88c", col:"#d8ccb4", floor:"#8c7e69", accent:"#9c6b4d" } },
  { idx:2, id:"cortile",    it:"Il Cortile",                en:"The Courtyard",
    desc:"An arcaded inner court, open to the Roman sky, with a single citrus tree and a worn stone fountain.",
    tone:{ sky:"#d9d2c2", base:"#c3b59c", col:"#e3d8c2", floor:"#9a8c74", accent:"#9c6b4d" } },
  { idx:3, id:"scalone",    it:"Lo Scalone d'Onore",        en:"The Grand Staircase",
    desc:"A sweeping balustraded ascent in pale stone, lit from a high lantern.",
    tone:{ sky:"#e3dccd", base:"#cdbfa6", col:"#ece3d2", floor:"#a89a82", accent:"#9c6b4d" } },
  { idx:4, id:"salone",     it:"Il Salone Affrescato",      en:"The Frescoed Salon",
    desc:"The piano-nobile reception room, its vaulted ceiling carrying a faded allegory of the seasons.",
    tone:{ sky:"#e6d4b6", base:"#cdaf86", col:"#efe0c4", floor:"#9c8358", accent:"#9c6b4d" } },
  { idx:5, id:"biblioteca", it:"La Biblioteca",             en:"The Library",
    desc:"Walnut shelving to the cornice, a reading table, and tall shutters folding back to the garden.",
    tone:{ sky:"#c2a982", base:"#8f6f4c", col:"#a9855c", floor:"#5f4a32", accent:"#c08a52" } },
  { idx:6, id:"pranzo",     it:"La Sala da Pranzo",         en:"The Dining Room",
    desc:"Intimate and warm — a long table beneath a low iron chandelier, walls in deep ochre.",
    tone:{ sky:"#b98f5e", base:"#8a5d36", col:"#a06b3e", floor:"#5a3c22", accent:"#d39a5a" } },
  { idx:7, id:"padronale",  it:"L'Appartamento Padronale",  en:"The Master Suite",
    desc:"A private apartment of bedroom, dressing room and bath, with a loggia over the courtyard.",
    tone:{ sky:"#ddd0bb", base:"#c4b399", col:"#ece0cc", floor:"#9d8d74", accent:"#9c6b4d" } },
  { idx:8, id:"terrazza",   it:"La Terrazza",               en:"The Roof Terrace",
    desc:"Above the rooftops: a planted terrace facing the dome of St. Peter's at dusk.",
    tone:{ sky:"#d7935f", base:"#9a6f55", col:"#caa07f", floor:"#5f4636", accent:"#e0a86a" } }
];
var LAST = 9; // closing screen index
var STORE = "palazzo-aventino-3d";
var PW = 2048, PH = 1024; // equirectangular placeholder dimensions (2:1)

/* ---------------- procedural equirectangular placeholder ---------------- */
var _panoCache = {};
function makePano(room){
  if(_panoCache[room.id]) return _panoCache[room.id];
  var c = document.createElement("canvas"); c.width = PW; c.height = PH;
  var x = c.getContext("2d"), t = room.tone;

  // vertical wash: ceiling/sky -> wall -> floor
  var g = x.createLinearGradient(0,0,0,PH);
  g.addColorStop(0, t.sky); g.addColorStop(.42, t.base); g.addColorStop(.62, t.base); g.addColorStop(1, t.floor);
  x.fillStyle = g; x.fillRect(0,0,PW,PH);

  // colonnade — evenly spaced columns wrapping the full 360
  var cols = 16, span = PW/cols, horizon = PH*0.60;
  for(var i=0;i<cols;i++){
    var cx = i*span + span/2, w = span*0.34;
    // shaft
    var sg = x.createLinearGradient(cx-w/2,0,cx+w/2,0);
    sg.addColorStop(0, shade(t.col,-22)); sg.addColorStop(.5, t.col); sg.addColorStop(1, shade(t.col,-14));
    x.fillStyle = sg;
    x.fillRect(cx-w/2, PH*0.16, w, horizon-PH*0.16);
    // capital + base
    x.fillStyle = shade(t.col, 10);
    x.fillRect(cx-w*0.72, PH*0.16, w*1.44, PH*0.022);
    x.fillRect(cx-w*0.66, horizon-PH*0.02, w*1.32, PH*0.022);
    // arch hint above
    x.strokeStyle = shade(t.base, 14); x.lineWidth = PH*0.012;
    x.beginPath(); x.arc(cx, PH*0.16, span*0.5, Math.PI, 0); x.stroke();
  }

  // floor band + soft horizon shadow
  x.fillStyle = "rgba(0,0,0,.10)"; x.fillRect(0, horizon, PW, PH*0.012);
  // vignette top & bottom
  var v = x.createLinearGradient(0,0,0,PH);
  v.addColorStop(0,"rgba(0,0,0,.28)"); v.addColorStop(.5,"rgba(0,0,0,0)"); v.addColorStop(1,"rgba(0,0,0,.30)");
  x.fillStyle = v; x.fillRect(0,0,PW,PH);

  // watermark
  x.textAlign = "center";
  x.fillStyle = "rgba(255,255,255,.34)";
  x.font = "500 26px Jost, sans-serif";
  x.fillText("PLACEHOLDER 360°  —  DROP IN A REAL PANORAMA", PW/2, PH*0.50);
  x.fillStyle = "rgba(255,255,255,.66)";
  x.font = "italic 500 52px 'Cormorant Garamond', Georgia, serif";
  x.fillText(room.it, PW/2, PH*0.44);

  var url = c.toDataURL("image/jpeg", 0.82);
  _panoCache[room.id] = url;
  return url;
}
function shade(hex, amt){
  var n = parseInt(hex.slice(1),16);
  var r = clamp((n>>16)+amt), g = clamp((n>>8&255)+amt), b = clamp((n&255)+amt);
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function clamp(v){ return v<0?0:v>255?255:v; }

/* ---------------- custom panorama provider (rooms 2–8 + facade fallback) ---------------- */
function roomById(id){ for(var i=1;i<ROOMS.length;i++) if(ROOMS[i].id===id) return ROOMS[i]; return null; }

function panoProvider(panoId){
  var r = roomById(panoId);
  if(!r) return null;
  var img = r.pano /* real photo URL if supplied */ || makePano(r);
  // native ground-arrow links: walk among interior rooms (2–8). The facade boundary is
  // handled by caption buttons because a real Google pano id can't be linked into reliably.
  var links = [];
  var fwd = ROOMS[r.idx+1], back = ROOMS[r.idx-1];
  if(fwd && !fwd.exterior && fwd.idx<=8) links.push({ heading: 90,  pano: fwd.id, description: fwd.en });
  if(back && !back.exterior && back.idx>=2) links.push({ heading: 270, pano: back.id, description: back.en });
  return {
    location: { pano: r.id, description: r.it + " — " + r.en, latLng: new google.maps.LatLng(AVENTINE.lat, AVENTINE.lng) },
    links: links,
    copyright: "© NADAA Private Estates",
    tiles: {
      tileSize: new google.maps.Size(PW, PH),
      worldSize: new google.maps.Size(PW, PH),
      centerHeading: 0,
      getTileUrl: function(){ return img; }
    }
  };
}

/* ---------------- state + chrome ---------------- */
var sv = null, svc = null, mapsReady = false, fallbackMode = false, started = false;
var idx = 0, syncing = false;
var el = function(id){ return document.getElementById(id); };

function save(){ try{ localStorage.setItem(STORE, String(idx)); }catch(e){} }
function load(){ try{ var v = parseInt(localStorage.getItem(STORE),10); return isNaN(v)?0:v; }catch(e){ return 0; } }

function notice(html, sticky){
  var n = el("notice"); n.innerHTML = html; n.classList.add("show");
  if(!sticky) setTimeout(function(){ n.classList.remove("show"); }, 5200);
}
window.__tourNotice = notice;

/* ---------------- Google init (callback from Maps JS) ---------------- */
function initTour(){
  try{
    sv = new google.maps.StreetViewPanorama(el("pano"), {
      visible: true,
      panoProvider: panoProvider,
      pano: "facade",
      addressControl: false,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      showRoadLabels: false,
      zoomControl: true,
      panControl: false,
      enableCloseButton: false,
      linksControl: true,
      clickToGo: true
    });
    svc = new google.maps.StreetViewService();
    mapsReady = true;
    // keep our counter/caption in sync when the visitor uses Google's own arrows
    sv.addListener("pano_changed", function(){
      if(syncing) return;
      var pid = sv.getPano();
      var r = roomById(pid);
      if(r){ idx = r.idx; save(); paintChrome(); }
    });
    start();
  }catch(e){
    notice("<b>Viewer failed to initialise.</b> " + (e && e.message ? e.message : "") + " Showing placeholders.", true);
    enterFallback();
  }
}
window.initTour = initTour;

function enterFallback(){ fallbackMode = true; el("fallback").style.display = "block"; if(!started) start(); else paintChrome(); }
window.__tourFallback = enterFallback;

/* ---------------- navigation ---------------- */
function goTo(i){
  i = Math.max(0, Math.min(LAST, i));
  idx = i; save();

  var atIntro = (i===0), atClosing = (i===LAST), inViewer = (i>=1 && i<=8);
  toggle("intro", atIntro);
  toggle("closing", atClosing);
  el("topbar").classList.toggle("hidden", !inViewer);
  el("caption").classList.toggle("hidden", !inViewer);

  if(!inViewer) return;
  paintChrome();

  if(fallbackMode || !mapsReady){ renderFallbackRoom(i); return; }

  var room = ROOMS[i];
  syncing = true;
  if(room.exterior){
    // try REAL Street View first; fall back to the custom facade placeholder
    svc.getPanorama({ location: AVENTINE, radius: 120, source: google.maps.StreetViewSource.OUTDOOR }, function(data, status){
      if(status === "OK" && data && data.location){
        sv.setPano(data.location.pano);
        sv.setPov({ heading: 200, pitch: 2 });
      } else {
        sv.setPano(room.id); // custom facade placeholder
        notice("No public Street View at the exact coordinate — showing a placeholder façade. (Interiors are custom panoramas regardless.)");
      }
      syncing = false;
    });
  } else {
    sv.setPano(room.id);
    setTimeout(function(){ syncing = false; }, 60);
  }
}

function renderFallbackRoom(i){
  var room = ROOMS[i];
  var img = room.pano || makePano(room);
  var f = el("fallback");
  f.style.display = "block";
  f.style.background = "#1a1612 center/cover no-repeat url('" + img + "')";
}

function paintChrome(){
  var room = ROOMS[idx]; if(!room) return;
  el("counter").innerHTML = "<b>" + pad(room.idx) + "</b> / 08";
  el("capEyebrow").textContent = "Room " + pad(room.idx) + " — 08";
  el("capTitle").textContent = room.it;
  el("capEn").textContent = room.en;
  el("capDesc").textContent = room.desc;

  // caption actions: contextual prev / next (+ boundary moves)
  var a = el("capActions"); a.innerHTML = "";
  if(room.idx > 1) a.appendChild(capBtn("← Previous", function(){ goTo(idx-1); }, true));
  if(room.exterior){
    a.appendChild(capBtn("Enter the palazzo →", function(){ goTo(2); }));
  } else if(room.idx < 8){
    a.appendChild(capBtn("Next →", function(){ goTo(idx+1); }));
  } else {
    a.appendChild(capBtn("Conclude the tour →", function(){ goTo(LAST); }));
  }
}
function capBtn(label, fn, ghost){
  var b = document.createElement("button");
  b.className = "cap-btn" + (ghost ? " ghost" : "");
  b.textContent = label; b.addEventListener("click", fn);
  return b;
}
function pad(n){ return n<10 ? "0"+n : ""+n; }
function toggle(id, show){ el(id).classList.toggle("hidden", !show); }

/* ---------------- index menu ---------------- */
function buildIndex(){
  var list = el("ixList"); list.innerHTML = "";
  for(var i=1;i<=8;i++){
    (function(r){
      var b = document.createElement("button");
      b.className = "ix-row";
      b.innerHTML = '<span class="num">'+pad(r.idx)+'</span><span class="nm">'+r.it+'</span><span class="en">'+r.en+'</span>';
      b.addEventListener("click", function(){ toggle("index", false); goTo(r.idx); });
      list.appendChild(b);
    })(ROOMS[i]);
  }
}

/* ---------------- wiring / boot ---------------- */
function start(){
  if(started){ // maps arrived after fallback boot — re-render current room through the viewer
    if(idx>=1 && idx<=8 && mapsReady && !fallbackMode) goTo(idx);
    return;
  }
  started = true;
  buildIndex();

  el("enter").addEventListener("click", function(){ goTo(1); });
  el("home").addEventListener("click", function(){ goTo(0); });
  el("restart").addEventListener("click", function(){ goTo(0); });
  el("openIndex").addEventListener("click", function(){ toggle("index", true); });
  el("closeIndex").addEventListener("click", function(){ toggle("index", false); });

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){ toggle("index", false); return; }
    var indexOpen = !el("index").classList.contains("hidden");
    if(idx>=1 && idx<=8 && !indexOpen){
      if(e.key === "ArrowRight") goTo(Math.min(idx+1, LAST));
      if(e.key === "ArrowLeft")  goTo(Math.max(idx-1, 0));
    }
  });

  // restore where the visitor left off (intro on first visit)
  var saved = load();
  goTo(saved>=1 && saved<=LAST ? saved : 0);
}

/* If Maps never calls back within a few seconds, assume a load/key problem and degrade. */
setTimeout(function(){ if(!mapsReady && !fallbackMode){ enterFallback(); notice("<b>Viewer is taking too long.</b> Showing placeholder panoramas — the live Google viewer needs the *.vercel.app deploy.", true); } }, 9000);
