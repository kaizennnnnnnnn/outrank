'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CATEGORIES, CATEGORY_SECTIONS } from '@/constants/categories';
import { createDocument, getCollection, where, Timestamp } from '@/lib/firestore';
import { Competition } from '@/types/competition';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';

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
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* VS Header — editorial three-column */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 8,
            padding: '12px 0',
            borderTop: '1px solid var(--b-ink)',
            borderBottom: '1px solid var(--b-rule)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Avatar src={user?.avatarUrl} alt={user?.username || ''} size="md" />
            <span
              className="font-body"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--b-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.username}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 12px',
              borderLeft: '1px solid var(--b-rule)',
              borderRight: '1px solid var(--b-rule)',
            }}
          >
            <SwordsCrossIcon size={20} className="text-[color:var(--b-accent)]" />
            <span
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 2 }}
            >
              vs
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
              justifyContent: 'flex-end',
            }}
          >
            <span
              className="font-body"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--b-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'right',
              }}
            >
              {opponentUsername}
            </span>
            <Avatar src={opponentAvatar} alt={opponentUsername} size="md" />
          </div>
        </div>

        {/* Category — ALL categories grouped by section */}
        <div>
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
          >
            Pick a Category
          </div>
          <div
            style={{
              maxHeight: '40vh',
              overflowY: 'auto',
              paddingRight: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {CATEGORY_SECTIONS.map((section) => (
              <div key={section}>
                <p
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-40)', marginBottom: 6 }}
                >
                  {section}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                  }}
                >
                  {CATEGORIES.filter((c) => c.section === section).map((cat) => {
                    const isSel = selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className="font-body"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          padding: 8,
                          background: isSel ? 'var(--b-paper-2)' : 'transparent',
                          border: isSel ? '1px solid var(--b-ink)' : '1px solid var(--b-rule)',
                          cursor: 'pointer',
                        }}
                      >
                        <CategoryIcon
                          icon={cat.icon}
                          color={cat.color}
                          size="sm"
                          slug={cat.slug}
                          selected={isSel}
                        />
                        <span
                          style={{
                            fontSize: 9,
                            lineHeight: 1.2,
                            textAlign: 'center',
                            color: isSel ? 'var(--b-ink)' : 'var(--b-ink-60)',
                            fontWeight: isSel ? 600 : 500,
                          }}
                        >
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {selectedCat && (
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                color: 'var(--b-accent)',
              }}
            >
              <CategoryIcon
                icon={selectedCat.icon}
                color={selectedCat.color}
                size="sm"
                slug={selectedCat.slug}
              />
              <span style={{ fontWeight: 600 }}>{selectedCat.name}</span>
              <span style={{ color: 'var(--b-ink-60)' }}>selected</span>
            </div>
          )}
        </div>

        {/* Duration — outlined ink toggles */}
        <div>
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
          >
            Duration
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {durations.map((d) => {
              const isSel = selectedDuration === d.days;
              return (
                <button
                  key={d.days}
                  onClick={() => setSelectedDuration(d.days)}
                  className="font-body"
                  style={{
                    flex: 1,
                    padding: '10px 6px',
                    background: isSel ? 'var(--b-ink)' : 'transparent',
                    color: isSel ? 'var(--b-paper)' : 'var(--b-ink-60)',
                    border: '1px solid var(--b-ink)',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary blockquote */}
        {selectedCat && (
          <div
            style={{
              borderTop: '2px solid var(--b-ink)',
              paddingTop: 10,
            }}
          >
            <p
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--b-ink)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              <em
                className="font-display"
                style={{ fontStyle: 'italic', fontSize: 14 }}
              >
                {user?.username}
              </em>{' '}
              challenges{' '}
              <em
                className="font-display"
                style={{ fontStyle: 'italic', fontSize: 14 }}
              >
                {opponentUsername}
              </em>{' '}
              to a{' '}
              <span style={{ fontWeight: 600 }}>{selectedCat.name}</span> duel
              over{' '}
              <span className="font-mono tabular" style={{ fontWeight: 600 }}>
                {selectedDuration} days
              </span>
              .
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleCreate}
          disabled={!selectedCategory || creating}
          className="font-body"
          style={{
            width: '100%',
            height: 46,
            border: '1px solid var(--b-ink)',
            background: !selectedCategory ? 'var(--b-paper-2)' : 'var(--b-ink)',
            color: !selectedCategory ? 'var(--b-ink-40)' : 'var(--b-paper)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: !selectedCategory || creating ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <SwordsCrossIcon size={14} />
          {creating ? 'Sending…' : 'Send Challenge'}
        </button>
      </div>
    </Modal>
  );
}
