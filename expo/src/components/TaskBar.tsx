import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../theme-context";
import { clayShadow, radius } from "../theme";
import { hexWithAlpha } from "./Clay";
import { usePressGuard } from "../hooks";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

export const MAIN_TABS = [
  { name: "Home", emoji: "🏠", label: "Home", route: "Home" as const },
  { name: "Record", emoji: "🎙️", label: "Record", route: "Record" as const },
  { name: "Create", emoji: "🎨", label: "Create", route: "Create" as const },
  { name: "Calm", emoji: "🫧", label: "Calm", route: "Calm" as const },
  { name: "Diary", emoji: "📖", label: "Diary", route: "Diary" as const },
];

/**
 * The soft rounded bottom taskbar — exactly five tabs: Home, Record, Create,
 * Calm, Diary. Settings deliberately lives in the Home header gear, not here.
 */
export function TaskBar() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const active = route.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 10 }]}
    >
      <View style={[styles.bar, { backgroundColor: colors.card }, clayShadow(true)]}>
        {MAIN_TABS.map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            active={active === tab.name}
            onPress={() => navigation.navigate(tab.route)}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: (typeof MAIN_TABS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const guarded = usePressGuard(onPress);
  return (
    <Pressable
      onPress={guarded}
      style={({ pressed }) => [
        styles.tab,
        active && { backgroundColor: hexWithAlpha(colors.accent, 0.55) },
        pressed && { transform: [{ scale: 0.92 }] },
      ]}
      accessibilityLabel={tab.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabEmoji, active && styles.tabEmojiActive]}>{tab.emoji}</Text>
      <Text style={[styles.tabLabel, { color: active ? colors.ink : colors.inkSoft }]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  bar: {
    flexDirection: "row",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
    minWidth: 320,
    maxWidth: 420,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: radius.full,
    gap: 1,
  },
  tabEmoji: {
    fontSize: 19,
    opacity: 0.75,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
});
