/**
 * Session: per-run context binding provider, models, audit trail, budget,
 * and event emission. Framework functions receive a Session and build their
 * flow from its primitives.
 */
import type { EngineEvent, EventSink } from './events';
import type { ModelResolution, ModelRole } from './models';
import type { LLMCallParams, LLMProvider, LLMResponse, RunFlags } from '../types';
import type { AuditLog } from '../observability';
import { FrameworkRunner } from '../orchestrator';
import { sanitizeInput } from '../sanitize';

export interface StepOptions {
  /** Model role for this agent. Default: 'reasoning'. */
  role?: ModelRole;
  /** Explicit model ID — wins over role resolution. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AgentSpec extends StepOptions {
  name: string;
  prompt: string;
}

export interface StepResult {
  /** Raw response content. */
  content: string;
  response: LLMResponse;
  agent: string;
}

export interface Budget {
  maxCostUSD?: number;
  maxTokens?: number;
}

export class BudgetExceededError extends Error {
  constructor(
    public spent: number,
    public limit: number
  ) {
    super(`Budget exceeded: $${spent.toFixed(4)} spent, limit $${limit}`);
    this.name = 'BudgetExceededError';
  }
}

export class Session {
  /** Emitted events accumulate here; sinks are notified synchronously. */
  readonly events: EngineEvent[] = [];

  private runner: FrameworkRunner<unknown, unknown>;
  private sinks: EventSink[] = [];
  private startTime = Date.now();
  private _auditLog: AuditLog | null = null;

  constructor(
    readonly framework: string,
    readonly provider: LLMProvider,
    readonly models: ModelResolution,
    readonly flags: RunFlags,
    private input: unknown,
    private budget?: Budget
  ) {
    this.runner = new FrameworkRunner(framework, input, flags.concurrency ?? 5);
  }

  on(sink: EventSink): void {
    this.sinks.push(sink);
  }

  private emit(event: EngineEvent): void {
    this.events.push(event);
    for (const sink of this.sinks) {
      sink(event);
    }
  }

  /** Emit an externally-constructed event (used by defineFramework lifecycle). */
  emitEvent(event: EngineEvent): void {
    this.emit(event);
  }

  phase(name: string, detail?: string): void {
    this.emit({ type: 'phase', framework: this.framework, name, detail });
  }

  note(message: string): void {
    this.emit({ type: 'note', framework: this.framework, message });
  }

  private checkBudget(): void {
    if (!this.budget?.maxCostUSD) {
      return;
    }
    const spent = this.runner.getAuditTrail().getTotalCost();
    if (spent >= this.budget.maxCostUSD) {
      throw new BudgetExceededError(spent, this.budget.maxCostUSD);
    }
  }

  /**
   * Run one agent: sanitize, call provider, record audit + cost, emit events.
   * This is the primitive every framework interaction builds on.
   */
  async step(spec: AgentSpec): Promise<StepResult> {
    this.checkBudget();
    const model = spec.model ?? this.models.resolve(spec.role ?? 'reasoning');
    const started = Date.now();
    this.emit({ type: 'agent-start', agent: spec.name, model });

    const prompt = sanitizeInput(spec.prompt);
    const response = await this.runner.runAgent(
      spec.name,
      this.provider,
      model,
      prompt,
      spec.temperature ?? 0.7,
      spec.maxTokens ?? 2048,
      spec.systemPrompt !== undefined ? sanitizeInput(spec.systemPrompt) : undefined
    );

    const durationMs = Date.now() - started;
    const cost = this.provider.calculateCost(response.usage, model);
    this.emit({
      type: 'agent-end',
      agent: spec.name,
      model,
      durationMs,
      cost,
      tokens: {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
      },
    });
    return { content: response.content, response, agent: spec.name };
  }

  /**
   * Run agents in parallel under the session's concurrency semaphore.
   * All-complete semantics (Promise.allSettled): partial failures throw
   * AggregateError after every agent finishes.
   */
  async parallel(specs: AgentSpec[]): Promise<StepResult[]> {
    const tasks = specs.map((spec) => () => this.step(spec));
    const settlements = await Promise.allSettled(tasks.map((t) => t()));

    const results: StepResult[] = [];
    const errors: unknown[] = [];
    for (const s of settlements) {
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        errors.push(s.reason);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} agent(s) failed`);
    }
    return results;
  }

  /**
   * Direct provider call with audit/events but no prompt standardization —
   * for legacy agent functions that build their own params (system+user
   * messages, per-agent temperatures). Prefer step() in new code.
   */
  async call(
    name: string,
    params: Omit<LLMCallParams, 'model'> & { model?: string; role?: ModelRole }
  ): Promise<LLMResponse> {
    this.checkBudget();
    const model =
      params.model ??
      (params.role ? this.models.resolve(params.role) : this.models.resolve('reasoning'));
    const started = Date.now();
    this.emit({ type: 'agent-start', agent: name, model });

    const response = await this.provider.call({
      ...params,
      model,
      messages: params.messages,
    });

    const durationMs = Date.now() - started;
    const cost = this.provider.calculateCost(response.usage, model);
    this.emit({
      type: 'agent-end',
      agent: name,
      model,
      durationMs,
      cost,
      tokens: {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
      },
    });
    this.runner
      .getAuditTrail()
      .recordStep(
        name,
        model,
        params.messages.map((m) => m.content).join('\n'),
        response,
        durationMs,
        cost
      );
    return response;
  }

  /** Access the underlying FrameworkRunner (escape hatch for audit access). */
  get runnerInternal(): FrameworkRunner<unknown, unknown> {
    return this.runner;
  }

  /** Finalize the audit log with the framework result. */
  async finalize(result: unknown, outcome: string): Promise<AuditLog> {
    const { auditLog } = await this.runner.finalize(result, outcome);
    this._auditLog = auditLog;
    const tokens = auditLog.steps.reduce(
      (acc, s) => ({ input: acc.input + s.tokens.input, output: acc.output + s.tokens.output }),
      { input: 0, output: 0 }
    );
    this.emit({
      type: 'run-end',
      framework: this.framework,
      durationMs: Date.now() - this.startTime,
      cost: auditLog.metadata.totalCost,
      tokens,
    });
    return auditLog;
  }

  get auditLog(): AuditLog | null {
    return this._auditLog;
  }
}
