/**
 * Drizzle schema definitions for Turso/SQLite.
 * All tables defined here are the source of truth for the database.
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	role: text("role", { enum: ["user", "admin", "editor"] }).notNull().default("user"),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const passkeys = sqliteTable("passkeys", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	credentialId: text("credential_id").notNull().unique(),
	publicKey: text("public_key").notNull(),
	counter: integer("counter").notNull().default(0),
	deviceType: text("device_type"),
	backedUp: integer("backed_up", { mode: "boolean" }).default(false),
	transports: text("transports"),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const projects = sqliteTable("projects", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["website", "video", "document"] }).notNull(),
	status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
	metadata: text("metadata", { mode: "json" }),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const aiSessions = sqliteTable("ai_sessions", {
	id: text("id").primaryKey(),
	projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	agentType: text("agent_type").notNull(),
	status: text("status", { enum: ["active", "completed", "failed"] }).notNull().default("active"),
	tokensUsed: integer("tokens_used").default(0),
	computeTier: text("compute_tier", { enum: ["client", "edge", "cloud"] }),
	latencyMs: real("latency_ms"),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	completedAt: text("completed_at"),
});

// --- Billing tables ---

export const prices = sqliteTable("prices", {
	id: text("id").primaryKey(),
	stripeProductId: text("stripe_product_id").notNull(),
	stripePriceId: text("stripe_price_id").notNull().unique(),
	amount: integer("amount").notNull(),
	currency: text("currency").notNull().default("usd"),
	interval: text("interval", { enum: ["month", "year"] }).notNull().default("month"),
	active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const subscriptions = sqliteTable("subscriptions", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	stripeSubscriptionId: text("stripe_subscription_id").unique(),
	stripePriceId: text("stripe_price_id"),
	status: text("status", {
		enum: ["active", "canceled", "incomplete", "incomplete_expired", "past_due", "trialing", "unpaid", "paused"],
	}).notNull().default("active"),
	currentPeriodStart: text("current_period_start"),
	currentPeriodEnd: text("current_period_end"),
	cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});
