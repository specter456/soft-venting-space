import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const emailValue = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) {
      setError("Please enter a valid email.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      console.log("signed in");

      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);

      setError("The verification code you entered is incorrect.");
      setIsLoading(false);

      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting anonymous sign in...");
      await signIn("anonymous");
      console.log("Anonymous sign in successful");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-cream-soft via-cream to-lavender-50 px-4 py-10 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -left-24 h-96 w-96 rounded-full bg-blush-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-mint-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-lavender-100/50 blur-3xl"
      />

      <div className="clay-card relative w-full max-w-md rounded-[2.25rem] px-6 py-8 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full transition-transform hover:scale-105"
            aria-label="Back to home"
          >
            <Logo className="h-16 w-16" />
          </button>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-deep">
            Welcome to Venting
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-ink-soft">
            Your feelings are safe here — and only you can ever see them.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lavender-100/80 px-3 py-1 text-[11px] font-bold text-lavender-600">
            <LockKeyhole className="size-3" /> Private. No sharing. Only you can see this.
          </span>
        </div>

        {step === "signIn" ? (
          <>
            <form onSubmit={handleEmailSubmit} noValidate className="mt-7">
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <Input
                    name="email"
                    placeholder="name@example.com"
                    type="email"
                    className="h-11 rounded-2xl border-lavender-200/70 bg-cream-soft pl-9 shadow-[inset_0_2px_5px_rgba(99,82,150,0.08)] focus-visible:ring-lavender-300"
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading}
                  className="clay-btn h-11 w-11 rounded-2xl text-cream-soft"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {error && (
                <p className="mt-2 text-sm font-medium text-blush-500">
                  {error}
                </p>
              )}

              <div className="mt-5">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-lavender-200/70" />
                  </div>
                  <div className="relative flex justify-center text-xs font-bold uppercase">
                    <span className="bg-cream px-2 text-ink-soft">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                  className="clay-btn-soft mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold text-ink-deep"
                >
                  Continue as a guest
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={handleOtpSubmit} className="mt-7">
              <div className="text-center">
                <p className="text-lg font-bold tracking-tight text-ink-deep">
                  Check your email
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  We&apos;ve sent a code to {step.email}
                </p>
              </div>
              <input type="hidden" name="email" value={step.email} />
              <input type="hidden" name="code" value={otp} />

              <div className="mt-5 flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      otp.length === 6 &&
                      !isLoading
                    ) {
                      // Find the closest form and submit it
                      const form = (e.target as HTMLElement).closest("form");
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-11 w-10 rounded-xl border-lavender-200/70 bg-cream-soft text-ink-deep shadow-[inset_0_2px_5px_rgba(99,82,150,0.08)]"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && (
                <p className="mt-2 text-center text-sm font-medium text-blush-500">
                  {error}
                </p>
              )}
              <p className="mt-4 text-center text-sm text-ink-soft">
                Didn&apos;t receive a code?{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 font-bold text-lavender-600"
                  onClick={() => setStep("signIn")}
                >
                  Try again
                </Button>
              </p>

              <Button
                type="submit"
                className="clay-btn mt-6 w-full rounded-2xl py-3 text-sm font-bold text-cream-soft"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("signIn")}
                disabled={isLoading}
                className="mt-2 w-full font-semibold text-ink-soft hover:bg-lavender-100/60"
              >
                Use different email
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-xs font-medium text-ink-soft">
          🔒 Private and safe. Only you can see this.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
