import React from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../components/Screen";
import { ClayButton, ClayCard } from "../components/Clay";
import { PHOTO_SCENES } from "../data";
import { createVaultItem, storeFile, useTable } from "../db";
import { palette, radius, TILE_BGS } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { VaultItem } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Photos">;

/**
 * Photos — either pick from the device (copied into private app storage) or
 * choose a soft pastel scene. Everything lands in the double-locked vault.
 */
export default function PhotosScreen({ navigation }: Props) {
  const vaultItems = useTable<VaultItem>("vaultItems");
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const saveScene = (scene: (typeof PHOTO_SCENES)[number]) => {
    createVaultItem({
      kind: "photo",
      art: scene.emoji,
      bg: scene.bg,
      caption: scene.label,
    });
    showToast("🔒 Saved to your private vault.");
  };

  const pickFromDevice = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      const uri = await storeFile(asset.uri, "jpg");
      createVaultItem({
        kind: "photo",
        art: "🌅",
        bg: "tile-cream",
        caption: "kept privately",
        fileUri: uri,
      });
      showToast("🔒 Photo saved to your private vault.");
    } catch {
      showToast("Couldn't open the photo library.");
    }
  };

  return (
    <Screen title="Photos" subtitle="Kept privately, always">
      <ClayButton label="📷 Pick from my device" color="primary" size="lg" onPress={pickFromDevice} />
      <Text style={styles.or}>or choose a soft pastel scene</Text>

      <View style={styles.grid}>
        {PHOTO_SCENES.map((scene) => (
          <ClayCard
            key={scene.emoji}
            style={{ width: "31%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 8 }}
            bg={TILE_BGS[scene.bg]}
            onPress={() => saveScene(scene)}
          >
            <Text style={styles.sceneEmoji}>{scene.emoji}</Text>
            <Text style={styles.sceneLabel} numberOfLines={1}>
              {scene.label}
            </Text>
          </ClayCard>
        ))}
      </View>

      <ClayButton
        label={`🔐 Open vault (${vaultItems.length})`}
        color="cream"
        size="lg"
        onPress={() => navigation.navigate("Vault")}
        style={{ marginTop: 20 }}
      />
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  or: {
    textAlign: "center",
    marginVertical: 16,
    fontSize: 12.5,
    color: palette.inkFaint,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  sceneEmoji: { fontSize: 34 },
  sceneLabel: { marginTop: 4, fontSize: 10, color: palette.inkSoft, fontWeight: "600" },
  toast: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: palette.ink,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
