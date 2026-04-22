/**
 * Multi-Document Chain orchestration.
 *
 * Pure helpers for generating the same dictation into multiple document
 * variants concurrently. The route handler at `/api/multi-doc` composes
 * these helpers with the Anthropic SDK to run parallel streams.
 *
 * This module is intentionally dependency-light so it can be unit-tested
 * in isolation from Next.js and the Anthropic SDK. The route wires in
 * the actual streaming calls.
 */

import { DocMode, SYSTEM_PROMPTS } from './templates';

/**
 * Input shape for a chain run. Modes must be a subset of the 12 known
 * document modes defined in `lib/templates.ts`.
 */
export interface ChainRequest {
  rawText: string;
  modes: DocumentMode[];
  customInstructions?: string;
}

/**
 * Per-mode result shape. `content` is the final assembled text for that
 * mode; `thinking` optionally exposes the extended-thinking trace (not
 * surfaced to the client but kept in-type for future diagnostic use).
 * `error` is populated when the stream for that mode failed — callers
 * should treat errors as per-mode isolation, not a global abort.
 */
export interface ChainResult {
  mode: DocumentMode;
  content: string;
  thinking?: string;
  error?: string;
}

/**
 * Alias for DocMode to give the exported public API a friendlier name
 * that matches the task contract. Both are structurally identical.
 */
export type DocumentMode = DocMode;

/** Absolute ceiling on concurrent modes — protects upstream Anthropic spend. */
export const MAX_PARALLEL_MODES = 4;

/**
 * Document modes that benefit from extended-thinking reasoning before
 * producing output. Mirrors the list used by `/api/enhance/route.ts`
 * for consistency across the app.
 */
export const THINKING_MODES: ReadonlySet<DocumentMode> = new Set<DocumentMode>([
  'legal-memo',
  'court-filing',
  'demand-letter',
  'deposition-summary',
  'engagement-letter',
  'tax-advisory',
  'audit-opinion',
]);

/**
 * Higher token ceilings for modes that routinely produce long documents.
 * Modes not listed fall back to {@link DEFAULT_MAX_TOKENS}.
 */
export const TOKEN_LIMITS: Partial<Record<DocumentMode, number>> = {
  'court-filing': 16384,
  'legal-memo': 16384,
  'demand-letter': 12288,
  'deposition-summary': 16384,
  'engagement-letter': 12288,
  'tax-advisory': 12288,
  'audit-opinion': 12288,
  'accounting-report': 12288,
};

export const DEFAULT_MAX_TOKENS = 8192;
export const THINKING_BUDGET_TOKENS = 4096;

/** Anthropic model used across the app — keep in lock-step with `/api/enhance`. */
export const MULTI_DOC_MODEL = 'claude-sonnet-4-6';

/**
 * Resolve the correct token budget for a given document mode.
 */
export function getMaxTokensForMode(mode: DocumentMode): number {
  return TOKEN_LIMITS[mode] ?? DEFAULT_MAX_TOKENS;
}

/**
 * Returns true when the requested mode should use extended thinking.
 */
export function shouldUseThinking(mode: DocumentMode): boolean {
  return THINKING_MODES.has(mode);
}

/**
 * Compose the `system` prompt for a given mode, appending any user-supplied
 * custom instructions in exactly the same format as `/api/enhance`.
 */
export function buildSystemPrompt(mode: DocumentMode, customInstructions?: string): string {
  const base = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.general;
  const trimmed = customInstructions?.trim();
  if (!trimmed) return base;
  return `${base}\n\nADDITIONAL USER INSTRUCTIONS:\n${trimmed}`;
}

/**
 * Build the Anthropic `messages.create` / `messages.stream` parameters
 * for a single mode. The return type is a discriminated union so callers
 * can pick the appropriate SDK method (`.stream` for standard, `.create`
 * with thinking enabled for extended-thinking modes).
 *
 * Keeping this as a pure function lets the route handler remain a thin
 * I/O layer and makes it trivial to test payload shape changes.
 */
export type ChainAnthropicPayload =
  | {
      kind: 'stream';
      mode: DocumentMode;
      params: {
        model: string;
        max_tokens: number;
        system: string;
        messages: Array<{ role: 'user'; content: string }>;
      };
    }
  | {
      kind: 'thinking';
      mode: DocumentMode;
      params: {
        model: string;
        max_tokens: number;
        thinking: { type: 'enabled'; budget_tokens: number };
        system: string;
        messages: Array<{ role: 'user'; content: string }>;
      };
    };

/**
 * Produce the Anthropic API payload for the given mode and raw dictation
 * text. Callers invoke either `anthropic.messages.stream(params)` (for
 * `kind: 'stream'`) or `anthropic.messages.create(params)` with thinking
 * (for `kind: 'thinking'`).
 */
export function buildAnthropicPayload(
  mode: DocumentMode,
  rawText: string,
  customInstructions?: string
): ChainAnthropicPayload {
  const system = buildSystemPrompt(mode, customInstructions);
  const max_tokens = getMaxTokensForMode(mode);
  const content = `Here is the raw dictation to clean up and format:\n\n${rawText}`;
  const messages: Array<{ role: 'user'; content: string }> = [
    { role: 'user', content },
  ];

  if (shouldUseThinking(mode)) {
    return {
      kind: 'thinking',
      mode,
      params: {
        model: MULTI_DOC_MODEL,
        max_tokens,
        thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET_TOKENS },
        system,
        messages,
      },
    };
  }

  return {
    kind: 'stream',
    mode,
    params: {
      model: MULTI_DOC_MODEL,
      max_tokens,
      system,
      messages,
    },
  };
}

/**
 * Build payloads for an entire chain request. Throws when validation fails
 * so the route handler can return a clean 400. Validation errors are
 * deliberately human-readable — they will surface directly to the client.
 */
export function buildChainPayloads(req: ChainRequest): ChainAnthropicPayload[] {
  const trimmed = req.rawText?.trim() ?? '';
  if (trimmed.length === 0) {
    throw new Error('No text provided');
  }

  if (!Array.isArray(req.modes) || req.modes.length === 0) {
    throw new Error('At least one document mode is required');
  }

  if (req.modes.length > MAX_PARALLEL_MODES) {
    throw new Error(`A maximum of ${MAX_PARALLEL_MODES} modes may be generated at once`);
  }

  // De-duplicate while preserving order; silently drop unknown modes is
  // a footgun, so reject loudly instead.
  const seen = new Set<DocumentMode>();
  const unique: DocumentMode[] = [];
  for (const m of req.modes) {
    if (!(m in SYSTEM_PROMPTS)) {
      throw new Error(`Unknown document mode: ${m}`);
    }
    if (seen.has(m)) continue;
    seen.add(m);
    unique.push(m);
  }

  return unique.map((mode) => buildAnthropicPayload(mode, trimmed, req.customInstructions));
}

/**
 * SSE event shape sent from `/api/multi-doc` → client. Exported so the
 * React component can type its EventSource message handler.
 */
export type ChainSSEEvent =
  | { type: 'start'; mode: DocumentMode }
  | { type: 'delta'; mode: DocumentMode; text: string }
  | { type: 'complete'; mode: DocumentMode }
  | { type: 'error'; mode: DocumentMode; message: string }
  | { type: 'done' };

/**
 * Encode a chain SSE event as a properly formatted `data: {json}\n\n` frame.
 * Centralised so the route and any future consumers cannot drift on wire
 * format.
 */
export function encodeChainEvent(event: ChainSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
