// NVIDIA NIM client: ASR (Riva/Parakeet), Chat (OpenAI-compatible), TTS (Magpie).
// Endpoint shapes mirror the self-hosted NIM containers; the same paths are served
// by NVIDIA's hosted cloud at https://ai.api.nvidia.com.

const API_KEY = process.env.NVIDIA_API_KEY ?? "";
const LLM_URL = process.env.NVIDIA_LLM_URL ?? "https://integrate.api.nvidia.com/v1";
const ASR_URL = process.env.NVIDIA_ASR_URL ?? "http://localhost:9000";
const TTS_URL = process.env.NVIDIA_TTS_URL ?? "http://localhost:9001";

const LLM_MODEL = process.env.NVIDIA_LLM_MODEL ?? "meta/llama-3.3-70b-instruct";
const TTS_VOICE = process.env.NVIDIA_TTS_VOICE ?? "Magpie-Multilingual.EN-US.Aria";
const ASR_LANGUAGE = process.env.NVIDIA_ASR_LANGUAGE ?? "en-US";
const TTS_LANGUAGE = process.env.NVIDIA_TTS_LANGUAGE ?? "en-US";

function authHeaders(extra: Record<string, string> = {}) {
  if (!API_KEY) throw new Error("NVIDIA_API_KEY is not set");
  return { Authorization: `Bearer ${API_KEY}`, ...extra };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function transcribe(audio: Blob, language = ASR_LANGUAGE): Promise<string> {
  const form = new FormData();
  form.append("language", language);
  form.append("file", audio, "input.wav");

  const res = await fetch(`${ASR_URL}/v1/audio/transcriptions`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    throw new Error(`ASR ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { text?: string; transcript?: string };
  return data.text ?? data.transcript ?? "";
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  // LLM_URL already includes the /v1 segment (per OpenAI-compat convention).
  const res = await fetch(`${LLM_URL}/chat/completions`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 256,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function synthesize(text: string, voice = TTS_VOICE, language = TTS_LANGUAGE): Promise<ArrayBuffer> {
  const form = new FormData();
  form.append("language", language);
  form.append("text", text);
  form.append("voice", voice);

  const res = await fetch(`${TTS_URL}/v1/audio/synthesize`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    throw new Error(`TTS ${res.status}: ${await res.text()}`);
  }
  return res.arrayBuffer();
}
