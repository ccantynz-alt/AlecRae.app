import { type JSX, Show, createSignal } from "solid-js";
import { type AlertProps, AlertSchema } from "@btf/schemas";

export function Alert(rawProps: AlertProps): JSX.Element {
	const validated = AlertSchema.parse(rawProps);
	const [visible, setVisible] = createSignal(true);

	const variantClasses: Record<string, string> = {
		info: "border-blue-800 bg-blue-950/50 text-blue-300",
		success: "border-green-800 bg-green-950/50 text-green-300",
		warning: "border-amber-800 bg-amber-950/50 text-amber-300",
		error: "border-red-800 bg-red-950/50 text-red-300",
	};

	const icons: Record<string, string> = {
		info: "i",
		success: "\u2713",
		warning: "!",
		error: "\u2717",
	};

	return (
		<Show when={visible()}>
			<div class={`flex items-start gap-3 rounded-lg border p-4 ${variantClasses[validated.variant]}`}>
				<span class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
					{icons[validated.variant]}
				</span>
				<div class="flex-1">
					<Show when={validated.title}>
						<p class="font-semibold">{validated.title}</p>
					</Show>
					<p class={`text-sm ${validated.title ? "mt-1 opacity-80" : ""}`}>{validated.message}</p>
				</div>
				<Show when={validated.dismissible}>
					<button
						class="text-current opacity-60 hover:opacity-100"
						onClick={() => setVisible(false)}
					>
						\u2715
					</button>
				</Show>
			</div>
		</Show>
	);
}
