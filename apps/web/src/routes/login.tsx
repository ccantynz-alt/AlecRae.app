/**
 * Login page — email + password authentication.
 */

import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Input, Card, Alert } from "@btf/ui";
import { trpc } from "~/lib/trpc.js";
import { authStore } from "~/stores/auth.js";

export default function Login() {
	const navigate = useNavigate();

	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [loading, setLoading] = createSignal(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		setError(null);

		if (!email().trim() || !password().trim()) {
			setError("Email and password are required.");
			return;
		}

		setLoading(true);
		try {
			const result = await trpc.auth.login.mutate({
				email: email().trim(),
				password: password(),
			});

			authStore.login(result.user, result.token);
			navigate("/dashboard", { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main class="flex min-h-screen items-center justify-center p-8">
			<div class="w-full max-w-md">
				<div class="mb-8 text-center">
					<h1 class="text-3xl font-bold text-zinc-50">Welcome back</h1>
					<p class="mt-2 text-sm text-zinc-400">
						Sign in to your BTF Platform account
					</p>
				</div>

				<Card variant="outlined" padding="lg">
					<Show when={error()}>
						<div class="mb-4">
							<Alert variant="error" message={error()!} dismissible />
						</div>
					</Show>

					<form onSubmit={handleSubmit} class="flex flex-col gap-5">
						<Input
							type="email"
							label="Email"
							placeholder="you@example.com"
							required
							fullWidth
							value={email()}
							onInput={setEmail}
						/>

						<Input
							type="password"
							label="Password"
							placeholder="Enter your password"
							required
							fullWidth
							value={password()}
							onInput={setPassword}
						/>

						<button
							type="submit"
							disabled={loading()}
							class="inline-flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-6 text-base font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
						>
							<Show when={loading()}>
								<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							</Show>
							{loading() ? "Signing in..." : "Sign In"}
						</button>
					</form>

					<div class="mt-6 text-center">
						<p class="text-sm text-zinc-400">
							Don't have an account?{" "}
							<a
								href="/register"
								class="font-medium text-blue-400 hover:text-blue-300 transition-colors"
							>
								Create one
							</a>
						</p>
					</div>
				</Card>
			</div>
		</main>
	);
}
