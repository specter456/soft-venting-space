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
import { TaskBar } from "../components/TaskBar";
import {
  CHECKIN_OPTIONS,
  greetingEmoji,
  greetingText,
  INTENSITY_LABELS,
  MOODS,
  moodById,
  todayDateKey,
} from "../data";
import { getKvFromCache, hasPasscodeLocally, saveCheckin, setKv, useTable } from "../db";
import { useLock } from "../lock-context";
import { useThemeColors } from "../theme-context";
import { MOOD_COLORS, MOOD_TEXT, palette, clayShadow, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { DiaryEntry, KVPair, MoodCheckin, Note, Recording } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const CARDS = [
  { name: "Record", emoji: "🎙️", bg: palette.blush, route: "Record" as const, line: "Voice & video vents" },
  { name: "Create", emoji: "🎨", bg: palette.peach, route: "Create" as const, line: "Photos, scribbles & stickers" },
  { name: "Calm", emoji: "🫧", bg: palette.mint, route: "Calm" as const, line: "Breathe, pop, float" },
  { name: "Diary", emoji: "📖", bg: palette.lavender, route: "Diary" as const, line: "Your private little book" },
];

const SUGGESTIONS: Record<string, { emoji: string; text: string; route: keyof RootStackParamList }> = {
  calm: { emoji: "🌸", text: "Keep the stillness — maybe make a soft sticker.", route: "Stickers" },
  sad: { emoji: "🖍️", text: "A gentle scribble might help — let it out in colors.", route: "Scribble" },
  angry: { emoji: "🎙️", text: "Vent it out — your voice is safe here.", route: "Record" },
  nervous: { emoji: "🫧", text: "Let's breathe together, slowly.", route: "Calm" },
  irritated: { emoji: "💭", text: "Pop a worry bubble or two.", route: "Calm" },
  happy: { emoji: "📖", text: "Catch this light in your diary.", route: "Diary" },
  tired: { emoji: "📝", text: "Rest is brave. Maybe a soft note.", route: "Notes" },
  overwhelmed: { emoji: "🫧", text: "One breath at a time — let's float.", route: "Calm" },
};

export default function HomeScreen({ navigation }: Props) {
  const checkins = useTable<MoodCheckin>("moodCheckins");
  useTable<KVPair>("kv"); // subscribe so the kv cache stays reactive
  const notes = useTable<Note>("notes");
  const recordings = useTable<Recording>("recordings");
  const diaries = useTable<DiaryEntry>("diaryEntries");
  const lock = useLock();
  const colors = useThemeColors();

  const today = checkins.find((c) => c.dateKey === todayDateKey());
  const [checkinOpen, setCheckinOpen] = React.useState(false);

  const profileName = getKvFromCache("profileName");
  const greeted = profileName ? `${greetingText()}, ${profileName}` : greetingText();

  const onLockPress = () => {
    if (hasPasscodeLocally()) lock.lockApp();
    else lock.openSetup();
  };

  // ── daily check-in checklist (skippable, once per day) ──
  const checklistDone =
    getKvFromCache(`checkin-${todayDateKey()}`) !== undefined ||
    getKvFromCache(`checkinSkipped-${todayDateKey()}`) !== undefined;

  // ── pick up where you left off ──
  const latest = React.useMemo(() => {
    const items: { at: number; kind: "note" | "recording" | "diary"; label: string; emoji: string }[] = [];
    const firstNote = notes[0];
    const firstRec = recordings[0];
    const firstDiary = diaries[0];
    if (firstNote) items.push({ at: firstNote.at, kind: "note", label: (firstNote.body ?? "").slice(0, 42) || "your reflection", emoji: "📝" });
    if (firstRec) items.push({ at: firstRec.at, kind: "recording", label: firstRec.kind === "voice" ? "a voice vent" : "a video vent", emoji: firstRec.kind === "voice" ? "🎙️" : "🎥" });
    if (firstDiary) items.push({ at: firstDiary.at, kind: "diary", label: firstDiary.title || "a diary page", emoji: "📖" });
    items.sort((a, b) => b.at - a.at);
    return items[0];
  }, [notes, recordings, diaries]);

  const goLatest = () => {
    if (!latest) return;
    if (latest.kind === "note") navigation.navigate("Notes");
    else if (latest.kind === "recording") navigation.navigate("Record");
    else navigation.navigate("Diary");
  };

  // ── gentle suggestion from today's (or last) mood ──
  const moodSource = today ?? checkins[0];
  const suggestion = moodSource ? SUGGESTIONS[moodSource.mood] : undefined;

  // ── gentle evening reminder (opt-in) ──
  const eveningReminder =
    getKvFromCache("gentleReminders") === "true" && new Date().getHours() >= 20;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.ink }]}>
              {greetingEmoji()} {greeted}
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={({ pressed }) => [styles.gearBtn, { backgroundColor: colors.card }, clayShadow(false), pressed && { transform: [{ scale: 0.92 }] }]}
            accessibilityLabel="Settings"
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* privacy chip */}
        <View style={styles.privacyRow}>
          <View style={[styles.privacyChip, { backgroundColor: colors.card }]}>
            <Text style={[styles.privacyChipText, { color: colors.inkSoft }]}>🔒 Private · Only you</Text>
          </View>
          <Pressable onPress={onLockPress} accessibilityLabel="Lock app">
            <Text style={styles.lockHint}>🔐</Text>
          </Pressable>
        </View>

        {/* daily check-in checklist */}
        {!checklistDone ? (
          <DailyChecklist key={todayDateKey()} />
        ) : null}

        {/* mood check-in card */}
        <ClayCard
          style={{ marginTop: 14 }}
          bg={today ? MOOD_COLORS[today.mood] ?? palette.lavender : colors.card}
        >
          <Text style={[styles.question, { color: colors.ink }]}>How are you feeling today?</Text>
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

        {/* gentle suggestion */}
        {suggestion ? (
          <ClayCard
            style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
            bg={hexWithAlpha(colors.accent, 0.4)}
            onPress={() => navigation.navigate(suggestion.route)}
          >
            <Text style={styles.suggestionEmoji}>{suggestion.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.suggestionTitle, { color: colors.ink }]}>A gentle nudge</Text>
              <Text style={[styles.suggestionText, { color: colors.inkSoft }]}>{suggestion.text}</Text>
            </View>
            <Text style={styles.suggestionArrow}>›</Text>
          </ClayCard>
        ) : null}

        {/* pick up where you left off */}
        {latest ? (
          <ClayCard
            style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
            bg={colors.card}
            onPress={goLatest}
          >
            <View style={[styles.pickupIcon, clayShadow(false)]}>
              <Text style={{ fontSize: 22 }}>{latest.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickupTitle, { color: colors.ink }]}>Pick up where you left off</Text>
              <Text style={[styles.pickupText, { color: colors.inkSoft }]} numberOfLines={1}>
                {latest.label} · {timeAgo(latest.at)}
              </Text>
            </View>
            <Text style={styles.suggestionArrow}>›</Text>
          </ClayCard>
        ) : null}

        {/* evening reminder */}
        {eveningReminder ? (
          <ClayCard style={{ marginTop: 14, alignItems: "center" }} bg={palette.lavender}>
            <Text style={styles.reminderEmoji}>🌙</Text>
            <Text style={styles.reminderText}>
              A gentle reminder from Venting: you don't have to carry today alone. A tiny note or a
              calm breath can be enough.
            </Text>
          </ClayCard>
        ) : null}

        {/* the four rooms */}
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

        <Text style={[styles.privacy, { color: colors.inkFaint }]}>
          Private and safe. Only you can see this.
        </Text>
      </ScrollView>

      <CheckinModal visible={checkinOpen} onClose={() => setCheckinOpen(false)} today={today} />
      <TaskBar />
    </SafeAreaView>
  );
}

/* ─── Daily check-in checklist ─────────────────────────────────────── */

function DailyChecklist() {
  const colors = useThemeColors();
  const [picked, setPicked] = React.useState<string[]>([]);
  const dateKey = todayDateKey();

  const toggle = (option: string) =>
    setPicked((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));

  const done = () => {
    void setKv(`checkin-${dateKey}`, JSON.stringify(picked));
  };
  const skip = () => {
    void setKv(`checkinSkipped-${dateKey}`, "true");
  };

  return (
    <ClayCard style={{ marginTop: 14 }} bg={colors.card}>
      <Text style={[styles.checklistTitle, { color: colors.ink }]}>How was your day?</Text>
      <Text style={[styles.checklistHint, { color: colors.inkSoft }]}>
        Pick any that feel true — or skip. It stays here.
      </Text>
      <View style={styles.checklistOptions}>
        {CHECKIN_OPTIONS.map((option) => (
          <ClayChip
            key={option}
            label={option}
            selected={picked.includes(option)}
            onPress={() => toggle(option)}
            bg={picked.includes(option) ? colors.accent : colors.surface}
          />
        ))}
      </View>
      <View style={styles.checklistActions}>
        <ClayButton label="Skip for today" color="ghost" onPress={skip} textStyle={{ color: colors.inkSoft }} />
        <ClayButton label="Done 💛" color="primary" onPress={done} />
      </View>
    </ClayCard>
  );
}

/* ─── Mood check-in modal ──────────────────────────────────────────── */

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
                autoCorrect={false}
                spellCheck={false}
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
              <Animated.Text
                style={[
                  styles.sparkle,
                  {
                    opacity: sparkle,
                    transform: [{ scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
                  },
                ]}
              >
                {def?.emoji}
              </Animated.Text>
              <Text style={[styles.doneTitle, { color: MOOD_TEXT[mood ?? "calm"] }]}>Thank you for sharing.</Text>
              <Text style={[styles.doneAffirm, { color: MOOD_TEXT[mood ?? "calm"] }]}>{def?.affirmation}</Text>
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

function timeAgo(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(at).toLocaleDateString();
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 18, paddingBottom: 110 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  greeting: { fontSize: 22, fontWeight: "800" },
  date: { marginTop: 2, fontSize: 13, color: palette.inkSoft },
  gearBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  gearIcon: { fontSize: 19 },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  privacyChip: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  privacyChipText: { fontSize: 11.5, fontWeight: "700" },
  lockHint: { fontSize: 17, padding: 2 },
  checklistTitle: { fontSize: 15.5, fontWeight: "800", marginBottom: 3 },
  checklistHint: { fontSize: 12.5, marginBottom: 12 },
  checklistOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  checklistActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  question: { fontSize: 16, fontWeight: "800" },
  questionHint: { marginTop: 2, fontSize: 12.5, color: palette.inkSoft },
  bubbles: { gap: 6, paddingVertical: 12 },
  todayNote: { marginTop: 6, fontSize: 13, fontWeight: "600", fontStyle: "italic" },
  suggestionEmoji: { fontSize: 28 },
  suggestionTitle: { fontSize: 13, fontWeight: "800" },
  suggestionText: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  suggestionArrow: { fontSize: 22, color: palette.inkSoft },
  pickupIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupTitle: { fontSize: 13, fontWeight: "800" },
  pickupText: { fontSize: 12, marginTop: 2 },
  reminderEmoji: { fontSize: 30 },
  reminderText: { marginTop: 8, fontSize: 12.5, color: palette.ink, textAlign: "center", lineHeight: 18 },
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
