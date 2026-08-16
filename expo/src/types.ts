/** Shared domain types — mirrors the web app's local model. */

export type AttachmentKind = "audio" | "video" | "photo";

export interface Attachment {
  kind: AttachmentKind;
  label: string;
  duration?: number;
  /** Emoji used for the soft tile when there is no real file. */
  art: string;
  /** Local file uri (expo-file-system) when real media exists. */
  fileUri?: string;
}

export type RecordingKind = "voice" | "video";

export interface Recording {
  id: string;
  kind: RecordingKind;
  mood?: string;
  /** Seconds. */
  duration: number;
  /** Local audio/video file uri, when real capture was possible. */
  fileUri?: string;
  /** Illustrated avatar for video vents (never a real face). */
  avatar?: string;
  noteId?: string;
  diaryId?: string;
  at: number;
}

export interface Note {
  id: string;
  body: string;
  mood?: string;
  attachments: Attachment[];
  at: number;
}

export interface DiaryEntry {
  id: string;
  title: string;
  body: string;
  mood?: string;
  weather: string;
  stickers: string[];
  attachments: Attachment[];
  at: number;
}

export interface GifStamp {
  emoji: string;
  x: number; // 0..1 relative to frame
  y: number;
  size: number;
}

export interface GifFrame {
  stamps: GifStamp[];
  text?: string;
}

export type VaultKind = "photo" | "video" | "gif" | "doodle" | "sticker";

export interface VaultItem {
  id: string;
  kind: VaultKind;
  /** Emoji used as the polaroid art. */
  art: string;
  /** Pastel tile background key. */
  bg: string;
  caption?: string;
  fileUri?: string;
  frames?: GifFrame[];
  /** JSON payload for doodles/stickers (strokes, sticker config). */
  data?: string;
  at: number;
}

export interface MoodCheckin {
  dateKey: string; // YYYY-MM-DD, one per day
  mood: string;
  intensity: number; // 1..5
  note?: string;
  at: number;
}

export interface KVPair {
  key: string;
  value: string;
}

export type TableName =
  | "notes"
  | "recordings"
  | "diaryEntries"
  | "vaultItems"
  | "moodCheckins"
  | "kv";
