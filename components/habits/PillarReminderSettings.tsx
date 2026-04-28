'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { updateDocument } from '@/lib/firestore';

type PillarKind = 'water' | 'sleep';

interface Props {
  pillar: PillarKind;
  color: string;
}

interface PillarSettingsShape {
  waterEnabled?: boolean;
  waterWakeAt?: string;
  waterSleepAt?: string;
  waterCadenceMinutes?: number;
  sleepReminderEnabled?: boolean;
  sleepBedtimeAt?: string;
  sleepWindDownMinutes?: number;
}

const DEFAULTS: Required<PillarSettingsShape> = {
  waterEnabled: true,
  waterWakeAt: '08:00',
  waterSleepAt: '21:00',
  waterCadenceMinutes: 90,
  sleepReminderEnabled: true,
  sleepBedtimeAt: '23:00',
  sleepWindDownMinutes: 30,
};

/**
 * Lightweight reminder settings for the water and sleep pillars. Lives
 * on the habit detail page (`/habits/[slug]`). Writes back to
 * `users/{uid}.pillarSettings.*` — read by the `pillarReminders` Cloud
 * Function every 15 minutes. Sane defaults apply if the user never
 * touches this; toggling off stops the function from firing for that
 * pillar without losing the time configuration.
 */
export function PillarReminderSettings({ pillar, color }: Props) {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [saving, setSaving] = useState(false);

  // Field-fishing pattern: pillarSettings isn't on the canonical
  // UserProfile type but lives on the same doc.
  const userAny = user as unknown as Record<string, unknown>;
  const stored = (userAny.pillarSettings || {}) as PillarSettingsShape;

  const merged: Required<PillarSettingsShape> = {
    ...DEFAULTS,
    ...stored,
  };

  const [draft, setDraft] = useState(merged);

  const dirty = JSON.stringify(draft) !== JSON.stringify(merged);

  const save = async () => {
    if (!user || !dirty) return;
    setSaving(true);
    try {
      await updateDocument('users', user.uid, {
        pillarSettings: { ...stored, ...draft },
      });
      addToast({ type: 'success', message: 'Reminder settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Could not save settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, rgba(11,11,20,0.7) 70%)`,
        border: `1px solid ${color}33`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color }}>
            Reminders
          </p>
        </div>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
            style={{
              background: `${color}22`,
              border: `1px solid ${color}55`,
              color,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {pillar === 'water' && (
        <WaterSettings draft={draft} setDraft={setDraft} color={color} />
      )}
      {pillar === 'sleep' && (
        <SleepSettings draft={draft} setDraft={setDraft} color={color} />
      )}
    </motion.div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-slate-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{
          background: value ? color : '#1e1e30',
          boxShadow: value ? `0 0 8px ${color}66` : undefined,
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

function TimeRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-[12px] text-slate-400">{label}</span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0c0c16] border border-[#1e1e30] rounded-md px-2 py-1 font-mono text-[12px] text-white focus:outline-none focus:border-orange-400/50"
      />
    </div>
  );
}

function WaterSettings({
  draft,
  setDraft,
  color,
}: {
  draft: Required<PillarSettingsShape>;
  setDraft: React.Dispatch<React.SetStateAction<Required<PillarSettingsShape>>>;
  color: string;
}) {
  return (
    <div>
      <ToggleRow
        label="Smart water reminders"
        value={draft.waterEnabled}
        onChange={(v) => setDraft((d) => ({ ...d, waterEnabled: v }))}
        color={color}
      />
      <TimeRow
        label="Wake at"
        value={draft.waterWakeAt}
        onChange={(v) => setDraft((d) => ({ ...d, waterWakeAt: v }))}
        disabled={!draft.waterEnabled}
      />
      <TimeRow
        label="Stop reminders by"
        value={draft.waterSleepAt}
        onChange={(v) => setDraft((d) => ({ ...d, waterSleepAt: v }))}
        disabled={!draft.waterEnabled}
      />
      <div className={`flex items-center justify-between py-1.5 ${!draft.waterEnabled ? 'opacity-50' : ''}`}>
        <span className="text-[12px] text-slate-400">Every</span>
        <select
          disabled={!draft.waterEnabled}
          value={draft.waterCadenceMinutes}
          onChange={(e) => setDraft((d) => ({ ...d, waterCadenceMinutes: parseInt(e.target.value, 10) }))}
          className="bg-[#0c0c16] border border-[#1e1e30] rounded-md px-2 py-1 font-mono text-[12px] text-white focus:outline-none focus:border-orange-400/50"
        >
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
        </select>
      </div>
      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
        Soft pings inside your waking window. Quick-log chips on the dashboard make it one tap to record.
      </p>
    </div>
  );
}

function SleepSettings({
  draft,
  setDraft,
  color,
}: {
  draft: Required<PillarSettingsShape>;
  setDraft: React.Dispatch<React.SetStateAction<Required<PillarSettingsShape>>>;
  color: string;
}) {
  return (
    <div>
      <ToggleRow
        label="Wind-down reminder"
        value={draft.sleepReminderEnabled}
        onChange={(v) => setDraft((d) => ({ ...d, sleepReminderEnabled: v }))}
        color={color}
      />
      <TimeRow
        label="Bedtime"
        value={draft.sleepBedtimeAt}
        onChange={(v) => setDraft((d) => ({ ...d, sleepBedtimeAt: v }))}
        disabled={!draft.sleepReminderEnabled}
      />
      <div className={`flex items-center justify-between py-1.5 ${!draft.sleepReminderEnabled ? 'opacity-50' : ''}`}>
        <span className="text-[12px] text-slate-400">Remind me</span>
        <select
          disabled={!draft.sleepReminderEnabled}
          value={draft.sleepWindDownMinutes}
          onChange={(e) => setDraft((d) => ({ ...d, sleepWindDownMinutes: parseInt(e.target.value, 10) }))}
          className="bg-[#0c0c16] border border-[#1e1e30] rounded-md px-2 py-1 font-mono text-[12px] text-white focus:outline-none focus:border-orange-400/50"
        >
          <option value={15}>15 min before</option>
          <option value={30}>30 min before</option>
          <option value={45}>45 min before</option>
          <option value={60}>1 hour before</option>
        </select>
      </div>
      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
        One nudge to start winding down. Phones away — your sleep tomorrow night thanks you.
      </p>
    </div>
  );
}
