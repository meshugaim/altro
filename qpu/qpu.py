#!/usr/bin/env python3
"""altro QPU — an Entropy Processing Unit.

A playful "quantum"-feeling random source built from the physical chaos around
this machine. Three channels feed one whitened pool:

  🌡  temperature — jitter in the low bits of the thermal sensors
  🎙  sound       — low-order bits of ambient microphone samples (room noise)
  🔥  fire/smoke  — a turbulent doom-fire field, stirred by the live pool; the
                    visual "core" of the QPU. Optionally fed by a real camera
                    (QPU_CAM=1) so you can point a lens at a candle/fire.

Raw samples are absorbed into a BLAKE2b pool; output is squeezed from it, so
even a weak channel can't poison the stream. Only low bits of audio are ever
used and nothing is stored.

Usage:
  python3 qpu.py selftest        # sample every channel once, print a report
  python3 qpu.py rand [N]        # N random bytes as hex (default 32)
  python3 qpu.py serve [PORT]    # live web QPU at http://localhost:8787
"""
import glob
import hashlib
import json
import os
import struct
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

THERMAL = sorted(glob.glob("/sys/class/thermal/thermal_zone*/temp"))
MIC_ON = os.environ.get("QPU_MIC", "1") != "0"
CAM_ON = os.environ.get("QPU_CAM", "0") == "1"
CAM_DEV = os.environ.get("QPU_CAM_DEV", "/dev/video0")
PORT = 8787


# ----------------------------------------------------------------------------
# entropy pool — absorb raw chaos, squeeze whitened bytes
# ----------------------------------------------------------------------------
class Pool:
    def __init__(self):
        self._h = hashlib.blake2b(person=b"altro-qpu-v1")
        self._ctr = 0
        self.absorbed = 0          # raw bytes absorbed
        self.samples = 0           # number of absorb() calls
        self._lock = threading.Lock()
        self._h.update(os.urandom(32))  # seed so we're never worse than the OS CSPRNG

    def absorb(self, label, data):
        if not data:
            return
        with self._lock:
            self._h.update(label)
            self._h.update(struct.pack("<d", time.monotonic()))
            self._h.update(data)
            self.absorbed += len(data)
            self.samples += 1

    def squeeze(self, n):
        out = bytearray()
        with self._lock:
            base = self._h.digest()
            while len(out) < n:
                self._ctr += 1
                out += hashlib.blake2b(
                    base + self._ctr.to_bytes(8, "little"), digest_size=64
                ).digest()
        return bytes(out[:n])


POOL = Pool()


# ----------------------------------------------------------------------------
# channels
# ----------------------------------------------------------------------------
def read_temps():
    vals = []
    for p in THERMAL:
        try:
            with open(p) as f:
                vals.append(int(f.read().strip()))
        except Exception:
            pass
    return vals


def read_sound(ms=50, rate=44100):
    """Capture a short mono s16le buffer from the default mic via parecord.
    Returns raw PCM bytes (caller uses only the noisy low bits). Never stored."""
    if not MIC_ON:
        return b""
    need = int(rate * ms / 1000) * 2
    try:
        p = subprocess.Popen(
            ["parecord", "--raw", "--file-format=raw", "--format=s16le",
             f"--rate={rate}", "--channels=1"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        return b""
    data = b""
    try:
        while len(data) < need:
            chunk = p.stdout.read(need - len(data))
            if not chunk:
                break
            data += chunk
    finally:
        p.kill()
        try:
            p.stdout.close()
        except Exception:
            pass
    return data


def read_cam():
    """Grab one raw frame from the camera (optional optical/'fire' entropy)."""
    if not CAM_ON:
        return b""
    try:
        out = subprocess.run(
            ["ffmpeg", "-loglevel", "quiet", "-f", "v4l2", "-i", CAM_DEV,
             "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            capture_output=True, timeout=2,
        )
        return out.stdout
    except Exception:
        return b""


def rms_level(pcm, gain=11.0):
    """0..1 loudness from s16le bytes (for the UI gauge). Peak-weighted + gained
    so a quiet room idles low but speech/claps clearly drive it toward 1."""
    if len(pcm) < 2:
        return 0.0
    n = len(pcm) // 2
    step = max(1, n // 1024)
    acc = 0
    peak = 0
    cnt = 0
    for i in range(0, n, step):
        s = struct.unpack_from("<h", pcm, i * 2)[0]
        a = s if s >= 0 else -s
        if a > peak:
            peak = a
        acc += s * s
        cnt += 1
    import math
    rms = math.sqrt(acc / max(1, cnt))
    lvl = (0.6 * peak + 0.4 * rms) / 32768.0
    return min(1.0, lvl * gain)


# ----------------------------------------------------------------------------
# live state, refreshed by a background sampler thread
# ----------------------------------------------------------------------------
STATE = {
    "temps": [], "labels": [], "hottest": 0.0,
    "sound": 0.0, "mic": MIC_ON, "cam": CAM_ON,
    "absorbed": 0, "samples": 0, "rate_bps": 0.0, "fire": 0.0, "smoke": 0.0,
}
_zone_labels = []
for p in THERMAL:
    try:
        _zone_labels.append(open(p.replace("temp", "type")).read().strip())
    except Exception:
        _zone_labels.append(os.path.basename(os.path.dirname(p)))
STATE["labels"] = _zone_labels


def sampler():
    last_t, last_bytes = time.monotonic(), 0
    i = 0
    prev_temps = read_temps()
    sound_s = 0.0       # smoothed sound level
    while True:
        i += 1
        temps = read_temps()
        # thermal jitter = how much the sensors twitched since last loop (real noise)
        tjit = 0.0
        if temps and prev_temps and len(temps) == len(prev_temps):
            tjit = sum(abs(a - b) for a, b in zip(temps, prev_temps)) / (1000.0 * len(temps))
        prev_temps = temps
        if temps:
            POOL.absorb(b"temp", b"".join(struct.pack("<i", t) for t in temps))
            STATE["temps"] = temps
            STATE["hottest"] = max(temps) / 1000.0
        # SOUND — every loop so the field actually listens to the room
        if MIC_ON:
            pcm = read_sound(40)
            if pcm:
                POOL.absorb(b"snd", bytes(pcm[k] for k in range(0, len(pcm), 2)))
                lvl = rms_level(pcm)
                sound_s = sound_s * 0.5 + lvl * 0.5      # light smoothing
                STATE["sound"] = round(sound_s, 3)
        if CAM_ON and i % 6 == 0:
            frame = read_cam()
            if frame:
                POOL.absorb(b"cam", hashlib.blake2b(frame, digest_size=32).digest())
        # FIRE = the room's loudness driving the flame; SMOKE = the better entropy,
        # the turbulent product of sound × thermal jitter (two physical sources
        # interacting — more chaotic than either alone).
        fire = min(1.0, STATE["sound"] * 0.9 + 0.12)
        # smoke = sound-led, with a bounded turbulence bonus from thermal jitter
        # (the two physical sources interacting) — the better, more chaotic entropy
        turb = min(0.3, tjit * 0.04)
        smoke = min(1.0, 0.12 + STATE["sound"] * 0.72 + turb)
        POOL.absorb(b"smoke", struct.pack("<dd", smoke, tjit))
        STATE["fire"] = round(fire, 3)
        STATE["smoke"] = round(smoke, 3)
        now = time.monotonic()
        if now - last_t >= 1.0:
            STATE["rate_bps"] = round((POOL.absorbed - last_bytes) / (now - last_t), 1)
            last_t, last_bytes = now, POOL.absorbed
        STATE["absorbed"] = POOL.absorbed
        STATE["samples"] = POOL.samples
        time.sleep(0.2)


# ----------------------------------------------------------------------------
# measurement — "collapse" the pool into human-friendly outputs
# ----------------------------------------------------------------------------
def measure(n=32):
    # stir in a fresh reading so every measurement is freshly grounded
    POOL.absorb(b"meas-temp", b"".join(struct.pack("<i", t) for t in read_temps()))
    pcm = read_sound(40)
    if pcm:
        POOL.absorb(b"meas-snd", bytes(pcm[k] for k in range(0, len(pcm), 2)))
    raw = POOL.squeeze(max(n, 8))
    u = int.from_bytes(raw[:8], "big")
    return {
        "hex": raw[:n].hex(),
        "int": u % 100,                       # 0..99
        "dice": (raw[0] % 6) + 1,
        "coin": "H" if raw[1] & 1 else "T",
        "qubit": "|1⟩" if raw[2] & 1 else "|0⟩",
        "bits": n * 8,
    }


# ----------------------------------------------------------------------------
# web UI
# ----------------------------------------------------------------------------
HTML = """<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>altro · Entropy QPU</title>
<style>
:root{--bg:#07080c;--card:#12141d;--ac:#25c2f4;--hot:#ff5a36;--txt:#e8eaf2;--mut:#7b8198}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:radial-gradient(120% 80% at 50% -10%,#15233a 0%,var(--bg) 60%);
color:var(--txt);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:22px 14px 60px}
h1{font-size:17px;letter-spacing:3px;margin:4px 0 0;font-weight:700}
h1 span{color:var(--ac)}
.sub{color:var(--mut);font-size:11px;letter-spacing:2px;margin-bottom:16px}
.wrap{width:100%;max-width:520px;display:flex;flex-direction:column;gap:14px}
canvas{width:100%;height:248px;border-radius:14px;background:#000;display:block;
box-shadow:0 0 40px #ff5a3622,inset 0 0 0 1px #ffffff10}
.chs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.ch{background:var(--card);border-radius:12px;padding:10px;border:1px solid #ffffff0d}
.ch.smoke{border-color:#9aa3b855;box-shadow:0 0 18px #9aa3b81f}
.ch .k{font-size:9.5px;color:var(--mut);letter-spacing:.5px;text-transform:uppercase}
.ch .k b{color:#e8ecf5}
.ch .v{font-size:17px;font-weight:700;margin-top:4px}
.ch .v small{font-size:10px;color:var(--mut);font-weight:400}
.bar{height:5px;border-radius:3px;background:#ffffff12;margin-top:9px;overflow:hidden}
.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--ac),#7df9ff);transition:.2s}
.ch.fire .bar i{background:linear-gradient(90deg,#ffb02e,var(--hot))}
.ch.temp .bar i{background:linear-gradient(90deg,#36d399,#ff5a36)}
.ch.smoke .bar i{background:linear-gradient(90deg,#9aa3b8,#e8ecf5)}
.pool{background:var(--card);border-radius:12px;padding:13px 15px;border:1px solid #ffffff0d;
display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--mut)}
.pool b{color:var(--txt);font-size:15px}
button{border:0;border-radius:14px;background:linear-gradient(135deg,#25c2f4,#1b7fd8);
color:#04121f;font-weight:800;font-size:16px;letter-spacing:1px;padding:17px;cursor:pointer;
font-family:inherit;transition:.08s}
button:active{transform:scale(.97)}
.out{background:#04060b;border:1px solid #ffffff10;border-radius:14px;padding:16px;min-height:120px}
.out .hex{color:var(--ac);word-break:break-all;font-size:12.5px;line-height:1.7}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;text-align:center}
.grid div{background:#0c0f17;border-radius:10px;padding:10px 4px}
.grid .k{font-size:9px;color:var(--mut);letter-spacing:1px}
.grid .b{font-size:22px;font-weight:800;margin-top:3px}
.off{opacity:.45}
.foot{color:var(--mut);font-size:10px;letter-spacing:1px;margin-top:6px}
.elements{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.el{background:var(--card);color:var(--txt);font-size:13px;font-weight:600;padding:13px 4px;
border:1px solid #ffffff12;border-radius:12px;cursor:pointer;font-family:inherit;transition:.1s}
.el:active{transform:scale(.95)}
.el.on{border-color:var(--ac);box-shadow:0 0 16px #25c2f455}
#el_wood.on{border-color:#c9852b;box-shadow:0 0 16px #c9852b66}
#el_rain.on{border-color:#5aa9ff;box-shadow:0 0 16px #5aa9ff66}
#el_elec.on{border-color:#b388ff;box-shadow:0 0 18px #b388ffaa}
.mic{background:#16243a;color:#cfe6ff;border:1px solid #25c2f455;border-radius:12px;
font-size:14px;font-weight:700;padding:14px;cursor:pointer;font-family:inherit;transition:.1s}
.mic:active{transform:scale(.98)}
.mic.on{background:#0e2a18;color:#7df9b0;border-color:#3ad07a;box-shadow:0 0 16px #3ad07a55}
</style></head><body>
<h1>ENTROPY <span>QPU</span></h1>
<div class=sub>זר לא יבין · physical-chaos random core</div>
<div class=wrap>
 <canvas id=fire></canvas>
 <button id=miclisten class=mic onclick="enableMic()">🎙 Click to let the fire hear the room</button>
 <div class=elements>
   <button class=el id=el_wood onclick="elwood()">🪵 Wood</button>
   <button class=el id=el_wind onclick="elwind()">🌬 Wind</button>
   <button class=el id=el_rain onclick="elrain()">🌧 Rain</button>
   <button class=el id=el_elec onclick="elspark()">⚡ Electricity</button>
 </div>
 <div class=chs>
   <div class="ch temp"><div class=k>🌡 Temp</div><div class=v id=tv>—<small>°C</small></div><div class=bar><i id=tb></i></div></div>
   <div class="ch snd"><div class=k>🎙 Sound</div><div class=v id=sv>—</div><div class=bar><i id=sb></i></div></div>
   <div class="ch fire"><div class=k>🔥 Fire</div><div class=v id=fv>—</div><div class=bar><i id=fb></i></div></div>
   <div class="ch smoke"><div class=k>🌫 Smoke <b>★</b></div><div class=v id=kv>—</div><div class=bar><i id=kb></i></div></div>
 </div>
 <div class=pool><span>pool absorbed <b id=ab>0</b> bytes · <b id=rt>0</b> B/s</span><span id=hs>● live</span></div>
 <button onclick=measure()>⚛ MEASURE · collapse the field</button>
 <div class=out>
   <div class=hex id=hex>press measure to draw randomness from the room…</div>
   <div class=grid>
     <div><div class=k>0–99</div><div class=b id=oint>·</div></div>
     <div><div class=k>dice</div><div class=b id=odice>·</div></div>
     <div><div class=k>coin</div><div class=b id=ocoin>·</div></div>
     <div><div class=k>qubit</div><div class=b id=oq>·</div></div>
   </div>
 </div>
 <div class=foot>temp = sensor jitter · sound = mic low-bits (not stored) · fire = room loudness · 🌫 smoke ★ = sound × thermal-jitter turbulence — the better entropy</div>
</div>
<script>
const $=i=>document.getElementById(i);
// ===================== fluid smoke simulation =====================
// Buoyancy + vorticity-confinement (curl) + semi-Lagrangian advection.
// Rendered at sim resolution and CSS-upscaled (smooth) for a realistic plume.
const cv=$('fire'),cx=cv.getContext('2d');
const N=160,M=84,SZ=N*M;cv.width=N;cv.height=M;
const IX=(x,y)=>x+y*N;
let dens=new Float32Array(SZ),temp=new Float32Array(SZ),vx=new Float32Array(SZ),vy=new Float32Array(SZ);
let d0=new Float32Array(SZ),t0=new Float32Array(SZ),u0=new Float32Array(SZ),w0=new Float32Array(SZ),curl=new Float32Array(SZ);
const img=cx.createImageData(N,M);
const dt=0.95;
// live env + element state
let env=0.12,envT=0.12,wood=0,rain=0,elec=0,flash=0,boltX=80,windV=0,windDir=1;
let micOn=false,analyser=null,micData=null,actx=null,micLevel=0;
// browser mic — triggers the permission prompt AND drives the flames in real-time
async function enableMic(){const b=$('miclisten');
 try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();await actx.resume();
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   const src=actx.createMediaStreamSource(stream);analyser=actx.createAnalyser();
   analyser.fftSize=512;micData=new Uint8Array(analyser.fftSize);src.connect(analyser);
   micOn=true;b.classList.add('on');b.textContent='● the fire is listening';
 }catch(e){b.textContent='✕ mic blocked — click to retry';}}

function advect(D,S,U,V){
 for(let y=1;y<M-1;y++)for(let x=1;x<N-1;x++){const i=IX(x,y);
   let fx=x-U[i]*dt,fy=y-V[i]*dt;
   if(fx<0.5)fx=0.5;else if(fx>N-1.5)fx=N-1.5;
   if(fy<0.5)fy=0.5;else if(fy>M-1.5)fy=M-1.5;
   const x0=fx|0,y0=fy|0,sx=fx-x0,sy=fy-y0;
   D[i]=(1-sx)*((1-sy)*S[IX(x0,y0)]+sy*S[IX(x0,y0+1)])
       +    sx *((1-sy)*S[IX(x0+1,y0)]+sy*S[IX(x0+1,y0+1)]);
 }
}
function step(){
 if(micOn&&analyser){analyser.getByteTimeDomainData(micData);let s=0;
   for(let k=0;k<micData.length;k++){const v=(micData[k]-128)/128;s+=v*v;}
   const rms=Math.sqrt(s/micData.length);micLevel=micLevel*0.6+Math.min(1,rms*8)*0.4;
   envT=Math.min(1.3,0.1+micLevel*1.7);                 // live room → fire base
   $('sv').textContent=micLevel.toFixed(2);lerpw('sb',micLevel);}
 env+=(envT-env)*(micOn?0.22:0.1);
 if(wood>0)wood--; if(rain>0)rain--; if(elec>0)elec--; flash*=0.84; windV*=0.965;
 // ---- forces ----
 // fire source at the base (width/strength track the room + wood)
 const half=((0.10+env*0.16+(wood>0?0.06:0))*N)|0, cxs=(N/2)|0;
 const ts=0.55+env*1.5+(wood>0?1.4:0), ds=0.12+env*0.28+(wood>0?0.5:0);
 const wet=rain>0?0.45:1.0;                       // rain suppresses the flame
 for(let x=cxs-half;x<=cxs+half;x++){if(x<1||x>N-2)continue;
   for(let y=M-4;y<M-1;y++){const i=IX(x,y);
     temp[i]+=ts*wet; dens[i]+=ds; vy[i]-=(0.35+env*0.5)*wet; vx[i]+=(Math.random()-0.5)*0.4;}}
 // buoyancy: hot rises (y up = negative)
 for(let i=0;i<SZ;i++){vy[i]-=temp[i]*0.05; vx[i]+=windV*0.06;}
 // rain: downdraft + cooling + steam where it meets heat
 if(rain>0){for(let x=1;x<N-1;x++){if(Math.random()<0.5)continue;const i=IX(x,2);vy[i]+=0.5;}
   for(let i=0;i<SZ;i++){if(temp[i]>0.2){dens[i]+=temp[i]*0.04;temp[i]*=0.92;}else temp[i]*=0.985;}}
 // electricity: jagged bolt drives a violent updraft + flash
 if(elec>0){let bx=boltX;for(let y=M-2;y>1;y--){bx+=(Math.random()*3-1.5);
   const xi=Math.max(1,Math.min(N-2,bx|0));const i=IX(xi,y);temp[i]+=0.6;vy[i]-=0.8;vx[i]+=(Math.random()-0.5)*1.2;}}
 // ---- vorticity confinement (adds realistic curls) ----
 for(let y=1;y<M-1;y++)for(let x=1;x<N-1;x++){const i=IX(x,y);
   curl[i]=(vy[i+1]-vy[i-1])*0.5-(vx[i+N]-vx[i-N])*0.5;}
 for(let y=2;y<M-2;y++)for(let x=2;x<N-2;x++){const i=IX(x,y);
   let nx=(Math.abs(curl[i+1])-Math.abs(curl[i-1]))*0.5;
   let ny=(Math.abs(curl[i+N])-Math.abs(curl[i-N]))*0.5;
   const L=Math.hypot(nx,ny)+1e-5;nx/=L;ny/=L;
   vx[i]+=0.7*ny*curl[i]; vy[i]-=0.7*nx*curl[i];}
 // ---- advect velocity (self), then density & temp ----
 u0.set(vx);w0.set(vy);advect(vx,u0,u0,w0);advect(vy,w0,u0,w0);
 d0.set(dens);advect(dens,d0,vx,vy); t0.set(temp);advect(temp,t0,vx,vy);
 // ---- dissipate + damp + open top ----
 for(let i=0;i<SZ;i++){dens[i]*=0.986;temp[i]*=0.975;vx[i]*=0.99;vy[i]*=0.99;}
 for(let x=0;x<N;x++){dens[IX(x,0)]*=0.6;temp[IX(x,0)]*=0.6;}
 // ---- render: dark bg + emissive fire + grey smoke + flash/bolt ----
 const D=img.data;
 for(let y=0;y<M;y++)for(let x=0;x<N;x++){const i=IX(x,y);
   let v=temp[i];if(v>1.5)v=1.5;
   let r=7+Math.min(248,v*210), g=8+Math.min(247,Math.max(0,(v-0.45)*210)), b=12+Math.min(243,Math.max(0,(v-0.95)*230));
   let a=dens[i]*0.55;if(a>0.8)a=0.8;
   if(a>0.01){r=r*(1-a)+182*a;g=g*(1-a)+186*a;b=b*(1-a)+198*a;}
   if(flash>0.02){r+=flash*120;g+=flash*120;b+=flash*150;}
   const p=i*4;D[p]=r>255?255:r;D[p+1]=g>255?255:g;D[p+2]=b>255?255:b;D[p+3]=255;}
 if(elec>0){let bx=boltX;for(let y=M-2;y>1;y--){bx+=(Math.random()*3-1.5);
   const xi=Math.max(0,Math.min(N-1,bx|0));const p=IX(xi,y)*4;D[p]=210;D[p+1]=225;D[p+2]=255;}}
 cx.putImageData(img,0,0);requestAnimationFrame(step);}
step();
// ===================== element buttons =====================
function pulse(id){const e=$(id);e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),700);}
function perturb(src){fetch('/api/perturb?src='+src).catch(()=>{});}
function elwood(){wood=170;pulse('el_wood');perturb('wood');}
function elwind(){windDir*=-1;windV=windDir*1.0;pulse('el_wind');perturb('wind');}
function elrain(){rain=220;pulse('el_rain');perturb('rain');}
function elspark(){boltX=8+((Math.random()*(N-16))|0);elec=14;flash=1;pulse('el_elec');perturb('elec');
 for(let y=2;y<M-2;y++){const i=IX(Math.max(1,Math.min(N-2,boltX)),y);temp[i]+=1.0;vy[i]-=1.0;}}
// ===================== live channels =====================
function lerpw(id,v){$(id).style.width=Math.max(0,Math.min(100,v*100))+'%';}
async function poll(){try{const d=await(await fetch('/api/state')).json();
 $('tv').innerHTML=d.hottest.toFixed(1)+'<small>°C</small>';lerpw('tb',(d.hottest-30)/70);
 if(!micOn){$('sv').textContent=d.mic?(d.sound).toFixed(2):'off';if(!d.mic)$('sv').parentElement.classList.add('off');lerpw('sb',d.sound);}
 $('fv').textContent=(d.fire).toFixed(2);lerpw('fb',d.fire);
 $('kv').textContent=(d.smoke).toFixed(2);lerpw('kb',d.smoke);
 envT=Math.min(1.2,d.fire*1.0+d.smoke*0.25);   // room loudness feeds the fire base
 $('ab').textContent=d.absorbed.toLocaleString();$('rt').textContent=d.rate_bps;$('hs').textContent='● live';
}catch(e){$('hs').textContent='● server offline';}}
poll();setInterval(poll,500);
// ---- measure ----
async function measure(){$('hex').textContent='collapsing…';
 try{const d=await(await fetch('/api/random?n=32')).json();
  $('hex').textContent=d.hex;$('oint').textContent=d.int;$('odice').textContent=d.dice;
  $('ocoin').textContent=d.coin;$('oq').textContent=d.qubit;
  for(const id of['oint','odice','ocoin','oq']){const e=$(id);e.style.color='#25c2f4';
   setTimeout(()=>e.style.color='',400);}
 }catch(e){$('hex').textContent='✕ '+e.message;}}
</script></body></html>"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        b = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            self._send(200, HTML, "text/html; charset=utf-8")
        elif path == "/api/state":
            self._send(200, json.dumps(STATE))
        elif path == "/api/random":
            q = parse_qs(urlparse(self.path).query)
            n = max(1, min(1024, int((q.get("n") or ["32"])[0])))
            self._send(200, json.dumps(measure(n)))
        elif path == "/api/perturb":
            q = parse_qs(urlparse(self.path).query)
            src = (q.get("src") or ["?"])[0][:16]
            # the elements feed the pool: their press timing + fresh OS noise
            POOL.absorb(b"elem:" + src.encode("ascii", "replace"), os.urandom(16))
            self._send(200, json.dumps({"ok": True, "src": src}))
        else:
            self._send(404, b"not found")


def serve(port=PORT):
    threading.Thread(target=sampler, daemon=True).start()
    print(f"⚛ altro Entropy QPU on http://localhost:{port}  (mic={'on' if MIC_ON else 'off'}, cam={'on' if CAM_ON else 'off'})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), H).serve_forever()


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "serve"
    if cmd == "serve":
        serve(int(sys.argv[2]) if len(sys.argv) > 2 else PORT)
    elif cmd == "rand":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 32
        POOL.absorb(b"temp", b"".join(struct.pack("<i", t) for t in read_temps()))
        POOL.absorb(b"snd", read_sound(50))
        print(POOL.squeeze(n).hex())
    elif cmd == "selftest":
        temps = read_temps()
        pcm = read_sound(50)
        cam = read_cam()
        print(f"thermal zones : {len(temps)}  hottest={max(temps)/1000.0 if temps else 0:.1f}°C")
        print(f"mic capture   : {'on' if MIC_ON else 'OFF'}  bytes={len(pcm)}  level={rms_level(pcm):.3f}")
        print(f"camera        : {'on' if CAM_ON else 'off'}  bytes={len(cam)}")
        POOL.absorb(b"temp", b"".join(struct.pack("<i", t) for t in temps))
        POOL.absorb(b"snd", pcm)
        POOL.absorb(b"cam", cam)
        print(f"pool absorbed : {POOL.absorbed} bytes over {POOL.samples} samples")
        print(f"sample output : {POOL.squeeze(32).hex()}")
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
