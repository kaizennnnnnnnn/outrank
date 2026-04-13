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

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=token_failed`);
    }

    // Get GitHub username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userResponse.json();

    // Store the integration in Firestore
    await adminDb.doc(`users/${userId}`).update({
      'integrations.github': {
        accessToken: tokenData.access_token,
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        connectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.redirect(`${request.nextUrl.origin}/settings?connected=github`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=callback_failed`);
  }
}
