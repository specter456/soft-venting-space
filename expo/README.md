# Venting — native app (React Native + Expo + TypeScript)

The standalone **native** version of Venting, ported screen-for-screen from the
web app at the repo root. Same pastel claymorphism design, same privacy model —
**everything stays on the device**. No accounts, no cloud, no ads, no tracking,
no analytics, no network calls for user content.

```
expo/
├── App.tsx                    # root: sqlite hydrate → lock gate → navigation
├── app.json                   # Expo config, camera/mic/Face ID permissions
├── package.json               # expo-av, expo-camera, expo-sqlite, expo-file-system,
│                              # expo-local-authentication, react-navigation
└── src/
    ├── theme.ts               # pastel clay design system (colors, radii, clay shadows)
    ├── types.ts               # shared domain types
    ├── data.ts                # moods, cute art, stickers, worries, diary stickers
    ├── db.ts                  # expo-sqlite schema + CRUD + expo-file-system file store
    ├── auth.ts                # salted SHA-256 passcode (expo-crypto) + Face ID/fingerprint
    ├── sound.ts               # runtime-synthesized page-turn swish (expo-av, no assets)
    ├── lock-context.ts        # app-lock state shared across screens
    ├── nav.ts                 # typed react-navigation stack
    ├── components/
    │   ├── Clay.tsx           # ClayCard / ClayButton / ClayChip / MoodBubble
    │   ├── Screen.tsx         # soft screen wrapper with back header
    │   ├── LockPad.tsx        # 4-digit soft number pad with shake feedback
    │   ├── MoodChips.tsx      # mood tag rows
    │   └── AttachmentChip.tsx # audio waveform chip, video/photo thumbnails
    └── screens/
        ├── Welcome.tsx        # entry: optional email (validated) or guest
        ├── WelcomeCheckin.tsx # day checklist + "what now" actions + skip
        ├── Home.tsx           # mood check-in + 4 cards: Record · Create · Calm · Diary
        ├── Record.tsx         # Recording Box: Voice | Video
        ├── Notes.tsx          # reflection journal
        ├── NoteEditor.tsx     # write + optional attachments
        ├── Create.tsx         # Photos · Scribble · Stickers · GIF Studio + Vault
        ├── Photos.tsx         # device photos or pastel scenes → vault
        ├── Scribble.tsx       # canvas: pencil/crayon/brush/marker/eraser (react-native-svg)
        ├── Stickers.tsx       # expressions, eyes, mouths, blush, tears, accessories
        ├── GifStudio.tsx      # stamps + text + multi-frame loop preview
        ├── Vault.tsx          # double-locked gallery (passcode + Face ID/fingerprint)
        ├── Calm.tsx           # breathing bubbles, worry pops, dandelion wishes
        └── Diary.tsx          # customizable cover, 3D page-turn + soft swish, entries
```

## Install & run

```bash
cd expo
bun install        # or: npm install / yarn
bun run start      # Expo Dev Server → press i / a for iOS/Android simulators
# or scan the QR code with Expo Go
```

> The web app at the repo root is a separate project — this folder is fully
> independent (own `package.json`, own lockfile, own toolchain).

## Privacy model

- **expo-sqlite** (`venting.db`) holds structured data: notes, recordings,
  diary pages, vault items, mood check-ins, and the passcode lock.
- **expo-file-system** stores binary files (voice notes, video vents, picked
  photos, GIF frames) under the app's private `documentDirectory/venting/`.
- **Passcode**: never stored. A per-device random salt plus a SHA-256 digest
  (expo-crypto) live in sqlite. Verification happens on-device only.
- **Face ID / fingerprint** (expo-local-authentication): the OS verifies
  locally; the app never sees biometric data.
- **Double lock**: the app opens with the passcode gate; the Private Vault
  asks for the passcode (or biometrics) again before showing anything.
- No `fetch`, no sockets, no analytics SDKs, no ad SDKs, no social features.

## Real recording

- **Voice** uses `expo-av` `Audio.Recording` (needs mic permission — declared
  in `app.json`). If the mic is unavailable (web preview / simulator), the app
  gracefully simulates: timer, waveform, metadata — so the flow still works.
- **Video** uses `expo-camera` `CameraView` (front camera, kept on-device).
  The default is an **illustrated avatar** mode — a private emotional mirror
  with cute characters, never a real identifiable face. Camera mode is opt-in.
- Simulated recordings play a local synthesized chime instead of real audio.

## Honest scope notes

- GIF Studio saves animated frames privately and plays them with a looping
  preview. Encoding to a true `.gif` file is a straightforward addition
  (e.g. `expo-media-library` + an encoder) if you want shareable files later.
- The page-turn sound is synthesized at runtime (a soft pink-noise swish) so
  the project ships with zero binary assets; drop a real audio file into
  `assets/` and `require()` it if you'd like a richer sound.
- Sticker/doodle art is rendered from data (emoji + soft shapes) rather than
  rasterized PNGs, keeping the studio fully local and dependency-light.

## Typecheck

```bash
cd expo
bun run typecheck    # tsc --noEmit (expo/tsconfig.json, strict)
```
