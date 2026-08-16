import React from "react";
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { Screen } from "../components/Screen";
import { TaskBar } from "../components/TaskBar";
import { ClayCard, ClayButton, hexWithAlpha } from "../components/Clay";
import { WORRY_BUBBLES } from "../data";
import { usePressGuard } from "../hooks";
import { clayShadow, palette, radius } from "../theme";

/* ─── Game registry — exactly six games, two per row ───────────────── */

type GameId = "pop" | "breathe" | "dandelion" | "buddy" | "jars" | "star";

const GAMES: {
  id: GameId;
  emoji: string;
  name: string;
  line: string;
  bg: string;
}[] = [
  { id: "pop", emoji: "🫧", name: "Bubble Pop", line: "gently pop floating worry bubbles", bg: palette.blush },
  { id: "breathe", emoji: "🫧", name: "Breath Bubble", line: "a soft bubble guides slow breathing", bg: palette.mint },
  { id: "dandelion", emoji: "🌼", name: "Dandelion Wishes", line: "press & hold to blow worries away", bg: palette.peach },
  { id: "buddy", emoji: "🧸", name: "Comfort the Buddy", line: "a shaky buddy calms with taps & hugs", bg: palette.lavender },
  { id: "jars", emoji: "🫙", name: "Feelings Jars", line: "sort floating feelings into soft jars", bg: palette.sky },
  { id: "star", emoji: "⭐", name: "Star Trace", line: "trace slow glowing shapes to calm", bg: palette.mint },
];

/**
 * Games — gentle emotional regulation, never competitive. No scores, no
 * timers, no winning or losing. Each game is a small safe room of its own.
 */
export default function GamesScreen() {
  const [open, setOpen] = React.useState<GameId | null>(null);

  if (open) {
    return (
      <Screen title="Games" onBack={() => setOpen(null)}>
        {open === "pop" && <BubblePop />}
        {open === "breathe" && <BreathBubble />}
        {open === "dandelion" && <DandelionWishes />}
        {open === "buddy" && <ComfortBuddy />}
        {open === "jars" && <FeelingsJars />}
        {open === "star" && <StarTrace />}
      </Screen>
    );
  }

  return (
    <Screen title="Games" subtitle="gentle places to land — no scores, no rush" bottomBar={<TaskBar />}>
      <View style={styles.grid}>
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} onPress={() => setOpen(g.id)} />
        ))}
      </View>
      <Text style={styles.privacy}>🔒 private, calm, and all on this device</Text>
    </Screen>
  );
}

function GameCard({ game, onPress }: { game: (typeof GAMES)[number]; onPress: () => void }) {
  const guarded = usePressGuard(onPress, 350);
  return (
    <ClayCard
      style={styles.gameCard}
      bg={hexWithAlpha(game.bg, 0.85)}
      onPress={guarded}
    >
      <Text style={styles.gameEmoji}>{game.emoji}</Text>
      <Text style={styles.gameName}>{game.name}</Text>
      <Text style={styles.gameLine}>{game.line}</Text>
    </ClayCard>
  );
}

/* ─── shared bits ──────────────────────────────────────────────────── */

function GameIntro({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={{ alignItems: "center", marginBottom: 14 }}>
      <Text style={styles.introEmoji}>{emoji}</Text>
      <Text style={styles.introTitle}>{title}</Text>
      <Text style={styles.introSub}>{sub}</Text>
    </View>
  );
}

/* ─── 1. Bubble Pop ────────────────────────────────────────────────── */

function BubblePop() {
  const [worries, setWorries] = React.useState<string[]>(
    () => [...WORRY_BUBBLES].sort(() => Math.random() - 0.5).slice(0, 6),
  );
  const [popped, setPopped] = React.useState<Set<number>>(new Set());
  const allDone = popped.size === worries.length;

  const pop = (i: number) => {
    if (popped.has(i)) return;
    const next = new Set(popped);
    next.add(i);
    setPopped(next);
  };
  const reset = usePressGuard(() => setPopped(new Set()), 400);

  return (
    <ClayCard style={{ alignItems: "center", marginTop: 6 }} bg={palette.surface}>
      <GameIntro
        emoji="🫧"
        title="Bubble Pop"
        sub="Each bubble holds a worry — tap it and watch it burst. Lighter, not forgotten."
      />
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
        <Text style={styles.doneLine}>look at that — lighter already 🕊️</Text>
      ) : (
        <Text style={styles.hint}>tap a bubble when you're ready to let that one go</Text>
      )}
      {allDone ? (
        <ClayButton label="Fill them again" color="cream" onPress={reset} style={{ marginTop: 14 }} />
      ) : null}
    </ClayCard>
  );
}

/* ─── 2. Breath Bubble ─────────────────────────────────────────────── */

const PHASES = [
  { label: "Inhale…", dur: 4000, scale: 1.45 },
  { label: "Hold…", dur: 4000, scale: 1.45 },
  { label: "Exhale…", dur: 6000, scale: 0.8 },
];

function BreathBubble() {
  const scale = React.useRef(new Animated.Value(1)).current;
  const [phaseIdx, setPhaseIdx] = React.useState(0);
  const [rounds, setRounds] = React.useState(0);
  const phase = PHASES[phaseIdx];

  React.useEffect(() => {
    const t = setTimeout(() => {
      setPhaseIdx((i) => {
        const next = (i + 1) % PHASES.length;
        if (next === 0) setRounds((r) => r + 1);
        return next;
      });
    }, phase.dur);
    Animated.timing(scale, {
      toValue: phase.scale,
      duration: phase.dur,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    return () => {
      clearTimeout(t);
      scale.stopAnimation();
    };
  }, [phaseIdx, phase.dur, phase.scale, scale]);

  return (
    <ClayCard style={{ alignItems: "center", marginTop: 6 }} bg={palette.surface}>
      <GameIntro
        emoji="🫧"
        title="Breath Bubble"
        sub="The bubble grows as you breathe in, floats while you hold, and softens as you let go."
      />
      <View style={styles.breathWrap}>
        <Animated.View style={[styles.bubble, { transform: [{ scale }] }]}>
          <Text style={styles.bubbleEmoji}>🫧</Text>
        </Animated.View>
      </View>
      <Text style={styles.phase}>{phase.label}</Text>
      <Text style={styles.count}>gentle rounds: {rounds}</Text>
      <Text style={styles.breathTip}>your little bear is breathing along with you 🐻</Text>
    </ClayCard>
  );
}

/* ─── 3. Dandelion Wishes (press & hold) ───────────────────────────── */

function DandelionWishes() {
  const [bursts, setBursts] = React.useState<number[]>([]);
  const [wishes, setWishes] = React.useState(0);
  const counter = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const spawn = () => {
    counter.current += 1;
    setBursts((b) => [...b.slice(-4), counter.current]);
    setWishes((w) => w + 1);
  };

  const start = () => {
    if (timer.current) return;
    spawn();
    timer.current = setInterval(spawn, 480);
  };

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  React.useEffect(() => () => stop(), []);

  return (
    <ClayCard style={{ alignItems: "center", marginTop: 6 }} bg={palette.surface}>
      <GameIntro
        emoji="🌼"
        title="Dandelion Wishes"
        sub="Press and hold to blow the seeds away — each one carries a little weight with it."
      />
      <View style={styles.dandelionWrap}>
        <Text style={styles.dandelion}>🌼</Text>
        {bursts.map((b) => (
          <SeedBurst key={b} />
        ))}
      </View>
      <Pressable
        onPressIn={start}
        onPressOut={stop}
        style={({ pressed }) => [styles.blowBtn, clayShadow(true), pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Text style={styles.blowBtnText}>🌬️ press & hold to blow</Text>
      </Pressable>
      <Text style={styles.wishLine}>
        {wishes} seed{wishes === 1 ? "" : "s"} sent to the wind — hold as long as you need
      </Text>
    </ClayCard>
  );
}

function SeedBurst() {
  // generated once per burst (lazy initializer — never during render)
  const [seeds] = React.useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 10 + Math.random() * 0.5,
      dist: 70 + Math.random() * 60,
      size: 10 + Math.random() * 14,
    })),
  );
  const pos = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(pos, {
      toValue: 1,
      duration: 1600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [pos]);

  return (
    <>
      {seeds.map((s, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.seed,
            {
              fontSize: s.size,
              opacity: pos.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.dist] }) },
                { translateY: pos.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.angle) * s.dist - 40] }) },
                { scale: pos.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) },
                { rotate: `${(s.angle * 2).toFixed(0)}deg` },
              ],
            },
          ]}
        >
          🌱
        </Animated.Text>
      ))}
    </>
  );
}

/* ─── 4. Comfort the Buddy ─────────────────────────────────────────── */

function ComfortBuddy() {
  const [comfort, setComfort] = React.useState(0);
  const calm = comfort >= 5;
  const shake = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (calm) {
      shake.stopAnimation();
      shake.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 170, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 170, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 130, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, shake]);

  const tap = usePressGuard(() => {
    if (!calm) setComfort((c) => Math.min(5, c + 1));
  }, 380);
  const hug = usePressGuard(() => {
    if (!calm) setComfort((c) => Math.min(5, c + 2));
  }, 480);
  const reset = usePressGuard(() => setComfort(0), 400);

  return (
    <ClayCard style={{ alignItems: "center", marginTop: 6 }} bg={palette.surface}>
      <GameIntro
        emoji="🧸"
        title="Comfort the Buddy"
        sub={calm ? "The buddy feels safe now. 🤍" : "The buddy is a little shaky — gentle taps and hugs help them settle."}
      />
      <View style={styles.buddyWrap}>
        <Animated.Text
          style={[
            styles.buddy,
            { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }) }] },
          ]}
        >
          {calm ? "🧸" : "🐻"}
        </Animated.Text>
        {calm ? <Hearts /> : null}
      </View>

      <View style={styles.progressRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i < comfort && { width: 20, backgroundColor: palette.lavenderDeep },
            ]}
          />
        ))}
      </View>
      <Text style={styles.buddyStatus}>
        {calm ? "fully at ease" : "feeling a little steadier, slowly"}
      </Text>

      <View style={styles.buddyActions}>
        <ClayButton label="🤍 gentle tap" color="primary" onPress={tap} disabled={calm} />
        <ClayButton label="🫂 a hug" color="blush" onPress={hug} disabled={calm} />
      </View>
      {calm ? (
        <ClayButton label="start again with a new shaky friend" color="ghost" onPress={reset} textStyle={{ color: palette.inkSoft }} style={{ marginTop: 12 }} />
      ) : null}
    </ClayCard>
  );
}

function Hearts() {
  const [hearts] = React.useState(() => [
    { emoji: "💗", dx: -46, delay: 0 },
    { emoji: "✨", dx: 0, delay: 600 },
    { emoji: "💛", dx: 46, delay: 1200 },
  ]);
  return (
    <>
      {hearts.map((h, i) => (
        <FloatingHeart key={i} emoji={h.emoji} dx={h.dx} delay={h.delay} />
      ))}
    </>
  );
}

function FloatingHeart({ emoji, dx, delay }: { emoji: string; dx: number; delay: number }) {
  const y = React.useRef(new Animated.Value(0)).current;
  const o = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(o, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 2, duration: 1300, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(o, { toValue: 0, duration: 1300, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y, o, delay]);

  return (
    <Animated.Text
      style={[
        styles.heart,
        {
          left: 140 + dx,
          opacity: o,
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -34, -64] }) }, { scale: o }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

/* ─── 5. Feelings Jars ─────────────────────────────────────────────── */

const JARS = [
  { id: "sad", label: "Sad", color: palette.sky },
  { id: "angry", label: "Angry", color: palette.blush },
  { id: "happy", label: "Happy", color: palette.peach },
  { id: "tired", label: "Tired", color: palette.lavender },
];

const FLOATERS = [
  { id: "f1", emoji: "😢", jar: "sad" },
  { id: "f2", emoji: "😠", jar: "angry" },
  { id: "f3", emoji: "😊", jar: "happy" },
  { id: "f4", emoji: "😴", jar: "tired" },
  { id: "f5", emoji: "🥺", jar: "sad" },
  { id: "f6", emoji: "😤", jar: "angry" },
];

function FeelingsJars() {
  const [placed, setPlaced] = React.useState<Record<string, boolean>>({});
  const allDone = FLOATERS.every((f) => placed[f.id]);

  const reset = usePressGuard(() => setPlaced({}), 400);

  return (
    <ClayCard style={{ alignItems: "center", marginTop: 6 }} bg={palette.surface}>
      <GameIntro
        emoji="🫙"
        title="Feelings Jars"
        sub="Tap a floating feeling and it drifts into its own soft jar. No rush."
      />

      <View style={styles.floatArea}>
        {FLOATERS.filter((f) => !placed[f.id]).map((f, i) => (
          <Floater key={f.id} emoji={f.emoji} delay={i * 300} onPress={() => setPlaced((p) => (p[f.id] ? p : { ...p, [f.id]: true }))} />
        ))}
        {allDone ? <Text style={styles.jarsDone}>all your feelings are tucked in 💗</Text> : null}
      </View>

      <View style={styles.jarRow}>
        {JARS.map((jar) => {
          const contents = FLOATERS.filter((f) => f.jar === jar.id && placed[f.id]);
          return (
            <View key={jar.id} style={styles.jarCol}>
              <View style={[styles.jar, { backgroundColor: hexWithAlpha(jar.color, 0.6) }]}>
                {contents.map((f) => (
                  <Text key={f.id} style={styles.jarEmoji}>{f.emoji}</Text>
                ))}
              </View>
              <Text style={styles.jarLabel}>{jar.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 16 }}>
        {allDone ? (
          <ClayButton label="let them float again" color="cream" onPress={reset} />
        ) : (
          <Text style={styles.hint}>
            {FLOATERS.length - Object.keys(placed).length} feeling{FLOATERS.length - Object.keys(placed).length === 1 ? "" : "s"} still floating
          </Text>
        )}
      </View>
    </ClayCard>
  );
}

function Floater({ emoji, delay, onPress }: { emoji: string; delay: number; onPress: () => void }) {
  const bob = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, delay]);

  const guarded = usePressGuard(onPress, 350);
  return (
    <Pressable onPress={guarded} style={styles.floater}>
      <Animated.Text style={[styles.floaterEmoji, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }]}>
        {emoji}
      </Animated.Text>
    </Pressable>
  );
}

/* ─── 6. Star Trace ────────────────────────────────────────────────── */

// 10 points of a soft five-pointed star (outer + inner radii), as percents.
const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 === 0 ? 42 : 17;
  return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r };
});

function StarTrace() {
  const [lit, setLit] = React.useState<Set<number>>(new Set());
  const [dims, setDims] = React.useState({ w: 0, h: 0 });
  const complete = lit.size >= STAR_POINTS.length;
  const reset = usePressGuard(() => setLit(new Set()), 400);

  // The responder is created once, so the handler it calls must always be the
  // latest one (dims/complete change after mount) — hence the ref indirection.
  const touchRef = React.useRef<(x: number, y: number) => void>(() => undefined);
  touchRef.current = (x, y) => {
    if (complete || dims.w === 0 || dims.h === 0) return;
    const px = (x / dims.w) * 100;
    const py = (y / dims.h) * 100;
    setLit((prev) => {
      let changed = false;
      const next = new Set(prev);
      STAR_POINTS.forEach((p, i) => {
        if (!next.has(i) && Math.hypot(p.x - px, p.y - py) < 17) {
          next.add(i);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => touchRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => touchRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
    }),
  ).current;

  return (
    <ClayCard style={{ alignItems: "center", marginTop: 6 }} bg={palette.surface}>
      <GameIntro
        emoji="⭐"
        title="Star Trace"
        sub="Slowly trace the glowing star with your finger — the light follows you."
      />
      <View
        style={styles.starBox}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setDims({ w: width, h: height });
        }}
        {...pan.panHandlers}
      >
        <Svg viewBox="0 0 100 100" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Polygon
            points={STAR_POINTS.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={complete ? "rgba(255,214,150,0.25)" : "none"}
            stroke={complete ? "#f0b96a" : "#e2d5f5"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </Svg>
        {STAR_POINTS.map((p, i) => (
          <View
            key={i}
            style={[
              styles.starDot,
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: lit.has(i) ? palette.mintDeep : palette.lavender,
                ...(lit.has(i) ? { shadowColor: palette.mintDeep, shadowOpacity: 0.55, shadowRadius: 8, elevation: 4 } : {}),
              },
            ]}
          />
        ))}
        {complete ? (
          <Text style={styles.starDone}>a full, steady star — tracing it slowed your mind ✨</Text>
        ) : null}
      </View>
      <View style={{ marginTop: 18 }}>
        {complete ? (
          <ClayButton label="trace another star" color="cream" onPress={reset} />
        ) : (
          <Text style={styles.hint}>
            {STAR_POINTS.length - lit.size} star-light{STAR_POINTS.length - lit.size === 1 ? "" : "s"} to light — go slowly
          </Text>
        )}
      </View>
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  gameCard: { width: "48%", alignItems: "center", paddingVertical: 18 },
  gameEmoji: { fontSize: 28 },
  gameName: { marginTop: 6, fontSize: 14, fontWeight: "800", color: palette.ink, textAlign: "center" },
  gameLine: { marginTop: 3, fontSize: 10.5, color: palette.inkSoft, textAlign: "center", lineHeight: 15 },
  privacy: { marginTop: 22, textAlign: "center", fontSize: 11.5, color: palette.inkSoft, fontWeight: "600" },
  introEmoji: { fontSize: 40 },
  introTitle: { marginTop: 6, fontSize: 17, fontWeight: "800", color: palette.ink, textAlign: "center" },
  introSub: { marginTop: 5, fontSize: 12.5, color: palette.inkSoft, textAlign: "center", lineHeight: 18 },
  worryRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  worryBubble: {
    backgroundColor: hexWithAlpha(palette.blush, 0.7),
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...clayShadow(false),
  },
  worryText: { fontSize: 13, fontWeight: "700", color: palette.ink, textAlign: "center" },
  hint: { textAlign: "center", marginTop: 16, fontSize: 12, color: palette.inkFaint, fontStyle: "italic" },
  doneLine: { marginTop: 16, fontSize: 13.5, fontWeight: "700", color: palette.ink, textAlign: "center" },
  breathWrap: { alignItems: "center", justifyContent: "center", height: 240 },
  bubble: {
    width: 150,
    height: 150,
    borderRadius: radius.full,
    backgroundColor: hexWithAlpha(palette.mint, 0.85),
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleEmoji: { fontSize: 52 },
  phase: { textAlign: "center", fontSize: 18, fontWeight: "800", color: palette.ink },
  count: { textAlign: "center", fontSize: 13, color: palette.inkSoft, marginTop: 6 },
  breathTip: { marginTop: 14, fontSize: 12.5, color: palette.inkSoft, textAlign: "center", lineHeight: 18 },
  dandelionWrap: { alignItems: "center", justifyContent: "center", height: 260, width: "100%" },
  dandelion: { fontSize: 88 },
  blowBtn: {
    backgroundColor: palette.surface,
    borderRadius: radius.full,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  blowBtnText: { fontSize: 14.5, fontWeight: "800", color: palette.ink },
  wishLine: { marginTop: 12, fontSize: 12.5, color: palette.inkSoft, textAlign: "center", lineHeight: 18 },
  seed: { position: "absolute", color: palette.mintDeep },
  buddyWrap: { alignItems: "center", justifyContent: "center", height: 200, width: "100%" },
  buddy: { fontSize: 96 },
  heart: { position: "absolute", top: 70, fontSize: 22 },
  progressRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.lavender },
  buddyStatus: { marginTop: 8, fontSize: 12, color: palette.inkSoft, fontWeight: "600" },
  buddyActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  floatArea: { minHeight: 96, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 18 },
  floater: { padding: 4 },
  floaterEmoji: { fontSize: 34 },
  jarsDone: { fontSize: 13.5, fontWeight: "700", color: palette.mintDeep },
  jarRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 20, width: "100%" },
  jarCol: { flex: 1, alignItems: "center", gap: 6 },
  jar: {
    width: "100%",
    minHeight: 92,
    borderRadius: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
    gap: 4,
    borderWidth: 2,
    borderColor: "rgba(74,68,88,0.1)",
  },
  jarEmoji: { fontSize: 20 },
  jarLabel: { fontSize: 10, fontWeight: "700", color: palette.inkSoft },
  starBox: { width: "100%", height: 280, marginTop: 8, alignItems: "center", justifyContent: "center" },
  starDot: {
    position: "absolute",
    width: 15,
    height: 15,
    marginLeft: -7.5,
    marginTop: -7.5,
    borderRadius: 7.5,
  },
  starDone: { position: "absolute", bottom: 0, fontSize: 13.5, fontWeight: "700", color: palette.mintDeep, textAlign: "center" },
});
