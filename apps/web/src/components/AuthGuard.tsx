/**
 * AuthGuard — protects routes that require authentication.
 * Checks auth state, redirects to /login if unauthenticated.
 */

import { type JSX, Show, onMount, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { authStore } from "~/stores/auth.js";

interface AuthGuardProps {
	children: JSX.Element;
}

export function AuthGuard(props: AuthGuardProps): JSX.Element {
	const navigate = useNavigate();
	const [checked, setChecked] = createSignal(false);

	onMount(async () => {
		// If we already have a user in the store, we're good
		if (authStore.isAuthenticated()) {
			setChecked(true);
			return;
		}

		// Try to rehydrate session from stored token
		const user = await authStore.checkAuth();
		if (!user) {
			navigate("/login", { replace: true });
			return;
		}
		setChecked(true);
	});

	return (
		<Show
			when={checked() && authStore.isAuthenticated()}
			fallback={
				<div class="flex min-h-screen items-center justify-center">
					<div class="flex flex-col items-center gap-3">
						<span class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
						<p class="text-sm text-zinc-400">Verifying session...</p>
					</div>
				</div>
			}
		>
			{props.children}
		</Show>
	);
}
