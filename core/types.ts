// Shared core types for all frameworks

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: {
    id?: string;
    stopReason?: string;
    [key: string]: unknown;
  };
}

export interface LLMCallParams {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export interface LLMProvider {
  name: string;
  call(params: LLMCallParams): Promise<LLMResponse>;
  calculateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number;
}

export interface ProviderConfig {
  name: "anthropic" | "openai" | "openrouter" | string;
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}

/**
 * Typed flags accepted by all framework run() functions.
 * Replaces the unsafe Record<string, any> parameter.
 */
export interface RunFlags {
  /** Max parallel agent calls (default: 5) — passed to executeParallel */
  concurrency?: number;
  /** Per-agent timeout in milliseconds (default: 120_000) */
  timeoutMs?: number;
  /** Override default model for all agents in this run */
  model?: string;
  /** Override default temperature */
  temperature?: number;
  /** LLM provider to use */
  provider?: "anthropic" | "openai" | "openrouter";
  /** Framework-specific configuration overrides */
  config?: Record<string, unknown>;
  /** Enable verbose debug logging */
  debug?: boolean;
}
