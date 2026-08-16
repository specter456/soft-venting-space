import React from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { autoLockMinutes, hasPasscodeLocally, getKvFromCache, hydrate, setKv } from "./src/db";
import { KV_ONBOARDING_DONE, KV_LOCK_SKIPPED } from "./src/db";
import { authenticateBiometric, biometricAllowed, biometricStatus, setPasscode, verifyPasscode } from "./src/auth";
import { LockContext, type LockPhase } from "./src/lock-context";
import { ThemeProvider, useThemeColors } from "./src/theme-context";
import { clayShadow, palette, radius } from "./src/theme";
import { LockPad } from "./src/components/LockPad";
import { ClayButton } from "./src/components/Clay";

import WelcomeScreen from "./src/screens/Welcome";
import WelcomeCheckinScreen from "./src/screens/WelcomeCheckin";
import HomeScreen from "./src/screens/Home";
import SettingsScreen from "./src/screens/Settings";
import RecordScreen from "./src/screens/Record";
import NotesScreen from "./src/screens/Notes";
import NoteEditorScreen from "./src/screens/NoteEditor";
import CreateScreen from "./src/screens/Create";
import PhotosScreen from "./src/screens/Photos";
import ScribbleScreen from "./src/screens/Scribble";
import StickerStudioScreen from "./src/screens/Stickers";
import GifStudioScreen from "./src/screens/GifStudio";
import VaultScreen from "./src/screens/Vault";
import CalmScreen from "./src/screens/Calm";
import DiaryScreen from "./src/screens/Diary";

import type { RootStackParamList } from "./src/nav";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.bg,
    card: palette.bg,
    text: palette.ink,
    primary: palette.lavenderDeep,
  },
};

export default function App() {
  const [phase, setPhase] = React.useState<LockPhase>("boot");
  const lastActive = React.useRef(Date.now());

  React.useEffect(() => {
    void (async () => {
      await hydrate();
      const onboardingDone = getKvFromCache(KV_ONBOARDING_DONE) === "true";
      if (!onboardingDone) {
        setPhase("open");
      } else if (hasPasscodeLocally()) {
        setPhase("unlock");
      } else if (getKvFromCache(KV_LOCK_SKIPPED) === "true") {
        setPhase("open");
      } else {
        setPhase("setup");
      }
    })();
  }, []);

  // Auto-lock: if a timer is set and the app goes quiet, ask for the passcode again.
  React.useEffect(() => {
    if (phase !== "open") return;
    const touch = () => {
      lastActive.current = Date.now();
    };
    touch();
    const interval = setInterval(() => {
      const mins = autoLockMinutes();
      if (mins > 0 && hasPasscodeLocally() && Date.now() - lastActive.current > mins * 60_000) {
        setPhase("unlock");
      }
    }, 15_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") touch();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [phase]);

  const lockApi = React.useMemo(
    () => ({
      phase,
      lockApp: () => {
        if (hasPasscodeLocally()) setPhase("unlock");
      },
      openSetup: () => setPhase("setup"),
      unlock: () => setPhase("open"),
    }),
    [phase],
  );

  if (phase === "boot") {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootEmoji}>☁️</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LockContext.Provider value={lockApi}>
          <ThemedStatusBar />
          {phase === "setup" ? <LockSetup onDone={() => setPhase("open")} /> : null}
          {phase === "unlock" ? <UnlockGate onUnlocked={() => setPhase("open")} /> : null}
          {phase === "open" ? <MainNavigator /> : null}
        </LockContext.Provider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const colors = useThemeColors();
  return <StatusBar style={colors.mode === "night" ? "light" : "dark"} />;
}

/* ─── First-run passcode setup ─────────────────────────────────────── */

function LockSetup({ onDone }: { onDone: () => void }) {
  const [step, setStep] = React.useState<"enter" | "confirm">("enter");
  const [first, setFirst] = React.useState("");
  const [code, setCode] = React.useState("");
  const [shake, setShake] = React.useState(0);

  const handle = async (c: string) => {
    if (step === "enter") {
      if (c.length === 4) {
        setFirst(c);
        setCode("");
        setStep("confirm");
      }
      return;
    }
    if (c.length === 4) {
      if (c === first) {
        await setPasscode(c);
        onDone();
      } else {
        setCode("");
        setShake((s) => s + 1);
        setStep("enter");
        setFirst("");
      }
    }
  };

  const skip = async () => {
    await setKv(KV_LOCK_SKIPPED, "true");
    onDone();
  };

  return (
    <SafeAreaFill>
      <View style={styles.gateWrap}>
        <View style={[styles.lockSeal, clayShadow(true)]}>
          <Text style={styles.lockSealEmoji}>🔒</Text>
        </View>
        <Text style={styles.gateTitle}>Create your passcode</Text>
        <Text style={styles.gateSub}>
          {step === "enter"
            ? "Four gentle digits. Your passcode never leaves this device — only a salted hash is stored."
            : "Enter it once more, so we know it's yours."}
        </Text>
        <View style={styles.padWrap}>
          <LockPad value={code} onChange={handle} shake={shake} />
        </View>
        <ClayButton label="Maybe later" color="ghost" onPress={skip} textStyle={{ color: palette.inkSoft }} />
      </View>
    </SafeAreaFill>
  );
}

/* ─── Unlock gate ──────────────────────────────────────────────────── */

function UnlockGate({ onUnlocked }: { onUnlocked: () => void }) {
  const colors = useThemeColors();
  const [code, setCode] = React.useState("");
  const [shake, setShake] = React.useState(0);
  const [bio, setBio] = React.useState<"face" | "fingerprint" | null>(null);

  React.useEffect(() => {
    void biometricStatus().then((s) => {
      if (s.enrolled && biometricAllowed()) setBio(s.type);
    });
  }, []);

  const tryUnlock = async (c: string) => {
    if (c.length !== 4) return;
    const ok = await verifyPasscode(c);
    if (ok) {
      onUnlocked();
    } else {
      setCode("");
      setShake((s) => s + 1);
    }
  };

  const unlockBio = async () => {
    const ok = await authenticateBiometric();
    if (ok) onUnlocked();
  };

  return (
    <SafeAreaFill>
      <View style={styles.gateWrap}>
        <View style={[styles.lockSeal, clayShadow(true)]}>
          <Text style={styles.lockSealEmoji}>🔒</Text>
        </View>
        <Text style={[styles.gateTitle, { color: colors.ink }]}>Welcome back</Text>
        <Text style={[styles.gateSub, { color: colors.inkSoft }]}>Only you can access your feelings.</Text>
        <View style={styles.padWrap}>
          <LockPad
            value={code}
            onChange={(c) => {
              setCode(c);
              void tryUnlock(c);
            }}
            shake={shake}
            biometricNode={
              bio ? (
                <Pressable onPress={unlockBio} style={{ paddingHorizontal: 8 }}>
                  <Text style={styles.bioText}>{bio === "face" ? "😊 Face ID" : "☝️ Fingerprint"}</Text>
                </Pressable>
              ) : null
            }
          />
        </View>
        <Text style={[styles.privacy, { color: colors.inkSoft }]}>Private and safe. Only you can see this.</Text>
      </View>
    </SafeAreaFill>
  );
}

function SafeAreaFill({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.gateRoot}>
      <View pointerEvents="none" style={[styles.gateGlow, { top: -90, left: -100, backgroundColor: palette.lavender }]} />
      <View pointerEvents="none" style={[styles.gateGlow, { top: 220, right: -120, backgroundColor: palette.blush }]} />
      <View pointerEvents="none" style={[styles.gateGlow, { bottom: -120, left: -80, backgroundColor: palette.mint }]} />
      {children}
    </View>
  );
}

/* ─── Main navigator ───────────────────────────────────────────────── */

function MainNavigator() {
  const colors = useThemeColors();
  const theme = {
    ...navTheme,
    colors: { ...navTheme.colors, background: colors.bg, card: colors.bg },
  };
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        initialRouteName={getKvFromCache(KV_ONBOARDING_DONE) === "true" ? "Home" : "Welcome"}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Checkin" component={WelcomeCheckinScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Record" component={RecordScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
        <Stack.Screen name="Create" component={CreateScreen} />
        <Stack.Screen name="Photos" component={PhotosScreen} />
        <Stack.Screen name="Scribble" component={ScribbleScreen} />
        <Stack.Screen name="Stickers" component={StickerStudioScreen} />
        <Stack.Screen name="GifStudio" component={GifStudioScreen} />
        <Stack.Screen name="Vault" component={VaultScreen} />
        <Stack.Screen name="Calm" component={CalmScreen} />
        <Stack.Screen name="Diary" component={DiaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: palette.bg, alignItems: "center", justifyContent: "center" },
  bootEmoji: { fontSize: 64 },
  gateRoot: { flex: 1, backgroundColor: palette.bg, overflow: "hidden" },
  gateGlow: { position: "absolute", width: 320, height: 320, borderRadius: 160, opacity: 0.5 },
  gateWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  lockSeal: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  lockSealEmoji: { fontSize: 40 },
  gateTitle: { marginTop: 18, fontSize: 22, fontWeight: "800", color: palette.ink },
  gateSub: {
    marginTop: 8,
    fontSize: 13,
    color: palette.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  padWrap: { width: "100%", marginTop: 8 },
  bioText: { fontSize: 14, fontWeight: "700", color: palette.inkSoft },
  privacy: { marginTop: 6, fontSize: 12.5, fontWeight: "700", color: palette.inkSoft },
});
