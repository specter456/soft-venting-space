import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { clayShadow, palette, radius } from "../theme";
import { hexWithAlpha } from "./Clay";

/**
 * Soft 4-digit passcode pad. Gentle shake on wrong code, springy dots,
 * plush clay keys. `biometricNode` renders under the pad when biometrics
 * are available (Face ID / fingerprint icons).
 */
export function LockPad({
  value,
  onChange,
  length = 4,
  shake,
  biometricNode,
}: {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  shake?: number;
  biometricNode?: React.ReactNode;
}) {
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (shake && shake > 0) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
      ]).start();
    }
  }, [shake, shakeAnim]);

  const press = (digit: string) => {
    if (value.length >= length) return;
    onChange(value + digit);
  };

  const remove = () => {
    if (!value) return;
    onChange(value.slice(0, -1));
  };

  return (
    <View>
      <Animated.View style={{ flexDirection: "row", justifyContent: "center", gap: 14, transform: [{ translateX: shakeAnim }] }}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < value.length ? palette.lavenderDeep : hexWithAlpha(palette.lavenderDeep, 0.25),
                borderColor: i < value.length ? palette.lavenderDeep : palette.inkFaint,
              },
              i < value.length && clayShadow(false),
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.pad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <PadKey key={d} label={d} onPress={() => press(d)} />
        ))}
        <View style={styles.keyWrap}>{biometricNode}</View>
        <PadKey label="0" onPress={() => press("0")} />
        <View style={styles.keyWrap}>
          <Pressable onPress={remove} style={({ pressed }) => [styles.key, styles.ghost, pressed && { opacity: 0.6 }]}>
            <Text style={styles.ghostText}>⌫</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PadKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.keyWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.key,
          clayShadow(true),
          pressed && { transform: [{ scale: 0.92 }, { translateY: 2 }], shadowOpacity: 0 },
        ]}
        accessibilityLabel={`Digit ${label}`}
      >
        <Text style={styles.keyLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  pad: {
    marginTop: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  keyWrap: {
    width: "33.333%",
    alignItems: "center",
    marginBottom: 14,
  },
  key: {
    width: 74,
    height: 74,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  keyLabel: {
    fontSize: 28,
    fontWeight: "700",
    color: palette.ink,
  },
  ghost: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  ghostText: {
    fontSize: 24,
    color: palette.inkSoft,
  },
});
