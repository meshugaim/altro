// Server-side PersonaPlex configuration, derived from environment variables.
// The browser connects directly to the PersonaPlex GPU server's WebSocket, so
// the server's only job is to hand the client a config (which host, which voice,
// which persona) without baking the GPU URL into the static bundle.

import { VOICES, DEFAULTS, type SpeakConfig, type Voice } from "@speak/client";

// Public WebSocket base of the PersonaPlex server (the GPU host running
// `python -m moshi.server`). Example: wss://my-gpu-host:8998
export const PERSONAPLEX_WS_URL = process.env.PERSONAPLEX_WS_URL ?? "";

const DEFAULT_VOICE = process.env.PERSONAPLEX_VOICE ?? DEFAULTS.voicePrompt;
const DEFAULT_PERSONA = process.env.PERSONAPLEX_PERSONA ?? DEFAULTS.textPrompt;

function resolveVoices(): Voice[] {
  const raw = process.env.PERSONAPLEX_VOICES;
  if (!raw) return VOICES;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((file) => {
      const known = VOICES.find((v) => v.file === file);
      return known ?? { file, label: file.replace(/\.pt$/, "") };
    });
}

export function getConfig(): SpeakConfig {
  return {
    wsBase: PERSONAPLEX_WS_URL,
    voices: resolveVoices(),
    defaultVoice: DEFAULT_VOICE,
    defaultPersona: DEFAULT_PERSONA,
  };
}

export function isConfigured(): boolean {
  return PERSONAPLEX_WS_URL.length > 0;
}
