import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { addMatter, listMatters, type Matter } from '@/lib/matter-store';
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
 * GET /api/matters — List matters.
 * Query params:
 *   status=active|closed — filter by status (default: all)
 */
export async function GET(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as Matter['status'] | null;

  const matters = listMatters(status ? { status } : undefined);
  return NextResponse.json({ matters });
}

/**
 * POST /api/matters — Create a new matter.
 * Body: { clientName, matterNumber, description?, hourlyRate?, billingCode?, status? }
 */
export async function POST(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { clientName, matterNumber, description, hourlyRate, billingCode, status } = body;

    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return NextResponse.json(
        { error: 'clientName is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!matterNumber || typeof matterNumber !== 'string' || !matterNumber.trim()) {
      return NextResponse.json(
        { error: 'matterNumber is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate < 0)) {
      return NextResponse.json(
        { error: 'hourlyRate must be a non-negative number', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (status !== undefined && status !== 'active' && status !== 'closed') {
      return NextResponse.json(
        { error: 'status must be "active" or "closed"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const matter = addMatter({ clientName, matterNumber, description, hourlyRate, billingCode, status });
    return NextResponse.json({ matter }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create matter', code: 'CREATE_MATTER_ERROR' },
      { status: 500 }
    );
  }
}
