import React from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Screen } from "../components/Screen";
import { TaskBar } from "../components/TaskBar";
import { ClayButton, ClayCard, hexWithAlpha } from "../components/Clay";
import { MoodChips, MoodTag } from "../components/MoodChips";
import { MOODS, VIDEO_AVATARS, VOICE_COMPANION } from "../data";
import { createRecording, deleteFile, removeItem, useTable } from "../db";
import { playSoftChime } from "../sound";
import { palette, radius, TILE_BGS, clayShadow } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { Recording } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Record">;

interface Draft {
  kind: "voice" | "video";
  mood?: string;
  duration: number;
  fileUri?: string;
  avatar?: string;
}

export default function RecordScreen({ navigation, route }: Props) {
  const [mode, setMode] = React.useState<"voice" | "video">(route.params?.mode ?? "voice");
  const [mood, setMood] = React.useState<string | undefined>();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const saveDraft = (): Recording | null => {
    if (!draft) return null;
    const rec = createRecording({
      kind: draft.kind,
      mood: draft.mood,
      duration: Math.max(1, Math.round(draft.duration)),
      fileUri: draft.fileUri,
      avatar: draft.avatar,
    });
    setDraft(null);
    return rec;
  };

  const handleSave = () => {
    if (saveDraft()) showToast("🔒 Saved privately. Only you can see this.");
  };

  const handleReflect = () => {
    const rec = saveDraft();
    if (rec) navigation.navigate("NoteEditor", { recordingId: rec.id });
  };

  const handleDiary = () => {
    const rec = saveDraft();
    if (rec) navigation.navigate("Diary", { attachRecording: rec.id });
  };

  const handleDoodle = (asGif: boolean) => {
    const rec = saveDraft();
    if (rec) {
      navigation.navigate("GifStudio", {
        baseArt: rec.avatar ?? (rec.kind === "video" ? "🐻" : "🎙️"),
        baseBg: "tile-lavender",
        fromRecording: rec.id,
      });
    }
  };

  const handleDelete = () => {
    if (draft?.fileUri) void deleteFileSafe(draft.fileUri);
    setDraft(null);
    showToast("Recording removed.");
  };

  return (
    <Screen title="Recording Box" subtitle="Private. Safe. Just for you." bottomBar={<TaskBar />}>
      {/* Voice | Video toggle */}
      <View style={[styles.toggle, clayShadow(false)]}>
        <ToggleButton active={mode === "voice"} label="🎙️ Voice" onPress={() => setMode("voice")} />
        <ToggleButton active={mode === "video"} label="🎥 Video" onPress={() => setMode("video")} />
      </View>

      {draft ? (
        <DraftActions
          draft={draft}
          onSave={handleSave}
          onReflect={handleReflect}
          onDiary={handleDiary}
          onDoodle={() => handleDoodle(false)}
          onGif={() => handleDoodle(true)}
          onDelete={handleDelete}
        />
      ) : mode === "voice" ? (
        <VoiceRecorder mood={mood} setMood={setMood} onDone={(d) => setDraft(d)} />
      ) : (
        <VideoRecorder mood={mood} setMood={setMood} onDone={(d) => setDraft(d)} />
      )}

      <Text style={styles.privacyLine}>🔒 No sharing. No feed. No audience. Just you.</Text>

      <RecentRecordings navigation={navigation} onDeleted={showToast} />
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

/* ─── Toggle ───────────────────────────────────────────────────────── */

function ToggleButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggleBtn,
        { backgroundColor: active ? palette.surface : "transparent" },
        active && clayShadow(false),
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.toggleLabel, { color: active ? palette.ink : palette.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

/* ─── Voice recorder ───────────────────────────────────────────────── */

function VoiceRecorder({
  mood,
  setMood,
  onDone,
}: {
  mood?: string;
  setMood: (m?: string) => void;
  onDone: (draft: Draft) => void;
}) {
  const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
  const [active, setActive] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [permission, setPermission] = React.useState<boolean | null>(null);
  const glow = React.useRef(new Animated.Value(0)).current;
  const bars = React.useRef(
    Array.from({ length: 24 }, () => new Animated.Value(0.3)),
  ).current;
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    Audio.requestPermissionsAsync().then((res) => setPermission(res.granted));
    return () => stopTimer();
  }, []);

  const stopTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const pulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  };

  const animateBars = () => {
    bars.forEach((b, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 0.9 + Math.random() * 0.6, duration: 280 + i * 13, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.25, duration: 260 + i * 11, useNativeDriver: true }),
        ]),
      ).start();
    });
  };

  const stopBars = () => {
    bars.forEach((b) => b.stopAnimation());
    bars.forEach((b) => b.setValue(0.3));
  };

  const start = async () => {
    setSeconds(0);
    setActive(true);
    pulse();
    animateBars();
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    if (permission) {
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await rec.startAsync();
        setRecording(rec);
      } catch {
        // no mic available (web/simulator) — simulate quietly
      }
    }
  };

  const stop = async () => {
    stopTimer();
    stopBars();
    glow.stopAnimation();
    glow.setValue(0);
    let fileUri: string | undefined;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        fileUri = recording.getURI() ?? undefined;
      } catch {
        /* ignore */
      }
      setRecording(null);
    }
    setActive(false);
    onDone({ kind: "voice", mood, duration: seconds, fileUri });
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <ClayCard style={{ marginTop: 16, alignItems: "center" }}>
      <View style={styles.companionWrap}>
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
            },
          ]}
        />
        <View style={styles.companion}>
          <Text style={{ fontSize: 64 }}>{VOICE_COMPANION}</Text>
        </View>
      </View>
      <Text style={styles.listening}>{active ? "Listening… quietly, safely" : "Tap the button when you're ready"}</Text>

      <View style={styles.waveRow}>
        {bars.map((b, i) => (
          <Animated.View key={i} style={[styles.waveBar, { transform: [{ scaleY: b }], backgroundColor: active ? palette.lavenderDeep : palette.inkFaint }]} />
        ))}
      </View>

      <Text style={styles.timer}>{fmt(seconds)}</Text>

      <View style={{ marginTop: 6 }}>
        <MoodChips value={mood} onChange={setMood} />
      </View>

      <Pressable
        onPress={active ? stop : start}
        style={({ pressed }) => [
          styles.recordBtn,
          { backgroundColor: active ? palette.blushDeep : palette.blush },
          clayShadow(true),
          pressed && { transform: [{ scale: 0.92 }], shadowOpacity: 0 },
        ]}
        accessibilityLabel={active ? "Stop recording" : "Start recording"}
      >
        <Text style={styles.recordIcon}>{active ? "■" : "●"}</Text>
      </Pressable>
      <Text style={styles.recordHint}>{active ? "Tap to finish" : "Record"}</Text>
    </ClayCard>
  );
}

/* ─── Video recorder ───────────────────────────────────────────────── */

function VideoRecorder({
  mood,
  setMood,
  onDone,
}: {
  mood?: string;
  setMood: (m?: string) => void;
  onDone: (draft: Draft) => void;
}) {
  const [useCamera, setUseCamera] = React.useState(false);
  const [avatar, setAvatar] = React.useState(VIDEO_AVATARS[0]);
  const [active, setActive] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const camera = React.useRef<CameraView>(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingPromise = React.useRef<Promise<{ uri: string } | undefined> | null>(null);
  const bob = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [bob]);

  const start = async () => {
    setSeconds(0);
    setActive(true);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    if (useCamera && camPermission?.granted && camera.current) {
      try {
        // recordAsync resolves with the file once stopRecording() is called
        recordingPromise.current = camera.current.recordAsync({ maxDuration: 300 });
      } catch {
        /* camera unavailable — stays simulated */
      }
    }
  };

  const stop = async () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    let fileUri: string | undefined;
    if (useCamera && camera.current && recordingPromise.current) {
      camera.current.stopRecording();
      try {
        const vid = await recordingPromise.current;
        fileUri = vid?.uri;
      } catch {
        /* ignore */
      }
      recordingPromise.current = null;
    }
    setActive(false);
    onDone({ kind: "video", mood, duration: seconds, fileUri, avatar });
  };

  return (
    <ClayCard style={{ marginTop: 16, alignItems: "center" }}>
      <View style={styles.cameraFrame}>
        {useCamera && camPermission?.granted ? (
          <CameraView ref={camera} style={styles.camera} facing="front" />
        ) : (
          <Animated.View
            style={[
              styles.avatarStage,
              {
                backgroundColor: TILE_BGS["tile-lavender"],
                transform: [
                  { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
                ],
              },
            ]}
          >
            <Text style={styles.avatarStageEmoji}>{avatar}</Text>
            <Text style={styles.avatarStageNote}>an illustrated you — never a real face</Text>
          </Animated.View>
        )}
        {active ? (
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</Text>
          </View>
        ) : null}
        <View style={styles.privacyBadge}>
          <Text style={styles.privacyBadgeText}>🔒 only you</Text>
        </View>
      </View>

      {!useCamera ? (
        <View style={styles.avatarRow}>
          {VIDEO_AVATARS.map((a) => (
            <Pressable
              key={a}
              onPress={() => setAvatar(a)}
              style={[styles.avatarOption, { backgroundColor: avatar === a ? palette.lavender : palette.cream }]}
            >
              <Text style={{ fontSize: 20 }}>{a}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => {
          setUseCamera((c) => !c);
          if (!useCamera && !camPermission?.granted) void requestCamPermission();
        }}
      >
        <Text style={styles.mirrorToggle}>
          {useCamera ? "🌸 use illustrated avatar instead" : "🎥 use my camera (stays on device)"}
        </Text>
      </Pressable>

      <View style={{ marginTop: 8 }}>
        <MoodChips value={mood} onChange={setMood} />
      </View>

      <Pressable
        onPress={active ? stop : start}
        style={({ pressed }) => [
          styles.recordBtn,
          { backgroundColor: active ? palette.blushDeep : palette.blush },
          clayShadow(true),
          pressed && { transform: [{ scale: 0.92 }], shadowOpacity: 0 },
        ]}
        accessibilityLabel={active ? "Stop recording" : "Start recording"}
      >
        <Text style={styles.recordIcon}>{active ? "■" : "●"}</Text>
      </Pressable>
      <Text style={styles.recordHint}>
        {active ? "Tap to finish · a private emotional mirror, not social media" : "Express with your face, hands or a big sigh"}
      </Text>
    </ClayCard>
  );
}

/* ─── Post-recording actions ───────────────────────────────────────── */

function DraftActions({
  draft,
  onSave,
  onReflect,
  onDiary,
  onDoodle,
  onGif,
  onDelete,
}: {
  draft: Draft;
  onSave: () => void;
  onReflect: () => void;
  onDiary: () => void;
  onDoodle: () => void;
  onGif: () => void;
  onDelete: () => void;
}) {
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <ClayCard style={{ marginTop: 16, alignItems: "center" }} bg={palette.surface}>
      <Text style={styles.doneEmoji}>{draft.kind === "voice" ? "🎙️" : "🎥"}</Text>
      <Text style={styles.doneTitle}>
        {draft.kind === "voice" ? "Your voice vent" : "Your video vent"} is ready.
      </Text>
      <Text style={styles.doneMeta}>
        {fmt(draft.duration)} {draft.mood ? "· " + MOODS.find((m) => m.id === draft.mood)?.emoji + " " + MOODS.find((m) => m.id === draft.mood)?.label : ""}
      </Text>
      {draft.kind === "voice" ? (
        <>
          <ClayButton label="🔒 Save privately" color="primary" size="lg" onPress={onSave} style={{ width: "100%", marginTop: 6 }} />
          <ClayButton label="📝 Reflect in Notes" color="cream" onPress={onReflect} style={{ width: "100%", marginTop: 10 }} />
          <ClayButton label="📖 Attach to Diary" color="cream" onPress={onDiary} style={{ width: "100%", marginTop: 10 }} />
          <ClayButton label="✏️ Doodle on it" color="cream" onPress={onDoodle} style={{ width: "100%", marginTop: 10 }} />
        </>
      ) : (
        <>
          <ClayButton label="🔒 Save privately" color="primary" size="lg" onPress={onSave} style={{ width: "100%", marginTop: 6 }} />
          <ClayButton label="✏️ Doodle on it" color="cream" onPress={onDoodle} style={{ width: "100%", marginTop: 10 }} />
          <ClayButton label="🎞️ Make GIF" color="cream" onPress={onGif} style={{ width: "100%", marginTop: 10 }} />
          <ClayButton label="📝 Attach to Note" color="cream" onPress={onReflect} style={{ width: "100%", marginTop: 10 }} />
          <ClayButton label="📖 Attach to Diary" color="cream" onPress={onDiary} style={{ width: "100%", marginTop: 10 }} />
        </>
      )}
      <ClayButton label="🗑️ Delete" color="ghost" onPress={onDelete} textStyle={{ color: "#b0707e" }} />
    </ClayCard>
  );
}

/* ─── Recent recordings ────────────────────────────────────────────── */

function RecentRecordings({
  navigation,
  onDeleted,
}: {
  navigation: Props["navigation"];
  onDeleted: (msg: string) => void;
}) {
  const recordings = useTable<Recording>("recordings");
  if (recordings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No vents yet — that's okay. Whenever you're ready.</Text>
      </View>
    );
  }
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.sectionTitle}>Your vents</Text>
      {recordings.slice(0, 6).map((rec) => (
        <RecordingRow key={rec.id} rec={rec} navigation={navigation} onDeleted={onDeleted} />
      ))}
    </View>
  );
}

function RecordingRow({
  rec,
  navigation,
  onDeleted,
}: {
  rec: Recording;
  navigation: Props["navigation"];
  onDeleted: (msg: string) => void;
}) {
  const [playing, setPlaying] = React.useState(false);

  const play = async () => {
    if (playing) return;
    if (rec.fileUri) {
      try {
        setPlaying(true);
        const { sound } = await Audio.Sound.createAsync({ uri: rec.fileUri }, { volume: 0.9 });
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
      setPlaying(true);
      await playSoftChime();
      setTimeout(() => setPlaying(false), 900);
    }
  };

  const del = () => {
    if (rec.fileUri) void deleteFileSafe(rec.fileUri);
    removeItem("recordings", rec.id);
    onDeleted("Deleted.");
  };

  const duration = `${Math.floor(rec.duration / 60)}:${String(rec.duration % 60).padStart(2, "0")}`;

  return (
    <ClayCard style={styles.recRow} bg={palette.surface} raised={false}>
      <Pressable onPress={play} style={[styles.playPill, clayShadow(false)]}>
        <Text style={styles.playPillText}>{playing ? "…" : "▶"}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.recTitle}>{rec.kind === "voice" ? "Voice vent" : "Video vent"}</Text>
          <MoodTag mood={rec.mood} small />
        </View>
        <Text style={styles.recMeta}>
          {duration} · {new Date(rec.at).toLocaleDateString()} {rec.noteId ? "· in notes" : rec.diaryId ? "· in diary" : ""}
        </Text>
      </View>
      {rec.kind === "video" ? (
        <Pressable onPress={() => navigation.navigate("GifStudio", { baseArt: rec.avatar ?? "🐻", baseBg: "tile-lavender", fromRecording: rec.id })}>
          <Text style={styles.recLink}>🎞️</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={del} accessibilityLabel="Delete recording">
        <Text style={styles.recLink}>🗑️</Text>
      </Pressable>
    </ClayCard>
  );
}

async function deleteFileSafe(uri: string): Promise<void> {
  try {
    await deleteFile(uri);
  } catch {
    /* ignore */
  }
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    backgroundColor: hexWithAlpha(palette.lavender, 0.35),
    borderRadius: radius.full,
    padding: 5,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.full,
    alignItems: "center",
  },
  toggleLabel: { fontSize: 14, fontWeight: "800" },
  companionWrap: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  glow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: palette.lavender,
  },
  companion: {
    width: 108,
    height: 108,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    ...clayShadow(true),
  },
  listening: { marginTop: 10, fontSize: 13.5, color: palette.inkSoft, fontWeight: "600" },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    gap: 3,
    marginTop: 14,
  },
  waveBar: {
    width: 4,
    height: 34,
    borderRadius: 3,
  },
  timer: { marginTop: 8, fontSize: 22, fontWeight: "800", color: palette.ink, fontVariant: ["tabular-nums"] },
  recordBtn: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  recordIcon: { fontSize: 30, color: palette.ink },
  recordHint: { marginTop: 8, fontSize: 12, color: palette.inkSoft, textAlign: "center", paddingHorizontal: 10 },
  cameraFrame: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
    ...clayShadow(true),
  },
  camera: { width: "100%", height: "100%" },
  avatarStage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStageEmoji: { fontSize: 96 },
  avatarStageNote: {
    position: "absolute",
    bottom: 14,
    fontSize: 11.5,
    color: palette.inkSoft,
    fontWeight: "600",
  },
  recBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: hexWithAlpha(palette.surface, 0.92),
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#c96a7c" },
  recText: { fontSize: 12, fontWeight: "800", color: palette.ink },
  privacyBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: hexWithAlpha(palette.surface, 0.92),
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  privacyBadgeText: { fontSize: 11.5, fontWeight: "700", color: palette.ink },
  avatarRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 12 },
  avatarOption: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  mirrorToggle: { marginTop: 10, fontSize: 12.5, fontWeight: "700", color: palette.inkSoft },
  doneEmoji: { fontSize: 44 },
  doneTitle: { fontSize: 16, fontWeight: "800", color: palette.ink, marginTop: 6 },
  doneMeta: { fontSize: 12.5, color: palette.inkSoft, marginTop: 4, marginBottom: 6 },
  privacyLine: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 12,
    color: palette.inkFaint,
    fontWeight: "600",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: palette.ink, marginBottom: 10 },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingVertical: 12,
  },
  playPill: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  playPillText: { fontSize: 14, color: palette.ink, fontWeight: "800" },
  recTitle: { fontSize: 14, fontWeight: "700", color: palette.ink },
  recMeta: { fontSize: 11.5, color: palette.inkSoft, marginTop: 2 },
  recLink: { fontSize: 16, padding: 4 },
  empty: { marginTop: 22, alignItems: "center" },
  emptyText: { fontSize: 12.5, color: palette.inkFaint, textAlign: "center" },
  toast: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: palette.ink,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...clayShadow(true),
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
