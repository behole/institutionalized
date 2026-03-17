import type { LLMProvider, LLMCallParams, LLMResponse } from "../types";
import { withRetry } from "../retry";

interface OpenRouterChatResponse {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterProvider implements LLMProvider {
  name = "openrouter";
  private apiKey: string;
  private baseURL = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const messages = params.systemPrompt
      ? [{ role: "system" as const, content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const context = { model: params.model };

    return withRetry(
      async (signal) => {
        const combinedSignal = params.signal
          ? AbortSignal.any([signal, params.signal])
          : signal;

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://github.com/institutional-reasoning",
            "X-Title": "Institutional Reasoning",
          },
          body: JSON.stringify({
            model: params.model,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens || 4096,
          }),
          signal: combinedSignal,
        });

        if (!response.ok) {
          const error = await response.text();
          const err = new Error(`OpenRouter API error: ${response.status} - ${error}`) as Error & {
            status: number;
            response: Response;
          };
          err.status = response.status;
          err.response = response;
          throw err;
        }

        const data = await response.json() as OpenRouterChatResponse;
        const choice = data.choices[0];

        return {
          content: choice.message.content,
          model: data.model,
          usage: {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          },
          metadata: {
            id: data.id,
            stopReason: choice.finish_reason,
          },
        };
      },
      { context }
    );
  }

  calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number {
    // OpenRouter pricing varies by model
    // For now, use generic estimate or could fetch from their API
    // https://openrouter.ai/docs#models

    // Rough estimates (per million tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
      "openai/gpt-4o": { input: 2.5, output: 10.0 },
      "google/gemini-pro-1.5": { input: 1.25, output: 5.0 },
      "meta-llama/llama-3.1-70b": { input: 0.5, output: 0.8 },
    };

    const rates = pricing[model] || { input: 1.0, output: 3.0 }; // Default estimate
    const inputCost = (usage.inputTokens / 1_000_000) * rates.input;
    const outputCost = (usage.outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}
