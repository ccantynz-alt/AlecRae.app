import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { addClient, listClients, type ClientInput } from '@/lib/client-roster';
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
 * GET /api/clients — List all clients in the roster.
 */
export async function GET(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  const clients = listClients();
  return NextResponse.json({ clients, count: clients.length });
}

/**
 * POST /api/clients — Add a new client to the roster.
 *
 * Body: { name, type, aliases?, matterNumbers?, notes? }
 */
export async function POST(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  let body: ClientInput;
  try {
    body = (await request.json()) as ClientInput;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: 'Client name is required', code: 'MISSING_NAME' },
      { status: 400 }
    );
  }

  const VALID_TYPES = new Set(['current', 'former', 'adverse', 'prospect']);
  if (!body.type || !VALID_TYPES.has(body.type)) {
    return NextResponse.json(
      {
        error: 'type must be one of: current, former, adverse, prospect',
        code: 'INVALID_TYPE',
      },
      { status: 400 }
    );
  }

  try {
    const client = addClient(body);
    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to add client',
        code: 'ADD_CLIENT_ERROR',
      },
      { status: 500 }
    );
  }
}
