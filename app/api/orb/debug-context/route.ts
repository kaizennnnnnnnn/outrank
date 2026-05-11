import { NextRequest, NextResponse } from 'next/server';
import { verifyOrbRequest } from '@/lib/orbAuth';
import { buildOrbContext, renderOrbContextMarkdown } from '@/lib/orbContext';

/**
 * Dev-only sanity check. Returns the orb's view of the calling user as
 * markdown so we can eyeball field naming + coverage before plugging it
 * into the LLM prompt. Delete this route once the chat route is live.
 */
export async function GET(req: NextRequest) {
  let uid: string;
  try {
    ({ uid } = await verifyOrbRequest(req));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const ctx = await buildOrbContext(uid);
    const markdown = renderOrbContextMarkdown(ctx);
    return new NextResponse(markdown, {
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'context-failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
