import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { createVaultItem, useTable, type VaultItem } from "@/lib/db";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safe-storage";
import { isImageArt } from "@/lib/canvas-art";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "venting-polaroid-wall";
/** Set by Photo Doodle on save; the wall consumes and clears it. */
export const PENDING_PIN_KEY = "venting-pending-wall-pin";

export interface PendingPin {
  vaultId: string;
  art: string;
}

/** Call after saving a photo/doodle anywhere: arms the next wall visit to pin it. */
export function armPendingPin(vaultId: string, art: string): void {
  safeSetItem(PENDING_PIN_KEY, JSON.stringify({ vaultId, art } satisfies PendingPin));
}

/** Read + clear a pending pin (one-shot). */
function consumePendingPin(): PendingPin | null {
  try {
    const raw = safeGetItem(PENDING_PIN_KEY);
    if (!raw) return null;
    safeRemoveItem(PENDING_PIN_KEY);
    const p = JSON.parse(raw) as PendingPin;
    return p && typeof p.art === "string" ? p : null;
  } catch {
    return null;
  }
}

interface PolaroidPin {
  id: string;
  vaultId: string;
  art: string;
  caption: string;
  x: number; // percent
  y: number; // percent
  tilt: number; // degrees
}

function loadWall(): PolaroidPin[] {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as PolaroidPin[];
      return Array.isArray(arr) ? arr : [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveWall(pins: PolaroidPin[]) {
  safeSetItem(STORAGE_KEY, JSON.stringify(pins));
}

/* ─── Home card ──────────────────────────────────────────────────── */

export default function PolaroidWallSection() {
  const wall = loadWall();
  return (
    <section>
      <Link
        to="/dashboard/polaroid-wall"
        className="clay-card group flex w-full items-center gap-3 px-5 py-4 transition-transform hover:-translate-y-0.5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl tile-lavender text-xl">
          <span aria-hidden className="drop-shadow-sm">📸</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-tight text-ink-deep">
            polaroid wall
          </span>
          <span className="block text-[11px] font-medium text-ink-soft">
            {wall.length > 0 ? `${wall.length} photo${wall.length === 1 ? "" : "s"} pinned` : "your wall is waiting 📸"}
          </span>
        </span>
        <span aria-hidden className="text-sm text-ink-soft transition-colors group-hover:text-ink-deep">→</span>
      </Link>
    </section>
  );
}

/* ─── Wall screen ────────────────────────────────────────────────── */

export function PolaroidWallScreen() {
  const navigate = useNavigate();
  const vaultItems = useTable<VaultItem>("vaultItems");
  const [pins, setPins] = useState<PolaroidPin[]>(loadWall);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sparkleId, setSparkleId] = useState<string | null>(null);
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);

  const addPin = useCallback((vaultId: string, art: string) => {
    const id = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pin: PolaroidPin = {
      id,
      vaultId,
      art,
      caption: "",
      x: 8 + Math.random() * 58,
      y: 8 + Math.random() * 58,
      tilt: (Math.random() - 0.5) * 16,
    };
    setPins((prev) => {
      const next = [...prev, pin];
      saveWall(next);
      return next;
    });
    setSparkleId(id);
    setTimeout(() => setSparkleId(null), 1100);
  }, []);

  // One-shot: if Photo Doodle armed a pending pin, pin it on arrival.
  useEffect(() => {
    const pending = consumePendingPin();
    if (pending) addPin(pending.vaultId, pending.art);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePin = (id: string) => {
    setPins((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveWall(next);
      return next;
    });
    if (editingId === id) setEditingId(null);
  };

  const updateCaption = (id: string, caption: string) => {
    setPins((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, caption } : p));
      saveWall(next);
      return next;
    });
  };

  const nudge = (id: string, dx: number, dy: number) => {
    setPins((prev) => {
      const next = prev.map((p) =>
        p.id === id
          ? { ...p, x: Math.max(0, Math.min(90, p.x + dx)), y: Math.max(0, Math.min(90, p.y + dy)) }
          : p,
      );
      saveWall(next);
      return next;
    });
  };

  const tilt = (id: string, d: number) => {
    setPins((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, tilt: p.tilt + d } : p));
      saveWall(next);
      return next;
    });
  };

  // Drag handlers
  const onPointerDown = (id: string, e: React.PointerEvent) => {
    const pin = pins.find((p) => p.id === id);
    if (!pin) return;
    e.preventDefault();
    dragging.current = { id, startX: e.clientX, startY: e.clientY, origX: pin.x, origY: pin.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !wallRef.current) return;
    const rect = wallRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragging.current.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragging.current.startY) / rect.height) * 100;
    const nx = Math.max(0, Math.min(90, dragging.current.origX + dxPct));
    const ny = Math.max(0, Math.min(90, dragging.current.origY + dyPct));
    setPins((prev) => prev.map((p) => (p.id === dragging.current!.id ? { ...p, x: nx, y: ny } : p)));
  };

  const onPointerUp = () => {
    if (dragging.current) {
      saveWall(pins);
      dragging.current = null;
    }
  };

  // Vault photos + saved photo doodles — the REAL vault (IndexedDB).
  const photos = vaultItems.filter((i) => i && (i.kind === "photo" || i.kind === "doodle"));

  const openMakeNew = () => {
    // Go directly to Photo Doodle (photos view), never the generic hub.
    navigate("/dashboard/create?view=photos&from=wall");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-ink-deep">📸 polaroid wall</p>
        {pins.length > 0 && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="clay-chip rounded-full px-3 py-1.5 text-[11px] font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
          >
            + add
          </button>
        )}
      </div>

      {/* Cork board */}
      <div
        ref={wallRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative min-h-[60vh] overflow-hidden rounded-3xl border-2 border-dashed border-[#C4A882]/40"
        style={{ background: "linear-gradient(135deg, #E8D5B7 0%, #DCC9A3 50%, #E0CEAE 100%)" }}
      >
        {pins.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6">
            <span className="text-4xl" aria-hidden>📸</span>
            <p className="text-sm font-bold text-[#8B7355]">
              your wall is waiting for its first memory
            </p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="clay-btn rounded-full px-5 py-2.5 text-xs font-bold text-white"
              >
                pick from vault
              </button>
              <button
                type="button"
                onClick={openMakeNew}
                className="clay-chip rounded-full px-5 py-2.5 text-xs font-bold text-ink-deep"
              >
                make a new one
              </button>
            </div>
          </div>
        ) : null}

        {pins.map((pin) => (
          <div
            key={pin.id}
            className="absolute touch-none select-none"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, zIndex: editingId === pin.id ? 20 : 10 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
              style={{ transform: `rotate(${pin.tilt}deg)` }}
              onPointerDown={(e) => onPointerDown(pin.id, e)}
            >
              {/* Tape/pin decoration */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                <div className="h-4 w-8 rounded-sm bg-[#F5E6C8]/80 shadow-sm" style={{ transform: `rotate(${pin.tilt * 0.3}deg)` }} />
              </div>

              {/* Pinned! sparkle */}
              {sparkleId === pin.id && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.4, y: 6 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 1], y: [-4, -26, -40] }}
                  transition={{ duration: 1.05, ease: "easeOut" }}
                  className="absolute -top-7 left-1/2 z-20 -translate-x-1/2 text-lg"
                  aria-hidden
                >
                  ✨ pinned!
                </motion.span>
              )}

              {/* Polaroid card */}
              <div className="w-32 bg-white p-1.5 pb-6 shadow-lg shadow-black/15">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  {isImageArt(pin.art) ? (
                    <img src={pin.art} alt={pin.caption || "pinned photo"} draggable={false} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">{pin.art}</div>
                  )}
                </div>
                {/* Caption area */}
                <div className="mt-1 px-1">
                  {editingId === pin.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={pin.caption}
                      onChange={(e) => updateCaption(pin.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditingId(null); }}
                      placeholder="write something…"
                      maxLength={60}
                      className="w-full bg-transparent text-center font-[cursive] text-[10px] text-gray-600 placeholder:text-gray-300 focus:outline-none"
                    />
                  ) : (
                    <p
                      onClick={() => setEditingId(pin.id)}
                      className="cursor-pointer text-center font-[cursive] text-[10px] text-gray-500 hover:text-gray-700"
                    >
                      {pin.caption || "tap to caption"}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              {editingId === pin.id && (
                <div className="absolute -bottom-10 left-1/2 z-20 flex -translate-x-1/2 gap-1">
                  <button type="button" onClick={() => nudge(pin.id, -3, 0)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold shadow-sm hover:bg-white">←</button>
                  <button type="button" onClick={() => nudge(pin.id, 3, 0)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold shadow-sm hover:bg-white">→</button>
                  <button type="button" onClick={() => nudge(pin.id, 0, -3)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold shadow-sm hover:bg-white">↑</button>
                  <button type="button" onClick={() => nudge(pin.id, 0, 3)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold shadow-sm hover:bg-white">↓</button>
                  <button type="button" onClick={() => tilt(pin.id, -5)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] shadow-sm hover:bg-white">⟲</button>
                  <button type="button" onClick={() => tilt(pin.id, 5)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] shadow-sm hover:bg-white">⟳</button>
                  <button type="button" onClick={() => removePin(pin.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-100 text-[10px] font-bold text-blush-500 shadow-sm hover:bg-blush-200">✕</button>
                </div>
              )}
            </motion.div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] font-medium text-ink-soft">
        drag to move · tap to caption · photos stay in your vault
      </p>

      {/* Picker overlay — real vault photos + doodles */}
      <AnimatePresence>
        {pickerOpen && (
          <VaultPhotoPicker
            photos={photos}
            onSelect={(vaultId, art) => {
              addPin(vaultId, art);
              setPickerOpen(false);
            }}
            onMakeNew={openMakeNew}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Picker overlay ─────────────────────────────────────────────── */

function VaultPhotoPicker({
  photos,
  onSelect,
  onMakeNew,
  onClose,
}: {
  photos: VaultItem[];
  onSelect: (vaultId: string, art: string) => void;
  onMakeNew: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-deep/30 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="clay-card max-h-[70vh] w-full max-w-sm overflow-y-auto p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink-deep">choose a photo to pin</p>
          <button type="button" onClick={onClose} className="clay-chip flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-ink-soft">✕</button>
        </div>
        {photos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-soft">no photos in your vault yet</p>
            <button
              type="button"
              onClick={onMakeNew}
              className="clay-btn mt-3 rounded-full px-4 py-2 text-xs font-bold text-white"
            >
              make a new one
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => onSelect(item._id, item.art)}
                className={cn(
                  "aspect-square overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-lavender-400 hover:scale-105",
                  !isImageArt(item.art) && "tile-lavender flex items-center justify-center",
                )}
              >
                {isImageArt(item.art) ? (
                  <img src={item.art} alt={item.caption ?? "photo"} draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">{item.art}</span>
                )}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onMakeNew}
          className="mt-3 w-full rounded-full py-2 text-[11px] font-bold text-ink-soft transition-colors hover:bg-lavender-100/60 hover:text-ink-deep"
        >
          + make a new photo instead
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── "Pin to wall" option after saving anywhere ─────────────────── */

/**
 * Optional chip a save flow can render next to its success toast/action:
 * stores the art in the vault, arms the one-shot pending pin, and jumps to
 * the wall where it is pinned automatically.
 */
export function PinToWallButton({ art, caption }: { art: string; caption?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        let vaultId = "";
        try {
          const row = createVaultItem({ kind: "photo", art, bg: "tile-peach", caption: caption || "pinned moment" });
          vaultId = row._id;
        } catch { /* ignore */ }
        armPendingPin(vaultId, art);
        navigate("/dashboard/polaroid-wall");
      }}
      className="clay-chip rounded-full px-3 py-1.5 text-[11px] font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
    >
      pin to wall 📌
    </button>
  );
}
