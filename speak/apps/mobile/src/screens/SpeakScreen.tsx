import { useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SpeakConfig } from "@speak/client";

import { SERVER_URL } from "../lib/config";

// PersonaPlex is a full-duplex, browser-based streaming client (mic + speaker
// over a WebSocket). The working real-time experience lives in the web client
// served by the speak server. Native (iOS) streaming needs a dedicated Opus
// audio module and is the next milestone — for now we hand off to the browser.
export default function SpeakScreen() {
  const [config, setConfig] = useState<SpeakConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const open = () => {
    if (Platform.OS === "web") window.location.assign(SERVER_URL);
    else Linking.openURL(SERVER_URL);
  };

  const ready = Boolean(config?.wsBase);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>speak</Text>
        <Text style={styles.subtitle}>full-duplex voice · powered by PersonaPlex</Text>
      </View>

      <View style={styles.body}>
        {error ? (
          <Text style={styles.error}>config: {error}</Text>
        ) : !config ? (
          <Text style={styles.muted}>Loading config…</Text>
        ) : ready ? (
          <>
            <Text style={styles.muted}>Voice: {config.defaultVoice}</Text>
            <Text style={styles.persona} numberOfLines={4}>
              {config.defaultPersona}
            </Text>
            <Text style={styles.note}>
              Real-time conversation runs in the browser. Tap below to open the voice client.
            </Text>
          </>
        ) : (
          <Text style={styles.error}>
            Server not configured. Set PERSONAPLEX_WS_URL on the speak server.
          </Text>
        )}
      </View>

      <View style={styles.buttonWrap}>
        <TouchableOpacity style={[styles.button, !ready && styles.buttonDisabled]} onPress={open} disabled={!ready}>
          <Text style={styles.buttonText}>Open voice chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e1014" },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { color: "white", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#9aa0b4", fontSize: 13, marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 12 },
  muted: { color: "#9aa0b4", fontSize: 14 },
  persona: { color: "#e6e8f0", fontSize: 15, lineHeight: 21 },
  note: { color: "#5a6080", fontSize: 13, marginTop: 8 },
  error: { color: "#ff7a90", fontSize: 14 },
  buttonWrap: { alignItems: "center", paddingVertical: 28 },
  button: { backgroundColor: "#5468ff", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  buttonDisabled: { backgroundColor: "#3a3f55" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
