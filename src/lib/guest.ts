/**
 * Guest mode — in-memory flag.
 *
 * When a user enters as guest, all storage writes are skipped. Every time
 * they open the app they see the full fresh flow: splash → login →
 * welcome → check-in → home. No data persists between sessions.
 */

let _guest = false;

export function isGuest(): boolean {
  return _guest;
}

export function setGuest(): void {
  _guest = true;
}
