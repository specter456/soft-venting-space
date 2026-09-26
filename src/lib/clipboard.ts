/**
 * Clipboard helpers — every copy action in the app gives instant visible
 * feedback: the button label flips to "copied! ✓" for 2 seconds and a tiny
 * soft toast confirms "copied to your clipboard ✓".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Copy text to the clipboard. Falls back to a hidden textarea when the
 *  async clipboard API is unavailable (e.g. permissions in an iframe). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Tiny soft toast shown after a successful copy. */
export function showCopiedToast(): void {
  toast("copied to your clipboard ✓");
}

/** Gentle failure toast for a copy that didn't work. */
export function showCopyFailedToast(): void {
  toast("couldn't copy that — try again in a moment");
}

/**
 * Shared copy-feedback state: `copied` is true for 2 seconds after
 * `markCopied()` so the button can read "copied! ✓".
 */
export function useCopyFeedback(): {
  copied: boolean;
  markCopied: () => void;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const markCopied = useCallback(() => {
    setCopied(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { copied, markCopied };
}
