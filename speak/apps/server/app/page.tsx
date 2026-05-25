"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildChatUrl,
  decodeMessage,
  encodeMessage,
  AUDIO_SAMPLE_RATE,
  type SpeakConfig,
  type WSMessage,
} from "@speak/client";

type Line = { role: "you" | "assistant"; text: string };

export default function Home() {
  const [config, setConfig] = useState<SpeakConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [voice, setVoice] = useState<string>("");
  const [persona, setPersona] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Loading…");
  const [lines, setLines] = useState<Line[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const decoderRef = useRef<Worker | null>(null);
  const recorderRef = useRef<{ stop: () => void } | null>(null);
  const assistantLineRef = useRef<boolean>(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: SpeakConfig) => {
        setConfig(cfg);
        setVoice(cfg.defaultVoice);
        setPersona(cfg.defaultPersona);
        setStatus(cfg.wsBase ? "Ready" : "Server not configured (set PERSONAPLEX_WS_URL)");
      })
      .catch((e) => setConfigError(e instanceof Error ? e.message : String(e)));
  }, []);

  const teardown = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    decoderRef.current?.terminate();
    decoderRef.current = null;
    workletRef.current?.disconnect();
    workletRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    assistantLineRef.current = false;
    setConnected(false);
    setConnecting(false);
  }, []);

  const appendText = useCallback((chunk: string) => {
    if (!chunk) return;
    setLines((prev) => {
      const next = [...prev];
      if (assistantLineRef.current && next.length && next[next.length - 1].role === "assistant") {
        next[next.length - 1] = {
          role: "assistant",
          text: next[next.length - 1].text + chunk,
        };
      } else {
        next.push({ role: "assistant", text: chunk });
        assistantLineRef.current = true;
      }
      return next;
    });
  }, []);

  const onMessage = useCallback(
    (msg: WSMessage) => {
      if (msg.type === "audio") {
        const pages = new Uint8Array(msg.data);
        decoderRef.current?.postMessage({ command: "decode", pages }, [pages.buffer]);
      } else if (msg.type === "text") {
        appendText(msg.data);
      } else if (msg.type === "error") {
        setStatus(`server: ${msg.data}`);
      }
    },
    [appendText],
  );

  const connect = useCallback(async () => {
    if (!config?.wsBase || connecting || connected) return;
    setConnecting(true);
    setStatus("Connecting…");
    try {
      // Audio graph (must be created from this user gesture so it can play).
      const ctx = new AudioContext();
      await ctx.resume();
      await ctx.audioWorklet.addModule("/audio-processor.js");
      const worklet = new AudioWorkletNode(ctx, "moshi-processor");
      worklet.connect(ctx.destination);
      audioCtxRef.current = ctx;
      workletRef.current = worklet;

      // Opus decoder for the assistant's audio → Float32 frames → playback worklet.
      const decoder = new Worker("/decoderWorker.min.js");
      decoder.onmessage = (e: MessageEvent) => {
        if (!e.data) return; // null = end-of-stream marker
        worklet.port.postMessage({ frame: e.data[0], type: "audio", micDuration: 0 });
      };
      decoder.postMessage({
        command: "init",
        bufferLength: Math.round((960 * ctx.sampleRate) / AUDIO_SAMPLE_RATE),
        decoderSampleRate: AUDIO_SAMPLE_RATE,
        outputBufferSampleRate: ctx.sampleRate,
        resampleQuality: 0,
      });
      decoderRef.current = decoder;

      const url = buildChatUrl({ wsBase: config.wsBase, voicePrompt: voice, textPrompt: persona });
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onmessage = async (e) => {
        const msg = decodeMessage(new Uint8Array(e.data as ArrayBuffer));
        if (msg.type === "handshake") {
          setConnected(true);
          setConnecting(false);
          setStatus("Listening — just talk");
          await startMic(ws, ctx);
          return;
        }
        onMessage(msg);
      };
      ws.onerror = () => setStatus("connection error");
      ws.onclose = () => {
        setStatus("Disconnected");
        teardown();
      };
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
      teardown();
    }
  }, [config, voice, persona, connecting, connected, onMessage, teardown]);

  const startMic = useCallback(async (ws: WebSocket, ctx: AudioContext) => {
    // opus-recorder owns mic capture and emits 20 ms Opus pages (24 kHz mono),
    // each sent as an audio frame. Loaded dynamically to avoid SSR touching
    // browser globals.
    const mod = await import("opus-recorder");
    const Recorder = (mod.default ?? mod) as unknown as new (opts: unknown) => {
      ondataavailable: (data: Uint8Array) => void;
      start: () => void;
      stop: () => void;
    };
    const recorder = new Recorder({
      encoderPath: "/encoderWorker.min.js",
      bufferLength: Math.round((960 * ctx.sampleRate) / AUDIO_SAMPLE_RATE),
      encoderFrameSize: 20,
      encoderSampleRate: AUDIO_SAMPLE_RATE,
      maxFramesPerPage: 2,
      numberOfChannels: 1,
      recordingGain: 1,
      resampleQuality: 3,
      encoderComplexity: 0,
      encoderApplication: 2049,
      streamPages: true,
    });
    recorder.ondataavailable = (data: Uint8Array) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(encodeMessage({ type: "audio", data }));
    };
    recorder.start();
    recorderRef.current = recorder;
  }, []);

  const toggle = useCallback(() => {
    if (connected || connecting) teardown();
    else connect();
  }, [connected, connecting, connect, teardown]);

  useEffect(() => () => teardown(), [teardown]);

  const ready = Boolean(config?.wsBase);
  const btnBg = connected ? "#e0245e" : connecting ? "#7280a8" : ready ? "#5468ff" : "#3a3f55";
  const btnLabel = connected ? "End" : connecting ? "…" : "Start talking";

  return (
    <div style={s.root}>
      <header style={s.header}>
        <h1 style={s.title}>speak</h1>
        <p style={s.status}>{configError ? `config: ${configError}` : status}</p>
      </header>

      <div style={s.controls}>
        <label style={s.field}>
          <span style={s.fieldLabel}>Voice</span>
          <select
            style={s.select}
            value={voice}
            disabled={connected || connecting || !ready}
            onChange={(e) => setVoice(e.target.value)}
          >
            {config?.voices.map((v) => (
              <option key={v.file} value={v.file}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Persona</span>
          <textarea
            style={s.textarea}
            value={persona}
            disabled={connected || connecting || !ready}
            onChange={(e) => setPersona(e.target.value)}
            rows={2}
          />
        </label>
      </div>

      <div style={s.transcript}>
        {lines.length === 0 ? (
          <p style={s.placeholder}>
            {ready
              ? "Press Start and just talk — PersonaPlex replies in real time."
              : "Set PERSONAPLEX_WS_URL on the server to point at your GPU host."}
          </p>
        ) : (
          lines.map((l, i) => (
            <div
              key={i}
              style={{
                ...s.bubble,
                alignSelf: l.role === "you" ? "flex-end" : "flex-start",
                background: l.role === "you" ? "#5468ff" : "#1c2030",
                color: l.role === "you" ? "white" : "#e6e8f0",
              }}
            >
              {l.text}
            </div>
          ))
        )}
      </div>

      <div style={s.buttonWrap}>
        <button onClick={toggle} disabled={!ready && !connected} style={{ ...s.button, background: btnBg }}>
          <span style={s.dot}>●</span>
          <span style={s.label}>{btnLabel}</span>
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#0e1014", color: "white", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" },
  header: { padding: "16px 24px 8px" },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  status: { margin: "4px 0 0", color: "#9aa0b4", fontSize: 13 },
  controls: { padding: "8px 24px", display: "flex", gap: 16, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: "1 1 220px" },
  fieldLabel: { color: "#9aa0b4", fontSize: 12 },
  select: { background: "#1c2030", color: "white", border: "1px solid #2a3040", borderRadius: 8, padding: "8px 10px", fontSize: 14 },
  textarea: { background: "#1c2030", color: "white", border: "1px solid #2a3040", borderRadius: 8, padding: "8px 10px", fontSize: 13, resize: "vertical", fontFamily: "inherit" },
  transcript: { flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" },
  placeholder: { color: "#5a6080", fontSize: 14, textAlign: "center", marginTop: 40 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14, fontSize: 15, lineHeight: 1.4, whiteSpace: "pre-wrap" },
  buttonWrap: { display: "flex", justifyContent: "center", padding: "24px 0" },
  button: { width: 220, height: 220, borderRadius: 110, border: "none", color: "white", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, userSelect: "none" },
  dot: { fontSize: 30 },
  label: { fontSize: 18, fontWeight: 600 },
};
