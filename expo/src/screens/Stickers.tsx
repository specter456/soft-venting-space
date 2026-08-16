import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { ClayButton, ClayChip, hexWithAlpha } from "../components/Clay";
import {
  STICKER_ACCESSORIES,
  STICKER_COLORS,
  STICKER_EXPRESSIONS,
  STICKER_EYES,
  STICKER_MOUTHS,
} from "../data";
import { captureViewToFile } from "../capture";
import { createVaultItem } from "../db";
import { clayShadow, palette, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

type Props = NativeStackScreenProps<RootStackParamList, "Stickers">;

interface Config {
  color: string;
  eyes: string;
  mouth: string;
  blush: boolean;
  tear: boolean;
  accessory?: string;
}

/** Adorable emotional sticker maker — faces made of soft shapes, not faces. */
export default function StickerStudio({ navigation }: Props) {
  const [config, setConfig] = React.useState<Config>({
    color: STICKER_COLORS[0].hex,
    eyes: STICKER_EXPRESSIONS[0].eyes,
    mouth: STICKER_EXPRESSIONS[0].mouth,
    blush: STICKER_EXPRESSIONS[0].blush,
    tear: STICKER_EXPRESSIONS[0].tear,
  });
  const [saved, setSaved] = React.useState(false);
  const faceRef = React.useRef<View>(null);

  const pickExpression = (exp: (typeof STICKER_EXPRESSIONS)[number]) => {
    setConfig((c) => ({ ...c, eyes: exp.eyes, mouth: exp.mouth, blush: exp.blush, tear: exp.tear }));
  };

  const save = async () => {
    // Capture the real sticker face as a PNG so the vault shows the image,
    // not a placeholder emoji. Falls back to the art tile if capture fails.
    const fileUri = await captureViewToFile(faceRef);
    createVaultItem({
      kind: "sticker",
      art: "🧸",
      bg: "tile-cream",
      caption: "made sticker",
      data: JSON.stringify(config),
      fileUri: fileUri ?? undefined,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigation.goBack();
    }, 900);
  };

  return (
    <Screen title="Sticker Studio" subtitle="Make a tiny feeling you can keep">
      {/* live preview */}
      <View style={styles.previewWrap}>
        <View ref={faceRef} style={[styles.stickerFace, { backgroundColor: config.color }, clayShadow(true)]}>
          <View style={styles.eyesRow}>
            {STICKER_EYES.find((e) => e.id === config.eyes)?.render.split(" ")?.map((part, i) => (
              <Text key={i} style={styles.eyeGlyph}>
                {part}
              </Text>
            ))}
          </View>
          <Text style={styles.mouthGlyph}>{STICKER_MOUTHS.find((m) => m.id === config.mouth)?.render}</Text>
          {config.blush ? (
            <View style={styles.blushRow}>
              <View style={styles.blush} />
              <View style={styles.blush} />
            </View>
          ) : null}
          {config.tear ? <Text style={styles.tear}>💧</Text> : null}
          {config.accessory ? (
            <Text style={styles.accessory}>{config.accessory}</Text>
          ) : null}
        </View>
        <Text style={styles.previewLabel}>your sticker, live</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        <Section title="Expression">
          <View style={styles.chipRow}>
            {STICKER_EXPRESSIONS.map((exp) => (
              <ClayChip key={exp.id} label={exp.label} selected={config.eyes === exp.eyes && config.mouth === exp.mouth} onPress={() => pickExpression(exp)} bg={config.color} />
            ))}
          </View>
        </Section>

        <Section title="Eyes">
          <View style={styles.chipRow}>
            {STICKER_EYES.map((e) => (
              <ClayChip key={e.id} label={e.render} selected={config.eyes === e.id} onPress={() => setConfig((c) => ({ ...c, eyes: e.id }))} bg={config.color} />
            ))}
          </View>
        </Section>

        <Section title="Mouth">
          <View style={styles.chipRow}>
            {STICKER_MOUTHS.map((m) => (
              <ClayChip key={m.id} label={m.render} selected={config.mouth === m.id} onPress={() => setConfig((c) => ({ ...c, mouth: m.id }))} bg={config.color} />
            ))}
          </View>
        </Section>

        <Section title="Details">
          <View style={styles.chipRow}>
            <ClayChip label="blush" selected={config.blush} onPress={() => setConfig((c) => ({ ...c, blush: !c.blush }))} bg={config.color} />
            <ClayChip label="tears 💧" selected={config.tear} onPress={() => setConfig((c) => ({ ...c, tear: !c.tear }))} bg={config.color} />
          </View>
        </Section>

        <Section title="Accessory (tap to toggle)">
          <View style={styles.chipRow}>
            {STICKER_ACCESSORIES.map((acc) => (
              <ClayChip key={acc} label={acc} selected={config.accessory === acc} onPress={() => setConfig((c) => ({ ...c, accessory: c.accessory === acc ? undefined : acc }))} bg={config.color} />
            ))}
          </View>
        </Section>

        <Section title="Base color">
          <View style={styles.colorRow}>
            {STICKER_COLORS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setConfig((prev) => ({ ...prev, color: c.hex }))}
                style={[styles.colorDot, { backgroundColor: c.hex }, config.color === c.hex && styles.colorSelected]}
              />
            ))}
          </View>
        </Section>
      </ScrollView>

      <ClayButton label={saved ? "💾 Saved!" : "🔒 Save to vault"} color="primary" size="lg" onPress={save} style={{ marginTop: 6 }} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: "center", marginTop: 4 },
  stickerFace: {
    width: 170,
    height: 170,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  eyesRow: { flexDirection: "row", gap: 18 },
  eyeGlyph: { fontSize: 24, color: palette.ink },
  mouthGlyph: { fontSize: 26, color: palette.ink, marginTop: 4 },
  blushRow: { flexDirection: "row", gap: 34, marginTop: 6 },
  blush: {
    width: 18,
    height: 9,
    borderRadius: 9,
    backgroundColor: hexWithAlpha(palette.blushDeep, 0.75),
  },
  tear: { position: "absolute", top: 46, right: 44, fontSize: 22 },
  accessory: { position: "absolute", top: -6, right: -4, fontSize: 30 },
  previewLabel: { marginTop: 10, fontSize: 12, color: palette.inkFaint, fontWeight: "600" },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: palette.inkSoft, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorSelected: { borderWidth: 3, borderColor: palette.ink },
});
