import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { listTimeEntries, exportTimeEntries } from '@/lib/matter-store';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ maxRequests: 10, windowSeconds: 60 });

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

const VALID_FORMATS = ['csv', 'actionstep', 'clio', 'mycase', 'practicepanther'] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

/**
 * GET /api/time-entries/export
 * Query params:
 *   format    — csv | actionstep | clio | mycase | practicepanther (default: csv)
 *   from      — YYYY-MM-DD inclusive lower bound
 *   to        — YYYY-MM-DD inclusive upper bound
 *   matterId  — restrict to a single matter
 *   billable  — 'true' | 'false'
 *
 * Returns text/csv with Content-Disposition: attachment.
 */
export async function GET(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);

  const rawFormat = searchParams.get('format') ?? 'csv';
  if (!VALID_FORMATS.includes(rawFormat as ExportFormat)) {
    return NextResponse.json(
      {
        error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`,
        code: 'INVALID_FORMAT',
      },
      { status: 400 }
    );
  }
  const format = rawFormat as ExportFormat;

  const matterId = searchParams.get('matterId') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const billableParam = searchParams.get('billable');
  const billable =
    billableParam === 'true' ? true : billableParam === 'false' ? false : undefined;

  // Apply filters before export so exportTimeEntries only sees relevant rows
  const entries = listTimeEntries({ matterId, from, to, billable });
  const payload = exportTimeEntries(format, entries);

  // Build a descriptive filename
  const datePart = from && to ? `_${from}_to_${to}` : from ? `_from_${from}` : '';
  const filename = `time-entries_${format}${datePart}.csv`;

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
