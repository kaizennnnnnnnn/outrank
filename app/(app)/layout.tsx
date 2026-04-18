'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { DailyLoginChest } from '@/components/progression/DailyLoginChest';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080f]">
      <Sidebar />
      <div className="lg:ml-[240px]">
        <TopBar />
        <main className="px-4 lg:px-6 py-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
      <DailyLoginChest />
    </div>
  );
}
