import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyWebhookEvent } from '@/lib/stripe';
import Stripe from 'stripe';

/**
 * POST /api/billing/webhook — Handle Stripe webhook events.
 * This route does NOT require JWT auth — it uses Stripe signature verification instead.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const event = await verifyWebhookEvent(body, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && planId) {
          await query(
            `UPDATE users
             SET subscription_tier = $1,
                 subscription_status = 'active',
                 stripe_customer_id = $2,
                 stripe_subscription_id = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [planId, customerId, subscriptionId, userId]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Map Stripe status to our tier
        let subscriptionStatus: string;
        if (status === 'active' || status === 'trialing') {
          subscriptionStatus = 'active';
        } else if (status === 'past_due') {
          subscriptionStatus = 'past_due';
        } else {
          subscriptionStatus = 'inactive';
        }

        await query(
          `UPDATE users
           SET subscription_status = $1,
               stripe_subscription_id = $2,
               updated_at = NOW()
           WHERE stripe_customer_id = $3`,
          [subscriptionStatus, subscription.id, customerId]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await query(
          `UPDATE users
           SET subscription_tier = 'free',
               subscription_status = 'cancelled',
               stripe_subscription_id = NULL,
               updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [customerId]
        );
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
