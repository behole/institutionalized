import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMCallParams, LLMResponse } from "../types";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const messages = params.systemPrompt
      ? [{ role: "system" as const, content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
      messages: messages.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
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
        stopReason: response.stop_reason,
      },
    };
  }

  calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number {
    // Anthropic pricing (as of Jan 2026)
    // https://www.anthropic.com/pricing
    const pricing: Record<string, { input: number; output: number }> = {
      "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 }, // per million tokens
      "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
      "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
      "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
    };

    const rates = pricing[model] || pricing["claude-3-5-sonnet-20241022"];
    const inputCost = (usage.inputTokens / 1_000_000) * rates.input;
    const outputCost = (usage.outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}
