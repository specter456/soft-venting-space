import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { Delete, LockKeyhole, RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTapGuard } from "@/lib/useTapGuard";
import { DocumentHead } from "@/components/DocumentHead";
import {
  KV_PASSCODE_HASH,
  KV_PASSCODE_SALT,
  KV_USER_TYPE,
  KV_USER_EMAIL,
  KV_USER_NAME,
  wipeAll,
  useTable,
  useHydrated,
  type KVPair,
} from "@/lib/db";
import { hashPasscode, randomSalt } from "@/lib/passcode";
import {
  loadSpaces,
  spaceFromActiveIdentity,
  spaceLabel,
  spaceFace,
  findSpaceByIdentifier,
  upsertSpace,
  activateSpace,
  type SavedSpace,
} from "@/lib/spaces";
import { todayDateKey } from "@/lib/moods";
import { safeSetItem } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";

/**
 * Entry flow — screens 3 through 10, all in one file.
 *
 * Fresh user:  3 (choose) → 4 or 5 → 6 (create) → 7 (confirm) → 8 (checkin) → /dashboard
 * Returning:   3 → "Already have a space? Log in 💜" → space list → keypad for that space → /dashboard
 * No splash here — splash lives on Landing only.
 *
 * Spaces are strictly matched: identifiers are trimmed and compared
 * case-insensitively; passcodes are salted hashes compared exactly.
 */

type Step =
  | "choose"       // SCREEN 3
  | "guest-setup"  // SCREEN 4
  | "email-setup"  // SCREEN 5
  | "passcode"     // SCREEN 6 — create passcode (guest or email)
  | "confirm"      // SCREEN 7 — confirm passcode
  | "space-list"   // SCREEN L — pick a saved space on this device
  | "unlock"       // SCREEN R — keypad for the chosen space
  | "unlock-switch"// "use a different space" confirmation
  | "forgot"       // forgot passcode
  | "checkin";     // SCREEN 8

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const DAY_MOODS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "sad", label: "Sad", emoji: "😢" },
  { id: "angry", label: "Angry", emoji: "😠" },
];

const CHECKIN_KEY = "venting-checkin";

function todayDayName(): string {
  return new Date().toLocaleDateString(undefined, { weekday: "long" });
}

export default function LoginEntry() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const kv = useTable<KVPair>("kv");

  const [step, setStep] = useState<Step>("choose");
  const [path, setPath] = useState<"guest" | "email">("guest"); // which path we're on
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [digits, setDigits] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checkinPicked, setCheckinPicked] = useState<string | null>(null);
  const [dupNotice, setDupNotice] = useState<"guest" | "email" | null>(null);

  // ─── Saved spaces on this device ─────────────────────────────────
  // Reading kv rows keeps this memo reactive: spaces live in the kv store.
  const spaces = useMemo(() => {
    void kv;
    return hydrated ? loadSpaces() : [];
  }, [hydrated, kv]);

  // Read stored identity (legacy single-space support)
  const storedHash = kv.find((k) => k.key === KV_PASSCODE_HASH)?.value ?? null;
  const storedSalt = kv.find((k) => k.key === KV_PASSCODE_SALT)?.value ?? null;
  const userType = kv.find((k) => k.key === KV_USER_TYPE)?.value ?? null;
  const userEmail = kv.find((k) => k.key === KV_USER_EMAIL)?.value ?? null;
  const userName = kv.find((k) => k.key === KV_USER_NAME)?.value ?? null;

  // Older devices stored one space directly in the identity keys —
  // surface it in the login list so existing users keep working.
  const legacySpace = useMemo(
    () =>
      spaceFromActiveIdentity(userType, userName, userEmail, storedHash, storedSalt),
    [userType, userName, userEmail, storedHash, storedSalt],
  );

  const visibleSpaces: SavedSpace[] = useMemo(() => {
    const merged = [...spaces];
    if (legacySpace && !spaces.some((s) => s.id === legacySpace.id)) {
      merged.push(legacySpace);
    }
    return merged;
  }, [spaces, legacySpace]);

  const [activeSpace, setActiveSpace] = useState<SavedSpace | null>(null);

  // ─── Passcode handling ────────────────────────────────────────────
  const finishCode = useCallback(
    async (code: string) => {
      // SCREEN R: unlock the chosen saved space — strict match required
      if (step === "unlock" && activeSpace) {
        setBusy(true);
        try {
          const hash = await hashPasscode(code, activeSpace.salt);
          if (hash === activeSpace.hash) {
            setDigits("");
            await activateSpace(activeSpace);
            sessionStorage.setItem("venting-just-onboarded", "1");
            navigate("/dashboard");
          } else {
            setError("that code didn't match this space. try again.");
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

      // SCREEN 6: create passcode → save to tempCode, advance to SCREEN 7
      if (step === "passcode") {
        setTempCode(code);
        setDigits("");
        setStep("confirm");
        return;
      }

      // SCREEN 7: confirm passcode
      if (step === "confirm") {
        if (code !== tempCode) {
          setError("those two didn't match — try once more.");
          setShakeKey((k) => k + 1);
          setDigits("");
          setTempCode("");
          return;
        }
        setBusy(true);
        try {
          const salt = randomSalt();
          const hash = await hashPasscode(code, salt);
          const trimmedName = username.trim();
          const trimmedEmail = email.trim();
          const space: SavedSpace = {
            id: crypto.randomUUID(),
            type: path,
            name: path === "guest" ? trimmedName : undefined,
            email: path === "email" ? trimmedEmail : undefined,
            hash,
            salt,
          };
          // Strict duplicate checks against spaces already on this device
          const existing = findSpaceByIdentifier(loadSpaces(), path, path === "guest" ? trimmedName : trimmedEmail);
          if (existing) {
            // Same space being re-created with a new passcode — replace it
            await upsertSpace(space);
          } else {
            await upsertSpace(space);
          }
          await activateSpace(space);
          setDigits("");
          sessionStorage.setItem("venting-just-onboarded", "1");
          setStep("checkin"); // SCREEN 8
        } catch {
          setError("couldn't save your passcode — try again.");
          setDigits("");
        } finally {
          setBusy(false);
        }
      }
    },
    [step, activeSpace, tempCode, path, email, username, navigate],
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

  // ─── Duplicate checks before entering passcode creation ─────────
  const proceedGuest = useTapGuard(() => {
    const name = username.trim();
    if (!name) return;
    const dup = findSpaceByIdentifier(loadSpaces(), "guest", name);
    if (dup) {
      setDupNotice("guest");
      return;
    }
    setError(null);
    setStep("passcode");
  }, 350);

  const proceedEmail = useTapGuard(() => {
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setError("hmm, that email doesn't look right");
      return;
    }
    const dup = findSpaceByIdentifier(loadSpaces(), "email", value);
    if (dup) {
      setDupNotice("email");
      return;
    }
    setError(null);
    setStep("passcode");
  }, 350);

  // ─── SCREEN 9: check-in finish ──────────────────────────────────
  const finishCheckin = useTapGuard((moodId: string | null) => {
    safeSetItem(CHECKIN_KEY, JSON.stringify({ date: todayDateKey(), mood: moodId }));
    navigate("/dashboard");
  }, 450);

  const handleStartFresh = useTapGuard(async () => {
    await wipeAll();
    setStep("choose");
    setError(null);
    setDigits("");
    setEmail("");
    setUsername("");
    setTempCode("");
    setActiveSpace(null);
    setDupNotice(null);
  }, 600);

  // ─── Which label for passcode screens ──────────────────────────
  const passcodeLabel = path === "email"
    ? (email.trim() || "your email")
    : (username.trim() || "your space");

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 text-ink">
      <DocumentHead
        title="Open your safe room"
        description="Enter your private Venting space. No account needed — your feelings stay right here on your device."
        canonical="/login"
      />
      {/* background blobs */}
      <div aria-hidden className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-[#AAB6E3]/30 blur-lg" />
      <div aria-hidden className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-[#F3E7C9]/30 blur-lg" />
      <div aria-hidden className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-[#C4CBE8]/30 blur-lg" />
      {/* drifting sky clouds */}
      <div className="sky-cloud sky-cloud-1" aria-hidden />
      <div className="sky-cloud sky-cloud-2" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 210, damping: 20 }}
        className="clay-card relative w-full max-w-[440px] overflow-hidden px-6 py-9 text-center"
      >
        <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-lavender-100/70 blur-lg" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-blush-100/60 blur-lg" />

        {/* Logo — shown on screens 3–7, L, R, forgot, unlock-switch. NOT on 8–9. */}
        {(step === "choose" || step === "guest-setup" || step === "email-setup" ||
          step === "passcode" || step === "confirm" || step === "space-list" ||
          step === "unlock" || step === "unlock-switch" || step === "forgot") && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
            className="mx-auto w-fit"
          >
            <Logo className="h-16 w-16" />
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ═══════ SCREEN 3 — ENTRY CHOICE ═══════ */}
          {step === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-deep">
                Open your safe room
              </h1>
              <p className="mt-2 text-sm font-medium text-ink-soft">
                Your feelings stay right here.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button type="button" onClick={() => { setPath("email"); setStep("email-setup"); }}
                  className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white">
                  Continue with email
                </button>
                <button type="button" onClick={() => { setPath("guest"); setStep("guest-setup"); }}
                  className="clay-btn-soft w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-ink-deep">
                  Continue as guest
                </button>
              </div>
              <button type="button" onClick={() => setStep("space-list")}
                className="mt-5 text-xs font-bold text-[#5F6DBE] underline-offset-4 hover:underline">
                Already have a space? Log in 💜
              </button>
            </motion.div>
          )}

          {/* ═══════ SCREEN 4 — GUEST NAME ═══════ */}
          {step === "guest-setup" && (
            <motion.div key="guest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
                Choose a name for your space
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Only you will know this.
              </p>
              <div className="mt-5 space-y-3">
                <input
                  type="text" value={username}
                  onChange={(e) => { setUsername(e.target.value); setDupNotice(null); }}
                  placeholder="your name" maxLength={30}
                  autoCorrect="off" autoCapitalize="words" spellCheck={false}
                  onKeyDown={(e) => { if (e.key === "Enter" && username.trim()) proceedGuest(); }}
                  className="w-full rounded-2xl border-0 bg-[#FDF5E6]/70 px-4 py-3.5 text-sm text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]"
                />
                {dupNotice === "guest" && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-lavender-100/70 px-4 py-3">
                    <p className="text-xs font-semibold text-ink-deep">
                      a space with this name already lives here — log in or pick another name
                    </p>
                    <div className="mt-2 flex justify-center gap-2">
                      <button type="button"
                        onClick={() => {
                          const name = username.trim();
                          const dup = findSpaceByIdentifier(loadSpaces(), "guest", name);
                          if (dup) { setActiveSpace(dup); setDigits(""); setError(null); setDupNotice(null); setStep("unlock"); }
                        }}
                        className="clay-btn rounded-full px-4 py-2 text-[11px] font-bold text-white">
                        log in
                      </button>
                      <button type="button" onClick={() => { setDupNotice(null); setUsername(""); }}
                        className="clay-chip rounded-full px-4 py-2 text-[11px] font-bold text-ink-deep">
                        new name
                      </button>
                    </div>
                  </motion.div>
                )}
                <button type="button" onClick={proceedGuest}
                  disabled={!username.trim()}
                  className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                </button>
                <button type="button" onClick={() => { setStep("choose"); setDupNotice(null); }}
                  className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                  ← back
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ SCREEN 5 — EMAIL ═══════ */}
          {step === "email-setup" && (
            <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
                Continue with email
              </h1>
              <div className="mt-5 space-y-3">
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setDupNotice(null); }}
                  placeholder="name@example.com"
                  autoCorrect="off" autoCapitalize="none" spellCheck={false}
                  onKeyDown={(e) => { if (e.key === "Enter") proceedEmail(); }}
                  className="w-full rounded-2xl border-0 bg-[#FDF5E6]/70 px-4 py-3.5 text-sm text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]"
                />
                {error && <p className="text-xs font-semibold text-[#C48B9E]">{error}</p>}
                {dupNotice === "email" && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-blush-100/60 px-4 py-3">
                    <p className="text-xs font-semibold text-ink-deep">
                      this email already has a space — welcome back!
                    </p>
                    <button type="button"
                      onClick={() => {
                        const dup = findSpaceByIdentifier(loadSpaces(), "email", email.trim());
                        if (dup) { setActiveSpace(dup); setDigits(""); setError(null); setDupNotice(null); setStep("unlock"); }
                      }}
                      className="clay-btn mt-2 w-full rounded-full px-4 py-2 text-[11px] font-bold text-white">
                      go to login
                    </button>
                  </motion.div>
                )}
                <button type="button" onClick={proceedEmail}
                  disabled={!email.trim()}
                  className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                </button>
                <button type="button" onClick={() => { setStep("choose"); setError(null); setDupNotice(null); }}
                  className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                  ← back
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ SCREEN 6 — CREATE PASSCODE ═══════ */}
          {step === "passcode" && (
            <motion.div key="passcode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
                Create a 4-digit passcode
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                only you will ever know this. it never leaves your device.
              </p>
              <p className="mt-1 text-[11px] font-semibold text-ink-soft">
                for: {passcodeLabel}
              </p>
              <PasscodeUI digits={digits} error={error} busy={busy} shakeKey={shakeKey}
                onDigit={pressDigit} onBackspace={backspace} mode="setup" />
              <button type="button"
                onClick={() => { setStep(path === "guest" ? "guest-setup" : "email-setup"); setDigits(""); setError(null); }}
                className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                ← back
              </button>
            </motion.div>
          )}

          {/* ═══════ SCREEN 7 — CONFIRM PASSCODE ═══════ */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
                Type it once more
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                only you will ever know this. it never leaves your device.
              </p>
              <p className="mt-1 text-[11px] font-semibold text-ink-soft">
                for: {passcodeLabel}
              </p>
              <PasscodeUI digits={digits} error={error} busy={busy} shakeKey={shakeKey}
                onDigit={pressDigit} onBackspace={backspace} mode="setup" />
              <button type="button"
                onClick={() => { setStep("passcode"); setTempCode(""); setDigits(""); setError(null); }}
                className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                ← back
              </button>
            </motion.div>
          )}

          {/* ═══════ SCREEN L — SAVED SPACES LIST ═══════ */}
          {step === "space-list" && (
            <motion.div key="spaces" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
                Pick your space
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                spaces living on this device
              </p>
              <div className="mt-5 space-y-2">
                {visibleSpaces.length === 0 && (
                  <div className="rounded-2xl bg-[#FDF5E6]/70 px-4 py-6">
                    <p className="text-sm font-semibold text-ink-soft">
                      no spaces on this device yet
                    </p>
                    <button type="button" onClick={() => setStep("choose")}
                      className="clay-btn mt-3 w-full rounded-2xl px-5 py-3 text-sm font-bold text-white">
                      create a new space
                    </button>
                  </div>
                )}
                {visibleSpaces.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => { setActiveSpace(s); setDigits(""); setError(null); setStep("unlock"); }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3 text-left transition-transform hover:scale-[1.02] active:scale-95">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender-100 text-xl" aria-hidden>
                      {spaceFace(s)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-deep">
                        {spaceLabel(s)}
                      </span>
                    </span>
                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                      s.type === "guest" ? "bg-lavender-200/70 text-lavender-600" : "bg-blush-100/80 text-blush-500",
                    )}>
                      {s.type === "guest" ? "guest" : "email"}
                    </span>
                  </button>
                ))}
              </div>
              {visibleSpaces.length > 0 && (
                <button type="button" onClick={() => setStep("choose")}
                  className="mt-4 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                  not your space? create a new one
                </button>
              )}
              <button type="button" onClick={() => setStep("choose")}
                className="mt-4 block w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                ← back
              </button>
            </motion.div>
          )}

          {/* ═══════ SCREEN R — UNLOCK (chosen space) ═══════ */}
          {step === "unlock" && activeSpace && (
            <motion.div key="unlock" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-lavender-100 text-3xl" aria-hidden>
                {spaceFace(activeSpace)}
              </div>
              <h1 className="font-script mt-4 text-2xl font-bold tracking-tight text-ink-deep">
                {spaceLabel(activeSpace)}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Only you can access your feelings.
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#5F6DBE]">
                Private and safe. Only you can see this.
              </p>
              <PasscodeUI digits={digits} error={error} busy={busy} shakeKey={shakeKey}
                onDigit={pressDigit} onBackspace={backspace} mode="unlock" />
              <div className="mt-5 flex flex-col items-center gap-2">
                <button type="button" onClick={() => setStep("forgot")}
                  className="text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                  forgot?
                </button>
                <button type="button"
                  onClick={() => { setActiveSpace(null); setStep("space-list"); setError(null); setDigits(""); }}
                  className="text-xs font-bold text-[#5F6DBE] underline-offset-4 hover:underline">
                  ← different space
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ UNLOCK-SWITCH ═══════ */}
          {step === "unlock-switch" && (
            <motion.div key="switch" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-deep">
                Start a new space
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                This will set up a fresh space with its own passcode.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button type="button" onClick={() => { setStep("choose"); setError(null); }}
                  className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white">
                  Continue
                </button>
                <button type="button"
                  onClick={() => { setStep("space-list"); setError(null); setDigits(""); }}
                  className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                  ← actually, go back
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ FORGOT ═══════ */}
          {step === "forgot" && (
            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
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
                <button type="button" onClick={handleStartFresh}
                  className="clay-btn-blush flex items-center justify-center gap-2 w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white">
                  <RotateCcw className="size-4" />
                  start fresh
                </button>
                <button type="button"
                  onClick={() => { setStep(activeSpace ? "unlock" : "space-list"); setError(null); setDigits(""); }}
                  className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline">
                  ← actually, I remember
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ SCREEN 8 — CHECK-IN ═══════ */}
          {step === "checkin" && (
            <motion.div key="checkin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }} className="mx-auto w-fit">
                <Logo className="h-16 w-16" />
              </motion.div>
              <div className="mx-auto mt-4 h-px w-24 bg-lavender-200" aria-hidden />
              <p className="font-script mt-6 text-xl font-bold tracking-tight text-ink-deep">
                How was your {todayDayName()}?
              </p>
              <div className="mt-5 flex items-center justify-between gap-2">
                {DAY_MOODS.map((m) => (
                  <button key={m.id} type="button"
                    onClick={() => { setCheckinPicked(m.id); finishCheckin(m.id); }}
                    className="group flex flex-1 flex-col items-center gap-1.5">
                    <span className={cn(
                      "clay-chip flex h-14 w-14 items-center justify-center rounded-full text-3xl transition-all",
                      checkinPicked === m.id && "mood-bubble mood-bubble-selected scale-110",
                    )}>
                      <span aria-hidden className="drop-shadow-sm">{m.emoji}</span>
                    </span>
                    <span className="text-[11px] font-bold text-ink-soft group-hover:text-ink">{m.label}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => finishCheckin(null)}
                className="mt-7 text-xs font-bold text-ink-soft underline-offset-4 transition-colors hover:text-ink-deep hover:underline">
                Skip
              </button>
              <p className="mt-4 text-center text-[11px] font-semibold text-ink-soft">
                🔒 Private and safe. Only you can see this.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ─── Passcode keypad UI ──────────────────────────────────────────── */

function PasscodeUI({
  digits, error, busy, shakeKey, onDigit, onBackspace, mode,
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
      <motion.div
        key={shakeKey}
        animate={shakeKey ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="mt-6 flex items-center justify-center gap-3"
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.span key={i} animate={{ scale: digits.length > i ? 1.15 : 1 }}
            className={`h-3.5 w-3.5 rounded-full transition-colors duration-200 ${
              digits.length > i
                ? "bg-[#5F6DBE] shadow-[0_2px_6px_rgba(95,109,190,0.5)]"
                : "bg-[#C4CBE8]/60"
            }`} />
        ))}
      </motion.div>

      {error && (
        <p className="mt-3 text-center text-xs font-semibold text-[#C48B9E]">{error}</p>
      )}
      {busy && (
        <p className="mt-3 text-center text-xs font-semibold text-ink-soft">
          {mode === "unlock" ? "unlocking gently…" : "holding it safely…"}
        </p>
      )}

      <div className="mx-auto mt-6 grid w-fit grid-cols-3 gap-x-5 gap-y-3">
        {KEYS.map((k) => (
          <PadKey key={k} digit={k} onPress={onDigit} disabled={busy} />
        ))}
        <span aria-hidden />
        <PadKey digit="0" onPress={onDigit} disabled={busy} />
        <button type="button" onClick={onBackspace} disabled={busy || digits.length === 0}
          className="flex h-16 w-16 items-center justify-center rounded-full text-ink-soft transition-all hover:bg-[#EDEBF6]/60 active:scale-90 disabled:opacity-30"
          aria-label="Delete digit">
          <Delete className="size-6" />
        </button>
      </div>

      {mode === "setup" && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-ink-soft">
          <LockKeyhole className="size-3" /> only you will ever know this. it never leaves your device.
        </p>
      )}
    </>
  );
}

function PadKey({ digit, onPress, disabled }: { digit: string; onPress: (d: string) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => onPress(digit)} disabled={disabled}
      className="clay-chip h-16 w-16 rounded-full text-2xl font-bold text-ink-deep transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:scale-95 disabled:opacity-60">
      {digit}
    </button>
  );
}
