# Deploying speak

The server is a Next.js app, so **Vercel (Option V) is the simplest host** — it
deploys Next.js natively. Railway (Options A/B) also works if you prefer it.

Pick one. Don't do several.

---

## Option V — Vercel (Recommended for the Next.js server)

**One-time setup (~2 min in the browser).**

1. Go to https://vercel.com/new and log in with GitHub.
2. **Import** the `aurelius-meshugaim/altro` repo. Authorize Vercel on it if asked.
3. On the configure screen:
   - **Root Directory**: click **Edit** → set to `speak/apps/server`
   - **Branch**: switch to `claude/altro-speak-voice-app-QdWI6`
     (until it's merged to `main`)
   - Framework preset auto-detects **Next.js** (the `vercel.json` confirms it).
4. **Environment Variables** → add `NVIDIA_API_KEY` = `nvapi-...`
5. Click **Deploy**. You get a `https://<project>.vercel.app` URL automatically —
   no separate "generate domain" step.

Every push to the branch redeploys. Preview URLs are created per-branch.

**Smoke test:**

```bash
curl https://<project>.vercel.app/
curl -X POST https://<project>.vercel.app/api/chat \
  -H "Content-Type: application/json" -d '{"text":"hello"}'
```

> Note: Vercel serverless functions cap request bodies at ~4.5 MB and runtime at
> 10 s (Hobby). Fine for short push-to-talk clips and chat. Long audio would need
> Pro or a different ASR path.

---

## Option A — GitHub Actions → Railway (Recommended)

**One-time setup (~3 min on phone).**

### 1. Create the Railway project

- Go to https://railway.com/new → **Empty Project**.
- Inside the project, click **+ Create** → **Empty Service**.
- Rename the service to exactly **`speak`** (the workflow targets this name).

### 2. Add the NVIDIA key as a Railway variable

- Open the `speak` service → **Variables** tab → **+ New Variable**.
- Name: `NVIDIA_API_KEY`
- Value: `nvapi-...` (get one at https://build.nvidia.com → top-right → Get API Key)

### 3. Add a Railway project token to GitHub

- In Railway: project **Settings** → **Tokens** → **Create Token**.
  - Name: `github-actions`. Copy the token.
- In GitHub: https://github.com/aurelius-meshugaim/altro/settings/secrets/actions → **New repository secret**.
  - Name: `RAILWAY_TOKEN`
  - Value: paste the token.

### 4. Generate the public URL

- Railway → `speak` service → **Settings** → **Networking** → **Generate Domain**.
- Note the URL (looks like `speak-production-xxxx.up.railway.app`).

### 5. Trigger the first deploy

- GitHub: **Actions** tab → **Deploy speak server** → **Run workflow** → pick the feature branch.
- Or just push any change to `speak/apps/server/**` — it auto-triggers.

After ~2 min the workflow turns green and the URL serves the speak status page.

**Smoke test:**

```bash
curl https://<your-url>/
# → HTML showing "NVIDIA_API_KEY: configured"

curl -X POST https://<your-url>/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"hello"}'
# → {"text":"Hi there! How can I help?"}
```

---

## Option B — Railway's built-in GitHub auto-deploy

No workflow file needed. Railway watches the repo directly.

1. https://railway.com/new → **Deploy from GitHub repo** → pick `aurelius-meshugaim/altro`.
2. In the service **Settings**:
   - **Source → Branch**: `claude/altro-speak-voice-app-QdWI6` (or `main` after merge)
   - **Source → Root Directory**: `speak/apps/server`
   - **Networking** → **Generate Domain**
3. **Variables** tab → add `NVIDIA_API_KEY`.
4. **Deployments** tab — it auto-runs on every push.

If you go this route, delete `.github/workflows/deploy-server.yml` so you don't
have two deploy paths fighting.

---

## After deploy: wire the clients

Once the server URL exists, paste it back to me and I'll:

1. Update `apps/mobile/app.json` `extra.speakServerUrl` to point at it.
2. Add `EXPO_PUBLIC_SPEAK_SERVER_URL` defaults so `expo export` bakes it in.
3. Optional: deploy the Expo web build to GitHub Pages (a second workflow I'll
   add when we know the server URL).

## Voice loop (the GPU gap)

Reminder: the `/api/chat` route works on Railway against NVIDIA's hosted LLM
endpoint, but `/api/asr` and `/api/tts` need GPU-hosted NIM containers
(Riva ASR + Magpie TTS) that Railway can't run. Three ways to close that:

- Self-host NIM on Brev / Lambda / RunPod / your own GPU box, then set
  `NVIDIA_ASR_URL` / `NVIDIA_TTS_URL` in Railway Variables.
- Use NVIDIA's per-model hosted URLs from build.nvidia.com (copy them off the
  "Deploy" tab on each model card).
- Swap ASR/TTS to Deepgram + ElevenLabs (~30 min of code changes).
