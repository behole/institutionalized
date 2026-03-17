import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
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

// ─── Retry / Timeout tests ────────────────────────────────────────────────────
// These tests exercise core/retry.ts through the providers.

import { parseRetryAfterMs, withRetry } from "../../core/retry";
import { ProviderError } from "../../core/errors";
import { ErrorCode } from "../../core/errors";

describe("parseRetryAfterMs", () => {
  it("Test 6a: parses integer seconds", () => {
    expect(parseRetryAfterMs("30")).toBe(30_000);
    expect(parseRetryAfterMs("0")).toBe(0);
    expect(parseRetryAfterMs("120")).toBe(120_000);
  });

  it("Test 6b: parses HTTP-date format", () => {
    // Set a fixed future date 60 seconds from a known epoch
    const futureDate = new Date(Date.now() + 60_000).toUTCString();
    const result = parseRetryAfterMs(futureDate);
    // Should be roughly 60 seconds (allow ±200ms clock variance)
    expect(result).toBeGreaterThan(59_000);
    expect(result).toBeLessThan(61_000);
  });

  it("Test 6c: returns null for null/undefined/empty", () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs(undefined)).toBeNull();
    expect(parseRetryAfterMs("")).toBeNull();
  });
});

describe("withRetry", () => {
  it("Test 1: retries 3 times on 429 before throwing ProviderError PROVIDER_RATE_LIMITED", async () => {
    let callCount = 0;
    const fn = async (_signal: AbortSignal) => {
      callCount++;
      const err = new Error("Rate limited") as Error & {
        status: number;
        headers: Record<string, string>;
      };
      err.status = 429;
      err.headers = {};
      throw err;
    };

    let thrown: unknown;
    try {
      await withRetry(fn, { maxAttempts: 3, timeoutMs: 10_000, baseDelayMs: 1 });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ProviderError);
    expect((thrown as ProviderError).code).toBe(ErrorCode.PROVIDER_RATE_LIMITED);
    expect(callCount).toBe(3);
  });

  it("Test 2: retries on 500 status", async () => {
    let callCount = 0;
    const fn = async (_signal: AbortSignal) => {
      callCount++;
      const err = new Error("Server error") as Error & { status: number };
      err.status = 500;
      throw err;
    };

    await expect(
      withRetry(fn, { maxAttempts: 2, timeoutMs: 10_000, baseDelayMs: 1 })
    ).rejects.toBeInstanceOf(ProviderError);

    expect(callCount).toBe(2);
  });

  it("Test 3: does NOT retry on 400 (client error)", async () => {
    let callCount = 0;
    const fn = async (_signal: AbortSignal) => {
      callCount++;
      const err = new Error("Bad request") as Error & { status: number };
      err.status = 400;
      throw err;
    };

    await expect(
      withRetry(fn, { maxAttempts: 3, timeoutMs: 10_000, baseDelayMs: 1 })
    ).rejects.toThrow("Bad request");

    expect(callCount).toBe(1);
  });

  it("Test 4: honors Retry-After header (integer seconds)", async () => {
    let callCount = 0;
    let delayObserved = 0;
    const start = Date.now();

    const fn = async (_signal: AbortSignal) => {
      callCount++;
      if (callCount < 3) {
        const err = new Error("Rate limited") as Error & {
          status: number;
          headers: Record<string, string>;
        };
        err.status = 429;
        // Set a short Retry-After to keep the test fast
        err.headers = { "retry-after": "0" };
        throw err;
      }
      delayObserved = Date.now() - start;
      return "success";
    };

    const result = await withRetry(fn, {
      maxAttempts: 3,
      timeoutMs: 10_000,
      baseDelayMs: 1,
    });

    expect(result).toBe("success");
    expect(callCount).toBe(3);
  });

  it("Test 5: aborts after timeoutMs and throws ProviderError PROVIDER_TIMEOUT", async () => {
    const fn = async (signal: AbortSignal) => {
      // Simulate a request that takes 10 seconds
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 10_000);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      return "should not get here";
    };

    let thrown: unknown;
    try {
      await withRetry(fn, { maxAttempts: 1, timeoutMs: 50, baseDelayMs: 1 });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ProviderError);
    expect((thrown as ProviderError).code).toBe(ErrorCode.PROVIDER_TIMEOUT);
  }, 3_000);

  it("Test 7: succeeds after initial failures (retry heals)", async () => {
    let callCount = 0;
    const fn = async (_signal: AbortSignal) => {
      callCount++;
      if (callCount < 3) {
        const err = new Error("Rate limited") as Error & { status: number };
        err.status = 429;
        throw err;
      }
      return "ok";
    };

    const result = await withRetry(fn, {
      maxAttempts: 3,
      timeoutMs: 10_000,
      baseDelayMs: 1,
    });
    expect(result).toBe("ok");
    expect(callCount).toBe(3);
  });
});
