import { useQuery } from "convex/react";
import { Loader2, Lock, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { LockScreen } from "@/components/LockScreen";
import { useAuth } from "@/hooks/use-auth";

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
 * The app shell. Every room in Venting lives inside this mobile-width column,
 * protected by the passcode lock. The lock gates the whole app once per load;
 * the vault adds its own second lock on top.
 */
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hasPasscode = useQuery(api.passcode.hasPasscode);
  const passcodeData = useQuery(api.passcode.getPasscode);

  const [lock, setLock] = useState<"setup" | "unlock" | "unlocked">("unlocked");
  const [lockInitDone, setLockInitDone] = useState(false);

  // Decide the initial lock state once the passcode query resolves. This
  // adjusts state during render (guarded, so it runs once) instead of in an
  // effect — React re-renders immediately and no cascade is triggered.
  if (!lockInitDone && hasPasscode !== undefined) {
    setLockInitDone(true);
    if (hasPasscode) {
      setLock("unlock");
    } else if (sessionStorage.getItem(LOCK_DISMISSED_KEY) !== "1") {
      setLock("setup");
    }
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isHome = location.pathname === "/dashboard";
  const title = TITLES[location.pathname] ?? "Venting";

  // ─── Lock overlays ───────────────────────────────────────────────
  if (hasPasscode === undefined) {
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
          sessionStorage.setItem(LOCK_DISMISSED_KEY, "1");
          setLock("unlocked");
        }}
      />
    );
  }

  if (lock === "unlock") {
    if (!passcodeData) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-cream-soft via-cream to-lavender-50">
          <Loader2 className="size-5 animate-spin text-lavender-400" />
        </div>
      );
    }
    return (
      <LockScreen
        mode="unlock"
        storedHash={passcodeData.hash}
        storedSalt={passcodeData.salt}
        onUnlock={() => setLock("unlocked")}
      />
    );
  }

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
              <button
                type="button"
                onClick={handleSignOut}
                className="clay-chip flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-transform hover:scale-105 hover:text-ink-deep"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          {isHome && (
            <p className="mt-1.5 flex items-center gap-1.5 pl-0.5 text-[11px] font-semibold text-ink-soft">
              <span aria-hidden>🔒</span> only you can see this space · {user?.name?.split(" ")[0] ?? "friend"}
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
