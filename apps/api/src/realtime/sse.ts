/**
 * Server-Sent Events (SSE) handler for AI streaming responses.
 * All AI responses are streamed — never block on a full response.
 */

import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

export interface SSEEvent {
	event?: string;
	data: string;
	id?: string;
	retry?: number;
}

export function createSSEStream(c: Context, generator: () => AsyncGenerator<SSEEvent>) {
	return streamSSE(c, async (stream) => {
		const gen = generator();
		for await (const event of gen) {
			await stream.writeSSE({
				event: event.event ?? "message",
				data: event.data,
				id: event.id,
				retry: event.retry,
			});
		}
	});
}

export async function* heartbeatGenerator(intervalMs = 15000): AsyncGenerator<SSEEvent> {
	while (true) {
		yield {
			event: "heartbeat",
			data: JSON.stringify({ timestamp: Date.now() }),
		};
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}
