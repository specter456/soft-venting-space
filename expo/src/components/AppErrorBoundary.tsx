import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { clayShadow, palette, radius } from "../theme";

/**
 * Friendly copy for any unexpected failure. Never raw error codes or
 * technical text — just warmth and the assurance that data is safe.
 */
export const friendlyErrorText =
  "Something went soft for a second. Don't worry — your feelings are all still safe on this device. Try again, and if it keeps happening, we're here for you.";

/**
 * Global safety net for errors that happen outside React (async callbacks,
 * storage reads, timers). Logs for the developer, but the user never sees a
 * raw stack trace — the error boundary handles the visible fallback.
 */
export function installGlobalErrorHandlers(): void {
  try {
    const prev = (ErrorUtils as { getGlobalHandler?: () => unknown }).getGlobalHandler?.();
    (ErrorUtils as { setGlobalHandler: (fn: (e: unknown, isFatal?: boolean) => void) => void }).setGlobalHandler(
      (error: unknown, isFatal?: boolean) => {
        if (__DEV__) {
          console.warn("[venting] Unhandled error", error);
        }
        // Let the original handler run so dev tooling still works.
        if (typeof prev === "function") {
          (prev as (e: unknown, isFatal?: boolean) => void)(error, isFatal);
        }
      },
    );
  } catch {
    /* ErrorUtils may be unavailable on web — safe to ignore. */
  }
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      event.preventDefault();
      if (__DEV__) console.warn("[venting] window error", event.message);
    });
    window.addEventListener("unhandledrejection", (event) => {
      event.preventDefault();
      if (__DEV__) console.warn("[venting] unhandled rejection", event.reason);
    });
  }
}

/**
 * Friendly full-screen fallback. No raw error codes — a soft cloud, a warm
 * explanation, and two gentle ways forward: retry, or keep using the app
 * offline (everything is stored on-device, so this always works).
 */
export function FriendlyFallback({
  onRetry,
  onContinue,
  title = "Something went soft.",
}: {
  onRetry: () => void;
  onContinue?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, clayShadow(true)]}>
          <View style={styles.seal}>
            <Text style={styles.sealEmoji}>☁️</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{friendlyErrorText}</Text>
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, clayShadow(true), pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
          {onContinue ? (
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.continue, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <Text style={styles.continueLabel}>Continue offline</Text>
            </Pressable>
          ) : null}
          <Text style={styles.privacy}>🔒 Private and safe. Only you can see this.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn("[venting] Boundary caught error:", error);
  }

  private retry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <FriendlyFallback
          onRetry={this.retry}
          onContinue={this.retry}
        />
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 26,
    paddingVertical: 32,
    alignItems: "center",
  },
  seal: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  sealEmoji: { fontSize: 32 },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSoft,
    textAlign: "center",
  },
  retry: {
    marginTop: 22,
    backgroundColor: palette.lavender,
    borderRadius: radius.full,
    paddingHorizontal: 32,
    paddingVertical: 13,
    minWidth: 160,
    alignItems: "center",
  },
  pressed: { transform: [{ translateY: 2 }, { scale: 0.97 }], shadowOpacity: 0 },
  retryLabel: { color: palette.ink, fontSize: 15, fontWeight: "700" },
  continue: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  continueLabel: { color: palette.inkSoft, fontSize: 13, fontWeight: "700" },
  privacy: {
    marginTop: 22,
    fontSize: 11.5,
    fontWeight: "700",
    color: palette.inkSoft,
    textAlign: "center",
  },
});
