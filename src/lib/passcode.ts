/**
 * Passcode hashing helpers. The raw passcode is never stored anywhere —
 * we keep a per-user random salt plus a SHA-256 digest of `salt:passcode`.
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Secure hashing isn't available in this browser.");
  }
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPasscode(
  passcode: string,
  salt: string,
): Promise<string> {
  return sha256Hex(`${salt}:${passcode}`);
}
