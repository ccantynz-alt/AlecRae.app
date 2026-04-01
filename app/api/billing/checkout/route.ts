import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-multi';
import { createCheckoutSession, PLANS } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { planId } = body as { planId?: string };

    if (!planId || (planId !== 'pro' && planId !== 'enterprise')) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "enterprise".' },
        { status: 400 }
      );
    }

    // Look up existing Stripe customer ID
    const rows = await query(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [currentUser.id]
    );
    const stripeCustomerId = rows[0]?.stripe_customer_id as string | undefined;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alecrae.app';

    const checkoutUrl = await createCheckoutSession({
      customerId: stripeCustomerId || undefined,
      customerEmail: currentUser.email,
      planId,
      userId: currentUser.id,
      successUrl: `${baseUrl}/app?billing=success`,
      cancelUrl: `${baseUrl}/app?billing=cancelled`,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
