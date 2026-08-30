import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import MusicWidget from "@/components/MusicWidget";
import { WORRY_BUBBLES } from "@/lib/art";
import { music } from "@/lib/music";
import { useTapGuard } from "@/lib/useTapGuard";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";

/* ─── Custom game types & storage ─────────────────────────────────── */

type World = "sky" | "sunset" | "starry" | "garden" | "sea" | "cozy";
type FloatingThing = "bubbles" | "stars" | "clouds" | "petals" | "fireflies" | "hearts" | "fish";
type TouchAction = "pop" | "catch" | "note" | "blow" | "soothe";
type GameSound = "chimes" | "rain" | "wind" | "piano" | "none";
type GamePace = "very-slow" | "slow" | "medium";

interface CustomGameConfig {
  id: string;
  name: string;
  world: World;
  thing: FloatingThing;
  touch: TouchAction;
  sound: GameSound;
  pace: GamePace;
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

const TOUCHES: { id: TouchAction; emoji: string; label: string }[] = [
  { id: "pop", emoji: "💥", label: "Pop it" },
  { id: "catch", emoji: "🫳", label: "Catch it" },
  { id: "note", emoji: "🎵", label: "Play a note" },
  { id: "blow", emoji: "🌬️", label: "Blow it away" },
  { id: "soothe", emoji: "😊", label: "Soothe it" },
];

const SOUNDS: { id: GameSound; label: string }[] = [
  { id: "chimes", label: "Chimes" },
  { id: "rain", label: "Rain" },
  { id: "wind", label: "Wind" },
  { id: "piano", label: "Piano" },
  { id: "none", label: "None" },
];

const PACES: { id: GamePace; label: string; ms: number }[] = [
  { id: "very-slow", label: "Very slow", ms: 3000 },
  { id: "slow", label: "Slow", ms: 2000 },
  { id: "medium", label: "Medium", ms: 1200 },
];

function getThingEmoji(thing: FloatingThing): string {
  return THINGS.find((t) => t.id === thing)?.emoji ?? "✨";
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
    }
  } catch {
    /* audio unavailable */
  }
}

/* ─── Game registry ───────────────────────────────────────────────── */

type BuiltInGameId = "pop" | "tiles" | "moon" | "honeycomb" | "nimbus" | "garden";

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
];

/* ─── Main component ──────────────────────────────────────────────── */

type ScreenState =
  | { kind: "grid" }
  | { kind: "play"; game: BuiltInGameId }
  | { kind: "custom-play"; config: CustomGameConfig }
  | { kind: "builder"; editing?: CustomGameConfig }
  | { kind: "custom-play-saved"; config: CustomGameConfig };

export default function GamesScreen() {
  const [screen, setScreen] = useState<ScreenState>({ kind: "grid" });
  const [customGames, setCustomGames] = useState<CustomGameConfig[]>(loadCustomGames);

  useEffect(() => {
    return () => { music.stop(1000); };
  }, []);

  const openBuiltIn = useCallback((id: BuiltInGameId) => {
    setScreen({ kind: "play", game: id });
    music.playDefault();
  }, []);

  const openCustom = useCallback((config: CustomGameConfig) => {
    setScreen({ kind: "custom-play-saved", config });
    music.playDefault();
  }, []);

  const goGrid = useCallback(() => setScreen({ kind: "grid" }), []);

  const openBuilder = useCallback(() => {
    setScreen({ kind: "builder" });
  }, []);

  const openEditBuilder = useCallback((config: CustomGameConfig) => {
    setScreen({ kind: "builder", editing: config });
  }, []);

  const saveGame = useCallback((config: CustomGameConfig) => {
    setCustomGames((prev) => {
      const exists = prev.findIndex((g) => g.id === config.id);
      const next = exists >= 0 ? prev.map((g, i) => (i === exists ? config : g)) : [...prev, config];
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

  const previewConfig = useState<CustomGameConfig | null>(null);

  return (
    <div className="relative">
      <MusicWidget context="game" />

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
                        className={cn("clay-card group flex flex-col items-center gap-2 rounded-[1.8rem] px-4 py-5 sm:py-6 text-center transition-transform hover:-translate-y-0.5 h-full",
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
                    return (
                      <motion.div key={cg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className={cn("clay-card group flex flex-col items-center gap-2 rounded-[1.8rem] px-4 py-5 sm:py-6 text-center transition-transform hover:-translate-y-0.5 h-full relative",
                          last && "col-span-2 justify-self-center w-[calc(50%-0.375rem)]")}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openCustom(cg); }}
                          className="flex flex-col items-center gap-2 w-full">
                          <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl transition-transform group-hover:scale-110 tile-lavender">
                            <span aria-hidden className="drop-shadow-sm">{getThingEmoji(cg.thing)}</span>
                          </span>
                          <span className="text-sm sm:text-base font-bold tracking-tight text-ink-deep">{cg.name || "My Game"}</span>
                          <span className="text-[11px] sm:text-xs leading-snug font-medium text-ink-soft">{cg.thing} · {cg.touch}</span>
                        </button>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openEditBuilder(cg); }}
                            className="clay-chip h-6 w-6 rounded-full text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center justify-center">✎</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); deleteGame(cg.id); }}
                            className="clay-chip h-6 w-6 rounded-full text-[10px] font-bold text-[#C48B9E] hover:text-[#A06070] flex items-center justify-center">✕</button>
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
          {screen.game === "garden" && <MemoryGarden />}
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
        <GameBuilder
          initial={screen.editing ?? null}
          onSave={saveGame}
          onCancel={goGrid}
          onPreview={previewConfig[1]}
          previewConfig={previewConfig[0]}
        />
      )}
    </div>
  );
}

/* ─── Game Builder ────────────────────────────────────────────────── */

function GameBuilder({
  initial,
  onSave,
  onCancel,
  onPreview,
  previewConfig,
}: {
  initial: CustomGameConfig | null;
  onSave: (config: CustomGameConfig) => void;
  onCancel: () => void;
  onPreview: (config: CustomGameConfig | null) => void;
  previewConfig: CustomGameConfig | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [world, setWorld] = useState<World>(initial?.world ?? "sky");
  const [thing, setThing] = useState<FloatingThing>(initial?.thing ?? "stars");
  const [touch, setTouch] = useState<TouchAction>(initial?.touch ?? "catch");
  const [sound, setSound] = useState<GameSound>(initial?.sound ?? "chimes");
  const [pace, setPace] = useState<GamePace>(initial?.pace ?? "slow");

  // Update preview whenever options change
  useEffect(() => {
    const cfg: CustomGameConfig = {
      id: initial?.id ?? `custom-${Date.now()}`,
      name, world, thing, touch, sound, pace,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    onPreview(cfg);
  }, [name, world, thing, touch, sound, pace, initial, onPreview]);

  const buildConfig = (): CustomGameConfig => ({
    id: initial?.id ?? `custom-${Date.now()}`,
    name, world, thing, touch, sound, pace,
    createdAt: initial?.createdAt ?? Date.now(),
  });

  const handleSave = useTapGuard(() => {
    onSave(buildConfig());
  }, 500);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">← cancel</button>
        <p className="text-base font-bold text-ink-deep">✨ {initial ? "Edit your game" : "Create your own game"}</p>
      </div>

      {/* Live preview */}
      {previewConfig && (
        <div className="clay-card overflow-hidden rounded-[2.25rem] p-4">
          <p className="mb-2 text-xs font-bold text-ink-soft">Live preview</p>
          <div className={cn("relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b", getWorldGradient(previewConfig.world))}>
            <TinyGameEngine config={previewConfig} minimal />
          </div>
        </div>
      )}

      {/* Builder options */}
      <div className="clay-card rounded-[2.25rem] px-5 py-6 space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-ink-deep">Name (optional)</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="name your game…"
            maxLength={40} className="mt-1.5 w-full rounded-xl border-0 bg-[#FDF5E6]/70 px-3 py-2.5 text-sm text-ink-deep placeholder:text-ink-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]" />
        </div>

        {/* World */}
        <div>
          <label className="text-xs font-bold text-ink-deep">World</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {WORLDS.map((w) => (
              <button key={w.id} type="button" onClick={() => setWorld(w.id)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                  world === w.id ? "bg-[#5F6DBE] text-white shadow-md" : "clay-chip text-ink-deep hover:scale-105")}>
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Floating things */}
        <div>
          <label className="text-xs font-bold text-ink-deep">Floating things</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {THINGS.map((t) => (
              <button key={t.id} type="button" onClick={() => setThing(t.id)}
                className={cn("flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                  thing === t.id ? "bg-[#5F6DBE] text-white shadow-md" : "clay-chip text-ink-deep hover:scale-105")}>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Touch action */}
        <div>
          <label className="text-xs font-bold text-ink-deep">What touch does</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TOUCHES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTouch(t.id)}
                className={cn("flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                  touch === t.id ? "bg-[#5F6DBE] text-white shadow-md" : "clay-chip text-ink-deep hover:scale-105")}>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div>
          <label className="text-xs font-bold text-ink-deep">Sound</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SOUNDS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSound(s.id)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                  sound === s.id ? "bg-[#5F6DBE] text-white shadow-md" : "clay-chip text-ink-deep hover:scale-105")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pace */}
        <div>
          <label className="text-xs font-bold text-ink-deep">Pace</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PACES.map((p) => (
              <button key={p.id} type="button" onClick={() => setPace(p.id)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                  pace === p.id ? "bg-[#5F6DBE] text-white shadow-md" : "clay-chip text-ink-deep hover:scale-105")}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={handleSave}
          className="clay-btn flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-white">
          save to my games
        </button>
        <button type="button" onClick={() => onSave(buildConfig())}
          className="clay-btn-soft flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep">
          play it ✨
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Moonlight Glide music ──────────────────────────────────────── */

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
        // Slow ambient pad + occasional soft piano notes
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

        // Occasional piano notes
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
        // Low ambient drone
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
        // Soft filtered noise + distant chimes
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 400;
        const g = ctx.createGain(); g.gain.value = 0.05;
        noise.connect(filter); filter.connect(g); g.connect(ctx.destination);
        noise.start(); _moonNodes.push(noise); _moonGains.push(g);

        // Distant chimes
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
        // Music box tones — high, soft, slightly detuned
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

interface FloatingObj {
  id: number;
  x: number;
  y: number;
  opacity: number;
}

function TinyGameEngine({ config, minimal = false }: { config: CustomGameConfig; minimal?: boolean }) {
  const [objects, setObjects] = useState<FloatingObj[]>([]);
  const [counter, setCounter] = useState(0);
  const nextId = useRef(0);

  const paceMs = PACES.find((p) => p.id === config.pace)?.ms ?? 2000;

  // Spawn objects
  useEffect(() => {
    const timer = setInterval(() => {
      setObjects((prev) => {
        if (prev.length > 12) return prev;
        return [...prev, {
          id: nextId.current++,
          x: 5 + Math.random() * 90,
          y: -5,
          opacity: 0.9,
        }];
      });
    }, paceMs);
    return () => clearInterval(timer);
  }, [paceMs]);

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

  const handleTouch = (id: number) => {
    playCustomSound(config.sound);

    switch (config.touch) {
      case "pop":
        setObjects((prev) => prev.filter((o) => o.id !== id));
        break;
      case "catch":
        setObjects((prev) => prev.filter((o) => o.id !== id));
        setCounter((c) => c + 1);
        break;
      case "note":
        // note already played by playCustomSound
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

  const emoji = getThingEmoji(config.thing);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-b", getWorldGradient(config.world), minimal ? "h-full" : "h-72")}>
      {/* Objects */}
      {objects.map((obj) => (
        <motion.button
          key={obj.id}
          type="button"
          onClick={() => handleTouch(obj.id)}
          whileTap={{ scale: 0.7 }}
          className="absolute text-2xl transition-opacity duration-200 cursor-pointer"
          style={{ left: `${obj.x}%`, top: `${obj.y}%`, opacity: obj.opacity, transform: "translate(-50%, -50%)" }}
        >
          {emoji}
        </motion.button>
      ))}

      {!minimal && (
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <p className="text-sm font-bold text-white/80 drop-shadow-sm">
            {config.touch === "catch" ? `${emoji} ${counter} caught` : `${emoji} ${objects.length} floating`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Shared ──────────────────────────────────────────────────────── */

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
  const popped = worries.filter((w) => w.popped).length;
  const reset = useTapGuard(() => { setWorries((prev) => prev.map((w) => ({ ...w, popped: false }))); }, 400);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
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
                onClick={() => setWorries((prev) => prev.map((x) => (x.id === w.id ? { ...x, popped: true } : x)))}
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
        <button type="button" onClick={reset} className="clay-btn-soft rounded-full px-4 py-2 text-xs font-bold text-ink-deep">Fill them again</button>
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
    const ctx = tileAudioCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
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
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
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
        if (caughtItems.length > 0) { setCaught((c) => c + caughtItems.length); return updated.filter((it) => !caughtItems.some((c) => c.id === it.id) && it.y < 110); }
        return updated.filter((it) => it.y < 110);
      });
    }, 80);
    return () => clearInterval(t);
  }, [lane]);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
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
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, popped: true } : c)));
    const adjacent = new Set<number>(); if (id > 0) adjacent.add(id - 1); if (id < HEX_COUNT - 1) adjacent.add(id + 1);
    setNeighbors(adjacent); setTimeout(() => setNeighbors(new Set()), 300);
  };
  const refill = useTapGuard(() => { setCells((prev) => prev.map((c) => ({ ...c, popped: false }))); }, 500);
  const allPopped = poppedCount === HEX_COUNT;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
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
        {allPopped ? <button type="button" onClick={refill} className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-white">pour a new comb 🍯</button> : <span className="text-xs font-medium text-ink-soft">tap each cell</span>}
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
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
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
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    if (next.length === 2) {
      lockRef.current = true; const [first, second] = next;
      const a = cards.find((c) => c.id === first)!; const b = cards.find((c) => c.id === second)!;
      if (a.sticker.label === b.sticker.label) {
        setTimeout(() => { setCards((prev) => prev.map((c) => (c.id === first || c.id === second ? { ...c, matched: true, flipped: true } : c))); setMatched((m) => m + 1); setSelected([]); lockRef.current = false; }, 500);
      } else {
        setTimeout(() => { setCards((prev) => prev.map((c) => (c.id === first || c.id === second ? { ...c, flipped: false } : c))); setSelected([]); lockRef.current = false; }, 800);
      }
    }
  };
  const replant = useTapGuard(() => { setCards(shuffleCards()); setSelected([]); setMatched(0); }, 500);
  const allMatched = matched === GARDEN_STICKERS.length;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
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
        {allMatched ? <button type="button" onClick={replant} className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-white">plant again 🌱</button> : <span className="text-xs font-medium text-ink-soft">no rush — take your time</span>}
      </div>
      {allMatched && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center text-sm font-bold text-mint-500">your feeling garden is in bloom 🌸</motion.p>}
    </motion.div>
  );
}
