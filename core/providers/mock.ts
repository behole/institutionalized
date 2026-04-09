import type { LLMProvider, LLMCallParams, LLMResponse } from "../types";

/**
 * Mock LLM provider for testing. Two modes:
 *
 * - Scripted: pass an array of LLMResponse objects. Each call() pops the next one.
 * - Echo: pass nothing. Each call() returns a JSON object echoing the prompt.
 */
export class MockProvider implements LLMProvider {
  name = "mock";

  /** Every call() invocation is recorded here for test assertions. */
  calls: LLMCallParams[] = [];

  private responses: LLMResponse[];
  private originalResponses: LLMResponse[];

  constructor(responses?: LLMResponse[]) {
    this.responses = responses ? [...responses] : [];
    this.originalResponses = responses ? [...responses] : [];
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    this.calls.push(params);

    // Scripted mode: return next queued response
    if (this.originalResponses.length > 0) {
      const next = this.responses.shift();
      if (!next) {
        throw new Error(
          `MockProvider: no more scripted responses (${this.calls.length} calls made, ${this.originalResponses.length} responses provided)`
        );
      }
      return next;
    }

    // Echo mode: return JSON-wrapped prompt
    const lastMessage = params.messages[params.messages.length - 1];
    return {
      content: JSON.stringify({
        echo: lastMessage?.content ?? "",
        model: params.model,
        systemPrompt: params.systemPrompt,
      }),
      model: params.model || "mock",
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }

  calculateCost(
    _usage: { inputTokens: number; outputTokens: number },
    _model: string
  ): number {
    return 0;
  }

  /** Reset call history and restore original response queue. */
  reset(): void {
    this.calls = [];
    this.responses = [...this.originalResponses];
  }
}
