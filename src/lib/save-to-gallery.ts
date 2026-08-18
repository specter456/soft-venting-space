/**
 * Save a data URL or Blob to the user's device.
 * On web: triggers a file download.
 * On native (future): would use expo-media-library.
 * This is user-initiated only — nothing is ever uploaded.
 */
import { toast } from "sonner";

export async function saveToGallery(
  dataUrlOrBlob: string | Blob,
  filename: string,
): Promise<void> {
  try {
    let blob: Blob;

    if (dataUrlOrBlob instanceof Blob) {
      blob = dataUrlOrBlob;
    } else {
      // data URL → Blob
      const res = await fetch(dataUrlOrBlob);
      blob = await res.blob();
    }

    // Web: trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast("saved to your gallery 🌷", {
      description: `${filename} is in your downloads.`,
    });
  } catch {
    toast("couldn't save to gallery", {
      description: "Please try again in a moment.",
    });
  }
}
