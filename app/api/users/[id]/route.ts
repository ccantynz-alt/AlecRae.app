import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, requireRole } from '@/lib/auth-multi';

/**
 * GET /api/users/[id] — Get a user profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  // Users can view their own profile; admins/owners can view anyone
  if (currentUser.id !== id && !requireRole(currentUser, 'admin', 'owner')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await query(
    `SELECT id, email, name, role, firm_id, firm_name, subscription_tier,
            stripe_customer_id, settings, custom_instructions, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: rows[0] });
}

/**
 * PUT /api/users/[id] — Update a user profile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const isSelf = currentUser.id === id;
  const isAdmin = requireRole(currentUser, 'admin', 'owner');

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, role, customInstructions, settings } = body as {
      name?: string;
      role?: string;
      customInstructions?: string;
      settings?: Record<string, unknown>;
    };

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (role !== undefined && isAdmin && !isSelf) {
      // Only admins can change roles, and not their own
      const validRoles = ['user', 'viewer', 'admin'];
      if (currentUser.role === 'owner') validRoles.push('owner');
      if (validRoles.includes(role)) {
        updates.push(`role = $${paramIndex++}`);
        values.push(role);
      }
    }

    if (customInstructions !== undefined) {
      updates.push(`custom_instructions = $${paramIndex++}`);
      values.push(customInstructions);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, name, role, firm_id, subscription_tier, updated_at`,
      values
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result[0] });
  } catch (error: unknown) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id] — Deactivate a user (admin/owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(currentUser, 'admin', 'owner')) {
    return NextResponse.json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  const { id } = params;

  // Prevent self-deletion
  if (currentUser.id === id) {
    return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
  }

  // Soft-delete by setting subscription_status to 'deactivated'
  const result = await query(
    `UPDATE users SET subscription_status = 'deactivated', updated_at = NOW()
     WHERE id = $1 RETURNING id, email, name`,
    [id]
  );

  if (result.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: `User ${result[0].email} has been deactivated`,
  });
}
