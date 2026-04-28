import { Badge } from '@/types/badge';

export const BADGES: Badge[] = [
  // COMMON (gray)
  { id: 'first-steps', name: 'First Steps', description: 'Log your first habit ever', icon: '👣', rarity: 'common', xpReward: 20, condition: 'first_log' },
  { id: 'newcomer', name: 'Newcomer', description: 'Complete onboarding', icon: '🌱', rarity: 'common', xpReward: 20, condition: 'onboarding_complete' },
  { id: 'social', name: 'Social', description: 'Add your first friend', icon: '👋', rarity: 'common', xpReward: 20, condition: 'first_friend' },
  { id: 'challenger', name: 'Challenger', description: 'Create your first duel', icon: '⚔️', rarity: 'common', xpReward: 20, condition: 'first_duel' },
  { id: 'joiner', name: 'Joiner', description: 'Join your first league', icon: '🏟️', rarity: 'common', xpReward: 20, condition: 'first_league' },

  // RARE (blue)
  { id: 'on-fire', name: 'On Fire', description: '7-day streak in any habit', icon: '🔥', rarity: 'rare', xpReward: 50, condition: 'streak_7' },
  { id: 'bookworm', name: 'Bookworm', description: 'Log 10 books read', icon: '📖', rarity: 'rare', xpReward: 50, condition: 'books_10', category: 'books' },
  { id: 'iron-week', name: 'Iron Week', description: 'Log gym 7 days in a row', icon: '💪', rarity: 'rare', xpReward: 50, condition: 'gym_streak_7', category: 'gym' },
  { id: 'social-butterfly', name: 'Social Butterfly', description: '10+ friends', icon: '🦋', rarity: 'rare', xpReward: 50, condition: 'friends_10' },
  { id: 'team-player', name: 'Team Player', description: 'Join 3 leagues', icon: '🤝', rarity: 'rare', xpReward: 50, condition: 'leagues_3' },
  { id: 'century', name: 'Century', description: '100 total habit logs', icon: '💯', rarity: 'rare', xpReward: 50, condition: 'total_logs_100' },
  { id: 'duel-starter', name: 'Duel Starter', description: 'Complete 5 duels', icon: '🗡️', rarity: 'rare', xpReward: 50, condition: 'duels_5' },

  // EPIC (purple)
  { id: 'unstoppable', name: 'Unstoppable', description: '30-day streak in any habit', icon: '⚡', rarity: 'epic', xpReward: 100, condition: 'streak_30' },
  { id: 'iron-man', name: 'Iron Man', description: 'Gym logged 20x in one month', icon: '🏋️', rarity: 'epic', xpReward: 100, condition: 'gym_monthly_20', category: 'gym' },
  { id: '5am-club', name: '5AM Club', description: 'Early wake-up logged 14 days straight', icon: '🌅', rarity: 'epic', xpReward: 100, condition: 'early_wake_streak_14', category: 'early-wake' },
  { id: 'cold-warrior', name: 'Cold Warrior', description: 'Cold shower logged 10 times', icon: '🥶', rarity: 'epic', xpReward: 100, condition: 'cold_shower_10', category: 'cold-shower' },
  { id: 'sober', name: 'Sober', description: 'Alcohol-free logged 30 days', icon: '🧘', rarity: 'epic', xpReward: 100, condition: 'alcohol_free_30', category: 'alcohol-free' },
  { id: 'deep-work', name: 'Deep Work', description: '50 hours of deep work logged', icon: '🧠', rarity: 'epic', xpReward: 100, condition: 'deep_work_50h', category: 'deep-work' },
  { id: 'duel-king', name: 'Duel King', description: 'Win 10 duels', icon: '👑', rarity: 'epic', xpReward: 100, condition: 'duel_wins_10' },
  { id: 'philanthropist', name: 'Philanthropist', description: 'React to 50 friends\' logs', icon: '❤️', rarity: 'epic', xpReward: 100, condition: 'reactions_50' },
  { id: 'league-champion', name: 'League Champion', description: 'Win a monthly league', icon: '🏆', rarity: 'epic', xpReward: 100, condition: 'league_monthly_win' },

  // LEGENDARY (gold, animated border)
  { id: 'centurion', name: 'Centurion', description: '100-day streak in any habit', icon: '🏛️', rarity: 'legendary', xpReward: 250, condition: 'streak_100' },
  { id: 'year-strong', name: 'Year Strong', description: 'Use the app for 365 days', icon: '📅', rarity: 'legendary', xpReward: 250, condition: 'days_365' },
  { id: 'grand-champion', name: 'Grand Champion', description: 'Win 3 tournaments', icon: '🎖️', rarity: 'legendary', xpReward: 250, condition: 'tournament_wins_3' },
  { id: 'the-goat', name: 'The GOAT', description: 'Reach #1 global in any category', icon: '🐐', rarity: 'legendary', xpReward: 250, condition: 'global_rank_1' },
  { id: 'complete', name: 'Complete', description: 'Earn a badge in every category section', icon: '🌟', rarity: 'legendary', xpReward: 250, condition: 'all_sections_badge' },
  { id: 'max-level', name: 'Max Level', description: 'Reach Level 50', icon: '⭐', rarity: 'legendary', xpReward: 250, condition: 'level_50' },
  { id: 'undefeated', name: 'Undefeated', description: 'Win 20 duels without a loss', icon: '🛡️', rarity: 'legendary', xpReward: 250, condition: 'duel_wins_20_no_loss' },

  // ---------------------------------------------------------------------------
  // RECAP MECHANIC — earned by publishing daily records.
  // ---------------------------------------------------------------------------
  { id: 'first-recap',     name: 'First Record',      description: 'Publish your first daily record',         icon: '📰',  rarity: 'common', xpReward: 20,  condition: 'recap_publish_1' },
  { id: 'recap-week',      name: 'On the Record',     description: 'Publish 7 daily records',                  icon: '📅',  rarity: 'rare',   xpReward: 50,  condition: 'recap_publish_7' },
  { id: 'recap-month',     name: 'Documented',        description: 'Publish 30 daily records',                 icon: '📚',  rarity: 'epic',   xpReward: 100, condition: 'recap_publish_30' },

  // ---------------------------------------------------------------------------
  // PACTS — both win or both lose.
  // ---------------------------------------------------------------------------
  { id: 'pact-pioneer',    name: 'Pact Pioneer',      description: 'Complete your first pact with a friend',  icon: '🤜',  rarity: 'rare',   xpReward: 50,  condition: 'pact_won_1' },
  { id: 'pact-veteran',    name: 'Pact Veteran',      description: 'Survive a 30-day pact',                    icon: '⛓️',  rarity: 'epic',   xpReward: 100, condition: 'pact_30_day_won' },
  { id: 'pact-trio',       name: 'Three\'s a Promise', description: 'Complete 3 pacts',                         icon: '🔱',  rarity: 'epic',   xpReward: 100, condition: 'pact_won_3' },

  // ---------------------------------------------------------------------------
  // FRIENDS LEAGUE — weekly competition.
  // ---------------------------------------------------------------------------
  { id: 'weekly-champ',    name: 'Weekly Champ',      description: 'Win a Friends League week',                icon: '🥇',  rarity: 'rare',   xpReward: 50,  condition: 'league_wins_1' },
  { id: 'league-legend',   name: 'League Legend',     description: 'Win 5 Friends League weeks',               icon: '🏆',  rarity: 'epic',   xpReward: 100, condition: 'league_wins_5' },

  // ---------------------------------------------------------------------------
  // VERIFICATION — keep your friends honest.
  // ---------------------------------------------------------------------------
  { id: 'verifier',        name: 'Verifier',          description: 'Confirm 25 of your friends\' entries',     icon: '🔎',  rarity: 'rare',   xpReward: 50,  condition: 'verify_confirms_25' },
];

export const getBadgeById = (id: string) => BADGES.find((b) => b.id === id);
export const getBadgesByRarity = (rarity: Badge['rarity']) => BADGES.filter((b) => b.rarity === rarity);
