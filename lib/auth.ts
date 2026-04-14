import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { setDocument, getDocument } from './firestore';
import { Timestamp } from 'firebase/firestore';
import { UserProfile, UserSettings } from '@/types/user';

const googleProvider = new GoogleAuthProvider();

const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    streakReminder: true,
    friendActivity: true,
    duelUpdates: true,
    leagueUpdates: true,
    weeklyRecap: true,
    leaderboardChanges: true,
  },
  privacy: {
    isPublic: true,
    showOnLeaderboards: true,
  },
  theme: 'dark',
};

export async function registerWithEmail(
  email: string,
  password: string,
  username: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await updateProfile(user, { displayName: username });
  await sendEmailVerification(user);

  // Reserve username
  await setDocument('usernames', username.toLowerCase(), { uid: user.uid });

  // Create user profile document
  const profile: Omit<UserProfile, 'id'> = {
    uid: user.uid,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    avatarUrl: '',
    bio: '',
    level: 1,
    totalXP: 0,
    currentTitle: 'Rookie',
    friendCount: 0,
    isVerified: false,
    isPremium: false,
    createdAt: Timestamp.now(),
    lastActiveAt: Timestamp.now(),
    isPublic: true,
    isBanned: false,
    fcmToken: '',
    streakFreezeTokens: 1,
    weeklyXP: 0,
    monthlyXP: 0,
    settings: DEFAULT_SETTINGS,
  };

  await setDocument('users', user.uid, profile);

  return user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;

  // Check if user profile already exists in Firestore
  const existingProfile = await getDocument<UserProfile>('users', user.uid);

  if (!existingProfile) {
    // New Google user — create profile automatically
    const baseName = (user.displayName || user.email?.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 16);
    const uniqueUsername = `${baseName}_${Math.random().toString(36).slice(2, 6)}`;

    await setDocument('usernames', uniqueUsername, { uid: user.uid });

    const profile: Omit<UserProfile, 'id'> = {
      uid: user.uid,
      username: uniqueUsername,
      email: user.email?.toLowerCase() || '',
      avatarUrl: user.photoURL || '',
      bio: '',
      level: 1,
      totalXP: 0,
      currentTitle: 'Rookie',
      friendCount: 0,
      isVerified: true,
      isPremium: false,
      createdAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
      isPublic: true,
      isBanned: false,
      fcmToken: '',
      streakFreezeTokens: 1,
      weeklyXP: 0,
      monthlyXP: 0,
      settings: DEFAULT_SETTINGS,
    };

    await setDocument('users', user.uid, profile);
    return { user, isNewUser: true };
  }

  return { user, isNewUser: false };
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail(): Promise<void> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}
