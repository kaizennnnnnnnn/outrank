'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OnboardingDraft } from '@/types/onboarding';
import { readDraft, writeDraft, clearDraft } from '@/lib/onboardingDraft';

/**
 * Single source of truth for the onboarding funnel state. Each step
 * component reads/writes via `update(partial)` and the hook persists
 * to localStorage with a small debounce so we don't hammer storage on
 * every keystroke.
 *
 * The first render returns an empty draft (SSR-safe), then a useEffect
 * hydrates from localStorage on mount. This avoids hydration mismatch
 * since localStorage isn't available on the server.
 */
export function useOnboardingDraft() {
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [hydrated, setHydrated] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => writeDraft(next), 200);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    clearDraft();
    setDraft({});
  }, []);

  return { draft, update, reset, hydrated };
}
