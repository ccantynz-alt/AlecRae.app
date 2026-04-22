import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { analyseCitations } from '@/lib/citations';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/citations
 * Body: { text: string }
 * Returns: { citations: Citation[], count: number, byJurisdiction: Record<string, number> }
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

  const text =
    body && typeof body === 'object' && 'text' in body
      ? (body as { text: unknown }).text
      : undefined;

  if (typeof text !== 'string') {
    return NextResponse.json(
      { error: 'Field "text" must be a string', code: 'INVALID_TEXT' },
      { status: 400 }
    );
  }

  // Hard cap to avoid pathological regex input
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
    const analysis = analyseCitations(text);
    return NextResponse.json(analysis, { status: 200 });
  } catch (error: unknown) {
    console.error('Citation analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyse citations', code: 'CITATION_ANALYSIS_ERROR' },
      { status: 500 }
    );
  }
}
