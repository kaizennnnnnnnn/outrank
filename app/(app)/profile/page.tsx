'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { Skeleton } from '@/components/ui/Skeleton';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { ProfileRecapCalendar } from '@/components/profile/ProfileRecapCalendar';
import { SeasonCard } from '@/components/profile/SeasonCard';
import { PrestigeCard } from '@/components/profile/PrestigeCard';
import { MasteryShelf } from '@/components/profile/MasteryShelf';
import { getLevelForXP } from '@/constants/levels';
import { Masthead } from '@/components/editorial/Masthead';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Profile — editorial Direction B v2 conversion. "Dossier" front
 * page: identity + level + member-since up top, then the design's
 * stat table (streak, longest, habits logged, duels won, friends,
 * badges earned), then a 28-day "FOUR WEEKS, IN INK" log-density
 * grid.
 *
 * Below the editorial summary I keep the existing rich components
 * (SeasonCard, PrestigeCard, BadgeGrid, etc.) under their own
 * editorial section header so power-user features stay accessible.
 * They're styled premium-dark (legacy) — visual polish on each is
 * a follow-up commit per component.
 */

export default function ProfilePage() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const { friends } = useFriends();

  const [perDay, setPerDay] = useState<number[]>(Array(28).fill(0));

  // Pull 28-day per-day log counts for the "FOUR WEEKS, IN INK" grid.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 27);
    (async () => {
      try {
        const q = query(
          collection(db, `logs/${user.uid}/habitLogs`),
          where('createdAt', '>=', Timestamp.fromDate(since)),
        );
        const snap = await getDocs(q);
        const buckets = new Array(28).fill(0) as number[];
        snap.forEach((d) => {
          const data = d.data() as { createdAt?: { toDate: () => Date } };
          const ts = data.createdAt?.toDate?.();
          if (!ts) return;
          const dayDiff = Math.floor((ts.getTime() - since.getTime()) / 86400000);
          if (dayDiff >= 0 && dayDiff < 28) buckets[dayDiff] += 1;
        });
        if (!cancelled) setPerDay(buckets);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="dir-b max-w-2xl mx-auto space-y-6 px-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const userAny = user as unknown as Record<string, number>;
  const level = getLevelForXP(user.totalXP);
  const totalLogs    = habits.reduce((sum, h) => sum + h.totalLogs, 0);
  const longestStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
  const currentStreak = Math.max(...habits.map((h) => h.currentStreak), 0);
  const friendCount  = friends.length;
  const duelWins     = userAny.duelWins ?? 0;
  const ownedBadges  = (user as unknown as { ownedBadges?: string[] }).ownedBadges?.length ?? 0;
  const orbIntensity = Math.min(100, userAny.awakening || 0);
  const weeklyXP     = userAny.weeklyXP ?? 0;

  // Member-since string from createdAt
  const createdAt = (user as unknown as { createdAt?: { toDate: () => Date } }).createdAt?.toDate?.();
  const memberSince = createdAt
    ? createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : 'JOIN DATE PENDING';

  // Max log count in the 28-day window for opacity normalization
  const sparkMax = Math.max(1, ...perDay);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Dossier" />

        <div style={{ padding: '0 22px 24px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Dossier
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>{user.username}</em>
            </h1>
            <Link
              href="/settings"
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-accent)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              Settings →
            </Link>
          </div>
          <div
            className="font-body"
            style={{ fontSize: 11, color: 'var(--b-ink-60)', letterSpacing: '0.02em' }}
          >
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {level.title} · LVL {level.level} · MEMBER SINCE {memberSince}
            </span>
          </div>

          {/* Hero — orb + total XP */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: 14,
              alignItems: 'center',
              borderTop: '1px solid var(--b-ink)',
              paddingTop: 16,
            }}
          >
            <SoulOrb
              size={106}
              tier={MAX_ORB_TIER}
              intensity={orbIntensity}
              interactive={false}
              baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
              pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
              ringColorId={(user as unknown as Record<string, string>).orbRingColor}
            />
            <div>
              <div
                className="spread"
                style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
              >
                Total XP
              </div>
              <div
                className="font-display tabular"
                style={{ fontSize: 38, fontWeight: 500, lineHeight: 0.95 }}
              >
                {user.totalXP.toLocaleString()}
              </div>
              <div
                className="font-body tabular"
                style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4 }}
              >
                +{weeklyXP.toLocaleString()} this week
              </div>
            </div>
          </div>

          {/* Stat table */}
          <div
            style={{
              marginTop: 18,
              borderTop: '1px solid var(--b-rule)',
              borderBottom: '1px solid var(--b-ink)',
              fontFamily: 'var(--font-inter)',
            }}
          >
            <StatRow label="Streak (current)" value={`${currentStreak} d`} accent />
            <StatRow label="Streak (longest)" value={`${longestStreak} d`} />
            <StatRow label="Habits logged"    value={totalLogs.toLocaleString()} />
            <StatRow label="Duels won"        value={String(duelWins)} />
            <StatRow label="Friends"          value={String(friendCount)} href="/friends" />
            <StatRow label="Badges earned"    value={`${ownedBadges} / 40`} last />
          </div>

          {/* 28-day "FOUR WEEKS, IN INK" grid */}
          <div style={{ marginTop: 22 }}>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
            >
              Four Weeks, In Ink
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(14, 1fr)',
                gap: 3,
              }}
            >
              {perDay.map((v, i) => {
                const ratio = v / sparkMax;
                const opacity = v === 0 ? 0.05 : 0.2 + ratio * 0.8;
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      background: 'var(--b-ink)',
                      opacity,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* ─── Premium-dark sub-sections — preserve full feature set ─── */}
          {/* These keep the legacy aesthetic for now; each will get its
              own editorial conversion in follow-up commits. */}
          <div style={{ marginTop: 28 }}>
            <SectionLabel left="Season + Pass" />
            <SeasonCard user={user} />
          </div>

          <div style={{ marginTop: 22 }}>
            <SectionLabel left="Prestige" />
            <PrestigeCard user={user} />
          </div>

          <div style={{ marginTop: 22 }}>
            <SectionLabel left="Badges" />
            <BadgeGrid userId={user.uid} />
          </div>

          <div style={{ marginTop: 22 }}>
            <SectionLabel left="Mastery" />
            <MasteryShelf habits={habits} />
          </div>

          <div style={{ marginTop: 22 }}>
            <SectionLabel left="Title" />
            <TitleDisplay totalXP={user.totalXP} />
          </div>

          <div style={{ marginTop: 22 }}>
            <SectionLabel left="Recap calendar" />
            <ProfileRecapCalendar uid={user.uid} isOwner />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat row ───────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  accent,
  last,
  href,
}: {
  label:   string;
  value:   string;
  accent?: boolean;
  last?:   boolean;
  href?:   string;
}) {
  const inner = (
    <>
      <span
        style={{
          fontSize: 11,
          color: 'var(--b-ink-60)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: accent ? 'var(--b-accent)' : 'var(--b-ink)',
        }}
      >
        {value}{href && <span style={{ marginLeft: 6, color: 'var(--b-ink-40)', fontWeight: 400 }}>→</span>}
      </span>
    </>
  );
  const sx = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: last ? 'none' : '1px solid var(--b-rule)',
    color: 'inherit',
    textDecoration: 'none',
  } as const;
  return href
    ? <Link href={href} style={sx}>{inner}</Link>
    : <div style={sx}>{inner}</div>;
}

function SectionLabel({ left }: { left: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        borderBottom: '1px solid var(--b-rule)',
        paddingBottom: 4,
        marginBottom: 12,
      }}
    >
      <span
        className="font-display"
        style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}
      >
        {left}
      </span>
    </div>
  );
}
