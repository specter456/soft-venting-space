import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { WorldPickerTile } from "@/components/WorldPickerTile";
import { FriendsPickerTile } from "@/components/FriendsPickerTile";
import { MagicPickerTile } from "@/components/MagicPickerTile";
import type {
  CustomGameConfig,
  World,
  FloatingThing,
  TouchAction,
  SparkleStyle,
  ObjectSize,
  GameSound,
  GamePace,
  WeatherLayer,
  ObjectAmount,
  DriftDirection,
} from "@/pages/app/GamesScreen";

const RECIPES: { id: string; name: string; preset: Partial<CustomGameConfig> }[] = [
  { id: "starry-catch", name: "starry catch", preset: { world: "starry", things: ["stars" as FloatingThing], touch: "catch" as TouchAction, sparkleStyle: "sparkles" as SparkleStyle, objectSize: "medium" as ObjectSize, sound: "chimes" as GameSound, pace: "slow" as GamePace, weather: "sparkles" as WeatherLayer, amount: "some" as ObjectAmount, drift: "down" as DriftDirection } },
  { id: "petal-rain",   name: "petal rain",   preset: { world: "garden", things: ["petals" as FloatingThing], touch: "blow" as TouchAction, sparkleStyle: "hearts" as SparkleStyle, objectSize: "medium" as ObjectSize, sound: "wind" as GameSound, pace: "medium" as GamePace, weather: "petals" as WeatherLayer, amount: "some" as ObjectAmount, drift: "wander" as DriftDirection } },
  { id: "firefly-jar",  name: "firefly jar",  preset: { world: "starry", things: ["fireflies" as FloatingThing], touch: "soothe" as TouchAction, sparkleStyle: "sparkles" as SparkleStyle, objectSize: "small" as ObjectSize, sound: "piano" as GameSound, pace: "slow" as GamePace, weather: "none" as WeatherLayer, amount: "few" as ObjectAmount, drift: "up" as DriftDirection } },
  { id: "bubble-sea",   name: "bubble sea",   preset: { world: "sea", things: ["bubbles" as FloatingThing], touch: "pop" as TouchAction, sparkleStyle: "ripples" as SparkleStyle, objectSize: "medium" as ObjectSize, sound: "rain" as GameSound, pace: "slow" as GamePace, weather: "none" as WeatherLayer, amount: "many" as ObjectAmount, drift: "up" as DriftDirection } },
];

function guideLine(id: string | null): string {
  const map: Record<string, string> = {
    sky: "a soft blue day ☁️",
    sunset: "golden hour, warm glow 🌅",
    starry: "a quiet night sky 🌙",
    garden: "a gentle garden · soft and green 🌿",
    sea: "ripples and breeze · very calm 🌊",
    cozy: "a warm little room, safe and soft 🕯️",
    bubbles: "bubbles! i love bubbles 🫧",
    stars: "ooh, starry night ✨",
    clouds: "soft clouds floating by ☁️",
    petals: "petals, so gentle 🌸",
    fireflies: "little fireflies flickering ✨",
    hearts: "hearts, always hearts 💜",
    fish: "little fish darting about 🐟",
    pop: "pop them gently",
    soothe: "soothe them until calm",
    sparkles: "twinkly sparkles",
    ripples: "soft ripples",
    notes: "music notes drift by",
  };
  return map[id as keyof typeof map] ?? "";
}

export function BuilderGuide({ phaseId }: { phase: 1 | 2 | 3; phaseId: string | null }) {
  const line = guideLine(phaseId);
  return (
    <div className="clay-chip flex items-center gap-2 rounded-full bg-[var(--theme-card, rgba(255,255,255,0.65))] px-3 py-1 text-sm font-medium text-ink-soft">
      <span className="scaling-emoji text-base" aria-hidden>☁️</span>
      <span>{line || "pick something lovely"}</span>
    </div>
  );
}

export function StarterRow({ onApply, current }: { onApply: (preset: Partial<CustomGameConfig>) => void; current?: Partial<CustomGameConfig> }) {    const applied = (preset: Partial<CustomGameConfig>) => onApply(preset);
  return (
    <div className="clay-card px-5 py-4 space-y-3">
      <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">or start from a recipe 🍳</p>
      <div className="flex flex-wrap gap-2">
        {RECIPES.map((r) => {
          const p = r.preset as Partial<CustomGameConfig>;
          const chosen = current && (
            current.world === p.world &&
            current.touch === p.touch &&
            current.sound === p.sound &&
            current.pace === p.pace &&
            Array.isArray(p.things) &&
            Array.isArray(current.things) &&
            current.things.length === p.things.length &&
            p.things.every((t: unknown) => (current.things as unknown[]).includes(t))
          );
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => applied(r.preset)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition-transform",
                chosen
                  ? "bg-[var(--theme-accent, #5F6DBE)] text-white shadow-md"
                  : "bg-[var(--theme-card, rgba(255,255,255,0.65))] text-ink-deep hover:bg-white/80 hover:scale-[1.02] active:scale-95",
              )}
            >
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAME_PLACEHOLDERS: Record<World, string> = {
  sky: "my soft sky",
  sunset: "my golden hour",
  starry: "my starry night",
  garden: "my petal garden",
  sea: "my bubble sea",
  cozy: "my cozy corner",
};

/* ─── Little emoji dictionaries for the summary chips ─────────────── */

const WORLD_EMOJI: Record<World, string> = {
  sky: "☁️", sunset: "🌅", starry: "🌙", garden: "🌿", sea: "🌊", cozy: "🕯️",
};
const THING_EMOJI: Record<string, string> = {
  bubbles: "🫧", stars: "⭐", clouds: "☁️", petals: "🌸", fireflies: "✨", hearts: "💜", fish: "🐟",
};
const TOUCH_EMOJI: Record<string, string> = {
  pop: "💥", catch: "🫳", note: "🎵", blow: "🌬️", soothe: "😊",
};
const WEATHER_EMOJI: Record<string, string> = {
  petals: "🌸", snow: "❄️", sparkles: "✨", rain: "🌧️",
};

const STEP_LABELS = ["world", "friends", "magic", "name & save"] as const;

interface BuilderShellProps {
  initial: CustomGameConfig | null;
  onCreate: (config: CustomGameConfig) => void;
  onCancel: () => void;
  onPlay?: (config: CustomGameConfig) => void;
  /** Reports the live draft so the parent can render the preview. */
  onDraft?: (config: CustomGameConfig) => void;
}

export function BuilderShell({
  initial,
  onCreate,
  onCancel,
  onPlay = () => {},
  onDraft,
}: BuilderShellProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState(initial?.name ?? "");
  const [world, setWorld] = useState<World>(initial?.world ?? "sky");
  const [friends, setFriends] = useState<FloatingThing[]>(initial?.things ?? ["stars"]);
  const [touch, setTouch] = useState<TouchAction>(initial?.touch ?? "catch");
  const [sparkleStyle, setSparkleStyle] = useState<SparkleStyle>(initial?.sparkleStyle ?? "sparkles");
  const [objectSize, setObjectSize] = useState<ObjectSize>(initial?.objectSize ?? "medium");
  const [sound, setSound] = useState<GameSound>(initial?.sound ?? "chimes");
  const [pace, setPace] = useState<GamePace>(initial?.pace ?? "slow");
  const [weather, setWeather] = useState<WeatherLayer>(initial?.weather ?? "none");
  const [amount, setAmount] = useState<ObjectAmount>(initial?.amount ?? "some");
  const [drift, setDrift] = useState<DriftDirection>(initial?.drift ?? "down");
  const [worldPhoto, setWorldPhoto] = useState<string | undefined>(initial?.worldPhoto);
  const [myDoodle, setMyDoodle] = useState<string | undefined>(initial?.myDoodle);
  const [showDoodleCanvas, setShowDoodleCanvas] = useState(false);
  const [whisper, setWhisper] = useState(initial?.whisper ?? "");
  const worldPhotoRef = useRef<HTMLInputElement>(null);

  /** Always reflects the current choices — never drops edits. */
  const lastConfig = useMemo<CustomGameConfig>(
    () => ({
      id: initial?.id ?? "",
      name: name.trim(),
      world,
      things: friends,
      touch,
      sparkleStyle,
      objectSize,
      whisper: whisper.trim(),
      sound,
      pace,
      weather,
      amount,
      drift,
      worldPhoto,
      myDoodle,
      createdAt: initial?.createdAt ?? 0,
    }),
    [name, whisper, world, friends, touch, sparkleStyle, objectSize, sound, pace, weather, amount, drift, worldPhoto, myDoodle, initial],
  );

  // Feed the live preview above the builder.
  useEffect(() => {
    onDraft?.(lastConfig);
  }, [onDraft, lastConfig]);

  /** Stamp id/createdAt at save/play time — never during render. */
  const finalize = useCallback((cfg: CustomGameConfig): CustomGameConfig => {
    const now = Date.now();
    return { ...cfg, id: cfg.id || `custom-${now}`, createdAt: cfg.createdAt || now };
  }, []);

  const handleApply = useCallback((preset: Partial<CustomGameConfig>) => {
    if (preset.world) setWorld(preset.world as World);
    if (preset.things) setFriends(preset.things as FloatingThing[]);
    if (preset.touch) setTouch(preset.touch as TouchAction);
    if (preset.sparkleStyle) setSparkleStyle(preset.sparkleStyle as SparkleStyle);
    if (preset.objectSize) setObjectSize(preset.objectSize as ObjectSize);
    if (preset.sound) setSound(preset.sound as GameSound);
    if (preset.pace) setPace(preset.pace as GamePace);
    if (preset.weather) setWeather(preset.weather as WeatherLayer);
    if (preset.amount) setAmount(preset.amount as ObjectAmount);
    if (preset.drift) setDrift(preset.drift as DriftDirection);
  }, []);

  const summaryChips: { key: string; emoji: string; text: string }[] = [
    { key: "world", emoji: WORLD_EMOJI[world], text: `${world} world` },
    ...friends.map((f) => ({ key: `f-${f}`, emoji: THING_EMOJI[f] ?? "✨", text: f })),
    { key: "touch", emoji: TOUCH_EMOJI[touch] ?? "👆", text: touch },
    { key: "sparkle", emoji: "✨", text: sparkleStyle },
    ...(weather !== "none"
      ? [{ key: "weather", emoji: WEATHER_EMOJI[weather] ?? "🌦️", text: `weather: ${weather}` }]
      : [{ key: "weather", emoji: "🤍", text: "no weather" }]),
    { key: "amount", emoji: "🫧", text: `${amount} objects` },
    { key: "drift", emoji: "🍃", text: `drift ${drift}` },
    { key: "sound", emoji: "🎶", text: sound },
    { key: "pace", emoji: "🐢", text: pace },
    ...(worldPhoto ? [{ key: "photo", emoji: "🖼️", text: "custom sky" }] : []),
    ...(myDoodle ? [{ key: "doodle", emoji: "✏️", text: "my doodle" }] : []),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={step > 1 ? () => setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : onCancel}
          className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
        >
          {step > 1 ? "← back" : "← cancel"}
        </button>
        <p className="text-base font-bold text-ink-deep">
          ✨ {initial ? (initial.name ? "Edit your game" : "Remix a game") : "Create your own game"}
        </p>
      </div>

      {/* ─── Progress dots ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                  active
                    ? "bg-[var(--theme-accent, #5F6DBE)] text-white shadow-md"
                    : done
                      ? "bg-white/90 text-[var(--theme-accent, #5F6DBE)]"
                      : "bg-white/50 text-ink-soft",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold",
                  active ? "text-ink-deep" : "text-ink-soft",
                  "hidden sm:inline",
                )}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <span className="mx-0.5 h-px w-3 bg-[#C4CBE8]" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1 — world ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <BuilderGuide phase={1} phaseId={world} />
          <WorldPickerTile
            world={world}
            worldPhoto={worldPhoto}
            onPhotoSelect={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setWorldPhoto(r.result as string); r.readAsDataURL(f); }}
            fileRef={worldPhotoRef}
            onClear={() => setWorldPhoto(undefined)}
          />
          <StarterRow onApply={handleApply} current={lastConfig} />
        </div>
      )}

      {/* ─── Step 2 — friends ───────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <BuilderGuide phase={2} phaseId={friends[0] ?? null} />
          <FriendsPickerTile
            friends={friends}
            setFriends={setFriends}
            myDoodle={myDoodle}
            showDoodleCanvas={showDoodleCanvas}
            setShowDoodleCanvas={setShowDoodleCanvas}
            onDoodleChange={setMyDoodle}
          />
        </div>
      )}

      {/* ─── Step 3 — magic ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <BuilderGuide phase={3} phaseId={touch} />
          <MagicPickerTile
            touch={touch}
            setTouch={setTouch}
            sparkleStyle={sparkleStyle}
            setSparkleStyle={setSparkleStyle}
            sound={sound}
            setSound={setSound}
            pace={pace}
            setPace={setPace}
            weather={weather}
            setWeather={setWeather}
            amount={amount}
            setAmount={setAmount}
            drift={drift}
            setDrift={setDrift}
          />
        </div>
      )}

      {/* ─── Step 4 — summary, name & save ──────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="clay-card space-y-4 px-5 py-5">
            <div className="text-center">
              <p className="text-sm font-bold tracking-tight text-ink-deep">your game, in a nutshell ✨</p>
              <p className="mt-0.5 text-[11px] text-ink-soft">here are the ingredients you chose</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {summaryChips.map((c) => (
                <span
                  key={c.key}
                  className="flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-deep"
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.text.replace(/-/g, " ")}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={NAME_PLACEHOLDERS[world]}
                maxLength={40}
                className="w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm font-bold text-ink-deep shadow-sm outline-none placeholder:font-medium placeholder:text-ink-soft/70 focus:border-[var(--theme-accent,#5F6DBE)]/40"
              />
              <input
                type="text"
                value={whisper}
                onChange={(e) => setWhisper(e.target.value)}
                placeholder="a whisper line (optional) 💭"
                maxLength={80}
                className="w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-semibold text-ink-deep outline-none placeholder:font-medium placeholder:text-ink-soft/70 focus:border-[var(--theme-accent,#5F6DBE)]/40"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onCreate(finalize(lastConfig))}
              className="clay-btn flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-transform active:scale-95"
            >
              save my game
            </button>
            <button
              type="button"
              onClick={() => onPlay(finalize(lastConfig))}
              className="clay-btn-soft flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep transition-transform active:scale-95"
            >
              play it ✨
            </button>
          </div>
        </div>
      )}

      {/* ─── Back / Next ────────────────────────────────────────── */}
      {step < 4 && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            disabled={step === 1}
            className="clay-chip rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep transition-transform active:scale-95 disabled:opacity-40"
          >
            ← back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
            className="clay-btn flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-transform active:scale-95"
          >
            next →
          </button>
        </div>
      )}
    </motion.div>
  );
}

/** Rich world gradient used for custom-game thumbnails (inline style). */
export function worldGradientFor(world: string): string {
  switch (world) {
    case "sky": return "linear-gradient(135deg, #B8D4E8, #E8F0F8)";
    case "sunset": return "linear-gradient(135deg, #E8C8A0, #D090B0)";
    case "starry": return "linear-gradient(135deg, #283058, #484078)";
    case "garden": return "linear-gradient(135deg, #B4D8B0, #E0F0D8)";
    case "sea": return "linear-gradient(135deg, #80C0D8, #C0E8F0)";
    case "cozy": return "linear-gradient(135deg, #E8D8C8, #F8F0E8)";
    default: return "linear-gradient(135deg, #B8D4E8, #E8F0F8)";
  }
}
