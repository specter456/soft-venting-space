import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MOODS } from "../data";
import { MOOD_COLORS, palette } from "../theme";
import { ClayChip } from "./Clay";

/** Horizontal scrollable row of mood tags (used on record, notes, diary…). */
export function MoodChips({
  value,
  onChange,
}: {
  value?: string;
  onChange: (mood: string | undefined) => void;
}) {
  return (
    <View style={styles.row}>
      {MOODS.map((m) => (
        <ClayChip
          key={m.id}
          label={`${m.emoji} ${m.label}`}
          selected={value === m.id}
          onPress={() => onChange(value === m.id ? undefined : m.id)}
          bg={MOOD_COLORS[m.id]}
        />
      ))}
    </View>
  );
}

export function MoodTag({ mood, small }: { mood?: string; small?: boolean }) {
  if (!mood) return null;
  const def = MOODS.find((m) => m.id === mood);
  if (!def) return null;
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: MOOD_COLORS[mood] },
        small && { paddingHorizontal: 8, paddingVertical: 3 },
      ]}
    >
      <Text style={[styles.tagText, small && { fontSize: 10 }]}>
        {def.emoji} {def.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: palette.lavender,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.ink,
  },
});
