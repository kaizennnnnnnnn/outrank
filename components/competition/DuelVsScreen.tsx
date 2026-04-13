'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { CompetitionParticipant } from '@/types/competition';

interface DuelVsScreenProps {
  player1: CompetitionParticipant;
  player2: CompetitionParticipant;
  title: string;
  timeRemaining?: string;
}

export function DuelVsScreen({ player1, player2, title, timeRemaining }: DuelVsScreenProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#10101a] to-[#08080f] border border-[#1e1e30] p-8">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-600/5 to-transparent" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-600/5 to-transparent" />

      <p className="text-center text-xs text-slate-500 mb-6">{title}</p>

      <div className="flex items-center justify-between">
        {/* Player 1 */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="flex flex-col items-center gap-3"
        >
          <Avatar src={player1.avatarUrl} alt={player1.username} size="xl" />
          <p className="text-sm font-bold text-cyan-400">{player1.username}</p>
          <p className="font-mono text-4xl font-bold text-white">{player1.score}</p>
        </motion.div>

        {/* VS Center */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3, duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="font-heading text-4xl font-bold text-slate-500">VS</span>
          {timeRemaining && (
            <div className="text-center">
              <p className="text-xs text-slate-600">Time left</p>
              <p className="font-mono text-sm font-bold text-white">{timeRemaining}</p>
            </div>
          )}
        </motion.div>

        {/* Player 2 */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="flex flex-col items-center gap-3"
        >
          <Avatar src={player2.avatarUrl} alt={player2.username} size="xl" />
          <p className="text-sm font-bold text-orange-400">{player2.username}</p>
          <p className="font-mono text-4xl font-bold text-white">{player2.score}</p>
        </motion.div>
      </div>

      {/* Score difference bar */}
      <div className="mt-8">
        <div className="w-full h-2 bg-[#18182a] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-l-full transition-all duration-500"
            style={{
              width: `${player1.score + player2.score > 0
                ? (player1.score / (player1.score + player2.score)) * 100
                : 50}%`,
            }}
          />
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-r-full transition-all duration-500"
            style={{
              width: `${player1.score + player2.score > 0
                ? (player2.score / (player1.score + player2.score)) * 100
                : 50}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
