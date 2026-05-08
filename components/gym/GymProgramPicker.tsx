'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { PROGRAMS, getProgram } from '@/constants/gymPrograms';
import { selectProgram, recommendProgram } from '@/lib/gym';
import { ExercisePath } from '@/types/gym';
import { BGymGlyph, BCompassGlyph } from '@/components/editorial/BGlyphs';

/**
 * Editorial Direction B v2 first-run experience for the gym pillar.
 * Two-step path: pick a training style (Lift / Calisthenics) then pick
 * a program from the filtered list. Hairline cards, italic Fraunces
 * program names, mono tabular meta lines.
 */
export function GymProgramPicker() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [path, setPath] = useState<ExercisePath | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  // Pull the user's onboarding-derived hints off their user doc so we
  // can highlight the program that matches their stated days/week +
  // location + experience.
  const userAny = user as unknown as Record<string, unknown> | null;
  const recommendedId = useMemo(() => {
    if (!userAny) return null;
    return recommendProgram({
      experienceLevel:    userAny.experienceLevel as 'never' | 'beginner' | 'intermediate' | 'advanced' | undefined,
      exerciseLocation:   userAny.exerciseLocation as 'commercial' | 'small_gym' | 'garage' | 'home' | 'bodyweight' | undefined,
      workoutDaysPerWeek: userAny.workoutDaysPerWeek as number | undefined,
    });
  }, [userAny]);
  const recommended = recommendedId ? getProgram(recommendedId) : undefined;

  const filtered = path ? PROGRAMS.filter((p) => p.path === path) : [];

  const handlePick = async (programId: string) => {
    if (!user) return;
    setSelecting(programId);
    try {
      await selectProgram(user.uid, programId);
      addToast({ type: 'success', message: 'Program set — let\'s lift.' });
    } catch {
      addToast({ type: 'error', message: 'Could not set program' });
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Hero */}
      <div
        style={{
          padding: '16px 0 14px 14px',
          borderTop: '2px solid var(--b-ink)',
          borderBottom: '1px solid var(--b-ink)',
          borderLeft: '2px solid var(--b-accent)',
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
          Gym
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: 32,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            margin: '4px 0 6px',
            color: 'var(--b-ink)',
          }}
        >
          Pick your program.
        </h1>
        <p
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--b-ink-60)',
            margin: 0,
            maxWidth: 380,
            lineHeight: 1.5,
          }}
        >
          Four starter routines. Day cycles in order — skipping a calendar day doesn&rsquo;t skip the
          workout. You can switch programs any time, your history stays.
        </p>
      </div>

      {/* Recommended-for-you card — populated from onboarding answers.
          Hides when the user opted into a path manually so the picker
          reads as a single-task list once they're shopping. */}
      {recommended && !path && (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 10,
              paddingTop: 4,
            }}
          >
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
              Recommended for you
            </div>
            <span
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-40)', letterSpacing: '0.04em' }}
            >
              · based on your onboarding
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.995 }}
            onClick={() => handlePick(recommended.id)}
            disabled={selecting !== null}
            className="font-body"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: 16,
              background: 'var(--b-paper)',
              border: '1px solid var(--b-accent)',
              borderLeft: '3px solid var(--b-accent)',
              cursor: selecting !== null ? 'not-allowed' : 'pointer',
              color: 'var(--b-ink)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
              <div style={{ minWidth: 0 }}>
                <p
                  className="font-display"
                  style={{
                    fontSize: 22,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    lineHeight: 1.05,
                    margin: 0,
                    color: 'var(--b-ink)',
                  }}
                >
                  {recommended.name}
                </p>
                <p
                  className="font-mono tabular"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: '3px 0 0', letterSpacing: '0.04em' }}
                >
                  {recommended.audience}
                </p>
              </div>
              <span
                className="spread"
                style={{
                  padding: '3px 8px',
                  background: 'var(--b-accent)',
                  color: 'var(--b-paper)',
                  fontSize: 9,
                  flexShrink: 0,
                }}
              >
                Pick →
              </span>
            </div>
            <p
              className="font-body"
              style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, margin: '6px 0 0' }}
            >
              {recommended.description}
            </p>
            {selecting === recommended.id && (
              <p className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 10 }}>
                Selecting…
              </p>
            )}
          </motion.button>
          <Link
            href="/gym/custom"
            className="font-body"
            style={{
              display: 'block',
              marginTop: 10,
              padding: '12px 14px',
              border: '1px solid var(--b-ink)',
              background: 'var(--b-paper)',
              color: 'var(--b-ink)',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            + Build your own routine
          </Link>
          <p
            className="font-body"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              textAlign: 'center',
              marginTop: 6,
              fontStyle: 'italic',
            }}
          >
            Already following a program? Mirror it day-by-day.
          </p>
        </section>
      )}

      {/* Path picker */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <PathCard
          active={path === 'lift'}
          onClick={() => setPath('lift')}
          Glyph={BGymGlyph}
          label="Lift"
          subtitle="Barbell + dumbbell"
        />
        <PathCard
          active={path === 'calisthenics'}
          onClick={() => setPath('calisthenics')}
          Glyph={BCompassGlyph}
          label="Calisthenics"
          subtitle="Bodyweight only"
        />
      </div>

      {/* Program list */}
      {path && (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--b-ink)',
            }}
          >
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
              Programs
            </div>
            <span
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', letterSpacing: '0.04em' }}
            >
              · {filtered.length} for {path}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((program, idx) => (
              <motion.button
                key={program.id}
                whileTap={{ scale: 0.995 }}
                onClick={() => handlePick(program.id)}
                disabled={selecting !== null}
                className="font-body"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 0',
                  background: 'transparent',
                  border: 'none',
                  borderTop: idx === 0 ? '1px solid var(--b-rule)' : 'none',
                  borderBottom: '1px solid var(--b-rule)',
                  cursor: selecting !== null ? 'not-allowed' : 'pointer',
                  opacity: selecting !== null ? 0.5 : 1,
                  color: 'var(--b-ink)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="font-display"
                      style={{
                        fontSize: 18,
                        fontStyle: 'italic',
                        fontWeight: 500,
                        lineHeight: 1.1,
                        margin: 0,
                        color: 'var(--b-ink)',
                      }}
                    >
                      {program.name}
                    </p>
                    <p
                      className="font-mono tabular"
                      style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: '2px 0 0', letterSpacing: '0.04em' }}
                    >
                      {program.audience}
                    </p>
                  </div>
                  <span
                    className="spread"
                    style={{
                      padding: '2px 8px',
                      border: '1px solid var(--b-accent)',
                      color: 'var(--b-accent)',
                      fontSize: 9,
                      flexShrink: 0,
                    }}
                  >
                    {program.daysPerWeek}D/WK
                  </span>
                </div>
                <p
                  className="font-body"
                  style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, margin: 0 }}
                >
                  {program.description}
                </p>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {program.schedule.map((d, i) => (
                    <span
                      key={i}
                      className="font-mono tabular"
                      style={{
                        padding: '2px 7px',
                        border: '1px solid var(--b-rule)',
                        fontSize: 10,
                        color: 'var(--b-ink-60)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
                {selecting === program.id && (
                  <p className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 10 }}>
                    Selecting…
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PathCard({
  active,
  onClick,
  Glyph,
  label,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  Glyph: React.ComponentType<{ size?: number }>;
  label: string;
  subtitle: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="font-body"
      style={{
        padding: '14px 14px',
        textAlign: 'left',
        background: 'transparent',
        border: active ? '1px solid var(--b-ink)' : '1px solid var(--b-rule)',
        borderLeft: active ? '2px solid var(--b-accent)' : '1px solid var(--b-rule)',
        cursor: 'pointer',
        color: 'var(--b-ink)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          color: active ? 'var(--b-accent)' : 'var(--b-ink-60)',
        }}
      >
        <Glyph size={20} />
      </span>
      <p
        className="font-display"
        style={{
          fontSize: 18,
          fontStyle: 'italic',
          fontWeight: 500,
          margin: '6px 0 2px',
          color: active ? 'var(--b-accent)' : 'var(--b-ink)',
        }}
      >
        {label}
      </p>
      <p
        className="font-mono tabular"
        style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: 0, letterSpacing: '0.04em' }}
      >
        {subtitle}
      </p>
    </motion.button>
  );
}
