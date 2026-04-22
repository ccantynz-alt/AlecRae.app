import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { verifySession } from '@/lib/auth';
import { revokeShare } from '@/lib/share-store';

/**
 * DELETE /api/share/[id] — Revoke a share link (auth required, owner only).
 */

const limiter = createRateLimiter({ maxRequests: 20, windowSeconds: 60 });

const SESSION_COOKIE = 'alecrae_session';

async function getSessionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const valid = await verifySession(token);
  if (!valid) return null;
  return token;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const sessionId = await getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Share ID required' }, { status: 400 });
  }

  const ok = revokeShare(id, sessionId);
  if (!ok) {
    return NextResponse.json(
      { error: 'Share not found or does not belong to your session' },
      { status: 404 }
    );
  }

  return NextResponse.json({ revoked: true });
}
