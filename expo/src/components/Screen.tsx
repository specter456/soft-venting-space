import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clayShadow, palette, radius } from "../theme";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

/**
 * Soft full-screen wrapper: pastel gradient-ish background, cozy header with
 * a back clay button, and scrollable pastel content.
 */
export function Screen({
  children,
  title,
  subtitle,
  right,
  onBack,
  scroll = true,
  footer,
  bottomBar,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  scroll?: boolean;
  footer?: React.ReactNode;
  /** Floating overlay rendered at the bottom (e.g. the TaskBar). */
  bottomBar?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const back = () => {
    if (onBack) onBack();
    else if (navigation.canGoBack()) navigation.goBack();
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={back}
        style={({ pressed }) => [
          styles.backBtn,
          clayShadow(true),
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
        accessibilityLabel="Go back"
      >
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ width: 42 }}>{right}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, style]} edges={["top", "bottom"]}>
      <View
        pointerEvents="none"
        style={[styles.glow, { left: -width * 0.25, top: -80, backgroundColor: palette.lavender }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glow, { right: -width * 0.3, top: 160, backgroundColor: palette.blush }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glow, { left: -width * 0.2, bottom: -100, backgroundColor: palette.mint }]}
      />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, bottomBar ? styles.contentWithBar : null]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, bottomBar ? styles.contentWithBar : null]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, bottomBar ? styles.footerWithBar : null]}>{footer}</View> : null}
      {bottomBar ? <View pointerEvents="box-none" style={styles.bottomBar}>{bottomBar}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 28,
    color: palette.ink,
    marginTop: -3,
    lineHeight: 30,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink,
  },
  subtitle: {
    fontSize: 12,
    color: palette.inkSoft,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  contentWithBar: {
    paddingBottom: 120,
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  footerWithBar: {
    paddingBottom: 96,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
});
