/**
 * tRPC client — end-to-end type-safe API calls from SolidStart to Hono.
 * Change a type on the server, see the error here instantly.
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../api/src/trpc/router.js";

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: getApiUrl(),
			transformer: superjson,
			headers() {
				const token =
					typeof localStorage !== "undefined"
						? localStorage.getItem("btf_token")
						: null;
				return token ? { Authorization: `Bearer ${token}` } : {};
			},
		}),
	],
});

function getApiUrl(): string {
	if (typeof window !== "undefined") {
		return `${window.location.protocol}//${window.location.hostname}:3001/trpc`;
	}
	return "http://localhost:3001/trpc";
}
