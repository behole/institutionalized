// Agent orchestration primitives for institutional frameworks
import type { LLMProvider, LLMCallParams, LLMResponse } from "./types";
import { AuditTrail } from "./observability";

/**
 * Execute multiple agents in parallel
 * Used for: Jury members, multiple reviewers, multiple pessimists
 */
export async function executeParallel<T>(
  agents: (() => Promise<T>)[]
): Promise<T[]> {
  return Promise.all(agents.map((agent) => agent()));
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
 */
export class FrameworkRunner<TInput, TResult> {
  private auditTrail: AuditTrail;

  constructor(
    private frameworkName: string,
    private input: TInput
  ) {
    this.auditTrail = new AuditTrail(frameworkName, input);
  }

  /**
   * Execute a single agent and track in audit log
   */
  async runAgent<T>(
    agentName: string,
    provider: LLMProvider,
    model: string,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 2048
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    const response = await provider.call({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      maxTokens,
    });

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
   * Execute multiple agents in parallel
   */
  async runParallel<T>(
    agents: Array<{
      name: string;
      provider: LLMProvider;
      model: string;
      prompt: string;
      temperature?: number;
      maxTokens?: number;
    }>
  ): Promise<LLMResponse[]> {
    const promises = agents.map((agent) =>
      this.runAgent(
        agent.name,
        agent.provider,
        agent.model,
        agent.prompt,
        agent.temperature,
        agent.maxTokens
      )
    );

    return Promise.all(promises);
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
 * Parse JSON from LLM response, handling markdown code blocks
 */
export function parseJSON<T>(text: string): T {
  const trimmed = text.trim();

  // Try to extract JSON from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1]);
  }

  // Try to extract raw JSON object
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("No valid JSON found in response");
}
