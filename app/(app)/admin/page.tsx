'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { getCollection, updateDocument, where, orderBy, limit } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { formatRelativeTime } from '@/lib/utils';
import { Masthead } from '@/components/editorial/Masthead';

interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: string;
  reason: string;
  description: string;
  status: string;
  createdAt: { toDate: () => Date };
}

interface UserBasic {
  uid: string;
  username: string;
  email: string;
  avatarUrl: string;
  isBanned: boolean;
  totalXP: number;
  level: number;
}

const TABS: { id: 'reports' | 'users' | 'stats'; label: string }[] = [
  { id: 'reports', label: 'Reports' },
  { id: 'users',   label: 'Users' },
  { id: 'stats',   label: 'Stats' },
];

export default function AdminPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [tab, setTab] = useState<'reports' | 'users' | 'stats'>('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserBasic[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: reports, loading: reportsLoading } = useCollection<Report>(
    'reports',
    [orderBy('createdAt', 'desc'), limit(50)],
    true
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await getCollection<UserBasic>('users', [
        where('username', '>=', searchQuery.toLowerCase()),
        where('username', '<=', searchQuery.toLowerCase() + ''),
      ]);
      setSearchResults(results);
    } catch {
      addToast({ type: 'error', message: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const handleBan = async (userId: string, ban: boolean) => {
    try {
      await updateDocument('users', userId, { isBanned: ban });
      addToast({ type: 'success', message: ban ? 'User banned' : 'User unbanned' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update user' });
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDocument('reports', reportId, { status: 'reviewed' });
      addToast({ type: 'success', message: 'Report marked as reviewed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update report' });
    }
  };

  const pending = reports.filter((r) => r.status === 'pending');

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Admin" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Internal · Moderation
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Admin Panel</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Manage reports, users, and app stats.
          </p>

          {/* Tabs */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            {TABS.map((t, i) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="font-body"
                  style={{
                    padding: '10px 0',
                    background: 'transparent',
                    border: 'none',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--b-rule)',
                    borderBottom: active ? '2px solid var(--b-accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Reports */}
          {tab === 'reports' && (
            <section style={{ marginTop: 18 }}>
              <div
                style={{
                  paddingTop: 12,
                  borderTop: '1px solid var(--b-ink)',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, color: '#ef4444' }}>
                  Pending Reports
                </div>
                <div
                  className="font-mono tabular"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
                >
                  § {String(pending.length).padStart(2, '0')}
                </div>
              </div>
              {reportsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : pending.length === 0 ? (
                <p
                  className="font-body"
                  style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '24px 0', fontStyle: 'italic' }}
                >
                  No pending reports.
                </p>
              ) : (
                pending.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: '12px 14px',
                      border: '1px solid var(--b-rule)',
                      borderLeft: '3px solid #ef4444',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          className="font-display"
                          style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.2 }}
                        >
                          Report against:{' '}
                          <span style={{ color: '#ef4444' }}>{report.targetId}</span>
                        </div>
                        <div
                          className="font-mono tabular"
                          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, letterSpacing: '0.04em' }}
                        >
                          {report.reason}
                          <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                          {report.createdAt?.toDate ? formatRelativeTime(report.createdAt.toDate()) : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            handleBan(report.targetId, true);
                            handleResolveReport(report.id);
                          }}
                        >
                          Ban
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResolveReport(report.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                    {report.description && (
                      <p
                        className="font-body"
                        style={{ fontSize: 11, color: 'var(--b-ink)', marginTop: 8, lineHeight: 1.5 }}
                      >
                        {report.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>
          )}

          {/* Users */}
          {tab === 'users' && (
            <section style={{ marginTop: 18 }}>
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
              >
                Find user
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder="Search username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} loading={searching}>Search</Button>
              </div>

              {searchResults.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0 }}>
                  {searchResults.map((u) => (
                    <li
                      key={u.uid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                      }}
                    >
                      <Avatar src={u.avatarUrl} alt={u.username} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="font-display"
                          style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1 }}
                        >
                          {u.username}
                          {u.isBanned && (
                            <span
                              className="spread"
                              style={{ fontSize: 8, color: '#ef4444', marginLeft: 6 }}
                            >
                              Banned
                            </span>
                          )}
                        </div>
                        <div
                          className="font-mono tabular"
                          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, letterSpacing: '0.04em' }}
                        >
                          {u.email} · Lv.{u.level} · {u.totalXP} XP
                        </div>
                      </div>
                      {u.isBanned ? (
                        <Button size="sm" variant="secondary" onClick={() => handleBan(u.uid, false)}>
                          Unban
                        </Button>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => handleBan(u.uid, true)}>
                          Ban
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Stats */}
          {tab === 'stats' && (
            <div
              style={{
                marginTop: 18,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
                background: 'var(--b-rule)',
                border: '1px solid var(--b-ink)',
              }}
            >
              <StatTile label="Total Users" value="—" accent="#f97316" />
              <StatTile label="Logs Today" value="—" accent="#fbbf24" />
              <StatTile label="Active Duels" value="—" accent="#34d399" />
              <StatTile label="Pending Reports" value={String(pending.length)} accent="#ef4444" />
              <StatTile label="Total Leagues" value="—" accent="#a855f7" />
              <StatTile label="Categories" value="52" accent="#60a5fa" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        padding: '20px 14px',
        background: 'var(--b-paper)',
        textAlign: 'center',
      }}
    >
      <div
        className="font-display tabular"
        style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, color: accent, lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        className="spread"
        style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 6 }}
      >
        {label}
      </div>
    </div>
  );
}
