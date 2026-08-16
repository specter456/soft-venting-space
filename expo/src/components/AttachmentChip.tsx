import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { clayShadow, palette, radius, TILE_BGS } from "../theme";
import { hexWithAlpha } from "./Clay";
import { playSoftChime } from "../sound";
import type { Attachment } from "../types";

/**
 * Small rounded attachment chip: audio shows a mini waveform + play,
 * video/photo show a soft thumbnail tile. Attachments are always optional —
 * notes and recordings each stand alone.
 */
export function AttachmentChip({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "audio") {
    return <AudioChip attachment={attachment} />;
  }
  const bg = TILE_BGS["tile-lavender"] ?? palette.lavender;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={styles.art}>{attachment.art}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {attachment.label}
      </Text>
      {attachment.kind === "video" ? <Text style={styles.badge}>▶</Text> : null}
    </View>
  );
}

function AudioChip({ attachment }: { attachment: Attachment }) {
  const [playing, setPlaying] = React.useState(false);

  const play = async () => {
    if (playing) return;
    if (attachment.fileUri) {
      try {
        setPlaying(true);
        const { sound } = await Audio.Sound.createAsync({ uri: attachment.fileUri }, { volume: 0.8 });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) {
            setPlaying(false);
            sound.unloadAsync().catch(() => undefined);
          }
        });
      } catch {
        setPlaying(false);
      }
    } else {
      // simulated recording — play the soft local chime instead
      setPlaying(true);
      await playSoftChime();
      setTimeout(() => setPlaying(false), 800);
    }
  };

  return (
    <Pressable onPress={play} style={({ pressed }) => [styles.chip, styles.audio, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.playBtn, clayShadow(false)]}>
        <Text style={styles.playText}>{playing ? "…" : "▶"}</Text>
      </View>
      <View style={styles.wave}>
        {[0.4, 0.7, 0.5, 0.9, 0.6, 1.0, 0.45, 0.75, 0.5, 0.85, 0.4, 0.6].map((h, i) => (
          <View key={i} style={[styles.waveBar, { height: 10 * h, opacity: playing ? 1 : 0.7 }]} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>
          {attachment.label}
        </Text>
        {attachment.duration ? (
          <Text style={styles.duration}>{Math.round(attachment.duration)}s</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
    minWidth: 120,
  },
  audio: {
    backgroundColor: hexWithAlpha(palette.lavender, 0.5),
    minWidth: 190,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  playText: {
    fontSize: 12,
    color: palette.ink,
    fontWeight: "700",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 16,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: palette.lavenderDeep,
  },
  art: {
    fontSize: 20,
  },
  label: {
    fontSize: 12.5,
    color: palette.ink,
    fontWeight: "600",
    flexShrink: 1,
  },
  duration: {
    fontSize: 11,
    color: palette.inkSoft,
  },
  badge: {
    fontSize: 10,
    color: palette.ink,
  },
});
