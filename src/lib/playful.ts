/** Small juicy audio helpers for the new custom-game builder preview.
 * Nothing leaves the device; every call is wrapped so a missing AudioContext
 * can never crash the preview.
 */

export function tryAudio<T>(tryIt: () => T): T | undefined {
  try { return tryIt(); } catch { return undefined; }
}

let sCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (!sCtx) {
    sCtx = tryAudio(() => new AudioContext()) ?? null;
    if (sCtx?.state === "suspended") void sCtx.resume().catch(() => { /* */ });
  }
  return sCtx;
}

export function softChime(freq = 660) {
  tryAudio(() => {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.25);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 0.4);
  });
}

export function softPop() {
  tryAudio(() => {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 0.25);
  });
}

export function softSplash() {
  tryAudio(() => {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const n = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    n.type = "sine";
    n.frequency.value = 820;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    n.connect(f);
    f.connect(g);
    g.connect(c.destination);
    n.start(t);
    n.stop(t + 0.32);
    // tiny flutter
    for (let i = 1; i <= 3; i++) {
      const s = c.createOscillator();
      const gg = c.createGain();
      s.type = "sine";
      s.frequency.value = 900 + i * 180;
      gg.gain.setValueAtTime(0.05, t + i * 0.05);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.12);
      s.connect(gg);
      gg.connect(c.destination);
      s.start(t + i * 0.05);
      s.stop(t + i * 0.05 + 0.15);
    }
  });
}

export function softBlow() {
  tryAudio(() => {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const n = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1200;
    f.Q.value = 1;
    n.type = "sawtooth";
    n.frequency.setValueAtTime(220, t);
    n.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    n.connect(f);
    f.connect(g);
    g.connect(c.destination);
    n.start(t);
    n.stop(t + 0.3);
  });
}

export function softSoothe() {
  tryAudio(() => {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(380, t);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.6);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 0.85);
  });
}

export function playSound(id: string) {
  switch (id) {
    case "chimes":
      softChime(520 + Math.random() * 360);
      break;
    case "pop":
      softPop();
      break;
    case "rain":
      softSplash();
      break;
    case "wind":
      softBlow();
      break;
    case "piano":
      softChime(392 + Math.random() * 240);
      break;
    default:
      return;
  }
}

export function makeCounter(initial = 0) {
  let n = initial;
  return () => {
    n += 1;
    return n;
  };
}
