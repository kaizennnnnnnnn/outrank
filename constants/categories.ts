import { Category } from '@/types/habit';

export const CATEGORIES: Omit<Category, 'id' | 'participantCount' | 'isOfficial' | 'description'>[] = [
  // BODY & FITNESS
  { slug: 'gym', name: 'Gym Sessions', icon: '🏋️', unit: 'sessions', section: 'Body', color: '#ef4444', trackingType: 'count' },
  { slug: 'running', name: 'Running', icon: '🏃', unit: 'km', section: 'Body', color: '#f97316', trackingType: 'count' },
  { slug: 'steps', name: 'Daily Steps', icon: '👟', unit: 'steps', section: 'Body', color: '#eab308', trackingType: 'count' },
  { slug: 'water', name: 'Water Intake', icon: '💧', unit: 'liters', section: 'Body', color: '#3b82f6', trackingType: 'count' },
  { slug: 'sleep', name: 'Sleep', icon: '😴', unit: 'hours', section: 'Body', color: '#8b5cf6', trackingType: 'count' },
  { slug: 'cold-shower', name: 'Cold Showers', icon: '🚿', unit: 'sessions', section: 'Body', color: '#06b6d4', trackingType: 'count' },
  { slug: 'yoga', name: 'Yoga', icon: '🧘', unit: 'minutes', section: 'Body', color: '#10b981', trackingType: 'duration' },
  { slug: 'swimming', name: 'Swimming', icon: '🏊', unit: 'laps', section: 'Body', color: '#0ea5e9', trackingType: 'count' },
  { slug: 'cycling', name: 'Cycling', icon: '🚴', unit: 'km', section: 'Body', color: '#f59e0b', trackingType: 'count' },
  { slug: 'calories', name: 'Calories Tracked', icon: '🥗', unit: 'kcal', section: 'Body', color: '#84cc16', trackingType: 'count' },

  // MIND & LEARNING
  { slug: 'books', name: 'Books Read', icon: '📚', unit: 'books', section: 'Mind', color: '#a855f7', trackingType: 'count' },
  { slug: 'pages', name: 'Pages Read', icon: '📖', unit: 'pages', section: 'Mind', color: '#ec4899', trackingType: 'count' },
  { slug: 'meditation', name: 'Meditation', icon: '🧠', unit: 'minutes', section: 'Mind', color: '#6366f1', trackingType: 'duration' },
  { slug: 'journaling', name: 'Journaling', icon: '✍️', unit: 'entries', section: 'Mind', color: '#14b8a6', trackingType: 'count' },
  { slug: 'courses', name: 'Online Courses', icon: '🎓', unit: 'lessons', section: 'Mind', color: '#f97316', trackingType: 'count' },
  { slug: 'language', name: 'Language Practice', icon: '🌍', unit: 'minutes', section: 'Mind', color: '#22c55e', trackingType: 'duration' },
  { slug: 'podcasts', name: 'Podcasts', icon: '🎧', unit: 'episodes', section: 'Mind', color: '#8b5cf6', trackingType: 'count' },
  { slug: 'chess', name: 'Chess', icon: '♟️', unit: 'games', section: 'Mind', color: '#64748b', trackingType: 'count' },
  { slug: 'flashcards', name: 'Flashcard Reviews', icon: '🃏', unit: 'cards', section: 'Mind', color: '#f43f5e', trackingType: 'count' },
  { slug: 'vocabulary', name: 'Vocabulary Words', icon: '🗣', unit: 'words', section: 'Mind', color: '#0d9488', trackingType: 'count' },

  // FINANCE
  { slug: 'savings', name: 'Money Saved', icon: '💰', unit: '€', section: 'Finance', color: '#22c55e', trackingType: 'count' },
  { slug: 'no-impulse', name: 'No Impulse Buy Days', icon: '🚫', unit: 'days', section: 'Finance', color: '#ef4444', trackingType: 'count' },
  { slug: 'expenses', name: 'Expenses Logged', icon: '📊', unit: 'entries', section: 'Finance', color: '#3b82f6', trackingType: 'count' },
  { slug: 'side-income', name: 'Side Income', icon: '💵', unit: '€', section: 'Finance', color: '#f59e0b', trackingType: 'count' },
  { slug: 'investments', name: 'Investments Made', icon: '📈', unit: 'entries', section: 'Finance', color: '#10b981', trackingType: 'count' },

  // CREATIVITY
  { slug: 'designs', name: 'Designs Made', icon: '🎨', unit: 'pieces', section: 'Creativity', color: '#ec4899', trackingType: 'count' },
  { slug: 'drawings', name: 'Drawings', icon: '✏️', unit: 'drawings', section: 'Creativity', color: '#f97316', trackingType: 'count' },
  { slug: 'photos', name: 'Photos Taken', icon: '📷', unit: 'photos', section: 'Creativity', color: '#6366f1', trackingType: 'count' },
  { slug: 'music', name: 'Music Produced', icon: '🎵', unit: 'tracks', section: 'Creativity', color: '#a855f7', trackingType: 'count' },
  { slug: 'videos', name: 'Videos Edited', icon: '🎬', unit: 'videos', section: 'Creativity', color: '#ef4444', trackingType: 'count' },
  { slug: 'writing', name: 'Writing', icon: '📝', unit: 'words', section: 'Creativity', color: '#14b8a6', trackingType: 'count' },

  // CAREER & TECH
  { slug: 'coding', name: 'Coding Problems', icon: '💻', unit: 'problems', section: 'Career', color: '#22c55e', trackingType: 'count' },
  { slug: 'commits', name: 'GitHub Commits', icon: '⌨️', unit: 'commits', section: 'Career', color: '#64748b', trackingType: 'count' },
  { slug: 'projects', name: 'Projects Shipped', icon: '🚀', unit: 'projects', section: 'Career', color: '#f97316', trackingType: 'count' },
  { slug: 'deep-work', name: 'Deep Work', icon: '🎯', unit: 'hours', section: 'Career', color: '#8b5cf6', trackingType: 'duration' },
  { slug: 'outreach', name: 'Cold Outreach Sent', icon: '📧', unit: 'emails', section: 'Career', color: '#3b82f6', trackingType: 'count' },
  { slug: 'clients', name: 'Clients Landed', icon: '🤝', unit: 'clients', section: 'Career', color: '#f59e0b', trackingType: 'count' },
  { slug: 'networking', name: 'Networking Calls', icon: '📞', unit: 'calls', section: 'Career', color: '#10b981', trackingType: 'count' },

  // LIFESTYLE
  { slug: 'screen-time', name: 'Screen Time Reduced', icon: '📵', unit: 'hours', section: 'Lifestyle', color: '#6366f1', trackingType: 'count' },
  { slug: 'alcohol-free', name: 'Alcohol-Free Days', icon: '🚫🍺', unit: 'days', section: 'Lifestyle', color: '#22c55e', trackingType: 'count' },
  { slug: 'junk-free', name: 'Junk Food-Free Days', icon: '🥦', unit: 'days', section: 'Lifestyle', color: '#84cc16', trackingType: 'count' },
  { slug: 'early-wake', name: 'Early Wake-Up', icon: '⏰', unit: 'days', section: 'Lifestyle', color: '#f59e0b', trackingType: 'count' },
  { slug: 'outside', name: 'Time Outside', icon: '🌳', unit: 'minutes', section: 'Lifestyle', color: '#10b981', trackingType: 'duration' },
  { slug: 'gratitude', name: 'Gratitude Entries', icon: '🙏', unit: 'entries', section: 'Lifestyle', color: '#ec4899', trackingType: 'count' },
  { slug: 'no-social', name: 'Social Media-Free Days', icon: '📱', unit: 'days', section: 'Lifestyle', color: '#64748b', trackingType: 'count' },

  // HEALTH
  { slug: 'supplements', name: 'Supplements Taken', icon: '💊', unit: 'days', section: 'Health', color: '#14b8a6', trackingType: 'count' },
  { slug: 'meal-prep', name: 'Meal Prep Sessions', icon: '🍱', unit: 'sessions', section: 'Health', color: '#f97316', trackingType: 'count' },
  { slug: 'no-caffeine', name: 'No-Caffeine Days', icon: '☕', unit: 'days', section: 'Health', color: '#92400e', trackingType: 'count' },
  { slug: 'skincare', name: 'Skincare Routine', icon: '✨', unit: 'days', section: 'Health', color: '#f43f5e', trackingType: 'count' },
  { slug: 'stretch', name: 'Stretching', icon: '🤸', unit: 'minutes', section: 'Health', color: '#a855f7', trackingType: 'duration' },
];

export const CATEGORY_SECTIONS = ['Body', 'Mind', 'Finance', 'Creativity', 'Career', 'Lifestyle', 'Health'] as const;
export type CategorySection = typeof CATEGORY_SECTIONS[number];

export const getCategoriesBySection = (section: CategorySection) =>
  CATEGORIES.filter((c) => c.section === section);

export const getCategoryBySlug = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug);

// Smart defaults and step increments per category
// For boolean/daily habits (did-you-do-it type), goal is always 1
export interface CategoryGoalConfig {
  defaultGoal: number;
  step: number;       // increment/decrement amount
  min: number;
  max: number;
  dailyLabel: string; // how the unit reads in a daily context
}

export const CATEGORY_GOAL_CONFIG: Record<string, CategoryGoalConfig> = {
  // BODY
  'gym':          { defaultGoal: 1,     step: 1,    min: 1,   max: 3,      dailyLabel: 'sessions/day' },
  'running':      { defaultGoal: 5,     step: 1,    min: 1,   max: 50,     dailyLabel: 'km/day' },
  'steps':        { defaultGoal: 10000, step: 1000, min: 1000, max: 30000, dailyLabel: 'steps/day' },
  'water':        { defaultGoal: 3,     step: 1,    min: 1,   max: 10,     dailyLabel: 'liters/day' },
  'sleep':        { defaultGoal: 8,     step: 1,    min: 4,   max: 12,     dailyLabel: 'hours/night' },
  'cold-shower':  { defaultGoal: 1,     step: 1,    min: 1,   max: 3,      dailyLabel: 'per day' },
  'yoga':         { defaultGoal: 30,    step: 5,    min: 5,   max: 120,    dailyLabel: 'min/day' },
  'swimming':     { defaultGoal: 20,    step: 5,    min: 5,   max: 100,    dailyLabel: 'laps/day' },
  'cycling':      { defaultGoal: 10,    step: 5,    min: 1,   max: 100,    dailyLabel: 'km/day' },
  'calories':     { defaultGoal: 2000,  step: 100,  min: 500, max: 5000,   dailyLabel: 'kcal/day' },

  // MIND
  'books':        { defaultGoal: 1,     step: 1,    min: 1,   max: 5,      dailyLabel: 'books/week' },
  'pages':        { defaultGoal: 30,    step: 10,   min: 5,   max: 200,    dailyLabel: 'pages/day' },
  'meditation':   { defaultGoal: 15,    step: 5,    min: 5,   max: 60,     dailyLabel: 'min/day' },
  'journaling':   { defaultGoal: 1,     step: 1,    min: 1,   max: 3,      dailyLabel: 'entries/day' },
  'courses':      { defaultGoal: 1,     step: 1,    min: 1,   max: 5,      dailyLabel: 'lessons/day' },
  'language':     { defaultGoal: 20,    step: 5,    min: 5,   max: 120,    dailyLabel: 'min/day' },
  'podcasts':     { defaultGoal: 1,     step: 1,    min: 1,   max: 5,      dailyLabel: 'episodes/day' },
  'chess':        { defaultGoal: 2,     step: 1,    min: 1,   max: 10,     dailyLabel: 'games/day' },
  'flashcards':   { defaultGoal: 20,    step: 10,   min: 5,   max: 200,    dailyLabel: 'cards/day' },
  'vocabulary':   { defaultGoal: 10,    step: 5,    min: 1,   max: 50,     dailyLabel: 'words/day' },

  // FINANCE
  'savings':      { defaultGoal: 50,    step: 10,   min: 5,   max: 1000,   dailyLabel: '€/week' },
  'no-impulse':   { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },
  'expenses':     { defaultGoal: 1,     step: 1,    min: 1,   max: 10,     dailyLabel: 'entries/day' },
  'side-income':  { defaultGoal: 100,   step: 50,   min: 10,  max: 5000,   dailyLabel: '€/week' },
  'investments':  { defaultGoal: 1,     step: 1,    min: 1,   max: 5,      dailyLabel: 'per week' },

  // CREATIVITY
  'designs':      { defaultGoal: 1,     step: 1,    min: 1,   max: 10,     dailyLabel: 'per day' },
  'drawings':     { defaultGoal: 1,     step: 1,    min: 1,   max: 10,     dailyLabel: 'per day' },
  'photos':       { defaultGoal: 5,     step: 5,    min: 1,   max: 50,     dailyLabel: 'per day' },
  'music':        { defaultGoal: 1,     step: 1,    min: 1,   max: 5,      dailyLabel: 'tracks/week' },
  'videos':       { defaultGoal: 1,     step: 1,    min: 1,   max: 5,      dailyLabel: 'per week' },
  'writing':      { defaultGoal: 500,   step: 100,  min: 100, max: 5000,   dailyLabel: 'words/day' },

  // CAREER
  'coding':       { defaultGoal: 3,     step: 1,    min: 1,   max: 20,     dailyLabel: 'problems/day' },
  'commits':      { defaultGoal: 3,     step: 1,    min: 1,   max: 20,     dailyLabel: 'commits/day' },
  'projects':     { defaultGoal: 1,     step: 1,    min: 1,   max: 3,      dailyLabel: 'per month' },
  'deep-work':    { defaultGoal: 4,     step: 1,    min: 1,   max: 12,     dailyLabel: 'hours/day' },
  'outreach':     { defaultGoal: 5,     step: 5,    min: 1,   max: 50,     dailyLabel: 'emails/day' },
  'clients':      { defaultGoal: 1,     step: 1,    min: 1,   max: 10,     dailyLabel: 'per month' },
  'networking':   { defaultGoal: 2,     step: 1,    min: 1,   max: 10,     dailyLabel: 'calls/week' },

  // LIFESTYLE (boolean/check-in types — goal is always 1)
  'screen-time':  { defaultGoal: 2,     step: 1,    min: 1,   max: 8,      dailyLabel: 'hours max/day' },
  'alcohol-free': { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },
  'junk-free':    { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },
  'early-wake':   { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },
  'outside':      { defaultGoal: 30,    step: 10,   min: 10,  max: 180,    dailyLabel: 'min/day' },
  'gratitude':    { defaultGoal: 3,     step: 1,    min: 1,   max: 10,     dailyLabel: 'entries/day' },
  'no-social':    { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },

  // HEALTH (boolean/check-in types)
  'supplements':  { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },
  'meal-prep':    { defaultGoal: 1,     step: 1,    min: 1,   max: 3,      dailyLabel: 'per week' },
  'no-caffeine':  { defaultGoal: 1,     step: 1,    min: 1,   max: 1,      dailyLabel: 'check-in/day' },
  'skincare':     { defaultGoal: 1,     step: 1,    min: 1,   max: 2,      dailyLabel: 'check-in/day' },
  'stretch':      { defaultGoal: 15,    step: 5,    min: 5,   max: 60,     dailyLabel: 'min/day' },
};

export const getGoalConfig = (slug: string): CategoryGoalConfig => {
  return CATEGORY_GOAL_CONFIG[slug] || { defaultGoal: 1, step: 1, min: 1, max: 100, dailyLabel: 'per day' };
};
