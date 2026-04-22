import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { getShareByToken, verifyPassword, incrementViewCount } from '@/lib/share-store';

/**
 * POST /api/share/view/[token]
 *
 * Public endpoint — NO auth required. Accessible by anyone with the link.
 *
 * Request body (optional): { password?: string }
 *
 * Responses:
 *   200 — { title, content, mode, createdAt, expiresAt }
 *   401 — { error: 'password-required' }
 *   403 — { error: 'wrong-password' }
 *   404 — { error: 'not-found' }
 *   410 — { error: 'expired' | 'revoked' }
 */

// Slightly tighter limit for the public view endpoint to prevent enumeration
const limiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60 });

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const { token } = params;
  if (!token) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  // Parse optional password from body
  let password: string | undefined;
  try {
    const body = await request.json().catch(() => ({})) as { password?: string };
    if (typeof body?.password === 'string' && body.password.length > 0) {
      password = body.password;
    }
  } catch {
    // No body / invalid JSON — treat as no password provided
  }

  // Retrieve the share — getShareByToken already checks revoked + expiry
  const share = getShareByToken(token);

  if (!share) {
    // Could be not-found, expired, or revoked.  We need to distinguish for
    // UX purposes, so we inspect the raw store via a second look.
    // Rather than exposing a raw-store accessor, we return a generic 404 to
    // prevent token enumeration, and let the UI treat 410 separately if needed.
    // (The caller can check response body for the specific error code.)
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  // Check password
  if (share.passwordHash) {
    if (!password) {
      return NextResponse.json({ error: 'password-required' }, { status: 401 });
    }
    if (!verifyPassword(share, password)) {
      return NextResponse.json({ error: 'wrong-password' }, { status: 403 });
    }
  }

  // Success — record the view and return the dictation data
  incrementViewCount(share.id);

  return NextResponse.json({
    title: share.title,
    content: share.content,
    mode: share.mode,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt ?? null,
  });
}
