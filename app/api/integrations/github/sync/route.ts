import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// Sync GitHub commits for a user — called by scheduled function or manually
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userDoc = await adminDb.doc(`users/${userId}`).get();
    const userData = userDoc.data();

    if (!userData?.integrations?.github?.accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    const token = userData.integrations.github.accessToken;
    const username = userData.integrations.github.username;

    // Get today's events (commits)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventsRes = await fetch(
      `https://api.github.com/users/${username}/events?per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!eventsRes.ok) {
      return NextResponse.json({ error: 'GitHub API failed' }, { status: 500 });
    }

    const events = await eventsRes.json();

    // Count today's push events (commits)
    const todayPushes = events.filter((e: { type: string; created_at: string }) => {
      const eventDate = new Date(e.created_at);
      return e.type === 'PushEvent' && eventDate >= today;
    });

    let totalCommits = 0;
    for (const push of todayPushes) {
      totalCommits += push.payload?.commits?.length || 0;
    }

    if (totalCommits === 0) {
      return NextResponse.json({ synced: false, commits: 0 });
    }

    // Check if already logged today for commits
    const existingLogs = await adminDb
      .collection(`logs/${userId}/habitLogs`)
      .where('habitId', '==', 'commits')
      .where('loggedAt', '>=', Timestamp.fromDate(today))
      .limit(1)
      .get();

    if (!existingLogs.empty) {
      return NextResponse.json({ synced: false, reason: 'already_logged_today' });
    }

    // Auto-create a verified log
    await adminDb.collection(`logs/${userId}/habitLogs`).add({
      habitId: 'commits',
      categoryId: 'commits',
      categorySlug: 'commits',
      value: totalCommits,
      note: `Auto-synced from GitHub: ${totalCommits} commits`,
      proofImageUrl: '',
      verified: true,
      verifiedSource: 'github',
      loggedAt: Timestamp.now(),
      xpEarned: 15, // Verified logs get bonus
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ synced: true, commits: totalCommits });
  } catch (error) {
    console.error('GitHub sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
