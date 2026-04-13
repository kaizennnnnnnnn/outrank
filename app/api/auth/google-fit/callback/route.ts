import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=missing_params`);
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_FIT_CLIENT_ID!,
        client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET!,
        redirect_uri: `${request.nextUrl.origin}/api/auth/google-fit/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=token_failed`);
    }

    // Store the integration
    await adminDb.doc(`users/${userId}`).update({
      'integrations.google_fit': {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        connectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.redirect(`${request.nextUrl.origin}/settings?connected=google_fit`);
  } catch (error) {
    console.error('Google Fit callback error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=callback_failed`);
  }
}
