import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-multi';
import { isVoxlenConfigured } from '@/lib/voxlen';

export interface BillingStatus {
  plan: 'free' | 'personal' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'past_due' | 'cancelled' | 'none';
  stripeConfigured: boolean;
  databaseConfigured: boolean;
  voxlenConfigured: boolean;
}

/**
 * GET /api/billing/status
 *
 * Returns the current user's subscription tier and billing status.
 * Gracefully degrades across three scenarios:
 *   1. Multi-user mode (JWT has subscriptionTier claim)
 *   2. Database available (query users table for subscription_tier)
 *   3. Single-user / no DB (defaults to 'free')
 */
export async function GET(request: NextRequest) {
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const databaseConfigured = !!process.env.DATABASE_URL;
  const voxlenConfigured = isVoxlenConfigured();

  // --- Attempt 1: Read plan from multi-user JWT claims ---
  const multiUser = await getUserFromRequest(request);
  if (multiUser) {
    // If the JWT carries subscription info, trust it.
    // Also try to get live status from DB if available.
    if (databaseConfigured) {
      try {
        const { query } = await import('@/lib/db');
        const rows = await query(
          `SELECT subscription_tier, subscription_status FROM users WHERE id = $1`,
          [multiUser.id]
        );
        if (rows.length > 0) {
          const row = rows[0] as { subscription_tier?: string; subscription_status?: string };
          return NextResponse.json({
            plan: (row.subscription_tier as BillingStatus['plan']) || multiUser.subscriptionTier || 'free',
            subscriptionStatus: (row.subscription_status as BillingStatus['subscriptionStatus']) || 'none',
            stripeConfigured,
            databaseConfigured,
            voxlenConfigured,
          } satisfies BillingStatus);
        }
      } catch {
        // DB query failed — fall through to JWT claim
      }
    }

    // No DB or DB miss — use JWT claim directly
    return NextResponse.json({
      plan: multiUser.subscriptionTier || 'free',
      subscriptionStatus: multiUser.subscriptionTier !== 'free' ? 'active' : 'none',
      stripeConfigured,
      databaseConfigured,
      voxlenConfigured,
    } satisfies BillingStatus);
  }

  // --- Attempt 2: Single-user mode — try DB for default admin user ---
  if (databaseConfigured) {
    try {
      const { query } = await import('@/lib/db');
      const rows = await query(
        `SELECT subscription_tier, subscription_status FROM users WHERE email = $1`,
        ['admin@alecrae.app']
      );
      if (rows.length > 0) {
        const row = rows[0] as { subscription_tier?: string; subscription_status?: string };
        return NextResponse.json({
          plan: (row.subscription_tier as BillingStatus['plan']) || 'free',
          subscriptionStatus: (row.subscription_status as BillingStatus['subscriptionStatus']) || 'none',
          stripeConfigured,
          databaseConfigured,
          voxlenConfigured,
        } satisfies BillingStatus);
      }
    } catch {
      // DB unavailable — fall through to default
    }
  }

  // --- Attempt 3: No DB, no multi-user JWT — default to free ---
  return NextResponse.json({
    plan: 'free',
    subscriptionStatus: 'none',
    stripeConfigured,
    databaseConfigured,
    voxlenConfigured,
  } satisfies BillingStatus);
}
