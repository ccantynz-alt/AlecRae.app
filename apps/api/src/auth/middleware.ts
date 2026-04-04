/**
 * Auth middleware for Hono — extracts session from Authorization header.
 */

import { createMiddleware } from "hono/factory";
import { verifySessionToken, type AuthSession } from "./passkey.js";

declare module "hono" {
	interface ContextVariableMap {
		session: AuthSession | null;
		userId: string | null;
	}
}

export const authMiddleware = createMiddleware(async (c, next) => {
	const authHeader = c.req.header("Authorization");
	let session: AuthSession | null = null;

	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		session = verifySessionToken(token);
	}

	c.set("session", session);
	c.set("userId", session?.userId ?? null);
	await next();
});
