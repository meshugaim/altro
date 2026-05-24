import { useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  isRecording: boolean;
  isBusy: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
};

export default function PttButton({ isRecording, isBusy, onPressIn, onPressOut }: Props) {
  const downRef = useRef(false);

  // Spacebar PTT on web/desktop.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || downRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      e.preventDefault();
      downRef.current = true;
      onPressIn();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !downRef.current) return;
      e.preventDefault();
      downRef.current = false;
      onPressOut();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onPressIn, onPressOut]);

  const label = isBusy ? "…" : isRecording ? "Listening" : "Hold to speak";
  const bg = isBusy ? "#7280a8" : isRecording ? "#e0245e" : "#5468ff";

  return (
    <Pressable
      onPressIn={!isBusy ? onPressIn : undefined}
      onPressOut={!isBusy ? onPressOut : undefined}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={styles.inner}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.label}>{label}</Text>
        {Platform.OS === "web" ? <Text style={styles.hint}>or hold space</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  inner: { alignItems: "center", gap: 8 },
  dot: { color: "white", fontSize: 32 },
  label: { color: "white", fontSize: 18, fontWeight: "600" },
  hint: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
});
