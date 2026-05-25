# speak

Full-duplex, voice-to-voice app powered by **NVIDIA PersonaPlex** — a real-time
speech-to-speech model (Moshi-based) with text-prompted personas and selectable
voices.

Unlike a turn-based pipeline (record → transcribe → LLM → synthesize), PersonaPlex
is a single end-to-end model: you stream microphone audio in and hear the
assistant speak back, simultaneously, over one WebSocket.

## Architecture

```
┌──────────────────────────┐  Opus audio (WebSocket /api/chat)  ┌────────────────────────┐
│ Web client (browser)     │ ─────────────────────────────────► │ PersonaPlex server     │
│  • mic → Opus → stream   │                                     │  (GPU host)            │
│  • Opus ← speaker stream │ ◄───────────────────────────────── │  python -m moshi.server│
└──────────────────────────┘   full-duplex, 24 kHz mono Opus     └────────────────────────┘
         ▲
         │ GET /api/config  (which GPU host / voice / persona)
         │
┌──────────────────────────┐
│ speak server (Next.js)   │  hands the client its config; the audio stream
│  apps/server             │  goes browser → GPU host directly.
└──────────────────────────┘
```

- **`apps/server`** (Next.js) serves the web client and a `/api/config` endpoint.
  It holds the GPU host URL / default voice / default persona in env so they
  aren't baked into the bundle. The audio stream itself is browser ↔ GPU host.
- **`packages/client`** is the shared protocol: WebSocket frame encode/decode,
  the `/api/chat` URL builder, voice list, and defaults.
- **`apps/mobile`** (Expo) currently hands off to the web client; native
  (iOS) full-duplex streaming needs a dedicated Opus audio module — the next
  milestone.

## The GPU requirement

PersonaPlex runs the model itself, so it needs a GPU host. Vercel/Railway can
serve `apps/server` (it's just config + static client), but the **PersonaPlex
server must run on a GPU** (Brev / Lambda / RunPod / your own box). See
[DEPLOY.md](./DEPLOY.md).

## Quickstart

```bash
# 1. Stand up PersonaPlex on a GPU host (see DEPLOY.md), note its wss:// URL.

# 2. Install
npm install

# 3. Configure
cp apps/server/.env.example apps/server/.env.local
#   set PERSONAPLEX_WS_URL=wss://<gpu-host>:8998

# 4. Run the web client (port 3001)
npm run dev:server
#   open http://localhost:3001 → pick a voice/persona → Start talking
```

## Voices & persona

- **Voice**: a voice-embedding file (`NATF0.pt`, `VARM1.pt`, …) shipped by
  PersonaPlex in `voices.tgz`. Choose the default with `PERSONAPLEX_VOICE`, or
  expose a custom subset with `PERSONAPLEX_VOICES`.
- **Persona**: a free-text role prompt (`PERSONAPLEX_PERSONA`) sent at the start
  of each conversation; editable per-session in the UI.

See `packages/client/src/index.ts` for the exact protocol and the shipped voice
list.
