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
 * Function every 15 minutes.
 *
 * Editorial Direction B v2: paper background, hairline border with a
 * 3px left stripe in the pillar's category color. Square ink-outlined
 * Save button. Toggle uses ink/accent.
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
      style={{
        background: 'var(--b-paper)',
        border: '1px solid var(--b-rule)',
        borderLeft: `3px solid ${color}`,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <p
          className="spread"
          style={{ fontSize: 9, color }}
        >
          Reminders
        </p>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="spread transition-colors disabled:opacity-50"
            style={{
              fontSize: 10,
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid var(--b-ink)',
              color: 'var(--b-ink)',
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--b-rule)',
      }}
    >
      <span
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink)' }}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className="relative w-10 h-5 transition-colors"
        style={{
          background: value ? color : 'transparent',
          border: `1px solid ${value ? color : 'var(--b-ink-40)'}`,
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-3.5 h-3.5 transition-transform"
          style={{
            background: value ? 'var(--b-paper)' : 'var(--b-ink)',
            transform: value ? 'translateX(20px)' : 'translateX(0)',
          }}
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--b-rule)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
      >
        {label}
      </span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="font-body tabular"
        style={{
          background: 'transparent',
          border: '1px solid var(--b-rule)',
          padding: '4px 8px',
          fontSize: 12,
          color: 'var(--b-ink)',
          outline: 'none',
          colorScheme: 'dark',
        }}
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid var(--b-rule)',
          opacity: !draft.waterEnabled ? 0.5 : 1,
        }}
      >
        <span
          className="font-body"
          style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
        >
          Every
        </span>
        <select
          disabled={!draft.waterEnabled}
          value={draft.waterCadenceMinutes}
          onChange={(e) => setDraft((d) => ({ ...d, waterCadenceMinutes: parseInt(e.target.value, 10) }))}
          className="font-body tabular"
          style={{
            background: 'transparent',
            border: '1px solid var(--b-rule)',
            padding: '4px 8px',
            fontSize: 12,
            color: 'var(--b-ink)',
            outline: 'none',
          }}
        >
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
        </select>
      </div>
      <p
        className="font-body"
        style={{
          fontSize: 11,
          color: 'var(--b-ink-40)',
          marginTop: 12,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid var(--b-rule)',
          opacity: !draft.sleepReminderEnabled ? 0.5 : 1,
        }}
      >
        <span
          className="font-body"
          style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
        >
          Remind me
        </span>
        <select
          disabled={!draft.sleepReminderEnabled}
          value={draft.sleepWindDownMinutes}
          onChange={(e) => setDraft((d) => ({ ...d, sleepWindDownMinutes: parseInt(e.target.value, 10) }))}
          className="font-body tabular"
          style={{
            background: 'transparent',
            border: '1px solid var(--b-rule)',
            padding: '4px 8px',
            fontSize: 12,
            color: 'var(--b-ink)',
            outline: 'none',
          }}
        >
          <option value={15}>15 min before</option>
          <option value={30}>30 min before</option>
          <option value={45}>45 min before</option>
          <option value={60}>1 hour before</option>
        </select>
      </div>
      <p
        className="font-body"
        style={{
          fontSize: 11,
          color: 'var(--b-ink-40)',
          marginTop: 12,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        One nudge to start winding down. Phones away — your sleep tomorrow night thanks you.
      </p>
    </div>
  );
}
