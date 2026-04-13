'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { subscribeToDocument } from '@/lib/firestore';
import { UserProfile } from '@/types/user';

export function useAuth() {
  const { user, firebaseUser, loading, setUser, setFirebaseUser, setLoading } = useAuthStore();

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
          }
        );
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
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
