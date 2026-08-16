import React from "react";
import { Platform } from "react-native";

export const IS_WEB = Platform.OS === "web";

/** True on iOS Safari/WebView where install requires the share menu. */
export const IS_IOS_SAFARI = (): boolean => {
  if (!IS_WEB || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
};

/** True when the app already runs standalone (installed PWA). */
export const IS_INSTALLED_PWA = (): boolean => {
  if (!IS_WEB || typeof window === "undefined") return false;
  return (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (navigator as any).standalone === true
  );
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA install support. Chrome/Edge fire `beforeinstallprompt`; we capture it
 * so Settings can show an "Install app on home screen" button that calls
 * prompt(). iOS Safari never fires it — Settings shows share-menu
 * instructions instead.
 */
export function usePwaInstall(): {
  canInstall: boolean;
  install: () => Promise<boolean>;
  iosSafari: boolean;
  installed: boolean;
} {
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [iosSafari] = React.useState(IS_IOS_SAFARI);
  const [installed] = React.useState(IS_INSTALLED_PWA);

  React.useEffect(() => {
    if (!IS_WEB) return;
    const onReady = () => {
      const evt = (window as any).__ventingInstallPrompt as BeforeInstallPromptEvent | undefined;
      if (evt) setPromptEvent(evt);
    };
    window.addEventListener("venting-install-ready", onReady);
    onReady();
    return () => window.removeEventListener("venting-install-ready", onReady);
  }, []);

  const install = async (): Promise<boolean> => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      return true;
    }
    return false;
  };

  return { canInstall: !!promptEvent && !installed, install, iosSafari, installed };
}
