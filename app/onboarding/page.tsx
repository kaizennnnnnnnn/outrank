'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES, CATEGORY_SECTIONS, getGoalConfig } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sanitizeUsername } from '@/lib/security';
import { setDocument, Timestamp } from '@/lib/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

const STEPS = ['Username', 'Categories', 'Goals', 'Friends', 'Tutorial'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Username
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Step 2: Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 3: Goals
  const [goals, setGoals] = useState<Record<string, number>>({});

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

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 5) return prev;
      return [...prev, slug];
    });
  };

  const handleFinish = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      // Create habits for each selected category
      for (const slug of selectedCategories) {
        const cat = CATEGORIES.find((c) => c.slug === slug);
        if (!cat) continue;

        await setDocument(
          `habits/${firebaseUser.uid}/userHabits`,
          slug,
          {
            categoryId: slug,
            categoryName: cat.name,
            categoryIcon: cat.icon,
            categorySlug: cat.slug,
            goal: goals[slug] ?? getGoalConfig(slug).defaultGoal,
            goalPeriod: 'daily',
            isPublic: true,
            currentStreak: 0,
            longestStreak: 0,
            totalLogs: 0,
            lastLogDate: null,
            createdAt: Timestamp.now(),
            color: cat.color,
            unit: cat.unit,
          },
          false
        );
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
      case 1: return selectedCategories.length >= 3;
      case 2: return true;
      case 3: return true;
      case 4: return true;
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
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
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

            {/* Step 2: Categories */}
            {step === 1 && (
              <motion.div
                key="categories"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-5xl mb-4 block">🎯</span>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">Choose Your Arenas</h1>
                  <p className="text-slate-500">Pick at least 3 categories to track. You can add more later.</p>
                  <p className="text-xs text-cyan-400 mt-1">{selectedCategories.length}/5 selected</p>
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {CATEGORY_SECTIONS.map((section) => (
                    <div key={section}>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{section}</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {CATEGORIES.filter((c) => c.section === section).map((cat) => {
                          const isSelected = selectedCategories.includes(cat.slug);
                          return (
                            <motion.button
                              key={cat.slug}
                              whileTap={{ scale: 0.93 }}
                              whileHover={{ scale: 1.03 }}
                              onClick={() => toggleCategory(cat.slug)}
                              className={cn(
                                'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center relative',
                                isSelected
                                  ? 'border-transparent'
                                  : 'border-[#1e1e30] bg-[#0c0c16] hover:border-[#2d2d45]'
                              )}
                              style={isSelected ? {
                                borderColor: `${cat.color}40`,
                                background: `linear-gradient(135deg, ${cat.color}12 0%, ${cat.color}05 100%)`,
                                boxShadow: `0 4px 20px ${cat.color}15`,
                              } : undefined}
                            >
                              <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={cat.slug} selected={isSelected} />
                              <span className={cn(
                                'text-[10px] leading-tight font-medium',
                                isSelected ? 'text-white' : 'text-slate-400'
                              )}>
                                {cat.name}
                              </span>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: cat.color }}
                                >
                                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Goals */}
            {step === 2 && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-5xl mb-4 block">📊</span>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">Set Your Goals</h1>
                  <p className="text-slate-500">Set a target for each habit you picked.</p>
                </div>
                <div className="space-y-3">
                  {selectedCategories.map((slug) => {
                    const cat = CATEGORIES.find((c) => c.slug === slug);
                    if (!cat) return null;
                    const config = getGoalConfig(slug);
                    const currentGoal = goals[slug] ?? config.defaultGoal;
                    return (
                      <div key={slug} className="flex items-center gap-3 bg-[#0c0c16] border border-[#1e1e30] rounded-2xl p-4">
                        <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={cat.slug} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{cat.name}</p>
                          <p className="text-xs text-slate-500">{config.dailyLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setGoals((g) => ({ ...g, [slug]: Math.max(config.min, (g[slug] ?? config.defaultGoal) - config.step) }))}
                            className="w-8 h-8 rounded-lg bg-[#18182a] border border-[#2d2d45] text-white flex items-center justify-center hover:bg-[#1e1e30]"
                          >
                            -
                          </button>
                          <span className="font-mono text-lg font-bold text-white min-w-[48px] text-center">
                            {currentGoal.toLocaleString()}
                          </span>
                          <button
                            onClick={() => setGoals((g) => ({ ...g, [slug]: Math.min(config.max, (g[slug] ?? config.defaultGoal) + config.step) }))}
                            className="w-8 h-8 rounded-lg bg-[#18182a] border border-[#2d2d45] text-white flex items-center justify-center hover:bg-[#1e1e30]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4: Friends */}
            {step === 3 && (
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

            {/* Step 5: Tutorial */}
            {step === 4 && (
              <motion.div
                key="tutorial"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-5xl mb-4 block">🚀</span>
                  <h1 className="font-heading text-2xl font-bold text-white mb-2">You&apos;re Ready!</h1>
                  <p className="text-slate-500">Here&apos;s how Outrank works:</p>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: '✅', title: 'Log daily', desc: 'Tap the log button to record your habits each day.' },
                    { icon: '🔥', title: 'Build streaks', desc: 'Consecutive days build your streak. Don\'t break it!' },
                    { icon: '⚡', title: 'Earn XP', desc: 'Every log earns XP. Level up to unlock titles and badges.' },
                    { icon: '⚔️', title: 'Challenge friends', desc: 'Start duels to see who can outperform in any category.' },
                    { icon: '🏆', title: 'Climb ranks', desc: 'Compete on weekly leaderboards across all categories.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 bg-[#10101a] border border-[#1e1e30] rounded-xl p-4">
                      <span className="text-xl mt-0.5">{item.icon}</span>
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
