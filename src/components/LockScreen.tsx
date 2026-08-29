import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Delete, LockKeyhole, Sparkles } from "lucide-react";
import { KV_PASSCODE_HASH, KV_PASSCODE_SALT, setKv } from "@/lib/db";
import { hashPasscode, randomSalt } from "@/lib/passcode";
import { cn } from "@/lib/utils";

type Mode = "setup" | "unlock";

interface LockScreenProps {
  mode: Mode;
  /** unlock mode only — the stored salted hash to verify against */
  storedHash?: string;
  storedSalt?: string;
  /** override the heading (e.g. "Your private vault") */
  title?: string;
  subtitle?: string;
  /** show the double-lock visual (app lock + vault lock) */
  doubleLock?: boolean;
  onUnlock?: () => void;
  onComplete?: () => void;
  onClose?: () => void;
  /** label for the small "not now" escape hatch */
  closeLabel?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function LockScreen({
  mode,
  storedHash,
  storedSalt,
  title,
  subtitle,
  doubleLock = false,
  onUnlock,
  onComplete,
  onClose,
  closeLabel = "Not now",
}: LockScreenProps) {
  const [digits, setDigits] = useState("");
  const [phase, setPhase] = useState<"enter" | "confirm">("enter");
  const [tempCode, setTempCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  // clear the gentle error message after a moment
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 2600);
    return () => clearTimeout(t);
  }, [error]);

  const heading =
    title ??
    (mode === "setup"
      ? phase === "enter"
        ? "Create your passcode"
        : "Confirm your passcode"
      : "Welcome back");

  const sub =
    subtitle ??
    (mode === "setup"
      ? "Four digits only you know — your space will lock safely behind them."
      : "Only you can access your feelings.");

  const fail = () => {
    setError("Hmm, that's not quite it — take a breath and try again.");
    setShakeKey((k) => k + 1);
    setDigits("");
  };

  const finishCode = async (code: string) => {
    if (mode === "setup" && phase === "enter") {
      setTempCode(code);
      setDigits("");
      setPhase("confirm");
      return;
    }

    if (mode === "setup" && phase === "confirm") {
      if (code !== tempCode) {
        fail();
        setPhase("enter");
        setTempCode("");
        return;
      }
      setBusy(true);
      try {
        const salt = randomSalt();
        const hash = await hashPasscode(code, salt);
        // stored only on this device — never sent anywhere
        await setKv(KV_PASSCODE_HASH, hash);
        await setKv(KV_PASSCODE_SALT, salt);
        toast("Passcode set", {
          description: "Your space is locked — only you can open it.",
        });
        onComplete?.();
      } catch (err) {
        console.error("Passcode setup failed:", err);
        setError("Couldn't save your passcode — please try again.");
        setDigits("");
      } finally {
        setBusy(false);
      }
      return;
    }

    // unlock mode
    if (storedHash && storedSalt) {
      setBusy(true);
      try {
        const hash = await hashPasscode(code, storedSalt);
        if (hash === storedHash) {
          setDigits("");
          onUnlock?.();
        } else {
          fail();
        }
      } catch (err) {
        console.error("Passcode verification failed:", err);
        fail();
      } finally {
        setBusy(false);
      }
    }
  };

  const pressDigit = (d: string) => {
    if (busy || digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      void finishCode(next);
    }
  };

  const backspace = () => {
    if (busy) return;
    setDigits((d) => d.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-gradient-to-b from-cream-soft via-cream to-lavender-50 text-ink">
      {/* dreamy blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-blush-100/40 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-24 bottom-0 h-80 w-80 rounded-full bg-mint-100/40 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-lavender-100/35 blur-2xl"
      />

      <div className="relative flex min-h-full items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="clay-card relative w-full max-w-xs rounded-[2.5rem] px-6 pt-9 pb-7 sm:max-w-sm"
        >
          {/* floating sparkles */}
          <Sparkles className="animate-twinkle absolute top-7 left-8 size-4 text-lavender-400" />
          <Sparkles
            className="animate-twinkle absolute top-14 right-9 size-3 text-blush-400"
            style={{ animationDelay: "1s" }}
          />

          {/* lock emblem */}
          <div className="relative mx-auto flex w-fit items-center justify-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="clay-chip flex h-20 w-20 items-center justify-center rounded-full"
            >
              <span className="text-4xl drop-shadow-sm" aria-hidden>
                🔒
              </span>
            </motion.div>
            {doubleLock && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.22 }}
                className="clay-chip -ml-5 flex h-16 w-16 items-center justify-center rounded-full"
              >
                <span className="text-3xl drop-shadow-sm" aria-hidden>
                  🔒
                </span>
              </motion.div>
            )}
          </div>

          <h1 className="mt-5 text-center text-xl font-bold tracking-tight text-ink-deep">
            {heading}
          </h1>
          <p className="mt-1.5 text-center text-sm leading-relaxed text-ink-soft">
            {sub}
          </p>
          {mode === "unlock" && (
            <p className="mt-2 text-center text-xs font-bold text-lavender-600">
              Private and safe. Only you can see this.
            </p>
          )}

          {/* dots */}
          <motion.div
            key={shakeKey}
            animate={shakeKey ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : undefined}
            transition={{ duration: 0.4 }}
            className="mt-6 flex items-center justify-center gap-3"
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                animate={{ scale: digits.length > i ? 1.15 : 1 }}
                className={cn(
                  "h-3.5 w-3.5 rounded-full transition-colors duration-200",
                  digits.length > i
                    ? "bg-lavender-500 shadow-[0_2px_6px_rgba(122,92,190,0.5)]"
                    : "bg-lavender-200",
                )}
              />
            ))}
          </motion.div>

          {error && (
            <p className="mt-3 text-center text-xs font-semibold text-blush-500">
              {error}
            </p>
          )}
          {busy && (
            <p className="mt-3 text-center text-xs font-semibold text-ink-soft">
              holding it safely…
            </p>
          )}

          {/* number pad */}
          <div className="mx-auto mt-6 grid w-fit grid-cols-3 gap-x-5 gap-y-3">
            {KEYS.map((k) => (
              <PadKey key={k} digit={k} onPress={pressDigit} disabled={busy} />
            ))}
            <span aria-hidden />
            <PadKey digit="0" onPress={pressDigit} disabled={busy} />
            <button
              type="button"
              onClick={backspace}
              disabled={busy || digits.length === 0}
              className="flex h-16 w-16 items-center justify-center rounded-full text-ink-soft transition-all hover:bg-lavender-100/70 active:scale-90 disabled:opacity-30"
              aria-label="Delete digit"
            >
              <Delete className="size-6" />
            </button>
          </div>

          {/* On web there is no Face ID or fingerprint — the only way to
              unlock is the correct passcode, so the vault can never be
              opened on a wrong or empty code. */}

          {/* escape hatch */}
          {onClose && (
            <div className="mt-5 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                {closeLabel}
              </button>
            </div>
          )}

          {mode === "setup" && (
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-ink-soft">
              <LockKeyhole className="size-3" /> your passcode never leaves your
              space un-hashed
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function PadKey({
  digit,
  onPress,
  disabled,
}: {
  digit: string;
  onPress: (d: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPress(digit)}
      disabled={disabled}
      className="clay-chip h-16 w-16 rounded-full text-2xl font-bold text-ink-deep transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:scale-95 disabled:opacity-60"
    >
      {digit}
    </button>
  );
}
