/**
 * Lock auth — fully on-device.
 *
 * The passcode is never stored: we keep a per-device random salt plus a
 * SHA-256 digest of salt+code in the local sqlite kv store. Face ID /
 * fingerprint go through expo-local-authentication, which never exposes
 * biometric data to the app — the OS handles it entirely on-device.
 */

import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { getPasscodeLocally, hasPasscodeLocally, setKv, deleteKv } from "./db";
import { KV_PASSCODE_HASH, KV_PASSCODE_SALT } from "./db";

function randomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hash(code: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${code}`);
}

/** Save a new passcode (only ever the salted hash). */
export async function setPasscode(code: string): Promise<void> {
  const salt = randomSalt();
  const digest = await hash(code, salt);
  await setKv(KV_PASSCODE_SALT, salt);
  await setKv(KV_PASSCODE_HASH, digest);
}

export async function clearPasscode(): Promise<void> {
  await deleteKv(KV_PASSCODE_HASH);
  await deleteKv(KV_PASSCODE_SALT);
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const stored = getPasscodeLocally();
  if (!stored) return false;
  const digest = await hash(code, stored.salt);
  return digest === stored.hash;
}

export const lockConfigured = (): boolean => hasPasscodeLocally();

/* ─── Biometrics ───────────────────────────────────────────────────── */

export interface BiometricStatus {
  supported: boolean;
  enrolled: boolean;
  type: "face" | "fingerprint" | null;
}

export async function biometricStatus(): Promise<BiometricStatus> {
  try {
    const supported = await LocalAuthentication.hasHardwareAsync();
    if (!supported) {
      return { supported: false, enrolled: false, type: null };
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const type = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? "face"
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? "fingerprint"
        : null;
    return { supported, enrolled, type };
  } catch {
    return { supported: false, enrolled: false, type: null };
  }
}

/** Ask the OS to verify the user's face/fingerprint. True on success. */
export async function authenticateBiometric(): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock your feelings",
      cancelLabel: "Use passcode",
      fallbackLabel: "Use passcode",
      disableDeviceFallback: true,
    });
    return res.success;
  } catch {
    return false;
  }
}
