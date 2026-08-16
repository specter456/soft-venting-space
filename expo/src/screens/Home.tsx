import React from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClayButton, ClayCard, ClayChip, hexWithAlpha, MoodBubble } from "../components/Clay";
import { greetingEmoji, greetingText, INTENSITY_LABELS, MOODS, moodById, todayDateKey } from "../data";
import { hasPasscodeLocally, saveCheckin, useTable } from "../db";
import { useLock } from "../lock-context";
import { MOOD_COLORS, MOOD_TEXT, palette, clayShadow, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { MoodCheckin } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const CARDS = [
  { name: "Record", emoji: "🎙️", bg: palette.blush, route: "Record" as const, line: "Voice & video vents" },
  { name: "Create", emoji: "🎨", bg: palette.peach, route: "Create" as const, line: "Photos, scribbles & stickers" },
  { name: "Calm", emoji: "🫧", bg: palette.mint, route: "Calm" as const, line: "Breathe, pop, float" },
  { name: "Diary", emoji: "📖", bg: palette.lavender, route: "Diary" as const, line: "Your private little book" },
];

export default function HomeScreen({ navigation }: Props) {
  const checkins = useTable<MoodCheckin>("moodCheckins");
  const today = checkins.find((c) => c.dateKey === todayDateKey());
  const [checkinOpen, setCheckinOpen] = React.useState(false);
  const lock = useLock();

  const onLockPress = () => {
    if (hasPasscodeLocally()) {
      lock.lockApp();
    } else {
      lock.openSetup();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>
              {greetingEmoji()} {greetingText()}
            </Text>
            <Text style={styles.date}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Text>
          </View>
          <Pressable onPress={onLockPress} style={[styles.lockBadge, clayShadow(false)]} accessibilityLabel="Lock app">
            <Text style={styles.lockBadgeText}>🔒</Text>
          </Pressable>
        </View>

        <ClayCard
          style={{ marginTop: 14 }}
          bg={today ? MOOD_COLORS[today.mood] ?? palette.lavender : palette.surface}
        >
          <Text style={styles.question}>How are you feeling today?</Text>
          <Text style={styles.questionHint}>
            {today
              ? `${moodById(today.mood)?.emoji ?? "💛"} ${moodById(today.mood)?.label ?? "Checked in"} · ${INTENSITY_LABELS[today.intensity] ?? ""}`
              : "Tap a bubble — this is just for you."}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubbles}>
            {MOODS.map((m) => (
              <MoodBubble
                key={m.id}
                emoji={m.emoji}
                label={m.label}
                bg={MOOD_COLORS[m.id]}
                selected={today?.mood === m.id}
                onPress={() => setCheckinOpen(true)}
              />
            ))}
          </ScrollView>
          {today?.note ? (
            <Text style={[styles.todayNote, { color: MOOD_TEXT[today.mood] }]} numberOfLines={2}>
              “{today.note}”
            </Text>
          ) : null}
        </ClayCard>

        <View style={styles.grid}>
          {CARDS.map((card) => (
            <ClayCard
              key={card.name}
              style={{ width: "47.5%", minHeight: 130, justifyContent: "center", alignItems: "center", paddingVertical: 20 }}
              bg={card.bg}
              onPress={() => navigation.navigate(card.route)}
            >
              <Text style={styles.cardEmoji}>{card.emoji}</Text>
              <Text style={styles.cardName}>{card.name}</Text>
              <Text style={styles.cardLine}>{card.line}</Text>
            </ClayCard>
          ))}
        </View>

        <Text style={styles.privacy}>Private and safe. Only you can see this.</Text>
      </ScrollView>

      <CheckinModal
        visible={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        today={today}
      />
    </SafeAreaView>
  );
}

/* ─── Mood check-in modal: bubble → intensity → optional note → done ── */

function CheckinModal({
  visible,
  onClose,
  today,
}: {
  visible: boolean;
  onClose: () => void;
  today?: MoodCheckin;
}) {
  const [step, setStep] = React.useState<"mood" | "intensity" | "note" | "done">("mood");
  const [mood, setMood] = React.useState<string | undefined>(today?.mood);
  const [intensity, setIntensity] = React.useState(today?.intensity ?? 3);
  const [note, setNote] = React.useState(today?.note ?? "");
  const sparkle = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setStep("mood");
      setMood(today?.mood);
      setIntensity(today?.intensity ?? 3);
      setNote(today?.note ?? "");
    }
  }, [visible, today]);

  const finish = () => {
    if (mood) {
      saveCheckin({ dateKey: todayDateKey(), mood, intensity, note: note.trim() || undefined });
    }
    sparkle.setValue(0);
    Animated.timing(sparkle, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    setStep("done");
  };

  const def = moodById(mood);
  const moodColor = mood ? MOOD_COLORS[mood] : palette.lavender;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: step === "done" ? moodColor : palette.surface }]}>
          {step === "mood" && (
            <>
              <Text style={styles.modalTitle}>How are you feeling?</Text>
              <View style={styles.modalBubbles}>
                {MOODS.map((m) => (
                  <MoodBubble
                    key={m.id}
                    emoji={m.emoji}
                    label={m.label}
                    bg={MOOD_COLORS[m.id]}
                    selected={mood === m.id}
                    onPress={() => {
                      setMood(m.id);
                      setStep("intensity");
                    }}
                  />
                ))}
              </View>
              <ClayButton label="Close" color="ghost" onPress={onClose} textStyle={{ color: palette.inkSoft }} />
            </>
          )}

          {step === "intensity" && (
            <>
              <Text style={styles.modalTitle}>
                {def?.emoji} How strong is it?
              </Text>
              <View style={styles.intensityCol}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <ClayChip
                    key={i}
                    label={`${INTENSITY_LABELS[i]}${i === 1 ? " ·" : ""}`}
                    selected={intensity === i}
                    onPress={() => setIntensity(i)}
                    bg={moodColor}
                  />
                ))}
              </View>
              <View style={styles.modalRow}>
                <ClayButton label="Back" color="cream" onPress={() => setStep("mood")} />
                <ClayButton label="Next" color="primary" onPress={() => setStep("note")} />
              </View>
            </>
          )}

          {step === "note" && (
            <>
              <Text style={styles.modalTitle}>Anything you want to say? (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="A word, a sentence, or nothing at all…"
                placeholderTextColor={palette.inkFaint}
                multiline
                style={[styles.modalInput, { borderColor: moodColor }]}
              />
              <View style={styles.modalRow}>
                <ClayButton label="Back" color="cream" onPress={() => setStep("intensity")} />
                <ClayButton label="Done" color="primary" onPress={finish} />
              </View>
            </>
          )}

          {step === "done" && (
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <Animated.Text style={[styles.sparkle, { opacity: sparkle, transform: [{ scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }] }]}>
                {def?.emoji}
              </Animated.Text>
              <Text style={[styles.doneTitle, { color: MOOD_TEXT[mood ?? "calm"] }]}>
                Thank you for sharing.
              </Text>
              <Text style={[styles.doneAffirm, { color: MOOD_TEXT[mood ?? "calm"] }]}>
                {def?.affirmation}
              </Text>
              <ClayButton
                label="I feel differently now"
                color="surface"
                onPress={() => setStep("mood")}
                textStyle={{ color: palette.inkSoft }}
              />
              <Pressable onPress={onClose} style={{ marginTop: 14 }}>
                <Text style={{ color: palette.inkSoft, fontWeight: "700" }}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 18, paddingBottom: 48 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  greeting: { fontSize: 22, fontWeight: "800", color: palette.ink },
  date: { marginTop: 2, fontSize: 13, color: palette.inkSoft },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadgeText: { fontSize: 17 },
  question: { fontSize: 16, fontWeight: "800", color: palette.ink },
  questionHint: { marginTop: 2, fontSize: 12.5, color: palette.inkSoft },
  bubbles: { gap: 6, paddingVertical: 12 },
  todayNote: { marginTop: 6, fontSize: 13, fontWeight: "600", fontStyle: "italic" },
  grid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  cardEmoji: { fontSize: 34 },
  cardName: { marginTop: 8, fontSize: 18, fontWeight: "800", color: palette.ink },
  cardLine: { marginTop: 2, fontSize: 12, color: palette.inkSoft, textAlign: "center" },
  privacy: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "700",
    color: palette.inkSoft,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(74, 68, 88, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.xl,
    padding: 22,
    ...clayShadow(true),
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: palette.ink, marginBottom: 16 },
  modalBubbles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 16 },
  intensityCol: { gap: 10, marginBottom: 18 },
  modalRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  modalInput: {
    backgroundColor: palette.cream,
    borderRadius: radius.md,
    padding: 14,
    minHeight: 90,
    fontSize: 14,
    color: palette.ink,
    borderWidth: 2,
    textAlignVertical: "top",
  },
  sparkle: { fontSize: 56, marginBottom: 8 },
  doneTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  doneAffirm: { fontSize: 14, textAlign: "center", marginTop: 8, marginBottom: 18, lineHeight: 20 },
});
