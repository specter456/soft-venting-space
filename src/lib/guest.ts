/**
 * Guest mode removed. Every user now creates a private space with
 * a username/email + hashed passcode. Data persists on-device for all users.
 *
 * This module is kept as a no-op for backwards compatibility — existing
 * callers of isGuest() will always get false.
 */

export function isGuest(): boolean {
  return false;
}

/** No-op — kept so existing call sites don't break. */
export function setGuest(): void {
  // no-op
}
