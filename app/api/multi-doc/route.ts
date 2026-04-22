/**
 * POST /api/multi-doc — Multi-Document Chain
 *
 * Accepts one dictation and fans it out to up to 4 document-mode
 * variants in parallel. Each mode streams independently; per-mode
 * failures do not abort the other streams. All output is demultiplexed
 * on a single SSE channel, tagged with the originating mode so the
 * client can route each delta to its card.
 *
 * Auth: required (JWT session cookie, mirrored from `/api/enhance`).
 * Rate limit: 5 req/min per IP (generation is expensive — 4x model calls).
 * Error shape: matches `/api/enhance/route.ts` for consistency.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifySession } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { requireEnhanceEnv } from '@/lib/env-check';
import {
  ChainRequest,
  ChainSSEEvent,
  DocumentMode,
  buildChainPayloads,
  encodeChainEvent,
} from '@/lib/multi-doc';

export const maxDuration = 300; // 5 minutes — parallel long-form generation

/**
 * Dedicated limiter — 5 generations per minute per IP. Each generation
 * issues up to 4 Anthropic streaming requests, so this is intentionally
 * stricter than `/api/enhance` (which runs 20/min for a single mode).
 */
const multiDocLimiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60 });

export async function POST(request: NextRequest) {
  // 1. Rate limit first — cheapest rejection.
  const limited = multiDocLimiter(request);
  if (limited) return limited;

  // 2. Auth — mirrors the pattern used by `/api/transcribe-batch`.
  //    (`/api/enhance` relies on `middleware.ts`; this route is not in
  //    that matcher, so we verify in-route. The check is identical.)
  const sessionCookie = request.cookies.get('alecrae_session')?.value;
  if (!sessionCookie || !(await verifySession(sessionCookie))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Env validation — returns a clean 503 if ANTHROPIC_API_KEY missing.
  const env = requireEnhanceEnv();
  if (!env.ok) {
    return new Response(
      JSON.stringify({ error: env.message, code: env.code, missing: env.missing }),
      {
        status: env.status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Parse + validate body.
  let body: ChainRequest;
  try {
    const json = (await request.json()) as Partial<ChainRequest>;
    body = {
      rawText: typeof json.rawText === 'string' ? json.rawText : '',
      modes: Array.isArray(json.modes) ? (json.modes as DocumentMode[]) : [],
      customInstructions:
        typeof json.customInstructions === 'string' ? json.customInstructions : undefined,
    };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let payloads;
  try {
    payloads = buildChainPayloads(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return new Response(
      JSON.stringify({ error: message, code: 'BAD_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  // 5. Open a single SSE channel and fan out. Each mode owns its own
  //    async task; failures are caught per-task so a single mode crashing
  //    never nukes the peer streams.
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: ChainSSEEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeChainEvent(event)));
        } catch {
          // Controller likely closed (client disconnected). Swallow —
          // the abort handler below will wind down the tasks.
        }
      };

      const runOne = async (payload: (typeof payloads)[number]): Promise<void> => {
        const { mode } = payload;
        send({ type: 'start', mode });

        try {
          if (payload.kind === 'thinking') {
            // Extended-thinking modes use the non-streaming create() call
            // (thinking blocks aren't straightforwardly streamable alongside
            // text), then we chunk the resulting text to the client so the
            // UX feels identical to the streaming modes. This mirrors
            // `/api/enhance`'s behaviour exactly.
            const response = await anthropic.messages.create(payload.params);

            let resultText = '';
            for (const block of response.content) {
              if (block.type === 'text') {
                resultText += block.text;
              }
            }

            // Chunk-stream the pre-computed text for consistent UX.
            const chunkSize = 20;
            for (let offset = 0; offset < resultText.length; offset += chunkSize) {
              if (closed) return;
              const chunk = resultText.slice(offset, offset + chunkSize);
              send({ type: 'delta', mode, text: chunk });
            }
          } else {
            const stream = anthropic.messages.stream(payload.params);
            for await (const event of stream) {
              if (closed) return;
              if (event.type === 'content_block_delta') {
                const delta = event.delta;
                if ('text' in delta && typeof delta.text === 'string') {
                  send({ type: 'delta', mode, text: delta.text });
                }
              }
            }
          }

          send({ type: 'complete', mode });
        } catch (err: unknown) {
          console.error(`multi-doc stream error (mode=${mode}):`, err);
          send({
            type: 'error',
            mode,
            message: 'Generation failed for this document mode.',
          });
        }
      };

      // Client-disconnect handling: when the request is aborted we flip
      // `closed` so in-flight tasks stop emitting; the controller has
      // already been torn down by Next.
      const signal = request.signal;
      const onAbort = () => {
        closed = true;
      };
      if (signal.aborted) {
        closed = true;
      } else {
        signal.addEventListener('abort', onAbort);
      }

      try {
        // Run all modes in parallel. `Promise.all` is fine here because
        // every `runOne` swallows its own errors — it will never reject.
        await Promise.all(payloads.map(runOne));
      } finally {
        signal.removeEventListener('abort', onAbort);
        send({ type: 'done' });
        if (!closed) {
          try {
            controller.close();
          } catch {
            // Already closed — ignore.
          }
        }
        closed = true;
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
