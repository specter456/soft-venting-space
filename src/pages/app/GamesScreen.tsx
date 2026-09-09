import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import MyLittlePlant from "@/components/MyLittlePlant";
import { sfxWater, sfxArpeggio } from "@/lib/sfx";
import { BuilderShell } from "@/components/BuilderShell";
import { WORRY_BUBBLES } from "@/lib/art";
import { music, type BuiltinTrackId } from "@/lib/music";
import { useTapGuard } from "@/lib/useTapGuard";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";

/* ─── Custom game types & storage ─────────────────────────────────── */

export type World = "sky" | "sunset" | "starry" | "garden" | "sea" | "cozy";
export type FloatingThing = "bubbles" | "stars" | "clouds" | "petals" | "fireflies" | "hearts" | "fish";
export type TouchAction = "pop" | "catch" | "note" | "blow" | "soothe";
export type SparkleStyle = "sparkles" | "ripples" | "hearts" | "notes";
export type ObjectSize = "small" | "medium" | "large";
export type GameSound = "chimes" | "rain" | "wind" | "piano" | "none";
export type GamePace = "very-slow" | "slow" | "medium";

export interface CustomGameConfig {
  id: string;
  name: string;
  world: World;
  things: FloatingThing[];
  touch: TouchAction;
  sparkleStyle: SparkleStyle;
  objectSize: ObjectSize;
  whisper: string;
  sound: GameSound;
  pace: GamePace;
  worldPhoto?: string;
  myDoodle?: string;
  createdAt: number;
}

const STORAGE_KEY = "venting-custom-games";

function loadCustomGames(): CustomGameConfig[] {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomGameConfig[];
  } catch {
    return [];
  }
}

function saveCustomGames(games: CustomGameConfig[]) {
  safeSetItem(STORAGE_KEY, JSON.stringify(games));
}

/* ─── Option data ─────────────────────────────────────────────────── */

const WORLDS: { id: World; label: string; gradient: string }[] = [
  { id: "sky", label: "Sky", gradient: "from-[#B8D4E8] via-[#D0E4F0] to-[#E8F0F8]" },
  { id: "sunset", label: "Sunset", gradient: "from-[#E8C8A0] via-[#E0A888] to-[#D090B0]" },
  { id: "starry", label: "Starry", gradient: "from-[#283058] via-[#383868] to-[#484078]" },
  { id: "garden", label: "Garden", gradient: "from-[#B4D8B0] via-[#C8E8C0] to-[#E0F0D8]" },
  { id: "sea", label: "Sea", gradient: "from-[#80C0D8] via-[#A0D8E8] to-[#C0E8F0]" },
  { id: "cozy", label: "Cozy room", gradient: "from-[#E8D8C8] via-[#F0E4D8] to-[#F8F0E8]" },
];

const THINGS: { id: FloatingThing; emoji: string; label: string }[] = [
  { id: "bubbles", emoji: "🫧", label: "Bubbles" },
  { id: "stars", emoji: "⭐", label: "Stars" },
  { id: "clouds", emoji: "☁️", label: "Clouds" },
  { id: "petals", emoji: "🌸", label: "Petals" },
  { id: "fireflies", emoji: "✨", label: "Fireflies" },
  { id: "hearts", emoji: "💜", label: "Hearts" },
  { id: "fish", emoji: "🐟", label: "Fish" },
];

const PACES: { id: GamePace; label: string; ms: number }[] = [
  { id: "very-slow", label: "Very slow", ms: 3000 },
  { id: "slow", label: "Slow", ms: 2000 },
  { id: "medium", label: "Medium", ms: 1200 },
];

const SPARKLE_STYLES: { id: SparkleStyle; emoji: string; label: string }[] = [
  { id: "sparkles", emoji: "✨", label: "Sparkles" },
  { id: "ripples", emoji: "🌊", label: "Ripples" },
  { id: "hearts", emoji: "💜", label: "Hearts" },
  { id: "notes", emoji: "🎵", label: "Music notes" },
];

const OBJECT_SIZES: { id: ObjectSize; label: string; cls: string }[] = [
  { id: "small", label: "Small", cls: "text-lg" },
  { id: "medium", label: "Medium", cls: "text-2xl" },
  { id: "large", label: "Large", cls: "text-3xl" },
];

function getThingEmoji(thing: FloatingThing): string {
  return THINGS.find((t) => t.id === thing)?.emoji ?? "✨";
}

function getThingEmojis(things: FloatingThing[]): string[] {
  return things.length > 0 ? things.map(getThingEmoji) : ["✨"];
}

function getSparkleEmoji(style: SparkleStyle): string {
  return SPARKLE_STYLES.find((s) => s.id === style)?.emoji ?? "✨";
}

function getWorldGradient(world: World): string {
  return WORLDS.find((w) => w.id === world)?.gradient ?? WORLDS[0].gradient;
}

/* ─── Tiny sound engine ───────────────────────────────────────────── */

let _audioCtx: AudioContext | null = null;
function audioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

function playCustomSound(sound: GameSound) {
  if (sound === "none") return;
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (sound) {
      case "chimes":
        osc.type = "sine";
        osc.frequency.value = 800 + Math.random() * 400;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
        break;
      case "rain":
        osc.type = "triangle";
        osc.frequency.value = 200 + Math.random() * 100;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case "wind":
        osc.type = "sine";
        osc.frequency.value = 150 + Math.sin(Date.now() / 200) * 50;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
        break;
      case "piano":
        osc.type = "sine";
        osc.frequency.value = [262, 294, 330, 392, 440][Math.floor(Math.random() * 5)];
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        break;
    }  } catch { /* audio unavailable */ }
}

/* ─── Bright shared game sounds ─────────────────────────────────── */

const PENTA = [262, 294, 330, 392, 440];
let _sharedCtx: AudioContext | null = null;
function sCtx(): AudioContext { if (!_sharedCtx) _sharedCtx = new AudioContext(); return _sharedCtx; }

/** Quick bright pop/click — punchy pitch sweep for satisfying feedback */
function sfxPop(pitch = 1) {
  try { const c = sCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const o2 = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(900 * pitch, t); o.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.08);
    o2.type = "triangle"; o2.frequency.setValueAtTime(1200 * pitch, t); o2.frequency.exponentialRampToValueAtTime(600 * pitch, t + 0.06);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); o2.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.15); o2.start(t); o2.stop(t + 0.12);
  } catch { /* */ }
}

/** Bright chime note — layered sine + triangle for warmth */
function sfxChime(freq?: number) {
  try { const c = sCtx(); const t = c.currentTime;
    const f = freq ?? PENTA[Math.floor(Math.random() * PENTA.length)];
    const o = c.createOscillator(); const o2 = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.value = f;
    o2.type = "triangle"; o2.frequency.value = f * 2.01; // slight detuned harmonic
    const g2 = c.createGain(); g2.gain.value = 0.12;
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.6); o2.start(t); o2.stop(t + 0.5);
  } catch { /* */ }
}

/** Squeaky boing — pitch rises with each call */
let _boingCount = 0;
function sfxBoing() {
  _boingCount++;
  const pitch = 1 + (_boingCount % 8) * 0.12;
  try { const c = sCtx(); const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(300 * pitch, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(800 * pitch, c.currentTime + 0.08);
    o.frequency.exponentialRampToValueAtTime(400 * pitch, c.currentTime + 0.18);
    g.gain.setValueAtTime(0.28, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + 0.25);
  } catch { /* */ }
}

/** Cute sparkle / giggle blip — rising arpeggio with shimmer */
function sfxSparkle() {
  try { const c = sCtx(); const t = c.currentTime;
    [0, 0.05, 0.1, 0.14].forEach((delay, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sine"; o.frequency.value = [800, 1200, 1600, 2000][i];
      g.gain.setValueAtTime(0.18, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);
      o.connect(g); g.connect(c.destination); o.start(t + delay); o.stop(t + delay + 0.18);
    });
  } catch { /* */ }
}

/** Soft thock — honey-cell pop with satisfying pitch bend */
function sfxThock() {
  try { const c = sCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.12);
    g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.18);
    // Add a tiny click layer for "wet" feel
    const o2 = c.createOscillator(); const g2 = c.createGain();
    o2.type = "sine"; o2.frequency.setValueAtTime(1800, t); o2.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    g2.gain.setValueAtTime(0.12, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o2.connect(g2); g2.connect(c.destination); o2.start(t); o2.stop(t + 0.06);
  } catch { /* */ }
}

// sfxWater re-exported from shared module to avoid circular dependency
export { sfxWater } from "@/lib/sfx";

/** Soft fill / drip — for coloring regions */
function sfxFill() {
  try { const c = sCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.18);
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.25);
  } catch { /* */ }
}

/** Soft water pour — used by Bloom Garden (exported for the plant component). */
/** Soft plop — for cloud stack landing */
function sfxPlop() {
  try { const c = sCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
  } catch { /* */ }
}

/** Soft flip / page turn */
function sfxFlip() {
  try { const c = sCtx(); const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(900, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.1);
    g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + 0.12);
  } catch { /* */ }
}

/** Splash / drip */
function sfxSplash() {
  try { const c = sCtx(); const bufferSize = c.sampleRate * 0.3;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.08));
    const src = c.createBufferSource(); src.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 2000;
    const g = c.createGain(); g.gain.value = 0.18;
    src.connect(filter); filter.connect(g); g.connect(c.destination); src.start(c.currentTime);
  } catch { /* */ }
}// sfxArpeggio re-exported from shared module to avoid circular dependency
export { sfxArpeggio } from "@/lib/sfx";

/* ─── Game registry ───────────────────────────────────────────────── */

type BuiltInGameId = "pop" | "tiles" | "moon" | "honeycomb" | "nimbus" | "garden" | "coloring" | "pond" | "clouds" | "jelly" | "plinko" | "band" | "fireworks";

export type PlantRouteId = "plant";

export { default as MyLittlePlant } from "@/components/MyLittlePlant";

/* ─── Moonlight Glide music ─────────────────────────────────────────── */

type MoonTrack = "dreamy-piano" | "warm-hum" | "night-wind" | "music-box" | "no-music";

const MOON_TRACKS: { id: MoonTrack; label: string }[] = [
  { id: "dreamy-piano", label: "dreamy piano" },
  { id: "warm-hum", label: "warm hum" },
  { id: "night-wind", label: "night wind" },
  { id: "music-box", label: "quiet music box" },
  { id: "no-music", label: "no music" },
];

const MOON_MUSIC_KEY = "venting-moon-track";

function loadMoonTrack(): MoonTrack {
  try {
    const raw = safeGetItem(MOON_MUSIC_KEY);
    if (raw && MOON_TRACKS.some((t) => t.id === raw)) return raw as MoonTrack;
  } catch { /* ignore */ }
  return "dreamy-piano";
}

function saveMoonTrack(track: MoonTrack) {
  safeSetItem(MOON_MUSIC_KEY, track);
}

/* Soft ambient music engine for Moonlight Glide */
let _moonCtx: AudioContext | null = null;
let _moonNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
let _moonGains: GainNode[] = [];

function moonCtx(): AudioContext {
  if (!_moonCtx) _moonCtx = new AudioContext();
  return _moonCtx;
}

function stopMoonMusic() {
  try {
    _moonNodes.forEach((n) => { try { n.stop(); } catch { /* ignore */ } });
    _moonGains.forEach((g) => { try { g.disconnect(); } catch { /* ignore */ } });
  } catch { /* ignore */ }
  _moonNodes = [];
  _moonGains = [];
}

function playMoonTrack(track: MoonTrack) {
  stopMoonMusic();
  if (track === "no-music") return;
  try {
    const ctx = moonCtx();
    if (ctx.state === "suspended") ctx.resume();

    switch (track) {
      case "dreamy-piano": {
        const pad = ctx.createOscillator(); const padGain = ctx.createGain();
        pad.type = "sine"; pad.frequency.value = 220;
        padGain.gain.value = 0.06;
        pad.connect(padGain); padGain.connect(ctx.destination);
        pad.start(); _moonNodes.push(pad); _moonGains.push(padGain);

        const pad2 = ctx.createOscillator(); const pad2Gain = ctx.createGain();
        pad2.type = "sine"; pad2.frequency.value = 330;
        pad2Gain.gain.value = 0.04;
        pad2.connect(pad2Gain); pad2Gain.connect(ctx.destination);
        pad2.start(); _moonNodes.push(pad2); _moonGains.push(pad2Gain);

        const pianoNotes = [262, 294, 330, 392, 440, 523];
        const playNote = () => {
          if (track !== "dreamy-piano") return;
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.type = "sine"; osc.frequency.value = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];
          g.gain.setValueAtTime(0.12, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 2);
          setTimeout(playNote, 2000 + Math.random() * 4000);
        };
        setTimeout(playNote, 1500);
        break;
      }
      case "warm-hum": {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = 110;
        g.gain.value = 0.07;
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); _moonNodes.push(osc); _moonGains.push(g);

        const osc2 = ctx.createOscillator(); const g2 = ctx.createGain();
        osc2.type = "sine"; osc2.frequency.value = 165;
        g2.gain.value = 0.04;
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(); _moonNodes.push(osc2); _moonGains.push(g2);
        break;
      }
      case "night-wind": {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 400;
        const g = ctx.createGain(); g.gain.value = 0.05;
        noise.connect(filter); filter.connect(g); g.connect(ctx.destination);
        noise.start(); _moonNodes.push(noise); _moonGains.push(g);

        const chimeNotes = [800, 1000, 1200, 1400];
        const playChime = () => {
          if (track !== "night-wind") return;
          const osc = ctx.createOscillator(); const cg = ctx.createGain();
          osc.type = "sine"; osc.frequency.value = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
          cg.gain.setValueAtTime(0.08, ctx.currentTime);
          cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          osc.connect(cg); cg.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 1.5);
          setTimeout(playChime, 3000 + Math.random() * 5000);
        };
        setTimeout(playChime, 2000);
        break;
      }
      case "music-box": {
        const notes = [523, 659, 784, 880, 1047];
        let noteIdx = 0;
        const playBox = () => {
          if (track !== "music-box") return;
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.type = "sine"; osc.frequency.value = notes[noteIdx % notes.length];
          g.gain.setValueAtTime(0.1, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 1);
          noteIdx++;
          setTimeout(playBox, 800 + Math.random() * 600);
        };
        setTimeout(playBox, 500);
        break;
      }
    }
  } catch { /* audio unavailable */ }
}

/* ─── Tiny Game Engine ────────────────────────────────────────────── */

const BUILT_IN_GAMES: {
  id: BuiltInGameId;
  emoji: string;
  name: string;
  line: string;
  tile: string;
}[] = [
  { id: "pop", emoji: "🫧", name: "Bubble Pop", line: "gently pop floating worry bubbles", tile: "tile-blush" },
  { id: "tiles", emoji: "🎹", name: "Soft Tiles", line: "tap slow tiles, play a gentle melody", tile: "tile-blush" },
  { id: "moon", emoji: "🌙", name: "Moonlight Glide", line: "glide through a dreamy sky and catch falling stars", tile: "tile-lavender" },
  { id: "honeycomb", emoji: "🍯", name: "Honeycomb Pop", line: "pop the honey cells — soft thocks, golden calm", tile: "tile-peach" },
  { id: "nimbus", emoji: "☁️", name: "Nimbus Friend", line: "a little cloud friend who loves your company", tile: "tile-mint" },
  { id: "garden", emoji: "🌱", name: "Memory Garden", line: "match the feelings, grow a little garden", tile: "tile-lavender" },
  { id: "coloring", emoji: "🎨", name: "Soft Coloring", line: "fill the lines with your favorite calm", tile: "tile-lavender" },
  { id: "pond", emoji: "🎣", name: "Pond Pals", line: "cast a line into the calm pond, meet little friends", tile: "tile-sky" },
  { id: "clouds", emoji: "☁️", name: "Cloud Stack", line: "stack soft clouds into a cozy tower", tile: "tile-mint" },
  { id: "jelly", emoji: "🍮", name: "Jelly Bounce", line: "boing the jelly to the clouds", tile: "tile-blush" },
  { id: "plinko", emoji: "🎐", name: "Chime Plinko", line: "drop a marble, hear the sky sing", tile: "tile-sky" },
  { id: "band", emoji: "🐾", name: "Animal Band", line: "tap the friends, make a song", tile: "tile-mint" },
  { id: "fireworks", emoji: "🎆", name: "Firework Sky", line: "tap the night, bloom soft light", tile: "tile-lavender" },
];

/** Games that have their own continuous music override ambient */
const GAMES_WITH_OWN_MUSIC: BuiltInGameId[] = ["moon"];

/* ─── Main component ──────────────────────────────────────────────── */

type ScreenState =
  | { kind: "grid" }
  | { kind: "play"; game: BuiltInGameId }
  | { kind: "custom-play"; config: CustomGameConfig }
  | { kind: "builder"; editing?: CustomGameConfig }
  | { kind: "custom-play-saved"; config: CustomGameConfig };

export default function GamesScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const route = searchParams.get("game") ?? searchParams.get("route") ?? null;
  const isPlant = route === "plant" || route === "bloom";
  const gameParam = searchParams.get("game") as BuiltInGameId | null;
  const forcedGame =
    gameParam && BUILT_IN_GAMES.some((g) => g.id === gameParam) ? gameParam : null;
  const [screenState, setScreen] = useState<ScreenState>(() => {
    if (forcedGame) return { kind: "play", game: forcedGame };
    if (isPlant) return { kind: "play", game: "garden" };
    return { kind: "grid" };
  });
  // Deep links (?game=x / ?route=plant) win over internal navigation state.
  const screen: ScreenState = forcedGame
    ? { kind: "play", game: forcedGame }
    : screenState;
  const [customGames, setCustomGames] = useState<CustomGameConfig[]>(loadCustomGames);

  useEffect(() => {
    return () => { music.stopGameTrack(); };
  }, []);

  // Games that have their own continuous music override ambient
  const openBuiltIn = useCallback((id: BuiltInGameId) => {
    setScreen({ kind: "play", game: id });
    // Moonlight Glide uses the main music engine; others keep ambient
    if (id === "moon") {
      const saved = loadMoonTrack();
      if (saved !== "no-music") {
        const moonToMain: Record<string, BuiltinTrackId> = {
          "dreamy-piano": "piano", "warm-hum": "hum", "night-wind": "wind",
        };
        const mainId = moonToMain[saved] ?? "piano";
        music.startGameTrack({ kind: "builtin", id: mainId });
      }
    }
    // tiles, pop, breathe, dandelion, buddy, jars, star, shelf, coloring, bloom, pond, cloud, custom: ambient continues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCustom = useCallback((config: CustomGameConfig) => {
    setScreen({ kind: "custom-play-saved", config });
    // Custom games keep ambient playing
  }, []);

  const goGrid = useCallback(() => {
    // Stop game music and resume ambient
    if (screen.kind === "play" && GAMES_WITH_OWN_MUSIC.includes(screen.game)) {
      music.stopGameTrack();
    }
    // Clear any deep-link params so the grid stays put
    setSearchParams({}, { replace: true });
    setScreen({ kind: "grid" });
  }, [screen, setSearchParams]);

  const openBuilder = useCallback(() => {
    setScreen({ kind: "builder" });
  }, []);

  const openEditBuilder = useCallback((config: CustomGameConfig) => {
    setScreen({ kind: "builder", editing: config });
  }, []);

  const saveGame = useCallback((config: CustomGameConfig) => {
    setCustomGames((prev) => {
      const exists = prev.findIndex((g) => g.id === config.id);
      if (exists >= 0) {
        const next = prev.map((g, i) => (i === exists ? config : g));
        saveCustomGames(next);
        return next;
      }
      const next = [...prev, config];
      saveCustomGames(next);
      return next;
    });
    setScreen({ kind: "grid" });
  }, []);

  const deleteGame = useCallback((id: string) => {
    setCustomGames((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveCustomGames(next);
      return next;
    });
    setScreen({ kind: "grid" });
  }, []);

  const previewConfig = useMemo<CustomGameConfig | null>(() => screen.kind === "builder" ? (screen.editing ?? null) : null, [screen]);

  return (
    <div className="relative">
      {previewConfig && !screen.kind.startsWith('builder') && (
        <div className="sticky top-0 z-10">
          <div className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-105 active:scale-95">▶ preview ↻ tap inside to play</div>
          <TinyGameEngine config={previewConfig} minimal />
        </div>
      )}

      {screen.kind === "grid" && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-lg font-bold tracking-tight text-ink-deep">Games</p>
            <p className="mt-1 text-sm font-medium text-ink-soft">gentle places to land — no scores, no timers, no rush</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {(() => {
              const total = BUILT_IN_GAMES.length + customGames.length + 1; // +1 for creator card
              const isOdd = total % 2 !== 0;
              let idx = 0;
              return (
                <>
                  {BUILT_IN_GAMES.map((g) => {
                    const i = idx++;
                    const last = isOdd && i === total - 1;
                    return (
                      <motion.button key={g.id} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        onClick={() => openBuiltIn(g.id)}
                        className={cn("clay-card group flex flex-col items-center gap-2 px-4 py-5 sm:py-6 text-center transition-transform hover:-translate-y-0.5 h-full",
                          last && "col-span-2 justify-self-center w-[calc(50%-0.375rem)]")}>
                        <span className={cn("flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl transition-transform group-hover:scale-110", g.tile)}>
                          <span aria-hidden className="drop-shadow-sm">{g.emoji}</span>
                        </span>
                        <span className="text-sm sm:text-base font-bold tracking-tight text-ink-deep">{g.name}</span>
                        <span className="text-[11px] sm:text-xs leading-snug font-medium text-ink-soft">{g.line}</span>
                      </motion.button>
                    );
                  })}

                  {customGames.map((cg) => {
                    const i = idx++;
                    const last = isOdd && i === total - 1;
                    const mainEmoji = cg.myDoodle ? "✏️" : getThingEmojis(cg.things)[0] ?? "✨";
                    return (
                      <motion.div key={cg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className={cn("clay-card group flex flex-col items-center gap-2 px-4 py-5 sm:py-6 text-center transition-transform hover:-translate-y-0.5 h-full relative",
                          last && "col-span-2 justify-self-center w-[calc(50%-0.375rem)]")}>
                        <span className="absolute top-2 left-2 text-xs">✨</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openCustom(cg); }}
                          className="flex flex-col items-center gap-2 w-full">
                          <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl transition-transform group-hover:scale-110 tile-lavender">
                            <span aria-hidden className="drop-shadow-sm">{mainEmoji}</span>
                          </span>
                          <span className="text-sm sm:text-base font-bold tracking-tight text-ink-deep">{cg.name || "My Game"}</span>
                          <span className="text-[11px] sm:text-xs leading-snug font-medium text-ink-soft">{cg.things.join(" + ")} · {cg.touch}</span>
                        </button>
                        <div className="flex gap-1 mt-1">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openCustom(cg); }}
                            className="clay-chip h-6 px-2 rounded-full text-[10px] font-bold text-ink-deep hover:scale-105 flex items-center gap-0.5">▶ play</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openEditBuilder(cg); }}
                            className="clay-chip h-6 px-2 rounded-full text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center gap-0.5">✎ edit</button>
                          <button type="button" onClick={(e) => {
                              e.stopPropagation();
                              const dup = { ...cg, id: `custom-${Date.now()}`, name: (cg.name || "My Game") + " copy", createdAt: Date.now() };
                              saveGame(dup);
                            }}
                            className="clay-chip h-6 px-2 rounded-full text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center gap-0.5">⧉ dup</button>
                          <button type="button" onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("remove this game?")) deleteGame(cg.id);
                            }}
                            className="clay-chip h-6 px-2 rounded-full text-[10px] font-bold text-[#C48B9E] hover:text-[#A06070] flex items-center gap-0.5">✕</button>
                        </div>
                      </motion.div>
                    );
                  })}

                  {(() => {
                    return (
                      <motion.button type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                        onClick={openBuilder}
                        className={cn("flex flex-col items-center gap-2 rounded-[1.8rem] border-2 border-dashed border-[#8C9AD6]/50 bg-[#E4E8F8]/30 px-4 py-5 sm:py-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#8C9AD6] hover:bg-[#E4E8F8]/50 h-full",
                          isOdd && "col-span-2 justify-self-center w-[calc(50%-0.375rem)]")}>
                        <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl">
                          <span aria-hidden className="drop-shadow-sm">✨</span>
                        </span>
                        <span className="text-sm sm:text-base font-bold tracking-tight text-ink-deep">Create your own game</span>
                        <span className="text-[11px] sm:text-xs leading-snug font-medium text-ink-soft">build a tiny game the way you desire</span>
                      </motion.button>
                    );
                  })()}
                </>
              );
            })()}
          </div>

          <p className="pt-1 text-center text-[11px] font-semibold text-ink-soft">🔒 private, calm, and all on this device</p>
        </div>
      )}

      {screen.kind === "play" && (
        <div className="space-y-4">
          <button type="button" onClick={goGrid} className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">← all games</button>
          {screen.game === "pop" && <BubblePop />}
          {screen.game === "tiles" && <SoftTiles />}
          {screen.game === "moon" && <MoonlightGlide />}
          {screen.game === "honeycomb" && <HoneycombPop />}
          {screen.game === "nimbus" && <NimbusFriend />}
          {screen.game === "garden" && (isPlant ? <MyLittlePlant /> : <MemoryGarden />)}
          {screen.game === "coloring" && <SoftColoring />}
          {screen.game === "pond" && <PondPals />}
          {screen.game === "clouds" && <CloudStack />}
          {screen.game === "jelly" && <JellyBounce />}
          {screen.game === "plinko" && <ChimePlinko />}
          {screen.game === "band" && <AnimalBand />}
          {screen.game === "fireworks" && <FireworkSky />}
        </div>
      )}

      {screen.kind === "custom-play" && (
        <div className="space-y-4">
          <button type="button" onClick={goGrid} className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">← all games</button>
          <TinyGameEngine config={screen.config} />
        </div>
      )}

      {screen.kind === "custom-play-saved" && (
        <div className="space-y-4">
          <button type="button" onClick={goGrid} className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">← all games</button>
          <TinyGameEngine config={screen.config} />
        </div>
      )}

      {screen.kind === "builder" && (
        <BuilderShell
          initial={screen.editing ?? null}
          onCreate={saveGame}
          onCancel={goGrid}
          onPlay={(config) => setScreen({ kind: "custom-play-saved", config })}
        />
      )}
    </div>
  );
}
/* ─── Tiny Game Engine ────────────────────────────────────────────── */

interface FloatingObj {
  id: number;
  x: number;
  y: number;
  opacity: number;
  emoji: string;
  sparkle: string;
}

export function TinyGameEngine({ config, minimal = false }: { config: CustomGameConfig; minimal?: boolean }) {
  const [objects, setObjects] = useState<FloatingObj[]>([]);
  const [counter, setCounter] = useState(0);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const [whisperMsg, setWhisperMsg] = useState<string | null>(null);
  const nextId = useRef(0);
  const whisperTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const paceMs = PACES.find((p) => p.id === config.pace)?.ms ?? 2000;
  const sizeCls = OBJECT_SIZES.find((s) => s.id === config.objectSize)?.cls ?? "text-2xl";
  const emojis = getThingEmojis(config.things);
  const sparkleEmoji = getSparkleEmoji(config.sparkleStyle);

  // Spawn objects (random from selected things)
  useEffect(() => {
    const timer = setInterval(() => {
      setObjects((prev) => {
        if (prev.length > 15) return prev;
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        return [...prev, {
          id: nextId.current++,
          x: 5 + Math.random() * 90,
          y: -5,
          opacity: 0.9,
          emoji,
          sparkle: sparkleEmoji,
        }];
      });
    }, paceMs);
    return () => clearInterval(timer);
  }, [paceMs, emojis, sparkleEmoji]);

  // Move objects
  useEffect(() => {
    const speed = config.pace === "very-slow" ? 0.3 : config.pace === "slow" ? 0.5 : 0.8;
    const timer = setInterval(() => {
      setObjects((prev) =>
        prev
          .map((o) => ({ ...o, y: o.y + speed, x: o.x + Math.sin(o.y / 10) * 0.2 }))
          .filter((o) => o.y < 110),
      );
    }, 50);
    return () => clearInterval(timer);
  }, [config.pace]);

  // Whisper messages
  useEffect(() => {
    if (!config.whisper) return;
    whisperTimer.current = setInterval(() => {
      setWhisperMsg(config.whisper);
      setTimeout(() => setWhisperMsg(null), 3000);
    }, 8000 + Math.random() * 5000);
    return () => { if (whisperTimer.current) clearInterval(whisperTimer.current); };
  }, [config.whisper]);

  // Sparkle cleanup
  useEffect(() => {
    if (sparkles.length === 0) return;
    const t = setTimeout(() => setSparkles((s) => s.slice(1)), 800);
    return () => clearTimeout(t);
  }, [sparkles]);

  const spawnSparkle = useCallback((x: number, y: number) => {
    setSparkles((prev) => [...prev.slice(-8), { id: Date.now(), x, y, emoji: sparkleEmoji }]);
  }, [sparkleEmoji]);

  const handleTouch = (id: number, x: number, y: number) => {
    playCustomSound(config.sound);
    spawnSparkle(x, y);

    switch (config.touch) {
      case "pop":
        setObjects((prev) => prev.filter((o) => o.id !== id));
        break;
      case "catch":
        setObjects((prev) => prev.filter((o) => o.id !== id));
        setCounter((c) => c + 1);
        break;
      case "note":
        break;
      case "blow":
        setObjects((prev) => prev.map((o) => o.id === id ? { ...o, x: o.x + (Math.random() > 0.5 ? 20 : -20), y: o.y - 5 } : o));
        break;
      case "soothe":
        setObjects((prev) => prev.map((o) => o.id === id ? { ...o, opacity: 0.5 } : o));
        setTimeout(() => {
          setObjects((prev) => prev.map((o) => o.id === id ? { ...o, opacity: 0.9 } : o));
        }, 600);
        break;
    }
  };

  const worldStyle: React.CSSProperties = config.worldPhoto
    ? { backgroundImage: `url(${config.worldPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-b",
      !config.worldPhoto && getWorldGradient(config.world),
      minimal ? "h-full" : "h-72",
    )} style={worldStyle}>
      {/* Doodle object sit in the world, layered among the other floating things */}
      {config.myDoodle && (
        <></>
      )}

      {/* Objects */}
      {objects.map((obj) => (
        <motion.button
          key={obj.id}
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const parent = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
            if (parent) {
              handleTouch(obj.id,
                ((rect.left - parent.left + rect.width / 2) / parent.width) * 100,
                ((rect.top - parent.top + rect.height / 2) / parent.height) * 100,
              );
            }
          }}
          whileTap={{ scale: 0.7 }}
          className={cn("absolute transition-opacity duration-200 cursor-pointer", sizeCls)}
          style={{ left: `${obj.x}%`, top: `${obj.y}%`, opacity: obj.opacity, transform: "translate(-50%, -50%)" }}
        >
          {obj.emoji}
        </motion.button>
      ))}

      {/* Sparkle effects */}
      {sparkles.map((s) => (
        <motion.span key={s.id} initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute text-lg pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%, -50%)" }}>
          {s.emoji}
        </motion.span>
      ))}

      {/* Whisper message */}
      {whisperMsg && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="absolute bottom-12 left-0 right-0 text-center px-4">
          <span className="inline-block rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold text-ink-deep shadow-sm">
            {whisperMsg}
          </span>
        </motion.div>
      )}

      {!minimal && (
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <p className="text-sm font-bold text-white/80 drop-shadow-sm">
            {config.touch === "catch" ? `${counter} caught` : `${objects.length} floating`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Shared ──────────────────────────────────────────────────────── *//* ─── Shared ──────────────────────────────────────────────────────── */

function GameIntro({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold tracking-tight text-ink-deep">{emoji} {title}</p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{sub}</p>
    </div>
  );
}

/* ─── 1. Bubble Pop ───────────────────────────────────────────────── */

function BubblePop() {
  const [worries, setWorries] = useState(() => WORRY_BUBBLES.map((w, i) => ({ id: i, text: w, popped: false })));
  const popped = worries.filter((w) => w.popped).length;    const reset = useTapGuard(() => { sfxArpeggio(); setWorries((prev) => prev.map((w) => ({ ...w, popped: false }))); }, 400);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-blush-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute top-12 right-10 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "0.8s" }} aria-hidden>✧</span>
      <span className="pointer-events-none absolute bottom-16 left-12 text-xs text-mint-200 animate-twinkle" style={{ animationDelay: "1.5s" }} aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-sm text-peach-200 animate-twinkle" style={{ animationDelay: "2.2s" }} aria-hidden>✧</span>
      <GameIntro emoji="🫧" title="Bubble Pop" sub="Each bubble holds a worry — tap it and watch it burst. Lighter, not forgotten." />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {worries.map((w) => (
          <AnimatePresence key={w.id}>
            {!w.popped ? (
              <motion.button type="button" exit={{ scale: 0, opacity: 0, rotate: 12 }} transition={{ duration: 0.3 }}
                onClick={() => { sfxPop(0.8); setWorries((prev) => prev.map((x) => (x.id === w.id ? { ...x, popped: true } : x))); }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
                className="clay-chip flex h-24 items-center justify-center rounded-full p-4 text-center text-xs leading-snug font-bold text-ink">{w.text}</motion.button>
            ) : (
              <motion.span key={`popped-${w.id}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex h-24 items-center justify-center text-2xl" aria-hidden>💨</motion.span>
            )}
          </AnimatePresence>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-bold text-mint-500">{popped}/{worries.length} worries floated away</p>
        <button type="button" onClick={reset} className="clay-btn-soft px-4 py-2 text-xs font-bold text-ink-deep">Fill them again</button>
      </div>
    </motion.div>
  );
}

/* ─── 2. Soft Tiles ───────────────────────────────────────────────── */

const TILE_NOTES = [262, 294, 330, 392];
let _tileAudioCtx: AudioContext | null = null;
function tileAudioCtx(): AudioContext { if (!_tileAudioCtx) _tileAudioCtx = new AudioContext(); return _tileAudioCtx; }
function playTileNote(freq: number) {
  try {
    const ctx = tileAudioCtx(); const t = ctx.currentTime;
    // Bright piano-like tone: sine fundamental + soft triangle harmonic
    const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator();
    const g = ctx.createGain(); const g2 = ctx.createGain();
    o1.type = "sine"; o1.frequency.value = freq;
    o2.type = "triangle"; o2.frequency.value = freq * 2;
    g2.gain.value = 0.08;
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(ctx.destination);
    o1.start(t); o1.stop(t + 0.55); o2.start(t); o2.stop(t + 0.45);
  } catch { /* audio unavailable */ }
}
const TILE_COLORS = ["bg-[#E8B4C8]/80", "bg-[#B4BCE8]/80", "bg-[#B4E0D0]/80", "bg-[#E8D4B4]/80"];
interface DriftTile { id: number; col: number; born: number; }

function SoftTiles() {
  const [tiles, setTiles] = useState<DriftTile[]>([]);
  const [played, setPlayed] = useState(0);
  const nextId = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => { setTiles((prev) => { if (prev.length > 8) return prev; return [...prev, { id: nextId.current++, col: Math.floor(Math.random() * 4), born: Date.now() }]; }); }, 1200);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => { setTiles((prev) => prev.filter((t) => Date.now() - t.born < 4200)); }, 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, []);

  const tapTile = (col: number) => { playTileNote(TILE_NOTES[col]); setPlayed((p) => p + 1); };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-blush-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "1.2s" }} aria-hidden>✧</span>
      <GameIntro emoji="🎹" title="Soft Tiles" sub="tap tiles before they fade — every tap sounds like a soft piano note" />
      <div className="relative mt-6 grid grid-cols-4 gap-2 overflow-hidden rounded-2xl bg-[#FDF5E6]/50" style={{ height: 320, animation: "hueShift 30s linear infinite" }}>
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="relative border-r border-[#C4CBE8]/20 last:border-r-0">
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-lg text-ink-soft/30">{["♪","♫","♩","♬"][col]}</span>
            {tiles.filter((t) => t.col === col).map((t) => {
              const pct = Math.min(((Date.now() - t.born) / 4000) * 100, 100);
              return <button key={t.id} type="button" onClick={() => tapTile(col)} className={cn("absolute left-1 right-1 h-14 rounded-xl transition-opacity", TILE_COLORS[col], pct > 85 ? "opacity-40" : "opacity-90")} style={{ top: `${pct}%` }} />;
            })}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-bold text-ink-deep">🎵 {played} notes played</p>
      <p className="mt-2 text-center text-xs font-medium text-ink-soft">{elapsed > 60 ? "the melody is gentle" : "tap the drifting tiles — every sound is a soft note"}</p>
    </motion.div>
  );
}

/* ─── 3. Moonlight Glide ──────────────────────────────────────────── */

type SkyPhase = "meadow" | "sunset" | "starry";
const SKY_GRADIENTS: Record<SkyPhase, string> = {
  meadow: "from-[#B8D4E8] via-[#C8E0D0] to-[#E0E8C8]",
  sunset: "from-[#E8C8A0] via-[#E0A888] to-[#D090B0]",
  starry: "from-[#283058] via-[#383868] to-[#484078]",
};
interface FallingItem { id: number; emoji: string; lane: number; y: number; }

function MoonlightGlide() {
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [caught, setCaught] = useState(0);
  const [sky, setSky] = useState<SkyPhase>("meadow");
  const nextId = useRef(0);
  const [track, setTrack] = useState<MoonTrack>(loadMoonTrack);
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const musicPlaying = track !== "no-music";

  // Start/stop music based on track selection
  useEffect(() => {
    playMoonTrack(track);
    saveMoonTrack(track);
    return () => { stopMoonMusic(); };
  }, [track]);

  useEffect(() => { const phases: SkyPhase[] = ["meadow", "sunset", "starry"]; let idx = 0; const t = setInterval(() => { idx = (idx + 1) % 3; setSky(phases[idx]); }, 6000); return () => clearInterval(t); }, []);
  useEffect(() => { const emojis = ["⭐", "💛", "🏮"]; const t = setInterval(() => { setItems((prev) => { if (prev.length > 6) return prev; return [...prev, { id: nextId.current++, emoji: emojis[Math.floor(Math.random() * 3)], lane: Math.floor(Math.random() * 3), y: 0 }]; }); }, 1600); return () => clearInterval(t); }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setItems((prev) => {
        const updated = prev.map((it) => ({ ...it, y: it.y + 2.5 }));
        const caughtItems = updated.filter((it) => it.lane === lane && it.y >= 70 && it.y <= 90);
        if (caughtItems.length > 0) { sfxSparkle(); setCaught((c) => c + caughtItems.length); return updated.filter((it) => !caughtItems.some((c) => c.id === it.id) && it.y < 110); }
        return updated.filter((it) => it.y < 110);
      });
    }, 80);
    return () => clearInterval(t);
  }, [lane]);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <GameIntro emoji="🌙" title="Moonlight Glide" sub="tap left or right to drift lanes — catch stars as they fall softly" />

      {/* Music CD button */}
      <div className="absolute top-4 right-4 z-10">
        <button type="button" onClick={() => setShowMusicMenu((v) => !v)}
          className={cn("relative flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110 active:scale-95",
            musicPlaying ? "ring-2 ring-[#C4CBE8]/60" : "bg-[#E4E8F8]/60")}
          aria-label="Music settings">
          <span
            className={cn("cd-disc block h-8 w-8 rounded-full", musicPlaying && "animate-cd-spin")}
          />
        </button>
        {showMusicMenu && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-11 right-0 w-40 rounded-2xl bg-[#FDF5E6]/95 shadow-lg border border-[#C4CBE8]/40 p-2 space-y-1">
            {MOON_TRACKS.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTrack(t.id); setShowMusicMenu(false); }}
                className={cn("w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors",
                  track === t.id ? "bg-[#5F6DBE] text-white" : "text-ink-deep hover:bg-[#E4E8F8]/60")}>
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div className={cn("relative mt-6 h-64 overflow-hidden rounded-2xl bg-gradient-to-b transition-all duration-[3000ms]", SKY_GRADIENTS[sky])}>
        {sky === "starry" && Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="absolute text-xs text-white/70 animate-twinkle" style={{ left: `${10 + (i * 17) % 80}%`, top: `${5 + (i * 13) % 50}%`, animationDelay: `${i * 0.3}s` }} aria-hidden>✦</span>
        ))}
        <button type="button" onClick={() => setLane((l) => Math.max(0, l - 1))} className="absolute inset-y-0 left-0 w-1/3 opacity-0" aria-label="Move left" />
        <button type="button" onClick={() => setLane((l) => Math.min(2, l + 1))} className="absolute inset-y-0 right-0 w-1/3 opacity-0" aria-label="Move right" />
        {items.map((it) => (
          <span key={it.id} className="absolute text-2xl transition-all duration-100" style={{ left: `${16.67 + it.lane * 33.33}%`, top: `${it.y}%`, transform: "translateX(-50%)" }}>{it.emoji}</span>
        ))}
        <div className="absolute bottom-4 text-4xl transition-all duration-300 ease-out" style={{ left: `${16.67 + lane * 33.33}%`, transform: "translateX(-50%)" }}>🧸</div>
      </div>
      <p className="mt-4 text-center text-sm font-bold text-ink-deep">⭐ {caught} caught</p>
      <p className="mt-2 text-center text-xs font-medium text-ink-soft">{sky === "meadow" ? "a gentle morning meadow" : sky === "sunset" ? "the sky is turning warm" : "the stars are out tonight"}</p>
    </motion.div>
  );
}

/* ─── 4. Honeycomb Pop ────────────────────────────────────────────── */

const HEX_COUNT = 15;
interface HexCell { id: number; popped: boolean; }

function HoneycombPop() {
  const [cells, setCells] = useState<HexCell[]>(() => Array.from({ length: HEX_COUNT }, (_, i) => ({ id: i, popped: false })));
  const [neighbors, setNeighbors] = useState<Set<number>>(new Set());
  const poppedCount = cells.filter((c) => c.popped).length;

  const popCell = (id: number) => {
    sfxThock();
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, popped: true } : c)));
    const adjacent = new Set<number>(); if (id > 0) adjacent.add(id - 1); if (id < HEX_COUNT - 1) adjacent.add(id + 1);
    setNeighbors(adjacent); setTimeout(() => setNeighbors(new Set()), 300);
  };
  const refill = useTapGuard(() => { setCells((prev) => prev.map((c) => ({ ...c, popped: false }))); }, 500);
  const allPopped = poppedCount === HEX_COUNT;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 right-10 text-sm text-peach-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 left-12 text-xs text-mint-200 animate-twinkle" style={{ animationDelay: "1s" }} aria-hidden>✧</span>
      <GameIntro emoji="🍯" title="Honeycomb Pop" sub="tap the honey cells — each one pops with a soft thock" />
      <div className="mt-6 grid grid-cols-5 gap-2 justify-items-center">
        {cells.map((cell) => (
          <motion.button key={cell.id} type="button" animate={neighbors.has(cell.id) ? { scale: [1, 0.92, 1.04, 1] } : { scale: 1 }} transition={{ duration: 0.3 }} disabled={cell.popped} onClick={() => popCell(cell.id)}
            className={cn("h-14 w-14 rounded-xl transition-all duration-200 flex items-center justify-center", cell.popped ? "bg-transparent" : "bg-gradient-to-br from-[#F0D080] to-[#D4A840] shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_3px_8px_rgba(200,160,60,0.3)] hover:scale-105 active:scale-95 cursor-pointer")}>
            {cell.popped ? <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-lg">💧</motion.span> : <span className="text-sm font-bold text-[#8B6820]">🍯</span>}
          </motion.button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-bold text-[#C4960A]">{poppedCount}/{HEX_COUNT} cells popped</p>
        {allPopped ? <button type="button" onClick={refill} className="clay-btn px-4 py-2 text-xs font-bold text-white">pour a new comb 🍯</button> : <span className="text-xs font-medium text-ink-soft">tap each cell</span>}
      </div>
      {allPopped && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center text-sm font-bold text-[#C4960A]">all that honey tension is gone ✨</motion.p>}
    </motion.div>
  );
}

/* ─── 5. Nimbus Friend — a real companion ────────────────────────────── */

type NimbusMood = "idle" | "happy" | "boing" | "eat" | "tickle" | "dozing" | "waking";
type NimbusColor = "white" | "lavender" | "pink" | "mint";

const NIMBUS_COLORS: { id: NimbusColor; label: string; bg: string; shadow: string }[] = [
  { id: "white", label: "white", bg: "bg-white", shadow: "rgba(180,200,220,0.4)" },
  { id: "lavender", label: "lavender", bg: "bg-[#E4E0F4]", shadow: "rgba(160,140,200,0.4)" },
  { id: "pink", label: "pink", bg: "bg-[#F4E0E8]", shadow: "rgba(200,160,180,0.4)" },
  { id: "mint", label: "mint", bg: "bg-[#E0F0EC]", shadow: "rgba(140,180,170,0.4)" },
];

const NIMBUS_STORAGE_KEY = "venting-nimbus-color";

function NimbusFriend() {
  const [mood, setMood] = useState<NimbusMood>("idle");
  const [blush, setBlush] = useState(false);
  const [color, setColor] = useState<NimbusColor>(() => {
    try { return (localStorage.getItem(NIMBUS_STORAGE_KEY) as NimbusColor) || "white"; } catch { return "white"; }
  });
  const [showPalette, setShowPalette] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [zzz, setZzz] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [echoing, setEchoing] = useState(false);

  const dragging = useRef(false);
  const lastTap = useRef(0);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const nextSparkleId = useRef(0);

  const colorData = NIMBUS_COLORS.find((c) => c.id === color) ?? NIMBUS_COLORS[0];

  // Save color preference
  useEffect(() => {
    try { localStorage.setItem(NIMBUS_STORAGE_KEY, color); } catch { /* ignore */ }
  }, [color]);

  // Reset idle timer on any interaction
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setMood("dozing");
      setZzz(true);
    }, 20000);
  }, []);

  // Start idle timer on mount
  useEffect(() => {
    resetIdleTimer();
    return () => { clearTimeout(idleTimer.current); clearTimeout(moodTimer.current); };
  }, [resetIdleTimer]);

  const setMoodTemp = (m: NimbusMood, dur = 1200) => {
    clearTimeout(moodTimer.current);
    setMood(m);
    if (m !== "dozing") {
      moodTimer.current = setTimeout(() => setMood("idle"), dur);
    }
  };

  const addSparkle = (x: number, y: number) => {
    const id = nextSparkleId.current++;
    setSparkles((prev) => [...prev.slice(-8), { id, x, y }]);
    setTimeout(() => setSparkles((prev) => prev.filter((s) => s.id !== id)), 800);
  };

  const addHeart = (x: number) => {
    const id = nextSparkleId.current++;
    setHearts((prev) => [...prev.slice(-5), { id, x }]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 1200);
  };

  // Wake up if dozing
  const wakeUp = useCallback(() => {
    if (mood === "dozing" || mood === "waking") {
      setMood("waking");
      setZzz(false);
      setTimeout(() => setMood("idle"), 600);
    }
    resetIdleTimer();
  }, [mood, resetIdleTimer]);

  // Poke (tap)
  const onTap = () => {
    wakeUp();
    if (mood === "dozing") return;
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;
    lastTap.current = now;

    if (timeSinceLastTap < 400) {
      // Quick successive taps = tickle
      tapCount.current++;
      clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
      if (tapCount.current >= 3) {
        setMoodTemp("tickle", 1500);
        // Add sparkles around
        for (let i = 0; i < 5; i++) {
          setTimeout(() => addSparkle(30 + Math.random() * 40, 20 + Math.random() * 40), i * 100);
        }
        tapCount.current = 0;
        return;
      }
    } else {
      tapCount.current = 1;
    }

    // Single tap = boing
    setMoodTemp("boing", 800);
    addSparkle(40 + Math.random() * 20, 30 + Math.random() * 20);
  };

  // Stroke (drag)
  const onPointerDown = () => { dragging.current = true; wakeUp(); };
  const onPointerMove = () => {
    if (dragging.current) {
      setMood("happy");
      setBlush(true);
      resetIdleTimer();
    }
  };
  const onPointerUp = () => {
    dragging.current = false;
    setTimeout(() => setBlush(false), 800);
  };

  // Feed a star
  const feedStar = useTapGuard(() => {
    wakeUp();
    setMoodTemp("eat", 1500);
    addHeart(50);
    setTimeout(() => addHeart(35), 200);
    setTimeout(() => addHeart(65), 400);
  }, 600);

  // Talk to it — mic
  const startTalking = async () => {
    wakeUp();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (chunksRef.current.length === 0) { setIsRecording(false); return; }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Echo back in cute chipmunk style
        try {
          const audioCtx = new AudioContext();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          // Play with pitch shift (faster = higher pitch)
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = 1.6; // chipmunk speed
          const gain = audioCtx.createGain();
          gain.gain.value = 0.6;
          source.connect(gain);
          gain.connect(audioCtx.destination);
          setEchoing(true);
          setMoodTemp("happy", 3000);
          source.start();
          source.onended = () => { setEchoing(false); audioCtx.close(); };
        } catch { /* audio decode failed — skip gracefully */ }
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // Mic denied or unavailable
      setIsRecording(false);
      setMoodTemp("idle", 0);
    }
  };

  const stopTalking = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
      recorderRef.current = null;
    } else if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  // Eye rendering
  const renderEyes = () => {
    switch (mood) {
      case "happy":
        return (<><span className="absolute top-6 left-10 text-sm">~</span><span className="absolute top-6 right-10 text-sm">~</span></>);
      case "eat":
        return (<><span className="absolute top-6 left-10 text-sm">🧡</span><span className="absolute top-6 right-10 text-sm">🧡</span></>);
      case "tickle":
        return (<><span className="absolute top-6 left-10 text-sm"> XD</span><span className="absolute top-6 right-10 text-sm">XD </span></>);
      case "boing":
        return (<><span className="absolute top-5 left-9 h-2 w-2 rounded-full bg-[#5C5470]" /><span className="absolute top-5 right-9 h-2 w-2 rounded-full bg-[#5C5470]" /></>);
      case "dozing":
        return (<><span className="absolute top-6 left-10 text-sm">–</span><span className="absolute top-6 right-10 text-sm">–</span></>);
      case "waking":
        return (<><span className="absolute top-6 left-10 text-sm">o</span><span className="absolute top-6 right-10 text-sm">o</span></>);
      default: // idle
        return (<><span className="absolute top-6 left-10 h-1.5 w-1.5 rounded-full bg-[#5C5470]" /><span className="absolute top-6 right-10 h-1.5 w-1.5 rounded-full bg-[#5C5470]" /></>);
    }
  };

  // Mouth rendering
  const renderMouth = () => {
    switch (mood) {
      case "boing": return "o";
      case "eat": return "😮";
      case "tickle": return ":D";
      case "happy": return "◡";
      case "dozing": return "zzz";
      case "waking": return "o";
      default: return "◡";
    }
  };

  const motionAnim = (() => {
    switch (mood) {
      case "boing": return { y: [0, -20, 0, -8, 0] };
      case "eat": return { scale: [1, 1.15, 1] };
      case "tickle": return { rotate: [0, -5, 5, -3, 3, 0], y: [0, -4, 0] };
      case "waking": return { scale: [0.95, 1.05, 1] };
      case "dozing": return { y: [0, 2, 0] };
      default: return { y: [0, -4, 0] };
    }
  })();

  const motionTransition = mood === "boing"
    ? { duration: 0.5, ease: "easeOut" as const }
    : mood === "tickle"
      ? { duration: 0.6, ease: "easeInOut" as const }
      : { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-mint-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-10 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "1.5s" }} aria-hidden>✧</span>
      <GameIntro emoji="☁️" title="Nimbus Friend" sub="poke, stroke, tickle, feed, and talk to your cloud friend" />

      {/* Color palette button */}
      <div className="absolute top-4 right-4 z-10">
        <button type="button" onClick={() => setShowPalette((v) => !v)}
          className="clay-chip flex h-8 w-8 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 active:scale-95"
          aria-label="Change nimbus color">🎨</button>
        {showPalette && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-10 right-0 flex gap-1.5 rounded-2xl bg-[#FDF5E6]/95 p-2 shadow-lg border border-[#C4CBE8]/40">
            {NIMBUS_COLORS.map((c) => (
              <button key={c.id} type="button" onClick={() => { setColor(c.id); setShowPalette(false); }}
                className={`h-7 w-7 rounded-full border-2 transition-all ${color === c.id ? "border-[#5F6DBE] scale-110" : "border-white/70 hover:scale-105"} ${c.bg}`}
                title={c.label} />
            ))}
          </motion.div>
        )}
      </div>

      {/* The cloud companion */}
      <div className="relative mx-auto mt-6 flex h-48 w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-to-b from-[#D8E8F8] to-[#E8F0F8]"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <motion.div animate={motionAnim} transition={motionTransition}
          className="relative cursor-pointer select-none" onClick={onTap}>
          <div className="relative flex flex-col items-center">
            <div className="relative">
              <div className={`h-24 w-36 rounded-full ${colorData.bg} shadow-[0_8px_24px_${colorData.shadow}]`} />
              <div className={`absolute -top-4 left-4 h-16 w-16 rounded-full ${colorData.bg}`} />
              <div className={`absolute -top-6 left-12 h-14 w-14 rounded-full ${colorData.bg}`} />
              <div className={`absolute -top-2 right-4 h-14 w-14 rounded-full ${colorData.bg}`} />
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                {renderEyes()}
                {blush && (<><span className="absolute top-9 left-6 h-3 w-5 rounded-full bg-[#E8B4C8]/60" /><span className="absolute top-9 right-6 h-3 w-5 rounded-full bg-[#E8B4C8]/60" /></>)}
                <span className="absolute top-10 left-1/2 -translate-x-1/2 text-sm">{renderMouth()}</span>
              </div>
              {/* Zzz when dozing */}
              {zzz && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, y: -10 }}
                  className="absolute -top-4 right-2 text-sm font-bold text-[#8C9AD6]">zzz</motion.span>
              )}
            </div>
            {/* Floating hearts on feed */}
            {hearts.map((h) => (
              <motion.span key={h.id} initial={{ opacity: 0, y: 10, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1 }}
                exit={{ opacity: 0 }} className="absolute -top-6 text-lg" style={{ left: `${h.x}%` }}>💜</motion.span>
            ))}
            {/* Sparkles on poke/tickle */}
            {sparkles.map((s) => (
              <motion.span key={s.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0 }} className="absolute text-xs text-[#C9A96A]" style={{ left: `${s.x}%`, top: `${s.y}%` }}>✦</motion.span>
            ))}
            {/* Echo visual */}
            {echoing && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-lg">🎵</motion.span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={feedStar}
          className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">feed a star ⭐</button>
        <button type="button"
          onPointerDown={(e) => { e.stopPropagation(); startTalking(); }}
          onPointerUp={(e) => { e.stopPropagation(); stopTalking(); }}
          onPointerLeave={() => { if (isRecording) stopTalking(); }}
          className={`clay-chip rounded-full px-4 py-2 text-xs font-bold transition-transform hover:scale-105 active:scale-95 ${isRecording ? "bg-[#C48B9E]/20 text-[#C48B9E] ring-2 ring-[#C48B9E]/40" : "text-ink-deep"}`}>
          {isRecording ? "🔴 listening…" : "🎤 say something"}
        </button>
      </div>

      {isRecording && (
        <p className="mt-2 text-center text-[10px] font-semibold text-ink-soft">hold to talk · release to hear nimbus echo you</p>
      )}
      {!isRecording && !echoing && (
        <p className="mt-2 text-center text-[10px] font-medium text-ink-soft">poke · drag to pet · quick taps to tickle · feed a star · talk to it</p>
      )}
    </motion.div>
  );
}

/* ─── 6. Memory Garden ────────────────────────────────────────────── */

const GARDEN_STICKERS = [
  { emoji: "❤️", label: "heart" }, { emoji: "⭐", label: "star" }, { emoji: "🐰", label: "bunny" },
  { emoji: "🌸", label: "flower" }, { emoji: "☁️", label: "cloud" }, { emoji: "🐻", label: "bear" },
];
interface Card { id: number; sticker: (typeof GARDEN_STICKERS)[number]; flipped: boolean; matched: boolean; }
function shuffleCards(): Card[] {
  const pairs = GARDEN_STICKERS.flatMap((s, i) => [
    { id: i * 2, sticker: s, flipped: false, matched: false },
    { id: i * 2 + 1, sticker: s, flipped: false, matched: false },
  ]);
  for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
  return pairs;
}

function MemoryGarden() {
  const [cards, setCards] = useState<Card[]>(() => shuffleCards());
  const [selected, setSelected] = useState<number[]>([]);
  const [matched, setMatched] = useState(0);
  const lockRef = useRef(false);

  const selectCard = (id: number) => {
    if (lockRef.current) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched || selected.includes(id)) return;
    const next = [...selected, id]; setSelected(next);
    sfxFlip();
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    if (next.length === 2) {
      lockRef.current = true; const [first, second] = next;
      const a = cards.find((c) => c.id === first)!; const b = cards.find((c) => c.id === second)!;
      if (a.sticker.label === b.sticker.label) {
        setTimeout(() => { setCards((prev) => prev.map((c) => (c.id === first || c.id === second ? { ...c, matched: true, flipped: true } : c))); sfxSparkle(); setMatched((m) => m + 1); setSelected([]); lockRef.current = false; }, 500);
      } else {
        setTimeout(() => { setCards((prev) => prev.map((c) => (c.id === first || c.id === second ? { ...c, flipped: false } : c))); setSelected([]); lockRef.current = false; }, 800);
      }
    }
  };
  const replant = useTapGuard(() => { setCards(shuffleCards()); setSelected([]); setMatched(0); }, 500);
  const allMatched = matched === GARDEN_STICKERS.length;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-mint-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-xs text-blush-200 animate-twinkle" style={{ animationDelay: "1s" }} aria-hidden>✧</span>
      <GameIntro emoji="🌱" title="Memory Garden" sub="flip two cards — when they match, they plant into your garden" />
      <div className="mt-6 grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <motion.button key={card.id} type="button" onClick={() => selectCard(card.id)} disabled={card.matched}
            whileHover={!card.matched ? { scale: 1.05 } : undefined} whileTap={!card.matched ? { scale: 0.93 } : undefined}
            className={cn("aspect-square flex items-center justify-center rounded-xl text-2xl transition-all duration-200",
              card.matched ? "bg-[#B4E0D0]/60 shadow-inner" : card.flipped ? "bg-white/80 shadow-[0_2px_8px_rgba(180,200,220,0.3)]" : "bg-[#E8E0F0]/60 shadow-[0_2px_8px_rgba(180,180,220,0.2)] cursor-pointer hover:bg-[#E0D8EC]/80")}>
            {card.matched ? <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="text-xl">🌸</motion.span>
              : card.flipped ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>{card.sticker.emoji}</motion.span>
              : <span className="text-lg opacity-40">🌱</span>}
          </motion.button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#B4E0D0]/30 py-2">
        {GARDEN_STICKERS.map((_, i) => (<motion.span key={i} initial={false} animate={i < matched ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.6, opacity: 0.2, y: 4 }} className="text-xl">🌸</motion.span>))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-mint-500">{matched}/{GARDEN_STICKERS.length} planted</p>
        {allMatched ? <button type="button" onClick={replant} className="clay-btn px-4 py-2 text-xs font-bold text-white">plant again 🌱</button> : <span className="text-xs font-medium text-ink-soft">no rush — take your time</span>}
      </div>
      {allMatched && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center text-sm font-bold text-mint-500">your feeling garden is in bloom 🌸</motion.p>}
    </motion.div>
  );
}


/* ─── Soft Coloring ─────────────────────────────────────────────── */

const COLORING_PALETTES = [
  "#F3B8C9", "#BCA9EE", "#A8CFEF", "#BFE5DC", "#F0AFC6",
  "#9CCBE8", "#B7ADEF", "#F2BE93", "#E8D0E8", "#C8E8C0",
];

const COLORING_PICTURES: { id: string; name: string; regions: { d: string; fill: string }[] }[] = [
  { id: "cat", name: "Cat", regions: [
    { d: "M50,20 L30,5 L10,25 L25,35 Z", fill: "" },
    { d: "M90,20 L110,5 L130,25 L115,35 Z", fill: "" },
    { d: "M50,35 Q70,10 90,35 Q95,60 90,80 Q70,95 50,80 Q45,60 50,35 Z", fill: "" },
    { d: "M58,50 A4,4 0 1,1 58,50.01 Z", fill: "" },
    { d: "M78,50 A4,4 0 1,1 78,50.01 Z", fill: "" },
    { d: "M65,62 Q70,68 75,62", fill: "" },
    { d: "M30,80 Q20,100 35,105 Q50,110 50,95 Z", fill: "" },
    { d: "M110,80 Q120,100 105,105 Q90,110 90,95 Z", fill: "" },
  ]},
  { id: "heart", name: "Heart", regions: [
    { d: "M70,30 Q70,10 50,10 Q30,10 30,30 Q30,50 70,80 Q110,50 110,30 Q110,10 90,10 Q70,10 70,30 Z", fill: "" },
  ]},
  { id: "flower", name: "Flower", regions: [
    { d: "M70,35 Q60,10 70,5 Q80,10 70,35 Z", fill: "" },
    { d: "M90,50 Q110,40 115,55 Q100,65 90,50 Z", fill: "" },
    { d: "M85,75 Q105,85 95,95 Q80,90 85,75 Z", fill: "" },
    { d: "M55,75 Q35,85 45,95 Q60,90 55,75 Z", fill: "" },
    { d: "M50,50 Q30,40 25,55 Q40,65 50,50 Z", fill: "" },
    { d: "M65,55 A10,10 0 1,1 75,55 A10,10 0 1,1 65,55 Z", fill: "" },
    { d: "M68,65 L66,95 L74,95 L72,65 Z", fill: "" },
  ]},
  { id: "moon", name: "Moon", regions: [
    { d: "M60,10 Q95,10 100,50 Q105,90 60,100 Q40,85 45,50 Q50,15 60,10 Z", fill: "" },
    { d: "M55,30 A5,5 0 1,1 55,30.01 Z", fill: "" },
    { d: "M75,55 A3,3 0 1,1 75,55.01 Z", fill: "" },
    { d: "M60,70 A4,4 0 1,1 60,70.01 Z", fill: "" },
  ]},
  { id: "cloud", name: "Cloud House", regions: [
    { d: "M30,60 Q20,40 40,35 Q45,15 70,15 Q95,15 100,35 Q120,40 110,60 Z", fill: "" },
    { d: "M55,60 L55,90 L85,90 L85,60 Z", fill: "" },
    { d: "M62,72 L62,82 L78,82 L78,72 Z", fill: "" },
  ]},
  { id: "butterfly", name: "Butterfly", regions: [
    { d: "M70,40 Q40,10 20,40 Q10,70 40,80 Q55,85 70,70 Z", fill: "" },
    { d: "M70,40 Q100,10 120,40 Q130,70 100,80 Q85,85 70,70 Z", fill: "" },
    { d: "M70,70 Q50,90 45,105 Q55,100 70,85 Q85,100 95,105 Q90,90 70,70 Z", fill: "" },
    { d: "M68,40 L68,85 M72,40 L72,85", fill: "" },
  ]},
];

function SoftColoring() {
  const [picIdx, setPicIdx] = useState(0);
  const palette = COLORING_PALETTES;
  const [selectedColor, setSelectedColor] = useState(palette[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);

  const pic = COLORING_PICTURES[picIdx];

  const fillRegion = (regionIdx: number) => {
    const key = `${pic.id}-${regionIdx}`;
    if (fills[key] === selectedColor) return;
    sfxFill();
    setHistory((h) => [...h, { ...fills }]);
    setFills((f) => ({ ...f, [key]: selectedColor }));
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFills(prev);
    setHistory((h) => h.slice(0, -1));
  };

  const clearAll = () => {
    setHistory((h) => [...h, { ...fills }]);
    setFills({});
  };

  const savePic = () => {
    const data = { picture: pic.id, fills };
    safeSetItem("venting-coloring-" + pic.id, JSON.stringify(data));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <GameIntro emoji="🎨" title="Soft Coloring" sub="tap a color, then tap a region to fill it" />
      <p className="text-center text-xs font-bold text-ink-soft">picture: {pic.name}</p>
      <div className="flex justify-center">
        <svg viewBox="0 0 140 110" className="w-full max-w-xs rounded-2xl bg-white/60 border border-lavender-200/50" style={{ touchAction: "manipulation" }}>
          {pic.regions.map((r, i) => {
            const key = `${pic.id}-${i}`;
            const fill = fills[key] || "#F0F0F0";
            return (
              <path key={i} d={r.d} fill={fill} stroke="#9AA5D6" strokeWidth="1.5" className="cursor-pointer transition-colors" onClick={() => fillRegion(i)} />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {palette.map((c) => (
          <button key={c} type="button" onClick={() => setSelectedColor(c)}
            className={cn("h-8 w-8 rounded-full border-2 transition-transform hover:scale-110", selectedColor === c ? "border-ink-deep scale-110 shadow-md" : "border-white/70")}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={undo} disabled={history.length === 0}
          className="clay-chip rounded-full px-3 py-1.5 text-xs font-bold text-ink-deep disabled:opacity-40">undo</button>
        <button type="button" onClick={clearAll}
          className="clay-chip rounded-full px-3 py-1.5 text-xs font-bold text-ink-deep">clear</button>
        <button type="button" onClick={savePic}
          className="clay-btn px-3 py-1.5 text-xs font-bold text-white">save to vault</button>
        <button type="button" onClick={() => { setPicIdx((p) => (p + 1) % COLORING_PICTURES.length); setFills({}); setHistory([]); }}
          className="clay-chip rounded-full px-3 py-1.5 text-xs font-bold text-ink-deep">new picture</button>
      </div>
    </motion.div>
  );
}

/* Bloom Garden now lives in @/components/MyLittlePlant (one daily-growing plant). */

/* ─── Pond Pals ─────────────────────────────────────────────── */

const POND_CATCHES = [
  { emoji: "🐟", name: "Goldfish", msg: "a tiny friend with a big smile" },
  { emoji: "🐸", name: "Frog", msg: "ribbit! thanks for the visit" },
  { emoji: "⭐", name: "Starfish", msg: "you found a star from the sea" },
  { emoji: "🐢", name: "Turtle", msg: "slow and steady, always calm" },
  { emoji: "🍾", name: "Message in a Bottle", msg: "someone left you a kind note" },
  { emoji: "🥾", name: "Old Boot", msg: "someone lost this! but it makes a nice planter" },
  { emoji: "🐙", name: "Octopus", msg: "eight arms, eight hugs" },
  { emoji: "🦀", name: "Crab", msg: "snapping with joy to meet you" },
];

const POND_SHELF_KEY = "venting-pond-pals";

function PondPals() {
  const [state, setState] = useState<"idle" | "cast" | "nibble" | "caught">("idle");
  const [catch_, setCatch] = useState<typeof POND_CATCHES[0] | null>(null);
  const [shelf, setShelf] = useState<string[]>(() => {
    try { const r = safeGetItem(POND_SHELF_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cast = () => {
    sfxSplash();
    setState("cast");
    const delay = 1000 + Math.random() * 2000;
    timerRef.current = setTimeout(() => setState("nibble"), delay);
  };

  const reel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const c = POND_CATCHES[Math.floor(Math.random() * POND_CATCHES.length)];
    setCatch(c);
    setState("caught");
    const next = [...new Set([...shelf, c.name])];
    setShelf(next);
    safeSetItem(POND_SHELF_KEY, JSON.stringify(next));
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const reset = () => { setState("idle"); setCatch(null); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <GameIntro emoji="🎣" title="Pond Pals" sub="cast a line into the calm pond, meet little friends" />
      <div className="relative mx-auto flex h-48 w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-[#A8D8EA]/60 to-[#88C0D8]/80 border border-[#88C0D8]/40">
        {/* ripples */}
        {(state === "cast" || state === "nibble") && (
          <motion.div initial={{ scale: 0.5, opacity: 0.6 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute h-8 w-8 rounded-full border-2 border-white/40" />
        )}
        {state === "idle" && (
          <button type="button" onClick={cast}
            className="clay-btn px-6 py-3 text-sm font-bold text-white">🎣 cast</button>
        )}
        {state === "cast" && (
          <span className="text-2xl">🪝</span>
        )}
        {state === "nibble" && (
          <motion.button type="button" onClick={reel} initial={{ scale: 1 }} animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="clay-btn px-6 py-3 text-sm font-bold text-white">
            something's nibbling… tap!
          </motion.button>
        )}
        {state === "caught" && catch_ && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-center">
            <span className="text-4xl">{catch_.emoji}</span>
            <p className="mt-1 text-sm font-bold text-white">{catch_.name}</p>
            <p className="mt-0.5 text-xs text-white/80">{catch_.msg}</p>
          </motion.div>
        )}
      </div>
      {state === "caught" && (
        <button type="button" onClick={reset}
          className="clay-btn w-full py-2.5 text-sm font-bold text-white">cast again 🎣</button>
      )}
      {shelf.length > 0 && (
        <div className="clay-card rounded-2xl p-3 space-y-2">
          <p className="text-[11px] font-bold text-ink-soft">friends met ({shelf.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {shelf.map((name) => {
              const c = POND_CATCHES.find((x) => x.name === name);
              return (
                <span key={name} className="clay-chip flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-ink-deep">
                  <span>{c?.emoji}</span> {name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Cloud Stack ─────────────────────────────────────────────── */

function CloudStack() {
  const [stack, setStack] = useState<number[]>([]);
  const [cloudX, setCloudX] = useState(50);
  const [dir, setDir] = useState(1);
  const [wobble, setWobble] = useState<number | null>(null);
  const [visitors, setVisitors] = useState<string[]>([]);
  const rafRef = useRef<number>(0);
  const speedRef = useRef(0.4);

  // Animate cloud
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 16;
      last = now;
      setCloudX((x) => {
        let nx = x + dir * speedRef.current * dt;
        if (nx > 90) { setDir(-1); nx = 90; }
        if (nx < 10) { setDir(1); nx = 10; }
        return nx;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dir]);

  const drop = () => {
    sfxPlop();
    const x = cloudX;
    setStack((s) => {
      const next = [...s, x];
      // Every 5 clouds, a visitor appears
      if (next.length % 5 === 0) {
        const v = Math.random() < 0.5 ? "🐦" : "⭐";
        setVisitors((vs) => [...vs, v]);
        setTimeout(() => setVisitors((vs) => vs.slice(1)), 3000);
      }
      return next;
    });
    setWobble(stack.length);
    setTimeout(() => setWobble(null), 400);
    // Speed up slightly
    speedRef.current = Math.min(1.5, 0.4 + stack.length * 0.05);
  };

  const skyHue = 200 + stack.length * 3;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <GameIntro emoji="☁️" title="Cloud Stack" sub="stack soft clouds into a cozy tower" />
      <div className="relative mx-auto h-80 w-full max-w-sm overflow-hidden rounded-3xl border border-white/30"
        style={{ background: `linear-gradient(180deg, hsl(${skyHue},50%,85%) 0%, hsl(${skyHue + 20},40%,92%) 100%)` }}>
        {/* Stacked clouds */}
        {stack.map((x, i) => (
          <motion.div key={i}
            initial={{ y: -20, scale: 1.1 }}
            animate={{ y: 0, scale: wobble === i ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="absolute rounded-full bg-white/90 shadow-md"
            style={{
              left: `${x}%`,
              bottom: `${10 + i * 28}px`,
              width: "80px",
              height: "32px",
              transform: "translateX(-50%)",
            }} />
        ))}
        {/* Visitor */}
        {visitors.length > 0 && (
          <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-4 text-2xl"
            style={{ bottom: `${10 + stack.length * 28 + 20}px` }}>
            {visitors[visitors.length - 1]}
          </motion.span>
        )}
        {/* Sliding cloud */}
        <motion.div
          className="absolute top-4 h-10 w-20 rounded-full bg-white/95 shadow-lg cursor-pointer"
          style={{ left: `${cloudX}%`, transform: "translateX(-50%)" }}
          onClick={drop}
          whileTap={{ scale: 0.9 }} />
        <button type="button" onClick={drop}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 clay-btn px-5 py-2 text-xs font-bold text-white">
          drop ☁️
        </button>
      </div>
      <p className="text-center text-sm font-bold text-ink-deep">{stack.length} clouds high</p>
    </motion.div>
  );
}


/* ─── 11. Jelly Bounce ──────────────────────────────────────────── */

function JellyBounce() {
  const [bounces, setBounces] = useState(0);
  const [squash, setSquash] = useState(1);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);

  const bounce = useTapGuard(() => {
    sfxBoing();
    setBounces((b) => b + 1);
    setSquash(0.6);
    setTimeout(() => setSquash(1.3), 120);
    setTimeout(() => setSquash(1), 300);
    const id = nextId.current++;
    setSparkles((prev) => [...prev.slice(-6), { id, x: 40 + Math.random() * 20, y: 20 + Math.random() * 20 }]);
    setTimeout(() => setSparkles((prev) => prev.filter((s) => s.id !== id)), 700);
    sfxSparkle();
  }, 150);

  const messages = ["boing boing!", "squish and fly!", "the jelly is happy!", "keep bouncing!", "soft and wobbly!", "jelly goes up!", "cute little bounce!", "wobble wobble!"];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-blush-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "1s" }} aria-hidden>✧</span>
      <GameIntro emoji="🍮" title="Jelly Bounce" sub="tap the jelly — boing boing boing!" />
      <div className="relative mt-6 flex h-56 items-center justify-center" onClick={bounce}>
        <div className="absolute bottom-8 left-1/2 h-3 w-40 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#E8B4C8] via-[#F3B8C9] to-[#E8B4C8] shadow-[0_4px_12px_rgba(200,140,180,0.4)]" />
        <motion.div animate={{ scaleY: squash, scaleX: 2 - squash }} transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className="relative cursor-pointer select-none text-7xl" style={{ transformOrigin: "bottom center" }}>🍮</motion.div>
        {sparkles.map((s) => (
          <motion.span key={s.id} initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.6 }} className="absolute text-xl pointer-events-none"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}>✨</motion.span>
        ))}
      </div>
      <p className="text-center text-sm font-bold text-ink-deep">🍮 {bounces} boings</p>
      <p className="mt-1 text-center text-xs font-medium text-ink-soft">{messages[bounces % messages.length]}</p>
    </motion.div>
  );
}

/* ─── 12. Chime Plinko ──────────────────────────────────────────── */

interface PlinkoMarble { id: number; x: number; y: number; lane: number; }
const PLINKO_COLS = 7;
const PEG_FREQS = [523, 587, 659, 784, 880, 988, 1047];

function ChimePlinko() {
  const [marbles, setMarbles] = useState<PlinkoMarble[]>([]);
  const [drops, setDrops] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMarbles((prev) => {
        const updated = prev.map((m) => ({ ...m, y: m.y + 2 }));
        const landed = updated.filter((m) => m.y >= 100);
        if (landed.length > 0) landed.forEach((m) => sfxChime(PEG_FREQS[m.lane % PLINKO_COLS]));
        return updated.filter((m) => m.y < 100);
      });
    }, 50);
    return () => clearInterval(t);
  }, []);

  const dropMarble = useTapGuard((e: React.MouseEvent) => {
    if (marbles.length >= 3) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xPct = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const lane = Math.floor((xPct / 100) * PLINKO_COLS);
    setMarbles((prev) => [...prev, { id: nextId.current++, x: xPct, y: 5, lane }]);
    setDrops((d) => d + 1);
    sfxPop(1.1);
  }, 300);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 right-10 text-sm text-sky-200 animate-twinkle" aria-hidden>✦</span>
      <GameIntro emoji="🎐" title="Chime Plinko" sub="tap the board to drop a marble — each one makes a little melody" />
      <div className="relative mt-6 h-72 overflow-hidden rounded-2xl bg-gradient-to-b from-[#D8E8F8] to-[#E8F0F8] cursor-pointer" onClick={dropMarble}>
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: PLINKO_COLS }).map((_, col) => (
            <span key={`${row}-${col}`} className="absolute h-3 w-3 rounded-full bg-[#B8C8E8]/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]"
              style={{ left: `${8 + col * 13}%`, top: `${15 + row * 16}%` }} aria-hidden />
          ))
        )}
        {marbles.map((m) => (
          <motion.span key={m.id} initial={{ y: 0 }} animate={{ y: `${m.y}%` }}
            className="absolute h-5 w-5 rounded-full bg-gradient-to-br from-[#A8CFEF] to-[#7CB8E0] shadow-[0_2px_6px_rgba(100,160,200,0.5)]"
            style={{ left: `${m.x}%`, top: 0, transform: "translateX(-50%)" }} />
        ))}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#C4D8F0]/60 to-transparent" />
      </div>
      <p className="mt-4 text-center text-sm font-bold text-ink-deep">🎵 {drops} chimes heard</p>
      <p className="mt-1 text-center text-xs font-medium text-ink-soft">tap anywhere along the top to drop — up to 3 at once</p>
    </motion.div>
  );
}

/* ─── 13. Animal Band ───────────────────────────────────────────── */

const BAND_ANIMALS = [
  { emoji: "🐱", name: "Cat", freq: 330 },
  { emoji: "🐦", name: "Bird", freq: 523 },
  { emoji: "🐸", name: "Frog", freq: 220 },
  { emoji: "🐻", name: "Bear", freq: 165 },
  { emoji: "🐭", name: "Mouse", freq: 784 },
  { emoji: "🦆", name: "Duck", freq: 294 },
];

function AnimalBand() {
  const [dancing, setDancing] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const danceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const playAnimal = (idx: number) => {
    const a = BAND_ANIMALS[idx];
    sfxChime(a.freq);
    setDancing(idx);
    clearTimeout(danceTimer.current);
    danceTimer.current = setTimeout(() => setDancing(null), 600);
  };

  const playTogether = useTapGuard(() => {
    if (playing) return;
    setPlaying(true);
    const melody = [0, 3, 1, 4, 2, 5, 0, 2];
    melody.forEach((animalIdx, i) => {
      setTimeout(() => playAnimal(animalIdx), i * 300);
    });
    setTimeout(() => setPlaying(false), melody.length * 300 + 600);
  }, 200);

  useEffect(() => () => clearTimeout(danceTimer.current), []);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-mint-200 animate-twinkle" aria-hidden>✦</span>
      <GameIntro emoji="🐾" title="Animal Band" sub="tap each friend to hear their voice — or let them play together" />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {BAND_ANIMALS.map((a, i) => (
          <motion.button key={i} type="button" onClick={() => playAnimal(i)}
            animate={dancing === i ? { rotate: [0, -8, 8, -4, 4, 0], y: [0, -6, 0] } : { y: [0, -3, 0] }}
            transition={dancing === i ? { duration: 0.5 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-white/60 shadow-[0_4px_12px_rgba(180,200,220,0.3)] transition-transform hover:scale-105 active:scale-95">
            <span className="text-3xl">{a.emoji}</span>
            <span className="mt-0.5 text-[9px] font-bold text-ink-soft">{a.name}</span>
          </motion.button>
        ))}
      </div>
      <div className="mt-5 flex justify-center">
        <button type="button" onClick={playTogether} disabled={playing}
          className="clay-btn px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {playing ? "🎶 playing…" : "🎶 play together"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-medium text-ink-soft">tap each animal · or let them all play a gentle song</p>
    </motion.div>
  );
}

/* ─── 14. Firework Sky ──────────────────────────────────────────── */

interface Firework { id: number; x: number; y: number; color: string; size: number; }
const FW_COLORS = ["#F3B8C9", "#BCA9EE", "#A8CFEF", "#BFE5DC", "#F0AFC6", "#B7ADEF", "#F2BE93"];

function FireworkSky() {
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [stars] = useState<{ id: number; x: number; y: number; delay: number }[]>(() =>
    Array.from({ length: 20 }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 70, delay: Math.random() * 4 }))
  );
  const nextId = useRef(0);
  const holdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sizeRef = useRef(1);

  const launch = () => {
    sizeRef.current = 1;
    holdRef.current = setTimeout(() => { sizeRef.current = 2; }, 300);
  };

  const release = (e: React.PointerEvent) => {
    clearTimeout(holdRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    const size = sizeRef.current;
    const id = nextId.current++;
    setFireworks((prev) => [...prev.slice(-15), { id, x, y, color, size }]);
    sfxChime(440 + Math.random() * 400);
    sfxPop(1.2);
    setTimeout(() => setFireworks((prev) => prev.filter((f) => f.id !== id)), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden px-5 py-7">
      <GameIntro emoji="🎆" title="Firework Sky" sub="tap the night — bloom soft light · hold longer for bigger blooms" />
      <div className="relative mt-6 h-72 overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a1a3e] via-[#2a2a5a] to-[#3a3a7a] cursor-pointer select-none"
        onPointerDown={launch} onPointerUp={release}>
        {stars.map((s) => (
          <span key={s.id} className="absolute text-xs text-white/60 animate-twinkle"
            style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.delay}s` }} aria-hidden>✦</span>
        ))}
        <motion.div animate={{ x: ["-10%", "110%"], y: ["20%", "10%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 8, ease: "linear" }}
          className="absolute h-0.5 w-8 -rotate-12 bg-gradient-to-r from-transparent via-white/60 to-white/90" />
        {fireworks.map((fw) => (
          <motion.div key={fw.id} initial={{ scale: 0, opacity: 1 }} animate={{ scale: fw.size * 2, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute pointer-events-none" style={{ left: `${fw.x}%`, top: `${fw.y}%`, transform: "translate(-50%, -50%)" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="absolute text-sm" style={{
                left: `${Math.cos((i / 8) * Math.PI * 2) * 20}px`,
                top: `${Math.sin((i / 8) * Math.PI * 2) * 20}px`,
              }} aria-hidden>{["✦", "✧", "○", "·"][i % 4]}</span>
            ))}
            <span className="absolute -translate-x-1/2 -translate-y-1/2 text-lg" style={{ color: fw.color }}>✦</span>
          </motion.div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-ink-soft">tap anywhere · hold for a bigger bloom · no limits, no rush</p>
    </motion.div>
  );
}
