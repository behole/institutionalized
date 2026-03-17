import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { LLMCallParams } from "../../core/types";

// Mock Anthropic SDK before importing provider
const mockMessagesCreate = mock(async (_params: unknown) => ({
  id: "msg_test123",
  model: "claude-3-5-sonnet-20241022",
  stop_reason: "end_turn",
  content: [{ type: "text", text: "Test response" }],
  usage: { input_tokens: 10, output_tokens: 20 },
}));

mock.module("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockMessagesCreate,
    };
  },
}));

// Import after mock is set up
const { AnthropicProvider } = await import("../../core/providers/anthropic");

describe("AnthropicProvider", () => {
  let provider: InstanceType<typeof AnthropicProvider>;

  beforeEach(() => {
    provider = new AnthropicProvider("test-api-key");
    mockMessagesCreate.mockClear();
  });

  it("Test 1: passes systemPrompt as top-level system param, not in messages array", async () => {
    const params: LLMCallParams = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      systemPrompt: "You are a helpful assistant.",
    };

    await provider.call(params);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockMessagesCreate.mock.calls[0][0] as Record<string, unknown>;

    // system param should be the systemPrompt string
    expect(callArgs.system).toBe("You are a helpful assistant.");

    // messages array must NOT contain any system role entries
    const messages = callArgs.messages as Array<{ role: string; content: string }>;
    expect(messages.every((m) => m.role !== "system")).toBe(true);
  });

  it("Test 2: when systemPrompt is undefined, no system param is passed", async () => {
    const params: LLMCallParams = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
    };

    await provider.call(params);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockMessagesCreate.mock.calls[0][0] as Record<string, unknown>;

    // system param should be undefined when no systemPrompt
    expect(callArgs.system).toBeUndefined();
  });

  it("Test 3: messages array contains only user/assistant roles, never system", async () => {
    const params: LLMCallParams = {
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "user", content: "First message" },
        { role: "assistant", content: "Response" },
        { role: "user", content: "Follow up" },
      ],
      systemPrompt: "System instructions here.",
    };

    await provider.call(params);

    const callArgs = mockMessagesCreate.mock.calls[0][0] as Record<string, unknown>;
    const messages = callArgs.messages as Array<{ role: string; content: string }>;

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[2].role).toBe("user");
    expect(messages.every((m) => m.role !== "system")).toBe(true);
  });

  it("Test 4: response is correctly mapped to LLMResponse shape", async () => {
    const params: LLMCallParams = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
    };

    const result = await provider.call(params);

    expect(result.content).toBe("Test response");
    expect(result.model).toBe("claude-3-5-sonnet-20241022");
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(20);
    expect(result.metadata?.id).toBe("msg_test123");
    expect(result.metadata?.stopReason).toBe("end_turn");
  });
});
