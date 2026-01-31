// Observability: audit trails, cost tracking, replay capability
import type { LLMResponse } from "./types";

export interface AuditStep {
  agent: string;
  model: string;
  prompt: string;
  response: string;
  duration: number;
  tokens: {
    input: number;
    output: number;
  };
  cost: number;
  timestamp: string;
}

export interface AuditLog {
  framework: string;
  timestamp: string;
  input: unknown;
  steps: AuditStep[];
  result: unknown;
  metadata: {
    totalDuration: number;
    totalCost: number;
    outcome: string;
  };
}

export class AuditTrail {
  private steps: AuditStep[] = [];
  private startTime: number;
  private framework: string;
  private input: unknown;

  constructor(framework: string, input: unknown) {
    this.framework = framework;
    this.input = input;
    this.startTime = Date.now();
  }

  /**
   * Record a step in the execution
   */
  recordStep(
    agent: string,
    model: string,
    prompt: string,
    response: LLMResponse,
    duration: number,
    cost: number
  ): void {
    this.steps.push({
      agent,
      model,
      prompt,
      response: response.content,
      duration,
      tokens: {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
      },
      cost,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Finalize the audit log with result
   */
  finalize(result: unknown, outcome: string): AuditLog {
    const totalDuration = Date.now() - this.startTime;
    const totalCost = this.steps.reduce((sum, step) => sum + step.cost, 0);

    return {
      framework: this.framework,
      timestamp: new Date(this.startTime).toISOString(),
      input: this.input,
      steps: this.steps,
      result,
      metadata: {
        totalDuration,
        totalCost,
        outcome,
      },
    };
  }

  /**
   * Get total cost so far
   */
  getTotalCost(): number {
    return this.steps.reduce((sum, step) => sum + step.cost, 0);
  }

  /**
   * Get total tokens so far
   */
  getTotalTokens(): { input: number; output: number } {
    return this.steps.reduce(
      (acc, step) => ({
        input: acc.input + step.tokens.input,
        output: acc.output + step.tokens.output,
      }),
      { input: 0, output: 0 }
    );
  }

  /**
   * Save audit log to file
   */
  async save(filepath: string): Promise<void> {
    const log = this.finalize(null, "incomplete");
    await Bun.write(filepath, JSON.stringify(log, null, 2));
  }
}

/**
 * Pretty print cost and token usage
 */
export function formatCostReport(auditLog: AuditLog): string {
  const { totalCost, totalDuration } = auditLog.metadata;
  const tokens = auditLog.steps.reduce(
    (acc, step) => ({
      input: acc.input + step.tokens.input,
      output: acc.output + step.tokens.output,
    }),
    { input: 0, output: 0 }
  );

  return `
Cost Report:
  Total Cost: $${totalCost.toFixed(4)}
  Total Tokens: ${tokens.input + tokens.output} (${tokens.input} in, ${tokens.output} out)
  Duration: ${(totalDuration / 1000).toFixed(2)}s
  Steps: ${auditLog.steps.length}
  Framework: ${auditLog.framework}
  Outcome: ${auditLog.metadata.outcome}
`.trim();
}
