import type { LLMProvider, LLMCallParams, LLMResponse } from "./types";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening (default: 5) */
  failureThreshold?: number;
  /** Time in ms before transitioning from open to half-open (default: 30000) */
  cooldownMs?: number;
}

type CircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker wrapper for any LLMProvider.
 *
 * States:
 *   closed    → normal operation, calls pass through
 *   open      → fast-reject all calls (no wasted API calls)
 *   half-open → allow one probe call; success closes, failure reopens
 */
export class CircuitBreakerProvider implements LLMProvider {
  name: string;

  private inner: LLMProvider;
  private failureThreshold: number;
  private cooldownMs: number;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private _state: CircuitState = "closed";

  constructor(inner: LLMProvider, options: CircuitBreakerOptions = {}) {
    this.inner = inner;
    this.name = `circuit-breaker(${inner.name})`;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
  }

  get state(): CircuitState {
    if (
      this._state === "open" &&
      Date.now() - this.lastFailureTime >= this.cooldownMs
    ) {
      this._state = "half-open";
    }
    return this._state;
  }

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const currentState = this.state;

    if (currentState === "open") {
      throw new Error(
        `Circuit breaker is open for provider "${this.inner.name}" — ` +
        `${this.consecutiveFailures} consecutive failures, ` +
        `cooldown ${this.cooldownMs}ms`
      );
    }

    try {
      const result = await this.inner.call(params);
      this.consecutiveFailures = 0;
      this._state = "closed";
      return result;
    } catch (err) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();

      if (
        currentState === "half-open" ||
        this.consecutiveFailures >= this.failureThreshold
      ) {
        this._state = "open";
      }

      throw err;
    }
  }

  calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number {
    return this.inner.calculateCost(usage, model);
  }

  reset(): void {
    this._state = "closed";
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }
}
