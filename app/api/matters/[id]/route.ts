import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  findMatterById,
  updateMatter,
  closeMatter,
  deleteMatter,
} from '@/lib/matter-store';
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
 * GET /api/matters/[id] — Get a single matter.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const matter = findMatterById(params.id);
  if (!matter) {
    return NextResponse.json({ error: 'Matter not found', code: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json({ matter });
}

/**
 * PATCH /api/matters/[id] — Update matter fields.
 * Body: partial Matter (any subset of mutable fields).
 * Special: { status: 'closed' } is equivalent to calling closeMatter.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const existing = findMatterById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Matter not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { clientName, matterNumber, description, hourlyRate, billingCode, status } = body;

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

    const updates: Partial<typeof existing> = {};
    if (clientName !== undefined) updates.clientName = String(clientName).trim();
    if (matterNumber !== undefined) updates.matterNumber = String(matterNumber).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;
    if (billingCode !== undefined) updates.billingCode = String(billingCode).trim();
    if (status !== undefined) updates.status = status;

    const matter = updateMatter(params.id, updates);
    return NextResponse.json({ matter });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update matter', code: 'UPDATE_MATTER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/matters/[id] — Permanently delete a matter.
 * Note: associated time entries are NOT deleted; their matterId will dangle.
 * Callers should consider using PATCH { status: 'closed' } for archival instead.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const existing = findMatterById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Matter not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  deleteMatter(params.id);
  return NextResponse.json({ success: true, deletedId: params.id });
}
