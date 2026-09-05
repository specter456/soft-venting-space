/**
 * Single Master Music Engine — one brain, one sound at a time.
 *
 * Two parallel layers: ambient (app-wide background) and game (temporary
 * override). Starting any layer automatically stops the other. Starting
 * a game track fades out ambient; stopping the game track fades ambient
 * back in. Two tracks can never overlap.
 *
 * Built-in tracks are synthesized with WebAudio (no files, no network).
 * "From your downloads" plays a local audio file on-device. Everything
 * is wrapped in try/catch so audio issues never crash the app.
 */

import { useSyncExternalStore } from "react";
import { safeGetItem, safeSetItem } from "./safe-storage";

const KV_VOLUME = "venting-music-volume";
const KV_AMBIENT_TRACK = "venting-music-ambient-track";
const KV_AMBIENT_UPLOADS = "venting-music-ambient-uploads";
const KV_GAME_UPLOADS = "venting-music-game-uploads";
const KV_MUSIC_OFF = "venting-music-off";
const KV_ACTIVE_SCENE = "venting-active-scene";

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

export type MusicTrack =
  | { kind: "builtin"; id: BuiltinTrackId }
  | { kind: "local"; name: string; url: string };

export interface UploadedTrack {
  id: string;
  name: string;
  dataUrl: string;
}

export type SceneId = "rain-window" | "fireplace" | "ocean" | "cozy-cafe" | "night-crickets" | null;

export const SCENES: { id: NonNullable<SceneId>; label: string; emoji: string }[] = [
  { id: "rain-window", label: "rain on a window", emoji: "🌧️" },
  { id: "fireplace", label: "fireplace", emoji: "🔥" },
  { id: "ocean", label: "ocean", emoji: "🌊" },
  { id: "cozy-cafe", label: "cozy café", emoji: "☕" },
  { id: "night-crickets", label: "night crickets", emoji: "🦗" },
];

export interface MusicState {
  /** Is any sound audible right now? */
  playing: boolean;
  /** The currently sounding track (ambient or game). */
  track: MusicTrack | null;
  /** Which layer is active: "ambient" | "game" | null. */
  layer: "ambient" | "game" | null;
  volume: number; // 0..1
  /** User globally muted all music. */
  muted: boolean;
  ambientUploads: UploadedTrack[];
  gameUploads: UploadedTrack[];
  /** Active scene (mutually exclusive with music). */
  activeScene: SceneId;
}

/* ─── Storage helpers ────────────────────────────────────────────── */

function readVolume(): number {
  const raw = safeGetItem(KV_VOLUME);
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return 0.38;
  return Math.min(1, Math.max(0, n));
}

function readAmbientTrackId(): BuiltinTrackId | null {
  const raw = safeGetItem(KV_AMBIENT_TRACK);
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

/* ─── WebAudio helpers ───────────────────────────────────────────── */

type Cleanup = () => void;

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
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

/* ─── Built-in track synthesis ───────────────────────────────────── */

function startRain(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 950; lp.Q.value = 0.5;
  const g = gainAt(ctx, 0.16);
  src.connect(lp); lp.connect(g); g.connect(out);
  src.start();
  const l1 = lfo(ctx, 0.13, 240, lp.frequency);
  return () => { try { src.stop(); l1.stop(); src.disconnect(); lp.disconnect(); g.disconnect(); } catch { /* */ } };
}

function startWind(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 0.55;
  const g = gainAt(ctx, 0.12);
  src.connect(bp); bp.connect(g); g.connect(out);
  src.start();
  const l1 = lfo(ctx, 0.07, 280, bp.frequency);
  const l2 = lfo(ctx, 0.11, 0.035, g.gain);
  return () => { try { src.stop(); l1.stop(); l2.stop(); src.disconnect(); bp.disconnect(); g.disconnect(); } catch { /* */ } };
}

function startHum(ctx: AudioContext, out: AudioNode): Cleanup {
  const freqs = [130.81, 196.0, 220.0, 329.63];
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const lfos: OscillatorNode[] = [];
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = f; o.detune.value = (i % 2 === 0 ? 1 : -1) * 3;
    const g = gainAt(ctx, 0.05);
    o.connect(g); g.connect(out); o.start();
    oscs.push(o); gains.push(g);
    lfos.push(lfo(ctx, 0.09 + i * 0.02, 0.02, g.gain));
  });
  return () => { try { oscs.forEach(o => o.stop()); lfos.forEach(o => o.stop()); oscs.forEach(o => o.disconnect()); gains.forEach(g => g.disconnect()); } catch { /* */ } };
}

/* ─── Scene synthesis ─────────────────────────────────────────────── */

function makeNoiseBuf(ctx: AudioContext, dur = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function startRainWindow(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource(); src.buffer = makeNoiseBuf(ctx); src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 0.3;
  const g = gainAt(ctx, 0.10);
  src.connect(bp); bp.connect(g); g.connect(out); src.start();
  // occasional soft drip
  const drip = ctx.createOscillator(); drip.type = "sine"; drip.frequency.value = 1800;
  const dripG = gainAt(ctx, 0.04);
  drip.connect(dripG); dripG.connect(out); drip.start();
  const lfo1 = lfo(ctx, 0.05, 600, bp.frequency);
  const lfo2 = lfo(ctx, 0.08, 0.03, g.gain);
  return () => { try { src.stop(); drip.stop(); lfo1.stop(); lfo2.stop(); src.disconnect(); bp.disconnect(); g.disconnect(); drip.disconnect(); dripG.disconnect(); } catch { /* */ } };
}

function startFireplace(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource(); src.buffer = makeNoiseBuf(ctx); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; lp.Q.value = 0.5;
  const g = gainAt(ctx, 0.08);
  src.connect(lp); lp.connect(g); g.connect(out); src.start();
  // crackle: high-freq noise bursts
  const crackle = ctx.createBufferSource(); crackle.buffer = makeNoiseBuf(ctx, 0.1); crackle.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;
  const cG = gainAt(ctx, 0.025);
  crackle.connect(hp); hp.connect(cG); cG.connect(out); crackle.start();
  const lfo1 = lfo(ctx, 0.04, 200, lp.frequency);
  return () => { try { src.stop(); crackle.stop(); lfo1.stop(); src.disconnect(); lp.disconnect(); g.disconnect(); crackle.disconnect(); hp.disconnect(); cG.disconnect(); } catch { /* */ } };
}

function startOcean(ctx: AudioContext, out: AudioNode): Cleanup {
  const src = ctx.createBufferSource(); src.buffer = makeNoiseBuf(ctx); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
  const g = gainAt(ctx, 0.12);
  src.connect(lp); lp.connect(g); g.connect(out); src.start();
  // slow swell
  const lfo1 = lfo(ctx, 0.06, 300, lp.frequency);
  const lfo2 = lfo(ctx, 0.04, 0.06, g.gain);
  return () => { try { src.stop(); lfo1.stop(); lfo2.stop(); src.disconnect(); lp.disconnect(); g.disconnect(); } catch { /* */ } };
}

function startCafe(ctx: AudioContext, out: AudioNode): Cleanup {
  // soft chatter noise
  const src = ctx.createBufferSource(); src.buffer = makeNoiseBuf(ctx); src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.4;
  const g = gainAt(ctx, 0.04);
  src.connect(bp); bp.connect(g); g.connect(out); src.start();
  // occasional clink
  const clink = ctx.createOscillator(); clink.type = "sine"; clink.frequency.value = 3500;
  const clG = gainAt(ctx, 0.02);
  clink.connect(clG); clG.connect(out); clink.start();
  const lfo1 = lfo(ctx, 0.03, 400, bp.frequency);
  return () => { try { src.stop(); clink.stop(); lfo1.stop(); src.disconnect(); bp.disconnect(); g.disconnect(); clink.disconnect(); clG.disconnect(); } catch { /* */ } };
}

function startCrickets(ctx: AudioContext, out: AudioNode): Cleanup {
  // cricket chirps via modulated sine
  const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 4800;
  const g = gainAt(ctx, 0.03);
  const mod = ctx.createOscillator(); mod.frequency.value = 6;
  const modG = gainAt(ctx, 0.03);
  mod.connect(modG); modG.connect(g.gain);
  osc.connect(g); g.connect(out); osc.start(); mod.start();
  // distant pad
  const pad = ctx.createOscillator(); pad.type = "sine"; pad.frequency.value = 180;
  const pG = gainAt(ctx, 0.03);
  pad.connect(pG); pG.connect(out); pad.start();
  return () => { try { osc.stop(); mod.stop(); pad.stop(); osc.disconnect(); g.disconnect(); mod.disconnect(); modG.disconnect(); pad.disconnect(); pG.disconnect(); } catch { /* */ } };
}

const SCENE_SYNTHS: Record<NonNullable<SceneId>, (ctx: AudioContext, out: AudioNode) => Cleanup> = {
  "rain-window": startRainWindow,
  fireplace: startFireplace,
  ocean: startOcean,
  "cozy-cafe": startCafe,
  "night-crickets": startCrickets,
};

function startPiano(ctx: AudioContext, out: AudioNode): Cleanup {
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
  let nextTime = ctx.currentTime + 0.15;
  let noteIdx = 2;
  let stopped = false;

  const padG = gainAt(ctx, 0.028);
  padG.gain.setValueAtTime(0, ctx.currentTime);
  padG.gain.linearRampToValueAtTime(0.028, ctx.currentTime + 3);
  const pad = ctx.createBiquadFilter();
  pad.type = "lowpass"; pad.frequency.value = 520;
  const padOscs: OscillatorNode[] = [];
  [130.81, 196.0].forEach(f => {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; o.connect(pad); o.start(); padOscs.push(o);
  });
  pad.connect(padG); padG.connect(out);

  const playNote = (when: number, freq: number) => {
    const g = gainAt(ctx, 0.0001);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.11, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 3.2);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
    const o2g = gainAt(ctx, 0.22);
    const o3 = ctx.createOscillator(); o3.type = "triangle"; o3.frequency.value = freq * 1.003; o3.detune.value = 4;
    const o3g = gainAt(ctx, 0.3);
    o1.connect(lp); o2.connect(o2g); o2g.connect(lp); o3.connect(o3g); o3g.connect(lp);
    lp.connect(g); g.connect(out);
    [o1, o2, o3].forEach(o => { o.start(when); o.stop(when + 3.3); });
  };

  const timer = window.setInterval(() => {
    if (stopped) return;
    while (nextTime < ctx.currentTime + 0.5) {
      const step = Math.floor(Math.random() * 3) - 1;
      noteIdx = Math.min(scale.length - 1, Math.max(0, noteIdx + step));
      playNote(nextTime, scale[noteIdx]);
      if (Math.random() < 0.3 && noteIdx < scale.length - 2) playNote(nextTime + 0.35, scale[noteIdx + 1] * 0.5);
      nextTime += 1.9 + Math.random() * 1.5;
    }
  }, 250);

  return () => {
    stopped = true; window.clearInterval(timer);
    try { padOscs.forEach(o => o.stop()); padG.disconnect(); pad.disconnect(); } catch { /* */ }
  };
}

const BUILTIN_SYNTHS: Record<BuiltinTrackId, (ctx: AudioContext, out: AudioNode) => Cleanup> = {
  rain: startRain, wind: startWind, hum: startHum, piano: startPiano,
};

/* ─── Audio Layer — wraps one AudioContext + one track at a time ──── */

class AudioLayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cleanups: Cleanup[] = [];
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private objectUrl: string | null = null;

  /** Create or resume the AudioContext. Returns false if unavailable. */
  prime(vol: number): boolean {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return false;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = vol;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return true;
    } catch { return false; }
  }

  /** Stop everything in this layer immediately. */
  hardStop(): void {
    for (const c of this.cleanups) { try { c(); } catch { /* */ } }
    this.cleanups = [];
    if (this.audioEl) {
      try { this.audioEl.pause(); this.audioEl.removeAttribute("src"); this.audioEl.load(); } catch { /* */ }
    }
    if (this.objectUrl) { try { URL.revokeObjectURL(this.objectUrl); } catch { /* */ } this.objectUrl = null; }
    this.mediaSource = null;
  }

  /** Fade the master gain to target over ms, then call cb. */
  fadeTo(target: number, vol: number, ms: number, cb?: () => void): void {
    if (!this.ctx || !this.master) { cb?.(); return; }
    try {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(target * vol, t + ms / 1000);
      if (cb) setTimeout(cb, ms);
    } catch { /* */ }
  }

  /** Set gain instantly (no ramp). */
  setGain(v: number): void {
    if (this.ctx && this.master) {
      try { this.master.gain.setValueAtTime(v, this.ctx.currentTime); } catch { /* */ }
    }
    if (this.audioEl) { try { this.audioEl.volume = v; } catch { /* */ } }
  }

  /** Play a built-in synthesized track. */
  playBuiltin(id: BuiltinTrackId, vol: number, fadeMs = 1200): void {
    this.hardStop();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    try {
      const cleanup = BUILTIN_SYNTHS[id](ctx, master);
      this.cleanups = [cleanup];
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(vol, ctx.currentTime + fadeMs / 1000);
    } catch { this.hardStop(); }
  }

  /** Play a local audio file (uploaded track). */
  playLocal(url: string, vol: number): void {
    this.hardStop();
    try {
      let el = this.audioEl;
      if (!el) { el = new Audio(); el.loop = true; el.preload = "auto"; this.audioEl = el; }
      el.src = url;
      el.volume = vol;
      void el.play().catch(() => { /* blocked */ });
    } catch { /* */ }
  }

  /** Play a scene synthesizer function. */
  playScene(sceneId: NonNullable<SceneId>, vol: number, fadeMs = 1200): void {
    this.hardStop();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    try {
      const cleanup = SCENE_SYNTHS[sceneId](ctx, master);
      this.cleanups = [cleanup];
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(vol, ctx.currentTime + fadeMs / 1000);
    } catch { this.hardStop(); }
  }

  /** Fade out over ms, then hard-stop. Returns a promise-like timeout. */
  fadeStop(vol: number, ms = 1000): Promise<void> {
    return new Promise(resolve => {
      if (!this.ctx || !this.master) { this.hardStop(); resolve(); return; }
      try {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(0.0001, t + ms / 1000);
      } catch { /* */ }
      // Also fade HTMLAudioElement if local
      if (this.audioEl) {
        const el = this.audioEl;
        const from = el.volume;
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => { try { el.volume = from * (1 - i / steps); } catch { /* */ } }, (ms / steps) * i);
        }
      }
      setTimeout(() => { this.hardStop(); resolve(); }, ms);
    });
  }
}

/* ─── Master Engine ──────────────────────────────────────────────── */

class MusicEngine {
  private ambient = new AudioLayer();
  private game = new AudioLayer();
  private scene = new AudioLayer();

  private ambientTrack: MusicTrack | null = null; // what the user chose as ambient
  private gameTrack: MusicTrack | null = null;     // currently playing game track
  private _activeScene: SceneId = (safeGetItem(KV_ACTIVE_SCENE) as SceneId) || null;
  private _volume = readVolume();
  private _muted = safeGetItem(KV_MUSIC_OFF) === "1";
  private _playing = false;
  private _layer: "ambient" | "game" | null = null;

  private listeners = new Set<() => void>();

  /** Prime both layers on user gesture. */
  private gesturePrimed = false;
  private gestureListener = (): void => {
    if (this.gesturePrimed) return;
    this.gesturePrimed = true;
    this.ambient.prime(this._effectiveVol());
    this.game.prime(this._effectiveVol());
    // Auto-start ambient if not muted and nothing is playing
    if (!this._muted && !this._playing && !this._activeScene) this.startAmbient();
    window.removeEventListener("click", this.gestureListener);
    window.removeEventListener("touchstart", this.gestureListener);
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("click", this.gestureListener);
      window.addEventListener("touchstart", this.gestureListener);
    }
  }

  /* ─── State subscription ─────────────────────────────────────── */

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };

  getState = (): MusicState => ({
    playing: this._playing || this._activeScene !== null,
    track: this._layer === "game" ? this.gameTrack : this.ambientTrack,
    layer: this._layer,
    volume: this._volume,
    muted: this._muted,
    ambientUploads: readUploads(KV_AMBIENT_UPLOADS),
    gameUploads: readUploads(KV_GAME_UPLOADS),
    activeScene: this._activeScene,
  });

  private emit(): void { for (const l of this.listeners) l(); }

  private _effectiveVol(): number { return this._muted ? 0 : this._volume; }

  /* ─── Ambient layer ──────────────────────────────────────────── */

  /** Start the ambient track (called on first gesture or manually). */
  startAmbient(): void {
    if (this._muted || this._layer === "game" || this._activeScene) return; // don't start ambient while game or scene is playing
    const track = this.ambientTrack ?? { kind: "builtin", id: readAmbientTrackId() ?? "piano" as BuiltinTrackId };
    this.ambientTrack = track;
    this.ambient.prime(this._effectiveVol());
    if (track.kind === "builtin") {
      this.ambient.playBuiltin(track.id, this._effectiveVol());
    } else {
      this.ambient.playLocal(track.url, this._effectiveVol());
    }
    this._playing = true;
    this._layer = "ambient";
    this.emit();
  }

  /** Change the ambient track (from the CD menu on app screens). */
  setAmbient(track: MusicTrack): void {
    this.ambientTrack = track;
    if (track.kind === "builtin") safeSetItem(KV_AMBIENT_TRACK, track.id);
    // If ambient is currently playing (not overridden by game), restart with new track
    if (this._layer === "ambient" || this._layer === null) {
      this.ambient.prime(this._effectiveVol());
      if (track.kind === "builtin") {
        this.ambient.playBuiltin(track.id, this._effectiveVol());
      } else {
        this.ambient.playLocal(track.url, this._effectiveVol());
      }
      this._playing = true;
      this._layer = "ambient";
      this.emit();
    }
  }

  /** Pause ambient (used when game starts). */
  private async pauseAmbient(): Promise<void> {
    if (this._layer !== "ambient") return;
    await this.ambient.fadeStop(this._effectiveVol(), 800);
    this._layer = null;
  }

  /** Resume ambient (used when game stops). */
  private resumeAmbient(): void {
    if (!this.ambientTrack || this._muted) return;
    this.ambient.prime(this._effectiveVol());
    if (this.ambientTrack.kind === "builtin") {
      this.ambient.playBuiltin(this.ambientTrack.id, this._effectiveVol());
    } else {
      this.ambient.playLocal(this.ambientTrack.url, this._effectiveVol());
    }
    this._layer = "ambient";
    this._playing = true;
    this.emit();
  }

  /* ─── Game layer ─────────────────────────────────────────────── */

  /** Start a game-specific track: fade out ambient, fade in game track. */
  async startGameTrack(track: MusicTrack): Promise<void> {
    if (this._muted) return;
    // Fade out ambient if playing
    if (this._layer === "ambient") await this.pauseAmbient();
    // Stop any existing game track
    this.game.hardStop();
    this.gameTrack = track;
    this.game.prime(this._effectiveVol());
    if (track.kind === "builtin") {
      this.game.playBuiltin(track.id, this._effectiveVol());
    } else {
      this.game.playLocal(track.url, this._effectiveVol());
    }
    this._playing = true;
    this._layer = "game";
    this.emit();
  }

  /** Stop game track and resume ambient. */
  async stopGameTrack(): Promise<void> {
    if (this._layer !== "game") return;
    await this.game.fadeStop(this._effectiveVol(), 600);
    this.gameTrack = null;
    this.resumeAmbient();
  }

  /* ─── Public API ─────────────────────────────────────────────── */

  /** Play a track (stops any currently playing track). Single-track rule. */
  play(track: MusicTrack): void {
    // Stop any active scene — one-brain rule
    if (this._activeScene) this.stopScene();
    if (this._layer === "game") {
      // If we're inside a game, this changes the game track
      this.game.hardStop();
      this.gameTrack = track;
      this.game.prime(this._effectiveVol());
      if (track.kind === "builtin") this.game.playBuiltin(track.id, this._effectiveVol());
      else this.game.playLocal(track.url, this._effectiveVol());
      this._playing = true;
      this._layer = "game";
    } else {
      // Ambient context: change ambient track
      this.setAmbient(track);
    }
    this.emit();
  }

  /** Toggle play/pause for whatever is currently active. */
  toggle(): void {
    if (this._muted) return;
    if (this._activeScene) { this.stopScene(); return; }
    if (!this._playing) {
      this.startAmbient();
    } else if (this._layer === "ambient") {
      this.ambient.hardStop();
      this._playing = false;
      this._layer = null;
      this.emit();
    } else if (this._layer === "game") {
      this.game.hardStop();
      this._playing = false;
      this._layer = null;
      this.emit();
    }
  }

  next(): void {
    const current = this._layer === "game"
      ? (this.gameTrack?.kind === "builtin" ? this.gameTrack.id : null)
      : (this.ambientTrack?.kind === "builtin" ? this.ambientTrack.id : null);
    const idx = current ? BUILTIN_TRACKS.findIndex(t => t.id === current) : -1;
    const next = BUILTIN_TRACKS[(idx + 1) % BUILTIN_TRACKS.length];
    this.play({ kind: "builtin", id: next.id });
  }

  setVolume(v: number): void {
    this._volume = Math.min(1, Math.max(0, v));
    safeSetItem(KV_VOLUME, String(this._volume));
    const eff = this._effectiveVol();
    this.ambient.setGain(eff);
    this.game.setGain(eff);
    this.scene.setGain(eff);
    this.emit();
  }

  /** Globally mute / unmute everything. */
  setMuted(m: boolean): void {
    this._muted = m;
    safeSetItem(KV_MUSIC_OFF, m ? "1" : "0");
    if (m) {
      this.ambient.hardStop();
      this.game.hardStop();
      this.scene.hardStop();
      this._playing = false;
      this._layer = null;
    } else {
      if (this._activeScene) {
        this.scene.prime(this._effectiveVol());
        this.scene.playScene(this._activeScene, this._effectiveVol());
      } else {
        this.startAmbient();
      }
    }
    this.emit();
  }

  /** Stop everything (legacy compat — used by Dashboard unmount). */
  stop(fadeMs = 1000): void {
    if (this._layer === "game") {
      this.game.fadeStop(this._effectiveVol(), Math.min(fadeMs, 400));
      this.gameTrack = null;
    }
    if (this._layer === "ambient") {
      this.ambient.fadeStop(this._effectiveVol(), fadeMs);
    }
    this._playing = false;
    this._layer = null;
    this.stopScene();
    this.emit();
  }

  /* ─── Scene layer (soundscapes) ──────────────────────────────── */

  /** Start a scene — stops any music/game first. One-brain rule. */
  startScene(sceneId: NonNullable<SceneId>): void {
    // Stop music if playing
    if (this._layer === "ambient") {
      this.ambient.hardStop();
      this._layer = null;
      this._playing = false;
    }
    if (this._layer === "game") {
      this.game.hardStop();
      this.gameTrack = null;
      this._layer = null;
      this._playing = false;
    }
    this.scene.hardStop();
    this._activeScene = sceneId;
    safeSetItem(KV_ACTIVE_SCENE, sceneId);
    this.scene.prime(this._effectiveVol());
    this.scene.playScene(sceneId, this._effectiveVol());
    this.emit();
  }

  /** Stop the current scene. */
  stopScene(): void {
    if (!this._activeScene) return;
    this.scene.hardStop();
    this._activeScene = null;
    safeSetItem(KV_ACTIVE_SCENE, "");
    this.emit();
  }

  /** Toggle a scene: if same scene, stop it; if different, switch. */
  toggleScene(sceneId: NonNullable<SceneId>): void {
    if (this._activeScene === sceneId) {
      this.stopScene();
    } else {
      this.startScene(sceneId);
    }
  }

  /** Resume whatever was last playing. */
  resume(): void {
    if (this._muted || this._playing || this._activeScene) return;
    if (this._layer === "game" && this.gameTrack) {
      this.game.prime(this._effectiveVol());
      if (this.gameTrack.kind === "builtin") this.game.playBuiltin(this.gameTrack.id, this._effectiveVol());
      else this.game.playLocal(this.gameTrack.url, this._effectiveVol());
      this._playing = true;
      this.emit();
    } else {
      this.startAmbient();
    }
  }

  prime(): void {
    this.ambient.prime(this._effectiveVol());
    this.game.prime(this._effectiveVol());
  }

  /* ─── Upload management ──────────────────────────────────────── */

  getAmbientUploads(): UploadedTrack[] { return readUploads(KV_AMBIENT_UPLOADS); }
  getGameUploads(): UploadedTrack[] { return readUploads(KV_GAME_UPLOADS); }

  addUploadedTrack(file: File, context: "ambient" | "game"): void {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const id = `ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const track: UploadedTrack = { id, name: file.name, dataUrl };
        const key = context === "ambient" ? KV_AMBIENT_UPLOADS : KV_GAME_UPLOADS;
        const list = [...readUploads(key), track];
        writeUploads(key, list);
        // Start playing it
        this.ambient.hardStop();
        const blobUrl = URL.createObjectURL(file);
        this.play({ kind: "local", name: file.name, url: blobUrl });
        this.emit();
      };
      reader.readAsDataURL(file);
    } catch { /* */ }
  }

  removeUploadedTrack(id: string, context: "ambient" | "game"): void {
    const key = context === "ambient" ? KV_AMBIENT_UPLOADS : KV_GAME_UPLOADS;
    const list = readUploads(key).filter(t => t.id !== id);
    writeUploads(key, list);
    this.emit();
  }

  playUploadedTrack(track: UploadedTrack): void {
    try {
      const parts = track.dataUrl.split(",");
      const mime = parts[0]?.match(/:(.*?);/)?.[1] ?? "audio/mpeg";
      const raw = atob(parts[1] ?? "");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      this.ambient.hardStop();
      this.play({ kind: "local", name: track.name, url });
    } catch { /* */ }
  }

  playLocalFile(file: File): void {
    try {
      const url = URL.createObjectURL(file);
      this.ambient.hardStop();
      this.play({ kind: "local", name: file.name, url });
    } catch { /* */ }
  }
}

/** Single shared engine for the whole app. */
export const music = new MusicEngine();

/** React hook — subscribe to the engine's state. */
export function useMusicState(): MusicState {
  return useSyncExternalStore(music.subscribe, music.getState);
}
