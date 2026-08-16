import React from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import { ClayButton, ClayChip, hexWithAlpha } from "../components/Clay";
import { GIFT_STAMPS } from "../data";
import { createVaultItem } from "../db";
import { palette, radius, TILE_BGS } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { GifFrame, GifStamp } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "GifStudio">;

/**
 * Doodle & GIF studio: a pastel base (photo scene or video-vent avatar),
 * tap to stamp feelings, add a word, build a few frames, then watch the
 * soft loop. Everything is saved privately into the vault.
 */
export default function GifStudioScreen({ navigation, route }: Props) {
  const baseArt = route.params?.baseArt ?? "🐻";
  const baseBg = route.params?.baseBg ?? "tile-lavender";

  const [frames, setFrames] = React.useState<GifFrame[]>([{ stamps: [] }]);
  const [frameIndex, setFrameIndex] = React.useState(0);
  const [stamp, setStamp] = React.useState(GIFT_STAMPS[0]);
  const [text, setText] = React.useState("");
  const [playing, setPlaying] = React.useState(false);
  const [stageSize, setStageSize] = React.useState({ w: 320, h: 320 });
  const anim = React.useRef(new Animated.Value(0)).current;

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStageSize((prev) =>
      Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2 ? prev : { w: width, h: height },
    );
  };

  const addStampAt = (x: number, y: number) => {
    setFrames((prev) => {
      const next = [...prev];
      next[frameIndex] = {
        ...next[frameIndex],
        stamps: [
          ...next[frameIndex].stamps,
          {
            emoji: stamp,
            x: Math.max(0.06, Math.min(0.94, x / stageSize.w)),
            y: Math.max(0.08, Math.min(0.9, y / stageSize.h)),
            size: 1,
          },
        ],
      };
      return next;
    });
  };

  const setFrameText = (t: string) => {
    setText(t);
    setFrames((prev) => {
      const next = [...prev];
      next[frameIndex] = { ...next[frameIndex], text: t || undefined };
      return next;
    });
  };

  const addFrame = () => {
    setFrames((prev) => [...prev, { stamps: [] }]);
    setFrameIndex(frames.length);
    setText("");
  };

  const removeFrame = (i: number) => {
    if (frames.length <= 1) return;
    setFrames((prev) => prev.filter((_, idx) => idx !== i));
    setFrameIndex((prev) => Math.max(0, Math.min(prev, frames.length - 2)));
  };

  const play = () => {
    if (playing || frames.length < 2) return;
    setPlaying(true);
    anim.setValue(0);
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
    ).start(({ finished }) => {
      if (finished) setPlaying(false);
    });
  };

  const stop = () => {
    anim.stopAnimation();
    setPlaying(false);
  };

  const save = () => {
    createVaultItem({
      kind: "gif",
      art: baseArt,
      bg: baseBg,
      caption: "made GIF",
      frames: frames.map((f) => ({ stamps: f.stamps, text: f.text })),
    });
    navigation.goBack();
  };

  const frame = frames[frameIndex] ?? { stamps: [] };

  return (
    <Screen title="GIF Studio" subtitle="Doodle, stamp, and make it move">
      {/* stage */}
      <View
        onLayout={onStageLayout}
        style={[styles.stage, { backgroundColor: TILE_BGS[baseBg] ?? palette.lavender }]}
      >
        {playing ? (
          <Animated.View style={styles.stageFill}>
            {frames.map((f, i) => {
              const start = i / frames.length;
              const end = (i + 1) / frames.length;
              return (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.stageFill,
                    {
                      opacity: anim.interpolate({
                        inputRange: [start, Math.min(1, start + 0.02), end - 0.02, end],
                        outputRange: [0, 1, 1, 0],
                      }),
                    },
                  ]}
                >
                  <FrameArt baseArt={baseArt} frame={f} />
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : (
          <FrameArt baseArt={baseArt} frame={frame} />
        )}

        {!playing && frames.length > 1 ? (
          <Pressable onPress={play} style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶ play GIF</Text>
          </Pressable>
        ) : null}
        {playing ? (
          <Pressable onPress={stop} style={styles.playBadge}>
            <Text style={styles.playBadgeText}>■ stop</Text>
          </Pressable>
        ) : null}

        {/* tap zone for stamping */}
        <Pressable
          style={styles.stampZone}
          onPress={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            addStampAt(locationX, locationY);
          }}
          accessibilityLabel="Tap to stamp"
        />
        <View pointerEvents="none" style={styles.frameHint}>
          <Text style={styles.frameHintText}>
            frame {frameIndex + 1} of {frames.length} · tap the stage to stamp
          </Text>
        </View>
      </View>

      {/* stamps */}
      <View style={styles.stampRow}>
        {GIFT_STAMPS.map((s) => (
          <ClayChip key={s} label={s} selected={stamp === s} onPress={() => setStamp(s)} bg={palette.lavender} />
        ))}
      </View>

      <TextInput
        value={text}
        onChangeText={setFrameText}
        placeholder="Add a word to this frame (optional)"
        placeholderTextColor={palette.inkFaint}
        autoCorrect={false}
        spellCheck={false}
        style={styles.textInput}
      />

      {/* frames */}
      <View style={styles.frameRow}>
        {frames.map((f, i) => (
          <View key={i} style={[styles.frameThumb, { backgroundColor: frameIndex === i ? TILE_BGS[baseBg] : palette.cream, borderColor: frameIndex === i ? palette.lavenderDeep : palette.lavender }]}>
            <Pressable style={styles.frameThumbPress} onPress={() => setFrameIndex(i)}>
              <Text style={styles.frameThumbText}>{baseArt}</Text>
              <Text style={styles.frameThumbNum}>{i + 1}</Text>
            </Pressable>
            {frames.length > 1 ? (
              <Pressable onPress={() => removeFrame(i)} style={styles.frameX} accessibilityLabel="Remove frame">
                <Text style={styles.frameXText}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable onPress={addFrame} style={[styles.frameThumb, styles.addFrame]}>
          <Text style={styles.addFrameText}>+</Text>
        </Pressable>
      </View>

      <ClayButton label="🔒 Save GIF privately" color="primary" size="lg" onPress={save} style={{ marginTop: 16 }} />
    </Screen>
  );
}

function FrameArt({ baseArt, frame }: { baseArt: string; frame: GifFrame }) {
  return (
    <View style={styles.stageFill} pointerEvents="none">
      <Text style={styles.baseArt}>{baseArt}</Text>
      {frame.text ? <Text style={styles.frameText}>{frame.text}</Text> : null}
      {frame.stamps.map((s: GifStamp, i: number) => (
        <Text
          key={i}
          style={[
            styles.stamp,
            { left: `${s.x * 100}%`, top: `${s.y * 100}%`, fontSize: 20 + s.size * 16 },
          ]}
        >
          {s.emoji}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  stageFill: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  baseArt: { fontSize: 88 },
  frameText: {
    position: "absolute",
    bottom: 34,
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink,
    fontStyle: "italic",
    backgroundColor: hexWithAlpha(palette.surface, 0.85),
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  stamp: { position: "absolute" },
  stampZone: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  playBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: palette.surface,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  playBadgeText: { fontSize: 12, fontWeight: "800", color: palette.ink },
  frameHint: {
    position: "absolute",
    bottom: 8,
    backgroundColor: hexWithAlpha(palette.surface, 0.8),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  frameHintText: { fontSize: 10.5, color: palette.inkSoft, fontWeight: "600" },
  stampRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14, justifyContent: "center" },
  textInput: {
    marginTop: 12,
    backgroundColor: palette.cream,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: palette.ink,
    borderWidth: 1.5,
    borderColor: palette.lavender,
  },
  frameRow: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" },
  frameThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  frameThumbPress: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },
  frameThumbText: { fontSize: 22 },
  frameThumbNum: { position: "absolute", bottom: 3, fontSize: 10, color: palette.inkSoft, fontWeight: "700" },
  frameX: { position: "absolute", top: 2, right: 4, backgroundColor: hexWithAlpha(palette.surface, 0.9), borderRadius: 8, padding: 1 },
  frameXText: { fontSize: 12, color: palette.inkSoft },
  addFrame: { backgroundColor: palette.cream, borderStyle: "dashed" },
  addFrameText: { fontSize: 24, color: palette.inkSoft },
});
