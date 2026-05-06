'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { updateDocument } from '@/lib/firestore';
import { uploadAvatar } from '@/lib/storage';
import { sanitizeBio } from '@/lib/security';
import { logout } from '@/lib/auth';
import { useUIStore } from '@/store/uiStore';
import { useThemeStore, type EditorialTheme } from '@/store/themeStore';
import { Masthead } from '@/components/editorial/Masthead';

export default function SettingsPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDocument('users', user.uid, {
        bio: sanitizeBio(bio),
      });
      addToast({ type: 'success', message: 'Profile updated!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Image must be under 5MB' });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateDocument('users', user.uid, { avatarUrl: url });
      addToast({ type: 'success', message: 'Avatar updated!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to upload avatar' });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  const notifKeys = [
    { key: 'streakReminder',     label: 'Streak reminders',  desc: 'Get reminded when your streak is at risk' },
    { key: 'friendActivity',     label: 'Friend records',    desc: 'When friends publish a daily record' },
    { key: 'pactUpdates',        label: 'Pacts',             desc: 'Invites, breaks, completions, freeze warnings' },
    { key: 'leagueUpdates',      label: 'Friends League',    desc: 'Weekly settlement results every Monday' },
    { key: 'pillarReminders',    label: 'Pillar reminders',  desc: 'Water sips during the day, wind-down before bed' },
    { key: 'duelUpdates',        label: 'Duels',             desc: 'Challenge and result notifications' },
    { key: 'weeklyRecap',        label: 'Weekly recap',      desc: 'Sunday morning performance summary' },
    { key: 'leaderboardChanges', label: 'Leaderboard',       desc: 'When someone overtakes you' },
  ] as const;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Imprint" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            The Imprint
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Settings</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Tune the publication to your taste.
          </p>

          {/* Profile */}
          <Section title="Profile" eyebrow="Identity">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar src={user.avatarUrl} alt={user.username} size="lg" />
              <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                Change avatar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <Input label="Username" value={user.username} disabled />
            </div>
            <div style={{ marginTop: 10 }}>
              <Input label="Email" value={user.email} disabled />
            </div>

            <div style={{ marginTop: 12 }}>
              <label
                className="font-body"
                style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6 }}
              >
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full font-body"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--b-ink)',
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--b-ink)',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                placeholder="Tell others about yourself..."
              />
              <p
                className="font-mono tabular"
                style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 4 }}
              >
                {bio.length}/160
              </p>
            </div>

            <div style={{ marginTop: 12 }}>
              <Button onClick={handleSave} loading={saving}>Save changes</Button>
            </div>
          </Section>

          {/* Theme */}
          <ThemeSection />

          {/* Cosmetics shortcut */}
          <Section title="Cosmetics" eyebrow="Wardrobe">
            <p
              className="font-body"
              style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
            >
              Orb colors, frames, and name effects live in <a href="/shop" style={{ color: 'var(--b-accent)', textDecoration: 'none', fontWeight: 600 }}>The Atelier →</a>
            </p>
          </Section>

          {/* Push notifications setup */}
          <Section title="Push" eyebrow="Mobile alerts">
            <p
              className="font-body"
              style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
            >
              {typeof window !== 'undefined' && 'Notification' in window
                ? `Status: ${Notification.permission === 'granted' ? 'Enabled' : Notification.permission === 'denied' ? 'Blocked — enable in browser settings' : 'Not set up'}`
                : 'Not supported on this device'}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              style={{ marginTop: 10 }}
              onClick={async () => {
                try {
                  const { requestNotificationPermission } = await import('@/lib/pushNotifications');
                  const result = await requestNotificationPermission(user.uid);
                  if (result) {
                    addToast({ type: 'success', message: 'Notifications enabled!' });
                  } else {
                    addToast({ type: 'error', message: 'Permission denied. Check browser settings.' });
                  }
                } catch {
                  addToast({ type: 'error', message: 'Failed to enable notifications.' });
                }
              }}
            >
              Enable push notifications
            </Button>
            <p
              className="font-body"
              style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 6, lineHeight: 1.5 }}
            >
              On mobile, add Outrank to your Home Screen for best experience.
            </p>
          </Section>

          {/* Connected accounts */}
          <Section title="Integrations" eyebrow="Auto-tracking">
            <ServiceRow
              name="GitHub"
              desc="Auto-track commits and coding activity"
              connected={!!user.integrations?.github}
              onConnect={() => { window.location.href = `/api/auth/github?userId=${user.uid}`; }}
            />
            <ServiceRow
              name="Google Fit"
              desc="Auto-track steps, calories, sleep"
              connected={!!user.integrations?.google_fit}
              onConnect={() => { window.location.href = `/api/auth/google-fit?userId=${user.uid}`; }}
            />
            <p
              className="font-body"
              style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}
            >
              Connected services auto-log with verified status and +5 bonus XP per log.
            </p>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" eyebrow="What we can send">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifKeys.map((item) => {
                const enabled = user.settings?.notifications?.[item.key] ?? true;
                return (
                  <li
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--b-rule)',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-display"
                        style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500 }}
                      >
                        {item.label}
                      </div>
                      <div
                        className="font-body"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 1, lineHeight: 1.4 }}
                      >
                        {item.desc}
                      </div>
                    </div>
                    <Toggle
                      enabled={enabled}
                      onClick={async () => {
                        await updateDocument('users', user.uid, {
                          [`settings.notifications.${item.key}`]: !enabled,
                        });
                        addToast({ type: 'info', message: `${item.label} ${enabled ? 'disabled' : 'enabled'}` });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Privacy */}
          <Section title="Privacy" eyebrow="Visibility">
            <ToggleRow
              label="Public profile"
              desc="Anyone can view your profile"
              enabled={!!user.isPublic}
              onClick={async () => {
                await updateDocument('users', user.uid, { isPublic: !user.isPublic });
                addToast({ type: 'info', message: user.isPublic ? 'Profile set to private' : 'Profile set to public' });
              }}
            />
            <ToggleRow
              label="Show on leaderboards"
              desc="Appear in public rankings"
              enabled={user.settings?.privacy?.showOnLeaderboards ?? true}
              onClick={async () => {
                const current = user.settings?.privacy?.showOnLeaderboards ?? true;
                await updateDocument('users', user.uid, {
                  'settings.privacy.showOnLeaderboards': !current,
                });
                addToast({ type: 'info', message: current ? 'Hidden from leaderboards' : 'Visible on leaderboards' });
              }}
            />
          </Section>

          {/* Data */}
          <Section title="Data" eyebrow="Export">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => addToast({ type: 'info', message: 'Data export is being prepared. Check your email.' })}
            >
              Export my data (JSON)
            </Button>
          </Section>

          {/* Account */}
          <Section title="Account" eyebrow="Endgame">
            <Button variant="secondary" onClick={handleLogout} className="w-full">
              Sign out
            </Button>
            <div style={{ marginTop: 8 }}>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} className="w-full">
                Delete account
              </Button>
            </div>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          addToast({ type: 'info', message: 'Account deletion requests are handled via support.' });
          setShowDeleteConfirm(false);
        }}
        title="Delete Account?"
        description="This will permanently delete all your data including habits, logs, badges, and friendships. This cannot be undone."
        confirmText="Delete Everything"
        variant="danger"
      />
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
          {title}
        </div>
        {eyebrow && (
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            {eyebrow}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={enabled}
      style={{
        width: 40,
        height: 22,
        background: enabled ? 'var(--b-accent)' : 'transparent',
        border: '1px solid var(--b-ink)',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: enabled ? 20 : 2,
          width: 16,
          height: 16,
          background: enabled ? 'var(--b-paper)' : 'var(--b-ink)',
          transition: 'left 180ms',
        }}
      />
    </button>
  );
}

function ToggleRow({ label, desc, enabled, onClick }: { label: string; desc: string; enabled: boolean; onClick: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--b-rule)',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="font-display"
          style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500 }}
        >
          {label}
        </div>
        <div
          className="font-body"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 1, lineHeight: 1.4 }}
        >
          {desc}
        </div>
      </div>
      <Toggle enabled={enabled} onClick={onClick} />
    </div>
  );
}

function ServiceRow({ name, desc, connected, onConnect }: { name: string; desc: string; connected: boolean; onConnect: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: '1px solid var(--b-rule)',
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-display"
          style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}
        >
          {name}
        </div>
        <div
          className="font-body"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 1, lineHeight: 1.4 }}
        >
          {desc}
        </div>
      </div>
      {connected ? (
        <span
          className="spread"
          style={{ fontSize: 9, color: '#34d399', padding: '2px 8px', border: '1px solid #34d39980' }}
        >
          Connected
        </span>
      ) : (
        <Button size="sm" variant="secondary" onClick={onConnect}>
          Connect
        </Button>
      )}
    </div>
  );
}

function ThemeSection() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const options: { key: EditorialTheme; label: string; sub: string; preview: { paper: string; ink: string } }[] = [
    {
      key: 'dark',
      label: 'Ink',
      sub: 'Near-black paper, warm cream ink. The night edition.',
      preview: { paper: '#0d0d15', ink: '#f5f1ea' },
    },
    {
      key: 'light',
      label: 'Paper',
      sub: 'Cream paper, dark ink — like a printed periodical.',
      preview: { paper: '#f4f1ea', ink: '#14130f' },
    },
  ];

  return (
    <Section title="Theme" eyebrow="Paper & ink">
      <p
        className="font-body"
        style={{ fontSize: 11, color: 'var(--b-ink-60)', marginBottom: 12, lineHeight: 1.5 }}
      >
        Switches the editorial pages between dark and light cream paper.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {options.map((opt) => {
          const active = theme === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              style={{
                padding: 12,
                textAlign: 'left',
                background: 'transparent',
                border: active ? '2px solid var(--b-accent)' : '1px solid var(--b-rule)',
                cursor: 'pointer',
                color: 'var(--b-ink)',
              }}
            >
              <div
                style={{
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  gap: 8,
                  marginBottom: 8,
                  background: opt.preview.paper,
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#dc2626',
                  }}
                />
                <span
                  className="font-display"
                  style={{
                    fontSize: 14,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: opt.preview.ink,
                  }}
                >
                  Outrank
                </span>
              </div>
              <div
                className="font-display"
                style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}
              >
                {opt.label}
              </div>
              <p
                className="font-body"
                style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, lineHeight: 1.4 }}
              >
                {opt.sub}
              </p>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
