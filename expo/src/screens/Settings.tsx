import React from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { ClayButton, ClayCard, ClayChip, hexWithAlpha } from "../components/Clay";
import { LockPad } from "../components/LockPad";
import { ACCENTS, useTheme } from "../theme-context";
import { usePwaInstall, IS_WEB } from "../platform";
import { biometricStatus, setPasscode, verifyPasscode } from "../auth";
import {
  deleteKv,
  getKvFromCache,
  hasPasscodeLocally,
  setKv,
  wipeAll,
} from "../db";
import { palette, radius, clayShadow } from "../theme";
import { useLock } from "../lock-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const AVATARS = ["🐻", "🐰", "🐱", "🦊", "🐼", "🐨", "🐸", "🦋", "🌸", "🌙"];
const AUTO_LOCK_OPTIONS = [
  { label: "Off", value: "0" },
  { label: "1 min", value: "1" },
  { label: "5 min", value: "5" },
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
];

export default function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const lock = useLock();
  const pwa = usePwaInstall();

  const [email, setEmail] = React.useState(getKvFromCache("profileEmail") ?? "");
  const [name, setName] = React.useState(getKvFromCache("profileName") ?? "");
  const [avatar, setAvatar] = React.useState(getKvFromCache("profileAvatar") ?? AVATARS[0]);
  const [bioEnabled, setBioEnabled] = React.useState(getKvFromCache("biometricEnabled") !== "false");
  const [bioSupported, setBioSupported] = React.useState(false);
  const [doubleLock, setDoubleLock] = React.useState(getKvFromCache("vaultDoubleLock") !== "false");
  const [autoLock, setAutoLock] = React.useState(getKvFromCache("autoLockMinutes") ?? "0");
  const [reminders, setReminders] = React.useState(getKvFromCache("gentleReminders") === "true");
  const [passcodeModal, setPasscodeModal] = React.useState(false);
  const [wipeModal, setWipeModal] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    void biometricStatus().then((s) => setBioSupported(s.enrolled));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const saveProfile = () => {
    void setKv("profileName", name.trim());
    void setKv("profileAvatar", avatar);
    if (email.trim()) void setKv("profileEmail", email.trim());
    showToast("Saved — only on this device 💜");
  };

  const logOut = () => {
    void deleteKv("profileEmail");
    void deleteKv("profileName");
    void deleteKv("profileAvatar");
    void deleteKv("onboardingDone");
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  const confirmWipe = async () => {
    setWipeModal(false);
    await wipeAll();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  const install = async () => {
    const ok = await pwa.install();
    if (ok) showToast("Venting installed on your home screen 🌸");
    else showToast("Install was paused — no worries.");
  };

  return (
    <Screen title="Settings" subtitle="Your space, your rules">
      {/* ── Profile / Account ── */}
      <Section title="Profile & Account" emoji="👤">
        <Row label="Email">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com (or Guest mode)"
            placeholderTextColor={palette.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={styles.input}
          />
        </Row>
        {!email.trim() ? <Note text="Guest mode — full access, nothing required." /> : null}
        <Row label="Display name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="What should Venting call you?"
            placeholderTextColor={palette.inkFaint}
            autoCorrect={false}
            spellCheck={false}
            style={styles.input}
          />
        </Row>
        <Row label="Your avatar">
          <View style={styles.avatarRow}>
            {AVATARS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAvatar(a)}
                style={[styles.avatarOption, { backgroundColor: avatar === a ? theme.colors.accent : palette.surface }]}
              >
                <Text style={{ fontSize: 18 }}>{a}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
        <ClayButton label="💾 Save profile" color="primary" onPress={saveProfile} style={{ marginTop: 10 }} />
        <ClayButton label="🚪 Log out / switch account (data stays)" color="ghost" onPress={logOut} textStyle={{ color: palette.inkSoft, fontSize: 12.5 }} />
      </Section>

      {/* ── Security & Privacy ── */}
      <Section title="Security & Privacy" emoji="🔒">
        <ClayButton
          label={hasPasscodeLocally() ? "🔑 Change passcode" : "🔑 Set a passcode"}
          color="cream"
          onPress={() => setPasscodeModal(true)}
          style={{ marginBottom: 10 }}
        />
        <ClayButton
          label="🔐 Lock now"
          color="cream"
          onPress={() => {
            if (hasPasscodeLocally()) lock.lockApp();
            else lock.openSetup();
          }}
          style={{ marginBottom: 12 }}
        />
        {bioSupported ? (
          <ToggleRow
            label="Face ID / fingerprint"
            hint="Unlock with your face or finger (on-device)"
            value={bioEnabled}
            onChange={(v) => {
              setBioEnabled(v);
              void setKv("biometricEnabled", v ? "true" : "false");
            }}
          />
        ) : (
          <Note text="Face ID / fingerprint isn't available on this device — passcode protects everything." />
        )}
        <ToggleRow
          label="Vault double-lock"
          hint="Ask for the passcode again before opening your vault"
          value={doubleLock}
          onChange={(v) => {
            setDoubleLock(v);
            void setKv("vaultDoubleLock", v ? "true" : "false");
          }}
        />
        <Row label="Auto-lock timer">
          <View style={styles.chipRow}>
            {AUTO_LOCK_OPTIONS.map((o) => (
              <ClayChip
                key={o.value}
                label={o.label}
                selected={autoLock === o.value}
                onPress={() => {
                  setAutoLock(o.value);
                  void setKv("autoLockMinutes", o.value);
                }}
                bg={palette.lavender}
              />
            ))}
          </View>
        </Row>
        <ClayButton
          label="🗑️ Delete everything…"
          color="ghost"
          onPress={() => setWipeModal(true)}
          textStyle={{ color: "#b0707e" }}
          style={{ marginTop: 8 }}
        />
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" emoji="🎨">
        <Row label="Pastel accent">
          <View style={styles.chipRow}>
            {ACCENTS.map((a) => (
              <ClayChip key={a.id} label={a.label} selected={theme.accent === a.id} onPress={() => theme.setAccent(a.id)} bg={a.hex} />
            ))}
          </View>
        </Row>
        <ToggleRow label="Night mode" hint="A deeper, quieter palette" value={theme.mode === "night"} onChange={() => theme.toggleNight()} />
        <ToggleRow label="Sounds" hint="Page-turn swish & gentle chimes" value={theme.sounds} onChange={theme.setSounds} />
      </Section>

      {/* ── Install & Devices ── */}
      <Section title="Install & Devices" emoji="📲">
        {IS_WEB ? (
          pwa.installed ? (
            <Note text="Venting is installed on this device 🌸 Enjoy the app-icon home." />
          ) : pwa.canInstall ? (
            <ClayButton label="📲 Install app on home screen" color="primary" size="lg" onPress={install} />
          ) : pwa.iosSafari ? (
            <ClayCard bg={hexWithAlpha(palette.peach, 0.5)} style={{ marginTop: 4 }}>
              <Text style={styles.installTitle}>Add Venting to your home screen</Text>
              <Text style={styles.installBody}>
                Tap the Share button in Safari (the square with an arrow ↑), then choose{" "}
                <Text style={{ fontWeight: "800" }}>“Add to Home Screen”</Text>. Venting will appear
                as an app icon and open full-screen, offline-ready.
              </Text>
            </ClayCard>
          ) : (
            <Note text="Your browser will offer an install option in the address bar — or check your menu. You're one tap from an app icon." />
          )
        ) : (
          <ClayCard bg={hexWithAlpha(palette.mint, 0.5)} style={{ marginTop: 4 }}>
            <Text style={styles.installTitle}>You're running the native app 💜</Text>
            <Text style={styles.installBody}>
              Everything is installed already and fully on-device. This build runs with Expo Go —
              publish to the App Store & Google Play from this codebase when you're ready.
            </Text>
          </ClayCard>
        )}
      </Section>

      {/* ── General ── */}
      <Section title="General" emoji="🌱">
        <Row label="Language">
          <View style={styles.chipRow}>
            <ClayChip label="English" selected bg={palette.sky} />
            <ClayChip label="More coming" bg={palette.cream} />
          </View>
        </Row>
        <ToggleRow
          label="Gentle reminders"
          hint="A soft evening nudge, off by default"
          value={reminders}
          onChange={(v) => {
            setReminders(v);
            void setKv("gentleReminders", v ? "true" : "false");
          }}
        />
        <ToggleRow
          label="Local-only mode"
          hint="Everything stays on this device — always"
          value={true}
          onChange={() => showToast("Venting never leaves your device — local-only is always on 💜")}
          locked
        />
        <Note text="No cloud, no account server, no analytics, no ads. Your recordings, notes, photos, scribbles, stickers, GIFs and diary never leave this device." />
      </Section>

      {/* ── About & safety ── */}
      <Section title="About & Safety" emoji="💜">
        <Note text="Venting v1.0 — a tiny safe room inside your phone. Made with care." />
        <ClayCard bg={hexWithAlpha(palette.blush, 0.4)} style={{ marginTop: 10 }}>
          <Text style={styles.safetyTitle}>You matter 💛</Text>
          <Text style={styles.safetyBody}>
            Venting is a private journal, not a substitute for professional care. If you're in
            crisis or need support right now, please reach out to a local helpline or emergency
            services — you deserve real help, and asking for it is brave.
          </Text>
        </ClayCard>
      </Section>

      <PasscodeModal visible={passcodeModal} onClose={() => setPasscodeModal(false)} onDone={() => showToast("Passcode updated 🔑")} />
      <WipeModal visible={wipeModal} onClose={() => setWipeModal(false)} onConfirm={confirmWipe} />

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

/* ─── bits ─────────────────────────────────────────────────────────── */

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <ClayCard style={{ marginTop: 16 }} bg={palette.surface}>
      <Text style={styles.sectionTitle}>
        {emoji} {title}
      </Text>
      {children}
    </ClayCard>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Note({ text }: { text: string }) {
  return <Text style={styles.note}>{text}</Text>;
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  locked,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <View style={[styles.row, styles.toggleRow]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={locked}
        trackColor={{ false: palette.cream, true: palette.lavenderDeep }}
        thumbColor={palette.surface}
      />
    </View>
  );
}

/* ─── Change passcode modal ────────────────────────────────────────── */

function PasscodeModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = React.useState<"current" | "new" | "confirm">("current");
  const [code, setCode] = React.useState("");
  const [next, setNext] = React.useState("");
  const [shake, setShake] = React.useState(0);

  React.useEffect(() => {
    if (visible) {
      setStep(hasPasscodeLocally() ? "current" : "new");
      setCode("");
      setNext("");
    }
  }, [visible]);

  const handle = async (c: string) => {
    if (step === "current") {
      if (c.length === 4) {
        const ok = await verifyPasscode(c);
        if (ok) {
          setCode("");
          setStep("new");
        } else {
          setCode("");
          setShake((s) => s + 1);
        }
      }
      return;
    }
    if (step === "new") {
      if (c.length === 4) {
        setNext(c);
        setCode("");
        setStep("confirm");
      }
      return;
    }
    if (c.length === 4) {
      if (c === next) {
        await setPasscode(c);
        onDone();
        onClose();
      } else {
        setCode("");
        setShake((s) => s + 1);
        setStep("new");
        setNext("");
      }
    }
  };

  const titles: Record<string, string> = {
    current: "Enter your current passcode",
    new: "Choose a new passcode",
    confirm: "Enter it once more",
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{titles[step]}</Text>
          <Text style={styles.modalSub}>Four gentle digits — only a salted hash is stored.</Text>
          <LockPad value={code} onChange={handle} shake={shake} />
          <ClayButton label="Cancel" color="ghost" onPress={onClose} textStyle={{ color: palette.inkSoft }} />
        </View>
      </View>
    </Modal>
  );
}

/* ─── Wipe confirmation ────────────────────────────────────────────── */

function WipeModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (visible) setArmed(false);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Delete everything?</Text>
          <Text style={styles.modalSub}>
            This removes all notes, recordings, diary pages, vault items, mood check-ins and your
            passcode from this device. {armed ? "There is no undo — everything goes." : "Take a breath — this is a big step."}
          </Text>
          {!armed ? (
            <ClayButton
              label="I understand — continue"
              color="blush"
              onPress={() => setArmed(true)}
              style={{ marginTop: 14 }}
            />
          ) : (
            <View style={{ gap: 10, marginTop: 14 }}>
              <ClayButton label="🗑️ Yes, delete everything" color="blush" onPress={onConfirm} />
              <ClayButton label="Keep everything" color="cream" onPress={onClose} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: "800", color: palette.ink, marginBottom: 12 },
  row: { marginBottom: 12 },
  rowLabel: { fontSize: 13.5, fontWeight: "700", color: palette.ink, marginBottom: 6 },
  rowHint: { fontSize: 11.5, color: palette.inkSoft, marginTop: 2, lineHeight: 15 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    backgroundColor: palette.cream,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: palette.ink,
    borderWidth: 1.5,
    borderColor: palette.lavender,
  },
  avatarRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  avatarOption: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  note: { fontSize: 12, color: palette.inkSoft, fontStyle: "italic", lineHeight: 17, marginTop: 6 },
  installTitle: { fontSize: 14, fontWeight: "800", color: palette.ink },
  installBody: { fontSize: 12.5, color: palette.inkSoft, lineHeight: 18, marginTop: 6 },
  safetyTitle: { fontSize: 14, fontWeight: "800", color: palette.ink },
  safetyBody: { fontSize: 12.5, color: palette.inkSoft, lineHeight: 18, marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(74, 68, 88, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: 22,
    alignItems: "center",
    ...clayShadow(true),
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: palette.ink, marginBottom: 6 },
  modalSub: { fontSize: 12.5, color: palette.inkSoft, textAlign: "center", lineHeight: 18, marginBottom: 8 },
  toast: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: palette.ink,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...clayShadow(true),
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
