import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LockScreen } from "@/components/LockScreen";
import {
  getKvFromCache,
  hasPasscodeLocally,
  setKv,
  useTable,
  wipeAll,
  type KVPair,
} from "@/lib/db";
import { safeRemoveItem, safeSessionRemoveItem } from "@/lib/safe-storage";
import { useAsyncTapGuard, useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

const AVATARS = ["🐻", "🐰", "🐱", "🦊", "🐼", "🐨", "🐸", "🦋", "🌸", "🌙"];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Settings — your space, your rules. Everything here is stored on this
 * device only; nothing is ever sent anywhere.
 */
export default function SettingsScreen() {
  const kv = useTable<KVPair>("kv");
  const [name, setName] = useState(() => getKvFromCache("profileName") ?? "");
  const [avatar, setAvatar] = useState(() => getKvFromCache("profileAvatar") ?? AVATARS[0]);
  const [doubleLock, setDoubleLock] = useState(
    () => getKvFromCache("vaultDoubleLock") !== "false",
  );
  const [sounds, setSounds] = useState(() => getKvFromCache("soundsEnabled") !== "false");
  const [reminders, setReminders] = useState(() => getKvFromCache("gentleReminders") === "true");
  const [localOnly, setLocalOnly] = useState(true);
  const [passcodeStep, setPasscodeStep] = useState<"idle" | "verify" | "set">("idle");
  const [armDelete, setArmDelete] = useState(false);

  const hasPasscode = hasPasscodeLocally();
  const hash = kv.find((k) => k.key === "passcodeHash")?.value;
  const salt = kv.find((k) => k.key === "passcodeSalt")?.value;

  // PWA install prompt (Chrome/Edge/Android). Most browsers fire this after
  // a manifest + service worker; Venting also works fully from a bookmark.
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const saveName = useTapGuard(() => {
    void setKv("profileName", name.trim());
    toast("Name saved", { description: "Only Venting on this device knows it." });
  }, 500);

  const toggleDoubleLock = useTapGuard(() => {
    const next = !doubleLock;
    setDoubleLock(next);
    void setKv("vaultDoubleLock", next ? "true" : "false");
    toast(next ? "Vault double-lock on" : "Vault double-lock off", {
      description: next
        ? "Photos and videos now need the second lock again."
        : "Your vault still stays on this device.",
    });
  }, 450);

  const toggleSounds = useTapGuard(() => {
    const next = !sounds;
    setSounds(next);
    void setKv("soundsEnabled", next ? "true" : "false");
  }, 450);

  const toggleReminders = useTapGuard(() => {
    const next = !reminders;
    setReminders(next);
    void setKv("gentleReminders", next ? "true" : "false");
  }, 450);

  const toggleLocalOnly = useTapGuard(() => {
    if (localOnly) {
      toast("Always local-first 💚", {
        description: "Venting is built local-only by design — nothing is ever uploaded.",
      });
    } else {
      setLocalOnly(true);
    }
  }, 450);

  const deleteEverything = useAsyncTapGuard(async () => {
    if (!armDelete) {
      setArmDelete(true);
      window.setTimeout(() => setArmDelete(false), 4000);
      return;
    }
    await wipeAll();
    safeRemoveItem("venting-onboarding-done");
    safeRemoveItem("venting-checkin");
    safeRemoveItem("venting-diary-cover");
    safeRemoveItem("venting-lock-dismissed");
    safeSessionRemoveItem("venting-vault-unlocked");
    // start fresh — the welcome flow will greet you again
    window.location.href = "/";
  }, 600);

  return (
    <div className="space-y-5">
      {/* ─── Profile / Account ────────────────────────────────────── */}
      <Section title="Profile & Account" emoji="👤">
        <Row label="Mode">
          <p className="text-xs font-bold text-ink-soft">
            {getKvFromCache("profileEmail") ? "Email" : "Guest mode"} · full access, nothing
            required
          </p>
        </Row>
        <Row label="Display name">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoCorrect="off"
              spellCheck={false}
              placeholder="What should Venting call you?"
              aria-label="Display name"
              className="w-36 rounded-xl border-0 bg-cream-soft px-3 py-2 text-sm font-bold text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
            />
            <button
              type="button"
              onClick={saveName}
              className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-ink-deep"
            >
              Save
            </button>
          </div>
        </Row>
        <Row label="Your avatar">
          <div className="flex flex-wrap gap-1.5">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setAvatar(a);
                  void setKv("profileAvatar", a);
                }}
                aria-label={`Avatar ${a}`}
                className={cn(
                  "clay-chip flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform hover:scale-110",
                  avatar === a && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                )}
              >
                <span aria-hidden>{a}</span>
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* ─── Security & Privacy ───────────────────────────────────── */}
      <Section title="Security & Privacy" emoji="🔐">
        <Row label={hasPasscode ? "Passcode" : "Passcode (not set yet)"}>
          {passcodeStep === "idle" ? (
            <button
              type="button"
              onClick={() => setPasscodeStep(hasPasscode ? "verify" : "set")}
              className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-ink-deep"
            >
              {hasPasscode ? "Change passcode" : "Set passcode"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPasscodeStep("idle")}
              className="rounded-full px-3 py-2 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
            >
              Cancel
            </button>
          )}
        </Row>
        {passcodeStep !== "idle" && (
          <div className="mt-3 rounded-3xl bg-cream-soft/60 p-1">
            {passcodeStep === "verify" && hash && salt ? (
              <LockScreen
                mode="unlock"
                storedHash={hash}
                storedSalt={salt}
                onUnlock={() => setPasscodeStep("set")}
                onClose={() => setPasscodeStep("idle")}
                closeLabel="Cancel"
              />
            ) : (
              <LockScreen
                mode="setup"
                title="Choose a new passcode"
                subtitle="Four gentle digits — only a salted hash is stored on this device."
                onComplete={() => {
                  setPasscodeStep("idle");
                  toast("Passcode updated", { description: "Your space stays yours." });
                }}
                onClose={() => setPasscodeStep("idle")}
                closeLabel="Cancel"
              />
            )}
          </div>
        )}

        <Row label="Vault double-lock">
          <Toggle on={doubleLock} onChange={toggleDoubleLock} label="Vault double-lock" />
        </Row>
        <Row label="Delete everything">
          <button
            type="button"
            onClick={deleteEverything}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold transition-all",
              armDelete
                ? "bg-blush-500 text-cream-soft shadow-[0_8px_16px_-8px_rgba(201,106,124,0.6)]"
                : "bg-blush-100/80 text-blush-500 hover:bg-blush-100",
            )}
          >
            {armDelete ? "Tap again to confirm — really everything" : "Delete everything"}
          </button>
        </Row>
        <p className="text-[11px] leading-relaxed font-medium text-ink-soft">
          Deletes every note, recording, photo, diary page and setting on this device. There is no
          cloud copy to recover from.
        </p>
      </Section>

      {/* ─── Appearance ───────────────────────────────────────────── */}
      <Section title="Appearance" emoji="🎨">
        <Row label="Gentle sounds">
          <Toggle on={sounds} onChange={toggleSounds} label="Gentle sounds" />
        </Row>
      </Section>

      {/* ─── Install & Devices ────────────────────────────────────── */}
      <Section title="Install & Devices" emoji="📲">
        {installPrompt ? (
          <button
            type="button"
            onClick={() => {
              void installPrompt.prompt();
            }}
            className="clay-btn w-full rounded-2xl px-5 py-3.5 text-sm font-bold text-ink-deep"
          >
            ⬇️ Install app on home screen
          </button>
        ) : (
          <div className="space-y-2 text-[12px] leading-relaxed font-medium text-ink-soft">
            <p>
              <span className="font-bold text-ink-deep">iPhone / iPad:</span> tap Share{" "}
              <span aria-hidden>⎋</span> then “Add to Home Screen” — Venting becomes its own app
              icon.
            </p>
            <p>
              <span className="font-bold text-ink-deep">Android:</span> open the browser menu and
              choose “Install app” or “Add to Home screen”.
            </p>
            <p>
              <span className="font-bold text-ink-deep">Desktop:</span> use your browser’s “Install
              app” option, or keep it as a bookmark — everything works offline either way.
            </p>
          </div>
        )}
      </Section>

      {/* ─── General ──────────────────────────────────────────────── */}
      <Section title="General" emoji="🌿">
        <Row label="Language">
          <p className="text-xs font-bold text-ink-soft">English</p>
        </Row>
        <Row label="Gentle reminders">
          <Toggle on={reminders} onChange={toggleReminders} label="Gentle reminders" />
        </Row>
        <Row label="Local-only mode">
          <Toggle on={localOnly} onChange={toggleLocalOnly} label="Local-only mode" />
        </Row>
        <Row label="About">
          <p className="max-w-[16rem] text-[11px] leading-relaxed font-medium text-ink-soft">
            Venting — a private emotional wellness space. No accounts, no ads, no tracking, no
            sharing. Version 1.0.
          </p>
        </Row>
        <Row label="Safety resources">
          <p className="max-w-[16rem] text-[11px] leading-relaxed font-medium text-ink-soft">
            If today feels too heavy to carry alone, reaching out to someone you trust — or a
            helpline — is a brave, gentle act. You matter.
          </p>
        </Row>
      </Section>

      <p className="pt-1 text-center text-[11px] font-semibold text-ink-soft">
        🔒 Private and safe. Only you can see this.
      </p>
    </div>
  );
}

/* ─── small building blocks ────────────────────────────────────────── */

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="clay-card rounded-[2rem] px-5 py-5">
      <p className="flex items-center gap-2 text-sm font-bold tracking-tight text-ink-deep">
        <span aria-hidden>{emoji}</span> {title}
      </p>
      <div className="mt-3 divide-y divide-lavender-100/70">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <p className="text-xs font-bold text-ink-deep">{label}</p>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        on ? "bg-lavender-400" : "bg-lavender-200",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
          on ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}
