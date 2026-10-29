import type { LLMProvider, LLMCallParams, LLMResponse } from '../types';
import { withRetry } from '../retry';
import { ProviderError, ErrorCode } from '../errors';

interface OpenAIChatResponse {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      reasoning_content?: string | null;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const messages = params.systemPrompt
      ? [{ role: 'system' as const, content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const context = { model: params.model };

    // Proxy gateways may require extra headers (e.g. x-opencode-session).
    let extraHeaders: Record<string, string> = {};
    const rawExtra = process.env.OPENAI_EXTRA_HEADERS;
    if (rawExtra) {
      extraHeaders = JSON.parse(rawExtra) as Record<string, string>;
    }

    return withRetry(
      async (signal) => {
        // Combine caller-supplied signal (if any) with the per-attempt timeout signal
        const combinedSignal = params.signal ? AbortSignal.any([signal, params.signal]) : signal;

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            ...extraHeaders,
          },
          body: JSON.stringify({
            model: params.model,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens || 4096,
            ...(params.json ? { response_format: { type: 'json_object' } } : {}),
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

        const data = (await response.json()) as OpenAIChatResponse;
        const choice = data.choices[0];

        // Reasoning models may return content: null with the answer in
        // reasoning_content (OpenAI-compatible gateways) or empty content.
        const content = choice.message.content ?? choice.message.reasoning_content ?? '';
        if (content.trim().length === 0) {
          // Transient empty response (reasoning consumed budget) — retryable.
          // Log the raw body: gateways return 200 + empty for throttling/limits.
          console.error(
            `[openai-provider] empty content | model=${params.model} | finish=${choice.finish_reason} | body=${JSON.stringify(data).slice(0, 500)}`
          );
          const err = new Error('Empty response content') as Error & { status: number };
          err.status = 502;
          throw err;
        }

        return {
          content,
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

  calculateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number {
    // OpenAI pricing (as of Jan 2026)
    // https://openai.com/api/pricing/
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-5': { input: 3.0, output: 15.0 }, // per million tokens
      'gpt-5-pro': { input: 5.0, output: 25.0 },
      'gpt-4o': { input: 2.5, output: 10.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      o1: { input: 15.0, output: 60.0 },
      'o1-mini': { input: 3.0, output: 12.0 },
    };

    // Unknown model → 0, never a fake estimate from another model's rates.
    const rates = pricing[model];
    if (!rates) {
      return 0;
    }
    const inputCost = (usage.inputTokens / 1_000_000) * rates.input;
    const outputCost = (usage.outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}
