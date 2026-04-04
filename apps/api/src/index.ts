/**
 * @btf/api — Hono API server running on Bun.
 * The fastest JavaScript web framework on the fastest JavaScript runtime.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./auth/middleware.js";
import { trpcServer } from "./trpc/server.js";
import { healthRouter } from "./routes/health.js";
import { streamRouter } from "./routes/stream.js";
import { wsRouter } from "./realtime/websocket.js";

const app = new Hono();

app.use("*", logger());
app.use(
	"*",
	cors({
		origin: ["http://localhost:3000", "http://localhost:3001"],
		credentials: true,
	}),
);
app.use("*", authMiddleware);

app.route("/", healthRouter);
app.route("/", streamRouter);
app.route("/", wsRouter);

app.use("/trpc/*", trpcServer);

const port = Number(process.env.PORT ?? 3001);

// biome-ignore lint/suspicious/noConsoleLog: Server startup log
console.log(`BTF API server running on http://localhost:${port}`);

export default {
	port,
	fetch: app.fetch,
};
