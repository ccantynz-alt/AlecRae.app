/**
 * Register page — create a new account with name, email, password.
 */

import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Input, Card, Alert } from "@btf/ui";
import { trpc } from "~/lib/trpc.js";
import { authStore } from "~/stores/auth.js";

export default function Register() {
	const navigate = useNavigate();

	const [name, setName] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [confirmPassword, setConfirmPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [loading, setLoading] = createSignal(false);

	function validate(): string | null {
		if (!name().trim()) return "Name is required.";
		if (!email().trim()) return "Email is required.";
		if (password().length < 8) return "Password must be at least 8 characters.";
		if (password() !== confirmPassword()) return "Passwords do not match.";
		return null;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		setError(null);

		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);
		try {
			const result = await trpc.auth.register.mutate({
				email: email().trim(),
				name: name().trim(),
				password: password(),
			});

			// Auto-login after successful registration
			authStore.login(result.user, result.token);
			navigate("/dashboard", { replace: true });
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Registration failed. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<main class="flex min-h-screen items-center justify-center p-8">
			<div class="w-full max-w-md">
				<div class="mb-8 text-center">
					<h1 class="text-3xl font-bold text-zinc-50">Create your account</h1>
					<p class="mt-2 text-sm text-zinc-400">
						Join the BTF Platform and start building
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
							type="text"
							label="Name"
							placeholder="Your name"
							required
							fullWidth
							value={name()}
							onInput={setName}
						/>

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
							placeholder="At least 8 characters"
							required
							fullWidth
							value={password()}
							onInput={setPassword}
							error={
								password().length > 0 && password().length < 8
									? "Must be at least 8 characters"
									: undefined
							}
						/>

						<Input
							type="password"
							label="Confirm Password"
							placeholder="Re-enter your password"
							required
							fullWidth
							value={confirmPassword()}
							onInput={setConfirmPassword}
							error={
								confirmPassword().length > 0 && confirmPassword() !== password()
									? "Passwords do not match"
									: undefined
							}
						/>

						<button
							type="submit"
							disabled={loading()}
							class="inline-flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-6 text-base font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
						>
							<Show when={loading()}>
								<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							</Show>
							{loading() ? "Creating account..." : "Create Account"}
						</button>
					</form>

					<div class="mt-6 text-center">
						<p class="text-sm text-zinc-400">
							Already have an account?{" "}
							<a
								href="/login"
								class="font-medium text-blue-400 hover:text-blue-300 transition-colors"
							>
								Sign in
							</a>
						</p>
					</div>
				</Card>
			</div>
		</main>
	);
}
