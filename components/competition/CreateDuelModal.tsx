'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CATEGORIES, CATEGORY_SECTIONS } from '@/constants/categories';
import { createDocument, getCollection, where, Timestamp } from '@/lib/firestore';
import { Competition } from '@/types/competition';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';
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
      // Enforce one active/pending duel at a time per friend pair
      const [pending, active] = await Promise.all([
        getCollection<Competition>('competitions', [where('status', '==', 'pending')]),
        getCollection<Competition>('competitions', [where('status', '==', 'active')]),
      ]);
      const conflict = [...pending, ...active].find(
        (c) =>
          c.type === 'duel' &&
          c.participants.some((p) => p.userId === user.uid) &&
          c.participants.some((p) => p.userId === opponentId),
      );
      if (conflict) {
        addToast({
          type: 'error',
          message: `You already have a duel in progress with ${opponentUsername}. Wait for it to end.`,
        });
        setCreating(false);
        return;
      }

      const startDate = Timestamp.now();
      const endMs = Date.now() + selectedDuration * 24 * 60 * 60 * 1000;
      const endDate = Timestamp.fromDate(new Date(endMs));

      const compId = await createDocument('competitions', {
        type: 'duel',
        categoryId: selectedCategory,
        categorySlug: selectedCategory,
        title: `${cat.name} Duel`,
        creatorId: user.uid,
        startDate,
        endDate,
        durationDays: selectedDuration,
        status: 'pending',
        participants: [
          { userId: user.uid, username: user.username, avatarUrl: user.avatarUrl || '', score: 0, rank: 0 },
          { userId: opponentId, username: opponentUsername, avatarUrl: opponentAvatar, score: 0, rank: 0 },
        ],
      });

      // Send notification to opponent
      await createDocument(`notifications/${opponentId}/items`, {
        type: 'duel_challenge',
        message: `${user.username} challenged you to a ${cat.name} duel!`,
        isRead: false,
        relatedId: compId,
        actorId: user.uid,
        actorAvatar: user.avatarUrl || '',
      });

      addToast({ type: 'success', message: `Duel sent to ${opponentUsername}!` });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Failed to create duel' });
    } finally {
      setCreating(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.slug === selectedCategory);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Challenge to a Duel" size="lg">
      <div className="space-y-5">
        {/* VS Header */}
        <div className="flex items-center justify-between bg-[#0c0c16] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatarUrl} alt={user?.username || ''} size="md" />
            <span className="text-sm font-bold text-white">{user?.username}</span>
          </div>
          <div className="text-center">
            <SwordsCrossIcon size={24} className="text-red-400 mx-auto" />
            <span className="text-[10px] text-slate-600">VS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">{opponentUsername}</span>
            <Avatar src={opponentAvatar} alt={opponentUsername} size="md" />
          </div>
        </div>

        {/* Category — ALL categories grouped by section */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Pick a category</label>
          <div className="max-h-[40vh] overflow-y-auto pr-1 space-y-4">
            {CATEGORY_SECTIONS.map((section) => (
              <div key={section}>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{section}</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {CATEGORIES.filter((c) => c.section === section).map((cat) => (
                    <motion.button
                      key={cat.slug}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                        selectedCategory === cat.slug
                          ? 'border-red-500 bg-red-500/10 shadow-md shadow-red-500/10'
                          : 'border-[#1e1e30] bg-[#0c0c16] hover:border-[#2d2d45]'
                      )}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} size="sm" slug={cat.slug} selected={selectedCategory === cat.slug} />
                      <span className={cn(
                        'text-[8px] leading-tight text-center',
                        selectedCategory === cat.slug ? 'text-white font-medium' : 'text-slate-500'
                      )}>
                        {cat.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedCat && (
            <div className="mt-2 flex items-center gap-2 text-xs text-orange-400">
              <CategoryIcon icon={selectedCat.icon} color={selectedCat.color} size="sm" slug={selectedCat.slug} />
              <span className="font-medium">{selectedCat.name}</span> selected
            </div>
          )}
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
                  'flex-1 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all',
                  selectedDuration === d.days
                    ? 'border-red-500 bg-red-500/10 text-white'
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
          <SwordsCrossIcon size={16} />
          Send Challenge
        </Button>
      </div>
    </Modal>
  );
}
