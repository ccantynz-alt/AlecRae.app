import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { searchPrecedents, type HistoryDoc, type PrecedentMatch } from '@/lib/precedent';

export const runtime = 'nodejs';
export const maxDuration = 10;

/** 30 requests per minute — consistent with transcribe limiter */
const rateLimiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60 });

/** Hard cap on inbound history to prevent abuse / memory pressure */
const MAX_DOCS = 100;
/** Hard cap on query length */
const MAX_QUERY_LEN = 50_000;

/**
 * POST /api/precedents
 *
 * Body:
 *   {
 *     query: string        — the current dictation text to match against
 *     docs:  HistoryDoc[]  — the caller's localStorage history (sent client-side
 *                           until DATABASE_URL + pg_vector is wired up)
 *     limit?: number       — max results to return (default 5, max 20)
 *   }
 *
 * Response:
 *   { matches: PrecedentMatch[], indexedDocs: number }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Rate limit
  const limited = rateLimiter(request);
  if (limited) return limited;

  // 2. Auth
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Request body must be an object', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;

  // 4. Validate `query`
  const query = raw['query'];
  if (typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      { error: 'Field "query" must be a non-empty string', code: 'INVALID_QUERY' },
      { status: 400 }
    );
  }
  if (query.length > MAX_QUERY_LEN) {
    return NextResponse.json(
      {
        error: `Query exceeds maximum length of ${MAX_QUERY_LEN} characters`,
        code: 'QUERY_TOO_LONG',
      },
      { status: 413 }
    );
  }

  // 5. Validate `docs`
  const rawDocs = raw['docs'];
  if (!Array.isArray(rawDocs)) {
    return NextResponse.json(
      { error: 'Field "docs" must be an array', code: 'INVALID_DOCS' },
      { status: 400 }
    );
  }

  // Sanitise and cap docs
  const docs: HistoryDoc[] = rawDocs
    .slice(0, MAX_DOCS)
    .filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
    .map((d) => ({
      id:       typeof d['id']       === 'string' ? d['id']       : String(d['id'] ?? ''),
      mode:     typeof d['mode']     === 'string' ? d['mode']     : 'general',
      raw:      typeof d['raw']      === 'string' ? d['raw']      : '',
      enhanced: typeof d['enhanced'] === 'string' ? d['enhanced'] : '',
      date:     typeof d['date']     === 'string' ? d['date']     : '',
    }));

  // 6. Validate `limit`
  const rawLimit = raw['limit'];
  const limit = typeof rawLimit === 'number'
    ? Math.min(Math.max(1, Math.floor(rawLimit)), 20)
    : 5;

  // 7. Run search
  let matches: PrecedentMatch[];
  try {
    matches = searchPrecedents(query, docs, limit);
  } catch (err: unknown) {
    console.error('Precedent search error:', err);
    return NextResponse.json(
      { error: 'Precedent search failed', code: 'SEARCH_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { matches, indexedDocs: docs.length },
    { status: 200 }
  );
}
