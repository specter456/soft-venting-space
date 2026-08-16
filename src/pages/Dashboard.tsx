import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Logo } from "@/components/Logo";
import { LockScreen } from "@/components/LockScreen";
import {
  KV_PASSCODE_HASH,
  KV_PASSCODE_SALT,
  useHydrated,
  useTable,
  type KVPair,
} from "@/lib/db";
import { safeSessionGetItem, safeSessionSetItem } from "@/lib/safe-storage";

const LOCK_DISMISSED_KEY = "venting-lock-dismissed";

const TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/record": "Record",
  "/dashboard/notes": "Notes",
  "/dashboard/notes/new": "New note",
  "/dashboard/create": "Create",
  "/dashboard/scribble": "Scribble",
  "/dashboard/stickers": "Stickers",
  "/dashboard/gif-studio": "GIF Studio",
  "/dashboard/vault": "Private vault",
  "/dashboard/calm": "Calm",
  "/dashboard/diary": "Diary",
};

/**
 * The app shell. Every room lives inside this mobile-width column behind the
 * on-device passcode lock. All data is stored locally — there are no accounts
 * and no network calls for user content.
 */
export default function Dashboard() {
  const location = useLocation();
  const hydrated = useHydrated();
  const kv = useTable<KVPair>("kv");

  const hasPasscode =
    kv.some((k) => k.key === KV_PASSCODE_HASH && k.value) &&
    kv.some((k) => k.key === KV_PASSCODE_SALT && k.value);
  const passcodeHash = kv.find((k) => k.key === KV_PASSCODE_HASH)?.value;
  const passcodeSalt = kv.find((k) => k.key === KV_PASSCODE_SALT)?.value;

  const [lock, setLock] = useState<"setup" | "unlock" | "unlocked">("unlocked");
  const [lockInitDone, setLockInitDone] = useState(false);

  // Decide the initial lock state once storage has hydrated. Adjusting state
  // during render (guarded, runs once) avoids effect cascades.
  if (hydrated && !lockInitDone) {
    setLockInitDone(true);
    if (hasPasscode) {
      setLock("unlock");
    } else if (safeSessionGetItem(LOCK_DISMISSED_KEY) !== "1") {
      setLock("setup");
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-cream-soft via-cream to-lavender-50">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-12 w-12 animate-pulse" />
          <Loader2 className="size-4 animate-spin text-lavender-400" />
        </div>
      </div>
    );
  }

  if (lock === "setup") {
    return (
      <LockScreen
        mode="setup"
        title="Lock your space"
        subtitle="A four-digit passcode keeps your feelings safe behind a soft lock."
        closeLabel="Maybe later"
        onComplete={() => setLock("unlocked")}
        onClose={() => {
          safeSessionSetItem(LOCK_DISMISSED_KEY, "1");
          setLock("unlocked");
        }}
      />
    );
  }

  if (lock === "unlock") {
    if (!passcodeHash || !passcodeSalt) {
      // passcode was removed mid-session — treat as unlocked
      setLock("unlocked");
      return null;
    }
    return (
      <LockScreen
        mode="unlock"
        storedHash={passcodeHash}
        storedSalt={passcodeSalt}
        onUnlock={() => setLock("unlocked")}
      />
    );
  }

  const isHome = location.pathname === "/dashboard";
  const title = TITLES[location.pathname] ?? "Venting";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-cream-soft via-cream to-lavender-50 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-lavender-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-blush-100/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-mint-100/50 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-cream-soft/70 px-5 pt-6 pb-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            {isHome ? (
              <div className="flex items-center gap-2.5">
                <Logo className="h-10 w-10" />
                <div className="leading-tight">
                  <p className="text-base font-bold tracking-tight text-ink-deep">
                    Venting
                  </p>
                  <p className="text-[11px] font-medium text-ink-soft">
                    your soft space
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/dashboard"
                  className="clay-chip flex h-10 w-10 items-center justify-center rounded-full text-ink-deep transition-transform hover:scale-105 active:scale-95"
                  aria-label="Back home"
                  title="Back home"
                >
                  <span aria-hidden className="text-base leading-none">
                    ←
                  </span>
                </Link>
                <p className="text-base font-bold tracking-tight text-ink-deep">
                  {title}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {hasPasscode && (
                <button
                  type="button"
                  onClick={() => setLock("unlock")}
                  className="clay-chip flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-transform hover:scale-105 hover:text-ink-deep"
                  aria-label="Lock your space now"
                  title="Lock now"
                >
                  <Lock className="size-4" />
                </button>
              )}
            </div>
          </div>
          {isHome && (
            <p className="mt-1.5 flex items-center gap-1.5 pl-0.5 text-[11px] font-semibold text-ink-soft">
              <span aria-hidden>🔒</span> only you can see this space · everything
              stays on this device
            </p>
          )}
        </header>

        {/* ─── Current room ───────────────────────────────────────── */}
        <main className="flex-1 px-5 pb-14">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
