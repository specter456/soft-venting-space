import { toast } from "sonner";

/** Never show raw technical text — every failure gets a gentle explanation. */
export function friendlyErrorText(): string {
  return "Something went soft for a second. Don't worry — your feelings are all still safe on this device. Try again, and if it keeps happening, we're here for you.";
}

/** Show a friendly toast for an unexpected error (no raw message). */
export function showFriendlyErrorToast(): void {
  toast.error("A soft hiccup", {
    description: friendlyErrorText(),
    action: {
      label: "Try again",
      onClick: () => window.location.reload(),
    },
  });
}
