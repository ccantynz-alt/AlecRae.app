import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, requireRole } from '@/lib/auth-multi';
import { getWhiteLabelConfig, updateWhiteLabelConfig } from '@/lib/whitelabel';

/**
 * GET /api/whitelabel — Get white-label config for the current user's firm
 */
export async function GET(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!currentUser.firmId) {
    return NextResponse.json(
      { error: 'No firm associated with this account' },
      { status: 400 }
    );
  }

  try {
    const config = await getWhiteLabelConfig(currentUser.firmId);
    if (!config) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }
    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('White-label GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch white-label config' }, { status: 500 });
  }
}

/**
 * PUT /api/whitelabel — Update white-label config (admin/owner only)
 */
export async function PUT(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(currentUser, 'admin', 'owner')) {
    return NextResponse.json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  if (!currentUser.firmId) {
    return NextResponse.json(
      { error: 'No firm associated with this account' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { appName, logoUrl, primaryColor, accentColor, favicon, customDomain, hideAlecRaeBranding } =
      body as {
        appName?: string;
        logoUrl?: string;
        primaryColor?: string;
        accentColor?: string;
        favicon?: string;
        customDomain?: string;
        hideAlecRaeBranding?: boolean;
      };

    // Validate color formats if provided
    const colorRegex = /^#[0-9a-fA-F]{6}$/;
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return NextResponse.json({ error: 'primaryColor must be a valid hex color (e.g. #0a0a0a)' }, { status: 400 });
    }
    if (accentColor && !colorRegex.test(accentColor)) {
      return NextResponse.json({ error: 'accentColor must be a valid hex color (e.g. #d4a853)' }, { status: 400 });
    }

    const config = await updateWhiteLabelConfig(currentUser.firmId, {
      appName,
      logoUrl,
      primaryColor,
      accentColor,
      favicon,
      customDomain,
      hideAlecRaeBranding,
    });

    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('White-label PUT error:', error);
    return NextResponse.json({ error: 'Failed to update white-label config' }, { status: 500 });
  }
}
