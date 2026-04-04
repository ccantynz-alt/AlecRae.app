import { type JSX, splitProps, Show } from "solid-js";
import { type ModalProps, ModalSchema } from "@btf/schemas";

export function Modal(
	rawProps: ModalProps & { open: boolean; onClose?: () => void; children?: JSX.Element },
): JSX.Element {
	const validated = ModalSchema.parse(rawProps);
	const [local] = splitProps(validated, ["title", "description", "size", "closable", "overlay"]);

	const sizeClasses: Record<string, string> = {
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-xl",
		full: "max-w-full mx-4",
	};

	return (
		<Show when={rawProps.open}>
			<div class="fixed inset-0 z-50 flex items-center justify-center">
				<Show when={local.overlay}>
					<div
						class="absolute inset-0 bg-black/60 backdrop-blur-sm"
						onClick={() => local.closable && rawProps.onClose?.()}
					/>
				</Show>
				<div
					class={`relative z-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl ${sizeClasses[local.size]}`}
				>
					<Show when={local.closable}>
						<button
							class="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"
							onClick={() => rawProps.onClose?.()}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</Show>
					<h2 class="text-xl font-semibold text-zinc-50">{local.title}</h2>
					<Show when={local.description}>
						<p class="mt-1 text-sm text-zinc-400">{local.description}</p>
					</Show>
					<div class="mt-4">{rawProps.children}</div>
				</div>
			</div>
		</Show>
	);
}
