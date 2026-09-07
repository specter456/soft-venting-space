import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { WorldPickerTile } from "@/components/WorldPickerTile";
import { FriendsPickerTile } from "@/components/FriendsPickerTile";
import { MagicPickerTile } from "@/components/MagicPickerTile";
import type { CustomGameConfig, World, FloatingThing, TouchAction, SparkleStyle, ObjectSize, GameSound, GamePace } from "@/pages/app/GamesScreen";

const RECIPES: { id: string; name: string; preset: Partial<CustomGameConfig> }[] = [
  { id: "starry-catch", name: "starry catch", preset: { world: "starry", things: ["stars" as FloatingThing], touch: "catch" as TouchAction, sparkleStyle: "sparkles" as SparkleStyle, objectSize: "medium" as ObjectSize, sound: "chimes" as GameSound, pace: "slow" as GamePace } },
  { id: "petal-rain",   name: "petal rain",   preset: { world: "garden", things: ["petals" as FloatingThing], touch: "blow" as TouchAction, sparkleStyle: "hearts" as SparkleStyle, objectSize: "medium" as ObjectSize, sound: "wind" as GameSound, pace: "medium" as GamePace } },
  { id: "firefly-jar",  name: "firefly jar",  preset: { world: "starry", things: ["fireflies" as FloatingThing], touch: "soothe" as TouchAction, sparkleStyle: "sparkles" as SparkleStyle, objectSize: "small" as ObjectSize, sound: "piano" as GameSound, pace: "slow" as GamePace } },
  { id: "bubble-sea",   name: "bubble sea",   preset: { world: "sea", things: ["bubbles" as FloatingThing], touch: "pop" as TouchAction, sparkleStyle: "ripples" as SparkleStyle, objectSize: "medium" as ObjectSize, sound: "rain" as GameSound, pace: "slow" as GamePace } },
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
                "rounded-full px-4 py-2 text-xs font-bold transition-all",
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

function makeDefaultConfig(): CustomGameConfig {  const t: FloatingThing[] = ["stars" as FloatingThing];
  const w: World = "sky";
  const tc: TouchAction = "catch" as TouchAction;
  const ss: SparkleStyle = "sparkles" as SparkleStyle;
  const os: ObjectSize = "medium" as ObjectSize;
  const s: GameSound = "chimes" as GameSound;
  const p: GamePace = "slow" as GamePace;
  return { id: `custom-${Date.now()}`, name: "My Game", world: w, things: t, touch: tc, sparkleStyle: ss, objectSize: os, whisper: "", sound: s, pace: p, createdAt: Date.now() };
}

interface BuilderShellProps {
  initial: CustomGameConfig | null;
  onCreate: (config: CustomGameConfig) => void;
  onCancel: () => void;
  onPlay?: (config: CustomGameConfig) => void;
}

export function BuilderShell({
  initial,
  onCreate,
  onCancel,
  onPlay = () => {},
}: BuilderShellProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [world, setWorld] = useState<World>(initial?.world ?? "sky");
  const [friends, setFriends] = useState<FloatingThing[]>(initial?.things ?? ["stars"]);
  const [touch, setTouch] = useState<TouchAction>(initial?.touch ?? "catch");
  const [sparkleStyle, setSparkleStyle] = useState<SparkleStyle>(initial?.sparkleStyle ?? "sparkles");
  const [objectSize, setObjectSize] = useState<ObjectSize>(initial?.objectSize ?? "medium");
  const [sound, setSound] = useState<GameSound>(initial?.sound ?? "chimes");
  const [pace, setPace] = useState<GamePace>(initial?.pace ?? "slow");
  const [worldPhoto, setWorldPhoto] = useState<string | undefined>(initial?.worldPhoto);
  const [myDoodle, setMyDoodle] = useState<string | undefined>(initial?.myDoodle);
  const [showDoodleCanvas, setShowDoodleCanvas] = useState(false);
  const [whisper, setWhisper] = useState(initial?.whisper ?? "");
  const worldPhotoRef = useRef<HTMLInputElement>(null);

  const lastConfig = useMemo<CustomGameConfig | null>(() => {
    if (!name && !whisper && !worldPhoto && !myDoodle && (friends?.length ?? 0) === (initial?.things?.length ?? 0)) {
      return initial ?? null;
    }
    return {
      id: initial?.id ?? "",
      name: (name.trim() || initial?.name) ?? "",
      world,
      things: friends,
      touch,
      sparkleStyle,
      objectSize,
      whisper: whisper.trim() || initial?.whisper || "",
      sound,
      pace,
      worldPhoto,
      myDoodle,
      createdAt: initial?.createdAt ?? 0,
    };
  }, [name, whisper, world, friends, touch, sparkleStyle, objectSize, sound, pace, worldPhoto, myDoodle, initial]);

  /** Stamp id/createdAt at save/play time — never during render. */
  const finalize = useCallback(
    (cfg: CustomGameConfig): CustomGameConfig => {
      const now = Date.now();
      return { ...cfg, id: cfg.id || `custom-${now}`, createdAt: cfg.createdAt || now };
    },
    [],
  );

  const handleApply = useCallback((preset: Partial<CustomGameConfig>) => {
    if (preset.world) setWorld(preset.world as World);
    if (preset.things) setFriends(preset.things as FloatingThing[]);
    if (preset.touch) setTouch(preset.touch as TouchAction);
    if (preset.sparkleStyle) setSparkleStyle(preset.sparkleStyle as SparkleStyle);
    if (preset.objectSize) setObjectSize(preset.objectSize as ObjectSize);
    if (preset.sound) setSound(preset.sound as GameSound);
    if (preset.pace) setPace(preset.pace as GamePace);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">← cancel</button>
        <p className="text-base font-bold text-ink-deep">✨ {initial ? "Edit your game" : "Create your own game"}</p>
      </div>

      <BuilderGuide phase={1} phaseId={world} />
      <WorldPickerTile
        world={world}
        worldPhoto={worldPhoto}
        onPhotoSelect={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setWorldPhoto(r.result as string); r.readAsDataURL(f); }}
        fileRef={worldPhotoRef}
        onClear={() => setWorldPhoto(undefined)}
      />

      <BuilderGuide phase={2} phaseId={friends[0] ?? null} />
      <FriendsPickerTile
        friends={friends}
        setFriends={setFriends}
        myDoodle={myDoodle}
        showDoodleCanvas={showDoodleCanvas}
        setShowDoodleCanvas={setShowDoodleCanvas}
        onDoodleChange={setMyDoodle}
      />

      <BuilderGuide phase={3} phaseId={touch} />        <MagicPickerTile
        touch={touch}
        setTouch={setTouch}
        sparkleStyle={sparkleStyle}
        setSparkleStyle={setSparkleStyle}
        sound={sound}
        setSound={setSound}
        pace={pace}
        setPace={setPace}
      />

      <StarterRow onApply={handleApply} current={lastConfig ?? undefined} />

      {/* name + optional whisper line */}
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={NAME_PLACEHOLDERS[world]}
          className="w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm font-bold text-ink-deep shadow-sm outline-none placeholder:font-medium placeholder:text-ink-soft/70 focus:border-[var(--theme-accent,#5F6DBE)]/40"
        />
        <input
          type="text"
          value={whisper}
          onChange={(e) => setWhisper(e.target.value)}
          placeholder="a whisper line (optional) 💭"
          className="w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-semibold text-ink-deep outline-none placeholder:font-medium placeholder:text-ink-soft/70 focus:border-[var(--theme-accent,#5F6DBE)]/40"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onCreate(finalize(lastConfig ?? makeDefaultConfig()))}
          className="clay-btn flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-white">
          save to my games
        </button>
        <button
          type="button"
          onClick={() => onPlay(finalize(lastConfig ?? makeDefaultConfig()))}
          className="clay-btn-soft flex-1 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep">
          play it ✨
        </button>
      </div>

      {initial && (
        <SavedGameCards
          games={[initial]}
          onEdit={onCreate}
          onDuplicate={onCancel}
          onDelete={onCancel}
          onPlay={onPlay}
        />
      )}
    </motion.div>
  );
}

export function SavedGameCards({
  games,
  onEdit,
  onDuplicate,
  onDelete,
  onPlay = () => {},
}: {
  games: CustomGameConfig[];
  onEdit: (cfg: CustomGameConfig) => void;
  onDuplicate: (cfg: CustomGameConfig) => void;
  onDelete: (id: string) => void;
  onPlay?: (cfg: CustomGameConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-ink-deep">your little games</p>
        {games.length > 0 && (
          <span className="text-[11px] font-bold text-ink-soft">{games.length} saved</span>
        )}
      </div>
      {games.length === 0 ? (
        <div className="clay-card rounded-2xl border border-dashed border-[#C4CBE8]/50 py-10 text-center">
          <p className="text-sm font-semibold text-ink-soft">no games yet — build one above and save it ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {games.map((g) => {
                            const meta = (g.things?.length ?? 0) > 0 ? g.things.join(", ") : "the world";
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="clay-card overflow-hidden"
              >
                {/* live mini thumbnail */}
                <div className="h-24 overflow-hidden rounded-t-2xl bg-gradient-to-br" style={{ background: worldGradientFor(g.world) }}>
                  <div className="flex h-full items-center justify-center gap-2 opacity-70">
                    {g.things.slice(0, 3).map((t) => (
                      <span key={t} className="text-2xl" aria-hidden>{(() => { const m: Record<string, string> = { stars: "⭐", bubbles: "🫧", clouds: "☁️", petals: "🌸", fireflies: "✨", hearts: "💜", fish: "🐟" }; return m[t as string] ?? "✨"; })()}</span>
                    ))}
                  </div>
                  {g.things.length > 0 && (
                    <span className="absolute bottom-2 right-3 text-[9px] font-bold text-white/80 drop-shadow-sm">
                      ✨ {meta}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-deep">{g.name || "my little game"}</p>
                      <p className="truncate text-[11px] text-ink-soft">{meta}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlay(g)}
                      className="shrink-0 clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-ink-deep hover:scale-105"
                    >
                      ▶ play
                    </button>
                  </div>
                  {g.whisper && <p className="text-[11px] italic text-ink-soft">“{g.whisper}”</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(g)} className="clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center gap-1">
                      ✎ edit
                    </button>
                    <button type="button" onClick={() => onDuplicate(g)} className="clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center gap-1">
                      ⧉ dup
                    </button>
                    <div className="flex-1" />
                    <button type="button" onClick={() => { if (window.confirm("remove this little game?")) onDelete(g.id); }} className="clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-[#C48B9E] hover:text-[#A06070] transition-colors flex items-center gap-1">
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function worldGradientFor(world: string): string {
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
