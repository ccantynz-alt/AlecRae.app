/**
 * @btf/schemas — Shared Zod schemas for AI-composable components and API boundaries.
 * Every component, every API input/output, every config — validated by Zod.
 */

export { type ButtonProps, type ButtonVariant, ButtonSchema, buttonVariants } from "./ui/button.js";
export { type InputProps, InputSchema } from "./ui/input.js";
export { type CardProps, CardSchema } from "./ui/card.js";
export { type ModalProps, ModalSchema } from "./ui/modal.js";
export {
	type ComponentRegistryEntry,
	type ComponentRegistry,
	ComponentRegistryEntrySchema,
	createComponentRegistry,
} from "./registry.js";
export { type BadgeProps, BadgeSchema } from "./ui/badge.js";
export { type AlertProps, AlertSchema } from "./ui/alert.js";
export { type SelectProps, SelectSchema } from "./ui/select.js";
export { type TextareaProps, TextareaSchema } from "./ui/textarea.js";
export { type ApiErrorResponse, type ApiSuccessResponse, ApiErrorSchema, ApiSuccessSchema } from "./api/responses.js";
export { type PaginationInput, PaginationSchema } from "./api/pagination.js";
