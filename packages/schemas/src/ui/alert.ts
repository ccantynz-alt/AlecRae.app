import { z } from "zod";

export const AlertSchema = z.object({
	title: z.string().optional(),
	message: z.string(),
	variant: z.enum(["info", "success", "warning", "error"]).default("info"),
	dismissible: z.boolean().default(false),
});

export type AlertProps = z.infer<typeof AlertSchema>;
