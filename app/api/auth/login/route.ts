import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { verifyPassword, createUserSession, User } from '@/lib/auth-multi';
import { rateLimiters } from '@/lib/rate-limit';
import { findUserByEmail } from '@/lib/user-store';

export async function POST(request: NextRequest) {
  const limited = rateLimiters.auth(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // ─── Database path ───────────────────────────────────────
    if (isDatabaseConfigured()) {
      const rows = await query(
        `SELECT id, email, name, password_hash, role, firm_id, subscription_tier
         FROM users WHERE email = $1`,
        [email]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      const row = rows[0];
      const passwordHash = row.password_hash as string;

      if (!passwordHash) {
        return NextResponse.json(
          { error: 'This account uses SSO login. Please use the SSO button.' },
          { status: 400 }
        );
      }

      const valid = await verifyPassword(password, passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      const user: User = {
        id: row.id as string,
        email: row.email as string,
        name: row.name as string,
        role: row.role as User['role'],
        firmId: (row.firm_id as string) || undefined,
        subscriptionTier: (row.subscription_tier as User['subscriptionTier']) || 'free',
      };

      const token = await createUserSession(user);
      const response = NextResponse.json({ success: true, user });
      response.cookies.set('alecrae_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      return response;
    }

    // ─── In-memory path (no DATABASE_URL) ────────────────────
    const stored = findUserByEmail(email);
    if (!stored) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, stored.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user: User = {
      id: stored.id,
      email: stored.email,
      name: stored.name,
      role: stored.role,
      firmId: stored.firmId,
      subscriptionTier: stored.subscriptionTier,
    };

    const token = await createUserSession(user);
    const response = NextResponse.json({ success: true, user });
    response.cookies.set('alecrae_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.', code: 'LOGIN_ERROR' },
      { status: 500 }
    );
  }
}
