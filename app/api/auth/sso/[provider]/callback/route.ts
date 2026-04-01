import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleCallback } from '@/lib/sso';
import { createUserSession, User } from '@/lib/auth-multi';

/**
 * GET /api/auth/sso/[provider]/callback — Handle OAuth callback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alecrae.app';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=sso_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=sso_no_code`);
  }

  try {
    const ssoUser = await handleCallback(provider, code);

    // Check if user exists by SSO subject or email
    let rows = await query(
      `SELECT id, email, name, role, firm_id, subscription_tier
       FROM users WHERE sso_provider = $1 AND sso_subject = $2`,
      [provider, ssoUser.sub]
    );

    let user: User;

    if (rows.length > 0) {
      // Existing SSO user — log them in
      const row = rows[0];
      user = {
        id: row.id as string,
        email: row.email as string,
        name: row.name as string,
        role: row.role as User['role'],
        firmId: (row.firm_id as string) || undefined,
        subscriptionTier: (row.subscription_tier as User['subscriptionTier']) || 'free',
      };
    } else {
      // Check if there's an existing user with this email (link accounts)
      rows = await query(
        `SELECT id, email, name, role, firm_id, subscription_tier
         FROM users WHERE email = $1`,
        [ssoUser.email]
      );

      if (rows.length > 0) {
        // Link SSO to existing account
        const row = rows[0];
        await query(
          `UPDATE users SET sso_provider = $1, sso_subject = $2, updated_at = NOW()
           WHERE id = $3`,
          [provider, ssoUser.sub, row.id]
        );
        user = {
          id: row.id as string,
          email: row.email as string,
          name: row.name as string,
          role: row.role as User['role'],
          firmId: (row.firm_id as string) || undefined,
          subscriptionTier: (row.subscription_tier as User['subscriptionTier']) || 'free',
        };
      } else {
        // Create new user from SSO
        const result = await query(
          `INSERT INTO users (email, name, role, sso_provider, sso_subject, subscription_tier)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [ssoUser.email, ssoUser.name, 'user', provider, ssoUser.sub, 'free']
        );
        user = {
          id: result[0].id as string,
          email: ssoUser.email,
          name: ssoUser.name,
          role: 'user',
          subscriptionTier: 'free',
        };
      }
    }

    const token = await createUserSession(user);

    const response = NextResponse.redirect(`${baseUrl}/app`);
    response.cookies.set('alecrae_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('SSO callback error:', err);
    return NextResponse.redirect(`${baseUrl}/?error=sso_failed`);
  }
}
