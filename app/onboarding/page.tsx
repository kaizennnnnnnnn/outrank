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

const STEPS = ['Username', 'Pillars', 'Friends', 'Tutorial'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

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
      await seedAllPillars(firebaseUser.uid, goals);

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
      let destination = '/dashboard';
      try {
        const pending = window.localStorage.getItem('pendingFriendInvite');
        if (pending) destination = `/invite/${encodeURIComponent(pending)}`;
      } catch { /* storage disabled */ }
      router.push(destination);
    } catch {
      addToast({ type: 'error', message: 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return username.length >= 3 && usernameAvailable === true;
      case 1: return true;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };

  const stepLabel = `${String(step + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="dir-b min-h-screen flex flex-col"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      {/* Editorial header — masthead-style nameplate + progress + skip */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'var(--b-paper)',
          borderBottom: '1px solid var(--b-rule)',
          padding: '14px 22px',
        }}
      >
        <div className="max-w-lg mx-auto" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="spread"
            style={{ fontSize: 11, color: 'var(--b-ink)', flexShrink: 0 }}
          >
            OUTRANK
          </div>
          <div
            className="font-mono tabular"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em', flexShrink: 0 }}
          >
            {stepLabel}
          </div>
          <div style={{ flex: 1, height: 2, background: 'var(--b-rule)', position: 'relative' }}>
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--b-accent)',
                transformOrigin: 'left',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="font-body"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--b-ink-60)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            Skip
          </button>
        </div>
      </header>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '22px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480 }}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <StepHeader
                  eyebrow="Step One"
                  title="Pick your username."
                  body="This is how others will find and challenge you."
                />
                <div>
                  <Input
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => {
                      const val = sanitizeUsername(e.target.value);
                      setUsername(val);
                      checkUsername(val);
                    }}
                    style={{ textAlign: 'center', fontSize: 18 }}
                  />
                  <div
                    className="font-body"
                    style={{
                      height: 20,
                      marginTop: 8,
                      textAlign: 'center',
                      fontSize: 11,
                    }}
                  >
                    {checkingUsername && (
                      <span style={{ color: 'var(--b-ink-60)', fontStyle: 'italic' }}>
                        Checking…
                      </span>
                    )}
                    {usernameAvailable === true && username.length >= 3 && (
                      <span style={{ color: '#34d399' }}>✓ Available</span>
                    )}
                    {usernameAvailable === false && (
                      <span style={{ color: '#ef4444' }}>✕ Username taken</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="pillars"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <StepHeader
                  eyebrow="Step Two"
                  title="Your five pillars."
                  body="Every account tracks the same five core habits. Set your daily target for each — you can adjust any of these later."
                />
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    borderTop: '1px solid var(--b-ink)',
                  }}
                >
                  {PILLARS.map((pillar, i) => {
                    const cat = CATEGORIES.find((c) => c.slug === pillar.slug);
                    if (!cat) return null;
                    const config = getGoalConfig(pillar.slug);
                    const currentGoal = goals[pillar.slug] ?? config.defaultGoal;
                    return (
                      <li
                        key={pillar.slug}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px 28px 1fr auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '14px 0',
                          borderBottom: '1px solid var(--b-rule)',
                        }}
                      >
                        <span
                          className="font-mono tabular"
                          style={{ fontSize: 10, color: 'var(--b-ink-40)', textAlign: 'right' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <CategoryIcon
                          icon={cat.icon}
                          color={cat.color}
                          size="sm"
                          slug={pillar.slug}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            className="font-display"
                            style={{
                              fontSize: 15,
                              fontStyle: 'italic',
                              fontWeight: 500,
                              lineHeight: 1.1,
                            }}
                          >
                            {pillar.name}
                          </div>
                          <div
                            className="font-body"
                            style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
                          >
                            {config.dailyLabel}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <Stepper
                            label="−"
                            onClick={() =>
                              setGoals((g) => ({
                                ...g,
                                [pillar.slug]: Math.max(
                                  config.min,
                                  (g[pillar.slug] ?? config.defaultGoal) - config.step,
                                ),
                              }))
                            }
                          />
                          <span
                            className="font-display tabular"
                            style={{
                              fontSize: 16,
                              fontWeight: 500,
                              minWidth: 48,
                              textAlign: 'center',
                            }}
                          >
                            {currentGoal.toLocaleString()}
                          </span>
                          <Stepper
                            label="+"
                            onClick={() =>
                              setGoals((g) => ({
                                ...g,
                                [pillar.slug]: Math.min(
                                  config.max,
                                  (g[pillar.slug] ?? config.defaultGoal) + config.step,
                                ),
                              }))
                            }
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p
                  className="font-body"
                  style={{
                    fontSize: 10,
                    color: 'var(--b-ink-40)',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    marginTop: 4,
                  }}
                >
                  Want a niche habit too? Add custom ones from the Roster page after setup —
                  they stay personal and won&rsquo;t appear on a friend&rsquo;s record.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <StepHeader
                  eyebrow="Step Three"
                  title="Bring a few friends."
                  body="Competition is better together. Search by username or share your invite link."
                />
                <Input placeholder="Search username..." style={{ textAlign: 'center' }} />
                <div>
                  <div
                    className="spread"
                    style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6, textAlign: 'center' }}
                  >
                    Or share your invite link
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      border: '1px solid var(--b-ink)',
                      padding: '8px 10px',
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        color: 'var(--b-ink-60)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      outrank-ten.vercel.app/invite/{user?.username || 'you'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `https://outrank-ten.vercel.app/invite/${user?.username || 'you'}`,
                        );
                        addToast({ type: 'success', message: 'Link copied!' });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="tutorial"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <StepHeader
                  eyebrow="Step Four"
                  title="You're ready."
                  body="Five rules of the publication."
                />
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    borderTop: '1px solid var(--b-ink)',
                  }}
                >
                  {[
                    {
                      title: 'Log throughout the day',
                      desc: 'Tap a pillar to log it. Logs go into a private draft.',
                    },
                    {
                      title: 'Submit your day',
                      desc: 'Publish one curated record — friends see that, not every log.',
                    },
                    {
                      title: 'Build streaks',
                      desc: 'Consecutive days build your streak. Don\'t break it.',
                    },
                    {
                      title: 'Pacts with friends',
                      desc: 'Both win or both lose — commit to a pillar together for 7, 14, or 30 days.',
                    },
                    {
                      title: 'Climb the league',
                      desc: 'Top 3 in your friends league split fragments every Monday.',
                    },
                  ].map((item, i) => (
                    <li
                      key={item.title}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                      }}
                    >
                      <span
                        className="font-mono tabular"
                        style={{
                          fontSize: 10,
                          color: 'var(--b-ink-40)',
                          textAlign: 'right',
                          paddingTop: 2,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div
                          className="font-display"
                          style={{
                            fontSize: 15,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            lineHeight: 1.2,
                          }}
                        >
                          {item.title}
                        </div>
                        <p
                          className="font-body"
                          style={{
                            fontSize: 12,
                            color: 'var(--b-ink-60)',
                            marginTop: 3,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 28,
              paddingTop: 14,
              borderTop: '1px solid var(--b-rule)',
            }}
          >
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button onClick={next} disabled={!canProceed()} loading={loading}>
              {step === STEPS.length - 1 ? "Let's go" : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
        {eyebrow}
      </div>
      <h1
        className="font-display"
        style={{
          fontSize: 34,
          fontWeight: 500,
          lineHeight: 1.05,
          margin: '4px 0 6px',
        }}
      >
        <em style={{ fontStyle: 'italic' }}>{title}</em>
      </h1>
      <p
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--b-ink-60)',
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function Stepper({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-display"
      style={{
        width: 28,
        height: 28,
        background: 'transparent',
        border: '1px solid var(--b-ink)',
        cursor: 'pointer',
        color: 'var(--b-ink)',
        fontSize: 16,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {label}
    </button>
  );
}
