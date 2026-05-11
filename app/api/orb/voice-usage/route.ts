import { NextRequest, NextResponse } from 'next/server';
import { verifyOrbRequest } from '@/lib/orbAuth';
import { recordVoiceUsage, loadVoiceUsage } from '@/lib/orbVoiceCaps';

/**
 * Records elapsed voice-session time against the user's daily quota.
 * Called by the client on disconnect — the SDK doesn't expose a
 * reliable usage hook, so the client measures wall time between
 * onConnect and onDisconnect and POSTs that here.
 *
 * GET returns the current snapshot so the UI can display "X of Y
 * minutes used today" without spending a session.
 */

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    ({ uid } = await verifyOrbRequest(req));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { seconds?: unknown };
  try {
    body = (await req.json()) as { seconds?: unknown };
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  if (typeof body.seconds !== 'number' || !Number.isFinite(body.seconds) || body.seconds <= 0) {
    return NextResponse.json({ error: 'bad-seconds' }, { status: 400 });
  }

  try {
    await recordVoiceUsage(uid, body.seconds);
    const snapshot = await loadVoiceUsage(uid);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: 'record-failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  let uid: string;
  try {
    ({ uid } = await verifyOrbRequest(req));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await loadVoiceUsage(uid);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: 'usage-failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
