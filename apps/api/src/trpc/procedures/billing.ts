/**
 * Billing tRPC procedures — type-safe billing operations.
 * Plans, subscriptions, portal, and AI usage stats.
 */

import { z } from "zod";
import { eq, and, gte, sql } from "drizzle-orm";
import Stripe from "stripe";
import { subscriptions, aiSessions, users } from "@btf/db";
import { router, publicProcedure } from "../init.js";
import { db } from "../../db/client.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
	apiVersion: "2025-03-31.basil",
});

const PLANS = [
	{
		id: "free" as const,
		name: "Free",
		description: "Get started with AI generation",
		priceMonthly: 0,
		generations: 100,
		features: ["100 AI generations/month", "Basic templates", "Community support"],
	},
	{
		id: "pro" as const,
		name: "Pro",
		description: "For professionals and growing teams",
		priceMonthly: 2900,
		generations: 5000,
		features: ["5,000 AI generations/month", "Priority templates", "Email support", "Custom branding"],
	},
	{
		id: "enterprise" as const,
		name: "Enterprise",
		description: "Unlimited power for large teams",
		priceMonthly: 9900,
		generations: -1,
		features: ["Unlimited AI generations", "All templates", "Priority support", "Custom branding", "API access", "SSO"],
	},
] as const;

type PlanId = (typeof PLANS)[number]["id"];

function getPlanByAmount(amount: number): PlanId {
	if (amount === 9900) return "enterprise";
	if (amount === 2900) return "pro";
	return "free";
}

export const billingRouter = router({
	/**
	 * List available plans.
	 */
	plans: publicProcedure.query(() => {
		return { plans: PLANS };
	}),

	/**
	 * Create a Stripe Checkout session for subscribing to a plan.
	 */
	subscribe: publicProcedure
		.input(
			z.object({
				priceId: z.string().min(1, "Stripe price ID is required"),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.userId) {
				throw new Error("Unauthorized: must be logged in to subscribe");
			}

			const user = await db.select().from(users).where(eq(users.id, ctx.userId)).get();
			if (!user) {
				throw new Error("User not found");
			}

			// Get or create Stripe customer
			let stripeCustomerId: string;
			const existingSub = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.userId, ctx.userId))
				.get();

			if (existingSub?.stripeCustomerId) {
				stripeCustomerId = existingSub.stripeCustomerId;
			} else {
				const customer = await stripe.customers.create({
					email: user.email,
					metadata: { userId: ctx.userId },
				});
				stripeCustomerId = customer.id;
			}

			const session = await stripe.checkout.sessions.create({
				customer: stripeCustomerId,
				mode: "subscription",
				line_items: [{ price: input.priceId, quantity: 1 }],
				success_url: "http://localhost:3000/billing?success=true",
				cancel_url: "http://localhost:3000/billing?canceled=true",
				metadata: { userId: ctx.userId },
			});

			return { url: session.url };
		}),

	/**
	 * Create a Stripe Customer Portal session.
	 */
	portal: publicProcedure.mutation(async ({ ctx }) => {
		if (!ctx.userId) {
			throw new Error("Unauthorized: must be logged in");
		}

		const sub = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, ctx.userId))
			.get();

		if (!sub?.stripeCustomerId) {
			throw new Error("No billing account found. Subscribe to a plan first.");
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: sub.stripeCustomerId,
			return_url: "http://localhost:3000/billing",
		});

		return { url: session.url };
	}),

	/**
	 * Get the current user's subscription status.
	 */
	status: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) {
			return {
				plan: "free" as PlanId,
				status: "active" as const,
				generationsLimit: 100,
				stripeCustomerId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
			};
		}

		const sub = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, ctx.userId))
			.get();

		if (!sub || sub.status === "canceled") {
			return {
				plan: "free" as PlanId,
				status: "active" as const,
				generationsLimit: 100,
				stripeCustomerId: sub?.stripeCustomerId ?? null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
			};
		}

		// Determine plan from Stripe subscription price amount
		let plan: PlanId = "free";
		if (sub.stripeSubscriptionId) {
			const stripeSub = await stripe.subscriptions
				.retrieve(sub.stripeSubscriptionId)
				.catch(() => null);
			const amount = stripeSub?.items.data[0]?.price.unit_amount ?? 0;
			plan = getPlanByAmount(amount);
		}

		const planConfig = PLANS.find((p) => p.id === plan) ?? PLANS[0];

		return {
			plan,
			status: sub.status,
			generationsLimit: planConfig.generations,
			stripeCustomerId: sub.stripeCustomerId,
			currentPeriodEnd: sub.currentPeriodEnd,
			cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
		};
	}),

	/**
	 * Get AI usage statistics for the current billing period.
	 */
	usage: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) {
			return {
				generationsUsed: 0,
				generationsLimit: 100,
				periodStart: null,
				periodEnd: null,
			};
		}

		// Get subscription to determine period and limits
		const sub = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, ctx.userId))
			.get();

		let generationsLimit = 100;
		let periodStart: string;
		let periodEnd: string;

		if (sub && sub.status !== "canceled" && sub.currentPeriodStart && sub.currentPeriodEnd) {
			periodStart = sub.currentPeriodStart;
			periodEnd = sub.currentPeriodEnd;

			// Determine plan for limits
			if (sub.stripeSubscriptionId) {
				const stripeSub = await stripe.subscriptions
					.retrieve(sub.stripeSubscriptionId)
					.catch(() => null);
				const amount = stripeSub?.items.data[0]?.price.unit_amount ?? 0;
				const plan = getPlanByAmount(amount);
				const planConfig = PLANS.find((p) => p.id === plan) ?? PLANS[0];
				generationsLimit = planConfig.generations;
			}
		} else {
			// Free tier: use calendar month
			const now = new Date();
			periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
			periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
		}

		// Count completed AI sessions in the current period
		const usageResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(aiSessions)
			.where(
				and(
					eq(aiSessions.userId, ctx.userId),
					eq(aiSessions.status, "completed"),
					gte(aiSessions.createdAt, periodStart),
				),
			)
			.get();

		const generationsUsed = usageResult?.count ?? 0;

		return {
			generationsUsed,
			generationsLimit,
			periodStart,
			periodEnd,
		};
	}),
});
