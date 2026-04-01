import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/sso';

/**
 * GET /api/auth/sso/[provider] — Redirect to SSO provider authorization URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;

  if (provider !== 'google' && provider !== 'microsoft') {
    return NextResponse.json(
      { error: 'Unsupported SSO provider. Use "google" or "microsoft".' },
      { status: 400 }
    );
  }

  try {
    const url = getAuthorizationUrl(provider);
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    console.error('SSO redirect error:', error);
    return NextResponse.json(
      { error: 'SSO not configured for this provider' },
      { status: 500 }
    );
  }
}
