import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { logTime, listTimeEntries, findMatterById } from '@/lib/matter-store';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60 });

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/time-entries — List time entries with optional filters.
 * Query params:
 *   matterId   — filter to a specific matter
 *   from       — ISO date string (inclusive lower bound)
 *   to         — ISO date string (inclusive upper bound)
 *   billable   — 'true' | 'false'
 */
export async function GET(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const matterId = searchParams.get('matterId') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const billableParam = searchParams.get('billable');
  const billable =
    billableParam === 'true' ? true : billableParam === 'false' ? false : undefined;

  const entries = listTimeEntries({ matterId, from, to, billable });

  // Enrich with matter data for convenience
  const enriched = entries.map((e) => {
    const matter = findMatterById(e.matterId);
    return {
      ...e,
      matterNumber: matter?.matterNumber ?? null,
      clientName: matter?.clientName ?? null,
    };
  });

  return NextResponse.json({ entries: enriched });
}

/**
 * POST /api/time-entries — Log a new time entry.
 * Body: {
 *   matterId: string,
 *   durationSeconds: number,
 *   description: string,
 *   date: string (YYYY-MM-DD),
 *   billable?: boolean,
 *   dictationId?: string
 * }
 */
export async function POST(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { matterId, durationSeconds, description, date, billable = true, dictationId } = body;

    if (!matterId || typeof matterId !== 'string') {
      return NextResponse.json(
        { error: 'matterId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const matter = findMatterById(matterId);
    if (!matter) {
      return NextResponse.json(
        { error: 'Matter not found', code: 'MATTER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
      return NextResponse.json(
        { error: 'durationSeconds must be a non-negative number', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json(
        { error: 'description is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'date is required (YYYY-MM-DD)', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const entry = logTime({
      matterId,
      durationSeconds,
      description: description.trim(),
      date,
      billable: Boolean(billable),
      dictationId: dictationId ?? undefined,
    });

    return NextResponse.json(
      {
        entry: {
          ...entry,
          matterNumber: matter.matterNumber,
          clientName: matter.clientName,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to log time entry', code: 'LOG_TIME_ERROR' },
      { status: 500 }
    );
  }
}
