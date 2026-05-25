// PersonaPlex (Moshi) full-duplex speech-to-speech protocol.
//
// The server (NVIDIA PersonaPlex, `python -m moshi.server`) exposes a single
// WebSocket at `/api/chat`. After the connection opens the server sends a
// handshake; from then on both sides exchange tag-prefixed binary frames:
//
//   [0x00, version, model]  handshake
//   [0x01, ...opusBytes]    audio    (Opus, 24 kHz mono, both directions)
//   [0x02, ...utf8]         text     (server transcript / assistant text)
//   [0x03, action]          control
//   [0x04, ...utf8(json)]   metadata
//
// Persona is selected per-connection via the `text_prompt` (role text) and
// `voice_prompt` (a voice-embedding filename like "NATF0.pt") query params.

export type MessageType =
  | "handshake"
  | "audio"
  | "text"
  | "control"
  | "metadata"
  | "error"
  | "ping";

export type ControlAction = "start" | "endTurn" | "pause" | "restart";

const CONTROL_ACTIONS: Record<ControlAction, number> = {
  start: 0b00000000,
  endTurn: 0b00000001,
  pause: 0b00000010,
  restart: 0b00000011,
};

export type WSMessage =
  | { type: "handshake"; version: number; model: number }
  | { type: "audio"; data: Uint8Array }
  | { type: "text"; data: string }
  | { type: "control"; action: ControlAction }
  | { type: "metadata"; data: unknown }
  | { type: "error"; data: string }
  | { type: "ping" };

export function encodeMessage(message: WSMessage): Uint8Array {
  switch (message.type) {
    case "handshake":
      return new Uint8Array([0x00, message.version, message.model]);
    case "audio":
      return new Uint8Array([0x01, ...message.data]);
    case "text":
      return new Uint8Array([0x02, ...new TextEncoder().encode(message.data)]);
    case "control":
      return new Uint8Array([0x03, CONTROL_ACTIONS[message.action]]);
    case "metadata":
      return new Uint8Array([0x04, ...new TextEncoder().encode(JSON.stringify(message.data))]);
    case "error":
      return new Uint8Array([0x05, ...new TextEncoder().encode(message.data)]);
    case "ping":
      return new Uint8Array([0x06]);
  }
}

export function decodeMessage(data: Uint8Array): WSMessage {
  const type = data[0];
  const payload = data.subarray(1);
  switch (type) {
    case 0x00:
      return { type: "handshake", version: payload[0] ?? 0, model: payload[1] ?? 0 };
    case 0x01:
      return { type: "audio", data: payload };
    case 0x02:
      return { type: "text", data: new TextDecoder().decode(payload) };
    case 0x03: {
      const action = (Object.keys(CONTROL_ACTIONS) as ControlAction[]).find(
        (k) => CONTROL_ACTIONS[k] === payload[0],
      );
      if (!action) throw new Error(`Unknown control action ${payload[0]}`);
      return { type: "control", action };
    }
    case 0x04:
      return { type: "metadata", data: JSON.parse(new TextDecoder().decode(payload)) };
    case 0x05:
      return { type: "error", data: new TextDecoder().decode(payload) };
    case 0x06:
      return { type: "ping" };
    default:
      throw new Error(`Unknown message type ${type}`);
  }
}

// Sampling / persona defaults — mirror PersonaPlex's reference client so behavior
// matches the upstream web UI out of the box.
export const DEFAULTS = {
  textTemperature: 0.7,
  textTopk: 25,
  audioTemperature: 0.8,
  audioTopk: 250,
  padMult: 0,
  repetitionPenaltyContext: 64,
  repetitionPenalty: 1.0,
  textPrompt:
    "You are a wise and friendly teacher. Answer questions or provide advice in a clear and engaging way.",
  voicePrompt: "NATF0.pt",
} as const;

// Audio is always Opus at 24 kHz mono in both directions.
export const AUDIO_SAMPLE_RATE = 24000;

// The voice-embedding files PersonaPlex ships in voices.tgz. The authoritative
// list lives in the server's voice-prompt dir; this is the documented default
// set and can be overridden by the server's /api/config response.
export type Voice = { file: string; label: string };
export const VOICES: Voice[] = [
  { file: "NATF0.pt", label: "Natural · Female 1" },
  { file: "NATF1.pt", label: "Natural · Female 2" },
  { file: "NATF2.pt", label: "Natural · Female 3" },
  { file: "NATF3.pt", label: "Natural · Female 4" },
  { file: "NATM0.pt", label: "Natural · Male 1" },
  { file: "NATM1.pt", label: "Natural · Male 2" },
  { file: "NATM2.pt", label: "Natural · Male 3" },
  { file: "NATM3.pt", label: "Natural · Male 4" },
  { file: "VARF0.pt", label: "Variety · Female 1" },
  { file: "VARF1.pt", label: "Variety · Female 2" },
  { file: "VARF2.pt", label: "Variety · Female 3" },
  { file: "VARM0.pt", label: "Variety · Male 1" },
  { file: "VARM1.pt", label: "Variety · Male 2" },
  { file: "VARM2.pt", label: "Variety · Male 3" },
];

export type ChatUrlOptions = {
  // Base address of the PersonaPlex server, e.g. "wss://gpu-host:8998" or a bare
  // "host:port" (scheme is inferred from the page when omitted).
  wsBase: string;
  voicePrompt?: string;
  textPrompt?: string;
  textTemperature?: number;
  textTopk?: number;
  audioTemperature?: number;
  audioTopk?: number;
  padMult?: number;
  repetitionPenalty?: number;
  repetitionPenaltyContext?: number;
  textSeed?: number;
  audioSeed?: number;
};

function randomSeed(): number {
  return Math.round(1_000_000 * Math.random());
}

// Build the `/api/chat` WebSocket URL with PersonaPlex's exact query-param names.
export function buildChatUrl(opts: ChatUrlOptions): string {
  let base = opts.wsBase.trim();
  if (!/^wss?:\/\//.test(base)) {
    const scheme =
      typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    base = `${scheme}://${base.replace(/^https?:\/\//, "")}`;
  }
  const url = new URL(`${base.replace(/\/$/, "")}/api/chat`);
  const q = url.searchParams;
  q.set("text_temperature", String(opts.textTemperature ?? DEFAULTS.textTemperature));
  q.set("text_topk", String(opts.textTopk ?? DEFAULTS.textTopk));
  q.set("audio_temperature", String(opts.audioTemperature ?? DEFAULTS.audioTemperature));
  q.set("audio_topk", String(opts.audioTopk ?? DEFAULTS.audioTopk));
  q.set("pad_mult", String(opts.padMult ?? DEFAULTS.padMult));
  q.set("repetition_penalty", String(opts.repetitionPenalty ?? DEFAULTS.repetitionPenalty));
  q.set(
    "repetition_penalty_context",
    String(opts.repetitionPenaltyContext ?? DEFAULTS.repetitionPenaltyContext),
  );
  q.set("text_seed", String(opts.textSeed ?? randomSeed()));
  q.set("audio_seed", String(opts.audioSeed ?? randomSeed()));
  q.set("text_prompt", opts.textPrompt ?? DEFAULTS.textPrompt);
  q.set("voice_prompt", opts.voicePrompt ?? DEFAULTS.voicePrompt);
  return url.toString();
}

export type SpeakConfig = {
  // Public WebSocket base of the PersonaPlex GPU server.
  wsBase: string;
  voices: Voice[];
  defaultVoice: string;
  defaultPersona: string;
};
