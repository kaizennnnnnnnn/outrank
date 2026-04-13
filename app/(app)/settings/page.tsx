'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { updateDocument } from '@/lib/firestore';
import { uploadAvatar } from '@/lib/storage';
import { sanitize, sanitizeBio } from '@/lib/security';
import { logout } from '@/lib/auth';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, firebaseUser } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const router = useRouter();

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
    router.push('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white font-heading">Settings</h1>

      {/* Profile */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Profile</h2>

        <div className="flex items-center gap-4">
          <Avatar src={user.avatarUrl} alt={user.username} size="lg" />
          <div>
            <label className="cursor-pointer">
              <Button variant="secondary" size="sm" loading={uploading} onClick={() => {}}>
                Change Avatar
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <Input label="Username" value={user.username} disabled />
        <Input label="Email" value={user.email} disabled />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="w-full rounded-xl bg-[#10101a] border border-[#1e1e30] px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            placeholder="Tell others about yourself..."
          />
          <p className="text-xs text-slate-600 mt-1">{bio.length}/160</p>
        </div>

        <Button onClick={handleSave} loading={saving}>Save Changes</Button>
      </section>

      {/* Connected Accounts */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Connected Accounts</h2>
        <p className="text-xs text-slate-600">Connect services to auto-track habits with verified data.</p>

        {/* GitHub */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0c0c16] border border-[#1e1e30]">
          <span className="text-2xl">⌨️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">GitHub</p>
            <p className="text-xs text-slate-500">Auto-track commits and coding activity</p>
          </div>
          {user.integrations?.github ? (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">✓ Connected</span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/auth/github?userId=${user.uid}`;
              }}
            >
              Connect
            </Button>
          )}
        </div>

        {/* Google Fit */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0c0c16] border border-[#1e1e30]">
          <span className="text-2xl">❤️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Google Fit</p>
            <p className="text-xs text-slate-500">Auto-track steps, calories, sleep</p>
          </div>
          {user.integrations?.google_fit ? (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">✓ Connected</span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/auth/google-fit?userId=${user.uid}`;
              }}
            >
              Connect
            </Button>
          )}
        </div>

        <p className="text-[10px] text-slate-600">
          Connected services auto-log with ✓ verified status and +5 bonus XP per log.
        </p>
      </section>

      {/* Notifications */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Notifications</h2>
        {([
          { key: 'streakReminder', label: 'Streak reminders', desc: 'Get reminded when your streak is at risk' },
          { key: 'friendActivity', label: 'Friend activity', desc: 'When friends log habits' },
          { key: 'duelUpdates', label: 'Duel updates', desc: 'Challenge and result notifications' },
          { key: 'leagueUpdates', label: 'League updates', desc: 'League activity and winners' },
          { key: 'weeklyRecap', label: 'Weekly recap', desc: 'Sunday morning performance summary' },
          { key: 'leaderboardChanges', label: 'Leaderboard changes', desc: 'When someone overtakes you' },
        ] as const).map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{item.label}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
            <button
              onClick={async () => {
                const current = user.settings?.notifications?.[item.key] ?? true;
                await updateDocument('users', user.uid, {
                  [`settings.notifications.${item.key}`]: !current,
                });
                addToast({ type: 'info', message: `${item.label} ${current ? 'disabled' : 'enabled'}` });
              }}
              className={`w-12 h-6 rounded-full transition-colors ${
                (user.settings?.notifications?.[item.key] ?? true) ? 'bg-red-600' : 'bg-[#18182a]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                (user.settings?.notifications?.[item.key] ?? true) ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        ))}
      </section>

      {/* Privacy */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Privacy</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Public Profile</p>
            <p className="text-xs text-slate-500">Anyone can view your profile</p>
          </div>
          <button
            onClick={async () => {
              await updateDocument('users', user.uid, { isPublic: !user.isPublic });
              addToast({ type: 'info', message: user.isPublic ? 'Profile set to private' : 'Profile set to public' });
            }}
            className={`w-12 h-6 rounded-full transition-colors ${user.isPublic ? 'bg-red-600' : 'bg-[#18182a]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${user.isPublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Show on Leaderboards</p>
            <p className="text-xs text-slate-500">Appear in public rankings</p>
          </div>
          <button
            onClick={async () => {
              const current = user.settings?.privacy?.showOnLeaderboards ?? true;
              await updateDocument('users', user.uid, {
                'settings.privacy.showOnLeaderboards': !current,
              });
              addToast({ type: 'info', message: current ? 'Hidden from leaderboards' : 'Visible on leaderboards' });
            }}
            className={`w-12 h-6 rounded-full transition-colors ${
              (user.settings?.privacy?.showOnLeaderboards ?? true) ? 'bg-red-600' : 'bg-[#18182a]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              (user.settings?.privacy?.showOnLeaderboards ?? true) ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Data</h2>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => addToast({ type: 'info', message: 'Data export is being prepared. Check your email.' })}
        >
          Export My Data (JSON)
        </Button>
      </section>

      {/* Account Actions */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Account</h2>
        <Button variant="secondary" onClick={handleLogout} className="w-full">
          Sign Out
        </Button>
        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} className="w-full">
          Delete Account
        </Button>
      </section>

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
