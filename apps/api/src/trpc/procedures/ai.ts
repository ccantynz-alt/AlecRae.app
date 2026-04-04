/**
 * AI procedures — three-tier compute, streaming, and agent orchestration.
 */

import { z } from "zod";
import { router, publicProcedure } from "../init.js";

export const aiRouter = router({
	computeTier: publicProcedure.query(() => {
		return { tier: "edge" as const, available: true };
	}),

	generate: publicProcedure
		.input(
			z.object({
				prompt: z.string().min(1).max(10000),
				model: z.string().default("gpt-4o-mini"),
				maxTokens: z.number().int().min(1).max(4096).default(1024),
				temperature: z.number().min(0).max(2).default(0.7),
			}),
		)
		.mutation(async ({ input }) => {
			return {
				id: crypto.randomUUID(),
				prompt: input.prompt,
				model: input.model,
				status: "queued" as const,
				message: "AI generation will be available once API keys are configured.",
			};
		}),

	siteBuilder: router({
		generatePage: publicProcedure
			.input(
				z.object({
					description: z.string().min(1).max(5000),
					style: z.enum(["minimal", "corporate", "creative", "landing"]).default("minimal"),
					components: z.array(z.string()).optional(),
				}),
			)
			.mutation(async ({ input }) => {
				return {
					id: crypto.randomUUID(),
					status: "queued" as const,
					description: input.description,
					style: input.style,
					message: "Site builder agent will generate page layout from component catalog.",
				};
			}),

		suggestComponents: publicProcedure
			.input(z.object({ description: z.string().min(1) }))
			.query(({ input }) => {
				return {
					suggestions: [
						{ component: "Button", reason: "Primary call-to-action" },
						{ component: "Card", reason: "Content container" },
						{ component: "Input", reason: "User input field" },
					],
					description: input.description,
				};
			}),
	}),
});
