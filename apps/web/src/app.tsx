import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, Show, onMount } from "solid-js";
import { Notifications } from "./components/Notifications.js";
import { authStore } from "./stores/auth.js";
import "./app.css";

export default function App() {
	return (
		<Router
			root={(props) => {
				onMount(() => {
					authStore.checkAuth();
				});

				return (
					<>
						<nav class="fixed top-0 z-40 flex w-full items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-3 backdrop-blur-md">
							<a href="/" class="text-lg font-bold text-zinc-50">
								BTF <span class="text-blue-500">Platform</span>
							</a>
							<div class="flex items-center gap-4">
								<a href="/dashboard" class="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
									Dashboard
								</a>
								<a href="/ai" class="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
									AI
								</a>
								<a href="/collab" class="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
									Collaborate
								</a>
								<a href="/settings" class="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
									Settings
								</a>
								<Show
									when={authStore.isAuthenticated()}
									fallback={
										<a href="/login" class="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300">
											Sign In
										</a>
									}
								>
									<span class="text-sm text-zinc-400">
										{authStore.user()?.name}
									</span>
									<button
										class="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
										onClick={() => {
											authStore.logout();
											window.location.href = "/login";
										}}
									>
										Sign Out
									</button>
								</Show>
							</div>
						</nav>
						<div class="pt-14">
							<Suspense>{props.children}</Suspense>
						</div>
						<Notifications />
					</>
				);
			}}
		>
			<FileRoutes />
		</Router>
	);
}
