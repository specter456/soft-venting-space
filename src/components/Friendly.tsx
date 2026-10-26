import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCopyFeedback } from "@/lib/clipboard";
import { friendlyErrorText } from "@/lib/friendly";

/**
 * Friendly full-screen fallback for the app error boundary. No raw error
 * codes — just warmth, a retry, and a way back in.
 */
export function FriendlyCrashFallback({
  onRetry,
  onContinue,
  title = "something went softly wrong.",
  code,
  onCopy,
  onShare,
}: {
  onRetry: () => void;
  onContinue?: () => void;
  title?: string;
  code?: string;
  onCopy?: () => boolean | void | Promise<boolean | void>;
  onShare?: () => void;
}) {
  const { copied, markCopied } = useCopyFeedback();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-cream-soft via-cream to-lavender-50 p-6 text-ink">
      <div className="clay-card w-full max-w-sm px-6 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lavender-100 text-3xl">
          💜
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{friendlyErrorText()}</p>
        {code && (
          <>
            <p className="mt-3 text-[11px] font-mono font-semibold text-lavender-600">
              snag #{code}
            </p>
            <p className="mt-1 text-[11px] text-ink-soft">
              if this keeps happening, tell them this code: {code}
            </p>
          </>
        )}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="clay-btn px-5 py-3 text-sm font-bold text-ink-deep"
          >
            try again
          </button>
          {onCopy && (
            <button
              type="button"
              onClick={async () => {
                const ok = await onCopy();
                if (ok !== false) markCopied();
              }}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
            >
              {copied ? "copied! ✓" : "copy report"}
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
            >
              share report
            </button>
          )}
          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
            >
              back to home
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

/* ─── Online / offline ─────────────────────────────────────────────── */

function useOnline(): boolean {
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
    <div className="clay-card w-full px-5 py-6 text-center">
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
          className="clay-btn px-5 py-2.5 text-sm font-bold text-ink-deep"
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
