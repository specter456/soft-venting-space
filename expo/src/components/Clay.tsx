import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { clayShadow, palette, radius } from "../theme";
import { usePressGuard } from "../hooks";

/* ─── ClayCard: the inflated pastel surface ────────────────────────── */

export function ClayCard({
  children,
  style,
  bg = palette.surface,
  raised = true,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  raised?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.card, { backgroundColor: bg }, clayShadow(raised), style]}>
      {children}
    </View>
  );
  const guarded = usePressGuard(onPress);
  if (!onPress) return content;
  return (
    <Pressable onPress={guarded} style={({ pressed }) => (pressed ? { opacity: 0.9, transform: [{ scale: 0.985 }] } : undefined)}>
      {content}
    </Pressable>
  );
}

/* ─── ClayButton: plush pressable button ───────────────────────────── */

const BTN_COLORS = {
  primary: palette.lavender,
  peach: palette.peach,
  blush: palette.blush,
  mint: palette.mint,
  sky: palette.sky,
  cream: palette.cream,
  white: palette.white,
  surface: palette.surface,
  ghost: "transparent",
} as const;

export type ClayButtonColor = keyof typeof BTN_COLORS;

export function ClayButton({
  label,
  icon,
  onPress,
  color = "primary",
  variant = "raised",
  disabled,
  loading,
  style,
  textStyle,
  size = "md",
}: {
  label?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  color?: ClayButtonColor;
  variant?: "raised" | "pressed" | "soft";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<any>;
  size?: "sm" | "md" | "lg";
}) {
  const bg =
    color === "ghost"
      ? "transparent"
      : variant === "pressed"
        ? BTN_COLORS[color]
        : variant === "soft"
          ? hexWithAlpha(BTN_COLORS[color], 0.45)
          : BTN_COLORS[color];

  const pad = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSz = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  const guarded = usePressGuard(onPress);

  return (
    <Pressable
      onPress={guarded}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, paddingVertical: pad, paddingHorizontal: pad + 8, borderRadius: radius.full },
        variant === "raised" && !pressed && clayShadow(true),
        pressed && {
          transform: [{ translateY: 3 }, { scale: 0.97 }],
          shadowOpacity: 0,
          elevation: 1,
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.ink} size="small" />
      ) : (
        <View style={styles.btnRow}>
          {icon}
          {label ? (
            <Text style={[styles.btnLabel, { fontSize: fontSz }, textStyle]}>{label}</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/* ─── ClayChip: small rounded tag ───────────────────────────────────── */

export function ClayChip({
  label,
  selected,
  onPress,
  bg = palette.lavender,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  bg?: string;
  icon?: React.ReactNode;
}) {
  const guarded = usePressGuard(onPress);
  return (
    <Pressable
      onPress={guarded}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? bg : hexWithAlpha(bg, 0.35),
          borderWidth: selected ? 0 : 1,
          borderColor: hexWithAlpha(bg, 0.9),
        },
        selected && clayShadow(false),
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      {icon}
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

/* ─── MoodBubble: the round mood selector ──────────────────────────── */

export function MoodBubble({
  emoji,
  label,
  bg,
  selected,
  onPress,
  size = 62,
}: {
  emoji: string;
  label: string;
  bg: string;
  selected?: boolean;
  onPress?: () => void;
  size?: number;
}) {
  const guarded = usePressGuard(onPress);
  return (
    <Pressable onPress={guarded} style={{ alignItems: "center", width: size + 12 }}>
      <View
        style={[
          styles.bubble,
          { width: size, height: size, backgroundColor: selected ? bg : hexWithAlpha(bg, 0.4) },
          selected && clayShadow(false),
        ]}
      >
        <Text style={{ fontSize: size * 0.44 }}>{emoji}</Text>
      </View>
      <Text style={styles.bubbleLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── helpers ──────────────────────────────────────────────────────── */

export function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 18,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnLabel: {
    color: palette.ink,
    fontWeight: "700",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  chipLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  bubble: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleLabel: {
    marginTop: 6,
    fontSize: 11.5,
    color: palette.inkSoft,
    fontWeight: "600",
  },
});
