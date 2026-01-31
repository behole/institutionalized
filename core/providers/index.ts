import type { LLMProvider, ProviderConfig } from "../types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OpenRouterProvider } from "./openrouter";

export { AnthropicProvider, OpenAIProvider, OpenRouterProvider };

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.name) {
    case "anthropic":
      return new AnthropicProvider(config.apiKey);

    case "openai":
      return new OpenAIProvider(config.apiKey, config.baseURL);

    case "openrouter":
      return new OpenRouterProvider(config.apiKey);

    default:
      throw new Error(`Unknown provider: ${config.name}`);
  }
}

export function getProviderFromEnv(preferredProvider?: string): LLMProvider {
  // Try preferred provider first
  if (preferredProvider) {
    const apiKey = getApiKey(preferredProvider);
    if (apiKey) {
      return createProvider({ name: preferredProvider, apiKey });
    }
  }

  // Fall back to any available provider
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return new AnthropicProvider(anthropicKey);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAIProvider(openaiKey);
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return new OpenRouterProvider(openrouterKey);
  }

  throw new Error(
    "No LLM provider API key found. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY"
  );
}

// Alias for convenience
export const getProvider = getProviderFromEnv;

function getApiKey(provider: string): string | undefined {
  const envVars: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
  };

  const envVar = envVars[provider];
  return envVar ? process.env[envVar] : undefined;
}
