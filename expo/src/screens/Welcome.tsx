import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClayButton, ClayCard } from "../components/Clay";
import { setKv } from "../db";
import { KV_ONBOARDING_DONE, KV_PROFILE_EMAIL } from "../db";
import { clayShadow, palette, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Entry: email (optional, validated, stored only on-device) or guest. */
export default function WelcomeScreen({ navigation }: Props) {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const enter = async (withEmail: boolean) => {
    if (withEmail) {
      const trimmed = email.trim();
      if (!trimmed) {
        setError("Please enter an email, or continue as guest.");
        return;
      }
      if (!EMAIL_RE.test(trimmed)) {
        setError("Please enter a valid email.");
        return;
      }
      await setKv(KV_PROFILE_EMAIL, trimmed);
    }
    await setKv(KV_ONBOARDING_DONE, "true");
    setBusy(true);
    // gentle pause for the soft transition
    setTimeout(() => navigation.replace("Checkin"), 350);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.cloud, clayShadow(true)]}>
            <Text style={styles.cloudEmoji}>☁️</Text>
          </View>
          <Text style={styles.name}>Venting</Text>
          <Text style={styles.tagline}>Your feelings are safe here.</Text>

          <ClayCard style={{ marginTop: 28, width: "100%" }}>
            <Text style={styles.fieldLabel}>Email (optional)</Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="you@example.com"
              placeholderTextColor={palette.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <ClayButton
                label="Continue with Email"
                color="primary"
                size="lg"
                loading={busy}
                onPress={() => enter(true)}
              />
              <ClayButton
                label="Continue as Guest"
                color="cream"
                size="lg"
                disabled={busy}
                onPress={() => enter(false)}
              />
            </View>
          </ClayCard>

          <Text style={styles.privacy}>🔒 Private. No sharing. Only you can see this.</Text>
          <Text style={styles.localNote}>
            Everything stays on this device. No account, no profile, no tracking.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  cloud: {
    width: 108,
    height: 108,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cloudEmoji: {
    fontSize: 52,
  },
  name: {
    marginTop: 22,
    fontSize: 36,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    color: palette.inkSoft,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.inkSoft,
    marginBottom: 8,
  },
  input: {
    backgroundColor: palette.cream,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: palette.ink,
    borderWidth: 1.5,
    borderColor: hexAlpha(palette.lavender, 0.6),
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: "#b0707e",
    fontWeight: "600",
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  privacy: {
    marginTop: 26,
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink,
    textAlign: "center",
  },
  localNote: {
    marginTop: 6,
    fontSize: 12,
    color: palette.inkFaint,
    textAlign: "center",
  },
});

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
