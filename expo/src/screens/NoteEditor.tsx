import React from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { ClayButton, ClayCard, ClayChip } from "../components/Clay";
import { MoodChips } from "../components/MoodChips";
import { AttachmentChip } from "../components/AttachmentChip";
import { PHOTO_SCENES } from "../data";
import { createNote, updateNote, useTable } from "../db";
import type { Attachment } from "../types";
import { palette, radius, TILE_BGS } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { Note, Recording } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "NoteEditor">;

/**
 * Cozy note editor. Attachments are strictly optional: pick a pastel scene
 * (or leave it word-only). If opened from the Recording Box with a
 * recordingId, that vent is attached automatically.
 */
export default function NoteEditorScreen({ navigation, route }: Props) {
  const recordings = useTable<Recording>("recordings");
  const notes = useTable<Note>("notes");
  const editing = route.params?.noteId
    ? notes.find((n) => n.id === route.params?.noteId)
    : undefined;

  const [body, setBody] = React.useState(editing?.body ?? "");
  const [mood, setMood] = React.useState<string | undefined>(editing?.mood);
  const [attachments, setAttachments] = React.useState<Attachment[]>(editing?.attachments ?? []);
  const [picker, setPicker] = React.useState<"none" | "recordings" | "photos">(
    route.params?.recordingId ? "none" : "none",
  );

  // Attach the recording passed from the Recording Box
  React.useEffect(() => {
    if (route.params?.recordingId) {
      const rec = recordings.find((r) => r.id === route.params?.recordingId);
      if (rec) {
        setAttachments((prev) => [
          ...prev.filter((a) => a.fileUri !== rec.fileUri),
          {
            kind: rec.kind === "voice" ? "audio" : "video",
            label: rec.kind === "voice" ? "Voice vent" : "Video vent",
            duration: rec.duration,
            art: rec.kind === "voice" ? "🎙️" : (rec.avatar ?? "🎥"),
            fileUri: rec.fileUri,
          },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    if (editing) {
      updateNote({ ...editing, body: body.trim(), mood, attachments });
    } else {
      createNote({ body: body.trim(), mood, attachments });
    }
    navigation.goBack();
  };

  const attachRecording = (rec: Recording) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.fileUri !== rec.fileUri),
      {
        kind: rec.kind === "voice" ? "audio" : "video",
        label: rec.kind === "voice" ? "Voice vent" : "Video vent",
        duration: rec.duration,
        art: rec.kind === "voice" ? "🎙️" : (rec.avatar ?? "🎥"),
        fileUri: rec.fileUri,
      },
    ]);
    setPicker("none");
  };

  const attachScene = (scene: (typeof PHOTO_SCENES)[number]) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.art !== scene.emoji),
      { kind: "photo", label: scene.label, art: scene.emoji },
    ]);
    setPicker("none");
  };

  const detach = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Screen title={editing ? "Edit reflection" : "New reflection"} subtitle="Write freely — it's just for you">
      <ClayCard bg={palette.surface}>
        <Text style={styles.label}>How are you feeling? (optional)</Text>
        <MoodChips value={mood} onChange={setMood} />

        <Text style={[styles.label, { marginTop: 18 }]}>Your reflection</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Let it out — a sentence, a page, or a single word…"
          placeholderTextColor={palette.inkFaint}
          multiline
          style={styles.input}
        />
      </ClayCard>

      <ClayCard bg={palette.surface} style={{ marginTop: 14 }}>
        <Text style={styles.label}>Attachments (optional)</Text>
        <Text style={styles.hint}>A note is complete on its own. Add a vent or a photo if you like.</Text>

        {attachments.length > 0 ? (
          <View style={styles.attachments}>
            {attachments.map((a, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <AttachmentChip attachment={a} />
                <ClayButton label="✕" color="ghost" size="sm" onPress={() => detach(i)} textStyle={{ color: palette.inkSoft }} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noAttach}>none yet — words only is perfectly fine</Text>
        )}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <ClayButton
            label="🎙️ Voice vent"
            color={picker === "recordings" ? "primary" : "cream"}
            size="sm"
            onPress={() => setPicker(picker === "recordings" ? "none" : "recordings")}
          />
          <ClayButton
            label="🌅 Photo"
            color={picker === "photos" ? "primary" : "cream"}
            size="sm"
            onPress={() => setPicker(picker === "photos" ? "none" : "photos")}
          />
        </View>

        {picker === "recordings" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {recordings.map((rec) => (
              <ClayChip
                key={rec.id}
                label={`${rec.kind === "voice" ? "🎙️" : "🎥"} ${Math.floor(rec.duration / 60)}:${String(rec.duration % 60).padStart(2, "0")} · ${new Date(rec.at).toLocaleDateString()}`}
                onPress={() => attachRecording(rec)}
                bg={palette.lavender}
              />
            ))}
            {recordings.length === 0 ? (
              <Text style={styles.noAttach}>no vents saved yet — record one first</Text>
            ) : null}
          </ScrollView>
        ) : null}

        {picker === "photos" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {PHOTO_SCENES.map((scene) => (
              <ClayChip
                key={scene.emoji}
                label={`${scene.emoji} ${scene.label}`}
                onPress={() => attachScene(scene)}
                bg={TILE_BGS[scene.bg]}
              />
            ))}
          </ScrollView>
        ) : null}
      </ClayCard>

      <ClayButton
        label="🔒 Save privately"
        color="primary"
        size="lg"
        onPress={save}
        style={{ marginTop: 18 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13.5, fontWeight: "800", color: palette.ink, marginBottom: 10 },
  hint: { fontSize: 12, color: palette.inkSoft, marginBottom: 12 },
  input: {
    backgroundColor: palette.cream,
    borderRadius: radius.md,
    padding: 14,
    minHeight: 150,
    fontSize: 15,
    color: palette.ink,
    borderWidth: 1.5,
    borderColor: palette.lavender,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  attachments: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  noAttach: { fontSize: 12, fontStyle: "italic", color: palette.inkFaint },
});
