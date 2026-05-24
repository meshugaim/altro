import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveServerUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { speakServerUrl?: string } | undefined)?.speakServerUrl;
  const fromEnv = (process.env.EXPO_PUBLIC_SPEAK_SERVER_URL as string | undefined) ?? undefined;
  const base = fromEnv || fromExtra || "http://localhost:3001";

  // On Android emulator, localhost refers to the device itself, not the host.
  if (Platform.OS === "android" && base.includes("localhost")) {
    return base.replace("localhost", "10.0.2.2");
  }
  return base;
}

export const SERVER_URL = resolveServerUrl();
