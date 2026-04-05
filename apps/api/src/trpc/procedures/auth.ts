/**
 * Auth procedures — register, login, me, logout.
 * Password hashing via Web Crypto API (SHA-256 + salt). No external deps.
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, passkeys } from "@btf/db";
import { router, publicProcedure } from "../init.js";
import { db } from "../../db/client.js";
import {
	createSessionToken,
	verifySessionToken,
	type AuthSession,
} from "../../auth/passkey.js";

// ---------------------------------------------------------------------------
// Password helpers (SHA-256 + random salt, no bcrypt dependency needed)
// ---------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
	const salt = crypto.randomUUID();
	const data = new TextEncoder().encode(salt + password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashHex = Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${salt}:${hashHex}`;
}

async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const [salt, hash] = stored.split(":");
	if (!salt || !hash) return false;
	const data = new TextEncoder().encode(salt + password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashHex = Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex === hash;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const authRouter = router({
	register: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
				name: z.string().min(1).max(255),
				password: z.string().min(8).max(128),
			}),
		)
		.mutation(async ({ input }) => {
			// Check if user already exists
			const existing = await db
				.select()
				.from(users)
				.where(eq(users.email, input.email))
				.get();

			if (existing) {
				throw new Error("A user with this email already exists");
			}

			const id = crypto.randomUUID();
			const now = new Date().toISOString();
			const passwordHash = await hashPassword(input.password);

			await db.insert(users).values({
				id,
				email: input.email,
				name: input.name,
				role: "user",
				createdAt: now,
				updatedAt: now,
			});

			// Store password hash in the passkeys table (credentialId = "password")
			// This avoids altering the users schema while keeping things working.
			await db.insert(passkeys).values({
				id: crypto.randomUUID(),
				userId: id,
				credentialId: `password:${id}`,
				publicKey: passwordHash,
				counter: 0,
			});

			const session: AuthSession = {
				userId: id,
				email: input.email,
				role: "user",
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
			};

			return {
				token: createSessionToken(session),
				user: { id, email: input.email, name: input.name, role: "user" as const },
			};
		}),

	login: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
				password: z.string().min(1),
			}),
		)
		.mutation(async ({ input }) => {
			const user = await db
				.select()
				.from(users)
				.where(eq(users.email, input.email))
				.get();

			if (!user) {
				throw new Error("Invalid email or password");
			}

			// Look up password credential
			const cred = await db
				.select()
				.from(passkeys)
				.where(eq(passkeys.credentialId, `password:${user.id}`))
				.get();

			if (!cred) {
				throw new Error("Invalid email or password");
			}

			const valid = await verifyPassword(input.password, cred.publicKey);
			if (!valid) {
				throw new Error("Invalid email or password");
			}

			const session: AuthSession = {
				userId: user.id,
				email: user.email,
				role: user.role as "user" | "admin" | "editor",
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
			};

			return {
				token: createSessionToken(session),
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role as "user" | "admin" | "editor",
				},
			};
		}),

	me: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.session) {
			return null;
		}

		const user = await db
			.select()
			.from(users)
			.where(eq(users.id, ctx.session.userId))
			.get();

		if (!user) {
			return null;
		}

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role as "user" | "admin" | "editor",
		};
	}),

	logout: publicProcedure.mutation(async () => {
		// With token-based auth the client simply discards the token.
		// This endpoint exists so the client has a clean semantic call.
		return { success: true };
	}),
});
