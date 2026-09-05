import { useRef, useState } from "react";
import { BUILTIN_TRACKS, SCENES, music, useMusicState, type MusicTrack } from "@/lib/music";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * Single floating CD widget — one brain, one button, everywhere.
 * Shows ambient tracks on app screens, game tracks when in a game.
 * Only one CD visible at any time.
 */
type MenuTab = "music" | "scenes";

export default function MusicWidget() {
  const state = useMusicState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<MenuTab>("music");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isGame = state.layer === "game";
  const uploads = isGame ? state.gameUploads : state.ambientUploads;
  const sectionLabel = isGame ? "my game tracks" : "my ambient tracks";

  const pickTrack = (track: MusicTrack) => {
    music.play(track);
  };

  const pickUpload = (track: { id: string; name: string; dataUrl: string }) => {
    music.playUploadedTrack(track);
  };

  const deleteUpload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    music.removeUploadedTrack(id, isGame ? "game" : "ambient");
  };

  return (
    <div className="sticky top-20 z-50 flex justify-end pr-1">
      {/* ─── The CD itself ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => { music.prime(); setMenuOpen(v => !v); }}
        aria-label={state.playing ? "Soothing music is playing — open the music menu" : "Open the music menu"}
        aria-expanded={menuOpen}
        title="Soothing sounds"
        className={cn(
          "clay-chip flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95",
          state.playing && "ring-2 ring-[#C4CBE8]/60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "cd-disc relative block h-9 w-9 rounded-full",
            state.playing && "animate-cd-spin",
          )}
        />
      </button>

      {/* ─── Soft music menu ────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="clay-card absolute top-16 right-0 z-50 w-72 p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold tracking-tight text-ink-deep">
                {isGame ? "🎮 game music" : "🎵 soothing sounds"}
              </p>
              {!isGame && (
                <div className="mt-2 flex gap-1">
                  <button type="button" onClick={() => setTab("music")}
                    className={cn("flex-1 rounded-full py-1.5 text-[11px] font-bold transition-all", tab === "music" ? "bg-lavender-500 text-white shadow-md" : "text-ink-soft hover:text-ink-deep")}>
                    🎵 music
                  </button>
                  <button type="button" onClick={() => setTab("scenes")}
                    className={cn("flex-1 rounded-full py-1.5 text-[11px] font-bold transition-all", tab === "scenes" ? "bg-lavender-500 text-white shadow-md" : "text-ink-soft hover:text-ink-deep")}>
                    🌿 scenes
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close the music menu"
                className="clay-chip flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-ink-soft transition-transform hover:scale-110 active:scale-95"
              >
                ✕
              </button>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
              plays only on this device · never uploaded
            </p>

            {/* Scenes tab */}
            {tab === "scenes" && !isGame && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">soundscapes</p>
                {SCENES.map(s => {
                  const active = state.activeScene === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => music.toggleScene(s.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors",
                        active ? "bg-lavender-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" : "hover:bg-lavender-100/60",
                      )}
                    >
                      <span className="text-lg" aria-hidden>{s.emoji}</span>
                      <span className="min-w-0">
                        <span className={cn("block truncate text-xs font-bold", active ? "text-ink-deep" : "text-ink")}>
                          {s.label}
                          {active && " · playing"}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => music.stopScene()}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors",
                    !state.activeScene ? "bg-lavender-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" : "hover:bg-lavender-100/60",
                  )}
                >
                  <span className="text-lg" aria-hidden>🔇</span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-xs font-bold", !state.activeScene ? "text-ink-deep" : "text-ink")}>
                      no scene
                      {!state.activeScene && " · active"}
                    </span>
                  </span>
                </button>
              </div>
            )}

            {/* Built-in tracks */}
            {tab === "music" && (
            <div className="mt-3 space-y-1.5">
              {BUILTIN_TRACKS.map(t => {
                const active = state.track?.kind === "builtin" && state.track.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTrack({ kind: "builtin", id: t.id })}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors",
                      active ? "bg-lavender-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" : "hover:bg-lavender-100/60",
                    )}
                  >
                    <span className="text-lg" aria-hidden>{t.emoji}</span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-xs font-bold", active ? "text-ink-deep" : "text-ink")}>
                        {t.label}
                        {active && (state.playing ? " · playing" : " · paused")}
                      </span>
                      <span className="block truncate text-[10px] font-medium text-ink-soft">{t.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {/* My tracks section */}
            <div className="mt-3 border-t border-lavender-200/50 pt-3">
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">{sectionLabel}</p>
              {uploads.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-ink-soft">no tracks yet — upload one below</p>
              ) : (
                <div className="mt-1.5 space-y-1">
                  {uploads.map(t => {
                    const active = state.track?.kind === "local" && state.track.name === t.name;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickUpload(t)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left transition-colors",
                          active ? "bg-lavender-200/70" : "hover:bg-lavender-100/60",
                        )}
                      >
                        <span className="text-sm" aria-hidden>🎶</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[11px] font-bold", active ? "text-ink-deep" : "text-ink")}>
                            {t.name}
                            {active && (state.playing ? " · playing" : " · paused")}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => deleteUpload(t.id, e)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-ink-soft transition-colors hover:bg-blush-100 hover:text-blush-500"
                          aria-label={`Remove ${t.name}`}
                        >
                          ✕
                        </button>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left hover:bg-lavender-100/60"
            >
              <span className="text-lg" aria-hidden>📂</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-ink">+ from your downloads</span>
                <span className="block truncate text-[10px] font-medium text-ink-soft">play any audio file from this device</span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) music.addUploadedTrack(file, isGame ? "game" : "ambient");
                e.target.value = "";
              }}
            />

            {/* Controls */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => music.toggle()}
                aria-label={state.playing ? "Pause the music" : state.track ? "Resume the music" : "Play soothing music"}
                className="clay-btn-soft flex h-9 flex-1 items-center justify-center gap-1.5 text-xs font-bold text-ink-deep"
              >
                {state.playing ? "❚❚ pause" : "▶ play"}
              </button>
              <button
                type="button"
                onClick={() => music.next()}
                aria-label="Next track"
                className="clay-chip flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
              >
                ⏭
              </button>
              <button
                type="button"
                onClick={() => music.setMuted(!state.muted)}
                aria-label={state.muted ? "Unmute" : "Mute"}
                className="clay-chip flex h-9 w-9 items-center justify-center rounded-full text-sm transition-transform hover:scale-105 active:scale-95"
              >
                {state.muted ? "🔇" : "🔊"}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] font-bold text-ink-soft">volume</span>
              <Slider
                value={[state.volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(vals) => music.setVolume(vals[0] ?? 0)}
                aria-label="Music volume"
                className="flex-1"
              />
            </div>

            {/* No music option */}
            <button
              type="button"
              onClick={() => music.setMuted(true)}
              className="mt-2 w-full rounded-full py-1.5 text-[11px] font-bold text-ink-soft transition-colors hover:bg-lavender-100/60"
            >
              no music
            </button>
          </div>
        </>
      )}
    </div>
  );
}
