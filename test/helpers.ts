/**
 * Shared test utilities for institutional-reasoning.
 *
 * Provides factories for MockProvider and FrameworkRunner,
 * plus assertion helpers for audit trails.
 */

import { MockProvider } from "../core/providers/mock";
import { FrameworkRunner } from "../core/orchestrator";
import type { LLMResponse } from "../core/types";
import type { AuditLog } from "../core/observability";
import { expect } from "bun:test";

/**
 * Create a MockProvider with scripted responses.
 * Shorthand for `new MockProvider(responses)`.
 */
export function createMockProvider(responses?: LLMResponse[]): MockProvider {
  return new MockProvider(responses);
}

/**
 * Create a FrameworkRunner wired to a MockProvider.
 * Returns both the runner and provider (for call assertions).
 */
export function createMockRunner<TInput, TResult>(
  frameworkName: string,
  input: TInput,
  responses?: LLMResponse[],
  concurrency = 5
): { runner: FrameworkRunner<TInput, TResult>; provider: MockProvider } {
  const provider = new MockProvider(responses);
  const runner = new FrameworkRunner<TInput, TResult>(frameworkName, input, concurrency);
  return { runner, provider };
}

/**
 * Create a standard mock LLM response.
 * Reduces boilerplate in tests that need many responses.
 */
export function mockResponse(content: string, model = "mock"): LLMResponse {
  return {
    content,
    model,
    usage: { inputTokens: 10, outputTokens: 20 },
  };
}

/**
 * Assert that an audit log has the expected structure and required fields.
 */
export function expectValidAuditTrail(auditLog: AuditLog): void {
  expect(auditLog.framework).toBeDefined();
  expect(typeof auditLog.framework).toBe("string");
  expect(auditLog.timestamp).toBeDefined();
  expect(auditLog.steps).toBeDefined();
  expect(Array.isArray(auditLog.steps)).toBe(true);
  expect(auditLog.metadata).toBeDefined();
  expect(typeof auditLog.metadata.totalDuration).toBe("number");
  expect(typeof auditLog.metadata.totalCost).toBe("number");
  expect(auditLog.metadata.totalDuration).toBeGreaterThanOrEqual(0);
  expect(auditLog.metadata.totalCost).toBeGreaterThanOrEqual(0);

  for (const step of auditLog.steps) {
    expect(step.agent).toBeDefined();
    expect(step.model).toBeDefined();
    expect(step.prompt).toBeDefined();
    expect(step.response).toBeDefined();
    expect(typeof step.duration).toBe("number");
    expect(typeof step.cost).toBe("number");
    expect(step.timestamp).toBeDefined();
  }
}
