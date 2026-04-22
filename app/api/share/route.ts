import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { verifySession } from '@/lib/auth';
import { createShare, listShares } from '@/lib/share-store';

/**
 * POST /api/share — Create a new share link (auth required)
 * GET  /api/share — List share links owned by the current session (auth required)
 */

const limiter = createRateLimiter({ maxRequests: 20, windowSeconds: 60 });

const SESSION_COOKIE = 'alecrae_session';

async function getSessionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const valid = await verifySession(token);
  if (!valid) return null;
  // Use the raw token as a stable owner identifier (it is already
  // authenticated; we don't need to decode a userId since the admin auth
  // only embeds { role: 'admin' } — enough to scope by token).
  return token;
}

export async function POST(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const sessionId = await getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    title,
    content,
    mode,
    expiresInSeconds,
    password,
  } = body as {
    title?: string;
    content?: string;
    mode?: string;
    expiresInSeconds?: number;
    password?: string;
  };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }
  if (!mode || typeof mode !== 'string') {
    return NextResponse.json({ error: 'mode is required' }, { status: 400 });
  }

  const share = createShare({
    title: typeof title === 'string' ? title : '',
    content: content.trim(),
    mode,
    expiresInSeconds:
      typeof expiresInSeconds === 'number' && expiresInSeconds > 0
        ? expiresInSeconds
        : undefined,
    password: typeof password === 'string' && password.length > 0 ? password : undefined,
    ownerSessionId: sessionId,
  });

  // Never expose passwordHash or ownerSessionId to the client
  return NextResponse.json(
    {
      id: share.id,
      token: share.token,
      title: share.title,
      mode: share.mode,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt ?? null,
      passwordProtected: !!share.passwordHash,
      viewCount: share.viewCount,
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const sessionId = await getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shares = listShares(sessionId).map((s) => ({
    id: s.id,
    token: s.token,
    title: s.title,
    mode: s.mode,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt ?? null,
    passwordProtected: !!s.passwordHash,
    revoked: s.revoked,
    viewCount: s.viewCount,
  }));

  return NextResponse.json({ shares });
}
