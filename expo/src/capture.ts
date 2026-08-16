import { Platform } from "react-native";
import { storeFile } from "./db";

/**
 * Capture a native view as a real PNG and store it in private on-device
 * storage. The vault then shows the actual image instead of a placeholder
 * emoji. Falls back to null (keep the cozy emoji tile) when capture is
 * unavailable — e.g. on the web build of this Expo project, where the main
 * web app captures real canvases itself.
 */

type CaptureRef = (ref: unknown, opts: Record<string, unknown>) => Promise<string>;

let captureRefImpl: CaptureRef | null = null;
if (Platform.OS !== "web") {
  try {
    // react-native-view-shot is bundled inside Expo Go — no extra native setup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    captureRefImpl = (require("react-native-view-shot") as { captureRef: CaptureRef }).captureRef ?? null;
  } catch {
    captureRefImpl = null;
  }
}

export async function captureViewToFile(ref: { current: unknown } | null): Promise<string | null> {
  if (Platform.OS === "web" || !captureRefImpl || !ref?.current) return null;
  try {
    const tmpUri = await captureRefImpl(ref.current, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    return await storeFile(tmpUri, "png");
  } catch {
    return null; // capture can fail on some devices — never crash, keep art tile
  }
}
