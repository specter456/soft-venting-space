/** Typed stack for the whole app. Everything stays inside the app — no links out. */

export type RootStackParamList = {
  Welcome: undefined;
  Checkin: undefined;
  Home: undefined;
  Record: { mode?: "voice" | "video" } | undefined;
  Notes: undefined;
  NoteEditor: { recordingId?: string; noteId?: string } | undefined;
  Create: undefined;
  Photos: undefined;
  Scribble: undefined;
  Stickers: undefined;
  GifStudio: { baseArt?: string; baseBg?: string; fromRecording?: string } | undefined;
  Vault: undefined;
  Calm: undefined;
  Diary: { attachRecording?: string } | undefined;
};

export type RouteName = keyof RootStackParamList;
