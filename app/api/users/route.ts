import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, requireRole, hashPassword } from '@/lib/auth-multi';

/**
 * GET /api/users — List users (admin/owner only)
 */
export async function GET(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(currentUser, 'admin', 'owner')) {
    return NextResponse.json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  // If user has a firm, only list users in the same firm
  let rows;
  if (currentUser.firmId) {
    rows = await query(
      `SELECT id, email, name, role, firm_id, firm_name, subscription_tier, created_at, updated_at
       FROM users WHERE firm_id = $1 ORDER BY created_at DESC`,
      [currentUser.firmId]
    );
  } else {
    rows = await query(
      `SELECT id, email, name, role, firm_id, firm_name, subscription_tier, created_at, updated_at
       FROM users ORDER BY created_at DESC`
    );
  }

  return NextResponse.json({ users: rows });
}

/**
 * POST /api/users — Invite a new user (admin/owner only)
 */
export async function POST(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(currentUser, 'admin', 'owner')) {
    return NextResponse.json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name, role } = body as {
      email?: string;
      name?: string;
      role?: string;
    };

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    const validRoles = ['user', 'viewer', 'admin'];
    const assignedRole = role && validRoles.includes(role) ? role : 'user';

    // Prevent non-owners from creating admins
    if (assignedRole === 'admin' && !requireRole(currentUser, 'owner')) {
      return NextResponse.json(
        { error: 'Only owners can assign admin roles' },
        { status: 403 }
      );
    }

    // Check if user exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Generate a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(tempPassword);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, firm_id, subscription_tier)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, firm_id, subscription_tier, created_at`,
      [email, passwordHash, name, assignedRole, currentUser.firmId || null, 'free']
    );

    return NextResponse.json(
      {
        user: result[0],
        temporaryPassword: tempPassword,
        message: 'User invited. Share the temporary password securely — they should change it on first login.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Invite user error:', error);
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
  }
}
