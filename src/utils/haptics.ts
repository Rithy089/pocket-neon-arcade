let lastPulse = 0;
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

/** Optional feedback; browsers that block vibration must never interrupt play. */
export function arcadeHaptic() {
  if (!enabled || !navigator.vibrate || !matchMedia('(any-pointer: coarse)').matches) return;
  const now = performance.now();
  if (now - lastPulse < 100) return;
  lastPulse = now;
  try { navigator.vibrate([15, 30, 15]); } catch { /* Unsupported or permission blocked. */ }
}
