/**
 * Stripe billing routes — Hono handlers for checkout, portal, webhooks, and status.
 * Signature verification on webhooks. Zod validation on all inputs.
 */

import { Hono } from "hono";
import { z } from "zod";
import Stripe from "stripe";
import { eq, and, sql } from "drizzle-orm";
import { subscriptions, users, aiSessions } from "@btf/db";
import { db } from "../db/client.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
	apiVersion: "2025-03-31.basil",
});

const PLANS = {
	free: { name: "Free", priceMonthly: 0, generations: 100 },
	pro: { name: "Pro", priceMonthly: 2900, generations: 5000 },
	enterprise: { name: "Enterprise", priceMonthly: 9900, generations: -1 },
} as const;

export const stripeRouter = new Hono();

/**
 * POST /billing/checkout — Create a Stripe Checkout session.
 */
stripeRouter.post("/billing/checkout", async (c) => {
	const userId = c.get("userId") as string | null;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json();
	const parsed = z.object({ priceId: z.string().min(1) }).safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	}

	const user = await db.select().from(users).where(eq(users.id, userId)).get();
	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	// Get or create Stripe customer
	let stripeCustomerId: string;
	const existingSub = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.get();

	if (existingSub?.stripeCustomerId) {
		stripeCustomerId = existingSub.stripeCustomerId;
	} else {
		const customer = await stripe.customers.create({
			email: user.email,
			metadata: { userId },
		});
		stripeCustomerId = customer.id;
	}

	const session = await stripe.checkout.sessions.create({
		customer: stripeCustomerId,
		mode: "subscription",
		line_items: [{ price: parsed.data.priceId, quantity: 1 }],
		success_url: `${c.req.header("origin") ?? "http://localhost:3000"}/billing?success=true`,
		cancel_url: `${c.req.header("origin") ?? "http://localhost:3000"}/billing?canceled=true`,
		metadata: { userId },
	});

	return c.json({ url: session.url });
});

/**
 * POST /billing/portal — Create a Stripe Customer Portal session.
 */
stripeRouter.post("/billing/portal", async (c) => {
	const userId = c.get("userId") as string | null;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sub = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.get();

	if (!sub?.stripeCustomerId) {
		return c.json({ error: "No billing account found" }, 404);
	}

	const session = await stripe.billingPortal.sessions.create({
		customer: sub.stripeCustomerId,
		return_url: `${c.req.header("origin") ?? "http://localhost:3000"}/billing`,
	});

	return c.json({ url: session.url });
});

/**
 * POST /billing/webhook — Stripe webhook handler with signature verification.
 */
stripeRouter.post("/billing/webhook", async (c) => {
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		return c.json({ error: "Webhook secret not configured" }, 500);
	}

	const signature = c.req.header("stripe-signature");
	if (!signature) {
		return c.json({ error: "Missing stripe-signature header" }, 400);
	}

	const rawBody = await c.req.text();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: `Webhook signature verification failed: ${message}` }, 400);
	}

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = session.metadata?.userId;
			if (!userId || !session.subscription || !session.customer) break;

			const stripeSubscription = await stripe.subscriptions.retrieve(
				session.subscription as string,
			);

			const now = new Date().toISOString();
			const subData = {
				id: crypto.randomUUID(),
				userId,
				stripeCustomerId: session.customer as string,
				stripeSubscriptionId: stripeSubscription.id,
				stripePriceId: stripeSubscription.items.data[0]?.price.id ?? null,
				status: stripeSubscription.status as typeof subscriptions.$inferInsert.status,
				currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
				currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
				cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
				createdAt: now,
				updatedAt: now,
			};

			// Upsert: delete existing then insert
			await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
			await db.insert(subscriptions).values(subData);
			break;
		}

		case "customer.subscription.updated": {
			const stripeSubscription = event.data.object as Stripe.Subscription;
			const existing = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
				.get();

			if (existing) {
				await db
					.update(subscriptions)
					.set({
						status: stripeSubscription.status as typeof subscriptions.$inferInsert.status,
						stripePriceId: stripeSubscription.items.data[0]?.price.id ?? existing.stripePriceId,
						currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
						currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
						cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));
			}
			break;
		}

		case "customer.subscription.deleted": {
			const stripeSubscription = event.data.object as Stripe.Subscription;
			await db
				.update(subscriptions)
				.set({
					status: "canceled",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));
			break;
		}
	}

	return c.json({ received: true });
});

/**
 * GET /billing/status — Get current user's subscription status.
 */
stripeRouter.get("/billing/status", async (c) => {
	const userId = c.get("userId") as string | null;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sub = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.get();

	if (!sub || sub.status === "canceled") {
		return c.json({
			plan: "free",
			status: "active",
			generationsLimit: PLANS.free.generations,
			stripeCustomerId: sub?.stripeCustomerId ?? null,
		});
	}

	// Determine plan from price
	let plan: keyof typeof PLANS = "free";
	if (sub.stripePriceId) {
		// Match by checking the subscription price against known amounts
		const stripeSub = sub.stripeSubscriptionId
			? await stripe.subscriptions.retrieve(sub.stripeSubscriptionId).catch(() => null)
			: null;
		const amount = stripeSub?.items.data[0]?.price.unit_amount ?? 0;
		if (amount === PLANS.enterprise.priceMonthly) plan = "enterprise";
		else if (amount === PLANS.pro.priceMonthly) plan = "pro";
	}

	return c.json({
		plan,
		status: sub.status,
		currentPeriodEnd: sub.currentPeriodEnd,
		cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
		generationsLimit: PLANS[plan].generations,
		stripeCustomerId: sub.stripeCustomerId,
	});
});
