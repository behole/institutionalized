import { describe, test, expect } from "bun:test";
import {
  MessageSchema,
  LLMResponseSchema,
  RunFlagsSchema,
  ProviderConfigSchema,
  sanitizedString,
} from "../../core/schemas";

describe("MessageSchema", () => {
  test("accepts valid message", () => {
    const result = MessageSchema.parse({ role: "user", content: "hello" });
    expect(result.role).toBe("user");
    expect(result.content).toBe("hello");
  });

  test("rejects invalid role", () => {
    expect(() => MessageSchema.parse({ role: "hacker", content: "hi" })).toThrow();
  });

  test("rejects missing content", () => {
    expect(() => MessageSchema.parse({ role: "user" })).toThrow();
  });
});

describe("LLMResponseSchema", () => {
  test("accepts valid response", () => {
    const result = LLMResponseSchema.parse({
      content: "response text",
      model: "claude-3-7-sonnet-20250219",
      usage: { inputTokens: 100, outputTokens: 200 },
    });
    expect(result.content).toBe("response text");
    expect(result.usage.inputTokens).toBe(100);
  });

  test("accepts response with metadata", () => {
    const result = LLMResponseSchema.parse({
      content: "text",
      model: "model",
      usage: { inputTokens: 1, outputTokens: 1 },
      metadata: { id: "msg_123", stopReason: "end_turn" },
    });
    expect(result.metadata?.id).toBe("msg_123");
  });

  test("rejects negative token counts", () => {
    expect(() =>
      LLMResponseSchema.parse({
        content: "text",
        model: "model",
        usage: { inputTokens: -1, outputTokens: 1 },
      })
    ).toThrow();
  });
});

describe("RunFlagsSchema", () => {
  test("accepts empty flags", () => {
    const result = RunFlagsSchema.parse({});
    expect(result).toEqual({});
  });

  test("accepts valid flags", () => {
    const result = RunFlagsSchema.parse({
      concurrency: 3,
      timeoutMs: 60000,
      model: "claude-3-7-sonnet-20250219",
      provider: "anthropic",
      debug: true,
    });
    expect(result.concurrency).toBe(3);
    expect(result.provider).toBe("anthropic");
  });

  test("rejects concurrency of 0", () => {
    expect(() => RunFlagsSchema.parse({ concurrency: 0 })).toThrow();
  });

  test("rejects negative timeout", () => {
    expect(() => RunFlagsSchema.parse({ timeoutMs: -1 })).toThrow();
  });
});

describe("ProviderConfigSchema", () => {
  test("accepts valid provider config", () => {
    const result = ProviderConfigSchema.parse({
      name: "anthropic",
      apiKey: "sk-ant-test123",
    });
    expect(result.name).toBe("anthropic");
  });

  test("rejects empty apiKey", () => {
    expect(() =>
      ProviderConfigSchema.parse({ name: "anthropic", apiKey: "" })
    ).toThrow();
  });

  test("accepts optional baseURL", () => {
    const result = ProviderConfigSchema.parse({
      name: "openai",
      apiKey: "sk-test",
      baseURL: "https://custom.api.com",
    });
    expect(result.baseURL).toBe("https://custom.api.com");
  });
});

describe("sanitizedString", () => {
  test("passes clean string", () => {
    const schema = sanitizedString(100);
    expect(schema.parse("hello world")).toBe("hello world");
  });

  test("strips null bytes via sanitization", () => {
    const schema = sanitizedString(100);
    expect(schema.parse("hello\x00world")).toBe("helloworld");
  });

  test("rejects string exceeding maxLength", () => {
    const schema = sanitizedString(10);
    expect(() => schema.parse("this is way too long")).toThrow();
  });

  test("rejects empty string", () => {
    const schema = sanitizedString(100);
    expect(() => schema.parse("")).toThrow();
  });
});
