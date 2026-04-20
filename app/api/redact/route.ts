import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { detectRedactions, applyRedactions } from '@/lib/redaction';
import type { RedactionType } from '@/lib/redaction';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/redact
 * Body: { text: string, types?: RedactionType[], mode: 'detect' | 'apply' }
 * Returns: { redactions, redactedText?, count, byType: Record<RedactionType, number> }
 *
 * Rate limited to 20/min (uses the shared `enhance` limiter bucket).
 */
export async function POST(request: NextRequest) {
  const limited = rateLimiters.enhance(request);
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

  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  const text = typeof b.text === 'string' ? b.text : undefined;
  const mode = typeof b.mode === 'string' ? b.mode : 'detect';
  const types = Array.isArray(b.types)
    ? (b.types.filter((t) => typeof t === 'string') as RedactionType[])
    : undefined;

  if (typeof text !== 'string') {
    return NextResponse.json(
      { error: 'Field "text" must be a string', code: 'INVALID_TEXT' },
      { status: 400 }
    );
  }

  if (mode !== 'detect' && mode !== 'apply') {
    return NextResponse.json(
      { error: 'Field "mode" must be "detect" or "apply"', code: 'INVALID_MODE' },
      { status: 400 }
    );
  }

  const MAX_LEN = 200_000;
  if (text.length > MAX_LEN) {
    return NextResponse.json(
      {
        error: `Text exceeds maximum length of ${MAX_LEN} characters`,
        code: 'TEXT_TOO_LONG',
      },
      { status: 413 }
    );
  }

  try {
    const redactions = detectRedactions(text, types);

    // Tally by type
    const byType: Record<string, number> = {};
    for (const r of redactions) {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
    }

    const response: {
      redactions: typeof redactions;
      count: number;
      byType: Record<string, number>;
      redactedText?: string;
    } = {
      redactions,
      count: redactions.length,
      byType,
    };

    if (mode === 'apply') {
      response.redactedText = applyRedactions(text, redactions);
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Redaction error:', error);
    return NextResponse.json(
      { error: 'Failed to process redaction', code: 'REDACTION_ERROR' },
      { status: 500 }
    );
  }
}
