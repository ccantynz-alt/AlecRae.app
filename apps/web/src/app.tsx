import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Notifications } from "./components/Notifications.js";
import "./app.css";

export default function App() {
	return (
		<Router
			root={(props) => (
				<>
					<nav class="fixed top-0 z-40 flex w-full items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-3 backdrop-blur-md">
						<a href="/" class="text-lg font-bold text-zinc-50">
							BTF <span class="text-blue-500">Platform</span>
						</a>
						<div class="flex items-center gap-4">
							<a href="/dashboard" class="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
								Dashboard
							</a>
						</div>
					</nav>
					<div class="pt-14">
						<Suspense>{props.children}</Suspense>
					</div>
					<Notifications />
				</>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
