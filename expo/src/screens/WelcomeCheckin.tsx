import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClayButton, ClayCard, ClayChip } from "../components/Clay";
import { CHECKIN_OPTIONS, todayDateKey } from "../data";
import { setKv } from "../db";
import { KV_ONBOARDING_DONE } from "../db";
import { useLock } from "../lock-context";
import { clayShadow, palette, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

type Props = NativeStackScreenProps<RootStackParamList, "Checkin">;

/** Gentle welcome check-in: multi-select day checklist + "what now" actions. */
export default function WelcomeCheckinScreen({ navigation }: Props) {
  const [picked, setPicked] = React.useState<string[]>([]);
  const lock = useLock();

  const toggle = (option: string) => {
    setPicked((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  };

  const finish = () => {
    // checklist answers stay on-device under today's date key
    void setKv(`checkin-${todayDateKey()}`, JSON.stringify(picked));
    void setKv(KV_ONBOARDING_DONE, "true");
    navigation.replace("Home");
    // gentle first-run lock setup — skippable, and settable anytime from Home
    lock.openSetup();
  };

  const goTo = (name: "Record" | "Create" | "Calm" | "Diary") => {
    void setKv(`checkin-${todayDateKey()}`, JSON.stringify(picked));
    void setKv(KV_ONBOARDING_DONE, "true");
    navigation.replace(name === "Record" ? "Record" : name === "Create" ? "Create" : name === "Calm" ? "Calm" : "Diary");
    lock.openSetup();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcome}>Welcome to Venting.</Text>
        <Text style={styles.hope}>We hope you had a nice day. 💛</Text>

        <ClayCard style={{ marginTop: 24 }} bg={palette.surface}>
          <Text style={styles.sectionTitle}>How was your day?</Text>
          <Text style={styles.sectionHint}>Take any that feel true — or none at all.</Text>
          <View style={styles.options}>
            {CHECKIN_OPTIONS.map((option) => (
              <ClayChip
                key={option}
                label={option}
                selected={picked.includes(option)}
                onPress={() => toggle(option)}
                bg={picked.includes(option) ? palette.lavender : palette.cream}
              />
            ))}
          </View>
        </ClayCard>

        <ClayCard style={{ marginTop: 18 }} bg={palette.surface}>
          <Text style={styles.sectionTitle}>What would you like to do now?</Text>
          <View style={styles.nowGrid}>
            <NowButton emoji="🎙️" label="Record" bg={palette.blush} onPress={() => goTo("Record")} />
            <NowButton emoji="🎨" label="Create" bg={palette.peach} onPress={() => goTo("Create")} />
            <NowButton emoji="🫧" label="Calm" bg={palette.mint} onPress={() => goTo("Calm")} />
            <NowButton emoji="📖" label="Diary" bg={palette.lavender} onPress={() => goTo("Diary")} />
          </View>
        </ClayCard>

        <ClayButton
          label="Skip for now"
          color="ghost"
          onPress={finish}
          textStyle={{ color: palette.inkSoft }}
        />
        <Text style={styles.privacy}>🔒 Private and safe. Only you can see this.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function NowButton({
  emoji,
  label,
  bg,
  onPress,
}: {
  emoji: string;
  label: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <ClayCard style={{ width: "47%", alignItems: "center", paddingVertical: 18 }} bg={bg} onPress={onPress}>
      <Text style={styles.nowEmoji}>{emoji}</Text>
      <Text style={styles.nowLabel}>{label}</Text>
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcome: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: "800",
    color: palette.ink,
  },
  hope: {
    marginTop: 6,
    fontSize: 15,
    color: palette.inkSoft,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12.5,
    color: palette.inkSoft,
    marginBottom: 14,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nowGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginTop: 6,
  },
  nowEmoji: {
    fontSize: 30,
  },
  nowLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: palette.ink,
  },
  privacy: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 12.5,
    color: palette.inkSoft,
    fontWeight: "600",
  },
});
