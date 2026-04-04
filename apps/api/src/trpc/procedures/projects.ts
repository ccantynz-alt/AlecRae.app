/**
 * Project CRUD procedures — wired to Drizzle/Turso.
 * Full type safety from client → tRPC → Drizzle → SQLite.
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { projects } from "@btf/db";
import { router, publicProcedure } from "../init.js";
import { db } from "../../db/client.js";

export const projectRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(100).default(20),
					offset: z.number().min(0).default(0),
					type: z.enum(["website", "video", "document"]).optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const limit = input?.limit ?? 20;
			const offset = input?.offset ?? 0;

			const results = await db
				.select()
				.from(projects)
				.limit(limit)
				.offset(offset)
				.all();

			return { items: results, total: results.length };
		}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const result = await db
				.select()
				.from(projects)
				.where(eq(projects.id, input.id))
				.get();

			if (!result) {
				throw new Error("Project not found");
			}

			return result;
		}),

	create: publicProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				description: z.string().optional(),
				type: z.enum(["website", "video", "document"]),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const id = crypto.randomUUID();
			const now = new Date().toISOString();

			await db.insert(projects).values({
				id,
				name: input.name,
				description: input.description ?? null,
				ownerId: ctx.userId ?? "anonymous",
				type: input.type,
				status: "draft",
				createdAt: now,
				updatedAt: now,
			});

			return { id, ...input, status: "draft" as const, createdAt: now };
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(),
				description: z.string().optional(),
				status: z.enum(["draft", "published", "archived"]).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, ...updates } = input;
			const now = new Date().toISOString();

			await db
				.update(projects)
				.set({ ...updates, updatedAt: now })
				.where(eq(projects.id, id));

			return { id, updated: true };
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			await db.delete(projects).where(eq(projects.id, input.id));
			return { id: input.id, deleted: true };
		}),
});
