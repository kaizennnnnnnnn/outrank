'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCollection, updateDocument, where, orderBy, limit } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

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

export default function AdminPage() {
  const { user } = useAuth();
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
        where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Admin Panel</h1>
        <p className="text-sm text-slate-500">Manage reports, users, and app stats.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#10101a] rounded-xl p-1 border border-[#1e1e30] w-fit">
        {(['reports', 'users', 'stats'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all',
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">
            Pending Reports ({reports.filter((r) => r.status === 'pending').length})
          </h2>
          {reportsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : reports.filter((r) => r.status === 'pending').length === 0 ? (
            <EmptyState icon="✅" title="No pending reports" />
          ) : (
            reports
              .filter((r) => r.status === 'pending')
              .map((report) => (
                <div key={report.id} className="glass-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Report against: <span className="text-red-400">{report.targetId}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Reason: {report.reason} &bull;{' '}
                        {report.createdAt?.toDate ? formatRelativeTime(report.createdAt.toDate()) : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          handleBan(report.targetId, true);
                          handleResolveReport(report.id);
                        }}
                      >
                        Ban User
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
                    <p className="text-xs text-slate-400">{report.description}</p>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} loading={searching}>Search</Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 glass-card rounded-xl p-3">
                  <Avatar src={u.avatarUrl} alt={u.username} size="md" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{u.username}</p>
                    <p className="text-xs text-slate-500">
                      {u.email} &bull; Lv.{u.level} &bull; {u.totalXP} XP
                      {u.isBanned && <span className="text-red-400 ml-2">BANNED</span>}
                    </p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-3xl font-heading font-bold text-cyan-400">--</p>
            <p className="text-xs text-slate-500 mt-1">Total Users</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-3xl font-heading font-bold text-orange-400">--</p>
            <p className="text-xs text-slate-500 mt-1">Logs Today</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-3xl font-heading font-bold text-emerald-400">--</p>
            <p className="text-xs text-slate-500 mt-1">Active Duels</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-3xl font-heading font-bold text-red-400">
              {reports.filter((r) => r.status === 'pending').length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Pending Reports</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-3xl font-heading font-bold text-blue-400">--</p>
            <p className="text-xs text-slate-500 mt-1">Total Leagues</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-3xl font-heading font-bold text-yellow-400">52</p>
            <p className="text-xs text-slate-500 mt-1">Categories</p>
          </div>
        </div>
      )}
    </div>
  );
}
