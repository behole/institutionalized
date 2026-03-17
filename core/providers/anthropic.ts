import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMCallParams, LLMResponse } from "../types";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: params.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Expected text response from Anthropic");
    }

    return {
      content: content.text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      metadata: {
        id: response.id,
        stopReason: response.stop_reason ?? undefined,
      },
    };
  }

  calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number {
    // Anthropic pricing (as of March 2026)
    // https://www.anthropic.com/pricing
    const pricing: Record<string, { input: number; output: number }> = {
      // Claude 4.x models
      "claude-opus-4-5": { input: 15.0, output: 75.0 }, // per million tokens
      "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
      // Claude 3.x models
      "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
      "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
      "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
      "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
      "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
    };

    const rates = pricing[model] || pricing["claude-3-5-sonnet-20241022"];
    const inputCost = (usage.inputTokens / 1_000_000) * rates.input;
    const outputCost = (usage.outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}
