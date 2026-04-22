import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  isEsignConfigured,
  getDocusignStatus,
  getAdobesignStatus,
  type SignProvider,
} from '@/lib/esign';

const limiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60 });

export async function GET(request: NextRequest) {
  // Rate limit
  const limited = limiter(request);
  if (limited) return limited;

  // Auth required
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check configuration
  const config = isEsignConfigured();
  if (!config.anyConfigured) {
    return NextResponse.json(
      {
        error: 'E-signature not configured.',
        code: 'ESIGN_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const envelopeId = searchParams.get('envelopeId');
  const provider = searchParams.get('provider') as SignProvider | null;

  if (!envelopeId?.trim()) {
    return NextResponse.json({ error: 'envelopeId query param is required' }, { status: 400 });
  }

  if (!provider || (provider !== 'docusign' && provider !== 'adobesign')) {
    return NextResponse.json(
      { error: 'provider query param must be "docusign" or "adobesign"' },
      { status: 400 }
    );
  }

  try {
    const result =
      provider === 'docusign'
        ? await getDocusignStatus(envelopeId)
        : await getAdobesignStatus(envelopeId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[esign/status] error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch envelope status',
        code: 'ESIGN_STATUS_ERROR',
      },
      { status: 500 }
    );
  }
}
