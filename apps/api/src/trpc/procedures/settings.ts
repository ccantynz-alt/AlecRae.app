/**
 * Settings procedures — profile, API keys, and usage stats.
 */

import { z } from "zod";
import { eq, sql, count, sum } from "drizzle-orm";
import { users, subscriptions, aiSessions } from "@btf/db";
import { router, publicProcedure } from "../init.js";
import { db } from "../../db/client.js";

/**
 * Masks an API key, showing only the first 8 and last 4 characters.
 */
function maskApiKey(key: string): string {
	if (key.length <= 12) return "****";
	return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

/**
 * Generates a new API key with the btf_ prefix.
 */
function generateApiKey(): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let key = "btf_";
	for (let i = 0; i < 48; i++) {
		key += chars[Math.floor(Math.random() * chars.length)];
	}
	return key;
}

export const settingsRouter = router({
	getProfile: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) {
			throw new Error("Not authenticated");
		}
		const user = await db.select().from(users).where(eq(users.id, ctx.userId)).get();
		if (!user) {
			throw new Error("User not found");
		}
		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt,
		};
	}),

	updateProfile: publicProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255).optional(),
				email: z.string().email().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.userId) {
				throw new Error("Not authenticated");
			}

			const updates: Record<string, string> = {
				updatedAt: new Date().toISOString(),
			};
			if (input.name !== undefined) updates.name = input.name;
			if (input.email !== undefined) updates.email = input.email;

			await db.update(users).set(updates).where(eq(users.id, ctx.userId));

			return { success: true };
		}),

	getApiKey: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) {
			throw new Error("Not authenticated");
		}

		// In a real system, API keys would be stored in a dedicated table.
		// For now we derive a deterministic masked representation.
		const user = await db.select().from(users).where(eq(users.id, ctx.userId)).get();
		if (!user) {
			throw new Error("User not found");
		}

		// Simulate stored key — in production, pull from an api_keys table
		const storedKey = `btf_${user.id.replace(/-/g, "").slice(0, 48)}`;
		return {
			maskedKey: maskApiKey(storedKey),
			createdAt: user.createdAt,
		};
	}),

	regenerateApiKey: publicProcedure.mutation(async ({ ctx }) => {
		if (!ctx.userId) {
			throw new Error("Not authenticated");
		}

		const newKey = generateApiKey();

		// In production, store hashed key in an api_keys table.
		// Return the full key only on regeneration — user must copy it now.
		return {
			apiKey: newKey,
			maskedKey: maskApiKey(newKey),
			createdAt: new Date().toISOString(),
		};
	}),

	getUsage: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) {
			throw new Error("Not authenticated");
		}

		const sessions = await db
			.select({
				totalSessions: count(),
				totalTokens: sum(aiSessions.tokensUsed),
			})
			.from(aiSessions)
			.where(eq(aiSessions.userId, ctx.userId))
			.get();

		const subscription = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, ctx.userId))
			.get();

		return {
			tokensUsed: Number(sessions?.totalTokens ?? 0),
			generationsCount: Number(sessions?.totalSessions ?? 0),
			plan: subscription?.status === "active" ? "pro" : "free",
			currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
		};
	}),
});
