# Venting — hybrid app (React Native + Expo + TypeScript)

**One codebase, two platforms.** The same screens run as a native iOS/Android
app **and** as an installable web app (PWA) with offline support. Same pastel
claymorphism design, same privacy model — **everything stays on the device**.
No accounts, no cloud, no ads, no tracking, no analytics, no network calls for
user content.

```
expo/
├── App.tsx                    # root: sqlite hydrate → lock gate → auto-lock → navigation
├── app.json                   # Expo config incl. web/PWA settings + camera/mic/Face ID permissions
├── metro.config.js            # wasm asset support for expo-sqlite on web
├── public/                    # PWA static files (copied into the web build)
│   ├── index.html             # app shell: manifest link, install hook, SW registration
│   ├── manifest.webmanifest   # PWA manifest (standalone, icons, theme)
│   ├── sw.js                  # service worker: app-shell precache + offline fallback
│   └── icons/                 # generated PNG icons (see scripts/make-icons.mjs)
├── scripts/make-icons.mjs     # pure-Node PNG icon generator (no image tools needed)
└── src/
    ├── theme.ts               # pastel clay design system
    ├── theme-context.tsx      # night mode, pastel accent, sounds on/off
    ├── platform.ts            # web/iOS-Safari detection + PWA install hook
    ├── types.ts / data.ts     # types + cute art, moods, worries, stickers
    ├── db.ts                  # expo-sqlite + expo-file-system (web: base64 data-URIs)
    ├── auth.ts                # salted SHA-256 passcode + Face ID/fingerprint
    ├── sound.ts               # runtime-synthesized swish/chime (data-URI on web)
    ├── nav.ts                 # typed stack (incl. Settings)
    ├── lock-context.tsx       # app-lock state
    ├── components/
    │   ├── Clay.tsx           # ClayCard / ClayButton / ClayChip / MoodBubble
    │   ├── Screen.tsx         # soft screen wrapper (supports floating bottomBar)
    │   ├── TaskBar.tsx        # rounded 3-tab bottom bar: Home · Games · Settings
    │   ├── LockPad.tsx        # 4-digit soft number pad
    │   ├── MoodChips.tsx / AttachmentChip.tsx
    └── screens/
        ├── Welcome.tsx        # entry: optional email (validated) or guest
        ├── WelcomeCheckin.tsx # day checklist + what-to-do-now + skip
        ├── Home.tsx           # greeting, mood bubbles, daily checklist, pick-up row,
        │                      # mood suggestion, privacy chip, settings gear, 4 room cards
        ├── Settings.tsx       # Profile · Security & Privacy · Appearance · Install · General
        ├── Record.tsx         # Recording Box: Voice | Video (+ TaskBar)
        ├── Create.tsx         # Photos · Scribble · Stickers · GIF Studio · Vault (+ TaskBar)
        ├── Games.tsx          # 6 calming games: pop, breathe, dandelion, buddy, jars, star
        ├── Diary.tsx          # cover, page-turn, entries (+ TaskBar)
        ├── Notes.tsx / NoteEditor.tsx / Photos.tsx / Scribble.tsx / Stickers.tsx
        ├── GifStudio.tsx / Vault.tsx
```

## Run

```bash
cd expo
bun install

# native (iOS/Android)
bun run start                # Expo Dev Server → i / a for simulators, or scan with Expo Go

# web (PWA)
bun run web                  # dev server on web
bun run build:web            # production PWA build → dist/ (host it anywhere static)
```

> The PWA build is a real installable app: `dist/index.html` links the
> manifest, `dist/sw.js` gives offline support, and `dist/icons/` provides the
> app icons. Serve `dist/` over HTTPS to unlock add-to-home-screen.

## What's new in the hybrid upgrade

- **Bottom taskbar** — soft rounded pill with exactly three tabs: Home · Games ·
  Settings. Settings opens the full settings screen (profile, security,
  appearance, install options, general).
- **Home** — greeting, the skippable **daily check-in checklist** (once per
  day),  a **mood typing box** (“Type how you feel…”) with exactly four quick
  moods (Happy / Sad / Angry / Nervous), a two-per-row feature grid
  (Recording, Notes, Scribble, Photo Doodle, Stickers, GIF Studio, Diary,
  Private Vault), a **“Pick up where you left off”** row, a gentle
  **suggestion card** matched to the mood, the **“Private · Only you”** chip,
  and the settings gear.
- **Record** — one Recording entry shows exactly two soft choice cards (Voice
  Recording | Video Recording); voice and video modes keep their own privacy
  message (“Only you can see this. Nothing is uploaded.”) and action sets.
- **Games** (taskbar tab) — six gentle psychological games in a two-per-row
  grid: Bubble Pop, Breath Bubble, Dandelion Wishes (press & hold), Comfort
  the Buddy, Feelings Jars, Star Trace. No scores, no timers, no competition;
  Scribble stays only on the Home grid.
- **Settings** — profile & account (email / Guest mode, display name, avatar,
  log out), security & privacy (change passcode, Face ID/fingerprint toggle,
  vault double-lock toggle, auto-lock timer, “Delete everything” with gentle
  two-step confirmation), appearance (pastel accents, night mode, sounds),
  **Install & Devices** (PWA install button, iOS “Add to Home Screen”
  instructions, native store note), and general (language, gentle reminders
  off by default, local-only always-on, about, safety resources).

## Privacy model

- **expo-sqlite** (`venting.db`) stores structured data; **expo-file-system**
  stores binaries under the private document directory on native. On **web**,
  binaries are kept as base64 data-URIs inside the same local sqlite store —
  either way nothing leaves the device.
- Passcode: salted SHA-256 only (expo-crypto). Face ID/fingerprint go through
  the OS (expo-local-authentication). Double-lock and auto-lock are on-device.
- No `fetch` to your own backend, no analytics SDKs, no ad SDKs, no social
  features. The only network the web build makes is fetching its own static
  files (and those get cached by the service worker for offline use).

## Real recording

- **Voice** uses `expo-av` `Audio.Recording` (mic permission in `app.json`).
  Without a mic (some web browsers), the app gracefully simulates: timer,
  waveform, metadata — the flow still works.
- **Video** uses `expo-camera` `CameraView` (front camera, on-device). The
  default is an **illustrated avatar** mode — a private emotional mirror with
  cute characters, never a real face. Camera mode is opt-in.

## Typecheck & PWA verification

```bash
cd expo
bun run typecheck      # tsc --noEmit (strict)
bun run build:web      # bundles the app + PWA assets; verify dist/
```

Regenerate icons after design changes: `node scripts/make-icons.mjs`.

## Honest scope notes

- GIF Studio stores animated frames and previews them with a looping
  animation; encoding a true `.gif` file is a listed follow-up.
- The diary page-turn sound is synthesized at runtime (no binary assets);
  drop a real audio file in and `require()` it for a richer swish.
- Native store publishing (App Store / Google Play) isn't included — the
  Settings screen shows the state for the Expo Go development build.
