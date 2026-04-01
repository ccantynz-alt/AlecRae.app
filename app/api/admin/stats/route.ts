import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, requireRole } from '@/lib/auth-multi';

/**
 * GET /api/admin/stats — Dashboard statistics (admin/owner only)
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
    // Run all stat queries in parallel
    const [
      totalUsersResult,
      activeUsersResult,
      totalDictationsResult,
      monthDictationsResult,
      documentModesResult,
      topUsersResult,
      subscriptionBreakdownResult,
    ] = await Promise.all([
      // Total users
      query(`SELECT COUNT(*)::int AS count FROM users WHERE subscription_status != 'deactivated'`),

      // Active users (last 30 days)
      query(`
        SELECT COUNT(DISTINCT user_id)::int AS count
        FROM usage_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `),

      // Total dictations
      query(`SELECT COUNT(*)::int AS count FROM dictations`),

      // Dictations this month
      query(`
        SELECT COUNT(*)::int AS count
        FROM dictations
        WHERE created_at >= DATE_TRUNC('month', NOW())
      `),

      // Most used document modes
      query(`
        SELECT mode, COUNT(*)::int AS count
        FROM dictations
        GROUP BY mode
        ORDER BY count DESC
        LIMIT 10
      `),

      // Top users by usage (last 30 days)
      query(`
        SELECT u.id, u.email, u.name, COUNT(d.id)::int AS dictation_count
        FROM users u
        LEFT JOIN dictations d ON d.user_id = u.id AND d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY u.id, u.email, u.name
        ORDER BY dictation_count DESC
        LIMIT 10
      `),

      // Subscription breakdown
      query(`
        SELECT subscription_tier, COUNT(*)::int AS count
        FROM users
        WHERE subscription_status != 'deactivated'
        GROUP BY subscription_tier
      `),
    ]);

    // Calculate approximate revenue from subscription counts
    const subscriptionBreakdown = subscriptionBreakdownResult as Array<{
      subscription_tier: string;
      count: number;
    }>;
    let estimatedMonthlyRevenue = 0;
    for (const tier of subscriptionBreakdown) {
      if (tier.subscription_tier === 'pro') {
        estimatedMonthlyRevenue += tier.count * 29;
      } else if (tier.subscription_tier === 'enterprise') {
        estimatedMonthlyRevenue += tier.count * 99;
      }
    }

    return NextResponse.json({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      activeUsers: activeUsersResult[0]?.count ?? 0,
      totalDictations: totalDictationsResult[0]?.count ?? 0,
      dictationsThisMonth: monthDictationsResult[0]?.count ?? 0,
      documentModes: documentModesResult,
      topUsers: topUsersResult,
      subscriptionBreakdown,
      estimatedMonthlyRevenue,
    });
  } catch (error: unknown) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
