import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { ClayButton, ClayChip, hexWithAlpha } from "../components/Clay";
import { LockPad } from "../components/LockPad";
import { authenticateBiometric, biometricStatus, verifyPasscode } from "../auth";
import { deleteFile, removeItem, useTable } from "../db";
import { palette, radius, TILE_BGS, clayShadow } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { VaultItem, VaultKind } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Vault">;

const FILTERS: { id: "all" | VaultKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photo", label: "🌅 Photos" },
  { id: "video", label: "🎥 Videos" },
  { id: "gif", label: "🎞️ GIFs" },
  { id: "doodle", label: "🎨 Doodles" },
  { id: "sticker", label: "🧸 Stickers" },
];

/**
 * Private Vault — double-locked: the app lock, then this vault asks for the
 * passcode (or Face ID / fingerprint) again before anything is shown.
 */
export default function VaultScreen({ navigation }: Props) {
  const [locked, setLocked] = React.useState(true);
  const [code, setCode] = React.useState("");
  const [shake, setShake] = React.useState(0);
  const [biometric, setBiometric] = React.useState<"face" | "fingerprint" | null>(null);

  React.useEffect(() => {
    void biometricStatus().then((s) => setBiometric(s.enrolled ? s.type : null));
  }, []);

  const tryUnlock = async (candidate: string) => {
    const ok = await verifyPasscode(candidate);
    if (ok) {
      setLocked(false);
      setCode("");
    } else {
      setCode("");
      setShake((s) => s + 1);
    }
  };

  const unlockWithBio = async () => {
    const ok = await authenticateBiometric();
    if (ok) setLocked(false);
  };

  if (locked) {
    return (
      <Screen title="Private Vault" subtitle="Double-locked. Only you.">
        <View style={styles.lockWrap}>
          <View style={[styles.vaultSeal, clayShadow(true)]}>
            <Text style={styles.vaultSealEmoji}>🔐</Text>
            <Text style={styles.vaultSealText}>Your private vault</Text>
          </View>
          <Text style={styles.lockTitle}>One more gentle lock</Text>
          <Text style={styles.lockSub}>
            Photos, video vents, doodles, stickers & GIFs wait behind this. Only you can open it.
          </Text>
          <LockPad
            value={code}
            onChange={(c) => {
              setCode(c);
              if (c.length === 4) void tryUnlock(c);
            }}
            shake={shake}
            biometricNode={
              biometric ? (
                <Pressable onPress={unlockWithBio} style={styles.bioBtn} accessibilityLabel="Unlock with Face ID or fingerprint">
                  <Text style={styles.bioText}>{biometric === "face" ? "😊 Face ID" : "☝️ Fingerprint"}</Text>
                </Pressable>
              ) : null
            }
          />
        </View>
      </Screen>
    );
  }

  return <VaultGallery navigation={navigation} />;
}

/* ─── Unlocked gallery ─────────────────────────────────────────────── */

function VaultGallery({ navigation }: { navigation: Props["navigation"] }) {
  const items = useTable<VaultItem>("vaultItems");
  const [filter, setFilter] = React.useState<"all" | VaultKind>("all");
  const [viewing, setViewing] = React.useState<VaultItem | null>(null);

  const filtered = items.filter((v) => filter === "all" || v.kind === filter);

  return (
    <Screen
      title="Private Vault"
      subtitle="Everything here is only yours"
      footer={
        <ClayButton
          label="🔒 Re-lock vault"
          color="cream"
          onPress={() => navigation.replace("Vault")}
        />
      }
    >
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <ClayChip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} bg={palette.lavender} />
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🕊️</Text>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            Photos, video vents, doodles, stickers and GIFs you save will wait for you here — behind
            your double lock.
          </Text>
          <ClayButton label="Keep your first photo" color="primary" onPress={() => navigation.navigate("Photos")} style={{ marginTop: 14 }} />
        </View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((item) => (
            <Pressable key={item.id} onPress={() => setViewing(item)} style={styles.polaroid}>
              <View style={[styles.polaroidMedia, { backgroundColor: TILE_BGS[item.bg] ?? palette.lavender }]}>
                {item.fileUri ? (
                  <Image source={{ uri: item.fileUri }} style={styles.polaroidImg} />
                ) : (
                  <Text style={styles.polaroidArt}>{item.art}</Text>
                )}
                <Text style={styles.kindBadge}>{kindLabel(item.kind)}</Text>
              </View>
              <Text style={styles.caption}>{item.caption ?? "kept privately"}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ViewItemModal
        item={viewing}
        onClose={() => setViewing(null)}
        onDelete={() => {
          if (viewing) {
            if (viewing.fileUri) void deleteFileSafe(viewing.fileUri);
            removeItem("vaultItems", viewing.id);
            setViewing(null);
          }
        }}
      />
    </Screen>
  );
}

function ViewItemModal({
  item,
  onClose,
  onDelete,
}: {
  item: VaultItem | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewBackdrop}>
        {item ? (
          <View style={styles.viewCard}>
            <View style={[styles.viewMedia, { backgroundColor: TILE_BGS[item.bg] ?? palette.lavender }]}>
              {item.fileUri ? (
                <Image source={{ uri: item.fileUri }} style={styles.viewImg} resizeMode="contain" />
              ) : (
                <Text style={styles.viewArt}>{item.art}</Text>
              )}
              {item.kind === "gif" ? (
                <View style={styles.gifChip}>
                  <Text style={styles.gifChipText}>▶ {item.frames?.length ?? 1} frames</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.viewCaption}>{item.caption ?? "kept privately"}</Text>
            <Text style={styles.viewDate}>
              {new Date(item.at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </Text>
            <View style={styles.viewActions}>
              <ClayButton label="Close" color="cream" onPress={onClose} style={{ flex: 1 }} />
              <ClayButton label="🗑️ Delete" color="ghost" onPress={onDelete} textStyle={{ color: "#b0707e" }} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function kindLabel(kind: VaultKind): string {
  switch (kind) {
    case "photo": return "🌅 photo";
    case "video": return "🎥 video vent";
    case "gif": return "🎞️ GIF";
    case "doodle": return "🎨 doodle";
    case "sticker": return "🧸 sticker";
  }
}

async function deleteFileSafe(uri: string): Promise<void> {
  try {
    await deleteFile(uri);
  } catch {
    /* ignore */
  }
}

const styles = StyleSheet.create({
  lockWrap: { alignItems: "center", paddingTop: 30 },
  vaultSeal: {
    width: 110,
    height: 110,
    borderRadius: radius.full,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultSealEmoji: { fontSize: 42 },
  vaultSealText: { fontSize: 12, fontWeight: "800", color: palette.ink, marginTop: 4 },
  lockTitle: { marginTop: 18, fontSize: 19, fontWeight: "800", color: palette.ink },
  lockSub: {
    marginTop: 6,
    fontSize: 13,
    color: palette.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 24,
  },
  bioBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bioText: { fontSize: 14, fontWeight: "700", color: palette.inkSoft },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  empty: { alignItems: "center", paddingTop: 50, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { marginTop: 10, fontSize: 17, fontWeight: "800", color: palette.ink },
  emptyBody: { marginTop: 6, fontSize: 13, color: palette.inkSoft, textAlign: "center", lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  polaroid: {
    width: "31%",
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: 8,
    ...clayShadow(false),
  },
  polaroidMedia: {
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  polaroidImg: { width: "100%", height: "100%" },
  polaroidArt: { fontSize: 34 },
  kindBadge: {
    position: "absolute",
    bottom: 4,
    fontSize: 8.5,
    color: palette.ink,
    backgroundColor: hexWithAlpha(palette.surface, 0.9),
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "700",
  },
  caption: { marginTop: 6, fontSize: 11, color: palette.inkSoft, fontWeight: "600", textAlign: "center" },
  viewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(74, 68, 88, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  viewCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: "center",
    ...clayShadow(true),
  },
  viewMedia: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  viewImg: { width: "100%", height: "100%" },
  viewArt: { fontSize: 72 },
  gifChip: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    backgroundColor: hexWithAlpha(palette.surface, 0.9),
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gifChipText: { fontSize: 11, fontWeight: "800", color: palette.ink },
  viewCaption: { marginTop: 12, fontSize: 14, fontWeight: "700", color: palette.ink },
  viewDate: { marginTop: 2, fontSize: 12, color: palette.inkFaint },
  viewActions: { flexDirection: "row", gap: 8, marginTop: 14, width: "100%" },
});
