/**
 * Database client singleton for the API server.
 * Creates a Drizzle instance connected to Turso/libsql.
 */

import { createDatabase } from "@btf/db";

export const db = createDatabase({
	url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
	authToken: process.env.TURSO_AUTH_TOKEN,
});
