import { Lock } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
import { UnsavedDialog } from "@/components/UnsavedDialog";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import MusicWidget from "@/components/MusicWidget";
import BreathingMinute from "@/components/BreathingMinute";
import SeasonalParticles from "@/components/SeasonalParticles";
import GentleReminder from "@/components/GentleReminder";
import { getKvFromCache } from "@/lib/db";
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
  "/dashboard/polaroid-wall": "Polaroid Wall",
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
  // Use a ref to track whether the lock-init effect has already acted.
  // Refs survive StrictMode double-fire and prevent the logic from running
  // more than once, even when deps change (e.g. hasPasscode flips from
  // false→true after kv loads).
  const lockInitRef = useRef(false);
  const lockHadPasscodeRef = useRef(false);
  const navigate = useNavigate();
  const goHome = useCallback(() => navigate("/dashboard"), [navigate]);
  const { showGuard, handleSave, handleLeave, handleBack } = useUnsavedGuard(goHome);

  // Scroll to top on every route change so header/greeting is always visible first.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  const isHome = location.pathname === "/dashboard";
  const title = TITLES[location.pathname] ?? "Venting";
  const showBar = BAR_ROUTES.includes(location.pathname) || location.pathname.startsWith("/dashboard/calendar/");

  // Set document title for the private dashboard
  useEffect(() => {
    document.title = title === "Venting" ? "Venting" : `${title} — Venting`;
  }, [title]);

  // Decide the initial lock state once storage has hydrated.
  // The ref guard ensures we only set lock state ONCE across all renders.
  // We must wait until hydrated AND the kv table has actually loaded
  // (hasPasscode may start as false then flip to true once data arrives).
  useEffect(() => {
    if (!hydrated || lockInitRef.current) return;
    try {
      // If the user JUST completed onboarding in this session, skip the lock
      // (they already typed their passcode moments ago).
      if (sessionStorage.getItem("venting-just-onboarded") === "1") {
        sessionStorage.removeItem("venting-just-onboarded");
        lockInitRef.current = true;
        // stays "unlocked"
        return;
      }
      // If we haven't loaded kv data yet, wait for it before deciding.
      // hasPasscode flips from false→true once the kv table populates.
      if (hasPasscode && !lockHadPasscodeRef.current) {
        lockHadPasscodeRef.current = true;
      }
      if (!lockHadPasscodeRef.current && !hasPasscode) {
        // kv data hasn't shown a passcode yet — don't decide yet.
        // Also don't set lockInitRef so we can re-check on next render.
        if (safeSessionGetItem(LOCK_DISMISSED_KEY) === "1") {
          // User already dismissed setup — go straight in.
          lockInitRef.current = true;
        }
        return;
      }
      // Now we know: either hasPasscode is true (and we saw it),
      // or kv loaded and there's no passcode.
      lockInitRef.current = true;
      if (hasPasscode) {
        setLock("unlock");
      } else if (safeSessionGetItem(LOCK_DISMISSED_KEY) !== "1") {
        setLock("setup");
      }
    } catch {
      // Any storage error must never block the user from reaching home
      lockInitRef.current = true;
    }
  }, [hydrated, hasPasscode]);

  // If we're in unlock mode but the passcode data vanished mid-session, skip to unlocked.
  useEffect(() => {
    if (lock === "unlock" && (!passcodeHash || !passcodeSalt)) {
      setLock("unlocked");
    }
  }, [lock, passcodeHash, passcodeSalt]);

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
      // Passcode data not yet available — either it vanished mid-session
      // or kv hasn't finished loading. The secondary useEffect above will
      // set lock="unlocked" if the data truly vanished. For now, show a
      // gentle loading state instead of a blank screen.
      return (
        <div className="flex min-h-dvh items-center justify-center text-ink" style={{background: "linear-gradient(180deg, var(--theme-bg-start, #9CCFF0) 0%, var(--theme-bg-mid, #C6E6FA) 50%, var(--theme-bg-end, #EAF7FF) 100%)"}}>
          <div className="text-center">
            <Logo className="mx-auto h-12 w-12 animate-floaty-slow" />
            <p className="mt-3 text-sm font-semibold text-ink-soft">
              opening your space…
            </p>
          </div>
        </div>
      );
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

  return (
    <div className="relative overflow-x-hidden text-ink">
      {/* dreamy background blobs — full viewport, theme colors */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full blur-2xl"
        style={{ background: "var(--theme-blob-1, rgba(180,210,240,0.3))" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full blur-2xl"
        style={{ background: "var(--theme-blob-2, rgba(255,255,255,0.4))" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full blur-2xl"
        style={{ background: "var(--theme-blob-3, rgba(200,225,250,0.3))" }}
      />

      {/* ─── Drifting sky clouds (decorative) ──────────────────── */}
      <div className="sky-cloud sky-cloud-1" aria-hidden />
      <div className="sky-cloud sky-cloud-2" aria-hidden />
      <div className="sky-cloud sky-cloud-3" aria-hidden />
      <div className="sky-cloud sky-cloud-4" aria-hidden />

      <SeasonalParticles />
      <div className="relative mx-auto flex w-full max-w-[600px] flex-col">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 px-5 pt-6 pb-3 border-b border-white/40" style={{ background: "var(--theme-header-bg, rgba(200,225,250,0.8))" }}>
          <div className="flex items-center justify-between">
            {isHome ? (
              <div className="flex items-center gap-2.5">
                <HeaderAvatar />
                <div className="leading-tight">
                  <p className="text-base font-bold tracking-tight text-ink-deep">
                    Venting
                  </p>
                  <p className="font-script text-[13px] font-semibold text-ink-soft">
                    your soft space
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="clay-chip flex h-10 w-10 items-center justify-center rounded-full text-ink-deep transition-transform hover:scale-105 active:scale-95"
                  aria-label="Back home"
                  title="Back home"
                >
                  <span aria-hidden className="text-base leading-none">
                    ←
                  </span>
                </button>
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
        <main className={cn("px-5", showBar ? "pb-32" : "pb-14")}>
          <MusicWidget />
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

        {showGuard && <UnsavedDialog onSave={handleSave} onLeave={handleLeave} />}

        {/* ─── Gentle daily reminder (one toast per day) ────────── */}
        <GentleReminder />

        {/* ─── "I need a minute" breathing bubble — ONLY after unlock ──── */}
        <BreathingMinute />

        {/* ─── Bottom taskbar — Home | Games | Calendar | Settings ───── */}
        {showBar && (
          <nav
            aria-label="Main"
            className="fixed right-0 bottom-4 left-0 z-40 flex justify-center px-5"
          >
            <div
              className="flex w-full max-w-[720px] items-center gap-1 p-1.5 bg-white/70 backdrop-blur-md border border-white/50 shadow-lg shadow-[#8C9AD6]/15"
              style={{ borderRadius: "24px" }}
            >
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
                      "flex flex-1 flex-col items-center gap-0.5 py-2 transition-all",
                      !active && "hover:bg-[var(--theme-accent-light)]",
                    )}
                    style={{
                      borderRadius: "999px",
                      ...(active ? { background: "var(--theme-accent-deep, #5A8ABE)" } : {}),
                    }}
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
                        active ? "text-white" : "text-ink-soft",
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

function HeaderAvatar() {
  try {
    const avatar = getKvFromCache("profileAvatar") || "💜";
    if (avatar.startsWith("data:") || avatar.startsWith("http")) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--theme-accent-light)]">
          <img src={avatar} alt="your face" className="h-full w-full object-cover" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent-light)] text-xl">
        <span aria-hidden>{avatar}</span>
      </div>
    );
  } catch {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent-light)] text-xl">
        <span aria-hidden>💜</span>
      </div>
    );
  }
}
