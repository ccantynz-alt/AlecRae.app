/**
 * User procedures — CRUD wired to Drizzle/Turso.
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "@btf/db";
import { router, publicProcedure } from "../init.js";
import { db } from "../../db/client.js";

export const userRouter = router({
	me: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) {
			return null;
		}
		return db.select().from(users).where(eq(users.id, ctx.userId)).get();
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const user = await db.select().from(users).where(eq(users.id, input.id)).get();
			if (!user) {
				throw new Error("User not found");
			}
			return user;
		}),

	create: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
				name: z.string().min(1).max(255),
			}),
		)
		.mutation(async ({ input }) => {
			const id = crypto.randomUUID();
			const now = new Date().toISOString();

			await db.insert(users).values({
				id,
				email: input.email,
				name: input.name,
				role: "user",
				createdAt: now,
				updatedAt: now,
			});

			return { id, ...input, role: "user" as const };
		}),

	updateRole: publicProcedure
		.input(
			z.object({
				id: z.string(),
				role: z.enum(["user", "admin", "editor"]),
			}),
		)
		.mutation(async ({ input }) => {
			await db
				.update(users)
				.set({ role: input.role, updatedAt: new Date().toISOString() })
				.where(eq(users.id, input.id));
			return { id: input.id, role: input.role };
		}),
});
