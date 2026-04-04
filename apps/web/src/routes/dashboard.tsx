import { createSignal, onMount, Show, For } from "solid-js";
import { Button, Card, Badge, Alert } from "@btf/ui";
import { projectStore } from "~/stores/projects.js";
import { uiStore } from "~/stores/ui.js";

export default function Dashboard() {
	const [showCreate, setShowCreate] = createSignal(false);
	const [newProjectName, setNewProjectName] = createSignal("");
	const [newProjectType, setNewProjectType] = createSignal<"website" | "video" | "document">("website");

	onMount(() => {
		projectStore.fetchProjects();
	});

	async function handleCreate() {
		const name = newProjectName().trim();
		if (!name) return;

		try {
			await projectStore.createProject({ name, type: newProjectType() });
			setNewProjectName("");
			setShowCreate(false);
			uiStore.notify("Project created", "success");
		} catch {
			uiStore.notify("Failed to create project", "error");
		}
	}

	return (
		<main class="min-h-screen p-8">
			<div class="mx-auto max-w-6xl">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-zinc-50">Dashboard</h1>
						<p class="mt-1 text-sm text-zinc-400">Manage your AI-powered projects</p>
					</div>
					<Button
						label="New Project"
						variant="primary"
						onClick={() => setShowCreate(true)}
					/>
				</div>

				<Show when={projectStore.error()}>
					<div class="mt-6">
						<Alert
							variant="error"
							message={projectStore.error()!}
							dismissible
						/>
					</div>
				</Show>

				<Show when={showCreate()}>
					<div class="mt-6">
						<Card title="Create New Project" variant="outlined">
							<div class="flex flex-col gap-4">
								<input
									type="text"
									placeholder="Project name..."
									value={newProjectName()}
									onInput={(e) => setNewProjectName(e.currentTarget.value)}
									class="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<div class="flex gap-2">
									<For each={["website", "video", "document"] as const}>
										{(type) => (
											<button
												class={`rounded-md px-4 py-2 text-sm capitalize transition-colors ${
													newProjectType() === type
														? "bg-blue-600 text-white"
														: "border border-zinc-700 text-zinc-400 hover:text-zinc-200"
												}`}
												onClick={() => setNewProjectType(type)}
											>
												{type}
											</button>
										)}
									</For>
								</div>
								<div class="flex gap-2">
									<Button label="Create" variant="primary" onClick={handleCreate} />
									<Button label="Cancel" variant="ghost" onClick={() => setShowCreate(false)} />
								</div>
							</div>
						</Card>
					</div>
				</Show>

				<div class="mt-8">
					<Show
						when={!projectStore.isLoading()}
						fallback={<p class="text-zinc-500">Loading projects...</p>}
					>
						<Show
							when={projectStore.projects().length > 0}
							fallback={
								<div class="text-center py-16">
									<p class="text-xl text-zinc-500">No projects yet</p>
									<p class="mt-2 text-sm text-zinc-600">
										Create your first AI-powered project to get started.
									</p>
								</div>
							}
						>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								<For each={projectStore.projects()}>
									{(project) => (
										<Card variant="default" interactive>
											<div class="flex items-start justify-between">
												<div>
													<h3 class="font-semibold text-zinc-50">{project.name}</h3>
													<p class="mt-1 text-xs text-zinc-500">
														{new Date(project.createdAt).toLocaleDateString()}
													</p>
												</div>
												<div class="flex gap-1.5">
													<Badge
														label={project.type}
														variant="primary"
													/>
													<Badge
														label={project.status}
														variant={project.status === "published" ? "success" : "default"}
													/>
												</div>
											</div>
										</Card>
									)}
								</For>
							</div>
						</Show>
					</Show>
				</div>
			</div>
		</main>
	);
}
