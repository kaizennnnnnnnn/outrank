'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CATEGORIES } from '@/constants/categories';
import { createDocument, Timestamp } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface CreateDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentId: string;
  opponentUsername: string;
  opponentAvatar: string;
}

const durations = [
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
];

export function CreateDuelModal({ isOpen, onClose, opponentId, opponentUsername, opponentAvatar }: CreateDuelModalProps) {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !selectedCategory) return;

    const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
    if (!cat) return;

    setCreating(true);
    try {
      const startDate = Timestamp.now();
      const endMs = Date.now() + selectedDuration * 24 * 60 * 60 * 1000;
      const endDate = Timestamp.fromDate(new Date(endMs));

      await createDocument('competitions', {
        type: 'duel',
        categoryId: selectedCategory,
        categorySlug: selectedCategory,
        title: `${cat.icon} ${cat.name} Duel`,
        creatorId: user.uid,
        startDate,
        endDate,
        status: 'pending',
        participants: [
          {
            userId: user.uid,
            username: user.username,
            avatarUrl: user.avatarUrl || '',
            score: 0,
            rank: 0,
          },
          {
            userId: opponentId,
            username: opponentUsername,
            avatarUrl: opponentAvatar,
            score: 0,
            rank: 0,
          },
        ],
      });

      addToast({ type: 'success', message: `Duel challenge sent to ${opponentUsername}! ⚔️` });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Failed to create duel' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Challenge to a Duel" size="md">
      <div className="space-y-5">
        {/* Opponent */}
        <div className="flex items-center gap-3 bg-[#18182a] rounded-xl p-3">
          <Avatar src={opponentAvatar} alt={opponentUsername} size="md" />
          <div>
            <p className="text-sm font-bold text-white">{opponentUsername}</p>
            <p className="text-xs text-slate-500">Your opponent</p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Pick a category</label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {CATEGORIES.slice(0, 24).map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                  selectedCategory === cat.slug
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[#1e1e30] hover:border-[#2d2d45]'
                )}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[9px] text-slate-400 text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Duration</label>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button
                key={d.days}
                onClick={() => setSelectedDuration(d.days)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                  selectedDuration === d.days
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-[#1e1e30] text-slate-500 hover:text-white'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCreate}
          loading={creating}
          disabled={!selectedCategory}
        >
          Send Challenge ⚔️
        </Button>
      </div>
    </Modal>
  );
}
