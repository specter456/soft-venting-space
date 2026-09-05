import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { isImageArt } from "@/lib/canvas-art";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "venting-polaroid-wall";

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
    if (raw) return JSON.parse(raw) as PolaroidPin[];
  } catch { /* ignore */ }
  return [];
}

function saveWall(pins: PolaroidPin[]) {
  safeSetItem(STORAGE_KEY, JSON.stringify(pins));
}

/** Card on Home screen */
export default function PolaroidWallSection() {
  const wall = loadWall();
  return (
    <section>
      <Link
        to="/dashboard/polaroid-wall"
        className="clay-card group flex items-center gap-3 px-5 py-4 transition-transform hover:-translate-y-0.5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl tile-lavender text-xl">
          <span aria-hidden className="drop-shadow-sm">📸</span>
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-tight text-ink-deep">
            polaroid wall
          </span>
          <span className="block text-[11px] font-medium text-ink-soft">
            {wall.length > 0 ? `${wall.length} photo${wall.length === 1 ? "" : "s"} pinned` : "pin your favorite moments"}
          </span>
        </div>
        <span className="text-sm text-ink-soft group-hover:text-ink-deep transition-colors">→</span>
      </Link>
    </section>
  );
}

/** Full wall screen */
export function PolaroidWallScreen() {
  const [pins, setPins] = useState<PolaroidPin[]>(loadWall);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);

  const persist = useCallback((next: PolaroidPin[]) => {
    setPins(next);
    saveWall(next);
  }, []);

  const addPin = (vaultId: string, art: string) => {
    const pin: PolaroidPin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vaultId,
      art,
      caption: "",
      x: 10 + Math.random() * 60,
      y: 10 + Math.random() * 60,
      tilt: (Math.random() - 0.5) * 16,
    };
    persist([...pins, pin]);
    setShowPicker(false);
  };

  const removePin = (id: string) => {
    persist(pins.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateCaption = (id: string, caption: string) => {
    persist(pins.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const nudge = (id: string, dx: number, dy: number) => {
    persist(pins.map((p) => (p.id === id ? { ...p, x: Math.max(0, Math.min(90, p.x + dx)), y: Math.max(0, Math.min(90, p.y + dy)) } : p)));
  };

  const tilt = (id: string, d: number) => {
    persist(pins.map((p) => (p.id === id ? { ...p, tilt: p.tilt + d } : p)));
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-ink-deep">📸 polaroid wall</p>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="clay-chip rounded-full px-3 py-1.5 text-[11px] font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
        >
          + pin a photo
        </button>
      </div>

      {/* Cork board */}
      <div
        ref={wallRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative min-h-[60vh] overflow-hidden rounded-3xl border-2 border-dashed border-[#C4A882]/40"
        style={{ background: "linear-gradient(135deg, #E8D5B7 0%, #DCC9A3 50%, #E0CEAE 100%)" }}
      >
        {pins.length === 0 && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <span className="text-4xl">📌</span>
              <p className="mt-2 text-sm font-bold text-[#8B7355]">your wall is empty</p>
              <p className="mt-1 text-xs text-[#A08B6B]">pin your favorite photos from the vault</p>
            </div>
          </div>
        )}

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

      {/* Photo picker overlay */}
      {showPicker && (
        <VaultPhotoPicker onSelect={addPin} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

/** Simple vault photo picker (reads from localStorage vault items) */
function VaultPhotoPicker({ onSelect, onClose }: { onSelect: (vaultId: string, art: string) => void; onClose: () => void }) {
  // Read vault items from localStorage
  let items: { _id: string; art: string; kind: string; caption?: string }[] = [];
  try {
    const raw = safeGetItem("venting-vault-items");
    if (raw) items = JSON.parse(raw);
  } catch { /* ignore */ }

  const photos = items.filter((i) => i.kind === "photo" || i.kind === "doodle");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-deep/30 px-5 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="clay-card w-full max-w-sm max-h-[70vh] overflow-y-auto p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink-deep">choose a photo to pin</p>
          <button type="button" onClick={onClose} className="clay-chip flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-ink-soft">✕</button>
        </div>
        {photos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-soft">no photos in your vault yet</p>
            <Link to="/dashboard/create" onClick={onClose} className="mt-3 inline-block rounded-full bg-lavender-500 px-4 py-2 text-xs font-bold text-white">
              create a photo first
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => onSelect(item._id, item.art)}
                className={cn("aspect-square overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-lavender-400 hover:scale-105", item.art && isImageArt(item.art) ? "" : "tile-lavender flex items-center justify-center")}
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
      </motion.div>
    </div>
  );
}
