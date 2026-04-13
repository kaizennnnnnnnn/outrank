'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createDocument, setDocument, Timestamp } from '@/lib/firestore';
import { sanitize } from '@/lib/security';
import { generateInviteCode } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { League } from '@/types/league';
import { FlagIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

export default function LeaguesPage() {
  const { user } = useAuth();
  const { data: leagues, loading } = useCollection<League>('leagues', [], !!user);
  const addToast = useUIStore((s) => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const inviteCode = generateInviteCode();
      const leagueId = await createDocument('leagues', {
        name: sanitize(name),
        description: sanitize(description),
        creatorId: user.uid,
        inviteCode,
        isPrivate: true,
        memberCount: 1,
        avatarUrl: '',
        pinnedMessage: '',
      });

      await setDocument(`leagues/${leagueId}/members`, user.uid, {
        userId: user.uid,
        role: 'admin',
        joinedAt: Timestamp.now(),
        totalXP: 0,
      });

      setShowCreate(false);
      setName('');
      setDescription('');
      addToast({ type: 'success', message: `League created! Invite code: ${inviteCode}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to create league' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Leagues</h1>
          <p className="text-sm text-slate-500">Create or join private competition groups.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create League</Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : leagues.length === 0 ? (
        <EmptyState
          icon={<FlagIcon size={40} className="text-red-400" />}
          title="No leagues yet"
          description="Create a league and invite friends to compete as a group."
          action={<Button onClick={() => setShowCreate(true)}>Create League</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <div className="glass-card rounded-2xl p-4 glow-hover transition-all h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                    <FlagIcon size={20} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{league.name}</p>
                    <p className="text-xs text-slate-500">{league.memberCount} members</p>
                  </div>
                </div>
                {league.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{league.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create League Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create League">
        <div className="space-y-4">
          <Input
            label="League Name"
            placeholder="My Squad"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-[#10101a] border border-[#1e1e30] px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
              placeholder="What's this league about?"
            />
          </div>
          <Button className="w-full" onClick={handleCreate} loading={creating} disabled={!name.trim()}>
            Create League
          </Button>
        </div>
      </Modal>
    </div>
  );
}
