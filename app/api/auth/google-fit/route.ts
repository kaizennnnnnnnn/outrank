import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google Fit not configured' }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/google-fit/callback`;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const scopes = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
  ].join(' ');

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&state=${state}&prompt=consent`;

  return NextResponse.redirect(url);
}
