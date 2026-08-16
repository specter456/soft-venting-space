import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { useState } from "react";
import { LockKeyhole, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LockScreen } from "@/components/LockScreen";

const VAULT_SESSION_KEY = "venting-vault-unlocked";

interface VaultDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The double-locked Photo Vault. Even after the app itself is unlocked, the
 * vault asks for the passcode again before showing anything. The vault is a
 * placeholder room in version one — its contents arrive in a later version.
 */
export function VaultDialog({ open, onClose }: VaultDialogProps) {
  const stored = useQuery(api.passcode.getPasscode);
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(VAULT_SESSION_KEY) === "1",
  );

  if (!open) return null;

  const handleUnlock = () => {
    sessionStorage.setItem(VAULT_SESSION_KEY, "1");
    setUnlocked(true);
  };

  const handleLock = () => {
    sessionStorage.removeItem(VAULT_SESSION_KEY);
    setUnlocked(false);
  };

  // Passcode not set up yet — the vault gently borrows the app lock until then.
  if (!stored) {
    return (
      <LockScreen
        mode="setup"
        doubleLock
        title="Lock your private vault"
        subtitle="One passcode guards the whole app; the vault adds a second gentle lock on top."
        closeLabel="Not now"
        onComplete={handleUnlock}
        onClose={onClose}
      />
    );
  }

  if (!unlocked) {
    return (
      <LockScreen
        mode="unlock"
        doubleLock
        storedHash={stored.hash}
        storedSalt={stored.salt}
        title="Your private vault"
        subtitle="A second lock, just for the things you keep closest."
        closeLabel="Back to my space"
        onUnlock={handleUnlock}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-gradient-to-b from-lavender-50 via-cream to-cream-soft text-ink">
      {/* dreamy blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-20 -right-16 h-72 w-72 rounded-full bg-lavender-100/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-20 -left-16 h-72 w-72 rounded-full bg-blush-100/60 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-full max-w-md flex-col px-5 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="clay-chip flex h-9 w-9 items-center justify-center rounded-full text-lavender-600">
              <LockKeyhole className="size-4" />
            </span>
            <p className="text-sm font-bold tracking-tight text-ink-deep">
              Private vault
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="clay-chip flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-transform hover:scale-105 hover:text-ink-deep"
            aria-label="Close vault"
          >
            <X className="size-4" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="clay-card mt-8 rounded-[2rem] px-6 py-12 text-center"
        >
          <div className="relative mx-auto flex w-fit items-center justify-center">
            <span className="clay-chip flex h-20 w-20 items-center justify-center rounded-full text-4xl drop-shadow-sm">
              🗝️
            </span>
            <span className="clay-chip absolute -right-6 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-sm">
              🔒
            </span>
          </div>
          <h2 className="mt-6 text-xl font-bold tracking-tight text-ink-deep">
            Your vault is empty — and safe
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink">
            Photos, videos, and voice expressions you keep here will be locked
            behind their own second passcode. This cozy room opens in the next
            version of Venting.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold text-lavender-600">
            <LockKeyhole className="size-3.5" />
            double-locked · only you can open it
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="clay-btn-soft mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-ink-deep"
          >
            <LockKeyhole className="size-4" /> Lock vault again
          </button>
        </motion.div>
      </div>
    </div>
  );
}
