'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

/**
 * Reads the persisted editorial theme on mount and writes it as a
 * `data-theme` attribute on <html>. The CSS overrides in globals.css
 * pick it up and swap the b-* variables for the cream-paper light
 * variant when set. Subsequent toggles re-apply via the same effect
 * because zustand re-renders subscribers on store changes.
 *
 * Render this once at the app root (in providers.tsx) — it has no
 * visual output.
 */
export function ThemeBoot() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}
