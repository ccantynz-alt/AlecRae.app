/**
 * Runtime environment variable validation.
 *
 * These helpers are used in API routes to detect missing configuration
 * before attempting external API calls. Returns a structured error
 * object so routes can send a clean 503 with an attorney-grade message
 * rather than crashing with an opaque stack trace.
 *
 * All checks are at the top of the route handler — never at module scope —
 * so that builds and cold-starts succeed even when optional env vars
 * haven't been provisioned yet.
 */

export interface EnvCheckFailure {
  ok: false;
  missing: string[];
  message: string;
  code: string;
  status: 503;
}

export interface EnvCheckSuccess {
  ok: true;
}

export type EnvCheckResult = EnvCheckSuccess | EnvCheckFailure;

/** Required core secrets for the application to boot. */
export const REQUIRED_ENV_VARS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
] as const;

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

const HUMAN_LABEL: Record<RequiredEnvVar, string> = {
  OPENAI_API_KEY: 'OpenAI API key (for Whisper transcription)',
  ANTHROPIC_API_KEY: 'Anthropic API key (for Claude enhancement)',
  ADMIN_PASSWORD: 'Administrator password',
  JWT_SECRET: 'Session signing secret',
};

function isPresent(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate a specific subset of required env vars.
 * Returns { ok: true } if all are present, otherwise a failure object
 * listing what is missing along with a user-safe message.
 */
export function requireEnv(vars: readonly RequiredEnvVar[]): EnvCheckResult {
  const missing = vars.filter((key) => !isPresent(process.env[key]));

  if (missing.length === 0) {
    return { ok: true };
  }

  const labels = missing.map((k) => HUMAN_LABEL[k]).join(', ');
  return {
    ok: false,
    missing: [...missing],
    code: 'SERVICE_NOT_CONFIGURED',
    status: 503,
    message: `This service is temporarily unavailable because it has not been fully configured. Missing: ${labels}. Please contact your administrator.`,
  };
}

/** Convenience for the transcription pipeline (needs OpenAI + JWT). */
export function requireTranscribeEnv(): EnvCheckResult {
  return requireEnv(['OPENAI_API_KEY', 'JWT_SECRET']);
}

/** Convenience for the enhancement pipeline (needs Anthropic + JWT). */
export function requireEnhanceEnv(): EnvCheckResult {
  return requireEnv(['ANTHROPIC_API_KEY', 'JWT_SECRET']);
}

/** Check every required var at once — used for health checks / boot diagnostics. */
export function requireAllEnv(): EnvCheckResult {
  return requireEnv(REQUIRED_ENV_VARS);
}
