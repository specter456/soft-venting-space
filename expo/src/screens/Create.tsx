import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { TaskBar } from "../components/TaskBar";
import { ClayCard } from "../components/Clay";
import { useTable } from "../db";
import { palette } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";
import type { VaultItem } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Create">;

const TOOLS = [
  { name: "Photos", emoji: "🌅", bg: palette.peach, route: "Photos" as const, line: "Keep moments privately" },
  { name: "Scribble", emoji: "🖍️", bg: palette.blush, route: "Scribble" as const, line: "Draw how it feels" },
  { name: "Stickers", emoji: "🧸", bg: palette.lavender, route: "Stickers" as const, line: "Make cute feelings" },
  { name: "GIF Studio", emoji: "🎞️", bg: palette.mint, route: "GifStudio" as const, line: "Doodle & animate" },
];

export default function CreateScreen({ navigation }: Props) {
  const vaultItems = useTable<VaultItem>("vaultItems");

  return (
    <Screen title="Create" subtitle="Your playful, private studio" bottomBar={<TaskBar />}>
      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <ClayCard
            key={tool.name}
            style={{ width: "47.5%", minHeight: 140, alignItems: "center", justifyContent: "center", paddingVertical: 20 }}
            bg={tool.bg}
            onPress={() => navigation.navigate(tool.route)}
          >
            <Text style={styles.toolEmoji}>{tool.emoji}</Text>
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolLine}>{tool.line}</Text>
          </ClayCard>
        ))}
      </View>

      <ClayCard
        style={{ marginTop: 18, alignItems: "center" }}
        bg={palette.surface}
        onPress={() => navigation.navigate("Vault")}
      >
        <Text style={styles.vaultEmoji}>🔐</Text>
        <Text style={styles.vaultTitle}>Private Vault</Text>
        <Text style={styles.vaultLine}>
          {vaultItems.length} things kept · double-locked · photos, video vents, doodles, stickers & GIFs
        </Text>
      </ClayCard>

      <Text style={styles.privacy}>🔒 Private and safe. Only you can see this.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  toolEmoji: { fontSize: 34 },
  toolName: { marginTop: 8, fontSize: 16, fontWeight: "800", color: palette.ink },
  toolLine: { marginTop: 3, fontSize: 11.5, color: palette.inkSoft, textAlign: "center" },
  vaultEmoji: { fontSize: 40 },
  vaultTitle: { marginTop: 6, fontSize: 17, fontWeight: "800", color: palette.ink },
  vaultLine: { marginTop: 4, fontSize: 12.5, color: palette.inkSoft, textAlign: "center", lineHeight: 18 },
  privacy: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "700",
    color: palette.inkSoft,
  },
});
