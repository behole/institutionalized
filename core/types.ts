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
