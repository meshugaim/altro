// Native (iOS/Android) recording + playback via expo-av.
// Records 16-bit linear PCM WAV — directly accepted by Riva ASR.

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export type RecordingHandle = { stop: () => Promise<Blob> };

const WAV_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: ".wav",
    audioQuality: Audio.IOSAudioQuality.HIGH,
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    // Unused on native; see voice.web.ts for the web implementation.
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};

export async function startRecording(): Promise<RecordingHandle> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error("Microphone permission denied");

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(WAV_RECORDING_OPTIONS);
  await recording.startAsync();

  return {
    async stop() {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("Recording produced no file");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: "audio/wav" });
    },
  };
}

export async function playAudioBlob(blob: Blob): Promise<void> {
  const reader = new FileReader();
  const dataUri: string = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const { sound } = await Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true });
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
  });
}
