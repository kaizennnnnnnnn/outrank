import { create } from 'zustand';
import { UserProfile } from '@/types/user';

interface AuthState {
  user: UserProfile | null;
  firebaseUser: { uid: string; email: string | null; emailVerified: boolean } | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setFirebaseUser: (user: AuthState['firebaseUser']) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, firebaseUser: null, loading: false }),
}));
