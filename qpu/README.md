# ⚛ Entropy QPU

A playful **Entropy Processing Unit** — a "quantum"-feeling random source built
from the physical chaos around the machine. Three channels feed one whitened
pool, and a live fluid-smoke simulation lets you *see* the entropy breathe.

> זר לא יבין — part of the OriaLab "entropy lab".

## The channels

| channel | source |
|---------|--------|
| 🌡 **temperature** | jitter in the low bits of the box's thermal sensors |
| 🎙 **sound** | low-order bits of ambient microphone samples (room noise) |
| 🌫 **smoke ★** | `sound × thermal-jitter` turbulence — two physical sources interacting, the better entropy |

Raw samples are absorbed into a **BLAKE2b** pool; output is *squeezed* from it,
so even a weak or biased channel can't poison the stream (it's also seeded from
the OS CSPRNG, so it's never worse than `os.urandom`). Only the low bits of
audio are ever used, and nothing is stored.

## The fire

The web UI renders a real **fluid smoke simulation** — buoyancy +
vorticity-confinement (curl) + semi-Lagrangian advection, drawn at sim
resolution and smoothly upscaled. Click **🎙 let the fire hear the room** to
grant the browser mic: the flames then react to the room in real time. Four
elements perturb the fluid (and feed the pool):

- 🪵 **Wood** — dumps fuel: taller flames, thick dark smoke
- 🌬 **Wind** — a lateral gust that shears the plume (alternates direction)
- 🌧 **Rain** — cools the fire to pale steam
- ⚡ **Electricity** — a jagged bolt: flash + violent updraft

Press **⚛ Measure** to collapse the pool into hex bytes, a 0–99 number, a die,
a coin, and a qubit.

## Run

```bash
python3 qpu.py serve        # live web QPU at http://localhost:8787
python3 qpu.py rand 32      # 32 random bytes as hex
python3 qpu.py selftest     # sample every channel once, print a report
```

Env knobs: `QPU_MIC=0` disables the server-side mic channel; `QPU_CAM=1`
(`QPU_CAM_DEV=/dev/video0`) folds real camera frames in as optical entropy —
point a lens at a candle and the flame becomes a true source.

Pure Python standard library (plus `parecord`/`ffmpeg` if present for the
optional mic/camera channels). No build step, no dependencies.
