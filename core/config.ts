// Configuration management for frameworks

/**
 * Canonical model identifiers used across all frameworks.
 * Update here to change models project-wide.
 */
export const DEFAULT_MODELS = {
  CLAUDE_SONNET: "claude-3-7-sonnet-20250219",
  CLAUDE_HAIKU: "claude-3-5-haiku-20241022",
  CLAUDE_OPUS: "claude-3-opus-20240229",
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  DEFAULT: "claude-3-7-sonnet-20250219",
} as const;

/**
 * Base configuration interface all frameworks should extend
 */
export interface BaseFrameworkConfig {
  models: Record<string, string>;
  parameters: Record<string, number | boolean | string>;
  validation?: Record<string, unknown>;
  provider?: "anthropic" | "openai" | "openrouter";
}

/**
 * Load configuration from environment or defaults
 */
export function loadConfig<T extends BaseFrameworkConfig>(
  defaults: T,
  overrides?: Partial<T>
): T {
  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Get API key from environment
 */
export function getAPIKey(provider: string): string {
  const envVar = `${provider.toUpperCase()}_API_KEY`;
  const key = process.env[envVar] || Bun.env[envVar];

  if (!key) {
    throw new Error(
      `Missing API key: Set ${envVar} environment variable`
    );
  }

  return key;
}

/**
 * Validate that all required models are specified
 */
export function validateModelConfig(
  models: Record<string, string>,
  requiredRoles: string[]
): void {
  const missing = requiredRoles.filter((role) => !models[role]);

  if (missing.length > 0) {
    throw new Error(`Missing model configuration for roles: ${missing.join(", ")}`);
  }
}
