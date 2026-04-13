import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userDoc = await adminDb.doc(`users/${userId}`).get();
    const userData = userDoc.data();

    if (!userData?.integrations?.google_fit) {
      return NextResponse.json({ error: 'Google Fit not connected' }, { status: 400 });
    }

    let accessToken = userData.integrations.google_fit.accessToken;
    const refreshToken = userData.integrations.google_fit.refreshToken;
    const expiresAt = userData.integrations.google_fit.expiresAt;

    // Refresh token if expired
    if (Date.now() > expiresAt) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_FIT_CLIENT_ID!,
          client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshRes.json();
      if (!refreshData.access_token) {
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }

      accessToken = refreshData.access_token;

      // Update stored token
      await adminDb.doc(`users/${userId}`).update({
        'integrations.google_fit.accessToken': accessToken,
        'integrations.google_fit.expiresAt': Date.now() + refreshData.expires_in * 1000,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startTimeMillis = today.getTime();
    const endTimeMillis = tomorrow.getTime();

    const results: Record<string, number> = {};

    // Fetch steps
    try {
      const stepsRes = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
            bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
            startTimeMillis,
            endTimeMillis,
          }),
        }
      );

      const stepsData = await stepsRes.json();
      const steps = stepsData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      if (steps > 0) results['steps'] = steps;
    } catch (e) {
      console.error('Failed to fetch steps:', e);
    }

    // Fetch calories
    try {
      const calRes = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
            bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
            startTimeMillis,
            endTimeMillis,
          }),
        }
      );

      const calData = await calRes.json();
      const calories = Math.round(
        calData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0
      );
      if (calories > 0) results['calories'] = calories;
    } catch (e) {
      console.error('Failed to fetch calories:', e);
    }

    // Create verified logs for each metric
    let synced = 0;
    for (const [slug, value] of Object.entries(results)) {
      // Check if already logged today
      const existing = await adminDb
        .collection(`logs/${userId}/habitLogs`)
        .where('habitId', '==', slug)
        .where('verifiedSource', '==', 'google_fit')
        .where('loggedAt', '>=', Timestamp.fromDate(today))
        .limit(1)
        .get();

      if (!existing.empty) continue;

      // Check if user has this habit subscribed
      const habitDoc = await adminDb.doc(`habits/${userId}/userHabits/${slug}`).get();
      if (!habitDoc.exists) continue;

      await adminDb.collection(`logs/${userId}/habitLogs`).add({
        habitId: slug,
        categoryId: slug,
        categorySlug: slug,
        value,
        note: `Auto-synced from Google Fit`,
        proofImageUrl: '',
        verified: true,
        verifiedSource: 'google_fit',
        loggedAt: Timestamp.now(),
        xpEarned: 15,
        createdAt: Timestamp.now(),
      });

      synced++;
    }

    return NextResponse.json({ synced, data: results });
  } catch (error) {
    console.error('Google Fit sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
