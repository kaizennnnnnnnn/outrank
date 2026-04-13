'use client';

// All app-level custom SVG icons — replaces every emoji in the UI
// Each renders inline at the given size with currentColor

interface I { size?: number; className?: string }

function S({ size = 18, className, children }: I & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

// Rocket — "Self-improvement just got competitive" pill, Projects Shipped
export function RocketIcon(p: I) {
  return <S {...p}><path d="M12 2C12 2 8 6 8 14l4 4 4-4c0-8-4-12-4-12z" fill="currentColor" opacity=".15" /><path d="M12 2C12 2 8 6 8 14l4 4 4-4c0-8-4-12-4-12z" /><circle cx="12" cy="11" r="2" /><path d="M5 18l3-4m11 4l-3-4" /></S>;
}

// Fire/Flame — streaks, XP, energy
export function FireIcon(p: I) {
  return <S {...p}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z" fill="currentColor" opacity=".15" /><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z" /></S>;
}

// Swords — Compete, Duels
export function SwordsCrossIcon(p: I) {
  return <S {...p}><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" /><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" y1="14" x2="9" y2="18" /><line x1="7" y1="17" x2="4" y2="20" /><line x1="3" y1="19" x2="5" y2="21" /></S>;
}

// Trophy — Leaderboards
export function TrophyIconFull(p: I) {
  return <S {...p}><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" fill="currentColor" opacity=".1" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></S>;
}

// Flag — Leagues
export function FlagIcon(p: I) {
  return <S {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor" opacity=".1" /><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></S>;
}

// Medal/Badge — Badges & XP
export function MedalIcon(p: I) {
  return <S {...p}><circle cx="12" cy="8" r="6" fill="currentColor" opacity=".1" /><circle cx="12" cy="8" r="6" /><path d="M15.5 14l1 8-4.5-3-4.5 3 1-8" /></S>;
}

// Feed/Activity
export function ActivityIcon(p: I) {
  return <S {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></S>;
}

// Users — Friends
export function UsersFullIcon(p: I) {
  return <S {...p}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></S>;
}

// Bolt/Lightning — XP
export function BoltFullIcon(p: I) {
  return <S {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" opacity=".15" /><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></S>;
}

// Star — Ratings, special
export function StarIcon(p: I) {
  return <S {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" opacity=".12" /><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></S>;
}

// Target/Crosshair — Goals
export function TargetFullIcon(p: I) {
  return <S {...p}><circle cx="12" cy="12" r="10" opacity=".08" fill="currentColor" /><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></S>;
}

// Chart bar — Stats
export function ChartBarIcon(p: I) {
  return <S {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></S>;
}

// Shield check — verified, protected
export function ShieldCheckFullIcon(p: I) {
  return <S {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" opacity=".1" /><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></S>;
}

// Mail/Envelope — Email, Verify
export function MailFullIcon(p: I) {
  return <S {...p}><rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity=".08" /><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 7 12 13 2 7" /></S>;
}

// Check circle
export function CheckCircleFullIcon(p: I) {
  return <S {...p}><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".1" /><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></S>;
}

// Lock
export function LockIcon(p: I) {
  return <S {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor" opacity=".1" /><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></S>;
}

// Crown — Premium, Winner
export function CrownIcon(p: I) {
  return <S {...p}><path d="M2 20h20l-2-12-5 5-3-7-3 7-5-5z" fill="currentColor" opacity=".12" /><path d="M2 20h20l-2-12-5 5-3-7-3 7-5-5z" /></S>;
}

// Heart — gratitude, reactions
export function HeartFullIcon(p: I) {
  return <S {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor" opacity=".12" /><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></S>;
}

// Arrow up — rank up
export function ArrowUpIcon(p: I) {
  return <S {...p}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></S>;
}

// Search
export function SearchIcon(p: I) {
  return <S {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></S>;
}

// Clock — Timer
export function ClockIcon(p: I) {
  return <S {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></S>;
}

// Sparkles
export function SparklesIcon(p: I) {
  return <S {...p}><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" fill="currentColor" opacity=".12" /><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></S>;
}

// Plus circle
export function PlusCircleIcon(p: I) {
  return <S {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></S>;
}

// User single
export function UserIcon(p: I) {
  return <S {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></S>;
}

// Calendar
export function CalendarIcon(p: I) {
  return <S {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor" opacity=".08" /><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></S>;
}

// Handshake — Friends
export function HandshakeIcon(p: I) {
  return <S {...p}><path d="M7 11l3-3 4 2 4-4" /><path d="M18 4l3 3-6 6-4-2-3 3-4-4 3-3" /><path d="M4 20l3-3m10 3l-3-3" /><line x1="2" y1="14" x2="6" y2="10" /><line x1="18" y1="14" x2="22" y2="10" /></S>;
}
