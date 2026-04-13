'use client';

import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <div className="text-2xl flex justify-center">{icon}</div>
      <p className="font-mono text-lg font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
