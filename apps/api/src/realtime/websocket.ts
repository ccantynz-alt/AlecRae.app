/**
 * WebSocket handler for bidirectional real-time communication.
 * Handles collaboration events, cursor presence, and live updates.
 */

import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";

const { upgradeWebSocket } = createBunWebSocket();

export const wsRouter = new Hono();

interface ConnectedClient {
	id: string;
	userId: string | null;
	send: (data: string) => void;
}

const clients = new Map<string, ConnectedClient>();

wsRouter.get(
	"/ws",
	upgradeWebSocket(() => {
		const clientId = crypto.randomUUID();

		return {
			onOpen(_event, ws) {
				clients.set(clientId, {
					id: clientId,
					userId: null,
					send: (data: string) => ws.send(data),
				});

				ws.send(
					JSON.stringify({
						type: "connected",
						clientId,
						connectedClients: clients.size,
					}),
				);
			},

			onMessage(event, ws) {
				try {
					const msg = JSON.parse(String(event.data)) as {
						type: string;
						[key: string]: unknown;
					};

					switch (msg.type) {
						case "cursor": {
							for (const [id, client] of clients) {
								if (id !== clientId) {
									client.send(
										JSON.stringify({
											type: "cursor",
											clientId,
											...msg,
										}),
									);
								}
							}
							break;
						}
						case "ping": {
							ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
							break;
						}
						default: {
							for (const [id, client] of clients) {
								if (id !== clientId) {
									client.send(JSON.stringify({ ...msg, from: clientId }));
								}
							}
						}
					}
				} catch {
					ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
				}
			},

			onClose() {
				clients.delete(clientId);

				for (const client of clients.values()) {
					client.send(
						JSON.stringify({
							type: "disconnected",
							clientId,
							connectedClients: clients.size,
						}),
					);
				}
			},
		};
	}),
);

export function broadcastToAll(data: string): void {
	for (const client of clients.values()) {
		client.send(data);
	}
}

export function getConnectedCount(): number {
	return clients.size;
}
