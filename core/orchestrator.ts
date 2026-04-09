// Agent orchestration primitives for institutional frameworks
import type { LLMProvider, LLMCallParams, LLMResponse } from "./types";
import { AuditTrail } from "./observability";
import { sanitizeInput } from "./sanitize";
import type { ZodType } from "zod";

/**
 * A lightweight counting semaphore that limits concurrent async operations.
 *
 * ~20-line hand-rolled implementation — no external dependency.
 * Pattern: acquire() before work, release() in finally block.
 */
export class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /** Acquire a permit — waits if none available */
  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /** Release a permit — hands it directly to the next waiter if any */
  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next(); // transfer permit to next waiter (count stays at 0)
    } else {
      this.permits++;
    }
  }
}

/**
 * Execute multiple agents in parallel with a concurrency cap.
 *
 * Uses Promise.allSettled semantics: all agents run to completion.
 * If any fail, an AggregateError is thrown wrapping all failures.
 * Semaphore ensures at most `concurrency` agents run simultaneously.
 *
 * Used for: Jury members, multiple reviewers, multiple pessimists
 */
export async function executeParallel<T>(
  agents: (() => Promise<T>)[],
  concurrency = 5
): Promise<T[]> {
  if (agents.length === 0) return [];

  const sem = new Semaphore(concurrency);

  const wrapped = agents.map((agent) => async () => {
    await sem.acquire();
    try {
      return await agent();
    } finally {
      sem.release();
    }
  });

  const settlements = await Promise.allSettled(wrapped.map((fn) => fn()));

  const errors: unknown[] = [];
  const results: T[] = [];

  for (const settlement of settlements) {
    if (settlement.status === "fulfilled") {
      results.push(settlement.value);
    } else {
      errors.push(settlement.reason);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} agent(s) failed`);
  }

  return results;
}

/**
 * Execute agents sequentially in a pipeline
 * Used for: Prosecutor → Defense → Judge; Paper → Reviews → Rebuttal → Editor
 */
export async function executeSequential<T>(
  agents: ((prev?: T) => Promise<T>)[]
): Promise<T> {
  let result: T | undefined;
  for (const agent of agents) {
    result = await agent(result);
  }
  if (!result) {
    throw new Error("Sequential execution produced no result");
  }
  return result;
}

/**
 * Execute agent with iterative refinement
 * Used for: Delphi method, multi-round debate
 */
export async function executeIterative<T>(
  agent: (prev: T | undefined) => Promise<T>,
  evaluator: (result: T) => Promise<boolean>,
  maxRounds: number = 5
): Promise<T> {
  let result: T | undefined;

  for (let round = 0; round < maxRounds; round++) {
    result = await agent(result);
    const converged = await evaluator(result);
    if (converged) break;
  }

  if (!result) {
    throw new Error("Iterative execution produced no result");
  }
  return result;
}

/**
 * Helper to create an agent function that calls an LLM
 */
export function createAgent(
  provider: LLMProvider,
  params: LLMCallParams
): () => Promise<LLMResponse> {
  return () => provider.call(params);
}

/**
 * Framework runner - standardized execution pattern for all frameworks
 *
 * Holds a shared semaphore for runParallel concurrency control.
 * Default concurrency: 5 agents at a time (prevents rate limit bursts).
 */
export class FrameworkRunner<TInput, TResult> {
  private auditTrail: AuditTrail;
  private semaphore: Semaphore;

  constructor(
    private frameworkName: string,
    private input: TInput,
    concurrency = 5
  ) {
    this.auditTrail = new AuditTrail(frameworkName, input);
    this.semaphore = new Semaphore(concurrency);
  }

  /**
   * Execute a single agent and track in audit log
   */
  async runAgent(
    agentName: string,
    provider: LLMProvider,
    model: string,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 2048,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    // Sanitize prompt and system prompt before sending to provider
    prompt = sanitizeInput(prompt);
    if (systemPrompt !== undefined) {
      systemPrompt = sanitizeInput(systemPrompt);
    }

    const params: LLMCallParams = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      maxTokens,
    };

    if (systemPrompt !== undefined) {
      params.systemPrompt = systemPrompt;
    }

    const response = await provider.call(params);

    const duration = Date.now() - startTime;
    const cost = provider.calculateCost(response.usage, model);

    this.auditTrail.recordStep(
      agentName,
      model,
      prompt,
      response,
      duration,
      cost
    );

    return response;
  }

  /**
   * Execute multiple agents in parallel, gated by the shared semaphore
   */
  async runParallel(
    agents: Array<{
      name: string;
      provider: LLMProvider;
      model: string;
      prompt: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }>
  ): Promise<LLMResponse[]> {
    const tasks = agents.map((agent) => async () => {
      await this.semaphore.acquire();
      try {
        return await this.runAgent(
          agent.name,
          agent.provider,
          agent.model,
          agent.prompt,
          agent.temperature,
          agent.maxTokens,
          agent.systemPrompt
        );
      } finally {
        this.semaphore.release();
      }
    });

    const settlements = await Promise.allSettled(tasks.map((fn) => fn()));

    const errors: unknown[] = [];
    const results: LLMResponse[] = [];

    for (const settlement of settlements) {
      if (settlement.status === "fulfilled") {
        results.push(settlement.value);
      } else {
        errors.push(settlement.reason);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} agent(s) failed in runParallel`);
    }

    return results;
  }

  /**
   * Get audit trail
   */
  getAuditTrail(): AuditTrail {
    return this.auditTrail;
  }

  /**
   * Finalize and return result with audit log
   */
  async finalize(result: TResult, outcome: string) {
    const auditLog = this.auditTrail.finalize(result, outcome);
    return {
      result,
      auditLog,
    };
  }
}

/**
 * Parse JSON from LLM response, handling markdown code blocks.
 * When a Zod schema is provided, the parsed data is validated against it.
 */
export function parseJSON<T>(text: string, schema?: ZodType<T>): T {
  const trimmed = text.trim();

  // Try to extract JSON from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  let raw: unknown;
  if (codeBlockMatch) {
    raw = JSON.parse(codeBlockMatch[1]);
  } else {
    // Try to extract raw JSON object
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      raw = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No valid JSON found in response");
    }
  }

  if (schema) {
    return schema.parse(raw);
  }

  return raw as T;
}

/**
 * Generate a typed object from LLM.
 * When a Zod schema is provided, the parsed response is validated against it.
 */
export async function generateObject<T>({
  model,
  system,
  prompt,
  temperature = 0.7,
  maxTokens = 4096,
  provider,
  schema,
}: {
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  provider?: LLMProvider;
  schema?: ZodType<T>;
}): Promise<T> {
  // Get provider if not passed
  const llmProvider = provider || (await import("./providers/index")).getProvider();

  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "user", content: prompt },
  ];

  const response = await llmProvider.call({
    model,
    messages,
    temperature,
    maxTokens,
    systemPrompt: system,
  });

  return parseJSON<T>(response.content, schema);
}
