'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCollection, where } from '@/lib/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LevelBadge } from '@/components/profile/LevelBadge';
import { XPProgressBar } from '@/components/profile/XPProgressBar';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { StatCard } from '@/components/profile/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserProfile } from '@/types/user';
import { BoltFullIcon, UsersFullIcon, FireIcon, ChartBarIcon, SearchIcon } from '@/components/ui/AppIcons';

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const users = await getCollection<UserProfile>('users', [
          where('username', '==', username),
        ]);
        setProfile(users[0] || null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600 mx-auto" />
        <h1 className="text-xl font-bold text-white mt-4">User not found</h1>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === profile.uid;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <LevelBadge totalXP={profile.totalXP} size="lg" />
        </div>
        <div className="flex justify-center mb-2">
          <Avatar src={profile.avatarUrl} alt={profile.username} size="xl" />
        </div>
        <h1 className="text-xl font-bold text-white">{profile.username}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs text-slate-500">Lv.{profile.level}</span>
          <TitleDisplay totalXP={profile.totalXP} />
        </div>
        {profile.bio && <p className="text-sm text-slate-400 mt-2">{profile.bio}</p>}

        <div className="mt-4 max-w-xs mx-auto">
          <XPProgressBar totalXP={profile.totalXP} />
        </div>

        {!isOwnProfile && (
          <div className="flex justify-center gap-3 mt-4">
            <Button size="sm">Add Friend</Button>
            <Button size="sm" variant="outline">Challenge</Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<BoltFullIcon size={24} className="text-cyan-400" />} value={profile.totalXP.toLocaleString()} label="Total XP" />
        <StatCard icon={<UsersFullIcon size={24} className="text-blue-400" />} value={profile.friendCount.toString()} label="Friends" />
        <StatCard icon={<FireIcon size={24} className="text-orange-400" />} value={`${profile.weeklyXP}`} label="Weekly XP" />
        <StatCard icon={<ChartBarIcon size={24} className="text-blue-400" />} value={`${profile.monthlyXP}`} label="Monthly XP" />
      </div>

      {/* Badges */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Badges</h2>
        <BadgeGrid userId={profile.uid} />
      </div>
    </div>
  );
}
