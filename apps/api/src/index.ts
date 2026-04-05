/**
 * @btf/api — Hono API server running on Bun.
 * The fastest JavaScript web framework on the fastest JavaScript runtime.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./auth/middleware.js";
import { securityHeaders, requestId, rateLimit } from "./routes/security.js";
import { trpcServer } from "./trpc/server.js";
import { healthRouter } from "./routes/health.js";
import { streamRouter } from "./routes/stream.js";
import { stripeRouter } from "./routes/stripe.js";
import { wsRouter } from "./realtime/websocket.js";
import { dbInitRouter } from "./routes/db-init.js";

const app = new Hono();

// Core middleware
app.use("*", requestId);
app.use("*", logger());
app.use("*", securityHeaders);
app.use(
	"*",
	cors({
		origin: ["http://localhost:3000", "http://localhost:3001"],
		credentials: true,
	}),
);

// Rate limiting on public endpoints
app.use("/trpc/*", rateLimit({ windowMs: 60_000, maxRequests: 100 }));
app.use("/stream/*", rateLimit({ windowMs: 60_000, maxRequests: 20 }));

// Auth
app.use("*", authMiddleware);

// Routes
app.route("/", healthRouter);
app.route("/", streamRouter);
app.route("/", stripeRouter);
app.route("/", wsRouter);
app.route("/", dbInitRouter);

// tRPC
app.use("/trpc/*", trpcServer);

const port = Number(process.env.PORT ?? 3001);

// biome-ignore lint/suspicious/noConsoleLog: Server startup log
console.log(`BTF API server running on http://localhost:${port}`);

export default {
	port,
	fetch: app.fetch,
};
