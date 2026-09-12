import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router";
import {
  buildMonthCells,
  dateKeyFor,
  formatMonthLabel,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { useTable, type CalendarEntry, type VaultItem } from "@/lib/db";
import { scopedGetItem, scopedSetItem } from "@/lib/safe-storage";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

/** Dot colors per entry type — green / yellow / pale blue. */
const DOT: Record<CalendarEntry["type"], string> = {
  important: "bg-[#7BA88F]",
  dump: "bg-[#D9B36A]",
  normal: "bg-[#8C9AD6]",
};

/* ─── Decoration types ───────────────────────────────────────────── */

interface PlacedItem {
  id: string;
  kind: "sticker" | "gif";
  emoji?: string; // for built-in stickers
  vaultId?: string; // for vault items
  src?: string; // data URL for vault items
  x: number; // percent (can be negative or >100 for free placement)
  y: number; // percent
  size: number; // px
  rotation?: number; // degrees
}

interface CalendarDecorations {
  stickers: PlacedItem[];
  wallpaper: string | null; // data URL or built-in ID
  wallpaperType: "photo" | "builtin" | null;
}

const DECOR_KEY = "venting-calendar-decor";

function loadDecorations(): CalendarDecorations {
  try {
    const raw = scopedGetItem(DECOR_KEY);
    if (raw) return JSON.parse(raw) as CalendarDecorations;
  } catch { /* ignore */ }
  return { stickers: [], wallpaper: null, wallpaperType: null };
}

function saveDecorations(d: CalendarDecorations) {
  scopedSetItem(DECOR_KEY, JSON.stringify(d));
}

const BUILT_IN_STICKERS = [
  "🎂", "⭐", "🦋", "💜", "🌸", "☁️", "🎀", "🐻",
  "🍰", "🌙", "🌈", "🍬", "🧸", "🌺", "✨", "🐣",
];

const BUILT_IN_WALLPAPERS: { id: string; label: string; style: string }[] = [
  { id: "oldlace", label: "Old lace", style: "bg-[#FDF5E6]" },
  { id: "wisteria", label: "Wisteria", style: "bg-gradient-to-br from-[#E4E8F8] to-[#D9DEF4]" },
  { id: "starry", label: "Starry night", style: "bg-gradient-to-br from-[#283058] to-[#484078]" },
  { id: "garden", label: "Garden", style: "bg-gradient-to-br from-[#E0F0D8] to-[#D0E8C8]" },
];

/* ─── Main component ─────────────────────────────────────────────── */

export default function CalendarScreen() {
  const entries = useTable<CalendarEntry>("calendarEntries");
  const vaultItems = useTable<VaultItem>("vaultItems");
  const today = new Date();
  const todayKey = dateKeyFor(today);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // Customization state
  const [decorating, setDecorating] = useState(false);
  const [decor, setDecor] = useState<CalendarDecorations>(loadDecorations);
  const [decorPanel, setDecorPanel] = useState<"none" | "sticker" | "gif" | "wallpaper">("none");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save decorations when they change
  useEffect(() => { saveDecorations(decor); }, [decor]);

  const prevMonth = useTapGuard(() => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  });
  const nextMonth = useTapGuard(() => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  });
  const backToToday = useTapGuard(() => {
    setView((v) =>
      v.getMonth() === today.getMonth() && v.getFullYear() === today.getFullYear()
        ? v
        : new Date(today.getFullYear(), today.getMonth(), 1),
    );
  });

  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.dateKey);
    if (list) list.push(e);
    else byDay.set(e.dateKey, [e]);
  }

  const isCurrentMonth =
    view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear();
  const cells = buildMonthCells(view);

  // Decoration helpers
  const addSticker = useCallback((emoji: string) => {
    setDecor((d) => ({
      ...d,
      stickers: [...d.stickers, { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind: "sticker", emoji, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, size: 32 }],
    }));
  }, []);

  const addVaultItem = useCallback((item: VaultItem) => {
    setDecor((d) => ({
      ...d,
      stickers: [...d.stickers, {
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: item.kind === "gif" ? "gif" : "sticker",
        vaultId: item._id,
        src: item.art,
        x: 25 + Math.random() * 50,
        y: 25 + Math.random() * 50,
        size: item.kind === "gif" ? 64 : 40,
      }],
    }));
  }, []);

  const moveItem = (id: string, dx: number, dy: number) => {
    setDecor((d) => ({
      ...d,
      stickers: d.stickers.map((s) =>
        s.id === id ? { ...s, x: s.x + dx, y: s.y + dy } : s,
      ),
    }));
  };

  const resizeItem = (id: string, delta: number) => {
    setDecor((d) => ({
      ...d,
      stickers: d.stickers.map((s) =>
        s.id === id ? { ...s, size: Math.max(16, Math.min(96, s.size + delta)) } : s,
      ),
    }));
  };

  const rotateItem = (id: string, angle: number) => {
    setDecor((d) => ({
      ...d,
      stickers: d.stickers.map((s) =>
        s.id === id ? { ...s, rotation: ((s.rotation ?? 0) + angle + 360) % 360 } : s,
      ),
    }));
  };

  const removeItem = (id: string) => {
    setDecor((d) => ({ ...d, stickers: d.stickers.filter((s) => s.id !== id) }));
    setSelectedItem(null);
  };

  const setWallpaperPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDecor((d) => ({ ...d, wallpaper: reader.result as string, wallpaperType: "photo" }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const setWallpaperBuiltin = (id: string) => {
    setDecor((d) => ({ ...d, wallpaper: id, wallpaperType: "builtin" }));
  };

  const resetDecorations = useTapGuard(() => {
    setDecor({ stickers: [], wallpaper: null, wallpaperType: null });
    setDecorPanel("none");
    setDecorating(false);
  }, 400);

  const vaultGifs = vaultItems.filter((v) => v.kind === "gif");
  const vaultStickers = vaultItems.filter((v) => v.kind === "sticker" || v.kind === "doodle");

  // Wallpaper background style
  const wallStyle = (() => {
    if (!decor.wallpaper) return {};
    if (decor.wallpaperType === "builtin") {
      const wp = BUILT_IN_WALLPAPERS.find((w) => w.id === decor.wallpaper);
      return wp ? { className: wp.style } : {};
    }
    return { backgroundImage: `url(${decor.wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" };
  })();

  return (
    <div className="space-y-5">
      {/* ─── Month header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={prevMonth}
          className="clay-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-ink-deep transition-transform hover:scale-105 active:scale-95"
          aria-label="Previous month"><span aria-hidden>‹</span></button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold tracking-tight text-ink-deep">{formatMonthLabel(view)}</h2>
          {!isCurrentMonth && (
            <button type="button" onClick={backToToday}
              className="mt-0.5 rounded-full bg-[#D9DEF4]/80 px-2.5 py-0.5 text-[10px] font-bold text-[#5F6DBE] transition-colors hover:bg-[#C4CBE8]/80">back to today</button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setDecorating((v) => !v)}
            className={cn("clay-chip flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition-transform",
              decorating ? "bg-[#5F6DBE] text-white" : "text-ink-deep hover:scale-105")}>
            ✨ {decorating ? "done" : "customize"}
          </button>
          <button type="button" onClick={nextMonth}
            className="clay-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-ink-deep transition-transform hover:scale-105 active:scale-95"
            aria-label="Next month"><span aria-hidden>›</span></button>
        </div>
      </div>

      {/* ─── Decoration panel ───────────────────────────────────── */}
      <AnimatePresence>
        {decorating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="clay-card rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDecorPanel(decorPanel === "sticker" ? "none" : "sticker")}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-bold transition-transform", decorPanel === "sticker" ? "bg-[#5F6DBE] text-white" : "clay-chip text-ink-deep")}>🎨 add sticker</button>
                <button type="button" onClick={() => setDecorPanel(decorPanel === "gif" ? "none" : "gif")}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-bold transition-transform", decorPanel === "gif" ? "bg-[#5F6DBE] text-white" : "clay-chip text-ink-deep")}>🎞 add GIF</button>
                <button type="button" onClick={() => setDecorPanel(decorPanel === "wallpaper" ? "none" : "wallpaper")}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-bold transition-transform", decorPanel === "wallpaper" ? "bg-[#5F6DBE] text-white" : "clay-chip text-ink-deep")}>🖼 set wallpaper</button>
              </div>

              {/* Sticker panel */}
              {decorPanel === "sticker" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-ink-soft">built-in stickers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BUILT_IN_STICKERS.map((em) => (
                      <button key={em} type="button" onClick={() => addSticker(em)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF5E6]/60 text-lg transition-transform hover:scale-110 active:scale-95">{em}</button>
                    ))}
                  </div>
                  {vaultStickers.length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-ink-soft">your stickers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vaultStickers.map((v) => (
                          <button key={v._id} type="button" onClick={() => addVaultItem(v)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF5E6]/60 overflow-hidden transition-transform hover:scale-110 active:scale-95">
                            <img src={v.art} alt="" className="h-full w-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* GIF panel */}
              {decorPanel === "gif" && (
                <div className="space-y-2">
                  {vaultGifs.length === 0 ? (
                    <p className="text-xs text-ink-soft">no saved GIFs yet — create one in GIF Studio first</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {vaultGifs.map((v) => (
                        <button key={v._id} type="button" onClick={() => addVaultItem(v)}
                          className="h-14 w-14 overflow-hidden rounded-xl bg-[#FDF5E6]/60 transition-transform hover:scale-105 active:scale-95">
                          <img src={v.art} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Wallpaper panel */}
              {decorPanel === "wallpaper" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-ink-soft">from your photos</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="clay-chip flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-ink-deep transition-transform hover:scale-[1.01]">
                    📷 choose a photo from your device
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={setWallpaperPhoto} />
                  <p className="text-[11px] font-bold text-ink-soft">built-in wallpapers</p>
                  <div className="grid grid-cols-4 gap-2">
                    {BUILT_IN_WALLPAPERS.map((wp) => (
                      <button key={wp.id} type="button" onClick={() => setWallpaperBuiltin(wp.id)}
                        className={cn("h-12 rounded-xl transition-transform", wp.style,
                          decor.wallpaper === wp.id ? "ring-2 ring-[#5F6DBE] scale-105" : "hover:scale-105")} />
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              <button type="button" onClick={resetDecorations}
                className="w-full rounded-full py-2 text-[11px] font-bold text-[#C48B9E] transition-colors hover:bg-[#C48B9E]/10">reset decorations</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Weekday labels ──────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-hidden>
        {WEEKDAY_LABELS.map((w) => (
          <p key={w} className="text-center text-[10px] sm:text-xs font-bold tracking-wide text-ink-soft">{w}</p>
        ))}
      </div>

      {/* ─── Day grid with wallpaper + decorations ──────────────── */}
      <div className={cn("relative overflow-visible rounded-2xl", wallStyle.className ?? "")}
        style={wallStyle.backgroundImage ? { backgroundImage: wallStyle.backgroundImage, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        {/* Light overlay for readability */}
        {decor.wallpaper && <div className="absolute inset-0 bg-[#FDF5E6]/40 z-0" />}

        {/* Placed stickers/GIFs */}
        {decor.stickers.map((item) => (
          <DraggableDecor key={item.id} item={item} selected={selectedItem === item.id}
            onSelect={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
            onMove={(dx, dy) => moveItem(item.id, dx, dy)}
            onBigger={() => resizeItem(item.id, 8)}
            onSmaller={() => resizeItem(item.id, -8)}
            onRotate={(angle) => rotateItem(item.id, angle)}
            onRemove={() => removeItem(item.id)} />
        ))}

        {/* Day cells */}
        <div className="relative z-10 grid grid-cols-7 gap-1 sm:gap-2 p-1">
          {cells.map((cell) => {
            if (!cell.inMonth) {
              return <div key={cell.dateKey} aria-hidden className="aspect-square" />;
            }
            const dayEntries = byDay.get(cell.dateKey);
            const isToday = cell.dateKey === todayKey;
            const hasImportant = dayEntries?.some((e) => e.type === "important") ?? false;
            const types = new Set(dayEntries?.map((e) => e.type) ?? []);
            return (
              <Link key={cell.dateKey} to={`/dashboard/calendar/${cell.dateKey}`}
                aria-label={`Open ${cell.dateKey}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl sm:rounded-2xl border transition-transform min-h-[2.5rem] sm:min-h-[3.5rem]",
                  isToday
                    ? "border-[#8C9AD6] bg-[#D9DEF4]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_3px_rgba(140,154,214,0.4)]"
                    : "border-[#C4CBE8]/70 bg-[#FDF5E6]/55 shadow-[0_4px_10px_-5px_rgba(90,90,140,0.28)]",
                )}>
                {hasImportant && <Star aria-hidden className="absolute top-0.5 right-1 size-2.5 fill-[#7BA88F] text-[#7BA88F]" />}
                <span className={isToday ? "text-xs sm:text-sm font-extrabold text-ink-deep" : "text-xs sm:text-sm font-bold text-ink"}>
                  {cell.date.getDate()}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-[3px]" aria-hidden>
                  {(["important", "dump", "normal"] as const).map((t) =>
                    types.has(t) ? <span key={t} className={`size-1.5 rounded-full ${DOT[t]}`} /> : null,
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Legend ──────────────────────────────────────────────── */}
      <div className="clay-chip flex items-center justify-center gap-4 rounded-full px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
          <span className="size-2 rounded-full bg-[#7BA88F]" aria-hidden /> important
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
          <span className="size-2 rounded-full bg-[#D9B36A]" aria-hidden /> thought dump
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
          <span className="size-2 rounded-full bg-[#8C9AD6]" aria-hidden /> normal
        </span>
      </div>

      <p className="text-center text-[11px] font-semibold text-ink-soft">
        tap a day to tuck something into it 🌸
      </p>
    </div>
  );
}

/* ─── Draggable decoration item ──────────────────────────────────── */

function DraggableDecor({
  item, selected, onSelect, onMove, onBigger, onSmaller, onRotate, onRemove,
}: {
  item: PlacedItem;
  selected: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onBigger: () => void;
  onSmaller: () => void;
  onRotate: (angle: number) => void;
  onRemove: () => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    onMove(dx / 3, dy / 3);
  };

  const onPointerUp = () => { dragRef.current = null; };

  const rot = item.rotation ?? 0;

  return (
    <div className="absolute z-20" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%, -50%) rotate(${rot}deg)` }}>
      <div className="relative cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        {item.kind === "gif" && item.src ? (
          <img src={item.src} alt="" className="rounded-lg" style={{ width: item.size, height: item.size, objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: item.size }} className="drop-shadow-[0_2px_4px_rgba(90,70,120,0.25)]" aria-hidden>{item.emoji}</span>
        )}
      </div>
      {selected && (
        <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onBigger(); }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md text-[10px] font-bold transition-transform hover:scale-110">+</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onSmaller(); }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md text-[10px] font-bold transition-transform hover:scale-110">−</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRotate(-15); }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md text-[10px] font-bold transition-transform hover:scale-110">⟲</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRotate(15); }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md text-[10px] font-bold transition-transform hover:scale-110">⟳</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C48B9E]/20 text-[#C48B9E] shadow-md text-[10px] font-bold transition-transform hover:scale-110">✕</button>
        </div>
      )}
    </div>
  );
}
