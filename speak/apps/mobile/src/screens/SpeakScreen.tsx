import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SpeakClient, type ChatMessage } from "@speak/client";

import PttButton from "../components/PttButton";
import { SERVER_URL } from "../lib/config";
import { startRecording, playAudioBlob, type RecordingHandle } from "../lib/voice";

const client = new SpeakClient(SERVER_URL);

type Turn = { role: "user" | "assistant"; text: string };

export default function SpeakScreen() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [turns, setTurns] = useState<Turn[]>([]);
  const handleRef = useRef<RecordingHandle | null>(null);

  const onPressIn = useCallback(async () => {
    if (busy || recording) return;
    setStatus("Listening…");
    try {
      handleRef.current = await startRecording();
      setRecording(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, [busy, recording]);

  const onPressOut = useCallback(async () => {
    if (!recording || !handleRef.current) return;
    const handle = handleRef.current;
    handleRef.current = null;
    setRecording(false);
    setBusy(true);
    try {
      setStatus("Transcribing…");
      const audio = await handle.stop();
      const userText = (await client.asr(audio)).trim();
      if (!userText) {
        setStatus("Didn't catch that");
        return;
      }
      const userTurn: Turn = { role: "user", text: userText };
      setTurns((prev) => [...prev, userTurn]);

      setStatus("Thinking…");
      const history: ChatMessage[] = [...turns, userTurn].map((t) => ({ role: t.role, content: t.text }));
      const reply = (await client.chat(history)).trim();
      setTurns((prev) => [...prev, { role: "assistant", text: reply }]);

      setStatus("Speaking…");
      const speech = await client.tts(reply);
      await playAudioBlob(speech);

      setStatus("Ready");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [recording, turns]);

  // Electron global PTT hotkey (preload dispatches a "speak:ptt" CustomEvent).
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = () => {
      if (recording) onPressOut();
      else if (!busy) onPressIn();
    };
    window.addEventListener("speak:ptt", handler as EventListener);
    return () => window.removeEventListener("speak:ptt", handler as EventListener);
  }, [recording, busy, onPressIn, onPressOut]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>speak</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {turns.length === 0 ? (
          <Text style={styles.placeholder}>Hold the button (or spacebar) and start talking.</Text>
        ) : (
          turns.map((t, i) => (
            <View key={i} style={[styles.bubble, t.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={t.role === "user" ? styles.userText : styles.assistantText}>{t.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.buttonWrap}>
        <PttButton isRecording={recording} isBusy={busy} onPressIn={onPressIn} onPressOut={onPressOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e1014" },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  title: { color: "white", fontSize: 22, fontWeight: "700" },
  status: { color: "#9aa0b4", fontSize: 13, marginTop: 4 },
  transcript: { flex: 1 },
  transcriptContent: { padding: 24, gap: 10 },
  placeholder: { color: "#5a6080", fontSize: 14, textAlign: "center", marginTop: 40 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#5468ff" },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: "#1c2030" },
  userText: { color: "white", fontSize: 15 },
  assistantText: { color: "#e6e8f0", fontSize: 15 },
  buttonWrap: { alignItems: "center", paddingVertical: 28 },
});
