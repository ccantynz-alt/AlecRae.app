import { type JSX, splitProps, Show } from "solid-js";
import { type TextareaProps, TextareaSchema } from "@btf/schemas";

export function Textarea(
	rawProps: TextareaProps & { value?: string; onInput?: (value: string) => void },
): JSX.Element {
	const validated = TextareaSchema.parse(rawProps);
	const [local] = splitProps(validated, [
		"label",
		"placeholder",
		"rows",
		"disabled",
		"required",
		"error",
		"fullWidth",
		"maxLength",
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
			<textarea
				placeholder={local.placeholder}
				rows={local.rows}
				disabled={local.disabled}
				required={local.required}
				maxLength={local.maxLength}
				value={rawProps.value ?? ""}
				onInput={(e) => rawProps.onInput?.(e.currentTarget.value)}
				class={`rounded-md border bg-zinc-950 px-3 py-2 text-sm text-zinc-50 transition-colors placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y ${
					local.error ? "border-red-500" : "border-zinc-800"
				}`}
			/>
			<Show when={local.error}>
				<p class="text-xs text-red-500">{local.error}</p>
			</Show>
		</div>
	);
}
