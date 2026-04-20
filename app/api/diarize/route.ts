import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { diarize, DiarizationResult, DiarizationContext } from '@/lib/diarization';

export const runtime = 'nodejs';
export const maxDuration = 10;

const diarizeLimiter = createRateLimiter({
  maxRequests: 30,
  windowSeconds: 60,
});

/**
 * POST /api/diarize
 * Body: { text: string, hints?: { speakers?: string[], context?: DiarizationContext } }
 * Returns: { turns, speakerLabels, confidence }
 *
 * Rate limited to 30 requests/minute per IP. Auth required.
 * Maximum text length: 200,000 characters.
 */
export async function POST(request: NextRequest) {
  const limited = diarizeLimiter(request);
  if (limited) return limited;

  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const payload = (body ?? {}) as {
    text?: unknown;
    hints?: {
      speakers?: unknown;
      context?: unknown;
    };
  };

  if (typeof payload.text !== 'string') {
    return NextResponse.json(
      { error: 'Field "text" must be a string', code: 'INVALID_TEXT' },
      { status: 400 }
    );
  }

  const MAX_LEN = 200_000;
  if (payload.text.length > MAX_LEN) {
    return NextResponse.json(
      {
        error: `Text exceeds maximum length of ${MAX_LEN} characters`,
        code: 'TEXT_TOO_LONG',
      },
      { status: 413 }
    );
  }

  // Validate optional hints
  const rawHints = payload.hints ?? {};
  const validContexts = new Set<string>([
    'deposition',
    'meeting',
    'interview',
    'client-call',
  ]);

  let speakers: string[] | undefined;
  if (rawHints.speakers !== undefined) {
    if (
      !Array.isArray(rawHints.speakers) ||
      !rawHints.speakers.every((s) => typeof s === 'string')
    ) {
      return NextResponse.json(
        { error: 'Field "hints.speakers" must be an array of strings', code: 'INVALID_SPEAKERS' },
        { status: 400 }
      );
    }
    speakers = rawHints.speakers as string[];
  }

  let context: DiarizationContext | undefined;
  if (rawHints.context !== undefined) {
    if (typeof rawHints.context !== 'string' || !validContexts.has(rawHints.context)) {
      return NextResponse.json(
        {
          error: `Field "hints.context" must be one of: ${[...validContexts].join(', ')}`,
          code: 'INVALID_CONTEXT',
        },
        { status: 400 }
      );
    }
    context = rawHints.context as DiarizationContext;
  }

  try {
    const result: DiarizationResult = diarize(payload.text, { speakers, context });
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Diarization error:', error);
    return NextResponse.json(
      { error: 'Failed to run speaker diarization', code: 'DIARIZATION_ERROR' },
      { status: 500 }
    );
  }
}
