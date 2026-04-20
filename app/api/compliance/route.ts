import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { checkCompliance, ComplianceIssue } from '@/lib/compliance';

export const runtime = 'nodejs';
export const maxDuration = 10;

const complianceLimiter = createRateLimiter({
  maxRequests: 30,
  windowSeconds: 60,
});

interface ComplianceResponse {
  issues: ComplianceIssue[];
  count: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * POST /api/compliance
 * Body: { text: string, mode: string }
 * Returns: { issues, count, bySeverity: { critical, warning, info } }
 *
 * Rate limited to 30 requests/minute per IP. Auth required.
 */
export async function POST(request: NextRequest) {
  const limited = complianceLimiter(request);
  if (limited) return limited;

  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const payload = (body ?? {}) as { text?: unknown; mode?: unknown };

  if (typeof payload.text !== 'string') {
    return NextResponse.json(
      { error: 'Field "text" must be a string', code: 'INVALID_TEXT' },
      { status: 400 }
    );
  }

  if (typeof payload.mode !== 'string' || payload.mode.length === 0) {
    return NextResponse.json(
      { error: 'Field "mode" must be a non-empty string', code: 'INVALID_MODE' },
      { status: 400 }
    );
  }

  const MAX_LEN = 200_000;
  if (payload.text.length > MAX_LEN) {
    return NextResponse.json(
      {
        error: `Text exceeds maximum length of ${MAX_LEN} characters`,
        code: 'TEXT_TOO_LONG',
      },
      { status: 413 }
    );
  }

  try {
    const issues = checkCompliance(payload.text, payload.mode);
    const response: ComplianceResponse = {
      issues,
      count: issues.length,
      bySeverity: {
        critical: issues.filter((i) => i.severity === 'critical').length,
        warning: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
      },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Compliance check error:', error);
    return NextResponse.json(
      { error: 'Failed to run compliance check', code: 'COMPLIANCE_ERROR' },
      { status: 500 }
    );
  }
}
