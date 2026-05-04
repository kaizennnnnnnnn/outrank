'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { EditorialTabBar } from '@/components/editorial/EditorialTabBar';
import { DailyLoginChest } from '@/components/progression/DailyLoginChest';
import { RecapLogFlight } from '@/components/recap/RecapLogFlight';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--b-paper)' }}>
      <Sidebar />
      {/* No TopBar on editorial pages — each page renders its own
          Masthead, which now embeds the notification bell on the
          right edge. The legacy TopBar (level chip / streak chip /
          quick-link buttons) is retired; its links moved into:
            - Bell    → Masthead right edge
            - Schedule, Inventory, Leaderboard → Town directory
            - Friends → Profile (Friends stat row links to /friends)
            - Avatar / profile → bottom tab bar's "You" tab */}
      <div className="lg:ml-[240px] overflow-x-hidden">
        {/* Editorial pages render their own Masthead + inner padding,
            but legacy non-converted pages still rely on the layout
            padding for breathing room. The 16/24px gutter editorial
            pages get on top of their own 22px inner padding is
            visually acceptable. */}
        <main className="px-4 lg:px-6 py-6 pb-24 lg:pb-6 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <EditorialTabBar />
      <DailyLoginChest />
      <RecapLogFlight />
    </div>
  );
}
