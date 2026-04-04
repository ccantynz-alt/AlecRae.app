import type { JSX } from "solid-js";
import { type BadgeProps, BadgeSchema } from "@btf/schemas";

export function Badge(rawProps: BadgeProps): JSX.Element {
	const validated = BadgeSchema.parse(rawProps);

	const variantClasses: Record<string, string> = {
		default: "bg-zinc-800 text-zinc-300",
		primary: "bg-blue-600/20 text-blue-400",
		success: "bg-green-600/20 text-green-400",
		warning: "bg-amber-600/20 text-amber-400",
		danger: "bg-red-600/20 text-red-400",
		outline: "border border-zinc-700 text-zinc-400",
	};

	const sizeClasses: Record<string, string> = {
		sm: "px-2 py-0.5 text-xs",
		md: "px-2.5 py-1 text-sm",
	};

	return (
		<span class={`inline-flex items-center rounded-full font-medium ${variantClasses[validated.variant]} ${sizeClasses[validated.size]}`}>
			{validated.label}
		</span>
	);
}
