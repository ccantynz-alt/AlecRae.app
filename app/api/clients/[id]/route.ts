import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getClient,
  updateClient,
  removeClient,
  type ClientInput,
} from '@/lib/client-roster';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60 });

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * PATCH /api/clients/[id] — Partially update a client record.
 *
 * Body: any subset of { name, type, aliases, matterNumbers, notes }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const existing = getClient(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  let body: Partial<ClientInput>;
  try {
    body = (await request.json()) as Partial<ClientInput>;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  if (body.type !== undefined) {
    const VALID_TYPES = new Set(['current', 'former', 'adverse', 'prospect']);
    if (!VALID_TYPES.has(body.type)) {
      return NextResponse.json(
        {
          error: 'type must be one of: current, former, adverse, prospect',
          code: 'INVALID_TYPE',
        },
        { status: 400 }
      );
    }
  }

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json(
      { error: 'Client name cannot be empty', code: 'EMPTY_NAME' },
      { status: 400 }
    );
  }

  try {
    const client = updateClient(params.id, body);
    return NextResponse.json({ client });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to update client',
        code: 'UPDATE_CLIENT_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[id] — Remove a client from the roster.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const existing = getClient(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  removeClient(params.id);
  return NextResponse.json({ success: true, deletedId: params.id });
}
