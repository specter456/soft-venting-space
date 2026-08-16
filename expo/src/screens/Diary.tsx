import React from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import { TaskBar } from "../components/TaskBar";
import { ClayButton, ClayCard, ClayChip, hexWithAlpha } from "../components/Clay";
import { AttachmentChip } from "../components/AttachmentChip";
import { MoodTag } from "../components/MoodChips";
import {
  DIARY_COVER_COLORS,
  DIARY_EMBLEMS,
  DIARY_STICKERS,
  DIARY_WEATHER,
  moodById,
} from "../data";
import { attachRecordingToDiary, createDiaryEntry, getKvFromCache, setKv, useTable } from "../db";
import { KV_DIARY_COVER } from "../db";
import { playPageTurn } from "../sound";
import { palette, radius, clayShadow } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { Attachment, DiaryEntry, Recording } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Diary">;

interface Cover {
  color: string;
  emblem: string;
}

function loadCover(): Cover {
  try {
    const raw = getKvFromCache(KV_DIARY_COVER);
    if (raw) return JSON.parse(raw) as Cover;
  } catch {
    /* fall through */
  }
  return { color: DIARY_COVER_COLORS[0], emblem: DIARY_EMBLEMS[0] };
}

export default function DiaryScreen({ navigation, route }: Props) {
  const entries = useTable<DiaryEntry>("diaryEntries");
  const recordings = useTable<Recording>("recordings");
  const [view, setView] = React.useState<"cover" | "pages" | "editor">("cover");
  const [cover, setCover] = React.useState<Cover>(loadCover);
  const [draftAttach, setDraftAttach] = React.useState<Attachment | undefined>();

  // If opened with a recording to attach, jump straight into the editor.
  React.useEffect(() => {
    if (route.params?.attachRecording) {
      const rec = recordings.find((r) => r.id === route.params?.attachRecording);
      if (rec) {
        setDraftAttach({
          kind: rec.kind === "voice" ? "audio" : "video",
          label: rec.kind === "voice" ? "Voice vent" : "Video vent",
          duration: rec.duration,
          art: rec.kind === "voice" ? "🎙️" : (rec.avatar ?? "🎥"),
          fileUri: rec.fileUri,
        });
      }
      setView("editor");
      navigation.setParams({ attachRecording: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCover = () => {
    void setKv(KV_DIARY_COVER, JSON.stringify(cover));
    setView("pages");
  };

  if (view === "cover") {
    return (
      <Screen title="Diary" subtitle="Make it yours — it's only for you" bottomBar={<TaskBar />}>
        <View style={styles.coverWrap}>
          <View style={[styles.bookCover, { backgroundColor: cover.color }, clayShadow(true)]}>
            <Text style={styles.bookEmblem}>{cover.emblem}</Text>
            <Text style={styles.bookTitle}>My Diary</Text>
            <Text style={styles.bookSub}>a tiny safe room in your pocket</Text>
            <View style={styles.bookBand} />
          </View>
        </View>

        <Text style={styles.label}>Cover color</Text>
        <View style={styles.swatchRow}>
          {DIARY_COVER_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCover((prev) => ({ ...prev, color: c }))}
              style={[styles.swatch, { backgroundColor: c }, cover.color === c && styles.swatchSelected]}
            />
          ))}
        </View>

        <Text style={styles.label}>Emblem</Text>
        <View style={styles.emblemsRow}>
          {DIARY_EMBLEMS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setCover((prev) => ({ ...prev, emblem: e }))}
              style={[styles.emblem, { backgroundColor: cover.emblem === e ? palette.lavender : palette.surface }]}
            >
              <Text style={{ fontSize: 20 }}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <ClayButton
          label={entries.length === 0 ? "📖 Open my diary" : `📖 Open diary (${entries.length} entries)`}
          color="primary"
          size="lg"
          onPress={saveCover}
          style={{ marginTop: 22 }}
        />
      </Screen>
    );
  }

  if (view === "editor") {
    return (
      <DiaryEditor
        cover={cover}
        draftAttach={draftAttach}
        onDone={() => {
          setDraftAttach(undefined);
          setView("pages");
        }}
      />
    );
  }

  const pages: React.ReactNode[] = [
    <TitlePage key="title" cover={cover} entries={entries.length} />,
    ...entries.map((e) => <EntryPage key={e.id} entry={e} />),
  ];

  return (
    <Screen
      title="Diary"
      subtitle={`${entries.length} ${entries.length === 1 ? "page" : "pages"} · all yours`}
      onBack={() => setView("cover")}
      bottomBar={<TaskBar />}
      footer={
        <ClayButton label="✍️ New entry" color="primary" size="lg" onPress={() => setView("editor")} />
      }
    >
      <PageFlip pages={pages} onTurn={() => void playPageTurn()} />
      <Text style={styles.flipHint}>tap the page corners to turn — with a soft little swish</Text>
    </Screen>
  );
}

/* ─── Page turn book ───────────────────────────────────────────────── */

function PageFlip({ pages, onTurn }: { pages: React.ReactNode[]; onTurn?: (i: number) => void }) {
  const [index, setIndex] = React.useState(0);
  const anim = React.useRef(new Animated.Value(0)).current;
  const [flipping, setFlipping] = React.useState(false);

  const flip = (dir: 1 | -1) => {
    const target = index + dir;
    if (flipping || target < 0 || target >= pages.length) return;
    setFlipping(true);
    anim.setValue(0);
    onTurn?.(target);
    Animated.timing(anim, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) {
          setIndex(target);
          anim.setValue(0);
          setFlipping(false);
        }
      },
    );
  };

  const current = pages[index];
  const incoming = pages[index + 1] ?? null;

  return (
    <View style={styles.book}>
      <Animated.View
        style={[
          styles.page,
          {
            transform: [
              { perspective: 1200 },
              {
                rotateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "-180deg"],
                }),
              },
            ],
          },
        ]}
      >
        {current}
      </Animated.View>
      {incoming ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.page,
            styles.incoming,
            { opacity: anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0, 1] }) },
          ]}
        >
          {incoming}
        </Animated.View>
      ) : null}
      <View style={styles.turnZoneLeft}>
        <Pressable
          onPress={() => flip(-1)}
          disabled={index === 0 || flipping}
          style={styles.turnHit}
          accessibilityLabel="Previous page"
        >
          <Text style={[styles.turnArrow, { opacity: index === 0 ? 0.2 : 1 }]}>‹</Text>
        </Pressable>
      </View>
      <View style={styles.turnZoneRight}>
        <Pressable
          onPress={() => flip(1)}
          disabled={index >= pages.length - 1 || flipping}
          style={styles.turnHit}
          accessibilityLabel="Next page"
        >
          <Text style={[styles.turnArrow, { opacity: index >= pages.length - 1 ? 0.2 : 1 }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.pageNum}>
        <Text style={styles.pageNumText}>
          {index + 1} / {pages.length}
        </Text>
      </View>
    </View>
  );
}

/* ─── Pages ────────────────────────────────────────────────────────── */

function TitlePage({ cover, entries }: { cover: Cover; entries: number }) {
  return (
    <View style={[styles.pageInner, { backgroundColor: "#fffdf7" }]}>
      <Text style={styles.pageEmblem}>{cover.emblem}</Text>
      <Text style={styles.pageTitle}>My Diary</Text>
      <View style={styles.paperLine} />
      <Text style={styles.pageSub}>
        {entries === 0
          ? "The first page is waiting for you."
          : `${entries} ${entries === 1 ? "entry" : "entries"} tucked inside.`}
      </Text>
      <Text style={styles.weatherToday}>{DIARY_WEATHER[new Date().getDate() % DIARY_WEATHER.length]}</Text>
      <Text style={styles.pagePrivacy}>🔒 private · only you can read this</Text>
    </View>
  );
}

function EntryPage({ entry }: { entry: DiaryEntry }) {
  return (
    <ScrollView style={[styles.pageInner, { backgroundColor: "#fffdf7" }]} showsVerticalScrollIndicator={false}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryWeather}>{entry.weather}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryTitle}>{entry.title || "Untitled page"}</Text>
          <Text style={styles.entryDate}>
            {new Date(entry.at).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}
          </Text>
        </View>
        <MoodTag mood={entry.mood} small />
      </View>
      <View style={styles.paperLine} />
      {entry.body ? <Text style={styles.entryBody}>{entry.body}</Text> : null}
      {entry.stickers.length > 0 ? (
        <View style={styles.entryStickers}>
          {entry.stickers.map((s, i) => (
            <Text key={i} style={{ fontSize: 22 }}>
              {s}
            </Text>
          ))}
        </View>
      ) : null}
      {entry.attachments.map((a, i) => (
        <View key={i} style={{ marginTop: 10 }}>
          <AttachmentChip attachment={a} />
        </View>
      ))}
    </ScrollView>
  );
}

/* ─── Editor ───────────────────────────────────────────────────────── */

function DiaryEditor({
  cover,
  draftAttach,
  onDone,
}: {
  cover: Cover;
  draftAttach?: Attachment;
  onDone: () => void;
}) {
  const recordings = useTable<Recording>("recordings");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [weather, setWeather] = React.useState(DIARY_WEATHER[0]);
  const [stickers, setStickers] = React.useState<string[]>([]);
  const [mood, setMood] = React.useState<string | undefined>();
  const [attachment, setAttachment] = React.useState<Attachment | undefined>(draftAttach);
  const [showRecs, setShowRecs] = React.useState(false);

  const save = () => {
    const entry = createDiaryEntry({
      title: title.trim(),
      body: body.trim(),
      mood,
      weather,
      stickers,
      attachments: attachment ? [attachment] : [],
    });
    if (attachment && (attachment.kind === "audio" || attachment.kind === "video")) {
      // link the original recording to this diary page
      const rec = recordings.find((r) => r.fileUri === attachment.fileUri || (r.kind === "voice" && r.fileUri === undefined && attachment.art === "🎙️"));
      if (rec) attachRecordingToDiary(rec.id, entry.id);
    }
    onDone();
  };

  return (
    <Screen title="New diary page" subtitle="Write it like no one will ever read it" onBack={onDone}>
      <ClayCard bg={hexWithAlpha(cover.color, 0.55)}>
        <Text style={styles.label}>Weather today</Text>
        <View style={styles.chipRow}>
          {DIARY_WEATHER.map((w) => (
            <ClayChip key={w} label={w} selected={weather === w} onPress={() => setWeather(w)} bg={cover.color} />
          ))}
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title of this page (optional)"
          placeholderTextColor={palette.inkFaint}
          style={[styles.titleInput, { borderColor: cover.color }]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Dear diary…"
          placeholderTextColor={palette.inkFaint}
          multiline
          style={[styles.bodyInput, { borderColor: cover.color }]}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Stickers (tap to add)</Text>
        <View style={styles.chipRow}>
          {DIARY_STICKERS.map((s) => (
            <ClayChip
              key={s}
              label={s}
              selected={stickers.includes(s)}
              onPress={() =>
                setStickers((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
              }
              bg={cover.color}
            />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>How it feels (optional)</Text>
        <View style={styles.chipRow}>
          {["calm", "sad", "angry", "nervous", "happy", "tired", "overwhelmed"].map((m) => (
            <ClayChip
              key={m}
              label={`${moodById(m)?.emoji} ${moodById(m)?.label}`}
              selected={mood === m}
              onPress={() => setMood(mood === m ? undefined : m)}
              bg={cover.color}
            />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Attach a recording (optional)</Text>
        {attachment ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AttachmentChip attachment={attachment} />
            <ClayButton label="✕" color="ghost" size="sm" onPress={() => setAttachment(undefined)} textStyle={{ color: palette.inkSoft }} />
          </View>
        ) : (
          <>
            <ClayButton label="🎙️/🎥 Attach a vent" color="cream" size="sm" onPress={() => setShowRecs((s) => !s)} style={{ alignSelf: "flex-start" }} />
            {showRecs ? (
              <View style={styles.chipRow}>
                {recordings.map((r) => (
                  <ClayChip
                    key={r.id}
                    label={`${r.kind === "voice" ? "🎙️" : "🎥"} ${Math.floor(r.duration / 60)}:${String(r.duration % 60).padStart(2, "0")}`}
                    onPress={() => {
                      setAttachment({
                        kind: r.kind === "voice" ? "audio" : "video",
                        label: r.kind === "voice" ? "Voice vent" : "Video vent",
                        duration: r.duration,
                        art: r.kind === "voice" ? "🎙️" : (r.avatar ?? "🎥"),
                        fileUri: r.fileUri,
                      });
                      setShowRecs(false);
                    }}
                    bg={cover.color}
                  />
                ))}
                {recordings.length === 0 ? <Text style={styles.noRecs}>no vents saved yet — record one in the Recording Box</Text> : null}
              </View>
            ) : null}
          </>
        )}
      </ClayCard>

      <ClayButton label="🔒 Save page privately" color="primary" size="lg" onPress={save} style={{ marginTop: 18 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverWrap: { alignItems: "center", marginTop: 10 },
  bookCover: {
    width: 230,
    height: 300,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  bookEmblem: { fontSize: 52 },
  bookTitle: { marginTop: 10, fontSize: 26, fontWeight: "800", color: palette.ink, letterSpacing: 1 },
  bookSub: { marginTop: 6, fontSize: 12, color: palette.inkSoft, textAlign: "center" },
  bookBand: { position: "absolute", top: 18, bottom: 18, left: 16, width: 6, borderRadius: 3, backgroundColor: hexWithAlpha(palette.surface, 0.55) },
  label: { fontSize: 13, fontWeight: "800", color: palette.ink, marginTop: 18, marginBottom: 10 },
  swatchRow: { flexDirection: "row", gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSelected: { borderWidth: 3, borderColor: palette.ink },
  emblemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emblem: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  book: {
    marginTop: 12,
    aspectRatio: 3 / 4.4,
    width: "100%",
  },
  page: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...clayShadow(true),
  },
  incoming: { borderWidth: 1, borderColor: hexWithAlpha(palette.lavender, 0.6) },
  turnZoneLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: 52 },
  turnZoneRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: 52 },
  turnHit: { flex: 1, alignItems: "center", justifyContent: "center" },
  turnArrow: { fontSize: 34, color: palette.lavenderDeep },
  pageNum: { position: "absolute", bottom: 6, alignSelf: "center" },
  pageNumText: { fontSize: 11, color: palette.inkFaint, fontWeight: "700" },
  flipHint: { textAlign: "center", marginTop: 10, fontSize: 11.5, color: palette.inkFaint, fontStyle: "italic" },
  pageInner: { flex: 1, borderRadius: radius.lg, padding: 20 },
  pageEmblem: { fontSize: 34, textAlign: "center" },
  pageTitle: { fontSize: 22, fontWeight: "800", color: palette.ink, textAlign: "center", marginTop: 6, fontStyle: "italic" },
  paperLine: { height: 1, backgroundColor: hexWithAlpha(palette.lavender, 0.6), marginVertical: 14 },
  pageSub: { textAlign: "center", fontSize: 13, color: palette.inkSoft, lineHeight: 19 },
  weatherToday: { textAlign: "center", fontSize: 30, marginTop: 18 },
  pagePrivacy: { textAlign: "center", marginTop: 18, fontSize: 11.5, color: palette.inkFaint, fontWeight: "700" },
  entryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  entryWeather: { fontSize: 26 },
  entryTitle: { fontSize: 16, fontWeight: "800", color: palette.ink, fontStyle: "italic" },
  entryDate: { fontSize: 11, color: palette.inkSoft, marginTop: 2 },
  entryBody: { fontSize: 14, color: palette.ink, lineHeight: 23, fontStyle: "italic" },
  entryStickers: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  titleInput: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: palette.ink,
    borderWidth: 2,
    marginTop: 14,
  },
  bodyInput: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: 14,
    minHeight: 130,
    fontSize: 14,
    color: palette.ink,
    borderWidth: 2,
    marginTop: 10,
    textAlignVertical: "top",
    lineHeight: 21,
    fontStyle: "italic",
  },
  noRecs: { fontSize: 12, fontStyle: "italic", color: palette.inkFaint },
});
