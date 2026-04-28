'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { PROGRAMS } from '@/constants/gymPrograms';
import { selectProgram } from '@/lib/gym';
import { ExercisePath } from '@/types/gym';

/**
 * First-run experience for the gym pillar. Two-step path: pick a
 * training style (Lift / Calisthenics) then pick a program from the
 * filtered list. Each program card shows audience, days/week, and a
 * one-paragraph description.
 *
 * Tapping a program writes `users/{uid}.gym.activeProgramId` and
 * resets `currentDayIndex` to 0 — the parent page re-renders with the
 * "today's workout" card.
 */
export function GymProgramPicker() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [path, setPath] = useState<ExercisePath | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

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
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(239,68,68,0.18), transparent 55%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(239,68,68,0.25)',
          boxShadow: '0 0 30px -14px rgba(239,68,68,0.4), inset 0 1px 0 rgba(239,68,68,0.08)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">Gym</p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-1">
          Pick your program
        </h1>
        <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed max-w-md">
          Four starter routines. Day cycles in order — skipping a calendar day doesn&rsquo;t skip the
          workout. You can switch programs any time, your history stays.
        </p>
      </div>

      {/* Path picker */}
      <div className="grid grid-cols-2 gap-3">
        <PathCard
          active={path === 'lift'}
          onClick={() => setPath('lift')}
          icon="🏋️"
          label="Lift"
          subtitle="Barbell + dumbbell"
          color="#ef4444"
        />
        <PathCard
          active={path === 'calisthenics'}
          onClick={() => setPath('calisthenics')}
          icon="🤸"
          label="Calisthenics"
          subtitle="Bodyweight only"
          color="#f97316"
        />
      </div>

      {/* Program list */}
      {path && (
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
              Programs
            </p>
            <span className="text-[10px] font-mono text-slate-500 ml-1">
              · {filtered.length} for {path}
            </span>
          </div>
          <div className="space-y-3">
            {filtered.map((program) => (
              <motion.button
                key={program.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => handlePick(program.id)}
                disabled={selecting !== null}
                className="w-full text-left relative overflow-hidden rounded-2xl p-4 border transition-all hover:border-red-500/40 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(160deg, rgba(16,16,26,0.7), rgba(11,11,20,0.5))',
                  borderColor: 'rgba(239,68,68,0.18)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div>
                    <p className="font-heading text-lg font-bold text-white leading-tight">
                      {program.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {program.audience}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      color: '#fca5a5',
                    }}
                  >
                    {program.daysPerWeek}d/wk
                  </span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">{program.description}</p>
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {program.schedule.map((d, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#0b0b14] border border-[#1e1e30]"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
                {selecting === program.id && (
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-red-400">
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
  icon,
  label,
  subtitle,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  subtitle: string;
  color: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className="rounded-2xl p-4 border transition-all text-left"
      style={{
        background: active
          ? `linear-gradient(135deg, ${color}22, #10101a 70%)`
          : 'linear-gradient(160deg, rgba(16,16,26,0.7), rgba(11,11,20,0.5))',
        borderColor: active ? `${color}77` : 'rgba(255,255,255,0.06)',
        boxShadow: active ? `0 0 22px -8px ${color}aa, inset 0 1px 0 ${color}33` : undefined,
      }}
    >
      <p className="text-3xl mb-2 leading-none">{icon}</p>
      <p className="font-heading text-base font-bold" style={{ color: active ? color : '#fff' }}>
        {label}
      </p>
      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{subtitle}</p>
    </motion.button>
  );
}
