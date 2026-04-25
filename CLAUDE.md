# Outrank — project guide for Claude

Outrank is a Next.js 16 + Firebase self-improvement gamification app. Users build habits, log them daily, earn XP, climb leaderboards, and duel friends. The defining mechanic is the **Soul Orb** — a canvas-animated sphere that evolves as you log, with cosmetic customization (base / pulse / ring colors, PFP frames, name effects).

- Repo: https://github.com/kaizennnnnnnnn/outrank.git
- Deploy: https://outrank-ten.vercel.app
- Firebase project: `outrank-1d81f`
- Solo dev (Jovan, `@jovan` in game). Ships fast, iterates visually, appreciates premium polish over technical perfection.

---

## This is NOT the Next.js you know

Next.js 16 has breaking changes — APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Stack

- **Frontend**: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Framer Motion, Zustand (`useUIStore` for toasts + level-up/badge overlays).
- **Backend**: Firebase — Firestore (data), Auth (email + Google), Cloud Messaging (push), Cloud Functions gen1 (`functions/`), Storage (proof images).
- **Runtime**: PWA with service worker. Vercel for web. Firebase CLI for rules / indexes / functions.
- **Canvas**: `SoulOrb` is a hand-rolled `requestAnimationFrame` particle sim — not three.js.

---

## Deploy targets (this trips up every session)

Pushing to `main` deploys only web code via Vercel (`app/`, `components/`, etc.). Firebase-side artifacts need separate CLI deploys from `levelup/`:

```bash
# Firestore rules (after editing firestore.rules)
npx --yes firebase-tools deploy --only firestore:rules --project outrank-1d81f

# Firestore composite indexes (after editing firestore.indexes.json)
npx --yes firebase-tools deploy --only firestore:indexes --project outrank-1d81f

# Single Cloud Function
npx --yes firebase-tools deploy --only functions:<fnName> --project outrank-1d81f

# All Cloud Functions (slower; only when multiple changed)
npx --yes firebase-tools deploy --only functions --project outrank-1d81f
```

Cloud Functions must be built first (`cd functions && npm run build` or the CLI will do it). The `firebase` command is not globally installed — always use `npx --yes firebase-tools` with the explicit `--project` flag.

After any web deploy, the PWA service worker still caches old JS. Hard refresh (Ctrl/Cmd + Shift + R) or reinstall the PWA to verify changes.

---

## Repo layout

```
levelup/
  app/
    (app)/                    # authenticated routes wrapped in AuthGuard
      dashboard/               # home feed + habit quick-log
      habits/                  # habit roster + per-habit detail
      orb/                     # orb command center (evolve / ascend / awaken)
      profile/                 # identity + stats (orb view-only here)
      shop/                    # cosmetics + consumables
      compete/ feed/ friends/
      messages/ messages/[friendId]/
      leaderboard/ battle-pass/
      schedule/ notifications/
      inventory/ leagues/ groups/ settings/
    auth/ onboarding/          # public routes
    globals.css                # keyframes + utility classes (big file, grep before adding)
    layout.tsx / providers.tsx
    page.tsx                   # marketing landing
  components/
    profile/                   # SoulOrb, MiniOrb, AwakeningBar, FramedAvatar, NamePlate…
    habits/                    # HabitCard, StreakFlame, OverallProgressGraph
    competition/               # DuelResultModal, DuelEndedCard, LeaderboardRow, CreateDuelModal
    social/                    # FeedItem, FriendHabitModal
    layout/                    # AuthGuard, EmailVerifyGuard, TopBar, MobileNav, Sidebar
    ui/                        # Button, Modal, Avatar, Toast, CategoryIcon, Skeleton…
    notifications/             # NotificationBell, PushNotificationHandler
  constants/                   # categories, cosmetics, orbColors, orbTiers, levels,
                               # mastery, badges, battlePass, chestLoot, progression
  hooks/                       # useAuth, useHabits, useFriends, useCompetitions,
                               # useLeaderboard, useNotifications
  lib/                         # firestore.ts, auth.ts, logHabit.ts, duelRewards.ts,
                               # messaging.ts, pushNotifications.ts, security.ts, utils.ts
  store/                       # uiStore (Zustand — toasts, overlays)
  types/                       # TS types per domain
  functions/                   # Cloud Functions (separate npm project, tsc build)
  scripts/                     # admin scripts (reset-inventory.mjs etc.)
  firestore.rules              # Firestore security rules
  firestore.indexes.json       # composite indexes — MUST include any
                               # array-contains + orderBy(other-field) queries
  firebase.json                # Firebase CLI config
  docs/                        # longer design docs (friends-and-verification-plan.md)
```

---

## Firestore schema — collections to know

Per-user subcollections (ownership enforced in `firestore.rules`):

- `users/{uid}` — profile + XP (`totalXP`, `weeklyXP`, `monthlyXP`, `seasonPassXP`) + orb state (`orbTier`, `orbBaseColor`, `orbPulseColor`, `orbRingColor`, `awakening`, `awakeningBonus`, `orbEvolutionCharges`, `orbAscensions`, `fullAwakenings`, `fragments`) + cosmetics (`ownedCosmetics`, `ownedColors`, `equippedFrame`, `equippedNameEffect`) + social flags (`isBanned`, `isPremium`, `friendCount`, `timezone`, `fcmToken`).
- `habits/{uid}/userHabits/{slug}` — user's active habits.
- `logs/{uid}/habitLogs/{logId}` — every habit log. Fields: `createdAt`, `loggedAt`, `value`, `goal`, `xpEarned`, `proofImageUrl`, `verified`.
- `notifications/{uid}/items/{id}` — in-app notifications. Creating one fires `onNotificationCreated` → FCM push.
- `feed/{uid}/items/{id}` — social feed.
- `scheduleEntries/{uid}/items/{id}` — weekly habit planner.

Top-level collections:

- `usernames/{lowercase}` — uniqueness index (reserved on signup).
- `friendships/{uid}/friends/{friendId}` — bidirectional with `status: pending | accepted`, `direction: sent | received`.
- `competitions/{id}` — duels + tournaments. `participants` is a denormalized array with `score`, `username`, `avatarUrl` snapshotted at creation. **Snapshots go stale — always look up the live user doc for display.**
- `messageThreads/{threadId}` + `messages/{threadId}/items/{id}` — DMs. `threadId = [a,b].sort().join('_')`. Rules gated on `array-contains`.
- `leaderboards/{categorySlug}/{period}/{uid}` — per-habit leaderboards.
- `leagues/`, `groups/`, `tournaments/`, `reactions/`, `badges/`, `userBadges/`, `reports/`, `auditLogs/`, `categories/`.

## Cloud Functions (`functions/src/`)

- `onUserCreated` — bootstrap user doc.
- `onFriendAccepted` — notify + update `friendCount`.
- `onNotificationCreated` — fan out to FCM push.
- `onMessageCreated` — DM push notification (title = sender username, body = message).
- `onReportCreated` — admin flag.
- `scheduledStreaks` / `streakReminder` — nightly streak check + next-day prod.
- `scheduledLeaderboard` / `weekly…Reset` / `monthly…Reset` — periodic rollovers.
- `scheduleNotifier` — scheduled habit reminders at user local time.
- `weeklyRecap` — weekly digest.
- `checkUsername` — HTTP callable.

---

## Known gotchas (the ones we've paid for)

### Framer Motion `initial` prop causes an SSR/hydration flash

Framer applies `initial` styles inside a `useEffect`, which runs *after* the first paint. So motion elements render at their default visible state for ~16ms before going invisible, then animate in. Classic symptom: "the logo flashes briefly, disappears, then animates in."

Fixes that work:

1. Drive entrances with a CSS keyframe in `globals.css`. CSS class styles are computed before the first paint — no window.
2. Gate the animated subtree behind `const [mounted, setMounted] = useState(false)` flipped in `useEffect`, so children only render on the client after hydration.

Fix that **BACKFIRES**: adding `style={{ opacity: 0 }}` as a static fallback. Once framer's animation completes, framer stops driving the motion value and the static `style` reasserts — element re-hides.

### Firestore composite indexes for array-contains + orderBy

Any query combining `where('field', 'array-contains', x)` with `orderBy('otherField', ...)` needs a composite index. Without it: `400 Bad Request` → `WebChannelConnection RPC 'Listen' stream … transport errored` warning → Chrome throttles retries → `ERR_NETWORK_IO_SUSPENDED`.

Fix: add to `firestore.indexes.json` and `deploy --only firestore:indexes`. We already have `messageThreads` indexed on `participants ARRAY_CONTAINS + lastAt DESC`. Any new query of the same shape needs its own entry.

### Optimistic state + useAuth snapshot sync = double-apply

If a handler both writes `increment(-1)` to Firestore AND runs `setLocalCharges((c) => c - 1)` locally, the decrement applies twice: the `useEffect` that syncs local state from the `useAuth` snapshot already catches the server change. Symptom: "evolve once, lose two charges."

Pattern: let the snapshot sync be the single source of truth. Don't mutate local state after the awaited write.

### `serverTimestamp()` + `orderBy` = invisible pending docs

Writing with `serverTimestamp()` then subscribing with `orderBy(thatField)` hides the just-written doc locally until the server confirms, because the field is `null` in the pending write. Symptom: "I sent a message but can't see it until I leave and come back."

Fix: use `Timestamp.now()` for instant-visibility flows (DMs, activity feed). Minor clock skew is fine.

### Stored avatar snapshots go stale

`competitions/participants[].avatarUrl` is snapshotted at creation. If the user had no avatar then, it's `''` forever. Look up the live user doc for display in `DuelEndedCard` etc.

### FCM first-Allow race

`navigator.serviceWorker.register()` resolves *before* the worker activates. Calling `getToken()` immediately fails. Always `await navigator.serviceWorker.ready` (see `lib/pushNotifications.ts`). Self-heal: in `PushNotificationHandler`, if permission is granted but the user doc has no `fcmToken`, silently re-run registration once.

### Concentric rounded rectangles pinch at corners

Outer radius must equal inner radius + offset. A ring at `-inset-[3px]` around a `rounded-2xl` (16px) icon needs `rounded-[19px]`. Mismatched radii make corners pinch inward; gaps widen at the corners.

### Mobile TopBar overflow

The right cluster is tight at 360-390px viewport. Don't add icons freely. Inventory was already demoted to the sidebar to make room for Ranks. Battle Pass was demoted to make room for the orb FAB nav change.

### SoulOrb at small sizes

`isSmall = size <= 100` triggers a simplified render (fewer particles, no rings, no satellites). For shop previews + nav FABs, always pass `interactive={false}` — that disables drag listeners, the evolve/ascend/awaken button cluster, and the confirm modals entirely. It's not cosmetic, it's correctness.

### PWA cache

Service worker caches aggressively. After any web deploy, the user may see stale JS for hours. Always remind them to hard-refresh or reinstall.

---

## Design conventions

Consistency beats cleverness — use these patterns.

### Gemstone category tile (`components/ui/CategoryIcon.tsx`)

Base gradient + radial spotlight (top-left) + composite rim box-shadow (outer lift + inner color rim + 1px white hairline + bottom inner shadow) + specular glass sheen + icon with color-matched drop-shadow. Used everywhere — modify once, benefits 15+ call sites.

### Premium hero header

Used on `/orb`, `/messages`, `/friends`: bordered card with a radial-gradient background, an eyebrow label in `tracking-[0.3em]`, heading, tagline, optional `StatChip`s on the right.

### Soul Orb usage

- **Full interactive** (`/orb` command center): `<SoulOrb size={300} />` with `onEvolve` / `onAscend` / `onFullAwaken` handlers from the page. The page's `useEffect`s sync local state from the useAuth snapshot — never decrement locally after the write.
- **Read-only** (`/profile`): same component, `interactive={false}`. Kills drag + button cluster + confirm modals.
- **Shop previews**: `interactive={false}` plus one of:
  - Base preview: `hideRings + hidePulse` (body + glow only).
  - Ring preview: `hideBody + hidePulse` (rings only).
  - Pulse preview: `hideRings` alone + pass user's current `baseColorId` (pulse is a wave *through* the body — it needs something to travel through).
- **Nav FAB**: `size={48}, interactive={false}`, wrapped in a 4px black bezel + half-circle cradle scooped into the bottom nav.
- **MiniOrb** (18-22px): separate CSS-only approximation for leaderboard rows and tight list contexts. Not the canvas.

### Animation discipline

- **Continuous / ambient**: CSS keyframes in `globals.css`. GPU-composited properties only (`transform`, `opacity`, `background-position`). **No animated `filter: blur(...)`, no animated `box-shadow`** — those hammer the paint budget across the grid (shop was laggy for this reason; fixed by moving to opacity-only sibling glows).
- **Entrances**: CSS keyframes beat framer-motion because framer's `initial` is applied post-paint.
- **Interactive micro-animations** (hover, tap, modals): framer-motion is fine — the hydration flash only bites on mount.

### Duel rewards

`lib/duelRewards.ts` is the single source of truth for duel XP + fragment math. Both `DuelResultModal` and `DuelEndedCard` use it. Don't duplicate the constants.

### What the user rejects

- Hover-only affordances on mobile (added explicit Edit mode on Habits because hover X didn't work on touch).
- Fake-looking previews (the CSS `OrbColorPreview` was replaced with the real canvas `SoulOrb` in the shop).
- Laggy animations (any animated filter or box-shadow across many elements).
- Rendering choices that make a feature look like it "sticks out" without grounding (orb FAB got a black bezel + cradle).

---

## Code conventions

- **Editing > creating.** Don't create new files when an existing one works. Don't generate docs/README/explainer files unless asked.
- **Comments explain WHY, not WHAT.** Good: *"Client timestamp because serverTimestamp() hides the doc in the ordered query until server round-trip."* Bad: *"// decrement charges"*.
- **No emoji in code files** unless the user asks. Emoji belong in user-facing copy.
- **Use `cn(...)` from `lib/utils`** for conditional classes. Don't hand-concatenate strings.
- **TypeScript**: strict. Prefer `unknown` + narrowing over `any`. The user-doc field-fishing pattern (`const userAny = user as unknown as Record<string, unknown>`) is accepted because the `UserProfile` type doesn't include cosmetic / orb / XP fields but they live on the same doc.
- **`'use client'`** at the top of every component that uses hooks. Most components are client.
- **No backwards-compat hacks.** When you remove something, delete it completely — no `_unused` vars, no "// removed" comments, no re-exports just for safety.
- **No error handling for impossible cases.** Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs).

---

## Process

### Plan before non-trivial work

3+ files or architectural decisions → stop and plan. A single-helper bug fix is not non-trivial; a new feature touching 5 files + a schema field + a rules change is.

### Verify before claiming done

Run `npx tsc --noEmit` from `levelup/` after every change. For UI changes, describe which flow you'd expect to see and call out anything you *couldn't* verify (e.g., can't launch a dev server from a subagent). Don't claim "fixed" without naming the codepath.

### Commits (only when asked)

Format: subject line (50 chars, imperative mood) + blank line + body explaining **why** the change, not what it changes. End with:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

No emoji in commit messages. Stage files explicitly (`git add path/to/file`) — don't `git add -A`.

### Corrections are signal

When the user corrects you, decide: one-off, or pattern we should never hit again? If it's the latter (e.g., the optimistic-decrement double-apply, or the framer-initial flash), add a line to the **Known gotchas** section of this file on your next commit. That section is the project's institutional memory.

### Minimal impact

Don't refactor code you weren't asked to touch. Don't design for hypothetical futures. The codebase is intentionally direct — one `handleEvolve` per page instead of a generic orb-action framework. Three similar lines beats a premature abstraction.

### Pragmatism

Jovan is a solo dev shipping fast. Favor "works and ships" over "technically perfect and takes three days." If something is 80% right and the remaining 20% isn't blocking, ship it and iterate. There's no team gate — the user is the PM and the QA.
