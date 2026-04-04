import { type JSX, splitProps, Show, For } from "solid-js";
import { type SelectProps, SelectSchema } from "@btf/schemas";

export function Select(
	rawProps: SelectProps & { value?: string; onChange?: (value: string) => void },
): JSX.Element {
	const validated = SelectSchema.parse(rawProps);
	const [local] = splitProps(validated, [
		"label",
		"placeholder",
		"options",
		"disabled",
		"required",
		"error",
		"fullWidth",
	]);

	return (
		<div class={`flex flex-col gap-1.5 ${local.fullWidth ? "w-full" : ""}`}>
			<Show when={local.label}>
				<label class="text-sm font-medium text-zinc-200">
					{local.label}
					<Show when={local.required}>
						<span class="ml-1 text-red-500">*</span>
					</Show>
				</label>
			</Show>
			<select
				disabled={local.disabled}
				required={local.required}
				value={rawProps.value ?? ""}
				onChange={(e) => rawProps.onChange?.(e.currentTarget.value)}
				class={`h-10 rounded-md border bg-zinc-950 px-3 text-sm text-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
					local.error ? "border-red-500" : "border-zinc-800"
				}`}
			>
				<Show when={local.placeholder}>
					<option value="" disabled>
						{local.placeholder}
					</option>
				</Show>
				<For each={local.options}>
					{(opt) => <option value={opt.value}>{opt.label}</option>}
				</For>
			</select>
			<Show when={local.error}>
				<p class="text-xs text-red-500">{local.error}</p>
			</Show>
		</div>
	);
}
