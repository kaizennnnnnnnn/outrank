/**
 * Editorial theme store. Two values: 'dark' (default — matches the
 * existing app) and 'light' (cream-paper editorial). Persisted to
 * localStorage as `outrank.theme` so the choice survives reloads.
 *
 * The actual visual swap happens via CSS — `[data-theme='light']` on
 * <html> overrides the b-* CSS variables defined in globals.css.
 * A tiny <ThemeBoot/> client component (see components/editorial/
 * ThemeBoot.tsx) reads the store at mount and applies the attribute.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EditorialTheme = 'dark' | 'light';

interface ThemeState {
  theme:    EditorialTheme;
  setTheme: (t: EditorialTheme) => void;
  toggle:   () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'outrank.theme' },
  ),
);
