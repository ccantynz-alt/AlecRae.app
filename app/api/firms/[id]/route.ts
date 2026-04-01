import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { firmStore } from '../route';

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/firms/[id] — Get a single firm profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const firm = firmStore.get(params.id);
  if (!firm) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
  }

  return NextResponse.json({ firm });
}

/**
 * DELETE /api/firms/[id] — Delete a firm profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const firm = firmStore.get(params.id);
  if (!firm) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
  }

  firmStore.delete(params.id);

  return NextResponse.json({ success: true, deletedId: params.id });
}
