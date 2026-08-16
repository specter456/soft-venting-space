import React from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { TaskBar } from "../components/TaskBar";
import { ClayCard, ClayChip, hexWithAlpha } from "../components/Clay";
import { WORRY_BUBBLES } from "../data";
import { clayShadow, palette, radius } from "../theme";

type Game = "pick" | "breathe" | "worries" | "dandelion";

const FEELING_CHIPS = ["nervous", "angry", "sad", "irritated", "stressed", "overwhelmed", "restless", "happy"];

/** Calm — gentle emotional regulation, never competitive. */
export default function CalmScreen() {
  const [game, setGame] = React.useState<Game>("pick");

  if (game === "pick") {
    return (
      <Screen title="Calm" subtitle="A soft place to land" bottomBar={<TaskBar />}>
        <ClayCard bg={palette.surface} style={{ alignItems: "center", marginTop: 4 }}>
          <Text style={styles.bear}>🐻</Text>
          <Text style={styles.bearTitle}>How are you feeling right now?</Text>
          <View style={styles.chipRow}>
            {FEELING_CHIPS.map((f) => (
              <ClayChip key={f} label={f} onPress={() => setGame("breathe")} bg={palette.lavender} />
            ))}
          </View>
          <Text style={styles.bearHint}>
            Whatever you picked — let's take a gentle minute together. No scores, no levels, no rush.
          </Text>
        </ClayCard>

        <View style={styles.gameRow}>
          <GameCard emoji="🫧" title="Breathe" subtitle="follow the bubble" bg={palette.mint} onPress={() => setGame("breathe")} />
          <GameCard emoji="💭" title="Worry pops" subtitle="burst what's heavy" bg={palette.blush} onPress={() => setGame("worries")} />
          <GameCard emoji="🌼" title="Dandelion" subtitle="blow wishes away" bg={palette.peach} onPress={() => setGame("dandelion")} />
        </View>
      </Screen>
    );
  }

  if (game === "breathe") return <BreatheGame onBack={() => setGame("pick")} />;
  if (game === "worries") return <WorryGame onBack={() => setGame("pick")} />;
  return <DandelionGame onBack={() => setGame("pick")} />;
}

/* ─── shared bits ──────────────────────────────────────────────────── */

function GameCard({
  emoji,
  title,
  subtitle,
  bg,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <ClayCard style={{ width: "31%", alignItems: "center", paddingVertical: 16 }} bg={bg} onPress={onPress}>
      <Text style={styles.gameEmoji}>{emoji}</Text>
      <Text style={styles.gameTitle}>{title}</Text>
      <Text style={styles.gameSub}>{subtitle}</Text>
    </ClayCard>
  );
}

/* ─── Breathing bubbles ────────────────────────────────────────────── */

function BreatheGame({ onBack }: { onBack: () => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const [phase, setPhase] = React.useState("inhale");
  const [count, setCount] = React.useState(0);
  const [rounds, setRounds] = React.useState(0);

  React.useEffect(() => {
    const run = () => {
      setPhase("inhale");
      Animated.timing(scale, { toValue: 1.5, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(() => {
        setPhase("hold");
        setTimeout(() => {
          setPhase("exhale");
          Animated.timing(scale, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(() => {
            setCount((c) => c + 1);
            setRounds((r) => r + 1);
          });
        }, 2000);
      });
    };
    run();
    return () => {
      scale.stopAnimation();
    };
  }, [scale, count]);

  const phaseLabel =
    phase === "inhale" ? "Breathe in… 4 counts" : phase === "hold" ? "Hold softly…" : "Breathe out… 5 counts";

  return (
    <Screen title="Breathe" subtitle="In… and out. You're safe." onBack={onBack}>
      <View style={styles.breathWrap}>
        <Animated.View style={[styles.bubble, { transform: [{ scale }] }]}>
          <Text style={styles.bubbleEmoji}>🫧</Text>
        </Animated.View>
      </View>
      <Text style={styles.phase}>{phaseLabel}</Text>
      <Text style={styles.count}>gentle breaths: {count}</Text>
      <ClayCard bg={palette.surface} style={{ marginTop: 18, alignItems: "center" }}>
        <Text style={styles.breathTip}>
          The bubble grows as you breathe in, floats while you hold, and softens as you let go.
          Your thoughts can drift — the bubble keeps the rhythm.
        </Text>
      </ClayCard>
    </Screen>
  );
}

/* ─── Worry bubbles ────────────────────────────────────────────────── */

function WorryGame({ onBack }: { onBack: () => void }) {
  const [worries, setWorries] = React.useState<string[]>(
    () => [...WORRY_BUBBLES].sort(() => Math.random() - 0.5).slice(0, 6),
  );
  const [popped, setPopped] = React.useState<Set<number>>(new Set());
  const [allDone, setAllDone] = React.useState(false);

  const pop = (i: number) => {
    if (popped.has(i)) return;
    const next = new Set(popped);
    next.add(i);
    setPopped(next);
    if (next.size === worries.length) setAllDone(true);
  };

  return (
    <Screen title="Worry pops" subtitle="Each bubble holds a worry. Pop it gently." onBack={onBack}>
      <View style={styles.worryRow}>
        {worries.map((w, i) => {
          const done = popped.has(i);
          return (
            <Pressable
              key={i}
              onPress={() => pop(i)}
              disabled={done}
              style={({ pressed }) => [
                styles.worryBubble,
                done && { opacity: 0.25, transform: [{ scale: 0.92 }] },
                pressed && { transform: [{ scale: 1.06 }] },
              ]}
            >
              <Text style={styles.worryText}>{done ? "💨" : `“${w}”`}</Text>
            </Pressable>
          );
        })}
      </View>
      {allDone ? (
        <ClayCard bg={palette.mint} style={{ marginTop: 18, alignItems: "center" }}>
          <Text style={styles.doneEmoji}>🕊️</Text>
          <Text style={styles.doneTitle}>Look at that — lighter already.</Text>
          <Text style={styles.doneBody}>
            The worries didn't disappear forever; they just don't need to float around you right now.
          </Text>
        </ClayCard>
      ) : (
        <Text style={styles.hint}>tap a bubble when you're ready to let that one go</Text>
      )}
    </Screen>
  );
}

/* ─── Dandelion ────────────────────────────────────────────────────── */

function DandelionGame({ onBack }: { onBack: () => void }) {
  const [blown, setBlown] = React.useState(false);
  const [wish, setWish] = React.useState("a gentler day");
  const seeds = React.useRef(
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      dx: (i % 2 === 0 ? 1 : -1) * (30 + i * 9),
      dy: -80 - i * 26,
      delay: i * 140,
    })),
  ).current;

  const blow = () => {
    if (blown) return;
    setBlown(true);
    setTimeout(() => setBlown(false), 4000);
    setTimeout(() => setWish(WISHES[Math.floor(Math.random() * WISHES.length)]), 0);
  };

  return (
    <Screen title="Dandelion" subtitle="Blow a wish into the wind" onBack={onBack}>
      <View style={styles.dandelionWrap}>
        <Text style={styles.dandelion}>{blown ? "🌱" : "🌼"}</Text>
        {blown
          ? seeds.map((s) => (
              <Seed key={s.id} delay={s.delay} dx={s.dx} dy={s.dy} />
            ))
          : null}
        <Pressable onPress={blow} style={[styles.blowBtn, clayShadow(true)]}>
          <Text style={styles.blowBtnText}>{blown ? "…floating" : "💨 Blow"}</Text>
        </Pressable>
      </View>
      <ClayCard bg={palette.surface} style={{ marginTop: 18, alignItems: "center" }}>
        <Text style={styles.wishLabel}>your wish rides on the seeds:</Text>
        <Text style={styles.wishText}>{wish}</Text>
        <Text style={styles.wishHint}>no one hears it but the wind. It's yours.</Text>
      </ClayCard>
    </Screen>
  );
}

function Seed({ delay, dx, dy }: { delay: number; dx: number; dy: number }) {
  const pos = React.useRef(new Animated.Value(0)).current;
  const drift = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(pos, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ]).start();
  }, [delay, pos, drift]);

  return (
    <Animated.Text
      style={[
        styles.seed,
        {
          opacity: pos.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: pos.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            { scale: pos.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) },
          ],
        },
      ]}
    >
      ✿
    </Animated.Text>
  );
}

const WISHES = [
  "a gentler day",
  "one deep breath",
  "a soft good night",
  "courage for tomorrow",
  "a moment of quiet",
  "a warm hug",
  "peace, even for a minute",
];

const styles = StyleSheet.create({
  bear: { fontSize: 56 },
  bearTitle: { marginTop: 10, fontSize: 16, fontWeight: "800", color: palette.ink, textAlign: "center" },
  bearHint: { marginTop: 8, fontSize: 12.5, color: palette.inkSoft, textAlign: "center", lineHeight: 18 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  gameRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  gameEmoji: { fontSize: 26 },
  gameTitle: { marginTop: 6, fontSize: 13, fontWeight: "800", color: palette.ink, textAlign: "center" },
  gameSub: { marginTop: 2, fontSize: 10.5, color: palette.inkSoft, textAlign: "center" },
  breathWrap: { alignItems: "center", justifyContent: "center", height: 300 },
  bubble: {
    width: 160,
    height: 160,
    borderRadius: radius.full,
    backgroundColor: hexWithAlpha(palette.mint, 0.85),
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleEmoji: { fontSize: 56 },
  phase: { textAlign: "center", fontSize: 17, fontWeight: "800", color: palette.ink, marginTop: -8 },
  count: { textAlign: "center", fontSize: 13, color: palette.inkSoft, marginTop: 6 },
  breathTip: { fontSize: 13, color: palette.inkSoft, lineHeight: 19, textAlign: "center" },
  worryRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 20 },
  worryBubble: {
    backgroundColor: hexWithAlpha(palette.blush, 0.7),
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...clayShadow(false),
  },
  worryText: { fontSize: 13, fontWeight: "700", color: palette.ink, textAlign: "center" },
  hint: { textAlign: "center", marginTop: 20, fontSize: 12, color: palette.inkFaint, fontStyle: "italic" },
  doneEmoji: { fontSize: 42 },
  doneTitle: { marginTop: 8, fontSize: 16, fontWeight: "800", color: palette.ink, textAlign: "center" },
  doneBody: { marginTop: 6, fontSize: 13, color: palette.inkSoft, textAlign: "center", lineHeight: 19 },
  dandelionWrap: { alignItems: "center", justifyContent: "center", height: 320 },
  dandelion: { fontSize: 96 },
  blowBtn: {
    marginTop: 24,
    backgroundColor: palette.surface,
    borderRadius: radius.full,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  blowBtnText: { fontSize: 15, fontWeight: "800", color: palette.ink },
  seed: { position: "absolute", fontSize: 18, color: palette.inkSoft },
  wishLabel: { fontSize: 12.5, color: palette.inkSoft, fontWeight: "600" },
  wishText: { marginTop: 6, fontSize: 20, fontWeight: "800", color: palette.ink, fontStyle: "italic", textAlign: "center" },
  wishHint: { marginTop: 6, fontSize: 12, color: palette.inkFaint, textAlign: "center" },
});
