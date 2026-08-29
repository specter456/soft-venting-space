import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { safeSetItem } from "@/lib/safe-storage";
import { useTapGuard } from "@/lib/useTapGuard";

const EMAIL_KEY = "venting-profile-email";

/**
 * Simple login entry: email (optional) or continue as guest.
 * After choosing, moves to the welcome check-in flow.
 */
export default function LoginEntry() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"choose" | "email">("choose");

  const goToWelcome = (emailValue?: string) => {
    if (emailValue) {
      safeSetItem(EMAIL_KEY, emailValue);
    }
    navigate("/welcome");
  };

  const guardedGuest = useTapGuard(() => goToWelcome(), 450);
  const guardedEmail = useTapGuard(() => {
    if (email.trim()) goToWelcome(email.trim());
  }, 450);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-[#AAB6E3]/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-[#F3E7C9]/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-[#C4CBE8]/40 blur-3xl"
      />

      {/* ─── Soft login card ─────────────────────────────────────── */}
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

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-deep">
          Open your safe room
        </h1>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          No account needed. Your feelings stay right here.
        </p>

        {mode === "choose" ? (
          <>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setMode("email")}
                className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white"
              >
                Continue with email
              </button>
              <button
                type="button"
                onClick={guardedGuest}
                className="clay-btn-soft w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-ink-deep"
              >
                Continue as guest
              </button>
            </div>
            <p className="mt-5 text-[11px] font-semibold text-ink-soft">
              🔒 Nothing is uploaded. Ever.
            </p>
          </>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim()) guardedEmail();
              }}
              className="w-full rounded-2xl border-0 bg-cream-soft px-4 py-3.5 text-sm text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
            />
            <button
              type="button"
              onClick={guardedEmail}
              disabled={!email.trim()}
              className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
            >
              ← back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
