/**
 * Global notification overlay — renders notifications from the UI store.
 */

import { For, Show } from "solid-js";
import { Alert } from "@btf/ui";
import { uiStore } from "~/stores/ui.js";

export function Notifications() {
	return (
		<Show when={uiStore.notifications().length > 0}>
			<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
				<For each={uiStore.notifications()}>
					{(notification) => (
						<Alert
							variant={notification.type}
							message={notification.message}
							dismissible
						/>
					)}
				</For>
			</div>
		</Show>
	);
}
