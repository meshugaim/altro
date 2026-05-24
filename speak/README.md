# speak

Push-to-talk voice-to-voice app for **web, iOS, and desktop**, powered by NVIDIA's
voice stack (Riva ASR + NIM-hosted LLM + Magpie TTS).

## Architecture

```
┌──────────────────────────┐    audio    ┌────────────────────────┐
│ apps/mobile (Expo)       │ ──────────► │ apps/server (Next.js)  │
│  • iOS native            │             │  /api/asr  → Riva ASR  │
│  • Web (RN Web)          │ ◄────────── │  /api/chat → NIM LLM   │
└──────────────────────────┘   audio     │  /api/tts  → Magpie    │
┌──────────────────────────┐             └────────────────────────┘
│ apps/desktop (Electron)  │ ──────────►        (holds API key)
│  wraps the web build     │
└──────────────────────────┘
```

All three clients share one PTT screen (in `apps/mobile/src`) and talk to one
Next.js server that holds `NVIDIA_API_KEY` and proxies ASR / LLM / TTS.

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure
cp apps/server/.env.example apps/server/.env.local
# Edit apps/server/.env.local and set NVIDIA_API_KEY

# 3. Run the server (port 3001)
npm run dev:server

# 4. Run a client (pick one):
npm run web         # browser at http://localhost:8081
npm run ios         # iOS simulator (requires Xcode)
npm run desktop     # Electron — first run: npm run build:web
```

## Push-to-talk

- **Web / desktop**: hold the on-screen button **or** hold the spacebar
- **iOS**: hold the on-screen button
- **Desktop (Electron)**: global hotkey `CommandOrControl+Shift+Space`

## NVIDIA endpoints

The server defaults to NVIDIA's hosted NIM endpoints. To use locally-hosted
Riva / TTS NIM containers instead, set in `.env.local`:

```
NVIDIA_ASR_URL=http://localhost:9000
NVIDIA_TTS_URL=http://localhost:9001
```

See `apps/server/lib/nvidia.ts` for the exact endpoint shapes.
