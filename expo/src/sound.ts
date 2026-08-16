/**
 * Soft local sounds for the diary page turn and simulated recordings.
 *
 * The swish is synthesized in code (a short filtered-noise burst with a
 * gentle fade), written once to app storage, then played with expo-av.
 * No bundled assets, no network, no mic access.
 */

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { soundEffectsEnabled } from "./theme-context";

const IS_WEB = Platform.OS === "web";
let swishUri: string | null = null;

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < bytes.length ? B64[b2 & 63] : "=";
  }
  return out;
}

/** Build a tiny mono 16-bit WAV (no Buffer — Hermes-safe), base64 encoded. */
function buildWav(seconds: number, toneHz: number, noise: boolean): string {
  const sampleRate = 22050;
  const n = Math.floor(sampleRate * seconds);
  const dataSize = n * 2;
  const bytes = new Uint8Array(44 + dataSize);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[off + i] = s.charCodeAt(i);
  };
  const writeU32 = (off: number, v: number) => {
    bytes[off] = v & 0xff;
    bytes[off + 1] = (v >> 8) & 0xff;
    bytes[off + 2] = (v >> 16) & 0xff;
    bytes[off + 3] = (v >> 24) & 0xff;
  };
  const writeU16 = (off: number, v: number) => {
    bytes[off] = v & 0xff;
    bytes[off + 1] = (v >> 8) & 0xff;
  };

  writeStr(0, "RIFF");
  writeU32(4, 36 + dataSize);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  writeU32(16, 16);
  writeU16(20, 1); // PCM
  writeU16(22, 1); // mono
  writeU32(24, sampleRate);
  writeU32(28, sampleRate * 2);
  writeU16(32, 2);
  writeU16(34, 16);
  writeStr(36, "data");
  writeU32(40, dataSize);

  let last = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 0.03) * Math.min(1, (seconds - t) / 0.08);
    let sample = 0;
    if (noise) {
      // soft pink-ish noise — the paper swish
      last = last * 0.8 + (Math.random() * 2 - 1) * 0.2;
      sample = last * 0.5;
    } else {
      sample = Math.sin(2 * Math.PI * toneHz * t) * 0.4 + Math.sin(2 * Math.PI * toneHz * 2 * t) * 0.15;
    }
    const v = Math.max(-1, Math.min(1, sample * envelope));
    writeU16(44 + i * 2, Math.round(v * 32767));
  }
  return toBase64(bytes);
}

async function ensureSwish(): Promise<string | null> {
  if (swishUri) return swishUri;
  // Web has no document directory — play straight from a data URI.
  if (IS_WEB) {
    swishUri = `data:audio/wav;base64,${buildWav(0.5, 0, true)}`;
    return swishUri;
  }
  try {
    const dir = `${FileSystem.documentDirectory ?? ""}venting/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const uri = `${dir}page-turn.wav`;
    const exists = await FileSystem.getInfoAsync(uri);
    if (!exists.exists) {
      const b64 = buildWav(0.5, 0, true);
      await FileSystem.writeAsStringAsync(uri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    swishUri = uri;
    return uri;
  } catch {
    return null;
  }
}

/** Soft paper swish for diary page turns. Returns true if a sound played. */
export async function playPageTurn(): Promise<boolean> {
  if (!soundEffectsEnabled()) return false;
  const uri = await ensureSwish();
  if (!uri) return false;
  try {
    const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 0.35 });
    await sound.setPositionAsync(0);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => undefined);
      }
    });
    return true;
  } catch {
    return false;
  }
}

/** Gentle chime for simulated recording previews. */
export async function playSoftChime(): Promise<boolean> {
  if (!soundEffectsEnabled()) return false;
  try {
    const uri = IS_WEB
      ? `data:audio/wav;base64,${buildWav(0.7, 523.25, false)}`
      : await ensureChimeFile();
    const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 0.4 });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => undefined);
      }
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureChimeFile(): Promise<string> {
  const dir = `${FileSystem.documentDirectory ?? ""}venting/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const uri = `${dir}chime.wav`;
  const exists = await FileSystem.getInfoAsync(uri);
  if (!exists.exists) {
    const b64 = buildWav(0.7, 523.25, false);
    await FileSystem.writeAsStringAsync(uri, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  return uri;
}
