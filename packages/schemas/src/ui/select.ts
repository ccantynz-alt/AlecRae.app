import { z } from "zod";

export const SelectSchema = z.object({
	label: z.string().optional(),
	placeholder: z.string().optional(),
	options: z.array(z.object({ value: z.string(), label: z.string() })),
	disabled: z.boolean().default(false),
	required: z.boolean().default(false),
	error: z.string().optional(),
	fullWidth: z.boolean().default(false),
});

export type SelectProps = z.infer<typeof SelectSchema>;
