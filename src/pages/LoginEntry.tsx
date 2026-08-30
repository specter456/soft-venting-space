import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Delete, LockKeyhole, RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTapGuard } from "@/lib/useTapGuard";
import {
  KV_PASSCODE_HASH,
  KV_PASSCODE_SALT,
  KV_USER_TYPE,
  KV_USER_EMAIL,
  KV_USER_NAME,
  setKv,
  wipeAll,
  useTable,
  useHydrated,
  type KVPair,
} from "@/lib/db";
import { hashPasscode, randomSalt } from "@/lib/passcode";

/**
 * Clean linear entry flow (no splash — splash lives on Landing only):
 *
 * Fresh user:
 *   choose → email-setup → email-passcode → email-confirm → /welcome
 *   choose → guest-setup → guest-passcode → guest-confirm → /welcome
 *
 * Returning user:
 *   unlock → /dashboard (via /welcome check-in or direct)
 *
 * Back links go one step back. No screen redirects on its own.
 */
type Step =
  | "choose"
  | "email-setup"
  | "email-passcode"
  | "email-confirm"
  | "guest-setup"
  | "guest-passcode"
  | "guest-confirm"
  | "unlock"
  | "unlock-setup" // "use a different space" from unlock
  | "forgot";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function LoginEntry() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const kv = useTable<KVPair>("kv");

  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [digits, setDigits] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  // Read stored identity from kv
  const storedHash =
    kv.find((k) => k.key === KV_PASSCODE_HASH)?.value ?? null;
  const storedSalt =
    kv.find((k) => k.key === KV_PASSCODE_SALT)?.value ?? null;
  const userType = kv.find((k) => k.key === KV_USER_TYPE)?.value ?? null;
  const userEmail = kv.find((k) => k.key === KV_USER_EMAIL)?.value ?? null;
  const userName = kv.find((k) => k.key === KV_USER_NAME)?.value ?? null;

  const hasReturningUser =
    hydrated && storedHash && storedSalt && userType;

  // Returning users: jump to unlock step on mount (no splash — splash was on Landing)
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (!initDoneRef.current && hydrated && hasReturningUser) {
      initDoneRef.current = true;
      setStep("unlock");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasReturningUser]);

  // ─── Passcode verification ────────────────────────────────────────
  const finishCode = useCallback(
    async (code: string) => {
      // Unlock (returning user)
      if (step === "unlock") {
        if (!storedHash || !storedSalt) return;
        setBusy(true);
        try {
          const hash = await hashPasscode(code, storedSalt);
          if (hash === storedHash) {
            setDigits("");
            navigate("/dashboard");
          } else {
            setError("that code didn't match. your space stays sealed.");
            setShakeKey((k) => k + 1);
            setDigits("");
          }
        } catch {
          setError("something went softly wrong. try again.");
          setDigits("");
        } finally {
          setBusy(false);
        }
        return;
      }

      // Create passcode (email or guest) — save to tempCode, advance to confirm
      if (step === "email-passcode" || step === "guest-passcode") {
        setTempCode(code);
        setDigits("");
        setStep(step === "email-passcode" ? "email-confirm" : "guest-confirm");
        return;
      }

      // Confirm passcode — verify match, then save and go to /welcome
      if (step === "email-confirm" || step === "guest-confirm") {
        if (code !== tempCode) {
          setError("those two didn't match — try once more.");
          setShakeKey((k) => k + 1);
          setDigits("");
          setTempCode("");
          // Go back to create step — one step back
          setStep(step === "email-confirm" ? "email-passcode" : "guest-passcode");
          return;
        }
        // Match! Save passcode + identity
        setBusy(true);
        try {
          const salt = randomSalt();
          const hash = await hashPasscode(code, salt);
          await setKv(KV_PASSCODE_HASH, hash);
          await setKv(KV_PASSCODE_SALT, salt);
          if (step === "email-confirm") {
            await setKv(KV_USER_TYPE, "email");
            await setKv(KV_USER_EMAIL, email.trim());
          } else {
            await setKv(KV_USER_TYPE, "guest");
            await setKv(KV_USER_NAME, username.trim());
          }
          setDigits("");
          navigate("/welcome");
        } catch {
          setError("couldn't save your passcode — try again.");
          setDigits("");
        } finally {
          setBusy(false);
        }
      }
    },
    [step, storedHash, storedSalt, tempCode, email, username, navigate],
  );

  // Auto-trigger on 4 digits
  useEffect(() => {
    if (digits.length === 4 && !busy) {
      const code = digits;
      const timer = setTimeout(() => void finishCode(code), 0);
      return () => clearTimeout(timer);
    }
  }, [digits, busy, finishCode]);

  // Clear error after a moment
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  const pressDigit = (d: string) => {
    if (busy || digits.length >= 4) return;
    setDigits((prev) => prev + d);
  };

  const backspace = () => {
    if (busy) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const startEmail = useTapGuard(() => setStep("email-setup"), 400);
  const startGuest = useTapGuard(() => setStep("guest-setup"), 400);

  const handleStartFresh = useTapGuard(async () => {
    await wipeAll();
    setStep("choose");
    setError(null);
    setDigits("");
    setEmail("");
    setUsername("");
    setTempCode("");
  }, 600);

  // ─── Step titles (for passcode screens) ──────────────────────────
  const passcodeLabel =
    step.startsWith("email") ? email || "your email" : username || "your space";

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 text-ink">
      {/* background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-[#AAB6E3]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-[#F3E7C9]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-[#C4CBE8]/30 blur-2xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 210, damping: 20 }}
        className="clay-card relative w-full max-w-sm overflow-hidden rounded-[2.25rem] px-6 py-9 text-center"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-lavender-100/70 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-blush-100/60 blur-2xl"
        />

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
          className="mx-auto w-fit"
        >
          <Logo className="h-16 w-16" />
        </motion.div>

        {/* ── CHOOSE: email or guest ─────────────────────────────── */}
        {step === "choose" && (
          <>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-deep">
              Open your safe room
            </h1>
            <p className="mt-2 text-sm font-medium text-ink-soft">
              No account needed. Your feelings stay right here.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={startEmail}
                className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white"
              >
                Continue with email
              </button>
              <button
                type="button"
                onClick={startGuest}
                className="clay-btn-soft w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-ink-deep"
              >
                Continue as guest
              </button>
            </div>
            <p className="mt-5 text-[11px] font-semibold text-ink-soft">
              🔒 Nothing is uploaded. Ever.
            </p>
          </>
        )}

        {/* ── EMAIL SETUP: enter email ──────────────────────────── */}
        {step === "email-setup" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              What's your email?
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              It stays only on this device.
            </p>
            <div className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim()) {
                    if (email.includes("@")) {
                      setError(null);
                      setStep("email-passcode");
                    } else {
                      setError("that doesn't look like an email address.");
                    }
                  }
                }}
                className="w-full rounded-2xl border-0 bg-[#FDF5E6]/70 px-4 py-3.5 text-sm text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]"
              />
              {error && (
                <p className="text-xs font-semibold text-[#C48B9E]">{error}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (email.trim() && email.includes("@")) {
                    setError(null);
                    setStep("email-passcode");
                  } else {
                    setError("that doesn't look like an email address.");
                  }
                }}
                disabled={!email.trim()}
                className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => { setStep("choose"); setError(null); }}
                className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                ← back
              </button>
            </div>
          </>
        )}

        {/* ── GUEST SETUP: choose name ──────────────────────────── */}
        {step === "guest-setup" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              Choose a name for your space
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Only you will know this.
            </p>
            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your name"
                maxLength={30}
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && username.trim()) {
                    setStep("guest-passcode");
                  }
                }}
                className="w-full rounded-2xl border-0 bg-[#FDF5E6]/70 px-4 py-3.5 text-sm text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]"
              />
              <button
                type="button"
                onClick={() => {
                  if (username.trim()) setStep("guest-passcode");
                }}
                disabled={!username.trim()}
                className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                ← back
              </button>
            </div>
          </>
        )}

        {/* ── EMAIL PASSCODE: create ──────────────────────────── */}
        {step === "email-passcode" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              Create a 4-digit passcode
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              only you will ever know this. it never leaves your device.
            </p>
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">
              for: {passcodeLabel}
            </p>
            <PasscodeUI
              digits={digits}
              error={error}
              busy={busy}
              shakeKey={shakeKey}
              onDigit={pressDigit}
              onBackspace={backspace}
              mode="setup"
            />
            <button
              type="button"
              onClick={() => { setStep("email-setup"); setDigits(""); setError(null); }}
              className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
            >
              ← back
            </button>
          </>
        )}

        {/* ── EMAIL CONFIRM: confirm passcode ──────────────────── */}
        {step === "email-confirm" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              Confirm your passcode
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              type it once more, just to be sure.
            </p>
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">
              for: {passcodeLabel}
            </p>
            <PasscodeUI
              digits={digits}
              error={error}
              busy={busy}
              shakeKey={shakeKey}
              onDigit={pressDigit}
              onBackspace={backspace}
              mode="setup"
            />
            <button
              type="button"
              onClick={() => { setStep("email-passcode"); setTempCode(""); setDigits(""); setError(null); }}
              className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
            >
              ← back
            </button>
          </>
        )}

        {/* ── GUEST PASSCODE: create ──────────────────────────── */}
        {step === "guest-passcode" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              Create a 4-digit passcode
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              only you will ever know this. it never leaves your device.
            </p>
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">
              for: {passcodeLabel}
            </p>
            <PasscodeUI
              digits={digits}
              error={error}
              busy={busy}
              shakeKey={shakeKey}
              onDigit={pressDigit}
              onBackspace={backspace}
              mode="setup"
            />
            <button
              type="button"
              onClick={() => { setStep("guest-setup"); setDigits(""); setError(null); }}
              className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
            >
              ← back
            </button>
          </>
        )}

        {/* ── GUEST CONFIRM: confirm passcode ──────────────────── */}
        {step === "guest-confirm" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              Confirm your passcode
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              type it once more, just to be sure.
            </p>
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">
              for: {passcodeLabel}
            </p>
            <PasscodeUI
              digits={digits}
              error={error}
              busy={busy}
              shakeKey={shakeKey}
              onDigit={pressDigit}
              onBackspace={backspace}
              mode="setup"
            />
            <button
              type="button"
              onClick={() => { setStep("guest-passcode"); setTempCode(""); setDigits(""); setError(null); }}
              className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
            >
              ← back
            </button>
          </>
        )}

        {/* ── UNLOCK: welcome back + passcode (returning users) ─── */}
        {step === "unlock" && (
          <>
            <h1 className="font-script mt-4 text-2xl font-bold tracking-tight text-ink-deep">
              Welcome back
              {userType === "guest" && userName
                ? `, ${userName}`
                : userEmail
                  ? `, ${userEmail}`
                  : ""}
              {" "}💜
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Only you can access your feelings.
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[#5F6DBE]">
              Private and safe. Only you can see this.
            </p>
            <PasscodeUI
              digits={digits}
              error={error}
              busy={busy}
              shakeKey={shakeKey}
              onDigit={pressDigit}
              onBackspace={backspace}
              mode="unlock"
            />
            <div className="mt-5 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("forgot")}
                className="text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                forgot?
              </button>
              <button
                type="button"
                onClick={() => { setStep("unlock-setup"); setError(null); setDigits(""); }}
                className="text-xs font-bold text-[#5F6DBE] underline-offset-4 hover:underline"
              >
                use a different space / new user
              </button>
            </div>
          </>
        )}

        {/* ── UNLOCK-SETUP: "use a different space" from unlock ─── */}
        {step === "unlock-setup" && (
          <>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
              Start a new space
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              This will set up a fresh space with its own passcode.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { setStep("choose"); setError(null); }}
                className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => { setStep("unlock"); setError(null); setDigits(""); }}
                className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                ← actually, go back
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT: honest message + start fresh ──────────────── */}
        {step === "forgot" && (
          <>
            <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#EDEBF6]">
              <LockKeyhole className="size-8 text-[#5F6DBE]" />
            </div>
            <h1 className="mt-4 text-lg font-bold tracking-tight text-ink-deep">
              we can't recover it
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              your passcode never leaves your device, so we can't recover it.
              you can start a fresh space, which gently erases this one.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartFresh}
                className="clay-btn-blush flex items-center justify-center gap-2 w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white"
              >
                <RotateCcw className="size-4" />
                start fresh
              </button>
              <button
                type="button"
                onClick={() => { setStep("unlock"); setError(null); setDigits(""); }}
                className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                ← actually, I remember
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Passcode keypad UI ──────────────────────────────────────────── */

function PasscodeUI({
  digits,
  error,
  busy,
  shakeKey,
  onDigit,
  onBackspace,
  mode,
}: {
  digits: string;
  error: string | null;
  busy: boolean;
  shakeKey: number;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  mode: "setup" | "unlock";
}) {
  return (
    <>
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
            className={`h-3.5 w-3.5 rounded-full transition-colors duration-200 ${
              digits.length > i
                ? "bg-[#5F6DBE] shadow-[0_2px_6px_rgba(95,109,190,0.5)]"
                : "bg-[#C4CBE8]/60"
            }`}
          />
        ))}
      </motion.div>

      {error && (
        <p className="mt-3 text-center text-xs font-semibold text-[#C48B9E]">
          {error}
        </p>
      )}
      {busy && (
        <p className="mt-3 text-center text-xs font-semibold text-ink-soft">
          {mode === "unlock" ? "unlocking gently…" : "holding it safely…"}
        </p>
      )}

      {/* number pad */}
      <div className="mx-auto mt-6 grid w-fit grid-cols-3 gap-x-5 gap-y-3">
        {KEYS.map((k) => (
          <PadKey key={k} digit={k} onPress={onDigit} disabled={busy} />
        ))}
        <span aria-hidden />
        <PadKey digit="0" onPress={onDigit} disabled={busy} />
        <button
          type="button"
          onClick={onBackspace}
          disabled={busy || digits.length === 0}
          className="flex h-16 w-16 items-center justify-center rounded-full text-ink-soft transition-all hover:bg-[#EDEBF6]/60 active:scale-90 disabled:opacity-30"
          aria-label="Delete digit"
        >
          <Delete className="size-6" />
        </button>
      </div>

      {mode === "setup" && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-ink-soft">
          <LockKeyhole className="size-3" /> only you will ever know this.
          it never leaves your device.
        </p>
      )}
    </>
  );
}

/* ─── Pad key button ──────────────────────────────────────────────── */

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
