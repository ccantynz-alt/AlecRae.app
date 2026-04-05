/**
 * Auth store — signal-based authentication state management.
 * SolidJS signals for reactive, fine-grained auth state.
 */

import { createSignal, createRoot, createEffect } from "solid-js";
import { trpc } from "~/lib/trpc.js";

export interface User {
	id: string;
	email: string;
	name: string;
	role: "user" | "admin" | "editor";
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

function createAuthStore() {
	const [user, setUser] = createSignal<User | null>(null);
	const [token, setToken] = createSignal<string | null>(null);
	const [isLoading, setIsLoading] = createSignal(true);

	createEffect(() => {
		const stored = typeof localStorage !== "undefined" ? localStorage.getItem("btf_token") : null;
		if (stored) {
			setToken(stored);
		}
		setIsLoading(false);
	});

	function login(newUser: User, newToken: string) {
		setUser(newUser);
		setToken(newToken);
		if (typeof localStorage !== "undefined") {
			localStorage.setItem("btf_token", newToken);
		}
	}

	function logout() {
		setUser(null);
		setToken(null);
		if (typeof localStorage !== "undefined") {
			localStorage.removeItem("btf_token");
		}
	}

	/**
	 * Validate the stored token against the server.
	 * Call this on app mount to rehydrate the session.
	 */
	async function checkAuth(): Promise<User | null> {
		const stored = typeof localStorage !== "undefined" ? localStorage.getItem("btf_token") : null;
		if (!stored) {
			setIsLoading(false);
			return null;
		}

		setIsLoading(true);
		try {
			const me = await trpc.auth.me.query();
			if (me) {
				setUser(me);
				setToken(stored);
				return me;
			}
			// Token is invalid / expired — clear it
			logout();
			return null;
		} catch {
			logout();
			return null;
		} finally {
			setIsLoading(false);
		}
	}

	return {
		user,
		token,
		isAuthenticated: () => user() !== null,
		isLoading,
		login,
		logout,
		checkAuth,
	};
}

export const authStore = createRoot(createAuthStore);
