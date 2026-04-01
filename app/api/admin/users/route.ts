import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, requireRole } from '@/lib/auth-multi';

/**
 * GET /api/admin/users — Paginated user list with search and filters (admin/owner only)
 *
 * Query params:
 *   ?search=  — filter by name or email (case-insensitive)
 *   ?role=    — filter by role (owner, admin, user, viewer)
 *   ?plan=    — filter by subscription tier (free, pro, enterprise)
 *   ?page=    — page number (default 1)
 *   ?limit=   — items per page (default 25, max 100)
 */
export async function GET(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(currentUser, 'admin', 'owner')) {
    return NextResponse.json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const planFilter = searchParams.get('plan') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions: string[] = [`subscription_status != 'deactivated'`];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Scope to firm if user has one
    if (currentUser.firmId) {
      conditions.push(`firm_id = $${paramIndex++}`);
      values.push(currentUser.firmId);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (roleFilter) {
      conditions.push(`role = $${paramIndex++}`);
      values.push(roleFilter);
    }

    if (planFilter) {
      conditions.push(`subscription_tier = $${paramIndex++}`);
      values.push(planFilter);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
      values
    );
    const total = countResult[0]?.total ?? 0;

    // Get paginated results
    const rows = await query(
      `SELECT id, email, name, role, firm_id, firm_name, subscription_tier,
              subscription_status, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    return NextResponse.json({
      users: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
