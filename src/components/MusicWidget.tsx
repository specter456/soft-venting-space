import { useRef, useState } from "react";
import { BUILTIN_TRACKS, music, useMusicState, type MusicTrack } from "@/lib/music";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * The little floating "CD" for the Games section. Spins while music plays,
 * opens a soft music menu on tap: built-in tracks (offline, synthesized on
 * the device), a local file picked from the user's own downloads, play/pause,
 * next, and a small volume slider. Nothing is ever uploaded.
 */
export default function MusicWidget() {
  const state = useMusicState();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const activeTrack = state.track;

  const pickTrack = (track: MusicTrack) => {
    music.play(track);
  };

  return (
    <div className="sticky top-20 z-50 flex justify-end pr-1">
      {/* ─── The CD itself ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
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
          <div className="clay-card absolute top-16 right-0 z-50 w-72 rounded-[1.8rem] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold tracking-tight text-ink-deep">
                🎵 soothing sounds
              </p>
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

            {/* built-in tracks */}
            <div className="mt-3 space-y-1.5">
              {BUILTIN_TRACKS.map((t) => {
                const active = activeTrack?.kind === "builtin" && activeTrack.id === t.id;
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
                    <span className="text-lg" aria-hidden>
                      {t.emoji}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-xs font-bold",
                          active ? "text-ink-deep" : "text-ink",
                        )}
                      >
                        {t.label}
                        {active && (state.playing ? " · playing" : " · paused")}
                      </span>
                      <span className="block truncate text-[10px] font-medium text-ink-soft">
                        {t.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* local file from the user's own downloads */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left hover:bg-lavender-100/60"
            >
              <span className="text-lg" aria-hidden>
                📂
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-ink">
                  From your downloads
                </span>
                <span className="block truncate text-[10px] font-medium text-ink-soft">
                  {activeTrack?.kind === "local"
                    ? activeTrack.name
                    : "play any audio file from this device"}
                </span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) music.playLocalFile(file);
              }}
            />

            {/* controls */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => music.toggle()}
                aria-label={state.playing ? "Pause the music" : state.active ? "Resume the music" : "Play soothing music"}
                className="clay-btn-soft flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold text-ink-deep"
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
                onClick={() => music.toggle()}
                aria-label={state.playing ? "Mute" : "Unmute"}
                className="clay-chip flex h-9 w-9 items-center justify-center rounded-full text-sm transition-transform hover:scale-105 active:scale-95"
              >
                {state.playing ? "🔊" : "🔇"}
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
          </div>
        </>
      )}
    </div>
  );
}
