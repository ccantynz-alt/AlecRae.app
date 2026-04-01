import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    dictationsPerMonth: 10,
    features: ['Basic transcription', '3 document modes'],
  },
  pro: {
    name: 'Professional',
    price: 29,
    priceId: 'price_pro_monthly',
    dictationsPerMonth: 500,
    features: [
      'All 12 document modes',
      'Custom vocabulary',
      'Priority processing',
      'Export to .docx',
      'Firm profile',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: 'price_enterprise_monthly',
    dictationsPerMonth: -1, // unlimited
    features: [
      'Unlimited dictations',
      'All Pro features',
      'Multi-user',
      'Team vocabulary',
      'SSO',
      'Admin dashboard',
      'White-label',
      'Priority support',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Create a Stripe Checkout session for upgrading to a paid plan.
 */
export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  planId: 'pro' | 'enterprise';
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const plan = PLANS[params.planId];

  if (!plan.priceId) throw new Error('Plan has no Stripe price ID');

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { userId: params.userId, planId: params.planId },
  };

  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else {
    sessionParams.customer_email = params.customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url || '';
}

/**
 * Create a Stripe Customer Portal session for managing an existing subscription.
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
  return session.url;
}

/**
 * Verify a Stripe webhook signature and parse the event.
 */
export async function verifyWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Retrieve a Stripe subscription by ID.
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Retrieve a Stripe customer by ID.
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  const stripe = getStripe();
  return stripe.customers.retrieve(customerId);
}
