/**
 * UI store — global UI state signals.
 * Theme, sidebar, modals, notifications — all reactive.
 */

import { createSignal, createRoot } from "solid-js";

export interface Notification {
	id: string;
	message: string;
	type: "info" | "success" | "warning" | "error";
	duration?: number;
}

function createUIStore() {
	const [sidebarOpen, setSidebarOpen] = createSignal(true);
	const [theme, setTheme] = createSignal<"dark" | "light">("dark");
	const [notifications, setNotifications] = createSignal<Notification[]>([]);

	function toggleSidebar() {
		setSidebarOpen((prev) => !prev);
	}

	function toggleTheme() {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	}

	function notify(message: string, type: Notification["type"] = "info", duration = 5000) {
		const id = crypto.randomUUID();
		setNotifications((prev) => [...prev, { id, message, type, duration }]);

		if (duration > 0) {
			setTimeout(() => {
				dismissNotification(id);
			}, duration);
		}

		return id;
	}

	function dismissNotification(id: string) {
		setNotifications((prev) => prev.filter((n) => n.id !== id));
	}

	return {
		sidebarOpen,
		setSidebarOpen,
		toggleSidebar,
		theme,
		setTheme,
		toggleTheme,
		notifications,
		notify,
		dismissNotification,
	};
}

export const uiStore = createRoot(createUIStore);
