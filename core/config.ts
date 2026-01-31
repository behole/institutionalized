// Configuration management for frameworks

/**
 * Base configuration interface all frameworks should extend
 */
export interface BaseFrameworkConfig {
  models: Record<string, string>;
  parameters: Record<string, number | boolean | string>;
  validation?: Record<string, any>;
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
