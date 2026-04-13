import { NextRequest, NextResponse } from 'next/server';

// Step 1: Redirect user to GitHub OAuth
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/github/callback`;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,repo&state=${state}`;

  return NextResponse.redirect(url);
}
