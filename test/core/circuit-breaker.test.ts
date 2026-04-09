import { describe, test, expect } from "bun:test";
import { CircuitBreakerProvider } from "../../core/circuit-breaker";
import { MockProvider } from "../../core/providers/mock";

function failingProvider(failCount: number) {
  let calls = 0;
  const mock = new MockProvider();
  const original = mock.call.bind(mock);
  mock.call = async (params) => {
    calls++;
    if (calls <= failCount) {
      throw new Error(`Provider failure ${calls}`);
    }
    return original(params);
  };
  return mock;
}

describe("CircuitBreakerProvider", () => {
  test("passes through calls in closed state", async () => {
    const inner = new MockProvider([
      { content: "ok", model: "mock", usage: { inputTokens: 5, outputTokens: 5 } },
    ]);
    const cb = new CircuitBreakerProvider(inner);
    const result = await cb.call({ model: "mock", messages: [{ role: "user", content: "hi" }] });
    expect(result.content).toBe("ok");
    expect(cb.state).toBe("closed");
  });

  test("opens after consecutive failures reach threshold", async () => {
    const inner = failingProvider(100);
    const cb = new CircuitBreakerProvider(inner, { failureThreshold: 3, cooldownMs: 1000 });
    for (let i = 0; i < 3; i++) {
      try { await cb.call({ model: "m", messages: [{ role: "user", content: "x" }] }); } catch {}
    }
    expect(cb.state).toBe("open");
  });

  test("rejects immediately when open", async () => {
    const inner = failingProvider(100);
    const cb = new CircuitBreakerProvider(inner, { failureThreshold: 1, cooldownMs: 10000 });
    try { await cb.call({ model: "m", messages: [{ role: "user", content: "x" }] }); } catch {}
    expect(cb.state).toBe("open");
    await expect(
      cb.call({ model: "m", messages: [{ role: "user", content: "x" }] })
    ).rejects.toThrow("Circuit breaker is open");
  });

  test("transitions to half-open after cooldown", async () => {
    const inner = failingProvider(100);
    const cb = new CircuitBreakerProvider(inner, { failureThreshold: 1, cooldownMs: 50 });
    try { await cb.call({ model: "m", messages: [{ role: "user", content: "x" }] }); } catch {}
    expect(cb.state).toBe("open");
    await Bun.sleep(60);
    expect(cb.state).toBe("half-open");
  });

  test("closes on successful probe in half-open state", async () => {
    let callCount = 0;
    const inner = new MockProvider();
    const original = inner.call.bind(inner);
    inner.call = async (params) => {
      callCount++;
      if (callCount === 1) throw new Error("fail");
      return original(params);
    };
    const cb = new CircuitBreakerProvider(inner, { failureThreshold: 1, cooldownMs: 50 });
    try { await cb.call({ model: "m", messages: [{ role: "user", content: "x" }] }); } catch {}
    expect(cb.state).toBe("open");
    await Bun.sleep(60);
    const result = await cb.call({ model: "m", messages: [{ role: "user", content: "probe" }] });
    expect(cb.state).toBe("closed");
  });

  test("reopens on failed probe in half-open state", async () => {
    const inner = failingProvider(100);
    const cb = new CircuitBreakerProvider(inner, { failureThreshold: 1, cooldownMs: 50 });
    try { await cb.call({ model: "m", messages: [{ role: "user", content: "x" }] }); } catch {}
    await Bun.sleep(60);
    try { await cb.call({ model: "m", messages: [{ role: "user", content: "probe" }] }); } catch {}
    expect(cb.state).toBe("open");
  });

  test("resets failure count on success", async () => {
    let callCount = 0;
    const inner = new MockProvider();
    const original = inner.call.bind(inner);
    inner.call = async (params) => {
      callCount++;
      if (callCount === 2) throw new Error("intermittent");
      return original(params);
    };
    const cb = new CircuitBreakerProvider(inner, { failureThreshold: 3 });
    await cb.call({ model: "m", messages: [{ role: "user", content: "1" }] });
    try { await cb.call({ model: "m", messages: [{ role: "user", content: "2" }] }); } catch {}
    await cb.call({ model: "m", messages: [{ role: "user", content: "3" }] });
    expect(cb.state).toBe("closed");
  });

  test("delegates calculateCost to inner provider", () => {
    const inner = new MockProvider();
    const cb = new CircuitBreakerProvider(inner);
    expect(cb.calculateCost({ inputTokens: 100, outputTokens: 200 }, "mock")).toBe(0);
  });
});
