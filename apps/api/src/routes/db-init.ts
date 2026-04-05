/**
 * Database initialization routes — creates all tables and reports status.
 * Protected: only available in development or with admin authentication.
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { sql } from "drizzle-orm";
import { users, passkeys, projects, aiSessions, prices, subscriptions } from "@btf/db";

export const dbInitRouter = new Hono();

/**
 * Guard: only allow in development or with admin auth header.
 */
dbInitRouter.use("*", async (c, next) => {
	const isDev = process.env.NODE_ENV !== "production";
	const adminToken = c.req.header("x-admin-token");
	const expectedToken = process.env.ADMIN_TOKEN;

	if (!isDev && adminToken !== expectedToken) {
		return c.json({ error: "Forbidden — db-init routes require development mode or admin auth" }, 403);
	}

	await next();
});

/**
 * GET /db/init — Run CREATE TABLE IF NOT EXISTS for all Drizzle tables.
 */
dbInitRouter.get("/db/init", async (c) => {
	const results: Array<{ table: string; status: string }> = [];

	const tableStatements: Array<{ name: string; sql: string }> = [
		{
			name: "users",
			sql: `CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				email TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL,
				role TEXT NOT NULL DEFAULT 'user',
				created_at TEXT NOT NULL DEFAULT (current_timestamp),
				updated_at TEXT NOT NULL DEFAULT (current_timestamp)
			)`,
		},
		{
			name: "passkeys",
			sql: `CREATE TABLE IF NOT EXISTS passkeys (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				credential_id TEXT NOT NULL UNIQUE,
				public_key TEXT NOT NULL,
				counter INTEGER NOT NULL DEFAULT 0,
				device_type TEXT,
				backed_up INTEGER DEFAULT 0,
				transports TEXT,
				created_at TEXT NOT NULL DEFAULT (current_timestamp)
			)`,
		},
		{
			name: "projects",
			sql: `CREATE TABLE IF NOT EXISTS projects (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				description TEXT,
				owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				type TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'draft',
				metadata TEXT,
				created_at TEXT NOT NULL DEFAULT (current_timestamp),
				updated_at TEXT NOT NULL DEFAULT (current_timestamp)
			)`,
		},
		{
			name: "ai_sessions",
			sql: `CREATE TABLE IF NOT EXISTS ai_sessions (
				id TEXT PRIMARY KEY,
				project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				agent_type TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'active',
				tokens_used INTEGER DEFAULT 0,
				compute_tier TEXT,
				latency_ms REAL,
				created_at TEXT NOT NULL DEFAULT (current_timestamp),
				completed_at TEXT
			)`,
		},
		{
			name: "prices",
			sql: `CREATE TABLE IF NOT EXISTS prices (
				id TEXT PRIMARY KEY,
				stripe_product_id TEXT NOT NULL,
				stripe_price_id TEXT NOT NULL UNIQUE,
				amount INTEGER NOT NULL,
				currency TEXT NOT NULL DEFAULT 'usd',
				interval TEXT NOT NULL DEFAULT 'month',
				active INTEGER NOT NULL DEFAULT 1
			)`,
		},
		{
			name: "subscriptions",
			sql: `CREATE TABLE IF NOT EXISTS subscriptions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				stripe_customer_id TEXT NOT NULL,
				stripe_subscription_id TEXT UNIQUE,
				stripe_price_id TEXT,
				status TEXT NOT NULL DEFAULT 'active',
				current_period_start TEXT,
				current_period_end TEXT,
				cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
				created_at TEXT NOT NULL DEFAULT (current_timestamp),
				updated_at TEXT NOT NULL DEFAULT (current_timestamp)
			)`,
		},
	];

	for (const stmt of tableStatements) {
		try {
			await db.run(sql.raw(stmt.sql));
			results.push({ table: stmt.name, status: "ok" });
		} catch (err) {
			results.push({ table: stmt.name, status: `error: ${err instanceof Error ? err.message : String(err)}` });
		}
	}

	return c.json({
		message: "Database initialization complete",
		tables: results,
		timestamp: new Date().toISOString(),
	});
});

/**
 * GET /db/status — Returns list of tables and row counts.
 */
dbInitRouter.get("/db/status", async (c) => {
	const tableNames = ["users", "passkeys", "projects", "ai_sessions", "prices", "subscriptions"];
	const status: Array<{ table: string; rowCount: number }> = [];

	for (const table of tableNames) {
		try {
			const result = await db.get<{ count: number }>(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
			status.push({ table, rowCount: result?.count ?? 0 });
		} catch {
			status.push({ table, rowCount: -1 });
		}
	}

	return c.json({
		tables: status,
		timestamp: new Date().toISOString(),
	});
});
