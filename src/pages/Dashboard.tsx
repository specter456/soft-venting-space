import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { cn } from "@/lib/utils";
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
  "/dashboard/games": "Games",
  "/dashboard/calendar": "Calendar",
  "/dashboard/settings": "Settings",
  "/dashboard/diary": "Diary",
};

/** Four tabs — Home, Games, Calendar, Settings. */
const TABS = [
  { to: "/dashboard", label: "Home", emoji: "🏠" },
  { to: "/dashboard/games", label: "Games", emoji: "🫧" },
  { to: "/dashboard/calendar", label: "Calendar", emoji: "📅" },
  { to: "/dashboard/settings", label: "Settings", emoji: "⚙️" },
];

/** Main screens that show the soft bottom taskbar. */
const BAR_ROUTES = [
  "/dashboard",
  "/dashboard/record",
  "/dashboard/create",
  "/dashboard/diary",
  "/dashboard/games",
  "/dashboard/calendar",
  "/dashboard/settings",
];

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

  // Scroll to top on every route change so header/greeting is always visible first.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

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
  const showBar = BAR_ROUTES.includes(location.pathname) || location.pathname.startsWith("/dashboard/calendar/");

  return (
    <div className="relative overflow-x-hidden text-ink">
      {/* dreamy background blobs — full viewport, new palette colors at 35% */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-lavender-200/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-blush-100/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-mint-200/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[40%] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-peach-100/35 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-[800px] flex-col">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-lavender-50/50 backdrop-blur-xl px-5 pt-6 pb-3 border-b border-lavender-100/40">
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
        <main className={cn("flex-1 px-5", showBar ? "pb-32" : "pb-14")}>
          {/* The shell paints instantly; room content fills in softly once
              the on-device cache is ready. No blocking "Loading…" screen. */}
          {hydrated ? (
            <Outlet />
          ) : (
            <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
              <Logo className="h-14 w-14 animate-floaty-slow" />
              <p className="text-sm font-semibold text-ink-soft">
                warming up your soft space…
              </p>
            </div>
          )}
        </main>

        {/* ─── Bottom taskbar — Home | Games | Settings ───────────── */}
        {showBar && (
          <nav
            aria-label="Main"
            className="fixed right-0 bottom-4 left-0 z-40 flex justify-center px-5"
          >
            <div className="flex w-full max-w-[720px] items-center gap-1 rounded-full p-1.5 bg-white/50 backdrop-blur-xl border border-lavender-100/50 shadow-lg shadow-lavender-200/25">
              {TABS.map((tab) => {
                const active = tab.to === "/dashboard/calendar"
                  ? location.pathname.startsWith("/dashboard/calendar")
                  : location.pathname === tab.to;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-all",                        active
                          ? "bg-lavender-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                          : "hover:bg-lavender-100/60",
                    )}
                  >
                    <span
                      className={cn(
                        "text-lg leading-none transition-transform",
                        active ? "scale-110" : "opacity-75",
                      )}
                      aria-hidden
                    >
                      {tab.emoji}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        active ? "text-ink-deep" : "text-ink-soft",
                      )}
                    >
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
