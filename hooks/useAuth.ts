'use client';

import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { subscribeToDocument } from '@/lib/firestore';
import { UserProfile } from '@/types/user';

export function useAuth() {
  const { user, firebaseUser, loading, setUser, setFirebaseUser, setLoading } = useAuthStore();
  const tierHealedRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser({
          uid: fbUser.uid,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified,
        });

        // Subscribe to user profile in Firestore
        unsubProfile = subscribeToDocument<UserProfile>(
          'users',
          fbUser.uid,
          (profile) => {
            setUser(profile);
            setLoading(false);

            // One-shot tier-10 heal: orb is now always at max tier
            // (visual only; no automatic XP buffs). Pre-existing
            // users with tier < 10 get bumped on first load. Guarded
            // by tierHealedRef so the snapshot loop doesn't re-fire
            // it after the write lands.
            if (profile && tierHealedRef.current !== fbUser.uid) {
              const t = (profile as unknown as { orbTier?: number }).orbTier ?? 1;
              if (t < 10) {
                tierHealedRef.current = fbUser.uid;
                updateDoc(doc(db, 'users', fbUser.uid), { orbTier: 10 })
                  .catch(() => { /* non-fatal — retry next login */ });
              } else {
                tierHealedRef.current = fbUser.uid;
              }
            }
          }
        );
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
        tierHealedRef.current = null;
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [setUser, setFirebaseUser, setLoading]);

  return {
    user,
    firebaseUser,
    loading,
    isAuthenticated: !!firebaseUser,
    isEmailVerified: firebaseUser?.emailVerified ?? false,
  };
}
