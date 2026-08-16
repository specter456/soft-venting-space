# Venting 💜

A soft, cute, calming emotional-wellness app — a tiny safe room inside a phone.
Express feelings privately through voice vents, video expressions, notes,
photos, scribbles, stickers, GIFs, calming games, and a customizable diary.

**Privacy is the product.** There is no account, no cloud, no social feed, no
sharing, no ads, no tracking, no analytics. All content stays on the device.

This repo contains **two projects**:

| Project | Stack | Storage | Location |
|---|---|---|---|
| **Web app** (this workspace preview) | React + TypeScript + Vite, mobile-first phone-frame UI | IndexedDB (fully local) | `src/` |
| **Hybrid app** (native + PWA) | React Native + Expo + TypeScript, one codebase | expo-sqlite + expo-file-system (fully local) | `expo/` |

The **hybrid app** in `expo/` is the single codebase that runs as a native
iOS/Android app **and** as an installable PWA (manifest, service worker,
offline, add-to-home-screen). It includes the bottom taskbar (Home · Record ·
Create · Calm · Diary), the Settings screen (profile, security, appearance,
install), and the upgraded Home. See `expo/README.md` for full run
instructions.

## Web app

```bash
bun install
bun run dev        # platform-managed dev server
```

- Entry (`/`): pastel landing → "Enter Venting" leads in-app to the app
  (no external tabs, no new windows).
- Entry screen: optional email (validated) or guest — both stored only on-device.
- Welcome check-in: multi-select day checklist + "What would you like to do
  now?" (Record / Create / Calm / Diary) + Skip.
- Home: 8-mood check-in (one per day) + four large cards — Record, Create,
  Calm, Diary.
- **Record** — Recording Box with Voice | Video toggle, mood tags, post-actions
  (Save privately / Reflect in Notes / Attach to Diary / Doodle on it / Make
  GIF / Delete). Video uses soft illustrated avatars, never a real face.
- **Notes** — private reflection journal with optional audio/video/photo
  attachment chips; notes and recordings each stand alone.
- **Create** — Photos, Scribble canvas, Sticker studio, GIF Studio, and the
  double-locked Private Vault.
- **Calm** — breathing bubbles, poppable worry bubbles, dandelion wishes.
- **Diary** — customizable cover, 3D page-turn animation with a soft swish,
  weather icons, stickers, and optional recording attachments.
- **Lock** — 4-digit passcode (salted SHA-256, never stored raw), active
  Face ID / fingerprint unlock, and a second passcode lock on the Vault.

### Local storage (`src/lib/db.ts`)

IndexedDB database `venting-local` with stores for notes, recordings, diary
entries, vault items, mood check-ins, and the lock key-value pair. A small
in-memory cache + subscription bus powers the reactive `useTable` hooks.
No network calls anywhere.

```bash
bun tsc -b --noEmit   # typecheck
bun run lint          # eslint
```

## Hybrid app (`expo/`) — native + PWA from one codebase

React Native + Expo + TypeScript with expo-av (voice/video), expo-camera
(private front camera), expo-file-system + expo-sqlite (local storage),
expo-local-authentication (Face ID / fingerprint), react-native-svg
(scribble), react-navigation, and a 3D diary page-turn. The same screens build
to native apps and to an offline-capable PWA.

```bash
cd expo
bun install
bun run start        # native: i / a for simulators, or scan with Expo Go
bun run web          # web: PWA dev server
bun run build:web    # web: production PWA → dist/ (manifest, sw.js, icons)
bun run typecheck    # strict TS check
```

Full details, architecture, and honest scope notes: **`expo/README.md`**.
