/**
 * Soothing music for the Games section.
 *
 * All built-in tracks ("soft rain", "warm hum", "calm piano", "night wind")
 * are synthesized locally with WebAudio — no audio files, no network calls,
 * so they always work offline. "From your downloads" plays a local audio
 * file on-device via a hidden file input + URL.createObjectURL; the file is
 * never uploaded or stored anywhere.
 *
 * Everything is wrapped in try/catch: if audio is unavailable (autoplay
 * policies, old browsers, weird webviews) the app simply stays quiet and
 * never crashes.
 */

import { useSyncExternalStore } from "react";
import { safeGetItem, safeSetItem } from "./safe-storage";

const KV_VOLUME = "venting-music-volume";
const KV_TRACK = "venting-music-track";
const KV_AMBIENT_UPLOADS = "venting-music-ambient-uploads";
const KV_GAME_UPLOADS = "venting-music-game-uploads";

export type BuiltinTrackId = "rain" | "hum" | "piano" | "wind";

export interface BuiltinTrack {
  id: BuiltinTrackId;
  label: string;
  emoji: string;
  hint: string;
}

export const BUILTIN_TRACKS: BuiltinTrack[] = [
  { id: "rain", label: "soft rain", emoji: "🌧️", hint: "a gentle patter, like rain on leaves" },
  { id: "hum", label: "warm hum", emoji: "🤍", hint: "a low warm glow, like a far-away choir" },
  { id: "piano", label: "calm piano", emoji: "🎹", hint: "slow, soft notes that wander" },
  { id: "wind", label: "night wind", emoji: "🌙", hint: "a soft breeze through quiet trees" },
];

export type MusicContext = "ambient" | "game";

export interface UploadedTrack {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL — persists across reloads
}

export type MusicTrack =
  | { kind: "builtin"; id: BuiltinTrackId }
  | { kind: "local"; name: string; url: string };

export interface MusicState {
  /** Sounding right now (false while paused). */
  playing: boolean;
  /** Music is on at all — playing or paused. */
  active: boolean;
  track: MusicTrack | null;
  volume: number; // 0..1
  context: MusicContext;
  ambientUploads: UploadedTrack[];
  gameUploads: UploadedTrack[];
}

function readVolume(): number {
  const raw = safeGetItem(KV_VOLUME);
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return 0.35; // default: softly on
  return Math.min(1, Math.max(0, n));
}

function readTrack(): BuiltinTrackId | null {
  const raw = safeGetItem(KV_TRACK);
  return BUILTIN_TRACKS.some((t) => t.id === raw) ? (raw as BuiltinTrackId) : null;
}

function readUploads(key: string): UploadedTrack[] {
  try {
    const raw = safeGetItem(key);
    if (raw) return JSON.parse(raw) as UploadedTrack[];
  } catch { /* ignore */ }
  return [];
}

function writeUploads(key: string, tracks: UploadedTrack[]): void {
  safeSetItem(key, JSON.stringify(tracks));
}

type Cleanup = () => void;

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function gainAt(ctx: AudioContext, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function lfo(ctx: AudioContext, freq: number, depth: number, target: AudioParam): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = freq;
  const g = gainAt(ctx, depth);
  osc.connect(g);
  g.connect(target);
  osc.start();
  return osc;
}

/* ─── Built-in track synthesis — each returns a cleanup ───────────── */

function startRain(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 950;
  lp.Q.value = 0.5;
  const g = gainAt(ctx, 0.16);
  src.connect(lp);
  lp.connect(g);
  g.connect(out);
  src.start();
  const lfo1 = lfo(ctx, 0.13, 240, lp.frequency);
  return () => {
    try {
      src.stop();
      lfo1.stop();
      src.disconnect();
      lp.disconnect();
      g.disconnect();
    } catch {
      /* already stopped */
    }
  };
}

function startWind(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 520;
  bp.Q.value = 0.55;
  const g = gainAt(ctx, 0.12);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start();
  const lfo1 = lfo(ctx, 0.07, 280, bp.frequency);
  const lfo2 = lfo(ctx, 0.11, 0.035, g.gain);
  return () => {
    try {
      src.stop();
      lfo1.stop();
      lfo2.stop();
      src.disconnect();
      bp.disconnect();
      g.disconnect();
    } catch {
      /* already stopped */
    }
  };
}

function startHum(ctx: AudioContext, out: AudioNode): Cleanup {
  const freqs = [130.81, 196.0, 220.0, 329.63]; // C3 G3 A3 E4 — a soft warm chord
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const lfos: OscillatorNode[] = [];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * 3;
    const g = gainAt(ctx, 0.05);
    osc.connect(g);
    g.connect(out);
    osc.start();
    oscs.push(osc);
    gains.push(g);
    lfos.push(lfo(ctx, 0.09 + i * 0.02, 0.02, g.gain));
  });
  return () => {
    try {
      oscs.forEach((o) => o.stop());
      lfos.forEach((o) => o.stop());
      oscs.forEach((o) => o.disconnect());
      gains.forEach((g) => g.disconnect());
    } catch {
      /* already stopped */
    }
  };
}

/** Calm piano — slow wandering notes over a soft low pad. */
function startPiano(ctx: AudioContext, out: AudioNode): Cleanup {
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]; // C D E G A C D
  let nextTime = ctx.currentTime + 0.15;
  let noteIdx = 2;
  let stopped = false;

  const padGainGarbage: OscillatorNode[] = [];
  const padGain = gainAt(ctx, 0.028);
  padGain.gain.setValueAtTime(0, ctx.currentTime);
  padGain.gain.linearRampToValueAtTime(0.028, ctx.currentTime + 3);
  const pad = ctx.createBiquadFilter();
  pad.type = "lowpass";
  pad.frequency.value = 520;
  [130.81, 196.0].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(pad);
    o.start();
    padGainGarbage.push(o);
  });
  pad.connect(padGain);
  padGain.connect(out);

  const playNote = (when: number, freq: number) => {
    const g = gainAt(ctx, 0.0001);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.11, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 3.2);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    const oscs: OscillatorNode[] = [];
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    const o2g = gainAt(ctx, 0.22);
    const o3 = ctx.createOscillator();
    o3.type = "triangle";
    o3.frequency.value = freq * 1.003;
    o3.detune.value = 4;
    const o3g = gainAt(ctx, 0.3);
    oscs.push(o1, o2, o3);
    o1.connect(lp);
    o2.connect(o2g);
    o2g.connect(lp);
    o3.connect(o3g);
    o3g.connect(lp);
    lp.connect(g);
    g.connect(out);
    oscs.forEach((o) => {
      o.start(when);
      o.stop(when + 3.3);
    });
  };

  const timer = window.setInterval(() => {
    if (stopped) return;
    while (nextTime < ctx.currentTime + 0.5) {
      // gentle random walk through the scale, never jumping far
      const step = Math.floor(Math.random() * 3) - 1;
      noteIdx = Math.min(scale.length - 1, Math.max(0, noteIdx + step));
      const freq = scale[noteIdx];
      playNote(nextTime, freq);
      // sometimes a soft second note above, like an echo
      if (Math.random() < 0.3 && noteIdx < scale.length - 2) {
        playNote(nextTime + 0.35, scale[noteIdx + 1] * 0.5);
      }
      nextTime += 1.9 + Math.random() * 1.5;
    }
  }, 250);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    try {
      padGainGarbage.forEach((o) => o.stop());
      padGain.disconnect();
      pad.disconnect();
    } catch {
      /* already stopped */
    }
  };
}

/* ─── Engine ──────────────────────────────────────────────────────── */

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cleanups: Cleanup[] = [];
  private audioEl: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private fadeTimer: number | null = null;

  private state: MusicState = {
    playing: false,
    active: false,
    track: null,
    volume: readVolume(),
    context: "ambient",
    ambientUploads: readUploads(KV_AMBIENT_UPLOADS),
    gameUploads: readUploads(KV_GAME_UPLOADS),
  };

  private listeners = new Set<() => void>();

  /**
   * One-time global gesture listener: primes the AudioContext on the first
   * user interaction anywhere in the page so the first play() call works.
   */
  private gestureListener = (): void => {
    this.prime();
    window.removeEventListener("click", this.gestureListener);
    window.removeEventListener("touchstart", this.gestureListener);
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("click", this.gestureListener, { once: false });
      window.addEventListener("touchstart", this.gestureListener, { once: false });
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): MusicState => this.state;

  private setState(patch: Partial<MusicState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      return ctx;
    } catch {
      return null;
    }
  }

  private clearFadeTimer(): void {
    if (this.fadeTimer !== null) {
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private applyVolume(ramp = false): void {
    const v = this.state.volume;
    if (this.ctx && this.master) {
      try {
        if (ramp) {
          this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.3);
        } else {
          this.master.gain.setValueAtTime(v, this.ctx.currentTime);
        }
      } catch {
        /* ignore */
      }
    }
    if (this.audioEl) {
      try {
        this.audioEl.volume = v;
      } catch {
        /* ignore */
      }
    }
  }

  private hardStopBuiltins(): void {
    for (const c of this.cleanups) {
      try {
        c();
      } catch {
        /* ignore */
      }
    }
    this.cleanups = [];
  }

  /** Stop built-in layers + pause any local file, but keep nothing alive. */
  private hardStop(): void {
    this.clearFadeTimer();
    this.hardStopBuiltins();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.removeAttribute("src");
        this.audioEl.load();
      } catch {
        /* ignore */
      }
    }
    if (this.objectUrl) {
      try {
        URL.revokeObjectURL(this.objectUrl);
      } catch {
        /* ignore */
      }
      this.objectUrl = null;
    }
    this.setState({ playing: false, active: false, track: null });
  }

  private startBuiltin(id: BuiltinTrackId): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    this.hardStopBuiltins();
    try {
      if (ctx.state === "suspended") void ctx.resume();
      let cleanup: Cleanup = () => {};
      if (id === "rain") cleanup = startRain(ctx, this.master);
      else if (id === "wind") cleanup = startWind(ctx, this.master);
      else if (id === "hum") cleanup = startHum(ctx, this.master);
      else cleanup = startPiano(ctx, this.master);
      this.cleanups = [cleanup];
      // gentle fade-in so music never pops in
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.state.volume, ctx.currentTime + 1.4);
      safeSetItem(KV_TRACK, id);
    } catch {
      this.hardStopBuiltins();
    }
  }

  private startLocal(url: string): void {
    this.hardStopBuiltins();
    try {
      let el = this.audioEl;
      if (!el) {
        el = new Audio();
        el.loop = true;
        el.preload = "auto";
        this.audioEl = el;
      }
      el.src = url;
      el.volume = this.state.volume;
      void el.play().catch(() => {
        /* unsupported format / blocked — stay quiet */
      });
    } catch {
      /* ignore */
    }
  }

  /** Start playing a track (softly). Safe to call anytime. */
  play(track: MusicTrack): void {
    this.clearFadeTimer();
    if (track.kind === "builtin") {
      this.startBuiltin(track.id);
    } else {
      this.startLocal(track.url);
    }
    this.setState({ active: true, playing: true, track });
  }

  /** Start the last-loved built-in track (or calm piano). Keeps current music. */
  playDefault(): void {
    if (this.state.active) return;
    const id = readTrack() ?? "piano";
    this.play({ kind: "builtin", id });
  }

  /** Soft pause — the same as an easy mute. */
  pause(): void {
    if (!this.state.active) return;
    try {
      if (this.state.track?.kind === "local" && this.audioEl) {
        this.audioEl.pause();
      } else if (this.ctx && this.ctx.state === "running") {
        void this.ctx.suspend();
      }
    } catch {
      /* ignore */
    }
    this.setState({ playing: false });
  }

  resume(): void {
    if (!this.state.active) return;
    try {
      if (this.state.track?.kind === "local" && this.audioEl) {
        void this.audioEl.play().catch(() => {});
      } else if (this.ctx && this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
    } catch {
      /* ignore */
    }
    this.setState({ playing: true });
  }

  toggle(): void {
    if (this.state.playing) this.pause();
    else if (this.state.active) this.resume();
    else this.playDefault();
  }

  /**
   * Prime the AudioContext on a user gesture so subsequent play() calls
   * work immediately. Browsers require a user interaction before audio
   * can play — call this from any tap handler.
   */
  prime(): void {
    try {
      const ctx = this.ensureCtx();
      if (ctx && ctx.state === "suspended") void ctx.resume();
    } catch {
      /* ignore */
    }
  }

  /** Cycle to the next built-in track. */
  next(): void {
    const current = this.state.track?.kind === "builtin" ? this.state.track.id : null;
    const idx = current ? BUILTIN_TRACKS.findIndex((t) => t.id === current) : -1;
    const next = BUILTIN_TRACKS[(idx + 1) % BUILTIN_TRACKS.length];
    this.play({ kind: "builtin", id: next.id });
  }

  /** Set the current context (ambient or game). Affects which uploads are shown. */
  setContext(ctx: MusicContext): void {
    this.setState({ context: ctx });
  }

  /** Get the uploaded tracks for the current context. */
  getUploadedTracks(): UploadedTrack[] {
    return this.state.context === "ambient"
      ? this.state.ambientUploads
      : this.state.gameUploads;
  }

  /** Add an uploaded track to the current context's list and start playing it. */
  addUploadedTrack(file: File): void {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const id = `ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const track: UploadedTrack = { id, name: file.name, dataUrl };
        const key = this.state.context === "ambient" ? KV_AMBIENT_UPLOADS : KV_GAME_UPLOADS;
        const list = this.state.context === "ambient"
          ? [...this.state.ambientUploads, track]
          : [...this.state.gameUploads, track];
        writeUploads(key, list);
        if (this.state.context === "ambient") {
          this.setState({ ambientUploads: list });
        } else {
          this.setState({ gameUploads: list });
        }
        // Start playing it
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        const blobUrl = URL.createObjectURL(file);
        this.objectUrl = blobUrl;
        this.play({ kind: "local", name: file.name, url: blobUrl });
      };
      reader.readAsDataURL(file);
    } catch {
      /* ignore */
    }
  }

  /** Remove an uploaded track from the current context's list. */
  removeUploadedTrack(id: string): void {
    const key = this.state.context === "ambient" ? KV_AMBIENT_UPLOADS : KV_GAME_UPLOADS;
    const list = (this.state.context === "ambient"
      ? this.state.ambientUploads
      : this.state.gameUploads
    ).filter((t) => t.id !== id);
    writeUploads(key, list);
    if (this.state.context === "ambient") {
      this.setState({ ambientUploads: list });
    } else {
      this.setState({ gameUploads: list });
    }
  }

  /** Play an uploaded track by its stored data URL. */
  playUploadedTrack(track: UploadedTrack): void {
    try {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      // Convert data URL to blob for playback
      const parts = track.dataUrl.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] ?? "audio/mpeg";
      const raw = atob(parts[1] ?? "");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      this.objectUrl = url;
      this.play({ kind: "local", name: track.name, url });
    } catch {
      /* ignore */
    }
  }

  /** Play a local audio file picked by the user. Never leaves the device. */
  playLocalFile(file: File): void {
    try {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      const url = URL.createObjectURL(file);
      this.objectUrl = url;
      this.play({ kind: "local", name: file.name, url });
    } catch {
      /* ignore */
    }
  }

  setVolume(v: number): void {
    const vol = Math.min(1, Math.max(0, v));
    safeSetItem(KV_VOLUME, String(vol));
    this.setState({ volume: vol });
    this.applyVolume(true);
  }

  /** Softly fade out and stop — used when leaving the Games section. */
  stop(fadeMs = 1000): void {
    if (!this.state.active) return;
    const ctx = this.ctx;
    const master = this.master;
    this.clearFadeTimer();
    try {
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fadeMs / 1000);
      }
      // local files don't run through the master gain — fade the element too
      if (this.state.track?.kind === "local" && this.audioEl) {
        const el = this.audioEl;
        const from = el.volume;
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
          window.setTimeout(() => {
            try {
              el.volume = from * (1 - i / steps);
            } catch {
              /* ignore */
            }
          }, (fadeMs / steps) * i);
        }
      }
    } catch {
      /* ignore */
    }
    this.fadeTimer = window.setTimeout(() => this.hardStop(), fadeMs);
  }
}

/** Single shared engine for the whole app. */
export const music = new MusicEngine();

/** React hook — subscribe to the engine's state. */
export function useMusicState(): MusicState {
  return useSyncExternalStore(music.subscribe, music.getState);
}
