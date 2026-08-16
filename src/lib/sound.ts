/**
 * Tiny synthesized page-turn sound. Generated locally with WebAudio — no
 * audio files, no network calls, nothing leaves the device. Fails silently
 * if audio isn't available (autoplay policies, old browsers, etc.).
 */

import { getKvFromCache } from "./db";

/** Sounds on/off — read from on-device prefs (default on). */
export function soundsEnabled(): boolean {
  return getKvFromCache("soundsEnabled") !== "false";
}

let audioCtx: AudioContext | null = null;

export function playPageTurn(): void {
  if (!soundsEnabled()) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

    const ctx = audioCtx;
    const now = ctx.currentTime;
    const duration = 0.16;

    // a short, soft noise burst shaped like the swish of a paper page
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 850;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  } catch {
    // audio unavailable — stay quiet, never crash
  }
}
