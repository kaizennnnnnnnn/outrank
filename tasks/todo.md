# Onboarding rebuild — Liftoff-style, adapted for Outrank

## What you asked for, in one paragraph

Rip out the current 4-step post-auth onboarding (Username → Pillars → Friends → Tutorial) and replace it with a long, Duolingo/Liftoff-style **pre-auth** funnel. User taps Get Started, swipes through a 4-page intro, then meets a friendly mascot who asks ~30 questions across identity, demographics, struggles, equipment, lifestyle. We surface insight cards based on answers ("No Progress", "Blind Spot", "Motivation Doesn't Last"), animate a globe with active-user count, run a "first rank" mini-flow, show pro/free, fake a setup loading screen, then finally ask for Google/email signup. All answers are persisted in localStorage during the funnel and written to Firestore at signup. App is also extended for nutrition tracking via a new bottom-nav button.

Plus the funnel is hybrid — Liftoff is gym-only; Outrank is gym + 4 daily habits — so every gym-flavored prompt needs a parallel/inclusive habits-flavored prompt or option.

---

## Decisions I need from you before coding

These are the genuine ambiguities. Everything else I can drive from your description.

1. **Mascot character**. Liftoff uses a blue elephant. You said "make something good for now, I'll change later." My pitch: a small floating **Soul Orb mascot** — your app's signature is the orb, so the mascot is a baby version with a face and tiny arms, idle-bobs and pulses. Different vibe than the elephant, internally consistent with your app. Sound good, or would you rather I do something else (a flame, a star, a pixel character)?

2. **The "corruption" / hold-the-mascot moment**. You said you hold the mascot and it "slowly corrupts the screen" until the screen is fully corrupted, then "Welcome to Outrank" appears. Two reads on this:
   - **Dark / corruption** — black ink/glitch spreads from the mascot, ominous, screen breaks down, then snaps to Welcome.
   - **Awakening / orb energy** — warm orange-amber light radiates from the mascot, fills the screen, then resolves into Welcome with your existing badge animation.
   
   The orb mythology in your app reads more "awakening" than "corruption." I'd recommend the second — feels heroic instead of menacing. Want me to go that way, or do you actually want it dark?

3. **Replacement for "rank every muscle"**. You said the per-muscle ranking idea feels off. My proposal: **Body Constellation** — every muscle is a star in their personal constellation. Strong muscles are bright; weak muscles are dim. Goal: light up the whole constellation. Same data as ranks, but the metaphor is "complete the picture" instead of "I'm bronze at biceps." Fits the orb/cosmic theme. Alternative is **Power Map** (heat-map zones on a body silhouette) — also engaging but more clinical. Which do you prefer, or do you want a third option?

4. **Habits-side struggles** (parallel to "sensitive back / knees / shoulders / wrist"). Proposed list:
   - Trouble falling asleep / waking up tired
   - Phone addiction / hard to focus
   - Forgetting to drink water
   - Energy crashes during the day
   - Stress / anxiety
   - Low motivation in the morning
   
   Lock these in, edit, or swap?

5. **Old onboarding migration**. The existing `/onboarding` runs after auth and seeds pillars + asks for username. The new flow does signup at the END. I'll **delete the old `/onboarding` route entirely** and route everything through the new flow. Existing users (who already have profiles) won't see it. OK to nuke?

6. **Localized defaults**. Default to user's locale: US/UK → lbs + ft/in, rest → kg + cm. Sound right?

---

## Data model — what we capture and where it goes

All answers persisted in `localStorage` under `outrank.onboarding.draft` during the funnel. At signup, we write a single document to `users/{uid}` with these fields, then derive pillar goals from them.

```ts
type OnboardingDraft = {
  // Identity
  name: string;
  experienceLevel: 'never' | 'beginner' | 'intermediate' | 'advanced';
  goals: ('build_muscle' | 'lose_fat' | 'energy' | 'sleep_better' | 'discipline' | 'focus')[];
  hearAbout: 'tiktok' | 'instagram' | 'youtube' | 'friend' | 'app_store' | 'other';

  // Body
  sex: 'male' | 'female';
  height: { value: number; unit: 'cm' | 'in' };
  weight: { value: number; unit: 'kg' | 'lbs' };
  age: number;

  // Personalization
  improvementCadence: 'daily' | 'weekly' | 'sometimes' | 'rarely';
  struggles: string[];           // 'back', 'knees', ..., 'sleep', 'focus', ...
  energyLevels: 'low' | 'medium' | 'high';
  statementsRelating: string[];  // for the insight-card branching

  // Workout details
  hasPlan: boolean;
  exerciseLocation: 'commercial' | 'small' | 'garage' | 'home' | 'bodyweight';
  equipment: string[];           // selected equipment slugs
  lastMuscles: string[];         // chest, arms, abs, legs, shoulders, back
  workoutDuration: number;       // minutes
  workoutDays: number | string[]; // either "5" or ['mon','tue',...]
  workoutReminderTime?: string;  // '09:00'

  // First rank
  bestLifts: { exercise: string; reps: number; weight?: number }[];

  // Plan
  tier: 'free' | 'pro';
  trialReminderDays?: 2 | 3;

  // Used to derive pillar goals
  derivedGoals?: { gym: number; steps: number; water: number; sleep: number; focus: number };
};
```

---

## Architecture decisions

- **One route, many steps**: `/onboard/[step]` (or stateful single page with step index). Step index in URL means back-button / refresh works, deep-linking for QA, and Vercel preview links.
- **Wizard shell**: progress bar, back arrow, mascot slot, content slot, primary CTA. Every step renders inside this shell.
- **Mascot is one component**: `<OrbMascot mood="idle" | "thinking" | "celebrating" />`. Always idle-bobs. Mood swaps the speech bubble copy & micro-animation.
- **Persistence layer**: tiny `useOnboardingDraft()` hook reads/writes localStorage with debounce. Single source of truth for all step components.
- **Skip vs back**: back arrow on every step. Skip only where shown (muscles-worked-last, hear-about-us). Required-vs-optional defined per step.
- **Pillar goals derived at end**: a single function `derivePillarGoals(draft) → { gym, steps, water, sleep, focus }` so we don't need a goals-picker step. User can tweak from /habits later.
- **Pre-auth signup**: at the final step, we call `createUserWithEmailAndPassword` (or Google), then write `users/{uid}` with the full draft, then push `/dashboard`.

---

## Phased plan (10 phases, ~1-2 sessions each)

Each phase ships independently. After each phase you eyeball it and we move on.

### Phase 0 — Foundation (no user-visible changes yet)
- [ ] `useOnboardingDraft()` hook + localStorage layer
- [ ] `<WizardShell>` (progress bar + back + mascot slot + content slot + footer CTA)
- [ ] `<OrbMascot>` component with idle bob + mood variants
- [ ] `derivePillarGoals(draft)` function
- [ ] Type definitions for `OnboardingDraft`

### Phase 1 — Entry + welcome carousel ⬅ start here
- [ ] Replace landing-page CTA buttons with two huge buttons: **Get Started** / **I have an account**
- [ ] 4-page swipeable welcome carousel (`/welcome`):
  1. "Build the version of you that doesn't quit" — orb hero
  2. "Five pillars. One streak." — gym/steps/water/sleep/focus quick visual
  3. "Compete with friends, leagues, ranks" — social pitch
  4. "Your soul orb evolves with you" — orb evolution preview
- [ ] Routes: `/` → marketing OR `/welcome` if cold session, "I have an account" → `/auth/login`

### Phase 2 — Identity + experience block (~8 steps)
- [ ] Mascot: "I just have a few questions and we can get started!"
- [ ] Name input (mascot: "What should we call you?")
- [ ] Experience level (4 buttons: Never / Beginner / Intermediate / Advanced)
- [ ] "Your plan is built around your experience" — full-page hero
- [ ] Goals multi-select (build muscle / lose fat / energy / sleep / discipline / focus)
- [ ] "You're in the right place" + testimonial card
- [ ] "I will use Outrank to ___" recap of their picks, mascot center, **hold-to-awaken** gesture
- [ ] **"Welcome to Outrank"** — reuse existing welcome animation post-corruption

### Phase 3 — Demographics (~6 steps)
- [ ] How did you hear about us
- [ ] "Alright, let's get some basic info"
- [ ] Sex selector
- [ ] Height scroll picker (cm/ft+in toggle)
- [ ] Weight scroll picker (kg/lbs toggle) — match Liftoff's design
- [ ] Age scroll picker
- [ ] "This journey is all about you" mascot interlude

### Phase 4 — Personalization probes + insight cards (~8 steps)
- [ ] How often do you think about improving (4 options)
- [ ] Struggles selector — gym + habits in one grid
- [ ] Energy levels
- [ ] "That's okay, we'll adjust" mascot
- [ ] Statements you relate to (multi-select)
- [ ] Insight cards (conditionally shown):
  - "Progress feels invisible" 
  - "Blind spot"
  - "Motivation doesn't last"
- [ ] "The path to building yourself" (Outrank-flavored, not "muscle")
- [ ] "See real progress" — mention body-graph + water/sleep/focus graphs

### Phase 5 — Workout details (~8 steps)
- [ ] Have a workout plan? (Yes / Build me one)
- [ ] Where do you exercise (5 options)
- [ ] Equipment selector (multi-select grid with icons)
- [ ] "We'll tailor your workouts" mascot
- [ ] Last muscles worked (multi-select; muscle silhouettes per pic you sent)
- [ ] Workout duration
- [ ] Days/week — number tab vs specific-days tab (Sun-Sat picker)
- [ ] "We'll help you find time"
- [ ] Workout-preview reminder + time picker

### Phase 6 — First rank (~5 steps)
- [ ] "Great choice! Personal plan made for you" recap
- [ ] "Let's get your first rank — what's your best lift?"
- [ ] Exercise carousel + reps picker (Push Ups / Pull Ups / Bench Press)
- [ ] Per-exercise rank reveal animation (orb-themed badge + percentile)
- [ ] "We predict you can reach Champion by [date]"
- [ ] **Active-lifters globe** with animated dot map + count

### Phase 7 — Plan + payment shell (UI only)
- [ ] Pro vs Free plan picker
- [ ] Trial reminder picker (2 / 3 days before)
- [ ] Payment page UI (Apple Pay / Card / etc — UI only, no Stripe wiring yet)

### Phase 8 — Profile generation + auth
- [ ] "Setting everything up" with 3 progress bars filling in sequence
- [ ] **Body Constellation** explainer (the muscle-rank replacement) — light up dim stars by training them
- [ ] "A bigger you is closer than you think — sign up to save your profile"
- [ ] Google + email signup forms
- [ ] On success: write everything to `users/{uid}`, seed pillars from derived goals
- [ ] "Welcome [name]! Your profile is ready" mascot animation
- [ ] Push to `/dashboard`

### Phase 9 — Nutrition button
- [ ] Add Nutrition icon to bottom nav
- [ ] Stub `/nutrition` page (full feature comes later)

### Phase 10 — Polish + cleanup
- [ ] Delete old `/onboarding/page.tsx`
- [ ] Remove the old onboarding route from auth flow
- [ ] Add "Resume onboarding" if user closed the app mid-flow (use localStorage)
- [ ] Final QA pass on the whole funnel

---

## What I'd start with

**Phase 0 + Phase 1** in one session. Phase 0 is invisible plumbing (mascot component, wizard shell, draft hook) and Phase 1 puts the entry point + 4-page carousel on screen. End of session you can tap through "Get Started" and swipe the 4 intro pages — that proves the architecture before we sink time into the 30-step funnel.

After your answers to the 6 decisions above I'll start Phase 0+1. Sound good?

---

## Review (filled in after each phase)
_(empty — populated as phases ship)_
