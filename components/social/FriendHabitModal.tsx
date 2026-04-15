'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { StreakFlame } from '@/components/habits/StreakFlame';
import { getCollection, createDocument, orderBy, Timestamp } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { UserHabit } from '@/types/habit';
import { cn } from '@/lib/utils';

interface FriendHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendUsername: string;
  friendAvatar: string;
}

export function FriendHabitModal({ isOpen, onClose, friendId, friendUsername, friendAvatar }: FriendHabitModalProps) {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindedIds, setRemindedIds] = useState<string[]>([]);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !friendId) return;
    async function fetch() {
      try {
        const h = await getCollection<UserHabit>(`habits/${friendId}/userHabits`, [
          orderBy('createdAt', 'desc'),
        ]);
        setHabits(h);
      } catch (err) {
        console.error('Failed to load friend habits:', err);
        setHabits([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [isOpen, friendId]);

  const remind = async (habitSlug: string, habitName: string, customMessage?: string) => {
    if (!user) return;
    try {
      const msg = customMessage
        ? `Message from ${user.username} about ${habitName}: "${customMessage}"`
        : `${user.username} reminded you to log ${habitName} today!`;

      await createDocument(`notifications/${friendId}/items`, {
        type: 'streak_at_risk',
        message: msg,
        isRead: false,
        relatedId: habitSlug,
        actorId: user.uid,
        actorAvatar: user.avatarUrl || '',
        createdAt: Timestamp.now(),
      });
      setRemindedIds((prev) => [...prev, habitSlug]);
      setMessageTarget(null);
      setMessage('');
      addToast({ type: 'success', message: `Reminded ${friendUsername} about ${habitName}!` });
    } catch {
      addToast({ type: 'error', message: 'Failed to send reminder' });
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${friendUsername}'s Habits`} size="md">
      <div className="space-y-4">
        {/* Friend header */}
        <div className="flex items-center gap-3 bg-[#0c0c16] rounded-xl p-3">
          <Avatar src={friendAvatar} alt={friendUsername} size="md" />
          <div>
            <p className="text-sm font-bold text-white">{friendUsername}</p>
            <p className="text-xs text-slate-500">{habits.length} habits tracked</p>
          </div>
        </div>

        {/* Habits list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#18182a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No habits yet</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {habits.map((habit) => {
              const loggedToday = habit.lastLogDate
                ? new Date(habit.lastLogDate.toDate()).toDateString() === today.toDateString()
                : false;
              const reminded = remindedIds.includes(habit.categorySlug);

              return (
                <div key={habit.categorySlug} className="space-y-2">
                  <div className={cn(
                    'flex items-center gap-3 rounded-xl p-3 border',
                    loggedToday
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-[#10101a] border-[#1e1e30]'
                  )}>
                    <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="sm" slug={habit.categorySlug} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{habit.categoryName}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Goal: {habit.goal} {habit.unit}</span>
                        {habit.currentStreak > 0 && (
                          <StreakFlame streak={habit.currentStreak} size="sm" />
                        )}
                      </div>
                    </div>
                    {loggedToday ? (
                      <span className="text-xs text-emerald-400 font-medium">Done</span>
                    ) : reminded ? (
                      <span className="text-xs text-orange-400 font-medium">Sent</span>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => remind(habit.categorySlug, habit.categoryName)}>
                          Remind
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setMessageTarget(
                          messageTarget === habit.categorySlug ? null : habit.categorySlug
                        )}>
                          Message
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Custom message input */}
                  {messageTarget === habit.categorySlug && (
                    <div className="flex gap-2 pl-10">
                      <Input
                        placeholder="Add a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={() => remind(habit.categorySlug, habit.categoryName, message)}>
                        Send
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
