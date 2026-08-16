import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { hexWithAlpha } from "./Clay";
import { clayShadow, palette, radius } from "../theme";

/**
 * Gentle, non-blocking offline notice. Venting is fully local — being
 * offline changes nothing — so this simply explains that clearly instead of
 * showing an error. The banner disappears by itself when the connection
 * returns.
 */
export function OfflineBanner() {
  const [online, setOnline] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    void NetInfo.fetch().then((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsub;
  }, []);

  if (online !== false) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.chip, clayShadow(false)]}>
        <Text style={styles.text}>
          🕊️ You&apos;re offline — that&apos;s okay. Everything is saved on this device, and nothing
          here needs a connection.
        </Text>
      </View>
    </View>
  );
}

/**
 * Friendly connection message with the two required actions. Use this for any
 * network-dependent step (login, sync, backups). Venting keeps working
 * locally either way, so "Continue offline" is always safe.
 */
export function ConnectionFallback({
  onRetry,
  onContinue,
}: {
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={[styles.fallbackCard, clayShadow(true)]}>
      <View style={styles.fallbackSeal}>
        <Text style={styles.fallbackSealEmoji}>📡</Text>
      </View>
      <Text style={styles.fallbackTitle}>We couldn&apos;t connect</Text>
      <Text style={styles.fallbackBody}>
        This usually means there is no internet connection right now. Your private data is still
        safe on this device — you can keep using Venting without a connection.
      </Text>
      <View style={styles.fallbackActions}>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retryBtn, clayShadow(false), pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Text style={styles.continueLabel}>Continue offline</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    zIndex: 60,
    alignItems: "center",
  },
  chip: {
    backgroundColor: palette.surface,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: 420,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.ink,
    textAlign: "center",
    lineHeight: 17,
  },
  fallbackCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
  },
  fallbackSeal: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: palette.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackSealEmoji: { fontSize: 26 },
  fallbackTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
  },
  fallbackBody: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    color: palette.inkSoft,
    textAlign: "center",
  },
  fallbackActions: {
    marginTop: 18,
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  retryBtn: {
    backgroundColor: palette.lavender,
    borderRadius: radius.full,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: "center",
  },
  pressed: { transform: [{ translateY: 2 }, { scale: 0.97 }], shadowOpacity: 0 },
  retryLabel: { color: palette.ink, fontSize: 14.5, fontWeight: "700" },
  continueBtn: { paddingHorizontal: 20, paddingVertical: 6 },
  continueLabel: { color: palette.inkSoft, fontSize: 13, fontWeight: "700" },
});
