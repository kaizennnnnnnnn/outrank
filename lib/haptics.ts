// Thin wrapper around navigator.vibrate. Safe to call from any event handler;
// falls back to no-op on desktop / iOS (which doesn't expose Vibration API).

export type HapticKind = 'tap' | 'success' | 'error' | 'double';

const patterns: Record<HapticKind, number | number[]> = {
  tap: 12,
  success: [12, 40, 32],
  error: [40, 30, 40, 30, 80],
  double: [18, 50, 18],
};

export function haptic(kind: HapticKind = 'tap'): void {
  if (typeof window === 'undefined') return;
  try {
    const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    nav.vibrate?.(patterns[kind]);
  } catch {
    // Safari throws on some iOS versions — ignore.
  }
}
