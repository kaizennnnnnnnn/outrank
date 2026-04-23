# Friends-first Progression + Habit Verification — Plan

> Status: proposal. Nothing below is built yet — this is a design doc for review.
> Owner: Jovan. Last updated: 2026-04-23.

## 1. Why this plan exists

Right now Outrank has a friends graph, DMs, duels, and a feed, but the day-to-day habit loop is
still single-player. You can log anything, at any value, with no one checking, and nothing about
your friends' progress pulls on you once you close the app. The two problems feed each other:
**no accountability → logs are cheap → social features don't feel meaningful.**

This doc proposes: (a) mechanics that make friends *load-bearing* for progression, and (b) a
verification ladder that trades friction for trust without blocking casual users who just want to
use the app for themselves.

---

## 2. Friends-first mechanics

Three high-leverage additions in priority order. Each stands alone; we don't need all three to
ship the first one.

### 2.1 Habit Pacts (highest leverage)

Two friends commit to the same habit for N days (7 / 14 / 30). Both sides win a shared pot if
both log every required day. If *either* side breaks the streak, both lose.

**Why it's strong**
- Loss aversion: you're not just letting yourself down, you're costing your friend too.
- Communication pressure: you'll actually DM to confirm the other person did it.
- Bonds form around specific commitments, not just a follow graph.

**Rewards (initial tuning, to be playtested)**
- 7-day pact success: +200 XP + 100 fragments each
- 14-day success: +450 XP + 225 fragments each
- 30-day success: +1200 XP + 600 fragments each + joint cosmetic ("Pact Holder" frame with
  both usernames engraved on the rim)
- On break, both sides lose 50 fragments and the pact dies. No XP. No partial credit.

**Schema sketch**
```
/pacts/{pactId}
  ├─ participants: [uidA, uidB]
  ├─ habitSlug: 'gym'
  ├─ cadence: 'daily' | 'weekdays' | '3x-week'
  ├─ durationDays: 7 | 14 | 30
  ├─ startDate / endDate
  ├─ status: 'pending' | 'active' | 'succeeded' | 'broken' | 'declined'
  ├─ dayStatus: { '2026-04-23': { uidA: 'logged', uidB: 'pending' } }
  └─ brokenBy: uid | null
```

**Rules impact**
- Either participant can read. Either can update their own log state. Neither can mutate the
  other's log state, the `participants` array, or the status (that's a Cloud Function).
- A Cloud Function on log creation (`onLogCreated`) advances any active pacts the user is in.
- A scheduled function at each user's midnight (using `users/{uid}.timezone` we already store)
  finalizes the day and marks broken pacts.

---

### 2.2 Friends League (weekly rotating leaderboard)

A user's top N friends (or all friends if < N) are bundled into a weekly mini-league. Everyone
who joins contributes 20 fragments to the pot; at week's end the pot is split 50/30/20 between
the top three.

**Why it's strong**
- Makes a daily log feel like a move in a game. The leaderboard is specific people you know, not
  a global list of 10k strangers where you have no chance.
- Creates banter: the DMs already exist, now they have natural subject matter.
- Naturally retentive: weekly reset = weekly re-engagement spike.

**Schema sketch**
```
/friendsLeagues/{leagueId}
  ├─ weekKey: '2026-W17'       // ISO week, matches the pattern used by battlePass
  ├─ members: [uidA, uidB, ...]
  ├─ entries: { uidA: { score, username, avatarUrl, rank }, ... }
  ├─ pot: 120                   // total fragments staked
  ├─ status: 'open' | 'active' | 'settled'
  └─ settledAt: timestamp | null
```

**Open question**: do we auto-enroll every user into a league with their friends each Monday, or
opt-in? Auto-enrollment is stickier but more pressure. Recommend: auto-enroll with a one-tap
"skip this week" toggle so we don't feel coercive.

---

### 2.3 Cheer + Callout reactions (lowest cost, highest volume)

On any friend's log in the feed, a friend can tap **🔥 Nice** or **👀 Where were you?** Both
produce small XP/fragment trickles on both sides:
- 🔥 Nice → recipient +5 XP, sender +1 fragment
- 👀 Callout → only usable on missed days (where the sender has a streak of their own in the same
  category) → recipient +0 XP + optional DM auto-opener, sender +3 fragments

**Why it's strong**
- We already have reactions (they power the feed). This is a light skin on top, no new infra.
- Cheap conversations → fewer dead friendships in the graph.
- The callout mechanic is the *social* ancestor of verification — your friends notice your
  logs before any system does.

**Implementation note**: reuse the existing `/reactions/{reactionId}` collection. Only net-new
work is the XP/fragments hook (already a Cloud Function pattern for onLogCreated) and the UI
affordances in [components/feed/](../components/feed/).

---

## 3. Verification: proof-of-work ladder

Nobody lies about 10 minutes of meditation to feel smug — they lie when there's real status/XP
behind a claim. The goal is to make cheating socially costly for people who want status without
blocking casual self-trackers.

### 3.1 Three-tier trust model

Every log is one of:

| Tier | Label | How it's earned | What it unlocks |
|------|-------|-----------------|-----------------|
| 0    | Unverified | Default, zero friction | Counts for you. Not eligible for duels, leagues, global leaderboards, or pacts. |
| 1    | Self-proof | User attached a photo/short clip (≤6s) | Eligible for duels, leagues, feeds. Friends can flag → reviewed. |
| 2    | Verified | Health integration OR ≥1 friend confirmed the photo | Full eligibility + "✓ Verified" icon on the log + small XP bonus (+5) |

Users don't *choose* a tier; the tier is derived from what the log has attached.

### 3.2 Proof by photo

Simplest, broadest coverage. Attach an image on log. Stored in Firebase Storage, referenced in
the log doc as `proofImageUrl` (field already exists in [lib/logHabit.ts:34](../lib/logHabit.ts#L34),
we just need to surface it). Friends see it in the feed with a "Confirm / Flag" swipe.

- **Pros**: universal; works for every habit.
- **Cons**: people can reuse photos. Mitigation: EXIF timestamp check in a Cloud Function,
  auto-flag if older than the log. Not bulletproof but enough to make it annoying.
- **Storage cost**: resize client-side to max 1024px + JPEG q75, ~120 KB avg. 100 users × 2
  logs/day × 30 days = ~720 MB/month. Negligible on Storage free tier.

### 3.3 Proof by friend confirmation

For logs that matter most (duels, pacts, leagues), require **one non-mutual friend** to tap
"Confirm" on the log within 24h. If nobody confirms, the log reverts to tier 1.

- **Pros**: strongest social signal, creates organic engagement loops.
- **Cons**: adds latency. Mitigation: let the log count immediately at tier 1; only the
  Verified bonus and the duel/league eligibility escalate when confirmation arrives.
- **Abuse**: reciprocal-confirmation rings. Mitigation: cap confirmations-you-give at 10/day and
  weight confirmations from high-streak users higher.

### 3.4 Proof by health integration

For a specific subset of categories we can short-circuit to tier 2 via Apple Health / Google Fit
/ Strava:

| Category | Integration | Signal |
|----------|-------------|--------|
| steps | HealthKit / Google Fit | daily step count |
| running | HealthKit / Google Fit / Strava | distance + pace |
| cycling | HealthKit / Google Fit / Strava | distance |
| swimming | HealthKit / Google Fit | distance |
| sleep | HealthKit / Google Fit | duration |
| gym (with a paired watch) | HealthKit workout type | session count |

Everything else stays on photo + friend confirmation. No integration required to use the app.

- **Pros**: airtight verification, zero manual friction after first-time connect.
- **Cons**: platform-specific SDKs (not trivial in a web-first PWA — probably needs a companion
  native shell or a Capacitor wrapper, which is a separate track).

### 3.5 Anti-cheat surface area we still need to plug

- **Value anomalies**: `functions/src/onLogCreated.ts:50-57` already has a >5× average flag. Ship
  that flag end-to-end: auto-require tier 1 (photo) for flagged logs before they count.
- **Rate limiting**: the same file enforces 23h between logs of the same habit. Keep it.
- **Tampered timestamps**: the Firestore rule should reject logs where `createdAt` is in the
  future or >2m in the past relative to the server — easy add to `firestore.rules`.
- **Ban loop**: existing `isBanned` flag already gates writes; add a soft-ban path triggered by
  ≥3 community flags in 14 days that disables eligibility for competitive modes but not
  self-tracking.

---

## 4. Suggested rollout

| Phase | Scope | Why first / why not first |
|-------|-------|---------------------------|
| P1 (2 weeks) | Cheer + Callout reactions. Photo proof UI (optional, no tier gating yet). | Cheap wins, zero new collections. Starts gathering photo-attach rates so we know whether to invest in the verification tier. |
| P2 (3–4 weeks) | Habit Pacts. Tier 1 (photo) enforcement for pacts + duels. | Pacts are the single biggest retention lever. Enforcement rides along because Pacts are the first time "cheap logs" would matter. |
| P3 (3 weeks) | Friends League. Tier-2 friend confirmation (opt-in at the log level). | Pacts stabilize before we add another timed-pressure loop. Confirmation only matters once there's a league to game. |
| P4 (later) | Health integrations (HealthKit + Google Fit). Anomaly auto-flag. | Requires native shell; defer until the social loops prove retentive enough to justify platform work. |

---

## 5. Things I want Jovan's call on before I start P1

1. **Pacts: mutual agreement vs invite-only?** I've assumed the challenger picks habit+duration,
   sends a pact invite, the friend accepts. Alternative: both sides co-author. Co-author is
   nicer but 2× the UI.
2. **Pact cadence options.** Daily only, or also "weekdays" and "3×/week"? More cadences = more
   UI states for the dayStatus map. I'd ship daily-only first.
3. **Friends League pot size.** 20 fragments feels cheap for a week. But if it's higher, free
   users with few fragments feel priced out. Thoughts?
4. **Verification defaults.** Should duels *require* tier 1 proof from day one, or start
   recommended and harden later? Starting lax avoids upset users; starting strict prevents
   legacy-behavior complaints later.
5. **Callout mechanic ethics.** "Where were you?" is spicy. Would you rather it only be visible
   to the called-out person (a prod) or to the whole feed (public shame)? I'd default to
   private prod.

---

## 6. What this doc is NOT covering

- Groups / communities — separate feature, orthogonal to pacts and leagues.
- Tournaments — not enough signal yet; revisit after P3.
- Monetization around any of this — premium tier for more pact slots? Not in scope here.
- Push notification tuning — most of these features produce notifications; batching/quiet hours
  is its own ticket.
