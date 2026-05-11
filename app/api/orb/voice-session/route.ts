import { NextRequest, NextResponse } from 'next/server';
import { verifyOrbRequest } from '@/lib/orbAuth';
import { buildOrbContext, renderOrbContextMarkdown, type OrbContext } from '@/lib/orbContext';
import { ORB_PERSONA } from '@/lib/orbPersona';
import { loadVoiceUsage } from '@/lib/orbVoiceCaps';

/**
 * Generates a per-session bundle for the client to connect to the
 * ElevenLabs Conversational AI agent:
 *   - signedUrl: short-lived WebSocket URL (keeps the API key on the server)
 *   - systemPrompt: persona + live Firestore snapshot (override the agent's
 *     placeholder system prompt for this conversation only)
 *   - firstMessage: time-of-day appropriate opener
 *
 * Re-issued on every Talk press so the orb sees fresh data.
 */

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    ({ uid } = await verifyOrbRequest(req));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json({ error: 'missing-elevenlabs-config' }, { status: 500 });
  }

  // Daily cap check first — if they're already out for today we refuse
  // to mint a signed URL rather than letting them connect and then cut
  // them off mid-sentence. 429 status code so the client can render a
  // dedicated "out for today" state.
  const usage = await loadVoiceUsage(uid);
  if (usage.remainingSeconds <= 0) {
    return NextResponse.json(
      {
        error: 'cap-reached',
        tier: usage.tier,
        capSeconds: usage.capSeconds,
        usedSeconds: usage.usedSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const ctx = await buildOrbContext(uid);
    const contextMarkdown = renderOrbContextMarkdown(ctx);
    const systemPrompt = `${ORB_PERSONA}\n\n# Live snapshot — what you know about this user right now\n\n${contextMarkdown}`;
    const firstMessage = buildOrbGreeting(ctx);

    // Signed URLs let the client connect over WebSocket without ever
    // touching our API key. They expire after a short window so we
    // mint a fresh one on each Talk press.
    const signedRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey } },
    );

    if (!signedRes.ok) {
      const detail = await signedRes.text();
      return NextResponse.json(
        { error: 'signed-url-failed', status: signedRes.status, detail },
        { status: 502 },
      );
    }

    const data = (await signedRes.json()) as { signed_url?: string };
    if (!data.signed_url) {
      return NextResponse.json({ error: 'signed-url-empty' }, { status: 502 });
    }

    return NextResponse.json({
      signedUrl: data.signed_url,
      systemPrompt,
      firstMessage,
      // Client uses this to auto-end the session before the user goes
      // over today's cap, so we never charge ElevenLabs for time we
      // can't bill.
      remainingSeconds: usage.remainingSeconds,
      capSeconds: usage.capSeconds,
      tier: usage.tier,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'session-failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

/**
 * Short opener tuned to time of day + how much they've logged today.
 * Keeps it brief on purpose — the persona pushes them to talk first.
 */
function buildOrbGreeting(ctx: OrbContext): string {
  const tod = ctx.today.timeOfDay;
  const notLogged = ctx.today.pillarsNotLogged.length;

  if (notLogged === 0) return 'All five pillars in. How are you feeling?';
  if (notLogged === 5 && tod === 'morning') return "Morning. Fresh slate — what's first?";
  if (notLogged === 5 && tod === 'evening') return "Evening. Nothing logged yet — what's the play?";
  if (notLogged === 5 && tod === 'night') return "Late one. Anything you want to log before bed?";
  if (tod === 'morning') return 'Morning. Where are you starting?';
  if (tod === 'afternoon') return 'Afternoon. Status check?';
  if (tod === 'evening') return 'Evening. Talk to me.';
  return "Hey. What's the situation?";
}
