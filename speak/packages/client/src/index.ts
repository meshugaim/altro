export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class SpeakClient {
  constructor(private baseUrl: string) {}

  async asr(audio: Blob, language?: string): Promise<string> {
    const form = new FormData();
    form.append("file", audio, "input.wav");
    if (language) form.append("language", language);
    const res = await fetch(`${this.baseUrl}/api/asr`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`asr: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { text: string };
    return json.text;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`chat: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { text: string };
    return json.text;
  }

  async tts(text: string, voice?: string, language?: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, language }),
    });
    if (!res.ok) throw new Error(`tts: ${res.status} ${await res.text()}`);
    return res.blob();
  }
}
