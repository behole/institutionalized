import type { LLMProvider, LLMCallParams, LLMResponse } from "../types";
import { withRetry } from "../retry";
import { ProviderError, ErrorCode } from "../errors";

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const messages = params.systemPrompt
      ? [{ role: "system" as const, content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const context = { model: params.model };

    return withRetry(
      async (signal) => {
        // Combine caller-supplied signal (if any) with the per-attempt timeout signal
        const combinedSignal = params.signal
          ? AbortSignal.any([signal, params.signal])
          : signal;

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
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
          // Attach status and headers so withRetry can inspect them
          const err = new Error(`OpenAI API error: ${response.status} - ${error}`) as Error & {
            status: number;
            response: Response;
          };
          err.status = response.status;
          err.response = response;
          throw err;
        }

        const data = await response.json();
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
    // OpenAI pricing (as of Jan 2026)
    // https://openai.com/api/pricing/
    const pricing: Record<string, { input: number; output: number }> = {
      "gpt-5": { input: 3.0, output: 15.0 }, // per million tokens
      "gpt-5-pro": { input: 5.0, output: 25.0 },
      "gpt-4o": { input: 2.5, output: 10.0 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "gpt-4-turbo": { input: 10.0, output: 30.0 },
      "o1": { input: 15.0, output: 60.0 },
      "o1-mini": { input: 3.0, output: 12.0 },
    };

    const rates = pricing[model] || pricing["gpt-4o"];
    const inputCost = (usage.inputTokens / 1_000_000) * rates.input;
    const outputCost = (usage.outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}
