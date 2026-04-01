import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-multi';
import { createPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Look up Stripe customer ID
    const rows = await query(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [currentUser.id]
    );

    const stripeCustomerId = rows[0]?.stripe_customer_id as string | undefined;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alecrae.app';

    const portalUrl = await createPortalSession({
      customerId: stripeCustomerId,
      returnUrl: `${baseUrl}/app`,
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error: unknown) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
