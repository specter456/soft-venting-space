import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Clapperboard,
  ImageIcon,
  LockKeyhole,
  Sticker,
  Trash2,
} from "lucide-react";
import { LockScreen } from "@/components/LockScreen";
import {
  KV_PASSCODE_HASH,
  KV_PASSCODE_SALT,
  removeItem,
  useTable,
  type KVPair,
  type VaultItem,
} from "@/lib/db";
import { isImageArt } from "@/lib/canvas-art";
import { cn } from "@/lib/utils";

type Filter = "all" | "photo" | "video" | "gif" | "doodle" | "sticker";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photos" },
  { id: "video", label: "Videos" },
  { id: "gif", label: "GIFs" },
  { id: "doodle", label: "Doodles" },
  { id: "sticker", label: "Stickers" },
];

const KIND_META: Record<string, { label: string; icon: typeof ImageIcon }> = {
  photo: { label: "photo", icon: ImageIcon },
  video: { label: "video vent", icon: Clapperboard },
  gif: { label: "gif", icon: Clapperboard },
  doodle: { label: "doodle", icon: ImageIcon },
  sticker: { label: "sticker", icon: Sticker },
};

export default function VaultScreen() {
  const navigate = useNavigate();
  const kv = useTable<KVPair>("kv");
  const items = useTable<VaultItem>("vaultItems");

  // the second (vault) lock reads the same on-device passcode and really
  // verifies it — wrong or empty codes never open the vault
  const passcodeHash = kv.find((k) => k.key === KV_PASSCODE_HASH)?.value;
  const passcodeSalt = kv.find((k) => k.key === KV_PASSCODE_SALT)?.value;
  const stored =
    passcodeHash && passcodeSalt ? { hash: passcodeHash, salt: passcodeSalt } : null;

  // memory-only: the vault re-locks after a refresh — the double-locked state
  // is always kept, and only a correct passcode opens it
  const [unlocked, setUnlocked] = useState(false);
  // the vault's second lock can be switched off in Settings (default on)
  const doubleLock =
    kv.find((k) => k.key === "vaultDoubleLock")?.value !== "false";
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const handleUnlock = () => {
    setUnlocked(true);
  };

  if (!stored) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="clay-card w-full max-w-xs px-6 py-10 text-center">
          <span className="text-4xl">🗝️</span>
          <p className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
            The vault needs a passcode first
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Set your app passcode on the home screen, then come back to unlock
            the vault with its second lock.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="clay-btn mt-6 w-full rounded-2xl px-5 py-3 text-sm font-bold text-cream-soft"
          >
            Set passcode
          </button>
        </div>
      </div>
    );
  }

  if (!unlocked && doubleLock) {
    return (
      <LockScreen
        mode="unlock"
        doubleLock
        storedHash={stored.hash}
        storedSalt={stored.salt}
        title="Your private vault"
        subtitle="A second lock, just for the things you keep closest."
        closeLabel="Back home"
        onUnlock={handleUnlock}
        onClose={() => navigate("/dashboard")}
      />
    );
  }

  const shown = items.filter((i) => filter === "all" || i.kind === filter);
  const openItem = openId ? items.find((i) => i._id === openId) : undefined;

  return (
    <div className="space-y-5">
      {/* ─── Auth indicator ───────────────────────────────────────── */}
      <div className="clay-card flex items-center justify-between gap-2 rounded-3xl px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-bold text-ink-deep">
          <LockKeyhole className="size-4 text-lavender-600" />
          {doubleLock ? "double-locked" : "vault lock off — turn it on in Settings"}
        </p>
        <span className="clay-chip flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-ink-soft">
          🔐 passcode protected
        </span>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-transform",
              filter === f.id
                ? "bg-lavender-500 text-cream-soft shadow-[0_6px_12px_-6px_rgba(118,90,190,0.6)]"
                : "clay-chip text-ink hover:-translate-y-0.5",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ─── Gallery ──────────────────────────────────────────────── */}
      {shown.length === 0 ? (
        <div className="clay-card px-6 py-12 text-center">
          <span className="text-4xl">🫙</span>
          <p className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
            This shelf is empty
          </p>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-sm leading-relaxed text-ink-soft">
            Photos, video vents, doodles, stickers and GIFs gather here — safe
            behind the double lock.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard/create")}
            className="clay-btn mt-6 px-6 py-3 text-sm font-bold text-cream-soft"
          >
            Keep your first photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {shown.map((item, i) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            const image = isImageArt(item.art);
            return (
              <motion.button
                key={item._id}
                type="button"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                onClick={() => setOpenId(item._id)}
                className="clay-chip group relative flex aspect-[4/5] flex-col items-center justify-center gap-1.5 overflow-hidden p-3"
              >
                <div
                  className={cn(
                    "absolute inset-2 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-3xl transition-transform group-hover:scale-105",
                    item.bg || "tile-lavender",
                  )}
                >
                  {image ? (
                    <img
                      src={item.art}
                      alt={item.caption ?? meta.label}
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-4xl drop-shadow-sm">{item.art}</span>
                      <span className="max-w-full truncate px-2 text-[9px] font-bold text-ink-deep/70">
                        {item.caption ?? meta.label}
                      </span>
                    </>
                  )}
                </div>
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink-deep/60">
                  <LockKeyhole className="size-2 text-cream-soft" />
                </span>
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[7px] font-bold text-ink-soft">
                  <Icon className="size-2" />
                  {meta.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] font-semibold text-ink-soft">
        🔒 everything here is visible only to you — no feed, no followers
      </p>

      {/* ─── Detail dialog ────────────────────────────────────────── */}
      {openItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-deep/30 px-5 backdrop-blur-sm"
          onClick={() => setOpenId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="clay-card w-full max-w-xs p-5 text-center"
          >
            <div
              className={cn(
                "mx-auto flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl",
                openItem.bg || "tile-lavender",
              )}
            >
              {isImageArt(openItem.art) ? (
                <img
                  src={openItem.art}
                  alt={openItem.caption ?? KIND_META[openItem.kind].label}
                  draggable={false}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-6xl drop-shadow-md">{openItem.art}</span>
              )}
            </div>
            <p className="mt-4 text-base font-bold tracking-tight text-ink-deep">
              {openItem.caption ?? KIND_META[openItem.kind].label}
            </p>
            <p className="mt-1 text-xs font-semibold text-ink-soft">
              {KIND_META[openItem.kind].label} · locked in your vault ·{" "}
              {new Date(openItem._creationTime).toLocaleDateString()}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="clay-btn-soft flex-1 px-4 py-2.5 text-sm font-bold text-ink-deep"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  removeItem("vaultItems", openItem._id);
                  setOpenId(null);
                  toast("Moved out of the vault", { description: "It's gone for good." });
                }}
                className="flex items-center justify-center gap-1.5 rounded-full bg-blush-100/80 px-4 py-2.5 text-sm font-bold text-blush-500 transition-colors hover:bg-blush-100"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
