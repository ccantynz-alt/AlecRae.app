import type { Context } from "hono";
import type { AuthSession } from "../auth/passkey.js";

export interface TrpcContext {
	userId: string | null;
	session: AuthSession | null;
}

export function createContext(c: Context): TrpcContext {
	return {
		userId: c.get("userId") ?? null,
		session: c.get("session") ?? null,
	};
}
