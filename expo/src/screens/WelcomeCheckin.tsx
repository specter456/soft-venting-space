import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClayCard, hexWithAlpha } from "../components/Clay";
import { todayDateKey } from "../data";
import { setKv } from "../db";
import { KV_ONBOARDING_DONE } from "../db";
import { useLock } from "../lock-context";
import { usePressGuard } from "../hooks";
import { clayShadow, palette, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

type Props = NativeStackScreenProps<RootStackParamList, "Checkin">;

/** Exactly four gentle options, in one straight row. */
const DAY_MOODS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "sad", label: "Sad", emoji: "😢" },
  { id: "angry", label: "Angry", emoji: "😠" },
  { id: "nervous", label: "Nervous", emoji: "😰" },
];

const JAR_COLORS: Record<string, string> = {
  happy: palette.peach,
  sad: palette.sky,
  angry: palette.blush,
  nervous: palette.lavender,
};

/** Short welcome flow: a soft popup card, one question, four moods, Skip. */
export default function WelcomeCheckinScreen({ navigation }: Props) {
  const lock = useLock();

  const finish = (moodId: string | null) => {
    // the answer stays on-device under today's date key — never sent anywhere
    void setKv(`checkin-${todayDateKey()}`, JSON.stringify({ mood: moodId }));
    void setKv(KV_ONBOARDING_DONE, "true");
    navigation.replace("Home");
    // gentle first-run lock setup — skippable, and settable anytime from Home
    lock.openSetup();
  };
  const guardedFinish = usePressGuard(() => finish(null), 450);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={{ marginTop: 24 }} bg={palette.surface}>
          <View style={styles.seal}>
            <Text style={styles.sealEmoji}>💜</Text>
          </View>
          <Text style={styles.welcome}>Welcome to Venting.</Text>
          <Text style={styles.hope}>We hope you had a nice day.</Text>
          <Text style={styles.hope}>I hope you can keep shining.</Text>

          <View style={styles.divider} />

          <Text style={styles.question}>How was your day?</Text>

          <View style={styles.moodRow}>
            {DAY_MOODS.map((m) => (
              <DayMood key={m.id} mood={m} onPress={() => finish(m.id)} />
            ))}
          </View>

          <Pressable onPress={guardedFinish} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>

          <Text style={styles.privacy}>🔒 Private and safe. Only you can see this.</Text>
        </ClayCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function DayMood({
  mood,
  onPress,
}: {
  mood: (typeof DAY_MOODS)[number];
  onPress: () => void;
}) {
  const guarded = usePressGuard(onPress, 450);
  return (
    <Pressable onPress={guarded} style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <View
        style={[
          styles.moodBubble,
          { backgroundColor: hexWithAlpha(JAR_COLORS[mood.id] ?? palette.lavender, 0.55) },
          clayShadow(false),
        ]}
      >
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
      </View>
      <Text style={styles.moodLabel}>{mood.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  seal: {
    width: 66,
    height: 66,
    borderRadius: radius.full,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 8,
  },
  sealEmoji: { fontSize: 28 },
  welcome: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
  },
  hope: {
    marginTop: 4,
    fontSize: 14.5,
    color: palette.ink,
    textAlign: "center",
    lineHeight: 20,
  },
  divider: {
    alignSelf: "center",
    width: 90,
    height: 1,
    backgroundColor: palette.lavender,
    marginTop: 18,
    marginBottom: 18,
  },
  question: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 16,
  },
  moodBubble: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 11, fontWeight: "700", color: palette.inkSoft },
  skip: { alignSelf: "center", marginTop: 22, paddingHorizontal: 12, paddingVertical: 6 },
  skipLabel: { fontSize: 13, fontWeight: "700", color: palette.inkSoft },
  privacy: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 11.5,
    color: palette.inkSoft,
    fontWeight: "600",
  },
});
