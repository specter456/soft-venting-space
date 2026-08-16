import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Never show raw technical text — every failure gets a gentle explanation. */
export function friendlyErrorText(): string {
  return "Something went soft for a second. Don't worry — your feelings are all still safe on this device. Try again, and if it keeps happening, we're here for you.";
}

/**
 * Friendly full-screen fallback for the app error boundary. No raw error
 * codes — just warmth, a retry, and a way back in.
 */
export function FriendlyCrashFallback({
  onRetry,
  onContinue,
  title = "Something went soft.",
}: {
  onRetry: () => void;
  onContinue?: () => void;
  title?: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-cream-soft via-cream to-lavender-50 p-6 text-ink">
      <div className="clay-card w-full max-w-sm rounded-[2rem] px-6 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lavender-100 text-3xl">
          ☁️
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{friendlyErrorText()}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="clay-btn rounded-full px-5 py-3 text-sm font-bold text-ink-deep"
          >
            Try again
          </button>
          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
            >
              Continue offline
            </button>
          ) : null}
        </div>
        <p className="mt-5 text-[11px] font-semibold text-ink-soft">
          🔒 Private and safe. Only you can see this.
        </p>
      </div>
    </div>
  );
}

/** Show a friendly toast for an unexpected error (no raw message). */
export function showFriendlyErrorToast(): void {
  toast.error("A soft hiccup", {
    description: friendlyErrorText(),
    action: {
      label: "Try again",
      onClick: () => window.location.reload(),
    },
  });
}

/* ─── Online / offline ─────────────────────────────────────────────── */

export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/**
 * Gentle, non-blocking offline notice. Venting is fully local, so being
 * offline changes nothing — this just explains it clearly.
 */
export function OfflineNotice({ className }: { className?: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className={cn(
        "clay-chip mx-auto w-fit max-w-full rounded-full px-4 py-2 text-center text-xs font-bold text-ink",
        className,
      )}
    >
      <span aria-hidden>🕊️</span> You&apos;re offline — that&apos;s okay. Everything is saved on
      this device, and nothing here needs a connection.
    </div>
  );
}

/**
 * Friendly connection message for any failed network call, with the two
 * required actions. Venting keeps working locally either way.
 */
export function ConnectionFallback({
  onRetry,
  onContinue,
}: {
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="clay-card w-full rounded-[2rem] px-5 py-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blush-100 text-2xl">
        📡
      </div>
      <h2 className="mt-3 text-base font-bold tracking-tight text-ink-deep">
        We couldn&apos;t connect
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        This usually means there is no internet connection right now. Your private data is still
        safe on this device — you can keep using Venting without a connection.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="clay-btn rounded-full px-5 py-2.5 text-sm font-bold text-ink-deep"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full px-5 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
        >
          Continue offline
        </button>
      </div>
    </div>
  );
}
