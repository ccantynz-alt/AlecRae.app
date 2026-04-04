import { z } from "zod";

export const BadgeSchema = z.object({
	label: z.string(),
	variant: z.enum(["default", "primary", "success", "warning", "danger", "outline"]).default("default"),
	size: z.enum(["sm", "md"]).default("sm"),
});

export type BadgeProps = z.infer<typeof BadgeSchema>;
