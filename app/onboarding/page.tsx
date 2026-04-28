'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES, getGoalConfig } from '@/constants/categories';
import { PILLARS } from '@/constants/pillars';
import { seedAllPillars } from '@/lib/seedPillar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sanitizeUsername } from '@/lib/security';
import { setDocument, Timestamp } from '@/lib/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUIStore } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { RocketIcon } from '@/components/ui/AppIcons';

const STEPS = ['Username', 'Pillars', 'Friends', 'Tutorial'];

/**
 * Four-step onboarding. The category-picker step from the original
 * flow has been removed — the five pillars (gym, steps, water, sleep,
 * focus) are now first-class and seed automatically. Custom habits
 * remain available from /habits after onboarding.
 *
 * Pillars step is read-only on the WHAT (the five are non-negotiable)
 * but read-write on the HOW MUCH — users tweak goals inline before
 * sealing them with the seed call.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0: Username
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Step 1: Pillar goals — each pillar pre-fills with its default
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const p of PILLARS) {
      initial[p.slug] = getGoalConfig(p.slug).defaultGoal;
    }
    return initial;
  });

  const checkUsername = async (value: string) => {
    const sanitized = sanitizeUsername(value).toLowerCase();
    if (sanitized.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const docSnap = await getDoc(doc(db, 'usernames', sanitized));
      setUsernameAvailable(!docSnap.exists());
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleFinish = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      // Seed all five pillars with the user's chosen goals.
      // No more selectedCategories — the pillar set is fixed; custom
      // habits get added from /habits later.
      await seedAllPillars(firebaseUser.uid, goals);

      // Create user profile if it doesn't exist (e.g. redirected from dashboard)
      if (!user && firebaseUser) {
        const finalUsername = username.length >= 3
          ? username.toLowerCase()
          : `user_${Math.random().toString(36).slice(2, 8)}`;

        await setDocument('usernames', finalUsername, { uid: firebaseUser.uid });
        await setDocument('users', firebaseUser.uid, {
          uid: firebaseUser.uid,
          username: finalUsername,
          email: firebaseUser.email || '',
          avatarUrl: '',
          bio: '',
          level: 1,
          totalXP: 0,
          currentTitle: 'Rookie',
          friendCount: 0,
          isVerified: !!firebaseUser.emailVerified,
          isPremium: false,
          createdAt: Timestamp.now(),
          lastActiveAt: Timestamp.now(),
          isPublic: true,
          isBanned: false,
          fcmToken: '',
          streakFreezeTokens: 1,
          weeklyXP: 0,
          monthlyXP: 0,
          settings: {
            notifications: { streakReminder: true, friendActivity: true, duelUpdates: true, leagueUpdates: true, weeklyRecap: true, leaderboardChanges: true },
            privacy: { isPublic: true, showOnLeaderboards: true },
            theme: 'dark',
          },
        });
      }

      addToast({ type: 'success', message: 'You\'re all set! Let\'s go!' });
      router.push('/dashboard');
    } catch {
      addToast({ type: 'error', message: 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return username.length >= 3 && usernameAvailable === true;
      case 1: return true; // pillars are auto-seeded; goals have defaults
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col">
      {/* Progress Bar */}
      <div className="sticky top-0 z-50 bg-[#08080f]/80 backdrop-blur-xl border-b border-[#1e1e30] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}</span>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs text-slate-600 hover:text-slate-400"
            >
              Skip for now
            </button>
          </div>
          <div className="w-full h-1.5 bg-[#18182a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full"
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* Step 1: Username */}
            {step === 0 && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-5xl mb-4 block">👤</span>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">Pick Your Username</h1>
                  <p className="text-slate-500">This is how others will find and challenge you.</p>
                </div>
                <div>
                  <Input
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => {
                      const val = sanitizeUsername(e.target.value);
                      setUsername(val);
                      checkUsername(val);
                    }}
                    className="text-center text-lg"
                  />
                  <div className="h-5 mt-2 text-center text-xs">
                    {checkingUsername && <span className="text-slate-500">Checking...</span>}
                    {usernameAvailable === true && username.length >= 3 && (
                      <span className="text-emerald-400">✓ Available!</span>
                    )}
                    {usernameAvailable === false && (
                      <span className="text-red-400">✕ Username taken</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Pillars + goals — replaces the old Categories +
                Goals two-step. The five are non-negotiable; users
                customize how much of each. */}
            {step === 1 && (
              <motion.div
                key="pillars"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-5xl mb-4 block">🎯</span>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">Your five pillars</h1>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Every account tracks the same five core habits. Set your daily target for each —
                    you can adjust any of these later.
                  </p>
                </div>
                <div className="space-y-2">
                  {PILLARS.map((pillar) => {
                    const cat = CATEGORIES.find((c) => c.slug === pillar.slug);
                    if (!cat) return null;
                    const config = getGoalConfig(pillar.slug);
                    const currentGoal = goals[pillar.slug] ?? config.defaultGoal;
                    return (
                      <div
                        key={pillar.slug}
                        className="flex items-center gap-3 rounded-2xl p-3"
                        style={{
                          background: `linear-gradient(135deg, ${cat.color}10 0%, rgba(11,11,20,0.6) 70%)`,
                          border: `1px solid ${cat.color}33`,
                        }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={pillar.slug} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-white truncate">{pillar.name}</p>
                            <span
                              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
                              style={{
                                color: cat.color,
                                background: `${cat.color}18`,
                                border: `1px solid ${cat.color}55`,
                              }}
                            >
                              Pillar
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{config.dailyLabel}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() =>
                              setGoals((g) => ({
                                ...g,
                                [pillar.slug]: Math.max(config.min, (g[pillar.slug] ?? config.defaultGoal) - config.step),
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-[#18182a] border border-[#2d2d45] text-white flex items-center justify-center hover:bg-[#1e1e30]"
                          >
                            −
                          </button>
                          <span className="font-mono text-base font-bold text-white min-w-[44px] text-center">
                            {currentGoal.toLocaleString()}
                          </span>
                          <button
                            onClick={() =>
                              setGoals((g) => ({
                                ...g,
                                [pillar.slug]: Math.min(config.max, (g[pillar.slug] ?? config.defaultGoal) + config.step),
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-[#18182a] border border-[#2d2d45] text-white flex items-center justify-center hover:bg-[#1e1e30]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-600 text-center">
                  Want a niche habit too? Add custom ones from the Habits page after setup —
                  they stay personal and won&rsquo;t appear on a friend&rsquo;s record.
                </p>
              </motion.div>
            )}

            {/* Step 3: Friends */}
            {step === 2 && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-5xl mb-4 block">👥</span>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">Invite Friends</h1>
                  <p className="text-slate-500">Competition is better together. Search by username or share your link.</p>
                </div>
                <Input placeholder="Search username..." className="text-center" />
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-2">Or share your invite link</p>
                  <div className="flex items-center gap-2 bg-[#10101a] border border-[#1e1e30] rounded-xl px-4 py-3">
                    <span className="text-sm text-slate-400 flex-1 truncate">
                      outrank.app/invite/{user?.username || 'you'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`levelup.app/invite/${user?.username || 'you'}`);
                        addToast({ type: 'success', message: 'Link copied!' });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Tutorial */}
            {step === 3 && (
              <motion.div
                key="tutorial"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="flex justify-center mb-4"><RocketIcon size={48} className="text-orange-400" /></div>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">You&apos;re Ready!</h1>
                  <p className="text-slate-500">Here&apos;s how Outrank works:</p>
                </div>
                <div className="space-y-3">
                  {[
                    { title: 'Log throughout the day', desc: 'Tap a pillar to log it. Logs go into a private draft.' },
                    { title: 'Submit your day', desc: 'When you\'re done, publish one curated record — friends see that, not every log.' },
                    { title: 'Build streaks', desc: 'Consecutive days build your streak. Don\'t break it!' },
                    { title: 'Pacts with friends', desc: 'Both win or both lose — commit to a pillar together for 7, 14, or 30 days.' },
                    { title: 'Climb the league', desc: 'Top 3 in your friends league split fragments every Monday.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 bg-[#10101a] border border-[#1e1e30] rounded-xl p-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              onClick={next}
              disabled={!canProceed()}
              loading={loading}
            >
              {step === STEPS.length - 1 ? "Let's Go!" : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
