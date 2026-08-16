import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { ClayButton, ClayCard } from "../components/Clay";
import { AttachmentChip } from "../components/AttachmentChip";
import { MoodTag } from "../components/MoodChips";
import { useTable } from "../db";
import { palette } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { Note } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Notes">;

/** Private reflection journal — notes can stand alone; recordings too. */
export default function NotesScreen({ navigation }: Props) {
  const notes = useTable<Note>("notes");

  return (
    <Screen
      title="Notes & Reflections"
      subtitle="Your private journal"
      footer={
        <ClayButton
          label="✍️ New reflection"
          color="primary"
          size="lg"
          onPress={() => navigation.navigate("NoteEditor", {})}
        />
      }
    >
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🪶</Text>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptyBody}>
            Write a reflection, or attach a voice or video vent. Attachments are always optional — a
            note can be just words, and a recording can exist on its own.
          </Text>
        </View>
      ) : (
        notes.map((note) => (
          <ClayCard
            key={note.id}
            style={{ marginBottom: 12 }}
            bg={palette.surface}
            onPress={() => navigation.navigate("NoteEditor", { noteId: note.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.date}>
                {new Date(note.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
              <MoodTag mood={note.mood} small />
            </View>
            <Text style={styles.body} numberOfLines={4}>
              {note.body || "…"}
            </Text>
            {note.attachments.length > 0 ? (
              <View style={styles.attachments}>
                {note.attachments.map((a, i) => (
                  <AttachmentChip key={i} attachment={a} />
                ))}
              </View>
            ) : (
              <Text style={styles.noAttach}>no attachments — just words, and that's enough</Text>
            )}
          </ClayCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "800", color: palette.ink },
  emptyBody: {
    marginTop: 8,
    fontSize: 13,
    color: palette.inkSoft,
    textAlign: "center",
    lineHeight: 19,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  date: { fontSize: 12, color: palette.inkSoft, fontWeight: "600" },
  body: { fontSize: 14.5, color: palette.ink, lineHeight: 21 },
  attachments: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  noAttach: {
    marginTop: 10,
    fontSize: 11.5,
    fontStyle: "italic",
    color: palette.inkFaint,
  },
});
