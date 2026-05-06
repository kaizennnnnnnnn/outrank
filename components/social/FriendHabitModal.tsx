'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { BFlameGlyph } from '@/components/editorial/BGlyphs';
import { getCollection, createDocument, orderBy, Timestamp } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { UserHabit } from '@/types/habit';

interface FriendHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendUsername: string;
  friendAvatar: string;
}

/**
 * Editorial Direction B v2 friend-habits modal. Hairline rows for each
 * tracked habit; logged-today rows get an accent left stripe and a
 * spread-caps "Logged" tag. Inline reminder + message inputs pop below
 * each row and stay on paper.
 */
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
      <div className="dir-b" style={{ color: 'var(--b-ink)' }}>
        {/* Friend header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid var(--b-ink)',
            borderBottom: '1px solid var(--b-ink)',
          }}
        >
          <Avatar src={friendAvatar} alt={friendUsername} size="md" />
          <div>
            <p
              className="font-display"
              style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, margin: 0 }}
            >
              {friendUsername}
            </p>
            <p
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: '2px 0 0', letterSpacing: '0.04em' }}
            >
              {habits.length} HABITS TRACKED
            </p>
          </div>
        </div>

        {/* Habits list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 64, border: '1px solid var(--b-rule)' }} />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '24px 0' }}
          >
            No habits yet
          </p>
        ) : (
          <div
            style={{
              maxHeight: '50vh',
              overflowY: 'auto',
              paddingRight: 4,
              marginTop: 4,
            }}
          >
            {habits.map((habit) => {
              const loggedToday = habit.lastLogDate
                ? new Date(habit.lastLogDate.toDate()).toDateString() === today.toDateString()
                : false;
              const reminded = remindedIds.includes(habit.categorySlug);

              return (
                <div key={habit.categorySlug}>
                  <div
                    style={{
                      padding: '12px 0 12px 12px',
                      borderBottom: '1px solid var(--b-rule)',
                      borderLeft: loggedToday ? '2px solid var(--b-accent)' : '2px solid transparent',
                    }}
                  >
                    {/* Top row: icon + info + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="sm" slug={habit.categorySlug} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          className="font-display"
                          style={{
                            fontSize: 14,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            color: 'var(--b-ink)',
                            margin: 0,
                          }}
                        >
                          {habit.categoryName}
                        </p>
                        <p
                          className="font-mono tabular"
                          style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: '2px 0 0' }}
                        >
                          Goal: {habit.goal} {habit.unit}
                        </p>
                      </div>
                      {habit.currentStreak > 0 && (
                        <span
                          className="font-display tabular"
                          aria-label={`${habit.currentStreak} day streak`}
                          title={`${habit.currentStreak}-day streak`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 6px',
                            border: '1px solid var(--b-rule)',
                            color: 'var(--b-ink)',
                            fontStyle: 'italic',
                            fontWeight: 600,
                            fontSize: 13,
                            letterSpacing: '-0.01em',
                            lineHeight: 1,
                          }}
                        >
                          <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                            <BFlameGlyph size={11} />
                          </span>
                          {habit.currentStreak}
                          <span
                            className="font-body"
                            style={{
                              fontSize: 8.5,
                              fontStyle: 'normal',
                              fontWeight: 600,
                              color: 'var(--b-ink-60)',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              marginLeft: 1,
                            }}
                          >
                            d
                          </span>
                        </span>
                      )}
                    </div>
                    {/* Bottom row: actions */}
                    {loggedToday ? (
                      <div style={{ paddingLeft: 44, marginTop: 8 }}>
                        <span
                          className="spread"
                          style={{ fontSize: 9, color: 'var(--b-accent)' }}
                        >
                          Logged today
                        </span>
                      </div>
                    ) : reminded ? (
                      <div style={{ paddingLeft: 44, marginTop: 8 }}>
                        <span
                          className="spread"
                          style={{ fontSize: 9, color: 'var(--b-accent)' }}
                        >
                          Reminder sent
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, paddingLeft: 44, marginTop: 8 }}>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => remind(habit.categorySlug, habit.categoryName)}>
                          Remind
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1" onClick={() => setMessageTarget(
                          messageTarget === habit.categorySlug ? null : habit.categorySlug
                        )}>
                          Message
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Custom message input */}
                  {messageTarget === habit.categorySlug && (
                    <div style={{ display: 'flex', gap: 8, padding: '10px 0 10px 44px' }}>
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
