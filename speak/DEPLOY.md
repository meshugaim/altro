# Deploying speak (PersonaPlex)

There are two pieces:

1. **PersonaPlex server** — the speech-to-speech model. **Needs a GPU.** This is
   the part that does the real work and the only hard requirement.
2. **speak server** (`apps/server`) — a tiny Next.js app that serves the web
   client and a `/api/config` endpoint. Runs anywhere (Vercel/Railway/your box).

The browser streams audio **directly** to the PersonaPlex server over a
WebSocket; the speak server only tells the client where that GPU host is.

---

## 1. PersonaPlex on a GPU host (required)

PersonaPlex is NVIDIA's Moshi-based full-duplex model. Run it on any GPU box
(Brev / Lambda / RunPod / your own). Roughly:

```bash
git clone https://github.com/NVIDIA/personaplex && cd personaplex
export HF_TOKEN=<your-huggingface-token>     # needed to pull model weights

# Option A: docker compose (uses the provided Dockerfile / docker-compose.yaml)
docker compose up            # serves on :8998

# Option B: bare python
pip install moshi/.
SSL_DIR=$(mktemp -d); python -m moshi.server --ssl "$SSL_DIR"   # serves on :8998
#   add --cpu-offload if VRAM is tight
```

This exposes a WebSocket at `…:8998/api/chat` and a web UI at `:8998`.

**Make it reachable over `wss://` with a valid certificate.** Browsers only grant
microphone access on secure origins, and a page served over HTTPS can only open
`wss://` sockets (not `ws://`). Easiest path: put the GPU host behind a reverse
proxy / tunnel that terminates TLS with a real cert (Caddy, nginx, Cloudflare
Tunnel, ngrok, the cloud provider's HTTPS load balancer). The model server's own
`--ssl` uses a self-signed cert, which browsers reject for WebSockets — fine for
the bundled UI you click through, not for our client. Note the public URL, e.g.
`wss://my-gpu-host.example.com`.

Voices (`voices.tgz`) are pulled from HuggingFace automatically; override the
directory with `--voice-prompt-dir`.

---

## 2. speak server (`apps/server`)

Deploy the Next.js app to Vercel (recommended) or Railway. It's CPU-only.

**Vercel:** https://vercel.com/new → import `aurelius-meshugaim/altro` → set
**Root Directory** to `speak/apps/server` → **Deploy**.

**Environment variables** (both hosts):

| Variable | Example | Notes |
|---|---|---|
| `PERSONAPLEX_WS_URL` | `wss://my-gpu-host.example.com:8998` | Public WS base of the GPU server (required) |
| `PERSONAPLEX_VOICE` | `NATF0.pt` | Default voice embedding |
| `PERSONAPLEX_PERSONA` | `You are a wise and friendly teacher…` | Default role prompt |
| `PERSONAPLEX_VOICES` | `NATF0.pt,NATM0.pt,VARF0.pt` | Optional: voices shown in the picker |

**Smoke test:**

```bash
curl https://<your-app>/api/config
# → {"wsBase":"wss://my-gpu-host…","voices":[…],"defaultVoice":"NATF0.pt", …}
```

Then open the app, pick a voice/persona, and press **Start talking**.

---

## Local development

```bash
cp apps/server/.env.example apps/server/.env.local   # set PERSONAPLEX_WS_URL
npm run dev:server                                   # http://localhost:3001
```

`http://localhost` is treated as a secure origin by browsers, so mic access works
locally. For the WebSocket you can use a `wss://` tunnel to your GPU host, or a
`ws://` URL if you also serve the page over plain `http://localhost`.

---

## Clients

- **Web** (`apps/server`): the working full-duplex client. Mic in, voice out,
  real time.
- **Mobile** (`apps/mobile`, Expo): currently hands off to the web client. Native
  iOS full-duplex needs a dedicated Opus streaming module — next milestone.
- **Desktop** (`apps/desktop`, Electron): wraps the web build.

## Notes

- Full-duplex S2S is GPU-heavy and largely **one session per GPU** — plan
  capacity and expect an always-on GPU cost.
- The NVIDIA API key (`nvapi-…`) from the old ASR+LLM+TTS pipeline is **no longer
  used**. PersonaPlex authenticates to HuggingFace for weights instead.
