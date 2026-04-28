import { PillarSlug } from './pillars';

export interface PillarTip {
  /** One-sentence headline. */
  title: string;
  /** Short body — keep under 160 chars so the drawer stays compact. */
  body: string;
  /** Optional source attribution shown in muted text. */
  source?: string;
}

/**
 * Curated tips per pillar. The habit detail page picks one based on
 * day-of-year so the tip rotates daily and is the same for everyone
 * on the same day (no per-user state to track). Add freely — picker
 * indexes via `dayOfYear % tips.length`.
 */
export const PILLAR_TIPS: Record<PillarSlug, PillarTip[]> = {
  gym: [
    {
      title: 'Progressive overload beats novelty',
      body: 'Adding 2.5kg or one rep to last week’s lift drives more growth than swapping exercises. Boredom is the price of strength.',
    },
    {
      title: 'Compound lifts first, isolation last',
      body: 'Squats, deadlifts, presses, rows, and pull-ups recruit the most muscle per minute. Curls and lateral raises slot in around them.',
    },
    {
      title: 'Sleep is the recovery multiplier',
      body: 'Lifters who sleep <6h average ~30% slower strength gains in controlled studies. The set you skip in the gym matters less than the hour you skip in bed.',
    },
    {
      title: 'Track every working set',
      body: 'You can’t progressive-overload what you can’t measure. Log weight + reps for top sets. Patterns emerge fast.',
    },
    {
      title: 'Train each muscle 2×/week minimum',
      body: 'Once-a-week splits leave gains on the table for naturals. Twice-per-week frequency consistently outperforms in meta-analyses.',
    },
    {
      title: 'Form before weight',
      body: 'A clean rep at 70% builds more than a grinding rep at 90% with sloppy mechanics. Video your top set every 2–3 weeks.',
    },
  ],
  steps: [
    {
      title: '7,500 is the sweet spot',
      body: 'Mortality risk drops sharply up to ~7,500 daily steps and plateaus past 10,000. Don’t stress 12k+ if 8k feels sustainable.',
      source: 'JAMA Internal Medicine, 2019',
    },
    {
      title: 'Park further. Take the stairs.',
      body: 'Built-in friction beats willpower. The garage spot 2 minutes from the door buys you 10 minutes of walking a day, free.',
    },
    {
      title: 'Walk after meals',
      body: 'Even 10 minutes of post-meal walking measurably reduces blood sugar spikes. Your steps and your metabolism both win.',
    },
    {
      title: 'Treat steps as background, not goal',
      body: 'A run, a hike, a long walk — those are real exercise. Steps are the cumulative side effect. Don’t inflate by jogging in place.',
    },
    {
      title: 'Cadence > raw count',
      body: 'A brisk 100–110 steps/min walk delivers more cardiovascular benefit than a slow 8k. Tempo matters as much as total.',
    },
  ],
  water: [
    {
      title: 'Thirst lags dehydration',
      body: 'By the time you feel thirsty, you’re already ~1–2% dehydrated — enough to dent focus and reaction time. Drink before you’re thirsty.',
    },
    {
      title: '2.5–3L is a solid baseline',
      body: 'Healthy adults need ~2.7L (women) to ~3.7L (men) of total daily water, ~80% from drinks. The rest comes from food.',
      source: 'NIH / Institute of Medicine',
    },
    {
      title: 'Front-load the morning',
      body: 'You wake up dehydrated from 7–9h of breathing dry air. A glass before coffee primes focus better than the coffee itself.',
    },
    {
      title: 'Hydration affects cognition',
      body: 'A 2% drop in hydration can reduce short-term memory and concentration by ~20% in controlled trials. Your work product needs water.',
    },
    {
      title: 'Coffee and tea count',
      body: 'The "caffeine dehydrates you" myth is overblown. Moderate caffeine intake nets positive on hydration. Beer doesn’t.',
    },
    {
      title: 'Pee color is the simplest gauge',
      body: 'Pale straw = good. Apple juice = drink more. Clear = you can probably back off a bit. Way more reliable than counting bottles.',
    },
  ],
  sleep: [
    {
      title: 'Consistency > duration',
      body: 'A regular 7h beats a chaotic 9h. The body’s circadian rhythm rewards a stable sleep window more than total time in bed.',
    },
    {
      title: 'Light at wake-up sets the day',
      body: '10 minutes of bright light within 30min of waking advances melatonin onset that night. Step outside before checking your phone.',
      source: 'Huberman Lab',
    },
    {
      title: 'Caffeine has a 5–6h half-life',
      body: 'A 2pm coffee still has 25% of its caffeine in your system at 2am. If you struggle to fall asleep, audit your afternoon cup.',
    },
    {
      title: 'Cool the room',
      body: '~18–19°C (65–67°F) is the sweet spot for sleep onset. Body temp drops as you fall asleep — a warm room fights it.',
    },
    {
      title: 'No phones in bed',
      body: 'Not just blue light — it’s the dopamine loop. Doomscrolling extends sleep latency and shortens REM. Charge it in another room.',
    },
    {
      title: 'Alcohol fragments deep sleep',
      body: 'A glass of wine helps you fall asleep faster but cuts REM and slow-wave sleep. You wake up feeling under-recovered.',
    },
  ],
  'no-social': [
    {
      title: 'Single-tasking is a real skill',
      body: 'The brain doesn’t multitask — it task-switches, and each switch costs ~25 minutes of recovered focus. Block apps before deep work, not during.',
    },
    {
      title: 'Phantom phone checks',
      body: 'Studies show ~80 phone unlocks a day for the average user, most reactive to notifications you didn’t know you’d remember. Disable them all once.',
    },
    {
      title: 'Boredom is creative fuel',
      body: 'Filling every quiet moment with feed-scrolling kills the wandering mind that produces ideas. Sit with the empty queue once a day.',
    },
    {
      title: 'Algorithms optimize for time, not value',
      body: 'No social platform measures whether you finished happier. They measure whether you stayed. That’s not the same metric.',
    },
    {
      title: 'Greyscale is the cheat code',
      body: 'Switching your phone to black-and-white removes the color-driven dopamine hit from feeds. Engagement drops measurably overnight.',
    },
    {
      title: 'Movement beats apps for boredom',
      body: 'A 5-minute walk fixes "I need to check something" feelings better than five minutes of scrolling. Try it once.',
    },
  ],
};

/**
 * Returns today's tip for a pillar — same tip for everyone on a given
 * day so the rotation is predictable. Day-of-year keeps it stable
 * across the user's local timezone.
 */
export function getTodaysTip(slug: PillarSlug, date: Date = new Date()): PillarTip {
  const tips = PILLAR_TIPS[slug];
  if (!tips || tips.length === 0) {
    return { title: '', body: '' };
  }
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return tips[dayOfYear % tips.length];
}
