/**
 * Projects store — signal-based project state management.
 * Reactive project list with optimistic updates.
 */

import { createSignal, createRoot } from "solid-js";
import { trpc } from "~/lib/trpc.js";

interface Project {
	id: string;
	name: string;
	description: string | null;
	type: "website" | "video" | "document";
	status: "draft" | "published" | "archived";
	createdAt: string;
}

function createProjectStore() {
	const [projects, setProjects] = createSignal<Project[]>([]);
	const [isLoading, setIsLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	async function fetchProjects() {
		setIsLoading(true);
		setError(null);
		try {
			const result = await trpc.project.list.query();
			setProjects(result.items as Project[]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch projects");
		} finally {
			setIsLoading(false);
		}
	}

	async function createProject(input: { name: string; description?: string; type: "website" | "video" | "document" }) {
		setError(null);
		try {
			const result = await trpc.project.create.mutate(input);
			setProjects((prev) => [
				{
					id: result.id,
					name: result.name,
					description: result.description ?? null,
					type: result.type,
					status: result.status,
					createdAt: result.createdAt,
				},
				...prev,
			]);
			return result;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
			throw err;
		}
	}

	async function deleteProject(id: string) {
		const previous = projects();
		setProjects((prev) => prev.filter((p) => p.id !== id));
		try {
			await trpc.project.delete.mutate({ id });
		} catch (err) {
			setProjects(previous);
			setError(err instanceof Error ? err.message : "Failed to delete project");
			throw err;
		}
	}

	return {
		projects,
		isLoading,
		error,
		fetchProjects,
		createProject,
		deleteProject,
	};
}

export const projectStore = createRoot(createProjectStore);
