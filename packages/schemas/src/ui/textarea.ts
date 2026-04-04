import { z } from "zod";

export const TextareaSchema = z.object({
	label: z.string().optional(),
	placeholder: z.string().optional(),
	rows: z.number().int().min(1).default(4),
	disabled: z.boolean().default(false),
	required: z.boolean().default(false),
	error: z.string().optional(),
	fullWidth: z.boolean().default(false),
	maxLength: z.number().int().optional(),
});

export type TextareaProps = z.infer<typeof TextareaSchema>;
