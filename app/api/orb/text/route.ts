import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyOrbRequest } from '@/lib/orbAuth';
import { buildOrbContext, renderOrbContextMarkdown } from '@/lib/orbContext';
import { ORB_PERSONA } from '@/lib/orbPersona';

/**
 * Text-mode orb chat. POST with { message, history? } and a Firebase
 * ID token; receive a streaming NDJSON body where each line is one
 * event:
 *   {"type":"delta","text":"..."}     // an output chunk
 *   {"type":"done","usage":{...}}     // final usage stats
 *   {"type":"error","message":"..."}  // fatal error
 *
 * The persona + context are sent as two cache-controlled system blocks
 * so subsequent turns within ~5 min only pay full price for the new
 * user message.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 400;
const MAX_HISTORY_TURNS = 10;

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    ({ uid } = await verifyOrbRequest(req));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'empty-message' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing-api-key' }, { status: 500 });
  }

  const history = Array.isArray(body.history)
    ? body.history.slice(-MAX_HISTORY_TURNS).filter(
        (m): m is ChatMessage =>
          (m?.role === 'user' || m?.role === 'assistant') &&
          typeof m?.content === 'string' &&
          m.content.length > 0,
      )
    : [];

  const ctx = await buildOrbContext(uid);
  const contextMarkdown = renderOrbContextMarkdown(ctx);

  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      try {
        const llmStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: [
            { type: 'text', text: ORB_PERSONA, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: contextMarkdown, cache_control: { type: 'ephemeral' } },
          ],
          messages: [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: message },
          ],
        });

        llmStream.on('text', (delta) => {
          send({ type: 'delta', text: delta });
        });

        const final = await llmStream.finalMessage();
        send({
          type: 'done',
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens,
            cacheRead: final.usage.cache_read_input_tokens ?? 0,
            cacheCreated: final.usage.cache_creation_input_tokens ?? 0,
          },
        });
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'unknown',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
