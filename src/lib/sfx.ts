/**
 * Shared sound effects — extracted so MyLittlePlant and GamesScreen can both
 * import without creating a circular dependency.
 */

let _sharedCtx: AudioContext | null = null;
function sCtx(): AudioContext {
  if (!_sharedCtx) _sharedCtx = new AudioContext();
  return _sharedCtx;
}

/** Soft water drip — used when watering the plant. */
export function sfxWater() {
  try {
    const c = sCtx();
    const t = c.currentTime;
    [0, 0.06, 0.12].forEach((delay) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = 600 + Math.random() * 400;
      g.gain.setValueAtTime(0.15, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);
      o.connect(g);
      g.connect(c.destination);
      o.start(t + delay);
      o.stop(t + delay + 0.12);
    });
  } catch {
    /* silent fallback */
  }
}

/** Soft melodic arpeggio — milestones / celebrations. */
export function sfxArpeggio() {
  try {
    const c = sCtx();
    const t = c.currentTime;
    const base = Math.min(262, c.sampleRate / 40);
    [0, 0.12, 0.24, 0.36].forEach((delay, i) => {
      const f = base * (1 << (i / 2));
      const o = c.createOscillator();
      const o2 = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o2.type = "sine";
      o2.frequency.value = f * 1.5;
      g.gain.setValueAtTime(0.12, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.3);
      o.connect(g);
      o2.connect(g);
      g.connect(c.destination);
      o.start(t + delay);
      o2.start(t + delay);
      o.stop(t + delay + 0.3);
      o2.stop(t + delay + 0.3);
    });
  } catch {
    /* silent fallback */
  }
}
