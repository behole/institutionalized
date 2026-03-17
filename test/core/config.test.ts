import { describe, it, expect } from "bun:test";
import { DEFAULT_MODELS } from "@core/config";

describe("DEFAULT_MODELS", () => {
  it("DEFAULT is a non-empty string", () => {
    expect(typeof DEFAULT_MODELS.DEFAULT).toBe("string");
    expect(DEFAULT_MODELS.DEFAULT.length).toBeGreaterThan(0);
  });

  it("all values are non-empty strings", () => {
    for (const [key, value] of Object.entries(DEFAULT_MODELS)) {
      expect(typeof value, `DEFAULT_MODELS.${key} should be a string`).toBe("string");
      expect(value.length, `DEFAULT_MODELS.${key} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it("has all expected model keys", () => {
    expect(DEFAULT_MODELS).toHaveProperty("CLAUDE_SONNET");
    expect(DEFAULT_MODELS).toHaveProperty("CLAUDE_HAIKU");
    expect(DEFAULT_MODELS).toHaveProperty("CLAUDE_OPUS");
    expect(DEFAULT_MODELS).toHaveProperty("GPT4O");
    expect(DEFAULT_MODELS).toHaveProperty("GPT4O_MINI");
    expect(DEFAULT_MODELS).toHaveProperty("DEFAULT");
  });

  it("is readonly (const assertion — TypeScript compile-time guarantee)", () => {
    // The `as const` assertion makes this a readonly type at compile time.
    // At runtime, we verify the object is not accidentally mutated by asserting
    // that values match what we declared.
    expect(DEFAULT_MODELS.CLAUDE_SONNET).toBe("claude-3-7-sonnet-20250219");
    expect(DEFAULT_MODELS.CLAUDE_HAIKU).toBe("claude-3-5-haiku-20241022");
    expect(DEFAULT_MODELS.CLAUDE_OPUS).toBe("claude-3-opus-20240229");
    expect(DEFAULT_MODELS.GPT4O).toBe("gpt-4o");
    expect(DEFAULT_MODELS.GPT4O_MINI).toBe("gpt-4o-mini");
    expect(DEFAULT_MODELS.DEFAULT).toBe("claude-3-7-sonnet-20250219");
  });
});
