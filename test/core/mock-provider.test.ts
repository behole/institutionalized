import { describe, test, expect } from "bun:test";
import { MockProvider } from "../../core/providers/mock";

describe("MockProvider", () => {
  describe("scripted mode", () => {
    test("returns responses in order", async () => {
      const provider = new MockProvider([
        { content: "first response", model: "mock", usage: { inputTokens: 10, outputTokens: 20 } },
        { content: "second response", model: "mock", usage: { inputTokens: 15, outputTokens: 25 } },
      ]);

      const r1 = await provider.call({ model: "mock", messages: [{ role: "user", content: "q1" }] });
      const r2 = await provider.call({ model: "mock", messages: [{ role: "user", content: "q2" }] });

      expect(r1.content).toBe("first response");
      expect(r2.content).toBe("second response");
    });

    test("throws when response queue is exhausted", async () => {
      const provider = new MockProvider([
        { content: "only one", model: "mock", usage: { inputTokens: 10, outputTokens: 20 } },
      ]);

      await provider.call({ model: "mock", messages: [{ role: "user", content: "q1" }] });
      await expect(
        provider.call({ model: "mock", messages: [{ role: "user", content: "q2" }] })
      ).rejects.toThrow("MockProvider: no more scripted responses");
    });

    test("tracks all calls made", async () => {
      const provider = new MockProvider([
        { content: "resp", model: "mock", usage: { inputTokens: 10, outputTokens: 20 } },
      ]);

      await provider.call({
        model: "test-model",
        messages: [{ role: "user", content: "hello" }],
        temperature: 0.5,
        maxTokens: 1024,
        systemPrompt: "be helpful",
      });

      expect(provider.calls).toHaveLength(1);
      expect(provider.calls[0].model).toBe("test-model");
      expect(provider.calls[0].messages[0].content).toBe("hello");
      expect(provider.calls[0].temperature).toBe(0.5);
      expect(provider.calls[0].maxTokens).toBe(1024);
      expect(provider.calls[0].systemPrompt).toBe("be helpful");
    });
  });

  describe("echo mode", () => {
    test("returns JSON-wrapped prompt when no responses provided", async () => {
      const provider = new MockProvider();

      const result = await provider.call({
        model: "mock",
        messages: [{ role: "user", content: "test prompt" }],
      });

      const parsed = JSON.parse(result.content);
      expect(parsed.echo).toBe("test prompt");
      expect(parsed.model).toBe("mock");
    });
  });

  describe("calculateCost", () => {
    test("always returns 0", () => {
      const provider = new MockProvider();
      expect(provider.calculateCost({ inputTokens: 1000, outputTokens: 2000 }, "mock")).toBe(0);
    });
  });

  describe("reset", () => {
    test("clears calls and restores original responses", async () => {
      const responses = [
        { content: "resp1", model: "mock", usage: { inputTokens: 10, outputTokens: 20 } },
      ];
      const provider = new MockProvider(responses);

      await provider.call({ model: "mock", messages: [{ role: "user", content: "q" }] });
      expect(provider.calls).toHaveLength(1);

      provider.reset();
      expect(provider.calls).toHaveLength(0);

      const r = await provider.call({ model: "mock", messages: [{ role: "user", content: "q" }] });
      expect(r.content).toBe("resp1");
    });
  });
});
