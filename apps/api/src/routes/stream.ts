/**
 * SSE streaming endpoint for AI responses.
 */

import { Hono } from "hono";
import { createSSEStream, type SSEEvent } from "../realtime/sse.js";

export const streamRouter = new Hono();

streamRouter.get("/stream/ai", (c) => {
	return createSSEStream(c, async function* (): AsyncGenerator<SSEEvent> {
		yield {
			event: "start",
			data: JSON.stringify({ status: "streaming", model: "pending" }),
		};

		yield {
			event: "token",
			data: JSON.stringify({ token: "AI streaming endpoint ready. Configure API keys to enable.", done: false }),
		};

		yield {
			event: "done",
			data: JSON.stringify({ done: true, tokensUsed: 0 }),
		};
	});
});

streamRouter.get("/stream/events", (c) => {
	return createSSEStream(c, async function* (): AsyncGenerator<SSEEvent> {
		yield {
			event: "connected",
			data: JSON.stringify({ timestamp: Date.now() }),
		};

		let count = 0;
		while (count < 60) {
			await new Promise((resolve) => setTimeout(resolve, 15000));
			count++;
			yield {
				event: "heartbeat",
				data: JSON.stringify({ timestamp: Date.now(), count }),
			};
		}
	});
});
