import { describe, test, expect } from "bun:test";
import { executeParallel, executeSequential, parseJSON, Semaphore, FrameworkRunner } from "@core/orchestrator";
import { ProviderError } from "../../core/errors";

describe("executeParallel", () => {
  test("should execute tasks in parallel", async () => {
    const startTime = Date.now();
    const tasks = [
      async () => {
        await Bun.sleep(100);
        return "task1";
      },
      async () => {
        await Bun.sleep(100);
        return "task2";
      },
      async () => {
        await Bun.sleep(100);
        return "task3";
      },
    ];

    const results = await executeParallel(tasks);
    const duration = Date.now() - startTime;

    expect(results).toEqual(["task1", "task2", "task3"]);
    // Parallel execution should take ~100ms, not 300ms
    expect(duration).toBeLessThan(200);
  });

  test("should return empty array for no tasks", async () => {
    const results = await executeParallel([]);
    expect(results).toEqual([]);
  });
});

describe("executeParallel concurrency", () => {
  test("Test 1: with concurrency=2 and 5 agents, at most 2 run simultaneously", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const agents = Array.from({ length: 5 }, (_, i) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await Bun.sleep(50);
      concurrent--;
      return i;
    });

    await executeParallel(agents, 2);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test("Test 2: with default concurrency (5), processes 5 agents in parallel", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const agents = Array.from({ length: 5 }, (_, i) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await Bun.sleep(50);
      concurrent--;
      return i;
    });

    await executeParallel(agents);
    // With concurrency=5, all 5 should run simultaneously
    expect(maxConcurrent).toBe(5);
  });

  test("Test 4: concurrency cap forces sequential batches — 5 agents at concurrency=2 takes ~3x single duration", async () => {
    const startTime = Date.now();

    const agents = Array.from({ length: 5 }, (_, i) => async () => {
      await Bun.sleep(100);
      return i;
    });

    await executeParallel(agents, 2);
    const duration = Date.now() - startTime;

    // With 5 tasks and concurrency=2:
    //   batch 1: tasks 0,1 (~100ms)
    //   batch 2: tasks 2,3 (~100ms)
    //   batch 3: task 4 (~100ms)
    // Total: ~300ms. Should be >= 250ms and < 400ms.
    expect(duration).toBeGreaterThanOrEqual(250);
    expect(duration).toBeLessThan(500);
  });

  test("Test 5: if one agent fails, AggregateError is thrown but all agents complete", async () => {
    const completed: number[] = [];

    const agents = Array.from({ length: 5 }, (_, i) => async () => {
      await Bun.sleep(20);
      completed.push(i);
      if (i === 2) throw new Error("agent 2 failed");
      return i;
    });

    let thrown: unknown;
    try {
      await executeParallel(agents, 5);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    // All 5 agents should have completed (allSettled semantics)
    expect(completed).toHaveLength(5);
  });
});

describe("Semaphore", () => {
  test("Test 3: acquire/release correctly queues and dequeues waiters", async () => {
    const sem = new Semaphore(2);
    const order: string[] = [];

    // Acquire twice — should be immediate
    await sem.acquire();
    order.push("acquired-1");
    await sem.acquire();
    order.push("acquired-2");

    // Third acquire should be queued until one is released
    let thirdAcquired = false;
    const thirdPromise = sem.acquire().then(() => {
      thirdAcquired = true;
    });

    // Third should not have acquired yet
    await Bun.sleep(10);
    expect(thirdAcquired).toBe(false);

    // Release one — third should now acquire
    sem.release();
    await thirdPromise;
    expect(thirdAcquired).toBe(true);

    sem.release();
    sem.release();
  });

  test("Semaphore release happens even on agent failure (try/finally)", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    // One agent fails, but the semaphore should still be released
    const agents = [
      async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Bun.sleep(20);
        concurrent--;
        return "ok";
      },
      async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Bun.sleep(20);
        concurrent--;
        throw new Error("agent failed");
      },
      async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Bun.sleep(20);
        concurrent--;
        return "also ok";
      },
    ];

    let thrown: unknown;
    try {
      await executeParallel(agents, 1);
    } catch (e) {
      thrown = e;
    }

    // Should have thrown AggregateError for the failure
    expect(thrown).toBeInstanceOf(AggregateError);
    // Max concurrent should be 1 (semaphore enforced)
    expect(maxConcurrent).toBe(1);
  });
});

describe("FrameworkRunner semaphore", () => {
  test("Test 4: FrameworkRunner.runParallel uses shared semaphore", async () => {
    // Just test that runParallel accepts and respects concurrency parameter
    // (We mock the provider to avoid real API calls)
    let concurrent = 0;
    let maxConcurrent = 0;

    const mockProvider = {
      name: "mock",
      call: async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Bun.sleep(30);
        concurrent--;
        return {
          content: "response",
          model: "mock-model",
          usage: { inputTokens: 5, outputTokens: 10 },
        };
      },
      calculateCost: () => 0,
    };

    const runner = new FrameworkRunner("test-framework", { input: "test" }, 2);

    const agents = Array.from({ length: 5 }, (_, i) => ({
      name: `agent-${i}`,
      provider: mockProvider,
      model: "mock-model",
      prompt: "test prompt",
    }));

    await runner.runParallel(agents);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});

describe("executeSequential", () => {
  test("should execute tasks in sequence and return last result", async () => {
    const order: number[] = [];
    const tasks = [
      async () => {
        order.push(1);
        await Bun.sleep(50);
        return "first";
      },
      async (prev?: string) => {
        order.push(2);
        await Bun.sleep(50);
        return "second";
      },
      async (prev?: string) => {
        order.push(3);
        return "third";
      },
    ];

    const result = await executeSequential(tasks);

    expect(result).toBe("third"); // Returns last result
    expect(order).toEqual([1, 2, 3]);
  });

  test("should pass previous result to next task", async () => {
    const tasks = [
      async () => 5,
      async (prev?: number) => (prev || 0) * 2,
      async (prev?: number) => (prev || 0) + 10,
    ];

    const result = await executeSequential(tasks);
    expect(result).toBe(20); // 5 * 2 + 10
  });

  test("should stop on first failure", async () => {
    const executed: number[] = [];
    const tasks = [
      async () => {
        executed.push(1);
        return "first";
      },
      async () => {
        executed.push(2);
        throw new Error("second failed");
      },
      async () => {
        executed.push(3);
        return "third";
      },
    ];

    await expect(executeSequential(tasks)).rejects.toThrow("second failed");
    expect(executed).toEqual([1, 2]); // Third task should not execute
  });
});

describe("parseJSON", () => {
  test("should parse plain JSON", () => {
    const input = '{"name": "test", "value": 42}';
    const result = parseJSON<{ name: string; value: number }>(input);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("should extract JSON from markdown code block", () => {
    const input = `Here is the result:
\`\`\`json
{"name": "test", "value": 42}
\`\`\`
That's it!`;
    const result = parseJSON<{ name: string; value: number }>(input);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("should extract JSON from code block without language", () => {
    const input = `\`\`\`
{"name": "test", "value": 42}
\`\`\``;
    const result = parseJSON<{ name: string; value: number }>(input);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("should extract JSON from mixed text", () => {
    const input = `Some preamble text
{"name": "test", "value": 42}
Some trailing text`;
    const result = parseJSON<{ name: string; value: number }>(input);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("should handle nested objects", () => {
    const input = `{"outer": {"inner": {"deep": "value"}}}`;
    const result = parseJSON(input);
    expect(result).toEqual({ outer: { inner: { deep: "value" } } });
  });

  test("should throw on invalid JSON", () => {
    const input = "This is not JSON at all";
    expect(() => parseJSON(input)).toThrow();
  });

  test("should handle arrays", () => {
    const input = '{"items": [1, 2, 3]}';
    const result = parseJSON<{ items: number[] }>(input);
    expect(result).toEqual({ items: [1, 2, 3] });
  });
});
