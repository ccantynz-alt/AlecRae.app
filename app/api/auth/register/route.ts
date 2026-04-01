import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, createUserSession, User } from '@/lib/auth-multi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, firmName } = body as {
      email?: string;
      password?: string;
      name?: string;
      firmName?: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create firm if firm name provided
    let firmId: string | undefined;
    if (firmName) {
      const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const firmResult = await query(
        `INSERT INTO firms (name, slug) VALUES ($1, $2) RETURNING id`,
        [firmName, slug]
      );
      firmId = firmResult[0].id as string;
    }

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, firm_id, firm_name, subscription_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, role, subscription_tier`,
      [email, passwordHash, name, firmId ? 'owner' : 'user', firmId || null, firmName || null, 'free']
    );

    const row = result[0];
    const user: User = {
      id: row.id as string,
      email,
      name,
      role: row.role as User['role'],
      firmId,
      subscriptionTier: row.subscription_tier as User['subscriptionTier'],
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
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
